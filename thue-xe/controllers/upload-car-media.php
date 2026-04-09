<?php
/**
 * Bộ xử lý Upload Media cho xe (Dịch Vụ Quanh Ta)
 * Lưu ảnh vào images/cars/ và Video vào video-cards/
 */
header('Content-Type: application/json');

// Cấu hình thư mục (Tính từ gốc website)
$imgDir = '../../images/cars/';
$videoDir = '../../video-cards/';

// Tạo thư mục nếu chưa có
if (!is_dir($imgDir)) mkdir($imgDir, 0777, true);
if (!is_dir($videoDir)) mkdir($videoDir, 0777, true);

$response = ['success' => false, 'files' => []];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $carId = isset($_POST['car_id']) ? $_POST['car_id'] : 'tmp';
    
    foreach ($_FILES as $key => $file) {
        if ($file['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $baseName = pathinfo($file['name'], PATHINFO_FILENAME);
            
            // Xác định thư mục đích dựa trên loại file
            $isImg = strpos($file['type'], 'image') !== false;
            $targetDir = $isImg ? $imgDir : $videoDir;
            
            // Xử lý ghi đè/Đặt tên: 
            // Nếu file đã tồn tại, thêm ID xe vào sau tên file
            $finalName = $baseName . '.' . $ext;
            if (file_exists($targetDir . $finalName)) {
                $finalName = $baseName . '-' . $carId . '.' . $ext;
            }
            
            if (move_uploaded_file($file['tmp_name'], $targetDir . $finalName)) {
                $response['files'][$key] = $finalName;
            }
        }
    }
    
    if (count($response['files']) > 0) {
        $response['success'] = true;
    }
}

echo json_encode($response);
?>
