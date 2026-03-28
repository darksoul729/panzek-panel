# Debugging Guide - Panzek Panel

## Masalah: Halaman Kosong Setelah Login

Jika halaman System, Services, Logs, Files, Network kosong setelah login, ikuti langkah debugging berikut:

### 1. Buka Browser Console

Tekan **F12** atau klik kanan → **Inspect** → tab **Console**

### 2. Cek Error Messages

Lihat apakah ada error merah di console. Error yang umum:
- `Failed to fetch` - API tidak bisa diakses
- `401 Unauthorized` - Belum login atau session expired
- `404 Not Found` - Path API salah
- JavaScript errors lainnya

### 3. Console Logs

Aplikasi sekarang memiliki **23+ console.log statements** untuk debugging:

```javascript
// Saat navigasi halaman:
"Switching to page: system"
"Loading system info..."

// Saat load data:
"loadSystemInfo called"
"API responses received"
"Data parsed: {...}"
"System info table updated"
"System page fully loaded"
```

### 4. Test API Manual

Buka browser dan test API langsung:

```
# System Info (no auth required)
http://localhost:8000/api/router.php?endpoint=system&action=info

# CPU Info
http://localhost:8000/api/router.php?endpoint=system&action=cpu

# Services (requires login)
http://localhost:8000/api/router.php?endpoint=services&action=list
```

### 5. Test Pages Khusus

Buka halaman test khusus untuk debugging:

**Test API Endpoints:**
```
http://localhost:8000/test-pages.html
```

Halaman ini akan test semua API endpoints dan menampilkan hasilnya.

**Debug Test:**
```
http://localhost:8000/debug-test.html
```

Halaman ini test API tanpa authentication.

### 6. Langkah Debugging Detail

#### A. Cek Server Running
```bash
ps aux | grep "php -S"
# Harus ada process PHP running di port 8000

netstat -tlnp | grep 8000
# Port 8000 harus listening
```

#### B. Cek Server Log
```bash
tail -f /home/panzek/project-menuju-sukses/home-server-panel/logs/server.log
```

#### C. Login Ulang
1. Logout dari aplikasi
2. Clear browser cache (Ctrl+Shift+Delete)
3. Login kembali dengan admin/admin123

#### D. Test Setiap Halaman

**System Page:**
```javascript
// Buka console di browser
fetch('http://localhost:8000/api/router.php?endpoint=system&action=info')
  .then(r => r.json())
  .then(console.log)
```

**Services Page:**
```javascript
// Harus login dulu
fetch('http://localhost:8000/api/router.php?endpoint=services&action=list', {credentials: 'include'})
  .then(r => r.json())
  .then(console.log)
```

**Logs Page:**
```javascript
fetch('http://localhost:8000/api/router.php?endpoint=logs&action=activity', {credentials: 'include'})
  .then(r => r.json())
  .then(console.log)
```

**Network Page:**
```javascript
fetch('http://localhost:8000/api/router.php?endpoint=system&action=network')
  .then(r => r.json())
  .then(console.log)
```

### 7. Common Issues & Solutions

#### Issue: "Failed to load system info"
**Penyebab:** API endpoint tidak responding
**Solusi:**
```bash
# Restart server
pkill -f "php.*8000"
cd /home/panzek/project-menuju-sukses/home-server-panel
php -d opcache.enable=0 -S 0.0.0.0:8000
```

#### Issue: "Unauthorized" di semua halaman
**Penyebab:** Session tidak tersimpan
**Solusi:**
- Pastikan cookies enabled di browser
- Login ulang
- Cek di Application → Cookies (F12)

#### Issue: Halaman blank setelah login
**Penyebab:** JavaScript error
**Solusi:**
1. Buka Console (F12)
2. Lihat error message
3. Screenshot error dan laporkan

#### Issue: Services page kosong
**Penyebab:** Mock data tidak di-load
**Solusi:**
```bash
# Cek apakah SQLite extension tidak tersedia
php -m | grep sqlite
# Jika tidak ada, mock data mode harusnya aktif otomatis
```

### 8. Manual Page Load Test

Buka setiap halaman langsung via URL:

```
# Dashboard (default setelah login)
http://localhost:8000/web/

# System - Klik menu "System"
# Services - Klik menu "Services"
# Logs - Klik menu "Logs"
# Network - Klik menu "Network"
```

Setiap klik harus trigger console.log:
```
"Switching to page: system"
"loadSystemInfo called"
```

### 9. Network Tab Debugging

Buka **F12 → Network tab**:

1. Clear network log
2. Klik menu "System"
3. Lihat request API yang dikirim
4. Check response status code (harus 200)
5. Check response data

### 10. Test Script Otomatis

Jalankan test script untuk cek semua pages:

```bash
cd /home/panzek/project-menuju-sukses/home-server-panel

# Test semua API endpoints
curl "http://localhost:8000/api/router.php?endpoint=system&action=info" | python3 -m json.tool
curl "http://localhost:8000/api/router.php?endpoint=system&action=cpu" | python3 -m json.tool
curl "http://localhost:8000/api/router.php?endpoint=system&action=memory" | python3 -m json.tool
curl "http://localhost:8000/api/router.php?endpoint=system&action=disk" | python3 -m json.tool
curl "http://localhost:8000/api/router.php?endpoint=system&action=network" | python3 -m json.tool

# Test dengan auth (login dulu)
curl -X POST "http://localhost:8000/api/router.php?endpoint=auth&action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c /tmp/cookies.txt

curl "http://localhost:8000/api/router.php?endpoint=services&action=list" \
  -b /tmp/cookies.txt | python3 -m json.tool
```

### 11. File yang Dimodifikasi untuk Debugging

File berikut sudah ditambahkan console.log untuk debugging:

- `web/assets/js/app.js` - 23+ console.log statements
- `api/router.php` - API router dengan error handling
- `api/endpoints/*.php` - Error handling yang lebih baik

### 12. Quick Fix

Jika semua gagal, coba ini:

```bash
# 1. Stop server
pkill -f "php.*8000"

# 2. Clear cache
rm -rf /tmp/sess_*

# 3. Restart server dengan debug
cd /home/panzek/project-menuju-sukses/home-server-panel
php -d opcache.enable=0 -d display_errors=On -S 0.0.0.0:8000

# 4. Buka browser dengan incognito mode
# 5. Login dengan admin/admin123
# 6. Buka Console (F12) dan lihat logs
```

### 13. Report Bug

Jika masih ada masalah, screenshot dan kirim:

1. Browser Console (F12 → Console)
2. Network tab (F12 → Network)
3. URL yang diakses
4. Error message lengkap

## Expected Behavior

Setelah login, setiap klik menu harus:

1. Console log muncul: `"Switching to page: xxx"`
2. Load function dipanggil: `"loadSystemInfo called"`
3. API request dikirim
4. Data diterima dan ditampilkan
5. Console log: `"System page fully loaded"`

Halaman tidak boleh kosong - minimal menampilkan:
- Loading indicator
- Error message jika gagal
- "No data" jika tidak ada data

---

**Happy Debugging! 🐛**
