/**
 * BalanceIndicator - Shared Balance Display Component
 * SyntexLegger - Hiển thị trạng thái cân đối Nợ = Có
 *
 * Usage:
 * <BalanceIndicator balanceCheck={balanceCheck} />
 * <BalanceIndicator balanceCheck={balanceCheck} variant="compact" />
 * <BalanceIndicator balanceCheck={balanceCheck} variant="detailed" showOffBalance />
 */

import React from 'react';
import type { BalanceCheckResult } from '../hooks/useBalanceCheck';

type IndicatorVariant = 'badge' | 'compact' | 'detailed' | 'inline';

interface BalanceIndicatorProps {
    balanceCheck: BalanceCheckResult;
    variant?: IndicatorVariant;
    showOffBalance?: boolean;
    className?: string;
}

/**
 * Badge variant - Small status badge
 */
const BadgeIndicator: React.FC<{ balanceCheck: BalanceCheckResult; className?: string }> = ({
    balanceCheck,
    className = ''
}) => {
    const statusConfig = {
        balanced: {
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            text: 'text-emerald-700 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-800',
            icon: 'check_circle'
        },
        incomplete: {
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            text: 'text-amber-700 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'warning'
        },
        unbalanced: {
            bg: 'bg-red-100 dark:bg-red-900/30',
            text: 'text-red-700 dark:text-red-400',
            border: 'border-red-200 dark:border-red-800',
            icon: 'error'
        },
        empty: {
            bg: 'bg-slate-100 dark:bg-slate-800',
            text: 'text-slate-500 dark:text-slate-400',
            border: 'border-slate-200 dark:border-slate-700',
            icon: 'remove_circle_outline'
        }
    };

    const config = statusConfig[balanceCheck.status];

    return (
        <div
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                border transition-all
                ${config.bg} ${config.text} ${config.border}
                ${balanceCheck.status === 'unbalanced' ? 'animate-pulse' : ''}
                ${className}
            `}
            title={balanceCheck.message}
        >
            <span className="material-symbols-outlined text-sm">{config.icon}</span>
            <span>
                {balanceCheck.status === 'balanced' ? 'Cân đối' :
                    balanceCheck.status === 'incomplete' ? 'Thiếu TK' :
                        balanceCheck.status === 'unbalanced' ? 'Lệch' : 'Trống'}
            </span>
        </div>
    );
};

/**
 * Compact variant - Shows Nợ/Có in small space
 */
const CompactIndicator: React.FC<{ balanceCheck: BalanceCheckResult; className?: string }> = ({
    balanceCheck,
    className = ''
}) => {
    const statusConfig = {
        balanced: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        incomplete: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        unbalanced: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse',
        empty: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    };

    const iconMap = {
        balanced: 'check_circle',
        incomplete: 'warning',
        unbalanced: 'error',
        empty: 'remove_circle_outline'
    };

    return (
        <div
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                ${statusConfig[balanceCheck.status]}
                ${className}
            `}
            title={balanceCheck.message}
        >
            <span className="material-symbols-outlined text-base">
                {iconMap[balanceCheck.status]}
            </span>
            <div className="flex flex-col leading-tight">
                <span className="font-mono">
                    Nợ: {balanceCheck.totalDebit.toLocaleString('vi-VN')}
                </span>
                <span className="font-mono">
                    Có: {balanceCheck.totalCredit.toLocaleString('vi-VN')}
                </span>
            </div>
            {balanceCheck.status !== 'balanced' && balanceCheck.status !== 'empty' && (
                <span className="text-[10px] uppercase tracking-wide">
                    {balanceCheck.status === 'incomplete' ? 'Thiếu TK' : 'Lệch'}
                </span>
            )}
        </div>
    );
};

/**
 * Detailed variant - Full breakdown with all info
 */
const DetailedIndicator: React.FC<{
    balanceCheck: BalanceCheckResult;
    showOffBalance?: boolean;
    className?: string
}> = ({
    balanceCheck,
    showOffBalance = true,
    className = ''
}) => {
        return (
            <div className={`space-y-2 ${className}`}>
                {/* Summary row */}
                <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-[10px] text-slate-500 uppercase">Tổng Nợ</div>
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                {balanceCheck.totalDebit.toLocaleString('vi-VN')}
                            </div>
                        </div>
                        <div className="text-slate-300 dark:text-slate-600">=</div>
                        <div className="text-center">
                            <div className="text-[10px] text-slate-500 uppercase">Tổng Có</div>
                            <div className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                {balanceCheck.totalCredit.toLocaleString('vi-VN')}
                            </div>
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className={`
                        px-3 py-1.5 rounded-lg text-xs font-bold
                        ${balanceCheck.isBalanced
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }
                    `}>
                        {balanceCheck.isBalanced ? 'CÂN ĐỐI ✓' : `Lệch: ${balanceCheck.difference.toLocaleString('vi-VN')}`}
                    </div>
                </div>

                {/* Off-balance sheet info */}
                {showOffBalance && balanceCheck.offBalanceSheetLines > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700/50 rounded text-xs text-slate-500">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>
                            {balanceCheck.offBalanceSheetLines} bút toán ngoài bảng (TK bắt đầu bằng 0) - Ghi đơn, không kiểm tra cân đối
                        </span>
                    </div>
                )}

                {/* Incomplete lines warning */}
                {balanceCheck.incompleteLines.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>
                            Dòng {balanceCheck.incompleteLines.map(i => i + 1).join(', ')} thiếu tài khoản Nợ hoặc Có
                        </span>
                    </div>
                )}
            </div>
        );
    };

/**
 * Inline variant - Single line for table footers
 */
const InlineIndicator: React.FC<{ balanceCheck: BalanceCheckResult; className?: string }> = ({
    balanceCheck,
    className = ''
}) => {
    return (
        <div className={`flex items-center gap-4 text-sm ${className}`}>
            <span className="text-slate-500">Tổng:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                Nợ {balanceCheck.totalDebit.toLocaleString('vi-VN')}
            </span>
            <span className="text-slate-400">/</span>
            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                Có {balanceCheck.totalCredit.toLocaleString('vi-VN')}
            </span>
            <span className={`
                px-2 py-0.5 rounded text-xs font-bold
                ${balanceCheck.isBalanced
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }
            `}>
                {balanceCheck.isBalanced ? '✓' : `Δ ${balanceCheck.difference.toLocaleString('vi-VN')}`}
            </span>
        </div>
    );
};

/**
 * Main BalanceIndicator component
 */
export const BalanceIndicator: React.FC<BalanceIndicatorProps> = ({
    balanceCheck,
    variant = 'compact',
    showOffBalance = true,
    className = ''
}) => {
    switch (variant) {
        case 'badge':
            return <BadgeIndicator balanceCheck={balanceCheck} className={className} />;
        case 'compact':
            return <CompactIndicator balanceCheck={balanceCheck} className={className} />;
        case 'detailed':
            return <DetailedIndicator balanceCheck={balanceCheck} showOffBalance={showOffBalance} className={className} />;
        case 'inline':
            return <InlineIndicator balanceCheck={balanceCheck} className={className} />;
        default:
            return <CompactIndicator balanceCheck={balanceCheck} className={className} />;
    }
};

export default BalanceIndicator;
