// ========================================
// DN REPORTS APIs - TT 99/2025/TT-BTC
// Thay thế TT 200/2014/TT-BTC từ 01/01/2026
// ========================================

const logger = require('./src/utils/logger');

/**
 * API 1: Bảng Cân đối Kế toán Doanh nghiệp
 * Theo mẫu B01-DN (TT 99/2025)
 */
function getBalanceSheetDN(db) {
  return (req, res) => {
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    const sql = `
            SELECT account_code, SUM(debit_amount) - SUM(credit_amount) as balance
            FROM general_ledger
            WHERE trx_date <= ?
            GROUP BY account_code
        `;

    db.all(sql, [toDate], (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });

      const sumByPrefix = (prefix) => {
        return rows.filter(r => r.account_code.startsWith(prefix))
          .reduce((acc, r) => acc + r.balance, 0);
      };

      // Cấu trúc Bảng cân đối kế toán DN theo TT 99/2025
      const report = [
        // =================
        // PHẦN A: TÀI SẢN
        // =================
        {
          id: 'A', code: 'A', target: 'TÀI SẢN', level: 0, is_bold: true,
          current_period: sumByPrefix('1') + sumByPrefix('2') - sumByPrefix('214') - sumByPrefix('229'),
          previous_period: 0
        },

        // I. Tài sản ngắn hạn
        {
          id: 'AI', code: 'I', target: 'I. TÀI SẢN NGẮN HẠN', level: 1, is_bold: true,
          current_period: sumByPrefix('1') - sumByPrefix('2291') - sumByPrefix('2293') - sumByPrefix('2294'),
          previous_period: 0
        },

        {
          id: '110', code: '110', target: '1. Tiền và các khoản tương đương tiền', level: 2,
          current_period: sumByPrefix('111') + sumByPrefix('112') + sumByPrefix('113'),
          previous_period: 0
        },

        {
          id: '120', code: '120', target: '2. Đầu tư tài chính ngắn hạn', level: 2,
          current_period: sumByPrefix('121') + sumByPrefix('128') - sumByPrefix('2291'),
          previous_period: 0
        },
        {
          id: '121', code: '121', target: '   a. Chứng khoán kinh doanh', level: 3,
          current_period: sumByPrefix('121'), previous_period: 0
        },
        {
          id: '122', code: '122', target: '   b. Dự phòng giảm giá chứng khoán kinh doanh', level: 3,
          current_period: -Math.abs(sumByPrefix('2291')), previous_period: 0
        },
        {
          id: '123', code: '123', target: '   c. Đầu tư nắm giữ đến ngày đáo hạn', level: 3,
          current_period: sumByPrefix('128'), previous_period: 0
        },

        {
          id: '130', code: '130', target: '3. Các khoản phải thu ngắn hạn', level: 2,
          current_period: sumByPrefix('131') + sumByPrefix('136') + sumByPrefix('138') + sumByPrefix('141') - sumByPrefix('2293'),
          previous_period: 0
        },
        {
          id: '131', code: '131', target: '   a. Phải thu của khách hàng', level: 3,
          current_period: sumByPrefix('131'), previous_period: 0
        },
        {
          id: '132', code: '132', target: '   b. Trả trước cho người bán', level: 3,
          current_period: 0, previous_period: 0
        },
        {
          id: '133', code: '133', target: '   c. Phải thu nội bộ ngắn hạn', level: 3,
          current_period: sumByPrefix('136'), previous_period: 0
        },
        {
          id: '134', code: '134', target: '   d. Phải thu khác', level: 3,
          current_period: sumByPrefix('138'), previous_period: 0
        },
        {
          id: '135', code: '135', target: '   e. Dự phòng phải thu ngắn hạn khó đòi', level: 3,
          current_period: -Math.abs(sumByPrefix('2293')), previous_period: 0
        },
        {
          id: '136', code: '136', target: '   f. Tài sản thiếu chờ xử lý', level: 3,
          current_period: sumByPrefix('1381'), previous_period: 0
        },

        {
          id: '140', code: '140', target: '4. Hàng tồn kho', level: 2,
          current_period: sumByPrefix('151') + sumByPrefix('152') + sumByPrefix('153') + sumByPrefix('154') + sumByPrefix('155') + sumByPrefix('156') + sumByPrefix('157') + sumByPrefix('158') - sumByPrefix('2294'),
          previous_period: 0
        },
        {
          id: '141', code: '141', target: '   a. Hàng tồn kho', level: 3,
          current_period: sumByPrefix('15'), previous_period: 0
        },
        {
          id: '149', code: '149', target: '   b. Dự phòng giảm giá hàng tồn kho', level: 3,
          current_period: -Math.abs(sumByPrefix('2294')), previous_period: 0
        },

        {
          id: '150', code: '150', target: '5. Tài sản ngắn hạn khác', level: 2,
          current_period: sumByPrefix('133') + sumByPrefix('141') + sumByPrefix('242'),
          previous_period: 0
        },
        {
          id: '151', code: '151', target: '   a. Chi phí trả trước ngắn hạn', level: 3,
          current_period: sumByPrefix('242'), previous_period: 0
        },
        {
          id: '152', code: '152', target: '   b. Thuế GTGT được khấu trừ', level: 3,
          current_period: sumByPrefix('133'), previous_period: 0
        },
        {
          id: '153', code: '153', target: '   c. Thuế và các khoản khác phải thu NN', level: 3,
          current_period: 0, previous_period: 0
        },

        // II. Tài sản dài hạn
        {
          id: 'AII', code: 'II', target: 'II. TÀI SẢN DÀI HẠN', level: 1, is_bold: true,
          current_period: sumByPrefix('2') - sumByPrefix('1') - sumByPrefix('214') - sumByPrefix('2291') - sumByPrefix('2292') + sumByPrefix('1'),
          previous_period: 0
        },

        {
          id: '210', code: '210', target: '1. Các khoản phải thu dài hạn', level: 2,
          current_period: 0, previous_period: 0
        },

        {
          id: '220', code: '220', target: '2. Tài sản cố định', level: 2,
          current_period: sumByPrefix('211') + sumByPrefix('212') + sumByPrefix('213') - sumByPrefix('2141') - sumByPrefix('2142') - sumByPrefix('2143'),
          previous_period: 0
        },
        {
          id: '221', code: '221', target: '   a. TSCĐ hữu hình', level: 3,
          current_period: sumByPrefix('211') - sumByPrefix('2141'), previous_period: 0
        },
        {
          id: '2211', code: '2211', target: '      - Nguyên giá', level: 4,
          current_period: sumByPrefix('211'), previous_period: 0
        },
        {
          id: '2212', code: '2212', target: '      - Giá trị hao mòn lũy kế', level: 4,
          current_period: -Math.abs(sumByPrefix('2141')), previous_period: 0
        },
        {
          id: '222', code: '222', target: '   b. TSCĐ thuê tài chính', level: 3,
          current_period: sumByPrefix('212') - sumByPrefix('2142'), previous_period: 0
        },
        {
          id: '223', code: '223', target: '   c. TSCĐ vô hình', level: 3,
          current_period: sumByPrefix('213') - sumByPrefix('2143'), previous_period: 0
        },

        {
          id: '225', code: '225', target: '3. Tài sản sinh học', level: 2,
          current_period: sumByPrefix('215') - sumByPrefix('2145'), previous_period: 0
        },

        {
          id: '230', code: '230', target: '4. Bất động sản đầu tư', level: 2,
          current_period: sumByPrefix('217') - sumByPrefix('2147'), previous_period: 0
        },

        {
          id: '240', code: '240', target: '5. Tài sản dở dang dài hạn', level: 2,
          current_period: sumByPrefix('241') + sumByPrefix('242'), previous_period: 0
        },
        {
          id: '241', code: '241', target: '   a. Chi phí sản xuất, kinh doanh dở dang dài hạn', level: 3,
          current_period: 0, previous_period: 0
        },
        {
          id: '242', code: '242', target: '   b. Chi phí xây dựng cơ bản dở dang', level: 3,
          current_period: sumByPrefix('241'), previous_period: 0
        },

        {
          id: '250', code: '250', target: '6. Đầu tư tài chính dài hạn', level: 2,
          current_period: sumByPrefix('221') + sumByPrefix('222') + sumByPrefix('228') - sumByPrefix('2292'),
          previous_period: 0
        },
        {
          id: '251', code: '251', target: '   a. Đầu tư vào công ty con', level: 3,
          current_period: sumByPrefix('221'), previous_period: 0
        },
        {
          id: '252', code: '252', target: '   b. Đầu tư vào công ty liên doanh, liên kết', level: 3,
          current_period: sumByPrefix('222'), previous_period: 0
        },
        {
          id: '253', code: '253', target: '   c. Đầu tư góp vốn vào đơn vị khác', level: 3,
          current_period: sumByPrefix('228'), previous_period: 0
        },
        {
          id: '254', code: '254', target: '   d. Dự phòng đầu tư tài chính dài hạn', level: 3,
          current_period: -Math.abs(sumByPrefix('2292')), previous_period: 0
        },

        {
          id: '260', code: '260', target: '7. Tài sản dài hạn khác', level: 2,
          current_period: sumByPrefix('243') + sumByPrefix('244'), previous_period: 0
        },
        {
          id: '261', code: '261', target: '   a. Chi phí trả trước dài hạn', level: 3,
          current_period: 0, previous_period: 0
        },
        {
          id: '262', code: '262', target: '   b. Tài sản thuế thu nhập hoãn lại', level: 3,
          current_period: sumByPrefix('243'), previous_period: 0
        },
        {
          id: '268', code: '268', target: '   c. Tài sản dài hạn khác', level: 3,
          current_period: sumByPrefix('244'), previous_period: 0
        },

        // =================
        // PHẦN B: NGUỒN VỐN
        // =================
        {
          id: 'B', code: 'B', target: 'NGUỒN VỐN', level: 0, is_bold: true,
          current_period: -sumByPrefix('3') - sumByPrefix('4'), previous_period: 0
        },

        // I. Nợ phải trả
        {
          id: 'BI', code: 'I', target: 'I. NỢ PHẢI TRẢ', level: 1, is_bold: true,
          current_period: -sumByPrefix('3'), previous_period: 0
        },

        {
          id: '310', code: '310', target: '1. Nợ ngắn hạn', level: 2,
          current_period: -(sumByPrefix('311') + sumByPrefix('331') + sumByPrefix('333') + sumByPrefix('334') + sumByPrefix('335') + sumByPrefix('336') + sumByPrefix('337') + sumByPrefix('338')),
          previous_period: 0
        },
        {
          id: '311', code: '311', target: '   a. Phải trả người bán ngắn hạn', level: 3,
          current_period: -sumByPrefix('331'), previous_period: 0
        },
        {
          id: '312', code: '312', target: '   b. Người mua trả tiền trước ngắn hạn', level: 3,
          current_period: 0, previous_period: 0
        },
        {
          id: '313', code: '313', target: '   c. Thuế và các khoản phải nộp Nhà nước', level: 3,
          current_period: -sumByPrefix('333'), previous_period: 0
        },
        {
          id: '314', code: '314', target: '   d. Phải trả người lao động', level: 3,
          current_period: -sumByPrefix('334'), previous_period: 0
        },
        {
          id: '315', code: '315', target: '   e. Chi phí phải trả ngắn hạn', level: 3,
          current_period: -sumByPrefix('335'), previous_period: 0
        },
        {
          id: '316', code: '316', target: '   f. Phải trả nội bộ ngắn hạn', level: 3,
          current_period: -sumByPrefix('336'), previous_period: 0
        },
        {
          id: '317', code: '317', target: '   g. Phải trả theo tiến độ hợp đồng XD', level: 3,
          current_period: -sumByPrefix('337'), previous_period: 0
        },
        {
          id: '318', code: '318', target: '   h. Doanh thu chưa thực hiện ngắn hạn', level: 3,
          current_period: -sumByPrefix('3387'), previous_period: 0
        },
        {
          id: '319', code: '319', target: '   i. Phải trả ngắn hạn khác', level: 3,
          current_period: -sumByPrefix('338'), previous_period: 0
        },
        {
          id: '320', code: '320', target: '   j. Vay và nợ thuê tài chính ngắn hạn', level: 3,
          current_period: -sumByPrefix('311'), previous_period: 0
        },
        {
          id: '321', code: '321', target: '   k. Dự phòng phải trả ngắn hạn', level: 3,
          current_period: -sumByPrefix('352'), previous_period: 0
        },
        {
          id: '322', code: '322', target: '   l. Quỹ khen thưởng, phúc lợi', level: 3,
          current_period: -sumByPrefix('353'), previous_period: 0
        },
        {
          id: '323', code: '323', target: '   m. Quỹ bình ổn giá', level: 3,
          current_period: -sumByPrefix('357'), previous_period: 0
        },

        {
          id: '330', code: '330', target: '2. Nợ dài hạn', level: 2,
          current_period: -(sumByPrefix('341') + sumByPrefix('343') + sumByPrefix('344') + sumByPrefix('347') + sumByPrefix('352') + sumByPrefix('356')),
          previous_period: 0
        },
        {
          id: '331', code: '331', target: '   a. Phải trả người bán dài hạn', level: 3,
          current_period: 0, previous_period: 0
        },
        {
          id: '332', code: '332', target: '   b. Vay và nợ thuê tài chính dài hạn', level: 3,
          current_period: -sumByPrefix('341'), previous_period: 0
        },
        {
          id: '333', code: '333', target: '   c. Trái phiếu phát hành', level: 3,
          current_period: -sumByPrefix('343'), previous_period: 0
        },
        {
          id: '334', code: '334', target: '   d. Nhận ký quỹ, ký cược dài hạn', level: 3,
          current_period: -sumByPrefix('344'), previous_period: 0
        },
        {
          id: '335', code: '335', target: '   e. Thuế thu nhập hoãn lại phải trả', level: 3,
          current_period: -sumByPrefix('347'), previous_period: 0
        },
        {
          id: '336', code: '336', target: '   f. Dự phòng phải trả dài hạn', level: 3,
          current_period: -sumByPrefix('352'), previous_period: 0
        },
        {
          id: '337', code: '337', target: '   g. Quỹ phát triển KH&CN', level: 3,
          current_period: -sumByPrefix('356'), previous_period: 0
        },

        // II. Vốn chủ sở hữu
        {
          id: 'BII', code: 'II', target: 'II. VỐN CHỦ SỞ HỮU', level: 1, is_bold: true,
          current_period: -sumByPrefix('4'), previous_period: 0
        },

        {
          id: '410', code: '410', target: '1. Vốn chủ sở hữu', level: 2,
          current_period: -(sumByPrefix('411') + sumByPrefix('412') + sumByPrefix('413') + sumByPrefix('414') + sumByPrefix('417') + sumByPrefix('418') - sumByPrefix('419') + sumByPrefix('421') + sumByPrefix('441')),
          previous_period: 0
        },
        {
          id: '411', code: '411', target: '   a. Vốn góp của chủ sở hữu', level: 3,
          current_period: -sumByPrefix('4111'), previous_period: 0
        },
        {
          id: '412', code: '412', target: '   b. Thặng dư vốn cổ phần', level: 3,
          current_period: -sumByPrefix('4112'), previous_period: 0
        },
        {
          id: '413', code: '413', target: '   c. Quyền chọn chuyển đổi trái phiếu', level: 3,
          current_period: -sumByPrefix('4113'), previous_period: 0
        },
        {
          id: '414', code: '414', target: '   d. Vốn khác của chủ sở hữu', level: 3,
          current_period: -sumByPrefix('4118'), previous_period: 0
        },
        {
          id: '415', code: '415', target: '   e. Cổ phiếu quỹ', level: 3,
          current_period: sumByPrefix('419'), previous_period: 0
        },
        {
          id: '416', code: '416', target: '   f. Chênh lệch đánh giá lại tài sản', level: 3,
          current_period: -sumByPrefix('412'), previous_period: 0
        },
        {
          id: '417', code: '417', target: '   g. Chênh lệch tỷ giá hối đoái', level: 3,
          current_period: -sumByPrefix('413'), previous_period: 0
        },
        {
          id: '418', code: '418', target: '   h. Quỹ đầu tư phát triển', level: 3,
          current_period: -sumByPrefix('414'), previous_period: 0
        },
        {
          id: '419', code: '419', target: '   i. Quỹ dự phòng tài chính', level: 3,
          current_period: -sumByPrefix('417'), previous_period: 0
        },
        {
          id: '420', code: '420', target: '   j. Quỹ khác thuộc vốn chủ sở hữu', level: 3,
          current_period: -sumByPrefix('418'), previous_period: 0
        },
        {
          id: '421', code: '421', target: '   k. Lợi nhuận sau thuế chưa phân phối', level: 3,
          current_period: -sumByPrefix('421'), previous_period: 0
        },
        {
          id: '4211', code: '4211', target: '      - LNST chưa phân phối lũy kế đến cuối kỳ trước', level: 4,
          current_period: -sumByPrefix('4211'), previous_period: 0
        },
        {
          id: '4212', code: '4212', target: '      - LNST chưa phân phối kỳ này', level: 4,
          current_period: -sumByPrefix('4212'), previous_period: 0
        },
        {
          id: '422', code: '422', target: '   l. Nguồn vốn đầu tư XDCB', level: 3,
          current_period: -sumByPrefix('441'), previous_period: 0
        },

        {
          id: '430', code: '430', target: '2. Nguồn kinh phí và quỹ khác', level: 2,
          current_period: 0, previous_period: 0
        },

        // TỔNG CỘNG NGUỒN VỐN
        {
          id: 'TOTAL', code: 'TOTAL', target: 'TỔNG CỘNG NGUỒN VỐN', level: 0, is_bold: true,
          current_period: -sumByPrefix('3') - sumByPrefix('4'), previous_period: 0
        },
      ];

      res.json(report);
    });
  };
}

/**
 * API 2: Báo cáo Kết quả Kinh doanh
 * Theo mẫu B02-DN (TT 99/2025)
 */
function getProfitLossStatement(db) {
  return (req, res) => {
    const { fromDate, toDate } = req.query;

    const sql = `
            SELECT account_code, SUM(debit_amount) - SUM(credit_amount) as balance
            FROM general_ledger
            WHERE trx_date BETWEEN ? AND ?
            GROUP BY account_code
        `;

    db.all(sql, [fromDate, toDate], (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });

      const sumByPrefix = (prefix) => {
        return rows.filter(r => r.account_code.startsWith(prefix))
          .reduce((acc, r) => acc + r.balance, 0);
      };

      // Doanh thu có số dư Credit (âm), Chi phí có số dư Debit (dương)
      const doanhThuBanHang = -sumByPrefix('511');
      const cacKhoanGiamTruDT = sumByPrefix('521');
      const doanhThuThuan = doanhThuBanHang - cacKhoanGiamTruDT;
      const giaVonHangBan = sumByPrefix('632');
      const loiNhuanGop = doanhThuThuan - giaVonHangBan;
      const doanhThuTaiChinh = -sumByPrefix('515');
      const chiPhiTaiChinh = sumByPrefix('635');
      const chiPhiBanHang = sumByPrefix('641');
      const chiPhiQLDN = sumByPrefix('642');
      const loiNhuanThuanHDKD = loiNhuanGop + doanhThuTaiChinh - chiPhiTaiChinh - chiPhiBanHang - chiPhiQLDN;
      const thuNhapKhac = -sumByPrefix('711');
      const chiPhiKhac = sumByPrefix('811');
      const loiNhuanKhac = thuNhapKhac - chiPhiKhac;
      const tongLoiNhuanTruocThue = loiNhuanThuanHDKD + loiNhuanKhac;
      const chiPhiThueTNDN = sumByPrefix('821');
      const loiNhuanSauThue = tongLoiNhuanTruocThue - chiPhiThueTNDN;

      const report = [
        // 1. Doanh thu bán hàng và cung cấp dịch vụ
        {
          id: '01', code: '01', target: '1. Doanh thu bán hàng và cung cấp dịch vụ', level: 1,
          current_period: doanhThuBanHang, previous_period: 0
        },

        // 2. Các khoản giảm trừ doanh thu
        {
          id: '02', code: '02', target: '2. Các khoản giảm trừ doanh thu', level: 1,
          current_period: cacKhoanGiamTruDT, previous_period: 0
        },

        // 3. Doanh thu thuần
        {
          id: '10', code: '10', target: '3. Doanh thu thuần về bán hàng và CCDV (10 = 01 - 02)', level: 1, is_bold: true,
          current_period: doanhThuThuan, previous_period: 0
        },

        // 4. Giá vốn hàng bán
        {
          id: '11', code: '11', target: '4. Giá vốn hàng bán', level: 1,
          current_period: giaVonHangBan, previous_period: 0
        },

        // 5. Lợi nhuận gộp
        {
          id: '20', code: '20', target: '5. Lợi nhuận gộp về bán hàng và CCDV (20 = 10 - 11)', level: 1, is_bold: true,
          current_period: loiNhuanGop, previous_period: 0
        },

        // 6. Doanh thu hoạt động tài chính
        {
          id: '21', code: '21', target: '6. Doanh thu hoạt động tài chính', level: 1,
          current_period: doanhThuTaiChinh, previous_period: 0
        },

        // 7. Chi phí tài chính
        {
          id: '22', code: '22', target: '7. Chi phí tài chính', level: 1,
          current_period: chiPhiTaiChinh, previous_period: 0
        },
        {
          id: '23', code: '23', target: '   - Trong đó: Chi phí lãi vay', level: 2,
          current_period: 0, previous_period: 0
        },

        // 8. Chi phí bán hàng
        {
          id: '25', code: '25', target: '8. Chi phí bán hàng', level: 1,
          current_period: chiPhiBanHang, previous_period: 0
        },

        // 9. Chi phí quản lý doanh nghiệp
        {
          id: '26', code: '26', target: '9. Chi phí quản lý doanh nghiệp', level: 1,
          current_period: chiPhiQLDN, previous_period: 0
        },

        // 10. Lợi nhuận thuần từ HĐKD
        {
          id: '30', code: '30', target: '10. Lợi nhuận thuần từ hoạt động kinh doanh (30 = 20+21-22-25-26)', level: 1, is_bold: true,
          current_period: loiNhuanThuanHDKD, previous_period: 0
        },

        // 11. Thu nhập khác
        {
          id: '31', code: '31', target: '11. Thu nhập khác', level: 1,
          current_period: thuNhapKhac, previous_period: 0
        },

        // 12. Chi phí khác
        {
          id: '32', code: '32', target: '12. Chi phí khác', level: 1,
          current_period: chiPhiKhac, previous_period: 0
        },

        // 13. Lợi nhuận khác
        {
          id: '40', code: '40', target: '13. Lợi nhuận khác (40 = 31 - 32)', level: 1, is_bold: true,
          current_period: loiNhuanKhac, previous_period: 0
        },

        // 14. Tổng lợi nhuận kế toán trước thuế
        {
          id: '50', code: '50', target: '14. Tổng lợi nhuận kế toán trước thuế (50 = 30 + 40)', level: 1, is_bold: true,
          current_period: tongLoiNhuanTruocThue, previous_period: 0
        },

        // 15. Chi phí thuế TNDN hiện hành
        {
          id: '51', code: '51', target: '15. Chi phí thuế TNDN hiện hành', level: 1,
          current_period: sumByPrefix('8211'), previous_period: 0
        },

        // 16. Chi phí thuế TNDN hoãn lại
        {
          id: '52', code: '52', target: '16. Chi phí thuế TNDN hoãn lại', level: 1,
          current_period: sumByPrefix('8212'), previous_period: 0
        },

        // 17. Lợi nhuận sau thuế TNDN
        {
          id: '60', code: '60', target: '17. Lợi nhuận sau thuế TNDN (60 = 50 - 51 - 52)', level: 1, is_bold: true,
          current_period: loiNhuanSauThue, previous_period: 0
        },

        // 18. Lãi cơ bản trên cổ phiếu
        {
          id: '70', code: '70', target: '18. Lãi cơ bản trên cổ phiếu (*)', level: 1,
          current_period: 0, previous_period: 0
        },

        // 19. Lãi suy giảm trên cổ phiếu
        {
          id: '71', code: '71', target: '19. Lãi suy giảm trên cổ phiếu (*)', level: 1,
          current_period: 0, previous_period: 0
        },
      ];

      res.json(report);
    });
  };
}

/**
 * API 3: Báo cáo Lưu chuyển Tiền tệ (Trực tiếp)
 * Theo mẫu B03-DN (TT 99/2025)
 */
function getCashFlowStatement(db) {
  return (req, res) => {
    const { fromDate, toDate } = req.query;

    const sql = `
            SELECT account_code, SUM(debit_amount) as debit, SUM(credit_amount) as credit
            FROM general_ledger
            WHERE trx_date BETWEEN ? AND ?
            GROUP BY account_code
        `;

    db.all(sql, [fromDate, toDate], (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });

      const getDebit = (prefix) => {
        return rows.filter(r => r.account_code.startsWith(prefix))
          .reduce((acc, r) => acc + (r.debit || 0), 0);
      };

      const getCredit = (prefix) => {
        return rows.filter(r => r.account_code.startsWith(prefix))
          .reduce((acc, r) => acc + (r.credit || 0), 0);
      };

      // I. Lưu chuyển tiền từ hoạt động kinh doanh
      const thuTuBanHang = getDebit('111') + getDebit('112');
      const chiTraNCC = getCredit('111') + getCredit('112');
      const chiTraNLD = 0; // Cần logic chi tiết
      const chiTraLaiVay = 0;
      const chiNopThue = 0;
      const thuKhacHDKD = 0;
      const chiKhacHDKD = 0;
      const luuChuyenTienHDKD = thuTuBanHang - chiTraNCC - chiTraNLD - chiTraLaiVay - chiNopThue + thuKhacHDKD - chiKhacHDKD;

      // II. Lưu chuyển tiền từ hoạt động đầu tư
      const chiMuaTSCD = 0;
      const thuThanhLyTSCD = 0;
      const chiDauTu = 0;
      const thuHoiDauTu = 0;
      const thuLaiDauTu = 0;
      const luuChuyenTienDauTu = thuThanhLyTSCD + thuHoiDauTu + thuLaiDauTu - chiMuaTSCD - chiDauTu;

      // III. Lưu chuyển tiền từ hoạt động tài chính
      const thuVay = 0;
      const traNoGocVay = 0;
      const chiTraCoTuc = 0;
      const luuChuyenTienTaiChinh = thuVay - traNoGocVay - chiTraCoTuc;

      // Tổng cộng
      const tongLuuChuyen = luuChuyenTienHDKD + luuChuyenTienDauTu + luuChuyenTienTaiChinh;
      const tienDauKy = 0; // Cần query riêng
      const tienCuoiKy = tienDauKy + tongLuuChuyen;

      const report = [
        // I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH
        { id: 'I', code: 'I', target: 'I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH', level: 0, is_bold: true, current_period: 0, previous_period: 0 },
        { id: '01', code: '01', target: '1. Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác', level: 1, current_period: thuTuBanHang, previous_period: 0 },
        { id: '02', code: '02', target: '2. Tiền chi trả cho người cung cấp hàng hóa, dịch vụ', level: 1, current_period: chiTraNCC, previous_period: 0 },
        { id: '03', code: '03', target: '3. Tiền chi trả cho người lao động', level: 1, current_period: chiTraNLD, previous_period: 0 },
        { id: '04', code: '04', target: '4. Tiền lãi vay đã trả', level: 1, current_period: chiTraLaiVay, previous_period: 0 },
        { id: '05', code: '05', target: '5. Thuế TNDN đã nộp', level: 1, current_period: chiNopThue, previous_period: 0 },
        { id: '06', code: '06', target: '6. Tiền thu khác từ hoạt động kinh doanh', level: 1, current_period: thuKhacHDKD, previous_period: 0 },
        { id: '07', code: '07', target: '7. Tiền chi khác cho hoạt động kinh doanh', level: 1, current_period: chiKhacHDKD, previous_period: 0 },
        { id: '20', code: '20', target: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', level: 1, is_bold: true, current_period: luuChuyenTienHDKD, previous_period: 0 },

        // II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ
        { id: 'II', code: 'II', target: 'II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ', level: 0, is_bold: true, current_period: 0, previous_period: 0 },
        { id: '21', code: '21', target: '1. Tiền chi mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác', level: 1, current_period: chiMuaTSCD, previous_period: 0 },
        { id: '22', code: '22', target: '2. Tiền thu từ thanh lý, nhượng bán TSCĐ và các tài sản dài hạn khác', level: 1, current_period: thuThanhLyTSCD, previous_period: 0 },
        { id: '23', code: '23', target: '3. Tiền chi cho vay, mua các công cụ nợ của đơn vị khác', level: 1, current_period: chiDauTu, previous_period: 0 },
        { id: '24', code: '24', target: '4. Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác', level: 1, current_period: thuHoiDauTu, previous_period: 0 },
        { id: '25', code: '25', target: '5. Tiền chi đầu tư góp vốn vào đơn vị khác', level: 1, current_period: 0, previous_period: 0 },
        { id: '26', code: '26', target: '6. Tiền thu hồi đầu tư góp vốn vào đơn vị khác', level: 1, current_period: 0, previous_period: 0 },
        { id: '27', code: '27', target: '7. Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', level: 1, current_period: thuLaiDauTu, previous_period: 0 },
        { id: '30', code: '30', target: 'Lưu chuyển tiền thuần từ hoạt động đầu tư', level: 1, is_bold: true, current_period: luuChuyenTienDauTu, previous_period: 0 },

        // III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH
        { id: 'III', code: 'III', target: 'III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH', level: 0, is_bold: true, current_period: 0, previous_period: 0 },
        { id: '31', code: '31', target: '1. Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu', level: 1, current_period: 0, previous_period: 0 },
        { id: '32', code: '32', target: '2. Tiền chi trả vốn góp cho các chủ sở hữu, mua lại cổ phiếu', level: 1, current_period: 0, previous_period: 0 },
        { id: '33', code: '33', target: '3. Tiền thu từ đi vay', level: 1, current_period: thuVay, previous_period: 0 },
        { id: '34', code: '34', target: '4. Tiền trả nợ gốc vay', level: 1, current_period: traNoGocVay, previous_period: 0 },
        { id: '35', code: '35', target: '5. Tiền trả nợ gốc thuê tài chính', level: 1, current_period: 0, previous_period: 0 },
        { id: '36', code: '36', target: '6. Cổ tức, lợi nhuận đã trả cho chủ sở hữu', level: 1, current_period: chiTraCoTuc, previous_period: 0 },
        { id: '40', code: '40', target: 'Lưu chuyển tiền thuần từ hoạt động tài chính', level: 1, is_bold: true, current_period: luuChuyenTienTaiChinh, previous_period: 0 },

        // TỔNG CỘNG
        { id: '50', code: '50', target: 'Lưu chuyển tiền thuần trong kỳ (50 = 20 + 30 + 40)', level: 0, is_bold: true, current_period: tongLuuChuyen, previous_period: 0 },
        { id: '60', code: '60', target: 'Tiền và tương đương tiền đầu kỳ', level: 0, current_period: tienDauKy, previous_period: 0 },
        { id: '61', code: '61', target: 'Ảnh hưởng của thay đổi tỷ giá quy đổi ngoại tệ', level: 0, current_period: 0, previous_period: 0 },
        { id: '70', code: '70', target: 'Tiền và tương đương tiền cuối kỳ (70 = 50 + 60 + 61)', level: 0, is_bold: true, current_period: tienCuoiKy, previous_period: 0 },
      ];

      res.json(report);
    });
  };
}

/**
 * API 4: Thuyết minh Báo cáo Tài chính
 * Theo mẫu B09-DN (TT 99/2025)
 */
function getNotesToFinancialStatements(db) {
  return async (req, res) => {
    logger.debug('[DEBUG] Executing getNotesToFinancialStatements');
    try {
      const { fiscalYear, section } = req.query;
      const year = fiscalYear || new Date().getFullYear();

      // Lấy danh sách các mục thuyết minh
      let notesSql = `
                SELECT
                    fn.id,
                    fn.note_code,
                    fn.note_title,
                    fn.note_content,
                    fn.section,
                    fn.related_account,
                    fn.related_bs_code,
                    fn.related_pnl_code,
                    fn.parent_id,
                    fn.level,
                    fn.order_seq,
                    fn.is_required,
                    fnv.current_value,
                    fnv.previous_value,
                    fnv.explanation,
                    fnv.additional_info
                FROM financial_notes fn
                LEFT JOIN financial_note_values fnv
                    ON fn.id = fnv.note_id
                    AND fnv.fiscal_year = ?
                WHERE fn.is_active = 1
            `;
      const params = [year];

      if (section) {
        notesSql += ' AND fn.section = ?';
        params.push(section);
      }

      notesSql += ' ORDER BY fn.order_seq ASC';

      db.all(notesSql, params, (err, notes) => {
        if (err) {
          logger.error('Error fetching notes:', err);
          return res.status(500).json({ error: err.message });
        }

        // Nếu chưa có dữ liệu, trả về cấu trúc mặc định
        if (!notes || notes.length === 0) {
          return res.json([
            { id: 'header', note_code: '', note_title: 'THUYẾT MINH BÁO CÁO TÀI CHÍNH', level: 0, is_bold: true, section: 'HEADER' },
            { id: 'note', note_code: '', note_title: 'Chưa có dữ liệu thuyết minh. Vui lòng chạy migration và seed để tạo cấu trúc thuyết minh BCTC theo TT 99/2025/TT-BTC.', level: 0, section: 'NOTE' }
          ]);
        }

        // Format kết quả
        const result = notes.map(note => ({
          id: note.id,
          note_code: note.note_code,
          note_title: note.note_title,
          note_content: note.note_content || '',
          section: note.section,
          related_account: note.related_account,
          related_bs_code: note.related_bs_code,
          related_pnl_code: note.related_pnl_code,
          parent_id: note.parent_id,
          level: note.level,
          is_bold: note.level === 0,
          is_required: note.is_required,
          current_value: note.current_value || 0,
          previous_value: note.previous_value || 0,
          explanation: note.explanation || '',
          additional_info: note.additional_info || ''
        }));

        res.json(result);
      });
    } catch (error) {
      logger.error('Error in getNotesToFinancialStatements:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

/**
 * API 5: Phân tích Chi phí
 * Phân tích chi phí theo khoản mục, so sánh kỳ trước và tỷ lệ trên doanh thu
 */
function getCostAnalysis(db) {
  return (req, res) => {
    const fromDate = req.query.fromDate || `${new Date().getFullYear()}-01-01`;
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    // Tính kỳ trước (cùng số ngày)
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const daysDiff = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - daysDiff);
    const prevFromStr = prevFrom.toISOString().split('T')[0];
    const prevToStr = prevTo.toISOString().split('T')[0];

    // Query chi phí kỳ này
    const sqlCurrent = `
            SELECT account_code,
                   SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) as debit,
                   SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END) as credit
            FROM general_ledger
            WHERE trx_date BETWEEN ? AND ?
            GROUP BY account_code
        `;

    db.all(sqlCurrent, [fromDate, toDate], (err, currentRows) => {
      if (err) return res.status(400).json({ error: err.message });

      // Query chi phí kỳ trước
      db.all(sqlCurrent, [prevFromStr, prevToStr], (err2, prevRows) => {
        if (err2) return res.status(400).json({ error: err2.message });

        // Helper functions
        const sumByPrefix = (rows, prefix, type = 'debit') => {
          return (rows || [])
            .filter(r => r.account_code && r.account_code.startsWith(prefix))
            .reduce((acc, r) => acc + (type === 'debit' ? (r.debit || 0) : (r.credit || 0)), 0);
        };

        const sumExpense = (rows, prefix) => {
          // Chi phí = Phát sinh Nợ - Phát sinh Có (cho TK loại 6, 8)
          return sumByPrefix(rows, prefix, 'debit') - sumByPrefix(rows, prefix, 'credit');
        };

        const sumRevenue = (rows, prefix) => {
          // Doanh thu = Phát sinh Có - Phát sinh Nợ (cho TK loại 5, 7)
          return sumByPrefix(rows, prefix, 'credit') - sumByPrefix(rows, prefix, 'debit');
        };

        // Doanh thu thuần kỳ này và kỳ trước
        const doanhThuCurrent = sumRevenue(currentRows, '511') + sumRevenue(currentRows, '512')
          - sumExpense(currentRows, '521');
        const doanhThuPrev = sumRevenue(prevRows, '511') + sumRevenue(prevRows, '512')
          - sumExpense(prevRows, '521');

        // Chi phí theo khoản mục - Kỳ này
        const giaVonCurrent = sumExpense(currentRows, '632');
        const cpBanHangCurrent = sumExpense(currentRows, '641');
        const cpQLDNCurrent = sumExpense(currentRows, '642');
        const cpTaiChinhCurrent = sumExpense(currentRows, '635');
        const cpKhacCurrent = sumExpense(currentRows, '811');

        // Chi phí theo khoản mục - Kỳ trước
        const giaVonPrev = sumExpense(prevRows, '632');
        const cpBanHangPrev = sumExpense(prevRows, '641');
        const cpQLDNPrev = sumExpense(prevRows, '642');
        const cpTaiChinhPrev = sumExpense(prevRows, '635');
        const cpKhacPrev = sumExpense(prevRows, '811');

        // Tổng chi phí
        const tongCPCurrent = giaVonCurrent + cpBanHangCurrent + cpQLDNCurrent + cpTaiChinhCurrent + cpKhacCurrent;
        const tongCPPrev = giaVonPrev + cpBanHangPrev + cpQLDNPrev + cpTaiChinhPrev + cpKhacPrev;

        // Tính tỷ lệ % và biến động
        const calcPct = (val, total) => total !== 0 ? ((val / total) * 100).toFixed(2) : '0.00';
        const calcChange = (curr, prev) => prev !== 0 ? (((curr - prev) / prev) * 100).toFixed(2) : (curr > 0 ? '100.00' : '0.00');

        const report = [
          // Header - Doanh thu tham chiếu
          {
            id: 'revenue',
            cost_item: 'DOANH THU THUẦN (Tham chiếu)',
            level: 0,
            is_bold: true,
            current_period: doanhThuCurrent,
            previous_period: doanhThuPrev,
            pct_revenue: '100.00',
            change_pct: calcChange(doanhThuCurrent, doanhThuPrev),
            change_amount: doanhThuCurrent - doanhThuPrev
          },

          // Tổng chi phí
          {
            id: 'total',
            cost_item: 'TỔNG CHI PHÍ',
            level: 0,
            is_bold: true,
            current_period: tongCPCurrent,
            previous_period: tongCPPrev,
            pct_revenue: calcPct(tongCPCurrent, doanhThuCurrent),
            change_pct: calcChange(tongCPCurrent, tongCPPrev),
            change_amount: tongCPCurrent - tongCPPrev
          },

          // 1. Giá vốn hàng bán
          {
            id: '632',
            cost_item: '1. Giá vốn hàng bán (TK 632)',
            level: 1,
            current_period: giaVonCurrent,
            previous_period: giaVonPrev,
            pct_revenue: calcPct(giaVonCurrent, doanhThuCurrent),
            change_pct: calcChange(giaVonCurrent, giaVonPrev),
            change_amount: giaVonCurrent - giaVonPrev
          },

          // 2. Chi phí bán hàng
          {
            id: '641',
            cost_item: '2. Chi phí bán hàng (TK 641)',
            level: 1,
            current_period: cpBanHangCurrent,
            previous_period: cpBanHangPrev,
            pct_revenue: calcPct(cpBanHangCurrent, doanhThuCurrent),
            change_pct: calcChange(cpBanHangCurrent, cpBanHangPrev),
            change_amount: cpBanHangCurrent - cpBanHangPrev
          },

          // 3. Chi phí quản lý doanh nghiệp
          {
            id: '642',
            cost_item: '3. Chi phí quản lý doanh nghiệp (TK 642)',
            level: 1,
            current_period: cpQLDNCurrent,
            previous_period: cpQLDNPrev,
            pct_revenue: calcPct(cpQLDNCurrent, doanhThuCurrent),
            change_pct: calcChange(cpQLDNCurrent, cpQLDNPrev),
            change_amount: cpQLDNCurrent - cpQLDNPrev
          },

          // 4. Chi phí tài chính
          {
            id: '635',
            cost_item: '4. Chi phí tài chính (TK 635)',
            level: 1,
            current_period: cpTaiChinhCurrent,
            previous_period: cpTaiChinhPrev,
            pct_revenue: calcPct(cpTaiChinhCurrent, doanhThuCurrent),
            change_pct: calcChange(cpTaiChinhCurrent, cpTaiChinhPrev),
            change_amount: cpTaiChinhCurrent - cpTaiChinhPrev
          },

          // 5. Chi phí khác
          {
            id: '811',
            cost_item: '5. Chi phí khác (TK 811)',
            level: 1,
            current_period: cpKhacCurrent,
            previous_period: cpKhacPrev,
            pct_revenue: calcPct(cpKhacCurrent, doanhThuCurrent),
            change_pct: calcChange(cpKhacCurrent, cpKhacPrev),
            change_amount: cpKhacCurrent - cpKhacPrev
          },

          // Lợi nhuận gộp
          {
            id: 'gross_profit',
            cost_item: 'LỢI NHUẬN GỘP (Doanh thu - Giá vốn)',
            level: 0,
            is_bold: true,
            current_period: doanhThuCurrent - giaVonCurrent,
            previous_period: doanhThuPrev - giaVonPrev,
            pct_revenue: calcPct(doanhThuCurrent - giaVonCurrent, doanhThuCurrent),
            change_pct: calcChange(doanhThuCurrent - giaVonCurrent, doanhThuPrev - giaVonPrev),
            change_amount: (doanhThuCurrent - giaVonCurrent) - (doanhThuPrev - giaVonPrev)
          },

          // Biên lợi nhuận
          {
            id: 'net_margin',
            cost_item: 'BIÊN LỢI NHUẬN (Doanh thu - Tổng chi phí)',
            level: 0,
            is_bold: true,
            current_period: doanhThuCurrent - tongCPCurrent,
            previous_period: doanhThuPrev - tongCPPrev,
            pct_revenue: calcPct(doanhThuCurrent - tongCPCurrent, doanhThuCurrent),
            change_pct: calcChange(doanhThuCurrent - tongCPCurrent, doanhThuPrev - tongCPPrev),
            change_amount: (doanhThuCurrent - tongCPCurrent) - (doanhThuPrev - tongCPPrev)
          }
        ];

        res.json(report);
      });
    });
  };
}

/**
 * Phân tích Lợi nhuận (Profitability Analysis)
 * Phân tích chi tiết các chỉ số lợi nhuận theo cơ cấu doanh thu, chi phí
 */
function getProfitabilityAnalysis(db) {
  return (req, res) => {
    const fromDate = req.query.from || req.query.fromDate || '2024-01-01';
    const toDate = req.query.to || req.query.toDate || '2024-12-31';

    // Tính kỳ trước dựa trên khoảng thời gian kỳ này
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const periodDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - periodDays);
    const prevFromDate = prevFrom.toISOString().slice(0, 10);
    const prevToDate = prevTo.toISOString().slice(0, 10);

    // Query lấy dữ liệu kỳ này
    const sqlCurrent = `
            SELECT
                -- Doanh thu bán hàng (TK 511)
                SUM(CASE WHEN account_code LIKE '511%' THEN credit_amount - debit_amount ELSE 0 END) as doanh_thu_ban_hang,
                -- Các khoản giảm trừ doanh thu (TK 521)
                SUM(CASE WHEN account_code LIKE '521%' THEN debit_amount - credit_amount ELSE 0 END) as giam_tru_doanh_thu,
                -- Doanh thu hoạt động tài chính (TK 515)
                SUM(CASE WHEN account_code LIKE '515%' THEN credit_amount - debit_amount ELSE 0 END) as doanh_thu_tai_chinh,
                -- Thu nhập khác (TK 711)
                SUM(CASE WHEN account_code LIKE '711%' THEN credit_amount - debit_amount ELSE 0 END) as thu_nhap_khac,

                -- Giá vốn hàng bán (TK 632)
                SUM(CASE WHEN account_code LIKE '632%' THEN debit_amount - credit_amount ELSE 0 END) as gia_von,
                -- Chi phí bán hàng (TK 641)
                SUM(CASE WHEN account_code LIKE '641%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_ban_hang,
                -- Chi phí QLDN (TK 642)
                SUM(CASE WHEN account_code LIKE '642%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_qldn,
                -- Chi phí tài chính (TK 635)
                SUM(CASE WHEN account_code LIKE '635%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_tai_chinh,
                -- Chi phí khác (TK 811)
                SUM(CASE WHEN account_code LIKE '811%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_khac,
                -- Chi phí thuế TNDN (TK 821)
                SUM(CASE WHEN account_code LIKE '821%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_thue_tndn
            FROM general_ledger
            WHERE trx_date >= ? AND trx_date <= ?
        `;

    // Query lấy dữ liệu kỳ trước
    const sqlPrevious = `
            SELECT
                SUM(CASE WHEN account_code LIKE '511%' THEN credit_amount - debit_amount ELSE 0 END) as doanh_thu_ban_hang,
                SUM(CASE WHEN account_code LIKE '521%' THEN debit_amount - credit_amount ELSE 0 END) as giam_tru_doanh_thu,
                SUM(CASE WHEN account_code LIKE '515%' THEN credit_amount - debit_amount ELSE 0 END) as doanh_thu_tai_chinh,
                SUM(CASE WHEN account_code LIKE '711%' THEN credit_amount - debit_amount ELSE 0 END) as thu_nhap_khac,
                SUM(CASE WHEN account_code LIKE '632%' THEN debit_amount - credit_amount ELSE 0 END) as gia_von,
                SUM(CASE WHEN account_code LIKE '641%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_ban_hang,
                SUM(CASE WHEN account_code LIKE '642%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_qldn,
                SUM(CASE WHEN account_code LIKE '635%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_tai_chinh,
                SUM(CASE WHEN account_code LIKE '811%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_khac,
                SUM(CASE WHEN account_code LIKE '821%' THEN debit_amount - credit_amount ELSE 0 END) as chi_phi_thue_tndn
            FROM general_ledger
            WHERE trx_date >= ? AND trx_date <= ?
        `;

    db.get(sqlCurrent, [fromDate, toDate], (err, current) => {
      if (err) return res.status(400).json({ error: err.message });

      db.get(sqlPrevious, [prevFromDate, prevToDate], (err, previous) => {
        if (err) return res.status(400).json({ error: err.message });

        const c = current || {};
        const p = previous || {};

        // Helper functions
        const num = (v) => parseFloat(v) || 0;
        const calcChange = (curr, prev) => prev !== 0 ? ((curr - prev) / Math.abs(prev) * 100).toFixed(2) : (curr !== 0 ? '100.00' : '0.00');
        const calcMargin = (value, revenue) => revenue !== 0 ? ((value / revenue) * 100).toFixed(2) : '0.00';

        // Tính toán các chỉ tiêu kỳ này
        const doanhThuBanHang = num(c.doanh_thu_ban_hang);
        const giamTruDT = num(c.giam_tru_doanh_thu);
        const doanhThuThuan = doanhThuBanHang - giamTruDT;
        const giaVon = num(c.gia_von);
        const loiNhuanGop = doanhThuThuan - giaVon;

        const doanhThuTC = num(c.doanh_thu_tai_chinh);
        const chiPhiBH = num(c.chi_phi_ban_hang);
        const chiPhiQLDN = num(c.chi_phi_qldn);
        const chiPhiTC = num(c.chi_phi_tai_chinh);
        const loiNhuanHDKD = loiNhuanGop + doanhThuTC - chiPhiBH - chiPhiQLDN - chiPhiTC;

        const thuNhapKhac = num(c.thu_nhap_khac);
        const chiPhiKhac = num(c.chi_phi_khac);
        const loiNhuanKhac = thuNhapKhac - chiPhiKhac;

        const loiNhuanTruocThue = loiNhuanHDKD + loiNhuanKhac;
        const chiPhiThueTNDN = num(c.chi_phi_thue_tndn);
        const loiNhuanSauThue = loiNhuanTruocThue - chiPhiThueTNDN;

        // Tính toán các chỉ tiêu kỳ trước
        const doanhThuBanHangPrev = num(p.doanh_thu_ban_hang);
        const giamTruDTPrev = num(p.giam_tru_doanh_thu);
        const doanhThuThuanPrev = doanhThuBanHangPrev - giamTruDTPrev;
        const giaVonPrev = num(p.gia_von);
        const loiNhuanGopPrev = doanhThuThuanPrev - giaVonPrev;

        const doanhThuTCPrev = num(p.doanh_thu_tai_chinh);
        const chiPhiBHPrev = num(p.chi_phi_ban_hang);
        const chiPhiQLDNPrev = num(p.chi_phi_qldn);
        const chiPhiTCPrev = num(p.chi_phi_tai_chinh);
        const loiNhuanHDKDPrev = loiNhuanGopPrev + doanhThuTCPrev - chiPhiBHPrev - chiPhiQLDNPrev - chiPhiTCPrev;

        const thuNhapKhacPrev = num(p.thu_nhap_khac);
        const chiPhiKhacPrev = num(p.chi_phi_khac);
        const loiNhuanKhacPrev = thuNhapKhacPrev - chiPhiKhacPrev;

        const loiNhuanTruocThuePrev = loiNhuanHDKDPrev + loiNhuanKhacPrev;
        const chiPhiThueTNDNPrev = num(p.chi_phi_thue_tndn);
        const loiNhuanSauThuePrev = loiNhuanTruocThuePrev - chiPhiThueTNDNPrev;

        // Build report data
        const report = [
          // PHẦN A: DOANH THU
          { id: 'revenue_header', item: 'A. DOANH THU', level: 0, is_header: true, is_bold: true },
          {
            id: 'doanh_thu_ban_hang',
            item: '1. Doanh thu bán hàng và cung cấp dịch vụ',
            level: 1,
            current_period: doanhThuBanHang,
            previous_period: doanhThuBanHangPrev,
            change_amount: doanhThuBanHang - doanhThuBanHangPrev,
            change_pct: calcChange(doanhThuBanHang, doanhThuBanHangPrev),
            margin: '100.00'
          },
          {
            id: 'giam_tru_doanh_thu',
            item: '2. Các khoản giảm trừ doanh thu',
            level: 1,
            current_period: -giamTruDT,
            previous_period: -giamTruDTPrev,
            change_amount: giamTruDTPrev - giamTruDT,
            change_pct: calcChange(giamTruDT, giamTruDTPrev),
            margin: calcMargin(-giamTruDT, doanhThuThuan)
          },
          {
            id: 'doanh_thu_thuan',
            item: '3. Doanh thu thuần về bán hàng và CCDV',
            level: 0,
            is_bold: true,
            current_period: doanhThuThuan,
            previous_period: doanhThuThuanPrev,
            change_amount: doanhThuThuan - doanhThuThuanPrev,
            change_pct: calcChange(doanhThuThuan, doanhThuThuanPrev),
            margin: '100.00'
          },

          // PHẦN B: LỢI NHUẬN GỘP
          { id: 'gross_header', item: 'B. LỢI NHUẬN GỘP', level: 0, is_header: true, is_bold: true },
          {
            id: 'gia_von',
            item: '4. Giá vốn hàng bán',
            level: 1,
            current_period: -giaVon,
            previous_period: -giaVonPrev,
            change_amount: giaVonPrev - giaVon,
            change_pct: calcChange(giaVon, giaVonPrev),
            margin: calcMargin(-giaVon, doanhThuThuan)
          },
          {
            id: 'loi_nhuan_gop',
            item: '5. Lợi nhuận gộp về bán hàng và CCDV',
            level: 0,
            is_bold: true,
            current_period: loiNhuanGop,
            previous_period: loiNhuanGopPrev,
            change_amount: loiNhuanGop - loiNhuanGopPrev,
            change_pct: calcChange(loiNhuanGop, loiNhuanGopPrev),
            margin: calcMargin(loiNhuanGop, doanhThuThuan)
          },
          {
            id: 'bien_loi_nhuan_gop',
            item: '   → Biên lợi nhuận gộp (%)',
            level: 1,
            is_ratio: true,
            current_period: parseFloat(calcMargin(loiNhuanGop, doanhThuThuan)),
            previous_period: parseFloat(calcMargin(loiNhuanGopPrev, doanhThuThuanPrev)),
            change_amount: parseFloat(calcMargin(loiNhuanGop, doanhThuThuan)) - parseFloat(calcMargin(loiNhuanGopPrev, doanhThuThuanPrev)),
            change_pct: '0.00',
            margin: '-'
          },

          // PHẦN C: LỢI NHUẬN TỪ HĐKD
          { id: 'operating_header', item: 'C. LỢI NHUẬN TỪ HOẠT ĐỘNG KINH DOANH', level: 0, is_header: true, is_bold: true },
          {
            id: 'doanh_thu_tai_chinh',
            item: '6. Doanh thu hoạt động tài chính',
            level: 1,
            current_period: doanhThuTC,
            previous_period: doanhThuTCPrev,
            change_amount: doanhThuTC - doanhThuTCPrev,
            change_pct: calcChange(doanhThuTC, doanhThuTCPrev),
            margin: calcMargin(doanhThuTC, doanhThuThuan)
          },
          {
            id: 'chi_phi_tai_chinh',
            item: '7. Chi phí tài chính',
            level: 1,
            current_period: -chiPhiTC,
            previous_period: -chiPhiTCPrev,
            change_amount: chiPhiTCPrev - chiPhiTC,
            change_pct: calcChange(chiPhiTC, chiPhiTCPrev),
            margin: calcMargin(-chiPhiTC, doanhThuThuan)
          },
          {
            id: 'chi_phi_ban_hang',
            item: '8. Chi phí bán hàng',
            level: 1,
            current_period: -chiPhiBH,
            previous_period: -chiPhiBHPrev,
            change_amount: chiPhiBHPrev - chiPhiBH,
            change_pct: calcChange(chiPhiBH, chiPhiBHPrev),
            margin: calcMargin(-chiPhiBH, doanhThuThuan)
          },
          {
            id: 'chi_phi_qldn',
            item: '9. Chi phí quản lý doanh nghiệp',
            level: 1,
            current_period: -chiPhiQLDN,
            previous_period: -chiPhiQLDNPrev,
            change_amount: chiPhiQLDNPrev - chiPhiQLDN,
            change_pct: calcChange(chiPhiQLDN, chiPhiQLDNPrev),
            margin: calcMargin(-chiPhiQLDN, doanhThuThuan)
          },
          {
            id: 'loi_nhuan_hdkd',
            item: '10. Lợi nhuận thuần từ hoạt động kinh doanh',
            level: 0,
            is_bold: true,
            current_period: loiNhuanHDKD,
            previous_period: loiNhuanHDKDPrev,
            change_amount: loiNhuanHDKD - loiNhuanHDKDPrev,
            change_pct: calcChange(loiNhuanHDKD, loiNhuanHDKDPrev),
            margin: calcMargin(loiNhuanHDKD, doanhThuThuan)
          },
          {
            id: 'bien_loi_nhuan_hdkd',
            item: '   → Biên lợi nhuận hoạt động (%)',
            level: 1,
            is_ratio: true,
            current_period: parseFloat(calcMargin(loiNhuanHDKD, doanhThuThuan)),
            previous_period: parseFloat(calcMargin(loiNhuanHDKDPrev, doanhThuThuanPrev)),
            change_amount: parseFloat(calcMargin(loiNhuanHDKD, doanhThuThuan)) - parseFloat(calcMargin(loiNhuanHDKDPrev, doanhThuThuanPrev)),
            change_pct: '0.00',
            margin: '-'
          },

          // PHẦN D: LỢI NHUẬN KHÁC
          { id: 'other_header', item: 'D. LỢI NHUẬN KHÁC', level: 0, is_header: true, is_bold: true },
          {
            id: 'thu_nhap_khac',
            item: '11. Thu nhập khác',
            level: 1,
            current_period: thuNhapKhac,
            previous_period: thuNhapKhacPrev,
            change_amount: thuNhapKhac - thuNhapKhacPrev,
            change_pct: calcChange(thuNhapKhac, thuNhapKhacPrev),
            margin: calcMargin(thuNhapKhac, doanhThuThuan)
          },
          {
            id: 'chi_phi_khac',
            item: '12. Chi phí khác',
            level: 1,
            current_period: -chiPhiKhac,
            previous_period: -chiPhiKhacPrev,
            change_amount: chiPhiKhacPrev - chiPhiKhac,
            change_pct: calcChange(chiPhiKhac, chiPhiKhacPrev),
            margin: calcMargin(-chiPhiKhac, doanhThuThuan)
          },
          {
            id: 'loi_nhuan_khac',
            item: '13. Lợi nhuận khác',
            level: 0,
            is_bold: true,
            current_period: loiNhuanKhac,
            previous_period: loiNhuanKhacPrev,
            change_amount: loiNhuanKhac - loiNhuanKhacPrev,
            change_pct: calcChange(loiNhuanKhac, loiNhuanKhacPrev),
            margin: calcMargin(loiNhuanKhac, doanhThuThuan)
          },

          // PHẦN E: LỢI NHUẬN TRƯỚC THUẾ VÀ SAU THUẾ
          { id: 'profit_header', item: 'E. LỢI NHUẬN TRƯỚC THUẾ VÀ SAU THUẾ', level: 0, is_header: true, is_bold: true },
          {
            id: 'loi_nhuan_truoc_thue',
            item: '14. Tổng lợi nhuận kế toán trước thuế',
            level: 0,
            is_bold: true,
            current_period: loiNhuanTruocThue,
            previous_period: loiNhuanTruocThuePrev,
            change_amount: loiNhuanTruocThue - loiNhuanTruocThuePrev,
            change_pct: calcChange(loiNhuanTruocThue, loiNhuanTruocThuePrev),
            margin: calcMargin(loiNhuanTruocThue, doanhThuThuan)
          },
          {
            id: 'chi_phi_thue_tndn',
            item: '15. Chi phí thuế TNDN hiện hành',
            level: 1,
            current_period: -chiPhiThueTNDN,
            previous_period: -chiPhiThueTNDNPrev,
            change_amount: chiPhiThueTNDNPrev - chiPhiThueTNDN,
            change_pct: calcChange(chiPhiThueTNDN, chiPhiThueTNDNPrev),
            margin: calcMargin(-chiPhiThueTNDN, doanhThuThuan)
          },
          {
            id: 'loi_nhuan_sau_thue',
            item: '16. Lợi nhuận sau thuế TNDN',
            level: 0,
            is_bold: true,
            is_total: true,
            current_period: loiNhuanSauThue,
            previous_period: loiNhuanSauThuePrev,
            change_amount: loiNhuanSauThue - loiNhuanSauThuePrev,
            change_pct: calcChange(loiNhuanSauThue, loiNhuanSauThuePrev),
            margin: calcMargin(loiNhuanSauThue, doanhThuThuan)
          },
          {
            id: 'bien_loi_nhuan_rong',
            item: '   → Biên lợi nhuận ròng (%)',
            level: 1,
            is_ratio: true,
            current_period: parseFloat(calcMargin(loiNhuanSauThue, doanhThuThuan)),
            previous_period: parseFloat(calcMargin(loiNhuanSauThuePrev, doanhThuThuanPrev)),
            change_amount: parseFloat(calcMargin(loiNhuanSauThue, doanhThuThuan)) - parseFloat(calcMargin(loiNhuanSauThuePrev, doanhThuThuanPrev)),
            change_pct: '0.00',
            margin: '-'
          }
        ];

        res.json(report);
      });
    });
  };
}

/**
 * Báo cáo Thực hiện Kế hoạch/Ngân sách (Budget Performance)
 * Hiển thị dự toán được giao, thực hiện và so sánh
 */
function getBudgetPerformance(db) {
    return (req, res) => {
        const fiscalYear = parseInt(req.query.fiscal_year) || new Date().getFullYear();
        const fromDate = `${fiscalYear}-01-01`;
        const toDate = `${fiscalYear}-12-31`;

        // Query dữ liệu từ budget_estimates
        const sqlBudget = `
            SELECT
                be.id,
                be.item_code,
                be.item_name,
                be.budget_type,
                be.estimate_type,
                be.status,
                SUM(CASE WHEN be.version = 1 THEN be.allocated_amount ELSE 0 END) as original_budget,
                SUM(CASE WHEN be.version > 1 THEN be.allocated_amount ELSE 0 END) as adjusted_budget,
                SUM(be.allocated_amount) as total_budget,
                SUM(be.spent_amount) as recorded_spent
            FROM budget_estimates be
            WHERE be.fiscal_year = ?
            GROUP BY be.item_code, be.budget_type
            ORDER BY be.budget_type DESC, be.item_code
        `;

        // Query thực tế từ General Ledger
        // Doanh thu: TK 511, 515, 711
        // Chi phí: TK 621-642, 635, 811
        const sqlActuals = `
            SELECT
                -- Doanh thu
                SUM(CASE WHEN account_code LIKE '511%' THEN credit_amount - debit_amount ELSE 0 END) as revenue_511,
                SUM(CASE WHEN account_code LIKE '515%' THEN credit_amount - debit_amount ELSE 0 END) as revenue_515,
                SUM(CASE WHEN account_code LIKE '711%' THEN credit_amount - debit_amount ELSE 0 END) as revenue_711,
                -- Chi phí
                SUM(CASE WHEN account_code LIKE '621%' OR account_code LIKE '622%' OR account_code LIKE '623%'
                         OR account_code LIKE '627%' THEN debit_amount - credit_amount ELSE 0 END) as expense_sx,
                SUM(CASE WHEN account_code LIKE '632%' THEN debit_amount - credit_amount ELSE 0 END) as expense_632,
                SUM(CASE WHEN account_code LIKE '641%' THEN debit_amount - credit_amount ELSE 0 END) as expense_641,
                SUM(CASE WHEN account_code LIKE '642%' THEN debit_amount - credit_amount ELSE 0 END) as expense_642,
                SUM(CASE WHEN account_code LIKE '635%' THEN debit_amount - credit_amount ELSE 0 END) as expense_635,
                SUM(CASE WHEN account_code LIKE '811%' THEN debit_amount - credit_amount ELSE 0 END) as expense_811
            FROM general_ledger
            WHERE trx_date >= ? AND trx_date <= ?
        `;

        db.all(sqlBudget, [fiscalYear], (err, budgetRows) => {
            if (err) {
                logger.error('Budget query error:', err);
            }

            db.get(sqlActuals, [fromDate, toDate], (err2, actuals) => {
                if (err2) {
                    logger.error('Actuals query error:', err2);
                }

                const act = actuals || {};
                const num = (v) => parseFloat(v) || 0;

                // Map thực tế với các khoản mục
                const actualMapping = {
                    // Doanh thu
                    'HP': num(act.revenue_511) * 0.4, // Học phí ~ 40% DT bán hàng (demo)
                    'VP': num(act.revenue_511) * 0.4, // Viện phí ~ 40% DT bán hàng (demo)
                    'SXKD': num(act.revenue_515) + num(act.revenue_711), // DT tài chính + Thu nhập khác
                    'DT_BH': num(act.revenue_511), // Doanh thu bán hàng
                    'DT_TC': num(act.revenue_515), // Doanh thu tài chính
                    'TN_K': num(act.revenue_711), // Thu nhập khác
                    // Chi phí
                    'CP_SX': num(act.expense_sx), // Chi phí sản xuất
                    'GV_HB': num(act.expense_632), // Giá vốn hàng bán
                    'CP_BH': num(act.expense_641), // Chi phí bán hàng
                    'CP_QL': num(act.expense_642), // Chi phí QLDN
                    'CP_TC': num(act.expense_635), // Chi phí tài chính
                    'CP_K': num(act.expense_811), // Chi phí khác
                };

                // Build report từ budget_estimates
                let report = [];

                if (budgetRows && budgetRows.length > 0) {
                    // Có dữ liệu dự toán
                    let revenueTotal = { original: 0, adjusted: 0, total: 0, actual: 0 };
                    let expenseTotal = { original: 0, adjusted: 0, total: 0, actual: 0 };

                    // Group by type
                    const revenueItems = budgetRows.filter(r => r.budget_type === 'REVENUE');
                    const expenseItems = budgetRows.filter(r => r.budget_type === 'EXPENSE');

                    // Header Doanh thu
                    if (revenueItems.length > 0) {
                        report.push({
                            id: 'revenue_header',
                            item_name: 'A. DOANH THU',
                            is_header: true,
                            is_bold: true
                        });

                        revenueItems.forEach((row, idx) => {
                            const actualAmount = actualMapping[row.item_code] || 0;
                            const totalBudget = num(row.total_budget);
                            const remaining = totalBudget - actualAmount;
                            const pctComplete = totalBudget > 0 ? (actualAmount / totalBudget * 100) : 0;

                            revenueTotal.original += num(row.original_budget);
                            revenueTotal.adjusted += num(row.adjusted_budget);
                            revenueTotal.total += totalBudget;
                            revenueTotal.actual += actualAmount;

                            report.push({
                                id: `rev_${idx}`,
                                item_code: row.item_code,
                                item_name: row.item_name,
                                budget_type: 'REVENUE',
                                du_toan_goc: num(row.original_budget),
                                du_toan_dieu_chinh: num(row.adjusted_budget),
                                du_toan_tong: totalBudget,
                                da_thuc_hien: actualAmount,
                                con_lai: remaining,
                                pct_hoan_thanh: pctComplete.toFixed(2),
                                status: row.status
                            });
                        });

                        // Subtotal Doanh thu
                        report.push({
                            id: 'revenue_total',
                            item_name: 'Tổng Doanh thu',
                            is_bold: true,
                            is_subtotal: true,
                            du_toan_goc: revenueTotal.original,
                            du_toan_dieu_chinh: revenueTotal.adjusted,
                            du_toan_tong: revenueTotal.total,
                            da_thuc_hien: revenueTotal.actual,
                            con_lai: revenueTotal.total - revenueTotal.actual,
                            pct_hoan_thanh: revenueTotal.total > 0 ? (revenueTotal.actual / revenueTotal.total * 100).toFixed(2) : '0.00'
                        });
                    }

                    // Header Chi phí
                    if (expenseItems.length > 0) {
                        report.push({
                            id: 'expense_header',
                            item_name: 'B. CHI PHÍ',
                            is_header: true,
                            is_bold: true
                        });

                        expenseItems.forEach((row, idx) => {
                            const actualAmount = actualMapping[row.item_code] || 0;
                            const totalBudget = num(row.total_budget);
                            const remaining = totalBudget - actualAmount;
                            const pctComplete = totalBudget > 0 ? (actualAmount / totalBudget * 100) : 0;

                            expenseTotal.original += num(row.original_budget);
                            expenseTotal.adjusted += num(row.adjusted_budget);
                            expenseTotal.total += totalBudget;
                            expenseTotal.actual += actualAmount;

                            report.push({
                                id: `exp_${idx}`,
                                item_code: row.item_code,
                                item_name: row.item_name,
                                budget_type: 'EXPENSE',
                                du_toan_goc: num(row.original_budget),
                                du_toan_dieu_chinh: num(row.adjusted_budget),
                                du_toan_tong: totalBudget,
                                da_thuc_hien: actualAmount,
                                con_lai: remaining,
                                pct_hoan_thanh: pctComplete.toFixed(2),
                                status: row.status
                            });
                        });

                        // Subtotal Chi phí
                        report.push({
                            id: 'expense_total',
                            item_name: 'Tổng Chi phí',
                            is_bold: true,
                            is_subtotal: true,
                            du_toan_goc: expenseTotal.original,
                            du_toan_dieu_chinh: expenseTotal.adjusted,
                            du_toan_tong: expenseTotal.total,
                            da_thuc_hien: expenseTotal.actual,
                            con_lai: expenseTotal.total - expenseTotal.actual,
                            pct_hoan_thanh: expenseTotal.total > 0 ? (expenseTotal.actual / expenseTotal.total * 100).toFixed(2) : '0.00'
                        });
                    }

                    // Chênh lệch Thu - Chi
                    const netBudget = revenueTotal.total - expenseTotal.total;
                    const netActual = revenueTotal.actual - expenseTotal.actual;
                    report.push({
                        id: 'net_result',
                        item_name: 'C. CHÊNH LỆCH THU - CHI',
                        is_header: true,
                        is_bold: true,
                        is_total: true,
                        du_toan_goc: revenueTotal.original - expenseTotal.original,
                        du_toan_dieu_chinh: revenueTotal.adjusted - expenseTotal.adjusted,
                        du_toan_tong: netBudget,
                        da_thuc_hien: netActual,
                        con_lai: netBudget - netActual,
                        pct_hoan_thanh: netBudget !== 0 ? (netActual / Math.abs(netBudget) * 100).toFixed(2) : '0.00'
                    });

                } else {
                    // Không có dự toán - hiển thị dựa trên thực tế GL
                    const totalRevenue = num(act.revenue_511) + num(act.revenue_515) + num(act.revenue_711);
                    const totalExpense = num(act.expense_632) + num(act.expense_641) + num(act.expense_642) +
                                        num(act.expense_635) + num(act.expense_811) + num(act.expense_sx);

                    report = [
                        { id: 'notice', item_name: '⚠ Chưa có dữ liệu Dự toán/Kế hoạch cho năm ' + fiscalYear, is_header: true, is_bold: true },
                        { id: 'rev_header', item_name: 'A. DOANH THU (Thực tế)', is_header: true, is_bold: true },
                        { id: 'rev_511', item_code: '511', item_name: 'Doanh thu bán hàng và CCDV', da_thuc_hien: num(act.revenue_511), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'rev_515', item_code: '515', item_name: 'Doanh thu hoạt động tài chính', da_thuc_hien: num(act.revenue_515), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'rev_711', item_code: '711', item_name: 'Thu nhập khác', da_thuc_hien: num(act.revenue_711), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'rev_total', item_name: 'Tổng Doanh thu', is_bold: true, is_subtotal: true, da_thuc_hien: totalRevenue, du_toan_tong: 0, pct_hoan_thanh: '-' },

                        { id: 'exp_header', item_name: 'B. CHI PHÍ (Thực tế)', is_header: true, is_bold: true },
                        { id: 'exp_632', item_code: '632', item_name: 'Giá vốn hàng bán', da_thuc_hien: num(act.expense_632), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'exp_641', item_code: '641', item_name: 'Chi phí bán hàng', da_thuc_hien: num(act.expense_641), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'exp_642', item_code: '642', item_name: 'Chi phí quản lý doanh nghiệp', da_thuc_hien: num(act.expense_642), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'exp_635', item_code: '635', item_name: 'Chi phí tài chính', da_thuc_hien: num(act.expense_635), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'exp_811', item_code: '811', item_name: 'Chi phí khác', da_thuc_hien: num(act.expense_811), du_toan_tong: 0, pct_hoan_thanh: '-' },
                        { id: 'exp_total', item_name: 'Tổng Chi phí', is_bold: true, is_subtotal: true, da_thuc_hien: totalExpense, du_toan_tong: 0, pct_hoan_thanh: '-' },

                        { id: 'net', item_name: 'C. CHÊNH LỆCH THU - CHI', is_bold: true, is_total: true, da_thuc_hien: totalRevenue - totalExpense, du_toan_tong: 0, pct_hoan_thanh: '-' }
                    ];
                }

                res.json(report);
            });
        });
    };
}

/**
 * Phân tích Tài chính (Financial Analysis)
 * Tính toán các chỉ số tài chính quan trọng: Thanh khoản, Hiệu quả, Đòn bẩy, Sinh lời
 */
function getFinancialAnalysis(db) {
  return (req, res) => {
    const toDate = req.query.to || req.query.toDate || new Date().toISOString().split('T')[0];
    const fromDate = req.query.from || req.query.fromDate || `${toDate.slice(0, 4)}-01-01`;

    // Tính kỳ trước (năm trước)
    const currentYear = parseInt(toDate.slice(0, 4));
    const prevFromDate = `${currentYear - 1}-01-01`;
    const prevToDate = `${currentYear - 1}-12-31`;

    // Query Balance Sheet data (cuối kỳ)
    const sqlBalanceSheet = `
      SELECT account_code, SUM(debit_amount) - SUM(credit_amount) as balance
      FROM general_ledger
      WHERE trx_date <= ?
      GROUP BY account_code
    `;

    // Query PnL data (trong kỳ)
    const sqlPnL = `
      SELECT
        -- Doanh thu
        SUM(CASE WHEN account_code LIKE '511%' THEN credit_amount - debit_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN account_code LIKE '521%' THEN debit_amount - credit_amount ELSE 0 END) as deductions,
        SUM(CASE WHEN account_code LIKE '515%' THEN credit_amount - debit_amount ELSE 0 END) as financial_income,
        SUM(CASE WHEN account_code LIKE '711%' THEN credit_amount - debit_amount ELSE 0 END) as other_income,
        -- Chi phí
        SUM(CASE WHEN account_code LIKE '632%' THEN debit_amount - credit_amount ELSE 0 END) as cogs,
        SUM(CASE WHEN account_code LIKE '641%' THEN debit_amount - credit_amount ELSE 0 END) as selling_exp,
        SUM(CASE WHEN account_code LIKE '642%' THEN debit_amount - credit_amount ELSE 0 END) as admin_exp,
        SUM(CASE WHEN account_code LIKE '635%' THEN debit_amount - credit_amount ELSE 0 END) as financial_exp,
        SUM(CASE WHEN account_code LIKE '811%' THEN debit_amount - credit_amount ELSE 0 END) as other_exp,
        SUM(CASE WHEN account_code LIKE '821%' THEN debit_amount - credit_amount ELSE 0 END) as tax_exp
      FROM general_ledger
      WHERE trx_date >= ? AND trx_date <= ?
    `;

    // Query Balance Sheet đầu kỳ
    const sqlBalanceSheetPrev = `
      SELECT account_code, SUM(debit_amount) - SUM(credit_amount) as balance
      FROM general_ledger
      WHERE trx_date <= ?
      GROUP BY account_code
    `;

    db.all(sqlBalanceSheet, [toDate], (err, bsRows) => {
      if (err) return res.status(400).json({ error: err.message });

      db.get(sqlPnL, [fromDate, toDate], (err, pnl) => {
        if (err) return res.status(400).json({ error: err.message });

        db.all(sqlBalanceSheetPrev, [prevToDate], (err, bsPrevRows) => {
          if (err) return res.status(400).json({ error: err.message });

          db.get(sqlPnL, [prevFromDate, prevToDate], (err, pnlPrev) => {
            if (err) return res.status(400).json({ error: err.message });

            // Helper to sum by account prefix
            const sumByPrefix = (rows, prefix) => {
              if (!rows) return 0;
              return rows.filter(r => r.account_code && r.account_code.startsWith(prefix))
                .reduce((acc, r) => acc + (r.balance || 0), 0);
            };

            const num = (v) => parseFloat(v) || 0;

            // === CURRENT PERIOD ===
            // Assets
            const cash = sumByPrefix(bsRows, '111') + sumByPrefix(bsRows, '112') + sumByPrefix(bsRows, '113');
            const shortTermInv = sumByPrefix(bsRows, '121') + sumByPrefix(bsRows, '128');
            const receivables = sumByPrefix(bsRows, '131') + sumByPrefix(bsRows, '136') + sumByPrefix(bsRows, '138');
            const inventory = sumByPrefix(bsRows, '15');
            const otherCurrAssets = sumByPrefix(bsRows, '133') + sumByPrefix(bsRows, '141') + sumByPrefix(bsRows, '242');
            const currentAssets = cash + shortTermInv + receivables + inventory + otherCurrAssets;

            const fixedAssets = sumByPrefix(bsRows, '211') + sumByPrefix(bsRows, '212') + sumByPrefix(bsRows, '213')
              - sumByPrefix(bsRows, '214');
            const longTermInv = sumByPrefix(bsRows, '221') + sumByPrefix(bsRows, '222') + sumByPrefix(bsRows, '228');
            const otherLTAssets = sumByPrefix(bsRows, '241') + sumByPrefix(bsRows, '243') + sumByPrefix(bsRows, '244');
            const nonCurrentAssets = fixedAssets + longTermInv + otherLTAssets;
            const totalAssets = currentAssets + nonCurrentAssets;

            // Liabilities
            const shortTermDebt = sumByPrefix(bsRows, '311') + sumByPrefix(bsRows, '341');
            const payables = sumByPrefix(bsRows, '331') + sumByPrefix(bsRows, '333') + sumByPrefix(bsRows, '334')
              + sumByPrefix(bsRows, '335') + sumByPrefix(bsRows, '336') + sumByPrefix(bsRows, '338');
            const otherCurrLiab = sumByPrefix(bsRows, '351') + sumByPrefix(bsRows, '352') + sumByPrefix(bsRows, '353');
            const currentLiabilities = Math.abs(shortTermDebt) + Math.abs(payables) + Math.abs(otherCurrLiab);

            const longTermDebt = Math.abs(sumByPrefix(bsRows, '342') + sumByPrefix(bsRows, '343'));
            const otherLTLiab = Math.abs(sumByPrefix(bsRows, '352') + sumByPrefix(bsRows, '353'));
            const nonCurrentLiabilities = longTermDebt + otherLTLiab;
            const totalLiabilities = currentLiabilities + nonCurrentLiabilities;

            // Equity
            const equity = Math.abs(sumByPrefix(bsRows, '411') + sumByPrefix(bsRows, '412') + sumByPrefix(bsRows, '413')
              + sumByPrefix(bsRows, '414') + sumByPrefix(bsRows, '418') + sumByPrefix(bsRows, '419')
              + sumByPrefix(bsRows, '421'));

            // PnL calculations
            const p = pnl || {};
            const netRevenue = num(p.revenue) - num(p.deductions);
            const grossProfit = netRevenue - num(p.cogs);
            const operatingProfit = grossProfit + num(p.financial_income) - num(p.selling_exp) - num(p.admin_exp) - num(p.financial_exp);
            const ebit = operatingProfit + num(p.other_income) - num(p.other_exp);
            const netIncome = ebit - num(p.tax_exp);

            // === PREVIOUS PERIOD ===
            const cashPrev = sumByPrefix(bsPrevRows, '111') + sumByPrefix(bsPrevRows, '112') + sumByPrefix(bsPrevRows, '113');
            const shortTermInvPrev = sumByPrefix(bsPrevRows, '121') + sumByPrefix(bsPrevRows, '128');
            const receivablesPrev = sumByPrefix(bsPrevRows, '131') + sumByPrefix(bsPrevRows, '136') + sumByPrefix(bsPrevRows, '138');
            const inventoryPrev = sumByPrefix(bsPrevRows, '15');
            const currentAssetsPrev = cashPrev + shortTermInvPrev + receivablesPrev + inventoryPrev
              + sumByPrefix(bsPrevRows, '133') + sumByPrefix(bsPrevRows, '141') + sumByPrefix(bsPrevRows, '242');
            const totalAssetsPrev = currentAssetsPrev + sumByPrefix(bsPrevRows, '2');
            const currentLiabilitiesPrev = Math.abs(sumByPrefix(bsPrevRows, '311') + sumByPrefix(bsPrevRows, '331')
              + sumByPrefix(bsPrevRows, '333') + sumByPrefix(bsPrevRows, '334') + sumByPrefix(bsPrevRows, '338')
              + sumByPrefix(bsPrevRows, '341'));
            const totalLiabilitiesPrev = currentLiabilitiesPrev + Math.abs(sumByPrefix(bsPrevRows, '342'));
            const equityPrev = Math.abs(sumByPrefix(bsPrevRows, '41'));

            const pp = pnlPrev || {};
            const netRevenuePrev = num(pp.revenue) - num(pp.deductions);
            const grossProfitPrev = netRevenuePrev - num(pp.cogs);
            const operatingProfitPrev = grossProfitPrev + num(pp.financial_income) - num(pp.selling_exp) - num(pp.admin_exp) - num(pp.financial_exp);
            const ebitPrev = operatingProfitPrev + num(pp.other_income) - num(pp.other_exp);
            const netIncomePrev = ebitPrev - num(pp.tax_exp);

            // === CALCULATE RATIOS ===
            const calcRatio = (numerator, denominator) => denominator !== 0 ? (numerator / denominator) : 0;
            const calcPct = (numerator, denominator) => denominator !== 0 ? ((numerator / denominator) * 100) : 0;
            const formatRatio = (val) => val.toFixed(2);
            const formatPct = (val) => val.toFixed(2);

            // Build report
            const report = [
              // === A. CHỈ SỐ THANH KHOẢN ===
              { id: 'liquidity_header', category: 'A. CHỈ SỐ THANH KHOẢN (LIQUIDITY)', is_header: true },
              {
                id: 'current_ratio',
                indicator: 'Hệ số thanh toán hiện hành (Current Ratio)',
                formula: 'Tài sản ngắn hạn / Nợ ngắn hạn',
                current_value: formatRatio(calcRatio(currentAssets, currentLiabilities)),
                previous_value: formatRatio(calcRatio(currentAssetsPrev, currentLiabilitiesPrev)),
                unit: 'Lần',
                benchmark: '> 1.5',
                interpretation: currentAssets > currentLiabilities * 1.5 ? 'Tốt' : currentAssets > currentLiabilities ? 'Bình thường' : 'Cần cải thiện'
              },
              {
                id: 'quick_ratio',
                indicator: 'Hệ số thanh toán nhanh (Quick Ratio)',
                formula: '(TS ngắn hạn - Hàng tồn kho) / Nợ ngắn hạn',
                current_value: formatRatio(calcRatio(currentAssets - inventory, currentLiabilities)),
                previous_value: formatRatio(calcRatio(currentAssetsPrev - inventoryPrev, currentLiabilitiesPrev)),
                unit: 'Lần',
                benchmark: '> 1.0',
                interpretation: (currentAssets - inventory) > currentLiabilities ? 'Tốt' : 'Cần cải thiện'
              },
              {
                id: 'cash_ratio',
                indicator: 'Hệ số thanh toán tức thời (Cash Ratio)',
                formula: 'Tiền và tương đương tiền / Nợ ngắn hạn',
                current_value: formatRatio(calcRatio(cash, currentLiabilities)),
                previous_value: formatRatio(calcRatio(cashPrev, currentLiabilitiesPrev)),
                unit: 'Lần',
                benchmark: '> 0.5',
                interpretation: cash > currentLiabilities * 0.5 ? 'Tốt' : 'Cần cải thiện'
              },
              {
                id: 'working_capital',
                indicator: 'Vốn lưu động ròng (Working Capital)',
                formula: 'Tài sản ngắn hạn - Nợ ngắn hạn',
                current_value: (currentAssets - currentLiabilities).toLocaleString('vi-VN'),
                previous_value: (currentAssetsPrev - currentLiabilitiesPrev).toLocaleString('vi-VN'),
                unit: 'VNĐ',
                benchmark: '> 0',
                interpretation: currentAssets > currentLiabilities ? 'Dương (Tốt)' : 'Âm (Rủi ro)'
              },

              // === B. CHỈ SỐ HIỆU QUẢ HOẠT ĐỘNG ===
              { id: 'efficiency_header', category: 'B. CHỈ SỐ HIỆU QUẢ HOẠT ĐỘNG (EFFICIENCY)', is_header: true },
              {
                id: 'asset_turnover',
                indicator: 'Vòng quay Tổng tài sản (Asset Turnover)',
                formula: 'Doanh thu thuần / Tổng tài sản bình quân',
                current_value: formatRatio(calcRatio(netRevenue, (totalAssets + totalAssetsPrev) / 2)),
                previous_value: formatRatio(calcRatio(netRevenuePrev, totalAssetsPrev)),
                unit: 'Lần',
                benchmark: '> 1.0',
                interpretation: netRevenue > (totalAssets + totalAssetsPrev) / 2 ? 'Hiệu quả cao' : 'Cần cải thiện'
              },
              {
                id: 'receivables_turnover',
                indicator: 'Vòng quay Khoản phải thu (Receivables Turnover)',
                formula: 'Doanh thu thuần / Phải thu bình quân',
                current_value: formatRatio(calcRatio(netRevenue, (receivables + receivablesPrev) / 2)),
                previous_value: formatRatio(calcRatio(netRevenuePrev, receivablesPrev)),
                unit: 'Lần',
                benchmark: '> 6',
                interpretation: receivables > 0 ? `~${Math.round(365 / calcRatio(netRevenue, (receivables + receivablesPrev) / 2))} ngày thu tiền` : 'N/A'
              },
              {
                id: 'inventory_turnover',
                indicator: 'Vòng quay Hàng tồn kho (Inventory Turnover)',
                formula: 'Giá vốn hàng bán / HTK bình quân',
                current_value: formatRatio(calcRatio(num(p.cogs), (inventory + inventoryPrev) / 2)),
                previous_value: formatRatio(calcRatio(num(pp.cogs), inventoryPrev)),
                unit: 'Lần',
                benchmark: '> 4',
                interpretation: inventory > 0 ? `~${Math.round(365 / calcRatio(num(p.cogs), (inventory + inventoryPrev) / 2))} ngày tồn kho` : 'N/A'
              },
              {
                id: 'payables_turnover',
                indicator: 'Vòng quay Khoản phải trả (Payables Turnover)',
                formula: 'Giá vốn hàng bán / Phải trả bình quân',
                current_value: formatRatio(calcRatio(num(p.cogs), (payables + Math.abs(sumByPrefix(bsPrevRows, '331'))) / 2)),
                previous_value: formatRatio(calcRatio(num(pp.cogs), Math.abs(sumByPrefix(bsPrevRows, '331')))),
                unit: 'Lần',
                benchmark: '4-6',
                interpretation: payables > 0 ? `~${Math.round(365 / calcRatio(num(p.cogs), payables))} ngày trả nợ` : 'N/A'
              },

              // === C. CHỈ SỐ ĐÒN BẨY TÀI CHÍNH ===
              { id: 'leverage_header', category: 'C. CHỈ SỐ ĐÒN BẨY TÀI CHÍNH (LEVERAGE)', is_header: true },
              {
                id: 'debt_ratio',
                indicator: 'Hệ số Nợ (Debt Ratio)',
                formula: 'Tổng nợ phải trả / Tổng tài sản',
                current_value: formatPct(calcPct(totalLiabilities, totalAssets)),
                previous_value: formatPct(calcPct(totalLiabilitiesPrev, totalAssetsPrev)),
                unit: '%',
                benchmark: '< 60%',
                interpretation: totalLiabilities < totalAssets * 0.6 ? 'An toàn' : 'Rủi ro cao'
              },
              {
                id: 'debt_equity',
                indicator: 'Hệ số Nợ/Vốn CSH (Debt to Equity)',
                formula: 'Tổng nợ phải trả / Vốn chủ sở hữu',
                current_value: formatRatio(calcRatio(totalLiabilities, equity)),
                previous_value: formatRatio(calcRatio(totalLiabilitiesPrev, equityPrev)),
                unit: 'Lần',
                benchmark: '< 2.0',
                interpretation: totalLiabilities < equity * 2 ? 'Chấp nhận được' : 'Đòn bẩy cao'
              },
              {
                id: 'equity_multiplier',
                indicator: 'Hệ số đòn bẩy tài chính (Equity Multiplier)',
                formula: 'Tổng tài sản / Vốn chủ sở hữu',
                current_value: formatRatio(calcRatio(totalAssets, equity)),
                previous_value: formatRatio(calcRatio(totalAssetsPrev, equityPrev)),
                unit: 'Lần',
                benchmark: '< 3.0',
                interpretation: totalAssets < equity * 3 ? 'Bình thường' : 'Sử dụng đòn bẩy cao'
              },
              {
                id: 'interest_coverage',
                indicator: 'Hệ số khả năng trả lãi (Interest Coverage)',
                formula: 'EBIT / Chi phí lãi vay',
                current_value: num(p.financial_exp) > 0 ? formatRatio(calcRatio(ebit, num(p.financial_exp))) : 'N/A',
                previous_value: num(pp.financial_exp) > 0 ? formatRatio(calcRatio(ebitPrev, num(pp.financial_exp))) : 'N/A',
                unit: 'Lần',
                benchmark: '> 3.0',
                interpretation: num(p.financial_exp) > 0 ? (ebit > num(p.financial_exp) * 3 ? 'An toàn' : 'Rủi ro') : 'Không có nợ vay'
              },

              // === D. CHỈ SỐ SINH LỜI ===
              { id: 'profitability_header', category: 'D. CHỈ SỐ SINH LỜI (PROFITABILITY)', is_header: true },
              {
                id: 'gross_margin',
                indicator: 'Biên lợi nhuận gộp (Gross Profit Margin)',
                formula: 'Lợi nhuận gộp / Doanh thu thuần',
                current_value: formatPct(calcPct(grossProfit, netRevenue)),
                previous_value: formatPct(calcPct(grossProfitPrev, netRevenuePrev)),
                unit: '%',
                benchmark: '> 25%',
                interpretation: grossProfit > netRevenue * 0.25 ? 'Tốt' : 'Cần cải thiện'
              },
              {
                id: 'operating_margin',
                indicator: 'Biên lợi nhuận hoạt động (Operating Margin)',
                formula: 'Lợi nhuận từ HĐKD / Doanh thu thuần',
                current_value: formatPct(calcPct(operatingProfit, netRevenue)),
                previous_value: formatPct(calcPct(operatingProfitPrev, netRevenuePrev)),
                unit: '%',
                benchmark: '> 10%',
                interpretation: operatingProfit > netRevenue * 0.1 ? 'Tốt' : 'Cần cải thiện'
              },
              {
                id: 'net_margin',
                indicator: 'Biên lợi nhuận ròng (Net Profit Margin)',
                formula: 'Lợi nhuận sau thuế / Doanh thu thuần',
                current_value: formatPct(calcPct(netIncome, netRevenue)),
                previous_value: formatPct(calcPct(netIncomePrev, netRevenuePrev)),
                unit: '%',
                benchmark: '> 5%',
                interpretation: netIncome > netRevenue * 0.05 ? 'Tốt' : 'Cần cải thiện'
              },
              {
                id: 'roa',
                indicator: 'Tỷ suất sinh lời trên Tài sản (ROA)',
                formula: 'Lợi nhuận sau thuế / Tổng TS bình quân',
                current_value: formatPct(calcPct(netIncome, (totalAssets + totalAssetsPrev) / 2)),
                previous_value: formatPct(calcPct(netIncomePrev, totalAssetsPrev)),
                unit: '%',
                benchmark: '> 5%',
                interpretation: netIncome > (totalAssets + totalAssetsPrev) / 2 * 0.05 ? 'Tốt' : 'Cần cải thiện'
              },
              {
                id: 'roe',
                indicator: 'Tỷ suất sinh lời trên Vốn CSH (ROE)',
                formula: 'Lợi nhuận sau thuế / Vốn CSH bình quân',
                current_value: formatPct(calcPct(netIncome, (equity + equityPrev) / 2)),
                previous_value: formatPct(calcPct(netIncomePrev, equityPrev)),
                unit: '%',
                benchmark: '> 15%',
                interpretation: netIncome > (equity + equityPrev) / 2 * 0.15 ? 'Xuất sắc' : netIncome > (equity + equityPrev) / 2 * 0.1 ? 'Tốt' : 'Trung bình'
              },

              // === E. PHÂN TÍCH DUPONT ===
              { id: 'dupont_header', category: 'E. PHÂN TÍCH DUPONT (ROE DECOMPOSITION)', is_header: true },
              {
                id: 'dupont_npm',
                indicator: '1. Biên lợi nhuận ròng (NPM)',
                formula: 'Lợi nhuận sau thuế / Doanh thu',
                current_value: formatPct(calcPct(netIncome, netRevenue)),
                previous_value: formatPct(calcPct(netIncomePrev, netRevenuePrev)),
                unit: '%',
                benchmark: '-',
                interpretation: 'Hiệu quả kiểm soát chi phí'
              },
              {
                id: 'dupont_ato',
                indicator: '2. Vòng quay tài sản (ATO)',
                formula: 'Doanh thu / Tổng tài sản',
                current_value: formatRatio(calcRatio(netRevenue, totalAssets)),
                previous_value: formatRatio(calcRatio(netRevenuePrev, totalAssetsPrev)),
                unit: 'Lần',
                benchmark: '-',
                interpretation: 'Hiệu quả sử dụng tài sản'
              },
              {
                id: 'dupont_em',
                indicator: '3. Đòn bẩy tài chính (EM)',
                formula: 'Tổng tài sản / Vốn CSH',
                current_value: formatRatio(calcRatio(totalAssets, equity)),
                previous_value: formatRatio(calcRatio(totalAssetsPrev, equityPrev)),
                unit: 'Lần',
                benchmark: '-',
                interpretation: 'Mức sử dụng đòn bẩy'
              },
              {
                id: 'dupont_roe',
                indicator: '→ ROE = NPM × ATO × EM',
                formula: 'Lợi nhuận / Vốn CSH',
                current_value: formatPct(calcPct(netIncome, equity)),
                previous_value: formatPct(calcPct(netIncomePrev, equityPrev)),
                unit: '%',
                benchmark: '> 15%',
                is_total: true,
                interpretation: netIncome > equity * 0.15 ? 'Xuất sắc' : netIncome > equity * 0.1 ? 'Tốt' : 'Cần cải thiện'
              }
            ];

            res.json(report);
          });
        });
      });
    });
  };
}

module.exports = {
  getBalanceSheetDN,
  getProfitLossStatement,
  getCashFlowStatement,
  getNotesToFinancialStatements,
  getCostAnalysis,
  getProfitabilityAnalysis,
  getBudgetPerformance,
  getFinancialAnalysis
};
