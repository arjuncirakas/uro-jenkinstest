#!/bin/bash

# Urology Application Deployment Script
# This script deploys both frontend and backend to PM2

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT=$(pwd)
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_DIR="$PROJECT_ROOT/logs"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Urology Application Deployment Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}➜${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if PM2 is installed
print_step "Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
    print_success "PM2 installed successfully"
else
    print_success "PM2 is already installed"
fi

# Check if serve is installed globally
print_step "Checking serve installation..."
if ! command -v serve &> /dev/null; then
    print_warning "serve is not installed globally. Installing..."
    npm install -g serve
    print_success "serve installed successfully"
else
    print_success "serve is already installed"
fi

# Create logs directory if it doesn't exist
print_step "Creating logs directory..."
mkdir -p "$LOG_DIR"
print_success "Logs directory ready at $LOG_DIR"

# Backend deployment
echo ""
echo -e "${YELLOW}═══════════════ BACKEND DEPLOYMENT ═══════════════${NC}"

print_step "Navigating to backend directory..."
cd "$BACKEND_DIR"

print_step "Installing backend dependencies..."
npm install --production
print_success "Backend dependencies installed"

print_step "Checking backend environment file..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_error ".env file not found!"
    print_warning "Please create .env with required configuration"
    exit 1
else
    print_success "Environment file found"
fi

# Create superadmin user
echo ""
echo -e "${YELLOW}═══════════════ SUPERADMIN SETUP ═══════════════${NC}"

print_step "Creating superadmin user..."
cd "$BACKEND_DIR"
npm run create-superadmin
print_success "Superadmin setup completed"

# Frontend deployment
echo ""
echo -e "${YELLOW}═══════════════ FRONTEND DEPLOYMENT ═══════════════${NC}"

print_step "Navigating to frontend directory..."
cd "$FRONTEND_DIR"

print_step "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

print_step "Building frontend for production..."
npm run build
print_success "Frontend build completed"

# Check if dist directory exists
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    print_error "Frontend build failed - dist directory not found!"
    exit 1
fi

# PM2 deployment
echo ""
echo -e "${YELLOW}═══════════════ PM2 DEPLOYMENT ═══════════════${NC}"

print_step "Navigating to project root..."
cd "$PROJECT_ROOT"

print_step "Stopping existing PM2 processes (if any)..."
pm2 delete all 2>/dev/null || true
print_success "Previous processes stopped"

print_step "Starting applications with PM2..."
pm2 start ecosystem.config.cjs --env production
print_success "Applications started"

print_step "Saving PM2 process list..."
pm2 save
print_success "PM2 process list saved"

print_step "Setting up PM2 startup script..."
pm2 startup | tail -n 1 | bash || true
print_success "PM2 startup script configured"

# Display status
echo ""
echo -e "${YELLOW}═══════════════ DEPLOYMENT STATUS ═══════════════${NC}"
pm2 status

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment Completed Successfully!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Application URLs:${NC}"
echo -e "  • Backend API:  ${GREEN}http://localhost:5000${NC}"
echo -e "  • Frontend:     ${GREEN}http://localhost:3000${NC}"
echo -e "  • Domain:       ${GREEN}https://uroprep.ahimsa.global${NC}"
echo ""
echo -e "${BLUE}Useful PM2 Commands:${NC}"
echo -e "  • View logs:         ${YELLOW}pm2 logs${NC}"
echo -e "  • View backend logs: ${YELLOW}pm2 logs uroprep-backend${NC}"
echo -e "  • View frontend logs:${YELLOW}pm2 logs uroprep-frontend${NC}"
echo -e "  • Monitor:           ${YELLOW}pm2 monit${NC}"
echo -e "  • Restart:           ${YELLOW}pm2 restart all${NC}"
echo -e "  • Stop:              ${YELLOW}pm2 stop all${NC}"
echo -e "  • Status:            ${YELLOW}pm2 status${NC}"
echo ""
echo -e "${BLUE}Log files location:${NC} ${GREEN}$LOG_DIR${NC}"
echo ""

