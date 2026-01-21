const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'db_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Dropping budget tables to force recreation...");
    // Disable FKs temporarily to allow dropping tables with relationships
    db.run("PRAGMA foreign_keys = OFF");

    db.run("DROP TABLE IF EXISTS budget_allocations", (err) => {
        if (err) console.error("Error dropping budget_allocations:", err);
        else console.log("Dropped budget_allocations");
    });

    db.run("DROP TABLE IF EXISTS budget_estimates", (err) => {
        if (err) console.error("Error dropping budget_estimates:", err);
        else console.log("Dropped budget_estimates");
    });

    db.run("DROP TABLE IF EXISTS fund_sources", (err) => {
        if (err) console.error("Error dropping fund_sources:", err);
        else console.log("Dropped fund_sources");
    });

    db.run("PRAGMA foreign_keys = ON");
});

db.close(() => {
    console.log("Database connection closed. Please restart the server.");
});
