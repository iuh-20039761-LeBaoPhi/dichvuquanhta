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
      ...core.getPricingCalculationItems(serviceData).map((item) => ({
        title: item.ten,
        value: `${formatCurrency(item.don_gia)}${item.don_vi ? ` / ${item.don_vi}` : ""}`,
        note: "Hạng mục dịch vụ tính theo số lượng thực tế.",
      })),
      ...core.getPricingFixedFeeEntries(serviceData),
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
      card.className = "group flex flex-col bg-white rounded-twelve overflow-hidden border border-slate-200 soft-shadow hover:-translate-y-1 transition-all duration-300";
      
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
              <span class="text-sm font-medium text-slate-500">/ ${item.don_vi}</span>
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
      "Cước cơ bản + Phí vượt km + Hạng mục hỗ trợ đi kèm + Phụ phí điều kiện thực tế";
    const factorCards = buildPricingFactorCards(serviceData);
    const pricingOverviewUrl = core.toProjectUrl("bang-gia-chuyen-don.html");
    const vehicleOptions = core.getPricingVehicleEntries(serviceData);
    const startingVehicle = vehicleOptions
      .filter((item) => Number(item?.gia_co_ban || 0) > 0)
      .sort((left, right) => Number(left.gia_co_ban || 0) - Number(right.gia_co_ban || 0))[0];

    container.innerHTML = `
      <div class="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-6 md:p-8 border border-primary/10 shadow-lg mb-12 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div class="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <div class="relative z-10 grid lg:grid-cols-[1.25fr_0.75fr] gap-6 items-start">
          <div>
            <span class="inline-flex bg-white text-primary font-bold text-xs uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-sm">
              Tóm tắt cách tính giá
            </span>
            <h3 class="text-2xl md:text-3xl font-bold text-primary mt-4">
              Dịch vụ này được tính theo một công thức chung
            </h3>
            <p class="text-slate-600 mt-3 leading-relaxed">
              ${formulaSummary}
            </p>
            ${
              startingVehicle
                ? `<div class="mt-5 rounded-xl bg-white/85 border border-white p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mốc giá khởi điểm</p>
                    <p class="text-lg font-bold text-slate-900 mt-1">${startingVehicle.ten_hien_thi}: ${formatCurrency(startingVehicle.gia_co_ban)}</p>
                    <p class="text-sm text-slate-500 mt-1">Đã gồm ${startingVehicle.km_co_ban}km đầu tiên, sau đó +${formatCurrency(startingVehicle.gia_moi_km_tiep)}/km.</p>
                    ${
                      startingVehicle.dung_tich_m3 > 0
                        ? ""
                        : '<p class="text-xs text-slate-500 mt-2">Số chuyến hiện tạm tính theo tải trọng vì chưa có dung tích xe chuẩn hóa.</p>'
                    }
                  </div>`
                : ""
            }
            <div class="mt-5 flex flex-wrap gap-2">
              ${basicParts.map((item) => `<span class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">${item}</span>`).join("")}
              ${extraParts.slice(0, 3).map((item) => `<span class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200">${item}</span>`).join("")}
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bạn cần xem sâu hơn?</p>
            <p class="text-sm text-slate-600 mt-2 leading-relaxed">
              Trang bảng giá chung giải thích đầy đủ 4 nhóm chi phí, các tình huống phát sinh và khi nào nên khảo sát trước.
            </p>
            <a
              class="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
              href="${pricingOverviewUrl}"
            >
              Xem cơ chế giá đầy đủ
            </a>
            ${
              factorCards.length
                ? `<div class="mt-5 border-t border-slate-100 pt-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Một vài yếu tố thường gặp</p>
                    <ul class="mt-3 space-y-3">
                      ${factorCards.slice(0, 3).map((item) => `
                        <li class="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                          <p class="text-sm font-semibold text-slate-800">${item.title}</p>
                          <p class="text-sm text-accent font-bold mt-1">${item.value}</p>
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
