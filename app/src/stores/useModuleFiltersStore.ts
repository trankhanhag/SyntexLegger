/**
 * Module Filters Store
 * Persists filter settings across modules
 * Allows users to maintain their filter preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DateRange {
  fromDate: string;
  toDate: string;
}

interface VoucherFilters {
  docType: string;
  status: string;
  dateRange: DateRange;
  search: string;
  partnerCode: string;
}

interface ReportFilters {
  period: string;
  dateRange: DateRange;
  accountCode: string;
  partnerCode: string;
  showZeroBalance: boolean;
}

interface AssetFilters {
  category: string;
  status: string;
  departmentId: string;
  search: string;
}

interface InventoryFilters {
  materialType: string;
  warehouseId: string;
  category: string;
  search: string;
  dateRange: DateRange;
}

interface HRFilters {
  departmentId: string;
  status: string;
  search: string;
  month: string;
  year: number;
}

interface ModuleFiltersState {
  // Voucher filters
  voucherFilters: VoucherFilters;
  setVoucherFilters: (filters: Partial<VoucherFilters>) => void;
  resetVoucherFilters: () => void;

  // Report filters
  reportFilters: ReportFilters;
  setReportFilters: (filters: Partial<ReportFilters>) => void;
  resetReportFilters: () => void;

  // Asset filters
  assetFilters: AssetFilters;
  setAssetFilters: (filters: Partial<AssetFilters>) => void;
  resetAssetFilters: () => void;

  // Inventory filters
  inventoryFilters: InventoryFilters;
  setInventoryFilters: (filters: Partial<InventoryFilters>) => void;
  resetInventoryFilters: () => void;

  // HR filters
  hrFilters: HRFilters;
  setHRFilters: (filters: Partial<HRFilters>) => void;
  resetHRFilters: () => void;

  // Generic filter storage for custom modules
  customFilters: Record<string, Record<string, any>>;
  setCustomFilter: (module: string, key: string, value: any) => void;
  getCustomFilter: (module: string, key: string) => any;
  resetCustomFilters: (module: string) => void;

  // Reset all filters
  resetAll: () => void;
}

const getCurrentMonth = () => {
  const now = new Date();
  return {
    fromDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
  };
};

const getDefaultVoucherFilters = (): VoucherFilters => ({
  docType: '',
  status: '',
  dateRange: getCurrentMonth(),
  search: '',
  partnerCode: '',
});

const getDefaultReportFilters = (): ReportFilters => ({
  period: 'month',
  dateRange: getCurrentMonth(),
  accountCode: '',
  partnerCode: '',
  showZeroBalance: false,
});

const getDefaultAssetFilters = (): AssetFilters => ({
  category: '',
  status: '',
  departmentId: '',
  search: '',
});

const getDefaultInventoryFilters = (): InventoryFilters => ({
  materialType: '',
  warehouseId: '',
  category: '',
  search: '',
  dateRange: getCurrentMonth(),
});

const getDefaultHRFilters = (): HRFilters => ({
  departmentId: '',
  status: '',
  search: '',
  month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
  year: new Date().getFullYear(),
});

export const useModuleFiltersStore = create<ModuleFiltersState>()(
  persist(
    (set, get) => ({
      // Voucher filters
      voucherFilters: getDefaultVoucherFilters(),
      setVoucherFilters: (filters) => {
        set((state) => ({
          voucherFilters: { ...state.voucherFilters, ...filters },
        }));
      },
      resetVoucherFilters: () => {
        set({ voucherFilters: getDefaultVoucherFilters() });
      },

      // Report filters
      reportFilters: getDefaultReportFilters(),
      setReportFilters: (filters) => {
        set((state) => ({
          reportFilters: { ...state.reportFilters, ...filters },
        }));
      },
      resetReportFilters: () => {
        set({ reportFilters: getDefaultReportFilters() });
      },

      // Asset filters
      assetFilters: getDefaultAssetFilters(),
      setAssetFilters: (filters) => {
        set((state) => ({
          assetFilters: { ...state.assetFilters, ...filters },
        }));
      },
      resetAssetFilters: () => {
        set({ assetFilters: getDefaultAssetFilters() });
      },

      // Inventory filters
      inventoryFilters: getDefaultInventoryFilters(),
      setInventoryFilters: (filters) => {
        set((state) => ({
          inventoryFilters: { ...state.inventoryFilters, ...filters },
        }));
      },
      resetInventoryFilters: () => {
        set({ inventoryFilters: getDefaultInventoryFilters() });
      },

      // HR filters
      hrFilters: getDefaultHRFilters(),
      setHRFilters: (filters) => {
        set((state) => ({
          hrFilters: { ...state.hrFilters, ...filters },
        }));
      },
      resetHRFilters: () => {
        set({ hrFilters: getDefaultHRFilters() });
      },

      // Custom filters
      customFilters: {},
      setCustomFilter: (module, key, value) => {
        set((state) => ({
          customFilters: {
            ...state.customFilters,
            [module]: {
              ...state.customFilters[module],
              [key]: value,
            },
          },
        }));
      },
      getCustomFilter: (module, key) => {
        return get().customFilters[module]?.[key];
      },
      resetCustomFilters: (module) => {
        set((state) => {
          const { [module]: _, ...rest } = state.customFilters;
          return { customFilters: rest };
        });
      },

      // Reset all
      resetAll: () => {
        set({
          voucherFilters: getDefaultVoucherFilters(),
          reportFilters: getDefaultReportFilters(),
          assetFilters: getDefaultAssetFilters(),
          inventoryFilters: getDefaultInventoryFilters(),
          hrFilters: getDefaultHRFilters(),
          customFilters: {},
        });
      },
    }),
    {
      name: 'syntex-filters',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
