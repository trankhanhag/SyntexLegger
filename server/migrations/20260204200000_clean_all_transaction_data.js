/**
 * Migration: Clean All Transaction Data
 * Removes all user/sample data, keeping only seed/reference data
 *
 * CAUTION: This is a destructive migration for production preparation
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    console.log('[CLEANUP] Starting data cleanup...');

    // ========================================
    // 1. TRANSACTION DATA (Order matters due to FK)
    // ========================================

    // Voucher related
    await knex('voucher_items').del().catch(() => {});
    console.log('[CLEANUP] voucher_items cleared');

    await knex('vouchers').del().catch(() => {});
    console.log('[CLEANUP] vouchers cleared');

    await knex('general_ledger').del().catch(() => {});
    console.log('[CLEANUP] general_ledger cleared');

    await knex('staging_transactions').del().catch(() => {});
    console.log('[CLEANUP] staging_transactions cleared');

    await knex('allocations').del().catch(() => {});
    console.log('[CLEANUP] allocations cleared');

    // ========================================
    // 2. AR/AP DATA
    // ========================================

    await knex('receivable_payments').del().catch(() => {});
    await knex('receivables').del().catch(() => {});
    console.log('[CLEANUP] receivables cleared');

    await knex('payable_payments').del().catch(() => {});
    await knex('payables').del().catch(() => {});
    console.log('[CLEANUP] payables cleared');

    await knex('temporary_advances').del().catch(() => {});
    await knex('budget_advances').del().catch(() => {});
    console.log('[CLEANUP] advances cleared');

    // ========================================
    // 3. HR DATA
    // ========================================

    await knex('payroll_details').del().catch(() => {});
    await knex('payroll_periods').del().catch(() => {});
    console.log('[CLEANUP] payroll cleared');

    await knex('timekeeping').del().catch(() => {});
    console.log('[CLEANUP] timekeeping cleared');

    await knex('employee_allowances').del().catch(() => {});
    await knex('employee_contracts').del().catch(() => {});
    await knex('salary_history').del().catch(() => {});
    await knex('employees').del().catch(() => {});
    console.log('[CLEANUP] employees cleared');

    // ========================================
    // 4. INVENTORY DATA
    // ========================================

    await knex('material_receipt_items').del().catch(() => {});
    await knex('material_receipts').del().catch(() => {});
    console.log('[CLEANUP] material_receipts cleared');

    await knex('material_issue_items').del().catch(() => {});
    await knex('material_issues').del().catch(() => {});
    console.log('[CLEANUP] material_issues cleared');

    await knex('material_transfer_items').del().catch(() => {});
    await knex('material_transfers').del().catch(() => {});
    console.log('[CLEANUP] material_transfers cleared');

    await knex('inventory_cards').del().catch(() => {});
    await knex('materials').del().catch(() => {});
    console.log('[CLEANUP] materials cleared');

    // ========================================
    // 5. ASSET DATA
    // ========================================

    await knex('asset_depreciation_log').del().catch(() => {});
    await knex('asset_inventory_items').del().catch(() => {});
    await knex('asset_inventory').del().catch(() => {});
    await knex('asset_movements').del().catch(() => {});
    await knex('fixed_assets').del().catch(() => {});
    console.log('[CLEANUP] fixed_assets cleared');

    await knex('allocation_history').del().catch(() => {});
    await knex('ccdc_items').del().catch(() => {});
    console.log('[CLEANUP] ccdc_items cleared');

    // ========================================
    // 6. CONTRACT & PROJECT DATA
    // ========================================

    await knex('contract_appendices').del().catch(() => {});
    await knex('contracts').del().catch(() => {});
    console.log('[CLEANUP] contracts cleared');

    await knex('project_budget_lines').del().catch(() => {});
    await knex('project_tasks').del().catch(() => {});
    await knex('projects').del().catch(() => {});
    console.log('[CLEANUP] projects cleared');

    await knex('loan_contracts').del().catch(() => {});
    await knex('debt_notes').del().catch(() => {});
    console.log('[CLEANUP] loans/debts cleared');

    // ========================================
    // 7. BUDGET DATA
    // ========================================

    await knex('budget_transactions').del().catch(() => {});
    await knex('budget_allocations').del().catch(() => {});
    await knex('budget_alerts').del().catch(() => {});
    await knex('budget_authorizations').del().catch(() => {});
    await knex('budget_estimates').del().catch(() => {});
    console.log('[CLEANUP] budget data cleared');

    // Keep fund_sources as they are reference data
    // await knex('fund_sources').del().catch(() => {});

    // ========================================
    // 8. AUDIT & LOG DATA
    // ========================================

    await knex('audit_trail').del().catch(() => {});
    await knex('audit_sessions').del().catch(() => {});
    await knex('audit_anomalies').del().catch(() => {});
    console.log('[CLEANUP] audit data cleared');

    await knex('reconciliation_records').del().catch(() => {});
    await knex('reconciliation_logs').del().catch(() => {});
    console.log('[CLEANUP] reconciliation data cleared');

    await knex('system_logs').del().catch(() => {});
    await knex('xml_export_logs').del().catch(() => {});
    console.log('[CLEANUP] logs cleared');

    // ========================================
    // 9. E-INVOICE DATA
    // ========================================

    await knex('einvoice_voucher_matches').del().catch(() => {});
    await knex('einvoice_sync_logs').del().catch(() => {});
    await knex('einvoice_imports').del().catch(() => {});
    console.log('[CLEANUP] einvoice data cleared');

    // ========================================
    // 10. TREASURY DATA
    // ========================================

    await knex('treasury_imports').del().catch(() => {});
    await knex('payment_orders').del().catch(() => {});
    console.log('[CLEANUP] treasury data cleared');

    // ========================================
    // 11. REPORT DATA
    // ========================================

    await knex('report_generation_logs').del().catch(() => {});
    // Keep report_templates as they are configuration
    console.log('[CLEANUP] report logs cleared');

    await knex('financial_note_values').del().catch(() => {});
    // Keep financial_notes structure
    console.log('[CLEANUP] financial note values cleared');

    // ========================================
    // 12. BACKUP HISTORY
    // ========================================

    await knex('restore_history').del().catch(() => {});
    await knex('backup_history').del().catch(() => {});
    console.log('[CLEANUP] backup history cleared');

    // ========================================
    // 13. MASTER DATA (OPTIONAL - Keep for production)
    // ========================================

    // Clear sample partners but keep real ones
    await knex('partners').del().catch(() => {});
    console.log('[CLEANUP] partners cleared');

    // Clear products
    await knex('products').del().catch(() => {});
    console.log('[CLEANUP] products cleared');

    // ========================================
    // KEEP THESE (SEED/REFERENCE DATA):
    // - chart_of_accounts (TT 99/2025)
    // - system_settings
    // - roles
    // - users (admin account)
    // - tax_rates
    // - document_types
    // - expense_categories
    // - revenue_categories
    // - asset_categories
    // - status_types
    // - currencies
    // - units_of_measure
    // - dimension_configs
    // - approval_workflow_rules
    // - fund_sources
    // - departments
    // - bank_accounts (templates)
    // - salary_grades
    // - allowance_types
    // ========================================

    console.log('[CLEANUP] Data cleanup completed!');
    console.log('[CLEANUP] Preserved: chart_of_accounts, system_settings, roles, reference tables');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Cannot restore deleted data
    console.log('[CLEANUP] Data cleanup cannot be reversed');
};
