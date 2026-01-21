const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const USERNAME = process.env.DEFAULT_ADMIN_USER || 'admin';
const PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';

let token = '';

async function login() {
    try {
        console.log("1. Logging in...");
        const res = await axios.post('http://localhost:3000/api/login', { username: USERNAME, password: PASSWORD });
        token = res.data.token;
        console.log("   ✅ Login successful.");
    } catch (e) {
        console.error("   ❌ Login failed:", e.message);
        process.exit(1);
    }
}

async function runTest() {
    await login();

    const headers = { Authorization: `Bearer ${token}` };
    const date = new Date().toISOString().split('T')[0];
    const uniqueId = Date.now();

    // --- TEST 1: Purchase Order (Should NOT Post to GL) ---
    console.log("\n2. Testing Purchase Order (Expect NO GL)...");
    const poId = `TEST_PO_${uniqueId}`;
    await axios.post(`${API_URL}/vouchers`, {
        id: poId,
        doc_no: `PO-${uniqueId}`,
        doc_date: date,
        post_date: date,
        description: 'Test PO',
        type: 'PURCHASE_ORDER',
        total_amount: 1000,
        lines: [{ description: 'Item 1', debitAcc: '1561', creditAcc: '331', amount: 1000 }]
    }, { headers });

    // Check GL
    const glResPO = await axios.get(`${API_URL}/reports/general-ledger?account_code=1561&from=${date}&to=${date}`, { headers });
    const poEntry = glResPO.data.find(r => r.doc_no === `PO-${uniqueId}`);
    if (!poEntry) console.log("   ✅ Purchase Order correctly skipped GL posting.");
    else console.error("   ❌ ERROR: Purchase Order posted to GL!");


    // --- TEST 2: Purchase Invoice (Should Post to GL) ---
    console.log("\n3. Testing Purchase Invoice (Expect GL Post)...");
    const piId = `TEST_PI_${uniqueId}`;
    await axios.post(`${API_URL}/vouchers`, {
        id: piId,
        doc_no: `PI-${uniqueId}`,
        doc_date: date,
        post_date: date,
        description: 'Test PI',
        type: 'PURCHASE_INVOICE',
        total_amount: 5000,
        lines: [{ description: 'Steel', debitAcc: '1561', creditAcc: '331', amount: 5000 }]
    }, { headers });

    // Check GL
    const glResPI = await axios.get(`${API_URL}/reports/general-ledger?account_code=1561&from=${date}&to=${date}`, { headers });
    const piEntry = glResPI.data.find(r => r.doc_no === `PI-${uniqueId}`);
    if (piEntry && piEntry.debit_amount === 5000) console.log("   ✅ Purchase Invoice posted correctly (Dr 1561: 5000).");
    else console.error("   ❌ ERROR: Purchase Invoice missing or incorrect in GL.");


    // --- TEST 3: Sales Invoice with Inventory (Dual Posting) ---
    console.log("\n4. Testing Sales Invoice + Inventory (Review Revenue & COGS)...");
    const siId = `TEST_SI_${uniqueId}`;
    const revenueAmount = 10000;
    const costAmount = 6000;

    await axios.post(`${API_URL}/vouchers`, {
        id: siId,
        doc_no: `SI-${uniqueId}`,
        doc_date: date,
        post_date: date,
        description: 'Test Sales with Stock',
        type: 'SALES_INVOICE',
        total_amount: revenueAmount,
        include_inventory: true, // TRIGGER KEY
        lines: [{
            description: 'Good A',
            debitAcc: '131',
            creditAcc: '5111',
            amount: revenueAmount,
            cost_price: costAmount // COGS VALUE
        }]
    }, { headers });

    // Check GL - Revenue Side
    const glResRev = await axios.get(`${API_URL}/reports/general-ledger?account_code=5111&from=${date}&to=${date}`, { headers });
    const revEntry = glResRev.data.find(r => r.doc_no === `SI-${uniqueId}`);
    if (revEntry && revEntry.credit_amount === revenueAmount) console.log("   ✅ Revenue posted correctly (Cr 5111).");
    else console.error("   ❌ ERROR: Revenue entry missing.");

    // Check GL - COGS Side
    const glResCOGS = await axios.get(`${API_URL}/reports/general-ledger?account_code=632&from=${date}&to=${date}`, { headers });
    const cogsEntry = glResCOGS.data.find(r => r.doc_no === `SI-${uniqueId}`);

    if (cogsEntry && cogsEntry.debit_amount === costAmount) {
        console.log(`   ✅ COGS posted correctly (Dr 632: ${costAmount}).`);
    } else {
        console.error(`   ❌ ERROR: COGS entry missing. Expected Dr 632 = ${costAmount}.`);
    }

    // Check GL - Inventory Side
    const glResInv = await axios.get(`${API_URL}/reports/general-ledger?account_code=1561&from=${date}&to=${date}`, { headers });
    const invOutEntry = glResInv.data.find(r => r.doc_no === `SI-${uniqueId}` && r.credit_amount === costAmount);

    if (invOutEntry) {
        console.log(`   ✅ Inventory decrease posted correctly (Cr 1561: ${costAmount}).`);
    } else {
        console.error(`   ❌ ERROR: Inventory decrease missing. Expected Cr 1561 = ${costAmount}.`);
    }

    console.log("\n--- AUDIT COMPLETE ---");
}

runTest();
