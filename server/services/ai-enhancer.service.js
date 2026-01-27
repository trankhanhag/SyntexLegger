/**
 * AI Enhancer Service
 * SyntexHCSN - Uses Claude API for advanced field mapping when local parser fails
 *
 * This is an OPTIONAL enhancement layer. The system works without it.
 * When enabled, it improves mapping accuracy for complex/ambiguous fields.
 */

const crypto = require('crypto');

// Lazy-load Anthropic SDK to avoid errors if not installed
let Anthropic = null;
try {
    Anthropic = require('@anthropic-ai/sdk');
} catch {
    // SDK not installed - AI features will be disabled
}

/**
 * Check if AI enhancement is available
 * @returns {Object} Availability status and reason
 */
function checkAvailability() {
    if (!Anthropic) {
        return {
            available: false,
            reason: 'SDK chưa được cài đặt. Chạy: npm install @anthropic-ai/sdk'
        };
    }

    if (!process.env.CLAUDE_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        return {
            available: false,
            reason: 'API key chưa được cấu hình. Thêm CLAUDE_API_KEY vào file .env'
        };
    }

    return { available: true, reason: null };
}

/**
 * Create Anthropic client instance
 */
function createClient() {
    const availability = checkAvailability();
    if (!availability.available) {
        throw new Error(availability.reason);
    }

    return new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
    });
}

/**
 * Enhance field mappings using Claude API
 * @param {Array} unmappedFields - Fields that couldn't be mapped locally
 * @param {Object} schemaMetadata - Database schema context
 * @param {Object} options - Options including cache DB connection
 * @returns {Object} Enhanced mappings
 */
async function enhanceFieldMappings(unmappedFields, schemaMetadata, options = {}) {
    const availability = checkAvailability();
    if (!availability.available) {
        return {
            success: false,
            error: availability.reason,
            mappings: [],
            fromCache: false
        };
    }

    // Generate cache key
    const cacheKey = generateCacheKey(unmappedFields);

    // Check cache first
    if (options.db) {
        const cached = await checkCache(options.db, cacheKey);
        if (cached) {
            return {
                success: true,
                mappings: cached.mappings,
                fromCache: true,
                confidence: cached.confidence
            };
        }
    }

    try {
        const client = createClient();

        // Build prompt with Vietnamese accounting context
        const prompt = buildMappingPrompt(unmappedFields, schemaMetadata);

        const response = await client.messages.create({
            model: 'claude-3-haiku-20240307', // Use Haiku for cost efficiency
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            system: `Bạn là chuyên gia kế toán hành chính sự nghiệp Việt Nam với kiến thức sâu về:
- Thông tư 24/2024/TT-BTC về kế toán đơn vị HCSN
- Hệ thống tài khoản kế toán Việt Nam
- Mục lục ngân sách nhà nước
- Các mẫu báo cáo tài chính: Sổ cái, Bảng cân đối, Nhật ký chung...

Nhiệm vụ: Map các trường dữ liệu từ mẫu Excel sang cấu trúc database.
Trả về JSON hợp lệ, không giải thích thêm.`
        });

        // Parse response
        const content = response.content[0]?.text || '';
        const mappings = parseAIResponse(content);

        // Cache the result
        if (options.db && mappings.length > 0) {
            await saveToCache(options.db, cacheKey, mappings, response.model);
        }

        return {
            success: true,
            mappings,
            fromCache: false,
            model: response.model,
            tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens
        };

    } catch (error) {
        console.error('AI Enhancement error:', error.message);

        return {
            success: false,
            error: error.message,
            mappings: [],
            fromCache: false
        };
    }
}

/**
 * Build the prompt for field mapping
 */
function buildMappingPrompt(unmappedFields, schemaMetadata) {
    const fieldList = unmappedFields.map(f => `- "${f.originalText}"`).join('\n');

    const schemaContext = schemaMetadata.map(table => {
        const columns = JSON.parse(table.key_columns || '[]');
        const colList = columns.map(c => `  - ${c.column} (${c.display})`).join('\n');
        return `${table.table_name} - ${table.display_name_vi}:\n${colList}`;
    }).join('\n\n');

    return `Map các trường Excel sau với database schema:

## Trường cần map:
${fieldList}

## Database Schema:
${schemaContext}

## Yêu cầu:
1. Tìm mapping phù hợp nhất cho mỗi trường
2. Trường computed (tính toán) đánh dấu type: "computed"
3. Trả về confidence từ 0.0 đến 1.0

## Output JSON:
{
  "mappings": [
    {
      "field": "tên trường gốc",
      "table": "tên_bảng hoặc null",
      "column": "tên_cột hoặc null",
      "type": "text|number|date|computed",
      "confidence": 0.85,
      "reasoning": "lý do ngắn gọn"
    }
  ]
}`;
}

/**
 * Parse AI response to extract mappings
 */
function parseAIResponse(content) {
    try {
        // Try to find JSON in response
        const jsonMatch = content.match(/\{[\s\S]*"mappings"[\s\S]*\}/);
        if (!jsonMatch) {
            return [];
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.mappings || [];

    } catch (error) {
        console.error('Failed to parse AI response:', error.message);
        return [];
    }
}

/**
 * Generate cache key from fields
 */
function generateCacheKey(fields) {
    const signature = fields
        .map(f => f.normalizedText || f.originalText)
        .sort()
        .join('|');

    return crypto
        .createHash('sha256')
        .update(signature)
        .digest('hex');
}

/**
 * Check cache for existing mapping
 */
async function checkCache(db, cacheKey) {
    try {
        const cached = await db('ai_mapping_cache')
            .where('template_hash', cacheKey)
            .first();

        if (cached) {
            // Update hit count
            await db('ai_mapping_cache')
                .where('id', cached.id)
                .update({
                    hit_count: cached.hit_count + 1,
                    last_hit_at: new Date().toISOString()
                });

            return {
                mappings: JSON.parse(cached.ai_response),
                confidence: cached.confidence_score
            };
        }

        return null;
    } catch (error) {
        console.error('Cache check error:', error.message);
        return null;
    }
}

/**
 * Save mapping result to cache
 */
async function saveToCache(db, cacheKey, mappings, modelVersion) {
    try {
        const avgConfidence = mappings.reduce((sum, m) => sum + (m.confidence || 0), 0) / (mappings.length || 1);

        await db('ai_mapping_cache').insert({
            template_hash: cacheKey,
            ai_response: JSON.stringify(mappings),
            confidence_score: avgConfidence,
            model_version: modelVersion,
            hit_count: 0,
            created_at: new Date().toISOString()
        }).onConflict('template_hash').merge();

    } catch (error) {
        console.error('Cache save error:', error.message);
    }
}

/**
 * Get AI enhancement suggestions for report structure
 * @param {Object} templateData - Parsed template data
 * @param {Object} schemaMetadata - Database schema context
 * @returns {Object} Structural suggestions
 */
async function suggestReportStructure(templateData, schemaMetadata) {
    const availability = checkAvailability();
    if (!availability.available) {
        return { success: false, error: availability.reason };
    }

    try {
        const client = createClient();

        const fieldSummary = templateData.detectedFields
            .map(f => `${f.originalText} → ${f.mapping?.table || '?'}.${f.mapping?.column || '?'}`)
            .join('\n');

        const response = await client.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1500,
            messages: [{
                role: 'user',
                content: `Phân tích cấu trúc báo cáo kế toán này và đề xuất:

## Các trường đã nhận diện:
${fieldSummary}

## Loại báo cáo dự đoán: ${templateData.reportType?.type || 'chưa xác định'}

## Yêu cầu đề xuất:
1. Xác nhận loại báo cáo
2. Đề xuất GROUP BY clause
3. Đề xuất ORDER BY clause
4. Các computed fields cần tính (số dư đầu kỳ, cuối kỳ...)
5. Filters cần thiết (ngày, tài khoản...)

Output JSON:
{
  "reportType": "so_cai|bang_can_doi|...",
  "groupBy": ["column1", "column2"],
  "orderBy": ["column1 ASC", "column2 DESC"],
  "computedFields": [{"name": "...", "formula": "..."}],
  "requiredFilters": [{"name": "...", "type": "date|text|..."}]
}`
            }],
            system: 'Bạn là chuyên gia báo cáo kế toán HCSN Việt Nam. Trả về JSON hợp lệ.'
        });

        const content = response.content[0]?.text || '';
        const suggestion = parseAIResponse(content);

        return {
            success: true,
            suggestion,
            model: response.model
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Rate limiting helper
 */
const rateLimiter = {
    requests: [],
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes

    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.windowMs);
        return this.requests.length < this.maxRequests;
    },

    recordRequest() {
        this.requests.push(Date.now());
    },

    getTimeUntilReset() {
        if (this.requests.length === 0) return 0;
        const oldest = Math.min(...this.requests);
        return Math.max(0, this.windowMs - (Date.now() - oldest));
    }
};

/**
 * Make AI request with rate limiting
 */
async function makeRateLimitedRequest(requestFn) {
    if (!rateLimiter.canMakeRequest()) {
        const waitTime = Math.ceil(rateLimiter.getTimeUntilReset() / 1000 / 60);
        throw new Error(`Đã đạt giới hạn request. Vui lòng đợi ${waitTime} phút.`);
    }

    rateLimiter.recordRequest();
    return requestFn();
}

module.exports = {
    checkAvailability,
    enhanceFieldMappings,
    suggestReportStructure,
    makeRateLimitedRequest,
    // For testing
    generateCacheKey,
    parseAIResponse
};
