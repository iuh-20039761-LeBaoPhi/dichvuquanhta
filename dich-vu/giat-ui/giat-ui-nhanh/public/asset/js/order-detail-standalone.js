(function (window, document) {
  "use strict";

  var ORDER_TABLE = "datlich_giatuinhanh";
  var USER_TABLE = "nguoidung";
  var REVIEW_UPLOAD_ENDPOINT = "upload.php";
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
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    var text = String(value || "")
      .replace(/[^\d,-.]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(/,/g, ".");
    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * Lấy khối lượng hoặc số lượng từ dữ liệu đơn hàng để tính toán.
   * @param {Object} order Đối tượng đơn hàng.
   * @returns {number} Khối lượng hoặc số lượng (mặc định ít nhất là 1).
   */
  function parseWeight(order) {
    var fromWeight = toNumber(order.khoiluong || order.weight || order.cannang);
    if (fromWeight > 0) return fromWeight;

    var fromQuantity = toNumber(order.soluong || order.quantity);
    return fromQuantity > 0 ? fromQuantity : 1;
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
    if (!res.ok) {
      var errorDetail = "";
      try {
        var errBody = await res.json();
        errorDetail = errBody.message || errBody.code || "";
      } catch (e) {}
      throw new Error(
        "Không thể tính khoảng cách (Status: " +
          res.status +
          " " +
          errorDetail +
          "). Tọa độ: NS[" +
          lat1 +
          "," +
          lon1 +
          "] -> KH[" +
          lat2 +
          "," +
          lon2 +
          "]",
      );
    }

    var data = await res.json();
    if (!data.routes || !data.routes.length) {
      throw new Error("Không tính được khoảng cách giữa hai địa điểm.");
    }

    return Number((data.routes[0].distance / 1000).toFixed(2));
  }

  /**
   * Tính toán phụ phí giao hàng và tổng tiền dựa trên khoảng cách và khối lượng.
   * @param {Object} order Dữ liệu đơn hàng thô.
   * @param {number} distanceKm Khoảng cách tính được (km).
   * @returns {Object} Kết quả tính toán giá (khoảng cách, phụ phí, tổng tiền).
   */
  function calculatePricing(order, distanceKm) {
    var totalWeight = parseWeight(order);
    var baseTransportFee = toNumber(order.tiendichuyen);
    var serviceAmount = Math.round(toNumber(order.giadichvu));

    var transportName = String(order.hinhthucnhangiao || "")
      .toLowerCase()
      .trim();
    var isSelfPickup =
      transportName.indexOf("tu lay") !== -1 ||
      transportName.indexOf("t\u1ef1 l\u1ea5y") !== -1;
    var extraTransportFee = totalWeight >= 50 && !isSelfPickup ? 5000 : 0;
    var effectiveTransportFee = baseTransportFee + extraTransportFee;

    var surcharge =
      distanceKm > 0
        ? (distanceKm * effectiveTransportFee * (totalWeight / 20)) / 4
        : 0;
    var shippingSurcharge = Math.round(surcharge);

    return {
      distanceKm: distanceKm,
      shippingSurcharge: shippingSurcharge,
      totalAmount: serviceAmount + effectiveTransportFee + shippingSurcharge,
      effectiveTransportFee: effectiveTransportFee,
    };
  }

  /**
   * Kiểm tra một giá trị có phải là ngày tháng hợp lệ (không rỗng, không phải 0000-00-00).
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
   * Định dạng ID đơn hàng thành mã chuỗi có 7 chữ số (ví dụ: 0000123).
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
   * Định dạng số thành chuỗi tiền tệ tiếng Việt (ví dụ: 100.000 đ).
   * @param {number|string} value Giá trị số.
   * @returns {string} Chuỗi tiền tệ.
   */
  function formatCurrency(value) {
    var num = toNumber(value);
    return num.toLocaleString("vi-VN") + " đ";
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
   * Định dạng ngày giờ theo kiểu Việt Nam (DD/MM/YYYY HH:MM).
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
   * Định dạng ngày (chỉ có ngày/tháng/năm) theo kiểu Việt Nam.
   * @param {string|Date} value Giá trị ngày tháng.
   * @returns {string} Chuỗi ngày định dạng.
   */
  function formatDateOnly(value) {
    if (!value) return "---";
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "---";
    return date.toLocaleDateString("vi-VN");
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
   * Lấy nhãn hiển thị cho trạng thái thanh toán (Paid -> Đã thanh toán).
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
   * Lấy chữ cái đầu của tên (ví dụ: "Lê Bảo Phi" -> "LP"). Dùng làm fallback cho avatar.
   * @param {string} name Tên đầy đủ.
   * @param {string} fallback Giá trị thay thế nếu không lấy được.
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
   * Tách một chuỗi văn bản danh sách thành mảng các mục.
   * @param {string} value Chuỗi cần tách (dùng dấu phẩy, chấm phẩy hoặc xuống dòng).
   * @returns {string[]} Mảng các mục đã tách.
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
   * Tạo danh sách các bước thực hiện công việc (tasks) từ dữ liệu đơn hàng.
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {string[]} Danh sách các chuỗi mô tả công việc.
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

  /**
   * Ánh xạ trạng thái thô từ Database sang các mã trạng thái chuẩn của App.
   * @param {string} status Trạng thái từ DB.
   * @returns {string} Mã trạng thái chuẩn (pending, accepted, processing, completed, canceled).
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
   * Xác định trạng thái đơn hàng dựa trên các mốc thời gian đã được ghi nhận.
   * @param {Object} row Dữ liệu hàng đơn hàng.
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
   * Lấy siêu dữ liệu cho trạng thái (Nhãn hiển thị và CSS class).
   * @param {string} status Mã trạng thái chuẩn.
   * @returns {Object} Metadata (label, className).
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
   * Trả về phần trăm tiến độ tương ứng với mỗi trạng thái đơn hàng.
   * @param {string} status Mã trạng thái chuẩn.
   * @returns {number} Phần trăm (0-100).
   */
  function statusProgress(status) {
    var value = String(status || "").toLowerCase();
    if (value === "completed") return 100;
    if (value === "accepted") return 45;
    if (value === "processing") return 62;
    if (value === "canceled") return 0;
    return 0; // Chỉ tính tiến độ khi nhà cung cấp nhận đơn
  }

  /**
   * Trích xuất ID số từ mã đơn hàng dạng văn bản (ví dụ: "#0000123" -> 123).
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
   * Trích xuất các tham số từ URL (`madh`, `sodienthoai`, `password`).
   * @returns {Object} Đối tượng chứa các tham số.
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
   * Hiển thị thông tin định danh của người dùng hiện tại lên UI (Chip vai trò và SĐT).
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
   * Hiển thị nội dung lỗi khi không thể tải hoặc truy cập hóa đơn.
   * @param {string} title Tiêu đề lỗi.
   * @param {string} message Chi tiết lỗi.
   */
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

  /**
   * Chuyển trạng thái giao diện sang hiển thị chi tiết hóa đơn (ẩn thông báo lỗi).
   */
  function showDetail() {
    var foundNode = document.getElementById("detailStateFound");
    var missingNode = document.getElementById("detailStateNotFound");
    if (foundNode) foundNode.classList.remove("d-none");
    if (missingNode) missingNode.classList.add("d-none");
  }

  /**
   * Tìm kiếm 1 bản ghi trong một bảng DB theo điều kiện dùng thư viện KRUD.
   * @param {string} table Tên bảng.
   * @param {Array} where Mảng các điều kiện lọc.
   * @returns {Promise<Object|null>} Bản ghi đầu tiên tìm được hoặc null.
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
   * Thử tìm kiếm 1 bản ghi bằng cách kiểm tra lần lượt các cặp Trường-Giá trị đề cử.
   * @param {string} table Tên bảng.
   * @param {Array} candidates Danh sách các cặp {field, value}.
   * @returns {Promise<Object|null>} Bản ghi đầu tiên tìm được.
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
   * Xác thực người dùng bằng cách kiểm tra SĐT và Mật khẩu qua nhiều tên trường tiềm năng.
   * @param {string} table Tên bảng người dùng.
   * @param {string} phone Số điện thoại đăng nhập.
   * @param {string} password Mật khẩu đăng nhập.
   * @returns {Promise<Object|null>} Thông tin người dùng nếu khớp.
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
   * Hàm xử lý xác thực quyền truy cập và xác định vai trò (Provider/Customer).
   * @param {string} phone Số điện thoại.
   * @param {string} password Mật khẩu.
   * @returns {Promise<Object|null>} Kết quả xác thực (role, user, phone).
   */
  async function authenticateAccess(phone, password) {
    if (typeof USER_TABLE === "undefined") {
      var USER_TABLE = "nguoidung";
    }

    var user = await queryUserByCredentials(USER_TABLE, phone, password);
    if (!user) return null;

    var idDichvu = String(user.id_dichvu || "").trim();
    var serviceIds = idDichvu.split(",").map(function (s) {
      return s.trim();
    });
    var isProvider = serviceIds.indexOf("11") !== -1;

    return {
      role: isProvider ? "provider" : "customer",
      user: user,
      phone: normalizePhone(user.sodienthoai || user.user_tel || user.phone || phone),
    };
  }

  /**
   * Tải thông tin đơn hàng từ Database dựa trên mã đơn.
   * @param {string} madh Mã đơn hàng.
   * @returns {Promise<Object|null>} Dữ liệu đơn hàng thô.
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
   * Tải thông tin bản ghi Khách hàng liên quan đến đơn hàng.
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {Promise<Object|null>} Thông tin khách hàng.
   */
  async function loadCustomerRecord(order) {
    var customerId = normalizeId(
      order.idkhachhang || order.makhachhang || order.user_id,
    );
    var orderPhone = normalizePhone(order.sodienthoai || order.phone);

    return queryFirstByCandidates("nguoidung", [
      { field: "id", value: customerId },
      { field: "sodienthoai", value: orderPhone },
      { field: "user_tel", value: orderPhone },
      { field: "phone", value: orderPhone },
    ]);
  }

  /**
   * Tải thông tin bản ghi Nhà cung cấp liên quan đến đơn hàng.
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {Promise<Object|null>} Thông tin nhà cung cấp.
   */
  async function loadProviderRecord(order) {
    var providerId = normalizeId(order.idnhacungcap);
    var providerPhone = normalizePhone(order.sdt_ncc);
    var providerEmail = String(order.email_ncc || "").trim();

    return queryFirstByCandidates("nguoidung", [
      { field: "id", value: providerId },
      { field: "sodienthoai", value: providerPhone },
      { field: "user_tel", value: providerPhone },
      { field: "phone", value: providerPhone },
      { field: "sdt", value: providerPhone },
      { field: "email", value: providerEmail },
      { field: "user_email", value: providerEmail },
    ]);
  }

  /**
   * Tải đồng thời thông tin khách hàng và nhà cung cấp liên quan.
   * @param {Object} order Dữ liệu đơn hàng.
   * @returns {Promise<Object>} Object chứa customer và provider.
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
   * Hợp nhất dữ liệu đơn hàng với thông tin chi tiết từ bản ghi khách hàng/nhà cung cấp.
   * @param {Object} order Dữ liệu đơn hàng.
   * @param {Object} related Kết quả từ loadRelatedRecords.
   * @returns {Object} Dữ liệu đơn hàng đầy đủ trường.
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
      row.avatar_kh = pickFirstValue([
        row.link_avatar,
        row.avatar_kh,
        customer.link_avatar,
        customer.avatar,
        customer.avatar_kh,
      ]);
    }

    if (provider) {
      row.nhacungcap = provider;
      row.idnhacungcap =
        row.idnhacungcap || provider.id || provider.idnhacungcap || "";
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
        row.link_avatar,
        row.avatar_ncc,
        row.avatar_nhacungcap,
        row.provider_avatar,
        provider.link_avatar,
        provider.avatar,
        provider.avatar_ncc,
      ]);
    }

    return row;
  }

  /**
   * Kiểm tra xem trong dữ liệu hàng có thông tin về việc đã được phân công nhà cung cấp chưa.
   * @param {Object} row Dữ liệu hàng đơn hàng.
   * @returns {boolean} True nếu đã có nhà cung cấp được gắn vào đơn.
   */
  function hasAssignedProviderRow(row) {
    var providerId = normalizeId(
      row.idnhacungcap ||
        (row.nhacungcap && (row.nhacungcap.id || row.nhacungcap.idnhacungcap)),
    );

    if (!providerId || providerId === "0") return false;

    var providerName = pickFirstValue([
      row.tennhacungcap,
      row.nhacungcap && row.nhacungcap.hovaten,
      row.nhacungcap && row.nhacungcap.user_name,
    ]);
    var providerPhone = normalizePhone(
      row.sdt_ncc ||
        (row.nhacungcap &&
          (row.nhacungcap.sodienthoai ||
            row.nhacungcap.user_tel ||
            row.nhacungcap.sdt)),
    );
    var providerEmail = String(
      row.email_ncc ||
        (row.nhacungcap &&
          (row.nhacungcap.email || row.nhacungcap.user_email)) ||
        "",
    )
      .trim()
      .toLowerCase();

    return Boolean(providerName || providerPhone || providerEmail);
  }

  /**
   * Chuyển đổi dữ liệu thô từ Database sang một đối tượng có cấu trúc dùng để hiển thị lên UI.
   * @param {Object} row Dữ liệu đơn hàng đã được hợp nhất.
   * @returns {Object} View object cho giao diện.
   */
  function mapOrderView(row) {
    var createdAt = row.ngaydat || row.created_date || "";
    var updatedAt =
      row.ngayhoanthanh ||
      row.ngayhuy ||
      row.ngaybatdau ||
      row.ngaynhan ||
      row.created_date ||
      createdAt;

    var status = getOrderStatus(row);
    var serviceFee = toNumber(row.giadichvu);
    var transportFee = toNumber(row.tiendichuyen);
    var surchargeFee = toNumber(row.phuphigiaonhan);
    var totalAmount = toNumber(row.tongtien);
    var hasAssignedProvider = hasAssignedProviderRow(row);

    var qty = toNumber(row.soluong);
    if (qty <= 0) qty = 1;

    return {
      id: toNumber(row.id),
      status: status,
      createdAt: createdAt,
      updatedAt: updatedAt,
      service: row.dichvu || "Dịch vụ giặt ủi",
      note: row.ghichu || "Không có ghi chú.",
      chemicalsText: row.danhsachhoachat || "",
      workItemsText: row.danhsachcongviec || "",
      deliveryMethod: row.hinhthucnhangiao || "",
      receivedAt: row.ngaynhan || "",
      startedAt: row.ngaybatdau || "",
      completedAt: row.ngayhoanthanh || "",
      totalAmount: totalAmount,
      extraFee: transportFee + surchargeFee,
      discount: 0,
      serviceFee: serviceFee,
      transportFee: transportFee,
      surchargeFee: surchargeFee,
      anh_id: row.anh_id || "",
      video_id: row.video_id || "",
      paymentStatus: row.trangthaithanhtoan || "Unpaid",
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
          row.link_avatar,
          row.avatar_kh,
          row.avatar_khachhang,
          row.avatar_customer,
          row.customer_avatar,
          row.khachhang && row.khachhang.link_avatar,
          row.khachhang && row.khachhang.avatar,
          row.khachhang && row.khachhang.avatar_kh,
        ]),
      },
      provider: {
        id: hasAssignedProvider
          ? toNumber(
              row.idnhacungcap ||
                (row.nhacungcap &&
                  (row.nhacungcap.id || row.nhacungcap.idnhacungcap)),
            )
          : 0,
        name: hasAssignedProvider
          ? row.tennhacungcap ||
            (row.nhacungcap &&
              (row.nhacungcap.hovaten || row.nhacungcap.user_name)) ||
            "Chưa phân công"
          : "Chưa phân công",
        phone: hasAssignedProvider
          ? row.sdt_ncc ||
            (row.nhacungcap &&
              (row.nhacungcap.sodienthoai ||
                row.nhacungcap.user_tel ||
                row.nhacungcap.sdt)) ||
            ""
          : "",
        email: hasAssignedProvider
          ? row.email_ncc ||
            (row.nhacungcap &&
              (row.nhacungcap.email || row.nhacungcap.user_email)) ||
            ""
          : "",
        address: hasAssignedProvider
          ? row.diachi_ncc || (row.nhacungcap && row.nhacungcap.diachi) || ""
          : "",
        avatar: hasAssignedProvider
          ? pickFirstValue([
              row.link_avatar,
              row.avatar_ncc,
              row.avatar_nhacungcap,
              row.provider_avatar,
              row.nhacungcap && row.nhacungcap.link_avatar,
              row.nhacungcap && row.nhacungcap.avatar,
              row.nhacungcap && row.nhacungcap.avatar_ncc,
            ])
          : "",
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

  /**
   * Tạo danh sách các đường dẫn (URL) tiềm năng để thử tải ảnh đại diện.
   * @param {string} rawValue Giá trị avatar thô từ DB.
   * @param {string} kind Loại người dùng (customer/provider).
   * @returns {string[]} Mảng các URL khả thi.
   */
  function normalizeAvatarCandidates(rawValue) {
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

    if (
      text.charAt(0) === "/" ||
      text.indexOf("./") === 0 ||
      text.indexOf("../") === 0
    ) {
      candidates.push(encodedText);
      return candidates;
    }

    candidates.push(encodedText);

    return candidates;
  }

  /**
   * Thử hiển thị ảnh đại diện lên một badge, nếu không có ảnh thì hiện chữ cái đầu.
   * @param {string} id ID phần tử HTML.
   * @param {string} avatarValue Giá trị avatar từ DB.
   * @param {string} fallbackText Văn bản hiển thị thay thế (initials).
   * @param {string} kind Loại người dùng.
   */
  function renderAvatarBadge(id, avatarValue, fallbackText, kind) {
    var node = document.getElementById(id);
    if (!node) return;

    var fallback = String(fallbackText || "--").trim() || "--";
    
    // Kiểm tra nếu là ID Google Drive (thường không có dấu gạch chéo hoặc dấu chấm)
    var textValue = String(avatarValue || "").trim();
    var isGDrive = textValue.length > 10 && textValue.indexOf("/") === -1 && textValue.indexOf(".") === -1;

    node.classList.remove("has-image");
    node.textContent = fallback;

    if (!textValue) return;

    if (isGDrive) {
      var iframe = document.createElement("iframe");
      iframe.src = "https://drive.google.com/file/d/" + textValue + "/preview";
      iframe.setAttribute("allow", "autoplay");
      iframe.style.border = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.display = "block";
      
      node.textContent = "";
      node.appendChild(iframe);
      node.classList.add("has-image");
      return;
    }

    var candidates = normalizeAvatarCandidates(textValue);
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
   * Chuẩn hóa tên người (chuyển chữ thường, xóa khoảng trắng thừa) để so sánh.
   * @param {string} value Tên thô.
   * @returns {string} Tên đã chuẩn hóa.
   */
  function normalizePersonName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Trích xuất thông tin định danh đầy đủ của nhà cung cấp từ đối tượng auth.
   * @param {Object} auth Thông tin xác thực.
   * @returns {Object} Thông tin nhà cung cấp (id, name, phone, coordinates...).
   */
  function resolveProviderIdentity(auth) {
    var user = (auth && auth.user) || {};
    var providerId = normalizeId(
      user.id || user.idnhacungcap || user.provider_id || user.manhacungcap,
    );

    return {
      id: providerId,
      name: pickFirstValue([
        user.hovaten,
        user.user_name,
        user.hoten,
        user.tennhacungcap,
        user.name,
      ]),
      phone: normalizePhone(
        user.sodienthoai || user.user_tel || user.phone || user.sdt,
      ),
      email: String(user.email || user.user_email || "").trim(),
      address: String(user.diachi || user.address || "").trim(),
      lat: user.maplat || user.lat,
      lng: user.maplng || user.lng || user.long,
    };
  }

  /**
   * Kiểm tra xem người dùng hiện tại có quyền truy cập vào hóa đơn này hay không.
   * @param {Object} auth Thông tin người dùng đang đăng nhập.
   * @param {Object} order Thông tin đơn hàng hiện tại.
   * @returns {boolean} True nếu được phép xem.
   */
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
      var orderCustomerName = normalizePersonName(
        (order.customer && order.customer.name) ||
          (order.raw && order.raw.hovaten) ||
          (order.raw && order.raw.tenkhachhang) ||
          "",
      );
      var loginCustomerName = normalizePersonName(
        (auth.user &&
          (auth.user.hovaten ||
            auth.user.user_name ||
            auth.user.hoten ||
            auth.user.name)) ||
          "",
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
   * Hiển thị danh sách các bước thực hiện công việc và ghi chú lên UI.
   * @param {Object} order View object của đơn hàng.
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

    setText(
      "detailChemicals",
      splitListText(order.chemicalsText).join(", ") || "Không sử dụng",
    );
    setText("detailNote", order.note || "Không có ghi chú.");
  }

  /**
   * Lấy tiền tố cho các ID phần tử giao diện đánh giá (Customer/Provider).
   * @param {string} actor Loại đối tượng đánh giá.
   * @returns {string} Tên tiền tố.
   */
  function reviewPrefix(actor) {
    return actor === "provider" ? "Provider" : "Customer";
  }

  /**
   * Lấy phần tử HTML liên quan đến đánh giá dựa trên đối tượng và hậu tố ID.
   * @param {string} actor Đối tượng (customer/provider).
   * @param {string} suffix Phần hậu tố của ID phần tử.
   * @returns {HTMLElement|null}
   */
  function reviewNode(actor, suffix) {
    return document.getElementById("review" + reviewPrefix(actor) + suffix);
  }

  /**
   * Tìm tên Field (Key) đầu tiên thực sự tồn tại trong một hàng dữ liệu DB từ danh sách key gợi ý.
   * @param {Object} row Hàng dữ liệu DB.
   * @param {string[]} keys Danh sách các tên field có thể chứa dữ liệu.
   * @param {string} fallback Giá trị mặc định nếu không tìm thấy key nào.
   * @returns {string} Tên field tìm thấy.
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
   * Lấy giá trị đầu tiên có dữ liệu cho một nhóm các tên Field (Key).
   * @param {Object} row Hàng dữ liệu thô.
   * @param {string[]} keys Các key cần kiểm tra.
   * @returns {any} Giá trị đầu tiên tìm được.
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
   * Xử lý dữ liệu Ảnh/Video đánh giá từ nhiều định dạng lưu trữ (Mảng, JSON chuỗi, Chuỗi phân tách).
   * @param {any} value Giá trị media thô.
   * @returns {string[]} Mảng các tên file hoặc URL media.
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
   * Loại bỏ các file trùng lặp trong mảng media.
   * @param {string[]} files Mảng tên file.
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
   * Trích xuất đầy đủ dữ liệu đánh giá của một đối tượng (Customer hoặc Provider) từ đơn hàng.
   * @param {Object} raw Dữ liệu đơn hàng thô.
   * @param {string} actor Đối tượng.
   * @returns {Object} Dữ liệu đánh giá (văn bản, ngày, files, và các tên cột tương ứng).
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
   * Chuyển đổi tên file đánh giá sang URL truy cập được trên web.
   * @param {string} path Tên file hoặc đường dẫn thô.
   * @returns {string} URL đầy đủ.
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
   * Hiển thị danh sách các tệp đa phương tiện (ảnh/video) đánh giá lên giao diện.
   * @param {HTMLElement} container Vùng chứa.
   * @param {string[]} files Danh sách các tệp.
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
      const isDriveId = item && !item.includes("/") && !item.includes(".") && !item.includes(":");
      
      if (isDriveId) {
        const url = "https://drive.google.com/file/d/" + item + "/preview";
        const wrapper = document.createElement("div");
        wrapper.className = "ratio ratio-16x9 mb-2 border rounded overflow-hidden shadow-sm";
        wrapper.innerHTML = `<iframe src="${url}" allow="autoplay" style="border:none;"></iframe>`;
        grid.appendChild(wrapper);
        return;
      }

      var url = resolveReviewMediaUrl(item);
      if (!url) return;
      var lower = url.toLowerCase();
      var isVideo = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/.test(lower);

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
      container.classList.remove("review-file-media");
      container.textContent = "Chưa có tệp";
      return;
    }

    container.appendChild(grid);
  }

  /**
   * Hiển thị trạng thái "Đã có" hoặc "Chưa có" cho phần đánh giá.
   * @param {string} actor Đối tượng.
   * @param {boolean} hasData True nếu đã có dữ liệu đánh giá.
   */
  function setReviewChip(actor, hasData) {
    var chip = reviewNode(actor, "Chip");
    if (!chip) return;
    chip.classList.toggle("warn", !hasData);
    chip.textContent = hasData ? "Đã có" : "Chưa có";
  }

  /**
   * Hiển thị nội dung chi tiết phần đánh giá của một đối tượng lên UI.
   * @param {string} actor Đối tượng.
   * @param {Object} review Dữ liệu đánh giá.
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
   * Hiển thị cả hai phần đánh giá của Khách hàng và Nhà cung cấp.
   * @param {Object} order View object của đơn hàng.
   */
  function renderReviews(order) {
    var raw = (order && order.raw) || {};
    renderReviewSection("customer", resolveReviewData(raw, "customer"));
    renderReviewSection("provider", resolveReviewData(raw, "provider"));
  }

  /**
   * Kiểm tra xem một đối tượng review có chứa bất kỳ thông tin nào không.
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
   * Điều khiển hiển thị hoặc ẩn các trình nhập liệu đánh giá dựa trên trạng thái hóa đơn và quyền hạn.
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
   * Hàm chính để hiển thị mọi thông tin chi tiết của đơn hàng lên toàn bộ giao diện.
   * @param {Object} order Đối tượng đơn hàng đã được ánh xạ (view object).
   */
  function renderOrder(order) {
    showDetail();

    var meta = statusMeta(order.status);
    var progressValue = statusProgress(order.status);
    var subtotal = toNumber(order.serviceFee);
    var total =
      toNumber(order.totalAmount) > 0
        ? toNumber(order.totalAmount)
        : subtotal + toNumber(order.extraFee);

    var hasReceivedDate = hasDateValue(order && order.receivedAt);
    var hasStartedDate = hasDateValue(order && order.startedAt);
    var hasCompletedDate = hasDateValue(order && order.completedAt);
    var isCanceled = hasDateValue(order && order.raw && order.raw.ngayhuy);
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
    setText("heroServiceFee", formatCurrencyVnd(order.serviceFee));
    setText("heroTransportFee", formatCurrencyVnd(order.transportFee));
    setText("heroSurchargeFee", formatCurrencyVnd(order.surchargeFee));
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
    setText("heroTimeRange", safeText(order.deliveryMethod));
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

    renderSourceMedia(order);
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
   * Ẩn thông báo hành động và xóa nội dung của nó.
   */
  function hideActionAlert() {
    var node = document.getElementById("detailActionAlert");
    if (!node) return;
    node.classList.add("d-none");
    node.textContent = "";
    node.classList.remove("alert-success", "alert-danger", "alert-info");
  }

  /**
   * Cập nhật các cột dữ liệu cho một hàng đơn hàng trong cơ sở dữ liệu.
   * @param {number|string} orderId ID đơn hàng.
   * @param {Object} payload Dữ liệu các trường cần cập nhật (Key-Value).
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
   * Tải các tệp ảnh/video đánh giá lên máy chủ qua API.
   * @param {File[]} files Danh sách các tệp File từ input.
   * @returns {Promise<string[]>} Danh sách tên các file đã được lưu trên server.
   */
  async function uploadReviewFiles(files) {
    var list = Array.isArray(files) ? files : [];
    if (!list.length) return [];

    const uploadSingle = async (file) => {
      const formData = new FormData();
      formData.append("upload", "1");
      formData.append("file", file);
      formData.append("name", `REVIEW_${Date.now()}_${file.name}`);

      const res = await fetch("upload.php", {
        method: "POST",
        body: formData,
      });
      const result = await res.json().catch(() => null);
      if (result && result.fileId) {
        return result.fileId;
      }
      throw new Error(`Upload ${file.name} thất bại.`);
    };

    const results = [];
    for (const file of list) {
      const fid = await uploadSingle(file);
      results.push(fid);
    }
    return results;
  }

  /**
   * Cập nhật trạng thái "Đang gửi..." cho các nút và input trong form đánh giá.
   * @param {string} actor Đối tượng đánh giá.
   * @param {boolean} isLoading True nếu đang trong quá trình gửi.
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
   * Xử lý quy trình gửi đánh giá: Tải media lên -> Cập nhật DB -> Tải lại dữ liệu trang.
   * @param {string} actor Đối tượng đang gửi đánh giá (customer/provider).
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
   * Khởi tạo các sự kiện Click cho các nút gửi đánh giá của Khách hàng và Nhà cung cấp.
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
   * Xác định cấu hình hiển thị (nhãn, màu sắc, gợi ý) cho nút hành động của Khách hàng.
   * @param {string} authRole Vai trò người đăng nhập.
   * @param {Object} order View object đơn hàng.
   * @returns {Object|null} Cấu hình nút hoặc null.
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
   * Hiển thị các nút hành động (Hủy đơn, Nhận đơn, Bắt đầu, Hoàn thành) dựa trên trạng thái và vai trò.
   * Chứa logic xử lý tương tác trực tiếp cho các hành động quan trọng của Đơn hàng.
   * @param {Object} auth Thông tin người dùng.
   * @param {Object} order Thông tin đơn hàng (view object).
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
      var isCanceled = hasDateValue(order && order.raw && order.raw.ngayhuy);

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

      async function runProviderAction(buttonEl, loadingText, payloadFactory) {
        if (state.isSubmitting) return;

        var actionText = buttonEl.textContent;
        showConfirm("Bạn có chắc chắn muốn thực hiện hành động '" + actionText + "'?", async function () {
          state.isSubmitting = true;
          hideActionAlert();

          var originalText = buttonEl.textContent;
          buttonEl.disabled = true;
          buttonEl.textContent = loadingText;

          try {
            if (!state.orderRaw || !state.orderRaw.id) {
              throw new Error("Không xác định được mã hóa đơn để cập nhật.");
            }

            await updateOrderRow(state.orderRaw.id, await payloadFactory());
            await loadAndRenderOrder();
            showSuccess(actionText + " thành công!");
          } catch (error) {
            showError((error && error.message) || "Không thể cập nhật trạng thái hóa đơn.");
          } finally {
            state.isSubmitting = false;
            buttonEl.textContent = originalText;
          }
        });
      }

      if (canReceive) {
        var receiveBtn = makeButton("Nhận đơn", "btn btn-primary");
        receiveBtn.addEventListener("click", function () {
          runProviderAction(receiveBtn, "Đang nhận...", async function () {
            var order = state.orderRaw || {};
            var supplierLat = toNumber(providerIdentity.lat);
            var supplierLng = toNumber(providerIdentity.lng);
            var customerLat = toNumber(order.lat_kh);
            var customerLng = toNumber(order.lng_kh);

            if (
              !supplierLat ||
              !supplierLng ||
              supplierLat <= 0 ||
              supplierLng <= 0
            ) {
              throw new Error(
                "Thiếu tọa độ nhà cung cấp hợp lệ (maplat/maplng). Hiện tại: " +
                  supplierLat +
                  "," +
                  supplierLng,
              );
            }
            if (
              !customerLat ||
              !customerLng ||
              customerLat <= 0 ||
              customerLng <= 0
            ) {
              throw new Error(
                "Hệ thống chưa có tọa độ vị trí của khách hàng này (lat_kh/lng_kh). Vui lòng yêu cầu khách hàng cập nhật địa chỉ hoặc nhập tay.",
              );
            }

            var distanceKm = await getDistance(
              supplierLat,
              supplierLng,
              customerLat,
              customerLng,
            );

            var pricing = calculatePricing(order, distanceKm);

            return {
              idnhacungcap: providerIdentity.id || "",
              tennhacungcap: providerIdentity.name || "",
              sdt_ncc: providerIdentity.phone || "",
              email_ncc: providerIdentity.email || "",
              diachi_ncc: providerIdentity.address || "",
              ngaynhan: new Date().toISOString(),
              phuphigiaonhan: pricing.shippingSurcharge,
              tongtien: pricing.totalAmount,
              tiendichuyen: pricing.effectiveTransportFee,
              khoangcachgiaonhan: pricing.distanceKm,
            };
          });
        });
        group.appendChild(receiveBtn);
      } else if (canStart) {
        var startBtn = makeButton("Bắt đầu", "btn btn-info text-white");
        startBtn.addEventListener("click", function () {
          runProviderAction(startBtn, "Đang bắt đầu...", function () {
            return {
              ngaybatdau: new Date().toISOString(),
            };
          });
        });
        group.appendChild(startBtn);
      } else if (canComplete) {
        var completeBtn = makeButton("Hoàn thành", "btn btn-success");
        completeBtn.addEventListener("click", function () {
          runProviderAction(completeBtn, "Đang hoàn thành...", function () {
            return {
              ngayhoanthanh: new Date().toISOString(),
              trangthaithanhtoan: "Paid",
            };
          });
        });
        group.appendChild(completeBtn);
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
          showError((error && error.message) || "Không thể thực hiện hành động.");
        } finally {
          state.isSubmitting = false;
          btn.textContent = originalText;
        }
      });
    };
  }

  /**
   * Quy trình đầy đủ để tải lại dữ liệu đơn hàng mới nhất và hiển thị lên toàn bộ UI.
   */
  async function loadAndRenderOrder() {
    var params = state.params;
    var auth = state.auth;

    var raw = await loadOrderBymadh(params.madh);
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
        "Bạn không có quyền xem hóa đơn này",
      );
      return;
    }

    state.orderRaw = merged;
    state.orderView = mapped;

    renderOrder(mapped);
    renderAction(auth, mapped);
  }

  /**
   * Hàm khởi động chính của ứng dụng: Kiểm tra tham số URL -> Xác thực -> Tải dữ liệu đầu tiên.
   */
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

      if (!params.madh || !params.phone || !params.password) {
        showError(
          "Thiếu tham số truy cập",
          "URL bắt buộc có madh, sodienthoai và password.",
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
      initReviewEditors();
      await loadAndRenderOrder();
    } catch (error) {
      showError(
        "Lỗi hệ thống",
        (error && error.message) || "Không thể tải dữ liệu hóa đơn.",
      );
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);

  /**
   * Hiển thị các phương tiện (ảnh/video) được upload ban đầu tại hiện trường.
   * @param {Object} order Đối tượng đơn hàng đã ánh xạ.
   */
  function renderSourceMedia(order) {
    const section = document.getElementById("detailMediaSection");
    const containerImages = document.getElementById("detailMediaImages");
    const containerVideos = document.getElementById("detailMediaVideos");
    if (!section || !containerImages || !containerVideos) return;

    const anhIds = splitListText(order.anh_id);
    const videoIds = splitListText(order.video_id);

    containerImages.innerHTML = "";
    containerVideos.innerHTML = "";

    if (anhIds.length === 0 && videoIds.length === 0) {
      section.classList.add("d-none");
      return;
    }

    section.classList.remove("d-none");

    if (anhIds.length > 0) {
      containerImages.className = "row g-2";
      anhIds.forEach((id) => {
        const url = "https://drive.google.com/file/d/" + id + "/preview";
        const col = document.createElement("div");
        col.className = "col-4";
        col.innerHTML = `
          <div class="ratio ratio-1x1 border rounded overflow-hidden shadow-sm">
            <iframe src="${url}" allow="autoplay" style="border:none;"></iframe>
          </div>`;
        containerImages.appendChild(col);
      });
    } else {
      containerImages.innerHTML = '<p class="text-muted small italic">Không có hình ảnh hiện trường.</p>';
    }

    if (videoIds.length > 0) {
      videoIds.forEach((id) => {
        const url = "https://drive.google.com/file/d/" + id + "/preview";
        const wrapper = document.createElement("div");
        wrapper.className = "ratio ratio-16x9 mb-2 border rounded overflow-hidden shadow-sm";
        wrapper.innerHTML = `<iframe src="${url}" allow="autoplay" style="border:none;"></iframe>`;
        containerVideos.appendChild(wrapper);
      });
    } else {
      containerVideos.innerHTML = '<p class="text-muted small italic">Không có video hiện trường.</p>';
    }
  }
})(window, document);
