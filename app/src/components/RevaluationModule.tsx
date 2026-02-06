import React from 'react';
import { masterDataService, voucherService } from '../api';
import { normalizeDateValue, toInputDateValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import { DateInput } from './DateInput';
import logger from '../utils/logger';

// Simple Modal Wrapper
const Modal = ({ title, onClose, children, panelClass }: { title: string, onClose: () => void, children: React.ReactNode, panelClass?: string }) => (
    <FormModal title={title} onClose={onClose} panelClass={panelClass}>
        {children}
    </FormModal>
);

interface RevaluationProps {
    onClose: () => void;
    lockedUntil?: string;
}

export const Revaluation: React.FC<RevaluationProps> = ({ onClose, lockedUntil }) => {
    const [step, setStep] = React.useState(1); // 1: Currency & Rate, 2: Preview Entries, 3: Processing, 4: Done
    const [currency, setCurrency] = React.useState('USD');
    const [newRate, setNewRate] = React.useState(25450);
    const [date, setDate] = React.useState(toInputDateValue());

    const [accounts, setAccounts] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchFCBalance = async () => {
            try {
                const res = await masterDataService.getAccountBalances();
                // Sub-accounts usually ending in 2 or specifically for foreign currency
                const fc = res.data.filter((acc: any) =>
                    acc.account_code === '1112' || acc.account_code === '1122' ||
                    acc.account_code === '131' || acc.account_code === '331'
                ).map((acc: any) => ({
                    id: acc.account_code,
                    code: acc.account_code,
                    name: acc.account_name,
                    fc_amount: 0, // System GL tracks VND only, User must input original FC Amount manually
                    book_value: Math.abs(acc.net_balance),
                    book_rate: 0
                })).filter((acc: any) => acc.book_value > 0);

                if (fc.length === 0) {
                    setAccounts([]);
                } else {
                    setAccounts(fc);
                }
            } catch (err) {
                logger.error("Failed to fetch FC balances:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFCBalance();
    }, []);

    const formatNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
    const isLockedDate = (value?: string) => !!(lockedUntil && value && normalizeDateValue(value) <= normalizeDateValue(lockedUntil));

    // Calculate Gain/Loss for each account
    const processedAccounts = accounts.map(acc => {
        const book_rate = acc.fc_amount > 0 ? acc.book_value / acc.fc_amount : 0;
        const revaluedValue = acc.fc_amount * newRate;
        const diff = revaluedValue - acc.book_value;
        return { ...acc, book_rate, revaluedValue, diff };
    });

    const updateFCAmount = (id: string, newVal: number) => {
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, fc_amount: newVal } : a));
    };

    const totalGain = processedAccounts.filter(a => a.diff > 0).reduce((sum, a) => sum + a.diff, 0);
    const totalLoss = Math.abs(processedAccounts.filter(a => a.diff < 0).reduce((sum, a) => sum + a.diff, 0));

    const executeRevaluation = async () => {
        setLoading(true);
        try {
            if (isLockedDate(date)) {
                alert("Kỳ đã khóa, không thể đánh giá vào ngày này.");
                return;
            }
            const missingFc = processedAccounts.filter(acc => acc.book_value > 0 && !(acc.fc_amount > 0));
            if (missingFc.length > 0) {
                alert("Vui lòng nhập nguyên tệ cho các tài khoản cần đánh giá.");
                return;
            }
            const lines: any[] = [];
            processedAccounts.forEach(acc => {
                if (Math.abs(acc.diff) < 1) return;

                const isAsset = acc.code.startsWith('1');
                const isGain = acc.diff > 0;

                if (isAsset) {
                    lines.push({
                        description: `Đánh giá lại ${acc.name} - ${isGain ? 'Lãi' : 'Lỗ'} tỷ giá`,
                        debitAcc: isGain ? acc.code : '413',
                        creditAcc: isGain ? '413' : acc.code,
                        amount: Math.abs(acc.diff)
                    });
                } else {
                    // Liabilities (3xx)
                    lines.push({
                        description: `Đánh giá lại ${acc.name} - ${isGain ? 'Lỗ' : 'Lãi'} tỷ giá`,
                        debitAcc: isGain ? '413' : acc.code,
                        creditAcc: isGain ? acc.code : '413',
                        amount: Math.abs(acc.diff)
                    });
                }
            });

            if (lines.length === 0) {
                alert("Không có chênh lệch tỷ giá để ghi sổ.");
                return;
            }

            const voucher = {
                doc_no: `DG-${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
                doc_date: date,
                post_date: date,
                description: `Đánh giá lại ngoại tệ ${currency} - Ngày ${date}`,
                type: 'REVALUATION',
                total_amount: lines.reduce((sum, l) => sum + l.amount, 0),
                lines: lines
            };

            await voucherService.save(voucher);
            setStep(4);
        } catch (err) {
            logger.error("Revaluation failed:", err);
            alert("Lỗi khi thực hiện đánh giá lại ngoại tệ.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <Modal title="Đánh giá lại số dư Ngoại tệ" onClose={onClose}>
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Đang truy vấn số dư ngoại tệ...</p>
            </div>
        </Modal>
    );

    return (
        <Modal title="Đánh giá lại số dư Ngoại tệ" onClose={onClose}>
            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div>
                            <label className="form-label">Loại tiền</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="USD">USD - Đô la Mỹ</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="JPY">JPY - Yên Nhật</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Tỷ giá đánh giá</label>
                            <input
                                type="number"
                                value={newRate}
                                onChange={(e) => setNewRate(Number(e.target.value))}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm font-mono font-bold text-blue-600"
                            />
                        </div>
                        <div>
                            <label className="form-label">Ngày đánh giá</label>
                            <DateInput
                                value={date}
                                onChange={(val) => setDate(val)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-500">account_balance</span> Số dư tài khoản ngoại tệ
                            </h4>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900">
                                    <tr className="text-left border-b border-slate-200 dark:border-slate-700 text-slate-500">
                                        <th className="p-3 font-semibold">Tài khoản</th>
                                        <th className="p-3 font-semibold text-right">Nguyên tệ ({currency})</th>
                                        <th className="p-3 font-semibold text-right">Tỷ giá ghi sổ</th>
                                        <th className="p-3 font-semibold text-right">Giá trị ghi sổ (VND)</th>
                                        <th className="p-3 font-semibold text-right">Giá trị đánh giá lại</th>
                                        <th className="p-3 font-semibold text-right">Chênh lệnh (+/-)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedAccounts.map(acc => (
                                        <tr key={acc.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{acc.code}</div>
                                                <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{acc.name}</div>
                                            </td>
                                            <td className="p-3 text-right font-mono">
                                                <input
                                                    type="number"
                                                    value={acc.fc_amount}
                                                    onChange={(e) => updateFCAmount(acc.id, Number(e.target.value))}
                                                    className="w-24 text-right bg-transparent border-b border-dotted border-slate-400 focus:border-blue-500 outline-none font-bold text-blue-600"
                                                />
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-400">{formatNum(acc.book_rate ? Math.round(acc.book_rate) : 0)}</td>
                                            <td className="p-3 text-right font-mono">{formatNum(acc.book_value)}</td>
                                            <td className="p-3 text-right font-mono font-bold text-blue-600">{formatNum(acc.revaluedValue)}</td>
                                            <td className={`p-3 text-right font-mono font-bold ${acc.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {acc.diff > 0 ? '+' : ''}{formatNum(acc.diff)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                                        <td colSpan={5} className="p-3 text-right uppercase text-xs text-slate-500">Tổng chênh lệch lãi tỷ giá (515)</td>
                                        <td className="p-3 text-right text-green-600 font-mono">{formatNum(totalGain)}</td>
                                    </tr>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold">
                                        <td colSpan={5} className="p-3 text-right uppercase text-xs text-slate-500">Tổng chênh lệch lỗ tỷ giá (635)</td>
                                        <td className="p-3 text-right text-red-600 font-mono">-{formatNum(totalLoss)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={onClose} className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold transition-colors">Hủy</button>
                        <button
                            onClick={() => setStep(2)}
                            className="bg-purple-600 text-white px-8 py-2 rounded-lg hover:bg-purple-700 transition font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2"
                        >
                            Bước tiếp theo: Xem bút toán <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-lg text-purple-800 dark:text-purple-300 text-sm flex gap-3">
                        <span className="material-symbols-outlined">balance</span>
                        <div>
                            Hệ thống sẽ tạo các bút toán đánh giá lại tỷ giá theo mã quy định:
                            <span className="font-bold"> 4131 (Chênh lệch tỷ giá đánh giá lại cuối kỳ)</span>.
                            Sau đó sẽ kết chuyển vào doanh thu tài chính (515) hoặc chi phí tài chính (635).
                        </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900">
                                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3">Diễn giải bút toán</th>
                                    <th className="p-3 text-center">Nợ</th>
                                    <th className="p-3 text-center">Có</th>
                                    <th className="p-3 text-right">Số tiền (VND)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedAccounts.map(acc => (
                                    acc.diff !== 0 && (
                                        <tr key={'entry-' + acc.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                            <td className="p-3 italic text-slate-600 dark:text-slate-400">Đánh giá lại tỷ giá TK {acc.code}</td>
                                            <td className="p-3 text-center font-mono font-bold">{acc.diff > 0 ? acc.code : '4131'}</td>
                                            <td className="p-3 text-center font-mono font-bold">{acc.diff > 0 ? '4131' : acc.code}</td>
                                            <td className={`p-3 text-right font-mono font-bold ${acc.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNum(Math.abs(acc.diff))}</td>
                                        </tr>
                                    )
                                ))}
                                {/* Ket chuyen 413 -> 515/635 */}
                                {totalGain > 0 && (
                                    <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                        <td className="p-3 font-bold text-blue-600">Kết chuyển Lãi tỷ giá vào 515</td>
                                        <td className="p-3 text-center font-mono font-bold">4131</td>
                                        <td className="p-3 text-center font-mono font-bold">515</td>
                                        <td className="p-3 text-right font-mono font-bold text-green-600">{formatNum(totalGain)}</td>
                                    </tr>
                                )}
                                {totalLoss > 0 && (
                                    <tr className="border-t border-slate-100 dark:border-slate-700">
                                        <td className="p-3 font-bold text-red-600">Kết chuyển Lỗ tỷ giá vào 635</td>
                                        <td className="p-3 text-center font-mono font-bold">635</td>
                                        <td className="p-3 text-center font-mono font-bold">4131</td>
                                        <td className="p-3 text-right font-mono font-bold text-red-600">{formatNum(totalLoss)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined">chevron_left</span> Quay lại
                        </button>
                        <button
                            onClick={executeRevaluation}
                            className="bg-purple-600 text-white px-10 py-2 rounded-lg hover:bg-purple-700 transition font-bold shadow-xl shadow-purple-500/20 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">receipt_long</span> Xác nhận Đánh giá & Ghi sổ
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Đang hạch toán chênh lệch tỷ giá...</p>
                </div>
            )}

            {step === 4 && (
                <div className="py-12 flex flex-col items-center text-center space-y-4">
                    <div className="bg-purple-100 dark:bg-purple-900/40 p-6 rounded-full text-purple-600 dark:text-purple-400 mb-2">
                        <span className="material-symbols-outlined text-6xl">currency_exchange</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Đánh giá ngoại tệ hoàn tất!</h2>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg w-full max-w-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Lãi tỷ giá ghi nhận:</span>
                            <span className="text-green-600 font-bold">+{formatNum(totalGain)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Lỗ tỷ giá ghi nhận:</span>
                            <span className="text-red-600 font-bold">-{formatNum(totalLoss)}</span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 max-w-sm mt-4">
                        Các chứng từ hạch toán đã được tự động thêm vào Nhật ký chung và Sổ cái.
                    </p>
                    <div className="pt-8 w-full">
                        <button
                            onClick={onClose}
                            className="w-full max-w-sm py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-xl shadow-purple-500/30 transition-all hover:scale-[1.02]"
                        >
                            Quay lại màn hình chính
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default Revaluation;
