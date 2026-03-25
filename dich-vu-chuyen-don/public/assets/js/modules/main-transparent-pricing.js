(function (window, document) {
  if (window.__fastGoTransparentPricingLoaded) return;
  window.__fastGoTransparentPricingLoaded = true;

  const core = window.FastGoCore || {};
  if (!core.toPublicUrl || !core.escapeHtml) return;

  const commonFormulaGroups = [
    {
      ten: "Chi phí cơ bản",
      mo_ta: "Gồm loại xe phù hợp, quãng đường cơ bản và phí km vượt ngưỡng nếu hành trình dài hơn mức miễn phí.",
    },
    {
      ten: "Chi phí dịch vụ",
      mo_ta: "Là các hạng mục bạn chọn thêm như nhân công, đóng gói, tháo lắp, bảo vệ IT, xe nâng hoặc xe cẩu.",
    },
    {
      ten: "Phụ phí cố định",
      mo_ta: "Áp dụng khi có đồ cồng kềnh, dễ vỡ, vượt ngưỡng thể tích hoặc vượt ngưỡng trọng lượng của đơn hàng.",
    },
    {
      ten: "Điều chỉnh thời điểm",
      mo_ta: "Khung giờ và thời tiết hiện đang được tham chiếu theo phụ phí phát sinh; chưa áp dụng hệ số nhân chính thức.",
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
    const value = core.getPricingStartingPrice(item);
    return value > 0 ? `Từ ${formatCurrency(value)}/chuyến` : "";
  }

  function collectSurchargeItems(serviceData) {
    return [
      ...core.getPricingFixedFeeEntries(serviceData).map((item) => ({
        label: item.title,
        amount: item.value,
      })),
      ...core.getPricingMultiplierEntries(serviceData).map((item) => ({
        label: item.title,
        amount: item.value,
      })),
      ...core.getPricingCalculationItems(serviceData).map((item) => ({
        label: item.ten,
        amount: `${formatCurrency(item.don_gia)}${item.don_vi ? ` / ${item.don_vi}` : ""}`,
      })),
    ];
  }

  function renderChipList(items, formatter) {
    return items
      .map((item) => `<span class="chip-bang-gia">${formatter(item)}</span>`)
      .join("");
  }

  function buildQuickCompare(data) {
    return `
      <section class="phan-bang-gia-so-sanh">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">So sánh nhanh</span>
          <h2>Ba nhóm dịch vụ khác nhau ngay từ cách hình thành giá</h2>
          <p>Bạn có thể nhìn nhanh mức khởi điểm, nhóm hạng mục chính và đi tiếp sang đúng trang dịch vụ khi cần xem sâu hơn.</p>
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
                  <a class="link-phu-bang-gia" href="${core.escapeHtml(item.duong_dan_chi_tiet || "#")}">Xem bảng giá chi tiết ở trang dịch vụ</a>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function buildCommonFormulaSection() {
    return `
      <section class="phan-cach-hinh-thanh-gia">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Công thức chung</span>
          <h2>Công thức giá chung của ba nhóm dịch vụ</h2>
          <p>Giá tham khảo hiện được ghép từ 4 phần chính. Đây là cách đọc nhanh nhất trước khi xem sâu từng dịch vụ.</p>
        </div>
        <div class="khung-cong-thuc-tong-quat">
          <span class="nhan-cong-thuc-tong-quat">Công thức đang dùng</span>
          <p>Chi phí cơ bản + Chi phí dịch vụ + Phụ phí cố định + Điều chỉnh theo khung giờ hoặc thời tiết</p>
        </div>
        <div class="luoi-yeu-to-gia">
          ${commonFormulaGroups
            .map(
              (item) => `
                <article class="the-yeu-to-gia">
                  <h3>${core.escapeHtml(item.ten)}</h3>
                  <p>${core.escapeHtml(item.mo_ta)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function buildServiceFormulaSection(data) {
    return `
      <section class="phan-cong-thuc-rieng">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Công thức riêng</span>
          <h2>Mỗi dịch vụ có một lớp phát sinh khác nhau</h2>
          <p>Phần khác biệt không nằm ở tên dịch vụ, mà nằm ở hạng mục hỗ trợ và phụ phí đặc thù của từng ca chuyển dọn.</p>
        </div>
        <div class="luoi-cong-thuc-rieng">
          ${data
            .map((item) => {
              const info = getTransparentInfo(item);
              const basicParts = Array.isArray(info.phan_co_ban)
                ? info.phan_co_ban
                : [];
              const extraParts = Array.isArray(info.phan_phat_sinh)
                ? info.phan_phat_sinh
                : [];

              return `
                <article class="the-cong-thuc-rieng">
                  <div class="dau-the-cong-thuc">
                    <span class="nhan-dich-vu-bang-gia">${core.escapeHtml(item.ten_dich_vu || "")}</span>
                    <h3>${core.escapeHtml(item.ten_dich_vu || "")}</h3>
                    <p>${core.escapeHtml(info.phu_hop_khi || "")}</p>
                  </div>

                  <div class="luoi-cau-truc-gia">
                    <section class="khung-cau-truc-gia">
                      <span class="nhan-cau-truc-gia">Phần cơ bản</span>
                      <div class="cum-chip-bang-gia cum-chip-bang-gia-nhat">
                        ${renderChipList(basicParts, (entry) => core.escapeHtml(entry))}
                      </div>
                    </section>

                    <section class="khung-cau-truc-gia">
                      <span class="nhan-cau-truc-gia">Phần phát sinh nếu có</span>
                      <div class="cum-chip-bang-gia">
                        ${renderChipList(extraParts, (entry) => core.escapeHtml(entry))}
                      </div>
                    </section>
                  </div>

                  <section class="khung-canh-bao-khao-sat">
                    <span class="nhan-canh-bao-khao-sat">Nên khảo sát trước khi</span>
                    <p>${core.escapeHtml(info.nen_khao_sat_khi || "")}</p>
                  </section>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function buildSurchargeSection(data) {
    return `
      <section class="phan-phu-phi">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Phụ phí phát sinh</span>
          <h2>Những yếu tố dễ làm giá thay đổi nhất</h2>
          <p>Đây là các nhóm phụ phí có trong cùng nguồn dữ liệu giá tham khảo của từng dịch vụ, giúp bạn nhìn nhanh yếu tố nào dễ làm chi phí thay đổi.</p>
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
          <p>Nếu bạn chưa chắc về mặt bằng, khối lượng hoặc phụ phí phát sinh, khảo sát trước luôn là lựa chọn an toàn hơn.</p>
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
        label: "So sánh nhanh",
        content: buildQuickCompare(data),
      },
      {
        id: "cong-thuc",
        label: "Công thức chung",
        content: buildCommonFormulaSection(),
      },
      {
        id: "phat-sinh",
        label: "Theo từng dịch vụ",
        content: buildServiceFormulaSection(data),
      },
      {
        id: "phu-phi",
        label: "Phụ phí",
        content: buildSurchargeSection(data),
      },
      {
        id: "quyet-dinh",
        label: "Khi nào khảo sát",
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

  function renderTransparentPricing(root, data) {
    if (!Array.isArray(data) || !data.length) {
      root.innerHTML =
        '<p class="trang-thai-bang-gia">Chưa có dữ liệu để hiển thị phần công thức minh bạch.</p>';
      return;
    }

    root.innerHTML = buildTabbedContent(data);
    initTabs(root);
  }

  onReady(function () {
    const root = document.querySelector("[data-bang-gia-minh-bach-root]");
    if (!root) return;

    loadTransparentPricingData().then((data) => {
      renderTransparentPricing(root, data);
    });
  });
})(window, document);
