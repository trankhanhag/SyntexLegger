/**
 * Account Repository
 * Handles all database operations for Chart of Accounts
 */

import { BaseRepository, QueryOptions } from './base.repository';
import knex from '../knex';
import { ChartOfAccount } from '../../types/database.types';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';

export interface AccountFilter {
  category?: string;
  search?: string;
  parentCode?: string;
  isDetail?: boolean;
}

export interface AccountBalance {
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

export class AccountRepository extends BaseRepository<ChartOfAccount> {
  constructor() {
    super('chart_of_accounts', 'account_code');
  }

  /**
   * Find accounts with filters
   */
  async findWithFilters(
    filters: AccountFilter,
    options?: QueryOptions
  ): Promise<ChartOfAccount[]> {
    let query = this.query();

    if (filters.category) {
      query = query.where('category', filters.category);
    }

    if (filters.parentCode) {
      query = query.where('parent_code', filters.parentCode);
    }

    if (filters.isDetail !== undefined) {
      query = query.where('is_detail', filters.isDetail ? 1 : 0);
    }

    if (filters.search) {
      query = query.where(function () {
        this.where('account_code', 'like', `%${filters.search}%`)
          .orWhere('account_name', 'like', `%${filters.search}%`);
      });
    }

    if (options?.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    } else {
      query = query.orderBy('account_code', 'asc');
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query as Promise<ChartOfAccount[]>;
  }

  /**
   * Find account by code
   */
  async findByCode(code: string): Promise<ChartOfAccount | undefined> {
    return this.findOne({ account_code: code } as Partial<ChartOfAccount>);
  }

  /**
   * Find child accounts
   */
  async findChildren(parentCode: string): Promise<ChartOfAccount[]> {
    return this.query()
      .where('parent_code', parentCode)
      .orderBy('account_code', 'asc') as Promise<ChartOfAccount[]>;
  }

  /**
   * Find accounts that start with a code prefix
   */
  async findByPrefix(prefix: string): Promise<ChartOfAccount[]> {
    return this.query()
      .where('account_code', 'like', `${prefix}%`)
      .orderBy('account_code', 'asc') as Promise<ChartOfAccount[]>;
  }

  /**
   * Check if account has transactions
   */
  async hasTransactions(code: string): Promise<boolean> {
    const result = await knex('general_ledger')
      .where('account_code', code)
      .count('* as count')
      .first();
    return Number(result?.count) > 0;
  }

  /**
   * Get account balance for a period
   */
  async getBalance(
    code: string,
    fromDate: string,
    toDate: string
  ): Promise<{ debit: number; credit: number }> {
    const result = await knex('general_ledger')
      .where('account_code', code)
      .where('trx_date', '>=', fromDate)
      .where('trx_date', '<=', toDate)
      .sum({ debit: 'debit_amount', credit: 'credit_amount' })
      .first();

    return {
      debit: Number(result?.debit) || 0,
      credit: Number(result?.credit) || 0
    };
  }

  /**
   * Get trial balance
   */
  async getTrialBalance(
    fromDate: string,
    toDate: string,
    openingDate?: string
  ): Promise<AccountBalance[]> {
    // Opening date defaults to start of fiscal year
    const openingFromDate = openingDate || `${new Date(fromDate).getFullYear()}-01-01`;

    const sql = `
      SELECT
        a.account_code,
        a.account_name,
        a.category,
        COALESCE(opening.debit, 0) as opening_debit,
        COALESCE(opening.credit, 0) as opening_credit,
        COALESCE(period.debit, 0) as period_debit,
        COALESCE(period.credit, 0) as period_credit,
        COALESCE(opening.debit, 0) + COALESCE(period.debit, 0) as closing_debit,
        COALESCE(opening.credit, 0) + COALESCE(period.credit, 0) as closing_credit
      FROM chart_of_accounts a
      LEFT JOIN (
        SELECT
          account_code,
          SUM(debit_amount) as debit,
          SUM(credit_amount) as credit
        FROM general_ledger
        WHERE trx_date < ?
        GROUP BY account_code
      ) opening ON a.account_code = opening.account_code
      LEFT JOIN (
        SELECT
          account_code,
          SUM(debit_amount) as debit,
          SUM(credit_amount) as credit
        FROM general_ledger
        WHERE trx_date >= ? AND trx_date <= ?
        GROUP BY account_code
      ) period ON a.account_code = period.account_code
      WHERE opening.debit IS NOT NULL
        OR opening.credit IS NOT NULL
        OR period.debit IS NOT NULL
        OR period.credit IS NOT NULL
      ORDER BY a.account_code
    `;

    const result = await knex.raw(sql, [fromDate, fromDate, toDate]);
    return (result.rows || result) as AccountBalance[];
  }

  /**
   * Get ledger entries for an account
   */
  async getLedgerEntries(
    code: string,
    fromDate: string,
    toDate: string
  ): Promise<any[]> {
    return knex('general_ledger')
      .where('account_code', code)
      .where('trx_date', '>=', fromDate)
      .where('trx_date', '<=', toDate)
      .orderBy('trx_date', 'asc')
      .orderBy('doc_no', 'asc');
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const result = await this.query()
      .distinct('category')
      .orderBy('category', 'asc');
    return result.map((r: any) => r.category);
  }

  /**
   * Create account with validation
   */
  async createAccount(data: ChartOfAccount): Promise<ChartOfAccount> {
    // Check if account code already exists
    const existing = await this.findByCode(data.account_code);
    if (existing) {
      throw new ConflictError(`Mã tài khoản ${data.account_code} đã tồn tại`, {
        field: 'account_code',
        value: data.account_code
      });
    }

    // Check parent exists if specified
    if (data.parent_code) {
      const parent = await this.findByCode(data.parent_code);
      if (!parent) {
        throw new NotFoundError('Tài khoản cha', data.parent_code);
      }
    }

    await this.query().insert(data);
    return this.findByCode(data.account_code) as Promise<ChartOfAccount>;
  }

  /**
   * Update account with validation
   */
  async updateAccount(
    code: string,
    data: Partial<ChartOfAccount>
  ): Promise<ChartOfAccount | undefined> {
    // Don't allow changing account_code if it has transactions
    if (data.account_code && data.account_code !== code) {
      const hasTransactions = await this.hasTransactions(code);
      if (hasTransactions) {
        throw new ValidationError('Không thể đổi mã tài khoản đã có phát sinh', [{
          field: 'account_code',
          message: 'Tài khoản đã có giao dịch'
        }]);
      }
    }

    await this.query()
      .where('account_code', code)
      .update(data);

    return this.findByCode(data.account_code || code);
  }

  /**
   * Delete account with validation
   */
  async deleteAccount(code: string): Promise<boolean> {
    // Check for transactions
    const hasTransactions = await this.hasTransactions(code);
    if (hasTransactions) {
      throw new ValidationError('Không thể xóa tài khoản đã có phát sinh', [{
        field: 'account_code',
        message: 'Tài khoản đã có giao dịch'
      }]);
    }

    // Check for child accounts
    const children = await this.findChildren(code);
    if (children.length > 0) {
      throw new ValidationError('Không thể xóa tài khoản có tài khoản con', [{
        field: 'account_code',
        message: 'Tài khoản có tài khoản con'
      }]);
    }

    const deleted = await this.query()
      .where('account_code', code)
      .del();

    return deleted > 0;
  }
}

// Export singleton instance
export const accountRepository = new AccountRepository();
