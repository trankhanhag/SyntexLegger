import React from 'react';
import { SmartTable, type ColumnDef } from '../SmartTable';
import { masterDataService, budgetService } from '../../api';
import { toInputMonthValue } from '../../utils/dateUtils';
import { FormModal } from '../FormModal';

const Modal = ({ title, onClose, children, panelClass }: { title: string, onClose: () => void, children: React.ReactNode, panelClass?: string }) => (
    <FormModal title={title} onClose={onClose} panelClass={panelClass}>
        {children}
    </FormModal>
);

export const CostItemTable = ({ type, refreshSignal }: { type: 'Chi' | 'Thu' | 'Định mức', refreshSignal?: number }) => {
    const [data, setData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await masterDataService.getAccounts();
                const filtered = res.data.filter((acc: any) => {
                    const code = acc.account_code;
                    if (type === 'Chi') return code.startsWith('6') || code.startsWith('7');
                    if (type === 'Thu') return code.startsWith('5');
                    return true;
                }).map((acc: any) => ({
                    id: acc.account_code,
                    code: acc.account_code,
                    name: acc.account_name,
                    type: acc.category,
                    parent: '',
                    description: acc.category
                }));
                setData(filtered);
            } catch (err) {
                console.error("Failed to fetch cost items:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [type, refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Khoản mục', width: 'w-40' },
        { field: 'name', headerName: 'Tên Khoản mục', width: 'min-w-[250px]' },
        {
            field: 'type', headerName: 'Phân loại', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Chi phí' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{v}</span>
            )
        },
        { field: 'parent', headerName: 'Thuộc nhóm', width: 'w-36' },
        { field: 'description', headerName: 'Diễn giải / Mô tả', width: 'min-w-[300px]' },
    ];

    const handleSaveBudget = async (accCode: string, amount: number, notes: string) => {
        try {
            await budgetService.save({
                account_code: accCode,
                period: toInputMonthValue(), // Month YYYY-MM
                amount,
                notes
            });
            alert("Đã lưu ngân sách!");
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu ngân sách");
        }
    };

    if (type === 'Định mức') {
        const [budgets, setBudgets] = React.useState<any[]>([]);

        React.useEffect(() => {
            const fetchBudgets = async () => {
                const res = await budgetService.getAll(toInputMonthValue());
                setBudgets(res.data);
            };
            fetchBudgets();
        }, []);

        const budgetColumns: ColumnDef[] = [
            { field: 'account_code', headerName: 'Mã Khoản mục', width: 'w-40' },
            {
                field: 'notes', headerName: 'Diễn giải / Mô tả', width: 'min-w-[250px]', renderCell: (val: string, row: any) => (
                    <input
                        defaultValue={val}
                        onBlur={(e) => handleSaveBudget(row.account_code, row.amount, e.target.value)}
                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500"
                        placeholder="Nhập ghi chú..."
                    />
                )
            },
            {
                field: 'amount',
                headerName: 'Ngân sách (VND)',
                width: 'w-48',
                align: 'right',
                renderCell: (val: number, row: any) => (
                    <input
                        type="number"
                        defaultValue={val}
                        onBlur={(e) => handleSaveBudget(row.account_code, Number(e.target.value), row.notes)}
                        className="w-full text-right font-mono font-bold text-purple-600 bg-transparent outline-none border-b border-transparent focus:border-purple-500"
                    />
                )
            },
            { field: 'updated_at', headerName: 'Cập nhật cuối', width: 'w-40', align: 'center', renderCell: () => <span className="text-slate-400 text-xs">Vừa xong</span> }
        ];

        return (
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Thiết lập Ngân sách Chi phí - Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</h3>
                    <button onClick={() => alert("Tính năng thêm mới đang hoàn thiện")} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">add</span> Thêm khoản mục
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <SmartTable
                        data={budgets}
                        columns={budgetColumns}
                        keyField="id"
                        minRows={10}
                        emptyMessage="Chưa có dữ liệu ngân sách"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <SmartTable
                        data={data}
                        columns={columns}
                        keyField="id"
                        minRows={15}
                        emptyMessage="Không có dữ liệu khoản mục"
                    />
                )}
            </div>
        </div>
    );
};

export const CostItemFormModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = React.useState({
        code: '',
        name: '',
        type: 'Chi phí',
        parent: '',
        description: ''
    });

    const handleSave = async () => {
        try {
            const newAccount = {
                account_code: formData.code,
                account_name: formData.name,
                category: formData.type,
                description: formData.description,
                parent_account: formData.parent,
                is_active: true
            };
            await masterDataService.saveAccounts([newAccount]);
            alert("Đã lưu khoản mục thành công!");
            onClose();
        } catch (err) {
            console.error("Save failed:", err);
            alert("Lỗi khi lưu dữ liệu.");
        }
    };

    return (
        <Modal title="Thêm Khoản mục Thống kê mới" onClose={onClose}>
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Mã Khoản mục</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="form-input font-bold"
                                placeholder="VD: 6421..."
                            />
                        </div>
                        <div>
                            <label className="form-label">Phân loại</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="form-input"
                            >
                                <option value="Chi">Chi</option>
                                <option value="Thu">Thu</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Tên Khoản mục</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input"
                            placeholder="VD: Chi phí lương nhân viên..."
                        />
                    </div>
                    <div>
                        <label className="form-label">Khoản mục cha (Cấp trên)</label>
                        <select
                            value={formData.parent}
                            onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                            className="form-input"
                        >
                            <option value="">-- Không có --</option>
                            <option value="641">Chi phí bán hàng (641)</option>
                            <option value="642">Chi phí quản lý (642)</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Diễn giải chi tiết</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="form-textarea"
                        />
                    </div>
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                    <button
                        onClick={handleSave}
                        className="form-button-primary bg-rose-600 hover:bg-rose-700 uppercase tracking-wide"
                    >
                        Lưu danh mục
                    </button>
                </div>
            </div>
        </Modal>
    );
};
