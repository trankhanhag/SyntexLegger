import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import api, { reportService, settingsService } from '../api';
import { SmartTable, type ColumnDef } from './SmartTable';
import { formatNumber } from '../utils/format';
import { type RibbonAction } from './Ribbon';
import { DateInput } from './DateInput';
import { formatDateVN, toInputDateValue } from '../utils/dateUtils';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { type PaperSize, getPaperSizeClass } from './PrintTemplates';
import { CustomReportGenerator } from './CustomReportGenerator';
import { GeneralVoucherForm } from './GeneralModule/GeneralVoucherForm';

/**
 * Get CSS @page rule for paper size - used for direct browser print
 */
const getPageSizeCSS = (size: PaperSize): string => {
    switch (size) {
        case 'A4-landscape':
            return '@page { size: A4 landscape; margin: 0; }';
        case 'A5':
            return '@page { size: A5 portrait; margin: 0; }';
        case 'A5-landscape':
            return '@page { size: A5 landscape; margin: 0; }';
        case 'A4':
        default:
            return '@page { size: A4 portrait; margin: 0; }';
    }
};

/**
 * Inject @page CSS and trigger browser print directly
 */
const triggerDirectPrint = (paperSize: PaperSize): void => {
    // Create and inject dynamic style for @page
    const styleId = 'dynamic-print-page-size';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }

    // Set the @page rule based on selected paper size
    styleEl.textContent = `@media print { ${getPageSizeCSS(paperSize)} }`;

    // Add class to body for print mode
    document.body.classList.add('direct-print-mode');

    // Trigger browser print
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('direct-print-mode');
        }, 500);
    }, 100);
};

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
    // === BÁO CÁO TÀI CHÍNH DOANH NGHIỆP (TT 99/2025) ===
    balance_sheet_dn: 'Bảng Cân đối Kế toán (B01-DN)',
    profit_loss: 'Báo cáo Kết quả Kinh doanh (B02-DN)',
    cash_flow_dn: 'Báo cáo Lưu chuyển Tiền tệ (B03-DN)',
    notes_fs: 'Thuyết minh Báo cáo Tài chính (B09-DN)',

    // === BÁO CÁO PHÂN TÍCH ===
    budget_performance: 'Báo cáo Thực hiện Kế hoạch/Ngân sách',
    profitability_analysis: 'Phân tích Lợi nhuận',
    cost_analysis: 'Phân tích Chi phí',
    financial_analysis: 'Phân tích Tài chính',

    // === SỔ KẾ TOÁN ===
    trial_balance: 'Bảng Cân đối Tài khoản',
    ledger: 'Sổ Nhật ký chung',
    general_ledger: 'Sổ Cái',
    cash_book: 'Sổ Quỹ Tiền mặt',
    bank_book: 'Sổ Tiền gửi Ngân hàng',
    inventory_summary: 'Tổng hợp Hàng tồn kho',
    inventory_ledger: 'Sổ chi tiết Hàng tồn kho',
    debt_ledger: 'Sổ chi tiết Công nợ',

    // === BÁO CÁO KHÁC ===
    transaction_details: 'Báo cáo Chi tiết Bút toán',
    custom_report: 'Báo cáo Tùy biến'
};

export const Reports: React.FC<ReportsProps> = ({ subView: initialSubView = 'balance_sheet_dn', printSignal = 0, exportSignal = 0, importSignal = 0, onSetHeader }) => {
    const [activeSubView, setActiveSubView] = useState(initialSubView);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [editingVoucherId, setEditingVoucherId] = useState<string | undefined>(undefined);
    const [paperSize] = useState<PaperSize>('A4');
    const [companyInfo, setCompanyInfo] = useState({ name: 'TÊN DOANH NGHIỆP', address: 'Địa chỉ trụ sở', taxCode: '' });
    const [headTitle, setHeadTitle] = useState('Giám đốc');
    const [signatures, setSignatures] = useState({ preparer: '', chiefAccountant: '', director: '' });
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

    // Refs to track handled signals (prevent duplicate handling on re-renders)
    const lastHandledExportSignal = useRef(0);
    const lastHandledPrintSignal = useRef(0);

    useEffect(() => {
        if (printSignal > 0 && printSignal !== lastHandledPrintSignal.current) {
            lastHandledPrintSignal.current = printSignal;
            // In trực tiếp qua browser print dialog, bỏ qua app preview
            triggerDirectPrint(paperSize);
        }
    }, [printSignal, paperSize]);

    const getReportTitle = (viewId: string) => REPORT_NAMES[viewId] || 'Báo cáo';

    useEffect(() => {
        settingsService.getSettings()
            .then(res => {
                const s = res.data || {};
                setCompanyInfo({
                    name: s.company_name || s.unit_name || 'TÊN DOANH NGHIỆP',
                    address: s.company_address || s.unit_address || 'Địa chỉ trụ sở',
                    taxCode: s.company_tax_code || s.tax_code || s.unit_tax_code || ''
                });
                setHeadTitle(s.head_title || s.unit_head_title || s.director_title || 'Giám đốc');
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

    const openVoucherFromRow = useCallback((row: any) => {
        const voucherId = row?.voucher_id || row?.voucherId;
        if (!voucherId) {
            window.alert('Không tìm thấy chứng từ gốc để chỉnh sửa.');
            return;
        }
        setEditingVoucherId(voucherId);
        setShowVoucherModal(true);
    }, []);

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
                    { label: 'In báo cáo', icon: 'print', onClick: () => triggerDirectPrint(paperSize), primary: true },
                    { label: 'Xuất Excel', icon: 'table_chart', onClick: exportToExcel }
                ]
            });
        }
    }, [activeSubView, exportToExcel, onSetHeader]);

    // Handle export signal from Ribbon (for non-custom_report views)
    useEffect(() => {
        if (exportSignal > 0 && exportSignal !== lastHandledExportSignal.current && activeSubView !== 'custom_report') {
            lastHandledExportSignal.current = exportSignal;
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
            // Note: partnerCode, projectId được lọc ở các báo cáo chi tiết riêng

            switch (activeSubView) {
                // === BÁO CÁO TÀI CHÍNH DOANH NGHIỆP (TT 99/2025) ===
                case 'balance_sheet_dn':
                    res = await api.get('/reports/balance-sheet-dn', { params: rangeParams });
                    break;
                case 'profit_loss':
                    res = await api.get('/reports/profit-loss', { params: rangeParams });
                    break;
                case 'cash_flow_dn':
                    res = await api.get('/reports/cash-flow-dn', { params: rangeParams });
                    break;
                case 'notes_fs':
                    // Thuyết minh BCTC (B09-DN)
                    res = await api.get('/reports/notes-fs', {
                        params: { fiscalYear: new Date(filters.fromDate).getFullYear() }
                    });
                    break;

                // === BÁO CÁO KẾ HOẠCH/NGÂN SÁCH NỘI BỘ ===
                case 'budget_performance':
                    res = await api.get('/reports/budget-performance', { params: { fiscal_year: new Date(filters.fromDate).getFullYear() } });
                    break;

                // === BÁO CÁO PHÂN TÍCH ===
                case 'cost_analysis':
                    res = await api.get('/reports/cost-analysis', { params: rangeParams });
                    break;
                case 'profitability_analysis':
                    res = await api.get('/reports/profitability-analysis', { params: rangeParams });
                    break;
                case 'financial_analysis':
                    // Chưa có API - hiển thị thông báo
                    res = { data: [{ id: 'notice', note: 'Chức năng đang được phát triển. Vui lòng sử dụng Báo cáo Tùy biến để tạo báo cáo phân tích.' }] };
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

                // Note: Các báo cáo cũ đã được thay thế bằng báo cáo TT 99/2025
                // - balance_sheet → balance_sheet_dn
                // - pnl → profit_loss
                // - cash_flow → cash_flow_dn

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
                    {
                        field: 'doc_no',
                        headerName: 'Số CT',
                        width: 'w-24',
                        renderCell: (v: any, r: any) => (
                            r?.voucher_id ? (
                                <button
                                    className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-semibold"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openVoucherFromRow(r);
                                    }}
                                    title="Mở chứng từ để chỉnh sửa"
                                >
                                    {v}
                                </button>
                            ) : (
                                <span>{v}</span>
                            )
                        )
                    },
                    { field: 'voucher_desc', headerName: 'Diễn giải (Chung)', width: 'min-w-[200px]' },
                    { field: 'item_desc', headerName: 'Chi tiết', width: 'min-w-[200px]' },
                    { field: 'debit_acc', headerName: 'TK Nợ', width: 'w-16', align: 'center' as const },
                    { field: 'credit_acc', headerName: 'TK Có', width: 'w-16', align: 'center' as const },
                    { field: 'amount', headerName: 'Số tiền', width: 'w-28', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.amount) },
                    { field: 'partner_code', headerName: 'Đối tượng', width: 'w-24' },
                    { field: 'item_code', headerName: 'Mục', width: 'w-20', align: 'center' as const },
                    { field: 'sub_item_code', headerName: 'Khoản mục', width: 'w-24', align: 'center' as const },
                    { field: 'contract_code', headerName: 'Hợp đồng', width: 'w-24' },
                    { field: 'project_code', headerName: 'Dự án', width: 'w-24' },
                    { field: 'debt_note', headerName: 'Khế ước', width: 'w-24' },
                    { field: 'dim1', headerName: 'Dim 1', width: 'w-20' },
                    { field: 'dim2', headerName: 'Dim 2', width: 'w-20' },
                    { field: 'dim3', headerName: 'Dim 3', width: 'w-20' },
                    { field: 'dim4', headerName: 'Dim 4', width: 'w-20' },
                    { field: 'dim5', headerName: 'Dim 5', width: 'w-20' }
                ];

            // === BÁO CÁO KẾ HOẠCH/NGÂN SÁCH NỘI BỘ DN ===
            case 'budget_performance':
                return [
                    { field: 'item_code', headerName: 'Mã', width: 'w-20', align: 'center' as const,
                      renderCell: (v: any, r: any) => r.is_header ? '' : (v || '-')
                    },
                    { field: 'item_name', headerName: 'Khoản mục', width: 'min-w-[280px]',
                      renderCell: (v: any, r: any) => {
                        if (r.is_header) {
                            return <span className={`font-bold uppercase text-xs tracking-wider ${r.is_total ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>{v}</span>;
                        }
                        return <span className={`${r.is_bold ? 'font-semibold' : ''} ${r.is_subtotal ? 'text-slate-700 dark:text-slate-300' : ''}`}>{v}</span>;
                      }
                    },
                    { field: 'du_toan_goc', headerName: 'DT Gốc', width: 'w-32', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => r.is_header ? '' : renderNumberCell(r.du_toan_goc)
                    },
                    { field: 'du_toan_dieu_chinh', headerName: 'Điều chỉnh', width: 'w-32', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        if (r.is_header) return '';
                        const val = r.du_toan_dieu_chinh || 0;
                        if (val === 0) return '-';
                        const color = val > 0 ? 'text-green-600' : 'text-red-600';
                        return <span className={color}>{val > 0 ? '+' : ''}{renderNumberCell(val)}</span>;
                      }
                    },
                    { field: 'du_toan_tong', headerName: 'Tổng DT', width: 'w-36', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        if (r.is_header) return '';
                        return <span className="font-medium">{renderNumberCell(r.du_toan_tong)}</span>;
                      }
                    },
                    { field: 'da_thuc_hien', headerName: 'Thực hiện', width: 'w-36', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        if (r.is_header) return '';
                        return <span className="text-blue-600 dark:text-blue-400 font-medium">{renderNumberCell(r.da_thuc_hien)}</span>;
                      }
                    },
                    { field: 'con_lai', headerName: 'Còn lại', width: 'w-36', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        if (r.is_header) return '';
                        const val = r.con_lai || 0;
                        const color = val >= 0 ? 'text-green-600' : 'text-red-600';
                        return <span className={color}>{renderNumberCell(val)}</span>;
                      }
                    },
                    { field: 'pct_hoan_thanh', headerName: '% HT', width: 'w-24', align: 'right' as const,
                      renderCell: (_: any, r: any) => {
                        if (r.is_header || r.pct_hoan_thanh === '-') return '';
                        const pct = parseFloat(r.pct_hoan_thanh || '0');
                        let color = 'text-slate-500';
                        if (pct >= 100) color = 'text-green-600 font-semibold';
                        else if (pct >= 80) color = 'text-blue-600';
                        else if (pct >= 50) color = 'text-amber-600';
                        else if (pct > 0) color = 'text-red-600';
                        return <span className={color}>{pct.toFixed(1)}%</span>;
                      }
                    }
                ];

            // === BÁO CÁO PHÂN TÍCH ===
            case 'cost_analysis':
                return [
                    { field: 'cost_item', headerName: 'Khoản mục chi phí', width: 'min-w-[300px]',
                      renderCell: (v: any, r: any) => (
                        <span className={r.is_bold ? 'font-bold' : ''} style={{ paddingLeft: `${(r.level || 0) * 1.5}rem` }}>
                            {v}
                        </span>
                      )
                    },
                    { field: 'current_period', headerName: 'Kỳ này', width: 'w-40', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => renderNumberCell(r.current_period)
                    },
                    { field: 'previous_period', headerName: 'Kỳ trước', width: 'w-40', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => renderNumberCell(r.previous_period)
                    },
                    { field: 'change_amount', headerName: 'Biến động', width: 'w-40', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        const val = r.change_amount || 0;
                        const color = val > 0 ? 'text-red-600' : val < 0 ? 'text-green-600' : '';
                        return <span className={color}>{renderNumberCell(val)}</span>;
                      }
                    },
                    { field: 'change_pct', headerName: '% Biến động', width: 'w-28', align: 'right' as const,
                      renderCell: (_: any, r: any) => {
                        const val = parseFloat(r.change_pct || '0');
                        const color = val > 0 ? 'text-red-600' : val < 0 ? 'text-green-600' : '';
                        return <span className={color}>{val > 0 ? '+' : ''}{val.toFixed(2)}%</span>;
                      }
                    },
                    { field: 'pct_revenue', headerName: '% Doanh thu', width: 'w-28', align: 'right' as const,
                      renderCell: (_: any, r: any) => `${r.pct_revenue || '0.00'}%`
                    }
                ];
            case 'profitability_analysis':
                return [
                    { field: 'item', headerName: 'Chỉ tiêu', width: 'min-w-[350px]',
                      renderCell: (v: any, r: any) => {
                        if (r.is_header) {
                            return <span className="font-bold text-blue-700 dark:text-blue-400 uppercase text-xs tracking-wider">{v}</span>;
                        }
                        return (
                            <span className={`${r.is_bold ? 'font-bold' : ''} ${r.is_total ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
                                  style={{ paddingLeft: `${(r.level || 0) * 1.5}rem` }}>
                                {r.is_ratio ? <em>{v}</em> : v}
                            </span>
                        );
                      }
                    },
                    { field: 'current_period', headerName: 'Kỳ này', width: 'w-40', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        if (r.is_header) return '';
                        if (r.is_ratio) return <em className="text-slate-500">{parseFloat(r.current_period || 0).toFixed(2)}%</em>;
                        return renderNumberCell(r.current_period);
                      }
                    },
                    { field: 'previous_period', headerName: 'Kỳ trước', width: 'w-40', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        if (r.is_header) return '';
                        if (r.is_ratio) return <em className="text-slate-500">{parseFloat(r.previous_period || 0).toFixed(2)}%</em>;
                        return renderNumberCell(r.previous_period);
                      }
                    },
                    { field: 'change_amount', headerName: 'Biến động', width: 'w-40', align: 'right' as const, type: 'number',
                      renderCell: (_: any, r: any) => {
                        if (r.is_header) return '';
                        const val = r.change_amount || 0;
                        const color = val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : '';
                        if (r.is_ratio) return <em className={color}>{val > 0 ? '+' : ''}{parseFloat(val).toFixed(2)}%</em>;
                        return <span className={color}>{renderNumberCell(val)}</span>;
                      }
                    },
                    { field: 'change_pct', headerName: '% Thay đổi', width: 'w-28', align: 'right' as const,
                      renderCell: (_: any, r: any) => {
                        if (r.is_header || r.is_ratio) return '';
                        const val = parseFloat(r.change_pct || '0');
                        const color = val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : '';
                        return <span className={color}>{val > 0 ? '+' : ''}{val.toFixed(2)}%</span>;
                      }
                    },
                    { field: 'margin', headerName: '% DT thuần', width: 'w-28', align: 'right' as const,
                      renderCell: (_: any, r: any) => {
                        if (r.is_header || r.margin === '-') return '';
                        return <span className="text-slate-500">{r.margin}%</span>;
                      }
                    }
                ];
            case 'financial_analysis':
                return [
                    { field: 'note', headerName: 'Thông báo', width: 'min-w-[600px]' }
                ];

            // === BÁO CÁO TÀI CHÍNH DN (TT 99/2025) ===
            // Bảng cân đối kế toán (B01-DN)
            case 'balance_sheet_dn':
                return defaultFinancial;

            // Thuyết minh BCTC (B09-DN)
            case 'notes_fs':
                return [
                    { field: 'note_code', headerName: 'Mục', width: 'w-20', align: 'center' as const },
                    { field: 'note_title', headerName: 'Nội dung thuyết minh', width: 'min-w-[400px]',
                      renderCell: (v: any, r: any) => (
                        <span className={r.is_bold ? 'font-bold uppercase' : ''} style={{ paddingLeft: `${(r.level || 0) * 1.5}rem` }}>
                            {v}
                        </span>
                      )
                    },
                    { field: 'note_content', headerName: 'Chi tiết / Giải thích', width: 'min-w-[300px]',
                      renderCell: (v: any) => v ? <span className="text-slate-600 text-xs">{v}</span> : '-'
                    },
                    { field: 'related_account', headerName: 'TK liên quan', width: 'w-28', align: 'center' as const,
                      renderCell: (v: any) => v || '-'
                    },
                    { field: 'section', headerName: 'Phân loại', width: 'w-28', align: 'center' as const,
                      renderCell: (v: any) => {
                        const sectionMap: Record<string, string> = {
                            'GENERAL': 'Chung',
                            'POLICY': 'Chính sách',
                            'ASSETS': 'Tài sản',
                            'LIABILITIES': 'Nợ phải trả',
                            'EQUITY': 'Vốn CSH',
                            'INCOME': 'Thu nhập',
                            'CASHFLOW': 'Tiền tệ',
                            'OTHER': 'Khác'
                        };
                        return sectionMap[v] || v || '-';
                      }
                    }
                ];

            // Báo cáo Kết quả Kinh doanh (B02-DN)
            case 'profit_loss':
                return [
                    { field: 'target', headerName: 'Chỉ tiêu', width: 'min-w-[400px]', renderCell: (v: any, r: any) => <span className={r.is_bold ? 'font-bold' : 'pl-4'} style={{ paddingLeft: `${(r.level || 0) * 1.5}rem` }}>{v}</span> },
                    { field: 'code', headerName: 'Mã số', width: 'w-24', align: 'center' as const },
                    { field: 'notes', headerName: 'Thuyết minh', width: 'w-28', align: 'center' as const },
                    { field: 'current_period', headerName: 'Kỳ này', width: 'w-48', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.current_period) },
                    { field: 'previous_period', headerName: 'Kỳ trước', width: 'w-48', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.previous_period) }
                ];

            // Báo cáo Lưu chuyển Tiền tệ (B03-DN)
            case 'cash_flow_dn':
                return [
                    { field: 'target', headerName: 'Chỉ tiêu', width: 'min-w-[400px]', renderCell: (v: any, r: any) => <span className={r.is_bold ? 'font-bold' : 'pl-4'} style={{ paddingLeft: `${(r.level || 0) * 1.5}rem` }}>{v}</span> },
                    { field: 'code', headerName: 'Mã số', width: 'w-24', align: 'center' as const },
                    { field: 'notes', headerName: 'Thuyết minh', width: 'w-28', align: 'center' as const },
                    { field: 'current_period', headerName: 'Kỳ này', width: 'w-48', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.current_period) },
                    { field: 'previous_period', headerName: 'Kỳ trước', width: 'w-48', align: 'right' as const, type: 'number', renderCell: (_: any, r: any) => renderNumberCell(r.previous_period) }
                ];

            default:
                return defaultFinancial;
        }
    };


    // ModuleOverview for Reports module
    if (activeSubView === 'overview') {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.report?.title || 'Phân hệ Báo cáo'}
                description={MODULE_CONFIGS.report?.description || 'Báo cáo tài chính, sổ kế toán theo TT 99/2025'}
                icon={MODULE_CONFIGS.report?.icon || 'assignment'}
                iconColor={MODULE_CONFIGS.report?.iconColor || 'blue'}
                workflow={MODULE_CONFIGS.report?.workflow || []}
                features={MODULE_CONFIGS.report?.features || []}
                stats={[
                    { icon: 'account_balance', label: 'Cân đối KT', value: '-', color: 'blue' },
                    { icon: 'summarize', label: 'Kết quả KD', value: '-', color: 'green' },
                    { icon: 'fact_check', label: 'Lưu chuyển TT', value: '-', color: 'amber' },
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
                            onRowDoubleClick={activeSubView === 'transaction_details' ? openVoucherFromRow : undefined}
                        />
                    </div>
                )}
            </div>

            {/* Hidden Print Container - Một container duy nhất, browser tự phân trang */}
            {createPortal(
                <div className="hidden-print-container" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <div className={`bg-white text-slate-900 printable-area font-serif ${getPaperSizeClass(paperSize)}`}>
                        {/* Header báo cáo */}
                        <div className="print-header flex justify-between items-start mb-4 border-b border-slate-900 pb-2">
                            <div className="text-[11px] leading-relaxed">
                                <p className="font-bold uppercase text-slate-900 text-sm">{companyInfo.name || 'TÊN DOANH NGHIỆP'}</p>
                                <p className="text-slate-700">{companyInfo.address || 'Địa chỉ trụ sở'}</p>
                                {companyInfo.taxCode && <p className="font-semibold">MST: {companyInfo.taxCode}</p>}
                            </div>
                            <div className="text-[10px] text-right">
                                <p className="font-bold">Mẫu báo cáo DN</p>
                                <p className="italic">Thông tư 99/2025/TT-BTC</p>
                            </div>
                        </div>

                        <div className="mb-4 text-center">
                            <h1 className="text-xl font-black uppercase text-blue-900 mb-1">{getReportTitle(activeSubView)}</h1>
                            <p className="italic text-[11px] text-slate-600">Từ {formatDateVN(filters.fromDate)} đến {formatDateVN(filters.toDate)}</p>
                            <p className="text-[9px] font-bold mt-1 uppercase tracking-tighter">(Đơn vị tính: Đồng Việt Nam)</p>
                        </div>

                        {/* Bảng dữ liệu - một table duy nhất */}
                        {entries.length > 0 ? (
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
                                    {entries.map((row: any, rIdx: number) => (
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
                        ) : (
                            <p className="text-slate-500 italic text-center py-8">Không có dữ liệu báo cáo</p>
                        )}

                        {/* Phần ký tên */}
                        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-[10px] leading-snug print-signatures">
                            <div className="flex flex-col items-center">
                                <div className="h-20 flex flex-col justify-between w-full">
                                    <div>
                                        <span className="font-bold uppercase block">NGƯỜI LẬP BIỂU</span>
                                        <span className="italic font-normal text-[9px]">(Ký, họ và tên)</span>
                                    </div>
                                    <div className="font-bold uppercase mt-auto pt-6">
                                        {signatures.preparer || '...........................'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="h-20 flex flex-col justify-between w-full">
                                    <div>
                                        <span className="font-bold uppercase block">KẾ TOÁN TRƯỞNG</span>
                                        <span className="italic font-normal text-[9px]">(Ký, họ và tên)</span>
                                    </div>
                                    <div className="font-bold uppercase mt-auto pt-6">
                                        {signatures.chiefAccountant || '...........................'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="h-20 flex flex-col justify-between w-full">
                                    <div>
                                        <span className="italic block text-[9px] whitespace-nowrap">Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</span>
                                        <span className="font-bold uppercase block">{(headTitle || 'Giám đốc').toUpperCase()}</span>
                                        <span className="italic font-normal text-[9px]">(Ký, họ tên, đóng dấu)</span>
                                    </div>
                                    <div className="font-bold uppercase mt-auto pt-6">
                                        {signatures.director || '...........................'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showVoucherModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[95vw] h-[90vh] max-w-7xl overflow-hidden flex flex-col">
                        <GeneralVoucherForm
                            id={editingVoucherId}
                            onClose={() => {
                                setShowVoucherModal(false);
                                setEditingVoucherId(undefined);
                            }}
                            onSuccess={() => {
                                setShowVoucherModal(false);
                                setEditingVoucherId(undefined);
                                loadData();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
