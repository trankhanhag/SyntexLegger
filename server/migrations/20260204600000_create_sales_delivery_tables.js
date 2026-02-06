/**
 * Migration: Create Sales Delivery tables
 * Phiếu giao hàng (Delivery) - Workflow từ đơn hàng -> giao hàng -> hoàn tất
 */

exports.up = async function(knex) {
    // Create sales_deliveries table
    const hasDeliveriesTable = await knex.schema.hasTable('sales_deliveries');
    if (!hasDeliveriesTable) {
        await knex.schema.createTable('sales_deliveries', function(table) {
            table.string('id').primary();
            table.string('delivery_no').notNullable();
            table.date('delivery_date').notNullable();
            table.string('order_id');
            table.string('order_no');
            table.string('customer_code');
            table.string('customer_name');
            table.text('delivery_address');
            table.string('receiver_name');
            table.string('receiver_phone');
            table.string('shipper_name');
            table.string('shipper_phone');
            table.string('vehicle_no');
            table.date('expected_date');
            table.text('notes');
            table.string('status').defaultTo('PENDING'); // PENDING, SHIPPING, DELIVERED, RETURNED, CANCELLED
            table.timestamp('shipped_at');
            table.timestamp('delivered_at');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());

            // Indexes
            table.index('delivery_no');
            table.index('delivery_date');
            table.index('order_id');
            table.index('status');
            table.index('customer_code');
        });
    }

    // Create sales_delivery_items table
    const hasItemsTable = await knex.schema.hasTable('sales_delivery_items');
    if (!hasItemsTable) {
        await knex.schema.createTable('sales_delivery_items', function(table) {
            table.string('id').primary();
            table.string('delivery_id').notNullable()
                .references('id').inTable('sales_deliveries')
                .onDelete('CASCADE');
            table.string('item_name').notNullable();
            table.string('unit');
            table.decimal('ordered_qty', 15, 4).defaultTo(0);
            table.decimal('delivered_qty', 15, 4).defaultTo(0);
            table.text('notes');
            table.timestamp('created_at').defaultTo(knex.fn.now());

            // Indexes
            table.index('delivery_id');
        });
    }

    // Update sales_orders table with delivery-related columns if not exists
    const hasOrdersTable = await knex.schema.hasTable('sales_orders');
    if (hasOrdersTable) {
        const columns = await knex.raw(`PRAGMA table_info(sales_orders)`);
        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('order_no')) {
            await knex.schema.alterTable('sales_orders', t => t.string('order_no'));
        }
        if (!columnNames.includes('order_date')) {
            await knex.schema.alterTable('sales_orders', t => t.date('order_date'));
        }
        if (!columnNames.includes('customer_code')) {
            await knex.schema.alterTable('sales_orders', t => t.string('customer_code'));
        }
        if (!columnNames.includes('customer_name')) {
            await knex.schema.alterTable('sales_orders', t => t.string('customer_name'));
        }
        if (!columnNames.includes('delivery_address')) {
            await knex.schema.alterTable('sales_orders', t => t.text('delivery_address'));
        }
        if (!columnNames.includes('delivery_date')) {
            await knex.schema.alterTable('sales_orders', t => t.date('delivery_date'));
        }
        if (!columnNames.includes('total_amount')) {
            await knex.schema.alterTable('sales_orders', t => t.decimal('total_amount', 15, 2));
        }
        if (!columnNames.includes('description')) {
            await knex.schema.alterTable('sales_orders', t => t.text('description'));
        }
        if (!columnNames.includes('notes')) {
            await knex.schema.alterTable('sales_orders', t => t.text('notes'));
        }
        if (!columnNames.includes('created_at')) {
            await knex.schema.alterTable('sales_orders', t => t.timestamp('created_at'));
        }
        if (!columnNames.includes('updated_at')) {
            await knex.schema.alterTable('sales_orders', t => t.timestamp('updated_at'));
        }
    }
};

exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('sales_delivery_items');
    await knex.schema.dropTableIfExists('sales_deliveries');
};
