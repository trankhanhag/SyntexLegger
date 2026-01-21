import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { revenueService, masterDataService, settingsService } from '../api';
import { type RibbonAction } from './Ribbon';
import { PrintPreviewModal } from './PrintTemplates';


// ==================== RECEIPT LIST ====================
const ReceiptList = ({ onSelect, refreshSignal }: { onSelect: (rec: any) => void, refreshSignal?: number }) => {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        revenueService.getReceipts({ type: 'RECEIPT' })
            .then(res => setReceipts(res.data))
            .catch(err => console.error("Fetch receipts failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'receipt_no', headerName: 'Số biên lai', width: 'w-32', editable: false },
        { field: 'receipt_date', headerName: 'Ngày lập', width: 'w-32', editable: false, type: 'date', align: 'center' },
        { field: 'payer_name', headerName: 'Người nộp tiền', width: 'w-64', editable: false },
        { field: 'category_display_name', headerName: 'Loại thu', width: 'w-48', editable: false },
        {
            field: 'amount', headerName: 'Số tiền', width: 'w-32', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(val)}</span>
        },
        { field: 'payment_method', headerName: 'HTTT', width: 'w-24', editable: false },
        { field: 'fund_source_name', headerName: 'Nguồn KP', width: 'w-48', editable: false },
        {
            field: 'actions', headerName: 'Thao tác', width: 'w-24', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">print</span> Chọn
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={receipts} columns={columns} setData={setReceipts} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== PAYMENT LIST (Phiếu thu tiền) ====================
const PaymentList = ({ onSelect, refreshSignal }: { onSelect: (rec: any) => void, refreshSignal?: number }) => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        revenueService.getReceipts({ type: 'PAYMENT' })
            .then(res => setPayments(res.data))
            .catch(err => console.error("Fetch payments failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'receipt_no', headerName: 'Số phiếu thu', width: 'w-32', editable: false },
        { field: 'receipt_date', headerName: 'Ngày lập', width: 'w-32', editable: false, type: 'date', align: 'center' },
        { field: 'payer_name', headerName: 'Người nộp tiền', width: 'w-64', editable: false },
        { field: 'category_display_name', headerName: 'Loại thu', width: 'w-48', editable: false },
        {
            field: 'amount', headerName: 'Số tiền', width: 'w-32', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(val)}</span>
        },
        { field: 'payment_method', headerName: 'HTTT', width: 'w-24', editable: false },
        { field: 'fund_source_name', headerName: 'Nguồn KP', width: 'w-48', editable: false },
        {
            field: 'actions', headerName: 'Thao tác', width: 'w-24', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">visibility</span> Xem
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={payments} columns={columns} setData={setPayments} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== REDUCTION LIST (Giảm trừ thu SN) ====================
const ReductionList = ({ onSelect, refreshSignal }: { onSelect: (rec: any) => void, refreshSignal?: number }) => {
    const [reductions, setReductions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        revenueService.getReceipts({ type: 'REDUCTION' })
            .then(res => setReductions(res.data))
            .catch(err => console.error("Fetch reductions failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'receipt_no', headerName: 'Số chứng từ', width: 'w-32', editable: false },
        { field: 'receipt_date', headerName: 'Ngày lập', width: 'w-32', editable: false, type: 'date', align: 'center' },
        { field: 'payer_name', headerName: 'Đối tượng hoàn trả', width: 'w-64', editable: false },
        { field: 'category_display_name', headerName: 'Loại thu giảm', width: 'w-48', editable: false },
        {
            field: 'amount', headerName: 'Số tiền giảm', width: 'w-32', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-red-600">-{new Intl.NumberFormat('vi-VN').format(val)}</span>
        },
        { field: 'payment_method', headerName: 'HTTT', width: 'w-24', editable: false },
        {
            field: 'actions', headerName: 'Thao tác', width: 'w-24', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">visibility</span> Xem
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={reductions} columns={columns} setData={setReductions} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== REVENUE CATEGORY LIST ====================
const RevenueCategoryList = ({ onSelectionChange, refreshSignal }: { onSelectionChange: (rec: any) => void, refreshSignal?: number }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        revenueService.getCategories()
            .then(res => setCategories(res.data))
            .catch(err => console.error("Fetch categories failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã loại thu', width: 'w-32', editable: false },
        { field: 'name', headerName: 'Tên loại thu', width: 'flex-1', editable: false },
        { field: 'revenue_type', headerName: 'Phân loại', width: 'w-48', editable: false },
        { field: 'account_code', headerName: 'TK kế toán', width: 'w-24', editable: false },
        {
            field: 'active', headerName: 'Trạng thái', width: 'w-24', editable: false,
            renderCell: (val: any) => val ?
                <span className="text-green-600 font-bold">●</span> :
                <span className="text-gray-400">○</span>
        }
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={categories} columns={columns} setData={setCategories} onSelectionChange={onSelectionChange} keyField="code" />
        </div>
    );
};

// ==================== PAYER LIST (Đối tượng nộp tiền) ====================
const PayerList = ({ onSelectionChange, refreshSignal }: { onSelectionChange: (rec: any) => void, refreshSignal?: number }) => {
    const [payers, setPayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Sử dụng partners table tạm thời
        masterDataService.getPartners()
            .then((res: any) => setPayers(res.data))
            .catch((err: any) => console.error("Fetch payers failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'partner_code', headerName: 'Mã đối tượng', width: 'w-32', editable: false },
        { field: 'partner_name', headerName: 'Họ và tên', width: 'flex-1', editable: false },
        { field: 'tax_code', headerName: 'CMND/CCCD', width: 'w-32', editable: false },
        { field: 'address', headerName: 'Địa chỉ', width: 'w-64', editable: false },
        { field: 'phone', headerName: 'Điện thoại', width: 'w-32', editable: false },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={payers} columns={columns} setData={setPayers} onSelectionChange={onSelectionChange} keyField="partner_code" />
        </div>
    );
};

// ==================== REVENUE REPORT VIEW ====================
const RevenueReportView = () => {
    const [reportData, setReportData] = useState<any[]>([]);
    const [groupBy, setGroupBy] = useState('category');
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        revenueService.getReport({ fiscal_year: fiscalYear, group_by: groupBy })
            .then(res => setReportData(res.data))
            .catch(err => console.error("Fetch report failed:", err))
            .finally(() => setLoading(false));
    }, [fiscalYear, groupBy]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Báo cáo Thu sự nghiệp</h2>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <select
                    value={fiscalYear}
                    onChange={e => setFiscalYear(Number(e.target.value))}
                    className="form-select"
                >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
                </select>

                <select
                    value={groupBy}
                    onChange={e => setGroupBy(e.target.value)}
                    className="form-select"
                >
                    <option value="revenue_type">Theo phân loại</option>
                    <option value="category">Theo loại thu</option>
                    <option value="fund_source">Theo nguồn kinh phí</option>
                </select>
            </div>

            {/* Report Table */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <table className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300">Phân loại</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-300">Số biên lai</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">Tổng tiền (VNĐ)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {reportData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">{row.category_name || row.revenue_type || row.fund_source_name}</td>
                                <td className="px-4 py-3 text-center text-sm font-mono">{row.receipt_count}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-green-600">
                                    {new Intl.NumberFormat('vi-VN').format(row.total_amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

// ==================== BUDGET COMPARISON VIEW ====================
const BudgetComparisonView = () => {
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        revenueService.getBudgetComparison({ fiscal_year: fiscalYear })
            .then(res => setComparisonData(res.data))
            .catch((error: any) => {
                console.error('Fetch budget comparison failed:', error);
                if (error.response) {
                    console.error('Server error details:', error.response.data);
                }
            })
            .finally(() => setLoading(false));
    }, [fiscalYear]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">So sánh Dự toán / Thực hiện</h2>

            {/* Filter */}
            <div className="flex gap-4 mb-6">
                <select
                    value={fiscalYear}
                    onChange={e => setFiscalYear(Number(e.target.value))}
                    className="form-select"
                >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
                </select>
            </div>

            {/* Comparison Table */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <table className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300">Loại thu</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">Dự toán</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">Thực hiện</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">Chênh lệch</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-300">% Hoàn thành</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {comparisonData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">{row.category_name}</td>
                                <td className="px-4 py-3 text-right font-mono">{new Intl.NumberFormat('vi-VN').format(row.budget_amount)}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(row.actual_amount)}</td>
                                <td className="px-4 py-3 text-right font-mono">{new Intl.NumberFormat('vi-VN').format(row.variance)}</td>
                                <td className="px-4 py-3 text-center font-bold">
                                    <span className={row.completion_percentage >= 100 ? 'text-green-600' : 'text-orange-600'}>
                                        {row.completion_percentage}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

// ==================== RECEIPT FORM MODAL ====================
const ReceiptFormModal = ({ onClose, documentType, initialData }: { onClose: () => void, documentType: string, initialData?: any }) => {
    const [formData, setFormData] = useState({
        receipt_no: initialData?.receipt_no || `BL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        receipt_date: initialData?.receipt_date || new Date().toISOString().split('T')[0],
        payer_name: initialData?.payer_name || '',
        payer_id_card: initialData?.payer_id_card || '',
        payer_address: initialData?.payer_address || '',
        category_code: initialData?.category_code || '',
        category_name: initialData?.category_name || '',
        amount: initialData?.amount || 0,
        fund_source_id: initialData?.fund_source_id || '',
        payment_method: initialData?.payment_method || 'CASH',
        notes: initialData?.notes || '',
        document_type: initialData?.document_type || documentType
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [fundSources, setFundSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        revenueService.getCategories({ active: true })
            .then(res => setCategories(Array.isArray(res.data) ? res.data : (res.data?.data || [])));
        masterDataService.getFundSources()
            .then((res: any) => setFundSources(Array.isArray(res.data) ? res.data : (res.data?.data || [])));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData?.id) {
                await revenueService.updateReceipt(initialData.id, formData);
                alert("Đã cập nhật chứng từ thành công!");
            } else {
                await revenueService.createReceipt(formData);
                alert("Đã lưu chứng từ thành công!");
            }
            onClose();
        } catch (err) {
            console.error(err);
            alert("Lỗi khi lưu chứng từ.");
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (documentType === 'PAYMENT') return 'Phiếu thu tiền';
        if (documentType === 'REDUCTION') return 'Giảm trừ thu sự nghiệp';
        return 'Biên lai thu tiền';
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">
                            {documentType === 'REDUCTION' ? 'remove_circle' : 'receipt'}
                        </span>
                        {initialData ? 'Sửa ' : 'Lập '} {getTitle()}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số chứng từ *</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.receipt_no}
                                onChange={e => setFormData({ ...formData, receipt_no: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày lập *</label>
                            <input
                                required
                                type="date"
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.receipt_date}
                                onChange={e => setFormData({ ...formData, receipt_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và tên người nộp *</label>
                        <input
                            required
                            type="text"
                            placeholder="Nhập họ tên đối tượng"
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                            value={formData.payer_name}
                            onChange={e => setFormData({ ...formData, payer_name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CCCD/Mã số thuế</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.payer_id_card}
                                onChange={e => setFormData({ ...formData, payer_id_card: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loại thu *</label>
                            <select
                                required
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.category_code}
                                onChange={e => {
                                    const cat = categories.find(c => c.code === e.target.value);
                                    setFormData({ ...formData, category_code: e.target.value, category_name: cat?.name || '' });
                                }}
                            >
                                <option value="">-- Chọn loại thu --</option>
                                {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số tiền *</label>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-mono font-bold text-lg text-green-600 dark:text-green-400"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phương thức HTTT</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option value="CASH">Tiền mặt</option>
                                <option value="BANK">Chuyển khoản</option>
                                <option value="POS">Quẹt thẻ (POS)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nguồn kinh phí</label>
                        <select
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                            value={formData.fund_source_id}
                            onChange={e => setFormData({ ...formData, fund_source_id: e.target.value })}
                        >
                            <option value="">-- Không liên kết --</option>
                            {fundSources.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</label>
                        <textarea
                            rows={2}
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold rounded-xl transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined">save</span>}
                            {initialData ? 'Cập nhật' : 'Lưu chứng từ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==================== CATEGORY FORM MODAL ====================
const CategoryFormModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        revenue_type: 'PRODUCTION',
        account_code: '511',
        description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await revenueService.createCategory(formData);
            alert("Đã thêm loại thu thành công!");
            onClose();
        } catch (err) {
            console.error(err);
            alert("Lỗi khi lưu loại thu.");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600">category</span>
                        Thêm loại thu mới
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Mã loại thu *</label>
                        <input required type="text" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tên loại thu *</label>
                        <input required type="text" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Phân loại</label>
                        <select className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg" value={formData.revenue_type} onChange={e => setFormData({ ...formData, revenue_type: e.target.value })}>
                            <option value="RECURRENT">Thu phí, lệ phí (Thường xuyên)</option>
                            <option value="NON_RECURRENT">Thu khác (Không thường xuyên)</option>
                            <option value="PRODUCTION">Thu hoạt động SXKD, DV</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="submit" className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all">Lưu danh mục</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==================== PAYER FORM MODAL ====================
const PayerFormModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = useState({
        partner_code: `DT-${Math.floor(Math.random() * 10000)}`,
        partner_name: '',
        tax_code: '',
        address: '',
        phone: '',
        partner_type: 'CUSTOMER'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await masterDataService.createPartner(formData);
            alert("Đã thêm đối tượng thành công!");
            onClose();
        } catch (err) {
            console.error(err);
            alert("Lỗi khi lưu đối tượng.");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-600">person_add</span>
                        Thêm đối tượng nộp tiền
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Họ và tên *</label>
                        <input required type="text" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg" value={formData.partner_name} onChange={e => setFormData({ ...formData, partner_name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">CMND/MST</label>
                        <input type="text" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg" value={formData.tax_code} onChange={e => setFormData({ ...formData, tax_code: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Địa chỉ</label>
                        <input type="text" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="submit" className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all">Lưu đối tượng</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const ModuleView = ({ data, columns, setData, onSelectionChange, keyField = "id" }: any) => {
    const handleCellChange = (id: string, field: string, value: any) => {
        setData((prev: any[]) => prev.map(item => (item.id === id || item[keyField] === id) ? { ...item, [field]: value } : item));
    };

    return (
        <div className="h-full flex flex-col">
            <SmartTable
                data={data}
                columns={columns}
                keyField={keyField}
                isCoreEditable={false}
                onCellChange={handleCellChange}
                onSelectionChange={onSelectionChange}
                minRows={0}
                emptyMessage="Không có dữ liệu"
            />
        </div>
    );
};

// ==================== REVENUE MODULE PROPS ====================
interface RevenueModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
}

// ==================== REVENUE MODULE ====================
export const RevenueModule: React.FC<RevenueModuleProps> = ({ subView = 'receipt', printSignal = 0, onSetHeader }) => {
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const [showReceiptModal, setShowReceiptModal] = React.useState(false);
    const [showCategoryModal, setShowCategoryModal] = React.useState(false); // TODO: Implement later
    const [showPayerModal, setShowPayerModal] = React.useState(false); // TODO: Implement later
    const [selectedRow, setSelectedRow] = React.useState<any>(null);
    const [refreshSignal, setRefreshSignal] = React.useState(0);
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '' });

    // Fetch company info
    useEffect(() => {
        settingsService.getSettings()
            .then(res => {
                setCompanyInfo({
                    name: res.data.company_name || 'Đơn vị...',
                    address: res.data.company_address || 'Địa chỉ...'
                });
            })
            .catch(console.error);
    }, []);

    React.useEffect(() => {
        if (printSignal > 0 && subView !== 'report' && subView !== 'budget') {
            if (selectedRow) {
                setShowPrintPreview(true);
            } else {
                alert("Vui lòng chọn một biên lai từ danh sách trước khi thực hiện In.");
            }
        }
    }, [printSignal, subView, selectedRow]);

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];

            if (subView === 'receipt') {
                actions.push({
                    label: 'Lập biên lai mới',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowReceiptModal(true); },
                    primary: true
                });
            } else if (subView === 'payment') {
                actions.push({
                    label: 'Lập phiếu thu tiền',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowReceiptModal(true); },
                    primary: true
                });
            } else if (subView === 'reduction') {
                actions.push({
                    label: 'Lập phiếu giảm trừ',
                    icon: 'remove_circle',
                    onClick: () => { setSelectedRow(null); setShowReceiptModal(true); },
                    primary: true
                });
            } else if (subView === 'categories') {
                actions.push({
                    label: 'Thêm loại thu',
                    icon: 'add',
                    onClick: () => setShowCategoryModal(true),
                    primary: true
                });
            } else if (subView === 'payer') {
                actions.push({
                    label: 'Thêm đối tượng',
                    icon: 'person_add',
                    onClick: () => setShowPayerModal(true),
                    primary: true
                });
            }

            if (selectedRow && ['receipt', 'payment', 'reduction'].includes(subView)) {
                actions.push({
                    label: 'Sửa chứng từ',
                    icon: 'edit',
                    onClick: () => setShowReceiptModal(true)
                });
                actions.push({
                    label: 'In phiếu',
                    icon: 'print',
                    onClick: () => setShowPrintPreview(true)
                });
            }

            onSetHeader({
                title: getModuleTitle(),
                icon: 'payments',
                actions,
                onDelete: handleDeleteSelected
            });
        }
    }, [subView, onSetHeader, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa bản ghi đã chọn?`)) return;

        try {
            switch (subView) {
                case 'receipt': await revenueService.deleteReceipt(selectedRow.id); break;
                case 'payer': await masterDataService.deletePartner(selectedRow.id || selectedRow.partner_code); break;
                default: return;
            }
            alert("Đã xóa thành công.");
            setRefreshSignal(s => s + 1);
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const getModuleTitle = () => {
        switch (subView) {
            case 'receipt': return 'Biên lai Thu tiền';
            case 'payment': return 'Phiếu Thu tiền';
            case 'reduction': return 'Giảm trừ Thu SN';
            case 'categories': return 'Danh mục Loại thu';
            case 'payer': return 'Đối tượng Nộp tiền';
            case 'report': return 'Báo cáo Thu sự nghiệp';
            case 'budget': return 'So sánh Dự toán/Thực hiện';
            default: return 'Quản lý Thu Sự nghiệp';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 relative">
                {subView === 'receipt' && <ReceiptList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {subView === 'payment' && <PaymentList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {subView === 'reduction' && <ReductionList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {subView === 'categories' && <RevenueCategoryList onSelectionChange={setSelectedRow} refreshSignal={refreshSignal} />}
                {subView === 'payer' && <PayerList onSelectionChange={setSelectedRow} refreshSignal={refreshSignal} />}
                {subView === 'report' && <RevenueReportView />}
                {subView === 'budget' && <BudgetComparisonView />}
            </div>

            {showReceiptModal && (
                <ReceiptFormModal
                    onClose={() => { setShowReceiptModal(false); setRefreshSignal(s => s + 1); }}
                    documentType={subView === 'payment' ? 'PAYMENT' : (subView === 'reduction' ? 'REDUCTION' : 'RECEIPT')}
                    initialData={selectedRow}
                />
            )}
            {showCategoryModal && <CategoryFormModal onClose={() => { setShowCategoryModal(false); setRefreshSignal(s => s + 1); }} />}
            {showPayerModal && <PayerFormModal onClose={() => { setShowPayerModal(false); setRefreshSignal(s => s + 1); }} />}

            {/* Print Preview Modal - Shared */}
            {showPrintPreview && selectedRow && (
                <PrintPreviewModal
                    record={selectedRow}
                    view={subView === 'receipt' || subView === 'payment' ? 'CASH_RECEIPT' : 'CASH_PAYMENT'}
                    onClose={() => setShowPrintPreview(false)}
                    companyInfo={companyInfo}
                />
            )}
        </div>
    );
};
