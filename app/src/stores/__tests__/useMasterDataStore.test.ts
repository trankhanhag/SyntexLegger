/**
 * Tests for useMasterDataStore
 * Master data caching and management tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMasterDataStore } from '../useMasterDataStore';

describe('useMasterDataStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useMasterDataStore.setState({
            accounts: [],
            partners: [],
            products: [],
            materials: [],
            isLoadingAccounts: false,
            isLoadingPartners: false,
            isLoadingProducts: false,
            isLoadingMaterials: false,
            accountsError: null,
            partnersError: null,
            productsError: null,
            materialsError: null,
            accountsLoadedAt: null,
            partnersLoadedAt: null,
            productsLoadedAt: null,
            materialsLoadedAt: null,
        });
    });

    describe('Initial State', () => {
        it('should have empty arrays and null timestamps', () => {
            const state = useMasterDataStore.getState();

            expect(state.accounts).toEqual([]);
            expect(state.partners).toEqual([]);
            expect(state.products).toEqual([]);
            expect(state.materials).toEqual([]);
            expect(state.accountsLoadedAt).toBeNull();
            expect(state.partnersLoadedAt).toBeNull();
            expect(state.productsLoadedAt).toBeNull();
            expect(state.materialsLoadedAt).toBeNull();
        });

        it('should not be loading initially', () => {
            const state = useMasterDataStore.getState();

            expect(state.isLoadingAccounts).toBe(false);
            expect(state.isLoadingPartners).toBe(false);
            expect(state.isLoadingProducts).toBe(false);
            expect(state.isLoadingMaterials).toBe(false);
        });

        it('should have no errors initially', () => {
            const state = useMasterDataStore.getState();

            expect(state.accountsError).toBeNull();
            expect(state.partnersError).toBeNull();
            expect(state.productsError).toBeNull();
            expect(state.materialsError).toBeNull();
        });
    });

    describe('fetchAccounts', () => {
        it('should fetch and store accounts', async () => {
            const { fetchAccounts } = useMasterDataStore.getState();

            await fetchAccounts();

            const state = useMasterDataStore.getState();
            expect(state.accounts.length).toBeGreaterThan(0);
            expect(state.accounts[0]).toHaveProperty('account_code');
            expect(state.accounts[0]).toHaveProperty('account_name');
            expect(state.accountsLoadedAt).not.toBeNull();
            expect(state.isLoadingAccounts).toBe(false);
        });

        it('should not refetch if cache is valid', async () => {
            const { fetchAccounts, isCacheValid } = useMasterDataStore.getState();

            // First fetch
            await fetchAccounts();
            const firstLoadTime = useMasterDataStore.getState().accountsLoadedAt;

            // Verify cache is valid
            expect(isCacheValid('accounts')).toBe(true);

            // Second fetch without force
            await fetchAccounts(false);
            const secondLoadTime = useMasterDataStore.getState().accountsLoadedAt;

            // Should be the same timestamp (no refetch)
            expect(secondLoadTime).toBe(firstLoadTime);
        });

        it('should refetch when force=true', async () => {
            const { fetchAccounts } = useMasterDataStore.getState();

            // First fetch
            await fetchAccounts();
            const firstLoadTime = useMasterDataStore.getState().accountsLoadedAt;

            // Wait a tiny bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            // Force refetch
            await fetchAccounts(true);
            const secondLoadTime = useMasterDataStore.getState().accountsLoadedAt;

            // Should have new timestamp
            expect(secondLoadTime).not.toBe(firstLoadTime);
        });
    });

    describe('fetchPartners', () => {
        it('should fetch and store partners', async () => {
            const { fetchPartners } = useMasterDataStore.getState();

            await fetchPartners();

            const state = useMasterDataStore.getState();
            expect(state.partners.length).toBeGreaterThan(0);
            expect(state.partners[0]).toHaveProperty('partner_code');
            expect(state.partners[0]).toHaveProperty('partner_name');
            expect(state.partners[0]).toHaveProperty('partner_type');
        });
    });

    describe('fetchProducts', () => {
        it('should fetch and store products', async () => {
            const { fetchProducts } = useMasterDataStore.getState();

            await fetchProducts();

            const state = useMasterDataStore.getState();
            expect(state.products.length).toBeGreaterThan(0);
            expect(state.products[0]).toHaveProperty('product_code');
            expect(state.products[0]).toHaveProperty('product_name');
        });
    });

    describe('fetchMaterials', () => {
        it('should fetch and store materials', async () => {
            const { fetchMaterials } = useMasterDataStore.getState();

            await fetchMaterials();

            const state = useMasterDataStore.getState();
            expect(state.materials.length).toBeGreaterThan(0);
            expect(state.materials[0]).toHaveProperty('material_code');
            expect(state.materials[0]).toHaveProperty('material_name');
        });
    });

    describe('fetchAll', () => {
        it('should fetch all master data concurrently', async () => {
            const { fetchAll } = useMasterDataStore.getState();

            await fetchAll();

            const state = useMasterDataStore.getState();
            expect(state.accounts.length).toBeGreaterThan(0);
            expect(state.partners.length).toBeGreaterThan(0);
            expect(state.products.length).toBeGreaterThan(0);
            expect(state.materials.length).toBeGreaterThan(0);
        });
    });

    describe('Getter Functions', () => {
        beforeEach(async () => {
            // Load test data
            const { fetchAll } = useMasterDataStore.getState();
            await fetchAll();
        });

        describe('getAccountByCode', () => {
            it('should find account by code', () => {
                const { getAccountByCode } = useMasterDataStore.getState();

                const account = getAccountByCode('1111');

                expect(account).toBeDefined();
                expect(account?.account_code).toBe('1111');
                expect(account?.account_name).toBe('Tiền mặt');
            });

            it('should return undefined for non-existent code', () => {
                const { getAccountByCode } = useMasterDataStore.getState();

                const account = getAccountByCode('9999');

                expect(account).toBeUndefined();
            });
        });

        describe('getPartnerByCode', () => {
            it('should find partner by code', () => {
                const { getPartnerByCode } = useMasterDataStore.getState();

                const partner = getPartnerByCode('KH001');

                expect(partner).toBeDefined();
                expect(partner?.partner_code).toBe('KH001');
                expect(partner?.partner_name).toBe('Khách hàng A');
            });
        });

        describe('getDetailAccounts', () => {
            it('should return only detail accounts', () => {
                const { getDetailAccounts } = useMasterDataStore.getState();

                const detailAccounts = getDetailAccounts();

                expect(detailAccounts.length).toBeGreaterThan(0);
                detailAccounts.forEach(acc => {
                    expect(acc.is_detail).toBe(1);
                });
            });
        });

        describe('getCustomers', () => {
            it('should return only CUSTOMER partners', () => {
                const { getCustomers } = useMasterDataStore.getState();

                const customers = getCustomers();

                expect(customers.length).toBeGreaterThan(0);
                customers.forEach(customer => {
                    expect(customer.partner_type).toBe('CUSTOMER');
                });
            });
        });

        describe('getSuppliers', () => {
            it('should return only SUPPLIER partners', () => {
                const { getSuppliers } = useMasterDataStore.getState();

                const suppliers = getSuppliers();

                expect(suppliers.length).toBeGreaterThan(0);
                suppliers.forEach(supplier => {
                    expect(supplier.partner_type).toBe('SUPPLIER');
                });
            });
        });
    });

    describe('Cache Management', () => {
        describe('isCacheValid', () => {
            it('should return false when no data loaded', () => {
                const { isCacheValid } = useMasterDataStore.getState();

                expect(isCacheValid('accounts')).toBe(false);
                expect(isCacheValid('partners')).toBe(false);
                expect(isCacheValid('products')).toBe(false);
                expect(isCacheValid('materials')).toBe(false);
            });

            it('should return true after data is loaded', async () => {
                const { fetchAccounts, isCacheValid } = useMasterDataStore.getState();

                await fetchAccounts();

                expect(isCacheValid('accounts')).toBe(true);
            });
        });

        describe('invalidateCache', () => {
            it('should invalidate all cache timestamps', async () => {
                const { fetchAll, invalidateCache, isCacheValid } = useMasterDataStore.getState();

                // Load data
                await fetchAll();
                expect(isCacheValid('accounts')).toBe(true);

                // Invalidate cache
                invalidateCache();

                // All caches should be invalid
                expect(useMasterDataStore.getState().isCacheValid('accounts')).toBe(false);
                expect(useMasterDataStore.getState().isCacheValid('partners')).toBe(false);
                expect(useMasterDataStore.getState().isCacheValid('products')).toBe(false);
                expect(useMasterDataStore.getState().isCacheValid('materials')).toBe(false);
            });

            it('should keep data in memory after invalidation', async () => {
                const { fetchAll, invalidateCache } = useMasterDataStore.getState();

                await fetchAll();
                const accountsCount = useMasterDataStore.getState().accounts.length;

                invalidateCache();

                // Data should still be there
                expect(useMasterDataStore.getState().accounts.length).toBe(accountsCount);
            });
        });
    });
});
