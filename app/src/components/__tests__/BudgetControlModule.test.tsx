import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { BudgetControlModule } from '../BudgetControlModule';
import { budgetControlService, masterDataService } from '../../api';

// Mock api
vi.mock('../../api', () => ({
    budgetControlService: {
        getDashboard: vi.fn(),
        getPeriods: vi.fn(),
        getAuthorizations: vi.fn(),
        getAlerts: vi.fn(),
    },
    masterDataService: {
        getFundSources: vi.fn(),
    },
}));

describe('BudgetControlModule', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (budgetControlService.getDashboard as any).mockResolvedValue({
            data: {
                budgetSummary: { total_allocated: 1000, total_spent: 500, total_available: 500 },
                utilizationPercent: 50,
                pendingAuthorizations: 2,
                alertsBySeverity: [],
                overBudgetItems: [],
                periodStatus: [],
            },
        });
        (budgetControlService.getPeriods as any).mockResolvedValue({
            data: { periods: [] },
        });
        (budgetControlService.getAuthorizations as any).mockResolvedValue({
            data: [],
        });
        (budgetControlService.getAlerts as any).mockResolvedValue({
            data: { alerts: [] },
        });
        (masterDataService.getFundSources as any).mockResolvedValue({
            data: [],
        });
    });

    test('renders dashboard tab by default', async () => {
        render(<BudgetControlModule />);

        expect(screen.getByText('Tổng quan')).toBeInTheDocument();

        await waitFor(() => {
            expect(budgetControlService.getDashboard).toHaveBeenCalled();
            expect(screen.getByText('Tổng dự toán (VND)')).toBeInTheDocument();
            expect(screen.getByText('1.000')).toBeInTheDocument(); // Formatted number
        });
    });

    test('switches to periods tab', async () => {
        render(<BudgetControlModule />);

        const periodsTab = screen.getByText('Kỳ ngân sách');
        fireEvent.click(periodsTab);

        await waitFor(() => {
            expect(budgetControlService.getPeriods).toHaveBeenCalled();
            expect(screen.getByText('Ngưỡng cảnh báo')).toBeInTheDocument();
        });
    });
    test('switches to authorizations tab', async () => {
        (budgetControlService.getAuthorizations as any).mockResolvedValue({
            data: [
                {
                    id: 'AUTH_1',
                    request_type: 'SPENDING',
                    request_date: '2023-01-01',
                    requested_by: 'User A',
                    requested_amount: 500000,
                    budget_available: 1000000,
                    status: 'PENDING',
                    purpose: 'Test Request'
                }
            ]
        });

        render(<BudgetControlModule />);

        const authTab = screen.getByText('Phê duyệt chi');
        fireEvent.click(authTab);

        await waitFor(() => {
            expect(budgetControlService.getAuthorizations).toHaveBeenCalled();
            expect(screen.getByText('User A')).toBeInTheDocument();
            // Check for amount with flexible matching for locale
            const amounts = screen.getAllByText((content, element) => {
                return element?.tagName.toLowerCase() === 'td' && (content.includes('500.000') || content.includes('500,000'));
            });
            expect(amounts.length).toBeGreaterThan(0);
        });
    });

    test('switches to alerts tab', async () => {
        (budgetControlService.getAlerts as any).mockResolvedValue({
            data: {
                alerts: [
                    {
                        id: 'ALERT_1',
                        message: 'Budget exceeded',
                        severity: 'HIGH',
                        created_at: '2023-01-01',
                        alert_type: 'OVER_BUDGET',
                        status: 'OPEN'
                    }
                ]
            }
        });

        render(<BudgetControlModule />);

        const alertsTab = screen.getByText('Cảnh báo');
        fireEvent.click(alertsTab);

        await waitFor(() => {
            expect(budgetControlService.getAlerts).toHaveBeenCalled();
            expect(screen.getByText('Budget exceeded')).toBeInTheDocument();
        });
    });
});
