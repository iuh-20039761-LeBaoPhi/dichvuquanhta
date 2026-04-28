document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("danhsachdichvucontainer");
  const otherServicesContainer = document.getElementById("other-services-links");
  if (!container) return;

  const pageDataUrl = "public/data/dich-vu-giao-hang-page.json";
  const legacyDataUrl = "public/data/dsdichvugiaohang.json";
  const bookingUrl = "dat-lich-giao-hang-nhanh.html";
  const pricingUrl = "tra-cuu-gia-giaohang.html";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderDetailRow(label, value) {
    return `
      <li>
        <strong>${escapeHtml(label)}:</strong>
        <span>${escapeHtml(value)}</span>
      </li>
    `;
  }

  function patchText(selector, value) {
    if (!normalizeText(value)) return;
    const node = document.querySelector(selector);
    if (node) {
      node.textContent = value;
    }
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isVisible(service) {
    return String(service?.is_visible ?? "1") !== "0";
  }

  function patchPageContent(payload) {
    if (!payload || typeof payload !== "object") return;
    patchText("[data-service-page-hero-badge]", payload?.hero?.badge_label);
    patchText("[data-service-page-hero-title]", payload?.hero?.title);
    patchText("[data-service-page-hero-description]", payload?.hero?.description);
    patchText("[data-service-page-section-title]", payload?.services_section?.title);
    patchText(
      "[data-service-page-section-description]",
      payload?.services_section?.description,
    );
  }

  async function loadPagePayload() {
    try {
      const response = await fetch(pageDataUrl);
      if (!response.ok) {
        throw new Error(`Không thể tải file JSON mới: ${response.status}`);
      }
      const payload = await response.json();
      if (!payload || typeof payload !== "object" || !Array.isArray(payload.services)) {
        throw new Error("Dữ liệu nội dung dịch vụ mới không hợp lệ.");
      }
      return {
        hero: payload.hero || null,
        services_section: payload.services_section || null,
        services: payload.services.filter(isVisible),
      };
    } catch (error) {
      const response = await fetch(legacyDataUrl);
      if (!response.ok) {
        throw new Error(`Không thể tải file JSON: ${response.status}`);
      }
      const services = await response.json();
      if (!Array.isArray(services)) {
        throw new Error("Dữ liệu danh sách dịch vụ không hợp lệ.");
      }
      return { hero: null, services_section: null, services };
    }
  }

  function createServiceCard(service, isFeatured) {
    const article = document.createElement("article");
    article.className = isFeatured
      ? "service-card service-card--featured"
      : "service-card";

    const outlineBtnStyle = isFeatured
      ? ' style="border-color: #fff; color: #fff; background: transparent"'
      : "";

    article.innerHTML = `
      <div class="service-card-head">
        <div class="service-card-icon">${escapeHtml(service.bieutuong)}</div>
        <h3>${escapeHtml(service.ten)}</h3>
      </div>
      <p class="service-card-slogan">"${escapeHtml(service.khauhieu)}"</p>
      <ul class="service-card-details">
        ${renderDetailRow("Phạm vi", service.phamvi)}
        ${renderDetailRow("Ưu tiên", service.uutien)}
        ${renderDetailRow("Phù hợp", service.phuhopcho)}
      </ul>
      <div class="service-card-actions">
        <a href="${bookingUrl}" class="service-action-btn service-action-primary">Đặt đơn ngay</a>
        <a href="${pricingUrl}" class="service-action-btn service-action-outline"${outlineBtnStyle}>Tính cước ngay</a>
      </div>
    `;

    return article;
  }

  const OTHER_SERVICE_CARD_META = Object.freeze({
    "svc-dich-vu-chuyen-don": {
      iconClass: "fas fa-box-open",
      backgroundColor: "#14532d",
    },
    "svc-thue-xe": {
      iconClass: "fas fa-car-side",
      backgroundColor: "#0ea5e9",
    },
    "svc-lai-xe-ho": {
      iconClass: "fas fa-id-card",
      backgroundColor: "#3b82f6",
    },
    "svc-cham-soc-nguoi-benh": {
      iconClass: "fas fa-user-nurse",
      backgroundColor: "#ef4444",
    },
    "svc-cham-soc-me-be": {
      iconClass: "fas fa-baby",
      backgroundColor: "#ec4899",
    },
    "svc-cham-soc-nguoi-gia": {
      iconClass: "fas fa-person-cane",
      backgroundColor: "#f97316",
    },
    "svc-lau-don-ve-sinh": {
      iconClass: "fas fa-broom",
      backgroundColor: "#06b6d4",
    },
    "svc-cham-soc-vuon": {
      iconClass: "fas fa-seedling",
      backgroundColor: "#22c55e",
    },
    "svc-giat-ui": {
      iconClass: "fas fa-shirt",
      backgroundColor: "#f43f5e",
    },
    "svc-tho-nha": {
      iconClass: "fas fa-hammer",
      backgroundColor: "#0d9488",
    },
    "svc-sua-xe": {
      iconClass: "fas fa-motorcycle",
      backgroundColor: "#8b5cf6",
    },
  });

  function renderOtherServices() {
    if (!otherServicesContainer) return;

    const serviceDirectory =
      window.GiaoHangNhanhLayout &&
      typeof window.GiaoHangNhanhLayout.getServiceDirectory === "function"
        ? window.GiaoHangNhanhLayout.getServiceDirectory()
        : [];

    const relatedServices = serviceDirectory.filter(
      (service) => service && service.key !== "svc-giao-hang-nhanh",
    );

    if (!relatedServices.length) {
      otherServicesContainer.innerHTML = "";
      return;
    }

    otherServicesContainer.innerHTML = relatedServices
      .map((service) => {
        const meta = OTHER_SERVICE_CARD_META[service?.key] || {};
        return `
          <a class="other-service-item" href="${escapeHtml(service.href || "#")}">
            <div class="other-service-icon" style="background-color: ${escapeHtml(meta.backgroundColor || "#ff7a00")}">
              <i class="${escapeHtml(meta.iconClass || "fas fa-box")}"></i>
            </div>
            <h3 class="other-service-name">${escapeHtml(service.label || "")}</h3>
          </a>
        `;
      })
      .join("");
  }

  try {
    const payload = await loadPagePayload();
    const services = Array.isArray(payload.services) ? payload.services : [];
    if (!services.length) {
      container.innerHTML =
        '<p class="text-danger">Chưa có dịch vụ nào đang hiển thị. Vui lòng thử lại sau.</p>';
      patchPageContent(payload);
      renderOtherServices();
      return;
    }

    patchPageContent(payload);
    const fragment = document.createDocumentFragment();
    services.forEach((service, index) => {
      fragment.appendChild(createServiceCard(service, index === 0));
    });

    container.replaceChildren(fragment);
  } catch (error) {
    console.error("Lỗi khi xử lý render dịch vụ:", error);
    container.innerHTML =
      '<p class="text-danger">Không thể tải danh sách dịch vụ. Vui lòng thử lại sau.</p>';
  }

  renderOtherServices();
});
