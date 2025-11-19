import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'B2B E-commerce Platform API',
      version: '1.0.0',
      description: `
        Complete API documentation for the B2B E-commerce Platform.

        ## Features
        - Product Management
        - Category Management
        - Order Management
        - Company/Customer Management
        - User Authentication & Authorization
        - Image Upload & Management

        ## Authentication
        Most endpoints require JWT authentication. Include the access token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your_access_token>
        \`\`\`

        ## Rate Limiting
        API requests are limited to 100 requests per 15 minutes per IP address.

        ## Pagination
        List endpoints support pagination with \`page\` and \`pageSize\` query parameters.
        Default: page=1, pageSize=20
      `,
      contact: {
        name: 'API Support',
        email: 'api@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'An error occurred',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Validation failed',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    example: 'body.email',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email address',
                  },
                },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {},
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  example: 1,
                },
                pageSize: {
                  type: 'number',
                  example: 20,
                },
                total: {
                  type: 'number',
                  example: 100,
                },
                totalPages: {
                  type: 'number',
                  example: 5,
                },
              },
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx123...',
            },
            sku: {
              type: 'string',
              example: 'PROD-001',
            },
            name: {
              type: 'string',
              example: 'Premium Office Chair',
            },
            description: {
              type: 'string',
              example: 'Ergonomic office chair with lumbar support',
            },
            shortDescription: {
              type: 'string',
              example: 'Comfortable ergonomic chair',
            },
            categoryId: {
              type: 'string',
              example: 'clx456...',
            },
            basePrice: {
              type: 'number',
              format: 'decimal',
              example: 299.99,
            },
            compareAtPrice: {
              type: 'number',
              format: 'decimal',
              example: 399.99,
            },
            cost: {
              type: 'number',
              format: 'decimal',
              example: 150.00,
            },
            quantity: {
              type: 'number',
              example: 50,
            },
            lowStockAlert: {
              type: 'number',
              example: 10,
            },
            trackInventory: {
              type: 'boolean',
              example: true,
            },
            allowBackorder: {
              type: 'boolean',
              example: false,
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK'],
              example: 'ACTIVE',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            isFeatured: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            category: {
              $ref: '#/components/schemas/Category',
            },
            images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductImage',
              },
            },
          },
        },
        ProductImage: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            url: {
              type: 'string',
              example: '/uploads/image.jpg',
            },
            altText: {
              type: 'string',
              example: 'Product image',
            },
            isPrimary: {
              type: 'boolean',
              example: true,
            },
            sortOrder: {
              type: 'number',
              example: 0,
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
              example: 'Office Furniture',
            },
            slug: {
              type: 'string',
              example: 'office-furniture',
            },
            description: {
              type: 'string',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            orderNumber: {
              type: 'string',
              example: 'ORD-000001',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'],
            },
            paymentStatus: {
              type: 'string',
              enum: ['PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'],
            },
            subtotal: {
              type: 'number',
              format: 'decimal',
            },
            taxAmount: {
              type: 'number',
              format: 'decimal',
            },
            shippingAmount: {
              type: 'number',
              format: 'decimal',
            },
            discountAmount: {
              type: 'number',
              format: 'decimal',
            },
            total: {
              type: 'number',
              format: 'decimal',
            },
            notes: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Company: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
              example: 'Acme Corp',
            },
            legalName: {
              type: 'string',
              example: 'Acme Corporation Inc',
            },
            taxId: {
              type: 'string',
              example: 'TAX-123456',
            },
            email: {
              type: 'string',
              example: 'contact@acme.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            website: {
              type: 'string',
              example: 'https://acme.com',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'INACTIVE'],
            },
            paymentTerms: {
              type: 'string',
              enum: ['NET_30', 'NET_60', 'NET_90', 'IMMEDIATE'],
            },
            creditLimit: {
              type: 'number',
              format: 'decimal',
            },
            currentCredit: {
              type: 'number',
              format: 'decimal',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            email: {
              type: 'string',
              example: 'user@example.com',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            role: {
              type: 'string',
              enum: ['SUPER_ADMIN', 'BUYER', 'APPROVER'],
            },
            isActive: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Unauthorized',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Forbidden',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Resource not found',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Products',
        description: 'Product management endpoints',
      },
      {
        name: 'Categories',
        description: 'Category management endpoints',
      },
      {
        name: 'Orders',
        description: 'Order management endpoints',
      },
      {
        name: 'Companies',
        description: 'Company/Customer management endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
