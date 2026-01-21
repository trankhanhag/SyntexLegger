import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { assetService, hcsnService } from '../api';
import { type RibbonAction } from './Ribbon';
import { formatMonthVN, toInputDateValue, toInputMonthValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import { DateInput } from './DateInput';

// --- TYPES ---
interface AssetModuleProps {
    subView?: string;
    onCloseModal?: () => void;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
}

// --- MAIN COMPONENT ---
export const AssetModule: React.FC<AssetModuleProps> = ({ subView = 'asset_fixed_list', printSignal = 0, onSetHeader }) => {
    // Data State
    const [assets, setAssets] = useState<any[]>([]); // Fixed Assets
    const [infraAssets, setInfraAssets] = useState<any[]>([]); // Infrastructure
    const [investments, setInvestments] = useState<any[]>([]); // Investments
    const [ccdc, setCcdc] = useState<any[]>([]); // CCDC (Legacy/Support)
    const [inventory, setInventory] = useState<any[]>([]); // Inventory Records
    const [fundSources, setFundSources] = useState<any[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // Modals Control
    const [modalMode, setModalMode] = useState<'create_fixed' | 'create_infra' | 'create_invest' | 'depreciation' | 'decrease' | 'maintenance' | 'condition' | 'transfer' | 'revaluation' | 'create_inventory' | 'inventory_detail' | 'view_card' | null>(null);
    const [editingItem, setEditingItem] = useState<any>(null); // Track item being edited


    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

    // --- COLUMNS DEFINITIONS ---
    const fixedAssetColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã TSCĐ', width: 'w-24', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên Tài sản', width: 'min-w-[200px]' },
        { field: 'category', headerName: 'Loại', width: 'w-24' },
        { field: 'fund_source_name', headerName: 'Nguồn vốn', width: 'w-32', renderCell: (v: string) => <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-bold">{v}</span> },
        { field: 'start_date', headerName: 'Ngày ghi tăng', width: 'w-28', align: 'center', type: 'date' },
        { field: 'original_value', headerName: 'Nguyên giá', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'accumulated_depreciation', headerName: 'Hao mòn LK', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-red-500">{formatNumber(v)}</span> },
        { field: 'net_value', headerName: 'Giá trị còn lại', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
        { field: 'dept', headerName: 'Bộ phận', width: 'w-32' },
        { field: 'status', headerName: 'Trạng thái', width: 'w-24', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold ${v === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v}</span> },
    ];

    const infraColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Hạ tầng', width: 'w-24', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên Tài sản Hạ tầng', width: 'min-w-[200px]' },
        { field: 'category', headerName: 'Loại hình', width: 'w-32' },
        { field: 'fund_source_name', headerName: 'Nguồn vốn', width: 'w-32', renderCell: (v: string) => <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-bold">{v}</span> },
        { field: 'condition', headerName: 'Tình trạng', width: 'w-32', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold ${v === 'GOOD' ? 'bg-green-100 text-green-700' : v === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{v || 'N/A'}</span> },
        { field: 'original_value', headerName: 'Nguyên giá', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'last_maintenance_date', headerName: 'Bảo trì lần cuối', width: 'w-32', align: 'center', type: 'date' },
        { field: 'maintenance_cost', headerName: 'Chi phí bảo trì', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-orange-600">{formatNumber(v)}</span> },
    ];

    const investColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Khoản ĐT', width: 'w-24', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên khoản đầu tư', width: 'min-w-[200px]' },
        { field: 'type', headerName: 'Hình thức', width: 'w-32' },
        { field: 'investee_name', headerName: 'Đơn vị nhận đầu tư', width: 'w-48' },
        { field: 'investment_amount', headerName: 'Giá trị đầu tư', type: 'number', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{formatNumber(v)}</span> },
        { field: 'ownership_percentage', headerName: 'Tỷ lệ sở hữu', width: 'w-24', align: 'center', renderCell: (v: number) => <span>{v}%</span> },
        { field: 'investment_date', headerName: 'Ngày đầu tư', width: 'w-32', align: 'center', type: 'date' },
        { field: 'income_received', headerName: 'Thu nhập lũy kế', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span> },
    ];

    const ccdcColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã CCDC', width: 'w-24', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên Công cụ', width: 'min-w-[200px]' },
        { field: 'cost', headerName: 'Giá trị', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-teal-600">{formatNumber(v)}</span> },
    ];

    const inventoryColumns: ColumnDef[] = [
        { field: 'inventory_no', headerName: 'Số phiếu', width: 'w-32', fontClass: 'font-bold' },
        { field: 'inventory_date', headerName: 'Ngày kiểm kê', width: 'w-32', align: 'center', type: 'date' },
        { field: 'department', headerName: 'Bộ phận', width: 'w-48' },
        { field: 'inventory_type', headerName: 'Loại kiểm kê', width: 'w-32', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold bg-blue-100 text-blue-700`}>{v}</span> },
        { field: 'status', headerName: 'Trạng thái', width: 'w-32', renderCell: (v: string) => <span className={`text-xs px-2 py-1 rounded font-bold ${v === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v}</span> },
        { field: 'notes', headerName: 'Ghi chú', width: 'min-w-[200px]' },
    ];

    // --- LOGIC ---
    useEffect(() => {
        fetchData();
        fetchFundSources();
    }, []);

    useEffect(() => {
        if (printSignal > 0) window.print();
    }, [printSignal]);

    // Handle SubView Changes -> Modal Triggers
    useEffect(() => {
        if (!subView) return;

        switch (subView) {
            case 'asset_fixed_increase': setModalMode('create_fixed'); setEditingItem(null); break;
            case 'asset_fixed_decrease': setModalMode('decrease'); break;
            case 'asset_depreciation': setModalMode('depreciation'); break;
            case 'asset_transfer': setModalMode('transfer'); break;
            case 'asset_revaluation': setModalMode('revaluation'); break;

            case 'infra_register': setModalMode('create_infra'); setEditingItem(null); break;
            case 'infra_maintenance': setModalMode('maintenance'); break;
            case 'infra_condition': setModalMode('condition'); break;

            case 'invest_list': setModalMode(null); break; // Default to list

            default: setModalMode(null); break;
        }
    }, [subView]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [fixedRes, infraRes, investRes, ccdcRes, inventoryRecordsRes] = await Promise.all([
                assetService.getFixedAssets(),
                assetService.getInfrastructure(),
                assetService.getInvestments(),
                assetService.getCCDC(), // Keep for leadcy/utility support
                assetService.getInventoryRecords()
            ]);

            setAssets(fixedRes.data || []);
            setInfraAssets(infraRes.data || []);
            setInvestments(investRes.data || []);
            setCcdc(ccdcRes.data || []);
            setInventory(inventoryRecordsRes.data || []);
        } catch (err) {
            console.error("Failed to fetch asset data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFundSources = async () => {
        try {
            const res = await hcsnService.getFundSources();
            const d = res.data;
            setFundSources(Array.isArray(d) ? d : (d?.data || []));
        } catch (err) {
            console.error(err);
        }
    }

    const getCurrentList = () => {
        if (subView.startsWith('infra')) return infraAssets;
        if (subView.startsWith('invest')) return investments;
        if (subView === 'ccdc') return ccdc; // Support legacy CCDC view
        if (subView === 'asset_inventory') return inventory;
        return assets; // Default to Fixed Assets
    };

    const getCurrentColumns = () => {
        if (subView.startsWith('infra')) return infraColumns;
        if (subView.startsWith('invest')) return investColumns;
        if (subView === 'ccdc') return ccdcColumns;
        if (subView === 'asset_inventory') return inventoryColumns;
        return fixedAssetColumns;
    };

    const getTitleAndIcon = () => {
        if (subView.startsWith('infra')) return { title: 'Quản lý Tài sản Kết cấu Hạ tầng', icon: 'location_city' };
        if (subView.startsWith('invest')) return { title: 'Quản lý Đầu tư Dài hạn', icon: 'account_balance' };
        if (subView === 'ccdc') return { title: 'Quản lý Công cụ dụng cụ', icon: 'home_repair_service' };
        if (subView === 'asset_inventory') return { title: 'Kiểm kê Tài sản', icon: 'inventory' };
        return { title: 'Quản lý Tài sản Cố định (TSCĐ)', icon: 'domain' };
    };

    // Header Actions
    useEffect(() => {
        if (onSetHeader) {
            const { title, icon } = getTitleAndIcon();
            const actions: RibbonAction[] = [];

            // Context-based Actions
            if (subView.startsWith('asset_fixed')) {
                actions.push({ label: 'Ghi tăng', icon: 'add_business', onClick: () => setModalMode('create_fixed'), primary: true });
                actions.push({ label: 'Tính khấu hao', icon: 'calculate', onClick: () => setModalMode('depreciation') });
                actions.push({ label: 'Ghi giảm', icon: 'remove_circle', onClick: () => setModalMode('decrease') });
            } else if (subView.startsWith('infra')) {
                actions.push({ label: 'Ghi nhận mới', icon: 'add_location', onClick: () => setModalMode('create_infra'), primary: true });
                actions.push({ label: 'Bảo trì', icon: 'build', onClick: () => setModalMode('maintenance') });
                actions.push({ label: 'Đánh giá', icon: 'health_and_safety', onClick: () => setModalMode('condition') });
            } else if (subView.startsWith('invest')) {
                actions.push({ label: 'Đầu tư mới', icon: 'payments', onClick: () => setModalMode('create_invest'), primary: true });
            } else if (subView === 'asset_inventory') {
                actions.push({ label: 'Tạo phiếu kiểm kê', icon: 'post_add', onClick: () => setModalMode('create_inventory'), primary: true });
            }

            actions.push({ label: 'Làm mới', icon: 'refresh', onClick: fetchData });
            actions.push({ label: 'In danh sách', icon: 'print', onClick: () => window.print() });

            if (selectedRow) {
                // Edit Logic
                if (subView === 'asset_fixed_list' || subView.startsWith('asset_fixed')) {
                    actions.push({
                        label: 'Sửa hồ sơ', icon: 'edit',
                        onClick: () => { setEditingItem(selectedRow); setModalMode('create_fixed'); }
                    });
                } else if (subView.startsWith('infra')) {
                    actions.push({
                        label: 'Sửa thông tin', icon: 'edit',
                        onClick: () => { setEditingItem(selectedRow); setModalMode('create_infra'); }
                    });
                } else if (subView.startsWith('invest')) {
                    actions.push({
                        label: 'Sửa đầu tư', icon: 'edit',
                        onClick: () => { setEditingItem(selectedRow); setModalMode('create_invest'); }
                    });
                }

                actions.push({ label: 'Chi tiết', icon: 'visibility', onClick: handleViewSelected });
            }

            onSetHeader({
                title,
                icon,
                actions,
                onDelete: handleDeleteSelected
            });
        }
    }, [subView, onSetHeader, selectedRow]);

    const handleViewSelected = () => {
        if (!selectedRow) return;
        if (subView === 'asset_inventory') {
            setModalMode('inventory_detail');
        } else if (subView.startsWith('asset_fixed')) {
            setModalMode('view_card');
        } else {
            // Default view logic
            alert(`Xem chi tiết: ${selectedRow.name || selectedRow.code}`);
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedRow.name}?`)) return;

        try {
            if (subView.startsWith('infra')) {
                // If API supports delete: await assetService.deleteInfrastructure(selectedRow.id);
                alert("Chức năng xóa hạ tầng đang phát triển");
            } else if (subView.startsWith('invest')) {
                // If API supports delete: await assetService.deleteInvestment(selectedRow.id);
                alert("Chức năng xóa đầu tư đang phát triển");
            } else {
                await assetService.deleteFixedAsset(selectedRow.id, { reason: 'Xóa trực tiếp', approval_no: 'AUTO', decrease_date: toInputDateValue() });
            }
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    // --- RENDER ---
    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold animate-pulse">Đang tải dữ liệu HCSN...</p>
                    </div>
                ) : (
                    <SmartTable
                        data={getCurrentList()}
                        columns={getCurrentColumns()}
                        keyField="id"
                        onSelectionChange={setSelectedRow}
                        onRowClick={(row) => setSelectedRow(row)}
                        selectedRow={selectedRow}
                        minRows={15}
                    />
                )}
            </div>

            {/* MODALS */}
            {modalMode === 'create_fixed' && (
                <FixedAssetModal onClose={() => { setModalMode(null); setEditingItem(null); }} onRefresh={fetchData} fundSources={fundSources} initialData={editingItem} />
            )}
            {modalMode === 'create_infra' && (
                <InfrastructureModal onClose={() => { setModalMode(null); setEditingItem(null); }} onRefresh={fetchData} fundSources={fundSources} initialData={editingItem} />
            )}
            {modalMode === 'create_invest' && (
                <InvestmentModal onClose={() => { setModalMode(null); setEditingItem(null); }} onRefresh={fetchData} fundSources={fundSources} initialData={editingItem} />
            )}
            {modalMode === 'depreciation' && (
                <DepreciationModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'decrease' && (
                <DisposeModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'maintenance' && (
                <MaintenanceModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={infraAssets} />
            )}
            {modalMode === 'condition' && (
                <ConditionModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={infraAssets} />
            )}
            {modalMode === 'transfer' && (
                <TransferAssetModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'revaluation' && (
                <RevaluationModal onClose={() => setModalMode(null)} onRefresh={fetchData} assets={assets} />
            )}
            {modalMode === 'create_inventory' && (
                <CreateInventoryModal onClose={() => setModalMode(null)} onRefresh={fetchData} />
            )}
            {modalMode === 'inventory_detail' && selectedRow && (
                <InventoryDetailModal inventory={selectedRow} onClose={() => setModalMode(null)} assets={assets} />
            )}
            {modalMode === 'view_card' && selectedRow && (
                <AssetCardModal asset={selectedRow} onClose={() => setModalMode(null)} />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS (MODALS) ---

const FixedAssetModal = ({ onClose, onRefresh, fundSources, initialData }: any) => {
    const [data, setData] = useState(initialData || {
        code: '', name: '', category: 'TANGIBLE', original_value: 0, useful_life: 5,
        fund_source_id: '', department: 'Phòng Hành chính', purchase_date: toInputDateValue()
    });

    const handleSave = async () => {
        try {
            if (initialData?.id) {
                await assetService.updateFixedAsset(initialData.id, data);
            } else {
                await assetService.createFixedAsset(data);
            }
            alert(initialData ? "Cập nhật TSCĐ thành công!" : "Ghi tăng TSCĐ thành công!");
            onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi lưu"); console.error(e); }
    };

    return (
        <FormModal title={initialData ? "Sửa Hồ sơ TSCĐ" : "Ghi tăng Tài sản Cố định (TT 24/2024)"} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Mã TSCĐ</label>
                        <input className="form-input" value={data.code} onChange={e => setData({ ...data, code: e.target.value })} placeholder="TSCĐ..." />
                    </div>
                    <div>
                        <label className="form-label">Tên Tài sản</label>
                        <input className="form-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Loại TSCĐ</label>
                        <select className="form-input" value={data.category} onChange={e => setData({ ...data, category: e.target.value })}>
                            <option value="TANGIBLE">Hữu hình (211)</option>
                            <option value="INTANGIBLE">Vô hình (213)</option>
                            <option value="LEASED">Thuê tài chính (212)</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Nguyên giá (VNĐ)</label>
                        <input type="number" className="form-input font-bold text-right" value={data.original_value} onChange={e => setData({ ...data, original_value: Number(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="form-label">Năm sử dụng</label>
                            <input type="number" className="form-input" value={data.useful_life} onChange={e => setData({ ...data, useful_life: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="form-label">Ngày ghi tăng</label>
                            <DateInput className="form-input" value={data.purchase_date} onChange={v => setData({ ...data, purchase_date: v })} />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Nguồn kinh phí (Bắt buộc)</label>
                        <select className="form-input border-purple-300 bg-purple-50" value={data.fund_source_id} onChange={e => setData({ ...data, fund_source_id: e.target.value })}>
                            <option value="">-- Chọn nguồn vốn hình thành --</option>
                            {fundSources.map((fs: any) => (
                                <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} className="form-button-primary">Lưu TSCĐ</button>
            </div>
        </FormModal>
    );
};

const InfrastructureModal = ({ onClose, onRefresh, fundSources, initialData }: any) => {
    const [data, setData] = useState(initialData || {
        code: '', name: '', category: 'ROAD', original_value: 0,
        fund_source_id: '', location: '', construction_year: new Date().getFullYear(), condition: 'GOOD'
    });

    const handleSave = async () => {
        try {
            if (initialData?.id) {
                await assetService.updateInfrastructure(initialData.id, data);
            } else {
                await assetService.createInfrastructure(data);
            }
            alert(initialData ? "Cập nhật hạ tầng thành công!" : "Ghi nhận Hạ tầng thành công!");
            onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi lưu"); console.error(e); }
    };

    return (
        <FormModal title={initialData ? "Sửa Hồ sơ Hạ tầng" : "Ghi nhận Tài sản Hạ tầng (TT 24/2024)"} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div><label className="form-label">Mã Hạ tầng</label><input className="form-input" value={data.code} onChange={e => setData({ ...data, code: e.target.value })} /></div>
                    <div><label className="form-label">Tên Hạ tầng</label><input className="form-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
                    <div>
                        <label className="form-label">Loại công trình</label>
                        <select className="form-input" value={data.category} onChange={e => setData({ ...data, category: e.target.value })}>
                            <option value="ROAD">Giao thông (Đường, Cầu)</option>
                            <option value="IRRIGATION">Thủy lợi (Đê, Kênh)</option>
                            <option value="WATER">Cấp thoát nước</option>
                            <option value="OTHER">Hạ tầng khác</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <div><label className="form-label">Nguyên giá</label><input type="number" className="form-input" value={data.original_value} onChange={e => setData({ ...data, original_value: Number(e.target.value) })} /></div>
                    <div><label className="form-label">Năm xây dựng</label><input type="number" className="form-input" value={data.construction_year} onChange={e => setData({ ...data, construction_year: Number(e.target.value) })} /></div>
                    <div>
                        <label className="form-label">Nguồn vốn</label>
                        <select className="form-input" value={data.fund_source_id} onChange={e => setData({ ...data, fund_source_id: e.target.value })}>
                            <option value="">-- Chọn nguồn --</option>
                            {fundSources.map((fs: any) => (
                                <option key={fs.id} value={fs.id}>{fs.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} className="form-button-primary">Lưu Hạ tầng</button>
            </div>
        </FormModal>
    );
};

const InvestmentModal = ({ onClose, onRefresh, fundSources, initialData }: any) => {
    const [data, setData] = useState(initialData || {
        code: '', name: '', type: 'SUBSIDIARY', investment_amount: 0,
        fund_source_id: '', investee_name: '', ownership_percentage: 0, investment_date: toInputDateValue()
    });

    const handleSave = async () => {
        try {
            if (initialData?.id) {
                await assetService.updateInvestment(initialData.id, data);
            } else {
                await assetService.createInvestment(data);
            }
            alert(initialData ? "Cập nhật khoản đầu tư thành công!" : "Tạo khoản đầu tư thành công!");
            onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi lưu"); console.error(e); }
    };

    return (
        <FormModal title={initialData ? "Sửa khoản ĐT Dài hạn" : "Đầu tư Dài hạn"} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div><label className="form-label">Mã khoản ĐT</label><input className="form-input" value={data.code} onChange={e => setData({ ...data, code: e.target.value })} /></div>
                    <div><label className="form-label">Tên khoản đầu tư</label><input className="form-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
                    <div><label className="form-label">Đơn vị nhận ĐT</label><input className="form-input" value={data.investee_name} onChange={e => setData({ ...data, investee_name: e.target.value })} /></div>
                </div>
                <div className="space-y-4">
                    <div><label className="form-label">Số tiền đầu tư</label><input type="number" className="form-input font-bold text-blue-600" value={data.investment_amount} onChange={e => setData({ ...data, investment_amount: Number(e.target.value) })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="form-label">Tỷ lệ sở hữu (%)</label><input type="number" className="form-input" value={data.ownership_percentage} onChange={e => setData({ ...data, ownership_percentage: Number(e.target.value) })} /></div>
                        <div><label className="form-label">Ngày đầu tư</label><DateInput className="form-input" value={data.investment_date} onChange={v => setData({ ...data, investment_date: v })} /></div>
                    </div>
                    <div>
                        <label className="form-label">Nguồn vốn</label>
                        <select className="form-input" value={data.fund_source_id} onChange={e => setData({ ...data, fund_source_id: e.target.value })}>
                            <option value="">-- Chọn nguồn --</option>
                            {fundSources.map((fs: any) => (
                                <option key={fs.id} value={fs.id}>{fs.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} className="form-button-primary">Lưu Đầu tư</button>
            </div>
        </FormModal>
    );
};

const DepreciationModal = ({ onClose, onRefresh, assets: _assets }: any) => {
    const handleRun = async () => {
        await assetService.calculateDepreciation({ period: toInputMonthValue() });
        alert("Đã tính khấu hao xong!");
        onRefresh(); onClose();
    };
    return (
        <FormModal title="Tính Khấu hao TSCĐ" onClose={onClose}>
            <div className="p-4 text-center">
                <p>Bạn có chắc muốn tính khấu hao cho tháng {formatMonthVN(toInputMonthValue())}?</p>
                <button onClick={handleRun} className="form-button-primary mt-4">Xác nhận</button>
            </div>
        </FormModal>
    );
};


const TransferAssetModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ asset_id: '', to_department: '', to_location: '', reason: '', approval_no: '', transfer_date: toInputDateValue() });

    const handleSave = async () => {
        try {
            await assetService.transferAsset(data);
            alert("Đã điều chuyển tài sản!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi điều chuyển"); console.error(e); }
    };

    return <FormModal title="Điều chuyển Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Tài sản</label>
                <select className="form-input" value={data.asset_id} onChange={e => setData({ ...data, asset_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Bộ phận mới</label><input className="form-input" value={data.to_department} onChange={e => setData({ ...data, to_department: e.target.value })} placeholder="Phòng..." /></div>
                <div><label className="form-label">Vị trí mới</label><input className="form-input" value={data.to_location} onChange={e => setData({ ...data, to_location: e.target.value })} placeholder="Tầng/Khu..." /></div>
            </div>
            <div><label className="form-label">Lý do</label><input className="form-input" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số quyết định</label><input className="form-input" value={data.approval_no} onChange={e => setData({ ...data, approval_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày điều chuyển</label><DateInput className="form-input" value={data.transfer_date} onChange={v => setData({ ...data, transfer_date: v })} /></div>
            </div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Điều chuyển</button>
        </div>
    </FormModal>;
};

const RevaluationModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ asset_id: '', new_value: 0, reason: '', approval_no: '', revaluation_date: toInputDateValue() });

    // Update new_value default when asset changes
    useEffect(() => {
        if (data.asset_id) {
            const asset = assets.find((a: any) => a.id === data.asset_id);
            if (asset) setData(d => ({ ...d, new_value: asset.original_value }));
        }
    }, [data.asset_id, assets]);

    const handleSave = async () => {
        try {
            await assetService.revaluateAsset(data.asset_id, data);
            alert("Đã đánh giá lại tài sản!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi đánh giá lại"); console.error(e); }
    };

    return <FormModal title="Đánh giá lại Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Tài sản</label>
                <select className="form-input" value={data.asset_id} onChange={e => setData({ ...data, asset_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
            </div>
            <div><label className="form-label">Nguyên giá mới</label><input type="number" className="form-input text-blue-600 font-bold" value={data.new_value} onChange={e => setData({ ...data, new_value: Number(e.target.value) })} /></div>
            <div><label className="form-label">Lý do</label><input className="form-input" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số biên bản/QĐ</label><input className="form-input" value={data.approval_no} onChange={e => setData({ ...data, approval_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày đánh giá</label><DateInput className="form-input" value={data.revaluation_date} onChange={v => setData({ ...data, revaluation_date: v })} /></div>
            </div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Xác nhận</button>
        </div>
    </FormModal>;
};

const CreateInventoryModal = ({ onClose, onRefresh }: any) => {
    const [data, setData] = useState({
        inventory_no: `KK-${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
        inventory_date: toInputDateValue(),
        fiscal_year: new Date().getFullYear(),
        inventory_type: 'PERIODIC',
        department: '',
        notes: ''
    });

    const handleSave = async () => {
        try {
            await assetService.createInventory(data);
            alert("Đã tạo phiếu kiểm kê!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi tạo"); console.error(e); }
    };

    return <FormModal title="Tạo phiếu Kiểm kê Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số phiếu</label><input className="form-input" value={data.inventory_no} onChange={e => setData({ ...data, inventory_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày kiểm kê</label><DateInput className="form-input" value={data.inventory_date} onChange={v => setData({ ...data, inventory_date: v })} /></div>
            </div>
            <div>
                <label className="form-label">Loại kiểm kê</label>
                <select className="form-input" value={data.inventory_type} onChange={e => setData({ ...data, inventory_type: e.target.value })}>
                    <option value="PERIODIC">Định kỳ (Cuối năm)</option>
                    <option value="HANDOVER">Bàn giao</option>
                    <option value="SUDDEN">Đột xuất</option>
                </select>
            </div>
            <div><label className="form-label">Bộ phận (Tùy chọn)</label><input className="form-input" value={data.department} onChange={e => setData({ ...data, department: e.target.value })} placeholder="Để trống nếu kiểm kê toàn bộ" /></div>
            <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={3} value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} /></div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Tạo phiếu</button>
        </div>
    </FormModal>
};

const InventoryDetailModal = ({ inventory, onClose, assets }: any) => {
    const [report, setReport] = useState<any>(null);
    const [newItem, setNewItem] = useState({ asset_id: '', actual_quantity: 1, actual_condition: 'GOOD', actual_location: '', reason: '', notes: '' });

    useEffect(() => {
        loadReport();
    }, [inventory.id]);

    const loadReport = async () => {
        const res = await assetService.getInventoryReport(inventory.id);
        setReport(res.data);
    };

    const handleAddItem = async () => {
        if (!newItem.asset_id) return alert("Chọn tài sản!");
        const asset = assets.find((a: any) => a.id === newItem.asset_id);
        const book_value = asset ? asset.net_value : 0;

        try {
            await assetService.addInventoryItem(inventory.id, {
                ...newItem,
                book_quantity: 1, // Default assumption for fixed assets
                book_value: book_value
            });
            setNewItem({ asset_id: '', actual_quantity: 1, actual_condition: 'GOOD', actual_location: '', reason: '', notes: '' });
            loadReport();
        } catch (e) { console.error(e); alert("Lỗi thêm chi tiết"); }
    };

    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-slate-700 rounded-t-lg">
                <h3 className="text-lg font-bold">Chi tiết Kiểm kê: {inventory.inventory_no}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sticky top-0 bg-white dark:bg-slate-800 z-10 pb-4 border-b">
                    <div className="md:col-span-1 border-r pr-4">
                        <label className="form-label">Chọn Tài sản</label>
                        <select className="form-input" value={newItem.asset_id} onChange={e => {
                            const asset = assets.find((a: any) => a.id === e.target.value);
                            setNewItem({ ...newItem, asset_id: e.target.value, actual_location: asset?.location || '' });
                        }}>
                            <option value="">-- Quét mã hoặc Chọn --</option>
                            {assets.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1 border-r pr-4 space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1"><label className="form-label">Tình trạng</label>
                                <select className="form-input" value={newItem.actual_condition} onChange={e => setNewItem({ ...newItem, actual_condition: e.target.value })}>
                                    <option value="GOOD">Tốt 100%</option>
                                    <option value="DAMAGED">Hư hỏng</option>
                                    <option value="MISSING">Mất mát</option>
                                    <option value="DISPOSED">Đề nghị thanh lý</option>
                                </select></div>
                            <div className="w-20"><label className="form-label">SL TT</label>
                                <input type="number" className="form-input" value={newItem.actual_quantity} onChange={e => setNewItem({ ...newItem, actual_quantity: Number(e.target.value) })} /></div>
                        </div>
                        <div><label className="form-label">Vị trí thực tế</label><input className="form-input" value={newItem.actual_location} onChange={e => setNewItem({ ...newItem, actual_location: e.target.value })} /></div>
                    </div>
                    <div className="md:col-span-1 flex flex-col justify-end">
                        <input className="form-input mb-2" placeholder="Ghi chú chênh lệch..." value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} />
                        <button onClick={handleAddItem} className="form-button-primary w-full">Ghi nhận</button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="font-bold border-l-4 border-blue-500 pl-2">Danh sách đã kiểm ({report?.items?.length || 0})</h4>
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-100 dark:bg-slate-700 text-left">
                            <tr>
                                <th className="p-2 border">Mã TS</th>
                                <th className="p-2 border">Tên TS</th>
                                <th className="p-2 border">Sổ sách</th>
                                <th className="p-2 border">Thực tế</th>
                                <th className="p-2 border">Chênh lệch</th>
                                <th className="p-2 border">HT Thực tế</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report?.items?.map((item: any) => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 border font-bold">{item.asset_code}</td>
                                    <td className="p-2 border">{item.asset_name}</td>
                                    <td className="p-2 border text-center">{item.book_quantity}</td>
                                    <td className="p-2 border text-center font-bold">{item.actual_quantity}</td>
                                    <td className={`p-2 border text-center font-bold ${item.diff_quantity !== 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {item.diff_quantity > 0 ? `+${item.diff_quantity}` : item.diff_quantity}
                                    </td>
                                    <td className="p-2 border">{item.actual_condition}</td>
                                </tr>
                            ))}
                            {report?.items?.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">Chưa có dữ liệu kiểm kê</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-slate-700 rounded-b-lg flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded border bg-white hover:bg-gray-100">Đóng</button>
                <button className="form-button-primary" onClick={() => alert("Chức năng in báo cáo đang cập nhật")}>In Báo cáo</button>
            </div>
        </div>
    </div>
}

const AssetCardModal = ({ asset, onClose }: any) => {
    // Only fetch history
    const [history, setHistory] = useState([]);
    useEffect(() => {
        assetService.getAssetCard(asset.id).then((res: any) => setHistory(res.data));
    }, [asset.id]);

    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold">Thẻ Tài sản: {asset.name} ({asset.code})</h3>
                <button onClick={onClose} className="text-2xl">&times;</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
                <table className="w-full text-sm border">
                    <thead className="bg-gray-100 font-bold">
                        <tr>
                            <th className="p-2 border">Năm</th>
                            <th className="p-2 border">Số thẻ</th>
                            <th className="p-2 border text-right">Giá trị đầu</th>
                            <th className="p-2 border text-right">Khấu hao năm</th>
                            <th className="p-2 border text-right">Giá trị còn lại</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((h: any) => (
                            <tr key={h.id}>
                                <td className="p-2 border text-center">{h.fiscal_year}</td>
                                <td className="p-2 border">{h.card_no}</td>
                                <td className="p-2 border text-right">{new Intl.NumberFormat('vi-VN').format(h.opening_value)}</td>
                                <td className="p-2 border text-right">{new Intl.NumberFormat('vi-VN').format(h.depreciation_current_year)}</td>
                                <td className="p-2 border text-right font-bold">{new Intl.NumberFormat('vi-VN').format(h.closing_net_value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
}


const MaintenanceModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ infra_id: '', maintenance_type: 'ROUTINE', cost: 0, date: toInputDateValue(), note: '' });

    const handleSave = async () => {
        try {
            await assetService.recordMaintenance(data);
            alert("Đã ghi nhận bảo trì!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi"); }
    };

    return <FormModal title="Bảo trì Hạ tầng" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Hạ tầng</label>
                <select className="form-input" value={data.infra_id} onChange={e => setData({ ...data, infra_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
            <div><label className="form-label">Chi phí</label><input type="number" className="form-input" value={data.cost} onChange={e => setData({ ...data, cost: Number(e.target.value) })} /></div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Ghi nhận</button>
        </div>
    </FormModal>;
}

const ConditionModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ id: '', condition: 'GOOD', note: '', assessment_date: toInputDateValue() });

    const handleSave = async () => {
        try {
            await assetService.updateCondition(data.id, data);
            alert("Đã cập nhật tình trạng!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi"); }
    };

    return <FormModal title="Đánh giá Tình trạng Hạ tầng" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Hạ tầng</label>
                <select className="form-input" value={data.id} onChange={e => setData({ ...data, id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
            <div>
                <label className="form-label">Tình trạng</label>
                <select className="form-input" value={data.condition} onChange={e => setData({ ...data, condition: e.target.value })}>
                    <option value="GOOD">Tốt</option>
                    <option value="AVERAGE">Trung bình</option>
                    <option value="POOR">Kém</option>
                    <option value="CRITICAL">Hư hỏng nặng</option>
                </select>
            </div>
            <button onClick={handleSave} className="form-button-primary w-full mt-4">Cập nhật</button>
        </div>
    </FormModal>;
}

const DisposeModal = ({ onClose, onRefresh, assets }: any) => {
    const [data, setData] = useState({ id: '', reason: '', approval_no: '', decrease_date: toInputDateValue(), disposal_value: 0 });

    const handleSave = async () => {
        if (!confirm('Hành động này sẽ ghi giảm và KHÔNG thể hoàn tác. Tiếp tục?')) return;
        try {
            await assetService.deleteFixedAsset(data.id, data);
            alert("Đã ghi giảm TSCĐ thành công!"); onRefresh(); onClose();
        } catch (e) { alert("Lỗi khi ghi giảm"); console.error(e); }
    };

    return <FormModal title="Ghi giảm/Thanh lý Tài sản" onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="form-label">Chọn Tài sản</label>
                <select className="form-input" value={data.id} onChange={e => setData({ ...data, id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {assets.filter((a: any) => a.status === 'ACTIVE').map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
            </div>
            <div><label className="form-label">Lý do ghi giảm</label><input className="form-input" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} placeholder="Vd: Hư hỏng không thể sửa chữa, Thanh lý..." /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Số quyết định</label><input className="form-input" value={data.approval_no} onChange={e => setData({ ...data, approval_no: e.target.value })} /></div>
                <div><label className="form-label">Ngày ghi giảm</label><DateInput className="form-input" value={data.decrease_date} onChange={v => setData({ ...data, decrease_date: v })} /></div>
            </div>
            <div><label className="form-label">Giá trị thu hồi (nếu có)</label><input type="number" className="form-input" value={data.disposal_value} onChange={e => setData({ ...data, disposal_value: Number(e.target.value) })} /></div>
            <button onClick={handleSave} className="form-button-primary bg-red-600 hover:bg-red-700 w-full mt-4">Xác nhận Ghi giảm</button>
        </div>
    </FormModal>;
};
