/**
 * Report Preview Component
 * Preview generated report data and export options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { customReportService } from '../../api';
import type { SavedTemplate } from './index';
import { SmartTable, type ColumnDef } from '../SmartTable';
import { formatNumber } from '../../utils/format';
import { toInputDateValue } from '../../utils/dateUtils';
import { triggerBrowserPrint } from '../../hooks/usePrintHandler';

interface ReportPreviewProps {
    template?: SavedTemplate | null;
    fieldMappings?: Array<{
        originalText: string;
        table: string;
        column: string;
        type: string;
    }>;
    onBack: () => void;
    onSave?: (name: string, description: string, isShared: boolean) => void;
}

interface ReportResult {
    rows: any[];
    columns: { field: string; headerName: string; type: string }[];
    rowCount: number;
    generationTime: number;
    isPreview?: boolean;
    truncated?: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
    template,
    fieldMappings,
    onBack,
    onSave
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ReportResult | null>(null);
    const [filters, setFilters] = useState(() => {
        const now = new Date();
        return {
            fromDate: toInputDateValue(new Date(now.getFullYear(), 0, 1)),
            toDate: toInputDateValue(new Date(now.getFullYear(), 11, 31)),
            accountCode: '',
            partnerCode: ''
        };
    });

    const generateReport = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let response;

            if (template) {
                // Generate from saved template
                response = await customReportService.generateReport(template.id, {
                    filters,
                    outputFormat: 'json'
                });
            } else if (fieldMappings) {
                // Preview mode - unsaved template
                response = await customReportService.previewReport({
                    fieldMappings,
                    filters
                });
            } else {
                throw new Error('Không có template hoặc mappings');
            }

            setResult(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi tạo báo cáo');
        } finally {
            setLoading(false);
        }
    }, [template, fieldMappings, filters]);

    // Auto-generate on mount
    useEffect(() => {
        generateReport();
    }, []);

    const handleExportExcel = async () => {
        if (!template) {
            setError('Vui lòng lưu template trước khi xuất Excel');
            return;
        }

        try {
            const response = await customReportService.generateReport(template.id, {
                filters,
                outputFormat: 'excel'
            });

            // Create blob and download
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${template.name}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi xuất Excel');
        }
    };

    const handlePrint = () => {
        triggerBrowserPrint();
    };

    // Build SmartTable columns
    const columns: ColumnDef[] = result?.columns.map(col => ({
        field: col.field,
        headerName: col.headerName,
        width: col.type === 'number' ? 'w-32' : 'min-w-[120px]',
        align: col.type === 'number' ? 'right' as const : undefined,
        type: col.type as any,
        renderCell: col.type === 'number'
            ? (v: any) => v != null ? formatNumber(v) : '-'
            : undefined
    })) || [];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        <span className="text-sm">Quay lại</span>
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {template ? template.name : 'Xem trước báo cáo'}
                    </h2>
                    {result?.isPreview && (
                        <p className="text-sm text-amber-600">
                            Chế độ xem trước - Tối đa 100 dòng
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {!template && onSave && (
                        <button
                            onClick={() => {
                                const name = prompt('Nhập tên template:');
                                if (name) onSave(name, '', false);
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Lưu Template
                        </button>
                    )}
                    {template && (
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Xuất Excel
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">print</span>
                        In
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tài khoản</label>
                        <input
                            type="text"
                            value={filters.accountCode}
                            onChange={(e) => setFilters(prev => ({ ...prev, accountCode: e.target.value }))}
                            placeholder="111, 112..."
                            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 w-24"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Đối tượng</label>
                        <input
                            type="text"
                            value={filters.partnerCode}
                            onChange={(e) => setFilters(prev => ({ ...prev, partnerCode: e.target.value }))}
                            placeholder="Mã đối tượng"
                            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 w-32"
                        />
                    </div>
                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-sm font-medium flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[16px]">refresh</span>
                                Tạo báo cáo
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {error}
                </div>
            )}

            {/* Result stats */}
            {result && (
                <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">table_rows</span>
                        {result.rowCount} dòng
                        {result.truncated && <span className="text-amber-600">(đã cắt)</span>}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">timer</span>
                        {result.generationTime}ms
                    </span>
                </div>
            )}

            {/* Data table */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                            <span>Đang tạo báo cáo...</span>
                        </div>
                    </div>
                ) : result && result.rows.length > 0 ? (
                    <SmartTable
                        data={result.rows}
                        columns={columns}
                        keyField="id"
                    />
                ) : (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <span className="material-symbols-outlined text-4xl">table_rows</span>
                            <span>Không có dữ liệu phù hợp</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
