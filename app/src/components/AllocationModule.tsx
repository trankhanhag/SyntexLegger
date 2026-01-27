import React from 'react';
import { masterDataService, assetService, voucherService } from '../api';
import { normalizeDateValue, toInputDateValue, formatMonthVN, VIETNAMESE_MONTHS } from '../utils/dateUtils';
import { FormModal } from './FormModal';

// Simple Modal Wrapper
const Modal = ({ title, onClose, children, panelClass }: { title: string, onClose: () => void, children: React.ReactNode, panelClass?: string }) => (
    <FormModal title={title} onClose={onClose} panelClass={panelClass}>
        {children}
    </FormModal>
);

interface AllocationItem {
    id: string;
    name: string;
    acc: string;
    total: number;
    periods: number;
    remaining: number;
    amount: number;
    periodsRemaining: number;
    startDate?: string;
    alreadyAllocated: boolean;
}

interface AllocationProps {
    onClose: () => void;
    lockedUntil?: string;
}

// Format number with Vietnamese locale
const formatNum = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

// Format currency with đ symbol
const formatCurrency = (n: number) => `${formatNum(n)} ₫`;

export const Allocation: React.FC<AllocationProps> = ({ onClose, lockedUntil }) => {
    const [step, setStep] = React.useState(1); // 1: Setup, 2: Calculate/Preview, 3: Executing, 4: Done
    const [period, setPeriod] = React.useState(`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`);
    const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
    const [allocationItems, setAllocationItems] = React.useState<AllocationItem[]>([]);
    const [targetAcc, setTargetAcc] = React.useState('642');
    const [loading, setLoading] = React.useState(true);
    const [duplicateWarning, setDuplicateWarning] = React.useState<string[]>([]);

    const fetchAllocationData = React.useCallback(async () => {
        try {
            setLoading(true);
            setDuplicateWarning([]);

            // Fetch CCDC items
            const ccdcRes = await assetService.getCCDC();
            let items: AllocationItem[] = [];

            if (ccdcRes.data && ccdcRes.data.length > 0) {
                items = ccdcRes.data.map((item: any) => {
                    const totalPeriods = item.life_months || 12;
                    const monthlyAmount = Math.round(item.cost / totalPeriods);
                    const periodsAllocated = Math.round((item.allocated || 0) / monthlyAmount) || 0;
                    const periodsRemaining = Math.max(0, totalPeriods - periodsAllocated);

                    return {
                        id: item.id || item.code,
                        name: item.name,
                        acc: '242',
                        total: item.cost,
                        periods: totalPeriods,
                        remaining: item.remaining || (item.cost - (item.allocated || 0)),
                        amount: Math.min(monthlyAmount, item.remaining || item.cost),
                        periodsRemaining,
                        startDate: item.start_date,
                        alreadyAllocated: false
                    };
                });
            } else {
                // Fallback to Account Balance Logic
                const res = await masterDataService.getAccountBalances();
                items = res.data.filter((acc: any) => acc.account_code.startsWith('242'))
                    .map((acc: any) => ({
                        id: acc.account_code,
                        name: acc.account_name,
                        acc: acc.account_code,
                        total: acc.total_debit,
                        periods: 12,
                        remaining: acc.net_balance,
                        amount: Math.round(acc.net_balance / 12),
                        periodsRemaining: 12,
                        alreadyAllocated: false
                    }));
            }

            // Check for duplicates in selected period
            const duplicates: string[] = [];
            for (const item of items) {
                try {
                    const checkRes = await assetService.checkAllocationDuplicate(period, item.id);
                    if (checkRes.data?.exists) {
                        item.alreadyAllocated = true;
                        duplicates.push(item.name);
                    }
                } catch {
                    // Ignore check errors
                }
            }

            setDuplicateWarning(duplicates);
            setAllocationItems(items);

            // Only select items that haven't been allocated and have remaining balance
            const selectableItems = items.filter(i => !i.alreadyAllocated && i.remaining > 0);
            setSelectedItems(selectableItems.map(i => i.id));

        } catch (err) {
            console.error("Failed to fetch allocation data:", err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    React.useEffect(() => {
        fetchAllocationData();
    }, [fetchAllocationData]);

    const isLockedDate = (date?: string) => !!(lockedUntil && date && normalizeDateValue(date) <= normalizeDateValue(lockedUntil));

    const toggleItem = (id: string) => {
        const item = allocationItems.find(i => i.id === id);
        if (item?.alreadyAllocated) return; // Prevent selecting already allocated items

        setSelectedItems((prev: string[]) => prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]);
    };

    const updateItemAmount = (id: string, newAmount: number) => {
        setAllocationItems(prev => prev.map(item => {
            if (item.id === id) {
                // Ensure amount doesn't exceed remaining
                const validAmount = Math.min(Math.max(0, newAmount), item.remaining);
                return { ...item, amount: validAmount };
            }
            return item;
        }));
    };

    const selectedTotal = allocationItems
        .filter(item => selectedItems.includes(item.id))
        .reduce((sum, item) => sum + item.amount, 0);

    const executeAllocation = async () => {
        setLoading(true);
        try {
            const selectedAllocationItems = allocationItems.filter(item => selectedItems.includes(item.id));

            if (selectedAllocationItems.length === 0) {
                alert("Vui lòng chọn ít nhất một khoản để phân bổ.");
                setLoading(false);
                return;
            }

            const [year, month] = period.split('-');
            const lastDay = toInputDateValue(new Date(Number(year), Number(month), 0));

            if (isLockedDate(lastDay)) {
                alert("Kỳ đã khóa, không thể phân bổ vào ngày này.");
                setLoading(false);
                return;
            }

            // Create voucher lines
            const lines = selectedAllocationItems.map(item => ({
                description: `Phân bổ ${item.name} - Kỳ ${formatMonthVN(period)}`,
                debitAcc: targetAcc,
                creditAcc: item.acc,
                amount: item.amount
            }));

            const voucher = {
                doc_no: `PB-${period.replace('-', '.')}`,
                doc_date: lastDay,
                post_date: lastDay,
                description: `Phân bổ chi phí trả trước - Kỳ ${formatMonthVN(period)}`,
                type: 'ALLOCATION',
                total_amount: selectedTotal,
                lines: lines
            };

            // Save voucher
            const voucherRes = await voucherService.save(voucher);
            const voucherId = voucherRes.data?.id;

            // Record allocation history for each item
            for (const item of selectedAllocationItems) {
                await assetService.recordAllocation({
                    period,
                    item_id: item.id,
                    item_type: 'CCDC',
                    item_name: item.name,
                    amount: item.amount,
                    target_account: targetAcc,
                    voucher_id: voucherId
                });
            }

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
                        <div className="flex-1 min-w-[280px]">
                            <label className="form-label">Kỳ phân bổ</label>
                            <div className="flex gap-2">
                                <select
                                    value={period.split('-')[1] || '01'}
                                    onChange={(e) => {
                                        const year = period.split('-')[0];
                                        setPeriod(`${year}-${e.target.value}`);
                                    }}
                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {VIETNAMESE_MONTHS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={period.split('-')[0] || new Date().getFullYear().toString()}
                                    onChange={(e) => {
                                        const month = period.split('-')[1] || '01';
                                        setPeriod(`${e.target.value}-${month}`);
                                    }}
                                    className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="form-label">Tổng cộng kỳ này</label>
                            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 py-1">
                                {formatCurrency(selectedTotal)}
                            </div>
                        </div>
                    </div>

                    {/* Duplicate Warning */}
                    {duplicateWarning.length > 0 && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm flex gap-2">
                            <span className="material-symbols-outlined text-amber-500">warning</span>
                            <div>
                                <strong>Lưu ý:</strong> Các khoản sau đã được phân bổ trong kỳ {formatMonthVN(period)}:
                                <ul className="mt-1 ml-4 list-disc">
                                    {duplicateWarning.map((name, idx) => (
                                        <li key={idx}>{name}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Target Account Selection */}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4 flex-wrap">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Tài khoản chi phí nhận phân bổ:</label>
                        <div className="flex gap-4 flex-wrap">
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
                                                checked={selectedItems.length === allocationItems.filter(i => !i.alreadyAllocated && i.remaining > 0).length}
                                                onChange={() => {
                                                    const selectableItems = allocationItems.filter(i => !i.alreadyAllocated && i.remaining > 0);
                                                    setSelectedItems(selectedItems.length === selectableItems.length ? [] : selectableItems.map(i => i.id));
                                                }}
                                                className="rounded border-slate-300 text-blue-600"
                                            />
                                        </th>
                                        <th className="p-3 font-semibold">Tên chi phí</th>
                                        <th className="p-3 font-semibold text-center">TK</th>
                                        <th className="p-3 font-semibold text-right">Tổng giá trị</th>
                                        <th className="p-3 font-semibold text-center">Số kỳ còn</th>
                                        <th className="p-3 font-semibold text-right">Phân bổ tháng này</th>
                                        <th className="p-3 font-semibold text-right">Còn lại</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allocationItems.map(item => (
                                        <tr
                                            key={item.id}
                                            className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 
                                                ${item.alreadyAllocated ? 'opacity-50 bg-slate-100 dark:bg-slate-800' : ''}
                                                ${item.remaining <= 0 ? 'opacity-40' : ''}`}
                                        >
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => toggleItem(item.id)}
                                                    disabled={item.alreadyAllocated || item.remaining <= 0}
                                                    className="rounded border-slate-300 text-blue-600 disabled:opacity-50"
                                                />
                                            </td>
                                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                                {item.name}
                                                {item.alreadyAllocated && (
                                                    <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Đã phân bổ</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-mono">{item.acc}</td>
                                            <td className="p-3 text-right font-mono">{formatNum(item.total)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.periodsRemaining > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {item.periodsRemaining}/{item.periods}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                {selectedItems.includes(item.id) ? (
                                                    <input
                                                        type="text"
                                                        value={formatNum(item.amount)}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                                            updateItemAmount(item.id, val);
                                                        }}
                                                        className="w-28 text-right font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                ) : (
                                                    <span className="font-mono text-slate-400">{formatNum(item.amount)}</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-400">
                                                {formatNum(Math.max(0, item.remaining - (selectedItems.includes(item.id) ? item.amount : 0)))}
                                            </td>
                                        </tr>
                                    ))}
                                    {allocationItems.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400">
                                                Không có khoản chi phí trả trước nào cần phân bổ
                                            </td>
                                        </tr>
                                    )}
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
                            <strong>Kỳ phân bổ:</strong> {formatMonthVN(period)}<br />
                            Hệ thống sẽ tự động tạo các bút toán <strong>Nợ TK {targetAcc}</strong> / <strong>Có TK 242</strong>.<br />
                            Các bút toán này sẽ được ghi vào Sổ cái và cập nhật giá trị còn lại của CCDC sau khi bạn xác nhận.
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
                                        <td className="p-3 italic text-slate-600 dark:text-slate-400">
                                            Phân bổ {item.name} - Kỳ {formatMonthVN(period)}
                                        </td>
                                        <td className="p-3 text-center font-mono font-bold text-red-600">{targetAcc}</td>
                                        <td className="p-3 text-center font-mono font-bold text-green-600">242</td>
                                        <td className="p-3 text-right font-mono font-bold text-blue-600">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 dark:bg-slate-900/50 font-sans">
                                    <td colSpan={3} className="p-3 font-bold text-right uppercase text-xs tracking-wider text-slate-500">Tổng cộng phân bổ</td>
                                    <td className="p-3 text-right font-mono font-bold text-lg text-blue-700">{formatCurrency(selectedTotal)}</td>
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
                        Đã tự động tạo bút toán phân bổ cho <strong>{selectedItems.length}</strong> khoản chi phí
                        với tổng số tiền <strong>{formatCurrency(selectedTotal)}</strong> trong kỳ <strong>{formatMonthVN(period)}</strong>.
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
