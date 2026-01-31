import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Single Tenant Mode: No company header needed
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 globally
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('[API] Unauthorized! Token might be invalid or expired.');
            // Optionally clear token here, but be careful with auto-login loops
            // localStorage.removeItem('token'); 
        }
        return Promise.reject(error);
    }
);

export const voucherService = {
    getAll: (type?: string, from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        return api.get(`/vouchers?${params.toString()}`);
    },
    getById: (id: string) => api.get(`/vouchers/${id}`),
    save: (data: any) => api.post('/vouchers', data),
    update: (id: string, data: any) => api.post(`/vouchers`, { ...data, id }),
    duplicate: (id: string) => api.post(`/vouchers/${id}/duplicate`),
    delete: (id: string) => api.delete(`/vouchers/${id}`),
};

export const masterDataService = {
    getAccounts: () => api.get('/accounts'),
    getPartners: () => api.get('/partners'),
    saveAccounts: (accounts: any[]) => api.post('/master/accounts', { accounts }),
    savePartners: (partners: any[]) => api.post('/master/partners', { partners }),
    getAccountBalances: () => api.get('/accounts/balances'),
    getAccountBalance: (code: string) => api.get(`/accounts/balance/${code}`),
    getCashBalances: () => api.get('/balances'), // Updated to match server endpoint
    savePartner: (data: any) => api.post('/partners', data),
    createPartner: (data: any) => api.post('/partners', data),
    deleteAccount: (code: string) => api.delete(`/accounts/${code}`),
    deletePartner: (id: string) => api.delete(`/partners/${id}`),
    getProducts: () => api.get('/products'),
    saveProducts: (products: any[]) => api.post('/master/products', { products }),
    getDepartments: () => api.get('/master/departments'), // DN: Bộ phận/Chi nhánh
    getFundSources: () => api.get('/master/departments'), // Alias cho backward compatibility
};

export const taxService = {
    lookupGST: (taxCode: string) => api.get(`/tax/lookup/${taxCode}`),
    syncInvoices: (params: { from: string, to: string, type: 'input' | 'output', credentials?: any }) => api.post('/tax/sync', params),
    uploadXml: (xmlContent: string) => api.post('/tax/upload-xml', { xml_content: xmlContent }),
    getInvoiceDetails: (id: string) => api.get(`/tax/invoices/${id}`),
    getVatReport: (params: { type: string, from: string, to: string }) => api.get('/reports/tax-vat', { params }),
    getPitReport: (params: { from: string, to: string }) => api.get('/reports/tax-pit', { params }),
    getDeclaration: (params: { type: string, from: string, to: string }) => api.get('/reports/tax-declaration', { params }),
};

export const openingBalanceService = {
    get: (period: string) => api.get('/opening-balance', { params: { period } }),
    save: (period: string, balances: any[]) => api.post('/opening-balance/save', { period, balances }),
    transfer: (fromPeriod: string, toPeriod: string) => api.post('/opening-balance/transfer', { fromPeriod, toPeriod }),
};

export const auditService = {
    healthCheck: () => api.get('/audit/health-check'),

    // Audit Trail
    getAuditTrail: (params?: {
        entity_type?: string;
        entity_id?: string;
        doc_no?: string;
        action?: string;
        username?: string;
        from_date?: string;
        to_date?: string;
        fiscal_year?: number;
        fiscal_period?: number;
        limit?: number;
        offset?: number;
    }) => api.get('/audit/trail', { params }),
    getEntityHistory: (entityType: string, entityId: string) =>
        api.get(`/audit/trail/${entityType}/${entityId}`),
    getStatistics: (params?: { fiscal_year?: number; from_date?: string; to_date?: string }) =>
        api.get('/audit/statistics', { params }),
    verifyAuditIntegrity: (auditId: string) => api.post(`/audit/verify/${auditId}`),
    exportAuditTrail: (params?: {
        format?: 'json' | 'csv';
        entity_type?: string;
        from_date?: string;
        to_date?: string;
        fiscal_year?: number;
    }) => api.get('/audit/export', { params, responseType: params?.format === 'csv' ? 'blob' : 'json' }),
    getComplianceReport: (params?: { fiscal_year?: number }) =>
        api.get('/audit/report/compliance', { params }),

    // Anomalies
    getAnomalies: (params?: {
        anomaly_type?: string;
        severity?: string;
        status?: string;
        from_date?: string;
        to_date?: string;
        fiscal_year?: number;
        limit?: number;
    }) => api.get('/audit/anomalies', { params }),
    getAnomalySummary: (params?: { fiscal_year?: number }) =>
        api.get('/audit/anomalies/summary', { params }),
    resolveAnomaly: (anomalyId: string, data: { resolution_notes: string; status?: string }) =>
        api.post(`/audit/anomalies/${anomalyId}/resolve`, data),
    acknowledgeAnomaly: (anomalyId: string, data?: { notes?: string }) =>
        api.post(`/audit/anomalies/${anomalyId}/acknowledge`, data),
    runAnomalyDetection: (data?: { fiscal_year?: number }) =>
        api.post('/audit/run-detection', data),

    // Reconciliation
    getReconciliations: (params?: {
        recon_type?: string;
        fiscal_year?: number;
        fiscal_period?: number;
        status?: string;
        limit?: number;
    }) => api.get('/audit/reconciliations', { params }),
    createReconciliation: (data: any) => api.post('/audit/reconciliations', data),
    approveReconciliation: (id: string, data?: { notes?: string }) =>
        api.put(`/audit/reconciliations/${id}/approve`, data),

    // Sessions
    getSessions: (params?: { is_active?: boolean; user_id?: string; limit?: number }) =>
        api.get('/audit/sessions', { params }),
};

// REMOVED: budgetControlService - DN không cần hệ thống ngân sách nội bộ HCSN

export const bankService = {
    getAccounts: () => api.get('/bank/accounts'),
    addAccount: (data: any) => api.post('/bank/accounts', data),
    getStaging: () => api.get('/staging?source=bank_api'),
};

export const closingService = {
    executeMacro: (period: string) => api.post('/closing/execute-macro', { period }),
};

export const settingsService = {
    getSettings: () => api.get('/settings'),
    updateSetting: (key: string, value: string) => api.post('/settings', { key, value }),
};

export const allocationService = {
    getUnpaidInvoices: (partnerCode: string) => api.get(`/partners/${partnerCode}/unpaid-invoices`),
    saveAllocations: (data: { payment_id: string, items: { invoice_id: string, amount: number }[] }) => api.post('/allocations', data),
    getAllocationsByPayment: (paymentId: string) => api.get(`/allocations/payment/${paymentId}`),
    reverseAllocations: (data: { payment_id: string, items: { invoice_id: string, amount: number }[] }) => api.post('/allocations/reverse', data)
};

export const checklistService = {
    getAll: () => api.get('/checklist'),
    add: (data: { title: string, category: string }) => api.post('/checklist', data),
    update: (id: number, data: any) => api.put(`/checklist/${id}`, data),
    delete: (id: number) => api.delete(`/checklist/${id}`),
};

export const assetService = {
    getAssets: () => api.get('/assets'),
    getCCDC: () => api.get('/ccdc'),
    createAsset: (data: any) => api.post('/assets', data),
    createCCDC: (data: any) => api.post('/ccdc', data),
    depreciateAssets: (data: any) => api.post('/assets/depreciate', data),
    disposeAsset: (data: any) => api.post('/assets/dispose', data),
    deleteAsset: (id: string) => api.delete(`/assets/${id}`),
    deleteCCDC: (id: string) => api.delete(`/ccdc/${id}`),

    // Allocation History (Chi phí trả trước)
    getAllocationHistory: (params?: { period?: string, item_id?: string }) => api.get('/allocation-history', { params }),
    checkAllocationDuplicate: (period: string, item_id: string) => api.get('/allocation-history/check-duplicate', { params: { period, item_id } }),
    recordAllocation: (data: { period: string, item_id: string, item_type?: string, item_name: string, amount: number, target_account: string, voucher_id?: string }) =>
        api.post('/allocation-history', data),
    getAllocationSummary: () => api.get('/allocation-history/summary'),

    // Fixed Assets Extended
    getFixedAssets: (params?: any) => api.get('/assets/fixed', { params }),
    createFixedAsset: (data: any) => api.post('/assets/fixed', data),
    updateFixedAsset: (id: string, data: any) => api.put(`/assets/fixed/${id}`, data),
    deleteFixedAsset: (id: string, data: any) => {
        // Use DELETE with body (requires config object)
        return api.delete(`/assets/fixed/${id}`, { data });
    },
    calculateDepreciation: (data: { period: string, asset_ids?: string[] }) => api.post('/assets/fixed/depreciation', data),
    transferAsset: (data: any) => api.post('/assets/fixed/transfer', data),
    revaluateAsset: (id: string, data: any) => api.put(`/assets/fixed/${id}/revaluation`, data),

    // Infrastructure Assets
    getInfrastructure: () => api.get('/infrastructure-assets'),
    createInfrastructure: (data: any) => api.post('/infrastructure-assets', data),
    updateInfrastructure: (id: string, data: any) => api.put(`/infrastructure-assets/${id}`, data),
    recordMaintenance: (data: any) => api.post('/infrastructure/maintenance', data),
    updateCondition: (id: string, data: any) => api.put(`/infrastructure/${id}/condition`, data),

    // Long-term Investments
    getInvestments: (params?: any) => api.get('/investments/long-term', { params }),
    createInvestment: (data: any) => api.post('/investments/long-term', data),
    updateInvestment: (id: string, data: any) => api.put(`/investments/long-term/${id}`, data),
    recordInvestmentIncome: (data: any) => api.post('/investments/income', data),

    // Inventory
    getInventoryRecords: (params?: any) => api.get('/assets/inventory', { params }),
    createInventory: (data: any) => api.post('/assets/inventory', data),
    addInventoryItem: (id: string, data: any) => api.post(`/assets/inventory/${id}/items`, data),
    completeInventory: (id: string, data: any) => api.put(`/assets/inventory/${id}/complete`, data),
    getInventoryReport: (id: string) => api.get(`/assets/inventory/${id}/report`),

    // Asset Cards
    getAssetCard: (id: string, params?: any) => api.get(`/assets/cards/${id}`, { params }),
    updateAssetCard: (id: string, data: any) => api.put(`/assets/cards/${id}`, data),
};

export const budgetService = {
    getAll: (period?: string) => api.get('/budgets', { params: { period } }),
    save: (data: any) => api.post('/budgets', data),
};

export const reportService = {
    // === SỔ KẾ TOÁN (ACCOUNTING REGISTERS) ===
    getTrialBalance: (params: any) => api.get('/reports/trial-balance', { params }),
    getGeneralLedger: (params: any) => api.get('/reports/general-ledger', { params }),
    getGeneralJournal: (params: any) => api.get('/reports/general-journal', { params }),
    getCashBook: (params: any) => api.get('/reports/cash-book', { params }),
    getBankBook: (params: any) => api.get('/reports/bank-book', { params }),
    getInventoryLedger: (params: any) => api.get('/reports/inventory-ledger', { params }),
    getInventorySummary: (params: any) => api.get('/reports/inventory', { params }),
    getTransactionDetails: (params: any) => api.get('/reports/transaction-details', { params }),

    // === BÁO CÁO TÀI CHÍNH DOANH NGHIỆP (TT 99/2025) ===
    getBalanceSheetDN: (params: any) => api.get('/reports/balance-sheet-dn', { params }),
    getProfitLoss: (params: any) => api.get('/reports/profit-loss', { params }),
    getCashFlowDN: (params: any) => api.get('/reports/cash-flow-dn', { params }),

    // === BÁO CÁO NGÂN SÁCH NỘI BỘ ===
    getBudgetPerformance: (params: any) => api.get('/reports/budget-performance', { params }),

    // === DEPRECATED: HCSN Reports (Không dùng cho DN) ===
    // Giữ lại để backward compatibility, sẽ xóa trong phiên bản sau
    getBalanceSheetHCSN: (_params: any) => Promise.resolve({ data: [] }),
    getActivityResult: (_params: any) => Promise.resolve({ data: [] }),
    getCashFlow: (params: any) => api.get('/reports/cash-flow-dn', { params }), // Redirect to DN version
    getBudgetSettlementRegular: (_params: any) => Promise.resolve({ data: [] }),
    getBudgetSettlementNonRegular: (_params: any) => Promise.resolve({ data: [] }),
    getBudgetSettlementCapex: (_params: any) => Promise.resolve({ data: [] }),
    getFundSourceReport: (_params: any) => Promise.resolve({ data: [] }),
    getInfrastructureReport: (_params: any) => Promise.resolve({ data: [] }),
    getBalanceSheet: (params: any) => api.get('/reports/balance-sheet', { params }),
    getPnL: (params: any) => api.get('/reports/pnl', { params }),
    getDebtLedger: (params: any) => api.get('/reports/debt-ledger', { params }),
    getVatIn: (params: any) => api.get('/reports/vat-in', { params }),
    getVatOut: (params: any) => api.get('/reports/vat-out', { params }),
    getProjectPnL: (params: any) => api.get('/reports/project-pnl', { params }),
};

export const hrService = {
    getEmployees: () => api.get('/hr/employees'),
    saveEmployee: (data: any) => api.post('/hr/employees', data),
    deleteEmployee: (id: string) => api.delete(`/employees/${id}`),

    // Extended APIs
    getSalaryGrades: () => api.get('/hr/salary-grades'),

    // Allowance Types (Full CRUD)
    getAllowanceTypes: () => api.get('/hr/allowance-types'),
    createAllowanceType: (data: any) => api.post('/hr/allowance-types', data),
    updateAllowanceType: (id: string, data: any) => api.put(`/hr/allowance-types/${id}`, data),
    deleteAllowanceType: (id: string) => api.delete(`/hr/allowance-types/${id}`),

    // Employee Allowances
    getEmployeeAllowances: (id: string) => api.get(`/hr/employee-allowances/${id}`),
    addEmployeeAllowance: (data: any) => api.post('/hr/employee-allowances', data),

    // Contracts & Decisions
    getContracts: () => api.get('/hr/contracts'),
    createContract: (data: any) => api.post('/hr/contracts', data),
    updateContract: (id: string, data: any) => api.put(`/hr/contracts/${id}`, data),

    // Salary History
    getSalaryHistory: (employee_id?: string) => api.get('/hr/salary-history', { params: { employee_id } }),
    createSalaryChange: (data: any) => api.post('/hr/salary-history', data),

    // Payroll & Timekeeping
    getTimekeeping: (params: { period: string }) => api.get('/hr/timekeeping', { params }),
    saveTimekeeping: (data: any) => api.post('/hr/timekeeping', data),
    getPayroll: (params: { period: string }) => api.get('/hr/payroll', { params }),
    calculatePayroll: (data: { period: string }) => api.post('/hr/calculate-payroll', data),

    // Insurance Reporting & BHXH Reconciliation
    getInsuranceSummary: (period: string) => api.get('/hr/insurance/summary', { params: { period } }),
    getInsuranceDetail: (period: string) => api.get('/hr/insurance/detail', { params: { period } }),
    importBHXHData: (data: { period: string; bhxh_data: any[] }) => api.post('/hr/insurance/import-bhxh', data),
    reconcileBHXH: (period: string) => api.get('/hr/insurance/reconcile', { params: { period } }),
    resolveDiscrepancy: (data: { discrepancy_id: number; resolution: string; notes: string }) =>
        api.post('/hr/insurance/resolve-discrepancy', data),
};

export const salesService = {
    getOrders: () => api.get('/sales/orders'),
    getInvoices: (type?: 'INVOICE' | 'SERVICE') => api.get('/sales/invoices', { params: { type } }),
    getReturns: () => api.get('/sales/returns'),
    getPayments: () => api.get('/sales/payments'),
    deleteOrder: (id: string) => api.delete(`/sales/orders/${id}`),
    deleteInvoice: (id: string) => api.delete(`/sales/invoices/${id}`),
    deleteReturn: (id: string) => api.delete(`/sales/returns/${id}`),
    deletePayment: (id: string) => api.delete(`/sales/payments/${id}`),
};

// ========================================
// REVENUE SERVICE (TT 99/2025)
// Quản lý Doanh thu
// ========================================
export const revenueService = {
    // Revenue Categories (Danh mục loại thu)
    getCategories: (params?: any) => api.get('/revenue/categories', { params }),
    createCategory: (data: any) => api.post('/revenue/categories', data),

    // Revenue Receipts (Biên lai thu tiền)
    getReceipts: (params?: any) => api.get('/revenue/receipts', { params }),
    getReceiptDetail: (id: string) => api.get(`/revenue/receipts/${id}`),
    createReceipt: (data: any) => api.post('/revenue/receipts', data),
    updateReceipt: (id: string, data: any) => api.put(`/revenue/receipts/${id}`, data),
    deleteReceipt: (id: string) => api.delete(`/revenue/receipts/${id}`),

    // Revenue Reports (Báo cáo Doanh thu)
    getReport: (params?: any) => api.get('/revenue/report', { params }),
    getBudgetComparison: (params: { fiscal_year: number }) => api.get('/revenue/budget-comparison', { params }),
};

export const expenseService = {
    // Expense Categories (Khoản mục chi)
    getCategories: (params?: any) => api.get('/expense/categories', { params }),
    createCategory: (data: any) => api.post('/expense/categories', data),

    // Expense Vouchers (Phiếu chi, Ủy nhiệm chi, Giảm trừ)
    getVouchers: (params?: any) => api.get('/expense/vouchers', { params }),
    getVoucherDetail: (id: string) => api.get(`/expense/vouchers/${id}`),
    createVoucher: (data: any) => api.post('/expense/vouchers', data),
    updateVoucher: (id: string, data: any) => api.put(`/expense/vouchers/${id}`, data),
    deleteVoucher: (id: string) => api.delete(`/expense/vouchers/${id}`),

    // Expense Reports
    getReport: (params?: any) => api.get('/expense/report', { params }),
    getBudgetComparison: (params: { fiscal_year: number }) => api.get('/expense/budget-comparison', { params }),
};


export const purchaseService = {
    getOrders: () => api.get('/purchase/orders'),
    getInvoices: (type?: 'INBOUND' | 'SERVICE') => api.get('/purchase/invoices', { params: { type } }),
    getReturns: () => api.get('/purchase/returns'),
    getPayments: () => api.get('/purchase/payments'),
    deleteOrder: (id: string) => api.delete(`/purchase/orders/${id}`),
    deleteInvoice: (id: string) => api.delete(`/purchase/invoices/${id}`),
    deleteReturn: (id: string) => api.delete(`/purchase/returns/${id}`),
    deletePayment: (id: string) => api.delete(`/purchase/payments/${id}`),
};

export const inventoryService = {
    getReceipts: () => api.get('/inventory/receipts'),
    getIssues: () => api.get('/inventory/issues'),
    // Materials (Vật tư)
    getMaterials: (params?: any) => api.get('/inventory/materials', { params }),
    createMaterial: (data: any) => api.post('/inventory/materials', data),
    updateMaterial: (id: string, data: any) => api.put(`/inventory/materials/${id}`, data),
    deleteMaterial: (id: string) => api.delete(`/inventory/materials/${id}`),
    importMaterials: (materials: any[]) => api.post('/inventory/materials/import', { materials }),
    // Transfers
    getTransfers: () => api.get('/inventory/transfers'),
    createTransfer: (data: any) => api.post('/inventory/transfers', data),
    // Summary & Cards
    getSummary: (params?: any) => api.get('/inventory/summary', { params }),
    getCards: (params?: any) => api.get('/inventory/cards', { params }),
};

export const contractService = {
    getContracts: (type?: 'sales' | 'purchase') => api.get('/contracts', { params: { type } }),
    saveContract: (data: any) => api.post('/contracts', data),
    getAppendices: () => api.get('/contracts/appendices'),
    deleteContract: (id: string) => api.delete(`/contracts/${id}`),
};


export const projectService = {
    getProjects: () => api.get('/projects'),
    saveProject: (data: any) => api.post('/projects', data),
    getTasks: (params: any) => api.get('/projects/tasks', { params }),
    updateTask: (data: any) => api.post('/projects/tasks', data),
    getBudgets: (params: any) => api.get('/projects/budgets', { params }),
    getPNL: () => api.get('/projects/pnl'),
    deleteProject: (id: string) => api.delete(`/projects/${id}`),
};

export const productService = {
    getProducts: () => api.get('/products'),
    createProduct: (data: any) => api.post('/products', data),
    deleteProduct: (id: string) => api.delete(`/products/${id}`),
};

export const loanService = {
    getLoanContracts: () => api.get('/loans/contracts'),
    createLoanContract: (data: any) => api.post('/loans/contracts', data),
    getDebtNotes: () => api.get('/loans/debt-notes'),
    createDebtNote: (data: any) => api.post('/loans/debt-notes', data),
    calculateInterest: (params: any) => api.post('/loans/calculate-interest', params),
    deleteContract: (id: string) => api.delete(`/loans/contracts/${id}`),
    deleteDebtNote: (id: string) => api.delete(`/loans/debt-notes/${id}`),
};

export const dimensionService = {
    getDimensions: (type?: number) => api.get(`/dimensions${type ? `?type=${type}` : ''}`),
    saveDimension: (data: any) => api.post('/dimensions', data),
    getConfigs: () => api.get('/dimensions/configs'),
    saveConfigs: (data: any[]) => api.post('/dimensions/configs', data),
    getGroups: () => api.get('/dimensions/groups'),
    saveGroup: (data: any) => api.post('/dimensions/groups', data),
    deleteDimension: (id: string) => api.delete(`/dimensions/${id}`),
};

export const systemService = {
    getParams: () => api.get('/system/params'),
    saveParams: (data: any) => api.post('/system/params', data),
    getUsers: () => api.get('/system/users'),
    saveUser: (data: any) => api.post('/system/users', data),
    saveRole: (data: any) => api.post('/system/roles', data),
    deleteRole: (id: string) => api.delete(`/system/roles/${id}`),
    getRoles: () => api.get('/system/roles'),
    getLogs: () => api.get('/system/logs'),
};

export const reminderService = {
    getReminders: () => api.get('/reminders'),
    getStats: () => api.get('/dashboard/stats'),
    getOverdueDetail: () => api.get('/reminders/overdue'),
    getIncompleteDetail: () => api.get('/reminders/incomplete')
};

// DEPRECATED: hcsnService - Legacy service cho backward compatibility
// InventoryModule đã migrate sang inventoryService
export const hcsnService = {
    getFundSources: () => api.get('/master/departments'),
    getBudgetEstimates: (params?: any) => api.get('/budget-control/budget-estimates', { params }),
    getOffBalanceLogs: (_params?: any) => Promise.resolve({ data: [] }), // DN không dùng TK ngoài bảng
    createOffBalanceLog: (_data: any) => Promise.resolve({ data: null }),
    getOffBalanceSummary: () => Promise.resolve({ data: { balance: 0 } }),
    // Bulk Import
    importFundSources: (fundSources: any[]) => api.post('/master/departments/import', { departments: fundSources }),
    importBudgetEstimates: (estimates: any[], fiscal_year?: number) =>
        api.post('/budget-control/budget-estimates/import', { estimates, fiscal_year }),
};

// ========================================
// DEBT MANAGEMENT SERVICE (TT 99/2025)
// Quản lý Công nợ và Tạm ứng
// ========================================
export const debtService = {
    // Tạm ứng (TK 141)
    getTemporaryAdvances: (params?: any) => api.get('/debt/temporary-advances', { params }),
    createTemporaryAdvance: (data: any) => api.post('/debt/temporary-advances', data),
    settleTemporaryAdvance: (id: string, data: any) => api.post(`/debt/temporary-advances/${id}/settle`, data),
    deleteTemporaryAdvance: (id: string) => api.delete(`/debt/temporary-advances/${id}`),

    // Cho vay nội bộ (TK 128)
    getBudgetAdvances: (params?: any) => api.get('/debt/budget-advances', { params }),
    createBudgetAdvance: (data: any) => api.post('/debt/budget-advances', data),
    repayBudgetAdvance: (id: string, data: any) => api.post(`/debt/budget-advances/${id}/repay`, data),
    deleteBudgetAdvance: (id: string) => api.delete(`/debt/budget-advances/${id}`),

    // Công nợ phải thu (TK 136, 138)
    getReceivables: (params?: any) => api.get('/debt/receivables', { params }),
    createReceivable: (data: any) => api.post('/debt/receivables', data),
    recordReceivablePayment: (id: string, data: any) => api.post(`/debt/receivables/${id}/record-payment`, data),
    deleteReceivable: (id: string) => api.delete(`/debt/receivables/${id}`),

    // Công nợ phải trả (TK 331, 336, 338)
    getPayables: (params?: any) => api.get('/debt/payables', { params }),
    createPayable: (data: any) => api.post('/debt/payables', data),
    recordPayablePayment: (id: string, data: any) => api.post(`/debt/payables/${id}/record-payment`, data),
    deletePayable: (id: string) => api.delete(`/debt/payables/${id}`),

    // Báo cáo
    getAgingReport: (type: 'receivables' | 'payables') => api.get('/debt/aging-report', { params: { type } }),
};

// ========================================
// E-INVOICE SERVICE - Hóa đơn điện tử
// Integration: VNPT, Viettel, BKAV, MISA
// ========================================
export const einvoiceService = {
    // Provider Management
    getProviders: () => api.get('/einvoice/providers'),
    getProviderConfig: (code: string) => api.get(`/einvoice/providers/${code}`),
    saveProviderConfig: (code: string, config: any) => api.post(`/einvoice/providers/${code}/config`, config),
    testConnection: (code: string) => api.post(`/einvoice/providers/${code}/test`),

    // Invoice Sync
    syncInvoices: (data: {
        providerCode: string;
        fromDate: string;
        toDate: string;
        filters?: any;
    }) => api.post('/einvoice/sync', data),
    getSyncLogs: (params?: { providerCode?: string; limit?: number }) =>
        api.get('/einvoice/sync-logs', { params }),

    // Invoice Management
    getInvoices: (params?: {
        status?: string;
        invoiceType?: string;
        fromDate?: string;
        toDate?: string;
        taxCode?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => api.get('/einvoice/invoices', { params }),
    getInvoice: (id: string) => api.get(`/einvoice/invoices/${id}`),
    updateInvoiceStatus: (id: string, status: string) =>
        api.patch(`/einvoice/invoices/${id}/status`, { status }),

    // Invoice Lookup (Real-time from provider)
    lookupInvoice: (params: {
        providerCode: string;
        invoiceId?: string;
        invoiceNo?: string;
        invoiceSeries?: string;
        taxCode?: string;
        fromDate?: string;
        toDate?: string;
    }) => api.get('/einvoice/lookup', { params }),

    // Voucher Matching
    matchToVoucher: (invoiceId: string, data: { voucherId: number; matchType?: string }) =>
        api.post(`/einvoice/match/${invoiceId}`, data),
    getPotentialMatches: (invoiceId: string) =>
        api.get(`/einvoice/invoices/${invoiceId}/potential-matches`),

    // Voucher Creation from Invoice
    getVoucherPreview: (invoiceId: string) =>
        api.get(`/einvoice/import/${invoiceId}/preview`),
    createVoucherFromInvoice: (invoiceId: string, options?: {
        voucherType?: string;
        expenseAccount?: string;
        paymentAccount?: string;
        revenueAccount?: string;
        receivableAccount?: string;
    }) => api.post(`/einvoice/import/${invoiceId}`, { options }),

    // XML Import (GDT)
    importFromXml: (xmlContent: string) =>
        api.post('/einvoice/xml-import', { xmlContent }),
    importBatchXml: (xmlContents: string[]) =>
        api.post('/einvoice/xml-import/batch', { xmlContents }),
};

export const xmlExportService = {
    getDocumentTypes: () => api.get('/xml-export/document-types'),
    getVouchers: (params: { fromDate?: string; toDate?: string; type?: string }) => api.post('/xml-export/vouchers', params),
    preview: (payload: { documentType: string; data: any }) => api.post('/xml-export/preview', payload),
    download: (payload: { documents: { type: string; data: any }[] }) =>
        api.post('/xml-export/download', payload, { responseType: 'blob' }),
    getHistory: () => api.get('/xml-export/history'),
};

// ========================================
// CUSTOM REPORT SERVICE - Báo cáo tùy biến
// Import Excel templates và generate reports
// ========================================
export const customReportService = {
    // Template analysis
    analyzeTemplate: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/reports/custom/analyze-template', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // AI Enhancement (optional)
    aiEnhance: (data: { unmappedFields: any[]; templateHash: string }) =>
        api.post('/reports/custom/ai-enhance', data),
    getAIStatus: () => api.get('/reports/custom/ai-status'),

    // Templates CRUD
    getTemplates: () => api.get('/reports/custom/templates'),
    getTemplate: (id: string) => api.get(`/reports/custom/templates/${id}`),
    saveTemplate: (data: {
        name: string;
        description?: string;
        parsedTemplate: any;
        fieldMappings: any[];
        aggregationRules?: any[];
        filename?: string;
        fileSize?: number;
        isShared?: boolean;
    }) => api.post('/reports/custom/templates', data),
    deleteTemplate: (id: string) => api.delete(`/reports/custom/templates/${id}`),
    updateMappings: (id: string, fieldMappings: any[]) =>
        api.post(`/reports/custom/update-mappings/${id}`, { fieldMappings }),

    // Report generation
    generateReport: (templateId: string, params: { filters?: any; outputFormat?: 'json' | 'excel' }) =>
        api.post(`/reports/custom/generate/${templateId}`, params, {
            responseType: params.outputFormat === 'excel' ? 'arraybuffer' : 'json'
        }),
    previewReport: (data: { fieldMappings: any[]; filters?: any }) =>
        api.post('/reports/custom/preview', data),

    // Schema & Logs
    getSchemaInfo: () => api.get('/reports/custom/schema-info'),
    getGenerationLogs: (params?: { limit?: number }) =>
        api.get('/reports/custom/generation-logs', { params }),
};

export default api;
