const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const USERNAME = 'admin';
const PASSWORD = 'admin';

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

async function runCheck() {
    await login();
    const headers = { Authorization: `Bearer ${token}` };

    // --- TEST: Opening Balance Verification ---
    console.log("\n2. Testing Opening Balance vs Details...");

    // We check a specific account known to have details (e.g., 131 - Receivables)
    // First, get the master account balance
    const accCode = '131';

    // Retrieve ALL GL entries for this account (including opening)
    // Note: In SyntexHCSN, opening balance is typically recorded as a 'OPENING_BALANCE' transaction
    const glRes = await axios.get(`${API_URL}/reports/general-ledger?account_code=${accCode}&from=1900-01-01&to=2099-12-31`, { headers });

    // Calculate Total Balance of Account (Debit - Credit)
    let totalAccountBalance = 0;
    glRes.data.forEach(entry => {
        totalAccountBalance += (entry.debit_amount || 0) - (entry.credit_amount || 0);
    });

    console.log(`   🔸 Total GL Balance for ${accCode}: ${totalAccountBalance}`);

    // Now, get the Debt Ledger (Detail by Partner)
    // This aggregates balances by partner_code
    // Note: The API /reports/debt-ledger returns BOTH 131 and 331 if we don't filter.
    // However, the backend logic for debt-ledger currently hardcodes `(account_code LIKE '131%' OR account_code LIKE '331%')`.
    // So we must manually filter in JS for 131 only to compare with GL(131).
    const debtRes = await axios.get(`${API_URL}/reports/debt-ledger?partner_code=&from=1900-01-01&to=2099-12-31`, { headers });

    let totalDetailBalance = 0;
    console.log(`Debug: Debt Res Length: ${debtRes.data.length}`);
    if (debtRes.data.length > 0) console.log(`Debug: Sample Row:`, debtRes.data[0]);
    debtRes.data.forEach(d => {
        if (!d.account_code.startsWith('131')) return; // Filter explicitly for 131

        // Debt ledger might return rows, we need to sum their closing balances
        // Assuming debt ledger structure: { partner_code, closing_balance, ... }
        // BUT wait, reportService.getDebtLedger returns aggregated rows? Let's check structure.
        // Actually, looking at the code, debt ledger is transaction based.
        // We better sum (debit - credit) of all rows in debt ledger to get net

        totalDetailBalance += (d.debit_amount || 0) - (d.credit_amount || 0);
    });

    console.log(`   🔸 Total Detailed (Debt Ledger) Balance: ${totalDetailBalance}`);

    // COMPARE
    if (Math.abs(totalAccountBalance - totalDetailBalance) < 0.01) {
        console.log("   ✅ SUCCESS: Account Balance matches Sum of Details.");
    } else {
        console.error(`   ❌ FAILURE: Mismatch! Diff: ${totalAccountBalance - totalDetailBalance}`);
        // If mismatch, maybe the debt ledger API filters strictly by 131?
        // Let's verify if GL contains non-partner entries?
    }

    console.log("\n--- CHECK COMPLETE ---");
}

runCheck();
