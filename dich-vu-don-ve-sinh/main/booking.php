<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lịch | Vệ sinh Care</title>
 
     <link rel="stylesheet" href="../css/booking.css">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  
</head>
<body class="booking-page">

<?php require_once "header.php"; ?>

<section class="container py-4">
    <h2 class="fw-bold text-center">Đặt lịch dịch vụ vệ sinh</h2>
    <p class="text-center text-muted">
        Chọn dịch vụ phù hợp và điền thông tin bên dưới
    </p>
</section>

<section class="booking-bg py-4">
<div class="container">
<?php
$customer = $_SESSION['customer'] ?? null;
?>
<form id="bookingForm" action="booking_process.php" method="POST">

<!-- ================= KHÁCH HÀNG ================= -->
<h4 class="fw-bold mb-3">Thông tin khách hàng</h4>

<div class="row g-3">
    <div class="col-md-6">
        <input type="text" name="customer_name"
class="form-control"
value="<?= htmlspecialchars($customer['full_name'] ?? '') ?>"
placeholder="Họ và tên" required>
    </div>

    <div class="col-md-6">
        <input type="text" name="phone" class="form-control" placeholder="Số điện thoại" required>
    </div>

    <div class="col-12">
        <input type="text" name="address" class="form-control" placeholder="Địa chỉ cụ thể">
    </div>
</div>

<!-- ================= DỊCH VỤ ================= -->
<h4 class="fw-bold mt-4 mb-3">Chọn dịch vụ</h4>

<select id="serviceSelect" class="form-select" name="service_type" required>
    <option value="">-- Chọn dịch vụ --</option>

    <optgroup label="🏠 Theo công trình">
        <option value="apartment">Vệ sinh căn hộ</option>
        <option value="house">Vệ sinh nhà phố / biệt thự</option>
        <option value="post_construction">Vệ sinh sau xây dựng</option>
        <option value="factory">Vệ sinh nhà xưởng</option>
    </optgroup>

    <optgroup label="🧹 Chuyên sâu">
        <option value="deep_clean">Tổng vệ sinh (deep cleaning)</option>
        <option value="glass">Lau kính</option>
        <option value="sofa">Giặt sofa</option>
        <option value="carpet">Giặt thảm</option>
    </optgroup>

    <optgroup label="🏢 Ngành nghề">
        <option value="restaurant">Vệ sinh nhà hàng</option>
        <option value="hotel">Vệ sinh khách sạn</option>
        <option value="spa">Vệ sinh spa</option>
        <option value="showroom">Vệ sinh showroom</option>
    </optgroup>

    <optgroup label="🦠 Khử khuẩn">
        <option value="disinfection">Khử trùng</option>
        <option value="pest_control">Diệt côn trùng</option>
        <option value="odor">Khử mùi</option>
    </optgroup>
</select>
<div id="dynamicFields" class="text-muted">
    👉 Vui lòng chọn dịch vụ để hiển thị chi tiết
</div>

<!-- ================= CÔNG VIỆC ================= -->


<h4 class="fw-bold mt-4 mb-3">Thời gian</h4>

<div class="row g-3">
    <div class="col-md-6">
        <input type="date" name="booking_date" class="form-control" required min="<?= date('Y-m-d') ?>">
    </div>

    <div class="col-md-6">
        <input type="time" name="booking_time" class="form-control" required>
    </div>
</div>

<!-- ================= GHI CHÚ ================= -->
<h4 class="fw-bold mt-4 mb-3">Ghi chú</h4>

<textarea name="note" class="form-control" rows="3" placeholder="Yêu cầu thêm..."></textarea>
<!-- ================= GIÁ TIỀN ================= -->
<div class="text-center mt-4">
    <h4>Tạm tính:</h4>
    <h2 id="totalPrice" style="color:#1abc9c">0đ</h2>
</div>
<!-- ================= BUTTON ================= -->
<div class="text-center mt-4">
    <button type="submit" class="btn px-5 py-2 text-white"
        style="background:#1abc9c">
        Gửi yêu cầu
    </button>
</div>
<input type="hidden" name="total_price" id="hiddenPrice">
</form>
</div>
</section>

<?php require_once "footer.php"; ?>

<script src="../js/main.js"></script>
<script>
const serviceSelect = document.getElementById("serviceSelect");
const dynamicFields = document.getElementById("dynamicFields");
const form = document.getElementById("bookingForm");

form.addEventListener("submit", function(e) {
    if (!serviceSelect.value) {
        alert("Vui lòng chọn dịch vụ!");
        e.preventDefault();
    }
});
serviceSelect.addEventListener("change", function () {
    const value = this.value;
    let html = "";
    
   if (!value) {
    dynamicFields.innerHTML = `
        <div class="text-muted">
            👉 Vui lòng chọn dịch vụ để hiển thị chi tiết
        </div>
    `;
    return;
}

    switch (value) {

        // 🏠 NHÀ / CĂN HỘ / VĂN PHÒNG
        case "apartment":
        case "house":
        case "deep_clean":
        case "post_construction":
            html = `
            <h4 class="mt-4">Công việc</h4>

            <div class="row">
                <div class="col-md-6">
                    ${checkbox("Lau sàn")}
                    ${checkbox("Lau kính")}
                    ${checkbox("Dọn bếp")}
                </div>
                <div class="col-md-6">
                    ${checkbox("Dọn toilet")}
                    ${checkbox("Hút bụi")}
                </div>
            </div>

            <h4 class="mt-4">Chi tiết</h4>
            <input type="number" name="area" class="form-control mb-2"min="0"
                placeholder="Diện tích (m²)">
            <input type="number" name="rooms" class="form-control" min="0"
                placeholder="Số phòng">
            `;
            break;

        // 🛋 SOFA
        case "sofa":
            html = `
            <h4 class="mt-4">Chi tiết</h4>
            <input type="number" name="sofa_count" class="form-control"
                placeholder="Số lượng sofa">
            `;
            break;

        // 🧽 THẢM
        case "carpet":
            html = `
            <h4 class="mt-4">Chi tiết</h4>
            <input type="number" name="carpet_area" class="form-control"
                placeholder="Diện tích thảm (m²)">
            `;
            break;

        // 🦠 DIỆT CÔN TRÙNG
        case "pest_control":
            html = `
            <h4 class="mt-4">Chi tiết</h4>
            <input type="text" name="pest_type" class="form-control mb-2"
                placeholder="Loại côn trùng (gián, mối, muỗi...)">

            <input type="number" name="area" class="form-control"
                placeholder="Diện tích (m²)">
            `;
            break;

        // 🧴 KHỬ TRÙNG
        case "disinfection":
            html = `
            <h4 class="mt-4">Chi tiết</h4>
            <input type="number" name="area" class="form-control"
                placeholder="Diện tích cần khử trùng">
            `;
            break;

        // 🏢 NGÀNH NGHỀ
        case "restaurant":
        case "hotel":
        case "spa":
        case "showroom":
            html = `
            <h4 class="mt-4">Chi tiết</h4>
            <input type="number" name="area" class="form-control mb-2"
                placeholder="Diện tích (m²)">
            <input type="number" name="floors" class="form-control"
                placeholder="Số tầng">
            `;
            break;
        case "factory":
    html = `
    <h4 class="mt-4">Chi tiết</h4>
    <input type="number" name="area" class="form-control mb-2"
        placeholder="Diện tích nhà xưởng">
    <input type="number" name="workers" class="form-control"
        placeholder="Số nhân công cần">
    `;
    break;
        default:
            html = `
            <h4 class="mt-4">Yêu cầu thêm</h4>
            <textarea name="note_extra" class="form-control"
                placeholder="Mô tả thêm..."></textarea>
            `;
    }

    dynamicFields.innerHTML = html;
    const firstInput = dynamicFields.querySelector("input, textarea");
if (firstInput) firstInput.focus();
// auto scroll
dynamicFields.scrollIntoView({ behavior: "smooth" });
});

// helper tạo checkbox
function checkbox(label) {
    return `
    <div class="form-check mb-2">
        <input class="form-check-input" type="checkbox" name="jobs[]" value="${label}">
        <label class="form-check-label">${label}</label>
    </div>`;
}


</script>
<script>
function calculatePrice() {
    const service = serviceSelect.value;
    let price = 0;

    const areaInput = form.querySelector('[name="area"]');
const area = parseInt(areaInput?.value) || 0;
const rooms = parseInt(document.querySelector('[name="rooms"]')?.value) || 0;
const sofa = parseInt(document.querySelector('[name="sofa_count"]')?.value) || 0;
const carpet = parseInt(document.querySelector('[name="carpet_area"]')?.value) || 0;
const workers = parseInt(document.querySelector('[name="workers"]')?.value) || 0;

    switch (service) {

        case "apartment":
        case "house":
            price = area * 10000 + rooms * 50000;
            break;

        case "deep_clean":
            price = area * 15000;
            break;

        case "post_construction":
            price = area * 20000;
            break;

        case "sofa":
            price = sofa * 150000;
            break;

        case "carpet":
            price = carpet * 20000;
            break;

        case "factory":
            price = area * 8000 + workers * 200000;
            break;

        case "restaurant":
        case "hotel":
        case "spa":
        case "showroom":
            price = area * 12000;
            break;

        case "disinfection":
            price = area * 10000;
            break;

        case "pest_control":
            price = area * 12000;
            break;
    }
document.getElementById("hiddenPrice").value = price;
    document.getElementById("totalPrice").innerText =
        price.toLocaleString() + "đ";
}
// auto tính khi nhập
document.addEventListener("input", calculatePrice);

// khi đổi service
serviceSelect.addEventListener("change", () => {
    document.getElementById("totalPrice").innerText = "0đ";
    document.getElementById("hiddenPrice").value = 0;

    setTimeout(calculatePrice, 100);
});
</script>
</body>
</html>