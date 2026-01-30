import React from 'react';
import { triggerBrowserPrint } from '../hooks/usePrintHandler';

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
    onExport?: () => void;
    onImport?: () => void;
    title?: string;
    icon?: string;
    actions?: RibbonAction[];
}

export const Ribbon: React.FC<RibbonProps> = ({ activeTab, onTabChange, onPrint, onAudit, onRunMacro, onDelete, onExport, onImport, title, icon, actions }) => {

    const handlePrint = () => {
        if (onPrint) onPrint();
        else triggerBrowserPrint();
    };

    const handleSave = () => {
        // Dispatch save event
        handleAction('save');

        // Visual feedback
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-[100] animate-fade-in font-bold text-sm flex items-center gap-2';
        toast.innerHTML = '<span class="material-symbols-outlined text-[18px]">check_circle</span> Đã gửi lệnh lưu...';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    };

    const handleAction = (action: string) => {
        // Dispatch global event for components to listen
        const event = new CustomEvent('ribbon-action', { detail: { action } });
        window.dispatchEvent(event);
    };

    const handleCopy = () => {
        handleAction('copy');
        // Fallback for visual feedback if nothing handled it?
        // Actually, we rely on the active component (SmartTable) to handle it.
        // If no SmartTable, maybe nothing happens.
    };

    const handlePaste = () => {
        handleAction('paste');
    };

    const handleFilter = () => {
        handleAction('filter');
    };

    const handleSort = () => {
        handleAction('sort');
    };

    const handleExport = () => {
        if (onExport) onExport();
        else handleAction('export');
    };

    const handleImport = () => {
        if (onImport) onImport();
        else handleAction('import');
    };

    // Toggle Fullscreen
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const getTabClass = (tabName: string) => {
        const isActive = activeTab === tabName;
        return `flex items-center justify-center border-b-[3px] pb-2 pt-3 px-1 transition-colors ${isActive ? 'border-b-blue-600 text-blue-600' : 'border-b-transparent text-slate-600 hover:text-blue-600'}`;
    };

    return (
        <div className="flex flex-col border-b border-border-light bg-surface-light dark:bg-surface-dark dark:border-border-dark shrink-0 shadow-sm relative z-50 no-print" data-no-print>
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
                    <p className="text-sm font-medium leading-normal">Doanh thu</p>
                </button>
                <button onClick={() => onTabChange('expense')} className={getTabClass('expense')}>
                    <p className="text-sm font-medium leading-normal">Chi phí</p>
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
            </div>

            {/* Toolbar Icons */}
            <div className="flex justify-between items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto min-h-[50px]">
                <div className="flex items-center gap-4">
                    {/* File Operations */}
                    <div className="flex gap-4 border-r border-slate-200 dark:border-slate-700 pr-4">
                        <button onClick={handleSave} className="text-slate-500 hover:text-blue-600 transition-all active:scale-90 flex flex-col items-center group" title="Lưu (Ctrl+S)">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">save</span>
                            <span className="text-[9px] font-medium hidden xl:block">Lưu</span>
                        </button>
                        <button onClick={handlePrint} className="text-slate-500 hover:text-blue-600 transition-all active:scale-90 flex flex-col items-center group" title="In (Ctrl+P)">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">print</span>
                            <span className="text-[9px] font-medium hidden xl:block">In ấn</span>
                        </button>
                    </div>

                    {/* Import/Export - NEW */}
                    <div className="flex gap-4 border-r border-slate-200 dark:border-slate-700 pr-4">
                        <button onClick={handleImport} className="text-slate-500 hover:text-green-600 transition-all active:scale-90 flex flex-col items-center group" title="Nhập Excel">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">upload_file</span>
                            <span className="text-[9px] font-medium hidden xl:block">Nhập</span>
                        </button>
                        <button onClick={handleExport} className="text-slate-500 hover:text-green-600 transition-all active:scale-90 flex flex-col items-center group" title="Xuất Excel">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">download</span>
                            <span className="text-[9px] font-medium hidden xl:block">Xuất</span>
                        </button>
                    </div>

                    {/* Edit Operations */}
                    <div className="flex gap-4 border-r border-slate-200 dark:border-slate-700 pr-4">
                        <button onClick={handleCopy} className="text-slate-500 hover:text-blue-600 transition-all flex flex-col items-center group" title="Sao chép">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">content_copy</span>
                            <span className="text-[9px] font-medium hidden xl:block">Copy</span>
                        </button>
                        <button onClick={handlePaste} className="text-slate-500 hover:text-blue-600 transition-all flex flex-col items-center group" title="Dán">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">content_paste</span>
                            <span className="text-[9px] font-medium hidden xl:block">Paste</span>
                        </button>
                        <button
                            onClick={onDelete || (() => handleAction('delete'))}
                            className={`transition-all flex flex-col items-center group ${onDelete ? 'text-red-500 hover:text-red-700 active:scale-90' : 'text-slate-300 cursor-not-allowed'}`}
                            title="Xóa dòng"
                        >
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">delete</span>
                            <span className="text-[9px] font-medium hidden xl:block">Xóa</span>
                        </button>
                    </div>

                    {/* View/Window - NEW */}
                    <div className="flex gap-4 border-r border-slate-200 dark:border-slate-700 pr-4">
                        <button onClick={() => window.location.reload()} className="text-slate-500 hover:text-blue-600 transition-all flex flex-col items-center group" title="Tải lại dữ liệu">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">refresh</span>
                            <span className="text-[9px] font-medium hidden xl:block">Tải lại</span>
                        </button>
                        <button onClick={toggleFullScreen} className="text-slate-500 hover:text-blue-600 transition-all flex flex-col items-center group" title="Toàn màn hình">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">fullscreen</span>
                            <span className="text-[9px] font-medium hidden xl:block">Toàn cảnh</span>
                        </button>
                    </div>

                    {/* Filter Operations */}
                    <div className="flex gap-3 border-r border-slate-200 dark:border-slate-700 pr-4 items-center">
                        <button onClick={handleFilter} className="text-slate-500 hover:text-blue-600 transition-all flex flex-col items-center group" title="Lọc">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">filter_alt</span>
                            <span className="text-[9px] font-medium hidden xl:block">Lọc</span>
                        </button>
                        <button onClick={handleSort} className="text-slate-500 hover:text-blue-600 transition-all flex flex-col items-center group" title="Sắp xếp">
                            <span className="material-symbols-outlined text-[20px] mb-0.5 group-hover:-translate-y-0.5 transition-transform">sort_by_alpha</span>
                            <span className="text-[9px] font-medium hidden xl:block">Sắp xếp</span>
                        </button>

                        <button onClick={onAudit} className="flex flex-col items-center justify-center text-red-500 hover:text-red-600 transition-all hover:scale-105 px-2 ml-1 group" title="Trợ lý Kiểm toán ảo">
                            <span className="material-symbols-outlined text-[22px] animate-pulse group-hover:animate-none leading-none">health_and_safety</span>
                            <span className="text-[9px] font-bold mt-0.5 hidden xl:block">Kiểm toán</span>
                        </button>
                    </div>

                    {/* Module Specific Actions */}
                    {actions && actions.length > 0 && (
                        <div className="flex gap-2 border-r border-slate-200 dark:border-slate-700 pr-4">
                            {actions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={action.onClick}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${action.primary
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

                    {/* Process */}
                    <button
                        onClick={onRunMacro}
                        className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-700 hover:text-blue-600 group"
                        title="Chạy quy trình tự động"
                    >
                        <span className="material-symbols-outlined text-[24px] group-hover:rotate-45 transition-transform">rocket_launch</span>
                        <span className="text-[9px] font-bold uppercase">Quy trình</span>
                    </button>
                </div>

                {/* Page Title Integrated */}
                {title && (
                    <div className="flex items-center gap-3 animate-fade-in pr-2 shrink-0 border-l border-slate-200 pl-4 ml-auto">
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
                        <button onClick={() => window.open('https://support.syntex.vn', '_blank')} className="text-slate-400 hover:text-blue-500 ml-2" title="Hướng dẫn sử dụng">
                            <span className="material-symbols-outlined text-[20px]">help</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
