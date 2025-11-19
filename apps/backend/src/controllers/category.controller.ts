import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';

const prisma = new PrismaClient();

export class CategoryController {
  // Get all categories (with hierarchy)
  async getCategories(req: AuthRequest, res: Response): Promise<void> {
    const { includeInactive = 'false' } = req.query;

    const where: any = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          where: includeInactive !== 'true' ? { isActive: true } : {},
          include: {
            children: true,
          },
        },
        parent: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ data: categories });
  }

  // Get single category
  async getCategory(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        products: {
          where: { isActive: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    res.json({ data: category });
  }

  // Create category
  async createCategory(req: AuthRequest, res: Response): Promise<void> {
    const { name, slug, description, image, parentId, sortOrder = 0, isActive = true } = req.body;

    // Check if slug exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new AppError(400, 'Category with this slug already exists');
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        parentId,
        sortOrder,
        isActive,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    res.status(201).json({
      message: 'Category created successfully',
      data: category,
    });
  }

  // Update category
  async updateCategory(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const updateData = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new AppError(404, 'Category not found');
    }

    // Check slug uniqueness if being updated
    if (updateData.slug && updateData.slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug: updateData.slug },
      });

      if (slugExists) {
        throw new AppError(400, 'Category with this slug already exists');
      }
    }

    // Prevent category from being its own parent
    if (updateData.parentId === id) {
      throw new AppError(400, 'Category cannot be its own parent');
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });

    res.json({
      message: 'Category updated successfully',
      data: category,
    });
  }

  // Delete category
  async deleteCategory(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    if (category._count.products > 0) {
      throw new AppError(400, 'Cannot delete category with products. Move or delete products first.');
    }

    if (category._count.children > 0) {
      throw new AppError(400, 'Cannot delete category with subcategories. Delete subcategories first.');
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({
      message: 'Category deleted successfully',
    });
  }
}
