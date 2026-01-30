/**
 * GDT XML Parser
 * SyntexHCSN - Parse e-invoice XML files from Vietnam General Department of Taxation
 *
 * Supports standard XML formats:
 * - Thông tư 78/2021/TT-BTC
 * - Nghị định 123/2020/NĐ-CP
 */

const xml2js = require('xml2js');

class GDTXmlParser {
    constructor() {
        this.parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: false,
            tagNameProcessors: [xml2js.processors.stripPrefix]
        });
    }

    /**
     * Parse XML content and extract invoice data
     * @param {string} xmlContent - Raw XML string
     * @returns {Promise<Object>} Normalized invoice data
     */
    async parseXml(xmlContent) {
        try {
            const result = await this.parser.parseStringPromise(xmlContent);

            // Try different XML structures
            let invoice = null;

            // Format 1: HDon > DLHDon (Common format)
            if (result.HDon?.DLHDon) {
                invoice = this._parseHDonFormat(result.HDon);
            }
            // Format 2: Invoice root
            else if (result.Invoice) {
                invoice = this._parseInvoiceFormat(result.Invoice);
            }
            // Format 3: TDiep (Message format from GDT)
            else if (result.TDiep?.DLieu?.HDon) {
                invoice = this._parseHDonFormat(result.TDiep.DLieu.HDon);
            }
            // Format 4: HDON (Simple format)
            else if (result.HDON) {
                invoice = this._parseSimpleFormat(result.HDON);
            }
            // Format 5: invoiceData
            else if (result.invoiceData) {
                invoice = this._parseInvoiceDataFormat(result.invoiceData);
            }
            else {
                // Try to detect and parse generic structure
                invoice = this._parseGenericFormat(result);
            }

            if (!invoice) {
                throw new Error('Không nhận dạng được định dạng XML hóa đơn');
            }

            return {
                success: true,
                data: invoice
            };
        } catch (error) {
            console.error('GDTXmlParser.parseXml error:', error);
            return {
                success: false,
                error: { message: `Lỗi parse XML: ${error.message}` }
            };
        }
    }

    /**
     * Parse HDon format (Thông tư 78)
     */
    _parseHDonFormat(hdon) {
        const dlhdon = hdon.DLHDon || hdon;
        const ttchung = dlhdon.TTChung || {};
        const ndHDon = dlhdon.NDHDon || {};
        const nbHDon = ndHDon.NBan || {};
        const nmHDon = ndHDon.NMua || {};
        const dsctsHHDV = ndHDon.DSHHDVu?.HHDVu || [];
        const ttoan = ndHDon.TToan || {};

        // Parse line items
        const items = this._parseItems(dsctsHHDV);

        return {
            invoiceId: ttchung.MHSo || ttchung.Id || this._generateId(),
            invoiceSeries: ttchung.KHMSHDon || ttchung.KHHDon || '',
            invoiceNo: ttchung.SHDon || '',
            invoiceDate: this._parseDate(ttchung.NLap || ttchung.NgayLap),
            invoiceType: this._determineInvoiceType(ttchung.THDon),

            sellerTaxCode: nbHDon.MST || '',
            sellerName: nbHDon.Ten || '',
            sellerAddress: nbHDon.DChi || '',
            sellerPhone: nbHDon.SDThoai || '',
            sellerBankAccount: nbHDon.STKNHang || '',
            sellerBankName: nbHDon.TNHang || '',

            buyerTaxCode: nmHDon.MST || '',
            buyerName: nmHDon.Ten || '',
            buyerAddress: nmHDon.DChi || '',
            buyerPhone: nmHDon.SDThoai || '',

            items,
            totalBeforeTax: this._parseNumber(ttoan.TgTCThue || this._sumItems(items, 'amount')),
            vatAmount: this._parseNumber(ttoan.TgTThue || this._sumItems(items, 'vatAmount')),
            totalAmount: this._parseNumber(ttoan.TgTTTBSo || ttoan.TTCKTMai || this._sumItems(items, 'totalAmount')),

            currency: ttchung.DVTTe || 'VND',
            exchangeRate: this._parseNumber(ttchung.TGia) || 1,

            rawData: hdon
        };
    }

    /**
     * Parse Invoice format (Alternative)
     */
    _parseInvoiceFormat(invoice) {
        const seller = invoice.Seller || invoice.sellerInfo || {};
        const buyer = invoice.Buyer || invoice.buyerInfo || {};
        const items = invoice.Items?.Item || invoice.products?.product || [];
        const summary = invoice.Summary || invoice.invoiceSummary || {};

        return {
            invoiceId: invoice.InvoiceId || invoice.id || this._generateId(),
            invoiceSeries: invoice.InvoiceSeries || invoice.templateCode || '',
            invoiceNo: invoice.InvoiceNo || invoice.invoiceNumber || '',
            invoiceDate: this._parseDate(invoice.InvoiceDate || invoice.invoiceIssuedDate),
            invoiceType: this._determineInvoiceType(invoice.InvoiceType),

            sellerTaxCode: seller.TaxCode || seller.sellerTaxCode || '',
            sellerName: seller.Name || seller.sellerLegalName || '',
            sellerAddress: seller.Address || seller.sellerAddressLine || '',

            buyerTaxCode: buyer.TaxCode || buyer.buyerTaxCode || '',
            buyerName: buyer.Name || buyer.buyerLegalName || '',
            buyerAddress: buyer.Address || buyer.buyerAddressLine || '',

            items: this._parseItems(items),
            totalBeforeTax: this._parseNumber(summary.TotalBeforeTax || summary.sumOfTotalLineAmountWithoutTax),
            vatAmount: this._parseNumber(summary.TotalVAT || summary.totalTaxAmount),
            totalAmount: this._parseNumber(summary.TotalAmount || summary.grandTotalAmount),

            currency: invoice.Currency || 'VND',
            rawData: invoice
        };
    }

    /**
     * Parse simple HDON format
     */
    _parseSimpleFormat(hdon) {
        return {
            invoiceId: hdon.MA_HDDT || hdon.ID || this._generateId(),
            invoiceSeries: hdon.KY_HIEU || hdon.MSHD || '',
            invoiceNo: hdon.SO_HD || hdon.SOHD || '',
            invoiceDate: this._parseDate(hdon.NGAY_HD || hdon.NGAYLAP),
            invoiceType: 'purchase',

            sellerTaxCode: hdon.MST_BAN || hdon.MST_NCC || '',
            sellerName: hdon.TEN_BAN || hdon.TEN_NCC || '',
            sellerAddress: hdon.DIACHI_BAN || '',

            buyerTaxCode: hdon.MST_MUA || hdon.MST_KH || '',
            buyerName: hdon.TEN_MUA || hdon.TEN_KH || '',
            buyerAddress: hdon.DIACHI_MUA || '',

            items: [],
            totalBeforeTax: this._parseNumber(hdon.TIEN_CTHUE || hdon.THANH_TIEN),
            vatAmount: this._parseNumber(hdon.TIEN_THUE || hdon.THUE_GTGT),
            totalAmount: this._parseNumber(hdon.TONG_TIEN || hdon.TONG_THANH_TOAN),

            rawData: hdon
        };
    }

    /**
     * Parse invoiceData format (MISA/VNPT style)
     */
    _parseInvoiceDataFormat(data) {
        const generalInfo = data.generalInvoiceInfo || {};
        const seller = data.sellerInfo || {};
        const buyer = data.buyerInfo || {};
        const payments = data.payments || {};
        const items = data.itemInfo || [];

        return {
            invoiceId: generalInfo.transactionUuid || this._generateId(),
            invoiceSeries: generalInfo.templateCode || '',
            invoiceNo: generalInfo.invoiceNo || '',
            invoiceDate: this._parseDate(generalInfo.invoiceIssuedDate),
            invoiceType: 'purchase',

            sellerTaxCode: seller.sellerTaxCode || '',
            sellerName: seller.sellerLegalName || '',
            sellerAddress: seller.sellerAddressLine || '',

            buyerTaxCode: buyer.buyerTaxCode || '',
            buyerName: buyer.buyerLegalName || buyer.buyerDisplayName || '',
            buyerAddress: buyer.buyerAddressLine || '',

            items: this._parseItems(items),
            totalBeforeTax: this._parseNumber(payments.sumOfTotalLineAmountWithoutTax),
            vatAmount: this._parseNumber(payments.totalTaxAmount),
            totalAmount: this._parseNumber(payments.grandTotalAmount),

            rawData: data
        };
    }

    /**
     * Parse generic/unknown format
     */
    _parseGenericFormat(obj) {
        // Flatten and search for invoice-like data
        const flat = this._flattenObject(obj);

        const invoice = {
            invoiceId: this._findValue(flat, ['invoiceId', 'id', 'MHSo', 'MA_HDDT']) || this._generateId(),
            invoiceSeries: this._findValue(flat, ['invoiceSeries', 'KHMSHDon', 'KHHDon', 'KY_HIEU', 'templateCode']) || '',
            invoiceNo: this._findValue(flat, ['invoiceNo', 'SHDon', 'SO_HD', 'invoiceNumber']) || '',
            invoiceDate: this._parseDate(this._findValue(flat, ['invoiceDate', 'NLap', 'NgayLap', 'NGAY_HD', 'invoiceIssuedDate'])),
            invoiceType: 'purchase',

            sellerTaxCode: this._findValue(flat, ['sellerTaxCode', 'MST', 'MST_BAN', 'MST_NCC']) || '',
            sellerName: this._findValue(flat, ['sellerName', 'Ten', 'TEN_BAN', 'sellerLegalName']) || '',
            sellerAddress: this._findValue(flat, ['sellerAddress', 'DChi', 'DIACHI_BAN', 'sellerAddressLine']) || '',

            buyerTaxCode: this._findValue(flat, ['buyerTaxCode', 'MST', 'MST_MUA', 'MST_KH']) || '',
            buyerName: this._findValue(flat, ['buyerName', 'Ten', 'TEN_MUA', 'buyerLegalName']) || '',
            buyerAddress: this._findValue(flat, ['buyerAddress', 'DChi', 'DIACHI_MUA', 'buyerAddressLine']) || '',

            items: [],
            totalBeforeTax: this._parseNumber(this._findValue(flat, ['totalBeforeTax', 'TgTCThue', 'TIEN_CTHUE', 'sumOfTotalLineAmountWithoutTax'])),
            vatAmount: this._parseNumber(this._findValue(flat, ['vatAmount', 'TgTThue', 'TIEN_THUE', 'totalTaxAmount'])),
            totalAmount: this._parseNumber(this._findValue(flat, ['totalAmount', 'TgTTTBSo', 'TONG_TIEN', 'grandTotalAmount'])),

            rawData: obj
        };

        // Verify we got minimum required data
        if (!invoice.sellerTaxCode && !invoice.sellerName && !invoice.totalAmount) {
            return null;
        }

        return invoice;
    }

    /**
     * Parse line items array
     */
    _parseItems(items) {
        if (!items) return [];
        const itemArray = Array.isArray(items) ? items : [items];

        return itemArray.map((item, index) => ({
            lineNo: item.STT || item.lineNumber || index + 1,
            productCode: item.MHHDVu || item.itemCode || '',
            productName: item.THHDVu || item.Ten || item.itemName || item.description || '',
            unit: item.DVTinh || item.unitName || '',
            quantity: this._parseNumber(item.SLuong || item.quantity) || 1,
            unitPrice: this._parseNumber(item.DGia || item.unitPrice) || 0,
            amount: this._parseNumber(item.ThTien || item.TThue5 || item.itemTotalAmountWithoutTax) || 0,
            vatRate: this._parseNumber(item.TSuat || item.TLCKhac || item.percentage) || 10,
            vatAmount: this._parseNumber(item.TThue || item.taxAmount) || 0,
            totalAmount: this._parseNumber(item.TTCKTMai || item.lineTotal) || 0
        }));
    }

    /**
     * Helper: Parse date string to ISO format
     */
    _parseDate(dateStr) {
        if (!dateStr) return new Date().toISOString().split('T')[0];

        // Try common formats
        const formats = [
            /^(\d{4})-(\d{2})-(\d{2})/, // 2024-01-15
            /^(\d{2})\/(\d{2})\/(\d{4})/, // 15/01/2024
            /^(\d{2})-(\d{2})-(\d{4})/, // 15-01-2024
            /^(\d{4})(\d{2})(\d{2})/ // 20240115
        ];

        for (const format of formats) {
            const match = String(dateStr).match(format);
            if (match) {
                if (format === formats[0] || format === formats[3]) {
                    return `${match[1]}-${match[2]}-${match[3]}`;
                } else {
                    return `${match[3]}-${match[2]}-${match[1]}`;
                }
            }
        }

        // Try Date parsing
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return new Date().toISOString().split('T')[0];
    }

    /**
     * Helper: Parse number from various formats
     */
    _parseNumber(value) {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;

        // Remove thousand separators and convert decimal
        const cleaned = String(value)
            .replace(/\./g, '') // Remove thousand separator (VN format)
            .replace(/,/g, '.') // Convert decimal separator
            .replace(/[^\d.-]/g, ''); // Remove non-numeric

        return parseFloat(cleaned) || 0;
    }

    /**
     * Helper: Sum item amounts
     */
    _sumItems(items, field) {
        return items.reduce((sum, item) => sum + (item[field] || 0), 0);
    }

    /**
     * Helper: Determine invoice type
     */
    _determineInvoiceType(typeCode) {
        const purchaseTypes = ['1', '2', '6', 'purchase', 'mua'];
        const saleTypes = ['3', '4', '5', 'sale', 'ban'];

        if (!typeCode) return 'purchase';
        const code = String(typeCode).toLowerCase();

        if (purchaseTypes.some(t => code.includes(t))) return 'purchase';
        if (saleTypes.some(t => code.includes(t))) return 'sale';
        return 'purchase';
    }

    /**
     * Helper: Generate unique ID
     */
    _generateId() {
        return `XML_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Helper: Flatten nested object
     */
    _flattenObject(obj, prefix = '') {
        const result = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    Object.assign(result, this._flattenObject(obj[key], newKey));
                } else {
                    result[key] = obj[key]; // Store with simple key too
                    result[newKey] = obj[key];
                }
            }
        }

        return result;
    }

    /**
     * Helper: Find value by multiple possible keys
     */
    _findValue(obj, keys) {
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
                return obj[key];
            }
        }
        return null;
    }
}

module.exports = new GDTXmlParser();
