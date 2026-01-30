/**
 * E-Invoice Service
 * SyntexHCSN - E-Invoice Integration
 *
 * Main service for managing e-invoice providers and imported invoices
 */

const db = require('../knex_db');
const EInvoiceProviderFactory = require('./einvoice-provider.factory');

class EInvoiceService {
    constructor() {
        this.demoMode = process.env.EINVOICE_DEMO_MODE === 'true' || process.env.EINVOICE_DEMO_MODE === '1';
    }

    // ================== Provider Management ==================

    /**
     * Get all available providers with their configurations
     */
    async getProviders() {
        try {
            // Get registered providers from factory
            const availableProviders = EInvoiceProviderFactory.getAvailableProviders();

            // Get configured providers from database
            const configuredProviders = await db('einvoice_providers').select('*');

            // Merge available providers with configurations
            const providers = availableProviders.map(provider => {
                const config = configuredProviders.find(p => p.code === provider.code);
                return {
                    ...provider,
                    isActive: config?.is_active || false,
                    demoMode: config?.demo_mode ?? true,
                    lastSyncAt: config?.last_sync_at || null,
                    hasConfig: !!config
                };
            });

            return { success: true, data: providers };
        } catch (error) {
            console.error('EInvoiceService.getProviders error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Get a specific provider configuration
     */
    async getProviderConfig(providerCode) {
        try {
            const provider = await db('einvoice_providers')
                .where('code', providerCode)
                .first();

            if (!provider) {
                const providerInfo = EInvoiceProviderFactory.getProviderInfo(providerCode);
                if (!providerInfo) {
                    return { success: false, error: { message: 'Nhà cung cấp không hợp lệ' } };
                }
                return {
                    success: true,
                    data: {
                        ...providerInfo,
                        isActive: false,
                        demoMode: true,
                        config: {}
                    }
                };
            }

            // Don't expose sensitive config fields
            const safeConfig = provider.config ? JSON.parse(provider.config) : {};
            if (safeConfig.password) safeConfig.password = '********';
            if (safeConfig.secretKey) safeConfig.secretKey = '********';
            if (safeConfig.accessToken) safeConfig.accessToken = '********';
            if (safeConfig.appSecret) safeConfig.appSecret = '********';

            return {
                success: true,
                data: {
                    id: provider.id,
                    code: provider.code,
                    name: provider.name,
                    isActive: provider.is_active,
                    demoMode: provider.demo_mode,
                    lastSyncAt: provider.last_sync_at,
                    config: safeConfig
                }
            };
        } catch (error) {
            console.error('EInvoiceService.getProviderConfig error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Save provider configuration
     */
    async saveProviderConfig(providerCode, config) {
        try {
            const providerInfo = EInvoiceProviderFactory.getProviderInfo(providerCode);
            if (!providerInfo) {
                return { success: false, error: { message: 'Nhà cung cấp không hợp lệ' } };
            }

            const existing = await db('einvoice_providers')
                .where('code', providerCode)
                .first();

            const data = {
                code: providerCode,
                name: providerInfo.name,
                is_active: config.isActive ?? false,
                demo_mode: config.demoMode ?? true,
                config: JSON.stringify(config.credentials || {}),
                updated_at: new Date()
            };

            if (existing) {
                // Don't overwrite password if placeholder
                if (config.credentials) {
                    const existingConfig = existing.config ? JSON.parse(existing.config) : {};
                    const newConfig = { ...config.credentials };

                    if (newConfig.password === '********') newConfig.password = existingConfig.password;
                    if (newConfig.secretKey === '********') newConfig.secretKey = existingConfig.secretKey;
                    if (newConfig.accessToken === '********') newConfig.accessToken = existingConfig.accessToken;
                    if (newConfig.appSecret === '********') newConfig.appSecret = existingConfig.appSecret;

                    data.config = JSON.stringify(newConfig);
                }

                await db('einvoice_providers')
                    .where('code', providerCode)
                    .update(data);
            } else {
                data.created_at = new Date();
                await db('einvoice_providers').insert(data);
            }

            return { success: true, message: 'Đã lưu cấu hình nhà cung cấp' };
        } catch (error) {
            console.error('EInvoiceService.saveProviderConfig error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Test connection to a provider
     */
    async testProviderConnection(providerCode) {
        try {
            const providerData = await db('einvoice_providers')
                .where('code', providerCode)
                .first();

            // If demo mode or no config, use mock provider
            if (!providerData || providerData.demo_mode) {
                const mockProvider = EInvoiceProviderFactory.getProvider('mock');
                return await mockProvider.testConnection();
            }

            const config = providerData.config ? JSON.parse(providerData.config) : {};
            const provider = EInvoiceProviderFactory.getProvider(providerCode, config);
            return await provider.testConnection();
        } catch (error) {
            console.error('EInvoiceService.testProviderConnection error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    // ================== Invoice Sync ==================

    /**
     * Sync invoices from a provider
     */
    async syncInvoices(providerCode, fromDate, toDate, filters = {}, userId = null) {
        try {
            const startedAt = new Date();

            // Get provider
            const providerData = await db('einvoice_providers')
                .where('code', providerCode)
                .first();

            let provider;
            let isMock = false;

            if (!providerData || providerData.demo_mode) {
                provider = EInvoiceProviderFactory.getProvider('mock');
                isMock = true;
            } else {
                const config = providerData.config ? JSON.parse(providerData.config) : {};
                provider = EInvoiceProviderFactory.getProvider(providerCode, config);
            }

            // Fetch invoices
            const result = await provider.fetchInvoices(fromDate, toDate, filters);

            if (!result.success) {
                // Log failed sync
                await this._logSync(providerData?.id, 'manual', fromDate, toDate, 0, 0, 1, result.error, startedAt, userId);
                return result;
            }

            // Save invoices to database
            const invoices = result.data.invoices || [];
            let totalNew = 0;
            let totalErrors = 0;
            const errors = [];

            for (const invoice of invoices) {
                try {
                    const saved = await this._saveInvoice(providerData?.id || 1, invoice, isMock);
                    if (saved.isNew) totalNew++;
                } catch (err) {
                    totalErrors++;
                    errors.push({ invoiceId: invoice.invoiceId, error: err.message });
                }
            }

            // Update last sync time
            if (providerData) {
                await db('einvoice_providers')
                    .where('id', providerData.id)
                    .update({ last_sync_at: new Date() });
            }

            // Log sync
            await this._logSync(
                providerData?.id,
                'manual',
                fromDate,
                toDate,
                invoices.length,
                totalNew,
                totalErrors,
                errors.length > 0 ? errors : null,
                startedAt,
                userId
            );

            return {
                success: true,
                isMock,
                data: {
                    totalFetched: invoices.length,
                    totalNew,
                    totalErrors,
                    period: { fromDate, toDate }
                }
            };
        } catch (error) {
            console.error('EInvoiceService.syncInvoices error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Save invoice to database
     * @private
     */
    async _saveInvoice(providerId, invoice, isMock = false) {
        // Check if invoice already exists
        const existing = await db('einvoice_imports')
            .where('provider_id', providerId)
            .where('invoice_id', invoice.invoiceId)
            .first();

        if (existing) {
            return { isNew: false, id: existing.id };
        }

        // Insert new invoice
        const [id] = await db('einvoice_imports').insert({
            provider_id: providerId,
            invoice_id: invoice.invoiceId,
            invoice_no: invoice.invoiceNo,
            invoice_series: invoice.invoiceSeries,
            invoice_date: invoice.invoiceDate,
            seller_tax_code: invoice.sellerTaxCode,
            seller_name: invoice.sellerName,
            buyer_tax_code: invoice.buyerTaxCode,
            buyer_name: invoice.buyerName,
            total_before_tax: invoice.totalBeforeTax,
            vat_amount: invoice.vatAmount,
            total_amount: invoice.totalAmount,
            invoice_type: invoice.invoiceType || 'purchase',
            status: 'pending',
            raw_data: JSON.stringify(invoice.rawData || {}),
            items: JSON.stringify(invoice.items || []),
            created_at: new Date()
        });

        return { isNew: true, id };
    }

    /**
     * Log sync operation
     * @private
     */
    async _logSync(providerId, syncType, fromDate, toDate, totalFetched, totalNew, totalErrors, errorDetails, startedAt, userId) {
        await db('einvoice_sync_logs').insert({
            provider_id: providerId,
            sync_type: syncType,
            from_date: fromDate,
            to_date: toDate,
            total_fetched: totalFetched,
            total_new: totalNew,
            total_errors: totalErrors,
            error_details: errorDetails ? JSON.stringify(errorDetails) : null,
            started_at: startedAt,
            completed_at: new Date(),
            created_by: userId,
            created_at: new Date()
        });
    }

    // ================== Invoice Management ==================

    /**
     * Get imported invoices with filters
     */
    async getInvoices(filters = {}) {
        try {
            let query = db('einvoice_imports as i')
                .leftJoin('einvoice_providers as p', 'i.provider_id', 'p.id')
                .select(
                    'i.*',
                    'p.code as provider_code',
                    'p.name as provider_name'
                )
                .orderBy('i.invoice_date', 'desc');

            // Apply filters
            if (filters.status) {
                query = query.where('i.status', filters.status);
            }
            if (filters.invoiceType) {
                query = query.where('i.invoice_type', filters.invoiceType);
            }
            if (filters.fromDate) {
                query = query.where('i.invoice_date', '>=', filters.fromDate);
            }
            if (filters.toDate) {
                query = query.where('i.invoice_date', '<=', filters.toDate);
            }
            if (filters.taxCode) {
                query = query.where(function() {
                    this.where('i.seller_tax_code', 'like', `%${filters.taxCode}%`)
                        .orWhere('i.buyer_tax_code', 'like', `%${filters.taxCode}%`);
                });
            }
            if (filters.search) {
                query = query.where(function() {
                    this.where('i.invoice_no', 'like', `%${filters.search}%`)
                        .orWhere('i.seller_name', 'like', `%${filters.search}%`)
                        .orWhere('i.buyer_name', 'like', `%${filters.search}%`);
                });
            }

            // Pagination
            const page = filters.page || 1;
            const limit = filters.limit || 50;
            const offset = (page - 1) * limit;

            const [invoices, countResult] = await Promise.all([
                query.limit(limit).offset(offset),
                db('einvoice_imports').count('* as total').first()
            ]);

            return {
                success: true,
                data: {
                    invoices: invoices.map(inv => ({
                        ...inv,
                        items: inv.items ? JSON.parse(inv.items) : []
                    })),
                    total: countResult?.total || 0,
                    page,
                    limit
                }
            };
        } catch (error) {
            console.error('EInvoiceService.getInvoices error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Get a specific invoice by ID
     */
    async getInvoice(id) {
        try {
            const invoice = await db('einvoice_imports as i')
                .leftJoin('einvoice_providers as p', 'i.provider_id', 'p.id')
                .select(
                    'i.*',
                    'p.code as provider_code',
                    'p.name as provider_name'
                )
                .where('i.id', id)
                .first();

            if (!invoice) {
                return { success: false, error: { message: 'Không tìm thấy hóa đơn' } };
            }

            return {
                success: true,
                data: {
                    ...invoice,
                    items: invoice.items ? JSON.parse(invoice.items) : [],
                    rawData: invoice.raw_data ? JSON.parse(invoice.raw_data) : {}
                }
            };
        } catch (error) {
            console.error('EInvoiceService.getInvoice error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Update invoice status
     */
    async updateInvoiceStatus(id, status) {
        try {
            await db('einvoice_imports')
                .where('id', id)
                .update({ status });

            return { success: true, message: 'Đã cập nhật trạng thái hóa đơn' };
        } catch (error) {
            console.error('EInvoiceService.updateInvoiceStatus error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    // ================== Invoice Lookup ==================

    /**
     * Lookup invoice from provider (real-time)
     */
    async lookupInvoice(providerCode, lookupParams) {
        try {
            const providerData = await db('einvoice_providers')
                .where('code', providerCode)
                .first();

            let provider;
            if (!providerData || providerData.demo_mode) {
                provider = EInvoiceProviderFactory.getProvider('mock');
            } else {
                const config = providerData.config ? JSON.parse(providerData.config) : {};
                provider = EInvoiceProviderFactory.getProvider(providerCode, config);
            }

            // Determine lookup method
            if (lookupParams.invoiceId) {
                return await provider.lookupInvoice(lookupParams.invoiceId);
            } else if (lookupParams.invoiceNo) {
                return await provider.lookupByInvoiceNo(lookupParams.invoiceNo, lookupParams.invoiceSeries);
            } else if (lookupParams.taxCode) {
                return await provider.lookupByTaxCode(
                    lookupParams.taxCode,
                    lookupParams.fromDate,
                    lookupParams.toDate
                );
            }

            return { success: false, error: { message: 'Thiếu thông tin tra cứu' } };
        } catch (error) {
            console.error('EInvoiceService.lookupInvoice error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    // ================== Voucher Matching ==================

    /**
     * Match invoice to voucher
     */
    async matchToVoucher(invoiceId, voucherId, matchType = 'manual', userId = null) {
        try {
            // Check if invoice exists
            const invoice = await db('einvoice_imports').where('id', invoiceId).first();
            if (!invoice) {
                return { success: false, error: { message: 'Không tìm thấy hóa đơn' } };
            }

            // Check if voucher exists
            const voucher = await db('vouchers').where('id', voucherId).first();
            if (!voucher) {
                return { success: false, error: { message: 'Không tìm thấy chứng từ' } };
            }

            // Check if already matched
            const existingMatch = await db('einvoice_voucher_matches')
                .where('einvoice_id', invoiceId)
                .where('voucher_id', voucherId)
                .first();

            if (existingMatch) {
                return { success: false, error: { message: 'Hóa đơn đã được khớp với chứng từ này' } };
            }

            // Calculate match score (simple version)
            let matchScore = 100;
            if (Math.abs(invoice.total_amount - voucher.total_amount) > 1) {
                matchScore = Math.max(0, 100 - Math.abs(invoice.total_amount - voucher.total_amount) / invoice.total_amount * 100);
            }

            // Create match record
            await db('einvoice_voucher_matches').insert({
                einvoice_id: invoiceId,
                voucher_id: voucherId,
                match_type: matchType,
                match_score: matchScore,
                matched_at: new Date(),
                matched_by: userId,
                created_at: new Date()
            });

            // Update invoice status
            await db('einvoice_imports')
                .where('id', invoiceId)
                .update({ status: 'matched' });

            return {
                success: true,
                data: { matchScore },
                message: 'Đã khớp hóa đơn với chứng từ'
            };
        } catch (error) {
            console.error('EInvoiceService.matchToVoucher error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Get potential voucher matches for an invoice
     */
    async findPotentialMatches(invoiceId) {
        try {
            const invoice = await db('einvoice_imports').where('id', invoiceId).first();
            if (!invoice) {
                return { success: false, error: { message: 'Không tìm thấy hóa đơn' } };
            }

            // Find vouchers with similar amount and date
            const invoiceDate = new Date(invoice.invoice_date);
            const dateFrom = new Date(invoiceDate);
            dateFrom.setDate(dateFrom.getDate() - 7);
            const dateTo = new Date(invoiceDate);
            dateTo.setDate(dateTo.getDate() + 7);

            const potentialVouchers = await db('vouchers')
                .where('voucher_date', '>=', dateFrom.toISOString().split('T')[0])
                .where('voucher_date', '<=', dateTo.toISOString().split('T')[0])
                .whereBetween('total_amount', [
                    invoice.total_amount * 0.95,
                    invoice.total_amount * 1.05
                ])
                .limit(20);

            // Calculate match scores
            const matches = potentialVouchers.map(voucher => {
                let score = 100;

                // Amount difference
                const amountDiff = Math.abs(voucher.total_amount - invoice.total_amount);
                score -= (amountDiff / invoice.total_amount) * 50;

                // Date difference
                const dateDiff = Math.abs(new Date(voucher.voucher_date) - invoiceDate) / (1000 * 60 * 60 * 24);
                score -= dateDiff * 5;

                return {
                    voucher,
                    matchScore: Math.max(0, Math.round(score))
                };
            });

            // Sort by score
            matches.sort((a, b) => b.matchScore - a.matchScore);

            return { success: true, data: matches };
        } catch (error) {
            console.error('EInvoiceService.findPotentialMatches error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    // ================== Sync Logs ==================

    /**
     * Get sync logs
     */
    async getSyncLogs(filters = {}) {
        try {
            let query = db('einvoice_sync_logs as l')
                .leftJoin('einvoice_providers as p', 'l.provider_id', 'p.id')
                .select(
                    'l.*',
                    'p.code as provider_code',
                    'p.name as provider_name'
                )
                .orderBy('l.started_at', 'desc');

            if (filters.providerCode) {
                query = query.where('p.code', filters.providerCode);
            }

            const limit = filters.limit || 50;
            const logs = await query.limit(limit);

            return {
                success: true,
                data: logs.map(log => ({
                    ...log,
                    errorDetails: log.error_details ? JSON.parse(log.error_details) : null
                }))
            };
        } catch (error) {
            console.error('EInvoiceService.getSyncLogs error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    // ================== XML Import (GDT) ==================

    /**
     * Import invoice from XML content
     * @param {string} xmlContent - Raw XML string
     * @param {number} userId - User ID
     */
    async importFromXml(xmlContent, userId = null) {
        try {
            const GDTProvider = EInvoiceProviderFactory.getProvider('gdt');
            const parseResult = await GDTProvider.parseXmlInvoice(xmlContent);

            if (!parseResult.success) {
                return parseResult;
            }

            const invoice = parseResult.data;

            // Get or create GDT provider record
            let provider = await db('einvoice_providers').where('code', 'gdt').first();
            if (!provider) {
                const [id] = await db('einvoice_providers').insert({
                    code: 'gdt',
                    name: 'Tổng cục Thuế (XML)',
                    is_active: true,
                    demo_mode: false,
                    created_at: new Date()
                });
                provider = { id };
            }

            // Save to database
            const saveResult = await this._saveInvoice(provider.id, invoice, false);

            // Get full invoice record
            const savedInvoice = await this.getInvoice(saveResult.id);

            return {
                success: true,
                data: {
                    invoice: savedInvoice.data,
                    isNew: saveResult.isNew
                },
                message: saveResult.isNew ? 'Đã import hóa đơn mới' : 'Hóa đơn đã tồn tại trong hệ thống'
            };
        } catch (error) {
            console.error('EInvoiceService.importFromXml error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    // ================== Auto Create Voucher ==================

    /**
     * Create voucher from imported invoice
     * @param {number} invoiceId - Invoice ID
     * @param {Object} options - Voucher creation options
     * @param {number} userId - User ID
     */
    async createVoucherFromInvoice(invoiceId, options = {}, userId = null) {
        try {
            // Get invoice
            const invoiceResult = await this.getInvoice(invoiceId);
            if (!invoiceResult.success) {
                return invoiceResult;
            }

            const invoice = invoiceResult.data;

            // Check if already imported
            if (invoice.status === 'imported') {
                return {
                    success: false,
                    error: { message: 'Hóa đơn đã được nhập chứng từ trước đó' }
                };
            }

            // Determine accounts based on invoice type and options
            const accounts = this._determineAccounts(invoice, options);

            // Find or create partner
            const partner = await this._findOrCreatePartner(invoice);

            // Generate voucher number
            const voucherNo = await this._generateVoucherNo(options.voucherType || 'PC');

            // Create voucher data
            const voucherData = {
                voucher_no: voucherNo,
                voucher_type: options.voucherType || 'PC', // Phiếu chi
                voucher_date: invoice.invoice_date,
                description: `Thanh toán HĐ ${invoice.invoice_series}${invoice.invoice_no} - ${invoice.seller_name}`,
                partner_id: partner?.id || null,
                partner_name: invoice.seller_name,
                partner_tax_code: invoice.seller_tax_code,
                total_amount: invoice.total_amount,
                currency: 'VND',
                exchange_rate: 1,
                status: 'draft',
                einvoice_id: invoice.id,
                created_by: userId,
                created_at: new Date()
            };

            // Insert voucher
            const [voucherId] = await db('vouchers').insert(voucherData);

            // Create voucher lines
            const lines = this._createVoucherLines(invoice, accounts, voucherId);
            if (lines.length > 0) {
                await db('voucher_lines').insert(lines);
            }

            // Update invoice status
            await db('einvoice_imports')
                .where('id', invoiceId)
                .update({ status: 'imported' });

            // Create match record
            await db('einvoice_voucher_matches').insert({
                einvoice_id: invoiceId,
                voucher_id: voucherId,
                match_type: 'auto_import',
                match_score: 100,
                matched_at: new Date(),
                matched_by: userId,
                notes: 'Tự động tạo từ HĐĐT',
                created_at: new Date()
            });

            return {
                success: true,
                data: {
                    voucherId,
                    voucherNo,
                    invoiceId,
                    accounts
                },
                message: `Đã tạo chứng từ ${voucherNo} từ hóa đơn`
            };
        } catch (error) {
            console.error('EInvoiceService.createVoucherFromInvoice error:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Determine debit/credit accounts based on invoice type
     * @private
     */
    _determineAccounts(invoice, options = {}) {
        const isPurchase = invoice.invoice_type === 'purchase';

        // Default accounts for HCSN (TT 24/2024)
        if (isPurchase) {
            // Mua hàng/dịch vụ
            return {
                // Nợ TK chi phí + VAT được khấu trừ
                debit: [
                    {
                        account: options.expenseAccount || '6112', // Chi hoạt động
                        amount: invoice.total_before_tax,
                        description: 'Chi phí mua hàng/dịch vụ'
                    },
                    {
                        account: '1331', // Thuế GTGT được khấu trừ
                        amount: invoice.vat_amount,
                        description: 'Thuế GTGT đầu vào'
                    }
                ],
                // Có TK phải trả/tiền
                credit: [
                    {
                        account: options.paymentAccount || '331', // Phải trả NCC
                        amount: invoice.total_amount,
                        description: 'Phải trả nhà cung cấp'
                    }
                ]
            };
        } else {
            // Bán hàng/cung cấp dịch vụ
            return {
                // Nợ TK phải thu/tiền
                debit: [
                    {
                        account: options.receivableAccount || '131', // Phải thu KH
                        amount: invoice.total_amount,
                        description: 'Phải thu khách hàng'
                    }
                ],
                // Có TK doanh thu + VAT
                credit: [
                    {
                        account: options.revenueAccount || '531', // Doanh thu
                        amount: invoice.total_before_tax,
                        description: 'Doanh thu bán hàng/dịch vụ'
                    },
                    {
                        account: '33311', // Thuế GTGT phải nộp
                        amount: invoice.vat_amount,
                        description: 'Thuế GTGT đầu ra'
                    }
                ]
            };
        }
    }

    /**
     * Create voucher lines from invoice
     * @private
     */
    _createVoucherLines(invoice, accounts, voucherId) {
        const lines = [];
        let lineNo = 1;

        // Debit lines
        for (const debit of accounts.debit) {
            lines.push({
                voucher_id: voucherId,
                line_no: lineNo++,
                account_code: debit.account,
                debit_amount: debit.amount,
                credit_amount: 0,
                description: debit.description,
                created_at: new Date()
            });
        }

        // Credit lines
        for (const credit of accounts.credit) {
            lines.push({
                voucher_id: voucherId,
                line_no: lineNo++,
                account_code: credit.account,
                debit_amount: 0,
                credit_amount: credit.amount,
                description: credit.description,
                created_at: new Date()
            });
        }

        return lines;
    }

    /**
     * Find or create partner from invoice
     * @private
     */
    async _findOrCreatePartner(invoice) {
        try {
            // Try to find by tax code
            if (invoice.seller_tax_code) {
                const existing = await db('partners')
                    .where('tax_code', invoice.seller_tax_code)
                    .first();

                if (existing) return existing;
            }

            // Create new partner
            const partnerData = {
                partner_code: `NCC_${invoice.seller_tax_code || Date.now()}`,
                partner_name: invoice.seller_name,
                tax_code: invoice.seller_tax_code,
                address: invoice.seller_address,
                phone: invoice.seller_phone,
                partner_type: 'supplier',
                bank_account: invoice.seller_bank_account,
                bank_name: invoice.seller_bank_name,
                is_active: true,
                created_at: new Date()
            };

            const [partnerId] = await db('partners').insert(partnerData);
            return { id: partnerId, ...partnerData };
        } catch (error) {
            console.error('_findOrCreatePartner error:', error);
            return null;
        }
    }

    /**
     * Generate voucher number
     * @private
     */
    async _generateVoucherNo(voucherType) {
        const year = new Date().getFullYear();
        const prefix = `${voucherType}${year}`;

        // Get max number for this type and year
        const result = await db('vouchers')
            .where('voucher_no', 'like', `${prefix}%`)
            .max('voucher_no as maxNo')
            .first();

        let nextNo = 1;
        if (result?.maxNo) {
            const currentNo = parseInt(result.maxNo.replace(prefix, '')) || 0;
            nextNo = currentNo + 1;
        }

        return `${prefix}${String(nextNo).padStart(5, '0')}`;
    }

    /**
     * Get voucher creation preview (suggested accounts)
     * @param {number} invoiceId
     */
    async getVoucherPreview(invoiceId) {
        try {
            const invoiceResult = await this.getInvoice(invoiceId);
            if (!invoiceResult.success) {
                return invoiceResult;
            }

            const invoice = invoiceResult.data;
            const accounts = this._determineAccounts(invoice);

            return {
                success: true,
                data: {
                    invoice,
                    suggestedVoucher: {
                        voucherType: invoice.invoice_type === 'purchase' ? 'PC' : 'PT',
                        voucherDate: invoice.invoice_date,
                        description: `Thanh toán HĐ ${invoice.invoice_series}${invoice.invoice_no} - ${invoice.seller_name}`,
                        totalAmount: invoice.total_amount,
                        accounts
                    }
                }
            };
        } catch (error) {
            console.error('EInvoiceService.getVoucherPreview error:', error);
            return { success: false, error: { message: error.message } };
        }
    }
}

module.exports = new EInvoiceService();
