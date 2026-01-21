const axios = require('axios');
const API_URL = 'http://localhost:3000/api';
const USERNAME = 'admin';
const PASSWORD = 'admin';

let token = '';

async function login() {
    const res = await axios.post(`${API_URL}/login`, { username: USERNAME, password: PASSWORD });
    token = res.data.token;
}

async function runTest() {
    await login();
    const headers = { Authorization: `Bearer ${token}` };
    const timestamp = Date.now();

    // Use current dates to avoid Locked Period issues
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(new Date().setDate(now.getDate() + 1)).toISOString().split('T')[0];
    const nextWeek = new Date(new Date().setDate(now.getDate() + 7)).toISOString().split('T')[0];

    // Unique Inventory Account to isolate test
    const INV_ACC = '156test' + timestamp;
    const PROD_CODE = 'ITEM_' + timestamp;

    console.log(`Using Inventory Account: ${INV_ACC} and Product: ${PROD_CODE}`);

    console.log("--- 2. Posting Purchase 1 (10 @ 100,000) ---");
    try {
        await axios.post(`${API_URL}/vouchers`, {
            doc_no: `PN_TEST_1_${timestamp}`,
            doc_date: today,
            post_date: today,
            description: 'Purchase 1',
            type: 'PURCHASE_INVOICE',
            total_amount: 1000000,
            lines: [
                { description: 'Item A', debitAcc: INV_ACC, creditAcc: '331', amount: 1000000, dim1: PROD_CODE, cost_price: 0, quantity: 10 }
            ],
            include_inventory: true
        }, { headers });
    } catch (e) { console.error("Purchase 1 Error:", e.response?.data || e.message); return; }

    console.log("--- 3. Posting Purchase 2 (10 @ 120,000) ---");
    try {
        await axios.post(`${API_URL}/vouchers`, {
            doc_no: `PN_TEST_2_${timestamp}`,
            doc_date: tomorrow,
            post_date: tomorrow,
            description: 'Purchase 2',
            type: 'PURCHASE_INVOICE',
            total_amount: 1200000,
            lines: [
                { description: 'Item A', debitAcc: INV_ACC, creditAcc: '331', amount: 1200000, dim1: PROD_CODE, cost_price: 0, quantity: 10 }
            ],
            include_inventory: true
        }, { headers });
    } catch (e) { console.error("Purchase 2 Error:", e.response?.data || e.message); return; }

    console.log("--- 4. Posting Sale (5 units) - Expecting AVCO Calculation ---");

    try {
        await axios.post(`${API_URL}/vouchers`, {
            doc_no: `PX_TEST_1_${timestamp}`,
            doc_date: nextWeek,
            post_date: nextWeek,
            description: 'Sale 1',
            type: 'SALES_INVOICE',
            total_amount: 2000000,
            lines: [
                { description: 'Item A', debitAcc: '131', creditAcc: '511', amount: 2000000, dim1: PROD_CODE, cost_price: 0, quantity: 5 }
            ],
            include_inventory: true
        }, { headers });
    } catch (e) { console.error("Sale Error:", e.response?.data || e.message); return; }


    // STEP 3: CHECK GL
    console.log("--- 5. Verifying COGS in GL ---");
    // We check GL for account 632 generally, filtering by our doc number
    const glRes = await axios.get(`${API_URL}/reports/general-ledger?account_code=632&from=${today}&to=${nextWeek}`, { headers });

    const cogsEntries = glRes.data.filter(d => d.doc_no === `PX_TEST_1_${timestamp}`);

    if (cogsEntries.length === 0) {
        console.log("❌ No COGS entry found. System did not trigger inventory posting.");
    } else {
        const cogsValue = cogsEntries.reduce((sum, e) => sum + e.debit_amount, 0);
        console.log(`ℹ️ COGS Value Recorded: ${cogsValue}`);

        // Purchase 1: 1,000,000 / 10 = 100,000
        // Purchase 2: 1,200,000 / 10 = 120,000
        // Total: 2,200,000 / 20 = 110,000
        // Sale: 5 * 110,000 = 550,000
        const expected = 550000;
        if (Math.abs(cogsValue - expected) < 1000) {
            console.log("✅ SUCCESS: Logic is correct (AVCO calculated).");
        } else {
            console.log(`❌ FAILURE: Logic incorrect. Expected ${expected}, got ${cogsValue}`);
        }
    }
}

runTest();
