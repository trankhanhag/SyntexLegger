/**
 * API Request/Response Types for SyntexLegger
 */

import { Request, Response, NextFunction } from 'express';
import { Voucher, VoucherItem, VoucherType, VoucherStatus } from './database.types';

// ============================================
// EXPRESS EXTENDED TYPES
// ============================================

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: string;
  company_id?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  companyId?: string;
}

export type AsyncHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

// ============================================
// COMMON API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string>;
}

// ============================================
// VOUCHER API TYPES
// ============================================

export interface CreateVoucherRequest {
  doc_no?: string;
  doc_date: string;
  post_date: string;
  description?: string;
  type: VoucherType;
  ref_no?: string;
  attachments?: number;
  currency?: string;
  fx_rate?: number;
  items: CreateVoucherItemRequest[];
}

export interface CreateVoucherItemRequest {
  description?: string;
  debit_acc?: string;
  credit_acc?: string;
  amount: number;
  quantity?: number;
  unit_price?: number;
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

export interface UpdateVoucherRequest extends Partial<CreateVoucherRequest> {
  id: string;
  status?: VoucherStatus;
}

export interface VoucherFilterParams {
  type?: VoucherType;
  status?: VoucherStatus;
  fromDate?: string;
  toDate?: string;
  docNo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface VoucherWithItems extends Voucher {
  items: VoucherItem[];
}

// ============================================
// ACCOUNT API TYPES
// ============================================

export interface AccountFilterParams {
  category?: string;
  search?: string;
  parentCode?: string;
  isDetail?: boolean;
}

export interface CreateAccountRequest {
  account_code: string;
  account_name: string;
  category: string;
  parent_code?: string;
  is_detail?: number;
}

// ============================================
// PARTNER API TYPES
// ============================================

export interface PartnerFilterParams {
  partnerType?: string;
  search?: string;
  isActive?: boolean;
}

export interface CreatePartnerRequest {
  partner_code: string;
  partner_name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  bank_account?: string;
  bank_name?: string;
  partner_type?: string;
}

// ============================================
// REPORT API TYPES
// ============================================

export interface ReportPeriodParams {
  fromDate: string;
  toDate: string;
  fiscalYear?: number;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  category: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface BalanceSheetRow {
  code: string;
  name: string;
  amount_current: number;
  amount_previous: number;
  level: number;
}

export interface IncomeStatementRow {
  code: string;
  name: string;
  amount_current: number;
  amount_previous: number;
  level: number;
}

export interface LedgerEntry {
  id: string;
  trx_date: string;
  doc_no: string;
  description: string;
  reciprocal_acc: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
}

// ============================================
// AUTHENTICATION API TYPES
// ============================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  auth: boolean;
  token: string;
  user: {
    id: number;
    username: string;
    fullname?: string;
    role: string;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// BUDGET API TYPES
// ============================================

export interface BudgetCheckResult {
  allowed: boolean;
  budgetId?: string;
  estimatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  requestedAmount: number;
  message?: string;
}

export interface PeriodLockStatus {
  fiscalYear: number;
  period: number;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
}

// ============================================
// AUDIT API TYPES
// ============================================

export interface AuditLogParams {
  userId?: number;
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    storage: boolean;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  timestamp: string;
}

// ============================================
// IMPORT/EXPORT API TYPES
// ============================================

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export interface ExportParams {
  format: 'xlsx' | 'csv' | 'pdf';
  fromDate?: string;
  toDate?: string;
  filters?: Record<string, unknown>;
}
