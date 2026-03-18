<style>
/* ===== FOOTER ===== */

.footer{
    background:#34495e;
    color:white;
}

/* Layout */
.footer-content {
    display: flex;
    gap: 30px;
    padding: 40px 0;
    flex-wrap: wrap;
}

.footer-col {
    flex: 1;
    min-width: 220px;
}

/* Title */
.footer-col h3,
.footer-col h4 {
    margin-bottom: 15px;
    color: var(--accent);
}

/* Text */
.footer-col p {
    line-height: 1.6;
    margin-bottom: 10px;
}

/* List */
.footer-col ul {
    list-style: none;
}

.footer-col ul li {
    margin-bottom: 8px;
}

/* Link */
.footer-col a {
    color: #ecf0f1;
    text-decoration: none;
}

.footer-col a:hover {
    text-decoration: underline;
}

/* Bottom */
.footer-bottom {
    background: #1a252f;
    text-align: center;
    padding: 15px 0;
    font-size: 0.9rem;
}

/* ===== MOBILE ===== */
@media (max-width: 768px){
    .footer-content{
        flex-direction: column;
    }
}
</style>
<footer class="footer">
      <div class="container footer-content">
        <!-- CỘT 1 -->
        <div class="footer-col">
          <h3>VỆ SINH CARE</h3>
          <p>
            Dịch vụ vệ sinh chuyên nghiệp cho nhà ở, văn phòng và công trình sau
            xây dựng.
          </p>
        </div>

        <!-- CỘT 2 -->
        <div class="footer-col">
          <h4>Liên kết nhanh</h4>
          <ul>
            <li>
              <a target="_blank" href="../demo/">Lau Dọn Vệ Sinh</a>
            </li>
            <li><a target="_blank" href="../../csmvb/">Chăm Sóc Mẹ & Bé</a></li>
            <li>
              <a target="_blank" href="../../web-cham-soc-vuon-nha/"
                >Chăm Sóc Vườn & Rẫy</a
              >
            </li>
            <li>
              <a target="_blank" href="../../giat-ui-nhanh/">Giặt Ủi Cao Cấp</a>
            </li>
            <li>
              <a target="_blank" href="../../tho-nha/">Thợ Nhà & Sửa Chữa</a>
            </li>
            <li>
              <a target="_blank" href="../../csng/">Chăm Sóc Người Già</a>
            </li>
            <li>
              <a target="_blank" href="../../csbn/">Chăm Sóc Bệnh Nhân</a>
            </li>
            <li>
              <a target="_blank" href="../../he-thong-giao-hang-chuyen-don/"
                >Giao Hàng Nhanh</a
              >
            </li>
          </ul>
        </div>

        <!-- CỘT 3 -->
           <div class="footer-col">
            <h4>Thông tin liên hệ</h4>
            <p>📍Tòa Nhà Sbi, Lô 6b, Đường Số 3, Công Viên Phần Mềm Quang Trung, Phường Tân Chánh Hiệp, Quận 12, Thành Phố Hồ Chí Minh, Việt Nam, TP.HCM</p>
            <p>📞 <a href="tel:0775472347"> 0775472347</a></p>
            <p>✉ <a href="mailto:dichvuquanhta.vn@gmail.com">dichvuquanhta.vn@gmail.com</a></p>
        </div>
      </div>

      <div class="footer-bottom">
        <p>© 2026 Vệ sinh Care. All rights reserved.</p>
        <a href="terms.php">Điều khoản sử dụng</a>
      </div>
    </footer>
