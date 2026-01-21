// React is implicitly available in modern JSX transform
import { formatDateVNLong } from '../utils/dateUtils';
import { toVietnameseWords } from '../utils/numberToWords';

export interface PrintTemplateProps {
    record: any;
    view: 'RECEIPT' | 'ISSUE' | 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'TRANSFER';
    onClose: () => void;
    companyInfo?: { name: string, address: string };
}

export const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

const TemplateHeader = ({ companyInfo, formNumber, circular }: any) => (
    <div className="flex justify-between items-start mb-6 font-serif">
        <div className="max-w-[50%]">
            <h2 className="font-bold text-sm uppercase">{companyInfo?.name || 'Đơn vị...'}</h2>
            <p className="text-xs">{companyInfo?.address || 'Địa chỉ...'}</p>
        </div>
        <div className="text-center">
            <h2 className="font-bold text-[11px] uppercase">{formNumber}</h2>
            <p className="text-[10px] italic leading-tight mt-1">{circular}</p>
        </div>
    </div>
);

const SignatureSection = ({ signatures }: { signatures: string[] }) => (
    <div className="grid grid-cols-5 text-center text-[11px] mt-10 font-serif">
        {signatures.map((role, idx) => (
            <div key={idx}>
                <p className="font-bold uppercase">{role}</p>
                <p className="italic font-normal">(Ký, họ tên)</p>
                <div className="h-20"></div>
            </div>
        ))}
    </div>
);

// === MẪU C30-BB: PHIẾU NHẬP KHO ===
const InboundTemplate = ({ record, companyInfo }: any) => {
    return (
        <div className="bg-white text-slate-900 w-[21cm] min-h-[29.7cm] p-12 shadow-2xl relative printable-area font-serif mx-auto">
            <TemplateHeader
                companyInfo={companyInfo}
                formNumber="Mẫu số C30-BB"
                formName="PHIẾU NHẬP KHO"
                circular="(Ban hành theo Thông tư số 24/2024/TT-BTC ngày 17/04/2024 của Bộ Tài chính)"
            />

            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold uppercase mb-2">PHIẾU NHẬP KHO</h1>
                <p className="italic text-sm">{formatDateVNLong(record.receipt_date || record.date)}</p>
                <p className="text-sm font-bold mt-1">Số: {record.receipt_no || record.doc_no}</p>
            </div>

            <div className="space-y-2 text-sm mb-6">
                <p>- Họ và tên người giao: <span className="font-bold">{record.supplier || record.deliverer}</span></p>
                <p>- Theo: {record.ref_doc || '................................'} số ngày tháng năm của ........................</p>
                <p>- Nhập tại kho: <span className="font-bold">{record.warehouse}</span></p>
                <p>- Diễn giải: {record.description || record.notes}</p>
            </div>

            <table className="w-full text-xs border-collapse border border-black mb-6">
                <thead>
                    <tr>
                        <th className="border border-black p-1 w-10" rowSpan={2}>STT</th>
                        <th className="border border-black p-1" rowSpan={2}>Tên, nhãn hiệu, quy cách phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th>
                        <th className="border border-black p-1 w-12" rowSpan={2}>Mã số</th>
                        <th className="border border-black p-1 w-12" rowSpan={2}>ĐVT</th>
                        <th className="border border-black p-1" colSpan={2}>Số lượng</th>
                        <th className="border border-black p-1 w-20" rowSpan={2}>Đơn giá</th>
                        <th className="border border-black p-1 w-24" rowSpan={2}>Thành tiền</th>
                    </tr>
                    <tr>
                        <th className="border border-black p-1 w-16">Theo chứng từ</th>
                        <th className="border border-black p-1 w-16">Thực nhập</th>
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
                    {/* Empty Rows Filler */}
                    {Array.from({ length: Math.max(0, 8 - (record.items?.length || 0)) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-6">
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={7} className="border border-black p-1 font-bold text-right uppercase">Cộng:</td>
                        <td className="border border-black p-1 font-bold text-right">
                            {formatNumber(record.items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0) || 0)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="text-sm mb-4">
                <p>- Tổng số tiền (viết bằng chữ): <span className="italic font-bold">{toVietnameseWords(record.total_amount || 0)}</span>.</p>
                <p>- Số chứng từ gốc kèm theo: ............................................................................................</p>
            </div>

            <SignatureSection signatures={['Người lập phiếu', 'Người giao hàng', 'Thủ kho', 'Kế toán trưởng', 'Thủ trưởng đơn vị']} />
        </div>
    );
};

// === MẪU C31-BB: PHIẾU XUẤT KHO ===
const OutboundTemplate = ({ record, companyInfo }: any) => {
    return (
        <div className="bg-white text-slate-900 w-[21cm] min-h-[29.7cm] p-12 shadow-2xl relative printable-area font-serif mx-auto">
            <TemplateHeader
                companyInfo={companyInfo}
                formNumber="Mẫu số C31-BB"
                formName="PHIẾU XUẤT KHO"
                circular="(Ban hành theo Thông tư số 24/2024/TT-BTC ngày 17/04/2024 của Bộ Tài chính)"
            />

            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold uppercase mb-2">PHIẾU XUẤT KHO</h1>
                <p className="italic text-sm">{formatDateVNLong(record.issue_date || record.date)}</p>
                <p className="text-sm font-bold mt-1">Số: {record.issue_no || record.doc_no}</p>
            </div>

            <div className="space-y-2 text-sm mb-6">
                <p>- Họ và tên người nhận: <span className="font-bold">{record.receiver_name}</span></p>
                <p>- Bộ phận (Địa chỉ): {record.department}</p>
                <p>- Lý do xuất kho: {record.purpose || record.description}</p>
                <p>- Xuất tại kho: <span className="font-bold">{record.warehouse}</span></p>
            </div>

            <table className="w-full text-xs border-collapse border border-black mb-6">
                <thead>
                    <tr>
                        <th className="border border-black p-1 w-10" rowSpan={2}>STT</th>
                        <th className="border border-black p-1" rowSpan={2}>Tên, nhãn hiệu, quy cách vật tư...</th>
                        <th className="border border-black p-1 w-12" rowSpan={2}>Mã số</th>
                        <th className="border border-black p-1 w-12" rowSpan={2}>ĐVT</th>
                        <th className="border border-black p-1" colSpan={2}>Số lượng</th>
                        <th className="border border-black p-1 w-20" rowSpan={2}>Đơn giá</th>
                        <th className="border border-black p-1 w-24" rowSpan={2}>Thành tiền</th>
                    </tr>
                    <tr>
                        <th className="border border-black p-1 w-16">Yêu cầu</th>
                        <th className="border border-black p-1 w-16">Thực xuất</th>
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
                    {/* Empty Filler */}
                    {Array.from({ length: Math.max(0, 8 - (record.items?.length || 0)) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-6">
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={7} className="border border-black p-1 font-bold text-right uppercase">Cộng:</td>
                        <td className="border border-black p-1 font-bold text-right">
                            {formatNumber(record.items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0) || 0)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="text-sm mb-4">
                <p>- Tổng số tiền (viết bằng chữ): <span className="italic font-bold">{toVietnameseWords(record.total_amount || 0)}</span>.</p>
                <p>- Số chứng từ gốc kèm theo: ............................................................................................</p>
            </div>

            <SignatureSection signatures={['Người lập phiếu', 'Người nhận hàng', 'Thủ kho', 'Kế toán trưởng', 'Thủ trưởng đơn vị']} />
        </div>
    );
};

// === MẪU C40-BB & C41-BB: PHIẾU THU / CHI ===
const CashTemplate = ({ record, companyInfo, type }: any) => {
    const isReceipt = type === 'CASH_RECEIPT'; // Phiếu Thu
    const formNumber = isReceipt ? "Mẫu số C40-BB" : "Mẫu số C41-BB";
    const formName = isReceipt ? "PHIẾU THU" : "PHIẾU CHI";

    // Determine fields based on type
    const personLabel = isReceipt ? "Họ và tên người nộp tiền:" : "Họ và tên người nhận tiền:";
    const personName = isReceipt ? (record.payer_name || record.payee_name) : (record.payee_name || record.receiver_name);
    const addressLabel = isReceipt ? "Địa chỉ:" : "Địa chỉ (Bộ phận):";
    const reasonLabel = isReceipt ? "Lý do nộp:" : "Lý do chi:";

    return (
        <div className="bg-white text-slate-900 w-[21cm] min-h-[14.8cm] p-12 shadow-2xl relative printable-area font-serif mx-auto mb-10">
            <TemplateHeader
                companyInfo={companyInfo}
                formNumber={formNumber}
                formName={formName}
                circular="(Ban hành theo Thông tư số 24/2024/TT-BTC ngày 17/04/2024 của Bộ Tài chính)"
            />

            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold uppercase mb-2">{formName}</h1>
                <p className="italic text-sm">{formatDateVNLong(record.voucher_date || record.date)}</p>
                <p className="text-sm font-bold mt-1">Số: {record.voucher_no || record.doc_no || record.receipt_no}</p>
                <div className="flex justify-center gap-10 text-xs mt-2">
                    <p>Nợ: {record.debit_account || record.account_code || '...........'}</p>
                    <p>Có: {record.credit_account || '...........'}</p>
                </div>
            </div>

            <div className="space-y-3 text-sm mb-6 leading-relaxed">
                <p>{personLabel} <span className="font-bold">{personName}</span></p>
                <p>{addressLabel} {record.address || record.payee_address || record.department || '................................................'}</p>
                <p>{reasonLabel} {record.description || record.reason || record.notes}</p>
                <p>Số tiền: <span className="font-bold">{formatNumber(record.amount || record.total_amount)} đ</span></p>
                <p>(Viết bằng chữ): <span className="italic font-bold">{toVietnameseWords(record.amount || record.total_amount || 0)}</span>.</p>
                <p>Kèm theo: {record.attached_docs || '................................................'} chứng từ gốc.</p>
            </div>

            <div className="grid grid-cols-5 text-center text-[11px] mt-8 font-serif">
                <div>
                    <p className="font-bold uppercase">Thủ trưởng đơn vị</p>
                    <p className="italic font-normal">(Ký, họ tên, đóng dấu)</p>
                    <div className="h-20"></div>
                </div>
                <div>
                    <p className="font-bold uppercase">Kế toán trưởng</p>
                    <p className="italic font-normal">(Ký, họ tên)</p>
                    <div className="h-20"></div>
                </div>
                <div>
                    <p className="font-bold uppercase">{isReceipt ? 'Người nộp tiền' : 'Người nhận tiền'}</p>
                    <p className="italic font-normal">(Ký, họ tên)</p>
                    <div className="h-20"></div>
                </div>
                <div>
                    <p className="font-bold uppercase">Người lập phiếu</p>
                    <p className="italic font-normal">(Ký, họ tên)</p>
                    <div className="h-20"></div>
                </div>
                <div>
                    <p className="font-bold uppercase">Thủ quỹ</p>
                    <p className="italic font-normal">(Ký, họ tên)</p>
                    <div className="h-20"></div>
                </div>
            </div>

            <div className="text-[10px] italic mt-4 text-center">
                (Đã nhận đủ số tiền (viết bằng chữ): ..............................................................................................................................................)
            </div>
        </div>
    );
};

// === WRAPPER COMPONENT ===
export const PrintPreviewModal = ({ record, view, onClose, companyInfo }: PrintTemplateProps) => {

    const renderTemplate = () => {
        switch (view) {
            case 'RECEIPT': return <InboundTemplate record={record} companyInfo={companyInfo} />;
            case 'ISSUE': return <OutboundTemplate record={record} companyInfo={companyInfo} />;
            case 'TRANSFER': return <OutboundTemplate record={record} companyInfo={companyInfo} />;
            case 'CASH_RECEIPT': return <CashTemplate record={record} companyInfo={companyInfo} type="CASH_RECEIPT" />;
            case 'CASH_PAYMENT': return <CashTemplate record={record} companyInfo={companyInfo} type="CASH_PAYMENT" />;
            default: return (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                    <span className="material-symbols-outlined text-6xl mb-4">print_disabled</span>
                    <p>Mẫu in chưa được hỗ trợ: <span className="font-bold">{view}</span></p>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10 no-print">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full rounded-2xl shadow-xl overflow-hidden flex flex-col">
                {/* Header Control */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 shrink-0">
                    <h3 className="font-bold flex items-center gap-2 uppercase text-slate-800 dark:text-white">
                        <span className="material-symbols-outlined text-blue-600">print</span>
                        Xem trước bản in
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto p-8 bg-slate-200 dark:bg-slate-950 flex justify-center custom-scrollbar">
                    <div className="scale-90 origin-top">
                        {renderTemplate()}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-white dark:bg-slate-900 shrink-0">
                    <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-bold">Đóng</button>
                    <button onClick={() => window.print()} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined text-[18px]">print</span> In phiếu ngay
                    </button>
                </div>
            </div>
        </div>
    );
};
