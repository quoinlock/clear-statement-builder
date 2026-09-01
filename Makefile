# Local development shortcuts around docker compose.
# `make help` lists targets; `make dev` is the day-to-day loop.

COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help build start dev restart rebuild stop destroy status logs

# Appended to every lifecycle target: what exists now, and on which ports.
define STATE
	@echo ""
	@if [ -n "$$($(COMPOSE) --profile dev ps -aq)" ]; then \
		$(COMPOSE) --profile dev ps -a --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'; \
	else \
		echo "no containers exist — 'make start' (web) or 'make dev' (Vite)"; \
	fi
endef

help: ## Show this help
	@grep -E '^[a-z]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

build: ## Build the production and dev images
	$(COMPOSE) --profile dev build
	@echo "==> images built; nothing started"
	$(STATE)

start: ## Start the production build in the background (http://localhost:8090, override with CSB_PORT)
	$(COMPOSE) up -d web
	@echo "==> web running at http://localhost:$${CSB_PORT:-8090} (container port 8080)"
	$(STATE)

dev: ## Run the Vite dev server with HMR in the foreground (http://localhost:5173)
	@echo "==> starting Vite dev server at http://localhost:5173 (Ctrl-C to stop)"
	$(COMPOSE) up dev
	@echo "==> dev server stopped; its container remains until 'make destroy'"
	$(STATE)

restart: ## Restart running containers without rebuilding
	$(COMPOSE) restart
	@echo "==> containers restarted (same images, no rebuild)"
	$(STATE)

rebuild: ## Rebuild the production image and restart it
	$(COMPOSE) up -d --build web
	@echo "==> web rebuilt from current sources and running at http://localhost:$${CSB_PORT:-8090}"
	$(STATE)

stop: ## Stop containers, keep them and the images
	$(COMPOSE) --profile dev stop
	@echo "==> containers stopped but kept; ports released; 'make start' resumes"
	$(STATE)

destroy: ## Remove containers, network, volumes, and locally built images
	$(COMPOSE) --profile dev down --rmi local --volumes
	@echo "==> containers, network, volumes, and local images removed"
	$(STATE)

status: ## Show container state, health, and port mappings
	$(STATE)

logs: ## Tail container logs
	$(COMPOSE) logs -f
