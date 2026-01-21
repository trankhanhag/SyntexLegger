const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

console.log(`Connected to database at ${dbPath}`);

db.serialize(() => {
    console.log("Starting database optimization (indexes)...");

    db.run("CREATE INDEX IF NOT EXISTS idx_gl_account_date ON general_ledger (account_code, trx_date)", (err) => {
        if (!err) console.log("Created index for General Ledger");
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_gl_doc_no ON general_ledger (doc_no)", (err) => {
        if (!err) console.log("Created index for General Ledger doc_no");
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_vouchers_date_type ON vouchers (doc_date, type)", (err) => {
        if (!err) console.log("Created index for Vouchers");
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_voucher_items_voucher ON voucher_items (voucher_id)", (err) => {
        if (!err) console.log("Created index for Voucher Items");
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_staging_batch_row ON staging_transactions (batch_id, row_index)", (err) => {
        if (!err) console.log("Created index for Staging Transactions");
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Database optimization completed.');
});
