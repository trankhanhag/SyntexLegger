import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { purchaseService, masterDataService, productService, taxService, expenseService, hcsnService, settingsService } from '../api';
import { type RibbonAction } from './Ribbon';
import { toInputDateValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import { DateInput } from './DateInput';
// toVietnameseWords is used in PrintPreviewModal
import { PrintPreviewModal } from './PrintTemplates';


const SupplierFormModal = ({ onClose }: { onClose: () => void }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [taxCode, setTaxCode] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    // Tax Check State
    const [taxStatus, setTaxStatus] = useState<'IDLE' | 'CHECKING' | 'VALID' | 'INVALID'>('IDLE');
    const [taxMessage, setTaxMessage] = useState('');

    const handleTaxCheck = async () => {
        if (!taxCode || taxCode.length < 10) return;
        setTaxStatus('CHECKING');
        setTaxMessage('Đang kiểm tra...');
        try {
            const res = await taxService.lookupGST(taxCode);
            // Assuming simplified response or handling wrapper
            // Adjust based on actual server response structure for lookups
            const data = res.data;

            // Logic based on typical VietQR/Tax API response
            if (data && (data.code === '00' || data.id)) { // Accommodate different API shapes
                setTaxStatus('VALID');
                setTaxMessage('✅ Đang hoạt động');
                if (data.name) setName(data.name);
                if (data.address) setAddress(data.address);
            } else {
                setTaxStatus('INVALID');
                setTaxMessage('❌ ' + (data.desc || 'Ngừng hoạt động hoặc Hủy bỏ'));
            }
        } catch (error) {
            console.error(error);
            setTaxStatus('INVALID');
            setTaxMessage('❌ Không thể kiểm tra (Lỗi kết nối)');
        }
    };

    const handleSave = async () => {
        if (!name || !code) return alert('Vui lòng nhập tên và mã nhà cung cấp');
        setLoading(true);
        try {
            await masterDataService.createPartner({
                partner_name: name,
                partner_code: code,
                tax_code: taxCode,
                address: address,
                type: 'SUPPLIER'
            });
            alert('Lưu nhà cung cấp thành công!');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra khi lưu nhà cung cấp');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Thêm Nhà cung cấp mới" onClose={onClose}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="form-label">Mã nhà cung cấp *</span>
                        <input
                            className="form-input"
                            placeholder="NCC001..."
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </label>
                    <label className="block">
                        <div className="flex justify-between">
                            <span className="form-label">Mã số thuế</span>
                            {taxStatus === 'CHECKING' && <span className="text-xs text-blue-500 animate-pulse">Đang tra cứu...</span>}
                            {taxStatus === 'VALID' && <span className="text-xs text-green-600 font-bold">{taxMessage}</span>}
                            {taxStatus === 'INVALID' && <span className="text-xs text-red-600 font-bold">{taxMessage}</span>}
                        </div>
                        <div className="relative">
                            <input
                                className={`form-input ${taxStatus === 'INVALID' ? 'border-red-500 text-red-600' : taxStatus === 'VALID' ? 'border-green-500 text-green-700' : 'border-slate-200 dark:border-slate-700'}`}
                                placeholder="Nhập MST để kiểm tra..."
                                value={taxCode}
                                onChange={(e) => setTaxCode(e.target.value)}
                                onBlur={handleTaxCheck}
                            />
                            {taxStatus === 'VALID' && <span className="absolute right-3 top-3 material-symbols-outlined text-green-600 text-[18px]">check_circle</span>}
                            {taxStatus === 'INVALID' && <span className="absolute right-3 top-3 material-symbols-outlined text-red-500 text-[18px]">error</span>}
                        </div>
                    </label>
                </div>
                <label className="block">
                    <span className="form-label">Tên nhà cung cấp *</span>
                    <input
                        className="form-input"
                        placeholder="Công ty TNHH..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
                <label className="block">
                    <span className="form-label">Địa chỉ</span>
                    <input
                        className="form-input"
                        placeholder="Số 1, đường..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </label>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary" disabled={loading}>Hủy</button>
                    <button
                        onClick={handleSave}
                        className="form-button-primary"
                        disabled={loading}
                    >
                        {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- ITEM FORM MODAL ---
const ItemFormModal = ({ onClose }: { onClose: () => void }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [price, setPrice] = useState(0);
    const [tax, setTax] = useState(10);
    const [loading, setLoading] = useState(false);

    // Conversion Units State
    const [conversionUnits, setConversionUnits] = useState<{ unit: string, factor: number }[]>([]);

    const handleSave = async () => {
        if (!code || !name) return alert('Vui lòng nhập mã và tên hàng hóa');
        setLoading(true);
        try {
            await productService.createProduct({
                code,
                name,
                unit,
                price,
                tax,
                conversion_units: conversionUnits // Send to backend
            });
            alert('Lưu hàng hóa thành công!');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra khi lưu hàng hóa');
        } finally {
            setLoading(false);
        }
    };

    const addConversionUnit = () => {
        setConversionUnits([...conversionUnits, { unit: '', factor: 1 }]);
    };

    const removeConversionUnit = (index: number) => {
        setConversionUnits(conversionUnits.filter((_, i) => i !== index));
    };

    const updateConversionUnit = (index: number, field: 'unit' | 'factor', value: any) => {
        const newUnits = [...conversionUnits];
        // @ts-ignore
        newUnits[index][field] = value;
        setConversionUnits(newUnits);
    };

    return (
        <Modal title="Thêm Hàng hóa mới" onClose={onClose}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="form-label">Mã hàng hóa *</span>
                        <input className="form-input"
                            value={code} onChange={e => setCode(e.target.value)} />
                    </label>
                    <label className="block">
                        <span className="form-label">Tên hàng hóa *</span>
                        <input className="form-input"
                            value={name} onChange={e => setName(e.target.value)} />
                    </label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <label className="block">
                        <span className="form-label">Đơn vị tính (Cơ bản)</span>
                        <input className="form-input"
                            value={unit} onChange={e => setUnit(e.target.value)} placeholder="VD: Lon" />
                    </label>
                    <label className="block">
                        <span className="form-label">Đơn giá định mức</span>
                        <input type="number" className="form-input"
                            value={price} onChange={e => setPrice(parseFloat(e.target.value))} />
                    </label>
                    <label className="block">
                        <span className="form-label">Thuế suất (%)</span>
                        <input type="number" className="form-input"
                            value={tax} onChange={e => setTax(parseFloat(e.target.value))} />
                    </label>
                </div>

                {/* Conversion Units Section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Đơn vị quy đổi</span>
                        <button type="button" onClick={addConversionUnit} className="text-blue-600 text-xs font-bold hover:underline">+ Thêm đơn vị</button>
                    </div>
                    <div className="space-y-2">
                        {conversionUnits.map((u, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input
                                    className="w-1/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1 text-sm outline-none"
                                    placeholder="Đơn vị (VD: Thùng)"
                                    value={u.unit}
                                    onChange={e => updateConversionUnit(idx, 'unit', e.target.value)}
                                />
                                <span className="text-slate-400 text-xs">=</span>
                                <input
                                    type="number"
                                    className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1 text-sm outline-none"
                                    placeholder="Tỷ lệ"
                                    value={u.factor}
                                    onChange={e => updateConversionUnit(idx, 'factor', parseFloat(e.target.value))}
                                />
                                <span className="text-slate-500 text-xs">{unit || '(ĐVT Cơ bản)'}</span>
                                <button onClick={() => removeConversionUnit(idx)} className="text-red-500 hover:text-red-700 ml-auto">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        ))}
                        {conversionUnits.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Chưa có đơn vị quy đổi nào (VD: 1 Thùng = 24 {unit || 'Cái'}).</p>
                        )}
                    </div>
                </div>

                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary" disabled={loading}>Hủy</button>
                    <button onClick={handleSave} className="form-button-primary" disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- SUPPLIER LIST ---
const SupplierList = ({ onSelect, refreshSignal }: { onSelect?: (record: any) => void, refreshSignal?: number }) => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        masterDataService.getPartners()
            .then((res: any) => setSuppliers(res.data))
            .catch((err: any) => console.error("Fetch suppliers failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'partner_code', headerName: 'Mã NCC', width: 'w-32', editable: true },
        { field: 'partner_name', headerName: 'Tên Nhà cung cấp', width: 'flex-1', editable: true },
        { field: 'tax_code', headerName: 'Mã số thuế', width: 'w-32', editable: true },
        { field: 'address', headerName: 'Địa chỉ', width: 'w-64', editable: true },
        { field: 'phone', headerName: 'Điện thoại', width: 'w-32', editable: true },
        {
            field: 'actions', headerName: 'Thao tác', width: 'w-24', align: 'center',
            renderCell: (row) => (
                <button
                    onClick={() => onSelect && onSelect(row)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                    Chọn
                </button>
            )
        }
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <SmartTable data={suppliers} columns={columns} keyField="partner_code" minRows={0} onSelectionChange={onSelect} />
        </div>
    );
};

// --- ITEM LIST ---
const ItemList = ({ onSelect, refreshSignal }: { onSelect?: (rec: any) => void, refreshSignal?: number }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        productService.getProducts()
            .then(res => setItems(res.data))
            .catch(err => console.error("Fetch products failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã hàng', width: 'w-32', editable: true },
        { field: 'name', headerName: 'Tên Hàng hóa / Dịch vụ', width: 'flex-1', editable: true },
        { field: 'type', headerName: 'Loại', width: 'w-32', align: 'center', renderCell: (v: string) => <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{v}</span> },
        { field: 'unit', headerName: 'ĐVT', width: 'w-24', align: 'center', editable: true },
        { field: 'price', headerName: 'Đơn giá mua', width: 'w-32', align: 'right', editable: true, renderCell: (v: number) => new Intl.NumberFormat('vi-VN').format(v) },
        { field: 'tax', headerName: 'Thuế suất', width: 'w-24', align: 'center', editable: true, renderCell: (v: number) => `${v}%` },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <SmartTable data={items} columns={columns} keyField="code" minRows={0} onSelectionChange={onSelect} />
        </div>
    );
};

// --- EXPENSE CATEGORY LIST ---
const ExpenseCategoryList = ({ onSelect, refreshSignal }: { onSelect?: (rec: any) => void, refreshSignal?: number }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        expenseService.getCategories({ active: true })
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) setCategories(data);
                else if (data && Array.isArray(data.data)) setCategories(data.data);
                else setCategories([]);
            })
            .catch(err => console.error("Fetch expense categories failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã khoản mục', width: 'w-32', editable: false },
        { field: 'name', headerName: 'Tên khoản mục chi', width: 'flex-1', editable: false },
        {
            field: 'expense_type',
            headerName: 'Loại chi',
            width: 'w-48',
            align: 'center',
            renderCell: (v: string) => {
                const labels: Record<string, string> = {
                    'RECURRENT': 'Thường xuyên',
                    'NON_RECURRENT': 'Không thường xuyên',
                    'CAPEX': 'Đầu tư XDCB'
                };
                const colors: Record<string, string> = {
                    'RECURRENT': 'bg-blue-100 text-blue-700',
                    'NON_RECURRENT': 'bg-orange-100 text-orange-700',
                    'CAPEX': 'bg-purple-100 text-purple-700'
                };
                return <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[v] || 'bg-slate-100'}`}>{labels[v] || v}</span>;
            }
        },
        { field: 'account_code', headerName: 'TK', width: 'w-24', align: 'center', editable: false },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <SmartTable data={categories} columns={columns} keyField="code" minRows={0} onSelectionChange={onSelect} />
        </div>
    );
};

// --- EXPENSE VOUCHER LIST ---
const ExpenseVoucherList = ({ onSelect, refreshSignal }: { onSelect?: (rec: any) => void, refreshSignal?: number }) => {
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        expenseService.getVouchers({ expense_type: 'EXPENSE' })
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) setVouchers(data);
                else if (data && Array.isArray(data.data)) setVouchers(data.data);
                else setVouchers([]);
            })
            .catch(err => console.error("Fetch expense vouchers failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

    const columns: ColumnDef[] = [
        { field: 'voucher_date', headerName: 'Ngày', width: 'w-32', type: 'date' },
        { field: 'voucher_no', headerName: 'Số phiếu', width: 'w-36', align: 'center' },
        { field: 'payee_name', headerName: 'Người nhận', width: 'min-w-[200px]' },
        { field: 'category_name', headerName: 'Khoản mục', width: 'w-48' },
        {
            field: 'amount',
            headerName: 'Số tiền',
            width: 'w-40',
            align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <SmartTable data={vouchers} columns={columns} keyField="id" minRows={15} onSelectionChange={onSelect} showTotalRow={false} />
        </div>
    );
};

// --- EXPENSE REDUCTION LIST ---
const ExpenseReductionList = ({ onSelect, refreshSignal }: { onSelect?: (rec: any) => void, refreshSignal?: number }) => {
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        expenseService.getVouchers({ expense_type: 'REDUCTION' })
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) setVouchers(data);
                else if (data && Array.isArray(data.data)) setVouchers(data.data);
                else setVouchers([]);
            })
            .catch(err => console.error("Fetch expense reduction failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

    const columns: ColumnDef[] = [
        { field: 'voucher_date', headerName: 'Ngày', width: 'w-32', type: 'date' },
        { field: 'voucher_no', headerName: 'Số phiếu', width: 'w-36', align: 'center' },
        { field: 'payee_name', headerName: 'Đối tượng', width: 'min-w-[200px]' },
        { field: 'category_name', headerName: 'Khoản mục', width: 'w-48' },
        {
            field: 'amount',
            headerName: 'Số tiền giảm',
            width: 'w-40',
            align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-green-600">-{formatNumber(v)}</span>
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <SmartTable data={vouchers} columns={columns} keyField="id" minRows={15} onSelectionChange={onSelect} showTotalRow={false} />
        </div>
    );
};


// --- EXPENSE REPORT VIEW ---
const ExpenseReportView = () => {
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('category');

    useEffect(() => {
        setLoading(true);
        expenseService.getReport({ group_by: groupBy })
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) setReportData(data);
                else if (data && Array.isArray(data.data)) setReportData(data.data);
                else setReportData([]);
            })
            .catch(err => console.error("Fetch expense report failed:", err))
            .finally(() => setLoading(false));
    }, [groupBy]);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

    return (
        <div className="h-full p-6 overflow-auto">
            <div className="mb-4 flex gap-2">
                <button onClick={() => setGroupBy('category')} className={`px-4 py-2 rounded text-sm ${groupBy === 'category' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>Theo Khoản mục</button>
                <button onClick={() => setGroupBy('fund_source')} className={`px-4 py-2 rounded text-sm ${groupBy === 'fund_source' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>Theo Nguồn KP</button>
                <button onClick={() => setGroupBy('type')} className={`px-4 py-2 rounded text-sm ${groupBy === 'type' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>Theo Loại chi</button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold">Tên</th>
                                <th className="px-4 py-3 text-center font-bold">Số phiếu</th>
                                <th className="px-4 py-3 text-right font-bold">Tổng tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((item, idx) => (
                                <tr key={idx} className="border-t hover:bg-slate-50">
                                    <td className="px-4 py-2">{item.category_name || item.fund_source_name || item.expense_type}</td>
                                    <td className="px-4 py-2 text-center">{item.voucher_count}</td>
                                    <td className="px-4 py-2 text-right font-mono font-bold text-red-600">{formatNumber(item.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- BUDGET COMPARISON VIEW ---
const BudgetComparisonView = () => {
    const [budgetData, setBudgetData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const fiscalYear = new Date().getFullYear();

    useEffect(() => {
        setLoading(true);
        expenseService.getBudgetComparison({ fiscal_year: fiscalYear })
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) setBudgetData(data);
                else if (data && Array.isArray(data.data)) setBudgetData(data.data);
                else setBudgetData([]);
            })
            .catch(err => console.error("Fetch budget comparison failed:", err))
            .finally(() => setLoading(false));
    }, [fiscalYear]);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

    return (
        <div className="h-full p-6 overflow-auto">
            <h3 className="text-lg font-bold mb-4">So sánh Dự toán Chi - Năm {fiscalYear}</h3>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold">Khoản mục</th>
                                <th className="px-4 py-3 text-left font-bold">Loại</th>
                                <th className="px-4 py-3 text-right font-bold">Dự toán</th>
                                <th className="px-4 py-3 text-right font-bold">Thực hiện</th>
                                <th className="px-4 py-3 text-right font-bold">Chênh lệch</th>
                                <th className="px-4 py-3 text-center font-bold">% TH</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budgetData.map((item, idx) => (
                                <tr key={idx} className="border-t hover:bg-slate-50">
                                    <td className="px-4 py-2">{item.category_name}</td>
                                    <td className="px-4 py-2 text-xs">{item.estimate_type}</td>
                                    <td className="px-4 py-2 text-right font-mono">{formatNumber(item.budget_amount)}</td>
                                    <td className="px-4 py-2 text-right font-mono font-bold text-red-600">{formatNumber(item.actual_amount)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{formatNumber(item.variance)}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${item.completion_percentage > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(item.completion_percentage, 100)}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold w-12 text-right">{item.completion_percentage}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

interface ExpenseModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({ subView = 'voucher', printSignal = 0, onSetHeader }) => {
    const [view, setView] = useState(subView);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '' });

    // Fetch company info from settings
    useEffect(() => {
        settingsService.getSettings()
            .then(res => {
                const settings = res.data;
                setCompanyInfo({
                    name: settings.company_name || 'Đơn vị của bạn',
                    address: settings.company_address || 'Địa chỉ đơn vị'
                });
            })
            .catch(err => console.error('Load company info failed:', err));
    }, []);

    useEffect(() => {
        if (subView) setView(subView);
    }, [subView]);

    const fetchData = () => {
        if (['supplier', 'partner', 'items', 'item'].includes(view)) return;
        setLoading(true);
        let promise;
        switch (view) {
            case 'order': promise = purchaseService.getOrders(); break;
            case 'inbound': promise = purchaseService.getInvoices('INBOUND'); break;
            case 'service': promise = purchaseService.getInvoices('SERVICE'); break;
            case 'return': promise = purchaseService.getReturns(); break;
            case 'payment': promise = purchaseService.getPayments(); break;
            default: setLoading(false); return;
        }

        promise
            .then(res => setData(res.data))
            .catch(err => console.error(`Fetch ${view} failed:`, err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
        setSelectedRow(null);
    }, [view, refreshSignal]);

    useEffect(() => {
        if (printSignal > 0) {
            if (['order', 'inbound', 'service', 'return', 'payment'].includes(view)) {
                if (!selectedRow) {
                    alert("Vui lòng chọn một bản ghi để in!");
                } else {
                    setShowPrintPreview(true);
                }
            } else {
                window.print();
            }
        }
    }, [printSignal, view, selectedRow]);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num || 0);
    };

    useEffect(() => {
        if (onSetHeader) {
            const getTitle = () => {
                switch (view) {
                    case 'voucher': return 'Phiếu chi';
                    case 'payment': return 'Ủy nhiệm chi';
                    case 'reduction': return 'Giảm trừ chi';
                    case 'categories': return 'Danh mục Khoản mục chi';
                    case 'payee':
                    case 'partner': return 'Đối tượng Chi';
                    case 'report': return 'Báo cáo Chi sự nghiệp';
                    case 'budget': return 'So sánh Dự toán Chi';
                    default: return 'Quản lý Chi sự nghiệp';
                }
            };

            const actions: RibbonAction[] = [];
            if (['voucher', 'payment', 'reduction'].includes(view)) {
                actions.push({
                    label: view === 'voucher' ? 'Lập phiếu chi mới' :
                        view === 'payment' ? 'Lập ủy nhiệm chi mới' : 'Lập phiếu giảm trừ mới',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowExpenseModal(true); },
                    primary: true
                });
            } else if (view === 'payee' || view === 'partner') {
                actions.push({
                    label: 'Thêm Đối tượng Chi',
                    icon: 'person_add',
                    onClick: () => { setSelectedRow(null); setShowSupplierModal(true); },
                    primary: true
                });
            } else if (view === 'categories') {
                actions.push({
                    label: 'Thêm Khoản mục chi',
                    icon: 'add_box',
                    onClick: () => { setSelectedRow(null); setShowItemModal(true); },
                    primary: true
                });
            }

            if (selectedRow && ['voucher', 'payment', 'reduction'].includes(view)) {
                actions.push({
                    label: 'Sửa chứng từ',
                    icon: 'edit',
                    onClick: () => setShowExpenseModal(true)
                });
                actions.push({
                    label: 'In phiếu',
                    icon: 'print',
                    onClick: () => setShowPrintPreview(true)
                });
            }

            onSetHeader({ title: getTitle(), icon: 'payments', actions, onDelete: handleDeleteSelected });
        }
    }, [view, onSetHeader, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa bản ghi đã chọn?`)) return;

        try {
            switch (view) {
                case 'voucher':
                case 'payment':
                case 'reduction':
                    // TODO: Use expenseService.deleteVoucher when API ready
                    await purchaseService.deletePayment(selectedRow.id);
                    break;
                case 'payee':
                case 'partner': await masterDataService.deletePartner(selectedRow.id || selectedRow.partner_code); break;
                case 'categories':
                    // TODO: Use expenseService.deleteCategory when API ready
                    await productService.deleteProduct(selectedRow.id || selectedRow.code);
                    break;
                default: return;
            }
            alert("Đã xóa thành công.");
            fetchData();
            setRefreshSignal(s => s + 1);
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };



    const paymentCols: ColumnDef[] = [
        { field: 'date', headerName: 'Ngày chi', width: 'w-32', type: 'date' },
        { field: 'doc_no', headerName: 'Số chứng từ', width: 'w-36' },
        { field: 'supplier', headerName: 'Đối tượng', width: 'w-48' },
        { field: 'description', headerName: 'Lý do chi', width: 'min-w-[200px]' },
        { field: 'account', headerName: 'Tài khoản', width: 'w-24', align: 'center' },
        {
            field: 'amount', headerName: 'Số tiền chi', width: 'w-40', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'actions', headerName: 'Chọn', width: 'w-20', align: 'center',
            renderCell: (_, record) => (
                <button
                    onClick={() => setSelectedRow(record)}
                    className={`px-2 py-1 text-[10px] rounded font-bold uppercase ${selectedRow?.id === record.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    {selectedRow?.id === record.id ? 'Đã chọn' : 'Chọn'}
                </button>
            )
        }
    ];

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative">

            {/* Action Bar - Tabs cho Chi sự nghiệp HCSN */}
            <div className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 backdrop-blur-md z-10">
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
                    {[
                        { key: 'voucher', label: 'Phiếu chi' },
                        { key: 'payment', label: 'Ủy nhiệm chi' },
                        { key: 'reduction', label: 'Giảm trừ' },
                        { key: 'categories', label: 'Khoản mục chi' },
                        { key: 'payee', label: 'Đối tượng' },
                        { key: 'report', label: 'Báo cáo' },
                        { key: 'budget', label: 'Dự toán' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setView(tab.key)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === tab.key ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {selectedRow && (
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 animate-in slide-in-from-right-4">
                        <span className="material-symbols-outlined text-blue-600 text-[18px]">check_circle</span>
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Đã chọn: {selectedRow.doc_no || selectedRow.docNo || selectedRow.id}</span>
                        <button onClick={() => setSelectedRow(null)} className="material-symbols-outlined text-blue-400 hover:text-blue-600 text-[16px] ml-1">cancel</button>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Phiếu chi */}
                {view === 'voucher' && <ExpenseVoucherList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {/* Ủy nhiệm chi & Payment cũ */}
                {view === 'payment' && (
                    <SmartTable data={data} columns={paymentCols} keyField="id" minRows={15} onSelectionChange={setSelectedRow} showTotalRow={false} />
                )}

                {/* Giảm trừ chi */}
                {view === 'reduction' && <ExpenseReductionList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}

                {/* Khoản mục chi */}
                {view === 'categories' && <ExpenseCategoryList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {/* Đối tượng chi */}
                {(view === 'payee' || view === 'partner' || view === 'supplier') && <SupplierList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}

                {/* Báo cáo */}
                {view === 'report' && <ExpenseReportView />}
                {/* Dự toán */}
                {view === 'budget' && <BudgetComparisonView />}
                {/* Vật tư / Hàng hóa nếu có */}
                {(view === 'items' || view === 'item') && <ItemList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}



                {showSupplierModal && (
                    <SupplierFormModal onClose={() => setShowSupplierModal(false)} />
                )}

                {showItemModal && (
                    <ItemFormModal onClose={() => setShowItemModal(false)} />
                )}
                {showExpenseModal && (
                    <ExpenseFormModal
                        onClose={() => { setShowExpenseModal(false); setRefreshSignal(s => s + 1); }}
                        documentType={view === 'voucher' ? 'VOUCHER' : (view === 'payment' ? 'PAYMENT' : 'REDUCTION')}
                        initialData={selectedRow}
                    />
                )}
            </div>

            {/* Footer Summary Bar */}
            {
                !['items', 'item', 'supplier', 'partner'].includes(view) && (
                    <div className="px-6 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-10 shrink-0">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiền hàng chưa thuế</span>
                            <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200 text-right">
                                {formatNumber(data.reduce((sum, r) => sum + (r.amount || 0), 0))}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thuế GTGT</span>
                            <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200 text-right">
                                {formatNumber(data.reduce((sum, r) => sum + (r.tax || 0), 0))}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest text-right">Tổng cộng</span>
                            <span className="text-xl font-black text-blue-600 font-mono text-right">
                                {formatNumber(data.reduce((sum, r) => sum + (r.total || r.amount || 0), 0))}
                            </span>
                        </div>
                    </div>
                )
            }

            {/* Print Preview Modal */}
            {
                showPrintPreview && selectedRow && (
                    <PrintPreviewModal
                        record={selectedRow}
                        view={view === 'voucher' || view === 'payment' ? 'CASH_PAYMENT' : 'CASH_PAYMENT'}
                        onClose={() => setShowPrintPreview(false)}
                        companyInfo={companyInfo}
                    />
                )
            }
        </div >
    );
};

// --- SUB-COMPONENTS ---
const Modal = ({ title, onClose, widthClass = "max-w-4xl", children }: { title: string, onClose: () => void, widthClass?: string, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} sizeClass={widthClass} icon="inventory_2" bodyClass="bg-white dark:bg-slate-900">
        {children}
    </FormModal>
);

const ExpenseFormModal = ({ onClose, documentType, initialData }: { onClose: () => void, documentType: string, initialData?: any }) => {
    const [formData, setFormData] = useState({
        voucher_no: initialData?.voucher_no || '',
        voucher_date: initialData?.voucher_date || toInputDateValue(),
        fiscal_year: initialData?.fiscal_year || new Date().getFullYear(),
        payee_name: initialData?.payee_name || '',
        payee_tax_code: initialData?.payee_tax_code || '',
        payee_address: initialData?.payee_address || '',
        expense_type: initialData?.expense_type || documentType,
        category_code: initialData?.category_code || '',
        category_name: initialData?.category_name || '',
        amount: initialData?.amount || 0,
        fund_source_id: initialData?.fund_source_id || '',
        budget_estimate_id: initialData?.budget_estimate_id || '',
        payment_method: initialData?.payment_method || 'CASH',
        bank_account: initialData?.bank_account || '',
        account_code: initialData?.account_code || '611',
        notes: initialData?.notes || ''
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [fundSources, setFundSources] = useState<any[]>([]);
    const [budgetEstimates, setBudgetEstimates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        expenseService.getCategories({ active: true }).then(res => setCategories(Array.isArray(res.data) ? res.data : (res.data?.data || [])));
        masterDataService.getFundSources().then((res: any) => setFundSources(Array.isArray(res.data) ? res.data : (res.data?.data || [])));
        hcsnService.getBudgetEstimates({ budget_type: 'EXPENSE' }).then(res => setBudgetEstimates(Array.isArray(res.data) ? res.data : (res.data?.data || [])));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const selectedCat = categories.find(c => c.code === formData.category_code);
            const dataToSubmit = {
                ...formData,
                category_name: selectedCat ? selectedCat.name : '',
                expense_type: documentType
            };
            if (initialData?.id) {
                await expenseService.updateVoucher(initialData.id, dataToSubmit);
                alert("Đã cập nhật chứng từ thành công.");
            } else {
                await expenseService.createVoucher(dataToSubmit);
                alert("Đã lưu chứng từ thành công.");
            }
            onClose();
        } catch (err) {
            console.error(err);
            alert("Lỗi khi lưu chứng từ.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title={initialData ? (documentType === 'VOUCHER' ? 'Sửa Phiếu chi' : (documentType === 'PAYMENT' ? 'Sửa Ủy nhiệm chi' : 'Sửa Phiếu giảm trừ phí')) : (documentType === 'VOUCHER' ? 'Lập Phiếu chi mới' : (documentType === 'PAYMENT' ? 'Lập Ủy nhiệm chi mới' : 'Lập Phiếu giảm trừ phí'))} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="form-label">Số chứng từ</label>
                        <input
                            className="form-input font-bold text-blue-600"
                            required
                            value={formData.voucher_no}
                            onChange={e => setFormData({ ...formData, voucher_no: e.target.value })}
                            placeholder="PC-001..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">Ngày chứng từ</label>
                        <DateInput
                            className="form-input"
                            value={formData.voucher_date}
                            onChange={v => setFormData({ ...formData, voucher_date: v })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="form-label">Đối tượng chi (Người nhận/Đơn vị)</label>
                    <input
                        className="form-input"
                        required
                        value={formData.payee_name}
                        onChange={e => setFormData({ ...formData, payee_name: e.target.value })}
                        placeholder="Tên cá nhân hoặc đơn vị thụ hưởng..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="form-label">Khoản mục chi</label>
                        <select
                            className="form-select"
                            required
                            value={formData.category_code}
                            onChange={e => setFormData({ ...formData, category_code: e.target.value })}
                        >
                            <option value="">-- Chọn khoản mục --</option>
                            {categories.map(c => <option key={c.id} value={c.code}>{c.code} - {c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">Số tiền</label>
                        <input
                            type="number"
                            className="form-input font-mono font-bold text-red-600"
                            required
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="form-label">Nguồn kinh phí</label>
                        <select
                            className="form-select"
                            value={formData.fund_source_id}
                            onChange={e => setFormData({ ...formData, fund_source_id: e.target.value })}
                        >
                            <option value="">-- Không liên kết --</option>
                            {fundSources.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">Chỉ tiêu dự toán</label>
                        <select
                            className="form-select"
                            value={formData.budget_estimate_id}
                            onChange={e => setFormData({ ...formData, budget_estimate_id: e.target.value })}
                        >
                            <option value="">-- Không liên kết --</option>
                            {budgetEstimates.map(b => <option key={b.id} value={b.id}>{b.item_name} ({b.fiscal_year})</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="form-label">Nội dung chi</label>
                    <textarea
                        className="form-textarea"
                        rows={3}
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Nhập diễn giải chi tiết..."
                    />
                </div>

                <div className="form-actions pt-4">
                    <button type="button" onClick={onClose} className="form-button-secondary" disabled={loading}>Hủy bỏ</button>
                    <button type="submit" className="form-button-primary bg-blue-600" disabled={loading}>
                        {loading ? 'Đang xử lý...' : (initialData ? 'Cập nhật' : 'Lưu chứng từ')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};








