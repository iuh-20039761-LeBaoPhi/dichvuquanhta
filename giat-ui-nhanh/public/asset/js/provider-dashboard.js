(function () {
  var BOOKING_TABLE = "datlich_giatuinhanh";

  var newOrders = [];
  var activeOrders = [];
  var currentSupplierId = 0;
  var currentSessionUser = null;

  var orderDisplayUtils = window.OrderDisplayUtils || {};
  var resolveOrderDisplayCode =
    typeof orderDisplayUtils.resolveOrderDisplayCode === "function"
      ? orderDisplayUtils.resolveOrderDisplayCode
      : function (row) {
          var id = Number(row && row.id);
          return Number.isFinite(id) && id > 0
            ? String(Math.floor(id)).padStart(7, "0")
            : "-";
        };

  var formatOrderDisplayId =
    typeof orderDisplayUtils.formatOrderDisplayId === "function"
      ? orderDisplayUtils.formatOrderDisplayId
      : function (id) {
          var n = Number(id);
          return Number.isFinite(n) && n > 0
            ? String(Math.floor(n)).padStart(7, "0")
            : "-";
        };

  var statusConfig = {
    pending: { label: "Chờ nhận đơn", className: "status-pending" },
    processing: { label: "Đã nhận đơn", className: "status-received" },
    completed: { label: "Đã hoàn thành", className: "status-done" },
  };

  var cardConfig = [
    {
      key: "pending",
      label: "Đơn mới & Chờ nhận",
      icon: "fas fa-bullhorn",
      iconBg: "#e8f1ff",
      iconColor: "#2f67b6",
    },
    {
      key: "processing",
      label: "Đã nhận đơn",
      icon: "fas fa-clipboard-check",
      iconBg: "#e8f8ff",
      iconColor: "#1689b5",
    },
    {
      key: "completed",
      label: "Đã hoàn thành",
      icon: "fas fa-cogs",
      iconBg: "#fff4dd",
      iconColor: "#bf7d19",
    },
  ];

  function getRows(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function statusFromDates(row) {
    if (row && row.ngayhoanthanh) return "completed";
    if (row && row.ngaynhan) return "processing";
    if (row && row.ngaydat) return "pending";
    return "pending";
  }

  function toDateScore(value) {
    if (!value) return 0;
    var t = new Date(value).getTime();
    if (Number.isFinite(t) && t > 0) return t;

    var m = String(value)
      .trim()
      .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return 0;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  }

  function formatDate(value) {
    var score = toDateScore(value);
    return score ? new Date(score).toLocaleDateString("vi-VN") : "--/--/----";
  }

  function text(value) {
    var s = String(value || "").trim();
    return s || "-";
  }

  function money(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    return n.toLocaleString("vi-VN") + " đ";
  }

  async function resolveCurrentSupplierId() {
    try {
      var loginRes = await fetch("public/asset/login-page.php", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      var loginData = await loginRes.json();

      currentSessionUser =
        loginData && loginData.loggedIn === true
          ? loginData.user || null
          : null;
      currentSupplierId = Number(
        currentSessionUser &&
          (currentSessionUser.id ||
            currentSessionUser.idnhacungcap ||
            currentSessionUser.provider_id),
      );
      if (!Number.isFinite(currentSupplierId) || currentSupplierId <= 0) {
        currentSupplierId = 0;
      }
      return currentSupplierId;
    } catch (_e) {
      currentSupplierId = 0;
      currentSessionUser = null;
      return currentSupplierId;
    }
  }

  function mapOrder(row) {
    var rawDate = row.ngaydat || row.ngaytao || row.created_at || "";
    return {
      id: Number(row.id) || 0,
      code: resolveOrderDisplayCode(row),
      customer: row.hovaten || row.tenkhachhang || "Khách hàng",
      phone: row.sodienthoai || "",
      service: row.dichvu || row.dichvuquantam || "Chưa rõ dịch vụ",
      date: formatDate(rawDate),
      status: statusFromDates(row),
      sortScore: toDateScore(rawDate) || Number(row.id) || 0,
      raw: row,
    };
  }

  async function loadDashboardOrders() {
    var supplierId = await resolveCurrentSupplierId();

    var result = await Promise.resolve(
      window.krudList({
        table: BOOKING_TABLE,
        page: 1,
        limit: 200,
      }),
    );

    var all = getRows(result)
      .filter(function (row) {
        return !row.ngayhuy;
      })
      .map(mapOrder)
      .sort(function (a, b) {
        return b.sortScore - a.sortScore;
      });

    newOrders = all.filter(function (o) {
      return o.status === "pending";
    });

    activeOrders = all.filter(function (o) {
      if (o.status !== "processing" && o.status !== "completed") return false;
      var ownerId = Number(
        o.raw && (o.raw.idnhacungcap || o.raw.id_ncc || o.raw.manhacungcap),
      );
      return Number.isFinite(ownerId) && ownerId === supplierId;
    });
  }

  function renderNewOrdersLoading() {
    var tbody = document.getElementById("newOrdersBody");
    if (!tbody) return;
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted py-4">Đang tải đơn chờ xử lý...</td></tr>';
  }

  function renderNewOrdersError() {
    var tbody = document.getElementById("newOrdersBody");
    if (!tbody) return;
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-danger py-4">Không tải được dữ liệu từ bảng datlich_giatuinhanh.</td></tr>';
  }

  function countByStatus(key) {
    var a = newOrders.filter(function (o) {
      return o.status === key;
    }).length;
    var b = activeOrders.filter(function (o) {
      return o.status === key;
    }).length;
    return a + b;
  }

  function renderSummaryCards() {
    var mount = document.getElementById("summaryCards");
    if (!mount) return;

    mount.innerHTML = cardConfig
      .map(function (c) {
        return (
          '<div class="col-12 col-sm-6 col-xl-3">' +
          '<article class="summary-item">' +
          '<span class="summary-icon" style="background:' +
          c.iconBg +
          ";color:" +
          c.iconColor +
          '">' +
          '<i class="' +
          c.icon +
          '" aria-hidden="true"></i>' +
          "</span>" +
          '<div class="summary-meta">' +
          '<p class="summary-label">' +
          c.label +
          "</p>" +
          '<p class="summary-value">' +
          countByStatus(c.key) +
          "</p>" +
          "</div>" +
          "</article>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderNewOrders() {
    var tbody = document.getElementById("newOrdersBody");
    if (!tbody) return;

    if (!newOrders.length) {
      tbody.innerHTML =
        '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-smile"></i> Hiện chưa có đơn mới</div></td></tr>';
      return;
    }

    tbody.innerHTML = newOrders
      .map(function (o) {
        var st = statusConfig[o.status] || statusConfig.pending;
        return (
          "<tr>" +
          '<td data-label="Mã đơn">' +
          o.code +
          "</td>" +
          '<td data-label="Khách hàng"><div class="customer-name">' +
          o.customer +
          '</div><div class="customer-phone">' +
          o.phone +
          "</div></td>" +
          '<td data-label="Dịch vụ yêu cầu">' +
          o.service +
          "</td>" +
          '<td data-label="Ngày đặt">' +
          o.date +
          "</td>" +
          '<td data-label="Trạng thái"><span class="status-pill ' +
          st.className +
          '">' +
          st.label +
          "</span></td>" +
          '<td data-label="Thao tác"><div class="d-flex gap-2 flex-wrap">' +
          '<button type="button" class="btn btn-sm btn-outline-cyan btn-accept-order" data-order-id="' +
          (o.id || "") +
          '"' +
          (o.id ? "" : " disabled") +
          ">Nhận đơn</button>" +
          '<button type="button" class="btn btn-sm btn-outline-cyan btn-order-detail" data-order-id="' +
          (o.id || "") +
          '"' +
          (o.id ? "" : " disabled") +
          ">Xem chi tiết</button>" +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderActiveOrders() {
    var tbody = document.getElementById("activeOrdersBody");
    if (!tbody) return;

    if (!activeOrders.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có đơn đang xử lý hoặc đã hoàn thành.</td></tr>';
      return;
    }

    tbody.innerHTML = activeOrders
      .map(function (o) {
        var st = statusConfig[o.status] || statusConfig.processing;
        return (
          "<tr>" +
          '<td data-label="Mã đơn">' +
          o.code +
          "</td>" +
          '<td data-label="Khách hàng"><div class="customer-name">' +
          o.customer +
          '</div><div class="customer-phone">' +
          o.phone +
          "</div></td>" +
          '<td data-label="Dịch vụ">' +
          o.service +
          "</td>" +
          '<td data-label="Trạng thái"><span class="status-pill ' +
          st.className +
          '">' +
          st.label +
          "</span></td>" +
          '<td data-label="Thao tác">' +
          '<button type="button" class="btn btn-sm btn-outline-cyan btn-order-detail" data-order-id="' +
          (o.id || "") +
          '"' +
          (o.id ? "" : " disabled") +
          ">Xem chi tiết</button>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  async function getBookingById(orderId) {
    var result = await Promise.resolve(
      window.krudList({
        table: BOOKING_TABLE,
        where: [{ field: "id", operator: "=", value: orderId }],
        limit: 1,
      }),
    );
    return getRows(result)[0] || null;
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = text(value);
  }

  function setPaymentBadge(value) {
    var node = document.getElementById("detailPaymentStatus");
    if (!node) return;
    var paid =
      String(value || "")
        .trim()
        .toLowerCase() === "paid";
    node.textContent = paid ? "Đã thanh toán" : "Chưa thanh toán";
    node.classList.add("payment-status-badge");
    node.classList.remove(
      "payment-status-paid",
      "payment-status-unpaid",
      "payment-status-unknown",
    );
    node.classList.add(paid ? "payment-status-paid" : "payment-status-unpaid");
  }

  function fillOrderDetailModal(order) {
    var stKey = statusFromDates(order);
    var stLabel = (statusConfig[stKey] || statusConfig.pending).label;
    var supplierId = Number(
      order.idnhacungcap || order.id_ncc || order.manhacungcap,
    );
    var hasSupplierInfo =
      (Number.isFinite(supplierId) && supplierId > 0) ||
      String(order.tennhacungcap || "").trim() !== "" ||
      String(order.sdt_ncc || "").trim() !== "" ||
      String(order.email_ncc || "").trim() !== "" ||
      String(order.diachi_ncc || "").trim() !== "";

    var supplierName = hasSupplierInfo ? order.tennhacungcap : "Chưa có";
    var supplierPhone = hasSupplierInfo ? order.sdt_ncc : "Chưa có";
    var supplierEmail = hasSupplierInfo ? order.email_ncc : "Chưa có";
    var supplierAddress = hasSupplierInfo ? order.diachi_ncc : "Chưa có";

    setText("detailOrderCode", formatOrderDisplayId(order.id));
    setText("detailSubService", order.dichvu || order.dichvuquantam);
    setText("detailWorkItems", order.danhsachcongviec);
    setText("detailChemicals", order.danhsachhoachat);
    setText(
      "detailTransportMethod",
      order.hinhthucnhangiao || order.phuongthucgiaonhan,
    );
    setText(
      "detailQuantity",
      order.soluong || order.khoiluong || order.quantity,
    );

    setText(
      "detailBookingDate",
      formatDate(order.ngaydat || order.ngaytao || order.created_at),
    );
    setText("detailOrderStatus", stLabel);
    setPaymentBadge(order.trangthaithanhtoan);
    setText("detailServiceFee", money(order.giadichvu));
    setText("detailTransportFee", money(order.tiendichuyen));
    setText("detailSurchargeFee", money(order.phuphigiaonhan));
    setText("detailTotalFee", money(order.tongtien));
    setText("detailNote", order.ghichu);

    setText("detailCustomerName", order.hovaten || order.tenkhachhang);
    setText("detailCustomerPhone", order.sodienthoai || order.phone);
    setText("detailCustomerEmail", order.email);
    setText("detailCustomerAddress", order.diachi);

    setText("detailSupplierName", supplierName);
    setText("detailSupplierPhone", supplierPhone);
    setText("detailSupplierEmail", supplierEmail);
    setText("detailSupplierAddress", supplierAddress);

    var completeBtn = document.getElementById("detailCompleteBtn");
    if (completeBtn) {
      completeBtn.dataset.orderId = String(order.id || "");
      if (stKey === "pending") {
        completeBtn.classList.add("d-none");
        completeBtn.disabled = true;
        completeBtn.textContent = "Hoàn thành";
        return;
      }

      completeBtn.classList.remove("d-none");
      if (stKey === "completed") {
        completeBtn.disabled = true;
        completeBtn.textContent = "Đã hoàn thành";
      } else {
        completeBtn.disabled = false;
        completeBtn.textContent = "Hoàn thành";
      }
    }
  }

  async function openOrderDetailModal(orderId) {
    var modalElement = document.getElementById("orderDetailModal");
    if (!modalElement) return;

    var order = await getBookingById(orderId);
    if (!order) return;

    fillOrderDetailModal(order);
    window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
  }

  async function updateOrderStatusToCompleted(orderId) {
    await Promise.resolve(
      window.krud(
        "update",
        BOOKING_TABLE,
        {
          ngayhoanthanh: new Date().toISOString(),
          trangthaithanhtoan: "Paid",
        },
        orderId,
      ),
    );
  }

  async function refreshDashboardData() {
    renderNewOrdersLoading();
    try {
      await loadDashboardOrders();
      renderSummaryCards();
      renderNewOrders();
      renderActiveOrders();
    } catch (_e) {
      newOrders = [];
      activeOrders = [];
      renderSummaryCards();
      renderNewOrdersError();
      renderActiveOrders();
    }
  }

  function bindOrderDetailAction() {
    function onClick(event) {
      var button = event.target.closest(".btn-order-detail");
      if (!button) return;
      var orderId = Number(button.getAttribute("data-order-id"));
      if (!orderId) return;

      var oldText = button.textContent;
      button.disabled = true;
      button.textContent = "Đang tải...";

      openOrderDetailModal(orderId)
        .catch(function () {})
        .finally(function () {
          button.disabled = false;
          button.textContent = oldText;
        });
    }

    var newTbody = document.getElementById("newOrdersBody");
    var activeTbody = document.getElementById("activeOrdersBody");
    if (newTbody) newTbody.addEventListener("click", onClick);
    if (activeTbody) activeTbody.addEventListener("click", onClick);
  }

  function bindCompleteOrderAction() {
    var button = document.getElementById("detailCompleteBtn");
    var modalElement = document.getElementById("orderDetailModal");
    if (!button || !modalElement) return;

    button.addEventListener("click", async function () {
      var orderId = Number(button.dataset.orderId);
      if (!orderId) return;

      var oldText = button.textContent;
      button.disabled = true;
      button.textContent = "Đang cập nhật...";

      try {
        await updateOrderStatusToCompleted(orderId);
        await refreshDashboardData();
        window.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
      } catch (_e) {
        button.disabled = false;
        button.textContent = oldText;
      }
    });
  }

  function bindRefreshAction() {
    var refreshBtn = document.getElementById("btnRefreshDashboard");
    if (!refreshBtn) return;

    refreshBtn.addEventListener("click", async function () {
      refreshBtn.classList.add("is-loading");
      refreshBtn.disabled = true;
      await refreshDashboardData();
      refreshBtn.classList.remove("is-loading");
      refreshBtn.disabled = false;
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    window.ProviderDashboard = { refreshDashboardData: refreshDashboardData };
    renderSummaryCards();
    renderNewOrdersLoading();
    renderActiveOrders();
    bindRefreshAction();
    bindOrderDetailAction();
    bindCompleteOrderAction();
    await refreshDashboardData();
  });
})();
