import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { salesService, masterDataService, settingsService } from '../api';
import { type RibbonAction } from './Ribbon';
import { PrintPreviewModal } from './PrintTemplates';
import { ExcelImportModal, type ColumnDef as ImportColumnDef } from './ExcelImportModal';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { FormModal, FormSection, FormGrid, FormField, FormButton, FormActions } from './FormModal';
import logger from '../utils/logger';
import * as XLSX from 'xlsx';

// ==================== DELIVERY LIST (Phiếu giao hàng) ====================
const DeliveryList = ({ onSelect, refreshSignal, onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getDeliveries()
            .then(res => {
                const data = res.data || [];
                setDeliveries(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch deliveries failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'delivery_no', headerName: 'Số phiếu giao', width: 'w-32', editable: false },
        { field: 'delivery_date', headerName: 'Ngày giao', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'order_no', headerName: 'Đơn hàng', width: 'w-32', editable: false },
        { field: 'customer_name', headerName: 'Khách hàng', width: 'flex-1', editable: false },
        { field: 'delivery_address', headerName: 'Địa chỉ giao', width: 'w-64', editable: false },
        { field: 'shipper_name', headerName: 'Người giao', width: 'w-36', editable: false },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (val: any) => {
                const statusColors: Record<string, string> = {
                    'PENDING': 'bg-amber-100 text-amber-700',
                    'SHIPPING': 'bg-blue-100 text-blue-700',
                    'DELIVERED': 'bg-green-100 text-green-700',
                    'RETURNED': 'bg-red-100 text-red-700',
                    'CANCELLED': 'bg-slate-100 text-slate-600',
                };
                const statusLabels: Record<string, string> = {
                    'PENDING': 'Chờ giao',
                    'SHIPPING': 'Đang giao',
                    'DELIVERED': 'Đã giao',
                    'RETURNED': 'Hoàn trả',
                    'CANCELLED': 'Đã hủy',
                };
                return <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[val] || 'bg-slate-100'}`}>{statusLabels[val] || val || 'Chờ giao'}</span>;
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
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={deliveries} columns={columns} setData={setDeliveries} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== ORDER LIST (Đơn hàng bán) ====================
const OrderList = ({ onSelect, refreshSignal, onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getOrders()
            .then(res => {
                const data = res.data || [];
                setOrders(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch sales orders failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'order_no', headerName: 'Số đơn hàng', width: 'w-32', editable: false },
        { field: 'order_date', headerName: 'Ngày lập', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'customer_name', headerName: 'Khách hàng', width: 'flex-1', editable: false },
        { field: 'description', headerName: 'Diễn giải', width: 'w-64', editable: false },
        {
            field: 'total_amount', headerName: 'Giá trị', width: 'w-36', editable: false, type: 'number', align: 'right',
            renderCell: (val: any) => <span className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (val: any) => {
                const statusColors: Record<string, string> = {
                    'DRAFT': 'bg-slate-100 text-slate-600',
                    'PENDING': 'bg-amber-100 text-amber-700',
                    'CONFIRMED': 'bg-blue-100 text-blue-700',
                    'DELIVERED': 'bg-green-100 text-green-700',
                    'COMPLETED': 'bg-teal-100 text-teal-700',
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
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={orders} columns={columns} setData={setOrders} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== INVOICE LIST (Hóa đơn bán hàng) ====================
const InvoiceList = ({ onSelect, refreshSignal, type = 'INVOICE', onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, type?: 'INVOICE' | 'SERVICE', onDataLoaded?: (data: any[]) => void }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getInvoices(type)
            .then(res => {
                const data = res.data || [];
                setInvoices(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch sales invoices failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal, type]);

    const columns: ColumnDef[] = [
        { field: 'invoice_no', headerName: 'Số hóa đơn', width: 'w-32', editable: false },
        { field: 'invoice_date', headerName: 'Ngày HĐ', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'customer_name', headerName: 'Khách hàng', width: 'flex-1', editable: false },
        { field: 'customer_tax_code', headerName: 'MST', width: 'w-32', editable: false },
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
            renderCell: (val: any) => <span className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(val || 0)}</span>
        },
        {
            field: 'payment_status', headerName: 'Thanh toán', width: 'w-28', align: 'center',
            renderCell: (val: any) => {
                const statusColors: Record<string, string> = {
                    'UNPAID': 'bg-red-100 text-red-700',
                    'PARTIAL': 'bg-amber-100 text-amber-700',
                    'PAID': 'bg-green-100 text-green-700',
                };
                const statusLabels: Record<string, string> = {
                    'UNPAID': 'Chưa TT',
                    'PARTIAL': 'TT một phần',
                    'PAID': 'Đã TT',
                };
                return <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[val] || 'bg-slate-100'}`}>{statusLabels[val] || val || 'Chưa TT'}</span>;
            }
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
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
        salesService.getReturns()
            .then(res => {
                const data = res.data || [];
                setReturns(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch sales returns failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'return_no', headerName: 'Số phiếu', width: 'w-32', editable: false },
        { field: 'return_date', headerName: 'Ngày trả', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'original_invoice_no', headerName: 'HĐ gốc', width: 'w-32', editable: false },
        { field: 'customer_name', headerName: 'Khách hàng', width: 'flex-1', editable: false },
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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={returns} columns={columns} setData={setReturns} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== PAYMENT LIST (Thu tiền khách hàng) ====================
const PaymentList = ({ onSelect, refreshSignal, onDataLoaded }: { onSelect: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getPayments()
            .then(res => {
                const data = res.data || [];
                setPayments(data);
                onDataLoaded?.(data);
            })
            .catch(err => logger.error("Fetch sales payments failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'payment_no', headerName: 'Số chứng từ', width: 'w-32', editable: false },
        { field: 'payment_date', headerName: 'Ngày thu', width: 'w-28', editable: false, type: 'date', align: 'center' },
        { field: 'customer_name', headerName: 'Khách hàng', width: 'flex-1', editable: false },
        { field: 'invoice_no', headerName: 'HĐ thanh toán', width: 'w-32', editable: false },
        { field: 'payment_method', headerName: 'Hình thức', width: 'w-28', editable: false },
        {
            field: 'amount', headerName: 'Số tiền thu', width: 'w-36', editable: false, type: 'number', align: 'right',
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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={payments} columns={columns} setData={setPayments} onSelectionChange={onSelect} />
        </div>
    );
};

// ==================== CUSTOMER LIST (Khách hàng) ====================
const CustomerList = ({ onSelectionChange, refreshSignal, onDataLoaded }: { onSelectionChange: (rec: any) => void, refreshSignal?: number, onDataLoaded?: (data: any[]) => void }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        masterDataService.getPartners({ type: 'CUSTOMER' })
            .then((res: any) => {
                const data = res.data || [];
                setCustomers(data);
                onDataLoaded?.(data);
            })
            .catch((err: any) => logger.error("Fetch customers failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'partner_code', headerName: 'Mã KH', width: 'w-28', editable: false },
        { field: 'partner_name', headerName: 'Tên khách hàng', width: 'flex-1', editable: false },
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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={customers} columns={columns} setData={setCustomers} onSelectionChange={onSelectionChange} keyField="partner_code" />
        </div>
    );
};

// ==================== SALES REPORT VIEW ====================
const SalesReportView = () => {
    const [reportData, setReportData] = useState<any[]>([]);
    const [groupBy, setGroupBy] = useState('customer');
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // TODO: Call actual report API when available
        setTimeout(() => {
            setReportData([]);
            setLoading(false);
        }, 500);
    }, [fiscalYear, groupBy]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Báo cáo Bán hàng</h2>

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
                    <option value="customer">Theo khách hàng</option>
                    <option value="product">Theo sản phẩm</option>
                    <option value="month">Theo tháng</option>
                    <option value="salesperson">Theo nhân viên</option>
                </select>
            </div>

            {/* Report Table */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
                            <th className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">Doanh thu (VNĐ)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {reportData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">{row.name}</td>
                                <td className="px-4 py-3 text-center text-sm font-mono">{row.invoice_count}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
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
        order_no: initialData?.order_no || `SO-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        order_date: initialData?.order_date || new Date().toISOString().split('T')[0],
        customer_code: initialData?.customer_code || '',
        customer_name: initialData?.customer_name || '',
        description: initialData?.description || '',
        delivery_date: initialData?.delivery_date || '',
        total_amount: initialData?.total_amount || 0,
        notes: initialData?.notes || '',
        status: initialData?.status || 'DRAFT'
    });

    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        masterDataService.getPartners({ type: 'CUSTOMER' })
            .then((res: any) => setCustomers(Array.isArray(res.data) ? res.data : []));
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
            title={`${initialData ? 'Sửa' : 'Tạo'} Đơn hàng bán`}
            icon="shopping_cart"
            size="lg"
            headerVariant="gradient"
            headerColor="blue"
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
                <FormSection title="Thông tin đơn hàng" variant="card" color="blue">
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

                <FormSection title="Khách hàng" variant="card" color="slate">
                    <FormField label="Chọn khách hàng" required>
                        <select
                            required
                            className="form-select"
                            value={formData.customer_code}
                            onChange={e => {
                                const customer = customers.find(c => c.partner_code === e.target.value);
                                setFormData({ ...formData, customer_code: e.target.value, customer_name: customer?.partner_name || '' });
                            }}
                        >
                            <option value="">-- Chọn khách hàng --</option>
                            {customers.map(c => <option key={c.partner_code} value={c.partner_code}>{c.partner_name}</option>)}
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
                                className="form-input font-mono font-bold text-lg text-blue-600 dark:text-blue-400"
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

// ==================== INVOICE FORM MODAL ====================
const InvoiceFormModal = ({ onClose, initialData }: { onClose: () => void, initialData?: any }) => {
    const [formData, setFormData] = useState({
        invoice_no: initialData?.invoice_no || '',
        invoice_date: initialData?.invoice_date || new Date().toISOString().split('T')[0],
        customer_code: initialData?.customer_code || '',
        customer_name: initialData?.customer_name || '',
        customer_tax_code: initialData?.customer_tax_code || '',
        customer_address: initialData?.customer_address || '',
        amount_before_tax: initialData?.amount_before_tax || 0,
        tax_rate: initialData?.tax_rate || 10,
        tax_amount: initialData?.tax_amount || 0,
        total_amount: initialData?.total_amount || 0,
        notes: initialData?.notes || '',
    });

    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        masterDataService.getPartners({ type: 'CUSTOMER' })
            .then((res: any) => setCustomers(Array.isArray(res.data) ? res.data : []));
    }, []);

    // Auto-calculate tax and total
    useEffect(() => {
        const taxAmount = formData.amount_before_tax * (formData.tax_rate / 100);
        const totalAmount = formData.amount_before_tax + taxAmount;
        setFormData(prev => ({ ...prev, tax_amount: taxAmount, total_amount: totalAmount }));
    }, [formData.amount_before_tax, formData.tax_rate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // TODO: Call actual API when available
            alert(initialData?.id ? "Đã cập nhật hóa đơn!" : "Đã tạo hóa đơn mới!");
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi lưu hóa đơn.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            onClose={onClose}
            title={`${initialData ? 'Sửa' : 'Lập'} Hóa đơn bán hàng`}
            icon="receipt"
            size="lg"
            headerVariant="gradient"
            headerColor="blue"
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
                        {initialData ? 'Cập nhật' : 'Lưu hóa đơn'}
                    </FormButton>
                </FormActions>
            }
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Thông tin hóa đơn" variant="card" color="blue">
                    <FormGrid cols={2}>
                        <FormField label="Số hóa đơn" required>
                            <input
                                required
                                type="text"
                                className="form-input"
                                value={formData.invoice_no}
                                onChange={e => setFormData({ ...formData, invoice_no: e.target.value })}
                                placeholder="Nhập số hóa đơn"
                            />
                        </FormField>
                        <FormField label="Ngày hóa đơn" required>
                            <input
                                required
                                type="date"
                                className="form-input"
                                value={formData.invoice_date}
                                onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                            />
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection title="Thông tin khách hàng" variant="card" color="slate">
                    <FormField label="Chọn khách hàng" required>
                        <select
                            required
                            className="form-select"
                            value={formData.customer_code}
                            onChange={e => {
                                const customer = customers.find(c => c.partner_code === e.target.value);
                                setFormData({
                                    ...formData,
                                    customer_code: e.target.value,
                                    customer_name: customer?.partner_name || '',
                                    customer_tax_code: customer?.tax_code || '',
                                    customer_address: customer?.address || ''
                                });
                            }}
                        >
                            <option value="">-- Chọn khách hàng --</option>
                            {customers.map(c => <option key={c.partner_code} value={c.partner_code}>{c.partner_name}</option>)}
                        </select>
                    </FormField>
                    <FormGrid cols={2}>
                        <FormField label="Mã số thuế">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.customer_tax_code}
                                onChange={e => setFormData({ ...formData, customer_tax_code: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Địa chỉ">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.customer_address}
                                onChange={e => setFormData({ ...formData, customer_address: e.target.value })}
                            />
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection title="Số tiền" variant="highlight" color="green">
                    <FormGrid cols={3}>
                        <FormField label="Tiền hàng (trước thuế)" required>
                            <input
                                required
                                type="number"
                                className="form-input font-mono"
                                value={formData.amount_before_tax}
                                onChange={e => setFormData({ ...formData, amount_before_tax: Number(e.target.value) })}
                            />
                        </FormField>
                        <FormField label="Thuế suất (%)">
                            <select
                                className="form-select"
                                value={formData.tax_rate}
                                onChange={e => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                            >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={8}>8%</option>
                                <option value={10}>10%</option>
                            </select>
                        </FormField>
                        <FormField label="Thuế GTGT">
                            <input
                                type="number"
                                className="form-input font-mono bg-slate-100"
                                value={formData.tax_amount}
                                readOnly
                            />
                        </FormField>
                    </FormGrid>
                    <FormField label="Tổng cộng thanh toán">
                        <input
                            type="number"
                            className="form-input font-mono font-bold text-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            value={formData.total_amount}
                            readOnly
                        />
                    </FormField>
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

// ==================== CUSTOMER FORM MODAL ====================
const CustomerFormModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = useState({
        partner_code: `KH-${Math.floor(Math.random() * 10000)}`,
        partner_name: '',
        tax_code: '',
        address: '',
        phone: '',
        email: '',
        contact_person: '',
        partner_type: 'CUSTOMER'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await masterDataService.createPartner(formData);
            alert("Đã thêm khách hàng thành công!");
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi lưu khách hàng.");
        }
    };

    return (
        <FormModal
            onClose={onClose}
            title="Thêm Khách hàng"
            icon="person_add"
            size="md"
            headerVariant="gradient"
            headerColor="blue"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Hủy</FormButton>
                    <FormButton variant="primary" onClick={() => handleSubmit({} as React.FormEvent)}>Lưu KH</FormButton>
                </FormActions>
            }
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Thông tin khách hàng" variant="card" color="blue">
                    <FormField label="Tên khách hàng" required>
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

// ==================== DELIVERY FORM MODAL ====================
const DeliveryFormModal = ({ onClose, initialData, onNavigate }: { onClose: () => void, initialData?: any, onNavigate?: (viewId: string, data?: any) => void }) => {
    const [formData, setFormData] = useState({
        delivery_no: initialData?.delivery_no || `DL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        delivery_date: initialData?.delivery_date || new Date().toISOString().split('T')[0],
        order_id: initialData?.order_id || '',
        order_no: initialData?.order_no || '',
        customer_code: initialData?.customer_code || '',
        customer_name: initialData?.customer_name || '',
        delivery_address: initialData?.delivery_address || '',
        receiver_name: initialData?.receiver_name || '',
        receiver_phone: initialData?.receiver_phone || '',
        shipper_name: initialData?.shipper_name || '',
        shipper_phone: initialData?.shipper_phone || '',
        vehicle_no: initialData?.vehicle_no || '',
        expected_date: initialData?.expected_date || '',
        notes: initialData?.notes || '',
        status: initialData?.status || 'PENDING'
    });

    // Items for delivery (from order)
    const [items, setItems] = useState<any[]>(initialData?.items || []);

    const [orders, setOrders] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Promise.all([
            salesService.getOrders(),
            masterDataService.getPartners({ type: 'CUSTOMER' })
        ]).then(([ordersRes, customersRes]) => {
            // Filter orders that can be delivered (CONFIRMED status)
            const eligibleOrders = (ordersRes.data || []).filter((o: any) =>
                o.status === 'CONFIRMED' || o.status === 'PENDING' || o.id === initialData?.order_id
            );
            setOrders(eligibleOrders);
            setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
        });
    }, []);

    const handleOrderSelect = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const customer = customers.find(c => c.partner_code === order.customer_code);
            setFormData(prev => ({
                ...prev,
                order_id: order.id,
                order_no: order.order_no,
                customer_code: order.customer_code,
                customer_name: order.customer_name,
                delivery_address: customer?.address || order.delivery_address || '',
                receiver_name: customer?.contact_person || '',
                receiver_phone: customer?.phone || '',
            }));
            // Load order items as delivery items
            if (order.items) {
                setItems(order.items.map((item: any, idx: number) => ({
                    id: idx + 1,
                    item_name: item.item_name,
                    ordered_qty: item.quantity,
                    delivered_qty: item.quantity,
                    unit: item.unit,
                    notes: ''
                })));
            }
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent, action: 'save' | 'ship' | 'complete' = 'save') => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                items,
                status: action === 'complete' ? 'DELIVERED' : action === 'ship' ? 'SHIPPING' : 'PENDING'
            };

            if (initialData?.id) {
                await salesService.updateDelivery(initialData.id, payload);
                alert("Đã cập nhật phiếu giao hàng!");
            } else {
                await salesService.createDelivery(payload);
                alert(action === 'ship' ? "Đã tạo và bắt đầu giao hàng!" : "Đã tạo phiếu giao hàng!");
            }
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi lưu phiếu giao hàng.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDelivered = async () => {
        if (!initialData?.id) return;
        try {
            await salesService.updateDelivery(initialData.id, { status: 'DELIVERED' });
            alert("Đã xác nhận giao hàng thành công!");
            onClose();
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi xác nhận giao hàng.");
        }
    };

    const isEditable = formData.status === 'PENDING' || !initialData?.id;
    const canShip = formData.status === 'PENDING' && initialData?.id;
    const canComplete = formData.status === 'SHIPPING' && initialData?.id;

    return (
        <FormModal
            onClose={onClose}
            title={`${initialData?.id ? 'Chi tiết' : 'Lập'} Phiếu giao hàng`}
            icon="local_shipping"
            size="xl"
            headerVariant="gradient"
            headerColor="blue"
            loading={loading}
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Đóng</FormButton>
                    {canComplete && (
                        <FormButton variant="success" onClick={handleConfirmDelivered}>
                            <span className="material-symbols-outlined">check_circle</span>
                            Xác nhận đã giao
                        </FormButton>
                    )}
                    {canShip && (
                        <FormButton variant="primary" onClick={(e: any) => handleSubmit(e, 'ship')}>
                            <span className="material-symbols-outlined">local_shipping</span>
                            Bắt đầu giao
                        </FormButton>
                    )}
                    {isEditable && (
                        <FormButton variant="primary" onClick={(e: any) => handleSubmit(e, 'save')} disabled={loading}>
                            <span className="material-symbols-outlined">save</span>
                            {initialData?.id ? 'Cập nhật' : 'Lưu phiếu'}
                        </FormButton>
                    )}
                </FormActions>
            }
        >
            <form onSubmit={(e) => handleSubmit(e, 'save')}>
                {/* Status Banner */}
                {initialData?.id && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                        formData.status === 'DELIVERED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        formData.status === 'SHIPPING' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        formData.status === 'RETURNED' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        formData.status === 'CANCELLED' ? 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    }`}>
                        <span className="material-symbols-outlined">
                            {formData.status === 'DELIVERED' ? 'check_circle' :
                             formData.status === 'SHIPPING' ? 'local_shipping' :
                             formData.status === 'RETURNED' ? 'undo' :
                             formData.status === 'CANCELLED' ? 'cancel' : 'schedule'}
                        </span>
                        <span className="font-bold">
                            {formData.status === 'DELIVERED' ? 'Đã giao hàng thành công' :
                             formData.status === 'SHIPPING' ? 'Đang vận chuyển' :
                             formData.status === 'RETURNED' ? 'Hàng đã hoàn trả' :
                             formData.status === 'CANCELLED' ? 'Phiếu đã hủy' : 'Chờ giao hàng'}
                        </span>
                    </div>
                )}

                <FormSection title="Thông tin phiếu giao" variant="card" color="blue">
                    <FormGrid cols={3}>
                        <FormField label="Số phiếu giao" required>
                            <input
                                required
                                type="text"
                                className="form-input"
                                value={formData.delivery_no}
                                onChange={e => setFormData({ ...formData, delivery_no: e.target.value })}
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="Ngày giao" required>
                            <input
                                required
                                type="date"
                                className="form-input"
                                value={formData.delivery_date}
                                onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="Đơn hàng" required>
                            <select
                                required
                                className="form-select"
                                value={formData.order_id}
                                onChange={e => handleOrderSelect(e.target.value)}
                                disabled={!isEditable || !!initialData?.id}
                            >
                                <option value="">-- Chọn đơn hàng --</option>
                                {orders.map(o => (
                                    <option key={o.id} value={o.id}>
                                        {o.order_no} - {o.customer_name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </FormGrid>
                </FormSection>

                <FormSection title="Thông tin người nhận" variant="card" color="slate">
                    <FormGrid cols={2}>
                        <FormField label="Khách hàng">
                            <input
                                type="text"
                                className="form-input bg-slate-100"
                                value={formData.customer_name}
                                readOnly
                            />
                        </FormField>
                        <FormField label="Người nhận">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.receiver_name}
                                onChange={e => setFormData({ ...formData, receiver_name: e.target.value })}
                                placeholder="Tên người nhận hàng"
                                disabled={!isEditable}
                            />
                        </FormField>
                    </FormGrid>
                    <FormField label="Địa chỉ giao hàng" required>
                        <input
                            required
                            type="text"
                            className="form-input"
                            value={formData.delivery_address}
                            onChange={e => setFormData({ ...formData, delivery_address: e.target.value })}
                            placeholder="Nhập địa chỉ giao hàng..."
                            disabled={!isEditable}
                        />
                    </FormField>
                    <FormField label="Điện thoại người nhận">
                        <input
                            type="text"
                            className="form-input"
                            value={formData.receiver_phone}
                            onChange={e => setFormData({ ...formData, receiver_phone: e.target.value })}
                            placeholder="Số điện thoại"
                            disabled={!isEditable}
                        />
                    </FormField>
                </FormSection>

                <FormSection title="Thông tin vận chuyển" variant="highlight" color="teal">
                    <FormGrid cols={3}>
                        <FormField label="Người giao hàng">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.shipper_name}
                                onChange={e => setFormData({ ...formData, shipper_name: e.target.value })}
                                placeholder="Tên nhân viên giao"
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="ĐT người giao">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.shipper_phone}
                                onChange={e => setFormData({ ...formData, shipper_phone: e.target.value })}
                                disabled={!isEditable}
                            />
                        </FormField>
                        <FormField label="Biển số xe">
                            <input
                                type="text"
                                className="form-input"
                                value={formData.vehicle_no}
                                onChange={e => setFormData({ ...formData, vehicle_no: e.target.value })}
                                placeholder="VD: 30A-12345"
                                disabled={!isEditable}
                            />
                        </FormField>
                    </FormGrid>
                    <FormField label="Ngày giao dự kiến">
                        <input
                            type="date"
                            className="form-input"
                            value={formData.expected_date}
                            onChange={e => setFormData({ ...formData, expected_date: e.target.value })}
                            disabled={!isEditable}
                        />
                    </FormField>
                </FormSection>

                {/* Items Section */}
                {items.length > 0 && (
                    <FormSection title="Chi tiết hàng giao" variant="highlight" color="green">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-2 py-2 text-left w-8">#</th>
                                        <th className="px-2 py-2 text-left">Tên hàng hóa</th>
                                        <th className="px-2 py-2 text-center w-20">ĐVT</th>
                                        <th className="px-2 py-2 text-center w-28">SL đặt</th>
                                        <th className="px-2 py-2 text-center w-28">SL giao</th>
                                        <th className="px-2 py-2 text-left w-48">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-2 py-2 text-slate-500">{index + 1}</td>
                                            <td className="px-2 py-2 font-medium">{item.item_name}</td>
                                            <td className="px-2 py-2 text-center">{item.unit}</td>
                                            <td className="px-2 py-2 text-center font-mono">{item.ordered_qty}</td>
                                            <td className="px-2 py-1">
                                                <input
                                                    type="number"
                                                    className="form-input text-sm py-1 text-center font-mono"
                                                    value={item.delivered_qty}
                                                    onChange={e => handleItemChange(index, 'delivered_qty', Number(e.target.value))}
                                                    max={item.ordered_qty}
                                                    min={0}
                                                    disabled={!isEditable}
                                                />
                                            </td>
                                            <td className="px-2 py-1">
                                                <input
                                                    type="text"
                                                    className="form-input text-sm py-1"
                                                    value={item.notes || ''}
                                                    onChange={e => handleItemChange(index, 'notes', e.target.value)}
                                                    placeholder="Ghi chú..."
                                                    disabled={!isEditable}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </FormSection>
                )}

                <FormSection>
                    <FormField label="Ghi chú giao hàng">
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

// ==================== SALES MODULE PROPS ====================
// ==================== IMPORT COLUMN DEFINITIONS ====================
const SALES_ORDER_IMPORT_COLUMNS: ImportColumnDef[] = [
    { key: 'order_no', label: 'Số đơn hàng', required: true, aliases: ['so don hang', 'so dh', 'order_no', 'order no', 'số đơn hàng'] },
    { key: 'order_date', label: 'Ngày lập', required: true, type: 'date', aliases: ['ngay lap', 'ngay', 'date', 'order_date', 'ngày lập'] },
    { key: 'customer_name', label: 'Khách hàng', required: true, aliases: ['khach hang', 'kh', 'customer', 'customer_name', 'khách hàng'] },
    { key: 'customer_code', label: 'Mã KH', required: false, aliases: ['ma kh', 'customer_code', 'mã kh'] },
    { key: 'description', label: 'Diễn giải', required: false, aliases: ['dien giai', 'mo ta', 'description', 'diễn giải'] },
    { key: 'total_amount', label: 'Giá trị', required: false, type: 'number', aliases: ['gia tri', 'tong tien', 'total', 'amount', 'giá trị'] },
    { key: 'delivery_date', label: 'Ngày giao dự kiến', required: false, type: 'date', aliases: ['ngay giao', 'delivery_date', 'ngày giao'] },
    { key: 'notes', label: 'Ghi chú', required: false, aliases: ['ghi chu', 'notes', 'ghi chú'] },
];

const SALES_INVOICE_IMPORT_COLUMNS: ImportColumnDef[] = [
    { key: 'invoice_no', label: 'Số hóa đơn', required: true, aliases: ['so hoa don', 'so hd', 'invoice_no', 'số hóa đơn'] },
    { key: 'invoice_date', label: 'Ngày HĐ', required: true, type: 'date', aliases: ['ngay hd', 'ngay hoa don', 'date', 'invoice_date', 'ngày hđ'] },
    { key: 'customer_name', label: 'Khách hàng', required: true, aliases: ['khach hang', 'kh', 'customer', 'customer_name', 'khách hàng'] },
    { key: 'customer_tax_code', label: 'MST', required: false, aliases: ['mst', 'ma so thue', 'tax_code', 'customer_tax_code'] },
    { key: 'amount_before_tax', label: 'Tiền hàng', required: false, type: 'number', aliases: ['tien hang', 'amount_before_tax', 'tiền hàng'] },
    { key: 'tax_amount', label: 'Thuế GTGT', required: false, type: 'number', aliases: ['thue gtgt', 'thue', 'tax', 'tax_amount'] },
    { key: 'total_amount', label: 'Tổng tiền', required: false, type: 'number', aliases: ['tong tien', 'total', 'total_amount', 'tổng tiền'] },
    { key: 'notes', label: 'Ghi chú', required: false, aliases: ['ghi chu', 'notes', 'ghi chú'] },
];

interface SalesModuleProps {
    subView?: string;
    printSignal?: number;
    exportSignal?: number;
    importSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (viewId: string, data?: any) => void;
}

// ==================== SALES MODULE ====================
export const SalesModule: React.FC<SalesModuleProps> = ({ subView = 'overview', printSignal = 0, exportSignal = 0, importSignal = 0, onSetHeader, onNavigate }) => {
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const [showOrderModal, setShowOrderModal] = React.useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = React.useState(false);
    const [showCustomerModal, setShowCustomerModal] = React.useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = React.useState(false);
    const [showImportModal, setShowImportModal] = React.useState(false);
    const [selectedRow, setSelectedRow] = React.useState<any>(null);
    const [refreshSignal, setRefreshSignal] = React.useState(0);
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '' });
    const [printRecord, setPrintRecord] = React.useState<any>(null);
    const lastPrintSignalRef = React.useRef(0);
    const lastExportSignalRef = useRef(exportSignal);
    const lastImportSignalRef = useRef(importSignal);
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

            if (subView === 'sales_report') {
                alert('Vui lòng sử dụng chức năng Xuất Excel cho báo cáo.');
                return;
            }

            if (!selectedRow) {
                alert('Vui lòng chọn một bản ghi từ danh sách trước khi in.');
                return;
            }

            const record = {
                voucher_date: selectedRow.order_date || selectedRow.invoice_date || selectedRow.payment_date,
                voucher_no: selectedRow.order_no || selectedRow.invoice_no || selectedRow.payment_no,
                customer_name: selectedRow.customer_name || '',
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

            const importableViews = ['sales_order', 'sales_invoice'];
            if (!importableViews.includes(subView)) {
                alert('Chức năng nhập Excel hỗ trợ cho: Đơn hàng bán, Hóa đơn bán hàng.\nVui lòng chuyển sang tab tương ứng.');
                return;
            }
            setShowImportModal(true);
        }
    }, [importSignal, subView]);

    // Export current tab data to Excel
    const handleExport = useCallback(() => {
        if (subView === 'overview' || subView === 'sales_overview' || subView === 'sales_report') {
            alert('Vui lòng chọn một danh sách cụ thể để xuất Excel.');
            return;
        }

        if (currentTabData.length === 0) {
            alert('Không có dữ liệu để xuất.');
            return;
        }

        const exportConfigs: Record<string, { headers: Record<string, string>; fileName: string }> = {
            sales_order: {
                headers: { order_no: 'Số đơn hàng', order_date: 'Ngày lập', customer_name: 'Khách hàng', description: 'Diễn giải', total_amount: 'Giá trị', status: 'Trạng thái' },
                fileName: 'don_hang_ban'
            },
            sales_invoice: {
                headers: { invoice_no: 'Số hóa đơn', invoice_date: 'Ngày HĐ', customer_name: 'Khách hàng', customer_tax_code: 'MST', amount_before_tax: 'Tiền hàng', tax_amount: 'Thuế GTGT', total_amount: 'Tổng tiền', payment_status: 'Thanh toán' },
                fileName: 'hoa_don_ban_hang'
            },
            sales_service: {
                headers: { invoice_no: 'Số hóa đơn', invoice_date: 'Ngày HĐ', customer_name: 'Khách hàng', customer_tax_code: 'MST', amount_before_tax: 'Tiền hàng', tax_amount: 'Thuế GTGT', total_amount: 'Tổng tiền' },
                fileName: 'hoa_don_dich_vu_ban'
            },
            sales_return: {
                headers: { return_no: 'Số phiếu', return_date: 'Ngày trả', original_invoice_no: 'HĐ gốc', customer_name: 'Khách hàng', reason: 'Lý do', return_amount: 'Giá trị trả' },
                fileName: 'tra_hang_kh'
            },
            sales_payment: {
                headers: { payment_no: 'Số chứng từ', payment_date: 'Ngày thu', customer_name: 'Khách hàng', invoice_no: 'HĐ thanh toán', payment_method: 'Hình thức', amount: 'Số tiền thu' },
                fileName: 'thu_tien_kh'
            },
            customer_list: {
                headers: { partner_code: 'Mã KH', partner_name: 'Tên khách hàng', tax_code: 'Mã số thuế', address: 'Địa chỉ', phone: 'Điện thoại', email: 'Email', contact_person: 'Người liên hệ' },
                fileName: 'danh_sach_khach_hang'
            },
            sales_delivery: {
                headers: { delivery_no: 'Số phiếu giao', delivery_date: 'Ngày giao', order_no: 'Đơn hàng', customer_name: 'Khách hàng', delivery_address: 'Địa chỉ giao', shipper_name: 'Người giao', status: 'Trạng thái' },
                fileName: 'phieu_giao_hang'
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
            if (subView === 'sales_order') {
                const res = await salesService.importOrders(importedData);
                const data = res.data;
                alert(`Nhập đơn hàng thành công!\n- Thêm mới: ${data.inserted || 0}\n- Bỏ qua: ${data.skipped || 0}`);
            } else if (subView === 'sales_invoice') {
                const res = await salesService.importInvoices(importedData);
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
        if (subView === 'sales_order') return SALES_ORDER_IMPORT_COLUMNS;
        if (subView === 'sales_invoice') return SALES_INVOICE_IMPORT_COLUMNS;
        return SALES_ORDER_IMPORT_COLUMNS;
    };

    const getImportTitle = () => {
        if (subView === 'sales_order') return 'Nhập Đơn hàng bán từ Excel';
        if (subView === 'sales_invoice') return 'Nhập Hóa đơn bán hàng từ Excel';
        return 'Nhập dữ liệu từ Excel';
    };

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];

            if (subView === 'sales_order') {
                actions.push({
                    label: 'Tạo đơn hàng',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowOrderModal(true); },
                    primary: true
                });
            } else if (subView === 'sales_invoice') {
                actions.push({
                    label: 'Lập hóa đơn',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowInvoiceModal(true); },
                    primary: true
                });
            } else if (subView === 'customer_list') {
                actions.push({
                    label: 'Thêm KH',
                    icon: 'person_add',
                    onClick: () => setShowCustomerModal(true),
                    primary: true
                });
            } else if (subView === 'sales_delivery') {
                actions.push({
                    label: 'Lập phiếu giao',
                    icon: 'local_shipping',
                    onClick: () => { setSelectedRow(null); setShowDeliveryModal(true); },
                    primary: true
                });
                if (selectedRow) {
                    actions.push({
                        label: 'Xem chi tiết',
                        icon: 'visibility',
                        onClick: () => setShowDeliveryModal(true)
                    });
                    if (selectedRow.status === 'PENDING') {
                        actions.push({
                            label: 'Bắt đầu giao',
                            icon: 'play_arrow',
                            onClick: () => setShowDeliveryModal(true)
                        });
                    }
                    if (selectedRow.status === 'SHIPPING') {
                        actions.push({
                            label: 'Xác nhận đã giao',
                            icon: 'check_circle',
                            onClick: () => setShowDeliveryModal(true)
                        });
                    }
                }
            }

            if (selectedRow && ['sales_order', 'sales_invoice', 'sales_return', 'sales_payment'].includes(subView)) {
                actions.push({
                    label: 'Xem chi tiết',
                    icon: 'visibility',
                    onClick: () => {
                        if (subView === 'sales_order') {
                            setShowOrderModal(true);
                        } else if (subView === 'sales_invoice') {
                            setShowInvoiceModal(true);
                        }
                    }
                });
                actions.push({
                    label: 'In chứng từ',
                    icon: 'print',
                    onClick: () => setShowPrintPreview(true)
                });
            }

            onSetHeader({
                title: getModuleTitle(),
                icon: 'storefront',
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
                case 'sales_order': await salesService.deleteOrder(selectedRow.id); break;
                case 'sales_invoice': await salesService.deleteInvoice(selectedRow.id); break;
                case 'sales_return': await salesService.deleteReturn(selectedRow.id); break;
                case 'sales_payment': await salesService.deletePayment(selectedRow.id); break;
                case 'sales_delivery': await salesService.deleteDelivery(selectedRow.id); break;
                case 'customer_list': await masterDataService.deletePartner(selectedRow.id || selectedRow.partner_code); break;
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
            case 'sales_order': return 'Đơn hàng bán';
            case 'sales_invoice': return 'Hóa đơn Bán hàng';
            case 'sales_service': return 'Hóa đơn Dịch vụ';
            case 'sales_return': return 'Trả hàng';
            case 'sales_payment': return 'Thu tiền Khách hàng';
            case 'sales_delivery': return 'Giao hàng';
            case 'customer_list': return 'Danh mục Khách hàng';
            case 'sales_report': return 'Báo cáo Bán hàng';
            default: return 'Phân hệ Bán hàng';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Module Overview - Default Landing Page */}
            {(subView === 'overview' || subView === 'sales_overview') && (
                <ModuleOverview
                    title={MODULE_CONFIGS.sales.title}
                    description={MODULE_CONFIGS.sales.description}
                    icon={MODULE_CONFIGS.sales.icon}
                    iconColor={MODULE_CONFIGS.sales.iconColor}
                    workflow={MODULE_CONFIGS.sales.workflow}
                    features={MODULE_CONFIGS.sales.features}
                    onNavigate={onNavigate}
                    stats={[
                        { icon: 'shopping_cart', label: 'Đơn hàng tháng', value: '-', color: 'blue' },
                        { icon: 'receipt', label: 'Doanh thu tháng', value: '-', color: 'green' },
                        { icon: 'group', label: 'Khách hàng mới', value: '-', color: 'amber' },
                        { icon: 'check_circle', label: 'Trạng thái', value: 'Bình thường', color: 'green' },
                    ]}
                />
            )}

            <div className={`flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 relative ${(subView === 'overview' || subView === 'sales_overview') ? 'hidden' : ''}`}>
                {subView === 'sales_order' && <OrderList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'sales_invoice' && <InvoiceList onSelect={setSelectedRow} refreshSignal={refreshSignal} type="INVOICE" onDataLoaded={setCurrentTabData} />}
                {subView === 'sales_service' && <InvoiceList onSelect={setSelectedRow} refreshSignal={refreshSignal} type="SERVICE" onDataLoaded={setCurrentTabData} />}
                {subView === 'sales_return' && <ReturnList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'sales_payment' && <PaymentList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'customer_list' && <CustomerList onSelectionChange={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
                {subView === 'sales_report' && <SalesReportView />}
                {subView === 'sales_delivery' && <DeliveryList onSelect={setSelectedRow} refreshSignal={refreshSignal} onDataLoaded={setCurrentTabData} />}
            </div>

            {showOrderModal && (
                <OrderFormModal
                    onClose={() => { setShowOrderModal(false); setRefreshSignal(s => s + 1); }}
                    initialData={selectedRow}
                />
            )}
            {showInvoiceModal && (
                <InvoiceFormModal
                    onClose={() => { setShowInvoiceModal(false); setRefreshSignal(s => s + 1); }}
                    initialData={selectedRow}
                />
            )}
            {showCustomerModal && <CustomerFormModal onClose={() => { setShowCustomerModal(false); setRefreshSignal(s => s + 1); }} />}
            {showDeliveryModal && (
                <DeliveryFormModal
                    onClose={() => { setShowDeliveryModal(false); setRefreshSignal(s => s + 1); }}
                    initialData={selectedRow}
                    onNavigate={onNavigate}
                />
            )}

            {/* Print Preview Modal */}
            {showPrintPreview && printRecord && (
                <PrintPreviewModal
                    record={printRecord}
                    view="SALES_INVOICE"
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
                    description={subView === 'sales_order'
                        ? 'Nhập danh sách đơn hàng bán từ file Excel. Các đơn hàng trùng số sẽ được bỏ qua.'
                        : 'Nhập danh sách hóa đơn bán hàng từ file Excel. Các hóa đơn trùng số sẽ được bỏ qua.'}
                    templateFileName={subView === 'sales_order' ? 'mau_don_hang_ban' : 'mau_hoa_don_ban_hang'}
                />
            )}
        </div>
    );
};
