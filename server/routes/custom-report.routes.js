/**
 * Custom Report Generator Routes
 * SyntexHCSN - API endpoints for custom report creation from Excel templates
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();

const templateParser = require('../services/template-parser.service');
const aiEnhancer = require('../services/ai-enhancer.service');
const reportGenerator = require('../services/report-generator.service');

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ];
        const allowedExts = ['.xlsx', '.xls'];

        const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'));
        }
    }
});

/**
 * POST /api/reports/custom/analyze-template
 * Upload and analyze an Excel template
 */
router.post('/analyze-template', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng upload file Excel' });
        }

        const { buffer, originalname, size } = req.file;

        // Parse the template
        const parsed = templateParser.parseExcelTemplate(buffer, originalname);

        // Validate the template
        const validation = templateParser.validateTemplate(parsed);

        // Get summary
        const summary = templateParser.getTemplateSummary(parsed);

        res.json({
            success: true,
            data: {
                ...summary,
                fileSize: size,
                validation,
                detectedFields: parsed.detectedFields.map(f => ({
                    originalText: f.originalText,
                    position: f.position,
                    mapping: f.mapping,
                    confidence: f.confidence,
                    needsAIEnhancement: f.needsAIEnhancement,
                    aggregation: f.aggregation,
                    datePeriod: f.datePeriod
                })),
                sheets: parsed.sheets.map(s => ({
                    name: s.name,
                    rowCount: s.rowCount,
                    colCount: s.colCount,
                    headerCount: s.headers.length
                })),
                reportType: parsed.reportType
            }
        });

    } catch (error) {
        console.error('Template analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/reports/custom/ai-enhance
 * Enhance field mappings using AI (optional)
 */
router.post('/ai-enhance', async (req, res) => {
    try {
        const { unmappedFields, templateHash } = req.body;

        if (!unmappedFields || unmappedFields.length === 0) {
            return res.status(400).json({ error: 'Không có trường cần enhance' });
        }

        // Check AI availability
        const availability = aiEnhancer.checkAvailability();
        if (!availability.available) {
            return res.status(503).json({
                error: 'AI Enhancement không khả dụng',
                reason: availability.reason,
                suggestion: 'Bạn có thể map thủ công các trường chưa nhận diện được'
            });
        }

        // Get schema metadata for context
        const db = req.app.get('knex');
        const schemaMetadata = await db('db_schema_metadata')
            .orderBy('priority', 'desc')
            .select();

        // Enhance with AI
        const result = await aiEnhancer.makeRateLimitedRequest(async () => {
            return aiEnhancer.enhanceFieldMappings(unmappedFields, schemaMetadata, { db });
        });

        res.json({
            success: result.success,
            data: {
                mappings: result.mappings,
                fromCache: result.fromCache,
                model: result.model,
                tokensUsed: result.tokensUsed
            },
            error: result.error
        });

    } catch (error) {
        console.error('AI Enhancement error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/reports/custom/ai-status
 * Check AI enhancement availability
 */
router.get('/ai-status', (req, res) => {
    const availability = aiEnhancer.checkAvailability();
    res.json(availability);
});

/**
 * POST /api/reports/custom/templates
 * Save a new template
 */
router.post('/templates', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const user = req.user || { username: 'system', company_id: '1' };

        const { name, description, parsedTemplate, fieldMappings, aggregationRules, filename, fileSize, isShared } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Tên template là bắt buộc' });
        }

        if (!fieldMappings || fieldMappings.length === 0) {
            return res.status(400).json({ error: 'Cần có ít nhất một field mapping' });
        }

        const template = await reportGenerator.saveTemplate(db, {
            name,
            description,
            parsedTemplate,
            fieldMappings,
            aggregationRules,
            filename,
            fileSize,
            isShared
        }, user);

        res.json({
            success: true,
            data: template
        });

    } catch (error) {
        console.error('Save template error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/reports/custom/templates
 * Get list of templates for current user
 */
router.get('/templates', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const user = req.user || { username: 'system', company_id: '1' };

        const templates = await reportGenerator.getTemplates(db, user);

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/reports/custom/templates/:id
 * Get a specific template
 */
router.get('/templates/:id', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const { id } = req.params;

        const template = await reportGenerator.getTemplateById(db, id);

        res.json({
            success: true,
            data: template
        });

    } catch (error) {
        console.error('Get template error:', error);
        res.status(404).json({ error: error.message });
    }
});

/**
 * DELETE /api/reports/custom/templates/:id
 * Delete a template
 */
router.delete('/templates/:id', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const user = req.user || { username: 'system', company_id: '1' };
        const { id } = req.params;

        await reportGenerator.deleteTemplate(db, id, user);

        res.json({
            success: true,
            message: 'Template đã được xóa'
        });

    } catch (error) {
        console.error('Delete template error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/reports/custom/generate/:id
 * Generate report from a saved template
 */
router.post('/generate/:id', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const user = req.user || { username: 'system', company_id: '1' };
        const { id } = req.params;
        const filters = req.body.filters || {};
        const outputFormat = req.body.outputFormat || 'json';

        // Get template
        const template = await reportGenerator.getTemplateById(db, id);

        // Generate report
        const result = await reportGenerator.generateReport(db, template, filters);

        // Record usage
        await reportGenerator.recordUsage(db, id);

        // Log generation
        await reportGenerator.logGeneration(db, id, template.name, { filters, outputFormat }, result, user);

        // Handle output format
        if (outputFormat === 'excel') {
            const excelBuffer = reportGenerator.exportToExcel(result.data, result.columns, {
                sheetName: template.name
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(template.name)}.xlsx"`);
            return res.send(excelBuffer);
        }

        res.json({
            success: true,
            data: {
                rows: result.data,
                columns: result.columns,
                rowCount: result.rowCount,
                generationTime: result.generationTime,
                template: {
                    id: template.id,
                    name: template.name
                }
            }
        });

    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/reports/custom/preview
 * Preview report without saving template
 */
router.post('/preview', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const { fieldMappings, filters } = req.body;

        if (!fieldMappings || fieldMappings.length === 0) {
            return res.status(400).json({ error: 'Cần có field mappings' });
        }

        // Create temporary template object
        const tempTemplate = {
            template_data: '{}',
            field_mappings: fieldMappings
        };

        // Generate report (limited rows for preview)
        const result = await reportGenerator.generateReport(db, tempTemplate, {
            ...filters,
            limit: 100 // Preview limited to 100 rows
        });

        res.json({
            success: true,
            data: {
                rows: result.data.slice(0, 100),
                columns: result.columns,
                rowCount: result.rowCount,
                generationTime: result.generationTime,
                isPreview: true,
                truncated: result.rowCount > 100
            }
        });

    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/reports/custom/schema-info
 * Get database schema metadata for field mapping UI
 */
router.get('/schema-info', async (req, res) => {
    try {
        const db = req.app.get('knex');

        const schemaInfo = await db('db_schema_metadata')
            .orderBy('priority', 'desc')
            .select();

        // Parse JSON fields
        const parsed = schemaInfo.map(s => ({
            ...s,
            common_aliases: JSON.parse(s.common_aliases || '[]'),
            key_columns: JSON.parse(s.key_columns || '[]'),
            sample_queries: JSON.parse(s.sample_queries || '[]')
        }));

        res.json({
            success: true,
            data: parsed
        });

    } catch (error) {
        console.error('Get schema info error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/reports/custom/generation-logs
 * Get report generation history
 */
router.get('/generation-logs', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const user = req.user || { username: 'system' };
        const limit = parseInt(req.query.limit, 10) || 50;

        const logs = await db('report_generation_logs')
            .where('generated_by', user.username)
            .orderBy('generated_at', 'desc')
            .limit(limit)
            .select();

        res.json({
            success: true,
            data: logs.map(log => ({
                ...log,
                parameters: JSON.parse(log.parameters || '{}')
            }))
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/reports/custom/update-mappings/:id
 * Update field mappings for a template
 */
router.post('/update-mappings/:id', async (req, res) => {
    try {
        const db = req.app.get('knex');
        const user = req.user || { username: 'system' };
        const { id } = req.params;
        const { fieldMappings } = req.body;

        // Verify ownership
        const template = await db('report_templates')
            .where('id', id)
            .first();

        if (!template) {
            return res.status(404).json({ error: 'Template không tồn tại' });
        }

        if (template.created_by !== user.username && template.is_shared !== 1) {
            return res.status(403).json({ error: 'Bạn không có quyền sửa template này' });
        }

        // Update mappings
        await db('report_templates')
            .where('id', id)
            .update({
                field_mappings: JSON.stringify(fieldMappings),
                updated_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: 'Đã cập nhật field mappings'
        });

    } catch (error) {
        console.error('Update mappings error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
