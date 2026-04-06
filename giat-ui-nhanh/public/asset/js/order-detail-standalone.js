(function (window, document) {
  "use strict";

  var ORDER_TABLE = "datlich_giatuinhanh";
  var CUSTOMER_TABLE = "khachhang";
  var PROVIDER_TABLE = "nhacungcap_giatuinhanh";

  var shared = window.SharedOrderUtils || {};
  var state = {
    params: null,
    auth: null,
    orderView: null,
    orderRaw: null,
    isSubmitting: false,
  };

  function extractRows(result) {
    if (typeof shared.extractRows === "function") {
      return shared.extractRows(result);
    }
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function normalizePhone(phone) {
    var value = String(phone || "")
      .replace(/\s+/g, "")
      .trim();
    if (value.indexOf("+84") === 0) return "0" + value.slice(3);
    if (value.indexOf("84") === 0 && value.length >= 11) {
      return "0" + value.slice(2);
    }
    return value;
  }

  function normalizeId(id) {
    return String(id == null ? "" : id).trim();
  }

  function pickFirstValue(values) {
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length; i += 1) {
      var text = String(list[i] == null ? "" : list[i]).trim();
      if (text) return text;
    }
    return "";
  }

  function toNumber(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

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

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) {
      node.textContent = String(value == null || value === "" ? "---" : value);
    }
  }

  function formatOrderCode(orderId) {
    if (typeof shared.formatOrderCode === "function") {
      return shared.formatOrderCode(orderId);
    }
    var id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) return "-";
    return String(Math.floor(id)).padStart(7, "0");
  }

  function formatCurrency(value) {
    var num = toNumber(value);
    return num.toLocaleString("vi-VN") + " đ";
  }

  function formatCurrencyVnd(value) {
    var num = toNumber(value);
    return num.toLocaleString("vi-VN") + " VND";
  }

  function formatDateTime(value) {
    if (!value) return "---";
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "---";
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateOnly(value) {
    if (!value) return "---";
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "---";
    return date.toLocaleDateString("vi-VN");
  }

  function safeText(value) {
    var text = String(value || "").trim();
    return text || "---";
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
    if (apiItems.length) return apiItems;

    var items = order && Array.isArray(order.items) ? order.items : [];
    if (!items.length) {
      return [
        "Tiếp nhận yêu cầu và xác nhận khung giờ với khách hàng.",
        "Thực hiện dịch vụ theo đúng quy trình tiêu chuẩn.",
        "Bàn giao và xác nhận hoàn tất với khách hàng.",
      ];
    }

    return items.map(function (item) {
      var qty = Number(item.quantity) || 0;
      var itemName = safeText(item.name).toLowerCase();
      return (
        "Xử lý " +
        qty +
        " " +
        itemName +
        ", làm sạch và kiểm tra chất lượng trước khi bàn giao."
      );
    });
  }

  function mapDbStatus(status) {
    var value = String(status || "").toLowerCase();
    if (value === "cancel") return "canceled";
    if (value === "completed") return "completed";
    if (value === "processing") return "processing";
    return "pending";
  }

  function getOrderStatus(row) {
    if (typeof shared.getOrderStatus === "function") {
      return mapDbStatus(shared.getOrderStatus(row));
    }

    if (row && row.ngayhuy) return "canceled";
    if (row && row.ngayhoanthanh) return "completed";
    if (row && row.ngaynhan) return "processing";
    return "pending";
  }

  function statusMeta(status) {
    var value = String(status || "").toLowerCase();
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
    if (value === "processing") return 62;
    if (value === "canceled") return 0;
    return 20;
  }

  function parseOrderId(mahd) {
    var raw = String(mahd || "")
      .trim()
      .replace(/^#/, "");
    if (!raw) return 0;

    if (/^\d+$/.test(raw)) {
      var numeric = Number(raw);
      return Number.isFinite(numeric) ? Math.floor(numeric) : 0;
    }

    var digits = raw.replace(/\D+/g, "");
    if (!digits) return 0;
    var id = Number(digits);
    return Number.isFinite(id) ? Math.floor(id) : 0;
  }

  function parseParams() {
    var urlParams = new URLSearchParams(window.location.search);
    return {
      mahd: String(urlParams.get("mahd") || "").trim(),
      phone: String(urlParams.get("sodienthoai") || "").trim(),
      password: String(urlParams.get("password") || "").trim(),
    };
  }

  function setIdentityChip(auth) {
    var roleNode = document.getElementById("accessRole");
    var phoneNode = document.getElementById("accessPhone");
    if (roleNode) {
      roleNode.textContent =
        auth && auth.role === "provider" ? "Nhà cung cấp" : "Khách hàng";
    }
    if (phoneNode) {
      phoneNode.textContent =
        (auth && auth.phone) || (state.params && state.params.phone) || "---";
    }
  }

  function showError(title, message) {
    var foundNode = document.getElementById("detailStateFound");
    var missingNode = document.getElementById("detailStateNotFound");
    var actionNode = document.getElementById("detailActionBar");

    if (foundNode) foundNode.classList.add("d-none");
    if (actionNode) actionNode.classList.add("d-none");
    if (missingNode) missingNode.classList.remove("d-none");

    setText("detailErrorTitle", title || "Không thể truy cập hóa đơn");
    setText(
      "detailErrorMessage",
      message || "Vui lòng kiểm tra lại đường dẫn.",
    );
  }

  function showDetail() {
    var foundNode = document.getElementById("detailStateFound");
    var missingNode = document.getElementById("detailStateNotFound");
    if (foundNode) foundNode.classList.remove("d-none");
    if (missingNode) missingNode.classList.add("d-none");
  }

  async function queryByWhere(table, where) {
    if (typeof window.krudList !== "function") {
      throw new Error("Thư viện KRUD chưa sẵn sàng.");
    }

    var result = await Promise.resolve(
      window.krudList({
        table: table,
        where: where,
        page: 1,
        limit: 1,
      }),
    );

    var rows = extractRows(result);
    return rows.length ? rows[0] : null;
  }

  async function queryFirstByCandidates(table, candidates) {
    var list = Array.isArray(candidates) ? candidates : [];

    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      var field = String(item.field || "").trim();
      var value = String(item.value == null ? "" : item.value).trim();
      if (!field || !value) continue;

      var row = null;
      try {
        row = await queryByWhere(table, [
          {
            field: field,
            operator: "=",
            value: value,
          },
        ]);
      } catch (_) {
        row = null;
      }

      if (row) return row;
    }

    return null;
  }

  async function queryUserByCredentials(table, phone, password) {
    var phoneFields = ["sodienthoai", "user_tel", "phone"];
    var passwordFields = ["matkhau", "password", "user_password"];
    var normalized = normalizePhone(phone);

    for (var i = 0; i < phoneFields.length; i += 1) {
      for (var j = 0; j < passwordFields.length; j += 1) {
        var row = null;
        try {
          row = await queryByWhere(table, [
            {
              field: phoneFields[i],
              operator: "=",
              value: normalized,
            },
            {
              field: passwordFields[j],
              operator: "=",
              value: password,
            },
          ]);
        } catch (_) {
          row = null;
        }

        if (row) return row;
      }
    }

    return null;
  }

  async function authenticateAccess(phone, password) {
    var customer = await queryUserByCredentials(
      CUSTOMER_TABLE,
      phone,
      password,
    );
    if (customer) {
      return {
        role: "customer",
        user: customer,
        phone: normalizePhone(
          customer.sodienthoai || customer.user_tel || customer.phone || phone,
        ),
      };
    }

    var provider = await queryUserByCredentials(
      PROVIDER_TABLE,
      phone,
      password,
    );
    if (provider) {
      return {
        role: "provider",
        user: provider,
        phone: normalizePhone(
          provider.sodienthoai ||
            provider.user_tel ||
            provider.phone ||
            provider.sdt ||
            phone,
        ),
      };
    }

    return null;
  }

  async function loadOrderByMahd(mahd) {
    var orderId = parseOrderId(mahd);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return null;
    }

    if (typeof shared.fetchOrderById === "function") {
      var row = await shared.fetchOrderById(ORDER_TABLE, orderId);
      if (row) return row;
    }

    return queryByWhere(ORDER_TABLE, [
      {
        field: "id",
        operator: "=",
        value: orderId,
      },
    ]);
  }

  async function loadCustomerRecord(order) {
    var customerId = normalizeId(
      order.idkhachhang || order.makhachhang || order.user_id,
    );
    var orderPhone = normalizePhone(order.sodienthoai || order.phone);

    return queryFirstByCandidates(CUSTOMER_TABLE, [
      { field: "id", value: customerId },
      { field: "makhachhang", value: customerId },
      { field: "user_id", value: customerId },
      { field: "sodienthoai", value: orderPhone },
      { field: "user_tel", value: orderPhone },
      { field: "phone", value: orderPhone },
    ]);
  }

  async function loadProviderRecord(order) {
    var providerId = normalizeId(
      order.idnhacungcap ||
        order.id_ncc ||
        order.manhacungcap ||
        order.provider_id,
    );
    var providerPhone = normalizePhone(
      order.sdt_ncc || order.sodienthoai_ncc || order.phone_ncc,
    );
    var providerEmail = String(order.email_ncc || "").trim();

    return queryFirstByCandidates(PROVIDER_TABLE, [
      { field: "id", value: providerId },
      { field: "idnhacungcap", value: providerId },
      { field: "provider_id", value: providerId },
      { field: "manhacungcap", value: providerId },
      { field: "sodienthoai", value: providerPhone },
      { field: "user_tel", value: providerPhone },
      { field: "phone", value: providerPhone },
      { field: "sdt", value: providerPhone },
      { field: "email", value: providerEmail },
      { field: "user_email", value: providerEmail },
    ]);
  }

  async function loadRelatedRecords(order) {
    var results = await Promise.all([
      loadCustomerRecord(order),
      loadProviderRecord(order),
    ]);

    return {
      customer: results[0],
      provider: results[1],
    };
  }

  function mergeOrderWithRelated(order, related) {
    var row = Object.assign({}, order);
    var customer = related && related.customer ? related.customer : null;
    var provider = related && related.provider ? related.provider : null;

    if (customer) {
      row.khachhang = customer;
      row.hovaten = row.hovaten || customer.hovaten || customer.user_name || "";
      row.sodienthoai =
        row.sodienthoai || customer.sodienthoai || customer.user_tel || "";
      row.email = row.email || customer.email || customer.user_email || "";
      row.diachi = row.diachi || customer.diachi || "";
      row.avatar_kh = pickFirstValue([
        row.avatar_kh,
        row.avatartenfile,
        customer.avatar,
        customer.avatar_kh,
        customer.avatartenfile,
      ]);
    }

    if (provider) {
      row.nhacungcap = provider;
      row.idnhacungcap =
        row.idnhacungcap ||
        row.id_ncc ||
        row.manhacungcap ||
        provider.id ||
        provider.idnhacungcap ||
        provider.provider_id ||
        provider.manhacungcap ||
        "";
      row.tennhacungcap =
        row.tennhacungcap || provider.hovaten || provider.user_name || "";
      row.sdt_ncc =
        row.sdt_ncc ||
        provider.sodienthoai ||
        provider.user_tel ||
        provider.sdt ||
        "";
      row.email_ncc =
        row.email_ncc || provider.email || provider.user_email || "";
      row.diachi_ncc = row.diachi_ncc || provider.diachi || "";
      row.avatar_ncc = pickFirstValue([
        row.avatar_ncc,
        row.avatar_nhacungcap,
        row.provider_avatar,
        row.avatar,
        provider.avatar,
        provider.avatar_ncc,
        provider.avatartenfile,
      ]);
    }

    return row;
  }

  function mapOrderView(row) {
    var createdAt = row.ngaydat || row.ngaytao || row.created_at || "";
    var updatedAt =
      row.ngayhoanthanh ||
      row.ngayhuy ||
      row.ngaynhan ||
      row.updated_at ||
      createdAt;

    var status = getOrderStatus(row);
    var serviceFee = toNumber(row.giadichvu);
    var transportFee = toNumber(row.tiendichuyen);
    var surchargeFee = toNumber(row.phuphigiaonhan);
    var totalAmount = toNumber(row.tongtien);

    var qty = toNumber(row.soluong);
    if (qty <= 0) qty = 1;

    return {
      id: toNumber(row.id),
      status: status,
      createdAt: createdAt,
      updatedAt: updatedAt,
      service: row.dichvu || row.dichvuquantam || "Dịch vụ giặt ủi",
      note: row.ghichu || "Không có ghi chú.",
      chemicalsText:
        row.danhsachhoachat || row.hoachathotro || row.danhsach_hoachat || "",
      workItemsText:
        row.danhsachcongviec || row.congviec || row.danhsach_congviec || "",
      deliveryMethod:
        row.hinhthucnhangiao ||
        row.phuongthucgiaonhan ||
        row.transport_option ||
        "",
      receivedAt: row.ngaynhan || row.ngay_nhan || row.received_at || "",
      completedAt:
        row.ngayhoanthanh || row.ngay_hoan_thanh || row.completed_at || "",
      totalAmount: totalAmount,
      extraFee: transportFee + surchargeFee,
      discount: 0,
      serviceFee: serviceFee,
      transportFee: transportFee,
      surchargeFee: surchargeFee,
      customer: {
        id: toNumber(
          row.idkhachhang ||
            row.makhachhang ||
            row.user_id ||
            (row.khachhang &&
              (row.khachhang.id ||
                row.khachhang.makhachhang ||
                row.khachhang.user_id)),
        ),
        name:
          row.hovaten ||
          (row.khachhang &&
            (row.khachhang.hovaten || row.khachhang.user_name)) ||
          "Khách hàng",
        phone:
          row.sodienthoai ||
          (row.khachhang &&
            (row.khachhang.sodienthoai ||
              row.khachhang.user_tel ||
              row.khachhang.phone)) ||
          "",
        email:
          row.email ||
          (row.khachhang &&
            (row.khachhang.email || row.khachhang.user_email)) ||
          "",
        address: row.diachi || (row.khachhang && row.khachhang.diachi) || "",
        avatar: pickFirstValue([
          row.avatar_kh,
          row.avatar_khachhang,
          row.avatar_customer,
          row.customer_avatar,
          row.avatartenfile,
          row.khachhang && row.khachhang.avatar,
          row.khachhang && row.khachhang.avatar_kh,
          row.khachhang && row.khachhang.avatartenfile,
        ]),
      },
      provider: {
        id: toNumber(
          row.idnhacungcap ||
            row.id_ncc ||
            row.manhacungcap ||
            row.provider_id ||
            (row.nhacungcap &&
              (row.nhacungcap.id ||
                row.nhacungcap.idnhacungcap ||
                row.nhacungcap.provider_id ||
                row.nhacungcap.manhacungcap)),
        ),
        name:
          row.tennhacungcap ||
          (row.nhacungcap &&
            (row.nhacungcap.hovaten || row.nhacungcap.user_name)) ||
          "Chưa phân công",
        phone:
          row.sdt_ncc ||
          (row.nhacungcap &&
            (row.nhacungcap.sodienthoai ||
              row.nhacungcap.user_tel ||
              row.nhacungcap.sdt)) ||
          "",
        email:
          row.email_ncc ||
          (row.nhacungcap &&
            (row.nhacungcap.email || row.nhacungcap.user_email)) ||
          "",
        address:
          row.diachi_ncc || (row.nhacungcap && row.nhacungcap.diachi) || "",
        avatar: pickFirstValue([
          row.avatar_ncc,
          row.avatar_nhacungcap,
          row.provider_avatar,
          row.avatar,
          row.nhacungcap && row.nhacungcap.avatar,
          row.nhacungcap && row.nhacungcap.avatar_ncc,
          row.nhacungcap && row.nhacungcap.avatartenfile,
        ]),
      },
      raw: row,
      items: [
        {
          name: row.hinhthucnhangiao || row.dichvu || "Dịch vụ",
          quantity: qty,
          unitPrice: serviceFee,
        },
      ],
    };
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
      candidates.push(encodedText);
    }

    if (text.indexOf("/") < 0) {
      if (kind === "provider") {
        candidates.push(
          "public/asset/image/upload/nhacungcap/" + encodeURIComponent(text),
        );
      }
      if (kind === "customer") {
        candidates.push(
          "public/asset/image/upload/khachhang/" + encodeURIComponent(text),
        );
      }
      candidates.push("uploads/" + encodeURIComponent(text));
      candidates.push("public/uploads/" + encodeURIComponent(text));
    }

    return candidates.filter(function (item, index, list) {
      return item && list.indexOf(item) === index;
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

  function canAccessOrder(auth, order) {
    if (!auth || !order) return false;

    var loginPhone = normalizePhone(auth.phone);
    var loginId = normalizeId(
      auth.user &&
        (auth.user.id ||
          auth.user.idnhacungcap ||
          auth.user.provider_id ||
          auth.user.manhacungcap),
    );

    if (auth.role === "customer") {
      var customerPhones = [
        order.customer && order.customer.phone,
        order.raw && order.raw.sodienthoai,
      ].map(normalizePhone);
      return customerPhones.indexOf(loginPhone) !== -1;
    }

    if (auth.role === "provider") {
      var providerId = normalizeId(order.provider && order.provider.id);
      var providerPhones = [
        order.provider && order.provider.phone,
        order.raw && order.raw.sdt_ncc,
      ].map(normalizePhone);

      var hasAssignedProvider = Boolean(
        providerId || pickFirstValue(providerPhones),
      );
      var idMatched = Boolean(loginId && providerId && loginId === providerId);
      var phoneMatched = providerPhones.indexOf(loginPhone) !== -1;

      return hasAssignedProvider && (idMatched || phoneMatched);
    }

    return false;
  }

  function renderTaskList(order) {
    var listNode = document.getElementById("detailTasksList");
    if (!listNode) return;

    var tasks = taskLinesFromOrder(order);
    listNode.innerHTML = tasks
      .map(function (item, index) {
        return (
          '<li class="task-item">' +
          '<span class="task-index">' +
          (index + 1) +
          "</span>" +
          '<p class="task-text">' +
          safeText(item) +
          "</p>" +
          "</li>"
        );
      })
      .join("");

    setText(
      "detailChemicals",
      splitListText(order.chemicalsText).join(", ") || "Không sử dụng",
    );
    setText("detailNote", order.note || "Không có ghi chú.");
  }

  function renderOrder(order) {
    showDetail();

    var meta = statusMeta(order.status);
    var progressValue = statusProgress(order.status);
    var subtotal = toNumber(order.serviceFee);
    var total =
      toNumber(order.totalAmount) > 0
        ? toNumber(order.totalAmount)
        : subtotal + toNumber(order.extraFee);

    var providerStateText = "Chưa nhận";
    if (order.status === "processing") providerStateText = "Đang xử lý";
    if (order.status === "completed") providerStateText = "Đã hoàn tất";
    if (order.status === "canceled") providerStateText = "Đã hủy";

    setText("heroOrderCode", "#" + formatOrderCode(order.id));
    setText("heroServiceName", safeText(order.service));
    setText("heroServiceFee", formatCurrencyVnd(order.serviceFee));
    setText("heroTransportFee", formatCurrencyVnd(order.transportFee));
    setText("heroSurchargeFee", formatCurrencyVnd(order.surchargeFee));
    setText("heroBookingDate", formatDateTime(order.createdAt));
    setText("heroTotalAmount", formatCurrencyVnd(total));
    setText("heroTimeRange", safeText(order.deliveryMethod));
    var heroDateRangeNode = document.getElementById("heroDateRange");
    if (heroDateRangeNode) {
      if (order.receivedAt || order.completedAt) {
        heroDateRangeNode.textContent =
          formatDateTime(order.receivedAt) +
          " - " +
          formatDateTime(order.completedAt);
        heroDateRangeNode.classList.remove("d-none");
      } else {
        heroDateRangeNode.textContent = "";
        heroDateRangeNode.classList.add("d-none");
      }
    }
    setText("heroAddress", safeText(order.customer && order.customer.address));
    setText("heroProgressPercent", Math.round(progressValue) + "%");

    setText("detailStatusText", meta.label);
    setText("detailProgressText", progressValue.toFixed(2) + "%");
    setText(
      "detailTimelineSummary",
      "Tiến độ sẽ được cập nhật theo từng mốc xử lý.",
    );
    setText("detailExecutionStart", formatDateTime(order.receivedAt));
    setText("detailExecutionEnd", formatDateTime(order.completedAt));

    setText("detailCustomerName", order.customer && order.customer.name);
    setText("detailCustomerPhone", order.customer && order.customer.phone);
    setText("detailCustomerEmail", order.customer && order.customer.email);
    setText("detailCustomerAddress", order.customer && order.customer.address);

    setText("detailProviderName", order.provider && order.provider.name);
    setText("detailProviderPhone", order.provider && order.provider.phone);
    setText("detailProviderEmail", order.provider && order.provider.email);
    setText("detailProviderAddress", order.provider && order.provider.address);

    setText("providerStateChip", providerStateText);

    setText("reviewCustomerText", "Chưa có đánh giá");
    setText("reviewCustomerDate", "---");
    setText("reviewCustomerFile", "Chưa có tệp");
    setText("reviewProviderText", "Chưa có đánh giá");
    setText("reviewProviderDate", "---");
    setText("reviewProviderFile", "Chưa có tệp");

    renderTaskList(order);

    var progressBarNode = document.getElementById("detailProgressBar");
    if (progressBarNode) {
      progressBarNode.style.width = progressValue + "%";
    }

    var ringNode = document.getElementById("heroProgressRing");
    if (ringNode) {
      ringNode.style.setProperty("--progress", String(progressValue));
    }

    var heroBadge = document.getElementById("heroStatusBadge");
    if (heroBadge) {
      heroBadge.className = "invoice-status-chip";
      if (order.status === "pending") heroBadge.classList.add("is-pending");
      if (order.status === "processing")
        heroBadge.classList.add("is-processing");
      if (order.status === "completed") heroBadge.classList.add("is-completed");
      if (order.status === "canceled") heroBadge.classList.add("is-canceled");
      heroBadge.textContent = meta.label;
    }

    var providerChipNode = document.getElementById("providerStateChip");
    if (providerChipNode) {
      providerChipNode.className = "panel-chip";
      if (order.status === "pending" || order.status === "canceled") {
        providerChipNode.classList.add("warn");
      }
      providerChipNode.textContent = providerStateText;
    }

    renderAvatarBadge(
      "customerAvatarBadge",
      order.customer && order.customer.avatar,
      initialsOf(order.customer && order.customer.name, "KH"),
      "customer",
    );
    renderAvatarBadge(
      "providerAvatarBadge",
      order.provider && order.provider.avatar,
      initialsOf(order.provider && order.provider.name, "NCC"),
      "provider",
    );
  }

  function showActionAlert(message, type) {
    var node = document.getElementById("detailActionAlert");
    if (!node) return;

    node.classList.remove(
      "d-none",
      "alert-success",
      "alert-danger",
      "alert-info",
    );
    node.classList.add(type || "alert-info");
    node.textContent = message;
  }

  function hideActionAlert() {
    var node = document.getElementById("detailActionAlert");
    if (!node) return;
    node.classList.add("d-none");
    node.textContent = "";
    node.classList.remove("alert-success", "alert-danger", "alert-info");
  }

  async function updateOrderRow(orderId, payload) {
    if (typeof shared.updateOrder === "function") {
      await shared.updateOrder(ORDER_TABLE, orderId, payload);
      return;
    }

    if (typeof window.krud !== "function") {
      throw new Error("Thư viện KRUD chưa sẵn sàng.");
    }

    var result = await Promise.resolve(
      window.krud("update", ORDER_TABLE, payload, orderId),
    );
    if (!result || result.success === false || result.error) {
      throw new Error(
        (result && (result.error || result.message)) ||
          "Không thể cập nhật hóa đơn.",
      );
    }
  }

  function getActionConfig(authRole, order) {
    var orderStatus = order && order.status;
    var hasReceivedDate = hasDateValue(
      order &&
        (order.receivedAt ||
          (order.raw &&
            (order.raw.ngaynhan ||
              order.raw.ngay_nhan ||
              order.raw.received_at ||
              order.raw.receive_at))),
    );

    if (authRole === "customer") {
      var canCancel =
        !hasReceivedDate &&
        orderStatus !== "completed" &&
        orderStatus !== "canceled";

      return {
        text: "Hủy đơn",
        className: "btn btn-outline-danger",
        hint: hasReceivedDate
          ? "Đơn đã có ngày nhận, không thể hủy."
          : "Khách hàng chỉ có thể hủy đơn khi chưa có ngày nhận.",
        canSubmit: canCancel,
      };
    }

    if (authRole === "provider") {
      return {
        text: "Hoàn thành",
        className: "btn btn-success",
        hint: "Nhà cung cấp xác nhận hoàn thành để kết thúc đơn.",
        canSubmit: orderStatus === "processing",
      };
    }

    return null;
  }

  function renderAction(auth, order) {
    var bar = document.getElementById("detailActionBar");
    var btn = document.getElementById("detailActionBtn");
    var hint = document.getElementById("detailActionHint");

    if (!bar || !btn || !hint) return;

    var action = getActionConfig(auth.role, order);
    if (!action) {
      bar.classList.add("d-none");
      return;
    }

    bar.classList.remove("d-none");
    btn.className = action.className;
    btn.textContent = action.text;
    hint.textContent = action.hint;
    btn.disabled = !action.canSubmit;

    btn.onclick = async function () {
      if (state.isSubmitting || !action.canSubmit) return;
      state.isSubmitting = true;
      hideActionAlert();

      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Đang xử lý...";

      try {
        if (!state.orderRaw || !state.orderRaw.id) {
          throw new Error("Không xác định được mã hóa đơn để cập nhật.");
        }

        if (auth.role === "customer") {
          var hasReceivedDate = hasDateValue(
            state.orderView &&
              (state.orderView.receivedAt ||
                (state.orderView.raw &&
                  (state.orderView.raw.ngaynhan ||
                    state.orderView.raw.ngay_nhan ||
                    state.orderView.raw.received_at ||
                    state.orderView.raw.receive_at))),
          );

          if (hasReceivedDate) {
            throw new Error("Đơn đã có ngày nhận, không thể hủy.");
          }

          await updateOrderRow(state.orderRaw.id, {
            ngayhuy: new Date().toISOString(),
          });
        } else {
          await updateOrderRow(state.orderRaw.id, {
            ngayhoanthanh: new Date().toISOString(),
          });
        }

        await loadAndRenderOrder();
        showActionAlert(
          "Cập nhật trạng thái hóa đơn thành công.",
          "alert-success",
        );
      } catch (error) {
        showActionAlert(
          (error && error.message) || "Không thể cập nhật trạng thái hóa đơn.",
          "alert-danger",
        );
      } finally {
        state.isSubmitting = false;
        btn.textContent = originalText;
      }
    };
  }

  async function loadAndRenderOrder() {
    var params = state.params;
    var auth = state.auth;

    var raw = await loadOrderByMahd(params.mahd);
    if (!raw) {
      showError(
        "Không tìm thấy hóa đơn",
        "Mã hóa đơn không tồn tại hoặc không đúng định dạng.",
      );
      return;
    }

    var related = await loadRelatedRecords(raw);
    var merged = mergeOrderWithRelated(raw, related);
    var mapped = mapOrderView(merged);

    if (!canAccessOrder(auth, mapped)) {
      showError(
        "Không có quyền truy cập",
        "Thông tin truy cập không thuộc về hóa đơn này.",
      );
      return;
    }

    state.orderRaw = merged;
    state.orderView = mapped;

    renderOrder(mapped);
    renderAction(auth, mapped);
  }

  async function bootstrap() {
    try {
      if (typeof window.krudList !== "function") {
        showError(
          "Thiếu thư viện",
          "Không tải được API dữ liệu. Vui lòng tải lại trang.",
        );
        return;
      }

      var params = parseParams();
      state.params = params;

      if (!params.mahd || !params.phone || !params.password) {
        showError(
          "Thiếu tham số truy cập",
          "URL bắt buộc có mahd, sodienthoai và password.",
        );
        return;
      }

      var auth = await authenticateAccess(params.phone, params.password);
      if (!auth) {
        showError(
          "Xác thực thất bại",
          "Số điện thoại hoặc mật khẩu không chính xác.",
        );
        return;
      }

      state.auth = auth;
      setIdentityChip(auth);
      await loadAndRenderOrder();
    } catch (error) {
      showError(
        "Lỗi hệ thống",
        (error && error.message) || "Không thể tải dữ liệu hóa đơn.",
      );
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})(window, document);
