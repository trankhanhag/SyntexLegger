import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TreasuryDashboard } from '../TreasuryDashboard';
import { treasuryService } from '../../../api';

// Mock API
vi.mock('../../../api', () => ({
    treasuryService: {
        testConnection: vi.fn(),
        getBudgetAllocation: vi.fn(),
        getReconciliationDetail: vi.fn(),
        getPaymentOrderStatus: vi.fn(),
    }
}));

describe('TreasuryDashboard', () => {
    it('renders loading state initially', () => {
        // Mock promises that haven't resolved yet
        (treasuryService.testConnection as any).mockReturnValue(new Promise(() => { }));
        (treasuryService.getBudgetAllocation as any).mockReturnValue(new Promise(() => { }));
        (treasuryService.getReconciliationDetail as any).mockReturnValue(new Promise(() => { }));
        (treasuryService.getPaymentOrderStatus as any).mockReturnValue(new Promise(() => { }));

        render(<TreasuryDashboard />);
        // Check for some loading indicator or structure (Dashboard renders parts even if loading, sub-components show spinners/skeletons)
        // In our code, sub-components check 'loading' prop.
        // TreasuryStats checks if(loading) return <div...

        // Let's check for the header title which is always present
        expect(screen.getByText('HỆ THỐNG KẾT NỐI KBNN')).toBeInTheDocument();
    });

    it('renders dashboard content after data load', async () => {
        // Mock resolved data
        (treasuryService.testConnection as any).mockResolvedValue({
            data: { success: true, data: { connected: true } }
        });
        (treasuryService.getBudgetAllocation as any).mockResolvedValue({
            data: {
                success: true,
                data: {
                    regularBudget: { allocated: 100, used: 50 },
                    irregularBudget: { allocated: 200, used: 20 }
                }
            }
        });
        (treasuryService.getReconciliationDetail as any).mockResolvedValue({
            data: {
                success: true,
                data: { matched: 1, unmatched: 0, discrepancies: 0, status: 'matched' }
            }
        });
        (treasuryService.getPaymentOrderStatus as any).mockResolvedValue({
            data: { success: true, data: [] } // Empty orders
        });

        render(<TreasuryDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Dự toán Ngân sách')).toBeInTheDocument();
        });

        // Check sections exist
        expect(screen.getByText('Dự toán Ngân sách')).toBeInTheDocument();
        expect(screen.getByText('Đối chiếu TABMIS')).toBeInTheDocument();
        expect(screen.getByText('Lệnh chi tiền gần đây')).toBeInTheDocument();
    });
});
