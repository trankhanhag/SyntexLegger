/**
 * Voucher Types & Interfaces
 * SyntexHCSN - Frontend
 */

export interface VoucherLine {
    id?: string;
    description: string;
    debitAcc: string;
    creditAcc: string;
    amount: number;
    partnerCode?: string;
    projectCode?: string;
    contractCode?: string;
    dim1?: string;
    dim2?: string;
    dim3?: string;
    dim4?: string;
    dim5?: string;
    productCode?: string;
    quantity?: number;
    unitPrice?: number;
    currency?: string;
    fxRate?: number;
    fxAmount?: number;
}

export interface Voucher {
    id?: string;
    doc_no: string;
    doc_date: string;
    post_date: string;
    description: string;
    type: string;
    total_amount: number;
    org_doc_no?: string;
    org_doc_date?: string;
    lines: VoucherLine[];
    status?: 'draft' | 'posted' | 'cancelled';
    created_at?: string;
    updated_at?: string;
}

export interface Account {
    account_code: string;
    account_name: string;
    parent_account?: string;
    level?: number;
    type?: string;
    is_parent?: boolean;
}

export interface Partner {
    partner_code: string;
    partner_name: string;
    tax_code?: string;
    address?: string;
    type?: 'customer' | 'supplier' | 'other';
}

export interface Product {
    id: string;
    product_code: string;
    product_name: string;
    unit?: string;
    category?: string;
    unit_price?: number;
}

export interface Dimension {
    id: number;
    code: string;
    name: string;
    type: string;
}

export interface DimensionConfig {
    account_code: string;
    dim1_type?: string;
    dim2_type?: string;
    dim3_type?: string;
    dim4_type?: string;
    dim5_type?: string;
}

export interface VoucherFilter {
    type?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    voucherIds?: string[];
    status?: string;
}

// Master Data for Forms
export interface MasterData {
    accounts: Account[];
    partners: Partner[];
    products: Product[];
    dimensions: Dimension[];
    dimConfigs: DimensionConfig[];
}
