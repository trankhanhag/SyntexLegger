/**
 * GDT Provider
 * SyntexLegger - Provider for importing e-invoices from GDT XML files
 *
 * Since hoadondientu.gdt.gov.vn doesn't have a public API,
 * this provider handles XML file imports instead.
 */

const BaseInvoiceProvider = require('./BaseInvoiceProvider');
const GDTXmlParser = require('./GDTXmlParser');

class GDTProvider extends BaseInvoiceProvider {
    constructor(config = {}) {
        super(config);
        this.providerCode = 'gdt';
        this.providerName = 'Tổng cục Thuế (XML Import)';
    }

    getProviderCode() {
        return this.providerCode;
    }

    getProviderName() {
        return this.providerName;
    }

    /**
     * Test connection - GDT is always available for XML import
     */
    async testConnection() {
        return {
            success: true,
            isMock: false,
            provider: this.providerCode,
            message: 'Sẵn sàng nhận file XML từ cổng HĐĐT Tổng cục Thuế',
            data: {
                status: 'ready',
                supportedFormats: ['TT78/2021', 'ND123/2020', 'Generic XML']
            }
        };
    }

    /**
     * Parse XML content to invoice data
     * @param {string} xmlContent - Raw XML string
     */
    async parseXmlInvoice(xmlContent) {
        const result = await GDTXmlParser.parseXml(xmlContent);

        if (!result.success) {
            return result;
        }

        // Normalize to standard format
        const invoice = this.normalizeInvoice(result.data);

        return {
            success: true,
            isMock: false,
            provider: this.providerCode,
            data: invoice
        };
    }

    /**
     * Parse multiple XML files
     * @param {Array<string>} xmlContents - Array of XML strings
     */
    async parseMultipleXml(xmlContents) {
        const invoices = [];
        const errors = [];

        for (let i = 0; i < xmlContents.length; i++) {
            const result = await this.parseXmlInvoice(xmlContents[i]);
            if (result.success) {
                invoices.push(result.data);
            } else {
                errors.push({ index: i, error: result.error.message });
            }
        }

        return {
            success: true,
            isMock: false,
            provider: this.providerCode,
            data: {
                invoices,
                totalParsed: invoices.length,
                totalErrors: errors.length,
                errors
            }
        };
    }

    /**
     * Fetch invoices - Not supported for GDT (no API)
     */
    async fetchInvoices(fromDate, toDate, filters = {}) {
        return {
            success: false,
            isMock: false,
            provider: this.providerCode,
            error: {
                code: 'NOT_SUPPORTED',
                message: 'Cổng HĐĐT Tổng cục Thuế không hỗ trợ API. Vui lòng tải file XML từ website và import vào hệ thống.'
            }
        };
    }

    /**
     * Lookup invoice - Not supported for GDT
     */
    async lookupInvoice(invoiceId) {
        return {
            success: false,
            isMock: false,
            provider: this.providerCode,
            error: {
                code: 'NOT_SUPPORTED',
                message: 'Tra cứu trực tuyến không khả dụng. Vui lòng tải file XML từ hoadondientu.gdt.gov.vn'
            }
        };
    }

    /**
     * Lookup by tax code - Not supported
     */
    async lookupByTaxCode(taxCode, fromDate, toDate) {
        return {
            success: false,
            isMock: false,
            provider: this.providerCode,
            error: {
                code: 'NOT_SUPPORTED',
                message: 'Tra cứu trực tuyến không khả dụng. Vui lòng tải file XML từ hoadondientu.gdt.gov.vn'
            }
        };
    }

    /**
     * Normalize invoice data to standard format
     */
    normalizeInvoice(rawData) {
        return {
            invoiceId: rawData.invoiceId,
            invoiceSeries: rawData.invoiceSeries,
            invoiceNo: rawData.invoiceNo,
            invoiceDate: rawData.invoiceDate,
            invoiceType: rawData.invoiceType || 'purchase',

            sellerTaxCode: rawData.sellerTaxCode,
            sellerName: rawData.sellerName,
            sellerAddress: rawData.sellerAddress,
            sellerPhone: rawData.sellerPhone,
            sellerBankAccount: rawData.sellerBankAccount,
            sellerBankName: rawData.sellerBankName,

            buyerTaxCode: rawData.buyerTaxCode,
            buyerName: rawData.buyerName,
            buyerAddress: rawData.buyerAddress,
            buyerPhone: rawData.buyerPhone,

            items: rawData.items || [],
            totalBeforeTax: rawData.totalBeforeTax,
            vatAmount: rawData.vatAmount,
            totalAmount: rawData.totalAmount,

            currency: rawData.currency || 'VND',
            exchangeRate: rawData.exchangeRate || 1,

            rawData: rawData.rawData
        };
    }
}

module.exports = GDTProvider;
