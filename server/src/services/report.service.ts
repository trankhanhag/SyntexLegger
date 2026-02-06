/**
 * Report Service
 * Financial reporting business logic
 * Follows Vietnamese Accounting Standards (TT 99/2025)
 */

import knex from '../db/knex';
import { accountService, AccountBalance } from './account.service';

export interface TrialBalanceReport {
    fromDate: string;
    toDate: string;
    entries: TrialBalanceEntry[];
    totals: {
        totalDebit: number;
        totalCredit: number;
        isBalanced: boolean;
    };
}

export interface TrialBalanceEntry {
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

export interface BalanceSheetReport {
    asOfDate: string;
    assets: BalanceSheetSection;
    liabilities: BalanceSheetSection;
    equity: BalanceSheetSection;
    totals: {
        totalAssets: number;
        totalLiabilitiesAndEquity: number;
        isBalanced: boolean;
    };
}

export interface BalanceSheetSection {
    items: BalanceSheetItem[];
    total: number;
}

export interface BalanceSheetItem {
    account_code: string;
    account_name: string;
    amount: number;
    level: number;
}

export interface IncomeStatementReport {
    fromDate: string;
    toDate: string;
    revenue: IncomeStatementSection;
    costOfGoodsSold: IncomeStatementSection;
    grossProfit: number;
    operatingExpenses: IncomeStatementSection;
    operatingIncome: number;
    otherIncome: IncomeStatementSection;
    otherExpenses: IncomeStatementSection;
    profitBeforeTax: number;
    incomeTax: number;
    netProfit: number;
}

export interface IncomeStatementSection {
    items: { account_code: string; account_name: string; amount: number }[];
    total: number;
}

export interface CashFlowReport {
    fromDate: string;
    toDate: string;
    operatingActivities: CashFlowSection;
    investingActivities: CashFlowSection;
    financingActivities: CashFlowSection;
    netCashChange: number;
    beginningCash: number;
    endingCash: number;
}

export interface CashFlowSection {
    items: { description: string; amount: number }[];
    total: number;
}

export interface GeneralLedgerReport {
    account_code: string;
    account_name: string;
    fromDate: string;
    toDate: string;
    openingBalance: number;
    entries: GeneralLedgerEntry[];
    closingBalance: number;
}

export interface GeneralLedgerEntry {
    trx_date: string;
    doc_no: string;
    description: string;
    reciprocal_acc: string;
    debit_amount: number;
    credit_amount: number;
    running_balance: number;
}

class ReportService {
    /**
     * Generate Trial Balance Report (Bảng cân đối số phát sinh)
     */
    async generateTrialBalance(fromDate: string, toDate: string): Promise<TrialBalanceReport> {
        // Get all accounts with balances
        const accounts = await knex('chart_of_accounts as coa')
            .leftJoin('general_ledger as gl', 'coa.account_code', 'gl.account_code')
            .select(
                'coa.account_code',
                'coa.account_name',
                'coa.category',
                knex.raw(`COALESCE(SUM(CASE WHEN gl.trx_date < ? THEN gl.debit_amount ELSE 0 END), 0) as opening_debit`, [fromDate]),
                knex.raw(`COALESCE(SUM(CASE WHEN gl.trx_date < ? THEN gl.credit_amount ELSE 0 END), 0) as opening_credit`, [fromDate]),
                knex.raw(`COALESCE(SUM(CASE WHEN gl.trx_date >= ? AND gl.trx_date <= ? THEN gl.debit_amount ELSE 0 END), 0) as period_debit`, [fromDate, toDate]),
                knex.raw(`COALESCE(SUM(CASE WHEN gl.trx_date >= ? AND gl.trx_date <= ? THEN gl.credit_amount ELSE 0 END), 0) as period_credit`, [fromDate, toDate])
            )
            .groupBy('coa.account_code', 'coa.account_name', 'coa.category')
            .orderBy('coa.account_code');

        const entries: TrialBalanceEntry[] = accounts.map(row => {
            const openingDebit = Number(row.opening_debit);
            const openingCredit = Number(row.opening_credit);
            const periodDebit = Number(row.period_debit);
            const periodCredit = Number(row.period_credit);

            return {
                account_code: row.account_code,
                account_name: row.account_name,
                category: row.category,
                opening_debit: openingDebit,
                opening_credit: openingCredit,
                period_debit: periodDebit,
                period_credit: periodCredit,
                closing_debit: openingDebit + periodDebit,
                closing_credit: openingCredit + periodCredit
            };
        }).filter(e =>
            e.opening_debit > 0 || e.opening_credit > 0 ||
            e.period_debit > 0 || e.period_credit > 0
        );

        const totalDebit = entries.reduce((sum, e) => sum + e.period_debit, 0);
        const totalCredit = entries.reduce((sum, e) => sum + e.period_credit, 0);

        return {
            fromDate,
            toDate,
            entries,
            totals: {
                totalDebit,
                totalCredit,
                isBalanced: Math.abs(totalDebit - totalCredit) < 1
            }
        };
    }

    /**
     * Generate Balance Sheet (Bảng cân đối kế toán)
     */
    async generateBalanceSheet(asOfDate: string): Promise<BalanceSheetReport> {
        const balances = await knex('general_ledger as gl')
            .join('chart_of_accounts as coa', 'gl.account_code', 'coa.account_code')
            .select(
                'coa.account_code',
                'coa.account_name',
                'coa.category',
                knex.raw('COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as balance')
            )
            .where('gl.trx_date', '<=', asOfDate)
            .groupBy('coa.account_code', 'coa.account_name', 'coa.category')
            .orderBy('coa.account_code');

        // Group by category
        const assets: BalanceSheetItem[] = [];
        const liabilities: BalanceSheetItem[] = [];
        const equity: BalanceSheetItem[] = [];

        for (const row of balances) {
            const balance = Number(row.balance);
            if (balance === 0) continue;

            const item: BalanceSheetItem = {
                account_code: row.account_code,
                account_name: row.account_name,
                amount: Math.abs(balance),
                level: accountService.getAccountLevel(row.account_code)
            };

            if (row.category === 'TÀI SẢN') {
                item.amount = balance; // Debit nature
                assets.push(item);
            } else if (row.category === 'NỢ PHẢI TRẢ') {
                item.amount = -balance; // Credit nature
                liabilities.push(item);
            } else if (row.category === 'VỐN CHỦ SỞ HỮU') {
                item.amount = -balance; // Credit nature
                equity.push(item);
            }
        }

        const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
        const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
        const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        return {
            asOfDate,
            assets: { items: assets, total: totalAssets },
            liabilities: { items: liabilities, total: totalLiabilities },
            equity: { items: equity, total: totalEquity },
            totals: {
                totalAssets,
                totalLiabilitiesAndEquity,
                isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1
            }
        };
    }

    /**
     * Generate Income Statement (Báo cáo kết quả kinh doanh)
     */
    async generateIncomeStatement(fromDate: string, toDate: string): Promise<IncomeStatementReport> {
        const accounts = await knex('general_ledger as gl')
            .join('chart_of_accounts as coa', 'gl.account_code', 'coa.account_code')
            .select(
                'coa.account_code',
                'coa.account_name',
                'coa.category',
                knex.raw('COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as amount')
            )
            .where('gl.trx_date', '>=', fromDate)
            .where('gl.trx_date', '<=', toDate)
            .whereIn('coa.category', ['DOANH THU', 'CHI PHÍ', 'THU NHẬP KHÁC', 'CHI PHÍ KHÁC'])
            .groupBy('coa.account_code', 'coa.account_name', 'coa.category')
            .orderBy('coa.account_code');

        // Group accounts
        const revenue: { account_code: string; account_name: string; amount: number }[] = [];
        const cogs: { account_code: string; account_name: string; amount: number }[] = [];
        const opex: { account_code: string; account_name: string; amount: number }[] = [];
        const otherIncome: { account_code: string; account_name: string; amount: number }[] = [];
        const otherExpenses: { account_code: string; account_name: string; amount: number }[] = [];

        for (const row of accounts) {
            const amount = Number(row.amount);
            const item = {
                account_code: row.account_code,
                account_name: row.account_name,
                amount: Math.abs(amount)
            };

            if (row.category === 'DOANH THU') {
                revenue.push(item);
            } else if (row.category === 'CHI PHÍ') {
                // 632 = COGS, others = OPEX
                if (row.account_code.startsWith('632')) {
                    cogs.push(item);
                } else {
                    opex.push(item);
                }
            } else if (row.category === 'THU NHẬP KHÁC') {
                otherIncome.push(item);
            } else if (row.category === 'CHI PHÍ KHÁC') {
                otherExpenses.push(item);
            }
        }

        const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);
        const totalCogs = cogs.reduce((sum, item) => sum + item.amount, 0);
        const grossProfit = totalRevenue - totalCogs;
        const totalOpex = opex.reduce((sum, item) => sum + item.amount, 0);
        const operatingIncome = grossProfit - totalOpex;
        const totalOtherIncome = otherIncome.reduce((sum, item) => sum + item.amount, 0);
        const totalOtherExpenses = otherExpenses.reduce((sum, item) => sum + item.amount, 0);
        const profitBeforeTax = operatingIncome + totalOtherIncome - totalOtherExpenses;
        const incomeTax = Math.max(0, profitBeforeTax * 0.2); // 20% CIT rate
        const netProfit = profitBeforeTax - incomeTax;

        return {
            fromDate,
            toDate,
            revenue: { items: revenue, total: totalRevenue },
            costOfGoodsSold: { items: cogs, total: totalCogs },
            grossProfit,
            operatingExpenses: { items: opex, total: totalOpex },
            operatingIncome,
            otherIncome: { items: otherIncome, total: totalOtherIncome },
            otherExpenses: { items: otherExpenses, total: totalOtherExpenses },
            profitBeforeTax,
            incomeTax,
            netProfit
        };
    }

    /**
     * Generate General Ledger (Sổ cái)
     */
    async generateGeneralLedger(
        accountCode: string,
        fromDate: string,
        toDate: string
    ): Promise<GeneralLedgerReport> {
        const account = await accountService.getAccountByCode(accountCode);

        // Get opening balance
        const openingResult = await knex('general_ledger')
            .select(
                knex.raw('COALESCE(SUM(debit_amount - credit_amount), 0) as balance')
            )
            .where('account_code', accountCode)
            .where('trx_date', '<', fromDate)
            .first();

        const openingBalance = Number(openingResult?.balance || 0);

        // Get period entries
        const entries = await knex('general_ledger')
            .select('*')
            .where('account_code', accountCode)
            .where('trx_date', '>=', fromDate)
            .where('trx_date', '<=', toDate)
            .orderBy('trx_date')
            .orderBy('posted_at');

        // Calculate running balance
        let runningBalance = openingBalance;
        const entriesWithBalance: GeneralLedgerEntry[] = entries.map(row => {
            runningBalance += Number(row.debit_amount) - Number(row.credit_amount);
            return {
                trx_date: row.trx_date,
                doc_no: row.doc_no,
                description: row.description || '',
                reciprocal_acc: row.reciprocal_acc || '',
                debit_amount: Number(row.debit_amount),
                credit_amount: Number(row.credit_amount),
                running_balance: runningBalance
            };
        });

        return {
            account_code: accountCode,
            account_name: account.account_name,
            fromDate,
            toDate,
            openingBalance,
            entries: entriesWithBalance,
            closingBalance: runningBalance
        };
    }

    /**
     * Generate Cash Book (Sổ quỹ tiền mặt)
     */
    async generateCashBook(fromDate: string, toDate: string) {
        return this.generateGeneralLedger('111', fromDate, toDate);
    }

    /**
     * Generate Bank Book (Sổ tiền gửi ngân hàng)
     */
    async generateBankBook(fromDate: string, toDate: string) {
        return this.generateGeneralLedger('112', fromDate, toDate);
    }

    /**
     * Get balance verification (Đối chiếu số dư)
     */
    async getBalanceVerification(fromDate: string, toDate: string) {
        // Check if all vouchers in period are balanced
        const unbalancedVouchers = await knex('vouchers as v')
            .join('voucher_items as vi', 'v.id', 'vi.voucher_id')
            .select(
                'v.id',
                'v.doc_no',
                'v.doc_date',
                knex.raw('SUM(CASE WHEN vi.debit_acc IS NOT NULL THEN vi.amount ELSE 0 END) as total_debit'),
                knex.raw('SUM(CASE WHEN vi.credit_acc IS NOT NULL THEN vi.amount ELSE 0 END) as total_credit')
            )
            .where('v.doc_date', '>=', fromDate)
            .where('v.doc_date', '<=', toDate)
            .groupBy('v.id', 'v.doc_no', 'v.doc_date')
            .havingRaw('ABS(SUM(CASE WHEN vi.debit_acc IS NOT NULL THEN vi.amount ELSE 0 END) - SUM(CASE WHEN vi.credit_acc IS NOT NULL THEN vi.amount ELSE 0 END)) > 1');

        // Check trial balance
        const trialBalance = await this.generateTrialBalance(fromDate, toDate);

        return {
            isAllVouchersBalanced: unbalancedVouchers.length === 0,
            unbalancedVouchers,
            isTrialBalanceBalanced: trialBalance.totals.isBalanced,
            trialBalanceDifference: trialBalance.totals.totalDebit - trialBalance.totals.totalCredit
        };
    }
}

// Export singleton instance
export const reportService = new ReportService();
export default reportService;
