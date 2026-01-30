/**
 * Audit Trail Module
 * SyntexLegger - Hệ thống Dấu vết Kiểm toán
 *
 * Provides UI for:
 * - Viewing audit trail history
 * - Managing anomalies
 * - Viewing reconciliation records
 * - Audit statistics dashboard
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auditService } from '../api';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { SmartTable } from './SmartTable';
import type { ColumnDef } from './SmartTable';
import { FormModal, FormSection, FormGrid, FormField, FormButton, FormActions } from './FormModal';

// Types
interface AuditEntry {
    id: string;
    entity_type: string;
    entity_id: string;
    doc_no: string | null;
    action: string;
    action_category: string;
    old_values: any;
    new_values: any;
    changed_fields: string[];
    username: string;
    user_role: string;
    ip_address: string;
    created_at: string;
    fiscal_year: number;
    fiscal_period: number;
    amount: number | null;
    account_code: string | null;
    reason: string | null;
}

interface Anomaly {
    id: string;
    anomaly_type: string;
    severity: string;
    entity_type: string;
    entity_id: string;
    doc_no: string | null;
    description: string;
    detected_value: string;
    expected_value: string;
    status: string;
    detected_at: string;
    amount_impact: number | null;
    risk_score: number | null;
    resolution_notes: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
}

interface AuditStatistics {
    actionCounts: { action: string; count: number }[];
    userActivity: { username: string; count: number }[];
    anomalySummary: { anomaly_type: string; severity: string; status: string; count: number }[];
    openAnomalies: number;
    recentActivity: { date: string; count: number }[];
}

// Sub-tabs
type AuditTab = 'overview' | 'trail' | 'anomalies' | 'reconciliation' | 'statistics';

interface AuditTrailModuleProps {
    onSetHeader?: (header: any) => void;
}

export const AuditTrailModule: React.FC<AuditTrailModuleProps> = ({ onSetHeader }) => {
    // State
    const [activeTab, setActiveTab] = useState<AuditTab>('trail');

    // Update header
    useEffect(() => {
        if (onSetHeader) {
            onSetHeader({
                title: 'Dấu vết Kiểm toán',
                icon: 'history_edu'
            });
        }
    }, [onSetHeader]);
    const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [filters, setFilters] = useState({
        entity_type: '',
        action: '',
        username: '',
        from_date: '',
        to_date: '',
        fiscal_year: new Date().getFullYear(),
    });

    const [anomalyFilters, setAnomalyFilters] = useState({
        anomaly_type: '',
        severity: '',
        status: 'OPEN',
    });

    // Modal state
    const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
    const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
    const [resolveNotes, setResolveNotes] = useState('');

    // Load audit trail
    const loadAuditTrail = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await auditService.getAuditTrail({
                ...filters,
                fiscal_year: filters.fiscal_year || undefined,
                limit: 100,
            });
            setAuditEntries(response.data.data || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load audit trail');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Load anomalies
    const loadAnomalies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await auditService.getAnomalies({
                ...anomalyFilters,
                fiscal_year: filters.fiscal_year,
                limit: 100,
            });
            setAnomalies(response.data.data || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load anomalies');
        } finally {
            setLoading(false);
        }
    }, [anomalyFilters, filters.fiscal_year]);

    // Load statistics
    const loadStatistics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await auditService.getStatistics({ fiscal_year: filters.fiscal_year });
            setStatistics(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load statistics');
        } finally {
            setLoading(false);
        }
    }, [filters.fiscal_year]);

    // Reconciliation Logic
    const [reconciliations, setReconciliations] = useState<any[]>([]);
    const [showReconModal, setShowReconModal] = useState(false);
    const [newRecon, setNewRecon] = useState({
        recon_type: 'BANK',
        fiscal_year: new Date().getFullYear(),
        fiscal_period: new Date().getMonth() + 1,
        account_code: '1121',
        book_balance: 0,
        external_balance: 0,
        notes: ''
    });

    const loadReconciliations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await auditService.getReconciliations({
                fiscal_year: filters.fiscal_year,
                limit: 50
            });
            setReconciliations(response.data || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load reconciliations');
        } finally {
            setLoading(false);
        }
    }, [filters.fiscal_year]);

    const handleCreateRecon = async () => {
        setLoading(true);
        try {
            await auditService.createReconciliation(newRecon);
            setShowReconModal(false);
            loadReconciliations();
            alert('Đã tạo biên bản đối chiếu thành công');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Create failed');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveRecon = async (id: string) => {
        if (!confirm('Xác nhận phê duyệt biên bản đối chiếu này?')) return;
        setLoading(true);
        try {
            await auditService.approveReconciliation(id);
            loadReconciliations();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Approval failed');
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        if (activeTab === 'trail') loadAuditTrail();
        else if (activeTab === 'anomalies') loadAnomalies();
        else if (activeTab === 'reconciliation') loadReconciliations();
        else if (activeTab === 'statistics') loadStatistics();
    }, [activeTab, loadAuditTrail, loadAnomalies, loadStatistics, loadReconciliations]);

    // Run anomaly detection
    const handleRunDetection = async () => {
        if (!confirm('Chạy kiểm tra phát hiện bất thường? Quá trình này có thể mất vài phút.')) return;
        setLoading(true);
        try {
            const response = await auditService.runAnomalyDetection({ fiscal_year: filters.fiscal_year });
            alert(`Đã phát hiện ${response.data.detected_count} bất thường mới.`);
            loadAnomalies();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Detection failed');
        } finally {
            setLoading(false);
        }
    };

    // Resolve anomaly
    const handleResolveAnomaly = async (anomaly: Anomaly, action: 'resolve' | 'acknowledge' | 'false_positive') => {
        if (!resolveNotes && action === 'resolve') {
            alert('Vui lòng nhập ghi chú giải quyết');
            return;
        }

        setLoading(true);
        try {
            if (action === 'acknowledge') {
                await auditService.acknowledgeAnomaly(anomaly.id, { notes: resolveNotes });
            } else {
                await auditService.resolveAnomaly(anomaly.id, {
                    resolution_notes: resolveNotes,
                    status: action === 'false_positive' ? 'FALSE_POSITIVE' : 'RESOLVED',
                });
            }
            setSelectedAnomaly(null);
            setResolveNotes('');
            loadAnomalies();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to resolve anomaly');
        } finally {
            setLoading(false);
        }
    };

    // Export audit trail
    const handleExport = async (format: 'json' | 'csv') => {
        setLoading(true);
        try {
            const response = await auditService.exportAuditTrail({
                format,
                ...filters,
                fiscal_year: filters.fiscal_year || undefined,
            });

            if (format === 'csv') {
                const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
            } else {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Export failed');
        } finally {
            setLoading(false);
        }
    };

    // SmartTable columns for Audit Trail
    const auditColumns: ColumnDef[] = useMemo(() => [
        {
            field: 'created_at',
            headerName: 'Thời gian',
            width: '150px',
            renderCell: (value: string) => (
                <span className="text-sm text-gray-500">{new Date(value).toLocaleString('vi-VN')}</span>
            )
        },
        {
            field: 'entity_type',
            headerName: 'Loại',
            width: '100px',
            renderCell: (value: string) => (
                <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">{value}</span>
            )
        },
        {
            field: 'action',
            headerName: 'Hành động',
            width: '100px',
            renderCell: (value: string) => (
                <span className={`px-2 py-1 rounded text-xs ${value === 'DELETE' ? 'bg-red-100 text-red-800' :
                    value === 'CREATE' ? 'bg-green-100 text-green-800' :
                        value === 'APPROVE' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                    }`}>
                    {value}
                </span>
            )
        },
        {
            field: 'doc_no',
            headerName: 'Số CT',
            width: '100px',
            renderCell: (value: string | null) => (
                <span className="text-sm font-mono">{value || '-'}</span>
            )
        },
        {
            field: 'username',
            headerName: 'Người dùng',
            width: '120px'
        },
        {
            field: 'amount',
            headerName: 'Số tiền',
            width: '110px',
            align: 'right',
            renderCell: (value: number | null) => (
                <span className="text-sm">{value ? value.toLocaleString('vi-VN') : '-'}</span>
            )
        },
        {
            field: 'changed_fields',
            headerName: 'Thay đổi',
            width: '150px',
            renderCell: (value: string[]) => (
                <span className="text-sm text-gray-500">
                    {Array.isArray(value) ? value.slice(0, 3).join(', ') : ''}
                    {Array.isArray(value) && value.length > 3 && '...'}
                </span>
            )
        },
        {
            field: 'actions',
            headerName: 'Chi tiết',
            width: '80px',
            align: 'center',
            type: 'actions',
            renderCell: (_value: any, row: AuditEntry) => (
                <button
                    onClick={() => setSelectedEntry(row)}
                    className="text-blue-600 hover:text-blue-800"
                >
                    <span className="material-symbols-outlined text-lg">visibility</span>
                </button>
            )
        }
    ], []);

    // SmartTable columns for Reconciliation
    const reconColumns: ColumnDef[] = useMemo(() => [
        {
            field: 'created_at',
            headerName: 'Ngày tạo',
            width: '110px',
            renderCell: (value: string) => (
                <span className="text-sm text-gray-500">{new Date(value || new Date()).toLocaleDateString('vi-VN')}</span>
            )
        },
        {
            field: 'recon_type',
            headerName: 'Loại',
            width: '90px',
            renderCell: (value: string) => (
                <span className="text-sm font-medium">{value}</span>
            )
        },
        {
            field: 'fiscal_period',
            headerName: 'Kỳ/Năm',
            width: '100px',
            renderCell: (value: number, row: any) => (
                <span className="text-sm text-gray-500">T{value}/{row.fiscal_year}</span>
            )
        },
        {
            field: 'account_code',
            headerName: 'Tài khoản',
            width: '100px',
            renderCell: (value: string) => (
                <span className="text-sm font-mono">{value}</span>
            )
        },
        {
            field: 'book_balance',
            headerName: 'Số dư sổ sách',
            width: '130px',
            align: 'right',
            renderCell: (value: number) => (
                <span className="text-sm">{value?.toLocaleString('vi-VN')}</span>
            )
        },
        {
            field: 'external_balance',
            headerName: 'Số dư thực tế',
            width: '130px',
            align: 'right',
            renderCell: (value: number) => (
                <span className="text-sm">{value?.toLocaleString('vi-VN')}</span>
            )
        },
        {
            field: 'difference',
            headerName: 'Chênh lệch',
            width: '110px',
            align: 'right',
            renderCell: (value: number) => (
                <span className={`text-sm font-bold ${value !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {value?.toLocaleString('vi-VN')}
                </span>
            )
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            width: '100px',
            align: 'center',
            renderCell: (value: string) => (
                <span className={`px-2 py-1 rounded text-xs ${value === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    value === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {value}
                </span>
            )
        },
        {
            field: 'actions',
            headerName: 'Thao tác',
            width: '100px',
            align: 'center',
            type: 'actions',
            renderCell: (_value: any, row: any) => {
                if (row.status !== 'APPROVED') {
                    return (
                        <button
                            onClick={() => handleApproveRecon(row.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                            Phê duyệt
                        </button>
                    );
                }
                return null;
            }
        }
    ], []);

    // Render tabs
    const renderTabs = () => (
        <div className="flex border-b border-gray-200 dark:border-slate-700">
            {[
                { key: 'trail', label: 'Dấu vết Kiểm toán', icon: 'history' },
                { key: 'anomalies', label: 'Bất thường', icon: 'warning' },
                { key: 'reconciliation', label: 'Đối chiếu', icon: 'compare_arrows' },
                { key: 'statistics', label: 'Thống kê', icon: 'analytics' },
            ].map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as AuditTab)}
                    className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </div>
    );

    // Render audit trail tab
    const renderAuditTrail = () => (
        <div>
            {/* Filters */}
            <div className="bg-gray-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-6 gap-4">
                    <select
                        value={filters.entity_type}
                        onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        <option value="">Tất cả loại</option>
                        <option value="VOUCHER">Chứng từ</option>
                        <option value="BUDGET_ESTIMATE">Dự toán</option>
                        <option value="BUDGET_AUTHORIZATION">Phê duyệt NS</option>
                        <option value="PARTNER">Đối tác</option>
                        <option value="ASSET">Tài sản</option>
                        <option value="USER_SESSION">Phiên đăng nhập</option>
                    </select>

                    <select
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        <option value="">Tất cả hành động</option>
                        <option value="CREATE">Tạo mới</option>
                        <option value="UPDATE">Cập nhật</option>
                        <option value="DELETE">Xóa</option>
                        <option value="POST">Ghi sổ</option>
                        <option value="APPROVE">Phê duyệt</option>
                        <option value="REJECT">Từ chối</option>
                        <option value="LOCK">Khóa kỳ</option>
                        <option value="LOGIN">Đăng nhập</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Người dùng"
                        value={filters.username}
                        onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    />

                    <input
                        type="date"
                        value={filters.from_date}
                        onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    />

                    <input
                        type="date"
                        value={filters.to_date}
                        onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={loadAuditTrail}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                            Tìm kiếm
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            title="Xuất CSV"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {auditEntries.length === 0 && !loading ? (
                <p className="text-center text-gray-500 py-8">Không có dữ liệu</p>
            ) : (
                <SmartTable
                    columns={auditColumns}
                    data={auditEntries}
                    keyField="id"
                    readOnly={true}
                    showFormulaBar={false}
                    showStatusBar={false}
                    showRowNumbers={false}
                    stickyHeader={true}
                    bordered={false}
                />
            )}
        </div>
    );

    // Render anomalies tab
    const renderAnomalies = () => (
        <div>
            {/* Filters & Actions */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 flex justify-between items-center">
                <div className="flex gap-4">
                    <select
                        value={anomalyFilters.anomaly_type}
                        onChange={(e) => setAnomalyFilters({ ...anomalyFilters, anomaly_type: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        <option value="">Tất cả loại</option>
                        <option value="BUDGET_OVERRUN">Vượt dự toán</option>
                        <option value="DUPLICATE_DOC">Trùng số CT</option>
                        <option value="RISKY_PARTNER">Đối tác rủi ro</option>
                        <option value="INVALID_ACCOUNT">TK không hợp lệ</option>
                        <option value="DATE_VIOLATION">Vi phạm ngày</option>
                        <option value="UNUSUAL_AMOUNT">Số tiền bất thường</option>
                    </select>

                    <select
                        value={anomalyFilters.severity}
                        onChange={(e) => setAnomalyFilters({ ...anomalyFilters, severity: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        <option value="">Tất cả mức độ</option>
                        <option value="CRITICAL">Nghiêm trọng</option>
                        <option value="HIGH">Cao</option>
                        <option value="MEDIUM">Trung bình</option>
                        <option value="LOW">Thấp</option>
                    </select>

                    <select
                        value={anomalyFilters.status}
                        onChange={(e) => setAnomalyFilters({ ...anomalyFilters, status: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="OPEN">Chưa xử lý</option>
                        <option value="ACKNOWLEDGED">Đã ghi nhận</option>
                        <option value="RESOLVED">Đã giải quyết</option>
                        <option value="FALSE_POSITIVE">Cảnh báo sai</option>
                    </select>

                    <button
                        onClick={loadAnomalies}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                        Lọc
                    </button>
                </div>

                <button
                    onClick={handleRunDetection}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    Chạy kiểm tra
                </button>
            </div>

            {/* Anomaly Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anomalies.map((anomaly) => (
                    <div
                        key={anomaly.id}
                        className={`p-4 rounded-lg border-l-4 ${anomaly.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                            anomaly.severity === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                                anomaly.severity === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                                    'border-blue-500 bg-blue-50'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${anomaly.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                    anomaly.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                                        anomaly.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                            'bg-blue-200 text-blue-800'
                                    }`}>
                                    {anomaly.severity}
                                </span>
                                <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs">
                                    {anomaly.anomaly_type}
                                </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs ${anomaly.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                                anomaly.status === 'ACKNOWLEDGED' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {anomaly.status}
                            </span>
                        </div>

                        <p className="text-sm font-medium text-gray-800 mb-1">{anomaly.description}</p>

                        <div className="text-xs text-gray-500 mb-2">
                            {anomaly.doc_no && <span className="mr-3">CT: {anomaly.doc_no}</span>}
                            {anomaly.amount_impact && (
                                <span className="mr-3">Ảnh hưởng: {anomaly.amount_impact.toLocaleString('vi-VN')} VND</span>
                            )}
                            <span>Phát hiện: {new Date(anomaly.detected_at).toLocaleDateString('vi-VN')}</span>
                        </div>

                        {anomaly.status === 'OPEN' && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => setSelectedAnomaly(anomaly)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                >
                                    Xử lý
                                </button>
                            </div>
                        )}

                        {anomaly.resolution_notes && (
                            <p className="mt-2 text-xs text-gray-600 italic">
                                Giải quyết bởi {anomaly.resolved_by}: {anomaly.resolution_notes}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {anomalies.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-8">Không có bất thường nào</p>
            )}
        </div>
    );

    // Render statistics tab
    const renderStatistics = () => (
        <div>
            {statistics && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {statistics.actionCounts?.reduce((sum, a) => sum + a.count, 0) || 0}
                            </div>
                            <div className="text-sm text-gray-600">Tổng hành động</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {statistics.userActivity?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">Người dùng hoạt động</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                                {statistics.openAnomalies || 0}
                            </div>
                            <div className="text-sm text-gray-600">Bất thường chưa xử lý</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {statistics.recentActivity?.reduce((sum, a) => sum + a.count, 0) || 0}
                            </div>
                            <div className="text-sm text-gray-600">Hoạt động 7 ngày qua</div>
                        </div>
                    </div>

                    {/* Action Breakdown */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-medium text-gray-700 mb-3">Phân bố hành động</h4>
                            <div className="space-y-2">
                                {statistics.actionCounts?.map((action) => (
                                    <div key={action.action} className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">{action.action}</span>
                                        <span className="text-sm font-medium">{action.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-medium text-gray-700 mb-3">Top người dùng</h4>
                            <div className="space-y-2">
                                {statistics.userActivity?.slice(0, 5).map((user) => (
                                    <div key={user.username} className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">{user.username}</span>
                                        <span className="text-sm font-medium">{user.count} hành động</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Chart (simple bar representation) */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-700 mb-3">Hoạt động 7 ngày qua</h4>
                        <div className="flex items-end gap-2 h-32">
                            {statistics.recentActivity?.map((day) => {
                                const maxCount = Math.max(...statistics.recentActivity.map(d => d.count));
                                const height = maxCount > 0 ? (day.count / maxCount * 100) : 0;
                                return (
                                    <div key={day.date} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-blue-500 rounded-t"
                                            style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                                        />
                                        <span className="text-xs text-gray-500 mt-1">
                                            {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );


    // Render reconciliation tab
    const renderReconciliation = () => (
        <div>
            <div className="bg-gray-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Danh sách Biên bản Đối chiếu</h3>
                <button
                    onClick={() => setShowReconModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Tạo đối chiếu mới
                </button>
            </div>

            {reconciliations.length === 0 && !loading ? (
                <p className="text-center text-gray-500 py-8">Chưa có biên bản đối chiếu nào</p>
            ) : (
                <SmartTable
                    columns={reconColumns}
                    data={reconciliations}
                    keyField="id"
                    readOnly={true}
                    showFormulaBar={false}
                    showStatusBar={false}
                    showRowNumbers={false}
                    stickyHeader={true}
                    bordered={false}
                />
            )}

            {/* Create Recon Modal */}
            {showReconModal && (
                <FormModal
                    title="Tạo biên bản đối chiếu mới"
                    icon="compare_arrows"
                    size="sm"
                    headerVariant="minimal"
                    onClose={() => setShowReconModal(false)}
                    footer={
                        <FormActions>
                            <FormButton variant="secondary" onClick={() => setShowReconModal(false)}>Hủy</FormButton>
                            <FormButton variant="primary" icon="save" onClick={handleCreateRecon}>Lưu</FormButton>
                        </FormActions>
                    }
                >
                    <div className="space-y-3">
                        <FormField label="Loại đối chiếu">
                            <select
                                className="form-select"
                                value={newRecon.recon_type}
                                onChange={e => setNewRecon({ ...newRecon, recon_type: e.target.value })}
                            >
                                <option value="BANK">Ngân hàng (Sổ phụ)</option>
                                <option value="INVENTORY">Kiểm kê kho</option>
                                <option value="ASSET">Kiểm kê tài sản</option>
                                <option value="RECEIVABLE">Công nợ phải thu</option>
                                <option value="PAYABLE">Công nợ phải trả</option>
                            </select>
                        </FormField>

                        <FormGrid cols={2}>
                            <FormField label="Kỳ">
                                <input type="number" className="form-input"
                                    value={newRecon.fiscal_period}
                                    onChange={e => setNewRecon({ ...newRecon, fiscal_period: parseInt(e.target.value) })}
                                />
                            </FormField>
                            <FormField label="Năm">
                                <input type="number" className="form-input"
                                    value={newRecon.fiscal_year}
                                    onChange={e => setNewRecon({ ...newRecon, fiscal_year: parseInt(e.target.value) })}
                                />
                            </FormField>
                        </FormGrid>

                        <FormField label="Tài khoản">
                            <input type="text" className="form-input"
                                value={newRecon.account_code}
                                onChange={e => setNewRecon({ ...newRecon, account_code: e.target.value })}
                            />
                        </FormField>

                        <FormGrid cols={2}>
                            <FormField label="Số dư sổ sách (System)">
                                <input type="number" className="form-input"
                                    value={newRecon.book_balance}
                                    onChange={e => setNewRecon({ ...newRecon, book_balance: parseFloat(e.target.value) })}
                                />
                            </FormField>
                            <FormField label="Số dư thực tế (External)">
                                <input type="number" className="form-input"
                                    value={newRecon.external_balance}
                                    onChange={e => setNewRecon({ ...newRecon, external_balance: parseFloat(e.target.value) })}
                                />
                            </FormField>
                        </FormGrid>

                        <FormField label="Ghi chú">
                            <textarea className="form-textarea" rows={2}
                                value={newRecon.notes}
                                onChange={e => setNewRecon({ ...newRecon, notes: e.target.value })}
                            ></textarea>
                        </FormField>
                    </div>
                </FormModal>
            )}
        </div>
    );

    // Entry detail modal
    const renderEntryModal = () => {
        if (!selectedEntry) return null;

        return (
            <FormModal
                title="Chi tiết Dấu vết Kiểm toán"
                icon="history_edu"
                size="lg"
                headerVariant="minimal"
                onClose={() => setSelectedEntry(null)}
            >
                <div className="space-y-4">
                    <FormGrid cols={2} gap="sm">
                        <div>
                            <label className="form-label">ID</label>
                            <p className="font-mono text-sm">{selectedEntry.id}</p>
                        </div>
                        <div>
                            <label className="form-label">Thời gian</label>
                            <p className="text-sm">{new Date(selectedEntry.created_at).toLocaleString('vi-VN')}</p>
                        </div>
                        <div>
                            <label className="form-label">Loại</label>
                            <p className="text-sm">{selectedEntry.entity_type}</p>
                        </div>
                        <div>
                            <label className="form-label">Hành động</label>
                            <p className="text-sm">{selectedEntry.action}</p>
                        </div>
                        <div>
                            <label className="form-label">Người dùng</label>
                            <p className="text-sm">{selectedEntry.username} ({selectedEntry.user_role})</p>
                        </div>
                        <div>
                            <label className="form-label">IP</label>
                            <p className="text-sm font-mono">{selectedEntry.ip_address || '-'}</p>
                        </div>
                    </FormGrid>

                    {selectedEntry.changed_fields?.length > 0 && (
                        <div>
                            <label className="form-label">Trường thay đổi</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {selectedEntry.changed_fields.map((field, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">
                                        {field}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedEntry.old_values && (
                        <FormSection title="Giá trị cũ" variant="highlight" color="red">
                            <pre className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-x-auto max-h-40">
                                {JSON.stringify(selectedEntry.old_values, null, 2)}
                            </pre>
                        </FormSection>
                    )}

                    {selectedEntry.new_values && (
                        <FormSection title="Giá trị mới" variant="highlight" color="green">
                            <pre className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs overflow-x-auto max-h-40">
                                {JSON.stringify(selectedEntry.new_values, null, 2)}
                            </pre>
                        </FormSection>
                    )}

                    {selectedEntry.reason && (
                        <div>
                            <label className="form-label">Lý do</label>
                            <p className="text-sm">{selectedEntry.reason}</p>
                        </div>
                    )}
                </div>
            </FormModal>
        );
    };

    // Anomaly resolve modal
    const renderAnomalyModal = () => {
        if (!selectedAnomaly) return null;

        return (
            <FormModal
                title="Xử lý Bất thường"
                icon="warning"
                size="sm"
                headerVariant="minimal"
                onClose={() => { setSelectedAnomaly(null); setResolveNotes(''); }}
                footer={
                    <FormActions>
                        <FormButton
                            variant="secondary"
                            onClick={() => handleResolveAnomaly(selectedAnomaly, 'acknowledge')}
                        >
                            Ghi nhận
                        </FormButton>
                        <FormButton
                            variant="secondary"
                            onClick={() => handleResolveAnomaly(selectedAnomaly, 'false_positive')}
                        >
                            Cảnh báo sai
                        </FormButton>
                        <FormButton
                            variant="success"
                            icon="check_circle"
                            onClick={() => handleResolveAnomaly(selectedAnomaly, 'resolve')}
                        >
                            Giải quyết
                        </FormButton>
                    </FormActions>
                }
            >
                <div className="space-y-4">
                    <FormSection variant="card" color="amber">
                        <p className="font-medium text-sm text-slate-800 dark:text-white">{selectedAnomaly.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {selectedAnomaly.anomaly_type} - {selectedAnomaly.severity}
                        </p>
                    </FormSection>

                    <FormField label="Ghi chú xử lý">
                        <textarea
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            className="form-textarea"
                            rows={3}
                            placeholder="Nhập ghi chú giải quyết..."
                        />
                    </FormField>
                </div>
            </FormModal>
        );
    };

    // Show ModuleOverview when activeTab is 'overview'
    if (activeTab === 'overview') {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.audit.title}
                description={MODULE_CONFIGS.audit.description}
                icon={MODULE_CONFIGS.audit.icon}
                iconColor={MODULE_CONFIGS.audit.iconColor}
                workflow={MODULE_CONFIGS.audit.workflow}
                features={MODULE_CONFIGS.audit.features}
                stats={[
                    { icon: 'history', label: 'Bản ghi Audit', value: auditEntries.length || '-', color: 'blue' },
                    { icon: 'warning', label: 'Bất thường', value: anomalies.length || 0, color: anomalies.length > 0 ? 'red' : 'green' },
                    { icon: 'fact_check', label: 'Đối chiếu', value: reconciliations.length || 0, color: 'amber' },
                    { icon: 'check_circle', label: 'Trạng thái', value: 'Hoạt động', color: 'green' },
                ]}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Dấu vết Kiểm toán</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý và theo dõi lịch sử thay đổi</p>
            </div>

            {error && (
                <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            {loading && (
                <div className="mx-4 mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Đang tải...
                </div>
            )}

            <div className="px-4 pt-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                {renderTabs()}
            </div>

            <div className="flex-1 overflow-auto">
                {activeTab === 'trail' && renderAuditTrail()}
                {activeTab === 'anomalies' && <div className="p-4">{renderAnomalies()}</div>}
                {activeTab === 'reconciliation' && renderReconciliation()}
                {activeTab === 'statistics' && <div className="p-4">{renderStatistics()}</div>}
            </div>

            {renderEntryModal()}
            {renderAnomalyModal()}
        </div>
    );
};


