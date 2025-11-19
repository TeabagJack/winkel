# Quick Start Guide

This guide will get you up and running with the Winkel B2B platform in minutes.

## Prerequisites Check

Before starting, ensure you have:

- ✅ Node.js >= 18.0.0 (`node -v`)
- ✅ npm >= 9.0.0 (`npm -v`)
- ✅ Docker and Docker Compose installed (`docker --version`)

## Setup Steps

### Step 1: Install Dependencies

```bash
npm install
```

This installs all dependencies for the monorepo (root, frontend, and backend).

### Step 2: Start Database Services

```bash
# Start PostgreSQL and Dragonfly (Redis)
docker compose up -d

# Verify containers are running
docker ps

# You should see:
# - winkel-postgres
# - winkel-dragonfly
```

### Step 3: Set Up Database

```bash
cd apps/backend

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# Seed with sample data
npm run db:seed

cd ../..
```

You should see output with login credentials:
```
Admin:
  Email: admin@winkel.com
  Password: admin123

Company Admin/Buyer:
  Email: buyer@acme.com
  Password: buyer123
```

### Step 4: Start Development Servers

From the root directory:

```bash
npm run dev
```

This starts both servers:
- 🎨 **Frontend**: http://localhost:5173
- ⚡ **Backend**: http://localhost:3001

## Verify Everything Works

### Test 1: Backend Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### Test 2: Admin Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@winkel.com","password":"admin123"}'
```

You should receive an access token and user data.

### Test 3: Open Frontend

Navigate to http://localhost:5173 in your browser.

## Optional: Prisma Studio

View and edit your database with a GUI:

```bash
cd apps/backend
npm run db:studio
```

Opens at http://localhost:5555

## Common Commands

```bash
# Stop databases
docker compose down

# Restart databases
docker compose restart

# View database logs
docker compose logs -f postgres

# View cache logs
docker compose logs -f dragonfly

# Reset database (WARNING: deletes all data)
cd apps/backend && npm run db:reset

# Run only backend
cd apps/backend && npm run dev

# Run only frontend
cd apps/frontend && npm run dev
```

## Troubleshooting

### Port Already in Use

If you see port errors:

**Port 5173 (Frontend):**
```bash
# Find process
lsof -i :5173
# Kill it
kill -9 <PID>
```

**Port 3001 (Backend):**
```bash
lsof -i :3001
kill -9 <PID>
```

**Port 5432 (PostgreSQL) or 6379 (Redis):**
```bash
# Stop containers
docker compose down
# Restart
docker compose up -d
```

### Database Connection Errors

```bash
# Check if database container is running
docker ps | grep postgres

# Check logs
docker compose logs postgres

# Restart database
docker compose restart postgres

# Wait a few seconds and try again
```

### Prisma Generate Fails

```bash
cd apps/backend

# Clean Prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# Reinstall
npm install

# Try again
npx prisma generate
```

### Frontend Build Errors

```bash
cd apps/frontend

# Clean and reinstall
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## Project Structure Overview

```
winkel/
├── apps/
│   ├── backend/         # Express API (Port 3001)
│   └── frontend/        # React App (Port 5173)
├── packages/            # Shared code
├── docker-compose.yml   # Database services
└── package.json         # Workspace configuration
```

## What's Next?

Now that your environment is running, you can:

1. **Explore the Admin Dashboard** - Log in as admin@winkel.com
2. **Explore the User Dashboard** - Log in as buyer@acme.com
3. **View the Database** - Open Prisma Studio
4. **Read the Full README** - See README.md for complete documentation
5. **Start Development** - Check the roadmap in README.md

## Development Workflow

```bash
# Morning routine
docker compose up -d          # Start databases
npm run dev                   # Start dev servers

# During development
# - Edit code
# - Hot reload happens automatically
# - Check terminal for errors

# Database changes
cd apps/backend
npx prisma migrate dev --name <migration_name>
npm run db:seed              # If needed

# End of day
# Press Ctrl+C to stop dev servers
docker compose down          # Stop databases
```

## Automated Setup Script

For a fully automated setup, use:

```bash
./test-setup.sh
```

This script will:
1. Check prerequisites
2. Start Docker containers
3. Set up database
4. Start servers
5. Run API tests
6. Display all credentials and URLs

## Need Help?

- 📖 Full documentation: See README.md
- 🐛 Issues: https://github.com/anthropics/claude-code/issues
- 📝 Architecture: See docs/ folder

## Success Checklist

- [ ] Docker containers running
- [ ] Database migrated and seeded
- [ ] Backend responding at :3001
- [ ] Frontend responding at :5173
- [ ] Can log in with test credentials
- [ ] Prisma Studio accessible (optional)

If all checked, you're ready to start developing! 🎉
