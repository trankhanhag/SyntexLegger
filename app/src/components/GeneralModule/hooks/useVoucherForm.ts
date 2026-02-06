/**
 * useVoucherForm Hook
 * SyntexLegger - Custom hook cho quản lý form voucher
 *
 * Tách logic form state management từ GeneralModule.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import { voucherService } from '../../../api';
import type { Voucher, VoucherLine } from '../types/voucher.types';
import logger from '../../../utils/logger';

/**
 * Check if account is off-balance sheet (TK ngoài bảng)
 * Vietnamese accounting: accounts starting with "0" are off-balance sheet
 * Examples: 001, 002, 003, 004, 005, 007, 008, 009
 * These use single-entry bookkeeping, not double-entry
 */
const isOffBalanceSheetAccount = (accountCode: string | undefined): boolean => {
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
    incompleteLines: number[];  // Line indices with missing accounts
    status: 'balanced' | 'unbalanced' | 'incomplete';
    message: string;
}

// Empty line template
const EMPTY_LINE: VoucherLine = {
    description: '',
    debitAcc: '',
    creditAcc: '',
    amount: 0,
    partnerCode: '',
    dim1: '',
    dim2: '',
    itemCode: '',
    subItemCode: '',
    quantity: 0,
    unitPrice: 0,
    currency: 'VND',
    fxRate: 1,
    fxAmount: 0
};

// Empty voucher template
const EMPTY_VOUCHER: Voucher = {
    doc_no: '',
    doc_date: new Date().toISOString().split('T')[0],
    post_date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'GENERAL',
    total_amount: 0,
    lines: [{ ...EMPTY_LINE }]
};

export interface UseVoucherFormReturn {
    // Form State
    voucher: Voucher;
    setVoucher: (voucher: Voucher) => void;

    // Validation
    errors: Record<string, string>;
    isValid: boolean;
    validate: () => boolean;

    // Balance Check (Real-time)
    balanceCheck: BalanceCheckResult;

    // Line Operations
    addLine: () => void;
    removeLine: (index: number) => void;
    updateLine: (index: number, field: string, value: any) => void;
    duplicateLine: (index: number) => void;

    // Form Actions
    resetForm: (initialData?: Voucher) => void;
    saveVoucher: () => Promise<boolean>;

    // State
    saving: boolean;
    saveError: string | null;
    isDirty: boolean;

    // Helpers
    calculateTotals: () => { totalDebit: number; totalCredit: number; balance: number };
    getEmptyLine: () => VoucherLine;
}

export interface DimensionConfig {
    id: number;
    name: string;
    label: string;
    isActive: number;
    isMandatory: number;
}

export interface UseVoucherFormOptions {
    initialData?: Voucher;
    onSaveSuccess?: (voucher: Voucher) => void;
    onSaveError?: (error: string) => void;
    lockedUntil?: string;
    dimensionConfigs?: DimensionConfig[];
}

/**
 * Custom hook để quản lý form nhập liệu voucher
 */
export function useVoucherForm(options: UseVoucherFormOptions = {}): UseVoucherFormReturn {
    const { initialData, onSaveSuccess, onSaveError, lockedUntil, dimensionConfigs = [] } = options;

    // Form State
    const [voucher, setVoucherState] = useState<Voucher>(
        initialData || { ...EMPTY_VOUCHER, lines: [{ ...EMPTY_LINE }] }
    );
    const [originalVoucher, setOriginalVoucher] = useState<Voucher | null>(initialData || null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    /**
     * Check if form has unsaved changes
     */
    const isDirty = JSON.stringify(voucher) !== JSON.stringify(originalVoucher);

    /**
     * Calculate totals for debit, credit, and balance
     */
    const calculateTotals = useCallback(() => {
        const lines = voucher.lines || [];
        const totalDebit = lines.reduce((sum, line) => {
            return sum + (line.debitAcc ? (line.amount || 0) : 0);
        }, 0);
        const totalCredit = lines.reduce((sum, line) => {
            return sum + (line.creditAcc ? (line.amount || 0) : 0);
        }, 0);
        return {
            totalDebit,
            totalCredit,
            balance: totalDebit - totalCredit
        };
    }, [voucher.lines]);

    /**
     * Real-time balance check with off-balance sheet handling
     * This is computed on every render for immediate feedback
     */
    const balanceCheck = useMemo((): BalanceCheckResult => {
        const lines = voucher.lines || [];

        let totalDebit = 0;
        let totalCredit = 0;
        let onBalanceSheetLines = 0;
        let offBalanceSheetLines = 0;
        const incompleteLines: number[] = [];

        lines.forEach((line, idx) => {
            const amount = line.amount || 0;
            const debitAcc = line.debitAcc || '';
            const creditAcc = line.creditAcc || '';

            // Check if accounts are off-balance sheet
            const isDebitOffBalance = isOffBalanceSheetAccount(debitAcc);
            const isCreditOffBalance = isOffBalanceSheetAccount(creditAcc);

            // Skip empty lines
            if (!debitAcc && !creditAcc && amount === 0) {
                return;
            }

            // Off-balance sheet entries (single-entry accounting)
            if (isDebitOffBalance || isCreditOffBalance) {
                offBalanceSheetLines++;
                return; // No balance check for off-balance sheet
            }

            // On-balance sheet entries require BOTH debit and credit accounts
            if (debitAcc && creditAcc) {
                // Complete entry - amount is both debited and credited
                totalDebit += amount;
                totalCredit += amount;
                onBalanceSheetLines++;
            } else if (debitAcc || creditAcc || amount > 0) {
                // Incomplete entry - has some data but missing account(s)
                incompleteLines.push(idx);
                if (debitAcc) totalDebit += amount;
                if (creditAcc) totalCredit += amount;
            }
        });

        const difference = Math.abs(totalDebit - totalCredit);
        const tolerance = 0.01;

        // Determine status
        let status: 'balanced' | 'unbalanced' | 'incomplete';
        let message: string;

        if (incompleteLines.length > 0) {
            status = 'incomplete';
            message = `${incompleteLines.length} dòng thiếu tài khoản Nợ hoặc Có`;
        } else if (difference > tolerance) {
            status = 'unbalanced';
            message = `Chênh lệch: ${difference.toLocaleString('vi-VN')} VNĐ`;
        } else {
            status = 'balanced';
            message = onBalanceSheetLines > 0
                ? `Cân đối (${onBalanceSheetLines} bút toán trong bảng)`
                : 'Không có bút toán trong bảng';
        }

        if (offBalanceSheetLines > 0) {
            message += ` | ${offBalanceSheetLines} bút toán ngoài bảng (không kiểm tra cân đối)`;
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
            message
        };
    }, [voucher.lines]);

    /**
     * Validate the voucher form
     */
    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};

        // Required fields
        if (!voucher.doc_no?.trim()) {
            newErrors.doc_no = 'Số chứng từ là bắt buộc';
        }
        if (!voucher.doc_date) {
            newErrors.doc_date = 'Ngày chứng từ là bắt buộc';
        }
        if (!voucher.description?.trim()) {
            newErrors.description = 'Diễn giải là bắt buộc';
        }

        // Lock period check
        if (lockedUntil && voucher.post_date && voucher.post_date <= lockedUntil) {
            newErrors.post_date = `Ngày hạch toán phải sau ngày khóa kỳ: ${lockedUntil}`;
        }

        // Lines validation
        if (!voucher.lines || voucher.lines.length === 0) {
            newErrors.lines = 'Cần ít nhất một dòng chi tiết';
        } else {
            // Get mandatory dimensions from config
            const mandatoryDims = dimensionConfigs
                .filter(cfg => cfg.isActive === 1 && cfg.isMandatory === 1)
                .map(cfg => ({ id: cfg.id, label: cfg.label || cfg.name }));

            voucher.lines.forEach((line, index) => {
                const debitAcc = line.debitAcc || '';
                const creditAcc = line.creditAcc || '';
                const amount = line.amount || 0;

                // Skip validation for completely empty lines
                if (!debitAcc && !creditAcc && amount === 0 && !line.description) {
                    return;
                }

                // Check if accounts are off-balance sheet
                const isDebitOffBalance = isOffBalanceSheetAccount(debitAcc);
                const isCreditOffBalance = isOffBalanceSheetAccount(creditAcc);

                // For on-balance sheet entries, BOTH accounts are required
                if (!isDebitOffBalance && !isCreditOffBalance) {
                    if (!debitAcc && !creditAcc) {
                        newErrors[`line_${index}_account`] = `Dòng ${index + 1}: Cần chọn tài khoản Nợ và Có`;
                    } else if (!debitAcc) {
                        newErrors[`line_${index}_debit`] = `Dòng ${index + 1}: Thiếu tài khoản Nợ (TK trong bảng yêu cầu ghi kép)`;
                    } else if (!creditAcc) {
                        newErrors[`line_${index}_credit`] = `Dòng ${index + 1}: Thiếu tài khoản Có (TK trong bảng yêu cầu ghi kép)`;
                    }
                }

                // Off-balance sheet entries can have single account (single-entry accounting)
                // No account validation for off-balance sheet

                if (amount <= 0) {
                    newErrors[`line_${index}_amount`] = `Dòng ${index + 1}: Số tiền phải lớn hơn 0`;
                }

                // Validate mandatory dimensions (only for on-balance sheet entries)
                if (!isDebitOffBalance && !isCreditOffBalance) {
                    mandatoryDims.forEach(dim => {
                        const dimField = `dim${dim.id}` as keyof VoucherLine;
                        const dimValue = line[dimField];
                        if (!dimValue || (typeof dimValue === 'string' && !dimValue.trim())) {
                            newErrors[`line_${index}_dim${dim.id}`] = `Dòng ${index + 1}: ${dim.label} là bắt buộc`;
                        }
                    });
                }
            });
        }

        // === BALANCE VALIDATION (Nợ = Có) ===
        // This is a BLOCKING validation - form cannot be saved if not balanced
        // Exception: Off-balance sheet accounts (TK ngoài bảng bắt đầu bằng "0")
        const { totalDebit, totalCredit } = calculateTotals();
        const difference = Math.abs(totalDebit - totalCredit);
        if (difference > 0.01) {
            newErrors.balance = `Chứng từ KHÔNG CÂN ĐỐI: Tổng Nợ (${totalDebit.toLocaleString('vi-VN')}) ≠ Tổng Có (${totalCredit.toLocaleString('vi-VN')}), chênh lệch: ${difference.toLocaleString('vi-VN')} VNĐ`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [voucher, lockedUntil, calculateTotals, dimensionConfigs]);

    const isValid = Object.keys(errors).length === 0;

    /**
     * Update voucher state
     */
    const setVoucher = useCallback((newVoucher: Voucher) => {
        setVoucherState(newVoucher);
        // Clear errors when data changes
        if (Object.keys(errors).length > 0) {
            setErrors({});
        }
    }, [errors]);

    /**
     * Add a new empty line
     */
    const addLine = useCallback(() => {
        setVoucherState(prev => ({
            ...prev,
            lines: [...prev.lines, { ...EMPTY_LINE, description: prev.description || '' }]
        }));
    }, []);

    /**
     * Remove a line by index
     */
    const removeLine = useCallback((index: number) => {
        setVoucherState(prev => {
            if (prev.lines.length <= 1) return prev;
            return {
                ...prev,
                lines: prev.lines.filter((_, i) => i !== index)
            };
        });
    }, []);

    /**
     * Update a specific field in a line
     */
    const updateLine = useCallback((index: number, field: string, value: any) => {
        setVoucherState(prev => {
            const newLines = [...prev.lines];
            newLines[index] = {
                ...newLines[index],
                [field]: value
            };

            // Recalculate total if amount changed
            if (field === 'amount') {
                const total = newLines.reduce((sum, line) => sum + (line.amount || 0), 0);
                return { ...prev, lines: newLines, total_amount: total };
            }

            return { ...prev, lines: newLines };
        });
    }, []);

    /**
     * Duplicate a line
     */
    const duplicateLine = useCallback((index: number) => {
        setVoucherState(prev => {
            const lineToDuplicate = { ...prev.lines[index] };
            delete lineToDuplicate.id; // Remove ID for new line
            const newLines = [...prev.lines];
            newLines.splice(index + 1, 0, lineToDuplicate);
            return { ...prev, lines: newLines };
        });
    }, []);

    /**
     * Reset form to initial state or new empty form
     */
    const resetForm = useCallback((newInitialData?: Voucher) => {
        const data = newInitialData || { ...EMPTY_VOUCHER, lines: [{ ...EMPTY_LINE }] };
        setVoucherState(data);
        setOriginalVoucher(newInitialData || null);
        setErrors({});
        setSaveError(null);
    }, []);

    /**
     * Save voucher to API
     */
    const saveVoucher = useCallback(async (): Promise<boolean> => {
        // Validate first
        if (!validate()) {
            return false;
        }

        setSaving(true);
        setSaveError(null);

        try {
            // Calculate total
            const total = (voucher.lines || []).reduce((sum, line) => sum + (line.amount || 0), 0);
            const items = (voucher.lines || []).map(line => ({
                ...line,
                debit_acc: line.debitAcc ?? (line as any).debit_acc,
                credit_acc: line.creditAcc ?? (line as any).credit_acc,
                partner_code: line.partnerCode ?? (line as any).partner_code,
                project_code: line.projectCode ?? (line as any).project_code,
                contract_code: line.contractCode ?? (line as any).contract_code,
                item_code: line.itemCode ?? (line as any).item_code,
                sub_item_code: line.subItemCode ?? (line as any).sub_item_code
            }));

            const dataToSave = {
                ...voucher,
                total_amount: total,
                items
            };
            delete (dataToSave as Partial<Voucher>).lines;

            const response = await voucherService.save(dataToSave);
            const savedId = response?.data?.id || voucher.id;
            const savedVoucher = { ...voucher, id: savedId, total_amount: total };

            // Update state with saved data (including server-generated IDs)
            setVoucherState(savedVoucher);
            setOriginalVoucher(savedVoucher);

            onSaveSuccess?.(savedVoucher);
            return true;
        } catch (err: any) {
            logger.error('Save voucher failed:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Không thể lưu chứng từ';
            setSaveError(errorMsg);
            onSaveError?.(errorMsg);
            return false;
        } finally {
            setSaving(false);
        }
    }, [voucher, validate, onSaveSuccess, onSaveError]);

    /**
     * Get an empty line template
     */
    const getEmptyLine = useCallback((): VoucherLine => {
        return { ...EMPTY_LINE };
    }, []);

    return {
        voucher,
        setVoucher,
        errors,
        isValid,
        validate,
        balanceCheck,
        addLine,
        removeLine,
        updateLine,
        duplicateLine,
        resetForm,
        saveVoucher,
        saving,
        saveError,
        isDirty,
        calculateTotals,
        getEmptyLine
    };
}

export default useVoucherForm;
