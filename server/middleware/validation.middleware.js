/**
 * Input Validation Middleware
 * SyntexHCSN - Ke toan HCSN theo TT 24/2024/TT-BTC
 */

/**
 * Sanitize string input to prevent XSS
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 10000); // Max length limit
};

/**
 * Validate and sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @param {number} depth - Current depth
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj, depth = 0) => {
    if (depth > 10) return obj; // Prevent deep recursion
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
    if (Array.isArray(obj)) {
        return obj.slice(0, 1000).map(item => sanitizeObject(item, depth + 1));
    }
    if (typeof obj === 'object') {
        const sanitized = {};
        const keys = Object.keys(obj).slice(0, 100); // Limit number of keys
        for (const key of keys) {
            const sanitizedKey = sanitizeString(key).slice(0, 100);
            sanitized[sanitizedKey] = sanitizeObject(obj[key], depth + 1);
        }
        return sanitized;
    }
    return obj;
};

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean}
 */
const isValidDate = (dateStr) => {
    if (typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
};

/**
 * Validate numeric string or number
 * @param {*} value - Value to validate
 * @returns {boolean}
 */
const isValidNumber = (value) => {
    if (typeof value === 'number') return !isNaN(value) && isFinite(value);
    if (typeof value === 'string') {
        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num);
    }
    return false;
};

/**
 * Validate account code format
 * @param {string} code - Account code
 * @returns {boolean}
 */
const isValidAccountCode = (code) => {
    if (typeof code !== 'string') return false;
    return /^[0-9A-Za-z]{1,20}$/.test(code);
};

/**
 * Validate partner/voucher code format
 * @param {string} code - Code to validate
 * @returns {boolean}
 */
const isValidCode = (code) => {
    if (typeof code !== 'string') return false;
    return /^[0-9A-Za-z_\-./]{1,50}$/.test(code);
};

/**
 * Middleware to sanitize request body
 */
const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};

/**
 * Middleware to sanitize query parameters
 */
const sanitizeQuery = (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    next();
};

/**
 * Middleware to sanitize URL parameters
 */
const sanitizeParams = (req, res, next) => {
    if (req.params && typeof req.params === 'object') {
        const sanitized = {};
        for (const key of Object.keys(req.params)) {
            sanitized[key] = sanitizeString(req.params[key]);
        }
        req.params = sanitized;
    }
    next();
};

/**
 * Combined sanitization middleware
 */
const sanitizeAll = (req, res, next) => {
    sanitizeBody(req, res, () => {
        sanitizeQuery(req, res, () => {
            sanitizeParams(req, res, next);
        });
    });
};

/**
 * Validate voucher request body
 */
const validateVoucher = (req, res, next) => {
    const { doc_no, doc_date, post_date, type, items } = req.body;

    const errors = [];

    if (doc_no && !isValidCode(doc_no)) {
        errors.push('Invalid document number format');
    }
    if (doc_date && !isValidDate(doc_date)) {
        errors.push('Invalid document date format (expected YYYY-MM-DD)');
    }
    if (post_date && !isValidDate(post_date)) {
        errors.push('Invalid post date format (expected YYYY-MM-DD)');
    }
    if (type && typeof type !== 'string') {
        errors.push('Invalid voucher type');
    }
    if (items) {
        if (!Array.isArray(items)) {
            errors.push('Items must be an array');
        } else if (items.length > 500) {
            errors.push('Too many items (max 500)');
        } else {
            items.forEach((item, idx) => {
                if (item.amount !== undefined && !isValidNumber(item.amount)) {
                    errors.push(`Item ${idx + 1}: Invalid amount`);
                }
                if (item.debit_acc && !isValidAccountCode(item.debit_acc)) {
                    errors.push(`Item ${idx + 1}: Invalid debit account code`);
                }
                if (item.credit_acc && !isValidAccountCode(item.credit_acc)) {
                    errors.push(`Item ${idx + 1}: Invalid credit account code`);
                }
            });
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
};

/**
 * Validate partner request body
 */
const validatePartner = (req, res, next) => {
    const { partner_code, partner_name, tax_code } = req.body;

    const errors = [];

    if (partner_code && !isValidCode(partner_code)) {
        errors.push('Invalid partner code format');
    }
    if (partner_name && (typeof partner_name !== 'string' || partner_name.length > 500)) {
        errors.push('Invalid partner name');
    }
    if (tax_code && !/^[0-9\-]{0,20}$/.test(tax_code)) {
        errors.push('Invalid tax code format');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
};

/**
 * Validate account request body
 */
const validateAccount = (req, res, next) => {
    const { account_code, account_name, accounts } = req.body;

    const errors = [];

    if (account_code && !isValidAccountCode(account_code)) {
        errors.push('Invalid account code format');
    }
    if (account_name && (typeof account_name !== 'string' || account_name.length > 500)) {
        errors.push('Invalid account name');
    }
    if (accounts && Array.isArray(accounts)) {
        if (accounts.length > 1000) {
            errors.push('Too many accounts (max 1000)');
        }
        accounts.forEach((acc, idx) => {
            if (!isValidAccountCode(acc.account_code)) {
                errors.push(`Account ${idx + 1}: Invalid account code`);
            }
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
};

/**
 * Validate login request body
 */
const validateLogin = (req, res, next) => {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.length < 1 || username.length > 100) {
        return res.status(400).json({ error: 'Invalid username' });
    }
    if (!password || typeof password !== 'string' || password.length < 1 || password.length > 200) {
        return res.status(400).json({ error: 'Invalid password' });
    }

    // Sanitize username (alphanumeric, underscore, dash only)
    if (!/^[a-zA-Z0-9_\-@.]+$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
    const { page, limit, offset } = req.query;

    if (page !== undefined) {
        const pageNum = parseInt(page, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > 10000) {
            return res.status(400).json({ error: 'Invalid page parameter' });
        }
        req.query.page = pageNum;
    }

    if (limit !== undefined) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            return res.status(400).json({ error: 'Invalid limit parameter (max 1000)' });
        }
        req.query.limit = limitNum;
    }

    if (offset !== undefined) {
        const offsetNum = parseInt(offset, 10);
        if (isNaN(offsetNum) || offsetNum < 0) {
            return res.status(400).json({ error: 'Invalid offset parameter' });
        }
        req.query.offset = offsetNum;
    }

    next();
};

/**
 * Validate date range query parameters
 */
const validateDateRange = (req, res, next) => {
    const { fromDate, toDate, startDate, endDate, from_date, to_date } = req.query;

    const dates = [
        { name: 'fromDate', value: fromDate },
        { name: 'toDate', value: toDate },
        { name: 'startDate', value: startDate },
        { name: 'endDate', value: endDate },
        { name: 'from_date', value: from_date },
        { name: 'to_date', value: to_date }
    ];

    for (const date of dates) {
        if (date.value && !isValidDate(date.value)) {
            return res.status(400).json({ error: `Invalid ${date.name} format (expected YYYY-MM-DD)` });
        }
    }

    next();
};

module.exports = {
    sanitizeString,
    sanitizeObject,
    sanitizeBody,
    sanitizeQuery,
    sanitizeParams,
    sanitizeAll,
    isValidDate,
    isValidNumber,
    isValidAccountCode,
    isValidCode,
    validateVoucher,
    validatePartner,
    validateAccount,
    validateLogin,
    validatePagination,
    validateDateRange
};
