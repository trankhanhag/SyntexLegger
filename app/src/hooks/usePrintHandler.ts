import { useEffect, useCallback, useState } from 'react';
import type { VoucherView } from '../components/PrintTemplates';

export interface PrintHandlerConfig {
    /** The printSignal from App.tsx - triggers print when changed */
    printSignal: number;
    /** Currently selected record to print */
    selectedRecord: any | null;
    /** The voucher type for template selection */
    voucherView: VoucherView;
    /** Message to show when no record is selected */
    noSelectionMessage?: string;
    /** Callback when print preview should open */
    onOpenPreview?: () => void;
    /** Whether print is allowed in current view state */
    canPrint?: boolean;
    /** Custom validation before printing */
    validateBeforePrint?: () => { valid: boolean; message?: string };
}

export interface PrintHandlerResult {
    /** Whether the print preview modal is open */
    showPrintPreview: boolean;
    /** Function to open print preview manually */
    openPrintPreview: () => void;
    /** Function to close print preview */
    closePrintPreview: () => void;
    /** Function to trigger actual browser print */
    triggerPrint: () => void;
    /** The record being printed */
    printRecord: any | null;
}

/**
 * Custom hook to handle print functionality consistently across all modules.
 *
 * This hook:
 * 1. Listens to printSignal from Ribbon (via App.tsx)
 * 2. Validates if printing is allowed (record selected, etc.)
 * 3. Opens print preview modal when appropriate
 * 4. Provides consistent behavior across all modules
 *
 * @example
 * ```tsx
 * const { showPrintPreview, closePrintPreview, printRecord } = usePrintHandler({
 *     printSignal,
 *     selectedRecord: selectedRow,
 *     voucherView: 'CASH_RECEIPT',
 *     noSelectionMessage: 'Vui lòng chọn một phiếu thu để in',
 * });
 *
 * // In render:
 * {showPrintPreview && printRecord && (
 *     <PrintPreviewModal
 *         record={printRecord}
 *         view="CASH_RECEIPT"
 *         onClose={closePrintPreview}
 *         companyInfo={companyInfo}
 *     />
 * )}
 * ```
 */
export function usePrintHandler({
    printSignal,
    selectedRecord,
    voucherView: _voucherView, // Reserved for future use
    noSelectionMessage = 'Vui lòng chọn một bản ghi trước khi in',
    onOpenPreview,
    canPrint = true,
    validateBeforePrint,
}: PrintHandlerConfig): PrintHandlerResult {
    void _voucherView; // Suppress unused warning
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printRecord, setPrintRecord] = useState<any | null>(null);

    // Handle print signal from Ribbon
    useEffect(() => {
        if (printSignal > 0) {
            handlePrintRequest();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printSignal]);

    const handlePrintRequest = useCallback(() => {
        // Check if printing is allowed
        if (!canPrint) {
            return;
        }

        // Run custom validation if provided
        if (validateBeforePrint) {
            const validation = validateBeforePrint();
            if (!validation.valid) {
                if (validation.message) {
                    alert(validation.message);
                }
                return;
            }
        }

        // Check if a record is selected
        if (!selectedRecord) {
            alert(noSelectionMessage);
            return;
        }

        // Set the record and open preview
        setPrintRecord(selectedRecord);
        setShowPrintPreview(true);
        onOpenPreview?.();
    }, [canPrint, validateBeforePrint, selectedRecord, noSelectionMessage, onOpenPreview]);

    const openPrintPreview = useCallback(() => {
        if (selectedRecord) {
            setPrintRecord(selectedRecord);
            setShowPrintPreview(true);
            onOpenPreview?.();
        } else {
            alert(noSelectionMessage);
        }
    }, [selectedRecord, noSelectionMessage, onOpenPreview]);

    const closePrintPreview = useCallback(() => {
        setShowPrintPreview(false);
        // Delay clearing the record to allow animation
        setTimeout(() => setPrintRecord(null), 300);
    }, []);

    const triggerPrint = useCallback(() => {
        window.print();
    }, []);

    return {
        showPrintPreview,
        openPrintPreview,
        closePrintPreview,
        triggerPrint,
        printRecord,
    };
}

/**
 * Hook for modules that need to print from a detail/modal view
 * (e.g., when viewing a voucher detail and want to print it)
 */
export function usePrintFromDetail({
    printSignal,
    detailRecord,
    isDetailOpen,
    voucherView: _voucherView, // Reserved for future use
}: {
    printSignal: number;
    detailRecord: any | null;
    isDetailOpen: boolean;
    voucherView: VoucherView;
}): PrintHandlerResult {
    void _voucherView; // Suppress unused warning
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printRecord, setPrintRecord] = useState<any | null>(null);

    useEffect(() => {
        if (printSignal > 0) {
            if (isDetailOpen && detailRecord) {
                // If detail modal is open, print that record
                setPrintRecord(detailRecord);
                setShowPrintPreview(true);
            } else {
                // No detail open - show message
                alert('Vui lòng mở chi tiết chứng từ cần in');
            }
        }
    }, [printSignal, isDetailOpen, detailRecord]);

    const openPrintPreview = useCallback(() => {
        if (detailRecord) {
            setPrintRecord(detailRecord);
            setShowPrintPreview(true);
        }
    }, [detailRecord]);

    const closePrintPreview = useCallback(() => {
        setShowPrintPreview(false);
        setTimeout(() => setPrintRecord(null), 300);
    }, []);

    const triggerPrint = useCallback(() => {
        window.print();
    }, []);

    return {
        showPrintPreview,
        openPrintPreview,
        closePrintPreview,
        triggerPrint,
        printRecord,
    };
}

/**
 * Utility to determine the correct voucher view based on module and sub-view
 */
export function getVoucherViewForPrint(
    module: string,
    subView: string
): VoucherView | null {
    const viewMap: Record<string, Record<string, VoucherView>> = {
        cash: {
            receipt: 'CASH_RECEIPT',
            payment: 'CASH_PAYMENT',
            phieu_thu: 'CASH_RECEIPT',
            phieu_chi: 'CASH_PAYMENT',
        },
        inventory: {
            receipt: 'RECEIPT',
            receipts: 'RECEIPT',
            issue: 'ISSUE',
            issues: 'ISSUE',
            transfer: 'TRANSFER',
            transfers: 'TRANSFER',
        },
        expense: {
            inbound: 'RECEIPT',
            payment: 'CASH_PAYMENT',
        },
    };

    return viewMap[module]?.[subView] || null;
}

/**
 * Simple hook for modules without dedicated print templates.
 * Shows an informative message when print is triggered.
 *
 * @example
 * ```tsx
 * useSimplePrint(printSignal, 'Dự án');
 * ```
 */
export function useSimplePrint(
    printSignal: number,
    moduleName: string,
    options?: {
        /** Custom message to display */
        message?: string;
        /** Allow browser print for list views */
        allowBrowserPrint?: boolean;
    }
): void {
    useEffect(() => {
        if (printSignal > 0) {
            if (options?.allowBrowserPrint) {
                // For list views, use browser print with current page
                window.print();
            } else {
                // Show informative message
                const message = options?.message ||
                    `Chức năng in mẫu phiếu chưa được hỗ trợ cho phân hệ ${moduleName}.\n\nBạn có thể sử dụng:\n• Xuất Excel để in danh sách\n• Ctrl+P để in trang hiện tại`;
                alert(message);
            }
        }
    }, [printSignal, moduleName, options]);
}

export default usePrintHandler;
