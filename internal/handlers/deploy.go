package handlers

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"home-server-panel/internal/data"
	"home-server-panel/internal/services"
	"github.com/gofiber/fiber/v2"
)

type DeployRequest struct {
	SiteID uint `json:"site_id"`
}

func DeploySite(c *fiber.Ctx) error {
	var req DeployRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	var site data.Site
	if err := data.DB.First(&site, req.SiteID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Site not found"})
	}

	if site.GitURL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Git URL not configured for this site"})
	}

	// Update status to deploying
	site.Status = "deploying"
	data.DB.Save(&site)

	// Run deployment in background
	go func(s data.Site) {
		err := performDeployment(&s)
		if err != nil {
			log.Printf("Deployment failed for %s: %v", s.Domain, err)
			s.Status = "error"
		} else {
			s.Status = "active"
			s.LastDeploy = time.Now()
		}
		data.DB.Save(&s)
		
		// Log action
		data.DB.Create(&data.ActivityLog{
			Action:      "DEPLOY",
			Description: fmt.Sprintf("Deployed %s from %s", s.Domain, s.GitURL),
			UserID:      1,
		})
	}(site)

	return c.JSON(fiber.Map{"message": "Deployment started in background"})
}

func performDeployment(s *data.Site) error {
	// Ensure base path is in /var/www (mapped to host)
	if !filepath.IsAbs(s.Path) {
		s.Path = filepath.Join("/var/www", s.Path)
	}
	targetDir := s.Path

	if _, err := os.Stat(targetDir); os.IsNotExist(err) {
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			return err
		}
	}

	// Git Clone or Pull
	var cmd *exec.Cmd
	gitDir := filepath.Join(targetDir, ".git")
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		branch := s.Branch
		if branch == "" {
			branch = "main" // Internal default
		}
		
		log.Printf("[Deploy] Cloning branch %s from %s into %s\n", branch, s.GitURL, targetDir)
		cmd = exec.Command("git", "clone", "-b", branch, s.GitURL, targetDir)
		if out, err := cmd.CombinedOutput(); err != nil {
			// If explicitly "main" or default, try "master"
			if branch == "main" {
				log.Printf("[Deploy] Branch 'main' not found, trying 'master'...\n")
				cmd = exec.Command("git", "clone", "-b", "master", s.GitURL, targetDir)
				if out2, err2 := cmd.CombinedOutput(); err2 != nil {
					return fmt.Errorf("git error: branch 'main' and 'master' not found. Output: %s", string(out2))
				}
			} else {
				return fmt.Errorf("git error: %v, output: %s", err, string(out))
			}
		}
	} else {
		cmd = exec.Command("git", "-C", targetDir, "pull")
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("git error: %v, output: %s", err, string(out))
		}
	}

	// Set full permissions for Docker to ensure .env and other files can be created
	exec.Command("chmod", "-R", "777", targetDir).Run()

	// 1. GENERATE DOCKER CONFIG FIRST (Resilience)
	// Determine paths
	relPath, _ := filepath.Rel("/var/www", targetDir)
	
	// Use dynamic host path if available, fallback to hardcoded if not (for backward compatibility)
	baseHostPath := os.Getenv("PANEL_HOST_PATH")
	if baseHostPath == "" {
		baseHostPath = "/home/panzek/project-menuju-sukses/home-server-panel"
	}
	hostPath := filepath.Join(baseHostPath, "sites", relPath)

	// Fetch custom domains
	var customDomains []data.CustomDomain
	data.DB.Where("site_id = ?", s.ID).Find(&customDomains)

	rules := []string{fmt.Sprintf("Host(`%s`)", s.Domain)}
	for _, cd := range customDomains {
		rules = append(rules, fmt.Sprintf("Host(`%s`)", cd.Domain))
	}
	joinedRules := strings.Join(rules, " || ")

	safeName := fmt.Sprintf("site-%d", s.ID)
	var composeContent string
	if s.Type == "laravel" {
		composeContent = fmt.Sprintf(`services:
  web:
    image: webdevops/php-apache:8.3
    environment:
      - WEB_DOCUMENT_ROOT=/app/public
      - WEB_DOCUMENT_INDEX=index.php
    volumes:
      - "%s:/app"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.%s.rule=%s"
      - "traefik.http.services.%s.loadbalancer.server.port=80"
    networks:
      - panel-network

networks:
  panel-network:
    external: true
`, hostPath, safeName, joinedRules, safeName)
	} else {
		composeContent = fmt.Sprintf(`services:
  web:
    image: nginx:alpine
    volumes:
      - "%s:/usr/share/nginx/html"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.%s.rule=%s"
      - "traefik.http.services.%s.loadbalancer.server.port=80"
    networks:
      - panel-network

networks:
  panel-network:
    external: true
`, hostPath, safeName, joinedRules, safeName)
	}

	composeFile := filepath.Join(targetDir, "docker-compose.yml")
	if err := os.WriteFile(composeFile, []byte(composeContent), 0644); err != nil {
		return fmt.Errorf("failed to create docker-compose.yml: %v", err)
	}
	// Extra chmod to be sure
	exec.Command("chmod", "777", composeFile).Run()

	// 2. RUN APP BUILD STEPS
	if s.Type == "laravel" {
		// Provision MySQL database and user first
		if err := provisionDatabase(s); err != nil {
			log.Printf("[Deploy] Database provisioning warning: %v\n", err)
		}

		log.Printf("[Deploy] Running composer install...\n")
		compCmd := exec.Command("composer", "install", "--no-interaction", "--prefer-dist", "--optimize-autoloader")
		compCmd.Dir = targetDir
		if out, err := compCmd.CombinedOutput(); err != nil {
			return fmt.Errorf("composer failed (folder created but install failed): %v\nOutput: %s", err, string(out))
		}

		envFile := filepath.Join(targetDir, ".env")
		if _, err := os.Stat(envFile); os.IsNotExist(err) {
			exampleEnv := filepath.Join(targetDir, ".env.example")
			if _, err := os.Stat(exampleEnv); err == nil {
				input, _ := os.ReadFile(exampleEnv)
				content := string(input)
				content = strings.Replace(content, "DB_HOST=127.0.0.1", "DB_HOST=mysql", 1)
				content = strings.Replace(content, "APP_URL=http://localhost", fmt.Sprintf("APP_URL=https://%s", s.Domain), 1)
				if !strings.Contains(content, "ASSET_URL=") {
					content += fmt.Sprintf("\nASSET_URL=https://%s", s.Domain)
				}
				if s.DbName != "" {
					content = strings.Replace(content, "DB_DATABASE=laravel", "DB_DATABASE="+s.DbName, 1)
				}
				if s.DbUser != "" {
					content = strings.Replace(content, "DB_USERNAME=root", "DB_USERNAME="+s.DbUser, 1)
				}
				if s.DbPassword != "" {
					content = strings.Replace(content, "DB_PASSWORD=", "DB_PASSWORD="+s.DbPassword, 1)
				} else {
					content = strings.Replace(content, "DB_PASSWORD=", "DB_PASSWORD=root_secret", 1)
				}
				os.WriteFile(envFile, []byte(content), 0644)
				exec.Command("chmod", "777", envFile).Run()
			}
		}
		log.Printf("[Deploy] Artisan commands and Node steps will be deferred until container is UP.\n")
	}

	// 3. SPIN UP CONTAINER
	upCmd := exec.Command("docker", "compose", "-p", safeName, "up", "-d", "--build")
	upCmd.Dir = targetDir
	if out, err := upCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("docker compose failed: %v\nOutput: %s", err, string(out))
	}

	// 2. Post-UP container configuration (Commands inside container)
	if s.Type == "laravel" {
		containerName := fmt.Sprintf("%s-web-1", safeName)
		
		log.Printf("[Deploy] Fixing permissions inside container %s...\n", containerName)
		exec.Command("docker", "exec", "-u", "root", containerName, "chown", "-R", "1000:1000", "/app").Run()

		log.Printf("[Deploy] Generating artisan key inside container...\n")
		exec.Command("docker", "exec", "-w", "/app", containerName, "php", "artisan", "key:generate", "--force").Run()

		log.Printf("[Deploy] Running migrations inside container...\n")
		exec.Command("docker", "exec", "-w", "/app", containerName, "php", "artisan", "migrate", "--force").Run()

		// Run NPM if build is needed
		pkgJson := filepath.Join(targetDir, "package.json")
		if _, err := os.Stat(pkgJson); err == nil {
			log.Printf("[Deploy] Running npm steps inside container...\n")
			exec.Command("docker", "exec", "-w", "/app", containerName, "npm", "install", "--no-audit", "--no-fund").Run()
			exec.Command("docker", "exec", "-w", "/app", containerName, "npm", "run", "build").Run()
		}

		log.Printf("[Deploy] Fixing symlinks and storage inside container...\n")
		exec.Command("docker", "exec", "-w", "/app", containerName, "rm", "-rf", "public/storage").Run()
		exec.Command("docker", "exec", "-w", "/app", containerName, "php", "artisan", "storage:link").Run()
		
		// Set correct 775 permissions
		exec.Command("docker", "exec", "-u", "root", containerName, "chmod", "-R", "775", "/app/storage", "/app/bootstrap/cache").Run()
	}

	// 3. Post-Deployment Optimization: Cloudflare Tunnel & DNS
	go func() {
		ctx := context.Background()
		// Try automate primary domain
		log.Printf("[Deploy] Attempting Cloudflare DNS automation for %s...\n", s.Domain)
		if err := services.AddCNAMETOTunnel(ctx, s.Domain); err != nil {
			log.Printf("[CF] primary domain DNS automation skipped/failed: %v\n", err)
		}

		// Try automate custom domains
		for _, cd := range customDomains {
			log.Printf("[Deploy] Attempting Cloudflare DNS automation for custom domain %s...\n", cd.Domain)
			if err := services.AddCNAMETOTunnel(ctx, cd.Domain); err != nil {
				log.Printf("[CF] custom domain %s automation failed/skipped\n", cd.Domain)
			}
		}
	}()

	return nil
}

func provisionDatabase(s *data.Site) error {
	if s.DbName == "" {
		return nil // No database requested
	}

	mysqlContainer := "home-server-panel-mysql-1"
	rootPassword := "root_secret" // Hardcoded from docker-compose

	// 1. Create Database
	log.Printf("[DB] Provisioning database %s...\n", s.DbName)
	createDb := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`;", s.DbName)
	exec.Command("docker", "exec", "-e", "MYSQL_PWD="+rootPassword, mysqlContainer, "mysql", "-uroot", "-e", createDb).Run()

	// 2. Create User & Grant Privileges
	if s.DbUser != "" && s.DbPassword != "" {
		log.Printf("[DB] Provisioning user %s...\n", s.DbUser)
		// We use standard MySQL CREATE USER + GRANT syntax
		createPrivs := fmt.Sprintf("CREATE USER IF NOT EXISTS '%s'@'%%' IDENTIFIED BY '%s'; GRANT ALL PRIVILEGES ON `%s`.* TO '%s'@'%%'; FLUSH PRIVILEGES;", 
			s.DbUser, s.DbPassword, s.DbName, s.DbUser)
		exec.Command("docker", "exec", "-e", "MYSQL_PWD="+rootPassword, mysqlContainer, "mysql", "-uroot", "-e", createPrivs).Run()
	}

	return nil
}
