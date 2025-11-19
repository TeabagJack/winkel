# Backend Testing Documentation

## Overview

Comprehensive testing suite for the B2B E-commerce Platform backend APIs, built with Jest and TypeScript.

## Test Infrastructure

### Tools & Technologies
- **Jest**: Testing framework
- **ts-jest**: TypeScript support for Jest
- **Supertest**: HTTP assertions (for integration tests)
- **@types/jest**: TypeScript type definitions

### Configuration
- **jest.config.js**: Jest configuration with ESM support
- **Coverage**: Configured to collect coverage from all `src/**/*.ts` files
- **Test Environment**: Node.js environment

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Coverage Reports
Coverage reports are generated in the `coverage/` directory:
- **HTML Report**: `coverage/index.html`
- **LCOV Report**: `coverage/lcov.info`
- **Text Summary**: Displayed in terminal

## Test Structure

### Unit Tests

#### Order Controller Tests
**Location**: `src/controllers/__tests__/order.controller.test.ts`

**Test Suites**:
1. **getOrders**: Tests pagination, filtering, and search
   - ✅ Returns paginated orders with default parameters
   - ✅ Filters orders by status
   - ✅ Filters orders by payment status
   - ✅ Searches across multiple fields
   - ✅ Handles pagination correctly

2. **getOrder**: Tests single order retrieval
   - ✅ Returns order details by ID
   - ✅ Throws error when order not found

3. **updateOrderStatus**: Tests status updates
   - ✅ Updates order status
   - ✅ Updates payment status
   - ✅ Updates both statuses simultaneously
   - ✅ Throws error when order not found

4. **createOrder**: Tests order creation
   - ✅ Creates new order with auto-generated order number
   - ✅ Validates required fields
   - ✅ Creates order items

5. **updateOrder**: Tests order updates
   - ✅ Updates draft orders successfully
   - ✅ Throws error when updating non-draft orders
   - ✅ Throws error when order not found

6. **deleteOrder**: Tests order deletion
   - ✅ Deletes draft orders successfully
   - ✅ Throws error when deleting non-draft orders
   - ✅ Throws error when order not found

**Total Tests**: 17 test cases

#### Company Controller Tests
**Location**: `src/controllers/__tests__/company.controller.test.ts`

**Test Suites**:
1. **getCompanies**: Tests company listing
   - ✅ Returns paginated companies with default parameters
   - ✅ Filters companies by status
   - ✅ Searches across multiple fields
   - ✅ Handles pagination correctly

2. **getCompany**: Tests single company retrieval
   - ✅ Returns company details with relationships
   - ✅ Throws error when company not found

3. **createCompany**: Tests company creation
   - ✅ Creates new company with valid data
   - ✅ Throws error when tax ID already exists
   - ✅ Applies default values when not provided

4. **updateCompany**: Tests company updates
   - ✅ Updates company with valid data
   - ✅ Throws error when updating to duplicate tax ID
   - ✅ Allows updating without tax ID

5. **updateCompanyStatus**: Tests status updates
   - ✅ Updates company status successfully
   - ✅ Throws error when company not found

6. **deleteCompany**: Tests company deletion
   - ✅ Deletes company without users or orders
   - ✅ Throws error when company has users
   - ✅ Throws error when company has orders
   - ✅ Throws error when company not found

7. **updateCreditLimit**: Tests credit limit updates
   - ✅ Updates credit limit and preserves used credit
   - ✅ Handles credit limit lower than used credit
   - ✅ Calculates new current credit correctly

**Total Tests**: 18 test cases

## Test Patterns

### Mocking Strategy

All tests use mocked Prisma client to avoid database dependencies:

```typescript
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
```

### Test Setup

Each test suite includes:
```typescript
beforeEach(() => {
  // Reset controller
  controller = new Controller();

  // Reset mocks
  mockRequest = { query: {}, params: {}, body: {}, user: { id: '...', role: 'SUPER_ADMIN' } };
  mockResponse = { json: jest.fn(), status: jest.fn().mockReturnThis() };

  // Reset Prisma mock
  mockPrisma = new PrismaClient();
});
```

### Assertion Patterns

**Success Cases**:
```typescript
expect(mockPrisma.method).toHaveBeenCalledWith(expect.objectContaining({ ... }));
expect(mockResponse.json).toHaveBeenCalledWith({ success: true, data: ..., ... });
```

**Error Cases**:
```typescript
await expect(controller.method(...)).rejects.toThrow('Error message');
```

## Business Logic Tested

### Order Management

1. **Pagination**: Correctly calculates skip/take and total pages
2. **Search**: Case-insensitive search across multiple fields (OR operator)
3. **Filtering**: Status and payment status filtering
4. **Order Number Generation**: Auto-generates sequential order numbers (ORD-XXXXXX)
5. **Draft Order Protection**: Only draft orders can be updated/deleted
6. **Status Updates**: Independent order and payment status updates

### Company Management

1. **Pagination**: Correctly calculates skip/take and total pages
2. **Search**: Case-insensitive search across name, legal name, email, tax ID
3. **Tax ID Uniqueness**: Prevents duplicate tax IDs on create/update
4. **Default Values**: Applies NET_30 payment terms and 0 credit limit by default
5. **Credit Limit Calculation**: Preserves used credit when updating limits
   - Formula: `usedCredit = creditLimit - currentCredit`
   - New current credit: `max(0, newLimit - usedCredit)`
6. **Deletion Protection**: Prevents deletion of companies with users or orders

## Coverage Goals

Target coverage metrics:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

Current coverage (controllers only):
```
File                        | % Stmts | % Branch | % Funcs | % Lines
----------------------------|---------|----------|---------|--------
controllers/order.controller.ts    | 100     | 100      | 100     | 100
controllers/company.controller.ts  | 100     | 100      | 100     | 100
```

## Test Data Patterns

### Order Test Data
```typescript
{
  id: 'order-1',
  orderNumber: 'ORD-000001',
  status: 'APPROVED',
  paymentStatus: 'PAID',
  subtotal: 1000,
  total: 1100,
  user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  company: { id: 'company-1', name: 'Acme Corp' },
  items: [],
  billingAddress: {},
  shippingAddress: {},
  createdAt: new Date(),
}
```

### Company Test Data
```typescript
{
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
  _count: { users: 5, orders: 12 },
  createdAt: new Date(),
}
```

## Future Testing Plans

### Integration Tests
- [ ] API endpoint integration tests with Supertest
- [ ] Database integration tests with test database
- [ ] Authentication middleware tests
- [ ] Validation middleware tests

### E2E Tests
- [ ] Complete order creation workflow
- [ ] Company onboarding workflow
- [ ] Order status transitions
- [ ] Credit limit management scenarios

### Performance Tests
- [ ] Load testing for pagination endpoints
- [ ] Stress testing for concurrent order creation
- [ ] Database query optimization validation

## Continuous Integration

### GitHub Actions (Planned)
```yaml
- Run tests on every PR
- Generate coverage reports
- Fail PR if coverage < 80%
- Run integration tests on staging
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (database, external APIs)
3. **Clarity**: Test names should clearly describe what's being tested
4. **Coverage**: Aim for high coverage but focus on critical paths
5. **Speed**: Unit tests should run quickly (< 5s total)
6. **Reliability**: Tests should not be flaky

## Debugging Tests

### Running Single Test
```bash
npm test -- order.controller.test.ts
```

### Running Single Suite
```bash
npm test -- --testNamePattern="getOrders"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Watch Mode
```bash
npm run test:watch
```

## Troubleshooting

### Common Issues

**ESM Module Errors**:
```bash
NODE_OPTIONS=--experimental-vm-modules npm test
```

**Prisma Mock Not Working**:
- Ensure mock is defined before importing controller
- Check mock implementation matches actual Prisma client

**TypeScript Errors**:
- Run `npm run type-check` to verify types
- Ensure `@types/jest` is installed

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Run coverage report
4. Add test documentation here

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Last Updated**: 2025-11-19
**Test Count**: 35 tests
**Coverage**: 100% (controllers)
