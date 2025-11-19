import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from './useDebounce';

export interface SearchFilters {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  status?: string;
}

export interface SearchOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useSearch(initialFilters: SearchFilters = {}, initialOptions: SearchOptions = {}) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [options, setOptions] = useState<SearchOptions>({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialOptions,
  });

  // Debounce search query
  const debouncedSearch = useDebounce(filters.search, 300);

  // Build query params
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.append('search', debouncedSearch);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.inStock !== undefined) params.append('inStock', filters.inStock.toString());
    if (filters.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured.toString());
    if (filters.status) params.append('status', filters.status);

    if (options.page) params.append('page', options.page.toString());
    if (options.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    return params.toString();
  }, [debouncedSearch, filters, options]);

  // Search query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', buildParams()],
    queryFn: async () => {
      const params = buildParams();
      const { data } = await api.get(`/search?${params}`);
      return data;
    },
    enabled: true,
  });

  // Update filter
  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    // Reset to first page when filters change
    setOptions((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setOptions((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Clear single filter
  const clearFilter = useCallback((key: keyof SearchFilters) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Update options (pagination, sorting)
  const updateOptions = useCallback((newOptions: Partial<SearchOptions>) => {
    setOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  // Set page
  const setPage = useCallback((page: number) => {
    setOptions((prev) => ({ ...prev, page }));
  }, []);

  // Set sort
  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setOptions((prev) => ({ ...prev, sortBy, sortOrder }));
  }, []);

  // Get active filter count
  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof SearchFilters] !== undefined
  ).length;

  return {
    // Data
    products: data?.data || [],
    pagination: data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    isLoading,
    error,

    // Current state
    filters,
    options,
    activeFilterCount,

    // Actions
    updateFilter,
    clearFilters,
    clearFilter,
    updateOptions,
    setPage,
    setSort,
    refetch,
  };
}
