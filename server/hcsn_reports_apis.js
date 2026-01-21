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
 */
function getBudgetSettlementRegular(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            const sql = `
                SELECT 
                    be.item_code as category_code,
                    be.item_name as category_name,
                    be.allocated_amount as du_toan,
                    COALESCE(SUM(vi.amount), 0) as thuc_hien,
                    (be.allocated_amount - COALESCE(SUM(vi.amount), 0)) as chenh_lech
                FROM budget_estimates be
                LEFT JOIN voucher_items vi ON vi.budget_estimate_id = be.id
                WHERE be.fiscal_year = ?
                  AND be.estimate_type = 'RECURRENT'
                GROUP BY be.id
                ORDER BY be.item_code
            `;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[SETTLEMENT_REGULAR_ERROR]', err.message);
                    return res.status(500).json({ error: err.message, sql });
                }
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
 */
function getBudgetSettlementNonRegular(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            const sql = `
                SELECT 
                    be.item_code as category_code,
                    be.item_name as category_name,
                    be.allocated_amount as du_toan,
                    COALESCE(SUM(vi.amount), 0) as thuc_hien,
                    (be.allocated_amount - COALESCE(SUM(vi.amount), 0)) as chenh_lech
                FROM budget_estimates be
                LEFT JOIN voucher_items vi ON vi.budget_estimate_id = be.id
                WHERE be.fiscal_year = ?
                  AND be.estimate_type = 'NON_RECURRENT'
                GROUP BY be.id
                ORDER BY be.item_code
            `;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[SETTLEMENT_NONREG_ERROR]', err.message);
                    return res.status(500).json({ error: err.message, sql });
                }
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
 */
function getBudgetSettlementCapex(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            const sql = `
                SELECT 
                    be.item_code as category_code,
                    be.item_name as category_name,
                    be.allocated_amount as du_toan,
                    COALESCE(SUM(vi.amount), 0) as thuc_hien,
                    (be.allocated_amount - COALESCE(SUM(vi.amount), 0)) as chenh_lech
                FROM budget_estimates be
                LEFT JOIN voucher_items vi ON vi.budget_estimate_id = be.id
                WHERE be.fiscal_year = ?
                  AND be.estimate_type = 'CAPEX'
                GROUP BY be.id
                ORDER BY be.item_code
            `;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[SETTLEMENT_CAPEX_ERROR]', err.message);
                    return res.status(500).json({ error: err.message, sql });
                }
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
 * API 6: Báo cáo Tình hình Thực hiện Dự toán
 */
function getBudgetPerformance(db) {
    return (req, res) => {
        try {
            const fiscal_year = req.query.fiscal_year || new Date().getFullYear();

            const sql = `
                SELECT 
                    be.estimate_type,
                    SUM(be.allocated_amount) as du_toan_duoc_giao,
                    0 as du_toan_dieu_chinh,
                    SUM(be.spent_amount) as da_thuc_hien,
                    SUM(be.allocated_amount - be.spent_amount) as con_lai
                FROM budget_estimates be
                WHERE be.fiscal_year = ?
                GROUP BY be.estimate_type
            `;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[BUDGET_PERF_ERROR]', err.message);
                    return res.status(500).json({ error: err.message, sql });
                }
                res.json(rows);
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
    getBudgetSettlementRegular,
    getBudgetSettlementNonRegular,
    getBudgetSettlementCapex,
    getFundSourceReport,
    getInfrastructureReport,
    getBudgetPerformance
};
