import core from "./core/app-core.js";

(function (window, document) {
  if (window.__fastGoPricingInitDone) return;
  window.__fastGoPricingInitDone = true;
  if (!core) return;

  function formatCurrency(value) {
    return core.formatCurrencyVnd(value);
  }

  function getVehicleBandRate(vehicle, fromKm) {
    return (
      (Array.isArray(vehicle?.bang_gia_km) ? vehicle.bang_gia_km : []).find(
        (band) => Number(band?.tu_km || 0) === fromKm,
      ) || null
    );
  }

  function formatVehicleBandValue(vehicle, fromKm) {
    const band = getVehicleBandRate(vehicle, fromKm);
    return band?.don_gia ? `${formatCurrency(band.don_gia)}/km` : "Cần xác nhận";
  }

  function formatVehicleOpeningValue(vehicle) {
    const openingFare = Number(vehicle?.gia_mo_cua || 0);
    const openingKm = Number(vehicle?.pham_vi_mo_cua_km || 0);
    if (!openingFare || !openingKm) return "Cần xác nhận";
    return `${formatCurrency(openingFare)}/${openingKm}km đầu`;
  }

  function buildPricingFactorCards(serviceData) {
    const surveyItem = core
      .getPricingCheckboxItems(serviceData)
      .find((item) => String(item?.slug || "").trim() === "khao_sat_truoc");

    return [
      ...(surveyItem
        ? [
            {
              title: surveyItem.ten,
              value: formatCurrency(surveyItem.don_gia),
              note: "Áp dụng khi bạn yêu cầu khảo sát trước.",
            },
          ]
        : []),
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
      const jsonUrl = core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json");
      const resp = await fetch(`${jsonUrl}?v=${new Date().getTime()}`);
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
    const vehicles = core.getPricingVehicleEntries(data);
    const summaryItem = core
      .getPricingDisplayItems(data)
      .find((item) => String(item?.slug || "").trim() === "cuoc_xe");

    if (!vehicles.length) {
      container.innerHTML =
        '<div class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Chưa có dữ liệu bảng xe để hiển thị.</div>';
      return;
    }

    container.innerHTML = `
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Bảng xe tham khảo
            </span>
            <h3 class="mt-3 text-2xl font-bold text-slate-900">Giá mở cửa 5km đầu và dải km phát sinh</h3>
            <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              ${core.escapeHtml(summaryItem?.ghi_chu || "Bảng giá công khai hiển thị theo giá mở cửa 5km đầu và đơn giá phát sinh theo từng dải km để bạn đối chiếu nhanh trước khi lên phương án cụ thể.")}
            </p>
          </div>
          <div class="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Giá mở cửa đã gồm 5km đầu
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
            <thead>
              <tr>
                <th class="border-b border-slate-200 bg-slate-900 px-4 py-4 text-left text-sm font-semibold text-white">Loại xe</th>
                <th class="border-b border-slate-200 bg-slate-900 px-4 py-4 text-left text-sm font-semibold text-white">Giá mở cửa (5km đầu)</th>
                <th class="border-b border-slate-200 bg-slate-900 px-4 py-4 text-left text-sm font-semibold text-white">Km 6-15</th>
                <th class="border-b border-slate-200 bg-slate-900 px-4 py-4 text-left text-sm font-semibold text-white">Km 16-30</th>
                <th class="border-b border-slate-200 bg-slate-900 px-4 py-4 text-left text-sm font-semibold text-white">Km 31+</th>
              </tr>
            </thead>
            <tbody>
              ${vehicles
                .map(
                  (vehicle, index) => `
                    <tr class="${index % 2 === 0 ? "bg-slate-50" : "bg-white"}">
                      <td class="border-b border-slate-200 px-4 py-4 text-sm font-semibold text-slate-900">${core.escapeHtml(vehicle.ten_hien_thi || "")}</td>
                      <td class="border-b border-slate-200 px-4 py-4 text-sm text-slate-700">${core.escapeHtml(formatVehicleOpeningValue(vehicle))}</td>
                      <td class="border-b border-slate-200 px-4 py-4 text-sm text-slate-700">${core.escapeHtml(formatVehicleBandValue(vehicle, 6))}</td>
                      <td class="border-b border-slate-200 px-4 py-4 text-sm text-slate-700">${core.escapeHtml(formatVehicleBandValue(vehicle, 16))}</td>
                      <td class="border-b border-slate-200 px-4 py-4 text-sm text-slate-700">${core.escapeHtml(formatVehicleBandValue(vehicle, 31))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderFormula(container, serviceData) {
    const formulaSummary = core.getPricingSummaryText(serviceData);
    const factorCards = buildPricingFactorCards(serviceData);
    const pricingOverviewUrl = core.toProjectUrl("bang-gia-chuyen-don.html");
    const vehicleOptions = core.getPricingVehicleEntries(serviceData);
    const startingVehicle = vehicleOptions
      .filter((item) => Number(item?.gia_mo_cua || 0) > 0)
      .sort((left, right) => Number(left.gia_mo_cua || 0) - Number(right.gia_mo_cua || 0))[0];
    const summaryParts = core.getPricingSummaryParts(serviceData).map(
      (item, index) => ({
        label: item,
        tone: index < 2 ? "primary" : "neutral",
      }),
    );

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
              Dịch vụ này được báo theo giá mở cửa và dải km phát sinh
            </h3>
            <p class="pricing-formula-summary__description">
              ${formulaSummary}
            </p>
            ${
              startingVehicle
                ? `<div class="pricing-formula-summary__starting">
                    <p class="pricing-formula-summary__label">Giá mở cửa thấp nhất</p>
                    <div class="pricing-formula-summary__starting-row">
                      <p class="pricing-formula-summary__starting-name">${startingVehicle.ten_hien_thi}</p>
                      <p class="pricing-formula-summary__starting-price">${formatVehicleOpeningValue(startingVehicle)}</p>
                    </div>
                    <p class="pricing-formula-summary__starting-note">Mỗi loại xe có giá mở cửa cho 5km đầu, sau đó cộng thêm theo từng dải km 6-15, 16-30 và từ km 31 trở đi.</p>
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
              Trang bảng giá chung giải thích cách dịch vụ chuyển dọn đang chia xe theo giá mở cửa 5km đầu, dải km phát sinh và các phụ phí đi kèm.
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
                    <p class="pricing-formula-summary__label">Các khoản còn cộng vào giá</p>
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
