import { PrismaClient, AlertType, MovementType } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export class InventoryService {
  /**
   * Check inventory levels and create alerts
   */
  static async checkInventoryLevels(): Promise<void> {
    const products = await prisma.product.findMany({
      where: {
        trackInventory: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        lowStockAlert: true,
      },
    });

    for (const product of products) {
      // Check for out of stock
      if (product.quantity === 0) {
        await this.createAlert(product.id, AlertType.OUT_OF_STOCK, 0, 0);
      }
      // Check for low stock
      else if (product.lowStockAlert && product.quantity <= product.lowStockAlert) {
        await this.createAlert(
          product.id,
          AlertType.LOW_STOCK,
          product.lowStockAlert,
          product.quantity
        );
      }
      // Check for reorder point (half of low stock threshold)
      else if (product.lowStockAlert && product.quantity <= product.lowStockAlert / 2) {
        await this.createAlert(
          product.id,
          AlertType.REORDER_POINT,
          Math.floor(product.lowStockAlert / 2),
          product.quantity
        );
      }
    }

    logger.info(`Inventory check completed for ${products.length} products`);
  }

  /**
   * Create inventory alert if not already exists
   */
  private static async createAlert(
    productId: string,
    alertType: AlertType,
    threshold: number,
    currentValue: number
  ): Promise<void> {
    // Check if active alert already exists
    const existingAlert = await prisma.inventoryAlert.findFirst({
      where: {
        productId,
        alertType,
        isResolved: false,
      },
    });

    if (!existingAlert) {
      await prisma.inventoryAlert.create({
        data: {
          productId,
          alertType,
          threshold,
          currentValue,
        },
      });

      logger.info(`Created ${alertType} alert for product ${productId}`);
    }
  }

  /**
   * Get all active alerts
   */
  static async getActiveAlerts(filters?: {
    productId?: string;
    alertType?: AlertType;
  }) {
    return await prisma.inventoryAlert.findMany({
      where: {
        isResolved: false,
        ...(filters?.productId && { productId: filters.productId }),
        ...(filters?.alertType && { alertType: filters.alertType }),
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            quantity: true,
            lowStockAlert: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: string): Promise<void> {
    await prisma.inventoryAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    logger.info(`Resolved alert ${alertId}`);
  }

  /**
   * Record stock movement
   */
  static async recordStockMovement(data: {
    productId: string;
    type: MovementType;
    quantity: number;
    reason?: string;
    userId?: string;
  }): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { quantity: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const before = product.quantity;
    const after = before + data.quantity;

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        before,
        after,
        reason: data.reason,
        ...(data.userId && { userId: data.userId }),
      },
    });

    // Update product quantity
    await prisma.product.update({
      where: { id: data.productId },
      data: { quantity: after },
    });

    logger.info(
      `Recorded ${data.type} movement for product ${data.productId}: ${before} → ${after}`
    );

    // Check if this creates or resolves alerts
    await this.checkAndUpdateAlerts(data.productId, after);
  }

  /**
   * Check and update alerts after stock change
   */
  private static async checkAndUpdateAlerts(
    productId: string,
    newQuantity: number
  ): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { lowStockAlert: true },
    });

    if (!product?.lowStockAlert) return;

    // Resolve out of stock alert if stock is restored
    if (newQuantity > 0) {
      await prisma.inventoryAlert.updateMany({
        where: {
          productId,
          alertType: AlertType.OUT_OF_STOCK,
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    }

    // Resolve low stock alert if above threshold
    if (newQuantity > product.lowStockAlert) {
      await prisma.inventoryAlert.updateMany({
        where: {
          productId,
          alertType: {
            in: [AlertType.LOW_STOCK, AlertType.REORDER_POINT],
          },
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get stock movement history
   */
  static async getStockHistory(productId: string, limit: number = 50) {
    return await prisma.stockMovement.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get inventory analytics
   */
  static async getInventoryAnalytics() {
    const [
      totalProducts,
      outOfStock,
      lowStock,
      totalAlerts,
      recentMovements,
    ] = await Promise.all([
      prisma.product.count({
        where: { trackInventory: true, isActive: true },
      }),
      prisma.product.count({
        where: { trackInventory: true, isActive: true, quantity: 0 },
      }),
      prisma.product.count({
        where: {
          trackInventory: true,
          isActive: true,
          AND: [
            { quantity: { gt: 0 } },
            { lowStockAlert: { not: null } },
          ],
        },
      }),
      prisma.inventoryAlert.count({
        where: { isResolved: false },
      }),
      prisma.stockMovement.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    // Get movement breakdown by type
    const movementsByType = await prisma.stockMovement.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    return {
      totalProducts,
      outOfStock,
      lowStock,
      totalAlerts,
      recentMovements,
      movementsByType: movementsByType.map((m) => ({
        type: m.type,
        count: m._count.type,
      })),
    };
  }

  /**
   * Get products needing restock
   */
  static async getRestockRecommendations() {
    const alerts = await prisma.inventoryAlert.findMany({
      where: {
        isResolved: false,
        alertType: {
          in: [AlertType.LOW_STOCK, AlertType.OUT_OF_STOCK, AlertType.REORDER_POINT],
        },
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            quantity: true,
            lowStockAlert: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return alerts.map((alert) => ({
      productId: alert.product.id,
      sku: alert.product.sku,
      name: alert.product.name,
      category: alert.product.category.name,
      currentStock: alert.product.quantity,
      lowStockThreshold: alert.product.lowStockAlert,
      alertType: alert.alertType,
      recommendedOrderQty: alert.product.lowStockAlert
        ? alert.product.lowStockAlert * 2
        : 50,
    }));
  }
}
