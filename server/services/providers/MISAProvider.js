/**
 * MISA meInvoice Provider
 * SyntexLegger - E-Invoice Integration
 *
 * Integration with MISA meInvoice API
 * API Documentation: https://meinvoice.misa.vn/api-docs
 */

const axios = require('axios');
const BaseInvoiceProvider = require('./BaseInvoiceProvider');

class MISAProvider extends BaseInvoiceProvider {
    constructor(config = {}) {
        super(config);
        this.providerCode = 'misa';
        this.providerName = 'MISA meInvoice';

        // API configuration
        this.baseUrl = config.apiUrl || process.env.MISA_MEINVOICE_API_URL || 'https://api.meinvoice.misa.vn/v1';
        this.appId = config.appId || process.env.MISA_APP_ID || '';
        this.appSecret = config.appSecret || process.env.MISA_APP_SECRET || '';
        this.companyCode = config.companyCode || process.env.MISA_COMPANY_CODE || '';
        this.taxCode = config.taxCode || process.env.MISA_TAXCODE || '';
        this.timeout = config.timeout || 30000;

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get authentication headers
     * @private
     */
    async _getAuthToken() {
        try {
            const response = await this.client.post('/oauth/token', {
                app_id: this.appId,
                app_secret: this.appSecret,
                company_code: this.companyCode
            });
            return response.data.access_token;
        } catch (error) {
            throw new Error('Không thể xác thực với MISA meInvoice API');
        }
    }

    /**
     * Test connection to MISA API
     */
    async testConnection() {
        if (!this.appId || !this.appSecret) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API MISA meInvoice'
            });
        }

        try {
            const token = await this._getAuthToken();
            return this.wrapResponse(true, {
                connected: true,
                message: 'Kết nối MISA meInvoice thành công',
                serverTime: new Date().toISOString()
            });
        } catch (error) {
            return this.handleError(error, 'testConnection');
        }
    }

    /**
     * Fetch invoices within date range
     */
    async fetchInvoices(fromDate, toDate, filters = {}) {
        if (!this.appId || !this.appSecret) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API MISA meInvoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get('/einvoices', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    from_date: fromDate,
                    to_date: toDate,
                    invoice_type: filters.invoiceType,
                    status: filters.status,
                    page: filters.page || 1,
                    page_size: filters.limit || 100
                }
            });

            const invoices = response.data.data || [];
            return this.wrapResponse(true, {
                invoices: invoices.map(inv => this.normalizeInvoice(inv)),
                total: response.data.total_count || invoices.length,
                period: { fromDate, toDate }
            });
        } catch (error) {
            return this.handleError(error, 'fetchInvoices');
        }
    }

    /**
     * Lookup a specific invoice by ID
     */
    async lookupInvoice(invoiceId) {
        if (!this.appId || !this.appSecret) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API MISA meInvoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get(`/einvoices/${invoiceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return this.wrapResponse(true, this.normalizeInvoice(response.data));
        } catch (error) {
            return this.handleError(error, 'lookupInvoice');
        }
    }

    /**
     * Lookup invoices by tax code
     */
    async lookupByTaxCode(taxCode, fromDate, toDate) {
        if (!this.appId || !this.appSecret) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API MISA meInvoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get('/einvoices/search', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    tax_code: taxCode,
                    from_date: fromDate,
                    to_date: toDate
                }
            });

            const invoices = response.data.data || [];
            return this.wrapResponse(true, {
                invoices: invoices.map(inv => this.normalizeInvoice(inv)),
                total: invoices.length,
                searchCriteria: { taxCode, fromDate, toDate }
            });
        } catch (error) {
            return this.handleError(error, 'lookupByTaxCode');
        }
    }

    /**
     * Lookup invoice by invoice number
     */
    async lookupByInvoiceNo(invoiceNo, invoiceSeries) {
        if (!this.appId || !this.appSecret) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API MISA meInvoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get('/einvoices/lookup', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    invoice_no: invoiceNo,
                    invoice_series: invoiceSeries
                }
            });

            if (response.data) {
                return this.wrapResponse(true, this.normalizeInvoice(response.data));
            }

            return this.wrapResponse(false, null, {
                code: 'NOT_FOUND',
                message: `Không tìm thấy hóa đơn số: ${invoiceNo}`
            });
        } catch (error) {
            return this.handleError(error, 'lookupByInvoiceNo');
        }
    }

    /**
     * Normalize MISA invoice data to standard format
     */
    normalizeInvoice(rawData) {
        return {
            invoiceId: rawData.invoice_id || rawData.id,
            invoiceNo: rawData.invoice_no || rawData.inv_no,
            invoiceSeries: rawData.invoice_series || rawData.inv_series,
            invoiceDate: rawData.invoice_date || rawData.inv_date,
            sellerTaxCode: rawData.seller_tax_code || rawData.seller_mst,
            sellerName: rawData.seller_name || rawData.seller_company_name,
            buyerTaxCode: rawData.buyer_tax_code || rawData.buyer_mst,
            buyerName: rawData.buyer_name || rawData.buyer_company_name,
            totalBeforeTax: parseFloat(rawData.total_before_vat || rawData.amount || 0),
            vatAmount: parseFloat(rawData.vat_amount || rawData.vat || 0),
            totalAmount: parseFloat(rawData.total_amount || rawData.total || 0),
            items: this._normalizeItems(rawData.details || rawData.items || []),
            rawData: rawData
        };
    }

    /**
     * Normalize invoice items
     * @private
     */
    _normalizeItems(items) {
        return items.map(item => ({
            name: item.item_name || item.product_name,
            quantity: parseFloat(item.quantity || item.qty || 0),
            unitPrice: parseFloat(item.unit_price || item.price || 0),
            amount: parseFloat(item.amount || item.line_amount || 0),
            vat: parseFloat(item.vat_amount || item.vat || 0)
        }));
    }
}

module.exports = MISAProvider;
