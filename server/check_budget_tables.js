const db = require('./database');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    const tables = rows.map(r => r.name);
    console.log("Tables:", tables);

    // Check for budget related table columns if any
    const budgetTables = tables.filter(t => t.includes('budget') || t.includes('estimate'));
    if (budgetTables.length > 0) {
        budgetTables.forEach(t => {
            db.all(`PRAGMA table_info(${t})`, [], (e, r) => {
                console.log(`Columns for ${t}:`, r);
            });
        });
    } else {
        console.log("No budget tables found.");
    }
});
