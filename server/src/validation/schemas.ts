/**
 * Zod Validation Schemas
 * SyntexLegger - Enterprise Accounting System
 *
 * Centralized validation schemas for API requests
 */

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// ============================================
// VOUCHER SCHEMAS
// ============================================

export const voucherItemSchema = z.object({
  debit_acc: z.string().max(20).optional().nullable(),
  credit_acc: z.string().max(20).optional().nullable(),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  description: z.string().max(500).optional().nullable(),
  partner_code: z.string().max(50).optional().nullable(),
  item_code: z.string().max(50).optional().nullable(),
  sub_item_code: z.string().max(50).optional().nullable(),
  fc_amount: z.coerce.number().optional().nullable(),
  fc_code: z.string().max(10).optional().nullable(),
  exchange_rate: z.coerce.number().optional().nullable(),
  quantity: z.coerce.number().optional().nullable(),
  unit_price: z.coerce.number().optional().nullable(),
});

export const createVoucherSchema = z.object({
  doc_no: z.string().min(1, 'Số chứng từ không được để trống').max(50),
  doc_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  type: z.enum(['GENERAL', 'CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_RECEIPT', 'BANK_PAYMENT', 'PURCHASE', 'SALE']),
  description: z.string().max(500).optional().nullable(),
  items: z.array(voucherItemSchema).min(1, 'Chứng từ phải có ít nhất 1 dòng'),
});

export const updateVoucherSchema = createVoucherSchema.partial();

export const voucherFilterSchema = z.object({
  type: z.enum(['GENERAL', 'CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_RECEIPT', 'BANK_PAYMENT', 'PURCHASE', 'SALE']).optional(),
  status: z.enum(['DRAFT', 'POSTED', 'VOIDED']).optional(),
  docNo: z.string().optional(),
  search: z.string().optional(),
}).merge(dateRangeSchema).merge(paginationSchema);

// ============================================
// ACCOUNT SCHEMAS
// ============================================

export const createAccountSchema = z.object({
  account_code: z.string()
    .min(1, 'Mã tài khoản không được để trống')
    .max(20, 'Mã tài khoản tối đa 20 ký tự')
    .regex(/^[0-9]+$/, 'Mã tài khoản chỉ chứa số'),
  account_name: z.string()
    .min(1, 'Tên tài khoản không được để trống')
    .max(200),
  category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OFF_BALANCE']),
  parent_code: z.string().max(20).optional().nullable(),
  is_detail: z.coerce.number().int().min(0).max(1).default(1),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  description: z.string().max(500).optional().nullable(),
});

export const updateAccountSchema = createAccountSchema.partial();

// ============================================
// PARTNER SCHEMAS
// ============================================

export const createPartnerSchema = z.object({
  partner_code: z.string()
    .min(1, 'Mã đối tác không được để trống')
    .max(50),
  partner_name: z.string()
    .min(1, 'Tên đối tác không được để trống')
    .max(200),
  partner_type: z.enum(['CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'OTHER']),
  tax_code: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  bank_account: z.string().max(50).optional().nullable(),
  bank_name: z.string().max(200).optional().nullable(),
  contact_person: z.string().max(100).optional().nullable(),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
});

export const updatePartnerSchema = createPartnerSchema.partial();

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Tên đăng nhập ít nhất 3 ký tự')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới'),
  password: z.string()
    .min(6, 'Mật khẩu ít nhất 6 ký tự')
    .max(100),
  fullname: z.string().max(100).optional(),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
  newPassword: z.string().min(6, 'Mật khẩu mới ít nhất 6 ký tự'),
});

// ============================================
// BACKUP SCHEMAS
// ============================================

export const createBackupSchema = z.object({
  type: z.enum(['MANUAL', 'SCHEDULED', 'PRE_RESTORE']).default('MANUAL'),
  password: z.string().min(6, 'Mật khẩu mã hóa ít nhất 6 ký tự').optional(),
  description: z.string().max(500).optional(),
});

export const restoreBackupSchema = z.object({
  password: z.string().optional(),
  createPreRestoreBackup: z.boolean().default(true),
});

// ============================================
// EXPORT TYPE INFERENCE
// ============================================

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
export type VoucherFilterInput = z.infer<typeof voucherFilterSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateBackupInput = z.infer<typeof createBackupSchema>;
