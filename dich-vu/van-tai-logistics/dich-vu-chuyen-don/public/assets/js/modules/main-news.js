import core from "./core/app-core.js";

(function (window, document) {
  if (window.__fastGoNewsInitDone) return;
  window.__fastGoNewsInitDone = true;

  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const currentPathLower = currentPath.toLowerCase();
  const projectMarker = "/dich-vu-chuyen-don/";
  const projectMarkerIndex = currentPathLower.lastIndexOf(projectMarker);
  const projectBase =
    core.projectBase ||
    (projectMarkerIndex !== -1
      ? currentPath.slice(0, projectMarkerIndex + projectMarker.length)
      : "./");
  const publicBase = core.publicBase || `${projectBase}public/`;
  const articleListUrl = `${projectBase}cam-nang-chuyendon.html`;
  const articleDetailBaseUrl = `${publicBase}trang/noi-dung/cam-nang-chi-tiet-chuyendon.html`;
  const movingHouseUrl = `${projectBase}dich-vu-chuyen-don.html#chuyen-nha`;
  const movingOfficeUrl = `${projectBase}dich-vu-chuyen-don.html#chuyen-van-phong`;
  const movingWarehouseUrl = `${projectBase}dich-vu-chuyen-don.html#chuyen-kho-bai`;

  function toPublicUrl(path) {
    if (!path) return path;
    if (/^(?:[a-z]+:)?\/\//i.test(path) || String(path).startsWith("/")) return path;
    return core.toPublicUrl ? core.toPublicUrl(path) : `${publicBase}${String(path).replace(/^\.?\//, "")}`;
  }

  function getArticleDetailUrl(id) {
    return `${articleDetailBaseUrl}?id=${id}`;
  }

  function normalizeArticleContent(content) {
    return String(content || "")
      .replace(/(src=|href=)(["'])assets\//gi, `$1$2${publicBase}assets/`);
  }

  /**
   * Lớp quản lý dữ liệu bài viết (Model)
   * Đọc dữ liệu từ file JSON thay vì biến toàn cục.
   */
  const NewsService = {
    _cache: null,

    fetchData: function () {
      if (this._cache) return Promise.resolve(this._cache);
      const jsonPath = toPublicUrl("assets/js/data/news-data.json");
      return fetch(jsonPath)
        .then(function (res) { return res.json(); })
        .then((data) => { NewsService._cache = data; return data; });
    },

    getAll: function () {
      return this._cache || [];
    },

    getById: function (id) {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) return null;
      return this.getAll().find((item) => item.id === numericId);
    },
  };

  /**
   * Lớp quản lý hiển thị (View)
   * Chịu trách nhiệm render HTML, không chứa logic nghiệp vụ.
   */
  const NewsView = {
    populateCategories: function (selectElement, articles) {
      if (!selectElement) return;
      // Lấy các danh mục duy nhất, lọc bỏ các giá trị rỗng
      const categories = [
        ...new Set(articles.map((a) => a.category).filter(Boolean)),
      ];

      let optionsHtml = '<option value="all">Tất cả danh mục</option>';
      optionsHtml += categories
        .map((cat) => `<option value="${cat}">${cat}</option>`)
        .join("");

      selectElement.innerHTML = optionsHtml;
    },

    renderList: function (container, articles, totalFiltered) {
      if (totalFiltered === 0) {
        container.innerHTML = `
          <div class="col-span-full text-center py-10">
              <p class="text-lg text-slate-600">Không tìm thấy bài viết nào phù hợp.</p>
              <p class="text-slate-500 mt-2">Vui lòng thử lại với từ khóa hoặc bộ lọc khác.</p>
          </div>
        `;
        return;
      }
      if (!articles || articles.length === 0) {
        container.innerHTML = "<p>Hiện chưa có bài viết nào.</p>"; // Fallback
      }

      const html = articles
        .map(
          (item) => `
        <article class="news-card">
          <div class="news-thumb">
            <a href="${getArticleDetailUrl(item.id)}">
              <img src="${toPublicUrl(item.img)}" alt="${item.title}" loading="lazy">
            </a>
          </div>
          <div class="news-content">
            <span class="news-date">📅 ${item.date}</span>
            <h3 class="news-title">
              <a href="${getArticleDetailUrl(item.id)}" style="color: inherit; text-decoration: none;">
                ${item.title}
              </a>
            </h3>
            <p class="news-summary">${item.description}</p>
            <a href="${getArticleDetailUrl(item.id)}" class="news-link">Xem chi tiết →</a>
          </div>
        </article>
      `,
        )
        .join("");

      container.innerHTML = html;
    },

    renderPagination: function (container, totalPages, currentPage) {
      if (totalPages <= 1) {
        container.innerHTML = "";
        return;
      }

      let html = "";
      const createPageLink = (
        page,
        text,
        isDisabled = false,
        isActive = false,
      ) => {
        const disabledClass = isDisabled
          ? "pointer-events-none opacity-50"
          : "hover:bg-primary hover:text-white";
        const activeClass = isActive
          ? "bg-primary text-white"
          : "bg-white text-primary";
        const pageText = text || page;
        return `<button data-page="${page}" class="px-4 py-2 border border-slate-200 rounded-md transition-colors duration-200 text-sm font-medium ${activeClass} ${disabledClass}">${pageText}</button>`;
      };

      // Previous button
      html += createPageLink(currentPage - 1, "Trước", currentPage === 1);

      const pageNumbers = [];
      const range = 1; // How many pages to show around the current page

      for (let i = 1; i <= totalPages; i++) {
        if (
          i === 1 || // always show first page
          i === totalPages || // always show last page
          (i >= currentPage - range && i <= currentPage + range) // show pages in range
        ) {
          pageNumbers.push(i);
        }
      }

      let lastPage = 0;
      for (const page of pageNumbers) {
        if (lastPage > 0 && page - lastPage > 1) {
          html += `<span class="px-4 py-2 text-slate-500">...</span>`;
        }
        html += createPageLink(page, null, false, page === currentPage);
        lastPage = page;
      }

      // Next button
      html += createPageLink(
        currentPage + 1,
        "Sau",
        currentPage === totalPages,
      );

      container.innerHTML = html;
    },

    // Hàm helper để render sidebar
    _renderSidebar: function (currentId, allArticles) {
      const related = allArticles.filter((a) => a.id !== currentId).slice(0, 3);

      return `
            <div class="sidebar-wrapper">
                <div class="sidebar-widget">
                    <h3 class="widget-title">Tin liên quan</h3>
                    <ul class="related-list">
                        ${related
                          .map(
                            (item) => `
                            <li class="related-item">
                                <img src="${toPublicUrl(item.img)}" alt="${item.title}" class="related-thumb">
                                <div class="related-title">
                                    <a href="${getArticleDetailUrl(item.id)}">${item.title}</a>
                                    <span class="related-date">${item.date}</span>
                                </div>
                            </li>
                        `,
                          )
                          .join("")}
                    </ul>
                </div>

                <div class="sidebar-widget">
                    <h3 class="widget-title">Dịch vụ nổi bật</h3>
                    <div class="service-tags">
                        <a href="${movingHouseUrl}" class="tag-btn">Chuyển nhà</a>
                        <a href="${movingOfficeUrl}" class="tag-btn">Chuyển văn phòng</a>
                        <a href="${movingWarehouseUrl}" class="tag-btn">Chuyển kho bãi</a>
                        <a href="#site-footer" class="tag-btn tag-btn-accent">Đặt lịch ngay</a>
                    </div>
                </div>
            </div>
        `;
    },

    _renderRelatedBottom: function (currentArticle, allArticles) {
      // Lọc các bài viết cùng danh mục, loại trừ bài hiện tại
      let related = allArticles.filter(
        (a) =>
          a.category === currentArticle.category && a.id !== currentArticle.id,
      );

      // Nếu không có bài nào cùng danh mục, ẩn section này
      if (related.length === 0) return "";

      // Lấy tối đa 3 bài
      related = related.slice(0, 3);

      return `
        <div class="mt-12 pt-8 border-t border-slate-200">
            <h3 class="text-2xl font-bold text-primary mb-6">Bài viết liên quan</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${related
                  .map(
                    (item) => `
                    <div class="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <a href="${getArticleDetailUrl(item.id)}" class="block h-48 overflow-hidden relative group">
                            <img src="${toPublicUrl(item.img)}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                        </a>
                        <div class="p-4 flex flex-col flex-grow">
                            <div class="text-xs text-slate-500 mb-2">📅 ${item.date}</div>
                            <h4 class="font-bold text-slate-800 text-base mb-3 line-clamp-2 hover:text-primary transition-colors flex-grow">
                                <a href="${getArticleDetailUrl(item.id)}">${item.title}</a>
                            </h4>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
      `;
    },

    renderDetail: function (container, article) {
      if (!article) {
        container.innerHTML = `
          <div class="article-not-found">
            <h2>Không tìm thấy bài viết</h2>
            <p>Nội dung bạn đang tìm có thể đã bị thay đổi hoặc không còn tồn tại.</p>
            <a href="${articleListUrl}" class="btn-primary">Quay lại trang cẩm nang</a>
          </div>`;
        return;
      }

      document.title = `${article.title} - Dịch vụ Chuyển Dọn`;

      // Cập nhật Meta Description và OG Tags cho SEO (Client-side)
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", article.description);

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", article.title);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", article.description);

      const ogImage = document.querySelector('meta[property="og:image"]');
      // Lưu ý: Đường dẫn ảnh cần tuyệt đối (có domain) để chia sẻ tốt nhất, ở đây dùng tương đối tạm thời
      if (ogImage) {
        ogImage.setAttribute(
          "content",
          new URL(toPublicUrl(article.img), window.location.origin).href,
        );
      }

      // Cập nhật Canonical URL
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) {
        const absoluteUrl = new URL(getArticleDetailUrl(article.id), window.location.origin).href;
        canonicalLink.setAttribute("href", absoluteUrl);
      }

      // Cập nhật Schema.org Article
      const schemaScript = document.getElementById("article-schema");
      if (schemaScript) {
        const schemaData = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          image: new URL(toPublicUrl(article.img), window.location.origin).href,
          datePublished: new Date(
            article.date.split("/").reverse().join("-"),
          ).toISOString(),
          author: {
            "@type": "Person",
            name: "Admin",
          },
          publisher: {
            "@type": "Organization",
            name: "Dịch vụ Chuyển Dọn",
          },
        };
        schemaScript.textContent = JSON.stringify(schemaData, null, 2);
      }

      const allArticles = NewsService.getAll(); // Lấy tất cả bài viết để làm sidebar

      const html = `
        <div class="article-detail-shell">
          <!-- Back button replacement for Breadcrumb -->
          <a href="${articleListUrl}" class="inline-flex items-center text-sm text-slate-500 hover:text-primary mb-6 transition-colors group">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại danh sách
          </a>

          <div class="article-detail-card">
            <div class="article-layout">
                <div class="main-content">
                    <header class="article-hero">
                        <img src="${toPublicUrl(article.img)}" alt="${article.title}" class="article-hero-image">
                        <div class="article-hero-content">
                            <span class="article-category-badge">${article.category || "Cẩm nang"}</span>
                            <h1 class="article-title">${article.title}</h1>
                            <p class="article-summary">${article.description || ""}</p>
                            <div class="article-meta-panel">
                                <span class="article-meta-chip">📅 ${article.date}</span>
                            </div>
                        </div>
                    </header>
                    
                    <div class="article-content-card">
                        <div class="article-body">
                            ${normalizeArticleContent(article.content)}
                        </div>

                        <div class="article-footer-nav">
                            <a href="${articleListUrl}" class="back-link">
                                <span aria-hidden="true">←</span>
                                <span>Quay lại danh sách cẩm nang</span>
                            </a>
                        </div>
                    </div>

                    ${this._renderRelatedBottom(article, allArticles)}
                </div>

                <aside class="sidebar sticky top-24 self-start">
                    ${this._renderSidebar(article.id, allArticles)}
                </aside>
            </div>
          </div>
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
    // Điều hướng cho trang danh sách cẩm nang
    const listContainer = document.getElementById("news-list-container");
    const detailContainer = document.getElementById("news-detail-container");

    // Logic cho trang danh sách
    if (listContainer) {
      const allArticles = NewsService.getAll();

      // Lấy các element điều khiển
      const searchInput = document.getElementById("news-search");
      const categorySelect = document.getElementById("news-category");
      const sortSelect = document.getElementById("news-sort");
      const paginationContainer = document.getElementById("news-pagination");

      // Pagination state
      let currentPage = 1;
      const itemsPerPage = 6; // 6 bài viết mỗi trang

      // Điền danh mục vào select
      NewsView.populateCategories(categorySelect, allArticles);

      const updateNewsView = () => {
        // Debounce search input slightly to avoid re-rendering on every keystroke
        const searchTerm = (searchInput.value || "").toLowerCase().trim();
        const category = categorySelect.value;
        const sortBy = sortSelect.value;

        let filteredArticles = [...allArticles];

        // 1. Lọc theo danh mục
        if (category && category !== "all") {
          filteredArticles = filteredArticles.filter(
            (article) => article.category === category,
          );
        }

        // 2. Lọc theo từ khóa tìm kiếm
        if (searchTerm) {
          filteredArticles = filteredArticles.filter(
            (article) =>
              article.title.toLowerCase().includes(searchTerm) ||
              article.description.toLowerCase().includes(searchTerm),
          );
        }

        // 3. Sắp xếp
        const parseDate = (dateStr) => {
          const [day, month, year] = dateStr.split("/");
          return new Date(`${year}-${month}-${day}`);
        };

        switch (sortBy) {
          case "date-desc":
            filteredArticles.sort(
              (a, b) => parseDate(b.date) - parseDate(a.date),
            );
            break;
          case "date-asc":
            filteredArticles.sort(
              (a, b) => parseDate(a.date) - parseDate(b.date),
            );
            break;
          case "title-asc":
            filteredArticles.sort((a, b) => a.title.localeCompare(b.title));
            break;
          case "title-desc":
            filteredArticles.sort((a, b) => b.title.localeCompare(a.title));
            break;
        }

        // Pagination logic
        const totalFiltered = filteredArticles.length;
        const totalPages = Math.ceil(totalFiltered / itemsPerPage);

        // Đảm bảo trang hiện tại không vượt quá tổng số trang
        if (currentPage > totalPages) {
          currentPage = totalPages || 1;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedArticles = filteredArticles.slice(start, end);

        NewsView.renderList(listContainer, paginatedArticles, totalFiltered);
        NewsView.renderPagination(paginationContainer, totalPages, currentPage);
      };

      // Gán sự kiện cho bộ lọc, reset về trang 1 khi thay đổi
      const resetAndRender = () => {
        currentPage = 1;
        updateNewsView();
      };
      searchInput.addEventListener("input", resetAndRender);
      categorySelect.addEventListener("change", resetAndRender);
      sortSelect.addEventListener("change", resetAndRender);

      // Gán sự kiện cho phân trang
      paginationContainer.addEventListener("click", (event) => {
        const target = event.target.closest("button[data-page]");
        if (target && !target.disabled) {
          currentPage = parseInt(target.dataset.page, 10);
          updateNewsView();
          listContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      // Hiển thị lần đầu
      updateNewsView();
    }

    // Điều hướng cho trang chi tiết tin tức
    if (detailContainer) {
      const urlParams = new URLSearchParams(window.location.search);
      const articleId = urlParams.get("id");
      const article = NewsService.getById(articleId);
      NewsView.renderDetail(detailContainer, article);
    }
  }

  // Khởi chạy module khi DOM đã sẵn sàng: fetch JSON trước, sau đó khởi tạo UI
  document.addEventListener("DOMContentLoaded", function () {
    NewsService.fetchData()
      .then(function () { initNewsModule(); })
      .catch(function (err) { console.error("Không thể tải dữ liệu tin tức:", err); });
  });
})(window, document);
