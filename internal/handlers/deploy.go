package handlers

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
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
	site.Path = syncSitePath(&site)
	data.DB.Save(&site)

	// Create/Clear deployment log
	logFile := filepath.Join(site.Path, "deployment.log")
	os.Remove(logFile) // Start fresh
	
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
	targetDir := syncSitePath(s)

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
	hostPath := targetDir

	// Fetch custom domains
	var customDomains []data.CustomDomain
	data.DB.Where("site_id = ?", s.ID).Find(&customDomains)

	rules := []string{fmt.Sprintf("Host(`%s`)", s.Domain)}
	for _, cd := range customDomains {
		rules = append(rules, fmt.Sprintf("Host(`%s`)", cd.Domain))
	}
	joinedRules := strings.Join(rules, " || ")
	allDomains := []string{s.Domain}
	for _, cd := range customDomains {
		allDomains = append(allDomains, cd.Domain)
	}

	safeName := fmt.Sprintf("site-%d", s.ID)
	if err := cleanupConflictingSiteContainers(safeName, allDomains); err != nil {
		log.Printf("[Deploy] Warning while cleaning conflicting containers for %s: %v\n", s.Domain, err)
	}
	var composeContent string
	if s.Type == "laravel" {
		composeContent = fmt.Sprintf(`services:
  web:
    image: webdevops/php-apache:8.4
    environment:
      - WEB_DOCUMENT_ROOT=/app/public
      - WEB_DOCUMENT_INDEX=index.php
      - APPLICATION_UID=1000
      - APPLICATION_GID=1000
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
      - "%s:/site:ro"
    command: >
      /bin/sh -c '
      ROOT=/site;
      if [ -f /site/dist/index.html ]; then ROOT=/site/dist; fi;
      if [ -f /site/build/index.html ]; then ROOT=/site/build; fi;
      if [ -f /site/public/index.html ]; then ROOT=/site/public; fi;
      cat >/etc/nginx/conf.d/default.conf <<EOF
      server {
        listen 80;
        server_name _;
        root $${ROOT};
        index index.html index.htm;

        location / {
          try_files $$uri $$uri/ /index.html;
        }
      }
      EOF
      exec nginx -g "daemon off;"
      '
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
		// 1. PROVISION DATABASE
		if err := provisionDatabase(s); err != nil {
			log.Printf("[Deploy] Database provisioning warning: %v\n", err)
		}

		// 2. CREATE .ENV (Before composer, so it exists)
		envFile := filepath.Join(targetDir, ".env")
		if _, err := os.Stat(envFile); os.IsNotExist(err) {
			content := ""
			exampleEnv := filepath.Join(targetDir, ".env.example")
			if _, err := os.Stat(exampleEnv); err == nil {
				input, _ := os.ReadFile(exampleEnv)
				content = string(input)
			} else {
				content = "APP_NAME=Laravel\nAPP_ENV=production\nAPP_DEBUG=true\nAPP_URL=https://" + s.Domain + "\n\nDB_CONNECTION=mysql\nDB_HOST=mysql\nDB_PORT=3306\n"
			}

			// Generate and inject APP_KEY if missing or empty
			if !strings.Contains(content, "APP_KEY=") || strings.Contains(content, "APP_KEY=\n") || strings.HasSuffix(content, "APP_KEY=") {
				// Generate random key: base64:32bytes
				keyBytes := make([]byte, 32)
				if _, err := rand.Read(keyBytes); err == nil {
					key := "base64:" + base64.StdEncoding.EncodeToString(keyBytes)
					if strings.Contains(content, "APP_KEY=") {
						content = strings.Replace(content, "APP_KEY=", "APP_KEY="+key, 1)
					} else {
						content = "APP_KEY=" + key + "\n" + content
					}
				}
			}

			// Ensure debug is ON for troubleshooting
			if strings.Contains(content, "APP_DEBUG=") {
				content = strings.Replace(content, "APP_DEBUG=false", "APP_DEBUG=true", 1)
			} else {
				content += "\nAPP_DEBUG=true"
			}
			content = strings.Replace(content, "DB_HOST=127.0.0.1", "DB_HOST=mysql", 1)
			content = strings.Replace(content, "APP_URL=http://localhost", fmt.Sprintf("APP_URL=https://%s", s.Domain), 1)
			
			if s.DbName != "" {
				content = strings.Replace(content, "DB_DATABASE=laravel", "DB_DATABASE="+s.DbName, 1)
				content = strings.Replace(content, "DB_DATABASE=\"laravel\"", "DB_DATABASE=\""+s.DbName+"\"", 1)
			}
			if s.DbUser != "" {
				content = strings.Replace(content, "DB_USERNAME=root", "DB_USERNAME="+s.DbUser, 1)
				content = strings.Replace(content, "DB_USERNAME=\"root\"", "DB_USERNAME=\""+s.DbUser+"\"", 1)
			}
			if s.DbPassword != "" {
				content = strings.Replace(content, "DB_PASSWORD=", "DB_PASSWORD="+s.DbPassword, 1)
			}
			os.WriteFile(envFile, []byte(content), 0644)
			exec.Command("chmod", "-R", "777", targetDir).Run()
		}
		
		log.Printf("[Deploy] Build steps for %s will be handled inside the container.\n", s.Domain)
	}

	// 3. SPIN UP CONTAINER
	upCmd := exec.Command("docker", "compose", "-p", safeName, "up", "-d", "--build")
	upCmd.Dir = targetDir
	if out, err := upCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("docker compose failed: %v\nOutput: %s", err, string(out))
	}

	// Wait for container to be ready (max 10s)
	log.Printf("[Deploy] Waiting for container to stabilize...\n")
	time.Sleep(5 * time.Second)

	containerName := fmt.Sprintf("%s-web-1", safeName)
	if err := validateDeploymentContainer(containerName, hostPath, allDomains); err != nil {
		return err
	}

	// 3. Post-UP container configuration (Commands inside container)
	if s.Type == "laravel" {
		if err := runLaravelPostDeploy(containerName, targetDir); err != nil {
			return err
		}
	}

	if err := applyHostDeployPermissions(targetDir); err != nil {
		log.Printf("[Deploy] Warning while applying host permissions for %s: %v\n", s.Domain, err)
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

func runLaravelPostDeploy(containerName, targetDir string) error {
	logFile := filepath.Join(targetDir, "deployment.log")
	f, _ := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	defer f.Close()

	if err := waitForContainerFile(containerName, "/app/public/index.php", 20*time.Second); err != nil {
		fmt.Fprintf(f, "[%s] ERROR: %v\n", time.Now().Format(time.RFC3339), err)
		return err
	}

	fmt.Fprintf(f, "[%s] Fixing permissions inside container %s...\n", time.Now().Format(time.RFC3339), containerName)
	if err := runCommandToLog(f, exec.Command("docker", "exec", "-u", "root", containerName, "chown", "-R", "1000:1000", "/app")); err != nil {
		fmt.Fprintf(f, "[%s] WARN: Failed to fix ownership: %v\n", time.Now().Format(time.RFC3339), err)
	}

	if !hostFileExists(filepath.Join(targetDir, "vendor", "autoload.php")) {
		fmt.Fprintf(f, "[%s] Installing PHP dependencies with Composer...\n", time.Now().Format(time.RFC3339))
		if err := runCommandToLog(f, exec.Command("docker", "exec", "-w", "/app", containerName, "composer", "install", "--no-interaction", "--prefer-dist", "--optimize-autoloader", "--ignore-platform-reqs")); err != nil {
			return fmt.Errorf("composer install failed: %v", err)
		}
	}

	if !containerFileExists(containerName, "/app/artisan") {
		return fmt.Errorf("laravel deploy failed: /app/artisan not found inside %s after mount and composer install", containerName)
	}

	fmt.Fprintf(f, "[%s] Generating artisan key...\n", time.Now().Format(time.RFC3339))
	if err := runCommandToLog(f, exec.Command("docker", "exec", "-w", "/app", containerName, "php", "artisan", "key:generate", "--force")); err != nil {
		return fmt.Errorf("artisan key:generate failed: %v", err)
	}

	fmt.Fprintf(f, "[%s] Running migrations...\n", time.Now().Format(time.RFC3339))
	if err := runCommandToLog(f, exec.Command("docker", "exec", "-w", "/app", containerName, "php", "artisan", "migrate", "--force")); err != nil {
		return fmt.Errorf("artisan migrate failed: %v", err)
	}

	if hostFileExists(filepath.Join(targetDir, "package.json")) {
		fmt.Fprintf(f, "[%s] Frontend package.json detected. Skipping npm build in PHP runtime image.\n", time.Now().Format(time.RFC3339))
	}

	fmt.Fprintf(f, "[%s] Fixing symlinks and storage...\n", time.Now().Format(time.RFC3339))
	exec.Command("docker", "exec", "-w", "/app", containerName, "rm", "-rf", "public/storage").Run()
	if err := runCommandToLog(f, exec.Command("docker", "exec", "-w", "/app", containerName, "php", "artisan", "storage:link")); err != nil {
		fmt.Fprintf(f, "[%s] WARN: storage:link failed: %v\n", time.Now().Format(time.RFC3339), err)
	}

	exec.Command("docker", "exec", "-u", "root", containerName, "chmod", "-R", "775", "/app/storage", "/app/bootstrap/cache").Run()
	fmt.Fprintf(f, "[%s] Deployment complete!\n", time.Now().Format(time.RFC3339))
	return nil
}

func waitForContainerFile(containerName, containerPath string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if containerFileExists(containerName, containerPath) {
			return nil
		}
		time.Sleep(1 * time.Second)
	}
	return fmt.Errorf("timed out waiting for %s to become available inside %s", containerPath, containerName)
}

func containerFileExists(containerName, containerPath string) bool {
	cmd := exec.Command("docker", "exec", containerName, "sh", "-lc", fmt.Sprintf("test -f %q", containerPath))
	return cmd.Run() == nil
}

func hostFileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func runCommandToLog(logFile *os.File, cmd *exec.Cmd) error {
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	return cmd.Run()
}

func applyHostDeployPermissions(targetDir string) error {
	ownerUID := envInt("PANEL_FILE_UID", 1000)
	ownerGID := envInt("PANEL_FILE_GID", 33)

	commands := []*exec.Cmd{
		exec.Command("chown", "-R", fmt.Sprintf("%d:%d", ownerUID, ownerGID), targetDir),
		exec.Command("find", targetDir, "-type", "d", "-exec", "chmod", "775", "{}", ";"),
		exec.Command("find", targetDir, "-type", "f", "-exec", "chmod", "664", "{}", ";"),
	}

	for _, cmd := range commands {
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("%s failed: %v (%s)", strings.Join(cmd.Args, " "), err, strings.TrimSpace(string(out)))
		}
	}

	for _, writableDir := range []string{
		filepath.Join(targetDir, "storage"),
		filepath.Join(targetDir, "bootstrap", "cache"),
	} {
		if hostFileExists(writableDir) {
			if out, err := exec.Command("chmod", "-R", "775", writableDir).CombinedOutput(); err != nil {
				return fmt.Errorf("chmod writable dirs failed: %v (%s)", err, strings.TrimSpace(string(out)))
			}
		}
	}

	return nil
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func cleanupConflictingSiteContainers(currentProject string, domains []string) error {
	cmd := exec.Command("docker", "ps", "-aq")
	out, err := cmd.Output()
	if err != nil {
		return err
	}

	containerIDs := strings.Fields(string(out))
	if len(containerIDs) == 0 {
		return nil
	}

	args := append([]string{"inspect", "--format", "{{.Name}}|{{json .Config.Labels}}|{{index .Config.Labels \"com.docker.compose.project\"}}"}, containerIDs...)
	inspectCmd := exec.Command("docker", args...)
	inspectOut, err := inspectCmd.Output()
	if err != nil {
		return err
	}

	for _, line := range strings.Split(strings.TrimSpace(string(inspectOut)), "\n") {
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, "|", 3)
		if len(parts) != 3 {
			continue
		}

		name := strings.TrimPrefix(parts[0], "/")
		labelsJSON := parts[1]
		projectName := parts[2]

		if !strings.HasPrefix(name, "site-") || projectName == currentProject {
			continue
		}

		matched := false
		for _, domain := range domains {
			if strings.Contains(labelsJSON, domain) {
				matched = true
				break
			}
		}

		if !matched {
			continue
		}

		log.Printf("[Deploy] Removing conflicting container %s (project %s)\n", name, projectName)
		exec.Command("docker", "rm", "-f", name).Run()
	}

	return nil
}

func validateDeploymentContainer(containerName, expectedHostPath string, expectedDomains []string) error {
	cmd := exec.Command("docker", "inspect", containerName)
	out, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to inspect deployed container %s: %v", containerName, err)
	}

	var inspectData []struct {
		Mounts []struct {
			Source      string `json:"Source"`
			Destination string `json:"Destination"`
		} `json:"Mounts"`
		Config struct {
			Labels map[string]string `json:"Labels"`
		} `json:"Config"`
	}

	if err := json.Unmarshal(out, &inspectData); err != nil || len(inspectData) == 0 {
		return fmt.Errorf("failed to parse inspect data for %s", containerName)
	}

	mountOK := false
	for _, mount := range inspectData[0].Mounts {
		if mount.Source == expectedHostPath {
			mountOK = true
			break
		}
	}
	if !mountOK {
		return fmt.Errorf("deployment verification failed: %s is not mounted from expected host path %s", containerName, expectedHostPath)
	}

	labels := inspectData[0].Config.Labels
	labelValues := make([]string, 0, len(labels))
	for _, value := range labels {
		labelValues = append(labelValues, value)
	}
	joinedLabels := strings.Join(labelValues, " ")
	for _, domain := range expectedDomains {
		if !strings.Contains(joinedLabels, domain) {
			return fmt.Errorf("deployment verification failed: %s labels do not contain expected domain %s", containerName, domain)
		}
	}

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
