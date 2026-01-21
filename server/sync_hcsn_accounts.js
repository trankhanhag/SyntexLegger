const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'db_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const { ALL_ACCOUNTS_TT24 } = require('./hcsn_tt24_accounts');

db.serialize(() => {
    console.log("Syncing accounts in db_v2.sqlite...");

    // Step 1: Migration - add columns sequentially
    db.run("ALTER TABLE chart_of_accounts ADD COLUMN type TEXT", (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log("Column 'type' might already exist or error:", err.message);
        }
    });
    db.run("ALTER TABLE chart_of_accounts ADD COLUMN tt24_class TEXT", (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log("Column 'tt24_class' might already exist or error:", err.message);
        }
    });

    // Step 2: Insert data after migrations
    db.run("SELECT 1", [], (err) => { // This ensures previous runs are finished in serialize
        console.log("Starting data insertion...");
        const stmt = db.prepare("INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, category, type, tt24_class) VALUES (?, ?, ?, ?, ?)");
        ALL_ACCOUNTS_TT24.forEach(acc => {
            stmt.run(acc.code, acc.name, acc.category, acc.type, acc.tt24_class);
        });
        stmt.finalize();
        console.log("Synchronized " + ALL_ACCOUNTS_TT24.length + " HCSN accounts.");
    });

    // Update system_settings
    db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('accounting_regime', 'CIRCULAR_24_2024')");
    db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('app_brand', 'SyntexHCSN')");
});
