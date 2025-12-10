#!/bin/bash

# =============================================================================
# Assistant Urbanisme - Full Setup Script
# =============================================================================
# This script sets up the complete development environment including:
# - Docker services (PostgreSQL, Redis)
# - Backend dependencies and database
# - Frontend dependencies
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "=============================================="
echo "   Assistant Urbanisme - Setup Script"
echo "=============================================="
echo ""

# =============================================================================
# Check Prerequisites
# =============================================================================
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi
print_success "npm $(npm -v) found"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker found"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_success "Docker Compose found"

echo ""

# =============================================================================
# Start Docker Services
# =============================================================================
print_status "Starting Docker services (PostgreSQL, Redis)..."

docker-compose up -d

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
RETRIES=30
until docker-compose exec -T postgres pg_isready -U urbanisme > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    echo -n "."
    RETRIES=$((RETRIES-1))
    sleep 1
done
echo ""

if [ $RETRIES -eq 0 ]; then
    print_error "PostgreSQL failed to start. Check docker-compose logs for details."
    exit 1
fi

print_success "Docker services are running"
echo ""

# =============================================================================
# Setup Backend
# =============================================================================
print_status "Setting up backend..."

cd "$PROJECT_ROOT/backend"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating backend .env from .env.example..."
    cp .env.example .env

    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

    # Replace the JWT_SECRET in .env (cross-platform compatible)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
    else
        sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
    fi

    print_success "Backend .env created with generated JWT_SECRET"
    print_warning "Don't forget to add your OPENAI_API_KEY if you want LLM features"
else
    print_warning "Backend .env already exists, skipping..."
fi

# Install dependencies
print_status "Installing backend dependencies..."
npm install

# Generate Prisma client
print_status "Generating Prisma client..."
npm run prisma:generate

# Run migrations
print_status "Running database migrations..."
npm run prisma:migrate

print_success "Backend setup complete"
echo ""

# =============================================================================
# Setup Frontend
# =============================================================================
print_status "Setting up frontend..."

cd "$PROJECT_ROOT/frontend"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    print_status "Creating frontend .env.local from .env.local.example..."
    cp .env.local.example .env.local
    print_success "Frontend .env.local created"
else
    print_warning "Frontend .env.local already exists, skipping..."
fi

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

print_success "Frontend setup complete"
echo ""

# =============================================================================
# Summary
# =============================================================================
cd "$PROJECT_ROOT"

echo ""
echo "=============================================="
echo "   Setup Complete!"
echo "=============================================="
echo ""
echo "Your development environment is ready."
echo ""
echo "To start the application:"
echo ""
echo "  1. Start the backend (in one terminal):"
echo "     ${YELLOW}cd backend && npm run start:dev${NC}"
echo ""
echo "  2. Start the frontend (in another terminal):"
echo "     ${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo "  3. Open http://localhost:3000 in your browser"
echo ""
echo "Useful links:"
echo "  - Frontend:     ${BLUE}http://localhost:3000${NC}"
echo "  - Backend API:  ${BLUE}http://localhost:3001/api${NC}"
echo "  - API Docs:     ${BLUE}http://localhost:3001/api/docs${NC}"
echo ""
echo "Docker services:"
echo "  - PostgreSQL:   localhost:5432"
echo "  - Redis:        localhost:6379"
echo ""
print_warning "Note: Add your OPENAI_API_KEY to backend/.env for LLM features"
echo ""
