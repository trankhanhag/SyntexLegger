/**
 * useVouchers Hook
 * SyntexHCSN - Custom hook cho quản lý voucher data
 * 
 * Tách logic data fetching từ GeneralModule.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { voucherService, masterDataService, dimensionService } from '../../../api';
import type { Voucher, VoucherFilter, Account, Partner, Product, Dimension, DimensionConfig } from '../types/voucher.types';

// Constants
const DEFAULT_FILTER: VoucherFilter = {
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    type: 'ALL',
    status: 'ALL'
};

export interface UseVouchersReturn {
    // Voucher Data
    vouchers: Voucher[];
    loading: boolean;
    error: string | null;

    // Filters
    filter: VoucherFilter;
    setFilter: (filter: Partial<VoucherFilter>) => void;

    // Actions
    refreshVouchers: () => Promise<void>;
    deleteVoucher: (id: string) => Promise<boolean>;

    // Master Data
    masterData: MasterData;
    loadingMasterData: boolean;
}

export interface MasterData {
    accounts: Account[];
    partners: Partner[];
    products: Product[];
    dimensions: Record<number, Dimension[]>;
    dimConfigs: DimensionConfig[];
}

/**
 * Custom hook để quản lý danh sách vouchers và master data
 */
export function useVouchers(initialFilter?: Partial<VoucherFilter>): UseVouchersReturn {
    // Voucher State
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilterState] = useState<VoucherFilter>({
        ...DEFAULT_FILTER,
        ...initialFilter
    });

    // Master Data State
    const [masterData, setMasterData] = useState<MasterData>({
        accounts: [],
        partners: [],
        products: [],
        dimensions: {},
        dimConfigs: []
    });
    const [loadingMasterData, setLoadingMasterData] = useState(false);

    /**
     * Fetch vouchers từ API
     */
    const fetchVouchers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await voucherService.getAll(
                filter.type !== 'ALL' ? filter.type : undefined,
                filter.fromDate,
                filter.toDate
            );
            const data = response.data;

            // Handle both array and object response
            if (Array.isArray(data)) {
                setVouchers(data);
            } else if (data && Array.isArray(data.data)) {
                setVouchers(data.data);
            } else {
                setVouchers([]);
            }
        } catch (err: any) {
            console.error('Fetch vouchers failed:', err);
            setError(err.message || 'Không thể tải danh sách chứng từ');
            setVouchers([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    /**
     * Fetch master data (accounts, partners, products, dimensions)
     */
    const fetchMasterData = useCallback(async () => {
        setLoadingMasterData(true);

        try {
            const [
                accountsRes,
                partnersRes,
                productsRes,
                dim1Res,
                dim2Res,
                dim3Res,
                dim4Res,
                dim5Res,
                dimConfigRes
            ] = await Promise.allSettled([
                masterDataService.getAccounts(),
                masterDataService.getPartners(),
                masterDataService.getProducts(),
                dimensionService.getDimensions(1),
                dimensionService.getDimensions(2),
                dimensionService.getDimensions(3),
                dimensionService.getDimensions(4),
                dimensionService.getDimensions(5),
                dimensionService.getConfigs()
            ]);

            const newMasterData: MasterData = {
                accounts: [],
                partners: [],
                products: [],
                dimensions: {},
                dimConfigs: []
            };

            // Process results
            if (accountsRes.status === 'fulfilled') {
                newMasterData.accounts = accountsRes.value.data || [];
            }
            if (partnersRes.status === 'fulfilled') {
                newMasterData.partners = partnersRes.value.data || [];
            }
            if (productsRes.status === 'fulfilled') {
                newMasterData.products = productsRes.value.data || [];
            }
            if (dimConfigRes.status === 'fulfilled') {
                newMasterData.dimConfigs = dimConfigRes.value.data || [];
            }

            // Process dimension results
            const dimensions: Record<number, Dimension[]> = {};
            if (dim1Res.status === 'fulfilled') dimensions[1] = dim1Res.value.data || [];
            if (dim2Res.status === 'fulfilled') dimensions[2] = dim2Res.value.data || [];
            if (dim3Res.status === 'fulfilled') dimensions[3] = dim3Res.value.data || [];
            if (dim4Res.status === 'fulfilled') dimensions[4] = dim4Res.value.data || [];
            if (dim5Res.status === 'fulfilled') dimensions[5] = dim5Res.value.data || [];
            newMasterData.dimensions = dimensions;

            setMasterData(newMasterData);
        } catch (err) {
            console.error('Fetch master data failed:', err);
        } finally {
            setLoadingMasterData(false);
        }
    }, []);

    /**
     * Delete a voucher
     */
    const deleteVoucher = useCallback(async (id: string): Promise<boolean> => {
        try {
            await voucherService.delete(id);
            setVouchers(prev => prev.filter(v => v.id !== id));
            return true;
        } catch (err: any) {
            console.error('Delete voucher failed:', err);
            setError(err.message || 'Không thể xóa chứng từ');
            return false;
        }
    }, []);

    /**
     * Update filter and trigger refetch
     */
    const setFilter = useCallback((newFilter: Partial<VoucherFilter>) => {
        setFilterState(prev => ({ ...prev, ...newFilter }));
    }, []);

    // Fetch vouchers on filter change
    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    // Fetch master data on mount
    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    return {
        vouchers,
        loading,
        error,
        filter,
        setFilter,
        refreshVouchers: fetchVouchers,
        deleteVoucher,
        masterData,
        loadingMasterData
    };
}

export default useVouchers;
