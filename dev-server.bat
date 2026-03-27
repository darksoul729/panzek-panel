@echo off
REM Development Server Runner for Windows

echo ========================================
echo   Home Server Panel - Dev Server
echo ========================================
echo.

REM Check PHP
where php >nul 2>nul
if %errorlevel% neq 0 (
    echo X PHP is not installed!
    echo Install PHP from: https://www.php.net/downloads
    pause
    exit /b 1
)

echo PHP version:
php -v | findstr /R "^PHP"
echo.

REM Create directories
if not exist data mkdir data
if not exist logs mkdir logs

REM Initialize database
echo Initializing database...
php -r "require_once 'config/config.php'; $db = new PDO('sqlite:' . __DIR__ . '/data/panel.db'); $db->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT \"user\", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'); $db->exec('CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, port INTEGER, status TEXT DEFAULT \"stopped\", auto_start INTEGER DEFAULT 0)'); $db->exec('CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, description TEXT, ip_address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'); $stmt = $db->query('SELECT COUNT(*) as count FROM users'); if ($stmt->fetch()['count'] == 0) { $password = password_hash('admin123', PASSWORD_DEFAULT); $db->exec(\"INSERT INTO users (username, password, role) VALUES ('admin', '$password', 'admin')\"); echo \"Default admin user created\n\"; } echo \"Database initialized\n\";"

echo.
echo ========================================
echo   Starting Development Server
echo ========================================
echo.
echo Server URL: http://localhost:8000
echo.
echo Default Login:
echo   Username: admin
echo   Password: admin123
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start PHP built-in server
php -S localhost:8000 -t web/
