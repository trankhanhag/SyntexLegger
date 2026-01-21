const db = require('./database');

db.run("ALTER TABLE revenue_receipts ADD COLUMN document_type TEXT DEFAULT 'RECEIPT'", (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column document_type already exists.');
        } else {
            console.error('Error adding column:', err.message);
            process.exit(1);
        }
    } else {
        console.log('Column document_type added successfully.');
    }

    db.all("PRAGMA table_info(revenue_receipts)", [], (err, rows) => {
        if (err) {
            console.error('Error checking schema:', err);
            process.exit(1);
        }
        console.log('Current columns:');
        rows.forEach(r => console.log(`- ${r.name}`));
        process.exit(0);
    });
});
