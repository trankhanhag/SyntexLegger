/**
 * Commercial Routes (Sales, Purchase, Contracts, Projects, Loans)
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');

const { verifyToken, requireRole } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ========================================
    // SALES MODULE
    // ========================================

    router.get('/sales/orders', verifyToken, (req, res) => {
        db.all("SELECT * FROM sales_orders ORDER BY date DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.delete('/sales/orders/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM sales_orders WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Sales order deleted", changes: this.changes });
        });
    });

    // Bulk import sales orders
    router.post('/sales/orders/import', verifyToken, (req, res) => {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items to import' });
        }

        const now = new Date().toISOString();
        let inserted = 0;
        let skipped = 0;

        const sql = `INSERT INTO sales_orders (
            id, order_no, date, customer_code, customer_name,
            description, delivery_date, total_amount, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.serialize(() => {
            const stmt = db.prepare(sql);
            let remaining = items.length;

            items.forEach((item) => {
                const id = `SO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                // Check if order_no already exists
                db.get("SELECT id FROM sales_orders WHERE order_no = ?", [item.order_no], (err, existing) => {
                    if (existing) {
                        skipped++;
                    } else {
                        stmt.run([
                            id, item.order_no, item.order_date || item.date,
                            item.customer_code || '', item.customer_name || '',
                            item.description || '', item.delivery_date || '',
                            item.total_amount || 0, item.notes || '', 'DRAFT', now
                        ]);
                        inserted++;
                    }
                    remaining--;
                    if (remaining === 0) {
                        stmt.finalize();
                        res.json({ success: true, inserted, skipped });
                    }
                });
            });
        });
    });

    // Bulk import sales invoices
    router.post('/sales/invoices/import', verifyToken, (req, res) => {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items to import' });
        }

        const now = new Date().toISOString();
        let inserted = 0;
        let skipped = 0;

        const sql = `INSERT INTO sales_invoices (
            id, invoice_no, date, customer_code, customer_name, customer_tax_code,
            amount_before_tax, tax_amount, total_amount, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.serialize(() => {
            const stmt = db.prepare(sql);
            let remaining = items.length;

            items.forEach((item) => {
                const id = `SI_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                db.get("SELECT id FROM sales_invoices WHERE invoice_no = ?", [item.invoice_no], (err, existing) => {
                    if (existing) {
                        skipped++;
                    } else {
                        stmt.run([
                            id, item.invoice_no, item.invoice_date || item.date,
                            item.customer_code || '', item.customer_name || '',
                            item.customer_tax_code || '',
                            item.amount_before_tax || 0, item.tax_amount || 0,
                            item.total_amount || 0, item.notes || '', 'DRAFT', now
                        ]);
                        inserted++;
                    }
                    remaining--;
                    if (remaining === 0) {
                        stmt.finalize();
                        res.json({ success: true, inserted, skipped });
                    }
                });
            });
        });
    });

    router.get('/sales/invoices', verifyToken, (req, res) => {
        db.all("SELECT * FROM sales_invoices ORDER BY date DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.delete('/sales/invoices/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM sales_invoices WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Sales invoice deleted", changes: this.changes });
        });
    });

    router.get('/sales/returns', verifyToken, (req, res) => {
        db.all("SELECT * FROM vouchers WHERE type = 'SALES_RETURN' ORDER BY doc_date DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({
                id: r.id,
                date: r.doc_date,
                doc_no: r.doc_no,
                customer: 'Khách hàng',
                description: r.description,
                amount: r.total_amount
            })));
        });
    });

    router.delete('/sales/returns/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Sales return deleted", changes: this.changes });
        });
    });

    router.get('/sales/payments', verifyToken, (req, res) => {
        db.all("SELECT * FROM vouchers WHERE type IN ('CASH_IN', 'BANK_IN') ORDER BY doc_date DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({
                id: r.id,
                date: r.doc_date,
                doc_no: r.doc_no,
                customer: 'Khách hàng',
                description: r.description,
                amount: r.total_amount,
                method: r.type === 'CASH_IN' ? 'Tiền mặt' : 'Chuyển khoản'
            })));
        });
    });

    router.delete('/sales/payments/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Sales payment deleted", changes: this.changes });
        });
    });

    // ========================================
    // SALES DELIVERIES (Giao hàng)
    // ========================================

    // Get all deliveries
    router.get('/sales/deliveries', verifyToken, (req, res) => {
        const { status, from_date, to_date } = req.query;
        let sql = "SELECT * FROM sales_deliveries";
        const params = [];
        const conditions = [];

        if (status) {
            conditions.push("status = ?");
            params.push(status);
        }
        if (from_date) {
            conditions.push("delivery_date >= ?");
            params.push(from_date);
        }
        if (to_date) {
            conditions.push("delivery_date <= ?");
            params.push(to_date);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }
        sql += " ORDER BY delivery_date DESC, created_at DESC";

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // Get single delivery with items
    router.get('/sales/deliveries/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.get("SELECT * FROM sales_deliveries WHERE id = ?", [id], (err, delivery) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!delivery) return res.status(404).json({ error: "Delivery not found" });

            db.all("SELECT * FROM sales_delivery_items WHERE delivery_id = ?", [id], (err, items) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ...delivery, items });
            });
        });
    });

    // Create new delivery
    router.post('/sales/deliveries', verifyToken, (req, res) => {
        const {
            delivery_no, delivery_date, order_id, order_no,
            customer_code, customer_name, delivery_address,
            receiver_name, receiver_phone, shipper_name, shipper_phone,
            vehicle_no, expected_date, notes, status, items
        } = req.body;

        const id = `DL_${Date.now()}`;
        const now = new Date().toISOString();

        const sql = `INSERT INTO sales_deliveries (
            id, delivery_no, delivery_date, order_id, order_no,
            customer_code, customer_name, delivery_address,
            receiver_name, receiver_phone, shipper_name, shipper_phone,
            vehicle_no, expected_date, notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            id, delivery_no, delivery_date, order_id, order_no,
            customer_code, customer_name, delivery_address,
            receiver_name, receiver_phone, shipper_name, shipper_phone,
            vehicle_no, expected_date, notes, status || 'PENDING', now, now
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Insert items if provided
            if (items && items.length > 0) {
                const itemSql = `INSERT INTO sales_delivery_items (
                    id, delivery_id, item_name, unit, ordered_qty, delivered_qty, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

                const stmt = db.prepare(itemSql);
                items.forEach((item, index) => {
                    const itemId = `${id}_ITEM_${index + 1}`;
                    stmt.run([itemId, id, item.item_name, item.unit, item.ordered_qty, item.delivered_qty, item.notes]);
                });
                stmt.finalize();
            }

            // Update order status to DELIVERED if applicable
            if (order_id && status === 'DELIVERED') {
                db.run("UPDATE sales_orders SET status = 'DELIVERED' WHERE id = ?", [order_id]);
            }

            res.json({ message: "Delivery created", id });
        });
    });

    // Update delivery
    router.put('/sales/deliveries/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        const {
            delivery_no, delivery_date, delivery_address,
            receiver_name, receiver_phone, shipper_name, shipper_phone,
            vehicle_no, expected_date, notes, status, items
        } = req.body;

        const now = new Date().toISOString();

        // Get current delivery to check status change
        db.get("SELECT * FROM sales_deliveries WHERE id = ?", [id], (err, delivery) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!delivery) return res.status(404).json({ error: "Delivery not found" });

            const sql = `UPDATE sales_deliveries SET
                delivery_no = COALESCE(?, delivery_no),
                delivery_date = COALESCE(?, delivery_date),
                delivery_address = COALESCE(?, delivery_address),
                receiver_name = COALESCE(?, receiver_name),
                receiver_phone = COALESCE(?, receiver_phone),
                shipper_name = COALESCE(?, shipper_name),
                shipper_phone = COALESCE(?, shipper_phone),
                vehicle_no = COALESCE(?, vehicle_no),
                expected_date = COALESCE(?, expected_date),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status),
                updated_at = ?
            WHERE id = ?`;

            db.run(sql, [
                delivery_no, delivery_date, delivery_address,
                receiver_name, receiver_phone, shipper_name, shipper_phone,
                vehicle_no, expected_date, notes, status, now, id
            ], function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Update items if provided
                if (items) {
                    db.run("DELETE FROM sales_delivery_items WHERE delivery_id = ?", [id], (err) => {
                        if (err) return res.status(500).json({ error: err.message });

                        if (items.length > 0) {
                            const itemSql = `INSERT INTO sales_delivery_items (
                                id, delivery_id, item_name, unit, ordered_qty, delivered_qty, notes
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

                            const stmt = db.prepare(itemSql);
                            items.forEach((item, index) => {
                                const itemId = `${id}_ITEM_${index + 1}`;
                                stmt.run([itemId, id, item.item_name, item.unit, item.ordered_qty, item.delivered_qty, item.notes]);
                            });
                            stmt.finalize();
                        }
                    });
                }

                // Update order status if delivery completed
                if (status === 'DELIVERED' && delivery.order_id) {
                    db.run("UPDATE sales_orders SET status = 'DELIVERED' WHERE id = ?", [delivery.order_id]);
                }

                res.json({ message: "Delivery updated" });
            });
        });
    });

    // Delete delivery
    router.delete('/sales/deliveries/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.serialize(() => {
            db.run("DELETE FROM sales_delivery_items WHERE delivery_id = ?", [id]);
            db.run("DELETE FROM sales_deliveries WHERE id = ?", [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Delivery deleted", changes: this.changes });
            });
        });
    });

    // ========================================
    // PURCHASE MODULE
    // ========================================

    router.get('/purchase/orders', verifyToken, (req, res) => {
        db.all("SELECT * FROM purchase_orders ORDER BY date DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/purchase/orders', verifyToken, (req, res) => {
        const {
            order_no, order_date, vendor_code, vendor_name,
            description, delivery_date, total_amount, notes, status, request_id
        } = req.body;

        const id = `PO_${Date.now()}`;
        const now = new Date().toISOString();

        const sql = `INSERT INTO purchase_orders (
            id, order_no, date, vendor_code, vendor_name,
            description, delivery_date, total_amount, notes, status, request_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            id, order_no, order_date, vendor_code, vendor_name,
            description, delivery_date, total_amount || 0, notes, status || 'DRAFT', request_id, now
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Purchase order created", id });
        });
    });

    router.put('/purchase/orders/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        const {
            order_no, order_date, vendor_code, vendor_name,
            description, delivery_date, total_amount, notes, status
        } = req.body;

        const now = new Date().toISOString();

        const sql = `UPDATE purchase_orders SET
            order_no = ?, date = ?, vendor_code = ?, vendor_name = ?,
            description = ?, delivery_date = ?, total_amount = ?, notes = ?, status = ?, updated_at = ?
        WHERE id = ?`;

        db.run(sql, [
            order_no, order_date, vendor_code, vendor_name,
            description, delivery_date, total_amount, notes, status, now, id
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Purchase order not found" });
            res.json({ message: "Purchase order updated" });
        });
    });

    router.delete('/purchase/orders/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM purchase_orders WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Purchase order deleted", changes: this.changes });
        });
    });

    // Bulk import purchase orders
    router.post('/purchase/orders/import', verifyToken, (req, res) => {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items to import' });
        }

        const now = new Date().toISOString();
        let inserted = 0;
        let skipped = 0;

        const sql = `INSERT INTO purchase_orders (
            id, order_no, date, vendor_code, vendor_name,
            description, delivery_date, total_amount, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.serialize(() => {
            const stmt = db.prepare(sql);
            let remaining = items.length;

            items.forEach((item) => {
                const id = `PO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                db.get("SELECT id FROM purchase_orders WHERE order_no = ?", [item.order_no], (err, existing) => {
                    if (existing) {
                        skipped++;
                    } else {
                        stmt.run([
                            id, item.order_no, item.order_date || item.date,
                            item.vendor_code || '', item.vendor_name || '',
                            item.description || '', item.delivery_date || '',
                            item.total_amount || 0, item.notes || '', 'DRAFT', now
                        ]);
                        inserted++;
                    }
                    remaining--;
                    if (remaining === 0) {
                        stmt.finalize();
                        res.json({ success: true, inserted, skipped });
                    }
                });
            });
        });
    });

    // Bulk import purchase invoices
    router.post('/purchase/invoices/import', verifyToken, (req, res) => {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items to import' });
        }

        const now = new Date().toISOString();
        let inserted = 0;
        let skipped = 0;

        const sql = `INSERT INTO purchase_invoices (
            id, invoice_no, date, vendor_code, vendor_name, vendor_tax_code,
            amount_before_tax, tax_amount, total_amount, type, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.serialize(() => {
            const stmt = db.prepare(sql);
            let remaining = items.length;

            items.forEach((item) => {
                const id = `PI_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                db.get("SELECT id FROM purchase_invoices WHERE invoice_no = ?", [item.invoice_no], (err, existing) => {
                    if (existing) {
                        skipped++;
                    } else {
                        stmt.run([
                            id, item.invoice_no, item.invoice_date || item.date,
                            item.vendor_code || '', item.vendor_name || '',
                            item.vendor_tax_code || '',
                            item.amount_before_tax || 0, item.tax_amount || 0,
                            item.total_amount || 0, 'INBOUND',
                            item.notes || '', 'DRAFT', now
                        ]);
                        inserted++;
                    }
                    remaining--;
                    if (remaining === 0) {
                        stmt.finalize();
                        res.json({ success: true, inserted, skipped });
                    }
                });
            });
        });
    });

    router.get('/purchase/invoices', verifyToken, (req, res) => {
        const { type } = req.query;
        let sql = "SELECT * FROM purchase_invoices";
        const params = [];
        if (type) {
            sql += " WHERE type = ?";
            params.push(type);
        }
        sql += " ORDER BY date DESC";
        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    router.delete('/purchase/invoices/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM purchase_invoices WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Purchase invoice deleted", changes: this.changes });
        });
    });

    router.get('/purchase/returns', verifyToken, (req, res) => {
        db.all("SELECT * FROM vouchers WHERE type = 'PURCHASE_RETURN' ORDER BY doc_date DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({
                id: r.id,
                date: r.doc_date,
                doc_no: r.doc_no,
                supplier: 'Nhà cung cấp',
                description: r.description,
                amount: r.total_amount
            })));
        });
    });

    router.delete('/purchase/returns/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Purchase return deleted", changes: this.changes });
        });
    });

    router.get('/purchase/payments', verifyToken, (req, res) => {
        db.all("SELECT * FROM vouchers WHERE type IN ('CASH_OUT', 'BANK_OUT') ORDER BY doc_date DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({
                id: r.id,
                date: r.doc_date,
                doc_no: r.doc_no,
                supplier: 'Nhà cung cấp',
                description: r.description,
                amount: r.total_amount,
                method: r.type === 'CASH_OUT' ? 'Tiền mặt' : 'Chuyển khoản'
            })));
        });
    });

    router.delete('/purchase/payments/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Purchase payment deleted", changes: this.changes });
        });
    });

    // ========================================
    // PURCHASE REQUESTS (Đề xuất mua hàng)
    // ========================================

    // Get all purchase requests
    router.get('/purchase/requests', verifyToken, (req, res) => {
        const { status, from_date, to_date } = req.query;
        let sql = "SELECT * FROM purchase_requests";
        const params = [];
        const conditions = [];

        if (status) {
            conditions.push("status = ?");
            params.push(status);
        }
        if (from_date) {
            conditions.push("request_date >= ?");
            params.push(from_date);
        }
        if (to_date) {
            conditions.push("request_date <= ?");
            params.push(to_date);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }
        sql += " ORDER BY request_date DESC, created_at DESC";

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // Get single purchase request with items
    router.get('/purchase/requests/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.get("SELECT * FROM purchase_requests WHERE id = ?", [id], (err, request) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!request) return res.status(404).json({ error: "Purchase request not found" });

            db.all("SELECT * FROM purchase_request_items WHERE request_id = ?", [id], (err, items) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ...request, items });
            });
        });
    });

    // Create new purchase request
    router.post('/purchase/requests', verifyToken, (req, res) => {
        const {
            request_no, request_date, requester_name, department,
            description, reason, priority, needed_date,
            vendor_code, vendor_name, total_amount, notes, status, items
        } = req.body;

        const id = `PR_${Date.now()}`;
        const now = new Date().toISOString();

        const sql = `INSERT INTO purchase_requests (
            id, request_no, request_date, requester_name, department,
            description, reason, priority, needed_date,
            vendor_code, vendor_name, total_amount, notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            id, request_no, request_date, requester_name, department,
            description, reason, priority || 'MEDIUM', needed_date,
            vendor_code, vendor_name, total_amount || 0, notes, status || 'DRAFT', now, now
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Insert items if provided
            if (items && items.length > 0) {
                const itemSql = `INSERT INTO purchase_request_items (
                    id, request_id, item_name, quantity, unit, unit_price, amount, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                const stmt = db.prepare(itemSql);
                items.forEach((item, index) => {
                    const itemId = `${id}_ITEM_${index + 1}`;
                    stmt.run([itemId, id, item.item_name, item.quantity, item.unit, item.unit_price, item.amount, item.notes]);
                });
                stmt.finalize();
            }

            res.json({ message: "Purchase request created", id });
        });
    });

    // Update purchase request
    router.put('/purchase/requests/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        const {
            request_no, request_date, requester_name, department,
            description, reason, priority, needed_date,
            vendor_code, vendor_name, total_amount, notes, status, items
        } = req.body;

        const now = new Date().toISOString();

        const sql = `UPDATE purchase_requests SET
            request_no = ?, request_date = ?, requester_name = ?, department = ?,
            description = ?, reason = ?, priority = ?, needed_date = ?,
            vendor_code = ?, vendor_name = ?, total_amount = ?, notes = ?, status = ?, updated_at = ?
        WHERE id = ?`;

        db.run(sql, [
            request_no, request_date, requester_name, department,
            description, reason, priority, needed_date,
            vendor_code, vendor_name, total_amount, notes, status, now, id
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Purchase request not found" });

            // Update items if provided
            if (items) {
                db.run("DELETE FROM purchase_request_items WHERE request_id = ?", [id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    if (items.length > 0) {
                        const itemSql = `INSERT INTO purchase_request_items (
                            id, request_id, item_name, quantity, unit, unit_price, amount, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                        const stmt = db.prepare(itemSql);
                        items.forEach((item, index) => {
                            const itemId = `${id}_ITEM_${index + 1}`;
                            stmt.run([itemId, id, item.item_name, item.quantity, item.unit, item.unit_price, item.amount, item.notes]);
                        });
                        stmt.finalize();
                    }

                    res.json({ message: "Purchase request updated" });
                });
            } else {
                res.json({ message: "Purchase request updated" });
            }
        });
    });

    // Delete purchase request
    router.delete('/purchase/requests/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.serialize(() => {
            db.run("DELETE FROM purchase_request_items WHERE request_id = ?", [id]);
            db.run("DELETE FROM purchase_requests WHERE id = ?", [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Purchase request deleted", changes: this.changes });
            });
        });
    });

    // Approve purchase request
    router.post('/purchase/requests/:id/approve', verifyToken, (req, res) => {
        const { id } = req.params;
        const { notes } = req.body;
        const now = new Date().toISOString();

        db.get("SELECT * FROM purchase_requests WHERE id = ?", [id], (err, request) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!request) return res.status(404).json({ error: "Purchase request not found" });
            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: "Only PENDING requests can be approved" });
            }

            const sql = `UPDATE purchase_requests SET status = 'APPROVED', approved_at = ?, approved_notes = ?, updated_at = ? WHERE id = ?`;
            db.run(sql, [now, notes, now, id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Purchase request approved" });
            });
        });
    });

    // Reject purchase request
    router.post('/purchase/requests/:id/reject', verifyToken, (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        const now = new Date().toISOString();

        db.get("SELECT * FROM purchase_requests WHERE id = ?", [id], (err, request) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!request) return res.status(404).json({ error: "Purchase request not found" });
            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: "Only PENDING requests can be rejected" });
            }

            const sql = `UPDATE purchase_requests SET status = 'REJECTED', rejection_reason = ?, updated_at = ? WHERE id = ?`;
            db.run(sql, [reason, now, id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Purchase request rejected" });
            });
        });
    });

    // ========================================
    // CONTRACTS
    // ========================================

    router.get('/contracts', verifyToken, (req, res) => {
        const { type } = req.query;
        let sql = "SELECT * FROM contracts";
        let params = [];
        if (type) {
            sql += " WHERE type = ?";
            params.push(type);
        }
        sql += " ORDER BY date DESC";
        db.all(sql, params, (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/contracts', verifyToken, (req, res) => {
        const {
            id, code, name, partner, date, end_date, value, received_or_paid, status, type,
            // Extended fields
            partner_code, contract_type, fund_source_id, budget_estimate_id,
            approval_no, approval_date, payment_method, payment_terms,
            warranty_period, notes
        } = req.body;
        const contractId = id || `C${Date.now()}`;
        const sql = `INSERT OR REPLACE INTO contracts (
            id, code, name, partner, date, end_date, value, received_or_paid, status, type,
            partner_code, contract_type, fund_source_id, budget_estimate_id,
            approval_no, approval_date, payment_method, payment_terms,
            warranty_period, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [
            contractId, code, name, partner, date, end_date, value, received_or_paid || 0, status || 'Đang thực hiện', type,
            partner_code, contract_type, fund_source_id, budget_estimate_id,
            approval_no, approval_date, payment_method, payment_terms,
            warranty_period, notes
        ], function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "Contract saved", id: contractId });
        });
    });

    // Get expiring contracts (within specified days, default 30)
    router.get('/contracts/expiring', verifyToken, (req, res) => {
        const { days = 30 } = req.query;
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const sql = `SELECT *,
            CAST(julianday(end_date) - julianday(?) AS INTEGER) as days_remaining
            FROM contracts
            WHERE end_date IS NOT NULL
            AND end_date != ''
            AND end_date <= ?
            AND end_date >= ?
            AND status != 'Đã hoàn thành'
            AND status != 'Đã thanh lý'
            ORDER BY end_date ASC`;

        db.all(sql, [today, futureDateStr, today], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json(rows || []);
        });
    });

    router.delete('/contracts/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM contracts WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Contract deleted", changes: this.changes });
        });
    });

    router.get('/contracts/appendices', verifyToken, (req, res) => {
        const sql = `SELECT a.*, c.code as parent_code FROM contract_appendices a LEFT JOIN contracts c ON a.contract_id = c.id ORDER BY a.date DESC`;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    // ========================================
    // PROJECTS & BUDGETS
    // ========================================

    router.get('/projects', verifyToken, (req, res) => {
        db.all("SELECT * FROM projects ORDER BY code ASC", [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/projects', verifyToken, (req, res) => {
        const {
            id, code, name, customer, budget, start, end, progress, status,
            // Extended fields
            project_type, fund_source_id, budget_estimate_id, approval_no, approval_date,
            managing_agency, task_code, objective, expected_output, completion_date, partner_code
        } = req.body;
        const prjId = id || `DA${Date.now()}`;
        const sql = `INSERT OR REPLACE INTO projects (
            id, code, name, customer, budget, start, end, progress, status,
            project_type, fund_source_id, budget_estimate_id, approval_no, approval_date,
            managing_agency, task_code, objective, expected_output, completion_date, partner_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [
            prjId, code, name, customer, budget, start, end, progress || 0, status || 'Mới khởi tạo',
            project_type, fund_source_id, budget_estimate_id, approval_no, approval_date,
            managing_agency, task_code, objective, expected_output, completion_date, partner_code
        ], function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "Project saved", id: prjId });
        });
    });

    router.delete('/projects/:id', verifyToken, requireRole('admin'), (req, res) => {
        const { id } = req.params;
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("DELETE FROM project_tasks WHERE project_id = ?", [id]);
            db.run("DELETE FROM project_budget_lines WHERE project_id = ?", [id]);
            db.run("DELETE FROM projects WHERE id = ?", [id], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                db.run("COMMIT");
                res.json({ message: "Project deleted", changes: this.changes });
            });
        });
    });

    router.get('/projects/tasks', verifyToken, (req, res) => {
        const { project_code } = req.query;
        let sql = `SELECT t.*, p.code as prj_code FROM project_tasks t JOIN projects p ON t.project_id = p.id`;
        let params = [];
        if (project_code) {
            sql += " WHERE p.code = ?";
            params.push(project_code);
        }
        db.all(sql, params, (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/projects/tasks', verifyToken, (req, res) => {
        const { id, progress, status } = req.body;
        const sql = `UPDATE project_tasks SET progress = ?, status = ? WHERE id = ?`;
        db.run(sql, [progress, status, id], function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "Task updated" });
        });
    });

    router.get('/projects/budgets', verifyToken, (req, res) => {
        const { project_code } = req.query;
        const sql = `
            SELECT 
                b.id, b.category, b.budget,
                COALESCE(SUM(v.amount), 0) as actual
            FROM project_budget_lines b
            JOIN projects p ON b.project_id = p.id
            LEFT JOIN voucher_items v ON p.code = v.dim1 AND b.category LIKE '%' || v.description || '%'
            WHERE p.code = ?
            GROUP BY b.id
        `;
        db.all(sql, [project_code], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows.map(r => ({
                ...r,
                remaining: r.budget - r.actual,
                percent: r.budget > 0 ? (r.actual / r.budget * 100).toFixed(1) : 0
            })));
        });
    });

    router.get('/projects/pnl', verifyToken, (req, res) => {
        const sql = `
            SELECT 
                p.code, p.name,
                SUM(CASE WHEN v.credit_acc LIKE '511%' THEN v.amount ELSE 0 END) as revenue,
                SUM(CASE WHEN v.debit_acc LIKE '6%' THEN v.amount ELSE 0 END) as cost
            FROM projects p
            LEFT JOIN voucher_items v ON p.code = v.dim1
            GROUP BY p.code, p.name
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows.map(r => ({
                ...r,
                profit: r.revenue - r.cost,
                margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue * 100).toFixed(1) : 0
            })));
        });
    });

    // ========================================
    // LOANS & DEBT NOTES
    // ========================================

    router.get('/loans/contracts', verifyToken, (req, res) => {
        db.all("SELECT * FROM loan_contracts ORDER BY date DESC", [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/loans/contracts', verifyToken, (req, res) => {
        const { docNo, partner, limit_amount, collateral, status, date } = req.body;
        const sql = `INSERT INTO loan_contracts (docNo, partner, limit_amount, collateral, status, date) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [docNo, partner, limit_amount, collateral, status, date], function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "Loan contract created", id: this.lastID });
        });
    });

    router.delete('/loans/contracts/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM loan_contracts WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Loan contract deleted", changes: this.changes });
        });
    });

    router.get('/loans/debt-notes', verifyToken, (req, res) => {
        const sql = `SELECT d.*, c.partner FROM debt_notes d JOIN loan_contracts c ON d.contract_id = c.id ORDER BY d.start_date DESC`;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/loans/debt-notes', verifyToken, (req, res) => {
        const { contract_id, doc_no, amount, rate, start_date, end_date, purpose } = req.body;
        db.get("SELECT id FROM loan_contracts WHERE id = ?", [contract_id], (err, contract) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!contract) return res.status(404).json({ error: "Contract not found" });

            const sql = `INSERT INTO debt_notes (contract_id, doc_no, amount, rate, start_date, end_date, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [contract_id, doc_no, amount, rate, start_date, end_date, purpose], function (err) {
                if (err) return res.status(400).json({ "error": err.message });

                const lastID = this.lastID;
                const voucherId = `PK_DN_${Date.now()}`;
                const now = new Date().toISOString();
                db.serialize(() => {
                    db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                        [voucherId, doc_no, start_date, start_date, `Giải ngân khế ước ${doc_no} - ${purpose}`, 'GENERAL', amount, now]);

                    db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                        [voucherId, `Giải ngân khế ước ${doc_no}`, '112', '341', amount]);
                });

                res.json({ message: "Debt note created", id: lastID });
            });
        });
    });

    router.delete('/loans/debt-notes/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM debt_notes WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Debt note deleted", changes: this.changes });
        });
    });

    router.post('/loans/calculate-interest', verifyToken, (req, res) => {
        const { period } = req.body; // YYYY-MM
        db.all("SELECT d.*, c.partner FROM debt_notes d JOIN loan_contracts c ON d.contract_id = c.id", [], (err, notes) => {
            if (err) return res.status(500).json({ error: err.message });

            let totalInterest = 0;
            const now = new Date().toISOString();
            const voucherId = `Interest_${Date.now()}`;
            const docNoText = `L-${period.replace('-', '')}`;

            notes.forEach(note => {
                const monthlyInterest = (note.amount * note.rate / 100) / 12;
                totalInterest += monthlyInterest;
            });

            if (totalInterest > 0) {
                db.serialize(() => {
                    db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                        [voucherId, docNoText, `${period}-28`, `${period}-28`, `Trích tính lãi vay tháng ${period}`, 'GENERAL', totalInterest, now]);

                    db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)",
                        [voucherId, `Lãi vay tháng ${period}`, '635', '3388', totalInterest]);
                });
            }

            res.json({ status: 'success', total: totalInterest });
        });
    });

    // ========================================
    // MASTER DATA: BUDGETS
    // ========================================

    router.get('/budgets', verifyToken, (req, res) => {
        const { period } = req.query;
        let sql = "SELECT * FROM budgets";
        let params = [];
        if (period) {
            sql += " WHERE period = ?";
            params.push(period);
        }
        sql += " ORDER BY account_code ASC";
        db.all(sql, params, (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/budgets', verifyToken, (req, res) => {
        const { account_code, period, amount, notes } = req.body;
        if (!account_code || !period) {
            return res.status(400).json({ error: "Account Code and Period are required." });
        }

        db.get("SELECT id FROM budgets WHERE account_code = ? AND period = ?", [account_code, period], (err, row) => {
            if (err) return res.status(400).json({ error: err.message });

            if (row) {
                const sql = "UPDATE budgets SET amount = ?, notes = ? WHERE id = ?";
                db.run(sql, [amount, notes, row.id], function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ message: "Budget updated", id: row.id });
                });
            } else {
                const sql = "INSERT INTO budgets (account_code, period, amount, notes, created_at) VALUES (?, ?, ?, ?, ?)";
                db.run(sql, [account_code, period, amount, notes, new Date().toISOString()], function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ message: "Budget created", id: this.lastID });
                });
            }
        });
    });

    router.delete('/budgets/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM budgets WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Budget deleted", changes: this.changes });
        });
    });

    // ========================================
    // DIMENSIONS
    // ========================================

    router.get('/dimensions', verifyToken, (req, res) => {
        const type = req.query.type;
        let sql = "SELECT * FROM dimensions";
        const params = [];
        if (type) {
            sql += " WHERE type = ?";
            params.push(type);
        }
        sql += " ORDER BY code ASC";
        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    router.post('/dimensions', verifyToken, (req, res) => {
        const { id, code, name, type, description } = req.body;
        const dimId = id || `DIM${type}_${Date.now()}`;
        const sql = `INSERT OR REPLACE INTO dimensions (id, code, name, type, description) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [dimId, code, name, type, description], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: dimId });
        });
    });

    router.get('/dimensions/configs', verifyToken, (req, res) => {
        db.all("SELECT * FROM dimension_configs", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    router.post('/dimensions/configs', verifyToken, (req, res) => {
        const configs = req.body;
        db.serialize(() => {
            db.run("DELETE FROM dimension_configs");
            const stmt = db.prepare("INSERT INTO dimension_configs (account_code, dim1_type, dim2_type, dim3_type, dim4_type, dim5_type) VALUES (?,?,?,?,?,?)");
            configs.forEach(c => {
                stmt.run(c.account_code, c.dim1_type, c.dim2_type, c.dim3_type, c.dim4_type, c.dim5_type);
            });
            stmt.finalize(err => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'success' });
            });
        });
    });

    router.delete('/dimensions/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM dimensions WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Dimension deleted", changes: this.changes });
        });
    });

    router.get('/dimensions/groups', verifyToken, (req, res) => {
        const sql = `
            SELECT g.*, COUNT(m.dimension_id) as count
            FROM dimension_groups g
            LEFT JOIN dimension_group_members m ON g.id = m.group_id
            GROUP BY g.id
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    router.post('/dimensions/groups', verifyToken, (req, res) => {
        const { id, code, name, dim_type, description, members } = req.body;
        const groupId = id || `G${Date.now()}`;

        db.serialize(() => {
            db.run(`INSERT OR REPLACE INTO dimension_groups (id, code, name, dim_type, description) VALUES (?, ?, ?, ?, ?)`,
                [groupId, code, name, dim_type, description]);

            db.run(`DELETE FROM dimension_group_members WHERE group_id = ?`, [groupId]);

            if (members && members.length > 0) {
                const insert = db.prepare(`INSERT INTO dimension_group_members (group_id, dimension_id) VALUES (?, ?)`);
                members.forEach(mId => {
                    insert.run([groupId, mId]);
                });
                insert.finalize();
            }

            res.json({ message: "Group saved", id: groupId });
        });
    });

    return router;
};
