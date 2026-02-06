/**
 * Master Data Store
 * Caches and manages master data: accounts, partners, products
 * Reduces API calls by caching frequently used data
 */

import { create } from 'zustand';
import api from '../api';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  category: string;
  parent_code?: string;
  is_detail: number;
  is_active?: number;
}

interface Partner {
  id: string;
  partner_code: string;
  partner_name: string;
  partner_type: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: number;
}

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  category?: string;
  is_active?: number;
}

interface Material {
  id: string;
  material_code: string;
  material_name: string;
  unit: string;
  category?: string;
  is_active?: number;
}

interface MasterDataState {
  // Data
  accounts: Account[];
  partners: Partner[];
  products: Product[];
  materials: Material[];

  // Loading states
  isLoadingAccounts: boolean;
  isLoadingPartners: boolean;
  isLoadingProducts: boolean;
  isLoadingMaterials: boolean;

  // Error states
  accountsError: string | null;
  partnersError: string | null;
  productsError: string | null;
  materialsError: string | null;

  // Cache timestamps
  accountsLoadedAt: number | null;
  partnersLoadedAt: number | null;
  productsLoadedAt: number | null;
  materialsLoadedAt: number | null;

  // Actions
  fetchAccounts: (force?: boolean) => Promise<void>;
  fetchPartners: (force?: boolean) => Promise<void>;
  fetchProducts: (force?: boolean) => Promise<void>;
  fetchMaterials: (force?: boolean) => Promise<void>;
  fetchAll: (force?: boolean) => Promise<void>;

  // Getters
  getAccountByCode: (code: string) => Account | undefined;
  getPartnerByCode: (code: string) => Partner | undefined;
  getProductByCode: (code: string) => Product | undefined;
  getMaterialByCode: (code: string) => Material | undefined;

  // Filtered getters
  getDetailAccounts: () => Account[];
  getCustomers: () => Partner[];
  getSuppliers: () => Partner[];

  // Cache management
  invalidateCache: () => void;
  isCacheValid: (type: 'accounts' | 'partners' | 'products' | 'materials') => boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useMasterDataStore = create<MasterDataState>((set, get) => ({
  // Initial state
  accounts: [],
  partners: [],
  products: [],
  materials: [],

  isLoadingAccounts: false,
  isLoadingPartners: false,
  isLoadingProducts: false,
  isLoadingMaterials: false,

  accountsError: null,
  partnersError: null,
  productsError: null,
  materialsError: null,

  accountsLoadedAt: null,
  partnersLoadedAt: null,
  productsLoadedAt: null,
  materialsLoadedAt: null,

  // Fetch accounts
  fetchAccounts: async (force = false) => {
    if (!force && get().isCacheValid('accounts')) {
      return;
    }

    set({ isLoadingAccounts: true, accountsError: null });
    try {
      const response = await api.get('/accounts');
      set({
        accounts: response.data.data || [],
        isLoadingAccounts: false,
        accountsLoadedAt: Date.now(),
      });
    } catch (error: any) {
      set({
        isLoadingAccounts: false,
        accountsError: error.message || 'Failed to load accounts',
      });
    }
  },

  // Fetch partners
  fetchPartners: async (force = false) => {
    if (!force && get().isCacheValid('partners')) {
      return;
    }

    set({ isLoadingPartners: true, partnersError: null });
    try {
      const response = await api.get('/partners');
      set({
        partners: response.data.data || [],
        isLoadingPartners: false,
        partnersLoadedAt: Date.now(),
      });
    } catch (error: any) {
      set({
        isLoadingPartners: false,
        partnersError: error.message || 'Failed to load partners',
      });
    }
  },

  // Fetch products
  fetchProducts: async (force = false) => {
    if (!force && get().isCacheValid('products')) {
      return;
    }

    set({ isLoadingProducts: true, productsError: null });
    try {
      const response = await api.get('/products');
      set({
        products: response.data.data || [],
        isLoadingProducts: false,
        productsLoadedAt: Date.now(),
      });
    } catch (error: any) {
      set({
        isLoadingProducts: false,
        productsError: error.message || 'Failed to load products',
      });
    }
  },

  // Fetch materials
  fetchMaterials: async (force = false) => {
    if (!force && get().isCacheValid('materials')) {
      return;
    }

    set({ isLoadingMaterials: true, materialsError: null });
    try {
      const response = await api.get('/materials');
      set({
        materials: response.data.data || [],
        isLoadingMaterials: false,
        materialsLoadedAt: Date.now(),
      });
    } catch (error: any) {
      set({
        isLoadingMaterials: false,
        materialsError: error.message || 'Failed to load materials',
      });
    }
  },

  // Fetch all master data
  fetchAll: async (force = false) => {
    await Promise.all([
      get().fetchAccounts(force),
      get().fetchPartners(force),
      get().fetchProducts(force),
      get().fetchMaterials(force),
    ]);
  },

  // Getters
  getAccountByCode: (code: string) => {
    return get().accounts.find(a => a.account_code === code);
  },

  getPartnerByCode: (code: string) => {
    return get().partners.find(p => p.partner_code === code);
  },

  getProductByCode: (code: string) => {
    return get().products.find(p => p.product_code === code);
  },

  getMaterialByCode: (code: string) => {
    return get().materials.find(m => m.material_code === code);
  },

  // Filtered getters
  getDetailAccounts: () => {
    return get().accounts.filter(a => a.is_detail === 1);
  },

  getCustomers: () => {
    return get().partners.filter(p => p.partner_type === 'CUSTOMER');
  },

  getSuppliers: () => {
    return get().partners.filter(p => p.partner_type === 'SUPPLIER');
  },

  // Cache management
  invalidateCache: () => {
    set({
      accountsLoadedAt: null,
      partnersLoadedAt: null,
      productsLoadedAt: null,
      materialsLoadedAt: null,
    });
  },

  isCacheValid: (type) => {
    const timestamps = {
      accounts: get().accountsLoadedAt,
      partners: get().partnersLoadedAt,
      products: get().productsLoadedAt,
      materials: get().materialsLoadedAt,
    };

    const loadedAt = timestamps[type];
    if (!loadedAt) return false;

    return Date.now() - loadedAt < CACHE_DURATION;
  },
}));
