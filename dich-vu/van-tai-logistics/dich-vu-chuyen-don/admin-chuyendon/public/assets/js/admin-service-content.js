(function (window, document) {
    const PAGE_SLUG = "dich-vu-chuyen-don";
    const EXPORT_API_URL = "../api/service_content_export.php";
    const SERVICE_IMAGE_UPLOAD_URL = "../../public/upload_to_drive.php";
    const FALLBACK = window.__MOVING_SERVICE_CONTENT_BOOTSTRAP__ || {};
    const PUBLIC_PAGE_URL = String(window.__MOVING_SERVICE_CONTENT_PAGE_URL__ || "../../dich-vu-chuyen-don.html");

    const refs = {
        runtime: document.getElementById("service-content-runtime"),
        heroForm: document.getElementById("hero-content-form"),
        servicesSectionForm: document.getElementById("services-section-form"),
        serviceCardStack: document.getElementById("service-card-stack"),
        saveHeroBtn: document.getElementById("save-hero-btn"),
        saveServicesSectionBtn: document.getElementById("save-services-section-btn"),
    };

    const state = {
        sectionRows: [],
        serviceRows: [],
    };

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

    function normalizeMultiline(value) {
        return String(value || "")
            .split(/\r\n|\r|\n/)
            .map((item) => normalizeText(item))
            .filter(Boolean);
    }

    function getProjectBaseUrl() {
        const path = String(window.location.pathname || "").replace(/\\/g, "/");
        const marker = "/dich-vu-chuyen-don/";
        const markerIndex = path.toLowerCase().lastIndexOf(marker);
        const projectBasePath =
            markerIndex !== -1 ? path.slice(0, markerIndex + marker.length) : "/";
        return `${window.location.origin}${projectBasePath}`;
    }

    function resolvePreviewImageUrl(value) {
        const normalized = normalizeText(value);
        if (!normalized) return "";
        if (/^(?:[a-z]+:)?\/\//i.test(normalized) || normalized.startsWith("/")) {
            return normalized;
        }
        const cleaned = normalized.replace(/^\.?\//, "").replace(/^assets\//, "");
        return new URL(`public/assets/${cleaned}`, getProjectBaseUrl()).toString();
    }

    function showRuntime(type, message) {
        refs.runtime.className = `flash service-content-runtime ${type === "success" ? "" : "flash-error"}`;
        refs.runtime.textContent = message;
        refs.runtime.style.display = "block";
    }

    function hideRuntime() {
        refs.runtime.style.display = "none";
        refs.runtime.textContent = "";
    }

    function setButtonBusy(button, isBusy, busyText) {
        if (!button) return;
        if (!button.dataset.originalHtml) {
            button.dataset.originalHtml = button.innerHTML;
        }
        button.disabled = isBusy;
        button.innerHTML = isBusy ? busyText : button.dataset.originalHtml;
    }

    function getFallbackHero() {
        return FALLBACK.hero || {};
    }

    function getFallbackServicesSection() {
        return FALLBACK.services_section || {};
    }

    function getFallbackServices() {
        return Array.isArray(FALLBACK.services) ? FALLBACK.services : [];
    }

    function getSectionRow(sectionKey) {
        return state.sectionRows.find((row) => normalizeText(row?.section_key) === sectionKey) || null;
    }

    function getServiceRow(serviceKey) {
        return state.serviceRows.find((row) => normalizeText(row?.service_key) === serviceKey) || null;
    }

    function buildSectionPayload(form, sectionKey) {
        return {
            page_slug: PAGE_SLUG,
            section_key: sectionKey,
            eyebrow: normalizeText(form.elements.namedItem("eyebrow").value),
            title: normalizeText(form.elements.namedItem("title").value),
            description: normalizeText(form.elements.namedItem("description").value),
            primary_cta_label: normalizeText(form.elements.namedItem("primary_cta_label")?.value || ""),
            primary_cta_url: normalizeText(form.elements.namedItem("primary_cta_url")?.value || ""),
            secondary_cta_label: normalizeText(form.elements.namedItem("secondary_cta_label")?.value || ""),
            secondary_cta_url: normalizeText(form.elements.namedItem("secondary_cta_url")?.value || ""),
            updated_at: new Date().toISOString(),
        };
    }

    function buildServicePayload(form, serviceKey, sortOrder) {
        // Collect items from the dynamic list
        const itemInputs = Array.from(form.querySelectorAll('.service-item-input'));
        const items = itemInputs
            .map(input => normalizeText(input.value))
            .filter(Boolean);

        return {
            page_slug: PAGE_SLUG,
            service_key: serviceKey,
            is_visible: form.elements.namedItem("is_visible").checked ? "1" : "0",
            label: normalizeText(form.elements.namedItem("label").value),
            title: normalizeText(form.elements.namedItem("title").value),
            summary: normalizeText(form.elements.namedItem("summary").value),
            image: normalizeText(form.elements.namedItem("image").value),
            image_alt: normalizeText(form.elements.namedItem("image_alt").value),
            service_items_json: JSON.stringify(items),
            booking_label: normalizeText(form.elements.namedItem("booking_label").value),
            booking_url: normalizeText(form.elements.namedItem("booking_url").value),
            pricing_label: normalizeText(form.elements.namedItem("pricing_label").value),
            pricing_url: normalizeText(form.elements.namedItem("pricing_url").value),
            sort_order: Number(sortOrder || 0),
            updated_at: new Date().toISOString(),
        };
    }

    /**
     * Data Validation logic to prevent "garbage" data
     */
    function validateSectionPayload(payload) {
        const errors = [];
        if (!payload.title || payload.title.length < 5) errors.push("Tiêu đề quá ngắn (tối thiểu 5 ký tự).");
        if (payload.title.length > 200) errors.push("Tiêu đề quá dài (tối đa 200 ký tự).");
        if (payload.description && payload.description.length > 1000) errors.push("Mô tả quá dài.");
        
        // Anti-script check
        if (/<script/i.test(payload.title) || /<script/i.test(payload.description)) {
            errors.push("Nội dung chứa ký tự không hợp lệ (script tag).");
        }
        
        return errors;
    }

    function validateServicePayload(payload) {
        const errors = [];
        if (!payload.label) errors.push("Nhãn dịch vụ không được để trống.");
        if (!payload.title || payload.title.length < 5) errors.push("Tiêu đề dịch vụ quá ngắn.");
        if (!payload.summary || payload.summary.length < 20) errors.push("Mô tả tóm tắt quá ngắn.");
        if (!payload.image) errors.push("Đường dẫn ảnh là bắt buộc.");
        
        // Image URL validation
        const isDriveUrl = payload.image.includes("googleusercontent.com") || payload.image.includes("drive.google.com");
        const isLocalUrl = payload.image.startsWith("images/") || payload.image.startsWith("public/assets/images/");
        if (!isDriveUrl && !isLocalUrl && !payload.image.startsWith("http")) {
            errors.push("Đường dẫn ảnh không hợp lệ (phải là link Drive hoặc link ảnh hợp lệ).");
        }

        // CTA URL validation
        if (payload.booking_url && !payload.booking_url.includes(".") && !payload.booking_url.includes("/")) {
            errors.push("Link đặt lịch không đúng định dạng.");
        }

        const items = JSON.parse(payload.service_items_json || "[]");
        if (!items.length) {
            errors.push("Phải có ít nhất một hạng mục trong Service items.");
        }

        // Anti-script check
        const rawValues = Object.values(payload).join(" ");
        if (/<script/i.test(rawValues)) {
            errors.push("Phát hiện mã độc (script tag) trong nội dung.");
        }

        return errors;
    }

    function rowItemsToTextarea(row) {
        let items = [];
        try {
            items = JSON.parse(row?.service_items_json || "[]");
        } catch (error) {
            items = [];
        }
        return Array.isArray(items) ? items.join("\n") : "";
    }

    function getHeroData() {
        const row = getSectionRow("hero");
        const fallback = getFallbackHero();
        return {
            eyebrow: normalizeText(row?.eyebrow || fallback.eyebrow),
            title: normalizeText(row?.title || fallback.title),
            description: normalizeText(row?.description || fallback.description),
            primary_cta_label: normalizeText(row?.primary_cta_label || fallback.primary_cta_label),
            primary_cta_url: normalizeText(row?.primary_cta_url || fallback.primary_cta_url),
            secondary_cta_label: normalizeText(row?.secondary_cta_label || fallback.secondary_cta_label),
            secondary_cta_url: normalizeText(row?.secondary_cta_url || fallback.secondary_cta_url),
        };
    }

    function getServicesSectionData() {
        const row = getSectionRow("services_section");
        const fallback = getFallbackServicesSection();
        return {
            eyebrow: normalizeText(row?.eyebrow || fallback.eyebrow),
            title: normalizeText(row?.title || fallback.title),
            description: normalizeText(row?.description || fallback.description),
        };
    }

    function getServicesData() {
        const fallbackServices = getFallbackServices();
        return fallbackServices.map((fallback, index) => {
            const row = getServiceRow(fallback.service_key);
            return {
                service_key: fallback.service_key,
                is_visible: normalizeText(row?.is_visible || fallback.is_visible || "1") !== "0",
                label: normalizeText(row?.label || fallback.label),
                title: normalizeText(row?.title || fallback.title),
                summary: normalizeText(row?.summary || fallback.summary),
                image: normalizeText(row?.image || fallback.image),
                image_alt: normalizeText(row?.image_alt || fallback.image_alt),
                service_items: row ? rowItemsToTextarea(row) : (Array.isArray(fallback.service_items) ? fallback.service_items.join("\n") : ""),
                booking_label: normalizeText(row?.booking_label || fallback.booking_label),
                booking_url: normalizeText(row?.booking_url || fallback.booking_url),
                pricing_label: normalizeText(row?.pricing_label || fallback.pricing_label),
                pricing_url: normalizeText(row?.pricing_url || fallback.pricing_url),
                sort_order: Number(row?.sort_order || fallback.sort_order || index + 1),
            };
        }).sort((left, right) => left.sort_order - right.sort_order);
    }

    function populateForms() {
        const hero = getHeroData();
        refs.heroForm.elements.namedItem("eyebrow").value = hero.eyebrow;
        refs.heroForm.elements.namedItem("title").value = hero.title;
        refs.heroForm.elements.namedItem("description").value = hero.description;
        refs.heroForm.elements.namedItem("primary_cta_label").value = hero.primary_cta_label;
        refs.heroForm.elements.namedItem("primary_cta_url").value = hero.primary_cta_url;
        refs.heroForm.elements.namedItem("secondary_cta_label").value = hero.secondary_cta_label;
        refs.heroForm.elements.namedItem("secondary_cta_url").value = hero.secondary_cta_url;

        const servicesSection = getServicesSectionData();
        refs.servicesSectionForm.elements.namedItem("eyebrow").value = servicesSection.eyebrow;
        refs.servicesSectionForm.elements.namedItem("title").value = servicesSection.title;
        refs.servicesSectionForm.elements.namedItem("description").value = servicesSection.description;
    }

    function createServiceItemRowHtml(value = "") {
        return `
            <div class="service-item-row">
                <input class="input service-item-input" value="${escapeHtml(value)}" placeholder="Ví dụ: Đóng gói đồ đạc cẩn thận...">
                <button type="button" class="btn-remove-item" title="Xóa mục này">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        `;
    }

    function renderServiceCards() {
        const services = getServicesData();
        refs.serviceCardStack.innerHTML = services.map((service) => {
            // Parse items for the dynamic list
            let items = [];
            try {
                items = JSON.parse(service.service_items_json || "[]");
                if (!items.length && service.service_items) {
                    items = service.service_items.split("\n").filter(Boolean);
                }
            } catch (e) {
                items = [];
            }

            return `
                <article class="service-content-card" data-service-key="${escapeHtml(service.service_key)}">
                    <div class="service-content-card__head">
                        <div>
                            <h3 style="margin:0 0 4px; font-size:18px;">${escapeHtml(service.label || service.service_key)}</h3>
                            <p style="margin:0; color:var(--slate-light); font-size:12px;">Khóa định danh: <code>${escapeHtml(service.service_key)}</code></p>
                        </div>
                        <div class="service-content-card__meta">
                            <a class="btn btn-outline" href="${escapeHtml(`${PUBLIC_PAGE_URL}#${service.service_key}`)}" target="_blank" rel="noopener">
                                <i class="fas fa-eye"></i> Xem bản Public
                            </a>
                        </div>
                    </div>
                    <div class="service-content-card__body">
                        <form class="service-card-form" id="service-card-form-${escapeHtml(service.service_key)}" data-service-form="${escapeHtml(service.service_key)}" data-sort-order="${escapeHtml(service.sort_order)}">
                            <div class="service-editor-layout">
                                
                                <!-- BÊN TRÁI: NỘI DUNG CHÍNH -->
                                <div class="service-editor-main">
                                    <div class="field">
                                        <label class="label">Tiêu đề chính dịch vụ</label>
                                        <input class="input" name="title" value="${escapeHtml(service.title)}" placeholder="Ví dụ: Đóng gói, vận chuyển và sắp xếp lại..." required>
                                    </div>
                                    <div class="field">
                                        <label class="label">Mô tả tóm tắt</label>
                                        <textarea class="textarea" name="summary" rows="4" placeholder="Mô tả ngắn gọn về quy trình hoặc đối tượng phù hợp..." required>${escapeHtml(service.summary)}</textarea>
                                    </div>
                                    <div class="field">
                                        <label class="label">Danh sách các dịch vụ đi kèm</label>
                                        <div class="service-items-list" data-items-container>
                                            ${items.map(it => createServiceItemRowHtml(it)).join("")}
                                            ${!items.length ? createServiceItemRowHtml("") : ""}
                                        </div>
                                        <button type="button" class="btn-add-item" data-action="add-item">
                                            <i class="fas fa-plus-circle"></i> Thêm hạng mục mới
                                        </button>
                                        <p class="service-image-hint" style="margin-top:10px;">Gợi ý: Mỗi hạng mục nên là một câu ngắn gọn mô tả lợi ích khách hàng nhận được.</p>
                                    </div>
                                </div>

                                <!-- BÊN PHẢI: MEDIA & CẤU HÌNH -->
                                <div class="service-editor-side">
                                    <div class="field">
                                        <label class="service-toggle" style="background:#fff; padding:10px; border-radius:10px; border:1px solid var(--line);">
                                            <input type="checkbox" name="is_visible" ${service.is_visible ? "checked" : ""}>
                                            <strong>Hiển thị công khai</strong>
                                        </label>
                                    </div>

                                    <div class="field">
                                        <div class="side-section-title"><i class="fas fa-tag"></i> Tên hiển thị nhanh</div>
                                        <input class="input" name="label" value="${escapeHtml(service.label)}" placeholder="Ví dụ: Chuyển Nhà Trọn Gói" required>
                                    </div>

                                    <div class="field">
                                        <div class="side-section-title"><i class="fas fa-image"></i> Hình ảnh dịch vụ</div>
                                        <input class="input" name="image" value="${escapeHtml(service.image)}" placeholder="Dán link Drive..." required>
                                        <div class="service-image-tools" style="margin-top:8px;">
                                            <label class="btn btn-primary btn-outline" style="width:100%; cursor:pointer;">
                                                <i class="fas fa-cloud-arrow-up"></i> Tải ảnh lên Drive
                                                <input type="file" name="image_upload" accept="image/*" style="display:none;">
                                            </label>
                                        </div>
                                        <div class="service-image-preview-compact" data-image-preview-wrap ${service.image ? "" : 'hidden'}>
                                            <img src="${escapeHtml(resolvePreviewImageUrl(service.image))}" alt="Preview" data-image-preview>
                                        </div>
                                    </div>

                                    <div class="field">
                                        <div class="side-section-title"><i class="fas fa-bullhorn"></i> Nút hành động</div>
                                        <div class="compact-grid">
                                            <div class="field">
                                                <label class="label" style="font-size:10px;">Nhãn nút Đặt lịch</label>
                                                <input class="input" name="booking_label" value="${escapeHtml(service.booking_label)}" required>
                                            </div>
                                            <div class="field">
                                                <label class="label" style="font-size:10px;">Link Đặt lịch</label>
                                                <input class="input" name="booking_url" value="${escapeHtml(service.booking_url)}" required>
                                            </div>
                                            <div class="field">
                                                <label class="label" style="font-size:10px;">Nhãn nút Bảng giá</label>
                                                <input class="input" name="pricing_label" value="${escapeHtml(service.pricing_label)}" required>
                                            </div>
                                            <div class="field">
                                                <label class="label" style="font-size:10px;">Link Bảng giá</label>
                                                <input class="input" name="pricing_url" value="${escapeHtml(service.pricing_url)}" required>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="field">
                                        <div class="side-section-title"><i class="fas fa-search"></i> SEO Ảnh</div>
                                        <input class="input" name="image_alt" value="${escapeHtml(service.image_alt)}" placeholder="Mô tả nội dung ảnh..." required>
                                    </div>
                                </div>
                            </div>

                            <div class="service-content-form-actions" style="margin-top:24px; border-top:1px solid var(--line); padding-top:20px;">
                                <button type="submit" class="btn btn-primary" style="min-width:200px;">
                                    <i class="fas fa-floppy-disk"></i> Lưu thay đổi nhóm này
                                </button>
                            </div>
                        </form>
                    </div>
                </article>
            `;
        }).join("");
    }

    async function exportPublicJson(successMessage) {
        const response = await fetch(EXPORT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                hero: getHeroData(),
                services_section: getServicesSectionData(),
                services: getServicesData().map((service) => ({
                    ...service,
                    is_visible: service.is_visible ? "1" : "0",
                    service_items: normalizeMultiline(service.service_items),
                })),
            }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || "Không export được JSON public.");
        }

        if (successMessage) {
            showRuntime("success", successMessage);
        }
        return payload;
    }

    async function uploadServiceImage(file, serviceKey) {
        if (!(file instanceof File)) {
            throw new Error("Không có file ảnh hợp lệ để tải lên.");
        }
        if (!String(file.type || "").toLowerCase().startsWith("image/")) {
            throw new Error("Chỉ chấp nhận file ảnh cho nội dung dịch vụ.");
        }

        const formData = new FormData();
        formData.append("file", file, file.name || `${serviceKey || "service"}-image`);
        formData.append("name", file.name || `${serviceKey || "service"}-image`);
        formData.append("folder_key", "12");

        const response = await fetch(SERVICE_IMAGE_UPLOAD_URL, {
            method: "POST",
            body: formData,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || "Không thể tải ảnh lên Google Drive.");
        }

        return {
            fileId: normalizeText(payload.fileId),
            url: normalizeText(payload.url),
            name: normalizeText(payload.name || file.name),
        };
    }

    async function finalizeSave(successMessage) {
        try {
            await exportPublicJson(successMessage);
        } catch (error) {
            showRuntime("error", `${successMessage} Tuy nhiên export JSON public thất bại: ${error.message}`);
        }
    }

    async function bootstrapIfNeeded() {
        const sectionRows = await window.adminApi.listMovingServicePageSections(PAGE_SLUG);
        const serviceRows = await window.adminApi.listMovingServicePageCards(PAGE_SLUG);
        if (sectionRows.length || serviceRows.length) {
            state.sectionRows = sectionRows;
            state.serviceRows = serviceRows;
            return false;
        }

        const now = new Date().toISOString();
        const hero = getFallbackHero();
        const servicesSection = getFallbackServicesSection();
        const fallbackServices = getFallbackServices();

        await window.adminApi.saveMovingServicePageSection({
            page_slug: PAGE_SLUG,
            section_key: "hero",
            ...hero,
            updated_at: now,
        });

        await window.adminApi.saveMovingServicePageSection({
            page_slug: PAGE_SLUG,
            section_key: "services_section",
            eyebrow: servicesSection.eyebrow,
            title: servicesSection.title,
            description: servicesSection.description,
            updated_at: now,
        });

        for (const service of fallbackServices) {
            await window.adminApi.saveMovingServicePageCard({
                page_slug: PAGE_SLUG,
                service_key: service.service_key,
                is_visible: service.is_visible,
                label: service.label,
                title: service.title,
                summary: service.summary,
                image: service.image,
                image_alt: service.image_alt,
                service_items_json: JSON.stringify(Array.isArray(service.service_items) ? service.service_items : []),
                booking_label: service.booking_label,
                booking_url: service.booking_url,
                pricing_label: service.pricing_label,
                pricing_url: service.pricing_url,
                sort_order: service.sort_order,
                updated_at: now,
            });
        }

        state.sectionRows = await window.adminApi.listMovingServicePageSections(PAGE_SLUG);
        state.serviceRows = await window.adminApi.listMovingServicePageCards(PAGE_SLUG);
        await exportPublicJson();
        return true;
    }

    async function refreshData(options = {}) {
        const allowBootstrap = options.allowBootstrap !== false;
        showRuntime("success", "Đang tải dữ liệu nội dung dịch vụ...");

        await window.adminApi.ensureMovingServiceContentTables();
        state.sectionRows = await window.adminApi.listMovingServicePageSections(PAGE_SLUG);
        state.serviceRows = await window.adminApi.listMovingServicePageCards(PAGE_SLUG);

        let bootstrapped = false;
        if (allowBootstrap && !state.sectionRows.length && !state.serviceRows.length) {
            bootstrapped = await bootstrapIfNeeded();
        }

        populateForms();
        renderServiceCards();

        if (bootstrapped) {
            showRuntime("success", "KRUD đang trống, đã bootstrap dữ liệu ban đầu từ HTML hiện tại và services-hub.json.");
        } else {
            hideRuntime();
        }
    }

    async function handleHeroSubmit(event) {
        event.preventDefault();
        const payload = buildSectionPayload(refs.heroForm, "hero");
        
        const errors = validateSectionPayload(payload);
        if (errors.length) {
            alert("Dữ liệu không hợp lệ:\n- " + errors.join("\n- "));
            return;
        }

        if (!confirm("Bạn có chắc chắn muốn cập nhật nội dung Hero này không?")) {
            return;
        }

        setButtonBusy(refs.saveHeroBtn, true, '<i class="fas fa-spinner fa-spin"></i>Đang lưu...');
        try {
            const existing = getSectionRow("hero");
            await window.adminApi.saveMovingServicePageSection(payload, existing);
            state.sectionRows = await window.adminApi.listMovingServicePageSections(PAGE_SLUG);
            populateForms();
            await finalizeSave("Đã lưu nội dung Hero.");
        } catch (error) {
            showRuntime("error", error.message || "Không thể lưu Hero.");
        } finally {
            setButtonBusy(refs.saveHeroBtn, false, "");
        }
    }

    async function handleServicesSectionSubmit(event) {
        event.preventDefault();
        const payload = buildSectionPayload(refs.servicesSectionForm, "services_section");

        const errors = validateSectionPayload(payload);
        if (errors.length) {
            alert("Dữ liệu không hợp lệ:\n- " + errors.join("\n- "));
            return;
        }

        if (!confirm("Cập nhật tiêu đề và mô tả cho khối dịch vụ?")) {
            return;
        }

        setButtonBusy(refs.saveServicesSectionBtn, true, '<i class="fas fa-spinner fa-spin"></i>Đang lưu...');
        try {
            const existing = getSectionRow("services_section");
            await window.adminApi.saveMovingServicePageSection(payload, existing);
            state.sectionRows = await window.adminApi.listMovingServicePageSections(PAGE_SLUG);
            populateForms();
            await finalizeSave("Đã lưu tiêu đề khối dịch vụ.");
        } catch (error) {
            showRuntime("error", error.message || "Không thể lưu tiêu đề khối dịch vụ.");
        } finally {
            setButtonBusy(refs.saveServicesSectionBtn, false, "");
        }
    }

    async function handleServiceCardSubmit(event) {
        event.preventDefault();
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        const button = form.querySelector('button[type="submit"]');
        const serviceKey = normalizeText(form.dataset.serviceForm);
        const sortOrder = Number(form.dataset.sortOrder || 0);

        const payload = buildServicePayload(form, serviceKey, sortOrder);
        const errors = validateServicePayload(payload);
        if (errors.length) {
            alert(`Nhóm ${serviceKey} có lỗi dữ liệu:\n- ` + errors.join("\n- "));
            return;
        }

        if (!confirm(`Xác nhận lưu thay đổi cho dịch vụ [${payload.label}]?`)) {
            return;
        }

        setButtonBusy(button, true, '<i class="fas fa-spinner fa-spin"></i>Đang lưu...');

        try {
            const existing = getServiceRow(serviceKey);
            await window.adminApi.saveMovingServicePageCard(payload, existing);
            state.serviceRows = await window.adminApi.listMovingServicePageCards(PAGE_SLUG);
            renderServiceCards();
            await finalizeSave(`Đã lưu nhóm dịch vụ ${serviceKey}.`);
        } catch (error) {
            showRuntime("error", error.message || "Không thể lưu nhóm dịch vụ.");
        } finally {
            setButtonBusy(button, false, "");
        }
    }

    async function handleServiceImageUpload(event) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.name !== "image_upload") {
            return;
        }

        const file = input.files && input.files[0];
        if (!file) {
            return;
        }

        const form = input.closest("form");
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        const serviceKey = normalizeText(form.dataset.serviceForm);
        const imageField = form.elements.namedItem("image");
        const previewWrap = form.querySelector("[data-image-preview-wrap]");
        const previewImage = form.querySelector("[data-image-preview]");
        const previewLink = form.querySelector("[data-image-preview-link]");
        const uploadButton = input.closest(".service-image-picker");

        try {
            setButtonBusy(uploadButton, true, '<i class="fas fa-spinner fa-spin"></i>Đang tải...');
            showRuntime("success", `Đang tải ảnh ${serviceKey} lên folder web...`);
            const uploaded = await uploadServiceImage(file, serviceKey);

            if (imageField instanceof HTMLInputElement) {
                imageField.value = uploaded.url;
            }
            if (previewWrap instanceof HTMLElement) {
                previewWrap.hidden = false;
            }
            if (previewImage instanceof HTMLImageElement) {
                previewImage.src = uploaded.url;
            }
            if (previewLink instanceof HTMLAnchorElement) {
                previewLink.href = uploaded.url;
            }

            showRuntime("success", `Đã tải ảnh lên folder web của Chuyển Dọn. Nhớ bấm "Lưu nhóm dịch vụ" để ghi link vào KRUD.`);
        } catch (error) {
            showRuntime("error", error.message || "Không thể tải ảnh lên Drive.");
        } finally {
            setButtonBusy(uploadButton, false, "");
            input.value = "";
        }
    }

    async function handleServiceItemActions(event) {
        const target = event.target.closest("button");
        if (!target) return;

        const actionAdd = target.dataset.action === "add-item";
        const actionRemove = target.classList.contains("btn-remove-item");

        if (actionAdd) {
            const container = target.closest(".field").querySelector("[data-items-container]");
            if (container) {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = createServiceItemRowHtml("");
                container.appendChild(tempDiv.firstElementChild);
            }
        }

        if (actionRemove) {
            const row = target.closest(".service-item-row");
            const container = row.closest("[data-items-container]");
            if (container.querySelectorAll(".service-item-row").length > 1) {
                row.remove();
            } else {
                row.querySelector("input").value = "";
            }
        }
    }

    function bindEvents() {
        refs.heroForm.addEventListener("submit", handleHeroSubmit);
        refs.servicesSectionForm.addEventListener("submit", handleServicesSectionSubmit);
        refs.serviceCardStack.addEventListener("submit", handleServiceCardSubmit);
        refs.serviceCardStack.addEventListener("change", handleServiceImageUpload);
        refs.serviceCardStack.addEventListener("click", handleServiceItemActions);
    }

    async function init() {
        try {
            bindEvents();
            await refreshData();
        } catch (error) {
            showRuntime("error", error.message || "Không thể tải màn quản lý nội dung dịch vụ.");
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})(window, document);
