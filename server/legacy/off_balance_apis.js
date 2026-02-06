/**
 * Off-Balance Tracking APIs
 * SyntexHCSN - Theo dõi tài khoản ngoài bảng theo TT 24/2024
 */

function getOffBalanceLogs(db) {
    return (req, res) => {
        const { account_code, from, to } = req.query;

        let sql = 'SELECT * FROM off_balance_tracking WHERE 1=1';
        const params = [];

        if (account_code) {
            sql += ' AND account_code = ?';
            params.push(account_code);
        }

        if (from) {
            sql += ' AND transaction_date >= ?';
            params.push(from);
        }

        if (to) {
            sql += ' AND transaction_date <= ?';
            params.push(to);
        }

        sql += ' ORDER BY transaction_date DESC, id DESC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get off-balance logs error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

function createOffBalanceLog(db) {
    return (req, res) => {
        const { account_code, transaction_date, doc_no, description, increase_amount, decrease_amount } = req.body;

        if (!account_code || !transaction_date || !doc_no) {
            return res.status(400).json({ error: 'Missing required fields: account_code, transaction_date, doc_no' });
        }

        // Calculate balance (simplified for now, ideally fetch last balance or calculate)
        // For a true ledger, we'd sum all previous or use a running balance pattern.
        // For this API, we'll just insert and let the report calculate running balance if needed, 
        // but the table has a balance column. Let's try to calculate it.

        db.get('SELECT balance FROM off_balance_tracking WHERE account_code = ? ORDER BY transaction_date DESC, id DESC LIMIT 1', [account_code], (err, row) => {
            if (err) {
                console.error('Get last balance error:', err);
                return res.status(500).json({ error: err.message });
            }

            const lastBalance = row ? row.balance : 0;
            const newBalance = lastBalance + (increase_amount || 0) - (decrease_amount || 0);

            const sql = `INSERT INTO off_balance_tracking 
                (account_code, transaction_date, doc_no, description, increase_amount, decrease_amount, balance, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [
                account_code,
                transaction_date,
                doc_no,
                description,
                increase_amount || 0,
                decrease_amount || 0,
                newBalance,
                new Date().toISOString()
            ], function (err) {
                if (err) {
                    console.error('Create off-balance log error:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ id: this.lastID, balance: newBalance });
            });
        });
    };
}

function getOffBalanceSummary(db) {
    return (req, res) => {
        const sql = `
            SELECT account_code, 
                   SUM(increase_amount) as total_increase, 
                   SUM(decrease_amount) as total_decrease,
                   (SUM(increase_amount) - SUM(decrease_amount)) as current_balance
            FROM off_balance_tracking
            GROUP BY account_code
        `;

        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('Get off-balance summary error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

module.exports = {
    getOffBalanceLogs,
    createOffBalanceLog,
    getOffBalanceSummary
};
