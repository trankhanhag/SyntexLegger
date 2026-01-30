/**
 * Mock Invoice Provider - Demo Data
 * SyntexHCSN - E-Invoice Integration
 *
 * Provides sample invoice data for testing and demo purposes
 */

const BaseInvoiceProvider = require('./BaseInvoiceProvider');

class MockProvider extends BaseInvoiceProvider {
    constructor(config = {}) {
        super(config);
        this.providerCode = 'mock';
        this.providerName = 'Demo Provider';
    }

    /**
     * Generate mock invoices for demo
     */
    _generateMockInvoices() {
        return [
            {
                invoiceId: 'MOCK-INV-001',
                invoiceNo: '0000123',
                invoiceSeries: '1C24TGG',
                invoiceDate: '2024-01-15',
                sellerTaxCode: '0100100000',
                sellerName: 'Công ty TNHH ABC',
                buyerTaxCode: '0123456789',
                buyerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                totalBeforeTax: 10000000,
                vatAmount: 1000000,
                totalAmount: 11000000,
                invoiceType: 'purchase',
                items: [
                    { name: 'Văn phòng phẩm', quantity: 100, unitPrice: 50000, amount: 5000000, vat: 500000 },
                    { name: 'Mực in HP', quantity: 10, unitPrice: 500000, amount: 5000000, vat: 500000 }
                ]
            },
            {
                invoiceId: 'MOCK-INV-002',
                invoiceNo: '0000456',
                invoiceSeries: '1C24TGG',
                invoiceDate: '2024-01-18',
                sellerTaxCode: '0100200000',
                sellerName: 'Công ty CP XNK DEF',
                buyerTaxCode: '0123456789',
                buyerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                totalBeforeTax: 25000000,
                vatAmount: 2500000,
                totalAmount: 27500000,
                invoiceType: 'purchase',
                items: [
                    { name: 'Máy tính xách tay Dell', quantity: 1, unitPrice: 25000000, amount: 25000000, vat: 2500000 }
                ]
            },
            {
                invoiceId: 'MOCK-INV-003',
                invoiceNo: '0000789',
                invoiceSeries: '1C24TSA',
                invoiceDate: '2024-01-20',
                sellerTaxCode: '0123456789',
                sellerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                buyerTaxCode: '0100300000',
                buyerName: 'Công ty TNHH GHI',
                totalBeforeTax: 5000000,
                vatAmount: 500000,
                totalAmount: 5500000,
                invoiceType: 'sale',
                items: [
                    { name: 'Dịch vụ tư vấn', quantity: 1, unitPrice: 5000000, amount: 5000000, vat: 500000 }
                ]
            },
            {
                invoiceId: 'MOCK-INV-004',
                invoiceNo: '0001000',
                invoiceSeries: '1C24TGG',
                invoiceDate: '2024-01-22',
                sellerTaxCode: '0100400000',
                sellerName: 'Công ty Điện lực ABC',
                buyerTaxCode: '0123456789',
                buyerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                totalBeforeTax: 8500000,
                vatAmount: 850000,
                totalAmount: 9350000,
                invoiceType: 'purchase',
                items: [
                    { name: 'Tiền điện tháng 01/2024', quantity: 1, unitPrice: 8500000, amount: 8500000, vat: 850000 }
                ]
            },
            {
                invoiceId: 'MOCK-INV-005',
                invoiceNo: '0001234',
                invoiceSeries: '1C24TGG',
                invoiceDate: '2024-01-25',
                sellerTaxCode: '0100500000',
                sellerName: 'VNPT Hà Nội',
                buyerTaxCode: '0123456789',
                buyerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                totalBeforeTax: 2000000,
                vatAmount: 200000,
                totalAmount: 2200000,
                invoiceType: 'purchase',
                items: [
                    { name: 'Cước internet tháng 01/2024', quantity: 1, unitPrice: 1500000, amount: 1500000, vat: 150000 },
                    { name: 'Cước điện thoại cố định', quantity: 1, unitPrice: 500000, amount: 500000, vat: 50000 }
                ]
            },
            {
                invoiceId: 'MOCK-INV-006',
                invoiceNo: '0001567',
                invoiceSeries: '1C24TGG',
                invoiceDate: '2024-02-01',
                sellerTaxCode: '0100600000',
                sellerName: 'Công ty CP Bảo trì thiết bị',
                buyerTaxCode: '0123456789',
                buyerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                totalBeforeTax: 15000000,
                vatAmount: 1500000,
                totalAmount: 16500000,
                invoiceType: 'purchase',
                items: [
                    { name: 'Bảo trì máy lạnh', quantity: 5, unitPrice: 2000000, amount: 10000000, vat: 1000000 },
                    { name: 'Linh kiện thay thế', quantity: 1, unitPrice: 5000000, amount: 5000000, vat: 500000 }
                ]
            },
            {
                invoiceId: 'MOCK-INV-007',
                invoiceNo: '0001890',
                invoiceSeries: '1C24TSA',
                invoiceDate: '2024-02-05',
                sellerTaxCode: '0123456789',
                sellerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                buyerTaxCode: '0100700000',
                buyerName: 'Công ty TNHH JKL',
                totalBeforeTax: 12000000,
                vatAmount: 1200000,
                totalAmount: 13200000,
                invoiceType: 'sale',
                items: [
                    { name: 'Phí dịch vụ công', quantity: 1, unitPrice: 12000000, amount: 12000000, vat: 1200000 }
                ]
            },
            {
                invoiceId: 'MOCK-INV-008',
                invoiceNo: '0002000',
                invoiceSeries: '1C24TGG',
                invoiceDate: '2024-02-10',
                sellerTaxCode: '0100800000',
                sellerName: 'Công ty CP Xăng dầu',
                buyerTaxCode: '0123456789',
                buyerName: 'Đơn vị Hành chính Sự nghiệp XYZ',
                totalBeforeTax: 20000000,
                vatAmount: 2000000,
                totalAmount: 22000000,
                invoiceType: 'purchase',
                items: [
                    { name: 'Xăng RON 95', quantity: 400, unitPrice: 25000, amount: 10000000, vat: 1000000 },
                    { name: 'Dầu Diesel', quantity: 500, unitPrice: 20000, amount: 10000000, vat: 1000000 }
                ]
            }
        ];
    }

    /**
     * Test connection - always succeeds for mock
     */
    async testConnection() {
        // Simulate network delay
        await this._delay(500);

        return this.wrapResponse(true, {
            connected: true,
            message: 'Kết nối Demo Provider thành công',
            serverTime: new Date().toISOString(),
            apiVersion: '1.0.0-mock'
        }, null, true);
    }

    /**
     * Fetch invoices within date range
     */
    async fetchInvoices(fromDate, toDate, filters = {}) {
        await this._delay(800);

        let invoices = this._generateMockInvoices();

        // Filter by date range
        if (fromDate && toDate) {
            invoices = invoices.filter(inv => {
                const invDate = new Date(inv.invoiceDate);
                return invDate >= new Date(fromDate) && invDate <= new Date(toDate);
            });
        }

        // Filter by type
        if (filters.invoiceType) {
            invoices = invoices.filter(inv => inv.invoiceType === filters.invoiceType);
        }

        // Filter by seller tax code
        if (filters.sellerTaxCode) {
            invoices = invoices.filter(inv =>
                inv.sellerTaxCode.includes(filters.sellerTaxCode)
            );
        }

        return this.wrapResponse(true, {
            invoices: invoices.map(inv => this.normalizeInvoice(inv)),
            total: invoices.length,
            period: { fromDate, toDate }
        }, null, true);
    }

    /**
     * Lookup a specific invoice by ID
     */
    async lookupInvoice(invoiceId) {
        await this._delay(300);

        const invoices = this._generateMockInvoices();
        const invoice = invoices.find(inv => inv.invoiceId === invoiceId);

        if (invoice) {
            return this.wrapResponse(true, this.normalizeInvoice(invoice), null, true);
        }

        return this.wrapResponse(false, null, {
            code: 'NOT_FOUND',
            message: `Không tìm thấy hóa đơn với mã: ${invoiceId}`
        }, true);
    }

    /**
     * Lookup invoices by tax code
     */
    async lookupByTaxCode(taxCode, fromDate, toDate) {
        await this._delay(600);

        let invoices = this._generateMockInvoices();

        // Filter by tax code (seller or buyer)
        invoices = invoices.filter(inv =>
            inv.sellerTaxCode.includes(taxCode) || inv.buyerTaxCode.includes(taxCode)
        );

        // Filter by date range
        if (fromDate && toDate) {
            invoices = invoices.filter(inv => {
                const invDate = new Date(inv.invoiceDate);
                return invDate >= new Date(fromDate) && invDate <= new Date(toDate);
            });
        }

        return this.wrapResponse(true, {
            invoices: invoices.map(inv => this.normalizeInvoice(inv)),
            total: invoices.length,
            searchCriteria: { taxCode, fromDate, toDate }
        }, null, true);
    }

    /**
     * Lookup invoice by invoice number
     */
    async lookupByInvoiceNo(invoiceNo, invoiceSeries) {
        await this._delay(400);

        const invoices = this._generateMockInvoices();
        const invoice = invoices.find(inv =>
            inv.invoiceNo === invoiceNo &&
            (!invoiceSeries || inv.invoiceSeries === invoiceSeries)
        );

        if (invoice) {
            return this.wrapResponse(true, this.normalizeInvoice(invoice), null, true);
        }

        return this.wrapResponse(false, null, {
            code: 'NOT_FOUND',
            message: `Không tìm thấy hóa đơn số: ${invoiceNo}`
        }, true);
    }

    /**
     * Simulate network delay
     */
    async _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MockProvider;
