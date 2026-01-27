import React, { useEffect, useMemo, useState } from 'react';
import { useVoucherForm } from './hooks/useVoucherForm';
import { GeneralVoucherDetailRow } from '../GeneralVoucherDetailRow'; // Main Detail Row Component
import { voucherService, masterDataService, dimensionService, hcsnService } from '../../api';

interface GeneralVoucherFormProps {
    id?: string;
    onClose?: () => void;
    onSuccess?: () => void;
}

export const GeneralVoucherForm: React.FC<GeneralVoucherFormProps> = ({
    id,
    onClose,
    onSuccess
}) => {
    const {
        voucher,
        setVoucher,
        addLine,
        removeLine,
        updateLine,
        saveVoucher,
        saving,
        resetForm,
        getEmptyLine
    } = useVoucherForm();

    const [loadingData, setLoadingData] = useState(false);
    const [masterData, setMasterData] = useState({
        accounts: [],
        partners: [],
        products: [],
        dimensions: {} as Record<number, any[]>
    });
    const [fundSources, setFundSources] = useState<any[]>([]);
    const [budgetEstimates, setBudgetEstimates] = useState<any[]>([]);

    const formState = voucher;
    const loading = saving || loadingData;

    const normalizeDate = (value?: string) => (value ? value.split('T')[0] : '');

    const mapItemToLine = (item: any) => ({
        id: item.id,
        description: item.description || '',
        debitAcc: item.debit_acc || item.debitAcc || '',
        creditAcc: item.credit_acc || item.creditAcc || '',
        amount: Number(item.amount || 0),
        partnerCode: item.partner_code || item.partnerCode || '',
        projectCode: item.project_code || item.projectCode || '',
        contractCode: item.contract_code || item.contractCode || '',
        dim1: item.dim1 || '',
        dim2: item.dim2 || '',
        dim3: item.dim3 || '',
        dim4: item.dim4 || '',
        dim5: item.dim5 || '',
        itemCode: item.item_code || item.itemCode || '',
        subItemCode: item.sub_item_code || item.subItemCode || '',
        quantity: item.quantity || 0,
        unitPrice: item.cost_price || item.unitPrice || 0,
        currency: item.currency || 'VND',
        fxRate: item.fx_rate || item.fxRate || 1,
        fxAmount: item.fx_amount || item.fxAmount || 0,
        fund_source_id: item.fund_source_id,
        budget_estimate_id: item.budget_estimate_id,
        input_quantity: item.input_quantity,
        input_unit: item.input_unit,
        cost_price: item.cost_price
    });

    const handleChange = (field: string, value: any) => {
        setVoucher({ ...voucher, [field]: value });
    };

    const handleLineChange = (idx: number, field: string, value: any) => {
        let targetField = field;
        if (field === 'product') targetField = 'dim1';
        if (field === 'unit') targetField = 'input_unit';
        updateLine(idx, targetField, value);
    };

    const validationIssues = useMemo(() => {
        const issues: Record<number, any> = {};
        (formState.lines || []).forEach((line: any, idx: number) => {
            const issue: any = {};
            if (!line.debitAcc) issue.missingDebit = true;
            if (!line.creditAcc) issue.missingCredit = true;
            if (!line.amount) issue.missingAmount = true;
            if (Object.keys(issue).length > 0) {
                issues[idx] = issue;
            }
        });
        return issues;
    }, [formState.lines]);

    useEffect(() => {
        let isActive = true;

        const loadVoucher = async () => {
            if (!id) {
                resetForm();
                return;
            }

            setLoadingData(true);
            try {
                const response = await voucherService.getById(id);
                const data = response?.data || {};
                const lines = Array.isArray(data.items) ? data.items.map(mapItemToLine) : [];
                const normalized = {
                    id: data.id,
                    doc_no: data.doc_no || '',
                    doc_date: normalizeDate(data.doc_date) || normalizeDate(new Date().toISOString()),
                    post_date: normalizeDate(data.post_date || data.doc_date) || normalizeDate(new Date().toISOString()),
                    description: data.description || '',
                    type: data.type || 'GENERAL',
                    total_amount: data.total_amount || 0,
                    org_doc_no: data.org_doc_no || '',
                    org_doc_date: normalizeDate(data.org_doc_date),
                    status: data.status,
                    lines: lines.length > 0 ? lines : [getEmptyLine()]
                };

                if (isActive) {
                    resetForm(normalized as any);
                }
            } catch (err) {
                console.error('Failed to load voucher:', err);
            } finally {
                if (isActive) setLoadingData(false);
            }
        };

        loadVoucher();
        return () => {
            isActive = false;
        };
    }, [id, resetForm, getEmptyLine]);

    useEffect(() => {
        let isActive = true;

        const getArray = (result: PromiseSettledResult<any>) => {
            if (result.status !== 'fulfilled') return [];
            const data = result.value?.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            return [];
        };

        const loadMasterData = async () => {
            const results = await Promise.allSettled([
                masterDataService.getAccounts(),
                masterDataService.getPartners(),
                masterDataService.getProducts(),
                dimensionService.getDimensions(1),
                dimensionService.getDimensions(2),
                dimensionService.getDimensions(3),
                dimensionService.getDimensions(4),
                dimensionService.getDimensions(5),
                masterDataService.getFundSources(),
                hcsnService.getBudgetEstimates()
            ]);

            if (!isActive) return;

            const accounts = getArray(results[0]);
            const partners = getArray(results[1]);
            const productsRaw = getArray(results[2]);
            const dimensions = {
                1: getArray(results[3]),
                2: getArray(results[4]),
                3: getArray(results[5]),
                4: getArray(results[6]),
                5: getArray(results[7])
            };
            const fundSourcesRaw = getArray(results[8]);
            const budgetEstimatesRaw = getArray(results[9]);

            const products = productsRaw.map((p: any) => ({
                ...p,
                code: p.code || p.product_code || p.id,
                name: p.name || p.product_name || p.product_code,
                unit: p.unit,
                conversion_units: p.conversion_units
            }));

            const fundSourcesNormalized = fundSourcesRaw.map((f: any) => ({
                ...f,
                fund_source_id: f.fund_source_id || f.id,
                fund_source_code: f.fund_source_code || f.code || f.fund_source_id,
                name: f.name
            }));

            const budgetEstimates = budgetEstimatesRaw.map((be: any) => ({
                ...be,
                category_code: be.category_code || be.item_code || be.item_name || ''
            }));

            setMasterData({
                accounts,
                partners,
                products,
                dimensions
            });
            setFundSources(fundSourcesNormalized);
            setBudgetEstimates(budgetEstimates);
        };

        loadMasterData();
        return () => {
            isActive = false;
        };
    }, []);

    // Auto-close on successful save if needed, handled by saveVoucher returning true/false ideally
    // But saveVoucher is void/async in hook usually. 
    // Let's assume onSave success we call onSuccess.

    const handleSave = async () => {
        const success = await saveVoucher();
        if (success) {
            onSuccess?.();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            {id ? 'Chỉnh sửa chứng từ' : 'Thêm chứng từ mới'}
                        </h2>
                        <div className="text-xs text-slate-500 font-mono">{formState.doc_no || '---'}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm transition-all"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined">save</span>
                        )}
                        <span>Lưu chứng từ</span>
                    </button>
                </div>
            </div>

            {/* Header Form */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-800 shadow-sm mb-1">
                <div className="lg:col-span-1 space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Số chứng từ</label>
                        <input
                            type="text"
                            value={formState.doc_no}
                            onChange={e => handleChange('doc_no', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-mono font-bold"
                            placeholder="Mới"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ngày CT</label>
                            <input
                                type="date"
                                value={formState.doc_date ? formState.doc_date.split('T')[0] : ''}
                                onChange={e => handleChange('doc_date', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ngày HT</label>
                            <input
                                type="date"
                                value={formState.post_date ? formState.post_date.split('T')[0] : ''}
                                onChange={e => handleChange('post_date', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Diễn giải chung</label>
                        <input
                            type="text"
                            value={formState.description}
                            onChange={e => handleChange('description', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                            placeholder="Nhập diễn giải chung..."
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Loại chứng từ</label>
                            <select
                                value={formState.type}
                                onChange={e => handleChange('type', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                            >
                                <option value="GENERAL">Tổng hợp</option>
                                <option value="PAYMENT">Phiếu Chi</option>
                                <option value="RECEIPT">Phiếu Thu</option>
                                <option value="BANK_DEBIT">Báo Nợ</option>
                                <option value="BANK_CREDIT">Báo Có</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Chứng từ gốc</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formState.org_doc_no || ''}
                                    onChange={e => handleChange('org_doc_no', e.target.value)}
                                    className="w-2/3 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                                    placeholder="Số CT gốc"
                                />
                                <input
                                    type="date"
                                    value={formState.org_doc_date ? formState.org_doc_date.split('T')[0] : ''}
                                    onChange={e => handleChange('org_doc_date', e.target.value)}
                                    className="w-1/3 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tổng tiền</label>
                            <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-mono font-bold text-right text-purple-600 dark:text-purple-400">
                                {new Intl.NumberFormat('vi-VN').format(formState.total_amount || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Table */}
            <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 shadow-sm m-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700 whitespace-nowrap sticky top-0 z-10">
                            <tr>
                                <th className="px-2 py-2 w-8 text-center">#</th>
                                <th className="px-2 py-2 min-w-[120px]">Vật tư/HH</th>
                                <th className="px-2 py-2 w-20">ĐVT</th>
                                <th className="px-2 py-2 w-24 text-right">Số lượng</th>
                                <th className="px-2 py-2 min-w-[200px]">Diễn giải chi tiết</th>
                                <th className="px-2 py-2 min-w-[100px]">Nguồn</th>
                                <th className="px-2 py-2 min-w-[100px]">Mục chi</th>
                                <th className="px-2 py-2 w-24 text-center">TK Nợ</th>
                                <th className="px-2 py-2 w-24 text-center">TK Có</th>
                                <th className="px-2 py-2 w-32 text-right">Số tiền</th>
                                <th className="px-2 py-2 min-w-[150px]">Đối tượng</th>
                                <th className="px-2 py-2 w-10 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {(formState.lines || []).map((line, idx) => (
                                <GeneralVoucherDetailRow
                                    key={line.id || idx}
                                    idx={idx}
                                    line={line}
                                    onChange={handleLineChange}
                                    onRemove={removeLine}
                                    // Master Data Props
                                    products={masterData.products}
                                    fundSources={fundSources}
                                    budgetEstimates={budgetEstimates}
                                    accounts={masterData.accounts}
                                    partners={masterData.partners}
                                    projects={[]}
                                    contracts={[]}
                                    debtNotes={[]}
                                    dimOptions={masterData.dimensions}
                                    balancesCache={{}}
                                    issue={validationIssues[idx] || {}}
                                    effectiveShowAdvanced={true}
                                    visibleDimTypes={[1, 2, 3, 4, 5]} // Should come from config
                                    isLocked={false}
                                />
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-700/30 font-bold sticky bottom-0">
                            <tr>
                                <td colSpan={12} className="px-2 py-2">
                                    <button
                                        onClick={addLine}
                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Thêm dòng
                                    </button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};
