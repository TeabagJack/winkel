import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const searchController = new SearchController();

// Helper to wrap async functions
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Advanced product search
 *     description: Search products with filters, facets, and full-text search
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter by stock status
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *         description: Filter featured products
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: number
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     pageSize:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authenticate, asyncHandler(searchController.searchProducts.bind(searchController)));

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     description: Get autocomplete suggestions based on partial query
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 5
 *         description: Maximum suggestions
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get(
  '/suggestions',
  authenticate,
  asyncHandler(searchController.getSearchSuggestions.bind(searchController))
);

/**
 * @swagger
 * /api/search/popular:
 *   get:
 *     summary: Get popular searches
 *     description: Get most frequently searched queries
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of popular searches
 *     responses:
 *       200:
 *         description: Popular searches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       count:
 *                         type: number
 */
router.get('/popular', authenticate, asyncHandler(searchController.getPopularSearches.bind(searchController)));

/**
 * @swagger
 * /api/search/facets:
 *   get:
 *     summary: Get search facets
 *     description: Get category counts, price ranges, and stock status for filtering
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search facets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           count:
 *                             type: number
 *                     priceRanges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           min:
 *                             type: number
 *                           max:
 *                             type: number
 *                           count:
 *                             type: number
 *                     stockStatus:
 *                       type: object
 *                       properties:
 *                         inStock:
 *                           type: number
 *                         outOfStock:
 *                           type: number
 */
router.get('/facets', authenticate, asyncHandler(searchController.getSearchFacets.bind(searchController)));

/**
 * @swagger
 * /api/search/analytics:
 *   get:
 *     summary: Get search analytics
 *     description: Get search analytics (SUPER_ADMIN only)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Search analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSearches:
 *                       type: number
 *                     avgResults:
 *                       type: number
 *                     topSearches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           query:
 *                             type: string
 *                           count:
 *                             type: number
 *                     zeroResults:
 *                       type: number
 *                     zeroResultsRate:
 *                       type: number
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/analytics',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(searchController.getSearchAnalytics.bind(searchController))
);

export default router;
