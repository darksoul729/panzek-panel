package data

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username string `gorm:"uniqueIndex"`
	Password string
	Role     string
}

type Service struct {
	gorm.Model
	Name      string `gorm:"uniqueIndex"`
	Status    string
	Port      int
	AutoStart bool
}

type ActivityLog struct {
	gorm.Model
	Action      string
	Description string
	UserID      uint
	User        User
}

type PanelSetting struct {
	gorm.Model
	Key   string `gorm:"uniqueIndex"`
	Value string
}

type Site struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
	Domain     string         `gorm:"uniqueIndex" json:"domain"`
	Path       string         `json:"document_root"`
	Status     string         `json:"status"` // active, deploying, error
	Type       string         `json:"type"`   // static, php, laravel, proxy
	Port       int            `json:"port"`
	GitURL     string         `json:"git_url"`
	Branch     string         `json:"branch"`
	LastDeploy time.Time      `json:"last_deploy"`
	DbName     string         `json:"db_name"`
	DbUser     string         `json:"db_user"`
	DbPassword string         `json:"db_password"`
}

type CustomDomain struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	SiteID    uint           `json:"site_id"`
	Domain    string         `gorm:"uniqueIndex" json:"domain"`
	SSLStatus string         `json:"ssl_status"` // pending, active, error
}

type DnsZone struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Name      string         `gorm:"uniqueIndex" json:"name"`
	Type      string         `json:"type"` // MASTER
	Records   []DnsRecord    `json:"records" gorm:"foreignKey:ZoneID"`
}

type DnsRecord struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	ZoneID    uint           `json:"zone_id"`
	Name      string         `json:"name"`
	Type      string         `json:"type"` // A, CNAME, TXT...
	Content   string         `json:"content"`
	TTL       int            `json:"ttl"`
}

var DB *gorm.DB

func Connect() {
	host := os.Getenv("PANEL_DB_HOST")
	user := os.Getenv("PANEL_DB_USER")
	password := os.Getenv("PANEL_DB_PASSWORD")
	dbname := os.Getenv("PANEL_DB_NAME")
	port := os.Getenv("PANEL_DB_PORT")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", 
		host, user, password, dbname, port)
	
	var db *gorm.DB
	var err error
	for i := 0; i < 30; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			// Check if connection is actually usable
			sqlDB, err2 := db.DB()
			if err2 == nil {
				err2 = sqlDB.Ping()
				if err2 == nil {
					break
				}
			}
			err = err2
		}
		log.Printf("Waiting for database... (attempt %d/30): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("Could not connect to database after 30 attempts, exiting.")
	}

	// Auto Migration
	db.AutoMigrate(&User{}, &Service{}, &ActivityLog{}, &PanelSetting{}, &Site{}, &CustomDomain{}, &DnsZone{}, &DnsRecord{})
	
	DB = db
	
	seed()
}

func seed() {
	var userCount int64
	DB.Model(&User{}).Count(&userCount)
	if userCount == 0 {
		DB.Create(&User{Username: "admin", Password: "admin123", Role: "admin"})
	}

	var siteCount int64
	DB.Model(&Site{}).Count(&siteCount)
	if siteCount == 0 {
		DB.Create(&Site{Domain: "myserver.local", Path: "/var/www/html", Status: "online", Type: "static"})
	}

	// Ensure core services exist
	coreServices := []Service{
		{Name: "Nginx", Status: "running", Port: 80, AutoStart: true},
		{Name: "PostgreSQL", Status: "running", Port: 5432, AutoStart: true},
		{Name: "MySQL", Status: "running", Port: 3306, AutoStart: true},
	}

	for _, s := range coreServices {
		var count int64
		DB.Model(&Service{}).Where("name = ?", s.Name).Count(&count)
		if count == 0 {
			DB.Create(&s)
		}
	}

	var settingCount int64
	DB.Model(&PanelSetting{}).Count(&settingCount)
	if settingCount == 0 {
		DB.Create(&PanelSetting{Key: "panel_name", Value: "Panzek Panel"})
		DB.Create(&PanelSetting{Key: "version", Value: "2.1.0 (Enterprise)"})
		DB.Create(&PanelSetting{Key: "theme", Value: "light"})
		DB.Create(&PanelSetting{Key: "debug_mode", Value: "false"})
	}
}
