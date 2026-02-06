import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { systemService } from '../api';
import { type RibbonAction } from './Ribbon';
import { formatDateTimeVN, formatDateVN } from '../utils/dateUtils';
import { FormModal } from './FormModal';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { AuditTrailModule } from './AuditTrailModule';
import { useSimplePrint, triggerBrowserPrint } from '../hooks/usePrintHandler';
import { BackupRestoreView } from './BackupRestoreView';
import logger from '../utils/logger';

// --- MOCK DATA ---

// Mock data removed

// --- ACCESS LOGS VIEW (Consistent design with AuditTrailModule) ---
// Moved before SystemModule to avoid hoisting issues with const arrow functions

interface AccessLogsViewProps {
    logs: any[];
    loading: boolean;
    onRefresh: () => void;
}

const AccessLogsView: React.FC<AccessLogsViewProps> = ({ logs, loading, onRefresh }) => {
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Get unique users and actions for filter dropdowns
    const uniqueUsers = [...new Set(logs.map(l => l.user).filter(Boolean))];
    const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))];

    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (filterUser && log.user !== filterUser) return false;
        if (filterAction && log.action !== filterAction) return false;
        if (filterDateFrom && new Date(log.timestamp) < new Date(filterDateFrom)) return false;
        if (filterDateTo && new Date(log.timestamp) > new Date(filterDateTo + 'T23:59:59')) return false;
        return true;
    });

    // Stats
    const loginCount = logs.filter(l => l.action === 'LOGIN').length;
    const updateCount = logs.filter(l => l.action === 'UPDATE' || l.action === 'Cập nhật').length;
    const createCount = logs.filter(l => l.action === 'Thêm mới' || l.action === 'CREATE').length;

    const logColumns: ColumnDef[] = [
        { field: 'timestamp', headerName: 'Thời gian', width: 'w-48', align: 'center', renderCell: (v: string) => formatDateTimeVN(v) },
        { field: 'user', headerName: 'Người dùng', width: 'w-32' },
        {
            field: 'action', headerName: 'Tác vụ', width: 'w-28', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Thêm mới' || v === 'LOGIN' || v === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : v === 'UPDATE' || v === 'Cập nhật' ? 'bg-amber-50 text-amber-600' : v === 'DELETE' || v === 'Xóa' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{v}</span>
            )
        },
        { field: 'target', headerName: 'Đối tượng', width: 'w-48' },
        { field: 'detail', headerName: 'Chi tiết thay đổi', width: 'flex-1' },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Header with Summary */}
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-700 border-b">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-red-600">history</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white">Nhật ký truy cập</h2>
                            <p className="text-sm text-slate-500">Theo dõi lịch sử đăng nhập và các tác vụ thay đổi dữ liệu</p>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-lg border shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        <span className="text-sm font-medium">Làm mới</span>
                    </button>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <span className="material-symbols-outlined text-sm">list</span>
                            Tổng bản ghi
                        </div>
                        <div className="text-lg font-bold text-slate-800 dark:text-white">{logs.length}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <span className="material-symbols-outlined text-sm text-emerald-500">login</span>
                            Đăng nhập
                        </div>
                        <div className="text-lg font-bold text-emerald-600">{loginCount}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <span className="material-symbols-outlined text-sm text-amber-500">edit</span>
                            Cập nhật
                        </div>
                        <div className="text-lg font-bold text-amber-600">{updateCount}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <span className="material-symbols-outlined text-sm text-blue-500">add_circle</span>
                            Thêm mới
                        </div>
                        <div className="text-lg font-bold text-blue-600">{createCount}</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar - Consistent with AuditTrailModule */}
            <div className="bg-gray-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 min-w-[140px]"
                    >
                        <option value="">Tất cả người dùng</option>
                        {uniqueUsers.map(user => (
                            <option key={user} value={user}>{user}</option>
                        ))}
                    </select>

                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 min-w-[140px]"
                    >
                        <option value="">Tất cả tác vụ</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Từ:</span>
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Đến:</span>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => setFilterDateTo(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600"
                        />
                    </div>

                    {(filterUser || filterAction || filterDateFrom || filterDateTo) && (
                        <button
                            onClick={() => {
                                setFilterUser('');
                                setFilterAction('');
                                setFilterDateFrom('');
                                setFilterDateTo('');
                            }}
                            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Xóa bộ lọc
                        </button>
                    )}

                    <div className="ml-auto text-sm text-slate-500">
                        Hiển thị: <span className="font-bold">{filteredLogs.length}</span> / {logs.length} bản ghi
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 backdrop-blur-sm">
                        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-6xl mb-4">history_off</span>
                        <p className="text-lg font-bold">Không có dữ liệu nhật ký</p>
                        <p className="text-sm">Chưa có hoạt động nào được ghi nhận hoặc không khớp bộ lọc</p>
                    </div>
                ) : (
                    <SmartTable data={filteredLogs} columns={logColumns} keyField="id" minRows={15} />
                )}
            </div>
        </div>
    );
};

// --- SYSTEM MODULE MAIN ---

interface SystemModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[] }) => void;
    onNavigate?: (view: string, data?: any) => void;
}

export const SystemModule: React.FC<SystemModuleProps> = ({ subView = 'params', printSignal = 0, onSetHeader, onNavigate }) => {
    const [view, setView] = useState(subView);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // System Data
    const [params, setParams] = useState<any>({});
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    const getModuleInfo = () => {
        switch (view) {
            case 'users': return { title: 'Quản lý người dùng', icon: 'manage_accounts', desc: 'Thiết lập danh sách người dùng, vai trò và trạng thái truy cập' };
            case 'perms': return { title: 'Phân quyền truy cập', icon: 'security', desc: 'Cấu hình chi tiết quyền hạn xem, sửa, xóa cho từng nhóm người dùng' };
            case 'backup': return { title: 'Sao lưu dữ liệu', icon: 'backup', desc: 'Thực hiện sao lưu và theo dõi lịch sử bảo trì dữ liệu' };
            case 'logs': return { title: 'Nhật ký truy cập', icon: 'history', desc: 'Theo dõi lịch sử đăng nhập và các tác vụ thay đổi dữ liệu' };
            default: return { title: 'Tham số hệ thống', icon: 'settings', desc: 'Cấu hình các tham số kế toán, định dạng và quy định chung' };
        }
    };

    const info = getModuleInfo();

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'params') {
                const res = await systemService.getParams();
                const pMap: any = {};
                res.data.forEach((p: any) => pMap[p.key] = p.value);
                setParams(pMap);
            } else if (view === 'users') {
                const res = await systemService.getUsers();
                setUsers(res.data);
            } else if (view === 'perms') {
                const res = await systemService.getRoles();
                setRoles(res.data);
            } else if (view === 'logs') {
                const res = await systemService.getLogs();
                setLogs(res.data);
            }
        } catch (err) {
            logger.error("Fetch system data failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (subView) setView(subView);
    }, [subView]);

    useEffect(() => {
        fetchData();
    }, [view]);

    const handleSaveParams = async () => {
        setLoading(true);
        try {
            await systemService.saveParams(params);
            alert("Đã lưu cấu hình hệ thống");
        } catch (err) {
            alert("Lỗi khi lưu cấu hình");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];

            if (view === 'users') {
                actions.push({
                    label: 'Thêm tài khoản',
                    icon: 'person_add',
                    onClick: () => setShowModal('user'),
                    primary: true
                });
            } else if (view === 'perms') {
                actions.push({
                    label: 'Cấu hình vai trò',
                    icon: 'shield_person',
                    onClick: () => setShowModal('role'),
                    primary: true
                });
            } else if (view === 'backup') {
                actions.push({
                    label: 'Sao lưu ngay',
                    icon: 'cloud_upload',
                    onClick: () => setShowModal('backup'),
                    primary: true
                });
            }

            if (view !== 'params') {
                actions.push({
                    label: 'Kết xuất',
                    icon: 'print',
                    onClick: () => triggerBrowserPrint()
                });
            }

            onSetHeader({ title: info.title, icon: info.icon, actions });
        }
    }, [view, onSetHeader, info.title, info.icon]);

    // Print handler
    useSimplePrint(printSignal, 'Hệ thống', { allowBrowserPrint: true });

    const userColumns: ColumnDef[] = [
        { field: 'username', headerName: 'Tên đăng nhập', width: 'w-40' },
        { field: 'fullname', headerName: 'Họ và tên', width: 'min-w-[200px]' },
        { field: 'role', headerName: 'Vai trò / Nhóm', width: 'w-48', renderCell: (v: string) => <span className="text-blue-600 dark:text-blue-400 font-medium">{v}</span> },
        { field: 'last_login', headerName: 'Đăng nhập cuối', width: 'w-48', align: 'center', renderCell: (v: string) => formatDateTimeVN(v) },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{v === 'Active' ? 'Hoạt động' : 'Đã khóa'}</span>
            )
        },
    ];

    const permColumns: ColumnDef[] = [
        { field: 'role', headerName: 'Vai trò', width: 'w-40' },
        { field: 'resource', headerName: 'Tài nguyên / Module', width: 'min-w-[200px]' },
        { field: 'view', headerName: 'Xem', width: 'w-20', align: 'center', renderCell: (v: boolean) => <span className={`material-symbols-outlined text-sm ${v ? 'text-emerald-500' : 'text-slate-200'}`}>{v ? 'check_circle' : 'cancel'}</span> },
        { field: 'create', headerName: 'Thêm', width: 'w-20', align: 'center', renderCell: (v: boolean) => <span className={`material-symbols-outlined text-sm ${v ? 'text-emerald-500' : 'text-slate-200'}`}>{v ? 'check_circle' : 'cancel'}</span> },
        { field: 'edit', headerName: 'Sửa', width: 'w-20', align: 'center', renderCell: (v: boolean) => <span className={`material-symbols-outlined text-sm ${v ? 'text-emerald-500' : 'text-slate-200'}`}>{v ? 'check_circle' : 'cancel'}</span> },
        { field: 'delete', headerName: 'Xóa', width: 'w-20', align: 'center', renderCell: (v: boolean) => <span className={`material-symbols-outlined text-sm ${v ? 'text-emerald-500' : 'text-slate-200'}`}>{v ? 'check_circle' : 'cancel'}</span> },
    ];

    const backupColumns: ColumnDef[] = [
        { field: 'date', headerName: 'Thời điểm sao lưu', width: 'w-48', align: 'center', renderCell: (v: string) => formatDateVN(v) },
        { field: 'type', headerName: 'Phân loại', width: 'w-32', align: 'center' },
        { field: 'size', headerName: 'Kích thước', width: 'w-32', align: 'right' },
        { field: 'file', headerName: 'Tên file nén', width: 'flex-1' },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Thành công' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{v}</span>
            )
        },
    ];

    // ModuleOverview for System module
    if (view === 'overview') {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.system?.title || 'Quản trị Hệ thống'}
                description={MODULE_CONFIGS.system?.description || 'Quản lý người dùng, phân quyền và cấu hình hệ thống'}
                icon={MODULE_CONFIGS.system?.icon || 'settings'}
                iconColor={MODULE_CONFIGS.system?.iconColor || 'purple'}
                workflow={MODULE_CONFIGS.system?.workflow || []}
                features={MODULE_CONFIGS.system?.features || []}
                onNavigate={(viewId) => onNavigate && onNavigate(viewId)}
                stats={[
                    { icon: 'group', label: 'Người dùng', value: users.length || '-', color: 'blue' },
                    { icon: 'security', label: 'Vai trò', value: roles.length || '-', color: 'green' },
                    { icon: 'history', label: 'Logs', value: logs.length || '-', color: 'amber' },
                    { icon: 'check_circle', label: 'Trạng thái', value: 'Hoạt động', color: 'green' },
                ]}
            />
        );
    }

    // Handle Audit Trail sub-view
    if (view === 'audit_trail') {
        return <AuditTrailModule onSetHeader={onSetHeader} />;
    }

    // Default System layout (sidebar + content)
    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">

            <div className="flex-1 overflow-hidden relative">
                {view === 'params' && (
                    <div className="h-full overflow-auto p-8">
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

                            {/* Enterprise Information Section */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-emerald-600">domain</span>
                                    Thông tin Doanh nghiệp (Dùng cho Báo cáo)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên doanh nghiệp</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                            value={params.unit_name || ''}
                                            onChange={e => setParams({ ...params, unit_name: e.target.value })}
                                            placeholder="VD: Công ty TNHH ABC..."
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ trụ sở</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                            value={params.unit_address || ''}
                                            onChange={e => setParams({ ...params, unit_address: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã số thuế</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-bold text-blue-600 focus:border-blue-500 transition-colors"
                                            value={params.unit_tax_code || ''}
                                            onChange={e => setParams({ ...params, unit_tax_code: e.target.value })}
                                            placeholder="VD: 0102345678"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                            value={params.unit_phone || ''}
                                            onChange={e => setParams({ ...params, unit_phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                            value={params.unit_email || ''}
                                            onChange={e => setParams({ ...params, unit_email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Website</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                            value={params.unit_website || ''}
                                            onChange={e => setParams({ ...params, unit_website: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giám đốc / Người đại diện</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                            value={params.unit_head_name || ''}
                                            onChange={e => setParams({ ...params, unit_head_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kế toán trưởng</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                            value={params.unit_chief_accountant || ''}
                                            onChange={e => setParams({ ...params, unit_chief_accountant: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Accounting Settings */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-blue-600">account_balance</span>
                                        Thiết lập Kế toán
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chế độ kế toán</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                                value={params.accounting_regime || 'CIRCULAR_99_2025'}
                                                onChange={e => setParams({ ...params, accounting_regime: e.target.value })}
                                            >
                                                <option value="CIRCULAR_99_2025">Thông tư 99/2025/TT-BTC (Doanh nghiệp)</option>
                                                <option value="CIRCULAR_200_2014">Thông tư 200/2014/TT-BTC (DN cũ)</option>
                                                <option value="CIRCULAR_133_2016">Thông tư 133/2016/TT-BTC (DN nhỏ)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đồng tiền hạch toán</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                                value={params.base_currency || 'VND'}
                                                onChange={e => setParams({ ...params, base_currency: e.target.value })}
                                            >
                                                <option value="VND">Việt Nam Đồng (VND)</option>
                                                <option value="USD">Đô la Mỹ (USD)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Format Settings */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-amber-600">format_list_numbered</span>
                                        Tham số định dạng
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Định dạng số thập phân</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none font-medium text-slate-800 dark:text-white focus:border-blue-500 transition-colors"
                                                value={params.decimal_format || 'vi-VN'}
                                                onChange={(e) => {
                                                    setParams({ ...params, decimal_format: e.target.value });
                                                    localStorage.setItem('decimalFormat', e.target.value);
                                                }}
                                            >
                                                <option value="vi-VN">1.234.567,89 (VN)</option>
                                                <option value="en-US">1,234,567.89 (INT)</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between py-2">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Cho phép xuất quá tồn kho</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={params.allow_negative_inventory === '1'}
                                                    onChange={e => setParams({ ...params, allow_negative_inventory: e.target.checked ? '1' : '0' })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSaveParams}
                                    disabled={loading}
                                    className="bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-10 py-3 rounded-xl font-bold shadow-xl hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">save</span>
                                    {loading ? 'Đang lưu...' : 'Lưu cấu hình hệ thống'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'users' && <SmartTable data={users} columns={userColumns} keyField="id" minRows={15} />}
                {view === 'perms' && <SmartTable data={roles} columns={permColumns} keyField="id" minRows={15} />}
                {view === 'backup' && <BackupRestoreView />}
                {view === 'logs' && (
                    <AccessLogsView logs={logs} loading={loading} onRefresh={fetchData} />
                )}
            </div>

            {/* MODALS */}
            {showModal === 'user' && (
                <UserFormModal
                    onClose={() => setShowModal(null)}
                    onSave={() => { fetchData(); setShowModal(null); }}
                />
            )}
            {showModal === 'role' && (
                <RolePermModal
                    onClose={() => setShowModal(null)}
                    onSave={() => { fetchData(); setShowModal(null); }}
                />
            )}
            {showModal === 'backup' && <BackupConfirmModal onClose={() => setShowModal(null)} />}
        </div>
    );
};

// --- SUB-COMPONENTS (MODALS) ---

const Modal = ({ title, icon, onClose, children }: { title: string, icon: string, onClose: () => void, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} sizeClass="max-w-xl" icon={icon}>
        {children}
    </FormModal>
);

const UserFormModal = ({ onClose, onSave }: { onClose: () => void, onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        fullname: '',
        password: '',
        role: 'Kế toán viên',
        status: 'Active'
    });

    const handleSave = async () => {
        if (!formData.username || !formData.fullname) {
            alert("Vui lòng nhập đầy đủ thông tin");
            return;
        }
        setLoading(true);
        try {
            await systemService.saveUser(formData);
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu người dùng");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Thêm tài khoản người dùng" icon="person_add" onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="form-label">Tên đăng nhập / Email</label>
                    <input type="text" className="form-input font-bold"
                        value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="username..." />
                </div>
                <div>
                    <label className="form-label">Họ và tên</label>
                    <input type="text" className="form-input"
                        value={formData.fullname} onChange={e => setFormData({ ...formData, fullname: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Mật khẩu khởi tạo</label>
                    <input type="password" placeholder="Syntex@123" className="form-input"
                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Vai trò hệ thống</label>
                    <select className="form-select font-medium text-blue-600"
                        value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                        <option>Kế toán viên</option>
                        <option>Kế toán trưởng</option>
                        <option>Nhân viên bán hàng</option>
                        <option>Quản trị hệ thống</option>
                    </select>
                </div>
                <div className="mt-6 form-actions pt-4">
                    <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                    <button onClick={handleSave} disabled={loading} className="form-button-primary">
                        {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const RolePermModal = ({ onClose, onSave }: { onClose: () => void, onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: 'new_role',
        name: '',
        permissions: {} as any
    });

    const handleSave = async () => {
        if (!formData.name) {
            alert("Vui lòng nhập tên vai trò");
            return;
        }
        setLoading(true);
        try {
            await systemService.saveRole(formData);
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu vai trò");
        } finally {
            setLoading(false);
        }
    };

    const modules = ['Tổng hợp', 'Tiền mặt', 'Mua hàng', 'Bán hàng', 'Tài sản', 'Hệ thống'];

    return (
        <Modal title="Cấu hình quyền hạn theo vai trò" icon="admin_panel_settings" onClose={onClose}>
            <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed italic">
                        Chọn vai trò để thiết lập tài nguyên được phép truy cập. Các thay đổi sẽ có hiệu lực ngay sau khi người dùng đăng nhập lại.
                    </p>
                </div>
                <div>
                    <label className="form-label">Tên vai trò / Nhóm</label>
                    <input type="text" className="form-input font-bold"
                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {modules.map(m => (
                        <div key={m} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{m}</span>
                            <div className="flex gap-4">
                                {['R', 'W', 'D'].map(p => (
                                    <label key={p} className="flex items-center gap-1">
                                        <input type="checkbox" className="w-3.5 h-3.5 accent-emerald-600" />
                                        <span className="text-[10px] font-bold text-slate-400">{p}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 form-actions pt-4">
                    <button onClick={onClose} className="form-button-secondary">Đóng</button>
                    <button onClick={handleSave} disabled={loading} className="form-button-primary bg-emerald-600 hover:bg-emerald-700">
                        {loading ? 'Đang lưu...' : 'Lưu quyền hạn'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const BackupConfirmModal = ({ onClose }: { onClose: () => void }) => (
    <Modal title="Xác nhận sao lưu hệ thống" icon="cloud_sync" onClose={onClose}>
        <div className="space-y-6 text-center py-4">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-amber-600 animate-pulse">backup</span>
            </div>
            <div className="space-y-2">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Thực hiện sao lưu tức thời?</h4>
                <p className="text-sm text-slate-500 leading-relaxed px-4">
                    Hệ thống sẽ tiến hành đóng gói toàn bộ dữ liệu hạch toán, tệp tin đính kèm và cấu hình. Quá trình này có thể tốn vài phút tùy vào dung lượng dữ liệu hiện tại.
                </p>
            </div>
            <div className="flex items-center gap-4 pt-6">
                <button onClick={onClose} className="flex-1 px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all border border-slate-100 dark:border-slate-800">Để sau</button>
                <button onClick={onClose} className="flex-1 bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-xl shadow-amber-500/30 hover:bg-amber-700 transition-all flex items-center justify-center gap-2">
                    Bắt đầu ngay
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
            </div>
        </div>
    </Modal>
);
