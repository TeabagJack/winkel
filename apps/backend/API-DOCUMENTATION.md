# API Documentation - B2B E-commerce Platform

## Base URL
```
http://localhost:3001/api
```

## Authentication

All endpoints except login require authentication via JWT token.

### Headers
```
Authorization: Bearer <access_token>
```

### Roles
- **SUPER_ADMIN**: Full access to all endpoints
- **BUYER**: Limited access to buyer-specific endpoints
- **APPROVER**: Can approve orders

---

## Order Management APIs

### List Orders
```http
GET /api/orders
```

**Access**: `SUPER_ADMIN only`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page (max: 100) |
| search | string | - | Search by order number, customer name/email, company name |
| status | string | - | Filter by order status |
| paymentStatus | string | - | Filter by payment status |
| companyId | string | - | Filter by company ID |
| sortBy | string | createdAt | Field to sort by |
| sortOrder | string | desc | Sort order (asc/desc) |

**Order Status Values**:
- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `RETURNED`

**Payment Status Values**:
- `PENDING`
- `AUTHORIZED`
- `PAID`
- `PARTIALLY_PAID`
- `FAILED`
- `REFUNDED`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "orderNumber": "ORD-000001",
      "status": "APPROVED",
      "paymentStatus": "PAID",
      "total": 1100.00,
      "user": {
        "id": "clx...",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "company": {
        "id": "clx...",
        "name": "Acme Corp"
      },
      "_count": {
        "items": 3
      },
      "createdAt": "2025-11-19T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### Get Single Order
```http
GET /api/orders/:id
```

**Access**: `Authenticated`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Order ID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "orderNumber": "ORD-000001",
    "status": "APPROVED",
    "paymentStatus": "PAID",
    "subtotal": 1000.00,
    "taxAmount": 80.00,
    "shippingAmount": 20.00,
    "discountAmount": 0.00,
    "total": 1100.00,
    "notes": "Rush order",
    "user": {
      "id": "clx...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "company": {
      "id": "clx...",
      "name": "Acme Corp",
      "email": "sales@acme.com"
    },
    "billingAddress": {
      "id": "clx...",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "shippingAddress": {
      "id": "clx...",
      "street": "456 Oak Ave",
      "city": "Brooklyn",
      "state": "NY",
      "postalCode": "11201",
      "country": "USA"
    },
    "items": [
      {
        "id": "clx...",
        "sku": "PROD-001",
        "name": "Product Name",
        "quantity": 2,
        "unitPrice": 500.00,
        "totalPrice": 1000.00,
        "product": {
          "name": "Product Name",
          "imageUrl": "https://..."
        }
      }
    ],
    "createdAt": "2025-11-19T10:00:00.000Z",
    "updatedAt": "2025-11-19T11:00:00.000Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "status": "error",
  "message": "Order not found"
}
```

---

### Update Order Status
```http
PATCH /api/orders/:id/status
```

**Access**: `SUPER_ADMIN only`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Order ID |

**Request Body**:
```json
{
  "status": "SHIPPED",
  "paymentStatus": "PAID"
}
```

Both fields are optional. You can update one or both.

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "orderNumber": "ORD-000001",
    "status": "SHIPPED",
    "paymentStatus": "PAID",
    // ... other fields
  },
  "message": "Order status updated successfully"
}
```

---

### Create Order
```http
POST /api/orders
```

**Access**: `Authenticated`

**Request Body**:
```json
{
  "userId": "clx...",
  "companyId": "clx...",
  "billingAddressId": "clx...",
  "shippingAddressId": "clx...",
  "subtotal": 1000.00,
  "taxAmount": 80.00,
  "shippingAmount": 20.00,
  "discountAmount": 0.00,
  "total": 1100.00,
  "notes": "Optional notes",
  "items": [
    {
      "productId": "clx...",
      "sku": "PROD-001",
      "name": "Product Name",
      "quantity": 2,
      "unitPrice": 500.00,
      "totalPrice": 1000.00
    }
  ]
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "orderNumber": "ORD-000001",
    "status": "DRAFT",
    "paymentStatus": "PENDING",
    // ... order data with items
  },
  "message": "Order created successfully"
}
```

---

### Update Order
```http
PUT /api/orders/:id
```

**Access**: `Authenticated`

**Note**: Only DRAFT orders can be updated

**Request Body**:
```json
{
  "subtotal": 1500.00,
  "taxAmount": 120.00,
  "shippingAmount": 25.00,
  "total": 1645.00,
  "notes": "Updated notes"
}
```

---

### Delete Order
```http
DELETE /api/orders/:id
```

**Access**: `SUPER_ADMIN only`

**Note**: Only DRAFT orders can be deleted

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

---

## Company Management APIs

### List Companies
```http
GET /api/companies
```

**Access**: `SUPER_ADMIN only`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page |
| search | string | - | Search by name, legal name, email, tax ID |
| status | string | - | Filter by company status |
| sortBy | string | createdAt | Field to sort by |
| sortOrder | string | desc | Sort order (asc/desc) |

**Company Status Values**:
- `ACTIVE`
- `SUSPENDED`
- `PENDING_APPROVAL`
- `INACTIVE`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "phone": "+1234567890",
      "status": "ACTIVE",
      "paymentTerms": "NET_30",
      "creditLimit": 10000.00,
      "currentCredit": 8000.00,
      "_count": {
        "users": 5,
        "orders": 12
      },
      "createdAt": "2025-11-19T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

---

### Get Single Company
```http
GET /api/companies/:id
```

**Access**: `Authenticated`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "name": "Acme Corp",
    "legalName": "Acme Corporation Inc",
    "taxId": "TAX-123456",
    "email": "contact@acme.com",
    "phone": "+1234567890",
    "website": "https://acme.com",
    "status": "ACTIVE",
    "paymentTerms": "NET_30",
    "creditLimit": 10000.00,
    "currentCredit": 8000.00,
    "users": [
      {
        "id": "clx...",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@acme.com",
        "role": "BUYER",
        "isActive": true,
        "createdAt": "2025-11-19T10:00:00.000Z"
      }
    ],
    "addresses": [
      {
        "id": "clx...",
        "type": "BILLING",
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA",
        "isPrimary": true
      }
    ],
    "orders": [
      {
        "id": "clx...",
        "orderNumber": "ORD-000001",
        "status": "DELIVERED",
        "total": 1100.00,
        "createdAt": "2025-11-19T10:00:00.000Z"
      }
    ],
    "pricingTier": null,
    "createdAt": "2025-11-19T10:00:00.000Z",
    "updatedAt": "2025-11-19T11:00:00.000Z"
  }
}
```

---

### Create Company
```http
POST /api/companies
```

**Access**: `SUPER_ADMIN only`

**Request Body**:
```json
{
  "name": "New Corp",
  "legalName": "New Corporation Inc",
  "taxId": "TAX-789012",
  "email": "contact@newcorp.com",
  "phone": "+9876543210",
  "website": "https://newcorp.com",
  "paymentTerms": "NET_60",
  "creditLimit": 15000.00,
  "pricingTierId": "clx..."
}
```

**Required Fields**: `name`, `email`, `phone`

**Payment Terms Options**:
- `NET_30` (default)
- `NET_60`
- `NET_90`
- `IMMEDIATE`

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "name": "New Corp",
    "status": "PENDING_APPROVAL",
    "currentCredit": 15000.00,
    // ... other fields
    "_count": {
      "users": 0,
      "orders": 0
    }
  },
  "message": "Company created successfully"
}
```

**Error Response** (400 Bad Request):
```json
{
  "status": "error",
  "message": "Company with this Tax ID already exists"
}
```

---

### Update Company
```http
PUT /api/companies/:id
```

**Access**: `SUPER_ADMIN only`

**Request Body**:
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "paymentTerms": "NET_90"
}
```

All fields are optional.

---

### Update Company Status
```http
PATCH /api/companies/:id/status
```

**Access**: `SUPER_ADMIN only`

**Request Body**:
```json
{
  "status": "ACTIVE"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "ACTIVE",
    // ... other fields
  },
  "message": "Company status updated successfully"
}
```

---

### Update Credit Limit
```http
PATCH /api/companies/:id/credit-limit
```

**Access**: `SUPER_ADMIN only`

**Note**: This endpoint preserves the used credit amount when updating the limit.

**Credit Calculation**:
- Used Credit = Credit Limit - Current Credit
- New Current Credit = max(0, New Limit - Used Credit)

**Request Body**:
```json
{
  "creditLimit": 20000.00
}
```

**Example**:
- Current: `creditLimit: 10000, currentCredit: 8000`
- Used: `10000 - 8000 = 2000`
- Update to: `creditLimit: 15000`
- New current: `15000 - 2000 = 13000`

---

### Delete Company
```http
DELETE /api/companies/:id
```

**Access**: `SUPER_ADMIN only`

**Note**: Cannot delete companies with users or orders

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

**Error Responses** (400 Bad Request):
```json
{
  "status": "error",
  "message": "Cannot delete company with users. Please remove all users first."
}
```

```json
{
  "status": "error",
  "message": "Cannot delete company with orders. Please archive the company instead."
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "status": "error",
  "message": "Error description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Validation Errors
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "path": "body.email",
      "message": "Invalid email address"
    },
    {
      "path": "body.creditLimit",
      "message": "Credit limit must be non-negative"
    }
  ]
}
```

---

## Rate Limiting

**Limit**: 100 requests per 15 minutes per IP address

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

**Rate Limit Exceeded** (429):
```json
{
  "status": "error",
  "message": "Too many requests, please try again later."
}
```

---

## Examples

### Create Order with Items

**Request**:
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "clx...",
    "companyId": "clx...",
    "billingAddressId": "clx...",
    "shippingAddressId": "clx...",
    "subtotal": 2000.00,
    "taxAmount": 160.00,
    "shippingAmount": 40.00,
    "total": 2200.00,
    "items": [
      {
        "productId": "clx...",
        "sku": "PROD-001",
        "name": "Product 1",
        "quantity": 2,
        "unitPrice": 500.00,
        "totalPrice": 1000.00
      },
      {
        "productId": "clx...",
        "sku": "PROD-002",
        "name": "Product 2",
        "quantity": 1,
        "unitPrice": 1000.00,
        "totalPrice": 1000.00
      }
    ]
  }'
```

### Search and Filter Orders

**Request**:
```bash
curl -X GET "http://localhost:3001/api/orders?page=1&pageSize=10&search=acme&status=APPROVED&paymentStatus=PAID" \
  -H "Authorization: Bearer <token>"
```

### Update Order Status to Shipped

**Request**:
```bash
curl -X PATCH http://localhost:3001/api/orders/clx.../status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "SHIPPED", "paymentStatus": "PAID"}'
```

### Update Company Credit Limit

**Request**:
```bash
curl -X PATCH http://localhost:3001/api/companies/clx.../credit-limit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"creditLimit": 25000.00}'
```

---

## Postman Collection

Import the following into Postman for easy API testing:

[Download Postman Collection](./postman_collection.json) *(to be created)*

---

## Changelog

### v1.0.0 (2025-11-19)
- Initial release
- Order Management APIs (6 endpoints)
- Company Management APIs (7 endpoints)
- Authentication and authorization
- Pagination and filtering
- Comprehensive validation

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
**Endpoints**: 13 total
