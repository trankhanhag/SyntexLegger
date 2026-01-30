/**
 * Excel Template Generator
 * SyntexLegger - Generate sample Excel files for data import
 * Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

export interface TemplateColumn {
    header: string;
    key: string;
    width: number;
    sampleData: any[];
    description?: string;
    required?: boolean;
}

export interface TemplateDefinition {
    name: string;
    fileName: string;
    sheetName: string;
    columns: TemplateColumn[];
    instructions?: string[];
}

// ==================== TEMPLATE DEFINITIONS ====================

export const VOUCHER_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập chứng từ kế toán',
    fileName: 'mau_nhap_chung_tu.xlsx',
    sheetName: 'Chứng từ',
    columns: [
        {
            header: 'Số CT',
            key: 'doc_no',
            width: 15,
            sampleData: ['PC-001', 'PC-001', 'PC-002', 'PC-002', 'PC-002'],
            description: 'Số chứng từ (các dòng cùng số CT sẽ thuộc 1 chứng từ)',
            required: true
        },
        {
            header: 'Ngày CT',
            key: 'doc_date',
            width: 12,
            sampleData: ['15/01/2026', '15/01/2026', '16/01/2026', '16/01/2026', '16/01/2026'],
            description: 'Ngày chứng từ (DD/MM/YYYY)',
            required: true
        },
        {
            header: 'TK Nợ',
            key: 'debit_acc',
            width: 10,
            sampleData: ['111', '642', '621', '133', '621'],
            description: 'Tài khoản ghi Nợ',
            required: true
        },
        {
            header: 'TK Có',
            key: 'credit_acc',
            width: 10,
            sampleData: ['511', '111', '331', '331', '331'],
            description: 'Tài khoản ghi Có',
            required: true
        },
        {
            header: 'Số tiền',
            key: 'amount',
            width: 15,
            sampleData: [10000000, 500000, 5000000, 500000, 3000000],
            description: 'Số tiền phát sinh',
            required: true
        },
        {
            header: 'Diễn giải',
            key: 'description',
            width: 40,
            sampleData: [
                'Thu tiền bán hàng',
                'Chi phí văn phòng',
                'Mua nguyên vật liệu',
                'Thuế GTGT đầu vào',
                'Mua công cụ dụng cụ'
            ],
            description: 'Nội dung nghiệp vụ'
        },
        {
            header: 'Mã đối tượng',
            key: 'partner_code',
            width: 15,
            sampleData: ['KH001', '', 'NCC001', 'NCC001', 'NCC002'],
            description: 'Mã khách hàng/nhà cung cấp'
        },
        {
            header: 'Mục',
            key: 'item_code',
            width: 10,
            sampleData: ['0129', '', '6050', '6050', '6100'],
            description: 'Mã mục lục ngân sách'
        },
        {
            header: 'Khoản mục',
            key: 'sub_item_code',
            width: 10,
            sampleData: ['0001', '', '6051', '6051', '6101'],
            description: 'Mã khoản mục ngân sách'
        },
        {
            header: 'Mã hàng',
            key: 'dim1',
            width: 12,
            sampleData: ['', '', 'NVL001', '', 'CCDC001'],
            description: 'Mã vật tư/hàng hóa'
        }
    ],
    instructions: [
        'Các dòng có cùng "Số CT" sẽ được gộp thành 1 chứng từ',
        'Ngày CT có thể nhập theo định dạng DD/MM/YYYY hoặc YYYY-MM-DD',
        'Số tiền có thể nhập số thuần hoặc có dấu phẩy phân cách hàng nghìn',
        'Mã tài khoản phải tồn tại trong hệ thống tài khoản',
        'Các trường có dấu (*) là bắt buộc'
    ]
};

export const ACCOUNT_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập hệ thống tài khoản',
    fileName: 'mau_nhap_tai_khoan.xlsx',
    sheetName: 'Tài khoản',
    columns: [
        {
            header: 'Mã TK (*)',
            key: 'account_code',
            width: 12,
            sampleData: ['111', '1111', '1112', '112', '131'],
            description: 'Mã tài khoản',
            required: true
        },
        {
            header: 'Tên TK (*)',
            key: 'account_name',
            width: 40,
            sampleData: [
                'Tiền mặt',
                'Tiền Việt Nam',
                'Ngoại tệ',
                'Tiền gửi ngân hàng',
                'Phải thu của khách hàng'
            ],
            description: 'Tên tài khoản',
            required: true
        },
        {
            header: 'TK Cha',
            key: 'parent_account',
            width: 12,
            sampleData: ['', '111', '111', '', ''],
            description: 'Mã tài khoản cấp cha'
        },
        {
            header: 'Loại TK',
            key: 'account_type',
            width: 15,
            sampleData: ['Tài sản', 'Tài sản', 'Tài sản', 'Tài sản', 'Tài sản'],
            description: 'Loại: Tài sản, Nguồn vốn, Doanh thu, Chi phí'
        },
        {
            header: 'Cấp',
            key: 'level',
            width: 8,
            sampleData: [1, 2, 2, 1, 1],
            description: 'Cấp tài khoản (1-4)'
        },
        {
            header: 'TK Tổng hợp',
            key: 'is_parent',
            width: 12,
            sampleData: ['Có', 'Không', 'Không', 'Có', 'Không'],
            description: 'Có/Không - TK tổng hợp không ghi sổ trực tiếp'
        }
    ],
    instructions: [
        'Mã TK phải là duy nhất trong hệ thống',
        'TK con phải có TK cha tồn tại trước',
        'Cấp TK: 1 = TK cấp 1, 2 = TK chi tiết cấp 2, ...',
        'TK Tổng hợp = "Có" sẽ không thể ghi sổ trực tiếp'
    ]
};

export const PARTNER_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập danh mục đối tượng',
    fileName: 'mau_nhap_doi_tuong.xlsx',
    sheetName: 'Đối tượng',
    columns: [
        {
            header: 'Mã ĐT (*)',
            key: 'partner_code',
            width: 15,
            sampleData: ['KH001', 'KH002', 'NCC001', 'NCC002', 'NV001'],
            description: 'Mã đối tượng',
            required: true
        },
        {
            header: 'Tên ĐT (*)',
            key: 'partner_name',
            width: 35,
            sampleData: [
                'Công ty TNHH ABC',
                'Nguyễn Văn A',
                'Công ty CP XYZ',
                'Nhà cung cấp DEF',
                'Trần Thị B'
            ],
            description: 'Tên đối tượng',
            required: true
        },
        {
            header: 'Mã số thuế',
            key: 'tax_code',
            width: 15,
            sampleData: ['0123456789', '', '9876543210', '1234567890', ''],
            description: 'Mã số thuế'
        },
        {
            header: 'Loại ĐT',
            key: 'type',
            width: 15,
            sampleData: ['Khách hàng', 'Khách hàng', 'Nhà cung cấp', 'Nhà cung cấp', 'Nhân viên'],
            description: 'Khách hàng, Nhà cung cấp, Nhân viên, Khác'
        },
        {
            header: 'Địa chỉ',
            key: 'address',
            width: 40,
            sampleData: [
                '123 Nguyễn Huệ, Q1, HCM',
                '456 Lê Lợi, Q3, HCM',
                '789 Trần Hưng Đạo, Q5, HCM',
                'KCN Tân Bình, HCM',
                ''
            ],
            description: 'Địa chỉ liên hệ'
        },
        {
            header: 'Điện thoại',
            key: 'phone',
            width: 15,
            sampleData: ['0901234567', '0912345678', '0923456789', '0934567890', ''],
            description: 'Số điện thoại'
        },
        {
            header: 'Email',
            key: 'email',
            width: 25,
            sampleData: ['abc@email.com', '', 'xyz@email.com', 'def@email.com', ''],
            description: 'Địa chỉ email'
        }
    ],
    instructions: [
        'Mã ĐT phải là duy nhất',
        'Loại ĐT: Khách hàng, Nhà cung cấp, Nhân viên, Khác',
        'Mã số thuế phải đúng 10 hoặc 13 ký tự (nếu có)'
    ]
};

export const MATERIAL_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập danh mục vật tư',
    fileName: 'mau_nhap_vat_tu.xlsx',
    sheetName: 'Vật tư',
    columns: [
        {
            header: 'Mã VT (*)',
            key: 'material_code',
            width: 15,
            sampleData: ['NVL001', 'NVL002', 'CCDC001', 'CCDC002', 'HH001'],
            description: 'Mã vật tư',
            required: true
        },
        {
            header: 'Tên VT (*)',
            key: 'material_name',
            width: 35,
            sampleData: [
                'Thép tấm 2mm',
                'Ống nhựa PVC',
                'Máy khoan cầm tay',
                'Bộ dụng cụ sửa chữa',
                'Bàn làm việc'
            ],
            description: 'Tên vật tư',
            required: true
        },
        {
            header: 'ĐVT',
            key: 'unit',
            width: 10,
            sampleData: ['Kg', 'Mét', 'Cái', 'Bộ', 'Cái'],
            description: 'Đơn vị tính'
        },
        {
            header: 'Nhóm VT',
            key: 'category',
            width: 20,
            sampleData: ['Nguyên vật liệu', 'Nguyên vật liệu', 'CCDC', 'CCDC', 'Hàng hóa'],
            description: 'NVL, CCDC, Hàng hóa, Thành phẩm'
        },
        {
            header: 'TK Kho',
            key: 'account_code',
            width: 10,
            sampleData: ['152', '152', '153', '153', '156'],
            description: 'Tài khoản tồn kho'
        },
        {
            header: 'Đơn giá',
            key: 'unit_price',
            width: 15,
            sampleData: [50000, 25000, 1500000, 800000, 2000000],
            description: 'Đơn giá mua gần nhất'
        },
        {
            header: 'Tồn tối thiểu',
            key: 'min_stock',
            width: 12,
            sampleData: [100, 50, 2, 1, 5],
            description: 'Số lượng tồn tối thiểu'
        }
    ],
    instructions: [
        'Mã VT phải là duy nhất',
        'Nhóm VT: NVL (152), CCDC (153), Hàng hóa (156), Thành phẩm (155)',
        'TK Kho sẽ tự động gán theo nhóm nếu không nhập'
    ]
};

export const FUND_SOURCE_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập Bộ phận / Trung tâm Chi phí',
    fileName: 'mau_nhap_bo_phan.xlsx',
    sheetName: 'Bộ phận',
    columns: [
        {
            header: 'Mã bộ phận (*)',
            key: 'fund_source_code',
            width: 15,
            sampleData: ['BP_SX', 'BP_BH', 'BP_QLDN', 'BP_DA01', 'BP_KHO'],
            description: 'Mã bộ phận / trung tâm chi phí',
            required: true
        },
        {
            header: 'Tên bộ phận (*)',
            key: 'name',
            width: 40,
            sampleData: [
                'Bộ phận Sản xuất',
                'Bộ phận Bán hàng',
                'Quản lý Doanh nghiệp',
                'Dự án 01',
                'Kho vận'
            ],
            description: 'Tên bộ phận / trung tâm chi phí',
            required: true
        },
        {
            header: 'Loại bộ phận',
            key: 'source_type',
            width: 20,
            sampleData: ['Sản xuất', 'Bán hàng', 'Quản lý', 'Dự án', 'Kho'],
            description: 'Sản xuất / Bán hàng / Quản lý / Dự án'
        },
        {
            header: 'TK Chi phí',
            key: 'chapter_code',
            width: 10,
            sampleData: ['621', '641', '642', '154', '627'],
            description: 'Tài khoản chi phí mặc định'
        },
        {
            header: 'Ghi chú',
            key: 'description',
            width: 30,
            sampleData: ['Chi phí NVL trực tiếp', 'Chi phí bán hàng', 'Chi phí QLDN', 'Chi phí dự án đầu tư', 'Chi phí SX chung'],
            description: 'Mô tả chi tiết'
        }
    ],
    instructions: [
        'Mã bộ phận phải là duy nhất',
        'Loại bộ phận: Sản xuất, Bán hàng, Quản lý, Dự án...',
        'TK Chi phí: 621, 622, 627, 641, 642, 154...'
    ]
};

export const BUDGET_ESTIMATE_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập Kế hoạch / Ngân sách nội bộ',
    fileName: 'mau_nhap_ke_hoach_ngan_sach.xlsx',
    sheetName: 'Kế hoạch',
    columns: [
        {
            header: 'Năm (*)',
            key: 'fiscal_year',
            width: 10,
            sampleData: [2026, 2026, 2026, 2026, 2026],
            description: 'Năm tài chính',
            required: true
        },
        {
            header: 'Bộ phận (*)',
            key: 'chapter_code',
            width: 15,
            sampleData: ['BP_SX', 'BP_SX', 'BP_BH', 'BP_QLDN', 'BP_QLDN'],
            description: 'Mã bộ phận',
            required: true
        },
        {
            header: 'Loại',
            key: 'category_code',
            width: 10,
            sampleData: ['CP', 'CP', 'CP', 'CP', 'CP'],
            description: 'Loại: CP (Chi phí), DT (Doanh thu)'
        },
        {
            header: 'Nhóm',
            key: 'section_code',
            width: 10,
            sampleData: ['NVL', 'NC', 'BH', 'VP', 'DV'],
            description: 'Nhóm chi phí / doanh thu'
        },
        {
            header: 'Khoản mục (*)',
            key: 'item_code',
            width: 15,
            sampleData: ['CP_NVL', 'CP_NCTT', 'CP_BH', 'CP_VP', 'CP_DV'],
            description: 'Mã khoản mục',
            required: true
        },
        {
            header: 'Khoản mục chi tiết',
            key: 'sub_item_code',
            width: 15,
            sampleData: ['NVL_CHINH', 'LUONG_SX', 'QUANGCAO', 'VAN_PHONG', 'DIEN_NUOC'],
            description: 'Mã khoản mục chi tiết'
        },
        {
            header: 'Tên khoản mục',
            key: 'item_name',
            width: 35,
            sampleData: [
                'Chi phí NVL chính',
                'Lương nhân công trực tiếp',
                'Chi phí quảng cáo',
                'Chi phí văn phòng phẩm',
                'Chi phí điện nước'
            ],
            description: 'Tên khoản mục'
        },
        {
            header: 'Kế hoạch',
            key: 'allocated_amount',
            width: 18,
            sampleData: [500000000, 300000000, 200000000, 50000000, 100000000],
            description: 'Số tiền kế hoạch',
            required: true
        },
        {
            header: 'Bộ phận chịu CP',
            key: 'fund_source_code',
            width: 12,
            sampleData: ['BP_SX', 'BP_SX', 'BP_BH', 'BP_QLDN', 'BP_QLDN'],
            description: 'Mã bộ phận chịu chi phí'
        }
    ],
    instructions: [
        'Mỗi dòng là một khoản mục kế hoạch/ngân sách',
        'Bộ phận: Mã bộ phận/trung tâm chi phí trong danh mục',
        'Kế hoạch: Số tiền kế hoạch cho khoản mục này',
        'Bộ phận chịu CP phải tồn tại trong danh mục bộ phận'
    ]
};

export const CASH_RECEIPT_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập phiếu thu',
    fileName: 'mau_nhap_phieu_thu.xlsx',
    sheetName: 'Phiếu thu',
    columns: [
        {
            header: 'Số PT (*)',
            key: 'doc_no',
            width: 12,
            sampleData: ['PT001', 'PT001', 'PT002', 'PT003', 'PT003'],
            description: 'Số phiếu thu (các dòng cùng số PT thuộc 1 phiếu)',
            required: true
        },
        {
            header: 'Ngày CT (*)',
            key: 'doc_date',
            width: 12,
            sampleData: ['15/01/2026', '15/01/2026', '16/01/2026', '17/01/2026', '17/01/2026'],
            description: 'Ngày chứng từ (DD/MM/YYYY)',
            required: true
        },
        {
            header: 'Người nộp tiền',
            key: 'payer_name',
            width: 25,
            sampleData: ['Nguyễn Văn A', 'Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Lê Văn C'],
            description: 'Tên người nộp tiền'
        },
        {
            header: 'Đơn vị/Khách hàng',
            key: 'object_name',
            width: 30,
            sampleData: ['Công ty ABC', 'Công ty ABC', 'Cá nhân', 'Công ty XYZ', 'Công ty XYZ'],
            description: 'Tên đơn vị/khách hàng'
        },
        {
            header: 'Địa chỉ',
            key: 'address',
            width: 35,
            sampleData: ['123 Nguyễn Huệ, Q1', '123 Nguyễn Huệ, Q1', '', '456 Lê Lợi, Q3', '456 Lê Lợi, Q3'],
            description: 'Địa chỉ người nộp tiền'
        },
        {
            header: 'Lý do nộp (*)',
            key: 'reason',
            width: 40,
            sampleData: [
                'Thu tiền bán hàng HĐ001',
                'Thu thuế GTGT HĐ001',
                'Thu tiền tạm ứng',
                'Thu tiền dịch vụ tư vấn',
                'Thu thuế GTGT dịch vụ'
            ],
            description: 'Lý do thu tiền',
            required: true
        },
        {
            header: 'TK Nợ (*)',
            key: 'debit_acc',
            width: 10,
            sampleData: ['1111', '1111', '1111', '1111', '1111'],
            description: 'Tài khoản ghi Nợ (thường là 111)',
            required: true
        },
        {
            header: 'TK Có (*)',
            key: 'credit_acc',
            width: 10,
            sampleData: ['131', '3331', '141', '511', '3331'],
            description: 'Tài khoản ghi Có',
            required: true
        },
        {
            header: 'Số tiền (*)',
            key: 'amount',
            width: 15,
            sampleData: [10000000, 1000000, 5000000, 20000000, 2000000],
            description: 'Số tiền thu',
            required: true
        },
        {
            header: 'Mục',
            key: 'item_code',
            width: 10,
            sampleData: ['0129', '0129', '', '0149', '0149'],
            description: 'Mã mục ngân sách'
        },
        {
            header: 'Khoản mục',
            key: 'sub_item_code',
            width: 10,
            sampleData: ['0001', '0002', '', '0001', '0002'],
            description: 'Mã khoản mục ngân sách'
        }
    ],
    instructions: [
        'Các dòng có cùng "Số PT" sẽ được gộp thành 1 phiếu thu',
        'Thông tin Người nộp, Đơn vị, Địa chỉ lấy từ dòng đầu tiên của mỗi phiếu',
        'TK Nợ thường là 1111 (Tiền mặt VND) hoặc 1121 (TGNH)',
        'Ngày CT có thể nhập DD/MM/YYYY hoặc YYYY-MM-DD',
        'Số tiền có thể nhập số thuần hoặc có dấu phẩy phân cách'
    ]
};

export const CASH_PAYMENT_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập phiếu chi',
    fileName: 'mau_nhap_phieu_chi.xlsx',
    sheetName: 'Phiếu chi',
    columns: [
        {
            header: 'Số PC (*)',
            key: 'doc_no',
            width: 12,
            sampleData: ['PC001', 'PC001', 'PC002', 'PC003', 'PC003'],
            description: 'Số phiếu chi (các dòng cùng số PC thuộc 1 phiếu)',
            required: true
        },
        {
            header: 'Ngày CT (*)',
            key: 'doc_date',
            width: 12,
            sampleData: ['15/01/2026', '15/01/2026', '16/01/2026', '17/01/2026', '17/01/2026'],
            description: 'Ngày chứng từ (DD/MM/YYYY)',
            required: true
        },
        {
            header: 'Người nhận tiền',
            key: 'payee_name',
            width: 25,
            sampleData: ['Trần Văn B', 'Trần Văn B', 'Lê Thị C', 'Nguyễn Văn D', 'Nguyễn Văn D'],
            description: 'Tên người nhận tiền'
        },
        {
            header: 'Đơn vị/Nhà cung cấp',
            key: 'object_name',
            width: 30,
            sampleData: ['NCC ABC', 'NCC ABC', 'Nhân viên', 'NCC XYZ', 'NCC XYZ'],
            description: 'Tên đơn vị/nhà cung cấp'
        },
        {
            header: 'Địa chỉ',
            key: 'address',
            width: 35,
            sampleData: ['789 Hai Bà Trưng, Q1', '789 Hai Bà Trưng, Q1', '', '321 CMT8, Q10', '321 CMT8, Q10'],
            description: 'Địa chỉ người nhận tiền'
        },
        {
            header: 'Lý do chi (*)',
            key: 'reason',
            width: 40,
            sampleData: [
                'Thanh toán tiền hàng HĐ002',
                'Thuế GTGT HĐ002',
                'Tạm ứng công tác phí',
                'Thanh toán dịch vụ điện nước',
                'Thuế GTGT điện nước'
            ],
            description: 'Lý do chi tiền',
            required: true
        },
        {
            header: 'TK Nợ (*)',
            key: 'debit_acc',
            width: 10,
            sampleData: ['331', '133', '141', '642', '133'],
            description: 'Tài khoản ghi Nợ',
            required: true
        },
        {
            header: 'TK Có (*)',
            key: 'credit_acc',
            width: 10,
            sampleData: ['1111', '1111', '1111', '1111', '1111'],
            description: 'Tài khoản ghi Có (thường là 111)',
            required: true
        },
        {
            header: 'Số tiền (*)',
            key: 'amount',
            width: 15,
            sampleData: [15000000, 1500000, 3000000, 8000000, 800000],
            description: 'Số tiền chi',
            required: true
        },
        {
            header: 'Mục',
            key: 'item_code',
            width: 10,
            sampleData: ['6050', '6050', '', '6100', '6100'],
            description: 'Mã mục ngân sách'
        },
        {
            header: 'Khoản mục',
            key: 'sub_item_code',
            width: 10,
            sampleData: ['6051', '6051', '', '6101', '6101'],
            description: 'Mã khoản mục ngân sách'
        }
    ],
    instructions: [
        'Các dòng có cùng "Số PC" sẽ được gộp thành 1 phiếu chi',
        'Thông tin Người nhận, Đơn vị, Địa chỉ lấy từ dòng đầu tiên của mỗi phiếu',
        'TK Có thường là 1111 (Tiền mặt VND) hoặc 1121 (TGNH)',
        'Ngày CT có thể nhập DD/MM/YYYY hoặc YYYY-MM-DD',
        'Số tiền có thể nhập số thuần hoặc có dấu phẩy phân cách'
    ]
};

export const EMPLOYEE_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập danh sách nhân viên',
    fileName: 'mau_nhap_nhan_vien.xlsx',
    sheetName: 'Nhân viên',
    columns: [
        { header: 'Mã NV (*)', key: 'employee_code', width: 12, sampleData: ['NV001', 'NV002', 'NV003', 'NV004', 'NV005'], description: 'Mã nhân viên', required: true },
        { header: 'Họ tên (*)', key: 'full_name', width: 25, sampleData: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'], description: 'Họ và tên đầy đủ', required: true },
        { header: 'Phòng ban', key: 'department', width: 20, sampleData: ['Kế toán', 'Hành chính', 'Kỹ thuật', 'Kinh doanh', 'Nhân sự'], description: 'Tên phòng ban' },
        { header: 'Chức vụ', key: 'position', width: 20, sampleData: ['Nhân viên', 'Trưởng phòng', 'Nhân viên', 'Phó phòng', 'Nhân viên'], description: 'Chức vụ' },
        { header: 'Ngày sinh', key: 'birth_date', width: 12, sampleData: ['15/03/1990', '20/05/1985', '10/08/1992', '25/12/1988', '05/07/1995'], description: 'Ngày sinh (DD/MM/YYYY)' },
        { header: 'Giới tính', key: 'gender', width: 10, sampleData: ['Nam', 'Nữ', 'Nam', 'Nữ', 'Nam'], description: 'Nam/Nữ' },
        { header: 'CCCD/CMND', key: 'id_number', width: 15, sampleData: ['001090012345', '001085067890', '001092011111', '001088022222', '001095033333'], description: 'Số CCCD/CMND' },
        { header: 'Ngày vào làm', key: 'hire_date', width: 12, sampleData: ['01/01/2020', '15/06/2018', '01/03/2021', '01/09/2019', '01/07/2022'], description: 'Ngày bắt đầu làm việc' },
        { header: 'Lương cơ bản', key: 'base_salary', width: 15, sampleData: [8000000, 15000000, 10000000, 12000000, 7000000], description: 'Mức lương cơ bản' },
        { header: 'Số TK ngân hàng', key: 'bank_account', width: 18, sampleData: ['0123456789', '9876543210', '1111222233', '4444555566', '7777888899'], description: 'Số tài khoản nhận lương' },
        { header: 'Ngân hàng', key: 'bank_name', width: 15, sampleData: ['Vietcombank', 'Techcombank', 'BIDV', 'VPBank', 'MB Bank'], description: 'Tên ngân hàng' }
    ],
    instructions: [
        'Mã NV phải là duy nhất trong hệ thống',
        'Ngày sinh, ngày vào làm có thể nhập DD/MM/YYYY hoặc YYYY-MM-DD',
        'Giới tính: Nam hoặc Nữ',
        'Lương cơ bản có thể nhập số thuần hoặc có dấu phẩy phân cách'
    ]
};

export const TIMEKEEPING_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập chấm công',
    fileName: 'mau_nhap_cham_cong.xlsx',
    sheetName: 'Chấm công',
    columns: [
        { header: 'Mã NV (*)', key: 'employee_code', width: 12, sampleData: ['NV001', 'NV001', 'NV002', 'NV002', 'NV003'], description: 'Mã nhân viên', required: true },
        { header: 'Tháng (*)', key: 'month', width: 10, sampleData: [1, 1, 1, 1, 1], description: 'Tháng (1-12)', required: true },
        { header: 'Năm (*)', key: 'year', width: 10, sampleData: [2026, 2026, 2026, 2026, 2026], description: 'Năm', required: true },
        { header: 'Ngày công', key: 'work_days', width: 12, sampleData: [22, 22, 20, 21, 22], description: 'Số ngày công thực tế' },
        { header: 'Ngày phép', key: 'leave_days', width: 12, sampleData: [0, 0, 2, 1, 0], description: 'Số ngày nghỉ phép' },
        { header: 'Ngày nghỉ KL', key: 'unpaid_leave', width: 12, sampleData: [0, 0, 0, 0, 0], description: 'Nghỉ không lương' },
        { header: 'Giờ OT', key: 'overtime_hours', width: 12, sampleData: [10, 5, 0, 8, 12], description: 'Số giờ làm thêm' }
    ],
    instructions: [
        'Mỗi dòng là dữ liệu chấm công của 1 nhân viên trong 1 tháng',
        'Mã NV phải tồn tại trong danh sách nhân viên',
        'Ngày công + Ngày phép + Ngày nghỉ KL = Tổng ngày trong tháng'
    ]
};

export const EXPENSE_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập chứng từ chi phí',
    fileName: 'mau_nhap_chi_phi.xlsx',
    sheetName: 'Chi phí',
    columns: [
        { header: 'Số CT (*)', key: 'doc_no', width: 12, sampleData: ['CP001', 'CP001', 'CP002', 'CP003', 'CP003'], description: 'Số chứng từ', required: true },
        { header: 'Ngày CT (*)', key: 'doc_date', width: 12, sampleData: ['15/01/2026', '15/01/2026', '16/01/2026', '17/01/2026', '17/01/2026'], description: 'Ngày chứng từ', required: true },
        { header: 'Loại chi phí', key: 'expense_type', width: 20, sampleData: ['Văn phòng phẩm', 'Văn phòng phẩm', 'Điện nước', 'Công tác phí', 'Công tác phí'], description: 'Phân loại chi phí' },
        { header: 'Diễn giải (*)', key: 'description', width: 40, sampleData: ['Mua giấy in A4', 'Mua bút viết', 'Tiền điện T1/2026', 'Vé máy bay HN-HCM', 'Tiền khách sạn'], description: 'Nội dung chi phí', required: true },
        { header: 'TK Nợ (*)', key: 'debit_acc', width: 10, sampleData: ['6421', '6421', '6427', '6422', '6422'], description: 'Tài khoản chi phí', required: true },
        { header: 'TK Có (*)', key: 'credit_acc', width: 10, sampleData: ['1111', '1111', '331', '141', '141'], description: 'Tài khoản đối ứng', required: true },
        { header: 'Số tiền (*)', key: 'amount', width: 15, sampleData: [500000, 200000, 3000000, 2500000, 1500000], description: 'Số tiền', required: true },
        { header: 'Mã đối tượng', key: 'partner_code', width: 12, sampleData: ['', '', 'NCC001', '', ''], description: 'Mã nhà cung cấp' },
        { header: 'Phòng ban', key: 'department', width: 15, sampleData: ['Hành chính', 'Hành chính', '', 'Kinh doanh', 'Kinh doanh'], description: 'Phòng ban chịu chi phí' }
    ],
    instructions: [
        'Các dòng có cùng "Số CT" sẽ được gộp thành 1 chứng từ',
        'Loại chi phí: Văn phòng phẩm, Điện nước, Công tác phí, Thuê mướn, Khác...',
        'TK Nợ thường là 641, 642, 627 (chi phí)',
        'TK Có thường là 111, 112, 331, 141'
    ]
};

export const REVENUE_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập chứng từ Doanh thu',
    fileName: 'mau_nhap_doanh_thu.xlsx',
    sheetName: 'Doanh thu',
    columns: [
        { header: 'Số CT (*)', key: 'doc_no', width: 12, sampleData: ['DT001', 'DT001', 'DT002', 'DT003', 'DT003'], description: 'Số chứng từ', required: true },
        { header: 'Ngày CT (*)', key: 'doc_date', width: 12, sampleData: ['15/01/2026', '15/01/2026', '16/01/2026', '17/01/2026', '17/01/2026'], description: 'Ngày chứng từ', required: true },
        { header: 'Loại doanh thu', key: 'revenue_type', width: 20, sampleData: ['Bán hàng', 'Bán hàng', 'Dịch vụ', 'Dịch vụ', 'Hoạt động TC'], description: 'Phân loại doanh thu' },
        { header: 'Diễn giải (*)', key: 'description', width: 40, sampleData: ['Bán hàng hóa', 'Thuế GTGT đầu ra', 'Phí dịch vụ tư vấn', 'Dịch vụ vận chuyển', 'Lãi tiền gửi'], description: 'Nội dung doanh thu', required: true },
        { header: 'TK Nợ (*)', key: 'debit_acc', width: 10, sampleData: ['131', '131', '131', '1111', '1121'], description: 'Tài khoản ghi Nợ', required: true },
        { header: 'TK Có (*)', key: 'credit_acc', width: 10, sampleData: ['5111', '33311', '5113', '5113', '515'], description: 'Tài khoản doanh thu', required: true },
        { header: 'Số tiền (*)', key: 'amount', width: 15, sampleData: [50000000, 5000000, 10000000, 5000000, 1000000], description: 'Số tiền doanh thu', required: true },
        { header: 'Mã khách hàng', key: 'partner_code', width: 12, sampleData: ['KH001', 'KH001', 'KH002', '', ''], description: 'Mã khách hàng' },
        { header: 'Bộ phận', key: 'fund_source', width: 12, sampleData: ['BP_BH', 'BP_BH', 'BP_DV', 'BP_DV', 'BP_QLDN'], description: 'Mã bộ phận' }
    ],
    instructions: [
        'Các dòng có cùng "Số CT" sẽ được gộp thành 1 chứng từ',
        'Loại doanh thu: Bán hàng, Dịch vụ, Hoạt động tài chính, Thu nhập khác...',
        'TK Có thường là 511, 515, 711 (doanh thu theo TT 99/2025)',
        'Bộ phận: Mã bộ phận/trung tâm chi phí'
    ]
};

export const ASSET_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập tài sản cố định',
    fileName: 'mau_nhap_tai_san.xlsx',
    sheetName: 'Tài sản',
    columns: [
        { header: 'Mã TS (*)', key: 'asset_code', width: 15, sampleData: ['TS001', 'TS002', 'TS003', 'TS004', 'TS005'], description: 'Mã tài sản', required: true },
        { header: 'Tên TS (*)', key: 'asset_name', width: 35, sampleData: ['Máy tính Dell Optiplex', 'Máy in HP LaserJet', 'Điều hòa Daikin', 'Bàn làm việc', 'Tủ hồ sơ'], description: 'Tên tài sản', required: true },
        { header: 'Loại TS', key: 'asset_type', width: 15, sampleData: ['Máy tính', 'Máy in', 'Điều hòa', 'Bàn ghế', 'Tủ kệ'], description: 'Phân loại tài sản' },
        { header: 'Ngày mua', key: 'purchase_date', width: 12, sampleData: ['01/01/2024', '15/03/2024', '01/06/2024', '01/01/2023', '01/01/2023'], description: 'Ngày mua/hình thành' },
        { header: 'Nguyên giá (*)', key: 'original_value', width: 15, sampleData: [15000000, 8000000, 20000000, 3000000, 5000000], description: 'Nguyên giá tài sản', required: true },
        { header: 'Thời gian KH', key: 'useful_life', width: 12, sampleData: [5, 5, 8, 8, 8], description: 'Số năm khấu hao' },
        { header: 'TK Tài sản', key: 'asset_account', width: 10, sampleData: ['2111', '2111', '2112', '2113', '2113'], description: 'Tài khoản TSCĐ (211x)' },
        { header: 'Vị trí', key: 'location', width: 20, sampleData: ['Phòng Kế toán', 'Phòng HC', 'Phòng họp A', 'Phòng Kế toán', 'Kho'], description: 'Vị trí sử dụng' },
        { header: 'Bộ phận quản lý', key: 'fund_source', width: 12, sampleData: ['BP_KT', 'BP_HC', 'BP_KD', 'BP_KT', 'BP_KHO'], description: 'Bộ phận quản lý tài sản' },
        { header: 'Ghi chú', key: 'note', width: 30, sampleData: ['Core i5, 8GB RAM', 'In 2 mặt', '12000 BTU', '', '4 ngăn'], description: 'Mô tả chi tiết' }
    ],
    instructions: [
        'Mã TS phải là duy nhất',
        'Nguyên giá là giá trị ban đầu của tài sản',
        'Thời gian KH: Số năm khấu hao theo quy định',
        'TK Tài sản: 2111 (Nhà cửa), 2112 (Máy móc), 2113 (PTVC), 2114 (Thiết bị), 2118 (TSCĐ khác)'
    ]
};

export const DEBT_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập công nợ',
    fileName: 'mau_nhap_cong_no.xlsx',
    sheetName: 'Công nợ',
    columns: [
        { header: 'Số CT (*)', key: 'doc_no', width: 12, sampleData: ['CN001', 'CN002', 'CN003', 'CN004', 'CN005'], description: 'Số chứng từ', required: true },
        { header: 'Ngày CT (*)', key: 'doc_date', width: 12, sampleData: ['01/01/2026', '05/01/2026', '10/01/2026', '15/01/2026', '20/01/2026'], description: 'Ngày chứng từ', required: true },
        { header: 'Loại công nợ (*)', key: 'debt_type', width: 15, sampleData: ['Phải thu', 'Phải trả', 'Tạm ứng', 'Phải thu', 'Phải trả'], description: 'Phải thu/Phải trả/Tạm ứng', required: true },
        { header: 'Mã đối tượng (*)', key: 'partner_code', width: 12, sampleData: ['KH001', 'NCC001', 'NV001', 'KH002', 'NCC002'], description: 'Mã khách hàng/NCC/NV', required: true },
        { header: 'Tên đối tượng', key: 'partner_name', width: 25, sampleData: ['Công ty ABC', 'NCC XYZ', 'Nguyễn Văn A', 'Công ty DEF', 'NCC MNO'], description: 'Tên đối tượng' },
        { header: 'Diễn giải', key: 'description', width: 35, sampleData: ['Tiền hàng HĐ001', 'Mua VPP', 'Tạm ứng công tác', 'Tiền dịch vụ', 'Mua thiết bị'], description: 'Nội dung công nợ' },
        { header: 'Số tiền (*)', key: 'amount', width: 15, sampleData: [50000000, 10000000, 5000000, 30000000, 20000000], description: 'Số tiền công nợ', required: true },
        { header: 'Ngày đến hạn', key: 'due_date', width: 12, sampleData: ['31/01/2026', '15/01/2026', '31/01/2026', '28/02/2026', '31/01/2026'], description: 'Ngày đến hạn thanh toán' },
        { header: 'TK Công nợ', key: 'account_code', width: 10, sampleData: ['131', '331', '141', '131', '331'], description: 'Tài khoản công nợ' }
    ],
    instructions: [
        'Loại công nợ: Phải thu (131), Phải trả (331), Tạm ứng (141)',
        'Mã đối tượng phải tồn tại trong danh mục đối tượng',
        'Dùng để nhập số dư đầu kỳ hoặc các bút toán công nợ'
    ]
};

export const CONTRACT_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập hợp đồng',
    fileName: 'mau_nhap_hop_dong.xlsx',
    sheetName: 'Hợp đồng',
    columns: [
        { header: 'Số HĐ (*)', key: 'contract_no', width: 15, sampleData: ['HD001/2026', 'HD002/2026', 'HD003/2026', 'HD004/2026', 'HD005/2026'], description: 'Số hợp đồng', required: true },
        { header: 'Tên HĐ (*)', key: 'contract_name', width: 35, sampleData: ['HĐ mua máy tính', 'HĐ thuê văn phòng', 'HĐ bảo trì CNTT', 'HĐ cung cấp VPP', 'HĐ xây dựng'], description: 'Tên hợp đồng', required: true },
        { header: 'Loại HĐ', key: 'contract_type', width: 12, sampleData: ['Mua', 'Thuê', 'Dịch vụ', 'Mua', 'Xây dựng'], description: 'Mua/Bán/Thuê/Dịch vụ' },
        { header: 'Mã đối tác (*)', key: 'partner_code', width: 12, sampleData: ['NCC001', 'NCC002', 'NCC003', 'NCC004', 'NCC005'], description: 'Mã nhà cung cấp/khách hàng', required: true },
        { header: 'Ngày ký', key: 'sign_date', width: 12, sampleData: ['01/01/2026', '15/01/2026', '01/02/2026', '01/03/2026', '15/03/2026'], description: 'Ngày ký hợp đồng' },
        { header: 'Ngày hiệu lực', key: 'start_date', width: 12, sampleData: ['01/01/2026', '01/02/2026', '01/02/2026', '01/03/2026', '01/04/2026'], description: 'Ngày bắt đầu hiệu lực' },
        { header: 'Ngày kết thúc', key: 'end_date', width: 12, sampleData: ['31/12/2026', '31/01/2027', '31/01/2027', '31/12/2026', '31/12/2026'], description: 'Ngày hết hiệu lực' },
        { header: 'Giá trị HĐ (*)', key: 'contract_value', width: 15, sampleData: [150000000, 60000000, 24000000, 50000000, 500000000], description: 'Tổng giá trị hợp đồng', required: true },
        { header: 'Bộ phận', key: 'fund_source', width: 12, sampleData: ['BP_KD', 'BP_HC', 'BP_IT', 'BP_HC', 'BP_DA'], description: 'Bộ phận quản lý' },
        { header: 'Ghi chú', key: 'note', width: 30, sampleData: ['', 'Thanh toán theo tháng', 'Gia hạn hàng năm', '', 'Dự án A'], description: 'Ghi chú' }
    ],
    instructions: [
        'Số HĐ phải là duy nhất',
        'Loại HĐ: Mua, Bán, Thuê, Dịch vụ, Xây dựng...',
        'Mã đối tác phải tồn tại trong danh mục đối tượng'
    ]
};

export const PROJECT_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập dự án',
    fileName: 'mau_nhap_du_an.xlsx',
    sheetName: 'Dự án',
    columns: [
        { header: 'Mã DA (*)', key: 'project_code', width: 12, sampleData: ['DA001', 'DA002', 'DA003', 'DA004', 'DA005'], description: 'Mã dự án', required: true },
        { header: 'Tên DA (*)', key: 'project_name', width: 40, sampleData: ['Dự án CNTT 2026', 'Dự án nâng cấp hạ tầng', 'Dự án đào tạo', 'Dự án nghiên cứu', 'Dự án xây dựng'], description: 'Tên dự án', required: true },
        { header: 'Loại DA', key: 'project_type', width: 15, sampleData: ['Đầu tư', 'Thường xuyên', 'Đào tạo', 'Nghiên cứu', 'Xây dựng'], description: 'Phân loại dự án' },
        { header: 'Chủ đầu tư', key: 'owner', width: 25, sampleData: ['Đơn vị ABC', 'Đơn vị ABC', 'Sở GD&ĐT', 'Bộ KH&CN', 'UBND Tỉnh'], description: 'Chủ đầu tư/Chủ quản' },
        { header: 'Ngày bắt đầu', key: 'start_date', width: 12, sampleData: ['01/01/2026', '01/03/2026', '01/06/2026', '01/01/2026', '01/04/2026'], description: 'Ngày bắt đầu' },
        { header: 'Ngày kết thúc', key: 'end_date', width: 12, sampleData: ['31/12/2026', '31/12/2026', '31/12/2026', '31/12/2027', '31/12/2027'], description: 'Ngày kết thúc dự kiến' },
        { header: 'Tổng mức ĐT', key: 'total_budget', width: 18, sampleData: [500000000, 200000000, 100000000, 300000000, 1000000000], description: 'Tổng mức đầu tư' },
        { header: 'Bộ phận', key: 'fund_source', width: 12, sampleData: ['BP_DA', 'BP_KT', 'BP_DT', 'BP_NC', 'BP_XD'], description: 'Bộ phận thực hiện' },
        { header: 'Trạng thái', key: 'status', width: 15, sampleData: ['Đang thực hiện', 'Chuẩn bị', 'Chờ phê duyệt', 'Đang thực hiện', 'Chuẩn bị'], description: 'Trạng thái dự án' },
        { header: 'Ghi chú', key: 'note', width: 30, sampleData: ['', '', 'Chương trình 135', 'Đề tài cấp Bộ', ''], description: 'Ghi chú' }
    ],
    instructions: [
        'Mã DA phải là duy nhất',
        'Loại DA: Đầu tư, Thường xuyên, Đào tạo, Nghiên cứu, Xây dựng...',
        'Trạng thái: Chuẩn bị, Đang thực hiện, Tạm dừng, Hoàn thành, Hủy'
    ]
};

export const DIMENSION_TEMPLATE: TemplateDefinition = {
    name: 'Mẫu nhập mã thống kê',
    fileName: 'mau_nhap_ma_thong_ke.xlsx',
    sheetName: 'Mã thống kê',
    columns: [
        {
            header: 'Mã (*)',
            key: 'code',
            width: 15,
            sampleData: ['PB001', 'PB002', 'DA001', 'DA002', 'KH001'],
            description: 'Mã thống kê (duy nhất)',
            required: true
        },
        {
            header: 'Tên (*)',
            key: 'name',
            width: 40,
            sampleData: [
                'Phòng Kế toán',
                'Phòng Hành chính',
                'Dự án ABC',
                'Dự án XYZ',
                'Khoản mục chi thường xuyên'
            ],
            description: 'Tên mã thống kê',
            required: true
        },
        {
            header: 'Chiều',
            key: 'type',
            width: 10,
            sampleData: [1, 1, 2, 2, 3],
            description: 'Số chiều thống kê (1-5)'
        },
        {
            header: 'Mô tả',
            key: 'description',
            width: 50,
            sampleData: [
                'Phòng kế toán tài chính',
                'Phòng hành chính nhân sự',
                'Dự án phát triển phần mềm ABC',
                'Dự án triển khai XYZ',
                'Chi phí quản lý thường xuyên'
            ],
            description: 'Mô tả chi tiết'
        }
    ],
    instructions: [
        'Mã phải là duy nhất trong cùng một chiều thống kê',
        'Chiều: 1 = Phòng ban, 2 = Dự án, 3 = Khoản mục, 4 = Nguồn, 5 = Khác (tùy cấu hình)',
        'Nếu không nhập Chiều, hệ thống sẽ dùng chiều đang được chọn trên màn hình',
        'Có thể nhập nhiều chiều cùng lúc bằng cách thay đổi giá trị cột Chiều'
    ]
};

// ==================== TEMPLATE GENERATOR ====================

/**
 * Generate and download Excel template
 */
export async function downloadExcelTemplate(template: TemplateDefinition): Promise<void> {
    // Dynamic import xlsx
    const XLSX = await import('xlsx');

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare data with headers
    const headers = template.columns.map(col => col.header);
    const sampleRows: any[][] = [];

    // Get max sample data length
    const maxRows = Math.max(...template.columns.map(col => col.sampleData.length));

    for (let i = 0; i < maxRows; i++) {
        const row = template.columns.map(col => col.sampleData[i] ?? '');
        sampleRows.push(row);
    }

    // Create main data sheet
    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = template.columns.map(col => ({ wch: col.width }));

    // Add main sheet
    XLSX.utils.book_append_sheet(wb, ws, template.sheetName);

    // Create instructions sheet
    if (template.instructions && template.instructions.length > 0) {
        const instructionData: any[][] = [
            ['HƯỚNG DẪN SỬ DỤNG'],
            [''],
            ['Các cột trong file:'],
            ['']
        ];

        // Add column descriptions
        template.columns.forEach(col => {
            const required = col.required ? ' (*)' : '';
            instructionData.push([`${col.header}${required}`, col.description || '']);
        });

        instructionData.push(['']);
        instructionData.push(['Lưu ý:']);

        template.instructions.forEach(inst => {
            instructionData.push([`• ${inst}`]);
        });

        instructionData.push(['']);
        instructionData.push(['(*) Các trường bắt buộc phải nhập']);

        const wsInstructions = XLSX.utils.aoa_to_sheet(instructionData);
        wsInstructions['!cols'] = [{ wch: 25 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Hướng dẫn');
    }

    // Download file
    XLSX.writeFile(wb, template.fileName);
}

/**
 * Get all available templates
 */
export function getAvailableTemplates(): { key: string; template: TemplateDefinition }[] {
    return [
        { key: 'voucher', template: VOUCHER_TEMPLATE },
        { key: 'cash_receipt', template: CASH_RECEIPT_TEMPLATE },
        { key: 'cash_payment', template: CASH_PAYMENT_TEMPLATE },
        { key: 'account', template: ACCOUNT_TEMPLATE },
        { key: 'partner', template: PARTNER_TEMPLATE },
        { key: 'material', template: MATERIAL_TEMPLATE },
        { key: 'fund_source', template: FUND_SOURCE_TEMPLATE },
        { key: 'budget_estimate', template: BUDGET_ESTIMATE_TEMPLATE },
        { key: 'dimension', template: DIMENSION_TEMPLATE },
        { key: 'employee', template: EMPLOYEE_TEMPLATE },
        { key: 'timekeeping', template: TIMEKEEPING_TEMPLATE },
        { key: 'expense', template: EXPENSE_TEMPLATE },
        { key: 'revenue', template: REVENUE_TEMPLATE },
        { key: 'asset', template: ASSET_TEMPLATE },
        { key: 'debt', template: DEBT_TEMPLATE },
        { key: 'contract', template: CONTRACT_TEMPLATE },
        { key: 'project', template: PROJECT_TEMPLATE }
    ];
}

/**
 * Download template by key
 */
export async function downloadTemplateByKey(key: string): Promise<void> {
    const templates: Record<string, TemplateDefinition> = {
        voucher: VOUCHER_TEMPLATE,
        cash_receipt: CASH_RECEIPT_TEMPLATE,
        cash_payment: CASH_PAYMENT_TEMPLATE,
        account: ACCOUNT_TEMPLATE,
        partner: PARTNER_TEMPLATE,
        material: MATERIAL_TEMPLATE,
        fund_source: FUND_SOURCE_TEMPLATE,
        budget_estimate: BUDGET_ESTIMATE_TEMPLATE,
        dimension: DIMENSION_TEMPLATE,
        employee: EMPLOYEE_TEMPLATE,
        timekeeping: TIMEKEEPING_TEMPLATE,
        expense: EXPENSE_TEMPLATE,
        revenue: REVENUE_TEMPLATE,
        asset: ASSET_TEMPLATE,
        debt: DEBT_TEMPLATE,
        contract: CONTRACT_TEMPLATE,
        project: PROJECT_TEMPLATE
    };

    const template = templates[key];
    if (template) {
        await downloadExcelTemplate(template);
    } else {
        throw new Error(`Template "${key}" not found`);
    }
}
