(function (window) {
  if (window.AppNewsData) return;

  // Dữ liệu cho các bài viết
  const newsData = [
    {
      id: 1,
      title: "5 Kinh nghiệm chuyển nhà trọn gói tiết kiệm chi phí",
      date: "12/03/2026",
      author: "Admin",
      image: "../assets/images/hero.png", // Dùng tạm ảnh hero làm thumb
      summary:
        "Chuyển nhà là một công việc vất vả. Bài viết này sẽ chia sẻ 5 mẹo giúp bạn tiết kiệm tối đa chi phí và thời gian khi thuê dịch vụ chuyển nhà.",
      content: `
        <p>Việc chuyển nhà thường đi kèm với nhiều lo toan, đặc biệt là vấn đề chi phí. Dưới đây là những kinh nghiệm thực tế giúp bạn tối ưu ngân sách:</p>
        <h2>1. Lên kế hoạch sớm</h2>
        <p>Đừng đợi đến sát ngày mới tìm dịch vụ. Việc đặt lịch trước ít nhất 1 tuần giúp bạn có nhiều lựa chọn hơn và tránh bị ép giá vào giờ cao điểm.</p>
        <h2>2. Thanh lý đồ đạc không cần thiết</h2>
        <p>Chi phí vận chuyển phụ thuộc vào khối lượng đồ đạc. Hãy mạnh dạn thanh lý hoặc cho tặng những món đồ bạn không còn dùng đến.</p>
        <h2>3. Tự đóng gói các vật dụng nhỏ</h2>
        <p>Nếu có thời gian, bạn có thể tự đóng gói quần áo, sách vở. Dịch vụ trọn gói sẽ lo các phần nặng nhọc như tủ, giường, máy giặt.</p>
        <img src="../assets/images/package.png" alt="Đóng gói đồ đạc" />
        <h2>4. So sánh báo giá</h2>
        <p>Hãy tham khảo giá từ 2-3 đơn vị uy tín. Tuy nhiên, đừng chỉ nhìn vào giá rẻ nhất, hãy xem xét quy trình và cam kết bồi thường.</p>
        <h2>5. Chọn thời điểm chuyển nhà</h2>
        <p>Nếu có thể, hãy tránh chuyển nhà vào các ngày lễ tết hoặc cuối tuần vì chi phí có thể cao hơn ngày thường.</p>
      `,
    },
    {
      id: 2,
      title: "Quy trình chuyển văn phòng chuyên nghiệp cần biết",
      date: "10/03/2026",
      author: "Nguyễn Văn A",
      image: "../assets/images/order.png",
      summary:
        "Để đảm bảo hoạt động kinh doanh không bị gián đoạn, việc chuyển văn phòng cần tuân thủ quy trình nghiêm ngặt từ khảo sát đến bàn giao.",
      content: `
        <p>Chuyển văn phòng phức tạp hơn chuyển nhà rất nhiều vì liên quan đến hồ sơ, máy móc thiết bị và thời gian làm việc của nhân viên.</p>
        <h2>Bước 1: Khảo sát và lên phương án</h2>
        <p>Đơn vị vận chuyển cần đến đo đạc, tính toán số lượng xe và nhân sự cần thiết.</p>
        <h2>Bước 2: Phân loại và đóng gói</h2>
        <p>Hồ sơ quan trọng cần được niêm phong. Thiết bị điện tử (PC, Server) cần được bọc lót bằng vật liệu chống sốc chuyên dụng.</p>
        <h2>Bước 3: Vận chuyển và lắp đặt</h2>
        <p>Tại văn phòng mới, đồ đạc sẽ được lắp đặt theo sơ đồ bố trí của doanh nghiệp để nhân viên có thể làm việc ngay.</p>
      `,
    },
    {
      id: 3,
      title: "Tại sao nên thuê dịch vụ chuyển kho bãi thay vì tự làm?",
      date: "05/03/2026",
      author: "Admin",
      image: "../assets/images/hero-shipper.png",
      summary:
        "Di dời kho bãi đòi hỏi máy móc chuyên dụng như xe nâng, xe cẩu. Tự thực hiện có thể gây rủi ro lớn về an toàn và hư hại hàng hóa.",
      content: `
        <p>Kho bãi thường chứa hàng hóa nặng, cồng kềnh hoặc hàng pallet. Việc tự di dời bằng sức người gần như là không thể.</p>
        <h2>An toàn lao động</h2>
        <p>Dịch vụ chuyên nghiệp có đội ngũ được đào tạo và trang bị bảo hộ, giảm thiểu rủi ro tai nạn.</p>
        <h2>Thiết bị chuyên dụng</h2>
        <p>Chúng tôi sở hữu xe nâng, xe cẩu tự hành và xe tải trọng tải lớn để xử lý mọi loại hàng hóa.</p>
      `,
    },
  ];

  // Gán dữ liệu vào biến toàn cục để các module khác có thể truy cập
  window.AppNewsData = newsData;
})(window);
