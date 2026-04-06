(function () {
  var DEFAULT_CUSTOMER_TABLE = "khachhang";
  var DEFAULT_PROVIDER_TABLE = "nhacungcap_giatuinhanh";

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
    if (row.ngaydat) return "pending";
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

  function normalizePhone(phone) {
    var value = String(phone || "")
      .replace(/\s+/g, "")
      .trim();
    if (value.indexOf("+84") === 0) return "0" + value.slice(3);
    if (value.indexOf("84") === 0 && value.length >= 11)
      return "0" + value.slice(2);
    return value;
  }

  function normalizeId(id) {
    return String(id == null ? "" : id).trim();
  }

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function pickFirstValue(values) {
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length; i += 1) {
      var text = String(list[i] == null ? "" : list[i]).trim();
      if (text) return text;
    }
    return "";
  }

  function resolveRelatedTables(options) {
    var config = options && typeof options === "object" ? options : {};

    var customerTable = String(
      config.customerTable || config.customer || DEFAULT_CUSTOMER_TABLE,
    ).trim();
    var providerTable = String(
      config.providerTable || config.provider || DEFAULT_PROVIDER_TABLE,
    ).trim();

    return {
      customerTable: customerTable || DEFAULT_CUSTOMER_TABLE,
      providerTable: providerTable || DEFAULT_PROVIDER_TABLE,
    };
  }

  function resolveFetchOrdersByPhoneArgs(limit, options) {
    var config = options;
    var queryLimit = Number(limit) > 0 ? Number(limit) : 200;

    if (limit && typeof limit === "object" && !Array.isArray(limit)) {
      config = limit;
      queryLimit = Number(limit.limit) > 0 ? Number(limit.limit) : 200;
    }

    return {
      queryLimit: queryLimit,
      relatedTables: resolveRelatedTables(config),
    };
  }

  function resolveFetchAllOrdersArgs(limit, page, options) {
    var config = options;
    var queryLimit = Number(limit) > 0 ? Number(limit) : 200;
    var queryPage = Number(page) > 0 ? Number(page) : 1;

    if (limit && typeof limit === "object" && !Array.isArray(limit)) {
      config = limit;
      queryLimit = Number(limit.limit) > 0 ? Number(limit.limit) : 200;
      queryPage = Number(limit.page) > 0 ? Number(limit.page) : 1;
      return {
        queryLimit: queryLimit,
        queryPage: queryPage,
        relatedTables: resolveRelatedTables(config),
      };
    }

    if (page && typeof page === "object" && !Array.isArray(page)) {
      config = page;
      if (Number(page.limit) > 0) {
        queryLimit = Number(page.limit);
      }
      if (Number(page.page) > 0) {
        queryPage = Number(page.page);
      }
    }

    return {
      queryLimit: queryLimit,
      queryPage: queryPage,
      relatedTables: resolveRelatedTables(config),
    };
  }

  function mergeOrderWithCustomer(order, customer) {
    if (!customer || typeof customer !== "object") return order;
    return Object.assign({}, order, {
      khachhang: customer,
      hovaten: order.hovaten || customer.hovaten || customer.user_name || "",
      sodienthoai:
        order.sodienthoai || customer.sodienthoai || customer.user_tel || "",
      email: order.email || customer.email || customer.user_email || "",
      diachi: order.diachi || customer.diachi || "",
      avatartenfile: pickFirstValue([
        order.avatartenfile,
        order.avatar_kh,
        order.avatar_khachhang,
        customer.avatartenfile,
        customer.avatar,
        customer.avatar_kh,
      ]),
      avatar_kh: pickFirstValue([
        order.avatar_kh,
        customer.avatar,
        customer.avatar_kh,
        customer.avatartenfile,
      ]),
    });
  }

  function mergeOrderWithProvider(order, provider) {
    if (!provider || typeof provider !== "object") return order;
    return Object.assign({}, order, {
      nhacungcap: provider,
      idnhacungcap:
        order.idnhacungcap ||
        order.id_ncc ||
        order.manhacungcap ||
        order.provider_id ||
        provider.id ||
        provider.idnhacungcap ||
        provider.provider_id ||
        provider.manhacungcap ||
        "",
      tennhacungcap:
        order.tennhacungcap || provider.hovaten || provider.user_name || "",
      sdt_ncc: order.sdt_ncc || provider.sodienthoai || provider.user_tel || "",
      email_ncc: order.email_ncc || provider.email || provider.user_email || "",
      diachi_ncc: order.diachi_ncc || provider.diachi || "",
      avatar_ncc: pickFirstValue([
        order.avatar_ncc,
        order.avatar_nhacungcap,
        order.provider_avatar,
        order.avatar,
        provider.avatar,
        provider.avatar_ncc,
        provider.avatartenfile,
      ]),
    });
  }

  function buildCustomerMaps(customers) {
    var byId = {};
    var byPhone = {};

    (customers || []).forEach(function (customer) {
      var customerId = normalizeId(
        customer.id || customer.makhachhang || customer.user_id,
      );
      if (customerId && !byId[customerId]) {
        byId[customerId] = customer;
      }

      var customerPhone = normalizePhone(
        customer.sodienthoai || customer.user_tel || customer.phone,
      );
      if (customerPhone && !byPhone[customerPhone]) {
        byPhone[customerPhone] = customer;
      }
    });

    return { byId: byId, byPhone: byPhone };
  }

  function findCustomerForOrder(order, maps) {
    var data = maps || { byId: {}, byPhone: {} };
    var orderCustomerId = normalizeId(
      order.idkhachhang || order.makhachhang || order.user_id,
    );
    var orderPhone = normalizePhone(order.sodienthoai);
    return (
      (orderCustomerId && data.byId[orderCustomerId]) ||
      (orderPhone && data.byPhone[orderPhone]) ||
      null
    );
  }

  function buildProviderMaps(providers) {
    var byId = {};
    var byPhone = {};
    var byEmail = {};

    (providers || []).forEach(function (provider) {
      var providerId = normalizeId(
        provider.id ||
          provider.idnhacungcap ||
          provider.provider_id ||
          provider.manhacungcap,
      );
      if (providerId && !byId[providerId]) {
        byId[providerId] = provider;
      }

      var providerPhone = normalizePhone(
        provider.sodienthoai ||
          provider.user_tel ||
          provider.phone ||
          provider.sdt,
      );
      if (providerPhone && !byPhone[providerPhone]) {
        byPhone[providerPhone] = provider;
      }

      var providerEmail = normalizeEmail(provider.email || provider.user_email);
      if (providerEmail && !byEmail[providerEmail]) {
        byEmail[providerEmail] = provider;
      }
    });

    return { byId: byId, byPhone: byPhone, byEmail: byEmail };
  }

  function findProviderForOrder(order, maps) {
    var data = maps || { byId: {}, byPhone: {}, byEmail: {} };
    var providerId = normalizeId(
      order.idnhacungcap ||
        order.id_ncc ||
        order.manhacungcap ||
        order.provider_id,
    );
    var providerPhone = normalizePhone(order.sdt_ncc || order.sodienthoai_ncc);
    var providerEmail = normalizeEmail(order.email_ncc);
    return (
      (providerId && data.byId[providerId]) ||
      (providerPhone && data.byPhone[providerPhone]) ||
      (providerEmail && data.byEmail[providerEmail]) ||
      null
    );
  }

  function enrichOrdersWithRelated(orders, customerMaps, providerMaps) {
    return (orders || []).map(function (order) {
      var next = order;
      var customer = findCustomerForOrder(order, customerMaps);
      if (customer) {
        next = mergeOrderWithCustomer(next, customer);
      }

      var provider = findProviderForOrder(order, providerMaps);
      if (provider) {
        next = mergeOrderWithProvider(next, provider);
      }

      return next;
    });
  }

  function fetchOrdersByPhone(table, phone, limit, options) {
    var normalizedPhone = normalizePhone(phone);
    var args = resolveFetchOrdersByPhoneArgs(limit, options);
    var queryLimit = args.queryLimit;
    var relatedTables = args.relatedTables;

    var ordersPromise = Promise.resolve(
      window.krudList({
        table: table,
        where: [
          {
            conditions: [
              {
                field: "sodienthoai",
                operator: "=",
                value: normalizedPhone,
              },
            ],
          },
        ],
        page: 1,
        limit: queryLimit,
      }),
    ).then(extractRows);

    var customerPromise = Promise.resolve(
      window.krudList({
        table: relatedTables.customerTable,
        where: normalizedPhone
          ? [{ field: "sodienthoai", operator: "=", value: normalizedPhone }]
          : undefined,
        page: 1,
        limit: normalizedPhone ? 1 : 200,
      }),
    )
      .then(extractRows)
      .catch(function () {
        return [];
      });

    var providersPromise = Promise.resolve(
      window.krudList({
        table: relatedTables.providerTable,
      }),
    )
      .then(extractRows)
      .catch(function () {
        return [];
      });

    return Promise.all([ordersPromise, customerPromise, providersPromise]).then(
      function (result) {
        var orders = result[0] || [];
        var customers = result[1] || [];
        var providers = result[2] || [];
        return enrichOrdersWithRelated(
          orders,
          buildCustomerMaps(customers),
          buildProviderMaps(providers),
        );
      },
    );
  }

  function fetchAllOrders(table, limit, page, options) {
    if (typeof window.krudList !== "function") {
      return Promise.reject(new Error("KRUD chua san sang"));
    }

    var args = resolveFetchAllOrdersArgs(limit, page, options);
    var queryPage = args.queryPage;
    var queryLimit = args.queryLimit;
    var relatedTables = args.relatedTables;

    var ordersPromise = Promise.resolve(
      window.krudList({
        table: table,
        page: queryPage,
        limit: queryLimit,
      }),
    ).then(extractRows);

    var customersPromise = Promise.resolve(
      window.krudList({
        table: relatedTables.customerTable,
        // page: 1,
        // limit: 100,
      }),
    )
      .then(extractRows)
      .catch(function () {
        return [];
      });

    var providersPromise = Promise.resolve(
      window.krudList({
        table: relatedTables.providerTable,
      }),
    )
      .then(extractRows)
      .catch(function () {
        return [];
      });

    return Promise.all([
      ordersPromise,
      customersPromise,
      providersPromise,
    ]).then(function (res) {
      var orders = res[0] || [];
      var customers = res[1] || [];
      var providers = res[2] || [];

      return enrichOrdersWithRelated(
        orders,
        buildCustomerMaps(customers),
        buildProviderMaps(providers),
      );
    });
  }

  function updateOrder(table, orderId, data) {
    var id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) {
      return Promise.reject(new Error("Ma don khong hop le"));
    }
    if (typeof window.krud !== "function") {
      return Promise.reject(new Error("KRUD chua san sang"));
    }

    return Promise.resolve(window.krud("update", table, data || {}, id)).then(
      function (result) {
        if (!result || result.success === false || result.error) {
          throw new Error(
            (result && (result.error || result.message)) ||
              "Cap nhat don that bai",
          );
        }
        return result;
      },
    );
  }

  function fetchOrderById(table, orderId) {
    var id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) {
      return Promise.reject(new Error("Ma don khong hop le"));
    }
    if (typeof window.krudList !== "function") {
      return Promise.reject(new Error("KRUD chua san sang"));
    }

    return Promise.resolve(
      window.krudList({
        table: table,
        where: [{ field: "id", operator: "=", value: id }],
        limit: 1,
      }),
    )
      .then(extractRows)
      .then(function (rows) {
        return rows && rows.length ? rows[0] : null;
      });
  }

  function acceptProviderOrder(orderId, table, extraData) {
    return updateOrder(
      table,
      orderId,
      Object.assign({ ngaynhan: new Date().toISOString() }, extraData || {}),
    );
  }

  function completeProviderOrder(orderId, table, extraData) {
    return updateOrder(
      table,
      orderId,
      Object.assign(
        {
          ngayhoanthanh: new Date().toISOString(),
          trangthaithanhtoan: "Paid",
        },
        extraData || {},
      ),
    );
  }

  window.SharedOrderUtils = {
    extractRows: extractRows,
    getOrderStatus: getOrderStatus,
    getOrderStatusLabel: getOrderStatusLabel,
    getOrderStatusClass: getOrderStatusClass,
    getPaymentStatusLabel: getPaymentStatusLabel,
    formatOrderCode: formatOrderCode,
    fetchOrderById: fetchOrderById,
    updateOrder: updateOrder,
    fetchAllOrders: fetchAllOrders,
    fetchOrdersByPhone: fetchOrdersByPhone,
    acceptProviderOrder: acceptProviderOrder,
    completeProviderOrder: completeProviderOrder,
  };
})();
