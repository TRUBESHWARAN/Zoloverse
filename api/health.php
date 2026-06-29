<?php
require_once 'config.php';

$status = 'operational';
$services = [];

try {
    $pdo->query("SELECT 1");
    $services['database'] = ['status' => 'up', 'label' => 'MySQL Database'];
} catch (Exception $e) {
    $status = 'degraded';
    $services['database'] = ['status' => 'down', 'label' => 'MySQL Database', 'error' => $e->getMessage()];
}

$endpoints = ['products.php', 'orders.php', 'auth.php', 'review.php'];
foreach ($endpoints as $ep) {
    $services[pathinfo($ep, PATHINFO_FILENAME)] = [
        'status' => file_exists(__DIR__ . '/' . $ep) ? 'up' : 'down',
        'label' => $ep
    ];
}

echo json_encode([
    'status' => $status,
    'timestamp' => date('c'),
    'services' => $services
]);
