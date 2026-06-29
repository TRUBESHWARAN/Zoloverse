<?php
require_once 'config.php';

$data = json_decode(file_get_contents("php://input"));
$action = $_GET['action'] ?? '';

if ($action === 'config') {
    echo json_encode([
        "google_client_id" => defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : ''
    ]);
    exit();
}

if ($action === 'register') {
    if (!empty($data->name) && !empty($data->email) && !empty($data->password)) {
        $hashed = password_hash($data->password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, 'customer')");
        try {
            $stmt->execute([':name' => $data->name, ':email' => $data->email, ':password' => $hashed]);
            echo json_encode(["success" => true, "message" => "Account created successfully. Please sign in."]);
        } catch (PDOException $e) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "This email is already registered."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Please fill in all required fields."]);
    }
    exit();
}

if ($action === 'login') {
    if (!empty($data->email) && !empty($data->password)) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :identifier OR name = :identifier LIMIT 1");
        $stmt->execute([':identifier' => $data->email]);
        $user = $stmt->fetch();

        if ($user && password_verify($data->password, $user['password'])) {
            $role = $user['role'] ?? 'customer';
            $tokenPayload = [
                "id" => (int)$user['id'],
                "email" => $user['email'],
                "name" => $user['name'],
                "role" => $role,
                "exp" => time() + 86400
            ];
            $token = base64_encode(json_encode($tokenPayload));
            echo json_encode([
                "success" => true,
                "token" => $token,
                "user" => [
                    "name" => $user['name'],
                    "email" => $user['email'],
                    "role" => $role
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Invalid email or password."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Email and password are required."]);
    }
    exit();
}

if ($action === 'google_login') {
    if (!empty($data->credential)) {
        $google_token = $data->credential;
        $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($google_token);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200 && $response) {
            $payload = json_decode($response);
            
            $config_client_id = defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : '';
            $is_placeholder = (strpos($config_client_id, 'YOUR_GOOGLE_CLIENT_ID') !== false);
            
            if (!$is_placeholder && isset($payload->aud) && $payload->aud !== $config_client_id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Audience verification failed."]);
                exit();
            }
            
            $iss = $payload->iss ?? '';
            if ($iss !== 'https://accounts.google.com' && $iss !== 'accounts.google.com') {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Issuer verification failed."]);
                exit();
            }
            
            if (($payload->exp ?? 0) <= time()) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Token has expired."]);
                exit();
            }
            
            $email = $payload->email ?? '';
            $name = $payload->name ?? 'Google User';
            
            if (empty($email)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Email not found in Google payload."]);
                exit();
            }
            
            $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
            $stmt->execute([':email' => $email]);
            $user = $stmt->fetch();
            
            if (!$user) {
                $random_password = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
                $insert_stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, 'customer')");
                $insert_stmt->execute([
                    ':name' => $name,
                    ':email' => $email,
                    ':password' => $random_password
                ]);
                
                $stmt->execute([':email' => $email]);
                $user = $stmt->fetch();
            }
            
            $role = $user['role'] ?? 'customer';
            $tokenPayload = [
                "id" => (int)$user['id'],
                "email" => $user['email'],
                "name" => $user['name'],
                "role" => $role,
                "exp" => time() + 86400
            ];
            $token = base64_encode(json_encode($tokenPayload));
            
            echo json_encode([
                "success" => true,
                "token" => $token,
                "user" => [
                    "name" => $user['name'],
                    "email" => $user['email'],
                    "role" => $role
                ]
            ]);
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Failed to verify token with Google API."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Google credential token required."]);
    }
    exit();
}

if ($action === 'verify') {
    require_once 'includes/auth_helpers.php';
    $user = verifySessionToken(false);
    if ($user) {
        echo json_encode([
            "valid" => true,
            "user" => [
                "name" => $user->name ?? '',
                "email" => $user->email ?? '',
                "role" => $user->role ?? 'customer'
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["valid" => false, "message" => "Session expired. Please sign in again."]);
    }
    exit();
}

http_response_code(400);
echo json_encode(["success" => false, "message" => "Invalid action."]);
