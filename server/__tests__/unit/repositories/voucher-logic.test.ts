/**
 * Unit Tests for Voucher Business Logic
 * Tests voucher validation and calculation functions
 */

import { describe, it, expect } from '@jest/globals';

// ============================================
// VOUCHER TYPES AND INTERFACES
// ============================================

interface VoucherItem {
    debit_acc?: string;
    credit_acc?: string;
    amount: number;
    description?: string;
    partner_code?: string;
}

interface Voucher {
    id?: string;
    doc_no: string;
    doc_date: string;
    type: string;
    status: string;
    description?: string;
    items: VoucherItem[];
}

// ============================================
// VOUCHER VALIDATION FUNCTIONS
// ============================================

/**
 * Calculate voucher totals
 */
function calculateVoucherTotals(items: VoucherItem[]): {
    totalDebit: number;
    totalCredit: number;
    balance: number;
} {
    let totalDebit = 0;
    let totalCredit = 0;

    items.forEach(item => {
        if (item.debit_acc && item.amount > 0) {
            totalDebit += item.amount;
        }
        if (item.credit_acc && item.amount > 0) {
            totalCredit += item.amount;
        }
    });

    return {
        totalDebit,
        totalCredit,
        balance: totalDebit - totalCredit,
    };
}

/**
 * Check if voucher is balanced
 */
function isVoucherBalanced(items: VoucherItem[], tolerance = 0.01): boolean {
    const { balance } = calculateVoucherTotals(items);
    return Math.abs(balance) <= tolerance;
}

/**
 * Validate voucher items
 */
function validateVoucherItems(items: VoucherItem[]): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (items.length === 0) {
        errors.push('Chứng từ phải có ít nhất 1 dòng định khoản');
        return { valid: false, errors };
    }

    items.forEach((item, index) => {
        const lineNo = index + 1;

        // At least one account must be specified
        if (!item.debit_acc && !item.credit_acc) {
            errors.push(`Dòng ${lineNo}: Phải chọn tài khoản Nợ hoặc Có`);
        }

        // Amount must be positive
        if (item.amount <= 0) {
            errors.push(`Dòng ${lineNo}: Số tiền phải lớn hơn 0`);
        }
    });

    return { valid: errors.length === 0, errors };
}

/**
 * Validate voucher for posting
 */
function validateVoucherForPosting(voucher: Voucher): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Basic validation
    if (!voucher.doc_no) {
        errors.push('Số chứng từ không được để trống');
    }

    if (!voucher.doc_date) {
        errors.push('Ngày chứng từ không được để trống');
    }

    // Status check
    if (voucher.status === 'POSTED') {
        errors.push('Chứng từ đã được ghi sổ');
    }

    if (voucher.status === 'VOIDED') {
        errors.push('Không thể ghi sổ chứng từ đã hủy');
    }

    // Items validation
    const itemsValidation = validateVoucherItems(voucher.items);
    errors.push(...itemsValidation.errors);

    // Balance check
    if (!isVoucherBalanced(voucher.items)) {
        const { totalDebit, totalCredit } = calculateVoucherTotals(voucher.items);
        errors.push(`Chứng từ không cân: Nợ ${totalDebit}, Có ${totalCredit}`);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Generate doc number
 */
function generateDocNo(type: string, sequence: number, year?: number): string {
    const currentYear = year || new Date().getFullYear();
    const prefix = getVoucherPrefix(type);
    const seqStr = String(sequence).padStart(5, '0');
    return `${prefix}${currentYear}${seqStr}`;
}

/**
 * Get voucher prefix
 */
function getVoucherPrefix(type: string): string {
    const prefixes: Record<string, string> = {
        'CASH_IN': 'PT',
        'CASH_OUT': 'PC',
        'BANK_IN': 'BC',
        'BANK_OUT': 'BX',
        'GENERAL': 'CT',
        'PURCHASE': 'PM',
        'SALE': 'HB',
    };
    return prefixes[type] || 'CT';
}

/**
 * Check if date is in locked period
 */
function isDateLocked(docDate: string, lockDate?: string): boolean {
    if (!lockDate) return false;
    return new Date(docDate) <= new Date(lockDate);
}

/**
 * Create GL entries from voucher items
 */
function createGLEntries(voucher: Voucher): Array<{
    account_code: string;
    debit_amount: number;
    credit_amount: number;
    description: string;
}> {
    const entries: Array<{
        account_code: string;
        debit_amount: number;
        credit_amount: number;
        description: string;
    }> = [];

    voucher.items.forEach(item => {
        if (item.debit_acc && item.amount > 0) {
            entries.push({
                account_code: item.debit_acc,
                debit_amount: item.amount,
                credit_amount: 0,
                description: item.description || voucher.description || '',
            });
        }

        if (item.credit_acc && item.amount > 0) {
            entries.push({
                account_code: item.credit_acc,
                debit_amount: 0,
                credit_amount: item.amount,
                description: item.description || voucher.description || '',
            });
        }
    });

    return entries;
}

// ============================================
// TESTS
// ============================================

describe('Voucher Calculation Functions', () => {
    describe('calculateVoucherTotals', () => {
        it('should calculate correct totals for balanced voucher', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 1000000 },
            ];

            const result = calculateVoucherTotals(items);

            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
            expect(result.balance).toBe(0);
        });

        it('should calculate correct totals for unbalanced voucher', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 800000 },
            ];

            const result = calculateVoucherTotals(items);

            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(800000);
            expect(result.balance).toBe(200000);
        });

        it('should handle multiple debit entries', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 500000 },
                { debit_acc: '112', amount: 500000 },
                { credit_acc: '331', amount: 1000000 },
            ];

            const result = calculateVoucherTotals(items);

            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
            expect(result.balance).toBe(0);
        });

        it('should handle multiple credit entries', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 600000 },
                { credit_acc: '3331', amount: 400000 },
            ];

            const result = calculateVoucherTotals(items);

            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
            expect(result.balance).toBe(0);
        });

        it('should handle compound entries (both debit and credit)', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', credit_acc: '331', amount: 1000000 },
            ];

            const result = calculateVoucherTotals(items);

            expect(result.totalDebit).toBe(1000000);
            expect(result.totalCredit).toBe(1000000);
            expect(result.balance).toBe(0);
        });

        it('should handle empty items', () => {
            const result = calculateVoucherTotals([]);

            expect(result.totalDebit).toBe(0);
            expect(result.totalCredit).toBe(0);
            expect(result.balance).toBe(0);
        });

        it('should ignore zero amounts', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 0 },
                { credit_acc: '331', amount: 0 },
            ];

            const result = calculateVoucherTotals(items);

            expect(result.totalDebit).toBe(0);
            expect(result.totalCredit).toBe(0);
        });
    });

    describe('isVoucherBalanced', () => {
        it('should return true for perfectly balanced voucher', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 1000000 },
            ];

            expect(isVoucherBalanced(items)).toBe(true);
        });

        it('should return true within tolerance', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 999999.995 },
            ];

            expect(isVoucherBalanced(items, 0.01)).toBe(true);
        });

        it('should return false for unbalanced voucher', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 900000 },
            ];

            expect(isVoucherBalanced(items)).toBe(false);
        });

        it('should return true for empty voucher', () => {
            expect(isVoucherBalanced([])).toBe(true);
        });
    });
});

describe('Voucher Validation Functions', () => {
    describe('validateVoucherItems', () => {
        it('should validate correct items', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 1000000 },
            ];

            const result = validateVoucherItems(items);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty items', () => {
            const result = validateVoucherItems([]);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Chứng từ phải có ít nhất 1 dòng định khoản');
        });

        it('should reject items without account', () => {
            const items: VoucherItem[] = [
                { amount: 1000000 },
            ];

            const result = validateVoucherItems(items);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Phải chọn tài khoản'))).toBe(true);
        });

        it('should reject zero or negative amounts', () => {
            const items: VoucherItem[] = [
                { debit_acc: '111', amount: 0 },
            ];

            const result = validateVoucherItems(items);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('phải lớn hơn 0'))).toBe(true);
        });

        it('should return multiple errors', () => {
            const items: VoucherItem[] = [
                { amount: 0 },
                { debit_acc: '111', amount: -100 },
            ];

            const result = validateVoucherItems(items);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('validateVoucherForPosting', () => {
        const validVoucher: Voucher = {
            doc_no: 'PC-2024-001',
            doc_date: '2024-01-15',
            type: 'CASH_OUT',
            status: 'DRAFT',
            items: [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '331', amount: 1000000 },
            ],
        };

        it('should validate correct voucher', () => {
            const result = validateVoucherForPosting(validVoucher);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty doc_no', () => {
            const voucher = { ...validVoucher, doc_no: '' };
            const result = validateVoucherForPosting(voucher);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Số chứng từ không được để trống');
        });

        it('should reject empty doc_date', () => {
            const voucher = { ...validVoucher, doc_date: '' };
            const result = validateVoucherForPosting(voucher);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Ngày chứng từ không được để trống');
        });

        it('should reject already posted voucher', () => {
            const voucher = { ...validVoucher, status: 'POSTED' };
            const result = validateVoucherForPosting(voucher);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Chứng từ đã được ghi sổ');
        });

        it('should reject voided voucher', () => {
            const voucher = { ...validVoucher, status: 'VOIDED' };
            const result = validateVoucherForPosting(voucher);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Không thể ghi sổ chứng từ đã hủy');
        });

        it('should reject unbalanced voucher', () => {
            const voucher: Voucher = {
                ...validVoucher,
                items: [
                    { debit_acc: '111', amount: 1000000 },
                    { credit_acc: '331', amount: 800000 },
                ],
            };
            const result = validateVoucherForPosting(voucher);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('không cân'))).toBe(true);
        });
    });
});

describe('Voucher Utility Functions', () => {
    describe('generateDocNo', () => {
        it('should generate correct doc number', () => {
            expect(generateDocNo('CASH_OUT', 1, 2024)).toBe('PC202400001');
            expect(generateDocNo('CASH_IN', 123, 2024)).toBe('PT202400123');
            expect(generateDocNo('GENERAL', 9999, 2024)).toBe('CT202409999');
        });

        it('should use current year if not specified', () => {
            const currentYear = new Date().getFullYear();
            const docNo = generateDocNo('SALE', 1);
            expect(docNo).toContain(String(currentYear));
        });
    });

    describe('getVoucherPrefix', () => {
        it('should return correct prefixes', () => {
            expect(getVoucherPrefix('CASH_IN')).toBe('PT');
            expect(getVoucherPrefix('CASH_OUT')).toBe('PC');
            expect(getVoucherPrefix('BANK_IN')).toBe('BC');
            expect(getVoucherPrefix('BANK_OUT')).toBe('BX');
            expect(getVoucherPrefix('GENERAL')).toBe('CT');
            expect(getVoucherPrefix('PURCHASE')).toBe('PM');
            expect(getVoucherPrefix('SALE')).toBe('HB');
        });

        it('should return default prefix for unknown type', () => {
            expect(getVoucherPrefix('UNKNOWN')).toBe('CT');
        });
    });

    describe('isDateLocked', () => {
        it('should return true for dates before lock date', () => {
            expect(isDateLocked('2024-01-15', '2024-01-31')).toBe(true);
            expect(isDateLocked('2024-01-31', '2024-01-31')).toBe(true);
        });

        it('should return false for dates after lock date', () => {
            expect(isDateLocked('2024-02-01', '2024-01-31')).toBe(false);
        });

        it('should return false when no lock date', () => {
            expect(isDateLocked('2024-01-15')).toBe(false);
            expect(isDateLocked('2024-01-15', undefined)).toBe(false);
        });
    });

    describe('createGLEntries', () => {
        it('should create separate debit and credit entries', () => {
            const voucher: Voucher = {
                doc_no: 'PC-001',
                doc_date: '2024-01-15',
                type: 'CASH_OUT',
                status: 'DRAFT',
                description: 'Payment',
                items: [
                    { debit_acc: '331', amount: 1000000, description: 'Pay supplier' },
                    { credit_acc: '111', amount: 1000000 },
                ],
            };

            const entries = createGLEntries(voucher);

            expect(entries).toHaveLength(2);
            expect(entries[0]).toEqual({
                account_code: '331',
                debit_amount: 1000000,
                credit_amount: 0,
                description: 'Pay supplier',
            });
            expect(entries[1]).toEqual({
                account_code: '111',
                debit_amount: 0,
                credit_amount: 1000000,
                description: 'Payment',
            });
        });

        it('should create entries for compound items', () => {
            const voucher: Voucher = {
                doc_no: 'CT-001',
                doc_date: '2024-01-15',
                type: 'GENERAL',
                status: 'DRAFT',
                items: [
                    { debit_acc: '111', credit_acc: '131', amount: 500000, description: 'Receive cash from customer' },
                ],
            };

            const entries = createGLEntries(voucher);

            expect(entries).toHaveLength(2);
            expect(entries[0].account_code).toBe('111');
            expect(entries[0].debit_amount).toBe(500000);
            expect(entries[1].account_code).toBe('131');
            expect(entries[1].credit_amount).toBe(500000);
        });

        it('should handle empty items', () => {
            const voucher: Voucher = {
                doc_no: 'CT-001',
                doc_date: '2024-01-15',
                type: 'GENERAL',
                status: 'DRAFT',
                items: [],
            };

            const entries = createGLEntries(voucher);

            expect(entries).toHaveLength(0);
        });
    });
});

describe('Vietnamese Accounting Rules', () => {
    describe('Double-entry Bookkeeping', () => {
        it('should always have balanced entries', () => {
            // Standard payment: Dr 331 Payable, Cr 111 Cash
            const paymentItems: VoucherItem[] = [
                { debit_acc: '331', amount: 1000000 },
                { credit_acc: '111', amount: 1000000 },
            ];
            expect(isVoucherBalanced(paymentItems)).toBe(true);

            // Standard receipt: Dr 111 Cash, Cr 131 Receivable
            const receiptItems: VoucherItem[] = [
                { debit_acc: '111', amount: 2000000 },
                { credit_acc: '131', amount: 2000000 },
            ];
            expect(isVoucherBalanced(receiptItems)).toBe(true);

            // Sale with VAT: Dr 131, Cr 511 + Cr 3331
            const saleItems: VoucherItem[] = [
                { debit_acc: '131', amount: 11000000 },
                { credit_acc: '511', amount: 10000000 },
                { credit_acc: '3331', amount: 1000000 },
            ];
            expect(isVoucherBalanced(saleItems)).toBe(true);
        });

        it('should reject single-sided entries', () => {
            const singleSided: VoucherItem[] = [
                { debit_acc: '111', amount: 1000000 },
            ];
            expect(isVoucherBalanced(singleSided)).toBe(false);
        });
    });
});
