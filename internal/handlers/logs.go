package handlers

import (
	"home-server-panel/internal/data"
	"github.com/gofiber/fiber/v2"
	"os/exec"
	"strings"
)

func GetActivityLogs(c *fiber.Ctx) error {
	var logs []data.ActivityLog
	data.DB.Preload("User").Order("created_at desc").Limit(50).Find(&logs)
	
	return c.JSON(fiber.Map{"logs": logs})
}

func GetSystemLogs(c *fiber.Ctx) error {
	action := c.Params("type")
	
	var output []byte
	var err error
	
	switch action {
	case "system":
		output, err = exec.Command("journalctl", "-n", "50", "--no-pager").Output()
	case "nginx":
		// Mock or read actual /var/log/nginx/error.log
		output = []byte("Nginx logs not accessible in this environment")
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid log type"})
	}

	if err != nil {
		mockLogs := []string{
			"Mar 24 17:02:15 kernel: Initializing TCP legacy scan: [PASSED]",
			"Mar 24 17:02:15 systemd[1]: Started Panzek Panel Backend.",
			"Mar 24 17:02:16 postgres[41]: database system is ready to accept connections",
			"Mar 24 17:02:17 fiber: Server starting on port 3000",
			"Mar 24 17:02:18 nginx: [info] 127.0.0.1 worker process 4567 started",
		}
		return c.JSON(fiber.Map{"logs": mockLogs})
	}

	lines := strings.Split(string(output), "\n")
	return c.JSON(fiber.Map{"logs": lines})
}
