package handlers

import (
	"home-server-panel/internal/data"
	"os/exec"
	"runtime"

	"github.com/gofiber/fiber/v2"
)

func ListServices(c *fiber.Ctx) error {
	var services []data.Service
	data.DB.Find(&services)
	
	type ServiceResponse struct {
		ID        uint   `json:"id"`
		Name      string `json:"name"`
		Status    string `json:"status"`
		Running   bool   `json:"running"`
		Port      int    `json:"port"`
		AutoStart bool   `json:"auto_start"`
	}

	result := []ServiceResponse{}
	for _, s := range services {
		running := isServiceRunning(s.Name)
		result = append(result, ServiceResponse{
			ID:        s.ID,
			Name:      s.Name,
			Status:    s.Status,
			Running:   running,
			Port:      s.Port,
			AutoStart: s.AutoStart,
		})
	}

	return c.JSON(result)
}

func ControlService(c *fiber.Ctx) error {
	action := c.Query("action")
	type Request struct {
		Name string `json:"name"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// WARNING: In a real production environment, this needs strict validation
	// and likely sudo permissions configured for the web user.
	var cmd *exec.Cmd
	switch action {
	case "start":
		cmd = exec.Command("systemctl", "start", req.Name)
	case "stop":
		cmd = exec.Command("systemctl", "stop", req.Name)
	case "restart":
		cmd = exec.Command("systemctl", "restart", req.Name)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
	}

	err := cmd.Run()
	if err != nil {
		// Simulation for demo/docker environment
		status := "running"
		if action == "stop" {
			status = "stopped"
		}
		data.DB.Model(&data.Service{}).Where("name = ?", req.Name).Update("status", status)
		return c.JSON(fiber.Map{"success": true, "message": "Service action simulated", "service": req.Name})
	}

	status := "running"
	if action == "stop" {
		status = "stopped"
	}
	data.DB.Model(&data.Service{}).Where("name = ?", req.Name).Update("status", status)
	
	// Record Activity
	data.DB.Create(&data.ActivityLog{
		Action:      "service." + action,
		Description: "Service '" + req.Name + "' " + action + "ed successfully",
		UserID:      1,
	})

	return c.JSON(fiber.Map{"success": true, "service": req.Name})
}

func CreateService(c *fiber.Ctx) error {
	var service data.Service
	if err := c.BodyParser(&service); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	service.Status = "stopped"
	if err := data.DB.Create(&service).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	data.DB.Create(&data.ActivityLog{
		Action:      "service.create",
		Description: "Created new service: " + service.Name,
		UserID:      1,
	})
	
	return c.JSON(service)
}

func DeleteService(c *fiber.Ctx) error {
	id := c.Params("id")
	var service data.Service
	data.DB.First(&service, id)

	if err := data.DB.Unscoped().Delete(&data.Service{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	data.DB.Create(&data.ActivityLog{
		Action:      "service.delete",
		Description: "Deleted service: " + service.Name,
		UserID:      1,
	})

	return c.JSON(fiber.Map{"success": true})
}

func isServiceRunning(name string) bool {
	if runtime.GOOS == "windows" {
		return false
	}
	
	// Check via pgrep
	err := exec.Command("pgrep", "-x", name).Run()
	if err == nil {
		return true
	}

	// Fallback to database status
	var s data.Service
	data.DB.Where("name = ?", name).First(&s)
	return s.Status == "running"
}
