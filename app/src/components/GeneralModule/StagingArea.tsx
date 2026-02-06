/**
 * StagingArea Component
 * SyntexLegger - Component cho vùng import Excel/CSV
 *
 * Supports two modes:
 * - single: Import all lines into ONE voucher (for use in voucher form)
 * - batch: Group lines by doc_no and create multiple vouchers (for use in list view)
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { FormModal } from '../FormModal';
import type { VoucherLine } from './types/voucher.types';
import { formatCurrency, isValidAccountCode } from './utils/voucher.utils';
import { downloadExcelTemplate, VOUCHER_TEMPLATE } from '../../utils/excelTemplates';
import logger from '../../utils/logger';

// Column mapping for Excel import
const COLUMN_MAPPING = {
    doc_no: ['số ct', 'so ct', 'doc_no', 'số chứng từ', 'ma ct', 'mã ct'],
    doc_date: ['ngày ct', 'ngay ct', 'doc_date', 'ngày chứng từ', 'trx_date', 'ngày'],
    description: ['diễn giải', 'dien giai', 'description', 'nội dung', 'ghi chú', 'mô tả'],
    debit_acc: ['tk nợ', 'tk no', 'debit_acc', 'nợ', 'debit', 'tài khoản nợ'],
    credit_acc: ['tk có', 'tk co', 'credit_acc', 'có', 'credit', 'tài khoản có'],
    amount: ['số tiền', 'so tien', 'amount', 'tiền', 'giá trị', 'thành tiền'],
    partner_code: ['mã đối tượng', 'ma doi tuong', 'partner_code', 'đối tượng', 'mã kh', 'khách hàng'],
    dim1: ['mã hàng', 'ma hang', 'dim1', 'mã sp', 'sản phẩm', 'vật tư'],
    item_code: ['mục', 'muc', 'item_code', 'mã mục', 'mục lục'],
    sub_item_code: ['khoản mục', 'tieu muc', 'sub_item_code', 'mã khoản mục']
};

export interface StagingItem {
    id: string;
    rowNumber: number;
    doc_no: string;
    doc_date: string;
    description: string;
    debit_acc: string;
    credit_acc: string;
    amount: number;
    partner_code?: string;
    dim1?: string;
    item_code?: string;
    sub_item_code?: string;
    status: 'valid' | 'warning' | 'error';
    errors: string[];
}

export interface GroupedVoucher {
    doc_no: string;
    doc_date: string;
    description: string;
    lines: VoucherLine[];
    total_amount: number;
    lineCount: number;
    hasErrors: boolean;
}

export interface StagingAreaProps {
    onClose: () => void;
    /** For single mode: import lines into one voucher */
    onImport?: (items: VoucherLine[]) => void;
    /** For batch mode: import multiple vouchers */
    onBatchImport?: (vouchers: GroupedVoucher[]) => void;
    accounts?: { code: string; name: string }[];
    partners?: { code: string; name: string }[];
    /** Import mode: 'single' for one voucher, 'batch' for multiple vouchers by doc_no */
    mode?: 'single' | 'batch' | 'auto';
}

export const StagingArea: React.FC<StagingAreaProps> = ({
    onClose,
    onImport,
    onBatchImport,
    accounts = [],
    partners = [],
    mode = 'auto'
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [items, setItems] = useState<StagingItem[]>([]);
    const [status, setStatus] = useState<'idle' | 'reading' | 'validating' | 'ready' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [selectedMode, setSelectedMode] = useState<'single' | 'batch'>('batch');
    const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Group items by doc_no
    const groupedVouchers = useMemo(() => {
        const validItems = items.filter(i => i.status === 'valid');
        const groups: Record<string, StagingItem[]> = {};

        validItems.forEach(item => {
            const key = item.doc_no || '_NO_DOC_NO_';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        return Object.entries(groups).map(([doc_no, groupItems]): GroupedVoucher => {
            const firstItem = groupItems[0];
            const lines: VoucherLine[] = groupItems.map(item => ({
                description: item.description,
                debitAcc: item.debit_acc,
                creditAcc: item.credit_acc,
                amount: item.amount,
                partnerCode: item.partner_code,
                dim1: item.dim1,
                itemCode: item.item_code,
                subItemCode: item.sub_item_code
            }));

            return {
                doc_no: doc_no === '_NO_DOC_NO_' ? '' : doc_no,
                doc_date: firstItem.doc_date,
                description: firstItem.description || `Chứng từ ${doc_no}`,
                lines,
                total_amount: lines.reduce((sum, l) => sum + (l.amount || 0), 0),
                lineCount: lines.length,
                hasErrors: groupItems.some(i => i.status === 'error')
            };
        });
    }, [items]);

    // Determine effective mode (auto-detect if not specified)
    const effectiveMode = useMemo(() => {
        if (mode !== 'auto') return mode;
        // Auto-detect: if multiple doc_no exist, suggest batch mode
        const uniqueDocNos = new Set(items.filter(i => i.doc_no).map(i => i.doc_no));
        return uniqueDocNos.size > 1 ? 'batch' : 'single';
    }, [mode, items]);

    // Auto-select mode when items are loaded
    useEffect(() => {
        if (items.length > 0 && mode === 'auto') {
            setSelectedMode(effectiveMode);
        }
    }, [effectiveMode, items.length, mode]);

    // Stats
    const validCount = items.filter(i => i.status === 'valid').length;
    const errorCount = items.filter(i => i.status === 'error').length;
    const totalAmount = items.filter(i => i.status === 'valid').reduce((sum, i) => sum + i.amount, 0);
    const uniqueDocNos = new Set(items.filter(i => i.doc_no && i.status === 'valid').map(i => i.doc_no));

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFile = async (file: File) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            setStatus('error');
            setErrorMessage('Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc CSV');
            return;
        }

        setFile(file);
        setStatus('reading');
        setErrorMessage('');

        try {
            // Dynamic import XLSX
            const XLSX = await import('xlsx');
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error('File không có dữ liệu');
            }

            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });

            if (rows.length < 2) {
                throw new Error('File cần có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu');
            }

            // Parse header to build column map
            const headerRow = rows[0] as string[];
            const columnMap = buildColumnMap(headerRow);

            // Parse data rows
            setStatus('validating');
            const parsedItems: StagingItem[] = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i] as any[];
                if (!row || row.every(cell => !cell)) continue; // Skip empty rows

                const item = parseRow(row, columnMap, i + 1);
                validateItem(item, accounts, partners);
                parsedItems.push(item);
            }

            setItems(parsedItems);
            setStatus(parsedItems.length > 0 ? 'ready' : 'error');

            // Auto-select mode based on data
            const uniqueDocs = new Set(parsedItems.filter(i => i.doc_no).map(i => i.doc_no));
            if (uniqueDocs.size > 1) {
                setSelectedMode('batch');
                setViewMode('grouped');
            } else {
                setSelectedMode('single');
                setViewMode('flat');
            }

            if (parsedItems.length === 0) {
                setErrorMessage('Không tìm thấy dữ liệu hợp lệ trong file');
            }
        } catch (err: any) {
            logger.error('Import error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Không thể đọc file');
        }
    };

    const buildColumnMap = (header: string[]): Record<string, number> => {
        const map: Record<string, number> = {};

        header.forEach((cell, index) => {
            const normalized = String(cell || '').toLowerCase().trim();

            for (const [key, aliases] of Object.entries(COLUMN_MAPPING)) {
                if (aliases.includes(normalized)) {
                    map[key] = index;
                    break;
                }
            }
        });

        return map;
    };

    const parseRow = (row: any[], columnMap: Record<string, number>, rowNumber: number): StagingItem => {
        const getValue = (key: string) => {
            const idx = columnMap[key];
            return idx !== undefined ? row[idx] : undefined;
        };

        const parseDate = (val: any): string => {
            if (!val) return new Date().toISOString().split('T')[0];
            if (val instanceof Date) return val.toISOString().split('T')[0];
            const str = String(val).trim();
            // Try common formats
            const match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (match) {
                return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            }
            return str;
        };

        const parseAmount = (val: any): number => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            const str = String(val).replace(/[^\d.-]/g, '');
            return parseFloat(str) || 0;
        };

        return {
            id: `row-${rowNumber}`,
            rowNumber,
            doc_no: String(getValue('doc_no') || '').trim(),
            doc_date: parseDate(getValue('doc_date')),
            description: String(getValue('description') || '').trim(),
            debit_acc: String(getValue('debit_acc') || '').trim(),
            credit_acc: String(getValue('credit_acc') || '').trim(),
            amount: parseAmount(getValue('amount')),
            partner_code: String(getValue('partner_code') || '').trim(),
            dim1: String(getValue('dim1') || '').trim(),
            item_code: String(getValue('item_code') || '').trim(),
            sub_item_code: String(getValue('sub_item_code') || '').trim(),
            status: 'valid',
            errors: []
        };
    };

    const validateItem = (item: StagingItem, accounts: any[], partners: any[]) => {
        const errors: string[] = [];

        // Required fields
        if (!item.debit_acc && !item.credit_acc) {
            errors.push('Thiếu TK Nợ hoặc TK Có');
        }
        if (!item.amount || item.amount <= 0) {
            errors.push('Số tiền không hợp lệ');
        }

        // Account validation
        if (item.debit_acc && !isValidAccountCode(item.debit_acc)) {
            errors.push(`TK Nợ '${item.debit_acc}' không hợp lệ`);
        }
        if (item.credit_acc && !isValidAccountCode(item.credit_acc)) {
            errors.push(`TK Có '${item.credit_acc}' không hợp lệ`);
        }

        // Check if accounts exist (only warn, don't block)
        if (accounts.length > 0) {
            if (item.debit_acc && !accounts.find(a => a.code === item.debit_acc)) {
                // Just warning, not error
            }
            if (item.credit_acc && !accounts.find(a => a.code === item.credit_acc)) {
                // Just warning, not error
            }
        }

        // Check if partner exists
        if (partners.length > 0 && item.partner_code) {
            if (!partners.find(p => p.code === item.partner_code)) {
                // Just warning, not error
            }
        }

        item.errors = errors;
        item.status = errors.length > 0 ? 'error' : 'valid';
    };

    const handleImportSingle = () => {
        const validItems = items.filter(i => i.status === 'valid');
        const lines: VoucherLine[] = validItems.map(item => ({
            description: item.description,
            debitAcc: item.debit_acc,
            creditAcc: item.credit_acc,
            amount: item.amount,
            partnerCode: item.partner_code,
            dim1: item.dim1,
            itemCode: item.item_code,
            subItemCode: item.sub_item_code
        }));

        onImport?.(lines);
        onClose();
    };

    const handleImportBatch = () => {
        const validVouchers = groupedVouchers.filter(v => !v.hasErrors && v.lines.length > 0);
        onBatchImport?.(validVouchers);
        onClose();
    };

    const handleImport = () => {
        if (selectedMode === 'batch' && onBatchImport) {
            handleImportBatch();
        } else {
            handleImportSingle();
        }
    };

    return (
        <FormModal
            title="Nhập dữ liệu từ Excel"
            onClose={onClose}
            icon="upload_file"
            sizeClass="max-w-5xl"
        >
            <div className="space-y-4">
                {/* Drop zone */}
                {status === 'idle' || status === 'error' ? (
                    <div className="space-y-4">
                        <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                                ${status === 'error'
                                    ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                                    : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-600 dark:hover:bg-blue-900/10'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <span className={`material-symbols-outlined text-5xl mb-3 ${status === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                                {status === 'error' ? 'error' : 'cloud_upload'}
                            </span>
                            <p className="text-lg font-bold text-slate-600 dark:text-slate-300">
                                Kéo thả file Excel/CSV vào đây
                            </p>
                            <p className="text-sm text-slate-400 mt-1">hoặc click để chọn file</p>
                            {errorMessage && (
                                <p className="text-red-500 mt-3 text-sm">{errorMessage}</p>
                            )}
                        </div>

                        {/* Download template button */}
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-slate-400">Chưa có file mẫu?</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    downloadExcelTemplate(VOUCHER_TEMPLATE);
                                }}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline"
                            >
                                <span className="material-symbols-outlined text-sm">download</span>
                                Tải file Excel mẫu
                            </button>
                        </div>
                    </div>
                ) : status === 'reading' || status === 'validating' ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">
                            {status === 'reading' ? 'Đang đọc file...' : 'Đang kiểm tra dữ liệu...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* File info */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                                <div>
                                    <p className="font-bold text-slate-700 dark:text-slate-200">{file?.name}</p>
                                    <p className="text-xs text-slate-400">{items.length} dòng dữ liệu</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setItems([]);
                                    setStatus('idle');
                                }}
                                className="text-slate-400 hover:text-red-500"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-600">{validCount}</div>
                                <div className="text-xs text-slate-500">Dòng hợp lệ</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                                <div className="text-xs text-slate-500">Dòng lỗi</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-purple-600">{uniqueDocNos.size || 1}</div>
                                <div className="text-xs text-slate-500">Số chứng từ</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
                                <div className="text-xs text-slate-500">Tổng giá trị</div>
                            </div>
                        </div>

                        {/* Mode selector - only show if multiple doc_no detected */}
                        {uniqueDocNos.size > 1 && (
                            <div className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <span className="material-symbols-outlined text-amber-500">info</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                        Phát hiện <strong>{uniqueDocNos.size}</strong> số chứng từ khác nhau trong file
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        Chọn cách nhập dữ liệu:
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setSelectedMode('batch'); setViewMode('grouped'); }}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                            selectedMode === 'batch'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                        }`}
                                    >
                                        Tạo {uniqueDocNos.size} chứng từ
                                    </button>
                                    <button
                                        onClick={() => { setSelectedMode('single'); setViewMode('flat'); }}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                            selectedMode === 'single'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                        }`}
                                    >
                                        Gộp thành 1 chứng từ
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* View mode toggle */}
                        {uniqueDocNos.size > 1 && (
                            <div className="flex justify-end">
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('grouped')}
                                        className={`px-3 py-1 text-xs ${viewMode === 'grouped' ? 'bg-slate-100 dark:bg-slate-700 font-medium' : ''}`}
                                    >
                                        Theo chứng từ
                                    </button>
                                    <button
                                        onClick={() => setViewMode('flat')}
                                        className={`px-3 py-1 text-xs ${viewMode === 'flat' ? 'bg-slate-100 dark:bg-slate-700 font-medium' : ''}`}
                                    >
                                        Chi tiết từng dòng
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Data preview - Grouped view */}
                        {viewMode === 'grouped' && groupedVouchers.length > 0 && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {groupedVouchers.map((voucher, idx) => (
                                        <div key={voucher.doc_no || idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-purple-500">receipt_long</span>
                                                    <div>
                                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                            {voucher.doc_no || '(Chưa có số CT)'}
                                                        </span>
                                                        <span className="ml-2 text-xs text-slate-400">
                                                            {voucher.doc_date}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs text-slate-500">
                                                        {voucher.lineCount} bút toán
                                                    </span>
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                        {formatCurrency(voucher.total_amount)}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate pl-9">
                                                {voucher.description}
                                            </p>
                                            {/* Show detail lines */}
                                            <div className="mt-2 pl-9 space-y-1">
                                                {voucher.lines.slice(0, 3).map((line, lineIdx) => (
                                                    <div key={lineIdx} className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="font-mono">{line.debitAcc}</span>
                                                        <span>/</span>
                                                        <span className="font-mono">{line.creditAcc}</span>
                                                        <span className="flex-1 truncate">{line.description}</span>
                                                        <span className="font-mono">{formatCurrency(line.amount)}</span>
                                                    </div>
                                                ))}
                                                {voucher.lines.length > 3 && (
                                                    <div className="text-xs text-slate-400">
                                                        ...và {voucher.lines.length - 3} bút toán khác
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Data preview - Flat view */}
                        {viewMode === 'flat' && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                        <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                            <th className="px-2 py-2 w-8">#</th>
                                            <th className="px-2 py-2">Số CT</th>
                                            <th className="px-2 py-2">Ngày</th>
                                            <th className="px-2 py-2">TK Nợ</th>
                                            <th className="px-2 py-2">TK Có</th>
                                            <th className="px-2 py-2">Mục</th>
                                            <th className="px-2 py-2">Khoản mục</th>
                                            <th className="px-2 py-2 text-right">Số tiền</th>
                                            <th className="px-2 py-2">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {items.slice(0, 50).map((item) => (
                                            <tr
                                                key={item.id}
                                                className={`${item.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            >
                                                <td className="px-2 py-1.5 text-slate-400">{item.rowNumber}</td>
                                                <td className="px-2 py-1.5 font-mono">{item.doc_no}</td>
                                                <td className="px-2 py-1.5">{item.doc_date}</td>
                                                <td className="px-2 py-1.5 font-mono">{item.debit_acc}</td>
                                                <td className="px-2 py-1.5 font-mono">{item.credit_acc}</td>
                                                <td className="px-2 py-1.5 font-mono">{item.item_code}</td>
                                                <td className="px-2 py-1.5 font-mono">{item.sub_item_code}</td>
                                                <td className="px-2 py-1.5 text-right font-mono">{formatCurrency(item.amount)}</td>
                                                <td className="px-2 py-1.5">
                                                    {item.status === 'valid' ? (
                                                        <span className="text-green-500">✓</span>
                                                    ) : (
                                                        <span className="text-red-500 text-xs" title={item.errors.join(', ')}>
                                                            ✗ {item.errors[0]}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {items.length > 50 && viewMode === 'flat' && (
                            <p className="text-center text-sm text-slate-400">
                                Hiển thị 50/{items.length} dòng
                            </p>
                        )}
                    </>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-xs text-slate-400">
                        {status === 'ready' && selectedMode === 'batch' && uniqueDocNos.size > 1 && (
                            <span>Sẽ tạo <strong>{groupedVouchers.length}</strong> chứng từ mới</span>
                        )}
                        {status === 'ready' && selectedMode === 'single' && (
                            <span>Sẽ nhập <strong>{validCount}</strong> bút toán vào 1 chứng từ</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={validCount === 0}
                            className={`px-8 py-2 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                selectedMode === 'batch' && uniqueDocNos.size > 1
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            <span className="material-symbols-outlined">download</span>
                            {selectedMode === 'batch' && uniqueDocNos.size > 1
                                ? `Tạo ${groupedVouchers.length} chứng từ`
                                : `Nhập ${validCount} dòng`
                            }
                        </button>
                    </div>
                </div>
            </div>
        </FormModal>
    );
};

export default StagingArea;
