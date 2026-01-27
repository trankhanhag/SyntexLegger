/**
 * Partners Component
 * SyntexHCSN - Quản lý Đối tác với chức năng nhập Excel
 */

import React, { useRef } from 'react';
import { SmartTable, type ColumnDef } from '../SmartTable';
import { masterDataService } from '../../api';
import { ExcelImportModal, type ColumnDef as ImportColumnDef } from '../ExcelImportModal';

interface PartnersProps {
    onSelectionChange?: (v: any) => void;
    refreshSignal?: number;
    importSignal?: number;
}

// Column definitions for Excel import
const IMPORT_COLUMNS: ImportColumnDef[] = [
    {
        key: 'partner_code',
        label: 'Mã đối tác',
        required: true,
        aliases: ['ma doi tac', 'ma dt', 'partner_code', 'code', 'mã'],
        width: '15',
    },
    {
        key: 'partner_name',
        label: 'Tên đối tác',
        required: true,
        aliases: ['ten doi tac', 'ten dt', 'partner_name', 'name', 'tên'],
        width: '30',
    },
    {
        key: 'tax_code',
        label: 'Mã số thuế',
        required: false,
        aliases: ['ma so thue', 'mst', 'tax_code', 'taxcode'],
        width: '15',
    },
    {
        key: 'address',
        label: 'Địa chỉ',
        required: false,
        aliases: ['dia chi', 'address'],
        width: '30',
    },
    {
        key: 'phone',
        label: 'Điện thoại',
        required: false,
        aliases: ['dien thoai', 'sdt', 'phone', 'tel'],
        width: '15',
    },
    {
        key: 'email',
        label: 'Email',
        required: false,
        aliases: ['email', 'mail'],
        width: '20',
    },
    {
        key: 'contact_person',
        label: 'Người liên hệ',
        required: false,
        aliases: ['nguoi lien he', 'contact', 'contact_person'],
        width: '20',
    },
    {
        key: 'partner_type',
        label: 'Loại đối tác',
        required: false,
        aliases: ['loai doi tac', 'type', 'partner_type'],
        width: '15',
    },
    {
        key: 'bank_account',
        label: 'Số TK ngân hàng',
        required: false,
        aliases: ['so tk', 'stk', 'bank_account', 'account_no'],
        width: '20',
    },
    {
        key: 'bank_name',
        label: 'Tên ngân hàng',
        required: false,
        aliases: ['ten ngan hang', 'ngan hang', 'bank_name', 'bank'],
        width: '25',
    },
];

export const Partners: React.FC<PartnersProps> = ({
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
            const res = await masterDataService.getPartners();
            setData(res.data.map((p: any) => ({
                id: p.partner_code,
                code: p.partner_code,
                name: p.partner_name,
                taxCode: p.tax_code,
                address: p.address,
                phone: p.phone,
                email: p.email,
                contactPerson: p.contact_person,
                type: p.partner_type || 'CUSTOMER',
                bankAccount: p.bank_account,
                bankName: p.bank_name
            })));
        } catch (err) {
            console.error("Failed to fetch partners:", err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [refreshSignal]);

    const handleImport = async (importedData: any[]) => {
        // Transform data to match API format
        const partners = importedData.map(row => ({
            partner_code: String(row.partner_code).trim(),
            partner_name: String(row.partner_name).trim(),
            tax_code: row.tax_code || null,
            address: row.address || null,
            phone: row.phone || null,
            email: row.email || null,
            contact_person: row.contact_person || null,
            partner_type: row.partner_type || 'CUSTOMER',
            bank_account: row.bank_account || null,
            bank_name: row.bank_name || null,
        }));

        await masterDataService.savePartners(partners);
        await fetchData(); // Refresh data
    };

    const validatePartner = (row: any, allRows: any[]): string | null => {
        // Check for duplicate codes within import
        const duplicates = allRows.filter(r => r.partner_code === row.partner_code);
        if (duplicates.length > 1) {
            return `Mã đối tác "${row.partner_code}" bị trùng trong file`;
        }

        // Validate tax code format (if provided)
        if (row.tax_code) {
            const taxCode = String(row.tax_code).replace(/\D/g, '');
            if (taxCode.length !== 10 && taxCode.length !== 13) {
                return `Mã số thuế "${row.tax_code}" không hợp lệ (phải có 10 hoặc 13 chữ số)`;
            }
        }

        // Validate email format (if provided)
        if (row.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email)) {
                return `Email "${row.email}" không hợp lệ`;
            }
        }

        return null;
    };

    const getPartnerTypeLabel = (type: string) => {
        switch (type) {
            case 'CUSTOMER': return 'Khách hàng';
            case 'SUPPLIER': return 'Nhà cung cấp';
            case 'EMPLOYEE': return 'Nhân viên';
            case 'OTHER': return 'Khác';
            default: return type || 'Khách hàng';
        }
    };

    const getPartnerTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'CUSTOMER': return 'badge-info';
            case 'SUPPLIER': return 'badge-warning';
            case 'EMPLOYEE': return 'badge-success';
            default: return 'badge-neutral';
        }
    };

    const columns: ColumnDef[] = [
        {
            field: 'code',
            headerName: 'Mã đối tác',
            width: 'w-32',
            renderCell: (v: string) => <span className="font-bold text-blue-600">{v}</span>
        },
        { field: 'name', headerName: 'Tên đối tác', width: 'min-w-[250px]' },
        { field: 'taxCode', headerName: 'Mã số thuế', width: 'w-32' },
        {
            field: 'type',
            headerName: 'Loại',
            width: 'w-28',
            renderCell: (v: string) => (
                <span className={`badge ${getPartnerTypeBadgeClass(v)}`}>
                    {getPartnerTypeLabel(v)}
                </span>
            )
        },
        { field: 'phone', headerName: 'Điện thoại', width: 'w-28' },
        { field: 'address', headerName: 'Địa chỉ', width: 'flex-1' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined icon-md text-blue-600">groups</span>
                    <span className="font-bold text-slate-800 dark:text-white">Danh mục Đối tác</span>
                    <span className="badge badge-neutral">{data.length} đối tác</span>
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
                        emptyMessage="Chưa có dữ liệu đối tác"
                    />
                )}
            </div>

            {/* Import Modal */}
            {showImport && (
                <ExcelImportModal
                    title="Nhập Danh mục Đối tác"
                    columns={IMPORT_COLUMNS}
                    onClose={() => setShowImport(false)}
                    onImport={handleImport}
                    validate={validatePartner}
                    templateFileName="danh_muc_doi_tac"
                    description="Nhập danh sách đối tác từ file Excel. Các đối tác đã tồn tại sẽ được cập nhật."
                />
            )}
        </div>
    );
};

export default Partners;
