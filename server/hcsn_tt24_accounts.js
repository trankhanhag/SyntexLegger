// Hệ thống tài khoản Kế toán Hành chính Sự nghiệp
// Theo Thông tư 24/2024/TT-BTC (Hiệu lực từ 01/01/2025)
// Ban hành ngày 17/04/2024 bởi Bộ Tài chính

const HCSN_ACCOUNTS_TT24 = [
    // ========================================
    // LOẠI 1: TÀI SẢN (111-158)
    // ========================================

    // TK 111: Tiền mặt
    { code: '111', name: 'Tiền mặt', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },
    { code: '1111', name: 'Tiền Việt Nam', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },
    { code: '1112', name: 'Ngoại tệ', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 112: Tiền gửi Ngân hàng, Kho bạc
    { code: '112', name: 'Tiền gửi Ngân hàng, Kho bạc', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },
    { code: '1121', name: 'Tiền Việt Nam', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },
    { code: '1122', name: 'Ngoại tệ', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 113: Tiền đang chuyển
    { code: '113', name: 'Tiền đang chuyển', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 121: Đầu tư tài chính
    { code: '121', name: 'Đầu tư tài chính', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 131: Phải thu khách hàng
    { code: '131', name: 'Phải thu khách hàng', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 133: Thuế GTGT được khấu trừ
    { code: '133', name: 'Thuế GTGT được khấu trừ', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 135: Phải thu kinh phí được cấp
    { code: '135', name: 'Phải thu kinh phí được cấp', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 136: Phải thu nội bộ
    { code: '136', name: 'Phải thu nội bộ', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 138: Phải thu khác
    { code: '138', name: 'Phải thu khác', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 141: Tạm ứng
    { code: '141', name: 'Tạm ứng', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 151: Nguyên liệu, vật liệu
    { code: '151', name: 'Nguyên liệu, vật liệu', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 152: Công cụ, dụng cụ
    { code: '152', name: 'Công cụ, dụng cụ', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 153: Hàng hóa
    { code: '153', name: 'Hàng hóa', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 154: Chi phí SXKD, dịch vụ dở dang
    { code: '154', name: 'Chi phí SXKD, dịch vụ dở dang', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // TK 155: Thành phẩm
    { code: '155', name: 'Thành phẩm', category: 'TÀI SẢN', type: 'ASSET', tt24_class: 'Loại 1' },

    // ========================================
    // LOẠI 2: TÀI SẢN CỐ ĐỊNH (211-241)
    // ========================================

    { code: '211', name: 'Tài sản cố định hữu hình', category: 'TSCĐ', type: 'ASSET', tt24_class: 'Loại 2' },
    { code: '213', name: 'Tài sản cố định vô hình', category: 'TSCĐ', type: 'ASSET', tt24_class: 'Loại 2' },
    { code: '214', name: 'Hao mòn TSCĐ', category: 'TSCĐ', type: 'ASSET', tt24_class: 'Loại 2' },

    { code: '241', name: 'Xây dựng cơ bản dở dang', category: 'TSCĐ', type: 'ASSET', tt24_class: 'Loại 2' },
    { code: '242', name: 'Chi phí trả trước', category: 'TSCĐ', type: 'ASSET', tt24_class: 'Loại 2' },

    // ========================================
    // LOẠI 3: NỢ PHẢI TRẢ (331-366)
    // ========================================

    { code: '331', name: 'Phải trả cho người bán', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '332', name: 'Các khoản phải nộp theo lương', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '3321', name: 'Bảo hiểm xã hội', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '3322', name: 'Bảo hiểm y tế', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '3323', name: 'Bảo hiểm thất nghiệp', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '3324', name: 'Kinh phí công đoàn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },

    { code: '333', name: 'Thuế và các khoản phải nộp Nhà nước', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '3331', name: 'Thuế GTGT phải nộp', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },

    { code: '334', name: 'Phải trả người lao động', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '336', name: 'Phải trả nội bộ', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '338', name: 'Phải trả khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '341', name: 'Vay và nợ thuê tài chính', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },
    { code: '366', name: 'Các khoản nhận trước chưa ghi thu', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt24_class: 'Loại 3' },

    // ========================================
    // LOẠI 4: TÀI SẢN THUẦN (411-468)
    // ========================================

    { code: '411', name: 'Vốn góp', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '413', name: 'Chênh lệch tỷ giá hối đoái', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '421', name: 'Thặng dư (thâm hụt) lũy kế', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '4211', name: 'Thặng dư (thâm hụt) lũy kế năm trước', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '4212', name: 'Thặng dư (thâm hụt) lũy kế năm nay', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '431', name: 'Các quỹ thuộc đơn vị', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '4311', name: 'Quỹ khen thưởng', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '4312', name: 'Quỹ phúc lợi', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '4314', name: 'Quỹ phát triển hoạt động sự nghiệp', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },
    { code: '468', name: 'Nguồn kinh phí mang sang năm sau', category: 'TÀI SẢN THUẦN', type: 'EQUITY', tt24_class: 'Loại 4' },

    // ========================================
    // LOẠI 5: DOANH THU (511-518)
    // ========================================

    { code: '511', name: 'Doanh thu hoạt động do NSNN cấp', category: 'DOANH THU', type: 'REVENUE', tt24_class: 'Loại 5' },
    { code: '512', name: 'Doanh thu từ viện trợ, vay nợ nước ngoài', category: 'DOANH THU', type: 'REVENUE', tt24_class: 'Loại 5' },
    { code: '514', name: 'Doanh thu từ phí được khấu trừ, để lại', category: 'DOANH THU', type: 'REVENUE', tt24_class: 'Loại 5' },
    { code: '515', name: 'Doanh thu hoạt động tài chính', category: 'DOANH THU', type: 'REVENUE', tt24_class: 'Loại 5' },
    { code: '518', name: 'Doanh thu từ hoạt động nghiệp vụ', category: 'DOANH THU', type: 'REVENUE', tt24_class: 'Loại 5' },
    { code: '531', name: 'Doanh thu hoạt động SXKD, dịch vụ', category: 'DOANH THU', type: 'REVENUE', tt24_class: 'Loại 5' },

    // ========================================
    // LOẠI 7: THU NHẬP KHÁC (711)
    // ========================================

    { code: '711', name: 'Thu nhập khác', category: 'THU NHẬP KHÁC', type: 'REVENUE', tt24_class: 'Loại 7' },

    // ========================================
    // LOẠI 6: CHI PHÍ (611-651)
    // ========================================

    { code: '611', name: 'Chi phí hoạt động (NSNN)', category: 'CHI PHÍ', type: 'EXPENSE', tt24_class: 'Loại 6' },
    { code: '612', name: 'Chi phí từ nguồn viện trợ, vay nợ nước ngoài', category: 'CHI PHÍ', type: 'EXPENSE', tt24_class: 'Loại 6' },
    { code: '614', name: 'Chi phí từ nguồn phí được khấu trừ, để lại', category: 'CHI PHÍ', type: 'EXPENSE', tt24_class: 'Loại 6' },
    { code: '615', name: 'Chi phí hoạt động tài chính', category: 'CHI PHÍ', type: 'EXPENSE', tt24_class: 'Loại 6' },
    { code: '618', name: 'Chi phí từ hoạt động nghiệp vụ', category: 'CHI PHÍ', type: 'EXPENSE', tt24_class: 'Loại 6' },
    { code: '642', name: 'Chi phí hoạt động SXKD, dịch vụ', category: 'CHI PHÍ', type: 'EXPENSE', tt24_class: 'Loại 6' },
    { code: '651', name: 'Chi phí khác', category: 'CHI PHÍ', type: 'EXPENSE', tt24_class: 'Loại 6' },

    // ========================================
    // LOẠI 8: CHI PHÍ KHÁC (811)
    // ========================================

    { code: '811', name: 'Chi phí khác', category: 'CHI PHÍ KHÁC', type: 'EXPENSE', tt24_class: 'Loại 8' },

    // ========================================
    // LOẠI 9: XÁC ĐỊNH KẾT QUẢ (911)
    // ========================================

    { code: '911', name: 'Xác định kết quả hoạt động', category: 'XÁC ĐỊNH KQ', type: 'RESULT', tt24_class: 'Loại 9' },
];

const OFF_BALANCE_ACCOUNTS_TT24 = [
    { code: '001', name: 'Tài sản thuê ngoài/giữ hộ', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '004', name: 'Ngoại tệ các loại', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '006', name: 'Dự toán chi hoạt động', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '0061', name: 'Dự toán chi thường xuyên', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '0062', name: 'Dự toán chi không thường xuyên', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '008', name: 'Dự toán chi đầu tư XDCB', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '012', name: 'Lệnh chi tiền thực chi', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '013', name: 'Lệnh chi tiền tạm ứng', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
];

const ALL_ACCOUNTS_TT24 = [
    ...HCSN_ACCOUNTS_TT24,
    ...OFF_BALANCE_ACCOUNTS_TT24
];

module.exports = {
    HCSN_ACCOUNTS_TT24,
    OFF_BALANCE_ACCOUNTS_TT24,
    ALL_ACCOUNTS_TT24
};
