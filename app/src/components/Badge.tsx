/**
 * Badge Component
 * SyntexLegger - Reusable Badge/Tag Component
 *
 * USAGE:
 * <Badge variant="success">Đã ghi sổ</Badge>
 * <Badge variant="warning" size="sm">Chờ duyệt</Badge>
 * <StatusBadge status="POSTED" />
 */

import React from 'react';

// ============================================
// TYPES
// ============================================

export type BadgeVariant =
    | 'draft'
    | 'posted'
    | 'success'
    | 'cancelled'
    | 'error'
    | 'warning'
    | 'info'
    | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    className?: string;
    icon?: string;
}

// ============================================
// BADGE COMPONENT
// ============================================

const variantClasses: Record<BadgeVariant, string> = {
    draft: 'badge-draft',
    posted: 'badge-posted',
    success: 'badge-success',
    cancelled: 'badge-cancelled',
    error: 'badge-error',
    warning: 'badge-warning',
    info: 'badge-info',
    neutral: 'badge-neutral',
};

const sizeClasses: Record<BadgeSize, string> = {
    sm: 'badge-sm',
    md: 'badge',
    lg: 'badge-lg',
};

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'neutral',
    size = 'md',
    className = '',
    icon,
}) => {
    return (
        <span className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
            {icon && <span className="material-symbols-outlined icon-sm">{icon}</span>}
            {children}
        </span>
    );
};

// ============================================
// STATUS BADGE - Auto-maps status to variant
// ============================================

export type VoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED' | 'PENDING' | 'APPROVED' | 'REJECTED';

const statusConfig: Record<VoucherStatus, { variant: BadgeVariant; label: string; icon?: string }> = {
    DRAFT: { variant: 'draft', label: 'Nháp', icon: 'edit_note' },
    POSTED: { variant: 'posted', label: 'Đã ghi sổ', icon: 'check_circle' },
    CANCELLED: { variant: 'cancelled', label: 'Đã hủy', icon: 'cancel' },
    PENDING: { variant: 'warning', label: 'Chờ duyệt', icon: 'schedule' },
    APPROVED: { variant: 'success', label: 'Đã duyệt', icon: 'verified' },
    REJECTED: { variant: 'error', label: 'Từ chối', icon: 'block' },
};

export interface StatusBadgeProps {
    status: VoucherStatus | string;
    size?: BadgeSize;
    showIcon?: boolean;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    size = 'md',
    showIcon = false,
    className = '',
}) => {
    const config = statusConfig[status as VoucherStatus] || {
        variant: 'neutral' as BadgeVariant,
        label: status,
    };

    return (
        <Badge
            variant={config.variant}
            size={size}
            icon={showIcon ? config.icon : undefined}
            className={className}
        >
            {config.label}
        </Badge>
    );
};

// ============================================
// AMOUNT BADGE - For displaying amounts with color
// ============================================

export interface AmountBadgeProps {
    amount: number;
    size?: BadgeSize;
    className?: string;
}

export const AmountBadge: React.FC<AmountBadgeProps> = ({
    amount,
    size = 'md',
    className = '',
}) => {
    const variant: BadgeVariant = amount > 0 ? 'success' : amount < 0 ? 'error' : 'neutral';
    const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
    const display = amount < 0 ? `(${formatted})` : formatted;

    return (
        <Badge variant={variant} size={size} className={`font-mono ${className}`}>
            {display}
        </Badge>
    );
};

// ============================================
// PERCENT BADGE - For displaying percentages
// ============================================

export interface PercentBadgeProps {
    value: number; // 0-100
    thresholds?: { warning: number; danger: number };
    size?: BadgeSize;
    className?: string;
}

export const PercentBadge: React.FC<PercentBadgeProps> = ({
    value,
    thresholds = { warning: 80, danger: 100 },
    size = 'md',
    className = '',
}) => {
    let variant: BadgeVariant = 'success';
    if (value >= thresholds.danger) {
        variant = 'error';
    } else if (value >= thresholds.warning) {
        variant = 'warning';
    }

    return (
        <Badge variant={variant} size={size} className={`font-mono ${className}`}>
            {value.toFixed(1)}%
        </Badge>
    );
};

export default Badge;
