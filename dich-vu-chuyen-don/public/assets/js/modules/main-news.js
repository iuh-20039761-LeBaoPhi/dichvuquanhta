/* e:\Thực tập Keri\Task\dich-vu-chuyen-don\public\assets\js\modules\main-news.js */
(function (window, document) {
  /**
   * Lớp quản lý dữ liệu bài viết (Model)
   * Đóng vai trò là nơi cung cấp dữ liệu, tách biệt với logic hiển thị.
   */
  const NewsService = {
    _getData: function () {
      // Lấy dữ liệu từ file data riêng, đảm bảo an toàn nếu file chưa được load
      return window.AppNewsData || [];
    },

    getAll: function () {
      return this._getData();
    },

    getById: function (id) {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        return null;
      }
      return this._getData().find((item) => item.id === numericId);
    },
  };

  /**
   * Lớp quản lý hiển thị (View)
   * Chịu trách nhiệm render HTML, không chứa logic nghiệp vụ.
   */
  const NewsView = {
    renderList: function (container, articles) {
      if (!articles || articles.length === 0) {
        container.innerHTML = "<p>Hiện chưa có bài viết nào.</p>";
        return;
      }

      const html = articles
        .map(
          (item) => `
        <article class="news-card">
          <div class="news-thumb">
            <a href="chi-tiet-tin-tuc.html?id=${item.id}">
              <img src="${item.image}" alt="${item.title}" loading="lazy">
            </a>
          </div>
          <div class="news-content">
            <span class="news-date">📅 ${item.date} | ✍️ ${item.author}</span>
            <h3 class="news-title">
              <a href="chi-tiet-tin-tuc.html?id=${item.id}" style="color: inherit; text-decoration: none;">
                ${item.title}
              </a>
            </h3>
            <p class="news-summary">${item.summary}</p>
            <a href="chi-tiet-tin-tuc.html?id=${item.id}" class="news-link">Xem chi tiết →</a>
          </div>
        </article>
      `,
        )
        .join("");

      container.innerHTML = html;
    },

    renderDetail: function (container, article) {
      if (!article) {
        container.innerHTML = `
          <div style="text-align: center; padding: 50px;">
            <h2>Không tìm thấy bài viết!</h2>
            <a href="tin-tuc.html" class="btn-primary" style="margin-top: 20px;">Quay lại trang tin tức</a>
          </div>`;
        return;
      }

      document.title = `${article.title} - Dịch vụ Chuyển Dọn`;

      // Cập nhật Meta Description và OG Tags cho SEO (Client-side)
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", article.summary);

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", article.title);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", article.summary);

      const ogImage = document.querySelector('meta[property="og:image"]');
      // Lưu ý: Đường dẫn ảnh cần tuyệt đối (có domain) để chia sẻ tốt nhất, ở đây dùng tương đối tạm thời
      if (ogImage) {
        // Chuyển đổi đường dẫn gốc tương đối (/public/...) thành URL tuyệt đối (https://...)
        ogImage.setAttribute("content", new URL(article.image, window.location.origin).href);
      }

      // Cập nhật Canonical URL
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) {
        // Tạo URL tuyệt đối dựa trên vị trí trang hiện tại để đảm bảo tính di động
        const absoluteUrl = new URL(`chi-tiet-tin-tuc.html?id=${article.id}`, window.location.href).href;
        canonicalLink.setAttribute("href", absoluteUrl);
      }

      // Cập nhật Schema.org Article
      const schemaScript = document.getElementById("article-schema");
      if (schemaScript) {
        const schemaData = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": article.title,
          "image": new URL(article.image, window.location.origin).href, // Cần URL tuyệt đối
          "datePublished": new Date(article.date.split('/').reverse().join('-')).toISOString(),
          "author": {
            "@type": "Person",
            "name": article.author
          },
          "publisher": {
            "@type": "Organization",
            "name": "Dịch vụ Chuyển Dọn"
          }
        };
        schemaScript.textContent = JSON.stringify(schemaData, null, 2);
      }

      const html = `
        <div class="article-header">
          <a href="tin-tuc.html" class="back-btn">← Quay lại danh sách</a>
          <h1 class="article-title">${article.title}</h1>
          <div class="article-meta">
            <span>Ngày đăng: ${article.date}</span> | 
            <span>Tác giả: ${article.author}</span>
          </div>
        </div>
        <div class="article-body">
          ${article.content}
        </div>
      `;

      container.innerHTML = html;
    },
  };

  /**
   * Hàm điều khiển và khởi tạo (Controller)
   * Quyết định khi nào và dữ liệu nào sẽ được hiển thị.
   */
  function initNewsModule() {
    // Điều hướng cho trang danh sách tin tức
    const listContainer = document.getElementById("news-list-container");
    if (listContainer) {
      const allArticles = NewsService.getAll();
      NewsView.renderList(listContainer, allArticles);
    }

    // Điều hướng cho trang chi tiết tin tức
    const detailContainer = document.getElementById("news-detail-container");
    if (detailContainer) {
      const urlParams = new URLSearchParams(window.location.search);
      const articleId = urlParams.get("id");
      const article = NewsService.getById(articleId);
      NewsView.renderDetail(detailContainer, article);
    }
  }

  // Khởi chạy module khi DOM đã sẵn sàng
  document.addEventListener("DOMContentLoaded", initNewsModule);
})(window, document);
