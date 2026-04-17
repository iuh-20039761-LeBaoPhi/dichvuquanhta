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
            width: 450px;
            margin: auto;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        }

        input,
        button {
            padding: 10px;
            margin: 5px;
            width: 90%;
            box-sizing: border-box;
        }

        img,
        video {
            margin-top: 15px;
            max-width: 100%;
            border-radius: 10px;
            border: 1px solid #ddd;
        }

        .success {
            color: green;
            font-weight: bold;
        }

        .error {
            color: red;
            font-weight: bold;
        }

        pre {
            text-align: left;
            background: #eee;
            padding: 10px;
            font-size: 11px;
            overflow: auto;
        }
    </style>
</head>

<body>

    <div class="box">
        <h2>Upload lên Google Drive</h2>

        <form method="post" enctype="multipart/form-data">
            <input type="file" name="file" required><br>
            <input type="text" name="name" placeholder="Tên file lưu trên Drive" required><br>
            <button type="submit" name="upload">Upload Ngay</button>
        </form>

        <hr>

        <?php
        // URL Apps Script đã deploy (chế độ Anyone)
        $scriptUrl = "https://script.google.com/macros/s/AKfycbwmkiNswnlcic0R0YMvoDOrUdo9hl2rIdAMrHwL7lU8sNmKKGnkyJZoz6lg5CBypS2u1A/exec";

        if (isset($_POST['upload'])) {
            $fileTmp = $_FILES['file']['tmp_name'];
            $fileName = $_POST['name'];
            $fileType = $_FILES['file']['type'];

            // 1. Chuyển file sang Base64
            $fileContent = base64_encode(file_get_contents($fileTmp));

            // 2. Chuẩn bị JSON dữ liệu
            $data = json_encode([
                "name" => $fileName,
                "file" => $fileContent,
                "type" => $fileType
            ]);

            // 3. Khởi tạo CURL
            $ch = curl_init($scriptUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Quan trọng để đi qua trang redirect của Google
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

            // Thực thi
            $response = curl_exec($ch);
            // Thêm dòng này để xem mã phản hồi từ server
            echo "HTTP Code: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . "<br>";
            echo "Raw Response: " . htmlspecialchars($response) . "<br>";
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                echo "<p class='error'>❌ CURL ERROR: $curlError</p>";
            } else {
                $res = json_decode($response, true);

                if ($res && isset($res['status']) && $res['status'] == 'success') {
                    $fileId = $res['fileId'];

                    echo "<h3 class='success'>✅ Upload thành công!</h3>";
                    echo "<p><b>File ID:</b> <code>$fileId</code></p>";

                    // Link hiển thị file (Google Drive Direct Link)
                    // Lưu ý: File trong Folder Drive phải để chế độ "Anyone with the link" thì mới hiện được ảnh/video
                    $displayUrl = "https://drive.google.com/uc?export=view&id=" . $fileId;

                    if (strpos($fileType, 'image') !== false) {
                        echo "<h4>Xem trước ảnh:</h4>";
                        echo "<img src='$displayUrl'>";
                    } elseif (strpos($fileType, 'video') !== false) {
                        echo "<h4>Xem trước video:</h4>";
                        echo "
                <video width='100%' controls>
                    <source src='$displayUrl' type='$fileType'>
                    Trình duyệt của bạn không hỗ trợ xem video.
                </video>";
                    } else {
                        echo "<br><a href='$displayUrl' target='_blank'>Mở file đã upload</a>";
                    }
                } else {
                    echo "<h3 class='error'>❌ Lỗi từ Apps Script:</h3>";
                    echo "<pre>" . print_r($res, true) . "</pre>";
                }
            }
        }
        ?>
    </div>

</body>

</html>