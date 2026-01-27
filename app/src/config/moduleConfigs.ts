/**
 * Module Overview Configurations
 * SyntexHCSN - Cấu hình tổng quan cho từng phân hệ
 */

export interface ModuleConfig {
    title: string;
    description: string;
    icon: string;
    iconColor: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal' | 'indigo';
    workflow: {
        icon: string;
        title: string;
        description: string;
        color?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal' | 'indigo';
        targetView?: string; // View ID to navigate to when clicked
    }[];
    features: {
        icon: string;
        title: string;
        description: string;
        targetView?: string; // View ID to navigate to when clicked
    }[];
}

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
    // PHÂN HỆ KẾ TOÁN TỔNG HỢP
    general: {
        title: 'Phân hệ Kế toán Tổng hợp',
        description: 'Quản lý ngân sách, chứng từ, sổ cái và báo cáo tài chính theo TT 24/2024/TT-BTC. Trung tâm xử lý số liệu của đơn vị.',
        icon: 'account_balance',
        iconColor: 'blue',
        workflow: [
            { icon: 'edit_document', title: 'Lập Dự toán', description: 'Xây dựng và phân bổ dự toán năm', color: 'blue', targetView: 'fund_budget' },
            { icon: 'upload_file', title: 'Nhập Chứng từ', description: 'Ghi nhận nghiệp vụ phát sinh', color: 'amber', targetView: 'voucher_list' },
            { icon: 'published_with_changes', title: 'Kết chuyển', description: 'Xử lý cuối kỳ và khóa sổ', color: 'purple', targetView: 'closing' },
            { icon: 'summarize', title: 'Báo cáo', description: 'Lập BCTC và Quyết toán', color: 'green', targetView: 'balance_sheet_hcsn' },
        ],
        features: [
            { icon: 'account_balance_wallet', title: 'Nguồn Kinh phí', description: 'Quản lý danh mục nguồn', targetView: 'fund_list' },
            { icon: 'edit_note', title: 'Quản lý Dự toán', description: 'Lập, phân bổ, điều chỉnh', targetView: 'fund_budget' },
            { icon: 'receipt_long', title: 'Chứng từ Kế toán', description: 'Quản lý toàn bộ chứng từ', targetView: 'voucher_list' },
            { icon: 'visibility_off', title: 'TK Ngoài bảng', description: 'Theo dõi TK 008, 00... (Dự toán)', targetView: 'fund_off_balance' },
            { icon: 'menu_book', title: 'Sổ Kế toán', description: 'Sổ cái, Nhật ký chung', targetView: 'general_ledger' },
            { icon: 'lock_clock', title: 'Khóa sổ Kỳ', description: 'Khóa sổ, ngăn chặn chỉnh sửa', targetView: 'locking' },
        ],
    },

    // PHÂN HỆ TIỀN MẶT & NGÂN HÀNG
    cash: {
        title: 'Phân hệ Tiền mặt & Ngân hàng',
        description: 'Theo dõi thu chi tiền mặt, tiền gửi ngân hàng theo từng quỹ và nguồn kinh phí. Hỗ trợ đối chiếu sổ quỹ, bank statement.',
        icon: 'account_balance_wallet',
        iconColor: 'green',
        workflow: [
            { icon: 'add_card', title: 'Lập Phiếu', description: 'Tạo phiếu thu, phiếu chi, UNC', color: 'blue', targetView: 'cash_receipt' },
            { icon: 'approval', title: 'Duyệt/Ký', description: 'Kiểm soát và phê duyệt chứng từ', color: 'amber', targetView: 'cash_payment' },
            { icon: 'published_with_changes', title: 'Ghi sổ', description: 'Cập nhật vào sổ quỹ, sổ tiền gửi', color: 'green', targetView: 'cash_book' },
            { icon: 'balance', title: 'Đối chiếu', description: 'Đối chiếu sổ quỹ với tiền thực tế', color: 'teal', targetView: 'cash_bank_sync' },
        ],
        features: [
            { icon: 'receipt', title: 'Phiếu Thu', description: 'Quản lý phiếu thu tiền mặt', targetView: 'cash_receipt' },
            { icon: 'payments', title: 'Phiếu Chi', description: 'Quản lý phiếu chi tiền mặt', targetView: 'cash_payment' },
            { icon: 'account_balance', title: 'Ủy Nhiệm Chi', description: 'Lập UNC chuyển khoản', targetView: 'cash_bank_out' },
            { icon: 'book', title: 'Sổ Quỹ', description: 'Theo dõi tồn quỹ tiền mặt', targetView: 'cash_book' },
            { icon: 'savings', title: 'Tiền Gửi', description: 'Quản lý tiền gửi ngân hàng', targetView: 'cash_bank_in' },
            { icon: 'currency_exchange', title: 'Ngoại tệ', description: 'Theo dõi ngoại tệ, đánh giá lại', targetView: 'revaluation' },
        ],
    },

    // PHÂN HỆ THU SỰ NGHIỆP
    revenue: {
        title: 'Phân hệ Thu Sự nghiệp',
        description: 'Quản lý các nguồn thu sự nghiệp theo loại hình (học phí, lệ phí, dịch vụ...). Theo dõi công nợ phải thu và đối chiếu với ngân sách.',
        icon: 'trending_up',
        iconColor: 'teal',
        workflow: [
            { icon: 'description', title: 'Lập Kế hoạch', description: 'Dự toán nguồn thu theo năm', color: 'blue', targetView: 'revenue_budget' },
            { icon: 'point_of_sale', title: 'Ghi nhận Thu', description: 'Nhập phát sinh thu trong kỳ', color: 'green', targetView: 'revenue_receipt' },
            { icon: 'person_search', title: 'Theo dõi Công nợ', description: 'Theo dõi công nợ phải thu', color: 'amber', targetView: 'loan_receivables' },
            { icon: 'analytics', title: 'Tổng hợp', description: 'Báo cáo tình hình thu', color: 'teal', targetView: 'revenue_report' },
        ],
        features: [
            { icon: 'category', title: 'Loại Thu', description: 'Danh mục nguồn thu sự nghiệp', targetView: 'revenue_categories' },
            { icon: 'receipt_long', title: 'Chứng từ Thu', description: 'Quản lý hóa đơn, biên lai', targetView: 'revenue_receipt' },
            { icon: 'group', title: 'Đối tượng Thu', description: 'Quản lý học sinh, khách hàng', targetView: 'revenue_payer' },
            { icon: 'credit_score', title: 'Công nợ Phải thu', description: 'Theo dõi và đôn đốc nợ', targetView: 'loan_receivables' },
            { icon: 'bar_chart', title: 'Báo cáo Thu', description: 'Thống kê, phân tích nguồn thu', targetView: 'revenue_report' },
            { icon: 'compare_arrows', title: 'Đối chiếu Ngân sách', description: 'So sánh thực hiện/kế hoạch', targetView: 'revenue_budget' },
        ],
    },

    // PHÂN HỆ CHI HOẠT ĐỘNG
    expense: {
        title: 'Phân hệ Chi Hoạt động',
        description: 'Quản lý chi thường xuyên và chi không thường xuyên theo nguồn kinh phí. Kiểm soát định mức chi, quy chế chi tiêu nội bộ.',
        icon: 'shopping_cart',
        iconColor: 'amber',
        workflow: [
            { icon: 'edit_note', title: 'Đề xuất Chi', description: 'Lập đề xuất, giấy đề nghị', color: 'blue', targetView: 'expense_voucher' },
            { icon: 'approval', title: 'Phê duyệt', description: 'Kiểm soát và phê duyệt chi', color: 'amber', targetView: 'sys_budget_control' },
            { icon: 'payments', title: 'Thực hiện Chi', description: 'Thanh toán, chi trả', color: 'green', targetView: 'expense_payment' },
            { icon: 'receipt_long', title: 'Hoàn ứng/Quyết toán', description: 'Hoàn chứng từ, quyết toán', color: 'teal', targetView: 'loan_temp_advances' },
        ],
        features: [
            { icon: 'category', title: 'Loại Chi', description: 'Danh mục khoản chi theo MLNS', targetView: 'expense_categories' },
            { icon: 'rule', title: 'Định mức Chi', description: 'Thiết lập định mức theo quy chế', targetView: 'cost_settings' },
            { icon: 'article', title: 'Chứng từ Chi', description: 'Quản lý phiếu đề nghị, thanh toán', targetView: 'expense_voucher' },
            { icon: 'groups', title: 'Công nợ Phải trả', description: 'Theo dõi nợ nhà cung cấp', targetView: 'loan_payables' },
            { icon: 'pie_chart', title: 'Phân bổ Chi phí', description: 'Phân bổ theo nguồn kinh phí', targetView: 'allocation' },
            { icon: 'shield', title: 'Kiểm soát Chi', description: 'Cảnh báo vượt định mức', targetView: 'sys_budget_control' },
        ],
    },

    // PHÂN HỆ TÀI SẢN
    asset: {
        title: 'Phân hệ Tài sản Cố định & CCDC',
        description: 'Quản lý tài sản cố định, công cụ dụng cụ, tài sản kết cấu hạ tầng theo TT 24/2024. Hỗ trợ tính khấu hao, theo dõi nguồn hình thành.',
        icon: 'apartment',
        iconColor: 'purple',
        workflow: [
            { icon: 'add_box', title: 'Ghi tăng', description: 'Nhập mới tài sản, CCDC', color: 'blue', targetView: 'asset_fixed_increase' },
            { icon: 'calculate', title: 'Khấu hao', description: 'Trích khấu hao/phân bổ định kỳ', color: 'amber', targetView: 'asset_depreciation' },
            { icon: 'swap_horiz', title: 'Điều chuyển', description: 'Chuyển tài sản giữa bộ phận', color: 'green', targetView: 'asset_transfer' },
            { icon: 'remove_circle', title: 'Ghi giảm', description: 'Thanh lý, nhượng bán tài sản', color: 'red', targetView: 'asset_fixed_decrease' },
        ],
        features: [
            { icon: 'inventory', title: 'Danh mục TSCĐ', description: 'Quản lý tài sản cố định hữu hình', targetView: 'asset_fixed_list' },
            { icon: 'handyman', title: 'CCDC', description: 'Công cụ dụng cụ, đồ dùng', targetView: 'ccdc' },
            { icon: 'construction', title: 'Hạ tầng', description: 'Tài sản kết cấu hạ tầng', targetView: 'infra_list' },
            { icon: 'trending_down', title: 'Khấu hao/Phân bổ', description: 'Tính và ghi nhận hao mòn', targetView: 'asset_depreciation' },
            { icon: 'qr_code_2', title: 'Theo dõi Nguồn', description: 'Nguồn hình thành tài sản', targetView: 'asset_report_source' },
            { icon: 'fact_check', title: 'Kiểm kê', description: 'Kiểm kê tài sản định kỳ', targetView: 'asset_inventory' },
        ],
    },

    // PHÂN HỆ KHO
    inventory: {
        title: 'Phân hệ Quản lý Kho',
        description: 'Quản lý vật tư, hàng hóa nhập xuất tồn theo từng kho. Hỗ trợ nhiều phương pháp tính giá (FIFO, Bình quân).',
        icon: 'warehouse',
        iconColor: 'indigo',
        workflow: [
            { icon: 'input', title: 'Nhập Kho', description: 'Nhập vật tư từ mua, sản xuất', color: 'blue', targetView: 'inventory_receipt' },
            { icon: 'output', title: 'Xuất Kho', description: 'Xuất dùng, bán, điều chuyển', color: 'amber', targetView: 'inventory_issue' },
            { icon: 'inventory_2', title: 'Tồn Kho', description: 'Theo dõi tồn theo lô/vị trí', color: 'green', targetView: 'inventory_summary' },
            { icon: 'checklist', title: 'Kiểm Kho', description: 'Kiểm kê và xử lý chênh lệch', color: 'teal', targetView: 'inventory_check' },
        ],
        features: [
            { icon: 'category', title: 'Danh mục Vật tư', description: 'Quản lý mã hàng, ĐVT', targetView: 'inventory_items' },
            { icon: 'add_shopping_cart', title: 'Phiếu Nhập', description: 'Nhập kho từ mua, ĐCNB', targetView: 'inventory_receipt' },
            { icon: 'local_shipping', title: 'Phiếu Xuất', description: 'Xuất kho bán, sử dụng', targetView: 'inventory_issue' },
            { icon: 'format_list_numbered', title: 'Thẻ Kho', description: 'Theo dõi chi tiết từng mã', targetView: 'inventory_ledger' },
            { icon: 'calculate', title: 'Tính Giá XK', description: 'FIFO, Bình quân gia quyền', targetView: 'inventory_items' }, // Tạm trỏ về items
            { icon: 'summarize', title: 'Báo cáo NXT', description: 'Báo cáo nhập xuất tồn', targetView: 'inventory_report' },
        ],
    },

    // PHÂN HỆ NHÂN SỰ - TIỀN LƯƠNG
    hr: {
        title: 'Phân hệ Nhân sự & Tiền lương',
        description: 'Quản lý hồ sơ nhân sự, tính lương, BHXH, thuế TNCN theo quy định HCSN. Hỗ trợ kết nối C&B, BHXH điện tử.',
        icon: 'groups',
        iconColor: 'blue',
        workflow: [
            { icon: 'person_add', title: 'Quản lý Hồ sơ', description: 'Thêm, cập nhật thông tin NV', color: 'blue', targetView: 'hr_employees' },
            { icon: 'access_time', title: 'Chấm công', description: 'Ghi nhận ngày công, phép', color: 'amber', targetView: 'hr_timesheet' },
            { icon: 'calculate', title: 'Tính lương', description: 'Tính lương, phụ cấp, giảm trừ', color: 'green', targetView: 'hr_payroll' },
            { icon: 'payments', title: 'Trả lương', description: 'Chi lương qua TK hoặc tiền mặt', color: 'teal', targetView: 'hr_payroll' },
        ],
        features: [
            { icon: 'badge', title: 'Hồ sơ Nhân sự', description: 'Quản lý thông tin cá nhân', targetView: 'hr_employees' },
            { icon: 'schedule', title: 'Chấm công', description: 'Bảng chấm công hàng tháng', targetView: 'hr_timesheet' },
            { icon: 'paid', title: 'Bảng Lương', description: 'Tính lương, phụ cấp', targetView: 'hr_payroll' },
            { icon: 'health_and_safety', title: 'BHXH/BHYT/BHTN', description: 'Trích nộp bảo hiểm', targetView: 'hr_insurance' },
            { icon: 'account_balance', title: 'Thuế TNCN', description: 'Tính và kê khai thuế', targetView: 'hr_tax' },
            { icon: 'print', title: 'Phiếu Lương', description: 'In phiếu lương cá nhân', targetView: 'hr_payroll' },
        ],
    },

    // PHÂN HỆ NGÂN SÁCH (Đã gộp vào Tổng hợp)
    // budget: { ... },

    // PHÂN HỆ BÁO CÁO
    report: {
        title: 'Phân hệ Báo cáo',
        description: 'Lập báo cáo tài chính, báo cáo quyết toán theo mẫu biểu TT 24/2024. Hỗ trợ xuất XML theo chuẩn CSDL quốc gia.',
        icon: 'summarize',
        iconColor: 'indigo',
        workflow: [
            { icon: 'check_circle', title: 'Kiểm tra Số liệu', description: 'Đối chiếu, cân đối số liệu', color: 'blue', targetView: 'check' },
            { icon: 'table_chart', title: 'Chọn Mẫu', description: 'Chọn mẫu báo cáo cần lập', color: 'amber', targetView: 'balance_sheet_hcsn' },
            { icon: 'preview', title: 'Xem trước', description: 'Xem và kiểm tra báo cáo', color: 'green', targetView: 'balance_sheet_hcsn' },
            { icon: 'download', title: 'Xuất File', description: 'Xuất PDF, Excel, XML', color: 'teal', targetView: 'balance_sheet_hcsn' },
        ],
        features: [
            { icon: 'account_balance', title: 'BCTC', description: 'Báo cáo tài chính theo TT24', targetView: 'balance_sheet_hcsn' },
            { icon: 'receipt_long', title: 'Sổ Kế toán', description: 'In sổ cái, sổ chi tiết', targetView: 'general_ledger' },
            { icon: 'request_quote', title: 'Báo cáo Ngân sách', description: 'Báo cáo thu chi NS', targetView: 'budget_settlement_regular' },
            { icon: 'assessment', title: 'Báo cáo Quản trị', description: 'Phân tích, thống kê', targetView: 'financial_analysis' },
            { icon: 'upload_file', title: 'Xuất XML', description: 'Xuất CSDL quốc gia', targetView: 'xml_export' },
            { icon: 'schedule', title: 'In Định kỳ', description: 'Lập lịch xuất báo cáo tự động', targetView: 'report_scheduler' },
        ],
    },

    // PHÂN HỆ KIỂM TOÁN (Sử dụng Audit Trail)
    audit: {
        title: 'Phân hệ Theo dõi Kiểm toán',
        description: 'Ghi nhận nhật ký thao tác, theo dõi lịch sử chỉnh sửa. Hỗ trợ kiểm toán nội bộ, đối chiếu dữ liệu.',
        icon: 'policy',
        iconColor: 'red',
        workflow: [
            { icon: 'history', title: 'Ghi Log', description: 'Tự động ghi nhật ký thao tác', color: 'blue', targetView: 'sys_audit_trail' },
            { icon: 'search', title: 'Tra cứu', description: 'Tìm kiếm lịch sử thay đổi', color: 'amber', targetView: 'sys_audit_trail' },
            { icon: 'compare', title: 'So sánh', description: 'So sánh phiên bản dữ liệu', color: 'green', targetView: 'sys_audit_trail' }, // Tạm thời
            { icon: 'report', title: 'Báo cáo', description: 'Xuất báo cáo kiểm toán', color: 'red', targetView: 'sys_audit_trail' },
        ],
        features: [
            { icon: 'history', title: 'Nhật ký Thao tác', description: 'Log mọi thay đổi trong hệ thống', targetView: 'sys_audit_trail' },
            { icon: 'person', title: 'Theo dõi User', description: 'Hoạt động theo người dùng', targetView: 'sys_audit_trail' },
            { icon: 'article', title: 'Lịch sử Chứng từ', description: 'Các phiên bản chứng từ', targetView: 'sys_audit_trail' },
            { icon: 'warning', title: 'Cảnh báo Rủi ro', description: 'Phát hiện giao dịch bất thường', targetView: 'sys_audit_trail' },
            { icon: 'fact_check', title: 'Kiểm toán Nội bộ', description: 'Công cụ hỗ trợ kiểm toán', targetView: 'virtual_audit' },
            { icon: 'download', title: 'Xuất Dữ liệu', description: 'Xuất log cho kiểm toán bên ngoài', targetView: 'sys_audit_trail' },
        ],
    },

    // PHÂN HỆ KHO BẠC NHÀ NƯỚC
    treasury: {
        title: 'Phân hệ Kho bạc Nhà nước',
        description: 'Kết nối KBNN để đối chiếu số dư, nhận lệnh chi, tra cứu giao dịch. Đảm bảo đồng bộ số liệu giữa đơn vị và Kho bạc.',
        icon: 'assured_workload',
        iconColor: 'green',
        workflow: [
            { icon: 'cloud_sync', title: 'Kết nối KBNN', description: 'Thiết lập kết nối với hệ thống KB', color: 'blue', targetView: 'treasury_connect' },
            { icon: 'download', title: 'Nhận Dữ liệu', description: 'Tải giao dịch từ Kho bạc', color: 'amber', targetView: 'treasury_import' },
            { icon: 'compare', title: 'Đối chiếu', description: 'So sánh với số liệu nội bộ', color: 'green', targetView: 'treasury_reconcile' },
            { icon: 'send', title: 'Gửi Lệnh chi', description: 'Đẩy yêu cầu thanh toán', color: 'teal', targetView: 'treasury_payment_order' },
        ],
        features: [
            { icon: 'cloud_done', title: 'Trạng thái Kết nối', description: 'Kiểm tra kết nối KBNN', targetView: 'treasury_connect' },
            { icon: 'account_balance', title: 'Số dư Tài khoản', description: 'Tra cứu số dư tại KB', targetView: 'treasury_balance' },
            { icon: 'receipt_long', title: 'Lệnh Chi Tiền', description: 'Lập và gửi lệnh chi', targetView: 'treasury_payment_order' },
            { icon: 'history', title: 'Lịch sử Giao dịch', description: 'Tra cứu giao dịch đã thực hiện', targetView: 'treasury_history' },
            { icon: 'sync', title: 'Đồng bộ Dữ liệu', description: 'Import giao dịch từ KBNN', targetView: 'treasury_import' },
            { icon: 'fact_check', title: 'Đối chiếu Số dư', description: 'So sánh và điều chỉnh chênh lệch', targetView: 'treasury_reconcile' },
        ],
    },

    // PHÂN HỆ CÔNG NỢ
    debt: {
        title: 'Phân hệ Quản lý Công nợ',
        description: 'Theo dõi công nợ phải thu, phải trả theo đối tượng. Quản lý tạm ứng, ứng trước ngân sách và đôn đốc thu hồi nợ.',
        icon: 'account_balance_wallet',
        iconColor: 'amber',
        workflow: [
            { icon: 'add_card', title: 'Ghi nhận Nợ', description: 'Tạo công nợ từ chứng từ', color: 'blue', targetView: 'loan_receivables' },
            { icon: 'person_search', title: 'Theo dõi', description: 'Theo dõi theo đối tượng, kỳ hạn', color: 'amber', targetView: 'loan_aging' },
            { icon: 'payments', title: 'Thu hồi/Thanh toán', description: 'Ghi nhận thu hồi hoặc thanh toán', color: 'green', targetView: 'loan_payment' },
            { icon: 'analytics', title: 'Phân tích', description: 'Báo cáo tuổi nợ, rủi ro', color: 'teal', targetView: 'loan_report' },
        ],
        features: [
            { icon: 'credit_score', title: 'Công nợ Phải thu', description: 'TK 131, 136, 138 - Phải thu', targetView: 'loan_receivables' },
            { icon: 'credit_card', title: 'Công nợ Phải trả', description: 'TK 331, 336, 338 - Phải trả', targetView: 'loan_payables' },
            { icon: 'savings', title: 'Tạm ứng (TK 141)', description: 'Quản lý tạm ứng nội bộ', targetView: 'loan_temp_advances' },
            { icon: 'account_balance', title: 'Ứng trước NSNN (TK 161)', description: 'Theo dõi ứng trước ngân sách', targetView: 'loan_advance_payment' },
            { icon: 'schedule', title: 'Báo cáo Tuổi nợ', description: 'Phân tích nợ theo thời gian', targetView: 'loan_aging' },
            { icon: 'notification_important', title: 'Cảnh báo Nợ', description: 'Nhắc nhở nợ quá hạn', targetView: 'loan_warning' },
        ],
    },

    // PHÂN HỆ MUA HÀNG
    purchase: {
        title: 'Phân hệ Mua hàng & Dịch vụ',
        description: 'Quản lý quy trình mua sắm từ đề xuất, đặt hàng đến nhận hàng, thanh toán. Theo dõi hợp đồng và công nợ nhà cung cấp.',
        icon: 'shopping_cart',
        iconColor: 'amber',
        workflow: [
            { icon: 'edit_note', title: 'Đề xuất Mua', description: 'Lập đề xuất, xin phê duyệt', color: 'blue', targetView: 'purchase_request' },
            { icon: 'description', title: 'Đặt hàng/Hợp đồng', description: 'Lập đơn đặt hàng, ký HĐ', color: 'amber', targetView: 'purchase_order' },
            { icon: 'local_shipping', title: 'Nhận hàng', description: 'Nhập kho, nghiệm thu dịch vụ', color: 'green', targetView: 'inventory_receipt' },
            { icon: 'payments', title: 'Thanh toán', description: 'Chi trả, đối chiếu công nợ', color: 'teal', targetView: 'expense_payment' },
        ],
        features: [
            { icon: 'groups', title: 'Nhà cung cấp', description: 'Danh mục NCC, đánh giá', targetView: 'vendor_list' },
            { icon: 'request_quote', title: 'Đề xuất Mua', description: 'Lập và duyệt đề xuất', targetView: 'purchase_request' },
            { icon: 'assignment', title: 'Đơn Đặt hàng', description: 'Quản lý PO, theo dõi giao hàng', targetView: 'purchase_order' },
            { icon: 'receipt', title: 'Hóa đơn Mua', description: 'Nhập hóa đơn đầu vào', targetView: 'purchase_invoice' },
            { icon: 'keyboard_return', title: 'Trả hàng', description: 'Xử lý trả hàng, giảm giá', targetView: 'purchase_return' },
            { icon: 'summarize', title: 'Báo cáo Mua', description: 'Thống kê mua theo kỳ', targetView: 'purchase_report' },
        ],
    },

    // PHÂN HỆ BÁN HÀNG/DỊCH VỤ
    sales: {
        title: 'Phân hệ Bán hàng & Dịch vụ',
        description: 'Quản lý quy trình bán hàng, cung cấp dịch vụ. Lập hóa đơn, theo dõi doanh thu và công nợ khách hàng.',
        icon: 'storefront',
        iconColor: 'blue',
        workflow: [
            { icon: 'shopping_bag', title: 'Đơn hàng', description: 'Tiếp nhận và xử lý đơn hàng', color: 'blue', targetView: 'sales_order' },
            { icon: 'local_shipping', title: 'Giao hàng/DV', description: 'Xuất kho, hoàn thành dịch vụ', color: 'amber', targetView: 'sales_delivery' },
            { icon: 'receipt', title: 'Xuất Hóa đơn', description: 'Lập hóa đơn GTGT/bán lẻ', color: 'green', targetView: 'sales_invoice' },
            { icon: 'payments', title: 'Thu tiền', description: 'Thu tiền mặt hoặc CK', color: 'teal', targetView: 'revenue_receipt' },
        ],
        features: [
            { icon: 'group', title: 'Khách hàng', description: 'Danh mục khách hàng', targetView: 'customer_list' },
            { icon: 'shopping_cart', title: 'Đơn hàng', description: 'Quản lý đơn hàng bán', targetView: 'sales_order' },
            { icon: 'receipt_long', title: 'Hóa đơn Bán', description: 'Lập hóa đơn đầu ra', targetView: 'sales_invoice' },
            { icon: 'undo', title: 'Trả hàng', description: 'Xử lý trả hàng, hoàn tiền', targetView: 'sales_return' },
            { icon: 'credit_score', title: 'Công nợ KH', description: 'Theo dõi công nợ phải thu', targetView: 'loan_receivables' },
            { icon: 'bar_chart', title: 'Báo cáo Bán', description: 'Doanh thu theo kỳ, sản phẩm', targetView: 'sales_report' },
        ],
    },

    // PHÂN HỆ HỢP ĐỒNG
    contract: {
        title: 'Phân hệ Quản lý Hợp đồng',
        description: 'Quản lý hợp đồng kinh tế, hợp đồng lao động. Theo dõi giá trị, tiến độ thanh toán và nhắc nhở hết hạn.',
        icon: 'handshake',
        iconColor: 'purple',
        workflow: [
            { icon: 'add', title: 'Tạo Hợp đồng', description: 'Soạn thảo, ký kết HĐ', color: 'blue', targetView: 'contract_sales' },
            { icon: 'fact_check', title: 'Theo dõi', description: 'Giám sát tiến độ thực hiện', color: 'amber', targetView: 'contract_progress' },
            { icon: 'payments', title: 'Thanh toán', description: 'Ghi nhận thanh toán theo đợt', color: 'green', targetView: 'contract_progress' },
            { icon: 'check_circle', title: 'Thanh lý', description: 'Nghiệm thu, thanh lý HĐ', color: 'teal', targetView: 'contract_liquidation' },
        ],
        features: [
            { icon: 'assignment', title: 'Hợp đồng Mua', description: 'HĐ với nhà cung cấp', targetView: 'contract_purchase' },
            { icon: 'sell', title: 'Hợp đồng Bán', description: 'HĐ với khách hàng', targetView: 'contract_sales' },
            { icon: 'attach_file', title: 'Phụ lục HĐ', description: 'Quản lý phụ lục, điều chỉnh', targetView: 'contract_addendum' },
            { icon: 'schedule', title: 'Tiến độ Thanh toán', description: 'Theo dõi đợt thanh toán', targetView: 'contract_progress' },
            { icon: 'notifications', title: 'Nhắc nhở', description: 'Cảnh báo HĐ sắp hết hạn', targetView: 'contract_warning' },
            { icon: 'analytics', title: 'Báo cáo HĐ', description: 'Tổng hợp HĐ theo kỳ', targetView: 'contract_report' },
        ],
    },

    // PHÂN HỆ DỰ ÁN
    project: {
        title: 'Phân hệ Quản lý Dự án',
        description: 'Theo dõi chi phí, tiến độ và lãi/lỗ theo từng dự án, công trình. Phân bổ chi phí và lập báo cáo dự án.',
        icon: 'architecture',
        iconColor: 'indigo',
        workflow: [
            { icon: 'add_box', title: 'Tạo Dự án', description: 'Khai báo dự án, dự toán', color: 'blue', targetView: 'project_list' },
            { icon: 'assignment', title: 'Phân công', description: 'Phân công nhiệm vụ, nhân sự', color: 'amber', targetView: 'project_task' },
            { icon: 'trending_up', title: 'Theo dõi', description: 'Giám sát chi phí, tiến độ', color: 'green', targetView: 'project_cost' },
            { icon: 'summarize', title: 'Quyết toán', description: 'Tổng hợp, báo cáo kết quả', color: 'teal', targetView: 'project_settlement' },
        ],
        features: [
            { icon: 'folder', title: 'Danh mục Dự án', description: 'Tạo và quản lý dự án', targetView: 'project_list' },
            { icon: 'list', title: 'Công việc', description: 'Chia nhỏ, theo dõi task', targetView: 'project_task' },
            { icon: 'paid', title: 'Chi phí DA', description: 'Tập hợp chi phí dự án', targetView: 'project_cost' },
            { icon: 'calculate', title: 'Lãi/Lỗ DA', description: 'Tính kết quả dự án', targetView: 'project_result' },
            { icon: 'share', title: 'Phân bổ CP', description: 'Phân bổ chi phí chung', targetView: 'project_allocation' },
            { icon: 'assessment', title: 'Báo cáo DA', description: 'Báo cáo tiến độ, tài chính', targetView: 'project_report' },
        ],
    },

    // PHÂN HỆ DANH MỤC
    master: {
        title: 'Phân hệ Danh mục Dùng chung',
        description: 'Quản lý các danh mục dùng chung cho toàn hệ thống: tài khoản, đối tác, sản phẩm, nguồn kinh phí, mục lục ngân sách.',
        icon: 'folder_shared',
        iconColor: 'blue',
        workflow: [
            { icon: 'add', title: 'Thêm mới', description: 'Tạo danh mục mới', color: 'blue', targetView: 'master_add' },
            { icon: 'edit', title: 'Cập nhật', description: 'Sửa đổi thông tin', color: 'amber', targetView: 'master_edit' },
            { icon: 'upload', title: 'Import', description: 'Nhập từ Excel/CSV', color: 'green', targetView: 'master_import' },
            { icon: 'download', title: 'Export', description: 'Xuất ra Excel', color: 'teal', targetView: 'master_export' },
        ],
        features: [
            { icon: 'account_tree', title: 'Hệ thống Tài khoản', description: 'Danh mục TK theo TT24', targetView: 'account_list' },
            { icon: 'groups', title: 'Đối tác', description: 'Khách hàng, NCC, nhân viên', targetView: 'partner_list' },
            { icon: 'inventory_2', title: 'Sản phẩm/Vật tư', description: 'Danh mục hàng hóa, dịch vụ', targetView: 'product_list' },
            { icon: 'account_balance', title: 'Nguồn Kinh phí', description: 'NSNN, XDSN, Khác', targetView: 'funding_source' },
            { icon: 'list', title: 'Mục lục NS', description: 'Loại, khoản, chương, mục', targetView: 'budget_item' },
            { icon: 'tune', title: 'Tham số Hệ thống', description: 'Cấu hình chung', targetView: 'sys_params' },
        ],
    },

    // PHÂN HỆ HỆ THỐNG
    system: {
        title: 'Phân hệ Quản trị Hệ thống',
        description: 'Quản lý người dùng, phân quyền, cấu hình hệ thống và kiểm soát ngân sách đơn vị theo TT 24/2024.',
        icon: 'settings',
        iconColor: 'purple',
        workflow: [
            { icon: 'admin_panel_settings', title: 'Phân quyền', description: 'Gán quyền theo vai trò', color: 'blue', targetView: 'sys_permission' },
            { icon: 'account_balance', title: 'Kiểm soát NS', description: 'Cấu hình hạn mức và kiểm soát chi', color: 'amber', targetView: 'sys_budget_control' },
            { icon: 'history_edu', title: 'Audit Log', description: 'Nhật ký kiểm toán hệ thống', color: 'green', targetView: 'sys_audit_trail' },
            { icon: 'backup', title: 'Sao lưu', description: 'Backup và phục hồi dữ liệu', color: 'teal', targetView: 'sys_backup' },
        ],
        features: [
            { icon: 'group', title: 'Người dùng', description: 'Quản lý tài khoản đăng nhập', targetView: 'sys_users' }, // Note: Sidebar uses 'sys_users', config used 'sys_user'. Updated to match Sidebar.
            { icon: 'security', title: 'Vai trò & Quyền', description: 'Phân quyền chức năng', targetView: 'sys_perms' }, // Sidebar uses 'sys_perms'
            { icon: 'account_balance', title: 'Kiểm soát Ngân sách', description: 'Thiết lập quy tắc kiểm soát chi', targetView: 'sys_budget_control' },
            { icon: 'tune', title: 'Tham số', description: 'Cấu hình hệ thống', targetView: 'sys_params' },
            { icon: 'backup', title: 'Sao lưu', description: 'Backup/Restore dữ liệu', targetView: 'sys_backup' },
            { icon: 'history', title: 'Log Hệ thống', description: 'Xem nhật ký hoạt động', targetView: 'sys_audit_trail' },
        ],
    },

    // PHÂN HỆ MÃ THỐNG KÊ
    dimension: {
        title: 'Phân hệ Mã Thống kê',
        description: 'Quản lý 5 chiều thống kê tùy chỉnh giúp phân tích số liệu chi tiết theo TT 24/2024/TT-BTC. Hỗ trợ cấu hình linh hoạt tên gọi và tính bắt buộc cho từng chiều.',
        icon: 'list_alt',
        iconColor: 'purple',
        workflow: [
            { icon: 'settings_suggest', title: 'Cấu hình', description: 'Thiết lập tên và trạng thái các chiều', color: 'blue', targetView: 'dim_config' },
            { icon: 'playlist_add', title: 'Khai báo Mã', description: 'Nhập các mã thống kê cụ thể', color: 'amber', targetView: 'dim_list' },
            { icon: 'group_work', title: 'Phân nhóm', description: 'Nhóm các mã để báo cáo tổng hợp', color: 'green', targetView: 'dim_group' },
            { icon: 'analytics', title: 'Theo dõi', description: 'Sử dụng mã trong chứng từ, báo cáo', color: 'teal', targetView: 'voucher' },
        ],
        features: [
            { icon: 'list', title: '5 Chiều Thống kê', description: 'Quản lý tối đa 5 chiều phân tích độc lập', targetView: 'dim_list' },
            { icon: 'tune', title: 'Cấu hình Label', description: 'Tùy chỉnh tên hiển thị theo thực tế đơn vị', targetView: 'dim_config' },
            { icon: 'rule', title: 'Tính Bắt buộc', description: 'Ràng buộc nhập liệu theo từng tài khoản', targetView: 'dim_config' },
            { icon: 'group_work', title: 'Nhóm Mã TK', description: 'Phân cấp mã thống kê theo nhiều cấp', targetView: 'dim_group' },
            { icon: 'history', title: 'Nhật ký Thay đổi', description: 'Lưu trữ lịch sử chỉnh sửa cấu hình', targetView: 'sys_audit_trail' },
            { icon: 'table_chart', title: 'Báo cáo Đa chiều', description: 'Tổng hợp số liệu theo nhiều tiêu chí', targetView: 'balance_sheet_hcsn' },
        ],
    },
};

export default MODULE_CONFIGS;
