/**
 * Account Service
 * Business logic for Chart of Accounts operations
 * Follows Vietnamese Accounting Standards (TT 99/2025)
 */

import { AccountRepository } from '../db/repositories/account.repository';
import { ChartOfAccount } from '../types/database.types';
import { NotFoundError, ValidationError, BadRequestError, ConflictError } from '../errors';
import knex from '../db/knex';

export type AccountCategory =
    | 'TÀI SẢN'
    | 'NỢ PHẢI TRẢ'
    | 'VỐN CHỦ SỞ HỮU'
    | 'DOANH THU'
    | 'CHI PHÍ'
    | 'THU NHẬP KHÁC'
    | 'CHI PHÍ KHÁC'
    | 'XÁC ĐỊNH KQKD';

export type AccountNature = 'DEBIT' | 'CREDIT' | 'BOTH';

export interface CreateAccountDTO {
    account_code: string;
    account_name: string;
    category: AccountCategory;
    parent_code?: string;
    is_detail?: number;
}

export interface AccountBalance {
    account_code: string;
    account_name: string;
    opening_debit: number;
    opening_credit: number;
    period_debit: number;
    period_credit: number;
    closing_debit: number;
    closing_credit: number;
}

export interface TrialBalanceEntry {
    account_code: string;
    account_name: string;
    category: string;
    debit_amount: number;
    credit_amount: number;
    balance: number;
}

class AccountService {
    private repository: AccountRepository;

    constructor() {
        this.repository = new AccountRepository();
    }

    /**
     * Get all accounts with optional filters
     */
    async getAccounts(options?: {
        category?: AccountCategory;
        isDetail?: boolean;
        isActive?: boolean;
        search?: string;
    }) {
        let query = knex('chart_of_accounts as coa')
            .select('*')
            .orderBy('account_code');

        if (options?.category) {
            query = query.where('category', options.category);
        }

        if (options?.isDetail !== undefined) {
            query = query.where('is_detail', options.isDetail ? 1 : 0);
        }

        if (options?.isActive !== undefined) {
            query = query.where('is_active', options.isActive ? 1 : 0);
        }

        if (options?.search) {
            query = query.where(function() {
                this.where('account_code', 'like', `%${options.search}%`)
                    .orWhere('account_name', 'like', `%${options.search}%`);
            });
        }

        return query;
    }

    /**
     * Get account by code
     */
    async getAccountByCode(code: string): Promise<ChartOfAccount> {
        const account = await knex('chart_of_accounts')
            .where('account_code', code)
            .first();

        if (!account) {
            throw new NotFoundError('Tài khoản', code);
        }

        return account;
    }

    /**
     * Create new account
     */
    async createAccount(dto: CreateAccountDTO): Promise<ChartOfAccount> {
        // Validate
        this.validateAccountData(dto);

        // Check if code already exists
        const existing = await knex('chart_of_accounts')
            .where('account_code', dto.account_code)
            .first();

        if (existing) {
            throw new ConflictError(`Mã tài khoản ${dto.account_code} đã tồn tại`);
        }

        // Validate parent if specified
        if (dto.parent_code) {
            await this.validateParentAccount(dto.account_code, dto.parent_code);
        }

        // Insert account
        await knex('chart_of_accounts').insert({
            account_code: dto.account_code,
            account_name: dto.account_name,
            category: dto.category,
            parent_code: dto.parent_code,
            is_detail: dto.is_detail ?? 1,
            is_active: 1
        });

        return this.getAccountByCode(dto.account_code);
    }

    /**
     * Update existing account
     */
    async updateAccount(code: string, dto: Partial<CreateAccountDTO>): Promise<ChartOfAccount> {
        const existing = await this.getAccountByCode(code);

        // Cannot change code
        if (dto.account_code && dto.account_code !== code) {
            throw new BadRequestError('Không thể thay đổi mã tài khoản');
        }

        // Validate parent if changing
        if (dto.parent_code && dto.parent_code !== existing.parent_code) {
            await this.validateParentAccount(code, dto.parent_code);
        }

        await knex('chart_of_accounts')
            .where('account_code', code)
            .update({
                account_name: dto.account_name ?? existing.account_name,
                category: dto.category ?? existing.category,
                parent_code: dto.parent_code ?? existing.parent_code,
                is_detail: dto.is_detail ?? existing.is_detail
            });

        return this.getAccountByCode(code);
    }

    /**
     * Delete account (soft delete)
     */
    async deleteAccount(code: string): Promise<void> {
        const account = await this.getAccountByCode(code);

        // Check if account has transactions
        const hasTransactions = await this.accountHasTransactions(code);
        if (hasTransactions) {
            throw new BadRequestError(
                `Không thể xóa tài khoản ${code} vì đã phát sinh giao dịch`
            );
        }

        // Check if account has children
        const children = await knex('chart_of_accounts')
            .where('parent_code', code)
            .first();

        if (children) {
            throw new BadRequestError(
                `Không thể xóa tài khoản ${code} vì có tài khoản con`
            );
        }

        // Soft delete
        await knex('chart_of_accounts')
            .where('account_code', code)
            .update({ is_active: 0 });
    }

    /**
     * Get account balance for a specific period
     */
    async getAccountBalance(
        code: string,
        fromDate: string,
        toDate: string
    ): Promise<AccountBalance> {
        const account = await this.getAccountByCode(code);

        // Get opening balance (before fromDate)
        const opening = await knex('general_ledger')
            .select(
                knex.raw('COALESCE(SUM(debit_amount), 0) as debit'),
                knex.raw('COALESCE(SUM(credit_amount), 0) as credit')
            )
            .where('account_code', code)
            .where('trx_date', '<', fromDate)
            .first();

        // Get period movements
        const period = await knex('general_ledger')
            .select(
                knex.raw('COALESCE(SUM(debit_amount), 0) as debit'),
                knex.raw('COALESCE(SUM(credit_amount), 0) as credit')
            )
            .where('account_code', code)
            .where('trx_date', '>=', fromDate)
            .where('trx_date', '<=', toDate)
            .first();

        const openingDebit = Number(opening?.debit || 0);
        const openingCredit = Number(opening?.credit || 0);
        const periodDebit = Number(period?.debit || 0);
        const periodCredit = Number(period?.credit || 0);

        return {
            account_code: code,
            account_name: account.account_name,
            opening_debit: openingDebit,
            opening_credit: openingCredit,
            period_debit: periodDebit,
            period_credit: periodCredit,
            closing_debit: openingDebit + periodDebit,
            closing_credit: openingCredit + periodCredit
        };
    }

    /**
     * Get trial balance for all accounts
     */
    async getTrialBalance(fromDate: string, toDate: string): Promise<TrialBalanceEntry[]> {
        const results = await knex('general_ledger as gl')
            .join('chart_of_accounts as coa', 'gl.account_code', 'coa.account_code')
            .select(
                'gl.account_code',
                'coa.account_name',
                'coa.category',
                knex.raw('COALESCE(SUM(gl.debit_amount), 0) as debit_amount'),
                knex.raw('COALESCE(SUM(gl.credit_amount), 0) as credit_amount')
            )
            .where('gl.trx_date', '>=', fromDate)
            .where('gl.trx_date', '<=', toDate)
            .groupBy('gl.account_code', 'coa.account_name', 'coa.category')
            .orderBy('gl.account_code');

        return results.map(row => ({
            account_code: row.account_code,
            account_name: row.account_name,
            category: row.category,
            debit_amount: Number(row.debit_amount),
            credit_amount: Number(row.credit_amount),
            balance: Number(row.debit_amount) - Number(row.credit_amount)
        }));
    }

    /**
     * Get account nature (debit/credit) based on category
     */
    getAccountNature(category: AccountCategory): AccountNature {
        switch (category) {
            case 'TÀI SẢN':
            case 'CHI PHÍ':
            case 'CHI PHÍ KHÁC':
                return 'DEBIT';
            case 'NỢ PHẢI TRẢ':
            case 'VỐN CHỦ SỞ HỮU':
            case 'DOANH THU':
            case 'THU NHẬP KHÁC':
                return 'CREDIT';
            case 'XÁC ĐỊNH KQKD':
                return 'BOTH';
            default:
                return 'BOTH';
        }
    }

    /**
     * Get account level based on code length
     * TT 99/2025: Level 1 = 3 digits, Level 2 = 4 digits, etc.
     */
    getAccountLevel(code: string): number {
        if (code.length <= 3) return 1;
        return code.length - 2; // 4 digits = level 2, 5 digits = level 3, etc.
    }

    /**
     * Get parent account code
     */
    getParentCode(code: string): string | null {
        if (code.length <= 3) return null;
        return code.substring(0, code.length - 1);
    }

    /**
     * Check if account has transactions in general_ledger
     */
    async accountHasTransactions(code: string): Promise<boolean> {
        const result = await knex('general_ledger')
            .where('account_code', code)
            .first();

        return !!result;
    }

    /**
     * Get account hierarchy (parent and all children)
     */
    async getAccountHierarchy(code: string): Promise<ChartOfAccount[]> {
        // Get all accounts that start with this code (children)
        const accounts = await knex('chart_of_accounts')
            .where('account_code', 'like', `${code}%`)
            .orderBy('account_code');

        return accounts;
    }

    /**
     * Bulk import accounts
     */
    async importAccounts(accounts: CreateAccountDTO[]): Promise<{
        imported: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let imported = 0;

        for (const account of accounts) {
            try {
                await this.createAccount(account);
                imported++;
            } catch (error: any) {
                errors.push(`${account.account_code}: ${error.message}`);
            }
        }

        return { imported, errors };
    }

    /**
     * Validate account data
     */
    private validateAccountData(dto: CreateAccountDTO): void {
        const errors: string[] = [];

        if (!dto.account_code || dto.account_code.trim().length === 0) {
            errors.push('Mã tài khoản không được để trống');
        }

        if (dto.account_code && !/^\d+$/.test(dto.account_code)) {
            errors.push('Mã tài khoản chỉ được chứa số');
        }

        if (dto.account_code && dto.account_code.length > 20) {
            errors.push('Mã tài khoản không được quá 20 ký tự');
        }

        if (!dto.account_name || dto.account_name.trim().length === 0) {
            errors.push('Tên tài khoản không được để trống');
        }

        if (!dto.category) {
            errors.push('Loại tài khoản không được để trống');
        }

        const validCategories: AccountCategory[] = [
            'TÀI SẢN', 'NỢ PHẢI TRẢ', 'VỐN CHỦ SỞ HỮU',
            'DOANH THU', 'CHI PHÍ', 'THU NHẬP KHÁC',
            'CHI PHÍ KHÁC', 'XÁC ĐỊNH KQKD'
        ];

        if (dto.category && !validCategories.includes(dto.category)) {
            errors.push(`Loại tài khoản không hợp lệ: ${dto.category}`);
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join('; '));
        }
    }

    /**
     * Validate parent account relationship
     */
    private async validateParentAccount(childCode: string, parentCode: string): Promise<void> {
        // Parent must exist
        const parent = await knex('chart_of_accounts')
            .where('account_code', parentCode)
            .first();

        if (!parent) {
            throw new ValidationError(`Tài khoản cha ${parentCode} không tồn tại`);
        }

        // Child must start with parent code
        if (!childCode.startsWith(parentCode)) {
            throw new ValidationError(`Mã tài khoản con phải bắt đầu bằng mã tài khoản cha (${parentCode})`);
        }

        // Prevent circular reference
        if (childCode === parentCode) {
            throw new ValidationError('Tài khoản không thể là cha của chính nó');
        }
    }
}

// Export singleton instance
export const accountService = new AccountService();
export default accountService;
