import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { InventoryService } from '../services/inventory.service.js';
import { MovementType } from '@prisma/client';

export class InventoryController {
  /**
   * Get all active inventory alerts
   */
  async getActiveAlerts(req: AuthRequest, res: Response): Promise<void> {
    const { productId, alertType } = req.query;

    const alerts = await InventoryService.getActiveAlerts({
      ...(productId && { productId: productId as string }),
      ...(alertType && { alertType: alertType as any }),
    });

    res.json({
      success: true,
      data: alerts,
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    await InventoryService.resolveAlert(id);

    res.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  }

  /**
   * Record stock movement
   */
  async recordStockMovement(req: AuthRequest, res: Response): Promise<void> {
    const { productId, type, quantity, reason } = req.body;

    await InventoryService.recordStockMovement({
      productId,
      type: type as MovementType,
      quantity: parseInt(quantity),
      reason,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      message: 'Stock movement recorded successfully',
    });
  }

  /**
   * Get stock movement history for a product
   */
  async getStockHistory(req: AuthRequest, res: Response): Promise<void> {
    const { productId } = req.params;
    const { limit } = req.query;

    const history = await InventoryService.getStockHistory(
      productId,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: history,
    });
  }

  /**
   * Get inventory analytics
   */
  async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    const analytics = await InventoryService.getInventoryAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  }

  /**
   * Get restock recommendations
   */
  async getRestockRecommendations(req: AuthRequest, res: Response): Promise<void> {
    const recommendations = await InventoryService.getRestockRecommendations();

    res.json({
      success: true,
      data: recommendations,
    });
  }

  /**
   * Run inventory check manually
   */
  async runInventoryCheck(req: AuthRequest, res: Response): Promise<void> {
    await InventoryService.checkInventoryLevels();

    res.json({
      success: true,
      message: 'Inventory check completed',
    });
  }
}
