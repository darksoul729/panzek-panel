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

	// Generate docker-compose.yml for the site
	safeName := fmt.Sprintf("site-%d", s.ID)

	if s.Type == "laravel" {
		log.Printf("[Deploy] Running composer install...\n")
		compCmd := exec.Command("composer", "install", "--no-interaction", "--prefer-dist", "--optimize-autoloader")
		compCmd.Dir = targetDir
		if out, err := compCmd.CombinedOutput(); err != nil {
			return fmt.Errorf("composer failed: %v\nOutput: %s", err, string(out))
		}

		envFile := filepath.Join(targetDir, ".env")
		if _, err := os.Stat(envFile); os.IsNotExist(err) {
			exampleEnv := filepath.Join(targetDir, ".env.example")
			if _, err := os.Stat(exampleEnv); err == nil {
				input, _ := os.ReadFile(exampleEnv)
				content := string(input)
				// Auto-patch DB configuration for the panel environment
				content = strings.Replace(content, "DB_HOST=127.0.0.1", "DB_HOST=mysql", 1)
				
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
			}
		}

		log.Printf("[Deploy] Generating artisan key...\n")
		keyCmd := exec.Command("php", "artisan", "key:generate", "--force")
		keyCmd.Dir = targetDir
		if out, err := keyCmd.CombinedOutput(); err != nil {
			log.Printf("[Deploy] artisan key:generate warning: %v, Output: %s\n", err, string(out))
		}

		log.Printf("[Deploy] Running migrations...\n")
		migrateCmd := exec.Command("php", "artisan", "migrate", "--force")
		migrateCmd.Dir = targetDir
		if out, err := migrateCmd.CombinedOutput(); err != nil {
			log.Printf("[Deploy] artisan migrate warning: %v, Output: %s\n", err, string(out))
		}

		// Node.js Build Steps
		pkgJson := filepath.Join(targetDir, "package.json")
		if _, err := os.Stat(pkgJson); err == nil {
			log.Printf("[Deploy] package.json detected, running npm commands...\n")
			
			log.Printf("[Deploy] Running npm install...\n")
			npmInst := exec.Command("npm", "install", "--no-audit", "--no-fund")
			npmInst.Dir = targetDir
			if out, err := npmInst.CombinedOutput(); err != nil {
				log.Printf("[Deploy] npm install warning: %v, Output: %s\n", err, string(out))
			}

			log.Printf("[Deploy] Running npm run build...\n")
			npmBuild := exec.Command("npm", "run", "build")
			npmBuild.Dir = targetDir
			if out, err := npmBuild.CombinedOutput(); err != nil {
				log.Printf("[Deploy] npm run build warning: %v, Output: %s\n", err, string(out))
			}
		}

		log.Printf("[Deploy] Creating storage link...\n")
		linkCmd := exec.Command("php", "artisan", "storage:link")
		linkCmd.Dir = targetDir
		if out, err := linkCmd.CombinedOutput(); err != nil {
			log.Printf("[Deploy] artisan storage:link warning: %v, Output: %s\n", err, string(out))
		}

		// Fix Laravel permissions
		log.Printf("[Deploy] Fixing permissions for storage and cache...\n")
		dirsToFix := []string{"storage", "bootstrap/cache"}
		for _, d := range dirsToFix {
			path := filepath.Join(targetDir, d)
			exec.Command("chmod", "-R", "777", path).Run()
		}
	}

	// Determine hostPath
	relPath, _ := filepath.Rel("/var/www", targetDir)
	hostPath := filepath.Join("/home/panzek/project-menuju-sukses/home-server-panel/sites", relPath)

	// Fetch custom domains
	var customDomains []data.CustomDomain
	data.DB.Where("site_id = ?", s.ID).Find(&customDomains)

	rules := []string{fmt.Sprintf("Host(`%s`)", s.Domain)}
	for _, cd := range customDomains {
		rules = append(rules, fmt.Sprintf("Host(`%s`)", cd.Domain))
	}
	joinedRules := strings.Join(rules, " || ")

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

	// Spin up container with explicit project name
	upCmd := exec.Command("docker", "compose", "-p", safeName, "up", "-d", "--build")
	upCmd.Dir = targetDir
	if out, err := upCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("docker compose failed: %v\nOutput: %s", err, string(out))
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
