<!doctype html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <title>Tracking đơn hàng | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>" />
</head>

<body>
    <!-- HEADER -->
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <!-- MAIN TRACKING -->
    <main>
        <h1 style="text-align: center; margin-bottom: 32px; color: #0a2a66">Tracking đơn hàng FastGo</h1>

        <ul class="internal-dropdown">
            <li><a href="#track-order">Đơn hàng tiêu chuẩn</a></li>
            <li><a href="#track-bulk">Đơn số lượng lớn</a></li>
            <li><a href="#track-cod">Đơn COD</a></li>
        </ul>

        <!-- SECTION 1 -->
        <section id="track-order">
            <h2 class="section-title">Tra cứu đơn hàng tiêu chuẩn</h2>
            <form onsubmit="trackOrder(event, 'standard')">
                <input type="text" id="standard-code" placeholder="Nhập mã đơn hàng" required />
                <button type="submit" class="btn-primary">Kiểm tra</button>
            </form>
            <div id="loading-spinner-standard" style="display: none; text-align: center; margin: 20px 0">
                <div class="spinner"></div>
                <p style="color: #0a2a66; font-size: 14px; margin-top: 10px">Đang kết nối hệ thống FastGo...</p>
            </div>
            <div id="result-standard" class="tracking-result"></div>
        </section>

        <!-- SECTION 2 -->
        <section id="track-bulk">
            <h2 class="section-title">Tra cứu đơn số lượng lớn</h2>
            <form onsubmit="trackOrder(event, 'bulk')">
                <input type="text" id="bulk-code" placeholder="Nhập mã đơn số lượng lớn" required />
                <button type="submit" class="btn-primary">Kiểm tra</button>
            </form>
            <div id="loading-spinner-bulk" style="display: none; text-align: center; margin: 20px 0">
                <div class="spinner"></div>
                <p style="color: #0a2a66; font-size: 14px; margin-top: 10px">Đang kết nối hệ thống FastGo...</p>
            </div>
            <div id="result-bulk" class="tracking-result"></div>
        </section>

        <!-- SECTION 3 -->
        <section id="track-cod">
            <h2 class="section-title">Tra cứu đơn COD</h2>
            <form onsubmit="trackOrder(event, 'cod')">
                <input type="text" id="cod-code" placeholder="Nhập mã đơn COD" required />
                <button type="submit" class="btn-primary">Kiểm tra</button>
            </form>
            <div id="loading-spinner-cod" style="display: none; text-align: center; margin: 20px 0">
                <div class="spinner"></div>
                <p style="color: #0a2a66; font-size: 14px; margin-top: 10px">Đang kết nối hệ thống FastGo...</p>
            </div>
            <div id="result-cod" class="tracking-result"></div>
        </section>
    </main>

    <!-- FOOTER -->
    <?php include __DIR__ . '/../includes/footer.php'; ?>

</body>

</html>
