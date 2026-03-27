package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"home-server-panel/internal/data"

	"github.com/cloudflare/cloudflare-go"
)

// NewCloudflareService inisialisasi client API Cloudflare menggunakan token dari database
func NewCloudflareService() (*cloudflare.API, string, error) {
	var tokenSetting, accountSetting data.PanelSetting

	if err := data.DB.Where("key = ?", "cf_api_token").First(&tokenSetting).Error; err != nil {
		return nil, "", fmt.Errorf("CF_API_TOKEN belum diatur. Silakan isi di menu Settings → Cloudflare Integration")
	}
	if err := data.DB.Where("key = ?", "cf_account_id").First(&accountSetting).Error; err != nil {
		return nil, "", fmt.Errorf("CF_ACCOUNT_ID belum diatur. Silakan isi di menu Settings → Cloudflare Integration")
	}

	token := tokenSetting.Value
	accountID := accountSetting.Value

	if token == "" || accountID == "" {
		return nil, "", fmt.Errorf("Cloudflare credentials masih kosong. Isi di Settings terlebih dahulu")
	}

	api, err := cloudflare.NewWithAPIToken(token)
	if err != nil {
		return nil, "", fmt.Errorf("token Cloudflare tidak valid: %v", err)
	}

	return api, accountID, nil
}

// CreatePaaSTunnel membuat tunnel baru untuk PaaS dan mengembalikan ID serta Token-nya.
func CreatePaaSTunnel(ctx context.Context, name string) (string, string, error) {
	api, accountID, err := NewCloudflareService()
	if err != nil {
		return "", "", err
	}

	// 1. Generate random secret untuk tunnel (minimum 32 chars)
	secret := fmt.Sprintf("paas-secret-%d-%s", time.Now().Unix(), accountID[:10])
	if len(secret) < 32 {
		secret = secret + "000000000000000000000000000000"
	}
	secret = secret[:32]

	// 2. Create Tunnel
	tunnel, err := api.CreateArgoTunnel(ctx, accountID, name, secret)
	if err != nil {
		return "", "", fmt.Errorf("gagal membuat Argo Tunnel: %v", err)
	}

	log.Printf("[CF] Tunnel %s created with ID: %s\n", name, tunnel.ID)
	return tunnel.ID, secret, nil
}

// SetupZoneAndRecord membuat zone Cloudflare dan mengembalikan Nameserver.
func SetupZoneAndRecord(ctx context.Context, domain string) ([]string, error) {
	api, accountID, err := NewCloudflareService()
	if err != nil {
		return nil, err
	}

	// 1. Create Zone
	zone, err := api.CreateZone(ctx, domain, false, cloudflare.Account{ID: accountID}, "full")
	if err != nil {
		return nil, fmt.Errorf("gagal membuat zone Cloudflare: %v", err)
	}

	log.Printf("[CF] Zone %s dibuat. Status: %s\n", domain, zone.Status)

	// 3. Polling di background untuk CNAME ke Tunnel
	go pollAndAddCNAME(domain, zone.ID)

	// 2. Kembalikan Nameserver ke caller
	return zone.NameServers, nil
}

// pollAndAddCNAME melakukan polling status zone hingga aktif lalu menambahkan CNAME ke Tunnel.
func pollAndAddCNAME(domain, zoneID string) {
	ctx := context.Background()
	maxAttempts := 144
	delay := 10 * time.Minute

	for i := 0; i < maxAttempts; i++ {
		time.Sleep(delay)

		api, _, err := NewCloudflareService()
		if err != nil {
			log.Printf("[CF] Gagal membaca kredensial saat polling: %v\n", err)
			return
		}

		// Ambil Tunnel ID dari settings
		var tunnelSetting data.PanelSetting
		if err := data.DB.Where("key = ?", "cf_tunnel_id").First(&tunnelSetting).Error; err != nil {
			log.Printf("[CF] Tunnel ID belum diatur di settings, membatalkan CNAME creation\n")
			return
		}
		tunnelID := tunnelSetting.Value

		zone, err := api.ZoneDetails(ctx, zoneID)
		if err != nil {
			log.Printf("[CF] Error cek status zone %s: %v\n", domain, err)
			continue
		}

		if zone.Status == "active" {
			log.Printf("[CF] Zone %s AKTIF! Menambahkan CNAME ke Tunnel %s...\n", domain, tunnelID)

			target := fmt.Sprintf("%s.cfargotunnel.com", tunnelID)
			proxied := true
			_, err := api.CreateDNSRecord(ctx, cloudflare.ZoneIdentifier(zoneID), cloudflare.CreateDNSRecordParams{
				Type:    "CNAME",
				Name:    domain,
				Content: target,
				Proxied: &proxied,
				TTL:     1,
			})
			if err != nil {
				log.Printf("[CF] Gagal tambah CNAME untuk %s: %v\n", domain, err)
			} else {
				log.Printf("[CF] CNAME to Tunnel sukses untuk %s\n", domain)
			}
			return
		}

		log.Printf("[CF] Zone %s masih %s. Menunggu...\n", domain, zone.Status)
	}
}

// GetZoneID mencari Zone ID berdasarkan nama domain (mencari suffix tercocok)
func GetZoneID(ctx context.Context, domain string) (string, error) {
	api, _, err := NewCloudflareService()
	if err != nil {
		return "", err
	}

	zones, err := api.ListZones(ctx)
	if err != nil {
		return "", fmt.Errorf("gagal list zones: %v", err)
	}

	for _, z := range zones {
		if domain == z.Name || (strings.HasSuffix(domain, "."+z.Name)) {
			return z.ID, nil
		}
	}

	return "", fmt.Errorf("zone tidak ditemukan untuk domain %s", domain)
}

// AddCNAMETOTunnel menambahkan CNAME record yang mengarah ke tunnel.
func AddCNAMETOTunnel(ctx context.Context, domain string) error {
	api, _, err := NewCloudflareService()
	if err != nil {
		return err
	}

	// 1. Dapatkan Tunnel ID
	var tunnelSetting data.PanelSetting
	if err := data.DB.Where("key = ?", "cf_tunnel_id").First(&tunnelSetting).Error; err != nil {
		return fmt.Errorf("tunnel ID belum diatur di settings")
	}
	tunnelID := tunnelSetting.Value

	// 2. Dapatkan Zone ID
	zoneID, err := GetZoneID(ctx, domain)
	if err != nil {
		return err
	}

	// 3. Create CNAME
	target := fmt.Sprintf("%s.cfargotunnel.com", tunnelID)
	proxied := true
	_, err = api.CreateDNSRecord(ctx, cloudflare.ZoneIdentifier(zoneID), cloudflare.CreateDNSRecordParams{
		Type:    "CNAME",
		Name:    domain,
		Content: target,
		Proxied: &proxied,
		TTL:     1,
	})
	if err != nil {
		// Jika record sudah ada, coba update atau abaikan
		errStr := err.Error()
		if strings.Contains(errStr, "81057") || strings.Contains(errStr, "already exists") {
			log.Printf("[CF] DNS record untuk %s sudah ada, melewati...\n", domain)
			return nil
		}
		return fmt.Errorf("gagal membuat DNS record: %v", err)
	}

	log.Printf("[CF] CNAME record ditambahkan: %s -> %s\n", domain, target)
	return nil
}
