(function (window, document) {
  "use strict";

  var PAGE_SIZE = 6;
  var BOOKING_TABLE = "datlich_giatuinhanh";
  var USER_TABLE = "nguoidung";
  var PROVIDER_SERVICE_ID = "11";
  var CUSTOMER_LOGIN_PAGE = "../../public/dang-nhap.html?service=giatuinhanh";
  var PROVIDER_LOGIN_PAGE = "../../public/dang-nhap.html?service=giatuinhanh";
  var ADMIN_LOGIN_PAGE = "../../public/admin-login.html";
  var getShared = function () {
    return window.SharedOrderUtils || {};
  };
  var shared = getShared();
  var REVIEW_UPLOAD_ENDPOINT = "../public/upload-review-media.php";
  var REVIEW_FIELD_MAP = {
    customer: {
      text: ["danhgia_khachhang"],
      date: ["ngaydanhgia_khachhang"],
      media: ["media_danhgia_khachhang"],
    },
    provider: {
      text: ["danhgia_nhacungcap"],
      date: ["ngaydanhgia_nhacungcap"],
      media: ["media_danhgia_nhacungcap"],
    },
  };

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

  function normalizePhone(value) {
    var phone = String(value || "")
      .replace(/\s+/g, "")
      .trim();

    if (phone.indexOf("+84") === 0) return "0" + phone.slice(3);
    if (phone.indexOf("84") === 0 && phone.length >= 11)
      return "0" + phone.slice(2);

    return phone;
  }

  function hasOrderLifecycleDates(row) {
    return (
      hasDateValue(row && row.ngayhuy) ||
      hasDateValue(row && row.ngaynhan) ||
      hasDateValue(row && row.ngayhoanthanh)
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
    return 0; // Chỉ tính tiến độ khi nhà cung cấp nhận đơn
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
          (row.nhacungcap &&
            (row.nhacungcap.id || row.nhacungcap.idnhacungcap)))) ||
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

  function containsServiceId(idDichVu, targetId) {
    var target = String(targetId || "").trim();
    if (!target) return false;

    return (
      String(idDichVu || "")
        .split(",")
        .map(function (value) {
          return value.trim();
        })
        .indexOf(target) !== -1
    );
  }

  function isProviderUser(user) {
    if (containsServiceId(user && user.id_dichvu, PROVIDER_SERVICE_ID)) {
      return true;
    }

    return normalizeAccountType(user && user.account_type) === "provider";
  }

  function extractRows(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function getCookie(name) {
    if (shared && typeof shared.getCookie === "function") {
      return shared.getCookie(name);
    }
    var cookieName = String(name || "").trim();
    if (!cookieName) return "";
    var cookiePrefix = cookieName + "=";
    var entries = (document.cookie || "").split(";");
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i].trim();
      if (entry.indexOf(cookiePrefix) !== 0) continue;
      var rawValue = entry.slice(cookiePrefix.length);
      try {
        return decodeURIComponent(rawValue);
      } catch (_error) {
        return rawValue;
      }
    }
    return "";
  }

  function mapAuthenticatedUser(row, phoneFallback) {
    if (!row || typeof row !== "object") return null;

    return {
      id: row.id || row.user_id || row.makhachhang || "",
      user_name: row.user_name || row.hovaten || row.ten || "",
      user_tel: normalizePhone(
        row.user_tel || row.sodienthoai || row.phone || phoneFallback,
      ),
      user_email: row.user_email || row.email || "",
      id_dichvu: String(row.id_dichvu || "").trim(),
      account_type: containsServiceId(row.id_dichvu, PROVIDER_SERVICE_ID)
        ? "provider"
        : "customer",
      raw: row,
    };
  }

  function querySingleUser(where) {
    if (typeof window.krudList !== "function") {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      window.krudList({
        table: USER_TABLE,
        where: where,
        limit: 1,
      }),
    )
      .then(function (result) {
        var rows = extractRows(result);
        return rows.length ? rows[0] : null;
      })
      .catch(function () {
        return null;
      });
  }

  function findUserByCredentials(phone, password) {
    var normalizedPhone = normalizePhone(phone);
    var phoneFields = ["sodienthoai", "user_tel", "phone", "sdt"];
    var passwordFields = ["matkhau", "password", "user_password", "mat_khau"];

    function tryPair(indexPhone, indexPassword) {
      if (indexPhone >= phoneFields.length) {
        return Promise.resolve(null);
      }

      if (indexPassword >= passwordFields.length) {
        return tryPair(indexPhone + 1, 0);
      }

      return querySingleUser([
        {
          field: phoneFields[indexPhone],
          operator: "=",
          value: normalizedPhone,
        },
        {
          field: passwordFields[indexPassword],
          operator: "=",
          value: password,
        },
      ]).then(function (row) {
        if (row) return row;
        return tryPair(indexPhone, indexPassword + 1);
      });
    }

    return tryPair(0, 0);
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

    if (row && row.ngaynhan) {
      timeline.push({
        at: row.ngaynhan,
        title: "Nhà cung cấp xác nhận",
        detail: "Đơn hàng đã được nhà cung cấp tiếp nhận.",
      });
    }

    if (row && row.ngaybatdau) {
      timeline.push({
        at: row.ngaybatdau,
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
      (row && (row.ngaydat || row.created_date)) || new Date().toISOString();
    var updatedAt =
      (row &&
        (row.ngayhoanthanh ||
          row.ngayhuy ||
          row.ngaybatdau ||
          row.ngaynhan ||
          row.created_date)) ||
      createdAt;

    var rawStatus =
      typeof shared.getOrderStatus === "function"
        ? shared.getOrderStatus(row)
        : row && row.ngayhuy
          ? "cancel"
          : row && row.ngayhoanthanh
            ? "completed"
            : row && row.ngaybatdau
              ? "processing"
              : row && row.ngaynhan
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
        maplat: row && row.lat_kh,
        maplng: row && row.lng_kh,
      },
      provider: {
        id: hasAssignedProvider
          ? toNumber(
              row &&
                (row.idnhacungcap ||
                  (row.nhacungcap &&
                    (row.nhacungcap.id || row.nhacungcap.idnhacungcap))),
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
        maplat: hasAssignedProvider
          ? (row && row.maplat_ncc) || (row.nhacungcap && row.nhacungcap.maplat)
          : null,
        maplng: hasAssignedProvider
          ? (row && row.maplng_ncc) || (row.nhacungcap && row.nhacungcap.maplng)
          : null,
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
      paymentStatus: (row && row.trangthaithanhtoan) || "Unpaid",
      deliveryMethod: (row && row.hinhthucnhangiao) || "",
      note: (row && row.ghichu) || "Không có ghi chú.",
      workItemsText: (row && row.danhsachcongviec) || "",
      chemicalsText: (row && row.danhsachhoachat) || "",
      receivedAt: (row && row.ngaynhan) || "",
      startedAt: (row && row.ngaybatdau) || "",
      completedAt: (row && row.ngayhoanthanh) || "",
      timeline: buildTimelineFromDbRow(row, status, createdAt),
    };
  }

  function getSessionUser() {
    if (shared && typeof shared.getSessionUser === "function") {
      return shared.getSessionUser().then(function (row) {
        if (!row) return null;
        return mapAuthenticatedUser(row, row.sodienthoai);
      });
    }

    var phone = normalizePhone(getCookie("dvqt_u"));
    var password = String(getCookie("dvqt_p") || "").trim();

    if (!phone || !password || typeof window.krudList !== "function") {
      return Promise.resolve(null);
    }

    return findUserByCredentials(phone, password)
      .then(function (row) {
        if (!row) return null;
        return mapAuthenticatedUser(row, phone);
      })
      .catch(function () {
        return null;
      });
  }

  function getSessionAdmin() {
    var e = getCookie("admin_e");
    var p = getCookie("admin_p");
    if (!e || !p || typeof window.krudList !== "function") {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      window.krudList({
        table: "admin",
        where: [
          { field: "email", operator: "=", value: e },
          { field: "matkhau", operator: "=", value: p },
        ],
        limit: 1,
      }),
    )
      .then(function (result) {
        var rows = extractRows(result);
        return rows.length ? rows[0] : null;
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
    var candidates = [row.id, row.idnhacungcap, row.user_id];
    for (var i = 0; i < candidates.length; i += 1) {
      var providerId = toNumber(candidates[i]);
      if (providerId > 0) return providerId;
    }
    return 0;
  }

  function resolveOrderProviderId(row) {
    return toNumber(row && row.idnhacungcap);
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
        userTable: USER_TABLE,
        customerTable: USER_TABLE,
        providerTable: USER_TABLE,
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
        userTable: USER_TABLE,
        customerTable: USER_TABLE,
        providerTable: USER_TABLE,
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
        userTable: USER_TABLE,
        customerTable: USER_TABLE,
        providerTable: USER_TABLE,
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
    var sh = getShared();
    if (typeof sh.completeProviderOrder === "function") {
      return sh.completeProviderOrder(orderId, BOOKING_TABLE);
    }
    if (typeof sh.updateOrder === "function") {
      return sh.updateOrder(BOOKING_TABLE, orderId, {
        ngayhoanthanh: new Date().toISOString(),
        trangthaithanhtoan: "Paid",
      });
    }
    return Promise.reject(new Error("Chưa sẵn sàng chức năng hoàn thành đơn."));
  }

  function handleStartOrder(orderId) {
    var sh = getShared();
    if (typeof sh.startProviderOrder === "function") {
      return sh.startProviderOrder(orderId, BOOKING_TABLE);
    }
    if (typeof sh.updateOrder === "function") {
      return sh.updateOrder(BOOKING_TABLE, orderId, {
        ngaybatdau: new Date().toISOString(),
      });
    }
    return Promise.reject(new Error("Chưa sẵn sàng chức năng bắt đầu đơn."));
  }

  function handleCancelOrder(orderId) {
    var sh = getShared();
    if (typeof sh.updateOrder !== "function") {
      return Promise.reject(new Error("Chưa sẵn sàng chức năng hủy đơn."));
    }
    return sh.updateOrder(BOOKING_TABLE, orderId, {
      ngayhuy: new Date().toISOString(),
    });
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
            '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-don-hang.html?id=' +
            order.id +
            '">Xem chi tiết</a>';

          return (
            "<tr>" +
            '<td class="order-code" data-label="Mã đơn">' +
            orderCode(order.id) +
            "</td>" +
            '<td data-label="Khách hàng"><div class="customer-block"><strong>' +
            order.customer.name +
            "</strong><span>" +
            order.customer.phone +
            "</span></div></td>" +
            '<td data-label="Dịch vụ"><p class="service-text mb-0">' +
            order.service +
            "</p></td>" +
            '<td data-label="Ngày đặt">' +
            formatDate(
              order.startedAt ||
                order.receivedAt ||
                order.updatedAt ||
                order.createdAt,
            ) +
            "</td>" +
            '<td data-label="Trạng thái"><span class="status-pill ' +
            meta.className +
            '">' +
            meta.label +
            "</span></td>" +
            '<td data-label="Tổng tiền">' +
            formatCurrency(calculateTotal(order)) +
            "</td>" +
            '<td data-label="Thao tác">' +
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
            '<a class="btn btn-sm btn-outline-secondary btn-view-detail" href="chi-tiet-don-hang.html?id=' +
            order.id +
            '">Xem chi tiết</a>';

          return (
            "<tr>" +
            '<td class="order-code" data-label="Mã đơn">' +
            orderCode(order.id) +
            "</td>" +
            '<td data-label="Khách hàng"><div class="customer-block"><strong>' +
            order.customer.name +
            "</strong><span>" +
            order.customer.phone +
            "</span></div></td>" +
            '<td data-label="Dịch vụ"><p class="service-text mb-0">' +
            order.service +
            "</p></td>" +
            '<td data-label="Ngày đặt">' +
            formatDate(order.createdAt) +
            "</td>" +
            '<td data-label="Trạng thái"><span class="status-pill ' +
            meta.className +
            '">' +
            meta.label +
            "</span></td>" +
            '<td data-label="Tổng tiền">' +
            formatCurrency(calculateTotal(order)) +
            "</td>" +
            '<td data-label="Thao tác">' +
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

    /* Provider Accept handled in detail page */

    /* Customer Cancel handled in detail page */

    /* Provider Start/Complete handled in detail page */

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
    if (!order.raw || typeof order.raw !== "object") {
      order.raw = {};
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
      order.receivedAt ? formatDateTime(order.receivedAt) : "---",
    );
    setText(
      "heroStartedDate",
      order.startedAt ? formatDateTime(order.startedAt) : "---",
    );
    setText(
      "heroCompletedDate",
      order.completedAt ? formatDateTime(order.completedAt) : "---",
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

    (function initActionButtons() {
      var actionBar = document.getElementById("detailActionBar");
      var actionBtn = document.getElementById("detailActionBtn");
      var actionHint = document.getElementById("detailActionHint");
      if (!actionBar || !actionBtn) return;

      var currentStatus = String(order.status || "").toLowerCase();
      var config = null;

      if (role === "customer") {
        var canCancel =
          !hasDateValue(order.receivedAt) &&
          currentStatus !== "completed" &&
          currentStatus !== "canceled";

        if (canCancel) {
          config = {
            text: "Hủy đơn",
            loadingText: "Đang hủy...",
            className: "btn-danger",
            // hint: "Bạn có thể hủy đơn nếu hệ thống chưa cập nhật ngày nhận đồ.",
            handler: function () {
              if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) {
                setActionButtonLoading(
                  actionBtn,
                  true,
                  config.text,
                  config.loadingText,
                );
                handleCancelOrder(order.id)
                  .then(function () {
                    start();
                  })
                  .catch(function (err) {
                    window.alert(err.message || "Lỗi hủy đơn.");
                    setActionButtonLoading(
                      actionBtn,
                      false,
                      config.text,
                      config.loadingText,
                    );
                  });
              }
            },
          };
        }
      } else if (role === "provider") {
        if (currentStatus === "pending") {
          config = {
            text: "Nhận đơn",
            loadingText: "Đang xử lý...",
            className: "btn-primary",
            // hint: "Nhận đơn hàng này để bắt đầu quy trình phục vụ.",
            handler: function () {
              setActionButtonLoading(
                actionBtn,
                true,
                config.text,
                config.loadingText,
              );
              handleAcceptOrder(order.id)
                .then(function () {
                  start();
                })
                .catch(function (err) {
                  window.alert(err.message || "Lỗi nhận đơn.");
                  setActionButtonLoading(
                    actionBtn,
                    false,
                    config.text,
                    config.loadingText,
                  );
                });
            },
          };
        } else if (currentStatus === "accepted") {
          config = {
            text: "Bắt đầu",
            loadingText: "Đang cập nhật...",
            className: "btn-info text-white",
            // hint: "Xác nhận đã bắt đầu thực hiện các công đoạn giặt ủi.",
            handler: function () {
              setActionButtonLoading(
                actionBtn,
                true,
                config.text,
                config.loadingText,
              );
              handleStartOrder(order.id)
                .then(function () {
                  start();
                })
                .catch(function (err) {
                  window.alert(err.message || "Lỗi cập nhật.");
                  setActionButtonLoading(
                    actionBtn,
                    false,
                    config.text,
                    config.loadingText,
                  );
                });
            },
          };
        } else if (currentStatus === "processing") {
          config = {
            text: "Hoàn thành",
            loadingText: "Đang xử lý...",
            className: "btn-success",
            // hint: "Yêu cầu thanh toán và bàn giao đồ sạch cho khách hàng.",
            handler: function () {
              if (window.confirm("Xác nhận hoàn thành đơn hàng này?")) {
                setActionButtonLoading(
                  actionBtn,
                  true,
                  config.text,
                  config.loadingText,
                );
                handleCompleteOrder(order.id)
                  .then(function () {
                    start();
                  })
                  .catch(function (err) {
                    window.alert(err.message || "Lỗi cập nhật.");
                    setActionButtonLoading(
                      actionBtn,
                      false,
                      config.text,
                      config.loadingText,
                    );
                  });
              }
            },
          };
        }
      }

      if (config) {
        actionBtn.disabled = false;
        if (actionBtn.dataset.originalText) {
          delete actionBtn.dataset.originalText;
        }
        actionBtn.textContent = config.text;
        actionBtn.className =
          "btn btn-sm fw-bold shadow-sm " + config.className;

        if (actionHint) {
          actionHint.textContent = config.hint || "";
          actionHint.classList.toggle("d-none", !config.hint);
        }

        // Remove old listeners to avoid multiple calls
        var newBtn = actionBtn.cloneNode(true);
        actionBtn.parentNode.replaceChild(newBtn, actionBtn);
        actionBtn = newBtn; // Update reference for closure

        newBtn.addEventListener("click", function (e) {
          e.preventDefault();
          config.handler();
        });

        actionBar.classList.remove("d-none");
        actionBar.classList.add("d-flex");
      } else {
        actionBar.classList.add("d-none");
        actionBar.classList.remove("d-flex");
      }
    })();

    function reviewPrefix(actor) {
      return actor === "provider" ? "Provider" : "Customer";
    }

    function reviewNode(actor, suffix) {
      return document.getElementById("review" + reviewPrefix(actor) + suffix);
    }

    function firstExistingKey(source, keys, fallback) {
      var row = source && typeof source === "object" ? source : {};
      var list = Array.isArray(keys) ? keys : [];
      for (var i = 0; i < list.length; i += 1) {
        if (Object.prototype.hasOwnProperty.call(row, list[i])) return list[i];
      }
      return fallback;
    }

    function firstReviewValue(source, keys) {
      var row = source && typeof source === "object" ? source : {};
      var list = Array.isArray(keys) ? keys : [];
      for (var i = 0; i < list.length; i += 1) {
        var value = row[list[i]];
        if (value == null) continue;
        if (Array.isArray(value) && value.length) return value;
        var text = String(value).trim();
        if (text) return text;
      }
      return "";
    }

    function parseReviewMedia(value) {
      if (Array.isArray(value)) {
        return value
          .map(function (item) {
            return String(item == null ? "" : item).trim();
          })
          .filter(Boolean);
      }

      var text = String(value == null ? "" : value).trim();
      if (!text) return [];

      if (
        (text.charAt(0) === "[" && text.charAt(text.length - 1) === "]") ||
        (text.charAt(0) === "{" && text.charAt(text.length - 1) === "}")
      ) {
        try {
          var parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parseReviewMedia(parsed);
          if (parsed && Array.isArray(parsed.files)) {
            return parseReviewMedia(parsed.files);
          }
        } catch (_) {}
      }

      return text
        .split(/[\n,;]+/)
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean);
    }

    function dedupeMedia(files) {
      var map = {};
      var list = Array.isArray(files) ? files : [];
      return list.filter(function (item) {
        var key = String(item || "").trim();
        if (!key || map[key]) return false;
        map[key] = true;
        return true;
      });
    }

    function resolveReview(actor) {
      var row = order.raw || {};
      var config = REVIEW_FIELD_MAP[actor] || REVIEW_FIELD_MAP.customer;
      var text = firstReviewValue(row, config.text);
      var date = firstReviewValue(row, config.date);
      var mediaRaw = firstReviewValue(row, config.media);

      return {
        text: String(text || "").trim(),
        date: String(date || "").trim(),
        files: dedupeMedia(parseReviewMedia(mediaRaw)),
        columns: {
          text: firstExistingKey(row, config.text, config.text[0]),
          date: firstExistingKey(row, config.date, config.date[0]),
          media: firstExistingKey(row, config.media, config.media[0]),
        },
      };
    }

    function hasReviewData(review) {
      var info = review || {};
      var text = String(info.text || "").trim();
      var date = String(info.date || "").trim();
      var files = Array.isArray(info.files) ? info.files : [];
      return Boolean(text || date || files.length);
    }

    function resolveReviewMediaUrl(path) {
      var value = String(path || "")
        .trim()
        .replace(/\\/g, "/");
      if (!value) return "";
      if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
      if (value.indexOf("./") === 0 || value.indexOf("../") === 0) return value;
      if (value.indexOf("public/") === 0) return "../" + value;
      return (
        "../public/asset/image/upload/danhgia/" + value.replace(/^\/+/, "")
      );
    }

    function renderReviewMedia(actor, files) {
      var mount = reviewNode(actor, "File");
      if (!mount) return;
      mount.className = "review-file";
      mount.textContent = "";

      var list = Array.isArray(files) ? files : [];
      if (!list.length) {
        mount.textContent = "Chưa có tệp";
        return;
      }

      mount.classList.add("review-file-media");
      var grid = document.createElement("div");
      grid.className = "review-media-grid";

      list.forEach(function (item, index) {
        var url = resolveReviewMediaUrl(item);
        if (!url) return;
        var isVideo = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/.test(
          url.toLowerCase(),
        );

        var link = document.createElement("a");
        link.className = "review-media-item";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = "Mở tệp " + (index + 1);

        var preview;
        if (isVideo) {
          preview = document.createElement("video");
          preview.controls = true;
          preview.preload = "metadata";
        } else {
          preview = document.createElement("img");
          preview.alt = "Tệp đánh giá " + (index + 1);
          preview.loading = "lazy";
        }
        preview.className = "review-media-preview";
        preview.src = url;
        link.appendChild(preview);
        grid.appendChild(link);
      });

      if (!grid.children.length) {
        mount.classList.remove("review-file-media");
        mount.textContent = "Chưa có tệp";
        return;
      }

      mount.appendChild(grid);
    }

    function setReviewChip(actor, hasData) {
      var chip = reviewNode(actor, "Chip");
      if (!chip) return;
      chip.classList.toggle("warn", !hasData);
      chip.textContent = hasData ? "Đã có" : "Chưa có";
    }

    function renderReview(actor) {
      var info = resolveReview(actor);
      var hasData = hasReviewData(info);
      setText(
        "review" + reviewPrefix(actor) + "Text",
        info.text || "Chưa có đánh giá",
      );
      setText(
        "review" + reviewPrefix(actor) + "Date",
        info.date ? formatDateTime(info.date) : "---",
      );
      renderReviewMedia(actor, info.files || []);
      setReviewChip(actor, hasData);
      return info;
    }

    function renderAllReviews() {
      renderReview("customer");
      renderReview("provider");
    }

    function setReviewSubmitting(actor, isLoading) {
      var button = reviewNode(actor, "Submit");
      var input = reviewNode(actor, "Input");
      var upload = reviewNode(actor, "Upload");
      var hint = reviewNode(actor, "Hint");

      if (button) {
        if (isLoading) {
          if (!button.dataset.defaultText) {
            button.dataset.defaultText = button.textContent || "Gui danh gia";
          }
          button.disabled = true;
          button.textContent = "Dang gui...";
        } else {
          button.disabled = false;
          button.textContent = button.dataset.defaultText || "Gui danh gia";
        }
      }
      if (input) input.disabled = Boolean(isLoading);
      if (upload) upload.disabled = Boolean(isLoading);
      if (hint) {
        hint.textContent = isLoading
          ? "Dang tai tep len..."
          : "Ban chi co the gui danh gia 1 lan. Toi da 30MB moi tep.";
      }
    }

    function syncReviewEditors() {
      var canSend = statusLower === "completed";
      ["customer", "provider"].forEach(function (actor) {
        var editor = reviewNode(actor, "Editor");
        if (!editor) return;

        var info = resolveReview(actor);
        var canEdit = canSend && role === actor && !hasReviewData(info);
        editor.classList.toggle("d-none", !canEdit);
        if (!canEdit) return;

        var input = reviewNode(actor, "Input");
        var upload = reviewNode(actor, "Upload");
        var hint = reviewNode(actor, "Hint");
        if (input) input.value = "";
        if (upload) upload.value = "";
        if (hint) {
          hint.textContent =
            "Ban chi co the gui danh gia 1 lan. Toi da 30MB moi tep.";
        }
      });
    }

    function uploadReviewFiles(files) {
      var list = Array.isArray(files) ? files : [];
      if (!list.length) return Promise.resolve([]);

      var formData = new FormData();
      list.forEach(function (file) {
        formData.append("files[]", file);
      });

      return fetch(REVIEW_UPLOAD_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      }).then(function (response) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (result) {
            if (!response.ok || !result || result.success !== true) {
              throw new Error(
                (result && result.message) ||
                  "Không thể tải lên ảnh/video đánh giá.",
              );
            }
            return dedupeMedia(result.files || []);
          });
      });
    }

    function submitReview(actor) {
      if (role !== actor) return;
      if (statusLower !== "completed") {
        window.alert("Chi gui danh gia sau khi hoa don da hoan thanh.");
        return;
      }
      if (typeof shared.updateOrder !== "function") {
        window.alert("Chua san sang chuc nang gui danh gia.");
        return;
      }

      var input = reviewNode(actor, "Input");
      var upload = reviewNode(actor, "Upload");
      if (!input || !upload) return;

      var current = resolveReview(actor);
      if (hasReviewData(current)) {
        window.alert(
          "Danh gia nay da duoc gui truoc do va khong the chinh sua.",
        );
        return;
      }

      var content = String(input.value || "").trim();
      var selectedFiles = upload.files
        ? Array.prototype.slice.call(upload.files)
        : [];
      if (!content && !selectedFiles.length) {
        window.alert("Vui long nhap noi dung hoac chon anh/video.");
        return;
      }

      setReviewSubmitting(actor, true);
      uploadReviewFiles(selectedFiles)
        .then(function (uploadedFiles) {
          var nextFiles = dedupeMedia(uploadedFiles);
          var submittedAt = new Date().toISOString();
          var payload = {};
          payload[current.columns.text] = content;
          payload[current.columns.date] = submittedAt;
          payload[current.columns.media] = JSON.stringify(nextFiles);

          return shared
            .updateOrder(BOOKING_TABLE, order.id, payload)
            .then(function () {
              order.raw[current.columns.text] = payload[current.columns.text];
              order.raw[current.columns.date] = payload[current.columns.date];
              order.raw[current.columns.media] = payload[current.columns.media];
              renderAllReviews();
              syncReviewEditors();
            });
        })
        .catch(function (error) {
          window.alert((error && error.message) || "Khong the gui danh gia.");
        })
        .finally(function () {
          setReviewSubmitting(actor, false);
        });
    }

    ["customer", "provider"].forEach(function (actor) {
      var button = reviewNode(actor, "Submit");
      if (!button) return;
      button.addEventListener("click", function () {
        submitReview(actor);
      });
    });

    renderAllReviews();
    syncReviewEditors();

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

      if (isProviderUser(user)) {
        window.location.href = "../nhacungcap/danh-sach-don-hang.html";
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

      if (!isProviderUser(user)) {
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
