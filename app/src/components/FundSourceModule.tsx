import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BudgetEstimateModule from './BudgetEstimateModule';
import BudgetAllocationModule from './BudgetAllocationModule';

const API_BASE = 'http://localhost:3005/api/hcsn';

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

const FundSourceModule: React.FC<{ subView?: string, onSetHeader?: any }> = ({ subView = 'list', onSetHeader }) => {
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
                        { label: 'Thêm nguồn', icon: 'add', onClick: () => setShowForm(true), primary: true }
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

    // 1. FUND LIST VIEW
    const renderFundList = () => (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Quản lý Nguồn Kinh Phí</h1>
                    <p className="text-gray-600 mt-1">Theo dõi và quản lý nguồn kinh phí HCSN (TT 24/2024/TT-BTC)</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(Number(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {[2024, 2025, 2026, 2027, 2028].map(year => (
                            <option key={year} value={year}>Năm {year}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
                    >
                        + Thêm nguồn
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {fundSources.length > 0 && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-semibold">Tổng được cấp</p>
                                <p className="text-3xl font-bold mt-2">
                                    {formatCurrency(fundSources.reduce((sum, fs) => sum + fs.allocated_amount, 0))}
                                </p>
                            </div>
                            <div className="text-5xl opacity-20">💰</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-semibold">Tổng đã chi</p>
                                <p className="text-3xl font-bold mt-2">
                                    {formatCurrency(fundSources.reduce((sum, fs) => sum + fs.spent_amount, 0))}
                                </p>
                            </div>
                            <div className="text-5xl opacity-20">📤</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-semibold">Tổng còn lại</p>
                                <p className="text-3xl font-bold mt-2">
                                    {formatCurrency(fundSources.reduce((sum, fs) => sum + fs.remaining_amount, 0))}
                                </p>
                            </div>
                            <div className="text-5xl opacity-20">✅</div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    Đang tải dữ liệu...
                </div>
            ) : fundSources.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">
                    <span className="material-symbols-outlined text-4xl mb-2 text-gray-400">info</span>
                    <p>Chưa có nguồn kinh phí nào cho năm {fiscalYear}</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã nguồn</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên nguồn</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dự toán</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đã dùng</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Còn lại</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {fundSources.map((fs) => {
                                const usagePercent = calculateUsagePercent(fs.spent_amount, fs.allocated_amount);
                                return (
                                    <tr key={fs.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fs.code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fs.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {getTypeLabel(fs.type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                                            {formatCurrency(fs.allocated_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                                            {formatCurrency(fs.spent_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                                            {formatCurrency(fs.remaining_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="w-full max-w-xs">
                                                <div className="flex mb-1 items-center justify-between">
                                                    <span className="text-xs font-semibold inline-block text-blue-600">
                                                        {usagePercent}%
                                                    </span>
                                                </div>
                                                <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
                                                    <div
                                                        style={{ width: `${usagePercent}%` }}
                                                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <button onClick={() => handleEdit(fs)} className="text-indigo-600 hover:text-indigo-900 mr-3">Sửa</button>
                                            <button onClick={() => handleDelete(fs.id, fs.name)} className="text-red-600 hover:text-red-900">Xóa</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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

        case 'list': return renderFundList();
        case 'budget': return <BudgetEstimateModule subView="list" onSetHeader={onSetHeader} />;
        case 'adjustment': return <BudgetEstimateModule subView="adjustment" onSetHeader={onSetHeader} />;
        case 'allocation': return <BudgetAllocationModule />;
        case 'infrastructure': return renderPlaceholder('Tài sản Hạ tầng', 'Vui lòng truy cập menu "Tài sản" để quản lý chi tiết.');
        case 'off_balance': return renderPlaceholder('Tài khoản Ngoài bảng', 'Theo dõi TK 008, 009, 012, 014, 018.');
        case 'reports': return renderPlaceholder('Báo cáo Nguồn kinh phí', 'Vui lòng truy cập menu "Báo cáo" để xem B01/BCQT và B03/HD.');
        default: return renderFundList();
    }
};

export default FundSourceModule;
