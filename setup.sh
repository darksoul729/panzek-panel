#!/usr/bin/env bash
# =============================================================================
#  Home Server Panel — One-Shot Setup Script
#  Jalankan: bash setup.sh
#  Atau dari repo langsung: bash <(curl -fsSL https://raw.githubusercontent.com/YOURUSERNAME/home-server-panel/main/setup.sh)
# =============================================================================

set -euo pipefail

# ─── Warna ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Konfigurasi default (bisa dioverride via env) ────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/darksoul729/panzek-panel.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/home-server-panel}"
PANEL_PORT="${PANEL_PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DB_USER="${DB_USER:-panel}"
DB_PASSWORD="${DB_PASSWORD:-panel_secret_$(openssl rand -hex 8)}"
DB_NAME="${DB_NAME:-homeserver}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-mysql_root_$(openssl rand -hex 8)}"
CLOUDFLARE_TUNNEL_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"   # Isi atau set via env jika pakai tunnel
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

# ─── Helper ───────────────────────────────────────────────────────────────────
log()     { echo -e "${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✘] ERROR:${NC} $*" >&2; }
info()    { echo -e "${CYAN}[→]${NC} $*"; }
section() { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $*${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════${NC}"; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    error "Script ini harus dijalankan sebagai root."
    echo "  Jalankan: sudo bash $0"
    exit 1
  fi
}

command_exists() { command -v "$1" &>/dev/null; }

detect_os() {
  if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    OS_ID="${ID}"
    OS_LIKE="${ID_LIKE:-}"
  else
    error "OS tidak terdeteksi."
    exit 1
  fi
}

pkg_install() {
  if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_LIKE" == *"debian"* ]]; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
  elif [[ "$OS_ID" == "fedora" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" || "$OS_LIKE" == *"rhel"* ]]; then
    dnf install -y "$@"
  elif [[ "$OS_ID" == "arch" ]]; then
    pacman -S --noconfirm "$@"
  else
    error "Package manager tidak dikenal untuk OS: $OS_ID"
    exit 1
  fi
}

pkg_update() {
  if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_LIKE" == *"debian"* ]]; then
    DEBIAN_FRONTEND=noninteractive apt-get update -qq
  elif [[ "$OS_ID" == "fedora" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" || "$OS_LIKE" == *"rhel"* ]]; then
    dnf check-update -y || true
  elif [[ "$OS_ID" == "arch" ]]; then
    pacman -Sy --noconfirm
  fi
}

# ─── Banner ───────────────────────────────────────────────────────────────────
print_banner() {
  echo -e "${BOLD}${CYAN}"
  cat << 'EOF'
  ╔═══════════════════════════════════════════════╗
  ║       🏠  Home Server Panel Installer          ║
  ║   Stack: Go · React/Vite · PostgreSQL · MySQL  ║
  ║          Traefik · Docker · Cloudflare         ║
  ╚═══════════════════════════════════════════════╝
EOF
  echo -e "${NC}"
}

# ─── 1. Dependensi sistem ──────────────────────────────────────────────────────
install_system_deps() {
  section "1. System Dependencies"

  pkg_update

  COMMON_PKGS=(curl wget git ca-certificates gnupg lsb-release openssl unzip)
  info "Menginstall: ${COMMON_PKGS[*]}"
  pkg_install "${COMMON_PKGS[@]}"
  log "Dependensi sistem tersedia"
}

# ─── 2. Docker ────────────────────────────────────────────────────────────────
install_docker() {
  section "2. Docker & Docker Compose"

  if command_exists docker; then
    log "Docker sudah terinstall: $(docker --version)"
  else
    info "Menginstall Docker..."
    if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_LIKE" == *"debian"* ]]; then
      # Official Docker install script
      curl -fsSL https://get.docker.com | bash
    elif [[ "$OS_ID" == "fedora" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" || "$OS_LIKE" == *"rhel"* ]]; then
      dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    elif [[ "$OS_ID" == "arch" ]]; then
      pacman -S --noconfirm docker docker-compose
    fi
    log "Docker terinstall: $(docker --version)"
  fi

  # Aktifkan & start Docker
  systemctl enable docker --now
  log "Docker service aktif"

  # Tambahkan user saat ini ke grup docker (jika bukan root direct)
  if [[ -n "${SUDO_USER:-}" ]]; then
    usermod -aG docker "$SUDO_USER"
    log "User $SUDO_USER ditambahkan ke grup docker"
  fi

  # Docker Compose v2 (plugin)
  if command_exists docker && docker compose version &>/dev/null; then
    log "Docker Compose sudah tersedia: $(docker compose version)"
  else
    warn "Docker Compose plugin belum tersedia, mencoba install..."
    COMPOSE_VERSION=$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
    curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    # Buat symlink ke plugin folder
    mkdir -p /usr/local/lib/docker/cli-plugins
    ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
    log "Docker Compose terinstall: $(docker compose version)"
  fi
}

# ─── 3. Go ────────────────────────────────────────────────────────────────────
install_go() {
  section "3. Go Runtime (1.22+)"

  local REQUIRED_GO_VERSION="1.22"

  go_installed_and_ok() {
    if command_exists go; then
      local ver
      ver=$(go version | awk '{print $3}' | sed 's/go//')
      IFS='.' read -r major minor _ <<< "$ver"
      IFS='.' read -r req_major req_minor _ <<< "$REQUIRED_GO_VERSION"
      [[ "$major" -gt "$req_major" ]] || { [[ "$major" -eq "$req_major" ]] && [[ "$minor" -ge "$req_minor" ]]; }
    else
      return 1
    fi
  }

  if go_installed_and_ok; then
    log "Go sudah OK: $(go version)"
    return
  fi

  info "Menginstall Go ${REQUIRED_GO_VERSION}..."
  local GO_VERSION
  GO_VERSION=$(curl -fsSL "https://go.dev/VERSION?m=text" | head -1)
  local ARCH
  ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
  case "$ARCH" in
    amd64|x86_64)   GOARCH="amd64" ;;
    arm64|aarch64)  GOARCH="arm64" ;;
    armv7l|armhf)   GOARCH="armv6l" ;;
    *)               GOARCH="amd64" ;;
  esac

  local GO_TAR="${GO_VERSION}.linux-${GOARCH}.tar.gz"
  curl -fsSL "https://go.dev/dl/${GO_TAR}" -o "/tmp/${GO_TAR}"
  rm -rf /usr/local/go
  tar -C /usr/local -xzf "/tmp/${GO_TAR}"
  rm "/tmp/${GO_TAR}"

  # Tambah ke PATH
  if ! grep -q '/usr/local/go/bin' /etc/profile.d/go.sh 2>/dev/null; then
    echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
  fi
  export PATH="$PATH:/usr/local/go/bin"

  log "Go terinstall: $(go version)"
}

# ─── 4. Node.js & npm ─────────────────────────────────────────────────────────
install_nodejs() {
  section "4. Node.js 20 LTS & npm"

  local REQUIRED_NODE_MAJOR=18

  node_ok() {
    if command_exists node; then
      local ver
      ver=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
      [[ "$ver" -ge "$REQUIRED_NODE_MAJOR" ]]
    else
      return 1
    fi
  }

  if node_ok; then
    log "Node.js sudah OK: $(node --version)"
    return
  fi

  info "Menginstall Node.js 20 LTS via NodeSource..."
  if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_LIKE" == *"debian"* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  elif [[ "$OS_ID" == "fedora" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" || "$OS_LIKE" == *"rhel"* ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
  elif [[ "$OS_ID" == "arch" ]]; then
    pacman -S --noconfirm nodejs npm
  fi

  log "Node.js: $(node --version) | npm: $(npm --version)"
}

# ─── 5. Clone / Update repo ───────────────────────────────────────────────────
setup_repo() {
  section "5. Clone Repository"

  if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Repo sudah ada, melakukan git pull..."
    cd "$INSTALL_DIR"
    git pull origin main || git pull origin master || warn "Tidak bisa pull, lanjut dengan kode yang ada."
  elif [[ "$INSTALL_DIR" == "$(pwd)" ]]; then
    info "Script dijalankan dari dalam repo, skip clone."
  else
    info "Cloning ke $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi

  log "Repo siap di $INSTALL_DIR"
}

# ─── 6. Konfigurasi environment ───────────────────────────────────────────────
setup_env() {
  section "6. Environment Configuration"

  cd "$INSTALL_DIR"

  # Buat .tunnel.env jika tidak ada atau kosong token
  if [[ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]]; then
    echo "TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}" > .tunnel.env
    log ".tunnel.env dikonfigurasi dengan token Cloudflare"
  elif [[ ! -f .tunnel.env ]] || ! grep -q "TUNNEL_TOKEN=" .tunnel.env; then
    warn ".tunnel.env tidak ada token — Cloudflare tunnel akan dinonaktifkan."
    echo "# Isi TUNNEL_TOKEN untuk mengaktifkan Cloudflare Tunnel" > .tunnel.env
    echo "TUNNEL_TOKEN=" >> .tunnel.env
  else
    log ".tunnel.env sudah ada"
  fi

  # Buat .env untuk backend (override docker-compose defaults)
  if [[ ! -f .env ]]; then
    info "Membuat .env ..."
    cat > .env << EOF
# Panel Configuration — dibuat otomatis oleh setup.sh
PANEL_DB_HOST=db
PANEL_DB_USER=${DB_USER}
PANEL_DB_PASSWORD=${DB_PASSWORD}
PANEL_DB_NAME=${DB_NAME}
PANEL_DB_PORT=5432
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_HOST=mysql
ADMIN_PASSWORD=${ADMIN_PASSWORD}
PANEL_PORT=${PANEL_PORT}
EOF
    log ".env dibuat"
  else
    log ".env sudah ada, tidak dioverwrite"
  fi

  # Patch docker-compose.yml agar pakai .env untuk password
  # (docker-compose sudah membaca .env secara otomatis)
  log "Environment dikonfigurasi"
}

# ─── 7. Build Frontend React/Vite ─────────────────────────────────────────────
build_frontend() {
  section "7. Build Frontend (React + Vite + TypeScript)"

  cd "$INSTALL_DIR/frontend"
  info "npm install..."
  npm install --prefer-offline --no-audit 2>&1 | tail -5

  info "npm run build (tsc + vite build) with relative API..."
  VITE_API_URL=/api npm run build 2>&1 | tail -10

  log "Frontend built di frontend/dist/"
  
  # Sync to root web directory for Go server
  info "Syncing build to web/ directory..."
  rm -rf "$INSTALL_DIR/web"
  cp -r "$INSTALL_DIR/frontend/dist" "$INSTALL_DIR/web"
  log "Assets ready at $INSTALL_DIR/web"
  cd "$INSTALL_DIR"
}

# ─── 8. Build Backend Go ──────────────────────────────────────────────────────
build_backend() {
  section "8. Build Backend (Go 1.22 + GoFiber)"

  cd "$INSTALL_DIR"
  export PATH="$PATH:/usr/local/go/bin"

  info "go mod download..."
  go mod download

  info "go build..."
  CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o panel-server cmd/server/main.go

  chmod +x panel-server
  log "Backend binary: $INSTALL_DIR/panel-server"
}

# ─── 9. Docker Services ───────────────────────────────────────────────────────
start_services() {
  section "9. Starting Services (Docker Compose)"

  cd "$INSTALL_DIR"

  # Handle tunnel service — skip jika token kosong
  COMPOSE_ARGS=""
  if ! grep -q "TUNNEL_TOKEN=." .tunnel.env 2>/dev/null; then
    warn "Cloudflare tunnel token kosong — menjalankan tanpa tunnel service"
    COMPOSE_ARGS="--scale tunnel=0"
  fi

  info "docker compose pull (mengambil image terbaru)..."
  docker compose pull --quiet 2>&1 | tail -5 || true

  info "docker compose up --build -d ..."
  # shellcheck disable=SC2086
  docker compose up --build -d $COMPOSE_ARGS

  info "Menunggu database siap..."
  local max_attempts=30
  local attempt=0
  until docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      error "Database tidak siap setelah ${max_attempts} percobaan."
      docker compose logs db | tail -20
      exit 1
    fi
    echo -n "."
    sleep 2
  done
  echo ""
  log "PostgreSQL siap"

  log "Semua service berjalan. Cek: docker compose ps"
}

# ─── 10. Firewall ─────────────────────────────────────────────────────────────
configure_firewall() {
  section "10. Firewall"

  if command_exists ufw; then
    info "Membuka port ${PANEL_PORT} dan ${FRONTEND_PORT} di ufw..."
    ufw allow "${PANEL_PORT}/tcp" || true
    ufw allow "${FRONTEND_PORT}/tcp" || true
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    log "ufw dikonfigurasi"
  elif command_exists firewall-cmd; then
    info "Membuka port di firewalld..."
    firewall-cmd --permanent --add-port="${PANEL_PORT}/tcp" || true
    firewall-cmd --permanent --add-port="${FRONTEND_PORT}/tcp" || true
    firewall-cmd --permanent --add-port=80/tcp || true
    firewall-cmd --permanent --add-port=443/tcp || true
    firewall-cmd --reload || true
    log "firewalld dikonfigurasi"
  else
    warn "Tidak ada firewall manager ditemukan (ufw/firewalld). Lewati."
  fi
}

# ─── 11. Systemd service (opsional untuk restart otomatis) ───────────────────
setup_systemd() {
  section "11. Systemd Auto-Start"

  cat > /etc/systemd/system/home-server-panel.service << EOF
[Unit]
Description=Home Server Panel (Docker Compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=forking
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
RemainAfterExit=yes
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable home-server-panel
  log "Systemd service 'home-server-panel' aktif (auto-start saat reboot)"
}

# ─── 12. Health check & ringkasan ─────────────────────────────────────────────
final_summary() {
  section "✅ Installation Complete!"

  # Dapatkan IP server
  local SERVER_IP
  SERVER_IP=$(hostname -I | awk '{print $1}')

  # Simpan kredensial
  local CRED_FILE="$INSTALL_DIR/.credentials"
  cat > "$CRED_FILE" << EOF
# ==========================================
# Home Server Panel — Credentials
# Dibuat: $(date)
# ==========================================
Panel URL      : http://${SERVER_IP}:${PANEL_PORT}
Frontend URL   : http://${SERVER_IP}:${FRONTEND_PORT}
Traefik        : http://${SERVER_IP}:8080

Username       : admin
Password       : ${ADMIN_PASSWORD}

PostgreSQL
  Host         : localhost:5433
  User         : ${DB_USER}
  Password     : ${DB_PASSWORD}
  DB           : ${DB_NAME}

MySQL
  Host         : localhost:3310
  Root Pass    : ${MYSQL_ROOT_PASSWORD}
EOF
  chmod 600 "$CRED_FILE"

  echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════╗"
  echo -e "║         🎉 Akses Panel Kamu              ║"
  echo -e "╠══════════════════════════════════════════╣"
  echo -e "║  Backend API  : http://${SERVER_IP}:${PANEL_PORT}      ║"
  echo -e "║  Frontend Dev : http://${SERVER_IP}:${FRONTEND_PORT}     ║"
  echo -e "║  Traefik UI   : http://${SERVER_IP}:8080     ║"
  echo -e "╠══════════════════════════════════════════╣"
  echo -e "║  Username : admin                        ║"
  echo -e "║  Password : ${ADMIN_PASSWORD}                   ║"
  echo -e "╠══════════════════════════════════════════╣"
  echo -e "║  Credentials tersimpan di:               ║"
  echo -e "║  ${CRED_FILE}      ║"
  echo -e "╚══════════════════════════════════════════╝${NC}\n"

  echo -e "${YELLOW}⚠️  PENTING: Ganti password admin segera setelah login!${NC}"
  echo ""
  echo -e "${CYAN}Perintah berguna:${NC}"
  echo "  docker compose -f ${INSTALL_DIR}/docker-compose.yml ps"
  echo "  docker compose -f ${INSTALL_DIR}/docker-compose.yml logs -f app"
  echo "  systemctl status home-server-panel"
  echo ""
}

# ─── Entrypoint ───────────────────────────────────────────────────────────────
main() {
  print_banner
  require_root
  detect_os

  info "OS terdeteksi: ${OS_ID}"
  info "Install dir  : ${INSTALL_DIR}"
  info "Panel port   : ${PANEL_PORT}"
  echo ""

  install_system_deps
  install_docker
  install_go
  install_nodejs
  setup_repo
  setup_env
  build_frontend
  build_backend
  start_services
  configure_firewall
  setup_systemd
  final_summary
}

main "$@"
