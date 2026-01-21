import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3005/api/hcsn';

interface BudgetEstimate {
    id: string;
    fiscal_year: number;
    fund_source_id: string;
    fund_source_name?: string;
    chapter_code: string;
    item_code: string;
    item_name: string;
    allocated_amount: number;
    spent_amount: number;
    remaining_amount: number;
    version: number;
    parent_id?: string;
    adjustment_reason?: string;
    status: string;
    approved_by?: string;
    approved_date?: string;
    created_at: string;
}

interface BudgetItem {
    item_code: string;
    item_name: string;
    allocated_amount: number;
}

const BudgetEstimateModule: React.FC<{ subView?: string, onSetHeader?: any }> = ({ subView = 'list', onSetHeader }) => {
    const [budgets, setBudgets] = useState<BudgetEstimate[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [selectedChapter, setSelectedChapter] = useState('018');

    const [formData, setFormData] = useState({
        fiscal_year: new Date().getFullYear(),
        fund_source_id: '',
        chapter_code: '018',
        items: [] as BudgetItem[]
    });

    const [adjustData, setAdjustData] = useState({
        id: '',
        item_name: '',
        item_code: '',
        old_amount: 0,
        new_amount: 0,
        reason: ''
    });

    const [showAdjustForm, setShowAdjustForm] = useState(false);
    const [selectedBudgetHistory, setSelectedBudgetHistory] = useState<BudgetEstimate[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const token = localStorage.getItem('token');
    const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    // Mã chương theo TT 24/2024
    const CHAPTERS = [
        { code: '018', name: 'Giáo dục phổ thông và GD thường xuyên' },
        { code: '030', name: 'Y tế' },
        { code: '040', name: 'Văn hóa thông tin' },
        { code: '050', name: 'KH&CN, MT&TG' },
        { code: '060', name: 'NNPTNT, Thủy lợi' }
    ];

    // Mã tiểu mục phổ biến
    const BUDGET_ITEMS = [
        { code: '511', name: 'Lương và phụ cấp' },
        { code: '521', name: 'Bảo hiểm xã hội, bảo hiểm y tế' },
        { code: '523', name: 'Kinh phí công đoàn' },
        { code: '530', name: 'Chi thường xuyên khác' },
        { code: '611', name: 'Mua sắm tài sản cố định' },
        { code: '621', name: 'Xây dựng cơ bản' },
        { code: '630', name: 'Chi đầu tư khác' }
    ];

    useEffect(() => {
        if (subView === 'list' || subView === 'adjustment') {
            loadBudgets();
        }

        if (onSetHeader) {
            if (subView === 'list') {
                onSetHeader({
                    title: 'Lập dự toán Ngân sách',
                    icon: 'edit_note',
                    actions: [
                        { label: 'Lập dự toán', icon: 'add', onClick: () => setShowForm(true), primary: true },
                        { label: 'Hướng dẫn', icon: 'help', onClick: () => alert('Chọn tiểu mục đã Phê duyệt để thực hiện Điều chỉnh.') }
                    ]
                });
            } else if (subView === 'adjustment') {
                onSetHeader({
                    title: 'Điều chỉnh dự toán',
                    icon: 'tune',
                    actions: [
                        { label: 'Về danh sách gốc', icon: 'arrow_back', onClick: () => window.history.back() }
                    ]
                });
            }
        }
    }, [fiscalYear, selectedChapter, subView, onSetHeader]);

    const loadBudgets = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE}/budget-estimates?fiscal_year=${fiscalYear}&chapter_code=${selectedChapter}`,
                axiosConfig
            );
            setBudgets(res.data.data || []);
        } catch (err: any) {
            console.error('Error loading budgets:', err);
        } finally {
            setLoading(false);
        }
    };

    const getLatestBudgets = () => {
        const itemGroups: { [key: string]: BudgetEstimate } = {};
        budgets.forEach(b => {
            const key = `${b.chapter_code}-${b.item_code}`;
            if (!itemGroups[key] || b.version > itemGroups[key].version) {
                itemGroups[key] = b;
            }
        });
        return Object.values(itemGroups);
    };

    const getAdjustedBudgets = () => {
        return budgets.filter(b => b.version > 1);
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { item_code: '', item_name: '', allocated_amount: 0 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index: number, field: keyof BudgetItem, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.items.length === 0) {
            alert('Vui lòng thêm ít nhất 1 tiểu mục dự toán!');
            return;
        }

        try {
            await axios.post(`${API_BASE}/budget-estimates`, formData, axiosConfig);
            alert('Lập dự toán thành công!');
            setShowForm(false);
            setFormData({
                fiscal_year: new Date().getFullYear(),
                fund_source_id: '',
                chapter_code: '018',
                items: []
            });
            loadBudgets();
        } catch (err: any) {
            console.error('Error creating budget:', err);
            alert(err.response?.data?.error || 'Lỗi khi lập dự toán');
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Bạn có chắc muốn phê duyệt dự toán này?')) return;

        try {
            await axios.put(`${API_BASE}/budget-estimates/${id}/approve`, {}, axiosConfig);
            alert('Phê duyệt dự toán thành công!');
            loadBudgets();
        } catch (err: any) {
            console.error('Error approving budget:', err);
            alert(err.response?.data?.error || 'Lỗi khi phê duyệt');
        }
    };

    const handleAdjustClick = (budget: BudgetEstimate) => {
        setAdjustData({
            id: budget.id,
            item_name: budget.item_name,
            item_code: budget.item_code,
            old_amount: budget.allocated_amount,
            new_amount: budget.allocated_amount,
            reason: ''
        });
        setShowAdjustForm(true);
    };

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/budget-estimates/${adjustData.id}/adjust`, {
                adjustment_reason: adjustData.reason,
                new_allocated_amount: adjustData.new_amount
            }, axiosConfig);
            alert('Tạo bản điều chỉnh dự toán thành công! Vui lòng phê duyệt bản mới.');
            setShowAdjustForm(false);
            loadBudgets();
        } catch (err: any) {
            console.error('Error adjusting budget:', err);
            alert(err.response?.data?.error || 'Lỗi khi điều chỉnh dự toán');
        }
    };

    const viewHistory = (itemCode: string) => {
        const history = budgets
            .filter(b => b.item_code === itemCode)
            .sort((a, b) => b.version - a.version);
        setSelectedBudgetHistory(history);
        setShowHistory(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: 'bg-gray-200 text-gray-800',
            APPROVED: 'bg-green-200 text-green-800',
            EXECUTING: 'bg-blue-200 text-blue-800',
            CLOSED: 'bg-red-200 text-red-800'
        };
        const labels = {
            DRAFT: 'Soạn thảo',
            APPROVED: 'Đã duyệt',
            EXECUTING: 'Đang thực hiện',
            CLOSED: 'Đã đóng'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        );
    };

    const calculateUsagePercent = (spent: number, allocated: number) => {
        if (allocated === 0) return 0;
        return Math.round((spent / allocated) * 100);
    };

    // MAIN RENDER
    const renderBudgetList = () => (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dự toán Ngân sách HCSN</h1>
                    <p className="text-gray-600 mt-1">Lập và quản lý dự toán chi tiết theo chương/tiểu mục (TT 24/2024)</p>
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
                    <select
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {CHAPTERS.map(ch => (
                            <option key={ch.code} value={ch.code}>{ch.code} - {ch.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
                    >
                        + Lập dự toán
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {budgets.length > 0 && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-semibold">Tổng Dự toán</p>
                                <p className="text-3xl font-bold mt-2">
                                    {formatCurrency(budgets.reduce((sum, b) => sum + b.allocated_amount, 0))}
                                </p>
                            </div>
                            <div className="text-5xl opacity-20">📊</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-semibold">Đã thực hiện</p>
                                <p className="text-3xl font-bold mt-2">
                                    {formatCurrency(budgets.reduce((sum, b) => sum + b.spent_amount, 0))}
                                </p>
                            </div>
                            <div className="text-5xl opacity-20">💸</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-semibold">Còn lại</p>
                                <p className="text-3xl font-bold mt-2">
                                    {formatCurrency(budgets.reduce((sum, b) => sum + b.remaining_amount, 0))}
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
            ) : budgets.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">
                    <span className="material-symbols-outlined text-4xl mb-2 text-gray-400">info</span>
                    <p>Chưa có dự toán nào cho Chương {selectedChapter} năm {fiscalYear}</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã TM</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên tiểu mục</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dự toán</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đã chi</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Còn lại</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tỷ lệ</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ver</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {getLatestBudgets().map((budget) => {
                                const usagePercent = calculateUsagePercent(budget.spent_amount, budget.allocated_amount);
                                return (
                                    <tr key={budget.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{budget.item_code}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{budget.item_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                                            {formatCurrency(budget.allocated_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                                            {formatCurrency(budget.spent_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                                            {formatCurrency(budget.remaining_amount)}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                            <span className="font-semibold text-gray-700">v{budget.version}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {getStatusBadge(budget.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            {budget.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleApprove(budget.id)}
                                                    className="text-green-600 hover:text-green-900 mr-3"
                                                    title="Phê duyệt"
                                                >
                                                    <span className="material-symbols-outlined">check_circle</span>
                                                </button>
                                            )}
                                            {budget.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleAdjustClick(budget)}
                                                    className="text-orange-600 hover:text-orange-900 mr-3"
                                                    title="Điều chỉnh"
                                                >
                                                    <span className="material-symbols-outlined">edit_note</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => viewHistory(budget.item_code)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Lịch sử phiên bản"
                                            >
                                                <span className="material-symbols-outlined">history</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl my-8">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-900">Lập Dự toán Ngân sách</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Năm ngân sách</label>
                                        <input
                                            type="number"
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                            value={formData.fiscal_year}
                                            onChange={(e) => setFormData({ ...formData, fiscal_year: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mã chương</label>
                                        <select
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                            value={formData.chapter_code}
                                            onChange={(e) => setFormData({ ...formData, chapter_code: e.target.value })}
                                        >
                                            {CHAPTERS.map(ch => (
                                                <option key={ch.code} value={ch.code}>{ch.code} - {ch.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tiểu mục dự toán</label>
                                    <div className="max-h-60 overflow-y-auto pr-2">
                                        {formData.items.map((item, index) => (
                                            <div key={index} className="flex gap-2 mb-2 p-2 bg-gray-50 rounded-md">
                                                <select
                                                    className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                                    value={item.item_code}
                                                    onChange={(e) => {
                                                        const selectedItem = BUDGET_ITEMS.find(i => i.code === e.target.value);
                                                        handleItemChange(index, 'item_code', e.target.value);
                                                        handleItemChange(index, 'item_name', selectedItem?.name || '');
                                                    }}
                                                >
                                                    <option value="">-- Chọn tiểu mục --</option>
                                                    {BUDGET_ITEMS.map(bi => (
                                                        <option key={bi.code} value={bi.code}>{bi.code} - {bi.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    placeholder="Số tiền"
                                                    className="w-48 border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                                    value={item.allocated_amount}
                                                    onChange={(e) => handleItemChange(index, 'allocated_amount', Number(e.target.value))}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-medium flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span> Thêm tiểu mục
                                    </button>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
                                >
                                    Lưu dự toán
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjustment Modal */}
            {showAdjustForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md my-8">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-900">Điều chỉnh Dự toán</h3>
                            <button onClick={() => setShowAdjustForm(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAdjustSubmit}>
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800 font-semibold">{adjustData.item_code} - {adjustData.item_name}</p>
                                    <p className="text-xs text-blue-600 mt-1">Dự toán hiện tại: {formatCurrency(adjustData.old_amount)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Số tiền mới (VND)</label>
                                    <input
                                        type="number"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                        value={adjustData.new_amount}
                                        onChange={(e) => setAdjustData({ ...adjustData, new_amount: Number(e.target.value) })}
                                    />
                                    <p className={`text-xs mt-1 font-semibold ${adjustData.new_amount > adjustData.old_amount ? 'text-green-600' : adjustData.new_amount < adjustData.old_amount ? 'text-red-600' : 'text-gray-500'}`}>
                                        Chênh lệch: {formatCurrency(adjustData.new_amount - adjustData.old_amount)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Lý do điều chỉnh</label>
                                    <textarea
                                        required
                                        rows={3}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Nhập lý do điều chỉnh..."
                                        value={adjustData.reason}
                                        onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAdjustForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 shadow-sm"
                                >
                                    Xác nhận Điều chỉnh
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl my-8">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Lịch sử Phiên bản</h3>
                                <p className="text-sm text-gray-500">{selectedBudgetHistory[0]?.item_code} - {selectedBudgetHistory[0]?.item_name}</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Phiên bản</th>
                                        <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Số tiền</th>
                                        <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Trạng thái</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Lý do điều chỉnh</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Ngày tạo</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                    {selectedBudgetHistory.map((h, idx) => (
                                        <tr key={h.id} className={idx === 0 ? 'bg-blue-50 font-semibold' : ''}>
                                            <td className="px-4 py-3">v{h.version}{idx === 0 ? ' (Hiện tại)' : ''}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(h.allocated_amount)}</td>
                                            <td className="px-4 py-3 text-center">{getStatusBadge(h.status)}</td>
                                            <td className="px-4 py-3 text-gray-600">{h.adjustment_reason || '-'}</td>
                                            <td className="px-4 py-3">{new Date(h.created_at).toLocaleDateString('vi-VN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowHistory(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderAdjustmentView = () => (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Lịch sử Điều chỉnh Dự toán</h1>
                    <p className="text-gray-600 mt-1">Theo dõi các phiên bản thay đổi ngân sách theo thời gian</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">info</span>
                        <span className="text-sm text-blue-800">Để thực hiện điều chỉnh mới, hãy vào <strong>Lập dự toán</strong> và chọn mục đã <strong>Phê duyệt</strong>.</span>
                    </div>
                    <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(Number(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                        {[2024, 2025, 2026, 2027, 2028].map(year => (
                            <option key={year} value={year}>Năm {year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã TM</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên tiểu mục</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ver</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lý do điều chỉnh</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày điều chỉnh</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {getAdjustedBudgets().map((budget) => (
                            <tr key={budget.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{budget.item_code}</td>
                                <td className="px-6 py-4 text-sm">{budget.item_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">v{budget.version}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">{formatCurrency(budget.allocated_amount)}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{budget.adjustment_reason}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(budget.created_at).toLocaleDateString('vi-VN')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <button onClick={() => viewHistory(budget.item_code)} className="text-indigo-600 hover:text-indigo-900">Chi tiết</button>
                                </td>
                            </tr>
                        ))}
                        {getAdjustedBudgets().length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                    Chưa có dữ liệu điều chỉnh nào được ghi nhận.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Main render switch
    switch (subView) {
        case 'list':
            return renderBudgetList();
        case 'adjustment':
            return renderAdjustmentView();
        default:
            return renderBudgetList();
    }
};

export default BudgetEstimateModule;
