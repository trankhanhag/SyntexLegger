/**
 * Unit Tests for Zod Validation Schemas
 * Tests API request validation
 */

import { describe, it, expect } from '@jest/globals';
import {
    paginationSchema,
    dateRangeSchema,
    idParamSchema,
    voucherItemSchema,
    createVoucherSchema,
    updateVoucherSchema,
    voucherFilterSchema,
    createAccountSchema,
    updateAccountSchema,
    createPartnerSchema,
    updatePartnerSchema,
    loginSchema,
    createUserSchema,
    changePasswordSchema,
    createBackupSchema,
    restoreBackupSchema,
} from '../../../src/validation/schemas';

describe('Validation Schemas', () => {
    describe('paginationSchema', () => {
        it('should accept valid pagination params', () => {
            const result = paginationSchema.safeParse({ page: 1, pageSize: 20 });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.page).toBe(1);
                expect(result.data.pageSize).toBe(20);
            }
        });

        it('should coerce string numbers', () => {
            const result = paginationSchema.safeParse({ page: '2', pageSize: '10' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.page).toBe(2);
                expect(result.data.pageSize).toBe(10);
            }
        });

        it('should use defaults when not provided', () => {
            const result = paginationSchema.safeParse({});
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.page).toBe(1);
                expect(result.data.pageSize).toBe(20);
            }
        });

        it('should reject negative page', () => {
            const result = paginationSchema.safeParse({ page: -1 });
            expect(result.success).toBe(false);
        });

        it('should reject pageSize over 100', () => {
            const result = paginationSchema.safeParse({ pageSize: 101 });
            expect(result.success).toBe(false);
        });
    });

    describe('dateRangeSchema', () => {
        it('should accept valid date range', () => {
            const result = dateRangeSchema.safeParse({
                fromDate: '2024-01-01',
                toDate: '2024-12-31',
            });
            expect(result.success).toBe(true);
        });

        it('should accept empty dates', () => {
            const result = dateRangeSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it('should reject invalid date format', () => {
            const result = dateRangeSchema.safeParse({ fromDate: '01-01-2024' });
            expect(result.success).toBe(false);
        });

        it('should reject invalid date format (DD/MM/YYYY)', () => {
            const result = dateRangeSchema.safeParse({ fromDate: '01/01/2024' });
            expect(result.success).toBe(false);
        });
    });

    describe('idParamSchema', () => {
        it('should accept valid UUID', () => {
            const result = idParamSchema.safeParse({
                id: '550e8400-e29b-41d4-a716-446655440000',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid UUID', () => {
            const result = idParamSchema.safeParse({ id: 'invalid-id' });
            expect(result.success).toBe(false);
        });
    });

    describe('voucherItemSchema', () => {
        it('should accept valid voucher item', () => {
            const result = voucherItemSchema.safeParse({
                debit_acc: '111',
                credit_acc: '331',
                amount: 1000000,
                description: 'Test item',
            });
            expect(result.success).toBe(true);
        });

        it('should accept item with only amount', () => {
            const result = voucherItemSchema.safeParse({ amount: 500000 });
            expect(result.success).toBe(true);
        });

        it('should reject negative amount', () => {
            const result = voucherItemSchema.safeParse({ amount: -1000 });
            expect(result.success).toBe(false);
        });

        it('should coerce string amount', () => {
            const result = voucherItemSchema.safeParse({ amount: '1000000' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.amount).toBe(1000000);
            }
        });
    });

    describe('createVoucherSchema', () => {
        const validVoucher = {
            doc_no: 'PC-2024-001',
            doc_date: '2024-01-15',
            type: 'CASH_PAYMENT',
            description: 'Test voucher',
            items: [{ debit_acc: '111', credit_acc: '331', amount: 1000000 }],
        };

        it('should accept valid voucher', () => {
            const result = createVoucherSchema.safeParse(validVoucher);
            expect(result.success).toBe(true);
        });

        it('should reject empty doc_no', () => {
            const result = createVoucherSchema.safeParse({
                ...validVoucher,
                doc_no: '',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Số chứng từ');
            }
        });

        it('should reject invalid date format', () => {
            const result = createVoucherSchema.safeParse({
                ...validVoucher,
                doc_date: '15-01-2024',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid voucher type', () => {
            const result = createVoucherSchema.safeParse({
                ...validVoucher,
                type: 'INVALID',
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty items array', () => {
            const result = createVoucherSchema.safeParse({
                ...validVoucher,
                items: [],
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('1 dòng');
            }
        });

        it('should accept multiple items', () => {
            const result = createVoucherSchema.safeParse({
                ...validVoucher,
                items: [
                    { debit_acc: '111', amount: 1000000 },
                    { credit_acc: '331', amount: 1000000 },
                ],
            });
            expect(result.success).toBe(true);
        });
    });

    describe('updateVoucherSchema', () => {
        it('should accept partial update', () => {
            const result = updateVoucherSchema.safeParse({
                description: 'Updated description',
            });
            expect(result.success).toBe(true);
        });

        it('should accept empty object', () => {
            const result = updateVoucherSchema.safeParse({});
            expect(result.success).toBe(true);
        });
    });

    describe('createAccountSchema', () => {
        const validAccount = {
            account_code: '1111',
            account_name: 'Tiền mặt VND',
            category: 'ASSET',
        };

        it('should accept valid account', () => {
            const result = createAccountSchema.safeParse(validAccount);
            expect(result.success).toBe(true);
        });

        it('should reject non-numeric account code', () => {
            const result = createAccountSchema.safeParse({
                ...validAccount,
                account_code: 'ABC123',
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty account name', () => {
            const result = createAccountSchema.safeParse({
                ...validAccount,
                account_name: '',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid category', () => {
            const result = createAccountSchema.safeParse({
                ...validAccount,
                category: 'INVALID',
            });
            expect(result.success).toBe(false);
        });

        it('should default is_detail to 1', () => {
            const result = createAccountSchema.safeParse(validAccount);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.is_detail).toBe(1);
            }
        });

        it('should accept optional parent_code', () => {
            const result = createAccountSchema.safeParse({
                ...validAccount,
                parent_code: '111',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('createPartnerSchema', () => {
        const validPartner = {
            partner_code: 'KH001',
            partner_name: 'Khách hàng ABC',
            partner_type: 'CUSTOMER',
        };

        it('should accept valid partner', () => {
            const result = createPartnerSchema.safeParse(validPartner);
            expect(result.success).toBe(true);
        });

        it('should reject empty partner code', () => {
            const result = createPartnerSchema.safeParse({
                ...validPartner,
                partner_code: '',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid partner type', () => {
            const result = createPartnerSchema.safeParse({
                ...validPartner,
                partner_type: 'VENDOR',
            });
            expect(result.success).toBe(false);
        });

        it('should validate email format', () => {
            const result = createPartnerSchema.safeParse({
                ...validPartner,
                email: 'invalid-email',
            });
            expect(result.success).toBe(false);
        });

        it('should accept valid email', () => {
            const result = createPartnerSchema.safeParse({
                ...validPartner,
                email: 'test@example.com',
            });
            expect(result.success).toBe(true);
        });

        it('should accept empty email string', () => {
            const result = createPartnerSchema.safeParse({
                ...validPartner,
                email: '',
            });
            expect(result.success).toBe(true);
        });

        it('should accept all partner types', () => {
            const types = ['CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'OTHER'];
            types.forEach(type => {
                const result = createPartnerSchema.safeParse({
                    ...validPartner,
                    partner_type: type,
                });
                expect(result.success).toBe(true);
            });
        });
    });

    describe('loginSchema', () => {
        it('should accept valid credentials', () => {
            const result = loginSchema.safeParse({
                username: 'admin',
                password: 'password123',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty username', () => {
            const result = loginSchema.safeParse({
                username: '',
                password: 'password123',
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty password', () => {
            const result = loginSchema.safeParse({
                username: 'admin',
                password: '',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createUserSchema', () => {
        const validUser = {
            username: 'newuser',
            password: 'password123',
            role: 'user',
        };

        it('should accept valid user', () => {
            const result = createUserSchema.safeParse(validUser);
            expect(result.success).toBe(true);
        });

        it('should reject username less than 3 chars', () => {
            const result = createUserSchema.safeParse({
                ...validUser,
                username: 'ab',
            });
            expect(result.success).toBe(false);
        });

        it('should reject username with special chars', () => {
            const result = createUserSchema.safeParse({
                ...validUser,
                username: 'user@name',
            });
            expect(result.success).toBe(false);
        });

        it('should accept username with underscore', () => {
            const result = createUserSchema.safeParse({
                ...validUser,
                username: 'user_name',
            });
            expect(result.success).toBe(true);
        });

        it('should reject password less than 6 chars', () => {
            const result = createUserSchema.safeParse({
                ...validUser,
                password: '12345',
            });
            expect(result.success).toBe(false);
        });

        it('should default role to user', () => {
            const result = createUserSchema.safeParse({
                username: 'newuser',
                password: 'password123',
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.role).toBe('user');
            }
        });

        it('should accept all valid roles', () => {
            const roles = ['admin', 'user', 'viewer'];
            roles.forEach(role => {
                const result = createUserSchema.safeParse({
                    ...validUser,
                    role,
                });
                expect(result.success).toBe(true);
            });
        });
    });

    describe('changePasswordSchema', () => {
        it('should accept valid password change', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'oldpass',
                newPassword: 'newpass123',
            });
            expect(result.success).toBe(true);
        });

        it('should reject short new password', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'oldpass',
                newPassword: '12345',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createBackupSchema', () => {
        it('should accept manual backup', () => {
            const result = createBackupSchema.safeParse({
                type: 'MANUAL',
                description: 'Weekly backup',
            });
            expect(result.success).toBe(true);
        });

        it('should default type to MANUAL', () => {
            const result = createBackupSchema.safeParse({});
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.type).toBe('MANUAL');
            }
        });

        it('should reject password less than 6 chars', () => {
            const result = createBackupSchema.safeParse({
                password: '12345',
            });
            expect(result.success).toBe(false);
        });

        it('should accept all backup types', () => {
            const types = ['MANUAL', 'SCHEDULED', 'PRE_RESTORE'];
            types.forEach(type => {
                const result = createBackupSchema.safeParse({ type });
                expect(result.success).toBe(true);
            });
        });
    });

    describe('restoreBackupSchema', () => {
        it('should accept restore with password', () => {
            const result = restoreBackupSchema.safeParse({
                password: 'encryptionkey',
                createPreRestoreBackup: true,
            });
            expect(result.success).toBe(true);
        });

        it('should default createPreRestoreBackup to true', () => {
            const result = restoreBackupSchema.safeParse({});
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.createPreRestoreBackup).toBe(true);
            }
        });

        it('should accept without password', () => {
            const result = restoreBackupSchema.safeParse({
                createPreRestoreBackup: false,
            });
            expect(result.success).toBe(true);
        });
    });
});

describe('Vietnamese Error Messages', () => {
    it('should return Vietnamese error for empty doc_no', () => {
        const result = createVoucherSchema.safeParse({
            doc_no: '',
            doc_date: '2024-01-15',
            type: 'GENERAL',
            items: [{ amount: 1000 }],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const docNoError = result.error.issues.find(i => i.path.includes('doc_no'));
            expect(docNoError?.message).toContain('Số chứng từ');
        }
    });

    it('should return Vietnamese error for empty account code', () => {
        const result = createAccountSchema.safeParse({
            account_code: '',
            account_name: 'Test',
            category: 'ASSET',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const error = result.error.issues.find(i => i.path.includes('account_code'));
            expect(error?.message).toContain('Mã tài khoản');
        }
    });

    it('should return Vietnamese error for invalid email', () => {
        const result = createPartnerSchema.safeParse({
            partner_code: 'KH001',
            partner_name: 'Test',
            partner_type: 'CUSTOMER',
            email: 'invalid',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const error = result.error.issues.find(i => i.path.includes('email'));
            expect(error?.message).toContain('Email');
        }
    });
});
