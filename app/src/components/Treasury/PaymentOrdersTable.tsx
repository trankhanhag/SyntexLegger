import React from 'react';

interface Order {
    id: string;
    requestDate: string;
    description: string;
    amount: number;
    status: string;
}

interface OrdersTableProps {
    orders: Order[];
    loading?: boolean;
}

export const PaymentOrdersTable: React.FC<OrdersTableProps> = ({ orders, loading }) => {
    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN');

    const getStatusColor = (status: string) => {
        if (!status) return 'bg-gray-100 text-gray-800';
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'processing': return 'bg-yellow-100 text-yellow-800';
            case 'draft': return 'bg-gray-100 text-gray-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-blue-100 text-blue-800'; // Submitted, etc
        }
    };

    const getStatusText = (status: string) => {
        if (!status) return 'N/A';
        switch (status.toLowerCase()) {
            case 'completed': return 'Hoàn thành';
            case 'processing': return 'Đang xử lý';
            case 'draft': return 'Nháp';
            case 'rejected': return 'Từ chối';
            case 'submitted': return 'Đã gửi';
            default: return status;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Lệnh chi tiền gần đây</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã lệnh</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                        ) : (orders || []).length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Chưa có lệnh chi nào</td></tr>
                        ) : (
                            (orders || []).map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.requestDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatCurrency(order.amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
