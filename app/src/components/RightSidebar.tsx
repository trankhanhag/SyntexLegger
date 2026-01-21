import React, { useState, useEffect } from 'react';
import { checklistService } from '../api';

interface ChecklistItem {
    id: number;
    title: string;
    category: string;
    status: 'todo' | 'done';
    is_visible: number;
}

export const RightSidebar: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Hàng ngày');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await checklistService.getAll();
            setItems(res.data);
        } catch (err) {
            console.error("Failed to fetch checklist:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (item: ChecklistItem) => {
        const newStatus = item.status === 'todo' ? 'done' : 'todo';
        try {
            await checklistService.update(item.id, { status: newStatus });
            setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const toggleVisibility = async (item: ChecklistItem) => {
        const newVisibility = item.is_visible === 1 ? 0 : 1;
        try {
            await checklistService.update(item.id, { is_visible: newVisibility });
            setItems(items.map(i => i.id === item.id ? { ...i, is_visible: newVisibility } : i));
        } catch (err) {
            console.error("Failed to update visibility:", err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Xóa công việc này khỏi danh sách?")) return;
        try {
            await checklistService.delete(id);
            setItems(items.filter(i => i.id !== id));
        } catch (err) {
            console.error("Failed to delete item:", err);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemTitle.trim()) return;
        try {
            const res = await checklistService.add({ title: newItemTitle, category: newItemCategory });
            setItems([...items, res.data]);
            setNewItemTitle('');
        } catch (err) {
            console.error("Failed to add item:", err);
        }
    };

    const categories = ['Hàng ngày', 'Hàng tháng', 'Hàng quý'];
    const visibleItems = items.filter(i => i.is_visible === 1 || isEditMode);

    return (
        <div
            className={`relative z-50 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0 ${isExpanded ? 'w-[320px] shadow-2xl' : 'w-12'}`}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`absolute -left-10 top-4 w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-l-xl shadow-lg flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors`}
            >
                <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    chevron_left
                </span>
            </button>

            {!isExpanded ? (
                <div className="flex flex-col items-center pt-8 gap-8 overflow-hidden">
                    <span className="material-symbols-outlined text-slate-400 rotate-90 whitespace-nowrap font-bold text-xs uppercase tracking-[0.2em]">
                        Checklist
                    </span>
                    <div className="flex flex-col gap-4 mt-4">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tighter">Lộ trình kế toán</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Checklist định kỳ</p>
                        </div>
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`p-1.5 rounded-lg transition-all ${isEditMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title="Tùy chỉnh danh sách"
                        >
                            <span className="material-symbols-outlined text-[18px]">settings</span>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                            <span>Tiến độ tổng quát</span>
                            <span>{items.length > 0 ? Math.round((items.filter(i => i.status === 'done').length / items.length) * 100) : 0}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                style={{ width: `${items.length > 0 ? (items.filter(i => i.status === 'done').length / items.length) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {loading ? (
                            <div className="flex items-center justify-center p-10">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            categories.map(category => {
                                const categoryItems = visibleItems.filter(i => i.category === category);
                                if (categoryItems.length === 0 && !isEditMode) return null;

                                return (
                                    <div key={category} className="space-y-3">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${category === 'Hàng ngày' ? 'bg-green-500' : category === 'Hàng tháng' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                            {category}
                                        </h4>
                                        <div className="space-y-2">
                                            {categoryItems.map(item => (
                                                <div
                                                    key={item.id}
                                                    className={`group relative flex items-start gap-3 p-2.5 rounded-xl border transition-all ${item.status === 'done' ? 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent opacity-60' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm'}`}
                                                >
                                                    <button
                                                        onClick={() => !isEditMode && toggleStatus(item)}
                                                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${item.status === 'done' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-600 hover:border-blue-400'}`}
                                                    >
                                                        {item.status === 'done' && <span className="material-symbols-outlined text-[14px] font-black">check</span>}
                                                    </button>

                                                    <div className="flex-1 overflow-hidden">
                                                        <p className={`text-xs font-bold leading-tight ${item.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                            {item.title}
                                                        </p>
                                                    </div>

                                                    {isEditMode && (
                                                        <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 px-2 rounded-xl border-l border-slate-100 dark:border-slate-700 animate-fadeInShort">
                                                            <button
                                                                onClick={() => toggleVisibility(item)}
                                                                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${item.is_visible === 1 ? 'text-blue-500' : 'text-slate-400'}`}
                                                                title={item.is_visible === 1 ? 'Ẩn' : 'Hiện'}
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">{item.is_visible === 1 ? 'visibility' : 'visibility_off'}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Add Form (Edit Mode Only) */}
                    {isEditMode && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <form onSubmit={handleAddItem} className="space-y-3">
                                <div className="flex gap-2">
                                    <select
                                        value={newItemCategory}
                                        onChange={(e) => setNewItemCategory(e.target.value)}
                                        className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none"
                                    >
                                        <option>Hàng ngày</option>
                                        <option>Hàng tháng</option>
                                        <option>Hàng quý</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newItemTitle}
                                        onChange={(e) => setNewItemTitle(e.target.value)}
                                        placeholder="Thêm công việc mới..."
                                        className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white rounded-lg px-3 flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">add</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Footer Tip */}
                    {!isEditMode && (
                        <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex gap-3">
                                <div className="mt-0.5 text-blue-500">
                                    <span className="material-symbols-outlined text-[16px] font-black">lightbulb</span>
                                </div>
                                <p className="text-[10px] text-slate-500 italic leading-normal">
                                    Nhấp vào biểu tượng bánh răng để tùy chỉnh danh sách công việc phù hợp với thực tế tại DN của bạn.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
