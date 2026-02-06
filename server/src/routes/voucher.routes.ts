/**
 * Voucher Routes
 * API endpoints for voucher management
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { VoucherType } from '../types/database.types';
import { voucherRepository, VoucherFilter } from '../db/repositories';
import {
  verifyToken,
  sanitizeBody,
  validateVoucher,
  validateDateRange,
  validatePagination,
  asyncHandler,
  NotFoundError,
  ValidationError
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

/**
 * GET /api/vouchers
 * List vouchers with filters and pagination
 */
router.get(
  '/',
  verifyToken,
  validateDateRange,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters: VoucherFilter = {
      type: strOpt(req.query.type) as VoucherType | undefined,
      status: strOpt(req.query.status) as any,
      fromDate: strOpt(req.query.fromDate),
      toDate: strOpt(req.query.toDate),
      docNo: strOpt(req.query.docNo),
      search: strOpt(req.query.search)
    };

    const pageStr = strOpt(req.query.page);
    const pageSizeStr = strOpt(req.query.pageSize);

    const pagination = {
      page: pageStr ? parseInt(pageStr, 10) : 1,
      pageSize: pageSizeStr ? parseInt(pageSizeStr, 10) : 20
    };

    const result = await voucherRepository.findWithFilters(filters, pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * GET /api/vouchers/next-doc-no/:type
 * Get next document number for a voucher type
 * NOTE: This must be defined BEFORE /:id to avoid conflicts
 */
router.get(
  '/next-doc-no/:type',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type } = req.params;
    const prefix = strOpt(req.query.prefix);

    const nextDocNo = await voucherRepository.getNextDocNo(
      type as VoucherType,
      prefix
    );

    res.json({
      success: true,
      data: { doc_no: nextDocNo }
    });
  })
);

/**
 * GET /api/vouchers/:id
 * Get single voucher with items
 */
router.get(
  '/:id',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = str(req.params.id);

    const voucher = await voucherRepository.findByIdWithItems(id);

    if (!voucher) {
      throw new NotFoundError('Voucher');
    }

    res.json({
      success: true,
      data: voucher
    });
  })
);

/**
 * POST /api/vouchers
 * Create or update voucher
 */
router.post(
  '/',
  verifyToken,
  sanitizeBody,
  validateVoucher,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      id,
      doc_no,
      doc_date,
      post_date,
      description,
      type,
      ref_no,
      attachments,
      currency,
      fx_rate,
      items
    } = req.body;

    // Check if updating existing voucher
    if (id) {
      const existing = await voucherRepository.findById(id);

      if (!existing) {
        throw new NotFoundError('Voucher');
      }

      if (existing.status === 'POSTED') {
        throw new ValidationError('Cannot edit posted voucher');
      }

      const updated = await voucherRepository.updateWithItems(
        id,
        {
          doc_no,
          doc_date,
          post_date,
          description,
          type,
          ref_no,
          attachments,
          currency: currency || 'VND',
          fx_rate: fx_rate || 1
        },
        items
      );

      res.json({
        success: true,
        data: updated,
        message: 'Voucher updated successfully'
      });
      return;
    }

    // Check for duplicate doc_no
    if (doc_no) {
      const existingDocNo = await voucherRepository.findByDocNo(doc_no);
      if (existingDocNo) {
        throw new ValidationError(`Document number ${doc_no} already exists`);
      }
    }

    // Generate doc_no if not provided
    const finalDocNo = doc_no || await voucherRepository.getNextDocNo(type);

    // Create new voucher
    const created = await voucherRepository.createWithItems(
      {
        doc_no: finalDocNo,
        doc_date,
        post_date,
        description,
        type,
        ref_no,
        attachments: attachments || 0,
        currency: currency || 'VND',
        fx_rate: fx_rate || 1,
        total_amount: 0,
        status: 'DRAFT'
      },
      items
    );

    res.status(201).json({
      success: true,
      data: created,
      message: 'Voucher created successfully'
    });
  })
);

/**
 * POST /api/vouchers/:id/post
 * Post voucher to general ledger
 */
router.post(
  '/:id/post',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = str(req.params.id);

    const voucher = await voucherRepository.findById(id);

    if (!voucher) {
      throw new NotFoundError('Voucher');
    }

    if (voucher.status === 'POSTED') {
      throw new ValidationError('Voucher is already posted');
    }

    if (voucher.status === 'VOIDED') {
      throw new ValidationError('Cannot post voided voucher');
    }

    await voucherRepository.postToGeneralLedger(id);

    const updated = await voucherRepository.findByIdWithItems(id);

    res.json({
      success: true,
      data: updated,
      message: 'Voucher posted to general ledger successfully'
    });
  })
);

/**
 * POST /api/vouchers/:id/void
 * Void a posted voucher
 */
router.post(
  '/:id/void',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = str(req.params.id);

    const voucher = await voucherRepository.findById(id);

    if (!voucher) {
      throw new NotFoundError('Voucher');
    }

    if (voucher.status === 'VOIDED') {
      throw new ValidationError('Voucher is already voided');
    }

    await voucherRepository.voidVoucher(id);

    const updated = await voucherRepository.findByIdWithItems(id);

    res.json({
      success: true,
      data: updated,
      message: 'Voucher voided successfully'
    });
  })
);

/**
 * POST /api/vouchers/:id/duplicate
 * Duplicate a voucher
 */
router.post(
  '/:id/duplicate',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = str(req.params.id);
    const { doc_no } = req.body;

    const original = await voucherRepository.findById(id);

    if (!original) {
      throw new NotFoundError('Voucher');
    }

    // Generate new doc_no if not provided
    const newDocNo = doc_no || await voucherRepository.getNextDocNo(original.type);

    // Check for duplicate doc_no
    const existingDocNo = await voucherRepository.findByDocNo(newDocNo);
    if (existingDocNo) {
      throw new ValidationError(`Document number ${newDocNo} already exists`);
    }

    const duplicated = await voucherRepository.duplicate(id, newDocNo);

    res.status(201).json({
      success: true,
      data: duplicated,
      message: 'Voucher duplicated successfully'
    });
  })
);

/**
 * DELETE /api/vouchers/:id
 * Delete a voucher
 */
router.delete(
  '/:id',
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = str(req.params.id);

    const voucher = await voucherRepository.findById(id);

    if (!voucher) {
      throw new NotFoundError('Voucher');
    }

    if (voucher.status === 'POSTED') {
      throw new ValidationError('Cannot delete posted voucher. Void it first.');
    }

    await voucherRepository.deleteWithItems(id);

    res.json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  })
);

export default router;
