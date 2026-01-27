/**
 * Treasury API Service (Kho bạc Nhà nước)
 * SyntexHCSN - Integration with TABMIS
 * 
 * Supports:
 * - Budget reconciliation (Đối chiếu dự toán)
 * - Electronic payment orders (Lệnh chi điện tử)
 * - Data import from Treasury (Import dữ liệu KBNN)
 */

const axios = require('axios');

class TreasuryService {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.TREASURY_API_URL || 'https://api.kbnn.vn/v1';
        this.apiKey = config.apiKey || process.env.TREASURY_API_KEY || '';
        this.unitCode = config.unitCode || process.env.TREASURY_UNIT_CODE || '';
        this.timeout = config.timeout || 30000;

        // Flag to control mock data behavior - opt-in only
        this.useMockOnError = config.useMockOnError !== undefined
            ? config.useMockOnError
            : process.env.TREASURY_USE_MOCK === '1';

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
                'X-Unit-Code': this.unitCode
            }
        });
    }

    /**
     * Get budget allocation details (Dự toán được giao)
     * @param {string} fiscalYear - Năm ngân sách (YYYY)
     * @param {string} budgetType - Loại dự toán (TX: thường xuyên, KTX: không thường xuyên, DT: đầu tư)
     */
    async getBudgetAllocation(fiscalYear, budgetType = 'TX') {
        try {
            const response = await this.client.get('/budget/allocation', {
                params: { fiscalYear, budgetType, unitCode: this.unitCode }
            });
            return { success: true, data: response.data };
        } catch (error) {
            // Only use mock data when explicitly enabled
            if (this.useMockOnError) {
                console.warn('Treasury API unavailable, using mock data (dev mode) for Budget Allocation.');
                return {
                    success: true,
                    isMock: true, // Flag to indicate this is mock data
                    data: {
                        regularBudget: { allocated: 25000000000, used: 12500000000 },
                        irregularBudget: { allocated: 5000000000, used: 1500000000 }
                    }
                };
            }
            return this._handleError(error, 'getBudgetAllocation');
        }
    }

    /**
     * Get budget execution status (Tình hình thực hiện dự toán)
     * @param {string} fiscalYear - Năm ngân sách
     * @param {string} fromDate - Từ ngày (YYYY-MM-DD)
     * @param {string} toDate - Đến ngày (YYYY-MM-DD)
     */
    async getBudgetExecution(fiscalYear, fromDate, toDate) {
        try {
            const response = await this.client.get('/budget/execution', {
                params: { fiscalYear, fromDate, toDate, unitCode: this.unitCode }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this._handleError(error, 'getBudgetExecution');
        }
    }

    /**
     * Reconcile local data with TABMIS (Đối chiếu với TABMIS)
     * @param {Array} localData - Dữ liệu từ hệ thống nội bộ
     */
    async reconcileWithTABMIS(localData) {
        try {
            const response = await this.client.post('/reconciliation/compare', {
                unitCode: this.unitCode,
                transactions: localData
            });

            const result = response.data;
            return {
                success: true,
                data: {
                    matched: result.matched || [],
                    unmatched: result.unmatched || [],
                    discrepancies: result.discrepancies || [],
                    summary: {
                        totalLocal: localData.length,
                        totalTABMIS: result.totalTABMIS || 0,
                        matchCount: result.matched?.length || 0,
                        discrepancyCount: result.discrepancies?.length || 0
                    }
                }
            };
        } catch (error) {
            return this._handleError(error, 'reconcileWithTABMIS');
        }
    }

    /**
     * Submit electronic payment order (Gửi lệnh chi điện tử)
     * @param {Object} paymentOrder - Thông tin lệnh chi
     */
    async submitPaymentOrder(paymentOrder) {
        try {
            const payload = {
                unitCode: this.unitCode,
                orderType: paymentOrder.type || 'THUC_CHI', // THUC_CHI or TAM_UNG
                amount: paymentOrder.amount,
                description: paymentOrder.description,
                beneficiary: {
                    name: paymentOrder.beneficiaryName,
                    account: paymentOrder.beneficiaryAccount,
                    bank: paymentOrder.beneficiaryBank
                },
                budgetCode: paymentOrder.budgetCode,
                chapterCode: paymentOrder.chapterCode,
                categoryCode: paymentOrder.categoryCode,
                referenceDoc: paymentOrder.referenceDoc,
                requestDate: paymentOrder.requestDate || new Date().toISOString().split('T')[0]
            };

            const response = await this.client.post('/payment-orders', payload);
            return {
                success: true,
                data: {
                    orderId: response.data.orderId,
                    status: response.data.status,
                    submittedAt: response.data.submittedAt,
                    estimatedProcessingTime: response.data.estimatedProcessingTime
                }
            };
        } catch (error) {
            return this._handleError(error, 'submitPaymentOrder');
        }
    }

    /**
     * Check payment order status (Tra cứu trạng thái lệnh chi)
     * @param {string} orderId - Mã lệnh chi
     */
    async getPaymentOrderStatus(orderId) {
        try {
            const response = await this.client.get(`/payment-orders/${orderId}/status`);
            return { success: true, data: response.data };
        } catch (error) {
            // Only use mock data when explicitly enabled
            if (this.useMockOnError) {
                console.warn('Treasury API unavailable, using mock data (dev mode) for Payment Orders.');
                return {
                    success: true,
                    isMock: true,
                    data: [
                        { id: 'LCT-001', requestDate: '2023-10-15', description: 'Thanh toán lương T10', amount: 150000000, status: 'Completed' },
                        { id: 'LCT-002', requestDate: '2023-10-14', description: 'Mua sắm VPP', amount: 5000000, status: 'Processing' },
                        { id: 'LCT-003', requestDate: '2023-10-14', description: 'Công tác phí', amount: 2500000, status: 'Submitted' }
                    ]
                };
            }
            return this._handleError(error, 'getPaymentOrderStatus');
        }
    }

    /**
     * Import transactions from Treasury (Import giao dịch từ KBNN)
     * @param {string} fromDate - Từ ngày
     * @param {string} toDate - Đến ngày
     */
    async importTransactions(fromDate, toDate) {
        try {
            const response = await this.client.get('/transactions/export', {
                params: { fromDate, toDate, unitCode: this.unitCode, format: 'json' }
            });

            const transactions = response.data.transactions || [];
            return {
                success: true,
                data: {
                    transactions: transactions.map(tx => ({
                        id: tx.transactionId,
                        date: tx.transactionDate,
                        type: tx.transactionType,
                        amount: tx.amount,
                        description: tx.description,
                        budgetCode: tx.budgetCode,
                        status: tx.status,
                        tabmisRef: tx.tabmisReference
                    })),
                    total: transactions.length,
                    period: { fromDate, toDate }
                }
            };
        } catch (error) {
            // Only use mock data when explicitly enabled
            if (this.useMockOnError) {
                console.warn('Treasury API unavailable, using mock data (dev mode) for Import Transactions.');
                const mockTransactions = [
                    {
                        transactionId: 'TRX-2024-001',
                        transactionDate: '2024-03-20',
                        transactionType: 'DEBIT',
                        amount: 5000000,
                        description: 'Thanh toán điện phí T3/2024',
                        budgetCode: '1063',
                        status: 'COMPLETED',
                        tabmisReference: 'TAB-998877'
                    },
                    {
                        transactionId: 'TRX-2024-002',
                        transactionDate: '2024-03-21',
                        transactionType: 'DEBIT',
                        amount: 15000000,
                        description: 'Mua sắm VPP Quý 1',
                        budgetCode: '1063',
                        status: 'COMPLETED',
                        tabmisReference: 'TAB-998878'
                    },
                    {
                        transactionId: 'TRX-2024-003',
                        transactionDate: '2024-03-22',
                        transactionType: 'CREDIT',
                        amount: 50000000,
                        description: 'Rút dự toán về quỹ tiền mặt',
                        budgetCode: '',
                        status: 'COMPLETED',
                        tabmisReference: 'TAB-998879'
                    }
                ];

                return {
                    success: true,
                    isMock: true,
                    data: {
                        transactions: mockTransactions.map(tx => ({
                            id: tx.transactionId,
                            date: tx.transactionDate,
                            type: tx.transactionType,
                            amount: tx.amount,
                            description: tx.description,
                            budgetCode: tx.budgetCode,
                            status: tx.status,
                            tabmisRef: tx.tabmisReference
                        })),
                        total: mockTransactions.length,
                        period: { fromDate, toDate }
                    }
                };
            }
            return this._handleError(error, 'importTransactions');
        }
    }

    /**
     * Get account balance from Treasury (Số dư tài khoản KBNN)
     * @param {string} accountCode - Mã tài khoản
     */
    async getAccountBalance(accountCode) {
        try {
            const response = await this.client.get('/accounts/balance', {
                params: { accountCode, unitCode: this.unitCode }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this._handleError(error, 'getAccountBalance');
        }
    }

    /**
     * Get detailed reconciliation data (Chi tiết đối chiếu)
     * @param {string} fiscalMonth - Tháng đối chiếu (YYYY-MM)
     */
    async getReconciliationDetail(fiscalMonth) {
        try {
            const response = await this.client.get('/reconciliation/detail', {
                params: { fiscalMonth, unitCode: this.unitCode }
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            if (this.useMockOnError) {
                const mockItems = [
                    { id: 'UNC-001', date: '2023-10-01', description: 'Thanh toán tiền điện T9', localAmount: 5000000, treasuryAmount: 5000000, diff: 0, status: 'matched' },
                    { id: 'UNC-002', date: '2023-10-02', description: 'Mua VPP', localAmount: 2500000, treasuryAmount: 2500000, diff: 0, status: 'matched' },
                    { id: 'UNC-005', date: '2023-10-05', description: 'Chi công tác phí', localAmount: 1500000, treasuryAmount: 0, diff: 1500000, status: 'unmatched_local' },
                    { id: 'GBN-003', date: '2023-10-03', description: 'Lãi tiền gửi', localAmount: 0, treasuryAmount: 50000, diff: -50000, status: 'unmatched_treasury' },
                    { id: 'UNC-004', date: '2023-10-04', description: 'Sửa chữa nhỏ', localAmount: 10000000, treasuryAmount: 1000000, diff: 9000000, status: 'diff_amount' },
                ];
                return {
                    success: true,
                    isMock: true,
                    data: mockItems
                };
            }
            return this._handleError(error, 'getReconciliationDetail');
        }
    }

    /**
     * Handle reconciliation item action (Xử lý chênh lệch đối chiếu)
     * @param {string} itemId - Mã khoản mục
     * @param {string} action - Hành động (match, ignore, adjust)
     * @param {string} note - Ghi chú
     */
    async handleReconciliationAction(itemId, action, note) {
        try {
            if (this.useMockOnError) {
                return {
                    success: true,
                    isMock: true,
                    message: `Đã xử lý mục ${itemId} với hành động: ${action}`
                };
            }
            return {
                success: false,
                error: {
                    code: 'NOT_IMPLEMENTED',
                    message: 'Chức năng xử lý đối chiếu chưa được tích hợp.'
                }
            };
        } catch (error) {
            return this._handleError(error, 'handleReconciliationAction');
        }
    }

    /**
     * Validate connection to Treasury API
     */
    async testConnection() {
        try {
            const response = await this.client.get('/health');
            return {
                success: true,
                data: {
                    connected: true,
                    serverTime: response.data.serverTime,
                    apiVersion: response.data.version
                }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: 'Không thể kết nối đến API Kho bạc',
                    details: error.message
                }
            };
        }
    }

    /**
     * Handle API errors
     */
    _handleError(error, method) {
        console.error(`TreasuryService.${method} error:`, error.message);

        if (error.response) {
            return {
                success: false,
                error: {
                    code: error.response.status,
                    message: error.response.data?.message || 'Lỗi từ API Kho bạc',
                    details: error.response.data
                }
            };
        }

        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: 'Lỗi kết nối mạng',
                details: error.message
            }
        };
    }
}

module.exports = TreasuryService;
