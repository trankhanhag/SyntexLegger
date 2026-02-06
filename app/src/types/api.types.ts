/**
 * API Type Definitions for SyntexLegger Frontend
 * Based on Thông tư 99/2025/TT-BTC (Enterprise Accounting)
 */

// ============================================
// COMMON TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// CORE ACCOUNTING TYPES
// ============================================

export interface Account {
  account_code: string;
  account_name: string;
  account_name_en?: string;
  category?: string;
  parent_code?: string | null;
  level?: number;
  is_detail?: boolean | number;
  is_active?: boolean | number;
  debit_balance?: number;
  credit_balance?: number;
  description?: string;
}

export interface Partner {
  id?: string;
  partner_code: string;
  partner_name: string;
  partner_type: 'CUSTOMER' | 'VENDOR' | 'EMPLOYEE' | 'OTHER';
  tax_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id?: string;
  code: string;
  name: string;
  category?: string;
  unit?: string;
  sale_price?: number;
  cost_price?: number;
  tax_rate?: number;
  account_revenue?: string;
  account_cost?: string;
  is_active?: boolean | number;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  is_active: boolean | number;
}

// ============================================
// VOUCHER TYPES
// ============================================

export type VoucherType =
  | 'GENERAL'
  | 'CASH_RECEIPT'
  | 'CASH_PAYMENT'
  | 'BANK_RECEIPT'
  | 'BANK_PAYMENT'
  | 'PURCHASE'
  | 'SALE'
  | 'INVENTORY_IN'
  | 'INVENTORY_OUT';

export type VoucherStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

export interface VoucherItem {
  id?: number;
  voucher_id?: string;
  line_no?: number;
  description?: string | null;
  debit_acc?: string | null;
  credit_acc?: string | null;
  amount: number;
  quantity?: number | null;
  unit_price?: number | null;
  partner_code?: string | null;
  item_code?: string | null;
  sub_item_code?: string | null;
  project_code?: string | null;
  contract_code?: string | null;
  fund_source_id?: string | null;
}

export interface Voucher {
  id?: string;
  doc_no: string;
  doc_date: string;
  type: VoucherType;
  description?: string | null;
  reference_no?: string | null;
  reference_date?: string | null;
  partner_code?: string | null;
  currency?: string;
  exchange_rate?: number;
  total_amount?: number;
  status?: VoucherStatus;
  created_at?: string;
  updated_at?: string;
  items?: VoucherItem[];
}

export interface GeneralLedgerEntry {
  id: string;
  trx_date: string;
  posted_at: string;
  doc_no: string;
  description?: string;
  account_code: string;
  reciprocal_acc?: string;
  debit_amount: number;
  credit_amount: number;
  partner_code?: string;
  item_code?: string;
  voucher_id?: string;
}

// ============================================
// FIXED ASSETS TYPES
// ============================================

export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';
export type AssetStatus = 'IN_USE' | 'DISPOSED' | 'SOLD';

export interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_category?: string;
  category_code?: string;
  acquisition_date: string;
  start_depreciation_date?: string;
  acquisition_value: number;
  cost?: number;
  useful_life_months: number;
  life_years?: number;
  depreciation_method?: DepreciationMethod;
  accumulated?: number;
  residual?: number;
  monthly_depreciation?: number;
  asset_account?: string;
  depreciation_account?: string;
  expense_account?: string;
  department_code?: string;
  department_id?: string;
  location?: string;
  serial_number?: string;
  description?: string;
  status: AssetStatus;
  disposal_date?: string;
  disposal_value?: number;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface CCDCItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  cost: number;
  life_months: number;
  allocated: number;
  remaining: number;
  start_date?: string;
  fund_source_id?: string;
  department_id?: string;
  status: 'IN_USE' | 'FULLY_ALLOCATED' | 'DISPOSED';
}

export interface DepreciationRecord {
  id: string;
  asset_id: string;
  period: string;
  depreciation_amount: number;
  accumulated_before: number;
  accumulated_after: number;
  voucher_id?: string;
  created_at?: string;
}

// ============================================
// HUMAN RESOURCES TYPES
// ============================================

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
export type Gender = 'M' | 'F' | 'O';

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  gender?: Gender;
  date_of_birth?: string;
  id_number?: string;
  id_issue_date?: string;
  id_issue_place?: string;
  phone?: string;
  email?: string;
  address?: string;
  department_id?: string;
  department_code?: string;
  position?: string;
  salary_grade_id?: string;
  base_salary?: number;
  hire_date?: string;
  start_date?: string;
  termination_date?: string;
  end_date?: string;
  bank_account?: string;
  bank_name?: string;
  tax_code?: string;
  social_insurance_no?: string;
  health_insurance_no?: string;
  status: EmployeeStatus;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryGrade {
  id: string;
  grade_code: string;
  grade_name: string;
  coefficient: number;
  base_amount?: number;
  description?: string;
}

export interface AllowanceType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_taxable: boolean | number;
  account_code?: string;
}

export interface EmployeeAllowance {
  id: string;
  employee_id: string;
  allowance_type_id: string;
  amount: number;
  start_date?: string;
  end_date?: string;
  is_taxable: boolean | number;
}

export interface PayrollRecord {
  id: string;
  period_id?: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  working_days?: number;
  base_salary: number;
  allowances: number;
  deductions: number;
  gross_salary: number;
  social_insurance: number;
  health_insurance: number;
  unemployment_insurance: number;
  personal_income_tax: number;
  net_salary: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
}

export interface TimekeepingRecord {
  id: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  work_hours?: number;
  overtime_hours?: number;
  leave_type?: string;
  note?: string;
}

export interface Contract {
  id: string;
  employee_id?: string;
  contract_no: string;
  contract_type: string;
  start_date?: string;
  end_date?: string;
  salary?: number;
  status?: string;
}

export interface SalaryHistory {
  id: string;
  employee_id: string;
  effective_date: string;
  old_salary?: number;
  new_salary: number;
  reason?: string;
  decision_no?: string;
}

// ============================================
// INVENTORY TYPES
// ============================================

export interface Material {
  id: string;
  code: string;
  name: string;
  category?: string;
  unit: string;
  unit_price?: number;
  min_stock?: number;
  max_stock?: number;
  current_stock?: number;
  warehouse_id?: string;
  account_code?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface InventoryReceipt {
  id: string;
  receipt_no: string;
  receipt_date: string;
  supplier_code?: string;
  warehouse_id?: string;
  total_amount: number;
  note?: string;
  voucher_id?: string;
  status: 'DRAFT' | 'POSTED';
  items?: InventoryReceiptItem[];
}

export interface InventoryReceiptItem {
  id?: string;
  receipt_id?: string;
  material_id: string;
  material_code?: string;
  material_name?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  lot_no?: string;
  expiry_date?: string;
}

export interface InventoryIssue {
  id: string;
  issue_no: string;
  issue_date: string;
  department_id?: string;
  warehouse_id?: string;
  total_amount: number;
  reason?: string;
  voucher_id?: string;
  status: 'DRAFT' | 'POSTED';
  items?: InventoryIssueItem[];
}

export interface InventoryIssueItem {
  id?: string;
  issue_id?: string;
  material_id: string;
  material_code?: string;
  material_name?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  lot_no?: string;
}

export interface InventoryTransfer {
  id: string;
  transfer_no: string;
  transfer_date: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  total_amount: number;
  note?: string;
  status: 'DRAFT' | 'POSTED';
}

export interface InventoryCard {
  material_id: string;
  material_code: string;
  material_name: string;
  unit: string;
  opening_qty: number;
  opening_amount: number;
  receipt_qty: number;
  receipt_amount: number;
  issue_qty: number;
  issue_amount: number;
  closing_qty: number;
  closing_amount: number;
}

// ============================================
// DEBT MANAGEMENT TYPES
// ============================================

export type DebtStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface Receivable {
  id: string;
  partner_code: string;
  partner_name?: string;
  account_code: string;
  doc_no?: string;
  doc_date: string;
  due_date?: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  currency?: string;
  description?: string;
  status: DebtStatus;
}

export interface Payable {
  id: string;
  partner_code: string;
  partner_name?: string;
  account_code: string;
  doc_no?: string;
  doc_date: string;
  due_date?: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  currency?: string;
  description?: string;
  status: DebtStatus;
}

export interface TemporaryAdvance {
  id: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  advance_date: string;
  amount: number;
  settled_amount: number;
  balance: number;
  purpose?: string;
  due_date?: string;
  voucher_id?: string;
  status: 'PENDING' | 'PARTIAL' | 'SETTLED';
}

export interface BudgetAdvance {
  id: string;
  borrower_code: string;
  borrower_name?: string;
  advance_date: string;
  amount: number;
  repaid_amount: number;
  balance: number;
  interest_rate?: number;
  due_date?: string;
  purpose?: string;
  status: 'ACTIVE' | 'REPAID' | 'OVERDUE';
}

// ============================================
// REVENUE & EXPENSE TYPES
// ============================================

export interface RevenueCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  account_code?: string;
  is_active: boolean | number;
}

export interface RevenueReceipt {
  id: string;
  receipt_no: string;
  receipt_date: string;
  partner_code?: string;
  partner_name?: string;
  category_id?: string;
  category_name?: string;
  amount: number;
  description?: string;
  voucher_id?: string;
  status: 'DRAFT' | 'POSTED';
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  account_code?: string;
  is_active: boolean | number;
}

export interface ExpenseVoucher {
  id: string;
  voucher_no: string;
  voucher_date: string;
  voucher_type: 'CASH' | 'BANK' | 'CLEARING';
  partner_code?: string;
  partner_name?: string;
  category_id?: string;
  category_name?: string;
  amount: number;
  description?: string;
  original_voucher_id?: string;
  status: 'DRAFT' | 'POSTED';
}

// ============================================
// TAX TYPES
// ============================================

export interface TaxInvoice {
  id: string;
  invoice_no: string;
  invoice_date: string;
  invoice_type: 'SALE' | 'PURCHASE';
  partner_code?: string;
  partner_name?: string;
  partner_tax_code?: string;
  partner_address?: string;
  goods_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  payment_method?: string;
  notes?: string;
  voucher_id?: string;
  status?: string;
}

export interface VatReport {
  period: string;
  input_vat: number;
  output_vat: number;
  vat_payable: number;
  vat_refundable: number;
}

// ============================================
// BUDGET TYPES
// ============================================

export interface Budget {
  id: string;
  budget_code: string;
  budget_name: string;
  fiscal_year: number;
  account_code?: string;
  department_code?: string;
  budget_amount: number;
  actual_amount?: number;
  remaining_amount?: number;
  notes?: string;
  is_active?: boolean | number;
}

export interface BudgetEstimate {
  id: string;
  fund_source_id: string;
  fund_source_name?: string;
  fiscal_year: number;
  period?: string;
  account_code?: string;
  item_code?: string;
  estimated_amount: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  status: 'DRAFT' | 'APPROVED' | 'LOCKED';
}

// ============================================
// PROJECT & CONTRACT TYPES
// ============================================

export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget_amount: number;
  spent_amount: number;
  manager_id?: string;
  department_id?: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
}

export interface ProjectTask {
  id: string;
  project_id: string;
  task_code: string;
  task_name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget_amount?: number;
  actual_amount?: number;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

export interface SalesContract {
  id: string;
  contract_no: string;
  contract_name: string;
  contract_type: 'SALE' | 'PURCHASE' | 'SERVICE';
  partner_code: string;
  partner_name?: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  total_value: number;
  currency?: string;
  payment_terms?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

// ============================================
// BANK & CASH TYPES
// ============================================

export interface BankAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_branch?: string;
  currency: string;
  gl_account_code: string;
  is_default?: boolean | number;
  is_active?: boolean | number;
}

export interface CashBalance {
  account_code: string;
  account_name: string;
  currency: string;
  opening_balance: number;
  debit_amount: number;
  credit_amount: number;
  closing_balance: number;
}

// ============================================
// REPORT TYPES
// ============================================

export interface TrialBalanceEntry {
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface GeneralLedgerReport {
  account_code: string;
  account_name: string;
  entries: GeneralLedgerEntry[];
  opening_balance: number;
  closing_balance: number;
}

export interface BalanceSheetEntry {
  item_code: string;
  item_name: string;
  note?: string;
  current_period: number;
  previous_period: number;
  level?: number;
}

export interface ProfitLossEntry {
  item_code: string;
  item_name: string;
  note?: string;
  current_period: number;
  previous_period: number;
  level?: number;
}

export interface CashFlowEntry {
  item_code: string;
  item_name: string;
  current_period: number;
  previous_period: number;
}

// ============================================
// AUDIT TYPES
// ============================================

export interface AuditTrailEntry {
  id: string;
  user_id?: number;
  username?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'VOID' | 'LOGIN' | 'LOGOUT';
  entity_type: string;
  entity_id?: string;
  doc_no?: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditAnomaly {
  id: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  voucher_id?: string;
  account_code?: string;
  amount?: number;
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED' | 'ACKNOWLEDGED';
  resolution_notes?: string;
}

export interface ReconciliationRecord {
  id: string;
  recon_type: 'BANK' | 'PARTNER' | 'INTERCOMPANY';
  reference_id?: string;
  period?: string;
  fiscal_year?: number;
  fiscal_period?: number;
  our_balance: number;
  their_balance: number;
  difference: number;
  status: 'PENDING' | 'MATCHED' | 'UNMATCHED' | 'ADJUSTED' | 'APPROVED';
  reconciled_at?: string;
  reconciled_by?: string;
  notes?: string;
}

// ============================================
// E-INVOICE TYPES
// ============================================

export interface EInvoiceProvider {
  code: string;
  name: string;
  description?: string;
  is_configured: boolean;
  is_active: boolean;
}

export interface EInvoice {
  id: string;
  provider_code: string;
  invoice_id?: string;
  invoice_no: string;
  invoice_series?: string;
  invoice_date: string;
  invoice_type: 'INPUT' | 'OUTPUT';
  partner_tax_code?: string;
  partner_name?: string;
  partner_address?: string;
  goods_amount: number;
  vat_rate?: number;
  vat_amount: number;
  total_amount: number;
  status: 'NEW' | 'MATCHED' | 'IMPORTED' | 'REJECTED';
  voucher_id?: string;
  sync_at?: string;
  raw_data?: string;
}

// ============================================
// SYSTEM TYPES
// ============================================

export interface SystemUser {
  id: number;
  username: string;
  fullname?: string;
  email?: string;
  role: 'admin' | 'accountant' | 'viewer';
  status: 'Active' | 'Inactive';
  last_login?: string;
}

export interface SystemRole {
  id: string;
  role_code: string;
  role_name: string;
  description?: string;
  permissions?: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export interface SystemLog {
  id: string;
  log_level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  source?: string;
  stack_trace?: string;
  created_at: string;
}

// ============================================
// BACKUP TYPES
// ============================================

export interface BackupInfo {
  id: string;
  filename: string;
  description?: string;
  size: number;
  created_at: string;
  created_by?: string;
  is_encrypted: boolean;
  tables_included?: string[];
}

export interface BackupSchedule {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  day_of_week?: number;
  day_of_month?: number;
  retention_days: number;
  is_active: boolean;
}

// ============================================
// CHECKLIST TYPES
// ============================================

export interface ChecklistItem {
  id: number;
  title: string;
  description?: string;
  category?: string;
  is_completed: boolean;
  completed_at?: string;
  due_date?: string;
}

// ============================================
// DIMENSION TYPES
// ============================================

export interface Dimension {
  id: string;
  dim_id: number;
  code: string;
  name: string;
  description?: string;
  parent_code?: string;
  is_active: boolean | number;
}

export interface DimensionConfig {
  id: string;
  dim_id: number;
  dim_name: string;
  dim_label: string;
  is_required: boolean | number;
  is_active: boolean | number;
  display_order: number;
}

export interface DimensionGroup {
  id: string;
  code: string;
  name: string;
  dimensions?: string[];
}

// ============================================
// LOAN TYPES
// ============================================

export interface LoanContract {
  id: string;
  contract_no: string;
  lender_name: string;
  borrower_name?: string;
  loan_type: 'SHORT_TERM' | 'LONG_TERM';
  principal_amount: number;
  interest_rate: number;
  start_date: string;
  end_date?: string;
  repaid_principal: number;
  repaid_interest: number;
  balance: number;
  status: 'ACTIVE' | 'REPAID' | 'DEFAULT';
}

export interface DebtNote {
  id: string;
  contract_id: string;
  note_date: string;
  note_type: 'DRAW' | 'REPAY_PRINCIPAL' | 'REPAY_INTEREST';
  amount: number;
  voucher_id?: string;
  note?: string;
}

// ============================================
// OPENING BALANCE TYPES
// ============================================

export interface OpeningBalance {
  account_code: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  partner_code?: string;
  item_code?: string;
}

// ============================================
// STAGING TYPES
// ============================================

export interface StagingTransaction {
  id: string;
  batch_id?: string;
  row_index?: number;
  trx_date: string;
  doc_no?: string;
  description?: string;
  debit_acc?: string;
  credit_acc?: string;
  amount: number;
  partner_code?: string;
  item_code?: string;
  is_valid: boolean | number;
  error_log?: string;
  source?: string;
  raw_data?: string;
}

// ============================================
// ALLOCATION TYPES
// ============================================

export interface AllocationItem {
  invoice_id: string;
  amount: number;
}

export interface AllocationRecord {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  allocated_at: string;
}

export interface AllocationHistoryRecord {
  id: string;
  period: string;
  item_id: string;
  item_type?: string;
  item_name: string;
  amount: number;
  target_account: string;
  voucher_id?: string;
  created_at?: string;
}
