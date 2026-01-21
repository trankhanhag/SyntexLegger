import React, { useState, useEffect } from 'react';

// Format helper
const formatVal = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
};

// Parse helper
const parseVal = (str: string) => {
    if (!str) return 0;
    // Remove dots (thousand separators)
    let clean = str.replace(/\./g, '');
    // Replace comma with dot for decimal if any (though usually accounting is integer in VND)
    clean = clean.replace(/,/g, '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

interface GeneralVoucherDetailRowProps {
    line: any;
    idx: number;
    onChange: (idx: number, field: string, value: any) => void;
    onRemove: (idx: number) => void;
    products: any[];
    fundSources: any[];
    budgetEstimates: any[];
    accounts: any[];
    partners: any[];
    projects: any[];
    contracts: any[];
    debtNotes: any[];
    dimOptions: Record<number, any[]>;
    balancesCache: Record<string, number>;
    issue: any;
    effectiveShowAdvanced: boolean;
    visibleDimTypes: number[];
    isLocked: boolean;
}

export const GeneralVoucherDetailRow = React.memo(({
    line,
    idx,
    onChange,
    onRemove,
    products,
    fundSources,
    budgetEstimates,
    accounts,
    partners,
    projects,
    contracts,
    debtNotes,
    dimOptions,
    balancesCache,
    issue,
    effectiveShowAdvanced,
    visibleDimTypes,
    isLocked
}: GeneralVoucherDetailRowProps) => {

    // Local state for numeric inputs to prevent focus jumping
    const [localAmount, setLocalAmount] = useState(formatVal(line.amount || 0));
    const [localQuantity, setLocalQuantity] = useState(line.input_quantity?.toString() || '0');
    const [localCostPrice, setLocalCostPrice] = useState(formatVal(line.cost_price || 0));

    // Sync from Props to Local ONLY if drastic difference (like external update)
    useEffect(() => {
        // If prop value changes significantly from parsed local, update local
        // This is tricky. simpler: update local if prop changes and is not currently focused?
        // Or just trust the typical pattern: sync on mount or specific triggers.
        // For simplicity: We sync if the prop value is different from parsed local value.

        // Amount
        if (parseVal(localAmount) !== line.amount) {
            setLocalAmount(formatVal(line.amount || 0));
        }

        // Quantity
        if (parseFloat(localQuantity) !== line.input_quantity) {
            setLocalQuantity(line.input_quantity?.toString() || '0');
        }

        // Cost Price
        if (parseVal(localCostPrice) !== line.cost_price) {
            setLocalCostPrice(formatVal(line.cost_price || 0));
        }

    }, [line.amount, line.input_quantity, line.cost_price]);


    const missingDims = issue.missingDims || [];
    const product = products.find((p: any) => p.code === line.dim1);
    const conversionUnits = (() => {
        if (!product?.conversion_units) return [];
        try {
            return JSON.parse(product.conversion_units || '[]');
        } catch {
            return [];
        }
    })();
    const insufficientInventory = line.creditAcc
        && line.creditAcc.startsWith('15')
        && (balancesCache[line.creditAcc] || 0) < line.amount;
    const amountClass = issue.missingAmount
        ? 'bg-red-50 text-red-600'
        : (insufficientInventory ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-800 dark:text-white');

    return (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
            <td className="px-2 py-1.5 text-center text-[11px] font-mono text-slate-400">{idx + 1}</td>

            {/* PRODUCT */}
            <td className="px-2 py-1">
                <select
                    value={line.dim1 || ''}
                    onChange={(e) => onChange(idx, 'product', e.target.value)}
                    disabled={isLocked}
                    className={`w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] font-bold py-1 ${issue.missingProduct ? 'bg-red-50 text-red-600' : 'text-slate-700 dark:text-slate-300'}`}
                >
                    <option value="">--</option>
                    {products.map((p: any) => (
                        <option key={p.code} value={p.code}>{p.code} {p.name ? `- ${p.name}` : ''}</option>
                    ))}
                </select>
            </td>

            {/* UNIT */}
            <td className="px-2 py-1">
                <select
                    value={line.input_unit || ''}
                    onChange={(e) => onChange(idx, 'unit', e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] text-slate-600 dark:text-slate-400 py-1"
                    disabled={!line.dim1 || isLocked}
                >
                    <option value="">--</option>
                    {product && (
                        <>
                            <option value={product.unit}>{product.unit}</option>
                            {conversionUnits.map((c: any) => (
                                <option key={c.unit} value={c.unit}>{c.unit}</option>
                            ))}
                        </>
                    )}
                </select>
            </td>

            {/* QUANTITY */}
            <td className="px-2 py-1 relative group">
                <input
                    type="text"
                    value={localQuantity}
                    onChange={(e) => setLocalQuantity(e.target.value)}
                    onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setLocalQuantity(val.toString());
                        onChange(idx, 'input_quantity', val);
                    }}
                    onFocus={(e) => e.target.select()}
                    disabled={isLocked}
                    className={`w-full bg-transparent border-none outline-none focus:ring-0 text-right text-[13px] font-mono py-1 ${issue.missingQuantity ? 'bg-red-50 text-red-600' : 'text-slate-700 dark:text-slate-300'}`}
                    placeholder="0"
                />
                {line.quantity && line.quantity !== line.input_quantity && product?.unit && (
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[9px] rounded shadow-lg -translate-y-full z-50 pointer-events-none whitespace-nowrap">
                        Quy đổi: {line.quantity} {product.unit}
                    </div>
                )}
            </td>

            {/* DESCRIPTION */}
            <td className="px-2 py-1">
                <input
                    type="text"
                    value={line.description}
                    onChange={(e) => onChange(idx, 'description', e.target.value)}
                    placeholder="Nội dung hạch toán..."
                    disabled={isLocked}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] py-1 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
            </td>

            {/* FUND SOURCE */}
            <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-700 bg-purple-50/20 dark:bg-purple-900/5">
                <select
                    value={line.fund_source_id || ''}
                    onChange={(e) => onChange(idx, 'fund_source_id', e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[12px] font-medium text-purple-700 dark:text-purple-400 py-1"
                >
                    <option value="">-- Nguồn --</option>
                    {fundSources.map((f: any) => (
                        <option key={f.fund_source_id} value={f.fund_source_id}>{f.fund_source_code}</option>
                    ))}
                </select>
            </td>

            {/* BUDGET ESTIMATE (Mã DP) */}
            <td className="px-2 py-1 bg-purple-50/20 dark:bg-purple-900/5">
                <select
                    value={line.budget_estimate_id || ''}
                    onChange={(e) => onChange(idx, 'budget_estimate_id', e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-[12px] font-medium text-purple-700 dark:text-purple-400 py-1"
                >
                    <option value="">-- Mã DP --</option>
                    {budgetEstimates.filter((be: any) => !line.fund_source_id || be.fund_source_id === line.fund_source_id).map((be: any) => (
                        <option key={be.id} value={be.id}>{be.category_code}</option>
                    ))}
                </select>
            </td>

            {/* DEBIT ACCOUNT */}
            <td className="px-2 py-1">
                <select
                    value={line.debitAcc}
                    onChange={(e) => onChange(idx, 'debitAcc', e.target.value)}
                    disabled={isLocked}
                    className={`w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] font-bold py-1 text-center appearance-none cursor-pointer ${issue.missingDebit ? 'bg-red-50 text-red-600' : 'text-blue-600'}`}
                >
                    <option value="">-- Nợ --</option>
                    {accounts.filter(a => !a.is_parent).map((acc: any) => <option key={acc.account_code} value={acc.account_code}>{acc.account_code}</option>)}
                </select>
            </td>

            {/* CREDIT ACCOUNT */}
            <td className="px-2 py-1">
                <select
                    value={line.creditAcc}
                    onChange={(e) => onChange(idx, 'creditAcc', e.target.value)}
                    disabled={isLocked}
                    className={`w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] font-bold py-1 text-center appearance-none cursor-pointer ${issue.missingCredit ? 'bg-red-50 text-red-600' : 'text-red-600'}`}
                >
                    <option value="">-- Có --</option>
                    {accounts.filter(a => !a.is_parent).map((acc: any) => <option key={acc.account_code} value={acc.account_code}>{acc.account_code}</option>)}
                </select>
            </td>

            {/* AMOUNT */}
            <td className="px-2 py-1 relative group">
                <input
                    type="text"
                    value={localAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setLocalAmount(e.target.value)}
                    onBlur={(e) => {
                        const val = parseVal(e.target.value);
                        setLocalAmount(formatVal(val));
                        onChange(idx, 'amount', val);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    disabled={isLocked}
                    className={`w-full bg-transparent border-none outline-none focus:ring-0 text-right text-[13px] font-mono font-bold py-1 ${amountClass}`}
                />
                {insufficientInventory && (
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white text-[9px] rounded shadow-lg -translate-y-full z-50 pointer-events-none whitespace-nowrap">
                        Cảnh báo: Tồn kho không đủ ({formatVal(balancesCache[line.creditAcc] || 0)})
                    </div>
                )}
            </td>

            {/* PARTNER */}
            <td className="px-2 py-1">
                <select
                    value={line.partnerCode}
                    onChange={(e) => onChange(idx, 'partnerCode', e.target.value)}
                    disabled={isLocked}
                    className={`w-full bg-transparent border-none outline-none focus:ring-0 text-xs py-1 ${issue.missingPartner ? 'bg-red-50 text-red-600' : ''}`}
                >
                    <option value="">-- Đối tác --</option>
                    {partners.map(p => (
                        <option key={p.partner_code} value={p.partner_code}>
                            {p.partner_name ? `${p.partner_code} - ${p.partner_name}` : p.partner_code}
                        </option>
                    ))}
                </select>
            </td>

            {/* ADVANCED FIELDS */}
            {effectiveShowAdvanced && (
                <>
                    {/* PROJECT */}
                    <td className="px-2 py-1">
                        <select
                            value={line.projectCode || ''}
                            onChange={(e) => onChange(idx, 'projectCode', e.target.value)}
                            disabled={isLocked}
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs py-1"
                        >
                            <option value="">--</option>
                            {projects.map((p: any) => (
                                <option key={p.id || p.code} value={p.code}>{p.code} {p.name ? `- ${p.name}` : ''}</option>
                            ))}
                        </select>
                    </td>

                    {/* CONTRACT */}
                    <td className="px-2 py-1">
                        <select
                            value={line.contractCode || ''}
                            onChange={(e) => onChange(idx, 'contractCode', e.target.value)}
                            disabled={isLocked}
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs py-1"
                        >
                            <option value="">--</option>
                            {contracts.map((c: any) => (
                                <option key={c.id || c.code} value={c.code}>{c.code} {c.name ? `- ${c.name}` : ''}</option>
                            ))}
                        </select>
                    </td>

                    {/* DEBT NOTE */}
                    <td className="px-2 py-1">
                        <select
                            value={line.debtNote || ''}
                            onChange={(e) => onChange(idx, 'debtNote', e.target.value)}
                            disabled={isLocked}
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs py-1"
                        >
                            <option value="">--</option>
                            {debtNotes.map((n: any) => (
                                <option key={n.id || n.doc_no} value={n.doc_no}>{n.doc_no} {n.partner ? `- ${n.partner}` : ''}</option>
                            ))}
                        </select>
                    </td>

                    {/* COST PRICE */}
                    <td className="px-2 py-1">
                        <input
                            type="text"
                            value={localCostPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setLocalCostPrice(e.target.value)}
                            onBlur={(e) => {
                                const val = parseVal(e.target.value);
                                setLocalCostPrice(formatVal(val));
                                onChange(idx, 'cost_price', val);
                            }}
                            disabled={isLocked}
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-right text-xs font-mono py-1"
                        />
                    </td>

                    {/* DIMS */}
                    {visibleDimTypes.map(type => (
                        <td key={`dim-${idx}-${type}`} className="px-2 py-1">
                            <select
                                value={line[`dim${type}`] || ''}
                                onChange={(e) => onChange(idx, `dim${type}`, e.target.value)}
                                disabled={isLocked}
                                className={`w-full bg-transparent border-none outline-none focus:ring-0 text-xs py-1 ${missingDims.includes(type) ? 'bg-red-50 text-red-600' : ''}`}
                            >
                                <option value="">--</option>
                                {(dimOptions[type] || []).map((d: any) => (
                                    <option key={d.id || d.code} value={d.code}>{d.code} {d.name ? `- ${d.name}` : ''}</option>
                                ))}
                            </select>
                        </td>
                    ))}
                </>
            )}

            {/* DELETE BUTTON */}
            <td className="px-2 py-1 text-center">
                <button
                    onClick={() => onRemove(idx)}
                    disabled={isLocked}
                    className="text-slate-300 hover:text-red-500 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        </tr>
    );
}, (prev, next) => {
    // Optimization to avoid re-renders if nothing changed
    return prev.isLocked === next.isLocked &&
        JSON.stringify(prev.line) === JSON.stringify(next.line) &&
        prev.effectiveShowAdvanced === next.effectiveShowAdvanced;
});
