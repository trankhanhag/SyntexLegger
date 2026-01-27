/**
 * Audit Trail Middleware
 * SyntexHCSN - Automatic audit logging for all API operations
 *
 * Provides automatic audit trail logging for:
 * - Voucher operations (create, update, delete, post)
 * - Budget operations (allocate, spend, transfer)
 * - Master data changes (accounts, partners)
 * - System configuration changes
 */

const auditService = require('../services/audit.service');

/**
 * Map HTTP methods to action types
 */
const METHOD_ACTION_MAP = {
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE'
};

/**
 * Entity type mapping based on route patterns
 */
const ROUTE_ENTITY_MAP = {
    '/api/vouchers': 'VOUCHER',
    '/api/staging': 'STAGING',
    '/api/accounts': 'ACCOUNT',
    '/api/partners': 'PARTNER',
    '/api/budget-estimates': 'BUDGET_ESTIMATE',
    '/api/budget-allocations': 'BUDGET_ALLOCATION',
    '/api/fund-sources': 'FUND_SOURCE',
    '/api/assets': 'ASSET',
    '/api/employees': 'EMPLOYEE',
    '/api/payroll': 'PAYROLL',
    '/api/contracts': 'CONTRACT',
    '/api/projects': 'PROJECT',
    '/api/opening-balance': 'OPENING_BALANCE',
    '/api/settings': 'SYSTEM_SETTING',
    '/api/system': 'SYSTEM'
};

/**
 * Routes that should be excluded from automatic audit logging
 */
const EXCLUDED_ROUTES = [
    '/api/login',
    '/api/logout',
    '/api/audit/',
    '/api/dashboard',
    '/api/reports'
];

/**
 * Determine entity type from request path
 * @param {string} path - Request path
 * @returns {string|null} Entity type
 */
const getEntityType = (path) => {
    for (const [route, entityType] of Object.entries(ROUTE_ENTITY_MAP)) {
        if (path.startsWith(route)) {
            return entityType;
        }
    }
    return null;
};

/**
 * Extract entity ID from request
 * @param {Object} req - Express request
 * @returns {string|null} Entity ID
 */
const getEntityId = (req) => {
    // From URL params
    if (req.params.id) return req.params.id;

    // From request body
    if (req.body && req.body.id) return req.body.id;

    // From response (set by handler)
    if (req.auditEntityId) return req.auditEntityId;

    return null;
};

/**
 * Check if route should be audited
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {boolean}
 */
const shouldAudit = (path, method) => {
    // Skip GET requests (read operations)
    if (method === 'GET') return false;

    // Skip excluded routes
    for (const excluded of EXCLUDED_ROUTES) {
        if (path.startsWith(excluded)) return false;
    }

    // Check if route is mapped
    return getEntityType(path) !== null;
};

/**
 * Create audit middleware for automatic logging
 * @returns {Function} Express middleware
 */
const createAuditMiddleware = () => {
    return async (req, res, next) => {
        // Check if this request should be audited
        if (!shouldAudit(req.path, req.method)) {
            return next();
        }

        // Store original send method
        const originalSend = res.send;
        const originalJson = res.json;

        // Capture request body before it's modified
        const requestBody = JSON.parse(JSON.stringify(req.body || {}));

        // Store start time for timing
        const startTime = Date.now();

        // Override response methods to capture response
        res.json = function (data) {
            res.auditResponseData = data;
            return originalJson.call(this, data);
        };

        res.send = function (data) {
            if (typeof data === 'object') {
                res.auditResponseData = data;
            }
            return originalSend.call(this, data);
        };

        // Continue with request
        res.on('finish', async () => {
            try {
                // Only log successful write operations
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const entityType = getEntityType(req.path);
                    const action = METHOD_ACTION_MAP[req.method] || req.method;
                    const entityId = getEntityId(req) ||
                        res.auditResponseData?.id ||
                        res.auditResponseData?.data?.id ||
                        `${entityType}_${Date.now()}`;

                    // Get doc_no if available
                    const docNo = requestBody.doc_no ||
                        res.auditResponseData?.doc_no ||
                        null;

                    // Calculate amount if available
                    const amount = requestBody.total_amount ||
                        requestBody.amount ||
                        requestBody.allocated_amount ||
                        null;

                    // Log to audit trail
                    await auditService.logAudit({
                        entity_type: entityType,
                        entity_id: entityId,
                        doc_no: docNo,
                        action,
                        action_category: 'DATA_ENTRY',
                        old_values: req.auditOldValues || null,
                        new_values: sanitizeForAudit(requestBody),
                        user_id: req.user?.id,
                        username: req.user?.username || 'anonymous',
                        user_role: req.user?.role,
                        ip_address: req.ip || req.connection?.remoteAddress,
                        user_agent: req.headers['user-agent'],
                        session_id: req.headers['x-session-id'],
                        amount,
                        account_code: requestBody.items?.[0]?.debit_acc || requestBody.account_code,
                        fund_source_id: requestBody.fund_source_id || requestBody.items?.[0]?.fund_source_id,
                        budget_estimate_id: requestBody.budget_estimate_id || requestBody.items?.[0]?.budget_estimate_id,
                        department_code: requestBody.department_code,
                        project_code: requestBody.project_code || requestBody.items?.[0]?.project_code,
                        source: 'API',
                        reason: requestBody.reason || requestBody.description
                    });
                }
            } catch (auditError) {
                console.error('Audit logging error:', auditError);
                // Don't fail the request if audit logging fails
            }
        });

        next();
    };
};

/**
 * Sanitize request body for audit logging (remove sensitive data)
 * @param {Object} data - Request body
 * @returns {Object} Sanitized data
 */
const sanitizeForAudit = (data) => {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'apiKey', 'authorization'];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
};

/**
 * Middleware to capture old values before update/delete
 * Must be used after the entity is fetched from database
 * @param {Object} oldEntity - The entity before modification
 */
const captureOldValues = (req, oldEntity) => {
    req.auditOldValues = oldEntity;
};

/**
 * Middleware to set entity ID for audit
 * @param {string} entityId - The entity ID
 */
const setAuditEntityId = (req, entityId) => {
    req.auditEntityId = entityId;
};

/**
 * Log a custom audit entry from within a route handler
 * @param {Object} req - Express request
 * @param {Object} auditData - Audit data
 */
const logCustomAudit = async (req, auditData) => {
    try {
        await auditService.logAudit({
            ...auditData,
            user_id: req.user?.id,
            username: req.user?.username || 'anonymous',
            user_role: req.user?.role,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent'],
            session_id: req.headers['x-session-id'],
            source: 'API'
        });
    } catch (error) {
        console.error('Custom audit logging error:', error);
    }
};

/**
 * Middleware for voucher-specific audit logging
 * This provides more detailed logging for voucher operations
 */
const voucherAuditMiddleware = (db) => {
    return async (req, res, next) => {
        if (!req.path.startsWith('/api/vouchers')) {
            return next();
        }

        // For update/delete, fetch old values first
        if ((req.method === 'PUT' || req.method === 'DELETE' || req.method === 'POST') && req.params.id) {
            const voucherId = req.params.id || req.body.id;
            if (voucherId) {
                try {
                    const voucher = await new Promise((resolve, reject) => {
                        db.get("SELECT * FROM vouchers WHERE id = ?", [voucherId], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    if (voucher) {
                        const items = await new Promise((resolve, reject) => {
                            db.all("SELECT * FROM voucher_items WHERE voucher_id = ?", [voucherId], (err, rows) => {
                                if (err) reject(err);
                                else resolve(rows);
                            });
                        });

                        req.auditOldValues = { voucher, items };
                    }
                } catch (error) {
                    console.error('Error fetching old voucher for audit:', error);
                }
            }
        }

        next();
    };
};

/**
 * Middleware for budget-specific audit logging
 */
const budgetAuditMiddleware = (db) => {
    return async (req, res, next) => {
        const budgetRoutes = ['/api/budget-estimates', '/api/budget-allocations', '/api/fund-sources'];
        const matchingRoute = budgetRoutes.find(route => req.path.startsWith(route));

        if (!matchingRoute) {
            return next();
        }

        // For update/delete, fetch old values first
        if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
            try {
                let tableName = 'budget_estimates';
                if (matchingRoute.includes('allocations')) tableName = 'budget_allocations';
                if (matchingRoute.includes('fund-sources')) tableName = 'fund_sources';

                const oldEntity = await new Promise((resolve, reject) => {
                    db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (oldEntity) {
                    req.auditOldValues = oldEntity;
                }
            } catch (error) {
                console.error('Error fetching old budget entity for audit:', error);
            }
        }

        next();
    };
};

/**
 * Session audit middleware - track login/logout
 */
const sessionAuditMiddleware = () => {
    return async (req, res, next) => {
        if (req.path === '/api/login' && req.method === 'POST') {
            // Store original json method
            const originalJson = res.json;

            res.json = function (data) {
                if (res.statusCode === 200 && data.token) {
                    // Successful login - create audit session
                    auditService.createAuditSession({
                        user_id: data.user?.id,
                        username: data.user?.username || req.body.username,
                        ip_address: req.ip,
                        user_agent: req.headers['user-agent']
                    }).catch(err => console.error('Session audit error:', err));

                    // Log login action
                    auditService.logAudit({
                        entity_type: 'USER_SESSION',
                        entity_id: data.user?.id?.toString() || 'unknown',
                        action: 'LOGIN',
                        action_category: 'SYSTEM',
                        username: data.user?.username || req.body.username,
                        user_id: data.user?.id,
                        ip_address: req.ip,
                        user_agent: req.headers['user-agent']
                    }).catch(err => console.error('Login audit error:', err));
                }

                return originalJson.call(this, data);
            };
        }

        if (req.path === '/api/logout' && req.method === 'POST') {
            // Log logout action
            if (req.user) {
                auditService.logAudit({
                    entity_type: 'USER_SESSION',
                    entity_id: req.user.id?.toString() || 'unknown',
                    action: 'LOGOUT',
                    action_category: 'SYSTEM',
                    username: req.user.username,
                    user_id: req.user.id,
                    ip_address: req.ip
                }).catch(err => console.error('Logout audit error:', err));
            }
        }

        next();
    };
};

module.exports = {
    createAuditMiddleware,
    voucherAuditMiddleware,
    budgetAuditMiddleware,
    sessionAuditMiddleware,
    captureOldValues,
    setAuditEntityId,
    logCustomAudit,
    sanitizeForAudit,
    getEntityType,
    shouldAudit
};
