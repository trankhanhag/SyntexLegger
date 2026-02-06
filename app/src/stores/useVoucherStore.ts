/**
 * Voucher Store
 * Manages voucher form state and operations
 * Simplifies the 490-line useVoucherForm.ts hook
 */

import { create } from 'zustand';
import api from '../api';

interface VoucherItem {
  id?: string;
  line_no: number;
  account_code: string;
  account_name?: string;
  partner_code?: string;
  partner_name?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  dim1_code?: string;
  dim2_code?: string;
  dim3_code?: string;
  dim4_code?: string;
  dim5_code?: string;
}

interface Voucher {
  id?: string;
  doc_type: string;
  doc_no: string;
  doc_date: string;
  description: string;
  partner_code?: string;
  partner_name?: string;
  currency: string;
  exchange_rate: number;
  status: string;
  items: VoucherItem[];
}

interface FormErrors {
  doc_type?: string;
  doc_no?: string;
  doc_date?: string;
  description?: string;
  items?: string;
  balance?: string;
  [key: string]: string | undefined;
}

interface VoucherState {
  // Form state
  voucher: Voucher;
  originalVoucher: Voucher | null;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  errors: FormErrors;

  // Mode
  mode: 'create' | 'edit' | 'view';

  // Actions - Form
  setVoucher: (voucher: Partial<Voucher>) => void;
  setField: (field: keyof Voucher, value: any) => void;
  resetForm: () => void;
  loadVoucher: (id: string) => Promise<boolean>;

  // Actions - Items
  addItem: (item?: Partial<VoucherItem>) => void;
  updateItem: (index: number, field: keyof VoucherItem, value: any) => void;
  removeItem: (index: number) => void;
  duplicateItem: (index: number) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  clearItems: () => void;

  // Actions - Validation
  validate: () => boolean;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;

  // Actions - CRUD
  save: () => Promise<{ success: boolean; id?: string; message?: string }>;
  post: () => Promise<{ success: boolean; message?: string }>;
  void_: () => Promise<{ success: boolean; message?: string }>;
  duplicate: () => Promise<{ success: boolean; id?: string; message?: string }>;

  // Computed
  getTotalDebit: () => number;
  getTotalCredit: () => number;
  getBalance: () => number;
  isBalanced: () => boolean;
  getNextLineNo: () => number;

  // Mode
  setMode: (mode: 'create' | 'edit' | 'view') => void;
}

const createEmptyVoucher = (): Voucher => ({
  doc_type: 'GL',
  doc_no: '',
  doc_date: new Date().toISOString().split('T')[0],
  description: '',
  currency: 'VND',
  exchange_rate: 1,
  status: 'DRAFT',
  items: [],
});

const createEmptyItem = (lineNo: number): VoucherItem => ({
  line_no: lineNo,
  account_code: '',
  description: '',
  debit_amount: 0,
  credit_amount: 0,
});

export const useVoucherStore = create<VoucherState>((set, get) => ({
  // Initial state
  voucher: createEmptyVoucher(),
  originalVoucher: null,
  isDirty: false,
  isLoading: false,
  isSaving: false,
  errors: {},
  mode: 'create',

  // Form actions
  setVoucher: (data) => {
    set((state) => ({
      voucher: { ...state.voucher, ...data },
      isDirty: true,
    }));
  },

  setField: (field, value) => {
    set((state) => ({
      voucher: { ...state.voucher, [field]: value },
      isDirty: true,
    }));
  },

  resetForm: () => {
    set({
      voucher: createEmptyVoucher(),
      originalVoucher: null,
      isDirty: false,
      errors: {},
      mode: 'create',
    });
  },

  loadVoucher: async (id: string) => {
    set({ isLoading: true, errors: {} });
    try {
      const response = await api.get(`/vouchers/${id}`);
      const data = response.data.data;

      const voucher: Voucher = {
        id: data.id,
        doc_type: data.doc_type,
        doc_no: data.doc_no,
        doc_date: data.doc_date,
        description: data.description || '',
        partner_code: data.partner_code,
        partner_name: data.partner_name,
        currency: data.currency || 'VND',
        exchange_rate: data.exchange_rate || 1,
        status: data.status,
        items: (data.items || []).map((item: any, idx: number) => ({
          id: item.id,
          line_no: item.line_no || idx + 1,
          account_code: item.account_code,
          account_name: item.account_name,
          partner_code: item.partner_code,
          partner_name: item.partner_name,
          description: item.description || '',
          debit_amount: parseFloat(item.debit_amount) || 0,
          credit_amount: parseFloat(item.credit_amount) || 0,
          dim1_code: item.dim1_code,
          dim2_code: item.dim2_code,
          dim3_code: item.dim3_code,
          dim4_code: item.dim4_code,
          dim5_code: item.dim5_code,
        })),
      };

      set({
        voucher,
        originalVoucher: JSON.parse(JSON.stringify(voucher)),
        isDirty: false,
        isLoading: false,
        mode: data.status === 'POSTED' ? 'view' : 'edit',
      });
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        errors: { general: error.message || 'Failed to load voucher' },
      });
      return false;
    }
  },

  // Item actions
  addItem: (item) => {
    const nextLineNo = get().getNextLineNo();
    const newItem = item
      ? { ...createEmptyItem(nextLineNo), ...item, line_no: nextLineNo }
      : createEmptyItem(nextLineNo);

    set((state) => ({
      voucher: {
        ...state.voucher,
        items: [...state.voucher.items, newItem],
      },
      isDirty: true,
    }));
  },

  updateItem: (index, field, value) => {
    set((state) => {
      const items = [...state.voucher.items];
      if (items[index]) {
        items[index] = { ...items[index], [field]: value };
      }
      return {
        voucher: { ...state.voucher, items },
        isDirty: true,
      };
    });
  },

  removeItem: (index) => {
    set((state) => ({
      voucher: {
        ...state.voucher,
        items: state.voucher.items.filter((_, i) => i !== index),
      },
      isDirty: true,
    }));
  },

  duplicateItem: (index) => {
    const item = get().voucher.items[index];
    if (!item) return;

    const nextLineNo = get().getNextLineNo();
    const duplicated = { ...item, id: undefined, line_no: nextLineNo };

    set((state) => ({
      voucher: {
        ...state.voucher,
        items: [...state.voucher.items, duplicated],
      },
      isDirty: true,
    }));
  },

  moveItem: (fromIndex, toIndex) => {
    set((state) => {
      const items = [...state.voucher.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);

      // Re-number line_no
      items.forEach((item, idx) => {
        item.line_no = idx + 1;
      });

      return {
        voucher: { ...state.voucher, items },
        isDirty: true,
      };
    });
  },

  clearItems: () => {
    set((state) => ({
      voucher: { ...state.voucher, items: [] },
      isDirty: true,
    }));
  },

  // Validation
  validate: () => {
    const { voucher } = get();
    const errors: FormErrors = {};

    if (!voucher.doc_type) {
      errors.doc_type = 'Loại chứng từ không được để trống';
    }

    if (!voucher.doc_date) {
      errors.doc_date = 'Ngày chứng từ không được để trống';
    }

    if (!voucher.description) {
      errors.description = 'Diễn giải không được để trống';
    }

    if (voucher.items.length === 0) {
      errors.items = 'Chứng từ phải có ít nhất 1 dòng định khoản';
    }

    // Check balance (skip for off-balance sheet accounts starting with 0)
    const hasOnBalanceItems = voucher.items.some(
      item => !item.account_code.startsWith('0')
    );

    if (hasOnBalanceItems && !get().isBalanced()) {
      errors.balance = 'Tổng Nợ phải bằng tổng Có';
    }

    set({ errors });
    return Object.keys(errors).length === 0;
  },

  setError: (field, message) => {
    set((state) => ({
      errors: { ...state.errors, [field]: message },
    }));
  },

  clearError: (field) => {
    set((state) => {
      const errors = { ...state.errors };
      delete errors[field];
      return { errors };
    });
  },

  clearAllErrors: () => {
    set({ errors: {} });
  },

  // CRUD operations
  save: async () => {
    if (!get().validate()) {
      return { success: false, message: 'Dữ liệu không hợp lệ' };
    }

    set({ isSaving: true });
    try {
      const { voucher, mode } = get();
      const isNew = mode === 'create' || !voucher.id;

      const payload = {
        doc_type: voucher.doc_type,
        doc_no: voucher.doc_no || undefined,
        doc_date: voucher.doc_date,
        description: voucher.description,
        partner_code: voucher.partner_code,
        currency: voucher.currency,
        exchange_rate: voucher.exchange_rate,
        items: voucher.items.map(item => ({
          line_no: item.line_no,
          account_code: item.account_code,
          partner_code: item.partner_code,
          description: item.description,
          debit_amount: item.debit_amount,
          credit_amount: item.credit_amount,
          dim1_code: item.dim1_code,
          dim2_code: item.dim2_code,
          dim3_code: item.dim3_code,
          dim4_code: item.dim4_code,
          dim5_code: item.dim5_code,
        })),
      };

      const response = isNew
        ? await api.post('/vouchers', payload)
        : await api.put(`/vouchers/${voucher.id}`, payload);

      const savedVoucher = response.data.data;

      set({
        voucher: { ...get().voucher, id: savedVoucher.id, doc_no: savedVoucher.doc_no },
        originalVoucher: savedVoucher,
        isDirty: false,
        isSaving: false,
        mode: 'edit',
      });

      return { success: true, id: savedVoucher.id };
    } catch (error: any) {
      set({ isSaving: false });
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi khi lưu chứng từ',
      };
    }
  },

  post: async () => {
    const { voucher } = get();
    if (!voucher.id) {
      return { success: false, message: 'Chứng từ chưa được lưu' };
    }

    set({ isSaving: true });
    try {
      await api.post(`/vouchers/${voucher.id}/post`);
      set((state) => ({
        voucher: { ...state.voucher, status: 'POSTED' },
        isSaving: false,
        mode: 'view',
      }));
      return { success: true };
    } catch (error: any) {
      set({ isSaving: false });
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi khi ghi sổ',
      };
    }
  },

  void_: async () => {
    const { voucher } = get();
    if (!voucher.id) {
      return { success: false, message: 'Chứng từ chưa được lưu' };
    }

    set({ isSaving: true });
    try {
      await api.post(`/vouchers/${voucher.id}/void`);
      set((state) => ({
        voucher: { ...state.voucher, status: 'VOIDED' },
        isSaving: false,
        mode: 'view',
      }));
      return { success: true };
    } catch (error: any) {
      set({ isSaving: false });
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi khi hủy chứng từ',
      };
    }
  },

  duplicate: async () => {
    const { voucher } = get();
    if (!voucher.id) {
      return { success: false, message: 'Chứng từ chưa được lưu' };
    }

    set({ isSaving: true });
    try {
      const response = await api.post(`/vouchers/${voucher.id}/duplicate`);
      const newVoucher = response.data.data;
      set({ isSaving: false });
      return { success: true, id: newVoucher.id };
    } catch (error: any) {
      set({ isSaving: false });
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Lỗi khi sao chép',
      };
    }
  },

  // Computed
  getTotalDebit: () => {
    return get().voucher.items.reduce((sum, item) => sum + (item.debit_amount || 0), 0);
  },

  getTotalCredit: () => {
    return get().voucher.items.reduce((sum, item) => sum + (item.credit_amount || 0), 0);
  },

  getBalance: () => {
    return get().getTotalDebit() - get().getTotalCredit();
  },

  isBalanced: () => {
    return Math.abs(get().getBalance()) < 0.01;
  },

  getNextLineNo: () => {
    const items = get().voucher.items;
    if (items.length === 0) return 1;
    return Math.max(...items.map(i => i.line_no)) + 1;
  },

  // Mode
  setMode: (mode) => {
    set({ mode });
  },
}));
