const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../db.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("Resetting to single-tenant schema/data...");

const tables = [
    'allocations', 'checklist_tasks', 'staging_transactions',
    'general_ledger', 'voucher_items', 'vouchers',
    'debt_notes', 'loan_contracts', 'contract_appendices', 'contracts',
    'sales_orders', 'sales_invoices', 'purchase_orders', 'purchase_invoices',
    'project_budget_lines', 'project_tasks', 'projects',
    'partners', 'employees', 'products', 'fixed_assets', 'budgets',
    'chart_of_accounts', 'ccdc_items', 'payroll', 'timekeeping'
];

const wipeSql = [
    "PRAGMA foreign_keys = OFF;",
    "DROP TABLE IF EXISTS user_companies;",
    "DROP TABLE IF EXISTS companies;",
    ...tables.map(t => `DELETE FROM ${t};`)
].join('\n');

db.exec(wipeSql, (err) => {
    if (err) {
        console.error("Wipe failed:", err);
        process.exit(1);
    }
    console.log("Wiped all data. System is now single-tenant.");

    db.serialize(() => {
        seedSingleTenant();
    });
});

function seedSingleTenant() {
    console.log("Seeding default data...");

    const stmtAcc = db.prepare("INSERT INTO chart_of_accounts (account_code, account_name) VALUES (?, ?)");
    const accounts = [
        ['1111', 'Tien mat'],
        ['1121', 'Tien gui NH'],
        ['131', 'Phai thu KH'],
        ['331', 'Phai tra NB'],
        ['511', 'Doanh thu'],
        ['632', 'Gia von'],
        ['642', 'Chi phi QLDN'],
        ['421', 'Loi nhuan chua phan phoi']
    ];
    accounts.forEach(a => stmtAcc.run(a[0], a[1]));
    stmtAcc.finalize();

    const stmtPart = db.prepare("INSERT INTO partners (partner_code, partner_name) VALUES (?, ?)");
    stmtPart.run('KH001', 'Khach hang A');
    stmtPart.run('NCC001', 'Nha cung cap X');
    stmtPart.finalize();

    const voucherId = `V_${Date.now()}`;
    db.run(
        "INSERT INTO vouchers (id, doc_no, doc_date, type, total_amount, description) VALUES (?,?,?,?,?,?)",
        [voucherId, 'INV-001', '2024-01-10', 'SALES_INVOICE', 15000000, 'Doanh thu ban hang T1']
    );

    db.run(
        "INSERT INTO general_ledger (id, trx_date, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount) VALUES (?,?,?,?,?,?,?,?)",
        [`GL_${voucherId}_1`, '2024-01-10', 'INV-001', 'Doanh thu ban hang T1', '131', '511', 15000000, 0]
    );
    db.run(
        "INSERT INTO general_ledger (id, trx_date, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount) VALUES (?,?,?,?,?,?,?,?)",
        [`GL_${voucherId}_2`, '2024-01-10', 'INV-001', 'Doanh thu ban hang T1', '511', '131', 0, 15000000]
    );

    console.log("Seeding complete.");
}

setTimeout(() => db.close(), 2000);
