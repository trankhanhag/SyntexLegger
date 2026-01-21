const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'db_v2.sqlite'));

db.serialize(() => {
    console.log("--- DEBUG START ---");

    // 1. Check User Schema and Data
    db.get("SELECT * FROM users WHERE username = 'admin'", (err, user) => {
        if (err) {
            console.error("User Query Error:", err);
        } else {
            console.log("Admin User:", user);
            if (user && user.company_id === undefined) {
                console.error("CRITICAL: company_id is MISSING from user object!");
            }
        }
    });

    // 2. Check if companies table exists (referenced by FK)
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'", (err, row) => {
        if (err) console.error("Check Companies Table Error:", err);
        else console.log("Companies Table Exists:", !!row);
    });

    // 3. Test the Budget Estimates Query exactly as in index.js
    const company_id = '1'; // Default from auth
    const fiscal_year = 2026;
    const chapter_code = '018';

    let sql = `SELECT be.*, fs.name as fund_source_name 
               FROM budget_estimates be
               LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
               WHERE be.company_id = ?`;
    let params = [company_id];

    // Add logic matching index.js
    sql += ' AND be.fiscal_year = ?';
    params.push(fiscal_year);

    sql += ' AND be.chapter_code = ?';
    params.push(chapter_code);

    console.log("Executing SQL:", sql);
    console.log("Params:", params);

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("SQL EXECUTION ERROR:", err);
        } else {
            console.log("Query Successful. Rows found:", rows.length);
        }
    });

    // 4. Check if we can insert (mocking the POST)
    // To verify FK constraints don't explode
});
