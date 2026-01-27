/**
 * GeneralModuleV2 - Refactored Version
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

import React, { useState, useEffect, useRef } from 'react';
import OpeningBalance from './OpeningBalance';
import { type RibbonAction } from './Ribbon';

// === IMPORTS TỪ CÁC MODULES ĐÃ TÁCH ===
import { ClosingEntries } from './ClosingModule';
import { Allocation } from './AllocationModule';
import { Revaluation } from './RevaluationModule';
import { PeriodLock } from './GeneralModule/PeriodLock';
import { Reconciliation } from './GeneralModule/Reconciliation';
import { PostingModal } from './GeneralModule/PostingModal';
import { StagingArea } from './GeneralModule/StagingArea';
import { ChartOfAccounts } from './GeneralModule/ChartOfAccounts';
import { GeneralVoucherList } from './GeneralModule/GeneralVoucherList';
import { GeneralVoucherForm } from './GeneralModule/GeneralVoucherForm';
import { CostItemTable, CostItemFormModal } from './GeneralModule/CostItemTable';
import FundSourceModule from './FundSourceModule';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { useSimplePrint } from '../hooks/usePrintHandler';


interface GeneralModuleV2Props {
    subView?: string;
    onCloseModal: () => void;
    printSignal?: number;
    exportSignal?: number;
    importSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (viewId: string, data?: any) => void;
    navigationData?: any;
    onClearNavigation?: () => void;
}

export const GeneralModuleV2: React.FC<GeneralModuleV2Props> = ({
    subView = 'overview',
    onCloseModal,
    printSignal,
    importSignal = 0,
    onSetHeader,
    onNavigate,
    navigationData,
    onClearNavigation
}) => {
    // UI State
    const [showStagingArea, setShowStagingArea] = useState(false);
    const [showPostingModal, setShowPostingModal] = useState(false);
    const [showCostModal, setShowCostModal] = useState(false);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [editingVoucherId, setEditingVoucherId] = useState<string | undefined>(undefined);
    const [selectedRow] = useState<any>(null);
    const [refreshSignal, setRefreshSignal] = useState(0);

    // Business Logic State
    const [lockedUntil] = useState<string | undefined>(undefined);

    // View state for Cost Items
    const [costType, setCostType] = useState<'Chi' | 'Thu'>('Chi');

    // Track previous import signal to detect actual changes
    const prevImportSignalRef = useRef(importSignal);

    const handleRefresh = () => setRefreshSignal(prev => prev + 1);

    // Print handler
    useSimplePrint(printSignal || 0, 'Tổng hợp', { allowBrowserPrint: true });

    // Import handler - for views that don't have their own import handling
    useEffect(() => {
        // Only trigger if signal actually changed (not on mount or navigation)
        if (importSignal > 0 && importSignal !== prevImportSignalRef.current) {
            // Views with built-in import: account_list (ChartOfAccounts handles it)
            const viewsWithImport = ['account_list'];

            if (!viewsWithImport.includes(subView)) {
                // For voucher_list, open the StagingArea (import chứng từ)
                if (subView === 'voucher_list' || subView === 'voucher') {
                    setShowStagingArea(true);
                } else {
                    // For other views, show notification
                    alert('Chức năng nhập dữ liệu chưa được hỗ trợ cho màn hình này.\n\nVui lòng chuyển sang:\n- Hệ thống Tài khoản để nhập danh mục TK\n- Danh sách chứng từ để nhập chứng từ');
                }
            }
        }
        prevImportSignalRef.current = importSignal;
    }, [importSignal, subView]);

    // Set Header Logic
    useEffect(() => {
        if (subView.startsWith('fund_')) return; // Delegate to FundSourceModule
        if (onSetHeader) {
            let title = 'Tổng hợp';
            let icon = 'account_balance_wallet';
            const actions: RibbonAction[] = [];

            switch (subView) {
                case 'voucher_list':
                    title = 'Danh sách chứng từ';
                    icon = 'list_alt';
                    actions.push({
                        label: 'Thêm chứng từ',
                        icon: 'add',
                        onClick: () => {
                            setEditingVoucherId(undefined);
                            setShowVoucherModal(true);
                        },
                        primary: true
                    });
                    break;
                case 'closing': title = 'Khóa sổ cuối kỳ'; icon = 'lock_clock'; break;
                case 'allocation': title = 'Phân bổ chi phí'; icon = 'pie_chart'; break;
                case 'revaluation': title = 'Đánh giá lại TSCĐ/Ngoại tệ'; icon = 'currency_exchange'; break;
                case 'locking': title = 'Khóa kỳ kế toán'; icon = 'lock'; break;
                case 'check': title = 'Đối soát số liệu'; icon = 'fact_check'; break;
                case 'cost_item':
                    title = `Hệ thống Khoản mục (${costType})`;
                    icon = 'category';
                    actions.push({
                        label: costType === 'Chi' ? 'Xem Khoản mục Thu' : 'Xem Khoản mục Chi',
                        icon: 'swap_horiz',
                        onClick: () => setCostType(prev => prev === 'Chi' ? 'Thu' : 'Chi')
                    });
                    actions.push({
                        label: 'Thêm khoản mục',
                        icon: 'add',
                        onClick: () => setShowCostModal(true),
                        primary: true
                    });
                    break;
                case 'cost_revenue':
                    title = 'Hệ thống Khoản mục (Thu)';
                    icon = 'trending_up';
                    actions.push({
                        label: 'Xem Khoản mục Chi',
                        icon: 'swap_horiz',
                        onClick: () => onNavigate && onNavigate('cost_item')
                    });
                    actions.push({
                        label: 'Thêm khoản mục',
                        icon: 'add',
                        onClick: () => setShowCostModal(true),
                        primary: true
                    });
                    break;
                case 'opening_balance': title = 'Số dư đầu kỳ'; icon = 'account_balance'; break;
                case 'account_list': title = 'Hệ thống Tài khoản'; icon = 'account_tree'; break;
            }

            onSetHeader({ title, icon, actions });
        }
    }, [subView, onSetHeader, costType]);

    // Views helper
    const isOverview = subView === 'overview' || subView === '' || !subView;

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">

            {/* Module Overview - Default Landing Page */}
            {isOverview && (
                <ModuleOverview
                    title={MODULE_CONFIGS.general.title}
                    description={MODULE_CONFIGS.general.description}
                    icon={MODULE_CONFIGS.general.icon}
                    iconColor={MODULE_CONFIGS.general.iconColor}
                    workflow={MODULE_CONFIGS.general.workflow}
                    features={MODULE_CONFIGS.general.features}
                    onNavigate={onNavigate}
                    stats={[
                        { icon: 'receipt_long', label: 'Chứng từ tháng này', value: '-', color: 'blue' },
                        { icon: 'account_balance', label: 'Tài khoản', value: '1,250', color: 'green' },
                        { icon: 'lock', label: 'Kỳ đã khóa', value: lockedUntil ? `đến ${lockedUntil}` : 'Chưa khóa', color: 'amber' },
                        { icon: 'check_circle', label: 'Trạng thái', value: 'Sẵn sàng', color: 'green' },
                    ]}
                />
            )}

            {/* Main Content Area (Sub Views) */}
            <div className={`flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 relative ${isOverview ? 'hidden' : ''}`}>

                {/* Vouchers List View */}
                {subView === 'voucher_list' && (
                    <GeneralVoucherList
                        onEdit={(voucher) => {
                            setEditingVoucherId(voucher.id);
                            setShowVoucherModal(true);
                        }}
                        onDelete={undefined} // Use default internal handler
                        onDuplicate={undefined}
                        onPost={(vouchers) => {
                            // Support batch posting if needed
                            if (vouchers.length > 0) {
                                // Logic handled internally by GeneralVoucherList
                            }
                        }}
                        onImport={() => setShowStagingArea(true)}
                    />
                )}

                {/* Voucher Detail View */}
                {subView === 'voucher' && (
                    <GeneralVoucherForm
                        id={navigationData?.id}
                        onClose={() => {
                            onCloseModal();
                            onClearNavigation?.();
                        }}
                        onSuccess={() => {
                            onCloseModal();
                            onClearNavigation?.();
                            handleRefresh();
                        }}
                    />
                )}

                {/* Financial Functions */}
                {subView === 'closing' && <ClosingEntries onClose={onCloseModal} lockedUntil={lockedUntil} />}
                {subView === 'allocation' && <Allocation onClose={onCloseModal} lockedUntil={lockedUntil} />}
                {subView === 'revaluation' && <Revaluation onClose={onCloseModal} lockedUntil={lockedUntil} />}
                {subView === 'locking' && <PeriodLock onClose={onCloseModal} onRefresh={handleRefresh} />}
                {subView === 'check' && <Reconciliation onClose={onCloseModal} />}

                {/* Budget Management (Merged from HCSN Module) */}
                {subView.startsWith('fund_') && <FundSourceModule subView={subView.replace('fund_', '')} onSetHeader={onSetHeader} />}

                {/* Master Data Views */}
                {subView === 'cost_item' && <CostItemTable type={costType} refreshSignal={refreshSignal} />}
                {subView === 'cost_revenue' && <CostItemTable type="Thu" refreshSignal={refreshSignal} />}
                {subView === 'opening_balance' && <OpeningBalance />}
                {subView === 'account_list' && <ChartOfAccounts importSignal={importSignal} />}

            </div>

            {/* Modals & Tools */}
            {showStagingArea && (
                <StagingArea
                    onClose={() => setShowStagingArea(false)}
                    onImport={(lines) => {
                        console.log('Imported lines:', lines);
                        setShowStagingArea(false);
                        handleRefresh();
                    }}
                />
            )}

            {showPostingModal && selectedRow && (
                <PostingModal
                    vouchers={[selectedRow]}
                    onClose={() => setShowPostingModal(false)}
                    onSuccess={() => {
                        setShowPostingModal(false);
                        handleRefresh();
                    }}
                    lockedUntil={lockedUntil || undefined}
                />
            )}

            {showCostModal && <CostItemFormModal onClose={() => setShowCostModal(false)} />}

            {/* Voucher Form Modal */}
            {showVoucherModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[95vw] h-[90vh] max-w-7xl overflow-hidden flex flex-col">
                        <GeneralVoucherForm
                            id={editingVoucherId}
                            onClose={() => {
                                setShowVoucherModal(false);
                                setEditingVoucherId(undefined);
                            }}
                            onSuccess={() => {
                                setShowVoucherModal(false);
                                setEditingVoucherId(undefined);
                                handleRefresh();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralModuleV2;
