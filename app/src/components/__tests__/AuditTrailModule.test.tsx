import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { AuditTrailModule } from '../AuditTrailModule';
import { auditService } from '../../api';

// Mock api
vi.mock('../../api', () => ({
    auditService: {
        getAuditTrail: vi.fn(),
        getAnomalies: vi.fn(),
        getStatistics: vi.fn(),
        getReconciliations: vi.fn(),
        runAnomalyDetection: vi.fn(),
        exportAuditTrail: vi.fn(),
    },
}));

describe('AuditTrailModule', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (auditService.getAuditTrail as any).mockResolvedValue({
            data: {
                data: [
                    {
                        id: 'AUD_1',
                        entity_type: 'VOUCHER',
                        action: 'CREATE',
                        username: 'admin',
                        created_at: '2023-01-01T10:00:00Z',
                        doc_no: 'PC001',
                        amount: 1000000,
                        changed_fields: ['amount'],
                    },
                ],
            },
        });
        (auditService.getAnomalies as any).mockResolvedValue({
            data: {
                data: [],
            },
        });
        (auditService.getStatistics as any).mockResolvedValue({
            data: {
                actionCounts: [],
                userActivity: [],
                anomalySummary: [],
                openAnomalies: 0,
                recentActivity: [],
            },
        });
    });

    test('renders audit trail tab by default', async () => {
        render(<AuditTrailModule />);

        const elements = screen.getAllByText('Dấu vết Kiểm toán');
        expect(elements.length).toBeGreaterThan(0);
        expect(elements[0]).toBeInTheDocument();
        expect(screen.getByText('Thời gian')).toBeInTheDocument(); // Table header

        await waitFor(() => {
            expect(auditService.getAuditTrail).toHaveBeenCalled();
            expect(screen.getByText('PC001')).toBeInTheDocument();
        });
    });

    test('switches to anomalies tab', async () => {
        render(<AuditTrailModule />);

        const anomaliesTab = screen.getByText('Bất thường');
        fireEvent.click(anomaliesTab);

        await waitFor(() => {
            expect(auditService.getAnomalies).toHaveBeenCalled();
            expect(screen.getByText('Chạy kiểm tra')).toBeInTheDocument();
        });
    });

    test('switches to statistics tab', async () => {
        render(<AuditTrailModule />);

        const statsTab = screen.getByText('Thống kê');
        fireEvent.click(statsTab);

        await waitFor(() => {
            expect(auditService.getStatistics).toHaveBeenCalled();
            expect(screen.getByText('Tổng hành động')).toBeInTheDocument();
        });
    });
    test('switches to reconciliation tab and loads data', async () => {
        (auditService.getReconciliations as any).mockResolvedValue({
            data: [
                {
                    id: 'REC_1',
                    recon_type: 'BANK',
                    fiscal_year: 2023,
                    fiscal_period: 1,
                    account_code: '1121',
                    book_balance: 1000000,
                    external_balance: 1000000,
                    difference: 0,
                    status: 'DRAFT',
                    created_at: '2023-01-01T10:00:00Z',
                }
            ]
        });

        render(<AuditTrailModule />);

        const reconTab = screen.getByText('Đối chiếu');
        fireEvent.click(reconTab);

        await waitFor(() => {
            expect(auditService.getReconciliations).toHaveBeenCalled();
            expect(screen.getByText('Danh sách Biên bản Đối chiếu')).toBeInTheDocument();
            expect(screen.getByText('1121')).toBeInTheDocument();
        });
    });
});
