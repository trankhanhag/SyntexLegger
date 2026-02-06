/**
 * Inventory Schema
 * Tables: materials, material_receipts, material_receipt_items,
 *         material_issues, material_issue_items, material_transfers,
 *         material_transfer_items, inventory_cards, products
 */

import { Knex } from 'knex';

export async function createInventorySchema(knex: Knex): Promise<void> {
  // Materials (Inventory Items) table
  if (!(await knex.schema.hasTable('materials'))) {
    await knex.schema.createTable('materials', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.string('category');
      table.string('unit');
      table.decimal('unit_price', 18, 2).defaultTo(0);
      table.decimal('min_stock', 18, 4).defaultTo(0);
      table.decimal('max_stock', 18, 4).defaultTo(0);
      table.decimal('current_stock', 18, 4).defaultTo(0);
      table.string('warehouse_id');
      table.string('account_code');
      table.string('status').defaultTo('ACTIVE');
    });
  }

  // Material Receipts (Inbound) table
  if (!(await knex.schema.hasTable('material_receipts'))) {
    await knex.schema.createTable('material_receipts', (table) => {
      table.string('id').primary();
      table.string('receipt_no').unique();
      table.date('receipt_date');
      table.string('supplier_code');
      table.string('warehouse_id');
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.text('note');
      table.string('voucher_id');
      table.string('status').defaultTo('DRAFT');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Material Receipt Items table
  if (!(await knex.schema.hasTable('material_receipt_items'))) {
    await knex.schema.createTable('material_receipt_items', (table) => {
      table.string('id').primary();
      table.string('receipt_id');
      table.string('material_id');
      table.decimal('quantity', 18, 4);
      table.decimal('unit_price', 18, 2);
      table.decimal('amount', 18, 2);
      table.string('lot_no');
      table.date('expiry_date');
    });
  }

  // Material Issues (Outbound) table
  if (!(await knex.schema.hasTable('material_issues'))) {
    await knex.schema.createTable('material_issues', (table) => {
      table.string('id').primary();
      table.string('issue_no').unique();
      table.date('issue_date');
      table.string('department_id');
      table.string('warehouse_id');
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.text('reason');
      table.string('voucher_id');
      table.string('status').defaultTo('DRAFT');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Material Issue Items table
  if (!(await knex.schema.hasTable('material_issue_items'))) {
    await knex.schema.createTable('material_issue_items', (table) => {
      table.string('id').primary();
      table.string('issue_id');
      table.string('material_id');
      table.decimal('quantity', 18, 4);
      table.decimal('unit_price', 18, 2);
      table.decimal('amount', 18, 2);
      table.string('lot_no');
    });
  }

  // Material Transfers table
  if (!(await knex.schema.hasTable('material_transfers'))) {
    await knex.schema.createTable('material_transfers', (table) => {
      table.string('id').primary();
      table.string('transfer_no').unique();
      table.date('transfer_date');
      table.string('from_warehouse_id');
      table.string('to_warehouse_id');
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.text('note');
      table.string('status').defaultTo('DRAFT');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Material Transfer Items table
  if (!(await knex.schema.hasTable('material_transfer_items'))) {
    await knex.schema.createTable('material_transfer_items', (table) => {
      table.string('id').primary();
      table.string('transfer_id');
      table.string('material_id');
      table.decimal('quantity', 18, 4);
      table.decimal('unit_price', 18, 2);
      table.decimal('amount', 18, 2);
    });
  }

  // Inventory Cards table
  if (!(await knex.schema.hasTable('inventory_cards'))) {
    await knex.schema.createTable('inventory_cards', (table) => {
      table.string('id').primary();
      table.string('material_id');
      table.string('warehouse_id');
      table.string('fund_source_id');
      table.date('card_date');
      table.string('transaction_type'); // RECEIPT, ISSUE, TRANSFER
      table.string('reference_no');
      table.decimal('quantity_in', 18, 4).defaultTo(0);
      table.decimal('quantity_out', 18, 4).defaultTo(0);
      table.decimal('unit_price', 18, 2).defaultTo(0);
      table.decimal('amount', 18, 2).defaultTo(0);
      table.decimal('balance_quantity', 18, 4).defaultTo(0);
      table.decimal('balance_amount', 18, 2).defaultTo(0);
    });
  }

  // Products table
  if (!(await knex.schema.hasTable('products'))) {
    await knex.schema.createTable('products', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.string('category');
      table.string('unit');
      table.decimal('sale_price', 18, 2).defaultTo(0);
      table.decimal('cost_price', 18, 2).defaultTo(0);
      table.decimal('tax_rate', 8, 2).defaultTo(10);
      table.string('account_revenue');
      table.string('account_cost');
      table.integer('is_active').defaultTo(1);
    });
  }
}

export async function seedInventoryData(knex: Knex): Promise<void> {
  // Seed sample materials if empty
  const materialCount = await knex('materials').count('* as count').first();
  if (materialCount && Number(materialCount.count) === 0) {
    await knex('materials').insert([
      { id: 'MAT001', code: 'VL001', name: 'Giấy A4', category: 'VAN_PHONG_PHAM', unit: 'Ram', unit_price: 75000, account_code: '152' },
      { id: 'MAT002', code: 'VL002', name: 'Bút bi', category: 'VAN_PHONG_PHAM', unit: 'Hộp', unit_price: 50000, account_code: '152' },
      { id: 'MAT003', code: 'VL003', name: 'Mực in HP', category: 'VAN_PHONG_PHAM', unit: 'Hộp', unit_price: 850000, account_code: '152' }
    ]);
  }

  // Seed sample products if empty
  const productCount = await knex('products').count('* as count').first();
  if (productCount && Number(productCount.count) === 0) {
    await knex('products').insert([
      { id: 'PRD001', code: 'SP001', name: 'Dịch vụ tư vấn', category: 'SERVICE', unit: 'Giờ', sale_price: 500000, account_revenue: '511', account_cost: '632' },
      { id: 'PRD002', code: 'SP002', name: 'Phần mềm kế toán', category: 'SOFTWARE', unit: 'License', sale_price: 15000000, account_revenue: '511', account_cost: '632' }
    ]);
  }
}
