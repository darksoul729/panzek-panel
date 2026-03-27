<?php
$host = 'mysql';
$db   = 'laravel';
$user = 'root';
$pass = 'root_secret';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

echo "Connecting to $host...\n";
try {
     $pdo = new PDO($dsn, $user, $pass, $options);
     echo "Connection success!\n";
} catch (\PDOException $e) {
     echo "Connection failed: " . $e->getMessage() . "\n";
}
