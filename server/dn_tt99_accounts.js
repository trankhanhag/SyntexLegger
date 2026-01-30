// Hệ thống tài khoản Kế toán Doanh nghiệp
// Theo Thông tư 99/2025/TT-BTC (Hiệu lực từ 01/01/2026)
// Ban hành ngày 27/10/2025 bởi Bộ Tài chính
// Thay thế Thông tư 200/2014/TT-BTC

const DN_ACCOUNTS_TT99 = [
    // ========================================
    // LOẠI 1: TÀI SẢN NGẮN HẠN (111-158)
    // ========================================

    // TK 111: Tiền mặt
    { code: '111', name: 'Tiền mặt', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1111', name: 'Tiền Việt Nam', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1112', name: 'Ngoại tệ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1113', name: 'Vàng tiền tệ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 112: Tiền gửi không kỳ hạn (đổi tên từ "Tiền gửi Ngân hàng" theo TT99)
    { code: '112', name: 'Tiền gửi không kỳ hạn', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1121', name: 'Tiền Việt Nam', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1122', name: 'Ngoại tệ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1123', name: 'Vàng tiền tệ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 113: Tiền đang chuyển
    { code: '113', name: 'Tiền đang chuyển', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1131', name: 'Tiền Việt Nam', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1132', name: 'Ngoại tệ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 121: Chứng khoán kinh doanh
    { code: '121', name: 'Chứng khoán kinh doanh', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1211', name: 'Cổ phiếu', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1212', name: 'Trái phiếu', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1218', name: 'Chứng khoán và công cụ tài chính khác', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 128: Đầu tư nắm giữ đến ngày đáo hạn
    { code: '128', name: 'Đầu tư nắm giữ đến ngày đáo hạn', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1281', name: 'Tiền gửi có kỳ hạn', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1282', name: 'Trái phiếu', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1288', name: 'Các khoản đầu tư khác nắm giữ đến ngày đáo hạn', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 131: Phải thu của khách hàng
    { code: '131', name: 'Phải thu của khách hàng', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 133: Thuế GTGT được khấu trừ
    { code: '133', name: 'Thuế GTGT được khấu trừ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1331', name: 'Thuế GTGT được khấu trừ của hàng hóa, dịch vụ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1332', name: 'Thuế GTGT được khấu trừ của TSCĐ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 136: Phải thu nội bộ
    { code: '136', name: 'Phải thu nội bộ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1361', name: 'Vốn kinh doanh ở đơn vị trực thuộc', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1362', name: 'Phải thu nội bộ về chênh lệch tỷ giá', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1363', name: 'Phải thu nội bộ về chi phí đi vay đủ điều kiện vốn hóa', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1368', name: 'Phải thu nội bộ khác', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 138: Phải thu khác
    { code: '138', name: 'Phải thu khác', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1381', name: 'Tài sản thiếu chờ xử lý', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1385', name: 'Phải thu về cổ phần hóa', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1388', name: 'Phải thu khác', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 141: Tạm ứng
    { code: '141', name: 'Tạm ứng', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 151: Hàng mua đang đi đường
    { code: '151', name: 'Hàng mua đang đi đường', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 152: Nguyên liệu, vật liệu
    { code: '152', name: 'Nguyên liệu, vật liệu', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 153: Công cụ, dụng cụ
    { code: '153', name: 'Công cụ, dụng cụ', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 154: Chi phí sản xuất, kinh doanh dở dang
    { code: '154', name: 'Chi phí sản xuất, kinh doanh dở dang', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 155: Thành phẩm
    { code: '155', name: 'Thành phẩm', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 156: Hàng hóa
    { code: '156', name: 'Hàng hóa', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1561', name: 'Giá mua hàng hóa', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1562', name: 'Chi phí thu mua hàng hóa', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },
    { code: '1567', name: 'Hàng hóa bất động sản', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 157: Hàng gửi đi bán
    { code: '157', name: 'Hàng gửi đi bán', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // TK 158: Hàng hóa kho bảo thuế
    { code: '158', name: 'Hàng hóa kho bảo thuế', category: 'TÀI SẢN NGẮN HẠN', type: 'ASSET', tt99_class: 'Loại 1' },

    // ========================================
    // LOẠI 2: TÀI SẢN DÀI HẠN (211-244)
    // ========================================

    // TK 211: TSCĐ hữu hình
    { code: '211', name: 'Tài sản cố định hữu hình', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2111', name: 'Nhà cửa, vật kiến trúc', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2112', name: 'Máy móc, thiết bị', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2113', name: 'Phương tiện vận tải, truyền dẫn', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2114', name: 'Thiết bị, dụng cụ quản lý', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2115', name: 'Cây lâu năm, súc vật làm việc và cho sản phẩm', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2118', name: 'TSCĐ khác', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 212: TSCĐ thuê tài chính
    { code: '212', name: 'Tài sản cố định thuê tài chính', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2121', name: 'TSCĐ hữu hình thuê tài chính', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2122', name: 'TSCĐ vô hình thuê tài chính', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 213: TSCĐ vô hình
    { code: '213', name: 'Tài sản cố định vô hình', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2131', name: 'Quyền sử dụng đất', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2132', name: 'Quyền phát hành', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2133', name: 'Bản quyền, bằng sáng chế', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2134', name: 'Nhãn hiệu hàng hóa', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2135', name: 'Phần mềm máy vi tính', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2136', name: 'Giấy phép và giấy phép nhượng quyền', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2138', name: 'TSCĐ vô hình khác', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 214: Hao mòn TSCĐ
    { code: '214', name: 'Hao mòn tài sản cố định', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2141', name: 'Hao mòn TSCĐ hữu hình', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2142', name: 'Hao mòn TSCĐ thuê tài chính', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2143', name: 'Hao mòn TSCĐ vô hình', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2145', name: 'Hao mòn tài sản sinh học', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2147', name: 'Hao mòn bất động sản đầu tư', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 215: Tài sản sinh học (MỚI theo TT99 - IAS 41)
    { code: '215', name: 'Tài sản sinh học', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2151', name: 'Tài sản sinh học cho sản phẩm nông nghiệp', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2152', name: 'Tài sản sinh học để bán', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 217: Bất động sản đầu tư
    { code: '217', name: 'Bất động sản đầu tư', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2171', name: 'Quyền sử dụng đất', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2172', name: 'Nhà cửa, vật kiến trúc', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 221: Đầu tư vào công ty con
    { code: '221', name: 'Đầu tư vào công ty con', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 222: Đầu tư vào công ty liên doanh, liên kết
    { code: '222', name: 'Đầu tư vào công ty liên doanh, liên kết', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 228: Đầu tư khác
    { code: '228', name: 'Đầu tư khác', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2281', name: 'Đầu tư góp vốn vào đơn vị khác', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2288', name: 'Đầu tư khác', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 229: Dự phòng tổn thất tài sản
    { code: '229', name: 'Dự phòng tổn thất tài sản', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2291', name: 'Dự phòng giảm giá chứng khoán kinh doanh', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2292', name: 'Dự phòng tổn thất đầu tư vào đơn vị khác', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2293', name: 'Dự phòng phải thu khó đòi', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2294', name: 'Dự phòng giảm giá hàng tồn kho', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 241: Xây dựng cơ bản dở dang
    { code: '241', name: 'Xây dựng cơ bản dở dang', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2411', name: 'Mua sắm TSCĐ', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2412', name: 'Xây dựng cơ bản', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },
    { code: '2413', name: 'Sửa chữa lớn TSCĐ', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 242: Chi phí trả trước
    { code: '242', name: 'Chi phí trả trước', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 243: Tài sản thuế thu nhập hoãn lại
    { code: '243', name: 'Tài sản thuế thu nhập hoãn lại', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // TK 244: Cầm cố, thế chấp, ký quỹ, ký cược
    { code: '244', name: 'Cầm cố, thế chấp, ký quỹ, ký cược', category: 'TÀI SẢN DÀI HẠN', type: 'ASSET', tt99_class: 'Loại 2' },

    // ========================================
    // LOẠI 3: NỢ PHẢI TRẢ (311-357)
    // ========================================

    // TK 311: Vay và nợ thuê tài chính ngắn hạn
    { code: '311', name: 'Vay và nợ thuê tài chính ngắn hạn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3111', name: 'Vay ngắn hạn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3112', name: 'Nợ thuê tài chính ngắn hạn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 331: Phải trả cho người bán
    { code: '331', name: 'Phải trả cho người bán', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 333: Thuế và các khoản phải nộp Nhà nước
    { code: '333', name: 'Thuế và các khoản phải nộp Nhà nước', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3331', name: 'Thuế giá trị gia tăng phải nộp', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '33311', name: 'Thuế GTGT đầu ra', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '33312', name: 'Thuế GTGT hàng nhập khẩu', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3332', name: 'Thuế tiêu thụ đặc biệt', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3333', name: 'Thuế xuất, nhập khẩu', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3334', name: 'Thuế thu nhập doanh nghiệp', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3335', name: 'Thuế thu nhập cá nhân', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3336', name: 'Thuế tài nguyên', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3337', name: 'Thuế nhà đất, tiền thuê đất', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3338', name: 'Thuế bảo vệ môi trường và các loại thuế khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3339', name: 'Phí, lệ phí và các khoản phải nộp khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 334: Phải trả người lao động
    { code: '334', name: 'Phải trả người lao động', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3341', name: 'Phải trả công nhân viên', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3348', name: 'Phải trả người lao động khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 335: Chi phí phải trả
    { code: '335', name: 'Chi phí phải trả', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 336: Phải trả nội bộ
    { code: '336', name: 'Phải trả nội bộ', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3361', name: 'Phải trả nội bộ về vốn kinh doanh', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3362', name: 'Phải trả nội bộ về chênh lệch tỷ giá', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3363', name: 'Phải trả nội bộ về chi phí đi vay đủ điều kiện vốn hóa', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3368', name: 'Phải trả nội bộ khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 337: Thanh toán theo tiến độ kế hoạch hợp đồng xây dựng
    { code: '337', name: 'Thanh toán theo tiến độ kế hoạch hợp đồng xây dựng', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 338: Phải trả, phải nộp khác
    { code: '338', name: 'Phải trả, phải nộp khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3381', name: 'Tài sản thừa chờ giải quyết', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3382', name: 'Kinh phí công đoàn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3383', name: 'Bảo hiểm xã hội', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3384', name: 'Bảo hiểm y tế', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3385', name: 'Phải trả về cổ phần hóa', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3386', name: 'Bảo hiểm thất nghiệp', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3387', name: 'Doanh thu chưa thực hiện', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3388', name: 'Phải trả, phải nộp khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 341: Vay và nợ thuê tài chính dài hạn
    { code: '341', name: 'Vay và nợ thuê tài chính dài hạn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3411', name: 'Vay dài hạn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3412', name: 'Nợ thuê tài chính dài hạn', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 343: Trái phiếu phát hành
    { code: '343', name: 'Trái phiếu phát hành', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3431', name: 'Mệnh giá trái phiếu', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3432', name: 'Chiết khấu trái phiếu', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3433', name: 'Phụ trội trái phiếu', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 344: Nhận ký quỹ, ký cược
    { code: '344', name: 'Nhận ký quỹ, ký cược', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 347: Thuế thu nhập hoãn lại phải trả
    { code: '347', name: 'Thuế thu nhập hoãn lại phải trả', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 352: Dự phòng phải trả
    { code: '352', name: 'Dự phòng phải trả', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3521', name: 'Dự phòng bảo hành sản phẩm, hàng hóa', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3522', name: 'Dự phòng bảo hành công trình xây dựng', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3523', name: 'Dự phòng tái cơ cấu doanh nghiệp', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3524', name: 'Dự phòng phải trả khác', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 353: Quỹ khen thưởng, phúc lợi
    { code: '353', name: 'Quỹ khen thưởng, phúc lợi', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3531', name: 'Quỹ khen thưởng', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3532', name: 'Quỹ phúc lợi', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3533', name: 'Quỹ phúc lợi đã hình thành TSCĐ', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3534', name: 'Quỹ thưởng ban quản lý điều hành công ty', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 356: Quỹ phát triển khoa học và công nghệ
    { code: '356', name: 'Quỹ phát triển khoa học và công nghệ', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3561', name: 'Quỹ phát triển khoa học và công nghệ', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },
    { code: '3562', name: 'Quỹ phát triển KH&CN đã hình thành TSCĐ', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // TK 357: Quỹ bình ổn giá
    { code: '357', name: 'Quỹ bình ổn giá', category: 'NỢ PHẢI TRẢ', type: 'LIABILITY', tt99_class: 'Loại 3' },

    // ========================================
    // LOẠI 4: VỐN CHỦ SỞ HỮU (411-441)
    // ========================================

    // TK 411: Vốn đầu tư của chủ sở hữu
    { code: '411', name: 'Vốn đầu tư của chủ sở hữu', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4111', name: 'Vốn góp của chủ sở hữu', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4112', name: 'Thặng dư vốn cổ phần', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4113', name: 'Quyền chọn chuyển đổi trái phiếu', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4118', name: 'Vốn khác', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 412: Chênh lệch đánh giá lại tài sản
    { code: '412', name: 'Chênh lệch đánh giá lại tài sản', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 413: Chênh lệch tỷ giá hối đoái
    { code: '413', name: 'Chênh lệch tỷ giá hối đoái', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4131', name: 'Chênh lệch tỷ giá do đánh giá lại các khoản mục tiền tệ có gốc ngoại tệ', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4132', name: 'Chênh lệch tỷ giá hối đoái trong giai đoạn trước hoạt động', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 414: Quỹ đầu tư phát triển
    { code: '414', name: 'Quỹ đầu tư phát triển', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 417: Quỹ dự phòng tài chính
    { code: '417', name: 'Quỹ dự phòng tài chính', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 418: Các quỹ khác thuộc vốn chủ sở hữu
    { code: '418', name: 'Các quỹ khác thuộc vốn chủ sở hữu', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 419: Cổ phiếu quỹ
    { code: '419', name: 'Cổ phiếu quỹ', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 421: Lợi nhuận sau thuế chưa phân phối
    { code: '421', name: 'Lợi nhuận sau thuế chưa phân phối', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4211', name: 'Lợi nhuận sau thuế chưa phân phối năm trước', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },
    { code: '4212', name: 'Lợi nhuận sau thuế chưa phân phối năm nay', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // TK 441: Nguồn vốn đầu tư XDCB
    { code: '441', name: 'Nguồn vốn đầu tư xây dựng cơ bản', category: 'VỐN CHỦ SỞ HỮU', type: 'EQUITY', tt99_class: 'Loại 4' },

    // ========================================
    // LOẠI 5: DOANH THU (511-521)
    // ========================================

    // TK 511: Doanh thu bán hàng và cung cấp dịch vụ
    { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5111', name: 'Doanh thu bán hàng hóa', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5112', name: 'Doanh thu bán các thành phẩm', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5113', name: 'Doanh thu cung cấp dịch vụ', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5114', name: 'Doanh thu trợ cấp, trợ giá', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5117', name: 'Doanh thu kinh doanh bất động sản đầu tư', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5118', name: 'Doanh thu khác', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },

    // TK 515: Doanh thu hoạt động tài chính
    { code: '515', name: 'Doanh thu hoạt động tài chính', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },

    // TK 521: Các khoản giảm trừ doanh thu
    { code: '521', name: 'Các khoản giảm trừ doanh thu', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5211', name: 'Chiết khấu thương mại', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5212', name: 'Hàng bán bị trả lại', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },
    { code: '5213', name: 'Giảm giá hàng bán', category: 'DOANH THU', type: 'REVENUE', tt99_class: 'Loại 5' },

    // ========================================
    // LOẠI 6: CHI PHÍ SẢN XUẤT, KINH DOANH (611-642)
    // ========================================

    // TK 611: Mua hàng
    { code: '611', name: 'Mua hàng', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6111', name: 'Mua nguyên liệu, vật liệu', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6112', name: 'Mua hàng hóa', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 621: Chi phí nguyên liệu, vật liệu trực tiếp
    { code: '621', name: 'Chi phí nguyên liệu, vật liệu trực tiếp', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 622: Chi phí nhân công trực tiếp
    { code: '622', name: 'Chi phí nhân công trực tiếp', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 623: Chi phí sử dụng máy thi công
    { code: '623', name: 'Chi phí sử dụng máy thi công', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6231', name: 'Chi phí nhân công', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6232', name: 'Chi phí vật liệu', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6233', name: 'Chi phí dụng cụ sản xuất', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6234', name: 'Chi phí khấu hao máy thi công', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6237', name: 'Chi phí dịch vụ mua ngoài', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6238', name: 'Chi phí bằng tiền khác', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 627: Chi phí sản xuất chung
    { code: '627', name: 'Chi phí sản xuất chung', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6271', name: 'Chi phí nhân viên phân xưởng', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6272', name: 'Chi phí vật liệu', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6273', name: 'Chi phí dụng cụ sản xuất', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6274', name: 'Chi phí khấu hao TSCĐ', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6277', name: 'Chi phí dịch vụ mua ngoài', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6278', name: 'Chi phí bằng tiền khác', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 631: Giá thành sản xuất
    { code: '631', name: 'Giá thành sản xuất', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 632: Giá vốn hàng bán
    { code: '632', name: 'Giá vốn hàng bán', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 635: Chi phí tài chính
    { code: '635', name: 'Chi phí tài chính', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 641: Chi phí bán hàng
    { code: '641', name: 'Chi phí bán hàng', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6411', name: 'Chi phí nhân viên', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6412', name: 'Chi phí vật liệu, bao bì', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6413', name: 'Chi phí dụng cụ, đồ dùng', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6414', name: 'Chi phí khấu hao TSCĐ', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6415', name: 'Chi phí bảo hành', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6417', name: 'Chi phí dịch vụ mua ngoài', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6418', name: 'Chi phí bằng tiền khác', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // TK 642: Chi phí quản lý doanh nghiệp
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6421', name: 'Chi phí nhân viên quản lý', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6422', name: 'Chi phí vật liệu quản lý', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6423', name: 'Chi phí đồ dùng văn phòng', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6424', name: 'Chi phí khấu hao TSCĐ', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6425', name: 'Thuế, phí và lệ phí', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6426', name: 'Chi phí dự phòng', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6427', name: 'Chi phí dịch vụ mua ngoài', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },
    { code: '6428', name: 'Chi phí bằng tiền khác', category: 'CHI PHÍ SXKD', type: 'EXPENSE', tt99_class: 'Loại 6' },

    // ========================================
    // LOẠI 7: THU NHẬP KHÁC (711)
    // ========================================

    { code: '711', name: 'Thu nhập khác', category: 'THU NHẬP KHÁC', type: 'REVENUE', tt99_class: 'Loại 7' },

    // ========================================
    // LOẠI 8: CHI PHÍ KHÁC (811-821)
    // ========================================

    { code: '811', name: 'Chi phí khác', category: 'CHI PHÍ KHÁC', type: 'EXPENSE', tt99_class: 'Loại 8' },

    // TK 821: Chi phí thuế thu nhập doanh nghiệp
    { code: '821', name: 'Chi phí thuế thu nhập doanh nghiệp', category: 'CHI PHÍ KHÁC', type: 'EXPENSE', tt99_class: 'Loại 8' },
    { code: '8211', name: 'Chi phí thuế TNDN hiện hành', category: 'CHI PHÍ KHÁC', type: 'EXPENSE', tt99_class: 'Loại 8' },
    { code: '82111', name: 'Chi phí thuế TNDN hiện hành trong nước', category: 'CHI PHÍ KHÁC', type: 'EXPENSE', tt99_class: 'Loại 8' },
    { code: '82112', name: 'Chi phí thuế TNDN bổ sung (thuế tối thiểu toàn cầu)', category: 'CHI PHÍ KHÁC', type: 'EXPENSE', tt99_class: 'Loại 8' },
    { code: '8212', name: 'Chi phí thuế TNDN hoãn lại', category: 'CHI PHÍ KHÁC', type: 'EXPENSE', tt99_class: 'Loại 8' },

    // ========================================
    // LOẠI 9: XÁC ĐỊNH KẾT QUẢ KINH DOANH (911)
    // ========================================

    { code: '911', name: 'Xác định kết quả kinh doanh', category: 'XÁC ĐỊNH KQKD', type: 'RESULT', tt99_class: 'Loại 9' },
];

// Tài khoản ngoài bảng (OFF-BALANCE) - Doanh nghiệp
// Theo TT 99/2025, DN có thể tự thiết kế hệ thống tài khoản ngoài bảng
const OFF_BALANCE_ACCOUNTS_DN = [
    { code: '001', name: 'Tài sản thuê ngoài', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '002', name: 'Vật tư, hàng hóa nhận giữ hộ, nhận gia công', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '003', name: 'Hàng hóa nhận bán hộ, nhận ký gửi, ký cược', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '004', name: 'Nợ khó đòi đã xử lý', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '007', name: 'Ngoại tệ các loại', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
    { code: '008', name: 'Dự toán chi sự nghiệp, dự án', category: 'NGOÀI BẢNG', type: 'OFF_BALANCE', is_off_balance: 1 },
];

const ALL_ACCOUNTS_TT99 = [
    ...DN_ACCOUNTS_TT99,
    ...OFF_BALANCE_ACCOUNTS_DN
];

module.exports = {
    DN_ACCOUNTS_TT99,
    OFF_BALANCE_ACCOUNTS_DN,
    ALL_ACCOUNTS_TT99
};
