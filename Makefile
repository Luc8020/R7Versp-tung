# Makefile for R7Verspätung Application
# Provides commands to install dependencies and run the application

.PHONY: help install install-backend install-frontend run run-backend run-frontend dev clean

# Default target - show help
help:
	@echo "R7Verspätung - Makefile Commands"
	@echo "=================================="
	@echo ""
	@echo "Installation:"
	@echo "  make install          - Install all dependencies (backend + frontend)"
	@echo "  make install-backend  - Install backend dependencies only"
	@echo "  make install-frontend - Install frontend dependencies only"
	@echo ""
	@echo "Running:"
	@echo "  make run              - Run the complete application (backend + frontend)"
	@echo "  make run-backend      - Run backend server only (port 3000)"
	@echo "  make run-frontend     - Run frontend server only (port 8080)"
	@echo "  make dev              - Run both servers in development mode"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            - Remove node_modules and build artifacts"
	@echo ""
	@echo "Access the application at: http://localhost:8080"
	@echo ""

# Install all dependencies
install: install-backend install-frontend
	@echo "✅ All dependencies installed successfully!"
	@echo "Run 'make run' to start the application"

# Install backend dependencies
install-backend:
	@echo "📦 Installing backend dependencies..."
	@cd Backend && npm install

# Install frontend dependencies
install-frontend:
	@echo "📦 Installing frontend dependencies..."
	@cd Frontend && npm install

# Run the complete application (backend + frontend)
# This starts both servers in the background
run:
	@echo "🚀 Starting R7Verspätung application..."
	@echo ""
	@echo "Starting backend server on port 3000..."
	@cd Backend && npm start &
	@sleep 5
	@echo "Waiting for backend to be ready..."
	@timeout=30; while ! curl -s http://localhost:3000/api/health > /dev/null 2>&1 && [ $$timeout -gt 0 ]; do \
		sleep 1; \
		timeout=$$((timeout-1)); \
	done
	@echo "Starting frontend server on port 8080..."
	@cd Frontend && npm start &
	@sleep 3
	@echo ""
	@echo "✅ Application is running!"
	@echo "   Backend API:  http://localhost:3000"
	@echo "   Frontend App: http://localhost:8080"
	@echo ""
	@echo "Press Ctrl+C to stop both servers"
	@wait

# Run backend server only
run-backend:
	@echo "🚀 Starting backend server on port 3000..."
	@cd Backend && npm start

# Run frontend server only
run-frontend:
	@echo "🚀 Starting frontend server on port 8080..."
	@cd Frontend && npm start

# Run both servers in development mode with auto-reload
dev:
	@echo "🔧 Starting R7Verspätung in development mode..."
	@echo ""
	@if [ ! -f Backend/package.json ] || ! grep -q '"dev"' Backend/package.json; then \
		echo "❌ Error: Backend dev script not found in package.json"; \
		exit 1; \
	fi
	@if [ ! -f Frontend/package.json ] || ! grep -q '"dev"' Frontend/package.json; then \
		echo "❌ Error: Frontend dev script not found in package.json"; \
		exit 1; \
	fi
	@echo "Starting backend server with nodemon on port 3000..."
	@cd Backend && npm run dev &
	@sleep 5
	@echo "Waiting for backend to be ready..."
	@timeout=30; while ! curl -s http://localhost:3000/api/health > /dev/null 2>&1 && [ $$timeout -gt 0 ]; do \
		sleep 1; \
		timeout=$$((timeout-1)); \
	done
	@echo "Starting frontend server with nodemon on port 8080..."
	@cd Frontend && npm run dev &
	@sleep 3
	@echo ""
	@echo "✅ Application is running in development mode!"
	@echo "   Backend API:  http://localhost:3000"
	@echo "   Frontend App: http://localhost:8080"
	@echo ""
	@echo "Files will auto-reload on changes"
	@echo "Press Ctrl+C to stop both servers"
	@wait

# Clean build artifacts and dependencies
clean:
	@echo "🧹 Cleaning build artifacts and dependencies..."
	@rm -rf Backend/node_modules
	@rm -rf Frontend/node_modules
	@rm -rf Backend/package-lock.json
	@rm -rf Frontend/package-lock.json
	@echo "✅ Clean complete!"
