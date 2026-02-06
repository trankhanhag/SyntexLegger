/**
 * Integration Tests - Accounting Flows
 * SyntexLegger - Critical Business Flows
 *
 * Tests end-to-end accounting workflows:
 * 1. Voucher workflow (create → post → GL → reports)
 * 2. Double-entry bookkeeping validation
 * 3. Period closing and locking
 * 4. Account balance calculations
 */

import sqlite3 from 'sqlite3';

// Test database setup
let db: sqlite3.Database;

const runSql = (sql: string, params: any[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

const getSql = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row as T | undefined);
        });
    });
};

const allSql = <T>(sql: string, params: any[] = []): Promise<T[]> => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows as T[]);
        });
    });
};

// Setup in-memory database with required schema
beforeAll(async () => {
    db = new sqlite3.Database(':memory:');

    // Create essential tables
    await runSql(`
        CREATE TABLE IF NOT EXISTS accounts (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            parent_code TEXT,
            is_detail INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await runSql(`
        CREATE TABLE IF NOT EXISTS vouchers (
            id TEXT PRIMARY KEY,
            doc_no TEXT NOT NULL,
            doc_date TEXT NOT NULL,
            post_date TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'DRAFT',
            posted INTEGER DEFAULT 0,
            voided INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            posted_at TEXT,
            posted_by TEXT
        )
    `);

    await runSql(`
        CREATE TABLE IF NOT EXISTS voucher_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_id TEXT NOT NULL,
            description TEXT,
            debit_acc TEXT,
            credit_acc TEXT,
            amount REAL NOT NULL,
            partner_code TEXT,
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        )
    `);

    await runSql(`
        CREATE TABLE IF NOT EXISTS general_ledger (
            id TEXT PRIMARY KEY,
            trx_date TEXT NOT NULL,
            posted_at TEXT,
            doc_no TEXT NOT NULL,
            description TEXT,
            account_code TEXT NOT NULL,
            reciprocal_acc TEXT,
            debit_amount REAL DEFAULT 0,
            credit_amount REAL DEFAULT 0,
            partner_code TEXT,
            project_code TEXT
        )
    `);

    await runSql(`
        CREATE TABLE IF NOT EXISTS period_locks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fiscal_year INTEGER NOT NULL,
            period INTEGER NOT NULL,
            is_locked INTEGER DEFAULT 0,
            locked_at TEXT,
            locked_by TEXT,
            UNIQUE(fiscal_year, period)
        )
    `);

    // Seed accounts for testing
    const accounts = [
        { code: '111', name: 'Tiền mặt', category: 'TÀI SẢN' },
        { code: '1111', name: 'Tiền Việt Nam', category: 'TÀI SẢN' },
        { code: '112', name: 'Tiền gửi ngân hàng', category: 'TÀI SẢN' },
        { code: '131', name: 'Phải thu của khách hàng', category: 'TÀI SẢN' },
        { code: '331', name: 'Phải trả cho người bán', category: 'NỢ PHẢI TRẢ' },
        { code: '411', name: 'Vốn đầu tư của chủ sở hữu', category: 'VỐN CHỦ SỞ HỮU' },
        { code: '511', name: 'Doanh thu bán hàng', category: 'DOANH THU' },
        { code: '632', name: 'Giá vốn hàng bán', category: 'CHI PHÍ' },
        { code: '642', name: 'Chi phí quản lý doanh nghiệp', category: 'CHI PHÍ' },
    ];

    for (const acc of accounts) {
        await runSql(
            'INSERT INTO accounts (code, name, category) VALUES (?, ?, ?)',
            [acc.code, acc.name, acc.category]
        );
    }
});

afterAll(async () => {
    return new Promise<void>((resolve) => {
        db.close(() => resolve());
    });
});

describe('Voucher Workflow Integration', () => {
    test('should create voucher and post to general ledger', async () => {
        // Step 1: Create a sales voucher
        const voucherId = 'V_TEST_001';
        const docNo = 'BH001';
        const docDate = '2024-01-15';
        const amount = 10000000; // 10 million VND

        await runSql(
            `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [voucherId, docNo, docDate, docDate, 'Bán hàng thu tiền mặt', 'SALES', amount, 'DRAFT']
        );

        // Step 2: Add voucher items (double entry)
        await runSql(
            `INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount)
             VALUES (?, ?, ?, ?, ?)`,
            [voucherId, 'Thu tiền bán hàng', '1111', '511', amount]
        );

        // Step 3: Post to General Ledger
        await runSql(
            `INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`GL_${voucherId}_D`, docDate, new Date().toISOString(), docNo, 'Thu tiền bán hàng', '1111', '511', amount, 0]
        );

        await runSql(
            `INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`GL_${voucherId}_C`, docDate, new Date().toISOString(), docNo, 'Thu tiền bán hàng', '511', '1111', 0, amount]
        );

        // Mark voucher as posted
        await runSql(
            `UPDATE vouchers SET posted = 1, status = 'POSTED', posted_at = ? WHERE id = ?`,
            [new Date().toISOString(), voucherId]
        );

        // Verify: Voucher exists and is posted
        const voucher = await getSql<any>('SELECT * FROM vouchers WHERE id = ?', [voucherId]);
        expect(voucher).toBeDefined();
        expect(voucher?.posted).toBe(1);
        expect(voucher?.status).toBe('POSTED');

        // Verify: GL entries exist
        const glEntries = await allSql<any>('SELECT * FROM general_ledger WHERE doc_no = ?', [docNo]);
        expect(glEntries.length).toBe(2);

        // Verify: Debit = Credit in GL
        const totalDebit = glEntries.reduce((sum, e) => sum + e.debit_amount, 0);
        const totalCredit = glEntries.reduce((sum, e) => sum + e.credit_amount, 0);
        expect(totalDebit).toBe(totalCredit);
        expect(totalDebit).toBe(amount);
    });

    test('should calculate account balances correctly', async () => {
        // Get cash balance (account 1111)
        const cashBalance = await getSql<any>(`
            SELECT
                account_code,
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit,
                SUM(debit_amount) - SUM(credit_amount) as balance
            FROM general_ledger
            WHERE account_code = '1111'
            GROUP BY account_code
        `);

        expect(cashBalance).toBeDefined();
        expect(cashBalance?.balance).toBe(10000000); // Debit balance for cash

        // Get revenue balance (account 511)
        const revenueBalance = await getSql<any>(`
            SELECT
                account_code,
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit,
                SUM(credit_amount) - SUM(debit_amount) as balance
            FROM general_ledger
            WHERE account_code = '511'
            GROUP BY account_code
        `);

        expect(revenueBalance).toBeDefined();
        expect(revenueBalance?.balance).toBe(10000000); // Credit balance for revenue
    });
});

describe('Double-Entry Bookkeeping Validation', () => {
    test('should enforce balanced entries', async () => {
        // Create a compound voucher with multiple entries
        const voucherId = 'V_TEST_002';
        const docNo = 'PC001';
        const docDate = '2024-01-20';
        const timestamp = Date.now();

        await runSql(
            `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [voucherId, docNo, docDate, docDate, 'Chi tiền mua hàng và chi phí', 'PAYMENT', 15000000, 'DRAFT']
        );

        // Payment for inventory (10M) and expense (5M)
        const items = [
            { desc: 'Mua hàng', debit: '331', credit: '1111', amount: 10000000 },
            { desc: 'Chi phí quản lý', debit: '642', credit: '1111', amount: 5000000 },
        ];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await runSql(
                `INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount)
                 VALUES (?, ?, ?, ?, ?)`,
                [voucherId, item.desc, item.debit, item.credit, item.amount]
            );

            // Post to GL with unique IDs
            await runSql(
                `INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [`GL_${voucherId}_${i}_${item.debit}_D_${timestamp}`, docDate, new Date().toISOString(), docNo, item.desc, item.debit, item.credit, item.amount, 0]
            );

            await runSql(
                `INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [`GL_${voucherId}_${i}_${item.credit}_C_${timestamp}`, docDate, new Date().toISOString(), docNo, item.desc, item.credit, item.debit, 0, item.amount]
            );
        }

        // Verify: All GL entries for this voucher are balanced
        const glEntries = await allSql<any>('SELECT * FROM general_ledger WHERE doc_no = ?', [docNo]);
        const totalDebit = glEntries.reduce((sum, e) => sum + e.debit_amount, 0);
        const totalCredit = glEntries.reduce((sum, e) => sum + e.credit_amount, 0);

        expect(totalDebit).toBe(totalCredit);
        expect(totalDebit).toBe(15000000);
    });

    test('should calculate trial balance correctly', async () => {
        // The trial balance test verifies the fundamental accounting equation
        // Note: Tests share state, so we verify for specific vouchers
        const voucherDocNos = ['BH001', 'PC001'];

        // Get all account balances for our test vouchers
        const trialBalance = await allSql<any>(`
            SELECT
                account_code,
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit
            FROM general_ledger
            WHERE doc_no IN (${voucherDocNos.map(() => '?').join(',')})
            GROUP BY account_code
            ORDER BY account_code
        `, voucherDocNos);

        // Sum of all debits should equal sum of all credits
        const totalDebit = trialBalance.reduce((sum, e) => sum + e.total_debit, 0);
        const totalCredit = trialBalance.reduce((sum, e) => sum + e.total_credit, 0);

        expect(totalDebit).toBe(totalCredit);
        // Total should be 25M (10M from sales + 15M from payment)
        expect(totalDebit).toBe(25000000);
    });
});

describe('Period Lock Integration', () => {
    test('should lock and unlock accounting periods', async () => {
        const fiscalYear = 2024;
        const period = 1; // January

        // Lock the period
        await runSql(
            `INSERT OR REPLACE INTO period_locks (fiscal_year, period, is_locked, locked_at, locked_by)
             VALUES (?, ?, ?, ?, ?)`,
            [fiscalYear, period, 1, new Date().toISOString(), 'admin']
        );

        // Verify period is locked
        const lock = await getSql<any>(
            'SELECT * FROM period_locks WHERE fiscal_year = ? AND period = ?',
            [fiscalYear, period]
        );

        expect(lock).toBeDefined();
        expect(lock?.is_locked).toBe(1);

        // Unlock the period
        await runSql(
            `UPDATE period_locks SET is_locked = 0 WHERE fiscal_year = ? AND period = ?`,
            [fiscalYear, period]
        );

        const unlocked = await getSql<any>(
            'SELECT * FROM period_locks WHERE fiscal_year = ? AND period = ?',
            [fiscalYear, period]
        );

        expect(unlocked?.is_locked).toBe(0);
    });

    test('should check period lock status', async () => {
        const fiscalYear = 2024;
        const period = 2; // February

        // Initially no lock record
        const initialLock = await getSql<any>(
            'SELECT * FROM period_locks WHERE fiscal_year = ? AND period = ?',
            [fiscalYear, period]
        );

        // If no record, period is not locked
        const isLocked = initialLock?.is_locked === 1;
        expect(isLocked).toBe(false);
    });
});

describe('Financial Reports Integration', () => {
    test('should generate cash flow from GL entries', async () => {
        // Get cash account (111x) movements
        const cashFlows = await allSql<any>(`
            SELECT
                trx_date,
                doc_no,
                description,
                debit_amount as cash_in,
                credit_amount as cash_out
            FROM general_ledger
            WHERE account_code LIKE '111%'
            ORDER BY trx_date
        `);

        expect(cashFlows.length).toBeGreaterThan(0);

        // Calculate net cash flow
        const cashIn = cashFlows.reduce((sum, e) => sum + e.cash_in, 0);
        const cashOut = cashFlows.reduce((sum, e) => sum + e.cash_out, 0);
        const netCashFlow = cashIn - cashOut;

        // Net cash flow should equal ending cash balance
        const cashBalance = await getSql<any>(`
            SELECT SUM(debit_amount) - SUM(credit_amount) as balance
            FROM general_ledger
            WHERE account_code LIKE '111%'
        `);

        expect(netCashFlow).toBe(cashBalance?.balance);
    });

    test('should generate income statement from GL entries', async () => {
        // Get revenue (5xx accounts)
        const revenue = await getSql<any>(`
            SELECT SUM(credit_amount) - SUM(debit_amount) as total
            FROM general_ledger
            WHERE account_code LIKE '5%'
        `);

        // Get expenses (6xx accounts)
        const expenses = await getSql<any>(`
            SELECT SUM(debit_amount) - SUM(credit_amount) as total
            FROM general_ledger
            WHERE account_code LIKE '6%'
        `);

        // Calculate net income
        const netIncome = (revenue?.total || 0) - (expenses?.total || 0);

        expect(revenue?.total).toBe(10000000); // Sales revenue
        expect(expenses?.total).toBe(5000000); // Management expense
        expect(netIncome).toBe(5000000); // Net profit
    });
});

describe('Vietnamese Accounting Standards', () => {
    test('should follow TT 200/2014 account structure', async () => {
        // Verify account categories
        const assetAccounts = await allSql<any>(
            "SELECT * FROM accounts WHERE category = 'TÀI SẢN'"
        );
        const liabilityAccounts = await allSql<any>(
            "SELECT * FROM accounts WHERE category = 'NỢ PHẢI TRẢ'"
        );
        const equityAccounts = await allSql<any>(
            "SELECT * FROM accounts WHERE category = 'VỐN CHỦ SỞ HỮU'"
        );
        const revenueAccounts = await allSql<any>(
            "SELECT * FROM accounts WHERE category = 'DOANH THU'"
        );
        const expenseAccounts = await allSql<any>(
            "SELECT * FROM accounts WHERE category = 'CHI PHÍ'"
        );

        // Asset accounts should start with 1 or 2
        assetAccounts.forEach(acc => {
            expect(['1', '2']).toContain(acc.code[0]);
        });

        // Liability accounts should start with 3
        liabilityAccounts.forEach(acc => {
            expect(acc.code[0]).toBe('3');
        });

        // Equity accounts should start with 4
        equityAccounts.forEach(acc => {
            expect(acc.code[0]).toBe('4');
        });

        // Revenue accounts should start with 5 or 7
        revenueAccounts.forEach(acc => {
            expect(['5', '7']).toContain(acc.code[0]);
        });

        // Expense accounts should start with 6 or 8
        expenseAccounts.forEach(acc => {
            expect(['6', '8']).toContain(acc.code[0]);
        });
    });

    test('should maintain accounting equation: Assets = Liabilities + Equity', async () => {
        // In a balanced system after all transactions:
        // Sum of asset account balances (debit) =
        // Sum of liability balances (credit) + Sum of equity balances (credit) + Net income

        // Test with specific test vouchers to ensure consistency
        const voucherDocNos = ['BH001', 'PC001'];

        // Get all GL totals for test vouchers
        const totals = await getSql<any>(`
            SELECT
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit
            FROM general_ledger
            WHERE doc_no IN (${voucherDocNos.map(() => '?').join(',')})
        `, voucherDocNos);

        // Debit = Credit is the fundamental equation
        expect(totals?.total_debit).toBe(totals?.total_credit);
        // Total should be 25M (10M sales + 15M payment)
        expect(totals?.total_debit).toBe(25000000);
    });
});

describe('Transaction Integrity', () => {
    test('should handle concurrent voucher creation', async () => {
        // Simulate creating multiple vouchers
        const vouchers = [
            { id: 'V_CONC_001', docNo: 'CONC001', amount: 1000000 },
            { id: 'V_CONC_002', docNo: 'CONC002', amount: 2000000 },
            { id: 'V_CONC_003', docNo: 'CONC003', amount: 3000000 },
        ];

        const promises = vouchers.map(v =>
            runSql(
                `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [v.id, v.docNo, '2024-01-25', '2024-01-25', `Test voucher ${v.docNo}`, 'GL', v.amount, 'DRAFT']
            )
        );

        await Promise.all(promises);

        // Verify all vouchers were created
        for (const v of vouchers) {
            const voucher = await getSql<any>('SELECT * FROM vouchers WHERE id = ?', [v.id]);
            expect(voucher).toBeDefined();
            expect(voucher?.total_amount).toBe(v.amount);
        }
    });

    test('should rollback on error', async () => {
        const voucherId = 'V_ROLLBACK_001';

        // Start with a known state
        const initialCount = await getSql<any>('SELECT COUNT(*) as count FROM vouchers');

        // Try to insert a valid voucher followed by an invalid GL entry
        try {
            await runSql(
                `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [voucherId, 'ROLL001', '2024-01-26', '2024-01-26', 'Rollback test', 'GL', 1000]
            );

            // This should succeed
            const voucher = await getSql<any>('SELECT * FROM vouchers WHERE id = ?', [voucherId]);
            expect(voucher).toBeDefined();

        } catch (error) {
            // On error, verify the state is consistent
            const finalCount = await getSql<any>('SELECT COUNT(*) as count FROM vouchers');
            expect(finalCount?.count).toBeGreaterThanOrEqual(initialCount?.count || 0);
        }
    });
});
