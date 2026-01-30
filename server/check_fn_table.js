const db = require('./database');

db.get("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='financial_notes'", [], (err, row) => {
    if (err) {
        console.error("Error checking table:", err);
        return;
    }
    if (row.count > 0) {
        console.log("Table financial_notes EXISTS");
        db.all("SELECT * FROM financial_notes LIMIT 5", [], (err, rows) => {
            console.log("Data count:", rows ? rows.length : 0);
            if (rows && rows.length > 0) {
                console.log("Sample data:", JSON.stringify(rows[0]));
            } else {
                console.log("Table is EMPTY");
            }
        });
    } else {
        console.log("Table financial_notes DOES NOT EXIST");
    }
});
