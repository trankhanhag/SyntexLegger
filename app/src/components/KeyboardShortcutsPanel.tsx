import React, { useEffect, useState } from 'react';
import { FormModal } from './FormModal';

interface KeyboardShortcutsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    {
        category: 'Navigation', shortcuts: [
            { keys: ['Ctrl', 'Home'], desc: 'Về Dashboard' },
            { keys: ['Ctrl', '1'], desc: 'Tab Tổng hợp' },
            { keys: ['Ctrl', '2'], desc: 'Tab Báo cáo' },
            { keys: ['Ctrl', '3'], desc: 'Tab Ngân quỹ' },
        ]
    },
    {
        category: 'Chứng từ', shortcuts: [
            { keys: ['Ctrl', 'N'], desc: 'Tạo chứng từ mới' },
            { keys: ['Ctrl', 'S'], desc: 'Lưu chứng từ' },
            { keys: ['Ctrl', 'P'], desc: 'In chứng từ' },
            { keys: ['Ctrl', 'D'], desc: 'Sao chép chứng từ' },
            { keys: ['Delete'], desc: 'Xóa dòng hiện tại' },
        ]
    },
    {
        category: 'Chỉnh sửa', shortcuts: [
            { keys: ['Ctrl', 'Z'], desc: 'Hoàn tác' },
            { keys: ['Ctrl', 'Y'], desc: 'Làm lại' },
            { keys: ['Ctrl', 'C'], desc: 'Sao chép' },
            { keys: ['Ctrl', 'V'], desc: 'Dán' },
        ]
    },
    {
        category: 'Hiển thị', shortcuts: [
            { keys: ['Ctrl', '+'], desc: 'Phóng to' },
            { keys: ['Ctrl', '-'], desc: 'Thu nhỏ' },
            { keys: ['Ctrl', '0'], desc: 'Về kích thước gốc' },
            { keys: ['F11'], desc: 'Toàn màn hình' },
            { keys: ['Shift', '?'], desc: 'Mở bảng phím tắt này' },
        ]
    },
];

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <FormModal title="Phím tắt" onClose={onClose} panelClass="max-w-lg">
            <div className="space-y-4">
                {SHORTCUTS.map((cat, idx) => (
                    <div key={idx}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{cat.category}</h4>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
                            {cat.shortcuts.map((shortcut, sIdx) => (
                                <div key={sIdx} className="flex items-center justify-between px-3 py-2">
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{shortcut.desc}</span>
                                    <div className="flex gap-1">
                                        {shortcut.keys.map((key, kIdx) => (
                                            <kbd key={kIdx} className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono font-medium text-slate-600 dark:text-slate-300 shadow-sm">
                                                {key}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <p className="text-[10px] text-slate-400 text-center pt-2">
                    Nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] mx-0.5">Esc</kbd> để đóng
                </p>
            </div>
        </FormModal>
    );
};

// Hook to detect Shift+? and open shortcuts panel
export const useKeyboardShortcuts = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Shift + ? opens shortcuts panel
            if (e.shiftKey && e.key === '?') {
                e.preventDefault();
                setIsOpen(true);
            }
            // Escape closes
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
};

// Wrapper component that combines hook and panel
export const KeyboardShortcutsPanelWrapper: React.FC = () => {
    const { isOpen, close } = useKeyboardShortcuts();
    return <KeyboardShortcutsPanel isOpen={isOpen} onClose={close} />;
};

export default KeyboardShortcutsPanel;
