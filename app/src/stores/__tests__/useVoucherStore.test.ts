/**
 * Tests for useVoucherStore
 * Voucher form state management tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVoucherStore } from '../useVoucherStore';

describe('useVoucherStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useVoucherStore.getState().resetForm();
    });

    describe('Initial State', () => {
        it('should have correct initial voucher state', () => {
            const state = useVoucherStore.getState();

            expect(state.voucher.doc_type).toBe('GL');
            expect(state.voucher.doc_no).toBe('');
            expect(state.voucher.currency).toBe('VND');
            expect(state.voucher.exchange_rate).toBe(1);
            expect(state.voucher.status).toBe('DRAFT');
            expect(state.voucher.items).toEqual([]);
        });

        it('should have correct initial form state', () => {
            const state = useVoucherStore.getState();

            expect(state.isDirty).toBe(false);
            expect(state.isLoading).toBe(false);
            expect(state.isSaving).toBe(false);
            expect(state.errors).toEqual({});
            expect(state.mode).toBe('create');
        });
    });

    describe('Form Actions', () => {
        describe('setVoucher', () => {
            it('should update voucher fields', () => {
                const { setVoucher } = useVoucherStore.getState();

                setVoucher({ doc_no: 'TEST001', description: 'Test voucher' });

                const state = useVoucherStore.getState();
                expect(state.voucher.doc_no).toBe('TEST001');
                expect(state.voucher.description).toBe('Test voucher');
                expect(state.isDirty).toBe(true);
            });

            it('should preserve other fields when updating', () => {
                const { setVoucher } = useVoucherStore.getState();

                setVoucher({ doc_type: 'CA' });
                setVoucher({ doc_no: 'CA001' });

                const state = useVoucherStore.getState();
                expect(state.voucher.doc_type).toBe('CA');
                expect(state.voucher.doc_no).toBe('CA001');
            });
        });

        describe('setField', () => {
            it('should update single field', () => {
                const { setField } = useVoucherStore.getState();

                setField('doc_no', 'FIELD001');

                expect(useVoucherStore.getState().voucher.doc_no).toBe('FIELD001');
                expect(useVoucherStore.getState().isDirty).toBe(true);
            });
        });

        describe('resetForm', () => {
            it('should reset all form state', () => {
                const { setVoucher, addItem, resetForm } = useVoucherStore.getState();

                // Make some changes
                setVoucher({ doc_no: 'TEST', description: 'Test' });
                addItem({ account_code: '1111', debit_amount: 1000 });

                // Reset
                resetForm();

                const state = useVoucherStore.getState();
                expect(state.voucher.doc_no).toBe('');
                expect(state.voucher.description).toBe('');
                expect(state.voucher.items).toEqual([]);
                expect(state.isDirty).toBe(false);
                expect(state.mode).toBe('create');
            });
        });
    });

    describe('Item Actions', () => {
        describe('addItem', () => {
            it('should add empty item with next line number', () => {
                const { addItem } = useVoucherStore.getState();

                addItem();

                const state = useVoucherStore.getState();
                expect(state.voucher.items.length).toBe(1);
                expect(state.voucher.items[0].line_no).toBe(1);
                expect(state.voucher.items[0].account_code).toBe('');
                expect(state.voucher.items[0].debit_amount).toBe(0);
                expect(state.voucher.items[0].credit_amount).toBe(0);
            });

            it('should add item with provided data', () => {
                const { addItem } = useVoucherStore.getState();

                addItem({
                    account_code: '1111',
                    description: 'Cash',
                    debit_amount: 1000000,
                });

                const state = useVoucherStore.getState();
                expect(state.voucher.items[0].account_code).toBe('1111');
                expect(state.voucher.items[0].description).toBe('Cash');
                expect(state.voucher.items[0].debit_amount).toBe(1000000);
            });

            it('should increment line numbers', () => {
                const { addItem } = useVoucherStore.getState();

                addItem();
                addItem();
                addItem();

                const state = useVoucherStore.getState();
                expect(state.voucher.items[0].line_no).toBe(1);
                expect(state.voucher.items[1].line_no).toBe(2);
                expect(state.voucher.items[2].line_no).toBe(3);
            });
        });

        describe('updateItem', () => {
            it('should update item at specified index', () => {
                const { addItem, updateItem } = useVoucherStore.getState();

                addItem({ account_code: '1111' });
                updateItem(0, 'account_code', '1121');

                expect(useVoucherStore.getState().voucher.items[0].account_code).toBe('1121');
            });

            it('should update amount fields', () => {
                const { addItem, updateItem } = useVoucherStore.getState();

                addItem();
                updateItem(0, 'debit_amount', 5000000);

                expect(useVoucherStore.getState().voucher.items[0].debit_amount).toBe(5000000);
            });
        });

        describe('removeItem', () => {
            it('should remove item at specified index', () => {
                const { addItem, removeItem } = useVoucherStore.getState();

                addItem({ account_code: '1111' });
                addItem({ account_code: '1121' });
                addItem({ account_code: '3311' });

                removeItem(1);

                const state = useVoucherStore.getState();
                expect(state.voucher.items.length).toBe(2);
                expect(state.voucher.items[0].account_code).toBe('1111');
                expect(state.voucher.items[1].account_code).toBe('3311');
            });
        });

        describe('duplicateItem', () => {
            it('should duplicate item at specified index', () => {
                const { addItem, duplicateItem } = useVoucherStore.getState();

                addItem({
                    account_code: '1111',
                    description: 'Original',
                    debit_amount: 1000000,
                });

                duplicateItem(0);

                const state = useVoucherStore.getState();
                expect(state.voucher.items.length).toBe(2);
                expect(state.voucher.items[1].account_code).toBe('1111');
                expect(state.voucher.items[1].description).toBe('Original');
                expect(state.voucher.items[1].debit_amount).toBe(1000000);
                expect(state.voucher.items[1].line_no).toBe(2);
                expect(state.voucher.items[1].id).toBeUndefined(); // ID should be cleared
            });
        });

        describe('moveItem', () => {
            it('should move item and renumber lines', () => {
                const { addItem, moveItem } = useVoucherStore.getState();

                addItem({ account_code: '1111' });
                addItem({ account_code: '1121' });
                addItem({ account_code: '3311' });

                moveItem(2, 0);

                const state = useVoucherStore.getState();
                expect(state.voucher.items[0].account_code).toBe('3311');
                expect(state.voucher.items[0].line_no).toBe(1);
                expect(state.voucher.items[1].account_code).toBe('1111');
                expect(state.voucher.items[1].line_no).toBe(2);
                expect(state.voucher.items[2].account_code).toBe('1121');
                expect(state.voucher.items[2].line_no).toBe(3);
            });
        });

        describe('clearItems', () => {
            it('should remove all items', () => {
                const { addItem, clearItems } = useVoucherStore.getState();

                addItem({ account_code: '1111' });
                addItem({ account_code: '1121' });

                clearItems();

                expect(useVoucherStore.getState().voucher.items).toEqual([]);
            });
        });
    });

    describe('Computed Values', () => {
        describe('getTotalDebit', () => {
            it('should calculate total debit amount', () => {
                const { addItem, getTotalDebit } = useVoucherStore.getState();

                addItem({ debit_amount: 1000000 });
                addItem({ debit_amount: 2000000 });
                addItem({ credit_amount: 3000000 });

                expect(getTotalDebit()).toBe(3000000);
            });

            it('should return 0 for empty items', () => {
                expect(useVoucherStore.getState().getTotalDebit()).toBe(0);
            });
        });

        describe('getTotalCredit', () => {
            it('should calculate total credit amount', () => {
                const { addItem, getTotalCredit } = useVoucherStore.getState();

                addItem({ credit_amount: 1500000 });
                addItem({ credit_amount: 2500000 });
                addItem({ debit_amount: 4000000 });

                expect(getTotalCredit()).toBe(4000000);
            });
        });

        describe('getBalance', () => {
            it('should calculate balance (debit - credit)', () => {
                const { addItem, getBalance } = useVoucherStore.getState();

                addItem({ debit_amount: 5000000 });
                addItem({ credit_amount: 3000000 });

                expect(getBalance()).toBe(2000000);
            });
        });

        describe('isBalanced', () => {
            it('should return true when balanced', () => {
                const { addItem, isBalanced } = useVoucherStore.getState();

                addItem({ debit_amount: 1000000 });
                addItem({ credit_amount: 1000000 });

                expect(isBalanced()).toBe(true);
            });

            it('should return false when not balanced', () => {
                const { addItem, isBalanced } = useVoucherStore.getState();

                addItem({ debit_amount: 1000000 });
                addItem({ credit_amount: 500000 });

                expect(isBalanced()).toBe(false);
            });

            it('should handle floating point precision', () => {
                const { addItem, isBalanced } = useVoucherStore.getState();

                addItem({ debit_amount: 1000000.001 });
                addItem({ credit_amount: 1000000.009 });

                // Should be considered balanced (difference < 0.01)
                expect(isBalanced()).toBe(true);
            });
        });

        describe('getNextLineNo', () => {
            it('should return 1 for empty items', () => {
                expect(useVoucherStore.getState().getNextLineNo()).toBe(1);
            });

            it('should return max line_no + 1', () => {
                const { addItem } = useVoucherStore.getState();

                addItem();
                addItem();

                expect(useVoucherStore.getState().getNextLineNo()).toBe(3);
            });
        });
    });

    describe('Validation', () => {
        describe('validate', () => {
            it('should fail if doc_type is empty', () => {
                const { setVoucher, validate } = useVoucherStore.getState();

                setVoucher({ doc_type: '', doc_date: '2024-01-01', description: 'Test' });

                const isValid = validate();

                expect(isValid).toBe(false);
                expect(useVoucherStore.getState().errors.doc_type).toBeTruthy();
            });

            it('should fail if doc_date is empty', () => {
                const { setVoucher, validate } = useVoucherStore.getState();

                setVoucher({ doc_type: 'GL', doc_date: '', description: 'Test' });

                const isValid = validate();

                expect(isValid).toBe(false);
                expect(useVoucherStore.getState().errors.doc_date).toBeTruthy();
            });

            it('should fail if description is empty', () => {
                const { setVoucher, validate } = useVoucherStore.getState();

                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: '' });

                const isValid = validate();

                expect(isValid).toBe(false);
                expect(useVoucherStore.getState().errors.description).toBeTruthy();
            });

            it('should fail if no items', () => {
                const { setVoucher, validate } = useVoucherStore.getState();

                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'Test' });

                const isValid = validate();

                expect(isValid).toBe(false);
                expect(useVoucherStore.getState().errors.items).toBeTruthy();
            });

            it('should fail if not balanced', () => {
                const { setVoucher, addItem, validate } = useVoucherStore.getState();

                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'Test' });
                addItem({ account_code: '1111', debit_amount: 1000000 });
                addItem({ account_code: '3311', credit_amount: 500000 });

                const isValid = validate();

                expect(isValid).toBe(false);
                expect(useVoucherStore.getState().errors.balance).toBeTruthy();
            });

            it('should pass with valid balanced voucher', () => {
                const { setVoucher, addItem, validate } = useVoucherStore.getState();

                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'Test voucher' });
                addItem({ account_code: '1111', debit_amount: 1000000 });
                addItem({ account_code: '3311', credit_amount: 1000000 });

                const isValid = validate();

                expect(isValid).toBe(true);
                expect(useVoucherStore.getState().errors).toEqual({});
            });

            it('should skip balance check for off-balance sheet accounts', () => {
                const { setVoucher, addItem, validate } = useVoucherStore.getState();

                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'Off-balance test' });
                // Off-balance sheet accounts start with 0
                addItem({ account_code: '0111', debit_amount: 1000000 });

                const isValid = validate();

                // Should pass because only off-balance items
                expect(isValid).toBe(true);
            });
        });

        describe('Error Management', () => {
            it('should set error for specific field', () => {
                const { setError } = useVoucherStore.getState();

                setError('custom_field', 'Custom error message');

                expect(useVoucherStore.getState().errors.custom_field).toBe('Custom error message');
            });

            it('should clear error for specific field', () => {
                const { setError, clearError } = useVoucherStore.getState();

                setError('field1', 'Error 1');
                setError('field2', 'Error 2');

                clearError('field1');

                const errors = useVoucherStore.getState().errors;
                expect(errors.field1).toBeUndefined();
                expect(errors.field2).toBe('Error 2');
            });

            it('should clear all errors', () => {
                const { setError, clearAllErrors } = useVoucherStore.getState();

                setError('field1', 'Error 1');
                setError('field2', 'Error 2');

                clearAllErrors();

                expect(useVoucherStore.getState().errors).toEqual({});
            });
        });
    });

    describe('CRUD Operations', () => {
        describe('loadVoucher', () => {
            it('should load voucher by ID', async () => {
                const { loadVoucher } = useVoucherStore.getState();

                const result = await loadVoucher('test-id');

                expect(result).toBe(true);
                const state = useVoucherStore.getState();
                expect(state.voucher.id).toBe('test-id');
                expect(state.voucher.items.length).toBe(2);
                expect(state.isDirty).toBe(false);
            });
        });

        describe('save', () => {
            it('should save new voucher', async () => {
                const { setVoucher, addItem, save } = useVoucherStore.getState();

                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'New voucher' });
                addItem({ account_code: '1111', debit_amount: 1000000 });
                addItem({ account_code: '3311', credit_amount: 1000000 });

                const result = await save();

                expect(result.success).toBe(true);
                expect(result.id).toBe('new-voucher-id');
                expect(useVoucherStore.getState().voucher.id).toBe('new-voucher-id');
                expect(useVoucherStore.getState().isDirty).toBe(false);
            });

            it('should fail if validation fails', async () => {
                const { save } = useVoucherStore.getState();

                // Empty voucher will fail validation
                const result = await save();

                expect(result.success).toBe(false);
                expect(result.message).toBe('Dữ liệu không hợp lệ');
            });
        });

        describe('post', () => {
            it('should require voucher to be saved first', async () => {
                const { post } = useVoucherStore.getState();

                const result = await post();

                expect(result.success).toBe(false);
                expect(result.message).toBe('Chứng từ chưa được lưu');
            });

            it('should post saved voucher', async () => {
                const { setVoucher, addItem, save, post } = useVoucherStore.getState();

                // Create and save
                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'Post test' });
                addItem({ account_code: '1111', debit_amount: 1000000 });
                addItem({ account_code: '3311', credit_amount: 1000000 });
                await save();

                const result = await post();

                expect(result.success).toBe(true);
                expect(useVoucherStore.getState().voucher.status).toBe('POSTED');
                expect(useVoucherStore.getState().mode).toBe('view');
            });
        });

        describe('void_', () => {
            it('should void posted voucher', async () => {
                const { setVoucher, addItem, save, void_ } = useVoucherStore.getState();

                // Create and save
                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'Void test' });
                addItem({ account_code: '1111', debit_amount: 1000000 });
                addItem({ account_code: '3311', credit_amount: 1000000 });
                await save();

                const result = await void_();

                expect(result.success).toBe(true);
                expect(useVoucherStore.getState().voucher.status).toBe('VOIDED');
            });
        });

        describe('duplicate', () => {
            it('should duplicate voucher', async () => {
                const { setVoucher, addItem, save, duplicate } = useVoucherStore.getState();

                // Create and save
                setVoucher({ doc_type: 'GL', doc_date: '2024-01-01', description: 'Duplicate test' });
                addItem({ account_code: '1111', debit_amount: 1000000 });
                addItem({ account_code: '3311', credit_amount: 1000000 });
                await save();

                const result = await duplicate();

                expect(result.success).toBe(true);
                expect(result.id).toBe('duplicated-voucher-id');
            });
        });
    });

    describe('Mode Management', () => {
        it('should set mode', () => {
            const { setMode } = useVoucherStore.getState();

            setMode('edit');
            expect(useVoucherStore.getState().mode).toBe('edit');

            setMode('view');
            expect(useVoucherStore.getState().mode).toBe('view');

            setMode('create');
            expect(useVoucherStore.getState().mode).toBe('create');
        });
    });
});
