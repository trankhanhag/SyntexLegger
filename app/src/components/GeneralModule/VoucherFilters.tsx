/**
 * VoucherFilters Component
 * SyntexHCSN - Bộ lọc chứng từ theo loại, ngày
 */

import React from 'react';
import { DateInput } from '../DateInput';
import type { VoucherFilter } from './types/voucher.types';
import { getVoucherTypeName } from './utils/voucher.utils';

// Danh sách loại chứng từ
const VOUCHER_TYPES = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'GENERAL', label: 'Phiếu chung' },
    { value: 'CASH_IN', label: 'Phiếu thu' },
    { value: 'CASH_OUT', label: 'Phiếu chi' },
    { value: 'BANK_IN', label: 'Báo có NH' },
    { value: 'BANK_OUT', label: 'Báo nợ NH' },
    { value: 'PURCHASE', label: 'Nhập kho' },
    { value: 'SALE', label: 'Xuất kho' },
    { value: 'CLOSING', label: 'Kết chuyển' },
    { value: 'ALLOCATION', label: 'Phân bổ' },
    { value: 'DEPRECIATION', label: 'Khấu hao' },
];

export interface VoucherFiltersProps {
    filter: VoucherFilter;
    onChange: (filter: Partial<VoucherFilter>) => void;
    onRefresh?: () => void;
    loading?: boolean;
    compact?: boolean;
}

export const VoucherFilters: React.FC<VoucherFiltersProps> = ({
    filter,
    onChange,
    onRefresh,
    loading = false,
    compact = false
}) => {
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({ type: e.target.value });
    };

    const handleFromDateChange = (value: string) => {
        onChange({ fromDate: value });
    };

    const handleToDateChange = (value: string) => {
        onChange({ toDate: value });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ search: e.target.value });
    };

    // Quick filter presets
    const setToday = () => {
        const today = new Date().toISOString().split('T')[0];
        onChange({ fromDate: today, toDate: today });
    };

    const setThisMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        onChange({ fromDate: firstDay, toDate: lastDay });
    };

    const setThisQuarter = () => {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        const firstDay = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
        onChange({ fromDate: firstDay, toDate: lastDay });
    };

    if (compact) {
        return (
            <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <select
                    value={filter.type || 'ALL'}
                    onChange={handleTypeChange}
                    className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                    {VOUCHER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>

                <DateInput
                    value={filter.fromDate || ''}
                    onChange={handleFromDateChange}
                    className="text-sm w-32"
                    placeholder="Từ ngày"
                />
                <span className="text-slate-400">→</span>
                <DateInput
                    value={filter.toDate || ''}
                    onChange={handleToDateChange}
                    className="text-sm w-32"
                    placeholder="Đến ngày"
                />

                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                        <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>
                            refresh
                        </span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
            <div className="flex flex-wrap items-end gap-4">
                {/* Loại chứng từ */}
                <div className="flex-shrink-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Loại chứng từ</label>
                    <select
                        value={filter.type || 'ALL'}
                        onChange={handleTypeChange}
                        className="w-40 text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {VOUCHER_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* Từ ngày */}
                <div className="flex-shrink-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
                    <DateInput
                        value={filter.fromDate || ''}
                        onChange={handleFromDateChange}
                        className="w-36 text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2"
                    />
                </div>

                {/* Đến ngày */}
                <div className="flex-shrink-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
                    <DateInput
                        value={filter.toDate || ''}
                        onChange={handleToDateChange}
                        className="w-36 text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2"
                    />
                </div>

                {/* Quick presets */}
                <div className="flex gap-1">
                    <button
                        onClick={setToday}
                        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                        Hôm nay
                    </button>
                    <button
                        onClick={setThisMonth}
                        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                        Tháng này
                    </button>
                    <button
                        onClick={setThisQuarter}
                        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                        Quý này
                    </button>
                </div>

                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tìm kiếm</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <span className="material-symbols-outlined text-lg">search</span>
                        </span>
                        <input
                            type="text"
                            value={filter.search || ''}
                            onChange={handleSearchChange}
                            placeholder="Số CT, diễn giải..."
                            className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Refresh button */}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>
                            refresh
                        </span>
                        <span className="text-sm font-medium">Làm mới</span>
                    </button>
                )}
            </div>

            {/* Active filter summary */}
            {(filter.type !== 'ALL' || filter.search) && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span>Đang lọc:</span>
                    {filter.type !== 'ALL' && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {getVoucherTypeName(filter.type || '')}
                        </span>
                    )}
                    {filter.search && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            "{filter.search}"
                        </span>
                    )}
                    <button
                        onClick={() => onChange({ type: 'ALL', search: '' })}
                        className="text-red-500 hover:text-red-700 ml-2"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default VoucherFilters;
