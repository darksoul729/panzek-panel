package handlers

import (
	"fmt"
	"net"
	"os"
	"runtime"
	"strings"
	"syscall"

	"github.com/gofiber/fiber/v2"
)

func GetSystemInfo(c *fiber.Ctx) error {
	hostname, _ := os.Hostname()
	kernel := "Unknown"
	if raw, err := os.ReadFile("/proc/version"); err == nil {
		// Format: "Linux version 5.x.x-... (gcc...) ..."
		parts := strings.Fields(string(raw))
		if len(parts) >= 3 {
			kernel = parts[2]
		} else if len(parts) > 0 {
			kernel = strings.TrimSpace(string(raw))
		}
	}

	return c.JSON(fiber.Map{
		"hostname":   hostname,
		"os":         runtime.GOOS,
		"arch":       runtime.GOARCH,
		"kernel":     kernel,
		"uptime":     getUptime(),
		"ip_address": getLocalIP(),
	})
}

func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

func GetCPUUsage(c *fiber.Ctx) error {
	var load1, load5, load15 float64
	if raw, err := os.ReadFile("/proc/loadavg"); err == nil {
		// Format: "0.52 0.58 0.59 1/512 12345"
		fmt.Sscanf(string(raw), "%f %f %f", &load1, &load5, &load15)
	}
	cores := runtime.NumCPU()
	// Normalize to percentage: load/cores * 100, cap at 100
	usagePercent := (load1 / float64(cores)) * 100
	if usagePercent > 100 {
		usagePercent = 100
	}
	return c.JSON(fiber.Map{
		"usage_percent": usagePercent,
		"cores":         cores,
		"model_name":    getCPUModel(),
		"load_1min":     load1,
		"load_5min":     load5,
		"load_15min":    load15,
	})
}

func getCPUModel() string {
	if raw, err := os.ReadFile("/proc/cpuinfo"); err == nil {
		lines := strings.Split(string(raw), "\n")
		for _, line := range lines {
			if strings.Contains(line, "model name") {
				parts := strings.Split(line, ":")
				if len(parts) >= 2 {
					return strings.TrimSpace(parts[1])
				}
			}
		}
	}
	return "Unknown Processor"
}

func GetMemoryUsage(c *fiber.Ctx) error {
	raw, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not read meminfo"})
	}

	lines := strings.Split(string(raw), "\n")
	var totalKB, availableKB uint64
	for _, line := range lines {
		if strings.HasPrefix(line, "MemTotal:") {
			fmt.Sscanf(line, "MemTotal: %d kB", &totalKB)
		}
		if strings.HasPrefix(line, "MemAvailable:") {
			fmt.Sscanf(line, "MemAvailable: %d kB", &availableKB)
		}
	}

	usedKB := totalKB - availableKB
	percent := 0.0
	if totalKB > 0 {
		percent = (float64(usedKB) / float64(totalKB)) * 100
	}

	// Return in MB
	return c.JSON(fiber.Map{
		"total":         totalKB / 1024,
		"used":          usedKB / 1024,
		"available":     availableKB / 1024,
		"usage_percent": percent,
	})
}

func GetDiskUsage(c *fiber.Ctx) error {
	var stat syscall.Statfs_t
	// Try host path first (when mounted), fallback to /
	path := "/"
	if _, err := os.Stat("/host"); err == nil {
		path = "/host"
	}
	if err := syscall.Statfs(path, &stat); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not read disk stats"})
	}

	totalBytes := stat.Blocks * uint64(stat.Bsize)
	freeBytes := stat.Bfree * uint64(stat.Bsize)
	usedBytes := totalBytes - freeBytes

	percent := 0.0
	if totalBytes > 0 {
		percent = (float64(usedBytes) / float64(totalBytes)) * 100
	}

	toGB := func(b uint64) float64 { return float64(b) / (1024 * 1024 * 1024) }

	return c.JSON(fiber.Map{
		"usage_percent": percent,
		"used":          fmt.Sprintf("%.1f", toGB(usedBytes)),
		"total":         fmt.Sprintf("%.1f", toGB(totalBytes)),
		"free":          fmt.Sprintf("%.1f", toGB(freeBytes)),
		"unit":          "GB",
	})
}

func getUptime() string {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return "Unknown"
	}
	var seconds float64
	fmt.Sscanf(string(data), "%f", &seconds)
	
	days := int(seconds) / 86400
	hours := (int(seconds) % 86400) / 3600
	mins := (int(seconds) % 3600) / 60
	return fmt.Sprintf("%dd %dh %dm", days, hours, mins)
}
