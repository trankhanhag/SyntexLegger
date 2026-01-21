const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db_v2.sqlite');

const types = ['YEARLY', 'ADDITIONAL', 'ADJUSTMENT', 'RECURRENT', 'NON_RECURRENT', 'CAPEX'];
db.all(`SELECT estimate_type, COUNT(*) as count FROM budget_estimates WHERE estimate_type IN (${types.map(t => `'${t}'`).join(',')}) GROUP BY estimate_type`, [], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    rows.forEach(r => console.log(`${r.estimate_type}: ${r.count}`));
    db.close();
});
