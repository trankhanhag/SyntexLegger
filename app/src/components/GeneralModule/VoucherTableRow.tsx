/**
 * VoucherTableRow Component
 * SyntexLegger - Dòng trong bảng danh sách chứng từ
 *
 * Updated: Using unified styles and Badge components
 */

import React from 'react';
import type { Voucher } from './types/voucher.types';
import { formatDateVN, getVoucherTypeName, getVoucherTypeColor } from './utils/voucher.utils';
import { formatNumber } from '../../utils/format';

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
        const status = voucher.status || 'draft';
        const config: Record<string, { label: string; className: string }> = {
            draft: { label: 'Nháp', className: 'badge badge-draft' },
            posted: { label: 'Đã ghi sổ', className: 'badge badge-posted' },
            cancelled: { label: 'Đã hủy', className: 'badge badge-cancelled' },
        };
        const { label, className } = config[status] || config.draft;
        return <span className={className}>{label}</span>;
    };

    return (
        <tr
            onClick={handleClick}
            className={`table-row group cursor-pointer
                ${selected ? 'table-row-selected' : ''}
                ${locked ? 'opacity-60' : ''}
            `}
        >
            {/* Checkbox */}
            {showCheckbox && (
                <td className="table-cell w-10">
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
                    <span className="material-symbols-outlined icon-sm text-slate-400" title="Đã khóa sổ">
                        lock
                    </span>
                </td>
            )}

            {/* Date */}
            <td className="table-cell text-slate-600 dark:text-slate-400 w-28">
                {voucher.doc_date ? formatDateVN(voucher.doc_date) : '-'}
            </td>

            {/* Type badge */}
            <td className="table-cell w-32">
                <span className={`badge ${getVoucherTypeColor(voucher.type)}`}>
                    {getVoucherTypeName(voucher.type)}
                </span>
            </td>

            {/* Status */}
            <td className="table-cell-center w-24">
                {statusBadge()}
            </td>

            {/* Doc No */}
            <td className="table-cell w-32">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {voucher.doc_no}
                </span>
            </td>

            {/* Description */}
            <td className="table-cell max-w-xs truncate">
                {voucher.description || '-'}
            </td>

            {/* Amount */}
            <td className="table-cell-number-bold text-purple-600 dark:text-purple-400 w-36">
                {formatNumber(voucher.total_amount)}
            </td>

            {/* Actions */}
            <td className="table-cell w-28">
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
                        <span className="material-symbols-outlined icon-md">edit</span>
                    </button>

                    <button
                        onClick={handleDuplicate}
                        className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Nhân bản"
                    >
                        <span className="material-symbols-outlined icon-md">content_copy</span>
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
                        <span className="material-symbols-outlined icon-md">delete</span>
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
        <tr className="table-header">
            {showCheckbox && (
                <th className="table-header-cell w-10">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                </th>
            )}
            {showLockColumn && <th className="px-1 py-2 w-6"></th>}
            <th className="table-header-cell w-28">Ngày</th>
            <th className="table-header-cell w-32">Loại</th>
            <th className="table-header-cell-center w-24">Trạng thái</th>
            <th className="table-header-cell w-32">Số CT</th>
            <th className="table-header-cell">Diễn giải</th>
            <th className="table-header-cell-right w-36">Số tiền</th>
            <th className="table-header-cell-center w-28">Thao tác</th>
        </tr>
    );
};

export default VoucherTableRow;
