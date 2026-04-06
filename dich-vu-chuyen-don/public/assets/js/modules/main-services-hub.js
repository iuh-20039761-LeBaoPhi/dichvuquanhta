(function (window, document) {
  if (window.__fastGoServicesHubLoaded) return;
  window.__fastGoServicesHubLoaded = true;

  const core = window.FastGoCore || {};

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
    if (core && typeof core.toAssetsUrl === "function") {
      return core.toAssetsUrl("js/data/services-hub.json");
    }
    return "public/assets/js/data/services-hub.json";
  }

  function renderSimpleList(items, className) {
    if (!Array.isArray(items) || !items.length) return "";
    return `
      <ul class="${className}">
        ${items.map((item) => `<li>${escapeHtml(item || "")}</li>`).join("")}
      </ul>
    `;
  }

  function renderFacts(facts) {
    if (!Array.isArray(facts) || !facts.length) return "";
    return `
      <ul class="service-fact-list">
        ${facts
          .map(
            (item) => `
              <li>
                <strong>${escapeHtml(item?.label || "")}:</strong>
                ${escapeHtml(item?.value || "")}
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  function renderDecisionCards(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return items
      .map(
        (item) => `
          <h4>${escapeHtml(item?.title || "")}</h4>
          <p>${escapeHtml(item?.body || "")}</p>
        `,
      )
      .join("");
  }

  function renderScopeCards(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return `
      <div class="service-scope-grid">
        ${items
          .map(
            (item) => `
              <article class="service-scope-item">
                <strong>${escapeHtml(item?.title || "")}</strong>
                <p>${escapeHtml(item?.description || "")}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderTextBlocks(service) {
    const benefits = Array.isArray(service?.benefits) ? service.benefits : [];
    const serviceItems = Array.isArray(service?.service_items)
      ? service.service_items
      : [];

    if (!benefits.length && !serviceItems.length) return "";

    return `
      <div class="service-text-grid">
        ${
          benefits.length
            ? `
              <section class="service-text-card">
                <h4>${escapeHtml(service?.benefits_title || "Lợi ích nổi bật")}</h4>
                ${renderSimpleList(benefits, "service-bullet-list")}
              </section>
            `
            : ""
        }
        ${
          serviceItems.length
            ? `
              <section class="service-text-card">
                <h4>${escapeHtml(
                  service?.service_items_title || "Hạng mục có thể triển khai",
                )}</h4>
                ${renderSimpleList(serviceItems, "service-bullet-list")}
              </section>
            `
            : ""
        }
      </div>
    `;
  }

  function renderService(service) {
    const cta = service?.cta || {};

    return `
      <article class="service-detail-panel" id="${escapeHtml(service?.id || "")}">
        <div class="service-detail-hero">
          <div class="service-detail-copy">
            <span class="service-detail-label">${escapeHtml(service?.label || "")}</span>
            <h3>${escapeHtml(service?.title || "")}</h3>
            <p>${escapeHtml(service?.summary || "")}</p>
            ${renderFacts(service?.facts)}
          </div>
          <figure class="service-detail-media">
            <img
              src="${escapeHtml(resolveAssetUrl(service?.image || ""))}"
              alt="${escapeHtml(service?.image_alt || service?.label || "")}"
            />
            <figcaption>${escapeHtml(service?.image_caption || "")}</figcaption>
          </figure>
        </div>

        <div class="service-detail-grid">
          <section class="service-detail-card">
            <h4>${escapeHtml(service?.scope_title || "Phạm vi hỗ trợ chính")}</h4>
            ${renderSimpleList(service?.scope, "service-check-list")}
          </section>
          <section class="service-detail-card service-detail-card--accent">
            ${renderDecisionCards(service?.decision_cards)}
          </section>
        </div>

        <section class="service-scope">
          <h4>${escapeHtml(service?.items_title || "Các hạng mục thường dùng")}</h4>
          ${renderScopeCards(service?.items)}
        </section>

        ${renderTextBlocks(service)}

        <div class="service-detail-actions">
          <a class="nut-hanh-dong nut-sang" href="${escapeHtml(
            resolveProjectUrl(cta?.survey_url || "#"),
          )}">
            ${escapeHtml(cta?.survey_label || "Khảo sát")}
          </a>
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
      </article>
    `;
  }

  function scrollToHashTarget() {
    const hash = String(window.location.hash || "").replace(/^#/, "").trim();
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }

  function renderServiceHub(root, config) {
    const section = config?.section || {};
    const services = Array.isArray(config?.services) ? config.services : [];

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
    if (!root || typeof window.fetch !== "function") return;

    fetch(resolveConfigUrl())
      .then((response) => {
        if (!response.ok) {
          throw new Error("Cannot load services hub data");
        }
        return response.json();
      })
      .then((config) => {
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
