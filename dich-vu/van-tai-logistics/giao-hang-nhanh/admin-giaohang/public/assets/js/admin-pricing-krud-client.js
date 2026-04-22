(function (window) {
  "use strict";

  // Adapter gom khác biệt giữa crud/krud globals để file lưu bảng giá chỉ gọi một API thống nhất.
  function getInsertFn() {
    if (typeof window.crud === "function") {
      return (tableName, data) => window.crud("insert", tableName, data);
    }
    if (typeof window.krud === "function") {
      return (tableName, data) => window.krud("insert", tableName, data);
    }
    return null;
  }

  function getUpdateFn() {
    if (typeof window.crud === "function") {
      return (tableName, data, id) => window.crud("update", tableName, data, id);
    }
    if (typeof window.krud === "function") {
      return (tableName, data, id) => window.krud("update", tableName, data, id);
    }
    return null;
  }

  function getListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }
    if (typeof window.crud === "function") {
      return (payload) => {
        const options = {
          ...payload,
          p: payload.page || payload.p || 1,
          limit: payload.limit || 100,
        };
        delete options.table;
        delete options.page;
        return window.crud("list", payload.table, options);
      };
    }
    if (typeof window.krud === "function") {
      return (payload) => {
        const options = {
          ...payload,
          p: payload.page || payload.p || 1,
          limit: payload.limit || 100,
        };
        delete options.table;
        delete options.page;
        return window.krud("list", payload.table, options);
      };
    }
    return null;
  }

  function getDeleteFn() {
    if (typeof window.crud === "function") {
      return (tableName, id) => window.crud("delete", tableName, { id });
    }
    if (typeof window.krud === "function") {
      return (tableName, id) => window.krud("delete", tableName, { id });
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

  function chunkArray(list, size) {
    const result = [];
    for (let i = 0; i < list.length; i += size) {
      result.push(list.slice(i, i + size));
    }
    return result;
  }

  async function runWithConcurrency(tasks, limit) {
    const results = [];
    let index = 0;
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (index < tasks.length) {
        const current = index;
        index += 1;
        results[current] = await tasks[current]();
      }
    });
    await Promise.all(workers);
    return results;
  }

  window.GHNAdminPricingKrudClient = {
    getInsertFn,
    getUpdateFn,
    getListFn,
    getDeleteFn,
    extractRows,
    chunkArray,
    runWithConcurrency,
  };
})(window);
