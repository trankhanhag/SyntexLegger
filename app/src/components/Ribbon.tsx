import React from 'react';

export interface RibbonAction {
    label: string;
    icon?: string;
    onClick: () => void;
    primary?: boolean;
}

interface RibbonProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onPrint?: () => void;
    onAudit?: () => void;
    onRunMacro?: () => void;
    onDelete?: () => void;
    title?: string;
    icon?: string;
    actions?: RibbonAction[];
}

export const Ribbon: React.FC<RibbonProps> = ({ activeTab, onTabChange, onPrint, onAudit, onRunMacro, onDelete, title, icon, actions }) => {

    const handlePrint = () => {
        if (onPrint) onPrint();
        else window.print();
    };

    const handleSave = () => {
        alert("Dữ liệu đã được hệ thống tự động lưu!");
    };

    const handleClipboardInfo = (action: string) => {
        alert(`Để ${action}, hãy sử dụng phím tắt bàn phím (Ctrl+C, Ctrl+V) để tương tác tốt nhất với trình duyệt.`);
    };

    const handleFilterSortInfo = () => {
        alert("Để Lọc hoặc Sắp xếp, vui lòng nhấp vào mũi tên trên tiêu đề của cột tương ứng.");
    };

    const handleNotImplemented = (feature: string) => {
        alert(`Tính năng ${feature} đang được phát triển.`);
    };

    const getTabClass = (tabName: string) => {
        const isActive = activeTab === tabName;
        return `flex items-center justify-center border-b-[3px] pb-2 pt-3 px-1 transition-colors ${isActive ? 'border-b-blue-600 text-blue-600' : 'border-b-transparent text-slate-600 hover:text-blue-600'}`;
    };

    return (
        <div className="flex flex-col border-b border-border-light bg-surface-light dark:bg-surface-dark dark:border-border-dark shrink-0 shadow-sm relative z-50">
            {/* Tabs */}
            <div className="flex px-4 gap-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50 dark:bg-slate-950">
                <button onClick={() => onTabChange('dashboard')} className={getTabClass('dashboard')}>
                    <p className="text-sm font-semibold leading-normal">Tổng quan</p>
                </button>
                <button onClick={() => onTabChange('general')} className={getTabClass('general')}>
                    <p className="text-sm font-semibold leading-normal">Tổng hợp</p>
                </button>
                <button onClick={() => onTabChange('report')} className={getTabClass('report')}>
                    <p className="text-sm font-medium leading-normal">Báo cáo</p>
                </button>
                <button onClick={() => onTabChange('cash')} className={getTabClass('cash')}>
                    <p className="text-sm font-medium leading-normal">Ngân quỹ</p>
                </button>
                <button onClick={() => onTabChange('tax')} className={getTabClass('tax')}>
                    <p className="text-sm font-medium leading-normal">Thuế</p>
                </button>
                <button onClick={() => onTabChange('revenue')} className={getTabClass('revenue')}>
                    <p className="text-sm font-medium leading-normal">Thu sự nghiệp</p>
                </button>
                <button onClick={() => onTabChange('expense')} className={getTabClass('expense')}>
                    <p className="text-sm font-medium leading-normal">Mua sắm & Chi</p>
                </button>
                <button onClick={() => onTabChange('inventory')} className={getTabClass('inventory')}>
                    <p className="text-sm font-medium leading-normal">Kho</p>
                </button>
                <button onClick={() => onTabChange('asset')} className={getTabClass('asset')}>
                    <p className="text-sm font-medium leading-normal">Tài sản</p>
                </button>

                <button onClick={() => onTabChange('loan')} className={getTabClass('loan')}>
                    <p className="text-sm font-medium leading-normal">Công nợ & Tạm ứng</p>
                </button>
                <button onClick={() => onTabChange('hr')} className={getTabClass('hr')}>
                    <p className="text-sm font-medium leading-normal">Tiền lương & NS</p>
                </button>
                <button onClick={() => onTabChange('contract')} className={getTabClass('contract')}>
                    <p className="text-sm font-medium leading-normal">Hợp đồng</p>
                </button>
                <button onClick={() => onTabChange('project')} className={getTabClass('project')}>
                    <p className="text-sm font-medium leading-normal">Dự án</p>
                </button>
                <button onClick={() => onTabChange('dimension')} className={getTabClass('dimension')}>
                    <p className="text-sm font-medium leading-normal">Mã thống kê</p>
                </button>
                <button onClick={() => onTabChange('system')} className={getTabClass('system')}>
                    <p className="text-sm font-medium leading-normal">Hệ thống</p>
                </button>
                <button onClick={() => onTabChange('fund')} className={getTabClass('fund')}>
                    <p className="text-sm font-bold leading-normal bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">HCSN</p>
                </button>
            </div>

            {/* Toolbar Icons */}
            <div className="flex justify-between items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-6">
                    {/* File Operations */}
                    <div className="flex gap-4 border-r border-slate-200 dark:border-slate-700 pr-6">
                        <button onClick={handleSave} className="text-slate-500 hover:text-blue-600 transition-all active:scale-90" title="Lưu">
                            <span className="material-symbols-outlined text-[20px]">save</span>
                        </button>
                        <button onClick={handlePrint} className="text-slate-500 hover:text-blue-600 transition-all active:scale-90" title="In">
                            <span className="material-symbols-outlined text-[20px]">print</span>
                        </button>
                    </div>

                    {/* Edit Operations */}
                    <div className="flex gap-4 border-r border-slate-200 dark:border-slate-700 pr-6">
                        <button onClick={() => handleClipboardInfo('Sao chép')} className="text-slate-500 hover:text-blue-600 transition-all" title="Sao chép">
                            <span className="material-symbols-outlined text-[20px]">content_copy</span>
                        </button>
                        <button onClick={() => handleClipboardInfo('Dán')} className="text-slate-500 hover:text-blue-600 transition-all" title="Dán">
                            <span className="material-symbols-outlined text-[20px]">content_paste</span>
                        </button>
                        <button
                            onClick={onDelete || (() => handleNotImplemented('Xóa dòng'))}
                            className={`transition-all ${onDelete ? 'text-red-500 hover:text-red-700 active:scale-90' : 'text-slate-300 cursor-not-allowed'}`}
                            title="Xóa"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>

                    {/* Filter Operations */}
                    <div className="flex gap-3 border-r border-slate-200 dark:border-slate-700 pr-6 items-center">
                        <button onClick={handleFilterSortInfo} className="text-slate-500 hover:text-blue-600 transition-all" title="Lọc">
                            <span className="material-symbols-outlined text-[20px]">filter_alt</span>
                        </button>
                        <button onClick={handleFilterSortInfo} className="text-slate-500 hover:text-blue-600 transition-all" title="Sắp xếp">
                            <span className="material-symbols-outlined text-[20px]">sort_by_alpha</span>
                        </button>
                        <button onClick={() => window.location.reload()} className="text-slate-500 hover:text-blue-600 transition-all" title="Tải lại (Hoàn tác)">
                            <span className="material-symbols-outlined text-[20px]">undo</span>
                        </button>
                        <button onClick={onAudit} className="flex flex-col items-center justify-center text-red-500 hover:text-red-600 transition-all hover:scale-105 px-2 ml-1 group" title="Trợ lý Kiểm toán ảo">
                            <span className="material-symbols-outlined text-[22px] animate-pulse group-hover:animate-none leading-none">health_and_safety</span>
                        </button>
                    </div>

                    {/* Module Specific Actions */}
                    {actions && actions.length > 0 && (
                        <div className="flex gap-2 border-r border-slate-200 dark:border-slate-700 pr-6">
                            {actions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={action.onClick}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all active:scale-95 ${action.primary
                                        ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {action.icon && <span className="material-symbols-outlined text-[18px]">{action.icon}</span>}
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={onRunMacro}
                        className="flex items-center gap-2 px-3 py-1 bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-black rounded hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                        Quy trình cuối tháng
                    </button>
                </div>

                {/* Page Title Integrated */}
                {title && (
                    <div className="flex items-center gap-3 animate-fade-in pr-2">
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mr-2 md:block hidden"></div>
                        <div className="flex items-center gap-2.5">
                            {icon && (
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <span className="material-symbols-outlined text-[20px] leading-none">{icon}</span>
                                </div>
                            )}
                            <div>
                                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                                    {title}
                                </h2>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
