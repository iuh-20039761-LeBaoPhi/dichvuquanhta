<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$customer = $_SESSION['customer'] ?? null;
?>

<!doctype html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dịch vụ vệ sinh</title>

    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- CSS của bạn -->
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/header.css">

<style>
:root {
  --main-color: #1abc9c;
  --main-dark: #16a085;
  --main-light: #e8f8f5;
}

/* Hero */
.hero-section{
    background: linear-gradient(135deg,#e8f8f5,#ffffff,#d1f2eb);
    padding:80px 0;
    text-align:center;
}

.hero-section h1{
    font-weight:700;
}

/* Card */
.service-card{
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 5px 15px rgba(0,0,0,0.08);
    transition:0.3s;
}

.service-card:hover{
    transform:translateY(-5px);
}

.service-card img{
    height:220px;
    object-fit:cover;
}
.service-card{
    border-radius:18px;
    overflow:hidden;
    box-shadow:0 8px 20px rgba(0,0,0,0.08);
    transition:0.3s;
    background:#fff;
}

.service-card:hover{
    transform:translateY(-8px);
    box-shadow:0 12px 30px rgba(0,0,0,0.12);
}

.service-card img{
    height:200px;
    object-fit:cover;
}

.service-card h6{
    font-size:15px;
}

h3{
    border-left:5px solid var(--main-color);
    padding-left:10px;
}
</style>
</head>

<body>

<?php require_once "header.php"; ?>

<!-- HERO -->
<section class="hero-section">
    <div class="container">
        <h1 class="display-5">
            Dịch Vụ Vệ Sinh Chuyên Nghiệp
        </h1>
        <p class="text-muted mt-3">
            Giải pháp vệ sinh toàn diện cho nhà ở, văn phòng và công trình
        </p>
    </div>
</section>

<!-- SERVICES -->
<section class="py-5">
    <div class="container">
        <div class="row" id="servicesContainer"></div>
    </div>
</section>

<!-- CTA -->
<section class="py-5 text-center" style="background:#e8f8f5">
    <div class="container">
        <h2 class="fw-bold">Sẵn sàng đặt lịch?</h2>
        <p class="text-muted">Liên hệ ngay để được tư vấn miễn phí</p>
        <a href="booking.php" class="btn text-white px-4 py-2"
           style="background:var(--main-color)">
            Đặt lịch ngay
        </a>
    </div>
</section>

<?php require_once "footer.php"; ?>

<!-- JS -->
<script>
const SERVICES = [
{
    category:"🏠 Vệ sinh theo loại công trình",
    items:[
        {name:"Căn hộ chung cư", image:"../img/house-clean.jpg", desc:"Dọn dẹp căn hộ sạch sẽ toàn diện"},
        {name:"Nhà phố / Biệt thự", image:"../img/house-clean.jpg", desc:"Vệ sinh kỹ lưỡng không gian sống"},
        {name:"Sau xây dựng", image:"../img/xaydung.jpg", desc:"Làm sạch công trình mới"},
        {name:"Nhà xưởng", image:"../img/office-clean.jpg", desc:"Vệ sinh khu sản xuất"},
        {name:"Kho bãi", image:"../img/office-clean.jpg", desc:"Làm sạch kho hàng"},
        {name:"Công trình công cộng", image:"../img/office-clean.jpg", desc:"Trường học, bệnh viện..."}
    ]
},
{
    category:"🧹 Vệ sinh chuyên sâu",
    items:[
        {name:"Tổng vệ sinh", image:"../img/house-clean.jpg", desc:"Dọn dẹp sâu toàn bộ nhà"},
        {name:"Lau kính mặt ngoài", image:"../img/office-clean.jpg", desc:"Lau kính cao tầng chuyên nghiệp"},
        {name:"Giặt thảm", image:"../img/sofa.jpg", desc:"Làm sạch thảm chuyên dụng"},
        {name:"Giặt sofa", image:"../img/sofa.jpg", desc:"Khử khuẩn ghế sofa"},
        {name:"Giặt rèm cửa", image:"../img/sofa.jpg", desc:"Làm sạch rèm cửa tận nơi"}
    ]
},
{
    category:"🏢 Vệ sinh theo ngành",
    items:[
        {name:"Nhà hàng / Quán ăn", image:"../img/office-clean.jpg", desc:"Đảm bảo vệ sinh an toàn thực phẩm"},
        {name:"Khách sạn", image:"../img/office-clean.jpg", desc:"Tiêu chuẩn sạch cao cấp"},
        {name:"Spa / Salon", image:"../img/office-clean.jpg", desc:"Không gian sạch thư giãn"},
        {name:"Phòng gym", image:"../img/office-clean.jpg", desc:"Khử mùi & vi khuẩn"},
        {name:"TTTM", image:"../img/office-clean.jpg", desc:"Vệ sinh trung tâm thương mại"},
        {name:"Showroom", image:"../img/office-clean.jpg", desc:"Giữ hình ảnh chuyên nghiệp"}
    ]
},
{
    category:"🦠 Khử khuẩn & diệt côn trùng",
    items:[
        {name:"Khử trùng", image:"../img/sofa.jpg", desc:"Diệt khuẩn toàn diện"},
        {name:"Diệt côn trùng", image:"../img/sofa.jpg", desc:"Gián, muỗi, mối"},
        {name:"Khử mùi", image:"../img/sofa.jpg", desc:"Xử lý mùi hôi khó chịu"}
    ]
}
];

const container = document.getElementById("servicesContainer");

SERVICES.forEach(group => {

    let groupHTML = `
    <div class="mb-5">
        <h3 class="fw-bold mb-4" style="color:var(--main-color)">
            ${group.category}
        </h3>
        <div class="row">
    `;

    group.items.forEach(s=>{
        groupHTML += `
        <div class="col-md-6 col-lg-3 mb-4">
            <div class="service-card h-100">
                <img src="${s.image}" class="w-100">
                <div class="p-3">
                    <h6 class="fw-bold">${s.name}</h6>
                    <p class="text-muted small">${s.desc}</p>
                    <a href="booking.php" class="btn btn-sm text-white"
                       style="background:var(--main-color)">
                       Đặt lịch
                    </a>
                </div>
            </div>
        </div>
        `;
    });

    groupHTML += `</div></div>`;

    container.innerHTML += groupHTML;
});
</script>

</body>
</html>