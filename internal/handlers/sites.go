package handlers

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"home-server-panel/internal/data"
	"github.com/gofiber/fiber/v2"
)

func ListSites(c *fiber.Ctx) error {
	var sites []data.Site
	data.DB.Find(&sites)

	type SiteWithIP struct {
		data.Site
		IP string `json:"ip"`
	}

	var results []SiteWithIP
	for _, s := range sites {
		ip := ""
		currentStatus := s.Status // Default to DB status

		// Container name convention: site-<ID>-web-1
		containerName := fmt.Sprintf("site-%d-web-1", s.ID)

		// Check container state and IP
		// We query both State.Running and IPAddress
		format := "{{.State.Running}}|{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"
		cmd := exec.Command("docker", "inspect", "-f", format, containerName)
		if out, err := cmd.Output(); err == nil {
			parts := strings.Split(strings.TrimSpace(string(out)), "|")
			if len(parts) >= 2 {
				isRunning := parts[0] == "true"
				ip = parts[1]

				if isRunning {
					currentStatus = "online"
				} else {
					currentStatus = "stopped"
				}
			}
		} else {
			// Container doesn't exist
			currentStatus = "offline"
		}

		s.Status = currentStatus
		results = append(results, SiteWithIP{Site: s, IP: ip})
	}

	return c.JSON(results)
}

func CreateSite(c *fiber.Ctx) error {
	var site data.Site
	if err := c.BodyParser(&site); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	if site.Path == "" {
		site.Path = site.Domain
	}
	site.Status = "online"
	if err := data.DB.Create(&site).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	data.DB.Create(&data.ActivityLog{
		Action:      "site.create",
		Description: "Created new web site: " + site.Domain,
		UserID:      1,
	})
	
	return c.JSON(site)
}

func DeleteSite(c *fiber.Ctx) error {
	id := c.Params("id")
	var site data.Site
	data.DB.First(&site, id)

	if err := data.DB.Unscoped().Delete(&data.Site{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	data.DB.Create(&data.ActivityLog{
		Action:      "site.delete",
		Description: "Deleted web site: " + site.Domain,
		UserID:      1,
	})

	return c.JSON(fiber.Map{"success": true})
}

func GetSiteLogs(c *fiber.Ctx) error {
	id := c.Params("id")
	var site data.Site
	if err := data.DB.First(&site, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Site not found"})
	}

	// Try multiple naming patterns
	patterns := []string{
		fmt.Sprintf("site-%d-web-1", site.ID),
		fmt.Sprintf("site-%d_web_1", site.ID),
	}

	var output []byte
	var err error
	for _, containerName := range patterns {
		cmd := exec.Command("docker", "logs", "--tail", "100", containerName)
		output, err = cmd.CombinedOutput()
		if err == nil {
			break
		}
	}
	
	if err != nil {
		output = []byte("Container not found (tried hyphen and underscore)\n" + err.Error())
	}

	// Also try to read deployment.log if it exists
	fullLogs := []string{}
	deployLogPath := filepath.Join(site.Path, "deployment.log")
	if deployLogData, err := os.ReadFile(deployLogPath); err == nil {
		fullLogs = append(fullLogs, "--- DEPLOYMENT LOGS ---")
		fullLogs = append(fullLogs, strings.Split(string(deployLogData), "\n")...)
		fullLogs = append(fullLogs, "--- CONTAINER LOGS ---")
	}

	fullLogs = append(fullLogs, strings.Split(string(output), "\n")...)
	return c.JSON(fiber.Map{"logs": fullLogs})
}

func ControlSite(c *fiber.Ctx) error {
	id := c.Params("id")
	action := c.Query("action") // start, stop, restart

	var site data.Site
	if err := data.DB.First(&site, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Site not found"})
	}

	projectName := fmt.Sprintf("site-%d", site.ID)
	
	validActions := map[string]bool{"start": true, "stop": true, "restart": true}
	if !validActions[action] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
	}

	// Use site.Path or default to domain-based path
	siteDir := site.Path
	if siteDir == "" {
		siteDir = fmt.Sprintf("/var/www/%s", site.Domain)
	}

	// Verify directory exists
	checkCmd := exec.Command("sh", "-c", fmt.Sprintf("[ -d \"%s\" ]", siteDir))
	if err := checkCmd.Run(); err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": fmt.Sprintf("Site directory not found: %s. Please ensure files are synced to this server.", siteDir),
		})
	}

	// Verify docker-compose.yml exists
	checkFileCmd := exec.Command("sh", "-c", fmt.Sprintf("[ -f \"%s/docker-compose.yml\" ]", siteDir))
	if err := checkFileCmd.Run(); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": fmt.Sprintf("docker-compose.yml not found in %s", siteDir),
		})
	}

	dockerAction := action
	var args []string
	if action == "start" {
		dockerAction = "up"
		args = []string{"-d"}
	}
	
	cmdArgs := append([]string{"compose", "-p", projectName, dockerAction}, args...)
	cmd := exec.Command("docker", cmdArgs...)
	cmd.Dir = siteDir
	
	if out, err := cmd.CombinedOutput(); err != nil {
		// Include output in the error so the frontend popup shows the real reason
		return c.Status(500).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to %s site: %v. Docker Output: %s", action, err, string(out)),
		})
	}

	// Update status in DB
	newStatus := "online"
	if action == "stop" {
		newStatus = "offline"
	}
	data.DB.Model(&site).Update("status", newStatus)

	data.DB.Create(&data.ActivityLog{
		Action:      "site." + action,
		Description: fmt.Sprintf("Performed %s on site: %s", action, site.Domain),
		UserID:      1,
	})

	return c.JSON(fiber.Map{"success": true, "message": fmt.Sprintf("Site %sed successfully", action)})
}
