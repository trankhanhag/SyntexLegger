import React, { useState, useEffect, useCallback } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { revenueService, masterDataService, settingsService } from '../api';
import { type RibbonAction } from './Ribbon';
import { PrintPreviewModal } from './PrintTemplates';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { FormModal, FormSection, FormGrid, FormField, FormButton, FormActions } from './FormModal';
import { ExcelImportModal } from './ExcelImportModal';
import { REVENUE_TEMPLATE } from '../utils/excelTemplates';


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
        { field: 'receipt_no', headerName: 'Số hóa đơn', width: 'w-32', editable: false },
        { field: 'receipt_date', headerName: 'Ngày lập', width: 'w-32', editable: false, type: 'date', align: 'center' },
        { field: 'payer_name', headerName: 'Người nộp tiền', width: 'w-64', editable: false },
        { field: 'category_display_name', headerName: 'Loại thu', width: 'w-48', editable: false },
        {
            field: 'amount', headerName: 'Số tiền', width: 'w-32', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(val)}</span>
        },
        { field: 'payment_method', headerName: 'HTTT', width: 'w-24', editable: false },
        { field: 'fund_source_name', headerName: 'Kênh bán', width: 'w-48', editable: false },
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
        { field: 'fund_source_name', headerName: 'Kênh bán', width: 'w-48', editable: false },
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

// ==================== REDUCTION LIST (Giảm trừ Doanh thu) ====================
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
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Báo cáo Doanh thu</h2>

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
                    <option value="fund_source">Theo kênh bán hàng</option>
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
                            <th className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-300">Số hóa đơn</th>
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
        item_code: initialData?.item_code || '',
        sub_item_code: initialData?.sub_item_code || '',
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
        if (documentType === 'REDUCTION') return 'Giảm trừ Doanh thu';
        return 'Biên lai thu tiền';
    };

    const getIcon = () => {
        return documentType === 'REDUCTION' ? 'remove_circle' : 'receipt';
    };

    const getHeaderColor = (): 'blue' | 'green' | 'red' | 'purple' | 'amber' => {
        if (documentType === 'REDUCTION') return 'red';
        if (documentType === 'PAYMENT') return 'green';
        return 'blue';
    };

    return (
        <FormModal
            onClose={onClose}
            title={`${initialData ? 'Sửa' : 'Lập'} ${getTitle()}`}
            icon={getIcon()}
            size="lg"
            headerVariant="gradient"
            headerColor={getHeaderColor()}
            loading={loading}
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Hủy</FormButton>
                    <FormButton variant="primary" onClick={() => handleSubmit({} as React.FormEvent)} disabled={loading}>
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined">save</span>
                        )}
                        {initialData ? 'Cập nhật' : 'Lưu chứng từ'}
                    </FormButton>
                </FormActions>
            }
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Thông tin chứng từ" variant="card" color="blue">
                    <FormGrid cols={2}>
                        <FormField label="Số chứng từ" required>
                            <input
                                required
                                type="text"
                                className="form-input"
                                value={formData.receipt_no}
                                onChange={e => setFormData({ ...formData, receipt_no: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Ngày lập" required>
                            <input
                                required
                                type="date"
                                className="form-input"
                                value={formData.receipt_date}
                                onChange={e => setFormData({ ...formData, receipt_date: e.target.value })}
                            />
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection title="Thông tin người nộp" variant="card" color="slate">
                    <FormField label="Họ và tên người nộp" required>
                        <input
                            required
                            type="text"
                            placeholder="Nhập họ tên đối tượng"
                            className="form-input"
                            value={formData.payer_name}
                            onChange={e => setFormData({ ...formData, payer_name: e.target.value })}
                        />
                    </FormField>
                    <FormGrid cols={2}>
                        <FormField label="CCCD/Mã số thuế">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.payer_id_card}
                                onChange={e => setFormData({ ...formData, payer_id_card: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Loại thu" required>
                            <select
                                required
                                className="form-select"
                                value={formData.category_code}
                                onChange={e => {
                                    const cat = categories.find(c => c.code === e.target.value);
                                    setFormData({ ...formData, category_code: e.target.value, category_name: cat?.name || '' });
                                }}
                            >
                                <option value="">-- Chọn loại thu --</option>
                                {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection title="Số tiền và thanh toán" variant="highlight" color="green">
                    <FormGrid cols={2}>
                        <FormField label="Số tiền" required>
                            <input
                                required
                                type="number"
                                className="form-input font-mono font-bold text-lg text-green-600 dark:text-green-400"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                            />
                        </FormField>
                        <FormField label="Phương thức HTTT">
                            <select
                                className="form-select"
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option value="CASH">Tiền mặt</option>
                                <option value="BANK">Chuyển khoản</option>
                                <option value="POS">Quẹt thẻ (POS)</option>
                            </select>
                        </FormField>
                    </FormGrid>

                    <FormField label="Bộ phận/Chi nhánh">
                        <select
                            className="form-select"
                            value={formData.fund_source_id}
                            onChange={e => setFormData({ ...formData, fund_source_id: e.target.value })}
                        >
                            <option value="">-- Không liên kết --</option>
                            {fundSources.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </FormField>

                    <FormGrid cols={2}>
                        <FormField label="Mục">
                            <input
                                type="text"
                                className="form-input font-mono"
                                value={formData.item_code}
                                onChange={e => setFormData({ ...formData, item_code: e.target.value })}
                                placeholder="Ví dụ: 511"
                            />
                        </FormField>
                        <FormField label="Khoản mục">
                            <input
                                type="text"
                                className="form-input font-mono"
                                value={formData.sub_item_code}
                                onChange={e => setFormData({ ...formData, sub_item_code: e.target.value })}
                                placeholder="Ví dụ: 5111"
                            />
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection>
                    <FormField label="Ghi chú">
                        <textarea
                            rows={2}
                            className="form-textarea"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </FormField>
                </FormSection>
            </form>
        </FormModal>
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
        <FormModal
            onClose={onClose}
            title="Thêm loại thu mới"
            icon="category"
            size="md"
            headerVariant="gradient"
            headerColor="green"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Hủy</FormButton>
                    <FormButton variant="success" onClick={() => handleSubmit({} as React.FormEvent)}>Lưu danh mục</FormButton>
                </FormActions>
            }
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Thông tin loại thu" variant="card" color="green">
                    <FormField label="Mã loại thu" required>
                        <input required type="text" className="form-input" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                    </FormField>
                    <FormField label="Tên loại thu" required>
                        <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </FormField>
                    <FormField label="Phân loại">
                        <select className="form-select" value={formData.revenue_type} onChange={e => setFormData({ ...formData, revenue_type: e.target.value })}>
                            <option value="RECURRENT">Doanh thu bán hàng (Thường xuyên)</option>
                            <option value="NON_RECURRENT">Thu nhập khác (Không thường xuyên)</option>
                            <option value="PRODUCTION">Doanh thu dịch vụ</option>
                        </select>
                    </FormField>
                </FormSection>
            </form>
        </FormModal>
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
        <FormModal
            onClose={onClose}
            title="Thêm đối tượng nộp tiền"
            icon="person_add"
            size="md"
            headerVariant="gradient"
            headerColor="blue"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Hủy</FormButton>
                    <FormButton variant="primary" onClick={() => handleSubmit({} as React.FormEvent)}>Lưu đối tượng</FormButton>
                </FormActions>
            }
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Thông tin đối tượng" variant="card" color="blue">
                    <FormField label="Họ và tên" required>
                        <input required type="text" className="form-input" value={formData.partner_name} onChange={e => setFormData({ ...formData, partner_name: e.target.value })} />
                    </FormField>
                    <FormField label="CMND/MST">
                        <input type="text" className="form-input" value={formData.tax_code} onChange={e => setFormData({ ...formData, tax_code: e.target.value })} />
                    </FormField>
                    <FormField label="Địa chỉ">
                        <input type="text" className="form-input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </FormField>
                </FormSection>
            </form>
        </FormModal>
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
    onNavigate?: (viewId: string, data?: any) => void;
}

// ==================== REVENUE MODULE ====================
export const RevenueModule: React.FC<RevenueModuleProps> = ({ subView = 'receipt', printSignal = 0, onSetHeader, onNavigate }) => {
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const [showReceiptModal, setShowReceiptModal] = React.useState(false);
    const [showCategoryModal, setShowCategoryModal] = React.useState(false);
    const [showPayerModal, setShowPayerModal] = React.useState(false);
    const [selectedRow, setSelectedRow] = React.useState<any>(null);
    const [refreshSignal, setRefreshSignal] = React.useState(0);
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '' });
    const [printRecord, setPrintRecord] = React.useState<any>(null);
    const lastPrintSignalRef = React.useRef(0); // Track last handled print signal

    // Import states
    const [showImportModal, setShowImportModal] = React.useState(false);
    const [importing, setImporting] = React.useState(false);
    const [importProgress, setImportProgress] = React.useState({ current: 0, total: 0 });

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
                await revenueService.createReceipt({
                    receipt_no: rows[i].receipt_no || rows[i]['Số hóa đơn (*)'] || `BL-${Date.now()}-${i}`,
                    receipt_date: rows[i].receipt_date || rows[i]['Ngày lập (*)'] || new Date().toISOString().split('T')[0],
                    payer_name: rows[i].payer_name || rows[i]['Người nộp (*)'],
                    payer_id_card: rows[i].payer_id_card || rows[i]['CCCD/MST'],
                    payer_address: rows[i].payer_address || rows[i]['Địa chỉ'],
                    category_code: rows[i].category_code || rows[i]['Mã loại thu'],
                    category_name: rows[i].category_name || rows[i]['Tên loại thu'],
                    amount: parseFloat(rows[i].amount || rows[i]['Số tiền (*)'] || 0),
                    fund_source_id: rows[i].fund_source_id || rows[i]['Kênh bán'],
                    item_code: rows[i].item_code || rows[i]['Mục'],
                    sub_item_code: rows[i].sub_item_code || rows[i]['Khoản mục'],
                    payment_method: rows[i].payment_method || rows[i]['Hình thức'] || 'CASH',
                    notes: rows[i].notes || rows[i]['Nội dung thu'] || '',
                    document_type: subView === 'reduction' ? 'REDUCTION' : (subView === 'payment' ? 'PAYMENT' : 'RECEIPT')
                });
                successCount++;
            } catch (err: any) {
                const docNo = rows[i].receipt_no || rows[i]['Số hóa đơn (*)'] || `Dòng ${i + 1}`;
                errors.push(`${docNo}: ${err.response?.data?.error || err.message}`);
            }
        }

        setImporting(false);

        if (errors.length === 0) {
            alert(`Nhập thành công ${successCount} hóa đơn!`);
        } else {
            alert(`Nhập ${successCount}/${rows.length} hóa đơn.\n\nLỗi:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...và ${errors.length - 5} lỗi khác` : ''}`);
        }

        setRefreshSignal(s => s + 1);
    }, [subView]);

    // Handle print signal from Ribbon
    React.useEffect(() => {
        // Only respond to NEW print signals, not when other dependencies change
        if (printSignal > 0 && printSignal !== lastPrintSignalRef.current) {
            lastPrintSignalRef.current = printSignal;

            // Print not available for report/budget views
            if (subView === 'report' || subView === 'budget') {
                alert('Chức năng in không áp dụng cho màn hình Báo cáo và Dự toán. Vui lòng sử dụng chức năng Xuất Excel.');
                return;
            }

            if (!selectedRow) {
                alert('Vui lòng chọn một hóa đơn từ danh sách trước khi in.');
                return;
            }

            // Transform data for print template (CASH_RECEIPT - Phiếu thu)
            const record = {
                // Date fields
                voucher_date: selectedRow.receipt_date || selectedRow.voucher_date || selectedRow.date,
                date: selectedRow.receipt_date || selectedRow.voucher_date || selectedRow.date,
                // Document number
                voucher_no: selectedRow.receipt_no || selectedRow.voucher_no || selectedRow.doc_no,
                doc_no: selectedRow.receipt_no || selectedRow.voucher_no || selectedRow.doc_no,
                receipt_no: selectedRow.receipt_no || selectedRow.voucher_no,
                // Person name (Phiếu thu - người nộp tiền)
                payer_name: selectedRow.payer_name || selectedRow.customer_name || selectedRow.partner_name || '',
                payee_name: selectedRow.payer_name || selectedRow.customer_name || '',
                // Address
                address: selectedRow.address || selectedRow.payer_address || selectedRow.customer_address || '',
                // Description
                description: selectedRow.description || selectedRow.notes || selectedRow.category_name || '',
                reason: selectedRow.description || selectedRow.notes || selectedRow.category_name || '',
                notes: selectedRow.notes || selectedRow.description || '',
                // Amount
                amount: selectedRow.amount || selectedRow.total_amount || 0,
                total_amount: selectedRow.amount || selectedRow.total_amount || 0,
                // Account codes
                debit_account: selectedRow.debit_account || '111', // Tiền mặt
                credit_account: selectedRow.credit_account || selectedRow.revenue_account || '',
                account_code: selectedRow.account_code || '',
                // Additional fields
                attached_docs: selectedRow.attached_docs || '',
                category_name: selectedRow.category_name || '',
            };
            setPrintRecord(record);
            setShowPrintPreview(true);
        }
    }, [printSignal, subView, selectedRow]);

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];

            if (subView === 'receipt') {
                actions.push({
                    label: 'Tạo hóa đơn mới',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowReceiptModal(true); },
                    primary: true
                });
                actions.push({
                    label: 'Nhập từ Excel',
                    icon: 'upload_file',
                    onClick: () => setShowImportModal(true)
                });
            } else if (subView === 'payment') {
                actions.push({
                    label: 'Lập phiếu thu tiền',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowReceiptModal(true); },
                    primary: true
                });
                actions.push({
                    label: 'Nhập từ Excel',
                    icon: 'upload_file',
                    onClick: () => setShowImportModal(true)
                });
            } else if (subView === 'reduction') {
                actions.push({
                    label: 'Lập phiếu giảm trừ',
                    icon: 'remove_circle',
                    onClick: () => { setSelectedRow(null); setShowReceiptModal(true); },
                    primary: true
                });
                actions.push({
                    label: 'Nhập từ Excel',
                    icon: 'upload_file',
                    onClick: () => setShowImportModal(true)
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
            case 'reduction': return 'Giảm trừ Doanh thu';
            case 'categories': return 'Danh mục Loại thu';
            case 'payer': return 'Đối tượng Nộp tiền';
            case 'report': return 'Báo cáo Doanh thu';
            case 'budget': return 'So sánh Kế hoạch/Thực hiện';
            default: return 'Quản lý Doanh thu';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Module Overview - Default Landing Page */}
            {(subView === 'overview' || subView === 'revenue_overview') && (
                <ModuleOverview
                    title={MODULE_CONFIGS.revenue.title}
                    description={MODULE_CONFIGS.revenue.description}
                    icon={MODULE_CONFIGS.revenue.icon}
                    iconColor={MODULE_CONFIGS.revenue.iconColor}
                    workflow={MODULE_CONFIGS.revenue.workflow}
                    features={MODULE_CONFIGS.revenue.features}
                    onNavigate={onNavigate}
                    stats={[
                        { icon: 'receipt_long', label: 'Biên lai tháng', value: '-', color: 'blue' },
                        { icon: 'payments', label: 'Tổng thu tháng', value: '-', color: 'green' },
                        { icon: 'group', label: 'Đối tượng mới', value: '-', color: 'amber' },
                        { icon: 'check_circle', label: 'Trạng thái', value: 'Bình thường', color: 'green' },
                    ]}
                />
            )}

            <div className={`flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 relative ${(subView === 'overview' || subView === 'revenue_overview') ? 'hidden' : ''}`}>
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
            {showPrintPreview && printRecord && (
                <PrintPreviewModal
                    record={printRecord}
                    view={subView === 'receipt' || subView === 'payment' ? 'CASH_RECEIPT' : 'CASH_PAYMENT'}
                    onClose={() => {
                        setShowPrintPreview(false);
                        setPrintRecord(null);
                    }}
                    companyInfo={companyInfo}
                />
            )}

            {/* Excel Import Modal */}
            {showImportModal && (
                <ExcelImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportFromExcel}
                    title="Nhập hóa đơn từ Excel"
                    enhancedTemplate={REVENUE_TEMPLATE}
                    columns={[
                        { key: 'receipt_no', label: 'Số hóa đơn', required: true },
                        { key: 'receipt_date', label: 'Ngày lập', required: true },
                        { key: 'payer_name', label: 'Người nộp', required: true },
                        { key: 'payer_id_card', label: 'CCCD/MST' },
                        { key: 'payer_address', label: 'Địa chỉ' },
                        { key: 'category_code', label: 'Mã loại thu' },
                        { key: 'amount', label: 'Số tiền', required: true },
                        { key: 'item_code', label: 'Mục' },
                        { key: 'sub_item_code', label: 'Khoản mục' },
                        { key: 'payment_method', label: 'Hình thức' },
                        { key: 'notes', label: 'Nội dung thu' }
                    ]}
                />
            )}

            {/* Import Progress Overlay */}
            {importing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-2xl text-center max-w-md">
                        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                            Đang nhập hóa đơn...
                        </p>
                        <p className="text-2xl font-mono text-green-600 mt-2">
                            {importProgress.current} / {importProgress.total}
                        </p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-4">
                            <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
