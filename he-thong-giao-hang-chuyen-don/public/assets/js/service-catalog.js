(function attachServiceCatalog(global) {
  const SERVICE_CATALOG = {
    mainGroups: [
      {
        key: "delivery",
        label: "Giao hang",
        rank: 1,
        notes: "Nhom giao hang cho khach le",
        serviceTypes: ["slow", "standard", "fast", "express"],
        matrix: [
          {
            area: "inner_city",
            areaLabel: "Noi thanh",
            packages: ["slow", "standard", "fast", "express"],
          },
          {
            area: "outer_city",
            areaLabel: "Ngoai thanh",
            packages: ["slow", "standard", "fast", "express"],
          },
          {
            area: "inter_province",
            areaLabel: "Lien tinh",
            packages: ["slow", "standard", "fast", "express"],
          },
          {
            area: "international",
            areaLabel: "Quoc te",
            packages: ["intl_economy", "intl_express"],
          }
        ],
      },
      {
        key: "moving",
        label: "Chuyen don",
        rank: 2,
        notes: "Nha, van phong, kho bai",
        serviceTypes: ["moving_house", "moving_office", "moving_warehouse"],
      },
    ],
    addOns: [
      {
        key: "cod",
        label: "COD",
        notes: "Thu ho tien khi giao hang",
        appliesToMainGroups: ["delivery"],
      },
      {
        key: "insurance",
        label: "Bao hiem hang hoa",
        notes: "Bao ve don hang gia tri cao",
        appliesToMainGroups: ["delivery"],
      },
    ],
    serviceTypes: {
      slow: {
        label: "Giao cham",
        mainGroup: "delivery",
        speed: "slow",
      },
      standard: {
        label: "Giao tieu chuan",
        mainGroup: "delivery",
        speed: "standard",
      },
      fast: {
        label: "Giao nhanh",
        mainGroup: "delivery",
        speed: "fast",
      },
      express: {
        label: "Giao hoa toc",
        mainGroup: "delivery",
        speed: "express",
      },
      moving_house: {
        label: "Chuyen nha",
        mainGroup: "moving",
        subtype: "house",
      },
      moving_office: {
        label: "Chuyen van phong",
        mainGroup: "moving",
        subtype: "office",
      },
      moving_warehouse: {
        label: "Chuyen kho bai",
        mainGroup: "moving",
        subtype: "warehouse",
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

  function isMovingService(typeKey) {
    return getMainGroupKey(typeKey) === "moving";
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
    isMovingService,
    isDeliveryLikeService,
    getAddOnsForType,
    orderDeliveryTypes,
  };
})(window);
