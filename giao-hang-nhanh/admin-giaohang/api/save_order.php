<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$normalize_service_type = function ($value) {
    $normalized = strtolower(trim((string) $value));
    $map = [
        'giao_ngay_lap_tuc' => 'instant',
        'giao_hoa_toc' => 'express',
        'giao_nhanh' => 'fast',
        'giao_tieu_chuan' => 'standard',
        'so_luong_lon' => 'bulk',
        'quoc_te_tiet_kiem' => 'intl_economy',
        'quoc_te_hoa_toc' => 'intl_express',
    ];
    return $map[$normalized] ?? $normalized;
};

$to_vn_service_code = function ($value) use ($normalize_service_type) {
    $normalized = $normalize_service_type($value);
    $map = [
        'instant' => 'giao_ngay_lap_tuc',
        'express' => 'giao_hoa_toc',
        'fast' => 'giao_nhanh',
        'standard' => 'giao_tieu_chuan',
        'bulk' => 'so_luong_lon',
        'intl_economy' => 'quoc_te_tiet_kiem',
        'intl_express' => 'quoc_te_hoa_toc',
    ];
    return $map[$normalized] ?? $normalized;
};

$json = file_get_contents('php://input');
$data = json_decode($json, true) ?: $_POST;

$order_code = 'GH' . strtoupper(substr(md5(time()), 0, 8));

// Thu thập đầy đủ các trường từ Frontend để lưu vào bảng orders bản đầy đủ
$fields = [
    'user_id'          => $data['user_id'] ?? null,
    'pickup_address'   => $data['pickup'] ?? '',
    'name'             => $data['name'] ?? '',
    'phone'            => $data['phone'] ?? '',
    'receiver_name'    => $data['receiver_name'] ?? '',
    'receiver_phone'   => $data['receiver_phone'] ?? '',
    'delivery_address' => $data['delivery'] ?? '',
    'intl_country'     => $data['intl_country'] ?? null,
    'intl_province'    => $data['intl_province'] ?? null,
    'intl_postal_code' => $data['intl_postal_code'] ?? null,
    'receiver_id_number' => $data['receiver_id_number'] ?? null,
    'is_corporate'     => (int)($data['is_corporate'] ?? 0),
    'company_name'     => $data['company_name'] ?? null,
    'company_email'    => $data['company_email'] ?? null,
    'company_tax_code' => $data['company_tax_code'] ?? null,
    'company_address'  => $data['company_address'] ?? null,
    'company_bank_info'=> $data['company_bank_info'] ?? null,
    'package_type'     => $data['package_type'] ?? 'other',
    'service_type'     => $data['service_type'] ?? 'standard',
    'intl_purpose'     => $data['intl_purpose'] ?? null,
    'intl_hs_code'     => $data['intl_hs_code'] ?? null,
    'vehicle_type'     => $data['vehicle_type'] ?? null,
    'client_order_code'=> $data['client_order_code'] ?? null,
    'weight'           => (float)($data['weight'] ?? 0),
    'cod_amount'       => (float)($data['cod_amount'] ?? 0),
    'shipping_fee'     => (float)($data['shipping_fee'] ?? 0),
    'note'             => $data['note'] ?? '',
    'payment_method'   => $data['payment_method'] ?? 'cod',
    'payment_status'   => $data['payment_status'] ?? 'unpaid'
];

$fields['service_type'] = $to_vn_service_code($fields['service_type']);

if (empty($fields['name']) || empty($fields['phone']) || empty($fields['delivery_address'])) {
    echo json_encode(['status' => 'error', 'message' => 'Lỗi: Thiếu thông tin bắt buộc (Tên, SĐT hoặc địa chỉ giao)']);
    exit;
}

$sql = "INSERT INTO don_hang (
    ma_don_hang, nguoi_dung_id, dia_chi_lay_hang, ten_nguoi_gui, so_dien_thoai_nguoi_gui,
    ten_nguoi_nhan, so_dien_thoai_nguoi_nhan, dia_chi_giao_hang,
    quoc_gia_quoc_te, tinh_bang_quoc_te, ma_buu_chinh_quoc_te, so_giay_to_nguoi_nhan,
    la_doanh_nghiep, ten_cong_ty, email_cong_ty, ma_so_thue_cong_ty, dia_chi_cong_ty, thong_tin_ngan_hang_cong_ty,
    loai_goi_hang, loai_dich_vu, muc_dich_quoc_te, ma_hs_quoc_te, loai_phuong_tien, ma_don_hang_khach,
    tong_can_nang, so_tien_cod, phi_van_chuyen,
    ghi_chu, phuong_thuc_thanh_toan, trang_thai_thanh_toan, trang_thai
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')";

$stmt = $conn->prepare($sql);
// 29 tham số: sisssssssssssisssssssssdddsss
$stmt->bind_param("sissssssssssssssssissssssssdddsss", 
    $order_code, $fields['user_id'], $fields['pickup_address'], $fields['name'], $fields['phone'],
    $fields['receiver_name'], $fields['receiver_phone'], $fields['delivery_address'],
    $fields['intl_country'], $fields['intl_province'], $fields['intl_postal_code'], $fields['receiver_id_number'],
    $fields['is_corporate'], $fields['company_name'], $fields['company_email'], $fields['company_tax_code'], $fields['company_address'], $fields['company_bank_info'],
    $fields['package_type'], $fields['service_type'], $fields['intl_purpose'], $fields['intl_hs_code'], $fields['vehicle_type'], $fields['client_order_code'],
    $fields['weight'], $fields['cod_amount'], $fields['shipping_fee'], 
    $fields['note'], $fields['payment_method'], $fields['payment_status']
);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'order_code' => $order_code, 'message' => 'Đã lưu đơn hàng lên hệ thống!']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Lỗi DB: ' . $stmt->error]);
}
?>
