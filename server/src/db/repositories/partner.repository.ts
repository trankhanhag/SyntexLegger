/**
 * Partner Repository
 * Handles all database operations for Partners (Customers, Suppliers, etc.)
 */

import { BaseRepository, QueryOptions, PaginatedResult, PaginationOptions } from './base.repository';
import knex from '../knex';
import { Partner } from '../../types/database.types';
import { ConflictError, ValidationError } from '../../errors';

export interface PartnerFilter {
  partnerType?: string;
  search?: string;
  isActive?: boolean;
}

export interface PartnerBalance {
  partner_code: string;
  partner_name: string;
  receivable_amount: number;
  payable_amount: number;
  net_balance: number;
}

export class PartnerRepository extends BaseRepository<Partner> {
  constructor() {
    super('partners', 'partner_code');
  }

  /**
   * Find partners with filters
   */
  async findWithFilters(
    filters: PartnerFilter,
    pagination?: PaginationOptions,
    options?: QueryOptions
  ): Promise<PaginatedResult<Partner>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = this.query();

    if (filters.partnerType) {
      query = query.where('partner_type', filters.partnerType);
    }

    if (filters.isActive !== undefined) {
      query = query.where('is_active', filters.isActive ? 1 : 0);
    }

    if (filters.search) {
      query = query.where(function () {
        this.where('partner_code', 'like', `%${filters.search}%`)
          .orWhere('partner_name', 'like', `%${filters.search}%`)
          .orWhere('tax_code', 'like', `%${filters.search}%`);
      });
    }

    // Get total count
    const countResult = await query.clone().count('* as count');
    const totalItems = Number(countResult[0]?.count || 0);

    // Apply ordering
    const orderBy = options?.orderBy || 'partner_code';
    const orderDirection = options?.orderDirection || 'asc';
    query = query.orderBy(orderBy, orderDirection);

    // Apply pagination
    query = query.limit(pageSize).offset(offset);

    const data = await query as Partner[];

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  /**
   * Find partner by code
   */
  async findByCode(code: string): Promise<Partner | undefined> {
    return this.findOne({ partner_code: code } as Partial<Partner>);
  }

  /**
   * Find partners by type
   */
  async findByType(type: string): Promise<Partner[]> {
    return this.query()
      .where('partner_type', type)
      .orderBy('partner_code', 'asc') as Promise<Partner[]>;
  }

  /**
   * Find customers (partner_type = 'CUSTOMER')
   */
  async findCustomers(): Promise<Partner[]> {
    return this.findByType('CUSTOMER');
  }

  /**
   * Find suppliers (partner_type = 'SUPPLIER')
   */
  async findSuppliers(): Promise<Partner[]> {
    return this.findByType('SUPPLIER');
  }

  /**
   * Check if partner has transactions
   */
  async hasTransactions(code: string): Promise<boolean> {
    const glResult = await knex('general_ledger')
      .where('partner_code', code)
      .count('* as count')
      .first();

    const viResult = await knex('voucher_items')
      .where('partner_code', code)
      .count('* as count')
      .first();

    return Number(glResult?.count) > 0 || Number(viResult?.count) > 0;
  }

  /**
   * Get partner balance (receivables minus payables)
   */
  async getBalance(code: string, asOfDate?: string): Promise<PartnerBalance | undefined> {
    const partner = await this.findByCode(code);
    if (!partner) return undefined;

    let dateCondition = '';
    const params: (string)[] = [code, code];

    if (asOfDate) {
      dateCondition = 'AND trx_date <= ?';
      params.push(asOfDate, asOfDate);
    }

    const sql = `
      SELECT
        ? as partner_code,
        COALESCE(
          (SELECT SUM(debit_amount - credit_amount)
           FROM general_ledger
           WHERE partner_code = ?
           AND account_code LIKE '131%' ${dateCondition}), 0
        ) as receivable_amount,
        COALESCE(
          (SELECT SUM(credit_amount - debit_amount)
           FROM general_ledger
           WHERE partner_code = ?
           AND account_code LIKE '331%' ${dateCondition}), 0
        ) as payable_amount
    `;

    const result = await knex.raw(sql, params);
    const row = (result.rows || result)[0];

    if (!row) return undefined;

    return {
      partner_code: code,
      partner_name: partner.partner_name,
      receivable_amount: Number(row.receivable_amount) || 0,
      payable_amount: Number(row.payable_amount) || 0,
      net_balance: (Number(row.receivable_amount) || 0) - (Number(row.payable_amount) || 0)
    };
  }

  /**
   * Get all partner balances
   */
  async getAllBalances(asOfDate?: string): Promise<PartnerBalance[]> {
    let dateCondition = '';
    const params: string[] = [];

    if (asOfDate) {
      dateCondition = 'AND gl.trx_date <= ?';
      params.push(asOfDate);
    }

    const sql = `
      SELECT
        p.partner_code,
        p.partner_name,
        COALESCE(SUM(CASE WHEN gl.account_code LIKE '131%' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as receivable_amount,
        COALESCE(SUM(CASE WHEN gl.account_code LIKE '331%' THEN gl.credit_amount - gl.debit_amount ELSE 0 END), 0) as payable_amount
      FROM partners p
      LEFT JOIN general_ledger gl ON p.partner_code = gl.partner_code ${dateCondition}
      GROUP BY p.partner_code, p.partner_name
      HAVING receivable_amount != 0 OR payable_amount != 0
      ORDER BY p.partner_code
    `;

    const result = await knex.raw(sql, params);
    const rows = result.rows || result;

    return rows.map((row: any) => ({
      partner_code: row.partner_code,
      partner_name: row.partner_name,
      receivable_amount: Number(row.receivable_amount) || 0,
      payable_amount: Number(row.payable_amount) || 0,
      net_balance: (Number(row.receivable_amount) || 0) - (Number(row.payable_amount) || 0)
    }));
  }

  /**
   * Get transactions for a partner
   */
  async getTransactions(
    code: string,
    fromDate: string,
    toDate: string
  ): Promise<any[]> {
    return knex('general_ledger')
      .where('partner_code', code)
      .where('trx_date', '>=', fromDate)
      .where('trx_date', '<=', toDate)
      .orderBy('trx_date', 'asc')
      .orderBy('doc_no', 'asc');
  }

  /**
   * Create partner with validation
   */
  async createPartner(data: Partner): Promise<Partner> {
    // Check if partner code already exists
    const existing = await this.findByCode(data.partner_code);
    if (existing) {
      throw new ConflictError(`Mã đối tác ${data.partner_code} đã tồn tại`, {
        field: 'partner_code',
        value: data.partner_code
      });
    }

    // Check tax code uniqueness (if provided)
    if (data.tax_code) {
      const existingTax = await this.findOne({ tax_code: data.tax_code } as Partial<Partner>);
      if (existingTax) {
        throw new ConflictError(`Mã số thuế ${data.tax_code} đã tồn tại`, {
          field: 'tax_code',
          value: data.tax_code
        });
      }
    }

    await this.query().insert({
      ...data,
      is_active: data.is_active ?? 1
    });

    return this.findByCode(data.partner_code) as Promise<Partner>;
  }

  /**
   * Update partner with validation
   */
  async updatePartner(
    code: string,
    data: Partial<Partner>
  ): Promise<Partner | undefined> {
    // Don't allow changing partner_code if it has transactions
    if (data.partner_code && data.partner_code !== code) {
      const hasTransactions = await this.hasTransactions(code);
      if (hasTransactions) {
        throw new ValidationError('Không thể đổi mã đối tác đã có phát sinh', [{
          field: 'partner_code',
          message: 'Đối tác đã có giao dịch'
        }]);
      }
    }

    // Check tax code uniqueness (if changing)
    if (data.tax_code) {
      const existingTax = await this.query()
        .where('tax_code', data.tax_code)
        .whereNot('partner_code', code)
        .first();
      if (existingTax) {
        throw new ConflictError(`Mã số thuế ${data.tax_code} đã tồn tại`, {
          field: 'tax_code',
          value: data.tax_code
        });
      }
    }

    await this.query()
      .where('partner_code', code)
      .update(data);

    return this.findByCode(data.partner_code || code);
  }

  /**
   * Delete partner with validation
   */
  async deletePartner(code: string): Promise<boolean> {
    // Check for transactions
    const hasTransactions = await this.hasTransactions(code);
    if (hasTransactions) {
      throw new ValidationError('Không thể xóa đối tác đã có phát sinh', [{
        field: 'partner_code',
        message: 'Đối tác đã có giao dịch'
      }]);
    }

    const deleted = await this.query()
      .where('partner_code', code)
      .del();

    return deleted > 0;
  }

  /**
   * Get partner types
   */
  async getPartnerTypes(): Promise<string[]> {
    const result = await this.query()
      .distinct('partner_type')
      .whereNotNull('partner_type')
      .orderBy('partner_type', 'asc');
    return result.map((r: any) => r.partner_type).filter(Boolean);
  }
}

// Export singleton instance
export const partnerRepository = new PartnerRepository();
