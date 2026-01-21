/**
 * StagingArea Component
 * SyntexHCSN - Component cho vùng import Excel/CSV
 */

import React, { useState, useCallback, useRef } from 'react';
import { FormModal } from '../FormModal';
import type { VoucherLine } from './types/voucher.types';
import { formatCurrency, isValidAccountCode } from './utils/voucher.utils';

// Column mapping for Excel import
const COLUMN_MAPPING = {
    doc_no: ['số ct', 'so ct', 'doc_no', 'số chứng từ', 'ma ct'],
    doc_date: ['ngày ct', 'ngay ct', 'doc_date', 'ngày chứng từ', 'trx_date'],
    description: ['diễn giải', 'dien giai', 'description', 'nội dung', 'ghi chú'],
    debit_acc: ['tk nợ', 'tk no', 'debit_acc', 'nợ', 'debit', 'tài khoản nợ'],
    credit_acc: ['tk có', 'tk co', 'credit_acc', 'có', 'credit', 'tài khoản có'],
    amount: ['số tiền', 'so tien', 'amount', 'tiền', 'giá trị'],
    partner_code: ['mã đối tượng', 'ma doi tuong', 'partner_code', 'đối tượng', 'mã kh'],
    dim1: ['mã hàng', 'ma hang', 'dim1', 'mã sp', 'sản phẩm']
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
    status: 'valid' | 'warning' | 'error';
    errors: string[];
}

export interface StagingAreaProps {
    onClose: () => void;
    onImport: (items: VoucherLine[]) => void;
    accounts?: { code: string; name: string }[];
    partners?: { code: string; name: string }[];
}

export const StagingArea: React.FC<StagingAreaProps> = ({
    onClose,
    onImport,
    accounts = [],
    partners = []
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [items, setItems] = useState<StagingItem[]>([]);
    const [status, setStatus] = useState<'idle' | 'reading' | 'validating' | 'ready' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

            if (parsedItems.length === 0) {
                setErrorMessage('Không tìm thấy dữ liệu hợp lệ trong file');
            }
        } catch (err: any) {
            console.error('Import error:', err);
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
            if (!val) return '';
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

        // Check if accounts exist
        if (accounts.length > 0) {
            if (item.debit_acc && !accounts.find(a => a.code === item.debit_acc)) {
                errors.push(`TK Nợ '${item.debit_acc}' không tồn tại`);
            }
            if (item.credit_acc && !accounts.find(a => a.code === item.credit_acc)) {
                errors.push(`TK Có '${item.credit_acc}' không tồn tại`);
            }
        }

        // Check if partner exists
        if (partners.length > 0 && item.partner_code) {
            if (!partners.find(p => p.code === item.partner_code)) {
                errors.push(`Đối tượng '${item.partner_code}' không tồn tại`);
            }
        }

        item.errors = errors;
        item.status = errors.length > 0 ? 'error' : 'valid';
    };

    const handleImport = () => {
        const validItems = items.filter(i => i.status === 'valid');
        const lines: VoucherLine[] = validItems.map(item => ({
            description: item.description,
            debitAcc: item.debit_acc,
            creditAcc: item.credit_acc,
            amount: item.amount,
            partnerCode: item.partner_code,
            dim1: item.dim1
        }));

        onImport(lines);
        onClose();
    };

    const validCount = items.filter(i => i.status === 'valid').length;
    const errorCount = items.filter(i => i.status === 'error').length;
    const totalAmount = items.filter(i => i.status === 'valid').reduce((sum, i) => sum + i.amount, 0);

    return (
        <FormModal
            title="Nhập dữ liệu từ Excel"
            onClose={onClose}
            icon="upload_file"
            sizeClass="max-w-4xl"
        >
            <div className="space-y-4">
                {/* Drop zone */}
                {status === 'idle' || status === 'error' ? (
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
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-600">{validCount}</div>
                                <div className="text-xs text-slate-500">Dòng hợp lệ</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                                <div className="text-xs text-slate-500">Dòng lỗi</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
                                <div className="text-xs text-slate-500">Tổng giá trị</div>
                            </div>
                        </div>

                        {/* Data preview */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                    <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-2 py-2 w-8">#</th>
                                        <th className="px-2 py-2">Số CT</th>
                                        <th className="px-2 py-2">Ngày</th>
                                        <th className="px-2 py-2">TK Nợ</th>
                                        <th className="px-2 py-2">TK Có</th>
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

                        {items.length > 50 && (
                            <p className="text-center text-sm text-slate-400">
                                Hiển thị 50/{items.length} dòng
                            </p>
                        )}
                    </>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={validCount === 0}
                        className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined">download</span>
                        Nhập {validCount} dòng
                    </button>
                </div>
            </div>
        </FormModal>
    );
};

export default StagingArea;
