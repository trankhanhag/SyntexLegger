const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite');

db.serialize(() => {
    db.all("SELECT DISTINCT type FROM vouchers", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Distinct Types:", rows);
        }
    });

    db.all("SELECT id, type, doc_date FROM vouchers LIMIT 10", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Sample Vouchers:", rows);
        }
    });
});

db.close();
