import React, { useState, useEffect } from 'react';
import { reminderService } from '../api';

interface SidebarProps {
    activeTab: string;
    onNavigate?: (view: string) => void; // Optional handler for later
    isMobileOpen?: boolean; // Mobile sidebar visibility state
    onMobileClose?: () => void; // Close mobile sidebar
}

type MenuItem = {
    icon: string;
    label: string;
    id?: string; // Unique ID for navigation
    href?: string;
    count?: number; // Optional usage count to simulate "popularity"
    section?: string; // Optional section header
};

const MENU_MAP: Record<string, MenuItem[]> = {
    'dashboard': [
        { id: 'dashboard', icon: 'dashboard', label: 'Bàn làm việc', count: 100 },
        { id: 'overdue_inv', icon: 'priority_high', label: 'Hóa đơn quá hạn', count: 80 },
        { id: 'incomplete_docs', icon: 'error_outline', label: 'Chứng từ lỗi', count: 70 },
    ],
    'general': [
        // === DỰ TOÁN & NGÂN SÁCH ===
        { id: 'fund_list', icon: 'account_balance', label: 'Nguồn kinh phí', section: 'DỰ TOÁN & NGÂN SÁCH', count: 100 },
        { id: 'fund_budget', icon: 'edit_note', label: 'Lập dự toán', section: 'DỰ TOÁN & NGÂN SÁCH', count: 95 },
        { id: 'fund_allocation', icon: 'call_split', label: 'Phân bổ dự toán', section: 'DỰ TOÁN & NGÂN SÁCH', count: 90 },
        { id: 'fund_adjustment', icon: 'tune', label: 'Điều chỉnh dự toán', section: 'DỰ TOÁN & NGÂN SÁCH', count: 80 },
        { id: 'fund_off_balance', icon: 'visibility_off', label: 'TK Ngoài bảng (008)', section: 'DỰ TOÁN & NGÂN SÁCH', count: 70 },

        // === CHỨNG TỪ TỔNG HỢP ===
        { id: 'voucher_list', icon: 'format_list_bulleted', label: 'Danh sách chứng từ', section: 'CHỨNG TỪ TỔNG HỢP', count: 100 },

        // === QUY TRÌNH CUỐI KỲ ===
        { id: 'allocation', icon: 'percent', label: '1. Phân bổ chi phí', section: 'QUY TRÌNH CUỐI KỲ', count: 60 },
        { id: 'revaluation', icon: 'currency_exchange', label: '2. Đánh giá lại Đ/G', section: 'QUY TRÌNH CUỐI KỲ', count: 50 },
        { id: 'check', icon: 'fact_check', label: '3. Kiểm tra đối chiếu', section: 'QUY TRÌNH CUỐI KỲ', count: 80 },
        { id: 'closing', icon: 'published_with_changes', label: '4. Kết chuyển cuối kỳ', section: 'QUY TRÌNH CUỐI KỲ', count: 90 },
        { id: 'locking', icon: 'lock', label: '5. Khóa sổ kế toán', section: 'QUY TRÌNH CUỐI KỲ', count: 70 },

        // === DANH MỤC & THIẾT LẬP ===
        { id: 'account_list', icon: 'account_tree', label: 'Hệ thống Tài khoản', section: 'DANH MỤC & THIẾT LẬP', count: 60 },
        { id: 'opening_balance', icon: 'account_balance_wallet', label: 'Số dư đầu kỳ', section: 'DANH MỤC & THIẾT LẬP', count: 50 },
        { id: 'cost_item', icon: 'category', label: 'Khoản mục Chi phí', section: 'DANH MỤC & THIẾT LẬP', count: 40 },
        { id: 'cost_revenue', icon: 'trending_up', label: 'Khoản mục Thu', section: 'DANH MỤC & THIẾT LẬP', count: 35 },
    ],
    'report': [  // Keep as 'report' (singular) to match activeTab
        // === BÁO CÁO TÀI CHÍNH HCSN (TT 24/2024) ===
        { id: 'balance_sheet_hcsn', icon: 'analytics', label: 'Bảng Cân đối Tài khoản KT', section: 'BÁO CÁO TÀI CHÍNH HCSN', count: 100 },
        { id: 'activity_result', icon: 'summarize', label: 'Báo cáo Kết quả Hoạt động', section: 'BÁO CÁO TÀI CHÍNH HCSN', count: 90 },
        { id: 'cash_flow', icon: 'account_balance_wallet', label: 'Báo cáo Lưu chuyển Tiền tệ', section: 'BÁO CÁO TÀI CHÍNH HCSN', count: 85 },

        // === BÁO CÁO QUYẾT TOÁN (MỚI - TT 24/2024) ===
        { id: 'budget_settlement_regular', icon: 'receipt_long', label: 'QT Kinh phí HĐ Thường xuyên', section: 'BÁO CÁO QUYẾT TOÁN', count: 95 },
        { id: 'budget_settlement_nonregular', icon: 'description', label: 'QT Kinh phí HĐ Không thường xuyên', section: 'BÁO CÁO QUYẾT TOÁN', count: 80 },
        { id: 'budget_settlement_capex', icon: 'construction', label: 'QT Kinh phí Đầu tư XDCB', section: 'BÁO CÁO QUYẾT TOÁN', count: 75 },
        { id: 'budget_performance', icon: 'timeline', label: 'Tình hình Thực hiện Dự toán', section: 'BÁO CÁO QUYẾT TOÁN', count: 85 },

        // === BÁO CÁO QUẢN LÝ HCSN (MỚI - TT 24/2024) ===
        { id: 'fund_source_report', icon: 'account_balance', label: 'Quản lý và Sử dụng Kinh phí', section: 'BÁO CÁO QUẢN LÝ', count: 90 },
        { id: 'infrastructure_report', icon: 'location_city', label: 'Tài sản Kết cấu Hạ tầng', section: 'BÁO CÁO QUẢN LÝ', count: 70 },

        // === SỔ KẾ TOÁN ===
        { id: 'trial_balance', icon: 'balance', label: 'Bảng Cân đối Tài khoản', section: 'SỔ KẾ TOÁN', count: 95 },
        { id: 'ledger', icon: 'history_edu', label: 'Sổ Nhật ký chung', section: 'SỔ KẾ TOÁN', count: 80 },
        { id: 'general_ledger', icon: 'menu_book', label: 'Sổ Cái', section: 'SỔ KẾ TOÁN', count: 75 },
        { id: 'cash_book', icon: 'account_balance_wallet', label: 'Sổ Quỹ Tiền mặt', section: 'SỔ KẾ TOÁN', count: 60 },
        { id: 'bank_book', icon: 'account_balance', label: 'Sổ Tiền gửi Ngân hàng', section: 'SỔ KẾ TOÁN', count: 55 },

        // === SỔ CHI TIẾT ===
        { id: 'inventory_summary', icon: 'inventory', label: 'Tổng hợp Vật tư, Công cụ', section: 'SỔ CHI TIẾT', count: 50 },
        { id: 'inventory_ledger', icon: 'inventory_2', label: 'Sổ chi tiết Vật tư', section: 'SỔ CHI TIẾT', count: 45 },

        // === BÁO CÁO KHÁC ===
        { id: 'transaction_details', icon: 'list_alt', label: 'Chi tiết Bút toán', section: 'KHÁC', count: 65 },
        { id: 'custom_report', icon: 'dashboard_customize', label: 'Báo cáo Tùy biến', section: 'KHÁC', count: 60 },

        // === LOẠI BỎ: Báo cáo DN không dùng cho HCSN ===
        // REMOVED: balance_sheet (DN)
        // REMOVED: pnl (DN)
        // REMOVED: debt_ledger (DN - HCSN không theo dõi công nợ như DN)
        // REMOVED: vat_in (HCSN không nộp VAT)
        // REMOVED: vat_out (HCSN không nộp VAT)
        // REMOVED: project_pnl (DN - Lãi lỗ theo dự án)
        // REMOVED: expense_dept (DN - Phân tích chi phí)
    ],
    'cash': [
        // === NGHIỆP VỤ THU CHI ===
        { id: 'cash_receipt', icon: 'payments', label: 'Phiếu thu', section: 'NGHIỆP VỤ THU CHI', count: 90 },
        { id: 'cash_payment', icon: 'output', label: 'Phiếu chi', section: 'NGHIỆP VỤ THU CHI', count: 85 },

        // === NGÂN HÀNG ===
        { id: 'cash_bank_in', icon: 'account_balance', label: 'Giấy báo có', section: 'NGÂN HÀNG', count: 70 },
        { id: 'cash_bank_out', icon: 'money_off', label: 'Giấy báo nợ', section: 'NGÂN HÀNG', count: 65 },
        { id: 'cash_bank_sync', icon: 'sync_alt', label: 'Đối soát Ngân hàng', section: 'NGÂN HÀNG', count: 80 },
        { id: 'cash_bank_config', icon: 'settings_input_component', label: 'Kết nối Ngân hàng', section: 'NGÂN HÀNG', count: 60 },

        // === KIỂM KÊ ===
        { id: 'cash_inventory', icon: 'currency_exchange', label: 'Kiểm kê quỹ', section: 'KIỂM KÊ', count: 40 },
    ],
    'revenue': [  // Sales → Thu sự nghiệp (HCSN)
        // === HOẠT ĐỘNG SỰ NGHIỆP ===
        { id: 'revenue_receipt', icon: 'receipt', label: 'Biên lai Thu tiền', section: 'BIÊN LAI', count: 100 },
        { id: 'revenue_payment', icon: 'payments', label: 'Phiếu Thu tiền', section: 'BIÊN LAI', count: 90 },
        { id: 'revenue_reduction', icon: 'remove_circle', label: 'Giảm trừ Thu SN', section: 'BIÊN LAI', count: 40 },

        // === DANH MỤC ===
        { id: 'revenue_categories', icon: 'category', label: 'Danh mục Loại thu', section: 'DANH MỤC', count: 85 },
        { id: 'revenue_payer', icon: 'people', label: 'Đối tượng Nộp tiền', section: 'DANH MỤC', count: 95 },

        // === BÁO CÁO ===
        { id: 'revenue_report', icon: 'bar_chart', label: 'Báo cáo Thu SN', section: 'BÁO CÁO', count: 75 },
        { id: 'revenue_budget', icon: 'compare_arrows', label: 'So sánh Dự toán/Thực hiện', section: 'BÁO CÁO', count: 70 },

        // === LOẠI BỎ: DN Terminology ===
        // REMOVED: sales_invoice → revenue_service
        // REMOVED: sales_order → revenue_order
        // REMOVED: sales_return (HCSN không có "hàng bán trả lại")
        // REMOVED: sales_payment → revenue_receipt
        // REMOVED: sales_customer → revenue_partner (đổi tên)
    ],
    'expense': [  // Purchase → Mua sắm & Chi (HCSN)
        // === PHIẾU CHI ===
        { id: 'expense_voucher', icon: 'receipt_long', label: 'Phiếu chi', section: 'PHIẾU CHI', count: 100 },
        { id: 'expense_payment', icon: 'payments', label: 'Ủy nhiệm chi', section: 'PHIẾU CHI', count: 90 },
        { id: 'expense_reduction', icon: 'remove_circle', label: 'Giảm trừ chi', section: 'PHIẾU CHI', count: 40 },


        // === DANH MỤC ===
        { id: 'expense_categories', icon: 'category', label: 'Danh mục Khoản mục chi', section: 'DANH MỤC', count: 85 },
        { id: 'expense_payee', icon: 'people', label: 'Đối tượng Chi', section: 'DANH MỤC', count: 95 },

        // === BÁO CÁO ===
        { id: 'expense_report', icon: 'bar_chart', label: 'Báo cáo Chi SN', section: 'BÁO CÁO', count: 75 },
        { id: 'expense_budget', icon: 'compare_arrows', label: 'So sánh Dự toán Chi', section: 'BÁO CÁO', count: 70 },

        // === LOẠI BỎ: DN Terminology ===
        // REMOVED: purchase_inbound → expense_material
        // REMOVED: purchase_order → expense_order
        // REMOVED: purchase_return (HCSN không có "trả lại hàng mua")
        // REMOVED: purchase_payment → expense_payment
        // REMOVED: purchase_supplier → expense_partner (đổi tên)
        // REMOVED: purchase_items → expense_catalog (đổi tên)
    ],
    'inventory': [
        { id: 'inventory_receipt', icon: 'inventory_2', label: 'Nhập kho', count: 90 },
        { id: 'inventory_issue', icon: 'output', label: 'Xuất kho', count: 85 },
        { id: 'inventory_transfer', icon: 'sync_alt', label: 'Điều chuyển kho', count: 70 },
        { id: 'inventory_items', icon: 'category', label: 'Danh mục Vật tư', count: 95 },
        { id: 'inventory_status', icon: 'inventory', label: 'Tổng hợp Tồn kho', count: 80 },
    ],

    'tax': [
        { id: 'tax_vat', icon: 'assignment_turned_in', label: 'Tờ khai GTGT', count: 95 },
        { id: 'tax_pit', icon: 'request_quote', label: 'Quyết toán TNCN', count: 80 },
        { id: 'tax_cit', icon: 'corporate_fare', label: 'Quyết toán TNDN', count: 75 },
        { id: 'tax_lookup', icon: 'search_check', label: 'Tra cứu MST', count: 70 },
        { id: 'tax_invoices', icon: 'sync', label: 'Đồng bộ Hóa đơn', count: 85 },
    ],
    'loan': [  // HCSN Debt & Advances Management (TT 24/2024)
        { id: 'loan_temp_advances', icon: 'account_balance_wallet', label: 'Tạm ứng (TK 141)', count: 95 },
        { id: 'loan_budget_advances', icon: 'currency_exchange', label: 'Ứng trước NSNN (TK 161)', count: 85 },
        { id: 'loan_receivables', icon: 'payments', label: 'Công nợ phải thu (TK 136, 138)', count: 90 },
        { id: 'loan_payables', icon: 'receipt_long', label: 'Công nợ phải trả (TK 331, 336, 338)', count: 90 },
    ],
    'asset': [
        // === TÀI SẢN CỐ ĐỊNH (TSCĐ) ===
        { id: 'asset_fixed_list', icon: 'list_alt', label: 'Danh mục TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', count: 100 },
        { id: 'asset_fixed_increase', icon: 'add_business', label: 'Ghi tăng TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', count: 80 },
        { id: 'asset_fixed_decrease', icon: 'domain_disabled', label: 'Ghi giảm TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', count: 60 },
        { id: 'asset_depreciation', icon: 'trending_down', label: 'Tính khấu hao TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', count: 90 },
        { id: 'asset_revaluation', icon: 'assessment', label: 'Đánh giá lại TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', count: 50 },
        { id: 'asset_transfer', icon: 'swap_horiz', label: 'Điều chuyển TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', count: 70 },
        { id: 'asset_inventory', icon: 'fact_check', label: 'Kiểm kê TSCĐ', section: 'TÀI SẢN CỐ ĐỊNH', count: 65 },

        // === TÀI SẢN HẠ TẦNG (MỚI - TT 24/2024) ===
        { id: 'infra_list', icon: 'location_city', label: 'Danh sách Hạ tầng', section: 'TÀI SẢN HẠ TẦNG', count: 95 },
        { id: 'infra_register', icon: 'add_location', label: 'Ghi nhận Hạ tầng mới', section: 'TÀI SẢN HẠ TẦNG', count: 75 },
        { id: 'infra_maintenance', icon: 'build', label: 'Bảo trì & Sửa chữa', section: 'TÀI SẢN HẠ TẦNG', count: 70 },
        { id: 'infra_condition', icon: 'health_and_safety', label: 'Đánh giá Tình trạng', section: 'TÀI SẢN HẠ TẦNG', count: 60 },
        { id: 'infra_report', icon: 'summarize', label: 'Báo cáo Hạ tầng', section: 'TÀI SẢN HẠ TẦNG', count: 55 },

        // === ĐẦU TƯ DÀI HẠN ===
        { id: 'invest_list', icon: 'account_balance', label: 'Khoản Đầu tư Dài hạn', section: 'ĐẦU TƯ DÀI HẠN', count: 80 },
        { id: 'invest_income', icon: 'payments', label: 'Thu nhập Đầu tư', section: 'ĐẦU TƯ DÀI HẠN', count: 70 },

        // === BÁO CÁO TỔNG HỢP ===
        { id: 'asset_report_summary', icon: 'pie_chart', label: 'Tổng hợp Tài sản', section: 'BÁO CÁO', count: 85 },
        { id: 'asset_report_source', icon: 'account_tree', label: 'Tài sản theo Nguồn vốn', section: 'BÁO CÁO', count: 75 },

        // === LOẠI BỎ: Menu cũ (DN) ===
        // REMOVED: asset_list → asset_fixed_list
        // REMOVED: asset_increase → asset_fixed_increase  
        // REMOVED: asset_decrease → asset_fixed_decrease
        // REMOVED: asset_ccdc → Tích hợp vào TSCĐ
    ],
    'treasury': [
        { id: 'treasury', icon: 'dashboard', label: 'Tổng quan', count: 100 }, // Dashboard
        { id: 'treasury_import', icon: 'download', label: 'Nhận số liệu KBNN', count: 95 },
        { id: 'treasury_payment_order', icon: 'receipt_long', label: 'Lệnh chi tiền', count: 90 },
        { id: 'treasury_reconcile', icon: 'compare', label: 'Đối chiếu số dư', count: 85 },
        { id: 'treasury_history', icon: 'history', label: 'Lịch sử giao dịch', count: 70 },
    ],
    'hr': [
        // === HỒ SƠ CÁN BỘ ===
        { id: 'hr_employees', icon: 'person_add', label: 'Cán bộ - Viên chức', section: 'HỒ SƠ CÁN BỘ', count: 95 },
        { id: 'hr_contracts', icon: 'history_edu', label: 'Hợp đồng & Quyết định', section: 'HỒ SƠ CÁN BỘ', count: 85 },
        { id: 'hr_salary_process', icon: 'trending_up', label: 'Quá trình Lương', section: 'HỒ SƠ CÁN BỘ', count: 80 },
        { id: 'hr_allowance_list', icon: 'list_alt', label: 'Danh mục Phụ cấp', section: 'HỒ SƠ CÁN BỘ', count: 100 },

        // === LƯƠNG & THU NHẬP ===
        { id: 'hr_timesheet', icon: 'event_available', label: 'Bảng chấm công', section: 'LƯƠNG & THU NHẬP', count: 90 },
        { id: 'hr_payroll', icon: 'payments', label: 'Tính Lương & Phụ cấp', section: 'LƯƠNG & THU NHẬP', count: 90 },
        { id: 'hr_insurance', icon: 'health_and_safety', label: 'Bảo hiểm & Khấu trừ', section: 'LƯƠNG & THU NHẬP', count: 85 },

        // === BÁO CÁO ===
        { id: 'hr_report_salary', icon: 'summarize', label: 'Bảng thanh toán lương', section: 'BÁO CÁO', count: 60 },
        { id: 'hr_report_insurance', icon: 'description', label: 'Báo cáo Bảo hiểm', section: 'BÁO CÁO', count: 55 },
    ],

    'contract': [
        // === HỢP ĐỒNG ===
        { id: 'contract_sales', icon: 'contract', label: 'Hợp đồng Bán ra', section: 'HỢP ĐỒNG', count: 90 },
        { id: 'contract_purchase', icon: 'assignment', label: 'Hợp đồng Mua vào', section: 'HỢP ĐỒNG', count: 85 },

        // === QUẢN LÝ ===
        { id: 'contract_appendix', icon: 'edit_note', label: 'Phụ lục Hợp đồng', section: 'QUẢN LÝ', count: 70 },
        { id: 'contract_tracking', icon: 'pending_actions', label: 'Theo dõi Thanh toán', section: 'QUẢN LÝ', count: 60 },
    ],
    'project': [
        // === DỰ ÁN ===
        { id: 'project_list', icon: 'list_alt', label: 'Danh sách Dự án', section: 'DỰ ÁN', count: 90 },

        // === THEO DÕI ===
        { id: 'project_tracking', icon: 'analytics', label: 'Tiến độ Thực hiện', section: 'THEO DÕI', count: 85 },
        { id: 'project_budget', icon: 'attach_money', label: 'Ngân sách & Chi phí', section: 'THEO DÕI', count: 75 },

        // === BÁO CÁO ===
        { id: 'project_report', icon: 'summarize', label: 'Báo cáo Tổng hợp', section: 'BÁO CÁO', count: 60 },
    ],
    'dimension': [
        { id: 'dim_list', icon: 'list', label: 'Danh sách Mã TK', count: 90 },
        { id: 'dim_config', icon: 'settings_suggest', label: 'Cấu hình Loại TK', count: 80 },
        { id: 'dim_group', icon: 'group_work', label: 'Nhóm Mã thống kê', count: 60 },
    ],
    'system': [
        // === QUẢN TRỊ ===
        { id: 'sys_params', icon: 'settings', label: 'Tham số hệ thống', section: 'QUẢN TRỊ', count: 90 },
        { id: 'sys_users', icon: 'manage_accounts', label: 'Quản lý người dùng', section: 'QUẢN TRỊ', count: 85 },
        { id: 'sys_perms', icon: 'security', label: 'Phân quyền', section: 'QUẢN TRỊ', count: 80 },
        { id: 'sys_backup', icon: 'backup', label: 'Sao lưu dữ liệu', section: 'QUẢN TRỊ', count: 70 },

        // === KIỂM SOÁT (TT 24/2024) ===
        { id: 'sys_audit_trail', icon: 'history_edu', label: 'Nhật ký Kiểm toán', section: 'KIỂM SOÁT', count: 95 },
        { id: 'sys_budget_control', icon: 'account_balance', label: 'Kiểm soát Ngân sách', section: 'KIỂM SOÁT', count: 92 },
        { id: 'sys_logs', icon: 'history', label: 'Nhật ký truy cập', section: 'KIỂM SOÁT', count: 50 },
    ],


};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate, isMobileOpen = false, onMobileClose }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'BÁO CÁO TÀI CHÍNH': true,
        'SỔ KẾ TOÁN': true
    });
    const [cashBalance, setCashBalance] = useState(0);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await reminderService.getStats();
                setCashBalance(res.data.cash || 0);
            } catch (err) {
                console.error("Failed to fetch sidebar balance", err);
            }
        };
        // Fetch initially
        fetchBalance();

        // Optional: Interval or event listener could go here
    }, []);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Get menu items based on activeTab, default to 'general' if not found
    const menuItems = MENU_MAP[activeTab] || MENU_MAP['general'];

    // Sort by count (usage frequency) descending
    const sortedItems = [...menuItems].sort((a, b) => (b.count || 0) - (a.count || 0));

    // Determine Sidebar Title based on Tab
    let title = "Truy cập nhanh";
    if (activeTab === 'report') title = "Danh mục Báo cáo";
    if (activeTab === 'cash') title = "Quản lý Ngân quỹ";
    if (activeTab === 'revenue') title = "Thu sự nghiệp";  // Changed from 'sales'
    if (activeTab === 'expense') title = "Mua sắm & Chi";   // Changed from 'purchase'
    if (activeTab === 'loan') title = "Công nợ \u0026 Tạm ứng HCSN"; // Updated for TT 24/2024
    if (activeTab === 'contract') title = "Quản lý Hợp đồng";
    if (activeTab === 'project') title = "Quản lý Dự án";
    if (activeTab === 'contract') title = "Quản lý Hợp đồng";
    if (activeTab === 'project') title = "Quản lý Dự án";
    if (activeTab === 'system') title = "Quản trị Hệ thống";
    if (activeTab === 'treasury') title = "Kết nối Kho bạc Nhà nước";

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
                    onClick={onMobileClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`
                    ${isCollapsed ? 'w-16' : 'w-60'}
                    transition-all duration-300
                    bg-white dark:bg-slate-800
                    border-r border-border-light dark:border-border-dark
                    flex flex-col shrink-0 relative group/sidebar z-50
                    no-print sidebar

                    /* Desktop: Always visible */
                    lg:flex

                    /* Mobile: Fixed position with slide animation */
                    fixed lg:relative
                    inset-y-0 left-0
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
                data-no-print
            >
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-0.5 text-slate-500 hover:text-blue-600 shadow-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity z-10"
                    title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                    <span className="material-symbols-outlined text-[16px] block">{isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
                </button>

                <div className="flex-1 p-3 overflow-y-auto">
                    <div className={`flex items-center justify-between mb-2 px-2 whitespace-nowrap ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100 transition-opacity duration-200'}`}>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                    </div>

                    <nav className="space-y-0.5">
                        {Array.from(new Set(sortedItems.map(item => item.section))).map((section, sIdx) => {
                            const isExpanded = !section || expandedSections[section] || (activeTab !== 'report' && activeTab !== 'cash' && activeTab !== 'revenue' && activeTab !== 'expense' && activeTab !== 'inventory' && activeTab !== 'asset' && activeTab !== 'loan' && activeTab !== 'hr' && activeTab !== 'contract' && activeTab !== 'project' && activeTab !== 'fund');
                            return (
                                <div key={sIdx} className="mb-2">
                                    {section && (activeTab === 'report' || activeTab === 'cash' || activeTab === 'revenue' || activeTab === 'expense' || activeTab === 'inventory' || activeTab === 'asset' || activeTab === 'loan' || activeTab === 'hr' || activeTab === 'contract' || activeTab === 'project' || activeTab === 'fund') && !isCollapsed && (
                                        <button
                                            onClick={() => toggleSection(section)}
                                            className="w-full flex items-center justify-between px-2 mt-4 mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-blue-500 transition-colors"
                                        >
                                            <span>{section}</span>
                                            <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>
                                    )}
                                    <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        {sortedItems.filter(item => item.section === section).map((item, idx) => (
                                            <a
                                                key={idx}
                                                href={item.href || '#'}
                                                onClick={(e) => {
                                                    if (item.id && onNavigate) {
                                                        e.preventDefault();
                                                        onNavigate(item.id);
                                                    }
                                                }}
                                                className={`flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md whitespace-nowrap overflow-hidden transition-colors 
                                                ${isCollapsed ? 'justify-center text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700' :
                                                        'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                title={item.label}
                                            >
                                                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                                                <span className={`${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'} transition-all duration-200`}>{item.label}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>
                </div>

                <div className={`mt-auto p-4 border-t border-slate-100 dark:border-slate-700 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
                    <div className={`bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 transition-all ${isCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}>
                        <div className={isCollapsed ? 'hidden' : 'block'}>
                            <p className="text-xs font-semibold text-primary mb-1">Số dư tiền mặt</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatCurrency(cashBalance)} ₫</p>
                        </div>
                        <div className={isCollapsed ? 'block text-primary' : 'hidden'}>
                            <span className="material-symbols-outlined text-[24px]" title={`Số dư tiền mặt: ${formatCurrency(cashBalance)} ₫`}>paid</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
