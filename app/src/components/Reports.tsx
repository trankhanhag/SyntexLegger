import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import api, { reportService, settingsService } from '../api';
import { SmartTable, type ColumnDef } from './SmartTable';
import { formatNumber } from '../utils/format';
import { type RibbonAction } from './Ribbon';
import { DateInput } from './DateInput';
import { formatDateVN, toInputDateValue } from '../utils/dateUtils';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { type PaperSize, getPaperDimensions, getPaperSizeClass, PrintConfigControls, normalizePrintConfig } from './PrintTemplates';
import { PrintPreviewShell } from './PrintPreviewShell';
import { CustomReportGenerator } from './CustomReportGenerator';

// Types for reports are now handled as any to allow flexibility with back-end schemas

interface ReportsProps {
    subView?: string;
    printSignal?: number;
    exportSignal?: number;
    importSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[] }) => void;
    onNavigate?: (view: string) => void;
}

const REPORT_NAMES: Record<string, string> = {
    // === BÁO CÁO TÀI CHÍNH HCSN (TT 24/2024) ===
    balance_sheet_hcsn: 'Bảng Cân đối Tài khoản Kế toán',  // Thay: Bảng Cân đối Kế toán DN
    activity_result: 'Báo cáo Kết quả Hoạt động',           // Thay: Báo cáo KQKD DN
    cash_flow: 'Báo cáo Lưu chuyển Tiền tệ',                // Giữ nguyên

    // === BÁO CÁO QUYẾT TOÁN HCSN (MỚI - TT 24/2024) ===
    budget_settlement_regular: 'Quyết toán Kinh phí Hoạt động Thường xuyên',
    budget_settlement_nonregular: 'Quyết toán Kinh phí Hoạt động Không thường xuyên',
    budget_settlement_capex: 'Quyết toán Kinh phí Đầu tư XDCB',
    budget_performance: 'Báo cáo Tình hình Thực hiện Dự toán',

    // === BÁO CÁO QUẢN LÝ HCSN (MỚI - TT 24/2024) ===
    fund_source_report: 'Báo cáo Quản lý và Sử dụng Kinh phí',
    infrastructure_report: 'Báo cáo Tài sản Kết cấu Hạ tầng',

    // === SỔ KẾ TOÁN (GIỮ NGUYÊN) ===
    trial_balance: 'Bảng Cân đối Tài khoản',
    ledger: 'Sổ Nhật ký chung',
    general_ledger: 'Sổ Cái',
    cash_book: 'Sổ Quỹ Tiền mặt',
    bank_book: 'Sổ Tiền gửi Ngân hàng',
    inventory_summary: 'Tổng hợp Vật tư, Công cụ',
    inventory_ledger: 'Sổ chi tiết Vật tư',

    // === BÁO CÁO KHÁC ===
    transaction_details: 'Báo cáo Chi tiết Bút toán'

    // === LOẠI BỎ: Báo cáo DN không áp dụng cho HCSN ===
    // REMOVED: balance_sheet (DN)
    // REMOVED: pnl (DN) 
    // REMOVED: debt_ledger (DN - HCSN không theo dõi công nợ như DN)
    // REMOVED: vat_in (HCSN không nộp VAT)
    // REMOVED: vat_out (HCSN không nộp VAT)
    // REMOVED: project_pnl (DN - HCSN dùng báo cáo dự toán thay thế)
    // REMOVED: expense_dept (DN)
};

export const Reports: React.FC<ReportsProps> = ({ subView: initialSubView = 'balance_sheet_hcsn', printSignal = 0, exportSignal = 0, importSignal = 0, onSetHeader }) => {
    const [activeSubView, setActiveSubView] = useState(initialSubView);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [paperSize, setPaperSize] = useState<PaperSize>('A4');
    const [companyInfo, setCompanyInfo] = useState({ name: 'TÊN ĐƠN VỊ', address: 'Địa chỉ đơn vị', maDVQHNS: '', taxCode: '' });
    const [headTitle, setHeadTitle] = useState('Thủ trưởng đơn vị');
    const [signatures, setSignatures] = useState({ preparer: '', chiefAccountant: '', director: '' });
    const [printConfig, setPrintConfig] = useState({ marginTop: 12, marginBottom: 12, marginLeft: 15, marginRight: 15, scale: 100 });
    const [filters, setFilters] = useState(() => {
        const now = new Date();
        return {
            fromDate: toInputDateValue(new Date(now.getFullYear(), 0, 1)),
            toDate: toInputDateValue(new Date(now.getFullYear(), 11, 31)),
            accountCode: '1111',
            partnerCode: '',
            projectId: ''
        };
    });

    useEffect(() => {
        if (printSignal > 0) setShowPrintPreview(true);
    }, [printSignal]);

    const getReportTitle = (viewId: string) => REPORT_NAMES[viewId] || 'Báo cáo';

    useEffect(() => {
        settingsService.getSettings()
            .then(res => {
                const s = res.data || {};
                setCompanyInfo({
                    name: s.company_name || 'TÊN ĐƠN VỊ',
                    address: s.company_address || 'Địa chỉ đơn vị',
                    maDVQHNS: s.madvqhns || s.ma_dvqhnS || '',
                    taxCode: s.company_tax_code || s.tax_code || ''
                });
                setHeadTitle(s.head_title || s.unit_head_title || s.director_title || 'Thủ trưởng đơn vị');
                setSignatures(prev => ({
                    preparer: s.report_preparer || s.preparer_name || prev.preparer,
                    chiefAccountant: s.chief_accountant || s.accountant_lead || prev.chiefAccountant,
                    director: s.director || s.ceo_name || s.legal_representative || prev.director
                }));
            })
            .catch(err => console.error('Load company info failed:', err));
    }, []);

    useEffect(() => {
        setActiveSubView(initialSubView);
    }, [initialSubView]);

    const isTraceableValue = (value: any): value is { value: any; source?: { type: 'link' | 'modal'; target: string; label?: string } } => {
        return value && typeof value === 'object' && 'value' in value;
    };

    const unwrapTraceableValue = (value: any) => (isTraceableValue(value) ? value.value : value);

    const toNumberValue = (value: any) => {
        const raw = unwrapTraceableValue(value);
        if (raw === null || raw === undefined || raw === '') return null;
        const num = Number(raw);
        return Number.isFinite(num) ? num : null;
    };

    const formatSignedNumber = (value: any) => {
        const num = toNumberValue(value);
        if (num === null) return '';
        const formatted = formatNumber(num);
        return num < 0 ? `-${formatted}` : formatted;
    };

    const renderNumberCell = (value: any) => {
        const formatted = formatSignedNumber(value);
        if (!formatted) return '';
        return <span className="font-mono tabular-nums">{formatted}</span>;
    };

    const renderDateCell = (value: any) => formatDateVN(unwrapTraceableValue(value));

    const getExportValue = (value: any, col: ColumnDef) => {
        const raw = unwrapTraceableValue(value);
        if (col.type === 'date') return formatDateVN(raw);
        if (col.type === 'number') {
            const num = toNumberValue(raw);
            return num ?? '';
        }
        return raw ?? '';
    };

    const exportToExcel = useCallback(() => {
        if (!entries.length) {
            window.alert('Không có dữ liệu để xuất Excel.');
            return;
        }

        const columns = getColumns();
        const rows = entries.map((row) => {
            const record: Record<string, any> = {};
            columns.forEach((col) => {
                record[col.headerName] = getExportValue(row[col.field], col);
            });
            return record;
        });

        const sheetName = (REPORT_NAMES[activeSubView] || 'BaoCao')
            .replace(/[\\/*?:\\[\\]]/g, '')
            .slice(0, 31) || 'BaoCao';
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns.map((col) => col.headerName) });
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        const safeView = activeSubView.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'report';
        const fileName = `BaoCao_${safeView}_${filters.fromDate}_${filters.toDate}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    }, [activeSubView, entries, filters]);

    useEffect(() => {
        if (onSetHeader) {
            onSetHeader({
                title: getReportTitle(activeSubView),
                icon: 'assignment_turned_in',
                actions: [
                    { label: 'Xem trước bản in', icon: 'print', onClick: () => setShowPrintPreview(true), primary: true },
                    { label: 'Xuất Excel', icon: 'table_chart', onClick: exportToExcel }
                ]
            });
        }
    }, [activeSubView, exportToExcel, onSetHeader]);

    // Handle export signal from Ribbon (for non-custom_report views)
    useEffect(() => {
        if (exportSignal > 0 && activeSubView !== 'custom_report') {
            exportToExcel();
        }
    }, [exportSignal, activeSubView, exportToExcel]);

    // Note: Import signal not handled in Reports module - reports are read-only views
    // Import functionality is handled by data entry modules (GeneralModule, etc.)

    // --- Traceability Enrichment Logic ---
    const enrichWithTraceability = (data: any[], type: string) => {
        if (!Array.isArray(data)) return [];
        return data.map(row => {
            const newRow = { ...row };

            // 1. Balance Sheet & PnL Traceability
            const currentValue = toNumberValue(row.current_period);
            if (['balance_sheet', 'pnl'].includes(type) && row.code && currentValue !== null && currentValue !== 0) {
                // Determine Account Root based on Report Code (Simple Logic for MVP)
                // In real app, we'd use the mapping from the backend or row.account_code if available
                // Assuming row.notes contains Account Code or similar, or we infer:
                // This is a naive heuristic for demonstration
                let accPrefix = '';
                if (type === 'balance_sheet') {
                    if (row.code.startsWith('11')) accPrefix = '11'; // Cash
                    else if (row.code.startsWith('13')) accPrefix = '13'; // Receivables
                    else if (row.code.startsWith('15')) accPrefix = '15'; // Inventory
                } else if (type === 'pnl') {
                    if (row.code === '01') accPrefix = '511'; // Revenue
                    if (row.code === '11') accPrefix = '632'; // COGS
                }

                if (accPrefix) {
                    newRow.current_period = {
                        value: row.current_period,
                        formula: `SUM(GL_Transactions) WHERE Account LIKE '${accPrefix}%'`,
                        source: {
                            type: 'link',
                            target: `#report-drill-gl-${accPrefix}`, // Custom Hash for Drill-down
                            label: `Chi tiết TK ${accPrefix}`
                        }
                    };
                }
            }

            // 2. Inventory Summary Traceability
            const closingValue = toNumberValue(row.closing_value);
            if (type === 'inventory_summary' && closingValue !== null && closingValue !== 0) {
                newRow.closing_value = {
                    value: row.closing_value,
                    formula: `${row.opening_value} + ${row.in_value} - ${row.out_value}`,
                    source: {
                        type: 'link',
                        target: `#report-drill-stock-${row.item_code}`,
                        label: `Thẻ kho: ${row.item_name}`
                    }
                };
            }

            return newRow;
        });
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let res;
            const rangeParams = {
                from: filters.fromDate,
                to: filters.toDate,
                fromDate: filters.fromDate,
                toDate: filters.toDate
            };
            const accountCode = filters.accountCode.trim();
            // Removed: partnerCode, projectId (DN reports không dùng cho HCSN)

            switch (activeSubView) {
                // === BÁO CÁO TÀI CHÍNH HCSN (TT 24/2024) ===
                case 'balance_sheet_hcsn':
                    res = await api.get('/reports/balance-sheet-hcsn', { params: rangeParams });
                    break;
                case 'activity_result':
                    res = await api.get('/reports/activity-result', { params: rangeParams });
                    break;
                case 'cash_flow':
                    res = await reportService.getCashFlow(rangeParams);
                    break;

                // === BÁO CÁO QUYẾT TOÁN HCSN (MỚI - TT 24/2024) ===
                case 'budget_settlement_regular':
                    res = await api.get('/reports/budget-settlement-regular', { params: { fiscal_year: new Date(filters.fromDate).getFullYear() } });
                    break;
                case 'budget_settlement_nonregular':
                    res = await api.get('/reports/budget-settlement-nonregular', { params: { fiscal_year: new Date(filters.fromDate).getFullYear() } });
                    break;
                case 'budget_settlement_capex':
                    res = await api.get('/reports/budget-settlement-capex', { params: { fiscal_year: new Date(filters.fromDate).getFullYear() } });
                    break;
                case 'budget_performance':
                    res = await api.get('/reports/budget-performance', { params: { fiscal_year: new Date(filters.fromDate).getFullYear() } });
                    break;

                // === BÁO CÁO QUẢN LÝ HCSN (MỚI - TT 24/2024) ===
                case 'fund_source_report':
                    res = await api.get('/reports/hcsn/fund-sources', { params: { fiscal_year: new Date(filters.fromDate).getFullYear() } });
                    break;
                case 'infrastructure_report':
                    res = await api.get('/reports/hcsn/infrastructure');
                    break;

                // === SỔ KẾ TOÁN (GIỮ NGUYÊN) ===
                case 'trial_balance':
                    res = await reportService.getTrialBalance(rangeParams);
                    break;
                case 'ledger':
                    res = await reportService.getGeneralJournal(rangeParams);
                    break;
                case 'general_ledger':
                    if (!accountCode) {
                        setEntries([]);
                        return;
                    }
                    res = await reportService.getGeneralLedger({ from: filters.fromDate, to: filters.toDate, account_code: accountCode });
                    break;
                case 'cash_book':
                    res = await reportService.getCashBook(rangeParams);
                    break;
                case 'bank_book':
                    res = await reportService.getBankBook({ from: filters.fromDate, to: filters.toDate });
                    break;
                case 'inventory_ledger':
                    res = await reportService.getInventoryLedger({ from: filters.fromDate, to: filters.toDate });
                    break;
                case 'inventory_summary':
                    res = await reportService.getInventorySummary(rangeParams);
                    break;

                // === BÁO CÁO KHÁC ===
                case 'transaction_details':
                    res = await reportService.getTransactionDetails({ from: filters.fromDate, to: filters.toDate });
                    break;

                // === LOẠI BỎ: DN Reports ===
                // REMOVED: case 'balance_sheet' (DN)
                // REMOVED: case 'pnl' (DN)
                // REMOVED: case 'debt_ledger' (DN - không dùng cho HCSN)
                // REMOVED: case 'vat_in' (HCSN không nộp VAT)
                // REMOVED: case 'vat_out' (HCSN không nộp VAT)
                // REMOVED: case 'project_pnl' (DN)

                default:
                    res = { data: [] };
            }

            const rawData = Array.isArray(res.data) ? res.data : [];

            // Ensure numeric fields are numbers (Fix for Grand Total issue)
            const numericData = rawData.map((row: any) => ({
                ...row,
                debit_amount: row.debit_amount ? Number(row.debit_amount) : 0,
                credit_amount: row.credit_amount ? Number(row.credit_amount) : 0,
                balance: row.balance ? Number(row.balance) : 0,
                amount: row.amount ? Number(row.amount) : 0,
                // Ensure other potential numeric fields
                opening_debit: row.opening_debit ? Number(row.opening_debit) : 0,
                opening_credit: row.opening_credit ? Number(row.opening_credit) : 0,
                period_debit: row.period_debit ? Number(row.period_debit) : 0,
                period_credit: row.period_credit ? Number(row.period_credit) : 0,
                closing_debit: row.closing_debit ? Number(row.closing_debit) : 0,
                closing_credit: row.closing_credit ? Number(row.closing_credit) : 0,
            }));

            const enrichedData = enrichWithTraceability(numericData, activeSubView);
            setEntries(enrichedData);
        } catch (err) {
            console.error("Failed to load report data", err);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [activeSubView, filters]);

    // --- Hash Navigation Handler for Drill-Down ---
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#report-drill-gl-')) {
                const acc = hash.replace('#report-drill-gl-', '');
                setActiveSubView('general_ledger');
                setFilters(prev => ({ ...prev, accountCode: acc }));
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
            else if (hash.startsWith('#report-drill-stock-')) {
                setActiveSubView('inventory_ledger');
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getColumns = (): ColumnDef[] => {
        const defaultFinancial: ColumnDef[] = [
            { field: 'target', headerName: 'Chỉ tiêu', width: 'min-w-[400px]', renderCell: (v: any, r: any) => <span className={r.is_bold ? 'font-bold' : 'pl-4'} style={{ paddingLeft: `${(r.level || 0) * 1.5}rem` }}>{v}</span> },
            { field: 'code', headerName: 'Mã số', width: 'w-24', align: 'center' as const },
            { field: 'current_period', headerName: 'Số cuối kỳ', width: 'w-48', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.current_period) },
            { field: 'previous_period', headerName: 'Số đầu năm', width: 'w-48', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.previous_period) }
        ];

        const ledgerColumns: ColumnDef[] = [
            { field: 'trx_date', headerName: 'Ngày', width: 'w-20', type: 'date', align: 'center' as const, renderCell: (v: any) => renderDateCell(v) },
            { field: 'doc_no', headerName: 'Số CT', width: 'w-20', align: 'center' as const },
            { field: 'description', headerName: 'Diễn giải', width: 'w-auto' },
            { field: 'reciprocal_acc', headerName: 'TK đối ứng', width: 'w-16', align: 'center' as const },
            { field: 'debit_amount', headerName: 'Nợ', width: 'w-28', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.debit_amount) },
            { field: 'credit_amount', headerName: 'Có', width: 'w-28', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.credit_amount) },
            { field: 'balance', headerName: 'Số dư', width: 'w-28', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.balance) },
        ];

        switch (activeSubView) {
            case 'trial_balance':
                return [
                    { field: 'account_code', headerName: 'Mã TK', width: 'w-24', align: 'center' as const },
                    { field: 'account_name', headerName: 'Tên tài khoản', width: 'min-w-[200px]' },
                    { field: 'opening_debit', headerName: 'Dư đầu (Nợ)', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.opening_debit) },
                    { field: 'opening_credit', headerName: 'Dư đầu (Có)', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.opening_credit) },
                    { field: 'period_debit', headerName: 'Trong kỳ (Nợ)', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.period_debit) },
                    { field: 'period_credit', headerName: 'Trong kỳ (Có)', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.period_credit) },
                    { field: 'closing_debit', headerName: 'Dư cuối (Nợ)', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.closing_debit) },
                    { field: 'closing_credit', headerName: 'Dư cuối (Có)', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.closing_credit) },
                ];
            case 'ledger':
            case 'general_ledger':
            case 'bank_book':
            case 'inventory_ledger':
                return ledgerColumns;
            case 'debt_ledger':
                return [
                    ...ledgerColumns,
                    { field: 'partner_code', headerName: 'Đối tượng', width: 'w-32' }
                ];
            case 'cash_book':
                return [
                    { field: 'date', headerName: 'Ngày', width: 'w-24', type: 'date', renderCell: (v: any) => renderDateCell(v) },
                    { field: 'booking_no', headerName: 'Số CT', width: 'w-24' },
                    { field: 'description', headerName: 'Diễn giải', width: 'min-w-[300px]' },
                    { field: 'account', headerName: 'TK đối ứng', width: 'w-24', align: 'center' as const },
                    { field: 'cash_in', headerName: 'Thu', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.cash_in) },
                    { field: 'cash_out', headerName: 'Chi', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.cash_out) },
                    { field: 'balance', headerName: 'Tồn quỹ', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.balance) },
                ];
            case 'vat_in':
            case 'vat_out':
                return [
                    { field: 'date', headerName: 'Ngày CT', width: 'w-24', type: 'date', renderCell: (v: any) => renderDateCell(v) },
                    { field: 'invNo', headerName: 'Số HĐ', width: 'w-24' },
                    { field: 'partner', headerName: 'Đối tượng', width: 'min-w-[200px]' },
                    { field: 'taxCode', headerName: 'Mã số thuế', width: 'w-32' },
                    { field: 'value', headerName: 'Giá trị chưa thuế', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.value) },
                    { field: 'rate', headerName: 'Thuế suất', width: 'w-20', align: 'center' as const },
                    { field: 'tax', headerName: 'Tiền thuế', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.tax) },
                ];
            case 'inventory_summary':
                return [
                    { field: 'item_code', headerName: 'Mã hàng', width: 'w-24' },
                    { field: 'item_name', headerName: 'Tên hàng', width: 'min-w-[200px]' },
                    { field: 'unit', headerName: 'ĐVT', width: 'w-16', align: 'center' as const },
                    { field: 'opening_value', headerName: 'Giá trị đầu kỳ', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.opening_value) },
                    { field: 'in_value', headerName: 'Nhập trong kỳ', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.in_value) },
                    { field: 'out_value', headerName: 'Xuất trong kỳ', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.out_value) },
                    { field: 'closing_value', headerName: 'Giá trị cuối kỳ', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.closing_value) },
                ];
            case 'project_pnl':
                return [
                    { field: 'account_code', headerName: 'Mã TK', width: 'w-24', align: 'center' as const },
                    { field: 'amount', headerName: 'Số tiền', width: 'w-32', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.amount) }
                ];
            case 'transaction_details':
                return [
                    { field: 'doc_date', headerName: 'Ngày CT', width: 'w-24', type: 'date', renderCell: (v: any) => renderDateCell(v) },
                    { field: 'type', headerName: 'Loại CT', width: 'w-24' },
                    { field: 'doc_no', headerName: 'Số CT', width: 'w-24' },
                    { field: 'voucher_desc', headerName: 'Diễn giải (Chung)', width: 'min-w-[200px]' },
                    { field: 'item_desc', headerName: 'Chi tiết', width: 'min-w-[200px]' },
                    { field: 'debit_acc', headerName: 'TK Nợ', width: 'w-16', align: 'center' as const },
                    { field: 'credit_acc', headerName: 'TK Có', width: 'w-16', align: 'center' as const },
                    { field: 'amount', headerName: 'Số tiền', width: 'w-28', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.amount) },
                    { field: 'partner_code', headerName: 'Đối tượng', width: 'w-24' },
                    { field: 'item_code', headerName: 'Mục', width: 'w-20', align: 'center' as const },
                    { field: 'sub_item_code', headerName: 'Tiểu mục', width: 'w-24', align: 'center' as const },
                    { field: 'contract_code', headerName: 'Hợp đồng', width: 'w-24' },
                    { field: 'project_code', headerName: 'Dự án', width: 'w-24' },
                    { field: 'debt_note', headerName: 'Khế ước', width: 'w-24' },
                    { field: 'dim1', headerName: 'Dim 1', width: 'w-20' },
                    { field: 'dim2', headerName: 'Dim 2', width: 'w-20' },
                    { field: 'dim3', headerName: 'Dim 3', width: 'w-20' },
                    { field: 'dim4', headerName: 'Dim 4', width: 'w-20' },
                    { field: 'dim5', headerName: 'Dim 5', width: 'w-20' }
                ];

            // === HCS Reports Column Definitions ==
            case 'budget_settlement_regular':
            case 'budget_settlement_nonregular':
            case 'budget_settlement_capex':
                return [
                    { field: 'category_code', headerName: 'Mã mục', width: 'w-24', align: 'center' as const },
                    { field: 'category_name', headerName: 'Tên mục', width: 'min-w-[300px]' },
                    { field: 'du_toan', headerName: 'Dự toán được giao', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.du_toan) },
                    { field: 'thuc_hien', headerName: 'Thực hiện', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.thuc_hien) },
                    { field: 'chenh_lech', headerName: 'Chênh lệch', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.chenh_lech) },
                ];

            case 'fund_source_report':
                return [
                    { field: 'code', headerName: 'Mã', width: 'w-20', align: 'center' as const },
                    { field: 'name', headerName: 'Tên nguồn kinh phí', width: 'min-w-[250px]' },
                    { field: 'allocated_amount', headerName: 'Được cấp', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.allocated_amount) },
                    { field: 'spent_amount', headerName: 'Đã chi', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.spent_amount) },
                    { field: 'remaining_amount', headerName: 'Còn lại', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.remaining_amount) },
                    { field: 'execution_rate', headerName: 'Tỷ lệ %', width: 'w-24', align: 'right' as const, renderCell: (_: any, r: any) => `${(r.execution_rate || 0).toFixed(1)}%` },
                ];

            case 'infrastructure_report':
                return [
                    { field: 'category', headerName: 'Loại hạ tầng', width: 'min-w-[200px]' },
                    { field: 'count', headerName: 'Số lượng', width: 'w-24', align: 'center' as const },
                    { field: 'total_original_value', headerName: 'Nguyên giá', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.total_original_value) },
                    { field: 'total_depreciation', headerName: 'Hao mòn LK', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.total_depreciation) },
                    { field: 'total_net_value', headerName: 'Giá trị còn lại', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.total_net_value) },
                ];

            case 'budget_performance':
                return [
                    { field: 'estimate_type', headerName: 'Loại dự toán', width: 'min-w-[200px]' },
                    { field: 'du_toan_duoc_giao', headerName: 'Được giao', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.du_toan_duoc_giao) },
                    { field: 'du_toan_dieu_chinh', headerName: 'Điều chỉnh', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.du_toan_dieu_chinh) },
                    { field: 'da_thuc_hien', headerName: 'Đã thực hiện', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.da_thuc_hien) },
                    { field: 'con_lai', headerName: 'Còn lại', width: 'w-40', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.con_lai) },
                ];

            // HCSN Financial Reports use defaultFinancial columns
            case 'balance_sheet_hcsn':
            case 'activity_result':
                return defaultFinancial;

            default:
                return defaultFinancial;
        }
    };

    const rowsPerPage = useMemo(() => {
        if (paperSize === 'A4-landscape') return 22;
        if (paperSize === 'A5-landscape') return 16;
        if (paperSize === 'A5') return 18;
        return 28;
    }, [paperSize]);

    const normalizedConfig = normalizePrintConfig(printConfig);
    const previewDimensions = getPaperDimensions(paperSize);
    const paddingValue = `${normalizedConfig.marginTop}mm ${normalizedConfig.marginRight}mm ${normalizedConfig.marginBottom}mm ${normalizedConfig.marginLeft}mm`;
    const scaleFactor = normalizedConfig.scale / 100;
    const widthMm = Number.parseFloat(previewDimensions.width);
    const heightMm = Number.parseFloat(previewDimensions.minHeight);
    const contentWidthMm = Math.max(0, widthMm - normalizedConfig.marginLeft - normalizedConfig.marginRight);
    const contentHeightMm = Math.max(0, heightMm - normalizedConfig.marginTop - normalizedConfig.marginBottom);
    const safeScaleFactor = scaleFactor || 1;
    const scaledWidth = `${contentWidthMm / safeScaleFactor}mm`;
    const scaledHeight = `${contentHeightMm / safeScaleFactor}mm`;

    const pagedData = useMemo(() => {
        const pages: any[][] = [];
        for (let i = 0; i < entries.length; i += rowsPerPage) {
            pages.push(entries.slice(i, i + rowsPerPage));
        }
        return pages;
    }, [entries, rowsPerPage]);

    // ModuleOverview for Reports module
    if (activeSubView === 'overview') {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.report?.title || 'Phân hệ Báo cáo'}
                description={MODULE_CONFIGS.report?.description || 'Báo cáo tài chính, sổ kế toán và quyết toán ngân sách'}
                icon={MODULE_CONFIGS.report?.icon || 'assignment'}
                iconColor={MODULE_CONFIGS.report?.iconColor || 'blue'}
                workflow={MODULE_CONFIGS.report?.workflow || []}
                features={MODULE_CONFIGS.report?.features || []}
                stats={[
                    { icon: 'account_balance', label: 'Cân đối TK', value: '-', color: 'blue' },
                    { icon: 'summarize', label: 'Kết quả HĐ', value: '-', color: 'green' },
                    { icon: 'fact_check', label: 'Quyết toán', value: '-', color: 'amber' },
                    { icon: 'book', label: 'Sổ kế toán', value: '-', color: 'purple' },
                ]}
            />
        );
    }

    // Custom Report Generator - Import Excel templates
    if (activeSubView === 'custom_report') {
        return <CustomReportGenerator onSetHeader={onSetHeader} exportSignal={exportSignal} importSignal={importSignal} />;
    }

    return (
        <div className="flex-1 flex bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 shadow-sm z-10">
                {/* Filters Row */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Từ ngày:</span>
                            <DateInput
                                value={filters.fromDate}
                                onChange={(val) => setFilters({ ...filters, fromDate: val })}
                                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Đến ngày:</span>
                            <DateInput
                                value={filters.toDate}
                                onChange={(val) => setFilters({ ...filters, toDate: val })}
                                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {activeSubView === 'general_ledger' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Tài khoản:</span>
                                <input
                                    type="text"
                                    value={filters.accountCode}
                                    onChange={(e) => setFilters({ ...filters, accountCode: e.target.value })}
                                    placeholder="Ví dụ: 1111"
                                    className="w-24 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        )}
                        {activeSubView === 'debt_ledger' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Đối tượng:</span>
                                <input
                                    type="text"
                                    value={filters.partnerCode}
                                    onChange={(e) => setFilters({ ...filters, partnerCode: e.target.value })}
                                    placeholder="Ví dụ: NCC01"
                                    className="w-32 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        )}
                        {activeSubView === 'project_pnl' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Dự án:</span>
                                <input
                                    type="text"
                                    value={filters.projectId}
                                    onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                                    placeholder="Mã dự án"
                                    className="w-32 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-medium tracking-widest uppercase text-[10px]">Đang trích xuất dữ liệu...</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <SmartTable
                            data={entries}
                            columns={getColumns()}
                            keyField="id"
                            getRowClassName={(row: any) => row.is_bold ? 'bg-blue-50/50 dark:bg-blue-900/10 font-bold' : ''}
                        />
                    </div>
                )}
            </div>

            {/* Print Preview Overlay (shared shell for consistency) */}
            {showPrintPreview && (
                <PrintPreviewShell
                    title="Xem trước bản in"
                    onClose={() => setShowPrintPreview(false)}
                    onPrint={() => window.print()}
                    controls={(
                        <PrintConfigControls
                            paperSize={paperSize}
                            onPaperSizeChange={setPaperSize}
                            printConfig={printConfig}
                            onPrintConfigChange={setPrintConfig}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Người lập:</span>
                                <input
                                    value={signatures.preparer}
                                    onChange={(e) => setSignatures({ ...signatures, preparer: e.target.value })}
                                    placeholder="Tên người lập"
                                    className="px-3 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Kế toán trưởng:</span>
                                <input
                                    value={signatures.chiefAccountant}
                                    onChange={(e) => setSignatures({ ...signatures, chiefAccountant: e.target.value })}
                                    placeholder="Tên KTT"
                                    className="px-3 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Giám đốc:</span>
                                <input
                                    value={signatures.director}
                                    onChange={(e) => setSignatures({ ...signatures, director: e.target.value })}
                                    placeholder="Tên thủ trưởng"
                                    className="px-3 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 whitespace-nowrap">Chức danh thủ trưởng:</span>
                                <input
                                    value={headTitle}
                                    onChange={(e) => setHeadTitle(e.target.value)}
                                    placeholder="Giám đốc / Hiệu trưởng / ..."
                                    className="px-3 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                />
                            </div>
                        </PrintConfigControls>
                    )}
                    footerHint={`Khổ giấy: ${paperSize} • Lề: ${normalizedConfig.marginTop}/${normalizedConfig.marginRight}/${normalizedConfig.marginBottom}/${normalizedConfig.marginLeft} mm • Scale: ${normalizedConfig.scale}%`}
                >
                    {pagedData.length > 0 ? pagedData.map((pageItems, pageIdx) => (
                        <div
                            key={`page-${pageIdx}`}
                            className={`bg-white text-slate-900 relative flex flex-col shadow-2xl printable-area font-serif preview-page ${getPaperSizeClass(paperSize)} ${pageIdx < pagedData.length - 1 ? 'page-break-after' : ''}`}
                            style={{
                                width: previewDimensions.width,
                                minHeight: previewDimensions.minHeight,
                                ['--print-padding' as any]: paddingValue
                            }}
                        >
                            <div
                                className="print-scale-wrapper"
                                style={{
                                    transform: `scale(${scaleFactor})`,
                                    transformOrigin: 'top left',
                                    width: scaledWidth,
                                    minHeight: scaledHeight
                                }}
                            >
                                    <div className="flex justify-between items-start mb-6 border-b border-slate-900 pb-2">
                                        <div className="text-[11px] leading-relaxed">
                                            <p className="font-bold uppercase text-slate-900 text-sm">{companyInfo.name || 'ĐƠN VỊ BÁO CÁO'}</p>
                                            <p className="text-slate-700">{companyInfo.address || 'Địa chỉ đơn vị'}</p>
                                            {companyInfo.taxCode && <p className="font-semibold">MST: {companyInfo.taxCode}</p>}
                                            {companyInfo.maDVQHNS && <p className="font-semibold">Mã ĐVQHNS: {companyInfo.maDVQHNS}</p>}
                                        </div>
                                        <div className="text-[10px] text-right">
                                            <p className="font-bold">Mẫu báo cáo HCSN</p>
                                            <p className="italic">Thông tư 24/2024/TT-BTC</p>
                                        </div>
                                    </div>

                                    {pageIdx === 0 && (
                                        <div className="mb-6 text-center">
                                            <h1 className="text-xl font-black uppercase text-blue-900 mb-1">{getReportTitle(activeSubView)}</h1>
                                            <p className="italic text-[11px] text-slate-600">Từ {formatDateVN(filters.fromDate)} đến {formatDateVN(filters.toDate)}</p>
                                            <p className="text-[9px] font-bold mt-2 uppercase tracking-tighter">(Đơn vị tính: Đồng Việt Nam)</p>
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <table className="w-full border-collapse border border-slate-900 text-[9px] printable-table">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    {getColumns().map(col => (
                                                        <th key={col.field} className={`border border-slate-900 p-1.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                                            {col.headerName}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pageItems.map((row: any, rIdx: number) => (
                                                    <tr key={row.id || rIdx} className={row.is_bold ? 'font-bold' : ''}>
                                                        {getColumns().map(col => (
                                                            <td key={col.field} className={`border border-slate-900 p-1.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                                                {col.renderCell ? col.renderCell(row[col.field], row) : (row[col.field] ?? '')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-10 grid grid-cols-3 gap-8 text-center text-[11px] leading-relaxed break-inside-avoid">
                                        <div className="flex flex-col items-center">
                                            <div className="h-24 flex flex-col justify-between w-full">
                                                <div>
                                                    <span className="invisible block mb-0.5">Placeholder Date</span>
                                                    <span className="font-bold uppercase block">NGƯỜI LẬP BIỂU</span>
                                                    <span className="italic font-normal text-[10px]">(Ký, họ và tên)</span>
                                                </div>
                                                <div className="font-bold uppercase mt-auto pt-8">
                                                    {signatures.preparer || '...........................'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="h-24 flex flex-col justify-between w-full">
                                                <div>
                                                    <span className="invisible block mb-0.5">Placeholder Date</span>
                                                    <span className="font-bold uppercase block">KẾ TOÁN TRƯỞNG</span>
                                                    <span className="italic font-normal text-[10px]">(Ký, họ và tên)</span>
                                                </div>
                                                <div className="font-bold uppercase mt-auto pt-8">
                                                    {signatures.chiefAccountant || '...........................'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="h-24 flex flex-col justify-between w-full">
                                                <div className="mb-1">
                                                    <span className="italic block mb-0.5 whitespace-nowrap">Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</span>
                                                    <span className="font-bold uppercase block">{(headTitle || 'Thủ trưởng đơn vị').toUpperCase()}</span>
                                                    <span className="italic font-normal text-[10px]">(Ký, họ tên, đóng dấu)</span>
                                                </div>
                                                <div className="font-bold uppercase mt-auto pt-8">
                                                    {signatures.director || '...........................'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-100 text-[8px] text-slate-400 uppercase italic">
                                        <span>Syntex Legger ERP System</span>
                                        <span>Trang {pageIdx + 1} / {pagedData.length}</span>
                                    </div>
                            </div>
                        </div>
                    )) : (
                        <div
                            className={`bg-white text-slate-600 italic printable-area preview-page text-center shadow-2xl font-serif ${getPaperSizeClass(paperSize)}`}
                            style={{
                                width: previewDimensions.width,
                                minHeight: previewDimensions.minHeight,
                                ['--print-padding' as any]: paddingValue
                            }}
                        >
                            Không có dữ liệu báo cáo
                        </div>
                    )}
                </PrintPreviewShell>
            )}
        </div>
    );
};
