/**
 * PeriodLock Component
 * SyntexLegger - Khóa sổ kỳ kế toán
 */

import React from 'react';
import { settingsService } from '../../api';
import { DateInput } from '../DateInput';
import { FormModal } from '../FormModal';

interface PeriodLockProps {
    onClose: () => void;
    onRefresh: () => void;
}

export const PeriodLock: React.FC<PeriodLockProps> = ({ onClose, onRefresh }) => {
    const [lockedDate, setLockedDate] = React.useState('');
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await settingsService.getSettings();
                if (res.data.locked_until_date) {
                    setLockedDate(res.data.locked_until_date);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            await settingsService.updateSetting('locked_until_date', lockedDate);
            alert("Đã cập nhật ngày khóa sổ thành công.");
            onRefresh();
            onClose();
        } catch (err) {
            console.error("Failed to update lock date:", err);
            alert("Lỗi khi cập nhật ngày khóa sổ.");
        }
    };

    if (loading) return null;

    return (
        <FormModal title="Khóa sổ Kỳ Kế toán" onClose={onClose}>
            <div className="flex items-start gap-4 mb-6">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Xác nhận khóa sổ?</h3>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Các chứng từ phát sinh trước hoặc trong ngày khóa sổ sẽ <span className="font-bold text-red-500">không thể chỉnh sửa hoặc xóa</span>.
                        Thao tác này nhằm đảm bảo tính toàn vẹn dữ liệu cho báo cáo tài chính.
                    </p>
                </div>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Ngày Khóa sổ (Khóa đến hết ngày):</label>
                <DateInput
                    className="form-input"
                    value={lockedDate}
                    onChange={setLockedDate}
                />
            </div>

            <div className="form-actions border-0 pt-0">
                <button onClick={onClose} className="form-button-secondary">Bỏ qua</button>
                <button
                    onClick={handleSave}
                    className="form-button-primary bg-red-600 hover:bg-red-700"
                >
                    Xác nhận Khóa sổ
                </button>
            </div>
        </FormModal>
    );
};

export default PeriodLock;
