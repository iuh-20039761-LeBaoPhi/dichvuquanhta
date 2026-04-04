(function () {
  function extractRows(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function getOrderStatus(order) {
    var row = order || {};
    if (row.ngayhuy) return "cancel";
    if (row.ngayhoanthanh) return "completed";
    if (row.ngaynhan) return "processing";
    if (row.thoigiandatdichvu) return "pending";
    return "pending";
  }

  function getOrderStatusLabel(status) {
    if (status === "processing") return "Đã nhận đơn";
    if (status === "completed") return "Đã hoàn thành";
    if (status === "cancel") return "Đã hủy";
    return "Chờ nhận đơn";
  }

  function getOrderStatusClass(status) {
    if (status === "processing") return "status-processing";
    if (status === "completed") return "status-completed";
    if (status === "cancel") return "status-cancel";
    return "status-pending";
  }

  function getPaymentStatusLabel(value) {
    return String(value || "")
      .trim()
      .toLowerCase() === "paid"
      ? "Đã thanh toán"
      : "Chưa thanh toán";
  }

  function formatOrderCode(orderId) {
    var id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) return "-";
    return String(Math.floor(id)).padStart(7, "0");
  }

  function fetchOrdersByPhone(table, phone, limit) {
    return Promise.resolve(
      window.krudList({
        table: table,
        where: [
          {
            conditions: [
              {
                field: "sodienthoai",
                operator: "=",
                value: phone || "",
              },
            ],
          },
        ],
        page: 1,
        limit: Number(limit) > 0 ? Number(limit) : 200,
      }),
    ).then(extractRows);
  }

  window.SharedOrderUtils = {
    extractRows: extractRows,
    getOrderStatus: getOrderStatus,
    getOrderStatusLabel: getOrderStatusLabel,
    getOrderStatusClass: getOrderStatusClass,
    getPaymentStatusLabel: getPaymentStatusLabel,
    formatOrderCode: formatOrderCode,
    fetchOrdersByPhone: fetchOrdersByPhone,
  };
})();
