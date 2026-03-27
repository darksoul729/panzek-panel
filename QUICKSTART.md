# Quick Start Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Go 1.22+](https://go.dev/doc/install) (for local development)
- [Node.js 18+](https://nodejs.org/en/download/) (for local development)

## Running with Docker (easiest)

1. Clone or enter the project directory:
   ```bash
   cd /home/panzek/project-menuju-sukses/home-server-panel
   ```
2. Start the full stack:
   ```bash
   docker-compose up --build
   ```
3. Access the panel:
   - **Frontend (Dev):** `http://localhost:5173`
   - **Dashboard (Traefik):** `http://panel.localhost`

## Running for Development

### 1. Database
Ensure you have a PostgreSQL database running. You can use the one from docker-compose:
```bash
docker-compose up -d db
```

### 2. Backend (Go)
```bash
# Install dependencies
go mod download

# Set Environment Variables (see docker-compose.yml for examples)
export PANEL_DB_HOST=localhost
export PANEL_DB_PORT=5433
export PANEL_DB_USER=panel
export PANEL_DB_PASSWORD=panel_secret
export PANEL_DB_NAME=homeserver

# Run the backend
go run cmd/server/main.go
```
*Backend runs on port 3000.*

### 3. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on port 5173.*

## First Login

1. Open your browser and navigate to the frontend URL.
2. Login with the default credentials:
   - **Username:** `admin`
   - **Password:** `admin123`

⚠️ **Change your password immediately after first login!**

## Basic Usage

- **Dashboard:** Monitor CPU, RAM, and Disk usage in real-time.
- **Services:** Manage system services (nginx, docker, etc.).
- **Files:** Browse and edit server files.
- **Sites:** Deploy and manage web projects.
- **Databases:** Manage your PostgreSQL and MySQL instances.
- **Terminal:** Use the built-in web terminal for direct server access.

## Troubleshooting

- **Database Connection Error:** Ensure the `db` service is healthy in Docker.
- **Port Conflict:** If port 3000 or 5173 is in use, change them in `cmd/server/main.go` or `frontend/vite.config.ts`.
- **Permission Denied:** Ensure your user has access to `/var/run/docker.sock` if using Docker-related features.
