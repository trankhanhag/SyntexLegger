import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { projectService } from '../api';
import { type RibbonAction } from './Ribbon';
import { toInputDateValue } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import { DateInput } from './DateInput';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { useSimplePrint } from '../hooks/usePrintHandler';

interface ProjectModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (view: string) => void;
}

export const ProjectModule: React.FC<ProjectModuleProps> = ({ subView = 'list', printSignal = 0, onSetHeader, onNavigate: _onNavigate }) => {
    const [view, setView] = useState(subView);
    const [showFormModal, setShowFormModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);

    const [projects, setProjects] = useState<any[]>([]);
    const [displayData, setDisplayData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProjectCode, setSelectedProjectCode] = useState<string>('');
    const [selectedRow, setSelectedRow] = useState<any>(null);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

    const getModuleInfo = () => {
        switch (view) {
            case 'tracking': return { title: 'Tiến độ dự án', icon: 'analytics', desc: 'Giám sát chi tiết các mốc thời gian và khối lượng công việc theo task' };
            case 'budget': return { title: 'Ngân sách dự án', icon: 'attach_money', desc: 'Quản lý hạn mức chi phí so với số liệu thực tế phát sinh' };
            case 'report': return { title: 'Báo cáo Tổng hợp', icon: 'summarize', desc: 'Tổng hợp chi phí, tiến độ và tình hình giải ngân theo dự án' };
            default: return { title: 'Danh sách Dự án', icon: 'list_alt', desc: 'Quản lý danh mục dự án, vụ việc và thông tin khách hàng' };
        }
    };

    const info = getModuleInfo();

    useEffect(() => {
        if (subView) setView(subView);
    }, [subView]);

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];
            if (view === 'tracking') {
                actions.push({
                    label: 'Cập nhật tiến độ task',
                    icon: 'update',
                    onClick: () => setShowProgressModal(true),
                    primary: true
                });
            } else {
                actions.push({
                    label: 'Khởi tạo Dự án mới',
                    icon: 'add_task',
                    onClick: () => setShowFormModal(true),
                    primary: true
                });
            }
            actions.push({
                label: 'Xuất báo cáo',
                icon: 'ios_share',
                onClick: () => alert("Đang trích xuất báo cáo...")
            });

            onSetHeader({ title: info.title, icon: info.icon, actions, onDelete: handleDeleteSelected });
        }
    }, [view, onSetHeader, info.title, info.icon, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (view !== 'list') return; // Only allow delete in generic list for now
        if (!confirm(`Bạn có chắc muốn xóa dự án ${selectedRow.name}?`)) return;

        try {
            await projectService.deleteProject(selectedRow.id);
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
                const res = await projectService.getProjects();
                setProjects(res.data);
                setDisplayData(res.data);
                if (res.data.length > 0 && !selectedProjectCode) {
                    setSelectedProjectCode(res.data[0].code);
                }
            } else if (view === 'tracking') {
                const res = await projectService.getTasks({ project_code: selectedProjectCode });
                setDisplayData(res.data);
            } else if (view === 'budget') {
                const res = await projectService.getBudgets({ project_code: selectedProjectCode });
                setDisplayData(res.data);
            } else if (view === 'report') {
                const res = await projectService.getPNL();
                setDisplayData(res.data);
            }
        } catch (err) {
            console.error("Fetch project data failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view, selectedProjectCode]);

    // Handle print signal
    useSimplePrint(printSignal, 'Dự án', { allowBrowserPrint: true });

    // --- Column Definitions ---
    const catalogColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã Dự án', width: 'w-36', fontClass: 'font-bold text-teal-600' },
        { field: 'name', headerName: 'Tên Dự án', width: 'min-w-[250px]' },
        { field: 'customer', headerName: 'Khách hàng', width: 'w-48' },
        { field: 'budget', headerName: 'Ngân sách', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
        {
            field: 'progress', headerName: '% Hoàn thành', width: 'w-32', align: 'center',
            renderCell: (val: any) => (
                <div className="flex items-center gap-2 w-full px-2">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-teal-500 h-full rounded-full" style={{ width: `${val}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 w-8 text-right">{val}%</span>
                </div>
            )
        },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-36', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Đang triển khai' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{v}</span>
            )
        },
    ];

    const trackingColumns: ColumnDef[] = [
        { field: 'prj_code', headerName: 'Dự án', width: 'w-32', fontClass: 'font-bold' },
        { field: 'task', headerName: 'Nhiệm vụ / Công việc', width: 'min-w-[300px]' },
        { field: 'owner', headerName: 'Phụ trách', width: 'w-40' },
        { field: 'deadline', headerName: 'Hạn định', width: 'w-32', align: 'center' },
        {
            field: 'progress', headerName: '%', width: 'w-24', align: 'center',
            renderCell: (v: number) => <span className={`font-mono font-bold ${v === 100 ? 'text-green-600' : 'text-amber-600'}`}>{v}%</span>
        },
        {
            field: 'status', headerName: 'Tình trạng', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Hoàn thành' ? 'bg-green-100 text-green-700' : v === 'Chậm tiến độ' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{v}</span>
            )
        },
    ];

    const budgetColumns: ColumnDef[] = [
        { field: 'category', headerName: 'Khoản mục chi phí', width: 'min-w-[200px]', fontClass: 'font-bold' },
        { field: 'budget', headerName: 'Ngân sách (1)', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span> },
        { field: 'actual', headerName: 'Thực tế (2)', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono text-red-600">{formatNumber(v)}</span> },
        { field: 'remaining', headerName: 'Còn lại', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono text-teal-600 font-bold">{formatNumber(v)}</span> },
        {
            field: 'percent', headerName: '% Sử dụng', width: 'w-40', align: 'center',
            renderCell: (v: number) => (
                <div className="flex items-center gap-2 w-full px-2">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className={`${v > 90 ? 'bg-red-500' : 'bg-blue-500'} h-full rounded-full`} style={{ width: `${v > 100 ? 100 : v}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold w-8 text-right">{v}%</span>
                </div>
            )
        },
    ];

    const pnlColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã DA', width: 'w-32', fontClass: 'font-bold' },
        { field: 'name', headerName: 'Tên Dự án', width: 'min-w-[250px]' },
        { field: 'revenue', headerName: 'Doanh thu', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono text-blue-600 font-bold">{formatNumber(v)}</span> },
        { field: 'cost', headerName: 'Giá vốn/Chi phí', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono text-red-600">{formatNumber(v)}</span> },
        { field: 'profit', headerName: 'Lợi nhuận gộp', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono text-green-600 font-bold">{formatNumber(v)}</span> },
        { field: 'margin', headerName: 'Biên lãi (%)', width: 'w-28', align: 'center', fontClass: 'font-bold text-slate-800' },
    ];

    // Show ModuleOverview when view is 'overview' or empty
    if (view === 'overview' || view === '' || !view) {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.project.title}
                description={MODULE_CONFIGS.project.description}
                icon={MODULE_CONFIGS.project.icon}
                iconColor={MODULE_CONFIGS.project.iconColor}
                workflow={MODULE_CONFIGS.project.workflow}
                features={MODULE_CONFIGS.project.features}
                stats={[
                    { icon: 'folder', label: 'Tổng dự án', value: projects.length || '-', color: 'blue' },
                    { icon: 'trending_up', label: 'Đang triển khai', value: projects.filter((p: any) => p.status === 'IN_PROGRESS').length || 0, color: 'green' },
                    { icon: 'check_circle', label: 'Hoàn thành', value: projects.filter((p: any) => p.status === 'COMPLETED').length || 0, color: 'purple' },
                    { icon: 'schedule', label: 'Trạng thái', value: 'Sẵn sàng', color: 'green' },
                ]}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">

            <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-teal-600 bg-teal-50 dark:bg-teal-900/30 p-2 rounded-xl text-3xl">{info.icon}</span>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{info.title}</h2>
                        <p className="text-xs text-slate-500 font-medium">{info.desc}</p>
                    </div>
                </div>
                {(view === 'tracking' || view === 'budget') && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Dự án:</span>
                        <select className="bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white text-sm"
                            value={selectedProjectCode} onChange={e => setSelectedProjectCode(e.target.value)}>
                            {projects.map(p => (
                                <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <SmartTable
                    data={displayData}
                    columns={
                        view === 'tracking' ? trackingColumns :
                            view === 'budget' ? budgetColumns :
                                view === 'report' ? pnlColumns :
                                    catalogColumns
                    }
                    keyField="id"
                    onSelectionChange={setSelectedRow}
                    minRows={15}
                    emptyMessage="Không có dữ liệu hiển thị"
                />
            </div>

            {showFormModal && (
                <ProjectFormModal
                    onClose={() => setShowFormModal(false)}
                    onSave={() => {
                        fetchData();
                        setShowFormModal(false);
                    }}
                />
            )}

            {showProgressModal && (
                <UpdateProgressModal
                    onClose={() => setShowProgressModal(false)}
                    projectCode={selectedProjectCode}
                    onSave={() => {
                        fetchData();
                        setShowProgressModal(false);
                    }}
                />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const Modal = ({ title, onClose, widthClass = "max-w-4xl", children }: { title: string, onClose: () => void, widthClass?: string, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} sizeClass={widthClass} icon="new_window">
        {children}
    </FormModal>
);

const ProjectFormModal = ({ onClose, onSave }: { onClose: () => void, onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [fundSources, setFundSources] = useState<any[]>([]);
    const [budgetEstimates, setBudgetEstimates] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        customer: '',
        budget: 0,
        start: toInputDateValue(),
        end: '',
        progress: 0,
        status: 'Mới khởi tạo',
        // HCSN fields
        project_type: 'PUBLIC_SERVICE',
        fund_source_id: '',
        budget_estimate_id: '',
        approval_no: '',
        approval_date: '',
        managing_agency: '',
        task_code: '',
        objective: '',
        expected_output: '',
        completion_date: '',
        partner_code: ''
    });

    useEffect(() => {
        import('../api').then(({ masterDataService, hcsnService }) => {
            masterDataService.getPartners().then(res => setCustomers(res.data || [])).catch(err => console.error(err));
            hcsnService.getFundSources().then(res => {
                const d = res.data;
                setFundSources(Array.isArray(d) ? d : (d?.data || []));
            }).catch(err => console.error(err));
            hcsnService.getBudgetEstimates().then(res => {
                const d = res.data;
                setBudgetEstimates(Array.isArray(d) ? d : (d?.data || []));
            }).catch(err => console.error(err));
        });
    }, []);

    const handleSave = async () => {
        if (!formData.code || !formData.name || !formData.customer) {
            alert("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        setLoading(true);
        try {
            await projectService.saveProject(formData);
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu dự án");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Khởi tạo Dự án / Vụ việc mới (HCSN)" onClose={onClose} widthClass="max-w-5xl">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="form-label">Mã Dự án <span className="text-red-500">*</span></label>
                            <input type="text" className="form-input font-bold"
                                placeholder="PRJ-..." value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Tên Dự án / Vụ việc <span className="text-red-500">*</span></label>
                            <input type="text" className="form-input"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Khách hàng / Đối tượng <span className="text-red-500">*</span></label>
                            <select className="form-select"
                                value={formData.customer} onChange={e => setFormData({ ...formData, customer: e.target.value })}>
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.partner_name}>{c.partner_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Ngày bắt đầu</label>
                                <DateInput
                                    className="form-input"
                                    value={formData.start}
                                    onChange={(value) => setFormData({ ...formData, start: value })}
                                />
                            </div>
                            <div>
                                <label className="form-label">Ngân sách ước tính</label>
                                <input type="number" className="form-input font-mono font-bold text-teal-600"
                                    value={formData.budget} onChange={e => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {/* HCSN Fields */}
                        <div>
                            <label className="form-label">Loại dự án HCSN</label>
                            <select className="form-select" value={formData.project_type}
                                onChange={e => setFormData({ ...formData, project_type: e.target.value })}>
                                <option value="INVESTMENT">Đầu tư</option>
                                <option value="PUBLIC_SERVICE">Sự nghiệp công</option>
                                <option value="RESEARCH">Nghiên cứu khoa học</option>
                                <option value="INFRASTRUCTURE">Hạ tầng</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Nguồn kinh phí</label>
                            <select className="form-select" value={formData.fund_source_id}
                                onChange={e => setFormData({ ...formData, fund_source_id: e.target.value })}>
                                <option value="">-- Chọn nguồn kinh phí --</option>
                                {fundSources.map(fs => (
                                    <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Dự toán ngân sách</label>
                            <select className="form-select" value={formData.budget_estimate_id}
                                onChange={e => setFormData({ ...formData, budget_estimate_id: e.target.value })}>
                                <option value="">-- Chọn dự toán --</option>
                                {budgetEstimates.map(be => (
                                    <option key={be.id} value={be.id}>{be.category_code} - {be.category_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Số quyết định phê duyệt</label>
                                <input type="text" className="form-input" placeholder="QĐ số..."
                                    value={formData.approval_no} onChange={e => setFormData({ ...formData, approval_no: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Cơ quan quản lý</label>
                                <input type="text" className="form-input" placeholder="Tên cơ quan..."
                                    value={formData.managing_agency} onChange={e => setFormData({ ...formData, managing_agency: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="form-label">Mục tiêu dự án</label>
                    <textarea rows={2} className="form-textarea" value={formData.objective}
                        onChange={e => setFormData({ ...formData, objective: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Sản phẩm dự kiến</label>
                    <textarea rows={2} className="form-textarea" value={formData.expected_output}
                        onChange={e => setFormData({ ...formData, expected_output: e.target.value })} />
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                    <button onClick={handleSave} disabled={loading} className="form-button-primary bg-teal-600 hover:bg-teal-700 uppercase text-[10px] tracking-wider">
                        {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const UpdateProgressModal = ({ onClose, projectCode, onSave }: { onClose: () => void, projectCode: string, onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        projectService.getTasks({ project_code: projectCode }).then(res => {
            setTasks(res.data);
            if (res.data.length > 0) {
                setSelectedTaskId(res.data[0].id);
                setProgress(res.data[0].progress);
            }
        });
    }, [projectCode]);

    const handleUpdate = async () => {
        if (!selectedTaskId) return;

        setLoading(true);
        try {
            const status = progress === 100 ? 'Hoàn thành' : progress > 0 ? 'Đang thực hiện' : 'Mới bắt đầu';
            await projectService.updateTask({ id: selectedTaskId, progress, status });
            onSave();
        } catch (err) {
            alert("Lỗi khi cập nhật tiến độ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Cập nhật tiến độ Nhiệm vụ" onClose={onClose} widthClass="max-w-xl">
            <div className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Nhiệm vụ / Task</label>
                        <select className="form-select font-bold"
                            value={selectedTaskId} onChange={e => {
                                setSelectedTaskId(e.target.value);
                                const t = tasks.find(x => x.id === e.target.value);
                                if (t) setProgress(t.progress);
                            }}>
                            {tasks.map(t => (
                                <option key={t.id} value={t.id}>{t.task}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Tỷ lệ hoàn thành (%)</label>
                        <div className="flex items-center gap-4">
                            <input type="range" min="0" max="100" className="flex-1 accent-amber-600"
                                value={progress} onChange={e => setProgress(parseInt(e.target.value))} />
                            <span className="text-xl font-black text-amber-600 font-mono w-12 text-right">{progress}%</span>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Ghi chú tình trạng / Vướng mắc</label>
                        <textarea rows={3} className="form-textarea" placeholder="Mô tả kết quả đạt được hoặc vấn đề cần hỗ trợ..." />
                    </div>
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="form-button-secondary">Hủy</button>
                    <button onClick={handleUpdate} disabled={loading} className="form-button-primary bg-amber-600 hover:bg-amber-700 uppercase text-[10px] tracking-wider">
                        {loading ? 'Đang cập nhật...' : 'Cập nhật ngay'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
