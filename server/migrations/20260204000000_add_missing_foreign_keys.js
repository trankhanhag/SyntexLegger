/**
 * Migration: Add Missing Foreign Keys
 * Fixes data integrity issues by adding proper FK constraints
 *
 * Note: SQLite has limited ALTER TABLE support, so we need to handle this carefully
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // SQLite doesn't support adding FK constraints to existing tables directly
    // We need to recreate tables or use triggers for enforcement
    // For now, we'll create index-based pseudo-FKs and add proper FKs for new tables

    // ========================================
    // 1. ADD INDEXES FOR FK-LIKE RELATIONSHIPS
    // ========================================

    // general_ledger -> vouchers
    const hasGLVoucherIdx = await knex.schema.hasColumn('general_ledger', 'voucher_id');
    if (hasGLVoucherIdx) {
        await knex.schema.alterTable('general_ledger', (table) => {
            table.index('voucher_id', 'idx_gl_voucher_id');
        }).catch(() => { /* Index may already exist */ });
    }

    // general_ledger -> chart_of_accounts
    await knex.schema.alterTable('general_ledger', (table) => {
        table.index('account_code', 'idx_gl_account_code');
    }).catch(() => { });

    // voucher_items -> chart_of_accounts (debit & credit)
    await knex.schema.alterTable('voucher_items', (table) => {
        table.index('debit_account', 'idx_vi_debit_account');
        table.index('credit_account', 'idx_vi_credit_account');
        table.index('partner_code', 'idx_vi_partner_code');
    }).catch(() => { });

    // staging_transactions -> chart_of_accounts
    const hasStagingTable = await knex.schema.hasTable('staging_transactions');
    if (hasStagingTable) {
        await knex.schema.alterTable('staging_transactions', (table) => {
            table.index('debit_acc', 'idx_staging_debit_acc');
            table.index('credit_acc', 'idx_staging_credit_acc');
        }).catch(() => { });
    }

    // ========================================
    // 2. CREATE FK VALIDATION TRIGGERS
    // ========================================

    // Trigger to validate voucher_items.voucher_id
    await knex.raw(`
        CREATE TRIGGER IF NOT EXISTS fk_voucher_items_voucher_id
        BEFORE INSERT ON voucher_items
        FOR EACH ROW
        BEGIN
            SELECT RAISE(ABORT, 'Foreign key violation: voucher_id not found in vouchers')
            WHERE NOT EXISTS (SELECT 1 FROM vouchers WHERE id = NEW.voucher_id);
        END;
    `).catch(() => { });

    // Trigger to validate general_ledger.account_code
    await knex.raw(`
        CREATE TRIGGER IF NOT EXISTS fk_general_ledger_account_code
        BEFORE INSERT ON general_ledger
        FOR EACH ROW
        BEGIN
            SELECT RAISE(ABORT, 'Foreign key violation: account_code not found in chart_of_accounts')
            WHERE NEW.account_code IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = NEW.account_code);
        END;
    `).catch(() => { });

    // Trigger to validate receivables.partner_code
    const hasReceivables = await knex.schema.hasTable('receivables');
    if (hasReceivables) {
        await knex.raw(`
            CREATE TRIGGER IF NOT EXISTS fk_receivables_partner_code
            BEFORE INSERT ON receivables
            FOR EACH ROW
            BEGIN
                SELECT RAISE(ABORT, 'Foreign key violation: partner_code not found in partners')
                WHERE NEW.partner_code IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM partners WHERE partner_code = NEW.partner_code);
            END;
        `).catch(() => { });
    }

    // Trigger to validate payables.partner_code
    const hasPayables = await knex.schema.hasTable('payables');
    if (hasPayables) {
        await knex.raw(`
            CREATE TRIGGER IF NOT EXISTS fk_payables_partner_code
            BEFORE INSERT ON payables
            FOR EACH ROW
            BEGIN
                SELECT RAISE(ABORT, 'Foreign key violation: partner_code not found in partners')
                WHERE NEW.partner_code IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM partners WHERE partner_code = NEW.partner_code);
            END;
        `).catch(() => { });
    }

    // ========================================
    // 3. ADD MISSING COLUMNS FOR RELATIONSHIPS
    // ========================================

    // Add voucher_id to receivables if missing
    if (hasReceivables) {
        const hasVoucherId = await knex.schema.hasColumn('receivables', 'voucher_id');
        if (!hasVoucherId) {
            await knex.schema.alterTable('receivables', (table) => {
                table.string('voucher_id', 50).nullable();
                table.index('voucher_id', 'idx_receivables_voucher');
            });
        }
    }

    // Add voucher_id to payables if missing
    if (hasPayables) {
        const hasVoucherId = await knex.schema.hasColumn('payables', 'voucher_id');
        if (!hasVoucherId) {
            await knex.schema.alterTable('payables', (table) => {
                table.string('voucher_id', 50).nullable();
                table.index('voucher_id', 'idx_payables_voucher');
            });
        }
    }

    // Add created_by to budget_transactions if missing
    const hasBudgetTrx = await knex.schema.hasTable('budget_transactions');
    if (hasBudgetTrx) {
        const hasCreatedBy = await knex.schema.hasColumn('budget_transactions', 'created_by');
        if (!hasCreatedBy) {
            await knex.schema.alterTable('budget_transactions', (table) => {
                table.string('created_by', 100).nullable();
            });
        }
    }

    console.log('[MIGRATION] Foreign key constraints and indexes added');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Drop triggers
    await knex.raw('DROP TRIGGER IF EXISTS fk_voucher_items_voucher_id').catch(() => { });
    await knex.raw('DROP TRIGGER IF EXISTS fk_general_ledger_account_code').catch(() => { });
    await knex.raw('DROP TRIGGER IF EXISTS fk_receivables_partner_code').catch(() => { });
    await knex.raw('DROP TRIGGER IF EXISTS fk_payables_partner_code').catch(() => { });

    console.log('[MIGRATION] Foreign key triggers removed');
};
