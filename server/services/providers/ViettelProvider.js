/**
 * Viettel S-Invoice Provider
 * SyntexHCSN - E-Invoice Integration
 *
 * Integration with Viettel S-Invoice API
 * API Documentation: https://sinvoice.viettel.vn/api-docs
 */

const axios = require('axios');
const BaseInvoiceProvider = require('./BaseInvoiceProvider');

class ViettelProvider extends BaseInvoiceProvider {
    constructor(config = {}) {
        super(config);
        this.providerCode = 'viettel';
        this.providerName = 'Viettel S-Invoice';

        // API configuration
        this.baseUrl = config.apiUrl || process.env.VIETTEL_SINVOICE_API_URL || 'https://api.sinvoice.viettel.vn/v2';
        this.apiKey = config.apiKey || process.env.VIETTEL_SINVOICE_API_KEY || '';
        this.secretKey = config.secretKey || process.env.VIETTEL_SINVOICE_SECRET_KEY || '';
        this.taxCode = config.taxCode || process.env.VIETTEL_SINVOICE_TAXCODE || '';
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
    _getAuthHeaders() {
        return {
            'X-API-Key': this.apiKey,
            'X-Secret-Key': this.secretKey,
            'X-Tax-Code': this.taxCode
        };
    }

    /**
     * Test connection to Viettel API
     */
    async testConnection() {
        if (!this.apiKey || !this.secretKey) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API Viettel S-Invoice'
            });
        }

        try {
            const response = await this.client.get('/health', {
                headers: this._getAuthHeaders()
            });

            return this.wrapResponse(true, {
                connected: true,
                message: 'Kết nối Viettel S-Invoice thành công',
                serverTime: response.data.serverTime || new Date().toISOString()
            });
        } catch (error) {
            return this.handleError(error, 'testConnection');
        }
    }

    /**
     * Fetch invoices within date range
     */
    async fetchInvoices(fromDate, toDate, filters = {}) {
        if (!this.apiKey || !this.secretKey) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API Viettel S-Invoice'
            });
        }

        try {
            const response = await this.client.post('/invoices/search', {
                fromDate,
                toDate,
                invoiceType: filters.invoiceType,
                status: filters.status,
                pageIndex: filters.page || 1,
                pageSize: filters.limit || 100
            }, {
                headers: this._getAuthHeaders()
            });

            const invoices = response.data.invoices || [];
            return this.wrapResponse(true, {
                invoices: invoices.map(inv => this.normalizeInvoice(inv)),
                total: response.data.totalCount || invoices.length,
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
        if (!this.apiKey || !this.secretKey) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API Viettel S-Invoice'
            });
        }

        try {
            const response = await this.client.get(`/invoices/${invoiceId}`, {
                headers: this._getAuthHeaders()
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
        if (!this.apiKey || !this.secretKey) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API Viettel S-Invoice'
            });
        }

        try {
            const response = await this.client.post('/invoices/search-by-tax', {
                taxCode,
                fromDate,
                toDate
            }, {
                headers: this._getAuthHeaders()
            });

            const invoices = response.data.invoices || [];
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
        if (!this.apiKey || !this.secretKey) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API Viettel S-Invoice'
            });
        }

        try {
            const response = await this.client.post('/invoices/lookup', {
                invoiceNumber: invoiceNo,
                invoiceSerial: invoiceSeries
            }, {
                headers: this._getAuthHeaders()
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
     * Normalize Viettel invoice data to standard format
     */
    normalizeInvoice(rawData) {
        return {
            invoiceId: rawData.invoiceId || rawData.id,
            invoiceNo: rawData.invoiceNumber || rawData.invNumber,
            invoiceSeries: rawData.invoiceSerial || rawData.invSerial,
            invoiceDate: rawData.invoiceDate || rawData.invDate,
            sellerTaxCode: rawData.sellerTaxCode || rawData.sellerMst,
            sellerName: rawData.sellerName || rawData.sellerCompanyName,
            buyerTaxCode: rawData.buyerTaxCode || rawData.buyerMst,
            buyerName: rawData.buyerName || rawData.buyerCompanyName,
            totalBeforeTax: parseFloat(rawData.totalBeforeVat || rawData.amountBeforeVat || 0),
            vatAmount: parseFloat(rawData.vatAmount || rawData.totalVat || 0),
            totalAmount: parseFloat(rawData.totalAmount || rawData.grandTotal || 0),
            items: this._normalizeItems(rawData.items || rawData.invoiceDetails || []),
            rawData: rawData
        };
    }

    /**
     * Normalize invoice items
     * @private
     */
    _normalizeItems(items) {
        return items.map(item => ({
            name: item.itemName || item.productName,
            quantity: parseFloat(item.quantity || item.qty || 0),
            unitPrice: parseFloat(item.unitPrice || item.price || 0),
            amount: parseFloat(item.amount || item.totalAmount || 0),
            vat: parseFloat(item.vatAmount || item.vat || 0)
        }));
    }
}

module.exports = ViettelProvider;
