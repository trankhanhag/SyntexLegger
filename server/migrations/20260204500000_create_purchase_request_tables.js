/**
 * Migration: Create Purchase Request tables & Update Purchase Orders
 * Đề xuất mua hàng (Purchase Request) - Workflow từ đề xuất -> phê duyệt -> đơn hàng
 */

exports.up = async function(knex) {
    // Update purchase_orders table with new columns for integration
    const hasPOTable = await knex.schema.hasTable('purchase_orders');
    if (hasPOTable) {
        const columns = await knex.raw(`PRAGMA table_info(purchase_orders)`);
        const columnNames = columns.map(c => c.name);

        // Add missing columns
        if (!columnNames.includes('order_no')) {
            await knex.schema.alterTable('purchase_orders', t => t.string('order_no'));
        }
        if (!columnNames.includes('vendor_code')) {
            await knex.schema.alterTable('purchase_orders', t => t.string('vendor_code'));
        }
        if (!columnNames.includes('vendor_name')) {
            await knex.schema.alterTable('purchase_orders', t => t.string('vendor_name'));
        }
        if (!columnNames.includes('description')) {
            await knex.schema.alterTable('purchase_orders', t => t.text('description'));
        }
        if (!columnNames.includes('delivery_date')) {
            await knex.schema.alterTable('purchase_orders', t => t.date('delivery_date'));
        }
        if (!columnNames.includes('total_amount')) {
            await knex.schema.alterTable('purchase_orders', t => t.decimal('total_amount', 15, 2));
        }
        if (!columnNames.includes('notes')) {
            await knex.schema.alterTable('purchase_orders', t => t.text('notes'));
        }
        if (!columnNames.includes('request_id')) {
            await knex.schema.alterTable('purchase_orders', t => t.string('request_id'));
        }
        if (!columnNames.includes('created_at')) {
            await knex.schema.alterTable('purchase_orders', t => t.timestamp('created_at'));
        }
        if (!columnNames.includes('updated_at')) {
            await knex.schema.alterTable('purchase_orders', t => t.timestamp('updated_at'));
        }
    }

    // Create purchase_requests table
    const hasPRTable = await knex.schema.hasTable('purchase_requests');
    if (!hasPRTable) {
        await knex.schema.createTable('purchase_requests', function(table) {
            table.string('id').primary();
            table.string('request_no').notNullable();
            table.date('request_date').notNullable();
            table.string('requester_name').notNullable();
            table.string('department');
            table.text('description');
            table.text('reason');
            table.string('priority').defaultTo('MEDIUM'); // LOW, MEDIUM, HIGH
            table.date('needed_date');
            table.string('vendor_code');
            table.string('vendor_name');
            table.decimal('total_amount', 15, 2).defaultTo(0);
            table.text('notes');
            table.string('status').defaultTo('DRAFT'); // DRAFT, PENDING, APPROVED, REJECTED, CONVERTED
            table.timestamp('approved_at');
            table.string('approved_by');
            table.text('approved_notes');
            table.text('rejection_reason');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());

            // Indexes
            table.index('request_no');
            table.index('request_date');
            table.index('status');
            table.index('requester_name');
            table.index('department');
        });
    }

    // Create purchase_request_items table
    const hasPRITable = await knex.schema.hasTable('purchase_request_items');
    if (!hasPRITable) {
        await knex.schema.createTable('purchase_request_items', function(table) {
            table.string('id').primary();
            table.string('request_id').notNullable()
                .references('id').inTable('purchase_requests')
                .onDelete('CASCADE');
            table.string('item_name').notNullable();
            table.decimal('quantity', 15, 4).defaultTo(1);
            table.string('unit');
            table.decimal('unit_price', 15, 2).defaultTo(0);
            table.decimal('amount', 15, 2).defaultTo(0);
            table.text('notes');
            table.timestamp('created_at').defaultTo(knex.fn.now());

            // Indexes
            table.index('request_id');
        });
    }
};

exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('purchase_request_items');
    await knex.schema.dropTableIfExists('purchase_requests');

    // Note: We don't remove columns from purchase_orders in down migration
    // as it could cause data loss
};
