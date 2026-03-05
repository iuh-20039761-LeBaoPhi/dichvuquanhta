<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=UTF-8');

$services = [];
$testimonials = [];
$faqs = [];

$servicesRes = $conn->query("SELECT id, name, type_key, base_price FROM services ORDER BY base_price ASC");
if ($servicesRes) {
    while ($row = $servicesRes->fetch_assoc()) {
        $services[] = $row;
    }
}

$testimonialsRes = $conn->query("SELECT customer_name, customer_role, content, rating FROM testimonials WHERE is_visible = 1 ORDER BY created_at DESC LIMIT 3");
if ($testimonialsRes) {
    while ($row = $testimonialsRes->fetch_assoc()) {
        $testimonials[] = $row;
    }
}

$faqsRes = $conn->query("SELECT question, answer FROM faqs ORDER BY display_order ASC");
if ($faqsRes) {
    while ($row = $faqsRes->fetch_assoc()) {
        $faqs[] = $row;
    }
}

$pricingConfig = ['weight_free' => 2, 'weight_price' => 5000, 'cod_min' => 5000];
$isLoggedIn = !empty($_SESSION['user_id']);
$role = $isLoggedIn ? ($_SESSION['role'] ?? 'customer') : 'guest';

echo json_encode([
    'status' => 'success',
    'data' => [
        'services' => $services,
        'testimonials' => $testimonials,
        'faqs' => $faqs,
        'pricing_config' => $pricingConfig,
        'is_logged_in' => $isLoggedIn,
        'role' => $role
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$conn->close();
?>
