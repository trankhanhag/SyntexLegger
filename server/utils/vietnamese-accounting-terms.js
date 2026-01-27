/**
 * Vietnamese Accounting Terms Dictionary
 * SyntexHCSN - Mapping Vietnamese terms to database schema
 *
 * Used by template-parser.service.js for local field recognition
 * Based on: Thông tư 24/2024/TT-BTC và các quy định kế toán HCSN
 */

/**
 * Database tables available for mapping
 */
const TABLES = {
    VOUCHERS: 'vouchers',
    VOUCHER_ITEMS: 'voucher_items',
    CHART_OF_ACCOUNTS: 'chart_of_accounts',
    PARTNERS: 'partners',
    FIXED_ASSETS: 'fixed_assets',
    PRODUCTS: 'products',
    INVENTORY: 'inventory_transactions',
    FUND_SOURCES: 'fund_sources',
    BUDGET_ITEMS: 'budget_items',
    PROJECTS: 'projects',
    CONTRACTS: 'contracts',
    EMPLOYEES: 'employees',
    DEPARTMENTS: 'departments',
    TREASURY_IMPORTS: 'treasury_imports',
};

/**
 * Core Vietnamese accounting terms dictionary
 * Format: { term: { table, column, type, aliases, description } }
 *
 * type: 'text' | 'number' | 'date' | 'computed'
 * aliases: Alternative names for fuzzy matching
 */
const VIETNAMESE_TERMS = {
    // ============================================
    // TÀI KHOẢN (Chart of Accounts)
    // ============================================
    'mã tài khoản': {
        table: TABLES.CHART_OF_ACCOUNTS,
        column: 'account_code',
        type: 'text',
        aliases: ['mã tk', 'số hiệu tk', 'số tk', 'tk', 'tài khoản', 'số hiệu tài khoản', 'account code'],
        description: 'Mã số tài khoản kế toán'
    },
    'tên tài khoản': {
        table: TABLES.CHART_OF_ACCOUNTS,
        column: 'account_name',
        type: 'text',
        aliases: ['tên tk', 'diễn giải tk', 'nội dung tk', 'account name'],
        description: 'Tên tài khoản kế toán'
    },
    'loại tài khoản': {
        table: TABLES.CHART_OF_ACCOUNTS,
        column: 'type',
        type: 'text',
        aliases: ['loại tk', 'nhóm tk', 'account type'],
        description: 'Loại tài khoản: Tài sản, Nguồn vốn, Chi phí, Doanh thu'
    },
    'tài khoản cha': {
        table: TABLES.CHART_OF_ACCOUNTS,
        column: 'parent_account',
        type: 'text',
        aliases: ['tk cha', 'tài khoản cấp trên', 'tk cấp trên'],
        description: 'Mã tài khoản cấp trên'
    },
    'cấp tài khoản': {
        table: TABLES.CHART_OF_ACCOUNTS,
        column: 'level',
        type: 'number',
        aliases: ['cấp tk', 'bậc tk', 'level'],
        description: 'Cấp độ tài khoản (1, 2, 3...)'
    },

    // ============================================
    // CHỨNG TỪ (Vouchers)
    // ============================================
    'số chứng từ': {
        table: TABLES.VOUCHERS,
        column: 'doc_no',
        type: 'text',
        aliases: ['số ct', 'số phiếu', 'mã ct', 'chứng từ số', 'ct số', 'số hiệu ct', 'document number'],
        description: 'Số hiệu chứng từ kế toán'
    },
    'ngày chứng từ': {
        table: TABLES.VOUCHERS,
        column: 'doc_date',
        type: 'date',
        aliases: ['ngày ct', 'ngày lập', 'ngày phát sinh', 'ngày', 'document date'],
        description: 'Ngày lập chứng từ'
    },
    'ngày hạch toán': {
        table: TABLES.VOUCHERS,
        column: 'post_date',
        type: 'date',
        aliases: ['ngày ht', 'ngày ghi sổ', 'ngày vào sổ', 'posting date'],
        description: 'Ngày ghi sổ kế toán'
    },
    'diễn giải': {
        table: TABLES.VOUCHERS,
        column: 'description',
        type: 'text',
        aliases: ['nội dung', 'lý do', 'mô tả', 'ghi chú', 'description', 'nội dung nghiệp vụ'],
        description: 'Nội dung diễn giải nghiệp vụ'
    },
    'loại chứng từ': {
        table: TABLES.VOUCHERS,
        column: 'type',
        type: 'text',
        aliases: ['loại ct', 'loại phiếu', 'voucher type'],
        description: 'Loại chứng từ: Phiếu thu, Phiếu chi, Nhập kho...'
    },
    'trạng thái': {
        table: TABLES.VOUCHERS,
        column: 'status',
        type: 'text',
        aliases: ['tình trạng', 'status'],
        description: 'Trạng thái chứng từ: Nháp, Đã ghi sổ, Đã hủy'
    },
    'tổng tiền': {
        table: TABLES.VOUCHERS,
        column: 'total_amount',
        type: 'number',
        aliases: ['tổng số tiền', 'tổng cộng', 'total', 'tổng', 'số tiền'],
        description: 'Tổng số tiền trên chứng từ'
    },

    // ============================================
    // CHI TIẾT CHỨNG TỪ (Voucher Items) - SỐ PHÁT SINH
    // ============================================
    'số phát sinh nợ': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'amount',
        joinCondition: 'debit_account IS NOT NULL',
        type: 'number',
        aliases: ['phát sinh nợ', 'ps nợ', 'nợ', 'debit', 'bên nợ', 'số tiền nợ'],
        description: 'Số phát sinh bên Nợ'
    },
    'số phát sinh có': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'amount',
        joinCondition: 'credit_account IS NOT NULL',
        type: 'number',
        aliases: ['phát sinh có', 'ps có', 'có', 'credit', 'bên có', 'số tiền có'],
        description: 'Số phát sinh bên Có'
    },
    'tài khoản nợ': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'debit_account',
        type: 'text',
        aliases: ['tk nợ', 'tài khoản bên nợ', 'ghi nợ', 'nợ tk', 'debit account'],
        description: 'Tài khoản ghi Nợ'
    },
    'tài khoản có': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'credit_account',
        type: 'text',
        aliases: ['tk có', 'tài khoản bên có', 'ghi có', 'có tk', 'credit account'],
        description: 'Tài khoản ghi Có'
    },
    'tài khoản đối ứng': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'credit_account', // or debit_account depending on context
        type: 'text',
        aliases: ['tk đối ứng', 'đối ứng', 'corresponding account'],
        description: 'Tài khoản đối ứng'
    },
    'số tiền': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'amount',
        type: 'number',
        aliases: ['tiền', 'số tiền vnd', 'amount', 'thành tiền'],
        description: 'Số tiền theo dòng'
    },
    'số lượng': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'quantity',
        type: 'number',
        aliases: ['sl', 'qty', 'quantity', 'số lượng nhập', 'số lượng xuất'],
        description: 'Số lượng'
    },
    'đơn giá': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'unit_price',
        type: 'number',
        aliases: ['giá', 'đơn giá bán', 'đơn giá nhập', 'unit price', 'giá đơn vị'],
        description: 'Đơn giá'
    },

    // ============================================
    // ĐỐI TƯỢNG / ĐỐI TÁC (Partners)
    // ============================================
    'mã đối tượng': {
        table: TABLES.PARTNERS,
        column: 'partner_code',
        type: 'text',
        aliases: ['mã đt', 'mã khách hàng', 'mã nhà cung cấp', 'mã ncc', 'mã kh', 'partner code'],
        description: 'Mã đối tượng công nợ'
    },
    'tên đối tượng': {
        table: TABLES.PARTNERS,
        column: 'partner_name',
        type: 'text',
        aliases: ['tên đt', 'đối tượng', 'tên khách hàng', 'tên ncc', 'khách hàng', 'nhà cung cấp', 'partner name'],
        description: 'Tên đối tượng công nợ'
    },
    'mã số thuế': {
        table: TABLES.PARTNERS,
        column: 'tax_code',
        type: 'text',
        aliases: ['mst', 'tax code', 'số thuế', 'mã thuế'],
        description: 'Mã số thuế'
    },
    'địa chỉ': {
        table: TABLES.PARTNERS,
        column: 'address',
        type: 'text',
        aliases: ['địa chỉ đt', 'address'],
        description: 'Địa chỉ đối tượng'
    },
    'số điện thoại': {
        table: TABLES.PARTNERS,
        column: 'phone',
        type: 'text',
        aliases: ['điện thoại', 'sđt', 'phone'],
        description: 'Số điện thoại liên hệ'
    },
    'tài khoản ngân hàng': {
        table: TABLES.PARTNERS,
        column: 'bank_account',
        type: 'text',
        aliases: ['stk', 'số tk nh', 'tk ngân hàng', 'bank account'],
        description: 'Số tài khoản ngân hàng'
    },
    'ngân hàng': {
        table: TABLES.PARTNERS,
        column: 'bank_name',
        type: 'text',
        aliases: ['tên ngân hàng', 'bank', 'nh'],
        description: 'Tên ngân hàng'
    },

    // ============================================
    // SẢN PHẨM / VẬT TƯ (Products)
    // ============================================
    'mã vật tư': {
        table: TABLES.PRODUCTS,
        column: 'product_code',
        type: 'text',
        aliases: ['mã hàng', 'mã sản phẩm', 'mã sp', 'mã vt', 'product code', 'item code'],
        description: 'Mã vật tư hàng hóa'
    },
    'tên vật tư': {
        table: TABLES.PRODUCTS,
        column: 'product_name',
        type: 'text',
        aliases: ['tên hàng', 'tên sản phẩm', 'tên sp', 'tên vt', 'vật tư', 'hàng hóa', 'product name'],
        description: 'Tên vật tư hàng hóa'
    },
    'đơn vị tính': {
        table: TABLES.PRODUCTS,
        column: 'unit',
        type: 'text',
        aliases: ['đvt', 'unit', 'đơn vị'],
        description: 'Đơn vị tính (cái, kg, m...)'
    },
    'quy cách': {
        table: TABLES.PRODUCTS,
        column: 'specification',
        type: 'text',
        aliases: ['quy cách phẩm chất', 'spec', 'specification'],
        description: 'Quy cách phẩm chất'
    },

    // ============================================
    // TÀI SẢN CỐ ĐỊNH (Fixed Assets)
    // ============================================
    'mã tài sản': {
        table: TABLES.FIXED_ASSETS,
        column: 'asset_code',
        type: 'text',
        aliases: ['mã ts', 'mã tscđ', 'asset code'],
        description: 'Mã tài sản cố định'
    },
    'tên tài sản': {
        table: TABLES.FIXED_ASSETS,
        column: 'asset_name',
        type: 'text',
        aliases: ['tên ts', 'tên tscđ', 'tài sản', 'asset name'],
        description: 'Tên tài sản cố định'
    },
    'nguyên giá': {
        table: TABLES.FIXED_ASSETS,
        column: 'original_value',
        type: 'number',
        aliases: ['giá trị ban đầu', 'original value', 'giá gốc'],
        description: 'Nguyên giá tài sản'
    },
    'khấu hao lũy kế': {
        table: TABLES.FIXED_ASSETS,
        column: 'accumulated_depreciation',
        type: 'number',
        aliases: ['hao mòn lũy kế', 'kh lũy kế', 'accumulated depreciation'],
        description: 'Khấu hao lũy kế'
    },
    'giá trị còn lại': {
        table: TABLES.FIXED_ASSETS,
        column: 'net_book_value',
        type: 'number',
        aliases: ['gtcl', 'giá còn lại', 'net book value', 'còn lại'],
        description: 'Giá trị còn lại của tài sản'
    },
    'thời gian khấu hao': {
        table: TABLES.FIXED_ASSETS,
        column: 'useful_life_months',
        type: 'number',
        aliases: ['thời gian sử dụng', 'số năm sử dụng', 'useful life'],
        description: 'Thời gian sử dụng (tháng)'
    },
    'khấu hao tháng': {
        table: TABLES.FIXED_ASSETS,
        column: 'monthly_depreciation',
        type: 'number',
        aliases: ['kh tháng', 'khấu hao hàng tháng', 'monthly depreciation'],
        description: 'Mức khấu hao hàng tháng'
    },
    'ngày mua': {
        table: TABLES.FIXED_ASSETS,
        column: 'purchase_date',
        type: 'date',
        aliases: ['ngày mua sắm', 'ngày tăng', 'purchase date'],
        description: 'Ngày mua tài sản'
    },
    'ngày sử dụng': {
        table: TABLES.FIXED_ASSETS,
        column: 'usage_date',
        type: 'date',
        aliases: ['ngày đưa vào sử dụng', 'ngày bắt đầu sử dụng'],
        description: 'Ngày bắt đầu sử dụng'
    },

    // ============================================
    // NGUỒN KINH PHÍ (Fund Sources - TT24)
    // ============================================
    'mã nguồn': {
        table: TABLES.FUND_SOURCES,
        column: 'fund_code',
        type: 'text',
        aliases: ['nguồn kinh phí', 'mã nguồn kp', 'nguồn', 'fund code', 'mã nkp'],
        description: 'Mã nguồn kinh phí theo TT24'
    },
    'tên nguồn': {
        table: TABLES.FUND_SOURCES,
        column: 'fund_name',
        type: 'text',
        aliases: ['tên nguồn kp', 'nguồn kinh phí', 'fund name'],
        description: 'Tên nguồn kinh phí'
    },

    // ============================================
    // CHƯƠNG, LOẠI, KHOẢN, MỤC (Budget Classification)
    // ============================================
    'chương': {
        table: TABLES.BUDGET_ITEMS,
        column: 'chapter_code',
        type: 'text',
        aliases: ['mã chương', 'chapter', 'chapter code'],
        description: 'Mã chương ngân sách'
    },
    'loại': {
        table: TABLES.BUDGET_ITEMS,
        column: 'category_code',
        type: 'text',
        aliases: ['mã loại', 'category'],
        description: 'Mã loại ngân sách'
    },
    'khoản': {
        table: TABLES.BUDGET_ITEMS,
        column: 'section_code',
        type: 'text',
        aliases: ['mã khoản', 'section'],
        description: 'Mã khoản ngân sách'
    },
    'mục': {
        table: TABLES.BUDGET_ITEMS,
        column: 'item_code',
        type: 'text',
        aliases: ['mã mục', 'tiểu mục', 'mục lục', 'budget item'],
        description: 'Mục lục ngân sách'
    },

    // ============================================
    // DỰ ÁN (Projects)
    // ============================================
    'mã dự án': {
        table: TABLES.PROJECTS,
        column: 'project_code',
        type: 'text',
        aliases: ['dự án', 'mã da', 'project code'],
        description: 'Mã dự án'
    },
    'tên dự án': {
        table: TABLES.PROJECTS,
        column: 'project_name',
        type: 'text',
        aliases: ['tên da', 'project name'],
        description: 'Tên dự án'
    },

    // ============================================
    // HỢP ĐỒNG (Contracts)
    // ============================================
    'mã hợp đồng': {
        table: TABLES.CONTRACTS,
        column: 'contract_code',
        type: 'text',
        aliases: ['số hợp đồng', 'hợp đồng số', 'contract code', 'mã hđ'],
        description: 'Mã/Số hợp đồng'
    },
    'tên hợp đồng': {
        table: TABLES.CONTRACTS,
        column: 'contract_name',
        type: 'text',
        aliases: ['tên hđ', 'contract name'],
        description: 'Tên hợp đồng'
    },
    'giá trị hợp đồng': {
        table: TABLES.CONTRACTS,
        column: 'contract_value',
        type: 'number',
        aliases: ['giá trị hđ', 'contract value', 'giá hợp đồng'],
        description: 'Giá trị hợp đồng'
    },

    // ============================================
    // MÃ THỐNG KÊ (Dimensions)
    // ============================================
    'mã thống kê 1': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'dim1',
        type: 'text',
        aliases: ['dim1', 'mtk1', 'mã tk 1'],
        description: 'Mã thống kê 1'
    },
    'mã thống kê 2': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'dim2',
        type: 'text',
        aliases: ['dim2', 'mtk2', 'mã tk 2'],
        description: 'Mã thống kê 2'
    },
    'mã thống kê 3': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'dim3',
        type: 'text',
        aliases: ['dim3', 'mtk3', 'mã tk 3'],
        description: 'Mã thống kê 3'
    },

    // ============================================
    // NHÂN VIÊN / PHÒNG BAN
    // ============================================
    'mã nhân viên': {
        table: TABLES.EMPLOYEES,
        column: 'employee_code',
        type: 'text',
        aliases: ['mã nv', 'employee code'],
        description: 'Mã nhân viên'
    },
    'tên nhân viên': {
        table: TABLES.EMPLOYEES,
        column: 'employee_name',
        type: 'text',
        aliases: ['họ tên', 'tên nv', 'employee name', 'nhân viên'],
        description: 'Họ tên nhân viên'
    },
    'phòng ban': {
        table: TABLES.DEPARTMENTS,
        column: 'department_name',
        type: 'text',
        aliases: ['bộ phận', 'đơn vị', 'department'],
        description: 'Phòng ban/Bộ phận'
    },
    'mã phòng ban': {
        table: TABLES.DEPARTMENTS,
        column: 'department_code',
        type: 'text',
        aliases: ['mã bộ phận', 'mã đơn vị', 'department code'],
        description: 'Mã phòng ban'
    },

    // ============================================
    // NGOẠI TỆ (Foreign Currency)
    // ============================================
    'loại tiền': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'currency',
        type: 'text',
        aliases: ['tiền tệ', 'currency', 'đơn vị tiền'],
        description: 'Loại tiền (VND, USD...)'
    },
    'tỷ giá': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'fx_rate',
        type: 'number',
        aliases: ['tỷ giá hối đoái', 'exchange rate', 'fx rate'],
        description: 'Tỷ giá hối đoái'
    },
    'số tiền ngoại tệ': {
        table: TABLES.VOUCHER_ITEMS,
        column: 'fx_amount',
        type: 'number',
        aliases: ['tiền ngoại tệ', 'foreign amount'],
        description: 'Số tiền quy đổi ngoại tệ'
    },

    // ============================================
    // KHO BẠC NHÀ NƯỚC (Treasury)
    // ============================================
    'mã kbnn': {
        table: TABLES.TREASURY_IMPORTS,
        column: 'budget_code',
        type: 'text',
        aliases: ['mã đơn vị kbnn', 'kho bạc', 'treasury code'],
        description: 'Mã đơn vị Kho bạc'
    },
    'số tham chiếu tabmis': {
        table: TABLES.TREASURY_IMPORTS,
        column: 'tabmis_ref',
        type: 'text',
        aliases: ['tabmis', 'số tabmis', 'tabmis reference'],
        description: 'Số tham chiếu TABMIS'
    },

    // ============================================
    // COMPUTED / AGGREGATE FIELDS
    // ============================================
    'số dư nợ đầu kỳ': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'opening_debit_balance',
        aliases: ['dư nợ đầu kỳ', 'số dư đầu kỳ nợ', 'opening debit'],
        description: 'Số dư nợ đầu kỳ (tính toán)'
    },
    'số dư có đầu kỳ': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'opening_credit_balance',
        aliases: ['dư có đầu kỳ', 'số dư đầu kỳ có', 'opening credit'],
        description: 'Số dư có đầu kỳ (tính toán)'
    },
    'số dư nợ cuối kỳ': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'closing_debit_balance',
        aliases: ['dư nợ cuối kỳ', 'số dư cuối kỳ nợ', 'closing debit'],
        description: 'Số dư nợ cuối kỳ (tính toán)'
    },
    'số dư có cuối kỳ': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'closing_credit_balance',
        aliases: ['dư có cuối kỳ', 'số dư cuối kỳ có', 'closing credit'],
        description: 'Số dư có cuối kỳ (tính toán)'
    },
    'cộng phát sinh nợ': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'sum_debit',
        aliases: ['tổng ps nợ', 'cộng nợ', 'tổng phát sinh nợ', 'sum debit'],
        description: 'Tổng phát sinh nợ'
    },
    'cộng phát sinh có': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'sum_credit',
        aliases: ['tổng ps có', 'cộng có', 'tổng phát sinh có', 'sum credit'],
        description: 'Tổng phát sinh có'
    },
    'lũy kế phát sinh nợ': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'ytd_debit',
        aliases: ['lũy kế nợ', 'lk ps nợ', 'ytd debit'],
        description: 'Lũy kế phát sinh nợ từ đầu năm'
    },
    'lũy kế phát sinh có': {
        table: null,
        column: null,
        type: 'computed',
        formula: 'ytd_credit',
        aliases: ['lũy kế có', 'lk ps có', 'ytd credit'],
        description: 'Lũy kế phát sinh có từ đầu năm'
    },
};

/**
 * Report type patterns - helps identify report structure
 */
const REPORT_PATTERNS = {
    'so_cai': {
        keywords: ['sổ cái', 'số cái tài khoản', 'general ledger'],
        requiredFields: ['account_code', 'doc_date', 'debit_amount', 'credit_amount'],
        groupBy: 'account_code',
        orderBy: ['account_code', 'doc_date']
    },
    'so_chi_tiet': {
        keywords: ['sổ chi tiết', 'chi tiết tài khoản', 'account detail'],
        requiredFields: ['account_code', 'doc_no', 'doc_date', 'amount'],
        groupBy: 'account_code',
        orderBy: ['doc_date']
    },
    'bang_can_doi': {
        keywords: ['bảng cân đối', 'cân đối tài khoản', 'trial balance'],
        requiredFields: ['account_code', 'account_name', 'opening_balance', 'debit', 'credit', 'closing_balance'],
        groupBy: 'account_code',
        orderBy: ['account_code']
    },
    'so_nhat_ky': {
        keywords: ['sổ nhật ký', 'nhật ký chung', 'journal'],
        requiredFields: ['doc_date', 'doc_no', 'description', 'debit_account', 'credit_account', 'amount'],
        groupBy: null,
        orderBy: ['doc_date', 'doc_no']
    },
    'bang_ke_chi_tiet': {
        keywords: ['bảng kê', 'bảng kê chi tiết', 'detail list'],
        requiredFields: ['doc_no', 'doc_date', 'description', 'amount'],
        groupBy: null,
        orderBy: ['doc_date']
    },
    'bao_cao_tai_san': {
        keywords: ['báo cáo tài sản', 'tình hình tài sản', 'asset report'],
        requiredFields: ['asset_code', 'asset_name', 'original_value', 'depreciation', 'net_value'],
        groupBy: 'asset_category',
        orderBy: ['asset_code']
    },
    'bao_cao_cong_no': {
        keywords: ['báo cáo công nợ', 'công nợ phải thu', 'công nợ phải trả', 'receivable', 'payable'],
        requiredFields: ['partner_code', 'partner_name', 'opening_balance', 'debit', 'credit', 'closing_balance'],
        groupBy: 'partner_code',
        orderBy: ['partner_code']
    },
    'bao_cao_kho': {
        keywords: ['báo cáo kho', 'nhập xuất tồn', 'inventory report'],
        requiredFields: ['product_code', 'product_name', 'opening_qty', 'receipt_qty', 'issue_qty', 'closing_qty'],
        groupBy: 'product_code',
        orderBy: ['product_code']
    }
};

/**
 * Aggregation function mappings
 */
const AGGREGATION_KEYWORDS = {
    'cộng': 'SUM',
    'tổng': 'SUM',
    'tổng cộng': 'SUM',
    'sum': 'SUM',
    'đếm': 'COUNT',
    'số lượng': 'COUNT',
    'count': 'COUNT',
    'trung bình': 'AVG',
    'avg': 'AVG',
    'average': 'AVG',
    'lớn nhất': 'MAX',
    'max': 'MAX',
    'nhỏ nhất': 'MIN',
    'min': 'MIN'
};

/**
 * Date period keywords for filtering
 */
const DATE_PERIOD_KEYWORDS = {
    'từ ngày': 'from_date',
    'đến ngày': 'to_date',
    'tháng': 'month',
    'quý': 'quarter',
    'năm': 'year',
    'kỳ': 'period',
    'đầu kỳ': 'period_start',
    'cuối kỳ': 'period_end'
};

/**
 * Utility: Normalize Vietnamese text for matching
 * Removes diacritics, lowercases, trims
 */
function normalizeVietnamese(text) {
    if (!text) return '';

    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,     // deletion
                    dp[i][j - 1] + 1,     // insertion
                    dp[i - 1][j - 1] + 1  // substitution
                );
            }
        }
    }
    return dp[m][n];
}

/**
 * Calculate similarity score (0 to 1)
 */
function calculateSimilarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
}

/**
 * Find best matching term for a field name
 * @param {string} fieldName - The field name to match
 * @param {number} threshold - Minimum similarity threshold (default 0.6)
 * @returns {{ term: string, mapping: object, confidence: number } | null}
 */
function findBestMatch(fieldName, threshold = 0.6) {
    const normalizedInput = normalizeVietnamese(fieldName);
    let bestMatch = null;
    let bestScore = 0;

    for (const [term, mapping] of Object.entries(VIETNAMESE_TERMS)) {
        // Check exact match on main term
        const normalizedTerm = normalizeVietnamese(term);
        let score = calculateSimilarity(normalizedInput, normalizedTerm);

        if (normalizedInput === normalizedTerm) {
            score = 1.0; // Perfect match
        }

        // Check aliases
        if (mapping.aliases) {
            for (const alias of mapping.aliases) {
                const normalizedAlias = normalizeVietnamese(alias);

                if (normalizedInput === normalizedAlias) {
                    score = 1.0;
                    break;
                }

                const aliasScore = calculateSimilarity(normalizedInput, normalizedAlias);
                if (aliasScore > score) {
                    score = aliasScore;
                }
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = { term, mapping, confidence: score };
        }
    }

    return bestScore >= threshold ? bestMatch : null;
}

/**
 * Detect report type from field names and keywords
 * @param {string[]} fieldNames - Array of field names from template
 * @returns {{ type: string, pattern: object, confidence: number } | null}
 */
function detectReportType(fieldNames) {
    const normalizedFields = fieldNames.map(f => normalizeVietnamese(f)).join(' ');
    let bestMatch = null;
    let bestScore = 0;

    for (const [type, pattern] of Object.entries(REPORT_PATTERNS)) {
        let score = 0;

        // Check keywords
        for (const keyword of pattern.keywords) {
            if (normalizedFields.includes(normalizeVietnamese(keyword))) {
                score += 0.3;
            }
        }

        // Check required fields presence
        const mappedFields = fieldNames.map(f => findBestMatch(f))
            .filter(m => m !== null)
            .map(m => m.mapping.column);

        const matchedRequired = pattern.requiredFields.filter(rf =>
            mappedFields.some(mf => mf && mf.includes(rf))
        ).length;

        score += (matchedRequired / pattern.requiredFields.length) * 0.7;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = { type, pattern, confidence: score };
        }
    }

    return bestScore > 0.4 ? bestMatch : null;
}

/**
 * Get all terms for a specific table
 */
function getTermsForTable(tableName) {
    return Object.entries(VIETNAMESE_TERMS)
        .filter(([_, mapping]) => mapping.table === tableName)
        .map(([term, mapping]) => ({ term, ...mapping }));
}

/**
 * Get computed field formulas
 */
function getComputedFields() {
    return Object.entries(VIETNAMESE_TERMS)
        .filter(([_, mapping]) => mapping.type === 'computed')
        .map(([term, mapping]) => ({ term, ...mapping }));
}

module.exports = {
    TABLES,
    VIETNAMESE_TERMS,
    REPORT_PATTERNS,
    AGGREGATION_KEYWORDS,
    DATE_PERIOD_KEYWORDS,
    normalizeVietnamese,
    levenshteinDistance,
    calculateSimilarity,
    findBestMatch,
    detectReportType,
    getTermsForTable,
    getComputedFields
};
