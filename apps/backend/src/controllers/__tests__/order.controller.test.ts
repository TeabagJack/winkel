import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OrderController } from '../order.controller.js';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
}));

describe('OrderController', () => {
  let orderController: OrderController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockPrisma: any;

  beforeEach(() => {
    orderController = new OrderController();
    mockPrisma = new PrismaClient();

    mockRequest = {
      query: {},
      params: {},
      body: {},
      user: {
        id: 'user-123',
        role: 'SUPER_ADMIN',
      },
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getOrders', () => {
    it('should return paginated orders with default parameters', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-000001',
          status: 'APPROVED',
          paymentStatus: 'PAID',
          total: 1000,
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          company: { id: 'company-1', name: 'Acme Corp' },
          _count: { items: 3 },
          createdAt: new Date(),
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      await orderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrders,
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should filter orders by status', async () => {
      mockRequest.query = { status: 'APPROVED' };
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await orderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'APPROVED' },
        })
      );
    });

    it('should search orders by multiple fields', async () => {
      mockRequest.query = { search: 'acme' };
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await orderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ orderNumber: { contains: 'acme', mode: 'insensitive' } }),
            ]),
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      mockRequest.query = { page: '2', pageSize: '10' };
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(25);

      await orderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: 2,
            pageSize: 10,
            total: 25,
            totalPages: 3,
          }),
        })
      );
    });
  });

  describe('getOrder', () => {
    it('should return order details by ID', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD-000001',
        status: 'APPROVED',
        paymentStatus: 'PAID',
        subtotal: 1000,
        total: 1100,
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        company: { id: 'company-1', name: 'Acme Corp', email: 'sales@acme.com' },
        items: [],
        billingAddress: {},
        shippingAddress: {},
      };

      mockRequest.params = { id: 'order-1' };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await orderController.getOrder(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: expect.objectContaining({
          user: expect.any(Object),
          company: expect.any(Object),
          items: expect.any(Object),
        }),
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });

    it('should throw error when order not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        orderController.getOrder(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Order not found');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const existingOrder = { id: 'order-1', status: 'APPROVED' };
      const updatedOrder = { ...existingOrder, status: 'SHIPPED' };

      mockRequest.params = { id: 'order-1' };
      mockRequest.body = { status: 'SHIPPED' };

      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      await orderController.updateOrderStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'SHIPPED' },
        include: expect.any(Object),
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully',
      });
    });

    it('should update payment status', async () => {
      const existingOrder = { id: 'order-1', paymentStatus: 'PENDING' };
      const updatedOrder = { ...existingOrder, paymentStatus: 'PAID' };

      mockRequest.params = { id: 'order-1' };
      mockRequest.body = { paymentStatus: 'PAID' };

      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      await orderController.updateOrderStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { paymentStatus: 'PAID' },
        include: expect.any(Object),
      });
    });

    it('should throw error when order not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { status: 'SHIPPED' };
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        orderController.updateOrderStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Order not found');
    });
  });

  describe('createOrder', () => {
    it('should create new order with auto-generated order number', async () => {
      const orderData = {
        userId: 'user-1',
        companyId: 'company-1',
        billingAddressId: 'addr-1',
        shippingAddressId: 'addr-2',
        subtotal: 1000,
        taxAmount: 80,
        shippingAmount: 20,
        total: 1100,
        items: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            name: 'Product 1',
            quantity: 2,
            unitPrice: 500,
            totalPrice: 1000,
          },
        ],
      };

      const createdOrder = {
        id: 'order-1',
        orderNumber: 'ORD-000001',
        ...orderData,
      };

      mockRequest.body = orderData;
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockResolvedValue(createdOrder);

      await orderController.createOrder(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.count).toHaveBeenCalled();
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderNumber: 'ORD-000001',
            userId: 'user-1',
            companyId: 'company-1',
          }),
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdOrder,
        message: 'Order created successfully',
      });
    });
  });

  describe('updateOrder', () => {
    it('should update draft order', async () => {
      const existingOrder = { id: 'order-1', status: 'DRAFT' };
      const updateData = { subtotal: 1500, total: 1650 };
      const updatedOrder = { ...existingOrder, ...updateData };

      mockRequest.params = { id: 'order-1' };
      mockRequest.body = updateData;

      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      await orderController.updateOrder(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: updateData,
        include: expect.any(Object),
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedOrder,
        message: 'Order updated successfully',
      });
    });

    it('should throw error when updating non-draft order', async () => {
      const existingOrder = { id: 'order-1', status: 'APPROVED' };

      mockRequest.params = { id: 'order-1' };
      mockRequest.body = { total: 1500 };
      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);

      await expect(
        orderController.updateOrder(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Only draft orders can be updated');
    });
  });

  describe('deleteOrder', () => {
    it('should delete draft order', async () => {
      const existingOrder = { id: 'order-1', status: 'DRAFT' };

      mockRequest.params = { id: 'order-1' };
      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.order.delete.mockResolvedValue(existingOrder);

      await orderController.deleteOrder(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order deleted successfully',
      });
    });

    it('should throw error when deleting non-draft order', async () => {
      const existingOrder = { id: 'order-1', status: 'SHIPPED' };

      mockRequest.params = { id: 'order-1' };
      mockPrisma.order.findUnique.mockResolvedValue(existingOrder);

      await expect(
        orderController.deleteOrder(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Only draft orders can be deleted');
    });

    it('should throw error when order not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        orderController.deleteOrder(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Order not found');
    });
  });
});
