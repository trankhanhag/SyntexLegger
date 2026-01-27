/**
 * useVoucherForm Hook
 * SyntexHCSN - Custom hook cho quản lý form voucher
 * 
 * Tách logic form state management từ GeneralModule.tsx
 */

import { useState, useCallback } from 'react';
import { voucherService } from '../../../api';
import type { Voucher, VoucherLine } from '../types/voucher.types';

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

export interface UseVoucherFormOptions {
    initialData?: Voucher;
    onSaveSuccess?: (voucher: Voucher) => void;
    onSaveError?: (error: string) => void;
    lockedUntil?: string;
}

/**
 * Custom hook để quản lý form nhập liệu voucher
 */
export function useVoucherForm(options: UseVoucherFormOptions = {}): UseVoucherFormReturn {
    const { initialData, onSaveSuccess, onSaveError, lockedUntil } = options;

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
            voucher.lines.forEach((line, index) => {
                if (!line.debitAcc && !line.creditAcc) {
                    newErrors[`line_${index}_account`] = `Dòng ${index + 1}: Cần chọn tài khoản Nợ hoặc Có`;
                }
                if (!line.amount || line.amount <= 0) {
                    newErrors[`line_${index}_amount`] = `Dòng ${index + 1}: Số tiền phải lớn hơn 0`;
                }
            });
        }

        // Balance check (optional warning, not blocking)
        const { balance } = calculateTotals();
        if (Math.abs(balance) > 0.01) {
            newErrors.balance = `Chênh lệch Nợ/Có: ${balance.toLocaleString('vi-VN')} đ`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [voucher, lockedUntil, calculateTotals]);

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
            console.error('Save voucher failed:', err);
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
