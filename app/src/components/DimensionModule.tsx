import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { dimensionService } from '../api';
import { type RibbonAction } from './Ribbon';
import { FormModal } from './FormModal';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { useSimplePrint } from '../hooks/usePrintHandler';

// Mock data removed

interface DimensionModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (viewId: string) => void;
}

export const DimensionModule: React.FC<DimensionModuleProps> = ({ subView = 'list', printSignal = 0, onSetHeader, onNavigate }) => {
    const [view, setView] = useState(subView);
    const [dimTab, setDimTab] = useState(1);
    const [showModal, setShowModal] = useState<string | null>(null);

    const [dimensions, setDimensions] = useState<any[]>([]);
    const [configs, setConfigs] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    const getModuleInfo = () => {
        switch (view) {
            case 'config': return { title: 'Cấu hình Loại TK', icon: 'settings_suggest', desc: 'Thiết lập tham số và thuộc tính cho các chiều thống kê' };
            case 'group': return { title: 'Nhóm Mã thống kê', icon: 'group_work', desc: 'Phân nhóm các mã thống kê để phục vụ báo cáo tổng hợp' };
            default: return { title: 'Danh mục Mã thống kê', icon: 'list', desc: 'Quản lý 5 chiều thống kê tùy chỉnh cho các hạch toán kế toán' };
        }
    };

    const info = getModuleInfo();

    useEffect(() => {
        if (subView) setView(subView);
    }, [subView]);

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];
            const actionLabel = view === 'list' ? 'Khai báo mã mới' : view === 'config' ? 'Sửa cấu hình' : 'Tạo nhóm mới';
            const actionIcon = view === 'list' ? 'add_task' : view === 'config' ? 'tune' : 'group_add';

            actions.push({
                label: actionLabel,
                icon: actionIcon,
                onClick: () => setShowModal(view === 'list' ? 'new' : view === 'config' ? 'config' : 'group'),
                primary: true
            });

            onSetHeader({ title: info.title, icon: info.icon, actions, onDelete: handleDeleteSelected });
        }
    }, [view, onSetHeader, info.title, info.icon, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (view !== 'list') return; // Only allow delete in list for now
        if (!confirm(`Bạn có chắc muốn xóa mã thống kê ${selectedRow.code}?`)) return;

        try {
            await dimensionService.deleteDimension(selectedRow.id);
            alert("Đã xóa thành công.");
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const fetchData = async () => {
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
            console.error("Fetch dimension data failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view, dimTab]);

    // Initial fetch for configs to show labels in tabs
    useEffect(() => {
        dimensionService.getConfigs()
            .then(res => setConfigs(res.data))
            .catch(err => console.error("Initial configs fetch failed:", err));
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
            {/* Module Overview - Default Landing Page */}
            {(view === 'overview' || view === 'dimension_overview') && (
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
            <div className={`px-6 py-3 bg-white/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 backdrop-blur-md ${(view === 'overview' || view === 'dimension_overview') ? 'hidden' : ''}`}>
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

            <div className={`flex-1 overflow-auto relative ${(view === 'overview' || view === 'dimension_overview') ? 'hidden' : ''}`}>
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
                        onSelectionChange={setSelectedRow}
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
                    onClose={() => setShowModal(null)}
                    tab={dimTab}
                    onSave={() => { fetchData(); setShowModal(null); }}
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
        </div>
    );
};

// --- SUB-COMPONENTS ---

const Modal = ({ title, icon, onClose, children }: { title: string, icon: string, onClose: () => void, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} sizeClass="max-w-xl" icon={icon}>
        {children}
    </FormModal>
);

const DimensionFormModal = ({ onClose, tab, onSave }: { onClose: () => void, tab: number, onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: tab,
        description: ''
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
        <Modal title={`Thêm Mã thống kê chiều ${tab}`} icon="new_window" onClose={onClose}>
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Mã Thống kê</label>
                            <input type="text" className="form-input font-bold"
                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Chiều thống kê</label>
                            <input type="text" disabled className="form-input bg-slate-100 dark:bg-slate-800 opacity-50"
                                value={`Dimension ${tab}`} />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Tên Mã thống kê</label>
                        <input type="text" className="form-input"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Diễn giải / Mục đích sử dụng</label>
                        <textarea rows={4} className="form-textarea"
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                    <button onClick={handleSave} disabled={loading} className="form-button-primary bg-violet-600 hover:bg-violet-700 uppercase tracking-wide">
                        {loading ? 'Đang lưu...' : 'Lưu khai báo'}
                    </button>
                </div>
            </div>
        </Modal>
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
        <Modal title="Cấu hình hệ thống Dimension" icon="tune" onClose={onClose}>
            <div className="space-y-6">
                <div className="p-4 bg-violet-50 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-900/30">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined text-violet-600">info</span>
                        <p className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed">
                            Việc thay đổi **Tên hiển thị** sẽ ảnh hưởng đến giao diện nhập liệu tại tất cả các phân hệ. Hãy cân nhắc khi tắt trạng thái **Đang dùng** của các chiều đã có dữ liệu.
                        </p>
                    </div>
                </div>
                <div className="space-y-4">
                    {localConfigs.map(cfg => (
                        <div key={cfg.id} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{cfg.name}</p>
                                <input value={cfg.label} onChange={e => handleUpdate(cfg.id, 'label', e.target.value)} className="text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-violet-500 w-full" />
                            </div>
                            <div className="flex items-center gap-6 ml-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dùng</span>
                                    <input type="checkbox" checked={cfg.isActive === 1} onChange={e => handleUpdate(cfg.id, 'isActive', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-violet-600" />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bắt buộc</span>
                                    <input type="checkbox" checked={cfg.isMandatory === 1} onChange={e => handleUpdate(cfg.id, 'isMandatory', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-rose-600" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                    <button onClick={handleSave} disabled={loading} className="form-button-primary bg-violet-600 hover:bg-violet-700 uppercase tracking-wide">
                        {loading ? 'Đang cập nhật...' : 'Cập nhật cấu hình'}
                    </button>
                </div>
            </div>
        </Modal>
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
        <Modal title="Thiết lập Nhóm thống kê" icon="group_add" onClose={onClose}>
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Mã Nhóm</label>
                            <input type="text" className="form-input font-bold"
                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Chiều thống kê</label>
                            <input type="text" disabled className="form-input bg-slate-100 dark:bg-slate-800 opacity-50"
                                value={`Dimension ${dimType}`} />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Tên Nhóm thống kê</label>
                        <input type="text" className="form-input"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Chọn thành viên trong nhóm</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {availableMembers.map(m => {
                                const isSelected = formData.members.includes(m.id);
                                return (
                                    <span
                                        key={m.id}
                                        onClick={() => toggleMember(m.id)}
                                        className={`px-2 py-1 rounded-md flex items-center gap-2 cursor-pointer transition-colors ${isSelected ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-violet-50'}`}
                                    >
                                        {m.name}
                                        <span className="material-symbols-outlined text-[14px]">{isSelected ? 'close' : 'add'}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                    <button onClick={handleSave} disabled={loading} className="form-button-primary bg-violet-600 hover:bg-violet-700 uppercase tracking-wide">
                        {loading ? 'Đang lưu...' : 'Lưu nhóm'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

