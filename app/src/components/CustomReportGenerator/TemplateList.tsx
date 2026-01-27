/**
 * Template List Component
 * Display saved templates with actions
 */

import React from 'react';
import type { SavedTemplate } from './index';

interface TemplateListProps {
    templates: SavedTemplate[];
    onCreateNew: () => void;
    onUseTemplate: (template: SavedTemplate) => void;
    onDeleteTemplate: (templateId: string) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
    templates,
    onCreateNew,
    onUseTemplate,
    onDeleteTemplate
}) => {
    const myTemplates = templates.filter(t => t.isOwner);
    const sharedTemplates = templates.filter(t => !t.isOwner && t.is_shared);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        Mẫu báo cáo tùy biến
                    </h2>
                    <p className="text-sm text-slate-500">
                        Import mẫu Excel và tạo báo cáo với dữ liệu thực
                    </p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Tạo mẫu mới
                </button>
            </div>

            {/* Empty state */}
            {templates.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-blue-600">dashboard_customize</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                        Chưa có mẫu báo cáo nào
                    </h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        Import mẫu Excel báo cáo của bạn, hệ thống sẽ phân tích và tự động mapping với dữ liệu trong CSDL
                    </p>
                    <button
                        onClick={onCreateNew}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">upload_file</span>
                        Import mẫu Excel đầu tiên
                    </button>
                </div>
            )}

            {/* My templates */}
            {myTemplates.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        Mẫu của tôi ({myTemplates.length})
                    </h3>
                    <div className="grid gap-3">
                        {myTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onUse={() => onUseTemplate(template)}
                                onDelete={() => onDeleteTemplate(template.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Shared templates */}
            {sharedTemplates.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">group</span>
                        Mẫu được chia sẻ ({sharedTemplates.length})
                    </h3>
                    <div className="grid gap-3">
                        {sharedTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onUse={() => onUseTemplate(template)}
                                showOwner
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Tips section */}
            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[18px]">help</span>
                    Hướng dẫn sử dụng
                </h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-bold">1</span>
                        </div>
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">Upload mẫu Excel</p>
                            <p className="text-slate-500">Sử dụng mẫu báo cáo có sẵn hoặc tự thiết kế</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-bold">2</span>
                        </div>
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">Kiểm tra mapping</p>
                            <p className="text-slate-500">Hệ thống tự nhận diện, bạn có thể chỉnh sửa</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-bold">3</span>
                        </div>
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">Tạo báo cáo</p>
                            <p className="text-slate-500">Xem trước, in ấn hoặc xuất Excel</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Individual template card
const TemplateCard: React.FC<{
    template: SavedTemplate;
    onUse: () => void;
    onDelete?: () => void;
    showOwner?: boolean;
}> = ({ template, onUse, onDelete, showOwner }) => {
    const formatDate = (dateStr: string): string => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800 dark:text-white truncate">
                            {template.name}
                        </h4>
                        {template.is_shared && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                                Công ty
                            </span>
                        )}
                    </div>
                    {template.description && (
                        <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                            {template.description}
                        </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">description</span>
                            {template.original_filename}
                        </span>
                        {showOwner && (
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">person</span>
                                {template.created_by}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {formatDate(template.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                            {template.usage_count} lần sử dụng
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <button
                        onClick={onUse}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                        Sử dụng
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa template"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
