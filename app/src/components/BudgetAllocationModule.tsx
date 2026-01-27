import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Interfaces based on updated schema
// FundSource interface is reserved for future use

interface BudgetEstimate {
    id: string;
    chapter_code: string;
    item_code: string;
    item_name: string;
    allocated_amount: number;
    remaining_amount: number;
    fund_source_id: string;
    fiscal_year: number;
}

interface BudgetAllocation {
    id: string;
    budget_estimate_id: string;
    department_code: string;
    department_name: string;
    project_code?: string;
    allocated_amount: number;
    spent_amount: number;
    effective_from: string;
    created_at: string;
}

const API_BASE = 'http://localhost:3000/api/hcsn';

const BudgetAllocationModule: React.FC<{ subView?: string, onNavigate?: (view: string) => void, onSetHeader?: any }> = ({ subView: _subView, onNavigate: _onNavigate, onSetHeader }) => {
    const [view, setView] = useState<'list' | 'create'>('list');
    const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
    const [estimates, setEstimates] = useState<BudgetEstimate[]>([]);
    const [departments] = useState<{ code: string, name: string }[]>([
        { code: 'PB01', name: 'Phòng Hành chính - Tổ chức' },
        { code: 'PB02', name: 'Phòng Kế hoạch - Tài chính' },
        { code: 'PB03', name: 'Phòng Đào tạo' },
        { code: 'PB04', name: 'Phòng Công tác HSSV' }
    ]);

    // Form State
    const [formData, setFormData] = useState({
        budget_estimate_id: '',
        department_code: '',
        project_code: '',
        allocated_amount: 0,
        notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAllocations();
        fetchEstimates();
    }, []);

    useEffect(() => {
        if (onSetHeader) {
            if (view === 'list') {
                onSetHeader({
                    title: 'Phân bổ Dự toán',
                    icon: 'pie_chart',
                    actions: [
                        { label: 'Phân bổ mới', icon: 'add', onClick: () => setView('create'), primary: true },
                        { label: 'Làm mới', icon: 'refresh', onClick: fetchAllocations }
                    ]
                });
            } else {
                onSetHeader({
                    title: 'Tạo mới Phân bổ',
                    icon: 'add_circle',
                    actions: [
                        { label: 'Quay lại', icon: 'arrow_back', onClick: () => setView('list') }
                    ]
                });
            }
        }
    }, [view, onSetHeader]);

    const fetchAllocations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE}/budget-allocations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllocations(res.data.data || []);
        } catch (err) {
            console.error(err);
            setError('Không thể tải danh sách phân bổ');
        } finally {
            setLoading(false);
        }
    };

    const fetchEstimates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE}/budget-estimates?status=APPROVED`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEstimates(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');

            // Find department name
            const dept = departments.find(d => d.code === formData.department_code);
            const payload = {
                ...formData,
                department_name: dept ? dept.name : ''
            };

            await axios.post(`${API_BASE}/budget-allocations`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setView('list');
            fetchAllocations();
            // Reset form
            setFormData({
                budget_estimate_id: '',
                department_code: '',
                project_code: '',
                allocated_amount: 0,
                notes: ''
            });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Lỗi khi tạo phân bổ');
        } finally {
            setLoading(false);
        }
    };

    const renderList = () => (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Toolbar */}
            <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Đơn vị nhận:</span>
                    <select className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:border-slate-600 outline-none">
                        <option value="">Tất cả đơn vị</option>
                        {departments.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </select>
                </div>
                <div className="text-sm font-bold text-blue-600">
                    Tổng phân bổ: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(allocations.reduce((acc, curr) => acc + curr.allocated_amount, 0))}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 overflow-hidden relative">
                <div className="overflow-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiểu mục</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị nhận</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền phân bổ</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đã sử dụng</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Còn lại</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày hiệu lực</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {allocations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 italic">
                                        Chưa có dữ liệu phân bổ
                                    </td>
                                </tr>
                            ) : allocations.map((item) => {
                                // Find related estimate info for display if needed
                                return (
                                    <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {estimates.find(e => e.id === item.budget_estimate_id)?.item_code || item.budget_estimate_id}
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                                {estimates.find(e => e.id === item.budget_estimate_id)?.item_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {item.department_name}
                                            {item.project_code && <span className="block text-xs text-blue-500">DA: {item.project_code}</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.allocated_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.spent_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600 dark:text-green-400">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.allocated_amount - item.spent_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(item.effective_from || item.created_at).toLocaleDateString('vi-VN')}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderCreateForm = () => {
        const selectedEstimate = estimates.find(e => e.id === formData.budget_estimate_id);
        const maxAmount = selectedEstimate ? selectedEstimate.remaining_amount : 0;

        return (
            <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 max-w-3xl mx-auto">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">add_circle</span>
                        Tạo mới Phân bổ Ngân sách
                    </h3>

                    {error && (
                        <div className="mb-4 bg-red-50 p-3 rounded-md border border-red-200 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn dự toán (Đã duyệt)</label>
                            <select
                                required
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                                value={formData.budget_estimate_id}
                                onChange={(e) => setFormData({ ...formData, budget_estimate_id: e.target.value })}
                            >
                                <option value="">-- Chọn khoản dự toán --</option>
                                {estimates.map(est => (
                                    <option key={est.id} value={est.id}>
                                        [{est.item_code}] {est.item_name} - Còn lại: {new Intl.NumberFormat('vi-VN').format(est.remaining_amount)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban / Đơn vị</label>
                                <select
                                    required
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                                    value={formData.department_code}
                                    onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                                >
                                    <option value="">-- Chọn phòng ban --</option>
                                    {departments.map(dept => (
                                        <option key={dept.code} value={dept.code}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dự án (Tùy chọn)</label>
                                <input
                                    type="text"
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                                    placeholder="Mã dự án..."
                                    value={formData.project_code}
                                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền phân bổ</label>
                            <input
                                type="number"
                                required
                                min="0"
                                max={maxAmount}
                                className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border ${formData.allocated_amount > maxAmount ? 'border-red-500' : ''}`}
                                value={formData.allocated_amount}
                                onChange={(e) => setFormData({ ...formData, allocated_amount: Number(e.target.value) })}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Tối đa khả dụng: {new Intl.NumberFormat('vi-VN').format(maxAmount)}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                            <textarea
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={loading || formData.allocated_amount <= 0 || formData.allocated_amount > maxAmount}
                                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
                            >
                                {loading ? 'Đang xử lý...' : 'Xác nhận Phân bổ'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full">
            {view === 'list' ? renderList() : renderCreateForm()}
        </div>
    );
};

export default BudgetAllocationModule;
