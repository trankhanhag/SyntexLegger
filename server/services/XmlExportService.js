/**
 * XML Export Service for KBNN (Kho bạc Nhà nước)
 * Generates XML files according to DVC (Dịch vụ công) standards
 * 
 * Supported document types:
 * - C2-02a/NS: Giấy rút dự toán NSNN
 * - C2-03/NS: Giấy đề nghị thanh toán tạm ứng
 * - C4-02a/KB: Ủy nhiệm chi
 * - Bảng kê: Bảng kê nội dung thanh toán
 */

const archiver = require('archiver');
const { Readable } = require('stream');

class XmlExportService {
    constructor(db) {
        this.db = db;
        this.unitInfo = null;
    }

    /**
     * Initialize unit information from system_settings
     */
    async loadUnitInfo() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT key, value FROM system_settings WHERE key IN (
                'unit_name', 'unit_address', 'unit_tax_code', 'unit_chapter', 
                'unit_budget_relation_code', 'unit_head_name', 'unit_chief_accountant'
            )`;
            this.db.all(sql, [], (err, rows) => {
                if (err) return reject(err);
                this.unitInfo = {};
                rows.forEach(r => { this.unitInfo[r.key] = r.value; });
                resolve(this.unitInfo);
            });
        });
    }

    /**
     * Generate XML for Giấy rút dự toán NSNN (C2-02a/NS)
     * @param {Object} data - Payment order data
     * @returns {string} XML string
     */
    generateC2_02a_NS(data) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        return `<?xml version="1.0" encoding="UTF-8"?>
<GiayRutDuToan xmlns="http://kbnn.gov.vn/dvc/ns">
    <TieuDe>
        <MaBieuMau>C2-02a/NS</MaBieuMau>
        <TenBieuMau>GIẤY RÚT DỰ TOÁN NGÂN SÁCH NHÀ NƯỚC</TenBieuMau>
        <NgayLap>${dateStr}</NgayLap>
        <SoChungTu>${data.docNo || ''}</SoChungTu>
    </TieuDe>
    <DonViSuDungNganSach>
        <TenDonVi>${this.unitInfo?.unit_name || ''}</TenDonVi>
        <MaQHNS>${this.unitInfo?.unit_budget_relation_code || ''}</MaQHNS>
        <MaChuong>${this.unitInfo?.unit_chapter || ''}</MaChuong>
        <DiaChi>${this.unitInfo?.unit_address || ''}</DiaChi>
        <MaSoThue>${this.unitInfo?.unit_tax_code || ''}</MaSoThue>
    </DonViSuDungNganSach>
    <NoiDung>
        <MoTa>${data.description || ''}</MoTa>
        <SoTien>${data.amount || 0}</SoTien>
        <SoTienBangChu>${this.numberToWords(data.amount)}</SoTienBangChu>
    </NoiDung>
    <TaiKhoanNhan>
        <TenTaiKhoan>${data.beneficiaryName || ''}</TenTaiKhoan>
        <SoTaiKhoan>${data.beneficiaryAccount || ''}</SoTaiKhoan>
        <NganHang>${data.beneficiaryBank || ''}</NganHang>
    </TaiKhoanNhan>
    <MucLucNganSach>
        <MaNganh>${data.sectorCode || ''}</MaNganh>
        <MaNguonNganSach>${data.fundSourceCode || ''}</MaNguonNganSach>
        <MaMucTieuMuc>${data.budgetItemCode || ''}</MaMucTieuMuc>
        <MaCTMT>${data.programCode || ''}</MaCTMT>
    </MucLucNganSach>
    <ChuKy>
        <ThuTruong>${this.unitInfo?.unit_head_name || ''}</ThuTruong>
        <KeToanTruong>${this.unitInfo?.unit_chief_accountant || ''}</KeToanTruong>
    </ChuKy>
</GiayRutDuToan>`;
    }

    /**
     * Generate XML for Ủy nhiệm chi (C4-02a/KB)
     * @param {Object} data - Payment order data
     * @returns {string} XML string
     */
    generateC4_02a_KB(data) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        return `<?xml version="1.0" encoding="UTF-8"?>
<UyNhiemChi xmlns="http://kbnn.gov.vn/dvc/kb">
    <TieuDe>
        <MaBieuMau>C4-02a/KB</MaBieuMau>
        <TenBieuMau>ỦY NHIỆM CHI</TenBieuMau>
        <NgayLap>${dateStr}</NgayLap>
        <SoChungTu>${data.docNo || ''}</SoChungTu>
    </TieuDe>
    <DonViTra>
        <TenDonVi>${this.unitInfo?.unit_name || ''}</TenDonVi>
        <MaSoThue>${this.unitInfo?.unit_tax_code || ''}</MaSoThue>
        <SoTaiKhoan>${data.payerAccount || ''}</SoTaiKhoan>
        <TaiKhoBac>${data.treasuryAccount || ''}</TaiKhoBac>
    </DonViTra>
    <DonViNhan>
        <TenDonVi>${data.beneficiaryName || ''}</TenDonVi>
        <MaSoThue>${data.beneficiaryTaxCode || ''}</MaSoThue>
        <SoTaiKhoan>${data.beneficiaryAccount || ''}</SoTaiKhoan>
        <NganHang>${data.beneficiaryBank || ''}</NganHang>
    </DonViNhan>
    <NoiDung>
        <MoTa>${data.description || ''}</MoTa>
        <SoTien>${data.amount || 0}</SoTien>
        <SoTienBangChu>${this.numberToWords(data.amount)}</SoTienBangChu>
    </NoiDung>
    <ChuKy>
        <ThuTruong>${this.unitInfo?.unit_head_name || ''}</ThuTruong>
        <KeToanTruong>${this.unitInfo?.unit_chief_accountant || ''}</KeToanTruong>
    </ChuKy>
</UyNhiemChi>`;
    }

    /**
     * Generate XML for Bảng kê thanh toán
     * @param {Array} items - List of payment items
     * @param {Object} summary - Summary information
     * @returns {string} XML string
     */
    generateBangKe(items, summary) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        const itemsXml = items.map((item, idx) => `
        <Dong>
            <STT>${idx + 1}</STT>
            <NoiDung>${item.description || ''}</NoiDung>
            <SoTien>${item.amount || 0}</SoTien>
            <MaMuc>${item.budgetItemCode || ''}</MaMuc>
            <GhiChu>${item.note || ''}</GhiChu>
        </Dong>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<BangKeThanhToan xmlns="http://kbnn.gov.vn/dvc/ns">
    <TieuDe>
        <TenBieuMau>BẢNG KÊ NỘI DUNG THANH TOÁN</TenBieuMau>
        <NgayLap>${dateStr}</NgayLap>
        <KyBaoCao>${summary.period || ''}</KyBaoCao>
    </TieuDe>
    <DonVi>
        <TenDonVi>${this.unitInfo?.unit_name || ''}</TenDonVi>
        <MaQHNS>${this.unitInfo?.unit_budget_relation_code || ''}</MaQHNS>
    </DonVi>
    <ChiTiet>${itemsXml}
    </ChiTiet>
    <TongCong>
        <SoTien>${summary.totalAmount || 0}</SoTien>
        <SoTienBangChu>${this.numberToWords(summary.totalAmount)}</SoTienBangChu>
    </TongCong>
</BangKeThanhToan>`;
    }

    /**
     * Export multiple documents as ZIP file
     * @param {Array} documents - Array of { type, data } objects
     * @returns {Promise<Buffer>} ZIP file buffer
     */
    async exportAsZip(documents) {
        await this.loadUnitInfo();

        return new Promise((resolve, reject) => {
            const archive = archiver('zip', { zlib: { level: 9 } });
            const chunks = [];

            archive.on('data', chunk => chunks.push(chunk));
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', reject);

            documents.forEach((doc, idx) => {
                let xml = '';
                const filename = `${doc.type}_${idx + 1}.xml`;

                switch (doc.type) {
                    case 'C2-02a/NS':
                        xml = this.generateC2_02a_NS(doc.data);
                        break;
                    case 'C4-02a/KB':
                        xml = this.generateC4_02a_KB(doc.data);
                        break;
                    case 'BangKe':
                        xml = this.generateBangKe(doc.data.items, doc.data.summary);
                        break;
                    default:
                        console.warn(`Unknown document type: ${doc.type}`);
                        return;
                }

                archive.append(xml, { name: filename });
            });

            archive.finalize();
        });
    }

    /**
     * Get vouchers for XML export
     * @param {Object} filters - { fromDate, toDate, type }
     * @returns {Promise<Array>}
     */
    async getVouchersForExport(filters) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT v.*, vi.description as item_desc, vi.amount as item_amount,
                       vi.debit_acc, vi.credit_acc, vi.partner_code
                FROM vouchers v
                LEFT JOIN voucher_items vi ON v.id = vi.voucher_id
                WHERE v.status = 'POSTED'
            `;
            const params = [];

            if (filters.fromDate) {
                sql += ` AND v.doc_date >= ?`;
                params.push(filters.fromDate);
            }
            if (filters.toDate) {
                sql += ` AND v.doc_date <= ?`;
                params.push(filters.toDate);
            }
            if (filters.type) {
                sql += ` AND v.type = ?`;
                params.push(filters.type);
            }

            sql += ` ORDER BY v.doc_date, v.doc_no`;

            this.db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    /**
     * Log XML export activity
     * @param {Object} logData - Export log data
     */
    async logExport(logData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO xml_export_logs 
                (export_type, doc_count, exported_at, exported_by, file_name)
                VALUES (?, ?, datetime('now'), ?, ?)`;
            this.db.run(sql, [
                logData.exportType,
                logData.docCount,
                logData.exportedBy,
                logData.fileName
            ], function (err) {
                if (err) return reject(err);
                resolve({ id: this.lastID });
            });
        });
    }

    /**
     * Convert number to Vietnamese words
     * @param {number} num - Amount
     * @returns {string} Amount in words
     */
    numberToWords(num) {
        if (!num || num === 0) return 'Không đồng';

        const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
        const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

        const readThreeDigits = (n) => {
            let result = '';
            const hundreds = Math.floor(n / 100);
            const tens = Math.floor((n % 100) / 10);
            const ones = n % 10;

            if (hundreds > 0) result += digits[hundreds] + ' trăm ';
            if (tens > 0) {
                if (tens === 1) result += 'mười ';
                else result += digits[tens] + ' mươi ';
            } else if (hundreds > 0 && ones > 0) {
                result += 'lẻ ';
            }
            if (ones > 0) {
                if (tens > 1 && ones === 1) result += 'mốt';
                else if (tens > 0 && ones === 5) result += 'lăm';
                else result += digits[ones];
            }
            return result.trim();
        };

        let result = '';
        let unitIdx = 0;
        let n = Math.floor(num);

        while (n > 0) {
            const group = n % 1000;
            if (group > 0) {
                result = readThreeDigits(group) + ' ' + units[unitIdx] + ' ' + result;
            }
            n = Math.floor(n / 1000);
            unitIdx++;
        }

        return result.trim() + ' đồng';
    }
}

module.exports = XmlExportService;
