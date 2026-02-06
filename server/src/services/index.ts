/**
 * Services Index
 * Export all service modules for SyntexLegger
 */

// Core accounting services
export { voucherService } from './voucher.service';
export type {
    CreateVoucherDTO,
    UpdateVoucherDTO,
    VoucherBalanceResult,
    PostVoucherResult
} from './voucher.service';

export { accountService } from './account.service';
export type {
    AccountCategory,
    AccountNature,
    CreateAccountDTO,
    AccountBalance
} from './account.service';

export { reportService } from './report.service';
export type {
    TrialBalanceReport,
    TrialBalanceEntry,
    BalanceSheetReport,
    IncomeStatementReport,
    CashFlowReport,
    GeneralLedgerReport
} from './report.service';

// Service instances are exported as named exports above
// Use: import { voucherService, accountService, reportService } from './services';
