/**
 * Balance Check Unit Tests
 * Tests for voucher balance validation logic
 *
 * Vietnamese Accounting Standards:
 * - On-balance sheet entries require Debit = Credit
 * - Off-balance sheet accounts (TK 0xx) are exempt
 * - Tolerance: 0.01 VND for rounding
 */

interface VoucherItem {
  account_code: string;
  debit_amount: number;
  credit_amount: number;
}

/**
 * Check if voucher is balanced
 * @param items Voucher items
 * @param tolerance Allowed difference (default 0.01)
 * @returns Object with isBalanced flag and details
 */
function checkBalance(items: VoucherItem[], tolerance = 0.01): {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  hasOffBalanceItems: boolean;
} {
  // Separate on-balance and off-balance items
  const onBalanceItems = items.filter(item => !item.account_code.startsWith('0'));
  const offBalanceItems = items.filter(item => item.account_code.startsWith('0'));

  const totalDebit = onBalanceItems.reduce((sum, item) => sum + (item.debit_amount || 0), 0);
  const totalCredit = onBalanceItems.reduce((sum, item) => sum + (item.credit_amount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);

  return {
    isBalanced: difference <= tolerance,
    totalDebit,
    totalCredit,
    difference,
    hasOffBalanceItems: offBalanceItems.length > 0,
  };
}

/**
 * Check if an account is off-balance sheet (TK 0xx)
 */
function isOffBalanceAccount(accountCode: string): boolean {
  return accountCode.startsWith('0');
}

describe('Balance Check Logic', () => {
  describe('checkBalance', () => {
    it('should return balanced for equal debit and credit', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1000000, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 1000000 },
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(1000000);
      expect(result.totalCredit).toBe(1000000);
      expect(result.difference).toBe(0);
    });

    it('should return unbalanced for unequal amounts', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1000000, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 900000 },
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(false);
      expect(result.difference).toBe(100000);
    });

    it('should allow small tolerance (0.01 VND)', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1000000.005, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 1000000 },
      ];

      const result = checkBalance(items);

      // With tolerance 0.01, a difference of 0.005 should be balanced
      expect(result.isBalanced).toBe(true);
      expect(result.difference).toBeLessThanOrEqual(0.01);
    });

    it('should handle multiple debit entries', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 500000, credit_amount: 0 },
        { account_code: '112', debit_amount: 500000, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 1000000 },
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(1000000);
    });

    it('should handle multiple credit entries', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1000000, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 600000 },
        { account_code: '3331', debit_amount: 0, credit_amount: 400000 },
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(true);
      expect(result.totalCredit).toBe(1000000);
    });

    it('should handle empty items array', () => {
      const result = checkBalance([]);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(0);
      expect(result.totalCredit).toBe(0);
    });

    it('should exclude off-balance sheet accounts (TK 0xx)', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1000000, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 1000000 },
        { account_code: '007', debit_amount: 500000, credit_amount: 0 }, // Off-balance
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(1000000); // Excludes 007 account
      expect(result.hasOffBalanceItems).toBe(true);
    });

    it('should handle only off-balance sheet items', () => {
      const items: VoucherItem[] = [
        { account_code: '007', debit_amount: 1000000, credit_amount: 0 },
        { account_code: '009', debit_amount: 0, credit_amount: 500000 },
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(0);
      expect(result.totalCredit).toBe(0);
      expect(result.hasOffBalanceItems).toBe(true);
    });

    it('should handle decimal amounts correctly', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1234567.89, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 1234567.89 },
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(true);
    });

    it('should handle large amounts', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 999999999999.99, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 999999999999.99 },
      ];

      const result = checkBalance(items);

      expect(result.isBalanced).toBe(true);
    });
  });

  describe('isOffBalanceAccount', () => {
    it('should identify off-balance accounts starting with 0', () => {
      expect(isOffBalanceAccount('007')).toBe(true);
      expect(isOffBalanceAccount('001')).toBe(true);
      expect(isOffBalanceAccount('009')).toBe(true);
    });

    it('should identify on-balance accounts', () => {
      expect(isOffBalanceAccount('111')).toBe(false);
      expect(isOffBalanceAccount('511')).toBe(false);
      expect(isOffBalanceAccount('331')).toBe(false);
    });
  });
});

describe('Voucher Validation', () => {
  describe('validateVoucherItems', () => {
    function validateVoucherItems(items: VoucherItem[]): {
      isValid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (items.length === 0) {
        errors.push('Chứng từ phải có ít nhất 1 dòng định khoản');
      }

      items.forEach((item, index) => {
        if (!item.account_code) {
          errors.push(`Dòng ${index + 1}: Tài khoản không được để trống`);
        }

        if (item.debit_amount === 0 && item.credit_amount === 0) {
          errors.push(`Dòng ${index + 1}: Phải nhập số tiền Nợ hoặc Có`);
        }

        if (item.debit_amount > 0 && item.credit_amount > 0) {
          errors.push(`Dòng ${index + 1}: Không thể nhập cả Nợ và Có`);
        }

        if (item.debit_amount < 0 || item.credit_amount < 0) {
          errors.push(`Dòng ${index + 1}: Số tiền không được âm`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
      };
    }

    it('should validate correct voucher items', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1000000, credit_amount: 0 },
        { account_code: '511', debit_amount: 0, credit_amount: 1000000 },
      ];

      const result = validateVoucherItems(items);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty items', () => {
      const result = validateVoucherItems([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Chứng từ phải có ít nhất 1 dòng định khoản');
    });

    it('should reject items without account code', () => {
      const items: VoucherItem[] = [
        { account_code: '', debit_amount: 1000000, credit_amount: 0 },
      ];

      const result = validateVoucherItems(items);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Tài khoản không được để trống'))).toBe(true);
    });

    it('should reject items with zero amounts', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 0, credit_amount: 0 },
      ];

      const result = validateVoucherItems(items);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Phải nhập số tiền'))).toBe(true);
    });

    it('should reject items with both debit and credit', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: 1000, credit_amount: 1000 },
      ];

      const result = validateVoucherItems(items);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Không thể nhập cả Nợ và Có'))).toBe(true);
    });

    it('should reject negative amounts', () => {
      const items: VoucherItem[] = [
        { account_code: '111', debit_amount: -1000, credit_amount: 0 },
      ];

      const result = validateVoucherItems(items);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('không được âm'))).toBe(true);
    });
  });
});
