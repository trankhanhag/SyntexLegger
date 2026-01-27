import React, { useState, useEffect } from 'react';
import { xmlExportService } from '../../api';


interface XmlExportModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

interface DocumentType {
    code: string;
    name: string;
    description: string;
}

interface VoucherForExport {
    id: string;
    docNo: string;
    docDate: string;
    description: string;
    totalAmount: number;
    type: string;
    items?: {
        description?: string;
        amount?: number;
        budgetItemCode?: string;
        note?: string;
    }[];
}

type ExportStep = 'select' | 'preview' | 'complete';

export const XmlExportModal: React.FC<XmlExportModalProps> = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState<ExportStep>('select');
    const [loading, setLoading] = useState(false);
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [selectedType, setSelectedType] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [vouchers, setVouchers] = useState<VoucherForExport[]>([]);
    const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);
    const [xmlPreview, setXmlPreview] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const buildBangKePayload = (records: VoucherForExport[]) => {
        const items = records.flatMap((v) => {
            if (v.items && v.items.length > 0) {
                return v.items.map((item) => ({
                    description: item.description || v.description,
                    amount: item.amount ?? v.totalAmount,
                    budgetItemCode: item.budgetItemCode,
                    note: item.note
                }));
            }
            return [{
                description: v.description,
                amount: v.totalAmount
            }];
        });
        const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        return {
            items,
            summary: {
                totalAmount,
                period: `${fromDate} - ${toDate}`
            }
        };
    };

    const buildVoucherPayload = (voucher: VoucherForExport) => ({
        docNo: voucher.docNo,
        description: voucher.description,
        amount: voucher.totalAmount,
        items: voucher.items || []
    });

    const loadDocumentTypes = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await xmlExportService.getDocumentTypes();
            const types = Array.isArray(res.data) ? res.data : [];
            setDocumentTypes(types);
            if (!selectedType && types.length > 0) {
                setSelectedType(types[0].code);
            }
        } catch (error) {
            console.error('Error loading document types:', error);
            setDocumentTypes([]);
            setErrorMessage('Không thể tải danh sách mẫu XML.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch eligible vouchers when filters change
    const fetchVouchers = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await xmlExportService.getVouchers({ fromDate, toDate });
            const list = res.data?.vouchers || [];
            setVouchers(Array.isArray(list) ? list : []);
            setSelectedVouchers([]);
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            setVouchers([]);
            setSelectedVouchers([]);
            setErrorMessage('Không thể tải danh sách chứng từ.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocumentTypes();
    }, []);

    useEffect(() => {
        fetchVouchers();
    }, [fromDate, toDate]);

    const handleSelectAll = () => {
        if (selectedVouchers.length === vouchers.length) {
            setSelectedVouchers([]);
        } else {
            setSelectedVouchers(vouchers.map(v => v.id));
        }
    };

    const handleToggleVoucher = (id: string) => {
        setSelectedVouchers(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handlePreview = async () => {
        if (!selectedType) {
            setErrorMessage('Chưa có loại chứng từ để xuất XML.');
            return;
        }
        if (selectedVouchers.length === 0) {
            alert('Vui lòng chọn ít nhất một chứng từ');
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const selectedRecords = vouchers.filter(v => selectedVouchers.includes(v.id));
            const payload = selectedType === 'BangKe'
                ? buildBangKePayload(selectedRecords)
                : buildVoucherPayload(selectedRecords[0]);

            const res = await xmlExportService.preview({ documentType: selectedType, data: payload });
            const previewXml = res.data?.xml;
            if (!previewXml) {
                setErrorMessage('Không nhận được nội dung XML để xem trước.');
                return;
            }
            setXmlPreview(previewXml);
            setStep('preview');
        } catch (error) {
            console.error('Error generating preview:', error);
            setErrorMessage('Có lỗi khi tạo preview XML.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedType) {
            setErrorMessage('Chưa có loại chứng từ để xuất XML.');
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const selectedRecords = vouchers.filter(v => selectedVouchers.includes(v.id));
            if (selectedRecords.length === 0) {
                setErrorMessage('Vui lòng chọn ít nhất một chứng từ.');
                setLoading(false);
                return;
            }
            const documents = selectedType === 'BangKe'
                ? [{ type: selectedType, data: buildBangKePayload(selectedRecords) }]
                : selectedRecords.map(record => ({ type: selectedType, data: buildVoucherPayload(record) }));

            const res = await xmlExportService.download({ documents });
            const contentType = res.headers['content-type'] || 'application/zip';
            const disposition = res.headers['content-disposition'] || '';
            const fileMatch = /filename="([^"]+)"/i.exec(disposition);
            const fileName = fileMatch?.[1] || `KBNN_Export_${new Date().toISOString().slice(0, 10)}.zip`;

            const blob = new Blob([res.data], { type: contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            setStep('complete');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error downloading:', error);
            setErrorMessage('Có lỗi khi tải file XML.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h2 className="text-lg font-semibold">Xuất XML Kho bạc (DVC)</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Steps indicator */}
                <div className="px-6 py-3 bg-gray-50 border-b flex gap-4">
                    {['select', 'preview', 'complete'].map((s, idx) => (
                        <div key={s} className={`flex items-center gap-2 ${step === s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${step === s ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                {idx + 1}
                            </span>
                            <span>{s === 'select' ? 'Chọn chứng từ' : s === 'preview' ? 'Xem trước' : 'Hoàn tất'}</span>
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {errorMessage && (
                        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                            {errorMessage}
                        </div>
                    )}
                    {step === 'select' && (
                        <div className="space-y-4">
                            {/* Document Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Loại chứng từ</label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                >
                                    {documentTypes.map(dt => (
                                        <option key={dt.code} value={dt.code}>{dt.code} - {dt.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                            </div>

                            {/* Vouchers Table */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Chứng từ đủ điều kiện</label>
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        {selectedVouchers.length === vouchers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="w-10 px-3 py-2"></th>
                                                <th className="px-3 py-2 text-left">Số CT</th>
                                                <th className="px-3 py-2 text-left">Ngày</th>
                                                <th className="px-3 py-2 text-left">Mô tả</th>
                                                <th className="px-3 py-2 text-right">Số tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan={5} className="text-center py-4 text-gray-500">Đang tải...</td></tr>
                                            ) : vouchers.length === 0 ? (
                                                <tr><td colSpan={5} className="text-center py-4 text-gray-500">Không có chứng từ nào</td></tr>
                                            ) : vouchers.map(v => (
                                                <tr key={v.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-3 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedVouchers.includes(v.id)}
                                                            onChange={() => handleToggleVoucher(v.id)}
                                                            className="rounded"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 font-medium">{v.docNo}</td>
                                                    <td className="px-3 py-2">{v.docDate}</td>
                                                    <td className="px-3 py-2">{v.description}</td>
                                                    <td className="px-3 py-2 text-right">{formatCurrency(v.totalAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 mb-2">
                                Xem trước nội dung XML sẽ được xuất:
                            </div>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-80">
                                {xmlPreview}
                            </pre>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Xuất XML thành công!</h3>
                            <p className="text-gray-600 mb-6">File đã được tải về máy. Bạn có thể upload lên Cổng DVC Kho bạc.</p>
                            <a
                                href="https://dichvucong.kbnn.gov.vn"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                            >
                                Truy cập Cổng DVC Kho bạc
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
                    {step !== 'complete' && (
                        <button
                            onClick={step === 'select' ? onClose : () => setStep('select')}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            {step === 'select' ? 'Hủy' : 'Quay lại'}
                        </button>
                    )}
                    {step === 'select' && (
                        <button
                            onClick={handlePreview}
                            disabled={loading || selectedVouchers.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Xem trước XML
                        </button>
                    )}
                    {step === 'preview' && (
                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Tải file XML
                        </button>
                    )}
                    {step === 'complete' && (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-auto"
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
