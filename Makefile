# Co-Star for Founders — judge-facing commands
#
# Fastest path: open the project on Replit and press Run (keys are wired there).
# These targets are for running locally. Requires Node.js 24 + pnpm.

.PHONY: help install api mobile dev demo typecheck build clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install all monorepo dependencies
	pnpm install

api: ## Start the API server (advisors backend, port 5000)
	pnpm --filter @workspace/api-server run dev

mobile: ## Start the Expo dev server (prints the QR code for Expo Go)
	pnpm --filter @workspace/mobile run dev

# One command for judges: installs, then runs API + Expo together.
# Scan the QR code that appears with the Expo Go app on your phone.
demo: install ## Install + run API and Expo together (scan the QR code)
	@echo "Starting API server and Expo dev server..."
	@echo "When Expo finishes bundling, scan the QR code with Expo Go."
	@( pnpm --filter @workspace/api-server run dev & \
	   pnpm --filter @workspace/mobile run dev & \
	   wait )

# Alias
dev: demo ## Alias for 'demo'

typecheck: ## Typecheck every package
	pnpm run typecheck

build: ## Typecheck + build all packages
	pnpm run build

clean: ## Remove build output and node_modules
	pnpm -r exec rm -rf dist .expo node_modules
	rm -rf node_modules
