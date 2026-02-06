/**
 * HR Routes
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');
const hrApis = require('../hr_apis');

const { verifyToken, requireRole } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ========================================
    // EMPLOYEES
    // ========================================
    router.get('/hr/employees', verifyToken, hrApis.getEmployees(db));
    router.post('/hr/employees', verifyToken, requireRole('admin', 'manager'), hrApis.createEmployee(db));
    router.get('/employees', verifyToken, hrApis.getEmployees(db)); // Alias for backward compatibility
    router.post('/employees', verifyToken, requireRole('admin', 'manager'), hrApis.createEmployee(db));

    // ========================================
    // CONTRACTS
    // ========================================
    router.get('/hr/contracts', verifyToken, hrApis.getContracts(db));
    router.post('/hr/contracts', verifyToken, requireRole('admin', 'manager'), hrApis.createContract(db));
    router.put('/hr/contracts/:id', verifyToken, requireRole('admin', 'manager'), hrApis.updateContract(db));

    // ========================================
    // SALARY & PAYROLL
    // ========================================
    router.get('/hr/salary-grades', verifyToken, hrApis.getSalaryGrades(db));
    router.get('/hr/salary-history', verifyToken, hrApis.getSalaryHistory(db));
    router.post('/hr/salary-history', verifyToken, requireRole('admin', 'manager'), hrApis.createSalaryChange(db));

    router.post('/hr/calculate-payroll', verifyToken, requireRole('admin', 'manager'), hrApis.calculatePayroll(db));
    router.get('/hr/payroll', verifyToken, hrApis.getPayroll(db));

    // ========================================
    // ALLOWANCES
    // ========================================
    router.get('/hr/allowance-types', verifyToken, hrApis.getAllowanceTypes(db));
    router.post('/hr/allowance-types', verifyToken, requireRole('admin'), hrApis.createAllowanceType(db));
    router.put('/hr/allowance-types/:id', verifyToken, requireRole('admin'), hrApis.updateAllowanceType(db));
    router.delete('/hr/allowance-types/:id', verifyToken, requireRole('admin'), hrApis.deleteAllowanceType(db));

    router.get('/hr/employee-allowances/:employeeId', verifyToken, hrApis.getEmployeeAllowances(db));
    router.post('/hr/employee-allowances', verifyToken, requireRole('admin', 'manager'), hrApis.addEmployeeAllowance(db));

    // ========================================
    // TIMEKEEPING
    // ========================================
    router.get('/hr/timekeeping', verifyToken, hrApis.getTimekeeping(db));

    // ========================================
    // INSURANCE & REPORTS
    // ========================================
    router.get('/hr/insurance/summary', verifyToken, hrApis.getInsuranceSummary(db));
    router.get('/hr/insurance/detail', verifyToken, hrApis.getInsuranceDetail(db));

    router.post('/hr/insurance/import-bhxh', verifyToken, requireRole('admin', 'manager'), hrApis.importBHXHData(db));
    router.get('/hr/insurance/reconcile', verifyToken, requireRole('admin', 'manager'), hrApis.reconcileBHXH(db));
    router.post('/hr/insurance/resolve-discrepancy', verifyToken, requireRole('admin', 'manager'), hrApis.resolveDiscrepancy(db));

    return router;
};
