(function (window, document) {
  "use strict";

  var ORDER_TABLE = "datlich_suaxe";
  var USER_TABLE = "nguoidung";
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

  var shared = window.SharedOrderUtils || {};
  var state = {
    params: null,
    auth: null,
    orderView: null,
    orderRaw: null,
    isSubmitting: false,
    isSubmittingReview: false,
  };

  /**
   * Lấy mảng dữ liệu từ kết quả trả về của API KRUD.
   * @param {Object|Array} result Kết quả từ API.
   * @returns {Array} Mảng các hàng dữ liệu.
   */
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

  /**
   * Chuẩn hóa số điện thoại về định dạng 0xxx.
   * @param {string|number} phone Số điện thoại cần chuẩn hóa.
   * @returns {string} Số điện thoại đã chuẩn hóa.
   */
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

  /**
   * Chuẩn hóa ID (loại bỏ khoảng trắng và chuyển về chuỗi).
   * @param {any} id ID cần chuẩn hóa.
   * @returns {string} ID đã chuẩn hóa.
   */
  function normalizeId(id) {
    return String(id == null ? "" : id).trim();
  }

  /**
   * Lấy giá trị đầu tiên không rỗng trong mảng các giá trị.
   * @param {Array} values Mảng các giá trị.
   * @returns {string} Giá trị đầu tiên tìm thấy.
   */
  function pickFirstValue(values) {
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length; i += 1) {
      var text = String(list[i] == null ? "" : list[i]).trim();
      if (text) return text;
    }
    return "";
  }

  /**
   * Chuyển đổi một giá trị bất kỳ sang kiểu số thực (finite number).
   * @param {any} value Giá trị cần chuyển đổi.
   * @returns {number} Giá trị số, mặc định là 0 nếu không hợp lệ.
   */
  function toNumber(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  /**
   * Tính khoảng cách đường bộ giữa 2 điểm tọa độ qua API OSRM.
   * @param {number} lat1 Vĩ độ điểm 1.
   * @param {number} lon1 Kinh độ điểm 1.
   * @param {number} lat2 Vĩ độ điểm 2.
   * @param {number} lon2 Kinh độ điểm 2.
   * @returns {Promise<number>} Khoảng cách tính bằng km.
   */
  async function getDistance(lat1, lon1, lat2, lon2) {
    var url =
      "https://router.project-osrm.org/route/v1/driving/" +
      lon1 +
      "," +
      lat1 +
      ";" +
      lon2 +
      "," +
      lat2 +
      "?overview=false";

    var res = await fetch(url);
    if (!res.ok) throw new Error("Không thể tính khoảng cách di chuyển.");

    var data = await res.json();
    if (!data.routes || !data.routes.length) {
      throw new Error("Không tính được khoảng cách giữa 2 vị trí.");
    }

    return Number((data.routes[0].distance / 1000).toFixed(2));
  }

  /**
   * Tính toán phí vận chuyển và tổng tiền dựa trên khoảng cách di chuyển.
   * @param {Object} order Dữ liệu đơn hàng thô.
   * @param {number} distanceKm Khoảng cách tính được (km).
   * @returns {Object} Kết quả tính toán giá.
   */
  async function calculatePricing(order, distanceKm) {
    var surchargeFee = toNumber(order.phikhaosat || (order.raw && order.raw.phikhaosat));
    
    var feeResult = await window.krudList({ table: "phidichuyen" });
    var feeRows = extractRows(feeResult);
    
    var transportFee = 0;
    if (distanceKm >= 3) {
      var dateVal = order.ngaydat || (order.raw && order.raw.ngaydat) || new Date().toISOString();
      var checkDate = new Date(dateVal);
      var hour = checkDate.getHours();
      var isUrgent = order.yeucaugap === "Có" || (order.raw && order.raw.yeucaugap === "Có");
      
      var targetLoaiphi;
      if (isUrgent) {
          targetLoaiphi = "Gấp";
      } else if (hour >= 6 && hour < 18) {
          targetLoaiphi = "Thưởng";
      } else {
          targetLoaiphi = "Buổi tối";
      }

      var rate = 0;
      for (var i = 0; i < feeRows.length; i++) {
         if (feeRows[i].loaiphi === targetLoaiphi) {
            rate = toNumber(feeRows[i].sotien);
            break;
         }
      }

      var billableKm = distanceKm - 3;
      transportFee = billableKm * rate;
    }

    return {
      distanceKm: distanceKm,
      transportFee: Math.round(transportFee),
      totalAmount: surchargeFee + Math.round(transportFee),
    };
  }

  /**
   * Kiểm tra một giá trị có phải là ngày tháng hợp lệ không.
   * @param {any} value Giá trị cần kiểm tra.
   * @returns {boolean} True nếu là ngày hợp lệ.
   */
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

  /**
   * Gán nội dung văn bản cho một phần tử DOM theo ID.
   * @param {string} id ID của phần tử DOM.
   * @param {any} value Giá trị cần hiển thị.
   */
  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) {
      node.textContent = String(value == null || value === "" ? "---" : value);
    }
  }

  /**
   * Định dạng ID đơn hàng thành mã chuỗi có 7 chữ số.
   * @param {number|string} orderId ID đơn hàng.
   * @returns {string} Mã đơn hàng đã định dạng.
   */
  function formatOrderCode(orderId) {
    if (typeof shared.formatOrderCode === "function") {
      return shared.formatOrderCode(orderId);
    }
    var id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) return "-";
    return String(Math.floor(id)).padStart(7, "0");
  }

  /**
   * Định dạng số thành chuỗi tiền tệ tiếng Việt có hậu tố VND.
   * @param {number|string} value Giá trị số.
   * @returns {string} Chuỗi tiền tệ.
   */
  function formatCurrencyVnd(value) {
    var num = toNumber(value);
    return num.toLocaleString("vi-VN") + " VND";
  }

  /**
   * Định dạng ngày giờ theo kiểu Việt Nam.
   * @param {string|Date} value Giá trị ngày tháng.
   * @returns {string} Chuỗi ngày giờ định dạng.
   */
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

  /**
   * Trả về chuỗi văn bản đã trim hoặc "---" nếu rỗng.
   * @param {any} value Giá trị văn bản.
   * @returns {string} Văn bản an toàn để hiển thị.
   */
  function safeText(value) {
    var text = String(value || "").trim();
    return text || "---";
  }

  /**
   * Lấy nhãn hiển thị cho trạng thái thanh toán.
   * @param {string} value Mã trạng thái từ DB.
   * @returns {string} Nhãn tiếng Việt.
   */
  function getPaymentStatusLabel(value) {
    if (typeof shared.getPaymentStatusLabel === "function") {
      return shared.getPaymentStatusLabel(value);
    }
    return String(value || "")
      .trim()
      .toLowerCase() === "paid"
      ? "Đã thanh toán"
      : "Chưa thanh toán";
  }

  /**
   * Lấy chữ cái đầu của tên dùng làm fallback cho avatar.
   * @param {string} name Tên đầy đủ.
   * @param {string} fallback Giá trị thay thế.
   * @returns {string} Các chữ cái đầu.
   */
  function initialsOf(name, fallback) {
    var text = String(name || "").trim();
    if (!text) return fallback || "--";
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return fallback || "--";
    var first = words[0].charAt(0);
    var last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  }

  /**
   * Tách một chuỗi danh sách thành mảng.
   * @param {string} value Chuỗi cần tách.
   * @returns {string[]} Mảng các mục.
   */
  function splitListText(value) {
    return String(value || "")
      .split(/[\n,;]+/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  /**
   * Tạo danh sách các bước thực hiện công việc từ dữ liệu đơn hàng.
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {string[]} Danh sách chuỗi mô tả.
   */
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
      return safeText(item.name);
    });
  }

  /**
   * Ánh xạ trạng thái thô sang mã trạng thái chuẩn của hệ thống.
   * @param {string} status Trạng thái thô.
   * @returns {string} Mã trạng thái chuẩn.
   */
  function mapDbStatus(status) {
    var value = String(status || "").toLowerCase();
    if (value === "cancel") return "canceled";
    if (value === "completed") return "completed";
    if (value === "accepted" || value === "received") return "accepted";
    if (value === "processing") return "processing";
    return "pending";
  }

  /**
   * Xác định trạng thái của đơn hàng dựa trên các mốc thời gian.
   * @param {Object} row Hàng dữ liệu đơn hàng.
   * @returns {string} Mã trạng thái chuẩn.
   */
  function getOrderStatus(row) {
    if (typeof shared.getOrderStatus === "function") {
      return mapDbStatus(shared.getOrderStatus(row));
    }

    if (row && row.ngayhuy) {
      return "canceled";
    }
    if (row && row.ngayhoanthanh) {
      return "completed";
    }
    if (row && row.ngaybatdau) {
      return "processing";
    }
    if (row && row.ngaynhan) {
      return "accepted";
    }
    return "pending";
  }

  /**
   * Lấy metadata cho trạng thái hiển thị (nhãn và CSS class).
   * @param {string} status Mã trạng thái chuẩn.
   * @returns {Object} Metadata.
   */
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

  /**
   * Trả về phần trăm tiến độ tương ứng cho mỗi trạng thái.
   * @param {string} status Mã trạng thái chuẩn.
   * @returns {number} Phần trăm.
   */
  function statusProgress(status) {
    var value = String(status || "").toLowerCase();
    if (value === "completed") return 100;
    if (value === "processing") return 65;
    if (value === "accepted") return 30;
    return 0;
  }

  /**
   * Trích xuất ID số từ mã đơn hàng văn bản.
   * @param {string} madh Mã đơn hàng văn bản.
   * @returns {number} ID dạng số.
   */
  function parseOrderId(madh) {
    var raw = String(madh || "")
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

  /**
   * Trích xuất các tham số từ URL.
   * @returns {Object} Các tham số madh, phone, password.
   */
  function parseParams() {
    var urlParams = new URLSearchParams(window.location.search);
    return {
      madh: String(urlParams.get("madh") || "").trim(),
      phone: String(urlParams.get("sodienthoai") || "").trim(),
      password: String(urlParams.get("password") || "").trim(),
    };
  }

  /**
   * Hiển thị thông tin người dùng hiện tại lên UI.
   * @param {Object} auth Thông tin xác thực.
   */
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

  /**
   * Hiển thị nội dung lỗi khi không truy cập được đơn hàng (Lỗi trang).
   * @param {string} title Tiêu đề lỗi.
   * @param {string} message Mô tả lỗi.
   */
  function showPageError(title, message) {
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

  /**
   * Hiển thị phần chi tiết đơn hàng (ẩn màn hình lỗi).
   */
  function showDetail() {
    var foundNode = document.getElementById("detailStateFound");
    var missingNode = document.getElementById("detailStateNotFound");
    if (foundNode) foundNode.classList.remove("d-none");
    if (missingNode) missingNode.classList.add("d-none");
  }

  /**
   * Tìm kiếm một bản ghi theo điều kiện cụ thể dùng KRUD.
   * @param {string} table Tên bảng.
   * @param {Array} where Các điều kiện lọc.
   * @returns {Promise<Object|null>}
   */
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

  /**
   * Thử tìm kiếm bản ghi qua một danh sách các field tiềm năng.
   * @param {string} table Tên bảng.
   * @param {Array} candidates Các trường và giá trị ứng viên.
   * @returns {Promise<Object|null>}
   */
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

  /**
   * Xác thực người dùng bằng số điện thoại và mật khẩu.
   * @param {string} table Bảng người dùng.
   * @param {string} phone SĐT.
   * @param {string} password Mật khẩu.
   * @returns {Promise<Object|null>}
   */
  async function queryUserByCredentials(table, phone, password) {
    var phoneFields = ["sodienthoai", "user_tel", "phone"];
    var passwordFields = ["matkhau", "password"];
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

  /**
   * Xử lý xác thực đăng nhập và phân quyền (Nhà cung cấp / Khách hàng).
   * @param {string} phone SĐT.
   * @param {string} password Mật khẩu.
   * @returns {Promise<Object|null>}
   */
  async function authenticateAccess(phone, password) {
    var user = await queryUserByCredentials(USER_TABLE, phone, password);
    if (!user) return null;

    var idDichvu = String(user.id_dichvu || "").trim();
    var serviceIds = idDichvu.split(",").map(function(s) { return s.trim(); });
    var isProvider = serviceIds.indexOf("8") !== -1;

    return {
      role: isProvider ? "provider" : "customer",
      user: user,
      phone: normalizePhone(user.sodienthoai || user.user_tel || user.phone || phone),
    };
  }

  /**
   * Tải thông tin đơn hàng từ mã đơn.
   * @param {string} madh Mã đơn hàng.
   * @returns {Promise<Object|null>}
   */
  async function loadOrderBymadh(madh) {
    var orderId = parseOrderId(madh);
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

  /**
   * Tải thông tin khách hàng từ đơn hàng hiện tại.
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {Promise<Object|null>}
   */
  async function loadCustomerRecord(order) {
    var orderPhone = normalizePhone(order.sodienthoai);

    return queryFirstByCandidates("nguoidung", [
      { field: "sodienthoai", value: orderPhone },
      { field: "user_tel", value: orderPhone },
      { field: "phone", value: orderPhone },
    ]);
  }

  /**
   * Tải thông tin nhà cung cấp phục vụ đơn hàng.
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {Promise<Object|null>}
   */
  async function loadProviderRecord(order) {
    var providerId = normalizeId(order.idnhacungcap);
    var providerPhone = normalizePhone(order.sdt_ncc);
    var providerEmail = String(order.email_ncc || "").trim();

    return queryFirstByCandidates("nguoidung", [
      { field: "id", value: providerId },
      { field: "sodienthoai", value: providerPhone },
      { field: "user_tel", value: providerPhone },
      { field: "email", value: providerEmail },
      { field: "user_email", value: providerEmail },
    ]);
  }

  /**
   * Tải đồng thời tất cả các bản ghi liên quan (Khách hàng, NCC).
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {Promise<Object>}
   */
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

  /**
   * Kết hợp dữ liệu đơn hàng và thông tin chi tiết của người dùng/NCC.
   * @param {Object} order Đơn hàng thô.
   * @param {Object} related Các bản ghi liên quan.
   * @returns {Object} Đơn hàng đã được làm giàu dữ liệu.
   */
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
      row.avatar_kh = customer.link_avatar || customer.avatar || "";
    }

    if (provider) {
      row.nhacungcap = provider;
      row.idnhacungcap = row.idnhacungcap || provider.id || "";
      row.tennhacungcap = row.tennhacungcap || provider.hovaten || provider.user_name || "";
      row.sdt_ncc = row.sdt_ncc || provider.sodienthoai || provider.user_tel || "";
      row.email_ncc = row.email_ncc || provider.email || provider.user_email || "";
      row.diachi_ncc = row.diachi_ncc || provider.diachi || "";
      row.avatar_ncc = provider.link_avatar || provider.avatar || "";
    }

    return row;
  }

  /**
   * Kiểm tra xem đơn hàng đã được giao cho nhà cung cấp nào chưa.
   * @param {Object} row Hàng dữ liệu đơn hàng.
   * @returns {boolean}
   */
  function hasAssignedProviderRow(row) {
    var providerId = normalizeId(row.idnhacungcap);

    if (!providerId || providerId === "0") return false;

    var providerName = row.tennhacungcap;
    var providerPhone = normalizePhone(row.sdt_ncc);
    var providerEmail = String(row.email_ncc || "").trim().toLowerCase();

    return Boolean(providerName || providerPhone || providerEmail);
  }

  /**
   * Chuyển đổi dữ liệu thực thể sang đối tượng chuẩn cho giao diện (View Object).
   * @param {Object} row Hàng dữ liệu đã qua tiền xử lý.
   * @returns {Object}
   */
  function mapOrderView(row) {
    var createdAt = row.ngaydat || row.created_date || "";
    var updatedAt =
      row.ngayhoanthanh ||
      row.ngayhuy ||
      row.ngaybatdau ||
      row.ngaynhan ||
      createdAt;

    var status = getOrderStatus(row);
    var transportFee = toNumber(row.tiendichuyen);
    var surchargeFee = toNumber(row.phikhaosat);
    var tongtienthucte = toNumber(row.tongtienthucte);
    var totalAmount = tongtienthucte > 0 ? tongtienthucte : toNumber(row.tongtien);
    var discountFee = toNumber(row.sotiengiam);
    var hasAssignedProvider = hasAssignedProviderRow(row);

    var qty = 1;

    return {
      id: toNumber(row.id),
      status: status,
      createdAt: createdAt,
      updatedAt: updatedAt,
      service: row.dichvu || "Dịch vụ sửa xe",
      note: row.ghichu || "Không có ghi chú.",
      vehicleInfo: {
        type: row.loaixe || "",
        brand: row.hangxe || "",
        model: row.mauxe || "",
      },
      receivedAt: row.ngaynhan || "",
      startedAt: row.ngaybatdau || "",
      completedAt: row.ngayhoanthanh || "",
      totalAmount: totalAmount,
      extraFee: transportFee + surchargeFee,
      discount: discountFee,
      transportFee: transportFee,
      surchargeFee: surchargeFee,
      paymentStatus: row.trangthaithanhtoan || "Unpaid",
      customer: {
        id: 0,
        name: row.hovaten || "Khách hàng",
        phone: row.sodienthoai || "",
        email: row.email || "",
        address: row.diachi || "",
        avatar: row.avatar_kh || "",
      },
      provider: {
        id: hasAssignedProvider ? toNumber(row.idnhacungcap) : 0,
        name: hasAssignedProvider ? row.tennhacungcap || "Chưa phân công" : "Chưa phân công",
        phone: hasAssignedProvider ? row.sdt_ncc || "" : "",
        email: hasAssignedProvider ? row.email_ncc || "" : "",
        address: hasAssignedProvider ? row.diachi_ncc || "" : "",
        avatar: hasAssignedProvider ? pickFirstValue([row.avatar_ncc]) : "",
      },
      raw: row,
      anh_id: row.anh_id || "",
      video_id: row.video_id || "",
      items: [
        {
          name: row.dichvu || "Dịch vụ",
          quantity: qty,
          unitPrice: 0,
        },
      ],
    };
  }

  /**
   * Sinh danh sách các URL tiềm năng cho ảnh đại diện.
   * @param {string} rawValue Đường dẫn ảnh thô.
   * @param {string} kind Loại đối tượng.
   * @returns {string[]}
   */
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

  /**
   * Hiển thị avatar hoặc tên viết tắt lên giao diện.
   * @param {string} id ID phần tử.
   * @param {string} avatarValue Giá trị ảnh.
   * @param {string} fallbackText Text thay thế.
   * @param {string} kind Loại đối tượng.
   */
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

  /**
   * Chuẩn hóa tên người phục vụ cho việc so sánh.
   * @param {string} value Tên thô.
   * @returns {string} Tên sạch.
   */
  function normalizePersonName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Trích xuất thông tin định danh NCC từ đối tượng xác thực.
   * @param {Object} auth
   * @returns {Object}
   */
  function resolveProviderIdentity(auth) {
    var user = (auth && auth.user) || {};
    var providerId = normalizeId(user.id || user.idnhacungcap || user.user_id);

    return {
      id: providerId,
      name: user.hovaten || user.user_name || user.hoten || "",
      phone: normalizePhone(user.sodienthoai || user.user_tel || user.phone || ""),
      email: String(user.email || user.user_email || "").trim(),
      address: String(user.diachi || "").trim(),
      lat: user.maplat || user.lat || "",
      lng: user.maplng || user.lng || "",
    };
  }

  /**
   * Kiểm tra quyền xem chi tiết đơn hàng của người dùng.
   * @param {Object} auth Thông tin đăng nhập.
   * @param {Object} order Đối tượng đơn hàng.
   * @returns {boolean}
   */
  function canAccessOrder(auth, order) {
    if (!auth || !order) return false;

    var loginPhone = normalizePhone(auth.phone);

    if (auth.role === "customer") {
      var customerPhones = [
        order.customer && order.customer.phone,
        order.raw && order.raw.sodienthoai,
      ].map(normalizePhone);
      var orderCustomerName = normalizePersonName(
        (order.customer && order.customer.name) ||
          (order.raw && (order.raw.hovaten || order.raw.tenkhachhang)) ||
          "",
      );
      var loginCustomerName = normalizePersonName(
        (auth.user && (auth.user.hovaten || auth.user.user_name || auth.user.hoten)) || "",
      );

      var phoneMatched = customerPhones.indexOf(loginPhone) !== -1;
      var nameMatched =
        Boolean(orderCustomerName) &&
        Boolean(loginCustomerName) &&
        orderCustomerName === loginCustomerName;

      return phoneMatched && nameMatched;
    }

    if (auth.role === "provider") {
      return true;
    }

    return false;
  }

  /**
   * Hiển thị danh sách các bước công việc lên UI.
   * @param {Object} order
   */
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

  }

  /**
   * Trả về tiền tố ID cho các chức năng đánh giá.
   * @param {string} actor Đối tượng.
   * @returns {string} Customer/Provider.
   */
  function reviewPrefix(actor) {
    return actor === "provider" ? "Provider" : "Customer";
  }

  /**
   * Lấy nhanh nút/phần tử DOM trong phần đánh giá.
   * @param {string} actor
   * @param {string} suffix
   * @returns {HTMLElement}
   */
  function reviewNode(actor, suffix) {
    return document.getElementById("review" + reviewPrefix(actor) + suffix);
  }

  /**
   * Tìm key (trường) đầu tiên tồn tại trong dữ liệu thực tế.
   * @param {Object} row
   * @param {string[]} keys
   * @param {string} fallback
   * @returns {string}
   */
  function firstExistingKey(row, keys, fallback) {
    var source = row && typeof row === "object" ? row : {};
    var list = Array.isArray(keys) ? keys : [];
    for (var i = 0; i < list.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(source, list[i])) {
        return list[i];
      }
    }
    return fallback;
  }

  /**
   * Lấy giá trị của trường đánh giá đầu tiên tìm được.
   * @param {Object} row
   * @param {string[]} keys
   * @returns {any}
   */
  function firstReviewValue(row, keys) {
    var source = row && typeof row === "object" ? row : {};
    var list = Array.isArray(keys) ? keys : [];
    for (var i = 0; i < list.length; i += 1) {
      var value = source[list[i]];
      if (value == null) continue;
      if (Array.isArray(value) && value.length) return value;
      var text = String(value).trim();
      if (text) return text;
    }
    return "";
  }

  /**
   * Chuẩn hóa mảng/chuỗi chứa file media đánh giá.
   * @param {any} value
   * @returns {string[]}
   */
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
        if (parsed && Array.isArray(parsed.files))
          return parseReviewMedia(parsed.files);
      } catch (_) {}
    }

    return text
      .split(/[\n,;]+/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  /**
   * Xử lý trùng lặp và loại bỏ file media rỗng.
   * @param {string[]} files
   * @returns {string[]}
   */
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

  /**
   * Tổng hợp dữ liệu đánh giá đầy đủ cho Customer/Provider.
   * @param {Object} raw
   * @param {string} actor
   * @returns {Object}
   */
  function resolveReviewData(raw, actor) {
    var source = raw && typeof raw === "object" ? raw : {};
    var config = REVIEW_FIELD_MAP[actor] || REVIEW_FIELD_MAP.customer;
    var text = firstReviewValue(source, config.text);
    var date = firstReviewValue(source, config.date);
    var mediaRaw = firstReviewValue(source, config.media);

    return {
      text: String(text || "").trim(),
      date: String(date || "").trim(),
      files: dedupeMedia(parseReviewMedia(mediaRaw)),
      columns: {
        text: firstExistingKey(source, config.text, config.text[0]),
        date: firstExistingKey(source, config.date, config.date[0]),
        media: firstExistingKey(source, config.media, config.media[0]),
      },
    };
  }

  /**
   * Chuyển đổi tên tệp media sang đường dẫn tuyệt đối.
   * @param {string} path
   * @returns {string}
   */
  function resolveReviewMediaUrl(path) {
    var value = String(path || "")
      .trim()
      .replace(/\\/g, "/");
    if (!value) return "";
    if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
    if (value.indexOf("./") === 0 || value.indexOf("../") === 0) return value;
    if (value.indexOf("public/") === 0) return value;
    return "public/asset/image/upload/danhgia/" + value.replace(/^\/+/, "");
  }

  /**
   * Hiển thị lưới ảnh/video đánh giá lên giao diện.
   * @param {HTMLElement} container
   * @param {string[]} files
   */
  function renderReviewMedia(container, files) {
    if (!container) return;
    container.className = "review-file";
    container.textContent = "";

    var list = Array.isArray(files) ? files : [];
    if (!list.length) {
      container.textContent = "Chưa có tệp";
      return;
    }

    container.classList.add("review-file-media");
    var grid = document.createElement("div");
    grid.className = "review-media-grid";

    list.forEach(function (item, index) {
      var isGoogleDrive = item && !item.includes("/") && !item.includes(".");
      var url = isGoogleDrive ? "" : resolveReviewMediaUrl(item);
      
      var lower = url.toLowerCase();
      var isVideo = !isGoogleDrive && /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/.test(lower);

      var link = document.createElement("a");
      link.className = "review-media-item";
      link.href = isGoogleDrive ? "https://drive.google.com/file/d/" + item + "/view" : url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = "Mở tệp " + (index + 1);

      var preview;
      if (isGoogleDrive) {
        preview = document.createElement("div");
        preview.className = "ratio ratio-1x1 border rounded overflow-hidden bg-light";
        preview.innerHTML = '<iframe src="https://drive.google.com/file/d/' + item + '/preview" allow="autoplay" style="border:0; width:100%; height:100%;"></iframe>';
      } else if (isVideo) {
        preview = document.createElement("video");
        preview.controls = true;
        preview.className = "review-media-preview";
        preview.preload = "metadata";
        preview.src = url;
      } else {
        preview = document.createElement("img");
        preview.alt = "Tệp đánh giá " + (index + 1);
        preview.className = "review-media-preview";
        preview.loading = "lazy";
        preview.src = url;
      }
      link.appendChild(preview);
      grid.appendChild(link);
    });

    if (!grid.children.length) {
      container.classList.remove("review-file-media");
      container.textContent = "Chưa có tệp";
      return;
    }

    container.appendChild(grid);
  }

  /**
   * Cập nhật trạng thái hiển thị của chip "Đã/Chưa có" đánh giá.
   * @param {string} actor
   * @param {boolean} hasData
   */
  function setReviewChip(actor, hasData) {
    var chip = reviewNode(actor, "Chip");
    if (!chip) return;
    chip.classList.toggle("warn", !hasData);
    chip.textContent = hasData ? "Đã có" : "Chưa có";
  }

  /**
   * Vẽ nội dung chi tiết của một phần đánh giá.
   * @param {string} actor
   * @param {Object} review
   */
  function renderReviewSection(actor, review) {
    var info = review || { text: "", date: "", files: [] };
    var hasData = Boolean(info.text || (info.files && info.files.length));
    setText(
      "review" + reviewPrefix(actor) + "Text",
      info.text || "Chưa có đánh giá",
    );
    setText(
      "review" + reviewPrefix(actor) + "Date",
      info.date ? formatDateTime(info.date) : "---",
    );
    renderReviewMedia(reviewNode(actor, "File"), info.files || []);
    setReviewChip(actor, hasData);
  }

  /**
   * Hiển thị cả hai phần đánh giá của KH và NCC.
   * @param {Object} order
   */
  function renderReviews(order) {
    var raw = (order && order.raw) || {};
    renderReviewSection("customer", resolveReviewData(raw, "customer"));
    renderReviewSection("provider", resolveReviewData(raw, "provider"));
  }

  /**
   * Kiểm tra xem object review hiện tại có dữ liệu thực sự hay không.
   * @param {Object} review
   * @returns {boolean}
   */
  function hasReviewData(review) {
    var info = review || {};
    var text = String(info.text || "").trim();
    var date = String(info.date || "").trim();
    var files = Array.isArray(info.files) ? info.files : [];
    return Boolean(text || date || files.length);
  }
  /**
   * Đồng bộ các trình soạn thảo đánh giá dựa trên trạng thái đơn hàng.
   * @param {Object} order
   */
  function syncReviewEditors(order) {
    var auth = state.auth || {};
    var status = String((order && order.status) || "").toLowerCase();
    var isCompleted = status === "completed";

    ["customer", "provider"].forEach(function (actor) {
      var editor = reviewNode(actor, "Editor");
      if (!editor) return;

      var data = resolveReviewData(state.orderRaw || {}, actor);
      var hasData = hasReviewData(data);
      var canEdit = auth.role === actor && isCompleted && !hasData;
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

  /**
   * Hàm chính để hiển thị mọi thông tin đơn hàng lên UI.
   * @param {Object} order
   */
  function renderOrder(order) {
    showDetail();

    var meta = statusMeta(order.status);
    var progressValue = statusProgress(order.status);

    var hasReceivedDate = hasDateValue(order && order.receivedAt);
    var hasStartedDate = hasDateValue(order && order.startedAt);
    var hasCompletedDate = hasDateValue(order && order.completedAt);
    var isCanceled = hasDateValue(
      order &&
        order.raw &&
        (order.raw.ngayhuy),
    );
    var providerStateText = "Chưa nhận";
    if (isCanceled) {
      providerStateText = "Đã hủy";
    } else if (hasCompletedDate) {
      providerStateText = "Đã hoàn tất";
    } else if (hasStartedDate) {
      providerStateText = "Đang xử lý";
    } else if (hasReceivedDate && !hasStartedDate) {
      providerStateText = "Đã nhận đơn";
    }

    setText("heroOrderCode", "#" + formatOrderCode(order.id));
    setText("heroServiceName", safeText(order.service));
    setText("heroTotalAmount", formatCurrencyVnd(order.totalAmount));
    setText("heroTransportFee", formatCurrencyVnd(order.transportFee));
    setText("heroSurchargeFee", formatCurrencyVnd(order.surchargeFee));
    setText("heroDiscountFee", formatCurrencyVnd(order.discount));
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
    setText("heroTimeRange", getPaymentStatusLabel(order.paymentStatus));
    if (order.vehicleInfo) {
      setText("detailVehicleType", order.vehicleInfo.type);
      setText("detailVehicleBrand", order.vehicleInfo.brand);
      setText("detailVehicleModel", order.vehicleInfo.model);
    }
    setText("detailNote", order.note || "Không có ghi chú.");
    
    var yeucauValue = (order.raw && order.raw.yeucaugap) || "Không";
    setText("detailUrgent", yeucauValue === "Có" ? "Có (trong 1h)" : "Không");
    var urgentEl = document.getElementById("detailUrgent");
    if(urgentEl) {
        if(yeucauValue === "Có") {
            urgentEl.classList.add("text-danger", "fw-bold");
        } else {
            urgentEl.classList.remove("text-danger");
        }
    }
    
    var heroDateRangeNode = document.getElementById("heroDateRange");
    if (heroDateRangeNode) {
      heroDateRangeNode.textContent = "";
      heroDateRangeNode.classList.add("d-none");
    }
    setText("heroAddress", safeText(order.customer && order.customer.address));
    setText("heroProgressPercent", Math.round(progressValue) + "%");

    setText("detailStatusText", meta.label);
    setText("detailProgressText", progressValue.toFixed(2) + "%");
    setText(
      "detailTimelineSummary",
      "Tiến độ sẽ được cập nhật theo từng mốc xử lý.",
    );

    setText("detailCustomerName", order.customer && order.customer.name);
    setText("detailCustomerPhone", order.customer && order.customer.phone);
    setText("detailCustomerEmail", order.customer && order.customer.email);
    setText("detailCustomerAddress", order.customer && order.customer.address);

    setText("detailProviderName", order.provider && order.provider.name);
    setText("detailProviderPhone", order.provider && order.provider.phone);
    setText("detailProviderEmail", order.provider && order.provider.email);
    setText("detailProviderAddress", order.provider && order.provider.address);

    setText("providerStateChip", providerStateText);

    renderReviews(order);
    syncReviewEditors(order);

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
      if (order.status === "accepted") heroBadge.classList.add("is-accepted");
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

    var canShowProviderAvatar =
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

    renderAvatarBadge(
      "providerAvatarBadge",
      canShowProviderAvatar ? order.provider && order.provider.avatar : "",
      initialsOf(order.provider && order.provider.name, "NCC"),
      "provider",
    );

    // Hiển thị khung thanh toán cho khách hàng nếu đơn đã hoàn thành nhưng chưa thanh toán
    var paymentPanel = document.getElementById("paymentPanel");
    if (paymentPanel) {
      var isCompleted = String(order.status || "").toLowerCase() === "completed";
      var isUnpaid = String(order.paymentStatus || "").toLowerCase() !== "paid";
      var isCustomer = (state.auth && state.auth.role) === "customer";
      
      paymentPanel.classList.toggle("d-none", !(isCompleted && isUnpaid && isCustomer));
    }

    renderSourceMedia(order);
  }

  /**
   * Hiển thị ảnh và video hiện trường từ Google Drive.
   * @param {Object} order
   */
  function renderSourceMedia(order) {
    var raw = order.raw || {};
    var anhIds = splitListText(raw.anh_id);
    var videoIds = splitListText(raw.video_id);

    var imgMount = document.getElementById("detailMediaImages");
    var videoMount = document.getElementById("detailMediaVideos");
    var container = document.getElementById("detailMediaSection");

    if (!imgMount && !videoMount) return;

    var hasMedia = anhIds.length > 0 || videoIds.length > 0;
    if (container) {
      container.classList.toggle("d-none", !hasMedia);
    }

    if (imgMount) {
      imgMount.innerHTML = "";
      if (anhIds.length === 0) {
        imgMount.innerHTML = '<p class="text-muted small">Không có ảnh hiện trường</p>';
      } else {
        var grid = document.createElement("div");
        grid.className = "row g-2";
        anhIds.forEach(function (id) {
          var col = document.createElement("div");
          col.className = "col-6 col-md-4";
          col.innerHTML =
            '<div class="ratio ratio-1x1 border rounded overflow-hidden shadow-sm bg-light">' +
            '<iframe src="https://drive.google.com/file/d/' +
            id +
            '/preview" allow="autoplay" style="border:0"></iframe>' +
            "</div>";
          grid.appendChild(col);
        });
        imgMount.appendChild(grid);
      }
    }

    if (videoMount) {
      videoMount.innerHTML = "";
      if (videoIds.length === 0) {
        videoMount.innerHTML =
          '<p class="text-muted small">Không có video hiện trường</p>';
      } else {
        videoIds.forEach(function (id) {
          var wrapper = document.createElement("div");
          wrapper.className = "mb-2 border rounded overflow-hidden shadow-sm bg-light";
          wrapper.innerHTML =
            '<div class="ratio ratio-16x9">' +
            '<iframe src="https://drive.google.com/file/d/' +
            id +
            '/preview" allow="autoplay" style="border:0"></iframe>' +
            "</div>";
          videoMount.appendChild(wrapper);
        });
      }
    }
  }

  function showActionAlert(message, type) {
    if (type === "alert-success") {
      showSuccess(message);
    } else if (type === "alert-danger") {
      showError(message);
    } else {
      showInfo(message);
    }
  }

  /**
   * Ẩn tất cả các thông báo hành động đang hiện.
   */
  function hideActionAlert() {
    var node = document.getElementById("detailActionAlert");
    if (!node) return;
    node.classList.add("d-none");
    node.textContent = "";
    node.classList.remove("alert-success", "alert-danger", "alert-info");
  }

  /**
   * Cập nhật bản ghi đơn hàng trong cơ sở dữ liệu dùng API update.
   * @param {number|string} orderId ID đơn hàng.
   * @param {Object} payload Dữ liệu cần cập nhật.
   */
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

  /**
   * Tải các tệp đánh giá lên máy chủ.
   * @param {File[]} files
   * @returns {Promise<string[]>}
   */
  async function uploadReviewFiles(files) {
    var list = Array.isArray(files) ? files : [];
    if (!list.length) return [];

    var fileIds = [];
    for (var i = 0; i < list.length; i++) {
      var file = list[i];
      var formData = new FormData();
      formData.append("upload", "1");
      formData.append("file", file);
      formData.append("name", "REVIEW_" + Date.now() + "_" + file.name);

      try {
        var res = await fetch("upload.php", {
          method: "POST",
          body: formData,
        });
        var data = await res.json();
        if (data && data.fileId) {
          fileIds.push(data.fileId);
        } else {
          console.error("Upload review file failed:", data);
        }
      } catch (err) {
        console.error("Upload review file error:", err);
      }
    }

    return fileIds;
  }

  /**
   * Chuyển form đánh giá sang trạng thái đang xử lý.
   * @param {string} actor
   * @param {boolean} isLoading
   */
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

  /**
   * Quy trình gửi một đánh giá mới.
   * @param {string} actor
   */
  async function submitReview(actor) {
    if (state.isSubmittingReview) return;

    var authRole = (state.auth && state.auth.role) || "";
    if (authRole !== actor) {
      showActionAlert("Ban khong co quyen gui danh gia nay.", "alert-danger");
      return;
    }

    var order = state.orderView;
    if (!order || String(order.status || "").toLowerCase() !== "completed") {
      showActionAlert(
        "Chi gui danh gia sau khi hoa don da hoan thanh.",
        "alert-danger",
      );
      return;
    }

    if (!state.orderRaw || !state.orderRaw.id) {
      showActionAlert(
        "Khong xac dinh duoc hoa don de gui danh gia.",
        "alert-danger",
      );
      return;
    }

    var currentReview = resolveReviewData(state.orderRaw, actor);
    if (hasReviewData(currentReview)) {
      showActionAlert(
        "Danh gia nay da duoc gui truoc do va khong the chinh sua.",
        "alert-danger",
      );
      return;
    }

    var input = reviewNode(actor, "Input");
    var upload = reviewNode(actor, "Upload");
    if (!input || !upload) return;

    var content = String(input.value || "").trim();
    var selectedFiles = upload.files
      ? Array.prototype.slice.call(upload.files)
      : [];
    if (!content && !selectedFiles.length) {
      showActionAlert(
        "Vui long nhap noi dung hoac chon anh/video.",
        "alert-danger",
      );
      return;
    }

    state.isSubmittingReview = true;
    hideActionAlert();
    setReviewSubmitting(actor, true);

    try {
      var uploadedFiles = await uploadReviewFiles(selectedFiles);
      var nextFiles = dedupeMedia(uploadedFiles);
      var payload = {};

      payload[currentReview.columns.text] = content;
      payload[currentReview.columns.date] = new Date().toISOString();
      payload[currentReview.columns.media] = nextFiles.join(",");

      await updateOrderRow(state.orderRaw.id, payload);
      await loadAndRenderOrder();
      // showActionAlert("Gui danh gia thanh cong.", "alert-success");
    } catch (error) {
      showActionAlert(
        (error && error.message) || "Khong the gui danh gia.",
        "alert-danger",
      );
    } finally {
      state.isSubmittingReview = false;
      setReviewSubmitting(actor, false);
    }
  }

  /**
   * Gán sự kiện click cho các nút gửi đánh giá.
   */
  function initReviewEditors() {
    ["customer", "provider"].forEach(function (actor) {
      var button = reviewNode(actor, "Submit");
      if (!button || button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", function () {
        submitReview(actor);
      });
    });
  }

  /**
   * Xác định kịch bản hành động cho khách hàng (Hủy đơn).
   * @param {string} authRole Vai trò người đăng nhập.
   * @param {Object} order Đối tượng đơn hàng.
   * @returns {Object|null} Cấu hình phím bấm và gợi ý.
   */
  function getActionConfig(authRole, order) {
    var orderStatus = order && order.status;
    var hasReceivedDate = hasDateValue(
      order && (order.receivedAt || (order.raw && order.raw.ngaynhan)),
    );

    if (authRole === "customer") {
      var isPending = String(orderStatus || "").toLowerCase() === "pending";

      if (!isPending) {
        var hideHint =
          String(orderStatus || "").toLowerCase() === "canceled"
            ? "Đơn đã hủy, không thể thao tác thêm."
            : "Chỉ có thể hủy đơn khi trạng thái là Chờ xử lý.";

        return {
          text: "Hủy đơn",
          className: "btn btn-danger",
          hint: hideHint,
          canSubmit: false,
          hideButton: true,
        };
      }

      var canCancel = !hasReceivedDate;

      return {
        text: "Hủy đơn",
        className: "btn btn-danger",
        hint: hasReceivedDate
          ? "Đơn đã có ngày nhận, không thể hủy."
          : "Khách hàng chỉ có thể hủy đơn khi chưa có ngày nhận.",
        canSubmit: canCancel,
        hideButton: false,
      };
    }

    if (authRole === "provider") return null;

    return null;
  }

  /**
   * Hiển thị tổ hợp các nút hành động dựa trên vai trò (Nhận đơn, Bắt đầu, Hoàn thành).
   * @param {Object} auth
   * @param {Object} order
   */
  function renderAction(auth, order) {
    var bar = document.getElementById("detailActionBar");
    var btn = document.getElementById("detailActionBtn");
    var hint = document.getElementById("detailActionHint");

    if (!bar || !btn || !hint) return;

    var oldProviderGroup = document.getElementById("providerActionGroup");
    if (oldProviderGroup && oldProviderGroup.parentNode) {
      oldProviderGroup.parentNode.removeChild(oldProviderGroup);
    }

    var action = getActionConfig(auth.role, order);
    if (auth.role !== "provider" && !action) {
      bar.classList.add("d-none");
      return;
    }

    if (auth.role === "provider") {
      bar.classList.remove("d-none");
      btn.classList.add("d-none");
      btn.onclick = null;

      var providerIdentity = resolveProviderIdentity(auth);
      var assignedProviderId = normalizeId(
        order && order.provider && order.provider.id,
      );
      var hasAssignedProvider = hasAssignedProviderRow(
        (order && order.raw) || {},
      );
      var providerOwnsOrder =
        !assignedProviderId ||
        (providerIdentity.id && providerIdentity.id === assignedProviderId);

      var hasReceivedDate = hasDateValue(order && order.receivedAt);
      var hasStartedDate = hasDateValue(order && order.startedAt);
      var hasCompletedDate = hasDateValue(order && order.completedAt);
      var isCanceled = hasDateValue(
        order && order.raw && order.raw.ngayhuy,
      );

      var canReceive =
        !hasAssignedProvider &&
        !hasReceivedDate &&
        !hasStartedDate &&
        !hasCompletedDate &&
        !isCanceled;
      var canStart =
        hasAssignedProvider &&
        providerOwnsOrder &&
        hasReceivedDate &&
        !hasStartedDate &&
        !hasCompletedDate &&
        !isCanceled;
      var canComplete =
        hasAssignedProvider &&
        providerOwnsOrder &&
        hasStartedDate &&
        !hasCompletedDate &&
        !isCanceled;

      hint.textContent =
        hasAssignedProvider && !providerOwnsOrder
          ? "Đơn này đã được nhận bởi nhà cung cấp khác."
          : "Nhà cung cấp thao tác theo từng bước: Nhận đơn, Bắt đầu, Hoàn thành.";

      var group = document.createElement("div");
      group.id = "providerActionGroup";
      group.className = "d-flex gap-2 flex-wrap";

      function makeButton(text, className) {
        var el = document.createElement("button");
        el.type = "button";
        el.className = className;
        el.textContent = text;
        return el;
      }

      async function runProviderAction(buttonEl, loadingText, confirmMsg, successMsg, payloadFactory) {
        showConfirm(confirmMsg, async function () {
            if (state.isSubmitting) return;
            state.isSubmitting = true;
            hideActionAlert();

            var originalText = buttonEl.textContent;
            buttonEl.disabled = true;
            buttonEl.textContent = loadingText;

            try {
              if (!state.orderRaw || !state.orderRaw.id) {
                throw new Error("Không xác định được mã hóa đơn để cập nhật.");
              }

              await updateOrderRow(state.orderRaw.id, payloadFactory());
              await loadAndRenderOrder();
              if (successMsg) {
                showSuccess(successMsg);
              }
            } catch (error) {
              showError((error && error.message) || "Không thể cập nhật trạng thái hóa đơn.");
            } finally {
              state.isSubmitting = false;
              buttonEl.textContent = originalText;
              buttonEl.disabled = false;
            }
        });
      }

      if (canReceive) {
        var receiveBtn = makeButton("Nhận đơn", "btn btn-primary");
        receiveBtn.addEventListener("click", function () {
          showConfirm("Bạn có chắc chắn muốn nhận đơn mới này?", async function () {
            if (state.isSubmitting) return;
            state.isSubmitting = true;
            hideActionAlert();

            var originalText = receiveBtn.textContent;
            receiveBtn.disabled = true;
            receiveBtn.textContent = "Đang nhận...";

            try {
              var provider = resolveProviderIdentity(auth);
              var orderRaw = (order && order.raw) || {};

              var supplierLat = Number(provider.lat);
              var supplierLng = Number(provider.lng);
              var customerLat = Number(orderRaw.lat_kh);
              var customerLng = Number(orderRaw.lng_kh);

              if (
                !supplierLat ||
                !supplierLng ||
                supplierLat <= 0 ||
                supplierLng <= 0
              ) {
                throw new Error(
                  "Thiếu tọa độ nhà cung cấp (maplat/maplng). Vui lòng cập nhật thông tin cá nhân.",
                );
              }
              if (
                !customerLat ||
                !customerLng ||
                customerLat <= 0 ||
                customerLng <= 0
              ) {
                throw new Error(
                  "Hệ thống chưa có tọa độ vị trí khách hàng. Vui lòng yêu cầu khách hàng cập nhật địa chỉ.",
                );
              }

              var distanceKm = await getDistance(
                supplierLat,
                supplierLng,
                customerLat,
                customerLng,
              );

              var pricing = await calculatePricing(orderRaw, distanceKm);

              var payload = {
                idnhacungcap: provider.id || "",
                tennhacungcap: provider.name || "",
                sdt_ncc: provider.phone || "",
                email_ncc: provider.email || "",
                diachi_ncc: provider.address || "",
                ngaynhan: new Date().toISOString(),
                tongtien: pricing.totalAmount,
                tiendichuyen: pricing.transportFee,
                khoangcachdichuyen: pricing.distanceKm,
              };

              await updateOrderRow(state.orderRaw.id, payload);
              await loadAndRenderOrder();
              showSuccess("Nhận đơn thành công!");
            } catch (error) {
              showError((error && error.message) || "Không thể nhận đơn.");
            } finally {
              state.isSubmitting = false;
              receiveBtn.textContent = originalText;
              receiveBtn.disabled = false;
            }
          });
        });
        group.appendChild(receiveBtn);
      } else if (canStart) {
        var startBtn = makeButton("Bắt đầu", "btn btn-primary");
        startBtn.addEventListener("click", function () {
          runProviderAction(
            startBtn, 
            "Đang bắt đầu...", 
            "Bạn có chắc chắn muốn bắt đầu thực hiện công việc này?",
            "Đã bắt đầu thực hiện!",
            function () {
              return {
                ngaybatdau: new Date().toISOString(),
              };
            }
          );
        });
        group.appendChild(startBtn);
      } else if (canComplete) {
        // Nút Hoàn thành (Sửa xe thành công)
        var completeBtn = makeButton("Hoàn thành", "btn btn-success");
        completeBtn.addEventListener("click", function () {
          runProviderAction(
            completeBtn, 
            "Đang hoàn thành...", 
            "Bạn xác nhận đã hoàn thành sửa chữa xe cho khách hàng?",
            "Đơn hàng đã được đánh dấu hoàn thành!",
            function () {
                var transportFee = toNumber(order.transportFee);
                return {
                  ngayhoanthanh: new Date().toISOString(),
                  phikhaosat: 0, // Miễn phí khảo sát khi hoàn thành sửa chữa
                  tiendichuyen: 0,
                  // tongtien: transportFee, // Tổng tiền = 0 (phí khảo sát) + phí di chuyển
                };
            }
          );
        });
        group.appendChild(completeBtn);

        // Nút Hoàn thành khảo sát
        var surveyCompleteBtn = makeButton(
          "Khảo sát xong",
          "btn btn-info text-white",
        );
        surveyCompleteBtn.addEventListener("click", function () {
          runProviderAction(
            surveyCompleteBtn,
            "Đang cập nhật...",
            "Xác nhận đã hoàn thành khảo sát xe?",
            "Cập nhật kết quả khảo sát thành công!",
            function () {
              var transportFee = toNumber(order.transportFee);
              var surveyFee = toNumber(order.surchargeFee);
              return {
                dichvu: "Khảo sát",
                ngayhoanthanh: new Date().toISOString(),
                tongtien: surveyFee + transportFee,
                trangthaithanhtoan: "Paid",
              };
            },
          );
        });
        group.appendChild(surveyCompleteBtn);
      }

      if (group.children.length) {
        bar.appendChild(group);
      }
      return;
    }

    bar.classList.remove("d-none");
    hint.textContent = action.hint;
    btn.onclick = null;

    if (action.hideButton) {
      btn.classList.add("d-none");
      btn.disabled = true;
      return;
    }

    btn.classList.remove("d-none");
    btn.className = action.className;
    btn.textContent = action.text;
    btn.disabled = !action.canSubmit;

    btn.onclick = async function () {
      if (state.isSubmitting || !action.canSubmit) return;
      
      var actionLabel = action.text;
      showConfirm("Bạn có chắc chắn muốn thực hiện hành động '" + actionLabel + "'?", async function () {
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
                  (state.orderView.raw && state.orderView.raw.ngaynhan)),
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
          showSuccess(actionLabel + " thành công.");
        } catch (error) {
          showError((error && error.message) || "Không thể cập nhật trạng thái hóa đơn.");
        } finally {
          state.isSubmitting = false;
          btn.textContent = originalText;
        }
      });
    };
  }

  /**
   * Tải lại dữ liệu hóa đơn và làm mới giao diện.
   */
  async function loadAndRenderOrder() {
    var params = state.params;
    var auth = state.auth;

    var raw = await loadOrderBymadh(params.madh);
    if (!raw) {
      showPageError(
        "Không tìm thấy hóa đơn",
        "Mã hóa đơn không tồn tại hoặc không đúng định dạng.",
      );
      return;
    }

    var related = await loadRelatedRecords(raw);
    var merged = mergeOrderWithRelated(raw, related);
    var mapped = mapOrderView(merged);

    if (!canAccessOrder(auth, mapped)) {
      showPageError(
        "Không có quyền truy cập",
        "Bạn không có quyền xem hóa đơn này",
      );
      return;
    }

    state.orderRaw = merged;
    state.orderView = mapped;

    renderOrder(mapped);
    renderAction(auth, mapped);
    initPaymentAction();
  }

  /**
   * Khởi tạo logic xử lý thanh toán cho khách hàng (có áp dụng giảm giá 5%).
   */
  function initPaymentAction() {
    var btn = document.getElementById("paymentSubmitBtn");
    var input = document.getElementById("paymentInput");
    if (!btn || !input || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", function () {
      var rawValue = input.value;
      var amount = toNumber(rawValue);
      if (amount <= 0) {
        showError("Vui lòng nhập số tiền hợp lệ.");
        return;
      }

      var finalAmount = Math.round(amount * 0.95);
      showConfirm("Hệ thống sẽ áp dụng giảm giá 5%. Số tiền thanh toán cuối cùng là: " + formatCurrencyVnd(finalAmount) + ". Bạn có chắc chắn?", async function () {
        if (state.isSubmitting) return;
        state.isSubmitting = true;
        btn.disabled = true;
        var originalText = btn.textContent;
        btn.textContent = "Đang xử lý...";

        try {
          if (!state.orderRaw || !state.orderRaw.id) {
            throw new Error("Không xác định được mã hóa đơn.");
          }

          var discountAmount = amount - finalAmount;
          await updateOrderRow(state.orderRaw.id, {
            tongtienthucte: finalAmount,
            sotiengiam: discountAmount,
            trangthaithanhtoan: "Paid",
          });

          await loadAndRenderOrder();
          showSuccess("Thanh toán thành công! Bạn đã được giảm giá 5%.");
        } catch (error) {
          showError((error && error.message) || "Không thể thực hiện thanh toán.");
        } finally {
          state.isSubmitting = false;
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    });
  }

  /**
   * Điểm khởi đầu của ứng dụng (Bootstrap): kiểm tra URL, xác thực, tải dữ liệu đầu tiên.
   */
  async function bootstrap() {
    try {
      if (typeof window.krudList !== "function") {
        showPageError(
          "Thiếu thư viện",
          "Không tải được API dữ liệu. Vui lòng tải lại trang.",
        );
        return;
      }

      var params = parseParams();
      state.params = params;

      if (!params.madh || !params.phone || !params.password) {
        showPageError(
          "Thiếu tham số truy cập",
          "URL bắt buộc có madh, sodienthoai và password.",
        );
        return;
      }

      var auth = await authenticateAccess(params.phone, params.password);
      if (!auth) {
        showPageError(
          "Xác thực thất bại",
          "Số điện thoại hoặc mật khẩu không chính xác.",
        );
        return;
      }

      state.auth = auth;
      setIdentityChip(auth);
      initReviewEditors();
      await loadAndRenderOrder();
    } catch (error) {
      showPageError(
        "Lỗi hệ thống",
        (error && error.message) || "Không thể tải dữ liệu hóa đơn.",
      );
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})(window, document);
