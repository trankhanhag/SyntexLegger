/**
 * Products Component
 * SyntexLegger - Quản lý Sản phẩm/Vật tư với chức năng nhập Excel
 */

import React, { useRef } from 'react';
import { SmartTable, type ColumnDef } from '../SmartTable';
import { masterDataService } from '../../api';
import { ExcelImportModal, type ColumnDef as ImportColumnDef } from '../ExcelImportModal';
import { formatNumber } from '../../utils/format';
import logger from '../../utils/logger';

interface ProductsProps {
    onSelectionChange?: (v: any) => void;
    refreshSignal?: number;
    importSignal?: number;
}

// Column definitions for Excel import
const IMPORT_COLUMNS: ImportColumnDef[] = [
    {
        key: 'product_code',
        label: 'Mã sản phẩm',
        required: true,
        aliases: ['ma san pham', 'ma sp', 'product_code', 'code', 'mã vật tư', 'ma vat tu'],
        width: '15',
    },
    {
        key: 'product_name',
        label: 'Tên sản phẩm',
        required: true,
        aliases: ['ten san pham', 'ten sp', 'product_name', 'name', 'tên vật tư', 'ten vat tu'],
        width: '30',
    },
    {
        key: 'unit',
        label: 'Đơn vị tính',
        required: false,
        aliases: ['don vi tinh', 'dvt', 'unit'],
        width: '10',
    },
    {
        key: 'category',
        label: 'Nhóm/Loại',
        required: false,
        aliases: ['nhom', 'loai', 'category', 'type', 'group'],
        width: '15',
    },
    {
        key: 'unit_price',
        label: 'Đơn giá',
        required: false,
        type: 'number',
        aliases: ['don gia', 'gia', 'price', 'unit_price'],
        width: '15',
    },
    {
        key: 'tax',
        label: 'Thuế GTGT (%)',
        required: false,
        type: 'number',
        aliases: ['thue', 'vat', 'tax', 'thue gtgt'],
        width: '10',
    },
    {
        key: 'description',
        label: 'Mô tả',
        required: false,
        aliases: ['mo ta', 'ghi chu', 'description', 'note'],
        width: '25',
    },
];

export const Products: React.FC<ProductsProps> = ({
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
            const res = await masterDataService.getProducts();
            setData(res.data.map((p: any) => ({
                id: p.id || p.product_code,
                code: p.product_code,
                name: p.product_name,
                unit: p.unit || 'Cái',
                category: p.category || 'GOODS',
                price: p.unit_price || 0,
                tax: p.tax || 0,
                description: p.description
            })));
        } catch (err) {
            logger.error("Failed to fetch products:", err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [refreshSignal]);

    const handleImport = async (importedData: any[]) => {
        // Transform data to match API format
        const products = importedData.map(row => ({
            product_code: String(row.product_code).trim(),
            product_name: String(row.product_name).trim(),
            unit: row.unit || 'Cái',
            category: row.category || 'GOODS',
            unit_price: parseFloat(row.unit_price) || 0,
            tax: parseFloat(row.tax) || 0,
            description: row.description || null,
        }));

        await masterDataService.saveProducts(products);
        await fetchData(); // Refresh data
    };

    const validateProduct = (row: any, allRows: any[]): string | null => {
        // Check for duplicate codes within import
        const duplicates = allRows.filter(r => r.product_code === row.product_code);
        if (duplicates.length > 1) {
            return `Mã sản phẩm "${row.product_code}" bị trùng trong file`;
        }

        // Validate unit_price is a valid number if provided
        if (row.unit_price !== undefined && row.unit_price !== null && row.unit_price !== '') {
            const price = parseFloat(row.unit_price);
            if (isNaN(price) || price < 0) {
                return `Đơn giá "${row.unit_price}" không hợp lệ`;
            }
        }

        // Validate tax rate if provided
        if (row.tax !== undefined && row.tax !== null && row.tax !== '') {
            const tax = parseFloat(row.tax);
            if (isNaN(tax) || tax < 0 || tax > 100) {
                return `Thuế GTGT "${row.tax}" không hợp lệ (0-100)`;
            }
        }

        return null;
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'GOODS': return 'Hàng hóa';
            case 'MATERIAL': return 'Nguyên vật liệu';
            case 'TOOL': return 'Công cụ dụng cụ';
            case 'PRODUCT': return 'Thành phẩm';
            case 'SERVICE': return 'Dịch vụ';
            default: return category || 'Hàng hóa';
        }
    };

    const getCategoryBadgeClass = (category: string) => {
        switch (category) {
            case 'GOODS': return 'badge-info';
            case 'MATERIAL': return 'badge-warning';
            case 'TOOL': return 'badge-neutral';
            case 'PRODUCT': return 'badge-success';
            case 'SERVICE': return 'badge-posted';
            default: return 'badge-neutral';
        }
    };

    const columns: ColumnDef[] = [
        {
            field: 'code',
            headerName: 'Mã SP',
            width: 'w-28',
            renderCell: (v: string) => <span className="font-bold text-blue-600">{v}</span>
        },
        { field: 'name', headerName: 'Tên sản phẩm/Vật tư', width: 'min-w-[280px]' },
        { field: 'unit', headerName: 'ĐVT', width: 'w-20' },
        {
            field: 'category',
            headerName: 'Nhóm',
            width: 'w-32',
            renderCell: (v: string) => (
                <span className={`badge ${getCategoryBadgeClass(v)}`}>
                    {getCategoryLabel(v)}
                </span>
            )
        },
        {
            field: 'price',
            headerName: 'Đơn giá',
            width: 'w-28',
            align: 'right',
            renderCell: (v: number) => (
                <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatNumber(v || 0)}
                </span>
            )
        },
        {
            field: 'tax',
            headerName: 'VAT',
            width: 'w-16',
            align: 'right',
            renderCell: (v: number) => (
                <span className="text-slate-500">{v || 0}%</span>
            )
        },
        { field: 'description', headerName: 'Mô tả', width: 'flex-1' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined icon-md text-blue-600">inventory_2</span>
                    <span className="font-bold text-slate-800 dark:text-white">Danh mục Sản phẩm/Vật tư</span>
                    <span className="badge badge-neutral">{data.length} sản phẩm</span>
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
                        emptyMessage="Chưa có dữ liệu sản phẩm/vật tư"
                    />
                )}
            </div>

            {/* Import Modal */}
            {showImport && (
                <ExcelImportModal
                    title="Nhập Danh mục Sản phẩm/Vật tư"
                    columns={IMPORT_COLUMNS}
                    onClose={() => setShowImport(false)}
                    onImport={handleImport}
                    validate={validateProduct}
                    templateFileName="danh_muc_san_pham"
                    description="Nhập danh sách sản phẩm/vật tư từ file Excel. Các sản phẩm đã tồn tại sẽ được cập nhật."
                />
            )}
        </div>
    );
};

export default Products;
