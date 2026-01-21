/**
 * VoucherTableRow Component
 * SyntexHCSN - Dòng trong bảng danh sách chứng từ
 */

import React from 'react';
import type { Voucher } from './types/voucher.types';
import { formatCurrency, formatDateVN, getVoucherTypeName, getVoucherTypeColor } from './utils/voucher.utils';

export interface VoucherTableRowProps {
    voucher: Voucher;
    selected?: boolean;
    locked?: boolean;
    onSelect?: (voucher: Voucher, selected: boolean) => void;
    onEdit?: (voucher: Voucher) => void;
    onDelete?: (voucher: Voucher) => void;
    onDuplicate?: (voucher: Voucher) => void;
    showCheckbox?: boolean;
}

export const VoucherTableRow: React.FC<VoucherTableRowProps> = ({
    voucher,
    selected = false,
    locked = false,
    onSelect,
    onEdit,
    onDelete,
    onDuplicate,
    showCheckbox = true
}) => {
    const handleClick = () => {
        if (!locked && onEdit) {
            onEdit(voucher);
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        onSelect?.(voucher, e.target.checked);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!locked) onEdit?.(voucher);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!locked) onDelete?.(voucher);
    };

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDuplicate?.(voucher);
    };

    const statusBadge = () => {
        if (voucher.status === 'draft' || !voucher.status) {
            return (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    Draft
                </span>
            );
        }
        if (voucher.status === 'posted') {
            return (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    Posted
                </span>
            );
        }
        if (voucher.status === 'cancelled') {
            return (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    Hủy
                </span>
            );
        }
        return null;
    };

    return (
        <tr
            onClick={handleClick}
            className={`group cursor-pointer transition-colors
                ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                ${locked ? 'opacity-60' : ''}
            `}
        >
            {/* Checkbox */}
            {showCheckbox && (
                <td className="px-3 py-2 w-10">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                </td>
            )}

            {/* Lock indicator */}
            {locked && (
                <td className="px-1 py-2 w-6">
                    <span className="material-symbols-outlined text-sm text-slate-400" title="Đã khóa sổ">
                        lock
                    </span>
                </td>
            )}

            {/* Date */}
            <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 w-28">
                {voucher.doc_date ? formatDateVN(voucher.doc_date) : '-'}
            </td>

            {/* Type badge */}
            <td className="px-3 py-2 w-32">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getVoucherTypeColor(voucher.type)}`}>
                    {getVoucherTypeName(voucher.type)}
                </span>
            </td>

            {/* Status */}
            <td className="px-3 py-2 w-24 text-center">
                {statusBadge()}
            </td>

            {/* Doc No */}
            <td className="px-3 py-2 w-32">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {voucher.doc_no}
                </span>
            </td>

            {/* Description */}
            <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">
                {voucher.description || '-'}
            </td>

            {/* Amount */}
            <td className="px-3 py-2 text-right w-36">
                <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                    {formatCurrency(voucher.total_amount)}
                </span>
            </td>

            {/* Actions */}
            <td className="px-3 py-2 w-28">
                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleEdit}
                        disabled={locked}
                        className={`p-1 rounded transition
                            ${locked
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40'
                            }`}
                        title="Sửa"
                    >
                        <span className="material-symbols-outlined text-lg">edit</span>
                    </button>

                    <button
                        onClick={handleDuplicate}
                        className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Nhân bản"
                    >
                        <span className="material-symbols-outlined text-lg">content_copy</span>
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={locked}
                        className={`p-1 rounded transition
                            ${locked
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40'
                            }`}
                        title="Xóa"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    );
};

/**
 * VoucherTableHeader - Header cho bảng danh sách chứng từ
 */
export interface VoucherTableHeaderProps {
    allSelected?: boolean;
    onSelectAll?: (selected: boolean) => void;
    showCheckbox?: boolean;
    showLockColumn?: boolean;
}

export const VoucherTableHeader: React.FC<VoucherTableHeaderProps> = ({
    allSelected = false,
    onSelectAll,
    showCheckbox = true,
    showLockColumn = false
}) => {
    return (
        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left">
            {showCheckbox && (
                <th className="px-3 py-2 w-10">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                </th>
            )}
            {showLockColumn && <th className="px-1 py-2 w-6"></th>}
            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Ngày</th>
            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">Loại</th>
            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Trạng thái</th>
            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">Số CT</th>
            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diễn giải</th>
            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-36 text-right">Số tiền</th>
            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28 text-center">Thao tác</th>
        </tr>
    );
};

export default VoucherTableRow;
