#!/bin/bash

# Winkel B2B Platform - Setup & Test Script
# This script tests the full stack setup

set -e

echo "🚀 Winkel B2B Platform - Setup & Test"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check prerequisites
echo "1️⃣  Checking prerequisites..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker installed: $DOCKER_VERSION"
else
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

echo ""
echo "2️⃣  Starting Docker containers..."
echo ""

# Start Docker containers
docker compose up -d

# Wait for containers to be healthy
echo "Waiting for databases to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker compose exec -T postgres pg_isready -U winkel > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
print_success "PostgreSQL is ready"

# Check if Dragonfly is ready
until docker compose exec -T dragonfly redis-cli --raw incr ping > /dev/null 2>&1; do
    echo "Waiting for Dragonfly..."
    sleep 2
done
print_success "Dragonfly is ready"

echo ""
echo "3️⃣  Setting up backend..."
echo ""

cd apps/backend

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Run migrations
print_info "Running database migrations..."
npx prisma migrate deploy
print_success "Migrations completed"

# Seed database
print_info "Seeding database..."
npm run db:seed
print_success "Database seeded"

cd ../..

echo ""
echo "4️⃣  Starting development servers..."
echo ""

print_info "Backend will run on: http://localhost:3001"
print_info "Frontend will run on: http://localhost:5173"
echo ""

# Start backend in background
print_info "Starting backend..."
cd apps/backend
npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
sleep 5

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null; then
    print_success "Backend is running"
else
    print_error "Backend failed to start. Check logs/backend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend in background
print_info "Starting frontend..."
cd apps/frontend
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start
sleep 5

echo ""
echo "5️⃣  Testing API endpoints..."
echo ""

# Test health endpoint
if curl -s http://localhost:3001/health | grep -q "ok"; then
    print_success "Health check passed"
else
    print_error "Health check failed"
fi

# Test login endpoint
print_info "Testing admin login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@winkel.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    print_success "Admin login successful"

    # Extract access token
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

    # Test authenticated endpoint
    print_info "Testing authenticated endpoint..."
    ME_RESPONSE=$(curl -s http://localhost:3001/api/auth/me \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$ME_RESPONSE" | grep -q "admin@winkel.com"; then
        print_success "Authenticated request successful"
    else
        print_error "Authenticated request failed"
    fi
else
    print_error "Admin login failed"
fi

echo ""
echo "======================================"
echo "🎉 Setup Complete!"
echo "======================================"
echo ""
echo "📝 Login Credentials:"
echo ""
echo "   Super Admin:"
echo "   Email: admin@winkel.com"
echo "   Password: admin123"
echo ""
echo "   Company Admin:"
echo "   Email: buyer@acme.com"
echo "   Password: buyer123"
echo ""
echo "🌐 Services:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   Prisma Studio: Run 'cd apps/backend && npm run db:studio'"
echo ""
echo "📊 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   docker compose down"
echo ""
echo "📋 View logs:"
echo "   Backend: tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
