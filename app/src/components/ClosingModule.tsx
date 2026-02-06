import React from 'react';
import { masterDataService, voucherService } from '../api';
import { normalizeDateValue, toInputDateValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import logger from '../utils/logger';

// Simple Modal Wrapper
const Modal = ({ title, onClose, children, panelClass }: { title: string, onClose: () => void, children: React.ReactNode, panelClass?: string }) => (
    <FormModal title={title} onClose={onClose} panelClass={panelClass}>
        {children}
    </FormModal>
);

interface ClosingEntriesProps {
    onClose: () => void;
    lockedUntil?: string;
}

export const ClosingEntries: React.FC<ClosingEntriesProps> = ({ onClose, lockedUntil }) => {
    const [step, setStep] = React.useState(1); // 1: Check, 2: Preview, 3: Success
    const [balances, setBalances] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await masterDataService.getAccountBalances();
                setBalances(res.data);
            } catch (err) {
                logger.error("Failed to fetch account balances:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBalances();
    }, []);

    const revenueAccounts = balances.filter(acc =>
        (acc.account_code.startsWith('5') || acc.account_code.startsWith('7')) && acc.account_code.length >= 3
    ).map(acc => ({
        code: acc.account_code,
        name: acc.account_name,
        balance: Math.abs(acc.net_balance)
    })).filter(acc => acc.balance > 0);

    const expenseAccounts = balances.filter(acc =>
        acc.account_code.startsWith('6') || acc.account_code.startsWith('8')
    ).map(acc => ({
        code: acc.account_code,
        name: acc.account_name,
        balance: Math.round(acc.net_balance)
    })).filter(acc => acc.balance > 0);

    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpense = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const profit = totalRevenue - totalExpense;
    const isLockedDate = (date?: string) => !!(lockedUntil && date && normalizeDateValue(date) <= normalizeDateValue(lockedUntil));

    const executeClosing = async () => {
        setLoading(true);
        try {
            const closingDate = toInputDateValue();
            if (isLockedDate(closingDate)) {
                alert("Kỳ đã khóa, không thể kết chuyển vào ngày này.");
                return;
            }
            const lines: any[] = [];

            // 1. Revenue to 911 (Debit Revenue / Credit 911)
            revenueAccounts.forEach(acc => {
                lines.push({
                    description: `Kết chuyển thu ${acc.name}`,
                    debitAcc: acc.code,
                    creditAcc: '911',
                    amount: acc.balance
                });
            });

            // 2. Expense to 911 (Debit 911 / Credit Expense)
            expenseAccounts.forEach(acc => {
                lines.push({
                    description: `Kết chuyển chi ${acc.name}`,
                    debitAcc: '911',
                    creditAcc: acc.code,
                    amount: acc.balance
                });
            });

            // 3. Surplus/Deficit (911 to 4212)
            if (profit !== 0) {
                lines.push({
                    description: profit > 0 ? "Kết chuyển Lãi năm nay" : "Kết chuyển Lỗ năm nay",
                    debitAcc: profit > 0 ? '911' : '4212',
                    creditAcc: profit > 0 ? '4212' : '911',
                    amount: Math.abs(profit)
                });
            }

            const voucher = {
                doc_no: `KC-${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
                doc_date: closingDate,
                post_date: closingDate,
                description: `Bút toán kết chuyển cuối kỳ ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
                type: 'CLOSING',
                total_amount: lines.reduce((sum, l) => sum + l.amount, 0),
                lines: lines
            };

            await voucherService.save(voucher);
            setStep(3);
        } catch (err) {
            logger.error("Closing failed:", err);
            alert("Không thể thực hiện kết chuyển. Vui lòng kiểm tra lại kết nối.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <Modal title="Kết chuyển cuối kỳ" onClose={onClose}>
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse">Đang định giá số dư tài khoản...</p>
            </div>
        </Modal>
    );

    const formatNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

    return (
        <Modal title={`Kết chuyển Lãi/Lỗ - Kỳ ${new Date().getMonth() + 1}/${new Date().getFullYear()}`} onClose={onClose}>
            {step === 1 && (
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-900 flex justify-between items-center text-sm">
                        <div className="flex gap-8">
                            <div><span className="text-slate-500">Mã kỳ:</span> <span className="font-bold">{new Date().getFullYear()}.{(new Date().getMonth() + 1).toString().padStart(2, '0')}</span></div>
                            <div><span className="text-slate-500">Người thực hiện:</span> <span className="font-bold">Admin</span></div>
                        </div>
                        <div className="text-blue-700 dark:text-blue-300 font-medium">Báo cáo Kết quả Kinh doanh tạm tính kỳ này</div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Doanh thu */}
                        <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600">trending_up</span> Doanh thu (Có 911)
                            </h4>
                            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr className="text-left border-b border-slate-200 dark:border-slate-600">
                                            <th className="p-2 font-medium">TK</th>
                                            <th className="p-2 font-medium">Tên TK</th>
                                            <th className="p-2 font-medium text-right">Số dư</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {revenueAccounts.map(acc => (
                                            <tr key={acc.code} className="border-b border-slate-100 dark:border-slate-600">
                                                <td className="p-2 font-medium text-blue-600 dark:text-blue-400">{acc.code}</td>
                                                <td className="p-2 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{acc.name}</td>
                                                <td className="p-2 text-right">{formatNum(acc.balance)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-green-50/50 dark:bg-green-900/10 font-bold">
                                            <td colSpan={2} className="p-2 italic">Tổng cộng</td>
                                            <td className="p-2 text-right text-green-600">{formatNum(totalRevenue)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Chi phí */}
                        <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-600">trending_down</span> Chi phí (Nợ 911)
                            </h4>
                            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr className="text-left border-b border-slate-200 dark:border-slate-600">
                                            <th className="p-2 font-medium">TK</th>
                                            <th className="p-2 font-medium">Tên TK</th>
                                            <th className="p-2 font-medium text-right">Số dư</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenseAccounts.map(acc => (
                                            <tr key={acc.code} className="border-b border-slate-100 dark:border-slate-600">
                                                <td className="p-2 font-medium text-red-600 dark:text-red-400">{acc.code}</td>
                                                <td className="p-2 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{acc.name}</td>
                                                <td className="p-2 text-right">{formatNum(acc.balance)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-red-50/50 dark:bg-red-900/10 font-bold">
                                            <td colSpan={2} className="p-2 italic">Tổng cộng</td>
                                            <td className="p-2 text-right text-red-600">{formatNum(totalExpense)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg flex justify-between items-center border font-bold ${profit >= 0 ? 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined">{profit >= 0 ? 'verified' : 'warning'}</span>
                            Kết quả Kinh doanh: {profit >= 0 ? 'Lãi' : 'Lỗ'}
                        </div>
                        <div className="text-xl">{formatNum(profit)} VNĐ</div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition font-medium">Đóng</button>
                        <button
                            onClick={() => setStep(2)}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md font-bold flex items-center gap-2"
                        >
                            Bước tiếp theo: Xem trước bút toán <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <p className="text-slate-600 dark:text-slate-300">
                        Hệ thống đã tự động xây dựng các bút toán kết chuyển như sau. Vui lòng kiểm tra lại trước khi chính thức ghi sổ.
                    </p>

                    <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr className="text-left border-b border-slate-200 dark:border-slate-600">
                                    <th className="p-3">Diễn giải</th>
                                    <th className="p-3">Nợ</th>
                                    <th className="p-3">Có</th>
                                    <th className="p-3 text-right">Số tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {revenueAccounts.map(acc => (
                                    <tr key={'rev-' + acc.code}>
                                        <td className="p-3 text-slate-700 dark:text-slate-200">Kết chuyển {acc.name}</td>
                                        <td className="p-3 font-medium">{acc.code}</td>
                                        <td className="p-3 font-medium">911</td>
                                        <td className="p-3 text-right font-bold text-blue-600">{formatNum(acc.balance)}</td>
                                    </tr>
                                ))}
                                {expenseAccounts.map(acc => (
                                    <tr key={'exp-' + acc.code}>
                                        <td className="p-3 text-slate-700 dark:text-slate-200">Kết chuyển {acc.name}</td>
                                        <td className="p-3 font-medium">911</td>
                                        <td className="p-3 font-medium">{acc.code}</td>
                                        <td className="p-3 text-right font-bold text-red-600">{formatNum(acc.balance)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-slate-200 dark:border-slate-600 font-bold">
                                    <td className="p-3 text-slate-800 dark:text-white">{profit >= 0 ? "Kết chuyển Lãi năm nay" : "Kết chuyển Lỗ năm nay"}</td>
                                    <td className="p-3">{profit >= 0 ? '911' : '4212'}</td>
                                    <td className="p-3">{profit >= 0 ? '4212' : '911'}</td>
                                    <td className="p-3 text-right text-purple-600">{formatNum(Math.abs(profit))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition flex items-center gap-1 font-medium">
                            <span className="material-symbols-outlined">chevron_left</span> Quay lại
                        </button>
                        <button
                            onClick={executeClosing}
                            className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 transition shadow-lg font-bold flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">task_alt</span> Xác nhận Kết chuyển & Ghi sổ
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="py-12 flex flex-col items-center text-center space-y-4">
                    <div className="bg-green-100 dark:bg-green-900/40 p-6 rounded-full text-green-600 dark:text-green-400 mb-4 animate-bounce">
                        <span className="material-symbols-outlined text-6xl">done_all</span>
                    </div>
                    <h3 className="text-2xl font-bold p-2 text-slate-800 dark:text-white">Thành công!</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm">
                        Kỳ kế toán {new Date().getMonth() + 1}/{new Date().getFullYear()} đã được kết chuyển hoàn tất. Các bút toán đã được tự động thêm vào Sổ cái.
                    </p>
                    <div className="pt-8">
                        <button onClick={onClose} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">
                            Quay về màn hình chính
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ClosingEntries;
