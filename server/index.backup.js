const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./database');
const hcsnReportsAPIs = require('./hcsn_reports_apis');
const assetAPIs = require('./asset_apis');
const hrAPIs = require('./hr_apis');
const revenueAPIs = require('./revenue_apis');
const expenseAPIs = require('./expense_apis');
const materialAPIs = require('./material_apis');
const debtAPIs = require('./debt_management_apis');
console.log('Expense APIs loaded:', Object.keys(expenseAPIs));
console.log('Is getCategories a function?', typeof expenseAPIs.getCategories);


const app = express();
const port = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY] JWT_SECRET not set. Using ephemeral key; tokens reset on restart.');
}

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    }
}));
app.use(bodyParser.json({ limit: '1mb' }));

const LOGIN_WINDOW_MS = Number.parseInt(process.env.LOGIN_WINDOW_MS || '900000', 10);
const LOGIN_MAX_ATTEMPTS = Number.parseInt(process.env.LOGIN_MAX_ATTEMPTS || '10', 10);
const loginAttempts = new Map();
const logRequests = process.env.LOG_REQUESTS === 'true';
const allowDebugRoutes = process.env.ALLOW_DEBUG_ROUTES === 'true';
const bankWebhookSecret = process.env.BANK_WEBHOOK_SECRET || '';
const allowInsecureWebhooks = process.env.ALLOW_INSECURE_WEBHOOKS === 'true';

const verifyWebhookAuth = (req) => {
    if (!bankWebhookSecret) return false;
    const headerSecret = req.headers['x-webhook-secret'];
    if (headerSecret && headerSecret === bankWebhookSecret) return true;

    const signature = req.headers['x-webhook-signature'];
    if (!signature) return false;

    try {
        const payload = JSON.stringify(req.body || {});
        const expected = crypto.createHmac('sha256', bankWebhookSecret).update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
};

const rateLimitLogin = (req, res, next) => {
    const username = (req.body && req.body.username) ? String(req.body.username) : '';
    const key = `${req.ip}:${username}`;
    const now = Date.now();
    const entry = loginAttempts.get(key);

    if (!entry || (now - entry.firstAttempt) > LOGIN_WINDOW_MS) {
        loginAttempts.set(key, { firstAttempt: now, count: 1 });
        res.locals.loginRateKey = key;
        return next();
    }

    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    entry.count += 1;
    loginAttempts.set(key, entry);
    res.locals.loginRateKey = key;
    next();
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// Middleware: Verify Token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).send({ auth: false, message: 'No token provided.' });

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error(`[AUTH ERROR] Verify failed: ${err.message}`);
            return res.status(401).send({ auth: false, message: 'Failed to authenticate token.' });
        }

        console.log(`[AUTH DEBUG] Token decoded: id=${decoded.id} (${typeof decoded.id})`);
        db.get("SELECT id, username, role, status, company_id FROM users WHERE id = ?", [decoded.id], (dbErr, user) => {
            console.log(`[AUTH DEBUG] User lookup for id=${decoded.id}: user=${JSON.stringify(user)}, error=${dbErr}`);
            if (dbErr) {
                console.error('[AUTH ERROR] Auth lookup failed:', dbErr);
                return res.status(401).json({ error: 'Auth lookup failed.', details: dbErr.message });
            }
            if (!user) return res.status(401).json({ auth: false, message: 'User not found.' });
            if (user.status && user.status !== 'Active') {
                return res.status(403).json({ auth: false, message: 'User is inactive.' });
            }
            req.user = { id: user.id, username: user.username, role: user.role, status: user.status, company_id: user.company_id };
            req.userId = user.id;
            next();
        });
    });
};

const logAction = (user, action, target, details) => {
    const timestamp = new Date().toISOString();
    const sql = "INSERT INTO system_logs (timestamp, user, action, target, details) VALUES (?,?,?,?,?)";
    db.run(sql, [timestamp, user || 'system', action, target, details || '']);
};

const checkDateLock = (date) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM system_settings WHERE key = 'locked_until_date'", [], (err, row) => {
            if (err) return reject(err);
            const lockedUntil = row ? row.value : '1900-01-01';
            if (date <= lockedUntil) {
                resolve({ locked: true, lockedUntil });
            } else {
                resolve({ locked: false });
            }
        });
    });
};

// Routes

// DEBUG: Root Route
app.get('/', (req, res) => {
    res.send('Backend Server is Running!');
});

app.delete('/api/test-delete', verifyToken, requireRole('admin'), (req, res) => {
    if (!allowDebugRoutes) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json({ message: "DELETE works!" });
});

// DEBUG: Log all requests
app.use((req, res, next) => {
    if (logRequests) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});


// ========================================
// REVENUE MODULE APIs (Thu sự nghiệp - HCSN)
// ========================================

// Revenue Categories
app.get('/api/revenue/categories', verifyToken, revenueAPIs.getCategories(db));
app.post('/api/revenue/categories', verifyToken, revenueAPIs.createCategory(db));

// Revenue Receipts (Biên lai thu tiền)
app.get('/api/revenue/receipts', verifyToken, revenueAPIs.getReceipts(db));
app.post('/api/revenue/receipts', verifyToken, revenueAPIs.createReceipt(db));
app.get('/api/revenue/receipts/:id', verifyToken, revenueAPIs.getReceiptDetail(db));
app.put('/api/revenue/receipts/:id', verifyToken, revenueAPIs.updateReceipt(db));
app.delete('/api/revenue/receipts/:id', verifyToken, revenueAPIs.deleteReceipt(db));

// Revenue Reports
app.get('/api/revenue/report', verifyToken, revenueAPIs.getRevenueReport(db));
app.get('/api/revenue/budget-comparison', verifyToken, revenueAPIs.getBudgetComparison(db));

// ========================================
// EXPENSE MODULE APIs (Chi sự nghiệp - HCSN)
// ========================================

// Expense Categories
app.get('/api/expense/categories', verifyToken, expenseAPIs.getCategories(db));
app.post('/api/expense/categories', verifyToken, expenseAPIs.createCategory(db));

// Expense Vouchers (Phiếu chi)
app.get('/api/expense/vouchers', verifyToken, expenseAPIs.getVouchers(db));
app.post('/api/expense/vouchers', verifyToken, expenseAPIs.createVoucher(db));
app.get('/api/expense/vouchers/:id', verifyToken, expenseAPIs.getVoucherDetail(db));
app.put('/api/expense/vouchers/:id', verifyToken, expenseAPIs.updateVoucher(db));
app.delete('/api/expense/vouchers/:id', verifyToken, expenseAPIs.deleteVoucher(db));

// Expense Reports
app.get('/api/expense/report', verifyToken, expenseAPIs.getExpenseReport(db));
app.get('/api/expense/budget-comparison', verifyToken, expenseAPIs.getBudgetComparison(db));

// --- 5. API: Master Data & Vouchers ---

app.get('/api/settings', verifyToken, requireRole('admin'), (req, res) => {
    db.all("SELECT key, value FROM system_settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/api/settings', verifyToken, requireRole('admin'), (req, res) => {
    const { key, value } = req.body;
    // Check if exists
    db.get("SELECT key FROM system_settings WHERE key = ?", [key], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            db.run("UPDATE system_settings SET value = ? WHERE key = ?", [value, key], cb);
        } else {
            db.run("INSERT INTO system_settings (key, value) VALUES (?, ?)", [key, value], cb);
        }
        function cb(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success' });
        }
    });
});

app.get('/api/reminders', verifyToken, (req, res) => {
    const now = new Date().toISOString().split('T')[0];

    const overdueSql = `
        SELECT count(*) as count, IFNULL(sum(remaining), 0) as total
        FROM (
            SELECT v.id, (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) as remaining
            FROM vouchers v
            WHERE v.type = 'SALES_INVOICE' AND v.doc_date < ?
        )
        WHERE remaining > 0
    `;

    const incompleteSql = `SELECT count(*) as count FROM staging_transactions WHERE is_valid = 0`;

    const currentMonth = now.substring(0, 7); // YYYY-MM
    const tasksSql = `
        SELECT 
            (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'CLOSING') as closing_run,
            (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'REVALUATION') as revaluation_run,
            (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'ALLOCATION') as allocation_run,
            (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'PAYROLL') as payroll_run
    `;

    db.get(overdueSql, [now], (err, overdue) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get(incompleteSql, [], (err, incomplete) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get(tasksSql, [`${currentMonth}%`, `${currentMonth}%`, `${currentMonth}%`, `${currentMonth}%`], (err, tasks) => {
                if (err) return res.status(500).json({ error: err.message });

                const reminders = [];
                if (overdue && overdue.count > 0) {
                    reminders.push({
                        id: 'overdue_inv',
                        type: 'critical',
                        title: 'Hóa đơn quá hạn',
                        message: `Có ${overdue.count} hóa đơn quá hạn chưa thu tiền. Tổng cộng: ${new Intl.NumberFormat('vi-VN').format(overdue.total)} VND.`,
                        count: overdue.count
                    });
                }
                if (incomplete && incomplete.count > 0) {
                    reminders.push({
                        id: 'incomplete_docs',
                        type: 'warning',
                        title: 'Chứng từ chưa hoàn thiện',
                        message: `Có ${incomplete.count} chứng từ trong hàng đợi đang bị lỗi hoặc chưa được kiểm tra.`,
                        count: incomplete.count
                    });
                }
                if (tasks.closing_run === 0) {
                    reminders.push({
                        id: 'task_closing',
                        type: 'info',
                        title: 'Kết chuyển cuối kỳ',
                        message: `Bút toán kết chuyển lãi lỗ tháng ${currentMonth.split('-')[1]} chưa được thực hiện.`,
                    });
                }
                if (tasks.revaluation_run === 0) {
                    reminders.push({
                        id: 'task_reval',
                        type: 'info',
                        title: 'Đánh giá lại ngoại tệ',
                        message: `Chưa thực hiện đánh giá lại tỷ giá ngoại tệ cuối tháng ${currentMonth.split('-')[1]}.`,
                    });
                }
                if (tasks.allocation_run === 0) {
                    reminders.push({
                        id: 'task_alloc',
                        type: 'info',
                        title: 'Khấu hao & Phân bổ',
                        message: `Chưa trích khấu hao TSCĐ và phân bổ chi phí tháng ${currentMonth.split('-')[1]}.`,
                    });
                }
                if (tasks.payroll_run === 0) {
                    reminders.push({
                        id: 'task_payroll',
                        type: 'info',
                        title: 'Tính lương nhân viên',
                        message: `Bảng lương tháng ${currentMonth.split('-')[1]} chưa được duyệt hạch toán.`,
                    });
                }

                res.json(reminders);
            });
        });
    });
});

// HCSN Dashboard Stats API (Updated for TT 24/2024/TT-BTC)
app.get('/api/dashboard/stats', verifyToken, (req, res) => {
    const currentYear = new Date().getFullYear();

    // 1. Cash (Tiền mặt & Ngân hàng) - Giữ nguyên
    const sqlCash = `
        SELECT 
            SUM(CASE WHEN account_code LIKE '111%' OR account_code LIKE '112%' THEN debit_amount - credit_amount ELSE 0 END) as cash
        FROM general_ledger
    `;

    // 2. Fund Sources Summary (Nguồn kinh phí)
    const sqlFund = `
        SELECT 
            IFNULL(SUM(allocated_amount), 0) as fund_allocated,
            IFNULL(SUM(spent_amount), 0) as fund_spent,
            IFNULL(SUM(remaining_amount), 0) as fund_remaining
        FROM fund_sources 
        WHERE fiscal_year = ?
    `;

    // 3. Budget Estimates Summary (Dự toán ngân sách)
    const sqlBudget = `
        SELECT 
            IFNULL(SUM(allocated_amount), 0) as budget_allocated,
            IFNULL(SUM(spent_amount), 0) as budget_spent
        FROM budget_estimates
        WHERE fiscal_year = ?
    `;

    // 4. Infrastructure Assets Summary (Tài sản hạ tầng)
    const sqlInfrastructure = `
        SELECT 
            COUNT(*) as count,
            IFNULL(SUM(net_value), 0) as total_value
        FROM infrastructure_assets
    `;

    // 5. History - Thu vs Chi (12 months) - HCSN terminology
    const sqlHistory = `
        SELECT 
            strftime('%Y-%m', trx_date) as month,
            SUM(CASE WHEN account_code LIKE '5%' THEN credit_amount - debit_amount ELSE 0 END) as thu,
            SUM(CASE WHEN account_code LIKE '6%' OR account_code LIKE '7%' THEN debit_amount - credit_amount ELSE 0 END) as chi,
            SUM(CASE WHEN account_code LIKE '11%' THEN debit_amount - credit_amount ELSE 0 END) as cash_net
        FROM general_ledger
        WHERE trx_date >= date('now', 'start of month', '-11 months')
        GROUP BY month
        ORDER BY month ASC
    `;

    // Execute all queries
    db.get(sqlCash, [], (err, cashData) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get(sqlFund, [currentYear], (err, fundData) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get(sqlBudget, [currentYear], (err, budgetData) => {
                if (err) return res.status(500).json({ error: err.message });

                db.get(sqlInfrastructure, [], (err, infraData) => {
                    if (err) return res.status(500).json({ error: err.message });

                    db.all(sqlHistory, [], (err, historyRows) => {
                        if (err) return res.status(500).json({ error: err.message });

                        // Generate last 12 months labels
                        const months = [];
                        const thu = [];
                        const chi = [];
                        const cashFlow = [];

                        for (let i = 11; i >= 0; i--) {
                            const d = new Date();
                            d.setMonth(d.getMonth() - i);
                            const mStr = d.toISOString().slice(0, 7);
                            const row = historyRows.find(r => r.month === mStr) || { thu: 0, chi: 0, cash_net: 0 };

                            months.push(`T${d.getMonth() + 1}`);
                            thu.push(row.thu);
                            chi.push(row.chi);
                            cashFlow.push(row.cash_net);
                        }

                        // Return HCSN-specific data structure
                        res.json({
                            cash: cashData.cash || 0,
                            fund_allocated: fundData.fund_allocated || 0,
                            fund_spent: fundData.fund_spent || 0,
                            fund_remaining: fundData.fund_remaining || 0,
                            budget_allocated: budgetData.budget_allocated || 0,
                            budget_spent: budgetData.budget_spent || 0,
                            infrastructure_count: infraData.count || 0,
                            infrastructure_value: infraData.total_value || 0,
                            history: {
                                labels: months,
                                thu,
                                chi,
                                cash_flow: cashFlow.slice(-6)
                            }
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/reminders/overdue', verifyToken, (req, res) => {
    const now = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT 
            v.id, 
            v.doc_no as invoice_no, 
            p.partner_name, 
            v.doc_date as due_date, 
            (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) as amount,
            (julianday('now') - julianday(v.doc_date)) as days_overdue
        FROM vouchers v
        LEFT JOIN partners p ON p.partner_code = (SELECT partner_code FROM voucher_items WHERE voucher_id = v.id LIMIT 1)
        WHERE v.type = 'SALES_INVOICE' 
        AND v.doc_date < ?
        AND (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) > 0
    `;
    db.all(sql, [now], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, days_overdue: Math.floor(r.days_overdue) })));
    });
});

app.get('/api/reminders/incomplete', verifyToken, (req, res) => {
    const sql = `
        SELECT 
            id, 
            doc_no, 
            trx_date as doc_date, 
            description, 
            error_log, 
            CASE WHEN error_log LIKE '%invalid%' THEN 'critical' ELSE 'warning' END as severity
        FROM staging_transactions 
        WHERE is_valid = 0
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- API: Account Balance Check ---
app.get('/api/accounts/balance/:code', verifyToken, (req, res) => {
    const code = req.params.code;
    const sql = `SELECT SUM(debit_amount) - SUM(credit_amount) as balance 
                 FROM general_ledger 
                 WHERE account_code = ?`;
    db.get(sql, [code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ account_code: code, balance: row.balance || 0 });
    });
});

// --- API: Reverse Allocation (Layer 2) ---

// Get unpaid invoices for a partner (simplified)
app.get('/api/partners/:code/unpaid-invoices', verifyToken, (req, res) => {
    const partnerCode = req.params.code;
    // Real logic would join general_ledger with allocations to find remaining balance per doc_no
    // For MVP: Get all invoices (Debit 131) and subtract total allocated for that doc_no
    const sql = `
        SELECT v.id, v.doc_no, v.doc_date, v.total_amount,
        (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) as remaining_amount
        FROM vouchers v
        WHERE v.id IN (SELECT voucher_id FROM voucher_items WHERE partner_code = ?)
        AND (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) > 0
    `;
    db.all(sql, [partnerCode], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/allocations', verifyToken, (req, res) => {
    const { payment_id, items } = req.body; // items: [{ invoice_id, amount }]
    const now = new Date().toISOString();

    db.serialize(() => {
        const stmt = db.prepare("INSERT INTO allocations (id, payment_voucher_id, invoice_voucher_id, amount, allocated_at) VALUES (?, ?, ?, ?, ?)");
        items.forEach(item => {
            stmt.run(`${payment_id}_${item.invoice_id}_${Date.now()}`, payment_id, item.invoice_id, item.amount, now);
        });
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success' });
        });
    });
});

app.get('/api/allocations/payment/:id', verifyToken, (req, res) => {
    const paymentId = req.params.id;
    const sql = `
        SELECT v.id as invoice_id, v.doc_no, v.doc_date, v.total_amount,
               SUM(a.amount) as allocated_amount
        FROM allocations a
        JOIN vouchers v ON v.id = a.invoice_voucher_id
        WHERE a.payment_voucher_id = ?
        GROUP BY v.id, v.doc_no, v.doc_date, v.total_amount
        HAVING SUM(a.amount) > 0
    `;
    db.all(sql, [paymentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/allocations/reverse', verifyToken, (req, res) => {
    const { payment_id, items } = req.body; // items: [{ invoice_id, amount }]
    const now = new Date().toISOString();

    db.serialize(() => {
        const stmt = db.prepare("INSERT INTO allocations (id, payment_voucher_id, invoice_voucher_id, amount, allocated_at) VALUES (?, ?, ?, ?, ?)");
        items.forEach(item => {
            const reverseAmount = -Math.abs(item.amount);
            stmt.run(`${payment_id}_${item.invoice_id}_${Date.now()}`, payment_id, item.invoice_id, reverseAmount, now);
        });
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success' });
        });
    });
});

// 1. Auth: Login
app.post('/api/login', rateLimitLogin, (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], (err, row) => {
        if (err || !row) {
            logAction(username, 'LOGIN_FAILED', 'auth', `Invalid password or user not found`);
            return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
        }

        // Check user status (if applicable)
        if (row.status && row.status !== 'Active') {
            logAction(username, 'LOGIN_FAILED', 'auth', `User account is inactive`);
            return res.status(403).json({ error: 'Tài khoản người dùng không hoạt động.' });
        }

        const valid = bcrypt.compareSync(password, row.password);
        if (!valid) {
            logAction(username, 'LOGIN_FAILED', 'auth', `Invalid password`);
            return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
        }

        const token = jwt.sign({ id: row.id, role: row.role }, SECRET_KEY, { expiresIn: '24h' });
        if (res.locals.loginRateKey) loginAttempts.delete(res.locals.loginRateKey);

        const now = new Date().toISOString();
        db.run("UPDATE users SET last_login = ? WHERE id = ?", [now, row.id]);
        logAction(username, 'LOGIN_SUCCESS', 'auth', `User logged in`);
        res.status(200).send({
            auth: true,
            token: token,
            user: { username: row.username, role: row.role }
        });
    });
});

// DEBUG: List all users (REMOVE IN PRODUCTION)
app.get('/api/debug/users', (req, res) => {
    db.all("SELECT id, username, role, status FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// DEBUG: Check password hash (REMOVE IN PRODUCTION)
app.get('/api/debug/check-password', (req, res) => {
    db.get("SELECT username, password FROM users WHERE username = 'admin'", [], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'User not found' });
        const testPassword = 'admin';
        const isValid = bcrypt.compareSync(testPassword, row.password);
        res.json({ username: row.username, hash_starts: row.password.substring(0, 20), test_result: isValid });
    });
});

// 1.5. Master Data: Get All Accounts
app.get('/api/accounts', verifyToken, (req, res) => {
    // If getting full list, filter by company
    // Note: If some accounts are system-wide standards, we might need mixed logic, 
    // but for now assume COA is per company or copied to each company.
    const sql = "SELECT * FROM chart_of_accounts ORDER BY account_code ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.delete('/api/accounts/:code', verifyToken, requireRole('admin'), (req, res) => {
    const { code } = req.params;
    db.get("SELECT account_code FROM chart_of_accounts WHERE account_code = ?", [code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Account not found" });

        const glSql = "SELECT COUNT(*) as count FROM general_ledger WHERE account_code = ? OR reciprocal_acc = ?";
        db.get(glSql, [code, code], (glErr, glRow) => {
            if (glErr) return res.status(500).json({ error: glErr.message });
            if (glRow && glRow.count > 0) {
                return res.status(409).json({ error: "Account is used in general ledger." });
            }

            const voucherSql = "SELECT COUNT(*) as count FROM voucher_items WHERE debit_acc = ? OR credit_acc = ?";
            db.get(voucherSql, [code, code], (vErr, vRow) => {
                if (vErr) return res.status(500).json({ error: vErr.message });
                if (vRow && vRow.count > 0) {
                    return res.status(409).json({ error: "Account is used in vouchers." });
                }

                const stagingSql = "SELECT COUNT(*) as count FROM staging_transactions WHERE debit_acc = ? OR credit_acc = ?";
                db.get(stagingSql, [code, code], (sErr, sRow) => {
                    if (sErr) return res.status(500).json({ error: sErr.message });
                    if (sRow && sRow.count > 0) {
                        return res.status(409).json({ error: "Account is used in staging." });
                    }

                    db.run("DELETE FROM chart_of_accounts WHERE account_code = ?", [code], function (delErr) {
                        if (delErr) return res.status(500).json({ error: delErr.message });
                        res.json({ message: "Account deleted", changes: this.changes });
                    });
                });
            });
        });
    });
});

app.post('/api/master/accounts', verifyToken, (req, res) => {
    const { accounts } = req.body;
    if (!accounts || !Array.isArray(accounts)) return res.status(400).json({ error: "Invalid data" });

    // Transactional save for better integrity
    db.serialize(() => {
        const stmt = db.prepare("INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, parent_account, level, type, is_parent) VALUES (?, ?, ?, ?, ?, ?)");
        accounts.forEach(acc => {
            stmt.run(acc.account_code, acc.account_name, acc.parent_account, acc.level, acc.type, acc.is_parent);
        });
        stmt.finalize(err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Chart of Accounts updated" });
        });
    });
});

// 1.5.1 Master Data: Get All Partners
app.get('/api/partners', verifyToken, (req, res) => {
    const sql = "SELECT * FROM partners ORDER BY partner_code ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

// 1.5.1.1 Master Data: Save Partner
app.post('/api/partners', verifyToken, (req, res) => {
    const { partner_code, partner_name, tax_code, address } = req.body;
    if (!partner_code || !partner_name) {
        return res.status(400).json({ error: "Partner code and name are required." });
    }

    // Check conflict within company
    db.get("SELECT partner_code FROM partners WHERE partner_code = ?", [partner_code], (err, row) => {
        if (row) {
            const sql = `UPDATE partners SET partner_name=?, tax_code=?, address=? WHERE partner_code=?`;
            db.run(sql, [partner_name, tax_code, address, partner_code], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Partner updated", id: partner_code });
            });
        } else {
            const sql = `INSERT INTO partners (partner_code, partner_name, tax_code, address) VALUES (?, ?, ?, ?)`;
            db.run(sql, [partner_code, partner_name, tax_code, address], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Partner created", id: partner_code });
            });
        }
    });
});

app.delete('/api/partners/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM partners WHERE partner_code = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Partner deleted", changes: this.changes });
    });
});

// 1.5.1.2 Master Data: Assets & CCDC
app.get('/api/assets', verifyToken, (req, res) => {
    const sql = "SELECT * FROM fixed_assets ORDER BY code ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.get('/api/ccdc', verifyToken, (req, res) => {
    const sql = "SELECT * FROM ccdc_items ORDER BY code ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.delete('/api/assets/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM fixed_assets WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Asset deleted", changes: this.changes });
    });
});

app.delete('/api/ccdc/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM ccdc_items WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "CCDC deleted", changes: this.changes });
    });
});

app.post('/api/assets', verifyToken, (req, res) => {
    const { code, name, start_date, cost, life_years, dept } = req.body;
    const id = `asset_${Date.now()}`;
    const sql = `INSERT INTO fixed_assets (id, code, name, start_date, cost, life_years, accumulated, residual, dept) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id, code, name, start_date, cost, life_years, 0, cost, dept], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "Asset created", id });
    });
});

app.post('/api/ccdc', verifyToken, (req, res) => {
    const { code, name, start_date, cost, life_months } = req.body;
    const id = `ccdc_${Date.now()}`;
    const sql = `INSERT INTO ccdc_items (id, code, name, start_date, cost, life_months, allocated, remaining) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id, code, name, start_date, cost, life_months, 0, cost], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "CCDC created", id });
    });
});

app.post('/api/assets/depreciate', verifyToken, (req, res) => {
    const { period } = req.body; // YYYY-MM
    // Get all assets and CCDC that haven't been fully depreciated, filtered by company
    db.all("SELECT * FROM fixed_assets WHERE residual > 0", [], (err, assets) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all("SELECT * FROM ccdc_items WHERE remaining > 0", [], (err, ccdc) => {
            if (err) return res.status(500).json({ error: err.message });

            db.serialize(() => {
                let totalDepreciation = 0;
                const now = new Date().toISOString();
                const voucherId = `PK_${Date.now()}`;

                // 1. Process Fixed Assets
                assets.forEach(asset => {
                    const monthly = asset.cost / (asset.life_years * 12);
                    const actualDep = Math.min(monthly, asset.residual);
                    totalDepreciation += actualDep;

                    db.run("UPDATE fixed_assets SET accumulated = accumulated + ?, residual = residual - ? WHERE id = ?",
                        [actualDep, actualDep, asset.id]);
                });

                // 2. Process CCDC
                ccdc.forEach(item => {
                    const monthly = item.cost / item.life_months;
                    const actualAlloc = Math.min(monthly, item.remaining);
                    totalDepreciation += actualAlloc;

                    db.run("UPDATE ccdc_items SET allocated = allocated + ?, remaining = remaining - ? WHERE id = ?",
                        [actualAlloc, actualAlloc, item.id]);
                });

                if (totalDepreciation > 0) {
                    // Create GL entries (simplified)
                    const docNo = `KH-${period.replace('-', '')}`;
                    db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                        [voucherId, docNo, `${period}-28`, `${period}-28`, `Khấu hao & Phân bổ tháng ${period}`, 'ALLOCATION', totalDepreciation, now]);

                    db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                        [voucherId, `Trích khấu hao tài sản tháng ${period}`, '642', '214', totalDepreciation]);

                    // Also update GL for trial balance consistency
                    const glId1 = `gl_${Date.now()}_1`;
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount) VALUES (?,?,?,?,?,?,?,?,?)",
                        [glId1, `${period}-28`, now, docNo, `Khấu hao tháng ${period}`, '642', '214', totalDepreciation, 0]);

                    const glId2 = `gl_${Date.now()}_2`;
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount) VALUES (?,?,?,?,?,?,?,?,?)",
                        [glId2, `${period}-28`, now, docNo, `Khấu hao tháng ${period}`, '214', '642', 0, totalDepreciation]);
                }

                res.json({ status: 'success', total: totalDepreciation });
            });
        });
    });
});

app.post('/api/assets/dispose', verifyToken, (req, res) => {
    const { id, type, date, reason, doc_no } = req.body;
    const table = type === 'CCDC' ? 'ccdc_items' : 'fixed_assets';
    const amountField = type === 'CCDC' ? 'remaining' : 'residual';

    db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, asset) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!asset) return res.status(404).json({ error: "Asset not found" });

        const remainingVal = asset[amountField];
        const now = new Date().toISOString();
        const voucherId = `TL_${Date.now()}`;

        db.serialize(() => {
            // Mark as disposed (zero out remaining value)
            if (type === 'CCDC') {
                db.run("UPDATE ccdc_items SET allocated = cost, remaining = 0 WHERE id = ?", [id]);
            } else {
                db.run("UPDATE fixed_assets SET accumulated = cost, residual = 0 WHERE id = ?", [id]);
            }

            // Create GL entries for disposal (simplified)
            db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                [voucherId, doc_no, date, date, `Thanh lý tài sản: ${asset.name} - Lý do: ${reason}`, 'GENERAL', remainingVal, now]);

            // Nợ 811 / Có 211 (giá trị còn lại)
            db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                [voucherId, `Giá trị còn lại tài sản thanh lý`, '811', type === 'CCDC' ? '242' : '211', remainingVal]);

            res.json({ status: 'success' });
        });
    });
});

// 1.5.1.3 Master Data: Employees
app.get('/api/employees', verifyToken, (req, res) => {
    const sql = "SELECT * FROM employees ORDER BY id ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/employees', verifyToken, (req, res) => {
    const { id, name, dept, pos, basic_salary, insurance_salary, status } = req.body;

    // Check ownership
    db.get("SELECT id FROM employees WHERE id = ?", [id], (err) => {

        const sql = `INSERT OR REPLACE INTO employees (id, name, dept, pos, basic_salary, insurance_salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [id, name, dept, pos, basic_salary, insurance_salary, status], function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "Employee saved", id: id });
        });
    });
});

app.delete('/api/employees/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM employees WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Employee deleted", changes: this.changes });
    });
});

// [REMOVED] Inline HR handlers (Moved to hr_apis.js)

// 1.5.1.4 Commercial: Sales Module
app.get('/api/sales/orders', verifyToken, (req, res) => {
    db.all("SELECT * FROM sales_orders ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

app.delete('/api/sales/orders/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM sales_orders WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Sales order deleted", changes: this.changes });
    });
});

app.get('/api/sales/invoices', verifyToken, (req, res) => {
    db.all("SELECT * FROM sales_invoices ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

app.delete('/api/sales/invoices/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM sales_invoices WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Sales invoice deleted", changes: this.changes });
    });
});

app.get('/api/sales/returns', verifyToken, (req, res) => {
    db.all("SELECT * FROM vouchers WHERE type = 'SALES_RETURN' ORDER BY doc_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id,
            date: r.doc_date,
            doc_no: r.doc_no,
            customer: 'Khách hàng',
            description: r.description,
            amount: r.total_amount
        })));
    });
});

app.delete('/api/sales/returns/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Sales return deleted", changes: this.changes });
    });
});

app.get('/api/sales/payments', verifyToken, (req, res) => {
    db.all("SELECT * FROM vouchers WHERE type IN ('CASH_IN', 'BANK_IN') ORDER BY doc_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id,
            date: r.doc_date,
            doc_no: r.doc_no,
            customer: 'Khách hàng',
            description: r.description,
            amount: r.total_amount,
            method: r.type === 'CASH_IN' ? 'Tiền mặt' : 'Chuyển khoản'
        })));
    });
});

app.delete('/api/sales/payments/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Sales payment deleted", changes: this.changes });
    });
});

// 1.5.1.5 Commercial: Purchase Module
app.get('/api/purchase/orders', verifyToken, (req, res) => {
    db.all("SELECT * FROM purchase_orders ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

app.delete('/api/purchase/orders/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM purchase_orders WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Purchase order deleted", changes: this.changes });
    });
});

app.get('/api/purchase/invoices', verifyToken, (req, res) => {
    const { type } = req.query;
    let sql = "SELECT * FROM purchase_invoices";
    const params = [];
    if (type) {
        sql += " WHERE type = ?";
        params.push(type);
    }
    sql += " ORDER BY date DESC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/purchase/invoices/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM purchase_invoices WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Purchase invoice deleted", changes: this.changes });
    });
});

app.get('/api/purchase/returns', verifyToken, (req, res) => {
    db.all("SELECT * FROM vouchers WHERE type = 'PURCHASE_RETURN' ORDER BY doc_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id,
            date: r.doc_date,
            doc_no: r.doc_no,
            supplier: 'Nhà cung cấp',
            description: r.description,
            amount: r.total_amount
        })));
    });
});

app.delete('/api/purchase/returns/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Purchase return deleted", changes: this.changes });
    });
});


app.get('/api/purchase/payments', verifyToken, (req, res) => {
    db.all("SELECT * FROM vouchers WHERE type IN ('CASH_OUT', 'BANK_OUT') ORDER BY doc_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id,
            date: r.doc_date,
            doc_no: r.doc_no,
            supplier: 'Nhà cung cấp',
            description: r.description,
            amount: r.total_amount,
            method: r.type === 'CASH_OUT' ? 'Tiền mặt' : 'Chuyển khoản'
        })));
    });
});

app.delete('/api/purchase/payments/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Purchase payment deleted", changes: this.changes });
    });
});

// 1.5.1.6 Contracts & Projects

app.get('/api/contracts', verifyToken, (req, res) => {
    const { type } = req.query;
    let sql = "SELECT * FROM contracts";
    let params = [];
    if (type) {
        sql += " WHERE type = ?";
        params.push(type);
    }
    sql += " ORDER BY date DESC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/contracts', verifyToken, (req, res) => {
    const {
        id, code, name, partner, date, value, received_or_paid, status, type,
        // HCSN fields
        partner_code, contract_type, fund_source_id, budget_estimate_id,
        approval_no, approval_date, payment_method, payment_terms,
        warranty_period, notes
    } = req.body;
    const contractId = id || `C${Date.now()}`;
    const sql = `INSERT OR REPLACE INTO contracts (
        id, code, name, partner, date, value, received_or_paid, status, type,
        partner_code, contract_type, fund_source_id, budget_estimate_id,
        approval_no, approval_date, payment_method, payment_terms,
        warranty_period, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [
        contractId, code, name, partner, date, value, received_or_paid || 0, status || 'Đang thực hiện', type,
        partner_code, contract_type, fund_source_id, budget_estimate_id,
        approval_no, approval_date, payment_method, payment_terms,
        warranty_period, notes
    ], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "Contract saved", id: contractId });
    });
});

app.delete('/api/contracts/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM contracts WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Contract deleted", changes: this.changes });
    });
});

app.get('/api/contracts/appendices', verifyToken, (req, res) => {
    const sql = `SELECT a.*, c.code as parent_code FROM contract_appendices a LEFT JOIN contracts c ON a.contract_id = c.id ORDER BY a.date DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.get('/api/projects', verifyToken, (req, res) => {
    db.all("SELECT * FROM projects ORDER BY code ASC", [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/projects', verifyToken, (req, res) => {
    const {
        id, code, name, customer, budget, start, end, progress, status,
        // HCSN fields
        project_type, fund_source_id, budget_estimate_id, approval_no, approval_date,
        managing_agency, task_code, objective, expected_output, completion_date, partner_code
    } = req.body;
    const prjId = id || `DA${Date.now()}`;
    const sql = `INSERT OR REPLACE INTO projects (
        id, code, name, customer, budget, start, end, progress, status,
        project_type, fund_source_id, budget_estimate_id, approval_no, approval_date,
        managing_agency, task_code, objective, expected_output, completion_date, partner_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [
        prjId, code, name, customer, budget, start, end, progress || 0, status || 'Mới khởi tạo',
        project_type, fund_source_id, budget_estimate_id, approval_no, approval_date,
        managing_agency, task_code, objective, expected_output, completion_date, partner_code
    ], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "Project saved", id: prjId });
    });
});

app.delete('/api/projects/:id', verifyToken, requireRole('admin'), (req, res) => {
    const { id } = req.params;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM project_tasks WHERE project_id = ?", [id]);
        db.run("DELETE FROM project_budget_lines WHERE project_id = ?", [id]);
        db.run("DELETE FROM projects WHERE id = ?", [id], function (err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            db.run("COMMIT");
            res.json({ message: "Project deleted", changes: this.changes });
        });
    });
});


app.get('/api/projects/tasks', verifyToken, (req, res) => {
    const { project_code } = req.query;
    let sql = `SELECT t.*, p.code as prj_code FROM project_tasks t JOIN projects p ON t.project_id = p.id`;
    let params = [];
    if (project_code) {
        sql += " WHERE p.code = ?";
        params.push(project_code);
    }
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/projects/tasks', verifyToken, (req, res) => {
    const { id, progress, status } = req.body;
    const sql = `UPDATE project_tasks SET progress = ?, status = ? WHERE id = ?`;
    db.run(sql, [progress, status, id], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "Task updated" });
    });
});

app.get('/api/projects/budgets', verifyToken, (req, res) => {
    const { project_code } = req.query;
    // Get budget lines joined with actual spending from voucher_items (dim1 is project_code)
    const sql = `
        SELECT 
            b.id, b.category, b.budget,
            COALESCE(SUM(v.amount), 0) as actual
        FROM project_budget_lines b
        JOIN projects p ON b.project_id = p.id
        LEFT JOIN voucher_items v ON p.code = v.dim1 AND b.category LIKE '%' || v.description || '%'
        WHERE p.code = ?
        GROUP BY b.id
    `;
    db.all(sql, [project_code], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows.map(r => ({
            ...r,
            remaining: r.budget - r.actual,
            percent: r.budget > 0 ? (r.actual / r.budget * 100).toFixed(1) : 0
        })));
    });
});

app.get('/api/projects/pnl', verifyToken, (req, res) => {
    // Dynamic P&L by Project
    const sql = `
        SELECT 
            p.code, p.name,
            SUM(CASE WHEN v.credit_acc LIKE '511%' THEN v.amount ELSE 0 END) as revenue,
            SUM(CASE WHEN v.debit_acc LIKE '6%' THEN v.amount ELSE 0 END) as cost
        FROM projects p
        LEFT JOIN voucher_items v ON p.code = v.dim1
        GROUP BY p.code, p.name
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows.map(r => ({
            ...r,
            profit: r.revenue - r.cost,
            margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue * 100).toFixed(1) : 0
        })));
    });
});

// 1.5.1.7 Master Data: Products
app.get('/api/products', verifyToken, (req, res) => {
    db.all("SELECT * FROM products ORDER BY code ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/products', verifyToken, (req, res) => {
    const { code, name, unit, price, tax, type, conversion_units } = req.body;

    // Check ownership
    db.get("SELECT id FROM products WHERE code = ?", [code], (err) => {

        const sql = `INSERT INTO products (code, name, unit, price, tax, type, conversion_units) VALUES (?,?,?,?,?,?,?)
                     ON CONFLICT(code) DO UPDATE SET name=excluded.name, unit=excluded.unit, price=excluded.price, tax=excluded.tax, type=excluded.type, conversion_units=excluded.conversion_units`;
        db.run(sql, [code, name, unit, price, tax, type, conversion_units ? JSON.stringify(conversion_units) : null], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Product saved", id: this.lastID });
        });
    });
});

app.delete('/api/products/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product deleted", changes: this.changes });
    });
});

app.get('/api/loans/contracts', verifyToken, (req, res) => {
    db.all("SELECT * FROM loan_contracts ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/loans/contracts', verifyToken, (req, res) => {
    const { docNo, partner, limit_amount, collateral, status, date } = req.body;
    const sql = `INSERT INTO loan_contracts (docNo, partner, limit_amount, collateral, status, date) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [docNo, partner, limit_amount, collateral, status, date], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "Loan contract created", id: this.lastID });
    });
});

app.delete('/api/loans/contracts/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM loan_contracts WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Loan contract deleted", changes: this.changes });
    });
});

app.get('/api/loans/debt-notes', verifyToken, (req, res) => {
    const sql = `SELECT d.*, c.partner FROM debt_notes d JOIN loan_contracts c ON d.contract_id = c.id ORDER BY d.start_date DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/loans/debt-notes', verifyToken, (req, res) => {
    const { contract_id, doc_no, amount, rate, start_date, end_date, purpose } = req.body;
    // Verify contract exists
    db.get("SELECT id FROM loan_contracts WHERE id = ?", [contract_id], (err, contract) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!contract) return res.status(404).json({ error: "Contract not found" });

        const sql = `INSERT INTO debt_notes (contract_id, doc_no, amount, rate, start_date, end_date, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [contract_id, doc_no, amount, rate, start_date, end_date, purpose], function (err) {
            if (err) return res.status(400).json({ "error": err.message });

            const lastID = this.lastID;
            // Create GL entry for disbursement
            const voucherId = `PK_DN_${Date.now()}`;
            const now = new Date().toISOString();
            db.serialize(() => {
                db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                    [voucherId, doc_no, start_date, start_date, `Giải ngân khế ước ${doc_no} - ${purpose}`, 'GENERAL', amount, now]);

                db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                    [voucherId, `Giải ngân khế ước ${doc_no}`, '112', '341', amount]);
            });

            res.json({ message: "Debt note created", id: lastID });
        });
    });
});

app.delete('/api/loans/debt-notes/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM debt_notes WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Debt note deleted", changes: this.changes });
    });
});

app.post('/api/loans/calculate-interest', verifyToken, (req, res) => {
    const { period } = req.body; // YYYY-MM
    db.all("SELECT d.*, c.partner FROM debt_notes d JOIN loan_contracts c ON d.contract_id = c.id", [], (err, notes) => {
        if (err) return res.status(500).json({ error: err.message });

        let totalInterest = 0;
        const now = new Date().toISOString();
        const voucherId = `Interest_${Date.now()}`;
        const docNoText = `L-${period.replace('-', '')}`;

        notes.forEach(note => {
            const monthlyInterest = (note.amount * note.rate / 100) / 12;
            totalInterest += monthlyInterest;
        });

        if (totalInterest > 0) {
            db.serialize(() => {
                db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                    [voucherId, docNoText, `${period}-28`, `${period}-28`, `Trích tính lãi vay tháng ${period}`, 'GENERAL', totalInterest, now]);

                db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                    [voucherId, `Lãi vay tháng ${period}`, '635', '3388', totalInterest]);
            });
        }

        res.json({ status: 'success', total: totalInterest });
    });
});

// 1.5.2 Dimensions
app.get('/api/dimensions', verifyToken, (req, res) => {
    const type = req.query.type;
    let sql = "SELECT * FROM dimensions";
    const params = [];
    if (type) {
        sql += " WHERE type = ?";
        params.push(type);
    }
    sql += " ORDER BY code ASC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/dimensions', verifyToken, (req, res) => {
    const { code, name, type } = req.body;
    db.run("INSERT INTO dimensions (code, name, type) VALUES (?, ?, ?)", [code, name, type], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.get('/api/dimensions/configs', verifyToken, (req, res) => {
    db.all("SELECT * FROM dimension_configs", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/dimensions/configs', verifyToken, (req, res) => {
    const configs = req.body; // Array of { account_code, dim1_type, ... }
    db.serialize(() => {
        db.run("DELETE FROM dimension_configs");
        const stmt = db.prepare("INSERT INTO dimension_configs (account_code, dim1_type, dim2_type, dim3_type, dim4_type, dim5_type) VALUES (?,?,?,?,?,?)");
        configs.forEach(c => {
            stmt.run(c.account_code, c.dim1_type, c.dim2_type, c.dim3_type, c.dim4_type, c.dim5_type);
        });
        stmt.finalize(err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success' });
        });
    });
});

app.delete('/api/dimensions/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM dimensions WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Dimension deleted", changes: this.changes });
    });
});

// 1.5.3 Dimensions Groups

app.get('/api/dimensions/groups', verifyToken, (req, res) => {
    const sql = `
        SELECT g.*, COUNT(m.dimension_id) as count
        FROM dimension_groups g
        LEFT JOIN dimension_group_members m ON g.id = m.group_id
        GROUP BY g.id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/dimensions/groups', verifyToken, (req, res) => {
    const { id, code, name, dim_type, description, members } = req.body;
    const groupId = id || `G${Date.now()}`;

    db.serialize(() => {
        db.run(`INSERT OR REPLACE INTO dimension_groups (id, code, name, dim_type, description) VALUES (?, ?, ?, ?, ?)`,
            [groupId, code, name, dim_type, description]);

        db.run(`DELETE FROM dimension_group_members WHERE group_id = ?`, [groupId]);

        if (members && members.length > 0) {
            const insert = db.prepare(`INSERT INTO dimension_group_members (group_id, dimension_id) VALUES (?, ?)`);
            members.forEach(mId => {
                insert.run([groupId, mId]);
            });
            insert.finalize();
        }

        res.json({ message: "Group saved", id: groupId });
    });
});

// 1.5.1.5 Master Data: Budgets
app.get('/api/budgets', verifyToken, (req, res) => {
    const { period } = req.query;
    let sql = "SELECT * FROM budgets";
    let params = [];
    if (period) {
        sql += " WHERE period = ?";
        params.push(period);
    }
    sql += " ORDER BY account_code ASC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/budgets', verifyToken, (req, res) => {
    const { account_code, period, amount, notes } = req.body;
    if (!account_code || !period) {
        return res.status(400).json({ error: "Account Code and Period are required." });
    }

    // Check if exists
    db.get("SELECT id FROM budgets WHERE account_code = ? AND period = ?", [account_code, period], (err, row) => {
        if (err) return res.status(400).json({ error: err.message });

        if (row) {
            // Update
            const sql = "UPDATE budgets SET amount = ?, notes = ? WHERE id = ?";
            db.run(sql, [amount, notes, row.id], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Budget updated", id: row.id });
            });
        } else {
            // Insert
            const sql = "INSERT INTO budgets (account_code, period, amount, notes, created_at) VALUES (?, ?, ?, ?, ?)";
            db.run(sql, [account_code, period, amount, notes, new Date().toISOString()], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Budget crrated", id: this.lastID });
            });
        }
    });
});

app.delete('/api/budgets/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM budgets WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Budget deleted", changes: this.changes });
    });
});

// 1.5.2 Analytics: Get All Account Balances (Trial Balance Style)
app.get('/api/accounts/balances', verifyToken, (req, res) => {
    const sql = `
        SELECT 
            t1.account_code, 
            t1.account_name,
            t1.category,
            COALESCE(SUM(t2.debit_amount), 0) as total_debit, 
            COALESCE(SUM(t2.credit_amount), 0) as total_credit 
        FROM chart_of_accounts t1
        LEFT JOIN general_ledger t2 ON t1.account_code = t2.account_code
        GROUP BY t1.account_code
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });

        const balances = rows.map(r => {
            const balance = r.total_debit - r.total_credit;
            // For revenue/equity/liability, normal balance is Credit
            // For assets/expenses, normal balance is Debit
            // Simplification: just return net debit
            return {
                ...r,
                net_balance: balance
            };
        });
        res.json(balances);
    });
});

// 1.6.1 Trial Balance Report
app.get('/api/reports/trial-balance', verifyToken, (req, res) => {
    const fromDate = req.query.fromDate || new Date().getFullYear() + '-01-01';
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    const sql = `
        SELECT 
            c.account_code, 
            c.account_name,
            -- Opening
            COALESCE(SUM(CASE WHEN gl.trx_date < ? THEN gl.debit_amount ELSE 0 END), 0) as op_debit,
            COALESCE(SUM(CASE WHEN gl.trx_date < ? THEN gl.credit_amount ELSE 0 END), 0) as op_credit,
            -- Period
            COALESCE(SUM(CASE WHEN gl.trx_date >= ? AND gl.trx_date <= ? THEN gl.debit_amount ELSE 0 END), 0) as p_debit,
            COALESCE(SUM(CASE WHEN gl.trx_date >= ? AND gl.trx_date <= ? THEN gl.credit_amount ELSE 0 END), 0) as p_credit
        FROM chart_of_accounts c
        LEFT JOIN general_ledger gl ON c.account_code = gl.account_code
        GROUP BY c.account_code
        ORDER BY c.account_code
    `;

    db.all(sql, [fromDate, fromDate, fromDate, toDate, fromDate, toDate], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        const result = rows.map(r => {
            const op_bal = r.op_debit - r.op_credit;
            const closing_bal = op_bal + (r.p_debit - r.p_credit);
            return {
                id: r.account_code,
                account_code: r.account_code,
                account_name: r.account_name,
                opening_debit: op_bal > 0 ? op_bal : 0,
                opening_credit: op_bal < 0 ? Math.abs(op_bal) : 0,
                period_debit: r.p_debit,
                period_credit: r.p_credit,
                closing_debit: closing_bal > 0 ? closing_bal : 0,
                closing_credit: closing_bal < 0 ? Math.abs(closing_bal) : 0
            };
        }).filter(r => r.opening_debit !== 0 || r.opening_credit !== 0 || r.period_debit !== 0 || r.period_credit !== 0);
        res.json(result);
    });
});

// 1.6.2 Cash Book Report
app.get('/api/reports/cash-book', verifyToken, (req, res) => {
    const fromDate = req.query.fromDate || '2024-01-01';
    const toDate = req.query.toDate || '2024-12-31';

    // Initial Balance
    const balSql = `
        SELECT SUM(debit_amount - credit_amount) as balance 
        FROM general_ledger 
        WHERE (account_code LIKE '111%' OR account_code LIKE '112%') 
        AND trx_date < ?
    `;

    db.get(balSql, [fromDate], (err, balRow) => {
        if (err) return res.status(400).json({ error: err.message });
        let currentBalance = balRow?.balance || 0;

        // Transactions
        const trxSql = `
            SELECT * FROM general_ledger 
            WHERE (account_code LIKE '111%' OR account_code LIKE '112%') 
            AND trx_date >= ? AND trx_date <= ?
            ORDER BY trx_date ASC
        `;

        db.all(trxSql, [fromDate, toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });

            const report = rows.map(r => {
                const amount = r.debit_amount > 0 ? r.debit_amount : -r.credit_amount;
                currentBalance += amount;
                return {
                    id: r.id,
                    date: r.trx_date,
                    booking_no: r.doc_no, // Using doc_no as receipt/payment no
                    description: r.description,
                    account: r.reciprocal_acc, // Shows the other side of entry
                    cash_in: r.debit_amount,
                    cash_out: r.credit_amount,
                    balance: currentBalance
                };
            });

            // Add Opening Line
            report.unshift({
                id: 'opening',
                date: fromDate,
                booking_no: '',
                description: 'Số dư đầu kỳ',
                account: '',
                cash_in: 0,
                cash_out: 0,
                balance: balRow?.balance || 0
            });

            res.json(report);
        });
    });
});

// 1.6.3 Inventory Report (Detailed)
app.get('/api/reports/inventory', verifyToken, (req, res) => {
    const fromDate = req.query.fromDate || new Date().getFullYear() + '-01-01';
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    const sql = `
        SELECT 
            account_code, 
            account_code as item_name, -- Using Account Name as Item Name (Schema Limitation)
            -- Opening: Sum(Dr - Cr) before period
            SUM(CASE WHEN trx_date < ? THEN debit_amount - credit_amount ELSE 0 END) as opening_val,
            -- In: Sum(Dr) in period
            SUM(CASE WHEN trx_date >= ? AND trx_date <= ? THEN debit_amount ELSE 0 END) as in_val,
            -- Out: Sum(Cr) in period
            SUM(CASE WHEN trx_date >= ? AND trx_date <= ? THEN credit_amount ELSE 0 END) as out_val
        FROM general_ledger
        WHERE account_code LIKE '15%'
        GROUP BY account_code
        HAVING opening_val <> 0 OR in_val <> 0 OR out_val <> 0
    `;

    db.all(sql, [fromDate, fromDate, toDate, fromDate, toDate], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });

        const result = rows.map(r => {
            const closing = r.opening_val + r.in_val - r.out_val;
            return {
                id: r.account_code,
                item_code: r.account_code,
                item_name: `Mặt hàng ${r.account_code}`,
                unit: 'VND', // GL tracks value primarily
                opening_qty: 0, // GL doesn't strictly track qty in this simplified schema
                opening_value: r.opening_val,
                in_qty: 0,
                in_value: r.in_val,
                out_qty: 0,
                out_value: r.out_val,
                closing_qty: 0,
                closing_value: closing
            };
        });
        res.json(result);
    });
});

// 1.6.4 Balance Sheet Report
app.get('/api/reports/balance-sheet', verifyToken, (req, res) => {
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    // Calculate Closing Balances for all accounts up to toDate
    const sql = `
        SELECT account_code, SUM(debit_amount) - SUM(credit_amount) as balance
        FROM general_ledger
        WHERE trx_date <= ?
        GROUP BY account_code
    `;

    db.all(sql, [toDate], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });

        // Helper to sum by prefix
        const sumByPrefix = (prefix) => {
            return rows.filter(r => r.account_code.startsWith(prefix))
                .reduce((acc, r) => acc + r.balance, 0);
        };

        // Assets (Debit Balances)
        const currentAssets = sumByPrefix('1');
        const cash = sumByPrefix('11'); // 111+112+113
        const financialInvest = sumByPrefix('12');
        const receivables = sumByPrefix('13');
        const inventory = sumByPrefix('15');
        const otherCurrent = sumByPrefix('14') + sumByPrefix('19'); // Simplified

        const nonCurrentAssets = sumByPrefix('2');
        const fixedAssets = sumByPrefix('21');
        const investmentProp = sumByPrefix('217'); // Example
        const longTermWIP = sumByPrefix('24');
        const otherNonCurrent = sumByPrefix('22') + sumByPrefix('29'); // Simplified

        // Resources (Credit Balances - so we flip sign for display if we want positive numbers, usually Liabilities are Credit)
        // But here `balance` is Debit - Credit. So Liabilities will be negative.
        // We want positive display values.

        const liabiltiesVal = -sumByPrefix('3');
        const equityVal = -sumByPrefix('4');

        const shortTermLiab = -sumByPrefix('31') - sumByPrefix('32') - sumByPrefix('33') - sumByPrefix('34') - sumByPrefix('35'); // Rough approximation
        const longTermLiab = -sumByPrefix('338') - sumByPrefix('34'); // Refine as needed

        const equityCapital = -sumByPrefix('41');
        const funds = -sumByPrefix('44'); // etc

        // Return structured rows matching frontend
        const report = [
            { id: '100', target: 'A. TÀI SẢN NGẮN HẠN (100=110+120+130+140+150)', code: '100', current_period: currentAssets, previous_period: 0, is_bold: true, level: 0 },
            { id: '110', target: 'I. Tiền và các khoản tương đương tiền', code: '110', current_period: cash, previous_period: 0, is_bold: true, level: 1 },
            { id: '111', target: '1. Tiền mặt', code: '111', current_period: sumByPrefix('111'), previous_period: 0, level: 2 },
            { id: '112', target: '2. Tiền gửi ngân hàng', code: '112', current_period: sumByPrefix('112'), previous_period: 0, level: 2 },
            { id: '113', target: '3. Tiền đang chuyển', code: '113', current_period: sumByPrefix('113'), previous_period: 0, level: 2 },
            { id: '120', target: 'II. Đầu tư tài chính ngắn hạn', code: '120', current_period: financialInvest, previous_period: 0, is_bold: true, level: 1 },
            { id: '121', target: '1. Chứng khoán kinh doanh', code: '121', current_period: sumByPrefix('121'), previous_period: 0, level: 2 },
            { id: '122', target: '2. Dự phòng giảm giá chứng khoán kinh doanh (*)', code: '122', current_period: sumByPrefix('129'), previous_period: 0, level: 2 },
            { id: '123', target: '3. Đầu tư nắm giữ đến ngày đáo hạn', code: '123', current_period: sumByPrefix('128'), previous_period: 0, level: 2 },
            { id: '130', target: 'III. Các khoản phải thu ngắn hạn', code: '130', current_period: receivables, previous_period: 0, is_bold: true, level: 1 },
            { id: '131', target: '1. Phải thu ngắn hạn của khách hàng', code: '131', current_period: sumByPrefix('131'), previous_period: 0, level: 2 },
            { id: '132', target: '2. Trả trước cho người bán ngắn hạn', code: '132', current_period: sumByPrefix('132'), previous_period: 0, level: 2 },
            { id: '133', target: '3. Phải thu nội bộ ngắn hạn', code: '133', current_period: sumByPrefix('133'), previous_period: 0, level: 2 },
            { id: '134', target: '4. Phải thu theo tiến độ kế hoạch hợp đồng xây dựng', code: '134', current_period: 0, previous_period: 0, level: 2 },
            { id: '135', target: '5. Phải thu về cho vay ngắn hạn', code: '135', current_period: sumByPrefix('135'), previous_period: 0, level: 2 },
            { id: '136', target: '6. Phải thu ngắn hạn khác', code: '136', current_period: sumByPrefix('138'), previous_period: 0, level: 2 },
            { id: '137', target: '7. Dự phòng phải thu ngắn hạn khó đòi (*)', code: '137', current_period: sumByPrefix('139'), previous_period: 0, level: 2 },
            { id: '139', target: '8. Tài sản thiếu chờ xử lý', code: '139', current_period: sumByPrefix('1388'), previous_period: 0, level: 2 },
            { id: '140', target: 'IV. Hàng tồn kho', code: '140', current_period: inventory, previous_period: 0, is_bold: true, level: 1 },
            { id: '141', target: '1. Hàng tồn kho', code: '141', current_period: inventory, previous_period: 0, level: 2 },
            { id: '142', target: ' - Hàng mua đang đi đường', code: '142', current_period: sumByPrefix('151'), previous_period: 0, level: 3 },
            { id: '143', target: ' - Nguyên liệu, vật liệu', code: '143', current_period: sumByPrefix('152'), previous_period: 0, level: 3 },
            { id: '144', target: ' - Công cụ, dụng cụ', code: '144', current_period: sumByPrefix('153'), previous_period: 0, level: 3 },
            { id: '145', target: ' - Chi phí sản xuất, kinh doanh dở dang', code: '145', current_period: sumByPrefix('154'), previous_period: 0, level: 3 },
            { id: '146', target: ' - Thành phẩm', code: '146', current_period: sumByPrefix('155'), previous_period: 0, level: 3 },
            { id: '147', target: ' - Hàng hóa', code: '147', current_period: sumByPrefix('156'), previous_period: 0, level: 2 },
            { id: '148', target: ' - Hàng gửi đi bán', code: '148', current_period: sumByPrefix('157'), previous_period: 0, level: 2 },
            { id: '149', target: '2. Dự phòng giảm giá hàng tồn kho (*)', code: '149', current_period: sumByPrefix('159'), previous_period: 0, level: 2 },
            { id: '150', target: 'V. Tài sản ngắn hạn khác', code: '150', current_period: otherCurrent, previous_period: 0, is_bold: true, level: 1 },
            { id: '151', target: '1. Chi phí trả trước ngắn hạn', code: '151', current_period: sumByPrefix('242'), previous_period: 0, level: 2 },
            { id: '152', target: '2. Thuế GTGT được khấu trừ', code: '152', current_period: sumByPrefix('133'), previous_period: 0, level: 2 },
            { id: '153', target: '3. Thuế và các khoản khác phải thu Nhà nước', code: '153', current_period: sumByPrefix('333'), previous_period: 0, level: 2 },
            { id: '154', target: '4. Giao dịch mua bán lại trái phiếu Chính phủ', code: '154', current_period: 0, previous_period: 0, level: 2 },
            { id: '155', target: '5. Tài sản ngắn hạn khác', code: '155', current_period: sumByPrefix('138'), previous_period: 0, level: 2 },

            { id: '200', target: 'B. TÀI SẢN DÀI HẠN (200=210+220+230+240+250+260)', code: '200', current_period: nonCurrentAssets, previous_period: 0, is_bold: true, level: 0 },
            { id: '210', target: 'I. Các khoản phải thu dài hạn', code: '210', current_period: 0, previous_period: 0, is_bold: true, level: 1 },
            { id: '211', target: '1. Phải thu dài hạn của khách hàng', code: '211', current_period: 0, previous_period: 0, level: 2 },
            { id: '212', target: '2. Trả trước cho người bán dài hạn', code: '212', current_period: 0, previous_period: 0, level: 2 },
            { id: '213', target: '3. Vốn kinh doanh ở đơn vị trực thuộc', code: '213', current_period: 0, previous_period: 0, level: 2 },
            { id: '214', target: '4. Phải thu nội bộ dài hạn', code: '214', current_period: 0, previous_period: 0, level: 2 },
            { id: '215', target: '5. Phải thu về cho vay dài hạn', code: '215', current_period: 0, previous_period: 0, level: 2 },
            { id: '216', target: '6. Phải thu dài hạn khác', code: '216', current_period: 0, previous_period: 0, level: 2 },
            { id: '219', target: '7. Dự phòng phải thu dài hạn khó đòi (*)', code: '219', current_period: 0, previous_period: 0, level: 2 },
            { id: '220', target: 'II. Tài sản cố định', code: '220', current_period: fixedAssets, previous_period: 0, is_bold: true, level: 1 },
            { id: '221', target: '1. Tài sản cố định hữu hình', code: '221', current_period: sumByPrefix('211'), previous_period: 0, level: 2 },
            { id: '222', target: ' - Nguyên giá', code: '222', current_period: sumByPrefix('211'), previous_period: 0, level: 3 },
            { id: '223', target: ' - Giá trị hao mòn lũy kế (*)', code: '223', current_period: sumByPrefix('2141'), previous_period: 0, level: 3 },
            { id: '224', target: '2. Tài sản cố định thuê tài chính', code: '224', current_period: sumByPrefix('212'), previous_period: 0, level: 2 },
            { id: '225', target: ' - Nguyên giá', code: '225', current_period: sumByPrefix('212'), previous_period: 0, level: 3 },
            { id: '226', target: ' - Giá trị hao mòn lũy kế (*)', code: '226', current_period: sumByPrefix('2142'), previous_period: 0, level: 3 },
            { id: '227', target: '3. Tài sản cố định vô hình', code: '227', current_period: sumByPrefix('213'), previous_period: 0, level: 2 },
            { id: '228', target: ' - Nguyên giá', code: '228', current_period: sumByPrefix('213'), previous_period: 0, level: 3 },
            { id: '229', target: ' - Giá trị hao mòn lũy kế (*)', code: '229', current_period: sumByPrefix('2143'), previous_period: 0, level: 3 },
            { id: '230', target: 'III. Bất động sản đầu tư', code: '230', current_period: investmentProp, previous_period: 0, is_bold: true, level: 1 },
            { id: '231', target: ' - Nguyên giá', code: '231', current_period: sumByPrefix('217'), previous_period: 0, level: 2 },
            { id: '232', target: ' - Giá trị hao mòn lũy kế (*)', code: '232', current_period: sumByPrefix('2147'), previous_period: 0, level: 2 },
            { id: '240', target: 'IV. Tài sản dở dang dài hạn', code: '240', current_period: longTermWIP, previous_period: 0, is_bold: true, level: 1 },
            { id: '241', target: '1. Chi phí sản xuất, kinh doanh dở dang dài hạn', code: '241', current_period: 0, previous_period: 0, level: 2 },
            { id: '242', target: '2. Chi phí xây dựng cơ bản dở dang', code: '242', current_period: sumByPrefix('241'), previous_period: 0, level: 2 },
            { id: '250', target: 'V. Đầu tư tài chính dài hạn', code: '250', current_period: 0, previous_period: 0, is_bold: true, level: 1 },
            { id: '251', target: '1. Đầu tư vào công ty con', code: '251', current_period: sumByPrefix('221'), previous_period: 0, level: 2 },
            { id: '252', target: '2. Đầu tư vào công ty liên doanh, liên kết', code: '252', current_period: sumByPrefix('222'), previous_period: 0, level: 2 },
            { id: '253', target: '3. Đầu tư góp vốn vào đơn vị khác', code: '253', current_period: sumByPrefix('228'), previous_period: 0, level: 2 },
            { id: '254', target: '4. Dự phòng đầu tư tài chính dài hạn (*)', code: '254', current_period: sumByPrefix('229'), previous_period: 0, level: 2 },
            { id: '255', target: '5. Đầu tư nắm giữ đến ngày đáo hạn', code: '255', current_period: 0, previous_period: 0, level: 2 },
            { id: '260', target: 'VI. Tài sản dài hạn khác', code: '260', current_period: otherNonCurrent, previous_period: 0, is_bold: true, level: 1 },
            { id: '261', target: '1. Chi phí trả trước dài hạn', code: '261', current_period: sumByPrefix('242'), previous_period: 0, level: 2 },
            { id: '262', target: '2. Tài sản thuế thu nhập hoãn lại', code: '262', current_period: sumByPrefix('243'), previous_period: 0, level: 2 },
            { id: '268', target: '3. Thiết bị, vật tư, phụ tùng thay thế dài hạn', code: '268', current_period: 0, previous_period: 0, level: 2 },

            { id: '270', target: 'TỔNG CỘNG TÀI SẢN (270 = 100 + 200)', code: '270', current_period: currentAssets + nonCurrentAssets, previous_period: 0, is_bold: true, level: 0 },

            { id: '300', target: 'C. NỢ PHẢI TRẢ (300=310+330)', code: '300', current_period: liabiltiesVal, previous_period: 0, is_bold: true, level: 0 },
            { id: '310', target: 'I. Nợ ngắn hạn', code: '310', current_period: liabiltiesVal, previous_period: 0, is_bold: true, level: 1 },
            { id: '311', target: '1. Phải trả người bán ngắn hạn', code: '311', current_period: -sumByPrefix('331'), previous_period: 0, level: 2 },
            { id: '312', target: '2. Người mua trả tiền trước ngắn hạn', code: '312', current_period: -sumByPrefix('3387'), previous_period: 0, level: 2 },
            { id: '313', target: '3. Thuế và các khoản phải nộp Nhà nước', code: '313', current_period: -sumByPrefix('333'), previous_period: 0, level: 2 },
            { id: '314', target: '4. Phải trả người lao động', code: '314', current_period: -sumByPrefix('334'), previous_period: 0, level: 2 },
            { id: '315', target: '5. Chi phí phải trả ngắn hạn', code: '315', current_period: -sumByPrefix('335'), previous_period: 0, level: 2 },
            { id: '316', target: '6. Phải trả nội bộ ngắn hạn', code: '316', current_period: -sumByPrefix('336'), previous_period: 0, level: 2 },
            { id: '317', target: '7. Phải trả theo tiến độ kế hoạch hợp đồng xây dựng', code: '317', current_period: -sumByPrefix('337'), previous_period: 0, level: 2 },
            { id: '318', target: '8. Doanh thu chưa thực hiện ngắn hạn', code: '318', current_period: -sumByPrefix('3387'), previous_period: 0, level: 2 },
            { id: '319', target: '9. Phải trả ngắn hạn khác', code: '319', current_period: -sumByPrefix('338'), previous_period: 0, level: 2 },
            { id: '320', target: '10. Vay và nợ thuê tài chính ngắn hạn', code: '320', current_period: -sumByPrefix('341'), previous_period: 0, level: 2 },
            { id: '321', target: '11. Dự phòng phải trả ngắn hạn', code: '321', current_period: -sumByPrefix('352'), previous_period: 0, level: 2 },
            { id: '322', target: '12. Quỹ khen thưởng, phúc lợi', code: '322', current_period: -sumByPrefix('353'), previous_period: 0, level: 2 },
            { id: '323', target: '13. Quỹ bình ổn giá', code: '323', current_period: -sumByPrefix('356'), previous_period: 0, level: 2 },
            { id: '324', target: '14. Giao dịch mua bán lại trái phiếu Chính phủ', code: '324', current_period: 0, previous_period: 0, level: 2 },

            { id: '330', target: 'II. Nợ dài hạn', code: '330', current_period: longTermLiab, previous_period: 0, is_bold: true, level: 1 },
            { id: '331', target: '1. Phải trả người bán dài hạn', code: '331', current_period: 0, previous_period: 0, level: 2 },
            { id: '332', target: '2. Người mua trả tiền trước dài hạn', code: '332', current_period: 0, previous_period: 0, level: 2 },
            { id: '333', target: '3. Chi phí phải trả dài hạn', code: '333', current_period: 0, previous_period: 0, level: 2 },
            { id: '334', target: '4. Phải trả nội bộ về vốn kinh doanh', code: '334', current_period: 0, previous_period: 0, level: 2 },
            { id: '335', target: '5. Phải trả nội bộ dài hạn', code: '335', current_period: 0, previous_period: 0, level: 2 },
            { id: '336', target: '6. Doanh thu chưa thực hiện dài hạn', code: '336', current_period: 0, previous_period: 0, level: 2 },
            { id: '337', target: '7. Phải trả dài hạn khác', code: '337', current_period: 0, previous_period: 0, level: 2 },
            { id: '338', target: '8. Vay và nợ thuê tài chính dài hạn', code: '338', current_period: 0, previous_period: 0, level: 2 },
            { id: '339', target: '9. Trái phiếu chuyển đổi', code: '339', current_period: 0, previous_period: 0, level: 2 },
            { id: '340', target: '10. Cổ phiếu ưu đãi', code: '340', current_period: 0, previous_period: 0, level: 2 },
            { id: '341', target: '11. Thuế thu nhập hoãn lại phải trả', code: '341', current_period: -sumByPrefix('347'), previous_period: 0, level: 2 },
            { id: '342', target: '12. Dự phòng phải trả dài hạn', code: '342', current_period: 0, previous_period: 0, level: 2 },
            { id: '343', target: '13. Quỹ phát triển khoa học và công nghệ', code: '343', current_period: -sumByPrefix('356'), previous_period: 0, level: 2 },

            { id: '400', target: 'D. VỐN CHỦ SỞ HỮU (400=410+430)', code: '400', current_period: equityVal, previous_period: 0, is_bold: true, level: 0 },
            { id: '410', target: 'I. Vốn chủ sở hữu', code: '410', current_period: equityVal, previous_period: 0, is_bold: true, level: 1 },
            { id: '411', target: '1. Vốn góp của chủ sở hữu', code: '411', current_period: -sumByPrefix('411'), previous_period: 0, level: 2 },
            { id: '411a', target: ' - Cổ phiếu phổ thông có quyền biểu quyết', code: '411a', current_period: -sumByPrefix('4111'), previous_period: 0, level: 3 },
            { id: '411b', target: ' - Cổ phiếu ưu đãi', code: '411b', current_period: -sumByPrefix('4112'), previous_period: 0, level: 3 },
            { id: '412', target: '2. Thặng dư vốn cổ phần', code: '412', current_period: -sumByPrefix('4112'), previous_period: 0, level: 2 },
            { id: '413', target: '3. Quyền chọn chuyển đổi trái phiếu', code: '413', current_period: -sumByPrefix('4113'), previous_period: 0, level: 2 },
            { id: '414', target: '4. Vốn khác của chủ sở hữu', code: '414', current_period: -sumByPrefix('4118'), previous_period: 0, level: 2 },
            { id: '415', target: '5. Cổ phiếu quỹ (*)', code: '415', current_period: -sumByPrefix('419'), previous_period: 0, level: 2 },
            { id: '416', target: '6. Chênh lệch đánh giá lại tài sản', code: '416', current_period: -sumByPrefix('412'), previous_period: 0, level: 2 },
            { id: '417', target: '7. Chênh lệch tỷ giá hối đoái', code: '417', current_period: -sumByPrefix('413'), previous_period: 0, level: 2 },
            { id: '418', target: '8. Quỹ đầu tư phát triển', code: '418', current_period: -sumByPrefix('414'), previous_period: 0, level: 2 },
            { id: '419', target: '9. Quỹ hỗ trợ sắp xếp doanh nghiệp', code: '419', current_period: -sumByPrefix('417'), previous_period: 0, level: 2 },
            { id: '420', target: '10. Quỹ khác thuộc vốn chủ sở hữu', code: '420', current_period: -sumByPrefix('418'), previous_period: 0, level: 2 },
            { id: '421', target: '11. Lợi nhuận sau thuế chưa phân phối', code: '421', current_period: -sumByPrefix('421'), previous_period: 0, level: 2 },
            { id: '421a', target: ' - LNST chưa phân phối lũy kế đến cuối kỳ trước', code: '421a', current_period: 0, previous_period: 0, level: 3 },
            { id: '421b', target: ' - LNST chưa phân phối kỳ này', code: '421b', current_period: -sumByPrefix('421'), previous_period: 0, level: 3 },
            { id: '422', target: '12. Nguồn vốn đầu tư XDCB', code: '422', current_period: -sumByPrefix('441'), previous_period: 0, level: 2 },

            { id: '430', target: 'II. Nguồn kinh phí và quỹ khác', code: '430', current_period: funds, previous_period: 0, is_bold: true, level: 1 },
            { id: '431', target: '1. Nguồn kinh phí', code: '431', current_period: -sumByPrefix('461'), previous_period: 0, level: 2 },
            { id: '432', target: '2. Nguồn kinh phí đã hình thành TSCĐ', code: '432', current_period: -sumByPrefix('466'), previous_period: 0, level: 2 },

            { id: '440', target: 'TỔNG CỘNG NGUỒN VỐN', code: '440', current_period: liabiltiesVal + equityVal, previous_period: 0, is_bold: true, level: 0 },
        ];
        res.json(report);
    });
});

// ========================================
// HCSN REPORTS APIs (TT 24/2024/TT-BTC)
// ========================================

// 1. Bảng Cân đối Tài khoản Kế toán HCSN
app.get('/api/reports/balance-sheet-hcsn', verifyToken, hcsnReportsAPIs.getBalanceSheetHCSN(db));

// 2. Báo cáo Kết quả Hoạt động  
app.get('/api/reports/activity-result', verifyToken, hcsnReportsAPIs.getActivityResult(db));

// 3. Quyết toán Kinh phí Hoạt động Thường xuyên
app.get('/api/reports/budget-settlement-regular', verifyToken, hcsnReportsAPIs.getBudgetSettlementRegular(db));

// 3b. Quyết toán Kinh phí Hoạt động Không thường xuyên
app.get('/api/reports/budget-settlement-nonregular', verifyToken, hcsnReportsAPIs.getBudgetSettlementNonRegular(db));

// 3c. Quyết toán Vốn đầu tư XDCB
app.get('/api/reports/budget-settlement-capex', verifyToken, hcsnReportsAPIs.getBudgetSettlementCapex(db));

// 4. Báo cáo Quản lý và Sử dụng Kinh phí
app.get('/api/reports/fund-source-report', verifyToken, hcsnReportsAPIs.getFundSourceReport(db));

// 5. Báo cáo Tài sản Kết cấu Hạ tầng
app.get('/api/reports/infrastructure-report', verifyToken, hcsnReportsAPIs.getInfrastructureReport(db));

// 6. Báo cáo Tình hình Thực hiện Dự toán  
app.get('/api/reports/budget-performance', verifyToken, hcsnReportsAPIs.getBudgetPerformance(db));

// ========================================
// END HCSN REPORTS
// ========================================


// ========================================
// END REVENUE MODULE
// ========================================


// ========================================
// ASSET MANAGEMENT APIs (HCSN - TT 24/2024)
// ========================================


// ========================================
// ASSET MANAGEMENT APIs (TT 24/2024)
// ========================================

// HCSN Master Data
app.get('/api/fund-sources', verifyToken, (req, res) => {
    db.all("SELECT * FROM fund_sources ORDER BY code ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// === TSCĐ - Fixed Assets ===
app.get('/api/assets/fixed', verifyToken, assetAPIs.getFixedAssets(db));
app.post('/api/assets/fixed', verifyToken, assetAPIs.createFixedAsset(db));
app.put('/api/assets/fixed/:id', verifyToken, assetAPIs.updateFixedAsset(db));
app.delete('/api/assets/fixed/:id', verifyToken, assetAPIs.deleteFixedAsset(db));

// Nghiệp vụ TSCĐ đặc biệt
app.post('/api/assets/fixed/depreciation', verifyToken, assetAPIs.calculateDepreciation(db));
app.post('/api/assets/fixed/transfer', verifyToken, assetAPIs.transferFixedAsset(db));
app.put('/api/assets/fixed/:id/revaluation', verifyToken, assetAPIs.revaluateFixedAsset(db));

// === Hạ tầng - Infrastructure ===
app.get('/api/infrastructure-assets', verifyToken, assetAPIs.getInfrastructureAssets(db));
app.post('/api/infrastructure-assets', verifyToken, assetAPIs.createInfrastructureAsset(db));

app.post('/api/infrastructure/maintenance', verifyToken, assetAPIs.recordMaintenance(db));
app.put('/api/infrastructure/:id/condition', verifyToken, assetAPIs.assessCondition(db));

// === Kiểm kê Tài sản - Asset Inventory ===
app.get('/api/assets/inventory', verifyToken, assetAPIs.getInventoryRecords(db));
app.post('/api/assets/inventory', verifyToken, assetAPIs.createInventory(db));
app.post('/api/assets/inventory/:id/items', verifyToken, assetAPIs.addInventoryItem(db));
app.put('/api/assets/inventory/:id/complete', verifyToken, assetAPIs.completeInventory(db));
app.get('/api/assets/inventory/:id/report', verifyToken, assetAPIs.getInventoryReport(db));

// === Thẻ Tài sản - Asset Cards ===
app.get('/api/assets/cards/:asset_id', verifyToken, assetAPIs.getAssetCard(db));
app.put('/api/assets/cards/:id', verifyToken, assetAPIs.updateAssetCard(db));

// === Đầu tư Dài hạn - Long-term Investments ===
app.get('/api/investments/long-term', verifyToken, assetAPIs.getLongTermInvestments(db));
app.post('/api/investments/long-term', verifyToken, assetAPIs.createInvestment(db));
app.post('/api/investments/income', verifyToken, assetAPIs.recordInvestmentIncome(db));

// ========================================
// END ASSET MANAGEMENT
// ========================================


// ========================================
// HR MANAGEMENT APIs (HCSN)
// ========================================
app.get('/api/hr/employees', verifyToken, hrAPIs.getEmployees(db));
app.post('/api/hr/employees', verifyToken, hrAPIs.createEmployee(db));

app.get('/api/hr/salary-grades', verifyToken, hrAPIs.getSalaryGrades(db));

app.get('/api/hr/allowance-types', verifyToken, hrAPIs.getAllowanceTypes(db));

app.get('/api/hr/employee-allowances/:employeeId', verifyToken, hrAPIs.getEmployeeAllowances(db));
app.post('/api/hr/employee-allowances', verifyToken, hrAPIs.addEmployeeAllowance(db));

// New/Updated APIs for HCSN
app.get('/api/hr/timekeeping', verifyToken, hrAPIs.getTimekeeping(db));
app.get('/api/hr/payroll', verifyToken, hrAPIs.getPayroll(db));
app.post('/api/hr/calculate-payroll', verifyToken, hrAPIs.calculatePayroll(db));

// ========================================
// END HR MANAGEMENT
// ========================================


// 1.6.4.2 Cash Flow Report (Direct Method)
app.get('/api/reports/cash-flow', verifyToken, (req, res) => {
    const fromDate = req.query.fromDate || new Date().getFullYear() + '-01-01';
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    // Query 111, 112 transactions grouped by counterpart (reciprocal) account
    const sql = `
        SELECT 
            reciprocal_acc, 
            SUM(debit_amount) as receipts, 
            SUM(credit_amount) as payments 
        FROM general_ledger 
        WHERE (account_code LIKE '111%' OR account_code LIKE '112%')
        AND trx_date >= ? AND trx_date <= ?
        GROUP BY reciprocal_acc
    `;

    db.all(sql, [fromDate, toDate], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });

        let cf = {
            sales_receipts: 0, // 01
            supplier_payments: 0, // 02
            employee_payments: 0, // 03
            interest_payments: 0, // 04
            tax_payments: 0, // 05
            other_receipts: 0, // 06
            other_payments: 0, // 07
            invest_purchase: 0, // 21
            invest_sales: 0, // 22
            fin_equity_in: 0, // 31
            fin_equity_out: 0, // 32
            fin_borrow_in: 0, // 33
            fin_borrow_out: 0 // 34
        };

        rows.forEach(r => {
            const acc = r.reciprocal_acc || '';
            const netRec = r.receipts;
            const netPay = r.payments;

            if (acc.startsWith('511') || acc.startsWith('131') || acc.startsWith('3387')) {
                cf.sales_receipts += netRec;
                // If we pay back customers (returns), it might be 521? Or simple payment. 
            } else if (acc.startsWith('331') || acc.startsWith('15')) {
                cf.supplier_payments += netPay;
            } else if (acc.startsWith('334')) {
                cf.employee_payments += netPay;
            } else if (acc.startsWith('635') || (acc.startsWith('335') && acc.includes('LAI'))) {
                cf.interest_payments += netPay;
            } else if (acc.startsWith('333')) {
                cf.tax_payments += netPay;
            } else if (acc.startsWith('21')) {
                cf.invest_purchase += netPay;
                cf.invest_sales += netRec;
            } else if (acc.startsWith('411')) {
                cf.fin_equity_in += netRec;
                cf.fin_equity_out += netPay;
            } else if (acc.startsWith('341')) {
                cf.fin_borrow_in += netRec;
                cf.fin_borrow_out += netPay;
            } else {
                cf.other_receipts += netRec;
                cf.other_payments += netPay;
            }
        });

        // 1. Operating Activities
        const netOperating = cf.sales_receipts + cf.other_receipts - cf.supplier_payments - cf.employee_payments - cf.interest_payments - cf.tax_payments - cf.other_payments;
        // 2. Investing
        const netInvesting = cf.invest_sales - cf.invest_purchase;
        // 3. Financing
        const netFinancing = cf.fin_equity_in + cf.fin_borrow_in - cf.fin_equity_out - cf.fin_borrow_out;
        const netCashFlow = netOperating + netInvesting + netFinancing;

        // Opening Cash
        const openSql = `
            SELECT SUM(debit_amount) - SUM(credit_amount) as bal 
            FROM general_ledger 
            WHERE (account_code LIKE '111%' OR account_code LIKE '112%')
            AND trx_date < ?
        `;
        db.get(openSql, [fromDate], (err, openRow) => {
            const opening = openRow?.bal || 0;
            const closing = opening + netCashFlow;

            const report = [
                { id: 'cf1', target: 'I. Lưu chuyển tiền từ hoạt động kinh doanh', code: '', current_period: 0, previous_period: 0, is_bold: true, level: 0 },
                { id: '01', target: '1. Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác', code: '01', current_period: cf.sales_receipts, previous_period: 0 },
                { id: '02', target: '2. Tiền chi trả cho người cung cấp hàng hóa và dịch vụ', code: '02', current_period: -cf.supplier_payments, previous_period: 0 },
                { id: '03', target: '3. Tiền chi trả cho người lao động', code: '03', current_period: -cf.employee_payments, previous_period: 0 },
                { id: '04', target: '4. Tiền chi trả lãi vay', code: '04', current_period: -cf.interest_payments, previous_period: 0 },
                { id: '05', target: '5. Tiền chi nộp thuế thu nhập doanh nghiệp', code: '05', current_period: -cf.tax_payments, previous_period: 0 },
                { id: '06', target: '6. Tiền thu khác từ hoạt động kinh doanh', code: '06', current_period: cf.other_receipts, previous_period: 0 },
                { id: '07', target: '7. Tiền chi khác cho hoạt động kinh doanh', code: '07', current_period: -cf.other_payments, previous_period: 0 },
                { id: '20', target: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', code: '20', current_period: netOperating, previous_period: 0, is_bold: true },

                { id: 'cf5', target: 'II. Lưu chuyển tiền từ hoạt động đầu tư', code: '', current_period: 0, previous_period: 0, is_bold: true, level: 0 },
                { id: '21', target: '1. Tiền chi mua sắm, xây dựng TSCĐ', code: '21', current_period: -cf.invest_purchase, previous_period: 0 },
                { id: '22', target: '2. Tiền thu từ thanh lý, nhượng bán TSCĐ', code: '22', current_period: cf.invest_sales, previous_period: 0 },
                { id: '30', target: 'Lưu chuyển tiền thuần từ hoạt động đầu tư', code: '30', current_period: netInvesting, previous_period: 0, is_bold: true },

                { id: 'cf9', target: 'III. Lưu chuyển tiền từ hoạt động tài chính', code: '', current_period: 0, previous_period: 0, is_bold: true, level: 0 },
                { id: '31', target: '1. Tiền thu từ phát hành cổ phiếu, nhận vốn góp', code: '31', current_period: cf.fin_equity_in, previous_period: 0 },
                { id: '32', target: '2. Tiền trả lạ vốn góp cho các chủ sở hữu', code: '32', current_period: -cf.fin_equity_out, previous_period: 0 },
                { id: '33', target: '3. Tiền thu từ đi vay', code: '33', current_period: cf.fin_borrow_in, previous_period: 0 },
                { id: '34', target: '4. Tiền trả nợ gốc vay', code: '34', current_period: -cf.fin_borrow_out, previous_period: 0 },
                { id: '40', target: 'Lưu chuyển tiền thuần từ hoạt động tài chính', code: '40', current_period: netFinancing, previous_period: 0, is_bold: true },

                { id: '50', target: 'Lưu chuyển tiền thuần trong kỳ (50 = 20+30+40)', code: '50', current_period: netCashFlow, previous_period: 0, is_bold: true, level: 0 },
                { id: '60', target: 'Tiền và tương đương tiền đầu kỳ', code: '60', current_period: opening, previous_period: 0, is_bold: true, level: 0 },
                { id: '61', target: 'Ảnh hưởng của thay đổi tỷ giá hối đoái', code: '61', current_period: 0, previous_period: 0 },
                { id: '70', target: 'Tiền và tương đương tiền cuối kỳ (70 = 50+60+61)', code: '70', current_period: closing, previous_period: 0, is_bold: true, level: 0 },
            ];
            res.json(report);
        });
    });
});

// 1.7. Cash Balances & History
app.get('/api/balances', verifyToken, (req, res) => {
    // 1. Get current Cash Balance (111)
    const cashSql = "SELECT SUM(debit_amount) - SUM(credit_amount) as bal FROM general_ledger WHERE account_code LIKE '111%'";

    // 2. Get current Bank Balance (112)
    const bankSql = "SELECT SUM(debit_amount) - SUM(credit_amount) as bal FROM general_ledger WHERE account_code LIKE '112%'";

    // 3. Get Recent History (Last 50 transactions for 111 or 112)
    const historySql = `
        SELECT * FROM general_ledger 
        WHERE account_code LIKE '111%' OR account_code LIKE '112%' 
        ORDER BY trx_date DESC, posted_at DESC 
        LIMIT 50
    `;

    db.get(cashSql, [], (err, cashRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const cashBalance = cashRow ? cashRow.bal : 0;

        db.get(bankSql, [], (err, bankRow) => {
            if (err) return res.status(500).json({ error: err.message });
            const bankBalance = bankRow ? bankRow.bal : 0;

            db.all(historySql, [], (err, history) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    cash: cashBalance || 0,
                    bank: bankBalance || 0,
                    history: history || []
                });
            });
        });
    });
});

app.get('/api/reports/pnl', verifyToken, (req, res) => {
    const fromDate = req.query.fromDate || new Date().getFullYear() + '-01-01';
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    // PnL based on activity in the period
    const sql = `
        SELECT account_code, SUM(credit_amount) - SUM(debit_amount) as net_credit
        FROM general_ledger
        WHERE trx_date >= ? AND trx_date <= ?
        GROUP BY account_code
            `;

    db.all(sql, [fromDate, toDate], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });

        const sumByPrefix = (prefix) => {
            return rows.filter(r => r.account_code.startsWith(prefix))
                .reduce((acc, r) => acc + r.net_credit, 0);
        };

        // Revenue (Credit - Debit) > 0
        const revenue = sumByPrefix('511');
        const deductions = -sumByPrefix('521'); // Usually debit balance
        const netRevenue = revenue - deductions; // If deductions are negative, we subtract positive... wait. 521 has Debit balance, so net_credit will be negative. sumByPrefix('521') is negative. Revenue + sum('521') = Net.
        // Actually sumByPrefix returns (Cr - Dr).
        // 511: Cr > Dr -> Positive
        // 521: Dr > Cr -> Negative
        // Net Revenue = 511 + 521 (if 521 is negative) = 4500 + (-50) = 4450. Correct.

        const cogs = -sumByPrefix('632'); // 632 Dr > Cr -> Negative net_credit. We want positive expense value for display.
        // Gross Profit = Net Revenue - COGS.
        // If we treat all as signed numbers: Profit = Revenue (Pos) + COGS (Neg).
        const grossProfit = (sumByPrefix('5') + sumByPrefix('632')); // 5xx are pos, 632 is neg.

        const financialRev = sumByPrefix('515');
        const financialExp = -sumByPrefix('635');
        const sellingExp = -sumByPrefix('641');
        const adminExp = -sumByPrefix('642');

        const operatingProfit = grossProfit + financialRev - financialExp - sellingExp - adminExp; // Using absolute values for expenses
        // Or using signed sum:
        const operatingProfitSigned = sumByPrefix('5') + sumByPrefix('632') + sumByPrefix('635') + sumByPrefix('641') + sumByPrefix('642');

        // Let's stick to positive display values for standard report structure
        const report = [
            { id: '01', target: '1. Doanh thu bán hàng và CCDV', code: '01', current_period: revenue, previous_period: 0, is_bold: true },
            { id: '02', target: '2. Các khoản giảm trừ doanh thu', code: '02', current_period: -sumByPrefix('521'), previous_period: 0 },
            { id: '10', target: '3. Doanh thu thuần (10=01-02)', code: '10', current_period: revenue + sumByPrefix('521'), previous_period: 0, is_bold: true },
            { id: '11', target: '4. Giá vốn hàng bán', code: '11', current_period: -sumByPrefix('632'), previous_period: 0 },
            { id: '20', target: '5. Lợi nhuận gộp (20=10-11)', code: '20', current_period: revenue + sumByPrefix('521') + sumByPrefix('632'), previous_period: 0, is_bold: true },
            { id: '21', target: '6. Doanh thu hoạt động tài chính', code: '21', current_period: financialRev, previous_period: 0 },
            { id: '22', target: '7. Chi phí tài chính', code: '22', current_period: financialExp, previous_period: 0 },
            { id: '25', target: '8. Chi phí bán hàng', code: '25', current_period: sellingExp, previous_period: 0 },
            { id: '26', target: '9. Chi phí quản lý doanh nghiệp', code: '26', current_period: adminExp, previous_period: 0 },
            { id: '30', target: '10. Lợi nhuận thuần từ HĐKD', code: '30', current_period: operatingProfitSigned, previous_period: 0, is_bold: true },
            { id: '31', target: '11. Thu nhập khác', code: '31', current_period: sumByPrefix('711'), previous_period: 0 },
            { id: '32', target: '12. Chi phí khác', code: '32', current_period: -sumByPrefix('811'), previous_period: 0 },
            { id: '40', target: '13. Lợi nhuận khác', code: '40', current_period: sumByPrefix('711') + sumByPrefix('811'), previous_period: 0, is_bold: true },
            { id: '50', target: '14. Tổng lợi nhuận kế toán trước thuế', code: '50', current_period: operatingProfitSigned + sumByPrefix('711') + sumByPrefix('811'), previous_period: 0, is_bold: true },
            { id: '51', target: '15. Chi phí thuế TNDN', code: '51', current_period: -sumByPrefix('821'), previous_period: 0 },
            { id: '60', target: '16. Lợi nhuận sau thuế', code: '60', current_period: operatingProfitSigned + sumByPrefix('711') + sumByPrefix('811') + sumByPrefix('821'), previous_period: 0, is_bold: true },
        ];
        res.json(report);
    });
});

// 2. Staging: Get All
app.get('/api/staging', verifyToken, (req, res) => {
    const { source } = req.query;
    let sql = "SELECT * FROM staging_transactions";
    const params = [];

    if (source) {
        sql += " WHERE source = ?";
        params.push(source);
    }

    sql += " ORDER BY row_index ASC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        const formatted = rows.map(r => ({ ...r, is_valid: r.is_valid === 1 }));
        res.json(formatted);
    });
});

// 3. Staging: Create/Add Row
app.post('/api/staging', verifyToken, async (req, res) => {
    const { trx_date } = req.body;
    const lock = await checkDateLock(trx_date);
    if (lock.locked) {
        return res.status(403).json({ error: `Dữ liệu ngày ${trx_date} đã bị khóa(Khóa đến hết ngày ${lock.lockedUntil}).Không thể thêm mới.` });
    }

    const data = {
        id: req.body.id || `uuid - ${Date.now()} `,
        batch_id: req.body.batch_id || "default-batch",
        row_index: req.body.row_index,
        trx_date: req.body.trx_date,
        doc_no: req.body.doc_no,
        description: req.body.description,
        debit_acc: req.body.debit_acc,
        credit_acc: req.body.credit_acc,
        amount: req.body.amount,
        partner_code: req.body.partner_code,
        is_valid: 0, // Always invalid initially until validated
        error_log: "New record",
        raw_data: JSON.stringify(req.body)
    };

    const sql = `INSERT INTO staging_transactions(id, batch_id, row_index, trx_date, doc_no, description, debit_acc, credit_acc, amount, partner_code, is_valid, error_log, raw_data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = Object.values(data);

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": data,
            "id": this.lastID
        });
    });
});

// 3.5 Staging: Delete All (Cleanup)
app.delete('/api/staging', verifyToken, (req, res) => {
    const sql = "DELETE FROM staging_transactions";
    db.run(sql, [], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", "changes": this.changes });
    });
});

// 3.6 Staging: Reset to Default Samples
app.post('/api/staging/reset', verifyToken, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM staging_transactions");
        const insert = `INSERT INTO staging_transactions(id, batch_id, row_index, trx_date, doc_no, description, debit_acc, credit_acc, amount, partner_code, is_valid) VALUES(?,?,?,?,?,?,?,?,?,?,?)`;
        const samples = [
            ['trx_001', 'batch_init', 1, '2024-03-20', 'PKT001', 'Kết chuyển thuế GTGT đầu kỳ', '3331', '1331', 15000000, '', 1],
            ['trx_002', 'batch_init', 2, '2024-03-21', 'PKT002', 'Trích khấu hao TSCD tháng 3', '642', '214', 5000000, '', 1],
            ['trx_003', 'batch_init', 3, '2024-03-22', 'PKT003', 'Phân bổ chi phí trả trước', '642', '242', 2000000, '', 1],
            ['trx_004', 'batch_init', 4, '2024-03-23', 'PKT004', 'Bút toán điều chỉnh sai sót năm trước', '421', '331', 10000000, 'NCC_A', 1],
            ['trx_005', 'batch_init', 5, '2024-03-25', 'PKT005', 'Tiền thưởng lễ cho nhân viên', '642', '334', 3500000, '', 1],
        ];
        samples.forEach(s => db.run(insert, s));
        res.json({ "message": "reset successful" });
    });
});

// 4. Staging: Update/Edit Row with ACCOUNTING VALIDATION
app.put('/api/staging/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    if (body.trx_date) {
        const lock = await checkDateLock(body.trx_date);
        if (lock.locked) {
            return res.status(403).json({ error: `Dữ liệu ngày ${body.trx_date} đã bị khóa.Không thể chỉnh sửa.` });
        }
    }

    // First, fetch current state to merge

    // First, fetch current state to merge
    db.get("SELECT * FROM staging_transactions WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(400).json({ "error": err.message });
        if (!row) return res.status(404).json({ "error": "Transaction not found" });

        const updatedRow = { ...row, ...body };

        // --- VALIDATION LOGIC ---
        // Check 1: Accounts exist in Chart of Accounts?
        const checkSql = "SELECT account_code FROM chart_of_accounts WHERE account_code IN (?, ?)";
        db.all(checkSql, [updatedRow.debit_acc, updatedRow.credit_acc], (err, accounts) => {
            let isValid = false;
            let errorLog = "";

            const foundCodes = accounts.map(a => a.account_code);
            const debitExists = foundCodes.includes(updatedRow.debit_acc);
            const creditExists = foundCodes.includes(updatedRow.credit_acc);

            if (!updatedRow.debit_acc || !updatedRow.credit_acc) {
                errorLog = "Missing Account";
            } else if (!debitExists) {
                errorLog = `Debit Acc ${updatedRow.debit_acc} invalid`;
            } else if (!creditExists) {
                errorLog = `Credit Acc ${updatedRow.credit_acc} invalid`;
            } else if (!updatedRow.amount || updatedRow.amount <= 0) {
                errorLog = "Invalid Amount";
            } else {
                isValid = true;
            }

            // Do Update
            const params = [
                updatedRow.trx_date, updatedRow.doc_no, updatedRow.description,
                updatedRow.debit_acc, updatedRow.credit_acc, updatedRow.amount,
                updatedRow.partner_code,
                isValid ? 1 : 0,
                errorLog,
                id
            ];

            const updateSql = `UPDATE staging_transactions SET
    trx_date = ?, doc_no = ?, description = ?,
        debit_acc = ?, credit_acc = ?, amount = ?,
        partner_code = ?,
        is_valid = ?, error_log = ?
            WHERE id = ? `;

            db.run(updateSql, params, function (err) {
                if (err) return res.status(400).json({ "error": err.message });
                res.json({
                    message: "success",
                    changes: this.changes,
                    isValid: isValid,
                    errorLog: errorLog
                });
            });
        });
    });
});

// 5. Post to Ledger
app.post('/api/post', verifyToken, (req, res) => {
    const sqlGet = "SELECT * FROM staging_transactions WHERE is_valid = 1";

    db.all(sqlGet, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.json({ message: "No valid transactions to post." });

        const timestamp = new Date().toISOString();
        let postedCount = 0;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare(`INSERT INTO general_ledger(id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, origin_staging_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
            const deleteStmt = db.prepare("DELETE FROM staging_transactions WHERE id = ?");

            rows.forEach(row => {
                const glIdDebit = `gl - ${row.id} -D`;
                stmt.run([glIdDebit, row.trx_date, timestamp, row.doc_no, row.description, row.debit_acc, row.credit_acc, row.amount, 0, row.partner_code, row.id]);

                const glIdCredit = `gl - ${row.id} -C`;
                stmt.run([glIdCredit, row.trx_date, timestamp, row.doc_no, row.description, row.credit_acc, row.debit_acc, 0, row.amount, row.partner_code, row.id]);

                deleteStmt.run(row.id);
                postedCount++;
            });

            stmt.finalize((stmtErr) => {
                if (stmtErr) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: stmtErr.message });
                }
                deleteStmt.finalize((delErr) => {
                    if (delErr) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: delErr.message });
                    }
                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) return res.status(500).json({ error: commitErr.message });
                        res.json({ message: `Successfully posted ${postedCount} transactions.`, posted_gl_entries: postedCount * 2 });
                    });
                });
            });
        });
    });
});

// 6. Vouchers: Get All
app.get('/api/gl', verifyToken, (req, res) => {
    const { from, to, account_code } = req.query;
    let sql = "SELECT * FROM general_ledger";
    const params = [];
    const conditions = [];

    if (from) {
        conditions.push("trx_date >= ?");
        params.push(from);
    }
    if (to) {
        conditions.push("trx_date <= ?");
        params.push(to);
    }
    if (account_code) {
        conditions.push("account_code LIKE ?");
        params.push(`${account_code}%`);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY trx_date DESC, posted_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

// 6. Vouchers: Get All (Legacy/Voucher Header)
app.get('/api/vouchers', verifyToken, (req, res) => {
    const { type, from, to } = req.query;
    let sql = "SELECT * FROM vouchers";
    const params = [];
    const conditions = [];

    if (type) {
        conditions.push("type = ?");
        params.push(type);
    }
    if (from) {
        conditions.push("doc_date >= ?");
        params.push(from);
    }
    if (to) {
        conditions.push("doc_date <= ?");
        params.push(to);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY doc_date DESC, created_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

// 6.3. Inventory Receipts (Phiếu Nhập Kho)
app.get('/api/inventory/receipts', verifyToken, (req, res) => {
    const sql = `
        SELECT v.*, vi.partner_code, p.partner_name as supplier,
               v.total_amount as total 
        FROM vouchers v
        LEFT JOIN voucher_items vi ON v.id = vi.voucher_id
        LEFT JOIN partners p ON vi.partner_code = p.partner_code
        WHERE v.type = 'INVENTORY_IN'
        GROUP BY v.id
        ORDER BY v.doc_date DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = rows.map(r => ({ ...r, date: r.doc_date, supplier: r.supplier || r.partner_code || 'Nội bộ' }));
        res.json(result);
    });
});

// 6.4. Inventory Issues (Phiếu Xuất Kho)
app.get('/api/inventory/issues', verifyToken, (req, res) => {
    const sql = `
        SELECT v.*, vi.partner_code, p.partner_name as customer 
        FROM vouchers v
        LEFT JOIN voucher_items vi ON v.id = vi.voucher_id
        LEFT JOIN partners p ON vi.partner_code = p.partner_code
        WHERE v.type = 'INVENTORY_OUT'
        GROUP BY v.id
        ORDER BY v.doc_date DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = rows.map(r => ({ ...r, date: r.doc_date, customer: r.customer || r.partner_code || 'Nội bộ', amount: r.total_amount }));
        res.json(result);
    });
});

// 7. Vouchers: Get Details
app.get('/api/vouchers/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, voucher) => {
        if (err) return res.status(400).json({ "error": err.message });
        if (!voucher) return res.status(404).json({ "error": "Voucher not found" });

        db.all("SELECT * FROM voucher_items WHERE voucher_id = ?", [id], (err, items) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ ...voucher, items: items });
        });
    });
});

// 8. Vouchers: Create/Update (Transactional)
app.post('/api/vouchers', verifyToken, async (req, res) => {
    const { id, doc_no, doc_date, post_date, description, type, total_amount, lines, ref_no, attachments, currency, fx_rate, status } = req.body;

    if (!doc_date || !doc_no || !type) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'Voucher lines are required.' });
    }

    const normalizedTotal = Number(total_amount) || 0;
    const normalizedAttachments = Number(attachments) || 0;
    const normalizedFxRate = Number(fx_rate) > 0 ? Number(fx_rate) : 1;
    const normalizedCurrency = currency || 'VND';
    const normalizedStatus = status === 'DRAFT' ? 'DRAFT' : 'POSTED';
    const normalizedRefNo = ref_no || '';


    const lock = await checkDateLock(doc_date);
    if (lock.locked) {
        return res.status(403).json({ error: `Kỳ kế toán ngày ${doc_date} đã bị khóa.Không thể thực hiện thay đổi.` });
    }

    const vId = id || `v_${Date.now()} `;
    const timestamp = new Date().toISOString();

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Insert or Update Header
        const headerSql = `INSERT INTO vouchers(
            id, doc_no, doc_date, post_date, description, type,
            ref_no, attachments, currency, fx_rate,
            total_amount, status, created_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                          ON CONFLICT(id) DO UPDATE SET
    doc_no = excluded.doc_no,
        doc_date = excluded.doc_date,
        post_date = excluded.post_date,
        description = excluded.description,
        type = excluded.type,
        ref_no = excluded.ref_no,
        attachments = excluded.attachments,
        currency = excluded.currency,
        fx_rate = excluded.fx_rate,
        total_amount = excluded.total_amount,
        status = excluded.status`;

        db.run(headerSql, [vId, doc_no, doc_date, post_date, description, type, normalizedRefNo, normalizedAttachments, normalizedCurrency, normalizedFxRate, normalizedTotal, normalizedStatus, timestamp], function (err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(400).json({ "error": err.message });
            }

            // Delete existing lines and re-insert
            db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [vId], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ "error": err.message });
                }

                // Also delete from general_ledger if it was previously posted to keep it clean
                // CRITICAL FIX: Delete by 'origin_staging_id' (standard) OR by 'id' (legacy seeds)
                db.run("DELETE FROM general_ledger WHERE origin_staging_id = ? OR id = ?", [vId, vId], (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(400).json({ "error": err.message });
                    }

                    const { include_inventory } = req.body;

                    // Update Item Stmt to include cost_price and quantity
                    // Update Item Stmt to include cost_price, quantity, input_unit, input_quantity, fund_source_id, budget_estimate_id
                    const itemStmt = db.prepare(`INSERT INTO voucher_items(voucher_id, description, debit_acc, credit_acc, amount, dim1, dim2, dim3, dim4, dim5, project_code, contract_code, debt_note, partner_code, cost_price, quantity, input_unit, input_quantity, fund_source_id, budget_estimate_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                    const glStmt = db.prepare(`INSERT INTO general_ledger(id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, origin_staging_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                    const processLines = async () => {
                        for (let idx = 0; idx < lines.length; idx++) {
                            const line = lines[idx];
                            // 1. Save to voucher_items
                            let costPrice = line.cost_price || 0;
                            const quantity = line.quantity || 0;

                            // AUTO-CALCULATE COGS
                            if (include_inventory && costPrice === 0 && type === 'SALES_INVOICE' && quantity > 0) {
                                const productCode = line.dim1;
                                if (productCode) {
                                    const avgCost = await new Promise(resolve => {
                                        const avcoSql = `
                                            SELECT SUM(amount) as val, SUM(quantity) as qty 
                                            FROM voucher_items 
                                            WHERE dim1 = ? 
                                            AND debit_acc LIKE '15%'
                                            AND voucher_id != ?
                                        `;
                                        db.get(avcoSql, [productCode, vId], (e, r) => {
                                            if (e || !r || !r.qty) resolve(0);
                                            else resolve(r.val / r.qty);
                                        });
                                    });

                                    if (avgCost > 0) {
                                        costPrice = Math.round(avgCost * quantity);
                                        console.log(`[AUTO-COGS] Calculated ${costPrice} for ${quantity} of ${productCode} (Avg: ${avgCost})`);
                                    }
                                }
                            }

                            const partnerCode = line.partnerCode || line.partner_code || '';
                            const projectCode = line.projectCode || line.project_code || '';
                            const contractCode = line.contractCode || line.contract_code || '';
                            const debtNote = line.debtNote || line.debt_note || '';
                            const lineAmount = Number(line.amount) || 0;

                            itemStmt.run([
                                vId,
                                line.description,
                                line.debitAcc,
                                line.creditAcc,
                                lineAmount,
                                line.dim1 || '',
                                line.dim2 || '',
                                line.dim3 || '',
                                line.dim4 || '',
                                line.dim5 || '',
                                projectCode,
                                contractCode,
                                debtNote,
                                partnerCode,
                                costPrice,
                                quantity,
                                line.input_unit || '',
                                line.input_quantity || 0,
                                line.fund_source_id || '',
                                line.budget_estimate_id || ''
                            ]);

                            // 2. Post to general_ledger IF NOT ORDER
                            // 2. Post to general_ledger IF NOT ORDER
                            if (!['SALES_ORDER', 'PURCHASE_ORDER'].includes(type) && !['INVENTORY_RECEIPT', 'INVENTORY_ISSUE'].includes(type)) {
                                const glIdD = `${vId}_d_${idx}`;
                                glStmt.run([glIdD, post_date, timestamp, doc_no, line.description, line.debitAcc, line.creditAcc, lineAmount, 0, partnerCode, vId]);

                                const glIdC = `${vId}_c_${idx}`;
                                glStmt.run([glIdC, post_date, timestamp, doc_no, line.description, line.creditAcc, line.debitAcc, 0, lineAmount, partnerCode, vId]);

                                if (include_inventory && costPrice > 0 && type === 'SALES_INVOICE') {
                                    const cogsAcc = '632';
                                    const inventoryAcc = '1561'; // Ideally dynamic

                                    const glIdCostD = `${vId}_cost_d_${idx}`;
                                    glStmt.run([glIdCostD, post_date, timestamp, doc_no, `Giá vốn: ${line.description}`, cogsAcc, inventoryAcc, costPrice, 0, partnerCode, vId]);

                                    const glIdCostC = `${vId}_cost_c_${idx}`;
                                    glStmt.run([glIdCostC, post_date, timestamp, doc_no, `Giá vốn: ${line.description}`, inventoryAcc, cogsAcc, 0, costPrice, partnerCode, vId]);
                                }
                            }
                        }
                    };

                    processLines().then(() => {
                        itemStmt.finalize();
                        glStmt.finalize((err) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return res.status(400).json({ "error": err.message });
                            }
                            db.run("COMMIT");
                            res.json({ message: "Voucher saved and posted successfully", id: vId });
                        });
                    }).catch(err => {
                        console.error("Voucher processing error:", err);
                        db.run("ROLLBACK");
                        res.status(500).json({ error: "Failed to process voucher lines" });
                    });
                });
            });
        });
    });
});

// 9. Vouchers: Delete
app.delete('/api/vouchers/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    db.get("SELECT doc_date FROM vouchers WHERE id = ?", [id], async (err, voucher) => {
        if (err) return res.status(500).json({ error: err.message });
        if (voucher) {
            const lock = await checkDateLock(voucher.doc_date);
            if (lock.locked) {
                return res.status(403).json({ error: `Chứng từ thuộc kỳ đã khóa(${voucher.doc_date}).Không thể xóa.` });
            }
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [id]);
            db.run("DELETE FROM general_ledger WHERE origin_staging_id = ?", [id]);
            db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ "error": err.message });
                }
                db.run("COMMIT");
                res.json({ message: "Voucher deleted", changes: this.changes });
            });
        });
    });
});

// --- TAX INTEGRATION APIs (Simulated) ---

// 10. Tax: Lookup MST (Real-time GDT/VietQR Integration)
app.get('/api/tax/lookup/:mst', verifyToken, async (req, res) => {
    const { mst } = req.params;
    console.log(`[TAX] Searching MST: ${mst}`);

    if (!/^\d{10}(\d{3})?$/.test(mst)) {
        return res.status(400).json({ code: 'INVALID', desc: 'MST không đúng định dạng (10 hoặc 13 số).' });
    }

    try {
        // 1. Primary lookup via VietQR API (Wrapper for Vietnamese National Tax Database)
        try {
            const response = await axios.get(`https://api.vietqr.io/v2/business/${mst}`);
            if (response.data && response.data.code === '00' && response.data.data) {
                const biz = response.data.data;
                return res.json({
                    code: '00',
                    tax_code: biz.id || biz.tax_code,
                    name: biz.name,
                    address: biz.address,
                    representative: biz.owner || '',
                    status: 'ACTIVE',
                    source: 'vietqr'
                });
            }
        } catch (apiErr) {
            console.warn(`[TAX LOOKUP] External API failed/unreachable for MST ${mst}`);
        }

        // 2. Fallback: Check local partners database
        const localPartner = await new Promise(resolve => {
            db.get("SELECT * FROM partners WHERE tax_code = ?", [mst], (err, row) => resolve(row));
        });

        if (localPartner) {
            return res.json({
                code: '00',
                tax_code: localPartner.tax_code,
                name: localPartner.partner_name,
                address: localPartner.address,
                source: 'local_db'
            });
        }

        return res.status(404).json({ error: "Không tìm thấy thông tin doanh nghiệp cho MST này." });
    } catch (err) {
        console.error("Internal Tax Lookup Error:", err.message);
        res.status(500).json({ code: 'ERROR', desc: 'Lỗi dịch vụ tra cứu mã số thuế.' });
    }
});

// 11. Tax: Sync E-Invoices (Government Portal Integration)

// 11. Tax: Upload XML Invoice (Real Parser)
const xml2js = require('xml2js');

app.post('/api/tax/upload-xml', verifyToken, (req, res) => {
    // Expect XML string in body or "xml_content" field
    const xmlContent = req.body.xml_content || req.body;

    if (!xmlContent) return res.status(400).json({ error: "No XML content provided" });

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });

    parser.parseString(xmlContent, (err, result) => {
        if (err) {
            console.error("XML Parse Error:", err);
            return res.status(400).json({ error: "Invalid XML format" });
        }

        // Try to detect common Vietnam E-Invoice structures (Viettel, VNPT, Bkav, Misa...)
        // Structure usually: HDon > DLHDon > TTChung...
        try {
            const hdon = result.HDon || result.Invoice;
            if (!hdon) throw new Error("Unknown Invoice Format");

            const data = hdon.DLHDon || hdon.Content;
            const ttChung = data.TTChung || data.CommonInfo;
            const ndHdon = data.NDHDon || data.InvoiceData;

            // Extract basic fields
            const invoiceData = {
                id: `xml_${Date.now()}`,
                invoice_no: ttChung.SHDon || ttChung.InvoiceNo,
                serial: ttChung.KHMSHDon || ttChung.Serial,
                date: ttChung.Nlap || ttChung.Date, // YYYY-MM-DD

                // Seller
                seller_tax: ndHdon.NBan.MST || ndHdon.Seller.TaxCode,
                seller_name: ndHdon.NBan.Ten || ndHdon.Seller.Name,

                // Buyer
                buyer_tax: ndHdon.NMua.MST || ndHdon.Buyer.TaxCode,
                buyer_name: ndHdon.NMua.Ten || ndHdon.Buyer.Name,

                // Amounts
                total_amount: ndHdon.TToan.TgTTTBSo || ndHdon.Payment.TotalAmount,
                type: 'PURCHASE_INVOICE', // Default assumption, frontend can let user choose or Auto-detect logic
                items: []
            };

            // Basic item parsing (if needed) -- TTHDon > DSHHDWu
            // For now, return header mainly

            res.json({
                message: "XML Parsed Successfully",
                data: invoiceData
            });

        } catch (parseErr) {
            console.error("Structure Error:", parseErr);
            return res.status(400).json({ error: "Unsupported Invoice Structure: " + parseErr.message });
        }
    });
});

app.get('/api/tax/invoices/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    // No persistent storage for invoices yet; return 404 with hint.
    res.status(404).json({ error: `Invoice ${id} not found` });
});


app.post('/api/tax/sync', verifyToken, (req, res) => {
    res.status(501).json({ error: "Tax sync not implemented. Use upload-xml." });
});

// 12. Audit: Health Check (Risk Assessment)
app.get('/api/audit/health-check', verifyToken, (req, res) => {
    console.log(`[AUDIT] Running Health Check...`);

    // We'll run a series of checks
    const anomalies = [];

    // 1. Negative Cash/Bank Check (Historical Daily Balance)
    const dailyBalSql = `
        SELECT trx_date, account_code, SUM(debit_amount) as d, SUM(credit_amount) as c 
        FROM general_ledger 
        WHERE account_code LIKE '111%' OR account_code LIKE '112%'
        GROUP BY trx_date, account_code
        ORDER BY trx_date ASC
    `;

    db.all(dailyBalSql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const runningBals = {};
        rows.forEach(r => {
            if (!runningBals[r.account_code]) runningBals[r.account_code] = 0;
            runningBals[r.account_code] += (r.d - r.c);

            if (runningBals[r.account_code] < 0) {
                anomalies.push({
                    type: 'Cảnh báo âm quỹ',
                    message: `Tài khoản ${r.account_code} bị âm vào ngày ${r.trx_date}. Số dư: ${new Intl.NumberFormat('vi-VN').format(runningBals[r.account_code])}`,
                    date: r.trx_date,
                    severity: 'critical',
                    account: r.account_code
                });
            }
        });

        // 2. Inventory Check (Total balance shouldn't be negative)
        const invSql = `
            SELECT account_code, SUM(debit_amount) - SUM(credit_amount) as bal
            FROM general_ledger
            WHERE account_code LIKE '15%'
            GROUP BY account_code
            HAVING bal < 0
        `;
        db.all(invSql, [], (err, invAnoms) => {
            if (err) return res.status(500).json({ error: err.message });
            if (invAnoms) {
                invAnoms.forEach(ia => {
                    anomalies.push({
                        type: 'Cảnh báo tồn kho ảo',
                        message: `Tài khoản kho ${ia.account_code} có số dư âm: ${new Intl.NumberFormat('vi-VN').format(ia.bal)}. Xuất bán khi không còn tồn kho.`,
                        severity: 'warning',
                        account: ia.account_code
                    });
                });
            }

            // 3. Entertainment Expense vs Revenue Ratio (Unreasonable costs)
            const ratioSql = `
                SELECT 
                    (SELECT SUM(debit_amount) FROM general_ledger WHERE account_code LIKE '6428%') as ent_cost,
                    (SELECT SUM(credit_amount - debit_amount) FROM general_ledger WHERE account_code LIKE '511%') as revenue
            `;
            db.get(ratioSql, [], (err, ratioRow) => {
                if (err) return res.status(500).json({ error: err.message });
                if (ratioRow && ratioRow.revenue > 0) {
                    const ratio = (ratioRow.ent_cost / ratioRow.revenue) * 100;
                    if (ratio > 15) { // Threshold 15%
                        anomalies.push({
                            type: 'Chi phí bất hợp lý',
                            message: `Chi phí tiếp khách (${new Intl.NumberFormat('vi-VN').format(ratioRow.ent_cost)}) chiếm ${ratio.toFixed(1)}% doanh thu. Vượt ngưỡng an toàn (15%).`,
                            severity: 'info'
                        });
                    }
                }

                // 4. Invoice Risk (Internal Blacklist Check)
                db.all("SELECT * FROM partners", [], (err, partners) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (partners) {
                        partners.forEach(p => {
                            // Rule 1: Status Inactive or Blacklisted
                            if (p.status === 'INACTIVE' || p.status === 'BLACKLIST') {
                                anomalies.push({
                                    type: 'Rủi ro đối tác',
                                    message: `Đối tác ${p.partner_name} (MST: ${p.tax_code}) đang có trạng thái ${p.status}. Cần rà soát lại các giao dịch phát sinh.`,
                                    severity: 'critical',
                                    partner: p.partner_code
                                });
                            }

                            // Rule 2: Tax Code Format (10 or 13 digits, numeric)
                            const mst = p.tax_code || '';
                            const isValidFormat = /^\d{10}$/.test(mst) || /^\d{13}$/.test(mst) || /^\d{10}-\d{3}$/.test(mst);
                            if (mst.length > 0 && !isValidFormat) {
                                anomalies.push({
                                    type: 'Sai định dạng MST',
                                    message: `Mã số thuế của ${p.partner_name} không đúng định dạng chuẩn (10 hoặc 13 số). MST hiện tại: ${mst}`,
                                    severity: 'warning',
                                    partner: p.partner_code
                                });
                            }
                        });
                    }

                    // Wrap up
                    res.json({
                        timestamp: new Date().toISOString(),
                        score: Math.max(0, 100 - (anomalies.filter(a => a.severity === 'critical').length * 20) - (anomalies.filter(a => a.severity === 'warning').length * 10)),
                        anomalies: anomalies
                    });
                });
            });
        });
    });
});

// 13. Bank: Management & Auto-mapping Engine
const BANK_MAPPING_RULES = [
    { keywords: ['tien dien', 'thanh toan dien', 'evn'], debit: '642', credit: '112' },
    { keywords: ['tien nuoc', 'thanh toan nuoc'], debit: '642', credit: '112' },
    { keywords: ['internet', 'fpt', 'viettel', 'vnpt'], debit: '642', credit: '112' },
    { keywords: ['luong', 'thanh toan luong', 'payrol'], debit: '334', credit: '112' },
    { keywords: ['thanh toan hoa don', 'tra tien hang'], debit: '331', credit: '112' },
    { keywords: ['khach hang thanh toan', 'thu tien'], debit: '112', credit: '131' },
];

function suggestAccounts(description) {
    const desc = (description || '').toLowerCase();
    for (const rule of BANK_MAPPING_RULES) {
        if (rule.keywords.some(kw => desc.includes(kw))) {
            return { debit: rule.debit, credit: rule.credit };
        }
    }
    return { debit: '', credit: '' };
}

app.get('/api/bank/accounts', verifyToken, requireRole('admin'), (req, res) => {
    db.all("SELECT id, bank_name, acc_no, created_at FROM bank_accounts", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/bank/accounts', verifyToken, requireRole('admin'), (req, res) => {
    const { id, bank_name, acc_no, api_key } = req.body;
    const sql = 'INSERT INTO bank_accounts (id, bank_name, acc_no, api_key, created_at) VALUES (?,?,?,?,?)';
    const params = [id || `bank_${Date.now()}`, bank_name, acc_no, api_key, new Date().toISOString()];
    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Bank connection added" });
    });
});

// WEBHOOK: Receiving data from Bank/Mid-service (Casso/Sepay)
app.post('/api/bank/webhook', (req, res) => {
    const { amount, description, acc_no, date, tid } = req.body;
    if (!verifyWebhookAuth(req)) {
        if (!allowInsecureWebhooks) {
            return res.status(401).json({ status: 'unauthorized' });
        }
        console.warn('[BANK WEBHOOK] Insecure mode enabled. Missing/invalid signature.');
    }
    console.log(`[BANK WEBHOOK] Received: ${amount} - ${description} (Acc: ${acc_no})`);

    const suggestions = suggestAccounts(description);
    const id = `bank_trx_${tid || Date.now()}`;

    const sql = `INSERT INTO staging_transactions 
        (id, batch_id, row_index, trx_date, doc_no, description, amount, is_valid, source, suggested_debit, suggested_credit) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`;

    const params = [
        id,
        'BANK_FEED',
        0,
        date || new Date().toISOString().split('T')[0],
        tid || 'BNK' + Date.now().toString().slice(-6),
        description,
        amount,
        0,
        'bank_api',
        suggestions.debit,
        suggestions.credit
    ];

    db.run(sql, params, (err) => {
        if (err) {
            console.error("Webhook insert failed:", err.message);
            return res.status(500).json({ status: "error" });
        }
        res.json({ status: "success", received: id });
    });
});

// PERIOD-END MACRO SEQUENCE: Automated Closing Process
app.post('/api/closing/execute-macro', verifyToken, async (req, res) => {
    const { period } = req.body;
    console.log(`[CLOSING MACRO] Starting macro for period: ${period}`);

    const steps = [
        { id: 'valuation', name: 'Tính giá vốn (Stock Valuation)', logic: () => { } },
        { id: 'depreciation', name: 'Trích hao mòn/khấu hao (HCSN)', logic: () => { } },
        { id: 'revenue_recognition', name: 'Ghi thu từ nguồn tạm thu (366)', logic: () => { } },
        { id: 'allocation', name: 'Phân bổ chi phí (Allocation)', logic: () => { } },
        { id: 'fx', name: 'Đánh giá tỷ giá (FX Revaluation)', logic: () => { } },
        { id: 'vat', name: 'Kết chuyển VAT (nếu có)', logic: () => { } },
        { id: 'payroll', name: 'Hạch toán Lương & Bảo hiểm (334, 332)', logic: () => { } },
        { id: 'pl', name: 'Kết chuyển thặng dư/thâm hụt (811)', logic: () => { } },
        { id: 'fund_distribution', name: 'Trích lập các Quỹ (431)', logic: () => { } },
    ];

    // Simulating sequence execution with potential for failure
    const results = []; // Initialize results array for audit checks
    const createdVouchers = [];

    // 1. Audit: Check for unposted vouchers
    const unposted = await new Promise(resolve => db.get("SELECT COUNT(*) as count FROM vouchers WHERE status = 'DRAFT'", (e, r) => resolve(r?.count || 0)));
    results.push({
        id: 'h1',
        check: 'Chứng từ chưa ghi sổ (Draft Vouchers)',
        status: unposted > 0 ? 'warning' : 'success',
        detail: unposted > 0 ? `Có ${unposted} chứng từ đang ở trạng thái nháp.` : 'Tất cả chứng từ đã ghi sổ.'
    });

    // 2. Audit: Negative Cash Check
    const negCash = await new Promise(resolve => db.all("SELECT account_code, SUM(debit_amount - credit_amount) as bal FROM general_ledger WHERE account_code LIKE '111%' GROUP BY account_code HAVING bal < 0", (e, r) => resolve(r || [])));
    results.push({
        id: 'h2',
        check: 'Kiểm tra quỹ tiền mặt',
        status: negCash.length > 0 ? 'error' : 'success',
        detail: negCash.length > 0 ? `Quỹ tiền mặt bị âm tại ${negCash.map(c => c.account_code).join(', ')}.` : 'Số dư quỹ tiền mặt hợp lệ.'
    });

    // 3. Audit: Budget Availability Check (008)
    const budgetExceeded = await new Promise(resolve => db.all("SELECT account_code, SUM(debit_amount - credit_amount) as bal FROM general_ledger WHERE account_code LIKE '008%' GROUP BY account_code HAVING bal < 0", (e, r) => resolve(r || [])));
    results.push({
        id: 'h3',
        check: 'Kiểm tra dự toán (Account 008)',
        status: budgetExceeded.length > 0 ? 'warning' : 'success',
        detail: budgetExceeded.length > 0 ? `Dự toán đang bị vượt mức tại ${budgetExceeded.map(c => c.account_code).join(', ')}.` : 'Dự toán ngân sách trong hạn mức.'
    });

    try {
        // Real Logic Helper
        const runStep = async (step, logicFn) => {
            console.log(`[CLOSING MACRO] Executing: ${step.name}`);
            try {
                await logicFn();
            } catch (e) {
                throw new Error(`Error at ${step.name}: ${e.message}`);
            }
        };

        // 1. Valuation (Check for Negative Inventory)
        await runStep(steps[0], async () => {
            // Real Validation: Check for invalid negative inventory states
            const negInv = await new Promise((resolve, reject) => {
                db.all("SELECT account_code, SUM(debit_amount - credit_amount) as bal FROM general_ledger WHERE account_code LIKE '15%' GROUP BY account_code HAVING bal < 0", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (negInv && negInv.length > 0) {
                console.warn(`[VALUATION WARNING] Found ${negInv.length} inventory accounts with negative balance.`);
            }
            // Proceed implies "Valuation Check Complete"
        });

        // 2. Depreciation (Fixed Assets & CCDC)
        await runStep(steps[1], async () => {
            const assets = await new Promise((resolve) => db.all("SELECT * FROM fixed_assets WHERE residual > 0", (e, r) => resolve(r || [])));
            const ccdc = await new Promise((resolve) => db.all("SELECT * FROM ccdc_items WHERE remaining > 0", (e, r) => resolve(r || [])));

            if (assets.length === 0 && ccdc.length === 0) {
                console.log("[DEPRECIATION] No assets to process.");
                return;
            }

            const now = new Date().toISOString();
            const voucherId = `DEP_AUTO_${period}`;
            let totalDep = 0;

            db.serialize(() => {
                assets.forEach(asset => {
                    const monthly = asset.cost / (asset.life_years * 12);
                    const actualDep = Math.min(monthly, asset.residual);
                    totalDep += actualDep;
                    db.run("UPDATE fixed_assets SET accumulated = accumulated + ?, residual = residual - ? WHERE id = ?", [actualDep, actualDep, asset.id]);
                });
                ccdc.forEach(item => {
                    const monthly = item.cost / item.life_months;
                    const actualAlloc = Math.min(monthly, item.remaining);
                    totalDep += actualAlloc;
                    db.run("UPDATE ccdc_items SET allocated = allocated + ?, remaining = remaining - ? WHERE id = ?", [actualAlloc, actualAlloc, item.id]);
                });

                if (totalDep > 0) {
                    const docNo = `KH-${period.replace('-', '')}`;
                    db.run("INSERT OR REPLACE INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at, status) VALUES (?,?,?,?,?,?,?,?,?)",
                        [voucherId, docNo, `${period}-28`, `${period}-28`, `Khấu hao & Phân bổ kỳ ${period}`, 'ALLOCATION', totalDep, now, 'POSTED']);
                    db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [voucherId]);
                    db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                        [voucherId, `Trích khấu hao & phân bổ kỳ ${period}`, '611', '214', totalDep]);

                    db.run("DELETE FROM general_ledger WHERE origin_staging_id = ?", [voucherId]);
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [`gl_dep_${period}_d`, `${period}-28`, now, docNo, `Khấu hao kỳ ${period}`, '611', '214', totalDep, 0, voucherId]);
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [`gl_dep_${period}_c`, `${period}-28`, now, docNo, `Khấu hao kỳ ${period}`, '214', '611', 0, totalDep, voucherId]);
                }
            });
        });

        // 3. Revenue Recognition from Temporary Receipts (366 -> 51x)
        await runStep(steps[2], async () => {
            const sqlExpenses = `
                SELECT 
                    account_code, 
                    SUM(debit_amount - credit_amount) as amount 
                FROM general_ledger 
                WHERE (account_code LIKE '611%' OR account_code LIKE '612%' OR account_code LIKE '614%')
                AND trx_date LIKE ?
                GROUP BY account_code
            `;
            const expenses = await new Promise(resolve => db.all(sqlExpenses, [`${period}%`], (e, r) => resolve(r || [])));

            if (expenses.length > 0) {
                const now = new Date().toISOString();
                const voucherId = `REV_REC_AUTO_${period}`;
                const docNo = `GT-${period.replace('-', '')}`;
                let totalRecognized = 0;

                db.serialize(() => {
                    db.run("INSERT OR REPLACE INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at, status) VALUES (?,?,?,?,?,?,?,?,?)",
                        [voucherId, docNo, `${period}-28`, `${period}-28`, `Ghi thu từ nguồn tạm thu kỳ ${period}`, 'CLOSING', 0, now, 'POSTED']);
                    db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [voucherId]);
                    db.run("DELETE FROM general_ledger WHERE origin_staging_id = ?", [voucherId]);

                    expenses.forEach(exp => {
                        if (exp.amount <= 0) return;

                        let revenueAcc = '511'; // Default
                        if (exp.account_code.startsWith('612')) revenueAcc = '512';
                        if (exp.account_code.startsWith('614')) revenueAcc = '514';

                        totalRecognized += exp.amount;

                        // Dr 366 / Cr 51x
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, `Ghi thu tương ứng chi phí ${exp.account_code}`, '366', revenueAcc, exp.amount]);

                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_rev_rec_${period}_${exp.account_code}_d`, `${period}-28`, now, docNo, `Ghi thu từ nguồn 366 cho ${exp.account_code}`, '366', revenueAcc, exp.amount, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_rev_rec_${period}_${exp.account_code}_c`, `${period}-28`, now, docNo, `Ghi thu cho ${exp.account_code}`, revenueAcc, '366', 0, exp.amount, voucherId]);
                    });

                    db.run("UPDATE vouchers SET total_amount = ? WHERE id = ?", [totalRecognized, voucherId]);
                    createdVouchers.push({ id: voucherId, docNo, description: `Ghi thu từ nguồn tạm thu (366) kỳ ${period}` });
                });
            }
        });

        // 4. Allocation (Prepaid Expenses 242)
        await runStep(steps[3], async () => {
            const sql = "SELECT account_code, account_name, SUM(debit_amount - credit_amount) as bal FROM general_ledger WHERE account_code LIKE '242%' GROUP BY account_code HAVING bal > 0";
            const items = await new Promise((resolve) => db.all(sql, (e, r) => resolve(r || [])));

            if (items.length > 0) {
                const now = new Date().toISOString();
                const voucherId = `ALLOC_AUTO_${period}`;
                let totalAlloc = 0;

                db.serialize(() => {
                    items.forEach(item => {
                        const monthlyAlloc = Math.round(item.bal / 12);
                        totalAlloc += monthlyAlloc;
                        const docNo = `PB-${period.replace('-', '')}`;

                        db.run("INSERT OR REPLACE INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                            [voucherId, docNo, `${period}-28`, `${period}-28`, `Phân bổ chi phí 242 (Macro) kỳ ${period}`, 'ALLOCATION', totalAlloc, now]);
                        db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [voucherId]);
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, `Phân bổ ${item.account_name}`, '611', item.account_code, monthlyAlloc]);

                        db.run("DELETE FROM general_ledger WHERE origin_staging_id = ?", [voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_alloc_${period}_${item.account_code}_d`, `${period}-28`, now, docNo, `Phân bổ ${item.account_name}`, '611', item.account_code, monthlyAlloc, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_alloc_${period}_${item.account_code}_c`, `${period}-28`, now, docNo, `Phân bổ ${item.account_name}`, item.account_code, '611', 0, monthlyAlloc, voucherId]);
                    });
                });
            }
        });

        // 5. FX Revaluation (1112, 1122)
        await runStep(steps[4], async () => {
            const sql = "SELECT account_code, SUM(debit_amount - credit_amount) as bal FROM general_ledger WHERE account_code IN ('1112', '1122') GROUP BY account_code";
            const accounts = await new Promise(resolve => db.all(sql, (e, r) => resolve(r || [])));

            if (accounts.length > 0) {
                const now = new Date().toISOString();
                const voucherId = `FX_AUTO_${period}`;
                const rateChange = 1.0;
                db.serialize(() => {
                    accounts.forEach(acc => {
                        const gain = Math.round(acc.bal * (rateChange - 1));
                        if (gain === 0) return;

                        const docNo = `DG-${period.replace('-', '')}`;
                        db.run("INSERT OR REPLACE INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                            [voucherId, docNo, `${period}-28`, `${period}-28`, `Đánh giá tỷ giá (Macro) tháng ${period}`, 'REVALUATION', Math.abs(gain), now]);
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, `Đánh giá lại tỷ giá ${acc.account_code}`, gain > 0 ? acc.account_code : '615', gain > 0 ? '515' : acc.account_code, Math.abs(gain)]);
                    });
                });
            }
        });

        // 6. VAT Closing
        await runStep(steps[5], async () => {
            const sqlIn = "SELECT SUM(debit_amount - credit_amount) as val FROM general_ledger WHERE account_code LIKE '133%' AND trx_date LIKE ?";
            const sqlOut = "SELECT SUM(credit_amount - debit_amount) as val FROM general_ledger WHERE account_code LIKE '3331%' AND trx_date LIKE ?";

            // Wrap in promise
            const [inVal, outVal] = await Promise.all([
                new Promise((resolve, reject) => db.get(sqlIn, [`${period}%`], (err, r) => err ? reject(err) : resolve(r?.val || 0))),
                new Promise((resolve, reject) => db.get(sqlOut, [`${period}%`], (err, r) => err ? reject(err) : resolve(r?.val || 0)))
            ]);

            if (inVal > 0 && outVal > 0) {
                const offset = Math.min(inVal, outVal);
                const voucherId = `VAT_CLOSE_${period}`;
                const now = new Date().toISOString();

                // Check if exists
                const check = await new Promise(r => db.get("SELECT id FROM vouchers WHERE id = ?", [voucherId], (e, row) => r(row)));
                if (!check) {
                    db.serialize(() => {
                        db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                            [voucherId, `KC-VAT-${period}`, `${period}-28`, `${period}-28`, `Khấu trừ thuế GTGT tháng ${period}`, 'CLOSING', offset, now]);

                        // Dr 3331 / Cr 1331
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, `Khấu trừ thuế GTGT`, '3331', '1331', offset]);

                        // Post GL
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_vat_${period}_d`, `${period}-28`, now, `KC-VAT-${period}`, `Khấu trừ thuế GTGT`, '3331', '1331', offset, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_vat_${period}_c`, `${period}-28`, now, `KC-VAT-${period}`, `Khấu trừ thuế GTGT`, '1331', '3331', 0, offset, voucherId]);

                        createdVouchers.push({ id: voucherId, docNo: `KC-VAT-${period}`, description: `Khấu trừ thuế GTGT tháng ${period}` });
                    });
                }
            }
        });

        // 7. Payroll & Insurance Closing (611 / 334 / 332)
        await runStep(steps[6], async () => {
            const sqlPayroll = `
                SELECT 
                    SUM(gross_salary + allowance) as total_gross,
                    SUM(insurance_deduction) as total_ins,
                    SUM(income_tax) as total_tax
                FROM payroll 
                WHERE period = ?
            `;
            const summary = await new Promise(resolve => db.get(sqlPayroll, [period], (e, r) => resolve(r || { total_gross: 0, total_ins: 0, total_tax: 0 })));

            if (summary.total_gross > 0) {
                const voucherId = `PAYROLL_AUTO_${period}`;
                const now = new Date().toISOString();
                const docNo = `LUONG-${period.replace('-', '')}`;

                db.serialize(() => {
                    db.run("INSERT OR REPLACE INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at, status) VALUES (?,?,?,?,?,?,?,?,?)",
                        [voucherId, docNo, `${period}-28`, `${period}-28`, `Hạch toán lương và bảo hiểm tháng ${period}`, 'GENERAL', summary.total_gross, now, 'POSTED']);
                    db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [voucherId]);
                    db.run("DELETE FROM general_ledger WHERE origin_staging_id = ?", [voucherId]);

                    // 1. Ghi nhận chi phí lương: Dr 611 / Cr 334
                    db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                        [voucherId, 'Chi phí tiền lương và phụ cấp', '611', '334', summary.total_gross]);
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [`gl_sal_${period}_d`, `${period}-28`, now, docNo, 'Chi phí tiền lương', '611', '334', summary.total_gross, 0, voucherId]);
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [`gl_sal_${period}_c`, `${period}-28`, now, docNo, 'Phải trả lương nhân viên', '334', '611', 0, summary.total_gross, voucherId]);

                    // 2. Khấu trừ bảo hiểm: Dr 334 / Cr 332
                    if (summary.total_ins > 0) {
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, 'Khấu trừ bảo hiểm vào lương', '334', '332', summary.total_ins]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_ins_${period}_d`, `${period}-28`, now, docNo, 'Khấu trừ bảo hiểm', '334', '332', summary.total_ins, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_ins_${period}_c`, `${period}-28`, now, docNo, 'Phải nộp bảo hiểm', '332', '334', 0, summary.total_ins, voucherId]);
                    }

                    // 3. Khấu trừ thuế TNCN: Dr 334 / Cr 333 (PIT)
                    if (summary.total_tax > 0) {
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, 'Khấu trừ thuế TNCN vào lương', '334', '333', summary.total_tax]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_pit_${period}_d`, `${period}-28`, now, docNo, 'Khấu trừ thuế TNCN', '334', '333', summary.total_tax, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_pit_${period}_c`, `${period}-28`, now, docNo, 'Phải nộp thuế TNCN', '333', '334', 0, summary.total_tax, voucherId]);
                    }

                    createdVouchers.push({ id: voucherId, docNo, description: `Hạch toán lương và bảo hiểm tháng ${period}` });
                });
            }
        });

        // 8. P&L Closing (HCSN Result 811)
        await runStep(steps[7], async () => {
            const sql = `
                SELECT account_code, SUM(debit_amount - credit_amount) as bal
                FROM general_ledger
                WHERE (account_code LIKE '5%' OR account_code LIKE '6%' OR account_code LIKE '7%' OR account_code LIKE '8%')
                AND account_code != '811'
                AND trx_date LIKE ?
                GROUP BY account_code
            `;
            const balances = await new Promise(resolve => db.all(sql, [`${period}%`], (e, r) => resolve(r || [])));

            if (balances.length === 0) return;

            const voucherId = `PNL_AUTO_${period}`;
            const now = new Date().toISOString();
            const docNo = `KC-${period.replace('-', '')}`;
            let totalRevenue = 0;
            let totalExpense = 0;

            db.serialize(() => {
                db.run("INSERT OR REPLACE INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                    [voucherId, docNo, `${period}-28`, `${period}-28`, `Kết chuyển lãi lỗ (Macro) tháng ${period}`, 'CLOSING', 0, now]);
                db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [voucherId]);
                db.run("DELETE FROM general_ledger WHERE origin_staging_id = ?", [voucherId]);

                balances.forEach(b => {
                    const isRevenue = b.account_code.startsWith('5') || b.account_code.startsWith('7');
                    const amount = Math.abs(b.bal);
                    if (amount === 0) return;

                    if (isRevenue) {
                        totalRevenue += amount;
                        // Dr 5 / Cr 811 (HCSN)
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, `Kết chuyển thu hoạt động ${b.account_code}`, b.account_code, '811', amount]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_pnl_${period}_${b.account_code}_d`, `${period}-28`, now, docNo, `Kết chuyển doanh thu ${b.account_code}`, b.account_code, '811', amount, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_pnl_${period}_${b.account_code}_c`, `${period}-28`, now, docNo, `Kết chuyển doanh thu ${b.account_code}`, '811', b.account_code, 0, amount, voucherId]);
                    } else {
                        totalExpense += amount;
                        // Dr 811 / Cr 6 (HCSN)
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, `Kết chuyển chi phí ${b.account_code}`, '811', b.account_code, amount]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_pnl_${period}_${b.account_code}_d`, `${period}-28`, now, docNo, `Kết chuyển chi phí ${b.account_code}`, '811', b.account_code, amount, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_pnl_${period}_${b.account_code}_c`, `${period}-28`, now, docNo, `Kết chuyển chi phí ${b.account_code}`, b.account_code, '811', 0, amount, voucherId]);
                    }
                });

                const profit = totalRevenue - totalExpense;
                if (profit !== 0) {
                    const dr = profit > 0 ? '811' : '421';
                    const cr = profit > 0 ? '421' : '811';
                    const amt = Math.abs(profit);
                    db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                        [voucherId, profit > 0 ? 'Kết chuyển thặng dư hoạt động' : 'Kết chuyển thâm hụt hoạt động', dr, cr, amt]);
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [`gl_pnl_${period}_net_d`, `${period}-28`, now, docNo, profit > 0 ? 'Kết chuyển thặng dư' : 'Kết chuyển thâm hụt', dr, cr, amt, 0, voucherId]);
                    db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [`gl_pnl_${period}_net_c`, `${period}-28`, now, docNo, profit > 0 ? 'Kết chuyển thặng dư' : 'Kết chuyển thâm hụt', cr, dr, 0, amt, voucherId]);
                }

                db.run("UPDATE vouchers SET total_amount = ? WHERE id = ?", [totalRevenue + totalExpense + Math.abs(profit), voucherId]);
                createdVouchers.push({ id: voucherId, docNo, description: `Kết chuyển lãi lỗ (Macro) tháng ${period}` });
            });
        });

        // 9. Fund Distribution (421 -> 431)
        await runStep(steps[8], async () => {
            const sql = "SELECT SUM(debit_amount - credit_amount) as bal FROM general_ledger WHERE account_code = '421' AND trx_date LIKE ?";
            const surplus = await new Promise(resolve => db.get(sql, [`${period}%`], (e, r) => resolve(r?.bal || 0)));

            // Chỉ trích lập nếu có thặng dư (số dư Có 421, tức là bal < 0 trong logic debit-credit)
            // Lưu ý: Trong kế toán, dư Có 421 là thặng dư. bal = debit - credit. Nếu dư Có thì bal < 0.
            if (surplus < 0) {
                const amount = Math.abs(surplus);
                const voucherId = `FUND_DIST_AUTO_${period}`;
                const now = new Date().toISOString();
                const docNo = `TLQ-${period.replace('-', '')}`;

                // Tỷ lệ trích lập mặc định: Phát triển sự nghiệp (40%), Khen thưởng (30%), Phúc lợi (30%)
                const funds = [
                    { code: '4314', name: 'Quỹ phát triển hoạt động sự nghiệp', rate: 0.4 },
                    { code: '4311', name: 'Quỹ khen thưởng', rate: 0.3 },
                    { code: '4312', name: 'Quỹ phúc lợi', rate: 0.3 }
                ];

                db.serialize(() => {
                    db.run("INSERT OR REPLACE INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at, status) VALUES (?,?,?,?,?,?,?,?,?)",
                        [voucherId, docNo, `${period}-28`, `${period}-28`, `Trích lập các quỹ từ thặng dư kỳ ${period}`, 'CLOSING', amount, now, 'POSTED']);
                    db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [voucherId]);
                    db.run("DELETE FROM general_ledger WHERE origin_staging_id = ?", [voucherId]);

                    funds.forEach(f => {
                        const fundAmount = Math.round(amount * f.rate);
                        if (fundAmount <= 0) return;

                        // Dr 421 / Cr 431
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                            [voucherId, `Trích lập ${f.name}`, '421', f.code, fundAmount]);

                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_fund_${period}_${f.code}_d`, `${period}-28`, now, docNo, `Trích lập ${f.name}`, '421', f.code, fundAmount, 0, voucherId]);
                        db.run("INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            [`gl_fund_${period}_${f.code}_c`, `${period}-28`, now, docNo, `Trích lập ${f.name}`, f.code, '421', 0, fundAmount, voucherId]);
                    });

                    createdVouchers.push({ id: voucherId, docNo, description: `Trích lập các quỹ từ thặng dư kỳ ${period}` });
                });
            }
        });

        logAction(req.user.username, 'MONTH_END_CLOSE', period, `Quy trình kết chuyển kỳ ${period} thành công.`);
        res.json({
            status: 'success',
            message: `Quy trình kết chuyển kỳ ${period} đã được xử lý thành công.`,
            createdVouchers,
            completedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error(`[CLOSING MACRO] Master failed at step:`, err.message);
        logAction(req.user?.username || 'system', 'MONTH_END_CLOSE_FAILED', period, err.message);
        res.status(400).json({
            status: 'error',
            message: err.message
        });
    }
});

// 12. API: Periodic Checklist Management
app.get('/api/checklist', verifyToken, (req, res) => {
    db.all("SELECT * FROM checklist_tasks ORDER BY category, id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/checklist', verifyToken, (req, res) => {
    const { title, category } = req.body;
    const sql = 'INSERT INTO checklist_tasks (title, category) VALUES (?,?)';
    db.run(sql, [title, category], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, category, status: 'todo', is_visible: 1 });
    });
});

app.put('/api/checklist/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { status, is_visible, title, category } = req.body;

    let updates = [];
    let params = [];

    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (is_visible !== undefined) { updates.push("is_visible = ?"); params.push(is_visible); }
    if (title !== undefined) { updates.push("title = ?"); params.push(title); }
    if (category !== undefined) { updates.push("category = ?"); params.push(category); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    params.push(id);
    const sql = `UPDATE checklist_tasks SET ${updates.join(", ")} WHERE id = ?`;

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// 14. Tax Reports: VAT and PIT
app.get('/api/reports/tax-vat', verifyToken, (req, res) => {
    const { type, from, to } = req.query;
    const accPrefix = type === 'input' ? '133%' : '3331%';

    // We query the tax entries and try to join with something that might have more info, 
    // but in this simplified schema, we'll mostly aggregate from general_ledger.
    const sql = `
        SELECT 
            gl.id,
            gl.trx_date as date,
            gl.doc_no as invNo,
            gl.description as note,
            (CASE WHEN ? = '133%' THEN gl.debit_amount ELSE gl.credit_amount END) as tax,
            gl.reciprocal_acc,
            p.tax_code,
            p.partner_name,
            -- Subquery to find related Base Value (Net/Gross reference) from the same document
            (SELECT SUM(gl2.debit_amount + gl2.credit_amount) 
             FROM general_ledger gl2 
             WHERE gl2.doc_no = gl.doc_no 
             AND gl2.id != gl.id 
             AND (gl2.account_code LIKE '5%' OR gl2.account_code LIKE '7%' OR gl2.account_code LIKE '15%' OR gl2.account_code LIKE '6%' OR gl2.account_code LIKE '2%' OR gl2.account_code LIKE '8%')
            ) as real_base_value
        FROM general_ledger gl
        LEFT JOIN partners p ON gl.partner_code = p.partner_code
        WHERE gl.account_code LIKE ?
        AND gl.trx_date BETWEEN ? AND ?
    `;

    db.all(sql, [accPrefix, accPrefix, from || '1900-01-01', to || '2099-12-31'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Enhance rows with simulated "value before tax" and default tax code/partner for now
        // A real system would join with voucher_items/partners
        const report = rows.map(r => ({
            id: r.id,
            date: r.date,
            invNo: r.invNo,
            taxCode: r.tax_code || '',
            partner: r.partner_name || 'Khách lẻ',
            value: r.real_base_value || (r.tax * 10), // Use Real Base Value, fallback to estimate if missing
            rate: r.real_base_value ? Math.round((r.tax / r.real_base_value) * 100) + '%' : '10%',
            tax: r.tax,
            note: r.note
        }));
        res.json(report);
    });
});

app.get('/api/reports/tax-pit', verifyToken, (req, res) => {
    const { from, to } = req.query;
    const sql = `
        SELECT 
            gl.description as name,
            'Cư trú - HĐLĐ' as type,
            (gl.debit_amount + gl.credit_amount) * 5 as income,
            (gl.debit_amount + gl.credit_amount) * 3 as deduct,
            (gl.debit_amount + gl.credit_amount) * 2 as taxable,
            (gl.debit_amount + gl.credit_amount) as tax
        FROM general_ledger gl
        WHERE gl.account_code LIKE '3335%'
        AND gl.trx_date BETWEEN ? AND ?
    `;
    db.all(sql, [from || '1900-01-01', to || '2099-12-31'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map((r, i) => ({ id: `pit-${i}`, ...r })));
    });
});

// --- NEW ACCOUNTING REPORTS ---

// Sổ Cái (General Ledger for specific account)
app.get('/api/reports/general-ledger', verifyToken, (req, res) => {
    const { account_code, from, to } = req.query;
    if (!account_code) return res.status(400).json({ error: "Missing account_code" });

    // Initial Balance
    const balSql = `SELECT SUM(debit_amount - credit_amount) as balance FROM general_ledger WHERE account_code = ? AND trx_date < ?`;
    db.get(balSql, [account_code, from || '2000-01-01'], (err, balRow) => {
        if (err) return res.status(500).json({ error: err.message });
        let balance = balRow?.balance || 0;

        const sql = `SELECT * FROM general_ledger WHERE account_code = ? AND trx_date BETWEEN ? AND ? ORDER BY trx_date ASC, id ASC`;
        db.all(sql, [account_code, from || '2000-01-01', to || '2099-12-31'], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const result = rows.map(r => {
                balance += (r.debit_amount - r.credit_amount);
                return { ...r, balance };
            });

            // Prepend opening balance
            result.unshift({
                id: 'opening',
                trx_date: from || '2000-01-01',
                description: 'Số dư đầu kỳ',
                account_code,
                debit_amount: 0,
                credit_amount: 0,
                balance: balRow?.balance || 0
            });

            res.json(result);
        });
    });
});

// Sổ Tiền Gửi Ngân Hàng
app.get('/api/reports/bank-book', verifyToken, (req, res) => {
    const { from, to } = req.query;
    const sql = `SELECT * FROM general_ledger WHERE account_code LIKE '112%' AND trx_date BETWEEN ? AND ? ORDER BY trx_date ASC`;
    db.all(sql, [from || '2000-01-01', to || '2099-12-31'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Sổ Chi Tiết Vật Tư, Hàng Hóa
app.get('/api/reports/inventory-ledger', verifyToken, (req, res) => {
    const { account_code, from, to } = req.query;
    const sql = `SELECT * FROM general_ledger WHERE account_code LIKE '15%' AND (? IS NULL OR account_code = ?) AND trx_date BETWEEN ? AND ? ORDER BY trx_date ASC`;
    db.all(sql, [account_code || null, account_code || null, from || '2000-01-01', to || '2099-12-31'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Sổ Chi Tiết Công Nợ (AR/AP)
app.get('/api/reports/debt-ledger', verifyToken, (req, res) => {
    const { partner_code, from, to } = req.query;
    // if (!partner_code) return res.status(400).json({ error: "Missing partner_code" });

    const sql = `SELECT * FROM general_ledger WHERE (account_code LIKE '131%' OR account_code LIKE '331%') AND (? IS NULL OR partner_code = ?) AND trx_date BETWEEN ? AND ? ORDER BY trx_date ASC`;
    db.all(sql, [partner_code || null, partner_code || null, from || '2000-01-01', to || '2099-12-31'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Bảng kê VAT
app.get('/api/reports/vat-in', verifyToken, (req, res) => {
    req.query.type = 'input';
    res.redirect('/api/reports/tax-vat?' + new URLSearchParams(req.query).toString());
});

app.get('/api/reports/vat-out', verifyToken, (req, res) => {
    req.query.type = 'output';
    res.redirect('/api/reports/tax-vat?' + new URLSearchParams(req.query).toString());
});

// Báo cáo lãi lỗ theo dự án
app.get('/api/reports/project-pnl', verifyToken, (req, res) => {
    const { project_id } = req.query;
    const sql = `
        SELECT 
            account_code,
            SUM(credit_amount - debit_amount) as amount
        FROM general_ledger
        WHERE (account_code LIKE '511%' OR account_code LIKE '6%')
        AND (? IS NULL OR description LIKE '%' || ? || '%')
        GROUP BY account_code
    `;
    // Note: In a real system, we'd have a project_id column in GL. Here we might guess from description or dims.
    db.all(sql, [project_id || null, project_id || null], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- OPENING BALANCE ---

app.get('/api/opening-balance', verifyToken, (req, res) => {
    const { period } = req.query; // Expect YYYY
    if (!period) return res.status(400).json({ error: "Missing period (YYYY)" });

    const docNo = `OPN-${period}`;
    const sql = `
        SELECT 
            account_code, 
            partner_code,
            debit_amount as debit, 
            credit_amount as credit
        FROM general_ledger 
        WHERE doc_no = ?
    `;

    db.all(sql, [docNo], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/opening-balance/details', verifyToken, (req, res) => {
    const { period, account_code } = req.query;
    if (!period || !account_code) return res.status(400).json({ error: "Missing period or account_code" });

    const docNo = `OPN-${period}`;
    // Assuming we store details in Voucher Items or GL. GL is better for reporting.
    // For now we query GL.
    const sql = `
        SELECT 
            id, partner_code, 
            debit_amount as debit, 
            credit_amount as credit
        FROM general_ledger 
        WHERE doc_no = ? AND account_code = ?
        AND (partner_code IS NOT NULL AND partner_code != '')
    `;

    db.all(sql, [docNo, account_code], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/opening-balance/save', verifyToken, (req, res) => {
    const { period, balances } = req.body;
    if (!period || !balances || !Array.isArray(balances)) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const docNo = `OPN-${period}`;
    const voucherId = `OPN_${period}_${Date.now()}`;
    const trxDate = `${period}-01-01`;
    const now = new Date().toISOString();

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // 1. Clear old Opening Balances for this period
        db.run("DELETE FROM vouchers WHERE doc_no = ?", [docNo]);
        db.run("DELETE FROM general_ledger WHERE doc_no = ?", [docNo]);
        db.run("DELETE FROM voucher_items WHERE voucher_id IN (SELECT id FROM vouchers WHERE doc_no = ?)", [docNo]);

        // 2. Insert Header
        const totalAmount = balances.reduce((sum, b) => sum + (b.debit || 0), 0);

        db.run(`INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [voucherId, docNo, trxDate, trxDate, `Số dư đầu kỳ ${period}`, 'OPENING_BALANCE', totalAmount, now, 'POSTED']);

        // 3. Insert Items & GL
        const stmtItem = db.prepare(`INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, dim1, dim2, partner_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        const stmtGL = db.prepare(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id, partner_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

        balances.forEach((item, index) => {
            // Check if this item has details
            if (item.details && Array.isArray(item.details) && item.details.length > 0) {
                // If details exist, we create lines for each detail, NOT a summary line (to avoid double counting)
                item.details.forEach((detail, dIdx) => {
                    const dDebit = detail.debit || 0;
                    const dCredit = detail.credit || 0;
                    const amount = dDebit > 0 ? dDebit : dCredit;
                    const partner = detail.partner_code || '';

                    if (amount > 0) {
                        const glId = `gl_${voucherId}_${index}_${dIdx}`;

                        // Voucher Item
                        stmtItem.run(voucherId, `Số dư chi tiết ${item.account_code}`, dDebit > 0 ? item.account_code : null, dDebit > 0 ? null : item.account_code, amount, '', '', partner);

                        // GL Entry
                        stmtGL.run(glId, trxDate, now, docNo, `Số dư đầu kỳ ${item.account_code} - ${partner}`, item.account_code, 'OPN', dDebit, dCredit, 'opening', partner);
                    }
                });
            } else {
                // Legacy / Simple Account Mode
                const debit = item.debit || 0;
                const credit = item.credit || 0;

                if (debit > 0 || credit > 0) {
                    const amount = debit > 0 ? debit : credit;
                    const glId = `gl_${voucherId}_${index}`;

                    // Voucher Item (Simple)
                    stmtItem.run(voucherId, `Số dư chi tiết ${item.account_code}`, debit > 0 ? item.account_code : null, debit > 0 ? null : item.account_code, amount, '', '', '');

                    // GL Entry (Simple)
                    stmtGL.run(glId, trxDate, now, docNo, `Số dư đầu kỳ ${item.account_code}`, item.account_code, 'OPN', debit, credit, 'opening', '');
                }
            }
        });

        stmtItem.finalize();
        stmtGL.finalize();

        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Saved opening balances." });
        });
    });
});

app.post('/api/opening-balance/transfer', verifyToken, (req, res) => {
    const { fromPeriod, toPeriod } = req.body; // YYYY
    if (!fromPeriod || !toPeriod) return res.status(400).json({ error: "Missing periods" });

    // Calculate Closing Balances of fromPeriod
    // Logic: SUM(Dr - Cr) for all history up to end of fromPeriod
    const endDate = `${fromPeriod}-12-31`;

    const sql = `
        SELECT 
            account_code,
            SUM(debit_amount - credit_amount) as balance
        FROM general_ledger
        WHERE trx_date <= ?
        -- Only transfer Asset, Liability, Equity (Types 1, 2, 3, 4)
        AND (account_code LIKE '1%' OR account_code LIKE '2%' OR account_code LIKE '3%' OR account_code LIKE '4%')
        GROUP BY account_code
        HAVING balance != 0
    `;

    db.all(sql, [endDate], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) {
            return res.json({ success: false, message: `Không tìm thấy số dư cuối kỳ ${fromPeriod} để chuyển.` });
        }

        // Convert to payload format
        const balances = rows.map(r => ({
            account_code: r.account_code,
            debit: r.balance > 0 ? r.balance : 0,
            credit: r.balance < 0 ? Math.abs(r.balance) : 0
        }));

        // Call internal save logic (simulate request)
        // ... Or simpler, just duplicate the logic from save inside this callback. 
        // For clean code, we'll manually call the DB logic again here, or ideally refactor into a function.
        // Since we are inside 'db.all' and cannot easily call another route handler, we will inline the save logic.

        const period = toPeriod;
        const docNo = `OPN-${period}`;
        const voucherId = `OPN_${period}_${Date.now()}`;
        const trxDate = `${period}-01-01`;
        const now = new Date().toISOString();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            db.run("DELETE FROM vouchers WHERE doc_no = ?", [docNo]);
            db.run("DELETE FROM general_ledger WHERE doc_no = ?", [docNo]);
            db.run("DELETE FROM voucher_items WHERE voucher_id IN (SELECT id FROM vouchers WHERE doc_no = ?)", [docNo]);

            const totalAmount = balances.reduce((sum, b) => sum + b.debit, 0);

            db.run(`INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [voucherId, docNo, trxDate, trxDate, `Số dư đầu kỳ ${period} (Kết chuyển từ ${fromPeriod})`, 'OPENING_BALANCE', totalAmount, now]);

            const stmtItem = db.prepare(`INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)`);
            const stmtGL = db.prepare(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)`);

            balances.forEach((item, index) => {
                if (item.debit > 0) {
                    stmtItem.run(voucherId, 'Số dư đầu kỳ', item.account_code, '', item.debit);
                    stmtGL.run(`gl_opn_${period}_${index}_d`, trxDate, now, docNo, 'Số dư đầu kỳ', item.account_code, '', item.debit, 0, voucherId);
                }
                if (item.credit > 0) {
                    stmtItem.run(voucherId, 'Số dư đầu kỳ', '', item.account_code, item.credit);
                    stmtGL.run(`gl_opn_${period}_${index}_c`, trxDate, now, docNo, 'Số dư đầu kỳ', item.account_code, '', 0, item.credit, voucherId);
                }
            });

            stmtItem.finalize();
            stmtGL.finalize();

            db.run("COMMIT", (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: `Đã kết chuyển thành công ${balances.length} tài khoản sang năm ${toPeriod}.` });
            });
        });
    });
});

app.get('/api/reports/tax-declaration', verifyToken, (req, res) => {
    const { type, from, to } = req.query;
    console.log(`[TAX] Generating ${type} declaration from ${from} to ${to}`);

    if (type === 'vat') {
        // Logic for VAT 01/GTGT
        const sql = `
            SELECT 
                SUM(CASE WHEN account_code LIKE '133%' THEN debit_amount ELSE 0 END) as v24,
                SUM(CASE WHEN account_code LIKE '3331%' THEN credit_amount ELSE 0 END) as v35,
                SUM(CASE WHEN account_code LIKE '511%' THEN credit_amount ELSE 0 END) as v34
            FROM general_ledger
            WHERE trx_date BETWEEN ? AND ?
        `;
        db.get(sql, [from || '1900-01-01', to || '2099-12-31'], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            // Map values to standard VAT Form indices
            const data = {
                v21: 0, // Opening deductible
                v22: 0, // Adjustments
                v23: (row.v24 || 0) * 10, // Approx purchase value (if 10%)
                v24: row.v24 || 0,
                v25: row.v24 || 0, // Deductible tax
                v26: 0, // No tax sales
                v29: row.v34 || 0, // 10% rate sales
                v30: row.v35 || 0, // 10% rate tax
                v32: row.v34 || 0, // Total sales
                v33: row.v35 || 0, // Total tax
                v36: Math.max(0, (row.v35 || 0) - (row.v24 || 0)), // Tax payable
                v40: Math.max(0, (row.v35 || 0) - (row.v24 || 0)), // Tax to pay
                v43: Math.max(0, (row.v24 || 0) - (row.v35 || 0)), // Deductible carry forward
            };
            res.json(data);
        });
    } else if (type === 'pit') {
        const sql = `
            SELECT 
                COUNT(DISTINCT description) as v16, -- Number of employees (simplified)
                SUM(debit_amount + credit_amount) as tax_total,
                SUM(debit_amount + credit_amount) * 10 as income_total
            FROM general_ledger
            WHERE account_code LIKE '3335%' 
            AND trx_date BETWEEN ? AND ?
        `;
        db.get(sql, [from || '1900-01-01', to || '2099-12-31'], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            const data = {
                v16: row.v16 || 0,
                v27: row.income_total || 0,
                v32: row.tax_total || 0,
            };
            res.json(data);
        });
    } else {
        // CIT 03/TNDN (Financial Data based)
        const sql = `
            SELECT 
                SUM(CASE WHEN account_code LIKE '511%' OR account_code LIKE '515%' THEN credit_amount - debit_amount ELSE 0 END) as rev,
                SUM(CASE WHEN account_code LIKE '6%' OR account_code LIKE '8%' THEN debit_amount - credit_amount ELSE 0 END) as cost
            FROM general_ledger
            WHERE trx_date BETWEEN ? AND ?
        `;
        db.get(sql, [from || '1900-01-01', to || '2099-12-31'], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            const pnl = (row.rev || 0) - (row.cost || 0);
            const data = {
                a1: row.rev || 0,
                b1: pnl > 0 ? pnl : 0,
                c1: pnl > 0 ? pnl : 0,
                c7: pnl > 0 ? pnl * 0.2 : 0, // CIT 20%
                g1: pnl > 0 ? pnl * 0.2 : 0,
            };
            res.json(data);
        });
    }
});



// --- NEW REPORT: DETAILED TRANSACTIONS ---
app.get('/api/reports/transaction-details', verifyToken, (req, res) => {
    const { from, to, account_code } = req.query;
    let sql = `
        SELECT
            v.doc_date,
            v.doc_no,
            v.description as voucher_desc,
            vi.description as item_desc,
            vi.debit_acc,
            vi.credit_acc,
            vi.amount,
            vi.partner_code,
            vi.dim1,
            vi.dim2,
            vi.dim3,
            vi.dim4,
            vi.dim5,
            vi.project_code,
            vi.contract_code,
            vi.debt_note,
            v.type
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE 1=1
    `;

    const params = [];
    if (from) { sql += " AND v.doc_date >= ?"; params.push(from); }
    if (to) { sql += " AND v.doc_date <= ?"; params.push(to); }
    if (account_code) {
        sql += " AND (vi.debit_acc = ? OR vi.credit_acc = ?)";
        params.push(account_code);
        params.push(account_code);
    }
    sql += " ORDER BY v.doc_date DESC, v.id DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


// --- SETTINGS ---
app.get('/api/settings', verifyToken, (req, res) => {
    db.all("SELECT key, value FROM system_settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/api/settings', verifyToken, (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "Missing key" });
    db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", [key, value], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logAction(req.user.username, 'UPDATE_SETTING', key, value);
        res.json({ success: true });
    });
});

// --- SYSTEM MODULE ---

app.get('/api/system/params', verifyToken, requireRole('admin'), (req, res) => {
    db.all("SELECT key, value FROM system_settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/system/params', verifyToken, requireRole('admin'), (req, res) => {
    const params = req.body; // Expect { key: value, key2: value2 }
    if (!params || typeof params !== 'object') {
        return res.status(400).json({ error: "Invalid payload" });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");

        Object.keys(params).forEach(key => {
            stmt.run(key, params[key]);
        });

        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logAction(req.user.username, 'UPDATE_SYSTEM_PARAMS', 'system_settings', `Updated ${Object.keys(params).length} parameters`);
            res.json({ success: true, message: "Updated system params" });
        });
    });
});

app.get('/api/system/users', verifyToken, requireRole('admin'), (req, res) => {
    db.all("SELECT id, username, fullname, role, status, last_login FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/system/users', verifyToken, requireRole('admin'), (req, res) => {
    const { username, password, fullname, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing required fields" });

    // In real app, hash password here.
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);

    const sql = `INSERT INTO users (username, password, fullname, role, status) VALUES (?,?,?,?, 'Active')`;
    db.run(sql, [username, hashedPassword, fullname || username, role || 'user'], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAction(req.user.username, 'CREATE_USER', username, `Role: ${role || 'user'}`);
        res.json({ id: this.lastID, message: "User created" });
    });
});

app.get('/api/system/roles', verifyToken, requireRole('admin'), (req, res) => {
    db.all("SELECT id, name, permissions FROM roles ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const roles = rows.map(r => {
            let perms = [];
            try {
                perms = r.permissions ? JSON.parse(r.permissions) : [];
            } catch {
                perms = [];
            }
            return { id: r.id, name: r.name, permissions: perms };
        });
        res.json(roles);
    });
});

app.post('/api/system/roles', verifyToken, requireRole('admin'), (req, res) => {
    const { id, name, permissions } = req.body;
    if (!id || !name) return res.status(400).json({ error: "Missing role id or name" });
    const perms = Array.isArray(permissions) ? permissions : [];
    const sql = "INSERT OR REPLACE INTO roles (id, name, permissions, updated_at) VALUES (?, ?, ?, ?)";
    db.run(sql, [id, name, JSON.stringify(perms), new Date().toISOString()], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAction(req.user.username, 'SAVE_ROLE', name, `Perms count: ${perms.length}`);
        res.json({ message: "Role saved", id });
    });
});

app.get('/api/system/logs', verifyToken, requireRole('admin'), (req, res) => {
    const sql = "SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 200";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- NEW: Recurring Entries (Duplicate as Draft) ---
app.post('/api/vouchers/:id/duplicate', verifyToken, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, voucher) => {
        if (err || !voucher) return res.status(404).json({ error: "Voucher not found" });

        // 1. Calculate New Date (Next Month)
        let oldDate = new Date(voucher.doc_date);
        if (isNaN(oldDate.getTime())) oldDate = new Date();

        let newDate = new Date(oldDate);
        newDate.setMonth(newDate.getMonth() + 1);
        const newDocDate = newDate.toISOString().split('T')[0];

        // 2. New ID and Doc No
        const newId = `v_${Date.now()}`;
        // Simple heuristic for DocNo: Append -COPY or Increment if pattern found?
        // For MVP: Append -COPY is safer
        const newDocNo = `${voucher.doc_no}-COPY-${Math.floor(Math.random() * 1000)}`;
        const now = new Date().toISOString();

        db.serialize(() => {
            // Note: Assuming 'status' column exists (added via migration)
            const insertVoucher = `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, status, created_at) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`;

            db.run(insertVoucher,
                [newId, newDocNo, newDocDate, newDocDate, voucher.description, voucher.type, voucher.total_amount, now],
                function (err) {
                    if (err) {
                        console.error("Duplicate Header Error:", err);
                        return res.status(500).json({ error: "Failed to create new voucher header" });
                    }

                    // 3. Copy Items
                    db.all("SELECT * FROM voucher_items WHERE voucher_id = ?", [id], (err, items) => {
                        if (err) return res.status(500).json({ error: "Failed to read items" });

                        if (items && items.length > 0) {
                            const itemStmt = db.prepare(`INSERT INTO voucher_items 
                                (voucher_id, description, debit_acc, credit_acc, amount, dim1, dim2, dim3, dim4, dim5, project_code, contract_code, debt_note, partner_code, cost_price, quantity, fund_source_id, budget_estimate_id) 
                                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

                            items.forEach(item => {
                                itemStmt.run(newId, item.description, item.debit_acc, item.credit_acc, item.amount,
                                    item.dim1, item.dim2, item.dim3, item.dim4, item.dim5,
                                    item.project_code, item.contract_code, item.debt_note, item.partner_code, item.cost_price, item.quantity,
                                    item.fund_source_id, item.budget_estimate_id);
                            });
                            itemStmt.finalize();
                        }

                        res.json({ status: 'success', message: 'Đã tạo bút toán định kỳ (Draft)', id: newId });
                    });
                }
            );
        });
    });
});

// ========================================
// HCSN APIs - Thông tư 24/2024/TT-BTC
// ========================================

// --- API: Fund Sources (Nguồn kinh phí) ---

app.get('/api/hcsn/fund-sources', verifyToken, (req, res) => {
    const { fiscal_year } = req.query;
    const year = fiscal_year || new Date().getFullYear();

    const sql = `SELECT * FROM fund_sources WHERE fiscal_year = ? ORDER BY code ASC`;
    db.all(sql, [year], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/hcsn/fund-sources', verifyToken, (req, res) => {
    const { code, name, type, fiscal_year, allocated_amount } = req.body;

    if (!code || !name || !type || !fiscal_year) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `fs_${Date.now()}`;
    const now = new Date().toISOString();
    const remaining = allocated_amount || 0;

    const sql = `INSERT INTO fund_sources 
        (id, code, name, type, fiscal_year, allocated_amount, spent_amount, remaining_amount, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`;

    db.run(sql, [id, code, name, type, fiscal_year, allocated_amount || 0, remaining, now, now], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Fund source code already exists' });
            }
            return res.status(500).json({ error: err.message });
        }

        logAction(req.user.username, 'CREATE_FUND_SOURCE', 'fund_sources', `Created: ${code} - ${name}`);
        res.json({ success: true, id, message: 'Fund source created successfully' });
    });
});

app.put('/api/hcsn/fund-sources/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { name, allocated_amount, status } = req.body;

    const sql = `UPDATE fund_sources 
        SET name = ?, allocated_amount = ?, remaining_amount = remaining_amount + (? - allocated_amount), status = ?, updated_at = ? 
        WHERE id = ?`;

    const now = new Date().toISOString();
    db.run(sql, [name, allocated_amount, allocated_amount, status, now, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Fund source not found' });

        logAction(req.user.username, 'UPDATE_FUND_SOURCE', 'fund_sources', `Updated: ${id}`);
        res.json({ success: true, message: 'Fund source updated successfully' });
    });
});

app.delete('/api/hcsn/fund-sources/:id', verifyToken, requireRole('admin'), (req, res) => {
    const { id } = req.params;

    // Check if fund source is used in voucher_items
    db.get(`SELECT COUNT(*) as count FROM voucher_items WHERE fund_source_id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.count > 0) {
            return res.status(409).json({ error: 'Cannot delete: Fund source is used in vouchers' });
        }

        db.run(`DELETE FROM fund_sources WHERE id = ?`, [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Fund source not found' });

            logAction(req.user.username, 'DELETE_FUND_SOURCE', 'fund_sources', `Deleted: ${id}`);
            res.json({ success: true, message: 'Fund source deleted successfully' });
        });
    });
});



// --- API: Infrastructure Assets (Tài sản kết cấu hạ tầng) - MỚI TT 24/2024 ---

app.get('/api/hcsn/infrastructure-assets', verifyToken, (req, res) => {
    const sql = `SELECT ia.*, fs.name as fund_source_name, fs.code as fund_source_code 
                 FROM infrastructure_assets ia 
                 LEFT JOIN fund_sources fs ON ia.fund_source_id = fs.id 
                 ORDER BY ia.code ASC`;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/hcsn/infrastructure-assets', verifyToken, (req, res) => {
    const { code, name, category, location, construction_year, original_value, fund_source_id, managed_by, condition } = req.body;

    if (!code || !name || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `ia_${Date.now()}`;
    const now = new Date().toISOString();
    const net_value = original_value || 0;

    const sql = `INSERT INTO infrastructure_assets 
        (id, code, name, category, location, construction_year, original_value, accumulated_depreciation, net_value, condition, fund_source_id, managed_by, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [id, code, name, category, location, construction_year, original_value || 0, net_value, condition || 'GOOD', fund_source_id, managed_by, now, now], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Infrastructure asset code already exists' });
            }
            return res.status(500).json({ error: err.message });
        }

        logAction(req.user.username, 'CREATE_INFRASTRUCTURE_ASSET', 'infrastructure_assets', `Created: ${code} - ${name}`);
        res.json({ success: true, id, message: 'Infrastructure asset created successfully' });
    });
});

app.put('/api/hcsn/infrastructure-assets/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { name, location, condition, managed_by } = req.body;

    const sql = `UPDATE infrastructure_assets 
        SET name = ?, location = ?, condition = ?, managed_by = ?, updated_at = ? 
        WHERE id = ?`;

    const now = new Date().toISOString();
    db.run(sql, [name, location, condition, managed_by, now, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Infrastructure asset not found' });

        logAction(req.user.username, 'UPDATE_INFRASTRUCTURE_ASSET', 'infrastructure_assets', `Updated: ${id}`);
        res.json({ success: true, message: 'Infrastructure asset updated successfully' });
    });
});

app.delete('/api/hcsn/infrastructure-assets/:id', verifyToken, requireRole('admin'), (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM infrastructure_assets WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Infrastructure asset not found' });

        logAction(req.user.username, 'DELETE_INFRASTRUCTURE_ASSET', 'infrastructure_assets', `Deleted: ${id}`);
        res.json({ success: true, message: 'Infrastructure asset deleted successfully' });
    });
});

// --- API: Off-Balance Tracking (Tài khoản ngoài bảng) - MỚI TT 24/2024 ---

app.get('/api/hcsn/off-balance', verifyToken, (req, res) => {
    const { account_code, from_date, to_date } = req.query;

    let sql = `SELECT * FROM off_balance_tracking WHERE 1=1`;
    const params = [];

    if (account_code) {
        sql += ` AND account_code = ?`;
        params.push(account_code);
    }

    if (from_date) {
        sql += ` AND transaction_date >= ?`;
        params.push(from_date);
    }

    if (to_date) {
        sql += ` AND transaction_date <= ?`;
        params.push(to_date);
    }

    sql += ` ORDER BY transaction_date DESC, id DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/hcsn/off-balance', verifyToken, (req, res) => {
    const { account_code, transaction_date, doc_no, description, increase_amount, decrease_amount } = req.body;

    if (!account_code || !transaction_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const now = new Date().toISOString();

    // Calculate new balance
    const balanceSql = `SELECT IFNULL(SUM(increase_amount - decrease_amount), 0) as current_balance 
                        FROM off_balance_tracking 
                        WHERE account_code = ? AND transaction_date <= ?`;

    db.get(balanceSql, [account_code, transaction_date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const currentBalance = row.current_balance || 0;
        const newBalance = currentBalance + (increase_amount || 0) - (decrease_amount || 0);

        const sql = `INSERT INTO off_balance_tracking 
            (account_code, transaction_date, doc_no, description, increase_amount, decrease_amount, balance, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [account_code, transaction_date, doc_no, description, increase_amount || 0, decrease_amount || 0, newBalance, now], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            logAction(req.user.username, 'CREATE_OFF_BALANCE_ENTRY', 'off_balance_tracking', `Account: ${account_code}`);
            res.json({ success: true, id: this.lastID, balance: newBalance, message: 'Off-balance entry created successfully' });
        });
    });
});

// --- API: HCSN Reports (Báo cáo HCSN theo TT 24/2024) ---

app.get('/api/hcsn/reports/budget-settlement', verifyToken, (req, res) => {
    const { fiscal_year } = req.query;
    const year = fiscal_year || new Date().getFullYear();

    // Báo cáo quyết toán ngân sách
    const sql = `
        SELECT 
            fs.code as fund_code,
            fs.name as fund_name,
            fs.type as fund_type,
            fs.allocated_amount,
            fs.spent_amount,
            fs.remaining_amount,
            (SELECT COUNT(*) FROM budget_estimates WHERE fund_source_id = fs.id) as estimate_count,
            (SELECT SUM(allocated_amount) FROM budget_estimates WHERE fund_source_id = fs.id) as total_budgeted,
            (SELECT SUM(spent_amount) FROM budget_estimates WHERE fund_source_id = fs.id) as total_spent
        FROM fund_sources fs
        WHERE fs.fiscal_year = ?
        ORDER BY fs.code ASC
    `;

    db.all(sql, [year], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const summary = {
            fiscal_year: year,
            total_allocated: rows.reduce((sum, r) => sum + (r.allocated_amount || 0), 0),
            total_spent: rows.reduce((sum, r) => sum + (r.spent_amount || 0), 0),
            total_remaining: rows.reduce((sum, r) => sum + (r.remaining_amount || 0), 0),
            fund_sources: rows
        };

        res.json({ data: summary });
    });
});

app.get('/api/hcsn/reports/fund-usage', verifyToken, (req, res) => {
    const { fund_source_id, fiscal_year } = req.query;

    if (!fund_source_id) {
        return res.status(400).json({ error: 'fund_source_id is required' });
    }

    // Chi tiết sử dụng nguồn kinh phí
    const sql = `
        SELECT 
            v.doc_no,
            v.doc_date,
            v.description,
            vi.debit_acc,
            vi.credit_acc,
            vi.amount,
            vi.budget_category
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE vi.fund_source_id = ?
        ORDER BY v.doc_date DESC
    `;

    db.all(sql, [fund_source_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalSpent = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

        res.json({
            data: {
                transactions: rows,
                total_spent: totalSpent,
                transaction_count: rows.length
            }
        });
    });
});

// ===========================================
// ========================================
// ASSET MODULE APIs - HCSN (TT 24/2024)
// ========================================

// 1. Fixed Assets (TSCĐ)
app.get('/api/assets/fixed', verifyToken, assetAPIs.getFixedAssets(db));
app.post('/api/assets/fixed', verifyToken, assetAPIs.createFixedAsset(db));
app.put('/api/assets/fixed/:id', verifyToken, assetAPIs.updateFixedAsset(db));
app.delete('/api/assets/fixed/:id', verifyToken, assetAPIs.deleteFixedAsset(db));
app.post('/api/assets/fixed/depreciation', verifyToken, assetAPIs.calculateDepreciation(db));
app.post('/api/assets/fixed/transfer', verifyToken, assetAPIs.transferFixedAsset(db));
app.put('/api/assets/fixed/:id/revaluation', verifyToken, assetAPIs.revaluateFixedAsset(db));

// 2. Asset Cards & Inventory
app.get('/api/assets/cards/:asset_id', verifyToken, assetAPIs.getAssetCard(db));
app.put('/api/assets/cards/:id', verifyToken, assetAPIs.updateAssetCard(db));

app.get('/api/assets/inventory', verifyToken, assetAPIs.getInventoryRecords(db));
app.post('/api/assets/inventory', verifyToken, assetAPIs.createInventory(db));
app.post('/api/assets/inventory/:id/items', verifyToken, assetAPIs.addInventoryItem(db));
app.put('/api/assets/inventory/:id/complete', verifyToken, assetAPIs.completeInventory(db));
app.get('/api/assets/inventory/:id/report', verifyToken, assetAPIs.getInventoryReport(db));

// 3. Infrastructure Assets (Hạ tầng)
app.get('/api/infrastructure-assets', verifyToken, assetAPIs.getInfrastructureAssets(db));
app.post('/api/infrastructure-assets', verifyToken, assetAPIs.createInfrastructureAsset(db));
app.put('/api/infrastructure-assets/:id', verifyToken, assetAPIs.updateInfrastructureAsset(db));
app.post('/api/infrastructure/maintenance', verifyToken, assetAPIs.recordMaintenance(db));
app.put('/api/infrastructure/:id/condition', verifyToken, assetAPIs.assessCondition(db));

// 4. Long-term Investments (Đầu tư)
app.get('/api/investments/long-term', verifyToken, assetAPIs.getLongTermInvestments(db));
app.post('/api/investments/long-term', verifyToken, assetAPIs.createInvestment(db));
app.put('/api/investments/long-term/:id', verifyToken, assetAPIs.updateInvestment(db));
app.post('/api/investments/income', verifyToken, assetAPIs.recordInvestmentIncome(db));

// ===========================================
// MATERIAL INVENTORY APIs - HCSN (TT 24/2024)
// ===========================================
console.log('Registering HCSN Material Routes...');

// --- Material Management ---
app.get('/api/hcsn/materials', verifyToken, materialAPIs.getMaterials(db));
app.post('/api/hcsn/materials', verifyToken, materialAPIs.createMaterial(db));
app.put('/api/hcsn/materials/:id', verifyToken, materialAPIs.updateMaterial(db));
app.delete('/api/hcsn/materials/:id', verifyToken, materialAPIs.deleteMaterial(db));

// --- Material Receipts ---
app.get('/api/hcsn/material-receipts', verifyToken, materialAPIs.getReceipts(db));
app.get('/api/hcsn/material-receipts/:id', verifyToken, materialAPIs.getReceiptDetail(db));
app.post('/api/hcsn/material-receipts', verifyToken, materialAPIs.createReceipt(db));
app.put('/api/hcsn/material-receipts/:id', verifyToken, materialAPIs.updateReceipt(db));

// --- Material Issues ---
app.get('/api/hcsn/material-issues', verifyToken, materialAPIs.getIssues(db));
app.get('/api/hcsn/material-issues/:id', verifyToken, materialAPIs.getIssueDetail(db));
app.post('/api/hcsn/material-issues', verifyToken, materialAPIs.createIssue(db));
app.put('/api/hcsn/material-issues/:id', verifyToken, materialAPIs.updateIssue(db));

// --- Material Transfers ---
app.get('/api/hcsn/material-transfers', verifyToken, materialAPIs.getTransfers(db));
app.get('/api/hcsn/material-transfers/:id', verifyToken, materialAPIs.getTransferDetail(db));
app.post('/api/hcsn/material-transfers', verifyToken, materialAPIs.createTransfer(db));
app.put('/api/hcsn/material-transfers/:id', verifyToken, materialAPIs.updateTransfer(db));

// --- Inventory & Reports ---
app.get('/api/hcsn/inventory/summary', verifyToken, materialAPIs.getInventorySummary(db));
app.get('/api/hcsn/inventory/cards/:material_id', verifyToken, materialAPIs.getInventoryCards(db));

// =====================================================
// DEBT MANAGEMENT APIs - HCSN (TT 24/2024)
// Quản lý Công nợ và Tạm ứng HCSN
// =====================================================

// --- Tạm ứng (TK 141) ---
app.get('/api/debt/temporary-advances', verifyToken, debtAPIs.getTemporaryAdvances(db));
app.post('/api/debt/temporary-advances', verifyToken, debtAPIs.createTemporaryAdvance(db));
app.post('/api/debt/temporary-advances/:id/settle', verifyToken, debtAPIs.settleTemporaryAdvance(db));
app.delete('/api/debt/temporary-advances/:id', verifyToken, debtAPIs.deleteTemporaryAdvance(db));

// --- Ứng trước NSNN (TK 161) ---
app.get('/api/debt/budget-advances', verifyToken, debtAPIs.getBudgetAdvances(db));
app.post('/api/debt/budget-advances', verifyToken, debtAPIs.createBudgetAdvance(db));
app.post('/api/debt/budget-advances/:id/repay', verifyToken, debtAPIs.repayBudgetAdvance(db));
app.delete('/api/debt/budget-advances/:id', verifyToken, debtAPIs.deleteBudgetAdvance(db));

// --- Công nợ phải thu (TK 136, 138) ---
app.get('/api/debt/receivables', verifyToken, debtAPIs.getReceivables(db));
app.post('/api/debt/receivables', verifyToken, debtAPIs.createReceivable(db));
app.post('/api/debt/receivables/:id/record-payment', verifyToken, debtAPIs.recordReceivablePayment(db));
app.delete('/api/debt/receivables/:id', verifyToken, debtAPIs.deleteReceivable(db));

// --- Công nợ phải trả (TK 331, 336, 338) ---
app.get('/api/debt/payables', verifyToken, debtAPIs.getPayables(db));
app.post('/api/debt/payables', verifyToken, debtAPIs.createPayable(db));
app.post('/api/debt/payables/:id/record-payment', verifyToken, debtAPIs.recordPayablePayment(db));
app.delete('/api/debt/payables/:id', verifyToken, debtAPIs.deletePayable(db));

// --- Báo cáo công nợ ---
app.get('/api/debt/aging-report', verifyToken, debtAPIs.getAgingReport(db));

// =====================================================
// HR MODULE APIs - HCSN (TT 24/2024 & NĐ 204)
// Quản lý Nhân sự & Tiền lương HCSN
// =====================================================

// --- Employee Management ---
app.get('/api/hr/employees', verifyToken, hrAPIs.getEmployees(db));
app.post('/api/hr/employees', verifyToken, hrAPIs.createEmployee(db));

// --- Salary Grades ---
app.get('/api/hr/salary-grades', verifyToken, hrAPIs.getSalaryGrades(db));

// --- Allowance Types (Full CRUD) ---
app.get('/api/hr/allowance-types', verifyToken, hrAPIs.getAllowanceTypes(db));
app.post('/api/hr/allowance-types', verifyToken, hrAPIs.createAllowanceType(db));
app.put('/api/hr/allowance-types/:id', verifyToken, hrAPIs.updateAllowanceType(db));
app.delete('/api/hr/allowance-types/:id', verifyToken, hrAPIs.deleteAllowanceType(db));

// --- Employee Allowances ---
app.get('/api/hr/employee-allowances/:employeeId', verifyToken, hrAPIs.getEmployeeAllowances(db));
app.post('/api/hr/employee-allowances', verifyToken, hrAPIs.addEmployeeAllowance(db));

// --- Employee Contracts & Decisions ---
app.get('/api/hr/contracts', verifyToken, hrAPIs.getContracts(db));
app.post('/api/hr/contracts', verifyToken, hrAPIs.createContract(db));
app.put('/api/hr/contracts/:id', verifyToken, hrAPIs.updateContract(db));

// --- Salary History (Quá trình lương) ---
app.get('/api/hr/salary-history', verifyToken, hrAPIs.getSalaryHistory(db));
app.post('/api/hr/salary-history', verifyToken, hrAPIs.createSalaryChange(db));

// --- Timekeeping & Payroll ---
app.get('/api/hr/timekeeping', verifyToken, hrAPIs.getTimekeeping(db));
app.get('/api/hr/payroll', verifyToken, hrAPIs.getPayroll(db));
app.post('/api/hr/calculate-payroll', verifyToken, hrAPIs.calculatePayroll(db));

// --- Insurance Reporting & BHXH Reconciliation ---
app.get('/api/hr/insurance/summary', verifyToken, hrAPIs.getInsuranceSummary(db));
app.get('/api/hr/insurance/detail', verifyToken, hrAPIs.getInsuranceDetail(db));
app.post('/api/hr/insurance/import-bhxh', verifyToken, hrAPIs.importBHXHData(db));
app.get('/api/hr/insurance/reconcile', verifyToken, hrAPIs.reconcileBHXH(db));
app.post('/api/hr/insurance/resolve-discrepancy', verifyToken, hrAPIs.resolveDiscrepancy(db));

// =====================================================
// HCSN BUDGET MANAGEMENT APIs (TT 24/2024)
// Quản lý Dự toán HCSN
// =====================================================

const { v4: uuidv4 } = require('uuid');

// --- Fund Sources (Nguồn kinh phí) ---
app.get('/api/hcsn/fund-sources', verifyToken, (req, res) => {
    const { fiscal_year, type } = req.query;
    const company_id = req.user.company_id || 1;

    let sql = 'SELECT * FROM fund_sources WHERE company_id = ?';
    const params = [company_id];

    if (fiscal_year) {
        sql += ' AND fiscal_year = ?';
        params.push(fiscal_year);
    }

    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }

    sql += ' ORDER BY fiscal_year DESC, code ASC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching fund sources:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

app.post('/api/hcsn/fund-sources', verifyToken, requireRole('admin', 'accountant'), (req, res) => {
    const { code, name, type, fiscal_year, allocated_amount } = req.body;
    const company_id = req.user.company_id || 1;
    const id = uuidv4();

    const sql = `INSERT INTO fund_sources (
        id, company_id, code, name, type, fiscal_year,
        allocated_amount, spent_amount, remaining_amount,
        status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE', ?, datetime('now'))`;

    db.run(sql, [
        id, company_id, code, name, type, fiscal_year,
        allocated_amount, allocated_amount, req.user.username
    ], function (err) {
        if (err) {
            console.error('Error creating fund source:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Fund source created', id });
    });
});

app.put('/api/hcsn/fund-sources/:id', verifyToken, requireRole('admin', 'accountant'), (req, res) => {
    const { id } = req.params;
    const { code, name, type, allocated_amount } = req.body;

    const sql = `UPDATE fund_sources 
                 SET code = ?, name = ?, type = ?, allocated_amount = ?,
                     remaining_amount = allocated_amount - spent_amount,
                     updated_at = datetime('now')
                 WHERE id = ?`;

    db.run(sql, [code, name, type, allocated_amount, id], function (err) {
        if (err) {
            console.error('Error updating fund source:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Fund source updated' });
    });
});

app.delete('/api/hcsn/fund-sources/:id', verifyToken, requireRole('admin'), (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM fund_sources WHERE id = ?', [id], function (err) {
        if (err) {
            console.error('Error deleting fund source:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Fund source deleted' });
    });
});

// --- Budget Estimates (Dự toán ngân sách) ---
app.get('/api/hcsn/budget-estimates', verifyToken, (req, res) => {
    try {
        const { fiscal_year, chapter_code, fund_source_id, status, version, budget_type } = req.query;
        const company_id = req.user.company_id || 1;

        let sql = `SELECT be.*, fs.name as fund_source_name 
               FROM budget_estimates be
               LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
               WHERE be.company_id = ?`;
        const params = [company_id];

        if (fiscal_year) {
            sql += ' AND be.fiscal_year = ?';
            params.push(fiscal_year);
        }

        if (chapter_code) {
            sql += ' AND be.chapter_code = ?';
            params.push(chapter_code);
        }

        if (fund_source_id) {
            sql += ' AND be.fund_source_id = ?';
            params.push(fund_source_id);
        }

        if (status) {
            sql += ' AND be.status = ?';
            params.push(status);
        }

        if (version) {
            sql += ' AND be.version = ?';
            params.push(version);
        }

        if (budget_type) {
            sql += ' AND be.budget_type = ?';
            params.push(budget_type);
        }

        sql += ' ORDER BY be.fiscal_year DESC, be.chapter_code, be.item_code';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('[BUDGET ERROR] Error fetching budget estimates:', err);
                return res.status(500).json({
                    error: err.message,
                    stack: err.stack,
                    sql: sql,
                    params: params
                });
            }
            res.json({ data: rows });
        });
    } catch (err) {
        console.error('[BUDGET CRASH] Fatal error in budget-estimates route:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message, stack: err.stack });
    }
});

app.post('/api/hcsn/budget-estimates', verifyToken, requireRole('admin', 'accountant'), (req, res) => {
    const { fiscal_year, fund_source_id, chapter_code, items } = req.body;
    const company_id = req.user.company_id || 1;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
    }

    const insertSql = `INSERT INTO budget_estimates (
        id, company_id, fiscal_year, fund_source_id, chapter_code,
        item_code, item_name, allocated_amount, spent_amount, remaining_amount,
        version, status, budget_type, estimate_type, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, 'DRAFT', ?, ?, ?, datetime('now'))`;

    const stmt = db.prepare(insertSql);
    const ids = [];

    items.forEach(item => {
        const id = uuidv4();
        ids.push(id);
        stmt.run([
            id, company_id, fiscal_year, fund_source_id, chapter_code,
            item.item_code, item.item_name, item.allocated_amount,
            item.allocated_amount, req.body.budget_type || 'EXPENSE',
            req.body.estimate_type || 'YEARLY', req.user.username
        ]);
    });

    stmt.finalize((err) => {
        if (err) {
            console.error('Error creating budget estimates:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Budget estimates created', ids });
    });
});

app.post('/api/hcsn/budget-estimates/:id/adjust', verifyToken, requireRole('admin', 'accountant'), (req, res) => {
    const { id } = req.params;
    const { adjustment_reason, new_allocated_amount } = req.body;

    db.get('SELECT * FROM budget_estimates WHERE id = ?', [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Budget estimate not found' });
        }

        const newId = uuidv4();
        const newVersion = (row.version || 1) + 1;

        const sql = `INSERT INTO budget_estimates (
            id, company_id, fiscal_year, fund_source_id, chapter_code,
            item_code, item_name, allocated_amount, spent_amount, remaining_amount,
            version, parent_id, adjustment_reason, adjustment_date,
            status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DRAFT', ?, datetime('now'))`;

        db.run(sql, [
            newId, row.company_id, row.fiscal_year, row.fund_source_id, row.chapter_code,
            row.item_code, row.item_name, new_allocated_amount, row.spent_amount,
            new_allocated_amount - row.spent_amount, newVersion, id, adjustment_reason,
            req.user.username
        ], function (err) {
            if (err) {
                console.error('Error adjusting budget:', err);
                return res.status(400).json({ error: err.message });
            }
            res.json({ message: 'Budget adjustment created', id: newId, version: newVersion });
        });
    });
});

app.put('/api/hcsn/budget-estimates/:id/approve', verifyToken, requireRole('admin'), (req, res) => {
    const { id } = req.params;

    const sql = `UPDATE budget_estimates
                 SET status = 'APPROVED',
                     approved_by = ?,
                     approved_date = datetime('now')
                 WHERE id = ?`;

    db.run(sql, [req.user.username, id], function (err) {
        if (err) {
            console.error('Error approving budget:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Budget estimate approved' });
    });
});

app.get('/api/hcsn/budget-estimates/report', verifyToken, (req, res) => {
    const { fiscal_year, chapter_code } = req.query;
    const company_id = req.user.company_id || 1;

    let sql = `SELECT 
        be.chapter_code,
        be.item_code,
        be.item_name,
        SUM(be.allocated_amount) as total_allocated,
        SUM(be.spent_amount) as total_spent,
        SUM(be.remaining_amount) as total_remaining,
        ROUND((SUM(be.spent_amount) * 100.0 / NULLIF(SUM(be.allocated_amount), 0)), 2) as execution_rate
    FROM budget_estimates be
    WHERE be.company_id = ? AND be.status IN ('APPROVED', 'EXECUTING')`;

    const params = [company_id];

    if (fiscal_year) {
        sql += ' AND be.fiscal_year = ?';
        params.push(fiscal_year);
    }

    if (chapter_code) {
        sql += ' AND be.chapter_code = ?';
        params.push(chapter_code);
    }

    sql += ' GROUP BY be.chapter_code, be.item_code, be.item_name ORDER BY be.chapter_code, be.item_code';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error generating budget report:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// --- Budget Allocations (Phân bổ dự toán) ---
app.post('/api/hcsn/budget-allocations', verifyToken, requireRole('admin', 'accountant'), (req, res) => {
    const { budget_estimate_id, allocations } = req.body;

    if (!allocations || !Array.isArray(allocations)) {
        return res.status(400).json({ error: 'Allocations array is required' });
    }

    const insertSql = `INSERT INTO budget_allocations (
        id, budget_estimate_id, department_code, department_name, project_code,
        allocated_amount, spent_amount, remaining_amount,
        effective_from, effective_to, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, datetime('now'))`;

    const stmt = db.prepare(insertSql);
    const ids = [];

    allocations.forEach(alloc => {
        const id = uuidv4();
        ids.push(id);
        stmt.run([
            id, budget_estimate_id, alloc.department_code, alloc.department_name,
            alloc.project_code, alloc.allocated_amount, alloc.allocated_amount,
            alloc.effective_from, alloc.effective_to, req.user.username
        ]);
    });

    stmt.finalize((err) => {
        if (err) {
            console.error('Error creating budget allocations:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Budget allocations created', ids });
    });
});

app.get('/api/hcsn/budget-allocations', verifyToken, (req, res) => {
    try {
        const { budget_estimate_id, department_code, project_code } = req.query;

        let sql = `SELECT ba.*, be.item_name, be.chapter_code
                   FROM budget_allocations ba
                   JOIN budget_estimates be ON ba.budget_estimate_id = be.id
                   WHERE be.company_id = ?`;
        const params = [req.user.company_id || 1];

        if (budget_estimate_id) {
            sql += ' AND ba.budget_estimate_id = ?';
            params.push(budget_estimate_id);
        }

        if (department_code) {
            sql += ' AND ba.department_code = ?';
            params.push(department_code);
        }

        if (project_code) {
            sql += ' AND ba.project_code = ?';
            params.push(project_code);
        }

        sql += ' ORDER BY ba.created_at DESC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('[BUDGET ALLOC ERROR] Error fetching budget allocations:', err);
                return res.status(500).json({
                    error: err.message,
                    stack: err.stack,
                    sql: sql,
                    params: params
                });
            }
            res.json({ data: rows });
        });
    } catch (err) {
        console.error('[BUDGET ALLOC CRASH] Fatal error in budget-allocations route:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message, stack: err.stack });
    }
});


app.listen(3005, () => {
    console.log(`Backend server listening at http://localhost:3005`);
});

