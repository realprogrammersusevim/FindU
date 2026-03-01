default:
    @just --list

# ── Frontend ──────────────────────────────────────────────────────────────────

# Format frontend with Prettier
fmt-frontend:
    cd frontend && pnpm prettier --write .

# Check frontend formatting without writing
fmt-frontend-check:
    cd frontend && pnpm prettier --check .

# Typecheck frontend with tsc
check-frontend:
    cd frontend && pnpm tsc --noEmit

# ── Backend ───────────────────────────────────────────────────────────────────

# Format backend with Ruff
fmt-backend:
    cd backend && uv run ruff format .

# Check backend formatting without writing
fmt-backend-check:
    cd backend && uv run ruff format --check .

# Typecheck backend with ty
check-backend:
    cd backend && uv run ty check .

# ── Combined ──────────────────────────────────────────────────────────────────

# Format everything
fmt: fmt-frontend fmt-backend

# Typecheck everything
check: check-frontend check-backend

# Format and typecheck everything
lint: fmt check
