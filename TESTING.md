# Testing Guide - Panzek Panel

## Development Server

### Start Server
```bash
cd /home/panzek/project-menuju-sukses/home-server-panel
./dev-server.sh
```

Or manually:
```bash
php -d opcache.enable=0 -S 0.0.0.0:8000
```

### Access
- **URL:** http://localhost:8000/web/
- **API:** http://localhost:8000/api/router.php

## Testing APIs with cURL

### 1. System Information

```bash
# Get system info
curl "http://localhost:8000/api/router.php?endpoint=system&action=info"

# Get CPU usage
curl "http://localhost:8000/api/router.php?endpoint=system&action=cpu"

# Get memory usage
curl "http://localhost:8000/api/router.php?endpoint=system&action=memory"

# Get disk usage
curl "http://localhost:8000/api/router.php?endpoint=system&action=disk"

# Get network info
curl "http://localhost:8000/api/router.php?endpoint=system&action=network"
```

### 2. Authentication

```bash
# Login (save cookies)
curl -X POST "http://localhost:8000/api/router.php?endpoint=auth&action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c /tmp/cookies.txt

# Check auth status
curl "http://localhost:8000/api/router.php?endpoint=auth&action=check" \
  -b /tmp/cookies.txt

# Logout
curl "http://localhost:8000/api/router.php?endpoint=auth&action=logout" \
  -b /tmp/cookies.txt
```

### 3. Services Management (Requires Auth)

```bash
# List all services
curl "http://localhost:8000/api/router.php?endpoint=services&action=list" \
  -b /tmp/cookies.txt

# Add new service
curl -X POST "http://localhost:8000/api/router.php?endpoint=services&action=add" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"test-service","port":8080,"auto_start":1}'

# Start service
curl -X POST "http://localhost:8000/api/router.php?endpoint=services&action=start" \
  -b /tmp/cookies.txt \
  -d "name=nginx"

# Stop service
curl -X POST "http://localhost:8000/api/router.php?endpoint=services&action=stop" \
  -b /tmp/cookies.txt \
  -d "name=nginx"

# Restart service
curl -X POST "http://localhost:8000/api/router.php?endpoint=services&action=restart" \
  -b /tmp/cookies.txt \
  -d "name=nginx"

# Remove service
curl -X POST "http://localhost:8000/api/router.php?endpoint=services&action=remove" \
  -b /tmp/cookies.txt \
  -d "id=1"
```

### 4. Logs

```bash
# Get system logs
curl "http://localhost:8000/api/router.php?endpoint=logs&action=system" \
  -b /tmp/cookies.txt

# Get activity logs
curl "http://localhost:8000/api/router.php?endpoint=logs&action=activity" \
  -b /tmp/cookies.txt

# Get Nginx logs
curl "http://localhost:8000/api/router.php?endpoint=logs&action=nginx" \
  -b /tmp/cookies.txt

# Get Apache logs
curl "http://localhost:8000/api/router.php?endpoint=logs&action=apache" \
  -b /tmp/cookies.txt
```

## Testing with Python

```python
import requests

BASE_URL = "http://localhost:8000/api/router.php"

# Login
session = requests.Session()
response = session.post(
    BASE_URL,
    params={"endpoint": "auth", "action": "login"},
    json={"username": "admin", "password": "admin123"}
)
print("Login:", response.json())

# Get system info
response = session.get(
    BASE_URL,
    params={"endpoint": "system", "action": "info"}
)
print("System Info:", response.json())

# Get services
response = session.get(
    BASE_URL,
    params={"endpoint": "services", "action": "list"}
)
print("Services:", response.json())

# Add service
response = session.post(
    BASE_URL,
    params={"endpoint": "services", "action": "add"},
    json={"name": "myapp", "port": 3000, "auto_start": 1}
)
print("Add Service:", response.json())

# Logout
response = session.get(
    BASE_URL,
    params={"endpoint": "auth", "action": "logout"}
)
print("Logout:", response.json())
```

## Testing with JavaScript (Browser Console)

```javascript
const API_BASE = 'http://localhost:8000/api/router.php';

// Login
fetch(`${API_BASE}?endpoint=auth&action=login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({username: 'admin', password: 'admin123'})
})
.then(r => r.json())
.then(console.log);

// Get system info
fetch(`${API_BASE}?endpoint=system&action=info`, {credentials: 'include'})
.then(r => r.json())
.then(console.log);

// Get services
fetch(`${API_BASE}?endpoint=services&action=list`, {credentials: 'include'})
.then(r => r.json())
.then(console.log);
```

## Manual Testing Checklist

### Authentication
- [ ] Login page displays correctly
- [ ] Can login with admin/admin123
- [ ] Invalid credentials show error
- [ ] Session persists after refresh
- [ ] Logout works

### Dashboard
- [ ] CPU usage displays
- [ ] Memory usage displays
- [ ] Disk usage displays
- [ ] Uptime displays
- [ ] Recent activity shows
- [ ] Quick services shows

### System Page
- [ ] System information displays
- [ ] CPU load shows correctly
- [ ] Memory detail shows
- [ ] Disk info cards display

### Services Page
- [ ] Service list displays
- [ ] Can add new service
- [ ] Can start service
- [ ] Can stop service
- [ ] Can restart service
- [ ] Can remove service
- [ ] Status updates correctly

### Logs Page
- [ ] System logs display
- [ ] Activity logs display
- [ ] Can switch log types
- [ ] Refresh works

### Network Page
- [ ] Network interfaces display
- [ ] Traffic statistics show

## Debugging

### Check Server Status
```bash
# Check if server is running
ps aux | grep "php -S"

# Check port
netstat -tlnp | grep 8000
# or
ss -tlnp | grep 8000

# View server logs
tail -f logs/server.log
```

### Enable Debug Mode
Edit `config/config.php`:
```php
'debug' => true,
```

### Check PHP Errors
```bash
# View PHP error log
tail -f /var/log/php_errors.log

# Or check server log
tail -f logs/server.log
```

### Test Database
```bash
# Check if SQLite database exists
ls -la data/panel.db

# View database content
sqlite3 data/panel.db "SELECT * FROM users;"
sqlite3 data/panel.db "SELECT * FROM services;"
```

## Performance Testing

```bash
# Test response time
time curl "http://localhost:8000/api/router.php?endpoint=system&action=info"

# Load test (requires ab - Apache Bench)
ab -n 1000 -c 10 "http://localhost:8000/api/router.php?endpoint=system&action=info"
```

## Common Issues

### Issue: Connection Refused
**Solution:** Make sure server is running
```bash
php -S 0.0.0.0:8000
```

### Issue: 404 Not Found
**Solution:** Check path, should be from project root
```bash
# Correct
http://localhost:8000/api/router.php
http://localhost:8000/web/index.html

# Incorrect
http://localhost:8000/api/endpoints/auth.php
```

### Issue: Unauthorized
**Solution:** Login first and use cookies
```bash
curl -c cookies.txt -X POST ...login...
curl -b cookies.txt ...protected-endpoint...
```

### Issue: Function Not Found (cpu_count, etc)
**Solution:** Already handled with fallbacks in code

## Mock Data Mode

If SQLite extension is not available, the panel automatically uses mock data:
- Default admin user (admin/admin123)
- Sample services (nginx, mysql, redis, docker)
- Sample activity logs

## Next Steps

1. Test all features in browser: http://localhost:8000/web/
2. Add more test cases
3. Implement file manager API
4. Add WebSocket for real-time updates
5. Write automated tests

---

**Happy Testing! 🧪**
