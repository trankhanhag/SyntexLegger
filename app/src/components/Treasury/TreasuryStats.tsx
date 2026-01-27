import React from 'react';

interface StatsProps {
    data: {
        regularBudget: { allocated: number; used: number };
        irregularBudget: { allocated: number; used: number };
    };
    loading?: boolean;
}

export const TreasuryStats: React.FC<StatsProps> = ({ data, loading }) => {
    if (loading) return <div className="animate-pulse h-48 bg-gray-100 rounded-lg"></div>;

    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // Calculate percentages
    const regularBudget = data?.regularBudget || { allocated: 0, used: 0 };
    const irregularBudget = data?.irregularBudget || { allocated: 0, used: 0 };

    const regularPercent = regularBudget.allocated ? (regularBudget.used / regularBudget.allocated) * 100 : 0;
    const irregularPercent = irregularBudget.allocated ? (irregularBudget.used / irregularBudget.allocated) * 100 : 0;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Dự toán Ngân sách</h3>

            {/* Chi thường xuyên */}
            <div className="mb-6">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Chi thường xuyên</span>
                    <span className="text-sm font-bold text-gray-800">
                        {Math.round(regularPercent)}% ({formatCurrency(regularBudget.used)} / {formatCurrency(regularBudget.allocated)})
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-teal-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(regularPercent, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Chi không thường xuyên */}
            <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Chi không thường xuyên</span>
                    <span className="text-sm font-bold text-gray-800">
                        {Math.round(irregularPercent)}% ({formatCurrency(irregularBudget.used)} / {formatCurrency(irregularBudget.allocated)})
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(irregularPercent, 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
