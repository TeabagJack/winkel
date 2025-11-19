import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CompanyController } from '../company.controller.js';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    company: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
}));

describe('CompanyController', () => {
  let companyController: CompanyController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockPrisma: any;

  beforeEach(() => {
    companyController = new CompanyController();
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

  describe('getCompanies', () => {
    it('should return paginated companies with default parameters', async () => {
      const mockCompanies = [
        {
          id: 'company-1',
          name: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '+1234567890',
          status: 'ACTIVE',
          paymentTerms: 'NET_30',
          creditLimit: 10000,
          currentCredit: 8000,
          _count: { users: 5, orders: 12 },
          createdAt: new Date(),
        },
      ];

      mockPrisma.company.findMany.mockResolvedValue(mockCompanies);
      mockPrisma.company.count.mockResolvedValue(1);

      await companyController.getCompanies(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompanies,
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should filter companies by status', async () => {
      mockRequest.query = { status: 'ACTIVE' };
      mockPrisma.company.findMany.mockResolvedValue([]);
      mockPrisma.company.count.mockResolvedValue(0);

      await companyController.getCompanies(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        })
      );
    });

    it('should search companies by multiple fields', async () => {
      mockRequest.query = { search: 'acme' };
      mockPrisma.company.findMany.mockResolvedValue([]);
      mockPrisma.company.count.mockResolvedValue(0);

      await companyController.getCompanies(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'acme', mode: 'insensitive' } }),
              expect.objectContaining({ email: { contains: 'acme', mode: 'insensitive' } }),
            ]),
          }),
        })
      );
    });
  });

  describe('getCompany', () => {
    it('should return company details with relationships', async () => {
      const mockCompany = {
        id: 'company-1',
        name: 'Acme Corp',
        legalName: 'Acme Corporation Inc',
        taxId: 'TAX-123',
        email: 'contact@acme.com',
        phone: '+1234567890',
        website: 'https://acme.com',
        status: 'ACTIVE',
        paymentTerms: 'NET_30',
        creditLimit: 10000,
        currentCredit: 8000,
        users: [],
        addresses: [],
        orders: [],
        pricingTier: null,
      };

      mockRequest.params = { id: 'company-1' };
      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      await companyController.getCompany(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        include: expect.objectContaining({
          users: expect.any(Object),
          addresses: true,
          orders: expect.any(Object),
          pricingTier: true,
        }),
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompany,
      });
    });

    it('should throw error when company not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockPrisma.company.findUnique.mockResolvedValue(null);

      await expect(
        companyController.getCompany(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Company not found');
    });
  });

  describe('createCompany', () => {
    it('should create new company with valid data', async () => {
      const companyData = {
        name: 'New Corp',
        legalName: 'New Corporation Inc',
        taxId: 'TAX-456',
        email: 'contact@newcorp.com',
        phone: '+9876543210',
        website: 'https://newcorp.com',
        paymentTerms: 'NET_60',
        creditLimit: 15000,
      };

      const createdCompany = {
        id: 'company-new',
        ...companyData,
        status: 'PENDING_APPROVAL',
        currentCredit: 15000,
        _count: { users: 0, orders: 0 },
      };

      mockRequest.body = companyData;
      mockPrisma.company.findUnique.mockResolvedValue(null); // No duplicate tax ID
      mockPrisma.company.create.mockResolvedValue(createdCompany);

      await companyController.createCompany(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Corp',
          taxId: 'TAX-456',
          creditLimit: 15000,
          currentCredit: 15000,
        }),
        include: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdCompany,
        message: 'Company created successfully',
      });
    });

    it('should throw error when tax ID already exists', async () => {
      const companyData = {
        name: 'New Corp',
        taxId: 'TAX-456',
        email: 'contact@newcorp.com',
        phone: '+9876543210',
      };

      mockRequest.body = companyData;
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'existing', taxId: 'TAX-456' });

      await expect(
        companyController.createCompany(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Company with this Tax ID already exists');
    });

    it('should apply default values when not provided', async () => {
      const minimalData = {
        name: 'Minimal Corp',
        email: 'contact@minimal.com',
        phone: '+1111111111',
      };

      mockRequest.body = minimalData;
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.company.create.mockResolvedValue({ id: 'company-1', ...minimalData });

      await companyController.createCompany(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentTerms: 'NET_30',
            creditLimit: 0,
            currentCredit: 0,
          }),
        })
      );
    });
  });

  describe('updateCompany', () => {
    it('should update company with valid data', async () => {
      const existingCompany = {
        id: 'company-1',
        name: 'Old Name',
        taxId: 'TAX-123',
        email: 'old@example.com',
      };

      const updateData = {
        name: 'New Name',
        email: 'new@example.com',
      };

      const updatedCompany = {
        ...existingCompany,
        ...updateData,
      };

      mockRequest.params = { id: 'company-1' };
      mockRequest.body = updateData;

      mockPrisma.company.findUnique.mockResolvedValue(existingCompany);
      mockPrisma.company.update.mockResolvedValue(updatedCompany);

      await companyController.updateCompany(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: updateData,
        include: expect.any(Object),
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedCompany,
        message: 'Company updated successfully',
      });
    });

    it('should throw error when updating to duplicate tax ID', async () => {
      const existingCompany = {
        id: 'company-1',
        taxId: 'TAX-123',
      };

      mockRequest.params = { id: 'company-1' };
      mockRequest.body = { taxId: 'TAX-456' };

      mockPrisma.company.findUnique
        .mockResolvedValueOnce(existingCompany) // First call: find existing company
        .mockResolvedValueOnce({ id: 'other-company', taxId: 'TAX-456' }); // Second call: find duplicate

      await expect(
        companyController.updateCompany(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Company with this Tax ID already exists');
    });
  });

  describe('updateCompanyStatus', () => {
    it('should update company status', async () => {
      const existingCompany = { id: 'company-1', status: 'PENDING_APPROVAL' };
      const updatedCompany = { ...existingCompany, status: 'ACTIVE' };

      mockRequest.params = { id: 'company-1' };
      mockRequest.body = { status: 'ACTIVE' };

      mockPrisma.company.findUnique.mockResolvedValue(existingCompany);
      mockPrisma.company.update.mockResolvedValue(updatedCompany);

      await companyController.updateCompanyStatus(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { status: 'ACTIVE' },
        include: expect.any(Object),
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedCompany,
        message: 'Company status updated successfully',
      });
    });
  });

  describe('deleteCompany', () => {
    it('should delete company without users or orders', async () => {
      const existingCompany = {
        id: 'company-1',
        _count: { users: 0, orders: 0 },
      };

      mockRequest.params = { id: 'company-1' };
      mockPrisma.company.findUnique.mockResolvedValue(existingCompany);
      mockPrisma.company.delete.mockResolvedValue(existingCompany);

      await companyController.deleteCompany(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPrisma.company.delete).toHaveBeenCalledWith({
        where: { id: 'company-1' },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Company deleted successfully',
      });
    });

    it('should throw error when company has users', async () => {
      const existingCompany = {
        id: 'company-1',
        _count: { users: 3, orders: 0 },
      };

      mockRequest.params = { id: 'company-1' };
      mockPrisma.company.findUnique.mockResolvedValue(existingCompany);

      await expect(
        companyController.deleteCompany(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Cannot delete company with users');
    });

    it('should throw error when company has orders', async () => {
      const existingCompany = {
        id: 'company-1',
        _count: { users: 0, orders: 5 },
      };

      mockRequest.params = { id: 'company-1' };
      mockPrisma.company.findUnique.mockResolvedValue(existingCompany);

      await expect(
        companyController.deleteCompany(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Cannot delete company with orders');
    });
  });

  describe('updateCreditLimit', () => {
    it('should update credit limit and preserve used credit', async () => {
      const existingCompany = {
        id: 'company-1',
        creditLimit: 10000,
        currentCredit: 8000,
      };
      // Used credit = 10000 - 8000 = 2000
      // New limit = 15000
      // New current credit = 15000 - 2000 = 13000

      const updatedCompany = {
        ...existingCompany,
        creditLimit: 15000,
        currentCredit: 13000,
      };

      mockRequest.params = { id: 'company-1' };
      mockRequest.body = { creditLimit: 15000 };

      mockPrisma.company.findUnique.mockResolvedValue(existingCompany);
      mockPrisma.company.update.mockResolvedValue(updatedCompany);

      await companyController.updateCreditLimit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          creditLimit: 15000,
          currentCredit: 13000,
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedCompany,
        message: 'Credit limit updated successfully',
      });
    });

    it('should handle credit limit lower than used credit', async () => {
      const existingCompany = {
        id: 'company-1',
        creditLimit: 10000,
        currentCredit: 3000,
      };
      // Used credit = 10000 - 3000 = 7000
      // New limit = 5000
      // New current credit = max(0, 5000 - 7000) = 0

      mockRequest.params = { id: 'company-1' };
      mockRequest.body = { creditLimit: 5000 };

      mockPrisma.company.findUnique.mockResolvedValue(existingCompany);
      mockPrisma.company.update.mockResolvedValue({});

      await companyController.updateCreditLimit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          creditLimit: 5000,
          currentCredit: 0,
        },
      });
    });
  });
});
