import React, { useState, useEffect } from 'react';
import { allocationService } from '../api';
import { formatDateVN } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import logger from '../utils/logger';

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} icon="account_balance_wallet" sizeClass="max-w-4xl">
        {children}
    </FormModal>
);

export const ReverseAllocation = ({ onClose, paymentVoucher, isReverse = false }: { onClose: () => void, paymentVoucher: any, isReverse?: boolean }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const partnerCode = paymentVoucher.partnerCode || paymentVoucher.lines?.[0]?.partnerCode;
    const totalPayment = paymentVoucher.total_amount || paymentVoucher.lines?.reduce((sum: number, l: any) => sum + (l.amount || 0), 0) || 0;

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!partnerCode) {
                setLoading(false);
                return;
            }
            if (isReverse && !paymentVoucher.id) {
                setInvoices([]);
                setAllocations({});
                setLoading(false);
                return;
            }
            try {
                const res = isReverse
                    ? await allocationService.getAllocationsByPayment(paymentVoucher.id)
                    : await allocationService.getUnpaidInvoices(partnerCode);
                setInvoices(res.data || []);

                if (isReverse) {
                    const suggestion: Record<string, number> = {};
                    (res.data || []).forEach((inv: any) => {
                        const key = inv.invoice_id || inv.id;
                        suggestion[key] = Number(inv.allocated_amount) || 0;
                    });
                    setAllocations(suggestion);
                } else {
                    // FIFO Suggestion
                    let remainingPayment = totalPayment;
                    const suggestion: Record<string, number> = {};
                    (res.data || []).forEach((inv: any) => {
                        if (remainingPayment > 0) {
                            const amount = Math.min(remainingPayment, inv.remaining_amount);
                            suggestion[inv.id] = amount;
                            remainingPayment -= amount;
                        }
                    });
                    setAllocations(suggestion);
                }
            } catch (err) {
                logger.error("Failed to fetch unpaid invoices:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, [partnerCode, totalPayment, isReverse, paymentVoucher.id]);

    const handleSave = async () => {
        try {
            const items = Object.entries(allocations)
                .filter(([_, amount]) => amount > 0)
                .map(([id, amount]) => ({ invoice_id: id, amount }));

            if (items.length === 0) {
                alert("Vui lòng chọn ít nhất một hóa đơn để xử lý.");
                return;
            }
            if (!isReverse && currentTotalAllocated > totalPayment) {
                alert("Tổng số tiền đối trừ vượt quá số tiền thanh toán.");
                return;
            }
            if (isReverse && !paymentVoucher.id) {
                alert("Chứng từ chưa được lưu. Không thể hoàn nhập đối trừ.");
                return;
            }

            const payload = {
                payment_id: paymentVoucher.id || 'NEW_PAYMENT',
                items
            };

            if (isReverse) {
                await allocationService.reverseAllocations(payload);
            } else {
                await allocationService.saveAllocations(payload);
            }
            alert(isReverse ? "Đã hoàn nhập đối trừ thành công!" : "Đã đối trừ công nợ thành công!");
            onClose();
        } catch (err) {
            logger.error("Failed to save allocations:", err);
            alert(isReverse ? "Lỗi khi hoàn nhập đối trừ." : "Lỗi khi đối trừ công nợ.");
        }
    };

    const currentTotalAllocated = Object.values(allocations).reduce((a, b) => a + (Number(b) || 0), 0);
    const totalAllocated = invoices.reduce((sum, inv) => sum + (Number(inv.allocated_amount) || 0), 0);

    return (
        <Modal title={`${isReverse ? 'Hoàn nhập' : 'Đối trừ'} Công nợ - Khách hàng: ${partnerCode || 'N/A'}`} onClose={onClose}>
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase">{isReverse ? 'Đã đối trừ' : 'Tổng tiền thanh toán'}</p>
                        <p className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">
                            {new Intl.NumberFormat('vi-VN').format(isReverse ? totalAllocated : totalPayment)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{isReverse ? 'Hoàn nhập đợt này' : 'Đã đối trừ'}</p>
                        <p className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono">{new Intl.NumberFormat('vi-VN').format(currentTotalAllocated)}</p>
                    </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-left">
                            <tr>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-[10px]">Ngày HĐ</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-[10px]">Số HĐ</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-[10px] text-right">Giá trị HĐ</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-[10px] text-right">{isReverse ? 'Đã đối trừ' : 'Còn nợ'}</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-[10px] text-right w-40">{isReverse ? 'Hoàn nhập đợt này' : 'Đối trừ đợt này'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={5} className="p-10 text-center italic text-slate-400">{isReverse ? 'Đang tải danh sách đã đối trừ...' : 'Đang tải danh sách hóa đơn...'}</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center italic text-slate-400">{isReverse ? 'Chưa có hóa đơn nào được đối trừ.' : 'Không có hóa đơn nợ nào cho khách hàng này.'}</td></tr>
                            ) : invoices.map(inv => {
                                const invoiceId = inv.invoice_id || inv.id;
                                const maxAmount = isReverse ? (Number(inv.allocated_amount) || 0) : (Number(inv.remaining_amount) || 0);
                                return (
                                    <tr key={invoiceId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3">{formatDateVN(inv.doc_date)}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{inv.doc_no}</td>
                                        <td className="px-4 py-3 text-right font-mono">{new Intl.NumberFormat('vi-VN').format(inv.total_amount)}</td>
                                        <td className={`px-4 py-3 text-right font-mono font-bold ${isReverse ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {new Intl.NumberFormat('vi-VN').format(maxAmount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                className="form-input text-right font-mono font-bold text-blue-600"
                                                value={allocations[invoiceId] || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setAllocations(prev => ({ ...prev, [invoiceId]: Math.min(val, maxAmount) }));
                                                }}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="form-actions">
                    <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Hủy bỏ</button>
                    <button
                        onClick={handleSave}
                        className="form-button-primary"
                    >
                        {isReverse ? 'Xác nhận Hoàn nhập' : 'Xác nhận Đối trừ'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
