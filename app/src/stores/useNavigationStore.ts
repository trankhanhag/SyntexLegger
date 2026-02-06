/**
 * Navigation Store
 * Manages all navigation state for the application
 * Replaces 19+ useState calls in App.tsx
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface NavigationState {
  // Main tab
  activeTab: string;
  navigationData: any;

  // Module-specific views
  dashboardView: string;
  generalView: string;
  reportView: string;
  revenueView: string;
  cashView: string;
  loanView: string;
  taxView: string;
  expenseView: string;
  inventoryView: string;
  assetView: string;
  hrView: string;
  contractView: string;
  projectView: string;
  dimView: string;
  sysView: string;

  // Signals for print/export/import actions
  printSignal: number;
  exportSignal: number;
  importSignal: number;

  // Page header state
  pageHeader: {
    title?: string;
    icon?: string;
    actions?: any[];
    onDelete?: () => void;
  };

  // Modal states
  showAuditModal: boolean;
  showMacroModal: boolean;

  // Mobile sidebar
  isMobileSidebarOpen: boolean;

  // Actions
  setActiveTab: (tab: string) => void;
  setNavigationData: (data: any) => void;
  setDashboardView: (view: string) => void;
  setGeneralView: (view: string) => void;
  setReportView: (view: string) => void;
  setRevenueView: (view: string) => void;
  setCashView: (view: string) => void;
  setLoanView: (view: string) => void;
  setTaxView: (view: string) => void;
  setExpenseView: (view: string) => void;
  setInventoryView: (view: string) => void;
  setAssetView: (view: string) => void;
  setHrView: (view: string) => void;
  setContractView: (view: string) => void;
  setProjectView: (view: string) => void;
  setDimView: (view: string) => void;
  setSysView: (view: string) => void;

  // Signal actions
  triggerPrint: () => void;
  triggerExport: () => void;
  triggerImport: () => void;
  resetSignals: () => void;

  // Page header actions
  setPageHeader: (header: NavigationState['pageHeader']) => void;
  resetPageHeader: () => void;

  // Modal actions
  setShowAuditModal: (show: boolean) => void;
  setShowMacroModal: (show: boolean) => void;

  // Mobile sidebar actions
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // Navigation helper
  navigate: (viewId: string, data?: any) => void;

  // Get active view for current tab
  getActiveView: () => string;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeTab: 'dashboard',
      navigationData: null,
      dashboardView: 'dashboard',
      generalView: 'voucher_list',
      reportView: 'balance_sheet',
      revenueView: 'receipt',
      cashView: 'list',
      loanView: 'temp_advances',
      taxView: 'vat',
      expenseView: 'voucher',
      inventoryView: 'receipt',
      assetView: 'list',
      hrView: 'employees',
      contractView: 'sales',
      projectView: 'list',
      dimView: 'overview',
      sysView: 'params',

      printSignal: 0,
      exportSignal: 0,
      importSignal: 0,

      pageHeader: {},
      showAuditModal: false,
      showMacroModal: false,
      isMobileSidebarOpen: false,

      // Tab setters
      setActiveTab: (tab) => set({ activeTab: tab }),
      setNavigationData: (data) => set({ navigationData: data }),
      setDashboardView: (view) => set({ dashboardView: view }),
      setGeneralView: (view) => set({ generalView: view }),
      setReportView: (view) => set({ reportView: view }),
      setRevenueView: (view) => set({ revenueView: view }),
      setCashView: (view) => set({ cashView: view }),
      setLoanView: (view) => set({ loanView: view }),
      setTaxView: (view) => set({ taxView: view }),
      setExpenseView: (view) => set({ expenseView: view }),
      setInventoryView: (view) => set({ inventoryView: view }),
      setAssetView: (view) => set({ assetView: view }),
      setHrView: (view) => set({ hrView: view }),
      setContractView: (view) => set({ contractView: view }),
      setProjectView: (view) => set({ projectView: view }),
      setDimView: (view) => set({ dimView: view }),
      setSysView: (view) => set({ sysView: view }),

      // Signal actions
      triggerPrint: () => set((state) => ({ printSignal: state.printSignal + 1 })),
      triggerExport: () => set((state) => ({ exportSignal: state.exportSignal + 1 })),
      triggerImport: () => set((state) => ({ importSignal: state.importSignal + 1 })),
      resetSignals: () => set({ printSignal: 0, exportSignal: 0, importSignal: 0 }),

      // Page header actions
      setPageHeader: (header) => set({ pageHeader: header }),
      resetPageHeader: () => set({ pageHeader: {} }),

      // Modal actions
      setShowAuditModal: (show) => set({ showAuditModal: show }),
      setShowMacroModal: (show) => set({ showMacroModal: show }),

      // Mobile sidebar actions
      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
      toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

      // Navigation helper - replaces handleNavigate in App.tsx
      navigate: (viewId, data) => {
        const state = get();
        set({ printSignal: 0, navigationData: data });

        // Global Modals (No tab change)
        if (viewId === 'audit') {
          set({ showAuditModal: true });
          return;
        }
        if (viewId === 'closing_macro') {
          set({ showMacroModal: true });
          return;
        }

        // Dashboard
        if (viewId === 'dashboard') {
          set({ activeTab: 'dashboard', dashboardView: 'dashboard' });
          return;
        }

        // General Ledger
        if (['voucher_list', 'voucher_new', 'voucher_edit', 'trial_balance', 'general_ledger', 'partner_ledger', 'period_close'].includes(viewId)) {
          set({ activeTab: 'general', generalView: viewId });
          return;
        }

        // Reports
        if (['balance_sheet', 'income_statement', 'cash_flow', 'account_balance', 'cash_book', 'journal', 'tax_report'].includes(viewId)) {
          set({ activeTab: 'report', reportView: viewId });
          return;
        }

        // Revenue
        if (['receipt', 'sales_invoice', 'customer_debt'].includes(viewId)) {
          set({ activeTab: 'revenue', revenueView: viewId });
          return;
        }

        // Cash/Bank
        if (['list', 'cash_receipt', 'cash_payment', 'bank_transfer', 'statement_import', 'reconciliation'].includes(viewId)) {
          if (state.activeTab !== 'cash' && !['list', 'cash_receipt', 'cash_payment', 'bank_transfer', 'statement_import', 'reconciliation'].includes(state.cashView)) {
            set({ activeTab: 'cash', cashView: viewId });
          } else {
            set({ cashView: viewId });
          }
          return;
        }

        // Debt/Loan Management
        if (['temp_advances', 'budget_advances', 'receivables', 'payables'].includes(viewId)) {
          set({ activeTab: 'loan', loanView: viewId });
          return;
        }

        // Tax
        if (['vat', 'pit', 'cit', 'tax_declaration'].includes(viewId)) {
          set({ activeTab: 'tax', taxView: viewId });
          return;
        }

        // Expense
        if (['voucher', 'allocation'].includes(viewId) && state.activeTab !== 'expense') {
          set({ activeTab: 'expense', expenseView: viewId });
          return;
        }

        // Inventory
        if (['receipt', 'issue', 'transfer', 'stock'].includes(viewId) && state.activeTab !== 'inventory') {
          set({ activeTab: 'inventory', inventoryView: viewId });
          return;
        }

        // Fixed Assets
        if (['list', 'depreciation', 'ccdc'].includes(viewId) && state.activeTab !== 'asset') {
          set({ activeTab: 'asset', assetView: viewId });
          return;
        }

        // HR
        if (['employees', 'salary', 'payroll', 'timekeeping'].includes(viewId)) {
          set({ activeTab: 'hr', hrView: viewId });
          return;
        }

        // Contracts
        if (['sales', 'purchase'].includes(viewId) && state.activeTab !== 'contract') {
          set({ activeTab: 'contract', contractView: viewId });
          return;
        }

        // Projects
        if (['list', 'tasks', 'budget'].includes(viewId) && state.activeTab !== 'project') {
          set({ activeTab: 'project', projectView: viewId });
          return;
        }

        // Dimensions
        if (['overview', 'config'].includes(viewId)) {
          set({ activeTab: 'dimension', dimView: viewId });
          return;
        }

        // System
        if (['params', 'users', 'roles', 'checklist'].includes(viewId)) {
          set({ activeTab: 'system', sysView: viewId });
          return;
        }

        // Default: treat viewId as tab name
        set({ activeTab: viewId });
      },

      // Get active view for current tab
      getActiveView: () => {
        const state = get();
        const viewMap: Record<string, string> = {
          dashboard: state.dashboardView,
          general: state.generalView,
          report: state.reportView,
          revenue: state.revenueView,
          cash: state.cashView,
          loan: state.loanView,
          tax: state.taxView,
          expense: state.expenseView,
          inventory: state.inventoryView,
          asset: state.assetView,
          hr: state.hrView,
          contract: state.contractView,
          project: state.projectView,
          dimension: state.dimView,
          system: state.sysView,
        };
        return viewMap[state.activeTab] || '';
      },
    }),
    {
      name: 'syntex-navigation',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields (not signals, modals, etc.)
        activeTab: state.activeTab,
        dashboardView: state.dashboardView,
        generalView: state.generalView,
        reportView: state.reportView,
        revenueView: state.revenueView,
        cashView: state.cashView,
        loanView: state.loanView,
        taxView: state.taxView,
        expenseView: state.expenseView,
        inventoryView: state.inventoryView,
        assetView: state.assetView,
        hrView: state.hrView,
        contractView: state.contractView,
        projectView: state.projectView,
        dimView: state.dimView,
        sysView: state.sysView,
      }),
    }
  )
);
