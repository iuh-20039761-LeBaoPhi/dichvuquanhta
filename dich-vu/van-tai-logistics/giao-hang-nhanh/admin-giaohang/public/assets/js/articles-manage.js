(function (window, document) {
  if (window.__ghnArticlesManageInitDone) return;
  window.__ghnArticlesManageInitDone = true;

  const API_URL = "../api/articles_manage.php";
  const refs = {
    tbody: document.getElementById("articles-table-body"),
    summary: document.getElementById("articles-summary"),
    form: document.getElementById("article-form"),
    formTitle: document.getElementById("article-form-title"),
    createBtn: document.getElementById("article-create-btn"),
    resetBtn: document.getElementById("article-reset-btn"),
    saveBtn: document.getElementById("article-save-btn"),
    search: document.getElementById("article-search"),
    categoryFilter: document.getElementById("article-category-filter"),
    statusFilter: document.getElementById("article-status-filter"),
    runtime: document.getElementById("article-runtime-message"),
  };

  let articles = [];
  let activeSlugTouched = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function slugify(value) {
    return normalizeText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cam-nang";
  }

  function normalizeStatus(value) {
    return value === "hidden" ? "hidden" : "published";
  }

  function showRuntimeMessage(type, message) {
    refs.runtime.className = `pricing-alert article-runtime-message pricing-alert--${type}`;
    refs.runtime.innerHTML = `<i class="fa-solid ${
      type === "success" ? "fa-circle-check" : "fa-circle-exclamation"
    }"></i> ${escapeHtml(message)}`;
    refs.runtime.style.display = "block";
  }

  function hideRuntimeMessage() {
    refs.runtime.style.display = "none";
    refs.runtime.innerHTML = "";
  }

  async function apiRequest(action, payload = {}) {
    const options = action === "list"
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        };
    const url = action === "list" ? `${API_URL}?action=list` : API_URL;
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Không xử lý được dữ liệu cẩm nang.");
    }
    return data;
  }

  function getArticleStatusMeta(article) {
    return normalizeStatus(article.status) === "hidden"
      ? { text: "Đang ẩn", className: "is-hidden", icon: "fa-eye-slash" }
      : { text: "Đang hiển thị", className: "is-published", icon: "fa-eye" };
  }

  function getFilteredArticles() {
    const keyword = normalizeText(refs.search.value).toLowerCase();
    const category = refs.categoryFilter.value;
    const status = refs.statusFilter.value;

    return articles.filter((article) => {
      if (category && article.category !== category) return false;
      if (status && normalizeStatus(article.status) !== status) return false;
      if (!keyword) return true;
      const haystack = [
        article.title,
        article.description,
        article.category,
        ...(Array.isArray(article.tags) ? article.tags : []),
      ].map((item) => normalizeText(item).toLowerCase()).join(" ");
      return haystack.includes(keyword);
    });
  }

  function renderCategoryFilter() {
    const currentValue = refs.categoryFilter.value;
    const categories = Array.from(
      new Set(articles.map((article) => normalizeText(article.category)).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "vi"));

    refs.categoryFilter.innerHTML = '<option value="">Tất cả chuyên mục</option>' +
      categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
    refs.categoryFilter.value = categories.includes(currentValue) ? currentValue : "";
  }

  function renderTable() {
    const filtered = getFilteredArticles();
    refs.summary.textContent = `Hiển thị ${filtered.length} / ${articles.length} bài viết.`;

    if (!filtered.length) {
      refs.tbody.innerHTML = '<tr><td colspan="5" class="users-empty">Không có bài viết phù hợp.</td></tr>';
      return;
    }

    refs.tbody.innerHTML = filtered
      .slice()
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
      .map((article) => {
        const statusMeta = getArticleStatusMeta(article);
        return `
          <tr data-article-id="${escapeHtml(article.id)}">
            <td data-label="ID"><strong>#${escapeHtml(article.id)}</strong></td>
            <td data-label="Bài viết" class="article-title-cell">
              <strong>${escapeHtml(article.title || "(Chưa có tiêu đề)")}</strong>
              <small>${escapeHtml(article.description || "")}</small>
              <small>Slug: ${escapeHtml(article.slug || "")}</small>
              <a class="article-preview-link" href="../../cam-nang-chi-tiet-giaohang.html?id=${encodeURIComponent(article.id)}" target="_blank" rel="noopener">Xem public</a>
            </td>
            <td data-label="Chuyên mục">${escapeHtml(article.category || "--")}<br><small>${escapeHtml(article.date || "")}</small></td>
            <td data-label="Trạng thái">
              <span class="article-status ${statusMeta.className}">
                <i class="fa-solid ${statusMeta.icon}"></i> ${escapeHtml(statusMeta.text)}
              </span>
            </td>
            <td data-label="Thao tác">
              <div class="article-actions">
                <button type="button" class="btn-secondary" data-article-action="edit" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn-secondary" data-article-action="toggle" title="Ẩn/hiện"><i class="fa-solid ${normalizeStatus(article.status) === "hidden" ? "fa-eye" : "fa-eye-slash"}"></i></button>
                <button type="button" class="btn-secondary" data-article-action="delete" title="Xóa" style="color:#dc2626;"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function setFormArticle(article = null) {
    refs.form.reset();
    activeSlugTouched = false;
    refs.form.elements.namedItem("id").value = article?.id || "";
    refs.form.elements.namedItem("title").value = article?.title || "";
    refs.form.elements.namedItem("slug").value = article?.slug || "";
    refs.form.elements.namedItem("date").value = article?.date || new Date().toLocaleDateString("vi-VN");
    refs.form.elements.namedItem("category").value = article?.category || "Hướng dẫn";
    refs.form.elements.namedItem("status").value = normalizeStatus(article?.status);
    refs.form.elements.namedItem("img").value = article?.img || "assets/images/";
    refs.form.elements.namedItem("description").value = article?.description || "";
    refs.form.elements.namedItem("tags").value = Array.isArray(article?.tags) ? article.tags.join(", ") : "";
    refs.form.elements.namedItem("content").value = article?.content || "";
    refs.formTitle.textContent = article ? `Sửa bài #${article.id}` : "Thêm bài viết";
  }

  function readFormArticle() {
    const form = refs.form;
    const title = normalizeText(form.elements.namedItem("title").value);
    const slugInput = normalizeText(form.elements.namedItem("slug").value);
    const content = String(form.elements.namedItem("content").value || "").trim();

    if (!title) throw new Error("Tiêu đề bài viết không được để trống.");
    if (!content) throw new Error("Nội dung bài viết không được để trống.");

    return {
      id: Number(form.elements.namedItem("id").value || 0) || undefined,
      title,
      slug: slugInput || slugify(title),
      date: normalizeText(form.elements.namedItem("date").value),
      category: normalizeText(form.elements.namedItem("category").value) || "Hướng dẫn",
      status: normalizeStatus(form.elements.namedItem("status").value),
      img: normalizeText(form.elements.namedItem("img").value),
      description: normalizeText(form.elements.namedItem("description").value),
      tags: normalizeText(form.elements.namedItem("tags").value)
        .split(",")
        .map((tag) => normalizeText(tag))
        .filter(Boolean),
      content,
    };
  }

  async function loadArticles() {
    showRuntimeMessage("success", "Đang tải dữ liệu cẩm nang...");
    try {
      const data = await apiRequest("list");
      articles = Array.isArray(data.articles) ? data.articles : [];
      renderCategoryFilter();
      renderTable();
      hideRuntimeMessage();
    } catch (error) {
      refs.tbody.innerHTML = `<tr><td colspan="5" class="users-empty">${escapeHtml(error.message || "Không tải được dữ liệu cẩm nang.")}</td></tr>`;
      showRuntimeMessage("error", error.message || "Không tải được dữ liệu cẩm nang.");
    }
  }

  async function saveArticle(event) {
    event.preventDefault();
    const originalText = refs.saveBtn.innerHTML;
    try {
      const article = readFormArticle();
      refs.saveBtn.disabled = true;
      refs.saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
      const data = await apiRequest("save", { article });
      articles = Array.isArray(data.articles) ? data.articles : articles;
      renderCategoryFilter();
      renderTable();
      setFormArticle(data.article || null);
      showRuntimeMessage("success", data.message || "Đã lưu bài viết.");
    } catch (error) {
      showRuntimeMessage("error", error.message || "Không lưu được bài viết.");
    } finally {
      refs.saveBtn.disabled = false;
      refs.saveBtn.innerHTML = originalText;
    }
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Xóa bài viết "${article.title}"?`)) return;
    try {
      const data = await apiRequest("delete", { id: Number(article.id) });
      articles = Array.isArray(data.articles) ? data.articles : articles.filter((item) => item.id !== article.id);
      renderCategoryFilter();
      renderTable();
      setFormArticle();
      showRuntimeMessage("success", data.message || "Đã xóa bài viết.");
    } catch (error) {
      showRuntimeMessage("error", error.message || "Không xóa được bài viết.");
    }
  }

  async function toggleArticle(article) {
    const nextArticle = {
      ...article,
      status: normalizeStatus(article.status) === "hidden" ? "published" : "hidden",
    };
    try {
      const data = await apiRequest("save", { article: nextArticle });
      articles = Array.isArray(data.articles) ? data.articles : articles;
      renderCategoryFilter();
      renderTable();
      showRuntimeMessage("success", nextArticle.status === "hidden" ? "Đã ẩn bài viết." : "Đã hiển thị bài viết.");
    } catch (error) {
      showRuntimeMessage("error", error.message || "Không cập nhật trạng thái bài viết.");
    }
  }

  function findArticleFromEvent(event) {
    const row = event.target.closest("[data-article-id]");
    if (!row) return null;
    const id = Number(row.dataset.articleId || 0);
    return articles.find((article) => Number(article.id || 0) === id) || null;
  }

  if (!refs.tbody || !refs.form) {
    console.error("Thiếu DOM bắt buộc cho trang quản lý cẩm nang.");
    return;
  }

  refs.form.addEventListener("submit", saveArticle);
  refs.createBtn.addEventListener("click", () => setFormArticle());
  refs.resetBtn.addEventListener("click", () => setFormArticle());
  refs.search.addEventListener("input", renderTable);
  refs.categoryFilter.addEventListener("change", renderTable);
  refs.statusFilter.addEventListener("change", renderTable);
  refs.form.elements.namedItem("slug").addEventListener("input", () => {
    activeSlugTouched = true;
  });
  refs.form.elements.namedItem("title").addEventListener("input", (event) => {
    if (!activeSlugTouched && !refs.form.elements.namedItem("id").value) {
      refs.form.elements.namedItem("slug").value = slugify(event.target.value);
    }
  });
  refs.tbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-article-action]");
    if (!button) return;
    const article = findArticleFromEvent(event);
    if (!article) return;
    if (button.dataset.articleAction === "edit") {
      setFormArticle(article);
      refs.form.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (button.dataset.articleAction === "toggle") {
      toggleArticle(article);
    } else if (button.dataset.articleAction === "delete") {
      deleteArticle(article);
    }
  });

  setFormArticle();
  loadArticles();
})(window, document);
