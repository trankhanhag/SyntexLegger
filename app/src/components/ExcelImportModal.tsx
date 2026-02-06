/**
 * ExcelImportModal - Reusable Excel/CSV Import Component
 * SyntexLegger - Generic import modal for any data type
 *
 * USAGE:
 * <ExcelImportModal
 *   title="Nhập Tài khoản"
 *   columns={[
 *     { key: 'account_code', label: 'Mã TK', required: true, aliases: ['mã tk', 'account'] },
 *     { key: 'account_name', label: 'Tên TK', required: true },
 *   ]}
 *   validate={(row) => row.account_code ? null : 'Thiếu mã TK'}
 *   onImport={(data) => saveAccounts(data)}
 *   onClose={() => setShowImport(false)}
 * />
 */

import React, { useState, useCallback, useRef } from 'react';
import { FormModal } from './FormModal';
import { formatNumber } from '../utils/format';
import { downloadExcelTemplate, type TemplateDefinition } from '../utils/excelTemplates';
import logger from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface ColumnDef {
    key: string;
    label: string;
    required?: boolean;
    aliases?: string[];
    type?: 'string' | 'number' | 'date';
    width?: string;
}

export interface ImportRow {
    _rowNumber: number;
    _status: 'valid' | 'warning' | 'error';
    _errors: string[];
    [key: string]: any;
}

export interface ExcelImportModalProps<T = any> {
    title: string;
    columns: ColumnDef[];
    onClose: () => void;
    onImport: (data: T[]) => Promise<void> | void;
    validate?: (row: T, allRows: T[]) => string | null;
    templateFileName?: string;
    maxRows?: number;
    description?: string;
    /** Enhanced template with sample data and instructions */
    enhancedTemplate?: TemplateDefinition;
}

// ============================================
// COMPONENT
// ============================================

export function ExcelImportModal<T = any>({
    title,
    columns,
    onClose,
    onImport,
    validate,
    templateFileName = 'template',
    maxRows = 1000,
    description,
    enhancedTemplate,
}: ExcelImportModalProps<T>) {
    const [file, setFile] = useState<File | null>(null);
    const [items, setItems] = useState<ImportRow[]>([]);
    const [status, setStatus] = useState<'idle' | 'reading' | 'validating' | 'ready' | 'importing' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Build column aliases map
    const columnAliasMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        columns.forEach(col => {
            map[col.key.toLowerCase()] = col.key;
            map[col.label.toLowerCase()] = col.key;
            col.aliases?.forEach(alias => {
                map[alias.toLowerCase()] = col.key;
            });
        });
        return map;
    }, [columns]);

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

    const handleFile = async (selectedFile: File) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
            setStatus('error');
            setErrorMessage('Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc CSV');
            return;
        }

        setFile(selectedFile);
        setStatus('reading');
        setErrorMessage('');

        try {
            const XLSX = await import('xlsx');
            const buffer = await selectedFile.arrayBuffer();
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

            // Parse header
            const headerRow = rows[0] as string[];
            const columnMap = buildColumnMap(headerRow);

            // Check required columns
            const missingCols = columns
                .filter(col => col.required)
                .filter(col => columnMap[col.key] === undefined)
                .map(col => col.label);

            if (missingCols.length > 0) {
                throw new Error(`Thiếu cột bắt buộc: ${missingCols.join(', ')}`);
            }

            // Parse data rows
            setStatus('validating');
            const parsedItems: ImportRow[] = [];

            for (let i = 1; i < Math.min(rows.length, maxRows + 1); i++) {
                const row = rows[i] as any[];
                if (!row || row.every(cell => !cell)) continue;

                const item = parseRow(row, columnMap, i + 1);
                parsedItems.push(item);
            }

            // Validate all rows
            parsedItems.forEach(item => {
                validateRow(item, parsedItems);
            });

            setItems(parsedItems);
            setStatus(parsedItems.length > 0 ? 'ready' : 'error');

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
            const targetKey = columnAliasMap[normalized];
            if (targetKey && map[targetKey] === undefined) {
                map[targetKey] = index;
            }
        });

        return map;
    };

    const parseRow = (row: any[], columnMap: Record<string, number>, rowNumber: number): ImportRow => {
        const item: ImportRow = {
            _rowNumber: rowNumber,
            _status: 'valid',
            _errors: [],
        };

        columns.forEach(col => {
            const index = columnMap[col.key];
            let value = index !== undefined ? row[index] : undefined;

            // Type conversion
            if (col.type === 'number' && value !== undefined) {
                value = parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
            } else if (col.type === 'date' && value !== undefined) {
                if (value instanceof Date) {
                    value = value.toISOString().split('T')[0];
                } else if (typeof value === 'number') {
                    // Excel date serial
                    const date = new Date((value - 25569) * 86400 * 1000);
                    value = date.toISOString().split('T')[0];
                }
            } else if (value !== undefined) {
                value = String(value).trim();
            }

            item[col.key] = value;
        });

        return item;
    };

    const validateRow = (item: ImportRow, allItems: ImportRow[]) => {
        const errors: string[] = [];

        // Check required fields
        columns.forEach(col => {
            if (col.required && !item[col.key]) {
                errors.push(`Thiếu ${col.label}`);
            }
        });

        // Custom validation
        if (validate) {
            const customError = validate(item as unknown as T, allItems as unknown as T[]);
            if (customError) {
                errors.push(customError);
            }
        }

        item._errors = errors;
        item._status = errors.length > 0 ? 'error' : 'valid';
    };

    const handleImport = async () => {
        const validItems = items.filter(item => item._status === 'valid');
        if (validItems.length === 0) {
            setErrorMessage('Không có dữ liệu hợp lệ để nhập');
            return;
        }

        setImporting(true);
        try {
            // Remove internal fields before passing to onImport
            const cleanData = validItems.map(item => {
                const { _rowNumber, _status, _errors, ...data } = item;
                return data as T;
            });

            await onImport(cleanData);
            onClose();
        } catch (err: any) {
            setErrorMessage(err.message || 'Lỗi khi nhập dữ liệu');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = async () => {
        // Use enhanced template if provided
        if (enhancedTemplate) {
            await downloadExcelTemplate(enhancedTemplate);
            return;
        }

        // Fallback to basic template generation
        const XLSX = await import('xlsx');

        // Create sample data
        const headers = columns.map(col => col.label);
        const sampleRow = columns.map(col => {
            if (col.type === 'number') return 0;
            if (col.type === 'date') return new Date().toISOString().split('T')[0];
            return `VD: ${col.label}`;
        });

        const wsData = [headers, sampleRow];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = columns.map(col => ({ wch: col.width ? parseInt(col.width) : 15 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data');

        XLSX.writeFile(wb, `${templateFileName}_mau.xlsx`);
    };

    const reset = () => {
        setFile(null);
        setItems([]);
        setStatus('idle');
        setErrorMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Statistics
    const validCount = items.filter(i => i._status === 'valid').length;
    const errorCount = items.filter(i => i._status === 'error').length;

    return (
        <FormModal title={title} onClose={onClose} icon="upload_file" sizeClass="max-w-5xl">
            {status === 'idle' && (
                <div className="section-gap">
                    {description && (
                        <p className="text-body">{description}</p>
                    )}

                    {/* Template download */}
                    <div className="panel flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white">Tải mẫu Excel</p>
                            <p className="text-sm text-slate-500">Tải file mẫu với các cột chuẩn để nhập liệu</p>
                        </div>
                        <button
                            onClick={downloadTemplate}
                            className="form-button-secondary flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined icon-md">download</span>
                            Tải mẫu
                        </button>
                    </div>

                    {/* File upload area */}
                    <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                        <span className="material-symbols-outlined icon-xl text-slate-400 mb-3">cloud_upload</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                            Kéo thả file hoặc click để chọn
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Hỗ trợ: Excel (.xlsx, .xls) và CSV
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Column hints */}
                    <div className="text-sm text-slate-500">
                        <p className="font-medium mb-2">Các cột cần có:</p>
                        <div className="flex flex-wrap gap-2">
                            {columns.map(col => (
                                <span
                                    key={col.key}
                                    className={`badge ${col.required ? 'badge-info' : 'badge-neutral'}`}
                                >
                                    {col.label} {col.required && '*'}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(status === 'reading' || status === 'validating') && (
                <div className="py-12 text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">
                        {status === 'reading' ? 'Đang đọc file...' : 'Đang kiểm tra dữ liệu...'}
                    </p>
                </div>
            )}

            {status === 'error' && (
                <div className="section-gap">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-400">Lỗi</p>
                            <p className="text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button onClick={reset} className="form-button-secondary">Thử lại</button>
                        <button onClick={onClose} className="form-button-primary">Đóng</button>
                    </div>
                </div>
            )}

            {status === 'ready' && (
                <div className="section-gap">
                    {/* Summary */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">description</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{file?.name}</span>
                        </div>
                        <span className="badge badge-success">{validCount} hợp lệ</span>
                        {errorCount > 0 && (
                            <span className="badge badge-error">{errorCount} lỗi</span>
                        )}
                    </div>

                    {/* Preview table */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="table-header sticky top-0">
                                <tr>
                                    <th className="table-header-cell w-16">#</th>
                                    <th className="table-header-cell w-20">Trạng thái</th>
                                    {columns.map(col => (
                                        <th key={col.key} className="table-header-cell">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className={`table-row ${item._status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                        <td className="table-cell font-mono">{item._rowNumber}</td>
                                        <td className="table-cell-center">
                                            {item._status === 'valid' ? (
                                                <span className="badge badge-success">OK</span>
                                            ) : (
                                                <span className="badge badge-error" title={item._errors.join(', ')}>
                                                    Lỗi
                                                </span>
                                            )}
                                        </td>
                                        {columns.map(col => (
                                            <td key={col.key} className={col.type === 'number' ? 'table-cell-number' : 'table-cell'}>
                                                {col.type === 'number'
                                                    ? formatNumber(item[col.key] || 0)
                                                    : item[col.key] || '-'
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Error details */}
                    {errorCount > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                                Các dòng lỗi sẽ không được nhập:
                            </p>
                            <ul className="text-sm text-amber-600 dark:text-amber-300 space-y-1">
                                {items.filter(i => i._status === 'error').slice(0, 5).map(item => (
                                    <li key={item._rowNumber}>
                                        Dòng {item._rowNumber}: {item._errors.join(', ')}
                                    </li>
                                ))}
                                {errorCount > 5 && (
                                    <li>... và {errorCount - 5} lỗi khác</li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="form-actions">
                        <button onClick={reset} className="form-button-secondary">Chọn file khác</button>
                        <button
                            onClick={handleImport}
                            disabled={validCount === 0 || importing}
                            className="form-button-primary flex items-center gap-2"
                        >
                            {importing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Đang nhập...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined icon-md">check</span>
                                    Nhập {validCount} dòng
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </FormModal>
    );
}

export default ExcelImportModal;
