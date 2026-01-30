import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from '../Dashboard';

// Mock API services
vi.mock('../../api', () => ({
    reminderService: {
        getReminders: vi.fn(() => Promise.resolve({
            data: [
                { id: 'r1', type: 'critical', title: 'Công nợ quá hạn', message: '3 khách hàng' }
            ]
        })),
        getStats: vi.fn(() => Promise.resolve({
            data: {
                cash: 1000000000,
                fund_allocated: 5000000000,
                fund_spent: 2000000000,
                fund_remaining: 3000000000,
                budget_allocated: 10000000000,
                budget_spent: 4000000000,
                infrastructure_count: 5,
                infrastructure_value: 500000000,
                history: { labels: ['T1', 'T2', 'T3'], thu: [100, 200, 300], chi: [80, 150, 250], cash_flow: [20, 50, 50] }
            }
        })),
        getOverdueDetail: vi.fn(() => Promise.resolve({
            data: [
                { id: 'o1', invoice_no: 'INV001', partner_name: 'ABC Corp', due_date: '2024-01-01', amount: 50000000, days_overdue: 30 }
            ]
        })),
        getIncompleteDetail: vi.fn(() => Promise.resolve({ data: [] }))
    },
    auditService: {
        healthCheck: vi.fn(() => Promise.resolve({ data: { score: 85, anomalies: [{ message: 'Issue 1' }] } }))
    }
}));

// Mock MiniCharts components
vi.mock('../MiniCharts', () => ({
    TrendLineChart: () => <div data-testid="trend-line-chart">TrendLineChart</div>,
    SparkBarChart: () => <div data-testid="spark-bar-chart">SparkBarChart</div>,
    CompactRadialGauge: ({ score }: { score: number }) => <div data-testid="radial-gauge">{score}</div>
}));

// Mock SmartTable
vi.mock('../SmartTable', () => ({
    SmartTable: ({ data }: { data: any[] }) => <div data-testid="smart-table">{data.length} rows</div>
}));

describe('Dashboard Component', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders main dashboard with stats cards', async () => {
        render(<Dashboard onNavigate={mockNavigate} />);

        // Wait for loading to complete
        await waitFor(() => {
            expect(screen.getByText(/Bàn làm việc/i)).toBeInTheDocument();
        });

        // Check stats cards are rendered
        await waitFor(() => {
            expect(screen.getByText(/1 T/)).toBeInTheDocument(); // 1 tỷ (compact)
        });
    });

    it('renders quick access buttons and triggers navigation', async () => {
        render(<Dashboard onNavigate={mockNavigate} />);

        await waitFor(() => expect(screen.getByText(/Truy cập nhanh/i)).toBeInTheDocument());

        const voucherBtn = screen.getByText(/Nhập chứng từ/i);
        fireEvent.click(voucherBtn);

        expect(mockNavigate).toHaveBeenCalledWith('voucher');
    });

    it('renders reminders list from API', async () => {
        render(<Dashboard onNavigate={mockNavigate} />);

        await waitFor(() => {
            expect(screen.getByText(/Công nợ quá hạn/i)).toBeInTheDocument();
            expect(screen.getByText(/3 khách hàng/i)).toBeInTheDocument();
        });
    });

    it('renders health score gauge', async () => {
        render(<Dashboard onNavigate={mockNavigate} />);

        await waitFor(() => {
            expect(screen.getByTestId('radial-gauge')).toHaveTextContent('85');
        });
    });

    it('renders overdue_inv subView correctly', async () => {
        render(<Dashboard subView="overdue_inv" onNavigate={mockNavigate} />);

        await waitFor(() => {
            expect(screen.getByText(/Chi tiết Hóa đơn Quá hạn/i)).toBeInTheDocument();
            expect(screen.getByTestId('smart-table')).toHaveTextContent('1 rows');
        });
    });

    it('renders incomplete_docs subView correctly', async () => {
        render(<Dashboard subView="incomplete_docs" onNavigate={mockNavigate} />);

        await waitFor(() => {
            expect(screen.getByText(/Chứng từ lỗi/i)).toBeInTheDocument();
        });
    });

    it('displays charts with history data', async () => {
        render(<Dashboard onNavigate={mockNavigate} />);

        await waitFor(() => {
            expect(screen.getByText(/Doanh thu & Chi phí/i)).toBeInTheDocument();
            expect(screen.getByTestId('spark-bar-chart')).toBeInTheDocument();
        });
    });
});
