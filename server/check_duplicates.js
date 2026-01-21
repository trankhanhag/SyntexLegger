const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../db.sqlite');

db.all("SELECT account_code, COUNT(*) as count FROM chart_of_accounts GROUP BY account_code HAVING count > 1", [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Duplicate accounts:', rows);
        console.log('Total duplicates:', rows.length);
    }
    db.close();
});
