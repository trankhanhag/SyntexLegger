import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BudgetEstimateModule from './BudgetEstimateModule';
import BudgetAllocationModule from './BudgetAllocationModule';
import OffBalanceModule from './OffBalanceModule';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';

const API_BASE = 'http://localhost:3000/api/hcsn';

interface FundSource {
    id: string;
    code: string;
    name: string;
    type: string;
    fiscal_year: number;
    allocated_amount: number;
    spent_amount: number;
    remaining_amount: number;
    status: string;
    created_at: string;
    updated_at: string;
}

const FundSourceModule: React.FC<{ subView?: string, onSetHeader?: any, onNavigate?: (view: string) => void }> = ({ subView = 'list', onSetHeader, onNavigate }) => {
    const [fundSources, setFundSources] = useState<FundSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'BUDGET_REGULAR',
        fiscal_year: new Date().getFullYear(),
        allocated_amount: 0
    });

    const token = localStorage.getItem('token');
    const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    useEffect(() => {
        if (subView === 'list') {
            loadFundSources();
            if (onSetHeader) {
                onSetHeader({
                    title: 'Quản lý Nguồn kinh phí',
                    icon: 'account_balance',
                    actions: [
                        { label: 'Thêm nguồn', icon: 'add', onClick: () => setShowForm(true), primary: true },
                        { label: 'Làm mới', icon: 'refresh', onClick: loadFundSources }
                    ]
                });
            }
        }
    }, [fiscalYear, subView, onSetHeader]);

    const loadFundSources = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/fund-sources?fiscal_year=${fiscalYear}`, axiosConfig);
            setFundSources(res.data.data || []);
        } catch (err: any) {
            console.error('Error loading fund sources:', err);
            // Suppress initial load error if API not ready
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            type: 'BUDGET_REGULAR',
            fiscal_year: new Date().getFullYear(),
            allocated_amount: 0
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingId) {
                await axios.put(`${API_BASE}/hcsn/fund-sources/${editingId}`, formData, axiosConfig);
                alert('Cập nhật nguồn kinh phí thành công!');
            } else {
                await axios.post(`${API_BASE}/hcsn/fund-sources`, formData, axiosConfig);
                alert('Tạo nguồn kinh phí thành công!');
            }

            resetForm();
            loadFundSources();
        } catch (err: any) {
            console.error('Error saving fund source:', err);
            alert(err.response?.data?.error || 'Lỗi khi lưu nguồn kinh phí');
        }
    };

    const handleEdit = (fs: FundSource) => {
        setFormData({
            code: fs.code,
            name: fs.name,
            type: fs.type,
            fiscal_year: fs.fiscal_year,
            allocated_amount: fs.allocated_amount
        });
        setEditingId(fs.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa nguồn kinh phí "${name}"?`)) return;

        try {
            await axios.delete(`${API_BASE}/hcsn/fund-sources/${id}`, axiosConfig);
            alert('Xóa nguồn kinh phí thành công!');
            loadFundSources();
        } catch (err: any) {
            console.error('Error deleting fund source:', err);
            alert(err.response?.data?.error || 'Lỗi khi xóa nguồn kinh phí');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getTypeLabel = (type: string) => {
        const labels: { [key: string]: string } = {
            'BUDGET_REGULAR': 'Ngân sách thường xuyên',
            'BUDGET_NON_REGULAR': 'Ngân sách không thường xuyên',
            'REVENUE_RETAINED': 'Thu sự nghiệp được để lại',
            'AID': 'Viện trợ, vay nợ',
            'OTHER': 'Nguồn khác'
        };
        return labels[type] || type;
    };

    const calculateUsagePercent = (spent: number, allocated: number) => {
        if (allocated === 0) return 0;
        return Math.round((spent / allocated) * 100);
    };

    // --- RENDER CONTENT BASED ON SUBVIEW ---

    // --- RENDER CONTENT BASED ON SUBVIEW ---

    // 1. FUND LIST VIEW
    const renderFundList = () => (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Toolbar for Filters */}
            <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Năm ngân sách:</span>
                    <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(Number(e.target.value))}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:border-slate-600 outline-none"
                    >
                        {[2024, 2025, 2026, 2027, 2028].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Tỷ lệ giải ngân:</span>
                        <span className="text-blue-600 font-bold">
                            {fundSources.length > 0
                                ? Math.round((fundSources.reduce((s, f) => s + f.spent_amount, 0) / fundSources.reduce((s, f) => s + f.allocated_amount, 0)) * 100) || 0
                                : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : fundSources.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">inbox</span>
                    <p>Chưa có nguồn kinh phí nào cho năm {fiscalYear}</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 overflow-hidden relative">
                    <div className="overflow-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mã nguồn</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tên nguồn</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Loại</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Dự toán</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Đã dùng</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Còn lại</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Tiến độ</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {fundSources.map((fs) => {
                                    const usagePercent = calculateUsagePercent(fs.spent_amount, fs.allocated_amount);
                                    return (
                                        <tr key={fs.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-blue-600 dark:text-blue-400">{fs.code}</td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">{fs.name}</td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {getTypeLabel(fs.type)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-700 dark:text-slate-200">
                                                {formatCurrency(fs.allocated_amount)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-orange-600 dark:text-orange-400">
                                                {formatCurrency(fs.spent_amount)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-green-600 dark:text-green-400">
                                                {formatCurrency(fs.remaining_amount)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap align-middle">
                                                <div className="w-full max-w-[100px] mx-auto">
                                                    <div className="overflow-hidden h-1.5 text-xs flex rounded-full bg-slate-200 dark:bg-slate-600">
                                                        <div
                                                            style={{ width: `${usagePercent}%` }}
                                                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                                                        ></div>
                                                    </div>
                                                    <div className="text-[10px] text-center mt-0.5 text-slate-400">{usagePercent}%</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-medium">
                                                <button onClick={() => handleEdit(fs)} className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 mr-3 transition-colors" title="Sửa">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(fs.id, fs.name)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors" title="Xóa">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                {editingId ? 'Cập nhật Nguồn kinh phí' : 'Thêm mới Nguồn kinh phí'}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mã nguồn</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tên nguồn</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Loại nguồn</label>
                                    <select
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="BUDGET_REGULAR">Ngân sách thường xuyên (NSNN)</option>
                                        <option value="BUDGET_NON_REGULAR">Ngân sách không thường xuyên</option>
                                        <option value="REVENUE_RETAINED">Nguồn thu để lại (Sự nghiệp)</option>
                                        <option value="AID">Viện trợ, Vay nợ</option>
                                        <option value="OTHER">Nguồn khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Năm ngân sách</label>
                                    <input
                                        type="number"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.fiscal_year}
                                        onChange={(e) => setFormData({ ...formData, fiscal_year: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Dự toán được giao</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.allocated_amount}
                                        onChange={(e) => setFormData({ ...formData, allocated_amount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={resetForm} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Hủy
                                </button>
                                <button type="submit" className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    {editingId ? 'Cập nhật' : 'Lưu lại'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    // 2. PLACEHOLDERS FOR OTHER VIEWS
    const renderPlaceholder = (title: string, desc: string) => (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
            <span className="material-symbols-outlined text-6xl mb-4 text-gray-300">construction</span>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p>{desc}</p>
        </div>
    );

    // MAIN RENDER SWITCH
    switch (subView) {
        case 'overview':
            return (
                <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
                    <ModuleOverview
                        title={MODULE_CONFIGS.hcsn.title}
                        description={MODULE_CONFIGS.hcsn.description}
                        icon={MODULE_CONFIGS.hcsn.icon}
                        iconColor={MODULE_CONFIGS.hcsn.iconColor}
                        workflow={MODULE_CONFIGS.hcsn.workflow}
                        features={MODULE_CONFIGS.hcsn.features}
                        onNavigate={onNavigate}
                        stats={[
                            { icon: 'account_balance', label: 'Tổng nguồn', value: formatCurrency(fundSources.reduce((sum, fs) => sum + fs.allocated_amount, 0)), color: 'blue' },
                            { icon: 'payments', label: 'Đã giải ngân', value: formatCurrency(fundSources.reduce((sum, fs) => sum + fs.spent_amount, 0)), color: 'green' },
                            { icon: 'pending', label: 'Nguồn còn lại', value: formatCurrency(fundSources.reduce((sum, fs) => sum + fs.remaining_amount, 0)), color: 'amber' },
                        ]}
                    />
                </div>
            );

        case 'list': return renderFundList();
        case 'budget': return <BudgetEstimateModule subView="list" onSetHeader={onSetHeader} onNavigate={onNavigate} />;
        case 'adjustment': return <BudgetEstimateModule subView="adjustment" onSetHeader={onSetHeader} onNavigate={onNavigate} />;
        case 'allocation': return <BudgetAllocationModule onNavigate={onNavigate} onSetHeader={onSetHeader} />;
        case 'infrastructure': return renderPlaceholder('Tài sản Hạ tầng', 'Vui lòng truy cập menu "Tài sản" để quản lý chi tiết.');
        case 'off_balance': return <OffBalanceModule onSetHeader={onSetHeader} />;
        case 'reports': return renderPlaceholder('Báo cáo Nguồn kinh phí', 'Vui lòng truy cập menu "Báo cáo" để xem B01/BCQT và B03/HD.');
        default: return renderFundList();
    }
};

export default FundSourceModule;
