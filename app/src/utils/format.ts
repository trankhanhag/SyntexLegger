/**
 * Unified Format Utilities
 * SyntexLegger - Định dạng số, tiền tệ, phần trăm thống nhất
 *
 * USAGE:
 * - formatNumber(1234567)           -> "1.234.567"
 * - formatCurrency(1234567)         -> "1.234.567 ₫"
 * - formatPercent(0.1234)           -> "12,34%"
 * - formatCompact(1234567)          -> "1,2 Tr"
 * - formatQuantity(1234.5678, 2)    -> "1.234,57"
 */

// ============================================
// LOCALE & CONFIGURATION
// ============================================

const DEFAULT_LOCALE = 'vi-VN';
const DEFAULT_CURRENCY = 'VND';

export const getNumberFormat = (): string => {
    return localStorage.getItem('decimalFormat') || DEFAULT_LOCALE;
};

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with thousand separators
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string (e.g., "1.234.567")
 */
export const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const locale = getNumberFormat();
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
};

/**
 * Format currency with VND symbol
 * @param num - Number to format
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @returns Formatted string (e.g., "1.234.567 ₫")
 */
export const formatCurrency = (num: number | null | undefined, showSymbol: boolean = true): string => {
    if (num === null || num === undefined || isNaN(num)) return showSymbol ? '0 ₫' : '0';
    const locale = getNumberFormat();

    if (showSymbol) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: DEFAULT_CURRENCY,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
};

/**
 * Format percentage
 * @param num - Number to format (0.1234 = 12.34%)
 * @param decimals - Number of decimal places (default: 2)
 * @param alreadyPercent - If true, num is already in percent form (12.34 instead of 0.1234)
 * @returns Formatted string (e.g., "12,34%")
 */
export const formatPercent = (
    num: number | null | undefined,
    decimals: number = 2,
    alreadyPercent: boolean = false
): string => {
    if (num === null || num === undefined || isNaN(num)) return '0%';
    const locale = getNumberFormat();

    if (alreadyPercent) {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(num) + '%';
    }

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
};

/**
 * Format large numbers in compact form (Vietnamese units)
 * @param num - Number to format
 * @returns Formatted string (e.g., "1,2 Tr" for millions, "1,5 Tỷ" for billions)
 */
export const formatCompact = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';

    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    const locale = getNumberFormat();

    const format = (value: number, decimals: number = 1) =>
        new Intl.NumberFormat(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
        }).format(value);

    if (absNum >= 1_000_000_000) {
        return sign + format(absNum / 1_000_000_000) + ' Tỷ';
    }
    if (absNum >= 1_000_000) {
        return sign + format(absNum / 1_000_000) + ' Tr';
    }
    if (absNum >= 1_000) {
        return sign + format(absNum / 1_000, 0) + ' N';
    }
    return sign + format(absNum, 0);
};

/**
 * Format quantity with configurable decimals
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.234,57")
 */
export const formatQuantity = (num: number | null | undefined, decimals: number = 2): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const locale = getNumberFormat();
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
};

// ============================================
// PARSING UTILITIES
// ============================================

/**
 * Parse a formatted string back to number
 * @param str - Formatted string (e.g., "1.234.567" or "1,234,567")
 * @returns Parsed number
 */
export const parseNumber = (str: string | null | undefined): number => {
    if (!str) return 0;
    // Remove all non-numeric characters except minus and decimal separators
    const cleaned = str
        .replace(/[^\d,.\-]/g, '')
        .replace(/\./g, '') // Remove thousand separators (dots in vi-VN)
        .replace(',', '.'); // Convert decimal comma to dot
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
};

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Format number with sign indicator for accounting display
 * @param num - Number to format
 * @param decimals - Number of decimal places
 * @returns Object with formatted value and sign class
 */
export const formatWithSign = (num: number | null | undefined, decimals: number = 0): {
    value: string;
    isPositive: boolean;
    isNegative: boolean;
    isZero: boolean;
    className: string;
} => {
    const n = num ?? 0;
    const formatted = formatNumber(Math.abs(n), decimals);
    const isPositive = n > 0;
    const isNegative = n < 0;
    const isZero = n === 0;

    return {
        value: isNegative ? `(${formatted})` : formatted,
        isPositive,
        isNegative,
        isZero,
        className: isNegative ? 'text-red-600' : isPositive ? 'text-green-600' : 'text-slate-600',
    };
};

/**
 * Format debit/credit for accounting tables
 * @param debit - Debit amount
 * @param credit - Credit amount
 * @returns Formatted object for display
 */
export const formatDebitCredit = (debit: number, credit: number): {
    debitStr: string;
    creditStr: string;
    balance: number;
    balanceStr: string;
} => {
    return {
        debitStr: debit > 0 ? formatNumber(debit) : '',
        creditStr: credit > 0 ? formatNumber(credit) : '',
        balance: debit - credit,
        balanceStr: formatNumber(debit - credit),
    };
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if a value is a valid number
 */
export const isValidNumber = (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Safely convert any value to number
 */
export const toNumber = (value: unknown, defaultValue: number = 0): number => {
    if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
    if (typeof value === 'string') {
        const parsed = parseNumber(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
};
