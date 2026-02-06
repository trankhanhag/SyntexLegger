/**
 * Seed: Thuyết minh Báo cáo Tài chính (B09-DN) theo TT 99/2025/TT-BTC
 * Cấu trúc thuyết minh chuẩn cho Doanh nghiệp
 */

const FINANCIAL_NOTES = [
    // === I. ĐẶC ĐIỂM HOẠT ĐỘNG CỦA DOANH NGHIỆP ===
    { note_code: 'I', note_title: 'Đặc điểm hoạt động của doanh nghiệp', section: 'GENERAL', level: 0, order_seq: 1, is_required: true },
    { note_code: 'I.1', note_title: 'Hình thức sở hữu vốn', section: 'GENERAL', level: 1, order_seq: 2, parent_code: 'I' },
    { note_code: 'I.2', note_title: 'Lĩnh vực kinh doanh', section: 'GENERAL', level: 1, order_seq: 3, parent_code: 'I' },
    { note_code: 'I.3', note_title: 'Ngành nghề kinh doanh', section: 'GENERAL', level: 1, order_seq: 4, parent_code: 'I' },
    { note_code: 'I.4', note_title: 'Đặc điểm hoạt động của doanh nghiệp trong năm tài chính có ảnh hưởng đến báo cáo tài chính', section: 'GENERAL', level: 1, order_seq: 5, parent_code: 'I' },

    // === II. KỲ KẾ TOÁN, ĐƠN VỊ TIỀN TỆ SỬ DỤNG TRONG KẾ TOÁN ===
    { note_code: 'II', note_title: 'Kỳ kế toán, đơn vị tiền tệ sử dụng trong kế toán', section: 'GENERAL', level: 0, order_seq: 10, is_required: true },
    { note_code: 'II.1', note_title: 'Kỳ kế toán năm', section: 'GENERAL', level: 1, order_seq: 11, parent_code: 'II',
      note_content: 'Kỳ kế toán năm của doanh nghiệp bắt đầu từ ngày 01/01 và kết thúc vào ngày 31/12 hàng năm.' },
    { note_code: 'II.2', note_title: 'Đơn vị tiền tệ sử dụng trong kế toán', section: 'GENERAL', level: 1, order_seq: 12, parent_code: 'II',
      note_content: 'Đơn vị tiền tệ sử dụng trong kế toán là Đồng Việt Nam (VND).' },

    // === III. CHUẨN MỰC VÀ CHẾ ĐỘ KẾ TOÁN ÁP DỤNG ===
    { note_code: 'III', note_title: 'Chuẩn mực và Chế độ kế toán áp dụng', section: 'GENERAL', level: 0, order_seq: 20, is_required: true },
    { note_code: 'III.1', note_title: 'Chế độ kế toán áp dụng', section: 'GENERAL', level: 1, order_seq: 21, parent_code: 'III',
      note_content: 'Doanh nghiệp áp dụng Chế độ kế toán doanh nghiệp theo Thông tư 99/2025/TT-BTC ngày 01/01/2025 của Bộ Tài chính.' },
    { note_code: 'III.2', note_title: 'Tuyên bố về việc tuân thủ Chuẩn mực kế toán và Chế độ kế toán', section: 'GENERAL', level: 1, order_seq: 22, parent_code: 'III',
      note_content: 'Báo cáo tài chính được lập và trình bày phù hợp với các Chuẩn mực kế toán Việt Nam, Chế độ kế toán doanh nghiệp Việt Nam và các quy định pháp lý có liên quan.' },
    { note_code: 'III.3', note_title: 'Hình thức kế toán áp dụng', section: 'GENERAL', level: 1, order_seq: 23, parent_code: 'III',
      note_content: 'Hình thức kế toán: Nhật ký chung, được thực hiện trên phần mềm kế toán.' },

    // === IV. CÁC CHÍNH SÁCH KẾ TOÁN ÁP DỤNG ===
    { note_code: 'IV', note_title: 'Các chính sách kế toán áp dụng', section: 'POLICY', level: 0, order_seq: 30, is_required: true },

    // IV.1 Tiền và tương đương tiền
    { note_code: 'IV.1', note_title: 'Tiền và các khoản tương đương tiền', section: 'POLICY', level: 1, order_seq: 31, parent_code: 'IV', related_account: '111,112,113', related_bs_code: '110',
      note_content: 'Tiền và các khoản tương đương tiền bao gồm tiền mặt, tiền gửi ngân hàng, tiền đang chuyển và các khoản đầu tư ngắn hạn có thời hạn thu hồi hoặc đáo hạn không quá 3 tháng kể từ ngày mua.' },

    // IV.2 Các khoản phải thu
    { note_code: 'IV.2', note_title: 'Các khoản phải thu', section: 'POLICY', level: 1, order_seq: 32, parent_code: 'IV', related_account: '131,136,138,141', related_bs_code: '130',
      note_content: 'Các khoản phải thu được ghi nhận theo giá trị gốc. Dự phòng phải thu khó đòi được lập cho các khoản phải thu quá hạn thanh toán hoặc có khả năng không thu hồi được.' },

    // IV.3 Hàng tồn kho
    { note_code: 'IV.3', note_title: 'Hàng tồn kho', section: 'POLICY', level: 1, order_seq: 33, parent_code: 'IV', related_account: '151,152,153,154,155,156,157,158', related_bs_code: '140',
      note_content: 'Hàng tồn kho được ghi nhận theo giá gốc. Giá gốc hàng tồn kho bao gồm chi phí mua, chi phí chế biến và các chi phí liên quan trực tiếp khác. Phương pháp tính giá xuất kho: Bình quân gia quyền.' },

    // IV.4 Tài sản cố định
    { note_code: 'IV.4', note_title: 'Tài sản cố định hữu hình', section: 'POLICY', level: 1, order_seq: 34, parent_code: 'IV', related_account: '211,214', related_bs_code: '220',
      note_content: 'Tài sản cố định hữu hình được ghi nhận theo nguyên giá trừ khấu hao lũy kế. Phương pháp khấu hao: Đường thẳng. Thời gian khấu hao theo quy định tại Thông tư 45/2013/TT-BTC.' },

    { note_code: 'IV.5', note_title: 'Tài sản cố định vô hình', section: 'POLICY', level: 1, order_seq: 35, parent_code: 'IV', related_account: '213,214', related_bs_code: '227',
      note_content: 'Tài sản cố định vô hình được ghi nhận theo nguyên giá trừ khấu hao lũy kế. Phần mềm máy tính được khấu hao trong thời gian từ 3-5 năm.' },

    // IV.5 Thuê tài chính
    { note_code: 'IV.6', note_title: 'Chi phí đi vay', section: 'POLICY', level: 1, order_seq: 36, parent_code: 'IV', related_account: '635,242',
      note_content: 'Chi phí đi vay được ghi nhận vào chi phí tài chính trong kỳ phát sinh, trừ trường hợp chi phí đi vay liên quan trực tiếp đến việc đầu tư xây dựng hoặc sản xuất tài sản dở dang được vốn hóa.' },

    // IV.6 Doanh thu
    { note_code: 'IV.7', note_title: 'Ghi nhận doanh thu', section: 'POLICY', level: 1, order_seq: 37, parent_code: 'IV', related_account: '511,515,711', related_pnl_code: '01',
      note_content: 'Doanh thu bán hàng được ghi nhận khi đã chuyển giao phần lớn rủi ro và lợi ích gắn liền với quyền sở hữu sản phẩm, hàng hóa cho người mua. Doanh thu cung cấp dịch vụ được ghi nhận khi dịch vụ đã hoàn thành.' },

    // IV.7 Chi phí
    { note_code: 'IV.8', note_title: 'Ghi nhận chi phí', section: 'POLICY', level: 1, order_seq: 38, parent_code: 'IV', related_account: '621,622,627,641,642', related_pnl_code: '11',
      note_content: 'Chi phí được ghi nhận vào Báo cáo kết quả hoạt động kinh doanh khi các khoản chi phí này làm giảm bớt lợi ích kinh tế trong tương lai, có liên quan đến việc giảm bớt tài sản hoặc tăng nợ phải trả và chi phí này có thể xác định được một cách đáng tin cậy.' },

    // IV.8 Thuế TNDN
    { note_code: 'IV.9', note_title: 'Thuế thu nhập doanh nghiệp', section: 'POLICY', level: 1, order_seq: 39, parent_code: 'IV', related_account: '821,8211,8212', related_pnl_code: '51',
      note_content: 'Thuế thu nhập doanh nghiệp hiện hành được xác định trên cơ sở thu nhập chịu thuế và thuế suất thuế TNDN của năm hiện hành. Thuế suất thuế TNDN hiện hành là 20%.' },

    // === V. THÔNG TIN BỔ SUNG CHO CÁC KHOẢN MỤC TRÌNH BÀY TRÊN BẢNG CÂN ĐỐI KẾ TOÁN ===
    { note_code: 'V', note_title: 'Thông tin bổ sung cho các khoản mục trình bày trên Bảng cân đối kế toán', section: 'ASSETS', level: 0, order_seq: 50, is_required: true },

    // V.01 Tiền
    { note_code: 'V.01', note_title: 'Tiền và các khoản tương đương tiền', section: 'ASSETS', level: 1, order_seq: 51, parent_code: 'V', related_account: '111,112,113', related_bs_code: '110' },
    { note_code: 'V.02', note_title: 'Các khoản đầu tư tài chính ngắn hạn', section: 'ASSETS', level: 1, order_seq: 52, parent_code: 'V', related_account: '121,128', related_bs_code: '120' },
    { note_code: 'V.03', note_title: 'Các khoản phải thu ngắn hạn', section: 'ASSETS', level: 1, order_seq: 53, parent_code: 'V', related_account: '131,136,138,141', related_bs_code: '130' },
    { note_code: 'V.04', note_title: 'Hàng tồn kho', section: 'ASSETS', level: 1, order_seq: 54, parent_code: 'V', related_account: '151,152,153,154,155,156,157,158', related_bs_code: '140' },
    { note_code: 'V.05', note_title: 'Tài sản ngắn hạn khác', section: 'ASSETS', level: 1, order_seq: 55, parent_code: 'V', related_account: '141,142,242', related_bs_code: '150' },
    { note_code: 'V.06', note_title: 'Các khoản phải thu dài hạn', section: 'ASSETS', level: 1, order_seq: 56, parent_code: 'V', related_account: '131,138,141', related_bs_code: '210' },
    { note_code: 'V.07', note_title: 'Tài sản cố định hữu hình', section: 'ASSETS', level: 1, order_seq: 57, parent_code: 'V', related_account: '211,214', related_bs_code: '221' },
    { note_code: 'V.08', note_title: 'Tài sản cố định thuê tài chính', section: 'ASSETS', level: 1, order_seq: 58, parent_code: 'V', related_account: '212,214', related_bs_code: '224' },
    { note_code: 'V.09', note_title: 'Tài sản cố định vô hình', section: 'ASSETS', level: 1, order_seq: 59, parent_code: 'V', related_account: '213,214', related_bs_code: '227' },
    { note_code: 'V.10', note_title: 'Bất động sản đầu tư', section: 'ASSETS', level: 1, order_seq: 60, parent_code: 'V', related_account: '217,2147', related_bs_code: '230' },
    { note_code: 'V.11', note_title: 'Các khoản đầu tư tài chính dài hạn', section: 'ASSETS', level: 1, order_seq: 61, parent_code: 'V', related_account: '221,222,228,229', related_bs_code: '250' },
    { note_code: 'V.12', note_title: 'Tài sản dài hạn khác', section: 'ASSETS', level: 1, order_seq: 62, parent_code: 'V', related_account: '242,244', related_bs_code: '260' },

    // === VI. THÔNG TIN BỔ SUNG CHO CÁC KHOẢN MỤC TRÌNH BÀY TRÊN NỢ PHẢI TRẢ ===
    { note_code: 'VI', note_title: 'Thông tin bổ sung cho các khoản mục trình bày phần Nợ phải trả', section: 'LIABILITIES', level: 0, order_seq: 70, is_required: true },

    { note_code: 'VI.01', note_title: 'Phải trả người bán ngắn hạn', section: 'LIABILITIES', level: 1, order_seq: 71, parent_code: 'VI', related_account: '331', related_bs_code: '311' },
    { note_code: 'VI.02', note_title: 'Người mua trả tiền trước ngắn hạn', section: 'LIABILITIES', level: 1, order_seq: 72, parent_code: 'VI', related_account: '131', related_bs_code: '312' },
    { note_code: 'VI.03', note_title: 'Thuế và các khoản phải nộp Nhà nước', section: 'LIABILITIES', level: 1, order_seq: 73, parent_code: 'VI', related_account: '333', related_bs_code: '313' },
    { note_code: 'VI.04', note_title: 'Phải trả người lao động', section: 'LIABILITIES', level: 1, order_seq: 74, parent_code: 'VI', related_account: '334', related_bs_code: '314' },
    { note_code: 'VI.05', note_title: 'Chi phí phải trả ngắn hạn', section: 'LIABILITIES', level: 1, order_seq: 75, parent_code: 'VI', related_account: '335', related_bs_code: '315' },
    { note_code: 'VI.06', note_title: 'Doanh thu chưa thực hiện ngắn hạn', section: 'LIABILITIES', level: 1, order_seq: 76, parent_code: 'VI', related_account: '3387', related_bs_code: '318' },
    { note_code: 'VI.07', note_title: 'Phải trả ngắn hạn khác', section: 'LIABILITIES', level: 1, order_seq: 77, parent_code: 'VI', related_account: '338', related_bs_code: '319' },
    { note_code: 'VI.08', note_title: 'Vay và nợ thuê tài chính ngắn hạn', section: 'LIABILITIES', level: 1, order_seq: 78, parent_code: 'VI', related_account: '341,3411,3412', related_bs_code: '320' },
    { note_code: 'VI.09', note_title: 'Dự phòng phải trả ngắn hạn', section: 'LIABILITIES', level: 1, order_seq: 79, parent_code: 'VI', related_account: '352', related_bs_code: '321' },
    { note_code: 'VI.10', note_title: 'Quỹ khen thưởng, phúc lợi', section: 'LIABILITIES', level: 1, order_seq: 80, parent_code: 'VI', related_account: '353', related_bs_code: '322' },
    { note_code: 'VI.11', note_title: 'Phải trả dài hạn người bán', section: 'LIABILITIES', level: 1, order_seq: 81, parent_code: 'VI', related_account: '331', related_bs_code: '331' },
    { note_code: 'VI.12', note_title: 'Vay và nợ thuê tài chính dài hạn', section: 'LIABILITIES', level: 1, order_seq: 82, parent_code: 'VI', related_account: '341,3411,3412', related_bs_code: '338' },

    // === VII. THÔNG TIN BỔ SUNG CHO VỐN CHỦ SỞ HỮU ===
    { note_code: 'VII', note_title: 'Thông tin bổ sung cho các khoản mục trình bày phần Vốn chủ sở hữu', section: 'EQUITY', level: 0, order_seq: 90, is_required: true },

    { note_code: 'VII.01', note_title: 'Vốn góp của chủ sở hữu', section: 'EQUITY', level: 1, order_seq: 91, parent_code: 'VII', related_account: '4111', related_bs_code: '411' },
    { note_code: 'VII.02', note_title: 'Thặng dư vốn cổ phần', section: 'EQUITY', level: 1, order_seq: 92, parent_code: 'VII', related_account: '4112', related_bs_code: '412' },
    { note_code: 'VII.03', note_title: 'Quyền chọn chuyển đổi trái phiếu', section: 'EQUITY', level: 1, order_seq: 93, parent_code: 'VII', related_account: '4113', related_bs_code: '413' },
    { note_code: 'VII.04', note_title: 'Vốn khác của chủ sở hữu', section: 'EQUITY', level: 1, order_seq: 94, parent_code: 'VII', related_account: '4118', related_bs_code: '414' },
    { note_code: 'VII.05', note_title: 'Cổ phiếu quỹ', section: 'EQUITY', level: 1, order_seq: 95, parent_code: 'VII', related_account: '419', related_bs_code: '415' },
    { note_code: 'VII.06', note_title: 'Chênh lệch tỷ giá hối đoái', section: 'EQUITY', level: 1, order_seq: 96, parent_code: 'VII', related_account: '413', related_bs_code: '417' },
    { note_code: 'VII.07', note_title: 'Quỹ đầu tư phát triển', section: 'EQUITY', level: 1, order_seq: 97, parent_code: 'VII', related_account: '414', related_bs_code: '418' },
    { note_code: 'VII.08', note_title: 'Quỹ khác thuộc vốn chủ sở hữu', section: 'EQUITY', level: 1, order_seq: 98, parent_code: 'VII', related_account: '418', related_bs_code: '420' },
    { note_code: 'VII.09', note_title: 'Lợi nhuận sau thuế chưa phân phối', section: 'EQUITY', level: 1, order_seq: 99, parent_code: 'VII', related_account: '421', related_bs_code: '421' },

    // === VIII. THÔNG TIN BỔ SUNG CHO BÁO CÁO KẾT QUẢ KINH DOANH ===
    { note_code: 'VIII', note_title: 'Thông tin bổ sung cho các khoản mục trình bày trên Báo cáo kết quả hoạt động kinh doanh', section: 'INCOME', level: 0, order_seq: 100, is_required: true },

    { note_code: 'VIII.01', note_title: 'Doanh thu bán hàng và cung cấp dịch vụ', section: 'INCOME', level: 1, order_seq: 101, parent_code: 'VIII', related_account: '511,512', related_pnl_code: '01' },
    { note_code: 'VIII.02', note_title: 'Các khoản giảm trừ doanh thu', section: 'INCOME', level: 1, order_seq: 102, parent_code: 'VIII', related_account: '521', related_pnl_code: '02' },
    { note_code: 'VIII.03', note_title: 'Giá vốn hàng bán', section: 'INCOME', level: 1, order_seq: 103, parent_code: 'VIII', related_account: '632', related_pnl_code: '11' },
    { note_code: 'VIII.04', note_title: 'Doanh thu hoạt động tài chính', section: 'INCOME', level: 1, order_seq: 104, parent_code: 'VIII', related_account: '515', related_pnl_code: '21' },
    { note_code: 'VIII.05', note_title: 'Chi phí tài chính', section: 'INCOME', level: 1, order_seq: 105, parent_code: 'VIII', related_account: '635', related_pnl_code: '22' },
    { note_code: 'VIII.06', note_title: 'Chi phí bán hàng', section: 'INCOME', level: 1, order_seq: 106, parent_code: 'VIII', related_account: '641', related_pnl_code: '25' },
    { note_code: 'VIII.07', note_title: 'Chi phí quản lý doanh nghiệp', section: 'INCOME', level: 1, order_seq: 107, parent_code: 'VIII', related_account: '642', related_pnl_code: '26' },
    { note_code: 'VIII.08', note_title: 'Thu nhập khác', section: 'INCOME', level: 1, order_seq: 108, parent_code: 'VIII', related_account: '711', related_pnl_code: '31' },
    { note_code: 'VIII.09', note_title: 'Chi phí khác', section: 'INCOME', level: 1, order_seq: 109, parent_code: 'VIII', related_account: '811', related_pnl_code: '32' },
    { note_code: 'VIII.10', note_title: 'Chi phí thuế thu nhập doanh nghiệp hiện hành', section: 'INCOME', level: 1, order_seq: 110, parent_code: 'VIII', related_account: '8211', related_pnl_code: '51' },
    { note_code: 'VIII.11', note_title: 'Chi phí thuế thu nhập doanh nghiệp hoãn lại', section: 'INCOME', level: 1, order_seq: 111, parent_code: 'VIII', related_account: '8212', related_pnl_code: '52' },

    // === IX. THÔNG TIN BỔ SUNG CHO BÁO CÁO LƯU CHUYỂN TIỀN TỆ ===
    { note_code: 'IX', note_title: 'Thông tin bổ sung cho Báo cáo lưu chuyển tiền tệ', section: 'CASHFLOW', level: 0, order_seq: 120, is_required: true },

    { note_code: 'IX.01', note_title: 'Các khoản tiền và tương đương tiền đầu kỳ, cuối kỳ', section: 'CASHFLOW', level: 1, order_seq: 121, parent_code: 'IX' },
    { note_code: 'IX.02', note_title: 'Các giao dịch không bằng tiền', section: 'CASHFLOW', level: 1, order_seq: 122, parent_code: 'IX' },

    // === X. NHỮNG THÔNG TIN KHÁC ===
    { note_code: 'X', note_title: 'Những thông tin khác', section: 'OTHER', level: 0, order_seq: 130, is_required: false },

    { note_code: 'X.01', note_title: 'Các khoản nợ tiềm tàng', section: 'OTHER', level: 1, order_seq: 131, parent_code: 'X' },
    { note_code: 'X.02', note_title: 'Các sự kiện sau ngày kết thúc kỳ kế toán năm', section: 'OTHER', level: 1, order_seq: 132, parent_code: 'X' },
    { note_code: 'X.03', note_title: 'Thông tin về các bên liên quan', section: 'OTHER', level: 1, order_seq: 133, parent_code: 'X' },
    { note_code: 'X.04', note_title: 'Thông tin so sánh', section: 'OTHER', level: 1, order_seq: 134, parent_code: 'X' },
];

exports.seed = async function(knex) {
    // Xóa dữ liệu cũ
    await knex('financial_note_values').del();
    await knex('financial_notes').del();

    // Tạo map để link parent
    const parentMap = {};

    // Insert notes theo thứ tự để xử lý parent_id
    for (const note of FINANCIAL_NOTES) {
        const { parent_code, ...noteData } = note;

        // Nếu có parent_code, tìm parent_id
        if (parent_code && parentMap[parent_code]) {
            noteData.parent_id = parentMap[parent_code];
        }

        // Insert và lưu ID vào map
        const [inserted] = await knex('financial_notes').insert(noteData).returning('id');
        const insertedId = typeof inserted === 'object' ? inserted.id : inserted;
        parentMap[note.note_code] = insertedId;
    }

    // Logged via logger in production
};
