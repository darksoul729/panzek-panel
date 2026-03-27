# Home Server Panel

A modern, high-performance web-based control panel for managing your home server, built with Go and React.

## 🚀 Features

- 📊 **Dashboard** - Real-time system monitoring (CPU, Memory, Disk, Uptime)
- 💻 **System Info** - Detailed hardware and OS information
- ⚙️ **Services** - Manage system services (Start/Stop/Restart)
- 📋 **Logs** - Real-time log viewer for system and applications
- 📁 **File Manager** - Integrated file explorer with editor
- 🌐 **Sites** - Manage web sites and deployments
- 💾 **Databases** - Manage PostgreSQL and MySQL databases
- 🛠️ **Terminal** - Integrated web terminal (via WebSockets)

## 🛠️ Technology Stack

- **Backend:** [Go](https://go.dev/) (Framework: [Fiber](https://gofiber.io/))
- **Frontend:** [React](https://react.dev/) (Build tool: [Vite](https://vitejs.dev/))
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (ORM: [GORM](https://gorm.io/))
- **Reverse Proxy:** [Traefik](https://traefik.io/)

## 🏁 Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to run the full stack (Traefik, Go App, Postgres, MySQL):

```bash
docker-compose up --build
```

Access the panel at: `http://localhost:5173` (Dev) or `http://panel.localhost` (via Traefik).

### Option 2: Manual Development

#### Backend (Go)
1. Ensure PostgreSQL is running (see `docker-compose.yml` for required ENV variables).
2. Run the server:
   ```bash
   go run cmd/server/main.go
   ```
   *Backend will start on port 3000.*

#### Frontend (React)
1. Enter the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
   *Frontend will start on port 5173.*

## 🔑 Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change the default password immediately after login!**

## 📂 Directory Structure

```
home-server-panel/
├── cmd/server/          # Backend entry point (Go)
├── internal/            # Backend logic (Handlers, Data, Middleware)
├── frontend/            # React application (Vite)
├── traefik/             # Traefik configuration
├── sites/               # User-hosted sites data
├── data/                # Database and persistent data
└── docker-compose.yml   # Full stack orchestration
```

## 🛡️ Security Notes

1. Always use HTTPS in production (configured automatically via Traefik).
2. Restrict access to the panel using IP whitelisting or strong authentication.
3. Regularly back up your PostgreSQL/MySQL data.

## 📝 Troubleshooting

Refer to `DEBUGGING.md` for detailed troubleshooting steps and common issues.

## 📄 License

MIT License - Feel free to use and modify!
