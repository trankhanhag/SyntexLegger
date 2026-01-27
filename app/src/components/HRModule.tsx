import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { hrService } from '../api';
import { type RibbonAction } from './Ribbon';
import { toInputMonthValue } from '../utils/dateUtils';
import InsuranceReportView from './InsuranceReportView';
import { FormModal } from './FormModal';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { useSimplePrint } from '../hooks/usePrintHandler';

interface HRModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (view: string) => void;
}

export const HRModule: React.FC<HRModuleProps> = ({ subView = 'employees', printSignal = 0, onSetHeader, onNavigate: _onNavigate }) => {
    const [view, setView] = useState(subView);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [payroll, setPayroll] = useState<any[]>([]);
    const [timekeeping, setTimekeeping] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
    const [allowanceTypes, setAllowanceTypes] = useState<any[]>([]);
    const [insuranceSummary, setInsuranceSummary] = useState<any>(null);
    const [insuranceDetail, setInsuranceDetail] = useState<any[]>([]);
    const [discrepancies, setDiscrepancies] = useState<any[]>([]);
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    const [period, setPeriod] = useState(toInputMonthValue());

    // Traceability Listener
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#hr-timekeeping-')) {
                const empId = hash.replace('#hr-timekeeping-', '');
                // Switch to Timekeeping view
                setView('timekeeping');
                // Ideally filter by this employee, but for now just switching view is enough proof
                alert(`Đang truy vết đến Bảng chấm công của nhân viên: ${empId}`); // Explicit confirmation for usage
                history.replaceState(null, '', ' '); // Consumer
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

    const getModuleInfo = () => {
        switch (view) {
            case 'employees': return { title: 'Hồ sơ nhân sự', icon: 'person_add', desc: 'Quản lý thông tin nhân viên, hợp đồng và mức lương cơ bản' };
            case 'contracts': return { title: 'Hợp đồng & Quyết định', icon: 'history_edu', desc: 'Quản lý hợp đồng lao động, quyết định bổ nhiệm và điều động' };
            case 'salary_process': return { title: 'Quá trình Lương', icon: 'trending_up', desc: 'Lịch sử nâng bậc, thăng hạng lương của cán bộ' };
            case 'allowance_list': return { title: 'Danh mục Phụ cấp', icon: 'list_alt', desc: 'Quản lý các loại phụ cấp theo quy định HCSN' };
            case 'timekeeping': return { title: 'Bảng chấm công', icon: 'event_available', desc: 'Theo dõi ngày công, nghỉ phép và tăng ca trong kỳ' };
            case 'insurance': return { title: 'Bảo hiểm & Khấu trừ', icon: 'health_and_safety', desc: 'Theo dõi trích nộp BHXH, BHYT, BHTN và Kinh phí công đoàn' };
            case 'report_insurance': return { title: 'Báo cáo Bảo hiểm', icon: 'description', desc: 'Báo cáo & Đối soát với cơ quan BHXH' };
            case 'payroll': return { title: 'Bảng tính lương', icon: 'payments', desc: 'Tính toán lương, thưởng và các khoản khấu trừ thực lĩnh' };
            case 'timesheet': return { title: 'Bảng chấm công', icon: 'event_available', desc: 'Theo dõi ngày công, nghỉ phép và tăng ca trong kỳ' };
            default: return { title: 'Quản lý Nhân sự', icon: 'groups', desc: 'Hệ thống quản trị nguồn nhân lực và tiền lương' };
        }
    };

    const info = getModuleInfo();

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'employees' || view === 'insurance') {
                const res = await hrService.getEmployees();
                setEmployees(res.data);
            } else if (view === 'contracts') {
                const res = await hrService.getContracts();
                setContracts(res.data);
            } else if (view === 'salary_process') {
                const res = await hrService.getSalaryHistory();
                setSalaryHistory(res.data);
            } else if (view === 'allowance_list') {
                const res = await hrService.getAllowanceTypes();
                setAllowanceTypes(res.data);
            } else if (view === 'report_insurance') {
                const [summaryRes, detailRes] = await Promise.all([
                    hrService.getInsuranceSummary(period),
                    hrService.getInsuranceDetail(period)
                ]);
                setInsuranceSummary(summaryRes.data.summary);
                setInsuranceDetail(detailRes.data.employees);
            } else if (view === 'timekeeping' || view === 'timesheet') {
                const res = await hrService.getTimekeeping({ period });
                setTimekeeping(res.data);
            } else if (view === 'payroll') {
                const res = await hrService.getPayroll({ period });
                // Enforce Traceability
                const enriched = res.data.map((p: any) => ({
                    ...p,
                    net_salary: {
                        value: p.net_salary,
                        formula: 'Gross - BH - Tax',
                        source: {
                            type: 'link',
                            target: `#hr-timekeeping-${p.id}`,
                            label: `Bảng chấm công ${p.name}`
                        }
                    }
                }));
                setPayroll(enriched);
            }
        } catch (err) {
            console.error("Fetch HR data failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view, period]);

    useEffect(() => {
        if (subView) setView(subView);
    }, [subView]);

    // Print handler
    useSimplePrint(printSignal, 'Nhân sự', { allowBrowserPrint: true });

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [];

            if (view === 'payroll') {
                actions.push({
                    label: 'Tính lương & Trích bảo hiểm',
                    icon: 'calculate',
                    onClick: () => setShowCalcModal(true),
                    primary: true
                });
            } else if (view === 'employees') {
                actions.push({
                    label: 'Tiếp nhận nhân viên',
                    icon: 'person_add',
                    onClick: () => {
                        setSelectedEmployee(null);
                        setShowEmployeeModal(true);
                    },
                    primary: true
                });
            }

            actions.push({
                label: 'Xuất báo cáo',
                icon: 'download',
                onClick: () => alert("Đang xuất báo cáo...")
            });

            onSetHeader({ title: info.title, icon: info.icon, actions, onDelete: handleDeleteSelected });
        }
    }, [view, onSetHeader, info.title, info.icon, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (view !== 'employees') return; // Only allow delete in employees for now
        if (!confirm(`Bạn có chắc muốn xóa nhân viên ${selectedRow.name}?`)) return;

        try {
            await hrService.deleteEmployee(selectedRow.id);
            alert("Đã xóa thành công.");
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    // Column Definitions
    const employeeColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã NV', width: 'w-24', renderCell: (v: string) => <span className="font-bold text-slate-700">{v}</span> },
        { field: 'name', headerName: 'Họ và tên', width: 'min-w-[200px]' },
        { field: 'department', headerName: 'Phòng ban', width: 'w-32' },
        { field: 'position', headerName: 'Chức vụ', width: 'w-40' },
        { field: 'salary_grade_name', headerName: 'Ngạch lương', width: 'w-32', renderCell: (v: string) => <span className="text-xs">{v}</span> },
        { field: 'salary_level', headerName: 'Bậc', width: 'w-16', align: 'center' },
        { field: 'salary_coefficient', headerName: 'Hệ số', width: 'w-20', align: 'center', renderCell: (v: number) => <span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{Number(v || 0).toFixed(2)}</span> },
        {
            field: 'basic_salary',
            headerName: 'Lương N/B',
            width: 'w-32',
            align: 'right',
            renderCell: (_: number, row: any) => <span className="font-mono text-blue-600 font-bold">{formatNumber((row.salary_coefficient || 0) * 2340000)}</span>
        },
        { field: 'status', headerName: 'Trạng thái', width: 'w-28', align: 'center', renderCell: (v: string) => <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v === 'ACTIVE' ? 'Đang làm việc' : 'Đã nghỉ'}</span> },
        {
            field: 'actions', headerName: 'Thao tác', width: 'w-24', align: 'center',
            renderCell: (_: any, row: any) => (
                <div className="flex gap-1 justify-center">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedEmployee(row); setShowEmployeeModal(true); }} className="w-8 h-8 rounded-lg hover:bg-blue-50 text-blue-600 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedRow(row); handleDeleteSelected(); }} className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            )
        },
    ];

    const timeColumns: ColumnDef[] = [
        { field: 'id', headerName: 'Mã NV', width: 'w-24' },
        { field: 'name', headerName: 'Họ và tên', width: 'min-w-[200px]' },
        { field: 'standard_days', headerName: 'Công chuẩn', width: 'w-28', align: 'center' },
        { field: 'actual_days', headerName: 'Công thực tế', width: 'w-28', align: 'center' },
        { field: 'leave_days', headerName: 'Nghỉ phép', width: 'w-24', align: 'center' },
        { field: 'overtime_hours', headerName: 'Tăng ca (H)', width: 'w-28', align: 'center' },
    ];

    const insuranceColumns: ColumnDef[] = [
        { field: 'id', headerName: 'Mã NV', width: 'w-24' },
        { field: 'name', headerName: 'Họ và tên', width: 'w-40' },
        { field: 'insurance_salary', headerName: 'Lương đóng BH', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span> },
        { field: 'bhxh', headerName: 'BHXH (8%)', width: 'w-28', align: 'right', renderCell: (_: any, row: any) => <span className="font-mono">{formatNumber(row.insurance_salary * 0.08)}</span> },
        { field: 'bhyt', headerName: 'BHYT (1.5%)', width: 'w-28', align: 'right', renderCell: (_: any, row: any) => <span className="font-mono">{formatNumber(row.insurance_salary * 0.015)}</span> },
        { field: 'bhtn', headerName: 'BHTN (1%)', width: 'w-28', align: 'right', renderCell: (_: any, row: any) => <span className="font-mono">{formatNumber(row.insurance_salary * 0.01)}</span> },
        { field: 'total_deduct', headerName: 'Khấu trừ NV', width: 'w-32', align: 'right', renderCell: (_: any, row: any) => <span className="font-mono font-bold text-red-600">{formatNumber(row.insurance_salary * 0.105)}</span> },
        { field: 'comp_total', headerName: 'DN đóng (21.5%)', width: 'w-32', align: 'right', renderCell: (_: any, row: any) => <span className="font-mono text-slate-500 italic">{formatNumber(row.insurance_salary * 0.215)}</span> },
    ];

    const payrollColumns: ColumnDef[] = [
        { field: 'id', headerName: 'Mã NV', width: 'w-24' },
        { field: 'name', headerName: 'Họ và tên', width: 'w-40' },
        { field: 'gross_salary', headerName: 'Lương Gross', type: 'number', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span> },
        { field: 'allowance', headerName: 'Phụ cấp', type: 'number', width: 'w-28', align: 'right', renderCell: (v: number) => <span className="font-mono">{formatNumber(v)}</span> },
        { field: 'insurance_deduction', headerName: 'Trích BH', type: 'number', width: 'w-28', align: 'right', renderCell: (v: number) => <span className="font-mono text-red-600">{formatNumber(v)}</span> },
        { field: 'income_tax', headerName: 'Thuế TNCN', type: 'number', width: 'w-28', align: 'right', renderCell: (v: number) => <span className="font-mono text-red-600">{formatNumber(v)}</span> },
        { field: 'net_salary', headerName: 'Thực lĩnh', type: 'number', width: 'w-36', align: 'right', renderCell: (v: any) => <span className="font-mono font-black text-blue-600 text-base">{formatNumber(Number(v))}</span> },
    ];

    // Contracts & Decisions Columns
    const contractColumns: ColumnDef[] = [
        { field: 'employee_name', headerName: 'Nhân viên', width: 'w-40' },
        { field: 'contract_type', headerName: 'Loại HĐ/QĐ', width: 'w-32', renderCell: (v: string) => <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{v === 'HOP_DONG_LAO_DONG' ? 'HĐ Lao động' : v === 'QUYET_DINH_BO_NHIEM' ? 'QĐ Bổ nhiệm' : 'QĐ Điều động'}</span> },
        { field: 'contract_no', headerName: 'Số HĐ/QĐ', width: 'w-28', renderCell: (v: string) => <span className="font-bold">{v}</span> },
        { field: 'contract_date', headerName: 'Ngày ký', width: 'w-24' },
        { field: 'effective_date', headerName: 'Hiệu lực từ', width: 'w-24' },
        { field: 'expiry_date', headerName: 'Đến ngày', width: 'w-24' },
        { field: 'grade_name', headerName: 'Ngạch', width: 'w-32' },
        { field: 'salary_level', headerName: 'Bậc', width: 'w-16', align: 'center' },
        { field: 'salary_coefficient', headerName: 'Hệ số', width: 'w-20', align: 'center', renderCell: (v: number) => <span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{Number(v || 0).toFixed(2)}</span> },
        { field: 'status', headerName: 'Trạng thái', width: 'w-24', renderCell: (v: string) => <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã hết hạn'}</span> },
    ];

    // Salary History Columns
    const salaryHistoryColumns: ColumnDef[] = [
        { field: 'employee_name', headerName: 'Nhân viên', width: 'w-40' },
        { field: 'effective_date', headerName: 'Ngày hiệu lực', width: 'w-28' },
        { field: 'change_type', headerName: 'Loại thay đổi', width: 'w-28', renderCell: (v: string) => <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700">{v === 'NANG_BAC' ? 'Nâng bậc' : v === 'THANG_HANG' ? 'Thăng hạng' : v === 'BOI_DUONG_DONG' ? 'Bồi dưỡng đồng' : 'Khác'}</span> },
        { field: 'old_grade_name', headerName: 'Ngạch cũ', width: 'w-28' },
        { field: 'old_level', headerName: 'Bậc cũ', width: 'w-20', align: 'center' },
        { field: 'old_coefficient', headerName: 'HS cũ', width: 'w-20', align: 'center', renderCell: (v: number) => <span className="font-mono text-slate-500">{Number(v || 0).toFixed(2)}</span> },
        { field: 'new_grade_name', headerName: 'Ngạch mới', width: 'w-28' },
        { field: 'new_level', headerName: 'Bậc mới', width: 'w-20', align: 'center' },
        { field: 'new_coefficient', headerName: 'HS mới', width: 'w-20', align: 'center', renderCell: (v: number) => <span className="font-mono font-bold text-blue-600">{Number(v || 0).toFixed(2)}</span> },
        { field: 'decision_no', headerName: 'Số QĐ', width: 'w-24' },
        { field: 'decision_date', headerName: 'Ngày QĐ', width: 'w-24' },
    ];

    // Allowance Types Columns
    const allowanceTypeColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Mã PC', width: 'w-24', renderCell: (v: string) => <span className="font-bold text-indigo-600">{v}</span> },
        { field: 'name', headerName: 'Tên phụ cấp', width: 'min-w-[200px]' },
        { field: 'calculation_type', headerName: 'Loại tính', width: 'w-32', renderCell: (v: string) => <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">{v === 'COEFFICIENT' ? 'Hệ số' : v === 'PERCENT_CURRENT' ? '% Lương' : v === 'FIXED' ? 'Cố định' : v}</span> },
        { field: 'default_value', headerName: 'Giá trị mặc định', width: 'w-28', align: 'right', renderCell: (v: number) => <span className="font-mono">{Number(v || 0).toFixed(2)}</span> },
        { field: 'is_taxable', headerName: 'Tính thuế', width: 'w-20', align: 'center', renderCell: (v: number) => <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{v ? 'Có' : 'Không'}</span> },
        { field: 'is_insurance', headerName: 'Đóng BH', width: 'w-20', align: 'center', renderCell: (v: number) => <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{v ? 'Có' : 'Không'}</span> },
        { field: 'description', headerName: 'Mô tả', width: 'w-40' },
    ];

    // Show ModuleOverview when no specific subView or 'overview'
    if (view === 'overview' || view === '' || !view) {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.hr.title}
                description={MODULE_CONFIGS.hr.description}
                icon={MODULE_CONFIGS.hr.icon}
                iconColor={MODULE_CONFIGS.hr.iconColor}
                workflow={MODULE_CONFIGS.hr.workflow}
                features={MODULE_CONFIGS.hr.features}
                stats={[
                    { icon: 'badge', label: 'Tổng nhân viên', value: employees.length || '-', color: 'blue' },
                    { icon: 'schedule', label: 'Kỳ hiện tại', value: period, color: 'green' },
                    { icon: 'paid', label: 'Tính lương', value: 'Sẵn sàng', color: 'amber' },
                    { icon: 'health_and_safety', label: 'BHXH', value: 'Đã cập nhật', color: 'green' },
                ]}
            />
        );
    }

    return (
        <div className="relative h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Action Bar */}
            <div className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    {/* View Switcher Tabs */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
                        {[
                            { id: 'employees', label: 'Hồ sơ' },
                            { id: 'timekeeping', label: 'Chấm công' },
                            { id: 'insurance', label: 'Bảo hiểm' },
                            { id: 'payroll', label: 'Lương' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === tab.id
                                    ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Period Selector (Context-aware) */}
                    {(view === 'payroll' || view === 'timekeeping' || view === 'insurance') && (
                        <div className="flex items-center gap-3 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Kỳ báo cáo:</label>
                            <input
                                type="month"
                                className="bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white text-sm focus:ring-0 p-0"
                                value={period}
                                onChange={e => setPeriod(e.target.value)}
                            />
                            <button
                                onClick={fetchData}
                                className="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                                title="Tải lại dữ liệu"
                            >
                                <span className="material-symbols-outlined text-[18px]">refresh</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-white dark:bg-slate-900">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold animate-pulse">Đang tải dữ liệu...</p>
                    </div>
                ) : view === 'report_insurance' ? (
                    <InsuranceReportView
                        period={period}
                        summary={insuranceSummary}
                        detail={insuranceDetail}
                        discrepancies={discrepancies}
                        onDiscrepanciesUpdate={setDiscrepancies}
                    />
                ) : (
                    <SmartTable
                        data={
                            view === 'employees' ? employees :
                                view === 'contracts' ? contracts :
                                    view === 'salary_process' ? salaryHistory :
                                        view === 'allowance_list' ? allowanceTypes :
                                            view === 'timekeeping' || view === 'timesheet' ? timekeeping :
                                                view === 'insurance' ? employees :
                                                    payroll
                        }
                        columns={
                            view === 'employees' ? employeeColumns :
                                view === 'contracts' ? contractColumns :
                                    view === 'salary_process' ? salaryHistoryColumns :
                                        view === 'allowance_list' ? allowanceTypeColumns :
                                            view === 'timekeeping' || view === 'timesheet' ? timeColumns :
                                                view === 'insurance' ? insuranceColumns :
                                                    payrollColumns
                        }
                        keyField="id"
                        onSelectionChange={setSelectedRow}
                        minRows={15}
                        emptyMessage={view === 'payroll' ? "Vui lòng nhấn 'Tính lương' để tạo dữ liệu cho kỳ này" : "Không có dữ liệu"}
                    />
                )}
            </div>

            {showCalcModal && (
                <PayrollCalcModal
                    period={period}
                    onClose={() => setShowCalcModal(false)}
                    onConfirm={() => {
                        fetchData();
                        setView('payroll');
                    }}
                />
            )}

            {showEmployeeModal && (
                <EmployeeFormModal
                    initialData={selectedEmployee}
                    onClose={() => setShowEmployeeModal(false)}
                    onSave={() => {
                        fetchData();
                        setShowEmployeeModal(false);
                    }}
                />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} icon="settings_applications">
        {children}
    </FormModal>
);

const PayrollCalcModal = ({ period, onClose, onConfirm }: { period: string, onClose: () => void, onConfirm: () => void }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            await hrService.calculatePayroll({ period });
            setStep(3);
        } catch (err) {
            alert("Lỗi khi tính lương!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Quy trình Tính lương & Trích bảo hiểm (HCSN)" onClose={onClose}>
            <div className="flex justify-between mb-10 relative">
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 -z-10"></div>
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 text-slate-400'}`}>
                            {s === 3 && step === 3 ? <span className="material-symbols-outlined">check</span> : s}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= s ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {s === 1 ? 'Thông số kỳ' : s === 2 ? 'Kiểm tra hạch toán' : 'Ghi sổ'}
                        </span>
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Kỳ tính lương</label>
                                <select className="form-select font-bold" value={period} disabled>
                                    <option value={period}>{period}</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Số ngày công chuẩn</label>
                                <input type="number" defaultValue={22} className="form-input" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs">
                                <p className="font-bold mb-1 italic">Hệ thống sẽ tự động:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Lấy dữ liệu từ bảng chấm công kỳ {period}</li>
                                    <li>Tính lương Gross/Net dựa trên công thực tế</li>
                                    <li>Trích bảo hiểm và thuế TNCN theo quy định</li>
                                    <li>Tạo các bút toán HCSN: 611, 332, 334...</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button onClick={onClose} className="form-button-secondary">Hủy bỏ</button>
                        <button onClick={() => setStep(2)} className="form-button-primary bg-indigo-600 hover:bg-indigo-700">Tiếp tục</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Tài khoản</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Diễn giải</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[10px]">Dự kiến phát sinh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr>
                                    <td className="px-4 py-3 font-bold text-indigo-600">611 / 334</td>
                                    <td className="px-4 py-3">Chi phí tiền lương tháng {period}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">Tự động tính</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold text-indigo-600">334 / 332</td>
                                    <td className="px-4 py-3">Trích BHXH - NLĐ (10.5%)</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">Theo lương đóng BH</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold text-indigo-600">611 / 332</td>
                                    <td className="px-4 py-3">Trích BHXH - Đơn vị (21.5%)</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">Theo lương đóng BH</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold text-indigo-600">334 / 333</td>
                                    <td className="px-4 py-3">Khấu trừ Thuế TNCN</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">Theo biểu thuế</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => setStep(1)} className="form-button-secondary flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Quay lại
                        </button>
                        <button onClick={handleCalculate} disabled={loading} className="form-button-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                            {loading ? 'Đang xử lý...' : 'Xác nhận Ghi sổ'}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="py-12 flex flex-col items-center text-center space-y-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full text-green-600 mb-4 animate-bounce">
                        <span className="material-symbols-outlined text-6xl">verified</span>
                    </div>
                    <h3 className="text-2xl font-bold p-2 text-slate-800 dark:text-white">Tính lương Thành công!</h3>
                    <p className="text-slate-600 dark:text-slate-400">Dữ liệu lương và các khoản bảo hiểm đã được kết chuyển vào Sổ cái Accounts 334, 332, 611.</p>
                    <button onClick={onConfirm} className="form-button-primary bg-indigo-600 hover:bg-indigo-700 mt-8 px-10 py-3">Xem bảng lương thực lĩnh</button>
                </div>
            )}
        </Modal>
    );
};

const EmployeeFormModal = ({ initialData, onClose, onSave }: { initialData?: any, onClose: () => void, onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [salaryGrades, setSalaryGrades] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        code: initialData?.code || '',
        name: initialData?.name || '',
        department: initialData?.department || 'Kế toán',
        position: initialData?.position || 'Nhân viên',
        salary_grade_id: initialData?.salary_grade_id || '',
        salary_level: initialData?.salary_level || 1,
        salary_coefficient: initialData?.salary_coefficient || 2.34,
        start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
        status: initialData?.status || 'ACTIVE'
    });

    useEffect(() => {
        // Load Salary Grades
        hrService.getSalaryGrades().then(res => setSalaryGrades(res.data)).catch(console.error);
    }, []);

    const handleLevelChange = (level: number) => {
        // Simple logic for coefficient auto-calculation (A1 example)
        // In real app, this should depend on Grade Category (A1, A2...)
        // Start 2.34, Step 0.33
        const start = 2.34;
        const step = 0.33;
        const coef = start + (level - 1) * step;
        setFormData(prev => ({ ...prev, salary_level: level, salary_coefficient: Number(coef.toFixed(2)) }));
    };

    const handleSave = async () => {
        if (!formData.code || !formData.name) return alert("Vui lòng nhập đủ thông tin!");
        setLoading(true);
        try {
            await hrService.saveEmployee(formData);
            alert(initialData ? "Cập nhật thành công!" : "Tiếp nhận nhân viên thành công!");
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu thông tin");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculatedSalary = (formData.salary_coefficient || 0) * 2340000;

    return (
        <Modal title={initialData ? "Cập nhật hồ sơ nhân sự (HCSN)" : "Tiếp nhận nhân viên mới (HCSN)"} onClose={onClose}>
            <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Personal Info */}
                <div className="col-span-7 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="form-label">Mã nhân viên <span className="text-red-500">*</span></span>
                            <input className="form-input font-bold"
                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="NV..." />
                        </label>
                        <label className="block">
                            <span className="form-label">Ngày vào làm</span>
                            <input type="date" className="form-input"
                                value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                        </label>
                    </div>
                    <label className="block">
                        <span className="form-label">Họ và tên <span className="text-red-500">*</span></span>
                        <input className="form-input"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="NGUYỄN VĂN A" />
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="form-label">Phòng ban</span>
                            <select className="form-select"
                                value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                                <option>Ban Giám đốc</option>
                                <option>Kế toán</option>
                                <option>Kinh doanh</option>
                                <option>Hành chính</option>
                                <option>Kỹ thuật</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="form-label">Chức vụ</span>
                            <input className="form-input"
                                value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} placeholder="Chuyên viên..." />
                        </label>
                    </div>
                </div>

                {/* Right Column: Salary Info */}
                <div className="col-span-5 space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Thông tin Lương Ngạch/Bậc</h3>

                    <label className="block">
                        <span className="form-label">Ngạch lương</span>
                        <select className="form-select text-sm"
                            value={formData.salary_grade_id} onChange={e => setFormData({ ...formData, salary_grade_id: e.target.value })}>
                            <option value="">-- Chọn ngạch --</option>
                            {salaryGrades.map(g => (
                                <option key={g.id} value={g.id}>{g.code} - {g.name} ({g.category})</option>
                            ))}
                        </select>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="form-label">Bậc lương</span>
                            <select className="form-select font-bold text-center"
                                value={formData.salary_level} onChange={e => handleLevelChange(parseInt(e.target.value))}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="form-label">Hệ số (HS)</span>
                            <input type="number" step="0.01" className="form-input font-black text-center text-blue-600"
                                value={formData.salary_coefficient} onChange={e => setFormData({ ...formData, salary_coefficient: parseFloat(e.target.value) })} />
                        </label>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="form-label">Lương cơ bản (HS x 2.340.000)</span>
                        <div className="text-xl font-black text-indigo-600 text-right font-mono mt-1">
                            {new Intl.NumberFormat('vi-VN').format(calculatedSalary)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 form-actions pt-8 border-t border-slate-100 dark:border-slate-800">
                <button onClick={onClose} className="form-button-secondary">Hủy</button>
                <button onClick={handleSave} disabled={loading} className="form-button-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                    <span className="material-symbols-outlined">save</span> {loading ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
            </div>
        </Modal>
    );
};
