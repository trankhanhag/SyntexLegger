import React, { useState, useEffect, useCallback } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { dimensionService } from '../api';
import { type RibbonAction } from './Ribbon';
import { FormModal, FormSection, FormGrid, FormField, FormButton, FormActions, FormAlert } from './FormModal';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { useSimplePrint } from '../hooks/usePrintHandler';
import { PivotReportModule } from './PivotReportModule';
import { ExcelImportModal } from './ExcelImportModal';
import { DIMENSION_TEMPLATE } from '../utils/excelTemplates';
import logger from '../utils/logger';

interface DimensionModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (viewId: string) => void;
}

// Helper to normalize view names (dim_list -> list, dim_config -> config, etc.)
const normalizeView = (v: string): string => {
    const viewMap: Record<string, string> = {
        'dim_list': 'list',
        'dim_config': 'config',
        'dim_group': 'group',
        'dim_report': 'report',
        'dimension_overview': 'overview'
    };
    return viewMap[v] || v;
};

export const DimensionModule: React.FC<DimensionModuleProps> = ({ subView = 'list', printSignal = 0, onSetHeader, onNavigate }) => {
    const [view, setView] = useState(normalizeView(subView));
    const [dimTab, setDimTab] = useState(1);
    const [showModal, setShowModal] = useState<string | null>(null);

    const [dimensions, setDimensions] = useState<any[]>([]);
    const [configs, setConfigs] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    const getModuleInfo = () => {
        switch (view) {
            case 'config': return { title: 'Cấu hình Loại TK', icon: 'settings_suggest', desc: 'Thiết lập tham số và thuộc tính cho các chiều thống kê' };
            case 'group': return { title: 'Nhóm Mã thống kê', icon: 'group_work', desc: 'Phân nhóm các mã thống kê để phục vụ báo cáo tổng hợp' };
            case 'report': return { title: 'Báo cáo Đa chiều', icon: 'pivot_table_chart', desc: 'Phân tích số liệu theo nhiều chiều thống kê' };
            default: return { title: 'Danh mục Mã thống kê', icon: 'list', desc: 'Quản lý 5 chiều thống kê tùy chỉnh cho các hạch toán kế toán' };
        }
    };

    const info = getModuleInfo();

    useEffect(() => {
        if (subView) setView(normalizeView(subView));
    }, [subView]);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            if (view === 'list') {
                const res = await dimensionService.getDimensions(dimTab);
                setDimensions(res.data);
            } else if (view === 'config') {
                const res = await dimensionService.getConfigs();
                setConfigs(res.data);
            } else if (view === 'group') {
                const res = await dimensionService.getGroups();
                setGroups(res.data);
            }
        } catch (err) {
            logger.error("Fetch dimension data failed:", err);
        } finally {
            setLoading(false);
        }
    }, [view, dimTab]);

    const handleDeleteSelected = React.useCallback(async () => {
        if (!selectedRow) return;
        if (view !== 'list') return; // Only allow delete in list for now
        if (!confirm(`Bạn có chắc muốn xóa mã thống kê ${selectedRow.code}?`)) return;

        try {
            await dimensionService.deleteDimension(selectedRow.id);
            alert("Đã xóa thành công.");
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            logger.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    }, [selectedRow, view, fetchData]);

    // Handle Excel import for dimensions
    const handleImportFromExcel = useCallback(async (data: any[]) => {
        if (!data || data.length === 0) {
            alert('Không có dữ liệu để nhập');
            return;
        }

        setImporting(true);
        setImportProgress({ current: 0, total: data.length });

        const errors: string[] = [];
        let successCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            setImportProgress({ current: i + 1, total: data.length });

            try {
                const code = row.code || row['Mã'] || row['Mã (*)'];
                const name = row.name || row['Tên'] || row['Tên (*)'];
                const type = row.type || row['Chiều'] || dimTab;
                const description = row.description || row['Mô tả'] || '';

                if (!code || !name) {
                    errors.push(`Dòng ${i + 1}: Thiếu mã hoặc tên`);
                    continue;
                }

                await dimensionService.saveDimension({
                    code,
                    name,
                    type: parseInt(String(type)) || dimTab,
                    description
                });
                successCount++;
            } catch (err: any) {
                const code = row.code || row['Mã'] || `Dòng ${i + 1}`;
                const errorMsg = `${code}: ${err.response?.data?.error || err.message}`;
                errors.push(errorMsg);
            }
        }

        setImporting(false);
        setShowImportModal(false);

        // Show result
        if (errors.length === 0) {
            alert(`Nhập thành công ${successCount} mã thống kê!`);
        } else {
            alert(`Nhập ${successCount}/${data.length} mã thống kê.\n\nLỗi:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...và ${errors.length - 5} lỗi khác` : ''}`);
        }

        // Refresh data
        fetchData();
    }, [dimTab, fetchData]);

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];

            // Different actions based on view
            if (view === 'report') {
                // Report view has no primary action in header (config is inside the report)
            } else if (view !== 'overview') {
                const actionLabel = view === 'list' ? 'Khai báo mã mới' : view === 'config' ? 'Sửa cấu hình' : 'Tạo nhóm mới';
                const actionIcon = view === 'list' ? 'add_task' : view === 'config' ? 'tune' : 'group_add';

                actions.push({
                    label: actionLabel,
                    icon: actionIcon,
                    onClick: () => setShowModal(view === 'list' ? 'new' : view === 'config' ? 'config' : 'group'),
                    primary: true
                });

                // Add import button for list view
                if (view === 'list') {
                    actions.push({
                        label: 'Nhập từ Excel',
                        icon: 'upload_file',
                        onClick: () => setShowImportModal(true)
                    });
                }
            }

            onSetHeader({ title: info.title, icon: info.icon, actions, onDelete: view === 'list' ? handleDeleteSelected : undefined });
        }
    }, [view, onSetHeader, info.title, info.icon, handleDeleteSelected]);




    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Initial fetch for configs to show labels in tabs
    useEffect(() => {
        dimensionService.getConfigs()
            .then(res => setConfigs(res.data))
            .catch(err => logger.error("Initial configs fetch failed:", err));
    }, []);

    // Print handler
    useSimplePrint(printSignal, 'Mã thống kê', { allowBrowserPrint: true });

    const listColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Thống kê', width: 'w-40' },
        { field: 'name', headerName: 'Tên Thống kê', width: 'min-w-[250px]' },
        {
            field: 'type', headerName: 'Phân loại', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-bold uppercase">{v}</span>
            )
        },
        { field: 'description', headerName: 'Mô tả chi tiết', width: 'min-w-[300px]' },
    ];

    const configColumns: ColumnDef[] = [
        { field: 'id', headerName: 'ID', width: 'w-16', align: 'center' },
        { field: 'name', headerName: 'Tên hệ thống', width: 'w-40' },
        { field: 'label', headerName: 'Tên hiển thị (Label)', width: 'flex-1' },
        {
            field: 'isActive', headerName: 'Trạng thái', width: 'w-32', align: 'center', renderCell: (v: boolean) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{v ? 'Đang dùng' : 'Khóa'}</span>
            )
        },
        {
            field: 'isMandatory', headerName: 'Bắt buộc', width: 'w-32', align: 'center', renderCell: (v: boolean) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{v ? 'Có' : 'Không'}</span>
            )
        },
        { field: 'note', headerName: 'Ghi chú', width: 'min-w-[200px]' },
    ];

    const groupColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã nhóm', width: 'w-32' },
        { field: 'name', headerName: 'Tên nhóm thống kê', width: 'flex-1' },
        { field: 'dimType', headerName: 'Cửa sổ Dim', width: 'w-32', align: 'center' },
        { field: 'count', headerName: 'Số phần tử', width: 'w-24', align: 'center', renderCell: (v: number) => <span className="font-bold text-violet-600">{v}</span> },
        { field: 'description', headerName: 'Diễn giải', width: 'min-w-[200px]' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Pivot Report View */}
            {view === 'report' && (
                <PivotReportModule />
            )}

            {/* Module Overview - Default Landing Page */}
            {view === 'overview' && (
                <ModuleOverview
                    title={MODULE_CONFIGS.dimension.title}
                    description={MODULE_CONFIGS.dimension.description}
                    icon={MODULE_CONFIGS.dimension.icon}
                    iconColor={MODULE_CONFIGS.dimension.iconColor}
                    workflow={MODULE_CONFIGS.dimension.workflow}
                    features={MODULE_CONFIGS.dimension.features}
                    onNavigate={onNavigate}
                    stats={[
                        { icon: 'list', label: 'Chiều 1', value: dimensions.filter(d => d.type === 1).length || 0, color: 'purple' },
                        { icon: 'list_alt', label: 'Chiều 2', value: dimensions.filter(d => d.type === 2).length || 0, color: 'blue' },
                        { icon: 'group_work', label: 'Nhóm mã', value: groups.length, color: 'green' },
                        { icon: 'settings_suggest', label: 'Cấu hình', value: configs.filter(c => c.isActive).length, color: 'amber' },
                    ]}
                />
            )}

            {/* Action Bar & Tabs */}
            <div className={`px-6 py-3 bg-white/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 backdrop-blur-md ${(view === 'overview' || view === 'report') ? 'hidden' : ''}`}>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
                    {view === 'list' ? (
                        [1, 2, 3, 4, 5].map(t => (
                            <button
                                key={t}
                                onClick={() => setDimTab(t)}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${dimTab === t ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {configs.find(c => c.id === t)?.label || `Dim ${t}`}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-1.5 text-[10px] font-black uppercase text-violet-600">
                            Hệ thống /{view === 'config' ? 'Cấu hình' : 'Phân nhóm'}
                        </div>
                    )}
                </div>
            </div>

            <div className={`flex-1 overflow-auto relative ${(view === 'overview' || view === 'report') ? 'hidden' : ''}`}>
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {view === 'list' && (
                    <SmartTable
                        data={dimensions}
                        columns={listColumns}
                        keyField="id"
                        loading={loading}
                        onSelectionChange={setSelectedRow}
                        onRowDoubleClick={(row) => { setSelectedRow(row); setShowModal('new'); }}
                        showTotalRow={false}
                        minRows={15}
                        emptyMessage={`Không có dữ liệu cho Mã thống kê ${dimTab}`}
                    />
                )}
                {view === 'config' && (
                    <SmartTable
                        data={configs}
                        columns={configColumns}
                        keyField="id"
                        minRows={5}
                    />
                )}
                {view === 'group' && (
                    <SmartTable
                        data={groups}
                        columns={groupColumns}
                        keyField="id"
                        minRows={10}
                    />
                )}
            </div>

            {showModal === 'new' && (
                <DimensionFormModal
                    onClose={() => { setShowModal(null); setSelectedRow(null); }}
                    tab={dimTab}
                    initialData={selectedRow}
                    onSave={() => { fetchData(); setShowModal(null); setSelectedRow(null); }}
                />
            )}
            {showModal === 'config' && (
                <DimensionConfigModal
                    onClose={() => setShowModal(null)}
                    configs={configs}
                    onSave={() => { fetchData(); setShowModal(null); }}
                />
            )}
            {showModal === 'group' && (
                <DimensionGroupModal
                    onClose={() => setShowModal(null)}
                    dimType={dimTab}
                    onSave={() => { fetchData(); setShowModal(null); }}
                />
            )}

            {/* Excel Import Modal */}
            {showImportModal && (
                <ExcelImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportFromExcel}
                    title={`Nhập mã thống kê chiều ${dimTab}`}
                    enhancedTemplate={DIMENSION_TEMPLATE}
                    columns={[
                        { key: 'code', label: 'Mã', required: true },
                        { key: 'name', label: 'Tên', required: true },
                        { key: 'type', label: 'Chiều' },
                        { key: 'description', label: 'Mô tả' }
                    ]}
                />
            )}

            {/* Import Progress Overlay */}
            {importing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-2xl text-center max-w-md">
                        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                            Đang nhập mã thống kê...
                        </p>
                        <p className="text-2xl font-mono text-violet-600 mt-2">
                            {importProgress.current} / {importProgress.total}
                        </p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-4">
                            <div
                                className="bg-violet-600 h-2 rounded-full transition-all"
                                style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const DimensionFormModal = ({ onClose, tab, onSave, initialData }: { onClose: () => void, tab: number, onSave: () => void, initialData?: any }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: initialData?.id || '',
        code: initialData?.code || '',
        name: initialData?.name || '',
        type: initialData?.type || tab,
        description: initialData?.description || ''
    });

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            alert("Vui lòng nhập Mã và Tên");
            return;
        }
        setLoading(true);
        try {
            await dimensionService.saveDimension(formData);
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu mã thống kê");
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            title={initialData ? `Sửa Mã thống kê chiều ${tab}` : `Thêm Mã thống kê chiều ${tab}`}
            icon={initialData ? "edit" : "new_window"}
            onClose={onClose}
            size="md"
            headerVariant="gradient"
            headerColor="purple"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Bỏ qua</FormButton>
                    <FormButton variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu khai báo'}
                    </FormButton>
                </FormActions>
            }
        >
            <FormSection title="Thông tin cơ bản" variant="card" color="blue">
                <FormGrid cols={2}>
                    <FormField label="Mã Thống kê" required>
                        <input
                            type="text"
                            className="form-input font-bold"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                        />
                    </FormField>
                    <FormField label="Chiều thống kê">
                        <input
                            type="text"
                            disabled
                            className="form-input bg-slate-100 dark:bg-slate-800 opacity-50"
                            value={`Dimension ${tab}`}
                        />
                    </FormField>
                </FormGrid>
                <FormField label="Tên Mã thống kê" required>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Thông tin bổ sung" variant="card" color="slate">
                <FormField label="Diễn giải / Mục đích sử dụng">
                    <textarea
                        rows={3}
                        className="form-textarea"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
};

const DimensionConfigModal = ({ onClose, configs, onSave }: { onClose: () => void, configs: any[], onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [localConfigs, setLocalConfigs] = useState([...configs]);

    const handleUpdate = (id: number, field: string, value: any) => {
        setLocalConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await dimensionService.saveConfigs(localConfigs);
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu cấu hình");
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            title="Cấu hình hệ thống Dimension"
            icon="tune"
            onClose={onClose}
            size="lg"
            headerVariant="gradient"
            headerColor="purple"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Bỏ qua</FormButton>
                    <FormButton variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Đang cập nhật...' : 'Cập nhật cấu hình'}
                    </FormButton>
                </FormActions>
            }
        >
            <FormAlert variant="info">
                Việc thay đổi <strong>Tên hiển thị</strong> sẽ ảnh hưởng đến giao diện nhập liệu tại tất cả các phân hệ.
                Hãy cân nhắc khi tắt trạng thái <strong>Đang dùng</strong> của các chiều đã có dữ liệu.
            </FormAlert>

            <FormSection title="Danh sách chiều thống kê" variant="card" color="slate">
                <div className="space-y-3">
                    {localConfigs.map(cfg => (
                        <div key={cfg.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{cfg.name}</p>
                                <input
                                    value={cfg.label}
                                    onChange={e => handleUpdate(cfg.id, 'label', e.target.value)}
                                    className="text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-blue-500 w-full dark:text-white"
                                />
                            </div>
                            <div className="flex items-center gap-6 ml-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dùng</span>
                                    <input
                                        type="checkbox"
                                        checked={cfg.isActive === 1}
                                        onChange={e => handleUpdate(cfg.id, 'isActive', e.target.checked ? 1 : 0)}
                                        className="w-5 h-5 accent-green-600 rounded"
                                    />
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bắt buộc</span>
                                    <input
                                        type="checkbox"
                                        checked={cfg.isMandatory === 1}
                                        onChange={e => handleUpdate(cfg.id, 'isMandatory', e.target.checked ? 1 : 0)}
                                        className="w-5 h-5 accent-red-600 rounded"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </FormSection>
        </FormModal>
    );
};

const DimensionGroupModal = ({ onClose, dimType, onSave }: { onClose: () => void, dimType: number, onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        dim_type: dimType,
        description: '',
        members: [] as string[]
    });
    const [availableMembers, setAvailableMembers] = useState<any[]>([]);

    useEffect(() => {
        dimensionService.getDimensions(dimType).then(res => setAvailableMembers(res.data));
    }, [dimType]);

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            alert("Vui lòng nhập Mã và Tên nhóm");
            return;
        }
        setLoading(true);
        try {
            await dimensionService.saveGroup(formData);
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu nhóm");
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (mId: string) => {
        setFormData(prev => ({
            ...prev,
            members: prev.members.includes(mId) ? prev.members.filter(id => id !== mId) : [...prev.members, mId]
        }));
    };

    return (
        <FormModal
            title="Thiết lập Nhóm thống kê"
            icon="group_add"
            onClose={onClose}
            size="lg"
            headerVariant="gradient"
            headerColor="green"
            footer={
                <FormActions>
                    <FormButton variant="secondary" onClick={onClose}>Bỏ qua</FormButton>
                    <FormButton variant="success" onClick={handleSave} disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu nhóm'}
                    </FormButton>
                </FormActions>
            }
        >
            <FormSection title="Thông tin nhóm" variant="card" color="green">
                <FormGrid cols={2}>
                    <FormField label="Mã Nhóm" required>
                        <input
                            type="text"
                            className="form-input font-bold"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                        />
                    </FormField>
                    <FormField label="Chiều thống kê">
                        <input
                            type="text"
                            disabled
                            className="form-input bg-slate-100 dark:bg-slate-800 opacity-50"
                            value={`Dimension ${dimType}`}
                        />
                    </FormField>
                </FormGrid>
                <FormField label="Tên Nhóm thống kê" required>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Thành viên trong nhóm" variant="highlight" color="slate">
                <div className="flex flex-wrap gap-2">
                    {availableMembers.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Chưa có mã thống kê nào trong chiều này</p>
                    ) : (
                        availableMembers.map(m => {
                            const isSelected = formData.members.includes(m.id);
                            return (
                                <span
                                    key={m.id}
                                    onClick={() => toggleMember(m.id)}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all text-sm ${
                                        isSelected
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-2 ring-green-500'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {isSelected ? 'check_circle' : 'add_circle_outline'}
                                    </span>
                                    {m.code} - {m.name}
                                </span>
                            );
                        })
                    )}
                </div>
                {formData.members.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                        Đã chọn {formData.members.length} mã thống kê
                    </p>
                )}
            </FormSection>
        </FormModal>
    );
};

