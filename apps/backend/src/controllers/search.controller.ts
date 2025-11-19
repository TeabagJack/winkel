import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { SearchService, SearchFilters, SearchOptions } from '../services/search.service.js';

export class SearchController {
  /**
   * Advanced product search
   */
  async searchProducts(req: AuthRequest, res: Response): Promise<void> {
    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      categoryId,
      status,
      minPrice,
      maxPrice,
      inStock,
      isFeatured,
    } = req.query;

    const filters: SearchFilters = {
      ...(search && { search: search as string }),
      ...(categoryId && { categoryId: categoryId as string }),
      ...(status && { status: status as string }),
      ...(minPrice && { minPrice: parseFloat(minPrice as string) }),
      ...(maxPrice && { maxPrice: parseFloat(maxPrice as string) }),
      ...(inStock !== undefined && { inStock: inStock === 'true' }),
      ...(isFeatured !== undefined && { isFeatured: isFeatured === 'true' }),
    };

    const options: SearchOptions = {
      ...(page && { page: parseInt(page as string) }),
      ...(pageSize && { pageSize: parseInt(pageSize as string) }),
      ...(sortBy && { sortBy: sortBy as string }),
      ...(sortOrder && { sortOrder: sortOrder as 'asc' | 'desc' }),
    };

    const result = await SearchService.searchProducts(
      filters,
      options,
      req.user?.id
    );

    res.json({
      success: true,
      data: result.products,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
      filters: result.filters,
    });
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(req: AuthRequest, res: Response): Promise<void> {
    const { query, limit } = req.query;

    if (!query || typeof query !== 'string') {
      res.json({ success: true, data: [] });
      return;
    }

    const suggestions = await SearchService.getSearchSuggestions(
      query,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: suggestions,
    });
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(req: AuthRequest, res: Response): Promise<void> {
    const { limit } = req.query;

    const searches = await SearchService.getPopularSearches(
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: searches,
    });
  }

  /**
   * Get search facets
   */
  async getSearchFacets(req: AuthRequest, res: Response): Promise<void> {
    const { search, categoryId, status } = req.query;

    const filters: SearchFilters = {
      ...(search && { search: search as string }),
      ...(categoryId && { categoryId: categoryId as string }),
      ...(status && { status: status as string }),
    };

    const facets = await SearchService.getSearchFacets(filters);

    res.json({
      success: true,
      data: facets,
    });
  }

  /**
   * Get search analytics (admin only)
   */
  async getSearchAnalytics(req: AuthRequest, res: Response): Promise<void> {
    const { days } = req.query;

    const analytics = await SearchService.getSearchAnalytics(
      days ? parseInt(days as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  }
}
