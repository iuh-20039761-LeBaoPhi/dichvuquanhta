(function attachServiceCatalog(global) {
  const SERVICE_CATALOG = {
    mainGroups: [
      {
        key: "delivery",
        label: "Giao hàng",
        rank: 1,
        notes: "Nhóm giao hàng cho khách lẻ",
        serviceTypes: ["slow", "standard", "fast", "express"],
        matrix: [
          {
            area: "inner_city",
            areaLabel: "Nội thành",
            packages: ["slow", "standard", "fast", "express"],
          },
          {
            area: "outer_city",
            areaLabel: "Ngoại thành",
            packages: ["slow", "standard", "fast", "express"],
          },
          {
            area: "inter_province",
            areaLabel: "Liên tỉnh",
            packages: ["slow", "standard", "fast", "express"],
          },
        ],
      },
    ],
    addOns: [
      {
        key: "cod",
        label: "COD",
        notes: "Thu hộ tiền khi giao hàng",
        appliesToMainGroups: ["delivery"],
      },
      {
        key: "insurance",
        label: "Bảo hiểm hàng hóa",
        notes: "Bảo vệ đơn hàng giá trị cao",
        appliesToMainGroups: ["delivery"],
      },
    ],
    serviceTypes: {
      slow: {
        label: "Giao chậm",
        mainGroup: "delivery",
        speed: "slow",
      },
      standard: {
        label: "Giao tiêu chuẩn",
        mainGroup: "delivery",
        speed: "standard",
      },
      fast: {
        label: "Giao nhanh",
        mainGroup: "delivery",
        speed: "fast",
      },
      express: {
        label: "Giao hỏa tốc",
        mainGroup: "delivery",
        speed: "express",
      },
    },
    defaultDeliveryTypeOrder: ["slow", "standard", "fast", "express"],
  };

  function getServiceMeta(typeKey) {
    if (!typeKey) return null;
    const key = String(typeKey).trim().toLowerCase();
    return SERVICE_CATALOG.serviceTypes[key] || null;
  }

  function getMainGroupKey(typeKey) {
    const meta = getServiceMeta(typeKey);
    return meta ? meta.mainGroup : null;
  }

  function isDeliveryLikeService(typeKey) {
    const groupKey = getMainGroupKey(typeKey);
    return groupKey === "delivery";
  }

  function getAddOnsForType(typeKey) {
    const groupKey = getMainGroupKey(typeKey);
    if (!groupKey) return [];
    return SERVICE_CATALOG.addOns.filter((addon) =>
      addon.appliesToMainGroups.includes(groupKey),
    );
  }

  function orderDeliveryTypes(typeKeys) {
    const list = Array.isArray(typeKeys) ? typeKeys : [];
    const normalized = list.map((k) => String(k).trim().toLowerCase());
    return SERVICE_CATALOG.defaultDeliveryTypeOrder.filter((k) =>
      normalized.includes(k),
    );
  }

  global.serviceCatalog = SERVICE_CATALOG;
  global.serviceHelper = {
    getServiceMeta,
    getMainGroupKey,
    isDeliveryLikeService,
    getAddOnsForType,
    orderDeliveryTypes,
  };
})(window);
