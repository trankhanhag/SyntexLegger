import React, { useEffect, useState } from 'react';
import { voucherService, masterDataService, bankService, settingsService } from '../api';
import { SmartTable, type ColumnDef } from './SmartTable';
import { type RibbonAction } from './Ribbon';
import { FormModal } from './FormModal';
import { DateInput } from './DateInput';
import { toInputDateValue } from '../utils/dateUtils';
import { PrintPreviewModal } from './PrintTemplates';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';

interface CashData {
    cash: number;
    bank: number;
    history: any[];
}

interface CashModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (viewId: string, data?: any) => void;
}

const VoucherDetailRow = React.memo(({
    line,
    idx,
    onChange,
    onDelete
}: {
    line: any,
    idx: number,
    onChange: (idx: number, field: string, value: any) => void,
    onDelete: (idx: number) => void
}) => {
    // Helper to format number to Vietnamese standard (e.g. 1.000.000)
    const formatVal = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
    const parseVal = (str: string) => {
        // Remove thousands separator (.) and replace decimal separator (,) with (.)
        const clean = str.replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(clean) || 0;
    };

    // Initialize state with formatted value
    const [localAmount, setLocalAmount] = useState(formatVal(line.amount || 0));

    // Sync from parent if value changes explicitly (and mismatch)
    useEffect(() => {
        const currentVal = parseVal(localAmount);
        if (currentVal !== line.amount) {
            setLocalAmount(formatVal(line.amount || 0));
        }
    }, [line.amount]);

    return (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
            <td className="px-3 py-1.5 text-[10px] font-medium text-slate-400">{idx + 1}</td>
            <td className="px-2 py-1">
                <input
                    type="text"
                    defaultValue={line.description || ''}
                    onBlur={(e) => onChange(idx, 'description', e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] py-1"
                />
            </td>
            <td className="px-2 py-1">
                <input
                    type="text"
                    defaultValue={line.itemCode || ''}
                    onBlur={(e) => onChange(idx, 'itemCode', e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] font-mono py-1"
                    placeholder="Mục"
                />
            </td>
            <td className="px-2 py-1">
                <input
                    type="text"
                    defaultValue={line.subItemCode || ''}
                    onBlur={(e) => onChange(idx, 'subItemCode', e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] font-mono py-1"
                    placeholder="Tiểu mục"
                />
            </td>
            <td className="px-2 py-1">
                <input
                    type="text"
                    defaultValue={line.debitAcc || ''}
                    onBlur={(e) => onChange(idx, 'debitAcc', e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] font-bold text-blue-600 py-1 uppercase"
                />
            </td>
            <td className="px-2 py-1">
                <input
                    type="text"
                    defaultValue={line.creditAcc || ''}
                    onBlur={(e) => onChange(idx, 'creditAcc', e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] font-bold text-red-600 py-1 uppercase"
                />
            </td>
            <td className="px-2 py-1">
                <input
                    type="text"
                    value={localAmount}
                    onFocus={(e) => {
                        e.target.select();
                    }}
                    onChange={(e) => setLocalAmount(e.target.value)}
                    onBlur={(e) => {
                        const val = parseVal(e.target.value);
                        setLocalAmount(formatVal(val)); // Re-format to look clean
                        onChange(idx, 'amount', val);   // Update parent
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-right text-[13px] font-mono font-bold py-1"
                />
            </td>
            <td className="px-2 py-1 text-center">
                <button
                    onClick={() => onDelete(idx)}
                    className="text-slate-300 hover:text-red-500 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Xóa dòng"
                >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            </td>
        </tr>
    );
}, (prev, next) => {
    return prev.idx === next.idx &&
        prev.line._id === next.line._id &&
        prev.line.amount === next.line.amount &&
        prev.line.description === next.line.description &&
        prev.line.itemCode === next.line.itemCode &&
        prev.line.subItemCode === next.line.subItemCode &&
        prev.line.debitAcc === next.line.debitAcc &&
        prev.line.creditAcc === next.line.creditAcc;
});

export const CashModule: React.FC<CashModuleProps> = ({ subView = 'list', printSignal = 0, onSetHeader, onNavigate }) => {
    const [data, setData] = useState<CashData | null>(null);
    const [loading, setLoading] = useState(true);
    const [bankStaging, setBankStaging] = useState<any[]>([]);
    const [bankConnections, setBankConnections] = useState<any[]>([]);
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '' });
    const [openBankingConfig, setOpenBankingConfig] = useState({ bank: 'Vietcombank (VCB)', accNo: '', apiKey: '' });
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [printRecord, setPrintRecord] = useState<any>(null); // Record to print

    const [voucher, setVoucher] = useState({
        objectName: '',
        address: '',
        personName: '',
        reason: '',
        docNo: subView === 'receipt' ? 'PT0042' : 'PC0042',
        docDate: toInputDateValue(),
        postDate: toInputDateValue(),
        lines: [
            { _id: '1', description: 'Tiền hàng hóa đơn 001', debitAcc: subView === 'receipt' ? '1111' : '331', creditAcc: subView === 'receipt' ? '131' : '1111', amount: 50000000, itemCode: '', subItemCode: '' },
            { _id: '2', description: 'Tiền thuế GTGT hóa đơn 001', debitAcc: subView === 'receipt' ? '1111' : '133', creditAcc: subView === 'receipt' ? '3331' : '1111', amount: 5000000, itemCode: '', subItemCode: '' },
        ]
    });

    useEffect(() => {
        // Update docNo when subView changes and we open the modal
        if (showVoucherModal) {
            if (selectedRow) {
                // Check if it's a legacy seed (seed_X) or staging transaction (trx_X)
                // These exist in GL but NOT in vouchers table, so fetch will 404.
                const isLegacy = String(selectedRow.id).startsWith('seed_') || String(selectedRow.id).startsWith('trx_');

                if (isLegacy) {
                    // Use Fallback Logic immediately for legacy data
                    setLoading(false);
                    setVoucher({
                        objectName: selectedRow.supplier_name || selectedRow.partner_name || '',
                        address: selectedRow.address || '',
                        personName: selectedRow.contact_name || selectedRow.payee_name || selectedRow.payer_name || '',
                        reason: selectedRow.description || '',
                        docNo: selectedRow.doc_no,
                        docDate: toInputDateValue(selectedRow.doc_date || selectedRow.trx_date),
                        postDate: toInputDateValue(selectedRow.post_date || selectedRow.trx_date),
                        lines: selectedRow.lines ? selectedRow.lines.map((l: any) => ({
                            _id: l.id ? String(l.id) : Math.random().toString(36).substr(2, 9),
                            description: l.description || '',
                            debitAcc: l.debit_account || l.account_code || '',
                            creditAcc: l.credit_account || '',
                            amount: l.amount || 0,
                            itemCode: l.item_code || l.itemCode || '',
                            subItemCode: l.sub_item_code || l.subItemCode || ''
                        })) : [{
                            _id: Math.random().toString(36).substr(2, 9),
                            description: selectedRow.description,
                            debitAcc: selectedRow.debit_amount > 0 ? (selectedRow.account_code || '') : (selectedRow.reciprocal_acc || ''),
                            creditAcc: selectedRow.debit_amount > 0 ? (selectedRow.reciprocal_acc || '') : (selectedRow.account_code || ''),
                            amount: Math.abs(selectedRow.amount || selectedRow.debit_amount || selectedRow.credit_amount || 0),
                            itemCode: selectedRow.item_code || selectedRow.itemCode || '',
                            subItemCode: selectedRow.sub_item_code || selectedRow.subItemCode || ''
                        }]
                    });
                } else {
                    // Edit Mode: Fetch full details
                    setLoading(true);
                    voucherService.getById(selectedRow.id)
                        .then(res => {
                            const fullData = res.data;
                            setVoucher({
                                objectName: fullData.supplier_name || fullData.partner_name || '',
                                address: fullData.address || '',
                                personName: fullData.contact_name || fullData.payee_name || fullData.payer_name || '',
                                reason: fullData.description || '',
                                docNo: fullData.doc_no,
                                docDate: toInputDateValue(fullData.doc_date || fullData.trx_date),
                                postDate: toInputDateValue(fullData.post_date || fullData.trx_date),
                                lines: (fullData.lines || fullData.items || []).map((l: any) => ({
                                    _id: l.id ? String(l.id) : Math.random().toString(36).substr(2, 9),
                                    description: l.description || fullData.description || '',
                                    debitAcc: l.debit_account || l.account_code || '',
                                    creditAcc: l.credit_account || '',
                                    amount: l.amount || 0,
                                    itemCode: l.item_code || l.itemCode || '',
                                    subItemCode: l.sub_item_code || l.subItemCode || ''
                                }))
                            });

                            // Fallback if lines empty
                            if (!fullData.lines?.length && !fullData.items?.length) {
                                const fakeId = Math.random().toString(36).substr(2, 9);
                                setVoucher(prev => ({
                                    ...prev,
                                    lines: [{
                                        _id: fakeId,
                                        description: fullData.description,
                                        debitAcc: fullData.debit_account || fullData.account_code || '',
                                        creditAcc: fullData.credit_account || '',
                                        amount: Math.abs(fullData.amount || 0),
                                        itemCode: fullData.item_code || fullData.itemCode || '',
                                        subItemCode: fullData.sub_item_code || fullData.subItemCode || ''
                                    }]
                                }));
                            }
                        })
                        .catch(err => {
                            // Suppress 404 for seeded/legacy data
                            if (err.response?.status !== 404) {
                                console.error("Failed to fetch voucher detail", err);
                            }

                            // Fallback to selectedRow (GL Data)
                            let fallbackDebit = '';
                            let fallbackCredit = '';

                            if (selectedRow.debit_amount > 0) {
                                // Debit Entry
                                fallbackDebit = selectedRow.account_code || '';
                                fallbackCredit = selectedRow.reciprocal_acc || '';
                            } else {
                                // Credit Entry
                                fallbackCredit = selectedRow.account_code || '';
                                fallbackDebit = selectedRow.reciprocal_acc || '';
                            }

                            setVoucher({
                                objectName: selectedRow.supplier_name || selectedRow.partner_name || '',
                                address: selectedRow.address || '',
                                personName: selectedRow.contact_name || selectedRow.payee_name || selectedRow.payer_name || '',
                                reason: selectedRow.description || '',
                                docNo: selectedRow.doc_no,
                                docDate: toInputDateValue(selectedRow.doc_date || selectedRow.trx_date),
                                postDate: toInputDateValue(selectedRow.post_date || selectedRow.trx_date),
                                lines: selectedRow.lines ? selectedRow.lines.map((l: any, i: number) => ({
                                    _id: l.id || Date.now() + i,
                                    description: l.description || '',
                                    debitAcc: l.debit_account || l.account_code || '',
                                    creditAcc: l.credit_account || '',
                                    amount: l.amount || 0,
                                    itemCode: l.item_code || l.itemCode || '',
                                    subItemCode: l.sub_item_code || l.subItemCode || ''
                                })) : [{
                                    _id: Math.random().toString(36).substr(2, 9),
                                    description: selectedRow.description,
                                    debitAcc: fallbackDebit || selectedRow.debit_account || '',
                                    creditAcc: fallbackCredit || selectedRow.credit_account || '',
                                    amount: Math.abs(selectedRow.amount || selectedRow.debit_amount || selectedRow.credit_amount || 0),
                                    itemCode: selectedRow.item_code || selectedRow.itemCode || '',
                                    subItemCode: selectedRow.sub_item_code || selectedRow.subItemCode || ''
                                }]
                            });
                        })
                        .finally(() => setLoading(false));
                }
            } else {
                // Create Mode
                setVoucher(prev => ({
                    ...prev,
                    objectName: '', address: '', personName: '', reason: '',
                    docNo: subView === 'receipt' ? 'PT0042' :
                        subView === 'payment' ? 'PC0042' :
                            subView === 'bank_in' ? 'BC0042' : 'BN0042',
                    lines: [{
                        _id: Math.random().toString(36).substr(2, 9),
                        description: subView === 'receipt' ? 'Thu tiền...' : 'Chi tiền...',
                        debitAcc: (subView === 'receipt') ? '1111' : (subView === 'bank_in' ? '1121' : ''),
                        creditAcc: (subView === 'payment') ? '1111' : (subView === 'bank_out' ? '1121' : ''),
                        amount: 0,
                        itemCode: '',
                        subItemCode: ''
                    }]
                }));
            }
        }
    }, [showVoucherModal]);

    // Handle print signal from Ribbon
    useEffect(() => {
        if (printSignal > 0) {
            // Only allow printing for voucher views (receipt, payment, bank_in, bank_out)
            const printableViews = ['receipt', 'payment', 'bank_in', 'bank_out'];
            if (!printableViews.includes(subView)) {
                alert('Chức năng in chỉ áp dụng cho Phiếu thu, Phiếu chi và các giao dịch Ngân hàng.');
                return;
            }

            // If viewing a voucher detail, print that voucher
            if (showVoucherModal && voucher) {
                // Convert voucher state to print record format
                const totalAmount = voucher.lines.reduce((sum, l) => sum + (l.amount || 0), 0);
                const record = {
                    voucher_no: voucher.docNo,
                    voucher_date: voucher.docDate,
                    doc_no: voucher.docNo,
                    date: voucher.docDate,
                    payee_name: voucher.personName,
                    payer_name: voucher.personName,
                    address: voucher.address,
                    description: voucher.reason,
                    reason: voucher.reason,
                    amount: totalAmount,
                    total_amount: totalAmount,
                    debit_account: voucher.lines[0]?.debitAcc || '',
                    credit_account: voucher.lines[0]?.creditAcc || '',
                    lines: voucher.lines,
                };
                setPrintRecord(record);
                setShowPrintPreview(true);
                return;
            }

            // If a row is selected from list, print that
            if (selectedRow) {
                setPrintRecord(selectedRow);
                setShowPrintPreview(true);
                return;
            }

            // No selection - show message
            alert('Vui lòng chọn một phiếu từ danh sách hoặc mở chi tiết phiếu để in.');
        }
    }, [printSignal, showVoucherModal, selectedRow, subView, voucher]);

    const loadBalances = async () => {
        try {
            const res = await masterDataService.getCashBalances();
            setData(res.data);
        } catch (err) {
            console.error("Failed to load balances", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch company info for print preview
    useEffect(() => {
        settingsService.getSettings()
            .then(res => {
                const settings = res.data;
                setCompanyInfo({
                    name: settings.company_name || 'Đơn vị của bạn',
                    address: settings.company_address || 'Địa chỉ đơn vị'
                });
            })
            .catch(err => console.error('Load company info failed:', err));
    }, []);

    useEffect(() => {
        const loadBankData = async () => {
            if (subView === 'bank_sync') {
                try {
                    const res = await bankService.getStaging();
                    setBankStaging(res.data);
                } catch (err) { console.error(err); }
            }
            if (subView === 'bank_config') {
                try {
                    const res = await bankService.getAccounts();
                    setBankConnections(res.data);
                } catch (err) { console.error(err); }
            }
        };

        const loadSettings = async () => {
            try {
                const res = await settingsService.getSettings();
                const settings = res.data;
                const name = settings.company_name || 'SYNTEX CORP';
                const address = settings.company_address || 'Hà Nội, Việt Nam';
                setCompanyInfo({ name, address });
            } catch (err) { console.error(err); }
        };

        loadBalances();
        loadBankData();
        loadSettings();
    }, [subView]);

    useEffect(() => {
        if (onSetHeader) {
            const getTitle = () => {
                switch (subView) {
                    case 'list': return 'Sổ quỹ & Tiền gửi';
                    case 'receipt': return 'Phiếu thu tiền mặt';
                    case 'payment': return 'Phiếu chi tiền mặt';
                    case 'bank_in': return 'Giấy báo Có (Tiền gửi)';
                    case 'bank_out': return 'Giấy báo Nợ (Tiền gửi)';
                    case 'bank_sync': return 'Đồng bộ Ngân hàng (API)';
                    case 'reconcile': return 'Đối chiếu Ngân hàng';
                    default: return 'Ngân quỹ';
                }
            };
            const getIcon = () => {
                switch (subView) {
                    case 'receipt': return 'payments';
                    case 'payment': return 'output';
                    case 'bank_in':
                    case 'bank_out': return 'account_balance';
                    default: return 'account_balance_wallet';
                }
            };
            const actions: RibbonAction[] = [];
            if (['receipt', 'payment', 'bank_in', 'bank_out'].includes(subView)) {
                actions.push({
                    label: subView === 'receipt' ? 'Lập Phiếu thu' :
                        subView === 'payment' ? 'Lập Phiếu chi' :
                            subView === 'bank_in' ? 'Lập Giấy báo có' : 'Lập Giấy báo nợ',
                    icon: 'add_circle',
                    onClick: () => setShowVoucherModal(true),
                    primary: true
                });
            } else if (subView === 'bank_sync') {
                actions.push({
                    label: 'Đồng bộ ngay',
                    icon: 'sync',
                    onClick: () => alert("Đang đồng bộ dữ liệu ngân hàng..."),
                    primary: true
                });
            }

            if (selectedRow && ['receipt', 'payment', 'bank_in', 'bank_out'].includes(subView)) {
                actions.push({
                    label: 'Sửa chứng từ',
                    icon: 'edit',
                    onClick: () => setShowVoucherModal(true)
                });
                actions.push({
                    label: 'In phiếu',
                    icon: 'print',
                    onClick: () => setShowPrintPreview(true)
                });
            }

            onSetHeader({ title: getTitle(), icon: getIcon(), actions, onDelete: handleDeleteSelected });
        }
    }, [subView, onSetHeader, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa chứng từ đã chọn?`)) return;

        try {
            await voucherService.delete(selectedRow.id);
            alert("Đã xóa thành công.");
            loadBalances();
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const handleSaveVoucher = async () => {
        try {
            const vType = subView === 'receipt' ? 'CASH_IN' :
                subView === 'payment' ? 'CASH_OUT' :
                    subView === 'bank_in' ? 'BANK_IN' : 'BANK_OUT';

            const totalAmount = voucher.lines.reduce((sum, l) => sum + l.amount, 0);

            const payload = {
                doc_no: voucher.docNo,
                doc_date: voucher.docDate,
                post_date: voucher.postDate,
                description: voucher.reason,
                type: vType,
                total_amount: totalAmount,
                lines: voucher.lines
            };

            await (selectedRow ? voucherService.update(selectedRow.id, payload) : voucherService.save(payload));

            setShowVoucherModal(false);
            alert(selectedRow ? "Đã cập nhật thành công!" : "Đã lưu thành công!");

            // Reload balances
            const res = await masterDataService.getCashBalances();
            setData(res.data);
            setSelectedRow(null); // Clear selection
        } catch (err) {
            console.error("Failed to save cash voucher:", err);
            alert("Lỗi khi lưu chứng từ quỹ.");
        }
    };

    const handleLineChange = React.useCallback((index: number, field: string, value: any) => {
        setVoucher(prev => {
            const newLines = [...prev.lines];
            newLines[index] = { ...newLines[index], [field]: value };
            return { ...prev, lines: newLines };
        });
    }, []);

    const handleDeleteLine = React.useCallback((index: number) => {
        setVoucher(prev => {
            const newLines = prev.lines.filter((_, i) => i !== index);
            return { ...prev, lines: newLines };
        });
    }, []);

    const voucherTitle = subView === 'receipt'
        ? 'Lập Phiếu thu tiền mặt'
        : subView === 'payment'
            ? 'Lập Phiếu chi tiền mặt'
            : subView === 'bank_in'
                ? 'Lập Giấy báo Có (Tiền gửi)'
                : subView === 'bank_out'
                    ? 'Lập Giấy báo Nợ (Tiền gửi)'
                    : 'Lập chứng từ tiền';

    const voucherIcon = subView === 'receipt'
        ? 'payments'
        : subView === 'payment'
            ? 'output'
            : (subView === 'bank_in' || subView === 'bank_out')
                ? 'account_balance'
                : 'receipt_long';

    if (loading) return (
        <div className="flex-1 flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse">Đang tải dữ liệu quỹ...</p>
            </div>
        </div>
    );

    // Define columns for the transaction list
    const columns: ColumnDef[] = [
        { field: 'trx_date', headerName: 'Ngày CT', width: 'w-32', type: 'date' },
        { field: 'doc_no', headerName: 'Số CT', width: 'w-24' },
        { field: 'description', headerName: 'Diễn giải', width: 'min-w-[300px]' },
        {
            field: 'account_code', headerName: 'TK', width: 'w-24', align: 'center',
            renderCell: (val: any) => <span className={`font-bold ${String(val || '').startsWith('111') ? 'text-green-600' : 'text-blue-600'}`}>{val}</span>
        },
        {
            field: 'amount', headerName: 'Số tiền', width: 'w-32', align: 'right',
            renderCell: (_: any, row: any) => {
                const val = row.debit_amount > 0 ? row.debit_amount : -row.credit_amount;
                return <span className={`font-mono font-bold ${val > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNumber(val)}</span>;
            }
        },
        { field: 'contract_code', headerName: 'Mã Hợp đồng', width: 'w-28' },
        { field: 'project_code', headerName: 'Mã Dự án', width: 'w-28' },
        // 5 Dimension Columns (Read-only for Cash History View)
        { field: 'dim1', headerName: 'Mã TK 1', width: 'w-20' },
        { field: 'dim2', headerName: 'Mã TK 2', width: 'w-20' },
        { field: 'dim3', headerName: 'Mã TK 3', width: 'w-20' },
        { field: 'dim4', headerName: 'Mã TK 4', width: 'w-20' },
        { field: 'dim5', headerName: 'Mã TK 5', width: 'w-20' },
    ];

    // Filter logic based on subView
    const filteredHistory = (data?.history || []).filter(row => {
        const acc = String(row.account_code || '');
        if (subView === 'receipt') return acc.startsWith('111') && row.debit_amount > 0;
        if (subView === 'payment') return acc.startsWith('111') && row.credit_amount > 0;
        if (subView === 'bank_in') return acc.startsWith('112') && row.debit_amount > 0;
        if (subView === 'bank_out') return acc.startsWith('112') && row.credit_amount > 0;
        return true; // default list
    }) || [];

    const tableData = filteredHistory;

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative">

            {/* Module Overview - Default Landing Page */}
            {(subView === 'overview' || subView === '' || !subView) && (
                <ModuleOverview
                    title={MODULE_CONFIGS.cash.title}
                    description={MODULE_CONFIGS.cash.description}
                    icon={MODULE_CONFIGS.cash.icon}
                    iconColor={MODULE_CONFIGS.cash.iconColor}
                    workflow={MODULE_CONFIGS.cash.workflow}
                    features={MODULE_CONFIGS.cash.features}
                    onNavigate={onNavigate}
                    stats={[
                        { icon: 'payments', label: 'Tiền mặt (111)', value: formatNumber(data?.cash || 0), color: 'green' },
                        { icon: 'account_balance', label: 'Tiền gửi (112)', value: formatNumber(data?.bank || 0), color: 'blue' },
                        { icon: 'receipt_long', label: 'Phát sinh tháng', value: (data?.history || []).length, color: 'amber' },
                        { icon: 'check_circle', label: 'Trạng thái', value: 'Sẵn sàng', color: 'green' },
                    ]}
                />
            )}

            <div className={`flex-1 flex flex-col overflow-hidden ${(subView === 'overview' || subView === '' || !subView) ? 'hidden' : ''}`}>
                {/* Top Summary Section Table (Only in generic list) */}
                {subView === 'list' && (
                    <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-border-light dark:border-border-dark shrink-0">
                        <table className="w-full text-sm border-collapse max-w-2xl">
                            <tbody>
                                <tr>
                                    <td className="w-24 font-bold text-slate-500 py-1 text-xs uppercase tracking-wider">Tài khoản</td>
                                    <td className="font-bold text-slate-500 py-1 text-xs uppercase tracking-wider">Tên tài khoản</td>
                                    <td className="text-right font-bold text-slate-500 py-1 text-xs uppercase tracking-wider">Số dư hiện tại</td>
                                </tr>
                                <tr className="group">
                                    <td className="w-24 font-bold text-blue-600 py-2">111</td>
                                    <td className="font-medium text-slate-700 dark:text-slate-300 py-2">Tiền mặt tại quỹ</td>
                                    <td className="text-right font-mono font-bold text-slate-800 dark:text-white py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-md px-2">{formatNumber(data?.cash || 0)}</td>
                                </tr>
                                <tr>
                                    <td className="w-24 font-bold text-blue-600 py-2">112</td>
                                    <td className="font-medium text-slate-700 dark:text-slate-300 py-2">Tiền gửi ngân hàng</td>
                                    <td className="text-right font-mono font-bold text-slate-800 dark:text-white py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-md px-2">{formatNumber(data?.bank || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Smart Table for Transactions */}
                <div className="flex-1 overflow-hidden">
                    {subView === 'bank_sync' ? (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-800">
                            <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800 flex justify-between items-center shrink-0">
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">info</span>
                                    Dữ liệu được đồng bộ tự động từ API Ngân hàng. Vui lòng kiểm tra và Ghi sổ (Post) để hoàn tất.
                                </p>
                                <button className="text-xs font-bold text-blue-600 hover:underline">Sửa quy tắc hạch toán tự động</button>
                            </div>
                            <SmartTable
                                data={bankStaging}
                                columns={[
                                    { field: 'trx_date', headerName: 'Ngày', width: '100', type: 'date' },
                                    { field: 'doc_no', headerName: 'Mã GD', width: '120' },
                                    { field: 'description', headerName: 'Nội dung giao dịch', width: '350' },
                                    { field: 'amount', headerName: 'Số tiền', type: 'number', width: '130' },
                                    { field: 'suggested_debit', headerName: 'Nợ (Gợi ý)', width: '80', editable: true },
                                    { field: 'suggested_credit', headerName: 'Có (Gợi ý)', width: '80', editable: true },
                                    {
                                        field: 'source',
                                        headerName: 'Trạng thái',
                                        width: '100',
                                        renderCell: () => <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Ready</span>
                                    }
                                ]}
                                keyField="id"
                                emptyMessage="Chưa có dữ liệu từ Ngân hàng"
                                minRows={15}
                                onCellChange={(id, field, val) => {
                                    setBankStaging(prev => prev.map(row => row.id === id ? { ...row, [field]: val } : row));
                                }}
                            />
                        </div>
                    ) : subView === 'bank_config' ? (
                        <div className="p-8 bg-slate-50 dark:bg-slate-900 h-full overflow-y-auto">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-600">link</span>
                                        Thiết lập kết nối Open Banking
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="form-label">Ngân hàng</label>
                                            <select
                                                value={openBankingConfig.bank}
                                                onChange={(e) => setOpenBankingConfig({ ...openBankingConfig, bank: e.target.value })}
                                                className="form-select"
                                            >
                                                <option>Vietcombank (VCB)</option>
                                                <option>Techcombank (TCB)</option>
                                                <option>MB Bank</option>
                                                <option>Casso Dispatcher</option>
                                                <option>Sepay Connector</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="form-label">Số tài khoản</label>
                                            <input
                                                value={openBankingConfig.accNo}
                                                onChange={(e) => setOpenBankingConfig({ ...openBankingConfig, accNo: e.target.value })}
                                                placeholder="Nhập số tài khoản..."
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="form-label">API Key / Webhook Token</label>
                                            <input
                                                type="password"
                                                value={openBankingConfig.apiKey}
                                                onChange={(e) => setOpenBankingConfig({ ...openBankingConfig, apiKey: e.target.value })}
                                                placeholder="Nhập API Key..."
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex gap-3">
                                        <button className="form-button-primary">Lưu cấu hình</button>
                                        <button className="form-button-secondary">Kiểm tra kết nối</button>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-600">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Danh sách tài khoản đang hoạt động
                                    </h3>
                                    <div className="space-y-3">
                                        {bankConnections.map((conn, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                                        <span className="material-symbols-outlined">account_balance</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{conn.bank_name}</p>
                                                        <p className="text-xs text-slate-500">{conn.acc_no}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Connected</span>
                                                    <button className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">link_off</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <SmartTable
                            data={tableData}
                            columns={columns}
                            keyField="id"
                            emptyMessage="Chưa có giao dịch trong kỳ"
                            onSelectionChange={setSelectedRow}
                            minRows={10}
                        />
                    )}
                </div>
                {/* Print Preview Modal - HCSN Standard */}
                {showPrintPreview && printRecord && (
                    <PrintPreviewModal
                        record={printRecord}
                        view={subView === 'receipt' || subView === 'bank_in' ? 'CASH_RECEIPT' : 'CASH_PAYMENT'}
                        onClose={() => {
                            setShowPrintPreview(false);
                            setPrintRecord(null);
                        }}
                        companyInfo={companyInfo}
                    />
                )}
            </div>

            {/* Receipt/Payment Form Modal */}
            {showVoucherModal && (
                <div className="no-print">
                    <FormModal
                        title={voucherTitle}
                        onClose={() => setShowVoucherModal(false)}
                        icon={voucherIcon}
                        sizeClass="max-w-[90vw] min-w-[80vw]"
                        bodyClass="flex-1 p-0 overflow-hidden"
                        onBackdropClick={() => setShowVoucherModal(false)}
                    >
                        <div className="flex h-full flex-col">
                            <div className="flex-1 overflow-auto p-6 space-y-6">
                                {/* Header Section */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        Thông tin chung
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="form-label">Đối tượng / Khách hàng</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={voucher.objectName}
                                                    onChange={(e) => setVoucher({ ...voucher, objectName: e.target.value })}
                                                    placeholder="Chọn hoặc nhập tên đối tượng..."
                                                    className="form-input font-medium pr-10"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-hover:text-blue-500 cursor-pointer pointer-events-none">search</span>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="form-label">Địa chỉ</label>
                                            <input
                                                type="text"
                                                value={voucher.address}
                                                onChange={(e) => setVoucher({ ...voucher, address: e.target.value })}
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="form-label">{subView === 'receipt' ? 'Người nộp tiền' : 'Người nhận tiền'}</label>
                                            <input
                                                type="text"
                                                value={voucher.personName}
                                                onChange={(e) => setVoucher({ ...voucher, personName: e.target.value })}
                                                className="form-input font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="form-label">Số chứng từ</label>
                                            <input
                                                type="text"
                                                value={voucher.docNo}
                                                onChange={(e) => setVoucher({ ...voucher, docNo: e.target.value })}
                                                className="form-input font-bold text-blue-600"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="form-label">Ngày lập</label>
                                            <DateInput
                                                value={voucher.docDate}
                                                onChange={(value) => setVoucher({ ...voucher, docDate: value })}
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="md:col-span-3 space-y-1.5">
                                            <label className="form-label">Ly do {subView === 'receipt' ? 'thu' : 'chi'}</label>
                                            <input
                                                type="text"
                                                value={voucher.reason}
                                                onChange={(e) => setVoucher({ ...voucher, reason: e.target.value })}
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="form-label">Ngày hạch toán</label>
                                            <DateInput
                                                value={voucher.postDate}
                                                onChange={(value) => setVoucher({ ...voucher, postDate: value })}
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Section (Table) */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Chi tiết hạch toán
                                        </h3>
                                        <button
                                            onClick={() => setVoucher({ ...voucher, lines: [...voucher.lines, { _id: Math.random().toString(36).substr(2, 9), description: voucher.reason, debitAcc: '', creditAcc: '', amount: 0, itemCode: '', subItemCode: '' }] })}
                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            Thêm dòng
                                        </button>
                                    </div>

                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-10">#</th>
                                                    <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diễn giải</th>
                                                    <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20">Mục</th>
                                                    <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Tiểu mục</th>
                                                    <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">TK Nợ</th>
                                                    <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">TK Có</th>
                                                    <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-36">Số tiền</th>
                                                    <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {voucher.lines.map((line: any, idx) => (
                                                    <VoucherDetailRow
                                                        key={line._id || `idx-${idx}`}
                                                        line={line}
                                                        idx={idx}
                                                        onChange={handleLineChange}
                                                        onDelete={handleDeleteLine}
                                                    />
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                                                    <td colSpan={6} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Tổng cộng:</td>
                                                    <td className="px-4 py-3 text-right text-sm font-mono font-black text-blue-600">
                                                        {formatNumber(voucher.lines.reduce((sum, l) => sum + l.amount, 0))}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions px-6 pb-6 bg-slate-50/50 dark:bg-slate-800/50">
                                <button onClick={() => setShowVoucherModal(false)} className="form-button-secondary">Hủy bỏ</button>
                                <button onClick={handleSaveVoucher} className="form-button-primary flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">save</span>
                                    Cất & Ghi sổ
                                </button>
                            </div>
                        </div>
                    </FormModal>
                </div >
            )}

        </div >
    );
};
