import React, { useState, useEffect } from 'react';
import { hcsnService } from '../api';
import { type RibbonAction } from './Ribbon';
import { SmartTable } from './SmartTable';
import type { ColumnDef } from './SmartTable';

interface OffBalanceLog {
    id: number;
    account_code: string;
    transaction_date: string;
    doc_no: string;
    description: string;
    increase_amount: number;
    decrease_amount: number;
    balance: number;
}

interface SummaryItem {
    account_code: string;
    total_increase: number;
    total_decrease: number;
    current_balance: number;
}

interface OffBalanceModuleProps {
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
}

const OffBalanceModule: React.FC<OffBalanceModuleProps> = ({ onSetHeader }) => {
    const [logs, setLogs] = useState<OffBalanceLog[]>([]);
    const [summary, setSummary] = useState<SummaryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        account_code: '008',
        transaction_date: new Date().toISOString().split('T')[0],
        doc_no: '',
        description: '',
        increase_amount: 0,
        decrease_amount: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [logsRes, summaryRes] = await Promise.all([
                hcsnService.getOffBalanceLogs(),
                hcsnService.getOffBalanceSummary()
            ]);
            setLogs(logsRes.data);
            setSummary(summaryRes.data);
        } catch (error) {
            console.error('Error fetching off-balance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Synchronize Header with Ribbon
    useEffect(() => {
        if (onSetHeader) {
            onSetHeader({
                title: 'Theo dõi Tài khoản Ngoài bảng',
                icon: 'visibility_off',
                actions: [
                    {
                        label: 'Ghi sổ Ngoài bảng',
                        icon: 'add_circle',
                        onClick: () => setShowForm(true),
                        primary: true
                    },
                    {
                        label: 'Làm mới',
                        icon: 'refresh',
                        onClick: fetchData
                    }
                ]
            });
        }
    }, [onSetHeader]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await hcsnService.createOffBalanceLog(formData);
            setShowForm(false);
            setFormData({
                ...formData,
                doc_no: '',
                description: '',
                increase_amount: 0,
                decrease_amount: 0
            });
            fetchData();
        } catch (error) {
            console.error('Error creating off-balance log:', error);
            alert('Lỗi khi lưu dữ liệu');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Defining columns for SmartTable
    const columns: ColumnDef[] = [
        { field: 'transaction_date', headerName: 'Ngày ghi sổ', width: '150px', type: 'date' },
        { field: 'doc_no', headerName: 'Số hiệu CT', width: '120px', fontClass: 'font-bold' },
        {
            field: 'account_code',
            headerName: 'Tài khoản',
            width: '100px',
            renderCell: (val) => (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-black text-[10px] ring-1 ring-blue-100/50 dark:ring-blue-800/50">
                    {val}
                </span>
            )
        },
        { field: 'description', headerName: 'Diễn giải nghiệp vụ', width: '300px' },
        {
            field: 'increase_amount',
            headerName: 'Ghi Tăng (+)',
            width: '150px',
            type: 'number',
            align: 'right',
            fontClass: 'font-black text-emerald-600 dark:text-emerald-400'
        },
        {
            field: 'decrease_amount',
            headerName: 'Ghi Giảm (-)',
            width: '150px',
            type: 'number',
            align: 'right',
            fontClass: 'font-black text-rose-600 dark:text-rose-400'
        },
        {
            field: 'balance',
            headerName: 'Số dư lũy kế',
            width: '150px',
            type: 'number',
            align: 'right',
            fontClass: 'font-black'
        }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Summary Cards */}
            <div className="px-6 pt-6 pb-6 overflow-hidden flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {summary.length > 0 ? summary.map((item, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                    TK {item.account_code}
                                </span>
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Số dư hiện tại</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                    {formatCurrency(item.current_balance)}
                                </p>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-50 dark:border-slate-700 pt-3">
                                <div>
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Lũy kế Tăng</span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.total_increase)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Lũy kế Giảm</span>
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{formatCurrency(item.total_decrease)}</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-12 text-center bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
                            <p className="text-sm font-bold tracking-tight">Chưa có dữ liệu phát sinh tài khoản ngoài bảng</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Table Section with SmartTable - Sát viền */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
                <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-[20px]">history</span>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Nhật ký phát sinh tài khoản ngoài bảng</h3>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <SmartTable
                        data={logs}
                        columns={columns}
                        keyField="id"
                        loading={loading}
                        emptyMessage="Bảng nhật ký trống. Hãy thực hiện ghi sổ nghiệp vụ mới."
                    />
                </div>
            </div>

            {/* Entry Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Ghi sổ Ngoài bảng mới</h3>
                                <p className="text-xs text-slate-500 font-bold">Tạo bút toán tăng/giảm dự toán hoặc ngoại tệ</p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-rose-500 transition-all font-black"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tài khoản đối tượng</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                        value={formData.account_code}
                                        onChange={e => setFormData({ ...formData, account_code: e.target.value })}
                                    >
                                        <option value="008">008 - Dự toán chi hoạt động</option>
                                        <option value="009">009 - Dự toán chi đầu tư XDCB</option>
                                        <option value="012">012 - Lệnh chi tiền thực chi</option>
                                        <option value="013">013 - Lệnh chi tiền tạm ứng</option>
                                        <option value="014">014 - Phí, lệ phí được để lại</option>
                                        <option value="018">018 - Ngoại tệ tại kho bạc</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày chứng từ</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                                        value={formData.transaction_date}
                                        onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số hiệu chứng từ</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                                    placeholder="Ví dụ: DT001, LC042..."
                                    value={formData.doc_no}
                                    onChange={e => setFormData({ ...formData, doc_no: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung diễn giải nghiệp vụ</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                                    rows={2}
                                    placeholder="Mô tả chi tiết nghiệp vụ phát sinh..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-5 pt-2">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Số tiền Ghi Tăng (+)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-100/50 dark:border-emerald-800/30 rounded-2xl px-4 py-4 text-xl font-black text-emerald-600 focus:outline-none focus:border-emerald-500 transition-all"
                                            value={formData.increase_amount}
                                            onChange={e => setFormData({ ...formData, increase_amount: Number(e.target.value) })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400/50 font-black">VND</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Số tiền Ghi Giảm (-)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-rose-50/50 dark:bg-rose-900/10 border-2 border-rose-100/50 dark:border-rose-800/30 rounded-2xl px-4 py-4 text-xl font-black text-rose-600 focus:outline-none focus:border-rose-500 transition-all"
                                            value={formData.decrease_amount}
                                            onChange={e => setFormData({ ...formData, decrease_amount: Number(e.target.value) })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400/50 font-black">VND</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-sm transition-all"
                                >
                                    Bỏ qua
                                </button>
                                <button
                                    type="submit"
                                    className="flex-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                                >
                                    Lưu Bút toán Ngoài bảng
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OffBalanceModule;
