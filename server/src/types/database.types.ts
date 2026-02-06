/**
 * Database Entity Types for SyntexLegger
 * Based on Thông tư 99/2025/TT-BTC (Enterprise Accounting)
 */

// ============================================
// CORE ACCOUNTING ENTITIES
// ============================================

export interface Company {
  id: string;
  name: string;
  address?: string;
  tax_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  password: string;
  fullname?: string;
  role: 'admin' | 'accountant' | 'viewer';
  status: 'Active' | 'Inactive';
  last_login?: string;
  is_admin: number;
  company_id: string;
}

export interface ChartOfAccount {
  account_code: string;
  account_name: string;
  category: 'TÀI SẢN' | 'NỢ PHẢI TRẢ' | 'VỐN CHỦ SỞ HỮU' | 'DOANH THU' | 'CHI PHÍ' | 'THU NHẬP KHÁC' | 'CHI PHÍ KHÁC' | 'XÁC ĐỊNH KQKD';
  parent_code?: string;
  is_detail?: number;
  is_active?: number;
}

export interface Partner {
  partner_code: string;
  partner_name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  bank_account?: string;
  bank_name?: string;
  partner_type?: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
  is_active?: number;
}

export interface SystemSetting {
  key: string;
  value: string;
}

// ============================================
// VOUCHER ENTITIES
// ============================================

export type VoucherType = 'GENERAL' | 'CASH_IN' | 'CASH_OUT' | 'BANK_IN' | 'BANK_OUT' | 'PURCHASE' | 'SALE' | 'ADJUSTMENT';
export type VoucherStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

export interface Voucher {
  id: string;
  doc_no: string;
  doc_date: string;
  post_date: string;
  description?: string;
  type: VoucherType;
  ref_no?: string;
  attachments?: number;
  currency: string;
  fx_rate: number;
  total_amount: number;
  status: VoucherStatus;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface VoucherItem {
  id?: number;
  voucher_id: string;
  line_no?: number;
  description?: string;
  debit_acc?: string;
  credit_acc?: string;
  amount: number;
  quantity?: number;
  unit_price?: number;
  cost_price?: number;
  input_unit?: string;
  input_quantity?: number;
  dim1?: string;
  dim2?: string;
  dim3?: string;
  dim4?: string;
  dim5?: string;
  project_code?: string;
  contract_code?: string;
  debt_note?: string;
  partner_code?: string;
  fund_source_id?: string;
  item_code?: string;
  sub_item_code?: string;
  budget_estimate_id?: string;
}

export interface GeneralLedger {
  id: string;
  trx_date: string;
  posted_at: string;
  doc_no: string;
  description?: string;
  account_code: string;
  reciprocal_acc?: string;
  debit_amount: number;
  credit_amount: number;
  origin_staging_id?: string;
  partner_code?: string;
  item_code?: string;
  sub_item_code?: string;
  voucher_id?: string;
}

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
  sub_item_code?: string;
  is_valid: number;
  error_log?: string;
  raw_data?: string;
}

// ============================================
// HUMAN RESOURCES ENTITIES
// ============================================

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  gender?: 'M' | 'F';
  date_of_birth?: string;
  id_number?: string;
  id_issue_date?: string;
  id_issue_place?: string;
  phone?: string;
  email?: string;
  address?: string;
  department_id?: string;
  position?: string;
  salary_grade_id?: string;
  base_salary?: number;
  hire_date?: string;
  termination_date?: string;
  bank_account?: string;
  bank_name?: string;
  tax_code?: string;
  social_insurance_no?: string;
  health_insurance_no?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
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

export interface EmployeeAllowance {
  id: string;
  employee_id: string;
  allowance_type_id: string;
  amount: number;
  start_date?: string;
  end_date?: string;
  is_taxable: number;
}

export interface AllowanceType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_taxable: number;
  account_code?: string;
}

export interface PayrollPeriod {
  id: string;
  period_code: string;
  period_name: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
}

export interface PayrollDetail {
  id: string;
  period_id: string;
  employee_id: string;
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

export interface Timekeeping {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  work_hours?: number;
  overtime_hours?: number;
  leave_type?: string;
  note?: string;
}

// ============================================
// FIXED ASSETS ENTITIES
// ============================================

export interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_category?: string;
  acquisition_date?: string;
  start_depreciation_date?: string;
  cost: number;
  life_years: number;
  depreciation_method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  accumulated: number;
  residual: number;
  fund_source_id?: string;
  department_id?: string;
  location?: string;
  serial_number?: string;
  status: 'IN_USE' | 'DISPOSED' | 'SOLD';
  disposal_date?: string;
  disposal_value?: number;
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

export interface AssetDepreciationLog {
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
// INVENTORY ENTITIES
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

export interface MaterialReceipt {
  id: string;
  receipt_no: string;
  receipt_date: string;
  supplier_code?: string;
  warehouse_id?: string;
  total_amount: number;
  note?: string;
  voucher_id?: string;
  status: 'DRAFT' | 'POSTED';
  created_at?: string;
}

export interface MaterialReceiptItem {
  id: string;
  receipt_id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  amount: number;
  lot_no?: string;
  expiry_date?: string;
}

export interface MaterialIssue {
  id: string;
  issue_no: string;
  issue_date: string;
  department_id?: string;
  warehouse_id?: string;
  total_amount: number;
  reason?: string;
  voucher_id?: string;
  status: 'DRAFT' | 'POSTED';
  created_at?: string;
}

export interface MaterialIssueItem {
  id: string;
  issue_id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  amount: number;
  lot_no?: string;
}

export interface MaterialTransfer {
  id: string;
  transfer_no: string;
  transfer_date: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  total_amount: number;
  note?: string;
  status: 'DRAFT' | 'POSTED';
  created_at?: string;
}

// ============================================
// RECEIVABLES & PAYABLES ENTITIES
// ============================================

export interface Receivable {
  id: string;
  partner_code: string;
  account_code: string;
  doc_no?: string;
  doc_date: string;
  due_date?: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  currency: string;
  description?: string;
  status: 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface Payable {
  id: string;
  partner_code: string;
  account_code: string;
  doc_no?: string;
  doc_date: string;
  due_date?: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  currency: string;
  description?: string;
  status: 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface TemporaryAdvance {
  id: string;
  employee_id: string;
  advance_date: string;
  amount: number;
  settled_amount: number;
  balance: number;
  purpose?: string;
  due_date?: string;
  voucher_id?: string;
  status: 'PENDING' | 'PARTIAL' | 'SETTLED';
}

// ============================================
// BUDGET MANAGEMENT ENTITIES
// ============================================

export interface FundSource {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  budget_year?: number;
  is_active: number;
}

export interface BudgetEstimate {
  id: string;
  fund_source_id: string;
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

export interface BudgetPeriod {
  id: string;
  company_id: string;
  fiscal_year: number;
  period: number;
  start_date: string;
  end_date: string;
  is_locked: number;
  locked_at?: string;
  locked_by?: string;
}

export interface BudgetTransaction {
  id: string;
  budget_estimate_id: string;
  voucher_id?: string;
  transaction_date: string;
  transaction_type: 'ALLOCATION' | 'SPENDING' | 'ADJUSTMENT';
  amount: number;
  description?: string;
  created_at?: string;
}

// ============================================
// AUDIT & COMPLIANCE ENTITIES
// ============================================

export interface AuditTrail {
  id: string;
  user_id?: number;
  username?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'VOID' | 'LOGIN' | 'LOGOUT';
  entity_type: string;
  entity_id?: string;
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
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
}

export interface ReconciliationRecord {
  id: string;
  reconciliation_type: 'BANK' | 'PARTNER' | 'INTERCOMPANY';
  reference_id?: string;
  period: string;
  our_balance: number;
  their_balance: number;
  difference: number;
  status: 'MATCHED' | 'UNMATCHED' | 'ADJUSTED';
  reconciled_at?: string;
  reconciled_by?: string;
}

// ============================================
// COMMERCIAL ENTITIES
// ============================================

export interface Contract {
  id: string;
  contract_no: string;
  contract_name: string;
  contract_type: 'SALE' | 'PURCHASE' | 'SERVICE';
  partner_code: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  total_value: number;
  currency: string;
  payment_terms?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_at?: string;
}

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
  created_at?: string;
}

export interface SalesOrder {
  id: string;
  order_no: string;
  order_date: string;
  customer_code: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  net_amount: number;
  currency: string;
  delivery_date?: string;
  status: 'DRAFT' | 'CONFIRMED' | 'DELIVERED' | 'INVOICED' | 'CANCELLED';
}

export interface PurchaseOrder {
  id: string;
  order_no: string;
  order_date: string;
  supplier_code: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  net_amount: number;
  currency: string;
  expected_date?: string;
  status: 'DRAFT' | 'APPROVED' | 'RECEIVED' | 'INVOICED' | 'CANCELLED';
}

// ============================================
// DIMENSION ENTITIES
// ============================================

export interface Dimension {
  id: string;
  dim_id: number;
  code: string;
  name: string;
  description?: string;
  parent_code?: string;
  is_active: number;
}

export interface DimensionConfig {
  id: string;
  dim_id: number;
  dim_name: string;
  dim_label: string;
  is_required: number;
  is_active: number;
  display_order: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category?: string;
  unit: string;
  sale_price?: number;
  cost_price?: number;
  tax_rate?: number;
  account_revenue?: string;
  account_cost?: string;
  is_active: number;
}

// ============================================
// BANK & CASH ENTITIES
// ============================================

export interface BankAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_branch?: string;
  currency: string;
  gl_account_code: string;
  is_default: number;
  is_active: number;
}

// ============================================
// SYSTEM ENTITIES
// ============================================

export interface Role {
  id: string;
  role_code: string;
  role_name: string;
  description?: string;
  permissions?: string;
}

export interface ChecklistTask {
  id: string;
  task_code: string;
  task_name: string;
  description?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  category?: string;
  sequence: number;
  is_active: number;
}

export interface SystemLog {
  id: string;
  log_level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  source?: string;
  stack_trace?: string;
  created_at: string;
}
