(function () {
  const KRUD_TABLE = "datlich_giatuinhanh";
  const shared = window.SharedOrderUtils || {};
  let orders = [];

  const statusConfig = {
    pending: {
      label: "Chờ xử lý",
      className: "status-pending",
      barClass: "c-pending",
    },
    processing: {
      label: "Đang thực hiện",
      className: "status-confirmed",
      barClass: "c-confirmed",
    },
    completed: {
      label: "Hoàn thành",
      className: "status-completed",
      barClass: "c-completed",
    },
    cancel: {
      label: "Đã hủy",
      className: "status-canceled",
      barClass: "c-canceled",
    },
  };

  function extractRows(result) {
    if (typeof shared.extractRows === "function")
      return shared.extractRows(result);
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function getOrderStatus(row) {
    if (typeof shared.getOrderStatus === "function")
      return shared.getOrderStatus(row);
    if (row && row.ngayhuy) return "cancel";
    if (row && row.ngayhoanthanh) return "completed";
    if (row && row.ngaynhan) return "processing";
    return "pending";
  }

  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function formatCurrency(value) {
    const amount = toNumber(value);
    return amount.toLocaleString("vi-VN") + " đ";
  }

  function formatOrderCode(id) {
    if (typeof shared.formatOrderCode === "function") {
      return shared.formatOrderCode(id);
    }
    const num = Number(id);
    return Number.isFinite(num) && num > 0
      ? String(Math.floor(num)).padStart(7, "0")
      : "-";
  }

  function parseTime(value) {
    if (!value) return 0;

    const text = String(value).trim();
    const isoTime = new Date(text).getTime();
    if (Number.isFinite(isoTime) && isoTime > 0) return isoTime;

    const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return 0;

    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  }

  function formatDate(value) {
    const t = parseTime(value);
    return t ? new Date(t).toLocaleDateString("vi-VN") : "--/--/----";
  }

  function mapOrder(row) {
    const rawDate = row.ngaydat || row.created_date || "";
    const totalAmount = toNumber(row.tongtien);

    const fallbackTotal =
      toNumber(row.giadichvu) +
      toNumber(row.tiendichuyen) +
      toNumber(row.phuphigiaonhan);

    return {
      id: Number(row.id) || 0,
      code: formatOrderCode(row.id),
      customerName: row.hovaten || "Khách hàng",
      customerPhone: row.sodienthoai || "",
      service: row.dichvu || "Chưa cập nhật dịch vụ",
      status: getOrderStatus(row),
      date: formatDate(rawDate),
      total: totalAmount > 0 ? totalAmount : fallbackTotal,
      raw: row,
      sortTime: parseTime(rawDate) || Number(row.id) || 0,
    };
  }

  function getStatusCounters() {
    return {
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      completed: orders.filter((o) => o.status === "completed").length,
      cancel: orders.filter((o) => o.status === "cancel").length,
    };
  }

  function buildCards() {
    const counters = getStatusCounters();
    const serviceSet = new Set(orders.map((o) => o.service));
    const customerSet = new Set(orders.map((o) => o.customerName));

    return [
      {
        label: "Tổng đơn",
        value: orders.length,
        icon: "fas fa-boxes",
        color: "linear-gradient(135deg,#10b981,#22c55e)",
      },
      {
        label: "Chờ xử lý",
        value: counters.pending,
        icon: "fas fa-hourglass-half",
        color: "linear-gradient(135deg,#f59e0b,#fb7185)",
      },
      {
        label: "Đang thực hiện",
        value: counters.processing,
        icon: "fas fa-spinner",
        color: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
      },
      {
        label: "Hoàn thành",
        value: counters.completed,
        icon: "fas fa-check-circle",
        color: "linear-gradient(135deg,#34d399,#10b981)",
      },
      {
        label: "Tổng khách hàng",
        value: customerSet.size,
        icon: "fas fa-users",
        color: "linear-gradient(135deg,#86efac,#fde047)",
      },
      {
        label: "Tổng dịch vụ",
        value: serviceSet.size,
        icon: "fas fa-box-open",
        color: "linear-gradient(135deg,#c084fc,#a78bfa)",
      },
    ];
  }

  async function loadOrders() {
    if (typeof window.krudList !== "function") {
      throw new Error("Chưa tải thư viện KRUD (krud.js).");
    }

    const result = await Promise.resolve(
      window.krudList({
        table: KRUD_TABLE,
        page: 1,
        limit: 200,
      }),
    );

    orders = extractRows(result)
      .map(mapOrder)
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  function renderStats() {
    const statsGrid = document.getElementById("statsGrid");
    if (!statsGrid) return;

    statsGrid.innerHTML = buildCards()
      .map(
        (card) => `
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
        `,
      )
      .join("");
  }

  function renderRecentOrders() {
    const tbody = document.getElementById("recentOrdersBody");
    if (!tbody) return;

    if (!orders.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-muted py-4">Chưa có dữ liệu đơn đặt.</td></tr>';
      return;
    }

    tbody.innerHTML = orders
      .slice(0, 6)
      .map((order) => {
        const status = statusConfig[order.status] || statusConfig.pending;
        return `
          <tr>
            <td class="order-code">${order.code}</td>
            <td>
              <div class="customer-block">
                <strong>${order.customerName}</strong>
                <span>${order.customerPhone || "--"}</span>
              </div>
            </td>
            <td><p class="service-text mb-0">${order.service}</p></td>
            <td>${order.date}</td>
            <td><span class="status-pill ${status.className}">${status.label}</span></td>
            <td>${formatCurrency(order.total)}</td>
            <td>
              <a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-don-hang.html?id=${order.id}">
                Xem chi tiết
              </a>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderStatusSummary() {
    const box = document.getElementById("statusSummary");
    if (!box) return;

    const counters = getStatusCounters();
    const total = orders.length || 1;
    const statuses = ["pending", "processing", "completed", "cancel"];

    box.innerHTML = statuses
      .map((key) => {
        const config = statusConfig[key];
        const value = counters[key] || 0;
        const width = Math.round((value / total) * 100);
        return `
          <div class="status-item">
            <div class="status-row">
              <span class="status-name">${config.label}</span>
              <span class="status-count">${value}</span>
            </div>
            <div class="status-bar-track">
              <div class="status-bar ${config.barClass}" style="width:${width}%"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderLoadingState() {
    const tbody = document.getElementById("recentOrdersBody");
    const box = document.getElementById("statusSummary");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-muted py-4">Đang tải danh sách đơn đặt...</td></tr>';
    }
    if (box) {
      box.innerHTML = '<p class="text-muted mb-0">Đang tải thống kê...</p>';
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderLoadingState();

    loadOrders()
      .then(function () {
        renderStats();
        renderRecentOrders();
        renderStatusSummary();
      })
      .catch(function (error) {
        console.error("Lỗi tải dashboard admin:", error);
        orders = [];
        renderStats();
        renderRecentOrders();
        renderStatusSummary();
      });
  });
})();
