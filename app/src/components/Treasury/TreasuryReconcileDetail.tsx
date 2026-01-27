import React, { useState, useEffect } from 'react';
import { treasuryService } from '../../api'; // Import API service

// Types
export interface ReconcileItem {
    id: string; // Voucher ID or Ref No
    date: string;
    description: string;
    localAmount: number;
    treasuryAmount: number;
    diff: number;
    status: 'matched' | 'unmatched_local' | 'unmatched_treasury' | 'diff_amount';
    notes?: string;
}

interface TreasuryReconcileDetailProps {
    onBack: () => void;
}

export const TreasuryReconcileDetail: React.FC<TreasuryReconcileDetailProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<ReconcileItem[]>([]);
    const [filter, setFilter] = useState<'all' | 'diff'>('diff');

    // Fetch reconciliation details from API
    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                // Hardcoded fiscal month for now, could be passed as prop later
                const res = await treasuryService.getReconciliationDetail('2023-10');
                if (res.data.success) {
                    setItems(res.data.data);
                }
            } catch (error) {
                console.error('Failed to load reconciliation details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, []);

    const filteredItems = filter === 'all'
        ? items
        : items.filter(i => i.status !== 'matched');

    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'matched': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Khớp đúng</span>;
            case 'unmatched_local': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Chỉ có tại đơn vị</span>;
            case 'unmatched_treasury': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Chỉ có tại KBNN</span>;
            case 'diff_amount': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Sai lệch số tiền</span>;
            default: return null;
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-200 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Đối chiếu số liệu với KBNN</h1>
                        <p className="text-sm text-gray-500">Kỳ đối chiếu: Tháng 10/2023</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium flex items-center shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg mr-2">print</span> In biên bản
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center shadow-sm">
                        <span className="material-symbols-outlined text-lg mr-2">check_circle</span> Xác nhận đối chiếu
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm mb-1">Tổng chi tại Đơn vị</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(items.reduce((sum, i) => sum + i.localAmount, 0))}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm mb-1">Tổng chi tại KBNN</div>
                    <div className="text-xl font-bold text-blue-700">{formatCurrency(items.reduce((sum, i) => sum + i.treasuryAmount, 0))}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm mb-1">Chênh lệch</div>
                    <div className={`text-xl font-bold ${items.some(i => i.diff !== 0) ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(items.reduce((sum, i) => sum + i.diff, 0))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm mb-1">Trạng thái</div>
                    <div className="font-medium text-amber-600">Chưa xác nhận</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setFilter('diff')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'diff' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Chỉ hiện sai lệch
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Tất cả giao dịch
                        </button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-gray-400">search</span>
                        <input type="text" placeholder="Tìm kiếm chứng từ..." className="text-sm border-none focus:ring-0 bg-transparent" />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày CT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số CT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diễn giải</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền (Đơn vị)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền (KBNN)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chênh lệch</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                                            <p>Đang tải dữ liệu đối chiếu...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <span className="material-symbols-outlined text-4xl mb-2 text-gray-300 block">assignment_turned_in</span>
                                        Không tìm thấy dữ liệu nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.description}>{item.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{new Intl.NumberFormat('vi-VN').format(item.localAmount)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{new Intl.NumberFormat('vi-VN').format(item.treasuryAmount)}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${item.diff !== 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                            {item.diff !== 0 ? new Intl.NumberFormat('vi-VN').format(Math.abs(item.diff)) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {item.status !== 'matched' && (
                                                <button className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full">
                                                    Xử lý <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {/* Footer Summary Row */}
                        {!loading && filteredItems.length > 0 && (
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-900">Tổng cộng:</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                                        {formatCurrency(filteredItems.reduce((sum, i) => sum + i.localAmount, 0))}
                                    </td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                                        {formatCurrency(filteredItems.reduce((sum, i) => sum + i.treasuryAmount, 0))}
                                    </td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-red-600">
                                        {formatCurrency(filteredItems.reduce((sum, i) => sum + i.diff, 0))}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};
