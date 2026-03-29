package handlers

import (
	"path/filepath"
	"strings"

	"home-server-panel/internal/data"
)

func panelSitesBasePath() string {
	return "/var/www"
}

func normalizeSitePath(rawPath, domain string) string {
	trimmedPath := strings.TrimSpace(rawPath)
	if trimmedPath == "" {
		trimmedPath = strings.TrimSpace(domain)
	}

	if trimmedPath == "" {
		return panelSitesBasePath()
	}

	if strings.HasPrefix(trimmedPath, panelSitesBasePath()+string(filepath.Separator)) || trimmedPath == panelSitesBasePath() {
		return trimmedPath
	}

	if strings.HasPrefix(trimmedPath, "/var/www/") {
		relPath, err := filepath.Rel("/var/www", trimmedPath)
		if err == nil && relPath != "." {
			return filepath.Join(panelSitesBasePath(), relPath)
		}
	}

	if strings.HasPrefix(trimmedPath, "/opt/home-server-panel/sites/") {
		relPath, err := filepath.Rel("/opt/home-server-panel/sites", trimmedPath)
		if err == nil && relPath != "." {
			return filepath.Join(panelSitesBasePath(), relPath)
		}
	}

	if filepath.IsAbs(trimmedPath) {
		return trimmedPath
	}

	return filepath.Join(panelSitesBasePath(), trimmedPath)
}

func syncSitePath(site *data.Site) string {
	normalizedPath := normalizeSitePath(site.Path, site.Domain)
	if site.Path != normalizedPath {
		site.Path = normalizedPath
		if site.ID != 0 && data.DB != nil {
			data.DB.Model(site).Update("path", normalizedPath)
		}
	}
	return normalizedPath
}
