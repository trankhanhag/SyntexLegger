/**
 * VNPT Invoice Provider
 * SyntexLegger - E-Invoice Integration
 *
 * Integration with VNPT-INVOICE API
 * API Documentation: https://invoice.vnpt.vn/api-docs
 */

const axios = require('axios');
const BaseInvoiceProvider = require('./BaseInvoiceProvider');

class VNPTProvider extends BaseInvoiceProvider {
    constructor(config = {}) {
        super(config);
        this.providerCode = 'vnpt';
        this.providerName = 'VNPT Invoice';

        // API configuration
        this.baseUrl = config.apiUrl || process.env.VNPT_INVOICE_API_URL || 'https://api.invoice.vnpt.vn/v1';
        this.username = config.username || process.env.VNPT_INVOICE_USERNAME || '';
        this.password = config.password || process.env.VNPT_INVOICE_PASSWORD || '';
        this.taxCode = config.taxCode || process.env.VNPT_INVOICE_TAXCODE || '';
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
     * Get authentication token
     * @private
     */
    async _getAuthToken() {
        try {
            const response = await this.client.post('/auth/token', {
                username: this.username,
                password: this.password,
                taxCode: this.taxCode
            });
            return response.data.token;
        } catch (error) {
            throw new Error('Không thể xác thực với VNPT Invoice API');
        }
    }

    /**
     * Test connection to VNPT API
     */
    async testConnection() {
        if (!this.username || !this.password) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin đăng nhập VNPT Invoice'
            });
        }

        try {
            const token = await this._getAuthToken();
            return this.wrapResponse(true, {
                connected: true,
                message: 'Kết nối VNPT Invoice thành công',
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
        if (!this.username || !this.password) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin đăng nhập VNPT Invoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get('/invoices', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    fromDate,
                    toDate,
                    invoiceType: filters.invoiceType,
                    status: filters.status,
                    page: filters.page || 1,
                    limit: filters.limit || 100
                }
            });

            const invoices = response.data.data || [];
            return this.wrapResponse(true, {
                invoices: invoices.map(inv => this.normalizeInvoice(inv)),
                total: response.data.total || invoices.length,
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
        if (!this.username || !this.password) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin đăng nhập VNPT Invoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get(`/invoices/${invoiceId}`, {
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
        if (!this.username || !this.password) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin đăng nhập VNPT Invoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get('/invoices/search', {
                headers: { Authorization: `Bearer ${token}` },
                params: { taxCode, fromDate, toDate }
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
        if (!this.username || !this.password) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin đăng nhập VNPT Invoice'
            });
        }

        try {
            const token = await this._getAuthToken();

            const response = await this.client.get('/invoices/lookup', {
                headers: { Authorization: `Bearer ${token}` },
                params: { invoiceNo, invoiceSeries }
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
     * Normalize VNPT invoice data to standard format
     */
    normalizeInvoice(rawData) {
        return {
            invoiceId: rawData.id || rawData.inv_id,
            invoiceNo: rawData.inv_number || rawData.InvoiceNo,
            invoiceSeries: rawData.inv_serial || rawData.InvoiceSeries,
            invoiceDate: rawData.inv_date || rawData.InvoiceDate,
            sellerTaxCode: rawData.seller_tax_code || rawData.SellerTaxCode,
            sellerName: rawData.seller_name || rawData.SellerName,
            buyerTaxCode: rawData.buyer_tax_code || rawData.BuyerTaxCode,
            buyerName: rawData.buyer_name || rawData.BuyerName,
            totalBeforeTax: parseFloat(rawData.total_before_vat || rawData.TotalBeforeVAT || 0),
            vatAmount: parseFloat(rawData.vat_amount || rawData.VATAmount || 0),
            totalAmount: parseFloat(rawData.total_amount || rawData.TotalAmount || 0),
            items: this._normalizeItems(rawData.items || rawData.InvoiceItems || []),
            rawData: rawData
        };
    }

    /**
     * Normalize invoice items
     * @private
     */
    _normalizeItems(items) {
        return items.map(item => ({
            name: item.item_name || item.ItemName,
            quantity: parseFloat(item.quantity || item.Quantity || 0),
            unitPrice: parseFloat(item.unit_price || item.UnitPrice || 0),
            amount: parseFloat(item.amount || item.Amount || 0),
            vat: parseFloat(item.vat_amount || item.VATAmount || 0)
        }));
    }
}

module.exports = VNPTProvider;
