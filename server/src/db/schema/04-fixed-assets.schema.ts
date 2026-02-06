/**
 * Fixed Assets Schema
 * Tables: fixed_assets, ccdc_items, asset_depreciation_log, allocation_history,
 *         asset_inventory, asset_inventory_items, asset_movements
 */

import { Knex } from 'knex';

export async function createFixedAssetsSchema(knex: Knex): Promise<void> {
  // Fixed Assets table
  if (!(await knex.schema.hasTable('fixed_assets'))) {
    await knex.schema.createTable('fixed_assets', (table) => {
      table.string('id').primary();
      table.string('asset_code').unique().notNullable();
      table.string('asset_name').notNullable();
      table.string('asset_category');
      table.date('acquisition_date');
      table.date('start_depreciation_date');
      table.decimal('cost', 18, 2).defaultTo(0);
      table.integer('life_years').defaultTo(5);
      table.string('depreciation_method').defaultTo('STRAIGHT_LINE');
      table.decimal('accumulated', 18, 2).defaultTo(0);
      table.decimal('residual', 18, 2).defaultTo(0);
      table.string('fund_source_id');
      table.string('department_id');
      table.string('location');
      table.string('serial_number');
      table.string('status').defaultTo('IN_USE');
      table.date('disposal_date');
      table.decimal('disposal_value', 18, 2);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at');
    });
  }

  // CCDC Items (Tools & Equipment) table
  if (!(await knex.schema.hasTable('ccdc_items'))) {
    await knex.schema.createTable('ccdc_items', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.string('category');
      table.decimal('cost', 18, 2).defaultTo(0);
      table.integer('life_months').defaultTo(12);
      table.decimal('allocated', 18, 2).defaultTo(0);
      table.decimal('remaining', 18, 2).defaultTo(0);
      table.date('start_date');
      table.string('fund_source_id');
      table.string('department_id');
      table.string('status').defaultTo('IN_USE');
    });
  }

  // Asset Depreciation Log table
  if (!(await knex.schema.hasTable('asset_depreciation_log'))) {
    await knex.schema.createTable('asset_depreciation_log', (table) => {
      table.string('id').primary();
      table.string('asset_id');
      table.string('period');
      table.decimal('depreciation_amount', 18, 2);
      table.decimal('accumulated_before', 18, 2);
      table.decimal('accumulated_after', 18, 2);
      table.string('voucher_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Allocation History (CCDC) table
  if (!(await knex.schema.hasTable('allocation_history'))) {
    await knex.schema.createTable('allocation_history', (table) => {
      table.string('id').primary();
      table.string('ccdc_id');
      table.string('period');
      table.decimal('allocation_amount', 18, 2);
      table.decimal('allocated_before', 18, 2);
      table.decimal('allocated_after', 18, 2);
      table.string('voucher_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Asset Inventory (Physical Count) table
  if (!(await knex.schema.hasTable('asset_inventory'))) {
    await knex.schema.createTable('asset_inventory', (table) => {
      table.string('id').primary();
      table.string('inventory_no');
      table.date('inventory_date');
      table.string('department_id');
      table.text('note');
      table.string('status').defaultTo('DRAFT');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Asset Inventory Items table
  if (!(await knex.schema.hasTable('asset_inventory_items'))) {
    await knex.schema.createTable('asset_inventory_items', (table) => {
      table.string('id').primary();
      table.string('inventory_id');
      table.string('asset_id');
      table.integer('book_quantity').defaultTo(1);
      table.integer('actual_quantity').defaultTo(1);
      table.integer('difference').defaultTo(0);
      table.text('note');
    });
  }

  // Asset Movements table
  if (!(await knex.schema.hasTable('asset_movements'))) {
    await knex.schema.createTable('asset_movements', (table) => {
      table.string('id').primary();
      table.string('asset_id');
      table.date('movement_date');
      table.string('movement_type'); // TRANSFER, DISPOSAL, REVALUATION
      table.string('from_department');
      table.string('to_department');
      table.string('from_location');
      table.string('to_location');
      table.text('reason');
      table.string('approved_by');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function seedFixedAssetsData(knex: Knex): Promise<void> {
  // Seed sample fixed assets if empty
  const assetCount = await knex('fixed_assets').count('* as count').first();
  if (assetCount && Number(assetCount.count) === 0) {
    await knex('fixed_assets').insert([
      {
        id: 'FA001',
        asset_code: 'TS001',
        asset_name: 'Máy tính Dell Optiplex',
        asset_category: 'OFFICE_EQUIPMENT',
        acquisition_date: '2024-01-15',
        start_depreciation_date: '2024-02-01',
        cost: 25000000,
        life_years: 5,
        depreciation_method: 'STRAIGHT_LINE',
        accumulated: 0,
        residual: 25000000,
        status: 'IN_USE'
      },
      {
        id: 'FA002',
        asset_code: 'TS002',
        asset_name: 'Ô tô Toyota Vios',
        asset_category: 'VEHICLE',
        acquisition_date: '2023-06-01',
        start_depreciation_date: '2023-07-01',
        cost: 550000000,
        life_years: 10,
        depreciation_method: 'STRAIGHT_LINE',
        accumulated: 45833333,
        residual: 504166667,
        status: 'IN_USE'
      }
    ]);
  }
}
