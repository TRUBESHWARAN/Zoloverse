<?php
require_once 'config.php';
require_once 'includes/auth_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $user = verifySessionToken(false);
    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Please sign in to place an order."]);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"));
    if (!empty($data->items) && !empty($data->total_amount)) {
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO orders (user_id, user_email, customer_name, address, phone, total_amount, payment_status, shipping_status) VALUES (:uid, :uemail, :name, :addr, :phone, :total, 'Paid', 'Waiting')");
            $stmt->execute([
                ':uid' => $user->id,
                ':uemail' => $user->email,
                ':name' => $data->customer_name,
                ':addr' => $data->address,
                ':phone' => $data->phone,
                ':total' => $data->total_amount
            ]);
            $orderId = $pdo->lastInsertId();

            $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, product_title, size, price, qty) VALUES (:oid, :pid, :title, :size, :price, :qty)");
            foreach ($data->items as $item) {
                $price = is_numeric($item->price) ? $item->price : preg_replace('/[^\d.]/', '', $item->price);
                $itemStmt->execute([
                    ':oid' => $orderId,
                    ':pid' => $item->product_id,
                    ':title' => $item->title,
                    ':size' => $item->size,
                    ':price' => $price,
                    ':qty' => $item->qty
                ]);
                $pdo->prepare("UPDATE products SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id = ?")->execute([$item->qty, $item->product_id]);
            }

            $to = "zoloverse26@gmail.com";
            $subject = "New Order #$orderId - Zoloverse Stickers";
            $message = "<html><body><h3>New sticker order received</h3><p>Customer: {$data->customer_name}<br>Phone: {$data->phone}<br>Total: ₹{$data->total_amount}</p></body></html>";
            $headers = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\nFrom: operations@zoloverse.com\r\n";
            @mail($to, $subject, $message, $headers);

            $pdo->commit();
            echo json_encode(["success" => true, "orderId" => $orderId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid order data."]);
    }
    exit();
}

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    if ($action === 'dashboard_kpis') {
        requireAuth($pdo, true);
        $revenue = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'Paid'")->fetchColumn();
        $ordersCount = $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $customersCount = $pdo->query("SELECT COUNT(DISTINCT user_id) FROM orders")->fetchColumn();
        $productsCount = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
        $pendingCount = $pdo->query("SELECT COUNT(*) FROM orders WHERE shipping_status = 'Waiting'")->fetchColumn();
        $printQueueCount = $pdo->query("SELECT COUNT(*) FROM orders WHERE shipping_status IN ('Printing', 'Printed')")->fetchColumn();
        $lowStockCount = $pdo->query("SELECT COUNT(*) FROM products WHERE stock_qty <= 5")->fetchColumn();
        $pendingReviews = $pdo->query("SELECT COUNT(*) FROM reviews WHERE status = 'Pending'")->fetchColumn();
        $activeUsers = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

        echo json_encode([
            "totalRevenue" => (float)$revenue,
            "totalRevenueFormatted" => "₹" . number_format($revenue, 2),
            "totalOrders" => (int)$ordersCount,
            "totalCustomers" => (int)$customersCount,
            "totalProducts" => (int)$productsCount,
            "pendingOrders" => (int)$pendingCount,
            "printQueue" => (int)$printQueueCount,
            "lowStock" => (int)$lowStockCount,
            "pendingReviews" => (int)$pendingReviews,
            "activeUsers" => (int)$activeUsers
        ]);
        exit();
    }

    if ($action === 'print_queue') {
        requireAuth($pdo, true);
        $stmt = $pdo->query("SELECT o.id as order_id, i.product_title, i.size, i.qty, o.shipping_status, o.customer_name FROM order_items i JOIN orders o ON i.order_id = o.id WHERE o.shipping_status IN ('Waiting', 'Printing', 'Printed') ORDER BY o.id ASC");
        echo json_encode($stmt->fetchAll());
        exit();
    }

    if ($action === 'customers_log') {
        requireAuth($pdo, true);
        $search = $_GET['search'] ?? '';
        $sql = "SELECT u.name, u.email, u.phone, COUNT(o.id) as totalOrders, COALESCE(SUM(o.total_amount), 0) as totalSpending
                FROM users u
                LEFT JOIN orders o ON u.id = o.user_id
                WHERE u.role = 'customer'";
        $params = [];
        if ($search) {
            $sql .= " AND (u.name LIKE :s OR u.email LIKE :s OR u.phone LIKE :s)";
            $params[':s'] = "%$search%";
        }
        $sql .= " GROUP BY u.id ORDER BY totalSpending DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        exit();
    }

    requireAuth($pdo, true);
    $stmt = $pdo->query("SELECT id, customer_name as customer, total_amount as amount, shipping_status as status, address, phone, payment_status, created_at FROM orders ORDER BY id DESC");
    $orders = $stmt->fetchAll();
    foreach ($orders as &$o) {
        $itemsStmt = $pdo->prepare("SELECT product_title, size, price, qty FROM order_items WHERE order_id = ?");
        $itemsStmt->execute([$o['id']]);
        $o['products'] = $itemsStmt->fetchAll();
    }
    echo json_encode($orders);
    exit();
}

if ($method === 'PUT') {
    requireAuth($pdo, true);
    $data = json_decode(file_get_contents("php://input"));
    if (!empty($data->order_id) && !empty($data->target_status)) {
        $allowed = ['Waiting', 'Printing', 'Printed', 'Shipped', 'Delivered'];
        if (!in_array($data->target_status, $allowed)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status."]);
            exit();
        }
        $stmt = $pdo->prepare("UPDATE orders SET shipping_status = :status WHERE id = :id");
        $stmt->execute([':status' => $data->target_status, ':id' => $data->order_id]);
        echo json_encode(["success" => true, "message" => "Order updated to: " . $data->target_status]);
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Order ID and status required."]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed."]);
