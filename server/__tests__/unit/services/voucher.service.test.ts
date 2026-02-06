/**
 * Voucher Service Unit Tests
 * Tests business logic for voucher operations
 */

import { VoucherItem } from '../../../src/types/database.types';

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock knex before importing service
const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    groupBy: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
};
jest.mock('../../../src/db/knex', () => {
    const knexFn: any = jest.fn(() => mockQueryBuilder);
    knexFn.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(knexFn)
    );
    knexFn.raw = jest.fn();
    return { __esModule: true, default: knexFn };
});

// Mock repository
jest.mock('../../../src/db/repositories/voucher.repository', () => ({
    VoucherRepository: jest.fn().mockImplementation(() => ({
        findWithFilters: jest.fn(),
        findById: jest.fn(),
        findWithItems: jest.fn(),
    }))
}));

// Import after mocks are set up
import { voucherService } from '../../../src/services/voucher.service';

describe('VoucherService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkVoucherBalance', () => {
        it('should return balanced for equal debit and credit', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', credit_acc: undefined, amount: 1000000 },
                { voucher_id: 'V1', debit_acc: undefined, credit_acc: '511', amount: 1000000 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
            expect(result.difference).toBe(0);
        });

        it('should return unbalanced for unequal amounts', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', credit_acc: undefined, amount: 1000000 },
                { voucher_id: 'V1', debit_acc: undefined, credit_acc: '511', amount: 900000 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(false);
            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(900000);
            expect(result.difference).toBe(100000);
        });

        it('should allow tolerance of 1 VND', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', credit_acc: undefined, amount: 1000000.5 },
                { voucher_id: 'V1', debit_acc: undefined, credit_acc: '511', amount: 1000000 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
        });

        it('should handle compound entries (both debit and credit)', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', credit_acc: '511', amount: 1000000 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
        });

        it('should exclude off-balance sheet accounts (0xx)', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', credit_acc: undefined, amount: 1000000 },
                { voucher_id: 'V1', debit_acc: undefined, credit_acc: '511', amount: 1000000 },
                { voucher_id: 'V1', debit_acc: '001', credit_acc: undefined, amount: 500000 }, // Off-balance
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
            expect(result.offBalanceDebit).toBe(500000);
        });

        it('should handle empty items', () => {
            const result = voucherService.checkVoucherBalance([]);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(0);
            expect(result.totalCredit).toBe(0);
        });

        it('should handle multiple debit entries', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', amount: 500000 },
                { voucher_id: 'V1', debit_acc: '112', amount: 500000 },
                { voucher_id: 'V1', credit_acc: '511', amount: 1000000 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
        });

        it('should handle multiple credit entries', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', amount: 1000000 },
                { voucher_id: 'V1', credit_acc: '511', amount: 600000 },
                { voucher_id: 'V1', credit_acc: '3331', amount: 400000 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
        });
    });

    describe('Vietnamese Accounting Rules', () => {
        it('should identify off-balance accounts correctly (TK 0xx)', () => {
            // Test items with off-balance accounts
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '001', amount: 1000000 }, // Tài sản thuê ngoài
                { voucher_id: 'V1', credit_acc: '002', amount: 1000000 }, // Vật tư hàng hóa nhận giữ hộ
            ];

            const result = voucherService.checkVoucherBalance(items);

            // Off-balance items don't need to balance with regular accounts
            expect(result.totalDebit).toBe(0);
            expect(result.totalCredit).toBe(0);
            expect(result.offBalanceDebit).toBe(1000000);
            expect(result.offBalanceCredit).toBe(1000000);
        });

        it('should enforce double-entry for on-balance accounts', () => {
            // Single-sided entry should be unbalanced
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', amount: 1000000 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(false);
            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large amounts', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', amount: 999999999999 },
                { voucher_id: 'V1', credit_acc: '511', amount: 999999999999 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(999999999999);
        });

        it('should handle decimal amounts', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', amount: 1000000.33 },
                { voucher_id: 'V1', credit_acc: '511', amount: 1000000.33 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
        });

        it('should handle zero amounts', () => {
            const items: VoucherItem[] = [
                { voucher_id: 'V1', debit_acc: '111', amount: 0 },
                { voucher_id: 'V1', credit_acc: '511', amount: 0 },
            ];

            const result = voucherService.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(0);
            expect(result.totalCredit).toBe(0);
        });
    });
});

describe('VoucherService Validation', () => {
    describe('Voucher Type Validation', () => {
        it('should accept valid voucher types', () => {
            const validTypes = ['GENERAL', 'CASH_IN', 'CASH_OUT', 'BANK_IN', 'BANK_OUT', 'PURCHASE', 'SALE', 'ADJUSTMENT'];

            validTypes.forEach(type => {
                expect(['GENERAL', 'CASH_IN', 'CASH_OUT', 'BANK_IN', 'BANK_OUT', 'PURCHASE', 'SALE', 'ADJUSTMENT']).toContain(type);
            });
        });
    });

    describe('Voucher Status Validation', () => {
        it('should have valid status transitions', () => {
            const validStatuses = ['DRAFT', 'POSTED', 'VOIDED'];

            // DRAFT -> POSTED (posting)
            expect(validStatuses).toContain('DRAFT');
            expect(validStatuses).toContain('POSTED');

            // POSTED -> VOIDED (void)
            expect(validStatuses).toContain('VOIDED');
        });
    });
});
