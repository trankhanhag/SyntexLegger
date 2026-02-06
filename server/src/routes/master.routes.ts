/**
 * Master Data Routes
 * API endpoints for accounts, partners, and products
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { accountRepository, partnerRepository, AccountFilter, PartnerFilter } from '../db/repositories';
import {
  verifyToken,
  sanitizeBody,
  sanitizeQuery,
  validatePagination,
  asyncHandler,
  NotFoundError,
  ValidationError,
  ConflictError
} from '../middleware';

const router = Router();

// Helper to safely get string from query/params
const str = (val: unknown): string => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return '';
};

const strOpt = (val: unknown): string | undefined => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
};

// ============================================
// CHART OF ACCOUNTS
// ============================================

/**
 * GET /api/accounts
 * List all accounts with optional filters
 */
router.get(
  '/accounts',
  verifyToken,
  sanitizeQuery,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const category = strOpt(req.query.category);
    const search = strOpt(req.query.search);
    const parentCode = strOpt(req.query.parentCode);
    const isDetailStr = strOpt(req.query.isDetail);

    const filters: AccountFilter = {
      category,
      search,
      parentCode,
      isDetail: isDetailStr === 'true' ? true : isDetailStr === 'false' ? false : undefined
    };

    const accounts = await accountRepository.findWithFilters(filters);

    res.json({
      success: true,
      data: accounts
    });
  })
);

/**
 * GET /api/accounts/categories
 * Get all account categories
 */
router.get(
  '/accounts/categories',
  verifyToken,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const categories = await accountRepository.getCategories();

    res.json({
      success: true,
      data: categories
    });
  })
);

/**
 * GET /api/accounts/:code
 * Get single account by code
 */
router.get(
  '/accounts/:code',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);

    const account = await accountRepository.findByCode(code);

    if (!account) {
      throw new NotFoundError('Account');
    }

    res.json({
      success: true,
      data: account
    });
  })
);

/**
 * GET /api/accounts/:code/children
 * Get child accounts
 */
router.get(
  '/accounts/:code/children',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);

    const children = await accountRepository.findChildren(code);

    res.json({
      success: true,
      data: children
    });
  })
);

/**
 * GET /api/accounts/:code/balance
 * Get account balance for a period
 */
router.get(
  '/accounts/:code/balance',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);
    const fromDate = strOpt(req.query.fromDate);
    const toDate = strOpt(req.query.toDate);

    if (!fromDate || !toDate) {
      throw new ValidationError('fromDate and toDate are required');
    }

    const account = await accountRepository.findByCode(code);
    if (!account) {
      throw new NotFoundError('Account');
    }

    const balance = await accountRepository.getBalance(
      code,
      fromDate,
      toDate
    );

    res.json({
      success: true,
      data: {
        account_code: code,
        account_name: account.account_name,
        ...balance
      }
    });
  })
);

/**
 * GET /api/accounts/:code/ledger
 * Get ledger entries for an account
 */
router.get(
  '/accounts/:code/ledger',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);
    const fromDate = strOpt(req.query.fromDate);
    const toDate = strOpt(req.query.toDate);

    if (!fromDate || !toDate) {
      throw new ValidationError('fromDate and toDate are required');
    }

    const account = await accountRepository.findByCode(code);
    if (!account) {
      throw new NotFoundError('Account');
    }

    const entries = await accountRepository.getLedgerEntries(
      code,
      fromDate,
      toDate
    );

    res.json({
      success: true,
      data: {
        account,
        entries
      }
    });
  })
);

/**
 * POST /api/accounts
 * Create a new account
 */
router.post(
  '/accounts',
  verifyToken,
  sanitizeBody,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { account_code, account_name, category, parent_code, is_detail } = req.body;

    if (!account_code || !account_name || !category) {
      throw new ValidationError('account_code, account_name, and category are required');
    }

    try {
      const account = await accountRepository.createAccount({
        account_code,
        account_name,
        category,
        parent_code,
        is_detail: is_detail || 0
      });

      res.status(201).json({
        success: true,
        data: account,
        message: 'Account created successfully'
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw new ConflictError(error.message);
      }
      throw error;
    }
  })
);

/**
 * PUT /api/accounts/:code
 * Update an account
 */
router.put(
  '/accounts/:code',
  verifyToken,
  sanitizeBody,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);
    const { account_name, category, parent_code, is_detail } = req.body;

    const existing = await accountRepository.findByCode(code);
    if (!existing) {
      throw new NotFoundError('Account');
    }

    try {
      const account = await accountRepository.updateAccount(code, {
        account_name,
        category,
        parent_code,
        is_detail
      });

      res.json({
        success: true,
        data: account,
        message: 'Account updated successfully'
      });
    } catch (error: any) {
      if (error.message.includes('transactions')) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/accounts/:code
 * Delete an account
 */
router.delete(
  '/accounts/:code',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);

    try {
      const deleted = await accountRepository.deleteAccount(code);

      if (!deleted) {
        throw new NotFoundError('Account');
      }

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error: any) {
      if (error.message.includes('transactions') || error.message.includes('child')) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  })
);

// ============================================
// PARTNERS
// ============================================

/**
 * GET /api/partners
 * List partners with filters and pagination
 */
router.get(
  '/partners',
  verifyToken,
  sanitizeQuery,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const partnerType = strOpt(req.query.partnerType);
    const search = strOpt(req.query.search);
    const isActiveStr = strOpt(req.query.isActive);
    const pageStr = strOpt(req.query.page);
    const pageSizeStr = strOpt(req.query.pageSize);

    const filters: PartnerFilter = {
      partnerType,
      search,
      isActive: isActiveStr === 'true' ? true : isActiveStr === 'false' ? false : undefined
    };

    const pagination = {
      page: pageStr ? parseInt(pageStr, 10) : 1,
      pageSize: pageSizeStr ? parseInt(pageSizeStr, 10) : 20
    };

    const result = await partnerRepository.findWithFilters(filters, pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * GET /api/partners/types
 * Get all partner types
 */
router.get(
  '/partners/types',
  verifyToken,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const types = await partnerRepository.getPartnerTypes();

    res.json({
      success: true,
      data: types
    });
  })
);

/**
 * GET /api/partners/customers
 * Get all customers
 */
router.get(
  '/partners/customers',
  verifyToken,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const customers = await partnerRepository.findCustomers();

    res.json({
      success: true,
      data: customers
    });
  })
);

/**
 * GET /api/partners/suppliers
 * Get all suppliers
 */
router.get(
  '/partners/suppliers',
  verifyToken,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const suppliers = await partnerRepository.findSuppliers();

    res.json({
      success: true,
      data: suppliers
    });
  })
);

/**
 * GET /api/partners/balances
 * Get all partner balances
 */
router.get(
  '/partners/balances',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const asOfDate = strOpt(req.query.asOfDate);

    const balances = await partnerRepository.getAllBalances(asOfDate);

    res.json({
      success: true,
      data: balances
    });
  })
);

/**
 * GET /api/partners/:code
 * Get single partner by code
 */
router.get(
  '/partners/:code',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);

    const partner = await partnerRepository.findByCode(code);

    if (!partner) {
      throw new NotFoundError('Partner');
    }

    res.json({
      success: true,
      data: partner
    });
  })
);

/**
 * GET /api/partners/:code/balance
 * Get partner balance
 */
router.get(
  '/partners/:code/balance',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);
    const asOfDate = strOpt(req.query.asOfDate);

    const balance = await partnerRepository.getBalance(code, asOfDate);

    if (!balance) {
      throw new NotFoundError('Partner');
    }

    res.json({
      success: true,
      data: balance
    });
  })
);

/**
 * GET /api/partners/:code/transactions
 * Get partner transactions
 */
router.get(
  '/partners/:code/transactions',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);
    const fromDate = strOpt(req.query.fromDate);
    const toDate = strOpt(req.query.toDate);

    if (!fromDate || !toDate) {
      throw new ValidationError('fromDate and toDate are required');
    }

    const partner = await partnerRepository.findByCode(code);
    if (!partner) {
      throw new NotFoundError('Partner');
    }

    const transactions = await partnerRepository.getTransactions(
      code,
      fromDate,
      toDate
    );

    res.json({
      success: true,
      data: {
        partner,
        transactions
      }
    });
  })
);

/**
 * POST /api/partners
 * Create a new partner
 */
router.post(
  '/partners',
  verifyToken,
  sanitizeBody,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      partner_code,
      partner_name,
      tax_code,
      address,
      phone,
      email,
      contact_person,
      bank_account,
      bank_name,
      partner_type
    } = req.body;

    if (!partner_code || !partner_name) {
      throw new ValidationError('partner_code and partner_name are required');
    }

    try {
      const partner = await partnerRepository.createPartner({
        partner_code,
        partner_name,
        tax_code,
        address,
        phone,
        email,
        contact_person,
        bank_account,
        bank_name,
        partner_type: partner_type || 'OTHER'
      });

      res.status(201).json({
        success: true,
        data: partner,
        message: 'Partner created successfully'
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw new ConflictError(error.message);
      }
      throw error;
    }
  })
);

/**
 * PUT /api/partners/:code
 * Update a partner
 */
router.put(
  '/partners/:code',
  verifyToken,
  sanitizeBody,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);
    const updateData = req.body;

    const existing = await partnerRepository.findByCode(code);
    if (!existing) {
      throw new NotFoundError('Partner');
    }

    try {
      const partner = await partnerRepository.updatePartner(code, updateData);

      res.json({
        success: true,
        data: partner,
        message: 'Partner updated successfully'
      });
    } catch (error: any) {
      if (error.message.includes('transactions') || error.message.includes('already exists')) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/partners/:code
 * Delete a partner
 */
router.delete(
  '/partners/:code',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = str(req.params.code);

    try {
      const deleted = await partnerRepository.deletePartner(code);

      if (!deleted) {
        throw new NotFoundError('Partner');
      }

      res.json({
        success: true,
        message: 'Partner deleted successfully'
      });
    } catch (error: any) {
      if (error.message.includes('transactions')) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  })
);

export default router;
