(function (window, document) {
  if (window.__fastGoPricingInitDone) return;
  window.__fastGoPricingInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;

  function formatCurrency(value) {
    return core.formatCurrencyVnd(value);
  }

  function buildPricingFactorCards(serviceData) {
    return [
      ...core.getPricingCheckboxItems(serviceData).map((item) => ({
        title: item.ten,
        value: formatCurrency(item.don_gia),
        note: "Chỉ cộng khi bạn chọn hạng mục này.",
      })),
      ...core.getPricingMultiplierEntries(serviceData),
    ];
  }

  function getServiceType() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("chuyen-nha")) return "chuyen_nha";
    if (path.includes("chuyen-van-phong")) return "chuyen_van_phong";
    if (path.includes("chuyen-kho-bai")) return "chuyen_kho_bai";
    return null;
  }

  async function loadPricing() {
    const serviceType = getServiceType();
    if (!serviceType) return;

    const grid = document.getElementById("pricing-grid");
    const formulaContainer = document.getElementById("pricing-formula-container");
    if (!grid) return;

    try {
      const resp = await fetch(core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json"));
      if (!resp.ok) throw new Error("Thất bại khi tải file JSON");
      const data = await resp.json();

      const serviceData = data.find((s) => s.id === serviceType);
      if (!serviceData) return;

      renderPricing(grid, serviceData);

      if (formulaContainer) {
        renderFormula(formulaContainer, serviceData);
      }
    } catch (err) {
      console.error("Lỗi load bảng giá:", err);
    }
  }

  function renderPricing(container, data) {
    container.innerHTML = "";
    core.getPricingDisplayItems(data).forEach((item) => {
      const card = document.createElement("article");
      card.className = "group flex flex-col bg-white rounded-twelve overflow-hidden border border-slate-200 moving-soft-shadow hover:-translate-y-1 transition-all duration-300";
      
      const iconPath = item.icon_svg || "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
      const imageSrc = core.toPublicUrl(item.hinh_anh || "assets/images/chuyendon-tron-goi.png");

      card.innerHTML = `
        <div class="relative h-56 w-full overflow-hidden">
          <img alt="${item.ten}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${imageSrc}">
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div class="absolute bottom-4 left-4 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="${iconPath}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path>
            </svg>
          </div>
        </div>
        <div class="p-6">
          <h3 class="text-slate-900 text-xl font-bold mb-2">${item.ten}</h3>
          <p class="text-slate-600 text-sm leading-relaxed">${item.ghi_chu}</p>
          <div class="mt-4 pt-4 border-t border-slate-100">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Giá tham khảo</p>
            <p class="text-accent font-bold text-lg mt-1">
              ${item.khoang_gia}
              ${item.don_vi ? `<span class="text-sm font-medium text-slate-500">/ ${item.don_vi}</span>` : ""}
            </p>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderFormula(container, serviceData) {
    const transparentInfo = serviceData.thong_tin_minh_bach || {};
    const basicParts = Array.isArray(transparentInfo.phan_co_ban)
      ? transparentInfo.phan_co_ban
      : [];
    const extraParts = Array.isArray(transparentInfo.phan_phat_sinh)
      ? transparentInfo.phan_phat_sinh
      : [];
    const formulaSummary =
      transparentInfo.tom_tat_tong_chi_phi ||
      "Tổng tiền = max(Phí tối thiểu, Số km di chuyển x Giá mỗi km theo loại xe x Hệ số đường dài) + Các phụ phí nếu có";
    const factorCards = buildPricingFactorCards(serviceData);
    const pricingOverviewUrl = core.toProjectUrl("bang-gia-chuyen-don.html");
    const vehicleOptions = core.getPricingVehicleEntries(serviceData);
    const startingVehicle = vehicleOptions
      .filter((item) => Number(item?.gia_moi_km || 0) > 0)
      .sort((left, right) => Number(left.gia_moi_km || 0) - Number(right.gia_moi_km || 0))[0];
    const summaryParts = [
      ...basicParts.map((item) => ({ label: item, tone: "primary" })),
      ...extraParts.slice(0, 2).map((item) => ({ label: item, tone: "neutral" })),
    ];

    container.innerHTML = `
      <div class="pricing-formula-summary">
        <div class="pricing-formula-summary__glow pricing-formula-summary__glow--top"></div>
        <div class="pricing-formula-summary__glow pricing-formula-summary__glow--bottom"></div>

        <div class="pricing-formula-summary__layout">
          <div class="pricing-formula-summary__main">
            <span class="pricing-formula-summary__badge">
              Tóm tắt cách tính giá
            </span>
            <h3 class="pricing-formula-summary__title">
              Dịch vụ này được tính theo km, phí tối thiểu và phụ phí phát sinh
            </h3>
            <p class="pricing-formula-summary__description">
              ${formulaSummary}
            </p>
            ${
              startingVehicle
                ? `<div class="pricing-formula-summary__starting">
                    <p class="pricing-formula-summary__label">Đơn giá xe thấp nhất</p>
                    <div class="pricing-formula-summary__starting-row">
                      <p class="pricing-formula-summary__starting-name">${startingVehicle.ten_hien_thi}</p>
                      <p class="pricing-formula-summary__starting-price">${formatCurrency(startingVehicle.gia_moi_km)}</p>
                    </div>
                    <p class="pricing-formula-summary__starting-note">Cước xe được tính theo số km, tự giảm giá khi vượt 20km và luôn so với mức phí tối thiểu của loại xe đã chọn.</p>
                  </div>`
                : ""
            }
            ${
              summaryParts.length
                ? `<div class="pricing-formula-summary__parts">
                    ${summaryParts
                      .map(
                        (item) => `
                          <span class="pricing-formula-summary__part pricing-formula-summary__part--${item.tone}">
                            ${item.label}
                          </span>
                        `
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>

          <div class="pricing-formula-summary__aside">
            <p class="pricing-formula-summary__label">Bạn cần xem sâu hơn?</p>
            <p class="pricing-formula-summary__aside-copy">
              Trang bảng giá chung giải thích cách tính theo km, các nhóm phụ phí và những tình huống thường làm chi phí thay đổi.
            </p>
            <a
              class="pricing-formula-summary__cta"
              href="${pricingOverviewUrl}"
            >
              Xem cách tính chi tiết
            </a>
            ${
              factorCards.length
                ? `<div class="pricing-formula-summary__factors-block">
                    <p class="pricing-formula-summary__label">Một vài yếu tố thường gặp</p>
                    <ul class="pricing-formula-summary__factors">
                      ${factorCards.slice(0, 3).map((item) => `
                        <li class="pricing-formula-summary__factor">
                          <div class="pricing-formula-summary__factor-row">
                            <p class="pricing-formula-summary__factor-title">${item.title}</p>
                            <p class="pricing-formula-summary__factor-value">${item.value}</p>
                          </div>
                          ${
                            item.note
                              ? `<p class="pricing-formula-summary__factor-note">${item.note}</p>`
                              : ""
                          }
                        </li>
                      `).join("")}
                    </ul>
                  </div>`
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPricing);
  } else {
    loadPricing();
  }
})(window, document);
