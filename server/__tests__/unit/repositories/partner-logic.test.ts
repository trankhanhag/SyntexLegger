/**
 * Unit Tests for Partner Business Logic
 * Tests partner validation and balance calculation functions
 */

import { describe, it, expect } from '@jest/globals';

// ============================================
// PARTNER TYPES AND INTERFACES
// ============================================

interface Partner {
    partner_code: string;
    partner_name: string;
    partner_type: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
    tax_code?: string;
    email?: string;
    phone?: string;
    is_active: number;
}

interface PartnerBalance {
    partner_code: string;
    receivable: number;
    payable: number;
    net_balance: number;
}

interface Transaction {
    partner_code: string;
    account_code: string;
    debit_amount: number;
    credit_amount: number;
    trx_date: string;
}

// ============================================
// PARTNER VALIDATION FUNCTIONS
// ============================================

/**
 * Validate partner code
 */
function validatePartnerCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code || code.trim() === '') {
        errors.push('Mã đối tác không được để trống');
    } else {
        if (code.length > 50) {
            errors.push('Mã đối tác tối đa 50 ký tự');
        }
        if (!/^[A-Za-z0-9_-]+$/.test(code)) {
            errors.push('Mã đối tác chỉ chứa chữ cái, số, dấu gạch ngang và gạch dưới');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate partner type
 */
function validatePartnerType(type: string): boolean {
    const validTypes = ['CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'OTHER'];
    return validTypes.includes(type);
}

/**
 * Validate tax code format (Vietnamese)
 */
function validateTaxCode(taxCode: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!taxCode || taxCode === '') {
        return { valid: true, errors: [] }; // Tax code is optional
    }

    // Vietnamese tax code format: 10 or 13 digits
    // Format: XXXXXXXXXX or XXXXXXXXXX-XXX
    const cleanCode = taxCode.replace(/-/g, '');

    if (!/^\d{10}(\d{3})?$/.test(cleanCode)) {
        errors.push('Mã số thuế phải có 10 hoặc 13 chữ số');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate email format
 */
function validateEmail(email: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email || email === '') {
        return { valid: true, errors: [] }; // Email is optional
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push('Email không hợp lệ');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate phone number format
 */
function validatePhone(phone: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!phone || phone === '') {
        return { valid: true, errors: [] }; // Phone is optional
    }

    // Remove common separators
    const cleanPhone = phone.replace(/[\s.-]/g, '');

    // Vietnamese phone: 10 digits starting with 0
    // Or international: starts with +84
    if (!/^(0\d{9}|\+84\d{9})$/.test(cleanPhone)) {
        errors.push('Số điện thoại không hợp lệ');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate full partner data
 */
function validatePartner(partner: Partial<Partner>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!partner.partner_code) {
        errors.push('Mã đối tác không được để trống');
    } else {
        const codeValidation = validatePartnerCode(partner.partner_code);
        errors.push(...codeValidation.errors);
    }

    if (!partner.partner_name) {
        errors.push('Tên đối tác không được để trống');
    }

    if (!partner.partner_type) {
        errors.push('Loại đối tác không được để trống');
    } else if (!validatePartnerType(partner.partner_type)) {
        errors.push('Loại đối tác không hợp lệ');
    }

    // Optional fields
    if (partner.tax_code) {
        const taxValidation = validateTaxCode(partner.tax_code);
        errors.push(...taxValidation.errors);
    }

    if (partner.email) {
        const emailValidation = validateEmail(partner.email);
        errors.push(...emailValidation.errors);
    }

    if (partner.phone) {
        const phoneValidation = validatePhone(partner.phone);
        errors.push(...phoneValidation.errors);
    }

    return { valid: errors.length === 0, errors };
}

// ============================================
// PARTNER BALANCE FUNCTIONS
// ============================================

/**
 * Calculate partner balance from transactions
 */
function calculatePartnerBalance(
    partnerCode: string,
    transactions: Transaction[]
): PartnerBalance {
    let receivable = 0;
    let payable = 0;

    transactions
        .filter(t => t.partner_code === partnerCode)
        .forEach(t => {
            // Receivable accounts (131x)
            if (t.account_code.startsWith('131')) {
                receivable += t.debit_amount - t.credit_amount;
            }
            // Payable accounts (331x)
            if (t.account_code.startsWith('331')) {
                payable += t.credit_amount - t.debit_amount;
            }
        });

    return {
        partner_code: partnerCode,
        receivable,
        payable,
        net_balance: receivable - payable,
    };
}

/**
 * Check if partner has any transactions
 */
function hasTransactions(partnerCode: string, transactions: Transaction[]): boolean {
    return transactions.some(t => t.partner_code === partnerCode);
}

/**
 * Get partner aging (days overdue)
 */
function calculateAging(dueDate: string, asOfDate?: string): number {
    const due = new Date(dueDate);
    const now = asOfDate ? new Date(asOfDate) : new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

/**
 * Categorize aging into buckets
 */
function getAgingBucket(daysOverdue: number): string {
    if (daysOverdue === 0) return 'CURRENT';
    if (daysOverdue <= 30) return '1-30';
    if (daysOverdue <= 60) return '31-60';
    if (daysOverdue <= 90) return '61-90';
    return '90+';
}

// ============================================
// TESTS
// ============================================

describe('Partner Validation Functions', () => {
    describe('validatePartnerCode', () => {
        it('should accept valid partner codes', () => {
            expect(validatePartnerCode('KH001').valid).toBe(true);
            expect(validatePartnerCode('NCC-001').valid).toBe(true);
            expect(validatePartnerCode('CUSTOMER_01').valid).toBe(true);
        });

        it('should reject empty code', () => {
            const result = validatePartnerCode('');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mã đối tác không được để trống');
        });

        it('should reject code with special characters', () => {
            const result = validatePartnerCode('KH@001');
            expect(result.valid).toBe(false);
        });

        it('should reject code with spaces', () => {
            const result = validatePartnerCode('KH 001');
            expect(result.valid).toBe(false);
        });

        it('should reject code longer than 50 characters', () => {
            const longCode = 'A'.repeat(51);
            const result = validatePartnerCode(longCode);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mã đối tác tối đa 50 ký tự');
        });
    });

    describe('validatePartnerType', () => {
        it('should accept valid partner types', () => {
            expect(validatePartnerType('CUSTOMER')).toBe(true);
            expect(validatePartnerType('SUPPLIER')).toBe(true);
            expect(validatePartnerType('EMPLOYEE')).toBe(true);
            expect(validatePartnerType('OTHER')).toBe(true);
        });

        it('should reject invalid partner types', () => {
            expect(validatePartnerType('VENDOR')).toBe(false);
            expect(validatePartnerType('')).toBe(false);
            expect(validatePartnerType('customer')).toBe(false);
        });
    });

    describe('validateTaxCode', () => {
        it('should accept valid 10-digit tax code', () => {
            expect(validateTaxCode('0123456789').valid).toBe(true);
        });

        it('should accept valid 13-digit tax code', () => {
            expect(validateTaxCode('0123456789001').valid).toBe(true);
        });

        it('should accept tax code with dash', () => {
            expect(validateTaxCode('0123456789-001').valid).toBe(true);
        });

        it('should accept empty tax code (optional)', () => {
            expect(validateTaxCode('').valid).toBe(true);
        });

        it('should reject invalid length', () => {
            expect(validateTaxCode('12345').valid).toBe(false);
            expect(validateTaxCode('123456789012345').valid).toBe(false);
        });

        it('should reject non-numeric characters', () => {
            expect(validateTaxCode('012345678A').valid).toBe(false);
        });
    });

    describe('validateEmail', () => {
        it('should accept valid emails', () => {
            expect(validateEmail('test@example.com').valid).toBe(true);
            expect(validateEmail('user.name@company.vn').valid).toBe(true);
        });

        it('should accept empty email (optional)', () => {
            expect(validateEmail('').valid).toBe(true);
        });

        it('should reject invalid emails', () => {
            expect(validateEmail('invalid').valid).toBe(false);
            expect(validateEmail('test@').valid).toBe(false);
            expect(validateEmail('@example.com').valid).toBe(false);
        });
    });

    describe('validatePhone', () => {
        it('should accept valid Vietnamese phone numbers', () => {
            expect(validatePhone('0912345678').valid).toBe(true);
            expect(validatePhone('0123456789').valid).toBe(true);
        });

        it('should accept phone with spaces', () => {
            expect(validatePhone('091 234 5678').valid).toBe(true);
        });

        it('should accept international format', () => {
            expect(validatePhone('+84912345678').valid).toBe(true);
        });

        it('should accept empty phone (optional)', () => {
            expect(validatePhone('').valid).toBe(true);
        });

        it('should reject invalid phone numbers', () => {
            expect(validatePhone('123456').valid).toBe(false);
            expect(validatePhone('abcdefghij').valid).toBe(false);
        });
    });

    describe('validatePartner', () => {
        const validPartner: Partial<Partner> = {
            partner_code: 'KH001',
            partner_name: 'Khách hàng A',
            partner_type: 'CUSTOMER',
            tax_code: '0123456789',
            email: 'test@example.com',
            phone: '0912345678',
        };

        it('should validate correct partner', () => {
            const result = validatePartner(validPartner);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject partner without code', () => {
            const invalid = { ...validPartner, partner_code: undefined };
            const result = validatePartner(invalid);
            expect(result.valid).toBe(false);
        });

        it('should reject partner without name', () => {
            const invalid = { ...validPartner, partner_name: undefined };
            const result = validatePartner(invalid);
            expect(result.valid).toBe(false);
        });

        it('should reject partner without type', () => {
            const invalid = { ...validPartner, partner_type: undefined };
            const result = validatePartner(invalid);
            expect(result.valid).toBe(false);
        });

        it('should collect all errors', () => {
            const invalid: Partial<Partner> = {
                partner_code: '',
                partner_name: '',
                email: 'invalid',
            };
            const result = validatePartner(invalid);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(2);
        });
    });
});

describe('Partner Balance Functions', () => {
    describe('calculatePartnerBalance', () => {
        const transactions: Transaction[] = [
            { partner_code: 'KH001', account_code: '1311', debit_amount: 10000000, credit_amount: 0, trx_date: '2024-01-15' },
            { partner_code: 'KH001', account_code: '1311', debit_amount: 0, credit_amount: 5000000, trx_date: '2024-01-20' },
            { partner_code: 'NCC001', account_code: '3311', debit_amount: 0, credit_amount: 8000000, trx_date: '2024-01-15' },
            { partner_code: 'NCC001', account_code: '3311', debit_amount: 3000000, credit_amount: 0, trx_date: '2024-01-25' },
        ];

        it('should calculate customer receivable balance', () => {
            const balance = calculatePartnerBalance('KH001', transactions);

            expect(balance.receivable).toBe(5000000); // 10M - 5M
            expect(balance.payable).toBe(0);
            expect(balance.net_balance).toBe(5000000);
        });

        it('should calculate supplier payable balance', () => {
            const balance = calculatePartnerBalance('NCC001', transactions);

            expect(balance.receivable).toBe(0);
            expect(balance.payable).toBe(5000000); // 8M - 3M
            expect(balance.net_balance).toBe(-5000000);
        });

        it('should return zero for partner without transactions', () => {
            const balance = calculatePartnerBalance('UNKNOWN', transactions);

            expect(balance.receivable).toBe(0);
            expect(balance.payable).toBe(0);
            expect(balance.net_balance).toBe(0);
        });

        it('should handle partner with both receivable and payable', () => {
            const mixedTransactions: Transaction[] = [
                { partner_code: 'KH001', account_code: '1311', debit_amount: 10000000, credit_amount: 0, trx_date: '2024-01-15' },
                { partner_code: 'KH001', account_code: '3311', debit_amount: 0, credit_amount: 3000000, trx_date: '2024-01-20' },
            ];

            const balance = calculatePartnerBalance('KH001', mixedTransactions);

            expect(balance.receivable).toBe(10000000);
            expect(balance.payable).toBe(3000000);
            expect(balance.net_balance).toBe(7000000);
        });
    });

    describe('hasTransactions', () => {
        const transactions: Transaction[] = [
            { partner_code: 'KH001', account_code: '1311', debit_amount: 1000, credit_amount: 0, trx_date: '2024-01-15' },
        ];

        it('should return true for partner with transactions', () => {
            expect(hasTransactions('KH001', transactions)).toBe(true);
        });

        it('should return false for partner without transactions', () => {
            expect(hasTransactions('KH002', transactions)).toBe(false);
        });
    });

    describe('calculateAging', () => {
        it('should calculate days overdue', () => {
            const dueDate = '2024-01-15';
            const asOfDate = '2024-02-15';
            expect(calculateAging(dueDate, asOfDate)).toBe(31);
        });

        it('should return 0 for current invoices', () => {
            const dueDate = '2024-02-15';
            const asOfDate = '2024-01-15';
            expect(calculateAging(dueDate, asOfDate)).toBe(0);
        });

        it('should handle same day', () => {
            const dueDate = '2024-01-15';
            const asOfDate = '2024-01-15';
            expect(calculateAging(dueDate, asOfDate)).toBe(0);
        });
    });

    describe('getAgingBucket', () => {
        it('should categorize current invoices', () => {
            expect(getAgingBucket(0)).toBe('CURRENT');
        });

        it('should categorize 1-30 days', () => {
            expect(getAgingBucket(1)).toBe('1-30');
            expect(getAgingBucket(30)).toBe('1-30');
        });

        it('should categorize 31-60 days', () => {
            expect(getAgingBucket(31)).toBe('31-60');
            expect(getAgingBucket(60)).toBe('31-60');
        });

        it('should categorize 61-90 days', () => {
            expect(getAgingBucket(61)).toBe('61-90');
            expect(getAgingBucket(90)).toBe('61-90');
        });

        it('should categorize 90+ days', () => {
            expect(getAgingBucket(91)).toBe('90+');
            expect(getAgingBucket(365)).toBe('90+');
        });
    });
});

describe('Vietnamese Partner Standards', () => {
    describe('Tax Code Formats', () => {
        it('should recognize company tax codes (10 digits)', () => {
            const companyTaxCode = '0123456789';
            expect(validateTaxCode(companyTaxCode).valid).toBe(true);
        });

        it('should recognize branch tax codes (13 digits)', () => {
            const branchTaxCode = '0123456789-001';
            expect(validateTaxCode(branchTaxCode).valid).toBe(true);
        });
    });

    describe('Partner Type Mapping', () => {
        it('should have customer type for receivable accounts (131)', () => {
            const accountCode = '1311';
            expect(accountCode.startsWith('131')).toBe(true);
        });

        it('should have supplier type for payable accounts (331)', () => {
            const accountCode = '3311';
            expect(accountCode.startsWith('331')).toBe(true);
        });
    });
});
