# Architecture Overview

## System Design

The Winkel B2B platform follows a modern monorepo architecture with clear separation between frontend and backend.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                        │
│                     (Browser / Mobile App)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │   Admin    │  │    User    │  │  Shared Components  │   │
│  │ Dashboard  │  │ Dashboard  │  │   (Shadcn/ui)       │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│                                                               │
│  State Management:                                           │
│  - TanStack Query (Server State)                            │
│  - Zustand (Client State)                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
                           │ JSON
┌──────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Express)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Layer                               │   │
│  │  - Authentication (JWT)                              │   │
│  │  - Authorization (RBAC)                              │   │
│  │  - Validation (Zod)                                  │   │
│  │  - Rate Limiting                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Business Logic Layer                         │   │
│  │  - Product Management                                │   │
│  │  - Order Processing                                  │   │
│  │  - Pricing Engine                                    │   │
│  │  - Quote Management                                  │   │
│  │  - Approval Workflows                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Data Access Layer (Prisma)                │   │
│  │  - ORM                                               │   │
│  │  - Query Builder                                     │   │
│  │  - Migrations                                        │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
┌─────────▼────────┐            ┌──────────▼─────────┐
│   PostgreSQL     │            │ Dragonfly/Redis    │
│                  │            │                    │
│ - User Data      │            │ - Session Store    │
│ - Products       │            │ - Cache            │
│ - Orders         │            │ - Rate Limiting    │
│ - Companies      │            │ - Token Blacklist  │
│ - Transactions   │            │ - Job Queue        │
└──────────────────┘            └────────────────────┘
```

## Technology Stack Details

### Frontend Stack

**Framework & Build**
- **React 18** - Component-based UI
- **TypeScript** - Type safety
- **Vite** - Fast build tool with HMR

**UI & Styling**
- **Tailwind CSS** - Utility-first CSS
- **Shadcn/ui** - High-quality components
- **Radix UI** - Accessible primitives
- **Lucide Icons** - Icon library

**State Management**
- **TanStack Query** - Server state (caching, fetching, synchronization)
- **Zustand** - Client state (lightweight, simple)

**Routing & Forms**
- **React Router v6** - Client-side routing
- **React Hook Form** - Form management
- **Zod** - Schema validation

**HTTP Client**
- **Axios** - HTTP requests with interceptors

### Backend Stack

**Runtime & Framework**
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type safety

**Database**
- **Prisma** - Modern ORM
- **PostgreSQL** - Relational database

**Caching & Sessions**
- **Dragonfly** - Redis-compatible in-memory store
- **ioredis** - Redis client

**Authentication & Security**
- **JWT** - Token-based auth
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

**Validation & Utilities**
- **Zod** - Schema validation
- **Morgan** - HTTP logging

## Data Flow

### Authentication Flow

```
1. User submits login credentials
   ↓
2. Frontend sends POST /api/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Generate access token (15min) + refresh token (7d)
   ↓
5. Store refresh token in httpOnly cookie
   ↓
6. Return access token to frontend
   ↓
7. Frontend stores in memory + localStorage
   ↓
8. All subsequent requests include Authorization header
   ↓
9. On 401, attempt refresh
   ↓
10. If refresh fails, redirect to login
```

### Order Creation Flow

```
1. User adds items to cart
   ↓
2. Cart stored in PostgreSQL (persistent)
   ↓
3. User proceeds to checkout
   ↓
4. System calculates pricing (with custom rules)
   ↓
5. Check if approval required (based on amount/role)
   ↓
6. Create order with status DRAFT or PENDING_APPROVAL
   ↓
7. If approval required:
   - Notify approvers
   - Wait for approval
   ↓
8. Once approved (or if not required):
   - Update inventory
   - Generate invoice
   - Send confirmation email
   ↓
9. Order moves to PROCESSING
```

### Pricing Calculation Flow

```
1. User views product
   ↓
2. Fetch product base price
   ↓
3. Check company pricing tier
   ↓
4. Apply tier discount if exists
   ↓
5. Check volume pricing rules
   ↓
6. Apply best price for quantity
   ↓
7. Check custom pricing for company
   ↓
8. Return final price to display
```

## Database Schema Highlights

### Key Relationships

- **User** → **Company** (Many-to-One)
- **Company** → **Address** (One-to-Many)
- **Company** → **PricingTier** (Many-to-One)
- **Order** → **OrderItem** (One-to-Many)
- **Order** → **Approval** (One-to-Many)
- **Product** → **PricingRule** (One-to-Many)
- **Cart** → **CartItem** (One-to-Many)

### Indexes

All foreign keys are indexed for performance:
- `userId`, `companyId` on most tables
- `email` on User table
- `sku` on Product table
- `orderNumber`, `quoteNumber`, `invoiceNumber`

## Security Architecture

### Authentication Layers

1. **JWT Access Tokens**
   - Short-lived (15 minutes)
   - Stored in memory
   - Sent in Authorization header

2. **Refresh Tokens**
   - Long-lived (7 days)
   - HttpOnly cookie
   - Cannot be accessed by JavaScript

3. **Token Blacklist**
   - Stored in Redis
   - Prevents reuse of revoked tokens

### Authorization

**Role-Based Access Control (RBAC)**

Roles hierarchy:
```
SUPER_ADMIN
  ├─ Full platform access
  └─ Manage all companies

COMPANY_ADMIN
  ├─ Manage company users
  ├─ View all company orders
  └─ Configure company settings

APPROVER
  ├─ Approve/reject orders
  └─ View orders

BUYER
  ├─ Create orders
  ├─ Request quotes
  └─ View own orders

VIEWER
  └─ Read-only access
```

### Data Protection

- Passwords hashed with bcrypt (10 rounds)
- SQL injection prevention (Prisma parameterized queries)
- XSS protection (Helmet middleware)
- CSRF protection (SameSite cookies)
- Rate limiting (per IP and per user)

## Caching Strategy

### Redis/Dragonfly Usage

1. **Session Storage**
   - User sessions
   - TTL: 7 days

2. **API Response Cache**
   - Product catalog
   - Categories
   - TTL: 5 minutes

3. **Token Blacklist**
   - Revoked JWT tokens
   - TTL: Token expiration time

4. **Rate Limiting**
   - Request counters
   - TTL: 1 minute/hour

## Scalability Considerations

### Current Architecture

- Monolithic backend (single Express app)
- Single PostgreSQL instance
- Single Redis instance
- No load balancing

### Future Scalability

**Phase 1: Horizontal Scaling**
- Multiple backend instances behind load balancer
- Redis cluster for cache
- PostgreSQL read replicas

**Phase 2: Service Decomposition**
- Separate microservices:
  - Auth Service
  - Product Service
  - Order Service
  - Payment Service
- Message queue (RabbitMQ/Kafka)
- API Gateway

**Phase 3: Performance Optimization**
- CDN for static assets
- Database query optimization
- Background job processing
- Search index (Elasticsearch)

## Monitoring & Observability

### Logging

- **Backend**: Morgan HTTP logging
- **Custom Logger**: Structured logging with timestamps
- **Log Levels**: info, warn, error, debug

### Future Enhancements

- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Metrics (Prometheus + Grafana)
- Distributed tracing
- Health checks
- Uptime monitoring

## Development Best Practices

### Code Organization

```
backend/
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── services/        # Business logic
├── utils/           # Shared utilities
└── types/           # TypeScript types

frontend/
├── components/      # React components
│   ├── ui/         # Shadcn components
│   ├── admin/      # Admin-specific
│   └── user/       # User-specific
├── pages/          # Route pages
├── hooks/          # Custom hooks
├── lib/            # Utilities
├── store/          # State management
└── types/          # TypeScript types
```

### Testing Strategy (Future)

- **Unit Tests**: Vitest
- **Integration Tests**: Supertest (API)
- **E2E Tests**: Playwright
- **Component Tests**: Testing Library

### CI/CD Pipeline (Future)

```
1. Push to branch
   ↓
2. Run linter
   ↓
3. Run type check
   ↓
4. Run tests
   ↓
5. Build application
   ↓
6. Deploy to staging
   ↓
7. Run E2E tests
   ↓
8. Deploy to production
```

## Deployment Architecture (Future)

```
┌─────────────┐
│   Nginx     │  (Reverse Proxy)
│   SSL/TLS   │
└──────┬──────┘
       │
  ┌────┴────┐
  │         │
┌─▼──┐   ┌─▼──┐
│ BE │   │ BE │   (Backend Instances)
│  1 │   │  2 │
└─┬──┘   └─┬──┘
  │         │
  └────┬────┘
       │
  ┌────▼────┐
  │  PG     │   (PostgreSQL Primary)
  │ Primary │
  └────┬────┘
       │
  ┌────▼────┐
  │  PG     │   (Read Replicas)
  │ Replica │
  └─────────┘
```

## API Design

### RESTful Conventions

```
GET    /api/resources       # List
GET    /api/resources/:id   # Get one
POST   /api/resources       # Create
PUT    /api/resources/:id   # Update (full)
PATCH  /api/resources/:id   # Update (partial)
DELETE /api/resources/:id   # Delete
```

### Response Format

```json
{
  "data": { ... },
  "message": "Success",
  "errors": []
}
```

### Pagination

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

## Summary

This architecture provides:

- ✅ Clear separation of concerns
- ✅ Type safety across the stack
- ✅ Scalability path
- ✅ Security best practices
- ✅ Developer-friendly DX
- ✅ Production-ready foundation
