/**
 * Reconciliation Component
 * SyntexHCSN - Đối chiếu số liệu
 *
 * Updated: Production-ready - No mock data, real API integration
 */

import React from 'react';
import { masterDataService, reportService, auditService, taxService } from '../../api';
import { FormModal } from '../FormModal';

interface ReconciliationProps {
    onClose: () => void;
}

interface ReconciliationResult {
    item: string;
    ledger: number;
    detail: number;
    diff: number;
    note: string;
}

export const Reconciliation: React.FC<ReconciliationProps> = ({ onClose }) => {
    const [status, setStatus] = React.useState<'idle' | 'running' | 'done'>('idle');
    const [activeCheck, setActiveCheck] = React.useState<string | null>(null);

    const [progress, setProgress] = React.useState(0);
    const [logs, setLogs] = React.useState<string[]>([]);
    const [results, setResults] = React.useState<ReconciliationResult[]>([]);
    const [error, setError] = React.useState<string | null>(null);

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

    const addLog = (message: string) => {
        setLogs(prev => [...prev, message]);
    };

    const runCheck = async (id: string, title: string) => {
        setStatus('running');
        setActiveCheck(title);

        setProgress(0);
        setLogs([`Bắt đầu tiến trình: ${title}...`]);
        setResults([]);
        setError(null);

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const fromDate = `${currentYear}-01-01`;
        const toDate = new Date().toISOString().split('T')[0];

        try {
            // Step 1: Get account balances from General Ledger
            addLog("Đang truy vấn số dư sổ cái...");
            setProgress(20);
            const balanceRes = await masterDataService.getAccountBalances();
            const balances = balanceRes.data;

            let checkResults: ReconciliationResult[] = [];
            let bookBalance = 0;
            let externalBalance = 0;

            if (id === 'inventory') {
                // INVENTORY RECONCILIATION: Compare GL with Inventory Report
                addLog("Đang lấy dữ liệu báo cáo tồn kho...");
                setProgress(40);

                const inventoryRes = await reportService.getInventorySummary({ fromDate, toDate });
                const inventoryData = inventoryRes.data || [];

                addLog("Đang đối chiếu số liệu kho - sổ cái...");
                setProgress(60);

                // Get ledger totals for inventory accounts (15x)
                const stockAccs = balances.filter((acc: any) => acc.account_code.startsWith('15'));
                const ledgerTotal = stockAccs.reduce((sum: number, acc: any) => sum + (acc.net_balance || 0), 0);

                // Get inventory detail totals
                const detailTotal = inventoryData.reduce((sum: number, item: any) => sum + (item.closing_value || 0), 0);

                const diff = ledgerTotal - detailTotal;
                bookBalance = ledgerTotal;
                externalBalance = detailTotal;

                checkResults = [{
                    item: 'Tổng giá trị Hàng tồn kho',
                    ledger: ledgerTotal,
                    detail: detailTotal,
                    diff: diff,
                    note: diff === 0 ? '✅ Khớp' : `⚠️ Chênh lệch ${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} VND`
                }];

                // Add detail by account if there are differences
                if (diff !== 0) {
                    stockAccs.forEach((acc: any) => {
                        const matchingItems = inventoryData.filter((i: any) => i.item_code === acc.account_code);
                        const detailValue = matchingItems.reduce((s: number, i: any) => s + (i.closing_value || 0), 0);
                        const accDiff = (acc.net_balance || 0) - detailValue;
                        if (accDiff !== 0) {
                            checkResults.push({
                                item: `${acc.account_code} - ${acc.account_name || 'Hàng tồn kho'}`,
                                ledger: acc.net_balance || 0,
                                detail: detailValue,
                                diff: accDiff,
                                note: accDiff !== 0 ? '⚠️ Kiểm tra' : '✅ OK'
                            });
                        }
                    });
                }

            } else if (id === 'debt') {
                // DEBT RECONCILIATION: Compare GL with Transaction Details
                addLog("Đang lấy sổ chi tiết công nợ phải thu (131)...");
                setProgress(30);

                const receivableDetails = await reportService.getTransactionDetails({
                    from: fromDate,
                    to: toDate,
                    account_code: '131'
                });

                addLog("Đang lấy sổ chi tiết công nợ phải trả (331)...");
                setProgress(50);

                const payableDetails = await reportService.getTransactionDetails({
                    from: fromDate,
                    to: toDate,
                    account_code: '331'
                });

                addLog("Đang đối chiếu số liệu công nợ...");
                setProgress(70);

                // Calculate receivables
                const receivableLedger = balances
                    .filter((acc: any) => acc.account_code.startsWith('131'))
                    .reduce((s: number, a: any) => s + (a.net_balance || 0), 0);

                const receivableDetailArr = receivableDetails.data || [];
                const receivableDetailTotal = receivableDetailArr.reduce((s: number, d: any) => {
                    if (d.debit_acc === '131') return s + (d.amount || 0);
                    if (d.credit_acc === '131') return s - (d.amount || 0);
                    return s;
                }, 0);

                const receivableDiff = receivableLedger - receivableDetailTotal;

                // Calculate payables
                const payableLedger = balances
                    .filter((acc: any) => acc.account_code.startsWith('331'))
                    .reduce((s: number, a: any) => s + (a.net_balance || 0), 0);

                const payableDetailArr = payableDetails.data || [];
                const payableDetailTotal = payableDetailArr.reduce((s: number, d: any) => {
                    if (d.credit_acc === '331') return s + (d.amount || 0);
                    if (d.debit_acc === '331') return s - (d.amount || 0);
                    return s;
                }, 0);

                const payableDiff = payableLedger - payableDetailTotal;

                bookBalance = receivableLedger + Math.abs(payableLedger);
                externalBalance = receivableDetailTotal + Math.abs(payableDetailTotal);

                checkResults = [
                    {
                        item: 'Phải thu khách hàng (131)',
                        ledger: receivableLedger,
                        detail: receivableDetailTotal,
                        diff: receivableDiff,
                        note: receivableDiff === 0 ? '✅ Khớp' : '⚠️ Chênh lệch'
                    },
                    {
                        item: 'Phải trả nhà cung cấp (331)',
                        ledger: payableLedger,
                        detail: payableDetailTotal,
                        diff: payableDiff,
                        note: payableDiff === 0 ? '✅ Khớp' : '⚠️ Chênh lệch'
                    }
                ];

            } else if (id === 'cash') {
                // CASH NEGATIVE BALANCE CHECK
                addLog("Đang kiểm tra số dư tiền mặt và tiền gửi...");
                setProgress(50);

                const cashAccs = balances.filter((acc: any) =>
                    acc.account_code.startsWith('111') || acc.account_code.startsWith('112')
                );

                addLog("Đang phân tích số dư âm...");
                setProgress(80);

                const negativeBalances = cashAccs.filter((acc: any) => (acc.net_balance || 0) < 0);

                if (negativeBalances.length > 0) {
                    checkResults = negativeBalances.map((acc: any) => ({
                        item: `${acc.account_code} - ${acc.account_name || 'Tiền'}`,
                        ledger: acc.net_balance || 0,
                        detail: 0,
                        diff: acc.net_balance || 0,
                        note: '⚠️ Số dư âm - Cần kiểm tra!'
                    }));
                    bookBalance = negativeBalances.reduce((s: number, a: any) => s + (a.net_balance || 0), 0);
                } else {
                    checkResults = [{
                        item: 'Tất cả tài khoản tiền',
                        ledger: cashAccs.reduce((s: number, a: any) => s + (a.net_balance || 0), 0),
                        detail: 0,
                        diff: 0,
                        note: '✅ Không có số dư âm'
                    }];
                }

            } else if (id === 'tax') {
                // TAX RECONCILIATION: Compare GL with VAT Reports
                addLog("Đang lấy bảng kê thuế GTGT đầu vào...");
                setProgress(30);

                const vatInputRes = await taxService.getVatReport({ type: 'input', from: fromDate, to: toDate });
                const vatInputData = vatInputRes.data || [];

                addLog("Đang lấy bảng kê thuế GTGT đầu ra...");
                setProgress(50);

                const vatOutputRes = await taxService.getVatReport({ type: 'output', from: fromDate, to: toDate });
                const vatOutputData = vatOutputRes.data || [];

                addLog("Đang đối chiếu với sổ cái thuế...");
                setProgress(70);

                // VAT Input (133)
                const vat133Ledger = balances
                    .filter((acc: any) => acc.account_code.startsWith('133'))
                    .reduce((s: number, a: any) => s + (a.net_balance || 0), 0);
                const vat133Detail = vatInputData.reduce((s: number, d: any) => s + (d.tax || 0), 0);
                const vat133Diff = vat133Ledger - vat133Detail;

                // VAT Output (3331)
                const vat3331Ledger = balances
                    .filter((acc: any) => acc.account_code.startsWith('3331'))
                    .reduce((s: number, a: any) => s + (a.net_balance || 0), 0);
                const vat3331Detail = vatOutputData.reduce((s: number, d: any) => s + (d.tax || 0), 0);
                const vat3331Diff = vat3331Ledger - vat3331Detail;

                bookBalance = vat133Ledger + Math.abs(vat3331Ledger);
                externalBalance = vat133Detail + Math.abs(vat3331Detail);

                checkResults = [
                    {
                        item: 'Thuế GTGT được khấu trừ (133)',
                        ledger: vat133Ledger,
                        detail: vat133Detail,
                        diff: vat133Diff,
                        note: vat133Diff === 0 ? '✅ Khớp' : '⚠️ Chênh lệch'
                    },
                    {
                        item: 'Thuế GTGT phải nộp (3331)',
                        ledger: vat3331Ledger,
                        detail: vat3331Detail,
                        diff: vat3331Diff,
                        note: vat3331Diff === 0 ? '✅ Khớp' : '⚠️ Chênh lệch'
                    }
                ];
            }

            setProgress(90);
            addLog("Đang lưu kết quả đối chiếu...");

            // Save reconciliation record to backend

            const hasDiscrepancy = checkResults.some(r => r.diff !== 0);

            try {
                await auditService.createReconciliation({
                    recon_type: id.toUpperCase(),
                    fiscal_year: currentYear,
                    fiscal_period: currentMonth,
                    period_start: fromDate,
                    period_end: toDate,
                    book_balance: bookBalance,
                    external_balance: externalBalance,
                    outstanding_items: hasDiscrepancy ? checkResults.filter(r => r.diff !== 0) : [],
                    notes: `Đối chiếu ${title} - ${hasDiscrepancy ? 'Có chênh lệch' : 'Khớp hoàn toàn'}`,
                    status: 'COMPLETED'
                });
                addLog("✅ Đã lưu kết quả đối chiếu vào hệ thống.");
            } catch (saveErr) {
                console.warn("Could not save reconciliation record:", saveErr);
                addLog("⚠️ Không thể lưu kết quả (có thể do quyền truy cập).");
            }

            setProgress(100);
            setResults(checkResults);
            addLog(`Hoàn tất kiểm tra. ${hasDiscrepancy ? 'Phát hiện chênh lệch!' : 'Số liệu khớp.'}`);

        } catch (err: any) {
            console.error("Reconciliation check failed:", err);
            setError(err.message || 'Lỗi khi thực hiện đối chiếu');
            setResults([{
                item: 'Lỗi hệ thống',
                ledger: 0,
                detail: 0,
                diff: 0,
                note: `❌ ${err.message || 'Không thể kết nối API'}`
            }]);
        }

        setStatus('done');
    };

    const formatNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

    return (
        <FormModal title="Đối chiếu Số liệu Kế toán" onClose={onClose} panelClass="max-w-4xl">
            {status === 'idle' && (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Chọn loại đối chiếu để hệ thống tự động kiểm tra và phát hiện các chênh lệch số liệu.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {checkTypes.map(ct => (
                            <button
                                key={ct.id}
                                onClick={() => runCheck(ct.id, ct.title)}
                                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${checkTypeStyles[ct.tone]}`}>
                                        <span className="material-symbols-outlined">{ct.icon}</span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">{ct.title}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{ct.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {status === 'running' && (
                <div className="space-y-4 py-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{activeCheck}</h3>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-40 overflow-y-auto">
                        {logs.map((log, i) => <div key={i}>&gt; {log}</div>)}
                    </div>
                </div>
            )}

            {status === 'done' && (
                <div className="space-y-4">
                    {error ? (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                            <span className="material-symbols-outlined">error</span>
                            Lỗi: {activeCheck}
                        </div>
                    ) : results.some(r => r.diff !== 0) ? (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                            <span className="material-symbols-outlined">warning</span>
                            Phát hiện chênh lệch: {activeCheck}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                            <span className="material-symbols-outlined">check_circle</span>
                            Hoàn tất: {activeCheck} - Số liệu khớp
                        </div>
                    )}
                    <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr className="text-left">
                                <th className="p-3">Hạng mục</th>
                                <th className="p-3 text-right">Sổ cái</th>
                                <th className="p-3 text-right">Chi tiết</th>
                                <th className="p-3 text-right">Chênh lệch</th>
                                <th className="p-3">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                                    <td className="p-3 font-medium">{r.item}</td>
                                    <td className="p-3 text-right font-mono">{formatNum(r.ledger)}</td>
                                    <td className="p-3 text-right font-mono">{formatNum(r.detail)}</td>
                                    <td className={`p-3 text-right font-mono font-bold ${r.diff !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatNum(r.diff)}
                                    </td>
                                    <td className="p-3 text-slate-500">{r.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setStatus('idle')} className="form-button-secondary">Kiểm tra khác</button>
                        <button onClick={onClose} className="form-button-primary">Đóng</button>
                    </div>
                </div>
            )}
        </FormModal>
    );
};

export default Reconciliation;
