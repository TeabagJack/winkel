import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { QuoteService } from '../services/quote.service.js';
import { QuoteStatus } from '@prisma/client';

export class QuoteController {
  /**
   * Create a new quote
   */
  async createQuote(req: AuthRequest, res: Response): Promise<void> {
    const { customerNotes } = req.body;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'User must be associated with a company to create a quote',
      });
      return;
    }

    const quote = await QuoteService.createQuote({
      userId,
      companyId,
      customerNotes,
    });

    res.status(201).json({
      success: true,
      data: quote,
      message: 'Quote created successfully',
    });
  }

  /**
   * Get all quotes (admin sees all, users see their own)
   */
  async getQuotes(req: AuthRequest, res: Response): Promise<void> {
    const { status, page, pageSize, search } = req.query;
    const user = req.user!;

    const filters: any = {
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      search: search as string,
      status: status as QuoteStatus,
    };

    // Non-admin users can only see their own quotes
    if (user.role !== 'SUPER_ADMIN') {
      filters.userId = user.id;
    }

    const result = await QuoteService.getQuotes(filters);

    res.json({
      success: true,
      ...result,
    });
  }

  /**
   * Get quote by ID
   */
  async getQuoteById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;

    const quote = await QuoteService.getQuoteById(id);

    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
      return;
    }

    // Non-admin users can only see their own quotes
    if (user.role !== 'SUPER_ADMIN' && quote.userId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    res.json({
      success: true,
      data: quote,
    });
  }

  /**
   * Add item to quote
   */
  async addItem(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { productId, requestedQuantity, notes } = req.body;
    const user = req.user!;

    // Verify ownership
    const quote = await QuoteService.getQuoteById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && quote.userId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const item = await QuoteService.addItemToQuote(id, {
      productId,
      requestedQuantity: parseInt(requestedQuantity),
      notes,
    });

    res.json({
      success: true,
      data: item,
      message: 'Item added to quote',
    });
  }

  /**
   * Remove item from quote
   */
  async removeItem(req: AuthRequest, res: Response): Promise<void> {
    const { id, itemId } = req.params;
    const user = req.user!;

    // Verify ownership
    const quote = await QuoteService.getQuoteById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && quote.userId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    await QuoteService.removeItemFromQuote(id, itemId);

    res.json({
      success: true,
      message: 'Item removed from quote',
    });
  }

  /**
   * Submit quote for review
   */
  async submitQuote(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;
    const user = req.user!;

    // Verify ownership
    const quote = await QuoteService.getQuoteById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && quote.userId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const updatedQuote = await QuoteService.submitQuote(id, userId);

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Quote submitted for review',
    });
  }

  /**
   * Admin reviews quote and provides pricing (SUPER_ADMIN only)
   */
  async reviewQuote(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { items, taxAmount, shippingAmount, adminNotes, validUntil } = req.body;
    const adminId = req.user!.id;

    const parsedValidUntil = validUntil ? new Date(validUntil) : undefined;

    const updatedQuote = await QuoteService.reviewQuote(id, adminId, {
      items: items.map((item: any) => ({
        itemId: item.itemId,
        quotedQuantity: parseInt(item.quotedQuantity),
        quotedUnitPrice: parseFloat(item.quotedUnitPrice),
      })),
      taxAmount: taxAmount ? parseFloat(taxAmount) : undefined,
      shippingAmount: shippingAmount ? parseFloat(shippingAmount) : undefined,
      adminNotes,
      validUntil: parsedValidUntil,
    });

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Quote reviewed and pricing provided',
    });
  }

  /**
   * Accept quote (customer)
   */
  async acceptQuote(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;
    const user = req.user!;

    // Verify ownership
    const quote = await QuoteService.getQuoteById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && quote.userId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const updatedQuote = await QuoteService.acceptQuote(id, userId);

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Quote accepted',
    });
  }

  /**
   * Reject quote
   */
  async rejectQuote(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;
    const user = req.user!;

    // Verify ownership or admin
    const quote = await QuoteService.getQuoteById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && quote.userId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const updatedQuote = await QuoteService.rejectQuote(id, userId, reason);

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Quote rejected',
    });
  }

  /**
   * Delete quote (only drafts)
   */
  async deleteQuote(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;

    // Verify ownership
    const quote = await QuoteService.getQuoteById(id);
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && quote.userId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    await QuoteService.deleteQuote(id);

    res.json({
      success: true,
      message: 'Quote deleted successfully',
    });
  }

  /**
   * Get quote statistics (SUPER_ADMIN only)
   */
  async getStatistics(req: AuthRequest, res: Response): Promise<void> {
    const stats = await QuoteService.getQuoteStatistics();

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * Expire quotes past validUntil date (SUPER_ADMIN only)
   */
  async expireQuotes(req: AuthRequest, res: Response): Promise<void> {
    const count = await QuoteService.expireQuotes();

    res.json({
      success: true,
      message: `${count} quotes expired`,
      data: { expiredCount: count },
    });
  }
}
