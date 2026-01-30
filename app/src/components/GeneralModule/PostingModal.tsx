/**
 * PostingModal Component
 * SyntexLegger - Modal xác nhận ghi sổ chứng từ
 */

import React, { useState } from 'react';
import { FormModal } from '../FormModal';
import { voucherService } from '../../api';
import type { Voucher } from './types/voucher.types';
import { formatCurrency, formatDateVN, getVoucherTypeName } from './utils/voucher.utils';

export interface PostingModalProps {
    vouchers: Voucher[];
    onClose: () => void;
    onSuccess?: () => void;
    lockedUntil?: string;
}

export const PostingModal: React.FC<PostingModalProps> = ({
    vouchers,
    onClose,
    onSuccess,
    lockedUntil
}) => {
    const [posting, setPosting] = useState(false);
    const [results, setResults] = useState<{ success: string[], failed: { id: string, error: string }[] } | null>(null);

    // Filter out already posted vouchers
    const draftVouchers = vouchers.filter(v => v.status === 'draft' || !v.status);

    // Check for locked period violations
    const lockedVouchers = draftVouchers.filter(v =>
        lockedUntil && v.post_date && v.post_date <= lockedUntil
    );

    const validVouchers = draftVouchers.filter(v =>
        !lockedUntil || !v.post_date || v.post_date > lockedUntil
    );

    const totalAmount = validVouchers.reduce((sum, v) => sum + (v.total_amount || 0), 0);

    const handlePost = async () => {
        if (validVouchers.length === 0) return;

        setPosting(true);
        const success: string[] = [];
        const failed: { id: string, error: string }[] = [];

        for (const voucher of validVouchers) {
            try {
                await voucherService.save({
                    ...voucher,
                    status: 'POSTED'
                });
                success.push(voucher.id || voucher.doc_no);
            } catch (err: any) {
                failed.push({
                    id: voucher.id || voucher.doc_no,
                    error: err.message || 'Không thể ghi sổ'
                });
            }
        }

        setResults({ success, failed });
        setPosting(false);

        if (success.length > 0 && failed.length === 0) {
            onSuccess?.();
        }
    };

    const handleClose = () => {
        if (results?.success && results.success.length > 0) {
            onSuccess?.();
        }
        onClose();
    };

    return (
        <FormModal
            title="Xác nhận Ghi sổ Chứng từ"
            onClose={handleClose}
            icon="post_add"
            sizeClass="max-w-2xl"
        >
            {results ? (
                // Results view
                <div className="space-y-4">
                    {results.success.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                <span className="font-bold">Ghi sổ thành công: {results.success.length} chứng từ</span>
                            </div>
                            <div className="text-sm text-green-600 dark:text-green-400">
                                {results.success.slice(0, 5).join(', ')}
                                {results.success.length > 5 && ` và ${results.success.length - 5} chứng từ khác`}
                            </div>
                        </div>
                    )}

                    {results.failed.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
                                <span className="material-symbols-outlined">error</span>
                                <span className="font-bold">Lỗi: {results.failed.length} chứng từ</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                {results.failed.map((f, i) => (
                                    <div key={i} className="text-red-600 dark:text-red-400">
                                        • {f.id}: {f.error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t">
                        <button
                            onClick={handleClose}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            ) : (
                // Confirmation view
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{validVouchers.length}</div>
                                <div className="text-xs text-slate-500">Chứng từ sẽ ghi</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                                <div className="text-xs text-slate-500">Tổng giá trị</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-purple-600">{new Set(validVouchers.map(v => v.type)).size}</div>
                                <div className="text-xs text-slate-500">Loại chứng từ</div>
                            </div>
                        </div>
                    </div>

                    {/* Locked period warning */}
                    {lockedVouchers.length > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
                            <span className="material-symbols-outlined text-yellow-600">warning</span>
                            <div className="text-sm">
                                <span className="font-bold text-yellow-700 dark:text-yellow-300">
                                    {lockedVouchers.length} chứng từ nằm trong kỳ khóa sổ
                                </span>
                                <span className="text-yellow-600 dark:text-yellow-400">
                                    {' '}(trước {formatDateVN(lockedUntil!)}) sẽ bị bỏ qua.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Already posted info */}
                    {vouchers.length - draftVouchers.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-500">
                            <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                            {vouchers.length - draftVouchers.length} chứng từ đã ghi sổ trước đó sẽ bị bỏ qua.
                        </div>
                    )}

                    {/* Voucher list preview */}
                    {validVouchers.length > 0 && (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                    <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-3 py-2 font-bold text-slate-500">Số CT</th>
                                        <th className="px-3 py-2 font-bold text-slate-500">Ngày</th>
                                        <th className="px-3 py-2 font-bold text-slate-500">Loại</th>
                                        <th className="px-3 py-2 font-bold text-slate-500 text-right">Số tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {validVouchers.slice(0, 10).map((v, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-2 font-mono text-blue-600">{v.doc_no}</td>
                                            <td className="px-3 py-2">{v.doc_date ? formatDateVN(v.doc_date) : '-'}</td>
                                            <td className="px-3 py-2">{getVoucherTypeName(v.type)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{formatCurrency(v.total_amount)}</td>
                                        </tr>
                                    ))}
                                    {validVouchers.length > 10 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-2 text-center text-slate-400 italic">
                                                ... và {validVouchers.length - 10} chứng từ khác
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* No valid vouchers */}
                    {validVouchers.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                            <p className="mt-2">Không có chứng từ nào cần ghi sổ</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handlePost}
                            disabled={posting || validVouchers.length === 0}
                            className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {posting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Đang ghi sổ...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">post_add</span>
                                    Xác nhận Ghi sổ ({validVouchers.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </FormModal>
    );
};

export default PostingModal;
