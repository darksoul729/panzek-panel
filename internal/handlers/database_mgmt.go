package handlers

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gofiber/fiber/v2"
)

func getMySQLConn() (*sql.DB, error) {
	rootPass := os.Getenv("MYSQL_ROOT_PASSWORD")
	host := os.Getenv("MYSQL_HOST")
	if host == "" {
		host = "localhost"
	}
	dsn := fmt.Sprintf("root:%s@tcp(%s:3306)/", rootPass, host)
	return sql.Open("mysql", dsn)
}

type DBInfo struct {
	ID   int    `json:"ID"`
	Name string `json:"name"`
}

func ListDatabases(c *fiber.Ctx) error {
	db, err := getMySQLConn()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer db.Close()

	rows, err := db.Query("SHOW DATABASES")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var databases []DBInfo
	idx := 1
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			// Skip system databases
			if name != "information_schema" && name != "mysql" && name != "performance_schema" && name != "sys" {
				databases = append(databases, DBInfo{ID: idx, Name: name})
				idx++
			}
		}
	}

	if databases == nil {
		databases = []DBInfo{}
	}

	return c.JSON(databases)
}

func CreateDatabase(c *fiber.Ctx) error {
	type Request struct {
		Name     string `json:"name"`
		Username string `json:"username"`
		Password string `json:"password"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	db, err := getMySQLConn()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer db.Close()

	// 1. Create Database
	_, err = db.Exec(fmt.Sprintf("CREATE DATABASE `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", req.Name))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create database: " + err.Error()})
	}

	// 2. Create User and Grant Privileges (if provided)
	if req.Username != "" && req.Password != "" {
		// Clean up existing user if any (safe for development/panel)
		db.Exec(fmt.Sprintf("DROP USER IF EXISTS '%s'@'%%'", req.Username))

		_, err = db.Exec(fmt.Sprintf("CREATE USER '%s'@'%%' IDENTIFIED BY '%s'", req.Username, req.Password))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create database user: " + err.Error()})
		}

		_, err = db.Exec(fmt.Sprintf("GRANT ALL PRIVILEGES ON `%s`.* TO '%s'@'%%'", req.Name, req.Username))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to grant privileges: " + err.Error()})
		}

		db.Exec("FLUSH PRIVILEGES")
	}

	return c.JSON(fiber.Map{
		"message": "Database and user initialized successfully",
		"database": req.Name,
		"username": req.Username,
	})
}

func DeleteDatabase(c *fiber.Ctx) error {
	name := c.Params("name")
	db, err := getMySQLConn()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer db.Close()

	_, err = db.Exec(fmt.Sprintf("DROP DATABASE `%s`", name))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Database deleted successfully"})
}

func ListTables(c *fiber.Ctx) error {
	name := c.Params("name")
	db, err := getMySQLConn()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer db.Close()

	// Switch to the target database
	_, err = db.Exec(fmt.Sprintf("USE `%s`", name))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	rows, err := db.Query("SHOW TABLES")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err == nil {
			tables = append(tables, tableName)
		}
	}

	return c.JSON(tables)
}
