/**
 * ChartOfAccounts Component
 * SyntexHCSN - Hệ thống Tài khoản với chức năng nhập Excel
 */

import React, { useRef } from 'react';
import { SmartTable, type ColumnDef } from '../SmartTable';
import { masterDataService } from '../../api';
import { ExcelImportModal, type ColumnDef as ImportColumnDef } from '../ExcelImportModal';

interface ChartOfAccountsProps {
    onSelectionChange?: (v: any) => void;
    refreshSignal?: number;
    importSignal?: number;
}

// Column definitions for Excel import
const IMPORT_COLUMNS: ImportColumnDef[] = [
    {
        key: 'account_code',
        label: 'Mã TK',
        required: true,
        aliases: ['số hiệu tk', 'so hieu tk', 'ma tk', 'account_code', 'code'],
        width: '15',
    },
    {
        key: 'account_name',
        label: 'Tên TK',
        required: true,
        aliases: ['tên tài khoản', 'ten tai khoan', 'account_name', 'name'],
        width: '30',
    },
    {
        key: 'category',
        label: 'Tính chất',
        required: false,
        aliases: ['tinh chat', 'loại', 'loai', 'type'],
        width: '15',
    },
    {
        key: 'parent_account',
        label: 'TK cấp trên',
        required: false,
        aliases: ['tk cap tren', 'parent', 'tk cha'],
        width: '15',
    },
    {
        key: 'description',
        label: 'Diễn giải',
        required: false,
        aliases: ['dien giai', 'ghi chú', 'ghi chu', 'mo ta'],
        width: '30',
    },
];

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({
    onSelectionChange,
    refreshSignal,
    importSignal = 0
}) => {
    const [data, setData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [showImport, setShowImport] = React.useState(false);

    // Track previous signal to detect actual changes
    const prevImportSignalRef = useRef(importSignal);

    // Handle import signal from Ribbon
    React.useEffect(() => {
        if (importSignal > 0 && importSignal !== prevImportSignalRef.current) {
            setShowImport(true);
        }
        prevImportSignalRef.current = importSignal;
    }, [importSignal]);

    const fetchData = async () => {
        try {
            setLoading(true);
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

    React.useEffect(() => {
        fetchData();
    }, [refreshSignal]);

    const handleImport = async (importedData: any[]) => {
        // Transform data to match API format
        const accounts = importedData.map(row => ({
            account_code: String(row.account_code).trim(),
            account_name: String(row.account_name).trim(),
            category: row.category || 'Lưỡng tính',
            parent_account: row.parent_account || null,
            description: row.description || '',
        }));

        await masterDataService.saveAccounts(accounts);
        await fetchData(); // Refresh data
    };

    const validateAccount = (row: any, allRows: any[]): string | null => {
        // Check for duplicate codes within import
        const duplicates = allRows.filter(r => r.account_code === row.account_code);
        if (duplicates.length > 1) {
            return `Mã TK "${row.account_code}" bị trùng trong file`;
        }

        // Check if code exists in current data
        if (data.some(acc => acc.code === row.account_code)) {
            return null; // Will update existing account - this is OK
        }

        return null;
    };

    const columns: ColumnDef[] = [
        {
            field: 'code',
            headerName: 'Số hiệu TK',
            width: 'w-32',
            renderCell: (v: string) => <span className="font-bold text-blue-600">{v}</span>
        },
        { field: 'name', headerName: 'Tên Tài khoản', width: 'min-w-[300px]' },
        { field: 'category', headerName: 'Tính chất', width: 'w-40' },
        { field: 'description', headerName: 'Diễn giải', width: 'flex-1' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined icon-md text-blue-600">account_tree</span>
                    <span className="font-bold text-slate-800 dark:text-white">Hệ thống Tài khoản</span>
                    <span className="badge badge-neutral">{data.length} TK</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowImport(true)}
                        className="form-button-secondary flex items-center gap-1.5 text-sm"
                    >
                        <span className="material-symbols-outlined icon-sm">upload</span>
                        Nhập Excel
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Làm mới"
                    >
                        <span className="material-symbols-outlined icon-md text-slate-600 dark:text-slate-400">refresh</span>
                    </button>
                </div>
            </div>

            {/* Table */}
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

            {/* Import Modal */}
            {showImport && (
                <ExcelImportModal
                    title="Nhập Hệ thống Tài khoản"
                    columns={IMPORT_COLUMNS}
                    onClose={() => setShowImport(false)}
                    onImport={handleImport}
                    validate={validateAccount}
                    templateFileName="he_thong_tai_khoan"
                    description="Nhập danh sách tài khoản từ file Excel. Các tài khoản đã tồn tại sẽ được cập nhật."
                />
            )}
        </div>
    );
};

export default ChartOfAccounts;
