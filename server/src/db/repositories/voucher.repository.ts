/**
 * Voucher Repository
 * Handles all database operations for vouchers and voucher items
 */

import { BaseRepository, QueryOptions, PaginatedResult, PaginationOptions } from './base.repository';
import knex, { Knex } from '../knex';
import {
  Voucher,
  VoucherItem,
  VoucherType,
  VoucherStatus,
  GeneralLedger
} from '../../types/database.types';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ValidationError } from '../../errors';

export interface VoucherFilter {
  type?: VoucherType;
  status?: VoucherStatus;
  fromDate?: string;
  toDate?: string;
  docNo?: string;
  search?: string;
}

export interface VoucherWithItems extends Voucher {
  items: VoucherItem[];
}

export class VoucherRepository extends BaseRepository<Voucher> {
  constructor() {
    super('vouchers', 'id');
  }

  /**
   * Find vouchers with filters
   */
  async findWithFilters(
    filters: VoucherFilter,
    pagination?: PaginationOptions,
    options?: QueryOptions
  ): Promise<PaginatedResult<Voucher>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = this.query();

    // Apply filters
    if (filters.type) {
      query = query.where('type', filters.type);
    }

    if (filters.status) {
      query = query.where('status', filters.status);
    }

    if (filters.fromDate) {
      query = query.where('doc_date', '>=', filters.fromDate);
    }

    if (filters.toDate) {
      query = query.where('doc_date', '<=', filters.toDate);
    }

    if (filters.docNo) {
      query = query.where('doc_no', 'like', `%${filters.docNo}%`);
    }

    if (filters.search) {
      query = query.where(function () {
        this.where('doc_no', 'like', `%${filters.search}%`)
          .orWhere('description', 'like', `%${filters.search}%`);
      });
    }

    // Get total count
    const countResult = await query.clone().count('* as count');
    const totalItems = Number(countResult[0]?.count || 0);

    // Apply ordering
    const orderBy = options?.orderBy || 'doc_date';
    const orderDirection = options?.orderDirection || 'desc';
    query = query.orderBy(orderBy, orderDirection);

    // Apply pagination
    query = query.limit(pageSize).offset(offset);

    const data = await query as Voucher[];

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
   * Find voucher by doc_no
   */
  async findByDocNo(docNo: string): Promise<Voucher | undefined> {
    return this.findOne({ doc_no: docNo } as Partial<Voucher>);
  }

  /**
   * Get voucher with its items
   */
  async findByIdWithItems(id: string): Promise<VoucherWithItems | undefined> {
    const voucher = await this.findById(id);
    if (!voucher) return undefined;

    const items = await knex<VoucherItem>('voucher_items')
      .where('voucher_id', id)
      .orderBy('id', 'asc');

    return { ...voucher, items };
  }

  /**
   * Create voucher with items in a transaction
   */
  async createWithItems(
    voucherData: Omit<Voucher, 'id' | 'created_at'>,
    items: Omit<VoucherItem, 'id' | 'voucher_id'>[]
  ): Promise<VoucherWithItems> {
    return this.transaction(async (trx) => {
      const id = uuidv4();
      const now = new Date().toISOString();

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Insert voucher
      await trx('vouchers').insert({
        id,
        ...voucherData,
        total_amount: totalAmount,
        created_at: now
      });

      // Insert items
      const itemsWithVoucherId = items.map((item, index) => ({
        ...item,
        voucher_id: id,
        line_no: index + 1
      }));

      if (itemsWithVoucherId.length > 0) {
        await trx('voucher_items').insert(itemsWithVoucherId);
      }

      // Fetch and return the created voucher with items
      const voucher = await trx('vouchers').where('id', id).first() as Voucher;
      const insertedItems = await trx('voucher_items')
        .where('voucher_id', id)
        .orderBy('id', 'asc') as VoucherItem[];

      return { ...voucher, items: insertedItems };
    });
  }

  /**
   * Update voucher with items in a transaction
   */
  async updateWithItems(
    id: string,
    voucherData: Partial<Voucher>,
    items: Omit<VoucherItem, 'voucher_id'>[]
  ): Promise<VoucherWithItems | undefined> {
    return this.transaction(async (trx) => {
      // Check if voucher exists
      const existing = await trx('vouchers').where('id', id).first();
      if (!existing) return undefined;

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Update voucher
      await trx('vouchers')
        .where('id', id)
        .update({
          ...voucherData,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        });

      // Delete existing items
      await trx('voucher_items').where('voucher_id', id).del();

      // Insert new items
      const itemsWithVoucherId = items.map((item, index) => ({
        ...item,
        voucher_id: id,
        line_no: index + 1
      }));

      if (itemsWithVoucherId.length > 0) {
        await trx('voucher_items').insert(itemsWithVoucherId);
      }

      // Fetch and return the updated voucher with items
      const voucher = await trx('vouchers').where('id', id).first() as Voucher;
      const updatedItems = await trx('voucher_items')
        .where('voucher_id', id)
        .orderBy('id', 'asc') as VoucherItem[];

      return { ...voucher, items: updatedItems };
    });
  }

  /**
   * Post voucher to general ledger
   */
  async postToGeneralLedger(id: string): Promise<boolean> {
    return this.transaction(async (trx) => {
      // Get voucher with items
      const voucher = await trx('vouchers').where('id', id).first() as Voucher;
      if (!voucher) {
        throw new NotFoundError('Chứng từ', id);
      }

      if (voucher.status === 'POSTED') {
        throw new ValidationError('Chứng từ đã được ghi sổ', [{
          field: 'status',
          message: 'Chứng từ đã được ghi sổ'
        }]);
      }

      const items = await trx('voucher_items')
        .where('voucher_id', id) as VoucherItem[];

      const now = new Date().toISOString();
      const glEntries: Partial<GeneralLedger>[] = [];

      // Create GL entries for each voucher item
      for (const item of items) {
        if (item.debit_acc && item.amount > 0) {
          glEntries.push({
            id: uuidv4(),
            trx_date: voucher.doc_date,
            posted_at: now,
            doc_no: voucher.doc_no,
            description: item.description || voucher.description,
            account_code: item.debit_acc,
            reciprocal_acc: item.credit_acc,
            debit_amount: item.amount,
            credit_amount: 0,
            voucher_id: id,
            partner_code: item.partner_code,
            item_code: item.item_code,
            sub_item_code: item.sub_item_code
          });
        }

        if (item.credit_acc && item.amount > 0) {
          glEntries.push({
            id: uuidv4(),
            trx_date: voucher.doc_date,
            posted_at: now,
            doc_no: voucher.doc_no,
            description: item.description || voucher.description,
            account_code: item.credit_acc,
            reciprocal_acc: item.debit_acc,
            debit_amount: 0,
            credit_amount: item.amount,
            voucher_id: id,
            partner_code: item.partner_code,
            item_code: item.item_code,
            sub_item_code: item.sub_item_code
          });
        }
      }

      // Insert GL entries
      if (glEntries.length > 0) {
        await trx('general_ledger').insert(glEntries);
      }

      // Update voucher status
      await trx('vouchers')
        .where('id', id)
        .update({ status: 'POSTED' });

      return true;
    });
  }

  /**
   * Void a posted voucher (reverse GL entries)
   */
  async voidVoucher(id: string): Promise<boolean> {
    return this.transaction(async (trx) => {
      const voucher = await trx('vouchers').where('id', id).first() as Voucher;
      if (!voucher) {
        throw new NotFoundError('Chứng từ', id);
      }

      // Delete GL entries for this voucher
      await trx('general_ledger').where('voucher_id', id).del();

      // Update voucher status
      await trx('vouchers')
        .where('id', id)
        .update({ status: 'VOIDED' });

      return true;
    });
  }

  /**
   * Duplicate a voucher
   */
  async duplicate(id: string, newDocNo: string): Promise<VoucherWithItems> {
    const original = await this.findByIdWithItems(id);
    if (!original) {
      throw new NotFoundError('Chứng từ', id);
    }

    const { items, id: _id, created_at: _createdAt, ...voucherData } = original;
    const newItems = items.map(({ id: _itemId, voucher_id: _vId, ...item }) => item);

    return this.createWithItems(
      {
        ...voucherData,
        doc_no: newDocNo,
        status: 'DRAFT'
      },
      newItems
    );
  }

  /**
   * Delete voucher with items
   */
  async deleteWithItems(id: string): Promise<boolean> {
    return this.transaction(async (trx) => {
      const voucher = await trx('vouchers').where('id', id).first();
      if (!voucher) return false;

      // Delete items first (due to foreign key)
      await trx('voucher_items').where('voucher_id', id).del();

      // Delete GL entries
      await trx('general_ledger').where('voucher_id', id).del();

      // Delete voucher
      await trx('vouchers').where('id', id).del();

      return true;
    });
  }

  /**
   * Get next doc_no for a voucher type
   */
  async getNextDocNo(type: VoucherType, prefix?: string): Promise<string> {
    const year = new Date().getFullYear();
    const typePrefix = prefix || type.substring(0, 2).toUpperCase();
    const pattern = `${typePrefix}${year}%`;

    const result = await knex.raw(`
      SELECT doc_no FROM vouchers
      WHERE doc_no LIKE ?
      ORDER BY doc_no DESC
      LIMIT 1
    `, [pattern]);

    let nextNum = 1;
    const rows = result.rows || result;

    if (rows && rows.length > 0) {
      const lastDocNo = rows[0].doc_no;
      const numPart = lastDocNo.replace(`${typePrefix}${year}`, '');
      nextNum = parseInt(numPart, 10) + 1;
    }

    return `${typePrefix}${year}${String(nextNum).padStart(5, '0')}`;
  }
}

// Export singleton instance
export const voucherRepository = new VoucherRepository();
