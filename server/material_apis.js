const { v4: uuidv4 } = require('uuid');

/**
 * Material Management APIs for HCSN Inventory
 * Theo Thông tư 24/2024/TT-BTC
 */

// ==================== MATERIALS ====================

/**
 * GET /api/hcsn/materials
 * Lấy danh sách vật tư
 */
function getMaterials(db) {
    return (req, res) => {
        const { category, status, search } = req.query;

        let sql = 'SELECT * FROM materials WHERE 1=1';
        const params = [];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            sql += ' AND (code LIKE ? OR name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY code ASC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get materials error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * POST /api/hcsn/materials
 * Tạo vật tư mới
 */
function createMaterial(db) {
    return (req, res) => {
        const { code, name, category, unit, account_code, unit_price, min_stock, max_stock, notes } = req.body;

        if (!code || !name || !category || !unit) {
            return res.status(400).json({ error: 'Missing required fields: code, name, category, unit' });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // Auto-assign account code if not provided
        let acc = account_code;
        if (!acc) {
            if (category === 'MATERIAL') acc = '151';
            else if (category === 'TOOLS') acc = '152';
            else if (category === 'GOODS') acc = '153';
        }

        const sql = `INSERT INTO materials 
            (id, code, name, category, unit, account_code, unit_price, min_stock, max_stock, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`;

        db.run(sql, [id, code, name, category, unit, acc,
            unit_price || 0, min_stock || 0, max_stock || 0, notes, now, now],
            function (err) {
                if (err) {
                    console.error('Create material error:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ id, code, name, category });
            }
        );
    };
}

/**
 * PUT /api/hcsn/materials/:id
 * Cập nhật vật tư
 */
function updateMaterial(db) {
    return (req, res) => {
        const { id } = req.params;
        const { name, unit, unit_price, min_stock, max_stock, status, notes } = req.body;

        const sql = `UPDATE materials SET
            name = COALESCE(?, name),
            unit = COALESCE(?, unit),
            unit_price = COALESCE(?, unit_price),
            min_stock = COALESCE(?, min_stock),
            max_stock = COALESCE(?, max_stock),
            status = COALESCE(?, status),
            notes = COALESCE(?, notes),
            updated_at = ?
            WHERE id = ?`;

        db.run(sql, [name, unit, unit_price, min_stock, max_stock, status, notes, new Date().toISOString(), id],
            function (err) {
                if (err) {
                    console.error('Update material error:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Material not found' });
                }
                res.json({ message: 'Material updated successfully' });
            }
        );
    };
}

/**
 * DELETE /api/hcsn/materials/:id
 * Xóa vật tư (chỉ nếu chưa có giao dịch)
 */
function deleteMaterial(db) {
    return (req, res) => {
        const { id } = req.params;

        db.get('SELECT COUNT(*) as count FROM material_receipt_items WHERE material_id = ?', [id], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (row.count > 0) {
                return res.status(400).json({ error: 'Cannot delete material with existing transactions' });
            }

            db.run('DELETE FROM materials WHERE id = ?', [id], function (err) {
                if (err) {
                    console.error('Delete material error:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Material not found' });
                }
                res.json({ message: 'Material deleted successfully' });
            });
        });
    };
}

// ==================== MATERIAL RECEIPTS ====================

/**
 * GET /api/hcsn/material-receipts
 * Lấy danh sách phiếu nhập kho
 */
function getReceipts(db) {
    return (req, res) => {
        const { from, to, fiscal_year, fund_source_id, warehouse } = req.query;

        let sql = `SELECT mr.*, fs.name as fund_source_name, fs.code as fund_source_code
                   FROM material_receipts mr
                   LEFT JOIN fund_sources fs ON mr.fund_source_id = fs.id
                   WHERE 1=1`;
        const params = [];

        if (from) {
            sql += ' AND mr.receipt_date >= ?';
            params.push(from);
        }
        if (to) {
            sql += ' AND mr.receipt_date <= ?';
            params.push(to);
        }
        if (fiscal_year) {
            sql += ' AND mr.fiscal_year = ?';
            params.push(fiscal_year);
        }
        if (fund_source_id) {
            sql += ' AND mr.fund_source_id = ?';
            params.push(fund_source_id);
        }
        if (warehouse) {
            sql += ' AND mr.warehouse = ?';
            params.push(warehouse);
        }

        sql += ' ORDER BY mr.receipt_date DESC, mr.receipt_no DESC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get receipts error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * GET /api/hcsn/material-receipts/:id
 */
function getReceiptDetail(db) {
    return (req, res) => {
        const { id } = req.params;
        const sql = `SELECT mr.*, fs.name as fund_source_name
                     FROM material_receipts mr
                     LEFT JOIN fund_sources fs ON mr.fund_source_id = fs.id
                     WHERE mr.id = ?`;

        db.get(sql, [id], (err, receipt) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!receipt) {
                return res.status(404).json({ error: 'Receipt not found' });
            }

            const itemsSql = `SELECT mri.*, m.code as material_code, m.name as material_name, m.unit
                             FROM material_receipt_items mri
                             JOIN materials m ON mri.material_id = m.id
                             WHERE mri.receipt_id = ?`;

            db.all(itemsSql, [id], (err, items) => {
                if (err) return res.status(500).json({ error: err.message });
                receipt.items = items;
                res.json(receipt);
            });
        });
    };
}

/**
 * POST /api/hcsn/material-receipts
 * Tạo phiếu nhập kho mới + Tự động tạo bút toán
 */
/**
 * POST /api/hcsn/material-receipts
 * Tạo phiếu nhập kho mới + Tự động tạo bút toán
 */
/**
 * POST /api/hcsn/material-receipts
 */
function createReceipt(db) {
    return (req, res) => {
        const {
            receipt_no, receipt_date, fiscal_year,
            fund_source_id, supplier, warehouse,
            items, notes, payment_method, status // 'DRAFT' or 'POSTED'
        } = req.body;

        if (!receipt_no || !receipt_date || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields: receipt_no, receipt_date, items'
            });
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const year = fiscal_year || new Date(receipt_date).getFullYear();
        const docStatus = status || 'POSTED';

        // Calculate total
        const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

        db.serialize(() => {
            // 1. Insert Receipt
            const receiptSql = `INSERT INTO material_receipts
                (id, receipt_no, receipt_date, fiscal_year, fund_source_id, supplier, warehouse, total_amount, notes, status, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(receiptSql, [id, receipt_no, receipt_date, year, fund_source_id, supplier, warehouse || 'Kho chính',
                total_amount, notes, docStatus, req.user?.username, now, now], function (err) {
                    if (err) {
                        console.error('Create receipt error:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    // 2. Insert Items
                    const itemSql = `INSERT INTO material_receipt_items
                        (receipt_id, material_id, quantity, unit_price, amount, account_code, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    const stmt = db.prepare(itemSql);

                    items.forEach(item => {
                        const amount = item.quantity * item.unit_price;
                        stmt.run(id, item.material_id, item.quantity, item.unit_price, amount,
                            item.account_code || '151', item.notes);
                    });
                    stmt.finalize();

                    // If DRAFT, stop here
                    if (docStatus === 'DRAFT') {
                        return res.status(201).json({ id, receipt_no, message: 'Receipt saved as DRAFT' });
                    }

                    // 3. Update Inventory & Generate Voucher (Only for POSTED)

                    // Update Inventory Cards
                    items.forEach(item => {
                        const amount = item.quantity * item.unit_price;
                        updateInventoryCard(db, item.material_id, fund_source_id, year, warehouse || 'Kho chính',
                            item.quantity, amount, 'RECEIPT');
                    });

                    // Auto-generate Accounting Voucher
                    const voucherId = uuidv4();
                    const voucherSql = `INSERT INTO vouchers 
                        (id, doc_no, doc_date, post_date, description, type, total_amount, status, created_at)
                        VALUES (?, ?, ?, ?, ?, 'GENERAL', ?, 'POSTED', ?)`;

                    const desc = `Nhập kho vật tư theo PNK ${receipt_no}`;
                    db.run(voucherSql, [voucherId, receipt_no, receipt_date, receipt_date, desc, total_amount, now]);

                    // Debit 15x (Material Account), Credit Payment Account
                    const creditAcc = payment_method || '111'; // 111, 112, 331
                    const creditItemSql = `INSERT INTO voucher_items 
                        (voucher_id, description, debit_acc, credit_acc, amount, fund_source_id)
                        VALUES (?, ?, ?, ?, ?, ?)`;

                    // Credit Entry (Total)
                    db.run(creditItemSql, [voucherId, desc, '', creditAcc, total_amount, fund_source_id]);

                    // Debit Entries (Per Item/Account)
                    items.forEach(item => {
                        const amount = item.quantity * item.unit_price;
                        db.run(creditItemSql, [voucherId, `Nhập ${item.quantity} ${item.material_id}`,
                            item.account_code || '151', '', amount, fund_source_id]);
                    });

                    res.status(201).json({ id, receipt_no, message: 'Receipt & Voucher created successfully' });
                });
        });
    };
}
function updateReceipt(db) {
    return (req, res) => {
        const { id } = req.params;
        const {
            receipt_no, receipt_date, fiscal_year,
            fund_source_id, supplier, warehouse,
            items, notes, payment_method, status
        } = req.body;

        if (!receipt_no || !receipt_date || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const now = new Date().toISOString();
        const year = fiscal_year || new Date(receipt_date).getFullYear();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // 1. Get old receipt and items to reverse inventory
            db.get("SELECT * FROM material_receipts WHERE id = ?", [id], (err, oldReceipt) => {
                if (err || !oldReceipt) {
                    db.run("ROLLBACK");
                    return res.status(404).json({ error: 'Receipt not found' });
                }

                db.all("SELECT * FROM material_receipt_items WHERE receipt_id = ?", [id], (err, oldItems) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }

                    // Reverse old inventory if it was POSTED
                    if (oldReceipt.status === 'POSTED') {
                        oldItems.forEach(item => {
                            updateInventoryCard(db, item.material_id, oldReceipt.fund_source_id, oldReceipt.fiscal_year, oldReceipt.warehouse,
                                -item.quantity, -(item.quantity * item.unit_price), 'RECEIPT');
                        });

                        // Delete legacy voucher (found by doc_no)
                        db.run("DELETE FROM vouchers WHERE doc_no = ? AND type = 'GENERAL'", [oldReceipt.receipt_no]);
                        db.run("DELETE FROM voucher_items WHERE voucher_id IN (SELECT id FROM vouchers WHERE doc_no = ? AND type = 'GENERAL')", [oldReceipt.receipt_no]);
                    }

                    // 2. Update Receipt Header
                    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                    const updateSql = `UPDATE material_receipts SET 
                        receipt_no = ?, receipt_date = ?, fiscal_year = ?, 
                        fund_source_id = ?, supplier = ?, warehouse = ?, 
                        total_amount = ?, notes = ?, status = ?, updated_at = ?
                        WHERE id = ?`;

                    db.run(updateSql, [receipt_no, receipt_date, year, fund_source_id, supplier, warehouse, total_amount, notes, status, now, id], function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: err.message });
                        }

                        // 3. Delete and re-insert items
                        db.run("DELETE FROM material_receipt_items WHERE receipt_id = ?", [id], (err) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return res.status(500).json({ error: err.message });
                            }

                            const itemSql = `INSERT INTO material_receipt_items
                                (receipt_id, material_id, quantity, unit_price, amount, account_code, notes)
                                VALUES (?, ?, ?, ?, ?, ?, ?)`;
                            const stmt = db.prepare(itemSql);
                            items.forEach(item => {
                                stmt.run(id, item.material_id, item.quantity, item.unit_price, item.quantity * item.unit_price, item.account_code || '151', item.notes);
                            });
                            stmt.finalize();

                            // 4. Update Inventory & Voucher if POSTED
                            if (status === 'POSTED') {
                                items.forEach(item => {
                                    updateInventoryCard(db, item.material_id, fund_source_id, year, warehouse, item.quantity, item.quantity * item.unit_price, 'RECEIPT');
                                });

                                // Create new voucher
                                const voucherId = uuidv4();
                                const desc = `Sửa PNK ${receipt_no}: Nhập kho vật tư`;
                                db.run(`INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'GENERAL', ?, 'POSTED', ?)`,
                                    [voucherId, receipt_no, receipt_date, receipt_date, desc, total_amount, now]);

                                const creditAcc = payment_method || '111';
                                const viSql = `INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, fund_source_id) VALUES (?, ?, ?, ?, ?, ?)`;
                                db.run(viSql, [voucherId, desc, '', creditAcc, total_amount, fund_source_id]);
                                items.forEach(item => {
                                    db.run(viSql, [voucherId, `Nhập ${item.quantity} ${item.material_id}`, item.account_code || '151', '', item.quantity * item.unit_price, fund_source_id]);
                                });
                            }

                            db.run("COMMIT", (err) => {
                                if (err) return res.status(500).json({ error: err.message });
                                res.json({ message: 'Receipt updated successfully' });
                            });
                        });
                    });
                });
            });
        });
    };
}

// ==================== MATERIAL ISSUES ====================

/**
 * GET /api/hcsn/material-issues
 */
function getIssues(db) {
    return (req, res) => {
        const { from, to, fiscal_year, department, warehouse } = req.query;

        let sql = 'SELECT * FROM material_issues WHERE 1=1';
        const params = [];

        if (from) {
            sql += ' AND issue_date >= ?';
            params.push(from);
        }
        if (to) {
            sql += ' AND issue_date <= ?';
            params.push(to);
        }
        if (fiscal_year) {
            sql += ' AND fiscal_year = ?';
            params.push(fiscal_year);
        }
        if (department) {
            sql += ' AND department = ?';
            params.push(department);
        }

        sql += ' ORDER BY issue_date DESC, issue_no DESC';

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    };
}

/**
 * GET /api/hcsn/material-issues/:id
 */
function getIssueDetail(db) {
    return (req, res) => {
        const { id } = req.params;

        db.get('SELECT * FROM material_issues WHERE id = ?', [id], (err, issue) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!issue) return res.status(404).json({ error: 'Issue not found' });

            const itemsSql = `SELECT mii.*, m.code as material_code, m.name as material_name, m.unit, m.account_code as mat_acc
                             FROM material_issue_items mii
                             JOIN materials m ON mii.material_id = m.id
                             WHERE mii.issue_id = ?`;

            db.all(itemsSql, [id], (err, items) => {
                if (err) return res.status(500).json({ error: err.message });
                issue.items = items;
                res.json(issue);
            });
        });
    };
}

/**
 * POST /api/hcsn/material-issues
 */
/**
 * POST /api/hcsn/material-issues
 */
/**
 * POST /api/hcsn/material-issues
 */
function createIssue(db) {
    return (req, res) => {
        const {
            issue_no, issue_date, fiscal_year,
            department, receiver_name, purpose, warehouse,
            items, notes, approved_by, status
        } = req.body;

        if (!issue_no || !issue_date || !department || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields: issue_no, issue_date, department, items'
            });
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const year = fiscal_year || new Date(issue_date).getFullYear();
        const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const wh = warehouse || 'Kho chính';
        const docStatus = status || 'POSTED';

        db.serialize(() => {
            const issueSql = `INSERT INTO material_issues
                (id, issue_no, issue_date, fiscal_year, department, receiver_name, purpose, warehouse, total_amount, notes, status, approved_by, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(issueSql, [id, issue_no, issue_date, year, department, receiver_name, purpose,
                wh, total_amount, notes, docStatus, approved_by, req.user?.username, now, now],
                function (err) {
                    if (err) {
                        console.error('Create issue error:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    // 2. Insert Items
                    const itemSql = `INSERT INTO material_issue_items
                        (issue_id, material_id, quantity, unit_price, amount, expense_account_code, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    const stmt = db.prepare(itemSql);

                    items.forEach(item => {
                        const amount = item.quantity * item.unit_price;
                        stmt.run(id, item.material_id, item.quantity, item.unit_price, amount,
                            item.expense_account_code || '611', item.notes);
                    });
                    stmt.finalize();

                    if (docStatus === 'DRAFT') {
                        return res.status(201).json({ id, issue_no, message: 'Issue saved as DRAFT' });
                    }

                    // 3. Update Inventory (POSTED Only)
                    items.forEach(item => {
                        const amount = item.quantity * item.unit_price;
                        updateInventoryCard(db, item.material_id, null, year, wh,
                            item.quantity, amount, 'ISSUE');
                    });

                    // 4. Voucher (Debit Expense 61x / Credit Asset 15x)
                    const voucherId = uuidv4();
                    const desc = `Xuất kho vật tư cho ${department}`;
                    const voucherSql = `INSERT INTO vouchers 
                        (id, doc_no, doc_date, post_date, description, type, total_amount, status, created_at)
                        VALUES (?, ?, ?, ?, ?, 'GENERAL', ?, 'POSTED', ?)`;

                    db.run(voucherSql, [voucherId, issue_no, issue_date, issue_date, desc, total_amount, now]);

                    const itemVoucherSql = `INSERT INTO voucher_items 
                        (voucher_id, description, debit_acc, credit_acc, amount, dim1, fund_source_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`; // Using dim1 for Department

                    items.forEach(item => {
                        const amount = item.quantity * item.unit_price;
                        // Use material_account_code passed from frontend, default to 152 if missing
                        const creditAcc = item.material_account_code || '152';

                        db.run(itemVoucherSql, [voucherId, `Xuất ${item.quantity} ${item.material_id}`,
                            item.expense_account_code || '611', creditAcc, amount, department, 'fs_ns']);
                    });

                    res.status(201).json({ id, issue_no, message: 'Issue & Voucher created successfully' });
                });
        });
    };
}
function updateIssue(db) {
    return (req, res) => {
        const { id } = req.params;
        const {
            issue_no, issue_date, fiscal_year,
            department, receiver_name, purpose, warehouse,
            items, notes, approved_by, status
        } = req.body;

        if (!issue_no || !issue_date || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const now = new Date().toISOString();
        const year = fiscal_year || new Date(issue_date).getFullYear();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            db.get("SELECT * FROM material_issues WHERE id = ?", [id], (err, oldIssue) => {
                if (err || !oldIssue) {
                    db.run("ROLLBACK");
                    return res.status(404).json({ error: 'Issue not found' });
                }

                db.all("SELECT * FROM material_issue_items WHERE issue_id = ?", [id], (err, oldItems) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }

                    if (oldIssue.status === 'POSTED') {
                        oldItems.forEach(item => {
                            updateInventoryCard(db, item.material_id, null, oldIssue.fiscal_year, oldIssue.warehouse, -item.quantity, -(item.quantity * item.unit_price), 'ISSUE');
                        });
                        db.run("DELETE FROM vouchers WHERE doc_no = ? AND type = 'GENERAL'", [oldIssue.issue_no]);
                        db.run("DELETE FROM voucher_items WHERE voucher_id IN (SELECT id FROM vouchers WHERE doc_no = ? AND type = 'GENERAL')", [oldIssue.issue_no]);
                    }

                    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                    const updateSql = `UPDATE material_issues SET 
                        issue_no = ?, issue_date = ?, fiscal_year = ?, 
                        department = ?, receiver_name = ?, purpose = ?, warehouse = ?, 
                        total_amount = ?, notes = ?, status = ?, approved_by = ?, updated_at = ?
                        WHERE id = ?`;

                    db.run(updateSql, [issue_no, issue_date, year, department, receiver_name, purpose, warehouse, total_amount, notes, status, approved_by, now, id], function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: err.message });
                        }

                        db.run("DELETE FROM material_issue_items WHERE issue_id = ?", [id], (err) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return res.status(500).json({ error: err.message });
                            }

                            const itemSql = `INSERT INTO material_issue_items
                                (issue_id, material_id, quantity, unit_price, amount, expense_account_code, notes)
                                VALUES (?, ?, ?, ?, ?, ?, ?)`;
                            const stmt = db.prepare(itemSql);
                            items.forEach(item => {
                                stmt.run(id, item.material_id, item.quantity, item.unit_price, item.quantity * item.unit_price, item.expense_account_code || '611', item.notes);
                            });
                            stmt.finalize();

                            if (status === 'POSTED') {
                                items.forEach(item => {
                                    updateInventoryCard(db, item.material_id, null, year, warehouse, item.quantity, item.quantity * item.unit_price, 'ISSUE');
                                });

                                const voucherId = uuidv4();
                                const desc = `Sửa PXK ${issue_no}: Xuất kho cho ${department}`;
                                db.run(`INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'GENERAL', ?, 'POSTED', ?)`,
                                    [voucherId, issue_no, issue_date, issue_date, desc, total_amount, now]);

                                const viSql = `INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, dim1, fund_source_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                                items.forEach(item => {
                                    db.run(viSql, [voucherId, `Xuất ${item.quantity} ${item.material_id}`, item.expense_account_code || '611', item.material_account_code || '152', item.quantity * item.unit_price, department, 'fs_ns']);
                                });
                            }

                            db.run("COMMIT", err => {
                                if (err) return res.status(500).json({ error: err.message });
                                res.json({ message: 'Issue updated successfully' });
                            });
                        });
                    });
                });
            });
        });
    };
}

// ==================== MATERIAL TRANSFERS ====================

/**
 * GET /api/hcsn/material-transfers
 */
function getTransfers(db) {
    return (req, res) => {
        const { from, to, fiscal_year, warehouse } = req.query;

        let sql = 'SELECT * FROM material_transfers WHERE 1=1';
        const params = [];

        if (from) {
            sql += ' AND transfer_date >= ?';
            params.push(from);
        }
        if (to) {
            sql += ' AND transfer_date <= ?';
            params.push(to);
        }
        if (fiscal_year) {
            sql += ' AND fiscal_year = ?';
            params.push(fiscal_year);
        }
        if (warehouse) {
            sql += ' AND (from_warehouse = ? OR to_warehouse = ?)';
            params.push(warehouse, warehouse);
        }

        sql += ' ORDER BY transfer_date DESC, transfer_no DESC';

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    };
}

/**
 * GET /api/hcsn/material-transfers/:id
 */
function getTransferDetail(db) {
    return (req, res) => {
        const { id } = req.params;

        db.get('SELECT * FROM material_transfers WHERE id = ?', [id], (err, transfer) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

            const itemsSql = `SELECT mti.*, m.code as material_code, m.name as material_name, m.unit
                             FROM material_transfer_items mti
                             JOIN materials m ON mti.material_id = m.id
                             WHERE mti.transfer_id = ?`;

            db.all(itemsSql, [id], (err, items) => {
                if (err) return res.status(500).json({ error: err.message });
                transfer.items = items;
                res.json(transfer);
            });
        });
    };
}

/**
 * POST /api/hcsn/material-transfers
 */
/**
 * POST /api/hcsn/material-transfers
 */
function createTransfer(db) {
    return (req, res) => {
        const {
            transfer_no, transfer_date, fiscal_year,
            from_warehouse, to_warehouse,
            items, notes, approved_by
        } = req.body;

        if (!transfer_no || !transfer_date || !from_warehouse || !to_warehouse || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields: transfer_no, transfer_date, from_warehouse, to_warehouse, items'
            });
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const year = fiscal_year || new Date(transfer_date).getFullYear();

        db.serialize(() => {
            // 1. Insert Transfer Header
            const transferSql = `INSERT INTO material_transfers
                (id, transfer_no, transfer_date, fiscal_year, from_warehouse, to_warehouse, notes, status, approved_by, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?)`;

            db.run(transferSql, [id, transfer_no, transfer_date, year, from_warehouse, to_warehouse,
                notes, approved_by, req.user?.username, now, now],
                function (err) {
                    if (err) {
                        console.error('Create transfer error:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    // 2. Insert Items
                    const itemSql = `INSERT INTO material_transfer_items
                        (transfer_id, material_id, quantity, notes)
                        VALUES (?, ?, ?, ?)`;
                    const stmt = db.prepare(itemSql);

                    items.forEach(item => {
                        stmt.run(id, item.material_id, item.quantity, item.notes);
                    });
                    stmt.finalize();

                    // 3. Update Inventory Cards (Move Stock)
                    items.forEach(item => {
                        // ISSUE from Source
                        updateInventoryCard(db, item.material_id, null, year, from_warehouse,
                            item.quantity, 0, 'ISSUE');

                        // RECEIPT at Destination
                        updateInventoryCard(db, item.material_id, null, year, to_warehouse,
                            item.quantity, 0, 'RECEIPT');
                    });

                    res.status(201).json({ id, transfer_no, message: 'Transfer created successfully' });
                });
        });
    };
}
function updateTransfer(db) {
    return (req, res) => {
        const { id } = req.params;
        const {
            transfer_no, transfer_date, fiscal_year,
            from_warehouse, to_warehouse,
            items, notes, approved_by, status
        } = req.body;

        if (!transfer_no || !transfer_date || !from_warehouse || !to_warehouse || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const now = new Date().toISOString();
        const year = fiscal_year || new Date(transfer_date).getFullYear();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            db.get("SELECT * FROM material_transfers WHERE id = ?", [id], (err, oldTransfer) => {
                if (err || !oldTransfer) {
                    db.run("ROLLBACK");
                    return res.status(404).json({ error: 'Transfer not found' });
                }

                db.all("SELECT * FROM material_transfer_items WHERE transfer_id = ?", [id], (err, oldItems) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }

                    if (oldTransfer.status === 'POSTED') {
                        oldItems.forEach(item => {
                            updateInventoryCard(db, item.material_id, null, oldTransfer.fiscal_year, oldTransfer.from_warehouse, -item.quantity, 0, 'ISSUE');
                            updateInventoryCard(db, item.material_id, null, oldTransfer.fiscal_year, oldTransfer.to_warehouse, -item.quantity, 0, 'RECEIPT');
                        });
                    }

                    const updateSql = `UPDATE material_transfers SET 
                        transfer_no = ?, transfer_date = ?, fiscal_year = ?, 
                        from_warehouse = ?, to_warehouse = ?, notes = ?, 
                        status = ?, approved_by = ?, updated_at = ?
                        WHERE id = ?`;

                    db.run(updateSql, [transfer_no, transfer_date, year, from_warehouse, to_warehouse, notes, status || 'POSTED', approved_by, now, id], function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: err.message });
                        }

                        db.run("DELETE FROM material_transfer_items WHERE transfer_id = ?", [id], (err) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return res.status(500).json({ error: err.message });
                            }

                            const itemSql = `INSERT INTO material_transfer_items (transfer_id, material_id, quantity, notes) VALUES (?, ?, ?, ?)`;
                            const stmt = db.prepare(itemSql);
                            items.forEach(item => {
                                stmt.run(id, item.material_id, item.quantity, item.notes);
                            });
                            stmt.finalize();

                            if (status === 'POSTED') {
                                items.forEach(item => {
                                    updateInventoryCard(db, item.material_id, null, year, from_warehouse, item.quantity, 0, 'ISSUE');
                                    updateInventoryCard(db, item.material_id, null, year, to_warehouse, item.quantity, 0, 'RECEIPT');
                                });
                            }

                            db.run("COMMIT", err => {
                                if (err) return res.status(500).json({ error: err.message });
                                res.json({ message: 'Transfer updated successfully' });
                            });
                        });
                    });
                });
            });
        });
    };
}

// ==================== INVENTORY & REPORTS ====================

/**
 * GET /api/hcsn/inventory/summary
 */
function getInventorySummary(db) {
    return (req, res) => {
        const { fiscal_year, fund_source_id, warehouse } = req.query;
        const year = fiscal_year || new Date().getFullYear();

        let sql = `SELECT 
            m.code as material_code,
            m.name as material_name,
            m.unit,
            m.category,
            fs.name as fund_source_name,
            ic.warehouse,
            ic.opening_qty,
            ic.opening_amount,
            ic.receipts_qty,
            ic.receipts_amount,
            ic.issues_qty,
            ic.issues_amount,
            ic.closing_qty,
            ic.closing_amount,
            ic.material_id,     -- Added ID
            ic.fund_source_id   -- Added ID
            FROM inventory_cards ic
            JOIN materials m ON ic.material_id = m.id
            LEFT JOIN fund_sources fs ON ic.fund_source_id = fs.id
            WHERE ic.fiscal_year = ?`;

        const params = [year];
        if (fund_source_id) {
            sql += ' AND ic.fund_source_id = ?';
            params.push(fund_source_id);
        }
        if (warehouse) {
            sql += ' AND ic.warehouse = ?';
            params.push(warehouse);
        }

        sql += ' ORDER BY m.code ASC';

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    };
}

/**
 * GET /api/hcsn/inventory/cards/:material_id
 */
function getInventoryCards(db) {
    return (req, res) => {
        const { material_id } = req.params;
        const { fiscal_year } = req.query;
        const year = fiscal_year || new Date().getFullYear();

        const sql = `SELECT ic.*, m.code as material_code, m.name as material_name, m.unit,
                     fs.name as fund_source_name, fs.code as fund_source_code
                     FROM inventory_cards ic
                     JOIN materials m ON ic.material_id = m.id
                     LEFT JOIN fund_sources fs ON ic.fund_source_id = fs.id
                     WHERE ic.material_id = ? AND ic.fiscal_year = ?
                     ORDER BY fs.code ASC, ic.warehouse ASC`;

        db.all(sql, [material_id, year], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    };
}

// ==================== HELPER ====================

function getFundSources(db) {
    return (req, res) => {
        db.all('SELECT * FROM fund_sources', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
}

/**
 * GET /api/hcsn/budget-estimates
 * Lấy danh sách dự toán HCSN
 */
function getBudgetEstimates(db) {
    return (req, res) => {
        const { fiscal_year, chapter_code, budget_type, fund_source_id } = req.query;

        let sql = 'SELECT * FROM budget_estimates WHERE 1=1';
        const params = [];

        if (fiscal_year) {
            sql += ' AND fiscal_year = ?';
            params.push(parseInt(fiscal_year));
        }

        if (chapter_code) {
            sql += ' AND chapter_code = ?';
            params.push(chapter_code);
        }

        if (budget_type) {
            sql += ' AND budget_type = ?';
            params.push(budget_type);
        }

        if (fund_source_id) {
            sql += ' AND fund_source_id = ?';
            params.push(fund_source_id);
        }

        sql += ' ORDER BY item_code ASC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get budget estimates error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * GET /api/hcsn/budget-allocations
 * Lấy danh sách phân bổ dự toán
 */
function getBudgetAllocations(db) {
    return (req, res) => {
        const { budget_estimate_id, department_code, project_code } = req.query;

        let sql = `SELECT ba.*, be.item_code, be.item_name, be.fiscal_year, be.budget_type 
                   FROM budget_allocations ba
                   JOIN budget_estimates be ON ba.budget_estimate_id = be.id
                   WHERE 1=1`;
        const params = [];

        if (budget_estimate_id) {
            sql += ' AND ba.budget_estimate_id = ?';
            params.push(budget_estimate_id);
        }

        if (department_code) {
            sql += ' AND ba.department_code = ?';
            params.push(department_code);
        }

        if (project_code) {
            sql += ' AND ba.project_code = ?';
            params.push(project_code);
        }

        sql += ' ORDER BY be.item_code ASC, ba.department_code ASC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get budget allocations error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

function updateInventoryCard(db, material_id, fund_source_id, fiscal_year, warehouse, qty, amount, type) {
    const selectSql = `SELECT * FROM inventory_cards 
                      WHERE material_id = ? AND fiscal_year = ? AND warehouse = ?
                      ${fund_source_id ? 'AND fund_source_id = ?' : ''}
                      LIMIT 1`;

    const selectParams = fund_source_id ? [material_id, fiscal_year, warehouse, fund_source_id]
        : [material_id, fiscal_year, warehouse];

    db.get(selectSql, selectParams, (err, card) => {
        if (err) {
            console.error('Error getting inventory card:', err);
            return;
        }
        const now = new Date().toISOString();
        if (!card) {
            const insertSql = `INSERT INTO inventory_cards 
                (material_id, fund_source_id, fiscal_year, warehouse, 
                 opening_qty, opening_amount, 
                 receipts_qty, receipts_amount, 
                 issues_qty, issues_amount, 
                 closing_qty, closing_amount, 
                 last_updated)
                VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)`;

            const receipts_qty = type === 'RECEIPT' ? qty : 0;
            const receipts_amount = type === 'RECEIPT' ? amount : 0;
            const issues_qty = type === 'ISSUE' ? qty : 0;
            const issues_amount = type === 'ISSUE' ? amount : 0;
            const closing_qty = receipts_qty - issues_qty;
            const closing_amount = receipts_amount - issues_amount;

            // Default 'fs_ns' if fund_source_id is null for ISSUE (simplified)
            // Ideally ISSUE should decrement from specific fund source card.
            // Future improvement: FIFO or Specific Identification.
            const fs = fund_source_id || 'fs_ns';

            db.run(insertSql, [material_id, fs, fiscal_year, warehouse,
                receipts_qty, receipts_amount, issues_qty, issues_amount,
                closing_qty, closing_amount, now]);
        } else {
            let updateSql, updateParams;
            if (type === 'RECEIPT') {
                updateSql = `UPDATE inventory_cards SET
                    receipts_qty = receipts_qty + ?,
                    receipts_amount = receipts_amount + ?,
                    closing_qty = closing_qty + ?,
                    closing_amount = closing_amount + ?,
                    last_updated = ? WHERE id = ?`;
                updateParams = [qty, amount, qty, amount, now, card.id];
            } else {
                updateSql = `UPDATE inventory_cards SET
                    issues_qty = issues_qty + ?,
                    issues_amount = issues_amount + ?,
                    closing_qty = closing_qty - ?,
                    closing_amount = closing_amount - ?,
                    last_updated = ? WHERE id = ?`;
                updateParams = [qty, amount, qty, amount, now, card.id];
            }
            db.run(updateSql, updateParams);
        }
    });
}

// ==================== BULK IMPORT ====================

/**
 * POST /api/hcsn/materials/import
 * Nhập hàng loạt danh mục vật tư từ Excel
 */
function importMaterials(db) {
    return (req, res) => {
        const { materials } = req.body;

        if (!materials || !Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({ error: 'Missing or empty materials array' });
        }

        const now = new Date().toISOString();
        let inserted = 0, updated = 0;
        const errors = [];

        db.serialize(() => {
            materials.forEach((mat, index) => {
                // Validate required fields
                if (!mat.code || !mat.name) {
                    errors.push({ row: index + 1, error: 'Thiếu mã hoặc tên vật tư' });
                    return;
                }

                // Auto-assign account code based on category
                let acc = mat.account_code;
                if (!acc) {
                    if (mat.category === 'MATERIAL' || mat.category === 'VẬT TƯ') acc = '152';
                    else if (mat.category === 'TOOLS' || mat.category === 'CÔNG CỤ') acc = '153';
                    else if (mat.category === 'GOODS' || mat.category === 'HÀNG HÓA') acc = '155';
                    else acc = '152'; // Default
                }

                // Normalize category
                let category = mat.category || 'MATERIAL';
                if (category === 'VẬT TƯ') category = 'MATERIAL';
                else if (category === 'CÔNG CỤ') category = 'TOOLS';
                else if (category === 'HÀNG HÓA') category = 'GOODS';

                // Check if material exists by code
                db.get('SELECT id FROM materials WHERE code = ?', [mat.code], (err, existing) => {
                    if (err) {
                        errors.push({ row: index + 1, error: err.message });
                        return;
                    }

                    if (existing) {
                        // Update existing
                        const updateSql = `UPDATE materials SET
                            name = ?, category = ?, unit = ?, account_code = ?,
                            unit_price = ?, min_stock = ?, max_stock = ?, notes = ?, updated_at = ?
                            WHERE code = ?`;
                        db.run(updateSql, [
                            mat.name, category, mat.unit || 'Cái', acc,
                            mat.unit_price || 0, mat.min_stock || 0, mat.max_stock || 0,
                            mat.notes || '', now, mat.code
                        ], function (err) {
                            if (err) errors.push({ row: index + 1, error: err.message });
                            else updated++;
                        });
                    } else {
                        // Insert new
                        const id = uuidv4();
                        const insertSql = `INSERT INTO materials
                            (id, code, name, category, unit, account_code, unit_price, min_stock, max_stock, status, notes, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`;
                        db.run(insertSql, [
                            id, mat.code, mat.name, category, mat.unit || 'Cái', acc,
                            mat.unit_price || 0, mat.min_stock || 0, mat.max_stock || 0,
                            mat.notes || '', now, now
                        ], function (err) {
                            if (err) errors.push({ row: index + 1, error: err.message });
                            else inserted++;
                        });
                    }
                });
            });

            // Use setTimeout to allow all async db operations to complete
            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Nhập vật tư thành công`,
                    inserted,
                    updated,
                    errors: errors.length > 0 ? errors : undefined
                });
            }, 100);
        });
    };
}

/**
 * POST /api/hcsn/fund-sources/import
 * Nhập hàng loạt nguồn vốn từ Excel
 */
function importFundSources(db) {
    return (req, res) => {
        const { fundSources } = req.body;

        if (!fundSources || !Array.isArray(fundSources) || fundSources.length === 0) {
            return res.status(400).json({ error: 'Missing or empty fundSources array' });
        }

        const now = new Date().toISOString();
        let inserted = 0, updated = 0;
        const errors = [];

        db.serialize(() => {
            fundSources.forEach((fs, index) => {
                // Validate required fields
                if (!fs.code || !fs.name) {
                    errors.push({ row: index + 1, error: 'Thiếu mã hoặc tên nguồn vốn' });
                    return;
                }

                // Check if fund source exists
                db.get('SELECT id FROM fund_sources WHERE code = ?', [fs.code], (err, existing) => {
                    if (err) {
                        errors.push({ row: index + 1, error: err.message });
                        return;
                    }

                    if (existing) {
                        // Update existing
                        const updateSql = `UPDATE fund_sources SET
                            name = ?, category = ?, description = ?, is_active = ?, updated_at = ?
                            WHERE code = ?`;
                        db.run(updateSql, [
                            fs.name, fs.category || 'NGÂN SÁCH', fs.description || '',
                            fs.is_active !== false ? 1 : 0, now, fs.code
                        ], function (err) {
                            if (err) errors.push({ row: index + 1, error: err.message });
                            else updated++;
                        });
                    } else {
                        // Insert new
                        const id = `fs_${fs.code.toLowerCase().replace(/\s+/g, '_')}`;
                        const insertSql = `INSERT INTO fund_sources
                            (id, code, name, category, description, is_active, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, 1, ?, ?)`;
                        db.run(insertSql, [
                            id, fs.code, fs.name, fs.category || 'NGÂN SÁCH',
                            fs.description || '', now, now
                        ], function (err) {
                            if (err) errors.push({ row: index + 1, error: err.message });
                            else inserted++;
                        });
                    }
                });
            });

            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Nhập nguồn vốn thành công`,
                    inserted,
                    updated,
                    errors: errors.length > 0 ? errors : undefined
                });
            }, 100);
        });
    };
}

/**
 * POST /api/hcsn/budget-estimates/import
 * Nhập hàng loạt dự toán từ Excel
 */
function importBudgetEstimates(db) {
    return (req, res) => {
        const { estimates, fiscal_year } = req.body;

        if (!estimates || !Array.isArray(estimates) || estimates.length === 0) {
            return res.status(400).json({ error: 'Missing or empty estimates array' });
        }

        const year = fiscal_year || new Date().getFullYear();
        const now = new Date().toISOString();
        let inserted = 0, updated = 0;
        const errors = [];

        db.serialize(() => {
            estimates.forEach((est, index) => {
                // Validate required fields
                if (!est.chapter_code || !est.budget_type) {
                    errors.push({ row: index + 1, error: 'Thiếu mã chương hoặc loại ngân sách' });
                    return;
                }

                // Check if estimate exists for this year and chapter
                const checkSql = `SELECT id FROM budget_estimates
                    WHERE fiscal_year = ? AND chapter_code = ? AND budget_type = ?
                    AND COALESCE(fund_source_id, '') = COALESCE(?, '')`;

                db.get(checkSql, [year, est.chapter_code, est.budget_type, est.fund_source_id || ''], (err, existing) => {
                    if (err) {
                        errors.push({ row: index + 1, error: err.message });
                        return;
                    }

                    if (existing) {
                        // Update existing
                        const updateSql = `UPDATE budget_estimates SET
                            opening_amount = ?, annual_amount = ?, adjusted_amount = ?,
                            description = ?, updated_at = ?
                            WHERE id = ?`;
                        db.run(updateSql, [
                            est.opening_amount || 0, est.annual_amount || 0, est.adjusted_amount || 0,
                            est.description || '', now, existing.id
                        ], function (err) {
                            if (err) errors.push({ row: index + 1, error: err.message });
                            else updated++;
                        });
                    } else {
                        // Insert new
                        const id = uuidv4();
                        const insertSql = `INSERT INTO budget_estimates
                            (id, fiscal_year, chapter_code, budget_type, fund_source_id,
                             opening_amount, annual_amount, adjusted_amount, description, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        db.run(insertSql, [
                            id, year, est.chapter_code, est.budget_type, est.fund_source_id || null,
                            est.opening_amount || 0, est.annual_amount || 0, est.adjusted_amount || 0,
                            est.description || '', now, now
                        ], function (err) {
                            if (err) errors.push({ row: index + 1, error: err.message });
                            else inserted++;
                        });
                    }
                });
            });

            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Nhập dự toán năm ${year} thành công`,
                    inserted,
                    updated,
                    errors: errors.length > 0 ? errors : undefined
                });
            }, 100);
        });
    };
}

// ==================== EXPORTS ====================

module.exports = {
    getMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    importMaterials,
    importFundSources,
    importBudgetEstimates,
    getReceipts,
    getReceiptDetail,
    createReceipt,
    updateReceipt,
    getIssues,
    getIssueDetail,
    createIssue,
    updateIssue,
    getTransfers,
    getTransferDetail,
    createTransfer,
    updateTransfer,
    getInventorySummary,
    getInventoryCards,
    getFundSources,
    getBudgetEstimates,
    getBudgetAllocations
};
