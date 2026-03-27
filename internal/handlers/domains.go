package handlers

import (
	"home-server-panel/internal/data"
	"github.com/gofiber/fiber/v2"
)

// GetDomains returns all custom domains for a specific site
func GetDomains(c *fiber.Ctx) error {
	siteID := c.Query("site_id")
	var domains []data.CustomDomain
	
	query := data.DB
	if siteID != "" {
		query = query.Where("site_id = ?", siteID)
	}

	if err := query.Find(&domains).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch domains"})
	}

	return c.JSON(domains)
}

// AddDomain adds a custom domain to a site
func AddDomain(c *fiber.Ctx) error {
	domain := new(data.CustomDomain)
	if err := c.BodyParser(domain); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if domain.Domain == "" || domain.SiteID == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "domain and site_id are required"})
	}

	domain.SSLStatus = "pending"

	if err := data.DB.Create(domain).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create custom domain. It might already exist."})
	}

	// Trigger background re-deploy to update Traefik labels
	var site data.Site
	if err := data.DB.First(&site, domain.SiteID).Error; err == nil {
		// Update deploy status
		site.Status = "deploying (updating routing)"
		data.DB.Save(&site)

		go func(s data.Site) {
			_ = performDeployment(&s)
			s.Status = "active"
			data.DB.Save(&s)
		}(site)
	}

	return c.Status(201).JSON(domain)
}

// DeleteDomain removes a custom domain
func DeleteDomain(c *fiber.Ctx) error {
	id := c.Params("id")
	
	var domain data.CustomDomain
	if err := data.DB.First(&domain, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Domain not found"})
	}

	siteID := domain.SiteID
	if err := data.DB.Unscoped().Delete(&domain).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete domain"})
	}

	// Trigger background re-deploy to update Traefik labels
	var site data.Site
	if err := data.DB.First(&site, siteID).Error; err == nil {
		site.Status = "deploying (updating routing)"
		data.DB.Save(&site)

		go func(s data.Site) {
			_ = performDeployment(&s)
			s.Status = "active"
			data.DB.Save(&s)
		}(site)
	}

	return c.Status(204).Send(nil)
}
