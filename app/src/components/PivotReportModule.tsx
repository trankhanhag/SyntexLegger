/**
 * PivotReportModule - Báo cáo Pivot Đa chiều
 * SyntexLegger - Hệ thống kế toán Doanh nghiệp theo TT 99/2025
 *
 * Cho phép người dùng tạo báo cáo pivot với khả năng:
 * - Chọn chiều phân tích làm hàng (rows)
 * - Chọn chiều phân tích làm cột (columns)
 * - Chọn số liệu để tổng hợp (values)
 * - Export Excel định dạng pivot table
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { reportService, dimensionService } from '../api';
import { FormModal, FormSection, FormGrid, FormField, FormButton, FormActions } from './FormModal';
import { toInputDateValue } from '../utils/dateUtils';

interface DimensionConfig {
    id: number;
    name: string;
    label: string;
    isActive: number;
}

interface PivotData {
    rows: string[];
    cols: string[];
    values: Record<string, Record<string, number>>;
    rowTotals: Record<string, number>;
    colTotals: Record<string, number>;
    grandTotal: number;
}

interface PivotReportModuleProps {
    onClose?: () => void;
}

export const PivotReportModule: React.FC<PivotReportModuleProps> = ({ onClose }) => {
    // State
    const [loading, setLoading] = useState(false);
    const [dimensionConfigs, setDimensionConfigs] = useState<DimensionConfig[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [pivotData, setPivotData] = useState<PivotData | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(true);

    // Config state
    const [config, setConfig] = useState({
        fromDate: toInputDateValue(new Date(new Date().getFullYear(), 0, 1)),
        toDate: toInputDateValue(new Date(new Date().getFullYear(), 11, 31)),
        rowDimension: 'dim1',
        colDimension: 'dim2',
        valueField: 'amount',
        aggregation: 'sum' as 'sum' | 'count' | 'avg'
    });

    // Load dimension configs on mount
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const res = await dimensionService.getConfigs();
                const configs = Array.isArray(res.data) ? res.data : [];
                setDimensionConfigs(configs.filter((c: DimensionConfig) => c.isActive === 1));
            } catch (err) {
                console.error('Failed to load dimension configs:', err);
            }
        };
        loadConfigs();
    }, []);

    // Dimension options for select
    const dimensionOptions = useMemo(() => {
        const baseOptions = [
            { value: 'account_code', label: 'Tài khoản' },
            { value: 'partner_code', label: 'Đối tượng' },
            { value: 'fund_source_code', label: 'Bộ phận' },
            { value: 'item_code', label: 'Mục chi' }
        ];

        const dimOptions = dimensionConfigs.map(cfg => ({
            value: `dim${cfg.id}`,
            label: cfg.label || cfg.name
        }));

        return [...baseOptions, ...dimOptions];
    }, [dimensionConfigs]);

    // Load data and generate pivot
    const generatePivot = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch transaction details
            const res = await reportService.getTransactionDetails({
                fromDate: config.fromDate,
                toDate: config.toDate
            });
            const data = Array.isArray(res.data) ? res.data : [];
            setRawData(data);

            // Generate pivot
            const pivot = computePivot(data, config.rowDimension, config.colDimension, config.valueField, config.aggregation);
            setPivotData(pivot);
            setShowConfigModal(false);
        } catch (err) {
            console.error('Failed to generate pivot:', err);
            alert('Lỗi khi tải dữ liệu báo cáo');
        } finally {
            setLoading(false);
        }
    }, [config]);

    // Compute pivot table from raw data
    const computePivot = (
        data: any[],
        rowField: string,
        colField: string,
        valueField: string,
        aggregation: 'sum' | 'count' | 'avg'
    ): PivotData => {
        const rows = new Set<string>();
        const cols = new Set<string>();
        const values: Record<string, Record<string, number[]>> = {};

        // Collect data
        data.forEach(row => {
            const rowKey = String(row[rowField] || '(Trống)');
            const colKey = String(row[colField] || '(Trống)');
            const value = Number(row[valueField]) || 0;

            rows.add(rowKey);
            cols.add(colKey);

            if (!values[rowKey]) values[rowKey] = {};
            if (!values[rowKey][colKey]) values[rowKey][colKey] = [];
            values[rowKey][colKey].push(value);
        });

        // Aggregate
        const aggregatedValues: Record<string, Record<string, number>> = {};
        const rowTotals: Record<string, number> = {};
        const colTotals: Record<string, number> = {};
        let grandTotal = 0;

        const sortedRows = Array.from(rows).sort();
        const sortedCols = Array.from(cols).sort();

        sortedRows.forEach(rowKey => {
            aggregatedValues[rowKey] = {};
            rowTotals[rowKey] = 0;

            sortedCols.forEach(colKey => {
                const cellValues = values[rowKey]?.[colKey] || [];
                let aggregated = 0;

                if (cellValues.length > 0) {
                    switch (aggregation) {
                        case 'sum':
                            aggregated = cellValues.reduce((a, b) => a + b, 0);
                            break;
                        case 'count':
                            aggregated = cellValues.length;
                            break;
                        case 'avg':
                            aggregated = cellValues.reduce((a, b) => a + b, 0) / cellValues.length;
                            break;
                    }
                }

                aggregatedValues[rowKey][colKey] = aggregated;
                rowTotals[rowKey] += aggregated;

                if (!colTotals[colKey]) colTotals[colKey] = 0;
                colTotals[colKey] += aggregated;

                grandTotal += aggregated;
            });
        });

        return {
            rows: sortedRows,
            cols: sortedCols,
            values: aggregatedValues,
            rowTotals,
            colTotals,
            grandTotal
        };
    };

    // Format number
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    };

    // Export to Excel
    const exportToExcel = useCallback(() => {
        if (!pivotData) return;

        const { rows, cols, values, rowTotals, colTotals, grandTotal } = pivotData;

        // Build worksheet data
        const wsData: any[][] = [];

        // Header row
        const rowLabel = dimensionOptions.find(o => o.value === config.rowDimension)?.label || config.rowDimension;
        const colLabel = dimensionOptions.find(o => o.value === config.colDimension)?.label || config.colDimension;
        wsData.push([`${rowLabel} \\ ${colLabel}`, ...cols, 'Tổng hàng']);

        // Data rows
        rows.forEach(rowKey => {
            const row: (string | number)[] = [rowKey];
            cols.forEach(colKey => {
                row.push(values[rowKey]?.[colKey] || 0);
            });
            row.push(rowTotals[rowKey] || 0);
            wsData.push(row);
        });

        // Total row
        const totalRow: (string | number)[] = ['Tổng cột'];
        cols.forEach(colKey => {
            totalRow.push(colTotals[colKey] || 0);
        });
        totalRow.push(grandTotal);
        wsData.push(totalRow);

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = [
            { wch: 25 },
            ...cols.map(() => ({ wch: 15 })),
            { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Pivot Report');
        XLSX.writeFile(wb, `BaoCao_Pivot_${config.fromDate}_${config.toDate}.xlsx`);
    }, [pivotData, config, dimensionOptions]);

    // Get dimension label
    const getDimensionLabel = (value: string) => {
        return dimensionOptions.find(o => o.value === value)?.label || value;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl">pivot_table_chart</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Báo cáo Pivot Đa chiều</h2>
                        <p className="text-xs text-slate-500">
                            {config.fromDate} - {config.toDate} | {getDimensionLabel(config.rowDimension)} × {getDimensionLabel(config.colDimension)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">settings</span>
                        <span className="text-sm font-medium">Cấu hình</span>
                    </button>
                    {pivotData && (
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            <span className="text-sm font-medium">Xuất Excel</span>
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                    </div>
                ) : pivotData ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                                        <th className="px-4 py-3 text-left font-bold text-purple-700 dark:text-purple-300 border-b border-r border-purple-100 dark:border-purple-800 sticky left-0 bg-purple-50 dark:bg-purple-900/30 z-10">
                                            {getDimensionLabel(config.rowDimension)} \ {getDimensionLabel(config.colDimension)}
                                        </th>
                                        {pivotData.cols.map(col => (
                                            <th key={col} className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200 border-b border-purple-100 dark:border-purple-800 whitespace-nowrap">
                                                {col}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-right font-black text-purple-700 dark:text-purple-300 border-b border-l border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30">
                                            Tổng hàng
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pivotData.rows.map((row, idx) => (
                                        <tr key={row} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-700/20'}>
                                            <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200 border-r border-slate-100 dark:border-slate-700 sticky left-0 bg-inherit z-10">
                                                {row}
                                            </td>
                                            {pivotData.cols.map(col => (
                                                <td key={col} className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-300">
                                                    {formatNumber(pivotData.values[row]?.[col] || 0)}
                                                </td>
                                            ))}
                                            <td className="px-4 py-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400 border-l border-purple-100 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                                                {formatNumber(pivotData.rowTotals[row] || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 font-bold">
                                        <td className="px-4 py-3 font-black text-purple-700 dark:text-purple-300 border-t border-r border-purple-200 dark:border-purple-700 sticky left-0 bg-purple-100 dark:bg-purple-900/40 z-10">
                                            Tổng cột
                                        </td>
                                        {pivotData.cols.map(col => (
                                            <td key={col} className="px-4 py-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400 border-t border-purple-200 dark:border-purple-700">
                                                {formatNumber(pivotData.colTotals[col] || 0)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-right font-mono font-black text-white bg-purple-600 dark:bg-purple-500 border-t border-l">
                                            {formatNumber(pivotData.grandTotal)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Summary */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                            <span>{rawData.length.toLocaleString()} bản ghi | {pivotData.rows.length} hàng × {pivotData.cols.length} cột</span>
                            <span>Tổng hợp: {config.aggregation === 'sum' ? 'Tổng' : config.aggregation === 'count' ? 'Đếm' : 'Trung bình'}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-30">pivot_table_chart</span>
                        <p className="text-lg font-medium">Chưa có dữ liệu</p>
                        <p className="text-sm">Nhấn "Cấu hình" để thiết lập báo cáo pivot</p>
                    </div>
                )}
            </div>

            {/* Config Modal */}
            {showConfigModal && (
                <FormModal
                    title="Cấu hình Báo cáo Pivot"
                    icon="settings"
                    size="md"
                    headerVariant="gradient"
                    headerColor="purple"
                    onClose={() => setShowConfigModal(false)}
                    footer={
                        <FormActions>
                            <FormButton variant="secondary" onClick={() => setShowConfigModal(false)}>Hủy</FormButton>
                            <FormButton variant="primary" onClick={generatePivot} disabled={loading}>
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-lg">play_arrow</span>
                                )}
                                Tạo báo cáo
                            </FormButton>
                        </FormActions>
                    }
                >
                    <FormSection title="Khoảng thời gian" variant="card" color="slate">
                        <FormGrid cols={2}>
                            <FormField label="Từ ngày" required>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={config.fromDate}
                                    onChange={e => setConfig({ ...config, fromDate: e.target.value })}
                                />
                            </FormField>
                            <FormField label="Đến ngày" required>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={config.toDate}
                                    onChange={e => setConfig({ ...config, toDate: e.target.value })}
                                />
                            </FormField>
                        </FormGrid>
                    </FormSection>

                    <FormSection title="Chiều phân tích" variant="highlight" color="blue">
                        <FormGrid cols={2}>
                            <FormField label="Chiều làm HÀNG (Rows)" required>
                                <select
                                    className="form-select"
                                    value={config.rowDimension}
                                    onChange={e => setConfig({ ...config, rowDimension: e.target.value })}
                                >
                                    {dimensionOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField label="Chiều làm CỘT (Columns)" required>
                                <select
                                    className="form-select"
                                    value={config.colDimension}
                                    onChange={e => setConfig({ ...config, colDimension: e.target.value })}
                                >
                                    {dimensionOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </FormField>
                        </FormGrid>
                    </FormSection>

                    <FormSection title="Số liệu tổng hợp" variant="card" color="green">
                        <FormGrid cols={2}>
                            <FormField label="Trường giá trị">
                                <select
                                    className="form-select"
                                    value={config.valueField}
                                    onChange={e => setConfig({ ...config, valueField: e.target.value })}
                                >
                                    <option value="amount">Số tiền (amount)</option>
                                    <option value="debit_amount">Phát sinh Nợ</option>
                                    <option value="credit_amount">Phát sinh Có</option>
                                    <option value="quantity">Số lượng</option>
                                </select>
                            </FormField>
                            <FormField label="Phép tổng hợp">
                                <select
                                    className="form-select"
                                    value={config.aggregation}
                                    onChange={e => setConfig({ ...config, aggregation: e.target.value as any })}
                                >
                                    <option value="sum">Tổng (SUM)</option>
                                    <option value="count">Đếm (COUNT)</option>
                                    <option value="avg">Trung bình (AVG)</option>
                                </select>
                            </FormField>
                        </FormGrid>
                    </FormSection>
                </FormModal>
            )}
        </div>
    );
};

export default PivotReportModule;
