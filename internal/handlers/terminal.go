package handlers

import (
	"log"
	"os"
	"os/exec"

	"github.com/creack/pty"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func TerminalHandler(c *websocket.Conn) {
	// Default to bash or sh
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "sh"
	}

	cmd := exec.Command(shell)
	
	// Create a pseudo-terminal
	f, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Failed to start pty: %v", err)
		c.WriteMessage(websocket.TextMessage, []byte("\r\n[Panel] Failed to start terminal session\r\n"))
		return
	}
	defer f.Close()

	// Handle relaying data from terminal to socket
	copyErr := make(chan error, 1)
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := f.Read(buf)
			if err != nil {
				copyErr <- err
				return
			}
			if err := c.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
				copyErr <- err
				return
			}
		}
	}()

	// Handle relaying data from socket to terminal
	go func() {
		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				copyErr <- err
				return
			}
			if _, err := f.Write(msg); err != nil {
				copyErr <- err
				return
			}
		}
	}()

	// Wait for any error (disconnection or terminal exit)
	err = <-copyErr
	log.Printf("Terminal session ended: %v", err)
	cmd.Process.Kill()
}

func TerminalMiddleware(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}
