// ========================================
// HCSN REPORTS APIs - TT 24/2024/TT-BTC
// ========================================

/**
 * API 1: Bảng Cân đối Tài khoản Kế toán HCSN
 * Theo mẫu B01-BCTC (TT 24/2024)
 */
function getBalanceSheetHCSN(db) {
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

            // Cấu trúc HCSN theo TT 24/2024
            const report = [
                // =================
                // PHẦN A: TÀI SẢN
                // =================
                { id: 'A', code: 'A', target: 'TÀI SẢN', level: 0, is_bold: true, current_period: sumByPrefix('1') + sumByPrefix('2'), previous_period: 0 },

                // I. Tài sản lưu động
                { id: 'AI', code: 'AI', target: 'I. Tài sản lưu động', level: 1, is_bold: true, current_period: sumByPrefix('1'), previous_period: 0 },
                { id: '01', code: '01', target: '1. Tiền và các khoản tương đương tiền', level: 2, current_period: sumByPrefix('111') + sumByPrefix('112') + sumByPrefix('113'), previous_period: 0 },
                { id: '02', code: '02', target: '2. Các khoản đầu tư tài chính ngắn hạn', level: 2, current_period: sumByPrefix('121') + sumByPrefix('128'), previous_period: 0 },
                { id: '03', code: '03', target: '3. Các khoản phải thu', level: 2, current_period: sumByPrefix('131') + sumByPrefix('136') + sumByPrefix('138'), previous_period: 0 },
                { id: '04', code: '04', target: '4. Hàng tồn kho', level: 2, current_period: sumByPrefix('151') + sumByPrefix('152') + sumByPrefix('153'), previous_period: 0 },
                { id: '05', code: '05', target: '5. Tài sản lưu động khác', level: 2, current_period: sumByPrefix('141') + sumByPrefix('142'), previous_period: 0 },

                // II. Tài sản cố định
                { id: 'AII', code: 'AII', target: 'II. Tài sản cố định va đầu tư dài hạn', level: 1, is_bold: true, current_period: sumByPrefix('2'), previous_period: 0 },
                { id: '06', code: '06', target: '1. Tài sản cố định hữu hình', level: 2, current_period: sumByPrefix('211') - Math.abs(sumByPrefix('2141')), previous_period: 0 },
                { id: '06a', code: '06a', target: '   - Nguyên giá', level: 3, current_period: sumByPrefix('211'), previous_period: 0 },
                { id: '06b', code: '06b', target: '   - Giá trị hao mòn lũy kế', level: 3, current_period: -Math.abs(sumByPrefix('2141')), previous_period: 0 },
                { id: '07', code: '07', target: '2. Tài sản cố định vô hình', level: 2, current_period: sumByPrefix('213') - Math.abs(sumByPrefix('2143')), previous_period: 0 },
                { id: '08', code: '08', target: '3. Tài sản cố định thuê tài chính', level: 2, current_period: sumByPrefix('212') - Math.abs(sumByPrefix('2142')), previous_period: 0 },
                { id: '09', code: '09', target: '4. Đầu tư dài hạn', level: 2, current_period: sumByPrefix('221') + sumByPrefix('222') + sumByPrefix('228'), previous_period: 0 },

                // =================
                // PHẦN B: NỢ PHẢI TRẢ
                // =================
                { id: 'B', code: 'B', target: 'N PHẢI TRẢ', level: 0, is_bold: true, current_period: -sumByPrefix('3'), previous_period: 0 },
                { id: '10', code: '10', target: '1. Nợ ngắn hạn', level: 1, current_period: -(sumByPrefix('331') + sumByPrefix('333') + sumByPrefix('334') + sumByPrefix('335') + sumByPrefix('336') + sumByPrefix('338')), previous_period: 0 },
                { id: '11', code: '11', target: '2. Nợ dài hạn', level: 1, current_period: -(sumByPrefix('341') + sumByPrefix('343')), previous_period: 0 },

                // =================
                // PHẦN C: NGUỒN KINH PHÍ VÀ QUỸ
                // =================
                { id: 'C', code: 'C', target: 'NGUỒN KINH PHÍ VÀ QUỸ', level: 0, is_bold: true, current_period: -sumByPrefix('4'), previous_period: 0 },
                { id: '12', code: '12', target: '1. Nguồn kinh phí hoạt động', level: 1, current_period: -sumByPrefix('411'), previous_period: 0 },
                { id: '13', code: '13', target: '2. Các quỹ', level: 1, current_period: -(sumByPrefix('412') + sumByPrefix('413') + sumByPrefix('414')), previous_period: 0 },
                { id: '14', code: '14', target: '3. Nguồn kinh phí đã hình thành TSCĐ', level: 1, current_period: -sumByPrefix('421'), previous_period: 0 },
                { id: '15', code: '15', target: '4. Nguồn kinh phí sự nghiệp', level: 1, current_period: -sumByPrefix('431'), previous_period: 0 },
                { id: '16', code: '16', target: '5. Nguồn vốn đầu tư XDCB', level: 1, current_period: -sumByPrefix('441'), previous_period: 0 },
                { id: '17', code: '17', target: '6. Nguồn kinh phí khác', level: 1, current_period: -(sumByPrefix('461') + sumByPrefix('466')), previous_period: 0 },
            ];

            res.json(report);
        });
    };
}

/**
 * API 2: Báo cáo Kết quả Hoạt động
 * Theo mẫu B02-BCTC (TT 24/2024)
 */
function getActivityResult(db) {
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

            // Thu có số dư Credit (âm), Chi có số dư Debit (dương)
            const thu511 = -sumByPrefix('511');
            const thu512 = -sumByPrefix('512');
            const thu515 = -sumByPrefix('515');
            const thu521 = -sumByPrefix('521');
            const tongThu = thu511 + thu512 + thu515 + thu521;

            const chi611 = sumByPrefix('611');
            const chi612 = sumByPrefix('612');
            const chi613 = sumByPrefix('613');
            const chi621 = sumByPrefix('621');
            const chi622 = sumByPrefix('622');
            const chi627 = sumByPrefix('627');
            const chi628 = sumByPrefix('628');
            const tongChi = chi611 + chi612 + chi613 + chi621 + chi622 + chi627 + chi628;

            const report = [
                // I. THU CÁC KHOẢN
                { id: 'I', code: 'I', target: 'I. THU CÁC KHOẢN', level: 0, is_bold: true, current_period: tongThu, previous_period: 0 },
                { id: '01', code: '01', target: '1. Thu hoạt động thường xuyên', level: 1, current_period: thu511, previous_period: 0 },
                { id: '02', code: '02', target: '2. Thu hoạt động không thường xuyên', level: 1, current_period: thu512, previous_period: 0 },
                { id: '03', code: '03', target: '3. Thu từ hoạt động sự nghiệp', level: 1, current_period: thu515, previous_period: 0 },
                { id: '04', code: '04', target: '4. Thu khác', level: 1, current_period: thu521, previous_period: 0 },

                // II. CHI CÁC KHOẢN
                { id: 'II', code: 'II', target: 'II. CHI CÁC KHOẢN', level: 0, is_bold: true, current_period: tongChi, previous_period: 0 },
                { id: '05', code: '05', target: '1. Chi lương và phụ cấp', level: 1, current_period: chi611, previous_period: 0 },
                { id: '06', code: '06', target: '2. Chi các khoản đóng góp', level: 1, current_period: chi612, previous_period: 0 },
                { id: '07', code: '07', target: '3. Chi mua sắm', level: 1, current_period: chi613, previous_period: 0 },
                { id: '08', code: '08', target: '4. Chi nghiệp vụ chuyên môn', level: 1, current_period: chi621, previous_period: 0 },
                { id: '09', code: '09', target: '5. Chi dịch vụ công', level: 1, current_period: chi622, previous_period: 0 },
                { id: '10', code: '10', target: '6. Chi khấu hao TSCĐ', level: 1, current_period: chi627, previous_period: 0 },
                { id: '11', code: '11', target: '7. Chi khác', level: 1, current_period: chi628, previous_period: 0 },

                // III. KẾT QUẢ HOẠT ĐỘNG
                { id: 'III', code: 'III', target: 'III. CHÊNH LỆCH THU - CHI', level: 0, is_bold: true, current_period: tongThu - tongChi, previous_period: 0 },
            ];

            res.json(report);
        });
    };
}

/**
 * API 3: Quyết toán Kinh phí Hoạt động Thường xuyên
 * Theo mẫu B03-BCQT (TT 24/2024)
 */
function getBudgetSettlementRegular(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            const sql = `
                SELECT
                    be.chapter_code,
                    be.item_code as category_code,
                    be.item_name as category_name,
                    COALESCE(be.allocated_amount, 0) as du_toan,
                    COALESCE(be.spent_amount, 0) as thuc_hien,
                    COALESCE(be.committed_amount, 0) as cam_ket,
                    COALESCE(be.allocated_amount - be.spent_amount, 0) as chenh_lech,
                    ROUND(COALESCE(be.spent_amount * 100.0 / NULLIF(be.allocated_amount, 0), 0), 2) as ty_le_thuc_hien
                FROM budget_estimates be
                WHERE be.fiscal_year = ?
                  AND be.estimate_type = 'RECURRENT'
                  AND be.status = 'APPROVED'
                ORDER BY be.chapter_code, be.item_code
            `;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[SETTLEMENT_REGULAR_ERROR]', err.message);
                    return res.status(500).json({ error: err.message });
                }

                // Tính tổng cộng
                const totals = rows.reduce((acc, r) => ({
                    du_toan: acc.du_toan + (r.du_toan || 0),
                    thuc_hien: acc.thuc_hien + (r.thuc_hien || 0),
                    cam_ket: acc.cam_ket + (r.cam_ket || 0),
                    chenh_lech: acc.chenh_lech + (r.chenh_lech || 0)
                }), { du_toan: 0, thuc_hien: 0, cam_ket: 0, chenh_lech: 0 });

                // Thêm dòng tổng cộng
                rows.push({
                    category_code: '',
                    category_name: 'TỔNG CỘNG',
                    du_toan: totals.du_toan,
                    thuc_hien: totals.thuc_hien,
                    cam_ket: totals.cam_ket,
                    chenh_lech: totals.chenh_lech,
                    ty_le_thuc_hien: totals.du_toan > 0 ? Math.round(totals.thuc_hien * 100 / totals.du_toan * 100) / 100 : 0,
                    is_total: true
                });

                res.json(rows);
            });
        } catch (fatal) {
            console.error('[SETTLEMENT_REGULAR_FATAL]', fatal);
            res.status(500).json({ error: fatal.message });
        }
    };
}

/**
 * API 3b: Quyết toán Kinh phí Hoạt động Không thường xuyên
 * Theo mẫu B03-BCQT (TT 24/2024)
 */
function getBudgetSettlementNonRegular(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            const sql = `
                SELECT
                    be.chapter_code,
                    be.item_code as category_code,
                    be.item_name as category_name,
                    COALESCE(be.allocated_amount, 0) as du_toan,
                    COALESCE(be.spent_amount, 0) as thuc_hien,
                    COALESCE(be.committed_amount, 0) as cam_ket,
                    COALESCE(be.allocated_amount - be.spent_amount, 0) as chenh_lech,
                    ROUND(COALESCE(be.spent_amount * 100.0 / NULLIF(be.allocated_amount, 0), 0), 2) as ty_le_thuc_hien
                FROM budget_estimates be
                WHERE be.fiscal_year = ?
                  AND be.estimate_type = 'NON_RECURRENT'
                  AND be.status = 'APPROVED'
                ORDER BY be.chapter_code, be.item_code
            `;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[SETTLEMENT_NONREG_ERROR]', err.message);
                    return res.status(500).json({ error: err.message });
                }

                // Tính tổng cộng
                const totals = rows.reduce((acc, r) => ({
                    du_toan: acc.du_toan + (r.du_toan || 0),
                    thuc_hien: acc.thuc_hien + (r.thuc_hien || 0),
                    cam_ket: acc.cam_ket + (r.cam_ket || 0),
                    chenh_lech: acc.chenh_lech + (r.chenh_lech || 0)
                }), { du_toan: 0, thuc_hien: 0, cam_ket: 0, chenh_lech: 0 });

                rows.push({
                    category_code: '',
                    category_name: 'TỔNG CỘNG',
                    du_toan: totals.du_toan,
                    thuc_hien: totals.thuc_hien,
                    cam_ket: totals.cam_ket,
                    chenh_lech: totals.chenh_lech,
                    ty_le_thuc_hien: totals.du_toan > 0 ? Math.round(totals.thuc_hien * 100 / totals.du_toan * 100) / 100 : 0,
                    is_total: true
                });

                res.json(rows);
            });
        } catch (fatal) {
            console.error('[SETTLEMENT_NONREG_FATAL]', fatal);
            res.status(500).json({ error: fatal.message });
        }
    };
}

/**
 * API 3c: Quyết toán Vốn đầu tư XDCB (Capex)
 * Theo mẫu B03-BCQT (TT 24/2024)
 */
function getBudgetSettlementCapex(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            const sql = `
                SELECT
                    be.chapter_code,
                    be.item_code as category_code,
                    be.item_name as category_name,
                    COALESCE(be.allocated_amount, 0) as du_toan,
                    COALESCE(be.spent_amount, 0) as thuc_hien,
                    COALESCE(be.committed_amount, 0) as cam_ket,
                    COALESCE(be.allocated_amount - be.spent_amount, 0) as chenh_lech,
                    ROUND(COALESCE(be.spent_amount * 100.0 / NULLIF(be.allocated_amount, 0), 0), 2) as ty_le_thuc_hien
                FROM budget_estimates be
                WHERE be.fiscal_year = ?
                  AND be.estimate_type = 'CAPEX'
                  AND be.status = 'APPROVED'
                ORDER BY be.chapter_code, be.item_code
            `;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[SETTLEMENT_CAPEX_ERROR]', err.message);
                    return res.status(500).json({ error: err.message });
                }

                // Tính tổng cộng
                const totals = rows.reduce((acc, r) => ({
                    du_toan: acc.du_toan + (r.du_toan || 0),
                    thuc_hien: acc.thuc_hien + (r.thuc_hien || 0),
                    cam_ket: acc.cam_ket + (r.cam_ket || 0),
                    chenh_lech: acc.chenh_lech + (r.chenh_lech || 0)
                }), { du_toan: 0, thuc_hien: 0, cam_ket: 0, chenh_lech: 0 });

                rows.push({
                    category_code: '',
                    category_name: 'TỔNG CỘNG',
                    du_toan: totals.du_toan,
                    thuc_hien: totals.thuc_hien,
                    cam_ket: totals.cam_ket,
                    chenh_lech: totals.chenh_lech,
                    ty_le_thuc_hien: totals.du_toan > 0 ? Math.round(totals.thuc_hien * 100 / totals.du_toan * 100) / 100 : 0,
                    is_total: true
                });

                res.json(rows);
            });
        } catch (fatal) {
            console.error('[SETTLEMENT_CAPEX_FATAL]', fatal);
            res.status(500).json({ error: fatal.message });
        }
    };
}

/**
 * API 4: Báo cáo Quản lý và Sử dụng Kinh phí
 */
function getFundSourceReport(db) {
    return (req, res) => {
        const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

        const sql = `
            SELECT 
                fs.code,
                fs.name,
                fs.type,
                fs.allocated_amount,
                fs.spent_amount,
                fs.remaining_amount,
                (fs.spent_amount * 100.0 / NULLIF(fs.allocated_amount, 0)) as execution_rate
            FROM fund_sources fs
            WHERE fs.fiscal_year = ?
            ORDER BY fs.code
        `;

        db.all(sql, [fiscal_year], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    };
}

/**
 * API 5: Báo cáo Tài sản Kết cấu Hạ tầng
 */
function getInfrastructureReport(db) {
    return (req, res) => {
        const sql = `
            SELECT 
                ia.category,
                COUNT(*) as count,
                SUM(ia.original_value) as total_original_value,
                SUM(ia.accumulated_depreciation) as total_depreciation,
                SUM(ia.net_value) as total_net_value
            FROM infrastructure_assets ia
            GROUP BY ia.category
            ORDER BY ia.category
        `;

        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    };
}

/**
 * API 6: Báo cáo Lưu chuyển Tiền tệ (B03-LCTT)
 * Theo mẫu TT 24/2024/TT-BTC - Phương pháp trực tiếp
 */
function getCashFlowHCSN(db) {
    return (req, res) => {
        const { fromDate, toDate } = req.query;
        const from = fromDate || new Date().getFullYear() + '-01-01';
        const to = toDate || new Date().toISOString().split('T')[0];

        // Lấy số dư tiền đầu kỳ
        const openingBalanceSql = `
            SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as opening_balance
            FROM general_ledger
            WHERE (account_code LIKE '111%' OR account_code LIKE '112%')
            AND trx_date < ?
        `;

        // Phân tích lưu chuyển tiền theo TK đối ứng
        // Thu tiền = Ghi Nợ TK 111/112 (debit_amount > 0)
        // Chi tiền = Ghi Có TK 111/112 (credit_amount > 0)
        const cashFlowSql = `
            SELECT
                account_code,
                reciprocal_acc,
                SUM(debit_amount) as cash_in,
                SUM(credit_amount) as cash_out
            FROM general_ledger
            WHERE (account_code LIKE '111%' OR account_code LIKE '112%')
            AND trx_date BETWEEN ? AND ?
            GROUP BY account_code, reciprocal_acc
        `;

        db.get(openingBalanceSql, [from], (err, openingRow) => {
            if (err) return res.status(400).json({ error: err.message });

            const openingBalance = openingRow?.opening_balance || 0;

            db.all(cashFlowSql, [from, to], (err, rows) => {
                if (err) return res.status(400).json({ error: err.message });

                // Phân loại theo TK đối ứng - Theo TT 24/2024/TT-BTC
                // =================================================
                // I. Hoạt động thường xuyên (Operating Activities)
                //    - THU: TK 511 (NSNN), 514/518/531 (phí, nghiệp vụ, SXKD), 131/136/138 (phải thu), 711 (khác)
                //    - CHI: TK 334 (lương), 332/333/338 (đóng góp), 151/152/153 (vật tư), 331 (NCC), 6xx (chi phí)
                //
                // II. Hoạt động đầu tư (Investing Activities)
                //    - THU: TK 211/213/214 (thanh lý TSCĐ), 121 (thoái vốn đầu tư)
                //    - CHI: TK 211/213/241 (mua TSCĐ, XDCB), 121 (đầu tư tài chính)
                //
                // III. Hoạt động tài chính (Financing Activities)
                //    - THU/CHI: TK 341 (vay và nợ thuê tài chính)

                const sumCashIn = (prefixes) => {
                    return rows.filter(r => prefixes.some(p => r.reciprocal_acc?.startsWith(p)))
                        .reduce((acc, r) => acc + (r.cash_in || 0), 0);
                };

                const sumCashOut = (prefixes) => {
                    return rows.filter(r => prefixes.some(p => r.reciprocal_acc?.startsWith(p)))
                        .reduce((acc, r) => acc + (r.cash_out || 0), 0);
                };

                // === I. HOẠT ĐỘNG THƯỜNG XUYÊN ===
                // Thu tiền
                const op_thu_nsnn = sumCashIn(['511', '512']); // Thu từ nguồn NSNN cấp
                const op_thu_sn = sumCashIn(['514', '515', '518', '531']); // Thu hoạt động sự nghiệp (phí, nghiệp vụ, SXKD)
                const op_thu_pt = sumCashIn(['131', '135', '136', '138', '141']); // Thu các khoản phải thu, tạm ứng
                const op_thu_khac = sumCashIn(['711', '366']); // Thu khác, nhận trước
                const op_tong_thu = op_thu_nsnn + op_thu_sn + op_thu_pt + op_thu_khac;

                // Chi tiền
                const op_chi_luong = sumCashOut(['334']); // Chi trả lương và phụ cấp
                const op_chi_bhxh = sumCashOut(['332', '333', '338']); // Chi đóng góp (BHXH, BHYT, thuế)
                const op_chi_mua = sumCashOut(['151', '152', '153', '154', '155']); // Chi mua sắm vật tư, hàng hóa
                const op_chi_nv = sumCashOut(['611', '612', '614', '615', '618', '642']); // Chi phí hoạt động
                const op_chi_ncc = sumCashOut(['331', '336']); // Trả nợ nhà cung cấp, nội bộ
                const op_chi_khac = sumCashOut(['141', '421']); // Chi tạm ứng, khác
                const op_tong_chi = op_chi_luong + op_chi_bhxh + op_chi_mua + op_chi_nv + op_chi_ncc + op_chi_khac;

                const netOperating = op_tong_thu - op_tong_chi;

                // === II. HOẠT ĐỘNG ĐẦU TƯ ===
                // Thu tiền
                const inv_thu_tscd = sumCashIn(['211', '213', '214']); // Thu thanh lý TSCĐ
                const inv_thu_dh = sumCashIn(['121']); // Thu hồi đầu tư tài chính
                const inv_tong_thu = inv_thu_tscd + inv_thu_dh;

                // Chi tiền
                const inv_chi_tscd = sumCashOut(['211', '213', '214', '241', '242']); // Chi mua TSCĐ, XDCB, chi phí trả trước
                const inv_chi_dh = sumCashOut(['121']); // Chi đầu tư tài chính
                const inv_tong_chi = inv_chi_tscd + inv_chi_dh;

                const netInvesting = inv_tong_thu - inv_tong_chi;

                // === III. HOẠT ĐỘNG TÀI CHÍNH ===
                const fin_thu_vay = sumCashIn(['341', '411']); // Thu từ vay, vốn góp
                const fin_chi_vay = sumCashOut(['341', '431']); // Trả nợ vay, trích quỹ

                const netFinancing = fin_thu_vay - fin_chi_vay;

                // Tổng hợp
                const netCashFlow = netOperating + netInvesting + netFinancing;
                const closingBalance = openingBalance + netCashFlow;

                const report = [
                    // === TIỀN ĐẦU KỲ ===
                    { id: '00', code: '00', target: 'Tiền và tương đương tiền đầu kỳ', level: 0, is_bold: true, current_period: openingBalance, previous_period: 0 },

                    // === I. HOẠT ĐỘNG THƯỜNG XUYÊN ===
                    { id: 'I', code: 'I', target: 'I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG THƯỜNG XUYÊN', level: 0, is_bold: true, current_period: netOperating, previous_period: 0 },

                    // Thu tiền
                    { id: '01', code: '01', target: '1. Tiền thu từ NSNN cấp', level: 1, current_period: op_thu_nsnn, previous_period: 0 },
                    { id: '02', code: '02', target: '2. Tiền thu từ hoạt động sự nghiệp', level: 1, current_period: op_thu_sn, previous_period: 0 },
                    { id: '03', code: '03', target: '3. Tiền thu từ các khoản phải thu', level: 1, current_period: op_thu_pt, previous_period: 0 },
                    { id: '04', code: '04', target: '4. Tiền thu khác', level: 1, current_period: op_thu_khac, previous_period: 0 },

                    // Chi tiền
                    { id: '05', code: '05', target: '5. Tiền chi trả lương và phụ cấp', level: 1, current_period: -op_chi_luong, previous_period: 0 },
                    { id: '06', code: '06', target: '6. Tiền chi đóng góp (BHXH, BHYT...)', level: 1, current_period: -op_chi_bhxh, previous_period: 0 },
                    { id: '07', code: '07', target: '7. Tiền chi mua sắm vật tư, dụng cụ', level: 1, current_period: -op_chi_mua, previous_period: 0 },
                    { id: '08', code: '08', target: '8. Tiền chi nghiệp vụ chuyên môn', level: 1, current_period: -op_chi_nv, previous_period: 0 },
                    { id: '09', code: '09', target: '9. Tiền chi trả nợ nhà cung cấp', level: 1, current_period: -op_chi_ncc, previous_period: 0 },
                    { id: '10', code: '10', target: '10. Tiền chi khác', level: 1, current_period: -op_chi_khac, previous_period: 0 },

                    // === II. HOẠT ĐỘNG ĐẦU TƯ ===
                    { id: 'II', code: 'II', target: 'II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ', level: 0, is_bold: true, current_period: netInvesting, previous_period: 0 },
                    { id: '11', code: '11', target: '1. Tiền thu từ thanh lý, nhượng bán TSCĐ', level: 1, current_period: inv_thu_tscd, previous_period: 0 },
                    { id: '12', code: '12', target: '2. Tiền thu hồi đầu tư dài hạn', level: 1, current_period: inv_thu_dh, previous_period: 0 },
                    { id: '13', code: '13', target: '3. Tiền chi mua sắm, xây dựng TSCĐ', level: 1, current_period: -inv_chi_tscd, previous_period: 0 },
                    { id: '14', code: '14', target: '4. Tiền chi đầu tư dài hạn', level: 1, current_period: -inv_chi_dh, previous_period: 0 },

                    // === III. HOẠT ĐỘNG TÀI CHÍNH ===
                    { id: 'III', code: 'III', target: 'III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH', level: 0, is_bold: true, current_period: netFinancing, previous_period: 0 },
                    { id: '15', code: '15', target: '1. Tiền thu từ vay', level: 1, current_period: fin_thu_vay, previous_period: 0 },
                    { id: '16', code: '16', target: '2. Tiền chi trả nợ vay', level: 1, current_period: -fin_chi_vay, previous_period: 0 },

                    // === TỔNG HỢP ===
                    { id: 'IV', code: 'IV', target: 'Lưu chuyển tiền thuần trong kỳ (I + II + III)', level: 0, is_bold: true, current_period: netCashFlow, previous_period: 0 },
                    { id: 'V', code: 'V', target: 'Tiền và tương đương tiền cuối kỳ', level: 0, is_bold: true, current_period: closingBalance, previous_period: 0 },
                ];

                res.json(report);
            });
        });
    };
}

/**
 * API 7: Báo cáo Tình hình Thực hiện Dự toán
 * Tính toán:
 * - Dự toán được giao: allocated_amount của version = 1 (bản gốc)
 * - Dự toán điều chỉnh: Chênh lệch giữa version hiện tại và version gốc
 * - Đã thực hiện: spent_amount
 * - Còn lại: allocated_amount - spent_amount
 */
function getBudgetPerformance(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            // Query tính toán điều chỉnh dựa trên version
            // Bản gốc: version = 1 hoặc parent_id IS NULL
            // Điều chỉnh: Chênh lệch giữa allocated_amount hiện tại và bản gốc
            const sql = `
                WITH current_budget AS (
                    SELECT
                        estimate_type,
                        SUM(allocated_amount) as current_allocated,
                        SUM(spent_amount) as spent,
                        SUM(committed_amount) as committed
                    FROM budget_estimates
                    WHERE fiscal_year = ?
                    AND (version = (SELECT MAX(version) FROM budget_estimates be2
                         WHERE be2.fiscal_year = budget_estimates.fiscal_year
                         AND be2.estimate_type = budget_estimates.estimate_type)
                         OR version IS NULL)
                    GROUP BY estimate_type
                ),
                original_budget AS (
                    SELECT
                        estimate_type,
                        SUM(allocated_amount) as original_allocated
                    FROM budget_estimates
                    WHERE fiscal_year = ?
                    AND (version = 1 OR parent_id IS NULL)
                    GROUP BY estimate_type
                )
                SELECT
                    cb.estimate_type,
                    COALESCE(ob.original_allocated, cb.current_allocated) as du_toan_duoc_giao,
                    COALESCE(cb.current_allocated - ob.original_allocated, 0) as du_toan_dieu_chinh,
                    COALESCE(cb.spent, 0) as da_thuc_hien,
                    COALESCE(cb.committed, 0) as cam_ket,
                    COALESCE(cb.current_allocated - cb.spent - cb.committed, cb.current_allocated - cb.spent) as con_lai
                FROM current_budget cb
                LEFT JOIN original_budget ob ON cb.estimate_type = ob.estimate_type
            `;

            db.all(sql, [fiscal_year, fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[BUDGET_PERF_ERROR]', err.message);
                    // Fallback to simple query if complex one fails
                    const fallbackSql = `
                        SELECT
                            estimate_type,
                            SUM(allocated_amount) as du_toan_duoc_giao,
                            0 as du_toan_dieu_chinh,
                            SUM(spent_amount) as da_thuc_hien,
                            COALESCE(SUM(committed_amount), 0) as cam_ket,
                            SUM(allocated_amount - spent_amount - COALESCE(committed_amount, 0)) as con_lai
                        FROM budget_estimates
                        WHERE fiscal_year = ?
                        GROUP BY estimate_type
                    `;
                    db.all(fallbackSql, [fiscal_year], (err2, rows2) => {
                        if (err2) return res.status(500).json({ error: err2.message });
                        res.json(rows2 || []);
                    });
                    return;
                }
                res.json(rows || []);
            });
        } catch (fatal) {
            console.error('[BUDGET_PERF_FATAL]', fatal);
            res.status(500).json({ error: fatal.message });
        }
    };
}

module.exports = {
    getBalanceSheetHCSN,
    getActivityResult,
    getCashFlowHCSN,
    getBudgetSettlementRegular,
    getBudgetSettlementNonRegular,
    getBudgetSettlementCapex,
    getFundSourceReport,
    getInfrastructureReport,
    getBudgetPerformance
};
