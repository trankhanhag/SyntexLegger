/**
 * Migration: Fix FK Triggers
 * Makes FK validation triggers more lenient by allowing empty/null values
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Drop overly strict triggers
    await knex.raw('DROP TRIGGER IF EXISTS fk_voucher_items_voucher_id').catch(() => {});
    await knex.raw('DROP TRIGGER IF EXISTS fk_general_ledger_account_code').catch(() => {});
    await knex.raw('DROP TRIGGER IF EXISTS fk_receivables_partner_code').catch(() => {});
    await knex.raw('DROP TRIGGER IF EXISTS fk_payables_partner_code').catch(() => {});

    // Recreate with more lenient validation (allow NULL and empty)

    // voucher_items.voucher_id - only validate if not NULL/empty
    await knex.raw(`
        CREATE TRIGGER IF NOT EXISTS fk_voucher_items_voucher_id_v2
        BEFORE INSERT ON voucher_items
        FOR EACH ROW
        WHEN NEW.voucher_id IS NOT NULL AND NEW.voucher_id != ''
        BEGIN
            SELECT RAISE(ABORT, 'FK violation: voucher_id not found')
            WHERE NOT EXISTS (SELECT 1 FROM vouchers WHERE id = NEW.voucher_id);
        END;
    `).catch(() => {});

    // general_ledger.account_code - only validate if not NULL/empty
    await knex.raw(`
        CREATE TRIGGER IF NOT EXISTS fk_general_ledger_account_code_v2
        BEFORE INSERT ON general_ledger
        FOR EACH ROW
        WHEN NEW.account_code IS NOT NULL AND NEW.account_code != ''
        BEGIN
            SELECT RAISE(ABORT, 'FK violation: account_code not found')
            WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = NEW.account_code);
        END;
    `).catch(() => {});

    // receivables.partner_code - only validate if not NULL/empty
    const hasReceivables = await knex.schema.hasTable('receivables');
    if (hasReceivables) {
        await knex.raw(`
            CREATE TRIGGER IF NOT EXISTS fk_receivables_partner_code_v2
            BEFORE INSERT ON receivables
            FOR EACH ROW
            WHEN NEW.partner_code IS NOT NULL AND NEW.partner_code != ''
            BEGIN
                SELECT RAISE(ABORT, 'FK violation: partner_code not found')
                WHERE NOT EXISTS (SELECT 1 FROM partners WHERE partner_code = NEW.partner_code);
            END;
        `).catch(() => {});
    }

    // payables.partner_code - only validate if not NULL/empty
    const hasPayables = await knex.schema.hasTable('payables');
    if (hasPayables) {
        await knex.raw(`
            CREATE TRIGGER IF NOT EXISTS fk_payables_partner_code_v2
            BEFORE INSERT ON payables
            FOR EACH ROW
            WHEN NEW.partner_code IS NOT NULL AND NEW.partner_code != ''
            BEGIN
                SELECT RAISE(ABORT, 'FK violation: partner_code not found')
                WHERE NOT EXISTS (SELECT 1 FROM partners WHERE partner_code = NEW.partner_code);
            END;
        `).catch(() => {});
    }

    console.log('[MIGRATION] FK triggers fixed with lenient validation');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw('DROP TRIGGER IF EXISTS fk_voucher_items_voucher_id_v2').catch(() => {});
    await knex.raw('DROP TRIGGER IF EXISTS fk_general_ledger_account_code_v2').catch(() => {});
    await knex.raw('DROP TRIGGER IF EXISTS fk_receivables_partner_code_v2').catch(() => {});
    await knex.raw('DROP TRIGGER IF EXISTS fk_payables_partner_code_v2').catch(() => {});

    console.log('[MIGRATION] FK triggers removed');
};
