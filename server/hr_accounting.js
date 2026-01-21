// ==========================================
// HR & SALARY ACCOUNTING MODULE (TT 24/2024)
// ==========================================
// Tự động sinh bút toán cho nghiệp vụ Lương & Bảo hiểm

const { v4: uuidv4 } = require('uuid');

const hrAccounting = {

    /**
     * Tạo bút toán tính lương và trích bảo hiểm (Cuối tháng)
     * 1. Hạch toán chi phí lương: Nợ 611 / Có 334
     * 2. Trích bảo hiểm DN đóng: Nợ 611 / Có 332
     * 3. Trích bảo hiểm NLĐ đóng: Nợ 334 / Có 332
     * 4. Trích thuế TNCN: Nợ 334 / Có 333
     */
    createPayrollVoucher: (db, periodId, totalSalary, totalInsuranceCorp, totalInsuranceEmp, totalTax) => {
        return new Promise((resolve, reject) => {
            const voucherId = uuidv4();
            const voucherNo = `PKT-L${periodId.replace('-', '')}`; // PKT-L202410
            const voucherDate = new Date().toISOString().split('T')[0];
            const fiscalYear = parseInt(periodId.split('-')[0]);

            // Insert Voucher Header
            const sqlVoucher = `
                INSERT INTO vouchers (id, voucher_no, voucher_date, voucher_type, description, fiscal_year, status, total_amount, created_by, created_at)
                VALUES (?, ?, ?, 'GENERAL', ?, ?, 'POSTED', ?, 'SYSTEM', datetime('now'))
            `;

            const description = `Hạch toán lương và các khoản trích theo lương kỳ ${periodId}`;
            const totalAmount = totalSalary + totalInsuranceCorp; // Tổng chi phí ghi nhận

            db.run(sqlVoucher, [voucherId, voucherNo, voucherDate, description, fiscalYear, totalAmount], function (err) {
                if (err) return reject(err);

                const items = [];
                let sortOrder = 1;

                // 1. Chi phí lương (Nợ 611 / Có 334)
                if (totalSalary > 0) {
                    items.push({
                        voucher_id: voucherId,
                        debit_account: '611',
                        credit_account: '334',
                        amount: totalSalary,
                        description: `Chi phí lương kỳ ${periodId}`,
                        sort_order: sortOrder++
                    });
                }

                // 2. Bảo hiểm DN đóng (Nợ 611 / Có 332) (21.5% lương BH)
                if (totalInsuranceCorp > 0) {
                    items.push({
                        voucher_id: voucherId,
                        debit_account: '611',
                        credit_account: '332',
                        amount: totalInsuranceCorp,
                        description: `Trích BHXH, YT, TN (DN đóng) kỳ ${periodId}`,
                        sort_order: sortOrder++
                    });
                }

                // 3. Bảo hiểm NLĐ đóng (Nợ 334 / Có 332) (10.5% lương BH)
                if (totalInsuranceEmp > 0) {
                    items.push({
                        voucher_id: voucherId,
                        debit_account: '334',
                        credit_account: '332',
                        amount: totalInsuranceEmp,
                        description: `Trích BHXH, YT, TN (NLĐ đóng) kỳ ${periodId}`,
                        sort_order: sortOrder++
                    });
                }

                // 4. Thuế TNCN (Nợ 334 / Có 333)
                if (totalTax > 0) {
                    items.push({
                        voucher_id: voucherId,
                        debit_account: '334',
                        credit_account: '333',
                        amount: totalTax,
                        description: `Trích Thuế TNCN khấu trừ tại nguồn kỳ ${periodId}`,
                        sort_order: sortOrder++
                    });
                }

                // Insert Items
                const sqlItem = `
                    INSERT INTO voucher_items (id, voucher_id, debit_account, credit_account, amount, description, original_amount, currency, exchange_rate, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'VND', 1, ?)
                `;

                const stmt = db.prepare(sqlItem);
                items.forEach(item => {
                    stmt.run(uuidv4(), item.voucher_id, item.debit_account, item.credit_account, item.amount, item.description, item.amount, item.sort_order);
                });

                stmt.finalize((err) => {
                    if (err) return reject(err);
                    console.log(`[HR Accounting] Created voucher ${voucherNo} for Payroll ${periodId}`);
                    resolve(voucherId);
                });
            });
        });
    }
};

module.exports = hrAccounting;
