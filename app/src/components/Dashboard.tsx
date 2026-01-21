import React, { useState, useEffect } from 'react';
import { reminderService, auditService } from '../api';
import { SmartTable, type ColumnDef } from './SmartTable';
import { exportToCSV } from '../utils/exportUtils';
import { formatTimeVN } from '../utils/dateUtils';
import { TrendLineChart, SparkBarChart, CompactRadialGauge } from './MiniCharts';

interface DashboardProps {
    subView?: string;
    onNavigate?: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ subView = 'dashboard', onNavigate }) => {
    const [reminders, setReminders] = useState<any[]>([]);
    const [auditResult, setAuditResult] = useState<any>(null);
    const [stats, setStats] = useState<{
        cash: number;
        fund_allocated: number;
        fund_spent: number;
        fund_remaining: number;
        budget_allocated: number;
        budget_spent: number;
        infrastructure_count: number;
        infrastructure_value: number;
        history?: { labels: string[]; thu: number[]; chi: number[]; cash_flow: number[] }
    }>({
        cash: 0,
        fund_allocated: 0,
        fund_spent: 0,
        fund_remaining: 0,
        budget_allocated: 0,
        budget_spent: 0,
        infrastructure_count: 0,
        infrastructure_value: 0
    });
    const [overdueData, setOverdueData] = useState<any[]>([]);
    const [incompleteData, setIncompleteData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [remRes, auditRes, statsRes, overdueRes, incompleteRes] = await Promise.all([
                    reminderService.getReminders(),
                    auditService.healthCheck(),
                    reminderService.getStats(),
                    reminderService.getOverdueDetail(),
                    reminderService.getIncompleteDetail()
                ]);
                setReminders(remRes.data);
                setAuditResult(auditRes.data);
                setStats(statsRes.data);
                setOverdueData(overdueRes.data);
                setIncompleteData(incompleteRes.data);
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(amount);
    };

    const getFullCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);

    // Detail Views unchanged
    const overdueColumns: ColumnDef[] = [
        { field: 'invoice_no', headerName: 'Số Hóa đơn', width: 'w-32' },
        { field: 'partner_name', headerName: 'Khách hàng', width: 'min-w-[250px]' },
        { field: 'due_date', headerName: 'Hạn TT', width: 'w-32', align: 'center', type: 'date' },
        {
            field: 'amount', headerName: 'Số tiền', width: 'w-40', align: 'right',
            renderCell: (v: number) => <span className="font-mono font-bold text-red-600">{getFullCurrency(v)}</span>
        },
        { field: 'days_overdue', headerName: 'Quá hạn', width: 'w-24', align: 'center', renderCell: (v: number) => <span className="text-red-500 font-black">{v} ngày</span> },
    ];

    const incompleteColumns: ColumnDef[] = [
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32' },
        { field: 'doc_date', headerName: 'Ngày CT', width: 'w-32', align: 'center', type: 'date' },
        { field: 'description', headerName: 'Diễn giải', width: 'min-w-[300px]' },
        {
            field: 'error_log', headerName: 'Lỗi phát hiện', width: 'min-w-[250px]',
            renderCell: (v: string) => <span className="text-red-600 font-medium italic text-xs">{v}</span>
        },
        {
            field: 'severity', headerName: 'Mức độ', width: 'w-24', align: 'center',
            renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${v === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {v === 'critical' ? 'Cao' : 'TB'}
                </span>
            )
        },
    ];

    if (subView === 'overdue_inv') {
        const totalOverdue = overdueData.reduce((sum: number, item: any) => sum + item.amount, 0);
        return (
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-600">priority_high</span>
                        Chi tiết Hóa đơn Quá hạn
                    </h2>
                    <div className="flex items-center gap-4">
                        <p className="text-sm font-bold text-slate-500">Tổng nợ: <span className="text-red-600 ml-1">{getFullCurrency(totalOverdue)}</span></p>
                        <button onClick={() => exportToCSV(overdueData, 'Overdue')} className="p-2 hover:bg-slate-100 rounded-lg"><span className="material-symbols-outlined">download</span></button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <SmartTable data={overdueData} columns={overdueColumns} keyField="id" minRows={15} />
                </div>
            </div>
        );
    }

    if (subView === 'incomplete_docs') {
        return (
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">error_outline</span>
                        Chứng từ lỗi (AI Audit)
                    </h2>
                </div>
                <div className="flex-1 overflow-hidden">
                    <SmartTable data={incompleteData} columns={incompleteColumns} keyField="id" minRows={15} />
                </div>
            </div>
        );
    }

    // MAIN DASHBOARD - HCSN VERSION
    const fundUsagePercent = stats.fund_allocated > 0 ? Math.round((stats.fund_spent / stats.fund_allocated) * 100) : 0;
    const budgetUsagePercent = stats.budget_allocated > 0 ? Math.round((stats.budget_spent / stats.budget_allocated) * 100) : 0;

    return (
        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Tổng quan HCSN</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Dữ liệu cập nhật: {formatTimeVN()}</p>
                    </div>
                </div>

                {/* Quick Access - Truy cập nhanh */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-blue-600">bolt</span>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Truy cập nhanh</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <button
                            onClick={() => onNavigate?.('voucher')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-blue-600 transition-colors">receipt_long</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-blue-700 text-center">Nhập chứng từ</span>
                        </button>
                        <button
                            onClick={() => onNavigate?.('trial_balance')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900/20 border border-transparent hover:border-green-200 dark:hover:border-green-800 transition-all group"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-green-600 transition-colors">balance</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-green-700 text-center">Bảng Cân đối TK</span>
                        </button>
                        <button
                            onClick={() => onNavigate?.('cash_receipt')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-emerald-600 transition-colors">payments</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 text-center">Phiếu Thu</span>
                        </button>
                        <button
                            onClick={() => onNavigate?.('cash_payment')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all group"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-red-600 transition-colors">output</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-red-700 text-center">Phiếu Chi</span>
                        </button>
                        <button
                            onClick={() => onNavigate?.('closing')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all group"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-purple-600 transition-colors">published_with_changes</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-purple-700 text-center">Kết chuyển CK</span>
                        </button>
                        <button
                            onClick={() => onNavigate?.('activity_result')}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all group"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-amber-600 transition-colors">summarize</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-amber-700 text-center">BC Kết quả HĐ</span>
                        </button>
                    </div>
                </div>


                {/* Metric Cards - Updated for HCSN */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Cash - Giữ nguyên */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="flex justify-between items-start mb-1">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><span className="material-symbols-outlined text-lg">payments</span></div>
                            <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">trending_up</span> +5.2%
                            </span>
                        </div>
                        <div className="mt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiền mặt & NH</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight font-mono mt-0.5">
                                {loading ? '...' : formatCurrency(stats.cash)} <span className="text-xs text-slate-400 font-bold">₫</span>
                            </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <TrendLineChart data={stats.history?.cash_flow || []} color="#3b82f6" height={24} width={200} />
                        </div>
                    </div>

                    {/* Card 2: Nguồn Kinh Phí - MỚI */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="flex justify-between items-start mb-1">
                            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><span className="material-symbols-outlined text-lg">account_balance</span></div>
                            <button onClick={() => onNavigate?.('fund_list')} className="hover:text-purple-600 text-slate-300"><span className="material-symbols-outlined text-lg">open_in_new</span></button>
                        </div>
                        <div className="mt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nguồn Kinh Phí</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight font-mono mt-0.5">
                                {loading ? '...' : formatCurrency(stats.fund_allocated)} <span className="text-xs text-slate-400 font-bold">₫</span>
                            </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-medium">Đã chi: <span className="font-bold text-purple-700">{fundUsagePercent}%</span></span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden"><div style={{ width: `${fundUsagePercent}%` }} className="h-full bg-purple-500"></div></div>
                        </div>
                    </div>

                    {/* Card 3: Dự Toán - MỚI */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="flex justify-between items-start mb-1">
                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><span className="material-symbols-outlined text-lg">request_quote</span></div>
                            <button onClick={() => onNavigate?.('fund_budget')} className="hover:text-green-600 text-slate-300"><span className="material-symbols-outlined text-lg">open_in_new</span></button>
                        </div>
                        <div className="mt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dự Toán NS</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight font-mono mt-0.5">
                                {loading ? '...' : formatCurrency(stats.budget_allocated)} <span className="text-xs text-slate-400 font-bold">₫</span>
                            </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-medium">Giải ngân: <span className="font-bold text-green-700">{budgetUsagePercent}%</span></span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden"><div style={{ width: `${budgetUsagePercent}%` }} className="h-full bg-green-500"></div></div>
                        </div>
                    </div>

                    {/* Card 4: Health Score - Giữ nguyên */}
                    <div className="bg-slate-900 dark:bg-black p-4 rounded-xl shadow-lg border border-slate-800 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <CompactRadialGauge score={auditResult?.score || 85} size={60} />
                        <div className="flex-1 relative z-10">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Điểm sức khỏe</p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                                AI phát hiện <span className="text-white font-bold">{auditResult?.anomalies?.length || 0} vấn đề</span> cần lưu ý.
                            </p>
                            <button onClick={() => onNavigate?.('audit')} className="mt-2 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors text-white">
                                Xem chi tiết
                            </button>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Chart 1: Thu vs Chi - Updated */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Thu Chi Ngân Sách</h3>
                                <p className="text-xs text-slate-500">Thu các khoản & Chi hoạt động 12 tháng</p>
                            </div>
                            <div className="flex gap-4 text-xs font-bold">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Thu</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Chi</div>
                            </div>
                        </div>
                        <div className="h-64 w-full relative">
                            <div className="absolute inset-0 opacity-30 pointer-events-none transform translate-y-2">
                                <TrendLineChart data={stats.history?.chi || []} color="#f59e0b" height={250} width={600} />
                            </div>
                            <div className="absolute inset-0 z-10">
                                <TrendLineChart data={stats.history?.thu || []} color="#3b82f6" height={250} width={600} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Cash Flow */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-[200px] flex flex-col">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4">Dòng tiền thuần (6 tháng)</h3>
                            <div className="flex-1">
                                <SparkBarChart data={stats.history?.cash_flow.slice(-6) || []} labels={stats.history?.labels.slice(-6) || []} height={120} />
                            </div>
                        </div>

                        {/* Reminders */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
                            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Cần xử lý ngay</h3>
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{reminders.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[200px]">
                                {reminders.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs italic">Không có nhắc nhở nào.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {reminders.map(r => (
                                            <div key={r.id} onClick={() => onNavigate && onNavigate(r.id === 'overdue_inv' ? 'overdue_inv' : 'general')} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer group transition-colors">
                                                <div className="flex gap-3">
                                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${r.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{r.title}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
