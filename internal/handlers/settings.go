package handlers

import (
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"home-server-panel/internal/data"
	"home-server-panel/internal/services"
	"github.com/gofiber/fiber/v2"
)

func GetSettings(c *fiber.Ctx) error {
	var settings []data.PanelSetting
	data.DB.Find(&settings)
	
	res := fiber.Map{}
	for _, s := range settings {
		res[s.Key] = s.Value
	}

	if len(settings) == 0 {
		return c.JSON(fiber.Map{
			"panel_name": "Home Server Panel",
			"version":    "2.0.0",
		})
	}
	
	return c.JSON(res)
}

func UpdateSettings(c *fiber.Ctx) error {
	var body map[string]string
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	for key, value := range body {
		var setting data.PanelSetting
		result := data.DB.Where("key = ?", key).First(&setting)
		if result.Error != nil {
			// Key does not exist yet — create it
			data.DB.Create(&data.PanelSetting{Key: key, Value: value})
		} else {
			// Key exists — update the value
			setting.Value = value
			data.DB.Save(&setting)
		}

		// Jika token di-save manual via GUI, tulis ke file juga
		if key == "cf_tunnel_token" {
			writeTunnelEnv(value)
		}
	}

	data.DB.Create(&data.ActivityLog{
		Action:      "settings.update",
		Description: "Updated panel settings configuration",
		UserID:      1,
	})

	return c.JSON(fiber.Map{"success": true, "message": "Settings updated"})
}

func writeTunnelEnv(token string) {
	content := fmt.Sprintf("TUNNEL_TOKEN=%s\n", token)
	os.WriteFile("/app_config/.tunnel.env", []byte(content), 0644)
}

func RestartCloudflareTunnel(c *fiber.Ctx) error {
	cmd := exec.Command("docker", "compose", "restart", "tunnel")
	if out, err := cmd.CombinedOutput(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to restart tunnel: %v, output: %s", err, string(out))})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Tunnel service restarted"})
}

func SetupCloudflareTunnel(c *fiber.Ctx) error {
	var tokenSetting, accountSetting data.PanelSetting
	if err := data.DB.Where("key = ?", "cf_api_token").First(&tokenSetting).Error; err != nil || tokenSetting.Value == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Cloudflare API Token belum diatur. Silakan isi di menu Integration."})
	}
	if err := data.DB.Where("key = ?", "cf_account_id").First(&accountSetting).Error; err != nil || accountSetting.Value == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Cloudflare Account ID belum diatur. Silakan isi di menu Integration."})
	}

	// Buat tunnel dengan nama unik jika perlu, atau gunakan default
	tunnelID, tunnelSecret, err := services.CreatePaaSTunnel(c.Context(), "HomeServerPanel-Tunnel")
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "10000") || strings.Contains(errMsg, "Authentication error") {
			errMsg = "Authentication Error (10000). Pastikan API Token memiliki izin 'Account.Cloudflare Tunnel: Edit'."
		}
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Cloudflare API Error: %v", errMsg)})
	}

	// Generate CF Tunnel Token (base64 of JSON credentials)
	creds := fmt.Sprintf(`{"AccountTag":"%s","TunnelSecret":"%s","TunnelID":"%s"}`, 
		accountSetting.Value, tunnelSecret, tunnelID)
	token := base64.StdEncoding.EncodeToString([]byte(creds))

	// Simpan ke database
	keys := map[string]string{
		"cf_tunnel_id":     tunnelID,
		"cf_tunnel_secret": tunnelSecret,
		"cf_tunnel_token":  token,
	}

	for k, v := range keys {
		data.DB.Where("key = ?", k).Assign(data.PanelSetting{Value: v}).FirstOrCreate(&data.PanelSetting{Key: k})
	}

	// Tulis ke file .tunnel.env untuk docker-compose
	writeTunnelEnv(token)

	// Logging activity
	data.DB.Create(&data.ActivityLog{
		Action:      "cloudflare.tunnel.create",
		Description: fmt.Sprintf("Created new Cloudflare Tunnel: %s", tunnelID),
		UserID:      1,
	})

	return c.JSON(fiber.Map{
		"success":   true,
		"tunnel_id": tunnelID,
		"token":     token,
		"message":   "Tunnel created successfully. Environment updated.",
	})
}

func ResetDatabase(c *fiber.Ctx) error {
	data.DB.Exec("DELETE FROM services")
	data.DB.Exec("DELETE FROM activity_logs")
	return c.JSON(fiber.Map{"success": true, "message": "Database reset to clean state"})
}
