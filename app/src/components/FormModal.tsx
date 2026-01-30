import React from 'react';
import { BalanceIndicator } from './BalanceIndicator';
import type { BalanceCheckResult } from '../hooks/useBalanceCheck';

// ============================================
// FORM MODAL - Unified Modal System
// ============================================

// Size presets
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
const sizeMap: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-[90vw]'
};

// Header variants
type HeaderVariant = 'default' | 'gradient' | 'minimal' | 'none';

type FormModalProps = {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    icon?: string;
    size?: ModalSize;
    sizeClass?: string; // For backward compatibility
    panelClass?: string;
    bodyClass?: string;
    headerVariant?: HeaderVariant;
    headerColor?: 'blue' | 'green' | 'red' | 'purple' | 'amber';
    footer?: React.ReactNode;
    onBackdropClick?: () => void;
    loading?: boolean;
    maxHeight?: string;
    // Balance check support for voucher forms
    balanceCheck?: BalanceCheckResult;
    balanceIndicatorVariant?: 'badge' | 'compact' | 'detailed' | 'inline';
    showBalanceInHeader?: boolean;
};

export const FormModal = ({
    title,
    subtitle,
    onClose,
    children,
    icon,
    size = 'xl',
    sizeClass,
    panelClass = '',
    bodyClass = '',
    headerVariant = 'default',
    headerColor = 'blue',
    footer,
    onBackdropClick,
    loading = false,
    maxHeight = '92vh',
    balanceCheck,
    balanceIndicatorVariant = 'compact',
    showBalanceInHeader = true
}: FormModalProps) => {
    // Determine size class
    const computedSize = sizeClass || sizeMap[size] || 'max-w-4xl';
    const panel = `${computedSize} ${panelClass}`.trim();

    // Header gradient colors
    const gradientColors: Record<string, string> = {
        blue: 'from-blue-600 to-indigo-600',
        green: 'from-green-600 to-emerald-600',
        red: 'from-red-600 to-rose-600',
        purple: 'from-purple-600 to-indigo-600',
        amber: 'from-amber-500 to-orange-500'
    };

    // Render header based on variant
    const renderHeader = () => {
        if (headerVariant === 'none') return null;

        if (headerVariant === 'gradient') {
            return (
                <div className={`bg-gradient-to-r ${gradientColors[headerColor]} px-6 py-5 text-white`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-black flex items-center gap-2">
                                {icon && <span className="material-symbols-outlined">{icon}</span>}
                                {title}
                            </h3>
                            {subtitle && (
                                <p className="text-sm opacity-80 mt-1">{subtitle}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                            aria-label="Close"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (headerVariant === 'minimal') {
            return (
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {icon && <span className="material-symbols-outlined text-blue-600">{icon}</span>}
                        {title}
                    </h3>
                    <div className="flex items-center gap-3">
                        {/* Balance Indicator in header */}
                        {balanceCheck && showBalanceInHeader && (
                            <BalanceIndicator
                                balanceCheck={balanceCheck}
                                variant={balanceIndicatorVariant}
                            />
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Close"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            );
        }

        // Default header
        return (
            <div className="form-modal__header">
                <div>
                    <h3 className="form-modal__title">
                        {icon && <span className="material-symbols-outlined form-modal__icon">{icon}</span>}
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {/* Balance Indicator in header */}
                    {balanceCheck && showBalanceInHeader && (
                        <BalanceIndicator
                            balanceCheck={balanceCheck}
                            variant={balanceIndicatorVariant}
                        />
                    )}
                    <button onClick={onClose} className="form-modal__close" aria-label="Close">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onBackdropClick}
        >
            <div
                className={`form-modal w-full ${panel} animate-in zoom-in-95 duration-200`}
                style={{ maxHeight }}
                onClick={(event) => event.stopPropagation()}
            >
                {/* Loading overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {renderHeader()}

                <div className={`form-modal__body ${bodyClass}`}>
                    {children}
                </div>

                {footer && (
                    <div className="form-modal__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// FORM FIELD COMPONENTS
// ============================================

// Form Section - Groups related fields
type FormSectionProps = {
    title?: string;
    icon?: string;
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'card' | 'highlight';
    color?: 'slate' | 'blue' | 'green' | 'red' | 'amber';
};

export const FormSection: React.FC<FormSectionProps> = ({
    title,
    icon,
    children,
    className = '',
    variant = 'default',
    color = 'slate'
}) => {
    const colorClasses: Record<string, string> = {
        slate: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    };

    if (variant === 'card') {
        return (
            <div className={`${colorClasses[color]} rounded-xl p-4 border ${className}`}>
                {title && (
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
                        {title}
                    </h4>
                )}
                {children}
            </div>
        );
    }

    if (variant === 'highlight') {
        return (
            <div className={`${colorClasses[color]} rounded-lg p-4 border-l-4 ${className}`}>
                {title && (
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                        {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
                        {title}
                    </h4>
                )}
                {children}
            </div>
        );
    }

    return (
        <div className={className}>
            {title && (
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
                    {title}
                </h4>
            )}
            {children}
        </div>
    );
};

// Form Grid - Layout helper
type FormGridProps = {
    cols?: 1 | 2 | 3 | 4;
    gap?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    className?: string;
};

export const FormGrid: React.FC<FormGridProps> = ({
    cols = 2,
    gap = 'md',
    children,
    className = ''
}) => {
    const colsClass = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };

    const gapClass = {
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6'
    };

    return (
        <div className={`grid ${colsClass[cols]} ${gapClass[gap]} ${className}`}>
            {children}
        </div>
    );
};

// Form Field - Label + Input wrapper
type FormFieldProps = {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
};

export const FormField: React.FC<FormFieldProps> = ({
    label,
    required,
    error,
    hint,
    children,
    className = ''
}) => {
    return (
        <div className={className}>
            <label className="form-label">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint && !error && (
                <p className="text-[10px] text-slate-400 mt-1">{hint}</p>
            )}
            {error && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">error</span>
                    {error}
                </p>
            )}
        </div>
    );
};

// Form Input - Styled input/select/textarea
type FormInputProps = {
    type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'textarea' | 'select';
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    options?: { value: string | number; label: string }[];
    rows?: number;
    className?: string;
    inputClassName?: string;
    prefix?: string;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
};

export const FormInput: React.FC<FormInputProps> = ({
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled,
    readOnly,
    options = [],
    rows = 3,
    className = '',
    inputClassName = '',
    prefix,
    suffix,
    min,
    max,
    step
}) => {
    const baseClass = 'form-input';
    const inputClass = `${baseClass} ${inputClassName}`.trim();

    if (type === 'select') {
        return (
            <div className={`relative ${className}`}>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={inputClass}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (type === 'textarea') {
        return (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                rows={rows}
                className={`${inputClass} ${className}`}
            />
        );
    }

    // Input with prefix/suffix
    if (prefix || suffix) {
        return (
            <div className={`flex items-center ${className}`}>
                {prefix && (
                    <span className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-r-0 border-slate-200 dark:border-slate-600 rounded-l-lg text-sm text-slate-500">
                        {prefix}
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={readOnly}
                    min={min}
                    max={max}
                    step={step}
                    className={`${inputClass} ${prefix ? 'rounded-l-none' : ''} ${suffix ? 'rounded-r-none' : ''}`}
                />
                {suffix && (
                    <span className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-l-0 border-slate-200 dark:border-slate-600 rounded-r-lg text-sm text-slate-500">
                        {suffix}
                    </span>
                )}
            </div>
        );
    }

    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            step={step}
            className={`${inputClass} ${className}`}
        />
    );
};

// Form Buttons
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type FormButtonProps = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    iconPosition?: 'left' | 'right';
    className?: string;
    fullWidth?: boolean;
};

export const FormButton: React.FC<FormButtonProps> = ({
    variant = 'primary',
    size = 'md',
    children,
    onClick,
    type = 'button',
    disabled,
    loading,
    icon,
    iconPosition = 'left',
    className = '',
    fullWidth
}) => {
    const variantClasses: Record<ButtonVariant, string> = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20',
        secondary: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20',
        success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20',
        ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    };

    const sizeClasses: Record<ButtonSize, string> = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-2.5 text-base'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
                inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
        >
            {loading ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    )}
                    {children}
                    {icon && iconPosition === 'right' && (
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    )}
                </>
            )}
        </button>
    );
};

// Form Actions - Footer buttons container
type FormActionsProps = {
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right' | 'between';
    className?: string;
};

export const FormActions: React.FC<FormActionsProps> = ({
    children,
    align = 'right',
    className = ''
}) => {
    const alignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        between: 'justify-between'
    };

    return (
        <div className={`flex items-center gap-3 ${alignClasses[align]} ${className}`}>
            {children}
        </div>
    );
};

// Form Alert - Info/Warning/Error messages
type AlertVariant = 'info' | 'success' | 'warning' | 'error';

type FormAlertProps = {
    variant?: AlertVariant;
    title?: string;
    children: React.ReactNode;
    icon?: string;
    className?: string;
    onDismiss?: () => void;
};

export const FormAlert: React.FC<FormAlertProps> = ({
    variant = 'info',
    title,
    children,
    icon,
    className = '',
    onDismiss
}) => {
    const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            text: 'text-blue-800 dark:text-blue-200',
            icon: icon || 'info'
        },
        success: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            text: 'text-green-800 dark:text-green-200',
            icon: icon || 'check_circle'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            text: 'text-amber-800 dark:text-amber-200',
            icon: icon || 'warning'
        },
        error: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            text: 'text-red-800 dark:text-red-200',
            icon: icon || 'error'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div className={`${styles.bg} ${styles.border} ${styles.text} border rounded-lg p-4 ${className}`}>
            <div className="flex gap-3">
                <span className="material-symbols-outlined text-[20px] shrink-0">{styles.icon}</span>
                <div className="flex-1">
                    {title && <p className="font-bold text-sm mb-1">{title}</p>}
                    <div className="text-sm">{children}</div>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="shrink-0 hover:opacity-70 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                )}
            </div>
        </div>
    );
};

// Form Divider
type FormDividerProps = {
    label?: string;
    className?: string;
};

export const FormDivider: React.FC<FormDividerProps> = ({ label, className = '' }) => {
    if (label) {
        return (
            <div className={`relative my-6 ${className}`}>
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="px-3 bg-white dark:bg-slate-900 text-xs font-medium text-slate-500 uppercase">
                        {label}
                    </span>
                </div>
            </div>
        );
    }

    return <div className={`border-t border-slate-200 dark:border-slate-700 my-4 ${className}`} />;
};

// Confirm Modal - Simple confirmation dialog
type ConfirmModalProps = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    message,
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
    variant = 'info',
    onConfirm,
    onCancel,
    loading
}) => {
    const iconMap = {
        danger: 'warning',
        warning: 'help',
        info: 'info'
    };

    const colorMap = {
        danger: 'red',
        warning: 'amber',
        info: 'blue'
    };

    return (
        <FormModal
            title={title}
            icon={iconMap[variant]}
            onClose={onCancel}
            size="sm"
            headerVariant="minimal"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onCancel}>
                        {cancelLabel}
                    </FormButton>
                    <FormButton
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmLabel}
                    </FormButton>
                </FormActions>
            }
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full bg-${colorMap[variant]}-100 dark:bg-${colorMap[variant]}-900/30`}>
                    <span className={`material-symbols-outlined text-${colorMap[variant]}-600 text-2xl`}>
                        {iconMap[variant]}
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 pt-2">{message}</p>
            </div>
        </FormModal>
    );
};
