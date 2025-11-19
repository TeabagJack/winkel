import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';

const prisma = new PrismaClient();

export class CompanyController {
  // Get all companies with pagination and filters
  async getCompanies(req: AuthRequest, res: Response): Promise<void> {
    const {
      page = '1',
      pageSize = '20',
      search = '',
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
        { legalName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { taxId: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    // Get companies and total count
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          _count: {
            select: {
              users: true,
              orders: true,
            },
          },
        },
      }),
      prisma.company.count({ where }),
    ]);

    res.json({
      success: true,
      data: companies,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  }

  // Get single company by ID
  async getCompany(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        addresses: true,
        orders: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        pricingTier: true,
      },
    });

    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    res.json({
      success: true,
      data: company,
    });
  }

  // Create company
  async createCompany(req: AuthRequest, res: Response): Promise<void> {
    const {
      name,
      legalName,
      taxId,
      email,
      phone,
      website,
      paymentTerms,
      creditLimit,
      pricingTierId,
    } = req.body;

    // Check if taxId already exists (if provided)
    if (taxId) {
      const existingCompany = await prisma.company.findUnique({
        where: { taxId },
      });

      if (existingCompany) {
        throw new AppError(400, 'Company with this Tax ID already exists');
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        legalName,
        taxId,
        email,
        phone,
        website,
        paymentTerms: paymentTerms || 'NET_30',
        creditLimit: creditLimit || 0,
        currentCredit: creditLimit || 0,
        pricingTierId,
      },
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: company,
      message: 'Company created successfully',
    });
  }

  // Update company
  async updateCompany(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const updateData = req.body;

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new AppError(404, 'Company not found');
    }

    // If updating taxId, check for duplicates
    if (updateData.taxId && updateData.taxId !== existingCompany.taxId) {
      const duplicateCompany = await prisma.company.findUnique({
        where: { taxId: updateData.taxId },
      });

      if (duplicateCompany) {
        throw new AppError(400, 'Company with this Tax ID already exists');
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedCompany,
      message: 'Company updated successfully',
    });
  }

  // Update company status
  async updateCompanyStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new AppError(404, 'Company not found');
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: { status },
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedCompany,
      message: 'Company status updated successfully',
    });
  }

  // Delete company
  async deleteCompany(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
          },
        },
      },
    });

    if (!existingCompany) {
      throw new AppError(404, 'Company not found');
    }

    // Check if company has users or orders
    if (existingCompany._count.users > 0) {
      throw new AppError(400, 'Cannot delete company with users. Please remove all users first.');
    }

    if (existingCompany._count.orders > 0) {
      throw new AppError(400, 'Cannot delete company with orders. Please archive the company instead.');
    }

    await prisma.company.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  }

  // Update company credit limit
  async updateCreditLimit(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { creditLimit } = req.body;

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new AppError(404, 'Company not found');
    }

    // Calculate new current credit (maintain the same used credit amount)
    const usedCredit = Number(existingCompany.creditLimit) - Number(existingCompany.currentCredit);
    const newCurrentCredit = Math.max(0, creditLimit - usedCredit);

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        creditLimit,
        currentCredit: newCurrentCredit,
      },
    });

    res.json({
      success: true,
      data: updatedCompany,
      message: 'Credit limit updated successfully',
    });
  }
}
