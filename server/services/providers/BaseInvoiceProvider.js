/**
 * Base Invoice Provider - Abstract Class
 * SyntexHCSN - E-Invoice Integration
 *
 * All invoice providers (VNPT, Viettel, BKAV, MISA) must extend this class
 */

class BaseInvoiceProvider {
    constructor(config = {}) {
        if (new.target === BaseInvoiceProvider) {
            throw new Error('BaseInvoiceProvider is abstract and cannot be instantiated directly');
        }
        this.config = config;
        this.providerCode = 'base';
        this.providerName = 'Base Provider';
    }

    /**
     * Get provider code
     * @returns {string}
     */
    getProviderCode() {
        return this.providerCode;
    }

    /**
     * Get provider display name
     * @returns {string}
     */
    getProviderName() {
        return this.providerName;
    }

    /**
     * Test connection to provider API
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async testConnection() {
        throw new Error('testConnection() must be implemented by subclass');
    }

    /**
     * Fetch invoices within date range
     * @param {string} fromDate - Start date (YYYY-MM-DD)
     * @param {string} toDate - End date (YYYY-MM-DD)
     * @param {Object} filters - Additional filters
     * @returns {Promise<{success: boolean, data: Array, error?: string}>}
     */
    async fetchInvoices(fromDate, toDate, filters = {}) {
        throw new Error('fetchInvoices() must be implemented by subclass');
    }

    /**
     * Lookup a specific invoice by ID
     * @param {string} invoiceId - Invoice ID from provider
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async lookupInvoice(invoiceId) {
        throw new Error('lookupInvoice() must be implemented by subclass');
    }

    /**
     * Lookup invoices by tax code
     * @param {string} taxCode - Tax code to search
     * @param {string} fromDate - Start date
     * @param {string} toDate - End date
     * @returns {Promise<{success: boolean, data: Array, error?: string}>}
     */
    async lookupByTaxCode(taxCode, fromDate, toDate) {
        throw new Error('lookupByTaxCode() must be implemented by subclass');
    }

    /**
     * Lookup invoice by invoice number
     * @param {string} invoiceNo - Invoice number
     * @param {string} invoiceSeries - Invoice series/symbol
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async lookupByInvoiceNo(invoiceNo, invoiceSeries) {
        throw new Error('lookupByInvoiceNo() must be implemented by subclass');
    }

    /**
     * Normalize raw invoice data to standard format
     * @param {Object} rawData - Raw invoice data from API
     * @returns {Object} Normalized invoice object
     */
    normalizeInvoice(rawData) {
        // Default implementation - subclasses should override
        return {
            invoiceId: rawData.id || rawData.invoiceId,
            invoiceNo: rawData.invoiceNo || rawData.inv_no,
            invoiceSeries: rawData.invoiceSeries || rawData.series,
            invoiceDate: rawData.invoiceDate || rawData.date,
            sellerTaxCode: rawData.sellerTaxCode || rawData.seller_tax,
            sellerName: rawData.sellerName || rawData.seller_name,
            buyerTaxCode: rawData.buyerTaxCode || rawData.buyer_tax,
            buyerName: rawData.buyerName || rawData.buyer_name,
            totalBeforeTax: parseFloat(rawData.totalBeforeTax || rawData.amount_before_tax || 0),
            vatAmount: parseFloat(rawData.vatAmount || rawData.vat || 0),
            totalAmount: parseFloat(rawData.totalAmount || rawData.total || 0),
            items: rawData.items || [],
            rawData: rawData
        };
    }

    /**
     * Wrap response in standard format
     * @param {boolean} success
     * @param {any} data
     * @param {string} error
     * @param {boolean} isMock
     * @returns {Object}
     */
    wrapResponse(success, data = null, error = null, isMock = false) {
        return {
            success,
            data,
            error,
            isMock,
            provider: this.providerCode
        };
    }

    /**
     * Handle API errors
     * @param {Error} error
     * @param {string} method
     * @returns {Object}
     */
    handleError(error, method) {
        console.error(`${this.providerName}.${method} error:`, error.message);

        if (error.response) {
            return this.wrapResponse(false, null, {
                code: error.response.status,
                message: error.response.data?.message || `Lỗi từ API ${this.providerName}`,
                details: error.response.data
            });
        }

        return this.wrapResponse(false, null, {
            code: 'NETWORK_ERROR',
            message: 'Lỗi kết nối mạng',
            details: error.message
        });
    }
}

module.exports = BaseInvoiceProvider;
