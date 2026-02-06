// ========================================
// HUMAN RESOURCES APIs - Enterprise (TT 99/2025)
// ========================================

const { v4: uuidv4 } = require('uuid');
const hrAccounting = require('./hr_accounting');
const logger = require('./src/utils/logger');

/**
 * GET /api/hr/employees
 */
exports.getEmployees = (db) => (req, res) => {
    const { department, status } = req.query;
    let query = `
        SELECT e.*, 
               sg.name as salary_grade_name, 
               sg.code as salary_grade_code
        FROM employees e
        LEFT JOIN salary_grades sg ON e.salary_grade_id = sg.id
        WHERE 1=1
    `;
    const params = [];

    if (department) { query += ' AND e.department = ?'; params.push(department); }
    if (status) { query += ' AND e.status = ?'; params.push(status); }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/hr/employees
 */
exports.createEmployee = (db) => (req, res) => {
    const { code, name, department, position, salary_grade_id, salary_level, salary_coefficient, start_date } = req.body;
    const id = uuidv4();

    const sql = `
        INSERT INTO employees (
            id, code, name, department, position, 
            salary_grade_id, salary_level, salary_coefficient, 
            start_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
    `;

    db.run(sql, [id, code, name, department, position, salary_grade_id, salary_level, salary_coefficient, start_date], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id, message: 'Đã thêm nhân viên mới' });
    });
};

/**
 * GET /api/hr/salary-grades
 */
exports.getSalaryGrades = (db) => (req, res) => {
    db.all('SELECT * FROM salary_grades ORDER BY code', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/hr/calculate-payroll
 * Tính lương tự động cho kỳ
 */
exports.calculatePayroll = (db) => async (req, res) => {
    const { period } = req.body; // YYYY-MM

    if (!period) return res.status(400).json({ error: "Missing period" });

    // 1. Get/Create Payroll Period
    // 2. Scan all active employees
    // 3. Calculate for each employee
    // 4. Save to payroll_details
    // 5. Create accounting voucher

    try {
        const baseSalary = 2340000; // Hardcode for demo, should be from params

        // Get employees
        const employees = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM employees WHERE status = 'ACTIVE'", (err, rows) => resolve(rows || []));
        });

        const details = [];
        let totalSalary = 0;
        let totalInsuranceCorp = 0;
        let totalInsuranceEmp = 0;
        let totalTax = 0;

        // Process each employee
        for (const emp of employees) {
            const coef = emp.salary_coefficient || 1;
            const salary = Math.round(coef * baseSalary);
            const insuranceSalary = salary; // Simplify: Salary for insurance = Basic Salary

            const insuranceEmp = Math.round(insuranceSalary * 0.105); // 10.5%
            const insuranceCorp = Math.round(insuranceSalary * 0.215); // 21.5%

            const gross = salary; // Add allowances here if implemented
            const tax = 0; // Simplify tax calculation for now

            const net = gross - insuranceEmp - tax;

            details.push({
                id: uuidv4(),
                period_id: period,
                employee_id: emp.id,
                salary_coefficient: coef,
                base_salary: baseSalary,
                standard_days: 22,
                actual_days: 22, // Default full month
                salary_amount: salary,
                allowance_amount: 0,
                gross_income: gross,
                insurance_deduction: insuranceEmp,
                tax_deduction: tax,
                net_income: net
            });

            totalSalary += salary;
            totalInsuranceCorp += insuranceCorp;
            totalInsuranceEmp += insuranceEmp;
            totalTax += tax;
        }

        // Save details (Mock implementation - in real app, optimize batch insert)
        // For demo, we assume frontend calls this to trigger accounting

        // 5. Create Voucher
        const voucherId = await hrAccounting.createPayrollVoucher(db, period, totalSalary, totalInsuranceCorp, totalInsuranceEmp, totalTax);

        res.json({
            success: true,
            message: `Đã tính lương kỳ ${period}`,
            stats: {
                employees: employees.length,
                total_salary: totalSalary,
                voucher_id: voucherId
            },
            data: details
        });

    } catch (err) {
        logger.error("Calculate Payroll Error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/hr/payroll
 * Lấy bảng lương
 */
exports.getPayroll = (db) => (req, res) => {
    const { period } = req.query;
    // For demo, we return calculated data on the fly based on current employees
    // In production, should query payroll_details table

    // Quick mock for demo using real employee data
    const query = `
        SELECT e.*, sg.name as salary_grade_name
        FROM employees e
        LEFT JOIN salary_grades sg ON e.salary_grade_id = sg.id
        WHERE status = 'ACTIVE'
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const baseSalary = 2340000;
        const payroll = rows.map(emp => {
            const coef = emp.salary_coefficient || 1;
            const salary = Math.round(coef * baseSalary);
            const insurance = Math.round(salary * 0.105);
            return {
                id: emp.id,
                name: emp.name,
                gross_salary: salary,
                allowance: 0,
                insurance_deduction: insurance,
                income_tax: 0,
                net_salary: salary - insurance
            };
        });

        res.json(payroll);
    });
};

/**
 * GET /api/hr/timekeeping
 * Mock Timekeeping data
 */
exports.getTimekeeping = (db) => (req, res) => {
    const { period } = req.query;
    db.all("SELECT * FROM employees WHERE status = 'ACTIVE'", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const data = rows.map(emp => ({
            id: emp.id,
            name: emp.name,
            standard_days: 22,
            actual_days: 22,
            leave_days: 0,
            overtime_hours: 0
        }));
        res.json(data);
    });
};

/**
 * GET /api/hr/allowance-types
 */
exports.getAllowanceTypes = (db) => (req, res) => {
    db.all("SELECT * FROM allowance_types", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

/**
 * GET /api/hr/employee-allowances/:employeeId
 */
exports.getEmployeeAllowances = (db) => (req, res) => {
    const { employeeId } = req.params;
    const query = `
        SELECT ea.*, at.name, at.code 
        FROM employee_allowances ea
        JOIN allowance_types at ON ea.allowance_type_id = at.id
        WHERE ea.employee_id = ?
    `;
    db.all(query, [employeeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

/**
 * POST /api/hr/employee-allowances
 */
exports.addEmployeeAllowance = (db) => (req, res) => {
    const { employee_id, allowance_type_id, value, start_date, end_date } = req.body;
    const query = `
        INSERT INTO employee_allowances (employee_id, allowance_type_id, value, start_date, end_date, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `;
    db.run(query, [employee_id, allowance_type_id, value, start_date, end_date], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Added allowance" });
    });
};

/**
 * ==========================================
 * EMPLOYEE CONTRACTS APIS
 * ==========================================
 */

/**
 * GET /api/hr/contracts
 */
exports.getContracts = (db) => (req, res) => {
    const query = `
        SELECT ec.*, e.name as employee_name, sg.name as grade_name, sg.code as grade_code
        FROM employee_contracts ec
        LEFT JOIN employees e ON ec.employee_id = e.id
        LEFT JOIN salary_grades sg ON ec.salary_grade_id = sg.id
        ORDER BY ec.contract_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

/**
 * POST /api/hr/contracts
 */
exports.createContract = (db) => (req, res) => {
    const {
        employee_id, contract_type, contract_no, contract_date,
        effective_date, expiry_date, position, department,
        salary_grade_id, salary_level, salary_coefficient, notes
    } = req.body;

    const id = `CONTRACT_${Date.now()}`;
    const query = `
        INSERT INTO employee_contracts (
            id, employee_id, contract_type, contract_no, contract_date,
            effective_date, expiry_date, position, department,
            salary_grade_id, salary_level, salary_coefficient, notes,
            status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
    `;

    db.run(query, [
        id, employee_id, contract_type, contract_no, contract_date,
        effective_date, expiry_date, position, department,
        salary_grade_id, salary_level, salary_coefficient, notes
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, message: 'Contract created successfully' });
    });
};

/**
 * PUT /api/hr/contracts/:id
 */
exports.updateContract = (db) => (req, res) => {
    const { id } = req.params;
    const {
        contract_type, contract_no, contract_date, effective_date,
        expiry_date, position, department, salary_grade_id,
        salary_level, salary_coefficient, status, notes
    } = req.body;

    const query = `
        UPDATE employee_contracts SET
            contract_type = ?, contract_no = ?, contract_date = ?,
            effective_date = ?, expiry_date = ?, position = ?,
            department = ?, salary_grade_id = ?, salary_level = ?,
            salary_coefficient = ?, status = ?, notes = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `;

    db.run(query, [
        contract_type, contract_no, contract_date, effective_date,
        expiry_date, position, department, salary_grade_id,
        salary_level, salary_coefficient, status, notes, id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Contract updated successfully' });
    });
};

/**
 * ==========================================
 * SALARY HISTORY APIS
 * ==========================================
 */

/**
 * GET /api/hr/salary-history
 */
exports.getSalaryHistory = (db) => (req, res) => {
    const { employee_id } = req.query;

    let query = `
        SELECT sh.*, 
               e.name as employee_name,
               og.name as old_grade_name, og.code as old_grade_code,
               ng.name as new_grade_name, ng.code as new_grade_code
        FROM salary_history sh
        LEFT JOIN employees e ON sh.employee_id = e.id
        LEFT JOIN salary_grades og ON sh.old_grade_id = og.id
        LEFT JOIN salary_grades ng ON sh.new_grade_id = ng.id
    `;

    const params = [];
    if (employee_id) {
        query += ` WHERE sh.employee_id = ?`;
        params.push(employee_id);
    }

    query += ` ORDER BY sh.effective_date DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

/**
 * POST /api/hr/salary-history
 */
exports.createSalaryChange = (db) => (req, res) => {
    const {
        employee_id, effective_date, change_type,
        old_grade_id, new_grade_id, old_level, new_level,
        old_coefficient, new_coefficient, decision_no, decision_date, notes
    } = req.body;

    const id = `SALARY_CHANGE_${Date.now()}`;
    const query = `
        INSERT INTO salary_history (
            id, employee_id, effective_date, change_type,
            old_grade_id, new_grade_id, old_level, new_level,
            old_coefficient, new_coefficient, decision_no, decision_date,
            notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    db.run(query, [
        id, employee_id, effective_date, change_type,
        old_grade_id, new_grade_id, old_level, new_level,
        old_coefficient, new_coefficient, decision_no, decision_date, notes
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Update employee current salary info
        const updateEmployee = `
            UPDATE employees SET
                salary_grade_id = ?, salary_level = ?, salary_coefficient = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `;

        db.run(updateEmployee, [new_grade_id, new_level, new_coefficient, employee_id], (updateErr) => {
            if (updateErr) logger.error('Failed to update employee salary:', updateErr);
            res.json({ id, message: 'Salary change recorded successfully' });
        });
    });
};

/**
 * ==========================================
 * ALLOWANCE TYPE CRUD (Full Management)
 * ==========================================
 */

/**
 * POST /api/hr/allowance-types
 */
exports.createAllowanceType = (db) => (req, res) => {
    const { code, name, calculation_type, default_value, is_taxable, is_insurance, description } = req.body;
    const id = `ALLOWANCE_${Date.now()}`;

    const query = `
        INSERT INTO allowance_types (
            id, code, name, calculation_type, default_value,
            is_taxable, is_insurance, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    db.run(query, [id, code, name, calculation_type, default_value, is_taxable, is_insurance, description], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, message: 'Allowance type created successfully' });
    });
};

/**
 * PUT /api/hr/allowance-types/:id
 */
exports.updateAllowanceType = (db) => (req, res) => {
    const { id } = req.params;
    const { code, name, calculation_type, default_value, is_taxable, is_insurance, description } = req.body;

    const query = `
        UPDATE allowance_types SET
            code = ?, name = ?, calculation_type = ?, default_value = ?,
            is_taxable = ?, is_insurance = ?, description = ?
        WHERE id = ?
    `;

    db.run(query, [code, name, calculation_type, default_value, is_taxable, is_insurance, description, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Allowance type updated successfully' });
    });
};

/**
 * DELETE /api/hr/allowance-types/:id
 */
exports.deleteAllowanceType = (db) => (req, res) => {
    const { id } = req.params;

    // Check if allowance type is being used
    const checkQuery = `SELECT COUNT(*) as count FROM employee_allowances WHERE allowance_type_id = ?`;

    db.get(checkQuery, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row.count > 0) {
            return res.status(400).json({
                error: 'Cannot delete allowance type that is being used by employees'
            });
        }

        db.run(`DELETE FROM allowance_types WHERE id = ?`, [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Allowance type deleted successfully' });
        });
    });
};

// ============================================
// INSURANCE REPORTING & BHXH RECONCILIATION
// ============================================

// Get Insurance Summary for a Period
exports.getInsuranceSummary = (db) => (req, res) => {
    const { period } = req.query; // Format: YYYY-MM

    if (!period) {
        return res.status(400).json({ error: 'Period is required (format: YYYY-MM)' });
    }

    const sql = `
        SELECT 
            COUNT(*) as total_employees,
            SUM(salary_coefficient * 2340000) as total_insurance_salary,
            SUM(salary_coefficient * 2340000 * 0.08) as total_bhxh_employee,
            SUM(salary_coefficient * 2340000 * 0.015) as total_bhyt_employee,
            SUM(salary_coefficient * 2340000 * 0.01) as total_bhtn_employee,
            SUM(salary_coefficient * 2340000 * 0.105) as total_employee_contribution,
            SUM(salary_coefficient * 2340000 * 0.175) as total_bhxh_company,
            SUM(salary_coefficient * 2340000 * 0.03) as total_bhyt_company,
            SUM(salary_coefficient * 2340000 * 0.01) as total_bhtn_company,
            SUM(salary_coefficient * 2340000 * 0.215) as total_company_contribution,
            SUM(salary_coefficient * 2340000 * 0.01) as total_union_fee
        FROM employees
        WHERE status = 'ACTIVE'
    `;

    db.get(sql, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            period,
            summary: {
                total_employees: row.total_employees || 0,
                total_insurance_salary: row.total_insurance_salary || 0,
                employee_contributions: {
                    bhxh: row.total_bhxh_employee || 0,
                    bhyt: row.total_bhyt_employee || 0,
                    bhtn: row.total_bhtn_employee || 0,
                    total: row.total_employee_contribution || 0
                },
                company_contributions: {
                    bhxh: row.total_bhxh_company || 0,
                    bhyt: row.total_bhyt_company || 0,
                    bhtn: row.total_bhtn_company || 0,
                    total: row.total_company_contribution || 0
                },
                union_fee: row.total_union_fee || 0,
                grand_total: (row.total_employee_contribution || 0) + (row.total_company_contribution || 0) + (row.total_union_fee || 0)
            }
        });
    });
};

// Get Insurance Detail (per employee) for a Period
exports.getInsuranceDetail = (db) => (req, res) => {
    const { period } = req.query;

    if (!period) {
        return res.status(400).json({ error: 'Period is required (format: YYYY-MM)' });
    }

    const sql = `
        SELECT 
            id, code, name, department, position,
            (salary_coefficient * 2340000) as insurance_salary,
            (salary_coefficient * 2340000 * 0.08) as bhxh_employee,
            (salary_coefficient * 2340000 * 0.015) as bhyt_employee,
            (salary_coefficient * 2340000 * 0.01) as bhtn_employee,
            (salary_coefficient * 2340000 * 0.105) as total_employee,
            (salary_coefficient * 2340000 * 0.175) as bhxh_company,
            (salary_coefficient * 2340000 * 0.03) as bhyt_company,
            (salary_coefficient * 2340000 * 0.01) as bhtn_company,
            (salary_coefficient * 2340000 * 0.215) as total_company,
            (salary_coefficient * 2340000 * 0.01) as union_fee
        FROM employees
        WHERE status = 'ACTIVE'
        ORDER BY code
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ period, employees: rows });
    });
};

// Import BHXH Authority Data
exports.importBHXHData = (db) => (req, res) => {
    const { period, bhxh_data } = req.body;

    if (!period || !bhxh_data || !Array.isArray(bhxh_data)) {
        return res.status(400).json({ error: 'Period and bhxh_data array are required' });
    }

    // Clear existing data for this period
    db.run(`DELETE FROM bhxh_authority_data WHERE period = ?`, [period], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const stmt = db.prepare(`
            INSERT INTO bhxh_authority_data 
            (period, employee_code, employee_name, insurance_salary, bhxh_employee, bhyt_employee, 
             bhtn_employee, bhxh_company, bhyt_company, bhtn_company, union_fee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let imported = 0;
        bhxh_data.forEach(row => {
            stmt.run([
                period,
                row.employee_code,
                row.employee_name,
                row.insurance_salary || 0,
                row.bhxh_employee || 0,
                row.bhyt_employee || 0,
                row.bhtn_employee || 0,
                row.bhxh_company || 0,
                row.bhyt_company || 0,
                row.bhtn_company || 0,
                row.union_fee || 0
            ], (err) => {
                if (!err) imported++;
            });
        });

        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: 'BHXH data imported successfully',
                period,
                total_records: bhxh_data.length,
                imported
            });
        });
    });
};

// Reconcile BHXH (Detect Discrepancies)
exports.reconcileBHXH = (db) => (req, res) => {
    const { period } = req.query;

    if (!period) {
        return res.status(400).json({ error: 'Period is required (format: YYYY-MM)' });
    }

    // Clear existing discrepancies for this period
    db.run(`DELETE FROM insurance_discrepancies WHERE period = ?`, [period], (clearErr) => {
        if (clearErr) return res.status(500).json({ error: clearErr.message });

        // Find employees in internal DB but not in BHXH data
        const missingInBHXH = `
            INSERT INTO insurance_discrepancies 
            (period, employee_id, employee_code, employee_name, discrepancy_type, internal_value, bhxh_value, variance)
            SELECT 
                ? as period,
                e.id,
                e.code,
                e.name,
                'MISSING_IN_BHXH' as discrepancy_type,
                (e.salary_coefficient * 2340000) as internal_value,
                0 as bhxh_value,
                (e.salary_coefficient * 2340000) as variance
            FROM employees e
            WHERE e.status = 'ACTIVE'
            AND NOT EXISTS (
                SELECT 1 FROM bhxh_authority_data b
                WHERE b.period = ? AND b.employee_code = e.code
            )
        `;

        // Find salary mismatches
        const salaryMismatch = `
            INSERT INTO insurance_discrepancies 
            (period, employee_id, employee_code, employee_name, discrepancy_type, internal_value, bhxh_value, variance)
            SELECT 
                ? as period,
                e.id,
                e.code,
                e.name,
                'SALARY_MISMATCH' as discrepancy_type,
                (e.salary_coefficient * 2340000) as internal_value,
                b.insurance_salary as bhxh_value,
                ((e.salary_coefficient * 2340000) - b.insurance_salary) as variance
            FROM employees e
            JOIN bhxh_authority_data b ON b.employee_code = e.code AND b.period = ?
            WHERE e.status = 'ACTIVE'
            AND ABS((e.salary_coefficient * 2340000) - b.insurance_salary) > 1000
        `;

        // Find employees in BHXH but not in internal DB
        const extraInBHXH = `
            INSERT INTO insurance_discrepancies 
            (period, employee_code, employee_name, discrepancy_type, internal_value, bhxh_value, variance)
            SELECT 
                ? as period,
                b.employee_code,
                b.employee_name,
                'EXTRA_IN_BHXH' as discrepancy_type,
                0 as internal_value,
                b.insurance_salary as bhxh_value,
                -b.insurance_salary as variance
            FROM bhxh_authority_data b
            WHERE b.period = ?
            AND NOT EXISTS (
                SELECT 1 FROM employees e
                WHERE e.code = b.employee_code AND e.status = 'ACTIVE'
            )
        `;

        db.run(missingInBHXH, [period, period], (err1) => {
            if (err1) return res.status(500).json({ error: err1.message });

            db.run(salaryMismatch, [period, period], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });

                db.run(extraInBHXH, [period, period], (err3) => {
                    if (err3) return res.status(500).json({ error: err3.message });

                    // Get all discrepancies
                    const sql = `
                        SELECT * FROM insurance_discrepancies
                        WHERE period = ?
                        ORDER BY discrepancy_type, employee_code
                    `;

                    db.all(sql, [period], (err, rows) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({
                            period,
                            total_discrepancies: rows.length,
                            discrepancies: rows
                        });
                    });
                });
            });
        });
    });
};

// Resolve Discrepancy
exports.resolveDiscrepancy = (db) => (req, res) => {
    const { discrepancy_id, resolution, notes } = req.body;

    if (!discrepancy_id || !resolution) {
        return res.status(400).json({ error: 'discrepancy_id and resolution are required' });
    }

    const validResolutions = ['ADJUST_INTERNAL', 'REPORT_TO_BHXH', 'IGNORE'];
    if (!validResolutions.includes(resolution)) {
        return res.status(400).json({ error: 'Invalid resolution type' });
    }

    const sql = `
        UPDATE insurance_discrepancies
        SET status = 'RESOLVED',
            resolution = ?,
            resolution_notes = ?,
            resolved_date = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(sql, [resolution, notes || '', discrepancy_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Discrepancy not found' });
        }
        res.json({ message: 'Discrepancy resolved successfully' });
    });
};

module.exports = exports;
