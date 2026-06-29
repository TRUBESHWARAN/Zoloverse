<?php
require_once 'config.php';
require_once 'includes/auth_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    if ($action === 'low_stock') {
        requireAuth($pdo, true);
        $stmt = $pdo->query("SELECT id, title, stock_qty, category FROM products WHERE stock_qty <= 5 ORDER BY stock_qty ASC");
        echo json_encode($stmt->fetchAll());
        exit();
    }

    $stmt = $pdo->query("SELECT * FROM products ORDER BY id DESC");
    $products = $stmt->fetchAll();

    foreach ($products as &$p) {
        $vStmt = $pdo->prepare("SELECT size, price FROM product_variants WHERE product_id = :p_id");
        $vStmt->execute([':p_id' => $p['id']]);
        $p['variants'] = $vStmt->fetchAll();

        $rStmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = :p_id AND status = 'Approved'");
        $rStmt->execute([':p_id' => $p['id']]);
        $reviewStats = $rStmt->fetch();
        $p['avg_rating'] = $reviewStats['avg_rating'] ? round((float)$reviewStats['avg_rating'], 1) : 0;
        $p['review_count'] = (int)$reviewStats['review_count'];
    }

    echo json_encode($products);
    exit();
}

if ($method === 'POST') {
    requireAuth($pdo, true);
    $data = json_decode(file_get_contents("php://input"));

    if (!empty($data->title) && !empty($data->category) && !empty($data->img)) {
        $pdo->beginTransaction();
        try {
            if (!empty($data->id)) {
                $stmt = $pdo->prepare("UPDATE products SET title = :t, category = :c, description = :d, img = :i, stock_qty = :s, status = :st WHERE id = :id");
                $stmt->execute([
                    ':t' => $data->title,
                    ':c' => $data->category,
                    ':d' => $data->description ?? '',
                    ':i' => $data->img,
                    ':s' => (int)($data->stock_qty ?? 50),
                    ':st' => $data->status ?? 'Available',
                    ':id' => $data->id
                ]);
                $productId = $data->id;
                $pdo->prepare("DELETE FROM product_variants WHERE product_id = ?")->execute([$productId]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO products (title, category, description, img, stock_qty, status) VALUES (:t, :c, :d, :i, :s, :st)");
                $stmt->execute([
                    ':t' => $data->title,
                    ':c' => $data->category,
                    ':d' => $data->description ?? '',
                    ':i' => $data->img,
                    ':s' => (int)($data->stock_qty ?? 50),
                    ':st' => $data->status ?? 'Available'
                ]);
                $productId = $pdo->lastInsertId();
            }

            if (!empty($data->prices)) {
                $vStmt = $pdo->prepare("INSERT INTO product_variants (product_id, size, price) VALUES (:p_id, :size, :price)");
                foreach ($data->prices as $size => $price) {
                    if ((float)$price > 0) {
                        $vStmt->execute([':p_id' => $productId, ':size' => $size, ':price' => $price]);
                    }
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Product saved successfully.", "id" => $productId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Title, category, and image are required."]);
    }
    exit();
}

if ($method === 'DELETE') {
    requireAuth($pdo, true);
    $id = $_GET['id'] ?? '';
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true, "message" => "Product deleted."]);
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Product ID required."]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed."]);
