/**
 * Seed: Chart of Accounts (Hệ thống tài khoản HCSN TT24)
 */

const { ALL_ACCOUNTS_TT24 } = require('../hcsn_tt24_accounts');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
    // Clear existing accounts
    await knex('chart_of_accounts').del();

    // Insert HCSN accounts from TT24
    const accounts = ALL_ACCOUNTS_TT24.map(acc => ({
        account_code: acc.code,
        account_name: acc.name,
        category: acc.category,
        type: acc.type,
        tt24_class: acc.tt24_class,
        is_off_balance: acc.is_off_balance || 0,
        is_active: true
    }));

    // Insert in batches to avoid SQLite limits
    const batchSize = 50;
    for (let i = 0; i < accounts.length; i += batchSize) {
        await knex('chart_of_accounts').insert(accounts.slice(i, i + batchSize));
    }

    console.log(`Seeded ${accounts.length} HCSN accounts`);
};
