import { useEffect, useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Ribbon, type RibbonAction } from './components/Ribbon';

import { Sidebar } from './components/Sidebar';
import { Reports } from './components/Reports';
import { CashModule } from './components/CashModule';
import { TaxModule } from './components/TaxModule';
import { AssetModule } from './components/AssetModule';
import { DebtManagementModule } from './components/DebtManagementModule';
import { SystemModule } from './components/SystemModule';
import { HRModule } from './components/HRModule';
import { RevenueModule } from './components/RevenueModule';
import { ExpenseModule } from './components/ExpenseModule';
import { InventoryModule } from './components/InventoryModule';
import { PurchaseModule } from './components/PurchaseModule';
import { SalesModule } from './components/SalesModule';
import { ContractModule } from './components/ContractModule';
import { ProjectModule } from './components/ProjectModule';
import { DimensionModule } from './components/DimensionModule';
import { GeneralModuleV2 as GeneralModule } from './components/GeneralModuleV2';

import { Footer } from './components/Footer';
import { VirtualAuditHealthCheck } from './components/AuditModal';
import { MacroSequence } from './components/MacroSequence';
import { RightSidebar } from './components/RightSidebar';
import { KeyboardShortcutsPanelWrapper } from './components/KeyboardShortcutsPanel';
import { SearchCommandPalette, useSearchCommandPalette } from './components/SearchCommandPalette';
import api from './api';
import logger from './utils/logger';

function App() {
  // Load state from localStorage on init
  const savedState = JSON.parse(localStorage.getItem('app_navigation_state') || '{}');

  const [activeTab, setActiveTab] = useState(savedState.activeTab || 'dashboard');
  const [navigationData, setNavigationData] = useState<any>(null);
  const [dashboardView, setDashboardView] = useState(savedState.dashboardView || 'dashboard');
  const [generalView, setGeneralView] = useState(savedState.generalView || 'voucher_list');
  const [reportView, setReportView] = useState(savedState.reportView || 'balance_sheet');
  const [revenueView, setRevenueView] = useState(savedState.revenueView || 'receipt');
  const [cashView, setCashView] = useState(savedState.cashView || 'list');
  const [purchaseView, setPurchaseView] = useState(savedState.purchaseView || 'overview');
  const [salesView, setSalesView] = useState(savedState.salesView || 'overview');
  const [loanView, setLoanView] = useState(savedState.loanView || 'temp_advances');
  const [taxView, setTaxView] = useState(savedState.taxView || 'vat');
  const [expenseView, setExpenseView] = useState(savedState.expenseView || 'voucher');
  const [inventoryView, setInventoryView] = useState(savedState.inventoryView || 'receipt');
  const [assetView, setAssetView] = useState(savedState.assetView || 'list');
  const [hrView, setHrView] = useState(savedState.hrView || 'employees');
  const [contractView, setContractView] = useState(savedState.contractView || 'sales');
  const [projectView, setProjectView] = useState(savedState.projectView || 'list');
  const [dimView, setDimView] = useState(savedState.dimView || 'overview');
  const [sysView, setSysView] = useState(savedState.sysView || 'params');
  const [printSignal, setPrintSignal] = useState(0);
  const [exportSignal, setExportSignal] = useState(0);
  const [importSignal, setImportSignal] = useState(0);

  // Sync state to localStorage
  useEffect(() => {
    const state = {
      activeTab, dashboardView, generalView, reportView, revenueView, cashView,
      purchaseView, salesView, loanView, taxView, expenseView, inventoryView, assetView, hrView,
      contractView, projectView, dimView, sysView
    };
    localStorage.setItem('app_navigation_state', JSON.stringify(state));
  }, [activeTab, dashboardView, generalView, reportView, revenueView, cashView,
    purchaseView, salesView, loanView, taxView, expenseView, inventoryView, assetView, hrView,
    contractView, projectView, dimView, sysView]);

  // Compute active view for Sidebar highlighting
  const activeView = useMemo(() => {
    const viewMap: Record<string, string> = {
      dashboard: dashboardView,
      general: generalView,
      report: reportView,
      revenue: revenueView,
      cash: cashView,
      purchase: purchaseView,
      sales: salesView,
      loan: loanView,
      tax: taxView,
      expense: expenseView,
      inventory: inventoryView,
      asset: assetView,
      hr: hrView,
      contract: contractView,
      project: projectView,
      dimension: dimView,
      system: sysView
    };
    return viewMap[activeTab];
  }, [activeTab, dashboardView, generalView, reportView, revenueView, cashView,
    purchaseView, salesView, loanView, taxView, expenseView, inventoryView, assetView, hrView,
    contractView, projectView, dimView, sysView]);

  // Page Header State (title, icon, and actions to be shown in Ribbon)
  const [pageHeader, setPageHeader] = useState<{ title?: string; icon?: string; actions?: RibbonAction[]; onDelete?: () => void }>({});

  const resetHeader = () => setPageHeader({});

  // Global Overlay Modals
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showMacroModal, setShowMacroModal] = useState(false);

  // Mobile Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search Command Palette
  const searchPalette = useSearchCommandPalette();

  useEffect(() => {
    const autoLoginEnabled = import.meta.env.VITE_DISABLE_AUTO_LOGIN !== 'true';
    const autoLoginUser = import.meta.env.VITE_AUTOLOGIN_USERNAME || 'admin';
    const autoLoginPassword = import.meta.env.VITE_AUTOLOGIN_PASSWORD || 'admin';

    if (!autoLoginEnabled) return;

    const autoLogin = async () => {
      try {
        // Auto login for MVP to get token
        const response = await api.post('/login', { username: autoLoginUser, password: autoLoginPassword });
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          logger.info('Auto-login successful');
        }
      } catch (error) {
        logger.error('Auto-login failed', error);
      }
    };
    autoLogin();
  }, []);

  const handleNavigate = (viewId: string, data?: any) => {
    setPrintSignal(0); // Synchronously reset print signal
    setNavigationData(data);

    // Global Modals (No tab change)
    if (viewId === 'audit') {
      setShowAuditModal(true);
      return;
    }
    if (viewId === 'closing_macro') {
      setShowMacroModal(true);
      return;
    }

    if (viewId === 'dashboard') {
      setActiveTab('dashboard');
      setDashboardView('dashboard');
      return;
    }
    if (viewId === 'overdue_inv') {
      setActiveTab('dashboard');
      setDashboardView('overdue_inv');
      return;
    }
    if (viewId === 'incomplete_docs') {
      setActiveTab('dashboard');
      setDashboardView('incomplete_docs');
      return;
    }

    const generalViews = new Set([
      'voucher',
      'voucher_list',
      'closing',
      'check',
      'allocation',
      'revaluation',
      'locking',
      'account_list',
      'opening_balance',
    ]);

    // cost_item, cost_revenue -> general; cost_analysis -> report
    if (generalViews.has(viewId) || (viewId.startsWith('cost_') && viewId !== 'cost_analysis')) {
      setActiveTab('general');
      setGeneralView(viewId);
      return;
    }

    const reportViews = new Set([
      // === BÁO CÁO TÀI CHÍNH DN (TT 99/2025) ===
      'balance_sheet_dn',
      'profit_loss',
      'cash_flow_dn',
      'notes_fs',
      // === BÁO CÁO PHÂN TÍCH ===
      'budget_performance',
      'profitability_analysis',
      'cost_analysis',
      'financial_analysis',
      // === SỔ KẾ TOÁN ===
      'trial_balance',
      'ledger',
      'general_ledger',
      'cash_book',
      'bank_book',
      // === SỔ CHI TIẾT ===
      'inventory_summary',
      'inventory_ledger',
      'debt_ledger',
      // === KHÁC ===
      'transaction_details',
      'custom_report',
      'xml_export',
    ]);

    if (viewId === 'project_pnl' && activeTab === 'project') {
      setActiveTab('project');
      setProjectView('pnl');
      return;
    }

    if (reportViews.has(viewId)) {
      setActiveTab('report');
      setReportView(viewId);
      return;
    }

    if (viewId.startsWith('revenue_')) {
      setActiveTab('revenue');
      setRevenueView(viewId.replace('revenue_', ''));
      return;
    }
    if (viewId.startsWith('expense_')) {
      setActiveTab('expense');
      setExpenseView(viewId.replace('expense_', ''));
      return;
    }
    if (viewId.startsWith('tax_')) {
      setActiveTab('tax');
      setTaxView(viewId.replace('tax_', ''));
      return;
    }
    if (viewId.startsWith('inventory_')) {
      setActiveTab('inventory');
      setInventoryView(viewId.replace('inventory_', ''));
      return;
    }
    if (viewId.startsWith('cash_')) {
      setActiveTab('cash');
      setCashView(viewId.replace('cash_', ''));
      return;
    }
    if (viewId.startsWith('loan_')) {
      setActiveTab('loan');
      setLoanView(viewId.replace('loan_', ''));
      return;
    }
    if (viewId.startsWith('asset_') || viewId.startsWith('infra_') || viewId.startsWith('invest_')) {
      setActiveTab('asset');
      setAssetView(viewId);
      return;
    }
    if (viewId.startsWith('hr_')) {
      setActiveTab('hr');
      setHrView(viewId.replace('hr_', ''));
      return;
    }
    // Logic prefix cũ đã bao phủ trường hợp này sau khi update Sidebar
    // Xóa block Set logic gây conflict 'tracking'
    // Fallthrough to prefix checks below

    if (viewId.startsWith('contract_')) {
      setActiveTab('contract');
      setContractView(viewId.replace('contract_', ''));
      return;
    }
    if (viewId.startsWith('project_')) {
      setActiveTab('project');
      setProjectView(viewId.replace('project_', ''));
      return;
    }
    if (viewId.startsWith('dim_')) {
      setActiveTab('dimension');
      setDimView(viewId.replace('dim_', ''));
      return;
    }


    if (viewId.startsWith('sys_')) {
      setActiveTab('system');
      setSysView(viewId.replace('sys_', ''));
      return;
    }
    if (viewId.startsWith('fund_')) {
      setActiveTab('general');
      setGeneralView(viewId);
      return;
    }

    // General Accounting Views
    if (['voucher', 'voucher_list', 'check', 'closing', 'allocation', 'revaluation', 'locking', 'account_list', 'cost_item', 'opening_balance'].includes(viewId)) {
      setActiveTab('general');
      setGeneralView(viewId === 'voucher' ? 'voucher_list' : viewId);
      return;
    }

    // Purchase module navigation
    if (viewId.startsWith('purchase_') || viewId === 'vendor_list') {
      setActiveTab('purchase');
      setPurchaseView(viewId);
      return;
    }
    // Sales module navigation
    if (viewId.startsWith('sales_') || viewId === 'customer_list') {
      setActiveTab('sales');
      setSalesView(viewId);
      return;
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-hidden h-screen flex flex-col group/design-root">
      <Header onSearch={searchPalette.open} />
      <Ribbon
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          resetHeader(); // Reset header on tab change
          setNavigationData(null); // Clear navigation data
          setGeneralView('overview');
          setReportView('overview');
          setRevenueView('overview');
          setCashView('overview');
          setPurchaseView('overview');
          setSalesView('overview');
          setLoanView('overview');
          setTaxView('overview');
          setExpenseView('overview');
          setInventoryView('overview');
          setAssetView('overview');
          setHrView('overview');
          setContractView('overview');
          setProjectView('overview');
          setDimView('overview');
          setSysView('overview');
          setDashboardView('dashboard');
          setPrintSignal(0);
        }}
        onPrint={() => setPrintSignal(s => s + 1)}
        onExport={() => setExportSignal(s => s + 1)}
        onImport={() => setImportSignal(s => s + 1)}
        onAudit={() => handleNavigate('audit')}
        onRunMacro={() => setShowMacroModal(true)}
        onDelete={pageHeader.onDelete}
        title={pageHeader.title}
        icon={pageHeader.icon}
        actions={pageHeader.actions}
      />

      <div className="flex-1 flex overflow-hidden bg-slate-100 dark:bg-slate-900">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all"
          aria-label="Mở menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <Sidebar
          activeTab={activeTab}
          activeView={activeView}
          onNavigate={(view) => {
            handleNavigate(view);
            setIsMobileSidebarOpen(false); // Close sidebar after navigation on mobile
          }}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
        <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative">
          {activeTab === 'dashboard' && <Dashboard subView={dashboardView} onNavigate={handleNavigate} />}
          {activeTab === 'general' && (
            <GeneralModule
              subView={generalView}
              onCloseModal={() => setGeneralView('voucher_list')}
              printSignal={printSignal}
              exportSignal={exportSignal}
              importSignal={importSignal}
              onSetHeader={setPageHeader}
              onNavigate={handleNavigate}
              navigationData={navigationData}
              onClearNavigation={() => setNavigationData(null)}
            />
          )}
          {activeTab === 'report' && <Reports subView={reportView} printSignal={printSignal} exportSignal={exportSignal} importSignal={importSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'cash' && <CashModule subView={cashView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'purchase' && <PurchaseModule subView={purchaseView} printSignal={printSignal} exportSignal={exportSignal} importSignal={importSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'sales' && <SalesModule subView={salesView} printSignal={printSignal} exportSignal={exportSignal} importSignal={importSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'tax' && <TaxModule subView={taxView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'revenue' && <RevenueModule subView={revenueView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'expense' && <ExpenseModule subView={expenseView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'inventory' && <InventoryModule subView={inventoryView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'asset' && <AssetModule subView={assetView} onCloseModal={() => setAssetView('list')} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'loan' && <DebtManagementModule subView={loanView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'hr' && <HRModule subView={hrView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'contract' && <ContractModule subView={contractView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'project' && <ProjectModule subView={projectView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
          {activeTab === 'dimension' && <DimensionModule subView={dimView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}

          {activeTab === 'system' && <SystemModule subView={sysView} printSignal={printSignal} onSetHeader={setPageHeader} onNavigate={handleNavigate} />}
        </div>

        <RightSidebar />
      </div>

      {showAuditModal && <VirtualAuditHealthCheck onClose={() => setShowAuditModal(false)} onNavigate={handleNavigate} />}
      {showMacroModal && <MacroSequence onClose={() => setShowMacroModal(false)} onNavigate={handleNavigate} />}

      {/* Search Command Palette - Toggle with Ctrl+K */}
      <SearchCommandPalette isOpen={searchPalette.isOpen} onClose={searchPalette.close} onNavigate={handleNavigate} />

      {/* Keyboard Shortcuts Panel - Toggle with Shift+? */}
      <KeyboardShortcutsPanelWrapper />

      <Footer />
    </div>
  );
}

export default App;
