import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface SearchFilters {
  categoryId?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  search?: string;
}

export interface SearchOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  products: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: SearchFilters;
}

export class SearchService {
  /**
   * Advanced product search with full-text search and filters
   */
  static async searchProducts(
    filters: SearchFilters,
    options: SearchOptions = {},
    userId?: string
  ): Promise<SearchResult> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    // Full-text search
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { shortDescription: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.basePrice = {};
      if (filters.minPrice !== undefined) {
        where.basePrice.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.basePrice.lte = filters.maxPrice;
      }
    }

    // Stock filter
    if (filters.inStock !== undefined) {
      if (filters.inStock) {
        where.quantity = { gt: 0 };
      } else {
        where.quantity = { lte: 0 };
      }
    }

    // Featured filter
    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    // Execute search
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Log search query for analytics
    if (filters.search || Object.keys(filters).length > 1) {
      await this.logSearchQuery(filters, total, userId);
    }

    return {
      products,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      filters,
    };
  }

  /**
   * Get search suggestions based on query
   */
  static async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        name: true,
        sku: true,
      },
      take: limit,
    });

    const suggestions = new Set<string>();
    products.forEach((p) => {
      if (p.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(p.name);
      }
      if (p.sku.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(p.sku);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get popular search queries
   */
  static async getPopularSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    const searches = await prisma.searchQuery.groupBy({
      by: ['query'],
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
      where: {
        results: { gt: 0 }, // Only count searches that had results
      },
    });

    return searches.map((s) => ({
      query: s.query,
      count: s._count.query,
    }));
  }

  /**
   * Get facets for filtering (category counts, price ranges, etc.)
   */
  static async getSearchFacets(filters: SearchFilters): Promise<{
    categories: Array<{ id: string; name: string; count: number }>;
    priceRanges: Array<{ min: number; max: number; count: number }>;
    stockStatus: { inStock: number; outOfStock: number };
  }> {
    // Build base where clause (without category and price filters for facets)
    const baseWhere: Prisma.ProductWhereInput = {};

    if (filters.search) {
      baseWhere.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get category counts
    const categoryGroups = await prisma.product.groupBy({
      by: ['categoryId'],
      where: baseWhere,
      _count: {
        categoryId: true,
      },
    });

    const categoryIds = categoryGroups.map((g) => g.categoryId).filter(Boolean) as string[];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoriesWithCounts = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: categoryGroups.find((g) => g.categoryId === cat.id)?._count.categoryId || 0,
    }));

    // Get stock status counts
    const [inStock, outOfStock] = await Promise.all([
      prisma.product.count({ where: { ...baseWhere, quantity: { gt: 0 } } }),
      prisma.product.count({ where: { ...baseWhere, quantity: { lte: 0 } } }),
    ]);

    // Define price ranges
    const priceRanges = [
      { min: 0, max: 100 },
      { min: 100, max: 500 },
      { min: 500, max: 1000 },
      { min: 1000, max: 5000 },
      { min: 5000, max: Infinity },
    ];

    const priceRangeCounts = await Promise.all(
      priceRanges.map(async (range) => {
        const count = await prisma.product.count({
          where: {
            ...baseWhere,
            basePrice: {
              gte: range.min,
              ...(range.max !== Infinity && { lte: range.max }),
            },
          },
        });
        return { ...range, count };
      })
    );

    return {
      categories: categoriesWithCounts.sort((a, b) => b.count - a.count),
      priceRanges: priceRangeCounts.filter((r) => r.count > 0),
      stockStatus: { inStock, outOfStock },
    };
  }

  /**
   * Log search query for analytics
   */
  private static async logSearchQuery(
    filters: SearchFilters,
    results: number,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.searchQuery.create({
        data: {
          query: filters.search || '',
          filters: filters as any,
          results,
          ...(userId && { userId }),
        },
      });
    } catch (error) {
      logger.error('Failed to log search query:', error);
      // Don't throw error - logging failure shouldn't break search
    }
  }

  /**
   * Get search analytics
   */
  static async getSearchAnalytics(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalSearches, avgResults, topSearches, zeroResults] = await Promise.all([
      // Total searches
      prisma.searchQuery.count({
        where: { createdAt: { gte: since } },
      }),

      // Average results per search
      prisma.searchQuery.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { results: true },
      }),

      // Top searches
      prisma.searchQuery.groupBy({
        by: ['query'],
        where: {
          createdAt: { gte: since },
          query: { not: '' },
        },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: 10,
      }),

      // Zero result searches
      prisma.searchQuery.count({
        where: {
          createdAt: { gte: since },
          results: 0,
        },
      }),
    ]);

    return {
      totalSearches,
      avgResults: avgResults._avg.results || 0,
      topSearches: topSearches.map((s) => ({
        query: s.query,
        count: s._count.query,
      })),
      zeroResults,
      zeroResultsRate: totalSearches > 0 ? (zeroResults / totalSearches) * 100 : 0,
    };
  }
}
