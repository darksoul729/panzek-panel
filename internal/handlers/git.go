package handlers

import (
	"fmt"
	"log"
	"os/exec"
	"path/filepath"
	"home-server-panel/internal/data"
	"github.com/gofiber/fiber/v2"
)

type CloneRequest struct {
	RepoURL string `json:"repo_url"`
	Branch  string `json:"branch"`
	Path    string `json:"path"` // Full path or relative to /var/www/html
}

func CloneRepo(c *fiber.Ctx) error {
	var req CloneRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.RepoURL == "" || req.Path == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Repo URL and Path are required"})
	}

	branch := req.Branch
	if branch == "" {
		branch = "main" // Default, but we might try master if it fails
	}

	// Run git clone
	log.Printf("Cloning %s (branch: %s) to %s", req.RepoURL, branch, req.Path)
	
	// Ensure parent directory exists
	parent := filepath.Dir(req.Path)
	exec.Command("mkdir", "-p", parent).Run()

	cmd := exec.Command("git", "clone", "-b", branch, req.RepoURL, req.Path)
	if out, err := cmd.CombinedOutput(); err != nil {
		log.Printf("Git clone (main) failed: %v, output: %s", err, string(out))
		// Try master if main failed and branch was empty
		if req.Branch == "" && branch == "main" {
			log.Printf("Retrying with branch 'master'...")
			cmd = exec.Command("git", "clone", "-b", "master", req.RepoURL, req.Path)
			if out2, err2 := cmd.CombinedOutput(); err2 == nil {
				goto success
			} else {
				log.Printf("Git clone (master) failed: %v, output: %s", err2, string(out2))
			}
		}
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Git clone failed: %v. Output: %s", err, string(out))})
	}

	// Set full permissions for Docker
	exec.Command("chmod", "-R", "777", req.Path).Run()

success:
	log.Printf("Successfully cloned %s to %s", req.RepoURL, req.Path)
	// Log activity
	data.DB.Create(&data.ActivityLog{
		Action:      "git.clone",
		Description: fmt.Sprintf("Cloned repository %s to %s", req.RepoURL, req.Path),
		UserID:      1,
	})

	return c.JSON(fiber.Map{"message": "Repository cloned successfully"})
}
