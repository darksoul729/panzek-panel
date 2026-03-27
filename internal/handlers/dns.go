package handlers

import (
	"context"
	"home-server-panel/internal/data"
	"home-server-panel/internal/services"
	"log"

	"github.com/gofiber/fiber/v2"
)

// ListZones
func ListZones(c *fiber.Ctx) error {
	var zones []data.DnsZone
	if err := data.DB.Preload("Records").Find(&zones).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch zones"})
	}
	return c.JSON(zones)
}

// CreateZone — simpan ke DB lokal, lalu trigger Cloudflare di background
func CreateZone(c *fiber.Ctx) error {
	zone := new(data.DnsZone)
	if err := c.BodyParser(zone); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	zone.Type = "MASTER"

	if err := data.DB.Create(zone).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create zone"})
	}

	// Trigger Cloudflare di background — tidak memblokir response
	go func(domain string) {
		ns, err := services.SetupZoneAndRecord(context.Background(), domain)
		if err != nil {
			log.Printf("[CF] CreateZone skip: %v\n", err)
			return
		}
		log.Printf("[CF] Zone %s terdaftar via Tunnel. NS: %v\n", domain, ns)
	}(zone.Name)

	return c.Status(201).JSON(fiber.Map{
		"zone":    zone,
		"message": "Zone disimpan. Cloudflare akan diaktifkan di background jika credentials sudah diatur.",
	})
}

// DeleteZone
func DeleteZone(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := data.DB.Unscoped().Delete(&data.DnsZone{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete zone"})
	}
	// Also delete associated records
	data.DB.Unscoped().Where("zone_id = ?", id).Delete(&data.DnsRecord{})
	return c.Status(204).Send(nil)
}

// GetRecords
func GetRecords(c *fiber.Ctx) error {
	zoneID := c.Query("zone_id")
	var records []data.DnsRecord
	query := data.DB
	if zoneID != "" {
		query = query.Where("zone_id = ?", zoneID)
	}
	if err := query.Find(&records).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch records"})
	}
	return c.JSON(records)
}

// CreateRecord
func CreateRecord(c *fiber.Ctx) error {
	record := new(data.DnsRecord)
	if err := c.BodyParser(record); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if record.TTL == 0 {
		record.TTL = 3600
	}

	if err := data.DB.Create(record).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create record"})
	}
	return c.Status(201).JSON(record)
}

// DeleteRecord
func DeleteRecord(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := data.DB.Unscoped().Delete(&data.DnsRecord{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete record"})
	}
	return c.Status(204).Send(nil)
}
