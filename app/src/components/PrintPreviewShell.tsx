import React from 'react';
import { createPortal } from 'react-dom';

interface PrintPreviewShellProps {
    title?: string;
    onClose: () => void;
    onPrint?: () => void;
    controls?: React.ReactNode;
    footerHint?: React.ReactNode;
    footerActions?: React.ReactNode;
    showFooter?: boolean;
    children: React.ReactNode;
}

export const PrintPreviewShell: React.FC<PrintPreviewShellProps> = ({
    title = 'Xem trước bản in',
    onClose,
    onPrint,
    controls,
    footerHint,
    footerActions,
    showFooter = true,
    children
}) => {
    const handlePrint = onPrint || (() => window.print());
    const actions = footerActions || (
        <>
            <button
                onClick={onClose}
                className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50"
            >
                Đóng
            </button>
            <button
                onClick={handlePrint}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
            >
                <span className="material-symbols-outlined text-[18px]">print</span>
                In ngay
            </button>
        </>
    );

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col print-container overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 text-white shrink-0 no-print">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">print</span>
                    <h3 className="font-bold uppercase tracking-widest text-[10px]">{title}</h3>
                </div>
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-500 transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {controls && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-700 flex flex-wrap items-center gap-4 no-print">
                    {controls}
                </div>
            )}

            <div className="print-preview-body flex-1 overflow-auto bg-slate-300 p-8 flex flex-col items-center gap-8 custom-scrollbar">
                {children}
            </div>

            {showFooter && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0 no-print">
                    <div className="text-xs text-slate-400">{footerHint}</div>
                    <div className="flex gap-3">{actions}</div>
                </div>
            )}
        </div>,
        document.body
    );
};
