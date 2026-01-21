/**
 * GeneralModuleV2 - Refactored Version
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 * 
 * File này sử dụng các components đã tách ra modules riêng
 * để giảm kích thước bundle và cải thiện maintainability.
 * 
 * So với GeneralModule.tsx (3122 dòng), phiên bản này:
 * - Import từ modules riêng thay vì define inline
 * - Sử dụng hooks từ GeneralModule/hooks/
 * - Dễ maintain và test hơn
 */

import React, { useState, useEffect } from 'react';
import { Spreadsheet } from './Spreadsheet';
import { settingsService, voucherService } from '../api';
import OpeningBalance from './OpeningBalance';
import { type RibbonAction } from './Ribbon';
import { normalizeDateValue, toInputDateValue } from '../utils/dateUtils';

// === IMPORTS TỪ CÁC MODULES ĐÃ TÁCH ===
import { ClosingEntries } from './ClosingModule';
import { Allocation } from './AllocationModule';
import { Revaluation } from './RevaluationModule';
import { PeriodLock } from './GeneralModule/PeriodLock';
import { Reconciliation } from './GeneralModule/Reconciliation';
import { VoucherFilters } from './GeneralModule/VoucherFilters';
import { PostingModal } from './GeneralModule/PostingModal';
import { StagingArea } from './GeneralModule/StagingArea';
import { VoucherTableRow, VoucherTableHeader } from './GeneralModule/VoucherTableRow';
import type { VoucherFilter, Voucher } from './GeneralModule/types/voucher.types';
import { useVouchers } from './GeneralModule/hooks/useVouchers';
import { formatCurrency } from './GeneralModule/utils/voucher.utils';


interface GeneralModuleV2Props {
    subView: string;
    onCloseModal: () => void;
    printSignal: number;
    onSetHeader: (header: any) => void;
    navigationData?: any;
    onClearNavigation?: () => void;
}

/**
 * VoucherListV2 - Refactored VoucherList sử dụng hooks
 */
const VoucherListV2: React.FC<{
    onEdit: (v: Voucher) => void;
    onSelectionChange: (v: Voucher | null) => void;
    lockedUntil?: string;
    fromDate: string;
    toDate: string;
    voucherIds?: string[];
}> = ({ onEdit, onSelectionChange, lockedUntil, fromDate, toDate, voucherIds }) => {
    // Sử dụng custom hook thay vì inline logic
    const { vouchers, loading, error, refreshVouchers, deleteVoucher, setFilter } = useVouchers({
        fromDate,
        toDate,
        voucherIds
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Refresh khi filter thay đổi
    useEffect(() => {
        setFilter({ fromDate, toDate, voucherIds });
    }, [fromDate, toDate, voucherIds, setFilter]);

    const handleSelect = (voucher: Voucher, selected: boolean) => {
        const newSet = new Set(selectedIds);
        if (selected) {
            newSet.add(voucher.id || '');
        } else {
            newSet.delete(voucher.id || '');
        }
        setSelectedIds(newSet);

        // Single selection for onSelectionChange
        if (selected) {
            onSelectionChange(voucher);
        } else if (newSet.size === 0) {
            onSelectionChange(null);
        }
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectedIds(new Set(vouchers.map(v => v.id || '')));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleDelete = async (voucher: Voucher) => {
        const lockDate = voucher.post_date || voucher.doc_date;
        const isLocked = !!(lockedUntil && lockDate && normalizeDateValue(lockDate) <= normalizeDateValue(lockedUntil));

        if (isLocked) {
            alert("Chứng từ này đã nằm trong kỳ khóa sổ, không thể xóa.");
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa ${voucher.doc_no}?`)) return;

        try {
            await deleteVoucher(voucher.id || '');
            alert("Đã xóa thành công.");
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const totalAmount = vouchers.reduce((sum, v) => sum + (v.total_amount || 0), 0);
    const showLockColumn = !!lockedUntil;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Đang tải bảng kê...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500 text-center">
                    <span className="material-symbols-outlined text-4xl">error</span>
                    <p className="mt-2">{error}</p>
                    <button
                        onClick={() => refreshVouchers()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative">
            {/* Total Amount Summary */}
            <div className="absolute top-2 right-6 z-10 flex items-center gap-2">
                {voucherIds && voucherIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-blue-50/90 dark:bg-blue-900/40 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800 backdrop-blur-sm shadow-sm">
                        <span className="text-[10px] font-bold text-blue-500 uppercase">Chế độ xem xét:</span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Chỉ hiện chứng từ vừa tạo</span>
                    </div>
                )}
                <div className="flex items-center gap-2 bg-purple-50/80 dark:bg-purple-900/20 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800 backdrop-blur-sm shadow-sm">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Tổng cộng:</span>
                    <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">
                        {formatCurrency(totalAmount)}
                    </span>
                </div>
            </div>

            {/* Voucher Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                        <VoucherTableHeader
                            allSelected={selectedIds.size === vouchers.length && vouchers.length > 0}
                            onSelectAll={handleSelectAll}
                            showLockColumn={showLockColumn}
                        />
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {vouchers.map(voucher => {
                            const lockDate = voucher.post_date || voucher.doc_date;
                            const isLocked = !!(lockedUntil && lockDate && normalizeDateValue(lockDate) <= normalizeDateValue(lockedUntil));

                            return (
                                <VoucherTableRow
                                    key={voucher.id}
                                    voucher={voucher}
                                    selected={selectedIds.has(voucher.id || '')}
                                    locked={isLocked}
                                    onSelect={handleSelect}
                                    onEdit={onEdit}
                                    onDelete={handleDelete}
                                />
                            );
                        })}
                    </tbody>
                </table>

                {vouchers.length === 0 && (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-5xl">inventory_2</span>
                            <p className="mt-2 text-sm">Không có chứng từ nào trong khoảng thời gian đã chọn</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * GeneralModuleV2 - Main Component
 */
export const GeneralModuleV2: React.FC<GeneralModuleV2Props> = ({
    subView,
    onCloseModal,
    printSignal,
    onSetHeader,
    navigationData,
    onClearNavigation: _onClearNavigation
}) => {
    const [_showVoucherModal, setShowVoucherModal] = useState(false);
    const [showPostingModal, setShowPostingModal] = useState(false);
    const [showStagingArea, setShowStagingArea] = useState(false);
    const [_activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);
    const [selectedRow, setSelectedRow] = useState<Voucher | null>(null);
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [lockedUntil, setLockedUntil] = useState<string | undefined>(undefined);

    // Date filter states
    const now = new Date();
    const firstDay = toInputDateValue(new Date(now.getFullYear() - 1, 0, 1));
    const today = toInputDateValue(now);
    const [filter, setFilter] = useState<VoucherFilter>({
        fromDate: firstDay,
        toDate: today
    });

    // Fetch locked date setting
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await settingsService.getSettings();
                if (res.data.locked_until_date) {
                    setLockedUntil(res.data.locked_until_date);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            }
        };
        fetchSettings();
    }, [refreshSignal]);

    const handleOpenVoucherModal = async (v?: Voucher) => {
        if (v && v.id) {
            try {
                const res = await voucherService.getById(v.id);
                const fullVoucher = res.data;
                setActiveVoucher({
                    id: fullVoucher.id,
                    doc_no: fullVoucher.doc_no,
                    doc_date: fullVoucher.doc_date,
                    post_date: fullVoucher.post_date,
                    description: fullVoucher.description,
                    type: fullVoucher.type || 'GENERAL',
                    status: fullVoucher.status || 'POSTED',
                    total_amount: fullVoucher.total_amount,
                    lines: (fullVoucher.items || []).map((item: any) => ({
                        description: item.description,
                        debitAcc: item.debit_acc,
                        creditAcc: item.credit_acc,
                        amount: item.amount,
                        partnerCode: item.partner_code || '',
                        dim1: item.dim1 || '',
                        dim2: item.dim2 || '',
                        dim3: item.dim3 || '',
                        dim4: item.dim4 || '',
                        dim5: item.dim5 || ''
                    }))
                });
            } catch (err) {
                console.error("Error loading voucher details:", err);
            }
        } else {
            setActiveVoucher(null);
        }
        setShowVoucherModal(true);
    };

    const handleFilterChange = (updates: Partial<VoucherFilter>) => {
        setFilter(prev => ({ ...prev, ...updates }));
    };

    const handleRefresh = () => {
        setRefreshSignal(s => s + 1);
    };

    // Print effect
    useEffect(() => {
        if (printSignal > 0) {
            window.print();
        }
    }, [printSignal]);

    // Set header with actions
    useEffect(() => {
        if (onSetHeader) {
            const modInfo = getModuleInfo();
            const actions: RibbonAction[] = [];

            if (subView === 'voucher_list' || subView === 'voucher') {
                actions.push({
                    label: 'Thêm chứng từ mới',
                    icon: 'add_circle',
                    onClick: () => {
                        setActiveVoucher(null);
                        setShowVoucherModal(true);
                    },
                    primary: true
                });

                actions.push({
                    label: 'Nhập từ Excel',
                    icon: 'upload',
                    onClick: () => setShowStagingArea(true)
                });
            }

            if (selectedRow && subView === 'voucher_list') {
                actions.push({
                    label: 'Sửa chứng từ',
                    icon: 'edit',
                    onClick: () => handleOpenVoucherModal(selectedRow)
                });
            }

            onSetHeader({
                title: modInfo.title,
                icon: modInfo.icon,
                actions
            });
        }
    }, [subView, onSetHeader, selectedRow]);

    const getModuleInfo = () => {
        switch (subView) {
            case 'voucher': return { title: 'Nhập liệu chứng từ', icon: 'edit_square' };
            case 'voucher_list': return { title: 'Sổ nhật ký chung', icon: 'menu_book' };
            case 'account_list': return { title: 'Hệ thống Tài khoản', icon: 'account_tree' };
            case 'closing': return { title: 'Kết chuyển cuối kỳ', icon: 'account_balance' };
            case 'allocation': return { title: 'Phân bổ chi trả trước', icon: 'rebase_edit' };
            case 'revaluation': return { title: 'Đánh giá ngoại tệ', icon: 'currency_exchange' };
            case 'locking': return { title: 'Khóa sổ kỳ kế toán', icon: 'lock' };
            case 'check': return { title: 'Đối chiếu số liệu', icon: 'fact_check' };
            case 'opening_balance': return { title: 'Số dư đầu kỳ', icon: 'account_balance_wallet' };
            default: return { title: 'Tổng hợp', icon: 'folder_open' };
        }
    };

    return (
        <div className="relative h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Action Bar with Filter */}
            <div className="shrink-0">
                {subView === 'voucher_list' && (
                    <VoucherFilters
                        filter={filter}
                        onChange={handleFilterChange}
                        onRefresh={handleRefresh}
                        loading={false}
                    />
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative bg-white dark:bg-slate-900">
                {subView === 'voucher' && <Spreadsheet refreshSignal={refreshSignal} />}

                {subView === 'voucher_list' && (
                    <VoucherListV2
                        onEdit={handleOpenVoucherModal}
                        onSelectionChange={setSelectedRow}
                        lockedUntil={lockedUntil}
                        fromDate={filter.fromDate || firstDay}
                        toDate={filter.toDate || today}
                        voucherIds={navigationData?.voucherIds}
                    />
                )}

                {subView === 'opening_balance' && <OpeningBalance />}
            </div>

            {/* Modal Views (using imported components) */}
            {subView === 'closing' && <ClosingEntries onClose={onCloseModal} lockedUntil={lockedUntil} />}
            {subView === 'allocation' && <Allocation onClose={onCloseModal} lockedUntil={lockedUntil} />}
            {subView === 'revaluation' && <Revaluation onClose={onCloseModal} lockedUntil={lockedUntil} />}
            {subView === 'locking' && <PeriodLock onClose={onCloseModal} onRefresh={handleRefresh} />}
            {subView === 'check' && <Reconciliation onClose={onCloseModal} />}

            {/* Staging Area Modal */}
            {showStagingArea && (
                <StagingArea
                    onClose={() => setShowStagingArea(false)}
                    onImport={(lines) => {
                        console.log('Imported lines:', lines);
                        setShowStagingArea(false);
                        setRefreshSignal(s => s + 1);
                    }}
                />
            )}

            {/* Posting Modal */}
            {showPostingModal && selectedRow && (
                <PostingModal
                    vouchers={[selectedRow]}
                    onClose={() => setShowPostingModal(false)}
                    onSuccess={() => {
                        setShowPostingModal(false);
                        setRefreshSignal(s => s + 1);
                    }}
                    lockedUntil={lockedUntil}
                />
            )}
        </div>
    );
};

export default GeneralModuleV2;
