import React, { useState } from 'react';
import { hrService } from '../api';
import { formatNumber } from '../utils/format';

interface InsuranceReportViewProps {
    period: string;
    summary: any;
    detail: any[];
    discrepancies: any[];
    onDiscrepanciesUpdate: (discrepancies: any[]) => void;
}

const InsuranceReportView: React.FC<InsuranceReportViewProps> = ({ period, summary, detail, discrepancies, onDiscrepanciesUpdate }) => {
    const [loading, setLoading] = useState(false);

    const handleReconcile = async () => {
        setLoading(true);
        try {
            const res = await hrService.reconcileBHXH(period);
            onDiscrepanciesUpdate(res.data.discrepancies);
            if (res.data.total_discrepancies === 0) {
                alert('✅ Không phát hiện sai lệch. Dữ liệu khớp với BHXH!');
            } else {
                alert(`⚠️ Phát hiện ${res.data.total_discrepancies} sai lệch. Vui lòng xem bảng bên dưới.`);
            }
        } catch (err) {
            alert('❌ Chưa có dữ liệu BHXH để đối soát. Vui lòng import trước!');
        } finally {
            setLoading(false);
        }
    };

    const handleResolveDiscrepancy = async (discrepancy: any) => {
        const resolution = prompt('Chọn hành động:\n- ADJUST_INTERNAL (Điều chỉnh nội bộ)\n- REPORT_TO_BHXH (Báo cáo lên BHXH)\n- IGNORE (Bỏ qua)');

        if (!resolution || !['ADJUST_INTERNAL', 'REPORT_TO_BHXH', 'IGNORE'].includes(resolution)) {
            return;
        }

        const notes = prompt('Ghi chú (tùy chọn):') || '';

        setLoading(true);
        try {
            await hrService.resolveDiscrepancy({
                discrepancy_id: discrepancy.id,
                resolution,
                notes
            });

            // Refresh discrepancies
            const res = await hrService.reconcileBHXH(period);
            onDiscrepanciesUpdate(res.data.discrepancies);
            alert('✅ Đã xử lý sai lệch!');
        } catch (err) {
            alert('❌ Lỗi khi xử lý sai lệch.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Tổng lao động</span>
                            <span className="material-symbols-outlined text-blue-500">groups</span>
                        </div>
                        <div className="text-3xl font-black text-blue-700 dark:text-blue-300">{summary.total_employees}</div>
                        <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Đóng BHXH</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Đóng góp NV</span>
                            <span className="material-symbols-outlined text-green-500">person</span>
                        </div>
                        <div className="text-3xl font-black text-green-700 dark:text-green-300">{formatNumber(summary.employee_contributions.total)}</div>
                        <div className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">10.5% lương đóng BH</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Đóng góp DN</span>
                            <span className="material-symbols-outlined text-purple-500">business</span>
                        </div>
                        <div className="text-3xl font-black text-purple-700 dark:text-purple-300">{formatNumber(summary.company_contributions.total)}</div>
                        <div className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">21.5% lương đóng BH</div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={handleReconcile}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">compare_arrows</span>
                    {loading ? 'Đang xử lý...' : 'Đối soát với BHXH'}
                </button>

                <button
                    onClick={() => alert('Chức năng import đang phát triển. Vui lòng liên hệ admin.')}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    Import dữ liệu BHXH
                </button>

                <button
                    onClick={() => alert('Xuất Excel đang phát triển. Vui lòng liên hệ admin.')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Xuất báo cáo Excel
                </button>
            </div>

            {/* Insurance Detail Table */}
            {detail.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 text-slate-700 dark:text-slate-200">Chi tiết từng nhân viên ({detail.length})</h3>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-800">
                                <tr>
                                    <th className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-200">Mã NV</th>
                                    <th className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-200">Họ tên</th>
                                    <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">Lương đóng BH</th>
                                    <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">BHXH NV</th>
                                    <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">BHYT NV</th>
                                    <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">Tổng NV</th>
                                    <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">BHXH DN</th>
                                    <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">BHYT DN</th>
                                    <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">Tổng DN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.map((emp: any, idx: number) => (
                                    <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{emp.code}</td>
                                        <td className="px-3 py-2">{emp.name}</td>
                                        <td className="px-3 py-2 text-right font-mono">{formatNumber(emp.insurance_salary)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-blue-600">{formatNumber(emp.bhxh_employee)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-blue-600">{formatNumber(emp.bhyt_employee)}</td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-green-600">{formatNumber(emp.total_employee)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-purple-600">{formatNumber(emp.bhxh_company)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-purple-600">{formatNumber(emp.bhyt_company)}</td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-purple-600">{formatNumber(emp.total_company)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Discrepancies Table */}
            {discrepancies.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold mb-3 text-red-600 dark:text-red-400 flex items-center gap-2">
                        <span className="material-symbols-outlined">warning</span>
                        Sai lệch phát hiện ({discrepancies.length})
                    </h3>
                    <div className="overflow-x-auto border border-red-200 dark:border-red-800 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-red-50 dark:bg-red-900/20">
                                <tr>
                                    <th className="px-3 py-2 text-left font-bold text-red-700 dark:text-red-300">Mã NV</th>
                                    <th className="px-3 py-2 text-left font-bold text-red-700 dark:text-red-300">Tên NV</th>
                                    <th className="px-3 py-2 text-left font-bold text-red-700 dark:text-red-300">Loại sai lệch</th>
                                    <th className="px-3 py-2 text-right font-bold text-red-700 dark:text-red-300">Nội bộ</th>
                                    <th className="px-3 py-2 text-right font-bold text-red-700 dark:text-red-300">BHXH</th>
                                    <th className="px-3 py-2 text-right font-bold text-red-700 dark:text-red-300">Chênh lệch</th>
                                    <th className="px-3 py-2 text-center font-bold text-red-700 dark:text-red-300">Trạng thái</th>
                                    <th className="px-3 py-2 text-center font-bold text-red-700 dark:text-red-300">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discrepancies.map((disc: any) => (
                                    <tr key={disc.id} className="border-b border-red-200 dark:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-900/10">
                                        <td className="px-3 py-2 font-bold">{disc.employee_code}</td>
                                        <td className="px-3 py-2">{disc.employee_name}</td>
                                        <td className="px-3 py-2">
                                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                                {disc.discrepancy_type === 'MISSING_IN_BHXH' ? 'Thiếu ở BHXH' :
                                                    disc.discrepancy_type === 'SALARY_MISMATCH' ? 'Sai lương' : 'Thừa ở BHXH'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">{formatNumber(disc.internal_value)}</td>
                                        <td className="px-3 py-2 text-right font-mono">{formatNumber(disc.bhxh_value)}</td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-red-600">{formatNumber(disc.variance)}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-xs px-2 py-0.5 rounded ${disc.status === 'RESOLVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                                {disc.status === 'RESOLVED' ? 'Đã xử lý' : 'Chờ xử lý'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {disc.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleResolveDiscrepancy(disc)}
                                                    disabled={loading}
                                                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors"
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
                </div>
            )}
        </div>
    );
};

export default InsuranceReportView;
