/**
 * Report Generator Service
 * SyntexLegger - Generates reports from templates by querying database
 *
 * This service:
 * 1. Takes a template with field mappings
 * 2. Builds safe SQL queries
 * 3. Executes and returns data
 * 4. Can export to Excel
 */

const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

// Whitelist of allowed tables for security
const ALLOWED_TABLES = [
    'chart_of_accounts',
    'vouchers',
    'voucher_items',
    'partners',
    'fixed_assets',
    'products',
    'inventory_transactions',
    'fund_sources',
    'budget_items',
    'projects',
    'contracts',
    'employees',
    'departments',
    'treasury_imports',
    'cash_books'
];

// Whitelist of allowed columns per table
const ALLOWED_COLUMNS = {
    chart_of_accounts: ['account_code', 'account_name', 'parent_account', 'level', 'category', 'type', 'tt99_class', 'is_parent', 'is_active', 'is_off_balance'],
    vouchers: ['id', 'doc_no', 'doc_date', 'post_date', 'description', 'type', 'total_amount', 'status', 'org_doc_no', 'org_doc_date', 'company_id', 'created_by', 'created_at'],
    voucher_items: ['id', 'voucher_id', 'line_no', 'description', 'debit_account', 'credit_account', 'amount', 'partner_code', 'project_code', 'contract_code', 'debt_note', 'dim1', 'dim2', 'dim3', 'dim4', 'dim5', 'product_code', 'quantity', 'unit_price', 'currency', 'fx_rate', 'fx_amount'],
    partners: ['partner_code', 'partner_name', 'tax_code', 'address', 'phone', 'email', 'bank_account', 'bank_name', 'type', 'company_id', 'is_active'],
    fixed_assets: ['id', 'asset_code', 'asset_name', 'asset_category', 'department', 'purchase_date', 'usage_date', 'original_value', 'accumulated_depreciation', 'net_book_value', 'useful_life_months', 'monthly_depreciation', 'asset_condition', 'company_id', 'is_active'],
    products: ['product_code', 'product_name', 'unit', 'category', 'specification', 'is_active'],
    inventory_transactions: ['id', 'product_code', 'transaction_type', 'quantity', 'unit_price', 'amount', 'voucher_id', 'warehouse_code'],
    fund_sources: ['fund_code', 'fund_name', 'fund_type', 'is_active'],
    budget_items: ['chapter_code', 'category_code', 'section_code', 'item_code', 'sub_item_code', 'name'],
    projects: ['project_code', 'project_name', 'budget', 'start_date', 'end_date', 'status'],
    contracts: ['contract_code', 'contract_name', 'partner_code', 'project_code', 'contract_value', 'sign_date', 'status'],
    employees: ['employee_code', 'employee_name', 'department_code', 'position', 'is_active'],
    departments: ['department_code', 'department_name', 'parent_code'],
    treasury_imports: ['id', 'import_date', 'transaction_date', 'type', 'amount', 'description', 'budget_code', 'chapter_code', 'category_code', 'status', 'tabmis_ref', 'reconcile_status', 'local_voucher_id'],
    cash_books: ['doc_date', 'doc_no', 'receipt_amount', 'payment_amount', 'balance', 'description']
};

/**
 * Validate table name against whitelist
 */
function isTableAllowed(tableName) {
    return ALLOWED_TABLES.includes(tableName);
}

/**
 * Validate column name against whitelist
 */
function isColumnAllowed(tableName, columnName) {
    const tableColumns = ALLOWED_COLUMNS[tableName];
    return tableColumns && tableColumns.includes(columnName);
}

/**
 * Sanitize identifier (table/column name)
 */
function sanitizeIdentifier(name) {
    // Only allow alphanumeric and underscore
    return name.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Build and execute report query from template
 * @param {Object} db - Knex database instance
 * @param {Object} template - Report template with mappings
 * @param {Object} filters - Query filters (date range, etc.)
 * @returns {Object} Query result with data and metadata
 */
async function generateReport(db, template, filters = {}) {
    const startTime = Date.now();

    // Parse template data
    const templateData = typeof template.template_data === 'string'
        ? JSON.parse(template.template_data)
        : template.template_data;

    const fieldMappings = typeof template.field_mappings === 'string'
        ? JSON.parse(template.field_mappings)
        : template.field_mappings;

    // Validate mappings
    const validMappings = validateMappings(fieldMappings);
    if (validMappings.errors.length > 0) {
        throw new Error(`Mapping không hợp lệ: ${validMappings.errors.join(', ')}`);
    }

    // Build query
    const queryBuilder = buildQuery(db, validMappings.mappings, filters);

    // Execute query
    const data = await queryBuilder;

    // Calculate generation time
    const generationTime = Date.now() - startTime;

    return {
        success: true,
        data,
        rowCount: data.length,
        columns: validMappings.mappings.map(m => ({
            field: m.alias || m.column,
            headerName: m.originalText,
            type: m.type
        })),
        generationTime,
        filters
    };
}

/**
 * Validate field mappings against whitelist
 */
function validateMappings(mappings) {
    const errors = [];
    const validMappings = [];

    for (const mapping of mappings) {
        if (!mapping.table || !mapping.column) {
            // Skip unmapped fields
            continue;
        }

        const table = sanitizeIdentifier(mapping.table);
        const column = sanitizeIdentifier(mapping.column);

        if (!isTableAllowed(table)) {
            errors.push(`Bảng không được phép: ${table}`);
            continue;
        }

        if (!isColumnAllowed(table, column)) {
            errors.push(`Cột không được phép: ${table}.${column}`);
            continue;
        }

        validMappings.push({
            ...mapping,
            table,
            column
        });
    }

    return { mappings: validMappings, errors };
}

/**
 * Build Knex query from mappings
 */
function buildQuery(db, mappings, filters) {
    if (mappings.length === 0) {
        throw new Error('Không có trường dữ liệu hợp lệ để truy vấn');
    }

    // Group mappings by table
    const tableFields = {};
    for (const m of mappings) {
        if (!tableFields[m.table]) {
            tableFields[m.table] = [];
        }
        tableFields[m.table].push(m);
    }

    const tables = Object.keys(tableFields);

    // Determine primary table (most fields or voucher-related)
    let primaryTable = tables[0];
    if (tables.includes('voucher_items')) {
        primaryTable = 'voucher_items';
    } else if (tables.includes('vouchers')) {
        primaryTable = 'vouchers';
    }

    // Start building query
    let query = db(primaryTable);

    // Add JOINs for other tables
    for (const table of tables) {
        if (table === primaryTable) continue;

        const joinCondition = getJoinCondition(primaryTable, table);
        if (joinCondition) {
            query = query.leftJoin(table, function() {
                this.on(db.raw(joinCondition));
            });
        }
    }

    // Build SELECT clause
    const selectColumns = [];
    for (const m of mappings) {
        const fullColumn = `${m.table}.${m.column}`;
        const alias = m.alias || m.originalText || m.column;

        if (m.aggregation) {
            selectColumns.push(db.raw(`${m.aggregation}(${fullColumn}) as ??`, [alias]));
        } else {
            selectColumns.push(db.raw(`${fullColumn} as ??`, [alias]));
        }
    }
    query = query.select(selectColumns);

    // Apply filters
    if (filters.fromDate && filters.toDate) {
        // Find date column
        const dateMapping = mappings.find(m =>
            m.column === 'doc_date' || m.column === 'post_date' || m.column === 'transaction_date'
        );
        if (dateMapping) {
            query = query.whereBetween(`${dateMapping.table}.${dateMapping.column}`, [filters.fromDate, filters.toDate]);
        }
    }

    if (filters.accountCode) {
        const accMapping = mappings.find(m =>
            m.column === 'account_code' || m.column === 'debit_account' || m.column === 'credit_account'
        );
        if (accMapping) {
            query = query.where(`${accMapping.table}.${accMapping.column}`, 'like', `${filters.accountCode}%`);
        }
    }

    if (filters.partnerCode) {
        const partnerMapping = mappings.find(m => m.column === 'partner_code');
        if (partnerMapping) {
            query = query.where(`${partnerMapping.table}.${partnerMapping.column}`, filters.partnerCode);
        }
    }

    if (filters.projectCode) {
        const projectMapping = mappings.find(m => m.column === 'project_code');
        if (projectMapping) {
            query = query.where(`${projectMapping.table}.${projectMapping.column}`, filters.projectCode);
        }
    }

    // Add GROUP BY if there are aggregations
    const hasAggregation = mappings.some(m => m.aggregation);
    if (hasAggregation) {
        const groupByColumns = mappings
            .filter(m => !m.aggregation)
            .map(m => `${m.table}.${m.column}`);
        if (groupByColumns.length > 0) {
            query = query.groupBy(groupByColumns);
        }
    }

    // Add ORDER BY
    const orderMapping = mappings.find(m =>
        m.column === 'doc_date' || m.column === 'account_code'
    );
    if (orderMapping) {
        query = query.orderBy(`${orderMapping.table}.${orderMapping.column}`);
    }

    // Limit results for safety
    query = query.limit(10000);

    return query;
}

/**
 * Get JOIN condition between two tables
 */
function getJoinCondition(table1, table2) {
    const joins = {
        'voucher_items|vouchers': 'voucher_items.voucher_id = vouchers.id',
        'vouchers|voucher_items': 'vouchers.id = voucher_items.voucher_id',
        'voucher_items|partners': 'voucher_items.partner_code = partners.partner_code',
        'voucher_items|chart_of_accounts': 'voucher_items.debit_account = chart_of_accounts.account_code',
        'voucher_items|products': 'voucher_items.product_code = products.product_code',
        'voucher_items|projects': 'voucher_items.project_code = projects.project_code',
        'voucher_items|contracts': 'voucher_items.contract_code = contracts.contract_code',
        'fixed_assets|departments': 'fixed_assets.department = departments.department_code',
        'employees|departments': 'employees.department_code = departments.department_code',
        'contracts|partners': 'contracts.partner_code = partners.partner_code',
        'contracts|projects': 'contracts.project_code = projects.project_code',
        'inventory_transactions|products': 'inventory_transactions.product_code = products.product_code',
        'inventory_transactions|vouchers': 'inventory_transactions.voucher_id = vouchers.id'
    };

    return joins[`${table1}|${table2}`] || joins[`${table2}|${table1}`];
}

/**
 * Export report data to Excel buffer
 * @param {Array} data - Report data rows
 * @param {Array} columns - Column definitions
 * @param {Object} options - Export options
 * @returns {Buffer} Excel file buffer
 */
function exportToExcel(data, columns, options = {}) {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Prepare header row
    const headers = columns.map(c => c.headerName || c.field);

    // Prepare data rows
    const rows = data.map(row => {
        return columns.map(col => {
            const value = row[col.field] || row[col.headerName];

            // Format based on type
            if (col.type === 'number' && typeof value === 'number') {
                return value;
            }
            if (col.type === 'date' && value) {
                return new Date(value).toLocaleDateString('vi-VN');
            }
            return value ?? '';
        });
    });

    // Create worksheet from array of arrays
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = columns.map((col, idx) => {
        const maxLength = Math.max(
            (headers[idx] || '').length,
            ...rows.map(r => String(r[idx] || '').length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    const sheetName = options.sheetName || 'Báo cáo';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate buffer
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Save template to database
 * @param {Object} db - Knex database instance
 * @param {Object} templateData - Template data to save
 * @param {Object} user - Current user
 * @returns {Object} Saved template
 */
async function saveTemplate(db, templateData, user) {
    const id = uuidv4();

    const template = {
        id,
        name: templateData.name,
        description: templateData.description || '',
        template_data: JSON.stringify(templateData.parsedTemplate),
        field_mappings: JSON.stringify(templateData.fieldMappings),
        aggregation_rules: JSON.stringify(templateData.aggregationRules || []),
        original_filename: templateData.filename,
        original_file_size: templateData.fileSize || 0,
        created_by: user?.username || 'system',
        company_id: user?.company_id || '1',
        is_shared: templateData.isShared ? 1 : 0,
        is_active: 1,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await db('report_templates').insert(template);

    return { id, ...template };
}

/**
 * Get templates for user
 * @param {Object} db - Knex database instance
 * @param {Object} user - Current user
 * @returns {Array} List of templates
 */
async function getTemplates(db, user) {
    const templates = await db('report_templates')
        .where(function() {
            this.where('created_by', user?.username || 'system')
                .orWhere('is_shared', 1);
        })
        .andWhere('is_active', 1)
        .orderBy('updated_at', 'desc')
        .select([
            'id',
            'name',
            'description',
            'original_filename',
            'created_by',
            'is_shared',
            'usage_count',
            'last_used_at',
            'created_at',
            'updated_at'
        ]);

    return templates.map(t => ({
        ...t,
        isOwner: t.created_by === (user?.username || 'system'),
        isShared: t.is_shared === 1
    }));
}

/**
 * Get template by ID
 */
async function getTemplateById(db, templateId) {
    const template = await db('report_templates')
        .where('id', templateId)
        .first();

    if (!template) {
        throw new Error('Template không tồn tại');
    }

    return {
        ...template,
        template_data: JSON.parse(template.template_data || '{}'),
        field_mappings: JSON.parse(template.field_mappings || '[]'),
        aggregation_rules: JSON.parse(template.aggregation_rules || '[]')
    };
}

/**
 * Update template usage count
 */
async function recordUsage(db, templateId) {
    await db('report_templates')
        .where('id', templateId)
        .update({
            usage_count: db.raw('usage_count + 1'),
            last_used_at: new Date().toISOString()
        });
}

/**
 * Log report generation
 */
async function logGeneration(db, templateId, templateName, params, result, user) {
    await db('report_generation_logs').insert({
        template_id: templateId,
        template_name: templateName,
        parameters: JSON.stringify(params),
        row_count: result.rowCount,
        output_format: params.outputFormat || 'view',
        generation_time_ms: result.generationTime,
        generated_by: user?.username || 'system',
        status: 'success',
        generated_at: new Date().toISOString()
    });
}

/**
 * Delete template
 */
async function deleteTemplate(db, templateId, user) {
    const template = await db('report_templates')
        .where('id', templateId)
        .first();

    if (!template) {
        throw new Error('Template không tồn tại');
    }

    if (template.created_by !== (user?.username || 'system')) {
        throw new Error('Bạn không có quyền xóa template này');
    }

    // Soft delete
    await db('report_templates')
        .where('id', templateId)
        .update({
            is_active: 0,
            updated_at: new Date().toISOString()
        });

    return { success: true };
}

module.exports = {
    generateReport,
    exportToExcel,
    saveTemplate,
    getTemplates,
    getTemplateById,
    recordUsage,
    logGeneration,
    deleteTemplate,
    // For testing
    validateMappings,
    buildQuery,
    isTableAllowed,
    isColumnAllowed
};
