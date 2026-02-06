/**
 * Seed: Chart of Accounts (Hệ thống tài khoản Doanh nghiệp TT 99/2025)
 * Theo Thông tư 99/2025/TT-BTC - Hiệu lực từ 01/01/2026
 */

const { ALL_ACCOUNTS_TT99 } = require('../dn_tt99_accounts');
const logger = require('../src/utils/logger');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
    // Clear existing accounts
    await knex('chart_of_accounts').del();

    // Insert Enterprise accounts from TT99
    const accounts = ALL_ACCOUNTS_TT99.map(acc => ({
        account_code: acc.code,
        account_name: acc.name,
        category: acc.category,
        type: acc.type,
        tt99_class: acc.tt99_class,
        is_off_balance: acc.is_off_balance || 0,
        is_active: true
    }));

    // Insert in batches to avoid SQLite limits
    const batchSize = 50;
    for (let i = 0; i < accounts.length; i += batchSize) {
        await knex('chart_of_accounts').insert(accounts.slice(i, i + batchSize));
    }

    logger.info(`[SEED] Chart of Accounts: ${accounts.length} tài khoản theo TT 99/2025`);
};
