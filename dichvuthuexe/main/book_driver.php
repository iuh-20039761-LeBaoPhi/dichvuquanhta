<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đặt tài xế lái xe hộ</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="stylesheet" href="../assets/main.css">
<link rel="stylesheet" href="../assets/form.css">

</head>
<body>

<div class="container">
    <h1>🚗 Đặt tài xế lái xe hộ</h1>

    <form id="driverForm" action="submit_order.php" method="POST">

        <label>Họ và tên</label>
        <input type="text" name="customer_name" id="customer_name">

        <label>Số điện thoại</label>
        <input type="tel" name="phone" id="phone" placeholder="0xxx xxx xxx">

        <label>Loại xe</label>
        <select name="vehicle_type" id="vehicle_type">
            <option value="">-- Chọn loại xe --</option>
            <option value="Xe máy">Xe máy</option>
            <option value="Ô tô">Ô tô</option>
        </select>

        <label>Điểm đón</label>
        <input type="text" name="pickup_location" id="pickup_location">

        <label>Điểm đến</label>
        <input type="text" name="destination" id="destination">

        <label>Khoảng cách (km)</label>
<input type="number" name="distance_km" id="distance_km" min="1" placeholder="Ví dụ: 12">

<label>Giá dự kiến</label>
<input type="text" id="price" readonly>


        <label>Thời gian đón</label>
        <input type="datetime-local" name="pickup_time" id="pickup_time">

        <label>Ghi chú thêm</label>
        <textarea name="note" rows="4" placeholder="Say rượu, có trẻ em, đồ đạc..."></textarea>

        <button type="submit">GỬI YÊU CẦU</button>

        <div class="error" id="error"></div>
    </form>
</div>

<script>
const form = document.getElementById("driverForm");

const distanceInput = document.getElementById("distance_km");
const vehicleSelect = document.getElementById("vehicle_type");
const priceInput = document.getElementById("price");

form.addEventListener("submit", function(e) {
    let error = "";

    const name = document.getElementById("customer_name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const pickup = document.getElementById("pickup_location").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const time = document.getElementById("pickup_time").value;
    const distance = distanceInput.value;

    if (!name || !phone || !vehicleSelect.value || !pickup || !destination || !time || !distance) {
        error = "⚠️ Vui lòng điền đầy đủ thông tin.";
    }

    if (phone && !phone.match(/^0[0-9]{9}$/)) {
        error = "⚠️ Số điện thoại không hợp lệ.";
    }

    if (error) {
        e.preventDefault();
        document.getElementById("error").innerText = error;
    }
});

function calculatePrice() {
    const km = Number(distanceInput.value);
    const vehicle = vehicleSelect.value;

    if (!km || !vehicle) {
        priceInput.value = "";
        return;
    }

    const pricePerKm = vehicle === "Ô tô" ? 15000 : 8000;
    const total = km * pricePerKm;

    priceInput.value = total.toLocaleString("vi-VN") + " đ";
}

distanceInput.addEventListener("input", calculatePrice);
vehicleSelect.addEventListener("change", calculatePrice);
</script>



</body>
</html>



