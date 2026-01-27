/**
 * Field Mapping Editor Component
 * Allows users to review and edit field mappings
 */

import React, { useState, useMemo } from 'react';
import type { DetectedField, FieldMapping, TemplateAnalysis, SchemaInfo } from './index';

interface FieldMappingEditorProps {
    analysis: TemplateAnalysis;
    fieldMappings: DetectedField[];
    schemaInfo: SchemaInfo[];
    aiStatus: { available: boolean; reason: string | null };
    onMappingChange: (fieldIndex: number, mapping: FieldMapping | null) => void;
    onAIEnhance: () => void;
    onSave: (name: string, description: string, isShared: boolean) => void;
    onPreview: () => void;
    onBack: () => void;
    loading: boolean;
}

export const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({
    analysis,
    fieldMappings,
    schemaInfo,
    aiStatus,
    onMappingChange,
    onAIEnhance,
    onSave,
    onPreview,
    onBack,
    loading
}) => {
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [templateName, setTemplateName] = useState(analysis.filename.replace(/\.[^.]+$/, ''));
    const [templateDesc, setTemplateDesc] = useState('');
    const [isShared, setIsShared] = useState(false);
    const [editingField, setEditingField] = useState<number | null>(null);

    // Stats
    const stats = useMemo(() => {
        const total = fieldMappings.length;
        const mapped = fieldMappings.filter(f => f.mapping).length;
        const highConfidence = fieldMappings.filter(f => f.confidence >= 0.8).length;
        const needsAI = fieldMappings.filter(f => f.needsAIEnhancement).length;
        return { total, mapped, highConfidence, needsAI };
    }, [fieldMappings]);

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.8) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
        if (confidence >= 0.5) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    };

    const handleSelectMapping = (fieldIndex: number, table: string, column: string, type: string) => {
        onMappingChange(fieldIndex, {
            table,
            column,
            type: type as any,
            confidence: 1.0,
            userCorrected: true
        });
        setEditingField(null);
    };

    const handleClearMapping = (fieldIndex: number) => {
        onMappingChange(fieldIndex, null);
    };

    const handleSaveClick = () => {
        setShowSaveModal(true);
    };

    const handleConfirmSave = () => {
        if (!templateName.trim()) return;
        onSave(templateName.trim(), templateDesc.trim(), isShared);
        setShowSaveModal(false);
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        <span className="text-sm">Quay lại</span>
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        Chỉnh sửa Field Mappings
                    </h2>
                    <p className="text-sm text-slate-500">
                        File: <span className="font-medium">{analysis.filename}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {aiStatus.available && stats.needsAI > 0 && (
                        <button
                            onClick={onAIEnhance}
                            disabled={loading}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            AI Enhance ({stats.needsAI})
                        </button>
                    )}
                    <button
                        onClick={onPreview}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">preview</span>
                        Xem trước
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={stats.mapped === 0}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Lưu Template
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</div>
                    <div className="text-xs text-slate-500">Tổng trường</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-green-600">{stats.mapped}</div>
                    <div className="text-xs text-slate-500">Đã mapping</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-blue-600">{stats.highConfidence}</div>
                    <div className="text-xs text-slate-500">Độ tin cậy cao</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-amber-600">{stats.needsAI}</div>
                    <div className="text-xs text-slate-500">Cần xử lý</div>
                </div>
            </div>

            {/* AI Status hint */}
            {!aiStatus.available && stats.needsAI > 0 && (
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <span>AI Enhancement không khả dụng. {aiStatus.reason}. Bạn có thể mapping thủ công.</span>
                </div>
            )}

            {/* Field list */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="grid grid-cols-[1fr,auto,2fr,auto] gap-4 p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <div>Trường gốc (Excel)</div>
                    <div>Độ tin cậy</div>
                    <div>Mapping Database</div>
                    <div className="text-right">Thao tác</div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                    {fieldMappings.map((field, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr,auto,2fr,auto] gap-4 p-3 items-center hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            {/* Original field */}
                            <div>
                                <div className="font-medium text-slate-800 dark:text-white">{field.originalText}</div>
                                <div className="text-xs text-slate-400">
                                    Vị trí: Row {field.position.row + 1}, Col {field.position.col + 1}
                                </div>
                            </div>

                            {/* Confidence */}
                            <div>
                                {field.mapping ? (
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(field.confidence)}`}>
                                        {Math.round(field.confidence * 100)}%
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700">
                                        -
                                    </span>
                                )}
                            </div>

                            {/* Mapping */}
                            <div>
                                {editingField === idx ? (
                                    <MappingSelector
                                        schemaInfo={schemaInfo}
                                        currentMapping={field.mapping}
                                        onSelect={(table, column, type) => handleSelectMapping(idx, table, column, type)}
                                        onCancel={() => setEditingField(null)}
                                    />
                                ) : field.mapping ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            {field.mapping.table}.{field.mapping.column}
                                        </span>
                                        <span className="text-xs text-slate-400">({field.mapping.type})</span>
                                        {field.mapping.userCorrected && (
                                            <span className="text-xs text-blue-500">Đã sửa</span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Chưa mapping</span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 justify-end">
                                {editingField !== idx && (
                                    <>
                                        <button
                                            onClick={() => setEditingField(idx)}
                                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600"
                                            title="Chỉnh sửa mapping"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        {field.mapping && (
                                            <button
                                                onClick={() => handleClearMapping(idx)}
                                                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-600"
                                                title="Xóa mapping"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Lưu Template</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Tên template *
                                </label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    placeholder="Ví dụ: Sổ cái tài khoản 111"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    value={templateDesc}
                                    onChange={(e) => setTemplateDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    rows={3}
                                    placeholder="Mô tả ngắn về template này..."
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isShared}
                                    onChange={(e) => setIsShared(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    Chia sẻ với toàn công ty
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                disabled={!templateName.trim() || loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
                            >
                                {loading ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Mapping selector dropdown
const MappingSelector: React.FC<{
    schemaInfo: SchemaInfo[];
    currentMapping: FieldMapping | null;
    onSelect: (table: string, column: string, type: string) => void;
    onCancel: () => void;
}> = ({ schemaInfo, currentMapping, onSelect, onCancel }) => {
    const [selectedTable, setSelectedTable] = useState(currentMapping?.table || '');
    const [selectedColumn, setSelectedColumn] = useState(currentMapping?.column || '');

    const tableInfo = schemaInfo.find(s => s.table_name === selectedTable);
    const columns = tableInfo?.key_columns || [];

    const handleConfirm = () => {
        if (selectedTable && selectedColumn) {
            const col = columns.find(c => c.column === selectedColumn);
            onSelect(selectedTable, selectedColumn, col?.type || 'text');
        }
    };

    return (
        <div className="flex items-center gap-2">
            <select
                value={selectedTable}
                onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setSelectedColumn('');
                }}
                className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
            >
                <option value="">-- Chọn bảng --</option>
                {schemaInfo.map(s => (
                    <option key={s.table_name} value={s.table_name}>
                        {s.display_name_vi}
                    </option>
                ))}
            </select>

            {selectedTable && (
                <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                >
                    <option value="">-- Chọn cột --</option>
                    {columns.map(col => (
                        <option key={col.column} value={col.column}>
                            {col.display} ({col.column})
                        </option>
                    ))}
                </select>
            )}

            <button
                onClick={handleConfirm}
                disabled={!selectedTable || !selectedColumn}
                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
            >
                <span className="material-symbols-outlined text-[18px]">check</span>
            </button>
            <button
                onClick={onCancel}
                className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    );
};
