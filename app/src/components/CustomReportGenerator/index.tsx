/**
 * Custom Report Generator Module
 * SyntexLegger - Import Excel templates and generate custom reports
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TemplateUploader } from './TemplateUploader';
import { FieldMappingEditor } from './FieldMappingEditor';
import { ReportPreview } from './ReportPreview';
import { TemplateList } from './TemplateList';
import { customReportService } from '../../api';
import logger from '../../utils/logger';

// Types
export interface DetectedField {
    originalText: string;
    position: { row: number; col: number };
    mapping: FieldMapping | null;
    confidence: number;
    needsAIEnhancement: boolean;
    aggregation: { function: string; keyword: string } | null;
    datePeriod: { type: string; keyword: string } | null;
}

export interface FieldMapping {
    table: string;
    column: string;
    type: 'text' | 'number' | 'date' | 'computed';
    confidence: number;
    matchedTerm?: string;
    userCorrected?: boolean;
}

export interface TemplateAnalysis {
    filename: string;
    fileSize: number;
    sheetCount: number;
    fieldCount: number;
    mappedFieldCount: number;
    reportType: string;
    reportTypeConfidence: number;
    needsAIEnhancement: boolean;
    templateHash: string;
    validation: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        stats: {
            totalFields: number;
            mappedFields: number;
            coverage: number;
            avgConfidence: number;
        };
    };
    detectedFields: DetectedField[];
    sheets: { name: string; rowCount: number; colCount: number; headerCount: number }[];
}

export interface SavedTemplate {
    id: string;
    name: string;
    description: string;
    original_filename: string;
    created_by: string;
    is_shared: boolean;
    usage_count: number;
    last_used_at: string;
    created_at: string;
    isOwner: boolean;
}

export interface SchemaInfo {
    table_name: string;
    display_name_vi: string;
    description_vi: string;
    common_aliases: string[];
    key_columns: { column: string; display: string; type: string }[];
    category: string;
}

type Step = 'list' | 'upload' | 'mapping' | 'preview';

interface CustomReportGeneratorProps {
    onSetHeader?: (header: { title: string; icon: string }) => void;
    exportSignal?: number;
    importSignal?: number;
}

export const CustomReportGenerator: React.FC<CustomReportGeneratorProps> = ({ onSetHeader, exportSignal = 0, importSignal = 0 }) => {
    const [currentStep, setCurrentStep] = useState<Step>('list');
    const [templateAnalysis, setTemplateAnalysis] = useState<TemplateAnalysis | null>(null);
    const [fieldMappings, setFieldMappings] = useState<DetectedField[]>([]);
    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
    const [schemaInfo, setSchemaInfo] = useState<SchemaInfo[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
    const [aiStatus, setAiStatus] = useState<{ available: boolean; reason: string | null }>({ available: false, reason: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs to track handled signals (prevent duplicate handling on re-renders)
    const lastHandledExportSignal = useRef(0);
    const lastHandledImportSignal = useRef(0);

    // Set header
    useEffect(() => {
        onSetHeader?.({
            title: 'Báo cáo Tùy biến',
            icon: 'dashboard_customize'
        });
    }, [onSetHeader]);

    // Load initial data
    useEffect(() => {
        loadTemplates();
        loadSchemaInfo();
        checkAIStatus();
    }, []);

    // Handle import signal from Ribbon - go to upload step
    useEffect(() => {
        if (importSignal > 0 && importSignal !== lastHandledImportSignal.current) {
            lastHandledImportSignal.current = importSignal;
            setCurrentStep('upload');
        }
    }, [importSignal]);

    // Handle export signal from Ribbon - trigger export if in preview with template
    useEffect(() => {
        if (exportSignal > 0 && exportSignal !== lastHandledExportSignal.current && currentStep === 'preview' && selectedTemplate) {
            lastHandledExportSignal.current = exportSignal;
            // Trigger Excel export
            handleExportExcel();
        }
    }, [exportSignal, currentStep, selectedTemplate]);

    const handleExportExcel = async () => {
        if (!selectedTemplate) {
            setError('Vui lòng chọn template để xuất Excel');
            return;
        }
        try {
            const response = await customReportService.generateReport(selectedTemplate.id, {
                filters: {},
                outputFormat: 'excel'
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedTemplate.name}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi xuất Excel');
        }
    };

    const loadTemplates = async () => {
        try {
            const response = await customReportService.getTemplates();
            setSavedTemplates(response.data.data || []);
        } catch (err) {
            logger.error('Failed to load templates:', err);
        }
    };

    const loadSchemaInfo = async () => {
        try {
            const response = await customReportService.getSchemaInfo();
            setSchemaInfo(response.data.data || []);
        } catch (err) {
            logger.error('Failed to load schema info:', err);
        }
    };

    const checkAIStatus = async () => {
        try {
            const response = await customReportService.getAIStatus();
            setAiStatus(response.data);
        } catch (err) {
            setAiStatus({ available: false, reason: 'Không thể kiểm tra trạng thái AI' });
        }
    };

    const handleFileUpload = useCallback(async (file: File) => {
        setLoading(true);
        setError(null);

        try {
            const response = await customReportService.analyzeTemplate(file);
            const analysis = response.data.data as TemplateAnalysis;

            setTemplateAnalysis(analysis);
            setFieldMappings(analysis.detectedFields);
            setCurrentStep('mapping');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi phân tích template');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAIEnhance = useCallback(async () => {
        if (!templateAnalysis) return;

        const unmappedFields = fieldMappings.filter(f => f.needsAIEnhancement);
        if (unmappedFields.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const response = await customReportService.aiEnhance({
                unmappedFields,
                templateHash: templateAnalysis.templateHash
            });

            if (response.data.success) {
                // Merge AI mappings with existing
                const aiMappings = response.data.data.mappings;
                setFieldMappings(prev => prev.map(field => {
                    const aiMapping = aiMappings.find((m: any) => m.field === field.originalText);
                    if (aiMapping && aiMapping.table && aiMapping.column) {
                        return {
                            ...field,
                            mapping: {
                                table: aiMapping.table,
                                column: aiMapping.column,
                                type: aiMapping.type || 'text',
                                confidence: aiMapping.confidence || 0.8
                            },
                            confidence: aiMapping.confidence || 0.8,
                            needsAIEnhancement: false
                        };
                    }
                    return field;
                }));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi AI Enhancement');
        } finally {
            setLoading(false);
        }
    }, [fieldMappings, templateAnalysis]);

    const handleMappingChange = useCallback((fieldIndex: number, mapping: FieldMapping | null) => {
        setFieldMappings(prev => prev.map((field, idx) => {
            if (idx === fieldIndex) {
                return {
                    ...field,
                    mapping: mapping ? { ...mapping, userCorrected: true } : null,
                    confidence: mapping ? 1.0 : 0,
                    needsAIEnhancement: !mapping
                };
            }
            return field;
        }));
    }, []);

    const handleSaveTemplate = useCallback(async (name: string, description: string, isShared: boolean) => {
        if (!templateAnalysis) return;

        setLoading(true);
        setError(null);

        try {
            await customReportService.saveTemplate({
                name,
                description,
                parsedTemplate: templateAnalysis,
                fieldMappings: fieldMappings.filter(f => f.mapping).map(f => ({
                    originalText: f.originalText,
                    ...f.mapping
                })),
                filename: templateAnalysis.filename,
                fileSize: templateAnalysis.fileSize,
                isShared
            });

            await loadTemplates();
            setCurrentStep('list');
            setTemplateAnalysis(null);
            setFieldMappings([]);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi lưu template');
        } finally {
            setLoading(false);
        }
    }, [templateAnalysis, fieldMappings]);

    const handleUseTemplate = useCallback(async (template: SavedTemplate) => {
        setSelectedTemplate(template);
        setCurrentStep('preview');
    }, []);

    const handleDeleteTemplate = useCallback(async (templateId: string) => {
        if (!confirm('Bạn có chắc muốn xóa template này?')) return;

        try {
            await customReportService.deleteTemplate(templateId);
            await loadTemplates();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi xóa template');
        }
    }, []);

    const handleGoToPreview = useCallback(() => {
        if (fieldMappings.filter(f => f.mapping).length === 0) {
            setError('Cần có ít nhất một trường đã mapping');
            return;
        }
        setCurrentStep('preview');
    }, [fieldMappings]);

    const handleBack = useCallback(() => {
        switch (currentStep) {
            case 'upload':
                setCurrentStep('list');
                break;
            case 'mapping':
                setCurrentStep('upload');
                setTemplateAnalysis(null);
                setFieldMappings([]);
                break;
            case 'preview':
                if (selectedTemplate) {
                    setSelectedTemplate(null);
                    setCurrentStep('list');
                } else {
                    setCurrentStep('mapping');
                }
                break;
        }
    }, [currentStep, selectedTemplate]);

    // Render step indicator
    const renderStepIndicator = () => {
        if (currentStep === 'list') return null;

        const steps = [
            { key: 'upload', label: 'Upload Template', icon: 'upload_file' },
            { key: 'mapping', label: 'Chỉnh sửa Mapping', icon: 'schema' },
            { key: 'preview', label: 'Xem trước & Xuất', icon: 'preview' }
        ];

        const currentIndex = steps.findIndex(s => s.key === currentStep);

        return (
            <div className="flex items-center justify-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.key}>
                        <div className={`flex items-center gap-2 ${idx <= currentIndex ? 'text-blue-600' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx <= currentIndex ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                {idx < currentIndex ? (
                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                ) : (
                                    idx + 1
                                )}
                            </div>
                            <span className="text-sm font-medium hidden sm:block">{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`w-12 h-0.5 ${idx < currentIndex ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Error display */}
            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}

            {/* Step indicator */}
            <div className="px-4 pt-4">
                {renderStepIndicator()}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto px-4 pb-4">
                {currentStep === 'list' && (
                    <TemplateList
                        templates={savedTemplates}
                        onCreateNew={() => setCurrentStep('upload')}
                        onUseTemplate={handleUseTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                    />
                )}

                {currentStep === 'upload' && (
                    <TemplateUploader
                        onFileUpload={handleFileUpload}
                        loading={loading}
                        onBack={handleBack}
                    />
                )}

                {currentStep === 'mapping' && templateAnalysis && (
                    <FieldMappingEditor
                        analysis={templateAnalysis}
                        fieldMappings={fieldMappings}
                        schemaInfo={schemaInfo}
                        aiStatus={aiStatus}
                        onMappingChange={handleMappingChange}
                        onAIEnhance={handleAIEnhance}
                        onSave={handleSaveTemplate}
                        onPreview={handleGoToPreview}
                        onBack={handleBack}
                        loading={loading}
                    />
                )}

                {currentStep === 'preview' && (
                    <ReportPreview
                        template={selectedTemplate}
                        fieldMappings={selectedTemplate ? undefined : fieldMappings.filter(f => f.mapping).map(f => ({
                            originalText: f.originalText,
                            ...f.mapping!
                        }))}
                        onBack={handleBack}
                        onSave={selectedTemplate ? undefined : handleSaveTemplate}
                    />
                )}
            </div>
        </div>
    );
};

export default CustomReportGenerator;
