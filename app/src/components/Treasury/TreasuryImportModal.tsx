import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { treasuryService } from '../../api';

interface ImportModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const TreasuryImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const parseExcel = async (file: File) => {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Mapping assumption:
        // Row 0: Headers
        // Row 1+: Data [Date, DocNo, Description, Amount, Account]
        return jsonData.slice(1).map((row: any) => ({
            date: row[0],
            id: row[1],
            description: row[2],
            amount: row[3],
            status: 'Processing' // Default
        })).filter((item: any) => item.date && item.amount);
    };

    const parseXml = async (file: File) => {
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const transactions: any[] = [];

        // Basic XML parsing logic - adapt to actual KBNN XML format
        const items = xmlDoc.getElementsByTagName("Transaction");
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            transactions.push({
                date: item.getElementsByTagName("Date")[0]?.textContent,
                id: item.getElementsByTagName("Id")[0]?.textContent,
                description: item.getElementsByTagName("Description")[0]?.textContent,
                amount: parseFloat(item.getElementsByTagName("Amount")[0]?.textContent || '0'),
                status: 'Processing'
            });
        }

        if (transactions.length === 0) {
            throw new Error("XML không đúng định dạng KBNN hoặc không có giao dịch.");
        }
        return transactions;
    };

    const handlePreview = async () => {
        if (!file) return;

        setLoading(true);
        setErrorMessage(null);
        try {
            let data: any[] = [];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                data = await parseExcel(file);
            } else if (file.name.endsWith('.xml')) {
                data = await parseXml(file);
            } else {
                alert('Định dạng file không hỗ trợ. Vui lòng chọn .xml, .xls, .xlsx');
                setLoading(false);
                return;
            }

            if (data.length > 0) {
                setPreviewData(data);
                setStep('preview');
            } else {
                setErrorMessage('Không đọc được dữ liệu nào từ file.');
            }
        } catch (error) {
            console.error('Lỗi khi đọc file:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đọc file.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await treasuryService.saveImportedData(previewData);
            if (res.data && res.data.success) {
                setImportResult(res.data.data || { imported: previewData.length });
                setStep('result');
                if (onSuccess) onSuccess();
            } else {
                const message = res.data?.error?.message || 'Không thể lưu dữ liệu nhập.';
                setErrorMessage(message);
            }
        } catch (error) {
            console.error('Lỗi khi lưu dữ liệu:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra khi lưu dữ liệu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Nhận số liệu từ KBNN (Import File)</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    {errorMessage && (
                        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                            {errorMessage}
                        </div>
                    )}
                    {step === 'input' && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".xml, .xlsx, .xls"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <div className="space-y-2">
                                    <span className="material-symbols-outlined text-4xl text-gray-400">upload_file</span>
                                    <div className="text-sm font-medium text-gray-900">
                                        {file ? file.name : 'Kéo thả file XML hoặc Excel vào đây'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Hoặc click để chọn file từ máy tính
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
                                <p className="font-semibold mb-1">Hướng dẫn:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Hỗ trợ định dạng: XML (chuẩn KBNN), Excel (.xlsx, .xls).</li>
                                    <li>Dữ liệu bao gồm: Lệnh chi, Giấy nộp tiền, Phiếu điều chỉnh.</li>
                                    <li>File Excel cần có header ở dòng đầu tiên.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-600">Tìm thấy {previewData.length} giao dịch:</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Số CT</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Diễn giải</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {previewData.map((tx: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm text-gray-900">{tx.date}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{tx.id}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500 truncate max-w-xs" title={tx.description}>{tx.description}</td>
                                                <td className="px-4 py-2 text-sm text-right font-medium">{new Intl.NumberFormat('vi-VN').format(tx.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                <span className="material-symbols-outlined text-4xl">check_circle</span>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">Đồng bộ thành công!</h4>
                            <p className="text-gray-600 mb-4">
                                Đã lưu {importResult?.imported} giao dịch vào hệ thống.
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                    {step === 'input' && (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handlePreview}
                                disabled={loading || !file}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center"
                            >
                                {loading ? 'Đang đọc file...' : 'Kiểm tra dữ liệu'}
                            </button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <button
                                onClick={() => setStep('input')}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium"
                            >
                                Chọn file khác
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
                            >
                                {loading ? 'Đang lưu...' : 'Đồng bộ về hệ thống'}
                            </button>
                        </>
                    )}

                    {step === 'result' && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
