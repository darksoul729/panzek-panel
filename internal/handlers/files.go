package handlers

import (
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type FileInfo struct {
	Name  string `json:"name"`
	IsDir bool   `json:"is_dir"`
	Size  int64  `json:"size"`
	Path  string `json:"path"`
}

const siteBaseDir = "/var/www"

func safeResolve(path string) string {
	clean := filepath.Clean(path)
	if clean == ".." || strings.HasPrefix(clean, "../") || filepath.IsAbs(clean) {
		// If it's absolute, we check if it starts with siteBaseDir
		if strings.HasPrefix(clean, siteBaseDir) {
			return clean
		}
		// Fallback to base
		return siteBaseDir
	}
	return filepath.Join(siteBaseDir, clean)
}

func ListFiles(c *fiber.Ctx) error {
	reqPath := c.Query("path", ".")
	fullPath := safeResolve(reqPath)

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	var files []FileInfo
	for _, entry := range entries {
		info, _ := entry.Info()
		
		// Return relative path to the baseDir for the frontend
		relPath, _ := filepath.Rel(siteBaseDir, filepath.Join(fullPath, entry.Name()))
		
		files = append(files, FileInfo{
			Name:  entry.Name(),
			IsDir: entry.IsDir(),
			Size:  info.Size(),
			Path:  relPath,
		})
	}

	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return files[i].Name < files[j].Name
	})

	return c.JSON(files)
}

func ReadFile(c *fiber.Ctx) error {
	reqPath := c.Query("path")
	if reqPath == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Path required"})
	}

	fullPath := safeResolve(reqPath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendString(string(content))
}

func SaveFile(c *fiber.Ctx) error {
	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	fullPath := safeResolve(req.Path)
	
	// Create directory if not exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	if err := os.WriteFile(fullPath, []byte(req.Content), 0644); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func CreateDirectory(c *fiber.Ctx) error {
	var req struct {
		Path string `json:"path"`
		Name string `json:"name"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	fullPath := safeResolve(filepath.Join(req.Path, req.Name))
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func DeleteFile(c *fiber.Ctx) error {
	reqPath := c.Query("path")
	if reqPath == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Path required"})
	}

	fullPath := safeResolve(reqPath)
	
	// Safety: prevent deleting the base directory itself
	if fullPath == siteBaseDir {
		return c.Status(403).JSON(fiber.Map{"error": "Cannot delete root directory"})
	}

	if err := os.RemoveAll(fullPath); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func RenameFile(c *fiber.Ctx) error {
	var req struct {
		OldPath string `json:"old_path"`
		NewName string `json:"new_name"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	oldFullPath := safeResolve(req.OldPath)
	newFullPath := filepath.Join(filepath.Dir(oldFullPath), req.NewName)

	if oldFullPath == siteBaseDir {
		return c.Status(403).JSON(fiber.Map{"error": "Cannot rename root directory"})
	}

	if err := os.Rename(oldFullPath, newFullPath); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func DownloadFile(c *fiber.Ctx) error {
	reqPath := c.Query("path")
	if reqPath == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Path required"})
	}

	fullPath := safeResolve(reqPath)
	return c.Download(fullPath)
}
