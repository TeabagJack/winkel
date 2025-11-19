# Winkel B2B E-commerce Platform

A full-featured B2B e-commerce platform with separate admin and user dashboards, built with modern technologies.

## Tech Stack

### Frontend
- **Vite** - Fast build tool
- **React 18** - UI library
- **TypeScript** - Type safety
- **Shadcn/ui** - UI component library
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM
- **PostgreSQL** - Database
- **Dragonfly/Redis** - Caching & sessions
- **JWT** - Authentication
- **Zod** - Validation
- **Bcrypt** - Password hashing

## Features

### Admin Dashboard
- Product management (CRUD, bulk operations)
- Order management
- Customer & company management
- Custom pricing rules
- Analytics & reporting
- Quote management

### User Dashboard
- Product catalog with custom pricing
- Shopping cart
- Checkout & order placement
- Order history & tracking
- Quote requests
- Multi-user company accounts

### B2B Features
- Role-based access control
- Company accounts with multiple users
- Custom pricing tiers
- Volume-based pricing
- Quote request system
- Approval workflows
- Payment terms (Net 30/60/90)
- Purchase order system

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (for databases)

## Getting Started

### 1. Clone the repository

```bash
cd winkel
```

### 2. Install dependencies

```bash
npm install
```

This will install dependencies for all workspaces (root, frontend, and backend).

### 3. Start databases

```bash
npm run docker:up
```

This starts PostgreSQL and Dragonfly (Redis-compatible) containers.

### 4. Set up backend

```bash
# Generate Prisma client
cd apps/backend
npx prisma generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 5. Start development servers

From the root directory:

```bash
npm run dev
```

This starts both frontend and backend in development mode:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Development Credentials

After seeding the database, you can log in with:

**Super Admin:**
- Email: `admin@winkel.com`
- Password: `admin123`

**Company Admin/Buyer:**
- Email: `buyer@acme.com`
- Password: `buyer123`

## Project Structure

```
winkel/
├── apps/
│   ├── frontend/           # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/     # Shadcn components
│   │   │   │   ├── admin/  # Admin components
│   │   │   │   └── user/   # User components
│   │   │   ├── pages/
│   │   │   ├── lib/        # Utilities, API client
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── store/      # Zustand stores
│   │   │   └── types/      # TypeScript types
│   │   └── package.json
│   │
│   └── backend/            # Express API
│       ├── src/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── utils/
│       │   └── types/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── package.json
│
├── packages/               # Shared packages
│   └── types/              # Shared TypeScript types
│
├── docker-compose.yml      # Database services
└── package.json            # Root workspace config
```

## Available Scripts

### Root Scripts

```bash
npm run dev              # Start both frontend and backend
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
npm run type-check       # Type check all workspaces
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs
```

### Backend Scripts

```bash
cd apps/backend
npm run dev              # Start dev server with watch mode
npm run build            # Build for production
npm run start            # Start production server
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma client
npm run db:reset         # Reset database
```

### Frontend Scripts

```bash
cd apps/frontend
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
npm run type-check       # Check types
```

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://winkel:winkel_dev_password@localhost:5432/winkel_b2b
REDIS_URL=redis://:winkel_redis_password@localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001
```

## Database Schema

The database includes the following main entities:

- **Users** - Platform and company users with roles
- **Companies** - B2B customer organizations
- **Products** - Product catalog with variants
- **Categories** - Product categorization
- **Orders** - Order management with approval workflow
- **Quotes** - RFQ (Request for Quote) system
- **Cart** - Shopping cart
- **Invoices** - Invoice management
- **PricingRules** - Custom and volume-based pricing
- **Addresses** - Billing and shipping addresses

## API Endpoints

### Authentication

```
POST   /api/auth/register   # Register new company
POST   /api/auth/login      # User login
POST   /api/auth/logout     # User logout
POST   /api/auth/refresh    # Refresh access token
GET    /api/auth/me         # Get current user
```

More endpoints will be added in future sprints.

## Testing the Stack

### 1. Check backend health

```bash
curl http://localhost:3001/health
```

### 2. Test authentication

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@winkel.com","password":"admin123"}'
```

### 3. Access frontend

Open http://localhost:5173 in your browser.

## Development Workflow

1. **Start Docker containers** - `npm run docker:up`
2. **Run migrations** - `cd apps/backend && npm run db:migrate`
3. **Start dev servers** - `npm run dev` (from root)
4. **Open Prisma Studio** - `cd apps/backend && npm run db:studio` (optional)
5. **Make changes** - Edit code with hot reload
6. **View logs** - Check terminal output

## Troubleshooting

### Database connection issues

```bash
# Check if containers are running
docker ps

# View logs
npm run docker:logs

# Restart containers
npm run docker:down && npm run docker:up
```

### Port conflicts

If ports 5173, 3001, 5432, or 6379 are in use:

1. Stop the conflicting process
2. Or change ports in .env files and docker-compose.yml

### Prisma issues

```bash
# Regenerate Prisma client
cd apps/backend
npx prisma generate

# Reset database (WARNING: deletes all data)
npm run db:reset
```

## Next Steps

Sprint 0 is complete! The foundation is ready. Next sprints will implement:

1. **Sprint 1** - Admin authentication & core data models
2. **Sprint 2** - Admin product management
3. **Sprint 3** - Admin customer management
4. **Sprint 4** - User catalog & cart
5. **Sprint 5** - Checkout & orders
6. And more...

## Contributing

This is a development project. Follow these guidelines:

- Use TypeScript for all new code
- Follow existing code style
- Write meaningful commit messages
- Test before committing

## License

Private - All rights reserved
