<?php

function verifySessionToken($requireAdmin = false) {
    $auth = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['HTTP_X_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_X_AUTHORIZATION'];
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $headers['X-Authorization'] ?? $headers['x-authorization'] ?? '';
    }

    if (!preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
        return null;
    }

    $payload = json_decode(base64_decode($matches[1]));
    if (!$payload || ($payload->exp ?? 0) <= time()) {
        return null;
    }

    if ($requireAdmin && ($payload->role ?? 'customer') !== 'admin') {
        return null;
    }

    return $payload;
}

function requireAuth($pdo, $requireAdmin = false) {
    $user = verifySessionToken($requireAdmin);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
        exit();
    }
    return $user;
}
