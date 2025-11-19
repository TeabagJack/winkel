import { PrismaClient, QuoteStatus, QuoteAction } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

interface CreateQuoteData {
  userId: string;
  companyId: string;
  customerNotes?: string;
}

interface AddQuoteItemData {
  productId: string;
  requestedQuantity: number;
  notes?: string;
}

interface QuoteItemPricing {
  itemId: string;
  quotedQuantity: number;
  quotedUnitPrice: number;
}

interface ReviewQuoteData {
  items: QuoteItemPricing[];
  taxAmount?: number;
  shippingAmount?: number;
  adminNotes?: string;
  validUntil?: Date;
}

export class QuoteService {
  /**
   * Generate unique quote number
   */
  private static async generateQuoteNumber(): Promise<string> {
    const prefix = 'QT';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Get count of quotes this month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const count = await prisma.quote.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${year}${month}-${sequence}`;
  }

  /**
   * Create a new quote
   */
  static async createQuote(data: CreateQuoteData) {
    const quoteNumber = await this.generateQuoteNumber();

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: data.userId,
        companyId: data.companyId,
        customerNotes: data.customerNotes,
        status: QuoteStatus.DRAFT,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Record history
    await this.recordHistory(
      quote.id,
      QuoteAction.CREATED,
      data.userId,
      `${quote.user.firstName} ${quote.user.lastName}`,
      'Quote created'
    );

    logger.info(`Quote ${quoteNumber} created by user ${data.userId}`);
    return quote;
  }

  /**
   * Add item to quote
   */
  static async addItemToQuote(quoteId: string, data: AddQuoteItemData) {
    // Verify quote is in DRAFT status
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new Error('Can only add items to draft quotes');
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if item already exists
    const existingItem = await prisma.quoteItem.findFirst({
      where: {
        quoteId,
        productId: data.productId,
      },
    });

    if (existingItem) {
      // Update existing item
      return await prisma.quoteItem.update({
        where: { id: existingItem.id },
        data: {
          requestedQuantity: data.requestedQuantity,
          notes: data.notes,
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              basePrice: true,
              images: {
                take: 1,
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      });
    }

    // Create new item
    const item = await prisma.quoteItem.create({
      data: {
        quoteId,
        productId: data.productId,
        requestedQuantity: data.requestedQuantity,
        notes: data.notes,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    logger.info(`Item added to quote ${quote.quoteNumber}`);
    return item;
  }

  /**
   * Remove item from quote
   */
  static async removeItemFromQuote(quoteId: string, itemId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new Error('Can only remove items from draft quotes');
    }

    await prisma.quoteItem.delete({
      where: { id: itemId },
    });

    logger.info(`Item removed from quote ${quote.quoteNumber}`);
  }

  /**
   * Submit quote for review
   */
  static async submitQuote(quoteId: string, userId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: true,
        user: true,
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new Error('Quote has already been submitted');
    }

    if (quote.items.length === 0) {
      throw new Error('Cannot submit quote with no items');
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: QuoteStatus.SUBMITTED,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    await this.recordHistory(
      quoteId,
      QuoteAction.SUBMITTED,
      userId,
      `${quote.user.firstName} ${quote.user.lastName}`,
      'Quote submitted for review'
    );

    logger.info(`Quote ${quote.quoteNumber} submitted by user ${userId}`);
    return updatedQuote;
  }

  /**
   * Admin reviews quote and provides pricing
   */
  static async reviewQuote(quoteId: string, adminId: string, data: ReviewQuoteData) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: true,
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== QuoteStatus.SUBMITTED) {
      throw new Error('Can only review submitted quotes');
    }

    // Calculate pricing
    let subtotal = 0;

    // Update quote items with pricing
    for (const itemPricing of data.items) {
      const item = quote.items.find((i) => i.id === itemPricing.itemId);
      if (!item) {
        throw new Error(`Quote item ${itemPricing.itemId} not found`);
      }

      const quotedTotal = itemPricing.quotedQuantity * itemPricing.quotedUnitPrice;
      subtotal += quotedTotal;

      await prisma.quoteItem.update({
        where: { id: itemPricing.itemId },
        data: {
          quotedQuantity: itemPricing.quotedQuantity,
          quotedUnitPrice: itemPricing.quotedUnitPrice,
          quotedTotalPrice: quotedTotal,
        },
      });
    }

    const taxAmount = data.taxAmount || 0;
    const shippingAmount = data.shippingAmount || 0;
    const total = subtotal + taxAmount + shippingAmount;

    // Default validity: 30 days from now
    const validUntil = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: QuoteStatus.QUOTED,
        subtotal,
        taxAmount,
        shippingAmount,
        total,
        adminNotes: data.adminNotes,
        validUntil,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Get admin user for history
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    await this.recordHistory(
      quoteId,
      QuoteAction.QUOTED,
      adminId,
      admin ? `${admin.firstName} ${admin.lastName}` : 'Admin',
      `Quote reviewed. Total: $${total.toFixed(2)}`,
      { subtotal, taxAmount, shippingAmount, total }
    );

    logger.info(`Quote ${quote.quoteNumber} reviewed by admin ${adminId}`);
    return updatedQuote;
  }

  /**
   * Customer accepts quote
   */
  static async acceptQuote(quoteId: string, userId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        user: true,
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== QuoteStatus.QUOTED) {
      throw new Error('Quote must be in QUOTED status to accept');
    }

    // Check if expired
    if (quote.validUntil && new Date() > quote.validUntil) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { status: QuoteStatus.EXPIRED },
      });
      throw new Error('Quote has expired');
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: QuoteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    await this.recordHistory(
      quoteId,
      QuoteAction.ACCEPTED,
      userId,
      `${quote.user.firstName} ${quote.user.lastName}`,
      'Quote accepted by customer'
    );

    logger.info(`Quote ${quote.quoteNumber} accepted by user ${userId}`);
    return updatedQuote;
  }

  /**
   * Reject quote
   */
  static async rejectQuote(quoteId: string, userId: string, reason?: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        user: true,
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: QuoteStatus.REJECTED,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    await this.recordHistory(
      quoteId,
      QuoteAction.REJECTED,
      userId,
      `${quote.user.firstName} ${quote.user.lastName}`,
      reason || 'Quote rejected'
    );

    logger.info(`Quote ${quote.quoteNumber} rejected by user ${userId}`);
    return updatedQuote;
  }

  /**
   * Get quote by ID
   */
  static async getQuoteById(quoteId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                quantity: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return quote;
  }

  /**
   * Get all quotes with filters
   */
  static async getQuotes(filters?: {
    userId?: string;
    companyId?: string;
    status?: QuoteStatus;
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.status) where.status = filters.status;

    if (filters?.search) {
      where.OR = [
        { quoteNumber: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { company: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.quote.count({ where }),
    ]);

    return {
      data: quotes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get quote statistics
   */
  static async getQuoteStatistics() {
    const [total, draft, submitted, quoted, accepted, rejected, expired] = await Promise.all([
      prisma.quote.count(),
      prisma.quote.count({ where: { status: QuoteStatus.DRAFT } }),
      prisma.quote.count({ where: { status: QuoteStatus.SUBMITTED } }),
      prisma.quote.count({ where: { status: QuoteStatus.QUOTED } }),
      prisma.quote.count({ where: { status: QuoteStatus.ACCEPTED } }),
      prisma.quote.count({ where: { status: QuoteStatus.REJECTED } }),
      prisma.quote.count({ where: { status: QuoteStatus.EXPIRED } }),
    ]);

    return {
      total,
      byStatus: {
        draft,
        submitted,
        quoted,
        accepted,
        rejected,
        expired,
      },
    };
  }

  /**
   * Expire quotes past validUntil date
   */
  static async expireQuotes(): Promise<number> {
    const result = await prisma.quote.updateMany({
      where: {
        status: QuoteStatus.QUOTED,
        validUntil: {
          lt: new Date(),
        },
      },
      data: {
        status: QuoteStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      logger.info(`Expired ${result.count} quotes`);
    }

    return result.count;
  }

  /**
   * Delete draft quote
   */
  static async deleteQuote(quoteId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new Error('Can only delete draft quotes');
    }

    await prisma.quote.delete({
      where: { id: quoteId },
    });

    logger.info(`Quote ${quote.quoteNumber} deleted`);
  }

  /**
   * Record quote history
   */
  private static async recordHistory(
    quoteId: string,
    action: QuoteAction,
    userId: string,
    userName: string,
    notes?: string,
    metadata?: any
  ) {
    await prisma.quoteHistory.create({
      data: {
        quoteId,
        action,
        userId,
        userName,
        notes,
        metadata,
      },
    });
  }
}
