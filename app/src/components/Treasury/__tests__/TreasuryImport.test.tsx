import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TreasuryImportModal } from '../TreasuryImportModal';
import { treasuryService } from '../../../api';

// Mock API
vi.mock('../../../api', () => ({
    treasuryService: {
        importTransactions: vi.fn(),
        saveImportedTransactions: vi.fn(),
    }
}));

describe('TreasuryImportModal', () => {
    const defaultProps = {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly with date inputs', () => {
        render(<TreasuryImportModal {...defaultProps} />);
        expect(screen.getByText('Nhận số liệu từ KBNN')).toBeInTheDocument();
        expect(screen.getByText('Từ ngày')).toBeInTheDocument();
        expect(screen.getByText('Đến ngày')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Kiểm tra dữ liệu/i })).toBeInTheDocument();
    });

    it('handles preview flow correctly', async () => {
        const mockTransactions = [
            { date: '2024-03-20', id: 'T1', description: 'Test TX', amount: 100000 }
        ];
        (treasuryService.importTransactions as any).mockResolvedValue({
            data: { transactions: mockTransactions }
        });

        render(<TreasuryImportModal {...defaultProps} />);

        // Input dates (defaults are today, good enough)

        // Click Preview
        fireEvent.click(screen.getByRole('button', { name: /Kiểm tra dữ liệu/i }));

        // Check Loading
        expect(screen.getByRole('button', { name: /Đang tải/i })).toBeInTheDocument();

        // Check Result
        await waitFor(() => {
            expect(screen.getByText('Tìm thấy 1 giao dịch:')).toBeInTheDocument();
            expect(screen.getByText('Test TX')).toBeInTheDocument();
        });

        // Check Buttons changed
        expect(screen.getByRole('button', { name: /Đồng bộ về hệ thống/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Quay lại/i })).toBeInTheDocument();
    });

    it('handles save flow correctly', async () => {
        // Setup Preview State
        const mockTransactions = [
            { date: '2024-03-20', id: 'T1', description: 'Test TX', amount: 100000 }
        ];
        (treasuryService.importTransactions as any).mockResolvedValue({
            data: { transactions: mockTransactions }
        });
        (treasuryService.saveImportedTransactions as any).mockResolvedValue({
            data: { success: true, data: { imported: 1 } }
        });

        render(<TreasuryImportModal {...defaultProps} />);

        // To Preview
        fireEvent.click(screen.getByRole('button', { name: /Kiểm tra dữ liệu/i }));
        await waitFor(() => screen.getByRole('button', { name: /Đồng bộ về hệ thống/i }));

        // Click Save
        fireEvent.click(screen.getByRole('button', { name: /Đồng bộ về hệ thống/i }));

        // Check Result
        await waitFor(() => {
            expect(screen.getByText('Đồng bộ thành công!')).toBeInTheDocument();
            expect(screen.getByText('Đã lưu 1 giao dịch vào hệ thống.')).toBeInTheDocument();
        });

        // Check Success Callback
        expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it('handles error during preview', async () => {
        (treasuryService.importTransactions as any).mockRejectedValue(new Error('API Fail'));

        // Mock alert (jsdom doesn't implement it)
        window.alert = vi.fn();

        render(<TreasuryImportModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /Kiểm tra dữ liệu/i }));

        await waitFor(() => {
            // Loading finished
            expect(screen.getByRole('button', { name: /Kiểm tra dữ liệu/i })).not.toBeDisabled();
        });

        // Error handling (simple alert in component)
        // Ideally checking alert called
        expect(window.alert).toHaveBeenCalledWith('Có lỗi xảy ra khi kết nối KBNN.');
    });
});
