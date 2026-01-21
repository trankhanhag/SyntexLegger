const db = require('./database');
const fiscal_year = "2026";

const sql = `SELECT 
    be.id as budget_id,
    be.item_name as category_name,
    be.estimate_type,
    be.allocated_amount as budget_amount,
    COALESCE(SUM(r.amount), 0) as actual_amount,
    be.allocated_amount - COALESCE(SUM(r.amount), 0) as variance,
    ROUND(COALESCE(SUM(r.amount), 0) * 100.0 / NULLIF(be.allocated_amount, 0), 2) as completion_percentage
    FROM budget_estimates be
    LEFT JOIN revenue_receipts r ON be.id = r.budget_estimate_id 
        AND r.fiscal_year = be.fiscal_year
    WHERE be.fiscal_year = ? AND be.budget_type = 'REVENUE'
    GROUP BY be.id, be.item_name, be.estimate_type, be.allocated_amount
    ORDER BY be.estimate_type, be.item_name`;

db.all(sql, [fiscal_year], (err, rows) => {
    if (err) {
        console.error('SQL Error:', err.message);
        process.exit(1);
    }
    console.log('Result rows:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
});
