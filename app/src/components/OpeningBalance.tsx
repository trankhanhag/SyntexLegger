import React, { useState, useEffect } from 'react';
import { masterDataService, openingBalanceService, hrService, bankService } from '../api';
import { SmartTable, type ColumnDef } from './SmartTable';
import { FormModal } from './FormModal';
import logger from '../utils/logger';

// Standard Modal Component (Matching GeneralModule style)
const Modal = ({ title, onClose, children, footer }: { title: string, onClose: () => void, children: React.ReactNode, footer?: React.ReactNode }) => (
    <FormModal
        title={title}
        onClose={onClose}
        icon="account_balance_wallet"
        sizeClass="max-w-4xl"
        bodyClass="p-0 overflow-hidden"
    >
        <div className="flex max-h-[80vh] flex-col">
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
            {footer && (
                <div className="form-actions px-4 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                    {footer}
                </div>
            )}
        </div>
    </FormModal>
);

const DetailedBalanceModal = ({ account, onClose, onSave }: { account: any, onClose: () => void, onSave: (details: any[]) => void }) => {
    const [details, setDetails] = useState<any[]>(account.details || []);
    const [subjects, setSubjects] = useState<any[]>([]); // Unified list of Partners/Employees

    useEffect(() => {
        const loadData = async () => {
            try {
                // Determine what to load based on account code
                // 141, 334 -> Employees
                // 131, 331, 341 -> Partners
                // 136, 138, 336, 338 -> Both (or mix)


                const isBankAcc = ['112'].some(p => account.account_code.startsWith(p));

                const promises = [];
                promises.push(masterDataService.getPartners().catch(() => ({ data: [] })));
                promises.push(hrService.getEmployees().catch(() => ({ data: [] })));
                if (isBankAcc) {
                    promises.push(bankService.getAccounts().catch(() => ({ data: [] })));
                } else {
                    promises.push(Promise.resolve({ data: [] }));
                }

                const [pRes, eRes, bRes] = await Promise.all(promises);

                const pList = (pRes.data || []).map((p: any) => ({
                    code: p.partner_code || '',
                    name: p.partner_name || '',
                    group: 'Khách hàng / NCC'
                }));

                const eList = (eRes.data || []).map((e: any) => ({
                    code: e.employee_code || e.code || '',
                    name: e.full_name || e.name || '',
                    group: 'Nhân viên'
                }));

                const bList = (bRes?.data || []).map((b: any) => ({
                    code: b.account_number || '',
                    name: b.bank_name || '',
                    group: 'Ngân hàng'
                }));

                const combined = [...pList, ...eList, ...bList].filter((item: any) => item.code);

                // Remove duplicates if any
                const unique = Array.from(new Map(combined.map((item: any) => [item.code, item])).values());
                unique.sort((a: any, b: any) => (a.code || '').localeCompare(b.code || ''));

                setSubjects(unique);
            } catch (e) {
                logger.error("Error loading subjects:", e);
            }
        };
        loadData();
    }, [account.account_code]);

    const addLine = () => {
        setDetails([...details, { partner_code: '', debit: 0, credit: 0 }]);
    };

    const removeLine = (idx: number) => {
        const newD = [...details];
        newD.splice(idx, 1);
        setDetails(newD);
    };

    const updateLine = (idx: number, field: string, val: any) => {
        const newD = [...details];
        newD[idx] = { ...newD[idx], [field]: val };
        setDetails(newD);
    };

    const totalDebit = details.reduce((sum, d) => sum + (d.debit || 0), 0);
    const totalCredit = details.reduce((sum, d) => sum + (d.credit || 0), 0);

    return (
        <Modal
            title={`Chi tiết số dư: ${account.account_code} - ${account.account_name}`}
            onClose={onClose}
            footer={
                <>
                    <button onClick={addLine} className="mr-auto form-button-secondary flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">add</span> Thêm dòng
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-colors">Hủy bỏ</button>
                    <button
                        onClick={() => onSave(details)}
                        className="form-button-primary"
                    >
                        Lưu thay đổi
                    </button>
                </>
            }
        >
            <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm text-xs uppercase font-bold text-slate-500">
                    <tr>
                        <th className="p-3 w-10 text-center border-b border-slate-200 dark:border-slate-700">#</th>
                        <th className="p-3 text-left border-b border-slate-200 dark:border-slate-700">Đối tượng</th>
                        <th className="p-3 text-right w-40 border-b border-slate-200 dark:border-slate-700">Dư Nợ</th>
                        <th className="p-3 text-right w-40 border-b border-slate-200 dark:border-slate-700">Dư Có</th>
                        <th className="p-3 w-10 border-b border-slate-200 dark:border-slate-700"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {details.map((row, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                            <td className="p-2">
                                <select
                                    value={row.partner_code}
                                    onChange={e => updateLine(idx, 'partner_code', e.target.value)}
                                    className="form-select"
                                >
                                    <option value="">-- Chọn đối tượng --</option>
                                    {subjects.map(s => (
                                        <option key={s.code} value={s.code}>
                                            {s.code} - {s.name} ({s.group})
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td className="p-2">
                                <input
                                    type="number"
                                    value={row.debit}
                                    onChange={e => updateLine(idx, 'debit', Number(e.target.value))}
                                    className="form-input text-right font-mono font-bold"
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    type="number"
                                    value={row.credit}
                                    onChange={e => updateLine(idx, 'credit', Number(e.target.value))}
                                    className="form-input text-right font-mono font-bold"
                                />
                            </td>
                            <td className="p-2 text-center">
                                <button onClick={() => removeLine(idx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {details.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 italic">Chưa có chi tiết nào.</td>
                        </tr>
                    )}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                        <td colSpan={2} className="p-3 text-right uppercase text-xs text-slate-500">Tổng cộng:</td>
                        <td className="p-3 text-right text-blue-600 font-mono text-sm border-l border-slate-200 dark:border-slate-800">{new Intl.NumberFormat('vi-VN').format(totalDebit)}</td>
                        <td className="p-3 text-right text-red-600 font-mono text-sm border-l border-slate-200 dark:border-slate-800">{new Intl.NumberFormat('vi-VN').format(totalCredit)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </Modal>
    );
};

const OpeningBalance = () => {
    const [activeTab, setActiveTab] = useState<'manual' | 'transfer'>('manual');
    const [period, setPeriod] = useState(new Date().getFullYear().toString());
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailModalAccount, setDetailModalAccount] = useState<any | null>(null);

    // Transfer State
    const [fromYear, setFromYear] = useState((new Date().getFullYear() - 1).toString());
    const [toYear, setToYear] = useState(new Date().getFullYear().toString());
    const [transferLoading, setTransferLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'manual') {
            loadData();
        }
    }, [activeTab, period]);

    const loadData = async () => {
        setLoading(true);
        try {
            const accRes = await masterDataService.getAccounts();
            const allAccounts = accRes.data || [];
            const balRes = await openingBalanceService.get(period);
            const rawRows = balRes.data || [];

            const merged = allAccounts.map((acc: any) => {
                const accountRows = rawRows.filter((r: any) => r.account_code === acc.account_code);
                const totalDebit = accountRows.reduce((sum: number, r: any) => sum + (r.debit || 0), 0);
                const totalCredit = accountRows.reduce((sum: number, r: any) => sum + (r.credit || 0), 0);

                return {
                    id: acc.account_code, // SmartTable key
                    account_code: acc.account_code,
                    account_name: acc.account_name,
                    category: acc.category,
                    debit: totalDebit,
                    credit: totalCredit,
                    details: accountRows.length > 0 ? accountRows : []
                };
            });

            merged.sort((a: any, b: any) => (a.account_code || '').localeCompare(b.account_code || ''));
            setBalances(merged);
        } catch (err) {
            logger.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCellChange = (id: string, field: string, value: any) => {
        // Prevent editing if it's a detailed account (handled via Modal)

        if (isDetailedAccount(id)) {
            // Revert changes or ignore
            // In a real app we might want to show a toast "Please use Detail view"
            return;
        }

        setBalances(prev => prev.map(item => {
            if (item.account_code === id) {
                return { ...item, [field]: Number(value) };
            }
            return item;
        }));
    };

    const isDetailedAccount = (code: string) => {
        return ['112', '131', '331', '136', '336', '138', '338', '141', '334', '341'].some(prefix => code.startsWith(prefix));
    };

    const openDetails = (account: any) => {
        setDetailModalAccount(account);
    };

    const saveDetails = (newDetails: any[]) => {
        if (!detailModalAccount) return;
        const totalDebit = newDetails.reduce((sum, d) => sum + (d.debit || 0), 0);
        const totalCredit = newDetails.reduce((sum, d) => sum + (d.credit || 0), 0);

        setBalances(prev => prev.map(acc => {
            if (acc.account_code === detailModalAccount.account_code) {
                return { ...acc, debit: totalDebit, credit: totalCredit, details: newDetails };
            }
            return acc;
        }));
        setDetailModalAccount(null);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = balances.filter(b => b.debit > 0 || b.credit > 0).map(b => ({
                account_code: b.account_code,
                debit: b.debit,
                credit: b.credit,
                details: b.details
            }));
            await openingBalanceService.save(period, payload);
            alert('Đã lưu số dư đầu kỳ thành công!');
        } catch (err: any) {
            logger.error(err);
            alert('Lỗi khi lưu: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!fromYear || !toYear) return alert("Vui lòng chọn năm");
        if (fromYear === toYear) return alert("Năm chuyển đi và đến không được trùng nhau");
        if (!window.confirm(`Bạn có chắc chắn muốn kết chuyển số dư từ năm ${fromYear} sang năm ${toYear}? Dữ liệu đầu kỳ cũ của năm ${toYear} sẽ bị ghi đè.`)) return;

        setTransferLoading(true);
        try {
            const res = await openingBalanceService.transfer(fromYear, toYear);
            alert(res.data.message);
        } catch (err: any) {
            logger.error(err);
            alert('Lỗi kết chuyển: ' + (err.response?.data?.message || err.message));
        } finally {
            setTransferLoading(false);
        }
    };

    const formatNum = (val: number) => {
        if (!val) return '';
        return new Intl.NumberFormat('vi-VN').format(val);
    };

    const totalDebit = balances.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = balances.reduce((sum, item) => sum + (item.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

    // SmartTable Columns
    const columns: ColumnDef[] = [
        {
            field: 'account_code',
            headerName: 'Số TK',
            width: 'w-28',
            renderCell: (val: string) => <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{val}</span>
        },
        { field: 'account_name', headerName: 'Tên Tài khoản', width: 'min-w-[300px]' },
        {
            field: 'debit',
            headerName: 'Dư Nợ Đầu Kỳ',
            width: 'w-48',
            type: 'number',
            align: 'right',
            // Custom render for detailed accounts
            renderCell: (val: number, row: any) => {
                const isDetailed = isDetailedAccount(row.account_code);
                return (
                    <span className={`font-mono font-bold ${isDetailed ? 'text-slate-400 italic' : (val > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-300')}`}>
                        {isDetailed ? '(Chi tiết)' : formatNum(val)}
                    </span>
                );
            }
        },
        {
            field: 'credit',
            headerName: 'Dư Có Đầu Kỳ',
            width: 'w-48',
            type: 'number',
            align: 'right',
            renderCell: (val: number, row: any) => {
                const isDetailed = isDetailedAccount(row.account_code);
                return (
                    <span className={`font-mono font-bold ${isDetailed ? 'text-slate-400 italic' : (val > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-300')}`}>
                        {isDetailed ? '(Chi tiết)' : formatNum(val)}
                    </span>
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Chi tiết',
            width: 'w-24',
            align: 'center',
            renderCell: (_: any, row: any) => isDetailedAccount(row.account_code) ? (
                <button
                    onClick={() => openDetails(row)}
                    className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                    title="Nhập chi tiết theo đối tượng"
                >
                    <span className="material-symbols-outlined text-[20px]">list_alt</span>
                </button>
            ) : null
        }
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
            {/* Sub Toolbar / Tabs */}
            <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Nhập thủ công
                    </button>
                    <button
                        onClick={() => setActiveTab('transfer')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'transfer' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Kết chuyển từ năm trước
                    </button>
                </div>

                {activeTab === 'manual' && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Niên độ</label>
                            <input
                                type="number"
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="bg-slate-100 dark:bg-slate-900 border-none rounded px-2 py-1 text-sm font-bold w-20 text-center outline-none focus:ring-1 ring-blue-500"
                            />
                        </div>
                        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium border ${isBalanced ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/20 dark:border-teal-800' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800'}`}>
                            <div className="flex gap-2">
                                <span>Tổng Nợ: <b className="font-mono">{formatNum(totalDebit)}</b></span>
                                <span className="opacity-30">|</span>
                                <span>Tổng Có: <b className="font-mono">{formatNum(totalCredit)}</b></span>
                            </div>
                            {!isBalanced && (
                                <>
                                    <span className="opacity-30">|</span>
                                    <span>Chênh lệch: <b className="font-mono">{formatNum(Math.abs(totalDebit - totalCredit))}</b></span>
                                </>
                            )}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 text-xs"
                        >
                            <span className="material-symbols-outlined text-[16px]">save</span>
                            Lưu
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'manual' && (
                    <div className="h-full flex flex-col">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : (
                            <SmartTable
                                data={balances}
                                columns={columns}
                                keyField="account_code"
                                onCellChange={handleCellChange}
                                minRows={20}
                                emptyMessage="Chưa có dữ liệu tài khoản"
                            />
                        )}
                    </div>
                )}

                {activeTab === 'transfer' && (
                    <div className="h-full flex items-center justify-center animate-fadeIn bg-slate-50 dark:bg-slate-900 p-8">
                        <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-lg w-full relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>

                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-6 text-purple-600 dark:text-purple-400">
                                    <span className="material-symbols-outlined text-4xl -rotate-3">move_down</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Kết chuyển Số dư</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Chuyển số dư cuối kỳ năm cũ sang đầu kỳ năm mới.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Năm Nguồn</label>
                                        <input
                                            type="number"
                                            value={fromYear}
                                            onChange={(e) => setFromYear(e.target.value)}
                                            className="w-full text-center text-xl font-bold p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 mt-6">arrow_forward</span>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Năm Đích</label>
                                        <input
                                            type="number"
                                            value={toYear}
                                            onChange={(e) => setToYear(e.target.value)}
                                            className="w-full text-center text-xl font-bold p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                    <span className="material-symbols-outlined text-amber-500 shrink-0 text-lg">warning</span>
                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-relaxed">
                                        Lưu ý: Chỉ kết chuyển các tài khoản thực (Đầu 1-4). Các tài khoản Doanh thu/Chi phí sẽ không được chuyển.
                                    </p>
                                </div>

                                <button
                                    onClick={handleTransfer}
                                    disabled={transferLoading}
                                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                >
                                    {transferLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Đang xử lý...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                            Thực hiện
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {detailModalAccount && (
                <DetailedBalanceModal
                    account={detailModalAccount}
                    onClose={() => setDetailModalAccount(null)}
                    onSave={saveDetails}
                />
            )}
        </div>
    );
};

export default OpeningBalance;
