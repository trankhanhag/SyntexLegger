import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { DateInput } from './DateInput';
import { FormModal } from './FormModal';
import { debtService } from '../api';
import { type RibbonAction } from './Ribbon';
import { toInputDateValue } from '../utils/dateUtils';

interface DebtManagementModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
}

export const DebtManagementModule: React.FC<DebtManagementModuleProps> = ({ subView = 'temp_advances', printSignal = 0, onSetHeader }) => {
    const [view, setView] = useState(subView);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // Data states
    const [tempAdvances, setTempAdvances] = useState<any[]>([]);
    const [budgetAdvances, setBudgetAdvances] = useState<any[]>([]);
    const [receivables, setReceivables] = useState<any[]>([]);
    const [payables, setPayables] = useState<any[]>([]);

    useEffect(() => {
        setView(subView);
    }, [subView]);

    useEffect(() => {
        fetchData();
    }, [view]);

    useEffect(() => {
        if (printSignal > 0) {
            window.print();
        }
    }, [printSignal]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'temp_advances') {
                const res = await debtService.getTemporaryAdvances();
                setTempAdvances(res.data);
            } else if (view === 'budget_advances') {
                const res = await debtService.getBudgetAdvances();
                setBudgetAdvances(res.data);
            } else if (view === 'receivables') {
                const res = await debtService.getReceivables();
                setReceivables(res.data);
            } else if (view === 'payables') {
                const res = await debtService.getPayables();
                setPayables(res.data);
            }
        } catch (err) {
            console.error("Fetch debt data failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (onSetHeader) {
            const getTitle = () => {
                switch (view) {
                    case 'temp_advances': return 'Quản lý Tạm ứng (TK 141)';
                    case 'budget_advances': return 'Ứng trước NSNN (TK 161)';
                    case 'receivables': return 'Công nợ phải thu (TK 136, 138)';
                    case 'payables': return 'Công nợ phải trả (TK 331, 336, 338)';
                    default: return 'Quản lý Công nợ HCSN';
                }
            };

            const actions: RibbonAction[] = [];

            actions.push({
                label: view === 'temp_advances' ? 'Tạo tạm ứng' :
                    view === 'budget_advances' ? 'Tạo ứng NSNN' :
                        view === 'receivables' ? 'Tạo phải thu' : 'Tạo phải trả',
                icon: 'add_circle',
                onClick: () => setShowForm(true),
                primary: true
            });

            actions.push({ label: 'Làm mới', icon: 'refresh', onClick: fetchData });
            actions.push({ label: 'In danh sách', icon: 'print', onClick: () => window.print() });

            if (view === 'receivables' || view === 'payables') {
                actions.push({
                    label: 'Phân tích theo tuổi',
                    icon: 'analytics',
                    onClick: async () => {
                        try {
                            const type = view === 'receivables' ? 'receivables' : 'payables';
                            const res = await debtService.getAgingReport(type as any);
                            alert(JSON.stringify(res.data, null, 2)); // Placeholder, should show modal
                        } catch (e) {
                            console.error(e);
                        }
                    }
                });
            }

            onSetHeader({ title: getTitle(), icon: 'account_balance_wallet', actions, onDelete: handleDeleteSelected });
        }
    }, [view, onSetHeader, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedRow.doc_no || 'mục đã chọn'}?`)) return;

        try {
            if (view === 'temp_advances') {
                await debtService.deleteTemporaryAdvance(selectedRow.id);
            } else if (view === 'budget_advances') {
                await debtService.deleteBudgetAdvance(selectedRow.id);
            } else if (view === 'receivables') {
                await debtService.deleteReceivable(selectedRow.id);
            } else {
                await debtService.deletePayable(selectedRow.id);
            }
            alert("Đã xóa thành công.");
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    // formatCurrency is reserved for future use if needed

    // Column Definitions
    const tempAdvancesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'doc_date', headerName: 'Ngày TƯ', width: 'w-28', type: 'date' },
        { field: 'employee_name', headerName: 'Người tạm ứng', width: 'min-w-[200px]' },
        { field: 'purpose', headerName: 'Mục đích', width: 'min-w-[250px]' },
        {
            field: 'amount', headerName: 'Tạm ứng', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'settled_amount', headerName: 'Đã quyết toán', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'PENDING': 'bg-yellow-100 text-yellow-700',
                    'PARTIAL': 'bg-blue-100 text-blue-700',
                    'SETTLED': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const budgetAdvancesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'fiscal_year', headerName: 'Năm NS', width: 'w-20', align: 'center' },
        { field: 'advance_type', headerName: 'Loại ứng', width: 'w-32' },
        {
            field: 'amount', headerName: 'Số tiền ứng', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'repaid_amount', headerName: 'Đã hoàn', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        { field: 'repayment_deadline', headerName: 'Hạn hoàn', width: 'w-28', type: 'date' },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'ACTIVE': 'bg-blue-100 text-blue-700',
                    'REPAID': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const receivablesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'doc_date', headerName: 'Ngày CT', width: 'w-28', type: 'date' },
        { field: 'partner_name', headerName: 'Đối tác', width: 'min-w-[200px]' },
        { field: 'account_code', headerName: 'TK', width: 'w-16' },
        { field: 'description', headerName: 'Nội dung', width: 'min-w-[250px]' },
        {
            field: 'original_amount', headerName: 'Nợ gốc', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'received_amount', headerName: 'Đã thu', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        { field: 'due_date', headerName: 'Hạn TT', width: 'w-28', type: 'date' },
        {
            field: 'status', headerName: 'TT', width: 'w-24', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'UNPAID': 'bg-yellow-100 text-yellow-700',
                    'PARTIAL': 'bg-blue-100 text-blue-700',
                    'PAID': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const payablesColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'doc_date', headerName: 'Ngày CT', width: 'w-28', type: 'date' },
        { field: 'partner_name', headerName: 'Nhà cung cấp', width: 'min-w-[200px]' },
        { field: 'account_code', headerName: 'TK', width: 'w-16' },
        { field: 'description', headerName: 'Nội dung', width: 'min-w-[250px]' },
        {
            field: 'original_amount', headerName: 'Nợ gốc', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span>
        },
        {
            field: 'paid_amount', headerName: 'Đã trả', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span>
        },
        {
            field: 'remaining', headerName: 'Còn lại', type: 'number', width: 'w-36', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{formatNumber(v)}</span>
        },
        { field: 'due_date', headerName: 'Hạn TT', width: 'w-28', type: 'date' },
        {
            field: 'status', headerName: 'TT', width: 'w-24', align: 'center',
            renderCell: (v: string) => {
                const colors = {
                    'UNPAID': 'bg-yellow-100 text-yellow-700',
                    'PARTIAL': 'bg-blue-100 text-blue-700',
                    'PAID': 'bg-green-100 text-green-700',
                    'OVERDUE': 'bg-red-100 text-red-700'
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v as keyof typeof colors] || ''}`}>{v}</span>;
            }
        },
    ];

    const getCurrentData = () => {
        switch (view) {
            case 'temp_advances': return tempAdvances;
            case 'budget_advances': return budgetAdvances;
            case 'receivables': return receivables;
            case 'payables': return payables;
            default: return [];
        }
    };

    const getCurrentColumns = () => {
        switch (view) {
            case 'temp_advances': return tempAdvancesColumns;
            case 'budget_advances': return budgetAdvancesColumns;
            case 'receivables': return receivablesColumns;
            case 'payables': return payablesColumns;
            default: return [];
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <SmartTable data={getCurrentData()} columns={getCurrentColumns()} keyField="id" onSelectionChange={setSelectedRow} minRows={15} />
            </div>

            {showForm && (
                <DebtFormModal
                    view={view}
                    onClose={() => setShowForm(false)}
                    onRefresh={fetchData}
                />
            )}
        </div>
    );
};

const DebtFormModal = ({ view, onClose, onRefresh }: { view: string, onClose: () => void, onRefresh: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>({
        doc_no: '',
        doc_date: toInputDateValue(),
        amount: 0,
        // Common fields will be added conditionally below
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            if (view === 'temp_advances') {
                await debtService.createTemporaryAdvance({
                    ...formData,
                    employee_name: formData.employee_name || 'N/A',
                    purpose: formData.purpose || ''
                });
            } else if (view === 'budget_advances') {
                await debtService.createBudgetAdvance({
                    ...formData,
                    fiscal_year: new Date(formData.doc_date).getFullYear(),
                    advance_type: formData.advance_type || 'NEXT_YEAR'
                });
            } else if (view === 'receivables') {
                await debtService.createReceivable({
                    ...formData,
                    account_code: formData.account_code || '136',
                    original_amount: formData.amount
                });
            } else {
                await debtService.createPayable({
                    ...formData,
                    account_code: formData.account_code || '331',
                    original_amount: formData.amount
                });
            }
            alert("Lưu thông tin thành công!");
            onRefresh();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Có lỗi xảy ra khi lưu.");
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (view) {
            case 'temp_advances': return 'Tạo Tạm ứng mới';
            case 'budget_advances': return 'Tạo Ứng trước NSNN';
            case 'receivables': return 'Tạo Công nợ phải thu';
            case 'payables': return 'Tạo Công nợ phải trả';
            default: return 'Tạo mới';
        }
    };

    return (
        <FormModal
            title={getTitle()}
            onClose={onClose}
            icon="account_balance_wallet"
            sizeClass="max-w-2xl"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="form-label">Số chứng từ</span>
                        <input
                            className="form-input font-bold text-blue-600"
                            value={formData.doc_no}
                            onChange={e => setFormData({ ...formData, doc_no: e.target.value })}
                            placeholder="TU-001, UNS-001, PT-001, PTR-001..."
                        />
                    </label>
                    <label className="block">
                        <span className="form-label">Ngày chứng từ</span>
                        <DateInput
                            className="form-input"
                            value={formData.doc_date}
                            onChange={val => setFormData({ ...formData, doc_date: val })}
                        />
                    </label>
                </div>

                {view === 'temp_advances' && (
                    <>
                        <label className="block">
                            <span className="form-label">Người nhận tạm ứng</span>
                            <input
                                className="form-input"
                                value={formData.employee_name}
                                onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                            />
                        </label>
                        <label className="block">
                            <span className="form-label">Mục đích</span>
                            <textarea
                                rows={2}
                                className="form-textarea"
                                value={formData.purpose}
                                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                placeholder="Công tác, mua sắm..."
                            />
                        </label>
                    </>
                )}

                {view === 'budget_advances' && (
                    <>
                        <label className="block">
                            <span className="form-label">Loại ứng</span>
                            <select
                                className="form-select"
                                value={formData.advance_type}
                                onChange={e => setFormData({ ...formData, advance_type: e.target.value })}
                            >
                                <option value="NEXT_YEAR">Ứng năm sau</option>
                                <option value="EMERGENCY">Ứng khẩn cấp</option>
                                <option value="SUPPLEMENTARY">Ứng bổ sung</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="form-label">Văn bản phê duyệt</span>
                            <input
                                className="form-input"
                                value={formData.approval_doc}
                                onChange={e => setFormData({ ...formData, approval_doc: e.target.value })}
                            />
                        </label>
                    </>
                )}

                {(view === 'receivables' || view === 'payables') && (
                    <>
                        <label className="block">
                            <span className="form-label">Đối tác</span>
                            <input
                                className="form-input"
                                value={formData.partner_name}
                                onChange={e => setFormData({ ...formData, partner_name: e.target.value })}
                            />
                        </label>
                        <label className="block">
                            <span className="form-label">Tài khoản</span>
                            <input
                                className="form-input"
                                value={formData.account_code}
                                onChange={e => setFormData({ ...formData, account_code: e.target.value })}
                                placeholder={view === 'receivables' ? '136, 138' : '331, 336, 338'}
                            />
                        </label>
                        <label className="block">
                            <span className="form-label">Nội dung</span>
                            <textarea
                                rows={2}
                                className="form-textarea"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </label>
                    </>
                )}

                <label className="block">
                    <span className="form-label">Số tiền</span>
                    <input
                        type="number"
                        className="form-input font-mono font-bold text-blue-600"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                </label>

                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary" disabled={loading}>Hủy</button>
                    <button
                        onClick={handleSave}
                        className="form-button-primary flex items-center gap-2"
                        disabled={loading}
                    >
                        <span className="material-symbols-outlined">save</span>
                        {loading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>
        </FormModal>
    );
};
