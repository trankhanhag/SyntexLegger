import { http, HttpResponse } from 'msw';

export const handlers = [
    // ==================== Auth Handlers ====================
    http.post('*/api/login', async ({ request }) => {
        const body = await request.json() as { username: string; password: string };
        if (body.username === 'admin' && body.password === 'password123') {
            return HttpResponse.json({
                token: 'mock-jwt-token',
                user: {
                    id: 1,
                    username: 'admin',
                    role: 'admin',
                    email: 'admin@test.com',
                },
            });
        }
        return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
        );
    }),

    http.get('*/api/me', ({ request }) => {
        const authHeader = request.headers.get('Authorization');
        if (authHeader === 'Bearer mock-jwt-token') {
            return HttpResponse.json({
                user: {
                    id: 1,
                    username: 'admin',
                    role: 'admin',
                    email: 'admin@test.com',
                },
            });
        }
        return HttpResponse.json(
            { message: 'Unauthorized' },
            { status: 401 }
        );
    }),

    // ==================== Voucher Handlers ====================
    http.get('*/api/vouchers', () => {
        return HttpResponse.json([
            { id: '1', doc_no: 'V001', doc_date: '2024-01-01', description: 'Test Voucher 1', total_amount: 1000 },
            { id: '2', doc_no: 'V002', doc_date: '2024-01-02', description: 'Test Voucher 2', total_amount: 2000 },
        ]);
    }),

    http.get('*/api/vouchers/:id', ({ params }) => {
        const id = params.id;
        return HttpResponse.json({
            data: {
                id,
                doc_type: 'GL',
                doc_no: `V${id}`,
                doc_date: '2024-01-01',
                description: 'Test Voucher',
                currency: 'VND',
                exchange_rate: 1,
                status: 'DRAFT',
                items: [
                    {
                        id: 1,
                        line_no: 1,
                        account_code: '1111',
                        description: 'Item 1',
                        debit_amount: 1000000,
                        credit_amount: 0,
                    },
                    {
                        id: 2,
                        line_no: 2,
                        account_code: '3311',
                        description: 'Item 2',
                        debit_amount: 0,
                        credit_amount: 1000000,
                    },
                ],
            },
        });
    }),

    http.post('*/api/vouchers', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({
            data: {
                id: 'new-voucher-id',
                doc_no: 'V999',
                ...body,
            },
        });
    }),

    http.put('*/api/vouchers/:id', async ({ params, request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({
            data: {
                id: params.id,
                ...body,
            },
        });
    }),

    http.post('*/api/vouchers/:id/post', ({ params }) => {
        return HttpResponse.json({
            data: { id: params.id, status: 'POSTED' },
        });
    }),

    http.post('*/api/vouchers/:id/void', ({ params }) => {
        return HttpResponse.json({
            data: { id: params.id, status: 'VOIDED' },
        });
    }),

    http.post('*/api/vouchers/:id/duplicate', ({ params }) => {
        return HttpResponse.json({
            data: {
                id: 'duplicated-voucher-id',
                doc_no: `V${params.id}-COPY`,
            },
        });
    }),

    // ==================== Settings Handlers ====================
    http.get('*/api/settings', () => {
        return HttpResponse.json({
            data: {
                locked_until_date: '2023-12-31',
            },
        });
    }),

    // ==================== Master Data Handlers ====================
    http.get('*/api/accounts', () => {
        return HttpResponse.json({
            data: [
                { id: '1', account_code: '1111', account_name: 'Tiền mặt', category: 'TÀI SẢN', is_detail: 1 },
                { id: '2', account_code: '1121', account_name: 'Tiền gửi ngân hàng', category: 'TÀI SẢN', is_detail: 1 },
                { id: '3', account_code: '3311', account_name: 'Phải trả người bán', category: 'NỢ PHẢI TRẢ', is_detail: 1 },
                { id: '4', account_code: '1', account_name: 'Tài sản', category: 'TÀI SẢN', is_detail: 0 },
            ],
        });
    }),

    http.get('*/api/partners', () => {
        return HttpResponse.json({
            data: [
                { id: '1', partner_code: 'KH001', partner_name: 'Khách hàng A', partner_type: 'CUSTOMER' },
                { id: '2', partner_code: 'NCC001', partner_name: 'Nhà cung cấp B', partner_type: 'SUPPLIER' },
                { id: '3', partner_code: 'KH002', partner_name: 'Khách hàng C', partner_type: 'CUSTOMER' },
            ],
        });
    }),

    http.get('*/api/products', () => {
        return HttpResponse.json({
            data: [
                { id: '1', product_code: 'SP001', product_name: 'Sản phẩm A', unit: 'Cái' },
                { id: '2', product_code: 'SP002', product_name: 'Sản phẩm B', unit: 'Kg' },
            ],
        });
    }),

    http.get('*/api/materials', () => {
        return HttpResponse.json({
            data: [
                { id: '1', material_code: 'VT001', material_name: 'Vật tư A', unit: 'Cái' },
                { id: '2', material_code: 'VT002', material_name: 'Vật tư B', unit: 'Kg' },
            ],
        });
    }),

    // Legacy endpoint for backward compatibility
    http.get('*/api/master/accounts', () => {
        return HttpResponse.json([
            { id: '111', code: '111', name: 'Tiền mặt' },
            { id: '112', code: '112', name: 'Tiền gửi ngân hàng' },
        ]);
    }),
];
