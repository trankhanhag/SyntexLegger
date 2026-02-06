/**
 * Common Type Definitions for SyntexLegger Frontend
 * Utility types used across multiple components
 */

// ============================================
// GENERIC RECORD TYPES
// ============================================

/**
 * Generic row type for table data
 * Use when the exact structure is dynamic or varies by context
 */
export type TableRow = Record<string, unknown>;

/**
 * Generic form data type
 */
export type FormData = Record<string, string | number | boolean | null | undefined>;

// ============================================
// REPORT TYPES
// ============================================

export interface ReportEntry {
    id?: string | number;
    code?: string;
    name?: string;
    description?: string;
    level?: number;
    is_bold?: boolean;
    current_period?: number | TraceableValue;
    previous_period?: number | TraceableValue;
    debit?: number;
    credit?: number;
    balance?: number;
    opening_balance?: number;
    closing_balance?: number;
    [key: string]: unknown;
}

export interface TraceableValue {
    value: number | string;
    formula?: string;
    source?: {
        type: 'link' | 'modal';
        target: string;
        label?: string;
    };
}

export interface TrialBalanceRow {
    account_code: string;
    account_name: string;
    opening_debit: number;
    opening_credit: number;
    period_debit: number;
    period_credit: number;
    closing_debit: number;
    closing_credit: number;
}

export interface GeneralLedgerRow {
    id?: string;
    trx_date: string;
    doc_no: string;
    description?: string;
    debit_amount: number;
    credit_amount: number;
    balance: number;
    voucher_id?: string;
}

export interface CashBookRow {
    id?: string;
    trx_date: string;
    doc_no: string;
    description?: string;
    receipt_amount: number;
    payment_amount: number;
    balance: number;
    voucher_id?: string;
}

export interface InventorySummaryRow {
    item_code: string;
    item_name: string;
    unit?: string;
    opening_qty: number;
    opening_value: number;
    in_qty: number;
    in_value: number;
    out_qty: number;
    out_value: number;
    closing_qty: number;
    closing_value: number;
}

export interface DebtLedgerRow {
    partner_code: string;
    partner_name?: string;
    doc_no?: string;
    doc_date: string;
    due_date?: string;
    original_amount: number;
    paid_amount: number;
    balance: number;
    aging_days?: number;
}

// ============================================
// VOUCHER DETAIL TYPES
// ============================================

export interface VoucherDetailRowData {
    id?: number;
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
    [key: string]: unknown;
}

// ============================================
// FILTER TYPES
// ============================================

export interface DateRangeFilter {
    fromDate: string;
    toDate: string;
}

export interface ReportFilter extends DateRangeFilter {
    accountCode?: string;
    partnerCode?: string;
    projectId?: string;
    departmentCode?: string;
    itemCode?: string;
}

export interface PaginationParams {
    page?: number;
    pageSize?: number;
    limit?: number;
    offset?: number;
}

// ============================================
// EVENT TYPES
// ============================================

export type RowClickHandler<T = TableRow> = (row: T, rowIndex: number) => void;
export type CellClickHandler<T = TableRow> = (row: T, field: string, value: unknown) => void;
export type SelectionChangeHandler<T = TableRow> = (selectedRows: T[]) => void;

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface ModuleProps {
    subView?: string;
    printSignal?: number;
    exportSignal?: number;
    importSignal?: number;
    onSetHeader?: (header: ModuleHeader) => void;
    onNavigate?: (view: string, params?: Record<string, string>) => void;
}

export interface ModuleHeader {
    title: string;
    icon: string;
    actions?: ModuleAction[];
}

export interface ModuleAction {
    label: string;
    icon: string;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
}

// ============================================
// FORM STATE TYPES
// ============================================

export interface FormState<T> {
    data: T;
    errors: Record<keyof T, string | undefined>;
    touched: Record<keyof T, boolean>;
    isSubmitting: boolean;
    isValid: boolean;
}

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, string>;
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}

export interface ApiErrorResponse {
    success: false;
    error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// UTILITY TYPES
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract the element type from an array type
 */
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer E)[] ? E : never;
