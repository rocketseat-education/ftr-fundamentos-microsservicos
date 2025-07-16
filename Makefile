# Microservices URL Shortener Project Makefile
# This Makefile provides convenient commands for managing the entire microservices ecosystem

# Variables
SERVICES := auth url-shortener analytics orchestrator
SHARED_PACKAGES := contracts shared
ALL_PACKAGES := $(SHARED_PACKAGES) $(SERVICES)
DOCKER_COMPOSE := docker-compose
NODE := node
NPM := npm

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[0;33m
NC := \033[0m # No Color

# Default target
.PHONY: help
help:
	@echo "$(CYAN)Microservices URL Shortener - Available Commands:$(NC)"
	@echo ""
	@echo "$(GREEN)Setup & Installation:$(NC)"
	@echo "  make setup              - Complete project setup (infrastructure + services)"
	@echo "  make install            - Install dependencies for all services"
	@echo "  make install-service    - Install dependencies for a specific service (SERVICE=auth)"
	@echo "  make env-setup          - Copy all .env.example files to .env"
	@echo ""
	@echo "$(GREEN)Infrastructure:$(NC)"
	@echo "  make infra-up           - Start infrastructure services (databases, Kafka, Kong, Jaeger)"
	@echo "  make infra-down         - Stop infrastructure services"
	@echo "  make infra-restart      - Restart infrastructure services"
	@echo "  make infra-logs         - View infrastructure logs"
	@echo "  make infra-status       - Check infrastructure status"
	@echo ""
	@echo "$(GREEN)Database Management:$(NC)"
	@echo "  make db-generate        - Generate database migrations for all services"
	@echo "  make db-push            - Apply database migrations for all services"
	@echo "  make db-migrate         - Run database migrations for all services"
	@echo "  make db-studio          - Open Drizzle Studio for a service (SERVICE=auth)"
	@echo "  make db-reset           - Reset all databases (WARNING: destroys data)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev                - Start all services in development mode"
	@echo "  make dev-auth           - Start auth service in development mode"
	@echo "  make dev-url            - Start url-shortener service in development mode"
	@echo "  make dev-analytics      - Start analytics service in development mode"
	@echo "  make dev-orchestrator   - Start orchestrator service in development mode"
	@echo ""
	@echo "$(GREEN)Production:$(NC)"
	@echo "  make start              - Start all services in production mode"
	@echo "  make start-service      - Start a specific service (SERVICE=auth)"
	@echo "  make stop               - Stop all running services"
	@echo ""
	@echo "$(GREEN)Code Quality:$(NC)"
	@echo "  make lint               - Run linter on all services"
	@echo "  make format             - Format code in all services"
	@echo "  make check              - Run all code quality checks"
	@echo "  make test               - Run tests for all services"
	@echo "  make test-service       - Run tests for a specific service (SERVICE=auth)"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make logs               - View logs for a service (SERVICE=auth)"
	@echo "  make clean              - Clean node_modules and lock files"
	@echo "  make reset              - Complete reset (clean + remove volumes)"
	@echo "  make health-check       - Check health of all services"
	@echo "  make kafka-topics       - List Kafka topics"
	@echo "  make jaeger-ui          - Open Jaeger UI in browser"
	@echo "  make kong-ui            - Open Kong Manager UI in browser"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make setup                    # Complete initial setup"
	@echo "  make dev                      # Start development environment"
	@echo "  make logs SERVICE=auth        # View auth service logs"
	@echo "  make test-service SERVICE=analytics  # Test analytics service"

# Complete setup
.PHONY: setup
setup: env-setup infra-up install db-push
	@echo "$(GREEN)✓ Setup complete! You can now run 'make dev' to start all services.$(NC)"

# Environment setup
.PHONY: env-setup
env-setup:
	@echo "$(CYAN)Setting up environment files...$(NC)"
	@for service in $(SERVICES); do \
		if [ -f apps/$$service/.env.example ] && [ ! -f apps/$$service/.env ]; then \
			cp apps/$$service/.env.example apps/$$service/.env; \
			echo "$(GREEN)✓ Created .env for $$service$(NC)"; \
		else \
			echo "$(YELLOW)⚠ .env already exists for $$service or no .env.example found$(NC)"; \
		fi \
	done
	@echo "$(YELLOW)⚠ Remember to update the .env files with your actual configuration!$(NC)"

# Install dependencies
.PHONY: install
install:
	@echo "$(CYAN)Installing dependencies for all packages...$(NC)"
	@for pkg in $(ALL_PACKAGES); do \
		echo "$(CYAN)Installing $$pkg...$(NC)"; \
		if [ "$$pkg" = "contracts" ] || [ "$$pkg" = "shared" ]; then \
			cd $$pkg && $(NPM) install || exit 1; \
			cd ..; \
		else \
			cd apps/$$pkg && $(NPM) install || exit 1; \
			cd ../..; \
		fi; \
		echo "$(GREEN)✓ $$pkg installed$(NC)"; \
	done

# Install specific service
.PHONY: install-service
install-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified. Usage: make install-service SERVICE=auth$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Installing dependencies for $(SERVICE)...$(NC)"
	@cd apps/$(SERVICE) && $(NPM) install
	@echo "$(GREEN)✓ $(SERVICE) dependencies installed$(NC)"

# Infrastructure management
.PHONY: infra-up
infra-up:
	@echo "$(CYAN)Starting infrastructure services...$(NC)"
	@$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✓ Infrastructure started$(NC)"
	@echo "$(YELLOW)Waiting for services to be ready...$(NC)"
	@sleep 10
	@make infra-status

.PHONY: infra-down
infra-down:
	@echo "$(CYAN)Stopping infrastructure services...$(NC)"
	@$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Infrastructure stopped$(NC)"

.PHONY: infra-restart
infra-restart: infra-down infra-up

.PHONY: infra-logs
infra-logs:
	@$(DOCKER_COMPOSE) logs -f

.PHONY: infra-status
infra-status:
	@echo "$(CYAN)Infrastructure Status:$(NC)"
	@$(DOCKER_COMPOSE) ps

# Database management
.PHONY: db-generate
db-generate:
	@echo "$(CYAN)Generating database migrations...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(CYAN)Generating migrations for $$service...$(NC)"; \
		cd apps/$$service && $(NPM) run db:generate || exit 1; \
		cd ../..; \
		echo "$(GREEN)✓ $$service migrations generated$(NC)"; \
	done

.PHONY: db-push
db-push:
	@echo "$(CYAN)Applying database schemas...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(CYAN)Pushing schema for $$service...$(NC)"; \
		cd apps/$$service && $(NPM) run db:push || exit 1; \
		cd ../..; \
		echo "$(GREEN)✓ $$service schema applied$(NC)"; \
	done

.PHONY: db-migrate
db-migrate:
	@echo "$(CYAN)Running database migrations...$(NC)"
	@for service in $(SERVICES); do \
		if [ -f apps/$$service/package.json ] && grep -q '"db:migrate"' apps/$$service/package.json; then \
			echo "$(CYAN)Migrating $$service database...$(NC)"; \
			cd apps/$$service && $(NPM) run db:migrate || exit 1; \
			cd ../..; \
			echo "$(GREEN)✓ $$service migrated$(NC)"; \
		fi \
	done

.PHONY: db-studio
db-studio:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified. Usage: make db-studio SERVICE=auth$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Opening Drizzle Studio for $(SERVICE)...$(NC)"
	@cd apps/$(SERVICE) && $(NPM) run db:studio

.PHONY: db-reset
db-reset:
	@echo "$(RED)WARNING: This will destroy all data in the databases!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@$(DOCKER_COMPOSE) down -v
	@make infra-up
	@sleep 10
	@make db-push
	@echo "$(GREEN)✓ Databases reset$(NC)"

# Development commands
.PHONY: dev
dev:
	@echo "$(CYAN)Starting all services in development mode...$(NC)"
	@echo "$(YELLOW)This will open multiple terminal windows/tabs$(NC)"
	@make dev-auth &
	@make dev-url &
	@make dev-analytics &
	@make dev-orchestrator &
	@echo "$(GREEN)✓ All services starting in background$(NC)"
	@echo "$(YELLOW)Use 'make logs SERVICE=<name>' to view specific service logs$(NC)"

.PHONY: dev-auth
dev-auth:
	@echo "$(CYAN)Starting auth service...$(NC)"
	@cd apps/auth && $(NPM) run dev

.PHONY: dev-url
dev-url:
	@echo "$(CYAN)Starting url-shortener service...$(NC)"
	@cd apps/url-shortener && $(NPM) run dev

.PHONY: dev-analytics
dev-analytics:
	@echo "$(CYAN)Starting analytics service...$(NC)"
	@cd apps/analytics && $(NPM) run dev

.PHONY: dev-orchestrator
dev-orchestrator:
	@echo "$(CYAN)Starting orchestrator service...$(NC)"
	@cd apps/orchestrator && $(NPM) run dev

# Production commands
.PHONY: start
start:
	@echo "$(CYAN)Starting all services in production mode...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(CYAN)Starting $$service...$(NC)"; \
		cd apps/$$service && $(NPM) start & \
		cd ../..; \
	done
	@echo "$(GREEN)✓ All services started$(NC)"

.PHONY: start-service
start-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified. Usage: make start-service SERVICE=auth$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Starting $(SERVICE) in production mode...$(NC)"
	@cd apps/$(SERVICE) && $(NPM) start

.PHONY: stop
stop:
	@echo "$(CYAN)Stopping all Node.js processes...$(NC)"
	@pkill -f "node.*src/server.ts" || true
	@echo "$(GREEN)✓ All services stopped$(NC)"

# Code quality
.PHONY: lint
lint:
	@echo "$(CYAN)Running linter on all packages...$(NC)"
	@for pkg in $(ALL_PACKAGES); do \
		echo "$(CYAN)Linting $$pkg...$(NC)"; \
		if [ "$$pkg" = "contracts" ] || [ "$$pkg" = "shared" ]; then \
			cd $$pkg && $(NPM) run lint || exit 1; \
			cd ..; \
		else \
			cd apps/$$pkg && $(NPM) run lint || exit 1; \
			cd ../..; \
		fi; \
		echo "$(GREEN)✓ $$pkg linted$(NC)"; \
	done

.PHONY: format
format:
	@echo "$(CYAN)Formatting code in all packages...$(NC)"
	@for pkg in $(ALL_PACKAGES); do \
		echo "$(CYAN)Formatting $$pkg...$(NC)"; \
		if [ "$$pkg" = "contracts" ] || [ "$$pkg" = "shared" ]; then \
			cd $$pkg && $(NPM) run format || exit 1; \
			cd ..; \
		else \
			cd apps/$$pkg && $(NPM) run format || exit 1; \
			cd ../..; \
		fi; \
		echo "$(GREEN)✓ $$pkg formatted$(NC)"; \
	done

.PHONY: check
check:
	@echo "$(CYAN)Running code quality checks on all packages...$(NC)"
	@for pkg in $(ALL_PACKAGES); do \
		echo "$(CYAN)Checking $$pkg...$(NC)"; \
		if [ "$$pkg" = "contracts" ] || [ "$$pkg" = "shared" ]; then \
			cd $$pkg && $(NPM) run check || exit 1; \
			cd ..; \
		else \
			cd apps/$$pkg && $(NPM) run check || exit 1; \
			cd ../..; \
		fi; \
		echo "$(GREEN)✓ $$pkg checked$(NC)"; \
	done

.PHONY: test
test:
	@echo "$(CYAN)Running tests for all services...$(NC)"
	@for service in $(SERVICES); do \
		if [ -f apps/$$service/package.json ] && grep -q '"test"' apps/$$service/package.json; then \
			echo "$(CYAN)Testing $$service...$(NC)"; \
			cd apps/$$service && $(NPM) test || exit 1; \
			cd ../..; \
			echo "$(GREEN)✓ $$service tested$(NC)"; \
		fi \
	done

.PHONY: test-service
test-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified. Usage: make test-service SERVICE=auth$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Running tests for $(SERVICE)...$(NC)"
	@cd apps/$(SERVICE) && $(NPM) test

# Utilities
.PHONY: logs
logs:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified. Usage: make logs SERVICE=auth$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Showing logs for $(SERVICE)...$(NC)"
	@if [ "$(SERVICE)" = "infra" ]; then \
		$(DOCKER_COMPOSE) logs -f; \
	else \
		cd apps/$(SERVICE) && tail -f *.log 2>/dev/null || echo "No log files found. Service may use console output."; \
	fi

.PHONY: clean
clean:
	@echo "$(CYAN)Cleaning node_modules and lock files...$(NC)"
	@for pkg in $(ALL_PACKAGES); do \
		echo "$(CYAN)Cleaning $$pkg...$(NC)"; \
		if [ "$$pkg" = "contracts" ] || [ "$$pkg" = "shared" ]; then \
			rm -rf $$pkg/node_modules $$pkg/package-lock.json; \
		else \
			rm -rf apps/$$pkg/node_modules apps/$$pkg/package-lock.json; \
		fi; \
		echo "$(GREEN)✓ $$pkg cleaned$(NC)"; \
	done

.PHONY: reset
reset: clean
	@echo "$(RED)WARNING: This will remove all Docker volumes and data!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@$(DOCKER_COMPOSE) down -v
	@echo "$(GREEN)✓ Complete reset done$(NC)"

.PHONY: health-check
health-check:
	@echo "$(CYAN)Checking health of all services...$(NC)"
	@echo "$(CYAN)Auth Service (port 3002):$(NC)"
	@curl -s http://localhost:3002/health | jq . || echo "$(RED)✗ Auth service not responding$(NC)"
	@echo ""
	@echo "$(CYAN)URL Shortener Service (port 3000):$(NC)"
	@curl -s http://localhost:3000/health | jq . || echo "$(RED)✗ URL Shortener service not responding$(NC)"
	@echo ""
	@echo "$(CYAN)Analytics Service (port 3001):$(NC)"
	@curl -s http://localhost:3001/health | jq . || echo "$(RED)✗ Analytics service not responding$(NC)"
	@echo ""
	@echo "$(CYAN)Orchestrator Service (port 3003):$(NC)"
	@curl -s http://localhost:3003/health | jq . || echo "$(RED)✗ Orchestrator service not responding$(NC)"
	@echo ""
	@echo "$(CYAN)Kong Gateway (port 8000):$(NC)"
	@curl -s http://localhost:8000 | jq . || echo "$(RED)✗ Kong Gateway not responding$(NC)"

.PHONY: kafka-topics
kafka-topics:
	@echo "$(CYAN)Listing Kafka topics...$(NC)"
	@docker exec -it 09-fundamentos-microsservicos-kafka-1 kafka-topics --list --bootstrap-server localhost:9092

.PHONY: jaeger-ui
jaeger-ui:
	@echo "$(CYAN)Opening Jaeger UI...$(NC)"
	@open http://localhost:16686 || xdg-open http://localhost:16686 || echo "$(YELLOW)Please open http://localhost:16686 in your browser$(NC)"

.PHONY: kong-ui
kong-ui:
	@echo "$(CYAN)Opening Kong Manager UI...$(NC)"
	@open http://localhost:8002 || xdg-open http://localhost:8002 || echo "$(YELLOW)Please open http://localhost:8002 in your browser$(NC)"

# Quick start guide
.PHONY: quickstart
quickstart:
	@echo "$(CYAN)Quick Start Guide:$(NC)"
	@echo ""
	@echo "1. First time setup:"
	@echo "   $$ make setup"
	@echo ""
	@echo "2. Start development environment:"
	@echo "   $$ make dev"
	@echo ""
	@echo "3. Check service health:"
	@echo "   $$ make health-check"
	@echo ""
	@echo "4. View logs for a specific service:"
	@echo "   $$ make logs SERVICE=auth"
	@echo ""
	@echo "5. Access UIs:"
	@echo "   - Jaeger: http://localhost:16686"
	@echo "   - Kong Manager: http://localhost:8002"
	@echo ""
	@echo "For more commands, run: make help"