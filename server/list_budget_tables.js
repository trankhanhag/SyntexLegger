const db = require('./database');

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%budget%'", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Budget Tables:", rows.map(r => r.name));
});
