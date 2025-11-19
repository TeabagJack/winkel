# B2B E-commerce Platform - Developer Guide

## Welcome

This guide will help you get started with the B2B E-commerce Platform API. Our REST API allows you to programmatically access and manage products, orders, customers, and more.

## Quick Start

### 1. Get API Access

Contact your administrator to create an API account with the appropriate role:
- **SUPER_ADMIN**: Full access to all endpoints
- **BUYER**: Can create orders, view products
- **APPROVER**: Can approve orders

### 2. Obtain Access Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "your-email@example.com",
      "role": "SUPER_ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Make Your First API Call

```bash
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## API Documentation

### Interactive Documentation

Visit `http://localhost:3001/api-docs` for interactive API documentation powered by Swagger UI. You can:
- Explore all available endpoints
- Try API calls directly from your browser
- View request/response schemas
- See code examples

### OpenAPI Specification

Download the OpenAPI 3.0 specification:
```bash
curl http://localhost:3001/api-docs.json > openapi.json
```

## Authentication

All API requests (except login/register) require authentication via JWT tokens.

### Include Token in Requests

Add the access token to the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

### Token Expiration

- Access tokens expire after 1 hour
- Refresh tokens expire after 7 days
- Use the refresh endpoint to get a new access token

### Refresh Token

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

## Base URL

**Development:** `http://localhost:3001`
**Production:** `https://api.example.com`

All endpoints are prefixed with `/api`

## Common Patterns

### Pagination

List endpoints support pagination:

```bash
GET /api/products?page=1&pageSize=20
```

Query Parameters:
- `page` (default: 1): Page number
- `pageSize` (default: 20): Items per page

Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Filtering

Most list endpoints support filtering:

```bash
GET /api/products?search=chair&categoryId=clx...&status=ACTIVE
```

### Sorting

Control sort order with query parameters:

```bash
GET /api/products?sortBy=createdAt&sortOrder=desc
```

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "status": "error",
  "message": "Error description"
}
```

### Validation Errors

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "path": "body.email",
      "message": "Invalid email address"
    }
  ]
}
```

## Rate Limiting

API requests are limited to:
- **100 requests per 15 minutes** per IP address

When rate limited, you'll receive a `429 Too Many Requests` response with headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700000000
```

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';
let accessToken = '';

// Login
async function login() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: 'user@example.com',
    password: 'password123',
  });
  accessToken = response.data.data.accessToken;
  return accessToken;
}

// Get products
async function getProducts() {
  const response = await axios.get(`${API_BASE_URL}/products`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      page: 1,
      pageSize: 20,
    },
  });
  return response.data.data;
}

// Create product
async function createProduct(productData) {
  const response = await axios.post(
    `${API_BASE_URL}/products`,
    productData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data.data;
}

// Usage
(async () => {
  await login();
  const products = await getProducts();
  console.log(products);
})();
```

### Python

```python
import requests

API_BASE_URL = 'http://localhost:3001/api'

class B2BAPI:
    def __init__(self):
        self.access_token = None

    def login(self, email, password):
        response = requests.post(
            f'{API_BASE_URL}/auth/login',
            json={'email': email, 'password': password}
        )
        data = response.json()
        self.access_token = data['data']['accessToken']
        return self.access_token

    def get_headers(self):
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

    def get_products(self, page=1, page_size=20):
        response = requests.get(
            f'{API_BASE_URL}/products',
            headers=self.get_headers(),
            params={'page': page, 'pageSize': page_size}
        )
        return response.json()['data']

    def create_product(self, product_data):
        response = requests.post(
            f'{API_BASE_URL}/products',
            headers=self.get_headers(),
            json=product_data
        )
        return response.json()['data']

# Usage
api = B2BAPI()
api.login('user@example.com', 'password123')
products = api.get_products()
print(products)
```

### cURL

```bash
# Set variables
API_BASE_URL="http://localhost:3001/api"
EMAIL="user@example.com"
PASSWORD="password123"

# Login and extract token
TOKEN=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.data.accessToken')

# Get products
curl -X GET "$API_BASE_URL/products?page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN"

# Create product
curl -X POST "$API_BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD-001",
    "name": "Office Chair",
    "description": "Ergonomic office chair",
    "categoryId": "clx...",
    "basePrice": 299.99,
    "quantity": 50
  }'
```

## SDKs

### Official SDKs

We provide official SDKs for:
- Node.js/TypeScript
- Python
- PHP (coming soon)
- Ruby (coming soon)

### Community SDKs

Check our [GitHub repository](https://github.com/example/b2b-api-sdks) for community-contributed SDKs.

## Webhooks

Subscribe to real-time events via webhooks. See [WEBHOOKS.md](./WEBHOOKS.md) for details.

Supported events:
- `order.created`
- `order.updated`
- `order.shipped`
- `order.delivered`
- `product.created`
- `product.updated`
- `inventory.low_stock`

## Best Practices

### 1. Cache Responses

Cache responses when appropriate to reduce API calls:
```javascript
const cache = new Map();

async function getCachedProduct(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  const product = await getProduct(id);
  cache.set(id, product);
  return product;
}
```

### 2. Handle Rate Limits

Implement exponential backoff for rate limit errors:
```javascript
async function apiCall(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      const delay = Math.pow(2, 4 - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiCall(fn, retries - 1);
    }
    throw error;
  }
}
```

### 3. Use Bulk Endpoints

For multiple operations, use bulk endpoints when available:
```bash
# Instead of multiple single updates
POST /api/products/bulk/inventory
{
  "updates": [
    { "id": "clx1...", "quantity": 100 },
    { "id": "clx2...", "quantity": 50 }
  ]
}
```

### 4. Validate Before Sending

Validate data client-side before API calls to reduce errors:
```javascript
function validateProduct(product) {
  if (!product.sku || product.sku.length < 3) {
    throw new Error('SKU must be at least 3 characters');
  }
  if (!product.basePrice || product.basePrice <= 0) {
    throw new Error('Base price must be positive');
  }
  // ... more validation
}
```

### 5. Secure Your Tokens

- Never commit tokens to version control
- Store tokens securely (environment variables, secure vaults)
- Rotate tokens regularly
- Use separate tokens for different environments

## Support

### Documentation
- API Docs: `http://localhost:3001/api-docs`
- Developer Guide: This document
- Authentication Guide: [AUTHENTICATION.md](./AUTHENTICATION.md)

### Contact
- Email: api@example.com
- GitHub Issues: [github.com/example/b2b-api/issues](https://github.com/example/b2b-api/issues)
- Developer Forum: [forum.example.com](https://forum.example.com)

### Status Page
Check API status: [status.example.com](https://status.example.com)

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for API updates and breaking changes.

## License

This API is proprietary. See [LICENSE](../LICENSE) for terms of use.

---

**Last Updated:** 2025-11-19
**API Version:** 1.0.0
