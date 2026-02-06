/**
 * Frontend Validation Schemas
 * SyntexLegger - Enterprise Accounting System
 *
 * Zod schemas for form validation
 * Matches backend validation schemas for consistency
 */

import { z } from 'zod';

// ==================== Common Schemas ====================

export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Định dạng ngày không hợp lệ (YYYY-MM-DD)'
);

export const amountSchema = z.number()
  .min(0, 'Số tiền không được âm')
  .max(999999999999, 'Số tiền quá lớn');

export const accountCodeSchema = z.string()
  .min(3, 'Mã tài khoản tối thiểu 3 ký tự')
  .max(20, 'Mã tài khoản tối đa 20 ký tự')
  .regex(/^[0-9]+$/, 'Mã tài khoản chỉ được chứa số');

export const partnerCodeSchema = z.string()
  .min(1, 'Mã đối tượng không được để trống')
  .max(50, 'Mã đối tượng tối đa 50 ký tự');

export const requiredString = (fieldName: string) =>
  z.string().min(1, `${fieldName} không được để trống`);

// ==================== Auth Schemas ====================

export const loginSchema = z.object({
  username: z.string()
    .min(1, 'Tên đăng nhập không được để trống')
    .max(50, 'Tên đăng nhập tối đa 50 ký tự'),
  password: z.string()
    .min(1, 'Mật khẩu không được để trống'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
  newPassword: z.string()
    .min(8, 'Mật khẩu mới tối thiểu 8 ký tự')
    .max(100, 'Mật khẩu tối đa 100 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
  confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ==================== Account Schemas ====================

export const accountSchema = z.object({
  account_code: accountCodeSchema,
  account_name: z.string()
    .min(1, 'Tên tài khoản không được để trống')
    .max(255, 'Tên tài khoản tối đa 255 ký tự'),
  account_name_en: z.string().max(255).optional(),
  parent_code: z.string().max(20).optional().nullable(),
  level: z.number().int().min(1).max(10).optional(),
  is_detail: z.boolean().optional(),
  is_active: z.boolean().optional(),
  debit_balance: amountSchema.optional(),
  credit_balance: amountSchema.optional(),
  description: z.string().max(1000).optional(),
});

export type AccountFormData = z.infer<typeof accountSchema>;

// ==================== Partner Schemas ====================

export const partnerSchema = z.object({
  partner_code: partnerCodeSchema,
  partner_name: z.string()
    .min(1, 'Tên đối tượng không được để trống')
    .max(255, 'Tên đối tượng tối đa 255 ký tự'),
  partner_type: z.enum(['CUSTOMER', 'VENDOR', 'EMPLOYEE', 'OTHER'], {
    errorMap: () => ({ message: 'Loại đối tượng không hợp lệ' }),
  }),
  tax_code: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  bank_account: z.string().max(50).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  contact_person: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export type PartnerFormData = z.infer<typeof partnerSchema>;

// ==================== Product/Item Schemas ====================

export const productSchema = z.object({
  item_code: z.string()
    .min(1, 'Mã hàng không được để trống')
    .max(50, 'Mã hàng tối đa 50 ký tự'),
  item_name: z.string()
    .min(1, 'Tên hàng không được để trống')
    .max(255, 'Tên hàng tối đa 255 ký tự'),
  unit: z.string().max(50).optional().nullable(),
  category_code: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// ==================== Voucher Schemas ====================

export const voucherItemSchema = z.object({
  line_no: z.number().int().positive().optional(),
  description: z.string().max(500).optional().nullable(),
  debit_acc: z.string().max(20).optional().nullable(),
  credit_acc: z.string().max(20).optional().nullable(),
  amount: amountSchema,
  partner_code: z.string().max(50).optional().nullable(),
  item_code: z.string().max(50).optional().nullable(),
  sub_item_code: z.string().max(50).optional().nullable(),
  quantity: z.number().min(0).optional().nullable(),
  unit_price: z.number().min(0).optional().nullable(),
}).refine((data) => data.debit_acc || data.credit_acc, {
  message: 'Phải có ít nhất TK Nợ hoặc TK Có',
  path: ['debit_acc'],
});

export const voucherTypes = [
  'GENERAL',
  'CASH_RECEIPT',
  'CASH_PAYMENT',
  'BANK_RECEIPT',
  'BANK_PAYMENT',
  'PURCHASE',
  'SALE',
  'INVENTORY_IN',
  'INVENTORY_OUT',
] as const;

export const voucherSchema = z.object({
  doc_no: z.string()
    .min(1, 'Số chứng từ không được để trống')
    .max(50, 'Số chứng từ tối đa 50 ký tự'),
  doc_date: dateSchema,
  type: z.enum(voucherTypes, {
    errorMap: () => ({ message: 'Loại chứng từ không hợp lệ' }),
  }),
  description: z.string().max(500).optional().nullable(),
  reference_no: z.string().max(50).optional().nullable(),
  reference_date: dateSchema.optional().nullable(),
  partner_code: z.string().max(50).optional().nullable(),
  currency: z.string().length(3).optional(),
  exchange_rate: z.number().positive().optional(),
  items: z.array(voucherItemSchema)
    .min(1, 'Chứng từ phải có ít nhất 1 dòng'),
});

export type VoucherFormData = z.infer<typeof voucherSchema>;
export type VoucherItemFormData = z.infer<typeof voucherItemSchema>;

// ==================== Asset Schemas ====================

export const assetSchema = z.object({
  asset_code: z.string()
    .min(1, 'Mã tài sản không được để trống')
    .max(50, 'Mã tài sản tối đa 50 ký tự'),
  asset_name: z.string()
    .min(1, 'Tên tài sản không được để trống')
    .max(255, 'Tên tài sản tối đa 255 ký tự'),
  category_code: z.string().max(50).optional().nullable(),
  acquisition_date: dateSchema,
  acquisition_value: amountSchema.refine(v => v > 0, 'Nguyên giá phải lớn hơn 0'),
  useful_life_months: z.number()
    .int('Số tháng sử dụng phải là số nguyên')
    .min(1, 'Số tháng sử dụng tối thiểu 1')
    .max(600, 'Số tháng sử dụng tối đa 600'),
  depreciation_method: z.enum(['STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION'], {
    errorMap: () => ({ message: 'Phương pháp khấu hao không hợp lệ' }),
  }).optional(),
  asset_account: accountCodeSchema.optional().nullable(),
  depreciation_account: accountCodeSchema.optional().nullable(),
  expense_account: accountCodeSchema.optional().nullable(),
  department_code: z.string().max(50).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export type AssetFormData = z.infer<typeof assetSchema>;

// ==================== Employee Schemas ====================

export const employeeSchema = z.object({
  employee_code: z.string()
    .min(1, 'Mã nhân viên không được để trống')
    .max(50, 'Mã nhân viên tối đa 50 ký tự'),
  full_name: z.string()
    .min(1, 'Họ tên không được để trống')
    .max(100, 'Họ tên tối đa 100 ký tự'),
  id_number: z.string().max(20).optional().nullable(),
  tax_code: z.string().max(20).optional().nullable(),
  social_insurance_no: z.string().max(20).optional().nullable(),
  date_of_birth: dateSchema.optional().nullable(),
  gender: z.enum(['M', 'F', 'O']).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  department_code: z.string().max(50).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  start_date: dateSchema.optional().nullable(),
  end_date: dateSchema.optional().nullable(),
  bank_account: z.string().max(50).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  base_salary: amountSchema.optional(),
  is_active: z.boolean().optional(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

// ==================== Budget Schemas ====================

export const budgetSchema = z.object({
  budget_code: z.string()
    .min(1, 'Mã ngân sách không được để trống')
    .max(50, 'Mã ngân sách tối đa 50 ký tự'),
  budget_name: z.string()
    .min(1, 'Tên ngân sách không được để trống')
    .max(255, 'Tên ngân sách tối đa 255 ký tự'),
  fiscal_year: z.number()
    .int()
    .min(2000, 'Năm tài chính tối thiểu 2000')
    .max(2100, 'Năm tài chính tối đa 2100'),
  account_code: accountCodeSchema.optional().nullable(),
  department_code: z.string().max(50).optional().nullable(),
  budget_amount: amountSchema,
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export type BudgetFormData = z.infer<typeof budgetSchema>;

// ==================== Tax Invoice Schemas ====================

export const taxInvoiceSchema = z.object({
  invoice_no: z.string()
    .min(1, 'Số hóa đơn không được để trống')
    .max(50, 'Số hóa đơn tối đa 50 ký tự'),
  invoice_date: dateSchema,
  invoice_type: z.enum(['SALE', 'PURCHASE'], {
    errorMap: () => ({ message: 'Loại hóa đơn không hợp lệ' }),
  }),
  partner_code: partnerCodeSchema,
  partner_name: z.string().max(255).optional().nullable(),
  partner_tax_code: z.string().max(20).optional().nullable(),
  partner_address: z.string().max(500).optional().nullable(),
  goods_amount: amountSchema,
  vat_rate: z.number().min(0).max(100),
  vat_amount: amountSchema,
  total_amount: amountSchema,
  payment_method: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  voucher_id: z.string().uuid().optional().nullable(),
});

export type TaxInvoiceFormData = z.infer<typeof taxInvoiceSchema>;

// ==================== Backup/Restore Schemas ====================

export const backupSchema = z.object({
  description: z.string().max(500).optional(),
  includeData: z.boolean().optional(),
  compress: z.boolean().optional(),
  encrypt: z.boolean().optional(),
  password: z.string()
    .min(8, 'Mật khẩu backup tối thiểu 8 ký tự')
    .optional()
    .nullable(),
});

export type BackupFormData = z.infer<typeof backupSchema>;

export const restoreSchema = z.object({
  backupId: z.string().uuid('ID backup không hợp lệ').optional(),
  password: z.string().optional().nullable(),
  overwrite: z.boolean().optional(),
});

export type RestoreFormData = z.infer<typeof restoreSchema>;

// ==================== Validation Helpers ====================

/**
 * Validate form data against a schema
 * Returns errors object compatible with React form state
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = error.message;
    }
  }

  return { success: false, errors };
}

/**
 * Create a field validator for individual field validation
 */
export function createFieldValidator<T>(schema: z.ZodSchema<T>) {
  return (value: unknown): string | null => {
    const result = schema.safeParse(value);
    if (result.success) return null;
    return result.error.errors[0]?.message || 'Giá trị không hợp lệ';
  };
}

/**
 * Validate a single field from a schema
 */
export function validateField(
  schema: z.ZodObject<z.ZodRawShape>,
  fieldName: string,
  value: unknown
): string | null {
  const fieldSchema = schema.shape[fieldName];
  if (!fieldSchema) return null;

  const result = fieldSchema.safeParse(value);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Giá trị không hợp lệ';
}

/**
 * Hook-friendly validation function
 * Returns [isValid, errors] tuple
 */
export function useValidation<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): [boolean, Record<string, string>] {
  const result = validateForm(schema, data);
  if (result.success) {
    return [true, {}];
  }
  return [false, result.errors];
}

// ==================== Custom Refinements ====================

/**
 * Validate debit = credit for balanced voucher
 */
export const balancedVoucherSchema = voucherSchema.refine(
  (data) => {
    const totalDebit = data.items
      .filter(item => item.debit_acc)
      .reduce((sum, item) => sum + item.amount, 0);
    const totalCredit = data.items
      .filter(item => item.credit_acc)
      .reduce((sum, item) => sum + item.amount, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  {
    message: 'Tổng Nợ phải bằng tổng Có',
    path: ['items'],
  }
);
