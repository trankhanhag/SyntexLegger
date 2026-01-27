const db = require('./database');

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Tables:', tables.map(t => t.name));
        }
    });

    db.all("SELECT * FROM db_schema_metadata LIMIT 1", (err, rows) => {
        if (err) console.error('Error querying db_schema_metadata:', err.message);
        else console.log('db_schema_metadata rows:', rows.length);
    });

    db.all("SELECT * FROM report_templates LIMIT 1", (err, rows) => {
        if (err) console.error('Error querying report_templates:', err.message);
        else console.log('report_templates rows:', rows.length);
    });
});
