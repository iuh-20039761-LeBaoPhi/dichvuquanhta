<?php
/* ================= HANDLE AJAX FIRST ================= */
require_once '../config/database.php';
$db = new Database();
$conn = $db->getConnection();

// ================= HANDLE INSERT =================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax'])) {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        // Get service ID from service name (tendichvu)
        $serviceStmt = $conn->prepare("SELECT id FROM dichvu WHERE tendichvu = ? LIMIT 1");
        $serviceStmt->execute([$_POST['service_name']]);
        $service = $serviceStmt->fetch();
        
        $dichvu_id = $service ? $service['id'] : null;
        
        // Insert into bookings table with correct fields
        $stmt = $conn->prepare("
            INSERT INTO bookings (
                dichvu_id,
                customer_name,
                phone,
                email,
                note,
                booking_date,
                status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, NOW(), 'pending', NOW())
        ");

        $stmt->execute([
            $dichvu_id,
            $_POST['customer_name'],
            $_POST['customer_phone'],
            $_POST['customer_email'],
            $_POST['customer_note']
        ]);

        echo json_encode(['status' => 'success']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'msg' => $e->getMessage()]);
    }
    exit;
}

/* ================= NORMAL PAGE ================= */
require_once __DIR__ . '/components/header.php';
renderHeader('Dịch Vụ - ElderlyCare');

// Get all services from database
try {
    $servicesStmt = $conn->prepare("SELECT * FROM dichvu WHERE status = 1 ORDER BY id");
    $servicesStmt->execute();
    $services = $servicesStmt->fetchAll();
} catch (PDOException $e) {
    $services = [];
}

// Get all services from database
try {
    // Lấy dịch vụ kèm tên danh mục để hỗ trợ hiển thị
    $servicesStmt = $conn->prepare("SELECT d.*, c.name as category_name FROM dichvu d LEFT JOIN service_category c ON d.category_id = c.id WHERE d.status = 1 ORDER BY d.id");
    $servicesStmt->execute();
    $services = $servicesStmt->fetchAll();

    // Lấy danh sách danh mục để tạo bộ lọc
    $catStmt = $conn->prepare("SELECT * FROM service_category WHERE status = 1");
    $catStmt->execute();
    $categories = $catStmt->fetchAll();
} catch (PDOException $e) {
    $services = [];
    $categories = [];
}
?>



<!-- Services Hero Banner -->
<section class="py-5" style="background: linear-gradient(135deg, #f1f8e9 0%, #FFFFFF 50%, #e3f2fd 100%);">
    <div class="container py-lg-5 text-center">
        <h1 class="display-3 fw-bold mb-3">Các Dịch Vụ Của Chúng Tôi <span style="color: #2e7d32; font-family: 'Pacifico', cursive;">ElderlyCare</span></h1>
        <p class="lead text-muted mb-4">Dịch vụ chăm sóc sức khỏe Người cao tuổi toàn diện, chuyên nghiệp và tận tâm</p>
        <div style="width: 60px; height: 3px; background-color: #2e7d32; margin: 0 auto;"></div>
    </div>
</section>
<div class="container mt-4 mb-2">
    <div class="d-flex justify-content-center flex-wrap gap-2">
        <button class="btn btn-outline-danger active rounded-pill px-4 filter-btn" data-filter="all">Tất cả</button>
        <?php foreach ($categories as $cat): ?>
            <button class="btn btn-outline-danger rounded-pill px-4 filter-btn" data-filter="cat-<?php echo $cat['id']; ?>">
                <?php echo htmlspecialchars($cat['name']); ?>
            </button>
        <?php endforeach; ?>
    </div>
</div>
<!-- Services Detail -->
<section class="py-5">
    <div class="container py-lg-5">
        <?php if (!empty($services)): ?>
            <?php foreach ($services as $index => $service): ?>
                <?php 
                    $isReverse = ($index % 2 !== 0);
                ?>
                <!-- Service <?php echo $index + 1; ?> -->
                 <div class="row align-items-center mb-5 g-5 service-item cat-<?php echo $service['category_id']; ?> <?php echo $isReverse ? 'flex-lg-row-reverse' : ''; ?>">
                <div class="row align-items-center mb-5 g-5 <?php echo $isReverse ? 'flex-lg-row-reverse' : ''; ?>">
                    <div class="col-lg-6">
                        <img src="../<?php echo htmlspecialchars($service['hinh_anh']); ?>" alt="<?php echo htmlspecialchars($service['tendichvu']); ?>" class="img-fluid rounded-4 shadow-lg">
                    </div>
                    <div class="col-lg-6">
                        <h2 class="fw-bold display-6 mb-3" style="color: #2e7d32;"><?php echo htmlspecialchars($service['tendichvu']); ?></h2>
                        <p style="color: #666; line-height: 1.8; margin-bottom: 20px;">
                            <?php echo $service['mo_ta_ngan'] ? htmlspecialchars($service['mo_ta_ngan']) : 'Dịch vụ chuyên nghiệp và tận tâm cho sức khỏe mẹ và bé.'; ?>
                        </p>
                        <h4 class="fw-bold mb-3">Bao Gồm:</h4>
                        <ul class="list-unstyled mb-4">
                            <?php 
                                // Parse noi_dung_chi_tiet if available
                                if ($service['noi_dung_chi_tiet']) {
                                    $items = array_filter(array_map('trim', explode("\n", $service['noi_dung_chi_tiet'])));
                                    foreach ($items as $item):
                            ?>
                                <li style="padding: 8px 0; color: #555;"><i class="fas fa-check" style="color: #2e7d32; margin-right: 10px;"></i> <?php echo htmlspecialchars($item); ?></li>
                            <?php 
                                    endforeach;
                                } else {
                            ?>
                                <li style="padding: 8px 0; color: #555;"><i class="fas fa-check" style="color: #2e7d32; margin-right: 10px;"></i> Dịch vụ chất lượng cao</li>
                                <li style="padding: 8px 0; color: #555;"><i class="fas fa-check" style="color: #2e7d32; margin-right: 10px;"></i> Đội ngũ chuyên nghiệp</li>
                                <li style="padding: 8px 0; color: #555;"><i class="fas fa-check" style="color: #2e7d32; margin-right: 10px;"></i> Tận tâm với khách hàng</li>
                            <?php 
                                }
                            ?>
                        </ul>
                        <p class="fw-bold mb-3" style="color: #2e7d32; font-size: 1.1rem;">Giá: <?php echo $service['gia']; ?> VNĐ</p>
                        <button class="btn-book btn text-white rounded-pill px-4 py-2 shadow-sm" style="background-color: #2e7d32; border: none; cursor: pointer; transition: 0.3s;" 
                                data-service="<?php echo htmlspecialchars($service['tendichvu']); ?>" 
                                data-price="<?php echo $service['gia']; ?> VNĐ"
                                onmouseover="this.style.backgroundColor='#1b5e20'; this.style.transform='scale(1.05)';"
                                onmouseout="this.style.backgroundColor='#2e7d32'; this.style.transform='scale(1)';">
                            <i class="fas fa-calendar-check"></i> Đặt Lịch Ngay
                        </button>
                    </div>
                </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="row">
                <div class="col-lg-12 text-center">
                    <p class="lead text-muted">Hiện tại chúng tôi chưa có dịch vụ nào. Vui lòng quay lại sau.</p>
                </div>
            </div>
        <?php endif; ?>
    </div>
</section>

<!-- Booking Section -->
<section class="py-5" style="background-color: #FFF3F7;">
    <div class="container py-5 text-center">
        <h2 class="fw-bold display-5 mb-3">Sẵn Sàng Đặt Lịch?</h2>
        <p class="lead text-muted mb-4">Hãy liên hệ với chúng tôi để đặt lịch khám và tư vấn miễn phí</p>
        <button class="btn text-white rounded-pill px-5 py-3 shadow-sm" 
        style="background-color: #2e7d32; border: none; font-weight: 700; cursor: pointer; transition: 0.3s;" 
        onclick="window.location.href='contact.php'" onmouseover="this.style.backgroundColor='#1b5e20'; this.style.transform='scale(1.05)';" onmouseout="this.style.backgroundColor='#2e7d32'; this.style.transform='scale(1)';">Đặt Lịch Ngay</button>
    </div>
</section>

<!-- Booking Modal -->
<div id="bookingModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4); overflow-y: auto;">
    <div style="position: relative; margin: 10% auto; width: 90%; max-width: 500px;">
        <div class="bg-white rounded-4 p-4 shadow-lg" style="border: 1px solid #ddd; position: relative;">
            <span class="close" style="position: absolute; top: 20px; right: 25px; font-size: 32px; font-weight: bold; cursor: pointer; transition: all 0.3s; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; line-height: 1; color: #aaa;" onclick="closeBookingModal()" onmouseover="this.style.border='1px solid #2e7d32'; this.style.color='#2e7d32';" onmouseout="this.style.border='none'; this.style.color='#aaa';">&times;</span>

            <h2 class="mb-4" style="color: #2e7d32;"><i class="fas fa-calendar-plus"></i> Đặt Lịch Dịch Vụ</h2>
            
            <form id="bookingForm">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Dịch vụ:</label>
                    <input type="text" id="serviceName" name="service_name" readonly style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Quicksand', sans-serif; background-color: #f9f9f9;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Giá dịch vụ:</label>
                    <input type="text" id="servicePrice" name="service_price" readonly style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Quicksand', sans-serif; background-color: #f9f9f9;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Họ và tên: <span style="color: #2e7d32;">*</span></label>
                    <input type="text" id="customerName" name="customer_name" required placeholder="Nguyễn Văn A" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Quicksand', sans-serif; transition: 0.3s;" onfocus="this.style.borderColor='#2e7d32'; this.style.boxShadow='0 0 10px rgba(46, 125, 50, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Số điện thoại: <span style="color: #2e7d32;">*</span></label>
                    <input type="tel" id="customerPhone" name="customer_phone" required placeholder="0912345678" pattern="[0-9]{10,11}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Quicksand', sans-serif; transition: 0.3s;" onfocus="this.style.borderColor='#2e7d32'; this.style.boxShadow='0 0 10px rgba(46, 125, 50, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Email:</label>
                    <input type="email" id="customerEmail" name="customer_email" placeholder="email@example.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Quicksand', sans-serif; transition: 0.3s;" onfocus="this.style.borderColor='#2e7d32'; this.style.boxShadow='0 0 10px rgba(46, 125, 50, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Ghi chú:</label>
                    <textarea id="customerNote" name="customer_note" rows="3" placeholder="Thời gian mong muốn, yêu cầu đặc biệt..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Quicksand', sans-serif; transition: 0.3s;" onfocus="this.style.borderColor='#2e7d32'; this.style.boxShadow='0 0 10px rgba(46, 125, 50, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';"></textarea>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="close" type="button" style="flex: 1; padding: 10px; border: none; border-radius: 50px; font-weight: 700; cursor: pointer; background-color: #ddd; color: #333; transition: 0.3s;" onmouseover="this.style.backgroundColor='#bbb';" onmouseout="this.style.backgroundColor='#ddd';">
                        Hủy
                    </button>
                    <button type="submit" style="flex: 1; padding: 10px; border: none; border-radius: 50px; font-weight: 700; cursor: pointer; background-color: #2e7d32; color: white; transition: 0.3s;" onmouseover="this.style.backgroundColor='#d84374';" onmouseout="this.style.backgroundColor='#2e7d32';">
                        <i class="fas fa-check"></i> Xác Nhận Đặt Lịch
                    </button>
                </div>
            </form>
            

            <div id="successMessage" style="display: none; text-align: center; padding: 20px;">
                <i class="fas fa-check-circle" style="color: #28a745; font-size: 3rem;"></i>
                <h3 style="margin-top: 15px; font-weight: 700; color: #333;">Đặt lịch thành công!</h3>
                <p style="color: #666;">Chúng tôi sẽ liên hệ với bạn sớm nhất.</p>
            </div>
        </div>
    </div>
</div>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- Booking Script -->
<script>

$(function () {

    const modal = $('#bookingModal');
    const form = $('#bookingForm');
    const successMessage = $('#successMessage');
    
    // Google Sheet URL
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEtPaKAx9AJdxdEl6WGGE4RS5-52x3MUoF6TJjSBYJ8ex0yXnTGHbOeAN4uGenkPay/exec';

    /* ================= OPEN MODAL ================= */
    $(document).on('click', '.btn-book', function (e) {
        e.preventDefault();

        $('#serviceName').val($(this).data('service'));
        $('#servicePrice').val($(this).data('price'));

        form.show();
        successMessage.hide();
        modal.fadeIn(300);
    });

    /* ================= CLOSE MODAL ================= */
    $('.close, #cancelBtn').on('click', function () {
        modal.fadeOut(300);
        form[0].reset();
        form.show();
        successMessage.hide();
    });

    /* ================= SUBMIT ================= */
    form.on('submit', function (e) {
        e.preventDefault();

        const bookingData = {
            service: $('#serviceName').val().trim(),
            price: $('#servicePrice').val().trim(),
            name: $('#customerName').val().trim(),
            phone: $('#customerPhone').val().trim(),
            email: $('#customerEmail').val().trim(),
            note: $('#customerNote').val().trim()
        };

        if (!bookingData.name || !bookingData.phone) {
            alert('Vui lòng nhập họ tên và số điện thoại!');
            return;
        }

        /* ===== 1. SAVE GOOGLE SHEET ===== */
        $.ajax({
            url: SCRIPT_URL,
            method: 'POST',
            contentType: 'text/plain;charset=utf-8',
            data: JSON.stringify(bookingData),
            error: function() {
                console.log('Lưu Google Sheet thất bại (bình thường nếu CORS)');
            }
        });

        /* ===== 2. SAVE DATABASE (PHP) ===== */
        $.post('', {
            ajax: 1,
            service_name: bookingData.service,
            customer_name: bookingData.name,
            customer_phone: bookingData.phone,
            customer_email: bookingData.email,
            customer_note: bookingData.note
        }, function (res) {
            // res đã là một Object nhờ Header JSON từ PHP
            if (res.status === 'success') {
                form.hide();
                successMessage.fadeIn(300);

                setTimeout(() => {
                    modal.fadeOut(300);
                    form[0].reset();
                    form.show();
                    successMessage.hide();
                }, 2500);
            } else {
                alert('Lỗi DB: ' + (res.msg || 'Không rõ lỗi'));
            }
        }, 'json').fail(function() {
            alert('Không thể kết nối với server');
        });
    });

    /* ================= PHONE NUMBER ================= */
    $('#customerPhone').on('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

});

function openBookingModal(element) {
    $(element).click();
}

function closeBookingModal() {
    $('#bookingModal').fadeOut(300);
    $('#bookingForm')[0].reset();
    $('#bookingForm').show();
    $('#successMessage').hide();
}
/* ================= BOOTSTRAP FILTER LOGIC ================= */
$('.filter-btn').on('click', function() {
    // Xử lý active button
    $('.filter-btn').removeClass('active');
    $(this).addClass('active');

    const filter = $(this).data('filter');

    if (filter === 'all') {
        $('.service-item').show(300); // Hiện tất cả với hiệu ứng nhẹ
    } else {
        $('.service-item').hide(); // Ẩn hết
        $('.' + filter).show(300); // Chỉ hiện những cái thuộc danh mục được chọn
    }
});
</script>

<?php
require_once __DIR__ . '/components/footer.php';
renderFooter();
?>
