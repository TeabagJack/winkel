import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';

const prisma = new PrismaClient();

export class ProductController {
  // Get all products with pagination and filters
  async getProducts(req: AuthRequest, res: Response): Promise<void> {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      categoryId = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (status) {
      where.status = status as string;
    }

    // Get products and total count
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          category: true,
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: {
            where: { isActive: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    });
  }

  // Get single product by ID
  async getProduct(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
        pricingRules: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    res.json({ data: product });
  }

  // Create new product
  async createProduct(req: AuthRequest, res: Response): Promise<void> {
    const {
      sku,
      name,
      description,
      shortDescription,
      categoryId,
      basePrice,
      compareAtPrice,
      cost,
      quantity,
      lowStockAlert,
      trackInventory = true,
      allowBackorder = false,
      weight,
      weightUnit,
      dimensions,
      metaTitle,
      metaDescription,
      images = [],
      isActive = true,
      isFeatured = false,
    } = req.body;

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      throw new AppError(400, 'Product with this SKU already exists');
    }

    // Create product with images
    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        shortDescription,
        categoryId,
        basePrice,
        compareAtPrice,
        cost,
        quantity: quantity || 0,
        lowStockAlert,
        trackInventory,
        allowBackorder,
        weight,
        weightUnit,
        dimensions,
        metaTitle,
        metaDescription,
        isActive,
        isFeatured,
        status: quantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
        images: {
          create: images.map((img: any, index: number) => ({
            url: img.url,
            altText: img.altText || name,
            sortOrder: index,
          })),
        },
      },
      include: {
        category: true,
        images: true,
      },
    });

    res.status(201).json({
      message: 'Product created successfully',
      data: product,
    });
  }

  // Update product
  async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new AppError(404, 'Product not found');
    }

    // If SKU is being updated, check uniqueness
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: updateData.sku },
      });

      if (skuExists) {
        throw new AppError(400, 'Product with this SKU already exists');
      }
    }

    // Handle images update
    if (updateData.images) {
      // Delete existing images
      await prisma.productImage.deleteMany({
        where: { productId: id },
      });

      // Create new images
      await prisma.productImage.createMany({
        data: updateData.images.map((img: any, index: number) => ({
          productId: id,
          url: img.url,
          altText: img.altText || updateData.name || existingProduct.name,
          sortOrder: index,
        })),
      });

      delete updateData.images;
    }

    // Update product status based on quantity
    if (updateData.quantity !== undefined) {
      if (updateData.quantity === 0) {
        updateData.status = 'OUT_OF_STOCK';
      } else if (existingProduct.status === 'OUT_OF_STOCK') {
        updateData.status = 'ACTIVE';
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    res.json({
      message: 'Product updated successfully',
      data: product,
    });
  }

  // Delete product
  async deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    // Soft delete by setting inactive
    await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        status: 'DISCONTINUED',
      },
    });

    res.json({
      message: 'Product deleted successfully',
    });
  }

  // Bulk update inventory
  async bulkUpdateInventory(req: AuthRequest, res: Response): Promise<void> {
    const { updates } = req.body; // Array of { id, quantity }

    const results = await Promise.all(
      updates.map(async (update: { id: string; quantity: number }) => {
        return prisma.product.update({
          where: { id: update.id },
          data: {
            quantity: update.quantity,
            status: update.quantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
          },
        });
      })
    );

    res.json({
      message: 'Inventory updated successfully',
      data: results,
    });
  }
}
