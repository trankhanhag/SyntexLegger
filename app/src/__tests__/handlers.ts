import { http, HttpResponse } from 'msw';

export const handlers = [
    // Mock vouchers list
    http.get('*/api/vouchers', () => {
        return HttpResponse.json([
            { id: '1', doc_no: 'V001', doc_date: '2024-01-01', description: 'Test Voucher 1', total_amount: 1000 },
            { id: '2', doc_no: 'V002', doc_date: '2024-01-02', description: 'Test Voucher 2', total_amount: 2000 },
        ]);
    }),

    // Mock settings
    http.get('*/api/settings', () => {
        return HttpResponse.json({
            data: {
                locked_until_date: '2023-12-31'
            }
        });
    }),

    // Mock accounts
    http.get('*/api/master/accounts', () => {
        return HttpResponse.json([
            { id: '111', code: '111', name: 'Tiền mặt' },
            { id: '112', code: '112', name: 'Tiền gửi ngân hàng' },
        ]);
    }),
];
