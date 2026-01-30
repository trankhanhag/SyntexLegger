import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { type RibbonAction } from './Ribbon';
import { taxService, masterDataService, einvoiceService } from '../api';
import { TaxDeclarationForm } from './TaxDeclarationForm';
import { TaxHealthReport } from './AuditModal';
import { formatDateVN } from '../utils/dateUtils';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { triggerBrowserPrint } from '../hooks/usePrintHandler';

// E-Invoice Provider type
interface EInvoiceProvider {
    code: string;
    name: string;
    description: string;
    isActive: boolean;
    demoMode: boolean;
    lastSyncAt: string | null;
    hasConfig: boolean;
}

// Provider config interface
interface ProviderConfig {
    apiUrl: string;
    username: string;
    password: string;
    taxCode: string;
    // VNPT specific
    accountId?: string;
    // Viettel specific
    partnerCode?: string;
    secretKey?: string;
    // BKAV specific
    appId?: string;
    appSecret?: string;
    // MISA specific
    accessToken?: string;
}

interface ImportedInvoice {
    id: number;
    invoice_no: string;
    invoice_series: string;
    invoice_date: string;
    seller_tax_code: string;
    seller_name: string;
    buyer_tax_code: string;
    buyer_name: string;
    total_before_tax: number;
    vat_amount: number;
    total_amount: number;
    invoice_type: string;
    status: string;
    provider_name: string;
}

interface TaxModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[] }) => void;
    onNavigate?: (viewId: string) => void;
}

export const TaxModule: React.FC<TaxModuleProps> = ({ subView = 'vat', printSignal = 0, onSetHeader, onNavigate }) => {

    const [view, setView] = useState(subView);
    const [period, setPeriod] = useState('Tháng 10/2024');
    const [vatType, setVatType] = useState<'input' | 'output'>('input');

    const [loadingSync, setLoadingSync] = useState(false);

    // Lookup State
    const [lookupMst, setLookupMst] = useState('');
    const [businessInfo, setBusinessInfo] = useState<any>(null);
    const [loadingLookup, setLoadingLookup] = useState(false);

    const [importing, setImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState<string | null>(null);
    const [subTab, setSubTab] = useState<string>('main'); // 'main' for declaration, 'details' or 'in'/'out' for appendixes
    const [declarationData, setDeclarationData] = useState<any>({});

    const [vatData, setVatData] = useState<any[]>([]);
    const [pitData, setPitData] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);

    // E-Invoice State
    const [einvoiceProviders, setEinvoiceProviders] = useState<EInvoiceProvider[]>([]);
    const [importedInvoices, setImportedInvoices] = useState<ImportedInvoice[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('mock');
    const [syncFromDate, setSyncFromDate] = useState<string>(new Date().toISOString().slice(0, 8) + '01');
    const [syncToDate, setSyncToDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [syncLoading, setSyncLoading] = useState(false);
    const [einvoiceLookupParams, setEinvoiceLookupParams] = useState({ taxCode: '', invoiceNo: '', fromDate: '', toDate: '' });
    const [einvoiceLookupResults, setEinvoiceLookupResults] = useState<any[]>([]);
    const [lookupLoading, setLookupLoading] = useState(false);

    // Provider Config Modal State
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [configProvider, setConfigProvider] = useState<EInvoiceProvider | null>(null);
    const [configForm, setConfigForm] = useState<{
        isActive: boolean;
        demoMode: boolean;
        credentials: ProviderConfig;
    }>({
        isActive: false,
        demoMode: true,
        credentials: {
            apiUrl: '',
            username: '',
            password: '',
            taxCode: '',
        }
    });
    const [configSaving, setConfigSaving] = useState(false);

    // XML Import State
    const [xmlImporting, setXmlImporting] = useState(false);
    const xmlFileInputRef = React.useRef<HTMLInputElement>(null);

    // Voucher Creation State
    const [creatingVoucher, setCreatingVoucher] = useState<number | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleUploadXML = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const content = ev.target?.result as string;
            setLoadingSync(true); // Re-use loading state for visual feedback
            try {
                const res = await taxService.uploadXml(content);
                // Prepend new invoice to list
                setInvoices(prev => [res.data.data, ...prev]);
                alert("Đã thêm hóa đơn XML thành công!");
            } catch (err: any) {
                console.error("Upload XML error:", err);
                alert("Lỗi khi đọc file XML: " + (err.response?.data?.error || err.message));
            } finally {
                setLoadingSync(false);
                // Reset input
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async (target: 'KH' | 'NCC') => {
        if (!businessInfo) return;
        setImporting(true);
        try {
            const partnerData = {
                partner_code: `${target}_${businessInfo.tax_code}`,
                partner_name: businessInfo.name,
                tax_code: businessInfo.tax_code,
                address: businessInfo.address
            };
            await masterDataService.savePartner(partnerData);
            setImportSuccess(`Đã lưu thành công vào danh mục ${target === 'KH' ? 'Khách hàng' : 'Nhà cung cấp'}`);
            setTimeout(() => setImportSuccess(null), 3000);
        } catch (err: any) {
            console.error("Import failed:", err);
            alert("Không thể lưu thông tin: " + (err.response?.data?.error || "Lỗi hệ thống."));
        } finally {
            setImporting(false);
        }
    };

    const handleLookup = async () => {
        if (!lookupMst) return;
        setLoadingLookup(true);
        try {
            const res = await taxService.lookupGST(lookupMst);
            setBusinessInfo(res.data);
        } catch (err) {
            console.error("Lookup failed:", err);
            alert("Không tìm thấy thông tin cho Mã số thuế này hoặc lỗi kết nối Tổng cục thuế.");
        } finally {
            setLoadingLookup(false);
        }
    };

    // E-Invoice Handlers
    const handleSyncInvoices = async () => {
        if (!selectedProvider) {
            alert('Vui lòng chọn nhà cung cấp');
            return;
        }
        setSyncLoading(true);
        try {
            const res = await einvoiceService.syncInvoices({
                providerCode: selectedProvider,
                fromDate: syncFromDate,
                toDate: syncToDate
            });
            if (res.data.success) {
                alert(`Đồng bộ thành công! ${res.data.data.totalNew} hóa đơn mới.${res.data.isMock ? ' (Demo mode)' : ''}`);
                // Reload invoices
                const invRes = await einvoiceService.getInvoices({ limit: 100 });
                if (invRes.data.success) {
                    setImportedInvoices(invRes.data.data.invoices);
                }
            } else {
                alert('Lỗi đồng bộ: ' + (res.data.error?.message || 'Unknown error'));
            }
        } catch (err: any) {
            console.error('Sync error:', err);
            alert('Lỗi đồng bộ: ' + (err.response?.data?.error?.message || err.message));
        } finally {
            setSyncLoading(false);
        }
    };

    const handleTestConnection = async (providerCode: string) => {
        try {
            const res = await einvoiceService.testConnection(providerCode);
            if (res.data.success) {
                alert(`Kết nối thành công!${res.data.isMock ? ' (Demo mode)' : ''}`);
            } else {
                alert('Kết nối thất bại: ' + (res.data.error?.message || 'Unknown error'));
            }
        } catch (err: any) {
            alert('Lỗi kết nối: ' + (err.response?.data?.error?.message || err.message));
        }
    };

    const handleEinvoiceLookup = async () => {
        if (!einvoiceLookupParams.taxCode && !einvoiceLookupParams.invoiceNo) {
            alert('Vui lòng nhập MST hoặc số hóa đơn');
            return;
        }
        setLookupLoading(true);
        try {
            const res = await einvoiceService.lookupInvoice({
                providerCode: selectedProvider,
                taxCode: einvoiceLookupParams.taxCode || undefined,
                invoiceNo: einvoiceLookupParams.invoiceNo || undefined,
                fromDate: einvoiceLookupParams.fromDate || undefined,
                toDate: einvoiceLookupParams.toDate || undefined
            });
            if (res.data.success) {
                const invoices = res.data.data.invoices || (res.data.data ? [res.data.data] : []);
                setEinvoiceLookupResults(invoices);
            } else {
                alert('Không tìm thấy: ' + (res.data.error?.message || 'Unknown error'));
                setEinvoiceLookupResults([]);
            }
        } catch (err: any) {
            alert('Lỗi tra cứu: ' + (err.response?.data?.error?.message || err.message));
            setEinvoiceLookupResults([]);
        } finally {
            setLookupLoading(false);
        }
    };

    // Open provider config modal
    const handleOpenConfigModal = async (provider: EInvoiceProvider) => {
        setConfigProvider(provider);
        try {
            const res = await einvoiceService.getProviderConfig(provider.code);
            if (res.data.success && res.data.data) {
                setConfigForm({
                    isActive: res.data.data.isActive || false,
                    demoMode: res.data.data.demoMode ?? true,
                    credentials: {
                        apiUrl: res.data.data.config?.apiUrl || getDefaultApiUrl(provider.code),
                        username: res.data.data.config?.username || '',
                        password: res.data.data.config?.password || '',
                        taxCode: res.data.data.config?.taxCode || '',
                        accountId: res.data.data.config?.accountId || '',
                        partnerCode: res.data.data.config?.partnerCode || '',
                        secretKey: res.data.data.config?.secretKey || '',
                        appId: res.data.data.config?.appId || '',
                        appSecret: res.data.data.config?.appSecret || '',
                        accessToken: res.data.data.config?.accessToken || '',
                    }
                });
            } else {
                // Default form
                setConfigForm({
                    isActive: false,
                    demoMode: true,
                    credentials: {
                        apiUrl: getDefaultApiUrl(provider.code),
                        username: '',
                        password: '',
                        taxCode: '',
                    }
                });
            }
        } catch (err) {
            console.error('Failed to load config:', err);
            setConfigForm({
                isActive: false,
                demoMode: true,
                credentials: {
                    apiUrl: getDefaultApiUrl(provider.code),
                    username: '',
                    password: '',
                    taxCode: '',
                }
            });
        }
        setConfigModalOpen(true);
    };

    // Get default API URL for provider
    const getDefaultApiUrl = (code: string): string => {
        switch (code) {
            case 'vnpt': return 'https://einvoice.vnpt-epay.com.vn/api';
            case 'viettel': return 'https://sinvoice.viettel.vn/api';
            case 'bkav': return 'https://hoadondientu.bkav.com.vn/api';
            case 'misa': return 'https://meinvoice.vn/api';
            default: return '';
        }
    };

    // Save provider config
    const handleSaveConfig = async () => {
        if (!configProvider) return;
        setConfigSaving(true);
        try {
            const res = await einvoiceService.saveProviderConfig(configProvider.code, configForm);
            if (res.data.success) {
                alert('Đã lưu cấu hình thành công!');
                setConfigModalOpen(false);
                // Reload providers
                const providerRes = await einvoiceService.getProviders();
                if (providerRes.data.success) {
                    setEinvoiceProviders(providerRes.data.data);
                }
            } else {
                alert('Lỗi lưu cấu hình: ' + (res.data.error?.message || 'Unknown error'));
            }
        } catch (err: any) {
            alert('Lỗi lưu cấu hình: ' + (err.response?.data?.error?.message || err.message));
        } finally {
            setConfigSaving(false);
        }
    };

    // XML Import Handler (GDT)
    const handleXmlImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setXmlImporting(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const content = await file.text();

                try {
                    const res = await einvoiceService.importFromXml(content);
                    if (res.data.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error(`Import error for ${file.name}:`, res.data.error);
                    }
                } catch (err) {
                    errorCount++;
                    console.error(`Import error for ${file.name}:`, err);
                }
            }

            alert(`Import hoàn tất!\n- Thành công: ${successCount}\n- Lỗi: ${errorCount}`);

            // Reload invoices
            const invRes = await einvoiceService.getInvoices({ limit: 100 });
            if (invRes.data.success) {
                setImportedInvoices(invRes.data.data.invoices);
            }
        } catch (err: any) {
            alert('Lỗi import: ' + err.message);
        } finally {
            setXmlImporting(false);
            if (xmlFileInputRef.current) xmlFileInputRef.current.value = '';
        }
    };

    // Create Voucher from Invoice
    const handleCreateVoucher = async (invoiceId: number) => {
        if (!confirm('Tạo chứng từ kế toán từ hóa đơn này?')) return;

        setCreatingVoucher(invoiceId);
        try {
            const res = await einvoiceService.createVoucherFromInvoice(String(invoiceId));
            if (res.data.success) {
                alert(`Đã tạo chứng từ ${res.data.data.voucherNo} thành công!`);
                // Reload invoices
                const invRes = await einvoiceService.getInvoices({ limit: 100 });
                if (invRes.data.success) {
                    setImportedInvoices(invRes.data.data.invoices);
                }
            } else {
                alert('Lỗi tạo chứng từ: ' + (res.data.error?.message || 'Unknown error'));
            }
        } catch (err: any) {
            alert('Lỗi tạo chứng từ: ' + (err.response?.data?.error?.message || err.message));
        } finally {
            setCreatingVoucher(null);
        }
    };

    useEffect(() => {
        if (subView) setView(subView);
    }, [subView]);

    useEffect(() => {
        setSubTab('main');
    }, [view]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Determine date range from period (placeholder logic for now)
                let from = '2024-10-01';
                let to = '2024-10-31';
                if (period.includes('11')) { from = '2024-11-01'; to = '2024-11-30'; }
                if (period.includes('12')) { from = '2024-12-01'; to = '2024-12-31'; }
                if (period.includes('IV')) { from = '2024-10-01'; to = '2024-12-31'; }
                if (period.includes('Năm')) { from = '2024-01-01'; to = '2024-12-31'; }

                if (view === 'vat') {
                    const declRes = await taxService.getDeclaration({ type: 'vat', from, to });
                    setDeclarationData(declRes.data);

                    const res = await taxService.getVatReport({ type: vatType, from, to });
                    setVatData(res.data);
                } else if (view === 'pit') {
                    const declRes = await taxService.getDeclaration({ type: 'pit', from, to });
                    setDeclarationData(declRes.data);

                    const res = await taxService.getPitReport({ from, to });
                    setPitData(res.data);
                } else if (view === 'cit') {
                    const declRes = await taxService.getDeclaration({ type: 'cit', from, to });
                    setDeclarationData(declRes.data);
                } else if (view === 'invoices') {
                    // Start with empty invoices until sync
                    if (invoices.length === 0) setInvoices([]);
                } else if (view === 'provider-config' || view === 'invoice-sync' || view === 'invoice-lookup' || view === 'invoice-match') {
                    // Load e-invoice providers
                    const providerRes = await einvoiceService.getProviders();
                    if (providerRes.data.success) {
                        setEinvoiceProviders(providerRes.data.data);
                    }
                    // Load imported invoices
                    if (view === 'invoice-sync' || view === 'invoice-match') {
                        const invRes = await einvoiceService.getInvoices({ limit: 100 });
                        if (invRes.data.success) {
                            setImportedInvoices(invRes.data.data.invoices);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load tax data:", err);
            }
        };
        loadData();
    }, [view, vatType, period]);

    // Print handler - use centralized print utility
    useEffect(() => {
        if (printSignal > 0) {
            triggerBrowserPrint();
        }
    }, [printSignal]);

    useEffect(() => {
        if (onSetHeader) {
            const getTitle = () => {
                switch (view) {
                    case 'vat': return 'Tờ khai thuế GTGT';
                    case 'pit': return 'Quyết toán thuế TNCN';
                    case 'cit': return 'Quyết toán thuế TNDN';
                    case 'invoices': return 'Hệ thống Hóa đơn điện tử';
                    case 'lookup': return 'Tra cứu Thông tin Tổng cục Thuế';
                    case 'check': return 'Sức khỏe Thuế & Rủi ro Kế toán';
                    case 'provider-config': return 'Cấu hình Nhà cung cấp HĐĐT';
                    case 'invoice-sync': return 'Đồng bộ Hóa đơn điện tử';
                    case 'invoice-lookup': return 'Tra cứu Hóa đơn điện tử';
                    case 'invoice-match': return 'Khớp Hóa đơn với Chứng từ';
                    default: return 'Quản lý Thuế & Hóa đơn';
                }
            };
            const getIcon = () => {
                switch (view) {
                    case 'vat': return 'receipt_long';
                    case 'pit': return 'person_pin';
                    case 'cit': return 'business';
                    case 'invoices': return 'description';
                    case 'lookup': return 'search';
                    case 'check': return 'health_and_safety';
                    case 'provider-config': return 'settings';
                    case 'invoice-sync': return 'sync';
                    case 'invoice-lookup': return 'manage_search';
                    case 'invoice-match': return 'compare_arrows';
                    default: return 'policy';
                }
            };

            const actions: RibbonAction[] = [];
            if (view === 'invoices') {
                actions.push({
                    label: loadingSync ? 'Đang xử lý XML...' : 'Tải lên Hóa đơn XML',
                    icon: 'upload_file',
                    onClick: () => fileInputRef.current?.click(),
                    primary: true
                });
            }
            if (view === 'check') {
                actions.push({
                    label: 'Quét lại',
                    icon: 'refresh',
                    onClick: () => window.location.reload(),
                    primary: true
                });
            } else if (view === 'invoice-sync') {
                actions.push({
                    label: syncLoading ? 'Đang đồng bộ...' : 'Đồng bộ ngay',
                    icon: 'sync',
                    onClick: handleSyncInvoices,
                    primary: true
                });
            } else if (view !== 'lookup' && view !== 'provider-config' && view !== 'invoice-lookup' && view !== 'invoice-match') {
                actions.push({
                    label: 'XML (HTKK)',
                    icon: 'sim_card_download',
                    onClick: () => alert("Đang kết xuất XML...")
                });
                actions.push({
                    label: 'Excel',
                    icon: 'table_chart',
                    onClick: () => alert("Đang kết xuất Excel...")
                });
            }

            onSetHeader({ title: getTitle(), icon: getIcon(), actions });
        }
    }, [view, onSetHeader, loadingSync, vatType, subTab]);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

    const vatColumns: ColumnDef[] = [
        { field: 'date', headerName: 'Ngày HĐ', width: 'w-32', type: 'date' },
        { field: 'invNo', headerName: 'Số Hóa Đơn', width: 'w-32', align: 'center' },
        { field: 'taxCode', headerName: 'Mã số thuế', width: 'w-36' },
        { field: 'partner', headerName: 'Tên Đơn vị', width: 'min-w-[250px]' },
        {
            field: 'value', headerName: 'Giá trị chưa thuế', width: 'w-40', align: 'right',
            renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span>
        },
        { field: 'rate', headerName: 'Thuế suất', width: 'w-24', align: 'center' },
        {
            field: 'tax', headerName: 'Tiền thuế', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
    ];

    const pitColumns: ColumnDef[] = [
        { field: 'name', headerName: 'Họ và tên', width: 'min-w-[200px]' },
        { field: 'type', headerName: 'Đối tượng', width: 'w-40' },
        { field: 'income', headerName: 'Tổng thu nhập', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span> },
        { field: 'deduct', headerName: 'Các khoản giảm trừ', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span> },
        { field: 'taxable', headerName: 'TN Tính thuế', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span> },
        { field: 'tax', headerName: 'Thuế TNCN', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span> },
    ];

    const invColumns: ColumnDef[] = [
        { field: 'type', headerName: 'Loại', width: 'w-24', align: 'center', renderCell: (v: string) => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.includes('vào') ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{v}</span> },
        { field: 'date', headerName: 'Ngày HĐ', width: 'w-32', type: 'date' },
        { field: 'label', headerName: 'Ký hiệu', width: 'w-28', align: 'center' },
        { field: 'no', headerName: 'Số HĐ', width: 'w-24', align: 'center' },
        { field: 'partner', headerName: 'Đối tác / Bên bán', width: 'min-w-[200px]' },
        { field: 'total', headerName: 'Tổng thanh toán', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
        { field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center', renderCell: (v: string) => <span className={v === 'Hợp lệ' ? 'text-green-600 font-bold' : 'text-red-500 line-through'}>{v}</span> },
    ];

    // ModuleOverview for Tax module
    if (view === 'overview') {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.tax?.title || 'Quản lý Thuế'}
                description={MODULE_CONFIGS.tax?.description || 'Quản lý thuế GTGT, TNCN, TNDN và hóa đơn điện tử'}
                icon={MODULE_CONFIGS.tax?.icon || 'policy'}
                iconColor={MODULE_CONFIGS.tax?.iconColor || 'red'}
                workflow={MODULE_CONFIGS.tax?.workflow || []}
                features={MODULE_CONFIGS.tax?.features || []}
                stats={[
                    { icon: 'receipt_long', label: 'Thuế GTGT', value: '-', color: 'blue' },
                    { icon: 'person_pin', label: 'Thuế TNCN', value: '-', color: 'amber' },
                    { icon: 'business', label: 'Thuế TNDN', value: '-', color: 'green' },
                    { icon: 'description', label: 'Hóa đơn', value: '-', color: 'purple' },
                ]}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4 shrink-0 no-print">
                <div className="flex items-center gap-3">
                    <p className="text-xs text-slate-500 font-medium italic">Kỳ báo cáo:</p>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="text-xs font-bold bg-transparent text-blue-600 dark:text-blue-400 outline-none cursor-pointer"
                    >
                        <option>Tháng 10/2024</option>
                        <option>Tháng 11/2024</option>
                        <option>Tháng 12/2024</option>
                        <option>Quý IV/2024</option>
                        <option>Năm 2024</option>
                    </select>
                </div>
            </div>

            {/* Hidden File Input for XML Upload */}
            <input type="file" ref={fileInputRef} accept=".xml" onChange={handleUploadXML} className="hidden" />

            {view === 'vat' && (
                <div className="px-6 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex gap-4 shrink-0 no-print">
                    <button onClick={() => setSubTab('main')} className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${subTab === 'main' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tờ khai 01/GTGT</button>
                    <button onClick={() => { setSubTab('list'); setVatType('input'); }} className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${(subTab === 'list' && vatType === 'input') ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>PL 01-2/GTGT: Mua vào</button>
                    <button onClick={() => { setSubTab('list'); setVatType('output'); }} className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${(subTab === 'list' && vatType === 'output') ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>PL 01-1/GTGT: Bán ra</button>
                </div>
            )}

            {view === 'pit' && (
                <div className="px-6 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex gap-4 shrink-0 no-print">
                    <button onClick={() => setSubTab('main')} className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${subTab === 'main' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tờ khai 05/KK-TNCN</button>
                    <button onClick={() => setSubTab('list')} className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${subTab === 'list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Bảng kê chi tiết</button>
                </div>
            )}

            {view === 'cit' && (
                <div className="px-6 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex gap-4 shrink-0 no-print">
                    <button onClick={() => setSubTab('main')} className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${subTab === 'main' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tờ khai 03/TNDN</button>
                    <button onClick={() => setSubTab('list')} className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${subTab === 'list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>PL 03-1A: Kết quả KD</button>
                </div>
            )}

            <div className={`flex-1 overflow-auto relative bg-slate-50 dark:bg-slate-900/20 print-content`}>
                {/* Print Header - only visible when printing */}
                <div className="hidden print:block print-header mb-6">
                    <h1 className="print-title">{
                        view === 'vat' ? 'TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG' :
                        view === 'pit' ? 'QUYẾT TOÁN THUẾ THU NHẬP CÁ NHÂN' :
                        view === 'cit' ? 'QUYẾT TOÁN THUẾ THU NHẬP DOANH NGHIỆP' :
                        'BÁO CÁO THUẾ'
                    }</h1>
                    <p className="print-subtitle">Kỳ báo cáo: {period}</p>
                </div>

                {view === 'vat' && (
                    subTab === 'main' ?
                        <TaxDeclarationForm type="vat" data={declarationData} period={period} /> :
                        <SmartTable data={vatData} columns={vatColumns} keyField="id" minRows={15} />
                )}
                {view === 'pit' && (
                    subTab === 'main' ?
                        <TaxDeclarationForm type="pit" data={declarationData} period={period} /> :
                        <SmartTable data={pitData} columns={pitColumns} keyField="id" minRows={15} />
                )}
                {view === 'cit' && (
                    subTab === 'main' ?
                        <TaxDeclarationForm type="cit" data={declarationData} period={period} /> :
                        <div className="p-20 text-center opacity-50 italic">Đang tải phụ lục Kết quả kinh doanh...</div>
                )}
                {view === 'invoices' && (
                    <div className="flex flex-col h-full relative">
                        {loadingSync && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden z-20">
                                <div className="h-full bg-blue-500 animate-pulse w-full"></div>
                            </div>
                        )}
                        <SmartTable data={invoices} columns={invColumns} keyField="id" minRows={15} />
                    </div>
                )}
                {view === 'lookup' && (
                    <div className="p-8 max-w-4xl mx-auto w-full">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden font-display">
                            <div className="p-8 bg-gradient-to-r from-red-600 to-red-800 text-white">
                                <h3 className="text-2xl font-black mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-3xl">search_check</span>Tra cứu thông tin Người nộp thuế</h3>
                                <p className="text-red-100 text-sm opacity-80 italic">Truy vấn trực tiếp từ cơ sở dữ liệu Tổng cục Thuế Việt Nam</p>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <input type="text" placeholder="Nhập Mã số thuế để tra cứu..." value={lookupMst} onChange={(e) => setLookupMst(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLookup()} className="form-input text-xl font-bold font-mono rounded-xl px-6 py-4 border-2 bg-slate-50 dark:bg-slate-900 focus:border-red-500 focus:ring-red-500/20" />
                                        {loadingLookup && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-6 h-6 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                    </div>
                                    <button onClick={handleLookup} disabled={loadingLookup} className="form-button-primary bg-red-600 hover:bg-red-700 rounded-xl font-black shadow-lg active:scale-95 disabled:bg-slate-400 px-8 py-3">TRA CỨU NGAY</button>
                                </div>
                                {businessInfo ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="md:col-span-2 p-6 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl">
                                            <p className="text-[10px] font-bold text-green-600 uppercase mb-1 tracking-widest">Tên chính thức</p>
                                            <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase leading-tight">{businessInfo.name}</h4>
                                        </div>
                                        <div className="p-5 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Thông tin MST</p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2"><span className="text-slate-500 text-sm">Mã số thuế:</span><span className="font-bold font-mono text-red-600">{businessInfo.tax_code}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2"><span className="text-slate-500 text-sm">Trạng thái:</span><span className="font-bold text-green-600 text-sm">{businessInfo.status}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500 text-sm">Ngày cấp:</span><span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{formatDateVN(businessInfo.date_of_license)}</span></div>
                                            </div>
                                        </div>
                                        <div className="p-5 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Người đại diện & Địa chỉ</p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2"><span className="text-slate-500 text-sm">Đại diện:</span><span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{businessInfo.representative}</span></div>
                                                <div className="space-y-1"><span className="text-slate-500 text-sm block">Địa chỉ trụ sở:</span><span className="font-medium text-slate-600 dark:text-slate-300 text-xs italic leading-relaxed block">{businessInfo.address}</span></div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 flex flex-col items-center gap-4 pt-4">
                                            {importSuccess && <div className="w-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-xs font-bold text-center border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-2 duration-300">{importSuccess}</div>}
                                            <div className="flex gap-4">
                                                <button onClick={() => handleImport('KH')} disabled={importing} className="form-button-secondary flex items-center gap-2 border-2 border-slate-100 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold active:scale-95 disabled:opacity-50"><span className="material-symbols-outlined text-blue-500">person_add</span>Import vào Khách hàng</button>
                                                <button onClick={() => handleImport('NCC')} disabled={importing} className="form-button-secondary flex items-center gap-2 border-2 border-slate-100 dark:border-slate-600 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold active:scale-95 disabled:opacity-50"><span className="material-symbols-outlined text-orange-500">local_shipping</span>Import vào Nhà cung cấp</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                                        <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4 animate-pulse">business</span>
                                        <p className="text-slate-400 font-medium italic">Vui lòng nhập Mã số thuế chính xác để lấy dữ liệu thực tế</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {view === 'check' && (
                    <div className="h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
                        <TaxHealthReport onNavigate={onNavigate} />
                    </div>
                )}

                {/* E-Invoice Provider Config View */}
                {view === 'provider-config' && (
                    <div className="p-6 max-w-5xl mx-auto">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Cấu hình Nhà cung cấp Hóa đơn điện tử</h3>
                            <p className="text-sm text-slate-500">Kết nối với các nhà cung cấp dịch vụ HĐĐT để đồng bộ và tra cứu hóa đơn tự động.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {einvoiceProviders.map(provider => (
                                <div key={provider.code} className={`bg-white dark:bg-slate-800 rounded-xl border ${provider.isActive ? 'border-green-300 dark:border-green-700' : 'border-slate-200 dark:border-slate-700'} p-5 relative`}>
                                    {provider.demoMode && (
                                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">DEMO</span>
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${provider.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                            <span className={`material-symbols-outlined text-xl ${provider.isActive ? 'text-green-600' : 'text-slate-400'}`}>cloud_sync</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-700 dark:text-slate-200">{provider.name}</h4>
                                            <p className="text-xs text-slate-500">{provider.description}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Trạng thái:</span>
                                            <span className={provider.isActive ? 'text-green-600 font-bold' : 'text-slate-400'}>
                                                {provider.isActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Đồng bộ gần nhất:</span>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {provider.lastSyncAt ? formatDateVN(provider.lastSyncAt) : 'Chưa đồng bộ'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => handleTestConnection(provider.code)}
                                            className="flex-1 px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            Test kết nối
                                        </button>
                                        <button
                                            className="flex-1 px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            onClick={() => handleOpenConfigModal(provider)}
                                        >
                                            Cấu hình
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Provider Config Modal */}
                        {configModalOpen && configProvider && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                                    <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold">Cấu hình {configProvider.name}</h3>
                                                <p className="text-blue-100 text-sm">{configProvider.description}</p>
                                            </div>
                                            <button
                                                onClick={() => setConfigModalOpen(false)}
                                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                                            >
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                                        {/* Basic Settings */}
                                        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={configForm.isActive}
                                                    onChange={(e) => setConfigForm({ ...configForm, isActive: e.target.checked })}
                                                    className="form-checkbox h-4 w-4 text-green-600 rounded"
                                                />
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Kích hoạt</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={configForm.demoMode}
                                                    onChange={(e) => setConfigForm({ ...configForm, demoMode: e.target.checked })}
                                                    className="form-checkbox h-4 w-4 text-amber-500 rounded"
                                                />
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Chế độ Demo</span>
                                            </label>
                                        </div>

                                        {!configForm.demoMode && (
                                            <>
                                                {/* Common Fields */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thông tin kết nối</h4>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">API URL</label>
                                                        <input
                                                            type="text"
                                                            value={configForm.credentials.apiUrl}
                                                            onChange={(e) => setConfigForm({
                                                                ...configForm,
                                                                credentials: { ...configForm.credentials, apiUrl: e.target.value }
                                                            })}
                                                            className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 font-mono"
                                                            placeholder="https://api.example.com"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Mã số thuế đơn vị</label>
                                                        <input
                                                            type="text"
                                                            value={configForm.credentials.taxCode}
                                                            onChange={(e) => setConfigForm({
                                                                ...configForm,
                                                                credentials: { ...configForm.credentials, taxCode: e.target.value }
                                                            })}
                                                            className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 font-mono"
                                                            placeholder="0102345678"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Username</label>
                                                            <input
                                                                type="text"
                                                                value={configForm.credentials.username}
                                                                onChange={(e) => setConfigForm({
                                                                    ...configForm,
                                                                    credentials: { ...configForm.credentials, username: e.target.value }
                                                                })}
                                                                className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                                                            <input
                                                                type="password"
                                                                value={configForm.credentials.password}
                                                                onChange={(e) => setConfigForm({
                                                                    ...configForm,
                                                                    credentials: { ...configForm.credentials, password: e.target.value }
                                                                })}
                                                                className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Provider-specific fields */}
                                                {configProvider.code === 'vnpt' && (
                                                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">VNPT Invoice</h4>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Account ID</label>
                                                            <input
                                                                type="text"
                                                                value={configForm.credentials.accountId || ''}
                                                                onChange={(e) => setConfigForm({
                                                                    ...configForm,
                                                                    credentials: { ...configForm.credentials, accountId: e.target.value }
                                                                })}
                                                                className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {configProvider.code === 'viettel' && (
                                                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Viettel S-Invoice</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Partner Code</label>
                                                                <input
                                                                    type="text"
                                                                    value={configForm.credentials.partnerCode || ''}
                                                                    onChange={(e) => setConfigForm({
                                                                        ...configForm,
                                                                        credentials: { ...configForm.credentials, partnerCode: e.target.value }
                                                                    })}
                                                                    className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Secret Key</label>
                                                                <input
                                                                    type="password"
                                                                    value={configForm.credentials.secretKey || ''}
                                                                    onChange={(e) => setConfigForm({
                                                                        ...configForm,
                                                                        credentials: { ...configForm.credentials, secretKey: e.target.value }
                                                                    })}
                                                                    className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {configProvider.code === 'bkav' && (
                                                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">BKAV eHoadon</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">App ID</label>
                                                                <input
                                                                    type="text"
                                                                    value={configForm.credentials.appId || ''}
                                                                    onChange={(e) => setConfigForm({
                                                                        ...configForm,
                                                                        credentials: { ...configForm.credentials, appId: e.target.value }
                                                                    })}
                                                                    className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">App Secret</label>
                                                                <input
                                                                    type="password"
                                                                    value={configForm.credentials.appSecret || ''}
                                                                    onChange={(e) => setConfigForm({
                                                                        ...configForm,
                                                                        credentials: { ...configForm.credentials, appSecret: e.target.value }
                                                                    })}
                                                                    className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {configProvider.code === 'misa' && (
                                                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">MISA meInvoice</h4>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Access Token</label>
                                                            <input
                                                                type="password"
                                                                value={configForm.credentials.accessToken || ''}
                                                                onChange={(e) => setConfigForm({
                                                                    ...configForm,
                                                                    credentials: { ...configForm.credentials, accessToken: e.target.value }
                                                                })}
                                                                className="form-input w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 font-mono"
                                                                placeholder="Token từ MISA Developer Portal"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {configForm.demoMode && (
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-amber-500">info</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Chế độ Demo đang bật</p>
                                                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                                                            Hệ thống sẽ sử dụng dữ liệu mẫu thay vì kết nối thực.
                                                            Tắt chế độ Demo và nhập thông tin API để kết nối với nhà cung cấp thực.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                        <button
                                            onClick={() => setConfigModalOpen(false)}
                                            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleSaveConfig}
                                            disabled={configSaving}
                                            className="px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2 transition-colors"
                                        >
                                            {configSaving && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                                            {configSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* E-Invoice Sync View */}
                {view === 'invoice-sync' && (
                    <div className="flex flex-col h-full">
                        {/* Hidden XML file input */}
                        <input
                            type="file"
                            ref={xmlFileInputRef}
                            accept=".xml"
                            multiple
                            onChange={handleXmlImport}
                            className="hidden"
                        />
                        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500">Nhà cung cấp:</label>
                                <select
                                    value={selectedProvider}
                                    onChange={(e) => setSelectedProvider(e.target.value)}
                                    className="form-select text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                >
                                    {einvoiceProviders.map(p => (
                                        <option key={p.code} value={p.code}>{p.name}{p.demoMode ? ' (Demo)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500">Từ ngày:</label>
                                <input
                                    type="date"
                                    value={syncFromDate}
                                    onChange={(e) => setSyncFromDate(e.target.value)}
                                    className="form-input text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500">Đến ngày:</label>
                                <input
                                    type="date"
                                    value={syncToDate}
                                    onChange={(e) => setSyncToDate(e.target.value)}
                                    className="form-input text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                />
                            </div>
                            <button
                                onClick={handleSyncInvoices}
                                disabled={syncLoading}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2"
                            >
                                <span className={`material-symbols-outlined text-lg ${syncLoading ? 'animate-spin' : ''}`}>sync</span>
                                {syncLoading ? 'Đang đồng bộ...' : 'Đồng bộ'}
                            </button>
                            <div className="border-l border-slate-300 dark:border-slate-600 h-8 mx-2"></div>
                            <button
                                onClick={() => xmlFileInputRef.current?.click()}
                                disabled={xmlImporting}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:bg-slate-400 flex items-center gap-2"
                            >
                                <span className={`material-symbols-outlined text-lg ${xmlImporting ? 'animate-spin' : ''}`}>
                                    {xmlImporting ? 'sync' : 'upload_file'}
                                </span>
                                {xmlImporting ? 'Đang import...' : 'Import XML (GDT)'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <SmartTable
                                data={importedInvoices}
                                columns={[
                                    { field: 'invoice_date', headerName: 'Ngày HĐ', width: 'w-28', type: 'date' },
                                    { field: 'invoice_series', headerName: 'Ký hiệu', width: 'w-24', align: 'center' },
                                    { field: 'invoice_no', headerName: 'Số HĐ', width: 'w-24', align: 'center' },
                                    { field: 'seller_name', headerName: 'Bên bán', width: 'min-w-[200px]' },
                                    { field: 'seller_tax_code', headerName: 'MST Bán', width: 'w-32' },
                                    { field: 'total_amount', headerName: 'Tổng tiền', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
                                    { field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center', renderCell: (v: string) => (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v === 'matched' ? 'bg-green-100 text-green-700' : v === 'imported' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {v === 'pending' ? 'Chờ xử lý' : v === 'matched' ? 'Đã khớp' : v === 'imported' ? 'Đã nhập' : v}
                                        </span>
                                    )},
                                    { field: 'provider_name', headerName: 'Nguồn', width: 'w-28', renderCell: (v: string) => <span className="text-xs text-slate-500">{v || 'Demo'}</span> },
                                ]}
                                keyField="id"
                                minRows={15}
                            />
                        </div>
                    </div>
                )}

                {/* E-Invoice Lookup View */}
                {view === 'invoice-lookup' && (
                    <div className="p-6 max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                                    <span className="material-symbols-outlined">manage_search</span>
                                    Tra cứu Hóa đơn điện tử
                                </h3>
                                <p className="text-blue-100 text-sm">Tra cứu trực tiếp từ nhà cung cấp HĐĐT</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <label className="text-xs font-bold text-slate-500 w-24">Nhà cung cấp:</label>
                                    <select
                                        value={selectedProvider}
                                        onChange={(e) => setSelectedProvider(e.target.value)}
                                        className="form-select text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 flex-1"
                                    >
                                        {einvoiceProviders.map(p => (
                                            <option key={p.code} value={p.code}>{p.name}{p.demoMode ? ' (Demo)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-xs font-bold text-slate-500 w-24">Mã số thuế:</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập MST bên bán hoặc bên mua..."
                                        value={einvoiceLookupParams.taxCode}
                                        onChange={(e) => setEinvoiceLookupParams({ ...einvoiceLookupParams, taxCode: e.target.value })}
                                        className="form-input text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 flex-1 font-mono"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-xs font-bold text-slate-500 w-24">Số hóa đơn:</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập số hóa đơn..."
                                        value={einvoiceLookupParams.invoiceNo}
                                        onChange={(e) => setEinvoiceLookupParams({ ...einvoiceLookupParams, invoiceNo: e.target.value })}
                                        className="form-input text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 flex-1 font-mono"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-xs font-bold text-slate-500 w-24">Từ ngày:</label>
                                    <input
                                        type="date"
                                        value={einvoiceLookupParams.fromDate}
                                        onChange={(e) => setEinvoiceLookupParams({ ...einvoiceLookupParams, fromDate: e.target.value })}
                                        className="form-input text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 w-40"
                                    />
                                    <label className="text-xs font-bold text-slate-500">Đến ngày:</label>
                                    <input
                                        type="date"
                                        value={einvoiceLookupParams.toDate}
                                        onChange={(e) => setEinvoiceLookupParams({ ...einvoiceLookupParams, toDate: e.target.value })}
                                        className="form-input text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 w-40"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleEinvoiceLookup}
                                        disabled={lookupLoading}
                                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2"
                                    >
                                        {lookupLoading ? (
                                            <span className="material-symbols-outlined animate-spin">sync</span>
                                        ) : (
                                            <span className="material-symbols-outlined">search</span>
                                        )}
                                        Tra cứu
                                    </button>
                                </div>
                            </div>
                            {einvoiceLookupResults.length > 0 && (
                                <div className="border-t border-slate-200 dark:border-slate-700">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                            Tìm thấy {einvoiceLookupResults.length} hóa đơn
                                        </p>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {einvoiceLookupResults.map((inv: any, idx: number) => (
                                            <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-slate-700 dark:text-slate-200">
                                                            {inv.invoiceSeries}{inv.invoiceNo}
                                                        </p>
                                                        <p className="text-sm text-slate-500">{inv.sellerName}</p>
                                                        <p className="text-xs text-slate-400">MST: {inv.sellerTaxCode}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold font-mono text-blue-600">{formatNumber(inv.totalAmount)} ₫</p>
                                                        <p className="text-xs text-slate-500">{formatDateVN(inv.invoiceDate)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* E-Invoice Match View */}
                {view === 'invoice-match' && (
                    <div className="flex flex-col h-full">
                        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Nhập chứng từ từ Hóa đơn điện tử</h3>
                            <p className="text-sm text-slate-500">Tự động tạo bút toán kế toán từ hóa đơn điện tử đã import.</p>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <SmartTable
                                data={importedInvoices.filter(inv => inv.status === 'pending')}
                                columns={[
                                    { field: 'invoice_date', headerName: 'Ngày HĐ', width: 'w-28', type: 'date' },
                                    { field: 'invoice_series', headerName: 'Ký hiệu', width: 'w-24', align: 'center' },
                                    { field: 'invoice_no', headerName: 'Số HĐ', width: 'w-24', align: 'center' },
                                    { field: 'seller_name', headerName: 'Bên bán', width: 'min-w-[200px]' },
                                    { field: 'seller_tax_code', headerName: 'MST', width: 'w-28' },
                                    { field: 'total_before_tax', headerName: 'Tiền hàng', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-slate-600">{formatNumber(v)}</span> },
                                    { field: 'vat_amount', headerName: 'VAT', width: 'w-28', align: 'right', renderCell: (v: number) => <span className="font-mono text-blue-600">{formatNumber(v)}</span> },
                                    { field: 'total_amount', headerName: 'Tổng tiền', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
                                    { field: 'actions', headerName: 'Thao tác', width: 'w-36', align: 'center', renderCell: (_: any, row: any) => (
                                        <button
                                            onClick={() => handleCreateVoucher(row.id)}
                                            disabled={creatingVoucher === row.id}
                                            className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 flex items-center gap-1 mx-auto"
                                        >
                                            {creatingVoucher === row.id ? (
                                                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                            )}
                                            Tạo CT
                                        </button>
                                    )},
                                ]}
                                keyField="id"
                                minRows={15}
                            />
                        </div>
                        {importedInvoices.filter(inv => inv.status === 'pending').length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">task_alt</span>
                                <p className="text-lg font-bold text-slate-500">Không có hóa đơn chờ xử lý</p>
                                <p className="text-sm text-slate-400 mt-2">Đồng bộ hoặc import XML để thêm hóa đơn mới</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {(view === 'vat' || view === 'pit') && (
                <div className="px-6 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {view === 'vat' ? 'Tổng doanh số chưa thuế:' : 'Tổng thu nhập:'}
                        </span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">
                            {formatNumber((view === 'vat' ? vatData : pitData).reduce((sum, item) => sum + (item.value || item.income || 0), 0))}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng tiền thuế:</span>
                        <span className="text-sm font-black text-red-600 font-mono">
                            {formatNumber((view === 'vat' ? vatData : pitData).reduce((sum, item) => sum + (item.tax || 0), 0))}
                        </span>
                    </div>
                </div>
            )}


        </div>
    );
};
