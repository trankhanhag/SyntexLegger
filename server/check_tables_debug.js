const db = require('./database');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", [], (err, tables) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Tables:', tables.map(t => t.name));

    // Check specific columns of financial_notes if it exists
    if (tables.find(t => t.name === 'financial_notes')) {
        db.all("PRAGMA table_info(financial_notes)", [], (err, cols) => {
            console.log('financial_notes columns:', cols.map(c => c.name));
        });
    } else {
        console.log('financial_notes table MISSING');
    }
});
