const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db_v2.sqlite');

const fiscal_year = '2026';
const sql = `SELECT 
    be.id as budget_id,
    be.item_name as category_name,
    be.estimate_type,
    be.allocated_amount as budget_amount,
    COALESCE(SUM(v.amount), 0) as actual_amount,
    be.allocated_amount - COALESCE(SUM(v.amount), 0) as variance,
    ROUND(COALESCE(SUM(v.amount), 0) * 100.0 / NULLIF(be.allocated_amount, 0), 2) as completion_percentage
    FROM budget_estimates be
    LEFT JOIN expense_vouchers v ON be.id = v.budget_estimate_id 
        AND v.fiscal_year = be.fiscal_year
    WHERE be.fiscal_year = ? AND be.budget_type = 'EXPENSE'
    GROUP BY be.id, be.item_name, be.estimate_type, be.allocated_amount
    ORDER BY be.estimate_type, be.item_name`;

db.all(sql, [fiscal_year], (err, rows) => {
    if (err) {
        console.error("SQL_ERROR:", err.message);
        process.exit(1);
    }
    console.log("SUCCESS:", rows.length, "rows found");
    db.close();
});
