import axios from 'axios';
import logger from './utils/logger';
import type {
    Account,
    Partner,
    Product,
    Department,
    Voucher,
    VoucherItem,
    FixedAsset,
    CCDCItem,
    Employee,
    AllowanceType,
    PayrollRecord,
    TimekeepingRecord,
    Contract,
    SalaryHistory,
    Material,
    InventoryTransfer,
    RevenueCategory,
    RevenueReceipt,
    ExpenseCategory,
    ExpenseVoucher,
    Budget,
    Project,
    ProjectTask,
    SalesContract,
    BankAccount,
    TrialBalanceEntry,
    AuditTrailEntry,
    AuditAnomaly,
    ReconciliationRecord,
    EInvoice,
    SystemUser,
    SystemRole,
    SystemSetting,
    ChecklistItem,
    Dimension,
    DimensionConfig,
    DimensionGroup,
    LoanContract,
    DebtNote,
    OpeningBalance,
    StagingTransaction,
    AllocationItem,
    AllocationRecord,
    AllocationHistoryRecord,
    TemporaryAdvance,
    BudgetAdvance,
    Receivable,
    Payable,
} from './types/api.types';

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
            logger.error('[API] Unauthorized! Token might be invalid or expired.');
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
        return api.get<{ vouchers: Voucher[] }>(`/vouchers?${params.toString()}`);
    },
    getById: (id: string) => api.get<Voucher>(`/vouchers/${id}`),
    save: (data: Omit<Voucher, 'id' | 'created_at'> & { items: Omit<VoucherItem, 'id' | 'voucher_id'>[] }) =>
        api.post<Voucher>('/vouchers', data),
    update: (id: string, data: Partial<Voucher> & { items?: VoucherItem[] }) =>
        api.post<Voucher>(`/vouchers`, { ...data, id }),
    duplicate: (id: string) => api.post<Voucher>(`/vouchers/${id}/duplicate`),
    delete: (id: string) => api.delete(`/vouchers/${id}`),
};

export const masterDataService = {
    getAccounts: () => api.get<Account[]>('/accounts'),
    getPartners: () => api.get<Partner[]>('/partners'),
    saveAccounts: (accounts: Account[]) => api.post('/master/accounts', { accounts }),
    savePartners: (partners: Partner[]) => api.post('/master/partners', { partners }),
    getAccountBalances: () => api.get<TrialBalanceEntry[]>('/accounts/balances'),
    getAccountBalance: (code: string) => api.get<{ balance: number }>(`/accounts/balance/${code}`),
    getCashBalances: () => api.get('/balances'),
    savePartner: (data: Omit<Partner, 'id' | 'created_at'>) => api.post<Partner>('/partners', data),
    createPartner: (data: Omit<Partner, 'id' | 'created_at'>) => api.post<Partner>('/partners', data),
    deleteAccount: (code: string) => api.delete(`/accounts/${code}`),
    deletePartner: (id: string) => api.delete(`/partners/${id}`),
    getProducts: () => api.get<Product[]>('/products'),
    saveProducts: (products: Product[]) => api.post('/master/products', { products }),
    getDepartments: () => api.get<Department[]>('/master/departments'),
    getFundSources: () => api.get<Department[]>('/master/departments'),
};

export const taxService = {
    lookupGST: (taxCode: string) => api.get<{ taxCode: string; name: string; address: string }>(`/tax/lookup/${taxCode}`),
    syncInvoices: (params: { from: string; to: string; type: 'input' | 'output'; credentials?: Record<string, string> }) =>
        api.post('/tax/sync', params),
    uploadXml: (xmlContent: string) => api.post('/tax/upload-xml', { xml_content: xmlContent }),
    getInvoiceDetails: (id: string) => api.get(`/tax/invoices/${id}`),
    getVatReport: (params: { type: string; from: string; to: string }) => api.get('/reports/tax-vat', { params }),
    getPitReport: (params: { from: string; to: string }) => api.get('/reports/tax-pit', { params }),
    getDeclaration: (params: { type: string; from: string; to: string }) => api.get('/reports/tax-declaration', { params }),
};

export const openingBalanceService = {
    get: (period: string) => api.get<OpeningBalance[]>('/opening-balance', { params: { period } }),
    save: (period: string, balances: OpeningBalance[]) => api.post('/opening-balance/save', { period, balances }),
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
    createReconciliation: (data: Omit<ReconciliationRecord, 'id'>) => api.post('/audit/reconciliations', data),
    approveReconciliation: (id: string, data?: { notes?: string }) =>
        api.put(`/audit/reconciliations/${id}/approve`, data),

    // Sessions
    getSessions: (params?: { is_active?: boolean; user_id?: string; limit?: number }) =>
        api.get('/audit/sessions', { params }),
};

export const bankService = {
    getAccounts: () => api.get<BankAccount[]>('/bank/accounts'),
    addAccount: (data: Omit<BankAccount, 'id'>) => api.post<BankAccount>('/bank/accounts', data),
    getStaging: () => api.get<StagingTransaction[]>('/staging?source=bank_api'),
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
    getAll: () => api.get<ChecklistItem[]>('/checklist'),
    add: (data: { title: string; category: string }) => api.post<ChecklistItem>('/checklist', data),
    update: (id: number, data: Partial<ChecklistItem>) => api.put<ChecklistItem>(`/checklist/${id}`, data),
    delete: (id: number) => api.delete(`/checklist/${id}`),
};

interface AssetFilter {
    status?: string;
    category?: string;
    department_id?: string;
    from_date?: string;
    to_date?: string;
}

interface AssetTransferData {
    asset_id: string;
    from_department: string;
    to_department: string;
    transfer_date: string;
    reason?: string;
}

interface AssetRevaluationData {
    new_value: number;
    revaluation_date: string;
    reason?: string;
}

interface InfrastructureAsset {
    id?: string;
    code: string;
    name: string;
    location?: string;
    acquisition_date?: string;
    acquisition_value?: number;
    condition?: string;
    status?: string;
}

interface MaintenanceRecord {
    asset_id: string;
    maintenance_date: string;
    description: string;
    cost?: number;
}

interface Investment {
    id?: string;
    code: string;
    name: string;
    investment_type: string;
    amount: number;
    start_date: string;
    maturity_date?: string;
    interest_rate?: number;
}

interface InvestmentIncome {
    investment_id: string;
    income_date: string;
    amount: number;
    income_type: string;
}

interface AssetInventoryRecord {
    id?: string;
    inventory_date: string;
    department_id?: string;
    status?: string;
}

interface AssetInventoryItem {
    asset_id: string;
    actual_condition: string;
    actual_location?: string;
    notes?: string;
}

export const assetService = {
    getAssets: () => api.get<FixedAsset[]>('/assets'),
    getCCDC: () => api.get<CCDCItem[]>('/ccdc'),
    createAsset: (data: Omit<FixedAsset, 'id' | 'created_at'>) => api.post<FixedAsset>('/assets', data),
    createCCDC: (data: Omit<CCDCItem, 'id'>) => api.post<CCDCItem>('/ccdc', data),
    updateCCDC: (id: string, data: Partial<CCDCItem>) => api.put<CCDCItem>(`/ccdc/${id}`, data),
    depreciateAssets: (data: { period: string; asset_ids?: string[] }) => api.post('/assets/depreciate', data),
    disposeAsset: (data: { asset_id: string; disposal_date: string; disposal_value: number; reason?: string }) =>
        api.post('/assets/dispose', data),
    deleteAsset: (id: string) => api.delete(`/assets/${id}`),
    deleteCCDC: (id: string) => api.delete(`/ccdc/${id}`),

    // Allocation History (Chi phí trả trước)
    getAllocationHistory: (params?: { period?: string; item_id?: string }) =>
        api.get<AllocationHistoryRecord[]>('/allocation-history', { params }),
    checkAllocationDuplicate: (period: string, item_id: string) =>
        api.get<{ exists: boolean }>('/allocation-history/check-duplicate', { params: { period, item_id } }),
    recordAllocation: (data: Omit<AllocationHistoryRecord, 'id' | 'created_at'>) =>
        api.post<AllocationHistoryRecord>('/allocation-history', data),
    getAllocationSummary: () => api.get('/allocation-history/summary'),

    // Fixed Assets Extended
    getFixedAssets: (params?: AssetFilter) => api.get<FixedAsset[]>('/assets/fixed', { params }),
    createFixedAsset: (data: Omit<FixedAsset, 'id' | 'created_at'>) => api.post<FixedAsset>('/assets/fixed', data),
    updateFixedAsset: (id: string, data: Partial<FixedAsset>) => api.put<FixedAsset>(`/assets/fixed/${id}`, data),
    deleteFixedAsset: (id: string, data: { reason?: string }) => {
        return api.delete(`/assets/fixed/${id}`, { data });
    },
    calculateDepreciation: (data: { period: string; asset_ids?: string[] }) =>
        api.post('/assets/fixed/depreciation', data),
    transferAsset: (data: AssetTransferData) => api.post('/assets/fixed/transfer', data),
    revaluateAsset: (id: string, data: AssetRevaluationData) => api.put(`/assets/fixed/${id}/revaluation`, data),

    // Infrastructure Assets
    getInfrastructure: () => api.get<InfrastructureAsset[]>('/infrastructure-assets'),
    createInfrastructure: (data: Omit<InfrastructureAsset, 'id'>) =>
        api.post<InfrastructureAsset>('/infrastructure-assets', data),
    updateInfrastructure: (id: string, data: Partial<InfrastructureAsset>) =>
        api.put<InfrastructureAsset>(`/infrastructure-assets/${id}`, data),
    deleteInfrastructure: (id: string) => api.delete(`/infrastructure-assets/${id}`),
    recordMaintenance: (data: MaintenanceRecord) => api.post('/infrastructure/maintenance', data),
    updateCondition: (id: string, data: { condition: string; notes?: string }) =>
        api.put(`/infrastructure/${id}/condition`, data),

    // Long-term Investments
    getInvestments: (params?: { status?: string; type?: string }) => api.get<Investment[]>('/investments/long-term', { params }),
    createInvestment: (data: Omit<Investment, 'id'>) => api.post<Investment>('/investments/long-term', data),
    updateInvestment: (id: string, data: Partial<Investment>) => api.put<Investment>(`/investments/long-term/${id}`, data),
    deleteInvestment: (id: string) => api.delete(`/investments/long-term/${id}`),
    recordInvestmentIncome: (data: InvestmentIncome) => api.post('/investments/income', data),

    // Inventory
    getInventoryRecords: (params?: { status?: string; from_date?: string; to_date?: string }) =>
        api.get<AssetInventoryRecord[]>('/assets/inventory', { params }),
    createInventory: (data: Omit<AssetInventoryRecord, 'id'>) =>
        api.post<AssetInventoryRecord>('/assets/inventory', data),
    addInventoryItem: (id: string, data: AssetInventoryItem) =>
        api.post(`/assets/inventory/${id}/items`, data),
    completeInventory: (id: string, data: { notes?: string }) =>
        api.put(`/assets/inventory/${id}/complete`, data),
    getInventoryReport: (id: string) => api.get(`/assets/inventory/${id}/report`),

    // Asset Cards
    getAssetCard: (id: string, params?: { include_history?: boolean }) => api.get(`/assets/cards/${id}`, { params }),
    updateAssetCard: (id: string, data: Partial<FixedAsset>) => api.put(`/assets/cards/${id}`, data),
};

export const budgetService = {
    getAll: (period?: string) => api.get<Budget[]>('/budgets', { params: { period } }),
    save: (data: Omit<Budget, 'id'>) => api.post<Budget>('/budgets', data),
};

interface ReportPeriodParams {
    from_date?: string;
    to_date?: string;
    period?: string;
    fiscal_year?: number;
    fiscal_period?: number;
}

interface LedgerParams extends ReportPeriodParams {
    account_code?: string;
    partner_code?: string;
}

export const reportService = {
    // === SỔ KẾ TOÁN (ACCOUNTING REGISTERS) ===
    getTrialBalance: (params: ReportPeriodParams) => api.get('/reports/trial-balance', { params }),
    getGeneralLedger: (params: LedgerParams) => api.get('/reports/general-ledger', { params }),
    getGeneralJournal: (params: ReportPeriodParams) => api.get('/reports/general-journal', { params }),
    getCashBook: (params: ReportPeriodParams) => api.get('/reports/cash-book', { params }),
    getBankBook: (params: ReportPeriodParams & { bank_account?: string }) => api.get('/reports/bank-book', { params }),
    getInventoryLedger: (params: ReportPeriodParams & { item_code?: string }) => api.get('/reports/inventory-ledger', { params }),
    getInventorySummary: (params: ReportPeriodParams & { warehouse_id?: string }) => api.get('/reports/inventory', { params }),
    getTransactionDetails: (params: LedgerParams) => api.get('/reports/transaction-details', { params }),

    // === BÁO CÁO TÀI CHÍNH DOANH NGHIỆP (TT 99/2025) ===
    getBalanceSheetDN: (params: ReportPeriodParams) => api.get('/reports/balance-sheet-dn', { params }),
    getProfitLoss: (params: ReportPeriodParams) => api.get('/reports/profit-loss', { params }),
    getCashFlowDN: (params: ReportPeriodParams) => api.get('/reports/cash-flow-dn', { params }),

    // === BÁO CÁO NGÂN SÁCH NỘI BỘ ===
    getBudgetPerformance: (params: ReportPeriodParams & { department_code?: string }) =>
        api.get('/reports/budget-performance', { params }),

    getBalanceSheet: (params: ReportPeriodParams) => api.get('/reports/balance-sheet', { params }),
    getCashFlow: (params: ReportPeriodParams) => api.get('/reports/cash-flow-dn', { params }),
    getPnL: (params: ReportPeriodParams) => api.get('/reports/pnl', { params }),
    getDebtLedger: (params: LedgerParams) => api.get('/reports/debt-ledger', { params }),
    getVatIn: (params: ReportPeriodParams) => api.get('/reports/vat-in', { params }),
    getVatOut: (params: ReportPeriodParams) => api.get('/reports/vat-out', { params }),
    getProjectPnL: (params: ReportPeriodParams & { project_code?: string }) => api.get('/reports/project-pnl', { params }),
};

interface BHXHRecord {
    employee_code: string;
    employee_name: string;
    social_insurance_no: string;
    salary: number;
    bhxh_amount: number;
    bhyt_amount: number;
    bhtn_amount: number;
}

interface EmployeeAllowanceInput {
    employee_id: string;
    allowance_type_id: string;
    amount: number;
    start_date?: string;
    end_date?: string;
}

export const hrService = {
    getEmployees: () => api.get<Employee[]>('/hr/employees'),
    saveEmployee: (data: Omit<Employee, 'id' | 'created_at'>) => api.post<Employee>('/hr/employees', data),
    deleteEmployee: (id: string) => api.delete(`/employees/${id}`),

    // Extended APIs
    getSalaryGrades: () => api.get('/hr/salary-grades'),

    // Allowance Types (Full CRUD)
    getAllowanceTypes: () => api.get<AllowanceType[]>('/hr/allowance-types'),
    createAllowanceType: (data: Omit<AllowanceType, 'id'>) => api.post<AllowanceType>('/hr/allowance-types', data),
    updateAllowanceType: (id: string, data: Partial<AllowanceType>) =>
        api.put<AllowanceType>(`/hr/allowance-types/${id}`, data),
    deleteAllowanceType: (id: string) => api.delete(`/hr/allowance-types/${id}`),

    // Employee Allowances
    getEmployeeAllowances: (id: string) => api.get(`/hr/employee-allowances/${id}`),
    addEmployeeAllowance: (data: EmployeeAllowanceInput) => api.post('/hr/employee-allowances', data),

    // Contracts & Decisions
    getContracts: () => api.get<Contract[]>('/hr/contracts'),
    createContract: (data: Omit<Contract, 'id'>) => api.post<Contract>('/hr/contracts', data),
    updateContract: (id: string, data: Partial<Contract>) => api.put<Contract>(`/hr/contracts/${id}`, data),

    // Salary History
    getSalaryHistory: (employee_id?: string) => api.get<SalaryHistory[]>('/hr/salary-history', { params: { employee_id } }),
    createSalaryChange: (data: Omit<SalaryHistory, 'id'>) => api.post<SalaryHistory>('/hr/salary-history', data),

    // Payroll & Timekeeping
    getTimekeeping: (params: { period: string }) => api.get<TimekeepingRecord[]>('/hr/timekeeping', { params }),
    saveTimekeeping: (data: Omit<TimekeepingRecord, 'id'>) => api.post<TimekeepingRecord>('/hr/timekeeping', data),
    getPayroll: (params: { period: string }) => api.get<PayrollRecord[]>('/hr/payroll', { params }),
    calculatePayroll: (data: { period: string }) => api.post('/hr/calculate-payroll', data),

    // Insurance Reporting & BHXH Reconciliation
    getInsuranceSummary: (period: string) => api.get('/hr/insurance/summary', { params: { period } }),
    getInsuranceDetail: (period: string) => api.get('/hr/insurance/detail', { params: { period } }),
    importBHXHData: (data: { period: string; bhxh_data: BHXHRecord[] }) => api.post('/hr/insurance/import-bhxh', data),
    reconcileBHXH: (period: string) => api.get('/hr/insurance/reconcile', { params: { period } }),
    resolveDiscrepancy: (data: { discrepancy_id: number; resolution: string; notes: string }) =>
        api.post('/hr/insurance/resolve-discrepancy', data),
};

export const salesService = {
    // Orders
    getOrders: () => api.get('/sales/orders'),
    createOrder: (data: any) => api.post('/sales/orders', data),
    updateOrder: (id: string, data: any) => api.put(`/sales/orders/${id}`, data),
    deleteOrder: (id: string) => api.delete(`/sales/orders/${id}`),

    // Invoices
    getInvoices: (type?: 'INVOICE' | 'SERVICE') => api.get('/sales/invoices', { params: { type } }),
    createInvoice: (data: any) => api.post('/sales/invoices', data),
    updateInvoice: (id: string, data: any) => api.put(`/sales/invoices/${id}`, data),
    deleteInvoice: (id: string) => api.delete(`/sales/invoices/${id}`),

    // Deliveries (Giao hàng)
    getDeliveries: (params?: { status?: string; from_date?: string; to_date?: string }) =>
        api.get('/sales/deliveries', { params }),
    getDeliveryDetail: (id: string) => api.get(`/sales/deliveries/${id}`),
    createDelivery: (data: any) => api.post('/sales/deliveries', data),
    updateDelivery: (id: string, data: any) => api.put(`/sales/deliveries/${id}`, data),
    deleteDelivery: (id: string) => api.delete(`/sales/deliveries/${id}`),

    // Returns & Payments
    getReturns: () => api.get('/sales/returns'),
    deleteReturn: (id: string) => api.delete(`/sales/returns/${id}`),
    getPayments: () => api.get('/sales/payments'),
    deletePayment: (id: string) => api.delete(`/sales/payments/${id}`),

    // Bulk Import
    importOrders: (data: any[]) => api.post('/sales/orders/import', { items: data }),
    importInvoices: (data: any[]) => api.post('/sales/invoices/import', { items: data }),
};

// ========================================
// REVENUE SERVICE (TT 99/2025)
// Quản lý Doanh thu
// ========================================
interface RevenueCategoryParams {
    is_active?: boolean;
    parent_id?: string;
}

interface RevenueReceiptParams {
    from_date?: string;
    to_date?: string;
    category_id?: string;
    partner_code?: string;
    status?: string;
}

export const revenueService = {
    // Revenue Categories (Danh mục loại thu)
    getCategories: (params?: RevenueCategoryParams) => api.get<RevenueCategory[]>('/revenue/categories', { params }),
    createCategory: (data: Omit<RevenueCategory, 'id'>) => api.post<RevenueCategory>('/revenue/categories', data),

    // Revenue Receipts (Biên lai thu tiền)
    getReceipts: (params?: RevenueReceiptParams) => api.get<RevenueReceipt[]>('/revenue/receipts', { params }),
    getReceiptDetail: (id: string) => api.get<RevenueReceipt>(`/revenue/receipts/${id}`),
    createReceipt: (data: Omit<RevenueReceipt, 'id'>) => api.post<RevenueReceipt>('/revenue/receipts', data),
    updateReceipt: (id: string, data: Partial<RevenueReceipt>) =>
        api.put<RevenueReceipt>(`/revenue/receipts/${id}`, data),
    deleteReceipt: (id: string) => api.delete(`/revenue/receipts/${id}`),

    // Revenue Reports (Báo cáo Doanh thu)
    getReport: (params?: RevenueReceiptParams) => api.get('/revenue/report', { params }),
    getBudgetComparison: (params: { fiscal_year: number }) => api.get('/revenue/budget-comparison', { params }),
};

interface ExpenseCategoryParams {
    is_active?: boolean;
    parent_id?: string;
}

interface ExpenseVoucherParams {
    from_date?: string;
    to_date?: string;
    category_id?: string;
    partner_code?: string;
    voucher_type?: string;
    status?: string;
}

export const expenseService = {
    // Expense Categories (Khoản mục chi)
    getCategories: (params?: ExpenseCategoryParams) => api.get<ExpenseCategory[]>('/expense/categories', { params }),
    createCategory: (data: Omit<ExpenseCategory, 'id'>) => api.post<ExpenseCategory>('/expense/categories', data),

    // Expense Vouchers (Phiếu chi, Ủy nhiệm chi, Giảm trừ)
    getVouchers: (params?: ExpenseVoucherParams) => api.get<ExpenseVoucher[]>('/expense/vouchers', { params }),
    getVoucherDetail: (id: string) => api.get<ExpenseVoucher>(`/expense/vouchers/${id}`),
    createVoucher: (data: Omit<ExpenseVoucher, 'id'>) => api.post<ExpenseVoucher>('/expense/vouchers', data),
    updateVoucher: (id: string, data: Partial<ExpenseVoucher>) =>
        api.put<ExpenseVoucher>(`/expense/vouchers/${id}`, data),
    deleteVoucher: (id: string) => api.delete(`/expense/vouchers/${id}`),

    // Expense Reports
    getReport: (params?: ExpenseVoucherParams) => api.get('/expense/report', { params }),
    getBudgetComparison: (params: { fiscal_year: number }) => api.get('/expense/budget-comparison', { params }),
};


export const purchaseService = {
    // Purchase Requests (Đề xuất mua hàng)
    getRequests: (params?: { status?: string; from_date?: string; to_date?: string }) =>
        api.get('/purchase/requests', { params }),
    getRequestDetail: (id: string) => api.get(`/purchase/requests/${id}`),
    createRequest: (data: any) => api.post('/purchase/requests', data),
    updateRequest: (id: string, data: any) => api.put(`/purchase/requests/${id}`, data),
    deleteRequest: (id: string) => api.delete(`/purchase/requests/${id}`),
    approveRequest: (id: string, data?: { notes?: string }) => api.post(`/purchase/requests/${id}/approve`, data),
    rejectRequest: (id: string, data?: { reason?: string }) => api.post(`/purchase/requests/${id}/reject`, data),

    // Purchase Orders
    getOrders: () => api.get('/purchase/orders'),
    createOrder: (data: any) => api.post('/purchase/orders', data),
    updateOrder: (id: string, data: any) => api.put(`/purchase/orders/${id}`, data),
    getInvoices: (type?: 'INBOUND' | 'SERVICE') => api.get('/purchase/invoices', { params: { type } }),
    getReturns: () => api.get('/purchase/returns'),
    getPayments: () => api.get('/purchase/payments'),
    deleteOrder: (id: string) => api.delete(`/purchase/orders/${id}`),
    deleteInvoice: (id: string) => api.delete(`/purchase/invoices/${id}`),
    deleteReturn: (id: string) => api.delete(`/purchase/returns/${id}`),
    deletePayment: (id: string) => api.delete(`/purchase/payments/${id}`),

    // Bulk Import
    importOrders: (data: any[]) => api.post('/purchase/orders/import', { items: data }),
    importInvoices: (data: any[]) => api.post('/purchase/invoices/import', { items: data }),
};

interface MaterialParams {
    category?: string;
    warehouse_id?: string;
    status?: string;
}

interface InventorySummaryParams {
    from_date?: string;
    to_date?: string;
    warehouse_id?: string;
    category?: string;
}

export const inventoryService = {
    getReceipts: () => api.get('/inventory/receipts'),
    getIssues: () => api.get('/inventory/issues'),
    // Materials (Vật tư)
    getMaterials: (params?: MaterialParams) => api.get<Material[]>('/inventory/materials', { params }),
    createMaterial: (data: Omit<Material, 'id'>) => api.post<Material>('/inventory/materials', data),
    updateMaterial: (id: string, data: Partial<Material>) => api.put<Material>(`/inventory/materials/${id}`, data),
    deleteMaterial: (id: string) => api.delete(`/inventory/materials/${id}`),
    importMaterials: (materials: Omit<Material, 'id'>[]) => api.post('/inventory/materials/import', { materials }),
    // Transfers
    getTransfers: () => api.get<InventoryTransfer[]>('/inventory/transfers'),
    createTransfer: (data: Omit<InventoryTransfer, 'id'>) => api.post<InventoryTransfer>('/inventory/transfers', data),
    // Summary & Cards
    getSummary: (params?: InventorySummaryParams) => api.get('/inventory/summary', { params }),
    getCards: (params?: InventorySummaryParams) => api.get('/inventory/cards', { params }),
};

export const contractService = {
    getContracts: (type?: 'sales' | 'purchase') => api.get<SalesContract[]>('/contracts', { params: { type } }),
    saveContract: (data: Omit<SalesContract, 'id'>) => api.post<SalesContract>('/contracts', data),
    getAppendices: () => api.get('/contracts/appendices'),
    getExpiringContracts: (days: number = 30) => api.get<(SalesContract & { days_remaining: number })[]>('/contracts/expiring', { params: { days } }),
    deleteContract: (id: string) => api.delete(`/contracts/${id}`),
};


export const projectService = {
    getProjects: () => api.get<Project[]>('/projects'),
    saveProject: (data: Omit<Project, 'id'>) => api.post<Project>('/projects', data),
    getTasks: (params: { project_id?: string; status?: string }) => api.get<ProjectTask[]>('/projects/tasks', { params }),
    updateTask: (data: Partial<ProjectTask> & { id: string }) => api.post<ProjectTask>('/projects/tasks', data),
    getBudgets: (params: { project_id?: string; fiscal_year?: number }) => api.get('/projects/budgets', { params }),
    getPNL: () => api.get('/projects/pnl'),
    deleteProject: (id: string) => api.delete(`/projects/${id}`),
};

export const productService = {
    getProducts: () => api.get<Product[]>('/products'),
    createProduct: (data: Omit<Product, 'id'>) => api.post<Product>('/products', data),
    deleteProduct: (id: string) => api.delete(`/products/${id}`),
};

export const loanService = {
    getLoanContracts: () => api.get<LoanContract[]>('/loans/contracts'),
    createLoanContract: (data: Omit<LoanContract, 'id'>) => api.post<LoanContract>('/loans/contracts', data),
    getDebtNotes: () => api.get<DebtNote[]>('/loans/debt-notes'),
    createDebtNote: (data: Omit<DebtNote, 'id'>) => api.post<DebtNote>('/loans/debt-notes', data),
    calculateInterest: (params: { contract_id: string; to_date: string }) => api.post('/loans/calculate-interest', params),
    deleteContract: (id: string) => api.delete(`/loans/contracts/${id}`),
    deleteDebtNote: (id: string) => api.delete(`/loans/debt-notes/${id}`),
};

export const dimensionService = {
    getDimensions: (type?: number) => api.get<Dimension[]>(`/dimensions${type ? `?type=${type}` : ''}`),
    saveDimension: (data: Omit<Dimension, 'id'>) => api.post<Dimension>('/dimensions', data),
    getConfigs: () => api.get<DimensionConfig[]>('/dimensions/configs'),
    saveConfigs: (data: DimensionConfig[]) => api.post('/dimensions/configs', data),
    getGroups: () => api.get<DimensionGroup[]>('/dimensions/groups'),
    saveGroup: (data: Omit<DimensionGroup, 'id'>) => api.post<DimensionGroup>('/dimensions/groups', data),
    deleteDimension: (id: string) => api.delete(`/dimensions/${id}`),
};

export const systemService = {
    getParams: () => api.get<SystemSetting[]>('/system/params'),
    saveParams: (data: SystemSetting) => api.post('/system/params', data),
    getUsers: () => api.get<SystemUser[]>('/system/users'),
    saveUser: (data: Omit<SystemUser, 'id' | 'last_login'> & { password?: string }) =>
        api.post<SystemUser>('/system/users', data),
    saveRole: (data: Omit<SystemRole, 'id'>) => api.post<SystemRole>('/system/roles', data),
    deleteRole: (id: string) => api.delete(`/system/roles/${id}`),
    getRoles: () => api.get<SystemRole[]>('/system/roles'),
    getLogs: () => api.get('/system/logs'),
};

export const reminderService = {
    getReminders: () => api.get('/reminders'),
    getStats: () => api.get('/dashboard/stats'),
    getOverdueDetail: () => api.get('/reminders/overdue'),
    getIncompleteDetail: () => api.get('/reminders/incomplete')
};

// ========================================
// DEBT MANAGEMENT SERVICE (TT 99/2025)
// Quản lý Công nợ và Tạm ứng
// ========================================
interface DebtParams {
    partner_code?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
}

interface SettlementData {
    settlement_date: string;
    amount: number;
    voucher_id?: string;
    notes?: string;
}

interface PaymentRecordData {
    payment_date: string;
    amount: number;
    voucher_id?: string;
    notes?: string;
}

export const debtService = {
    // Tạm ứng (TK 141)
    getTemporaryAdvances: (params?: DebtParams) => api.get<TemporaryAdvance[]>('/debt/temporary-advances', { params }),
    createTemporaryAdvance: (data: Omit<TemporaryAdvance, 'id' | 'settled_amount' | 'balance'>) =>
        api.post<TemporaryAdvance>('/debt/temporary-advances', data),
    settleTemporaryAdvance: (id: string, data: SettlementData) =>
        api.post(`/debt/temporary-advances/${id}/settle`, data),
    deleteTemporaryAdvance: (id: string) => api.delete(`/debt/temporary-advances/${id}`),

    // Cho vay nội bộ (TK 128)
    getBudgetAdvances: (params?: DebtParams) => api.get<BudgetAdvance[]>('/debt/budget-advances', { params }),
    createBudgetAdvance: (data: Omit<BudgetAdvance, 'id' | 'repaid_amount' | 'balance'>) =>
        api.post<BudgetAdvance>('/debt/budget-advances', data),
    repayBudgetAdvance: (id: string, data: PaymentRecordData) =>
        api.post(`/debt/budget-advances/${id}/repay`, data),
    deleteBudgetAdvance: (id: string) => api.delete(`/debt/budget-advances/${id}`),

    // Công nợ phải thu (TK 136, 138)
    getReceivables: (params?: DebtParams) => api.get<Receivable[]>('/debt/receivables', { params }),
    createReceivable: (data: Omit<Receivable, 'id' | 'paid_amount' | 'balance'>) =>
        api.post<Receivable>('/debt/receivables', data),
    recordReceivablePayment: (id: string, data: PaymentRecordData) =>
        api.post(`/debt/receivables/${id}/record-payment`, data),
    deleteReceivable: (id: string) => api.delete(`/debt/receivables/${id}`),

    // Công nợ phải trả (TK 331, 336, 338)
    getPayables: (params?: DebtParams) => api.get<Payable[]>('/debt/payables', { params }),
    createPayable: (data: Omit<Payable, 'id' | 'paid_amount' | 'balance'>) =>
        api.post<Payable>('/debt/payables', data),
    recordPayablePayment: (id: string, data: PaymentRecordData) =>
        api.post(`/debt/payables/${id}/record-payment`, data),
    deletePayable: (id: string) => api.delete(`/debt/payables/${id}`),

    // Báo cáo
    getAgingReport: (type: 'receivables' | 'payables') => api.get('/debt/aging-report', { params: { type } }),
};

// ========================================
// E-INVOICE SERVICE - Hóa đơn điện tử
// Integration: VNPT, Viettel, BKAV, MISA
// ========================================
interface EInvoiceProviderConfig {
    api_url?: string;
    username?: string;
    password?: string;
    token?: string;
    certificate?: string;
}

interface EInvoiceSyncFilters {
    invoice_type?: string;
    status?: string;
}

interface EInvoiceParams {
    status?: string;
    invoiceType?: string;
    fromDate?: string;
    toDate?: string;
    taxCode?: string;
    search?: string;
    page?: number;
    limit?: number;
}

interface EInvoiceLookupParams {
    providerCode: string;
    invoiceId?: string;
    invoiceNo?: string;
    invoiceSeries?: string;
    taxCode?: string;
    fromDate?: string;
    toDate?: string;
}

interface VoucherCreationOptions {
    voucherType?: string;
    expenseAccount?: string;
    paymentAccount?: string;
    revenueAccount?: string;
    receivableAccount?: string;
}

export const einvoiceService = {
    // Provider Management
    getProviders: () => api.get('/einvoice/providers'),
    getProviderConfig: (code: string) => api.get(`/einvoice/providers/${code}`),
    saveProviderConfig: (code: string, config: EInvoiceProviderConfig) =>
        api.post(`/einvoice/providers/${code}/config`, config),
    testConnection: (code: string) => api.post(`/einvoice/providers/${code}/test`),

    // Invoice Sync
    syncInvoices: (data: {
        providerCode: string;
        fromDate: string;
        toDate: string;
        filters?: EInvoiceSyncFilters;
    }) => api.post('/einvoice/sync', data),
    getSyncLogs: (params?: { providerCode?: string; limit?: number }) =>
        api.get('/einvoice/sync-logs', { params }),

    // Invoice Management
    getInvoices: (params?: EInvoiceParams) => api.get<EInvoice[]>('/einvoice/invoices', { params }),
    getInvoice: (id: string) => api.get<EInvoice>(`/einvoice/invoices/${id}`),
    updateInvoiceStatus: (id: string, status: string) =>
        api.patch(`/einvoice/invoices/${id}/status`, { status }),

    // Invoice Lookup (Real-time from provider)
    lookupInvoice: (params: EInvoiceLookupParams) => api.get('/einvoice/lookup', { params }),

    // Voucher Matching
    matchToVoucher: (invoiceId: string, data: { voucherId: number; matchType?: string }) =>
        api.post(`/einvoice/match/${invoiceId}`, data),
    getPotentialMatches: (invoiceId: string) =>
        api.get(`/einvoice/invoices/${invoiceId}/potential-matches`),

    // Voucher Creation from Invoice
    getVoucherPreview: (invoiceId: string) =>
        api.get(`/einvoice/import/${invoiceId}/preview`),
    createVoucherFromInvoice: (invoiceId: string, options?: VoucherCreationOptions) =>
        api.post(`/einvoice/import/${invoiceId}`, { options }),

    // XML Import (GDT)
    importFromXml: (xmlContent: string) =>
        api.post('/einvoice/xml-import', { xmlContent }),
    importBatchXml: (xmlContents: string[]) =>
        api.post('/einvoice/xml-import/batch', { xmlContents }),
};

interface XmlDocumentData {
    voucher_ids?: string[];
    period?: string;
    fiscal_year?: number;
}

interface XmlDocument {
    type: string;
    data: XmlDocumentData;
}

export const xmlExportService = {
    getDocumentTypes: () => api.get('/xml-export/document-types'),
    getVouchers: (params: { fromDate?: string; toDate?: string; type?: string }) =>
        api.post('/xml-export/vouchers', params),
    preview: (payload: { documentType: string; data: XmlDocumentData }) =>
        api.post('/xml-export/preview', payload),
    download: (payload: { documents: XmlDocument[] }) =>
        api.post('/xml-export/download', payload, { responseType: 'blob' }),
    getHistory: () => api.get('/xml-export/history'),
};

// ========================================
// CUSTOM REPORT SERVICE - Báo cáo tùy biến
// Import Excel templates và generate reports
// ========================================
interface ParsedTemplate {
    sheets: Array<{
        name: string;
        rows: number;
        columns: number;
        cells: Array<{ row: number; col: number; value: string }>;
    }>;
}

interface FieldMapping {
    field_name: string;
    source_table: string;
    source_column: string;
    aggregation?: string;
    formula?: string;
}

interface AggregationRule {
    field_name: string;
    aggregation_type: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
    group_by?: string[];
}

interface UnmappedField {
    field_name: string;
    cell_reference: string;
    context?: string;
}

interface ReportFilters {
    from_date?: string;
    to_date?: string;
    account_code?: string;
    partner_code?: string;
    department_code?: string;
}

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
    aiEnhance: (data: { unmappedFields: UnmappedField[]; templateHash: string }) =>
        api.post('/reports/custom/ai-enhance', data),
    getAIStatus: () => api.get('/reports/custom/ai-status'),

    // Templates CRUD
    getTemplates: () => api.get('/reports/custom/templates'),
    getTemplate: (id: string) => api.get(`/reports/custom/templates/${id}`),
    saveTemplate: (data: {
        name: string;
        description?: string;
        parsedTemplate: ParsedTemplate;
        fieldMappings: FieldMapping[];
        aggregationRules?: AggregationRule[];
        filename?: string;
        fileSize?: number;
        isShared?: boolean;
    }) => api.post('/reports/custom/templates', data),
    deleteTemplate: (id: string) => api.delete(`/reports/custom/templates/${id}`),
    updateMappings: (id: string, fieldMappings: FieldMapping[]) =>
        api.post(`/reports/custom/update-mappings/${id}`, { fieldMappings }),

    // Report generation
    generateReport: (templateId: string, params: { filters?: ReportFilters; outputFormat?: 'json' | 'excel' }) =>
        api.post(`/reports/custom/generate/${templateId}`, params, {
            responseType: params.outputFormat === 'excel' ? 'arraybuffer' : 'json'
        }),
    previewReport: (data: { fieldMappings: FieldMapping[]; filters?: ReportFilters }) =>
        api.post('/reports/custom/preview', data),

    // Schema & Logs
    getSchemaInfo: () => api.get('/reports/custom/schema-info'),
    getGenerationLogs: (params?: { limit?: number }) =>
        api.get('/reports/custom/generation-logs', { params }),
};

export default api;
