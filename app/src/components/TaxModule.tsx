import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { type RibbonAction } from './Ribbon';
import { taxService, masterDataService } from '../api';
import { TaxDeclarationForm } from './TaxDeclarationForm';
import { TaxHealthReport } from './AuditModal';
import { formatDateVN } from '../utils/dateUtils';

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
                }
            } catch (err) {
                console.error("Failed to load tax data:", err);
            }
        };
        loadData();
    }, [view, vatType, period]);

    useEffect(() => {
        if (printSignal > 0) window.print();
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
            } else if (view !== 'lookup') {
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

            <div className={`flex-1 overflow-auto relative bg-slate-50 dark:bg-slate-900/20`}>
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
