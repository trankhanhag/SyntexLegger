import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { contractService, hcsnService } from '../api';
import { type RibbonAction } from './Ribbon';
import { FormModal } from './FormModal';
import { DateInput } from './DateInput';
import { toInputDateValue } from '../utils/dateUtils';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';
import { useSimplePrint } from '../hooks/usePrintHandler';

interface ContractModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (view: string) => void;
}

export const ContractModule: React.FC<ContractModuleProps> = ({ subView = 'sales', printSignal = 0, onSetHeader, onNavigate: _onNavigate }) => {
    const [view, setView] = useState(subView);
    const [showModal, setShowModal] = useState(false);
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    const getModuleInfo = () => {
        switch (view) {
            case 'sales': return { title: 'Hợp đồng Bán ra', icon: 'contract', desc: 'Quản lý các hợp đồng cung cấp dịch vụ, sản phẩm cho khách hàng' };
            case 'purchase': return { title: 'Hợp đồng Mua vào', icon: 'assignment', desc: 'Theo dõi các hợp đồng thuê mướn, mua sắm hàng hóa dịch vụ' };
            case 'appendix': return { title: 'Phụ lục hợp đồng', icon: 'edit_note', desc: 'Quản lý các thay đổi, bổ sung điều khoản hợp đồng gốc' };
            case 'tracking': return { title: 'Theo dõi tiến độ', icon: 'pending_actions', desc: 'Giám sát tiến độ thực hiện và thanh toán theo từng giai đoạn' };
            default: return { title: 'Quản lý Hợp đồng', icon: 'contract', desc: 'Hệ thống quản trị và theo dõi thực hiện hợp đồng kinh tế' };
        }
    };

    const info = getModuleInfo();

    useEffect(() => {
        if (subView) setView(subView);
    }, [subView]);

    useEffect(() => {
        if (onSetHeader) {
            const actions: RibbonAction[] = [
                {
                    label: 'Lập hợp đồng mới',
                    icon: 'add_circle',
                    onClick: () => setShowModal(true),
                    primary: true
                },
                {
                    label: 'In danh sách',
                    icon: 'print',
                    onClick: () => window.print()
                }
            ];
            onSetHeader({ title: info.title, icon: info.icon, actions, onDelete: handleDeleteSelected });
        }
    }, [view, onSetHeader, info.title, info.icon, selectedRow]);

    const handleDeleteSelected = async () => {
        if (!selectedRow) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedRow.name || 'hợp đồng đã chọn'}?`)) return;

        try {
            await contractService.deleteContract(selectedRow.id);
            alert("Đã xóa hợp đồng thành công.");
            fetchData();
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
            alert("Lỗi khi xóa hợp đồng.");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'sales' || view === 'purchase') {
                const res = await contractService.getContracts(view as 'sales' | 'purchase');
                setContracts(res.data);
            } else if (view === 'appendix') {
                const res = await contractService.getAppendices();
                setContracts(res.data);
            } else {
                setContracts([]);
            }
        } catch (err) {
            console.error("Fetch contracts failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view]);

    // Print handler
    useSimplePrint(printSignal, 'Hợp đồng', { allowBrowserPrint: true });

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

    // Column Definitions
    const salesColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Số Hợp đồng', width: 'w-36', fontClass: 'font-bold text-blue-600' },
        { field: 'name', headerName: 'Tên Hợp đồng', width: 'min-w-[250px]' },
        { field: 'partner', headerName: 'Đối tác', width: 'w-48' },
        { field: 'date', headerName: 'Ngày ký', width: 'w-32', align: 'center', type: 'date' },
        { field: 'value', headerName: 'Giá trị (VNĐ)', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
        { field: 'received', headerName: 'Đã thu', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-green-600">{formatNumber(v)}</span> },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Đã hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{v}</span>
            )
        },
    ];

    const purchaseColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Số Hợp đồng', width: 'w-36', fontClass: 'font-bold text-orange-600' },
        { field: 'name', headerName: 'Tên Hợp đồng', width: 'min-w-[250px]' },
        { field: 'partner', headerName: 'Nhà cung cấp', width: 'w-48' },
        { field: 'date', headerName: 'Ngày ký', width: 'w-32', align: 'center', type: 'date' },
        { field: 'value', headerName: 'Giá trị (VNĐ)', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold">{formatNumber(v)}</span> },
        { field: 'paid', headerName: 'Đã trả', width: 'w-32', align: 'right', renderCell: (v: number) => <span className="font-mono text-blue-600">{formatNumber(v)}</span> },
        {
            field: 'status', headerName: 'Trạng thái', width: 'w-32', align: 'center', renderCell: (v: string) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v === 'Đã hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{v}</span>
            )
        },
    ];

    const appendixColumns: ColumnDef[] = [
        { field: 'code', headerName: 'Số Phụ lục', width: 'w-40', fontClass: 'font-bold' },
        { field: 'parent_code', headerName: 'Hợp đồng gốc', width: 'w-36' },
        { field: 'name', headerName: 'Tên Phụ lục', width: 'min-w-[300px]' },
        { field: 'date', headerName: 'Ngày ký', width: 'w-32', align: 'center', type: 'date' },
        { field: 'value', headerName: 'Giá trị tăng/giảm', width: 'w-36', align: 'right', renderCell: (v: number) => <span className="font-mono font-bold text-purple-600">{formatNumber(v)}</span> },
    ];

    // Show ModuleOverview when view is 'overview' or empty
    if (view === 'overview' || view === '' || !view) {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.contract.title}
                description={MODULE_CONFIGS.contract.description}
                icon={MODULE_CONFIGS.contract.icon}
                iconColor={MODULE_CONFIGS.contract.iconColor}
                workflow={MODULE_CONFIGS.contract.workflow}
                features={MODULE_CONFIGS.contract.features}
                stats={[
                    { icon: 'handshake', label: 'Tổng hợp đồng', value: contracts.length || '-', color: 'blue' },
                    { icon: 'sell', label: 'Bán ra', value: contracts.filter((c: any) => c.type === 'SALES').length || 0, color: 'green' },
                    { icon: 'shopping_cart', label: 'Mua vào', value: contracts.filter((c: any) => c.type === 'PURCHASE').length || 0, color: 'amber' },
                    { icon: 'check_circle', label: 'Trạng thái', value: 'Sẵn sàng', color: 'green' },
                ]}
            />
        );
    }

    return (
        <div className="relative h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Action Bar */}
            <div className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    {/* View Switcher Tabs */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
                        {[
                            { id: 'sales', label: 'Bán ra' },
                            { id: 'purchase', label: 'Mua vào' },
                            { id: 'appendix', label: 'Phụ lục' },
                            { id: 'tracking', label: 'Tiến độ' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === tab.id
                                    ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchData}
                        className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                        title="Tải lại dữ liệu"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-white dark:bg-slate-900">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 backdrop-blur-sm">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <SmartTable
                    data={contracts}
                    columns={
                        view === 'sales' ? salesColumns :
                            view === 'purchase' ? purchaseColumns :
                                view === 'appendix' ? appendixColumns :
                                    salesColumns // Default
                    }
                    keyField="id"
                    onSelectionChange={setSelectedRow}
                    minRows={15}
                    emptyMessage="Không có dữ liệu hợp đồng"
                />
            </div>

            {showModal && (
                <ContractFormModal
                    onClose={() => setShowModal(false)}
                    type={view === 'purchase' ? 'purchase' : 'sales'}
                    onSave={() => {
                        fetchData();
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const Modal = ({ title, onClose, widthClass = "max-w-4xl", children }: { title: string, onClose: () => void, widthClass?: string, children: React.ReactNode }) => (
    <FormModal title={title} onClose={onClose} icon="contract_edit" sizeClass={widthClass}>
        {children}
    </FormModal>
);

const ContractFormModal = ({ onClose, type, onSave }: { onClose: () => void, type: 'sales' | 'purchase', onSave: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState<any[]>([]);
    const [fundSources, setFundSources] = useState<any[]>([]);
    const [budgetEstimates, setBudgetEstimates] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        partner: '',
        partner_code: '',
        date: toInputDateValue(),
        value: 0,
        type: type,
        status: 'Đang thực hiện',
        // HCSN fields
        contract_type: type === 'sales' ? 'SERVICE' : 'PROCUREMENT',
        fund_source_id: '',
        budget_estimate_id: '',
        approval_no: '',
        approval_date: '',
        payment_method: 'TRANSFER',
        payment_terms: '',
        warranty_period: 0,
        notes: ''
    });

    useEffect(() => {
        // Fetch partners, fund sources, and budget estimates
        import('../api').then(({ masterDataService }) => {
            masterDataService.getPartners().then(res => setPartners(res.data || [])).catch(err => console.error('Error loading partners:', err));
        });
        hcsnService.getFundSources().then(res => {
            const d = res.data;
            setFundSources(Array.isArray(d) ? d : (d?.data || []));
        }).catch(err => console.error('Error loading fund sources:', err));
        hcsnService.getBudgetEstimates().then(res => {
            const d = res.data;
            setBudgetEstimates(Array.isArray(d) ? d : (d?.data || []));
        }).catch(err => console.error('Error loading budget estimates:', err));
    }, []);

    const handleSave = async () => {
        if (!formData.code || !formData.name || !formData.partner) {
            alert("Vui lòng nhập đầy đủ thông tin bắt buộc");
            return;
        }

        setLoading(true);
        try {
            await contractService.saveContract(formData);
            onSave();
        } catch (err) {
            alert("Lỗi khi lưu hợp đồng");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title={`Lập Hợp đồng ${type === 'sales' ? 'Bán ra' : 'Mua vào'} mới (HCSN)`} onClose={onClose} widthClass="max-w-5xl">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="form-label">Số Hợp đồng <span className="text-red-500">*</span></label>
                            <input type="text" className="form-input font-bold text-blue-600"
                                placeholder="HĐ/2024/..." value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Tên Hợp đồng <span className="text-red-500">*</span></label>
                            <input type="text" className="form-input"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">{type === 'sales' ? 'Khách hàng' : 'Nhà cung cấp'} <span className="text-red-500">*</span></label>
                            <select className="form-select"
                                value={formData.partner} onChange={e => setFormData({ ...formData, partner: e.target.value })}>
                                <option value="">-- Chọn đối tác --</option>
                                {partners.map(p => (
                                    <option key={p.id} value={p.partner_name}>{p.partner_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Ngày ký</label>
                                <DateInput
                                    className="form-input"
                                    value={formData.date}
                                    onChange={(value) => setFormData({ ...formData, date: value })}
                                />
                            </div>
                            <div>
                                <label className="form-label">Giá trị (VNĐ)</label>
                                <input type="number" className="form-input font-mono font-bold text-blue-600"
                                    value={formData.value} onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {/* HCSN Fields */}
                        <div>
                            <label className="form-label">Loại hợp đồng HCSN</label>
                            <select className="form-select" value={formData.contract_type} onChange={e => setFormData({ ...formData, contract_type: e.target.value })}>
                                <option value="PROCUREMENT">Mua sắm</option>
                                <option value="SERVICE">Dịch vụ</option>
                                <option value="CONSTRUCTION">Xây dựng</option>
                                <option value="CONSULTING">Tư vấn</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Nguồn kinh phí</label>
                            <select className="form-select" value={formData.fund_source_id} onChange={e => setFormData({ ...formData, fund_source_id: e.target.value })}>
                                <option value="">-- Chọn nguồn kinh phí --</option>
                                {fundSources.map(fs => (
                                    <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Dự toán ngân sách</label>
                            <select className="form-select" value={formData.budget_estimate_id} onChange={e => setFormData({ ...formData, budget_estimate_id: e.target.value })}>
                                <option value="">-- Chọn dự toán --</option>
                                {budgetEstimates.map(be => (
                                    <option key={be.id} value={be.id}>{be.category_code} - {be.category_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Phương thức thanh toán</label>
                            <select className="form-select" value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}>
                                <option value="CASH">Tiền mặt</option>
                                <option value="TRANSFER">Chuyển khoản</option>
                                <option value="INSTALLMENT">Trả góp</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Số quyết định phê duyệt</label>
                        <input type="text" className="form-input" placeholder="QĐ số..."
                            value={formData.approval_no} onChange={e => setFormData({ ...formData, approval_no: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Ngày phê duyệt</label>
                        <DateInput
                            className="form-input"
                            value={formData.approval_date}
                            onChange={(value) => setFormData({ ...formData, approval_date: value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="form-label">Ghi chú / Điều khoản chính</label>
                    <textarea rows={3} className="form-textarea" value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <div className="form-actions">
                    <button onClick={onClose} className="px-8 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-all">Bỏ qua</button>
                    <button onClick={handleSave} disabled={loading} className="form-button-primary flex items-center gap-2">
                        <span className="material-symbols-outlined">save</span>
                        {loading ? 'Đang lưu...' : 'Lưu hợp đồng'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
