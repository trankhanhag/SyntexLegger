import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVouchers } from '../useVouchers';

// Mock the API services
vi.mock('../../../../api', () => ({
    voucherService: {
        getAll: vi.fn(() => Promise.resolve({
            data: [
                { id: '1', doc_no: 'V001', doc_date: '2024-01-01', total_amount: 1000 }
            ]
        })),
        delete: vi.fn(() => Promise.resolve({ success: true }))
    },
    masterDataService: {
        getAccounts: vi.fn(() => Promise.resolve({ data: [{ account_code: '111', account_name: 'TM' }] })),
        getPartners: vi.fn(() => Promise.resolve({ data: [] })),
        getProducts: vi.fn(() => Promise.resolve({ data: [] }))
    },
    dimensionService: {
        getDimensions: vi.fn(() => Promise.resolve({ data: [] })),
        getConfigs: vi.fn(() => Promise.resolve({ data: [] }))
    }
}));

import { voucherService } from '../../../../api';

describe('useVouchers Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch vouchers on mount with default filters', async () => {
        const { result } = renderHook(() => useVouchers());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Initial call should have undefined for type 'ALL'
        expect(voucherService.getAll).toHaveBeenCalledWith(
            undefined,
            expect.any(String),
            expect.any(String)
        );
    });

    it('should update filters and refetch with correct params', async () => {
        const { result } = renderHook(() => useVouchers());

        await waitFor(() => expect(result.current.loading).toBe(false));
        vi.clearAllMocks();

        // Update filter to something else than 'ALL'
        result.current.setFilter({ type: 'RECEIPT' });

        await waitFor(() => {
            expect(result.current.filter.type).toBe('RECEIPT');
            expect(voucherService.getAll).toHaveBeenCalledWith(
                'RECEIPT',
                expect.any(String),
                expect.any(String)
            );
        });
    });

    it('should handle delete voucher and update local state', async () => {
        const { result } = renderHook(() => useVouchers());

        await waitFor(() => expect(result.current.vouchers.length).toBe(1));

        const deleted = await result.current.deleteVoucher('1');
        expect(deleted).toBe(true);

        await waitFor(() => {
            expect(result.current.vouchers.length).toBe(0);
        });
    });

    it('should handle API errors gracefully', async () => {
        vi.mocked(voucherService.getAll).mockRejectedValueOnce(new Error('Network Error'));

        const { result } = renderHook(() => useVouchers());

        await waitFor(() => {
            expect(result.current.error).toBe('Network Error');
            expect(result.current.vouchers).toEqual([]);
        });
    });
});
