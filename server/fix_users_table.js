const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'db_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Dropping users table to force recreation with new schema...");
    db.run("PRAGMA foreign_keys = OFF");
    db.run("DROP TABLE IF EXISTS users", (err) => {
        if (err) console.error("Error dropping users:", err);
        else console.log("Dropped users table.");
    });
    db.run("PRAGMA foreign_keys = ON");
});

db.close(() => {
    console.log("Done. Please restart server to recreate users table and seed admin.");
});
