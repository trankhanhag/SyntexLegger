import React from 'react';
import { auditService } from '../api';
import { FormModal } from './FormModal';

// Simple Modal Wrapper reproduced here to avoid dependency cycle or heavy imports
const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} icon="health_and_safety" sizeClass="max-w-4xl">
        {children}
    </FormModal>
);

// ... imports

export const TaxHealthReport = ({ onClose, isModal = false, onNavigate }: { onClose?: () => void, isModal?: boolean, onNavigate?: (viewId: string) => void }) => {
    const [loading, setLoading] = React.useState(true);
    const [result, setResult] = React.useState<any>(null);
    const [error, setError] = React.useState<string | null>(null);

    const runAudit = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await auditService.healthCheck();
            setResult(res.data);
        } catch (err) {
            console.error("Audit failed:", err);
            setResult(null);
            setError('Không thể tải dữ liệu kiểm tra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        runAudit();
    }, [runAudit]);

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-blue-600';
        if (score >= 50) return 'text-amber-600';
        return 'text-red-600';
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Nghiêm trọng</span>;
            case 'warning': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Cảnh báo</span>;
            default: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Thông tin</span>;
        }
    };

    const handleFixNow = (target: string) => {
        if (onNavigate && target) {
            onNavigate(target);
            if (onClose) onClose();
        } else {
            alert(`Chức năng 'Nhảy đến ô sai' đang được đồng bộ với Grid dữ liệu. Hãy tìm các ô có viền đỏ trên bảng.`);
        }
    };

    if (loading) return (
        <div className={`flex flex-col items-center justify-center space-y-6 ${isModal ? 'p-20' : 'p-10 h-full'}`}>
            <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                <span className="material-symbols-outlined text-blue-600 text-4xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">search_check</span>
            </div>
            <div className="text-center">
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 animate-pulse">Đang quét rủi ro thuế...</p>
                <p className="text-sm text-slate-400 mt-2">Hệ thống đang kiểm tra hàng trăm logic nghiệp vụ và kết nối với dữ liệu Tổng cục Thuế</p>
            </div>
        </div>
    );

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center space-y-4 ${isModal ? 'p-16' : 'p-10 h-full'}`}>
                <span className="material-symbols-outlined text-4xl text-red-500">error</span>
                <p className="text-slate-600 font-medium">{error}</p>
                <button
                    onClick={runAudit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (!result) {
        return (
            <div className={`flex flex-col items-center justify-center space-y-4 ${isModal ? 'p-16' : 'p-10 h-full'}`}>
                <span className="material-symbols-outlined text-4xl text-slate-400">warning</span>
                <p className="text-slate-500">Không có dữ liệu kiểm tra để hiển thị.</p>
            </div>
        );
    }

    const anomalies = result.anomalies || [];
    const displayScore = anomalies.length === 0 ? 100 : (Number(result.score) || 0);

    return (
        <div className={`space-y-8 ${isModal ? 'max-h-[70vh]' : 'h-full overflow-y-auto p-8'}`}>
            {/* Dashboard Header */}
            <div className="flex items-center gap-10 p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-inner">
                <div className="relative flex-shrink-0">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={352} strokeDashoffset={String(352 - (352 * displayScore / 100))} strokeLinecap="round" className={`${getScoreColor(displayScore)} transition-all duration-1000 ease-out`} />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-slate-800 dark:text-white flex flex-col items-center justify-center">
                        <div className={`text-4xl font-black leading-none mb-1 ${getScoreColor(displayScore)}`}>{displayScore}</div>
                        <div className="text-[10px] font-bold uppercase text-slate-500 leading-none">Điểm</div>
                    </div>
                </div>

                <div className="flex-1 space-y-3">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Của bạn đang ở mức {displayScore >= 80 ? 'An Toàn' : displayScore >= 50 ? 'Trung Bình' : 'Rủi Ro Cao'}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed italic">
                        Dựa trên phân tích dữ liệu Sổ cái và đối soát hóa đơn điện tử.
                        Bạn có <span className="font-bold text-red-600">{anomalies.filter((a: any) => a.severity === 'critical').length} lỗi nghiêm trọng</span> cần xử lý ngay để tránh bị phạt.
                    </p>
                    <div className="flex gap-4 pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold border-r border-slate-300 dark:border-slate-700 pr-4">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            {anomalies.filter((a: any) => a.severity === 'critical').length} Critical
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold border-r border-slate-300 dark:border-slate-700 pr-4">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {anomalies.filter((a: any) => a.severity === 'warning').length} Warning
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {anomalies.filter((a: any) => a.severity === 'info').length} Info
                        </div>
                    </div>
                </div>
            </div>

            {/* Anomalies List */}
            <div className={`space-y-4 ${isModal ? 'overflow-y-auto pr-2' : ''}`}>
                <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <span className="material-symbols-outlined text-blue-600">list_alt_check</span>
                    Chi tiết các sai sót và rủi ro phát hiện
                </h4>

                {anomalies.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <span className="material-symbols-outlined text-green-500 text-5xl mb-2">verified</span>
                        <p className="text-slate-500 font-bold">Tuyệt vời! Hệ thống chưa phát hiện sai sót trọng yếu nào.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {anomalies.map((anom: any, idx: number) => (
                            <div key={idx} className={`p-4 rounded-xl border-l-4 bg-white dark:bg-slate-800/50 shadow-sm flex justify-between items-center group hover:shadow-md transition-all ${anom.severity === 'critical' ? 'border-red-500' : anom.severity === 'warning' ? 'border-amber-500' : 'border-blue-500'}`}>
                                <div className="flex gap-4 items-start">
                                    <div className={`mt-1 p-2 rounded-lg ${anom.severity === 'critical' ? 'bg-red-50 text-red-600' : anom.severity === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <span className="material-symbols-outlined text-[20px]">
                                            {anom.severity === 'critical' ? 'emergency_home' : anom.severity === 'warning' ? 'warning' : 'info'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{anom.type}</span>
                                            {getSeverityBadge(anom.severity)}
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{anom.message}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFixNow(anom.target)}
                                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all text-slate-600 dark:text-slate-300"
                                >
                                    Sửa ngay <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Action (Only show in Modal or if needed) */}
            {isModal && (
                <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[12px]">verified_user</span>
                        Dữ liệu được bảo mật bởi Syntex Ledger Audit AI
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all">Đóng</button>
                        <button onClick={() => window.print()} className="form-button-primary flex items-center gap-2">
                            <span className="material-symbols-outlined">description</span> Xuất báo cáo PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const VirtualAuditHealthCheck = ({ onClose, onNavigate }: { onClose: () => void, onNavigate?: (viewId: string) => void }) => {
    return (
        <Modal title="Báo cáo Sức khỏe Thuế & Rủi ro Kế toán" onClose={onClose}>
            <TaxHealthReport onClose={onClose} isModal={true} onNavigate={onNavigate} />
        </Modal>
    );
};
