import { useState } from 'react';
import { formatDateVNLong } from '../utils/dateUtils';
import { toVietnameseWords } from '../utils/numberToWords';
import { PrintPreviewShell } from './PrintPreviewShell';

export type PaperSize = 'A4' | 'A4-landscape' | 'A5' | 'A5-landscape';
export type VoucherView = 'RECEIPT' | 'ISSUE' | 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'TRANSFER';

export interface PrintTemplateProps {
    record: any;
    view: VoucherView;
    onClose: () => void;
    companyInfo?: { name: string; address: string; taxCode?: string; maDVQHNS?: string };
    defaultPaperSize?: PaperSize;
}

export const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

// Get appropriate paper size class
export const getPaperSizeClass = (size: PaperSize): string => {
    switch (size) {
        case 'A4-landscape': return 'print-a4-landscape';
        case 'A5': return 'print-a5';
        case 'A5-landscape': return 'print-a5-landscape';
        default: return 'print-a4';
    }
};

// Get paper dimensions for preview
export const getPaperDimensions = (size: PaperSize): { width: string; minHeight: string } => {
    switch (size) {
        case 'A4-landscape': return { width: '297mm', minHeight: '210mm' };
        case 'A5': return { width: '148mm', minHeight: '210mm' };
        case 'A5-landscape': return { width: '210mm', minHeight: '148mm' };
        default: return { width: '210mm', minHeight: '297mm' };
    }
};

// === HEADER COMPONENT ===
const TemplateHeader = ({ companyInfo, formNumber, circular }: {
    companyInfo?: { name: string; address: string; taxCode?: string; maDVQHNS?: string };
    formNumber: string;
    circular: string;
}) => (
    <div className="flex justify-between items-start mb-4 font-serif text-black">
        <div className="max-w-[55%]">
            <p className="font-bold text-[11pt] uppercase leading-tight">{companyInfo?.name || 'TÊN ĐƠN VỊ'}</p>
            <p className="text-[10pt] mt-1">{companyInfo?.address || 'Địa chỉ đơn vị'}</p>
            {companyInfo?.maDVQHNS && (
                <p className="text-[10pt] mt-0.5">Mã ĐVQHNS: <span className="font-bold">{companyInfo.maDVQHNS}</span></p>
            )}
        </div>
        <div className="text-right">
            <p className="font-bold text-[10pt]">{formNumber}</p>
            <p className="text-[9pt] italic leading-tight mt-1 max-w-[180px]">{circular}</p>
        </div>
    </div>
);

// === SIGNATURE SECTION COMPONENT ===
const SignatureSection = ({ signatures, compact = false }: { signatures: string[]; compact?: boolean }) => (
    <div className={`print-signatures grid text-center text-[10pt] font-serif mt-6 ${
        signatures.length <= 3 ? 'grid-cols-3' : signatures.length === 4 ? 'grid-cols-4' : 'grid-cols-5'
    } ${compact ? 'gap-2' : 'gap-4'}`}>
        {signatures.map((role, idx) => (
            <div key={idx} className="page-break-avoid">
                <p className="font-bold uppercase text-[9pt]">{role}</p>
                <p className="italic font-normal text-[8pt]">(Ký, họ tên)</p>
                <div className={compact ? 'h-14' : 'h-20'}></div>
            </div>
        ))}
    </div>
);

// === MẪU C30-BB: PHIẾU NHẬP KHO ===
const InboundTemplate = ({ record, companyInfo, paperSize }: {
    record: any;
    companyInfo?: PrintTemplateProps['companyInfo'];
    paperSize: PaperSize;
}) => {
    const dimensions = getPaperDimensions(paperSize);
    const isCompact = paperSize !== 'A4';

    return (
        <div
            className={`bg-white text-black shadow-2xl printable-area preview-page font-serif mx-auto ${getPaperSizeClass(paperSize)}`}
            style={{ width: dimensions.width, minHeight: dimensions.minHeight }}
        >
            <TemplateHeader
                companyInfo={companyInfo}
                formNumber="Mẫu số C30-BB"
                circular="(Ban hành theo TT số 24/2024/TT-BTC ngày 17/04/2024 của Bộ Tài chính)"
            />

            <div className="text-center mb-4">
                <h1 className={`font-bold uppercase mb-1 ${isCompact ? 'text-lg' : 'text-xl'}`}>PHIẾU NHẬP KHO</h1>
                <p className="italic text-[10pt]">{formatDateVNLong(record.receipt_date || record.date)}</p>
                <p className="text-[10pt] font-bold mt-0.5">Số: {record.receipt_no || record.doc_no}</p>
                <div className="flex justify-center gap-6 text-[9pt] mt-1">
                    <p>Nợ: {record.debit_account || '...........'}</p>
                    <p>Có: {record.credit_account || '...........'}</p>
                </div>
            </div>

            <div className="space-y-1 text-[10pt] mb-3">
                <p>- Họ và tên người giao: <span className="font-bold">{record.supplier || record.deliverer || '...........................................'}</span></p>
                <p>- Theo: {record.ref_doc || '................................'} số ............. ngày ..... tháng ..... năm ........ của ........................</p>
                <p>- Nhập tại kho: <span className="font-bold">{record.warehouse || '...........................................'}</span></p>
                <p>- Diễn giải: {record.description || record.notes || '...........................................'}</p>
            </div>

            <table className="w-full text-[9pt] border-collapse mb-3">
                <thead>
                    <tr>
                        <th className="border border-black p-1 w-8" rowSpan={2}>STT</th>
                        <th className="border border-black p-1" rowSpan={2}>Tên, nhãn hiệu, quy cách phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th>
                        <th className="border border-black p-1 w-14" rowSpan={2}>Mã số</th>
                        <th className="border border-black p-1 w-10" rowSpan={2}>ĐVT</th>
                        <th className="border border-black p-1" colSpan={2}>Số lượng</th>
                        <th className="border border-black p-1 w-16" rowSpan={2}>Đơn giá</th>
                        <th className="border border-black p-1 w-20" rowSpan={2}>Thành tiền</th>
                    </tr>
                    <tr>
                        <th className="border border-black p-1 w-12">Theo CT</th>
                        <th className="border border-black p-1 w-12">Thực nhập</th>
                    </tr>
                    <tr className="text-center font-normal">
                        <td className="border border-black p-0.5">A</td>
                        <td className="border border-black p-0.5">B</td>
                        <td className="border border-black p-0.5">C</td>
                        <td className="border border-black p-0.5">D</td>
                        <td className="border border-black p-0.5">1</td>
                        <td className="border border-black p-0.5">2</td>
                        <td className="border border-black p-0.5">3</td>
                        <td className="border border-black p-0.5">4</td>
                    </tr>
                </thead>
                <tbody>
                    {(record.items || []).map((item: any, i: number) => (
                        <tr key={i}>
                            <td className="border border-black p-1 text-center">{i + 1}</td>
                            <td className="border border-black p-1">{item.material_name || item.product_name || item.name}</td>
                            <td className="border border-black p-1 text-center">{item.material_code || item.code}</td>
                            <td className="border border-black p-1 text-center">{item.unit}</td>
                            <td className="border border-black p-1 text-right">{item.quantity_doc || item.quantity}</td>
                            <td className="border border-black p-1 text-right">{item.quantity}</td>
                            <td className="border border-black p-1 text-right">{formatNumber(item.unit_price || item.price)}</td>
                            <td className="border border-black p-1 text-right">{formatNumber((item.quantity || 0) * (item.unit_price || 0))}</td>
                        </tr>
                    ))}
                    {/* Empty Rows */}
                    {Array.from({ length: Math.max(0, (isCompact ? 4 : 6) - (record.items?.length || 0)) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-5">
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={7} className="border border-black p-1 font-bold text-right">Cộng:</td>
                        <td className="border border-black p-1 font-bold text-right">
                            {formatNumber(record.items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0) || record.total_amount || 0)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="text-[10pt] mb-2 space-y-1">
                <p>- Tổng số tiền (viết bằng chữ): <span className="italic font-bold">{toVietnameseWords(record.total_amount || record.items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0) || 0)}</span>.</p>
                <p>- Số chứng từ gốc kèm theo: {record.attached_docs || '.....................'}</p>
            </div>

            <SignatureSection
                signatures={['Người lập phiếu', 'Người giao hàng', 'Thủ kho', 'Kế toán trưởng', 'Thủ trưởng đơn vị']}
                compact={isCompact}
            />
        </div>
    );
};

// === MẪU C31-BB: PHIẾU XUẤT KHO ===
const OutboundTemplate = ({ record, companyInfo, paperSize }: {
    record: any;
    companyInfo?: PrintTemplateProps['companyInfo'];
    paperSize: PaperSize;
}) => {
    const dimensions = getPaperDimensions(paperSize);
    const isCompact = paperSize !== 'A4';

    return (
        <div
            className={`bg-white text-black shadow-2xl printable-area preview-page font-serif mx-auto ${getPaperSizeClass(paperSize)}`}
            style={{ width: dimensions.width, minHeight: dimensions.minHeight }}
        >
            <TemplateHeader
                companyInfo={companyInfo}
                formNumber="Mẫu số C31-BB"
                circular="(Ban hành theo TT số 24/2024/TT-BTC ngày 17/04/2024 của Bộ Tài chính)"
            />

            <div className="text-center mb-4">
                <h1 className={`font-bold uppercase mb-1 ${isCompact ? 'text-lg' : 'text-xl'}`}>PHIẾU XUẤT KHO</h1>
                <p className="italic text-[10pt]">{formatDateVNLong(record.issue_date || record.date)}</p>
                <p className="text-[10pt] font-bold mt-0.5">Số: {record.issue_no || record.doc_no}</p>
                <div className="flex justify-center gap-6 text-[9pt] mt-1">
                    <p>Nợ: {record.debit_account || '...........'}</p>
                    <p>Có: {record.credit_account || '...........'}</p>
                </div>
            </div>

            <div className="space-y-1 text-[10pt] mb-3">
                <p>- Họ và tên người nhận: <span className="font-bold">{record.receiver_name || '...........................................'}</span></p>
                <p>- Bộ phận (Địa chỉ): {record.department || record.address || '...........................................'}</p>
                <p>- Lý do xuất kho: {record.purpose || record.description || '...........................................'}</p>
                <p>- Xuất tại kho: <span className="font-bold">{record.warehouse || '...........................................'}</span></p>
            </div>

            <table className="w-full text-[9pt] border-collapse mb-3">
                <thead>
                    <tr>
                        <th className="border border-black p-1 w-8" rowSpan={2}>STT</th>
                        <th className="border border-black p-1" rowSpan={2}>Tên, nhãn hiệu, quy cách phẩm chất vật tư...</th>
                        <th className="border border-black p-1 w-14" rowSpan={2}>Mã số</th>
                        <th className="border border-black p-1 w-10" rowSpan={2}>ĐVT</th>
                        <th className="border border-black p-1" colSpan={2}>Số lượng</th>
                        <th className="border border-black p-1 w-16" rowSpan={2}>Đơn giá</th>
                        <th className="border border-black p-1 w-20" rowSpan={2}>Thành tiền</th>
                    </tr>
                    <tr>
                        <th className="border border-black p-1 w-12">Yêu cầu</th>
                        <th className="border border-black p-1 w-12">Thực xuất</th>
                    </tr>
                    <tr className="text-center font-normal">
                        <td className="border border-black p-0.5">A</td>
                        <td className="border border-black p-0.5">B</td>
                        <td className="border border-black p-0.5">C</td>
                        <td className="border border-black p-0.5">D</td>
                        <td className="border border-black p-0.5">1</td>
                        <td className="border border-black p-0.5">2</td>
                        <td className="border border-black p-0.5">3</td>
                        <td className="border border-black p-0.5">4</td>
                    </tr>
                </thead>
                <tbody>
                    {(record.items || []).map((item: any, i: number) => (
                        <tr key={i}>
                            <td className="border border-black p-1 text-center">{i + 1}</td>
                            <td className="border border-black p-1">{item.material_name || item.name}</td>
                            <td className="border border-black p-1 text-center">{item.material_code || item.code}</td>
                            <td className="border border-black p-1 text-center">{item.unit}</td>
                            <td className="border border-black p-1 text-right">{item.quantity_req || item.quantity}</td>
                            <td className="border border-black p-1 text-right">{item.quantity}</td>
                            <td className="border border-black p-1 text-right">{formatNumber(item.unit_price || item.price)}</td>
                            <td className="border border-black p-1 text-right">{formatNumber((item.quantity || 0) * (item.unit_price || 0))}</td>
                        </tr>
                    ))}
                    {/* Empty Rows */}
                    {Array.from({ length: Math.max(0, (isCompact ? 4 : 6) - (record.items?.length || 0)) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-5">
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={7} className="border border-black p-1 font-bold text-right">Cộng:</td>
                        <td className="border border-black p-1 font-bold text-right">
                            {formatNumber(record.items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0) || record.total_amount || 0)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="text-[10pt] mb-2 space-y-1">
                <p>- Tổng số tiền (viết bằng chữ): <span className="italic font-bold">{toVietnameseWords(record.total_amount || record.items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0) || 0)}</span>.</p>
                <p>- Số chứng từ gốc kèm theo: {record.attached_docs || '.....................'}</p>
            </div>

            <SignatureSection
                signatures={['Người lập phiếu', 'Người nhận hàng', 'Thủ kho', 'Kế toán trưởng', 'Thủ trưởng đơn vị']}
                compact={isCompact}
            />
        </div>
    );
};

// === MẪU C40-BB & C41-BB: PHIẾU THU / CHI ===
const CashTemplate = ({ record, companyInfo, type, paperSize }: {
    record: any;
    companyInfo?: PrintTemplateProps['companyInfo'];
    type: 'CASH_RECEIPT' | 'CASH_PAYMENT';
    paperSize: PaperSize;
}) => {
    const isReceipt = type === 'CASH_RECEIPT';
    const formNumber = isReceipt ? "Mẫu số C40-BB" : "Mẫu số C41-BB";
    const formName = isReceipt ? "PHIẾU THU" : "PHIẾU CHI";

    const personLabel = isReceipt ? "Họ và tên người nộp tiền:" : "Họ và tên người nhận tiền:";
    const personName = isReceipt ? (record.payer_name || record.payee_name) : (record.payee_name || record.receiver_name);
    const reasonLabel = isReceipt ? "Lý do nộp:" : "Lý do chi:";

    const dimensions = getPaperDimensions(paperSize);
    const isCompact = paperSize !== 'A4';

    // For A5, use 3 columns signature layout
    const signatureRoles = isCompact
        ? ['Thủ trưởng đơn vị', isReceipt ? 'Người nộp tiền' : 'Người nhận tiền', 'Thủ quỹ']
        : ['Thủ trưởng đơn vị', 'Kế toán trưởng', isReceipt ? 'Người nộp tiền' : 'Người nhận tiền', 'Người lập phiếu', 'Thủ quỹ'];

    return (
        <div
            className={`bg-white text-black shadow-2xl printable-area preview-page font-serif mx-auto ${getPaperSizeClass(paperSize)}`}
            style={{
                width: dimensions.width,
                minHeight: dimensions.minHeight
            }}
        >
            <TemplateHeader
                companyInfo={companyInfo}
                formNumber={formNumber}
                circular="(Ban hành theo TT số 24/2024/TT-BTC ngày 17/04/2024 của Bộ Tài chính)"
            />

            <div className="text-center mb-3">
                <h1 className={`font-bold uppercase mb-1 ${isCompact ? 'text-lg' : 'text-xl'}`}>{formName}</h1>
                <p className="italic text-[10pt]">{formatDateVNLong(record.voucher_date || record.date)}</p>
                <p className="text-[10pt] font-bold mt-0.5">Số: {record.voucher_no || record.doc_no || record.receipt_no}</p>
                <div className="flex justify-center gap-6 text-[9pt] mt-1">
                    <p>Nợ: {record.debit_account || record.account_code || '...........'}</p>
                    <p>Có: {record.credit_account || '...........'}</p>
                </div>
            </div>

            <div className={`space-y-1.5 mb-4 ${isCompact ? 'text-[10pt]' : 'text-[11pt]'} leading-relaxed`}>
                <p>{personLabel} <span className="font-bold">{personName || '...........................................'}</span></p>
                <p>Địa chỉ: {record.address || record.payee_address || record.department || '...........................................'}</p>
                <p>{reasonLabel} {record.description || record.reason || record.notes || '...........................................'}</p>
                <p>Số tiền: <span className="font-bold text-[12pt]">{formatNumber(record.amount || record.total_amount)} đồng</span></p>
                <p>(Viết bằng chữ): <span className="italic font-bold">{toVietnameseWords(record.amount || record.total_amount || 0)}</span>.</p>
                <p>Kèm theo: {record.attached_docs || '............'} chứng từ gốc.</p>
            </div>

            <SignatureSection signatures={signatureRoles} compact={isCompact} />

            <div className={`italic mt-3 text-center ${isCompact ? 'text-[8pt]' : 'text-[9pt]'}`}>
                (Đã nhận đủ số tiền (viết bằng chữ): ............................................................................................................................................)
            </div>
        </div>
    );
};

// === PAPER SIZE SELECTOR ===
export const PaperSizeSelector = ({ value, onChange, allowedSizes }: {
    value: PaperSize;
    onChange: (size: PaperSize) => void;
    allowedSizes?: PaperSize[];
}) => {
    const allSizes: { value: PaperSize; label: string; desc: string }[] = [
        { value: 'A4', label: 'A4', desc: '210 × 297 mm' },
        { value: 'A4-landscape', label: 'A4 Ngang', desc: '297 × 210 mm' },
        { value: 'A5', label: 'A5', desc: '148 × 210 mm' },
        { value: 'A5-landscape', label: 'A5 Ngang', desc: '210 × 148 mm' },
    ];
    const sizes = allowedSizes ? allSizes.filter(s => allowedSizes.includes(s.value)) : allSizes;

    return (
        <div className="flex items-center gap-2 no-print">
            <span className="text-xs text-slate-500 font-medium">Khổ giấy:</span>
            <div className="flex gap-1">
                {sizes.map(size => (
                    <button
                        key={size.value}
                        onClick={() => onChange(size.value)}
                        className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                            value === size.value
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                        title={size.desc}
                    >
                        {size.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export type PrintConfig = {
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    scale: number;
};

const clampMargin = (value: number) => Math.max(8, Math.min(30, value || 0));
const clampScale = (value: number) => Math.max(70, Math.min(130, value || 0));

export const normalizePrintConfig = (config: PrintConfig): PrintConfig => ({
    marginTop: clampMargin(config.marginTop),
    marginRight: clampMargin(config.marginRight),
    marginBottom: clampMargin(config.marginBottom),
    marginLeft: clampMargin(config.marginLeft),
    scale: clampScale(config.scale),
});

export const PrintConfigControls = ({
    paperSize,
    onPaperSizeChange,
    allowedSizes,
    printConfig,
    onPrintConfigChange,
    children,
}: {
    paperSize: PaperSize;
    onPaperSizeChange: (size: PaperSize) => void;
    allowedSizes?: PaperSize[];
    printConfig: PrintConfig;
    onPrintConfigChange: (config: PrintConfig) => void;
    children?: React.ReactNode;
}) => {
    const updateConfig = (partial: Partial<PrintConfig>) => {
        onPrintConfigChange(normalizePrintConfig({ ...printConfig, ...partial }));
    };

    return (
        <div className="flex flex-wrap items-center gap-4">
            <PaperSizeSelector value={paperSize} onChange={onPaperSizeChange} allowedSizes={allowedSizes} />
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold">Lề (mm):</span>
                <label className="flex items-center gap-1">
                    T<input
                        type="number"
                        value={printConfig.marginTop}
                        onChange={(e) => updateConfig({ marginTop: Number(e.target.value) })}
                        className="w-14 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                </label>
                <label className="flex items-center gap-1">
                    P<input
                        type="number"
                        value={printConfig.marginRight}
                        onChange={(e) => updateConfig({ marginRight: Number(e.target.value) })}
                        className="w-14 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                </label>
                <label className="flex items-center gap-1">
                    D<input
                        type="number"
                        value={printConfig.marginBottom}
                        onChange={(e) => updateConfig({ marginBottom: Number(e.target.value) })}
                        className="w-14 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                </label>
                <label className="flex items-center gap-1">
                    T<input
                        type="number"
                        value={printConfig.marginLeft}
                        onChange={(e) => updateConfig({ marginLeft: Number(e.target.value) })}
                        className="w-14 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                </label>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold">Scale (%):</span>
                <input
                    type="number"
                    min={70}
                    max={130}
                    value={printConfig.scale}
                    onChange={(e) => updateConfig({ scale: Number(e.target.value) })}
                    className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
            </div>
            {children}
        </div>
    );
};

// === WRAPPER COMPONENT ===
export const PrintPreviewModal = ({ record, view, onClose, companyInfo, defaultPaperSize }: PrintTemplateProps) => {
    // Default paper sizes based on voucher type
    const getDefaultSize = (): PaperSize => {
        if (defaultPaperSize) return defaultPaperSize;
        if (view === 'CASH_RECEIPT' || view === 'CASH_PAYMENT') return 'A5';
        return 'A4';
    };

    const [paperSize, setPaperSize] = useState<PaperSize>(getDefaultSize());
    const [printConfig, setPrintConfig] = useState<PrintConfig>({
        marginTop: 12,
        marginRight: 15,
        marginBottom: 12,
        marginLeft: 15,
        scale: 100
    });

    // Allowed paper sizes per voucher type
    const getAllowedSizes = (): PaperSize[] | undefined => {
        // All voucher types can use any paper size
        return undefined;
    };

    const renderTemplate = () => {
        switch (view) {
            case 'RECEIPT':
                return <InboundTemplate record={record} companyInfo={companyInfo} paperSize={paperSize} />;
            case 'ISSUE':
            case 'TRANSFER':
                return <OutboundTemplate record={record} companyInfo={companyInfo} paperSize={paperSize} />;
            case 'CASH_RECEIPT':
                return <CashTemplate record={record} companyInfo={companyInfo} type="CASH_RECEIPT" paperSize={paperSize} />;
            case 'CASH_PAYMENT':
                return <CashTemplate record={record} companyInfo={companyInfo} type="CASH_PAYMENT" paperSize={paperSize} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                        <span className="material-symbols-outlined text-6xl mb-4">print_disabled</span>
                        <p>Mẫu in chưa được hỗ trợ: <span className="font-bold">{view}</span></p>
                    </div>
                );
        }
    };

    const normalizedConfig = normalizePrintConfig(printConfig);
    const paddingValue = `${normalizedConfig.marginTop}mm ${normalizedConfig.marginRight}mm ${normalizedConfig.marginBottom}mm ${normalizedConfig.marginLeft}mm`;
    const scaleFactor = normalizedConfig.scale / 100;
    const dimensions = getPaperDimensions(paperSize);
    const safeScaleFactor = scaleFactor || 1;

    return (
        <PrintPreviewShell
            title="Xem trước bản in"
            onClose={onClose}
            onPrint={() => window.print()}
            controls={(
                <PrintConfigControls
                    paperSize={paperSize}
                    onPaperSizeChange={setPaperSize}
                    allowedSizes={getAllowedSizes()}
                    printConfig={printConfig}
                    onPrintConfigChange={setPrintConfig}
                />
            )}
            footerHint={`Khổ giấy: ${paperSize} • Lề: ${normalizedConfig.marginTop}/${normalizedConfig.marginRight}/${normalizedConfig.marginBottom}/${normalizedConfig.marginLeft} mm • Scale: ${normalizedConfig.scale}%`}
        >
            <div style={{ ['--print-padding' as any]: paddingValue }}>
                <div
                    className="print-scale-wrapper"
                    style={{
                        transform: `scale(${scaleFactor})`,
                        transformOrigin: 'top left',
                        width: `calc(${dimensions.width} / ${safeScaleFactor})`,
                        minHeight: `calc(${dimensions.minHeight} / ${safeScaleFactor})`
                    }}
                >
                    {renderTemplate()}
                </div>
            </div>
        </PrintPreviewShell>
    );
};
