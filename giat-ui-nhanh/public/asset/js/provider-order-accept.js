(function () {
  var BOOKING_TABLE = "datlich_giatuinhanh";
  var orderDisplayUtils = window.OrderDisplayUtils || {};
  var parseOrderIdFromDisplayCode =
    typeof orderDisplayUtils.parseOrderIdFromDisplayCode === "function"
      ? orderDisplayUtils.parseOrderIdFromDisplayCode
      : function (codeText) {
          var text = String(codeText || "").trim();
          if (!text) return null;

          var legacyMatch = text.match(/GU-(\d+)/i);
          if (legacyMatch) {
            var legacyId = Number(legacyMatch[1]);
            return Number.isFinite(legacyId) && legacyId > 0 ? legacyId : null;
          }

          var sevenDigitMatch = text.match(/^(\d{7})$/);
          if (sevenDigitMatch) {
            var sevenDigitId = Number(sevenDigitMatch[1]);
            return Number.isFinite(sevenDigitId) && sevenDigitId > 0
              ? sevenDigitId
              : null;
          }

          var digitsOnly = text.replace(/\D/g, "");
          if (!digitsOnly) return null;

          var numericId = Number(digitsOnly);
          return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
        };

  function extractKrudRows(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function toNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    var text = String(value || "")
      .replace(/[^\d,-.]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(/,/g, ".");
    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseWeight(order) {
    var fromWeight = toNumber(order.khoiluong || order.weight || order.cannang);
    if (fromWeight > 0) return fromWeight;

    var fromQuantity = toNumber(order.soluong || order.quantity);
    return fromQuantity > 0 ? fromQuantity : 1;
  }

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
      throw new Error("Khong the tinh khoang cach");
    }

    var data = await res.json();
    if (!data.routes || !data.routes.length) {
      throw new Error("Khong tinh duoc khoang cach");
    }

    return Number((data.routes[0].distance / 1000).toFixed(2));
  }

  async function getSessionUser() {
    var response = await fetch("public/asset/login-page.php", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    var result = await response.json().catch(function () {
      return null;
    });

    if (!response.ok || !result || result.loggedIn !== true) {
      throw new Error("Phien dang nhap khong hop le");
    }

    return result.user || {};
  }

  async function getCurrentSupplier() {
    var user = await getSessionUser();
    var supplierId = Number(user.id || user.idnhacungcap || user.provider_id);
    if (!Number.isFinite(supplierId) || supplierId <= 0) {
      throw new Error("Khong tim thay id nha cung cap trong session");
    }

    return {
      id: supplierId,
      hovaten: user.user_name || user.hovaten || user.hoten || "",
      sodienthoai: user.user_tel || user.sodienthoai || user.phone || "",
      email: user.user_email || user.email || "",
      diachi: user.diachi || user.diachi_ncc || "",
      lat_ncc: user.lat || user.lat_ncc,
      lng_ncc: user.lng || user.lng_ncc,
    };
  }

  async function getOrderById(orderId) {
    var result = await Promise.resolve(
      window.krudList({
        table: BOOKING_TABLE,
        where: [{ field: "id", operator: "=", value: orderId }],
        limit: 1,
      }),
    );

    var rows = extractKrudRows(result);
    if (!rows.length) throw new Error("Khong tim thay don hang");
    return rows[0];
  }

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

  async function updateBookingAfterAccept(orderId, supplier, pricing) {
    var supplierId = supplier.id;
    var payload = {
      ngaynhan: new Date().toISOString(),
      phuphigiaonhan: pricing.shippingSurcharge,
      tongtien: pricing.totalAmount,
      tiendichuyen: pricing.effectiveTransportFee,
      khoangcachgiaonhan: pricing.distanceKm,
      idnhacungcap: supplierId,
      tennhacungcap: supplier.hovaten || supplier.hoten || "",
      sdt_ncc: supplier.sodienthoai || supplier.sdt || "",
      email_ncc: supplier.email || "",
      diachi_ncc: supplier.diachi || "",
    };

    var result = await Promise.resolve(
      window.krud("update", BOOKING_TABLE, payload, orderId),
    );

    if (!result || result.success === false || result.error) {
      throw new Error(
        (result && (result.error || result.message)) || "Cap nhat don that bai",
      );
    }
  }

  async function handleAcceptOrder(orderId) {
    if (
      typeof window.krudList !== "function" ||
      typeof window.krud !== "function"
    ) {
      throw new Error("KRUD chua san sang");
    }

    var supplier = await getCurrentSupplier();
    var order = await getOrderById(orderId);

    var supplierLat = Number(supplier.lat_ncc);
    var supplierLng = Number(supplier.lng_ncc);
    var customerLat = Number(order.lat_kh || order.lat);
    var customerLng = Number(order.lng_kh || order.lng);

    if (
      !Number.isFinite(supplierLat) ||
      !Number.isFinite(supplierLng) ||
      !Number.isFinite(customerLat) ||
      !Number.isFinite(customerLng)
    ) {
      throw new Error("Thieu lat/lng de tinh khoang cach");
    }

    var distanceKm = await getDistance(
      supplierLat,
      supplierLng,
      customerLat,
      customerLng,
    );

    var pricing = calculatePricing(order, distanceKm);
    await updateBookingAfterAccept(orderId, supplier, pricing);

    return {
      supplierName: supplier.hovaten || supplier.hoten || "Nha cung cap",
      distanceKm: pricing.distanceKm,
      surcharge: pricing.shippingSurcharge,
      total: pricing.totalAmount,
    };
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent || "Nhan don";
      }
      button.disabled = true;
      button.textContent = "Dang nhan...";
      return;
    }

    button.disabled = false;
    button.textContent = button.dataset.originalText || "Nhan don";
  }

  function extractOrderIdFromButton(button) {
    var fromData = Number(button && button.getAttribute("data-order-id"));
    if (Number.isFinite(fromData) && fromData > 0) return fromData;

    var row = button ? button.closest("tr") : null;
    var codeText =
      row && row.children && row.children[0] ? row.children[0].textContent : "";
    return parseOrderIdFromDisplayCode(codeText);
  }

  function bindAcceptOrderAction() {
    var tbody = document.getElementById("newOrdersBody");
    if (!tbody) return;

    tbody.addEventListener("click", async function (event) {
      var button = event.target.closest(".btn-accept-order");
      if (!button) return;

      var orderId = extractOrderIdFromButton(button);
      if (!orderId) {
        window.alert("Khong xac dinh duoc ma don hang.");
        return;
      }

      setButtonLoading(button, true);

      try {
        await handleAcceptOrder(orderId);

        if (
          window.ProviderDashboard &&
          typeof window.ProviderDashboard.refreshDashboardData === "function"
        ) {
          await window.ProviderDashboard.refreshDashboardData();
        }
      } catch (error) {
        console.error("Accept order failed:", error);
        window.alert(
          error && error.message ? error.message : "Khong the nhan don.",
        );
      } finally {
        setButtonLoading(button, false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindAcceptOrderAction();
  });
})();
