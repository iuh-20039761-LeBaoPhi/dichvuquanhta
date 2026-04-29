import core from "./core/app-core.js";

(function (window, document) {
  if (window.__fastGoServicesHubLoaded) return;
  window.__fastGoServicesHubLoaded = true;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function escapeHtml(text) {
    if (core && typeof core.escapeHtml === "function") {
      return core.escapeHtml(text);
    }
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function resolveProjectUrl(path) {
    if (!path) return "#";
    if (core && typeof core.toProjectUrl === "function") {
      return core.toProjectUrl(path);
    }
    return String(path);
  }

  function resolveAssetUrl(path) {
    if (!path) return "";
    if (core && typeof core.toAssetsUrl === "function") {
      return core.toAssetsUrl(path);
    }
    return `public/assets/${String(path)
      .replace(/^\.?\//, "")
      .replace(/^assets\//, "")}`;
  }

  function resolveConfigUrl() {
    const pagePath = String(window.location.pathname || "");
    const isServicePage =
      /\/dich-vu-chuyen-don\/dich-vu-chuyen-don\.html$/i.test(pagePath) ||
      /dich-vu-chuyen-don\.html$/i.test(pagePath);
    if (isServicePage) {
      if (core && typeof core.toAssetsUrl === "function") {
        return core.toAssetsUrl("js/data/dich-vu-chuyen-don-page.json");
      }
      return "public/assets/js/data/dich-vu-chuyen-don-page.json";
    }
    if (core && typeof core.toAssetsUrl === "function") {
      return core.toAssetsUrl("js/data/services-hub.json");
    }
    return "public/assets/js/data/services-hub.json";
  }

  function setNodeText(selector, value) {
    const node = document.querySelector(selector);
    if (node && value != null) {
      node.textContent = String(value);
    }
  }

  function setNodeLink(selector, label, href) {
    const node = document.querySelector(selector);
    if (!node) return;
    if (label != null) {
      node.textContent = String(label);
    }
    if (href) {
      node.setAttribute("href", resolveProjectUrl(href));
    }
  }

  function renderPageHero(config) {
    const hero = config?.hero || {};
    if (!document.querySelector("[data-service-page-hero]")) {
      return;
    }

    setNodeText("[data-service-page-hero-eyebrow]", hero?.eyebrow || "");
    setNodeText("[data-service-page-hero-title]", hero?.title || "");
    setNodeText(
      "[data-service-page-hero-description]",
      hero?.description || "",
    );
    setNodeLink(
      "[data-service-page-hero-primary-cta]",
      hero?.primary_cta_label || "Đặt lịch ngay",
      hero?.primary_cta_url || "dat-lich-chuyendon.html",
    );
    setNodeLink(
      "[data-service-page-hero-secondary-cta]",
      hero?.secondary_cta_label || "Xem bảng giá",
      hero?.secondary_cta_url || "bang-gia-chuyen-don.html",
    );
  }

  function renderSimpleList(items, className) {
    if (!Array.isArray(items) || !items.length) return "";
    return `
      <ul class="${className}">
        ${items.map((item) => `<li>${escapeHtml(item || "")}</li>`).join("")}
      </ul>
    `;
  }

  function renderService(service) {
    const cta = service?.cta || {};
    const includedItems = Array.isArray(service?.service_items)
      ? service.service_items.filter(Boolean)
      : [];

    return `
      <article class="service-detail-panel" id="${escapeHtml(service?.id || "")}">
        <div class="service-detail-hero">
          <figure class="service-detail-media">
            <img
              src="${escapeHtml(resolveAssetUrl(service?.image || ""))}"
              alt="${escapeHtml(service?.image_alt || service?.label || "")}"
            />
          </figure>
          <div class="service-detail-copy">
            <span class="service-detail-label">${escapeHtml(service?.label || "")}</span>
            <h3>${escapeHtml(service?.title || "")}</h3>
            <p>${escapeHtml(service?.summary || "")}</p>
            ${
              includedItems.length
                ? `
                  <section class="service-detail-includes">
                    <h4>Bao gồm</h4>
                    ${renderSimpleList(includedItems, "service-bullet-list")}
                  </section>
                `
                : ""
            }
            <div class="service-detail-actions">
              <a class="nut-hanh-dong nut-dat-lich" href="${escapeHtml(
                resolveProjectUrl(cta?.booking_url || "#"),
              )}">
            ${escapeHtml(cta?.booking_label || "Đặt lịch")}
          </a>
              <a class="nut-hanh-dong nut-vien" href="${escapeHtml(
                resolveProjectUrl(cta?.pricing_url || "#"),
              )}">
                ${escapeHtml(cta?.pricing_label || "Xem bảng giá")}
              </a>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  const OTHER_SERVICE_CARD_META = Object.freeze({
    "svc-giao-hang-nhanh": {
      iconClass: "fas fa-truck-fast",
      backgroundColor: "#6366f1",
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
    const container =
      document.getElementById("other-services-links") ||
      document.querySelector(".other-services-grid");
    if (!container) return;

    const serviceDirectory =
      window.FastGoLayout &&
      typeof window.FastGoLayout.getServiceDirectory === "function"
        ? window.FastGoLayout.getServiceDirectory()
        : [];

    const relatedServices = serviceDirectory.filter(
      (service) => service && service.key !== "svc-dich-vu-chuyen-don",
    );

    if (!relatedServices.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = relatedServices
      .map((service) => {
        const meta = OTHER_SERVICE_CARD_META[service?.key] || {};
        return `
          <a class="other-service-item" href="${escapeHtml(service?.href || "#")}">
            <div class="other-service-icon" style="background-color: ${escapeHtml(meta.backgroundColor || "#14532d")}">
              <i class="${escapeHtml(meta.iconClass || "fas fa-box")}"></i>
            </div>
            <h3 class="other-service-name">${escapeHtml(service?.label || "")}</h3>
          </a>
        `;
      })
      .join("");
  }

  function scrollToHashTarget() {
    const hash = String(window.location.hash || "")
      .replace(/^#/, "")
      .trim();
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }

  function renderServiceHub(root, config) {
    const section = config?.services_section || config?.section || {};
    const services = Array.isArray(config?.services)
      ? config.services.filter(
          (service) => String(service?.is_visible ?? "1") !== "0",
        )
      : [];

    if (!services.length) {
      root.innerHTML =
        '<div class="service-stack-error">Không có dữ liệu dịch vụ để hiển thị.</div>';
      return;
    }

    root.innerHTML = `
      <div class="tieu-de-khoi">
        <span class="the-thong-tin-nhan">${escapeHtml(section?.eyebrow || "")}</span>
        <h2>${escapeHtml(section?.title || "")}</h2>
        <p>${escapeHtml(section?.description || "")}</p>
      </div>
      <div class="service-stack">
        ${services.map(renderService).join("")}
      </div>
    `;

    scrollToHashTarget();
  }

  function initServiceHub() {
    const root = document.querySelector("[data-service-hub-root]");
    renderOtherServices();
    if (!root || typeof window.fetch !== "function") return;

    fetch(resolveConfigUrl())
      .then((response) => {
        if (!response.ok) {
          throw new Error("Cannot load services hub data");
        }
        return response.json();
      })
      .then((config) => {
        renderPageHero(config);
        renderServiceHub(root, config);
      })
      .catch((error) => {
        console.warn("Cannot load services hub data:", error);
        root.innerHTML =
          '<div class="service-stack-error">Không tải được nội dung dịch vụ. Vui lòng thử lại.</div>';
      });

    window.addEventListener("hashchange", scrollToHashTarget);
  }

  onReady(initServiceHub);
})(window, document);
