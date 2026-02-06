/**
 * Voucher Service
 * Business logic for voucher operations
 * Follows Vietnamese Accounting Standards (TT 99/2025)
 */

import { VoucherRepository, VoucherFilter, VoucherWithItems } from '../db/repositories/voucher.repository';
import { Voucher, VoucherItem, VoucherType, VoucherStatus, GeneralLedger } from '../types/database.types';
import { NotFoundError, ValidationError, BadRequestError, LockedError } from '../errors';
import knex from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

export interface CreateVoucherDTO {
    doc_no: string;
    doc_date: string;
    post_date: string;
    description?: string;
    type: VoucherType;
    total_amount: number;
    items: VoucherItem[];
    created_by?: string;
}

export interface UpdateVoucherDTO extends Partial<CreateVoucherDTO> {
    id: string;
    updated_by?: string;
}

export interface VoucherBalanceResult {
    isBalanced: boolean;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    offBalanceDebit: number;
    offBalanceCredit: number;
}

export interface PostVoucherResult {
    success: boolean;
    voucherId: string;
    glEntries: number;
    message: string;
}

class VoucherService {
    private repository: VoucherRepository;

    constructor() {
        this.repository = new VoucherRepository();
    }

    /**
     * Get vouchers with filters and pagination
     */
    async getVouchers(
        filters: VoucherFilter,
        page: number = 1,
        pageSize: number = 20
    ) {
        return this.repository.findWithFilters(
            filters,
            { page, pageSize }
        );
    }

    /**
     * Get single voucher with items
     */
    async getVoucherById(id: string): Promise<VoucherWithItems> {
        const voucher = await this.repository.findByIdWithItems(id);
        if (!voucher) {
            throw new NotFoundError('Voucher', id);
        }
        return voucher;
    }

    /**
     * Create new voucher with items
     */
    async createVoucher(dto: CreateVoucherDTO): Promise<VoucherWithItems> {
        // Validate voucher data
        this.validateVoucherData(dto);

        // Check balance
        const balanceResult = this.checkVoucherBalance(dto.items);
        if (!balanceResult.isBalanced) {
            throw new ValidationError(
                `Chứng từ không cân: Nợ ${balanceResult.totalDebit.toLocaleString()} - Có ${balanceResult.totalCredit.toLocaleString()} = ${balanceResult.difference.toLocaleString()}`
            );
        }

        // Generate ID
        const id = `V_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const now = new Date().toISOString();

        // Create voucher in transaction
        return knex.transaction(async (trx) => {
            // Insert voucher
            await trx('vouchers').insert({
                id,
                doc_no: dto.doc_no,
                doc_date: dto.doc_date,
                post_date: dto.post_date,
                description: dto.description,
                type: dto.type,
                total_amount: dto.total_amount,
                status: 'DRAFT' as VoucherStatus,
                currency: 'VND',
                fx_rate: 1,
                created_at: now,
                created_by: dto.created_by
            });

            // Insert items
            const itemsToInsert = dto.items.map((item, index) => ({
                voucher_id: id,
                line_no: index + 1,
                description: item.description,
                debit_acc: item.debit_acc,
                credit_acc: item.credit_acc,
                amount: item.amount,
                partner_code: item.partner_code,
                project_code: item.project_code,
                fund_source_id: item.fund_source_id,
                item_code: item.item_code,
                sub_item_code: item.sub_item_code
            }));

            await trx('voucher_items').insert(itemsToInsert);

            // Return created voucher
            const voucher = await trx('vouchers').where('id', id).first();
            const items = await trx('voucher_items').where('voucher_id', id);

            return { ...voucher, items } as VoucherWithItems;
        });
    }

    /**
     * Update existing voucher
     */
    async updateVoucher(dto: UpdateVoucherDTO): Promise<VoucherWithItems> {
        // Check if voucher exists
        const existing = await this.repository.findById(dto.id);
        if (!existing) {
            throw new NotFoundError('Voucher', dto.id);
        }

        // Cannot update posted vouchers
        if (existing.status === 'POSTED') {
            throw new BadRequestError('Không thể sửa chứng từ đã ghi sổ');
        }

        // Validate if items provided
        if (dto.items) {
            this.validateVoucherData(dto as CreateVoucherDTO);
            const balanceResult = this.checkVoucherBalance(dto.items);
            if (!balanceResult.isBalanced) {
                throw new ValidationError(
                    `Chứng từ không cân: Nợ ${balanceResult.totalDebit.toLocaleString()} - Có ${balanceResult.totalCredit.toLocaleString()}`
                );
            }
        }

        const now = new Date().toISOString();

        return knex.transaction(async (trx) => {
            // Update voucher
            await trx('vouchers')
                .where('id', dto.id)
                .update({
                    doc_no: dto.doc_no ?? existing.doc_no,
                    doc_date: dto.doc_date ?? existing.doc_date,
                    post_date: dto.post_date ?? existing.post_date,
                    description: dto.description ?? existing.description,
                    type: dto.type ?? existing.type,
                    total_amount: dto.total_amount ?? existing.total_amount,
                    updated_at: now,
                    updated_by: dto.updated_by
                });

            // Update items if provided
            if (dto.items) {
                await trx('voucher_items').where('voucher_id', dto.id).delete();

                const itemsToInsert = dto.items.map((item, index) => ({
                    voucher_id: dto.id,
                    line_no: index + 1,
                    description: item.description,
                    debit_acc: item.debit_acc,
                    credit_acc: item.credit_acc,
                    amount: item.amount,
                    partner_code: item.partner_code,
                    project_code: item.project_code
                }));

                await trx('voucher_items').insert(itemsToInsert);
            }

            // Return updated voucher
            const voucher = await trx('vouchers').where('id', dto.id).first();
            const items = await trx('voucher_items').where('voucher_id', dto.id);

            return { ...voucher, items } as VoucherWithItems;
        });
    }

    /**
     * Delete voucher
     */
    async deleteVoucher(id: string, reason?: string): Promise<void> {
        const voucher = await this.repository.findById(id);
        if (!voucher) {
            throw new NotFoundError('Voucher', id);
        }

        if (voucher.status === 'POSTED') {
            throw new BadRequestError('Không thể xóa chứng từ đã ghi sổ. Hãy hủy bỏ trước.');
        }

        await knex.transaction(async (trx) => {
            await trx('voucher_items').where('voucher_id', id).delete();
            await trx('vouchers').where('id', id).delete();
        });
    }

    /**
     * Post voucher to General Ledger
     */
    async postVoucher(id: string, postedBy?: string): Promise<PostVoucherResult> {
        const voucher = await this.repository.findByIdWithItems(id);
        if (!voucher) {
            throw new NotFoundError('Voucher', id);
        }

        if (voucher.status === 'POSTED') {
            throw new BadRequestError('Chứng từ đã được ghi sổ');
        }

        if (voucher.status === 'VOIDED') {
            throw new BadRequestError('Không thể ghi sổ chứng từ đã hủy');
        }

        // Check balance before posting
        const balanceResult = this.checkVoucherBalance(voucher.items);
        if (!balanceResult.isBalanced) {
            throw new ValidationError('Chứng từ không cân, không thể ghi sổ');
        }

        const now = new Date().toISOString();
        let glEntriesCount = 0;

        await knex.transaction(async (trx) => {
            // Create GL entries
            const glEntries: Partial<GeneralLedger>[] = [];

            for (const item of voucher.items) {
                const baseEntry = {
                    trx_date: voucher.post_date,
                    posted_at: now,
                    doc_no: voucher.doc_no,
                    description: item.description || voucher.description,
                    partner_code: item.partner_code,
                    item_code: item.item_code,
                    sub_item_code: item.sub_item_code,
                    voucher_id: id
                };

                // Debit entry
                if (item.debit_acc && item.amount > 0) {
                    glEntries.push({
                        id: `GL_${id}_${glEntries.length}_D`,
                        ...baseEntry,
                        account_code: item.debit_acc,
                        reciprocal_acc: item.credit_acc,
                        debit_amount: item.amount,
                        credit_amount: 0
                    });
                }

                // Credit entry
                if (item.credit_acc && item.amount > 0) {
                    glEntries.push({
                        id: `GL_${id}_${glEntries.length}_C`,
                        ...baseEntry,
                        account_code: item.credit_acc,
                        reciprocal_acc: item.debit_acc,
                        debit_amount: 0,
                        credit_amount: item.amount
                    });
                }
            }

            // Insert GL entries
            if (glEntries.length > 0) {
                await trx('general_ledger').insert(glEntries);
                glEntriesCount = glEntries.length;
            }

            // Update voucher status
            await trx('vouchers')
                .where('id', id)
                .update({
                    status: 'POSTED',
                    updated_at: now,
                    updated_by: postedBy
                });
        });

        return {
            success: true,
            voucherId: id,
            glEntries: glEntriesCount,
            message: `Đã ghi sổ ${glEntriesCount} bút toán`
        };
    }

    /**
     * Void (cancel) a posted voucher
     */
    async voidVoucher(id: string, reason: string, voidedBy?: string): Promise<void> {
        const voucher = await this.repository.findById(id);
        if (!voucher) {
            throw new NotFoundError('Voucher', id);
        }

        if (voucher.status === 'VOIDED') {
            throw new BadRequestError('Chứng từ đã bị hủy');
        }

        if (!reason || reason.trim().length < 10) {
            throw new ValidationError('Lý do hủy phải có ít nhất 10 ký tự');
        }

        const now = new Date().toISOString();

        await knex.transaction(async (trx) => {
            // Remove GL entries if posted
            if (voucher.status === 'POSTED') {
                await trx('general_ledger').where('voucher_id', id).delete();
            }

            // Update voucher status
            await trx('vouchers')
                .where('id', id)
                .update({
                    status: 'VOIDED',
                    description: `[HỦY: ${reason}] ${voucher.description || ''}`,
                    updated_at: now,
                    updated_by: voidedBy
                });
        });
    }

    /**
     * Check if voucher items are balanced (debit = credit)
     */
    checkVoucherBalance(items: VoucherItem[]): VoucherBalanceResult {
        let totalDebit = 0;
        let totalCredit = 0;
        let offBalanceDebit = 0;
        let offBalanceCredit = 0;

        for (const item of items) {
            const isOffBalance = this.isOffBalanceAccount(item.debit_acc) ||
                                 this.isOffBalanceAccount(item.credit_acc);

            if (isOffBalance) {
                if (item.debit_acc) offBalanceDebit += item.amount;
                if (item.credit_acc) offBalanceCredit += item.amount;
            } else {
                if (item.debit_acc) totalDebit += item.amount;
                if (item.credit_acc) totalCredit += item.amount;
            }
        }

        const difference = Math.abs(totalDebit - totalCredit);
        // Allow tolerance of 1 VND for rounding
        const isBalanced = difference <= 1;

        return {
            isBalanced,
            totalDebit,
            totalCredit,
            difference,
            offBalanceDebit,
            offBalanceCredit
        };
    }

    /**
     * Check if account is off-balance sheet (TK 0xx)
     */
    private isOffBalanceAccount(accountCode?: string): boolean {
        return accountCode?.startsWith('0') || false;
    }

    /**
     * Validate voucher data before save
     */
    private validateVoucherData(dto: CreateVoucherDTO): void {
        const errors: string[] = [];

        if (!dto.doc_no || dto.doc_no.trim().length === 0) {
            errors.push('Số chứng từ không được để trống');
        }

        if (!dto.doc_date) {
            errors.push('Ngày chứng từ không được để trống');
        }

        if (!dto.post_date) {
            errors.push('Ngày ghi sổ không được để trống');
        }

        if (!dto.type) {
            errors.push('Loại chứng từ không được để trống');
        }

        if (!dto.items || dto.items.length === 0) {
            errors.push('Chứng từ phải có ít nhất một dòng chi tiết');
        }

        // Validate items
        dto.items?.forEach((item, index) => {
            if (!item.debit_acc && !item.credit_acc) {
                errors.push(`Dòng ${index + 1}: Phải có tài khoản Nợ hoặc Có`);
            }
            if (!item.amount || item.amount <= 0) {
                errors.push(`Dòng ${index + 1}: Số tiền phải lớn hơn 0`);
            }
        });

        if (errors.length > 0) {
            throw new ValidationError(errors.join('; '));
        }
    }

    /**
     * Get voucher statistics for dashboard
     */
    async getVoucherStats(fromDate: string, toDate: string) {
        const stats = await knex('vouchers')
            .select('type')
            .count('* as count')
            .sum('total_amount as total')
            .where('doc_date', '>=', fromDate)
            .where('doc_date', '<=', toDate)
            .groupBy('type');

        const statusStats = await knex('vouchers')
            .select('status')
            .count('* as count')
            .where('doc_date', '>=', fromDate)
            .where('doc_date', '<=', toDate)
            .groupBy('status');

        return {
            byType: stats,
            byStatus: statusStats
        };
    }
}

// Export singleton instance
export const voucherService = new VoucherService();
export default voucherService;
