/**
 * E-Invoice Provider Factory
 * SyntexLegger - E-Invoice Integration
 *
 * Factory pattern for creating invoice provider instances
 */

const MockProvider = require('./providers/MockProvider');
const VNPTProvider = require('./providers/VNPTProvider');
const ViettelProvider = require('./providers/ViettelProvider');
const BKAVProvider = require('./providers/BKAVProvider');
const MISAProvider = require('./providers/MISAProvider');
const GDTProvider = require('./providers/GDTProvider');

// Provider registry
const PROVIDERS = {
    mock: {
        class: MockProvider,
        name: 'Demo Provider',
        description: 'Nhà cung cấp demo với dữ liệu mẫu'
    },
    gdt: {
        class: GDTProvider,
        name: 'Tổng cục Thuế (XML)',
        description: 'Import XML từ hoadondientu.gdt.gov.vn'
    },
    vnpt: {
        class: VNPTProvider,
        name: 'VNPT Invoice',
        description: 'Hóa đơn điện tử VNPT (VNPT-INVOICE)'
    },
    viettel: {
        class: ViettelProvider,
        name: 'Viettel S-Invoice',
        description: 'Hóa đơn điện tử Viettel (S-Invoice)'
    },
    bkav: {
        class: BKAVProvider,
        name: 'BKAV eHoadon',
        description: 'Hóa đơn điện tử BKAV (eHoadon)'
    },
    misa: {
        class: MISAProvider,
        name: 'MISA meInvoice',
        description: 'Hóa đơn điện tử MISA (meInvoice)'
    }
};

class EInvoiceProviderFactory {
    /**
     * Get a provider instance by code
     * @param {string} providerCode - Provider code (vnpt, viettel, bkav, misa, mock)
     * @param {Object} config - Provider configuration
     * @returns {BaseInvoiceProvider} Provider instance
     */
    static getProvider(providerCode, config = {}) {
        const providerInfo = PROVIDERS[providerCode];

        if (!providerInfo) {
            throw new Error(`Unknown provider: ${providerCode}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
        }

        return new providerInfo.class(config);
    }

    /**
     * Get list of available providers
     * @returns {Array<{code: string, name: string, description: string}>}
     */
    static getAvailableProviders() {
        return Object.entries(PROVIDERS).map(([code, info]) => ({
            code,
            name: info.name,
            description: info.description
        }));
    }

    /**
     * Check if provider code is valid
     * @param {string} providerCode
     * @returns {boolean}
     */
    static isValidProvider(providerCode) {
        return providerCode in PROVIDERS;
    }

    /**
     * Get provider info without creating instance
     * @param {string} providerCode
     * @returns {Object|null}
     */
    static getProviderInfo(providerCode) {
        const info = PROVIDERS[providerCode];
        if (!info) return null;

        return {
            code: providerCode,
            name: info.name,
            description: info.description
        };
    }
}

module.exports = EInvoiceProviderFactory;
