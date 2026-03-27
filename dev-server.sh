#!/bin/bash
# Development Server Runner

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Home Server Panel - Dev Server"
echo "========================================"
echo ""

# Check PHP
if ! command -v php &> /dev/null; then
    echo "❌ PHP is not installed!"
    echo "Install PHP first:"
    echo "  Ubuntu/Debian: sudo apt install php php-sqlite3"
    echo "  macOS: brew install php"
    echo "  Windows: Download from php.net"
    exit 1
fi

echo "✓ PHP version: $(php -v | head -n1)"
echo ""

# Create data directory if not exists
mkdir -p data logs

# Set permissions (for Linux/Mac)
if [[ "$OSTYPE" != "msys" ]]; then
    chmod 777 data logs 2>/dev/null || true
fi

# Initialize database
echo "Initializing database..."
php -r "
require_once 'config/config.php';
\$db = new PDO('sqlite:' . __DIR__ . '/data/panel.db');
\$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Create tables
\$db->exec('CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT \"user\",
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)');

\$db->exec('CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    port INTEGER,
    status TEXT DEFAULT \"stopped\",
    auto_start INTEGER DEFAULT 0
)');

\$db->exec('CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)');

// Create default admin
\$stmt = \$db->query('SELECT COUNT(*) as count FROM users');
if (\$stmt->fetch()['count'] == 0) {
    \$password = password_hash('admin123', PASSWORD_DEFAULT);
    \$db->exec(\"INSERT INTO users (username, password, role) VALUES ('admin', '\$password', 'admin')\");
    echo \"✓ Default admin user created\n\";
}

echo \"✓ Database initialized\n\";
"

echo ""
echo "========================================"
echo "  Starting Development Server"
echo "========================================"
echo ""
echo "📍 Server URL: http://localhost:8000"
echo "📁 Project Dir: $SCRIPT_DIR"
echo ""
echo "Default Login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "⚠️  Press Ctrl+C to stop the server"
echo "========================================"
echo ""

# Start PHP built-in server
php -S localhost:8000 -t web/
