import React from 'react';

interface ReconciliationProps {
    data: {
        matched: number;
        unmatched: number;
        discrepancies: number;
        status: 'matched' | 'warning' | 'error';
    };
    loading?: boolean;
    onReconcile: () => void;
}

export const ReconciliationCard: React.FC<ReconciliationProps> = ({ data, loading, onReconcile }) => {
    // Defensive stats
    const stats = data || { matched: 0, unmatched: 0, discrepancies: 0 };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Đối chiếu TABMIS</h3>

            <div className="flex justify-around items-center mb-6 flex-grow">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2 text-green-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{loading ? '-' : stats.matched}</div>
                    <div className="text-xs text-gray-500">Matched</div>
                </div>

                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2 text-yellow-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{loading ? '-' : stats.unmatched}</div>
                    <div className="text-xs text-gray-500">Unmatched</div>
                </div>

                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2 text-red-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{loading ? '-' : stats.discrepancies}</div>
                    <div className="text-xs text-gray-500">Discrepancies</div>
                </div>
            </div>

            <button
                onClick={onReconcile}
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
                {loading ? 'Đang đối chiếu...' : 'Đối chiếu ngay'}
            </button>
        </div>
    );
};
