/**
 * Depreciation Calculation Unit Tests
 * Tests for fixed asset depreciation logic
 *
 * Vietnamese Accounting Standards (Circular 45/2013/TT-BTC):
 * - Straight-line depreciation: Monthly = Cost / (Life Years * 12)
 * - Depreciation starts from month following acquisition
 * - Residual value handling
 */

interface FixedAsset {
  id: string;
  asset_code: string;
  original_cost: number;
  residual_value: number;
  life_years: number;
  acquisition_date: string;
  depreciation_start_date?: string;
  accumulated_depreciation: number;
  current_value: number;
}

/**
 * Calculate monthly depreciation using straight-line method
 */
function calculateMonthlyDepreciation(
  originalCost: number,
  residualValue: number,
  lifeYears: number
): number {
  if (lifeYears <= 0) return 0;
  const depreciableCost = originalCost - residualValue;
  if (depreciableCost <= 0) return 0;
  return Math.round((depreciableCost / (lifeYears * 12)) * 100) / 100;
}

/**
 * Calculate total depreciation for a period
 */
function calculateDepreciationForPeriod(
  asset: FixedAsset,
  fromDate: string,
  toDate: string
): {
  months: number;
  depreciation: number;
  newAccumulated: number;
  newCurrentValue: number;
} {
  const startDate = new Date(asset.depreciation_start_date || asset.acquisition_date);
  const periodStart = new Date(fromDate);
  const periodEnd = new Date(toDate);

  // Calculate months in period
  const monthsInPeriod = (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
    (periodEnd.getMonth() - periodStart.getMonth()) + 1;

  // Check if asset started depreciating before period
  if (startDate > periodEnd) {
    return {
      months: 0,
      depreciation: 0,
      newAccumulated: asset.accumulated_depreciation,
      newCurrentValue: asset.current_value,
    };
  }

  // Calculate monthly depreciation
  const monthlyDepr = calculateMonthlyDepreciation(
    asset.original_cost,
    asset.residual_value,
    asset.life_years
  );

  // Calculate remaining depreciable amount
  const maxDepreciation = asset.original_cost - asset.residual_value - asset.accumulated_depreciation;

  // Calculate depreciation for period
  let depreciation = monthlyDepr * monthsInPeriod;
  depreciation = Math.min(depreciation, maxDepreciation);
  depreciation = Math.max(depreciation, 0);

  const newAccumulated = asset.accumulated_depreciation + depreciation;
  const newCurrentValue = asset.original_cost - newAccumulated;

  return {
    months: monthsInPeriod,
    depreciation: Math.round(depreciation * 100) / 100,
    newAccumulated: Math.round(newAccumulated * 100) / 100,
    newCurrentValue: Math.round(newCurrentValue * 100) / 100,
  };
}

/**
 * Check if asset is fully depreciated
 */
function isFullyDepreciated(asset: FixedAsset): boolean {
  return asset.current_value <= asset.residual_value;
}

/**
 * Calculate remaining life in months
 */
function calculateRemainingLife(asset: FixedAsset): number {
  const monthlyDepr = calculateMonthlyDepreciation(
    asset.original_cost,
    asset.residual_value,
    asset.life_years
  );

  if (monthlyDepr <= 0) return 0;

  const remainingDepreciation = asset.current_value - asset.residual_value;
  if (remainingDepreciation <= 0) return 0;

  return Math.ceil(remainingDepreciation / monthlyDepr);
}

describe('Depreciation Calculations', () => {
  describe('calculateMonthlyDepreciation', () => {
    it('should calculate monthly depreciation for a standard asset', () => {
      // Asset: 120,000,000 VND, 5 years life, no residual
      const monthly = calculateMonthlyDepreciation(120000000, 0, 5);

      // 120,000,000 / (5 * 12) = 2,000,000 VND/month
      expect(monthly).toBe(2000000);
    });

    it('should account for residual value', () => {
      // Asset: 120,000,000 VND, 5 years life, 10,000,000 residual
      const monthly = calculateMonthlyDepreciation(120000000, 10000000, 5);

      // (120,000,000 - 10,000,000) / (5 * 12) = 1,833,333.33 VND/month
      expect(monthly).toBe(1833333.33);
    });

    it('should return 0 for zero life years', () => {
      const monthly = calculateMonthlyDepreciation(100000000, 0, 0);
      expect(monthly).toBe(0);
    });

    it('should return 0 when cost equals residual value', () => {
      const monthly = calculateMonthlyDepreciation(100000000, 100000000, 5);
      expect(monthly).toBe(0);
    });

    it('should return 0 when residual exceeds cost', () => {
      const monthly = calculateMonthlyDepreciation(100000000, 150000000, 5);
      expect(monthly).toBe(0);
    });

    it('should handle small assets (CCDC)', () => {
      // CCDC: 5,000,000 VND, 2 years
      const monthly = calculateMonthlyDepreciation(5000000, 0, 2);

      // 5,000,000 / (2 * 12) = 208,333.33 VND/month
      expect(monthly).toBe(208333.33);
    });
  });

  describe('calculateDepreciationForPeriod', () => {
    it('should calculate depreciation for a full month', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 0,
        life_years: 5,
        acquisition_date: '2024-01-01',
        accumulated_depreciation: 0,
        current_value: 120000000,
      };

      const result = calculateDepreciationForPeriod(asset, '2024-01-01', '2024-01-31');

      expect(result.months).toBe(1);
      expect(result.depreciation).toBe(2000000);
      expect(result.newAccumulated).toBe(2000000);
      expect(result.newCurrentValue).toBe(118000000);
    });

    it('should calculate depreciation for a quarter', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 0,
        life_years: 5,
        acquisition_date: '2024-01-01',
        accumulated_depreciation: 0,
        current_value: 120000000,
      };

      const result = calculateDepreciationForPeriod(asset, '2024-01-01', '2024-03-31');

      expect(result.months).toBe(3);
      expect(result.depreciation).toBe(6000000);
      expect(result.newAccumulated).toBe(6000000);
      expect(result.newCurrentValue).toBe(114000000);
    });

    it('should calculate depreciation for a year', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 0,
        life_years: 5,
        acquisition_date: '2024-01-01',
        accumulated_depreciation: 0,
        current_value: 120000000,
      };

      const result = calculateDepreciationForPeriod(asset, '2024-01-01', '2024-12-31');

      expect(result.months).toBe(12);
      expect(result.depreciation).toBe(24000000);
      expect(result.newAccumulated).toBe(24000000);
      expect(result.newCurrentValue).toBe(96000000);
    });

    it('should handle partial depreciation with accumulated', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 0,
        life_years: 5,
        acquisition_date: '2023-01-01',
        accumulated_depreciation: 24000000, // 1 year already
        current_value: 96000000,
      };

      const result = calculateDepreciationForPeriod(asset, '2024-01-01', '2024-12-31');

      expect(result.depreciation).toBe(24000000);
      expect(result.newAccumulated).toBe(48000000);
      expect(result.newCurrentValue).toBe(72000000);
    });

    it('should not exceed depreciable amount', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 10000000,
        life_years: 5,
        acquisition_date: '2020-01-01',
        accumulated_depreciation: 105000000, // Almost fully depreciated
        current_value: 15000000,
      };

      // Max remaining = 120,000,000 - 10,000,000 - 105,000,000 = 5,000,000
      const result = calculateDepreciationForPeriod(asset, '2024-01-01', '2024-12-31');

      expect(result.depreciation).toBe(5000000);
      expect(result.newCurrentValue).toBe(10000000); // Equals residual
    });

    it('should handle assets that start depreciating after period', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 0,
        life_years: 5,
        acquisition_date: '2025-01-01',
        depreciation_start_date: '2025-02-01',
        accumulated_depreciation: 0,
        current_value: 120000000,
      };

      const result = calculateDepreciationForPeriod(asset, '2024-01-01', '2024-12-31');

      expect(result.months).toBe(0);
      expect(result.depreciation).toBe(0);
    });
  });

  describe('isFullyDepreciated', () => {
    it('should return true when current value equals residual', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 10000000,
        life_years: 5,
        acquisition_date: '2020-01-01',
        accumulated_depreciation: 110000000,
        current_value: 10000000,
      };

      expect(isFullyDepreciated(asset)).toBe(true);
    });

    it('should return true when current value is below residual', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 10000000,
        life_years: 5,
        acquisition_date: '2020-01-01',
        accumulated_depreciation: 115000000,
        current_value: 5000000,
      };

      expect(isFullyDepreciated(asset)).toBe(true);
    });

    it('should return false when asset still has value', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 10000000,
        life_years: 5,
        acquisition_date: '2023-01-01',
        accumulated_depreciation: 24000000,
        current_value: 96000000,
      };

      expect(isFullyDepreciated(asset)).toBe(false);
    });
  });

  describe('calculateRemainingLife', () => {
    it('should calculate remaining months correctly', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 0,
        life_years: 5,
        acquisition_date: '2023-01-01',
        accumulated_depreciation: 24000000, // 12 months used
        current_value: 96000000,
      };

      // Remaining = 96,000,000 / 2,000,000 = 48 months
      expect(calculateRemainingLife(asset)).toBe(48);
    });

    it('should return 0 for fully depreciated asset', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 120000000,
        residual_value: 10000000,
        life_years: 5,
        acquisition_date: '2020-01-01',
        accumulated_depreciation: 110000000,
        current_value: 10000000,
      };

      expect(calculateRemainingLife(asset)).toBe(0);
    });

    it('should round up remaining months', () => {
      const asset: FixedAsset = {
        id: 'FA001',
        asset_code: 'TS001',
        original_cost: 100000000,
        residual_value: 0,
        life_years: 3,
        acquisition_date: '2023-01-01',
        accumulated_depreciation: 27777778, // 10 months used
        current_value: 72222222,
      };

      // Should round up to nearest whole month
      const remaining = calculateRemainingLife(asset);
      expect(remaining).toBeGreaterThan(0);
    });
  });
});

describe('CCDC (Low-Value Assets) Depreciation', () => {
  it('should handle CCDC with shorter life', () => {
    // CCDC typically depreciated over 1-2 years
    const monthly = calculateMonthlyDepreciation(3000000, 0, 1);

    // 3,000,000 / 12 = 250,000 VND/month
    expect(monthly).toBe(250000);
  });

  it('should fully depreciate CCDC in correct period', () => {
    const asset: FixedAsset = {
      id: 'CCDC001',
      asset_code: 'CC001',
      original_cost: 3000000,
      residual_value: 0,
      life_years: 1,
      acquisition_date: '2024-01-01',
      accumulated_depreciation: 0,
      current_value: 3000000,
    };

    const result = calculateDepreciationForPeriod(asset, '2024-01-01', '2024-12-31');

    expect(result.depreciation).toBe(3000000);
    expect(result.newCurrentValue).toBe(0);
  });
});
