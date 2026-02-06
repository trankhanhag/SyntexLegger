import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { assetService } from '../api';
import { type RibbonAction } from './Ribbon';
import { formatMonthVN, toInputDateValue, toInputMonthValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import { DateInput } from './DateInput';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { PrintPreviewModal, type VoucherView } from './PrintTemplates';
import { triggerBrowserPrint } from '../hooks/usePrintHandler';
import { ExcelImportModal } from './ExcelImportModal';
import { ASSET_TEMPLATE } from '../utils/excelTemplates';
import logger from '../utils/logger';

// --- TYPES ---
interface AssetModuleProps {
    subView?: string;
    onCloseModal?: () => void;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (viewId: string) => void;
}

// --- MAIN COMPONENT ---
export const AssetModule: React.FC<AssetModuleProps> = ({ subView = 'asset_fixed_list', printSignal = 0, onSetHeader, onNavigate }) => {
    // Data State
    const [assets, setAssets] = useState<any[]>([]); // Fixed Assets
    const [infraAssets, setInfraAssets] = useState<any[]>([]); // Infrastructure
    const [investments, setInvestments] = useState<any[]>([]); // Investments
    const [ccdc, setCcdc] = useState<any[]>([]); // CCDC (Legacy/Support)
    const [inventory, setInventory] = useState<any[]>([]); // Inventory Records
    const [fundSources, setFundSources] = useState<any[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // Modals Control
    const [modalMode, setModalMode] = useState<'create_fixed' | 'create_infra' | 'create_invest' | 'create_ccdc' | 'invest_income' | 'depreciation' | 'decrease' | 'maintenance' | 'condition' | 'transfer' | 'revaluation' | 'create_inventory' | 'inventory_detail' | 'view_card' | null>(null);
    const [editingItem, setEditingItem] = useState<any>(null); // Track item being edited

    // Print Preview State
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printView, setPrintView] = useState<VoucherView>('ASSET_CARD');
    const [printRecord, setPrintRecord] = useState<any>(null);
    const lastPrintSignalRef = React.useRef(0); // Track last handled print signal

    // Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });


    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

    const isInfraReportView = subView === 'infra_report';
    const isAssetSummaryReportView = subView === 'asset_report_summary';
    const isAssetSourceReportView = subView === 'asset_report_source';
    const isReportView = isInfraReportView || isAssetSummaryReportView || isAssetSourceReportView;
    const isInvestIncomeView = subView === 'invest_income';
    const isInfraModuleView = subView.startsWith('infra') && !isInfraReportView;
    const isInvestModuleView = subView.startsWith('invest');
    const isCCDCView = subView === 'ccdc' || subView === 'asset_ccdc';

    const sumBy = (items: any[], field: string) =>
        items.reduce((acc, item) => acc + (Number(item?.[field]) || 0), 0);

    const sumNetValue = (items: any[], netField: string, originalField: string, accumulatedField: string) =>
        items.reduce((acc, item) => {
            const net = item?.[netField];
            const netValue = net ?? ((Number(item?.[originalField]) || 0) - (Number(item?.[accumulatedField]) || 0));
            return acc + (Number(netValue) || 0);
        }, 0);

    // --- COLUMNS DEFINITIONS ---
    const fixedAssetColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã TSCĐ', width: 'w-24', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên Tài sản', width: 'min-w-[200px]' },
        { field: 'category', headerName: 'Loại', width: 'w-24' },
        { field: 'fund_source_name', headerName: 'Nguồn vốn', width: 'w-32', renderCell: (v: string) => <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-bold">{v}</span> },
        { field: 'start_date', headerName: 'Ngày ghi tăng', width: 'w-28', align: 'center', type: 'date' },
        { field: 'original_value', headerName: 'Nguyên giá', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'accumulated_depreciation', headerName: 'Hao mòn LK', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-red-500">{formatNumber(v)}</span> },
        { field: 'net_value', headerName: 'Giá trị còn lại', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
        { field: 'dept', headerName: 'Bộ phận', width: 'w-32' },
        { field: 'status', headerName: 'Trạng thái', width: 'w-24', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold ${v === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v}</span> },
    ];

    const infraColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Hạ tầng', width: 'w-24', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên Tài sản Hạ tầng', width: 'min-w-[200px]' },
        { field: 'category', headerName: 'Loại hình', width: 'w-32' },
        { field: 'fund_source_name', headerName: 'Nguồn vốn', width: 'w-32', renderCell: (v: string) => <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-bold">{v}</span> },
        { field: 'condition', headerName: 'Tình trạng', width: 'w-32', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold ${v === 'GOOD' ? 'bg-green-100 text-green-700' : v === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{v || 'N/A'}</span> },
        { field: 'original_value', headerName: 'Nguyên giá', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'last_maintenance_date', headerName: 'Bảo trì lần cuối', width: 'w-32', align: 'center', type: 'date' },
        { field: 'maintenance_cost', headerName: 'Chi phí bảo trì', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-orange-600">{formatNumber(v)}</span> },
    ];

    const investColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Khoản ĐT', width: 'w-24', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên khoản đầu tư', width: 'min-w-[200px]' },
        { field: 'type', headerName: 'Hình thức', width: 'w-32' },
        { field: 'investee_name', headerName: 'Đơn vị nhận đầu tư', width: 'w-48' },
        { field: 'investment_amount', headerName: 'Giá trị đầu tư', type: 'number', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'ownership_percentage', headerName: 'Tỷ lệ sở hữu', width: 'w-24', align: 'center', renderCell: (v: number) => <span>{v}%</span> },
        { field: 'investment_date', headerName: 'Ngày đầu tư', width: 'w-32', align: 'center', type: 'date' },
        { field: 'income_received', headerName: 'Thu nhập lũy kế', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span> },
    ];

    const ccdcColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã CCDC', width: 'w-28', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên Công cụ dụng cụ', width: 'min-w-[200px]' },
        { field: 'category', headerName: 'Loại', width: 'w-32', renderCell: (v: string) => {
            const labels: Record<string, string> = { 'TOOL': 'Dụng cụ', 'EQUIPMENT': 'Thiết bị', 'FURNITURE': 'Nội thất', 'OTHER': 'Khác' };
            return <span className="text-xs px-2 py-1 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">{labels[v] || v || 'Chưa phân loại'}</span>;
        }},
        { field: 'department', headerName: 'Bộ phận', width: 'w-36' },
        { field: 'start_date', headerName: 'Ngày ghi nhận', width: 'w-28', align: 'center', type: 'date' },
        { field: 'cost', headerName: 'Giá trị', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-teal-600">{formatNumber(v)}</span> },
        { field: 'life_months', headerName: 'Thời gian PB', width: 'w-28', align: 'center', renderCell: (v: number) => <span>{v} tháng</span> },
        { field: 'allocated', headerName: 'Đã phân bổ', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-red-500">{formatNumber(v)}</span> },
        { field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-green-600">{formatNumber(v)}</span> },
        { field: 'status', headerName: 'Trạng thái', width: 'w-24', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold ${v === 'ACTIVE' ? 'bg-green-100 text-green-700' : v === 'DISPOSED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{v === 'ACTIVE' ? 'Đang dùng' : v === 'DISPOSED' ? 'Đã thanh lý' : v || 'Đang dùng'}</span> },
    ];

    const inventoryColumns: ColumnDef[] = [
        { field: 'inventory_no', headerName: 'Số phiếu', width: 'w-32', fontClass: 'font-bold' },
        { field: 'inventory_date', headerName: 'Ngày kiểm kê', width: 'w-32', align: 'center', type: 'date' },
        { field: 'department', headerName: 'Bộ phận', width: 'w-48' },
        { field: 'inventory_type', headerName: 'Loại kiểm kê', width: 'w-32', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold bg-blue-100 text-blue-700`}>{v}</span> },
        { field: 'status', headerName: 'Trạng thái', width: 'w-32', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold ${v === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v}</span> },
        { field: 'notes', headerName: 'Ghi chú', width: 'min-w-[200px]' },
    ];

    const infraReportColumns: ColumnDef[] = [
        { field: 'category', headerName: 'Loại hạ tầng', width: 'min-w-[200px]', fontClass: 'font-bold' },
        { field: 'count', headerName: 'Số lượng', width: 'w-24', align: 'center', type: 'number' },
        { field: 'total_original_value', headerName: 'Tổng nguyên giá', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'total_depreciation', headerName: 'Hao mòn lũy kế', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono text-red-500">{formatNumber(v)}</span> },
        { field: 'total_net_value', headerName: 'Giá trị còn lại', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
    ];

    const assetSummaryColumns: ColumnDef[] = [
        { field: 'asset_type', headerName: 'Nhóm tài sản', width: 'min-w-[220px]', fontClass: 'font-bold' },
        { field: 'count', headerName: 'Số lượng', width: 'w-24', align: 'center', type: 'number' },
        { field: 'original_value', headerName: 'Nguyên giá', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'accumulated_depreciation', headerName: 'Hao mòn/Phân bổ', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono text-red-500">{formatNumber(v)}</span> },
        { field: 'net_value', headerName: 'Giá trị còn lại', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
        { field: 'income_received', headerName: 'Thu nhập lũy kế', width: 'w-36', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span> },
    ];

    const assetSourceColumns: ColumnDef[] = [
        { field: 'fund_source_name', headerName: 'Nguồn vốn', width: 'min-w-[220px]', fontClass: 'font-bold' },
        { field: 'fixed_count', headerName: 'TSCĐ (SL)', width: 'w-24', align: 'center', type: 'number' },
        { field: 'fixed_value', headerName: 'TSCĐ (Giá trị)', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'infra_count', headerName: 'Hạ tầng (SL)', width: 'w-24', align: 'center', type: 'number' },
        { field: 'infra_value', headerName: 'Hạ tầng (Giá trị)', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'invest_count', headerName: 'Đầu tư (SL)', width: 'w-24', align: 'center', type: 'number' },
        { field: 'invest_value', headerName: 'Đầu tư (Giá trị)', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span> },
        { field: 'total_value', headerName: 'Tổng giá trị', width: 'w-40', align: 'right', type: 'number', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
    ];

    // --- LOGIC ---
    useEffect(() => {
        fetchData();
        fetchFundSources();
    }, []);

    // Print handler - show print preview for selected asset
    useEffect(() => {
        // Only respond to NEW print signals, not when other dependencies change
        if (printSignal > 0 && printSignal !== lastPrintSignalRef.current) {
            lastPrintSignalRef.current = printSignal;

            // For fixed assets list, show ASSET_CARD template
            if ((subView === 'asset_fixed_list' || subView.startsWith('asset_fixed')) && selectedRow) {
                // Transform data for ASSET_CARD template
                const record = {
                    // Basic info
                    code: selectedRow.code || selectedRow.asset_code || '',
                    name: selectedRow.name || selectedRow.asset_name || '',
                    // Dates
                    start_date: selectedRow.start_date || selectedRow.purchase_date || selectedRow.acquisition_date,
                    purchase_date: selectedRow.purchase_date || selectedRow.acquisition_date,
                    decrease_date: selectedRow.decrease_date || selectedRow.disposal_date,
                    // Specifications
                    specification: selectedRow.specification || selectedRow.specs || '',
                    serial_no: selectedRow.serial_no || selectedRow.serial_number || '',
                    country: selectedRow.country || selectedRow.origin_country || 'VN',
                    manufacture_year: selectedRow.manufacture_year || selectedRow.year_made,
                    start_year: selectedRow.start_year || new Date(selectedRow.start_date || selectedRow.purchase_date || new Date()).getFullYear(),
                    // Department
                    dept: selectedRow.dept || selectedRow.department || selectedRow.using_department || '',
                    department: selectedRow.department || selectedRow.dept || selectedRow.using_department || '',
                    // Capacity
                    capacity: selectedRow.capacity || '',
                    area: selectedRow.area || '',
                    // Values
                    original_value: selectedRow.original_value || selectedRow.acquisition_cost || 0,
                    accumulated_depreciation: selectedRow.accumulated_depreciation || 0,
                    net_value: selectedRow.net_value || (selectedRow.original_value - (selectedRow.accumulated_depreciation || 0)),
                    // Source & depreciation
                    fund_source_name: selectedRow.fund_source_name || selectedRow.source || 'Vốn chủ sở hữu',
                    source: selectedRow.fund_source_name || selectedRow.source || 'Vốn chủ sở hữu',
                    useful_life: selectedRow.useful_life || selectedRow.useful_years || 5,
                    voucher_no: selectedRow.voucher_no || selectedRow.doc_no || '',
                    doc_no: selectedRow.doc_no || selectedRow.voucher_no || '',
                    // Depreciation log (if available)
                    depreciation_log: selectedRow.depreciation_log || [],
                };
                setPrintRecord(record);
                setPrintView('ASSET_CARD');
                setShowPrintPreview(true);
            } else if (selectedRow) {
                // For other views with selected item, show handover template
                const record = {
                    ...selectedRow,
                    // Ensure required fields
                    code: selectedRow.code || selectedRow.asset_code || '',
                    name: selectedRow.name || selectedRow.asset_name || '',
                    original_value: selectedRow.original_value || selectedRow.acquisition_cost || 0,
                    country: selectedRow.country || 'VN',
                    start_year: selectedRow.start_year || new Date().getFullYear(),
                };
                setPrintRecord(record);
                setPrintView('ASSET_HANDOVER');
                setShowPrintPreview(true);
            } else {
                // No selection - use browser print for list view
                triggerBrowserPrint();
            }
        }
    }, [printSignal, subView, selectedRow]);

    // Handle SubView Changes -> Modal Triggers
    useEffect(() => {
        if (!subView) return;

        switch (subView) {
            case 'asset_fixed_increase': setModalMode('create_fixed'); setEditingItem(null); break;
            case 'asset_fixed_decrease': setModalMode('decrease'); break;
            case 'asset_depreciation': setModalMode('depreciation'); break;
            case 'asset_transfer': setModalMode('transfer'); break;
            case 'asset_revaluation': setModalMode('revaluation'); break;

            case 'infra_register': setModalMode('create_infra'); setEditingItem(null); break;
            case 'infra_maintenance': setModalMode('maintenance'); break;
            case 'infra_condition': setModalMode('condition'); break;

            case 'invest_list': setModalMode(null); break; // Default to list
            case 'invest_income': setModalMode('invest_income'); break;

            default: setModalMode(null); break;
        }
    }, [subView]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [fixedRes, infraRes, investRes, ccdcRes, inventoryRecordsRes] = await Promise.all([
                assetService.getFixedAssets(),
                assetService.getInfrastructure(),
                assetService.getInvestments(),
                assetService.getCCDC(), // Keep for leadcy/utility support
                assetService.getInventoryRecords()
            ]);

            setAssets(fixedRes.data || []);
            setInfraAssets(infraRes.data || []);
            setInvestments(investRes.data || []);
            setCcdc(ccdcRes.data || []);
            setInventory(inventoryRecordsRes.data || []);
        } catch (err) {
            logger.error("Failed to fetch asset data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFundSources = async () => {
        // Nguồn vốn DN: Vốn chủ sở hữu, Vốn vay, Lợi nhuận giữ lại...
        setFundSources([
            { id: 'VCSH', code: 'VCSH', name: 'Vốn chủ sở hữu' },
            { id: 'VAY', code: 'VAY', name: 'Vốn vay dài hạn' },
            { id: 'LNGL', code: 'LNGL', name: 'Lợi nhuận giữ lại' },
            { id: 'KHAC', code: 'KHAC', name: 'Nguồn khác' }
        ]);
    }

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
                await assetService.createFixedAsset({
                    code: rows[i].code || rows[i]['Mã TSCĐ (*)'],
                    name: rows[i].name || rows[i]['Tên tài sản (*)'],
                    category: rows[i].category || rows[i]['Loại TSCĐ'] || 'TANGIBLE',
                    original_value: parseFloat(rows[i].original_value || rows[i]['Nguyên giá (*)'] || 0),
                    useful_life: parseInt(rows[i].useful_life || rows[i]['Số năm SD'] || 5),
                    fund_source_id: rows[i].fund_source_id || rows[i]['Mã nguồn vốn'],
                    department: rows[i].department || rows[i]['Bộ phận sử dụng'],
                    purchase_date: rows[i].purchase_date || rows[i]['Ngày ghi tăng (*)'] || toInputDateValue(),
                    specification: rows[i].specification || rows[i]['Quy cách'],
                    serial_no: rows[i].serial_no || rows[i]['Số serial'],
                    country: rows[i].country || rows[i]['Nước SX'] || 'VN',
                    manufacture_year: rows[i].manufacture_year || rows[i]['Năm SX']
                });
                successCount++;
            } catch (err: any) {
                const code = rows[i].code || rows[i]['Mã TSCĐ (*)'] || `Dòng ${i + 1}`;
                errors.push(`${code}: ${err.response?.data?.error || err.message}`);
            }
        }

        setImporting(false);

        if (errors.length === 0) {
            alert(`Nhập thành công ${successCount} tài sản cố định!`);
        } else {
            alert(`Nhập ${successCount}/${rows.length} tài sản.\n\nLỗi:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...và ${errors.length - 5} lỗi khác` : ''}`);
        }

        fetchData();
    }, []);

    const fundSourceMap = useMemo(() => {
        const map = new Map<string, any>();
        fundSources.forEach((fs: any) => {
            if (fs?.id) map.set(fs.id, fs);
        });
        return map;
    }, [fundSources]);

    const infraReportRows = useMemo(() => {
        const rowsByCategory = new Map<string, any>();
        infraAssets.forEach((asset: any) => {
            const categoryLabel = asset?.category || 'Khác';
            const key = categoryLabel || 'Khác';
            const row = rowsByCategory.get(key) || {
                id: key,
                category: categoryLabel || 'Khác',
                count: 0,
                total_original_value: 0,
                total_depreciation: 0,
                total_net_value: 0
            };
            row.count += 1;
            row.total_original_value += Number(asset?.original_value) || 0;
            row.total_depreciation += Number(asset?.accumulated_depreciation) || 0;
            const netValue = asset?.net_value ?? ((Number(asset?.original_value) || 0) - (Number(asset?.accumulated_depreciation) || 0));
            row.total_net_value += Number(netValue) || 0;
            rowsByCategory.set(key, row);
        });

        const rows = Array.from(rowsByCategory.values()).sort((a, b) =>
            String(a.category || '').localeCompare(String(b.category || ''), 'vi')
        );

        if (!rows.length) return rows;

        const total = rows.reduce(
            (acc, row) => ({
                count: acc.count + row.count,
                total_original_value: acc.total_original_value + row.total_original_value,
                total_depreciation: acc.total_depreciation + row.total_depreciation,
                total_net_value: acc.total_net_value + row.total_net_value
            }),
            { count: 0, total_original_value: 0, total_depreciation: 0, total_net_value: 0 }
        );

        rows.push({
            id: 'TOTAL',
            category: 'Tổng cộng',
            ...total,
            is_total: true
        });

        return rows;
    }, [infraAssets]);

    const assetSummaryRows = useMemo(() => {
        const fixedRow = {
            id: 'fixed',
            asset_type: 'TSCĐ',
            count: assets.length,
            original_value: sumBy(assets, 'original_value'),
            accumulated_depreciation: sumBy(assets, 'accumulated_depreciation'),
            net_value: sumNetValue(assets, 'net_value', 'original_value', 'accumulated_depreciation'),
            income_received: 0
        };

        const infraRow = {
            id: 'infra',
            asset_type: 'Hạ tầng',
            count: infraAssets.length,
            original_value: sumBy(infraAssets, 'original_value'),
            accumulated_depreciation: sumBy(infraAssets, 'accumulated_depreciation'),
            net_value: sumNetValue(infraAssets, 'net_value', 'original_value', 'accumulated_depreciation'),
            income_received: 0
        };

        const investNetValue = investments.some((inv: any) => inv?.current_value !== undefined && inv?.current_value !== null)
            ? sumBy(investments, 'current_value')
            : sumBy(investments, 'investment_amount');

        const investmentRow = {
            id: 'invest',
            asset_type: 'Đầu tư dài hạn',
            count: investments.length,
            original_value: sumBy(investments, 'investment_amount'),
            accumulated_depreciation: 0,
            net_value: investNetValue,
            income_received: sumBy(investments, 'income_received')
        };

        const ccdcRow = {
            id: 'ccdc',
            asset_type: 'CCDC',
            count: ccdc.length,
            original_value: sumBy(ccdc, 'cost'),
            accumulated_depreciation: sumBy(ccdc, 'allocated'),
            net_value: sumBy(ccdc, 'remaining'),
            income_received: 0
        };

        const rows = [fixedRow, infraRow, investmentRow, ccdcRow];

        const total = rows.reduce(
            (acc, row) => ({
                count: acc.count + row.count,
                original_value: acc.original_value + row.original_value,
                accumulated_depreciation: acc.accumulated_depreciation + row.accumulated_depreciation,
                net_value: acc.net_value + row.net_value,
                income_received: acc.income_received + row.income_received
            }),
            { count: 0, original_value: 0, accumulated_depreciation: 0, net_value: 0, income_received: 0 }
        );

        return [
            ...rows,
            {
                id: 'TOTAL',
                asset_type: 'Tổng cộng',
                ...total,
                is_total: true
            }
        ];
    }, [assets, infraAssets, investments, ccdc, sumBy, sumNetValue]);

    const assetSourceRows = useMemo(() => {
        const rowsBySource = new Map<string, any>();
        const unassignedId = 'UNASSIGNED';

        const resolveSourceName = (id?: string, fallbackName?: string) => {
            if (fallbackName) return fallbackName;
            if (!id) return 'Chưa gán nguồn';
            return fundSourceMap.get(id)?.name || 'Chưa gán nguồn';
        };

        const ensureRow = (id: string, name: string) => {
            if (!rowsBySource.has(id)) {
                rowsBySource.set(id, {
                    id,
                    fund_source_id: id,
                    fund_source_name: name,
                    fixed_count: 0,
                    fixed_value: 0,
                    infra_count: 0,
                    infra_value: 0,
                    invest_count: 0,
                    invest_value: 0,
                    total_value: 0
                });
            }
            return rowsBySource.get(id);
        };

        assets.forEach((asset: any) => {
            const id = asset?.fund_source_id || unassignedId;
            const name = resolveSourceName(asset?.fund_source_id, asset?.fund_source_name);
            const row = ensureRow(id, name);
            row.fixed_count += 1;
            row.fixed_value += Number(asset?.original_value) || 0;
        });

        infraAssets.forEach((asset: any) => {
            const id = asset?.fund_source_id || unassignedId;
            const name = resolveSourceName(asset?.fund_source_id, asset?.fund_source_name);
            const row = ensureRow(id, name);
            row.infra_count += 1;
            row.infra_value += Number(asset?.original_value) || 0;
        });

        investments.forEach((investment: any) => {
            const id = investment?.fund_source_id || unassignedId;
            const name = resolveSourceName(investment?.fund_source_id, investment?.fund_source_name);
            const row = ensureRow(id, name);
            row.invest_count += 1;
            const value = investment?.current_value ?? investment?.investment_amount ?? 0;
            row.invest_value += Number(value) || 0;
        });

        const rows = Array.from(rowsBySource.values())
            .filter((row) => row.fixed_count || row.infra_count || row.invest_count)
            .map((row) => ({
                ...row,
                total_value: row.fixed_value + row.infra_value + row.invest_value
            }))
            .sort((a, b) => String(a.fund_source_name || '').localeCompare(String(b.fund_source_name || ''), 'vi'));

        if (!rows.length) return rows;

        const total = rows.reduce(
            (acc, row) => ({
                fixed_count: acc.fixed_count + row.fixed_count,
                fixed_value: acc.fixed_value + row.fixed_value,
                infra_count: acc.infra_count + row.infra_count,
                infra_value: acc.infra_value + row.infra_value,
                invest_count: acc.invest_count + row.invest_count,
                invest_value: acc.invest_value + row.invest_value,
                total_value: acc.total_value + row.total_value
            }),
            { fixed_count: 0, fixed_value: 0, infra_count: 0, infra_value: 0, invest_count: 0, invest_value: 0, total_value: 0 }
        );

        rows.push({
            id: 'TOTAL',
            fund_source_name: 'Tổng cộng',
            ...total,
            is_total: true
        });

        return rows;
    }, [assets, infraAssets, investments, fundSourceMap]);

    const getCurrentList = () => {
        if (isInfraReportView) return infraReportRows;
        if (isAssetSummaryReportView) return assetSummaryRows;
        if (isAssetSourceReportView) return assetSourceRows;
        if (subView.startsWith('infra')) return infraAssets;
        if (subView.startsWith('invest')) return investments;
        if (isCCDCView) return ccdc; // Support legacy CCDC view
        if (subView === 'asset_inventory') return inventory;
        return assets; // Default to Fixed Assets
    };

    const getCurrentColumns = () => {
        if (isInfraReportView) return infraReportColumns;
        if (isAssetSummaryReportView) return assetSummaryColumns;
        if (isAssetSourceReportView) return assetSourceColumns;
        if (subView.startsWith('infra')) return infraColumns;
        if (subView.startsWith('invest')) return investColumns;
        if (isCCDCView) return ccdcColumns;
        if (subView === 'asset_inventory') return inventoryColumns;
        return fixedAssetColumns;
    };

    const getTitleAndIcon = () => {
        if (isAssetSummaryReportView) return { title: 'Tổng hợp Tài sản', icon: 'pie_chart' };
        if (isAssetSourceReportView) return { title: 'Tài sản theo Nguồn vốn', icon: 'account_tree' };
        if (isInfraReportView) return { title: 'Báo cáo Hạ tầng', icon: 'summarize' };
        if (isInvestIncomeView) return { title: 'Thu nhập Đầu tư', icon: 'payments' };
        if (subView.startsWith('infra')) return { title: 'Quản lý Tài sản Kết cấu Hạ tầng', icon: 'location_city' };
        if (subView.startsWith('invest')) return { title: 'Quản lý Đầu tư Dài hạn', icon: 'account_balance' };
        if (isCCDCView) return { title: 'Quản lý Công cụ dụng cụ', icon: 'home_repair_service' };
        if (subView === 'asset_inventory') return { title: 'Kiểm kê Tài sản', icon: 'inventory' };
        return { title: 'Quản lý Tài sản Cố định (TSCĐ)', icon: 'domain' };
    };

    // Header Actions
    useEffect(() => {
        if (onSetHeader) {
            const { title, icon } = getTitleAndIcon();
            const actions: RibbonAction[] = [];

            // Context-based Actions
            if (subView.startsWith('asset_fixed')) {
                actions.push({ label: 'Ghi tăng', icon: 'add_business', onClick: () => setModalMode('create_fixed'), primary: true });
                actions.push({ label: 'Nhập từ Excel', icon: 'upload_file', onClick: () => setShowImportModal(true) });
                actions.push({ label: 'Tính khấu hao', icon: 'calculate', onClick: () => setModalMode('depreciation') });
                actions.push({ label: 'Ghi giảm', icon: 'remove_circle', onClick: () => setModalMode('decrease') });
            } else if (isInfraModuleView) {
                actions.push({ label: 'Ghi nhận mới', icon: 'add_location', onClick: () => setModalMode('create_infra'), primary: true });
                actions.push({ label: 'Bảo trì', icon: 'build', onClick: () => setModalMode('maintenance') });
                actions.push({ label: 'Đánh giá', icon: 'health_and_safety', onClick: () => setModalMode('condition') });
            } else if (isInvestModuleView) {
                actions.push({ label: 'Ghi nhận Thu nhập', icon: 'paid', onClick: () => setModalMode('invest_income'), primary: isInvestIncomeView });
                actions.push({ label: 'Đầu tư mới', icon: 'payments', onClick: () => setModalMode('create_invest'), primary: !isInvestIncomeView });
            } else if (subView === 'asset_inventory') {
                actions.push({ label: 'Tạo phiếu kiểm kê', icon: 'post_add', onClick: () => setModalMode('create_inventory'), primary: true });
            } else if (isCCDCView) {
                actions.push({ label: 'Ghi nhận CCDC', icon: 'add_circle', onClick: () => setModalMode('create_ccdc'), primary: true });
            }

            actions.push({ label: 'Làm mới', icon: 'refresh', onClick: fetchData });
            actions.push({ label: 'In danh sách', icon: 'print', onClick: () => triggerBrowserPrint() });

            if (selectedRow && !isReportView) {
                // Edit Logic
                if (subView === 'asset_fixed_list' || subView.startsWith('asset_fixed')) {
                    actions.push({
                        label: 'Sửa hồ sơ', icon: 'edit',
                        onClick: () => { setEditingItem(selectedRow); setModalMode('create_fixed'); }
                    });
                } else if (subView.startsWith('infra')) {
                    actions.push({
                        label: 'Sửa thông tin', icon: 'edit',
                        onClick: () => { setEditingItem(selectedRow); setModalMode('create_infra'); }
                    });
                } else if (subView.startsWith('invest')) {
                    actions.push({
                        label: 'Sửa đầu tư', icon: 'edit',
                        onClick: () => { setEditingItem(selectedRow); setModalMode('create_invest'); }
                    });
                } else if (isCCDCView) {
                    actions.push({
                        label: 'Sửa CCDC', icon: 'edit',
                        onClick: () => { setEditingItem(selectedRow); setModalMode('create_ccdc'); }
                    });
                }

                actions.push({ label: 'Chi tiết', icon: 'visibility', onClick: handleViewSelected });
            }

            onSetHeader({
                title,
                icon,
                actions,
                onDelete: selectedRow && !isReportView ? handleDeleteSelected : undefined
            });
        }
    }, [subView, onSetHeader, selectedRow]);

    const handleViewSelected = () => {
        if (!selectedRow) return;
        if (subView === 'asset_inventory') {
            setModalMode('inventory_detail');
        } else if (subView.startsWith('asset_fixed')) {
            setModalMode('view_card');
        } else {
            // Default view logic
            alert(`Xem chi tiết: ${selectedRow.name || selectedRow.code}`);
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedRow.name}?`)) return;

        try {
            if (subView.startsWith('infra')) {
                await assetService.deleteInfrastructure(selectedRow.id);
            } else if (subView.startsWith('invest')) {
                await assetService.deleteInvestment(selectedRow.id);
            } else if (isCCDCView) {
                await assetService.deleteCCDC(selectedRow.id);
            } else {
                await assetService.deleteFixedAsset(selectedRow.id, { reason: 'Xóa trực tiếp', approval_no: 'AUTO', decrease_date: toInputDateValue() });
            }
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const tableData = getCurrentList();
    const tableColumns = getCurrentColumns();

    // --- RENDER ---
    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Module Overview - Default Landing Page */}
            {(subView === 'overview' || subView === 'asset_overview') && (
                <ModuleOverview
                    title={MODULE_CONFIGS.asset.title}
                    description={MODULE_CONFIGS.asset.description}
                    icon={MODULE_CONFIGS.asset.icon}
                    iconColor={MODULE_CONFIGS.asset.iconColor}
                    workflow={MODULE_CONFIGS.asset.workflow}
                    features={MODULE_CONFIGS.asset.features}
                    onNavigate={onNavigate}
                    stats={[
                        { icon: 'domain', label: 'TSCĐ', value: assets.length, color: 'purple' },
                        { icon: 'location_city', label: 'Hạ tầng', value: infraAssets.length, color: 'blue' },
                        { icon: 'handyman', label: 'CCDC', value: ccdc.length, color: 'green' },
                        { icon: 'inventory', label: 'Kiểm kê', value: inventory.length, color: 'amber' },
                    ]}
                />
            )}

            <div className={`flex-1 overflow-hidden relative ${(subView === 'overview' || subView === 'asset_overview') ? 'hidden' : ''}`}>
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold animate-pulse">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <SmartTable
                        data={tableData}
                        columns={tableColumns}
                        keyField="id"
                        onSelectionChange={isReportView ? undefined : setSelectedRow}
                        onRowClick={isReportView ? undefined : (row) => setSelectedRow(row)}
                        selectedRow={isReportView ? undefined : selectedRow}
                        minRows={15}
                        showTotalRow={!isReportView}
                        getRowClassName={isReportView ? (row: any) => row.is_total ? 'bg-blue-50/50 dark:bg-blue-900/10 font-bold' : '' : undefined}
                    />
                )}
            </div>

            {/* MODALS */}
            {modalMode === 'create_fixed' && (
                <FixedAssetModal onClose={() => { setModalMode(null); setEditingItem(null); }} onRefresh={fetchData} fundSources={fundSources} initialData={editingItem} />
            )}
            {modalMode === 'create_infra' && (
                <InfrastructureModal onClose={() => { setModalMode(null); setEditingItem(null); }} onRefresh={fetchData} fundSources={fundSources} initialData={editingItem} />
            )}
            {modalMode === 'create_invest' && (
                <InvestmentModal onClose={() => { setModalMode(null); setEditingItem(null); }} onRefresh={fetchData} fundSources={fundSources} initialData={editingItem} />
            )}
            {modalMode === 'create_ccdc' && (
                <CCDCFormModal onClose={() => { setModalMode(null); setEditingItem(null); }} onRefresh={fetchData} initialData={editingItem} />
            )}
            {modalMode === 'invest_income' && (
                <InvestmentIncomeModal
                    onClose={() => setModalMode(null)}
                    onRefresh={fetchData}
                    investments={investments}
                    initialInvestmentId={isInvestModuleView ? selectedRow?.id : undefined}
                />
            )}
            {modalMode === 'depreciation' && (
                <DepreciationModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'decrease' && (
                <DisposeModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'maintenance' && (
                <MaintenanceModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={infraAssets} />
            )}
            {modalMode === 'condition' && (
                <ConditionModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={infraAssets} />
            )}
            {modalMode === 'transfer' && (
                <TransferAssetModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'revaluation' && (
                <RevaluationModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'create_inventory' && (
                <CreateInventoryModal onClose={() => setModalMode(null)} onRefresh={fetchData} />
            )}
            {modalMode === 'inventory_detail' && selectedRow && (
                <InventoryDetailModal inventory={selectedRow} onClose={() => setModalMode(null)} assets={assets} />
            )}
            {modalMode === 'view_card' && selectedRow && (
                <AssetCardModal asset={selectedRow} onClose={() => setModalMode(null)} />
            )}

            {/* Print Preview Modal */}
            {showPrintPreview && printRecord && (
                <PrintPreviewModal
                    record={printRecord}
                    view={printView}
                    onClose={() => {
                        setShowPrintPreview(false);
                        setPrintRecord(null);
                    }}
                    companyInfo={{ name: 'ĐƠN VỊ SỬ DỤNG', address: 'Địa chỉ đơn vị' }}
                />
            )}

            {/* Excel Import Modal */}
            {showImportModal && (
                <ExcelImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportFromExcel}
                    title="Nhập tài sản cố định từ Excel"
                    enhancedTemplate={ASSET_TEMPLATE}
                    columns={[
                        { key: 'code', label: 'Mã TSCĐ', required: true },
                        { key: 'name', label: 'Tên tài sản', required: true },
                        { key: 'category', label: 'Loại TSCĐ' },
                        { key: 'original_value', label: 'Nguyên giá', required: true },
                        { key: 'useful_life', label: 'Số năm SD' },
                        { key: 'fund_source_id', label: 'Mã nguồn vốn' },
                        { key: 'department', label: 'Bộ phận sử dụng' },
                        { key: 'purchase_date', label: 'Ngày ghi tăng', required: true },
                        { key: 'specification', label: 'Quy cách' },
                        { key: 'serial_no', label: 'Số serial' }
                    ]}
                />
            )}

            {/* Import Progress Overlay */}
            {importing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-2xl text-center max-w-md">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                            Đang nhập tài sản cố định...
                        </p>
                        <p className="text-2xl font-mono text-purple-600 mt-2">
                            {importProgress.current} / {importProgress.total}
                        </p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-4">
                            <div
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS (MODALS) ---

const FixedAssetModal = ({ onClose, onRefresh, fundSources, initialData }: any) => {
    const [data, setData] = useState(initialData || {
        code: '', name: '', category: 'TANGIBLE', original_value: 0, useful_life: 5,
        fund_source_id: '', department: 'Phòng Hành chính', purchase_date: toInputDateValue()
    });

    const handleSave = async () => {
        try {
            if (initialData?.id) {
                await assetService.updateFixedAsset(initialData.id, data);
            } else {
                await assetService.createFixedAsset(data);
            }
            alert(initialData ? "Cập nhật TSCĐ thành công!" : "Ghi tăng TSCĐ thành công!");
            onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi lưu"); logger.error(e); }
    };

    return (
        <FormModal title={initialData ? "Sửa Hồ sơ TSCĐ" : "Ghi tăng Tài sản Cố định"} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Mã TSCĐ</label>
                        <input className="form-input" value={data.code} onChange={e => setData({ ...data, code: e.target.value })} placeholder="TSCĐ..." />
                    </div>
                    <div>
                        <label className="form-label">Tên Tài sản</label>
                        <input className="form-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Loại TSCĐ</label>
                        <select className="form-input" value={data.category} onChange={e => setData({ ...data, category: e.target.value })}>
                            <option value="TANGIBLE">Hữu hình (211)</option>
                            <option value="INTANGIBLE">Vô hình (213)</option>
                            <option value="LEASED">Thuê tài chính (212)</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Nguyên giá (VNĐ)</label>
                        <input type="number" className="form-input font-bold text-right" value={data.original_value} onChange={e => setData({ ...data, original_value: Number(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="form-label">Năm sử dụng</label>
                            <input type="number" className="form-input" value={data.useful_life} onChange={e => setData({ ...data, useful_life: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="form-label">Ngày ghi tăng</label>
                            <DateInput className="form-input" value={data.purchase_date} onChange={v => setData({ ...data, purchase_date: v })} />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Nguồn vốn hình thành (Bắt buộc)</label>
                        <select className="form-input border-purple-300 bg-purple-50" value={data.fund_source_id} onChange={e => setData({ ...data, fund_source_id: e.target.value })}>
                            <option value="">-- Chọn nguồn vốn --</option>
                            {fundSources.map((fs: any) => (
                                <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} className="form-button-primary">Lưu TSCĐ</button>
            </div>
        </FormModal>
    );
};

// --- CCDC FORM MODAL ---
const CCDCFormModal = ({ onClose, onRefresh, initialData }: any) => {
    const [data, setData] = useState(initialData || {
        code: '', name: '', category: 'TOOL', cost: 0, life_months: 12,
        department: '', start_date: toInputDateValue(), status: 'ACTIVE'
    });

    const handleSave = async () => {
        try {
            if (!data.code || !data.name || !data.cost) {
                alert('Vui lòng nhập đầy đủ: Mã CCDC, Tên và Giá trị');
                return;
            }
            if (initialData?.id) {
                await assetService.updateCCDC(initialData.id, data);
            } else {
                await assetService.createCCDC({
                    ...data,
                    allocated: 0,
                    remaining: data.cost
                });
            }
            alert(initialData ? "Cập nhật CCDC thành công!" : "Ghi nhận CCDC thành công!");
            onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi lưu CCDC"); logger.error(e); }
    };

    return (
        <FormModal title={initialData ? "Sửa Công cụ dụng cụ" : "Ghi nhận Công cụ dụng cụ mới"} onClose={onClose} icon="handyman">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Mã CCDC <span className="text-red-500">*</span></label>
                        <input className="form-input" value={data.code} onChange={e => setData({ ...data, code: e.target.value })} placeholder="VD: CCDC001" />
                    </div>
                    <div>
                        <label className="form-label">Tên Công cụ dụng cụ <span className="text-red-500">*</span></label>
                        <input className="form-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="VD: Máy khoan cầm tay" />
                    </div>
                    <div>
                        <label className="form-label">Loại CCDC</label>
                        <select className="form-input" value={data.category} onChange={e => setData({ ...data, category: e.target.value })}>
                            <option value="TOOL">Dụng cụ (152)</option>
                            <option value="EQUIPMENT">Thiết bị văn phòng</option>
                            <option value="FURNITURE">Đồ nội thất</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Bộ phận sử dụng</label>
                        <input className="form-input" value={data.department} onChange={e => setData({ ...data, department: e.target.value })} placeholder="VD: Phòng Kỹ thuật" />
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Giá trị (VNĐ) <span className="text-red-500">*</span></label>
                        <input type="number" className="form-input font-bold text-right" value={data.cost} onChange={e => setData({ ...data, cost: Number(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="form-label">Thời gian phân bổ (tháng)</label>
                            <input type="number" className="form-input" value={data.life_months} onChange={e => setData({ ...data, life_months: Number(e.target.value) })} min={1} />
                        </div>
                        <div>
                            <label className="form-label">Ngày ghi nhận</label>
                            <DateInput className="form-input" value={data.start_date} onChange={v => setData({ ...data, start_date: v })} />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Trạng thái</label>
                        <select className="form-input" value={data.status} onChange={e => setData({ ...data, status: e.target.value })}>
                            <option value="ACTIVE">Đang sử dụng</option>
                            <option value="DISPOSED">Đã thanh lý</option>
                        </select>
                    </div>
                    {initialData && (
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-bold">Đã phân bổ:</span> {new Intl.NumberFormat('vi-VN').format(initialData.allocated || 0)} VNĐ
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-bold">Còn lại:</span> {new Intl.NumberFormat('vi-VN').format(initialData.remaining || data.cost)} VNĐ
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} className="form-button-primary">
                    {initialData ? 'Cập nhật' : 'Ghi nhận CCDC'}
                </button>
            </div>
        </FormModal>
    );
};

const InfrastructureModal = ({ onClose, onRefresh, fundSources, initialData }: any) => {
    const [data, setData] = useState(initialData || {
        code: '', name: '', category: 'ROAD', original_value: 0,
        fund_source_id: '', location: '', construction_year: new Date().getFullYear(), condition: 'GOOD'
    });

    const handleSave = async () => {
        try {
            if (initialData?.id) {
                await assetService.updateInfrastructure(initialData.id, data);
            } else {
                await assetService.createInfrastructure(data);
            }
            alert(initialData ? "Cập nhật hạ tầng thành công!" : "Ghi nhận Hạ tầng thành công!");
            onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi lưu"); logger.error(e); }
    };

    return (
        <FormModal title={initialData ? "Sửa Hồ sơ Hạ tầng" : "Ghi nhận Tài sản Hạ tầng"} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div><label className="form-label">Mã Hạ tầng</label><input className="form-input" value={data.code} onChange={e => setData({ ...data, code: e.target.value })} /></div>
                    <div><label className="form-label">Tên Hạ tầng</label><input className="form-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
                    <div>
                        <label className="form-label">Loại công trình</label>
                        <select className="form-input" value={data.category} onChange={e => setData({ ...data, category: e.target.value })}>
                            <option value="ROAD">Giao thông (Đường, Cầu)</option>
                            <option value="IRRIGATION">Thủy lợi (Đê, Kênh)</option>
                            <option value="WATER">Cấp thoát nước</option>
                            <option value="OTHER">Hạ tầng khác</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <div><label className="form-label">Nguyên giá</label><input type="number" className="form-input" value={data.original_value} onChange={e => setData({ ...data, original_value: Number(e.target.value) })} /></div>
                    <div><label className="form-label">Năm xây dựng</label><input type="number" className="form-input" value={data.construction_year} onChange={e => setData({ ...data, construction_year: Number(e.target.value) })} /></div>
                    <div>
                        <label className="form-label">Nguồn vốn</label>
                        <select className="form-input" value={data.fund_source_id} onChange={e => setData({ ...data, fund_source_id: e.target.value })}>
                            <option value="">-- Chọn nguồn --</option>
                            {fundSources.map((fs: any) => (
                                <option key={fs.id} value={fs.id}>{fs.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} className="form-button-primary">Lưu Hạ tầng</button>
            </div>
        </FormModal>
    );
};

const InvestmentModal = ({ onClose, onRefresh, fundSources, initialData }: any) => {
    const [data, setData] = useState(initialData || {
        code: '', name: '', type: 'SUBSIDIARY', investment_amount: 0,
        fund_source_id: '', investee_name: '', ownership_percentage: 0, investment_date: toInputDateValue()
    });

    const handleSave = async () => {
        try {
            if (initialData?.id) {
                await assetService.updateInvestment(initialData.id, data);
            } else {
                await assetService.createInvestment(data);
            }
            alert(initialData ? "Cập nhật khoản đầu tư thành công!" : "Tạo khoản đầu tư thành công!");
            onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi lưu"); logger.error(e); }
    };

    return (
        <FormModal title={initialData ? "Sửa khoản ĐT Dài hạn" : "Đầu tư Dài hạn"} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div><label className="form-label">Mã khoản ĐT</label><input className="form-input" value={data.code} onChange={e => setData({ ...data, code: e.target.value })} /></div>
                    <div><label className="form-label">Tên khoản đầu tư</label><input className="form-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
                    <div><label className="form-label">Đơn vị nhận ĐT</label><input className="form-input" value={data.investee_name} onChange={e => setData({ ...data, investee_name: e.target.value })} /></div>
                </div>
                <div className="space-y-4">
                    <div><label className="form-label">Số tiền đầu tư</label><input type="number" className="form-input font-bold text-blue-600" value={data.investment_amount} onChange={e => setData({ ...data, investment_amount: Number(e.target.value) })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="form-label">Tỷ lệ sở hữu (%)</label><input type="number" className="form-input" value={data.ownership_percentage} onChange={e => setData({ ...data, ownership_percentage: Number(e.target.value) })} /></div>
                        <div><label className="form-label">Ngày đầu tư</label><DateInput className="form-input" value={data.investment_date} onChange={v => setData({ ...data, investment_date: v })} /></div>
                    </div>
                    <div>
                        <label className="form-label">Nguồn vốn</label>
                        <select className="form-input" value={data.fund_source_id} onChange={e => setData({ ...data, fund_source_id: e.target.value })}>
                            <option value="">-- Chọn nguồn --</option>
                            {fundSources.map((fs: any) => (
                                <option key={fs.id} value={fs.id}>{fs.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} className="form-button-primary">Lưu Đầu tư</button>
            </div>
        </FormModal>
    );
};

const InvestmentIncomeModal = ({ onClose, onRefresh, investments, initialInvestmentId }: any) => {
    const [data, setData] = useState({
        investment_id: initialInvestmentId || '',
        income_amount: 0,
        income_date: toInputDateValue(),
        note: ''
    });

    useEffect(() => {
        if (initialInvestmentId) {
            setData((prev: any) => ({ ...prev, investment_id: initialInvestmentId }));
        }
    }, [initialInvestmentId]);

    const selectedInvestment = investments.find((inv: any) => inv.id === data.investment_id);
    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value || 0);

    const handleSave = async () => {
        if (!data.investment_id) return alert("Chọn khoản đầu tư!");
        if (!data.income_amount || data.income_amount <= 0) return alert("Nhập số tiền thu nhập!");
        try {
            await assetService.recordInvestmentIncome(data);
            alert("Đã ghi nhận thu nhập đầu tư!");
            onRefresh(); onClose();
        } catch (e) {
            alert("Lỗi khi ghi nhận thu nhập");
            logger.error(e);
        }
    };

    return (
        <FormModal title="Ghi nhận Thu nhập Đầu tư" onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="form-label">Khoản đầu tư</label>
                    <select className="form-input" value={data.investment_id} onChange={e => setData({ ...data, investment_id: e.target.value })}>
                        <option value="">-- Chọn --</option>
                        {investments.map((inv: any) => (
                            <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>
                        ))}
                    </select>
                </div>

                {selectedInvestment && (
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                        <div>Giá trị đầu tư: <span className="font-mono font-bold text-blue-600">{formatCurrency(selectedInvestment.investment_amount || 0)}</span></div>
                        <div>Thu nhập lũy kế: <span className="font-mono font-bold text-green-600">{formatCurrency(selectedInvestment.income_received || 0)}</span></div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Số tiền thu nhập</label>
                        <input type="number" className="form-input font-bold text-green-600" value={data.income_amount} onChange={e => setData({ ...data, income_amount: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className="form-label">Ngày ghi nhận</label>
                        <DateInput className="form-input" value={data.income_date} onChange={v => setData({ ...data, income_date: v })} />
                    </div>
                </div>

                <div>
                    <label className="form-label">Ghi chú</label>
                    <input className="form-input" value={data.note} onChange={e => setData({ ...data, note: e.target.value })} placeholder="Ví dụ: Cổ tức, Lãi vay..." />
                </div>

                <button onClick={handleSave} className="form-button-primary w-full mt-4">Ghi nhận</button>
            </div>
        </FormModal>
    );
};

const DepreciationModal = ({ onClose, onRefresh, assets: _assets }: any) => {
    const handleRun = async () => {
        await assetService.calculateDepreciation({ period: toInputMonthValue() });
        alert("Đã tính khấu hao xong!");
        onRefresh(); onClose();
    };
    return (
        <FormModal title="Tính Khấu hao TSCĐ" onClose={onClose}>
            <div className="p-4 text-center">
                <p>Bạn có chắc muốn tính khấu hao cho tháng {formatMonthVN(toInputMonthValue())}?</p>
                <button onClick={handleRun} className="form-button-primary mt-4">Xác nhận</button>
            </div>
        </FormModal>
    );
};


const TransferAssetModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ asset_id: '', to_department: '', to_location: '', reason: '', approval_no: '', transfer_date: toInputDateValue() });

    const handleSave = async () => {
        try {
            await assetService.transferAsset(data);
            alert("Đã điều chuyển tài sản!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi điều chuyển"); logger.error(e); }
    };

    return <FormModal title="Điều chuyển Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Tài sản</label>
                <select className="form-input" value={data.asset_id} onChange={e => setData({ ...data, asset_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Bộ phận mới</label><input className="form-input" value={data.to_department} onChange={e => setData({ ...data, to_department: e.target.value })} placeholder="Phòng..." /></div>
                <div><label className="form-label">Vị trí mới</label><input className="form-input" value={data.to_location} onChange={e => setData({ ...data, to_location: e.target.value })} placeholder="Tầng/Khu..." /></div>
            </div>
            <div><label className="form-label">Lý do</label><input className="form-input" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số quyết định</label><input className="form-input" value={data.approval_no} onChange={e => setData({ ...data, approval_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày điều chuyển</label><DateInput className="form-input" value={data.transfer_date} onChange={v => setData({ ...data, transfer_date: v })} /></div>
            </div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Điều chuyển</button>
        </div>
    </FormModal>;
};

const RevaluationModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ asset_id: '', new_value: 0, reason: '', approval_no: '', revaluation_date: toInputDateValue() });

    // Update new_value default when asset changes
    useEffect(() => {
        if (data.asset_id) {
            const asset = assets.find((a: any) => a.id === data.asset_id);
            if (asset) setData(d => ({ ...d, new_value: asset.original_value }));
        }
    }, [data.asset_id, assets]);

    const handleSave = async () => {
        try {
            await assetService.revaluateAsset(data.asset_id, data);
            alert("Đã đánh giá lại tài sản!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi đánh giá lại"); logger.error(e); }
    };

    return <FormModal title="Đánh giá lại Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Tài sản</label>
                <select className="form-input" value={data.asset_id} onChange={e => setData({ ...data, asset_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
            </div>
            <div><label className="form-label">Nguyên giá mới</label><input type="number" className="form-input text-blue-600 font-bold" value={data.new_value} onChange={e => setData({ ...data, new_value: Number(e.target.value) })} /></div>
            <div><label className="form-label">Lý do</label><input className="form-input" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số biên bản/QĐ</label><input className="form-input" value={data.approval_no} onChange={e => setData({ ...data, approval_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày đánh giá</label><DateInput className="form-input" value={data.revaluation_date} onChange={v => setData({ ...data, revaluation_date: v })} /></div>
            </div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Xác nhận</button>
        </div>
    </FormModal>;
};

const CreateInventoryModal = ({ onClose, onRefresh }: any) => {
    const [data, setData] = useState({
        inventory_no: `KK-${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
        inventory_date: toInputDateValue(),
        fiscal_year: new Date().getFullYear(),
        inventory_type: 'PERIODIC',
        department: '',
        notes: ''
    });

    const handleSave = async () => {
        try {
            await assetService.createInventory(data);
            alert("Đã tạo phiếu kiểm kê!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi tạo"); logger.error(e); }
    };

    return <FormModal title="Tạo phiếu Kiểm kê Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số phiếu</label><input className="form-input" value={data.inventory_no} onChange={e => setData({ ...data, inventory_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày kiểm kê</label><DateInput className="form-input" value={data.inventory_date} onChange={v => setData({ ...data, inventory_date: v })} /></div>
            </div>
            <div>
                <label className="form-label">Loại kiểm kê</label>
                <select className="form-input" value={data.inventory_type} onChange={e => setData({ ...data, inventory_type: e.target.value })}>
                    <option value="PERIODIC">Định kỳ (Cuối năm)</option>
                    <option value="HANDOVER">Bàn giao</option>
                    <option value="SUDDEN">Đột xuất</option>
                </select>
            </div>
            <div><label className="form-label">Bộ phận (Tùy chọn)</label><input className="form-input" value={data.department} onChange={e => setData({ ...data, department: e.target.value })} placeholder="Để trống nếu kiểm kê toàn bộ" /></div>
            <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={3} value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} /></div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Tạo phiếu</button>
        </div>
    </FormModal>
};

const InventoryDetailModal = ({ inventory, onClose, assets }: any) => {
    const [report, setReport] = useState<any>(null);
    const [newItem, setNewItem] = useState({ asset_id: '', actual_quantity: 1, actual_condition: 'GOOD', actual_location: '', reason: '', notes: '' });

    useEffect(() => {
        loadReport();
    }, [inventory.id]);

    const loadReport = async () => {
        const res = await assetService.getInventoryReport(inventory.id);
        setReport(res.data);
    };

    const handleAddItem = async () => {
        if (!newItem.asset_id) return alert("Chọn tài sản!");
        const asset = assets.find((a: any) => a.id === newItem.asset_id);
        const book_value = asset ? asset.net_value : 0;

        try {
            await assetService.addInventoryItem(inventory.id, {
                ...newItem,
                book_quantity: 1, // Default assumption for fixed assets
                book_value: book_value
            });
            setNewItem({ asset_id: '', actual_quantity: 1, actual_condition: 'GOOD', actual_location: '', reason: '', notes: '' });
            loadReport();
        } catch (e) { logger.error(e); alert("Lỗi thêm chi tiết"); }
    };

    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-slate-700 rounded-t-lg">
                <h3 className="text-lg font-bold">Chi tiết Kiểm kê: {inventory.inventory_no}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sticky top-0 bg-white dark:bg-slate-800 z-10 pb-4 border-b">
                    <div className="md:col-span-1 border-r pr-4">
                        <label className="form-label">Chọn Tài sản</label>
                        <select className="form-input" value={newItem.asset_id} onChange={e => {
                            const asset = assets.find((a: any) => a.id === e.target.value);
                            setNewItem({ ...newItem, asset_id: e.target.value, actual_location: asset?.location || '' });
                        }}>
                            <option value="">-- Quét mã hoặc Chọn --</option>
                            {assets.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1 border-r pr-4 space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1"><label className="form-label">Tình trạng</label>
                                <select className="form-input" value={newItem.actual_condition} onChange={e => setNewItem({ ...newItem, actual_condition: e.target.value })}>
                                    <option value="GOOD">Tốt 100%</option>
                                    <option value="DAMAGED">Hư hỏng</option>
                                    <option value="MISSING">Mất mát</option>
                                    <option value="DISPOSED">Đề nghị thanh lý</option>
                                </select></div>
                            <div className="w-20"><label className="form-label">SL TT</label>
                                <input type="number" className="form-input" value={newItem.actual_quantity} onChange={e => setNewItem({ ...newItem, actual_quantity: Number(e.target.value) })} /></div>
                        </div>
                        <div><label className="form-label">Vị trí thực tế</label><input className="form-input" value={newItem.actual_location} onChange={e => setNewItem({ ...newItem, actual_location: e.target.value })} /></div>
                    </div>
                    <div className="md:col-span-1 flex flex-col justify-end">
                        <input className="form-input mb-2" placeholder="Ghi chú chênh lệch..." value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} />
                        <button onClick={handleAddItem} className="form-button-primary w-full">Ghi nhận</button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="font-bold border-l-4 border-blue-500 pl-2">Danh sách đã kiểm ({report?.items?.length || 0})</h4>
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-100 dark:bg-slate-700 text-left">
                            <tr>
                                <th className="p-2 border">Mã TS</th>
                                <th className="p-2 border">Tên TS</th>
                                <th className="p-2 border">Sổ sách</th>
                                <th className="p-2 border">Thực tế</th>
                                <th className="p-2 border">Chênh lệch</th>
                                <th className="p-2 border">HT Thực tế</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report?.items?.map((item: any) => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 border font-bold">{item.asset_code}</td>
                                    <td className="p-2 border">{item.asset_name}</td>
                                    <td className="p-2 border text-center">{item.book_quantity}</td>
                                    <td className="p-2 border text-center font-bold">{item.actual_quantity}</td>
                                    <td className={`p-2 border text-center font-bold ${item.diff_quantity !== 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {item.diff_quantity > 0 ? `+${item.diff_quantity}` : item.diff_quantity}
                                    </td>
                                    <td className="p-2 border">{item.actual_condition}</td>
                                </tr>
                            ))}
                            {report?.items?.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">Chưa có dữ liệu kiểm kê</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-slate-700 rounded-b-lg flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded border bg-white hover:bg-gray-100">Đóng</button>
                <button className="form-button-primary" onClick={() => alert("Chức năng in báo cáo đang cập nhật")}>In Báo cáo</button>
            </div>
        </div>
    </div>
}

const AssetCardModal = ({ asset, onClose }: any) => {
    // Only fetch history
    const [history, setHistory] = useState([]);
    useEffect(() => {
        assetService.getAssetCard(asset.id).then((res: any) => setHistory(res.data));
    }, [asset.id]);

    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold">Thẻ Tài sản: {asset.name} ({asset.code})</h3>
                <button onClick={onClose} className="text-2xl">&times;</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
                <table className="w-full text-sm border">
                    <thead className="bg-gray-100 font-bold">
                        <tr>
                            <th className="p-2 border">Năm</th>
                            <th className="p-2 border">Số thẻ</th>
                            <th className="p-2 border text-right">Giá trị đầu</th>
                            <th className="p-2 border text-right">Khấu hao năm</th>
                            <th className="p-2 border text-right">Giá trị còn lại</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((h: any) => (
                            <tr key={h.id}>
                                <td className="p-2 border text-center">{h.fiscal_year}</td>
                                <td className="p-2 border">{h.card_no}</td>
                                <td className="p-2 border text-right">{new Intl.NumberFormat('vi-VN').format(h.opening_value)}</td>
                                <td className="p-2 border text-right">{new Intl.NumberFormat('vi-VN').format(h.depreciation_current_year)}</td>
                                <td className="p-2 border text-right font-bold">{new Intl.NumberFormat('vi-VN').format(h.closing_net_value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
}


const MaintenanceModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ infra_id: '', maintenance_type: 'ROUTINE', cost: 0, date: toInputDateValue(), note: '' });

    const handleSave = async () => {
        try {
            await assetService.recordMaintenance(data);
            alert("Đã ghi nhận bảo trì!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi"); }
    };

    return <FormModal title="Bảo trì Hạ tầng" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Hạ tầng</label>
                <select className="form-input" value={data.infra_id} onChange={e => setData({ ...data, infra_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
            <div><label className="form-label">Chi phí</label><input type="number" className="form-input" value={data.cost} onChange={e => setData({ ...data, cost: Number(e.target.value) })} /></div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Ghi nhận</button>
        </div>
    </FormModal>;
}

const ConditionModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ id: '', condition: 'GOOD', note: '', assessment_date: toInputDateValue() });

    const handleSave = async () => {
        try {
            await assetService.updateCondition(data.id, data);
            alert("Đã cập nhật tình trạng!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi"); }
    };

    return <FormModal title="Đánh giá Tình trạng Hạ tầng" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Hạ tầng</label>
                <select className="form-input" value={data.id} onChange={e => setData({ ...data, id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
            <div>
                <label className="form-label">Tình trạng</label>
                <select className="form-input" value={data.condition} onChange={e => setData({ ...data, condition: e.target.value })}>
                    <option value="GOOD">Tốt</option>
                    <option value="AVERAGE">Trung bình</option>
                    <option value="POOR">Kém</option>
                    <option value="CRITICAL">Hư hỏng nặng</option>
                </select>
            </div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Cập nhật</button>
        </div>
    </FormModal>;
}

const DisposeModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ id: '', reason: '', approval_no: '', decrease_date: toInputDateValue(), disposal_value: 0 });

    const handleSave = async () => {
        if (!confirm('Hành động này sẽ ghi giảm và KHÔNG thể hoàn tác. Tiếp tục?')) return;
        try {
            await assetService.deleteFixedAsset(data.id, data);
            alert("Đã ghi giảm TSCĐ thành công!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi ghi giảm"); logger.error(e); }
    };

    return <FormModal title="Ghi giảm/Thanh lý Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Tài sản</label>
                <select className="form-input" value={data.id} onChange={e => setData({ ...data, id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.filter((a: any) => a.status === 'ACTIVE').map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
            </div>
            <div><label className="form-label">Lý do ghi giảm</label><input className="form-input" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} placeholder="Vd: Hư hỏng không thể sửa chữa, Thanh lý..." /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số quyết định</label><input className="form-input" value={data.approval_no} onChange={e => setData({ ...data, approval_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày ghi giảm</label><DateInput className="form-input" value={data.decrease_date} onChange={v => setData({ ...data, decrease_date: v })} /></div>
            </div>
            <div><label className="form-label">Giá trị thu hồi (nếu có)</label><input type="number" className="form-input" value={data.disposal_value} onChange={e => setData({ ...data, disposal_value: Number(e.target.value) })} /></div>
            <button onClick={handleSave} className="form-button-primary bg-red-600 hover:bg-red-700 w-full mt-4">Xác nhận Ghi giảm</button>
        </div>
    </FormModal>;
};
