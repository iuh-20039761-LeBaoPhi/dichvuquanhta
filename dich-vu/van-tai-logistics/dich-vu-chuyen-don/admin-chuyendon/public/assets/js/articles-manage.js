(function (window, document) {
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
    let slugTouched = false;

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
        refs.runtime.className = `flash article-runtime-message ${type === "success" ? "" : "flash-error"}`;
        refs.runtime.textContent = message;
        refs.runtime.style.display = "block";
    }

    function hideRuntimeMessage() {
        refs.runtime.style.display = "none";
        refs.runtime.textContent = "";
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

    function getFilteredArticles() {
        const keyword = normalizeText(refs.search.value).toLowerCase();
        const category = refs.categoryFilter.value;
        const status = refs.statusFilter.value;

        return articles.filter((article) => {
            if (category && article.category !== category) {
                return false;
            }
            if (status && normalizeStatus(article.status) !== status) {
                return false;
            }
            if (!keyword) {
                return true;
            }

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
        const categories = Array.from(new Set(
            articles.map((article) => normalizeText(article.category)).filter(Boolean)
        )).sort((left, right) => left.localeCompare(right, "vi"));

        refs.categoryFilter.innerHTML = '<option value="">Tất cả chuyên mục</option>' +
            categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
        refs.categoryFilter.value = categories.includes(currentValue) ? currentValue : "";
    }

    function renderTable() {
        const filtered = getFilteredArticles();
        refs.summary.textContent = `Hiển thị ${filtered.length} / ${articles.length} bài viết.`;

        if (!filtered.length) {
            refs.tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--slate-light);">Không có bài viết phù hợp.</td></tr>';
            return;
        }

        refs.tbody.innerHTML = filtered
            .slice()
            .sort((left, right) => Number(right.id || 0) - Number(left.id || 0))
            .map((article) => {
                const status = normalizeStatus(article.status);
                return `
                    <tr data-article-id="${escapeHtml(article.id)}">
                        <td data-label="ID"><strong>#${escapeHtml(article.id)}</strong></td>
                        <td data-label="Bài viết">
                            <div style="font-weight:800; color:var(--slate);">${escapeHtml(article.title || "(Chưa có tiêu đề)")}</div>
                            <div style="font-size:13px; color:var(--slate-light); margin-top:6px;">${escapeHtml(article.description || "")}</div>
                            <div style="font-size:12px; color:var(--slate-light); margin-top:6px;">Slug: ${escapeHtml(article.slug || "")}</div>
                            <a href="../../public/trang/noi-dung/cam-nang-chi-tiet-chuyendon.html?id=${encodeURIComponent(article.id)}" target="_blank" rel="noopener" style="display:inline-flex; margin-top:8px; color:var(--primary-deep); font-weight:700; text-decoration:none;">Xem public</a>
                        </td>
                        <td data-label="Chuyên mục">${escapeHtml(article.category || "--")}<br><span style="font-size:12px; color:var(--slate-light);">${escapeHtml(article.date || "")}</span></td>
                        <td data-label="Trạng thái">
                            <span class="article-status ${status === "hidden" ? "is-hidden" : "is-published"}">
                                <i class="fas ${status === "hidden" ? "fa-eye-slash" : "fa-eye"}"></i>
                                ${status === "hidden" ? "Đang ẩn" : "Đang hiển thị"}
                            </span>
                        </td>
                        <td data-label="Thao tác">
                            <div class="article-actions">
                                <button type="button" class="btn btn-outline" data-article-action="edit"><i class="fas fa-pen"></i></button>
                                <button type="button" class="btn btn-outline" data-article-action="toggle"><i class="fas ${status === "hidden" ? "fa-eye" : "fa-eye-slash"}"></i></button>
                                <button type="button" class="btn btn-outline" data-article-action="delete"><i class="fas fa-trash-alt" style="color:var(--danger);"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");
    }

    function setFormArticle(article = null) {
        refs.form.reset();
        slugTouched = false;
        refs.form.elements.namedItem("id").value = article?.id || "";
        refs.form.elements.namedItem("title").value = article?.title || "";
        refs.form.elements.namedItem("slug").value = article?.slug || "";
        refs.form.elements.namedItem("date").value = article?.date || new Date().toLocaleDateString("vi-VN");
        refs.form.elements.namedItem("category").value = article?.category || "Kinh nghiệm";
        refs.form.elements.namedItem("status").value = normalizeStatus(article?.status);
        refs.form.elements.namedItem("img").value = article?.img || "assets/images/";
        refs.form.elements.namedItem("description").value = article?.description || "";
        refs.form.elements.namedItem("tags").value = Array.isArray(article?.tags) ? article.tags.join(", ") : "";
        refs.form.elements.namedItem("content").value = article?.content || "";
        refs.formTitle.textContent = article ? `Sửa bài #${article.id}` : "Thêm bài viết";
    }

    function readFormArticle() {
        const title = normalizeText(refs.form.elements.namedItem("title").value);
        const slug = normalizeText(refs.form.elements.namedItem("slug").value);
        const content = String(refs.form.elements.namedItem("content").value || "").trim();

        if (!title) {
            throw new Error("Tiêu đề bài viết không được để trống.");
        }
        if (!content) {
            throw new Error("Nội dung bài viết không được để trống.");
        }

        return {
            id: Number(refs.form.elements.namedItem("id").value || 0) || undefined,
            title,
            slug: slug || slugify(title),
            date: normalizeText(refs.form.elements.namedItem("date").value),
            category: normalizeText(refs.form.elements.namedItem("category").value) || "Kinh nghiệm",
            status: normalizeStatus(refs.form.elements.namedItem("status").value),
            img: normalizeText(refs.form.elements.namedItem("img").value),
            description: normalizeText(refs.form.elements.namedItem("description").value),
            tags: normalizeText(refs.form.elements.namedItem("tags").value)
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
            refs.tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--danger);">${escapeHtml(error.message || "Không tải được cẩm nang.")}</td></tr>`;
            showRuntimeMessage("error", error.message || "Không tải được cẩm nang.");
        }
    }

    async function saveArticle(event) {
        event.preventDefault();
        const originalHtml = refs.saveBtn.innerHTML;
        try {
            const article = readFormArticle();
            refs.saveBtn.disabled = true;
            refs.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Đang lưu...';
            const data = await apiRequest("save", { article });
            articles = Array.isArray(data.articles) ? data.articles : articles;
            renderCategoryFilter();
            renderTable();
            setFormArticle(data.article || null);
            showRuntimeMessage("success", data.message || "Đã lưu bài viết.");
        } catch (error) {
            showRuntimeMessage("error", error.message || "Không thể lưu bài viết.");
        } finally {
            refs.saveBtn.disabled = false;
            refs.saveBtn.innerHTML = originalHtml;
        }
    }

    async function deleteArticle(article) {
        if (!window.confirm(`Xóa bài viết "${article.title}"?`)) {
            return;
        }

        try {
            const data = await apiRequest("delete", { id: Number(article.id) });
            articles = Array.isArray(data.articles) ? data.articles : articles.filter((item) => Number(item.id) !== Number(article.id));
            renderCategoryFilter();
            renderTable();
            setFormArticle();
            showRuntimeMessage("success", data.message || "Đã xóa bài viết.");
        } catch (error) {
            showRuntimeMessage("error", error.message || "Không thể xóa bài viết.");
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
            showRuntimeMessage("error", error.message || "Không thể cập nhật trạng thái.");
        }
    }

    function findArticleFromEvent(event) {
        const row = event.target.closest("[data-article-id]");
        if (!row) {
            return null;
        }
        const id = Number(row.getAttribute("data-article-id") || 0);
        return articles.find((article) => Number(article.id || 0) === id) || null;
    }

    refs.form.addEventListener("submit", saveArticle);
    refs.createBtn.addEventListener("click", () => setFormArticle());
    refs.resetBtn.addEventListener("click", () => setFormArticle());
    refs.search.addEventListener("input", renderTable);
    refs.categoryFilter.addEventListener("change", renderTable);
    refs.statusFilter.addEventListener("change", renderTable);
    refs.form.elements.namedItem("slug").addEventListener("input", () => { slugTouched = true; });
    refs.form.elements.namedItem("title").addEventListener("input", (event) => {
        if (!slugTouched && !refs.form.elements.namedItem("id").value) {
            refs.form.elements.namedItem("slug").value = slugify(event.target.value);
        }
    });
    refs.tbody.addEventListener("click", (event) => {
        const button = event.target.closest("[data-article-action]");
        if (!button) {
            return;
        }
        const article = findArticleFromEvent(event);
        if (!article) {
            return;
        }
        const action = button.getAttribute("data-article-action");
        if (action === "edit") {
            setFormArticle(article);
            refs.form.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        if (action === "toggle") {
            toggleArticle(article);
            return;
        }
        if (action === "delete") {
            deleteArticle(article);
        }
    });

    setFormArticle();
    loadArticles();
})(window, document);
