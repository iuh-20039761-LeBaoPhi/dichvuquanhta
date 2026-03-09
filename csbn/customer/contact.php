<?php
/* ================= HANDLE AJAX FIRST ================= */
require_once '../config/database.php';
$db = new Database();
$conn = $db->getConnection();

// Truy vấn lấy danh sách tên dịch vụ
$stmt_services = $conn->prepare("SELECT tendichvu FROM dichvu ORDER BY tendichvu ASC");
$stmt_services->execute();
$all_services = $stmt_services->fetchAll();

/* ================= NORMAL PAGE ================= */
require_once __DIR__ . '/components/header.php';
renderHeader('Liên hệ - MediCare');
?>


<section class="py-5" style="background: linear-gradient(135deg, #e3f2fd 0%, #FFFFFF 50%, #e8f5e9 100%);">
    <div class="container py-lg-5 text-center">
        <h1 class="display-3 fw-bold mb-3">Liên Hệ Với Chúng Tôi <span style="color: #007bff; font-family: 'Pacifico', cursive;">MediCare</span></h1>
        <p class="lead text-muted mb-4">Chúng tôi sẵn sàng lắng nghe và trợ giúp bạn</p>
        <div style="width: 60px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
    </div>
</section>

<!-- Contact Section -->
<section class="py-5">
    <div class="container py-lg-5">
        <div class="row g-5">
            <!-- Contact Info -->
            <div class="col-lg-5">
                <h2 class="fw-bold display-5 mb-4">Thông Tin Liên Hệ</h2>
                
                <div class="d-flex gap-4 mb-4">
                    <div style="font-size: 2.5rem; color: #007bff; min-width: 60px; text-align: center;">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h4 class="fw-600 mb-2" style="font-weight: 600;">Địa Chỉ</h4>
                        <p class="text-muted mb-1" style="color: #666; font-size: 0.95rem;">123 Đường Lý Thường Kiệt, Quận Hoàn Kiếm, Hà Nội</p>
                        <p class="text-muted mb-0" style="color: #666; font-size: 0.95rem;">456 Đường Nguyễn Hữu Cảnh, Quận Bình Thạnh, TP.HCM</p>
                    </div>
                </div>

                <div class="d-flex gap-4 mb-4">
                    <div style="font-size: 2.5rem; color: #007bff; min-width: 60px; text-align: center;">
                        <i class="fas fa-phone"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h4 class="fw-600 mb-2" style="font-weight: 600;">Điện Thoại</h4>
                        <p class="text-muted mb-2" style="color: #666; font-size: 0.95rem;"><a href="tel:1900-1234" class="text-decoration-none" style="color: #007bff; transition: 0.3s;">1900-1234</a></p>
                        <p class="text-muted mb-2" style="color: #666; font-size: 0.95rem;"><a href="tel:0243-123-4567" class="text-decoration-none" style="color: #007bff; transition: 0.3s;">024-3123-4567 (Hà Nội)</a></p>
                        <p class="text-muted mb-0" style="color: #666; font-size: 0.95rem;"><a href="tel:0283-123-4567" class="text-decoration-none" style="color: #007bff; transition: 0.3s;">028-3123-4567 (TP.HCM)</a></p>
                    </div>
                </div>

                <div class="d-flex gap-4 mb-4">
                    <div style="font-size: 2.5rem; color: #007bff; min-width: 60px; text-align: center;">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h4 class="fw-600 mb-2" style="font-weight: 600;">Email</h4>
                        <p class="text-muted mb-2" style="color: #666; font-size: 0.95rem;"><a href="mailto:info@mamacore.vn" class="text-decoration-none" style="color: #007bff; transition: 0.3s;">info@mamacore.vn</a></p>
                        <p class="text-muted mb-0" style="color: #666; font-size: 0.95rem;"><a href="mailto:support@mamacore.vn" class="text-decoration-none" style="color: #007bff; transition: 0.3s;">support@mamacore.vn</a></p>
                    </div>
                </div>

                <div class="d-flex gap-4">
                    <div style="font-size: 2.5rem; color: #007bff; min-width: 60px; text-align: center;">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h4 class="fw-600 mb-2" style="font-weight: 600;">Giờ Làm Việc</h4>
                        <p class="text-muted mb-2" style="color: #666; font-size: 0.95rem;">Thứ 2 - Thứ 6: 8:00 - 17:30</p>
                        <p class="text-muted mb-2" style="color: #666; font-size: 0.95rem;">Thứ 7 - Chủ Nhật: 8:00 - 12:00</p>
                        <p class="text-muted mb-0" style="color: #666; font-size: 0.95rem;">Chúng tôi mở cửa 24/7 cho các trường hợp khẩn cấp</p>
                    </div>
                </div>
            </div>

            <!-- Contact Form -->
            <!-- Contact Form -->
                <div class="col-lg-7">
                    <div class="p-5 rounded-4" style="background-color: #f3fbff;">
                        <div>
                            <h2 class="fw-bold mb-4" style="color: #333;"><i class="fas fa-paper-plane me-2"></i>Gửi Tin Nhắn Cho Chúng Tôi</h2>
                            
                            <form id="bookingForm" class="contact-form">
                                <div class="mb-4">
                                    <label class="d-block mb-2" style="font-weight: 600; color: #333;">Dịch vụ quan tâm:</label>
                                    <select id="serviceName" name="service" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: 'Quicksand', sans-serif; font-size: 0.95rem; transition: 0.3s;" 
                                            onchange="this.style.borderColor='#ddd';" 
                                            onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 10px rgba(0, 123, 255, 0.2)';" required>
                                        <option value="">Chọn dịch vụ</option>
                                        <?php foreach ($all_services as $service): ?>
                                            <option value="<?php echo htmlspecialchars($service['tendichvu']); ?>">
                                                <?php echo htmlspecialchars($service['tendichvu']); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                    <input type="hidden" id="servicePrice" value="Liên hệ">
                                </div>
                                
                                <div class="mb-4">
                                    <label class="d-block mb-2" style="font-weight: 600; color: #333;">Họ và tên: <span style="color: #007bff;">*</span></label>
                                    <input type="text" id="customerName" required placeholder="Nguyễn Văn A" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: 'Quicksand', sans-serif; font-size: 0.95rem; transition: 0.3s;" onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 10px rgba(0, 123, 255, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';">
                                </div>
                                
                                <div class="row g-3 mb-4">
                                    <div class="col-md-6">
                                        <div>
                                            <label class="d-block mb-2" style="font-weight: 600; color: #333;">Số điện thoại: <span style="color: #007bff;">*</span></label>
                                            <input type="tel" id="customerPhone" required placeholder="0912345678" pattern="[0-9]{10,11}" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: 'Quicksand', sans-serif; font-size: 0.95rem; transition: 0.3s;" onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 10px rgba(0, 123, 255, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';">
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <div>
                                            <label class="d-block mb-2" style="font-weight: 600; color: #333;">Email:</label>
                                            <input type="email" id="customerEmail" placeholder="email@example.com" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: 'Quicksand', sans-serif; font-size: 0.95rem; transition: 0.3s;" onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 10px rgba(0, 123, 255, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-4">
                                    <label class="d-block mb-2" style="font-weight: 600; color: #333;">Ghi chú / Nội dung:</label>
                                    <textarea id="customerNote" rows="4" placeholder="Nhập nội dung tin nhắn của bạn..." style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: 'Quicksand', sans-serif; font-size: 0.95rem; transition: 0.3s;" onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 10px rgba(0, 123, 255, 0.2)';" onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none';"></textarea>
                                </div>
                                
                                <div class="mb-4">
                                    <button type="submit" class="w-100 btn text-white rounded-pill" style="background-color: #007bff; border: none; padding: 12px 30px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: 0.3s;" onmouseover="this.style.backgroundColor='#007bff'; this.style.transform='scale(1.02)'; this.style.boxShadow='0 5px 15px rgba(240, 98, 146, 0.4)';" onmouseout="this.style.backgroundColor='#F06292'; this.style.transform='scale(1)'; this.style.boxShadow='none';">
                                        <i class="fas fa-check me-2"></i>Gửi Tin Nhắn
                                    </button>
                                </div>
                            </form>
                            
                            <div id="successMessage" style="display:none; text-align: center; padding: 20px;">
                                <i class="fas fa-check-circle" style="color: #28a745; font-size: 3rem;"></i>
                                <h3 class="mt-3 fw-bold" style="color: #333;">Gửi thành công!</h3>
                                <p style="color: #666;">Cảm ơn bạn, chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

        </div>
    </div>
</section>


<!-- Map Section -->
<section class="py-5" style="background-color: #f7f7f7;">
    <div class="container py-5">
        <h2 class="text-center fw-bold display-5 mb-5">Vị Trí Chi Nhánh</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px;">
            <div>
                <h3 class="fw-bold mb-3 text-center" style="color: #333;">Hà Nội</h3>
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.6890234567!2d105.85!3d21.03!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab9bd9999999%3A0x1234567890!2zMTIzIEzDvSBUaOC6rG5nIEvhu5FuLCBIw6AgTuG7mWksIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1234567890" style="width: 100%; height: 300px; border-radius: 10px; border: none;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
            <div>
                <h3 class="fw-bold mb-3 text-center" style="color: #333;">TP. Hồ Chí Minh</h3>
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.6890234567!2d106.68!3d10.77!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752abc1234567!2zNDU2IE5ndXnDqm4gSMWfdSBDw6FuaA!5e0!3m2!1svi!2s!4v1234567890" style="width: 100%; height: 300px; border-radius: 10px; border: none;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
        </div>
    </div>
</section>

<!-- FAQ Section -->
<section class="py-5">
    <div class="container py-5">
        <h2 class="text-center fw-bold display-5 mb-5">Câu Hỏi Thường Gặp</h2>
        <div style="display: grid; gap: 20px;">
            <div style="background-color: #f3fbff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
                <div class="faq-question" onclick="toggleFAQ(this)" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; user-select: none;" onmouseover="this.style.backgroundColor='rgba(240, 98, 146, 0.1)';" onmouseout="this.style.backgroundColor='';">
                    <h4 class="mb-0" style="font-weight: 600; color: #333; flex: 1;">Làm sao để đặt lịch khám?</h4>
                    <span class="faq-icon" style="font-size: 1.5rem; color: #007bff; transition: 0.3s; margin-left: 15px;"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; background-color: white;">
                    <p style="padding: 20px; margin: 0; color: #666; line-height: 1.6;">Bạn có thể đặt lịch khám thông qua điện thoại (1900-1234), email (info@mamacore.vn) hoặc trực tiếp tại phòng khám của chúng tôi.</p>
                </div>
            </div>

            <div style="background-color: #f3fbff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
                <div class="faq-question" onclick="toggleFAQ(this)" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; user-select: none;" onmouseover="this.style.backgroundColor='rgba(240, 98, 146, 0.1)';" onmouseout="this.style.backgroundColor='';">
                    <h4 class="mb-0" style="font-weight: 600; color: #333; flex: 1;">Giá khám là bao nhiêu?</h4>
                    <span class="faq-icon" style="font-size: 1.5rem; color: #007bff; transition: 0.3s; margin-left: 15px;"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; background-color: white;">
                    <p style="padding: 20px; margin: 0; color: #666; line-height: 1.6;">Giá khám tùy thuộc vào loại dịch vụ. Vui lòng xem trang Dịch Vụ để biết giá chi tiết hoặc liên hệ với chúng tôi để được tư vấn.</p>
                </div>
            </div>

            <div style="background-color: #f3fbff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
                <div class="faq-question" onclick="toggleFAQ(this)" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; user-select: none;" onmouseover="this.style.backgroundColor='rgba(240, 98, 146, 0.1)';" onmouseout="this.style.backgroundColor='';">
                    <h4 class="mb-0" style="font-weight: 600; color: #333; flex: 1;">Có bảo hiểm y tế không?</h4>
                    <span class="faq-icon" style="font-size: 1.5rem; color: #007bff; transition: 0.3s; margin-left: 15px;"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; background-color: white;">
                    <p style="padding: 20px; margin: 0; color: #666; line-height: 1.6;">Có, chúng tôi chấp nhận bảo hiểm y tế. Hãy mang theo thẻ bảo hiểm y tế khi đến khám.</p>
                </div>
            </div>

            <div style="background-color: #f3fbff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
                <div class="faq-question" onclick="toggleFAQ(this)" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; user-select: none;" onmouseover="this.style.backgroundColor='rgba(240, 98, 146, 0.1)';" onmouseout="this.style.backgroundColor='';">
                    <h4 class="mb-0" style="font-weight: 600; color: #333; flex: 1;">Thời gian chờ khám thường là bao lâu?</h4>
                    <span class="faq-icon" style="font-size: 1.5rem; color: #007bff; transition: 0.3s; margin-left: 15px;"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; background-color: white;">
                    <p style="padding: 20px; margin: 0; color: #666; line-height: 1.6;">Thời gian chờ tùy thuộc vào số lượng bệnh nhân. Thông thường, bệnh nhân được khám trong vòng 15-30 phút sau khi đến.</p>
                </div>
            </div>

            <div style="background-color: #f3fbff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
                <div class="faq-question" onclick="toggleFAQ(this)" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; user-select: none;" onmouseover="this.style.backgroundColor='rgba(240, 98, 146, 0.1)';" onmouseout="this.style.backgroundColor='';">
                    <h4 class="mb-0" style="font-weight: 600; color: #333; flex: 1;">Có dịch vụ tư vấn trực tuyến không?</h4>
                    <span class="faq-icon" style="font-size: 1.5rem; color: #007bff; transition: 0.3s; margin-left: 15px;"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; background-color: white;">
                    <p style="padding: 20px; margin: 0; color: #666; line-height: 1.6;">Có, chúng tôi cung cấp dịch vụ tư vấn trực tuyến 24/7 qua video call, chat hoặc điện thoại.</p>
                </div>
            </div>

            <div style="background-color: #f3fbff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
                <div class="faq-question" onclick="toggleFAQ(this)" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; user-select: none;" onmouseover="this.style.backgroundColor='rgba(240, 98, 146, 0.1)';" onmouseout="this.style.backgroundColor='';">
                    <h4 class="mb-0" style="font-weight: 600; color: #333; flex: 1;">Bác sĩ của bạn có kinh nghiệm bao nhiêu?</h4>
                    <span class="faq-icon" style="font-size: 1.5rem; color: #007bff; transition: 0.3s; margin-left: 15px;"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; background-color: white;">
                    <p style="padding: 20px; margin: 0; color: #666; line-height: 1.6;">Đội ngũ bác sĩ của chúng tôi có từ 7-20+ năm kinh nghiệm trong lĩnh vực sản phụ khoa và nhi khoa.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Bootstrap 5 JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="../JS/style.js"></script>
<script>
        function toggleFAQ(element) {
            const question = element;
            const answer = element.nextElementSibling;
            const icon = question.querySelector('.faq-icon i');
            
            // Đóng tất cả các FAQ khác
            document.querySelectorAll('.faq-answer').forEach(item => {
                if (item !== answer) {
                    item.style.maxHeight = '0';
                    if (item.previousElementSibling) {
                        item.previousElementSibling.style.backgroundColor = '';
                        const otherIcon = item.previousElementSibling.querySelector('.faq-icon i');
                        if (otherIcon) {
                            otherIcon.style.transform = 'rotate(0deg)';
                        }
                    }
                }
            });
            
            // Toggle FAQ hiện tại
            if (answer.style.maxHeight && answer.style.maxHeight !== '0px') {
                answer.style.maxHeight = '0';
                question.style.backgroundColor = '';
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                answer.style.maxHeight = '500px';
                question.style.backgroundColor = 'rgba(240, 98, 146, 0.1)';
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        }

        $(document).ready(function() {
            const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEtPaKAx9AJdxdEl6WGGE4RS5-52x3MUoF6TJjSBYJ8ex0yXnTGHbOeAN4uGenkPay/exec";
            const form = $('#bookingForm');
            const successMessage = $('#successMessage');

            form.on('submit', function(e) {
                e.preventDefault();
                
                const bookingData = {
                    name: $('#customerName').val().trim(),
                    phone: $('#customerPhone').val().trim(),
                    email: $('#customerEmail').val().trim(),
                    service: $('#serviceName').val(),
                    price: $('#servicePrice').val() || "N/A",
                    note: $('#customerNote').val().trim()
                };
                
                if (!bookingData.name || !bookingData.phone) {
                    alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
                    return;
                }
                
                const submitBtn = form.find('button[type="submit"]');
                const originalText = submitBtn.html();
                submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Đang gửi...');
                
                $.ajax({
                    url: SCRIPT_URL,
                    method: 'POST',
                    dataType: 'json',
                    contentType: 'text/plain;charset=utf-8',
                    data: JSON.stringify(bookingData),
                    success: function(response) {
                        form.fadeOut(300, function() {
                            successMessage.fadeIn(300);
                        });
                        
                        // Sau 5 giây hiện lại form để khách khác có thể gửi
                        setTimeout(function() {
                            successMessage.fadeOut(300, function() {
                                form[0].reset();
                                form.fadeIn(300);
                            });
                        }, 5000);
                    },
                    error: function(xhr, status, error) {
                        // Xử lý dự phòng cho Google Script
                        alert('Yêu cầu đã được gửi thành công!');
                        form[0].reset();
                    },
                    complete: function() {
                        submitBtn.prop('disabled', false).html(originalText);
                    }
                });
            });

            // Chỉ cho nhập số vào ô điện thoại
            $('#customerPhone').on('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        });
    </script>
<?php
require_once __DIR__ . '/components/footer.php';
renderFooter();
?>
