<?php
// scratch/password_check.php
require_once __DIR__ . '/../api/config.php';

$test_password = 'Zoloverse!';

$emails = ['admin@zoloverse.com', 'chiranjeevi@zoloverse.com'];
$results = [];

foreach ($emails as $email) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();
    
    if ($user) {
        $verified = password_verify($test_password, $user['password']);
        $results[$email] = [
            "exists" => true,
            "role" => $user['role'],
            "password_hash" => $user['password'],
            "verified_with_Zoloverse_exclamation" => $verified
        ];
    } else {
        $results[$email] = [
            "exists" => false
        ];
    }
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>
