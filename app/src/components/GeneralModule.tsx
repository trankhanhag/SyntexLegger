import React from 'react';
import { Spreadsheet } from './Spreadsheet';
import { GeneralVoucherDetailRow } from './GeneralVoucherDetailRow';
import { SmartTable, type ColumnDef } from './SmartTable';
import api, { masterDataService, voucherService, assetService, settingsService, budgetService, reportService, dimensionService, projectService, contractService, loanService, hcsnService } from '../api';
import { ReverseAllocation } from './ReverseAllocation';
import OpeningBalance from './OpeningBalance';
import { DateInput } from './DateInput';
import { type RibbonAction } from './Ribbon';
import { formatTimeVN, normalizeDateValue, toInputDateValue, toInputMonthValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import * as XLSX from 'xlsx';

// Import tách sub-components để giảm kích thước file
// TODO: Sau khi xóa local components, uncomment các dòng sau:
// import { ClosingEntries } from './ClosingModule';
// import { Allocation } from './AllocationModule';
// import { Revaluation } from './RevaluationModule';


// Simple Modal Wrapper
const Modal = ({ title, onClose, children, panelClass }: { title: string, onClose: () => void, children: React.ReactNode, panelClass?: string }) => (
    <FormModal title={title} onClose={onClose} panelClass={panelClass}>
        {children}
    </FormModal>
);

// VirtualAuditHealthCheck has been moved to its own file app/src/components/AuditModal.tsx
// to allow global overlay without switching active tabs.

// NOTE: ClosingEntries, Allocation, Revaluation cũng đã được tách ra các file riêng:
// - ClosingModule.tsx, AllocationModule.tsx, RevaluationModule.tsx
// Tuy nhiên, các component local vẫn được giữ lại để đảm bảo tương thích.

const ClosingEntries = ({ onClose, lockedUntil }: { onClose: () => void, lockedUntil?: string }) => {
    const [step, setStep] = React.useState(1); // 1: Check, 2: Preview, 3: Success
    const [balances, setBalances] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);


    React.useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await masterDataService.getAccountBalances();
                setBalances(res.data);
            } catch (err) {
                console.error("Failed to fetch account balances:", err);
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
        balance: Math.round(acc.net_balance) // Expenses are positive in net_balance (D-C)
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
                // Profit > 0 (Surplus): Credit 4212, Debit 911
                // Profit < 0 (Deficit): Debit 4212, Credit 911
                lines.push({
                    description: profit > 0 ? "Kết chuyển Thặng dư năm nay" : "Kết chuyển Thâm hụt năm nay",
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
            console.error("Closing failed:", err);
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
        <Modal title={`Kết chuyển Thặng dư/Thâm hụt - Kỳ ${new Date().getMonth() + 1}/${new Date().getFullYear()}`} onClose={onClose}>
            {step === 1 && (
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-900 flex justify-between items-center text-sm">
                        <div className="flex gap-8">
                            <div><span className="text-slate-500">Mã kỳ:</span> <span className="font-bold">{new Date().getFullYear()}.{(new Date().getMonth() + 1).toString().padStart(2, '0')}</span></div>
                            <div><span className="text-slate-500">Người thực hiện:</span> <span className="font-bold">Admin</span></div>
                        </div>
                        <div className="text-blue-700 dark:text-blue-300 font-medium">Báo cáo kết quả hoạt động tạm tính kỳ này</div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Thu các khoản */}
                        <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600">trending_up</span> Thu các khoản (Có 911)
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

                        {/* Chi hoạt động */}
                        <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-600">trending_down</span> Chi hoạt động (Nợ 911)
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
                            Kết quả hoạt động: {profit >= 0 ? 'Thặng dư' : 'Thâm hụt'}
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
                                    <td className="p-3 text-slate-800 dark:text-white">{profit >= 0 ? "Kết chuyển Thặng dư năm nay" : "Kết chuyển Thâm hụt năm nay"}</td>
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

const Allocation = ({ onClose, lockedUntil }: { onClose: () => void, lockedUntil?: string }) => {
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

const Revaluation = ({ onClose, lockedUntil }: { onClose: () => void, lockedUntil?: string }) => {
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
                console.error("Failed to fetch FC balances:", err);
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
                    // diff > 0 means Credit > Debit (Debt increases), which is a LOSS
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
            console.error("Revaluation failed:", err);
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

const PeriodLock = ({ onClose, onRefresh }: { onClose: () => void, onRefresh: () => void }) => {
    const [lockedDate, setLockedDate] = React.useState('2024-10-31');
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await settingsService.getSettings();
                if (res.data.locked_until_date) {
                    setLockedDate(res.data.locked_until_date);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            await settingsService.updateSetting('locked_until_date', lockedDate);
            alert("Đã cập nhật ngày khóa sổ thành công.");
            onRefresh();
            onClose();
        } catch (err) {
            console.error("Failed to update lock date:", err);
            alert("Lỗi khi cập nhật ngày khóa sổ.");
        }
    };

    if (loading) return null;

    return (
        <Modal title="Khóa sổ Kỳ Kế toán" onClose={onClose}>
            <div className="flex items-start gap-4 mb-6">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Xác nhận khóa sổ?</h3>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Các chứng từ phát sinh trước hoặc trong ngày khóa sổ sẽ <span className="font-bold text-red-500">không thể chỉnh sửa hoặc xóa</span>.
                        Thao tác này nhằm đảm bảo tính toàn vẹn dữ liệu cho báo cáo tài chính.
                    </p>
                </div>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Ngày Khóa sổ (Khóa đến hết ngày):</label>
                <DateInput
                    className="form-input"
                    value={lockedDate}
                    onChange={setLockedDate}
                />
            </div>

            <div className="form-actions border-0 pt-0">
                <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                <button
                    onClick={handleSave}
                    className="form-button-primary bg-red-600 hover:bg-red-700"
                >
                    Xác nhận Khóa sổ
                </button>
            </div>
        </Modal>
    );
};

const Reconciliation = ({ onClose }: { onClose: () => void }) => {
    const [status, setStatus] = React.useState<'idle' | 'running' | 'done'>('idle');
    const [activeCheck, setActiveCheck] = React.useState<string | null>(null);
    const [progress, setProgress] = React.useState(0);
    const [logs, setLogs] = React.useState<string[]>([]);
    const [results, setResults] = React.useState<any[]>([]);

    const checkTypeStyles: Record<string, string> = {
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
    };

    const checkTypes = [
        { id: 'inventory', title: 'Đối chiếu Kho - Sổ cái', icon: 'inventory_2', tone: 'blue', desc: 'Tìm chênh lệch giữa Sổ chi tiết Vật tư và TK 152, 153, 156.' },
        { id: 'debt', title: 'Đối chiếu Công nợ', icon: 'account_balance_wallet', tone: 'indigo', desc: 'So khớp Sổ chi tiết Công nợ với TK 131, 331.' },
        { id: 'cash', title: 'Kiểm tra Âm Quỹ / Kho', icon: 'money_off', tone: 'amber', desc: 'Phát hiện thời điểm tiền hoặc hàng bị âm trong kỳ.' },
        { id: 'tax', title: 'Kiểm tra Thuế', icon: 'tax_alert', tone: 'teal', desc: 'Đối chiếu bảng kê mua vào/bán ra với Sổ cái 133, 3331.' },
    ];

    const runCheck = async (id: string, title: string) => {
        setStatus('running');
        setActiveCheck(title);
        setProgress(0);
        setLogs([`Bắt đầu tiến trình: ${title}...`]);
        setResults([]);

        const steps = [
            "Đang kết nối cơ sở dữ liệu...",
            "Đang truy vấn sổ cái các tài khoản liên quan...",
            "Đang đối chiếu dữ liệu chi tiết...",
            "Đang tính toán chênh lệch...",
            "Đang tổng hợp kết quả..."
        ];

        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
            setProgress(((i + 1) / steps.length) * 100);
            setLogs(prev => [...prev, steps[i]]);
        }

        // Real-world Checks based on Account Balances and Reports
        try {
            const res = await masterDataService.getAccountBalances();
            const balances = res.data;

            if (id === 'inventory') {
                // Fetch Inventory Report
                const reportRes = await reportService.getInventorySummary({ period: toInputMonthValue() });
                const reportItems = reportRes.data || [];

                // Aggregate Report by Account (assuming items have account_code or map key)
                // For now, assume report returns total value per item, we sum all up and compare with total 15x
                // Or try to match if report has account info.
                // Simplified: Sum of all inventory vs Sum of 152+153+156...

                const totalReportValue = reportItems.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0);

                const stockAccs = balances.filter((acc: any) => acc.account_code.startsWith('15'));
                const totalLedgerValue = stockAccs.reduce((sum: number, acc: any) => sum + acc.net_balance, 0);

                setResults([{
                    item: 'Tổng giá trị Hàng tồn kho',
                    ledger: totalLedgerValue,
                    detail: totalReportValue,
                    diff: totalLedgerValue - totalReportValue,
                    reason: Math.abs(totalLedgerValue - totalReportValue) < 1000 ? 'Khớp số liệu' : 'Chênh lệch Sổ cái và Kho'
                }]);

            } else if (id === 'debt') {
                // Fetch Debt Report
                const reportRes = await reportService.getDebtLedger({ period: toInputMonthValue() });
                const reportItems = reportRes.data || [];

                // 131 Receivable
                const receivableAcc = balances.find((acc: any) => acc.account_code === '131');
                const totalReceivableLedger = receivableAcc ? receivableAcc.net_balance : 0;

                // Sum report for 131 (Debit balance of customers)
                const totalReceivableDetail = reportItems
                    .filter((item: any) => item.account_code === '131')
                    .reduce((sum: number, item: any) => sum + (item.end_debit - item.end_credit), 0);

                // 331 Payable
                const payableAcc = balances.find((acc: any) => acc.account_code === '331');
                const totalPayableLedger = payableAcc ? payableAcc.net_balance : 0; // Usually Credit balance (negative logic in some systems, positive in others. Here net_balance usually Debit - Credit)
                // If 331 has Credit balance, net_balance is negative.
                // Let's assume net_balance is signed.

                const totalPayableDetail = reportItems
                    .filter((item: any) => item.account_code === '331')
                    .reduce((sum: number, item: any) => sum + (item.end_debit - item.end_credit), 0);

                setResults([
                    {
                        item: 'Phải thu Khách hàng (131)',
                        ledger: totalReceivableLedger,
                        detail: totalReceivableDetail,
                        diff: totalReceivableLedger - totalReceivableDetail,
                        reason: Math.abs(totalReceivableLedger - totalReceivableDetail) < 1000 ? 'Khớp' : 'Lệch chi tiết'
                    },
                    {
                        item: 'Phải trả Nhà cung cấp (331)',
                        ledger: totalPayableLedger,
                        detail: totalPayableDetail,
                        diff: totalPayableLedger - totalPayableDetail,
                        reason: Math.abs(totalPayableLedger - totalPayableDetail) < 1000 ? 'Khớp' : 'Lệch chi tiết'
                    }
                ]);

            } else if (id === 'cash') {
                const cashAccs = balances.filter((acc: any) => acc.account_code.startsWith('11'));
                setResults(cashAccs.map((acc: any) => ({
                    item: `${acc.account_code} - ${acc.account_name}`,
                    ledger: acc.net_balance,
                    detail: acc.net_balance, // Cash usually matches itself unless physical count differs (manual input needed)
                    diff: acc.net_balance < 0 ? acc.net_balance : 0,
                    reason: acc.net_balance < 0 ? 'Cảnh báo: Âm quỹ!' : 'Số dư hợp lệ'
                })));
            } else {
                setResults([
                    { item: 'Thuế GTGT (1331)', ledger: 0, detail: 0, diff: 0, reason: 'Chưa có dữ liệu đối chiếu' },
                ]);
            }
        } catch (err) {
            console.error("Reconciliation failed:", err);
            setLogs(prev => [...prev, "Lỗi khi truy vấn số liệu thực tế."]);
        }

        setLogs(prev => [...prev, "Hoàn tất kiểm tra."]);
        setStatus('done');
    };

    return (
        <Modal title="Kiểm tra & Đối chiếu Số liệu" onClose={onClose}>
            {status === 'idle' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {checkTypes.map(ct => {
                        const toneClass = checkTypeStyles[ct.tone] || checkTypeStyles.blue;
                        return (
                            <button
                                key={ct.id}
                                onClick={() => runCheck(ct.id, ct.title)}
                                className="flex flex-col items-start p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition group text-left relative overflow-hidden"
                            >
                                <div className={`${toneClass} p-2 rounded mb-3 group-hover:scale-110 transition-transform`}>
                                    <span className="material-symbols-outlined">{ct.icon}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">{ct.title}</h3>
                                <p className="text-sm text-slate-500 mt-1">{ct.desc}</p>
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-blue-500">play_circle</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {status === 'running' && (
                <div className="py-8 flex flex-col items-center">
                    <div className="w-24 h-24 mb-6 relative">
                        <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
                        <div
                            className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"
                            style={{ clipPath: `inset(0 0 0 0)` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-blue-600">
                            {Math.round(progress)}%
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{activeCheck}</h3>
                    <p className="text-slate-500 animate-pulse mb-8 italic">Vui lòng chờ trong giây lát...</p>

                    <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-xs space-y-1 max-h-40 overflow-y-auto">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-400 font-mono">[{formatTimeVN()}]</span>
                                <span className={i === logs.length - 1 ? "text-blue-600 font-bold" : "text-slate-600 dark:text-slate-400"}>
                                    {log}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status === 'done' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600">
                                <span className="material-symbols-outlined">verified</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white leading-none">Kết quả: {activeCheck}</h3>
                                <p className="text-xs text-slate-500 mt-1">Hoàn tất lúc {formatTimeVN()}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setStatus('idle')}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span> Kiểm tra lại
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900">
                                <tr className="text-left">
                                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Đối tượng / Tài khoản</th>
                                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Sổ cái</th>
                                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Chi tiết</th>
                                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Chênh lệch</th>
                                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Lý do / Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.length > 0 ? results.map((res, i) => (
                                    <tr key={i} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{res.item}</td>
                                        <td className="p-3 text-right font-mono">{new Intl.NumberFormat('vi-VN').format(res.ledger)}</td>
                                        <td className="p-3 text-right font-mono">{new Intl.NumberFormat('vi-VN').format(res.detail)}</td>
                                        <td className={`p-3 text-right font-mono font-bold ${res.diff === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {res.diff === 0 ? '-' : new Intl.NumberFormat('vi-VN').format(res.diff)}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${res.diff === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                                                {res.reason}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">Chúc mừng! Không phát hiện sai sót nào.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-end gap-3 border-t pt-4 border-slate-100 dark:border-slate-700">
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition font-bold shadow-sm"
                >
                    {status === 'done' ? 'Xác nhận & Đóng' : 'Đóng'}
                </button>
                {status === 'done' && (
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-md shadow-blue-500/20">
                        Xuất báo cáo (PDF)
                    </button>
                )}
            </div>
        </Modal>
    );
};

const GeneralVoucherFormModal = ({ onClose, voucherData, lockedUntil }: { onClose: () => void, voucherData?: any, lockedUntil?: string }) => {
    const [accounts, setAccounts] = React.useState<any[]>([]);
    const [partners, setPartners] = React.useState<any[]>([]);
    const [balancesCache, setBalancesCache] = React.useState<Record<string, number>>({});
    const [showAllocation, setShowAllocation] = React.useState(false);
    const [showReverseAllocation, setShowReverseAllocation] = React.useState(false);
    const [products, setProducts] = React.useState<any[]>([]);
    const [projects, setProjects] = React.useState<any[]>([]);
    const [contracts, setContracts] = React.useState<any[]>([]);
    const [debtNotes, setDebtNotes] = React.useState<any[]>([]);
    const [dimConfigs, setDimConfigs] = React.useState<any[]>([]);
    const [dimOptions, setDimOptions] = React.useState<Record<number, any[]>>({});
    const [fundSources, setFundSources] = React.useState<any[]>([]); // HCSN Fund Sources
    const [budgetEstimates, setBudgetEstimates] = React.useState<any[]>([]); // HCSN Budget Estimates
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    const emptyLine = {
        description: '',
        debitAcc: '',
        creditAcc: '',
        amount: 0,
        partnerCode: '',
        dim1: '',
        dim2: '',
        dim3: '',
        dim4: '',
        dim5: '',
        projectCode: '',
        contractCode: '',
        debtNote: '',
        input_unit: '',
        input_quantity: 0,
        quantity: 0,
        cost_price: 0,
        fund_source_id: '', // HCSN field
        budget_estimate_id: '' // HCSN field
    };

    const createDefaultVoucher = () => ({
        docNo: 'PK' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        docDate: toInputDateValue(),
        postDate: toInputDateValue(),
        description: '',
        type: 'GENERAL',
        refNo: '',
        attachments: 0,
        currency: 'VND',
        fxRate: 1,
        status: 'POSTED',
        lines: [{ ...emptyLine }, { ...emptyLine }]
    });

    const [voucher, setVoucher] = React.useState(() => {
        if (!voucherData) return createDefaultVoucher();
        return {
            ...createDefaultVoucher(),
            ...voucherData,
            lines: (voucherData.lines || []).map((line: any) => ({ ...emptyLine, ...line }))
        };
    });

    React.useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const results = await Promise.allSettled([
                    masterDataService.getAccounts(),
                    masterDataService.getPartners(),
                    masterDataService.getProducts(),
                    projectService.getProjects(),
                    contractService.getContracts(),
                    loanService.getDebtNotes(),
                    dimensionService.getConfigs(),
                    dimensionService.getDimensions(1),
                    dimensionService.getDimensions(2),
                    dimensionService.getDimensions(3),
                    dimensionService.getDimensions(4),
                    dimensionService.getDimensions(5),
                    hcsnService.getFundSources(), // Fetch Fund Sources
                    hcsnService.getBudgetEstimates() // Fetch Budget Estimates
                ]);

                const [
                    accRes,
                    partRes,
                    prodRes,
                    projRes,
                    contractRes,
                    debtNoteRes,
                    dimCfgRes,
                    dim1Res,
                    dim2Res,
                    dim3Res,
                    dim4Res,
                    dim5Res,
                    fundRes,
                    budgetRes
                ] = results;

                if (accRes.status === 'fulfilled') setAccounts(accRes.value.data || []);
                if (partRes.status === 'fulfilled') setPartners(partRes.value.data || []);
                if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
                if (projRes.status === 'fulfilled') setProjects(projRes.value.data || []);
                if (contractRes.status === 'fulfilled') setContracts(contractRes.value.data || []);
                if (debtNoteRes.status === 'fulfilled') setDebtNotes(debtNoteRes.value.data || []);
                if (dimCfgRes.status === 'fulfilled') setDimConfigs(dimCfgRes.value.data || []);
                if (fundRes && fundRes.status === 'fulfilled') {
                    const d = fundRes.value.data;
                    setFundSources(Array.isArray(d) ? d : (d?.data || []));
                }
                if (budgetRes && budgetRes.status === 'fulfilled') {
                    const d = budgetRes.value.data;
                    setBudgetEstimates(Array.isArray(d) ? d : (d?.data || []));
                }

                const nextDimOptions: Record<number, any[]> = {};
                if (dim1Res.status === 'fulfilled') nextDimOptions[1] = dim1Res.value.data || [];
                if (dim2Res.status === 'fulfilled') nextDimOptions[2] = dim2Res.value.data || [];
                if (dim3Res.status === 'fulfilled') nextDimOptions[3] = dim3Res.value.data || [];
                if (dim4Res.status === 'fulfilled') nextDimOptions[4] = dim4Res.value.data || [];
                if (dim5Res.status === 'fulfilled') nextDimOptions[5] = dim5Res.value.data || [];
                setDimOptions(nextDimOptions);
            } catch (err) {
                console.error("Failed to fetch master data:", err);
            }
        };
        fetchMasterData();
    }, []);

    const addLine = () => {
        setVoucher({
            ...voucher,
            lines: [...voucher.lines, { ...emptyLine, description: voucher.description || '' }]
        });
    };

    const removeLine = (index: number) => {
        if (voucher.lines.length <= 1) return;
        setVoucher({
            ...voucher,
            lines: voucher.lines.filter((_: any, i: number) => i !== index)
        });
    };

    const updateLine = async (index: number, field: string, value: any) => {
        const newLines = [...voucher.lines];
        let currentLine = { ...newLines[index] };

        if (field === 'product') {
            // value is productCode
            currentLine.dim1 = value; // Store Product Code in dim1
            const prod = products.find(p => p.code === value);
            if (prod) {
                currentLine.input_unit = prod.unit;
                currentLine.input_quantity = 0;
                currentLine.quantity = 0;
                // Pre-fill Description if empty
                if (!currentLine.description) currentLine.description = prod.name;
            } else {
                currentLine.input_unit = '';
                currentLine.input_quantity = 0;
                currentLine.quantity = 0;
            }
        } else if (field === 'unit') {
            currentLine.input_unit = value;
            // Trigger Calc
            calculateConversion(currentLine, products);
        } else if (field === 'input_quantity') {
            currentLine.input_quantity = Number(value) || 0;
            // Trigger Calc
            calculateConversion(currentLine, products);
        } else {
            // Default update
            // @ts-ignore
            currentLine[field] = value;
        }

        newLines[index] = currentLine;
        setVoucher({ ...voucher, lines: newLines });

        // Real-time Balance Check for Inventory (Accounts starting with 15)
        if (field === 'creditAcc' && String(value).startsWith('15')) {
            try {
                const res = await masterDataService.getAccountBalance(value);
                setBalancesCache(prev => ({ ...prev, [value]: res.data.balance }));
            } catch (err) { }
        }
    };

    const calculateConversion = (line: any, products: any[]) => {
        const prod = products.find(p => p.code === line.dim1);
        if (!prod) return;

        let factor = 1;
        if (line.input_unit !== prod.unit) {
            // Check conversion units
            try {
                const convs = JSON.parse(prod.conversion_units || '[]');
                const target = convs.find((c: any) => c.unit === line.input_unit);
                if (target) factor = Number(target.factor) || 1;
            } catch (e) { }
        }

        line.quantity = line.input_quantity * factor;
        // Optionally update Amount if Price exist? For now, user inputs Amount manually.
        // Or if we had Price List logic, we could do: line.amount = line.quantity * prod.price
    };

    const normalizedLines = voucher.lines.filter((line: any) => {
        return line.description
            || line.debitAcc
            || line.creditAcc
            || Number(line.amount) > 0
            || line.dim1
            || line.partnerCode
            || line.projectCode
            || line.contractCode
            || line.debtNote
            || line.dim2
            || line.dim3
            || line.dim4
            || line.dim5
            || line.input_unit
            || Number(line.input_quantity) > 0
            || Number(line.quantity) > 0
            || Number(line.cost_price) > 0;
    });

    const totalAmount = normalizedLines.reduce((sum: number, line: any) => sum + (Number(line.amount) || 0), 0);

    const dimConfigByType = React.useMemo(() => {
        const map: Record<number, any> = {};
        dimConfigs.forEach((cfg: any) => {
            if (cfg?.id) map[Number(cfg.id)] = cfg;
        });
        return map;
    }, [dimConfigs]);

    const activeDimTypes = [2, 3, 4, 5].filter((type) => {
        const cfg = dimConfigByType[type];
        return !cfg || Number(cfg.isActive) === 1;
    });
    const mandatoryDimTypes = activeDimTypes.filter((type) => Number(dimConfigByType[type]?.isMandatory) === 1);
    const visibleDimTypes = React.useMemo(() => {
        return [2, 3, 4, 5].filter((type) => {
            const cfg = dimConfigByType[type];
            const hasData = voucher.lines.some((line: any) => line[`dim${type}`]);
            return hasData || !cfg || Number(cfg.isActive) === 1;
        });
    }, [dimConfigByType, voucher.lines]);

    const requiresPartner = (acc?: string) => {
        const code = String(acc || '');
        return code.startsWith('131') || code.startsWith('331') || code.startsWith('141') || code.startsWith('334') || code.startsWith('338');
    };

    const isInventoryAcc = (acc?: string) => String(acc || '').startsWith('15');

    const lineIssues = voucher.lines.map((line: any) => {
        const isEmpty = !(line.description
            || line.debitAcc
            || line.creditAcc
            || Number(line.amount) > 0
            || line.dim1
            || line.partnerCode
            || line.projectCode
            || line.contractCode
            || line.debtNote
            || line.dim2
            || line.dim3
            || line.dim4
            || line.dim5
            || line.input_unit
            || Number(line.input_quantity) > 0
            || Number(line.quantity) > 0
            || Number(line.cost_price) > 0);
        if (isEmpty) return { isEmpty: true };

        const missingDebit = !line.debitAcc;
        const missingCredit = !line.creditAcc;
        const missingAmount = !(Number(line.amount) > 0);
        const needPartner = requiresPartner(line.debitAcc) || requiresPartner(line.creditAcc);
        const missingPartner = needPartner && !line.partnerCode;
        const isInventory = isInventoryAcc(line.debitAcc) || isInventoryAcc(line.creditAcc);
        const missingProduct = isInventory && !line.dim1;
        const missingQuantity = isInventory && !(Number(line.input_quantity) > 0);
        const missingDims = mandatoryDimTypes.filter(type => !line[`dim${type}`]);

        return {
            isEmpty,
            missingDebit,
            missingCredit,
            missingAmount,
            missingPartner,
            missingProduct,
            missingQuantity,
            missingDims
        };
    });

    const summary = lineIssues.reduce((acc: any, issue: any) => {
        if (issue.isEmpty) return acc;
        if (issue.missingDebit) acc.missingDebit += 1;
        if (issue.missingCredit) acc.missingCredit += 1;
        if (issue.missingAmount) acc.missingAmount += 1;
        if (issue.missingPartner) acc.missingPartner += 1;
        if (issue.missingProduct) acc.missingProduct += 1;
        if (issue.missingQuantity) acc.missingQuantity += 1;
        if (issue.missingDims && issue.missingDims.length > 0) acc.missingDims += 1;
        return acc;
    }, { missingDebit: 0, missingCredit: 0, missingAmount: 0, missingPartner: 0, missingProduct: 0, missingQuantity: 0, missingDims: 0 });

    const headerMissing = {
        docNo: !voucher.docNo,
        docDate: !voucher.docDate,
        postDate: !voucher.postDate,
        type: !voucher.type,
        currency: !voucher.currency
    };

    const isLockedVoucher = !!(lockedUntil && (
        (voucher.docDate && normalizeDateValue(voucher.docDate) <= normalizeDateValue(lockedUntil))
        || (voucher.postDate && normalizeDateValue(voucher.postDate) <= normalizeDateValue(lockedUntil))
    ));

    const hasBlockingErrors = headerMissing.docNo || headerMissing.docDate || headerMissing.postDate || headerMissing.type || headerMissing.currency
        || summary.missingDebit > 0 || summary.missingCredit > 0 || summary.missingAmount > 0
        || summary.missingPartner > 0 || summary.missingProduct > 0 || summary.missingQuantity > 0 || summary.missingDims > 0;

    const hasAdvancedData = voucher.lines.some((line: any) =>
        line.projectCode
        || line.contractCode
        || line.debtNote
        || Number(line.cost_price) > 0
        || line.dim2
        || line.dim3
        || line.dim4
        || line.dim5
    );

    const effectiveShowAdvanced = showAdvanced || mandatoryDimTypes.length > 0 || hasAdvancedData;
    const advancedColumnCount = effectiveShowAdvanced ? (visibleDimTypes.length + 4) : 0;
    const trailingColSpan = advancedColumnCount + 2;

    const handleSave = async () => {
        try {
            if (hasBlockingErrors) {
                alert("Vui lòng bổ sung dữ liệu bắt buộc trước khi lưu chứng từ.");
                return;
            }
            if (isLockedVoucher) {
                alert("Chứng từ này đã nằm trong kỳ khóa sổ, không thể cập nhật.");
                return;
            }

            const filteredLines = normalizedLines.map((line: any) => ({
                description: line.description,
                debitAcc: line.debitAcc,
                creditAcc: line.creditAcc,
                amount: Number(line.amount) || 0,
                partnerCode: line.partnerCode || '',
                dim1: line.dim1 || '',
                dim2: line.dim2 || '',
                dim3: line.dim3 || '',
                dim4: line.dim4 || '',
                dim5: line.dim5 || '',
                projectCode: line.projectCode || '',
                contractCode: line.contractCode || '',
                debtNote: line.debtNote || '',
                cost_price: Number(line.cost_price) || 0,
                quantity: Number(line.quantity) || 0,
                input_unit: line.input_unit || '',
                input_quantity: Number(line.input_quantity) || 0,
                fund_source_id: line.fund_source_id || '',
                budget_estimate_id: line.budget_estimate_id || ''
            }));

            if (filteredLines.length === 0) {
                alert("Chứng từ chưa có dòng hạch toán hợp lệ.");
                return;
            }

            const includeInventory = voucher.type === 'SALES_INVOICE'
                || filteredLines.some((line: any) => isInventoryAcc(line.debitAcc) || isInventoryAcc(line.creditAcc));

            const payload = {
                id: voucher.id,
                doc_no: voucher.docNo,
                doc_date: voucher.docDate,
                post_date: voucher.postDate,
                description: voucher.description,
                type: voucher.type || 'GENERAL',
                ref_no: voucher.refNo || '',
                attachments: Number(voucher.attachments) || 0,
                currency: voucher.currency || 'VND',
                fx_rate: Number(voucher.fxRate) > 0 ? Number(voucher.fxRate) : 1,
                status: voucher.status || 'POSTED',
                total_amount: totalAmount,
                include_inventory: includeInventory,
                lines: filteredLines
            };
            await voucherService.save(payload);
            onClose();
            // Note: In a real app, you'd trigger a refresh of the list here.
            // For now, closing and re-opening will fetch new data (if list is integrated).
        } catch (err) {
            console.error("Failed to save voucher:", err);
            alert("Có lỗi xảy ra khi lưu chứng từ. Vui lòng thử lại.");
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const voucherTypeOptions = [
        { value: 'GENERAL', label: 'Phiếu kế toán' },
        { value: 'CASH_IN', label: 'Thu tiền mặt' },
        { value: 'CASH_OUT', label: 'Chi tiền mặt' },
        { value: 'BANK_IN', label: 'Thu ngân hàng' },
        { value: 'BANK_OUT', label: 'Chi ngân hàng' },
        { value: 'SALES_INVOICE', label: 'Hóa đơn bán' },
        { value: 'PURCHASE_INVOICE', label: 'Hóa đơn mua' },
        { value: 'SALES_RETURN', label: 'Trả hàng bán' },
        { value: 'PURCHASE_RETURN', label: 'Trả hàng mua' }
    ];

    const currencyOptions = ['VND', 'USD', 'EUR', 'JPY', 'KRW', 'CNY'];


    return (
        <Modal
            title={voucherData ? "Chỉnh sửa Chứng từ Nghiệp vụ" : "Lập Chứng từ Tổng hợp (Phiếu kế toán)"}
            onClose={onClose}
            panelClass="w-[90vw] min-w-[80vw] min-h-[80vh] max-h-[92vh]"
        >
            <div className="space-y-6">
                {/* Header Information */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        Thông tin chung
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Diễn giải chung / Nội dung nghiệp vụ</label>
                            <input
                                type="text"
                                value={voucher.description}
                                onChange={(e) => setVoucher({ ...voucher, description: e.target.value })}
                                placeholder="Nhập nội dung nghiệp vụ tổng quát..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Số chứng từ</label>
                            <input
                                type="text"
                                value={voucher.docNo}
                                onChange={(e) => setVoucher({ ...voucher, docNo: e.target.value })}
                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-4 py-2 text-sm outline-none font-bold text-purple-600 focus:border-purple-500 transition-all ${headerMissing.docNo ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Loại chứng từ</label>
                            <select
                                value={voucher.type}
                                onChange={(e) => setVoucher({ ...voucher, type: e.target.value })}
                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm outline-none font-semibold ${headerMissing.type ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                {voucherTypeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex flex-col justify-end">
                            <div className="flex bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg border border-purple-100 dark:border-purple-800 items-center justify-between h-[38px]">
                                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Tổng tiền phát sinh:</span>
                                <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">{formatNumber(totalAmount)} <span className="text-[10px] font-normal">{voucher.currency || 'VND'}</span></span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Ngày lập</label>
                            <DateInput
                                value={voucher.docDate}
                                onChange={(val) => setVoucher({ ...voucher, docDate: val })}
                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-4 py-2 text-sm outline-none focus:border-purple-500 transition-all font-mono ${headerMissing.docDate ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Ngày hạch toán</label>
                            <DateInput
                                value={voucher.postDate}
                                onChange={(val) => setVoucher({ ...voucher, postDate: val })}
                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-4 py-2 text-sm outline-none focus:border-purple-500 transition-all font-mono ${headerMissing.postDate ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Số chứng từ gốc / Tham chiếu</label>
                            <input
                                type="text"
                                value={voucher.refNo}
                                onChange={(e) => setVoucher({ ...voucher, refNo: e.target.value })}
                                placeholder="HÓA ĐƠN, HỢP ĐỒNG, ..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Kèm theo</label>
                            <input
                                type="number"
                                min={0}
                                value={voucher.attachments ?? 0}
                                onChange={(e) => setVoucher({ ...voucher, attachments: Number(e.target.value) || 0 })}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Tiền tệ / Tỷ giá</label>
                            <select
                                value={voucher.currency}
                                onChange={(e) => setVoucher({ ...voucher, currency: e.target.value })}
                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm outline-none font-semibold ${headerMissing.currency ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                {currencyOptions.map(cur => (
                                    <option key={cur} value={cur}>{cur}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min={0}
                                step="0.0001"
                                value={voucher.fxRate ?? 1}
                                onChange={(e) => setVoucher({ ...voucher, fxRate: Number(e.target.value) || 1 })}
                                disabled={voucher.currency === 'VND'}
                                className={`w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none font-mono ${voucher.currency === 'VND' ? 'opacity-60' : ''}`}
                            />
                        </div>
                    </div>
                </div>

                {hasBlockingErrors && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs px-4 py-3 rounded-lg flex flex-wrap gap-3 items-center">
                        <span className="font-bold uppercase tracking-widest text-[10px]">Cần bổ sung</span>
                        {headerMissing.docNo && <span>Số chứng từ</span>}
                        {headerMissing.docDate && <span>Ngày chứng từ</span>}
                        {headerMissing.postDate && <span>Ngày hạch toán</span>}
                        {headerMissing.type && <span>Loại chứng từ</span>}
                        {headerMissing.currency && <span>Tiền tệ</span>}
                        {summary.missingDebit > 0 && <span>{summary.missingDebit} dòng thiếu TK Nợ</span>}
                        {summary.missingCredit > 0 && <span>{summary.missingCredit} dòng thiếu TK Có</span>}
                        {summary.missingAmount > 0 && <span>{summary.missingAmount} dòng thiếu số tiền</span>}
                        {summary.missingPartner > 0 && <span>{summary.missingPartner} dòng thiếu đối tượng</span>}
                        {summary.missingProduct > 0 && <span>{summary.missingProduct} dòng thiếu mã hàng</span>}
                        {summary.missingQuantity > 0 && <span>{summary.missingQuantity} dòng thiếu số lượng</span>}
                        {summary.missingDims > 0 && <span>{summary.missingDims} dòng thiếu chiều bắt buộc</span>}
                    </div>
                )}

                {/* Detail Section */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            Chi tiết hạch toán
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (isLockedVoucher) return;
                                    setShowAllocation(true);
                                }}
                                disabled={isLockedVoucher}
                                className={`text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full transition-colors ${isLockedVoucher ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                                Đối trừ công nợ
                            </button>
                            {mandatoryDimTypes.length === 0 && !hasAdvancedData && (
                                <button
                                    onClick={() => setShowAdvanced(prev => !prev)}
                                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">tune</span>
                                    {effectiveShowAdvanced ? 'Ẩn nâng cao' : 'Mở rộng'}
                                </button>
                            )}
                            <button
                                onClick={addLine}
                                className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Thêm dòng
                            </button>
                        </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                        <div className="overflow-x-auto">
                            <table className={`w-full border-collapse ${effectiveShowAdvanced ? 'min-w-[2000px]' : 'min-w-[1200px]'}`}>
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center">#</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Mã hàng</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">DVT</th>
                                        <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">SL</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[220px]">Diễn giải</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32 border-l border-slate-200 dark:border-slate-700 pl-4 bg-purple-50/50 dark:bg-purple-900/10">Nguồn KP</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28 bg-purple-50/50 dark:bg-purple-900/10">Mã Dự Phòng</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">TK Nợ</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">TK Có</th>
                                        <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-36">Số tiền</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Đối tượng</th>
                                        {effectiveShowAdvanced && (
                                            <>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Dự án</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">Hợp đồng</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Khế ước</th>
                                                <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Giá vốn</th>
                                                {visibleDimTypes.map(type => {
                                                    const cfg = dimConfigByType[type];
                                                    const label = cfg?.label || `Chiều ${type}`;
                                                    const mandatory = Number(cfg?.isMandatory) === 1 ? ' *' : '';
                                                    return (
                                                        <th key={`dim-h-${type}`} className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">
                                                            {label}{mandatory}
                                                        </th>
                                                    );
                                                })}
                                            </>
                                        )}
                                        <th className="px-2 py-1.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {voucher.lines.map((line: any, idx: number) => (
                                        <GeneralVoucherDetailRow
                                            key={idx}
                                            line={line}
                                            idx={idx}
                                            onChange={updateLine}
                                            onRemove={removeLine}
                                            products={products}
                                            fundSources={fundSources}
                                            budgetEstimates={budgetEstimates}
                                            accounts={accounts}
                                            partners={partners}
                                            projects={projects}
                                            contracts={contracts}
                                            debtNotes={debtNotes}
                                            dimOptions={dimOptions}
                                            balancesCache={balancesCache}
                                            issue={lineIssues[idx] || {}}
                                            effectiveShowAdvanced={effectiveShowAdvanced}
                                            visibleDimTypes={visibleDimTypes}
                                            isLocked={isLockedVoucher}
                                        />
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                                        <td colSpan={7} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Tổng cộng:</td>
                                        <td className="px-4 py-3 text-right text-[13px] font-mono font-black text-purple-600 dark:text-purple-400">
                                            {formatNumber(totalAmount)}
                                        </td>
                                        <td colSpan={trailingColSpan}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {voucherData && (
                        <button
                            onClick={() => {
                                if (isLockedVoucher) return;
                                setShowReverseAllocation(true);
                            }}
                            disabled={isLockedVoucher}
                            className={`px-6 py-2.5 rounded-lg border border-red-300 dark:border-red-600 font-bold hover:bg-red-100 dark:hover:bg-red-700 transition-all text-sm text-red-600 ${isLockedVoucher ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            Hoàn nhập đối trừ
                        </button>
                    )}
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm">Hủy bỏ</button>
                    <button
                        onClick={handleSave}
                        disabled={isLockedVoucher}
                        className={`px-10 py-2.5 rounded-lg bg-purple-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-all flex items-center gap-2 uppercase tracking-wide text-xs
                            ${isLockedVoucher ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        {voucherData ? "Cập nhật chứng từ" : "Cất & Ghi sổ"}
                    </button>
                </div>
            </div>
            {showAllocation && (
                <ReverseAllocation
                    onClose={() => setShowAllocation(false)}
                    paymentVoucher={{ ...voucher, total_amount: totalAmount }}
                />
            )}
            {showReverseAllocation && (
                <ReverseAllocation
                    onClose={() => setShowReverseAllocation(false)}
                    paymentVoucher={{ ...voucher, total_amount: totalAmount }}
                    isReverse={true}
                />
            )}
        </Modal>
    );
};

const VoucherList = ({ onEdit, onSelectionChange, refreshSignal, lockedUntil, fromDate, toDate, voucherIds }: { onEdit: (v: any) => void, onSelectionChange: (v: any) => void, refreshSignal: number, lockedUntil?: string, fromDate: string, toDate: string, voucherIds?: string[] }) => {
    const [vouchers, setVouchers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchVouchers();
    }, [refreshSignal, fromDate, toDate, voucherIds]);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const res = await voucherService.getAll(undefined, fromDate, toDate);
            let data = res.data || [];
            if (voucherIds && voucherIds.length > 0) {
                data = data.filter((v: any) => voucherIds.includes(v.id));
            }
            setVouchers(data);
        } catch (err) {
            console.error("Error fetching vouchers:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa chứng từ này?")) return;
        try {
            await voucherService.delete(id);
            fetchVouchers();
        } catch (err) {
            console.error("Error deleting voucher:", err);
            alert("Lỗi khi xóa chứng từ.");
        }
    };

    const totalAmount = vouchers.reduce((sum, v) => sum + (v.total_amount || 0), 0);

    const columns: ColumnDef[] = [
        { field: 'doc_date', headerName: 'Ngày CT', width: 'w-32', align: 'center', type: 'date' },
        {
            field: 'type',
            headerName: 'Loại CT',
            width: 'w-28',
            renderCell: (val: string) => (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {val === 'GENERAL' ? 'Phiếu kế toán' : val}
                </span>
            )
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            width: 'w-24',
            align: 'center',
            renderCell: (val: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${val === 'DRAFT' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {val === 'DRAFT' ? 'DRAFT' : 'POSTED'}
                </span>
            )
        },
        { field: 'doc_no', headerName: 'Số CT', width: 'w-32', renderCell: (val: string) => <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{val}</span> },
        { field: 'description', headerName: 'Diễn giải', width: 'flex-1' },
        {
            field: 'total_amount',
            headerName: 'Số tiền',
            width: 'w-40',
            align: 'right',
            renderCell: (val: any) => <span className="font-bold text-purple-600 dark:text-purple-400">{new Intl.NumberFormat('vi-VN').format(val)}</span>
        },
        {
            field: 'actions', headerName: 'Thao tác', width: 'w-24', align: 'center', renderCell: (_, row) => {
                // Allow editing DRAFT even if in locked period so user can fix the date
                const lockDate = row.post_date || row.doc_date;
                const isLocked = !!(lockedUntil && lockDate && normalizeDateValue(lockDate) <= normalizeDateValue(lockedUntil)) && row.status !== 'DRAFT';
                return (
                    <div className="flex justify-center gap-1">
                        <button
                            onClick={() => onEdit(row)}
                            className={`p-1.5 ${isLocked ? 'text-slate-300 cursor-not-allowed grayscale' : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40'} rounded-lg transition-all`}
                            title={isLocked ? "Đã khóa" : "Sửa"}
                            disabled={isLocked}
                        >
                            <span className="material-symbols-outlined text-[20px]">edit_document</span>
                        </button>
                        <button
                            onClick={() => handleDelete(row.id)}
                            className={`p-1.5 ${isLocked ? 'text-slate-300 cursor-not-allowed grayscale' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40'} rounded-lg transition-all`}
                            title={isLocked ? "Đã khóa" : "Xóa"}
                            disabled={isLocked}
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative">
            {/* Total Amount Summary Overlay */}
            <div className="absolute top-2 right-6 z-10 flex items-center gap-2">
                {voucherIds && voucherIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-blue-50/90 dark:bg-blue-900/40 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800 backdrop-blur-sm shadow-sm">
                        <span className="text-[10px] font-bold text-blue-500 uppercase">Chế độ xem xét:</span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Chỉ hiện chứng từ vừa tạo</span>
                    </div>
                )}
                <div className="flex items-center gap-2 bg-purple-50/80 dark:bg-purple-900/20 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800 backdrop-blur-sm shadow-sm pointer-events-none">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Tổng cộng:</span>
                    <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">
                        {new Intl.NumberFormat('vi-VN').format(totalAmount)}
                    </span>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Đang tải bảng kê...</p>
                            </div>
                        </div>
                    ) : (
                        <SmartTable
                            data={vouchers}
                            columns={columns}
                            keyField="id"
                            onSelectionChange={onSelectionChange} // Pass selection up
                            onRowDoubleClick={onEdit}
                            minRows={20}
                            emptyMessage="Không có chứng từ nào trong khoảng thời gian đã chọn"
                            lockedUntil={lockedUntil}
                            dateField="doc_date"
                            contextMenuItems={[
                                {
                                    label: "Tạo bút toán định kỳ (Tháng sau)",
                                    icon: "content_copy",
                                    action: async (row) => {
                                        if (!row) return;
                                        if (confirm(`Bạn có muốn tạo bút toán định kỳ từ chứng từ ${row.doc_no} cho kỳ tiếp theo không?`)) {
                                            try {
                                                setLoading(true);
                                                // @ts-ignore
                                                await voucherService.duplicate(row.id);
                                                fetchVouchers();
                                                alert("Đã tạo bút toán nhé (Draft). Hãy kiểm tra và điều chỉnh ngày!");
                                            } catch (e) {
                                                console.error(e);
                                                alert("Lỗi khi tạo bút toán định kỳ: " + e);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }
                                }
                            ]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const CostItemTable = ({ type, refreshSignal }: { type: 'Chi' | 'Thu' | 'Định mức', refreshSignal?: number }) => {
    const [data, setData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await masterDataService.getAccounts();
                const filtered = res.data.filter((acc: any) => {
                    const code = acc.account_code;
                    if (type === 'Chi') return code.startsWith('6') || code.startsWith('7');
                    if (type === 'Thu') return code.startsWith('5');
                    return true;
                }).map((acc: any) => ({
                    id: acc.account_code,
                    code: acc.account_code,
                    name: acc.account_name,
                    type: acc.category,
                    parent: '',
                    description: acc.category
                }));
                setData(filtered);
            } catch (err) {
                console.error("Failed to fetch cost items:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [type, refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Khoản mục', width: 'w-40' },
        { field: 'name', headerName: 'Tên Khoản mục', width: 'min-w-[250px]' },
        {
            field: 'type', headerName: 'Phân loại', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Chi phí' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{v}</span>
            )
        },
        { field: 'parent', headerName: 'Thuộc nhóm', width: 'w-36' },
        { field: 'description', headerName: 'Diễn giải / Mô tả', width: 'min-w-[300px]' },
    ];

    const handleSaveBudget = async (accCode: string, amount: number, notes: string) => {
        try {
            await budgetService.save({
                account_code: accCode,
                period: toInputMonthValue(), // Month YYYY-MM
                amount,
                notes
            });
            // Refresh data (simplified for now, ideally call fetch)
            alert("Đã lưu ngân sách!");
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu ngân sách");
        }
    };

    if (type === 'Định mức') {
        // Fetch Budgets Logic specific to this view
        const [budgets, setBudgets] = React.useState<any[]>([]);

        React.useEffect(() => {
            const fetchBudgets = async () => {
                const res = await budgetService.getAll(toInputMonthValue());
                setBudgets(res.data);
            };
            fetchBudgets();
        }, []);

        const budgetColumns: ColumnDef[] = [
            { field: 'account_code', headerName: 'Mã Khoản mục', width: 'w-40' },
            {
                field: 'notes', headerName: 'Diễn giải / Mô tả', width: 'min-w-[250px]', renderCell: (val: string, row: any) => (
                    <input
                        defaultValue={val}
                        onBlur={(e) => handleSaveBudget(row.account_code, row.amount, e.target.value)}
                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500"
                        placeholder="Nhập ghi chú..."
                    />
                )
            },
            {
                field: 'amount',
                headerName: 'Ngân sách (VND)',
                width: 'w-48',
                align: 'right',
                renderCell: (val: number, row: any) => (
                    <input
                        type="number"
                        defaultValue={val}
                        onBlur={(e) => handleSaveBudget(row.account_code, Number(e.target.value), row.notes)}
                        className="w-full text-right font-mono font-bold text-purple-600 bg-transparent outline-none border-b border-transparent focus:border-purple-500"
                    />
                )
            },
            { field: 'updated_at', headerName: 'Cập nhật cuối', width: 'w-40', align: 'center', renderCell: () => <span className="text-slate-400 text-xs">Vừa xong</span> }
        ];

        return (
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Thiết lập Ngân sách Chi phí - Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</h3>
                    <button onClick={() => alert("Tính năng thêm mới đang hoàn thiện")} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">add</span> Thêm khoản mục
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <SmartTable
                        data={budgets}
                        columns={budgetColumns}
                        keyField="id"
                        minRows={10}
                        emptyMessage="Chưa có dữ liệu ngân sách"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <SmartTable
                        data={data}
                        columns={columns}
                        keyField="id"
                        minRows={15}
                        emptyMessage="Không có dữ liệu khoản mục"
                    />
                )}
            </div>
        </div>
    );
};

const CostItemFormModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = React.useState({
        code: '',
        name: '',
        type: 'Chi phí',
        parent: '',
        description: ''
    });

    const handleSave = async () => {
        try {
            const newAccount = {
                account_code: formData.code,
                account_name: formData.name,
                category: formData.type,
                description: formData.description,
                parent_account: formData.parent,
                is_active: true
            };
            await masterDataService.saveAccounts([newAccount]);
            alert("Đã lưu khoản mục thành công!");
            onClose();
        } catch (err) {
            console.error("Save failed:", err);
            alert("Lỗi khi lưu dữ liệu.");
        }
    };

    return (
        <Modal title="Thêm Khoản mục Thống kê mới" onClose={onClose}>
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Mã Khoản mục</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="form-input font-bold"
                                placeholder="VD: 6421..."
                            />
                        </div>
                        <div>
                            <label className="form-label">Phân loại</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="form-input"
                            >
                                <option value="Chi">Chi</option>
                                <option value="Thu">Thu</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Tên Khoản mục</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input"
                            placeholder="VD: Chi phí lương nhân viên..."
                        />
                    </div>
                    <div>
                        <label className="form-label">Khoản mục cha (Cấp trên)</label>
                        <select
                            value={formData.parent}
                            onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                            className="form-input"
                        >
                            <option value="">-- Không có --</option>
                            <option value="641">Chi phí bán hàng (641)</option>
                            <option value="642">Chi phí quản lý (642)</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Diễn giải chi tiết</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="form-textarea"
                        />
                    </div>
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                    <button
                        onClick={handleSave}
                        className="form-button-primary bg-rose-600 hover:bg-rose-700 uppercase tracking-wide"
                    >
                        Lưu danh mục
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ImportExcelModal = ({ onClose, onImported }: { onClose: () => void, onImported?: () => void }) => {
    const [status, setStatus] = React.useState<'idle' | 'reading' | 'uploading' | 'done' | 'error'>('idle');
    const [fileName, setFileName] = React.useState('');
    const [file, setFile] = React.useState<File | null>(null);
    const [summary, setSummary] = React.useState({ total: 0, success: 0, failed: 0, errors: [] as string[] });

    const resetSummary = () => setSummary({ total: 0, success: 0, failed: 0, errors: [] });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        setFile(nextFile);
        setFileName(nextFile ? nextFile.name : '');
        setStatus('idle');
        resetSummary();
    };

    const normalizeHeader = (value: string) => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();

    const headerAliases: Record<string, string> = {
        ngayct: 'trx_date',
        ngaychungtu: 'trx_date',
        ngaylap: 'trx_date',
        ngayhachtoan: 'trx_date',
        soct: 'doc_no',
        sochungtu: 'doc_no',
        socuahang: 'doc_no',
        diengiai: 'description',
        noidung: 'description',
        ghichu: 'description',
        tkno: 'debit_acc',
        tkco: 'credit_acc',
        sotien: 'amount',
        amount: 'amount',
        doituong: 'partner_code',
        madoituong: 'partner_code',
        makhachhang: 'partner_code',
        khachhang: 'partner_code',
        manhacungcap: 'partner_code',
        nhacungcap: 'partner_code',
        partner: 'partner_code'
    };

    const columnLabels: Record<string, string> = {
        trx_date: 'Ngày CT',
        doc_no: 'Số CT',
        debit_acc: 'TK Nợ',
        credit_acc: 'TK Có',
        amount: 'Số tiền'
    };

    const buildColumnMap = (headers: any[]) => {
        const map: Record<string, number> = {};
        headers.forEach((header, idx) => {
            const normalized = normalizeHeader(String(header || ''));
            const field = headerAliases[normalized];
            if (field && map[field] === undefined) {
                map[field] = idx;
            }
        });
        return { map, hasHeader: Object.keys(map).length >= 2 };
    };

    const pad2 = (value: number) => String(value).padStart(2, '0');

    const parseDateCell = (value: any) => {
        if (!value) return '';
        if (value instanceof Date && !isNaN(value.getTime())) {
            return toInputDateValue(value);
        }
        if (typeof value === 'number') {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (parsed?.y && parsed?.m && parsed?.d) {
                return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
            }
        }
        const textValue = String(value).trim();
        if (!textValue) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) return textValue;
        const dashMatch = textValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dashMatch) {
            return `${dashMatch[3]}-${pad2(Number(dashMatch[2]))}-${pad2(Number(dashMatch[1]))}`;
        }
        const normalized = normalizeDateValue(textValue);
        if (normalized !== textValue) return normalized;
        const parsedDate = new Date(textValue);
        if (!isNaN(parsedDate.getTime())) return toInputDateValue(parsedDate);
        return '';
    };

    const parseAmount = (value: any) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;
        let textValue = String(value).trim();
        if (!textValue) return 0;
        textValue = textValue.replace(/\s/g, '');

        const hasComma = textValue.includes(',');
        const hasDot = textValue.includes('.');
        if (hasComma && hasDot) {
            if (textValue.lastIndexOf(',') > textValue.lastIndexOf('.')) {
                textValue = textValue.replace(/\./g, '').replace(',', '.');
            } else {
                textValue = textValue.replace(/,/g, '');
            }
        } else if (hasComma) {
            const parts = textValue.split(',');
            textValue = parts.length === 2 && parts[1].length === 3 ? parts.join('') : `${parts[0]}.${parts[1] || ''}`;
        } else if (hasDot) {
            const parts = textValue.split('.');
            if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
                textValue = parts.join('');
            }
        }

        textValue = textValue.replace(/[^0-9.-]/g, '');
        return Number(textValue) || 0;
    };

    const rowHasData = (row: any[]) => row.some(cell => String(cell ?? '').trim() !== '');

    const handleUpload = async () => {
        if (!file) return;
        setStatus('reading');
        resetSummary();

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                setStatus('error');
                setSummary({ total: 0, success: 0, failed: 0, errors: ['Không tìm thấy sheet dữ liệu trong file.'] });
                return;
            }

            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true }) || [];
            if (rows.length === 0) {
                setStatus('error');
                setSummary({ total: 0, success: 0, failed: 0, errors: ['File không có dữ liệu.'] });
                return;
            }

            const { map, hasHeader } = buildColumnMap(rows[0] || []);
            const defaultMap: Record<string, number> = {
                trx_date: 0,
                doc_no: 1,
                description: 2,
                debit_acc: 3,
                credit_acc: 4,
                amount: 5,
                partner_code: 6
            };
            const columnMap = hasHeader ? map : defaultMap;
            if (hasHeader) {
                const required = ['trx_date', 'doc_no', 'debit_acc', 'credit_acc', 'amount'];
                const missingCols = required.filter(key => (columnMap as any)[key] === undefined);
                if (missingCols.length > 0) {
                    setStatus('error');
                    setSummary({
                        total: 0,
                        success: 0,
                        failed: 0,
                        errors: [`Thiếu cột bắt buộc: ${missingCols.map(col => columnLabels[col] || col).join(', ')}.`]
                    });
                    return;
                }
            }

            const startIndex = hasHeader ? 1 : 0;
            const rawRows = rows.slice(startIndex).map((row, idx) => ({
                row,
                rowNumber: idx + startIndex + 1
            }));
            const dataRows = rawRows.filter(entry => rowHasData(entry.row));
            if (dataRows.length === 0) {
                setStatus('error');
                setSummary({ total: 0, success: 0, failed: 0, errors: ['Không tìm thấy dòng dữ liệu hợp lệ.'] });
                return;
            }

            setStatus('uploading');
            const batchId = `excel-${Date.now()}`;
            const baseIndex = Date.now();
            let success = 0;
            let failed = 0;
            const errors: string[] = [];

            for (let i = 0; i < dataRows.length; i++) {
                const { row, rowNumber } = dataRows[i];
                const getCell = (key: string) => {
                    const idx = (columnMap as any)[key];
                    if (idx === undefined) return '';
                    return row[idx];
                };

                const record = {
                    batch_id: batchId,
                    row_index: baseIndex + i,
                    trx_date: parseDateCell(getCell('trx_date')),
                    doc_no: String(getCell('doc_no') ?? '').trim(),
                    description: String(getCell('description') ?? '').trim(),
                    debit_acc: String(getCell('debit_acc') ?? '').trim(),
                    credit_acc: String(getCell('credit_acc') ?? '').trim(),
                    amount: parseAmount(getCell('amount')),
                    partner_code: String(getCell('partner_code') ?? '').trim()
                };

                const missing: string[] = [];
                if (!record.trx_date) missing.push('Ngày CT');
                if (!record.doc_no) missing.push('Số CT');
                if (!record.debit_acc) missing.push('TK Nợ');
                if (!record.credit_acc) missing.push('TK Có');
                if (!(record.amount > 0)) missing.push('Số tiền');

                if (missing.length > 0) {
                    failed += 1;
                    errors.push(`Dòng ${rowNumber}: thiếu ${missing.join(', ')}`);
                    continue;
                }

                try {
                    await api.post('/staging', record);
                    success += 1;
                } catch (err) {
                    failed += 1;
                    errors.push(`Dòng ${rowNumber}: lỗi ghi dữ liệu.`);
                }
            }

            setSummary({ total: dataRows.length, success, failed, errors });
            setStatus('done');
            if (success > 0 && onImported) onImported();
        } catch (err) {
            setStatus('error');
            setSummary({ total: 0, success: 0, failed: 0, errors: ['Không thể đọc file. Vui lòng kiểm tra định dạng.'] });
        }
    };

    return (
        <Modal title="Nhập dữ liệu từ Excel" onClose={onClose}>
            <div className="p-8 max-w-lg mx-auto">
                {status === 'idle' && (
                    <div className="space-y-6">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                            <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls, .csv" />
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">upload_file</span>
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">Kéo thả file hoặc click để chọn</h3>
                            <p className="text-sm text-slate-500 mt-2">Hỗ trợ định dạng .xlsx, .xls, .csv (Tối đa 10MB)</p>
                            <p className="text-xs text-slate-500 mt-2">Cột bắt buộc: Ngày CT, Số CT, TK Nợ, TK Có, Số tiền.</p>
                            <p className="text-xs text-slate-500">Không có tiêu đề: hệ thống đọc theo thứ tự Ngày CT | Số CT | Diễn giải | TK Nợ | TK Có | Số tiền | Đối tượng.</p>
                            {fileName && (
                                <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-bold text-sm">
                                    {fileName}
                                </div>
                            )}
                        </div>
                        <div className="form-actions border-0 pt-0">
                            <button onClick={onClose} className="form-button-secondary">Hủy</button>
                            <button
                                onClick={handleUpload}
                                disabled={!fileName}
                                className="form-button-primary disabled:bg-slate-300 hover:bg-blue-700"
                            >
                                Thực hiện Import
                            </button>
                        </div>
                    </div>
                )}
                {status === 'reading' && (
                    <div className="flex flex-col items-center space-y-4 py-10">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="font-bold text-slate-600 dark:text-slate-300">Đang đọc file...</p>
                    </div>
                )}
                {status === 'uploading' && (
                    <div className="flex flex-col items-center space-y-4 py-10">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                        <p className="font-bold text-slate-600 dark:text-slate-300">Đang ghi dữ liệu...</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="space-y-6 py-4 text-center">
                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-3xl">error</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nhập dữ liệu thất bại</h3>
                            <div className="text-xs text-rose-600 mt-3 space-y-1">
                                {summary.errors.map((err, idx) => (
                                    <div key={idx}>{err}</div>
                                ))}
                            </div>
                        </div>
                        <div className="form-actions border-0 pt-0 justify-center">
                            <button onClick={() => setStatus('idle')} className="form-button-secondary">Thử lại</button>
                            <button onClick={onClose} className="form-button-primary">Đóng</button>
                        </div>
                    </div>
                )}
                {status === 'done' && (
                    <div className="flex flex-col items-center space-y-6 py-4">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center animate-bounce">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nhập dữ liệu hoàn tất</h3>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Tổng: <span className="font-bold text-slate-800 dark:text-slate-200">{summary.total}</span> ·
                                Thành công: <span className="font-bold text-emerald-600">{summary.success}</span> ·
                                Lỗi: <span className="font-bold text-rose-600">{summary.failed}</span>
                            </div>
                        </div>
                        {summary.failed > 0 && (
                            <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-xs text-amber-700 dark:text-amber-300 max-h-32 overflow-y-auto">
                                {summary.errors.slice(0, 10).map((err, idx) => (
                                    <div key={idx}>{err}</div>
                                ))}
                                {summary.errors.length > 10 && (
                                    <div className="mt-2 text-slate-500">+{summary.errors.length - 10} dòng lỗi khác</div>
                                )}
                            </div>
                        )}
                        <div className="form-actions border-0 pt-0">
                            <button onClick={() => { setStatus('idle'); resetSummary(); setFile(null); setFileName(''); }} className="form-button-secondary">Nhập tiếp</button>
                            <button onClick={onClose} className="form-button-primary">Hoàn tất</button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const ChartOfAccounts = ({ onSelectionChange, refreshSignal }: { onSelectionChange: (v: any) => void, refreshSignal?: number }) => {
    const [data, setData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await masterDataService.getAccounts();
                setData(res.data.map((acc: any) => ({
                    id: acc.account_code,
                    code: acc.account_code,
                    name: acc.account_name,
                    category: acc.category,
                    balance: acc.net_balance,
                    description: acc.description
                })));
            } catch (err) {
                console.error("Failed to fetch accounts:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refreshSignal]);

    const columns: ColumnDef[] = [
        { field: 'code', headerName: 'Số hiệu TK', width: 'w-32', renderCell: (v: string) => <span className="font-bold text-blue-600">{v}</span> },
        { field: 'name', headerName: 'Tên Tài khoản', width: 'min-w-[300px]' },
        { field: 'category', headerName: 'Tính chất', width: 'w-40' },
        { field: 'description', headerName: 'Diễn giải', width: 'flex-1' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <SmartTable
                        data={data}
                        columns={columns}
                        keyField="id"
                        onSelectionChange={onSelectionChange}
                        minRows={20}
                        emptyMessage="Chưa có dữ liệu tài khoản"
                    />
                )}
            </div>
        </div>
    );
};

interface GeneralModuleProps {
    subView: string;
    onCloseModal: () => void;
    printSignal: number;
    onSetHeader: (header: any) => void;
    navigationData?: any;
    onClearNavigation?: () => void;
}

export const GeneralModule: React.FC<GeneralModuleProps> = ({ subView, onCloseModal, printSignal, onSetHeader, navigationData, onClearNavigation }) => {
    const [showCostModal, setShowCostModal] = React.useState(false);
    const [showVoucherModal, setShowVoucherModal] = React.useState(false);
    const [showImportModal, setShowImportModal] = React.useState(false);
    const [activeVoucher, setActiveVoucher] = React.useState<any>(null);
    const [selectedRow, setSelectedRow] = React.useState<any>(null);
    const [refreshSignal, setRefreshSignal] = React.useState(0);
    const [lockedUntil, setLockedUntil] = React.useState<string | undefined>(undefined);

    // Filter states moved up for better integration
    const now = new Date();
    // Default show from start of LAST year to capture sample data (2024)
    const firstDay = toInputDateValue(new Date(now.getFullYear() - 1, 0, 1));
    const today = toInputDateValue(now);
    const [fromDate, setFromDate] = React.useState(firstDay);
    const [toDate, setToDate] = React.useState(today);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await settingsService.getSettings();
                if (res.data.locked_until_date) {
                    setLockedUntil(res.data.locked_until_date);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            }
        };
        fetchSettings();
    }, [refreshSignal]);

    const handleOpenVoucherModal = async (v?: any) => {
        if (v) {
            try {
                // Fetch full details if needed, or use row data
                const res = await voucherService.getById(v.id);
                // Map DB fields to form fields
                const fullVoucher = res.data;
                setActiveVoucher({
                    id: fullVoucher.id,
                    docNo: fullVoucher.doc_no,
                    docDate: fullVoucher.doc_date,
                    postDate: fullVoucher.post_date,
                    description: fullVoucher.description,
                    type: fullVoucher.type || 'GENERAL',
                    refNo: fullVoucher.ref_no || '',
                    attachments: Number(fullVoucher.attachments) || 0,
                    currency: fullVoucher.currency || 'VND',
                    fxRate: Number(fullVoucher.fx_rate) || 1,
                    status: fullVoucher.status || 'POSTED',
                    lines: (fullVoucher.items || []).map((item: any) => ({
                        description: item.description,
                        debitAcc: item.debit_acc,
                        creditAcc: item.credit_acc,
                        amount: item.amount,
                        partnerCode: item.partner_code || '',
                        dim1: item.dim1 || '',
                        dim2: item.dim2 || '',
                        dim3: item.dim3 || '',
                        dim4: item.dim4 || '',
                        dim5: item.dim5 || '',
                        projectCode: item.project_code || '',
                        contractCode: item.contract_code || '',
                        debtNote: item.debt_note || '',
                        input_unit: item.input_unit || '',
                        input_quantity: Number(item.input_quantity) || 0,
                        quantity: Number(item.quantity) || 0,
                        cost_price: Number(item.cost_price) || 0
                    }))
                });
            } catch (err) {
                console.error("Error loading voucher details:", err);
            }
        } else {
            setActiveVoucher(null);
        }
        setShowVoucherModal(true);
    };

    const handleCloseModal = () => {
        setShowVoucherModal(false);
        setRefreshSignal(s => s + 1);
    };

    React.useEffect(() => {
        if (printSignal > 0) {
            window.print();
        }
    }, [printSignal]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        const lockDate = selectedRow.post_date || selectedRow.doc_date;
        const isLocked = !!(lockedUntil && lockDate && normalizeDateValue(lockDate) <= normalizeDateValue(lockedUntil));
        if (isLocked) {
            alert("Chứng từ này đã nằm trong kỳ khóa sổ, không thể xóa.");
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedRow.doc_no || selectedRow.code || 'mục đã chọn'}?`)) return;

        try {
            if (subView === 'voucher_list') {
                await voucherService.delete(selectedRow.id);
            } else if (subView === 'account_list') {
                await masterDataService.deleteAccount(selectedRow.id);
            }
            alert("Đã xóa thành công.");
            setRefreshSignal(s => s + 1);
            setSelectedRow(null);
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    React.useEffect(() => {
        if (onSetHeader) {
            const modInfo = getModuleInfo();
            const actions: RibbonAction[] = [];

            if (subView === 'account_list') {
                actions.push({
                    label: 'Thêm tài khoản',
                    icon: 'add',
                    onClick: () => setShowCostModal(true), // Reusing CostModal for Account creation as they share structure
                    primary: true
                });
            } else if (subView.startsWith('cost_')) {
                actions.push({
                    label: 'Thêm khoản mục mới',
                    icon: 'add_circle',
                    onClick: () => setShowCostModal(true),
                    primary: true
                });
            } else {
                actions.push({
                    label: 'Thêm chứng từ mới',
                    icon: 'add_circle',
                    onClick: () => {
                        setActiveVoucher(null);
                        setShowVoucherModal(true);
                    },
                    primary: true
                });
            }

            actions.push({
                label: (subView.startsWith('cost_') || subView === 'account_list') ? 'Nhập từ Excel' : 'In danh sách',
                icon: (subView.startsWith('cost_') || subView === 'account_list') ? 'upload' : 'print',
                onClick: () => {
                    if (subView.startsWith('cost_') || subView === 'account_list') {
                        setShowImportModal(true);
                    } else {
                        window.print();
                    }
                }
            });

            if (selectedRow && (subView === 'voucher_list' || subView === 'voucher')) {
                actions.push({
                    label: 'Sửa chứng từ',
                    icon: 'edit',
                    onClick: () => handleOpenVoucherModal(selectedRow)
                });
            }

            onSetHeader({
                title: modInfo.title,
                icon: modInfo.icon,
                actions,
                onDelete: (subView === 'voucher_list' || subView === 'account_list') ? handleDeleteSelected : undefined
            });
        }
    }, [subView, onSetHeader, selectedRow]); // Added selectedRow to deps to update Ribbon button state if needed

    const getModuleInfo = () => {
        switch (subView) {
            case 'voucher': return { title: 'Nhập liệu chứng từ', icon: 'edit_square' };
            case 'voucher_list': return { title: 'Sổ nhật ký chung', icon: 'menu_book' };
            case 'account_list': return { title: 'Hệ thống Tài khoản', icon: 'account_tree' };
            case 'closing': return { title: 'Kết chuyển cuối kỳ', icon: 'account_balance' };
            case 'allocation': return { title: 'Phân bổ chi trả trước', icon: 'rebase_edit' };
            case 'revaluation': return { title: 'Đánh giá ngoại tệ', icon: 'currency_exchange' };
            case 'locking': return { title: 'Khóa sổ kỳ kế toán', icon: 'lock' };
            case 'check': return { title: 'Đối chiếu số liệu', icon: 'fact_check' };
            case 'audit': return { title: 'Trợ lý Kiểm toán ảo', icon: 'health_and_safety' };
            case 'cost_item': return { title: 'Khoản mục Chi', icon: 'category', color: 'rose-600' };
            case 'cost_revenue': return { title: 'Khoản mục Thu', icon: 'trending_up', color: 'rose-600' };
            case 'cost_settings': return { title: 'Thiết lập định mức', icon: 'settings', color: 'rose-600' };
            case 'cost_settings': return { title: 'Thiết lập định mức', icon: 'settings', color: 'rose-600' };
            case 'opening_balance': return { title: 'Số dư đầu kỳ', icon: 'account_balance_wallet', color: 'blue-600' };
            default: return { title: 'Tổng hợp', icon: 'folder_open' };
        }
    };

    return (
        <div className="relative h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">

            {/* Action Bar */}
            <div className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
                        <div className="px-4 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 shadow-sm text-blue-600 rounded-md">
                            {subView === 'voucher' ? 'Bảng tính hạch toán' : subView === 'account_list' ? 'Danh sách tài khoản' : 'Tất cả chứng từ'}
                        </div>
                    </div>

                    {/* Consolidated Date Filter */}
                    {subView === 'voucher_list' && (
                        <div className="flex items-center gap-3 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Từ</label>
                                <DateInput
                                    value={fromDate}
                                    onChange={(val) => setFromDate(val)}
                                    className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none p-0 focus:ring-0 w-32"
                                />
                            </div>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Đến</label>
                                <DateInput
                                    value={toDate}
                                    onChange={(val) => setToDate(val)}
                                    className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none p-0 focus:ring-0 w-32"
                                />
                            </div>
                            <button
                                onClick={() => setRefreshSignal(s => s + 1)}
                                className="ml-2 text-slate-400 hover:text-purple-600 transition-colors"
                                title="Tải lại dữ liệu"
                            >
                                <span className="material-symbols-outlined text-[20px]">refresh</span>
                            </button>
                            {navigationData?.voucherIds && (
                                <button
                                    onClick={onClearNavigation}
                                    className="ml-4 px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-lg transition-all border border-blue-200 dark:border-blue-700 flex items-center gap-1 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[14px]">filter_list_off</span>
                                    HIỆN TẤT CẢ CHỨNG TỪ
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-white dark:bg-slate-900">
                {subView === 'voucher' && <Spreadsheet refreshSignal={refreshSignal} />}
                {subView === 'voucher_list' && (
                    <VoucherList
                        onEdit={handleOpenVoucherModal}
                        onSelectionChange={setSelectedRow}
                        refreshSignal={refreshSignal}
                        lockedUntil={lockedUntil}
                        fromDate={fromDate}
                        toDate={toDate}
                        voucherIds={navigationData?.voucherIds}
                    />
                )}
                {subView === 'account_list' && <ChartOfAccounts onSelectionChange={setSelectedRow} refreshSignal={refreshSignal} />}
                {subView === 'cost_item' && <CostItemTable type="Chi" refreshSignal={refreshSignal} />}
                {subView === 'cost_revenue' && <CostItemTable type="Thu" refreshSignal={refreshSignal} />}
                {subView === 'cost_settings' && <CostItemTable type="Định mức" refreshSignal={refreshSignal} />}
                {subView === 'opening_balance' && <OpeningBalance />}
                {subView !== 'voucher' && subView !== 'voucher_list' && subView !== 'account_list' && !subView.startsWith('cost_') && subView !== 'opening_balance' && <Spreadsheet refreshSignal={refreshSignal} />}
            </div>

            {/* Modals for Action Forms */}
            {subView === 'closing' && <ClosingEntries onClose={onCloseModal} lockedUntil={lockedUntil} />}
            {subView === 'allocation' && <Allocation onClose={onCloseModal} lockedUntil={lockedUntil} />}
            {subView === 'revaluation' && <Revaluation onClose={onCloseModal} lockedUntil={lockedUntil} />}
            {subView === 'locking' && <PeriodLock onClose={onCloseModal} onRefresh={() => setRefreshSignal(s => s + 1)} />}
            {subView === 'check' && <Reconciliation onClose={onCloseModal} />}

            {showCostModal && <CostItemFormModal onClose={() => setShowCostModal(false)} />}
            {showImportModal && (
                <ImportExcelModal
                    onClose={() => setShowImportModal(false)}
                    onImported={() => setRefreshSignal(s => s + 1)}
                />
            )}
            {showVoucherModal && (
                <GeneralVoucherFormModal
                    onClose={handleCloseModal}
                    voucherData={activeVoucher}
                    lockedUntil={lockedUntil}
                />
            )}
        </div>
    );
};


