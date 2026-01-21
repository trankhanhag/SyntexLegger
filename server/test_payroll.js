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
    const period = '2024-05';

    console.log(`--- 1. Getting Employees ---`);
    let employees = [];
    try {
        const empRes = await axios.get(`${API_URL}/employees`, { headers });
        employees = empRes.data;
        if (employees.length === 0) {
            console.log("No employees found. Seed script needed if not present.");
            return;
        }
        console.log(`Found ${employees.length} employees.`);
    } catch (e) { console.error("Get Emp Failed:", e.message); return; }

    console.log(`--- 2. Creating Timekeeping for Period ${period} ---`);
    const timekeepingData = employees.map(e => ({
        employee_id: e.id,
        standard_days: 22,
        actual_days: 22, // Full attendance
        overtime_hours: 0
    }));

    try {
        await axios.post(`${API_URL}/hr/timekeeping`, { period, rows: timekeepingData }, { headers });
        console.log("Timekeeping inserted successfully.");
    } catch (e) { console.error("Insert Timekeeping Failed:", e.response?.data || e.message); return; }

    console.log("--- 3. Executing Payroll Calculation ---");
    try {
        const res = await axios.post(`${API_URL}/hr/calculate-payroll`, { period }, { headers });
        console.log("Payroll Calculation Result:", res.data);
    } catch (e) {
        console.error("Calculate Payroll Failed:", e.response?.data || e.message);
        return;
    }

    console.log("--- 4. Verify GL Entries ---");
    try {
        // Fetch All GL entries and filter
        // Doc number is usually L<Period> e.g. L202405
        const docNo = `L${period.replace('-', '')}`;
        const glRes = await axios.get(`${API_URL}/gl`, { headers });
        const entries = glRes.data.filter(g => g.doc_no === docNo);

        if (entries.length > 0) {
            console.log(`✅ GL Entries found: ${entries.length} rows.`);
            const totalDebit = entries.reduce((sum, e) => sum + e.debit_amount, 0);
            console.log(`   Total Value Processed: ${totalDebit}`);
        } else {
            console.log("❌ No GL entries found for DocNo " + docNo);
            console.log("   (API /api/gl returned " + glRes.data.length + " rows total)");
        }
    } catch (e) { console.error("Verify GL Failed:", e.message); }
}

runTest();
