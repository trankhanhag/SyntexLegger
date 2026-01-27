import React, { useEffect, useState } from 'react';
import { treasuryService } from '../../api';
import { TreasuryStats } from './TreasuryStats';
import { ReconciliationCard } from './ReconciliationCard';
import { PaymentOrdersTable } from './PaymentOrdersTable';
import { TreasuryImportModal } from './TreasuryImportModal'; // Import Modal
import { XmlExportModal } from './XmlExportModal'; // XML Export Modal

// --- Types ---
import { TreasuryReconcileDetail } from './TreasuryReconcileDetail';

// --- Types ---
interface DashboardData {
    connectionStatus: boolean;
    budgetData: {
        regularBudget: { allocated: number; used: number };
        irregularBudget: { allocated: number; used: number };
    };
    reconciliationData: {
        matched: number;
        unmatched: number;
        discrepancies: number;
        status: 'matched' | 'warning' | 'error';
    };
    recentOrders: any[];
}

export const TreasuryDashboard: React.FC<{ subView?: string; onNavigate?: (view: string) => void }> = ({ subView, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData>({
        connectionStatus: false,
        budgetData: {
            regularBudget: { allocated: 0, used: 0 },
            irregularBudget: { allocated: 0, used: 0 }
        },
        reconciliationData: {
            matched: 0,
            unmatched: 0,
            discrepancies: 0,
            status: 'matched'
        },
        recentOrders: []
    });
    const [lastImportDate, setLastImportDate] = useState<string | null>(null);
    const [showImportModal, setShowImportModal] = useState(false); // State for modal
    const [showXmlExportModal, setShowXmlExportModal] = useState(false); // State for XML Export modal

    // --- Effects ---
    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Auto-open modal if subView is 'import'
    useEffect(() => {
        if (subView === 'import') {
            setShowImportModal(true);
        }
    }, [subView]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Parallel data fetching for efficiency
            const [connectionRes, budgetRes, reconciliationRes, ordersRes] = await Promise.allSettled([
                treasuryService.testConnection(),
                treasuryService.getBudgetAllocation({ fiscalYear: new Date().getFullYear().toString(), budgetType: 'all' }),
                treasuryService.getReconciliationDetail(new Date().toISOString().slice(0, 7)),
                treasuryService.getPaymentOrderStatus('recent') // Fetch recent orders, backend needs support or param
            ]);

            // Process results
            const connectionPayload = connectionRes.status === 'fulfilled' ? connectionRes.value.data : null;
            const isConnected = Boolean(connectionPayload?.success && connectionPayload?.data?.connected);

            const budgetPayload = budgetRes.status === 'fulfilled' ? budgetRes.value.data : null;
            const budget = budgetPayload?.success
                ? budgetPayload.data
                : { regularBudget: { allocated: 0, used: 0 }, irregularBudget: { allocated: 0, used: 0 } };

            const reconciliationPayload = reconciliationRes.status === 'fulfilled' ? reconciliationRes.value.data : null;
            let reconciliationData: { matched: number; unmatched: number; discrepancies: number; status: 'warning' | 'matched' } = { matched: 0, unmatched: 0, discrepancies: 0, status: 'warning' };
            if (reconciliationPayload?.success) {
                const payloadData = reconciliationPayload.data;
                if (Array.isArray(payloadData)) {
                    const matched = payloadData.filter((item: any) => item.status === 'matched').length;
                    const unmatched = payloadData.filter((item: any) => String(item.status || '').includes('unmatched')).length;
                    const discrepancies = payloadData.filter((item: any) => item.status === 'diff_amount' || (item.diff && Number(item.diff) !== 0)).length;
                    reconciliationData = {
                        matched,
                        unmatched,
                        discrepancies,
                        status: discrepancies > 0 ? 'warning' : 'matched'
                    };
                } else if (payloadData && typeof payloadData === 'object') {
                    reconciliationData = payloadData;
                }
            }

            const ordersPayload = ordersRes.status === 'fulfilled' ? ordersRes.value.data : null;
            const orders = Array.isArray(ordersPayload?.data)
                ? ordersPayload.data
                : Array.isArray(ordersPayload)
                    ? ordersPayload
                    : [];

            setData({
                connectionStatus: isConnected,
                budgetData: budget,
                reconciliationData,
                recentOrders: orders
            });

        } catch (error) {
            console.error("Failed to load treasury dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async () => {
        // Navigate to Detailed Reconciliation View
        if (onNavigate) {
            onNavigate('treasury_reconcile_detail');
        }
    };

    // Render Sub-Views
    if (subView === 'payment_order') {
        return (
            <div className="p-6 bg-gray-50 min-h-screen font-sans">
                <div className="flex items-center mb-6">
                    <button onClick={() => onNavigate && onNavigate('treasury')} className="mr-4 text-gray-500 hover:text-blue-600">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Danh sách Lệnh chi tiền</h1>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex justify-between">
                    {/* Filters Mock */}
                    <div className="flex gap-4">
                        <input type="text" placeholder="Tìm kiếm chứng từ..." className="border rounded-md px-3 py-2 text-sm w-64" />
                        <select className="border rounded-md px-3 py-2 text-sm">
                            <option>Tất cả trạng thái</option>
                            <option>Đang xử lý</option>
                            <option>Hoàn thành</option>
                        </select>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">add</span> Tạo lệnh chi
                    </button>
                </div>
                <PaymentOrdersTable orders={data.recentOrders} loading={loading} />
            </div>
        );
    }

    if (subView === 'reconcile') {
        return (
            <div className="p-6 bg-gray-50 min-h-screen font-sans">
                <div className="flex items-center mb-6">
                    <button onClick={() => onNavigate && onNavigate('treasury')} className="mr-4 text-gray-500 hover:text-blue-600">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Đối chiếu số dư Kho bạc</h1>
                </div>
                <div className="max-w-4xl mx-auto">
                    <ReconciliationCard data={data.reconciliationData} loading={loading} onReconcile={handleReconcile} />

                    <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Lịch sử đối chiếu</h3>
                        <div className="text-center text-gray-500 py-8">
                            Chưa có dữ liệu lịch sử đối chiếu.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (subView === 'reconcile_detail') {
        return <TreasuryReconcileDetail onBack={() => onNavigate && onNavigate('treasury_reconcile')} />;
    }

    // Default View: Dashboard
    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-4">
                    <div className="bg-blue-900 p-2 rounded-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">HỆ THỐNG KẾT NỐI KBNN</h1>
                </div>

                <div>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="mr-4 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 shadow-sm transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">download</span>
                            Nhận số liệu KBNN
                        </span>
                    </button>
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-800`}>
                        <span className={`material-symbols-outlined text-lg mr-2`}>upload_file</span>
                        {lastImportDate ? `Số liệu ngày: ${lastImportDate}` : 'Chế độ Nhập file XML/Excel'}
                    </span>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Column 1: Budget Stats */}
                <TreasuryStats data={data.budgetData} loading={loading} />

                {/* Column 2: Reconciliation Status */}
                <ReconciliationCard data={data.reconciliationData} loading={loading} onReconcile={handleReconcile} />

                {/* Column 3: Stats/Info (Optional or Empty for now, maybe Quick Actions?) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Thao tác nhanh</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => onNavigate && onNavigate('treasury_payment_order')}
                            className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors group">
                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 text-blue-600 mr-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Tạo lệnh chi mới</div>
                                <div className="text-xs text-gray-500">Lập giấy rút dự toán/UNC</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setShowXmlExportModal(true)}
                            className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 text-indigo-600 mr-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Xuất XML → DVC</div>
                                <div className="text-xs text-gray-500">Tạo file XML upload lên Kho bạc</div>
                            </div>
                        </button>
                        <button
                            onClick={() => onNavigate && onNavigate('treasury_reconcile')}
                            className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors group">
                            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 text-purple-600 mr-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Tra cứu trạng thái</div>
                                <div className="text-xs text-gray-500">Kiểm tra trạng thái hồ sơ</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Payment Orders List */}
            <div className="grid grid-cols-1 gap-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Lệnh chi tiền gần đây</h3>
                    <button
                        onClick={() => onNavigate && onNavigate('treasury_payment_order')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Xem tất cả
                    </button>
                </div>
                <PaymentOrdersTable orders={data.recentOrders} loading={loading} />
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <TreasuryImportModal
                    onClose={() => {
                        setShowImportModal(false);
                        // If we are in 'import' subView, we might want to navigate back to dashboard
                        // or just stay here. Let's just close modal.
                        if (subView === 'import' && onNavigate) onNavigate('treasury');
                    }}
                    onSuccess={() => {
                        // Refresh data after import if needed
                        setLastImportDate(new Date().toLocaleDateString('vi-VN'));
                        fetchDashboardData();
                        if (subView === 'import' && onNavigate) onNavigate('treasury');
                    }}
                />
            )}

            {/* XML Export Modal */}
            {showXmlExportModal && (
                <XmlExportModal
                    onClose={() => setShowXmlExportModal(false)}
                    onSuccess={() => {
                        // Optionally refresh data or show notification
                    }}
                />
            )}
        </div>
    );
};
