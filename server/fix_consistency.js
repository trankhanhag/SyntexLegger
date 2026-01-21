const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'db.sqlite');

const db = new sqlite3.Database(dbPath);

async function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function get(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Ensure partners exist
const partners = [
    { code: 'KH001', name: 'Công ty A' },
    { code: 'KH002', name: 'Công ty B' },
    { code: 'KH003', name: 'Công ty C' }
];

async function main() {
    console.log("--- STARTING CONSISTENCY RESEED ---");

    // 1. Clear relevant GL and Debt Data
    console.log("1. Clearing inconsistent data...");
    await runQuery("DELETE FROM general_ledger WHERE account_code LIKE '131%'");
    await runQuery("DELETE FROM partners WHERE partner_code IN ('KH001', 'KH002', 'KH003')");

    // 2. Insert Test Partners
    console.log("2. Creating Standard Partners...");
    for (const p of partners) {
        await runQuery("INSERT OR REPLACE INTO partners (partner_code, partner_name, tax_code) VALUES (?, ?, 'MST001')", [p.code, p.name]);
    }

    // 3. Create Controlled Vouchers
    console.log("3. Creating Controlled Vouchers...");
    const currentDate = new Date().toISOString().split('T')[0];

    const entries = [
        { partner: 'KH001', amount: 5000000, desc: 'Bán hàng KH A' },
        { partner: 'KH002', amount: 3000000, desc: 'Bán hàng KH B' },
        { partner: 'KH001', amount: 2000000, desc: 'Bán hàng KH A lần 2' }
    ];

    let totalCheck = 0;

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const id = `AUTO_SEED_${Date.now()}_${i}`;

        // Post to GL
        // Dr 131 (partner specific) / Cr 511
        await runQuery(`
            INSERT INTO general_ledger 
            (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, currentDate, currentDate, `AR-${i + 1}`, e.desc,
            '131', '511', e.amount, 0, e.partner // CRITICAL: partner_code provided
        ]);

        totalCheck += e.amount;
    }

    // Verify
    const sumGL = await get("SELECT SUM(debit_amount - credit_amount) as val FROM general_ledger WHERE account_code LIKE '131%'");
    console.log(`\n   > Total GL Check 131: ${sumGL.val} (Expected: ${totalCheck})`);

    // Verify by Partner in GL
    const sumPart = await get("SELECT SUM(debit_amount - credit_amount) as val FROM general_ledger WHERE account_code LIKE '131%' AND partner_code IS NOT NULL");
    console.log(`   > Total Partner Sum: ${sumPart.val}`);

    if (sumGL.val === sumPart.val) {
        console.log("\n✅ SUCCESS: Data is now internally consistent.");
    } else {
        console.error("\n❌ ERROR: Data mismatch persists.");
    }

    db.close();
}

main();
