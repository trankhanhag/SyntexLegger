/**
 * Report Routes - TypeScript Version
 * Demonstrates how to migrate routes from JavaScript to TypeScript
 *
 * This file uses:
 * - Type-safe request/response handlers
 * - Service layer for business logic
 * - Knex for database queries
 * - Proper error handling
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Knex } from 'knex';
import { reportService, TrialBalanceReport, GeneralLedgerReport } from '../services';

// Type definitions for request query parameters
interface DateRangeQuery {
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
}

interface GeneralLedgerQuery extends DateRangeQuery {
  account_code?: string;
}

interface BalanceVerificationQuery extends DateRangeQuery {
  period?: string; // Format: YYYY-MM
}

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

/**
 * Create report routes
 * @param knex - Knex database instance
 * @param verifyToken - Authentication middleware
 */
export function createReportRoutes(
  knex: Knex,
  verifyToken: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  /**
   * GET /api/reports/trial-balance
   * Bảng cân đối phát sinh
   */
  router.get(
    '/reports/trial-balance',
    verifyToken,
    async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response) => {
      try {
        const fromDate = req.query.fromDate || `${new Date().getFullYear()}-01-01`;
        const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

        const report = await reportService.generateTrialBalance(fromDate, toDate);
        res.json(report);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * GET /api/reports/general-ledger
   * Sổ cái (Chi tiết theo tài khoản)
   */
  router.get(
    '/reports/general-ledger',
    verifyToken,
    async (req: Request<{}, {}, {}, GeneralLedgerQuery>, res: Response) => {
      try {
        const fromDate = req.query.from || req.query.fromDate || '2024-01-01';
        const toDate = req.query.to || req.query.toDate || '2024-12-31';
        const accountCode = req.query.account_code || '';

        if (!accountCode) {
          res.status(400).json({ error: 'account_code is required' });
          return;
        }

        const report = await reportService.generateGeneralLedger(accountCode, fromDate, toDate);
        res.json(report);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * GET /api/reports/cash-book
   * Sổ quỹ tiền mặt
   */
  router.get(
    '/reports/cash-book',
    verifyToken,
    async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response) => {
      try {
        const fromDate = req.query.fromDate || req.query.from || '2024-01-01';
        const toDate = req.query.toDate || req.query.to || '2024-12-31';

        // Use knex directly for this specific report
        const balanceResult = await knex('general_ledger')
          .whereRaw("(account_code LIKE '111%' OR account_code LIKE '112%')")
          .where('trx_date', '<', fromDate)
          .sum('debit_amount as debit')
          .sum('credit_amount as credit')
          .first();

        let currentBalance = (balanceResult?.debit || 0) - (balanceResult?.credit || 0);
        const openingBalance = currentBalance;

        const transactions = await knex('general_ledger')
          .whereRaw("(account_code LIKE '111%' OR account_code LIKE '112%')")
          .where('trx_date', '>=', fromDate)
          .where('trx_date', '<=', toDate)
          .orderBy('trx_date', 'asc');

        const report = transactions.map((r: any) => {
          const amount = r.debit_amount > 0 ? r.debit_amount : -r.credit_amount;
          currentBalance += amount;
          return {
            id: r.id,
            date: r.trx_date,
            booking_no: r.doc_no,
            description: r.description,
            account: r.reciprocal_acc,
            cash_in: r.debit_amount,
            cash_out: r.credit_amount,
            balance: currentBalance
          };
        });

        // Add opening line
        report.unshift({
          id: 'opening',
          date: fromDate,
          booking_no: '',
          description: 'Số dư đầu kỳ',
          account: '',
          cash_in: 0,
          cash_out: 0,
          balance: openingBalance
        });

        res.json(report);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * GET /api/reports/balance-verification
   * Kiểm tra cân đối Nợ = Có theo kỳ
   */
  router.get(
    '/reports/balance-verification',
    verifyToken,
    async (req: Request<{}, {}, {}, BalanceVerificationQuery>, res: Response) => {
      try {
        const { fromDate, toDate, period } = req.query;

        // Build date conditions
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (period) {
          const [year, month] = period.split('-').map(Number);
          startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          endDate = new Date(year, month, 0).toISOString().split('T')[0];
        } else if (fromDate && toDate) {
          startDate = fromDate;
          endDate = toDate;
        }

        // Query overall balance
        let overallQuery = knex('general_ledger')
          .whereRaw("account_code NOT LIKE '0%'")
          .sum('debit_amount as total_debit')
          .sum('credit_amount as total_credit')
          .count('* as entry_count')
          .first();

        if (startDate && endDate) {
          overallQuery = overallQuery
            .where('trx_date', '>=', startDate)
            .where('trx_date', '<=', endDate);
        }

        const overall = await overallQuery;
        const totalDebit = Number(overall?.total_debit) || 0;
        const totalCredit = Number(overall?.total_credit) || 0;
        const difference = totalDebit - totalCredit;
        const isBalanced = Math.abs(difference) <= 0.01;

        // Query unbalanced vouchers
        let unbalancedQuery = knex('general_ledger')
          .select('doc_no')
          .min('trx_date as doc_date')
          .sum('debit_amount as total_debit')
          .sum('credit_amount as total_credit')
          .whereRaw("account_code NOT LIKE '0%'")
          .groupBy('doc_no')
          .havingRaw('ABS(SUM(debit_amount) - SUM(credit_amount)) > 0.01')
          .orderByRaw('ABS(SUM(debit_amount) - SUM(credit_amount)) DESC');

        if (startDate && endDate) {
          unbalancedQuery = unbalancedQuery
            .where('trx_date', '>=', startDate)
            .where('trx_date', '<=', endDate);
        }

        const unbalancedVouchers = await unbalancedQuery;

        // Query off-balance sheet
        let offBalanceQuery = knex('general_ledger')
          .select('account_code')
          .sum('debit_amount as total_debit')
          .sum('credit_amount as total_credit')
          .count('* as entry_count')
          .whereRaw("account_code LIKE '0%'")
          .groupBy('account_code')
          .orderBy('account_code');

        if (startDate && endDate) {
          offBalanceQuery = offBalanceQuery
            .where('trx_date', '>=', startDate)
            .where('trx_date', '<=', endDate);
        }

        const offBalanceSheet = await offBalanceQuery;

        res.json({
          period: period || `${fromDate || 'all'} - ${toDate || 'all'}`,
          summary: {
            is_balanced: isBalanced,
            total_debit: totalDebit,
            total_credit: totalCredit,
            difference: difference,
            entry_count: overall?.entry_count || 0,
            status: isBalanced ? 'CÂN ĐỐI' : 'KHÔNG CÂN ĐỐI',
            message: isBalanced
              ? 'Tổng phát sinh Nợ = Tổng phát sinh Có (TK trong bảng)'
              : `Chênh lệch: ${Math.abs(difference).toLocaleString('vi-VN')} VNĐ`
          },
          unbalanced_vouchers: unbalancedVouchers.map((v: any) => ({
            ...v,
            difference: Math.abs(v.total_debit - v.total_credit)
          })),
          off_balance_sheet: {
            note: 'Tài khoản ngoài bảng (TK bắt đầu bằng 0) - Ghi đơn, không áp dụng nguyên tắc Nợ = Có',
            accounts: offBalanceSheet
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    }
  );

  return router;
}

export default createReportRoutes;
