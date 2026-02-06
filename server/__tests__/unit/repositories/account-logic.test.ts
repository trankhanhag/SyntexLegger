/**
 * Unit Tests for Account Business Logic
 * Tests Chart of Accounts validation and business rules
 */

import { describe, it, expect } from '@jest/globals';

// ============================================
// ACCOUNT VALIDATION LOGIC
// ============================================

interface Account {
    account_code: string;
    account_name: string;
    category: string;
    parent_code?: string;
    is_detail: number;
    is_active: number;
}

/**
 * Validate account code format
 * Vietnamese accounting standards require numeric codes
 */
function validateAccountCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code || code.trim() === '') {
        errors.push('Mã tài khoản không được để trống');
    } else {
        if (!/^[0-9]+$/.test(code)) {
            errors.push('Mã tài khoản chỉ được chứa số');
        }
        if (code.length > 20) {
            errors.push('Mã tài khoản tối đa 20 ký tự');
        }
        if (code.length < 1) {
            errors.push('Mã tài khoản tối thiểu 1 ký tự');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate account category
 */
function validateAccountCategory(category: string): boolean {
    const validCategories = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OFF_BALANCE'];
    return validCategories.includes(category);
}

/**
 * Check if account code belongs to a parent
 */
function isChildOf(childCode: string, parentCode: string): boolean {
    return childCode.startsWith(parentCode) && childCode.length > parentCode.length;
}

/**
 * Get account level (number of digits)
 */
function getAccountLevel(code: string): number {
    return code.length;
}

/**
 * Get parent code from child code
 */
function getParentCode(code: string): string | null {
    if (code.length <= 1) return null;
    return code.slice(0, -1);
}

/**
 * Validate account hierarchy
 */
function validateAccountHierarchy(
    account: Account,
    existingAccounts: Account[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (account.parent_code) {
        const parent = existingAccounts.find(a => a.account_code === account.parent_code);
        if (!parent) {
            errors.push(`Tài khoản cha ${account.parent_code} không tồn tại`);
        } else {
            if (!account.account_code.startsWith(account.parent_code)) {
                errors.push('Mã tài khoản con phải bắt đầu bằng mã tài khoản cha');
            }
        }
    }

    if (account.parent_code === account.account_code) {
        errors.push('Tài khoản không thể là cha của chính nó');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Get account nature based on category
 */
function getAccountNature(category: string): 'DEBIT' | 'CREDIT' | 'BOTH' {
    switch (category) {
        case 'ASSET':
        case 'EXPENSE':
            return 'DEBIT';
        case 'LIABILITY':
        case 'EQUITY':
        case 'REVENUE':
            return 'CREDIT';
        case 'OFF_BALANCE':
            return 'BOTH';
        default:
            return 'BOTH';
    }
}

// ============================================
// TESTS
// ============================================

describe('Account Validation Logic', () => {
    describe('validateAccountCode', () => {
        it('should accept valid numeric codes', () => {
            expect(validateAccountCode('111').valid).toBe(true);
            expect(validateAccountCode('1111').valid).toBe(true);
            expect(validateAccountCode('33111').valid).toBe(true);
        });

        it('should reject empty code', () => {
            const result = validateAccountCode('');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mã tài khoản không được để trống');
        });

        it('should reject non-numeric characters', () => {
            const result = validateAccountCode('111A');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mã tài khoản chỉ được chứa số');
        });

        it('should reject codes with spaces', () => {
            const result = validateAccountCode('111 ');
            expect(result.valid).toBe(false);
        });

        it('should reject codes with special characters', () => {
            const result = validateAccountCode('111-1');
            expect(result.valid).toBe(false);
        });

        it('should reject codes longer than 20 characters', () => {
            const result = validateAccountCode('123456789012345678901');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mã tài khoản tối đa 20 ký tự');
        });
    });

    describe('validateAccountCategory', () => {
        it('should accept valid categories', () => {
            expect(validateAccountCategory('ASSET')).toBe(true);
            expect(validateAccountCategory('LIABILITY')).toBe(true);
            expect(validateAccountCategory('EQUITY')).toBe(true);
            expect(validateAccountCategory('REVENUE')).toBe(true);
            expect(validateAccountCategory('EXPENSE')).toBe(true);
            expect(validateAccountCategory('OFF_BALANCE')).toBe(true);
        });

        it('should reject invalid categories', () => {
            expect(validateAccountCategory('INVALID')).toBe(false);
            expect(validateAccountCategory('')).toBe(false);
            expect(validateAccountCategory('asset')).toBe(false);
        });
    });

    describe('isChildOf', () => {
        it('should return true for valid parent-child relationships', () => {
            expect(isChildOf('1111', '111')).toBe(true);
            expect(isChildOf('111', '11')).toBe(true);
            expect(isChildOf('33111', '331')).toBe(true);
        });

        it('should return false for non-related accounts', () => {
            expect(isChildOf('222', '111')).toBe(false);
            expect(isChildOf('1112', '112')).toBe(false);
        });

        it('should return false for same code', () => {
            expect(isChildOf('111', '111')).toBe(false);
        });

        it('should return false when child is shorter', () => {
            expect(isChildOf('11', '111')).toBe(false);
        });
    });

    describe('getAccountLevel', () => {
        it('should return correct level for different codes', () => {
            expect(getAccountLevel('1')).toBe(1);
            expect(getAccountLevel('11')).toBe(2);
            expect(getAccountLevel('111')).toBe(3);
            expect(getAccountLevel('1111')).toBe(4);
        });
    });

    describe('getParentCode', () => {
        it('should return parent code for child accounts', () => {
            expect(getParentCode('1111')).toBe('111');
            expect(getParentCode('111')).toBe('11');
            expect(getParentCode('11')).toBe('1');
        });

        it('should return null for top-level accounts', () => {
            expect(getParentCode('1')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(getParentCode('')).toBeNull();
        });
    });

    describe('validateAccountHierarchy', () => {
        const existingAccounts: Account[] = [
            { account_code: '1', account_name: 'Assets', category: 'ASSET', is_detail: 0, is_active: 1 },
            { account_code: '11', account_name: 'Current Assets', category: 'ASSET', parent_code: '1', is_detail: 0, is_active: 1 },
            { account_code: '111', account_name: 'Cash', category: 'ASSET', parent_code: '11', is_detail: 1, is_active: 1 },
        ];

        it('should accept valid hierarchy', () => {
            const newAccount: Account = {
                account_code: '1111',
                account_name: 'Cash VND',
                category: 'ASSET',
                parent_code: '111',
                is_detail: 1,
                is_active: 1,
            };

            const result = validateAccountHierarchy(newAccount, existingAccounts);
            expect(result.valid).toBe(true);
        });

        it('should reject non-existent parent', () => {
            const newAccount: Account = {
                account_code: '2111',
                account_name: 'Test',
                category: 'ASSET',
                parent_code: '211',
                is_detail: 1,
                is_active: 1,
            };

            const result = validateAccountHierarchy(newAccount, existingAccounts);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('không tồn tại'))).toBe(true);
        });

        it('should reject child code not starting with parent code', () => {
            const newAccount: Account = {
                account_code: '2111',
                account_name: 'Test',
                category: 'ASSET',
                parent_code: '111',
                is_detail: 1,
                is_active: 1,
            };

            const result = validateAccountHierarchy(newAccount, existingAccounts);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('bắt đầu bằng'))).toBe(true);
        });

        it('should reject circular reference', () => {
            const newAccount: Account = {
                account_code: '111',
                account_name: 'Test',
                category: 'ASSET',
                parent_code: '111',
                is_detail: 1,
                is_active: 1,
            };

            const result = validateAccountHierarchy(newAccount, existingAccounts);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('cha của chính nó'))).toBe(true);
        });

        it('should accept account without parent', () => {
            const newAccount: Account = {
                account_code: '2',
                account_name: 'Liabilities',
                category: 'LIABILITY',
                is_detail: 0,
                is_active: 1,
            };

            const result = validateAccountHierarchy(newAccount, existingAccounts);
            expect(result.valid).toBe(true);
        });
    });

    describe('getAccountNature', () => {
        it('should return DEBIT for asset accounts', () => {
            expect(getAccountNature('ASSET')).toBe('DEBIT');
        });

        it('should return DEBIT for expense accounts', () => {
            expect(getAccountNature('EXPENSE')).toBe('DEBIT');
        });

        it('should return CREDIT for liability accounts', () => {
            expect(getAccountNature('LIABILITY')).toBe('CREDIT');
        });

        it('should return CREDIT for equity accounts', () => {
            expect(getAccountNature('EQUITY')).toBe('CREDIT');
        });

        it('should return CREDIT for revenue accounts', () => {
            expect(getAccountNature('REVENUE')).toBe('CREDIT');
        });

        it('should return BOTH for off-balance accounts', () => {
            expect(getAccountNature('OFF_BALANCE')).toBe('BOTH');
        });
    });
});

describe('Vietnamese Chart of Accounts Standards (TT 99/2025)', () => {
    describe('Account Code Structure', () => {
        it('should follow TT 99/2025 structure', () => {
            const level1 = '1';
            const level2 = '11';
            const level3 = '111';
            const level4 = '1111';

            expect(getAccountLevel(level1)).toBe(1);
            expect(getAccountLevel(level2)).toBe(2);
            expect(getAccountLevel(level3)).toBe(3);
            expect(getAccountLevel(level4)).toBe(4);

            expect(isChildOf(level2, level1)).toBe(true);
            expect(isChildOf(level3, level2)).toBe(true);
            expect(isChildOf(level4, level3)).toBe(true);
        });
    });

    describe('Account Nature by Code Prefix', () => {
        function getDefaultNatureByCode(code: string): 'DEBIT' | 'CREDIT' {
            const firstDigit = code[0];
            if (['1', '2', '6', '8'].includes(firstDigit)) {
                return 'DEBIT';
            }
            return 'CREDIT';
        }

        it('should identify asset accounts (1xx, 2xx) as debit nature', () => {
            expect(getDefaultNatureByCode('111')).toBe('DEBIT');
            expect(getDefaultNatureByCode('211')).toBe('DEBIT');
        });

        it('should identify liability accounts (3xx) as credit nature', () => {
            expect(getDefaultNatureByCode('331')).toBe('CREDIT');
            expect(getDefaultNatureByCode('341')).toBe('CREDIT');
        });

        it('should identify equity accounts (4xx) as credit nature', () => {
            expect(getDefaultNatureByCode('411')).toBe('CREDIT');
            expect(getDefaultNatureByCode('421')).toBe('CREDIT');
        });

        it('should identify revenue accounts (5xx, 7xx) as credit nature', () => {
            expect(getDefaultNatureByCode('511')).toBe('CREDIT');
            expect(getDefaultNatureByCode('711')).toBe('CREDIT');
        });

        it('should identify expense accounts (6xx, 8xx) as debit nature', () => {
            expect(getDefaultNatureByCode('621')).toBe('DEBIT');
            expect(getDefaultNatureByCode('811')).toBe('DEBIT');
        });
    });
});
