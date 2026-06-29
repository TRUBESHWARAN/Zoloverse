<?php
// scratch/db_check.php
require_once __DIR__ . '/../api/config.php';

try {
    $stmt = $pdo->query("SELECT id, name, email, role FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "database_connected" => true,
        "users_count" => count($users),
        "users" => $users
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "database_connected" => false,
        "error" => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
