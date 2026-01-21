import React, { useMemo } from 'react';

interface TaxDeclarationFormProps {
    type: 'vat' | 'pit' | 'cit' | 'cit-03-1a';
    data: any;
    period: string;
}

export const TaxDeclarationForm: React.FC<TaxDeclarationFormProps> = ({ type, data, period }) => {
    const formatNumber = (num: number | undefined) => new Intl.NumberFormat('vi-VN').format(num || 0);

    // Calculate derived values for VAT (Circular 80)
    const vatCalculations = useMemo(() => {
        if (type !== 'vat') return {};

        const d = data || {};

        // [29] - [32] Input logic: usually passed from data, but we defaults to 0 if missing
        const v22 = d.v22 || 0; // VAT carried forward from previous period
        const v23 = d.v23 || 0; // Value of bought goods
        const v24 = d.v24 || 0; // VAT of bought goods
        const v25 = d.v25 || 0; // Deductible VAT input

        // Section II: Output
        const v26 = d.v26 || 0; // Non-taxable
        const v27 = d.v27 || 0; // 0% value
        const v28 = d.v28 || 0; // 0% tax (always 0)
        const v29 = d.v29 || 0; // 5% value
        const v30 = d.v30 || 0; // 5% tax
        const v31 = d.v31 || 0; // 10% value
        const v32 = d.v32 || 0; // 10% tax
        const v32a = d.v32a || 0; // Not declared value

        // Totals
        const v33 = v26 + v27 + v29 + v31 + v32a; // Total Revenue
        const v34 = v27 + v29 + v31; // Total Taxable Revenue
        const v35 = v28 + v30 + v32; // Total Output VAT

        // Section III
        // [36] = [35] - [25]
        const v36 = v35 - v25;

        const v37 = d.v37 || 0; // Adjustment increase
        const v38 = d.v38 || 0; // Adjustment decrease
        const v39 = d.v39 || 0; // Current period tax (off-balance) - vãng lai
        const v40a = d.v40a || 0; // Tax paid on behalf

        // [40] Tax payable: If ([36] - [22] + [37] - [38] - [39]) > 0
        // [41] Not yet deducted: If ([36] - [22] + [37] - [38] - [39]) < 0
        const calcBase = v36 - v22 + v37 - v38 - v39;

        const v40 = calcBase > 0 ? calcBase : 0;
        const v41 = calcBase < 0 ? Math.abs(calcBase) : 0;

        const v42 = d.v42 || 0; // Refund requested

        // [43] = [41] - [42]
        const v43 = v41 - v42;

        return { v22, v23, v24, v25, v26, v27, v28, v29, v30, v31, v32, v32a, v33, v34, v35, v36, v37, v38, v39, v40, v40a, v41, v42, v43 };
    }, [data, type]);

    // Calculate derived values for PIT (Circular 80 - Form 05/KK-TNCN)
    const pitCalculations = useMemo(() => {
        if (type !== 'pit') return {};
        const d = data || {};

        const v21 = d.v21 || 0; // Total employees
        const v22 = d.v22 || 0; // Resident with labor contract
        const v23 = d.v23 || 0; // Pre-calculated Total Taxable Income

        // Detailed breakdown usually comes from backend, defaulting here
        const v24 = d.v24 || v23; // Total Taxable Income paid
        const v25 = d.v25 || 0; // Taxable Income for non-residents

        const v26 = d.v26 || 0; // Taxable Income of authorized declarant

        const v27 = d.v27 || 0; // Taxable Income subject to withholding
        const v28 = d.v28 || 0; // Included in v27, for non-residents
        const v29 = d.v29 || 0; // Included in v27, for authorized declarants

        const v30 = d.v30 || 0; // Total Tax Withheld
        const v31 = d.v31 || 0; // Tax withheld for non-residents
        const v32 = d.v32 || 0; // Tax withheld for authorized declarants

        const v33 = v30; // Total tax payable (assuming simple case where withheld = payable for monthly/quarterly)

        return { v21, v22, v24, v25, v26, v27, v28, v29, v30, v31, v32, v33 };
    }, [data, type]);

    // Calculate derived values for CIT (Circular 80 - Form 03/TNDN)
    const citCalculations = useMemo(() => {
        if (type !== 'cit') return {};
        const d = data || {};

        const a1 = d.a1 || 0; // Revenue
        const b1 = d.b1 || 0; // Acounting Profit Before Tax

        const b12 = b1; // Simplified: Total adjusted income = B1 (assuming no B2-B11 adjustments for now)
        const b13 = d.b13 || 0; // Exempt income
        const b14 = d.b14 || 0; // Loss carried forward

        const c1 = b12 - b13 - b14; // Taxable Income
        const c2 = d.c2 || 0; // Income from science/tech fund
        // const c3 = d.c3 || 0; // Real estate transfer income (separate)

        const c4 = c1 - c2; // Income subject to standard tax calculation

        const c7 = d.c7 || (c4 > 0 ? c4 * 0.2 : 0); // Tax at 20% (Standard)
        const c8 = d.c8 || 0; // Tax at preferential rates
        const c9 = d.c9 || 0; // Other rates

        const c10 = c7 + c8 + c9; // Total tax calculated

        const c11 = d.c11 || 0; // Tax exempted
        const c12 = d.c12 || 0; // Tax reduced
        const c13 = d.c13 || 0; // Tax paid abroad deductible

        const c16 = c10 - c11 - c12 - c13; // Tax payable

        const g1 = c16; // Total tax payable
        const g2 = d.g2 || 0; // Tax paid temporarily
        const g3 = g1 - g2; // Remaining payable (if positive)
        const g4 = g3 > 0 ? g3 : 0;
        const g5 = g3 < 0 ? Math.abs(g3) : 0; // Overpaid

        return { a1, b1, b12, b13, b14, c1, c4, c7, c10, c11, c12, c13, c16, g1, g2, g4, g5 };
    }, [data, type]);


    return (
        <div className="p-8 max-w-5xl mx-auto w-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 min-h-[29.7cm] font-serif printable-area text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="text-xs uppercase font-bold text-slate-500">
                    <p>Mẫu số: {type === 'vat' ? '01/GTGT' : type === 'pit' ? '05/KK-TNCN' : type === 'cit' ? '03/TNDN' : '03-1A/TNDN'}</p>
                    <p>(Ban hành kèm theo Thông tư số 80/2021/TT-BTC)</p>
                </div>
                <div className="text-right">
                    <h1 className="text-xl font-black uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
                    <p className="font-bold text-sm">Độc lập - Tự do - Hạnh phúc</p>
                </div>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-black uppercase">
                    {type === 'vat' && 'TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG'}
                    {type === 'pit' && 'TỜ KHAI QUYẾT TOÁN THUẾ THU NHẬP CÁ NHÂN'}
                    {type === 'cit' && 'TỜ KHAI QUYẾT TOÁN THUẾ THU NHẬP DOANH NGHIỆP'}
                    {type === 'cit-03-1a' && 'KẾT QUẢ HOẠT ĐỘNG SẢN XUẤT KINH DOANH'}
                </h2>
                <p className="font-bold uppercase mt-2">[01] Kỳ tính thuế: {period}</p>
            </div>

            {/* Form Content */}
            <div className="space-y-4 text-sm">

                {type === 'vat' && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-4 italic">
                            <span className="font-bold">[21]</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300" disabled checked={false} />
                                <span>Không phát sinh hoạt động mua bán trong kỳ</span>
                            </label>
                        </div>
                    </div>
                )}

                <table className="w-full border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50">
                            <th className="border border-slate-300 p-2 w-12 text-center">STT</th>
                            <th className="border border-slate-300 p-2 text-left">Chỉ tiêu</th>
                            <th className="border border-slate-300 p-2 w-16 text-center">Mã số</th>
                            <th className="border border-slate-300 p-2 w-40 text-right">Giá trị HHDV</th>
                            <th className="border border-slate-300 p-2 w-40 text-right">Thuế GTGT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {type === 'vat' && (
                            <>
                                {/* Row 22 */}
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2 font-bold" colSpan={2}>Thuế GTGT còn được khấu trừ kỳ trước chuyển sang</td>
                                    <td className="border border-slate-300 p-2 text-center">[22]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v22)}</td>
                                </tr>

                                {/* Section I */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">I</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={4}>Kê khai thuế GTGT đầu vào</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Giá trị và thuế GTGT của hàng hóa, dịch vụ mua vào</td>
                                    <td className="border border-slate-300 p-2 text-center">[23]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v23)}</td>
                                    <td className="border border-slate-300 p-2 text-center relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-400 font-bold">[24]</span>
                                        <div className="text-right font-mono mt-2">{formatNumber(vatCalculations.v24)}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2 font-bold text-blue-700">Tổng số thuế GTGT được khấu trừ kỳ này</td>
                                    <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">[25]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-blue-700" colSpan={2}>{formatNumber(vatCalculations.v25)}</td>
                                </tr>

                                {/* Section II */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">II</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={4}>Kê khai thuế GTGT đầu ra</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Hàng hóa, dịch vụ bán ra không chịu thuế GTGT</td>
                                    <td className="border border-slate-300 p-2 text-center">[26]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v26)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2">Hàng hóa, dịch vụ bán ra chịu thuế suất 0%</td>
                                    <td className="border border-slate-300 p-2 text-center">[27]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v27)}</td>
                                    <td className="border border-slate-300 p-2 text-center relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-400 font-bold">[28]</span>
                                        <div className="text-right font-mono mt-2">{formatNumber(vatCalculations.v28)}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">3</td>
                                    <td className="border border-slate-300 p-2">Hàng hóa, dịch vụ bán ra chịu thuế suất 5%</td>
                                    <td className="border border-slate-300 p-2 text-center">[29]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v29)}</td>
                                    <td className="border border-slate-300 p-2 text-center relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-400 font-bold">[30]</span>
                                        <div className="text-right font-mono mt-2">{formatNumber(vatCalculations.v30)}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">4</td>
                                    <td className="border border-slate-300 p-2">Hàng hóa, dịch vụ bán ra chịu thuế suất 10%</td>
                                    <td className="border border-slate-300 p-2 text-center">[31]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v31)}</td>
                                    <td className="border border-slate-300 p-2 text-center relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-400 font-bold">[32]</span>
                                        <div className="text-right font-mono mt-2">{formatNumber(vatCalculations.v32)}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">5</td>
                                    <td className="border border-slate-300 p-2">Hàng hóa, dịch vụ bán ra không tính thuế</td>
                                    <td className="border border-slate-300 p-2 text-center">[32a]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v32a)}</td>
                                </tr>

                                {/* Totals Section II */}
                                <tr className="font-bold bg-slate-50 dark:bg-slate-900/10">
                                    <td className="border border-slate-300 p-2 text-center italic"></td>
                                    <td className="border border-slate-300 p-2">Tổng doanh thu và thuế GTGT của HHDV bán ra</td>
                                    <td className="border border-slate-300 p-2 text-center">[33]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v33)}</td>
                                    <td className="border border-slate-300 p-2 text-center relative">
                                        <div className="text-right font-mono">{formatNumber(vatCalculations.v35)}</div>
                                    </td>
                                </tr>
                                <tr className="font-bold bg-slate-50 dark:bg-slate-900/10">
                                    <td className="border border-slate-300 p-2 text-center italic"></td>
                                    <td className="border border-slate-300 p-2">Tổng doanh thu và thuế GTGT của HHDV chịu thuế</td>
                                    <td className="border border-slate-300 p-2 text-center">[34]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v34)}</td>
                                    <td className="border border-slate-300 p-2 text-center relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-400 font-bold">[35]</span>
                                        <div className="text-right font-mono mt-2 text-red-600">{formatNumber(vatCalculations.v35)}</div>
                                    </td>
                                </tr>

                                {/* Section III */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">III</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={4}>Xác định nghĩa vụ thuế GTGT</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2" colSpan={2}>Thuế GTGT phát sinh trong kỳ ([36] = [35] - [25])</td>
                                    <td className="border border-slate-300 p-2 text-center">[36]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v36)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2" colSpan={2}>Điều chỉnh giảm thuế GTGT còn được khấu trừ của các kỳ trước</td>
                                    <td className="border border-slate-300 p-2 text-center">[37]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v37)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">3</td>
                                    <td className="border border-slate-300 p-2" colSpan={2}>Điều chỉnh tăng thuế GTGT còn được khấu trừ của các kỳ trước</td>
                                    <td className="border border-slate-300 p-2 text-center">[38]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v38)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">4</td>
                                    <td className="border border-slate-300 p-2" colSpan={2}>Thuế GTGT đã nộp ở địa phương nơi có hoạt động thu hộ...</td>
                                    <td className="border border-slate-300 p-2 text-center">[39]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v39)}</td>
                                </tr>

                                <tr className="bg-red-50 dark:bg-red-900/10">
                                    <td className="border border-slate-300 p-2 text-center italic">5</td>
                                    <td className="border border-slate-300 p-2 font-black uppercase text-red-700" colSpan={2}>Thuế GTGT phải nộp trong kỳ</td>
                                    <td className="border border-slate-300 p-2 text-center font-bold text-red-700">[40]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono font-black text-red-700">{formatNumber(vatCalculations.v40)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">5a</td>
                                    <td className="border border-slate-300 p-2 font-bold" colSpan={2}>Thuế GTGT phải nộp của hoạt động thu hộ...</td>
                                    <td className="border border-slate-300 p-2 text-center">[40a]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v40a)}</td>
                                </tr>

                                <tr className="bg-green-50 dark:bg-green-900/10">
                                    <td className="border border-slate-300 p-2 text-center italic">6</td>
                                    <td className="border border-slate-300 p-2 font-bold text-green-700" colSpan={2}>Thuế GTGT chưa khấu trừ hết kỳ này</td>
                                    <td className="border border-slate-300 p-2 text-center font-bold text-green-700">[41]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-green-700">{formatNumber(vatCalculations.v41)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">7</td>
                                    <td className="border border-slate-300 p-2" colSpan={2}>Thuế GTGT đề nghị hoàn</td>
                                    <td className="border border-slate-300 p-2 text-center">[42]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(vatCalculations.v42)}</td>
                                </tr>
                                <tr className="bg-green-50 border-t-2 border-slate-400">
                                    <td className="border border-slate-300 p-2 text-center italic">8</td>
                                    <td className="border border-slate-300 p-2 font-black uppercase text-green-800" colSpan={2}>Thuế GTGT còn được khấu trừ chuyển kỳ sau ([43] = [41] - [42])</td>
                                    <td className="border border-slate-300 p-2 text-center font-black text-green-800">[43]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono font-black text-green-800">{formatNumber(vatCalculations.v43)}</td>
                                </tr>
                            </>
                        )}

                        {/* Other Forms (PIT, CIT) maintained below for compatibility */}

                        {type === 'pit' && (
                            <>
                                {/* Section I: General Info */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">I</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Thông tin nộp thuế</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Tổng số người lao động</td>
                                    <td className="border border-slate-300 p-2 text-center">[21]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v21)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2">Trong đó: Cá nhân cư trú có hợp đồng lao động</td>
                                    <td className="border border-slate-300 p-2 text-center">[22]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v22)}</td>
                                </tr>

                                {/* Section II: Taxable Income */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">II</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Tổng thu nhập chịu thuế (TNCT) trả cho cá nhân</td>
                                </tr>
                                <tr className="font-bold">
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Tổng số TNCT trả cho cá nhân</td>
                                    <td className="border border-slate-300 p-2 text-center">[24]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v24)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1a</td>
                                    <td className="border border-slate-300 p-2 pl-6">Trong đó: TNCT trả cho cá nhân cư trú có hợp đồng lao động</td>
                                    <td className="border border-slate-300 p-2 text-center">[25]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v25)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2 pl-6">Tổng TNCT trả cho cá nhân không cư trú</td>
                                    <td className="border border-slate-300 p-2 text-center">[26]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v26)}</td>
                                </tr>

                                {/* Section III: Deductible Income */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">III</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Tổng thu nhập chịu thuế trả cho cá nhân thuộc diện phải khấu trừ thuế</td>
                                </tr>
                                <tr className="font-bold">
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Tổng số TNCT trả cho cá nhân thuộc diện phải khấu trừ thuế</td>
                                    <td className="border border-slate-300 p-2 text-center">[27]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v27)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1a</td>
                                    <td className="border border-slate-300 p-2 pl-6">Trong đó: Cá nhân cư trú có hợp đồng lao động</td>
                                    <td className="border border-slate-300 p-2 text-center">[28]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v28)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2 pl-6">Cá nhân không cư trú</td>
                                    <td className="border border-slate-300 p-2 text-center">[29]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v29)}</td>
                                </tr>

                                {/* Section IV: Tax Withheld */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">IV</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Tổng số thuế TNCN đã khấu trừ</td>
                                </tr>
                                <tr className="font-black text-red-700">
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Tổng số thuế TNCN đã khấu trừ</td>
                                    <td className="border border-slate-300 p-2 text-center">[30]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v30)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1a</td>
                                    <td className="border border-slate-300 p-2 pl-6">Trong đó: Cá nhân cư trú có hợp đồng lao động</td>
                                    <td className="border border-slate-300 p-2 text-center">[31]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v31)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2 pl-6">Cá nhân không cư trú</td>
                                    <td className="border border-slate-300 p-2 text-center">[32]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(pitCalculations.v32)}</td>
                                </tr>

                                {/* Section V: Tax Obligation */}
                                <tr className="bg-red-50 dark:bg-red-900/10 font-bold">
                                    <td className="border border-slate-300 p-2 text-center italic">V</td>
                                    <td className="border border-slate-300 p-2 uppercase text-red-700">Tổng số thuế TNCN phải nộp</td>
                                    <td className="border border-slate-300 p-2 text-center">[33]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono text-red-700 font-black">{formatNumber(pitCalculations.v33)}</td>
                                </tr>
                            </>
                        )}

                        {type === 'cit' && (
                            <>
                                {/* Section A: Result */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">A</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Kết quả hoạt động sản xuất kinh doanh</td>
                                </tr>
                                <tr className="font-bold">
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Doanh thu bán hàng và cung cấp dịch vụ</td>
                                    <td className="border border-slate-300 p-2 text-center">[A1]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.a1)}</td>
                                </tr>

                                {/* Section B: Taxable Income Determining */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">B</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Xác định thu nhập chịu thuế</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Tổng lợi nhuận kế toán trước thuế TNDN</td>
                                    <td className="border border-slate-300 p-2 text-center">[B1]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.b1)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2">Tổng điều chỉnh tăng doanh thu</td>
                                    <td className="border border-slate-300 p-2 text-center">[B2]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">0</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">...</td>
                                    <td className="border border-slate-300 p-2 italic text-slate-500">Các khoản điều chỉnh khác (B3-B11)</td>
                                    <td className="border border-slate-300 p-2 text-center">...</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">0</td>
                                </tr>
                                <tr className="font-bold">
                                    <td className="border border-slate-300 p-2 text-center italic">12</td>
                                    <td className="border border-slate-300 p-2">Tổng thu nhập chịu thuế ([B12] = [B1] + [B2] - [B7]...)</td>
                                    <td className="border border-slate-300 p-2 text-center">[B12]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.b12)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">13</td>
                                    <td className="border border-slate-300 p-2">Thu nhập miễn thuế</td>
                                    <td className="border border-slate-300 p-2 text-center">[B13]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.b13)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">14</td>
                                    <td className="border border-slate-300 p-2">Lỗ kết chuyển từ các năm trước</td>
                                    <td className="border border-slate-300 p-2 text-center">[B14]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.b14)}</td>
                                </tr>

                                {/* Section C: Tax Calculation */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">C</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Xác định số thuế phải nộp</td>
                                </tr>
                                <tr className="font-bold">
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Thu nhập tính thuế ([C1] = [B12] - [B13] - [B14])</td>
                                    <td className="border border-slate-300 p-2 text-center">[C1]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.c1)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">4</td>
                                    <td className="border border-slate-300 p-2">Thu nhập tính thuế áp dụng thuế suất phổ thông</td>
                                    <td className="border border-slate-300 p-2 text-center">[C4]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.c4)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">7</td>
                                    <td className="border border-slate-300 p-2 font-bold text-blue-700">Thuế TNDN từ hoạt động SXKD tính theo thuế suất phổ thông (20%)</td>
                                    <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">[C7]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-blue-700">{formatNumber(citCalculations.c7)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">10</td>
                                    <td className="border border-slate-300 p-2 font-bold">Tổng số thuế TNDN phải nộp ([C10] = [C7] + [C8] + [C9])</td>
                                    <td className="border border-slate-300 p-2 text-center">[C10]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.c10)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">15</td>
                                    <td className="border border-slate-300 p-2 italic">Thuế TNDN miễn, giảm</td>
                                    <td className="border border-slate-300 p-2 text-center">[C15]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.c11 + citCalculations.c12)}</td>
                                </tr>

                                {/* Section G: Final Obligation */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td className="border border-slate-300 p-2 text-center font-bold">G</td>
                                    <td className="border border-slate-300 p-2 font-bold uppercase" colSpan={3}>Nghĩa vụ thuế TNDN</td>
                                </tr>
                                <tr className="font-bold">
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2">Tổng số thuế TNDN phải nộp</td>
                                    <td className="border border-slate-300 p-2 text-center">[G1]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.g1)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2">Thuế TNDN đã tạm nộp trong năm</td>
                                    <td className="border border-slate-300 p-2 text-center">[G2]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.g2)}</td>
                                </tr>
                                <tr className="bg-red-50 dark:bg-red-900/10 font-black text-red-700">
                                    <td className="border border-slate-300 p-2 text-center italic">4</td>
                                    <td className="border border-slate-300 p-2 uppercase">Thuế TNDN còn phải nộp (nếu G1 &gt; G2)</td>
                                    <td className="border border-slate-300 p-2 text-center">[G4]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.g4)}</td>
                                </tr>
                                <tr className="bg-green-50 dark:bg-green-900/10 font-bold text-green-700">
                                    <td className="border border-slate-300 p-2 text-center italic">5</td>
                                    <td className="border border-slate-300 p-2 uppercase">Thuế TNDN nộp thừa (nếu G1 &lt; G2)</td>
                                    <td className="border border-slate-300 p-2 text-center">[G5]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(citCalculations.g5)}</td>
                                </tr>
                            </>
                        )}

                        {type === 'cit-03-1a' && (
                            <>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">1</td>
                                    <td className="border border-slate-300 p-2 font-bold" colSpan={2}>Doanh thu bán hàng và cung cấp dịch vụ</td>
                                    <td className="border border-slate-300 p-2 text-center">[01]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono" colSpan={2}>{formatNumber(data.a1)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">2</td>
                                    <td className="border border-slate-300 p-2 font-bold pl-8 text-slate-500" colSpan={2}>Các khoản giảm trừ doanh thu</td>
                                    <td className="border border-slate-300 p-2 text-center">[02]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono" colSpan={2}>0</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-2 text-center italic">3</td>
                                    <td className="border border-slate-300 p-2 font-black text-blue-700" colSpan={2}>Doanh thu thuần về bán hàng và cung cấp dịch vụ</td>
                                    <td className="border border-slate-300 p-2 text-center">[10]</td>
                                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-blue-700" colSpan={2}>{formatNumber(data.a1)}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Signatures */}
            <div className="mt-20 grid grid-cols-2 text-center break-inside-avoid">
                <div>
                    <p className="font-bold">Người lập biểu</p>
                    <p className="text-xs italic">(Ký, họ tên)</p>
                </div>
                <div>
                    <p className="text-xs italic">Ngày ...... tháng ...... năm ......</p>
                    <p className="font-bold">NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT</p>
                    <p className="text-xs italic">(Ký, họ tên và đóng dấu)</p>
                </div>
            </div>
        </div>
    );
};
