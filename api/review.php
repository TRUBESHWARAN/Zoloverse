<?php
require_once 'config.php';
require_once 'includes/auth_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $scope = $_GET['scope'] ?? 'approved';
    $productId = $_GET['product_id'] ?? null;

    if ($scope === 'all_admin') {
        requireAuth($pdo, true);
        $stmt = $pdo->query("SELECT r.*, p.title as product_title FROM reviews r JOIN products p ON r.product_id = p.id ORDER BY r.id DESC");
        echo json_encode($stmt->fetchAll());
        exit();
    }

    if ($productId) {
        $stmt = $pdo->prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'Approved' ORDER BY id DESC");
        $stmt->execute([$productId]);
        echo json_encode($stmt->fetchAll());
        exit();
    }

    $stmt = $pdo->query("SELECT * FROM reviews WHERE status = 'Approved' ORDER BY id DESC");
    echo json_encode($stmt->fetchAll());
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if (!empty($data->product_id) && !empty($data->user_name) && !empty($data->rating)) {
        $stmt = $pdo->prepare("INSERT INTO reviews (product_id, user_name, rating, comment, status) VALUES (?, ?, ?, ?, 'Pending')");
        $stmt->execute([
            $data->product_id,
            $data->user_name,
            (int)$data->rating,
            $data->comment ?? ''
        ]);
        echo json_encode(["success" => true, "message" => "Thank you! Your review is pending approval."]);
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Product, name, and rating are required."]);
    }
    exit();
}

if ($method === 'PUT') {
    requireAuth($pdo, true);
    $data = json_decode(file_get_contents("php://input"));
    if (!empty($data->review_id) && !empty($data->status)) {
        $allowed = ['Approved', 'Rejected', 'Pending'];
        if (!in_array($data->status, $allowed)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status."]);
            exit();
        }
        $stmt = $pdo->prepare("UPDATE reviews SET status = ? WHERE id = ?");
        $stmt->execute([$data->status, $data->review_id]);
        echo json_encode(["success" => true, "message" => "Review " . strtolower($data->status) . "."]);
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Review ID and status required."]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed."]);
