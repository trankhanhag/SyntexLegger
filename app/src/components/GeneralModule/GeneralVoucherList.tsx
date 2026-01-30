import React, { useState, useMemo } from 'react';
import { useVouchers } from './hooks/useVouchers';
import { VoucherTableRow, VoucherTableHeader } from './VoucherTableRow';
import { VoucherFilters } from './VoucherFilters';
import { VoucherActions } from './VoucherActions';
import type { Voucher } from './types/voucher.types';

interface GeneralVoucherListProps {
    onEdit?: (voucher: Voucher) => void;
    onDelete?: (voucher: Voucher) => void;
    onDuplicate?: (voucher: Voucher) => void;
    onPost?: (vouchers: Voucher[]) => void;
    onImport?: () => void;
    onAdd?: () => void;
}

export const GeneralVoucherList: React.FC<GeneralVoucherListProps> = ({
    onEdit,
    onDelete,
    onDuplicate,
    onPost,
    onImport,
    onAdd // Add this to props deconstruction
}) => {
    const { vouchers, loading, error, filter, setFilter, refreshVouchers, deleteVoucher } = useVouchers();
    const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);

    // Handle selection
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Only select vouchers with valid IDs
            setSelectedVouchers(vouchers.map(v => v.id || '').filter(id => id !== ''));
        } else {
            setSelectedVouchers([]);
        }
    };

    const handleSelectOne = (voucher: Voucher, checked: boolean) => {
        if (!voucher.id) return;
        if (checked) {
            setSelectedVouchers(prev => [...prev, voucher.id!]);
        } else {
            setSelectedVouchers(prev => prev.filter(id => id !== voucher.id));
        }
    };

    const handleDelete = async (voucher: Voucher) => {
        if (!voucher.id) return;
        if (onDelete) {
            onDelete(voucher);
            return;
        }
        if (window.confirm(`Bạn có chắc muốn xóa chứng từ ${voucher.doc_no}?`)) {
            const success = await deleteVoucher(voucher.id);
            if (success) {
                // Optionally show a toast
                refreshVouchers();
            }
        }
    };

    // Calculate totals
    const totalAmount = useMemo(() => {
        return vouchers.reduce((sum, v) => sum + (v.total_amount || 0), 0);
    }, [vouchers]);

    return (
        <div className="flex flex-col h-full">
            {/* Filters & Actions */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex justify-between items-start">
                    <VoucherFilters filter={filter} onChange={setFilter} />
                    <VoucherActions
                        selectedCount={selectedVouchers.length}
                        onRefresh={refreshVouchers}
                        onImport={onImport}
                        onAdd={onAdd}
                        actions={[
                            ...(onPost ? [{
                                id: 'post',
                                label: 'Ghi sổ',
                                icon: 'check_circle',
                                onClick: () => {
                                    const selected = vouchers.filter(v => v.id && selectedVouchers.includes(v.id));
                                    if (selected.length > 0) onPost(selected);
                                },
                                disabled: selectedVouchers.length === 0,
                                primary: true
                            }] : [])
                        ]}
                    />
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
                {error && (
                    <div className="mx-4 mt-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-2 shrink-0">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
                                <VoucherTableHeader
                                    allSelected={vouchers.length > 0 && selectedVouchers.length === vouchers.length}
                                    onSelectAll={handleSelectAll}
                                    showCheckbox={true}
                                />
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Đang tải dữ liệu...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : vouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="material-symbols-outlined text-4xl opacity-50">inbox</span>
                                                <p>Không có dữ liệu chứng từ</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    vouchers.map(voucher => (
                                        <VoucherTableRow
                                            key={voucher.id || Math.random().toString()}
                                            voucher={voucher}
                                            selected={voucher.id ? selectedVouchers.includes(voucher.id) : false}
                                            onSelect={(v, checked) => handleSelectOne(v, checked)}
                                            onEdit={onEdit}
                                            onDelete={handleDelete}
                                            onDuplicate={onDuplicate}
                                            locked={voucher.status === 'posted'}
                                        />
                                    ))
                                )}
                            </tbody>
                            {vouchers.length > 0 && (
                                <tfoot className="bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                                    <tr>
                                        <td colSpan={6} className="px-4 py-3 text-right">Tổng cộng:</td>
                                        <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400 font-mono">
                                            {new Intl.NumberFormat('vi-VN').format(totalAmount)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
            </div>
        </div>
    );
};
