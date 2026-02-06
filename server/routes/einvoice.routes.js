/**
 * E-Invoice API Routes
 * SyntexLegger - Express Router for E-Invoice integration
 *
 * Supports: VNPT Invoice, Viettel S-Invoice, BKAV eHoadon, MISA meInvoice
 */

const express = require('express');
const einvoiceService = require('../services/einvoice.service');

module.exports = (db) => {
    const router = express.Router();

    // ================== Provider Management ==================

    /**
     * GET /api/einvoice/providers
     * Get all available providers
     */
    router.get('/providers', async (req, res) => {
        try {
            const result = await einvoiceService.getProviders();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * GET /api/einvoice/providers/:code
     * Get provider configuration
     */
    router.get('/providers/:code', async (req, res) => {
        try {
            const result = await einvoiceService.getProviderConfig(req.params.code);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * POST /api/einvoice/providers/:code/config
     * Save provider configuration
     */
    router.post('/providers/:code/config', async (req, res) => {
        try {
            const result = await einvoiceService.saveProviderConfig(req.params.code, req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * POST /api/einvoice/providers/:code/test
     * Test connection to provider
     */
    router.post('/providers/:code/test', async (req, res) => {
        try {
            const result = await einvoiceService.testProviderConnection(req.params.code);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    // ================== Invoice Sync ==================

    /**
     * POST /api/einvoice/sync
     * Sync invoices from provider
     */
    router.post('/sync', async (req, res) => {
        try {
            const { providerCode, fromDate, toDate, filters } = req.body;
            const userId = req.user?.id || null;

            if (!providerCode) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Vui lòng chọn nhà cung cấp' }
                });
            }

            if (!fromDate || !toDate) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Vui lòng chọn khoảng thời gian' }
                });
            }

            const result = await einvoiceService.syncInvoices(providerCode, fromDate, toDate, filters, userId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * GET /api/einvoice/sync-logs
     * Get sync history logs
     */
    router.get('/sync-logs', async (req, res) => {
        try {
            const result = await einvoiceService.getSyncLogs(req.query);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    // ================== Invoice Management ==================

    /**
     * GET /api/einvoice/invoices
     * Get imported invoices
     */
    router.get('/invoices', async (req, res) => {
        try {
            const result = await einvoiceService.getInvoices(req.query);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * GET /api/einvoice/invoices/:id
     * Get specific invoice
     */
    router.get('/invoices/:id', async (req, res) => {
        try {
            const result = await einvoiceService.getInvoice(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * PATCH /api/einvoice/invoices/:id/status
     * Update invoice status
     */
    router.patch('/invoices/:id/status', async (req, res) => {
        try {
            const { status } = req.body;
            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Thiếu trạng thái' }
                });
            }
            const result = await einvoiceService.updateInvoiceStatus(req.params.id, status);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    // ================== Invoice Lookup ==================

    /**
     * GET /api/einvoice/lookup
     * Lookup invoice from provider (real-time)
     */
    router.get('/lookup', async (req, res) => {
        try {
            const { providerCode, invoiceId, invoiceNo, invoiceSeries, taxCode, fromDate, toDate } = req.query;

            if (!providerCode) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Vui lòng chọn nhà cung cấp' }
                });
            }

            const result = await einvoiceService.lookupInvoice(providerCode, {
                invoiceId,
                invoiceNo,
                invoiceSeries,
                taxCode,
                fromDate,
                toDate
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    // ================== Voucher Matching ==================

    /**
     * POST /api/einvoice/match/:id
     * Match invoice to voucher
     */
    router.post('/match/:id', async (req, res) => {
        try {
            const { voucherId, matchType } = req.body;
            const userId = req.user?.id || null;

            if (!voucherId) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Vui lòng chọn chứng từ' }
                });
            }

            const result = await einvoiceService.matchToVoucher(
                req.params.id,
                voucherId,
                matchType || 'manual',
                userId
            );
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * GET /api/einvoice/invoices/:id/potential-matches
     * Get potential voucher matches for invoice
     */
    router.get('/invoices/:id/potential-matches', async (req, res) => {
        try {
            const result = await einvoiceService.findPotentialMatches(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * POST /api/einvoice/import/:id
     * Create voucher from invoice
     */
    router.post('/import/:id', async (req, res) => {
        try {
            const { options } = req.body;
            const userId = req.user?.id || null;

            const result = await einvoiceService.createVoucherFromInvoice(
                req.params.id,
                options || {},
                userId
            );
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * GET /api/einvoice/import/:id/preview
     * Get voucher creation preview
     */
    router.get('/import/:id/preview', async (req, res) => {
        try {
            const result = await einvoiceService.getVoucherPreview(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    // ================== XML Import (GDT) ==================

    /**
     * POST /api/einvoice/xml-import
     * Import invoice from XML content
     */
    router.post('/xml-import', async (req, res) => {
        try {
            const { xmlContent } = req.body;
            const userId = req.user?.id || null;

            if (!xmlContent) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Thiếu nội dung XML' }
                });
            }

            const result = await einvoiceService.importFromXml(xmlContent, userId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * POST /api/einvoice/xml-import/batch
     * Import multiple invoices from XML
     */
    router.post('/xml-import/batch', async (req, res) => {
        try {
            const { xmlContents } = req.body;
            const userId = req.user?.id || null;

            if (!xmlContents || !Array.isArray(xmlContents)) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Thiếu danh sách nội dung XML' }
                });
            }

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (const xml of xmlContents) {
                const result = await einvoiceService.importFromXml(xml, userId);
                results.push(result);
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            res.json({
                success: true,
                data: {
                    total: xmlContents.length,
                    success: successCount,
                    errors: errorCount,
                    results
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    return router;
};
