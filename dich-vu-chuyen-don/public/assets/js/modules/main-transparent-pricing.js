(function (window, document) {
  if (window.__fastGoTransparentPricingLoaded) return;
  window.__fastGoTransparentPricingLoaded = true;

  const core = window.FastGoCore || {};
  if (!core.toPublicUrl || !core.escapeHtml) return;

  const commonFormulaGroups = [
    {
      id: "cuoc-xe",
      ten: "Cước xe cơ bản",
      mo_ta: "Phần có ở cả 3 nhóm dịch vụ, dựa trên loại xe, số chuyến và quãng đường thực tế. Khi có đủ dữ liệu, hệ thống lấy giá trị lớn hơn giữa tải trọng và dung tích; nếu thiếu thể tích đơn hàng thì tạm tính theo tải trọng.",
    },
    {
      id: "ho-tro",
      ten: "Hạng mục hỗ trợ thêm",
      mo_ta: "Chỉ tính khi bạn cần thêm nhân công, đóng gói, tháo lắp, bảo vệ IT, xe nâng hoặc xe cẩu.",
    },
    {
      id: "phu-phi",
      ten: "Phụ phí điều kiện thực tế",
      mo_ta: "Phát sinh khi có tầng lầu, hẻm nhỏ, đồ nặng, đồ dễ vỡ, nhiều pallet hoặc mặt bằng khó tiếp cận.",
    },
    {
      id: "thoi-diem",
      ten: "Điều chỉnh theo thời điểm",
      mo_ta: "Khung giờ tối, ban đêm, cuối tuần hoặc thời tiết xấu hiện đang hiển thị theo dạng phụ phí tham chiếu.",
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

  function renderDetailList(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<li>Đang cập nhật chi tiết.</li>';
    }

    return items.map((item) => `<li>${item}</li>`).join("");
  }

  function buildFormulaDetailPanel(data, groupId) {
    return data
      .map((item) => {
        const serviceName = core.escapeHtml(item.ten_dich_vu || "");
        const standardStructure = core.getPricingStandardStructure(item) || {};
        let details = [];

        if (groupId === "cuoc-xe") {
          const vehicles = core.getPricingVehicleEntries(item);
          const tripRule =
            standardStructure?.chi_phi_co_ban?.cuoc_xe?.quy_tac_so_chuyen
              ?.ghi_chu || "";
          const vehicleLines = vehicles
            .map((vehicle) => {
              return `${core.escapeHtml(vehicle.ten_hien_thi)}: <strong>${core.escapeHtml(formatCurrency(vehicle.gia_co_ban) || "Cần xác nhận")}</strong>${vehicle.km_co_ban > 0 ? ` gồm ${core.escapeHtml(String(vehicle.km_co_ban))}km đầu` : ""}${vehicle.gia_moi_km_tiep > 0 ? `, sau đó +<strong>${core.escapeHtml(formatCurrency(vehicle.gia_moi_km_tiep))}</strong>/km` : ""}.`;
            });

          details = [
            vehicles.length
              ? `Giá xe tham khảo: ${vehicleLines.join(" ")}`
              : "Giá xe được chốt theo loại xe phù hợp và quãng đường thực tế.",
            tripRule
              ? core.escapeHtml(tripRule)
              : "Hiện số chuyến vẫn đang tạm tính theo tải trọng; khi đủ thể tích đơn hàng và dung tích xe, hệ thống sẽ lấy giá trị lớn hơn giữa tải trọng và dung tích.",
          ];
        }

        if (groupId === "ho-tro") {
          const calculationItems = core.getPricingCalculationItems(item);
          details = calculationItems.length
            ? calculationItems.map((entry) => {
                const price = formatCurrency(entry.don_gia);
                return `${core.escapeHtml(entry.ten)}: <strong>${core.escapeHtml(price || "Cần xác nhận")}</strong>${entry.don_vi ? ` / ${core.escapeHtml(entry.don_vi)}` : ""}.`;
              })
            : ["Chỉ cộng thêm khi bạn chọn các hạng mục hỗ trợ ngoài cước xe cơ bản."];
        }

        if (groupId === "phu-phi") {
          const fixedFees = core.getPricingFixedFeeEntries(item);
          details = fixedFees.length
            ? fixedFees.map((entry) => {
                return `<strong>${core.escapeHtml(entry.title)}:</strong> ${core.escapeHtml(entry.value || "Cần xác nhận")}${entry.note ? `, ${core.escapeHtml(entry.note)}` : ""}.`;
              })
            : ["Phụ phí sẽ chốt theo điều kiện thực tế của đồ đạc và mặt bằng."];
        }

        if (groupId === "thoi-diem") {
          const multiplierEntries = core.getPricingMultiplierEntries(item);
          const note =
            standardStructure?.he_so?.ghi_chu ||
            "Khung giờ và thời tiết hiện đang dùng dữ liệu tham chiếu.";
          details = multiplierEntries.length
            ? [
                ...multiplierEntries.map((entry) => {
                  return `<strong>${core.escapeHtml(entry.title)}:</strong> ${core.escapeHtml(entry.value || "Cần xác nhận")} ${entry.note ? `, ${core.escapeHtml(entry.note)}` : ""}.`;
                }),
                core.escapeHtml(note),
              ]
            : [core.escapeHtml(note)];
        }

        return `
          <div class="dong-giai-thich-cong-thuc">
            <h3>${serviceName}</h3>
            <ul class="danh-sach-giai-thich-cong-thuc">
              ${renderDetailList(details)}
            </ul>
          </div>
        `;
      })
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

  function buildCommonFormulaSection(data) {
    return `
      <section class="phan-cach-hinh-thanh-gia" data-fee-tab-root>
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Công thức chung</span>
          <h2>Công thức giá chung của ba nhóm dịch vụ</h2>
          <p>Giá tham khảo của cả 3 nhóm đều đi theo một logic chung. Khác nhau chủ yếu ở hạng mục hỗ trợ và điều kiện thực tế tại điểm đi, điểm đến.</p>
        </div>
        <div class="khung-cong-thuc-tong-quat">
          <span class="nhan-cong-thuc-tong-quat">Công thức đang dùng</span>
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

  function buildServiceFormulaSection(data) {
    return `
      <section class="phan-cong-thuc-rieng">
        <div class="dau-muc-trang">
          <span class="the-thong-tin-nhan">Công thức riêng</span>
          <h2>Mỗi dịch vụ có một lớp phát sinh khác nhau</h2>
          <p>Cả 3 nhóm đều dùng công thức chung ở trên. Bảng dưới đây chỉ giữ lại những cột khác nhau để bạn so sánh nhanh và tận dụng khoảng ngang tốt hơn.</p>
        </div>
        <div class="bang-so-sanh-cong-thuc-wrapper">
          <table class="bang-so-sanh-cong-thuc">
            <thead>
              <tr>
                <th scope="col">Dịch vụ</th>
                <th scope="col">Phù hợp khi</th>
                <th scope="col">Phần cơ bản</th>
                <th scope="col">Phát sinh thường gặp</th>
                <th scope="col">Nên khảo sát trước khi</th>
              </tr>
            </thead>
            <tbody>
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
                    <tr>
                      <th scope="row">
                        <span class="ten-dich-vu-bang-cong-thuc">${core.escapeHtml(item.ten_dich_vu || "")}</span>
                      </th>
                      <td>${core.escapeHtml(info.phu_hop_khi || "")}</td>
                      <td>${renderInlineList(basicParts, "Xe và quãng đường thực tế")}</td>
                      <td>${renderInlineList(extraParts, "Chốt thêm theo nhu cầu thực tế")}</td>
                      <td class="o-noi-bat-bang-cong-thuc">${core.escapeHtml(info.nen_khao_sat_khi || "")}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
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
        content: buildCommonFormulaSection(data),
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
