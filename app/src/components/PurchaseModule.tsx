import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { purchaseService, masterDataService, settingsService } from '../api';
import { type RibbonAction } from './Ribbon';
import { PrintPreviewModal } from './PrintTemplates';
import { ExcelImportModal, type ColumnDef as ImportColumnDef } from './ExcelImportModal';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { FormModal, FormSection, FormGrid, FormField, FormButton, FormActions } from './FormModal';
import logger from '../utils/logger';
import * as XLSX from 'xlsx';

// ==================== PURCHASE REQUEST LIST (Đề xuất mua hàng) ====================
const PurchaseRequestList = ({ onSelect, refreshSignal, onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        purchaseService.getRequests()
            .then(res => {
                const data = res.data || [];
                setRequests(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch purchase requests failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'request_no', headerName: 'Số đề xuất', width: 'w-32', editable: false },
        { field: 'request_date', headerName: 'Ngày lập', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'requester_name', headerName: 'Người đề xuất', width: 'w-40', editable: false },
        { field: 'department', headerName: 'Bộ phận', width: 'w-36', editable: false },
        { field: 'description', headerName: 'Nội dung đề xuất', width: 'flex-1', editable: false },
        {
            field: 'total_amount', headerName: 'Dự toán', width: 'w-36', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-amber-600">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'priority', headerName: 'Ưu tiên', width: 'w-24', align: 'center',
            renderCell: (val: any) => {
                const priorityColors: Record<string, string> = {
                    'HIGH': 'bg-red-100 text-red-700',
                    'MEDIUM': 'bg-amber-100 text-amber-700',
                    'LOW': 'bg-slate-100 text-slate-600',
                };
                const priorityLabels: Record<string, string> = {
                    'HIGH': 'Cao',
                    'MEDIUM': 'TB',
                    'LOW': 'Thấp',
                };
                return <span className={`px-2 py-1 rounded text-xs font-bold ${priorityColors[val] || 'bg-amber-100 text-amber-700'}`}>{priorityLabels[val] || 'TB'}</span>;
            }
        },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (val: any) => {
                const statusColors: Record<string, string> = {
                    'DRAFT': 'bg-slate-100 text-slate-600',
                    'PENDING': 'bg-amber-100 text-amber-700',
                    'APPROVED': 'bg-green-100 text-green-700',
                    'REJECTED': 'bg-red-100 text-red-700',
                    'CONVERTED': 'bg-blue-100 text-blue-700',
                };
                const statusLabels: Record<string, string> = {
                    'DRAFT': 'Nháp',
                    'PENDING': 'Chờ duyệt',
                    'APPROVED': 'Đã duyệt',
                    'REJECTED': 'Từ chối',
                    'CONVERTED': 'Đã tạo PO',
                };
                return <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[val] || 'bg-slate-100'}`}>{statusLabels[val] || val || 'Nháp'}</span>;
            }
        },
        {
            field: 'actions', headerName: '', width: 'w-20', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={requests} columns={columns} setData={setRequests} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== ORDER LIST (Đơn đặt hàng) ====================
const OrderList = ({ onSelect, refreshSignal, onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        purchaseService.getOrders()
            .then(res => {
                const data = res.data || [];
                setOrders(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch purchase orders failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'order_no', headerName: 'Số đơn hàng', width: 'w-32', editable: false },
        { field: 'order_date', headerName: 'Ngày lập', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'vendor_name', headerName: 'Nhà cung cấp', width: 'flex-1', editable: false },
        { field: 'description', headerName: 'Diễn giải', width: 'w-64', editable: false },
        {
            field: 'total_amount', headerName: 'Giá trị', width: 'w-36', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-amber-600">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (val: any) => {
                const statusColors: Record<string, string> = {
                    'DRAFT': 'bg-slate-100 text-slate-600',
                    'PENDING': 'bg-amber-100 text-amber-700',
                    'APPROVED': 'bg-green-100 text-green-700',
                    'COMPLETED': 'bg-blue-100 text-blue-700',
                    'CANCELLED': 'bg-red-100 text-red-700',
                };
                return <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[val] || 'bg-slate-100'}`}>{val || 'DRAFT'}</span>;
            }
        },
        {
            field: 'actions', headerName: '', width: 'w-20', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={orders} columns={columns} setData={setOrders} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== INVOICE LIST (Hóa đơn mua hàng) ====================
const InvoiceList = ({ onSelect, refreshSignal, type = 'INBOUND', onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, type?: 'INBOUND' | 'SERVICE', onDataLoaded?: (data: any[]) => void }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        purchaseService.getInvoices(type)
            .then(res => {
                const data = res.data || [];
                setInvoices(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch purchase invoices failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal, type]);

    const columns: ColumnDef[] = [
        { field: 'invoice_no', headerName: 'Số hóa đơn', width: 'w-32', editable: false },
        { field: 'invoice_date', headerName: 'Ngày HĐ', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'vendor_name', headerName: 'Nhà cung cấp', width: 'flex-1', editable: false },
        { field: 'vendor_tax_code', headerName: 'MST', width: 'w-32', editable: false },
        {
            field: 'amount_before_tax', headerName: 'Tiền hàng', width: 'w-32', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-mono">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'tax_amount', headerName: 'Thuế GTGT', width: 'w-28', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-mono text-slate-500">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'total_amount', headerName: 'Tổng tiền', width: 'w-36', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-amber-600">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'actions', headerName: '', width: 'w-20', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={invoices} columns={columns} setData={setInvoices} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== RETURN LIST (Trả hàng) ====================
const ReturnList = ({ onSelect, refreshSignal, onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        purchaseService.getReturns()
            .then(res => {
                const data = res.data || [];
                setReturns(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch purchase returns failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'return_no', headerName: 'Số phiếu trả', width: 'w-32', editable: false },
        { field: 'return_date', headerName: 'Ngày trả', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'original_invoice_no', headerName: 'HĐ gốc', width: 'w-32', editable: false },
        { field: 'vendor_name', headerName: 'Nhà cung cấp', width: 'flex-1', editable: false },
        { field: 'reason', headerName: 'Lý do', width: 'w-48', editable: false },
        {
            field: 'return_amount', headerName: 'Giá trị trả', width: 'w-36', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-red-600">-{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'actions', headerName: '', width: 'w-20', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={returns} columns={columns} setData={setReturns} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== PAYMENT LIST (Thanh toán NCC) ====================
const PaymentList = ({ onSelect, refreshSignal, onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        purchaseService.getPayments()
            .then(res => {
                const data = res.data || [];
                setPayments(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch purchase payments failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'payment_no', headerName: 'Số chứng từ', width: 'w-32', editable: false },
        { field: 'payment_date', headerName: 'Ngày TT', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'vendor_name', headerName: 'Nhà cung cấp', width: 'flex-1', editable: false },
        { field: 'invoice_no', headerName: 'HĐ thanh toán', width: 'w-32', editable: false },
        { field: 'payment_method', headerName: 'Hình thức', width: 'w-28', editable: false },
        {
            field: 'amount', headerName: 'Số tiền TT', width: 'w-36', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'actions', headerName: '', width: 'w-20', align: 'center',
            renderCell: (_: any, row: any) => (
                <button onClick={() => onSelect(row)} className="text-blue-600 hover:text-blue-800">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                </button>
            )
        },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={payments} columns={columns} setData={setPayments} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== VENDOR LIST (Nhà cung cấp) ====================
const VendorList = ({ onSelectionChange, refreshSignal, onDataLoaded }: { onSelectionChange: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        masterDataService.getPartners({ type: 'VENDOR' })
            .then((res: any) => {
                const data = res.data || [];
                setVendors(data);
                onDataLoaded?.(data);
            })
            .catch((err: any) => logger.error("Fetch vendors failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'partner_code', headerName: 'Mã NCC', width: 'w-28', editable: false },
        { field: 'partner_name', headerName: 'Tên nhà cung cấp', width: 'flex-1', editable: false },
        { field: 'tax_code', headerName: 'Mã số thuế', width: 'w-32', editable: false },
        { field: 'address', headerName: 'Địa chỉ', width: 'w-64', editable: false },
        { field: 'phone', headerName: 'Điện thoại', width: 'w-32', editable: false },
        { field: 'email', headerName: 'Email', width: 'w-48', editable: false },
        { field: 'contact_person', headerName: 'Người liên hệ', width: 'w-36', editable: false },
    ];

    return (
        <div className="h-full relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={vendors} columns={columns} setData={setVendors} onSelectionChange={onSelectionChange} keyField="partner_code" />
        </div>
    );
};

// ==================== PURCHASE REPORT VIEW ====================
const PurchaseReportView = () => {
    const [reportData, setReportData] = useState<any[]>([]);
    const [groupBy, setGroupBy] = useState('vendor');
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // TODO: Call actual report API when available
        // For now, simulate with empty data
        setTimeout(() => {
            setReportData([]);
            setLoading(false);
        }, 500);
    }, [fiscalYear, groupBy]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Báo cáo Mua hàng</h2>

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
                    <option value="vendor">Theo nhà cung cấp</option>
                    <option value="category">Theo loại hàng</option>
                    <option value="month">Theo tháng</option>
                </select>
            </div>

            {/* Report Table */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : reportData.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <span className="material-symbols-outlined text-6xl mb-4 block">inbox</span>
                    <p>Chưa có dữ liệu báo cáo</p>
                </div>
            ) : (
                <table className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300">Phân loại</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-300">Số HĐ</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">Tổng tiền (VNĐ)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {reportData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">{row.name}</td>
                                <td className="px-4 py-3 text-center text-sm font-mono">{row.invoice_count}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
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

// ==================== ORDER FORM MODAL ====================
const OrderFormModal = ({ onClose, initialData }: { onClose: () => void, initialData?: any }) => {
    const [formData, setFormData] = useState({
        order_no: initialData?.order_no || `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        order_date: initialData?.order_date || new Date().toISOString().split('T')[0],
        vendor_code: initialData?.vendor_code || '',
        vendor_name: initialData?.vendor_name || '',
        description: initialData?.description || '',
        delivery_date: initialData?.delivery_date || '',
        total_amount: initialData?.total_amount || 0,
        notes: initialData?.notes || '',
        status: initialData?.status || 'DRAFT'
    });

    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        masterDataService.getPartners({ type: 'VENDOR' })
            .then((res: any) => setVendors(Array.isArray(res.data) ? res.data : []));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // TODO: Call actual API when available
            alert(initialData?.id ? "Đã cập nhật đơn hàng!" : "Đã tạo đơn hàng mới!");
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi lưu đơn hàng.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            onClose={onClose}
            title={`${initialData ? 'Sửa' : 'Tạo'} Đơn đặt hàng`}
            icon="assignment"
            size="lg"
            headerVariant="gradient"
            headerColor="amber"
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
                        {initialData ? 'Cập nhật' : 'Lưu đơn hàng'}
                    </FormButton>
                </FormActions>
            }
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Thông tin đơn hàng" variant="card" color="amber">
                    <FormGrid cols={2}>
                        <FormField label="Số đơn hàng" required>
                            <input
                                required
                                type="text"
                                className="form-input"
                                value={formData.order_no}
                                onChange={e => setFormData({ ...formData, order_no: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Ngày lập" required>
                            <input
                                required
                                type="date"
                                className="form-input"
                                value={formData.order_date}
                                onChange={e => setFormData({ ...formData, order_date: e.target.value })}
                            />
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection title="Nhà cung cấp" variant="card" color="slate">
                    <FormField label="Chọn nhà cung cấp" required>
                        <select
                            required
                            className="form-select"
                            value={formData.vendor_code}
                            onChange={e => {
                                const vendor = vendors.find(v => v.partner_code === e.target.value);
                                setFormData({ ...formData, vendor_code: e.target.value, vendor_name: vendor?.partner_name || '' });
                            }}
                        >
                            <option value="">-- Chọn nhà cung cấp --</option>
                            {vendors.map(v => <option key={v.partner_code} value={v.partner_code}>{v.partner_name}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Diễn giải">
                        <input
                            type="text"
                            className="form-input"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Mô tả đơn hàng..."
                        />
                    </FormField>
                </FormSection>

                <FormSection title="Chi tiết" variant="highlight" color="green">
                    <FormGrid cols={2}>
                        <FormField label="Ngày giao hàng dự kiến">
                            <input
                                type="date"
                                className="form-input"
                                value={formData.delivery_date}
                                onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Giá trị đơn hàng">
                            <input
                                type="number"
                                className="form-input font-mono font-bold text-lg text-amber-600 dark:text-amber-400"
                                value={formData.total_amount}
                                onChange={e => setFormData({ ...formData, total_amount: Number(e.target.value) })}
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

// ==================== PURCHASE REQUEST FORM MODAL ====================
const PurchaseRequestFormModal = ({ onClose, initialData, onNavigate }: { onClose: () => void, initialData?: any, onNavigate?: (viewId: string, data?: any) => void }) => {
    const [formData, setFormData] = useState({
        request_no: initialData?.request_no || `PR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        request_date: initialData?.request_date || new Date().toISOString().split('T')[0],
        requester_name: initialData?.requester_name || '',
        department: initialData?.department || '',
        description: initialData?.description || '',
        reason: initialData?.reason || '',
        priority: initialData?.priority || 'MEDIUM',
        needed_date: initialData?.needed_date || '',
        vendor_code: initialData?.vendor_code || '',
        vendor_name: initialData?.vendor_name || '',
        total_amount: initialData?.total_amount || 0,
        notes: initialData?.notes || '',
        status: initialData?.status || 'DRAFT'
    });

    // Items (line items for the request)
    const [items, setItems] = useState<any[]>(initialData?.items || [
        { id: 1, item_name: '', quantity: 1, unit: '', unit_price: 0, amount: 0, notes: '' }
    ]);

    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        masterDataService.getPartners({ type: 'VENDOR' })
            .then((res: any) => setVendors(Array.isArray(res.data) ? res.data : []));
    }, []);

    // Calculate total when items change
    useEffect(() => {
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        setFormData(prev => ({ ...prev, total_amount: total }));
    }, [items]);

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        // Auto-calculate amount
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), item_name: '', quantity: 1, unit: '', unit_price: 0, amount: 0, notes: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent, action: 'save' | 'submit' = 'save') => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                items,
                status: action === 'submit' ? 'PENDING' : 'DRAFT'
            };

            if (initialData?.id) {
                await purchaseService.updateRequest(initialData.id, payload);
                alert("Đã cập nhật đề xuất!");
            } else {
                await purchaseService.createRequest(payload);
                alert(action === 'submit' ? "Đã gửi đề xuất để duyệt!" : "Đã lưu đề xuất!");
            }
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi lưu đề xuất.");
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToPO = async () => {
        if (!initialData?.id) return;
        try {
            // Create PO from this request
            const poData = {
                order_no: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                order_date: new Date().toISOString().split('T')[0],
                vendor_code: formData.vendor_code,
                vendor_name: formData.vendor_name,
                description: formData.description,
                total_amount: formData.total_amount,
                request_id: initialData.id,
                status: 'DRAFT'
            };
            await purchaseService.createOrder(poData);
            await purchaseService.updateRequest(initialData.id, { status: 'CONVERTED' });
            alert("Đã tạo đơn đặt hàng từ đề xuất!");
            onClose();
            if (onNavigate) onNavigate('purchase_order');
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi tạo đơn hàng.");
        }
    };

    const isApproved = formData.status === 'APPROVED';
    const isPending = formData.status === 'PENDING';
    const isEditable = formData.status === 'DRAFT' || !initialData?.id;

    return (
        <FormModal
            onClose={onClose}
            title={`${initialData?.id ? 'Chi tiết' : 'Lập'} Đề xuất Mua hàng`}
            icon="edit_note"
            size="xl"
            headerVariant="gradient"
            headerColor="amber"
            loading={loading}
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Đóng</FormButton>
                    {isApproved && (
                        <FormButton variant="success" onClick={handleConvertToPO}>
                            <span className="material-symbols-outlined">assignment</span>
                            Tạo Đơn đặt hàng
                        </FormButton>
                    )}
                    {isEditable && (
                        <>
                            <FormButton variant="secondary" onClick={(e: any) => handleSubmit(e, 'save')} disabled={loading}>
                                <span className="material-symbols-outlined">save</span>
                                Lưu nháp
                            </FormButton>
                            <FormButton variant="primary" onClick={(e: any) => handleSubmit(e, 'submit')} disabled={loading}>
                                <span className="material-symbols-outlined">send</span>
                                Gửi duyệt
                            </FormButton>
                        </>
                    )}
                </FormActions>
            }
        >
            <form onSubmit={(e) => handleSubmit(e, 'save')}>
                {/* Status Banner */}
                {initialData?.id && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                        formData.status === 'APPROVED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        formData.status === 'PENDING' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                        formData.status === 'REJECTED' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        formData.status === 'CONVERTED' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                        <span className="material-symbols-outlined">
                            {formData.status === 'APPROVED' ? 'check_circle' :
                             formData.status === 'PENDING' ? 'hourglass_top' :
                             formData.status === 'REJECTED' ? 'cancel' :
                             formData.status === 'CONVERTED' ? 'assignment_turned_in' : 'draft'}
                        </span>
                        <span className="font-bold">
                            {formData.status === 'APPROVED' ? 'Đã được duyệt - Có thể tạo Đơn đặt hàng' :
                             formData.status === 'PENDING' ? 'Đang chờ phê duyệt' :
                             formData.status === 'REJECTED' ? 'Đề xuất bị từ chối' :
                             formData.status === 'CONVERTED' ? 'Đã tạo Đơn đặt hàng' : 'Bản nháp'}
                        </span>
                    </div>
                )}

                <FormSection title="Thông tin đề xuất" variant="card" color="amber">
                    <FormGrid cols={3}>
                        <FormField label="Số đề xuất" required>
                            <input
                                required
                                type="text"
                                className="form-input"
                                value={formData.request_no}
                                onChange={e => setFormData({ ...formData, request_no: e.target.value })}
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="Ngày lập" required>
                            <input
                                required
                                type="date"
                                className="form-input"
                                value={formData.request_date}
                                onChange={e => setFormData({ ...formData, request_date: e.target.value })}
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="Mức ưu tiên">
                            <select
                                className="form-select"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                disabled={!isEditable}
                            >
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao - Khẩn cấp</option>
                            </select>
                        </FormField>
                    </FormGrid>
                    <FormGrid cols={2}>
                        <FormField label="Người đề xuất" required>
                            <input
                                required
                                type="text"
                                className="form-input"
                                value={formData.requester_name}
                                onChange={e => setFormData({ ...formData, requester_name: e.target.value })}
                                placeholder="Họ tên người đề xuất"
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="Bộ phận/Phòng ban">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                placeholder="Ví dụ: Phòng Kỹ thuật"
                                disabled={!isEditable}
                            />
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection title="Nội dung đề xuất" variant="card" color="slate">
                    <FormField label="Mô tả yêu cầu" required>
                        <textarea
                            required
                            rows={2}
                            className="form-textarea"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Mô tả chi tiết nội dung cần mua..."
                            disabled={!isEditable}
                        />
                    </FormField>
                    <FormGrid cols={2}>
                        <FormField label="Lý do mua sắm">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Lý do cần thiết phải mua..."
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="Ngày cần hàng">
                            <input
                                type="date"
                                className="form-input"
                                value={formData.needed_date}
                                onChange={e => setFormData({ ...formData, needed_date: e.target.value })}
                                disabled={!isEditable}
                            />
                        </FormField>
                    </FormGrid>
                    <FormField label="Nhà cung cấp đề xuất">
                        <select
                            className="form-select"
                            value={formData.vendor_code}
                            onChange={e => {
                                const vendor = vendors.find(v => v.partner_code === e.target.value);
                                setFormData({ ...formData, vendor_code: e.target.value, vendor_name: vendor?.partner_name || '' });
                            }}
                            disabled={!isEditable}
                        >
                            <option value="">-- Chưa xác định --</option>
                            {vendors.map(v => <option key={v.partner_code} value={v.partner_code}>{v.partner_name}</option>)}
                        </select>
                    </FormField>
                </FormSection>

                {/* Items Section */}
                <FormSection title="Chi tiết hàng hóa/dịch vụ" variant="highlight" color="blue">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700">
                                <tr>
                                    <th className="px-2 py-2 text-left w-8">#</th>
                                    <th className="px-2 py-2 text-left">Tên hàng hóa/Dịch vụ</th>
                                    <th className="px-2 py-2 text-center w-24">SL</th>
                                    <th className="px-2 py-2 text-center w-20">ĐVT</th>
                                    <th className="px-2 py-2 text-right w-32">Đơn giá</th>
                                    <th className="px-2 py-2 text-right w-36">Thành tiền</th>
                                    {isEditable && <th className="px-2 py-2 w-12"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                                {items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-2 py-2 text-slate-500">{index + 1}</td>
                                        <td className="px-2 py-1">
                                            <input
                                                type="text"
                                                className="form-input text-sm py-1"
                                                value={item.item_name}
                                                onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                                                placeholder="Nhập tên hàng hóa..."
                                                disabled={!isEditable}
                                            />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input
                                                type="number"
                                                className="form-input text-sm py-1 text-center"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                                                min={1}
                                                disabled={!isEditable}
                                            />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input
                                                type="text"
                                                className="form-input text-sm py-1 text-center"
                                                value={item.unit}
                                                onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                                placeholder="Cái"
                                                disabled={!isEditable}
                                            />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input
                                                type="number"
                                                className="form-input text-sm py-1 text-right font-mono"
                                                value={item.unit_price}
                                                onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))}
                                                disabled={!isEditable}
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono font-bold text-amber-600">
                                            {new Intl.NumberFormat('vi-VN').format(item.amount || 0)}
                                        </td>
                                        {isEditable && (
                                            <td className="px-2 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                    disabled={items.length === 1}
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-amber-50 dark:bg-amber-900/20">
                                <tr>
                                    <td colSpan={isEditable ? 5 : 4} className="px-2 py-2 text-right font-bold">Tổng dự toán:</td>
                                    <td className="px-2 py-2 text-right font-mono font-bold text-lg text-amber-600">
                                        {new Intl.NumberFormat('vi-VN').format(formData.total_amount)}
                                    </td>
                                    {isEditable && <td></td>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {isEditable && (
                        <button
                            type="button"
                            onClick={addItem}
                            className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            Thêm dòng
                        </button>
                    )}
                </FormSection>

                <FormSection>
                    <FormField label="Ghi chú thêm">
                        <textarea
                            rows={2}
                            className="form-textarea"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            disabled={!isEditable}
                        />
                    </FormField>
                </FormSection>
            </form>
        </FormModal>
    );
};

// ==================== VENDOR FORM MODAL ====================
const VendorFormModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = useState({
        partner_code: `NCC-${Math.floor(Math.random() * 10000)}`,
        partner_name: '',
        tax_code: '',
        address: '',
        phone: '',
        email: '',
        contact_person: '',
        partner_type: 'VENDOR'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await masterDataService.createPartner(formData);
            alert("Đã thêm nhà cung cấp thành công!");
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi lưu nhà cung cấp.");
        }
    };

    return (
        <FormModal
            onClose={onClose}
            title="Thêm Nhà cung cấp"
            icon="group_add"
            size="md"
            headerVariant="gradient"
            headerColor="amber"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Hủy</FormButton>
                    <FormButton variant="primary" onClick={() => handleSubmit({} as React.FormEvent)}>Lưu NCC</FormButton>
                </FormActions>
            }
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Thông tin nhà cung cấp" variant="card" color="amber">
                    <FormField label="Tên nhà cung cấp" required>
                        <input required type="text" className="form-input" value={formData.partner_name} onChange={e => setFormData({ ...formData, partner_name: e.target.value })} />
                    </FormField>
                    <FormGrid cols={2}>
                        <FormField label="Mã số thuế">
                            <input type="text" className="form-input" value={formData.tax_code} onChange={e => setFormData({ ...formData, tax_code: e.target.value })} />
                        </FormField>
                        <FormField label="Điện thoại">
                            <input type="text" className="form-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </FormField>
                    </FormGrid>
                    <FormField label="Địa chỉ">
                        <input type="text" className="form-input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </FormField>
                    <FormGrid cols={2}>
                        <FormField label="Email">
                            <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </FormField>
                        <FormField label="Người liên hệ">
                            <input type="text" className="form-input" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
                        </FormField>
                    </FormGrid>
                </FormSection>
            </form>
        </FormModal>
    );
};

// ==================== MODULE VIEW HELPER ====================
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

// ==================== PURCHASE MODULE PROPS ====================
interface PurchaseModuleProps {
    subView?: string;
    printSignal?: number;
    exportSignal?: number;
    importSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (viewId: string, data?: any) => void;
}

// ==================== PURCHASE MODULE ====================
// ==================== IMPORT COLUMN DEFINITIONS ====================
const PURCHASE_ORDER_IMPORT_COLUMNS: ImportColumnDef[] = [
    { key: 'order_no', label: 'Số đơn hàng', required: true, aliases: ['so don hang', 'so dh', 'order_no', 'order no', 'số đơn hàng'] },
    { key: 'order_date', label: 'Ngày lập', required: true, type: 'date', aliases: ['ngay lap', 'ngay', 'date', 'order_date', 'ngày lập'] },
    { key: 'vendor_name', label: 'Nhà cung cấp', required: true, aliases: ['nha cung cap', 'ncc', 'vendor', 'vendor_name', 'nhà cung cấp'] },
    { key: 'vendor_code', label: 'Mã NCC', required: false, aliases: ['ma ncc', 'vendor_code', 'mã ncc'] },
    { key: 'description', label: 'Diễn giải', required: false, aliases: ['dien giai', 'mo ta', 'description', 'diễn giải'] },
    { key: 'total_amount', label: 'Giá trị', required: false, type: 'number', aliases: ['gia tri', 'tong tien', 'total', 'amount', 'giá trị'] },
    { key: 'delivery_date', label: 'Ngày giao dự kiến', required: false, type: 'date', aliases: ['ngay giao', 'delivery_date', 'ngày giao'] },
    { key: 'notes', label: 'Ghi chú', required: false, aliases: ['ghi chu', 'notes', 'ghi chú'] },
];

const PURCHASE_INVOICE_IMPORT_COLUMNS: ImportColumnDef[] = [
    { key: 'invoice_no', label: 'Số hóa đơn', required: true, aliases: ['so hoa don', 'so hd', 'invoice_no', 'số hóa đơn'] },
    { key: 'invoice_date', label: 'Ngày HĐ', required: true, type: 'date', aliases: ['ngay hd', 'ngay hoa don', 'date', 'invoice_date', 'ngày hđ'] },
    { key: 'vendor_name', label: 'Nhà cung cấp', required: true, aliases: ['nha cung cap', 'ncc', 'vendor', 'vendor_name', 'nhà cung cấp'] },
    { key: 'vendor_tax_code', label: 'MST', required: false, aliases: ['mst', 'ma so thue', 'tax_code', 'vendor_tax_code'] },
    { key: 'amount_before_tax', label: 'Tiền hàng', required: false, type: 'number', aliases: ['tien hang', 'amount_before_tax', 'tiền hàng'] },
    { key: 'tax_amount', label: 'Thuế GTGT', required: false, type: 'number', aliases: ['thue gtgt', 'thue', 'tax', 'tax_amount'] },
    { key: 'total_amount', label: 'Tổng tiền', required: false, type: 'number', aliases: ['tong tien', 'total', 'total_amount', 'tổng tiền'] },
    { key: 'notes', label: 'Ghi chú', required: false, aliases: ['ghi chu', 'notes', 'ghi chú'] },
];

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({ subView = 'overview', printSignal = 0, exportSignal = 0, importSignal = 0, onSetHeader, onNavigate }) => {
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const [showOrderModal, setShowOrderModal] = React.useState(false);
    const [showVendorModal, setShowVendorModal] = React.useState(false);
    const [showRequestModal, setShowRequestModal] = React.useState(false);
    const [showImportModal, setShowImportModal] = React.useState(false);
    const [selectedRow, setSelectedRow] = React.useState<any>(null);
    const [refreshSignal, setRefreshSignal] = React.useState(0);
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '' });
    const [printRecord, setPrintRecord] = React.useState<any>(null);
    const lastPrintSignalRef = React.useRef(0);
    const lastExportSignalRef = useRef(exportSignal);
    const lastImportSignalRef = useRef(importSignal);
    // Track current tab data for export
    const [currentTabData, setCurrentTabData] = useState<any[]>([]);

    // Fetch company info
    useEffect(() => {
        settingsService.getSettings()
            .then(res => {
                setCompanyInfo({
                    name: res.data.company_name || 'Đơn vị...',
                    address: res.data.company_address || 'Địa chỉ...'
                });
            })
            .catch(logger.error);
    }, []);

    // Handle print signal from Ribbon
    React.useEffect(() => {
        if (printSignal > 0 && printSignal !== lastPrintSignalRef.current) {
            lastPrintSignalRef.current = printSignal;

            if (subView === 'purchase_report') {
                alert('Vui lòng sử dụng chức năng Xuất Excel cho báo cáo.');
                return;
            }

            if (!selectedRow) {
                alert('Vui lòng chọn một bản ghi từ danh sách trước khi in.');
                return;
            }

            const record = {
                voucher_date: selectedRow.order_date || selectedRow.invoice_date || selectedRow.payment_date || selectedRow.request_date,
                voucher_no: selectedRow.order_no || selectedRow.invoice_no || selectedRow.payment_no || selectedRow.request_no,
                vendor_name: selectedRow.vendor_name || '',
                description: selectedRow.description || selectedRow.notes || '',
                amount: selectedRow.total_amount || selectedRow.amount || 0,
            };
            setPrintRecord(record);
            setShowPrintPreview(true);
        }
    }, [printSignal, subView, selectedRow]);

    // Handle export signal from Ribbon
    React.useEffect(() => {
        if (exportSignal > 0 && exportSignal !== lastExportSignalRef.current) {
            lastExportSignalRef.current = exportSignal;
            handleExport();
        }
    }, [exportSignal, subView, currentTabData]);

    // Handle import signal from Ribbon
    React.useEffect(() => {
        if (importSignal > 0 && importSignal !== lastImportSignalRef.current) {
            lastImportSignalRef.current = importSignal;

            const importableViews = ['purchase_order', 'purchase_invoice'];
            if (!importableViews.includes(subView)) {
                alert('Chức năng nhập Excel hỗ trợ cho: Đơn đặt hàng, Hóa đơn mua hàng.\nVui lòng chuyển sang tab tương ứng.');
                return;
            }
            setShowImportModal(true);
        }
    }, [importSignal, subView]);

    // Export current tab data to Excel
    const handleExport = useCallback(() => {
        if (subView === 'overview' || subView === 'purchase_overview' || subView === 'purchase_report') {
            alert('Vui lòng chọn một danh sách cụ thể để xuất Excel.');
            return;
        }

        if (currentTabData.length === 0) {
            alert('Không có dữ liệu để xuất.');
            return;
        }

        const exportConfigs: Record<string, { headers: Record<string, string>; fileName: string }> = {
            purchase_order: {
                headers: { order_no: 'Số đơn hàng', order_date: 'Ngày lập', vendor_name: 'Nhà cung cấp', description: 'Diễn giải', total_amount: 'Giá trị', status: 'Trạng thái' },
                fileName: 'don_dat_hang_mua'
            },
            purchase_invoice: {
                headers: { invoice_no: 'Số hóa đơn', invoice_date: 'Ngày HĐ', vendor_name: 'Nhà cung cấp', vendor_tax_code: 'MST', amount_before_tax: 'Tiền hàng', tax_amount: 'Thuế GTGT', total_amount: 'Tổng tiền' },
                fileName: 'hoa_don_mua_hang'
            },
            purchase_service: {
                headers: { invoice_no: 'Số hóa đơn', invoice_date: 'Ngày HĐ', vendor_name: 'Nhà cung cấp', vendor_tax_code: 'MST', amount_before_tax: 'Tiền hàng', tax_amount: 'Thuế GTGT', total_amount: 'Tổng tiền' },
                fileName: 'hoa_don_dich_vu_mua'
            },
            purchase_return: {
                headers: { return_no: 'Số phiếu trả', return_date: 'Ngày trả', original_invoice_no: 'HĐ gốc', vendor_name: 'Nhà cung cấp', reason: 'Lý do', return_amount: 'Giá trị trả' },
                fileName: 'tra_hang_ncc'
            },
            purchase_payment: {
                headers: { payment_no: 'Số chứng từ', payment_date: 'Ngày TT', vendor_name: 'Nhà cung cấp', invoice_no: 'HĐ thanh toán', payment_method: 'Hình thức', amount: 'Số tiền TT' },
                fileName: 'thanh_toan_ncc'
            },
            vendor_list: {
                headers: { partner_code: 'Mã NCC', partner_name: 'Tên nhà cung cấp', tax_code: 'Mã số thuế', address: 'Địa chỉ', phone: 'Điện thoại', email: 'Email', contact_person: 'Người liên hệ' },
                fileName: 'danh_sach_ncc'
            },
            purchase_request: {
                headers: { request_no: 'Số đề xuất', request_date: 'Ngày lập', requester_name: 'Người đề xuất', department: 'Bộ phận', description: 'Nội dung', total_amount: 'Dự toán', priority: 'Ưu tiên', status: 'Trạng thái' },
                fileName: 'de_xuat_mua_hang'
            },
        };

        const config = exportConfigs[subView];
        if (!config) {
            alert('Chưa hỗ trợ xuất Excel cho màn hình này.');
            return;
        }

        try {
            const exportData = currentTabData.map(row => {
                const mapped: Record<string, any> = {};
                for (const [key, label] of Object.entries(config.headers)) {
                    mapped[label] = row[key] ?? '';
                }
                return mapped;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Data');
            XLSX.writeFile(wb, `${config.fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) {
            logger.error('Export failed:', err);
            alert('Lỗi khi xuất Excel.');
        }
    }, [subView, currentTabData]);

    // Handle import data
    const handleImport = useCallback(async (importedData: any[]) => {
        try {
            if (subView === 'purchase_order') {
                const res = await purchaseService.importOrders(importedData);
                const data = res.data;
                alert(`Nhập đơn hàng thành công!\n- Thêm mới: ${data.inserted || 0}\n- Bỏ qua: ${data.skipped || 0}`);
            } else if (subView === 'purchase_invoice') {
                const res = await purchaseService.importInvoices(importedData);
                const data = res.data;
                alert(`Nhập hóa đơn thành công!\n- Thêm mới: ${data.inserted || 0}\n- Bỏ qua: ${data.skipped || 0}`);
            }
            setRefreshSignal(s => s + 1);
        } catch (err: any) {
            logger.error('Import failed:', err);
            throw new Error(err.response?.data?.error || err.message || 'Lỗi khi nhập dữ liệu');
        }
    }, [subView]);

    // Get import columns based on current view
    const getImportColumns = () => {
        if (subView === 'purchase_order') return PURCHASE_ORDER_IMPORT_COLUMNS;
        if (subView === 'purchase_invoice') return PURCHASE_INVOICE_IMPORT_COLUMNS;
        return PURCHASE_ORDER_IMPORT_COLUMNS;
    };

    const getImportTitle = () => {
        if (subView === 'purchase_order') return 'Nhập Đơn đặt hàng từ Excel';
        if (subView === 'purchase_invoice') return 'Nhập Hóa đơn mua hàng từ Excel';
        return 'Nhập dữ liệu từ Excel';
    };

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];

            if (subView === 'purchase_order') {
                actions.push({
                    label: 'Tạo đơn hàng',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowOrderModal(true); },
                    primary: true
                });
            } else if (subView === 'purchase_invoice') {
                actions.push({
                    label: 'Nhập hóa đơn',
                    icon: 'add_circle',
                    onClick: () => { alert('Chức năng đang phát triển'); },
                    primary: true
                });
            } else if (subView === 'vendor_list') {
                actions.push({
                    label: 'Thêm NCC',
                    icon: 'group_add',
                    onClick: () => setShowVendorModal(true),
                    primary: true
                });
            } else if (subView === 'purchase_request') {
                actions.push({
                    label: 'Lập đề xuất',
                    icon: 'edit_note',
                    onClick: () => { setSelectedRow(null); setShowRequestModal(true); },
                    primary: true
                });
                if (selectedRow) {
                    actions.push({
                        label: 'Xem chi tiết',
                        icon: 'visibility',
                        onClick: () => setShowRequestModal(true)
                    });
                    if (selectedRow.status === 'APPROVED') {
                        actions.push({
                            label: 'Tạo đơn hàng',
                            icon: 'assignment',
                            onClick: () => setShowRequestModal(true)
                        });
                    }
                }
            }

            if (selectedRow && ['purchase_order', 'purchase_invoice', 'purchase_return', 'purchase_payment'].includes(subView)) {
                actions.push({
                    label: 'Xem chi tiết',
                    icon: 'visibility',
                    onClick: () => alert('Chức năng đang phát triển')
                });
                actions.push({
                    label: 'In chứng từ',
                    icon: 'print',
                    onClick: () => setShowPrintPreview(true)
                });
            }

            onSetHeader({
                title: getModuleTitle(),
                icon: 'shopping_cart',
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
                case 'purchase_order': await purchaseService.deleteOrder(selectedRow.id); break;
                case 'purchase_invoice': await purchaseService.deleteInvoice(selectedRow.id); break;
                case 'purchase_return': await purchaseService.deleteReturn(selectedRow.id); break;
                case 'purchase_payment': await purchaseService.deletePayment(selectedRow.id); break;
                case 'purchase_request': await purchaseService.deleteRequest(selectedRow.id); break;
                case 'vendor_list': await masterDataService.deletePartner(selectedRow.id || selectedRow.partner_code); break;
                default: return;
            }
            alert("Đã xóa thành công.");
            setRefreshSignal(s => s + 1);
            setSelectedRow(null);
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const getModuleTitle = () => {
        switch (subView) {
            case 'purchase_order': return 'Đơn đặt hàng';
            case 'purchase_invoice': return 'Hóa đơn Mua hàng';
            case 'purchase_service': return 'Hóa đơn Dịch vụ';
            case 'purchase_return': return 'Trả hàng NCC';
            case 'purchase_payment': return 'Thanh toán NCC';
            case 'vendor_list': return 'Danh mục Nhà cung cấp';
            case 'purchase_report': return 'Báo cáo Mua hàng';
            case 'purchase_request': return 'Đề xuất Mua hàng';
            default: return 'Phân hệ Mua hàng';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Module Overview - Default Landing Page */}
            {(subView === 'overview' || subView === 'purchase_overview') && (
                <ModuleOverview
                    title={MODULE_CONFIGS.purchase.title}
                    description={MODULE_CONFIGS.purchase.description}
                    icon={MODULE_CONFIGS.purchase.icon}
                    iconColor={MODULE_CONFIGS.purchase.iconColor}
                    workflow={MODULE_CONFIGS.purchase.workflow}
                    features={MODULE_CONFIGS.purchase.features}
                    onNavigate={onNavigate}
                    stats={[
                        { icon: 'assignment', label: 'Đơn hàng tháng', value: '-', color: 'amber' },
                        { icon: 'receipt', label: 'Hóa đơn chưa TT', value: '-', color: 'red' },
                        { icon: 'groups', label: 'Nhà cung cấp', value: '-', color: 'blue' },
                        { icon: 'check_circle', label: 'Trạng thái', value: 'Bình thường', color: 'green' },
                    ]}
                />
            )}

            <div className={`flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 relative ${(subView === 'overview' || subView === 'purchase_overview') ? 'hidden' : ''}`}>
                {subView === 'purchase_order' && <OrderList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'purchase_invoice' && <InvoiceList onSelect={setSelectedRow} refreshSignal={refreshSignal} type="INBOUND" onDataLoaded={setCurrentTabData} />}
                {subView === 'purchase_service' && <InvoiceList onSelect={setSelectedRow} refreshSignal={refreshSignal} type="SERVICE" onDataLoaded={setCurrentTabData} />}
                {subView === 'purchase_return' && <ReturnList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'purchase_payment' && <PaymentList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'vendor_list' && <VendorList onSelectionChange={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'purchase_report' && <PurchaseReportView />}
                {subView === 'purchase_request' && <PurchaseRequestList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
            </div>

            {showOrderModal && (
                <OrderFormModal
                    onClose={() => { setShowOrderModal(false); setRefreshSignal(s => s + 1); }}
                    initialData={selectedRow}
                />
            )}
            {showVendorModal && <VendorFormModal onClose={() => { setShowVendorModal(false); setRefreshSignal(s => s + 1); }} />}
            {showRequestModal && (
                <PurchaseRequestFormModal
                    onClose={() => { setShowRequestModal(false); setRefreshSignal(s => s + 1); }}
                    initialData={selectedRow}
                    onNavigate={onNavigate}
                />
            )}

            {/* Print Preview Modal */}
            {showPrintPreview && printRecord && (
                <PrintPreviewModal
                    record={printRecord}
                    view="PURCHASE_ORDER"
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
                    title={getImportTitle()}
                    columns={getImportColumns()}
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImport}
                    description={subView === 'purchase_order'
                        ? 'Nhập danh sách đơn đặt hàng từ file Excel. Các đơn hàng trùng số sẽ được bỏ qua.'
                        : 'Nhập danh sách hóa đơn mua hàng từ file Excel. Các hóa đơn trùng số sẽ được bỏ qua.'}
                    templateFileName={subView === 'purchase_order' ? 'mau_don_dat_hang_mua' : 'mau_hoa_don_mua_hang'}
                />
            )}
        </div>
    );
};
