/**
 * Template Parser Service
 * SyntexHCSN - Analyzes Excel templates and maps fields to database schema
 *
 * This is the PRIMARY parsing engine using local Vietnamese dictionary.
 * AI enhancement is optional and handled by ai-enhancer.service.js
 */

const XLSX = require('xlsx');
const crypto = require('crypto');
const {
    VIETNAMESE_TERMS,
    REPORT_PATTERNS,
    AGGREGATION_KEYWORDS,
    DATE_PERIOD_KEYWORDS,
    normalizeVietnamese,
    findBestMatch,
    detectReportType,
    calculateSimilarity
} = require('../utils/vietnamese-accounting-terms');

/**
 * Parse Excel file buffer and extract template structure
 * @param {Buffer} fileBuffer - The Excel file buffer
 * @param {string} filename - Original filename
 * @returns {Object} Parsed template data
 */
function parseExcelTemplate(fileBuffer, filename) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellStyles: true, cellFormula: true });

    const result = {
        filename,
        sheets: [],
        detectedFields: [],
        reportType: null,
        aggregations: [],
        dateFilters: [],
        templateHash: null,
        parseTimestamp: new Date().toISOString()
    };

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = parseSheet(worksheet, sheetName);
        result.sheets.push(sheetData);

        // Collect fields from all sheets
        result.detectedFields.push(...sheetData.detectedFields);
    }

    // Detect report type based on all fields
    const allFieldNames = result.detectedFields.map(f => f.originalText);
    result.reportType = detectReportType(allFieldNames);

    // Generate template hash for caching
    result.templateHash = generateTemplateHash(result.detectedFields);

    return result;
}

/**
 * Parse a single worksheet
 * @param {Object} worksheet - XLSX worksheet object
 * @param {string} sheetName - Name of the sheet
 * @returns {Object} Parsed sheet data
 */
function parseSheet(worksheet, sheetName) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const sheetData = {
        name: sheetName,
        rowCount: range.e.r - range.s.r + 1,
        colCount: range.e.c - range.s.c + 1,
        headers: [],
        detectedFields: [],
        mergedCells: worksheet['!merges'] || [],
        dataStartRow: null,
        structure: {
            headerRows: [],
            dataRows: [],
            footerRows: []
        }
    };

    // First pass: identify potential header rows (usually first few rows)
    const potentialHeaders = [];
    for (let row = range.s.r; row <= Math.min(range.s.r + 10, range.e.r); row++) {
        const rowData = [];
        let hasText = false;

        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellRef];
            const value = cell ? getCellValue(cell) : '';

            rowData.push({
                col,
                value,
                type: cell ? cell.t : null,
                formula: cell ? cell.f : null
            });

            if (value && typeof value === 'string' && value.trim()) {
                hasText = true;
            }
        }

        if (hasText) {
            potentialHeaders.push({ row, cells: rowData });
        }
    }

    // Analyze headers to find field names
    for (const header of potentialHeaders) {
        for (const cell of header.cells) {
            if (cell.value && typeof cell.value === 'string') {
                const fieldAnalysis = analyzeFieldName(cell.value, header.row, cell.col);
                if (fieldAnalysis) {
                    sheetData.detectedFields.push(fieldAnalysis);
                    sheetData.headers.push({
                        row: header.row,
                        col: cell.col,
                        text: cell.value,
                        mapping: fieldAnalysis.mapping
                    });
                }
            }
        }
    }

    // Determine data start row (first row after headers with numeric data)
    const lastHeaderRow = Math.max(...sheetData.headers.map(h => h.row), 0);
    sheetData.dataStartRow = lastHeaderRow + 1;

    // Classify row types
    sheetData.structure.headerRows = potentialHeaders.filter(h => h.row <= lastHeaderRow).map(h => h.row);

    return sheetData;
}

/**
 * Get cell value handling different types
 */
function getCellValue(cell) {
    if (!cell) return '';

    switch (cell.t) {
        case 's': return cell.v; // string
        case 'n': return cell.v; // number
        case 'b': return cell.v; // boolean
        case 'd': return cell.v; // date
        case 'e': return cell.w || ''; // error
        default: return cell.v || cell.w || '';
    }
}

/**
 * Analyze a field name and attempt to map it to database schema
 * @param {string} text - The field text from Excel
 * @param {number} row - Row number
 * @param {number} col - Column number
 * @returns {Object|null} Field analysis result
 */
function analyzeFieldName(text, row, col) {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (trimmed.length < 2) return null;

    // Skip common non-field texts
    const skipPatterns = [
        /^(stt|tt|#)$/i,
        /^(\d+|[A-Z])$/,
        /^(trang|page)/i,
        /^(cộng|tổng cộng)$/i // These are aggregation rows, not fields
    ];

    const normalized = normalizeVietnamese(trimmed);
    if (skipPatterns.some(p => p.test(normalized))) {
        return null;
    }

    // Try to find a match in the dictionary
    const match = findBestMatch(trimmed, 0.5);

    // Check for aggregation keywords
    const aggregation = detectAggregation(trimmed);

    // Check for date period keywords
    const datePeriod = detectDatePeriod(trimmed);

    return {
        originalText: trimmed,
        normalizedText: normalized,
        position: { row, col },
        mapping: match ? {
            table: match.mapping.table,
            column: match.mapping.column,
            type: match.mapping.type,
            confidence: match.confidence,
            matchedTerm: match.term
        } : null,
        aggregation,
        datePeriod,
        confidence: match ? match.confidence : 0,
        needsAIEnhancement: !match || match.confidence < 0.7
    };
}

/**
 * Detect aggregation function in field name
 */
function detectAggregation(text) {
    const normalized = normalizeVietnamese(text);

    for (const [keyword, func] of Object.entries(AGGREGATION_KEYWORDS)) {
        if (normalized.includes(normalizeVietnamese(keyword))) {
            return { function: func, keyword };
        }
    }

    return null;
}

/**
 * Detect date period keywords
 */
function detectDatePeriod(text) {
    const normalized = normalizeVietnamese(text);

    for (const [keyword, type] of Object.entries(DATE_PERIOD_KEYWORDS)) {
        if (normalized.includes(normalizeVietnamese(keyword))) {
            return { type, keyword };
        }
    }

    return null;
}

/**
 * Generate a hash of the template for caching purposes
 */
function generateTemplateHash(detectedFields) {
    const fieldSignature = detectedFields
        .map(f => f.normalizedText)
        .sort()
        .join('|');

    return crypto
        .createHash('sha256')
        .update(fieldSignature)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Enhance field mappings with user corrections
 * @param {Object} templateData - Original parsed template
 * @param {Array} corrections - User-provided field corrections
 * @returns {Object} Enhanced template data
 */
function applyUserCorrections(templateData, corrections) {
    const enhanced = { ...templateData };

    for (const correction of corrections) {
        const field = enhanced.detectedFields.find(
            f => f.originalText === correction.originalText
        );

        if (field) {
            field.mapping = {
                table: correction.table,
                column: correction.column,
                type: correction.type || 'text',
                confidence: 1.0, // User-provided = full confidence
                matchedTerm: null,
                userCorrected: true
            };
            field.confidence = 1.0;
            field.needsAIEnhancement = false;
        }
    }

    return enhanced;
}

/**
 * Get fields that need AI enhancement (confidence < threshold)
 * @param {Object} templateData - Parsed template data
 * @param {number} threshold - Confidence threshold (default 0.7)
 * @returns {Array} Fields needing enhancement
 */
function getFieldsNeedingEnhancement(templateData, threshold = 0.7) {
    return templateData.detectedFields.filter(
        f => !f.mapping || f.confidence < threshold
    );
}

/**
 * Build SQL query structure from template mappings
 * @param {Object} templateData - Template with field mappings
 * @returns {Object} SQL query structure
 */
function buildQueryStructure(templateData) {
    const mappedFields = templateData.detectedFields.filter(f => f.mapping);

    if (mappedFields.length === 0) {
        return null;
    }

    // Group fields by table
    const tableFields = {};
    for (const field of mappedFields) {
        const table = field.mapping.table;
        if (!tableFields[table]) {
            tableFields[table] = [];
        }
        tableFields[table].push({
            column: field.mapping.column,
            alias: field.originalText,
            type: field.mapping.type,
            aggregation: field.aggregation
        });
    }

    // Determine primary table (most fields)
    const primaryTable = Object.entries(tableFields)
        .sort((a, b) => b[1].length - a[1].length)[0]?.[0];

    // Build joins based on known relationships
    const joins = buildJoins(Object.keys(tableFields), primaryTable);

    // Build SELECT clause
    const selectFields = mappedFields.map(f => {
        const fullColumn = `${f.mapping.table}.${f.mapping.column}`;
        if (f.aggregation) {
            return `${f.aggregation.function}(${fullColumn}) AS "${f.originalText}"`;
        }
        return `${fullColumn} AS "${f.originalText}"`;
    });

    // Determine GROUP BY if there are aggregations
    const hasAggregation = mappedFields.some(f => f.aggregation);
    const groupByFields = hasAggregation
        ? mappedFields
            .filter(f => !f.aggregation)
            .map(f => `${f.mapping.table}.${f.mapping.column}`)
        : [];

    // Build ORDER BY from report pattern
    const orderBy = templateData.reportType?.pattern?.orderBy || [];

    return {
        primaryTable,
        selectFields,
        joins,
        groupBy: groupByFields,
        orderBy,
        tables: Object.keys(tableFields)
    };
}

/**
 * Build JOIN clauses based on table relationships
 */
function buildJoins(tables, primaryTable) {
    const joins = [];

    // Known relationships in HCSN schema
    const relationships = {
        'voucher_items': {
            'vouchers': 'voucher_items.voucher_id = vouchers.id',
            'chart_of_accounts': 'voucher_items.debit_account = chart_of_accounts.account_code OR voucher_items.credit_account = chart_of_accounts.account_code',
            'partners': 'voucher_items.partner_code = partners.partner_code',
            'products': 'voucher_items.product_code = products.product_code',
            'projects': 'voucher_items.project_code = projects.project_code',
            'contracts': 'voucher_items.contract_code = contracts.contract_code'
        },
        'vouchers': {
            'voucher_items': 'vouchers.id = voucher_items.voucher_id'
        },
        'fixed_assets': {
            'departments': 'fixed_assets.department = departments.department_code'
        },
        'employees': {
            'departments': 'employees.department_code = departments.department_code'
        },
        'contracts': {
            'partners': 'contracts.partner_code = partners.partner_code',
            'projects': 'contracts.project_code = projects.project_code'
        },
        'inventory_transactions': {
            'products': 'inventory_transactions.product_code = products.product_code',
            'vouchers': 'inventory_transactions.voucher_id = vouchers.id'
        }
    };

    for (const table of tables) {
        if (table === primaryTable) continue;

        // Check if primary table has relationship to this table
        let joinCondition = relationships[primaryTable]?.[table];

        // If not, check reverse relationship
        if (!joinCondition) {
            joinCondition = relationships[table]?.[primaryTable];
        }

        if (joinCondition) {
            joins.push({
                type: 'LEFT JOIN',
                table,
                condition: joinCondition
            });
        }
    }

    return joins;
}

/**
 * Validate template structure
 * @param {Object} templateData - Parsed template data
 * @returns {Object} Validation result
 */
function validateTemplate(templateData) {
    const errors = [];
    const warnings = [];

    // Check if any fields were detected
    if (templateData.detectedFields.length === 0) {
        errors.push('Không tìm thấy trường dữ liệu nào trong template');
    }

    // Check mapping coverage
    const mappedCount = templateData.detectedFields.filter(f => f.mapping).length;
    const totalCount = templateData.detectedFields.length;
    const coverage = totalCount > 0 ? mappedCount / totalCount : 0;

    if (coverage < 0.3) {
        warnings.push(`Chỉ ${Math.round(coverage * 100)}% trường được nhận diện. Cân nhắc sử dụng AI Enhancement hoặc điều chỉnh thủ công.`);
    }

    // Check for low confidence mappings
    const lowConfidence = templateData.detectedFields.filter(
        f => f.mapping && f.confidence < 0.7
    );
    if (lowConfidence.length > 0) {
        warnings.push(`${lowConfidence.length} trường có độ tin cậy thấp (<70%). Nên xác nhận lại mapping.`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats: {
            totalFields: totalCount,
            mappedFields: mappedCount,
            coverage: Math.round(coverage * 100),
            avgConfidence: templateData.detectedFields
                .filter(f => f.mapping)
                .reduce((sum, f) => sum + f.confidence, 0) / (mappedCount || 1)
        }
    };
}

/**
 * Get summary of template analysis for display
 */
function getTemplateSummary(templateData) {
    return {
        filename: templateData.filename,
        sheetCount: templateData.sheets.length,
        fieldCount: templateData.detectedFields.length,
        mappedFieldCount: templateData.detectedFields.filter(f => f.mapping).length,
        reportType: templateData.reportType?.type || 'unknown',
        reportTypeConfidence: templateData.reportType?.confidence || 0,
        needsAIEnhancement: templateData.detectedFields.some(f => f.needsAIEnhancement),
        templateHash: templateData.templateHash
    };
}

module.exports = {
    parseExcelTemplate,
    parseSheet,
    analyzeFieldName,
    applyUserCorrections,
    getFieldsNeedingEnhancement,
    buildQueryStructure,
    validateTemplate,
    getTemplateSummary,
    generateTemplateHash
};
