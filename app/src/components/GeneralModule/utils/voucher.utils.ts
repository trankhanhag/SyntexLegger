/**
 * Voucher Utility Functions
 * SyntexHCSN - Helper functions for voucher operations
 */

import type { Voucher, VoucherLine } from '../types/voucher.types';

/**
 * Format số tiền theo chuẩn Việt Nam
 */
export function formatCurrency(amount: number, currency: string = 'VND'): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: currency === 'VND' ? 0 : 2
    }).format(amount);
}

/**
 * Format số với separator hàng nghìn
 */
export function formatNumber(num: number, decimals: number = 0): string {
    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

/**
 * Calculate tổng Nợ/Có từ danh sách lines
 */
export function calculateVoucherTotals(lines: VoucherLine[]): {
    totalDebit: number;
    totalCredit: number;
    balance: number;
} {
    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach(line => {
        if (line.debitAcc && line.amount) {
            totalDebit += line.amount;
        }
        if (line.creditAcc && line.amount) {
            totalCredit += line.amount;
        }
    });

    return {
        totalDebit,
        totalCredit,
        balance: totalDebit - totalCredit
    };
}

/**
 * Check if voucher is balanced (Nợ = Có)
 */
export function isVoucherBalanced(voucher: Voucher, tolerance: number = 0.01): boolean {
    const { balance } = calculateVoucherTotals(voucher.lines);
    return Math.abs(balance) <= tolerance;
}

/**
 * Generate số chứng từ tự động
 */
export function generateDocNo(type: string, date: Date = new Date()): string {
    const prefix = getVoucherTypePrefix(type);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    return `${prefix}-${year}${month}-${random}`;
}

/**
 * Get prefix cho loại chứng từ
 */
export function getVoucherTypePrefix(type: string): string {
    const prefixes: Record<string, string> = {
        'GENERAL': 'PC',      // Phiếu chung
        'CASH_IN': 'PT',      // Phiếu thu
        'CASH_OUT': 'PC',     // Phiếu chi
        'BANK_IN': 'BC',      // Báo có
        'BANK_OUT': 'BN',     // Báo nợ
        'PURCHASE': 'PN',     // Phiếu nhập
        'SALE': 'PX',         // Phiếu xuất
        'CLOSING': 'KC',      // Kết chuyển
        'ALLOCATION': 'PB',   // Phân bổ
        'DEPRECIATION': 'KH', // Khấu hao
        'REVALUATION': 'DG',  // Đánh giá lại
        'ADJUSTMENT': 'DC',   // Điều chỉnh
    };

    return prefixes[type] || 'CT';
}

/**
 * Get tên hiển thị cho loại chứng từ
 */
export function getVoucherTypeName(type: string): string {
    const names: Record<string, string> = {
        'GENERAL': 'Phiếu kế toán chung',
        'CASH_IN': 'Phiếu thu tiền mặt',
        'CASH_OUT': 'Phiếu chi tiền mặt',
        'BANK_IN': 'Báo có ngân hàng',
        'BANK_OUT': 'Báo nợ ngân hàng',
        'PURCHASE': 'Phiếu nhập kho',
        'SALE': 'Phiếu xuất kho',
        'CLOSING': 'Bút toán kết chuyển',
        'ALLOCATION': 'Phân bổ chi phí',
        'DEPRECIATION': 'Trích khấu hao',
        'REVALUATION': 'Đánh giá lại tỷ giá',
        'ADJUSTMENT': 'Bút toán điều chỉnh',
    };

    return names[type] || 'Chứng từ';
}

/**
 * Get màu badge cho loại chứng từ
 */
export function getVoucherTypeColor(type: string): string {
    const colors: Record<string, string> = {
        'GENERAL': 'bg-slate-100 text-slate-700',
        'CASH_IN': 'bg-green-100 text-green-700',
        'CASH_OUT': 'bg-red-100 text-red-700',
        'BANK_IN': 'bg-blue-100 text-blue-700',
        'BANK_OUT': 'bg-orange-100 text-orange-700',
        'PURCHASE': 'bg-purple-100 text-purple-700',
        'SALE': 'bg-teal-100 text-teal-700',
        'CLOSING': 'bg-indigo-100 text-indigo-700',
        'ALLOCATION': 'bg-amber-100 text-amber-700',
        'DEPRECIATION': 'bg-gray-100 text-gray-700',
        'REVALUATION': 'bg-pink-100 text-pink-700',
        'ADJUSTMENT': 'bg-cyan-100 text-cyan-700',
    };

    return colors[type] || 'bg-gray-100 text-gray-700';
}

/**
 * Validate số tài khoản kế toán
 */
export function isValidAccountCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    // Tài khoản HCSN thường có 3-4 ký tự số
    return /^[0-9]{3,4}[A-Z0-9]?$/.test(code);
}

/**
 * Check if date is locked (trong kỳ đã khóa)
 */
export function isDateLocked(date: string, lockedUntil?: string): boolean {
    if (!lockedUntil) return false;
    return date <= lockedUntil;
}

/**
 * Format ngày theo chuẩn Việt Nam
 */
export function formatDateVN(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Format ngày đầy đủ (có tên thứ)
 */
export function formatDateLongVN(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Clone voucher (deep copy)
 */
export function cloneVoucher(voucher: Voucher): Voucher {
    return JSON.parse(JSON.stringify(voucher));
}

/**
 * Prepare voucher for duplicate (remove IDs, update dates)
 */
export function prepareVoucherForDuplicate(voucher: Voucher): Voucher {
    const cloned = cloneVoucher(voucher);

    // Remove IDs
    delete cloned.id;
    cloned.lines.forEach(line => delete line.id);

    // Update dates to today
    const today = new Date().toISOString().split('T')[0];
    cloned.doc_date = today;
    cloned.post_date = today;

    // Generate new doc_no
    cloned.doc_no = generateDocNo(cloned.type);

    // Reset status
    cloned.status = 'draft';

    return cloned;
}

/**
 * Validate voucher trước khi save
 */
export function validateVoucher(voucher: Voucher, lockedUntil?: string): string[] {
    const errors: string[] = [];

    if (!voucher.doc_no?.trim()) {
        errors.push('Số chứng từ không được để trống');
    }

    if (!voucher.doc_date) {
        errors.push('Ngày chứng từ không được để trống');
    }

    if (!voucher.description?.trim()) {
        errors.push('Diễn giải không được để trống');
    }

    if (lockedUntil && voucher.post_date && isDateLocked(voucher.post_date, lockedUntil)) {
        errors.push(`Ngày hạch toán phải sau ngày khóa kỳ: ${formatDateVN(lockedUntil)}`);
    }

    if (!voucher.lines || voucher.lines.length === 0) {
        errors.push('Cần ít nhất một dòng chi tiết');
    } else {
        voucher.lines.forEach((line, index) => {
            if (!line.debitAcc && !line.creditAcc) {
                errors.push(`Dòng ${index + 1}: Chưa chọn tài khoản Nợ hoặc Có`);
            }
            if (!line.amount || line.amount <= 0) {
                errors.push(`Dòng ${index + 1}: Số tiền phải lớn hơn 0`);
            }
        });
    }

    // Check balance
    const { balance } = calculateVoucherTotals(voucher.lines);
    if (Math.abs(balance) > 0.01) {
        errors.push(`Chênh lệch Nợ/Có: ${formatNumber(balance)} đ`);
    }

    return errors;
}
