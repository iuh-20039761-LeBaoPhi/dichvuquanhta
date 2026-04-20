(function () {
  const SUPPLIER_TABLE = "nhacungcap_suaxe";

  let suppliers = [];
  let filteredSuppliers = [];

  function extractKrudRows(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeAccountStatus(value) {
    const status = String(value || "")
      .trim()
      .toLowerCase();

    if (status === "active" || status === "approved" || status === "duyet") {
      return "Active";
    }

    if (
      status === "blocked" ||
      status === "block" ||
      status === "locked" ||
      status === "khoa" ||
      status === "khóa"
    ) {
      return "Blocked";
    }

    return "Pending";
  }

  function mapSupplier(row) {
    return {
      id: row.id || "",
      hovaten: row.hovaten || row.hoten || "",
      sodienthoai: row.sodienthoai || row.sdt || "",
      email: row.email || "",
      cuahang: row.cuahang || "",
      diachi: row.diachi || "",
      trangthai: normalizeAccountStatus(row.trangthai || row.status),
    };
  }

  function getStatusBadge(status) {
    const normalized = normalizeAccountStatus(status);

    if (normalized === "Active") {
      return '<span class="badge text-bg-success">Active</span>';
    }

    if (normalized === "Blocked") {
      return '<span class="badge text-bg-danger">Blocked</span>';
    }

    return '<span class="badge text-bg-warning">Pending</span>';
  }

  function showAlert(message, type) {
    const alert = document.getElementById("supplierAlert");
    if (!alert) return;

    alert.classList.remove(
      "d-none",
      "alert-danger",
      "alert-success",
      "alert-warning",
    );
    alert.classList.add(`alert-${type || "warning"}`);
    alert.textContent = message;
  }

  function hideAlert() {
    const alert = document.getElementById("supplierAlert");
    if (!alert) return;

    alert.classList.add("d-none");
    alert.textContent = "";
  }

  function buildStatCards() {
    return [
      {
        label: "Tổng nhà cung cấp",
        value: suppliers.length,
        icon: "fas fa-user-tie",
        color: "linear-gradient(135deg,#10b981,#22c55e)",
      },
      {
        label: "Tài khoản Active",
        value: suppliers.filter(function (item) {
          return normalizeAccountStatus(item.trangthai) === "Active";
        }).length,
        icon: "fas fa-user-check",
        color: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
      },
      {
        label: "Tài khoản Blocked",
        value: suppliers.filter(function (item) {
          return normalizeAccountStatus(item.trangthai) === "Blocked";
        }).length,
        icon: "fas fa-user-lock",
        color: "linear-gradient(135deg,#f43f5e,#f97316)",
      },
      {
        label: "Tài khoản Pending",
        value: suppliers.filter(function (item) {
          return normalizeAccountStatus(item.trangthai) === "Pending";
        }).length,
        icon: "fas fa-user-clock",
        color: "linear-gradient(135deg,#a78bfa,#c084fc)",
      },
    ];
  }

  function renderStats() {
    const statsGrid = document.getElementById("supplierStatsGrid");
    if (!statsGrid) return;

    const cards = buildStatCards();

    statsGrid.innerHTML = cards
      .map(function (card) {
        return `
          <div class="col-12 col-sm-6 col-xl-3">
            <article class="metric-card h-100">
              <span class="metric-icon" style="background:${card.color}">
                <i class="${card.icon}" aria-hidden="true"></i>
              </span>
              <div>
                <p class="metric-value">${card.value}</p>
                <p class="metric-title">${card.label}</p>
              </div>
            </article>
          </div>
        `;
      })
      .join("");
  }

  function renderTable() {
    const tbody = document.getElementById("supplierTableBody");
    if (!tbody) return;

    if (filteredSuppliers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="text-center text-muted py-4">Không có nhà cung cấp phù hợp.</td></tr>';
      return;
    }

    tbody.innerHTML = filteredSuppliers
      .map(function (item, index) {
        const status = normalizeAccountStatus(item.trangthai);
        const disableApprove = status === "Active" ? "disabled" : "";
        const disableBlock = status === "Blocked" ? "disabled" : "";

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.hovaten)}</td>
            <td>${escapeHtml(item.sodienthoai)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.cuahang)}</td>
            <td>${escapeHtml(item.diachi)}</td>
            <td>${getStatusBadge(status)}</td>
            <td>
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-outline-success" data-update-status="Active" data-id="${item.id}" type="button" ${disableApprove}>
                  <i class="fas fa-user-check me-1" aria-hidden="true"></i>Duyệt
                </button>
                <button class="btn btn-sm btn-outline-danger" data-update-status="Blocked" data-id="${item.id}" type="button" ${disableBlock}>
                  <i class="fas fa-user-lock me-1" aria-hidden="true"></i>Khóa
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function applyFilter() {
    const keyword = normalizeText(
      document.getElementById("supplierKeyword")?.value,
    );

    if (!keyword) {
      filteredSuppliers = suppliers.slice();
      renderTable();
      return;
    }

    filteredSuppliers = suppliers.filter(function (item) {
      const source = [
        item.hovaten,
        item.sodienthoai,
        item.email,
        item.cuahang,
        item.diachi,
        item.trangthai,
      ]
        .map(normalizeText)
        .join(" ");

      return source.indexOf(keyword) !== -1;
    });

    renderTable();
  }

  async function loadSuppliers() {
    if (typeof window.krudList !== "function") {
      throw new Error("Chưa tải krud.js");
    }

    const result = await Promise.resolve(
      window.krudList({
        table: SUPPLIER_TABLE,
        page: 1,
        limit: 100,
      }),
    );

    const rows = extractKrudRows(result);
    suppliers = rows.map(mapSupplier);
    filteredSuppliers = suppliers.slice();
  }

  async function updateSupplierStatus(id, nextStatus) {
    hideAlert();

    if (!id) {
      showAlert("Thiếu mã nhà cung cấp để cập nhật.", "warning");
      return;
    }

    try {
      try {
        await Promise.resolve(
          window.krud("update", SUPPLIER_TABLE, { trangthai: nextStatus }, id),
        );
      } catch (firstError) {
        await Promise.resolve(
          window.krud("update", SUPPLIER_TABLE, { status: nextStatus }, id),
        );
      }

      showAlert(`Đã cập nhật trạng thái thành ${nextStatus}.`, "success");
      await loadSuppliers();
      renderStats();
      applyFilter();
    } catch (error) {
      console.error("Update status failed:", error);
      showAlert("Không thể cập nhật trạng thái tài khoản.", "danger");
    }
  }

  function bindEvents() {
    const keywordInput = document.getElementById("supplierKeyword");
    const tbody = document.getElementById("supplierTableBody");

    if (keywordInput) {
      keywordInput.addEventListener("input", applyFilter);
    }

    if (tbody) {
      tbody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-update-status]");
        if (!button) return;

        const supplierId = button.getAttribute("data-id");
        const nextStatus = button.getAttribute("data-update-status");
        updateSupplierStatus(supplierId, nextStatus);
      });
    }
  }

  function renderLoading() {
    const tbody = document.getElementById("supplierTableBody");
    if (!tbody) return;

    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center text-muted py-4">Đang tải dữ liệu nhà cung cấp...</td></tr>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindEvents();
    renderLoading();

    loadSuppliers()
      .then(function () {
        renderStats();
        applyFilter();
      })
      .catch(function (error) {
        console.error("Load suppliers failed:", error);
        suppliers = [];
        filteredSuppliers = [];
        renderStats();
        renderTable();
        showAlert("Không tải được danh sách nhà cung cấp.", "danger");
      });
  });
})();
