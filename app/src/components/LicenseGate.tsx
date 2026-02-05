/**
 * LicenseGate - Authentication wrapper component
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 *
 * Login flow: MST (Tax ID) + Password + Captcha (if required)
 */

import React, { useEffect, useState } from 'react';
import {
  useLicenseStore,
  useNeedsValidation,
  useBillingWarningMessage,
} from '../stores/licenseStore';

interface LicenseGateProps {
  children: React.ReactNode;
}

interface LoginFormData {
  taxId: string;
  password: string;
  captchaAnswer: string;
}

const LICENSE_SERVER_URL = import.meta.env.VITE_LICENSE_SERVER_URL || 'https://license.syntexlegger.vn';

// Login Form Component
const LoginForm: React.FC<{
  onLogin: (data: LoginFormData) => Promise<void>;
  error: string | null;
  loading: boolean;
  requiresCaptcha: boolean;
  captchaQuestion: string | null;
}> = ({ onLogin, error, loading, requiresCaptcha, captchaQuestion }) => {
  const [taxId, setTaxId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taxId.trim() && password) {
      await onLogin({ taxId: taxId.trim(), password, captchaAnswer });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl mb-4">
              <span className="material-icons text-white text-3xl">account_balance</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">SyntexLegger</h1>
            <p className="text-gray-500 mt-1">Kế toán Doanh nghiệp</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tax ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã số thuế (MST)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400 text-xl">
                  business
                </span>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="0123456789"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400 text-xl">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-icons text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Captcha (if required) */}
            {requiresCaptcha && captchaQuestion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xác thực: {captchaQuestion}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400 text-xl">
                    calculate
                  </span>
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Nhập kết quả"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-red-500">error</span>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !taxId.trim() || !password}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Chưa có tài khoản?{' '}
              <a
                href="https://syntexlegger.vn/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Đăng ký miễn phí
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 SyntexLegger. Theo TT 99/2025/TT-BTC
        </p>
      </div>
    </div>
  );
};

// Billing Warning Banner
const BillingWarningBanner: React.FC<{ message: string; onUpgrade: () => void }> = ({ message, onUpgrade }) => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="material-icons text-amber-600">warning</span>
          <p className="text-amber-800 text-sm">{message}</p>
        </div>
        <button
          onClick={onUpgrade}
          className="px-4 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          Gia hạn ngay
        </button>
      </div>
    </div>
  );
};

// Suspended Overlay
const SuspendedOverlay: React.FC<{ onPayment: () => void }> = ({ onPayment }) => {
  const { canExport } = useLicenseStore();

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <span className="material-icons text-red-600 text-3xl">schedule</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Cần gia hạn</h2>
        <p className="text-gray-600 mb-6">
          Tài khoản của bạn cần được gia hạn để tiếp tục sử dụng đầy đủ tính năng.
          Vui lòng thanh toán để tiếp tục.
        </p>

        <div className="space-y-3">
          <button
            onClick={onPayment}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Gia hạn ngay
          </button>

          {canExport && (
            <p className="text-sm text-gray-500">
              Bạn vẫn có thể xem và xuất dữ liệu đã có
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Subscription Modal
const SubscriptionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const plans = [
    { id: 'GROWTH', name: 'Growth', price: '299.000', features: ['5.000 bút toán/năm', '10 tỷ doanh thu', '3 người dùng'] },
    { id: 'PRO', name: 'Pro', price: '599.000', features: ['Không giới hạn bút toán', 'Xây lắp, Sản xuất', '10 người dùng'] },
    { id: 'ENTERPRISE', name: 'Enterprise', price: 'Liên hệ', features: ['Custom', 'Tích hợp API', 'Hỗ trợ ưu tiên'] }
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h2 className="text-2xl font-bold">Chọn gói phù hợp</h2>
          <p className="text-blue-100 mt-1">Nâng cấp để tiếp tục sử dụng đầy đủ tính năng</p>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {plan.price}
                  {plan.price !== 'Liên hệ' && <span className="text-sm font-normal text-gray-500">/tháng</span>}
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <span className="material-icons text-green-500 text-sm">check</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full mt-6 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Chọn gói
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 text-gray-600 hover:text-gray-800">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// Get hardware fingerprint helper
const getFingerprint = async (): Promise<string> => {
  if (window.electronAPI?.getMachineId) {
    return await window.electronAPI.getMachineId();
  }
  // Browser fallback
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height
  ];
  const data = components.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Main LicenseGate Component
export const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
  const {
    token,
    clsState,
    setToken,
    setCompanyInfo,
    validateSession,
    clearSession
  } = useLicenseStore();

  const needsValidation = useNeedsValidation();
  const warningMessage = useBillingWarningMessage();

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);

  // Fetch captcha
  const fetchCaptcha = async () => {
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/auth/captcha`);
      const result = await response.json();
      if (result.success) {
        setCaptchaQuestion(result.data.question);
      }
    } catch (error) {
      console.error('Failed to fetch captcha:', error);
    }
  };

  // Handle login
  const handleLogin = async (data: LoginFormData) => {
    setLoginError(null);
    setIsLoading(true);

    try {
      const fingerprint = await getFingerprint();

      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_id: data.taxId,
          password: data.password,
          hardware_fingerprint: fingerprint,
          captcha_token: data.captchaAnswer || undefined
        })
      });

      const result = await response.json();

      if (!result.success) {
        if (result.requires_captcha) {
          setRequiresCaptcha(true);
          await fetchCaptcha();
        }
        throw new Error(result.error || 'Đăng nhập thất bại');
      }

      // Login successful
      setToken(result.data.token);
      setCompanyInfo({
        id: result.data.company.id,
        taxId: result.data.company.tax_id,
        companyName: result.data.company.company_name,
        clsState: result.data.company.cls_state,
        billingWarning: result.data.company.billing_warning,
        gracePeriodEndsAt: result.data.company.grace_period_ends_at,
        currentPlan: result.data.company.current_plan,
        canCreateVouchers: result.data.company.can_create_vouchers,
        canExport: result.data.company.can_export,
        message: result.data.company.message
      });

      setRequiresCaptcha(false);
      setCaptchaQuestion(null);
    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate session on mount and periodically
  useEffect(() => {
    const doValidation = async () => {
      if (token && needsValidation) {
        setIsLoading(true);
        try {
          await validateSession();
        } catch (error) {
          console.error('Session validation failed:', error);
          clearSession();
        } finally {
          setIsLoading(false);
        }
      }
    };

    doValidation();
  }, [token, needsValidation, validateSession, clearSession]);

  // Show login form if not authenticated
  if (!token) {
    return (
      <LoginForm
        onLogin={handleLogin}
        error={loginError}
        loading={isLoading}
        requiresCaptcha={requiresCaptcha}
        captchaQuestion={captchaQuestion}
      />
    );
  }

  // Show loading while validating
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 animate-pulse">
            <span className="material-icons text-blue-600 text-3xl">verified</span>
          </div>
          <p className="text-gray-600">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Render app with appropriate overlays
  return (
    <>
      {/* Billing warning banner */}
      {warningMessage && clsState === 'PRE_BILLING' && (
        <BillingWarningBanner
          message={warningMessage}
          onUpgrade={() => setShowSubscription(true)}
        />
      )}

      {/* Suspended overlay */}
      {clsState === 'SUSPENDED' && (
        <SuspendedOverlay onPayment={() => setShowSubscription(true)} />
      )}

      {/* Main app content */}
      {children}

      {/* Subscription modal */}
      {showSubscription && (
        <SubscriptionModal onClose={() => setShowSubscription(false)} />
      )}
    </>
  );
};

export default LicenseGate;
