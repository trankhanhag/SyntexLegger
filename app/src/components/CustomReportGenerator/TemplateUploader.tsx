/**
 * Template Uploader Component
 * Handles Excel file upload with drag & drop
 */

import React, { useState, useCallback, useRef } from 'react';

interface TemplateUploaderProps {
    onFileUpload: (file: File) => void;
    loading: boolean;
    onBack: () => void;
}

export const TemplateUploader: React.FC<TemplateUploaderProps> = ({
    onFileUpload,
    loading,
    onBack
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): boolean => {
        // Check extension
        const validExtensions = ['.xlsx', '.xls'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!validExtensions.includes(ext)) {
            setError('Chỉ chấp nhận file Excel (.xlsx, .xls)');
            return false;
        }

        // Check size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File không được vượt quá 10MB');
            return false;
        }

        setError(null);
        return true;
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
            }
        }
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
            }
        }
    }, []);

    const handleUpload = useCallback(() => {
        if (selectedFile) {
            onFileUpload(selectedFile);
        }
    }, [selectedFile, onFileUpload]);

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
            >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                <span className="text-sm">Quay lại danh sách</span>
            </button>

            {/* Title */}
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    Upload mẫu báo cáo Excel
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Hệ thống sẽ phân tích và nhận diện các trường dữ liệu
                </p>
            </div>

            {/* Drop zone */}
            <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : selectedFile
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {selectedFile ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-green-600">description</span>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{selectedFile.name}</p>
                            <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                            }}
                            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Chọn file khác
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-blue-600">upload_file</span>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-white">
                                Kéo thả file Excel vào đây
                            </p>
                            <p className="text-sm text-slate-500">
                                hoặc click để chọn file
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                .xlsx, .xls
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Tối đa 10MB
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Error display */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {error}
                </div>
            )}

            {/* Upload button */}
            {selectedFile && (
                <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                    {loading ? (
                        <>
                            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                            Đang phân tích...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[20px]">analytics</span>
                            Phân tích Template
                        </>
                    )}
                </button>
            )}

            {/* Tips */}
            <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                    Mẹo để template được nhận diện tốt
                </h4>
                <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5 ml-6 list-disc">
                    <li>Đặt tiêu đề cột ở dòng đầu tiên hoặc dòng thứ 2</li>
                    <li>Sử dụng tên cột rõ ràng: "Số chứng từ", "Ngày hạch toán", "Số tiền"...</li>
                    <li>Tránh merge cells ở các dòng tiêu đề</li>
                    <li>Có thể dùng mẫu báo cáo có sẵn của TT24/2024</li>
                </ul>
            </div>
        </div>
    );
};
