package main

import (
	"log"
	"os"

	"home-server-panel/internal/data"
	"home-server-panel/internal/handlers"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/contrib/websocket"
)

func main() {
	// Connect Database
	data.Connect()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowCredentials: true,
		AllowOrigins:     "http://localhost:5173",
		AllowHeaders:     "Origin, Content-Type, Accept",
	}))

	// Terminal WebSocket
	app.Get("/ws/terminal", handlers.TerminalMiddleware, websocket.New(handlers.TerminalHandler))

	// Static files serving
	app.Static("/", "./web")
	app.Static("/assets", "./web/assets")

	// API Routes
	api := app.Group("/api")
	
	// Auth
	api.Post("/auth/login", handlers.Login)
	api.Post("/auth/logout", handlers.Logout)
	api.Get("/auth/check", handlers.AuthCheck)

	// System Monitoring
	system := api.Group("/system")
	system.Get("/info", handlers.GetSystemInfo)
	system.Get("/cpu", handlers.GetCPUUsage)
	system.Get("/memory", handlers.GetMemoryUsage)
	system.Get("/disk", handlers.GetDiskUsage)
	
	// Services
	services := api.Group("/services")
	services.Get("/list", handlers.ListServices)
	services.Post("/control", handlers.ControlService)
	services.Post("/", handlers.CreateService)
	services.Delete("/:id", handlers.DeleteService)

	// Files
	files := api.Group("/files")
	files.Get("/list", handlers.ListFiles)
	files.Get("/read", handlers.ReadFile)
	files.Get("/download", handlers.DownloadFile)
	files.Post("/save", handlers.SaveFile)
	files.Post("/rename", handlers.RenameFile)
	files.Post("/mkdir", handlers.CreateDirectory)
	files.Delete("/", handlers.DeleteFile)

	// Git
	git := api.Group("/git")
	git.Post("/clone", handlers.CloneRepo)

	// Sites
	sites := api.Group("/sites")
	sites.Get("/list", handlers.ListSites)
	sites.Post("/", handlers.CreateSite)
	sites.Delete("/:id", handlers.DeleteSite)
	sites.Get("/:id/logs", handlers.GetSiteLogs)
	sites.Post("/:id/control", handlers.ControlSite)
	sites.Post("/deploy", handlers.DeploySite)
 
	// Custom Domains
	domains := api.Group("/domains")
	domains.Get("/", handlers.GetDomains)
	domains.Post("/", handlers.AddDomain)
	domains.Delete("/:id", handlers.DeleteDomain)

	// DNS
	dns := api.Group("/dns")
	dns.Get("/zones", handlers.ListZones)
	dns.Post("/zones", handlers.CreateZone)
	dns.Delete("/zones/:id", handlers.DeleteZone)
	dns.Get("/records", handlers.GetRecords)
	dns.Post("/records", handlers.CreateRecord)
	dns.Delete("/records/:id", handlers.DeleteRecord)
 
	// Databases
	dbs := api.Group("/databases")
	dbs.Get("/", handlers.ListDatabases)       // GET /databases
	dbs.Get("/list", handlers.ListDatabases)    // GET /databases/list (alias)
	dbs.Get("/tables/:name", handlers.ListTables)   // GET /databases/tables/:name (legacy)
	dbs.Get("/:name/tables", handlers.ListTables)   // GET /databases/:name/tables (frontend uses this)
	dbs.Post("/", handlers.CreateDatabase)
	dbs.Delete("/:name", handlers.DeleteDatabase)

	// Logs
	logs := api.Group("/logs")
	logs.Get("/activity", handlers.GetActivityLogs)
	logs.Get("/:type", handlers.GetSystemLogs)

	// Settings
	settings := api.Group("/settings")
	settings.Get("/", handlers.GetSettings)
	settings.Post("/", handlers.UpdateSettings)
	settings.Post("/cloudflare/tunnel", handlers.SetupCloudflareTunnel)
	settings.Post("/cloudflare/tunnel/restart", handlers.RestartCloudflareTunnel)
	settings.Post("/reset", handlers.ResetDatabase)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
