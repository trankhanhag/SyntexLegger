/**
 * BKAV eHoadon Provider
 * SyntexHCSN - E-Invoice Integration
 *
 * Integration with BKAV eHoadon API
 * API Documentation: https://ehoadon.bkav.com/api-docs
 */

const axios = require('axios');
const BaseInvoiceProvider = require('./BaseInvoiceProvider');

class BKAVProvider extends BaseInvoiceProvider {
    constructor(config = {}) {
        super(config);
        this.providerCode = 'bkav';
        this.providerName = 'BKAV eHoadon';

        // API configuration
        this.baseUrl = config.apiUrl || process.env.BKAV_EHOADON_API_URL || 'https://api.ehoadon.bkav.com/v1';
        this.partnerCode = config.partnerCode || process.env.BKAV_PARTNER_CODE || '';
        this.accessToken = config.accessToken || process.env.BKAV_ACCESS_TOKEN || '';
        this.taxCode = config.taxCode || process.env.BKAV_TAXCODE || '';
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
            'X-Partner-Code': this.partnerCode,
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Tax-Code': this.taxCode
        };
    }

    /**
     * Test connection to BKAV API
     */
    async testConnection() {
        if (!this.partnerCode || !this.accessToken) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API BKAV eHoadon'
            });
        }

        try {
            const response = await this.client.get('/system/check', {
                headers: this._getAuthHeaders()
            });

            return this.wrapResponse(true, {
                connected: true,
                message: 'Kết nối BKAV eHoadon thành công',
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
        if (!this.partnerCode || !this.accessToken) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API BKAV eHoadon'
            });
        }

        try {
            const response = await this.client.get('/invoices', {
                headers: this._getAuthHeaders(),
                params: {
                    TuNgay: fromDate,
                    DenNgay: toDate,
                    LoaiHoaDon: filters.invoiceType,
                    TrangThai: filters.status,
                    Trang: filters.page || 1,
                    SoBanGhi: filters.limit || 100
                }
            });

            const invoices = response.data.DsHoaDon || [];
            return this.wrapResponse(true, {
                invoices: invoices.map(inv => this.normalizeInvoice(inv)),
                total: response.data.TongSo || invoices.length,
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
        if (!this.partnerCode || !this.accessToken) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API BKAV eHoadon'
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
        if (!this.partnerCode || !this.accessToken) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API BKAV eHoadon'
            });
        }

        try {
            const response = await this.client.get('/invoices/search', {
                headers: this._getAuthHeaders(),
                params: {
                    MaSoThue: taxCode,
                    TuNgay: fromDate,
                    DenNgay: toDate
                }
            });

            const invoices = response.data.DsHoaDon || [];
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
        if (!this.partnerCode || !this.accessToken) {
            return this.wrapResponse(false, null, {
                code: 'CONFIG_MISSING',
                message: 'Chưa cấu hình thông tin API BKAV eHoadon'
            });
        }

        try {
            const response = await this.client.get('/invoices/lookup', {
                headers: this._getAuthHeaders(),
                params: {
                    SoHoaDon: invoiceNo,
                    KyHieu: invoiceSeries
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
     * Normalize BKAV invoice data to standard format
     */
    normalizeInvoice(rawData) {
        return {
            invoiceId: rawData.MaHoaDon || rawData.id,
            invoiceNo: rawData.SoHoaDon || rawData.InvNumber,
            invoiceSeries: rawData.KyHieu || rawData.InvSerial,
            invoiceDate: rawData.NgayHoaDon || rawData.InvDate,
            sellerTaxCode: rawData.MstNguoiBan || rawData.SellerTaxCode,
            sellerName: rawData.TenNguoiBan || rawData.SellerName,
            buyerTaxCode: rawData.MstNguoiMua || rawData.BuyerTaxCode,
            buyerName: rawData.TenNguoiMua || rawData.BuyerName,
            totalBeforeTax: parseFloat(rawData.TienChuaThue || rawData.AmountBeforeVAT || 0),
            vatAmount: parseFloat(rawData.TienThue || rawData.VATAmount || 0),
            totalAmount: parseFloat(rawData.TongTien || rawData.TotalAmount || 0),
            items: this._normalizeItems(rawData.DsHangHoa || rawData.Items || []),
            rawData: rawData
        };
    }

    /**
     * Normalize invoice items
     * @private
     */
    _normalizeItems(items) {
        return items.map(item => ({
            name: item.TenHang || item.ItemName,
            quantity: parseFloat(item.SoLuong || item.Quantity || 0),
            unitPrice: parseFloat(item.DonGia || item.UnitPrice || 0),
            amount: parseFloat(item.ThanhTien || item.Amount || 0),
            vat: parseFloat(item.TienThue || item.VATAmount || 0)
        }));
    }
}

module.exports = BKAVProvider;
