import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';

const prisma = new PrismaClient();

export class OrderController {
  // Get all orders with pagination and filters
  async getOrders(req: AuthRequest, res: Response): Promise<void> {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      status = '',
      paymentStatus = '',
      companyId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } },
        { company: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as string;
    }

    if (companyId) {
      where.companyId = companyId as string;
    }

    // Get orders and total count
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
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
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  }

  // Get single order by ID
  async getOrder(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
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
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        billingAddress: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    res.json({
      success: true,
      data: order,
    });
  }

  // Update order status
  async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new AppError(404, 'Order not found');
    }

    // Build update data
    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
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
      },
    });

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully',
    });
  }

  // Create order (for future use)
  async createOrder(req: AuthRequest, res: Response): Promise<void> {
    const {
      userId,
      companyId,
      items,
      billingAddressId,
      shippingAddressId,
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      total,
      notes,
    } = req.body;

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        companyId,
        billingAddressId,
        shippingAddressId,
        subtotal,
        taxAmount: taxAmount || 0,
        shippingAmount: shippingAmount || 0,
        discountAmount: discountAmount || 0,
        total,
        notes,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
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
            product: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });
  }

  // Update order (for future use)
  async updateOrder(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const updateData = req.body;

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new AppError(404, 'Order not found');
    }

    // Only allow updates for draft orders
    if (existingOrder.status !== 'DRAFT') {
      throw new AppError(400, 'Only draft orders can be updated');
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
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
            product: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully',
    });
  }

  // Delete order (for future use - only draft orders)
  async deleteOrder(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new AppError(404, 'Order not found');
    }

    // Only allow deleting draft orders
    if (existingOrder.status !== 'DRAFT') {
      throw new AppError(400, 'Only draft orders can be deleted');
    }

    await prisma.order.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Order deleted successfully',
    });
  }
}
