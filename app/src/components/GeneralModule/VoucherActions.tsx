/**
 * VoucherActions Component
 * SyntexLegger - Toolbar actions cho quản lý chứng từ
 */

import React from 'react';

export interface VoucherAction {
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
    hidden?: boolean;
}

export interface VoucherActionsProps {
    actions?: VoucherAction[];
    selectedCount?: number;
    onAdd?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onPrint?: () => void;
    onExport?: () => void;
    onImport?: () => void;
    onRefresh?: () => void;
    disabled?: boolean;
}

export const VoucherActions: React.FC<VoucherActionsProps> = ({
    actions,
    selectedCount = 0,
    onAdd,
    onEdit,
    onDelete,
    onDuplicate,
    onPrint,
    onExport,
    onImport,
    onRefresh,
    disabled = false
}) => {
    // Default actions nếu không có custom actions
    const defaultActions: VoucherAction[] = [
        {
            id: 'add',
            label: 'Thêm mới',
            icon: 'add_circle',
            onClick: onAdd || (() => { }),
            primary: true,
            hidden: !onAdd
        },
        {
            id: 'edit',
            label: 'Sửa',
            icon: 'edit',
            onClick: onEdit || (() => { }),
            disabled: selectedCount !== 1,
            hidden: !onEdit
        },
        {
            id: 'duplicate',
            label: 'Nhân bản',
            icon: 'content_copy',
            onClick: onDuplicate || (() => { }),
            disabled: selectedCount !== 1,
            hidden: !onDuplicate
        },
        {
            id: 'delete',
            label: 'Xóa',
            icon: 'delete',
            onClick: onDelete || (() => { }),
            danger: true,
            disabled: selectedCount === 0,
            hidden: !onDelete
        },
        {
            id: 'print',
            label: 'In',
            icon: 'print',
            onClick: onPrint || (() => { }),
            disabled: selectedCount === 0,
            hidden: !onPrint
        },
        {
            id: 'export',
            label: 'Xuất Excel',
            icon: 'download',
            onClick: onExport || (() => { }),
            hidden: !onExport
        },
        {
            id: 'import',
            label: 'Nhập Excel',
            icon: 'upload',
            onClick: onImport || (() => { }),
            hidden: !onImport
        },
        {
            id: 'refresh',
            label: 'Làm mới',
            icon: 'refresh',
            onClick: onRefresh || (() => { }),
            hidden: !onRefresh
        }
    ];

    const visibleActions = (actions || defaultActions).filter(a => !a.hidden);

    const getButtonClass = (action: VoucherAction) => {
        const base = 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all';

        if (action.disabled || disabled) {
            return `${base} bg-slate-100 text-slate-400 cursor-not-allowed`;
        }

        if (action.primary) {
            return `${base} bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20`;
        }

        if (action.danger) {
            return `${base} bg-white border border-red-300 text-red-600 hover:bg-red-50 dark:bg-slate-800 dark:border-red-600 dark:hover:bg-red-900/20`;
        }

        return `${base} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700`;
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {visibleActions.map(action => (
                <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled || disabled}
                    className={getButtonClass(action)}
                    title={action.label}
                >
                    <span className="material-symbols-outlined text-lg">{action.icon}</span>
                    <span className="hidden sm:inline">{action.label}</span>
                </button>
            ))}

            {selectedCount > 0 && (
                <div className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                    Đã chọn: {selectedCount}
                </div>
            )}
        </div>
    );
};

/**
 * ActionBar component - wrapper cho VoucherActions với layout chuẩn
 */
export interface ActionBarProps extends VoucherActionsProps {
    title?: string;
    subtitle?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
    title,
    subtitle,
    ...actionProps
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            {/* Left side - Title */}
            {(title || subtitle) && (
                <div>
                    {title && (
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h2>
                    )}
                    {subtitle && (
                        <p className="text-xs text-slate-500">{subtitle}</p>
                    )}
                </div>
            )}

            {/* Right side - Actions */}
            <VoucherActions {...actionProps} />
        </div>
    );
};

export default VoucherActions;
