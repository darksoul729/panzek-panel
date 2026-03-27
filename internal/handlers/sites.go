package handlers

import (
	"fmt"
	"os/exec"
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
		if s.Status == "active" || s.Status == "online" {
			// Container name convention: site-<ID>-web-1 (Note: project name is site-<ID>)
			// Wait, in deploy.go I use safeName := fmt.Sprintf("site-%d", s.ID)
			// So container name is site-<ID>-web-1
			containerName := fmt.Sprintf("site-%d-web-1", s.ID)

			cmd := exec.Command("docker", "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", containerName)
			if out, err := cmd.Output(); err == nil {
				ip = strings.TrimSpace(string(out))
			}
		}
		results = append(results, SiteWithIP{Site: s, IP: ip})
	}

	return c.JSON(results)
}

func CreateSite(c *fiber.Ctx) error {
	var site data.Site
	if err := c.BodyParser(&site); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
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
		return c.JSON(fiber.Map{"logs": []string{"Container not found (tried hyphen and underscore)", err.Error()}})
	}

	lines := strings.Split(string(output), "\n")
	return c.JSON(fiber.Map{"logs": lines})
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

	// Use docker compose -p site-<ID> [action]
	// Note: We assume the directory is still valid for compose to find the file if needed, 
	// but -p should work for simple controls if the project is already created.
	// Actually, it's safer to run it from the site directory
	siteDir := fmt.Sprintf("/var/www/%s", site.Domain)
	cmd := exec.Command("docker", "compose", "-p", projectName, action)
	cmd.Dir = siteDir
	
	if out, err := cmd.CombinedOutput(); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to %s site: %v", action, err),
			"output": string(out),
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
