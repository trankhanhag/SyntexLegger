import React, { useState } from 'react';
import { closingService } from '../api';

interface Step {
    id: string;
    name: string;
    status: 'wait' | 'loading' | 'success' | 'error';
    error?: string;
}

interface MacroSequenceProps {
    onClose: () => void;
    onNavigate?: (viewId: string, data?: any) => void;
}

export const MacroSequence: React.FC<MacroSequenceProps> = ({ onClose, onNavigate }) => {
    const [period, setPeriod] = useState(`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`);
    const [isRunning, setIsRunning] = useState(false);
    const [steps, setSteps] = useState<Step[]>([
        { id: 'valuation', name: 'Tính giá vốn (Stock Valuation)', status: 'wait' },
        { id: 'depreciation', name: 'Trích hao mòn/khấu hao (HCSN)', status: 'wait' },
        { id: 'revenue_recognition', name: 'Ghi thu từ nguồn tạm thu (366)', status: 'wait' },
        { id: 'allocation', name: 'Phân bổ chi phí (Allocation)', status: 'wait' },
        { id: 'fx', name: 'Đánh giá tỷ giá (FX Revaluation)', status: 'wait' },
        { id: 'vat', name: 'Kết chuyển VAT (nếu có)', status: 'wait' },
        { id: 'payroll', name: 'Hạch toán Lương & Bảo hiểm (334, 332)', status: 'wait' },
        { id: 'pl', name: 'Kết chuyển thặng dư/thâm hụt (811)', status: 'wait' },
        { id: 'fund_distribution', name: 'Trích lập các Quỹ (431)', status: 'wait' },
    ]);
    const [result, setResult] = useState<{ success: boolean; message: string; vouchers?: any[] } | null>(null);

    const updateStepStatus = (index: number, status: Step['status'], error?: string) => {
        setSteps(prev => {
            const newSteps = [...prev];
            newSteps[index] = { ...newSteps[index], status, error };
            return newSteps;
        });
    };

    const runMacro = async () => {
        setIsRunning(true);
        setResult(null);

        // Reset steps
        setSteps(prev => prev.map(s => ({ ...s, status: 'wait', error: undefined })));

        try {
            // Sequentially animate steps while backend processes
            for (let i = 0; i < steps.length; i++) {
                updateStepStatus(i, 'loading');
                await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay per step
            }

            // Trigger backend (actual processing)
            const response = await closingService.executeMacro(period);

            // Mark all steps as success after backend completes
            for (let i = 0; i < steps.length; i++) {
                updateStepStatus(i, 'success');
            }

            setIsRunning(false);
            setResult({
                success: true,
                message: response.data?.message || `Các bút toán kết chuyển kỳ ${period} đã được thực hiện thành công.`,
                vouchers: response.data?.createdVouchers || []
            });
        } catch (err: any) {
            const errMsg = err.response?.data?.message || err.message;
            // Find the first loading step and mark it as error
            const loadingIdx = steps.findIndex(s => s.status === 'loading');
            if (loadingIdx >= 0) {
                updateStepStatus(loadingIdx, 'error', errMsg);
            } else {
                updateStepStatus(0, 'error', errMsg);
            }
            setResult({ success: false, message: errMsg });
            setIsRunning(false);
        }
    };

    const getStatusIcon = (status: Step['status']) => {
        switch (status) {
            case 'loading': return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>;
            case 'success': return <span className="material-symbols-outlined text-green-500">check_circle</span>;
            case 'error': return <span className="material-symbols-outlined text-red-500">error</span>;
            default: return <span className="material-symbols-outlined text-slate-300">circle</span>;
        }
    };

    return (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                        QUY TRÌNH CUỐI THÁNG
                    </h2>
                    <p className="text-blue-100 text-[13px] font-medium mt-1">Tự động hóa các bút toán kết chuyển và chốt số liệu cuối tháng</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Period Selector */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Kỳ kế toán thực hiện</label>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">calendar_month</span>
                                <input
                                    type="month"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    disabled={isRunning}
                                    className="bg-transparent text-[15px] font-bold text-slate-800 dark:text-white outline-none w-full cursor-pointer"
                                />
                                <span className="text-[13px] font-medium text-slate-500 min-w-[100px]">
                                    (Tháng {period.split('-')[1]}/{period.split('-')[0]})
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={runMacro}
                            disabled={isRunning}
                            className={`px-6 py-2.5 rounded-lg font-semibold text-[13px] transition-all shadow-lg flex items-center gap-2 ${isRunning ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{isRunning ? 'sync' : 'play_arrow'}</span>
                            {isRunning ? 'ĐANG CHẠY...' : 'BẮT ĐẦU NGAY'}
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="space-y-3">
                        {steps.map((step, idx) => (
                            <div
                                key={step.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${step.status === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 scale-[1.02] shadow-sm' : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'} ${step.status === 'error' ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10' : ''}`}
                            >
                                <div className="text-slate-400 font-mono text-[11px] w-4">{idx + 1}</div>
                                <div className="flex-1">
                                    <div className="font-bold text-[13px] text-slate-700 dark:text-slate-200 flex items-center justify-between">
                                        {step.name}
                                        {getStatusIcon(step.status)}
                                    </div>
                                    {step.error && (
                                        <div className="text-[11px] text-red-600 mt-1 font-medium bg-red-100 dark:bg-red-900/30 p-2 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-1">
                                            <span className="material-symbols-outlined text-[14px] mt-0.5">warning</span>
                                            {step.error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Final Result Notification */}
                    {result && (
                        <div className={`p-6 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-500 ${result.success ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'}`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.success ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                <span className="material-symbols-outlined text-2xl">{result.success ? 'verified' : 'error'}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-bold text-[13px] ${result.success ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-800 dark:text-red-400'}`}>
                                    {result.success ? 'QUY TRÌNH HOÀN TẤT' : 'PHÁT SINH LỖI'}
                                </h4>
                                <p className="text-[12px] opacity-80 mb-3">{result.message}</p>

                                {result.success && result.vouchers && result.vouchers.length > 0 && (
                                    <div className="bg-white/50 dark:bg-slate-900/40 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/50">
                                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider mb-2">Chứng từ đã tạo ({result.vouchers.length}):</p>
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {result.vouchers.map((v: any) => (
                                                <div key={v.id} className="flex items-center justify-between text-[12px] border-b border-emerald-100/50 dark:border-emerald-800/30 pb-2 last:border-0 last:pb-0">
                                                    <div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{v.docNo}</span>
                                                        <span className="mx-2 text-slate-400">|</span>
                                                        <span className="text-slate-500 dark:text-slate-400">{v.description}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            onNavigate?.('voucher_list', { voucherIds: [v.id] });
                                                            // In a real app we might pass a filter state to show only this voucher
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                        XEM
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                        {result?.success ? 'ĐÓNG' : 'HỦY BỎ'}
                    </button>
                    {result?.success && (
                        <>
                            <button
                                onClick={() => {
                                    onClose();
                                    onNavigate?.('voucher_list', { voucherIds: result.vouchers?.map(v => v.id) });
                                }}
                                className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">list_alt</span>
                                XEM CÁC BÚT TOÁN
                            </button>
                            <button
                                onClick={() => {
                                    onClose();
                                    onNavigate?.('balance_sheet_hcsn');
                                }}
                                className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">description</span>
                                XEM BÁO CÁO CÂN ĐỐI KẾ TOÁN
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
