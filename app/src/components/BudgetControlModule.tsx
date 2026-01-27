/**
 * Budget Control Module
 * SyntexHCSN - Hệ thống Kiểm soát Ngân sách theo TT 24/2024/TT-BTC
 *
 * Provides UI for:
 * - Budget period management (lock/unlock)
 * - Spending authorization workflow
 * - Budget alerts monitoring
 * - Budget utilization dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { budgetControlService, masterDataService } from '../api';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';

// Types
interface BudgetPeriod {
    id: string;
    fiscal_year: number;
    period_type: string;
    period_number: number;
    period_name: string;
    start_date: string;
    end_date: string;
    is_locked: number;
    locked_at: string | null;
    locked_by: string | null;
    lock_reason: string | null;
    warning_threshold: number;
    block_threshold: number;
    allow_override: number;
    status: string;
}

interface SpendingAuthorization {
    id: string;
    request_type: string;
    request_date: string;
    requested_by: string;
    department_code: string | null;
    budget_estimate_id: string | null;
    fund_source_id: string | null;
    fiscal_year: number;
    requested_amount: number;
    approved_amount: number | null;
    budget_available: number;
    purpose: string;
    justification: string | null;
    status: string;
    approved_by: string | null;
    approved_at: string | null;
    approval_notes: string | null;
    expires_at: string;
    item_name?: string;
    item_code?: string;
    fund_source_name?: string;
}

interface BudgetAlert {
    id: string;
    alert_type: string;
    severity: string;
    title: string;
    message: string;
    budget_amount: number;
    spent_amount: number;
    remaining_amount: number;
    threshold_percent: number;
    current_percent: number;
    status: string;
    created_at: string;
    item_name?: string;
    item_code?: string;
}

interface BudgetDashboard {
    fiscal_year: number;
    budgetSummary: {
        total_allocated: number;
        total_committed: number;
        total_spent: number;
        total_available: number;
    };
    utilizationPercent: number;
    pendingAuthorizations: number;
    alertsBySeverity: { severity: string; count: number }[];
    periodStatus: BudgetPeriod[];
    overBudgetItems: { item_code: string; item_name: string; allocated_amount: number; spent_amount: number; over_amount: number }[];
    recentTransactions: any[];
}

// Sub-tabs
type BudgetTab = 'overview' | 'dashboard' | 'periods' | 'authorizations' | 'alerts' | 'reports';

interface BudgetControlModuleProps {
    onSetHeader?: (header: any) => void;
}

export const BudgetControlModule: React.FC<BudgetControlModuleProps> = ({ onSetHeader }) => {
    // State
    const [activeTab, setActiveTab] = useState<BudgetTab>('dashboard');

    // Update header
    useEffect(() => {
        if (onSetHeader) {
            onSetHeader({
                title: 'Kiểm soát Ngân sách',
                icon: 'price_check'
            });
        }
    }, [onSetHeader]);
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data
    const [dashboard, setDashboard] = useState<BudgetDashboard | null>(null);
    const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
    const [authorizations, setAuthorizations] = useState<SpendingAuthorization[]>([]);
    const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
    const [fundSources, setFundSources] = useState<any[]>([]);

    // Modal state
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod | null>(null);
    const [selectedAuth, setSelectedAuth] = useState<SpendingAuthorization | null>(null);
    const [authForm, setAuthForm] = useState({
        request_type: 'SPENDING',
        budget_estimate_id: '',
        fund_source_id: '',
        requested_amount: 0,
        purpose: '',
        justification: '',
    });
    const [lockReason, setLockReason] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');

    // Load dashboard
    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await budgetControlService.getDashboard({ fiscal_year: fiscalYear });
            setDashboard(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, [fiscalYear]);

    // Load periods
    const loadPeriods = useCallback(async () => {
        setLoading(true);
        try {
            const response = await budgetControlService.getPeriods({ fiscal_year: fiscalYear });
            setPeriods(response.data.periods || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load periods');
        } finally {
            setLoading(false);
        }
    }, [fiscalYear]);

    // Load authorizations
    const loadAuthorizations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await budgetControlService.getAuthorizations({ fiscal_year: fiscalYear });
            setAuthorizations(response.data || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load authorizations');
        } finally {
            setLoading(false);
        }
    }, [fiscalYear]);

    // Load alerts
    const loadAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await budgetControlService.getAlerts({ fiscal_year: fiscalYear });
            setAlerts(response.data.alerts || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load alerts');
        } finally {
            setLoading(false);
        }
    }, [fiscalYear]);

    // Load fund sources for forms
    const loadFundSources = async () => {
        try {
            const response = await masterDataService.getFundSources();
            setFundSources(response.data || []);
        } catch (err) {
            console.error('Failed to load fund sources', err);
        }
    };

    // Initial load
    useEffect(() => {
        loadFundSources();
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard') loadDashboard();
        else if (activeTab === 'periods') loadPeriods();
        else if (activeTab === 'authorizations') loadAuthorizations();
        else if (activeTab === 'alerts') loadAlerts();
    }, [activeTab, fiscalYear, loadDashboard, loadPeriods, loadAuthorizations, loadAlerts]);

    // Lock/Unlock period
    const handleLockPeriod = async (period: BudgetPeriod) => {
        if (!lockReason && !period.is_locked) {
            alert('Vui lòng nhập lý do khóa kỳ');
            return;
        }

        setLoading(true);
        try {
            if (period.is_locked) {
                if (!confirm(`Bạn có chắc muốn mở khóa ${period.period_name}? Thao tác này cần quyền Admin.`)) return;
                await budgetControlService.unlockPeriod(period.id, { reason: lockReason || 'Mở khóa để điều chỉnh' });
            } else {
                await budgetControlService.lockPeriod(period.id, { reason: lockReason });
            }
            setSelectedPeriod(null);
            setLockReason('');
            loadPeriods();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    // Create authorization
    const handleCreateAuthorization = async () => {
        if (!authForm.requested_amount || !authForm.purpose) {
            alert('Vui lòng nhập số tiền và mục đích');
            return;
        }

        setLoading(true);
        try {
            await budgetControlService.createAuthorization({
                ...authForm,
                fiscal_year: fiscalYear,
            });
            setShowAuthModal(false);
            setAuthForm({
                request_type: 'SPENDING',
                budget_estimate_id: '',
                fund_source_id: '',
                requested_amount: 0,
                purpose: '',
                justification: '',
            });
            loadAuthorizations();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create authorization');
        } finally {
            setLoading(false);
        }
    };

    // Approve/Reject authorization
    const handleApproveReject = async (auth: SpendingAuthorization, action: 'approve' | 'reject') => {
        setLoading(true);
        try {
            if (action === 'approve') {
                await budgetControlService.approveAuthorization(auth.id, { approval_notes: approvalNotes });
            } else {
                if (!approvalNotes) {
                    alert('Vui lòng nhập lý do từ chối');
                    setLoading(false);
                    return;
                }
                await budgetControlService.rejectAuthorization(auth.id, { rejection_reason: approvalNotes });
            }
            setSelectedAuth(null);
            setApprovalNotes('');
            loadAuthorizations();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    // Acknowledge alert
    const handleAcknowledgeAlert = async (alert: BudgetAlert) => {
        setLoading(true);
        try {
            await budgetControlService.acknowledgeAlert(alert.id, { notes: 'Đã ghi nhận' });
            loadAlerts();
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Render tabs
    const renderTabs = () => (
        <div className="flex border-b border-gray-200 mb-4">
            {[
                { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
                { key: 'periods', label: 'Kỳ ngân sách', icon: 'calendar_month' },
                { key: 'authorizations', label: 'Phê duyệt chi', icon: 'approval' },
                { key: 'alerts', label: 'Cảnh báo', icon: 'notification_important' },
                { key: 'reports', label: 'Báo cáo', icon: 'analytics' },
            ].map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as BudgetTab)}
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

    // Render dashboard
    const renderDashboard = () => {
        if (!dashboard) return null;

        const { budgetSummary, utilizationPercent, pendingAuthorizations, alertsBySeverity, overBudgetItems, periodStatus } = dashboard;

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {(budgetSummary?.total_allocated || 0).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-sm text-gray-600">Tổng dự toán (VND)</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {(budgetSummary?.total_spent || 0).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-sm text-gray-600">Đã chi (VND)</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                            {(budgetSummary?.total_available || 0).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-sm text-gray-600">Còn lại (VND)</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                            {utilizationPercent}%
                        </div>
                        <div className="text-sm text-gray-600">Sử dụng</div>
                    </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-700 mb-3">Tình hình sử dụng dự toán năm {fiscalYear}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                        <div
                            className={`h-6 rounded-full transition-all ${parseFloat(String(utilizationPercent)) >= 100 ? 'bg-red-500' :
                                parseFloat(String(utilizationPercent)) >= 80 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(parseFloat(String(utilizationPercent)), 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>80% (Cảnh báo)</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Alerts & Authorizations Summary */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">warning</span>
                            Cảnh báo đang mở
                        </h4>
                        {alertsBySeverity?.length > 0 ? (
                            <div className="space-y-2">
                                {alertsBySeverity.map((item) => (
                                    <div key={item.severity} className="flex justify-between items-center">
                                        <span className={`px-2 py-0.5 rounded text-xs ${item.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                            item.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                                item.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {item.severity}
                                        </span>
                                        <span className="font-medium">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Không có cảnh báo</p>
                        )}
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">pending_actions</span>
                            Chờ phê duyệt
                        </h4>
                        <div className="text-3xl font-bold text-blue-600">{pendingAuthorizations || 0}</div>
                        <p className="text-sm text-gray-500">yêu cầu chi tiêu</p>
                    </div>
                </div>

                {/* Over Budget Items */}
                {overBudgetItems?.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            Khoản mục vượt dự toán
                        </h4>
                        <div className="space-y-2">
                            {overBudgetItems.map((item) => (
                                <div key={item.item_code} className="flex justify-between items-center p-2 bg-white rounded">
                                    <div>
                                        <span className="font-mono text-sm">{item.item_code}</span>
                                        <span className="ml-2 text-sm">{item.item_name}</span>
                                    </div>
                                    <span className="text-red-600 font-medium">
                                        Vượt {item.over_amount.toLocaleString('vi-VN')} VND
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Period Status */}
                <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-700 mb-3">Trạng thái kỳ kế toán</h4>
                    <div className="grid grid-cols-12 gap-2">
                        {periodStatus?.map((period) => (
                            <div
                                key={period.period_number}
                                className={`p-2 rounded text-center text-xs ${period.is_locked
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                    }`}
                                title={period.is_locked ? `Đã khóa bởi ${period.locked_by}` : 'Đang mở'}
                            >
                                T{period.period_number}
                                {period.is_locked && <span className="material-symbols-outlined text-xs block">lock</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Render periods
    const renderPeriods = () => (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kỳ</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ngưỡng cảnh báo</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ngưỡng chặn</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cho phép vượt</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {periods.map((period) => (
                            <tr key={period.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium">{period.period_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {period.start_date} → {period.end_date}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs ${period.is_locked
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'
                                        }`}>
                                        {period.is_locked ? 'Đã khóa' : 'Đang mở'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-sm">{period.warning_threshold}%</td>
                                <td className="px-4 py-3 text-center text-sm">{period.block_threshold}%</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs ${period.allow_override ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {period.allow_override ? 'Có' : 'Không'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => { setSelectedPeriod(period); setShowPeriodModal(true); }}
                                        className={`px-3 py-1 rounded text-xs text-white ${period.is_locked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                            }`}
                                    >
                                        {period.is_locked ? 'Mở khóa' : 'Khóa kỳ'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Render authorizations
    const renderAuthorizations = () => (
        <div>
            {/* Actions */}
            <div className="mb-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    {authorizations.filter(a => a.status === 'PENDING').length} yêu cầu đang chờ phê duyệt
                </div>
                <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Tạo yêu cầu
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mục đích</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền yêu cầu</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">NS còn lại</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người yêu cầu</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {authorizations.map((auth) => (
                            <tr key={auth.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {new Date(auth.request_date).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{auth.request_type}</span>
                                </td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate">{auth.purpose}</td>
                                <td className="px-4 py-3 text-sm text-right font-medium">
                                    {auth.requested_amount.toLocaleString('vi-VN')}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-500">
                                    {auth.budget_available?.toLocaleString('vi-VN') || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">{auth.requested_by}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs ${auth.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                        auth.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            auth.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {auth.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {auth.status === 'PENDING' && (
                                        <button
                                            onClick={() => setSelectedAuth(auth)}
                                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                        >
                                            Xử lý
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {authorizations.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-8">Không có yêu cầu phê duyệt</p>
            )}
        </div>
    );

    // Render alerts
    const renderAlerts = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                        alert.severity === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                            alert.severity === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                                'border-blue-500 bg-blue-50'
                        }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${alert.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                alert.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                                    alert.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                        'bg-blue-200 text-blue-800'
                                }`}>
                                {alert.severity}
                            </span>
                            <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs">
                                {alert.alert_type}
                            </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs ${alert.status === 'ACTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                            {alert.status}
                        </span>
                    </div>

                    <p className="text-sm font-medium text-gray-800 mb-1">{alert.title || alert.message}</p>

                    <div className="flex gap-4 text-xs text-gray-500 mb-2">
                        <span>Dự toán: {alert.budget_amount?.toLocaleString('vi-VN')}</span>
                        <span>Đã chi: {alert.spent_amount?.toLocaleString('vi-VN')}</span>
                        <span>Sử dụng: {alert.current_percent}%</span>
                    </div>

                    {alert.status === 'ACTIVE' && (
                        <button
                            onClick={() => handleAcknowledgeAlert(alert)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                        >
                            Ghi nhận
                        </button>
                    )}
                </div>
            ))}

            {alerts.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-8 col-span-2">Không có cảnh báo</p>
            )}
        </div>
    );

    // Render reports (placeholder)
    const renderReports = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <button
                    onClick={() => window.open(`/api/budget-control/report/utilization?fiscal_year=${fiscalYear}`, '_blank')}
                    className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow text-left"
                >
                    <span className="material-symbols-outlined text-blue-500 text-2xl">pie_chart</span>
                    <h4 className="font-medium mt-2">Báo cáo sử dụng dự toán</h4>
                    <p className="text-sm text-gray-500">Tình hình sử dụng theo mục chi</p>
                </button>

                <button
                    onClick={() => window.open(`/api/budget-control/report/variance?fiscal_year=${fiscalYear}`, '_blank')}
                    className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow text-left"
                >
                    <span className="material-symbols-outlined text-orange-500 text-2xl">trending_up</span>
                    <h4 className="font-medium mt-2">Báo cáo chênh lệch</h4>
                    <p className="text-sm text-gray-500">So sánh thực hiện vs dự toán</p>
                </button>

                <button
                    onClick={() => window.open(`/api/audit/report/compliance?fiscal_year=${fiscalYear}`, '_blank')}
                    className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow text-left"
                >
                    <span className="material-symbols-outlined text-green-500 text-2xl">verified</span>
                    <h4 className="font-medium mt-2">Báo cáo tuân thủ</h4>
                    <p className="text-sm text-gray-500">Đánh giá tuân thủ TT 24/2024</p>
                </button>
            </div>
        </div>
    );

    // Period Lock Modal
    const renderPeriodModal = () => {
        if (!showPeriodModal || !selectedPeriod) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="text-lg font-medium">
                            {selectedPeriod.is_locked ? 'Mở khóa' : 'Khóa'} {selectedPeriod.period_name}
                        </h3>
                        <button onClick={() => { setShowPeriodModal(false); setSelectedPeriod(null); setLockReason(''); }}>
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {selectedPeriod.is_locked && (
                            <div className="bg-yellow-50 p-3 rounded text-sm">
                                <p><strong>Đã khóa bởi:</strong> {selectedPeriod.locked_by}</p>
                                <p><strong>Lý do:</strong> {selectedPeriod.lock_reason}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Lý do {selectedPeriod.is_locked ? 'mở khóa' : 'khóa kỳ'}
                            </label>
                            <textarea
                                value={lockReason}
                                onChange={(e) => setLockReason(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                rows={3}
                                required={!selectedPeriod.is_locked}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setShowPeriodModal(false); setSelectedPeriod(null); setLockReason(''); }}
                                className="px-4 py-2 border rounded-md text-sm"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleLockPeriod(selectedPeriod)}
                                className={`px-4 py-2 rounded-md text-sm text-white ${selectedPeriod.is_locked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {selectedPeriod.is_locked ? 'Mở khóa' : 'Khóa kỳ'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Authorization Modal
    const renderAuthModal = () => {
        if (!showAuthModal) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="text-lg font-medium">Tạo yêu cầu chi tiêu</h3>
                        <button onClick={() => setShowAuthModal(false)}>
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại yêu cầu</label>
                            <select
                                value={authForm.request_type}
                                onChange={(e) => setAuthForm({ ...authForm, request_type: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                                <option value="SPENDING">Chi tiêu thường</option>
                                <option value="OVERRIDE">Vượt dự toán</option>
                                <option value="TRANSFER">Chuyển dự toán</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn kinh phí</label>
                            <select
                                value={authForm.fund_source_id}
                                onChange={(e) => setAuthForm({ ...authForm, fund_source_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                                <option value="">-- Chọn nguồn --</option>
                                {fundSources.map((fs) => (
                                    <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền yêu cầu (VND)</label>
                            <input
                                type="number"
                                value={authForm.requested_amount}
                                onChange={(e) => setAuthForm({ ...authForm, requested_amount: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích</label>
                            <input
                                type="text"
                                value={authForm.purpose}
                                onChange={(e) => setAuthForm({ ...authForm, purpose: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                placeholder="Nhập mục đích chi tiêu..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do chi tiết (không bắt buộc)</label>
                            <textarea
                                value={authForm.justification}
                                onChange={(e) => setAuthForm({ ...authForm, justification: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowAuthModal(false)}
                                className="px-4 py-2 border rounded-md text-sm"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateAuthorization}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                            >
                                Gửi yêu cầu
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Approval Modal
    const renderApprovalModal = () => {
        if (!selectedAuth) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="text-lg font-medium">Xử lý yêu cầu chi tiêu</h3>
                        <button onClick={() => { setSelectedAuth(null); setApprovalNotes(''); }}>
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium">{selectedAuth.purpose}</p>
                            <p className="text-sm text-gray-600 mt-1">{selectedAuth.justification}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Số tiền:</span>{' '}
                                    <span className="font-medium">{selectedAuth.requested_amount.toLocaleString('vi-VN')} VND</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">NS còn lại:</span>{' '}
                                    <span className="font-medium">{selectedAuth.budget_available?.toLocaleString('vi-VN')} VND</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Người yêu cầu:</span>{' '}
                                    <span>{selectedAuth.requested_by}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Hết hạn:</span>{' '}
                                    <span>{new Date(selectedAuth.expires_at).toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú phê duyệt</label>
                            <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                rows={3}
                                placeholder="Nhập ghi chú (bắt buộc khi từ chối)..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setSelectedAuth(null); setApprovalNotes(''); }}
                                className="px-4 py-2 border rounded-md text-sm"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleApproveReject(selectedAuth, 'reject')}
                                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                            >
                                Từ chối
                            </button>
                            <button
                                onClick={() => handleApproveReject(selectedAuth, 'approve')}
                                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                            >
                                Phê duyệt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Show ModuleOverview when activeTab is 'overview'
    if (activeTab === 'overview') {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.budget.title}
                description={MODULE_CONFIGS.budget.description}
                icon={MODULE_CONFIGS.budget.icon}
                iconColor={MODULE_CONFIGS.budget.iconColor}
                workflow={MODULE_CONFIGS.budget.workflow}
                features={MODULE_CONFIGS.budget.features}
                stats={[
                    { icon: 'monitoring', label: 'Năm tài chính', value: fiscalYear.toString(), color: 'blue' },
                    { icon: 'warning', label: 'Cảnh báo', value: alerts.length || 0, color: alerts.length > 0 ? 'amber' : 'green' },
                    { icon: 'approval', label: 'Chờ duyệt', value: authorizations.filter(a => a.status === 'PENDING').length || 0, color: 'purple' },
                    { icon: 'check_circle', label: 'Trạng thái', value: 'Hoạt động', color: 'green' },
                ]}
            />
        );
    }

    return (
        <div className="p-4">
            <div className="mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Kiểm soát Ngân sách</h2>
                    <p className="text-sm text-gray-500">Quản lý dự toán và kiểm soát chi tiêu theo TT 24/2024/TT-BTC</p>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Năm tài chính:</label>
                    <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        {[2024, 2025, 2026, 2027].map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            {loading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Đang tải...
                </div>
            )}

            {renderTabs()}

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'periods' && renderPeriods()}
            {activeTab === 'authorizations' && renderAuthorizations()}
            {activeTab === 'alerts' && renderAlerts()}
            {activeTab === 'reports' && renderReports()}

            {renderPeriodModal()}
            {renderAuthModal()}
            {renderApprovalModal()}
        </div>
    );
};


