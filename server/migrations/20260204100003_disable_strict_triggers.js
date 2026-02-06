/**
 * Migration: Disable Strict FK Triggers
 * Removes FK validation triggers that are too restrictive
 * Relies on application-level validation instead
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Drop all FK validation triggers
    const triggers = [
        'fk_voucher_items_voucher_id',
        'fk_voucher_items_voucher_id_v2',
        'fk_general_ledger_account_code',
        'fk_general_ledger_account_code_v2',
        'fk_receivables_partner_code',
        'fk_receivables_partner_code_v2',
        'fk_payables_partner_code',
        'fk_payables_partner_code_v2',
    ];

    for (const trigger of triggers) {
        await knex.raw(`DROP TRIGGER IF EXISTS ${trigger}`).catch(() => {});
    }

    console.log('[MIGRATION] Strict FK triggers disabled - using application-level validation');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // No restoration - triggers were causing issues
    console.log('[MIGRATION] No trigger restoration');
};
