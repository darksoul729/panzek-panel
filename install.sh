#!/bin/bash
# Home Server Panel Installation Script

set -e

echo "========================================"
echo "  Home Server Panel - Installation"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="/var/www/html/home-server-panel"

echo -e "${YELLOW}Installation Directory: $INSTALL_DIR${NC}"
echo ""

# Check if directory exists
if [ -d "$INSTALL_DIR" ]; then
    read -p "Directory exists. Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -rf "$INSTALL_DIR"
fi

# Create installation directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"

# Copy files
echo "Copying files..."
cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"

# Set permissions
echo "Setting permissions..."
chown -R www-data:www-data "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
chmod -R 777 "$INSTALL_DIR/data"
chmod -R 777 "$INSTALL_DIR/logs"
chmod +x "$INSTALL_DIR/scripts/"*.sh

# Check PHP
echo "Checking PHP installation..."
if ! command -v php &> /dev/null; then
    echo -e "${RED}PHP is not installed!${NC}"
    echo "Installing PHP..."
    apt update
    apt install -y php php-sqlite3 php-json
fi

# Check SQLite
echo "Checking SQLite..."
if ! php -m | grep -q sqlite3; then
    echo -e "${YELLOW}Installing PHP SQLite extension...${NC}"
    apt install -y php-sqlite3
fi

# Check web server
WEB_SERVER=""
if systemctl is-active --quiet nginx; then
    WEB_SERVER="nginx"
    echo -e "${GREEN}Nginx detected${NC}"
elif systemctl is-active --quiet apache2; then
    WEB_SERVER="apache2"
    echo -e "${GREEN}Apache detected${NC}"
fi

if [ -z "$WEB_SERVER" ]; then
    echo -e "${YELLOW}No web server detected. Installing Nginx...${NC}"
    apt update
    apt install -y nginx
    WEB_SERVER="nginx"
fi

# Configure web server
if [ "$WEB_SERVER" = "nginx" ]; then
    echo "Configuring Nginx..."
    cat > /etc/nginx/sites-available/home-server-panel << EOF
server {
    listen 8080;
    server_name _;
    
    root $INSTALL_DIR/web;
    index index.html index.php;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Protect sensitive directories
    location ~ ^/(api|config|data|scripts|logs) {
        deny all;
        return 404;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/home-server-panel /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx
    
    echo -e "${GREEN}Nginx configured on port 8080${NC}"
fi

# Configure sudo for service management
echo "Configuring sudo for service management..."
if ! grep -q "www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl" /etc/sudoers; then
    echo "www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl" >> /etc/sudoers
    echo -e "${GREEN}Sudo configured${NC}"
fi

# Initialize database
echo "Initializing database..."
php "$INSTALL_DIR/api/core.php" > /dev/null 2>&1 || true

# Create backup directory
mkdir -p "$INSTALL_DIR/data/backups"
chmod 777 "$INSTALL_DIR/data/backups"

# Final permissions
chown -R www-data:www-data "$INSTALL_DIR"

echo ""
echo "========================================"
echo -e "${GREEN}  Installation Complete!${NC}"
echo "========================================"
echo ""
echo "Access the panel at:"
echo "  http://your-server-ip:8080"
echo ""
echo "Default credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change the default password immediately!${NC}"
echo ""
echo "Installation log: $INSTALL_DIR/logs/install.log"
echo ""

# Save installation info
cat > "$INSTALL_DIR/logs/install.log" << EOF
Installation Date: $(date)
Web Server: $WEB_SERVER
Install Directory: $INSTALL_DIR
Access Port: 8080
EOF

echo "Done!"
