/**
 * XML Export Routes
 * API endpoints for exporting KBNN documents as XML
 */

const express = require('express');
const XmlExportService = require('../services/XmlExportService');
const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();
    const xmlService = new XmlExportService(db);

    /**
     * GET /api/xml-export/document-types
     * Get supported document types for export
     */
    router.get('/xml-export/document-types', verifyToken, (req, res) => {
        res.json([
            { code: 'C2-02a/NS', name: 'Giấy rút dự toán NSNN', description: 'Rút dự toán chi thường xuyên' },
            { code: 'C2-02b/NS', name: 'Giấy rút dự toán NSNN (HĐ)', description: 'Rút dự toán theo hợp đồng' },
            { code: 'C2-03/NS', name: 'Thanh toán tạm ứng', description: 'Đề nghị thanh toán tạm ứng' },
            { code: 'C4-02a/KB', name: 'Ủy nhiệm chi', description: 'Lệnh chi tiền từ tài khoản KB' },
            { code: 'BangKe', name: 'Bảng kê thanh toán', description: 'Bảng kê nội dung thanh toán/tạm ứng' }
        ]);
    });

    /**
     * POST /api/xml-export/preview
     * Preview XML content before download
     */
    router.post('/xml-export/preview', verifyToken, async (req, res) => {
        try {
            const { documentType, data } = req.body;
            await xmlService.loadUnitInfo();

            let xml = '';
            switch (documentType) {
                case 'C2-02a/NS':
                    xml = xmlService.generateC2_02a_NS(data);
                    break;
                case 'C4-02a/KB':
                    xml = xmlService.generateC4_02a_KB(data);
                    break;
                case 'BangKe':
                    xml = xmlService.generateBangKe(data.items || [], data.summary || {});
                    break;
                default:
                    return res.status(400).json({ error: 'Unsupported document type' });
            }

            res.json({ success: true, xml });
        } catch (error) {
            console.error('XML Preview Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/xml-export/vouchers
     * Get vouchers eligible for XML export
     */
    router.post('/xml-export/vouchers', verifyToken, async (req, res) => {
        try {
            const { fromDate, toDate, type } = req.body;
            const vouchers = await xmlService.getVouchersForExport({ fromDate, toDate, type });

            // Group by voucher
            const grouped = {};
            vouchers.forEach(row => {
                if (!grouped[row.id]) {
                    grouped[row.id] = {
                        id: row.id,
                        docNo: row.doc_no,
                        docDate: row.doc_date,
                        description: row.description,
                        type: row.type,
                        totalAmount: row.total_amount,
                        items: []
                    };
                }
                if (row.item_desc) {
                    grouped[row.id].items.push({
                        description: row.item_desc,
                        amount: row.item_amount,
                        debitAcc: row.debit_acc,
                        creditAcc: row.credit_acc
                    });
                }
            });

            res.json({ success: true, vouchers: Object.values(grouped) });
        } catch (error) {
            console.error('Get Vouchers Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/xml-export/download
     * Generate and download XML files as ZIP
     */
    router.post('/xml-export/download', verifyToken, async (req, res) => {
        try {
            const { documents } = req.body; // Array of { type, data }

            if (!documents || documents.length === 0) {
                return res.status(400).json({ error: 'No documents provided' });
            }

            const zipBuffer = await xmlService.exportAsZip(documents);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName = `KBNN_Export_${timestamp}.zip`;

            // Log the export
            await xmlService.logExport({
                exportType: documents.map(d => d.type).join(','),
                docCount: documents.length,
                exportedBy: req.user?.username || 'system',
                fileName
            });

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(zipBuffer);

        } catch (error) {
            console.error('XML Export Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/xml-export/history
     * Get export history
     */
    router.get('/xml-export/history', verifyToken, (req, res) => {
        const sql = `SELECT * FROM xml_export_logs ORDER BY exported_at DESC LIMIT 50`;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
    });

    return router;
};
