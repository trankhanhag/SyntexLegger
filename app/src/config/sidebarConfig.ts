/**
 * Sidebar Configuration
 * SyntexLegger - Cấu hình menu cho Sidebar
 * Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

export interface MenuItem {
    id: string;
    icon: string;
    label: string;
    section?: string;
    keywords?: string[]; // For search functionality
}

export interface SectionConfig {
    icon: string;
    color: string;
}

// Section icons and colors for better visual grouping
export const SECTION_CONFIG: Record<string, SectionConfig> = {
    'CHỨNG TỪ TỔNG HỢP': { icon: 'receipt_long', color: 'amber' },
    'QUY TRÌNH CUỐI KỲ': { icon: 'published_with_changes', color: 'purple' },
    'DANH MỤC & THIẾT LẬP': { icon: 'settings', color: 'slate' },
    'BÁO CÁO TÀI CHÍNH': { icon: 'analytics', color: 'blue' },
    'BÁO CÁO PHÂN TÍCH': { icon: 'fact_check', color: 'green' },
    'BÁO CÁO QUẢN LÝ': { icon: 'summarize', color: 'teal' },
    'SỔ KẾ TOÁN': { icon: 'menu_book', color: 'indigo' },
    'SỔ CHI TIẾT': { icon: 'list_alt', color: 'slate' },
    'KHÁC': { icon: 'more_horiz', color: 'slate' },
    'PHÂN TÍCH & XUẤT': { icon: 'upload_file', color: 'amber' },
    'NGHIỆP VỤ THU CHI': { icon: 'payments', color: 'green' },
    'NGÂN HÀNG': { icon: 'account_balance', color: 'blue' },
    'KIỂM KÊ': { icon: 'fact_check', color: 'amber' },
    'BIÊN LAI': { icon: 'receipt', color: 'teal' },
    'DANH MỤC': { icon: 'category', color: 'slate' },
    'BÁO CÁO': { icon: 'bar_chart', color: 'indigo' },
    'PHIẾU CHI': { icon: 'output', color: 'red' },
    'NHẬP XUẤT KHO': { icon: 'warehouse', color: 'indigo' },
    'DANH MỤC & BÁO CÁO': { icon: 'inventory', color: 'slate' },
    'TÀI SẢN CỐ ĐỊNH': { icon: 'apartment', color: 'purple' },
    'CCDC': { icon: 'handyman', color: 'amber' },
    'TÀI SẢN HẠ TẦNG': { icon: 'location_city', color: 'teal' },
    'ĐẦU TƯ DÀI HẠN': { icon: 'trending_up', color: 'green' },
    'TỔNG QUAN': { icon: 'dashboard', color: 'blue' },
    'GIAO DỊCH': { icon: 'swap_horiz', color: 'green' },
    'HỒ SƠ CÁN BỘ': { icon: 'badge', color: 'blue' },
    'LƯƠNG & THU NHẬP': { icon: 'payments', color: 'green' },
    'HỢP ĐỒNG': { icon: 'handshake', color: 'purple' },
    'QUẢN LÝ': { icon: 'settings', color: 'amber' },
    'DỰ ÁN': { icon: 'architecture', color: 'indigo' },
    'THEO DÕI': { icon: 'analytics', color: 'teal' },
    'QUẢN TRỊ': { icon: 'admin_panel_settings', color: 'blue' },
    'KIỂM SOÁT': { icon: 'security', color: 'red' },
    'ĐƠN HÀNG': { icon: 'assignment', color: 'blue' },
    'HÓA ĐƠN': { icon: 'receipt', color: 'green' },
    'TRẢ HÀNG & THANH TOÁN': { icon: 'payments', color: 'amber' },
    'TRẢ HÀNG & THU TIỀN': { icon: 'credit_card', color: 'teal' },
    'CHỨNG TỪ': { icon: 'receipt_long', color: 'blue' },
};

// Tab titles mapping - Kế toán Doanh nghiệp
export const TAB_TITLES: Record<string, string> = {
    dashboard: 'Bàn làm việc',
    general: 'Kế toán Tổng hợp',
    report: 'Báo cáo Tài chính',
    cash: 'Quản lý Ngân quỹ',
    purchase: 'Mua hàng',
    sales: 'Bán hàng',
    revenue: 'Doanh thu',
    expense: 'Chi phí',
    inventory: 'Quản lý Kho',
    loan: 'Công nợ',
    asset: 'Tài sản Cố định',
    hr: 'Nhân sự & Tiền lương',
    contract: 'Quản lý Hợp đồng',
    project: 'Quản lý Dự án',
    dimension: 'Trung tâm Chi phí',
    system: 'Quản trị Hệ thống',
    tax: 'Thuế',
};

// Tab icons for contextual display
export const TAB_ICONS: Record<string, string> = {
    dashboard: 'dashboard',
    general: 'account_balance',
    report: 'summarize',
    cash: 'account_balance_wallet',
    purchase: 'shopping_cart',
    sales: 'storefront',
    revenue: 'trending_up',
    expense: 'shopping_cart',
    inventory: 'warehouse',
    loan: 'credit_card',
    asset: 'apartment',
    hr: 'groups',
    contract: 'handshake',
    project: 'architecture',
    dimension: 'pie_chart',
    system: 'settings',
    tax: 'receipt_long',
};

export const MENU_MAP: Record<string, MenuItem[]> = {
    'dashboard': [
        { id: 'dashboard', icon: 'dashboard', label: 'Bàn làm việc', keywords: ['home', 'trang chủ'] },
        { id: 'overdue_inv', icon: 'priority_high', label: 'Hóa đơn quá hạn', keywords: ['overdue', 'quá hạn'] },
        { id: 'incomplete_docs', icon: 'error_outline', label: 'Chứng từ lỗi', keywords: ['error', 'lỗi'] },
    ],
    'general': [
        // === CHỨNG TỪ TỔNG HỢP ===
        { id: 'voucher_list', icon: 'format_list_bulleted', label: 'Danh sách chứng từ', section: 'CHỨNG TỪ TỔNG HỢP', keywords: ['chứng từ', 'voucher'] },

        // === QUY TRÌNH CUỐI KỲ ===
        { id: 'allocation', icon: 'percent', label: '1. Phân bổ chi phí', section: 'QUY TRÌNH CUỐI KỲ', keywords: ['phân bổ chi phí', 'allocation'] },
        { id: 'revaluation', icon: 'currency_exchange', label: '2. Đánh giá lại Đ/G', section: 'QUY TRÌNH CUỐI KỲ', keywords: ['đánh giá lại', 'revaluation', 'tỷ giá'] },
        { id: 'check', icon: 'fact_check', label: '3. Kiểm tra đối chiếu', section: 'QUY TRÌNH CUỐI KỲ', keywords: ['kiểm tra', 'đối chiếu', 'check'] },
        { id: 'closing', icon: 'published_with_changes', label: '4. Kết chuyển cuối kỳ', section: 'QUY TRÌNH CUỐI KỲ', keywords: ['kết chuyển', 'closing'] },
        { id: 'locking', icon: 'lock', label: '5. Khóa sổ kế toán', section: 'QUY TRÌNH CUỐI KỲ', keywords: ['khóa sổ', 'lock'] },

        // === DANH MỤC & THIẾT LẬP ===
        { id: 'account_list', icon: 'account_tree', label: 'Hệ thống Tài khoản', section: 'DANH MỤC & THIẾT LẬP', keywords: ['tài khoản', 'account', 'chart'] },
        { id: 'opening_balance', icon: 'account_balance_wallet', label: 'Số dư đầu kỳ', section: 'DANH MỤC & THIẾT LẬP', keywords: ['số dư', 'đầu kỳ', 'opening'] },
        { id: 'cost_item', icon: 'category', label: 'Khoản mục Chi phí', section: 'DANH MỤC & THIẾT LẬP', keywords: ['khoản mục', 'chi phí', 'cost'] },
        { id: 'cost_revenue', icon: 'trending_up', label: 'Khoản mục Thu', section: 'DANH MỤC & THIẾT LẬP', keywords: ['khoản mục', 'thu', 'revenue'] },
    ],
    'report': [
        // === BÁO CÁO TÀI CHÍNH DOANH NGHIỆP (TT 99/2025) ===
        { id: 'balance_sheet_dn', icon: 'analytics', label: 'Bảng Cân đối Kế toán (B01-DN)', section: 'BÁO CÁO TÀI CHÍNH', keywords: ['cân đối', 'balance sheet', 'B01'] },
        { id: 'profit_loss', icon: 'summarize', label: 'Báo cáo Kết quả Kinh doanh (B02-DN)', section: 'BÁO CÁO TÀI CHÍNH', keywords: ['kết quả', 'kinh doanh', 'profit', 'loss', 'B02'] },
        { id: 'cash_flow_dn', icon: 'account_balance_wallet', label: 'Báo cáo Lưu chuyển Tiền tệ (B03-DN)', section: 'BÁO CÁO TÀI CHÍNH', keywords: ['lưu chuyển', 'tiền tệ', 'cash flow', 'B03'] },
        { id: 'notes_fs', icon: 'description', label: 'Thuyết minh BCTC (B09-DN)', section: 'BÁO CÁO TÀI CHÍNH', keywords: ['thuyết minh', 'notes', 'B09'] },

        // === BÁO CÁO PHÂN TÍCH ===
        { id: 'budget_performance', icon: 'timeline', label: 'Thực hiện Kế hoạch/Ngân sách', section: 'BÁO CÁO PHÂN TÍCH', keywords: ['thực hiện', 'kế hoạch', 'ngân sách'] },
        { id: 'profitability_analysis', icon: 'insights', label: 'Phân tích Lợi nhuận', section: 'BÁO CÁO PHÂN TÍCH', keywords: ['phân tích', 'lợi nhuận'] },
        { id: 'cost_analysis', icon: 'pie_chart', label: 'Phân tích Chi phí', section: 'BÁO CÁO PHÂN TÍCH', keywords: ['phân tích', 'chi phí'] },

        // === SỔ KẾ TOÁN ===
        { id: 'trial_balance', icon: 'balance', label: 'Bảng Cân đối Tài khoản', section: 'SỔ KẾ TOÁN', keywords: ['cân đối', 'trial balance'] },
        { id: 'ledger', icon: 'history_edu', label: 'Sổ Nhật ký chung', section: 'SỔ KẾ TOÁN', keywords: ['nhật ký', 'journal'] },
        { id: 'general_ledger', icon: 'menu_book', label: 'Sổ Cái', section: 'SỔ KẾ TOÁN', keywords: ['sổ cái', 'ledger'] },
        { id: 'cash_book', icon: 'account_balance_wallet', label: 'Sổ Quỹ Tiền mặt', section: 'SỔ KẾ TOÁN', keywords: ['quỹ', 'tiền mặt'] },
        { id: 'bank_book', icon: 'account_balance', label: 'Sổ Tiền gửi Ngân hàng', section: 'SỔ KẾ TOÁN', keywords: ['ngân hàng', 'tiền gửi'] },

        // === SỔ CHI TIẾT ===
        { id: 'inventory_summary', icon: 'inventory', label: 'Tổng hợp Vật tư, Công cụ', section: 'SỔ CHI TIẾT', keywords: ['vật tư', 'công cụ'] },
        { id: 'inventory_ledger', icon: 'inventory_2', label: 'Sổ chi tiết Vật tư', section: 'SỔ CHI TIẾT', keywords: ['chi tiết', 'vật tư'] },
        { id: 'debt_ledger', icon: 'account_balance_wallet', label: 'Sổ chi tiết Công nợ', section: 'SỔ CHI TIẾT', keywords: ['công nợ', 'debt', 'phải thu', 'phải trả'] },

        // === BÁO CÁO KHÁC ===
        { id: 'transaction_details', icon: 'list_alt', label: 'Chi tiết Bút toán', section: 'KHÁC', keywords: ['bút toán', 'transaction'] },
        { id: 'custom_report', icon: 'dashboard_customize', label: 'Báo cáo Tùy biến', section: 'KHÁC', keywords: ['tùy biến', 'custom'] },

        // === PHÂN TÍCH & XUẤT ===
        { id: 'financial_analysis', icon: 'assessment', label: 'Phân tích Tài chính', section: 'PHÂN TÍCH & XUẤT', keywords: ['phân tích', 'analysis'] },
        { id: 'xml_export', icon: 'upload_file', label: 'Xuất XML (CSDL QG)', section: 'PHÂN TÍCH & XUẤT', keywords: ['XML', 'export', 'CSDL'] },
    ],
    'cash': [
        { id: 'cash_receipt', icon: 'payments', label: 'Phiếu thu', section: 'NGHIỆP VỤ THU CHI', keywords: ['phiếu thu', 'receipt'] },
        { id: 'cash_payment', icon: 'output', label: 'Phiếu chi', section: 'NGHIỆP VỤ THU CHI', keywords: ['phiếu chi', 'payment'] },
        { id: 'cash_bank_in', icon: 'account_balance', label: 'Giấy báo có', section: 'NGÂN HÀNG', keywords: ['báo có', 'bank in'] },
        { id: 'cash_bank_out', icon: 'money_off', label: 'Giấy báo nợ', section: 'NGÂN HÀNG', keywords: ['báo nợ', 'bank out'] },
        { id: 'cash_bank_sync', icon: 'sync_alt', label: 'Đối soát Ngân hàng', section: 'NGÂN HÀNG', keywords: ['đối soát', 'reconcile'] },
        { id: 'cash_bank_config', icon: 'settings_input_component', label: 'Kết nối Ngân hàng', section: 'NGÂN HÀNG', keywords: ['kết nối', 'config'] },
        { id: 'cash_inventory', icon: 'currency_exchange', label: 'Kiểm kê quỹ', section: 'KIỂM KÊ', keywords: ['kiểm kê', 'inventory'] },
    ],
    'purchase': [
        // === ĐƠN HÀNG & HÓA ĐƠN ===
        { id: 'purchase_request', icon: 'edit_note', label: 'Đề xuất Mua hàng', section: 'ĐƠN HÀNG', keywords: ['đề xuất', 'request'] },
        { id: 'purchase_order', icon: 'assignment', label: 'Đơn đặt hàng', section: 'ĐƠN HÀNG', keywords: ['đơn hàng', 'order', 'PO'] },
        { id: 'purchase_invoice', icon: 'receipt', label: 'Hóa đơn Mua hàng', section: 'HÓA ĐƠN', keywords: ['hóa đơn', 'invoice'] },
        { id: 'purchase_service', icon: 'receipt_long', label: 'Hóa đơn Dịch vụ', section: 'HÓA ĐƠN', keywords: ['dịch vụ', 'service'] },
        // === TRẢ HÀNG & THANH TOÁN ===
        { id: 'purchase_return', icon: 'keyboard_return', label: 'Trả hàng NCC', section: 'TRẢ HÀNG & THANH TOÁN', keywords: ['trả hàng', 'return'] },
        { id: 'purchase_payment', icon: 'payments', label: 'Thanh toán NCC', section: 'TRẢ HÀNG & THANH TOÁN', keywords: ['thanh toán', 'payment'] },
        // === DANH MỤC & BÁO CÁO ===
        { id: 'vendor_list', icon: 'groups', label: 'Nhà cung cấp', section: 'DANH MỤC & BÁO CÁO', keywords: ['nhà cung cấp', 'vendor', 'NCC'] },
        { id: 'purchase_report', icon: 'bar_chart', label: 'Báo cáo Mua hàng', section: 'DANH MỤC & BÁO CÁO', keywords: ['báo cáo', 'report'] },
    ],
    'sales': [
        // === ĐƠN HÀNG ===
        { id: 'sales_order', icon: 'shopping_cart', label: 'Đơn hàng bán', section: 'ĐƠN HÀNG', keywords: ['đơn hàng', 'order', 'SO'] },
        { id: 'sales_delivery', icon: 'local_shipping', label: 'Giao hàng', section: 'ĐƠN HÀNG', keywords: ['giao hàng', 'delivery'] },
        // === HÓA ĐƠN ===
        { id: 'sales_invoice', icon: 'receipt', label: 'Hóa đơn Bán hàng', section: 'HÓA ĐƠN', keywords: ['hóa đơn', 'invoice', 'GTGT'] },
        { id: 'sales_service', icon: 'receipt_long', label: 'Hóa đơn Dịch vụ', section: 'HÓA ĐƠN', keywords: ['dịch vụ', 'service'] },
        // === TRẢ HÀNG & THU TIỀN ===
        { id: 'sales_return', icon: 'undo', label: 'Trả hàng', section: 'TRẢ HÀNG & THU TIỀN', keywords: ['trả hàng', 'return'] },
        { id: 'sales_payment', icon: 'payments', label: 'Thu tiền KH', section: 'TRẢ HÀNG & THU TIỀN', keywords: ['thu tiền', 'payment'] },
        // === DANH MỤC & BÁO CÁO ===
        { id: 'customer_list', icon: 'group', label: 'Khách hàng', section: 'DANH MỤC & BÁO CÁO', keywords: ['khách hàng', 'customer', 'KH'] },
        { id: 'sales_report', icon: 'bar_chart', label: 'Báo cáo Bán hàng', section: 'DANH MỤC & BÁO CÁO', keywords: ['báo cáo', 'report'] },
    ],
    'revenue': [
        { id: 'revenue_invoice', icon: 'receipt', label: 'Hóa đơn Bán hàng', section: 'CHỨNG TỪ', keywords: ['hóa đơn', 'bán hàng', 'invoice'] },
        { id: 'revenue_receipt', icon: 'payments', label: 'Phiếu Thu tiền', section: 'CHỨNG TỪ', keywords: ['phiếu thu', 'payment'] },
        { id: 'revenue_reduction', icon: 'remove_circle', label: 'Giảm trừ Doanh thu', section: 'CHỨNG TỪ', keywords: ['giảm trừ', 'reduction'] },
        { id: 'revenue_categories', icon: 'category', label: 'Danh mục Loại doanh thu', section: 'DANH MỤC', keywords: ['loại doanh thu', 'category'] },
        { id: 'revenue_customer', icon: 'people', label: 'Danh sách Khách hàng', section: 'DANH MỤC', keywords: ['khách hàng', 'customer'] },
        { id: 'revenue_report', icon: 'bar_chart', label: 'Báo cáo Doanh thu', section: 'BÁO CÁO', keywords: ['báo cáo', 'doanh thu', 'report'] },
        { id: 'revenue_budget', icon: 'compare_arrows', label: 'So sánh Kế hoạch/Thực hiện', section: 'BÁO CÁO', keywords: ['so sánh', 'kế hoạch'] },
    ],
    'expense': [
        { id: 'expense_invoice', icon: 'receipt_long', label: 'Hóa đơn Mua hàng', section: 'CHỨNG TỪ', keywords: ['hóa đơn', 'mua hàng', 'invoice'] },
        { id: 'expense_voucher', icon: 'output', label: 'Phiếu chi', section: 'CHỨNG TỪ', keywords: ['phiếu chi', 'voucher'] },
        { id: 'expense_payment', icon: 'payments', label: 'Ủy nhiệm chi', section: 'CHỨNG TỪ', keywords: ['ủy nhiệm chi', 'UNC'] },
        { id: 'expense_categories', icon: 'category', label: 'Danh mục Khoản mục chi phí', section: 'DANH MỤC', keywords: ['khoản mục', 'chi phí', 'category'] },
        { id: 'expense_supplier', icon: 'people', label: 'Danh sách Nhà cung cấp', section: 'DANH MỤC', keywords: ['nhà cung cấp', 'supplier'] },
        { id: 'expense_report', icon: 'bar_chart', label: 'Báo cáo Chi phí', section: 'BÁO CÁO', keywords: ['báo cáo', 'chi phí', 'report'] },
        { id: 'expense_budget', icon: 'compare_arrows', label: 'So sánh Kế hoạch Chi', section: 'BÁO CÁO', keywords: ['so sánh', 'kế hoạch'] },
    ],
    'inventory': [
        { id: 'inventory_receipt', icon: 'inventory_2', label: 'Nhập kho', section: 'NHẬP XUẤT KHO', keywords: ['nhập kho', 'receipt'] },
        { id: 'inventory_issue', icon: 'output', label: 'Xuất kho', section: 'NHẬP XUẤT KHO', keywords: ['xuất kho', 'issue'] },
        { id: 'inventory_transfer', icon: 'sync_alt', label: 'Điều chuyển kho', section: 'NHẬP XUẤT KHO', keywords: ['điều chuyển', 'transfer'] },
        { id: 'inventory_items', icon: 'category', label: 'Danh mục Vật tư', section: 'DANH MỤC & BÁO CÁO', keywords: ['vật tư', 'items'] },
        { id: 'inventory_status', icon: 'inventory', label: 'Tổng hợp Tồn kho', section: 'DANH MỤC & BÁO CÁO', keywords: ['tồn kho', 'status'] },
        { id: 'inventory_card', icon: 'list_alt', label: 'Thẻ kho', section: 'DANH MỤC & BÁO CÁO', keywords: ['thẻ kho', 'card'] },
    ],
    'tax': [
        { id: 'tax_vat', icon: 'assignment_turned_in', label: 'Tờ khai GTGT', section: 'BÁO CÁO THUẾ', keywords: ['GTGT', 'VAT'] },
        { id: 'tax_pit', icon: 'request_quote', label: 'Quyết toán TNCN', section: 'BÁO CÁO THUẾ', keywords: ['TNCN', 'PIT'] },
        { id: 'tax_cit', icon: 'corporate_fare', label: 'Quyết toán TNDN', section: 'BÁO CÁO THUẾ', keywords: ['TNDN', 'CIT'] },
        { id: 'tax_lookup', icon: 'search_check', label: 'Tra cứu MST', section: 'TRA CỨU', keywords: ['MST', 'tra cứu'] },
        { id: 'tax_check', icon: 'health_and_safety', label: 'Kiểm tra Sức khỏe', section: 'TRA CỨU', keywords: ['kiểm tra', 'health'] },
        { id: 'tax_provider-config', icon: 'settings', label: 'Cấu hình NCC HĐĐT', section: 'HÓA ĐƠN ĐIỆN TỬ', keywords: ['cấu hình', 'provider', 'HĐĐT'] },
        { id: 'tax_invoice-sync', icon: 'sync', label: 'Đồng bộ HĐĐT', section: 'HÓA ĐƠN ĐIỆN TỬ', keywords: ['đồng bộ', 'sync', 'HĐĐT'] },
        { id: 'tax_invoice-lookup', icon: 'manage_search', label: 'Tra cứu HĐĐT', section: 'HÓA ĐƠN ĐIỆN TỬ', keywords: ['tra cứu', 'lookup', 'HĐĐT'] },
        { id: 'tax_invoice-match', icon: 'compare_arrows', label: 'Khớp HĐ - Chứng từ', section: 'HÓA ĐƠN ĐIỆN TỬ', keywords: ['khớp', 'match', 'chứng từ'] },
    ],
    'loan': [
        { id: 'loan_temp_advances', icon: 'account_balance_wallet', label: 'Tạm ứng (TK 141)', keywords: ['tạm ứng', '141'] },
        { id: 'loan_receivables', icon: 'payments', label: 'Công nợ phải thu (TK 131, 136, 138)', keywords: ['phải thu', '131', '136', '138'] },
        { id: 'loan_payables', icon: 'receipt_long', label: 'Công nợ phải trả (TK 331, 334, 338)', keywords: ['phải trả', '331', '334', '338'] },
    ],
    'asset': [
        { id: 'asset_fixed_list', icon: 'list_alt', label: 'Danh mục TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', keywords: ['TSCĐ', 'danh mục'] },
        { id: 'asset_fixed_increase', icon: 'add_business', label: 'Ghi tăng TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', keywords: ['ghi tăng', 'increase'] },
        { id: 'asset_fixed_decrease', icon: 'domain_disabled', label: 'Ghi giảm TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', keywords: ['ghi giảm', 'decrease'] },
        { id: 'asset_depreciation', icon: 'trending_down', label: 'Tính khấu hao TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', keywords: ['khấu hao', 'depreciation'] },
        { id: 'asset_revaluation', icon: 'assessment', label: 'Đánh giá lại TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', keywords: ['đánh giá lại', 'revaluation'] },
        { id: 'asset_transfer', icon: 'swap_horiz', label: 'Điều chuyển TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', keywords: ['điều chuyển', 'transfer'] },
        { id: 'asset_inventory', icon: 'fact_check', label: 'Kiểm kê TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', keywords: ['kiểm kê', 'inventory'] },
        { id: 'asset_ccdc', icon: 'handyman', label: 'Công cụ Dụng cụ', section: 'CCDC', keywords: ['CCDC', 'công cụ'] },
        { id: 'infra_list', icon: 'location_city', label: 'Danh sách Hạ tầng', section: 'TÀI SẢN HẠ TẦNG', keywords: ['hạ tầng', 'infra'] },
        { id: 'infra_register', icon: 'add_location', label: 'Ghi nhận Hạ tầng mới', section: 'TÀI SẢN HẠ TẦNG', keywords: ['ghi nhận', 'register'] },
        { id: 'infra_maintenance', icon: 'build', label: 'Bảo trì & Sửa chữa', section: 'TÀI SẢN HẠ TẦNG', keywords: ['bảo trì', 'maintenance'] },
        { id: 'infra_condition', icon: 'health_and_safety', label: 'Đánh giá Tình trạng', section: 'TÀI SẢN HẠ TẦNG', keywords: ['tình trạng', 'condition'] },
        { id: 'infra_report', icon: 'summarize', label: 'Báo cáo Hạ tầng', section: 'TÀI SẢN HẠ TẦNG', keywords: ['báo cáo'] },
        { id: 'invest_list', icon: 'account_balance', label: 'Khoản Đầu tư Dài hạn', section: 'ĐẦU TƯ DÀI HẠN', keywords: ['đầu tư', 'investment'] },
        { id: 'invest_income', icon: 'payments', label: 'Thu nhập Đầu tư', section: 'ĐẦU TƯ DÀI HẠN', keywords: ['thu nhập', 'income'] },
        { id: 'asset_report_summary', icon: 'pie_chart', label: 'Tổng hợp Tài sản', section: 'BÁO CÁO', keywords: ['tổng hợp', 'summary'] },
        { id: 'asset_report_source', icon: 'account_tree', label: 'Tài sản theo Nguồn vốn', section: 'BÁO CÁO', keywords: ['nguồn vốn', 'source'] },
    ],
    'hr': [
        { id: 'hr_employees', icon: 'person_add', label: 'Cán bộ - Viên chức', section: 'HỒ SƠ CÁN BỘ', keywords: ['cán bộ', 'viên chức', 'employee'] },
        { id: 'hr_contracts', icon: 'history_edu', label: 'Hợp đồng & Quyết định', section: 'HỒ SƠ CÁN BỘ', keywords: ['hợp đồng', 'contract'] },
        { id: 'hr_salary_process', icon: 'trending_up', label: 'Quá trình Lương', section: 'HỒ SƠ CÁN BỘ', keywords: ['lương', 'salary'] },
        { id: 'hr_allowance_list', icon: 'list_alt', label: 'Danh mục Phụ cấp', section: 'HỒ SƠ CÁN BỘ', keywords: ['phụ cấp', 'allowance'] },
        { id: 'hr_timesheet', icon: 'event_available', label: 'Bảng chấm công', section: 'LƯƠNG & THU NHẬP', keywords: ['chấm công', 'timesheet'] },
        { id: 'hr_payroll', icon: 'payments', label: 'Tính Lương & Phụ cấp', section: 'LƯƠNG & THU NHẬP', keywords: ['tính lương', 'payroll'] },
        { id: 'hr_insurance', icon: 'health_and_safety', label: 'Bảo hiểm & Khấu trừ', section: 'LƯƠNG & THU NHẬP', keywords: ['bảo hiểm', 'insurance'] },
        { id: 'hr_tax', icon: 'account_balance', label: 'Thuế TNCN', section: 'LƯƠNG & THU NHẬP', keywords: ['thuế', 'TNCN', 'tax'] },
        { id: 'hr_report_salary', icon: 'summarize', label: 'Bảng thanh toán lương', section: 'BÁO CÁO', keywords: ['thanh toán', 'report'] },
        { id: 'hr_report_insurance', icon: 'description', label: 'Báo cáo Bảo hiểm', section: 'BÁO CÁO', keywords: ['báo cáo', 'insurance report'] },
    ],
    'contract': [
        { id: 'contract_sales', icon: 'contract', label: 'Hợp đồng Bán ra', section: 'HỢP ĐỒNG', keywords: ['bán ra', 'sales'] },
        { id: 'contract_purchase', icon: 'assignment', label: 'Hợp đồng Mua vào', section: 'HỢP ĐỒNG', keywords: ['mua vào', 'purchase'] },
        { id: 'contract_appendix', icon: 'edit_note', label: 'Phụ lục Hợp đồng', section: 'HỢP ĐỒNG', keywords: ['phụ lục', 'appendix'] },
        { id: 'contract_tracking', icon: 'pending_actions', label: 'Theo dõi Thanh toán', section: 'QUẢN LÝ', keywords: ['theo dõi', 'tracking'] },
        { id: 'contract_liquidation', icon: 'check_circle', label: 'Thanh lý Hợp đồng', section: 'QUẢN LÝ', keywords: ['thanh lý', 'liquidation'] },
        { id: 'contract_warning', icon: 'notifications', label: 'Cảnh báo Hết hạn', section: 'QUẢN LÝ', keywords: ['cảnh báo', 'warning'] },
        { id: 'contract_report', icon: 'analytics', label: 'Báo cáo Hợp đồng', section: 'BÁO CÁO', keywords: ['báo cáo', 'report'] },
    ],
    'project': [
        { id: 'project_list', icon: 'list_alt', label: 'Danh sách Dự án', section: 'DỰ ÁN', keywords: ['danh sách', 'list'] },
        { id: 'project_tracking', icon: 'analytics', label: 'Tiến độ Thực hiện', section: 'THEO DÕI', keywords: ['tiến độ', 'tracking'] },
        { id: 'project_budget', icon: 'attach_money', label: 'Ngân sách & Chi phí', section: 'THEO DÕI', keywords: ['ngân sách', 'budget'] },
        { id: 'project_report', icon: 'summarize', label: 'Báo cáo Tổng hợp', section: 'BÁO CÁO', keywords: ['báo cáo', 'report'] },
    ],
    'dimension': [
        { id: 'dim_list', icon: 'list', label: 'Danh sách Mã TK', section: 'DANH MỤC', keywords: ['mã', 'thống kê'] },
        { id: 'dim_config', icon: 'settings_suggest', label: 'Cấu hình Loại TK', section: 'DANH MỤC', keywords: ['cấu hình', 'config'] },
        { id: 'dim_group', icon: 'group_work', label: 'Nhóm Mã thống kê', section: 'DANH MỤC', keywords: ['nhóm', 'group'] },
        { id: 'dim_report', icon: 'pivot_table_chart', label: 'Báo cáo Đa chiều', section: 'BÁO CÁO', keywords: ['đa chiều', 'pivot'] },
    ],
    'system': [
        { id: 'sys_params', icon: 'settings', label: 'Tham số hệ thống', section: 'QUẢN TRỊ', keywords: ['tham số', 'params'] },
        { id: 'sys_users', icon: 'manage_accounts', label: 'Quản lý người dùng', section: 'QUẢN TRỊ', keywords: ['người dùng', 'users'] },
        { id: 'sys_perms', icon: 'security', label: 'Phân quyền', section: 'QUẢN TRỊ', keywords: ['phân quyền', 'permission'] },
        { id: 'sys_backup', icon: 'backup', label: 'Sao lưu dữ liệu', section: 'QUẢN TRỊ', keywords: ['sao lưu', 'backup'] },
        { id: 'sys_audit_trail', icon: 'history_edu', label: 'Nhật ký Kiểm toán', section: 'KIỂM SOÁT', keywords: ['kiểm toán', 'audit'] },
        { id: 'sys_logs', icon: 'history', label: 'Nhật ký truy cập', section: 'KIỂM SOÁT', keywords: ['nhật ký', 'logs'] },
    ],
};

// Helper to get unique sections from a menu
export const getSections = (tab: string): string[] => {
    const items = MENU_MAP[tab] || [];
    const sections = new Set<string>();
    items.forEach(item => {
        if (item.section) sections.add(item.section);
    });
    return Array.from(sections);
};

// Helper to search across all menus
export const searchMenuItems = (query: string, tab?: string): MenuItem[] => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    const results: MenuItem[] = [];
    const menus = tab ? { [tab]: MENU_MAP[tab] } : MENU_MAP;

    Object.values(menus).forEach(items => {
        if (!items) return;
        items.forEach(item => {
            const matchLabel = item.label.toLowerCase().includes(normalizedQuery);
            const matchKeywords = item.keywords?.some(k => k.toLowerCase().includes(normalizedQuery));
            const matchId = item.id.toLowerCase().includes(normalizedQuery);
            if (matchLabel || matchKeywords || matchId) {
                results.push(item);
            }
        });
    });

    return results;
};
