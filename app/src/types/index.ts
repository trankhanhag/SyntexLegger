/**
 * Type exports for SyntexLegger Frontend
 */

// API types (primary source for entity types)
export * from './api.types';

// Common types (utility types, excluding duplicates)
export {
    // Record types
    type TableRow,
    type FormData,
    // Report types
    type ReportEntry,
    type TraceableValue,
    type TrialBalanceRow,
    type GeneralLedgerRow,
    type CashBookRow,
    type InventorySummaryRow,
    type DebtLedgerRow,
    // Voucher detail
    type VoucherDetailRowData,
    // Filter types
    type DateRangeFilter,
    type ReportFilter,
    type PaginationParams,
    // Event handlers
    type RowClickHandler,
    type CellClickHandler,
    type SelectionChangeHandler,
    // Component props
    type ModuleProps,
    type ModuleHeader,
    type ModuleAction,
    // Form state
    type FormState,
    type SelectOption,
    // API types - use ApiError only (ApiResponse already in api.types)
    type ApiError,
    type ApiSuccessResponse,
    type ApiErrorResponse,
    // Utility types
    type Nullable,
    type Optional,
    type Maybe,
    type PartialBy,
    type RequiredBy,
    type ArrayElement,
} from './common.types';
