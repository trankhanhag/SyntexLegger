import React, { useState, useEffect, useCallback } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { DateInput } from './DateInput';
import { FormModal } from './FormModal';
import { debtService } from '../api';
import { type RibbonAction } from './Ribbon';
import { toInputDateValue } from '../utils/dateUtils';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { useSimplePrint, triggerBrowserPrint } from '../hooks/usePrintHandler';
import { ExcelImportModal } from './ExcelImportModal';
import { DEBT_TEMPLATE } from '../utils/excelTemplates';
import logger from '../utils/logger';

interface DebtManagementModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (view: string) => void;
}

export const DebtManagementModule: React.FC<DebtManagementModuleProps> = ({ subView = 'temp_advances', printSignal = 0, onSetHeader, onNavigate: _onNavigate }) => {
    const [view, setView] = useState(subView);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // Data states
    const [tempAdvances, setTempAdvances] = useState<any[]>([]);
    const [budgetAdvances, setBudgetAdvances] = useState<any[]>([]);
    const [receivables, setReceivables] = useState<any[]>([]);
    const [payables, setPayables] = useState<any[]>([]);

    // Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    // Aging report states
    const [showAgingReport, setShowAgingReport] = useState(false);
    const [agingReportData, setAgingReportData] = useState<any>(null);
    const [agingReportType, setAgingReportType] = useState<'receivables' | 'payables'>('receivables');

    useEffect(() => {
        setView(subView);
    }, [subView]);

    useEffect(() => {
        fetchData();
    }, [view]);

    // Print handler
    useSimplePrint(printSignal, 'Công nợ', { allowBrowserPrint: true });

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'temp_advances') {
                const res = await debtService.getTemporaryAdvances();
                setTempAdvances(res.data);
            } else if (view === 'budget_advances') {
                const res = await debtService.getBudgetAdvances();
                setBudgetAdvances(res.data);
            } else if (view === 'receivables') {
                const res = await debtService.getReceivables();
                setReceivables(res.data);
            } else if (view === 'payables') {
                const res = await debtService.getPayables();
                setPayables(res.data);
            }
        } catch (err) {
            logger.error("Fetch debt data failed:", err);
        } finally {
            setLoading(false);
        }
    };

    // Excel import handler
    const handleImportFromExcel = useCallback(async (rows: any[]) => {
        if (rows.length === 0) return;

        setImporting(true);
        setImportProgress({ current: 0, total: rows.length });
        setShowImportModal(false);

        let successCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            setImportProgress({ current: i + 1, total: rows.length });

            try {
                if (view === 'temp_advances') {
                    await debtService.createTemporaryAdvance({
                        doc_no: rows[i].doc_no || rows[i]['Số CT (*)'],
                        doc_date: rows[i].doc_date || rows[i]['Ngày TƯ (*)'] || toInputDateValue(),
                        employee_name: rows[i].employee_name || rows[i]['Người tạm ứng (*)'],
                        purpose: rows[i].purpose || rows[i]['Mục đích'],
                        amount: parseFloat(rows[i].amount || rows[i]['Số tiền (*)'] || 0)
                    });
                } else if (view === 'receivables') {
                    await debtService.createReceivable({
                        doc_no: rows[i].doc_no || rows[i]['Số CT (*)'],
                        doc_date: rows[i].doc_date || rows[i]['Ngày CT (*)'] || toInputDateValue(),
                        partner_name: rows[i].partner_name || rows[i]['Đối tác (*)'],
                        account_code: rows[i].account_code || rows[i]['Tài khoản'] || '136',
                        description: rows[i].description || rows[i]['Nội dung'],
                        original_amount: parseFloat(rows[i].amount || rows[i]['Số tiền (*)'] || 0),
                        due_date: rows[i].due_date || rows[i]['Hạn TT']
                    });
                } else if (view === 'payables') {
                    await debtService.createPayable({
                        doc_no: rows[i].doc_no || rows[i]['Số CT (*)'],
                        doc_date: rows[i].doc_date || rows[i]['Ngày CT (*)'] || toInputDateValue(),
                        partner_name: rows[i].partner_name || rows[i]['Nhà cung cấp (*)'],
                        account_code: rows[i].account_code || rows[i]['Tài khoản'] || '331',
                        description: rows[i].description || rows[i]['Nội dung'],
                        original_amount: parseFloat(rows[i].amount || rows[i]['Số tiền (*)'] || 0),
                        due_date: rows[i].due_date || rows[i]['Hạn TT']
                    });
                }
                successCount++;
            } catch (err: any) {
                const docNo = rows[i].doc_no || rows[i]['Số CT (*)'] || `Dòng ${i + 1}`;
                errors.push(`${docNo}: ${err.response?.data?.error || err.message}`);
            }
        }

        setImporting(false);

        if (errors.length === 0) {
            alert(`Nhập thành công ${successCount} bản ghi!`);
        } else {
            alert(`Nhập ${successCount}/${rows.length} bản ghi.\n\nLỗi:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...và ${errors.length - 5} lỗi khác` : ''}`);
        }

        fetchData();
    }, [view]);

    useEffect(() => {
        if (onSetHeader) {
            const getTitle = () => {
                switch (view) {
                    case 'temp_advances': return 'Quản lý Tạm ứng (TK 141)';
                    case 'budget_advances': return 'Cho vay nội bộ (TK 128)';
                    case 'receivables': return 'Công nợ phải thu (TK 131, 136, 138)';
                    case 'payables': return 'Công nợ phải trả (TK 331, 333, 334)';
                    default: return 'Quản lý Công nợ';
                }
            };

            const actions: RibbonAction[] = [];

            actions.push({
                label: view === 'temp_advances' ? 'Tạo tạm ứng' :
                    view === 'budget_advances' ? 'Tạo cho vay' :
                        view === 'receivables' ? 'Tạo phải thu' : 'Tạo phải trả',
                icon: 'add_circle',
                onClick: () => setShowForm(true),
                primary: true
            });

            if (view !== 'budget_advances') {
                actions.push({
                    label: 'Nhập từ Excel',
                    icon: 'upload_file',
                    onClick: () => setShowImportModal(true)
                });
            }

            actions.push({ label: 'Làm mới', icon: 'refresh', onClick: fetchData });
            actions.push({ label: 'In danh sách', icon: 'print', onClick: () => triggerBrowserPrint() });

            if (view === 'receivables' || view === 'payables') {
                actions.push({
                    label: 'Phân tích theo tuổi',
                    icon: 'analytics',
                    onClick: async () => {
                        try {
                            const type = view === 'receivables' ? 'receivables' : 'payables';
                            const res = await debtService.getAgingReport(type as any);
                            setAgingReportData(res.data);
                            setAgingReportType(type as 'receivables' | 'payables');
                            setShowAgingReport(true);
                        } catch (e) {
                            logger.error(e);
                            alert('Không thể tải báo cáo phân tích tuổi nợ.');
                        }
                    }
                });
            }

            onSetHeader({ title: getTitle(), icon: 'account_balance_wallet', actions, onDelete: handleDeleteSelected });
        }
    }, [view, onSetHeader, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedRow.doc_no || 'mục đã chọn'}?`)) return;

        try {
            if (view === 'temp_advances') {
                await debtService.deleteTemporaryAdvance(selectedRow.id);
            } else if (view === 'budget_advances') {
                await debtService.deleteBudgetAdvance(selectedRow.id);
            } else if (view === 'receivables') {
                await debtService.deleteReceivable(selectedRow.id);
            } else {
                await debtService.deletePayable(selectedRow.id);
            }
            alert("Đã xóa thành công.");
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    // formatCurrency is reserved for future use if needed

    // Column Definitions
    const tempAdvancesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'doc_date', headerName: 'Ngày TƯ', width: 'w-28', type: 'date' },
        { field: 'employee_name', headerName: 'Người tạm ứng', width: 'min-w-[200px]' },
        { field: 'purpose', headerName: 'Mục đích', width: 'min-w-[250px]' },
        {
            field: 'amount', headerName: 'Tạm ứng', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'settled_amount', headerName: 'Đã quyết toán', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'PENDING': 'bg-yellow-100 text-yellow-700',
                    'PARTIAL': 'bg-blue-100 text-blue-700',
                    'SETTLED': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const budgetAdvancesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'fiscal_year', headerName: 'Năm NS', width: 'w-20', align: 'center' },
        { field: 'advance_type', headerName: 'Loại ứng', width: 'w-32' },
        {
            field: 'amount', headerName: 'Số tiền ứng', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'repaid_amount', headerName: 'Đã hoàn', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        { field: 'repayment_deadline', headerName: 'Hạn hoàn', width: 'w-28', type: 'date' },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'ACTIVE': 'bg-blue-100 text-blue-700',
                    'REPAID': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const receivablesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'doc_date', headerName: 'Ngày CT', width: 'w-28', type: 'date' },
        { field: 'partner_name', headerName: 'Đối tác', width: 'min-w-[200px]' },
        { field: 'account_code', headerName: 'TK', width: 'w-16' },
        { field: 'description', headerName: 'Nội dung', width: 'min-w-[250px]' },
        {
            field: 'original_amount', headerName: 'Nợ gốc', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'received_amount', headerName: 'Đã thu', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        { field: 'due_date', headerName: 'Hạn TT', width: 'w-28', type: 'date' },
        {
            field: 'status', headerName: 'TT', width: 'w-24', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'UNPAID': 'bg-yellow-100 text-yellow-700',
                    'PARTIAL': 'bg-blue-100 text-blue-700',
                    'PAID': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const payablesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'doc_date', headerName: 'Ngày CT', width: 'w-28', type: 'date' },
        { field: 'partner_name', headerName: 'Nhà cung cấp', width: 'min-w-[200px]' },
        { field: 'account_code', headerName: 'TK', width: 'w-16' },
        { field: 'description', headerName: 'Nội dung', width: 'min-w-[250px]' },
        {
            field: 'original_amount', headerName: 'Nợ gốc', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'paid_amount', headerName: 'Đã trả', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        { field: 'due_date', headerName: 'Hạn TT', width: 'w-28', type: 'date' },
        {
            field: 'status', headerName: 'TT', width: 'w-24', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'UNPAID': 'bg-yellow-100 text-yellow-700',
                    'PARTIAL': 'bg-blue-100 text-blue-700',
                    'PAID': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const getCurrentData = () => {
        switch (view) {
            case 'temp_advances': return tempAdvances;
            case 'budget_advances': return budgetAdvances;
            case 'receivables': return receivables;
            case 'payables': return payables;
            default: return [];
        }
    };

    const getCurrentColumns = () => {
        switch (view) {
            case 'temp_advances': return tempAdvancesColumns;
            case 'budget_advances': return budgetAdvancesColumns;
            case 'receivables': return receivablesColumns;
            case 'payables': return payablesColumns;
            default: return [];
        }
    };

    // Show ModuleOverview when view is 'overview' or empty
    if (view === 'overview' || view === '' || !view) {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.loan.title}
                description={MODULE_CONFIGS.loan.description}
                icon={MODULE_CONFIGS.loan.icon}
                iconColor={MODULE_CONFIGS.loan.iconColor}
                workflow={MODULE_CONFIGS.loan.workflow}
                features={MODULE_CONFIGS.loan.features}
                stats={[
                    { icon: 'savings', label: 'Tạm ứng (141)', value: tempAdvances.length || '-', color: 'blue' },
                    { icon: 'account_balance', label: 'Cho vay (128)', value: budgetAdvances.length || 0, color: 'green' },
                    { icon: 'credit_score', label: 'Phải thu', value: receivables.length || 0, color: 'amber' },
                    { icon: 'credit_card', label: 'Phải trả', value: payables.length || 0, color: 'purple' },
                ]}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <SmartTable data={getCurrentData()} columns={getCurrentColumns()} keyField="id" onSelectionChange={setSelectedRow} minRows={15} />
            </div>

            {showForm && (
                <DebtFormModal
                    view={view}
                    onClose={() => setShowForm(false)}
                    onRefresh={fetchData}
                />
            )}

            {/* Excel Import Modal */}
            {showImportModal && (
                <ExcelImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportFromExcel}
                    title={view === 'temp_advances' ? 'Nhập tạm ứng từ Excel' : view === 'receivables' ? 'Nhập công nợ phải thu' : 'Nhập công nợ phải trả'}
                    enhancedTemplate={DEBT_TEMPLATE}
                    columns={[
                        { key: 'doc_no', label: 'Số CT', required: true },
                        { key: 'doc_date', label: 'Ngày CT', required: true },
                        { key: 'partner_name', label: 'Đối tác', required: true },
                        { key: 'account_code', label: 'Tài khoản' },
                        { key: 'description', label: 'Nội dung' },
                        { key: 'amount', label: 'Số tiền', required: true },
                        { key: 'due_date', label: 'Hạn thanh toán' }
                    ]}
                />
            )}

            {/* Import Progress Overlay */}
            {importing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-2xl text-center max-w-md">
                        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                            Đang nhập công nợ...
                        </p>
                        <p className="text-2xl font-mono text-amber-600 mt-2">
                            {importProgress.current} / {importProgress.total}
                        </p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-4">
                            <div
                                className="bg-amber-600 h-2 rounded-full transition-all"
                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Aging Report Modal */}
            {showAgingReport && agingReportData && (
                <FormModal
                    title={agingReportType === 'receivables' ? 'Phân tích tuổi nợ phải thu' : 'Phân tích tuổi nợ phải trả'}
                    onClose={() => setShowAgingReport(false)}
                    icon="analytics"
                    sizeClass="max-w-4xl"
                >
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="text-[10px] font-bold text-green-600 uppercase">0-30 ngày</div>
                                <div className="text-xl font-black text-green-700 dark:text-green-400">
                                    {formatNumber(agingReportData.buckets?.['0-30'] || 0)}
                                </div>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <div className="text-[10px] font-bold text-yellow-600 uppercase">31-60 ngày</div>
                                <div className="text-xl font-black text-yellow-700 dark:text-yellow-400">
                                    {formatNumber(agingReportData.buckets?.['31-60'] || 0)}
                                </div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                                <div className="text-[10px] font-bold text-orange-600 uppercase">61-90 ngày</div>
                                <div className="text-xl font-black text-orange-700 dark:text-orange-400">
                                    {formatNumber(agingReportData.buckets?.['61-90'] || 0)}
                                </div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="text-[10px] font-bold text-red-600 uppercase">Quá 90 ngày</div>
                                <div className="text-xl font-black text-red-700 dark:text-red-400">
                                    {formatNumber(agingReportData.buckets?.['90+'] || 0)}
                                </div>
                            </div>
                        </div>

                        {/* Detail table */}
                        {agingReportData.details && agingReportData.details.length > 0 ? (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold">Đối tác</th>
                                            <th className="px-3 py-2 text-right font-bold">0-30 ngày</th>
                                            <th className="px-3 py-2 text-right font-bold">31-60 ngày</th>
                                            <th className="px-3 py-2 text-right font-bold">61-90 ngày</th>
                                            <th className="px-3 py-2 text-right font-bold">Quá 90 ngày</th>
                                            <th className="px-3 py-2 text-right font-bold">Tổng cộng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agingReportData.details.map((item: any, idx: number) => (
                                            <tr key={idx} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-3 py-2 font-medium">{item.partner_name || item.partner_code || 'N/A'}</td>
                                                <td className="px-3 py-2 text-right font-mono text-green-600">{formatNumber(item['0-30'] || 0)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-yellow-600">{formatNumber(item['31-60'] || 0)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-orange-600">{formatNumber(item['61-90'] || 0)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-red-600">{formatNumber(item['90+'] || 0)}</td>
                                                <td className="px-3 py-2 text-right font-mono font-bold">{formatNumber(item.total || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold">
                                        <tr>
                                            <td className="px-3 py-2">TỔNG CỘNG</td>
                                            <td className="px-3 py-2 text-right font-mono text-green-600">{formatNumber(agingReportData.buckets?.['0-30'] || 0)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-yellow-600">{formatNumber(agingReportData.buckets?.['31-60'] || 0)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-orange-600">{formatNumber(agingReportData.buckets?.['61-90'] || 0)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-red-600">{formatNumber(agingReportData.buckets?.['90+'] || 0)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{formatNumber(agingReportData.total || 0)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                                <p>Không có dữ liệu công nợ để phân tích</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setShowAgingReport(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </FormModal>
            )}
        </div>
    );
};

const DebtFormModal = ({ view, onClose, onRefresh }: { view: string, onClose: () => void, onRefresh: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>({
        doc_no: '',
        doc_date: toInputDateValue(),
        amount: 0,
        // Common fields will be added conditionally below
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            if (view === 'temp_advances') {
                await debtService.createTemporaryAdvance({
                    ...formData,
                    employee_name: formData.employee_name || 'N/A',
                    purpose: formData.purpose || ''
                });
            } else if (view === 'budget_advances') {
                await debtService.createBudgetAdvance({
                    ...formData,
                    fiscal_year: new Date(formData.doc_date).getFullYear(),
                    advance_type: formData.advance_type || 'NEXT_YEAR'
                });
            } else if (view === 'receivables') {
                await debtService.createReceivable({
                    ...formData,
                    account_code: formData.account_code || '136',
                    original_amount: formData.amount
                });
            } else {
                await debtService.createPayable({
                    ...formData,
                    account_code: formData.account_code || '331',
                    original_amount: formData.amount
                });
            }
            alert("Lưu thông tin thành công!");
            onRefresh();
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Có lỗi xảy ra khi lưu.");
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (view) {
            case 'temp_advances': return 'Tạo Tạm ứng mới';
            case 'budget_advances': return 'Tạo Cho vay nội bộ';
            case 'receivables': return 'Tạo Công nợ phải thu';
            case 'payables': return 'Tạo Công nợ phải trả';
            default: return 'Tạo mới';
        }
    };

    return (
        <FormModal
            title={getTitle()}
            onClose={onClose}
            icon="account_balance_wallet"
            sizeClass="max-w-2xl"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="form-label">Số chứng từ</span>
                        <input
                            className="form-input font-bold text-blue-600"
                            value={formData.doc_no}
                            onChange={e => setFormData({ ...formData, doc_no: e.target.value })}
                            placeholder="TU-001, UNS-001, PT-001, PTR-001..."
                        />
                    </label>
                    <label className="block">
                        <span className="form-label">Ngày chứng từ</span>
                        <DateInput
                            className="form-input"
                            value={formData.doc_date}
                            onChange={val => setFormData({ ...formData, doc_date: val })}
                        />
                    </label>
                </div>

                {view === 'temp_advances' && (
                    <>
                        <label className="block">
                            <span className="form-label">Người nhận tạm ứng</span>
                            <input
                                className="form-input"
                                value={formData.employee_name}
                                onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                            />
                        </label>
                        <label className="block">
                            <span className="form-label">Mục đích</span>
                            <textarea
                                rows={2}
                                className="form-textarea"
                                value={formData.purpose}
                                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                placeholder="Công tác, mua sắm..."
                            />
                        </label>
                    </>
                )}

                {view === 'budget_advances' && (
                    <>
                        <label className="block">
                            <span className="form-label">Loại ứng</span>
                            <select
                                className="form-select"
                                value={formData.advance_type}
                                onChange={e => setFormData({ ...formData, advance_type: e.target.value })}
                            >
                                <option value="NEXT_YEAR">Ứng năm sau</option>
                                <option value="EMERGENCY">Ứng khẩn cấp</option>
                                <option value="SUPPLEMENTARY">Ứng bổ sung</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="form-label">Văn bản phê duyệt</span>
                            <input
                                className="form-input"
                                value={formData.approval_doc}
                                onChange={e => setFormData({ ...formData, approval_doc: e.target.value })}
                            />
                        </label>
                    </>
                )}

                {(view === 'receivables' || view === 'payables') && (
                    <>
                        <label className="block">
                            <span className="form-label">Đối tác</span>
                            <input
                                className="form-input"
                                value={formData.partner_name}
                                onChange={e => setFormData({ ...formData, partner_name: e.target.value })}
                            />
                        </label>
                        <label className="block">
                            <span className="form-label">Tài khoản</span>
                            <input
                                className="form-input"
                                value={formData.account_code}
                                onChange={e => setFormData({ ...formData, account_code: e.target.value })}
                                placeholder={view === 'receivables' ? '136, 138' : '331, 336, 338'}
                            />
                        </label>
                        <label className="block">
                            <span className="form-label">Nội dung</span>
                            <textarea
                                rows={2}
                                className="form-textarea"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </label>
                    </>
                )}

                <label className="block">
                    <span className="form-label">Số tiền</span>
                    <input
                        type="number"
                        className="form-input font-mono font-bold text-blue-600"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                </label>

                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary" disabled={loading}>Hủy</button>
                    <button
                        onClick={handleSave}
                        className="form-button-primary flex items-center gap-2"
                        disabled={loading}
                    >
                        <span className="material-symbols-outlined">save</span>
                        {loading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>
        </FormModal>
    );
};
