<?php
$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
$projectMarker = '/giao-hang-nhanh/';
$projectPos = stripos($scriptName, $projectMarker);
$projectBase = $projectPos !== false
    ? substr($scriptName, 0, $projectPos + strlen($projectMarker))
    : '/giao-hang-nhanh/';
$parentBase = preg_replace('#giao-hang-nhanh/?$#i', '', $projectBase);

$footerLinks = [
    'about' => $projectBase . 'index.html',
    'services' => $projectBase . 'index.html#services',
    'contact' => $projectBase . 'index.html#contact',
    'terms' => $projectBase . 'dieu-khoan-su-dung.html',
    'privacy' => $projectBase . 'chinh-sach-bao-mat.html',
    'shipping_policy' => $projectBase . 'chinh-sach-van-chuyen.html',
    'svc_lau_don_ve_sinh' => $parentBase . 'dich-vu-don-ve-sinh/demo/',
    'svc_cham_soc_me_be' => $parentBase . 'cham-soc-me-va-be/',
    'svc_cham_soc_vuon' => $parentBase . 'cham-soc-vuon-nha/',
    'svc_giat_ui' => $parentBase . 'giat-ui-nhanh/',
    'svc_tho_nha' => $parentBase . 'tho-nha/',
    'svc_cham_soc_nguoi_gia' => $parentBase . 'cham-soc-nguoi-gia/',
    'svc_cham_soc_nguoi_benh' => $parentBase . 'cham-soc-nguoi-benh/',
    'svc_dich_vu_chuyen_don' => $parentBase . 'dich-vu-chuyen-don/',
    'svc_giao_hang_nhanh' => $projectBase,
];
?>
<footer>
  <div class="footer-container">
    <div class="footer-grid">
      <!-- Cột 1: Thông tin thương hiệu & Công ty -->
      <div class="footer-col brand-col">
        <h2 class="footer-brand-name" style="color: #ff7a00">
          Giao Hàng Nhanh
        </h2>
        <p class="footer-desc">
          Cung cấp dịch vụ giao hàng nhanh chóng, an toàn và chuyên nghiệp hàng
          đầu tại Việt Nam.
        </p>

        <div class="company-details">
          <p class="company-name">CÔNG TY TNHH DỊCH VỤ QUANH TA KERI</p>
          <p>MST: 0315609853</p>
          <p>
            Địa chỉ: Tòa Nhà Sbi, Lô 6b, Đường Số 3, Công Viên Phần Mềm Quang
            Trung, Phường Tân Chánh Hiệp, Quận 12, Thành Phố Hồ Chí Minh, Việt
            Nam
          </p>
        </div>

        <div class="contact-section">
          <h3>Liên Hệ</h3>
          <p><i class="fas fa-phone"></i> 0775472347</p>
          <p><i class="fas fa-envelope"></i> dichvuquanhta.vn@gmail.com</p>
        </div>

        <div class="app-download">
          <h3>Tải Ứng Dụng</h3>
          <div class="app-buttons">
            <a href="#" class="btn-app">
              <span class="icon">🍎</span>
              <div class="text">
                <span class="sub">Download on the</span>
                <span class="main">App Store</span>
              </div>
            </a>
            <a href="#" class="btn-app">
              <span class="icon">🤖</span>
              <div class="text">
                <span class="sub">GET IT ON</span>
                <span class="main">Google Play</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      <!-- Cột 2: Liên kết & Dịch vụ -->
      <div class="footer-col links-col">
        <h3>Liên Kết</h3>
        <ul class="footer-links">
          <li><a href="<?php echo htmlspecialchars($footerLinks['about']); ?>">Giới Thiệu</a></li>
          <li><a href="<?php echo htmlspecialchars($footerLinks['services']); ?>">Dịch Vụ</a></li>
          <li><a href="<?php echo htmlspecialchars($footerLinks['contact']); ?>">Liên Hệ</a></li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['terms']); ?>">Điều khoản sử dụng</a>
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['privacy']); ?>">Chính sách bảo mật</a>
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['shipping_policy']); ?>">Chính sách vận chuyển</a>
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_lau_don_ve_sinh']); ?>">Lau Dọn Vệ Sinh</a>
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_cham_soc_me_be']); ?>">Chăm Sóc Mẹ & Bé</a>
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_cham_soc_vuon']); ?>"
              >Chăm Sóc Vườn & Rẫy</a
            >
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_giat_ui']); ?>">Giặt Ủi Cao Cấp</a>
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_tho_nha']); ?>"
              >Thợ Nhà & Sửa Chữa</a
            >
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_cham_soc_nguoi_gia']); ?>"
              >Chăm Sóc Người Già</a
            >
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_cham_soc_nguoi_benh']); ?>"
              >Chăm Sóc Bệnh Nhân</a
            >
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_dich_vu_chuyen_don']); ?>"
              >Dịch vụ Chuyển Dọn</a
            >
          </li>
          <li>
            <a href="<?php echo htmlspecialchars($footerLinks['svc_giao_hang_nhanh']); ?>"
              >Giao Hàng Nhanh</a
            >
          </li>
        </ul>
      </div>

      <!-- Cột 3: Theo dõi -->
      <div class="footer-col social-col">
        <h3>Theo Dõi</h3>
        <div class="social-icons">
          <a href="#" title="Facebook"><i class="fab fa-facebook-f"></i></a>
          <a href="#" title="Instagram"><i class="fab fa-instagram"></i></a>
          <a href="#" title="Youtube"><i class="fab fa-youtube"></i></a>
          <a href="#" title="TikTok"><i class="fab fa-tiktok"></i></a>
        </div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="container">
      <p>© 2026 Giao Hàng Nhanh. Tất cả quyền được bảo lưu.</p>
    </div>
  </div>
</footer>
