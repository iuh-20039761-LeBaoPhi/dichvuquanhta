(function (window, document) {
  if (window.__giaoHangNhanhTrackingInitDone) return;
  window.__giaoHangNhanhTrackingInitDone = true;

  const core = window.GiaoHangNhanhCore;
  if (!core) return;

  let currentCancelCode = "";
  const mockTrackingDataCandidates = [
    "public/assets/data/mock-tracking-orders.json",
    "assets/data/mock-tracking-orders.json",
  ];
  let mockTrackingDatasetPromise = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

  function getServiceLabel(serviceType, fallbackLabel) {
    if (fallbackLabel) return fallbackLabel;
    const normalized = String(serviceType || "").toLowerCase();
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

  function normalizeMockTrackingRecord(record) {
    const order = record?.order || record?.detail?.order || {};
    const tracking = record?.tracking || {};
    const items = Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.detail?.items)
        ? record.detail.items
        : [];
    const providerFromTracking =
      tracking?.provider && hasProviderInfo(tracking.provider)
        ? tracking.provider
        : null;
    const provider =
      providerFromTracking ||
      record?.provider ||
      record?.detail?.provider ||
      {};
    const serviceMeta = order.service_meta || {};
    const statusRaw =
      tracking.status_raw || tracking.status || order.status || "pending";

    return {
      ...order,
      ...tracking,
      order_code:
        tracking.order_code || order.order_code || order.id || record?.id || "",
      type: tracking.type || summarizeItems(items),
      service_label: getServiceLabel(
        order.service_type || tracking.service_type,
        order.service_label ||
          order.service_name ||
          tracking.service_label ||
          serviceMeta.service_name,
      ),
      status_raw: statusRaw,
      status_text:
        tracking.status_text ||
        tracking.status_label ||
        order.status_label ||
        getStatusLabel(statusRaw),
      icon: tracking.icon || getStatusIcon(statusRaw),
      created_at: formatDateTime(tracking.created_at || order.created_at || ""),
      sender_name: order.sender_name || tracking.sender_name || "",
      sender_phone: order.sender_phone || tracking.sender_phone || "",
      receiver_name: order.receiver_name || tracking.receiver_name || "",
      receiver_phone: order.receiver_phone || tracking.receiver_phone || "",
      pickup_address: order.pickup_address || tracking.pickup_address || "",
      delivery_address: order.delivery_address || tracking.delivery_address || "",
      distance_label:
        tracking.distance_label ||
        serviceMeta.distance_label ||
        formatDistanceLabel(serviceMeta.distance_km || order.khoang_cach_km),
      vehicle_type:
        tracking.vehicle_type ||
        order.vehicle_type ||
        order.vehicle_label ||
        serviceMeta.vehicle_label ||
        "--",
      shipping_fee: Number(
        tracking.shipping_fee ?? order.shipping_fee ?? order.total_fee ?? 0,
      ),
      cod_amount: Number(
        tracking.cod_amount ?? order.cod_amount ?? order.cod_value ?? 0,
      ),
      payment_method_label:
        order.payment_method_label ||
        tracking.payment_method_label ||
        serviceMeta.payment_method_label ||
        getPaymentMethodLabel(order.payment_method || tracking.payment_method),
      payer_label:
        order.payer_label ||
        tracking.payer_label ||
        serviceMeta.payer_label ||
        getFeePayerLabel(order.fee_payer || tracking.fee_payer),
      clean_note:
        order.clean_note || order.notes || tracking.clean_note || tracking.notes || "",
      provider: provider && hasProviderInfo(provider) ? provider : {},
      items,
      timeline: Array.isArray(tracking.timeline) ? tracking.timeline : [],
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

    fetch(core.toApiUrl("cancel_order_ajax.php"), {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          core.showToast("Đã hủy đơn hàng thành công!", "success");
          setTimeout(() => location.reload(), 1500);
        } else {
          core.showToast("Lỗi: " + data.message, "error");
          if (btn) {
            btn.innerText = "Xác nhận hủy đơn";
            btn.disabled = false;
          }
        }
        window.closeCancelModal();
      })
      .catch((err) => {
        console.error(err);
        core.showToast("Lỗi kết nối server.", "error");
        if (btn) {
          btn.innerText = "Xác nhận hủy đơn";
          btn.disabled = false;
        }
      });
  }

  function parseJsonSafe(response) {
    return response.text().then((text) => {
      try {
        return { data: JSON.parse(text), rawText: text };
      } catch (err) {
        const preview = (text || "").trim().slice(0, 180);
        throw new Error(
          `Phản hồi không hợp lệ từ server (HTTP ${response.status}). ${preview}`,
        );
      }
    });
  }

  function isMockTrackingMode(code) {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("mock") === "1" ||
      String(code || "").startsWith("MOCK-") ||
      String(code || "").startsWith("TEST-")
    );
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

  function loadMockTrackingDataset() {
    if (!mockTrackingDatasetPromise) {
      mockTrackingDatasetPromise = (async () => {
        for (const candidate of mockTrackingDataCandidates) {
          const mockUrl = new URL(candidate, window.location.href);
          const response = await fetch(mockUrl.toString(), {
            credentials: "same-origin",
          });
          const data = await response.json().catch(() => null);

          if (response.ok && data) {
            return data;
          }
        }

        throw new Error("Không đọc được JSON mock để test tra cứu đơn.");
      })();
    }

    return mockTrackingDatasetPromise;
  }

  function findMockTrackingRecord(dataset, code) {
    const records = Array.isArray(dataset?.tracking_orders)
      ? dataset.tracking_orders
      : [];
    const normalizedCode = String(code || "").trim().toUpperCase();
    const record = records.find(
      (item) => {
        const trackingCode = String(item?.tracking?.order_code || "")
          .trim()
          .toUpperCase();
        const orderCode = String(item?.order?.order_code || item?.order?.id || "")
          .trim()
          .toUpperCase();

        return trackingCode === normalizedCode || orderCode === normalizedCode;
      },
    );

    if (!record) {
      throw new Error("Chưa có dữ liệu test cho mã đơn này.");
    }

    return normalizeMockTrackingRecord(record);
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
    const infoContactRoute = [
      {
        label: "Người gửi",
        value: `${order.sender_name || "--"} · ${order.sender_phone || "--"}`,
      },
      {
        label: "Người nhận",
        value: `${order.receiver_name || "--"} · ${order.receiver_phone || "--"}`,
      },
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
        label: "Dịch vụ",
        value: order.service_label || "--",
      },
      {
        label: "Loại hàng",
        value: order.type || "--",
      },
      {
        label: "Khoảng cách",
        value: order.distance_label || "--",
      },
      {
        label: "Phương tiện",
        value: order.vehicle_type || "--",
      },
    ];
    const infoCost = [
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
      {
        label: "Tạo đơn",
        value: order.created_at || "--",
      },
      {
        label: "Ghi chú giao hàng",
        value: order.clean_note || "--",
        wide: true,
      },
    ];
    const infoProvider =
      provider.shipper_name || provider.fullname
        ? [
            {
              label: "Người phụ trách",
              value: provider.shipper_name || provider.fullname || "--",
            },
            {
              label: "Số điện thoại",
              value: provider.shipper_phone || provider.phone || "--",
            },
            {
              label: "Phương tiện",
              value:
                provider.shipper_vehicle ||
                provider.vehicle_type ||
                order.vehicle_type ||
                "--",
            },
          ]
        : [
            {
              label: "Nhà cung cấp",
              value: "Đơn hàng chưa được gán nhà cung cấp cụ thể.",
              wide: true,
            },
          ];

    return `
      <div class="tracking-card" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:22px 20px;margin-top:20px;text-align:left;">
        <div class="t-header" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:15px;border-bottom:1px dashed #e2e8f0;margin-bottom:18px;">
          <div class="t-code" style="font-size:18px;font-weight:700;color:#0a2a66;"># ${escapeHtml(order.order_code || "--")}</div>
          <div class="t-status ${statusClass}" style="padding:5px 12px;border-radius:20px;font-size:13px;font-weight:600;${statusStyleMap[statusClass] || statusStyleMap.pending}">${escapeHtml(order.icon || "")} ${escapeHtml(order.status_text || "--")}</div>
        </div>
        ${renderSection("Liên hệ và lộ trình", infoContactRoute)}
        ${renderSection("Chi phí và trạng thái", infoCost)}
        ${renderSection("Nhà cung cấp phụ trách", infoProvider)}
        <section style="padding-top:16px;border-top:1px solid #e5efe9;">
          <p style="margin:0 0 12px;font-weight:700;color:#173528;">Lịch sử xử lý</p>
          ${renderTimeline(order)}
        </section>
      </div>
    `;
  }

  function requestTrackingOrder(code) {
    return loadMockTrackingDataset().then((dataset) =>
      findMockTrackingRecord(dataset, code),
    );
  }

  window.trackOrder = function (event, type) {
    event.preventDefault();

    const spinner = document.getElementById(`loading-spinner-${type}`);
    const resultDiv = document.getElementById(`result-${type}`);
    let code = "";

    if (type === "standard") {
      code = document.getElementById("standard-code").value.trim().toUpperCase();
    } else if (type === "bulk") {
      code = document.getElementById("bulk-code").value.trim().toUpperCase();
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
})(window, document);
