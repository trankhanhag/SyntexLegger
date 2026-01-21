import React from 'react';
import { masterDataService, assetService, voucherService } from '../api';
import { normalizeDateValue, toInputDateValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';

// Simple Modal Wrapper
const Modal = ({ title, onClose, children, panelClass }: { title: string, onClose: () => void, children: React.ReactNode, panelClass?: string }) => (
    <FormModal title={title} onClose={onClose} panelClass={panelClass}>
        {children}
    </FormModal>
);

interface AllocationProps {
    onClose: () => void;
    lockedUntil?: string;
}

export const Allocation: React.FC<AllocationProps> = ({ onClose, lockedUntil }) => {
    const [step, setStep] = React.useState(1); // 1: Setup, 2: Calculate/Preview, 3: Executing, 4: Done
    const [period, setPeriod] = React.useState(`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`);
    const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
    const [allocationItems, setAllocationItems] = React.useState<any[]>([]);
    const [targetAcc, setTargetAcc] = React.useState('642');
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchAllocationData = async () => {
            try {
                setLoading(true);
                // Try fetching CCDC items first (Real Data Source)
                const ccdcRes = await assetService.getCCDC();
                if (ccdcRes.data && ccdcRes.data.length > 0) {
                    const items = ccdcRes.data.map((item: any) => ({
                        id: item.code,
                        name: item.name,
                        acc: '242', // Default allocation account
                        total: item.cost,
                        periods: item.useful_life || 12, // Default 12 months if missing
                        remaining: item.net_book_value || item.cost,
                        amount: Math.round((item.cost / (item.useful_life || 12))) // Monthly linear allocation
                    }));
                    setAllocationItems(items);
                    setSelectedItems(items.map((i: any) => i.id));
                } else {
                    // Fallback to Account Balance Logic (Legacy)
                    const res = await masterDataService.getAccountBalances();
                    const items = res.data.filter((acc: any) => acc.account_code.startsWith('242'))
                        .map((acc: any) => ({
                            id: acc.account_code,
                            name: acc.account_name,
                            acc: acc.account_code,
                            total: acc.total_debit,
                            periods: 12,
                            remaining: acc.net_balance,
                            amount: Math.round(acc.net_balance / 12)
                        }));
                    setAllocationItems(items);
                    setSelectedItems(items.map((i: any) => i.id));
                }
            } catch (err) {
                console.error("Failed to fetch allocation data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllocationData();
    }, []);

    const formatNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
    const isLockedDate = (date?: string) => !!(lockedUntil && date && normalizeDateValue(date) <= normalizeDateValue(lockedUntil));

    const toggleItem = (id: string) => {
        setSelectedItems((prev: string[]) => prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]);
    };

    const selectedTotal = allocationItems
        .filter(item => selectedItems.includes(item.id))
        .reduce((sum, item) => sum + item.amount, 0);

    const executeAllocation = async () => {
        setLoading(true);
        try {
            const lines = allocationItems
                .filter(item => selectedItems.includes(item.id))
                .map(item => ({
                    description: `Phân bổ ${item.name} - Kỳ ${period}`,
                    debitAcc: targetAcc,
                    creditAcc: item.acc,
                    amount: item.amount
                }));

            if (lines.length === 0) return;

            const [year, month] = period.split('-');
            const lastDay = toInputDateValue(new Date(Number(year), Number(month), 0));
            if (isLockedDate(lastDay)) {
                alert("Kỳ đã khóa, không thể phân bổ vào ngày này.");
                return;
            }

            const voucher = {
                doc_no: `PB-${period.replace('-', '.')}`,
                doc_date: lastDay,
                post_date: lastDay,
                description: `Phân bổ chi phí trả trước - Kỳ ${month}/${year}`,
                type: 'ALLOCATION',
                total_amount: selectedTotal,
                lines: lines
            };

            await voucherService.save(voucher);
            setStep(4);
        } catch (err) {
            console.error("Allocation failed:", err);
            alert("Lỗi khi thực hiện phân bổ.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <Modal title="Phân bổ Chi phí Trả trước (242)" onClose={onClose}>
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Đang tìm kiếm các khoản trích trước...</p>
            </div>
        </Modal>
    );

    return (
        <Modal title="Phân bổ Chi phí Trả trước (242)" onClose={onClose}>
            {step === 1 && (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex-1 min-w-[200px]">
                            <label className="form-label">Kỳ phân bổ</label>
                            <input
                                type="month"
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="form-label">Tổng cộng kỳ này</label>
                            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 py-1">
                                {formatNum(selectedTotal)} <span className="text-sm font-normal text-slate-400">VNĐ</span>
                            </div>
                        </div>
                    </div>

                    {/* Target Account Selection */}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Tài khoản chi phí nhận phân bổ:</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetAcc"
                                    value="642"
                                    checked={targetAcc === '642'}
                                    onChange={(e) => setTargetAcc(e.target.value)}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className={targetAcc === '642' ? "font-bold text-blue-700" : ""}>642 - Chi hoạt động SXKD</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetAcc"
                                    value="611"
                                    checked={targetAcc === '611'}
                                    onChange={(e) => setTargetAcc(e.target.value)}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className={targetAcc === '611' ? "font-bold text-blue-700" : ""}>611 - Chi hoạt động thường xuyên (NSNN)</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">list_alt</span> Danh sách khoản phân bổ
                        </h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900">
                                    <tr className="text-left border-b border-slate-200 dark:border-slate-700 text-slate-500">
                                        <th className="p-3 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.length === allocationItems.length}
                                                onChange={() => setSelectedItems(selectedItems.length === allocationItems.length ? [] : allocationItems.map((i: any) => i.id))}
                                                className="rounded border-slate-300 text-blue-600"
                                            />
                                        </th>
                                        <th className="p-3 font-semibold">Tên chi phí</th>
                                        <th className="p-3 font-semibold text-right">TK</th>
                                        <th className="p-3 font-semibold text-right">Tổng giá trị</th>
                                        <th className="p-3 font-semibold text-right">Phân bổ tháng này</th>
                                        <th className="p-3 font-semibold text-right">Còn lại</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allocationItems.map(item => (
                                        <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => toggleItem(item.id)}
                                                    className="rounded border-slate-300 text-blue-600"
                                                />
                                            </td>
                                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                                            <td className="p-3 text-right text-slate-500">{item.acc}</td>
                                            <td className="p-3 text-right font-mono">{formatNum(item.total)}</td>
                                            <td className="p-3 text-right font-mono font-bold text-blue-600">{formatNum(item.amount)}</td>
                                            <td className="p-3 text-right font-mono text-slate-400">{formatNum(item.remaining - item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
                        <button
                            disabled={selectedItems.length === 0}
                            onClick={() => setStep(2)}
                            className="bg-blue-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-bold shadow-md flex items-center gap-2"
                        >
                            Bước tiếp theo: Xem bút toán <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg text-amber-800 dark:text-amber-300 text-sm flex gap-3">
                        <span className="material-symbols-outlined">info</span>
                        <div>
                            Hệ thống sẽ tự động tạo các bút toán Nợ TK {targetAcc} / Có TK 242.
                            Các bút toán này sẽ được ghi vào Sổ cái sau khi bạn xác nhận.
                        </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-inner">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900">
                                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3">Diễn giải</th>
                                    <th className="p-3 text-center">Nợ</th>
                                    <th className="p-3 text-center">Có</th>
                                    <th className="p-3 text-right">Số tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allocationItems.filter(i => selectedItems.includes(i.id)).map(item => (
                                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700">
                                        <td className="p-3 italic text-slate-600 dark:text-slate-400">Phân bổ {item.name} - Kỳ {period}</td>
                                        <td className="p-3 text-center font-mono font-bold">{targetAcc}</td>
                                        <td className="p-3 text-center font-mono font-bold">242</td>
                                        <td className="p-3 text-right font-mono font-bold text-blue-600">{formatNum(item.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 dark:bg-slate-900/50 font-sans">
                                    <td colSpan={3} className="p-3 font-bold text-right uppercase text-xs tracking-wider text-slate-500">Tổng cộng phân bổ</td>
                                    <td className="p-3 text-right font-mono font-bold text-lg text-blue-700">{formatNum(selectedTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined">chevron_left</span> Quay lại
                        </button>
                        <button
                            onClick={executeAllocation}
                            className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 transition font-bold shadow-lg flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">auto_fix_high</span> Xác nhận & Ghi sổ
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse">Đang xử lý phân bổ chi phí...</p>
                </div>
            )}

            {step === 4 && (
                <div className="py-12 flex flex-col items-center text-center space-y-4">
                    <div className="bg-green-100 dark:bg-green-900/40 p-6 rounded-full text-green-600 dark:text-green-400 mb-2">
                        <span className="material-symbols-outlined text-6xl">check_circle</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Phân bổ hoàn tất!</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm">
                        Đã tự động tạo các bút toán cho {selectedItems.length} khoản chi phí với tổng số tiền {formatNum(selectedTotal)} VNĐ.
                    </p>
                    <div className="pt-8">
                        <button
                            onClick={onClose}
                            className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all hover:scale-105"
                        >
                            Hoàn tất
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default Allocation;
