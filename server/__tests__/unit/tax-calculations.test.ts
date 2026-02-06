/**
 * Tax Calculation Unit Tests
 * Tests for VAT and income tax calculations
 *
 * Vietnamese Tax Standards:
 * - Standard VAT rate: 10%
 * - Reduced VAT rate: 5% (essentials), 8% (2024 reduction)
 * - Export rate: 0%
 * - CIT rate: 20%
 */

interface TaxableAmount {
  grossAmount: number;
  taxRate: number;
  isInclusive: boolean; // true if gross includes tax
}

interface VATResult {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  taxRate: number;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent?: number;
}

/**
 * Calculate VAT from gross or net amount
 */
function calculateVAT(input: TaxableAmount): VATResult {
  const { grossAmount, taxRate, isInclusive } = input;

  if (isInclusive) {
    // Gross already includes VAT, need to extract
    const netAmount = grossAmount / (1 + taxRate / 100);
    const taxAmount = grossAmount - netAmount;
    return {
      netAmount: Math.round(netAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grossAmount,
      taxRate,
    };
  } else {
    // Gross is net amount, add VAT
    const taxAmount = grossAmount * (taxRate / 100);
    const totalGross = grossAmount + taxAmount;
    return {
      netAmount: grossAmount,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grossAmount: Math.round(totalGross * 100) / 100,
      taxRate,
    };
  }
}

/**
 * Calculate invoice totals with multiple items and tax rates
 */
function calculateInvoiceTotals(items: InvoiceItem[]): {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  taxBreakdown: { rate: number; amount: number }[];
} {
  let subtotal = 0;
  let totalDiscount = 0;
  const taxByRate: Record<number, number> = {};

  items.forEach((item) => {
    const lineTotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountPercent ? lineTotal * (item.discountPercent / 100) : 0;
    const netAmount = lineTotal - discountAmount;
    const taxAmount = netAmount * (item.taxRate / 100);

    subtotal += lineTotal;
    totalDiscount += discountAmount;

    if (!taxByRate[item.taxRate]) {
      taxByRate[item.taxRate] = 0;
    }
    taxByRate[item.taxRate] += taxAmount;
  });

  const totalTax = Object.values(taxByRate).reduce((sum, tax) => sum + tax, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  const taxBreakdown = Object.entries(taxByRate).map(([rate, amount]) => ({
    rate: parseFloat(rate),
    amount: Math.round(amount * 100) / 100,
  }));

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    taxBreakdown,
  };
}

/**
 * Round VAT amount according to Vietnamese rules
 * Amounts are rounded to VND (no decimals for final tax)
 */
function roundVATForDeclaration(amount: number): number {
  return Math.round(amount);
}

/**
 * Calculate CIT (Corporate Income Tax)
 * Standard rate: 20%
 */
function calculateCIT(taxableIncome: number, rate = 20): number {
  if (taxableIncome <= 0) return 0;
  return Math.round(taxableIncome * (rate / 100));
}

describe('VAT Calculations', () => {
  describe('calculateVAT - Standard Rate (10%)', () => {
    it('should calculate VAT from net amount', () => {
      const result = calculateVAT({
        grossAmount: 10000000, // 10 million VND
        taxRate: 10,
        isInclusive: false,
      });

      expect(result.netAmount).toBe(10000000);
      expect(result.taxAmount).toBe(1000000);
      expect(result.grossAmount).toBe(11000000);
    });

    it('should extract VAT from gross amount (inclusive)', () => {
      const result = calculateVAT({
        grossAmount: 11000000, // Gross includes 10% VAT
        taxRate: 10,
        isInclusive: true,
      });

      expect(result.netAmount).toBe(10000000);
      expect(result.taxAmount).toBe(1000000);
      expect(result.grossAmount).toBe(11000000);
    });

    it('should handle decimal amounts', () => {
      const result = calculateVAT({
        grossAmount: 1234567.89,
        taxRate: 10,
        isInclusive: false,
      });

      expect(result.taxAmount).toBe(123456.79);
      expect(result.grossAmount).toBe(1358024.68);
    });
  });

  describe('calculateVAT - Reduced Rate (8%)', () => {
    it('should calculate VAT at 8% rate', () => {
      const result = calculateVAT({
        grossAmount: 10000000,
        taxRate: 8,
        isInclusive: false,
      });

      expect(result.taxAmount).toBe(800000);
      expect(result.grossAmount).toBe(10800000);
    });

    it('should extract VAT at 8% from gross', () => {
      const result = calculateVAT({
        grossAmount: 10800000,
        taxRate: 8,
        isInclusive: true,
      });

      expect(result.netAmount).toBe(10000000);
      expect(result.taxAmount).toBe(800000);
    });
  });

  describe('calculateVAT - Essential Goods (5%)', () => {
    it('should calculate VAT at 5% rate', () => {
      const result = calculateVAT({
        grossAmount: 10000000,
        taxRate: 5,
        isInclusive: false,
      });

      expect(result.taxAmount).toBe(500000);
      expect(result.grossAmount).toBe(10500000);
    });
  });

  describe('calculateVAT - Export (0%)', () => {
    it('should calculate zero VAT for exports', () => {
      const result = calculateVAT({
        grossAmount: 10000000,
        taxRate: 0,
        isInclusive: false,
      });

      expect(result.taxAmount).toBe(0);
      expect(result.grossAmount).toBe(10000000);
    });
  });

  describe('calculateVAT - Edge Cases', () => {
    it('should handle zero amount', () => {
      const result = calculateVAT({
        grossAmount: 0,
        taxRate: 10,
        isInclusive: false,
      });

      expect(result.taxAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });

    it('should handle very large amounts', () => {
      const result = calculateVAT({
        grossAmount: 999999999999,
        taxRate: 10,
        isInclusive: false,
      });

      expect(result.taxAmount).toBe(99999999999.9);
      expect(result.grossAmount).toBe(1099999999998.9);
    });
  });
});

describe('Invoice Calculations', () => {
  describe('calculateInvoiceTotals', () => {
    it('should calculate totals for single item', () => {
      const items: InvoiceItem[] = [
        { description: 'Product A', quantity: 10, unitPrice: 100000, taxRate: 10 },
      ];

      const result = calculateInvoiceTotals(items);

      expect(result.subtotal).toBe(1000000);
      expect(result.totalDiscount).toBe(0);
      expect(result.totalTax).toBe(100000);
      expect(result.grandTotal).toBe(1100000);
    });

    it('should calculate totals for multiple items', () => {
      const items: InvoiceItem[] = [
        { description: 'Product A', quantity: 10, unitPrice: 100000, taxRate: 10 },
        { description: 'Product B', quantity: 5, unitPrice: 200000, taxRate: 10 },
      ];

      const result = calculateInvoiceTotals(items);

      expect(result.subtotal).toBe(2000000); // 1,000,000 + 1,000,000
      expect(result.totalTax).toBe(200000);
      expect(result.grandTotal).toBe(2200000);
    });

    it('should handle discount correctly', () => {
      const items: InvoiceItem[] = [
        { description: 'Product A', quantity: 10, unitPrice: 100000, taxRate: 10, discountPercent: 10 },
      ];

      const result = calculateInvoiceTotals(items);

      expect(result.subtotal).toBe(1000000);
      expect(result.totalDiscount).toBe(100000); // 10% of 1,000,000
      expect(result.totalTax).toBe(90000); // 10% of 900,000
      expect(result.grandTotal).toBe(990000); // 1,000,000 - 100,000 + 90,000
    });

    it('should handle mixed tax rates', () => {
      const items: InvoiceItem[] = [
        { description: 'Standard item', quantity: 1, unitPrice: 1000000, taxRate: 10 },
        { description: 'Reduced item', quantity: 1, unitPrice: 1000000, taxRate: 8 },
        { description: 'Essential item', quantity: 1, unitPrice: 1000000, taxRate: 5 },
        { description: 'Export item', quantity: 1, unitPrice: 1000000, taxRate: 0 },
      ];

      const result = calculateInvoiceTotals(items);

      expect(result.subtotal).toBe(4000000);
      expect(result.totalTax).toBe(230000); // 100k + 80k + 50k + 0
      expect(result.taxBreakdown).toHaveLength(4);
    });

    it('should provide tax breakdown by rate', () => {
      const items: InvoiceItem[] = [
        { description: 'Item 1', quantity: 1, unitPrice: 1000000, taxRate: 10 },
        { description: 'Item 2', quantity: 1, unitPrice: 2000000, taxRate: 10 },
        { description: 'Item 3', quantity: 1, unitPrice: 1000000, taxRate: 5 },
      ];

      const result = calculateInvoiceTotals(items);

      const rate10 = result.taxBreakdown.find(t => t.rate === 10);
      const rate5 = result.taxBreakdown.find(t => t.rate === 5);

      expect(rate10?.amount).toBe(300000);
      expect(rate5?.amount).toBe(50000);
    });

    it('should handle empty items', () => {
      const result = calculateInvoiceTotals([]);

      expect(result.subtotal).toBe(0);
      expect(result.grandTotal).toBe(0);
      expect(result.taxBreakdown).toHaveLength(0);
    });
  });
});

describe('Tax Rounding', () => {
  describe('roundVATForDeclaration', () => {
    it('should round to nearest VND', () => {
      expect(roundVATForDeclaration(123456.4)).toBe(123456);
      expect(roundVATForDeclaration(123456.5)).toBe(123457);
      expect(roundVATForDeclaration(123456.9)).toBe(123457);
    });

    it('should handle whole numbers', () => {
      expect(roundVATForDeclaration(1000000)).toBe(1000000);
    });
  });
});

describe('CIT (Corporate Income Tax)', () => {
  describe('calculateCIT', () => {
    it('should calculate CIT at standard 20% rate', () => {
      // 100 million VND taxable income
      const cit = calculateCIT(100000000);
      expect(cit).toBe(20000000);
    });

    it('should handle custom rate', () => {
      // Some industries have different rates
      const cit = calculateCIT(100000000, 15);
      expect(cit).toBe(15000000);
    });

    it('should return 0 for negative income', () => {
      const cit = calculateCIT(-50000000);
      expect(cit).toBe(0);
    });

    it('should return 0 for zero income', () => {
      const cit = calculateCIT(0);
      expect(cit).toBe(0);
    });

    it('should round to VND', () => {
      const cit = calculateCIT(12345678);
      expect(cit).toBe(2469136); // 12,345,678 * 20% = 2,469,135.6 -> 2,469,136
    });
  });
});

describe('Real-world Scenarios', () => {
  it('should handle typical sales invoice', () => {
    const items: InvoiceItem[] = [
      { description: 'Laptop Dell', quantity: 2, unitPrice: 15000000, taxRate: 10 },
      { description: 'Mouse', quantity: 2, unitPrice: 500000, taxRate: 8 },
      { description: 'Keyboard', quantity: 2, unitPrice: 1000000, taxRate: 8, discountPercent: 5 },
    ];

    const result = calculateInvoiceTotals(items);

    // Laptop: 30,000,000 + 3,000,000 VAT
    // Mouse: 1,000,000 + 80,000 VAT
    // Keyboard: 2,000,000 - 100,000 discount = 1,900,000 + 152,000 VAT

    expect(result.subtotal).toBe(33000000);
    expect(result.totalDiscount).toBe(100000);
    expect(result.grandTotal).toBeCloseTo(36132000, 0);
  });

  it('should handle purchase invoice with deductible VAT', () => {
    const items: InvoiceItem[] = [
      { description: 'Raw materials', quantity: 100, unitPrice: 50000, taxRate: 10 },
      { description: 'Packaging', quantity: 1000, unitPrice: 5000, taxRate: 8 },
    ];

    const result = calculateInvoiceTotals(items);

    // Raw materials: 5,000,000 + 500,000 VAT (deductible)
    // Packaging: 5,000,000 + 400,000 VAT (deductible)

    expect(result.totalTax).toBe(900000); // Total deductible VAT
  });
});
