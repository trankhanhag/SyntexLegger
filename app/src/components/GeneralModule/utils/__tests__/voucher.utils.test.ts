import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    formatNumber,
    calculateVoucherTotals,
    isVoucherBalanced,
    generateDocNo,
    getVoucherTypePrefix,
    getVoucherTypeName,
    isDateLocked,
    formatDateVN,
    validateVoucher,
    prepareVoucherForDuplicate
} from '../voucher.utils';
import type { Voucher, VoucherLine } from '../../types/voucher.types';

describe('voucher.utils', () => {
    describe('formatCurrency', () => {
        it('formats VND amounts correctly', () => {
            // Locale có thể cho ra định dạng khác nhau
            expect(formatCurrency(1000000)).toMatch(/1[.,]000[.,]000/);
            expect(formatCurrency(0)).toMatch(/0/);
            expect(formatCurrency(123456789)).toMatch(/123[.,]456[.,]789/);
        });

        it('formats USD amounts correctly', () => {
            const result = formatCurrency(1234.56, 'USD');
            expect(result).toContain('1.234,56');
        });
    });

    describe('formatNumber', () => {
        it('formats numbers with thousand separators', () => {
            expect(formatNumber(1000000)).toBe('1.000.000');
            expect(formatNumber(1234.567, 2)).toBe('1.234,57');
        });
    });

    describe('calculateVoucherTotals', () => {
        it('calculates totals correctly', () => {
            const lines: VoucherLine[] = [
                { description: 'Line 1', debitAcc: '111', creditAcc: '', amount: 1000 },
                { description: 'Line 2', debitAcc: '', creditAcc: '331', amount: 1000 },
            ];
            const result = calculateVoucherTotals(lines);
            expect(result.totalDebit).toBe(1000);
            expect(result.totalCredit).toBe(1000);
            expect(result.balance).toBe(0);
        });

        it('handles empty lines array', () => {
            const result = calculateVoucherTotals([]);
            expect(result.totalDebit).toBe(0);
            expect(result.totalCredit).toBe(0);
            expect(result.balance).toBe(0);
        });
    });

    describe('isVoucherBalanced', () => {
        it('returns true for balanced voucher', () => {
            const voucher: Voucher = {
                doc_no: 'PC-001',
                doc_date: '2024-01-01',
                post_date: '2024-01-01',
                description: 'Test',
                type: 'GENERAL',
                total_amount: 1000,
                lines: [
                    { description: 'L1', debitAcc: '111', creditAcc: '', amount: 1000 },
                    { description: 'L2', debitAcc: '', creditAcc: '331', amount: 1000 },
                ]
            };
            expect(isVoucherBalanced(voucher)).toBe(true);
        });

        it('returns false for unbalanced voucher', () => {
            const voucher: Voucher = {
                doc_no: 'PC-001',
                doc_date: '2024-01-01',
                post_date: '2024-01-01',
                description: 'Test',
                type: 'GENERAL',
                total_amount: 1000,
                lines: [
                    { description: 'L1', debitAcc: '111', creditAcc: '', amount: 1000 },
                    { description: 'L2', debitAcc: '', creditAcc: '331', amount: 500 },
                ]
            };
            expect(isVoucherBalanced(voucher)).toBe(false);
        });
    });

    describe('generateDocNo', () => {
        it('generates doc number with correct prefix', () => {
            const docNo = generateDocNo('CASH_IN');
            expect(docNo).toMatch(/^PT-\d{6}-\d{4}$/);
        });

        it('uses current date by default', () => {
            const docNo = generateDocNo('GENERAL');
            const now = new Date();
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
            expect(docNo).toContain(yearMonth);
        });
    });

    describe('getVoucherTypePrefix', () => {
        it('returns correct prefixes', () => {
            expect(getVoucherTypePrefix('CASH_IN')).toBe('PT');
            expect(getVoucherTypePrefix('CASH_OUT')).toBe('PC');
            expect(getVoucherTypePrefix('BANK_IN')).toBe('BC');
            expect(getVoucherTypePrefix('UNKNOWN')).toBe('CT');
        });
    });

    describe('getVoucherTypeName', () => {
        it('returns correct names', () => {
            expect(getVoucherTypeName('CASH_IN')).toBe('Phiếu thu tiền mặt');
            expect(getVoucherTypeName('CLOSING')).toBe('Bút toán kết chuyển');
            expect(getVoucherTypeName('UNKNOWN')).toBe('Chứng từ');
        });
    });

    describe('isDateLocked', () => {
        it('returns true for dates before lock date', () => {
            expect(isDateLocked('2024-01-15', '2024-01-31')).toBe(true);
        });

        it('returns false for dates after lock date', () => {
            expect(isDateLocked('2024-02-15', '2024-01-31')).toBe(false);
        });

        it('returns false when no lock date', () => {
            expect(isDateLocked('2024-01-15')).toBe(false);
        });
    });

    describe('formatDateVN', () => {
        it('formats date string correctly', () => {
            const result = formatDateVN('2024-01-15');
            expect(result).toBe('15/01/2024');
        });
    });

    describe('validateVoucher', () => {
        const validVoucher: Voucher = {
            doc_no: 'PC-001',
            doc_date: '2024-01-01',
            post_date: '2024-01-01',
            description: 'Test voucher',
            type: 'GENERAL',
            total_amount: 1000,
            lines: [
                { description: 'L1', debitAcc: '111', creditAcc: '', amount: 1000 },
                { description: 'L2', debitAcc: '', creditAcc: '331', amount: 1000 },
            ]
        };

        it('returns no errors for valid voucher', () => {
            expect(validateVoucher(validVoucher)).toEqual([]);
        });

        it('returns errors for missing doc_no', () => {
            const invalid = { ...validVoucher, doc_no: '' };
            expect(validateVoucher(invalid)).toContain('Số chứng từ không được để trống');
        });

        it('returns errors for locked date', () => {
            const errors = validateVoucher(validVoucher, '2024-01-31');
            expect(errors.some(e => e.includes('khóa kỳ'))).toBe(true);
        });

        it('returns errors for unbalanced voucher', () => {
            const unbalanced = {
                ...validVoucher,
                lines: [{ description: 'L1', debitAcc: '111', creditAcc: '', amount: 1000 }]
            };
            const errors = validateVoucher(unbalanced);
            expect(errors.some(e => e.includes('Chênh lệch'))).toBe(true);
        });
    });

    describe('prepareVoucherForDuplicate', () => {
        it('removes IDs and updates dates', () => {
            const original: Voucher = {
                id: 'old-id',
                doc_no: 'PC-001',
                doc_date: '2024-01-01',
                post_date: '2024-01-01',
                description: 'Test',
                type: 'GENERAL',
                total_amount: 1000,
                lines: [{ id: 'line-id', description: 'L1', debitAcc: '111', creditAcc: '331', amount: 1000 }],
                status: 'posted'
            };
            const duplicated = prepareVoucherForDuplicate(original);

            expect(duplicated.id).toBeUndefined();
            expect(duplicated.lines[0].id).toBeUndefined();
            expect(duplicated.status).toBe('draft');
            expect(duplicated.doc_no).not.toBe(original.doc_no);
        });
    });
});
