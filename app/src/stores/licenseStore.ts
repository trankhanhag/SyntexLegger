/**
 * License Store - Zustand store for authentication & license management
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 *
 * Authentication flow: MST (Tax ID) + Password
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type ClsState = 'INIT' | 'FREE_ACTIVE' | 'PRE_BILLING' | 'PAID_ACTIVE' | 'SUSPENDED';

export interface BillingTrigger {
  metric: string;
  threshold: number;
  currentValue: number;
  exceeded: boolean;
}

export interface CompanyInfo {
  id: string;
  taxId: string;
  companyName: string;
  clsState: ClsState;
  billingWarning: boolean;
  gracePeriodEndsAt: string | Date | null;
  currentPlan: string;
  canCreateVouchers: boolean;
  canExport: boolean;
  message?: string;
}

export interface LicenseState {
  // Auth token
  token: string | null;

  // Company info
  companyId: string | null;
  companyName: string | null;
  taxId: string | null;

  // CLS state
  clsState: ClsState;
  billingWarning: boolean;
  gracePeriodEndsAt: Date | null;

  // Subscription
  currentPlan: 'FREE' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
  subscriptionEndsAt: Date | null;

  // Validation
  lastValidationAt: Date | null;
  isOffline: boolean;
  offlineGraceDays: number;

  // Billing triggers
  exceededTriggers: BillingTrigger[];

  // Permissions
  canCreateVouchers: boolean;
  canExport: boolean;

  // Actions
  setToken: (token: string) => void;
  setCompanyInfo: (info: CompanyInfo) => void;
  validateSession: () => Promise<boolean>;
  checkOfflineGrace: () => boolean;
  clearSession: () => void;
  logout: () => Promise<void>;
}

// Constants
const LICENSE_SERVER_URL = import.meta.env.VITE_LICENSE_SERVER_URL || 'https://license.syntexlegger.vn';
const OFFLINE_GRACE_DAYS = 30;
const VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (daily check)

/**
 * Get hardware fingerprint for session validation
 */
async function getHardwareFingerprint(): Promise<string> {
  if (window.electronAPI?.getMachineId) {
    return await window.electronAPI.getMachineId();
  }

  // Browser fallback
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ];

  const data = components.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Collect usage metrics from the application
 */
async function collectUsageMetrics(): Promise<{
  journal_entries_count: number;
  revenue_amount: number;
  invoice_count: number;
  active_months: number;
  user_count: number;
  advanced_modules_enabled: boolean;
  fiscal_year: number;
}> {
  const currentYear = new Date().getFullYear();

  try {
    const response = await fetch('/api/metrics/usage');
    if (response.ok) {
      const data = await response.json();
      return {
        journal_entries_count: data.journalEntriesCount || 0,
        revenue_amount: data.revenueAmount || 0,
        invoice_count: data.invoiceCount || 0,
        active_months: data.activeMonths || 0,
        user_count: data.userCount || 1,
        advanced_modules_enabled: data.advancedModulesEnabled || false,
        fiscal_year: currentYear
      };
    }
  } catch (error) {
    console.warn('Could not fetch usage metrics, using defaults');
  }

  return {
    journal_entries_count: 0,
    revenue_amount: 0,
    invoice_count: 0,
    active_months: 0,
    user_count: 1,
    advanced_modules_enabled: false,
    fiscal_year: currentYear
  };
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      companyId: null,
      companyName: null,
      taxId: null,
      clsState: 'INIT',
      billingWarning: false,
      gracePeriodEndsAt: null,
      currentPlan: 'FREE',
      subscriptionEndsAt: null,
      lastValidationAt: null,
      isOffline: false,
      offlineGraceDays: OFFLINE_GRACE_DAYS,
      exceededTriggers: [],
      canCreateVouchers: true,
      canExport: true,

      // Set auth token
      setToken: (token: string) => {
        set({ token });
      },

      // Set company info after login
      setCompanyInfo: (info: CompanyInfo) => {
        set({
          companyId: info.id,
          companyName: info.companyName,
          taxId: info.taxId,
          clsState: info.clsState,
          billingWarning: info.billingWarning,
          gracePeriodEndsAt: info.gracePeriodEndsAt ? new Date(info.gracePeriodEndsAt) : null,
          currentPlan: info.currentPlan as LicenseState['currentPlan'],
          canCreateVouchers: info.canCreateVouchers,
          canExport: info.canExport,
          lastValidationAt: new Date(),
          isOffline: false
        });
      },

      // Validate session with server
      validateSession: async (): Promise<boolean> => {
        const state = get();

        if (!state.token) {
          console.warn('No token set');
          return false;
        }

        try {
          const fingerprint = await getHardwareFingerprint();
          const metrics = await collectUsageMetrics();

          const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/auth/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
              hardware_fingerprint: fingerprint,
              usage_metrics: metrics
            })
          });

          if (!response.ok) {
            if (response.status === 401) {
              // Session expired
              get().clearSession();
              return false;
            }
            throw new Error('Validation request failed');
          }

          const result = await response.json();

          if (result.success && result.data.company) {
            const company = result.data.company;
            set({
              companyId: company.id,
              companyName: company.company_name,
              taxId: company.tax_id,
              clsState: company.cls_state,
              billingWarning: company.billing_warning,
              gracePeriodEndsAt: company.grace_period_ends_at ? new Date(company.grace_period_ends_at) : null,
              currentPlan: company.current_plan as LicenseState['currentPlan'],
              canCreateVouchers: company.can_create_vouchers,
              canExport: company.can_export,
              lastValidationAt: new Date(),
              isOffline: false
            });
            return true;
          }

          return false;
        } catch (error) {
          console.error('Session validation failed:', error);
          set({ isOffline: true });

          // Check offline grace period
          return get().checkOfflineGrace();
        }
      },

      // Check offline grace period
      checkOfflineGrace: (): boolean => {
        const state = get();

        if (!state.lastValidationAt) {
          return false;
        }

        const lastValidation = new Date(state.lastValidationAt);
        const now = new Date();
        const daysSinceValidation = Math.floor(
          (now.getTime() - lastValidation.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceValidation > OFFLINE_GRACE_DAYS) {
          set({
            clsState: 'SUSPENDED',
            canCreateVouchers: false
          });
          return false;
        }

        return true;
      },

      // Clear session (local only)
      clearSession: () => {
        set({
          token: null,
          companyId: null,
          companyName: null,
          taxId: null,
          clsState: 'INIT',
          billingWarning: false,
          gracePeriodEndsAt: null,
          currentPlan: 'FREE',
          subscriptionEndsAt: null,
          lastValidationAt: null,
          isOffline: false,
          exceededTriggers: [],
          canCreateVouchers: true,
          canExport: true
        });
      },

      // Logout (call server then clear session)
      logout: async () => {
        const state = get();

        if (state.token) {
          try {
            await fetch(`${LICENSE_SERVER_URL}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${state.token}`
              }
            });
          } catch (error) {
            console.error('Logout request failed:', error);
          }
        }

        get().clearSession();
      }
    }),
    {
      name: 'syntex-license-storage',
      partialize: (state) => ({
        token: state.token,
        companyId: state.companyId,
        companyName: state.companyName,
        taxId: state.taxId,
        lastValidationAt: state.lastValidationAt,
        clsState: state.clsState,
        currentPlan: state.currentPlan,
        canCreateVouchers: state.canCreateVouchers,
        canExport: state.canExport
      })
    }
  )
);

// Declare electron API types
declare global {
  interface Window {
    electronAPI?: {
      getMachineId: () => Promise<string>;
    };
  }
}

/**
 * Hook to check if validation is needed (daily check)
 */
export function useNeedsValidation(): boolean {
  const lastValidationAt = useLicenseStore(state => state.lastValidationAt);

  if (!lastValidationAt) return true;

  const timeSinceValidation = Date.now() - new Date(lastValidationAt).getTime();
  return timeSinceValidation > VALIDATION_INTERVAL_MS;
}

/**
 * Hook to get billing warning message
 */
export function useBillingWarningMessage(): string | null {
  const { clsState, billingWarning, gracePeriodEndsAt } = useLicenseStore();

  if (clsState === 'PRE_BILLING' && billingWarning) {
    const dateStr = gracePeriodEndsAt
      ? gracePeriodEndsAt.toLocaleDateString('vi-VN')
      : '';
    return `Doanh nghiệp đã vượt mức miễn phí. Vui lòng gia hạn trước ngày ${dateStr}`;
  }

  if (clsState === 'SUSPENDED') {
    return 'Tài khoản cần gia hạn. Vui lòng thanh toán để tiếp tục sử dụng';
  }

  return null;
}

/**
 * Hook to check if user can perform write operations
 */
export function useCanWrite(): boolean {
  return useLicenseStore(state => state.canCreateVouchers);
}

/**
 * Hook to get company info
 */
export function useCompanyInfo() {
  return useLicenseStore(state => ({
    id: state.companyId,
    name: state.companyName,
    taxId: state.taxId,
    plan: state.currentPlan
  }));
}

export default useLicenseStore;
