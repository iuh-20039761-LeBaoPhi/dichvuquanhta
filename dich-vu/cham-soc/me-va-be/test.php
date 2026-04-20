<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Upload Drive</title>
    <style>
        body {
            font-family: Arial;
            text-align: center;
            background: #f5f5f5;
            padding-top: 50px;
        }
        .box {
            background: #fff;
            padding: 20px;
            width: 400px;
            margin: auto;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        input, button {
            padding: 10px;
            margin: 5px;
            width: 90%;
        }
        img, video {
            margin-top: 15px;
            max-width: 100%;
            border-radius: 10px;
        }
    </style>
</head>
<body>

<div class="box">
    <h2>Upload lên Google Drive</h2>

    <form method="post" enctype="multipart/form-data">
        <input type="file" name="file" required><br>
        <input type="text" name="name" placeholder="Tên file" required><br>
        <button type="submit" name="upload">Upload</button>
    </form>

    <hr>

<?php

$scriptUrl = "https://script.google.com/macros/s/AKfycbxThLPP2mI062gddeEyAAy3XYzUMJ-CIzMP3dMFWQ7v31t5H10ZESvx_i-ZKzWO5A_pog/exec";

// ================= UPLOAD =================
if (isset($_POST['upload'])) {

    $fileTmp  = $_FILES['file']['tmp_name'];
    $fileName = $_POST['name'];
    $fileType = $_FILES['file']['type'];

    // encode base64
    $fileContent = base64_encode(file_get_contents($fileTmp));

    $data = json_encode([
        "name" => $fileName,
        "file" => $fileContent,
        "type" => $fileType
    ]);

    $ch = curl_init($scriptUrl);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

// 👉 QUAN TRỌNG NHẤT
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);

if ($response === false) {
    echo "❌ CURL ERROR: " . curl_error($ch);
}

curl_close($ch);

    $response = curl_exec($ch);

    // lỗi CURL
    if ($response === false) {
        echo "❌ CURL ERROR: " . curl_error($ch);
    }

    curl_close($ch);

    // debug response
    echo "<pre>$response</pre>";

    $res = json_decode($response, true);

    // ================= SUCCESS =================
    if ($res && $res['status'] == 'success') {

        $fileId = $res['fileId'];

        echo "<h3 style='color:green'>✅ Upload thành công!</h3>";
        echo "<p><b>File ID:</b> $fileId</p>";

        // link hiển thị
        $url = "https://lh3.googleusercontent.com/d/" . $fileId;

        // hiển thị file
        if (strpos($fileType, 'image') !== false) {
            echo "<img src='$url'>";
        } 
        else if (strpos($fileType, 'video') !== false) {
            echo "
            <video controls>
                <source src='$url'>
            </video>
            ";
        } 
        else {
            echo "<a href='$url' target='_blank'>Xem file</a>";
        }

    } else {
        echo "<h3 style='color:red'>❌ Upload lỗi!</h3>";
    }
}
?>

</div>

</body>
</html>