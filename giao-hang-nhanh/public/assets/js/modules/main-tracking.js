(function (window, document) {
  if (window.__giaoHangNhanhTrackingInitDone) return;
  window.__giaoHangNhanhTrackingInitDone = true;

  const core = window.GiaoHangNhanhCore;
  if (!core) return;

  let currentCancelCode = "";
  const localOrderStorageKey = "ghn-customer-orders";
  const localCancelStorageKey = "ghn-tracking-cancelled-orders";
  const krudOrdersTable = "giaohangnhanh_dat_lich";

  function readLocalJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeLocalJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  }

  function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function normalizeServiceType(value) {
    const normalized = String(value || "").toLowerCase();
    const map = {
      giao_ngay_lap_tuc: "instant",
      giao_hoa_toc: "express",
      giao_nhanh: "fast",
      giao_tieu_chuan: "standard",
    };
    return map[normalized] || normalized;
  }

  function getServiceLabel(serviceType, fallbackLabel) {
    if (fallbackLabel) return fallbackLabel;
    const normalized = normalizeServiceType(serviceType);
    if (normalized === "instant") return "Giao ngay lập tức";
    if (normalized === "express") return "Giao hàng hỏa tốc";
    if (normalized === "fast") return "Giao hàng nhanh";
    if (normalized === "standard") return "Giao hàng tiêu chuẩn";
    return "--";
  }

  function getPaymentMethodLabel(paymentMethod) {
    const normalized = String(paymentMethod || "").toLowerCase();
    return ["bank", "bank_transfer", "transfer", "chuyen_khoan"].includes(
      normalized,
    )
      ? "Chuyển khoản"
      : "Tiền mặt";
  }

  function getFeePayerLabel(feePayer) {
    return String(feePayer || "").toLowerCase() === "nhan"
      ? "Người nhận"
      : "Người gửi";
  }

  function getStatusLabel(status) {
    const normalized = String(status || "").toLowerCase();
    if (
      normalized === "completed" ||
      normalized === "delivered" ||
      normalized === "success"
    ) {
      return "Hoàn tất";
    }
    if (normalized === "shipping" || normalized === "in_transit") {
      return "Đang giao";
    }
    if (normalized === "cancelled" || normalized === "canceled") {
      return "Đã hủy";
    }
    return "Chờ xử lý";
  }

  function getStatusIcon(status) {
    const normalized = String(status || "").toLowerCase();
    if (
      normalized === "completed" ||
      normalized === "delivered" ||
      normalized === "success"
    ) {
      return "✅";
    }
    if (normalized === "shipping" || normalized === "in_transit") {
      return "🚚";
    }
    if (normalized === "cancelled" || normalized === "canceled") {
      return "❌";
    }
    return "⏳";
  }

  function formatDistanceLabel(distanceKm) {
    const distance = Number(distanceKm || 0);
    if (distance <= 0) return "--";
    return `${distance.toLocaleString("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} km`;
  }

  function summarizeItems(items) {
    const normalizedItems = Array.isArray(items) ? items : [];
    const names = normalizedItems
      .map((item) => item?.ten_hang || item?.item_name || "")
      .filter(Boolean);

    if (!names.length) return "--";
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1} món`;
  }

  function hasProviderInfo(provider) {
    return Boolean(
      provider &&
        (provider.shipper_id ||
          provider.provider_id ||
          provider.shipper_name ||
          provider.fullname ||
          provider.shipper_phone ||
          provider.phone),
    );
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function getKrudListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }

    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    return null;
  }

  function extractRows(payload, depth = 0) {
    if (depth > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      const nested = extractRows(value, depth + 1);
      if (nested.length) return nested;
    }

    return [];
  }

  function normalizeLocalTrackingRecord(detail) {
    const order = detail?.order || {};
    const provider = detail?.provider || {};
    const items = Array.isArray(detail?.items) ? detail.items : [];
    const statusRaw = order.status || "pending";
    const serviceMeta = order.service_meta || {};
    const logs = Array.isArray(detail?.logs) ? detail.logs : [];

    return {
      order_code: order.order_code || order.id || "",
      type: summarizeItems(items),
      service_label: getServiceLabel(
        order.service_type,
        order.service_label || order.service_name,
      ),
      status_raw: statusRaw,
      status_text: order.status_label || getStatusLabel(statusRaw),
      icon: getStatusIcon(statusRaw),
      created_at: formatDateTime(order.created_at || ""),
      sender_name: order.sender_name || "",
      sender_phone: order.sender_phone || "",
      receiver_name: order.receiver_name || "",
      receiver_phone: order.receiver_phone || "",
      pickup_address: order.pickup_address || "",
      delivery_address: order.delivery_address || "",
      distance_label: formatDistanceLabel(
        serviceMeta.distance_km || order.khoang_cach_km,
      ),
      vehicle_type:
        order.vehicle_type ||
        order.vehicle_label ||
        serviceMeta.vehicle_label ||
        "--",
      shipping_fee: Number(order.shipping_fee ?? order.total_fee ?? 0),
      cod_amount: Number(order.cod_amount ?? order.cod_value ?? 0),
      payment_method_label:
        order.payment_method_label ||
        serviceMeta.payment_method_label ||
        getPaymentMethodLabel(order.payment_method),
      payer_label:
        order.payer_label ||
        serviceMeta.payer_label ||
        getFeePayerLabel(order.fee_payer),
      clean_note: order.clean_note || order.notes || "",
      provider: provider && hasProviderInfo(provider) ? provider : {},
      items,
      timeline: logs.map((log) => ({
        time: log.created_at || "",
        text:
          log.note ||
          `Cập nhật từ ${log.old_status_label || "--"} sang ${log.new_status_label || "--"}`,
      })),
    };
  }

  function findLocalTrackingRecord(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    const records = readLocalJson(localOrderStorageKey, []);
    const detail =
      (Array.isArray(records) ? records : []).find((item) => {
        const itemCode = String(
          item?.order?.order_code || item?.order?.id || "",
        )
          .trim()
          .toUpperCase();
        return itemCode === normalizedCode;
      }) || null;

    return detail ? normalizeLocalTrackingRecord(detail) : null;
  }

  async function findKrudTrackingRecord(code) {
    const listFn = getKrudListFn();
    if (!listFn) {
      return null;
    }

    const normalizedCode = String(code || "").trim().toUpperCase();
    const response = await listFn({
      table: krudOrdersTable,
      sort: { id: "desc" },
      page: 1,
      limit: 500,
    });

    const rows = extractRows(response);
    const record = rows.find((item) => {
      const itemCode = String(
        item?.ma_don_hang_noi_bo || item?.order_code || item?.id || "",
      )
        .trim()
        .toUpperCase();
      return itemCode === normalizedCode;
    });

    if (!record) return null;

    const statusRaw = String(record.trang_thai || record.status || "pending");
    const shippingFee = Number(
      record.tong_cuoc ?? record.shipping_fee ?? record.total_fee ?? 0,
    );
    const codAmount = Number(
      record.gia_tri_thu_ho_cod ?? record.cod_amount ?? record.cod_value ?? 0,
    );
    const paymentMethod =
      record.phuong_thuc_thanh_toan || record.payment_method || "tien_mat";
    const feePayer = record.nguoi_tra_cuoc || record.fee_payer || "gui";

    return {
      order_code:
        record.ma_don_hang_noi_bo || record.order_code || String(record.id || ""),
      type:
        record.ten_loai_hang ||
        record.loai_hang ||
        record.loai_hang_hoa ||
        record.mo_ta_hang_hoa ||
        "--",
      service_label:
        record.ten_dich_vu ||
        getServiceLabel(record.dich_vu || record.service_type),
      status_raw: statusRaw,
      status_text:
        record.status_label || record.trang_thai_hien_thi || getStatusLabel(statusRaw),
      icon: getStatusIcon(statusRaw),
      created_at: formatDateTime(record.created_at || record.created_date || ""),
      sender_name: record.ho_ten_nguoi_gui || record.nguoi_gui_ho_ten || "",
      sender_phone: normalizePhone(
        record.so_dien_thoai_nguoi_gui ||
          record.nguoi_gui_so_dien_thoai ||
          record.sender_phone,
      ),
      receiver_name: record.ho_ten_nguoi_nhan || record.nguoi_nhan_ho_ten || "",
      receiver_phone: normalizePhone(
        record.so_dien_thoai_nguoi_nhan ||
          record.nguoi_nhan_so_dien_thoai ||
          record.receiver_phone,
      ),
      pickup_address: record.dia_chi_lay_hang || record.search_pickup || "",
      delivery_address: record.dia_chi_giao_hang || record.search_delivery || "",
      distance_label: formatDistanceLabel(record.khoang_cach_km || record.distance_km),
      vehicle_type:
        record.ten_phuong_tien ||
        record.phuong_tien ||
        record.vehicle_label ||
        record.vehicle_type ||
        "--",
      shipping_fee: shippingFee,
      cod_amount: codAmount,
      payment_method_label:
        record.payment_method_label || getPaymentMethodLabel(paymentMethod),
      payer_label: record.payer_label || getFeePayerLabel(feePayer),
      clean_note: record.ghi_chu || record.clean_note || record.notes || "",
      provider: {
        shipper_name:
          record.nha_cung_cap_ho_ten || record.shipper_name || record.provider_name || "",
        shipper_phone: normalizePhone(
          record.nha_cung_cap_so_dien_thoai ||
            record.shipper_phone ||
            record.provider_phone,
        ),
      },
      items: [],
      timeline: [
        {
          time: record.created_at || "",
          text:
            normalizeText(record.ghi_chu_admin || record.admin_note) ||
            "Đơn hàng được đồng bộ từ KRUD.",
        },
      ],
    };
  }

  function getCancelOverrides() {
    const overrides = readLocalJson(localCancelStorageKey, {});
    return overrides && typeof overrides === "object" ? overrides : {};
  }

  function saveCancelOverride(code, reason) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    const overrides = getCancelOverrides();
    overrides[normalizedCode] = {
      reason: String(reason || "").trim(),
      cancelled_at: new Date().toISOString(),
    };
    writeLocalJson(localCancelStorageKey, overrides);
  }

  function applyCancelOverride(order) {
    const normalizedCode = String(order?.order_code || "")
      .trim()
      .toUpperCase();
    const override = getCancelOverrides()[normalizedCode];
    if (!override) return order;

    const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];
    timeline.unshift({
      time: override.cancelled_at,
      text: override.reason || "Đơn hàng đã được hủy trong chế độ local.",
    });

    return {
      ...order,
      status_raw: "cancelled",
      status_text: "Đã hủy",
      icon: getStatusIcon("cancelled"),
      timeline,
    };
  }

  function saveToHistory(code) {
    let history = JSON.parse(localStorage.getItem("trackingHistory")) || [];
    if (!history.includes(code)) {
      history.push(code);
      if (history.length > 5) history.shift();
      localStorage.setItem("trackingHistory", JSON.stringify(history));
    }
  }

  function submitCancelOrder(code, reason) {
    const btn = document.getElementById("confirm-cancel-btn");
    if (btn) {
      btn.innerText = "Đang xử lý...";
      btn.disabled = true;
    }

    const formData = new FormData();
    formData.append("code", code);
    formData.append("reason", reason);
    try {
      const normalizedCode = String(formData.get("code") || "")
        .trim()
        .toUpperCase();
      const cancelReason = String(formData.get("reason") || "").trim();
      const storedOrders = readLocalJson(localOrderStorageKey, []);
      const nextOrders = (Array.isArray(storedOrders) ? storedOrders : []).map((item) => {
        const itemCode = String(
          item?.order?.order_code || item?.order?.id || "",
        )
          .trim()
          .toUpperCase();
        if (itemCode !== normalizedCode) return item;

        const nextItem = JSON.parse(JSON.stringify(item));
        nextItem.order = nextItem.order || {};
        const previousStatus = nextItem.order.status || "pending";
        const previousStatusLabel =
          nextItem.order.status_label || getStatusLabel(previousStatus);
        nextItem.order.status = "cancelled";
        nextItem.order.status_label = "Đã hủy";
        nextItem.logs = [
          {
            old_status_label: previousStatusLabel,
            new_status_label: "Đã hủy",
            created_at: new Date().toISOString(),
            note: cancelReason || "Khách hàng chủ động hủy đơn trong tra cứu.",
          },
          ...(Array.isArray(nextItem.logs) ? nextItem.logs : []),
        ];
        return nextItem;
      });

      writeLocalJson(localOrderStorageKey, nextOrders);
      saveCancelOverride(normalizedCode, cancelReason);
      core.showToast("Đã hủy đơn hàng thành công!", "success");
      window.closeCancelModal();
      setTimeout(() => location.reload(), 600);
    } catch (error) {
      console.error(error);
      core.showToast("Không thể hủy đơn trong chế độ local.", "error");
      if (btn) {
        btn.innerText = "Xác nhận hủy đơn";
        btn.disabled = false;
      }
    }
  }

  function getTrackingStatusClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (
      normalized === "completed" ||
      normalized === "delivered" ||
      normalized === "success"
    ) {
      return "completed";
    }
    if (normalized === "shipping" || normalized === "in_transit") {
      return "shipping";
    }
    if (normalized === "cancelled" || normalized === "canceled") {
      return "cancelled";
    }
    return "pending";
  }

  function renderTimeline(order) {
    const timeline = Array.isArray(order.timeline) ? order.timeline : [];
    if (!timeline.length) {
      return '<div style="color:#64748b;">Chưa có lịch sử cập nhật trạng thái.</div>';
    }

    return `<div style="display:grid;gap:14px;">${timeline
      .map(
        (item, index) => `
          <div style="display:grid;grid-template-columns:18px 1fr;gap:12px;align-items:start;">
            <div style="width:12px;height:12px;border-radius:999px;margin-top:4px;background:${index === timeline.length - 1 ? "#2d6a4f" : "#cbd5e1"};box-shadow:${index === timeline.length - 1 ? "0 0 0 4px rgba(45,106,79,0.15)" : "none"};"></div>
            <div>
              <div style="font-size:12px;color:#64748b;margin-bottom:2px;">${escapeHtml(formatDateTime(item.time || "--"))}</div>
              <div style="color:${index === timeline.length - 1 ? "#173528" : "#334155"};font-weight:${index === timeline.length - 1 ? "700" : "500"};">${escapeHtml(item.text || item.label || "--")}</div>
            </div>
          </div>`,
      )
      .join("")}</div>`;
  }

  function renderInfoGrid(items) {
    const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!normalizedItems.length) return "";

    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px 18px;">${normalizedItems
      .map((item) => {
        const columnStyle = item.wide ? "grid-column:1 / -1;" : "";
        return `
          <div style="min-width:0;${columnStyle}">
            <div style="font-size:12px;color:#64748b;margin-bottom:4px;">${escapeHtml(item.label || "--")}</div>
            <div style="color:#173528;font-weight:600;line-height:1.55;word-break:break-word;">${escapeHtml(item.value || "--")}</div>
          </div>
        `;
      })
      .join("")}</div>`;
  }

  function renderSection(title, items) {
    return `
      <section style="padding-top:16px;border-top:1px solid #e5efe9;">
        <h3 style="margin:0 0 12px;font-size:15px;color:#173528;">${escapeHtml(title)}</h3>
        ${renderInfoGrid(items)}
      </section>
    `;
  }

  function renderTrackingResult(order) {
    const provider = order.provider || {};
    const statusClass = getTrackingStatusClass(order.status_raw);
    const statusStyleMap = {
      completed: "background:#d4edda;color:#155724;",
      shipping: "background:#cce5ff;color:#004085;",
      pending: "background:#fff3cd;color:#856404;",
      cancelled: "background:#f8d7da;color:#721c24;",
    };
    const infoOrder = [
      {
        label: "Mã đơn",
        value: order.order_code || "--",
      },
      {
        label: "Dịch vụ",
        value: order.service_label || "--",
      },
      {
        label: "Loại hàng",
        value: order.type || "--",
      },
      {
        label: "Phương tiện",
        value: order.vehicle_type || "--",
      },
      {
        label: "Khoảng cách",
        value: order.distance_label || "--",
      },
    ];
    const infoRouteDetails = [
      {
        label: "Điểm lấy hàng",
        value: order.pickup_address || "--",
        wide: true,
      },
      {
        label: "Điểm giao hàng",
        value: order.delivery_address || "--",
        wide: true,
      },
      {
        label: "Ghi chú giao hàng",
        value: order.clean_note || "--",
        wide: true,
      },
    ];
    const infoPayment = [
      {
        label: "Ngày tạo đơn",
        value: order.created_at || "--",
      },
      {
        label: "Trạng thái đơn",
        value: order.status_text || "--",
      },
      {
        label: "Phí ship",
        value: formatCurrency(order.shipping_fee),
      },
      {
        label: "COD",
        value: formatCurrency(order.cod_amount),
      },
      {
        label: "Phương thức thanh toán",
        value: order.payment_method_label || "--",
      },
      {
        label: "Người trả cước",
        value: order.payer_label || "--",
      },
    ];
    const infoCustomer = [
      {
        label: "Họ tên người gửi",
        value: order.sender_name || "--",
      },
      {
        label: "Số điện thoại người gửi",
        value: order.sender_phone || "--",
      },
      {
        label: "Họ tên người nhận",
        value: order.receiver_name || "--",
      },
      {
        label: "Số điện thoại người nhận",
        value: order.receiver_phone || "--",
      },
      {
        label: "Trạng thái hiện tại",
        value: `${order.icon || ""} ${order.status_text || "--"}`.trim(),
        wide: true,
      },
    ];
    const infoProvider =
      provider.shipper_name || provider.fullname
        ? [
            {
              label: "Họ tên",
              value: provider.shipper_name || provider.fullname || "--",
            },
            {
              label: "Số điện thoại",
              value: provider.shipper_phone || provider.phone || "--",
            },
            {
              label: "Trạng thái",
              value: "Đã phân công",
            },
          ]
        : [
            {
              label: "Họ tên",
              value: "Chưa có",
            },
            {
              label: "Số điện thoại",
              value: "Chưa có",
            },
            {
              label: "Trạng thái",
              value: "Chưa phân công",
            },
          ];

    return `
      <div class="tracking-card" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:22px 20px;margin-top:20px;text-align:left;">
        <div class="t-header" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:15px;border-bottom:1px dashed #e2e8f0;margin-bottom:18px;">
          <div class="t-code" style="font-size:18px;font-weight:700;color:#0a2a66;"># ${escapeHtml(order.order_code || "--")}</div>
          <div class="t-status ${statusClass}" style="padding:5px 12px;border-radius:20px;font-size:13px;font-weight:600;${statusStyleMap[statusClass] || statusStyleMap.pending}">${escapeHtml(order.icon || "")} ${escapeHtml(order.status_text || "--")}</div>
        </div>
        <section style="padding:18px;border:1px solid #e5efe9;border-radius:16px;background:#f8fbfa;margin-bottom:18px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;align-items:start;">
            <div>
              <h3 style="margin:0 0 12px;font-size:15px;color:#173528;">Đơn đặt</h3>
              ${renderInfoGrid(infoOrder)}
            </div>
            <div style="padding:0 0 0 18px;border-left:1px solid #d8e7de;">
              <h3 style="margin:0 0 12px;font-size:15px;color:#173528;">Thanh toán</h3>
              ${renderInfoGrid(infoPayment)}
            </div>
          </div>
          <div style="margin-top:18px;padding-top:18px;border-top:1px solid #d8e7de;">
            <h3 style="margin:0 0 12px;font-size:15px;color:#173528;">Lộ trình giao nhận</h3>
            ${renderInfoGrid(infoRouteDetails)}
          </div>
        </section>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;align-items:stretch;">
          <section style="padding:18px;border:1px solid #e5efe9;border-radius:16px;background:#fff;height:100%;">
            <h3 style="margin:0 0 12px;font-size:15px;color:#173528;">Thông tin khách hàng</h3>
            ${renderInfoGrid(infoCustomer)}
          </section>
          <section style="padding:18px;border:1px solid #e5efe9;border-radius:16px;background:#fff;height:100%;">
            <h3 style="margin:0 0 12px;font-size:15px;color:#173528;">Thông tin nhà cung cấp</h3>
            ${renderInfoGrid(infoProvider)}
          </section>
        </div>
        <section style="padding-top:16px;border-top:1px solid #e5efe9;">
          <p style="margin:0 0 12px;font-weight:700;color:#173528;">Lịch sử xử lý</p>
          ${renderTimeline(order)}
        </section>
      </div>
    `;
  }

  function requestTrackingOrder(code) {
    const localRecord = findLocalTrackingRecord(code);
    if (localRecord) {
      return Promise.resolve(applyCancelOverride(localRecord));
    }

    return findKrudTrackingRecord(code)
      .then((krudRecord) => {
        if (krudRecord) {
          return applyCancelOverride(krudRecord);
        }
        throw new Error("Không tìm thấy đơn hàng phù hợp.");
      });
  }

  window.trackOrder = function (event, type) {
    event.preventDefault();

    const spinner = document.getElementById(`loading-spinner-${type}`);
    const resultDiv = document.getElementById(`result-${type}`);
    let code = "";

    if (type === "standard") {
      code = document.getElementById("standard-code").value.trim().toUpperCase();
    } else if (type === "cod") {
      code = document.getElementById("cod-code").value.trim().toUpperCase();
    }

    if (!code) {
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div style="background-color: #f8e8e8; border-left: 4px solid #d9534f; padding: 20px; border-radius: 8px; margin-top: 15px;">
            <p style="color: #d9534f;"><strong>❌ Lỗi:</strong> Vui lòng nhập mã đơn hàng!</p>
          </div>`;
      }
      return;
    }

    if (!spinner || !resultDiv) {
      console.error("Không tìm thấy phần tử hiển thị kết quả (spinner/resultDiv)");
      return;
    }

    spinner.style.display = "block";
    resultDiv.innerHTML = "";

    requestTrackingOrder(code)
      .then((order) => {
        spinner.style.display = "none";
        resultDiv.innerHTML = renderTrackingResult(order);
        saveToHistory(code);
      })
      .catch((error) => {
        console.error("Error:", error);
        spinner.style.display = "none";
        resultDiv.innerHTML = `
          <div style="background-color: #f8e8e8; border-left: 4px solid #d9534f; padding: 20px; border-radius: 8px; margin-top: 15px; text-align: left;">
            <p style="color: #d9534f;"><strong>❌ Không tra cứu được:</strong> ${error.message}</p>
          </div>
        `;
      });
  };

  window.openCancelModal = function (code) {
    currentCancelCode = code;
    const modal = document.getElementById("cancel-modal");
    if (modal) {
      modal.style.display = "block";
      document.getElementById("cancel-reason").value = "";
      document.getElementById("other-reason-input").style.display = "none";
    } else {
      const reason = prompt(
        "Vui lòng nhập lý do hủy đơn hàng " + code + ":",
        "Thay đổi kế hoạch",
      );
      if (reason !== null) {
        submitCancelOrder(code, reason);
      }
    }
  };

  window.closeCancelModal = function () {
    const modal = document.getElementById("cancel-modal");
    if (modal) modal.style.display = "none";
  };

  window.handleReasonChange = function (select) {
    const otherInput = document.getElementById("other-reason-input");
    if (select.value === "other") {
      otherInput.style.display = "block";
      otherInput.focus();
    } else {
      otherInput.style.display = "none";
    }
  };

  window.confirmCancelOrder = function () {
    const select = document.getElementById("cancel-reason");
    let reason = select.value;

    if (reason === "other") {
      const otherVal = document.getElementById("other-reason-input").value.trim();
      if (!otherVal) {
        core.showToast("Vui lòng nhập lý do cụ thể.", "warning");
        return;
      }
      reason = otherVal;
    }

    if (!reason) {
      core.showToast("Vui lòng chọn lý do hủy đơn.", "warning");
      return;
    }

    submitCancelOrder(currentCancelCode, reason);
  };

  window.addEventListener("click", function (event) {
    const modal = document.getElementById("cancel-modal");
    if (event.target == modal) {
      window.closeCancelModal();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const presetCode = String(params.get("code") || "").trim().toUpperCase();
  if (presetCode) {
    const standardInput = document.getElementById("standard-code");
    if (standardInput) {
      standardInput.value = presetCode;
      window.setTimeout(() => {
        const fakeEvent = { preventDefault() {} };
        window.trackOrder(fakeEvent, "standard");
        document.getElementById("home-tracking")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }
})(window, document);
