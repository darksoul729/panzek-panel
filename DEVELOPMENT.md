# Development Setup Guide

## Prerequisites

- **Go:** 1.22 or higher
- **Node.js:** 18 or higher (with npm)
- **PostgreSQL:** 15 or higher
- **Docker & Docker Compose:** For running the full stack easily

## Local Development Workflow

### 1. Database Setup
You need a running PostgreSQL instance. The easiest way is to use the `db` service from `docker-compose.yml`:

```bash
docker-compose up -d db
```

### 2. Backend Development (Go)
The backend is a Fiber-based API located in the root directory.

```bash
# Install Go dependencies
go mod download

# Set required environment variables
export PANEL_DB_HOST=localhost
export PANEL_DB_PORT=5433  # Port mapped in docker-compose for local access
export PANEL_DB_USER=panel
export PANEL_DB_PASSWORD=panel_secret
export PANEL_DB_NAME=homeserver

# Run the backend with hot-reload (optional, using air)
# install air: go install github.com/air-verse/air@latest
air -c .air.toml 

# Or run normally
go run cmd/server/main.go
```
*The API will be available at `http://localhost:3000`.*

### 3. Frontend Development (React)
The frontend is a Vite + React application in the `frontend` directory.

```bash
cd frontend
npm install
npm run dev
```
*The frontend will be available at `http://localhost:5173`.*

## API Testing

You can use `curl` or any API client (Postman, Insomnia) to test the backend:

**Check Auth Status:**
```bash
curl http://localhost:3000/api/auth/check
```

**Get System Info:**
```bash
curl http://localhost:3000/api/system/info
```

## Project Structure

- `cmd/server/main.go`: Backend entry point and route definitions.
- `internal/handlers/`: API request handlers.
- `internal/data/`: Database models and GORM initialization.
- `frontend/src/`: React components and logic.
- `frontend/src/pages/`: Individual panel pages (Dashboard, Services, etc.).

## Troubleshooting

### CORS Issues
The backend is configured to allow requests from `http://localhost:5173`. Ensure your frontend is running on this port or update the CORS config in `cmd/server/main.go`.

### Database Connection
If the backend fails to start, verify the PostgreSQL credentials and ensure the database is reachable from your host machine.

### Node Modules
If you encounter frontend build errors, try deleting `node_modules` and re-running `npm install`.

## Code Standards
- **Backend:** Follow standard Go linting rules. Use `go fmt` before committing.
- **Frontend:** ESLint and Prettier are configured. Use `npm run lint`.
