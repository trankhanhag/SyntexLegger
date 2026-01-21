const db = require('./database');

db.all("PRAGMA table_info(budget_estimates)", [], (err, rows) => {
    if (err) {
        console.error('Error getting table info:', err);
        process.exit(1);
    }
    console.log('Columns in budget_estimates:');
    rows.forEach(row => console.log(`- ${row.name} (${row.type})`));

    db.all("SELECT COUNT(*) as count FROM budget_estimates WHERE budget_type = 'REVENUE'", [], (err, rows) => {
        if (err) {
            console.error('Error counting revenue budgets:', err.message);
        } else {
            console.log('Revenue budget count:', rows[0].count);
        }

        db.all("SELECT * FROM budget_estimates WHERE fiscal_year = 2026", [], (err, rows) => {
            if (err) {
                console.error('Error selecting 2026 budgets:', err.message);
            } else {
                console.log('Budgets for 2026:', rows.length);
                rows.forEach(r => console.log(JSON.stringify(r)));
            }
            process.exit(0);
        });
    });
});
