import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { VoucherFilters, type VoucherFiltersProps } from '../VoucherFilters';

describe('VoucherFilters Component', () => {
    const defaultProps: VoucherFiltersProps = {
        filter: { type: 'ALL', fromDate: '2024-01-01', toDate: '2024-01-31', search: '' },
        onChange: vi.fn(),
        onRefresh: vi.fn(),
        loading: false
    };

    it('renders initial filter values correctly', () => {
        render(<VoucherFilters {...defaultProps} />);

        expect(screen.getByLabelText(/Loại chứng từ/i)).toHaveValue('ALL');
        // DateInput displays DD/MM/YYYY
        expect(screen.getByDisplayValue('01/01/2024')).toBeInTheDocument();
        expect(screen.getByDisplayValue('31/01/2024')).toBeInTheDocument();
    });

    it('calls onChange when voucher type is changed', async () => {
        const user = userEvent.setup();
        render(<VoucherFilters {...defaultProps} />);

        const select = screen.getByLabelText(/Loại chứng từ/i);
        await user.selectOptions(select, 'CASH_IN');

        expect(defaultProps.onChange).toHaveBeenCalledWith({ type: 'CASH_IN' });
    });

    it('calls onChange when search text is entered', async () => {
        const user = userEvent.setup();
        render(<VoucherFilters {...defaultProps} />);

        const input = screen.getByLabelText(/Tìm kiếm/i);
        await user.type(input, 'ABC');

        // userEvent.type triggers onChange for each character
        expect(defaultProps.onChange).toHaveBeenCalledWith({ search: 'A' });
    });

    it('calls onChange with correct dates when "Hôm nay" is clicked', async () => {
        const user = userEvent.setup();
        render(<VoucherFilters {...defaultProps} />);

        const today = new Date().toISOString().split('T')[0];
        const button = screen.getByText(/Hôm nay/i);
        await user.click(button);

        expect(defaultProps.onChange).toHaveBeenCalledWith({ fromDate: today, toDate: today });
    });

    it('calls onRefresh when refresh button is clicked', async () => {
        const user = userEvent.setup();
        render(<VoucherFilters {...defaultProps} />);

        const button = screen.getByRole('button', { name: /Làm mới/i });
        await user.click(button);

        expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('shows loading state on refresh button', () => {
        render(<VoucherFilters {...defaultProps} loading={true} />);

        const icon = screen.getByText('refresh');
        expect(icon).toHaveClass('animate-spin');
        expect(screen.getByRole('button', { name: /Làm mới/i })).toBeDisabled();
    });

    it('displays filter summary and clears filters correctly', async () => {
        const user = userEvent.setup();
        const activeFilter = { type: 'CASH_IN', search: 'Test' };
        render(<VoucherFilters {...defaultProps} filter={activeFilter} />);

        expect(screen.getByText(/Đang lọc:/i)).toBeInTheDocument();
        expect(screen.getByText('Phiếu thu tiền mặt')).toBeInTheDocument();
        expect(screen.getByText(/"Test"/i)).toBeInTheDocument();

        const clearButton = screen.getByText('close').closest('button');
        if (clearButton) await user.click(clearButton);

        expect(defaultProps.onChange).toHaveBeenCalledWith({ type: 'ALL', search: '' });
    });

    it('renders compact mode correctly', () => {
        render(<VoucherFilters {...defaultProps} compact={true} />);

        // Labels should not be present in compact mode
        expect(screen.queryByLabelText(/Loại chứng từ/i)).not.toBeInTheDocument();

        // But inputs should still be there
        expect(screen.getByRole('combobox')).toHaveValue('ALL');
    });
});
