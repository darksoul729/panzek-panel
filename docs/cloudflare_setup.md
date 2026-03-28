# Panduan Konfigurasi Cloudflare untuk Panzek Panel

Ikuti langkah-langkah di bawah ini untuk mendapatkan token dan ID yang diperlukan untuk mengaktifkan otomatisasi DNS dan Cloudflare Tunnel.

---

## 1. Mendapatkan Account ID (Account Architecture ID)
Account ID digunakan untuk mengidentifikasi akun Cloudflare kamu di API.

1.  Login ke [Dashboard Cloudflare](https://dash.cloudflare.com/).
2.  Pilih salah satu domain aktif kamu.
3.  Pada halaman **Overview**, scroll ke bawah hingga menemukan kolom **Account ID** di sisi kanan bawah.
4.  Klik ID tersebut untuk menyalinnya.

---

## 2. Mendapatkan Master API Token
Token ini memberikan izin kepada panel untuk mengatur record DNS secara otomatis.

1.  Klik ikon profil di pojok kanan atas, lalu pilih **My Profile**.
2.  Buka menu **API Tokens** di sidebar kiri.
3.  Klik tombol **Create Token**.
4.  Pilih template **Edit Zone DNS**.
5.  Sesuaikan **Permissions** agar mencakup hal berikut:
    *   `Account` -> `Cloudflare Tunnel` -> `Edit`
    *   `Zone` -> `DNS` -> `Edit`
    *   `Zone` -> `Zone` -> `Read`
6.  Pada bagian **Zone Resources**, pilih **All zones** (atau domain spesifik kamu).
7.  Klik **Continue to summary** -> **Create Token**.
8.  **PENTING:** Simpan token ini baik-baik, karena hanya akan ditampilkan sekali.

---

## 3. Mendapatkan Tunnel Identifier & Administrative Token
Dua nilai ini diperlukan agar panel bisa menghubungkan server lokal kamu ke internet tanpa buka port router.

1.  Di Dashboard Cloudflare, buka sidebar **Zero Trust**.
2.  Pilih menu **Networks** -> **Tunnels**.
3.  Klik **Create a tunnel**.
4.  Pilih konektor **Cloudflared**, lalu klik **Next**.
5.  Beri nama tunnel kamu (contoh: `Home-Server-Panel`), lalu **Save tunnel**.
6.  Di halaman "Install and run a connector", pilih tab **Docker**.
7.  Kamu akan melihat perintah Docker. Cari bagian `--token <KODE_TOKEN_PANJANG>`. 
    *   Kode panjang setelah `--token` tersebut adalah **Administrative Tunnel Token**.
8.  Klik **Next** untuk menyelesaikan sinkronisasi domain (Public Hostname).
9.  Setelah selesai, kembali ke daftar Tunnels. ID yang muncul di kolom **ID** (format UUID seperti `a960a35d...`) adalah **Tunnel Identifier**.

---

## Tips Keamanan
*   Jangan pernah membagikan **Master API Token** atau **Tunnel Token** kepada siapapun.
*   Jika token bocor, segera hapus di menu API Tokens dan buat yang baru.
