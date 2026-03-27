package handlers

import (
	"home-server-panel/internal/data"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"time"
)

// In-memory sessions (for ahora)
var sessions = make(map[string]string)

func Login(c *fiber.Ctx) error {
	type LoginRequest struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	var user data.User
	result := data.DB.Where("username = ? AND password = ?", req.Username, req.Password).First(&user)
	
	if result.Error == nil {
		sessionID := uuid.New().String()
		sessions[sessionID] = user.Username

		c.Cookie(&fiber.Cookie{
			Name:     "session_id",
			Value:    sessionID,
			Expires:  time.Now().Add(24 * time.Hour),
			HTTPOnly: true,
		})

		return c.JSON(fiber.Map{
			"success": true,
			"user": fiber.Map{
				"id":       1,
				"username": "admin",
				"role":     "admin",
			},
		})
	}

	return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
}

func Logout(c *fiber.Ctx) error {
	sessionID := c.Cookies("session_id")
	delete(sessions, sessionID)

	c.ClearCookie("session_id")
	return c.JSON(fiber.Map{"success": true})
}

func AuthCheck(c *fiber.Ctx) error {
	sessionID := c.Cookies("session_id")
	username, ok := sessions[sessionID]

	if !ok {
		return c.JSON(fiber.Map{"authenticated": false})
	}

	return c.JSON(fiber.Map{
		"authenticated": true,
		"user": fiber.Map{
			"id":       1,
			"username": username,
			"role":     "admin",
		},
	})
}
