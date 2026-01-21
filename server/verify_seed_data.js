const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'db.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }
});

const expectations = {
    partners: 20,
    products: 25,
    employees: 15,
    sales_orders: 30,
    purchase_orders: 30,
    projects: 10,
    fixed_assets: 10
};

async function verify() {
    console.log("Verifying seeded data counts...");
    let errors = 0;

    for (const [table, expected] of Object.entries(expectations)) {
        await new Promise((resolve) => {
            db.get(`SELECT count(*) as count FROM ${table}`, [], (err, row) => {
                if (err) {
                    // Start of table might not exist if seeding didn't run, check for that
                    if (err.message.includes('no such table')) {
                        console.error(`[FAIL] ${table}: Table does not exist.`);
                    } else {
                        console.error(`Error querying ${table}:`, err.message);
                    }
                    errors++;
                } else {
                    if (row.count >= expected) {
                        console.log(`[PASS] ${table}: ${row.count} records (expected >= ${expected})`);
                    } else {
                        console.error(`[FAIL] ${table}: ${row.count} records (expected >= ${expected})`);
                        errors++;
                    }
                }
                resolve();
            });
        });
    }

    db.close();
    if (errors > 0) {
        console.error("Verification failed with errors.");
        process.exit(1);
    } else {
        console.log("Verification completed successfully.");
    }
}

verify();
