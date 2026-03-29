package handlers

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
	"home-server-panel/internal/data"
	"github.com/gofiber/fiber/v2"
)

func ListSites(c *fiber.Ctx) error {
	var sites []data.Site
	data.DB.Order("id DESC").Find(&sites)

	type SiteWithIP struct {
		data.Site
		IP string `json:"ip"`
	}

	var results []SiteWithIP
	seenDomains := map[string]bool{}
	for _, s := range sites {
		normalizedDomain := strings.ToLower(strings.TrimSpace(s.Domain))
		if normalizedDomain != "" && seenDomains[normalizedDomain] {
			continue
		}
		seenDomains[normalizedDomain] = true

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

	site.Domain = strings.ToLower(strings.TrimSpace(site.Domain))
	site.Branch = strings.TrimSpace(site.Branch)
	site.GitURL = strings.TrimSpace(site.GitURL)
	if site.Domain == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Domain is required"})
	}
	
	site.Path = normalizeSitePath(site.Path, site.Domain)

	var existing data.Site
	if err := data.DB.Where("LOWER(domain) = ?", site.Domain).First(&existing).Error; err == nil {
		return c.Status(409).JSON(fiber.Map{
			"error": fmt.Sprintf("Domain %s is already configured on site ID %d", site.Domain, existing.ID),
		})
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
	site.Path = syncSitePath(&site)

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
	
	// Diagnostics
	fullLogs = append(fullLogs, "--- SYSTEM DIAGNOSTICS ---")
	if _, err := os.Stat(site.Path); os.IsNotExist(err) {
		fullLogs = append(fullLogs, fmt.Sprintf("ERROR: Site directory not found at %s", site.Path))
	} else {
		fullLogs = append(fullLogs, fmt.Sprintf("OK: Directory exists: %s", site.Path))
		if site.Type != "laravel" {
			candidates := []string{
				filepath.Join(site.Path, "index.html"),
				filepath.Join(site.Path, "dist", "index.html"),
				filepath.Join(site.Path, "build", "index.html"),
				filepath.Join(site.Path, "public", "index.html"),
			}
			foundIndex := false
			for _, candidate := range candidates {
				if _, err := os.Stat(candidate); err == nil {
					fullLogs = append(fullLogs, fmt.Sprintf("OK: Static entry found at %s", candidate))
					foundIndex = true
					break
				}
			}
			if !foundIndex {
				fullLogs = append(fullLogs, "ERROR: No index.html found in root, dist/, build/, or public/. This commonly causes nginx 403 on static deployments.")
			}
		} else {
			// Check for public folder
			publicPath := filepath.Join(site.Path, "public")
			if _, err := os.Stat(publicPath); os.IsNotExist(err) {
				fullLogs = append(fullLogs, "ERROR: 'public' folder missing! Laravel needs a public folder to serve.")
			} else {
				fullLogs = append(fullLogs, "OK: 'public' folder found.")
				// Check for index.php
				indexPath := filepath.Join(publicPath, "index.php")
				if _, err := os.Stat(indexPath); os.IsNotExist(err) {
					fullLogs = append(fullLogs, "ERROR: 'public/index.php' missing! Apache has nothing to serve (Causes 403).")
				} else {
					fullLogs = append(fullLogs, "OK: 'index.php' found.")
				}
				
				// Check .htaccess
				htaccessPath := filepath.Join(publicPath, ".htaccess")
				if _, err := os.Stat(htaccessPath); err == nil {
					fullLogs = append(fullLogs, "OK: '.htaccess' found. Inspecting content...")
					content, _ := os.ReadFile(htaccessPath)
					fullLogs = append(fullLogs, "--- HTACCESS CONTENT ---")
					fullLogs = append(fullLogs, strings.Split(string(content), "\n")...)
				} else {
					fullLogs = append(fullLogs, "WARN: '.htaccess' not found.")
				}
			}
		}
	}
	
	deployLogPath := filepath.Join(site.Path, "deployment.log")
	if deployLogData, err := os.ReadFile(deployLogPath); err == nil {
		fullLogs = append(fullLogs, "--- DEPLOYMENT LOGS ---")
		fullLogs = append(fullLogs, strings.Split(string(deployLogData), "\n")...)
		fullLogs = append(fullLogs, "--- CONTAINER LOGS ---")
	}

	fullLogs = append(fullLogs, strings.Split(string(output), "\n")...)
	
	// Add runtime check from container perspective
	for _, containerName := range patterns {
		lsCmd := exec.Command("docker", "exec", containerName, "ls", "-la", "/app/public")
		if lsOut, err := lsCmd.CombinedOutput(); err == nil {
			fullLogs = append(fullLogs, "--- CONTAINER FILE VIEW (/app/public) ---")
			fullLogs = append(fullLogs, strings.Split(string(lsOut), "\n")...)
		}
	}

	return c.JSON(fiber.Map{"logs": fullLogs})
}

func ControlSite(c *fiber.Ctx) error {
	id := c.Params("id")
	action := c.Query("action") // start, stop, restart

	var site data.Site
	if err := data.DB.First(&site, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Site not found"})
	}
	siteDir := syncSitePath(&site)

	projectName := fmt.Sprintf("site-%d", site.ID)
	
	validActions := map[string]bool{"start": true, "stop": true, "restart": true}
	if !validActions[action] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
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
	if action == "start" || action == "restart" {
		var customDomains []data.CustomDomain
		data.DB.Where("site_id = ?", site.ID).Find(&customDomains)
		allDomains := []string{site.Domain}
		for _, cd := range customDomains {
			allDomains = append(allDomains, cd.Domain)
		}
		if err := cleanupConflictingSiteContainers(projectName, allDomains); err != nil {
			log.Printf("[ControlSite] Warning while cleaning conflicting containers for %s: %v\n", site.Domain, err)
		}

		dockerAction = "up"
		args = []string{"-d"}
		
		// 1. Repair host-side permissions (Nuclear)
		exec.Command("chmod", "-R", "777", siteDir).Run()
	}
	
	cmdArgs := append([]string{"compose", "-p", projectName, dockerAction}, args...)
	if action == "restart" {
		cmdArgs = []string{"compose", "-p", projectName, "restart"}
	}
	
	cmd := exec.Command("docker", cmdArgs...)
	cmd.Dir = siteDir
	
	if out, err := cmd.CombinedOutput(); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to %s site: %v. Output: %s", action, err, string(out)),
		})
	}

	// 2. Repair container-side permissions (Post-Start)
	if action == "start" || action == "restart" {
		containerName := projectName + "-web-1"
		// Wait a bit for container to be ready
		time.Sleep(3 * time.Second)
		
		// Fix ownership and permissions inside container as root
		exec.Command("docker", "exec", "-u", "root", containerName, "chown", "-R", "1000:1000", "/app").Run()
		exec.Command("docker", "exec", "-u", "root", containerName, "chmod", "-R", "777", "/app/storage", "/app/bootstrap/cache").Run()
		
		// Check for vendor folder and run composer if missing
		if site.Type == "laravel" {
			vendorPath := filepath.Join(siteDir, "vendor")
			if _, err := os.Stat(vendorPath); os.IsNotExist(err) {
				logFile := filepath.Join(siteDir, "deployment.log")
				f, _ := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
				fmt.Fprintf(f, "[%s] Vendor missing. Running Composer Install INSIDE container...\n", time.Now().Format(time.RFC3339))
				
				// Fix dubious ownership for git inside container
				exec.Command("docker", "exec", containerName, "git", "config", "--global", "--add", "safe.directory", "/app").Run()
				
				compCmd := exec.Command("docker", "exec", "-w", "/app", containerName, "composer", "install", "--no-interaction", "--prefer-dist", "--optimize-autoloader", "--ignore-platform-reqs")
				compCmd.Stdout = f
				compCmd.Stderr = f
				compCmd.Run()
				f.Close()
				
				// Fix permissions again after composer
				exec.Command("docker", "exec", "-u", "root", containerName, "chmod", "-R", "777", "/app/vendor", "/app/storage").Run()
			}
			
			// Ensure APP_KEY is generated if still empty
			exec.Command("docker", "exec", "-w", "/app", containerName, "php", "artisan", "key:generate", "--force").Run()
		}
	}

	// Update status in DB
	newStatus := "online"
	if action == "stop" {
		newStatus = "offline"
	}
	data.DB.Model(&site).Update("status", newStatus)

	data.DB.Create(&data.ActivityLog{
		Action:      "site." + action,
		Description: fmt.Sprintf("Performed %s and Permission Repair on site: %s", action, site.Domain),
		UserID:      1,
	})

	return c.JSON(fiber.Map{"success": true, "message": fmt.Sprintf("Site %sed and permissions repaired", action)})
}
