import React, { useEffect, useState, useCallback } from 'react';
import api, { voucherService } from '../api';
import { SmartTable, type ColumnDef } from './SmartTable';
import { normalizeDateValue, toInputDateValue } from '../utils/dateUtils';
import logger from '../utils/logger';

// Debounce helper
const debounce = (func: Function, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

interface Transaction {
    id: string;
    row_index: number;
    trx_date?: string;
    doc_no?: string;
    description?: string;
    debit_acc?: string;
    credit_acc?: string;
    amount?: number;
    partner_code?: string;
    item_code?: string;
    sub_item_code?: string;
    is_valid: boolean;
    error_log?: string;
}

export const Spreadsheet: React.FC<{ refreshSignal?: number }> = ({ refreshSignal }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<{ account_code: string, account_name: string }[]>([]);
    const [posting, setPosting] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/staging');
            setTransactions(res.data);

            const accRes = await api.get('/accounts');
            setAccounts(accRes.data);
        } catch (err) {
            logger.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (localStorage.getItem('token')) {
                loadData();
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!localStorage.getItem('token')) return;
        loadData();
    }, [refreshSignal]);

    // Debounced update
    const updateTransaction = async (id: string, field: string, value: any) => {
        try {
            await api.put(`/staging/${id}`, { [field]: value });
        } catch (err) {
            logger.error("Failed to save", err);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedUpdate = useCallback(debounce(updateTransaction, 500), []);

    const handleCellChange = (id: string, field: string, value: any) => {
        // Special logic for Amount
        if (field === 'amount') {
            const rawValue = String(value).replace(/[^0-9]/g, '');
            const numberValue = rawValue ? parseInt(rawValue, 10) : 0;

            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, amount: numberValue } : t
            ));
            debouncedUpdate(id, 'amount', numberValue);
        } else {
            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, [field]: value } : t
            ));
            debouncedUpdate(id, field, value);
        }
    };

    const addNewRow = async () => {
        const newRow = {
            row_index: transactions.length + 1,
            trx_date: toInputDateValue(),
            is_valid: false
        };
        const res = await api.post('/staging', newRow);
        setTransactions([...transactions, res.data.data]);
    };

    const updateRow = async (id: string, updates: Partial<Transaction>) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        try {
            await api.put(`/staging/${id}`, updates);
        } catch (err) {
            logger.error("Failed to update staging row", err);
        }
    };

    const postToVouchers = async () => {
        const pendingRows = transactions.filter(row => !(row.error_log || '').startsWith('Đã ghi sổ'));
        if (pendingRows.length === 0) {
            alert("Không có dòng nào cần ghi sổ.");
            return;
        }

        setPosting(true);
        try {
            const invalid: Array<{ row: Transaction; reason: string }> = [];
            const valid: Transaction[] = [];

            pendingRows.forEach((row) => {
                const missing: string[] = [];
                if (!row.doc_no) missing.push('Số CT');
                if (!row.trx_date) missing.push('Ngày CT');
                if (!row.debit_acc) missing.push('TK Nợ');
                if (!row.credit_acc) missing.push('TK Có');
                if (!row.amount || Number(row.amount) <= 0) missing.push('Số tiền');

                if (missing.length > 0) {
                    invalid.push({ row, reason: `Thiếu: ${missing.join(', ')}` });
                } else {
                    valid.push(row);
                }
            });

            await Promise.all(invalid.map(item => updateRow(item.row.id, { is_valid: false, error_log: item.reason })));
            if (valid.length === 0) {
                alert("Không có dòng hợp lệ để ghi sổ.");
                return;
            }

            const grouped = new Map<string, Transaction[]>();
            valid.forEach((row) => {
                const key = String(row.doc_no || '').trim();
                if (!key) return;
                const bucket = grouped.get(key) || [];
                bucket.push(row);
                grouped.set(key, bucket);
            });

            const failedDocs: string[] = [];

            for (const [docNo, rows] of grouped.entries()) {
                const dates = rows.map(r => normalizeDateValue(r.trx_date || '')).filter(Boolean).sort();
                const docDate = dates[0] || toInputDateValue();
                const lines = rows.map(r => ({
                    description: r.description || '',
                    debitAcc: r.debit_acc || '',
                    creditAcc: r.credit_acc || '',
                    amount: Number(r.amount) || 0,
                    partnerCode: r.partner_code || '',
                    itemCode: r.item_code || '',
                    subItemCode: r.sub_item_code || ''
                }));

                const totalAmount = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
                const payload = {
                    doc_no: docNo,
                    doc_date: docDate,
                    post_date: docDate,
                    description: rows.find(r => r.description)?.description || '',
                    type: 'GENERAL',
                    total_amount: totalAmount,
                    currency: 'VND',
                    fx_rate: 1,
                    status: 'POSTED',
                    lines
                };

                try {
                    await voucherService.save(payload);
                    await Promise.all(rows.map(r => updateRow(r.id, { is_valid: true, error_log: 'Đã ghi sổ' })));
                } catch (err) {
                    logger.error("Failed to post voucher:", err);
                    failedDocs.push(docNo);
                    await Promise.all(rows.map(r => updateRow(r.id, { is_valid: false, error_log: 'Lỗi ghi sổ' })));
                }
            }

            if (failedDocs.length > 0) {
                alert(`Một số chứng từ ghi sổ lỗi: ${failedDocs.join(', ')}`);
            } else {
                alert(`Đã ghi sổ ${grouped.size} chứng từ.`);
            }
        } finally {
            setPosting(false);
        }
    };

    // Columns Definition
    const columns: ColumnDef[] = [
        { field: 'trx_date', headerName: 'Ngày CT', width: 'w-32', editable: true, type: 'date' },
        { field: 'doc_no', headerName: 'Số CT', width: 'w-24', editable: true },
        { field: 'description', headerName: 'Diễn giải', width: 'min-w-[300px]', editable: true },
        { field: 'debit_acc', headerName: 'TK Nợ', width: 'w-20', align: 'center', editable: true, dataListId: 'account-list' },
        { field: 'credit_acc', headerName: 'TK Có', width: 'w-20', align: 'center', editable: true, dataListId: 'account-list' },
        { field: 'item_code', headerName: 'Mục', width: 'w-20', align: 'center', editable: true },
        { field: 'sub_item_code', headerName: 'Khoản mục', width: 'w-24', align: 'center', editable: true },
        { field: 'amount', headerName: 'Số tiền', width: 'w-32', align: 'right', editable: true, type: 'number' },
        { field: 'partner_code', headerName: 'Đối tượng', width: 'w-40', editable: true },
        { field: 'error_log', headerName: 'Ghi chú', width: 'w-40', editable: false } // Readonly
    ];

    const handleRowCommit = async (rowData: any) => {
        // Create new real transaction from draft data
        const newRow = {
            row_index: transactions.length + 1,
            trx_date: rowData.trx_date, // Or default if missing
            doc_no: rowData.doc_no,
            description: rowData.description,
            debit_acc: rowData.debit_acc,
            credit_acc: rowData.credit_acc,
            amount: Number(rowData.amount),
            partner_code: rowData.partner_code,
            item_code: rowData.item_code,
            sub_item_code: rowData.sub_item_code,
            is_valid: true // Assuming it's valid if user commits, or backend validates
        };

        try {
            const res = await api.post('/staging', newRow);
            setTransactions(prev => [...prev, res.data.data]);
        } catch (err) {
            logger.error("Failed to commit row", err);
            // Optionally show toast error
        }
    };

    const clearAll = async () => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu trong bảng Nghiệp vụ khác không?")) return;
        try {
            await api.delete('/staging');
            setTransactions([]);
        } catch (err) {
            logger.error(err);
        }
    };

    const resetData = async () => {
        if (!window.confirm("Bạn có muốn khôi phục dữ liệu mẫu chuẩn cho Nghiệp vụ khác không?")) return;
        try {
            await api.post('/staging/reset');
            loadData();
        } catch (err) {
            logger.error(err);
        }
    };

    if (loading) return <div className="p-4">Loading data...</div>;

    return (
        <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900 overflow-hidden">
            {/* Account Datalist */}
            <datalist id="account-list">
                {accounts.map(acc => (
                    <option key={acc.account_code} value={acc.account_code}>{acc.account_name}</option>
                ))}
            </datalist>

            <SmartTable
                data={transactions}
                columns={columns}
                keyField="id"
                isCoreEditable={true}
                onCellChange={handleCellChange}
                onRowCommit={handleRowCommit}
                getRowClassName={(row: any) => !row.is_valid ? 'bg-red-50 dark:bg-red-900/10' : ''}
                emptyMessage="Chưa có nghiệp vụ khác. Nhấn nút '+' để thêm mới."
                minRows={10}
            />

            <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end z-40 pointer-events-none">
                <button
                    onClick={resetData}
                    className="bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full shadow-lg transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center group pointer-events-auto flex-shrink-0 overflow-hidden"
                    title="Khôi phục dữ liệu mẫu"
                >
                    <span className="material-symbols-outlined transition-transform group-hover:rotate-180 select-none whitespace-nowrap">restart_alt</span>
                </button>
                <button
                    onClick={postToVouchers}
                    disabled={posting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-12 h-12 min-w-[48px] min-h-[48px] rounded-full shadow-lg transition-all flex items-center justify-center pointer-events-auto flex-shrink-0 overflow-hidden disabled:opacity-60"
                    title="Ghi so tu bang tinh"
                >
                    <span className="material-symbols-outlined select-none whitespace-nowrap">task_alt</span>
                </button>
                <button
                    onClick={clearAll}
                    className="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/40 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full shadow-lg transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center group pointer-events-auto flex-shrink-0 overflow-hidden"
                    title="Làm sạch dữ liệu (Xóa hết)"
                >
                    <span className="material-symbols-outlined select-none whitespace-nowrap">delete_sweep</span>
                </button>
                <button
                    onClick={addNewRow}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 min-w-[56px] min-h-[56px] rounded-full shadow-xl transition-all hover:scale-110 flex items-center justify-center mt-2 pointer-events-auto flex-shrink-0 overflow-hidden"
                    title="Thêm nghiệp vụ mới"
                >
                    <span className="material-symbols-outlined text-[28px] select-none whitespace-nowrap">add</span>
                </button>
            </div>
        </div>
    );
};
