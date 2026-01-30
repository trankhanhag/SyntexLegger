/**
 * useBalanceCheck - Shared Balance Validation Hook
 * SyntexLegger - Kiểm tra cân đối Nợ = Có cho mọi form chứng từ
 *
 * Usage:
 * const { balanceCheck, isBalanced, canSave } = useBalanceCheck(items);
 */

import { useMemo } from 'react';

/**
 * Check if account is off-balance sheet (TK ngoài bảng)
 * Vietnamese accounting: accounts starting with "0" are off-balance sheet
 * Examples: 001, 002, 003, 004, 005, 007, 008, 009
 */
export const isOffBalanceSheetAccount = (accountCode: string | undefined | null): boolean => {
    if (!accountCode || typeof accountCode !== 'string') return false;
    return accountCode.startsWith('0');
};

/**
 * Balance check result interface
 */
export interface BalanceCheckResult {
    isBalanced: boolean;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    onBalanceSheetLines: number;
    offBalanceSheetLines: number;
    incompleteLines: number[];
    status: 'balanced' | 'unbalanced' | 'incomplete' | 'empty';
    message: string;
    canSave: boolean;
}

/**
 * Line item interface for balance check
 * Supports multiple field naming conventions
 */
export interface BalanceLineItem {
    // Amount
    amount?: number;
    // Debit account - supports multiple naming
    debitAcc?: string;
    debit_acc?: string;
    debit_account?: string;
    tkNo?: string;
    // Credit account - supports multiple naming
    creditAcc?: string;
    credit_acc?: string;
    credit_account?: string;
    tkCo?: string;
    // Description (optional, for checking empty lines)
    description?: string;
}

/**
 * Extract debit account from line item (supports multiple field names)
 */
const getDebitAccount = (item: BalanceLineItem): string => {
    return item.debitAcc || item.debit_acc || item.debit_account || item.tkNo || '';
};

/**
 * Extract credit account from line item (supports multiple field names)
 */
const getCreditAccount = (item: BalanceLineItem): string => {
    return item.creditAcc || item.credit_acc || item.credit_account || item.tkCo || '';
};

/**
 * Calculate balance check result from line items
 * This is the core calculation function that can be used standalone
 */
export const calculateBalanceCheck = (items: BalanceLineItem[]): BalanceCheckResult => {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return {
            isBalanced: true,
            totalDebit: 0,
            totalCredit: 0,
            difference: 0,
            onBalanceSheetLines: 0,
            offBalanceSheetLines: 0,
            incompleteLines: [],
            status: 'empty',
            message: 'Chưa có dữ liệu',
            canSave: false
        };
    }

    let totalDebit = 0;
    let totalCredit = 0;
    let onBalanceSheetLines = 0;
    let offBalanceSheetLines = 0;
    const incompleteLines: number[] = [];

    items.forEach((item, idx) => {
        const amount = item.amount || 0;
        const debitAcc = getDebitAccount(item);
        const creditAcc = getCreditAccount(item);

        // Check if accounts are off-balance sheet
        const isDebitOffBalance = isOffBalanceSheetAccount(debitAcc);
        const isCreditOffBalance = isOffBalanceSheetAccount(creditAcc);

        // Skip completely empty lines
        if (!debitAcc && !creditAcc && amount === 0 && !item.description) {
            return;
        }

        // Off-balance sheet entries (single-entry accounting) - skip balance validation
        if (isDebitOffBalance || isCreditOffBalance) {
            offBalanceSheetLines++;
            return;
        }

        // On-balance sheet entries require BOTH debit and credit accounts
        if (debitAcc && creditAcc) {
            // Complete double-entry - amount goes to both sides
            totalDebit += amount;
            totalCredit += amount;
            onBalanceSheetLines++;
        } else if (debitAcc || creditAcc || amount > 0) {
            // Incomplete entry - has data but missing account(s)
            incompleteLines.push(idx);
            if (debitAcc) totalDebit += amount;
            if (creditAcc) totalCredit += amount;
        }
    });

    const difference = Math.abs(totalDebit - totalCredit);
    const tolerance = 0.01; // 1 cent tolerance for floating point

    // Determine status
    let status: 'balanced' | 'unbalanced' | 'incomplete' | 'empty';
    let message: string;
    let canSave: boolean;

    if (onBalanceSheetLines === 0 && offBalanceSheetLines === 0) {
        status = 'empty';
        message = 'Chưa có bút toán hợp lệ';
        canSave = false;
    } else if (incompleteLines.length > 0) {
        status = 'incomplete';
        message = `${incompleteLines.length} dòng thiếu tài khoản Nợ hoặc Có`;
        canSave = false;
    } else if (difference > tolerance) {
        status = 'unbalanced';
        message = `Chênh lệch: ${difference.toLocaleString('vi-VN')} VNĐ`;
        canSave = false;
    } else {
        status = 'balanced';
        message = onBalanceSheetLines > 0
            ? `Cân đối ✓ (${onBalanceSheetLines} bút toán)`
            : 'Chỉ có bút toán ngoài bảng';
        canSave = true;
    }

    if (offBalanceSheetLines > 0) {
        message += ` | ${offBalanceSheetLines} ngoài bảng`;
    }

    return {
        isBalanced: status === 'balanced',
        totalDebit,
        totalCredit,
        difference,
        onBalanceSheetLines,
        offBalanceSheetLines,
        incompleteLines,
        status,
        message,
        canSave
    };
};

/**
 * React Hook for balance check - auto-updates when items change
 * @param items - Array of line items to check
 * @returns BalanceCheckResult
 */
export const useBalanceCheck = (items: BalanceLineItem[]): BalanceCheckResult => {
    return useMemo(() => calculateBalanceCheck(items), [items]);
};

export default useBalanceCheck;
