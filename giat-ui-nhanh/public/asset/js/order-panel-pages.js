(function (window, document) {
  "use strict";

  var PAGE_SIZE = 6;
  var BOOKING_TABLE = "datlich_giatuinhanh";
  var CUSTOMER_TABLE = "khachhang";
  var PROVIDER_TABLE = "nhacungcap_giatuinhanh";
  var SESSION_ENDPOINT = "../public/session-user.php?action=get";
  var ADMIN_SESSION_ENDPOINT = "../public/session-admin.php?action=get";
  var CUSTOMER_LOGIN_PAGE = "../dang-nhap.html";
  var PROVIDER_LOGIN_PAGE = "../dang-nhap-nha-cung-cap.html";
  var ADMIN_LOGIN_PAGE = "dang-nhap-admin.html";
  var PROVIDER_DASHBOARD_PAGE = "../nha-cung-cap.html";
  var shared = window.SharedOrderUtils || {};

  function hasDateValue(value) {
    if (value == null) return false;
    var text = String(value).trim().toLowerCase();
    return (
      text !== "" &&
      text !== "null" &&
      text !== "undefined" &&
      text !== "0000-00-00" &&
      text !== "0000-00-00 00:00:00"
    );
  }

  function hasOrderLifecycleDates(row) {
    return (
      hasDateValue(
        row &&
          (row.ngayhuy || row.ngay_huy || row.canceled_at || row.cancel_at),
      ) ||
      hasDateValue(
        row &&
          (row.ngaynhan || row.ngay_nhan || row.received_at || row.receive_at),
      ) ||
      hasDateValue(
        row &&
          (row.ngayhoanthanh ||
            row.ngay_hoan_thanh ||
            row.completed_at ||
            row.complete_at),
      )
    );
  }

  function getRole() {
    var role = String(
      document.body.getAttribute("data-role") || "",
    ).toLowerCase();
    if (role === "admin") return "admin";
    return role === "provider" ? "provider" : "customer";
  }

  function getPageType() {
    return String(document.body.getAttribute("data-page") || "").toLowerCase();
  }

  function orderCode(id) {
    var numeric = Number(id);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "-";
    }
    return String(Math.floor(numeric)).padStart(7, "0");
  }

  function statusMeta(status) {
    var value = String(status || "").toLowerCase();
    if (value === "accepted") {
      return { label: "Đã nhận đơn", className: "status-accepted" };
    }
    if (value === "processing") {
      return { label: "Đang thực hiện", className: "status-processing" };
    }
    if (value === "completed") {
      return { label: "Hoàn thành", className: "status-completed" };
    }
    if (value === "canceled") {
      return { label: "Đã hủy", className: "status-canceled" };
    }
    return { label: "Chờ xử lý", className: "status-pending" };
  }

  function statusProgress(status) {
    var value = String(status || "").toLowerCase();
    if (value === "completed") return 100;
    if (value === "accepted") return 45;
    if (value === "processing") return 62;
    if (value === "canceled") return 0;
    return 20;
  }

  function formatCurrency(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    return n.toLocaleString("vi-VN") + " đ";
  }

  function formatDateTime(value) {
    if (!value) return "--/--/---- --:--";
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "--/--/---- --:--";
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(value) {
    if (!value) return "--/--/----";
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "--/--/----";
    return date.toLocaleDateString("vi-VN");
  }

  function formatTime(value) {
    if (!value) return "--:--";
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "--:--";
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function addDays(value, days) {
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    date.setDate(date.getDate() + Number(days || 0));
    return date;
  }

  function formatCurrencyVnd(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    return n.toLocaleString("vi-VN") + " VND";
  }

  function safeText(value) {
    var text = String(value || "").trim();
    return text || "---";
  }

  function getPaymentStatusLabel(value) {
    if (shared && typeof shared.getPaymentStatusLabel === "function") {
      return shared.getPaymentStatusLabel(value);
    }
    return String(value || "")
      .trim()
      .toLowerCase() === "paid"
      ? "Đã thanh toán"
      : "Chưa thanh toán";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initialsOf(name, fallback) {
    var text = String(name || "").trim();
    if (!text) return fallback || "--";
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return fallback || "--";
    var first = words[0].charAt(0);
    var last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  }

  function deriveSchedule(order) {
    var created = new Date(order.createdAt);
    var updated = new Date(order.updatedAt);

    var expectedStart = Number.isFinite(created.getTime()) ? created : null;
    var expectedEnd = addDays(expectedStart || order.createdAt, 7);

    var actualStart = null;
    if (order.timeline && order.timeline.length > 1) {
      actualStart = new Date(order.timeline[1].at);
      if (!Number.isFinite(actualStart.getTime())) {
        actualStart = null;
      }
    }

    var actualEnd = null;
    if (String(order.status).toLowerCase() === "completed") {
      actualEnd = Number.isFinite(updated.getTime()) ? updated : null;
    }

    if (String(order.status).toLowerCase() === "canceled") {
      actualEnd = Number.isFinite(updated.getTime()) ? updated : null;
    }

    return {
      expectedStart: expectedStart,
      expectedEnd: expectedEnd,
      actualStart: actualStart,
      actualEnd: actualEnd,
    };
  }

  function toNumber(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function pickFirstValue(values) {
    var items = Array.isArray(values) ? values : [];
    for (var i = 0; i < items.length; i += 1) {
      var text = String(items[i] == null ? "" : items[i]).trim();
      if (text) return text;
    }
    return "";
  }

  function hasAssignedProviderRow(row) {
    var providerId = String(
      (row &&
        (row.idnhacungcap ||
          row.id_ncc ||
          row.manhacungcap ||
          row.provider_id ||
          (row.nhacungcap &&
            (row.nhacungcap.id ||
              row.nhacungcap.idnhacungcap ||
              row.nhacungcap.provider_id ||
              row.nhacungcap.manhacungcap)))) ||
        "",
    ).trim();

    if (!providerId || providerId === "0") return false;

    var providerName = pickFirstValue([
      row && row.tennhacungcap,
      row && row.nhacungcap && row.nhacungcap.hovaten,
      row && row.nhacungcap && row.nhacungcap.user_name,
    ]);

    var providerPhone = String(
      (row &&
        (row.sdt_ncc ||
          row.sodienthoai_ncc ||
          row.phone_ncc ||
          (row.nhacungcap &&
            (row.nhacungcap.sodienthoai ||
              row.nhacungcap.user_tel ||
              row.nhacungcap.sdt)))) ||
        "",
    )
      .replace(/\s+/g, "")
      .trim();
    if (providerPhone.indexOf("+84") === 0)
      providerPhone = "0" + providerPhone.slice(3);
    if (providerPhone.indexOf("84") === 0 && providerPhone.length >= 11) {
      providerPhone = "0" + providerPhone.slice(2);
    }

    var providerEmail = String(
      (row &&
        (row.email_ncc ||
          (row.nhacungcap &&
            (row.nhacungcap.email || row.nhacungcap.user_email)))) ||
        "",
    )
      .trim()
      .toLowerCase();

    return Boolean(providerName || providerPhone || providerEmail);
  }

  function normalizeAvatarCandidates(rawValue, kind) {
    var text = String(rawValue == null ? "" : rawValue).trim();
    if (!text) return [];

    var lower = text.toLowerCase();
    if (lower.indexOf("javascript:") === 0) return [];

    var candidates = [];
    var encodedText =
      text.indexOf("/") >= 0 ? encodeURI(text) : encodeURIComponent(text);

    if (
      lower.indexOf("http://") === 0 ||
      lower.indexOf("https://") === 0 ||
      lower.indexOf("data:") === 0 ||
      lower.indexOf("blob:") === 0
    ) {
      candidates.push(encodedText);
      return candidates;
    }

    if (text.charAt(0) === "/") {
      candidates.push(encodedText);
      return candidates;
    }

    if (text.indexOf("../") === 0 || text.indexOf("./") === 0) {
      candidates.push(encodedText);
      return candidates;
    }

    candidates.push(encodedText);

    if (
      text.indexOf("public/") === 0 ||
      text.indexOf("asset/") === 0 ||
      text.indexOf("uploads/") === 0
    ) {
      candidates.push("../" + encodedText);
    }

    if (text.indexOf("/") < 0) {
      if (kind === "provider") {
        candidates.push(
          "../public/asset/image/upload/nhacungcap/" + encodeURIComponent(text),
        );
      }
      if (kind === "customer") {
        candidates.push(
          "../public/asset/image/upload/khachhang/" + encodeURIComponent(text),
        );
      }
      candidates.push("../uploads/" + encodeURIComponent(text));
      candidates.push("../public/uploads/" + encodeURIComponent(text));
    }

    return candidates.filter(function (value, index, list) {
      return value && list.indexOf(value) === index;
    });
  }

  function renderAvatarBadge(id, avatarValue, fallbackText, kind) {
    var node = document.getElementById(id);
    if (!node) return;

    var fallback = String(fallbackText || "--").trim() || "--";
    var candidates = normalizeAvatarCandidates(avatarValue, kind);

    node.classList.remove("has-image");
    node.textContent = fallback;

    if (!candidates.length) return;

    var probe = new Image();
    var index = 0;

    function tryNext() {
      if (index >= candidates.length) {
        node.classList.remove("has-image");
        node.textContent = fallback;
        return;
      }

      var src = candidates[index];
      index += 1;

      probe.onload = function () {
        var image = document.createElement("img");
        image.className = "avatar-image";
        image.src = src;
        image.alt = fallback;
        node.textContent = "";
        node.appendChild(image);
        node.classList.add("has-image");
      };

      probe.onerror = tryNext;
      probe.src = src;
    }

    tryNext();
  }

  function normalizeAccountType(value) {
    var type = String(value || "")
      .trim()
      .toLowerCase();
    if (
      type === "provider" ||
      type === "supplier" ||
      type === "nhacungcap" ||
      type === "nha-cung-cap"
    ) {
      return "provider";
    }
    return "customer";
  }

  function mapDbStatusToPanel(status) {
    var value = String(status || "").toLowerCase();
    if (value === "cancel") return "canceled";
    if (value === "completed") return "completed";
    if (value === "accepted" || value === "received") return "accepted";
    if (value === "processing") return "processing";
    return "pending";
  }

  function buildTimelineFromDbRow(row, status, createdAt) {
    var timeline = [
      {
        at: createdAt,
        title: "Đơn hàng được tạo",
        detail: "Khách hàng đã gửi yêu cầu dịch vụ.",
      },
    ];

    if (row && (row.ngaynhan || row.ngay_nhan || row.received_at)) {
      timeline.push({
        at: row.ngaynhan || row.ngay_nhan || row.received_at,
        title: "Nhà cung cấp xác nhận",
        detail: "Đơn hàng đã được nhà cung cấp tiếp nhận.",
      });
    }

    if (row && (row.ngaybatdau || row.ngay_bat_dau || row.started_at)) {
      timeline.push({
        at: row.ngaybatdau || row.ngay_bat_dau || row.started_at,
        title: "Bắt đầu xử lý",
        detail: "Nhà cung cấp đã bắt đầu thực hiện đơn hàng.",
      });
    }

    if (status === "completed") {
      timeline.push({
        at: (row && row.ngayhoanthanh) || createdAt,
        title: "Hoàn thành",
        detail: "Đơn hàng đã hoàn tất.",
      });
    }

    if (status === "canceled") {
      timeline.push({
        at: (row && row.ngayhuy) || createdAt,
        title: "Đã hủy",
        detail: "Đơn hàng đã bị hủy.",
      });
    }

    return timeline;
  }

  function mapDbOrderToPanelOrder(row) {
    var createdAt =
      (row && (row.ngaydat || row.ngaytao || row.created_at)) ||
      new Date().toISOString();
    var updatedAt =
      (row &&
        (row.ngayhoanthanh ||
          row.ngayhuy ||
          row.ngaybatdau ||
          row.ngay_bat_dau ||
          row.started_at ||
          row.ngaynhan ||
          row.ngay_nhan ||
          row.received_at ||
          row.updated_at)) ||
      createdAt;

    var rawStatus =
      typeof shared.getOrderStatus === "function"
        ? shared.getOrderStatus(row)
        : row && (row.ngayhuy || row.ngay_huy || row.canceled_at)
          ? "cancel"
          : row &&
              (row.ngayhoanthanh || row.ngay_hoan_thanh || row.completed_at)
            ? "completed"
            : row && (row.ngaybatdau || row.ngay_bat_dau || row.started_at)
              ? "processing"
              : row && (row.ngaynhan || row.ngay_nhan || row.received_at)
                ? "accepted"
                : "pending";
    var status = mapDbStatusToPanel(rawStatus);

    var qty = toNumber(row && row.soluong);
    if (qty <= 0) qty = 1;

    var servicePrice = toNumber(row && row.giadichvu);
    var transportFee = toNumber(row && row.tiendichuyen);
    var surchargeFee = toNumber(row && row.phuphigiaonhan);
    var totalAmount = toNumber(row && row.tongtien);
    var hasAssignedProvider = hasAssignedProviderRow(row);

    return {
      id: toNumber(row && row.id),
      service: (row && row.dichvu) || "Dịch vụ giặt ủi",
      createdAt: createdAt,
      updatedAt: updatedAt,
      status: status,
      customer: {
        id: toNumber(
          row &&
            (row.idkhachhang ||
              row.makhachhang ||
              row.user_id ||
              (row.khachhang &&
                (row.khachhang.id ||
                  row.khachhang.makhachhang ||
                  row.khachhang.user_id))),
        ),
        name:
          (row && row.hovaten) ||
          (row && row.khachhang && row.khachhang.hovaten) ||
          (row && row.khachhang && row.khachhang.user_name) ||
          "Khách hàng",
        phone:
          (row && row.sodienthoai) ||
          (row && row.khachhang && row.khachhang.sodienthoai) ||
          (row && row.khachhang && row.khachhang.user_tel) ||
          "",
        email:
          (row && row.email) ||
          (row && row.khachhang && row.khachhang.email) ||
          (row && row.khachhang && row.khachhang.user_email) ||
          "",
        address:
          (row && row.diachi) ||
          (row && row.khachhang && row.khachhang.diachi) ||
          "",
        avatar: pickFirstValue([
          row && row.avatar_kh,
          row && row.avatar_khachhang,
          row && row.avatar_customer,
          row && row.customer_avatar,
          row && row.avatartenfile,
          row && row.khachhang && row.khachhang.avatar,
          row && row.khachhang && row.khachhang.avatar_kh,
          row && row.khachhang && row.khachhang.avatartenfile,
        ]),
      },
      provider: {
        id: hasAssignedProvider
          ? toNumber(
              row &&
                (row.idnhacungcap ||
                  row.id_ncc ||
                  row.manhacungcap ||
                  row.provider_id ||
                  (row.nhacungcap &&
                    (row.nhacungcap.id ||
                      row.nhacungcap.idnhacungcap ||
                      row.nhacungcap.provider_id ||
                      row.nhacungcap.manhacungcap))),
            )
          : 0,
        name: hasAssignedProvider
          ? (row && row.tennhacungcap) ||
            (row &&
              row.nhacungcap &&
              (row.nhacungcap.hovaten || row.nhacungcap.user_name)) ||
            "Chưa phân công"
          : "Chưa phân công",
        phone: hasAssignedProvider
          ? (row && row.sdt_ncc) ||
            (row && row.sodienthoai_ncc) ||
            (row && row.phone_ncc) ||
            (row &&
              row.nhacungcap &&
              (row.nhacungcap.sodienthoai ||
                row.nhacungcap.user_tel ||
                row.nhacungcap.sdt)) ||
            ""
          : "",
        email: hasAssignedProvider
          ? (row && row.email_ncc) ||
            (row &&
              row.nhacungcap &&
              (row.nhacungcap.email || row.nhacungcap.user_email)) ||
            ""
          : "",
        address: hasAssignedProvider
          ? (row && row.diachi_ncc) ||
            (row && row.address_ncc) ||
            (row && row.nhacungcap && row.nhacungcap.diachi) ||
            ""
          : "",
        avatar: hasAssignedProvider
          ? pickFirstValue([
              row && row.avatar_ncc,
              row && row.avatar_nhacungcap,
              row && row.provider_avatar,
              row && row.nhacungcap && row.nhacungcap.avatar,
              row && row.nhacungcap && row.nhacungcap.avatar_ncc,
              row && row.nhacungcap && row.nhacungcap.avatartenfile,
            ])
          : "",
      },
      raw: row || null,
      items: [
        {
          name:
            (row && (row.hinhthucnhangiao || row.dichvu || "Dịch vụ")) ||
            "Dịch vụ",
          quantity: qty,
          unitPrice: servicePrice,
        },
      ],
      extraFee: transportFee + surchargeFee,
      discount: 0,
      totalAmount: totalAmount,
      serviceFee: servicePrice,
      transportFee: transportFee,
      surchargeFee: surchargeFee,
      paymentStatus:
        (row &&
          (row.trangthaithanhtoan ||
            row.trang_thai_thanh_toan ||
            row.payment_status ||
            row.paymentStatus)) ||
        "Unpaid",
      deliveryMethod:
        (row &&
          (row.hinhthucnhangiao ||
            row.phuongthucgiaonhan ||
            row.transport_option)) ||
        "",
      note: (row && row.ghichu) || "Không có ghi chú.",
      workItemsText:
        (row &&
          (row.danhsachcongviec || row.congviec || row.danhsach_congviec)) ||
        "",
      chemicalsText:
        (row &&
          (row.danhsachhoachat || row.hoachathotro || row.danhsach_hoachat)) ||
        "",
      receivedAt:
        (row && (row.ngaynhan || row.ngay_nhan || row.received_at)) || "",
      startedAt:
        (row && (row.ngaybatdau || row.ngay_bat_dau || row.started_at)) || "",
      completedAt:
        (row &&
          (row.ngayhoanthanh || row.ngay_hoan_thanh || row.completed_at)) ||
        "",
      timeline: buildTimelineFromDbRow(row, status, createdAt),
    };
  }

  function getSessionUser() {
    return fetch(SESSION_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    })
      .then(function (response) {
        if (!response.ok) return null;
        return response.json().catch(function () {
          return null;
        });
      })
      .then(function (result) {
        if (!result || result.hasUser !== true || !result.user) return null;
        return result.user;
      })
      .catch(function () {
        return null;
      });
  }

  function getSessionAdmin() {
    return fetch(ADMIN_SESSION_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    })
      .then(function (response) {
        if (!response.ok) return null;
        return response.json().catch(function () {
          return null;
        });
      })
      .then(function (result) {
        if (!result || result.hasAdmin !== true || !result.admin) return null;
        return result.admin;
      })
      .catch(function () {
        return null;
      });
  }

  function syncCustomerChip(user) {
    var emailNode = document.querySelector(".admin-chip .admin-email");
    var avatarNode = document.querySelector(".admin-chip .admin-avatar");
    var displayName =
      String(
        user.user_name ||
          user.hovaten ||
          user.hoten ||
          user.name ||
          user.full_name ||
          user.display_name ||
          "",
      ).trim() ||
      String(user.user_email || "").trim() ||
      String(user.user_tel || "").trim() ||
      "Khách hàng";

    if (emailNode) {
      emailNode.textContent = displayName;
    }
    if (avatarNode) {
      avatarNode.textContent = initialsOf(displayName, "KH");
    }
  }

  function syncProviderChip(user) {
    var emailNode = document.querySelector(".admin-chip .admin-email");
    var avatarNode = document.querySelector(".admin-chip .admin-avatar");
    var displayName =
      String(
        user.user_name ||
          user.hovaten ||
          user.hoten ||
          user.tennhacungcap ||
          user.name ||
          user.full_name ||
          user.display_name ||
          "",
      ).trim() ||
      String(user.user_email || "").trim() ||
      String(user.user_tel || "").trim() ||
      "Nhà cung cấp";

    if (emailNode) {
      emailNode.textContent = displayName;
    }
    if (avatarNode) {
      avatarNode.textContent = initialsOf(displayName, "NCC");
    }
  }

  function syncAdminChip(admin) {
    var emailNode = document.querySelector(".admin-chip .admin-email");
    var avatarNode = document.querySelector(".admin-chip .admin-avatar");
    if (emailNode) {
      emailNode.textContent =
        String((admin && admin.email) || "").trim() || "admin@giatuinhanh.vn";
    }
    if (avatarNode) {
      avatarNode.textContent = initialsOf(
        String((admin && admin.email) || "Admin").trim(),
        "AD",
      );
    }
  }

  function resolveProviderId(user) {
    var row = user || {};
    var candidates = [row.id, row.idnhacungcap, row.provider_id, row.user_id];
    for (var i = 0; i < candidates.length; i += 1) {
      var providerId = toNumber(candidates[i]);
      if (providerId > 0) return providerId;
    }
    return 0;
  }

  function resolveOrderProviderId(row) {
    return toNumber(
      row &&
        (row.idnhacungcap || row.id_ncc || row.manhacungcap || row.provider_id),
    );
  }

  function loadProviderOrders(user) {
    if (
      typeof shared.fetchAllOrders !== "function" ||
      typeof window.krudList !== "function"
    ) {
      return Promise.resolve({
        providerId: 0,
        pendingOrders: [],
        assignedOrders: [],
        statsOrders: [],
        allOrders: [],
      });
    }

    var providerId = resolveProviderId(user);

    return Promise.resolve(
      shared.fetchAllOrders(BOOKING_TABLE, 500, 1, {
        customerTable: CUSTOMER_TABLE,
        providerTable: PROVIDER_TABLE,
      }),
    )
      .then(function (rows) {
        var pendingOrders = [];
        var assignedOrders = [];

        (rows || []).forEach(function (row) {
          var mappedOrder = mapDbOrderToPanelOrder(row);
          var status = String(mappedOrder.status || "").toLowerCase();

          if (status === "pending") {
            pendingOrders.push(mappedOrder);
            return;
          }

          if (providerId <= 0) return;
          if (resolveOrderProviderId(row) !== providerId) return;
          if (
            status === "accepted" ||
            status === "processing" ||
            status === "completed"
          ) {
            assignedOrders.push(mappedOrder);
          }
        });

        pendingOrders.sort(function (a, b) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        assignedOrders.sort(function (a, b) {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });

        var statsOrders = pendingOrders.concat(assignedOrders);

        return {
          providerId: providerId,
          pendingOrders: pendingOrders,
          assignedOrders: assignedOrders,
          statsOrders: statsOrders,
          allOrders: statsOrders.slice(),
        };
      })
      .catch(function () {
        return {
          providerId: providerId,
          pendingOrders: [],
          assignedOrders: [],
          statsOrders: [],
          allOrders: [],
        };
      });
  }

  function loadCustomerOrders(user) {
    if (
      typeof shared.fetchOrdersByPhone !== "function" ||
      typeof window.krudList !== "function"
    ) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      shared.fetchOrdersByPhone(BOOKING_TABLE, user && user.user_tel, 10, {
        customerTable: CUSTOMER_TABLE,
        providerTable: PROVIDER_TABLE,
      }),
    )
      .then(function (rows) {
        return (rows || []).map(mapDbOrderToPanelOrder).sort(function (a, b) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      })
      .catch(function () {
        return [];
      });
  }

  function loadAdminOrders() {
    if (
      typeof shared.fetchAllOrders !== "function" ||
      typeof window.krudList !== "function"
    ) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      shared.fetchAllOrders(BOOKING_TABLE, 500, 1, {
        customerTable: CUSTOMER_TABLE,
        providerTable: PROVIDER_TABLE,
      }),
    )
      .then(function (rows) {
        return (rows || []).map(mapDbOrderToPanelOrder).sort(function (a, b) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      })
      .catch(function () {
        return [];
      });
  }

  function calculateSubTotal(order) {
    var items = (order && order.items) || [];
    return items.reduce(function (sum, item) {
      var qty = Number(item.quantity) || 0;
      var price = Number(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }

  function calculateTotal(order) {
    var totalAmount = Number(order && order.totalAmount);
    if (Number.isFinite(totalAmount) && totalAmount > 0) {
      return totalAmount;
    }
    var subtotal = calculateSubTotal(order);
    var extraFee = Number(order && order.extraFee) || 0;
    var discount = Number(order && order.discount) || 0;
    return subtotal + extraFee - discount;
  }

  function parseQueryId() {
    var params = new URLSearchParams(window.location.search);
    var id = Number(params.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    return Math.floor(id);
  }

  function renderStats(orders, role) {
    var mount = document.getElementById("statsGrid");
    if (!mount) return;

    var counts = {
      total: orders.length,
      pending: 0,
      accepted: 0,
      processing: 0,
      completed: 0,
      canceled: 0,
    };

    orders.forEach(function (order) {
      var key = String(
        order && order.status ? order.status : "pending",
      ).toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      }
    });

    var cards =
      role === "provider"
        ? [
            {
              key: "pending",
              label: "Đơn mới & Chờ nhận",
              icon: "fas fa-bullhorn",
            },
            {
              key: "accepted",
              label: "Đã nhận đơn",
              icon: "fas fa-clipboard-check",
            },
            {
              key: "processing",
              label: "Đang thực hiện",
              icon: "fas fa-spinner",
            },
            {
              key: "completed",
              label: "Đã hoàn thành",
              icon: "fas fa-cogs",
            },
          ]
        : [
            { key: "total", label: "Tổng đơn", icon: "fas fa-boxes" },
            {
              key: "pending",
              label: "Chờ xử lý",
              icon: "fas fa-hourglass-half",
            },
            {
              key: "accepted",
              label: "Đã nhận đơn",
              icon: "fas fa-clipboard-check",
            },
            {
              key: "processing",
              label: "Đang thực hiện",
              icon: "fas fa-spinner",
            },
            {
              key: "completed",
              label: "Hoàn thành",
              icon: "fas fa-check-circle",
            },
            {
              key: "canceled",
              label: "Đã hủy",
              icon: "fas fa-times-circle",
            },
          ];

    mount.innerHTML = cards
      .map(function (card) {
        return (
          '<div class="col-12 col-sm-6 col-xl">' +
          '<article class="metric-card" data-tone="' +
          card.key +
          '">' +
          '<span class="metric-icon"><i class="' +
          card.icon +
          '" aria-hidden="true"></i></span>' +
          '<div class="metric-body">' +
          '<p class="metric-title">' +
          card.label +
          "</p>" +
          '<p class="metric-value">' +
          counts[card.key] +
          "</p>" +
          "</div>" +
          "</article>" +
          "</div>"
        );
      })
      .join("");
  }

  function initListPage(role, sourceOrders) {
    var providerSource =
      role === "provider" && sourceOrders && !Array.isArray(sourceOrders)
        ? sourceOrders
        : null;
    var allOrders = providerSource
      ? providerSource.pendingOrders || []
      : Array.isArray(sourceOrders)
        ? sourceOrders
        : [];
    var assignedOrders = providerSource
      ? providerSource.assignedOrders || []
      : [];
    var statsOrders = providerSource
      ? providerSource.statsOrders || allOrders
      : allOrders;
    var providerContextUser = providerSource
      ? providerSource.providerUser || { id: providerSource.providerId }
      : null;

    var state = {
      page: 1,
      pageSize: PAGE_SIZE,
      filtered: allOrders.slice(),
      all: allOrders,
    };
    var assignedState = {
      page: 1,
      pageSize: PAGE_SIZE,
      filtered: assignedOrders.slice(),
      all: assignedOrders.slice(),
    };

    var tbody = document.getElementById("ordersTableBody");
    var countNode = document.getElementById("ordersCount");
    var paginationNode = document.getElementById("ordersPagination");
    var emptyHintNode = document.getElementById("ordersEmptyHint");
    var form = document.getElementById("orderFilterForm");
    var assignedTbody = document.getElementById("providerAssignedTableBody");
    var assignedCountNode = document.getElementById("providerAssignedCount");
    var assignedEmptyHintNode = document.getElementById(
      "providerAssignedEmptyHint",
    );
    var assignedPaginationNode = document.getElementById(
      "providerAssignedPagination",
    );
    var assignedFilterForm = document.getElementById(
      "providerAssignedFilterForm",
    );

    renderStats(statsOrders, role);

    function setAcceptButtonLoading(button, isLoading) {
      if (!button) return;
      if (isLoading) {
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.textContent || "Nhận đơn";
        }
        button.disabled = true;
        button.textContent = "Đang nhận...";
        return;
      }

      button.disabled = false;
      button.textContent = button.dataset.originalText || "Nhận đơn";
    }

    function setActionButtonLoading(
      button,
      isLoading,
      fallbackText,
      loadingText,
    ) {
      if (!button) return;
      if (isLoading) {
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.textContent || fallbackText;
        }
        button.disabled = true;
        button.textContent = loadingText;
        return;
      }

      button.disabled = false;
      button.textContent = button.dataset.originalText || fallbackText;
    }

    function handleAcceptOrder(orderId) {
      if (
        window.ProviderOrderAccept &&
        typeof window.ProviderOrderAccept.handleAcceptOrder === "function"
      ) {
        return window.ProviderOrderAccept.handleAcceptOrder(orderId);
      }

      return Promise.reject(
        new Error("Chưa sẵn sàng chức năng nhận đơn. Vui lòng tải lại trang."),
      );
    }

    function handleCompleteOrder(orderId) {
      if (typeof shared.completeProviderOrder === "function") {
        return shared.completeProviderOrder(orderId, BOOKING_TABLE);
      }
      if (typeof shared.updateOrder === "function") {
        return shared.updateOrder(BOOKING_TABLE, orderId, {
          ngayhoanthanh: new Date().toISOString(),
          trangthaithanhtoan: "Paid",
        });
      }
      return Promise.reject(
        new Error("Chưa sẵn sàng chức năng hoàn thành đơn."),
      );
    }

    function handleStartOrder(orderId) {
      if (typeof shared.startProviderOrder === "function") {
        return shared.startProviderOrder(orderId, BOOKING_TABLE);
      }
      if (typeof shared.updateOrder === "function") {
        return shared.updateOrder(BOOKING_TABLE, orderId, {
          ngaybatdau: new Date().toISOString(),
        });
      }
      return Promise.reject(new Error("Chưa sẵn sàng chức năng bắt đầu đơn."));
    }

    function handleCancelOrder(orderId) {
      if (typeof shared.updateOrder !== "function") {
        return Promise.reject(new Error("Chưa sẵn sàng chức năng hủy đơn."));
      }
      return shared.updateOrder(BOOKING_TABLE, orderId, {
        ngayhuy: new Date().toISOString(),
      });
    }

    function patchOrderLocally(orderId, updater) {
      function patchList(list) {
        (list || []).forEach(function (item) {
          if (Number(item.id) !== Number(orderId)) return;
          updater(item);
        });
      }

      patchList(state.all);
      patchList(state.filtered);
      patchList(assignedState.all);
      patchList(assignedState.filtered);
      patchList(statsOrders);
    }

    function refreshProviderOrders() {
      if (role !== "provider") {
        return Promise.resolve();
      }

      return loadProviderOrders(providerContextUser).then(function (bundle) {
        var nextBundle = bundle || {};
        state.all = Array.isArray(nextBundle.pendingOrders)
          ? nextBundle.pendingOrders
          : [];
        state.filtered = state.all.slice();
        assignedOrders = Array.isArray(nextBundle.assignedOrders)
          ? nextBundle.assignedOrders
          : [];
        assignedState.all = assignedOrders.slice();
        assignedState.filtered = assignedOrders.slice();
        assignedState.page = 1;
        statsOrders = Array.isArray(nextBundle.statsOrders)
          ? nextBundle.statsOrders
          : state.all.slice();
        state.page = 1;
        renderStats(statsOrders, role);
        renderRows();
        renderAssignedRows();
        renderPagination();
        renderAssignedPagination();
        updateCount();
        updateAssignedCount();
      });
    }

    function updateCount() {
      if (countNode) {
        countNode.textContent = state.filtered.length + " đơn";
      }
      if (emptyHintNode) {
        emptyHintNode.textContent =
          state.filtered.length > 0
            ? "Hiển thị " +
              Math.min(state.page * state.pageSize, state.filtered.length) +
              "/" +
              state.filtered.length +
              " đơn"
            : "Không có dữ liệu phù hợp bộ lọc.";
      }
    }

    function updateAssignedCount() {
      if (assignedCountNode) {
        assignedCountNode.textContent = assignedState.filtered.length + " đơn";
      }

      if (assignedEmptyHintNode) {
        assignedEmptyHintNode.textContent =
          assignedState.filtered.length > 0
            ? "Hiển thị " +
              Math.min(
                assignedState.page * assignedState.pageSize,
                assignedState.filtered.length,
              ) +
              "/" +
              assignedState.filtered.length +
              " đơn"
            : "Không có dữ liệu phù hợp bộ lọc.";
      }
    }

    function renderAssignedRows() {
      if (!assignedTbody) return;

      if (!assignedState.filtered.length) {
        assignedTbody.innerHTML =
          '<tr><td colspan="7" class="text-center py-4 text-muted">Chưa có đơn phụ trách xử lý.</td></tr>';
        return;
      }

      var start = (assignedState.page - 1) * assignedState.pageSize;
      var pageItems = assignedState.filtered.slice(
        start,
        start + assignedState.pageSize,
      );

      assignedTbody.innerHTML = pageItems
        .map(function (order) {
          var meta = statusMeta(order.status);
          var actionHtml =
            '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-hoa-don.html?id=' +
            order.id +
            '">Xem chi tiết</a>';

          var statusValue = String(order.status || "");
          if (statusValue === "accepted") {
            actionHtml =
              '<div class="d-flex gap-2 flex-wrap">' +
              '<button type="button" class="btn btn-sm btn-primary btn-start-order" data-order-id="' +
              order.id +
              '">Bắt đầu</button>' +
              '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-hoa-don.html?id=' +
              order.id +
              '">Xem chi tiết</a>' +
              "</div>";
          }

          if (statusValue === "processing") {
            actionHtml =
              '<div class="d-flex gap-2 flex-wrap">' +
              '<button type="button" class="btn btn-sm btn-success btn-complete-order" data-order-id="' +
              order.id +
              '">Hoàn thành</button>' +
              '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-hoa-don.html?id=' +
              order.id +
              '">Xem chi tiết</a>' +
              "</div>";
          }

          return (
            "<tr>" +
            '<td class="order-code">' +
            orderCode(order.id) +
            "</td>" +
            '<td><div class="customer-block"><strong>' +
            order.customer.name +
            "</strong><span>" +
            order.customer.phone +
            "</span></div></td>" +
            '<td><p class="service-text mb-0">' +
            order.service +
            "</p></td>" +
            "<td>" +
            formatDate(
              order.startedAt ||
                order.receivedAt ||
                order.updatedAt ||
                order.createdAt,
            ) +
            "</td>" +
            '<td><span class="status-pill ' +
            meta.className +
            '">' +
            meta.label +
            "</span></td>" +
            "<td>" +
            formatCurrency(calculateTotal(order)) +
            "</td>" +
            "<td>" +
            actionHtml +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    function renderRows() {
      if (!tbody) return;

      if (!state.filtered.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center py-4 text-muted">Không có đơn hàng phù hợp bộ lọc.</td></tr>';
        return;
      }

      var start = (state.page - 1) * state.pageSize;
      var pageItems = state.filtered.slice(start, start + state.pageSize);

      tbody.innerHTML = pageItems
        .map(function (order) {
          var meta = statusMeta(order.status);
          var actionHtml =
            '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-hoa-don.html?id=' +
            order.id +
            '">Xem chi tiết</a>';

          var canCancelCustomerOrder =
            role === "customer" &&
            !hasDateValue(
              (order && order.receivedAt) ||
                (order && order.raw && order.raw.ngaynhan),
            ) &&
            String(order.status || "") !== "completed" &&
            String(order.status || "") !== "canceled";

          if (role === "provider" && String(order.status) === "pending") {
            actionHtml =
              '<div class="d-flex gap-2 flex-wrap">' +
              '<button type="button" class="btn btn-sm btn-primary btn-accept-order" data-order-id="' +
              order.id +
              '">Nhận đơn</button>' +
              '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-hoa-don.html?id=' +
              order.id +
              '">Xem chi tiết</a>' +
              "</div>";
          } else if (canCancelCustomerOrder) {
            actionHtml =
              '<div class="d-flex gap-2 flex-wrap">' +
              '<button type="button" class="btn btn-sm btn-outline-danger btn-cancel-order" data-order-id="' +
              order.id +
              '">Hủy đơn</button>' +
              '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-hoa-don.html?id=' +
              order.id +
              '">Xem chi tiết</a>' +
              "</div>";
          }

          return (
            "<tr>" +
            '<td class="order-code">' +
            orderCode(order.id) +
            "</td>" +
            '<td><div class="customer-block"><strong>' +
            order.customer.name +
            "</strong><span>" +
            order.customer.phone +
            "</span></div></td>" +
            '<td><p class="service-text mb-0">' +
            order.service +
            "</p></td>" +
            "<td>" +
            formatDate(order.createdAt) +
            "</td>" +
            '<td><span class="status-pill ' +
            meta.className +
            '">' +
            meta.label +
            "</span></td>" +
            "<td>" +
            formatCurrency(calculateTotal(order)) +
            "</td>" +
            "<td>" +
            actionHtml +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    function renderPagination() {
      if (!paginationNode) return;

      var pageCount = Math.max(
        1,
        Math.ceil(state.filtered.length / state.pageSize),
      );
      if (state.page > pageCount) state.page = pageCount;
      if (state.page < 1) state.page = 1;

      var buttons = [];

      buttons.push(
        '<li class="page-item ' +
          (state.page === 1 ? "disabled" : "") +
          '"><button type="button" class="page-link" data-page="' +
          (state.page - 1) +
          '">Trước</button></li>',
      );

      for (var i = 1; i <= pageCount; i += 1) {
        buttons.push(
          '<li class="page-item ' +
            (i === state.page ? "active" : "") +
            '"><button type="button" class="page-link" data-page="' +
            i +
            '">' +
            i +
            "</button></li>",
        );
      }

      buttons.push(
        '<li class="page-item ' +
          (state.page === pageCount ? "disabled" : "") +
          '"><button type="button" class="page-link" data-page="' +
          (state.page + 1) +
          '">Sau</button></li>',
      );

      paginationNode.innerHTML = buttons.join("");
    }

    function renderAssignedPagination() {
      if (!assignedPaginationNode) return;

      var pageCount = Math.max(
        1,
        Math.ceil(assignedState.filtered.length / assignedState.pageSize),
      );
      if (assignedState.page > pageCount) assignedState.page = pageCount;
      if (assignedState.page < 1) assignedState.page = 1;

      var buttons = [];

      buttons.push(
        '<li class="page-item ' +
          (assignedState.page === 1 ? "disabled" : "") +
          '"><button type="button" class="page-link" data-assigned-page="' +
          (assignedState.page - 1) +
          '">Trước</button></li>',
      );

      for (var i = 1; i <= pageCount; i += 1) {
        buttons.push(
          '<li class="page-item ' +
            (i === assignedState.page ? "active" : "") +
            '"><button type="button" class="page-link" data-assigned-page="' +
            i +
            '">' +
            i +
            "</button></li>",
        );
      }

      buttons.push(
        '<li class="page-item ' +
          (assignedState.page === pageCount ? "disabled" : "") +
          '"><button type="button" class="page-link" data-assigned-page="' +
          (assignedState.page + 1) +
          '">Sau</button></li>',
      );

      assignedPaginationNode.innerHTML = buttons.join("");
    }

    function applyFilter() {
      var codeNode = document.getElementById("filterOrderCode");
      var statusNode = document.getElementById("filterStatus");
      var fromNode = document.getElementById("filterFromDate");
      var toNode = document.getElementById("filterToDate");

      var codeText = String((codeNode && codeNode.value) || "")
        .trim()
        .toLowerCase();
      var status = String((statusNode && statusNode.value) || "all")
        .trim()
        .toLowerCase();
      var fromDate = (fromNode && fromNode.value) || "";
      var toDate = (toNode && toNode.value) || "";

      var fromTime = fromDate
        ? new Date(fromDate + "T00:00:00").getTime()
        : null;
      var toTime = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

      state.filtered = state.all.filter(function (order) {
        var codeMatched =
          !codeText ||
          orderCode(order.id).toLowerCase().indexOf(codeText) !== -1;

        var statusMatched =
          !statusNode || status === "all" || order.status === status;

        var orderTime = new Date(order.createdAt).getTime();
        var fromMatched = fromTime == null || orderTime >= fromTime;
        var toMatched = toTime == null || orderTime <= toTime;

        return codeMatched && statusMatched && fromMatched && toMatched;
      });

      state.page = 1;
      renderRows();
      renderPagination();
      updateCount();
    }

    function applyAssignedFilter() {
      var codeNode = document.getElementById("providerFilterOrderCode");
      var statusNode = document.getElementById("providerFilterStatus");
      var fromNode = document.getElementById("providerFilterFromDate");
      var toNode = document.getElementById("providerFilterToDate");

      var codeText = String((codeNode && codeNode.value) || "")
        .trim()
        .toLowerCase();
      var status = String((statusNode && statusNode.value) || "all")
        .trim()
        .toLowerCase();
      var fromDate = (fromNode && fromNode.value) || "";
      var toDate = (toNode && toNode.value) || "";

      var fromTime = fromDate
        ? new Date(fromDate + "T00:00:00").getTime()
        : null;
      var toTime = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

      assignedState.filtered = assignedState.all.filter(function (order) {
        var codeMatched =
          !codeText ||
          orderCode(order.id).toLowerCase().indexOf(codeText) !== -1;

        var statusMatched = status === "all" || order.status === status;

        var orderDateRaw =
          order.startedAt ||
          order.receivedAt ||
          order.updatedAt ||
          order.createdAt;
        var orderTime = new Date(orderDateRaw).getTime();
        var fromMatched = fromTime == null || orderTime >= fromTime;
        var toMatched = toTime == null || orderTime <= toTime;

        return codeMatched && statusMatched && fromMatched && toMatched;
      });

      assignedState.page = 1;
      renderAssignedRows();
      renderAssignedPagination();
      updateAssignedCount();
    }

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        applyFilter();
      });
    }

    if (assignedFilterForm) {
      assignedFilterForm.addEventListener("submit", function (event) {
        event.preventDefault();
        applyAssignedFilter();
      });
    }

    var resetBtn = document.getElementById("filterReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (form) form.reset();
        applyFilter();
      });
    }

    var assignedResetBtn = document.getElementById("providerFilterReset");
    if (assignedResetBtn) {
      assignedResetBtn.addEventListener("click", function () {
        if (assignedFilterForm) assignedFilterForm.reset();
        applyAssignedFilter();
      });
    }

    if (paginationNode) {
      paginationNode.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-page]");
        if (!button || button.closest(".page-item.disabled")) return;

        var nextPage = Number(button.getAttribute("data-page"));
        if (!Number.isFinite(nextPage)) return;

        state.page = nextPage;
        renderRows();
        renderPagination();
        updateCount();
      });
    }

    if (assignedPaginationNode) {
      assignedPaginationNode.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-assigned-page]");
        if (!button || button.closest(".page-item.disabled")) return;

        var nextPage = Number(button.getAttribute("data-assigned-page"));
        if (!Number.isFinite(nextPage)) return;

        assignedState.page = nextPage;
        renderAssignedRows();
        renderAssignedPagination();
        updateAssignedCount();
      });
    }

    if (tbody && role === "provider") {
      tbody.addEventListener("click", function (event) {
        var button = event.target.closest(".btn-accept-order");
        if (!button) return;

        var orderId = Number(button.getAttribute("data-order-id"));
        if (!Number.isFinite(orderId) || orderId <= 0) {
          window.alert("Không xác định được mã đơn hàng.");
          return;
        }

        setAcceptButtonLoading(button, true);
        handleAcceptOrder(orderId)
          .then(function () {
            return refreshProviderOrders();
          })
          .catch(function (error) {
            window.alert(
              (error && error.message) ||
                "Không thể nhận đơn. Vui lòng thử lại.",
            );
          })
          .finally(function () {
            setAcceptButtonLoading(button, false);
          });
      });
    }

    if (tbody && role === "customer") {
      tbody.addEventListener("click", function (event) {
        var button = event.target.closest(".btn-cancel-order");
        if (!button) return;

        var orderId = Number(button.getAttribute("data-order-id"));
        if (!Number.isFinite(orderId) || orderId <= 0) {
          window.alert("Không xác định được mã đơn hàng.");
          return;
        }

        if (!window.confirm("Bạn có chắc muốn hủy đơn này?")) {
          return;
        }

        setActionButtonLoading(button, true, "Hủy đơn", "Đang hủy...");
        handleCancelOrder(orderId)
          .then(function () {
            var canceledAt = new Date().toISOString();
            patchOrderLocally(orderId, function (order) {
              order.status = "canceled";
              order.updatedAt = canceledAt;
              if (order.raw && typeof order.raw === "object") {
                order.raw.ngayhuy = canceledAt;
              }
            });

            applyFilter();
            renderStats(state.all, role);
          })
          .catch(function (error) {
            window.alert(
              (error && error.message) ||
                "Không thể hủy đơn. Vui lòng thử lại.",
            );
          })
          .finally(function () {
            setActionButtonLoading(button, false, "Hủy đơn", "Đang hủy...");
          });
      });
    }

    if (assignedTbody && role === "provider") {
      assignedTbody.addEventListener("click", function (event) {
        var startButton = event.target.closest(".btn-start-order");
        if (startButton) {
          var startOrderId = Number(startButton.getAttribute("data-order-id"));
          if (!Number.isFinite(startOrderId) || startOrderId <= 0) {
            window.alert("Không xác định được mã đơn hàng.");
            return;
          }

          setActionButtonLoading(
            startButton,
            true,
            "Bắt đầu",
            "Đang cập nhật...",
          );
          handleStartOrder(startOrderId)
            .then(function () {
              return refreshProviderOrders();
            })
            .catch(function (error) {
              window.alert(
                (error && error.message) ||
                  "Không thể bắt đầu xử lý đơn. Vui lòng thử lại.",
              );
            })
            .finally(function () {
              setActionButtonLoading(
                startButton,
                false,
                "Bắt đầu",
                "Đang cập nhật...",
              );
            });

          return;
        }

        var button = event.target.closest(".btn-complete-order");
        if (!button) return;

        var orderId = Number(button.getAttribute("data-order-id"));
        if (!Number.isFinite(orderId) || orderId <= 0) {
          window.alert("Không xác định được mã đơn hàng.");
          return;
        }

        if (!window.confirm("Xác nhận hoàn thành đơn này?")) {
          return;
        }

        setActionButtonLoading(button, true, "Hoàn thành", "Đang cập nhật...");
        handleCompleteOrder(orderId)
          .then(function () {
            return refreshProviderOrders();
          })
          .catch(function (error) {
            window.alert(
              (error && error.message) ||
                "Không thể cập nhật hoàn thành. Vui lòng thử lại.",
            );
          })
          .finally(function () {
            setActionButtonLoading(
              button,
              false,
              "Hoàn thành",
              "Đang cập nhật...",
            );
          });
      });
    }

    renderRows();
    renderAssignedRows();
    renderPagination();
    renderAssignedPagination();
    updateCount();
    updateAssignedCount();
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) {
      node.textContent = String(value || "-");
    }
  }

  function splitListText(value) {
    return String(value || "")
      .split(/[\n,;]+/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function taskLinesFromOrder(order) {
    var apiItems = splitListText(order && order.workItemsText);
    if (apiItems.length) {
      return apiItems;
    }

    var items = order.items || [];
    if (!items.length) {
      return [
        "Tiếp nhận yêu cầu và xác nhận khung giờ với khách hàng.",
        "Thực hiện dịch vụ theo đúng quy trình tiêu chuẩn.",
        "Bàn giao và xác nhận hoàn tất với khách hàng.",
      ];
    }

    return items.map(function (item) {
      var qty = Number(item.quantity) || 0;
      var itemName = safeText(item.name);
      return (
        "Xử lý " +
        qty +
        " " +
        itemName.toLowerCase() +
        ", làm sạch và kiểm tra chất lượng trước khi bàn giao."
      );
    });
  }

  function renderItems(order) {
    var tasks = taskLinesFromOrder(order);
    var listNode = document.getElementById("detailTasksList");
    if (listNode) {
      listNode.innerHTML = tasks
        .map(function (line, index) {
          return (
            '<li class="task-item">' +
            '<span class="task-index">' +
            (index + 1) +
            "</span>" +
            '<p class="task-text">' +
            escapeHtml(line) +
            "</p>" +
            "</li>"
          );
        })
        .join("");
    }

    var chemicalLines = splitListText(order && order.chemicalsText);
    setText(
      "detailChemicals",
      chemicalLines.length ? chemicalLines.join(", ") : "Không sử dụng",
    );

    var tbody = document.getElementById("detailItemsBody");
    if (!tbody) return;

    tbody.innerHTML = (order.items || [])
      .map(function (item) {
        var qty = Number(item.quantity) || 0;
        var price = Number(item.unitPrice) || 0;
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(item.name) +
          "</td>" +
          "<td>" +
          qty +
          "</td>" +
          "<td>" +
          formatCurrency(price) +
          "</td>" +
          "<td>" +
          formatCurrency(qty * price) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderTimeline(order) {
    var mount = document.getElementById("detailTimeline");
    if (!mount) return;

    var timeline = order.timeline || [];
    if (!timeline.length) {
      mount.innerHTML =
        '<li class="timeline-item"><strong>Chưa có tiến trình</strong><p>Đơn hàng chưa phát sinh trạng thái chi tiết.</p></li>';
      return;
    }

    mount.innerHTML = timeline
      .map(function (item) {
        return (
          '<li class="timeline-item">' +
          '<span class="timeline-date">' +
          formatDateTime(item.at) +
          "</span>" +
          "<strong>" +
          item.title +
          "</strong>" +
          "<p>" +
          item.detail +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  function showNotFound(orderId) {
    var foundNode = document.getElementById("detailStateFound");
    var missingNode = document.getElementById("detailStateNotFound");
    if (foundNode) foundNode.classList.add("d-none");
    if (missingNode) missingNode.classList.remove("d-none");

    var idNode = document.getElementById("missingOrderId");
    if (idNode) {
      idNode.textContent = orderId ? orderCode(orderId) : "(không hợp lệ)";
    }
  }

  function initDetailPage(role, sourceOrders, currentUser) {
    var orderId = parseQueryId();
    var allOrders = Array.isArray(sourceOrders) ? sourceOrders : [];
    var order = null;

    if (orderId != null) {
      order = allOrders.find(function (item) {
        return Number(item.id) === orderId;
      });
    }

    if (!order) {
      showNotFound(orderId);
      return;
    }

    if (role === "customer" && !(order.customer && order.customer.avatar)) {
      order.customer.avatar = pickFirstValue([
        currentUser && currentUser.avatar,
        currentUser && currentUser.user_avatar,
        currentUser && currentUser.photo,
        currentUser && currentUser.image,
      ]);
    }

    var hasProviderIdentityInOrder =
      Number(order && order.provider && order.provider.id) > 0 &&
      String((order && order.provider && order.provider.name) || "")
        .trim()
        .toLowerCase() !== "chưa phân công" &&
      Boolean(
        String((order && order.provider && order.provider.name) || "").trim() ||
        String(
          (order && order.provider && order.provider.phone) || "",
        ).trim() ||
        String((order && order.provider && order.provider.email) || "").trim(),
      );

    if (
      role === "provider" &&
      hasProviderIdentityInOrder &&
      !(order.provider && order.provider.avatar)
    ) {
      order.provider.avatar = pickFirstValue([
        currentUser && currentUser.avatar,
        currentUser && currentUser.user_avatar,
        currentUser && currentUser.photo,
        currentUser && currentUser.image,
      ]);
    }

    var meta = statusMeta(order.status);
    var subtotal = calculateSubTotal(order);
    var total = calculateTotal(order);
    var progressValue = statusProgress(order.status);
    var schedule = deriveSchedule(order);
    var latestTimelineItem =
      order.timeline && order.timeline.length
        ? order.timeline[order.timeline.length - 1]
        : null;

    var orderCodeText = orderCode(order.id);
    var serviceFeeAmount = Number(order.serviceFee);
    if (!Number.isFinite(serviceFeeAmount) || serviceFeeAmount < 0) {
      serviceFeeAmount = subtotal;
    }
    var transportFeeAmount = Number(order.transportFee);
    if (!Number.isFinite(transportFeeAmount) || transportFeeAmount < 0) {
      transportFeeAmount = 0;
    }
    var surchargeFeeAmount = Number(order.surchargeFee);
    if (!Number.isFinite(surchargeFeeAmount) || surchargeFeeAmount < 0) {
      surchargeFeeAmount = 0;
    }
    var deliveryMethodText =
      String(order.deliveryMethod || "").trim() || "Chưa cập nhật";

    var statusLower = String(order.status || "").toLowerCase();
    var executionStartValue = order.startedAt || order.receivedAt || null;
    var executionEndValue = order.completedAt || null;

    var providerStateText = "Chưa nhận";
    if (statusLower === "accepted") providerStateText = "Đã nhận đơn";
    if (statusLower === "processing") providerStateText = "Đang xử lý";
    if (statusLower === "completed") providerStateText = "Đã hoàn tất";
    if (statusLower === "canceled") providerStateText = "Đã hủy";

    setText("detailOrderCode", orderCode(order.id));
    setText("detailCreatedAt", formatDateTime(order.createdAt));
    setText("detailUpdatedAt", formatDateTime(order.updatedAt));
    setText("detailService", order.service);

    setText("detailCustomerName", order.customer.name);
    setText("detailCustomerPhone", order.customer.phone);
    setText("detailCustomerEmail", order.customer.email);
    setText("detailCustomerAddress", order.customer.address);

    setText("detailProviderName", order.provider.name);
    setText("detailProviderPhone", order.provider.phone);
    setText("detailProviderEmail", order.provider.email);
    setText("detailProviderAddress", order.provider.address);

    setText("detailSubTotal", formatCurrency(subtotal));
    setText("detailExtraFee", formatCurrency(order.extraFee));
    setText("detailDiscount", formatCurrency(order.discount));
    setText("detailTotal", formatCurrency(total));
    setText("detailNote", order.note || "Không có ghi chú.");
    setText(
      "detailRequirement",
      "Thực hiện đúng quy trình, đảm bảo chất lượng và bàn giao đúng khung giờ đã hẹn.",
    );

    setText("heroOrderCode", "#" + orderCodeText);
    setText("heroServiceName", safeText(order.service));
    setText("heroServiceFee", formatCurrencyVnd(serviceFeeAmount));
    setText("heroTransportFee", formatCurrencyVnd(transportFeeAmount));
    setText("heroSurchargeFee", formatCurrencyVnd(surchargeFeeAmount));
    setText("heroBookingDate", formatDateTime(order.createdAt));
    setText(
      "heroReceivedDate",
      executionStartValue ? formatDateTime(executionStartValue) : "---",
    );
    setText(
      "heroCompletedDate",
      executionEndValue ? formatDateTime(executionEndValue) : "---",
    );
    setText("heroPaymentStatus", getPaymentStatusLabel(order.paymentStatus));
    setText("heroTotalAmount", formatCurrencyVnd(total));
    setText("heroTimeRange", deliveryMethodText);
    var heroDateRangeNode = document.getElementById("heroDateRange");
    if (heroDateRangeNode) {
      heroDateRangeNode.textContent = "";
      heroDateRangeNode.classList.add("d-none");
    }
    setText("heroAddress", safeText(order.customer && order.customer.address));

    setText("detailProgressText", progressValue.toFixed(2) + "%");
    setText(
      "detailTimelineSummary",
      latestTimelineItem
        ? safeText(latestTimelineItem.detail)
        : "Tiến độ sẽ được cập nhật theo từng mốc xử lý.",
    );
    setText("detailStatusText", meta.label);
    setText("detailExpectedStart", formatDateTime(schedule.expectedStart));
    setText("detailExpectedEnd", formatDateTime(schedule.expectedEnd));
    setText(
      "detailActualStart",
      formatDateTime(
        order.startedAt || order.receivedAt || schedule.actualStart,
      ),
    );
    setText(
      "detailActualEnd",
      formatDateTime(order.completedAt || schedule.actualEnd),
    );

    renderAvatarBadge(
      "customerAvatarBadge",
      order.customer && order.customer.avatar,
      initialsOf(order.customer && order.customer.name, "KH"),
      "customer",
    );
    renderAvatarBadge(
      "providerAvatarBadge",
      hasProviderIdentityInOrder ? order.provider && order.provider.avatar : "",
      initialsOf(order.provider && order.provider.name, "NCC"),
      "provider",
    );
    setText("providerStateChip", providerStateText);

    setText("reviewCustomerText", "Chưa có đánh giá");
    setText("reviewCustomerDate", "---");
    setText("reviewCustomerFile", "Chưa có tệp");
    setText("reviewProviderText", "Chưa có đánh giá");
    setText("reviewProviderDate", "---");
    setText("reviewProviderFile", "Chưa có tệp");

    setText("heroProgressPercent", Math.round(progressValue) + "%");

    var progressBarNode = document.getElementById("detailProgressBar");
    if (progressBarNode) {
      progressBarNode.style.width = progressValue + "%";
    }

    var ringNode = document.getElementById("heroProgressRing");
    if (ringNode) {
      ringNode.style.setProperty("--progress", String(progressValue));
    }

    var badge = document.getElementById("detailStatusBadge");
    if (badge) {
      badge.className = "status-pill " + meta.className;
      badge.textContent = meta.label;
    }

    var heroBadge = document.getElementById("heroStatusBadge");
    if (heroBadge) {
      heroBadge.className = "invoice-status-chip";
      if (statusLower === "pending") heroBadge.classList.add("is-pending");
      if (statusLower === "accepted") heroBadge.classList.add("is-accepted");
      if (statusLower === "processing")
        heroBadge.classList.add("is-processing");
      if (statusLower === "completed") heroBadge.classList.add("is-completed");
      if (statusLower === "canceled") heroBadge.classList.add("is-canceled");
      heroBadge.textContent = meta.label;
    }

    var providerChipNode = document.getElementById("providerStateChip");
    if (providerChipNode) {
      providerChipNode.className = "panel-chip";
      if (statusLower === "pending" || statusLower === "canceled") {
        providerChipNode.classList.add("warn");
      }
      providerChipNode.textContent = providerStateText;
    }

    renderItems(order);
    renderTimeline(order);
  }

  async function init() {
    var pageType = getPageType();
    var role = getRole();
    var sourceOrders = null;
    var user = await getSessionUser();

    if (role === "customer") {
      if (!user) {
        window.location.href = CUSTOMER_LOGIN_PAGE;
        return;
      }

      if (normalizeAccountType(user.account_type) === "provider") {
        window.location.href = PROVIDER_DASHBOARD_PAGE;
        return;
      }

      syncCustomerChip(user);
      sourceOrders = await loadCustomerOrders(user);
    }

    if (role === "provider") {
      if (!user) {
        window.location.href = PROVIDER_LOGIN_PAGE;
        return;
      }

      if (normalizeAccountType(user.account_type) !== "provider") {
        window.location.href = PROVIDER_LOGIN_PAGE;
        return;
      }

      syncProviderChip(user);
      sourceOrders = await loadProviderOrders(user);
      if (sourceOrders && !Array.isArray(sourceOrders)) {
        sourceOrders.providerUser = user;
      }
    }

    if (role === "admin") {
      var admin = await getSessionAdmin();
      if (!admin) {
        window.location.href = ADMIN_LOGIN_PAGE;
        return;
      }

      syncAdminChip(admin);
      sourceOrders = await loadAdminOrders();
    }

    if (pageType === "list") {
      initListPage(role, sourceOrders);
      return;
    }

    if (pageType === "detail") {
      initDetailPage(
        role,
        role === "provider" && sourceOrders && !Array.isArray(sourceOrders)
          ? sourceOrders.allOrders
          : sourceOrders,
        user,
      );
    }
  }

  function start() {
    init().catch(function () {
      window.location.href =
        getRole() === "provider"
          ? PROVIDER_LOGIN_PAGE
          : getRole() === "admin"
            ? ADMIN_LOGIN_PAGE
            : CUSTOMER_LOGIN_PAGE;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window, document);
