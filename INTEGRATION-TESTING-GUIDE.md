# Integration Testing Guide - B2B E-commerce Platform

## Overview

This guide will walk you through testing the complete B2B e-commerce platform end-to-end, including backend APIs, frontend UI, and all workflows.

## Pre-requisites Checklist

### Required Services
- [ ] PostgreSQL running (port 5432)
- [ ] Redis/Dragonfly running (port 6379) - optional for session management
- [ ] Node.js installed (v18+)
- [ ] npm packages installed

### Environment Setup

**Backend** (`apps/backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/winkel_db"
REDIS_URL="redis://localhost:6379"

JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`apps/frontend/.env`):
```env
VITE_API_URL=http://localhost:3001/api
```

### Database Setup

```bash
# Navigate to backend
cd apps/backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database (if seed file exists)
npm run db:seed
```

---

## Starting the Services

### Terminal 1: Backend Server

```bash
cd apps/backend
npm run dev
```

**Expected Output:**
```
Server running on port 3001
Environment: development
Database connected successfully
```

**Health Check:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Terminal 2: Frontend Dev Server

```bash
cd apps/frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Browser Check:**
- Open http://localhost:5173
- Should see login page

---

## Testing Workflows

### 1. Authentication Flow

#### Test Login
**URL:** http://localhost:5173/login

**Test Cases:**

1. **Invalid Credentials**
   - Email: `wrong@example.com`
   - Password: `wrongpassword`
   - **Expected:** Error toast "Invalid credentials"

2. **Valid Super Admin Login**
   - Email: `admin@example.com` (or from your seed data)
   - Password: `admin123` (or from your seed data)
   - **Expected:**
     - Toast: "Login successful"
     - Redirect to `/admin/dashboard`
     - User name displayed in sidebar

3. **Token Persistence**
   - Refresh page
   - **Expected:** Still logged in, no redirect to login

4. **Logout**
   - Click logout button in sidebar
   - **Expected:** Redirect to `/login`

**API Test:**
```bash
# Login to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Save the accessToken from response
TOKEN="<paste-token-here>"

# Test authenticated endpoint
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. Product Management Workflow

#### Test Product List
**URL:** http://localhost:5173/admin/products

**Test Cases:**

1. **View Products List**
   - **Expected:**
     - Table with products
     - Search bar
     - "Add Product" button
     - Pagination controls (if > 20 products)

2. **Search Products**
   - Type in search bar
   - **Expected:** Products filter in real-time

3. **Status Badges**
   - **Expected:** Color-coded badges (Active, Out of Stock, etc.)

#### Test Product Creation
**Click:** "Add Product" button

**Test Case 1: Validation**
- Leave all fields empty
- Click "Create Product"
- **Expected:** Validation errors displayed

**Test Case 2: Successful Creation**
- Fill in form:
  - Name: "Test Product 1"
  - SKU: "TEST-001"
  - Description: "Test description"
  - Category: Select one
  - Price: 100.00
  - MSRP: 150.00
  - Stock: 50
  - Reorder Level: 10
  - Status: Active
- Click "Create Product"
- **Expected:**
  - Toast: "Product created successfully"
  - Redirect to product list
  - New product appears in list

#### Test Product Edit
1. Click Edit icon on a product
2. **Expected:** Form pre-populated with product data
3. Change name to "Updated Product Name"
4. Click "Update Product"
5. **Expected:**
   - Toast: "Product updated successfully"
   - Redirect to list
   - Updated name visible

#### Test Product Delete
1. Click Delete icon on a product
2. **Expected:** Confirmation dialog
3. Click Confirm
4. **Expected:**
   - Toast: "Product deleted successfully"
   - Product removed from list

**API Tests:**
```bash
# List products
curl -X GET "http://localhost:3001/api/products?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"

# Create product
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Product",
    "sku": "API-001",
    "description": "Created via API",
    "categoryId": "<category-id>",
    "price": 99.99,
    "msrp": 129.99,
    "stockQuantity": 100,
    "reorderLevel": 20,
    "status": "ACTIVE"
  }'

# Get single product
curl -X GET "http://localhost:3001/api/products/<product-id>" \
  -H "Authorization: Bearer $TOKEN"

# Update product
curl -X PUT "http://localhost:3001/api/products/<product-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 89.99}'

# Delete product
curl -X DELETE "http://localhost:3001/api/products/<product-id>" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. Category Management Workflow

#### Test Category List
**URL:** http://localhost:5173/admin/categories

**Test Cases:**

1. **View Hierarchical Tree**
   - **Expected:**
     - Categories displayed in tree structure
     - Expand/collapse icons for categories with children
     - Product count and subcategory count

2. **Expand/Collapse Categories**
   - Click expand icon
   - **Expected:** Subcategories shown with indentation
   - Click collapse icon
   - **Expected:** Subcategories hidden

3. **Search Categories**
   - Type in search
   - **Expected:** Matching categories shown

#### Test Category Creation
**Click:** "Add Category" button

**Test Case 1: Root Category**
- Name: "Electronics"
- Slug: "electronics" (auto-generated)
- Description: "Electronic products"
- Parent: None
- Active: Yes
- Click "Create Category"
- **Expected:**
  - Toast: "Category created successfully"
  - New category in list

**Test Case 2: Subcategory**
- Name: "Laptops"
- Parent: Select "Electronics"
- Click "Create Category"
- **Expected:**
  - Created under Electronics
  - Shown as child when Electronics is expanded

**Test Case 3: Slug Validation**
- Try to create with uppercase in slug
- **Expected:** Validation error

#### Test Category Edit
1. Click Edit on a category
2. Change name
3. Update
4. **Expected:** Changes reflected in list

#### Test Category Delete
**Test Case 1: Category with Products**
- Try to delete category with products
- **Expected:** Error: "Category has products"

**Test Case 2: Category with Subcategories**
- Try to delete category with children
- **Expected:** Error: "Category has subcategories"

**Test Case 3: Empty Category**
- Delete empty category
- **Expected:** Successfully deleted

**API Tests:**
```bash
# List categories
curl -X GET http://localhost:3001/api/categories \
  -H "Authorization: Bearer $TOKEN"

# Create category
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Office Supplies",
    "slug": "office-supplies",
    "description": "Office and stationery products",
    "parentId": null,
    "isActive": true
  }'

# Create subcategory
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pens",
    "slug": "pens",
    "parentId": "<parent-category-id>",
    "isActive": true
  }'
```

---

### 4. Order Management Workflow

#### Test Order List
**URL:** http://localhost:5173/admin/orders

**Test Cases:**

1. **View Orders**
   - **Expected:**
     - Table with orders
     - Order number, customer, company, status, total
     - Filter by status and payment status
     - Search functionality

2. **Filter by Status**
   - Select "Approved" from order status filter
   - **Expected:** Only approved orders shown

3. **Search Orders**
   - Search by order number or customer name
   - **Expected:** Matching orders displayed

4. **Pagination**
   - If more than 20 orders
   - **Expected:** Page controls work

#### Test Order Details
**Click:** Eye icon on an order

**Expected to See:**
- ✅ Order number and creation date
- ✅ Order status and payment status dropdowns
- ✅ Customer information (name, email)
- ✅ Company information
- ✅ Billing address
- ✅ Shipping address
- ✅ Order items table (SKU, quantity, prices)
- ✅ Pricing breakdown (subtotal, tax, shipping, total)
- ✅ Order notes (if any)

#### Test Status Updates
1. Change order status dropdown (e.g., from APPROVED to SHIPPED)
2. **Expected:**
   - Status updates immediately
   - Toast: "Order status updated successfully"

3. Change payment status (e.g., from PENDING to PAID)
4. **Expected:**
   - Payment status updates
   - Toast notification

**API Tests:**
```bash
# List orders with filters
curl -X GET "http://localhost:3001/api/orders?status=APPROVED&paymentStatus=PAID&page=1" \
  -H "Authorization: Bearer $TOKEN"

# Get order details
curl -X GET "http://localhost:3001/api/orders/<order-id>" \
  -H "Authorization: Bearer $TOKEN"

# Update order status
curl -X PATCH "http://localhost:3001/api/orders/<order-id>/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "SHIPPED", "paymentStatus": "PAID"}'
```

---

### 5. Customer Management Workflow

#### Test Customer List
**URL:** http://localhost:5173/admin/customers

**Test Cases:**

1. **View Companies**
   - **Expected:**
     - Table with companies
     - Name, email, phone, status, payment terms
     - Credit limit and available credit
     - User count and order count

2. **Credit Limit Indicators**
   - **Expected:**
     - Red text when credit < 20% of limit
     - Normal text otherwise

3. **Filter by Status**
   - Select "Active" from status filter
   - **Expected:** Only active companies shown

4. **Search Companies**
   - Search by company name
   - **Expected:** Matching companies displayed

#### Test Customer Details
**Click:** Eye icon on a company

**Expected to See:**
- ✅ Company information (name, legal name, tax ID, email, phone, website)
- ✅ Status dropdown (can update)
- ✅ Credit & Payment card
  - Payment terms (NET_30, etc.)
  - Credit limit
  - Available credit
  - Credit usage progress bar (with warning if > 80%)
- ✅ Quick stats (total users, total orders)
- ✅ Users table (all users in company)
- ✅ Addresses (billing, shipping)
- ✅ Recent orders (last 10)

#### Test Status Update
1. Change company status dropdown (e.g., ACTIVE to SUSPENDED)
2. **Expected:**
   - Status updates
   - Toast: "Company status updated successfully"

#### Test Navigation
1. Click "View" on an order in Recent Orders
2. **Expected:** Navigate to order details page
3. Click back
4. **Expected:** Return to customer details

**API Tests:**
```bash
# List companies
curl -X GET "http://localhost:3001/api/companies?status=ACTIVE&page=1" \
  -H "Authorization: Bearer $TOKEN"

# Get company details
curl -X GET "http://localhost:3001/api/companies/<company-id>" \
  -H "Authorization: Bearer $TOKEN"

# Update company status
curl -X PATCH "http://localhost:3001/api/companies/<company-id>/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "SUSPENDED"}'

# Update credit limit
curl -X PATCH "http://localhost:3001/api/companies/<company-id>/credit-limit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"creditLimit": 25000.00}'
```

---

## Complete Testing Checklist

### Backend Health
- [ ] Backend server starts without errors
- [ ] Database connection successful
- [ ] Health endpoint responds (`/health`)
- [ ] API endpoints respond correctly

### Authentication
- [ ] Login page loads
- [ ] Can log in with valid credentials
- [ ] Cannot log in with invalid credentials
- [ ] Token stored in localStorage
- [ ] Protected routes redirect to login when not authenticated
- [ ] Logout works correctly

### Product Management
- [ ] Products list loads
- [ ] Can search products
- [ ] Can create new product
- [ ] Can edit product
- [ ] Can delete product
- [ ] Validation works
- [ ] Status badges display correctly

### Category Management
- [ ] Categories display in hierarchical tree
- [ ] Can expand/collapse categories
- [ ] Can create root category
- [ ] Can create subcategory
- [ ] Can edit category
- [ ] Cannot delete category with products
- [ ] Cannot delete category with subcategories
- [ ] Can delete empty category
- [ ] Slug auto-generation works
- [ ] Search works

### Order Management
- [ ] Orders list loads
- [ ] Can filter by order status
- [ ] Can filter by payment status
- [ ] Can search orders
- [ ] Order details page loads
- [ ] Can update order status
- [ ] Can update payment status
- [ ] Order items display correctly
- [ ] Pricing breakdown is accurate
- [ ] Addresses display correctly
- [ ] Navigation to customer works

### Customer Management
- [ ] Companies list loads
- [ ] Can filter by company status
- [ ] Can search companies
- [ ] Credit limits display correctly
- [ ] Credit warnings show when low
- [ ] Company details page loads
- [ ] Users table displays
- [ ] Addresses display
- [ ] Recent orders display
- [ ] Can update company status
- [ ] Navigation to orders works

### UI/UX
- [ ] Loading states show during API calls
- [ ] Toast notifications appear for actions
- [ ] Error messages are clear
- [ ] Forms have validation
- [ ] Empty states display when no data
- [ ] Responsive design works
- [ ] Navigation is intuitive
- [ ] Typography is readable
- [ ] Colors and spacing are consistent

### Performance
- [ ] Pages load quickly (< 2s)
- [ ] Search is responsive (< 500ms)
- [ ] No console errors
- [ ] No React warnings
- [ ] API responses are fast (< 200ms for simple queries)

---

## Common Issues & Solutions

### Issue: Backend won't start

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Check if PostgreSQL is running: `pg_isready`
2. Start PostgreSQL if not running
3. Verify DATABASE_URL in `.env`

### Issue: Frontend API calls fail

**Symptom:** Network errors in browser console

**Solution:**
1. Verify backend is running on port 3001
2. Check VITE_API_URL in frontend `.env`
3. Check CORS settings in backend

### Issue: "Order not found" when accessing order details

**Symptom:** 404 error

**Solution:**
1. Ensure order ID is correct
2. Check if order exists in database
3. Verify API endpoint URL

### Issue: Token expired errors

**Symptom:** 401 Unauthorized after some time

**Solution:**
1. Implement token refresh logic
2. Or just log out and log back in
3. Check token expiration times in backend

### Issue: Categories not displaying

**Symptom:** Empty categories page

**Solution:**
1. Create at least one category
2. Check API response in Network tab
3. Verify Prisma query includes necessary relations

---

## Sample Data Creation

### Create Test Categories
```bash
# Electronics
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics", "slug": "electronics", "isActive": true}'

# Get the category ID from response, then create subcategory
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptops", "slug": "laptops", "parentId": "<electronics-id>", "isActive": true}'
```

### Create Test Products
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dell XPS 13",
    "sku": "DELL-XPS-13",
    "description": "13-inch ultrabook",
    "categoryId": "<laptops-category-id>",
    "price": 999.99,
    "msrp": 1299.99,
    "stockQuantity": 50,
    "reorderLevel": 10,
    "status": "ACTIVE"
  }'
```

---

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Acceptable |
|--------|--------|------------|
| Page Load (Products) | < 1s | < 2s |
| API Response (List) | < 200ms | < 500ms |
| API Response (Single) | < 100ms | < 300ms |
| Search Response | < 300ms | < 500ms |
| Form Submission | < 500ms | < 1s |

---

## Next Steps After Testing

1. **Fix any bugs found**
   - Document issues
   - Prioritize by severity
   - Fix and retest

2. **Performance optimization**
   - Add database indexes if queries are slow
   - Implement caching if needed
   - Optimize bundle size if frontend is slow

3. **Add missing features**
   - Image upload
   - Quote management
   - Advanced analytics

4. **Production preparation**
   - Environment variables for production
   - Security audit
   - Database backup strategy
   - Deployment configuration

---

**Last Updated:** 2025-11-19
**Version:** 1.0
**Status:** Ready for Integration Testing
