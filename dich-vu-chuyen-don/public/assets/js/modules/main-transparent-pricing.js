import core from "./core/app-core.js";

(function (window, document) {
  if (window.__fastGoTransparentPricingLoaded) return;
  window.__fastGoTransparentPricingLoaded = true;
  if (!core.toPublicUrl || !core.escapeHtml) return;

  const commonFormulaGroups = [
    {
      id: "cuoc-xe",
      ten: "Cước xe theo km",
      mo_ta: "Mức phí cốt lõi của tất cả dịch vụ, đi từ giá mở cửa 5km đầu theo loại xe rồi cộng tiếp theo các dải km phát sinh.",
    },
    {
      id: "ho-tro",
      ten: "Hạng mục hỗ trợ theo yêu cầu",
      mo_ta: "Các hạng mục như đóng gói, tháo lắp, pallet, xe nâng hoặc bảo vệ thiết bị được ghi nhận để điều phối triển khai, không tự cộng phí.",
    },
    {
      id: "thoi-diem",
      ten: "Phí ngoài giờ / Thời tiết",
      mo_ta: "Phụ phí ấn định (cộng thêm) nếu bạn yêu cầu phục vụ vào ban đêm, cuối tuần hoặc khi trời mưa.",
    },
  ];

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function formatCurrency(amount) {
    return core.formatCurrencyVnd(amount);
  }

  function getVehicleBand(vehicle, fromKm) {
    return (
      (Array.isArray(vehicle?.bang_gia_km) ? vehicle.bang_gia_km : []).find(
        (band) => Number(band?.tu_km || 0) === fromKm,
      ) || null
    );
  }

  function formatVehicleOpening(vehicle) {
    const openingFare = Number(vehicle?.gia_mo_cua || 0);
    const openingKm = Number(vehicle?.pham_vi_mo_cua_km || 0);
    if (!openingFare || !openingKm) return "Cần xác nhận";
    return `${formatCurrency(openingFare)}/${openingKm}km đầu`;
  }

  function formatVehicleBand(vehicle, fromKm) {
    const band = getVehicleBand(vehicle, fromKm);
    return band?.don_gia ? `${formatCurrency(band.don_gia)}/km` : "Cần xác nhận";
  }

  function loadTransparentPricingData() {
    return fetch(core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json"))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Cannot load pricing reference data: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error("Cannot load pricing reference data:", error);
        return [];
      });
  }

  function getTransparentInfo(item) {
    return item && item.thong_tin_minh_bach ? item.thong_tin_minh_bach : {};
  }

  function getStartingPrice(item) {
    const vehicles = core.getPricingVehicleEntries(item);
    const firstOpening = vehicles
      .filter((entry) => Number(entry?.gia_mo_cua || 0) > 0)
      .sort((left, right) => Number(left.gia_mo_cua || 0) - Number(right.gia_mo_cua || 0))[0];

    if (!firstOpening) return "";
    return `Từ ${formatVehicleOpening(firstOpening)}`;
  }

  function collectSurchargeItems(serviceData) {
    return [
      ...core.getPricingMultiplierEntries(serviceData).map((item) => ({
        label: item.title,
        amount: item.value,
      })),
    ];
  }

  function getSharedSurveyItem(data) {
    if (!Array.isArray(data)) return null;
    for (const service of data) {
      const match = core
        .getPricingCheckboxItems(service)
        .find((item) => String(item?.slug || "").trim() === "khao_sat_truoc");
      if (match) return match;
    }
    return null;
  }

  function renderInlineList(items, fallback) {
    if (!Array.isArray(items) || !items.length) {
      return core.escapeHtml(fallback || "Cần khảo sát để chốt");
    }

    const content = items
      .map((item) => core.escapeHtml(String(item || "").trim()))
      .filter(Boolean)
      .join(", ");

    return content || core.escapeHtml(fallback || "Cần khảo sát để chốt");
  }

  function buildFormulaDetailPanel(data, groupId) {
    const cards = data.map((item) => {
      let details = [];

      if (groupId === "cuoc-xe") {
        const vehicles = core.getPricingVehicleEntries(item);
        details = vehicles.map(v => `
          <div class="dong-gia-so-sanh">
            <span class="ten-phi">${core.escapeHtml(v.ten_hien_thi)}</span>
            <span class="muc-tien"><strong>${core.escapeHtml(formatVehicleOpening(v))}</strong></span>
          </div>
          <div class="dong-gia-so-sanh">
            <span class="ten-phi">Km 6-15</span>
            <span class="muc-tien"><strong>${core.escapeHtml(formatVehicleBand(v, 6))}</strong></span>
          </div>
          <div class="dong-gia-so-sanh">
            <span class="ten-phi">Km 16-30</span>
            <span class="muc-tien"><strong>${core.escapeHtml(formatVehicleBand(v, 16))}</strong></span>
          </div>
          <div class="dong-gia-so-sanh">
            <span class="ten-phi">Km 31+</span>
            <span class="muc-tien"><strong>${core.escapeHtml(formatVehicleBand(v, 31))}</strong></span>
          </div>
        `);
      }

      if (groupId === "ho-tro") {
        const checkboxItems = core.getPricingCheckboxItems(item);
        const supportItems = checkboxItems.filter(
          (entry) => String(entry?.slug || "").trim() !== "khao_sat_truoc",
        );
        details = supportItems.length
          ? supportItems.map(entry => `
                <div class="dong-gia-so-sanh">
                  <span class="ten-phi">${core.escapeHtml(entry.ten)}</span>
                </div>
              `)
          : ['<div class="dong-gia-so-sanh"><span class="mo-ta-phu">Không có hạng mục hỗ trợ mở rộng</span></div>'];
      }

      if (groupId === "thoi-diem") {
        const multiplierEntries = core.getPricingMultiplierEntries(item);
        details = multiplierEntries.length
          ? multiplierEntries.map(entry => `
              <div class="dong-gia-so-sanh">
                <span class="ten-phi">${core.escapeHtml(entry.title)}</span>
                <span class="muc-tien"><strong>+${core.escapeHtml(entry.value || "Cần xác nhận")}</strong></span>
              </div>
            `)
          : ['<div class="dong-gia-so-sanh"><span class="mo-ta-phu">Không có phụ phí thời điểm</span></div>'];
      }

      return `
        <div class="the-so-sanh-gia">
          <div class="the-so-sanh-gia__dau">${core.escapeHtml(item.ten_dich_vu || "")}</div>
          <div class="the-so-sanh-gia__noi-dung">
            ${details.join("")}
          </div>
        </div>
      `;
    }).join("");

    let commonNote = "";
    if (groupId === "cuoc-xe") commonNote = "Bảng xe công khai đang hiển thị theo giá mở cửa 5km đầu và đơn giá phát sinh ở các dải km 6-15, 16-30 và từ km 31 trở đi để bạn đối chiếu nhanh theo từng loại xe.";
    if (groupId === "ho-tro") commonNote = "Khảo sát trước vẫn được giữ như một hạng mục riêng theo bảng giá. Các hạng mục hỗ trợ còn lại chỉ dùng để điều phối đội triển khai và tài xế biết việc cần làm thêm.";
    if (groupId === "thoi-diem") commonNote = "Hệ số và phụ phí thời điểm sẽ được linh động cộng dồn một lần vào tổng hóa đơn cuối cùng.";

    return `
      <style>
        .luoi-so-sanh-gia { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-top: 1rem; }
        .the-so-sanh-gia { border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; }
        .the-so-sanh-gia__dau { background: #f8fafc; padding: 1rem; font-weight: 600; border-bottom: 1px solid #e2e8f0; text-align: center; color: #0f172a; font-size: 1.05rem; }
        .the-so-sanh-gia__noi-dung { padding: 0.5rem 1.25rem; font-size: 0.95rem; line-height: 1.8; color: #334155; }
        
        .dong-gia-so-sanh { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px dashed #e2e8f0; }
        .dong-gia-so-sanh:last-child { border-bottom: none; }
        .ten-phi { color: #475569; padding-right: 1rem; }
        .muc-tien { white-space: nowrap; color: #0f172a; text-align: right; }
        .mo-ta-phu { color: #94a3b8; font-style: italic; width: 100%; text-align: center; }

        .ghi-chu-chung-gia { margin-top: 1.25rem; background: #fefce8; color: #854d0e; font-style: italic; text-align: center; border: 1px solid #fef08a; border-radius: 8px; padding: 12px 16px; font-size: 0.95rem; }
        @media (max-width: 768px) {
          .luoi-so-sanh-gia { grid-template-columns: 1fr; gap: 1rem; }
        }
      </style>
      <div class="bang-so-sanh-cong-thuc-wrapper" style="border: none; padding: 0; background: transparent; box-shadow: none;">
        <div class="luoi-so-sanh-gia">
          ${cards}
        </div>
        <div class="ghi-chu-chung-gia">
          <strong>Ghi chú chung:</strong> ${core.escapeHtml(commonNote)}
        </div>
      </div>
    `;
  }

  function buildQuickCompare(data) {
    return `
      <section class="phan-bang-gia-so-sanh">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">So sánh nhanh</span>
          <h2>Điểm khác biệt của từng dịch vụ</h2>
          <p>So sánh nhanh mức mở cửa theo xe và các thế mạnh riêng của từng dịch vụ để chọn đúng nhóm phương tiện trước khi đi vào báo giá chi tiết.</p>
        </div>
        <div class="luoi-so-sanh-dich-vu">
          ${data
            .map((item) => {
              const info = getTransparentInfo(item);
              const hangMuc = core.getPricingDisplayItems(item)
                .slice(0, 3)
                .map(
                  (entry) =>
                    `<li>${core.escapeHtml(String(entry?.ten || "").trim())}</li>`,
                )
                .join("");

              return `
                <article class="the-so-sanh-dich-vu">
                  <span class="nhan-dich-vu-bang-gia">${core.escapeHtml(item.ten_dich_vu || "")}</span>
                  <strong class="gia-mo-dau-bang-gia">${core.escapeHtml(getStartingPrice(item))}</strong>
                  <p>${core.escapeHtml(info.mo_ta_ngan || "")}</p>
                  <ul class="danh-sach-tom-tat">
                    ${hangMuc}
                  </ul>
                  <a class="link-phu-bang-gia" href="${core.escapeHtml(core.toProjectUrl(item.duong_dan_chi_tiet || "#"))}">Xem mô tả dịch vụ</a>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function buildCommonFormulaSection(data) {
    return `
      <section class="phan-cach-hinh-thanh-gia" data-fee-tab-root>
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Cách tính chung</span>
          <h2>Cả ba nhóm dịch vụ đều bám theo giá mở cửa và dải km</h2>
          <p>Giá tham khảo của cả 3 nhóm đều đi từ giá mở cửa 5km đầu theo từng loại xe, sau đó cộng tiếp theo các dải km phát sinh và những phụ phí đi kèm nếu có.</p>
        </div>
        <div class="khung-cong-thuc-tong-quat">
          <span class="nhan-cong-thuc-tong-quat">Nhóm thành phần giá</span>
          <div class="dong-cong-thuc-tong-quat" role="tablist" aria-label="Công thức tính giá tham khảo">
              ${commonFormulaGroups
                .map(
                  (item, index) => `
                    <button
                      type="button"
                      class="muc-cong-thuc-tong-quat${index === 0 ? " dang-chon" : ""}"
                      role="tab"
                      id="fee-tab-${item.id}"
                      aria-controls="fee-panel-${item.id}"
                      aria-selected="${index === 0 ? "true" : "false"}"
                      tabindex="${index === 0 ? "0" : "-1"}"
                      data-fee-target="${item.id}"
                    >
                      ${core.escapeHtml(item.ten)}
                    </button>
                    ${index < commonFormulaGroups.length - 1 ? '<span class="dau-cong-thuc-tong-quat" aria-hidden="true">+</span>' : ""}
                  `,
                )
                .join("")}
          </div>
        </div>
        <div class="chi-tiet-cong-thuc">
          <div class="cum-muc-phi-chi-tiet">
            <div class="noi-dung-muc-phi-chi-tiet">
              ${commonFormulaGroups
                .map(
                  (item, index) => `
                    <section
                      class="panel-muc-phi-chi-tiet${index === 0 ? " dang-chon" : ""}"
                      role="tabpanel"
                      id="fee-panel-${item.id}"
                      aria-labelledby="fee-tab-${item.id}"
                      ${index === 0 ? "" : "hidden"}
                      data-fee-panel="${item.id}"
                    >
                      <p class="mo-ta-muc-phi-chi-tiet">${core.escapeHtml(item.mo_ta)}</p>
                      <div class="cum-dong-giai-thich-cong-thuc">
                        ${buildFormulaDetailPanel(data, item.id)}
                      </div>
                    </section>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function buildSurchargeSection(data) {
    const surveyItem = getSharedSurveyItem(data);
    return `
      <section class="phan-phu-phi">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Phụ phí phát sinh</span>
          <h2>Những yếu tố ảnh hưởng trực tiếp đến chi phí</h2>
          <p>Hiện tại các khoản còn thể hiện trực tiếp trên bảng giá là khảo sát trước, thời gian triển khai và thời tiết. Những hạng mục hỗ trợ khác chỉ dùng để điều phối đội ngũ thực hiện.</p>
          ${
            surveyItem
              ? `<p><strong>Khảo sát trước:</strong> ${core.escapeHtml(formatCurrency(surveyItem.don_gia))}. Khoản này áp chung, không cần lặp lại theo từng dịch vụ.</p>`
              : ""
          }
        </div>
        <div class="luoi-phu-phi">
          ${data
            .map((item) => {
              const surchargeItems = collectSurchargeItems(item);
              return `
                <article class="the-phu-phi">
                  <h3>${core.escapeHtml(item.ten_dich_vu || "")}</h3>
                  <ul class="danh-sach-phu-phi-bang-gia">
                    ${surchargeItems
                      .map((entry) => {
                        return `
                          <li class="muc-phu-phi-bang-gia">
                            <span class="ten-phu-phi-bang-gia">${core.escapeHtml(entry.label)}</span>
                            <span class="gia-tri-phu-phi-bang-gia">${core.escapeHtml(entry.amount || "Cần xác nhận")}</span>
                          </li>
                        `;
                      })
                      .join("")}
                  </ul>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function buildDecisionSection(data) {
    return `
      <section class="phan-ra-quyet-dinh">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Ra quyết định</span>
          <h2>Khi nào nên khảo sát, khi nào có thể đặt lịch luôn</h2>
          <p>Nếu bạn chưa chắc về mặt bằng, khối lượng hoặc phụ phí phát sinh, khảo sát trước là lựa chọn an toàn hơn. Đây là hạng mục tùy chọn và có cộng phí khảo sát đi lại theo bảng giá.</p>
        </div>
        <div class="luoi-the-ra-quyet-dinh">
          ${data
            .map((item) => {
              const info = getTransparentInfo(item);
              return `
                <article class="the-ra-quyet-dinh">
                  <span class="nhan-dich-vu-bang-gia">${core.escapeHtml(item.ten_dich_vu || "")}</span>
                  <div class="khoi-ra-quyet-dinh khoi-ra-quyet-dinh-sang">
                    <span class="nhan-khoi-ra-quyet-dinh">Có thể đặt lịch luôn khi</span>
                    <p>${core.escapeHtml(info.co_the_dat_lich_luon_khi || "")}</p>
                  </div>
                  <div class="khoi-ra-quyet-dinh">
                    <span class="nhan-khoi-ra-quyet-dinh">Nên khảo sát trước khi</span>
                    <p>${core.escapeHtml(info.nen_khao_sat_khi || "")}</p>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function buildTabbedContent(data) {
    const tabs = [
      {
        id: "so-sanh",
        label: "Tổng quan",
        content: buildQuickCompare(data),
      },
      {
        id: "cong-thuc",
        label: "Chi tiết giá & Phụ phí",
        content: buildCommonFormulaSection(data),
      },
      {
        id: "quyet-dinh",
        label: "Khi nào cần khảo sát?",
        content: buildDecisionSection(data),
      },
    ];

    return `
      <div class="cum-tab-bang-gia" data-tab-bang-gia>
        <div class="thanh-tab-bang-gia" role="tablist" aria-label="Nội dung bảng giá minh bạch">
          ${tabs
            .map(
              (tab, index) => `
                <button
                  type="button"
                  class="nut-tab-bang-gia${index === 0 ? " dang-chon" : ""}"
                  role="tab"
                  id="tab-${tab.id}"
                  aria-controls="panel-${tab.id}"
                  aria-selected="${index === 0 ? "true" : "false"}"
                  tabindex="${index === 0 ? "0" : "-1"}"
                  data-tab-target="${tab.id}"
                >
                  ${core.escapeHtml(tab.label)}
                </button>
              `,
            )
            .join("")}
        </div>
        <div class="noi-dung-tab-bang-gia">
          ${tabs
            .map(
              (tab, index) => `
                <div
                  class="panel-tab-bang-gia${index === 0 ? " dang-chon" : ""}"
                  role="tabpanel"
                  id="panel-${tab.id}"
                  aria-labelledby="tab-${tab.id}"
                  ${index === 0 ? "" : "hidden"}
                  data-tab-panel="${tab.id}"
                >
                  ${tab.content}
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function initTabs(root) {
    const tabRoot = root.querySelector("[data-tab-bang-gia]");
    if (!tabRoot) return;

    const tabs = Array.from(tabRoot.querySelectorAll("[data-tab-target]"));
    const panels = Array.from(tabRoot.querySelectorAll("[data-tab-panel]"));

    function activateTab(targetId) {
      tabs.forEach((tab) => {
        const isActive = tab.getAttribute("data-tab-target") === targetId;
        tab.classList.toggle("dang-chon", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
        tab.setAttribute("tabindex", isActive ? "0" : "-1");
      });

      panels.forEach((panel) => {
        const isActive = panel.getAttribute("data-tab-panel") === targetId;
        panel.classList.toggle("dang-chon", isActive);
        panel.hidden = !isActive;
      });
    }

    tabRoot.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-tab-target]");
      if (!tab) return;
      activateTab(tab.getAttribute("data-tab-target"));
    });

    tabRoot.addEventListener("keydown", (event) => {
      const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex].getAttribute("data-tab-target"));
      }
    });
  }

  function initFeeTabs(root) {
    const feeRoots = Array.from(root.querySelectorAll("[data-fee-tab-root]"));
    if (!feeRoots.length) return;

    feeRoots.forEach((feeRoot) => {
      const tabs = Array.from(feeRoot.querySelectorAll("[data-fee-target]"));
      const panels = Array.from(feeRoot.querySelectorAll("[data-fee-panel]"));
      if (!tabs.length || !panels.length) return;

      function activateTab(targetId) {
        tabs.forEach((tab) => {
          const isActive = tab.getAttribute("data-fee-target") === targetId;
          tab.classList.toggle("dang-chon", isActive);
          tab.setAttribute("aria-selected", isActive ? "true" : "false");
          tab.setAttribute("tabindex", isActive ? "0" : "-1");
        });

        panels.forEach((panel) => {
          const isActive = panel.getAttribute("data-fee-panel") === targetId;
          panel.classList.toggle("dang-chon", isActive);
          panel.hidden = !isActive;
        });
      }

      feeRoot.addEventListener("click", (event) => {
        const tab = event.target.closest("[data-fee-target]");
        if (!tab) return;
        activateTab(tab.getAttribute("data-fee-target"));
      });

      feeRoot.addEventListener("keydown", (event) => {
        const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;

        if (nextIndex !== currentIndex) {
          event.preventDefault();
          tabs[nextIndex].focus();
          activateTab(tabs[nextIndex].getAttribute("data-fee-target"));
        }
      });
    });
  }

  function renderTransparentPricing(root, data) {
    if (!Array.isArray(data) || !data.length) {
      root.innerHTML =
        '<p class="trang-thai-bang-gia">Chưa có dữ liệu để hiển thị phần công thức minh bạch.</p>';
      return;
    }

    root.innerHTML = buildTabbedContent(data);
    initTabs(root);
    initFeeTabs(root);
  }

  onReady(function () {
    const root = document.querySelector("[data-bang-gia-minh-bach-root]");
    if (!root) return;

    loadTransparentPricingData().then((data) => {
      renderTransparentPricing(root, data);
    });
  });
})(window, document);
