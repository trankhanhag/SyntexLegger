import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { DateInput } from './DateInput';
import { salesService, masterDataService, contractService, projectService, taxService } from '../api';
import { type RibbonAction } from './Ribbon';
import { formatDateVN, toInputDateValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';

// --- SALES ORDER ---
const SalesOrderList = ({ onSelect, refreshSignal }: { onSelect: (rec: any) => void, refreshSignal?: number }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getOrders()
            .then(res => setOrders(res.data))
            .catch(err => console.error("Fetch orders failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'date', headerName: 'Ngày ĐH', width: 'w-32', editable: true, type: 'date', align: 'center' },
        { field: 'doc_no', headerName: 'Số ĐH', width: 'w-24', editable: true },
        { field: 'customer', headerName: 'Khách hàng', width: 'w-64', editable: true },
        { field: 'description', headerName: 'Diễn giải', width: 'w-64', editable: true },
        { field: 'amount', headerName: 'Giá trị ĐH', width: 'w-32', editable: true, type: 'number', align: 'right', renderCell: (val: any) => new Intl.NumberFormat('vi-VN').format(val) },
        { field: 'status', headerName: 'Trạng thái', width: 'w-32', editable: true, align: 'center', renderCell: (val: any) => <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{val}</span> },
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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={orders} columns={columns} setData={setOrders} onSelectionChange={onSelect} />
        </div>
    );
};

// --- SALES INVOICE ---
const SalesInvoiceList = ({ onSelect, onShowDetail, refreshSignal }: { onSelect: (rec: any) => void, onShowDetail: () => void, refreshSignal?: number }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getInvoices()
            .then(res => {
                // Enrich data with Traceability (Mock logic for Total)
                const enriched = res.data.map((inv: any) => ({
                    ...inv,
                    // Mock items for breakdown visualization
                    items: [
                        { name: 'Sản phẩm A', unit: 'Cái', qty: 2, price: inv.total * 0.4, amount: inv.total * 0.8 },
                        { name: 'Dịch vụ B', unit: 'Giờ', qty: 10, price: inv.total * 0.02, amount: inv.total * 0.2 }
                    ],
                    total: {
                        value: inv.total,
                        formula: `${new Intl.NumberFormat('vi-VN').format(inv.total / 1.1)} * 1.1 (VAT 10%)`,
                        source: {
                            type: 'link',
                            target: `#invoice-detail-${inv.id}`, // Using hash for prototype
                            label: `Chi tiết HĐ ${inv.doc_no}`
                        }
                    }
                }));
                setInvoices(enriched);
            })
            .catch(err => console.error("Fetch invoices failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    // Handle Hash Navigation (Prototype for Traceability)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#invoice-detail-')) {
                const id = hash.replace('#invoice-detail-', '');
                const target = invoices.find(i => i.id == id || i.doc_no == id);
                if (target) {
                    onSelect(target);
                    onShowDetail();
                    // Clear hash to prevent re-triggering on re-renders and allow re-clicking
                    history.replaceState(null, '', ' ');
                }
            }
        };

        // Check on mount and update
        handleHashChange();

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [invoices, onSelect, onShowDetail]);

    const columns: ColumnDef[] = [
        { field: 'date', headerName: 'Ngày CT', width: 'w-32', editable: true, type: 'date', align: 'center' },
        { field: 'doc_no', headerName: 'Số CT', width: 'w-24', editable: true },
        { field: 'customer', headerName: 'Khách hàng', width: 'w-64', editable: true },
        { field: 'description', headerName: 'Diễn giải', width: 'w-64', editable: true },
        { field: 'total', headerName: 'Tổng tiền', width: 'w-32', editable: true, type: 'number', align: 'right', renderCell: (val: any) => <span className="font-bold text-blue-600 cursor-help" title="Click để xem nguồn">{new Intl.NumberFormat('vi-VN').format(Number(val))}</span> },
        { field: 'contract_code', headerName: 'Mã Hợp đồng', width: 'w-32', editable: true },
        { field: 'project_code', headerName: 'Mã Dự án', width: 'w-32', editable: true },
        { field: 'dim1', headerName: 'Mã TK 1', width: 'w-24', editable: true },
        { field: 'dim2', headerName: 'Mã TK 2', width: 'w-24', editable: true },
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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={invoices} columns={columns} setData={setInvoices} onSelectionChange={onSelect} />
        </div>
    );
};

// --- SALES RETURN ---
const SalesReturnList = ({ onSelect, refreshSignal }: { onSelect: (rec: any) => void, refreshSignal?: number }) => {
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getReturns()
            .then(res => setReturns(res.data))
            .catch(err => console.error("Fetch returns failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'date', headerName: 'Ngày CT', width: 'w-32', editable: true, type: 'date', align: 'center' },
        { field: 'doc_no', headerName: 'Số CT', width: 'w-24', editable: true },
        { field: 'customer', headerName: 'Khách hàng', width: 'w-64', editable: true },
        { field: 'description', headerName: 'Lý do trả', width: 'w-64', editable: true },
        { field: 'amount', headerName: 'Giá trị trả lại', width: 'w-32', editable: true, type: 'number', align: 'right', renderCell: (val: any) => <span className="font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(val)}</span> },
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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={returns} columns={columns} setData={setReturns} onSelectionChange={onSelect} />
        </div>
    );
};

// --- CUSTOMER PAYMENT ---
const SalesPaymentList = ({ onSelect, refreshSignal }: { onSelect: (rec: any) => void, refreshSignal?: number }) => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        salesService.getPayments()
            .then(res => setPayments(res.data))
            .catch(err => console.error("Fetch payments failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'date', headerName: 'Ngày CT', width: 'w-32', editable: true, type: 'date', align: 'center' },
        { field: 'doc_no', headerName: 'Số CT', width: 'w-24', editable: true },
        { field: 'customer', headerName: 'Khách hàng', width: 'w-64', editable: true },
        { field: 'description', headerName: 'Diễn giải', width: 'w-64', editable: true },
        { field: 'amount', headerName: 'Số tiền thu', width: 'w-32', editable: true, type: 'number', align: 'right', renderCell: (val: any) => <span className="font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(val)}</span> },
        { field: 'method', headerName: 'HTTT', width: 'w-32', editable: true },
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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <ModuleView data={payments} columns={columns} setData={setPayments} onSelectionChange={onSelect} />
        </div>
    );
};

// --- SALES REPORT ---
const SalesReportView = () => (
    <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Báo cáo Bán hàng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4 text-blue-600">
                    <span className="material-symbols-outlined text-3xl">bar_chart</span>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Doanh số theo Khách hàng</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4 h-12">Tổng hợp doanh số bán ra chi tiết theo từng khách hàng trong kỳ.</p>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">Xem báo cáo &rarr;</button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4 text-green-600">
                    <span className="material-symbols-outlined text-3xl">pie_chart</span>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Doanh số theo Mặt hàng</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4 h-12">Phân tích tỷ trọng doanh thu của các mặt hàng bán chạy nhất.</p>
                <button className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline">Xem báo cáo &rarr;</button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4 text-purple-600">
                    <span className="material-symbols-outlined text-3xl">show_chart</span>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Công nợ Phải thu</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4 h-12">Theo dõi tình hình công nợ chi tiết và tuổi nợ của khách hàng.</p>
                <button className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline">Xem báo cáo &rarr;</button>
            </div>
        </div>
    </div>
);


// Generic View Component to reduce duplication
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
                isCoreEditable={true}
                onCellChange={handleCellChange}
                onSelectionChange={onSelectionChange}
                minRows={0}
                emptyMessage="Không có dữ liệu"
            />
        </div>
    );
};

// --- CUSTOMER LIST ---
const CustomerList = ({ onSelectionChange, refreshSignal }: { onSelectionChange: (rec: any) => void, refreshSignal?: number }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        masterDataService.getPartners()
            .then((res: any) => setCustomers(res.data))
            .catch((err: any) => console.error("Fetch customers failed:", err))
            .finally(() => setLoading(false));
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'partner_code', headerName: 'Mã KH', width: 'w-32', editable: true },
        { field: 'partner_name', headerName: 'Tên Khách hàng', width: 'flex-1', editable: true },
        { field: 'tax_code', headerName: 'Mã số thuế', width: 'w-32', editable: true },
        { field: 'address', headerName: 'Địa chỉ', width: 'w-64', editable: true },
        { field: 'email', headerName: 'Email', width: 'w-48', editable: true },
        { field: 'phone', headerName: 'Điện thoại', width: 'w-32', editable: true },
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

interface RevenueModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
}

export const RevenueModule: React.FC<RevenueModuleProps> = ({ subView = 'receipt', printSignal = 0, onSetHeader }) => {
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const [showOrderModal, setShowOrderModal] = React.useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = React.useState(false);
    const [showCustomerModal, setShowCustomerModal] = React.useState(false);
    const [selectedRow, setSelectedRow] = React.useState<any>(null);
    const [refreshSignal, setRefreshSignal] = React.useState(0);


    React.useEffect(() => {
        if (printSignal > 0 && subView !== 'report') {
            if (selectedRow) {
                setShowPrintPreview(true);
            } else {
                alert("Vui lòng chọn một bản ghi từ danh sách trước khi thực hiện In.");
            }
        }
    }, [printSignal, subView, selectedRow]);

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];
            if (['order', 'invoice', 'service'].includes(subView)) {
                actions.push({
                    label: subView === 'order' ? 'Lập đơn hàng mới' : 'Lập hóa đơn mới',
                    icon: 'add_circle',
                    onClick: () => {
                        if (subView === 'order') setShowOrderModal(true);
                        else setShowInvoiceModal(true);
                    },
                    primary: true
                });
            } else if (subView === 'customer' || subView === 'partner') {
                actions.push({
                    label: 'Thêm Khách hàng',
                    icon: 'person_add',
                    onClick: () => setShowCustomerModal(true),
                    primary: true
                });
            }

            onSetHeader({
                title: getModuleTitle(),
                icon: 'point_of_sale',
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
                case 'order': await salesService.deleteOrder(selectedRow.id); break;
                case 'invoice':
                case 'service': await salesService.deleteInvoice(selectedRow.id); break;
                case 'return': await salesService.deleteReturn(selectedRow.id); break;
                case 'payment':
                case 'receipt': await salesService.deletePayment(selectedRow.id); break;
                case 'customer':
                case 'partner': await masterDataService.deletePartner(selectedRow.id || selectedRow.partner_code); break;
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
            case 'order': return 'Bs Đơn đặt hàng';
            case 'invoice':
            case 'service': return 'Thu phí, Lệ phí & SXKD';
            case 'return': return 'Giảm trừ doanh thu';
            case 'payment':
            case 'receipt': return 'Thu tiền khách hàng';
            case 'report': return 'Báo cáo thu sự nghiệp';
            case 'customer':
            case 'partner': return 'Danh sách Khách hàng / Đối tượng';
            default: return 'Quản lý Thu Sự nghiệp';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">


            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 relative">
                {subView === 'order' && <SalesOrderList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {(subView === 'invoice' || subView === 'service') && <SalesInvoiceList onSelect={setSelectedRow} onShowDetail={() => setShowPrintPreview(true)} refreshSignal={refreshSignal} />}
                {subView === 'return' && <SalesReturnList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {(subView === 'payment' || subView === 'receipt') && <SalesPaymentList onSelect={setSelectedRow} refreshSignal={refreshSignal} />}
                {subView === 'report' && <SalesReportView />}
                {(subView === 'customer' || subView === 'partner') && <CustomerList onSelectionChange={setSelectedRow} refreshSignal={refreshSignal} />}

                {showOrderModal && (
                    <SalesOrderFormModal onClose={() => setShowOrderModal(false)} />
                )}

                {showInvoiceModal && (
                    <SalesInvoiceFormModal onClose={() => setShowInvoiceModal(false)} />
                )}

                {showCustomerModal && (
                    <CustomerFormModal onClose={() => setShowCustomerModal(false)} />
                )}

                {/* Professional Print Preview Modal */}
                {showPrintPreview && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10 no-print">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                                <h3 className="font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600">print_connect</span>
                                    Chế độ Xem trước bản in (In chứng từ)
                                </h3>
                                <button
                                    onClick={() => setShowPrintPreview(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-12 bg-slate-200 dark:bg-slate-950 flex justify-center custom-scrollbar">
                                {/* The Actual Printed Page - Makeup */}
                                <div className="bg-white text-slate-900 w-[21cm] min-h-[29.7cm] p-16 shadow-2xl relative printable-area font-serif">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h2 className="font-bold text-lg">CÔNG TY TNHH SYNTEX</h2>
                                            <p className="text-sm">Địa chỉ: 123 Đường ABC, Hà Nội</p>
                                            <p className="text-sm">Mã số thuế: 0101234567</p>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="font-bold text-2xl text-blue-800 uppercase">
                                                {subView === 'order' ? 'Đơn đặt hàng' : subView === 'invoice' ? 'Hóa đơn GTGT' : 'Chứng từ'}
                                            </h2>
                                            <p className="text-sm italic">Số: {selectedRow?.doc_no || '---'}</p>
                                            <p className="text-sm italic">Ngày: {formatDateVN(selectedRow?.date || selectedRow?.doc_date) || '---'}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-b border-slate-800 py-4 mb-8">
                                        <div className="grid grid-cols-[150px,1fr] gap-y-2 text-sm">
                                            <div className="font-bold">Khách hàng:</div>
                                            <div>{selectedRow?.customer || selectedRow?.partner_name || '---'}</div>
                                            <div className="font-bold">Địa chỉ:</div>
                                            <div>{selectedRow?.address || '---'}</div>
                                            <div className="font-bold">Mã số thuế:</div>
                                            <div>{selectedRow?.tax_code || '---'}</div>
                                            <div className="font-bold">Diễn giải:</div>
                                            <div>{selectedRow?.description || '---'}</div>
                                        </div>
                                    </div>

                                    <table className="w-full text-sm border-collapse border border-slate-800 mb-8">
                                        <thead>
                                            <tr className="bg-slate-50 uppercase text-[10px]">
                                                <th className="border border-slate-800 p-2 w-10">STT</th>
                                                <th className="border border-slate-800 p-2 text-left">Tên hàng hóa, dịch vụ</th>
                                                <th className="border border-slate-800 p-2 w-16">ĐVT</th>
                                                <th className="border border-slate-800 p-2 w-16">SL</th>
                                                <th className="border border-slate-800 p-2 w-24 text-right">Đơn giá</th>
                                                <th className="border border-slate-800 p-2 w-28 text-right">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedRow?.items && selectedRow.items.length > 0 ? (
                                                selectedRow.items.map((item: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="border border-slate-800 p-2 text-center">{i + 1}</td>
                                                        <td className="border border-slate-800 p-2">{item.name}</td>
                                                        <td className="border border-slate-800 p-2 text-center">{item.unit}</td>
                                                        <td className="border border-slate-800 p-2 text-center">{item.qty}</td>
                                                        <td className="border border-slate-800 p-2 text-right">{new Intl.NumberFormat('vi-VN').format(item.price)}</td>
                                                        <td className="border border-slate-800 p-2 text-right">{new Intl.NumberFormat('vi-VN').format(item.amount)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td className="border border-slate-800 p-2 text-center">1</td>
                                                    <td className="border border-slate-800 p-2">{selectedRow?.description || '---'}</td>
                                                    <td className="border border-slate-800 p-2 text-center">---</td>
                                                    <td className="border border-slate-800 p-2 text-center">1</td>
                                                    <td className="border border-slate-800 p-2 text-right">{new Intl.NumberFormat('vi-VN').format(selectedRow?.amount || 0)}</td>
                                                    <td className="border border-slate-800 p-2 text-right">{new Intl.NumberFormat('vi-VN').format(selectedRow?.amount || 0)}</td>
                                                </tr>
                                            )}
                                            {Array.from({ length: Math.max(0, 8 - (selectedRow?.items?.length || 1)) }).map((_, i) => (
                                                <tr key={`empty-${i}`} className="h-8">
                                                    <td className="border border-slate-800 p-2"></td>
                                                    <td className="border border-slate-800 p-2"></td>
                                                    <td className="border border-slate-800 p-2"></td>
                                                    <td className="border border-slate-800 p-2"></td>
                                                    <td className="border border-slate-800 p-2"></td>
                                                    <td className="border border-slate-800 p-2"></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="font-bold">
                                                <td colSpan={5} className="border border-slate-800 p-2 text-right uppercase"> Cộng tiền hàng:</td>
                                                <td className="border border-slate-800 p-2 text-right">{new Intl.NumberFormat('vi-VN').format(selectedRow?.amount || 0)}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan={5} className="border border-slate-800 p-2 text-right font-bold uppercase">Thuế suất GTGT (10%):</td>
                                                <td className="border border-slate-800 p-2 text-right font-bold">{new Intl.NumberFormat('vi-VN').format((selectedRow?.tax || (selectedRow?.amount || 0) * 0.1))}</td>
                                            </tr>
                                            <tr className="text-lg">
                                                <td colSpan={5} className="border border-slate-800 p-2 text-right font-bold uppercase text-blue-900 bg-slate-50">Tổng cộng thanh toán:</td>
                                                <td className="border border-slate-800 p-2 text-right font-bold text-blue-900 bg-slate-50">{new Intl.NumberFormat('vi-VN').format(selectedRow?.total || (selectedRow?.amount || 0) * 1.1)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <div className="text-sm italic mb-12">
                                        <span className="font-bold">Số tiền viết bằng chữ: </span>
                                        Năm mươi lăm triệu đồng chẵn./.
                                    </div>

                                    <div className="mt-16 grid grid-cols-2 text-center text-sm">
                                        <div className="italic">
                                            <span className="font-bold uppercase block mt-2">Người mua hàng</span>
                                            (Ký, ghi rõ họ tên)
                                        </div>
                                        <div className="italic">
                                            <span className="font-bold uppercase block mt-2">Người bán hàng</span>
                                            (Ký, đóng dấu, ghi rõ họ tên)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end gap-3 no-print">
                                <button
                                    onClick={() => setShowPrintPreview(false)}
                                    className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold"
                                >
                                    Đóng
                                </button>
                                <button
                                    className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2"
                                    onClick={() => window.print()}
                                >
                                    <span className="material-symbols-outlined text-[18px]">print</span>
                                    Thực hiện In ngay
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const Modal = ({ title, onClose, widthClass = "max-w-4xl", children }: { title: string, onClose: () => void, widthClass?: string, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} sizeClass={widthClass} icon="edit_document" bodyClass="bg-white dark:bg-slate-900">
        {children}
    </FormModal>
);

const SalesOrderFormModal = ({ onClose }: { onClose: () => void }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [custRes] = await Promise.all([
                    masterDataService.getPartners(),
                ]);
                setCustomers(custRes.data);
            } catch (err) {
                console.error("Load master data for SO failed:", err);
            } finally {
                setLoading(false);
            }
        };
        loadMasterData();
    }, []);

    return (
        <Modal title="Lập Đơn đặt hàng (Sales Order) mới" onClose={onClose} widthClass="max-w-[90vw] min-w-[80vw]">
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <label className="block">
                                <span className="form-label">Khách hàng</span>
                                <select className="form-select">
                                    <option value="">-- Chọn khách hàng --</option>
                                    {customers.map(c => (
                                        <option key={c.partner_code} value={c.partner_code}>{c.partner_name}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="space-y-4">
                            <label className="block">
                                <span className="form-label">Ngày đơn hàng</span>
                                <DateInput
                                    className="form-input"
                                    value={toInputDateValue()}
                                    onChange={() => { }} // No-op for demo
                                />
                            </label>
                        </div>
                        <div className="space-y-4">
                            <label className="block">
                                <span className="form-label">Số đơn hàng</span>
                                <input type="text" className="form-input font-bold text-blue-600" placeholder="SO-2024-..." />
                            </label>
                        </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-[13px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left">
                                <tr>
                                    <th className="px-3 py-2 font-bold text-slate-500 uppercase text-[10px]">Tên hàng hóa/dịch vụ</th>
                                    <th className="px-3 py-2 font-bold text-slate-500 uppercase text-[10px] w-24 text-center">ĐVT</th>
                                    <th className="px-3 py-2 font-bold text-slate-500 uppercase text-[10px] w-28 text-right">SL</th>
                                    <th className="px-3 py-2 font-bold text-slate-500 uppercase text-[10px] w-36 text-right">Đơn giá</th>
                                    <th className="px-3 py-2 font-bold text-slate-500 uppercase text-[10px] w-36 text-right">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {[1, 2, 3].map((i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none focus:text-blue-600" placeholder="Chọn mặt hàng..." /></td>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none text-center" placeholder="..." /></td>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none text-right font-mono" defaultValue="0" /></td>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none text-right font-mono" defaultValue="0" /></td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-400">0</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-start pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="w-1/2">
                            <label className="block">
                                <span className="form-label">Ghi chú / Điều khoản giao hàng</span>
                                <textarea rows={3} className="form-textarea" placeholder="Nhập ghi chú chi tiết cho đơn hàng này..." />
                            </label>
                        </div>
                        <div className="w-1/3 space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Tiền hàng:</span>
                                <span className="font-mono font-bold">0</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">VAT (10%):</span>
                                <span className="font-mono font-bold">0</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-blue-600 font-black uppercase text-xs">Tổng cộng:</span>
                                <span className="font-black text-blue-600 dark:text-blue-400 font-mono text-xl">0</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button onClick={onClose} className="form-button-secondary">Hủy bỏ</button>
                        <button className="form-button-primary flex items-center gap-2">
                            <span className="material-symbols-outlined">save</span>
                            Lưu đơn hàng
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const SalesInvoiceFormModal = ({ onClose }: { onClose: () => void }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [custRes, contractRes, projectRes] = await Promise.all([
                    masterDataService.getPartners(),
                    contractService.getContracts('sales'),
                    projectService.getProjects()
                ]);
                setCustomers(custRes.data);
                setContracts(contractRes.data);
                setProjects(projectRes.data);
            } catch (err) {
                console.error("Load master data for Invoice failed:", err);
            } finally {
                setLoading(false);
            }
        };
        loadMasterData();
    }, []);

    return (
        <Modal title="Lập Hóa đơn bán hàng mới" onClose={onClose} widthClass="max-w-[90vw] min-w-[80vw]">
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <label className="col-span-2 block">
                            <span className="form-label">Khách hàng / Đối tác</span>
                            <select className="form-select">
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => (
                                    <option key={c.partner_code} value={c.partner_code}>{c.partner_name} ({c.tax_code})</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="form-label">Ngày hóa đơn</span>
                            <DateInput
                                className="form-input"
                                value={toInputDateValue()}
                                onChange={() => { }}
                            />
                        </label>
                        <label className="block">
                            <span className="form-label">Số hóa đơn</span>
                            <input type="text" className="form-input font-bold text-red-600" placeholder="000123..." />
                        </label>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <label className="block">
                            <span className="form-label">Mã hợp đồng</span>
                            <select className="form-select">
                                <option value="">-- Không có --</option>
                                {contracts.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="form-label">Mã Dự án</span>
                            <select className="form-select">
                                <option value="">-- Không có --</option>
                                {projects.map(p => (
                                    <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="chkStock"
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            defaultChecked
                        />
                        <label htmlFor="chkStock" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                            Kiêm phiếu xuất kho
                        </label>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left">
                                <tr>
                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-slate-500">Mã hàng / Tên hàng</th>
                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-slate-500 w-20 text-center">ĐVT</th>
                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-slate-500 w-20 text-right">SL</th>
                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-slate-500 w-28 text-right">Đơn giá</th>
                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-slate-500 w-32 text-right">Thành tiền</th>
                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-purple-600 w-28 text-right bg-purple-50 dark:bg-purple-900/10 border-l border-purple-100 dark:border-purple-800">Giá vốn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {[1, 2, 3, 4].map((i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none focus:text-blue-600" /></td>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none text-center" /></td>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none text-right font-mono" defaultValue="0" /></td>
                                        <td className="px-3 py-2"><input className="w-full bg-transparent outline-none text-right font-mono" defaultValue="0" /></td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-400">0</td>
                                        <td className="px-3 py-2 bg-purple-50/30 dark:bg-purple-900/5 border-l border-slate-100 dark:border-slate-800"><input className="w-full bg-transparent outline-none text-right font-mono text-purple-700 dark:text-purple-400" placeholder="0" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-10 pt-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-5 border border-slate-100 dark:border-slate-800 shadow-inner">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiền hàng</span>
                            <span className="text-sm font-bold font-mono">0</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VAT (10%)</span>
                            <span className="text-sm font-bold font-mono">0</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Tổng cộng</span>
                            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">0</span>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button onClick={onClose} className="form-button-secondary">Đóng</button>
                        <button
                            onClick={() => {
                                // Mock Save Logic
                                const isInventory = (document.getElementById('chkStock') as HTMLInputElement).checked;
                                alert(`Lưu hóa đơn thành công! \nKiêm phiếu xuất kho: ${isInventory ? 'Có' : 'Không'}`);
                                onClose();
                            }}
                            className="form-button-primary bg-red-600 hover:bg-red-700 flex items-center gap-2 uppercase text-xs tracking-wider">
                            <span className="material-symbols-outlined">print</span>
                            Lưu & In Hóa đơn
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const CustomerFormModal = ({ onClose }: { onClose: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [taxCode, setTaxCode] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // Tax Check State
    const [taxStatus, setTaxStatus] = useState<'IDLE' | 'CHECKING' | 'VALID' | 'INVALID'>('IDLE');
    const [taxMessage, setTaxMessage] = useState('');

    const handleTaxCheck = async () => {
        if (!taxCode || taxCode.length < 10) return;
        setTaxStatus('CHECKING');
        setTaxMessage('Đang kiểm tra...');
        try {
            const res = await taxService.lookupGST(taxCode);
            const data = res.data;
            if (data && (data.code === '00' || data.id)) {
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
        if (!name || !code) return alert('Vui lòng nhập tên và mã khách hàng');
        setLoading(true);
        try {
            await masterDataService.createPartner({
                partner_name: name,
                partner_code: code,
                tax_code: taxCode,
                address: address,
                phone: phone,
                email: email,
                type: 'CUSTOMER'
            });
            alert('Lưu khách hàng thành công!');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra khi lưu khách hàng');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Thêm Khách hàng mới" onClose={onClose} widthClass="max-w-2xl">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="form-label">Mã Khách hàng *</span>
                        <input
                            className="form-input"
                            placeholder="KH..."
                            value={code} onChange={e => setCode(e.target.value)}
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
                                placeholder="01..."
                                value={taxCode} onChange={e => setTaxCode(e.target.value)}
                                onBlur={handleTaxCheck}
                            />
                            {taxStatus === 'VALID' && <span className="absolute right-3 top-2 material-symbols-outlined text-green-600 text-[18px]">check_circle</span>}
                            {taxStatus === 'INVALID' && <span className="absolute right-3 top-2 material-symbols-outlined text-red-500 text-[18px]">error</span>}
                        </div>
                    </label>
                </div>
                <label className="block">
                    <span className="form-label">Tên công ty / Cá nhân *</span>
                    <input
                        className="form-input"
                        placeholder="Công ty TNHH..."
                        value={name} onChange={e => setName(e.target.value)}
                    />
                </label>
                <label className="block">
                    <span className="form-label">Địa chỉ</span>
                    <input
                        className="form-input"
                        placeholder="Số..., Đường..., Phường..."
                        value={address} onChange={e => setAddress(e.target.value)}
                    />
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="form-label">Điện thoại</span>
                        <input
                            className="form-input"
                            value={phone} onChange={e => setPhone(e.target.value)}
                        />
                    </label>
                    <label className="block">
                        <span className="form-label">Email</span>
                        <input
                            className="form-input"
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                    </label>
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary" disabled={loading}>Hủy</button>
                    <button onClick={handleSave} className="form-button-primary" disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu khách hàng'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};






