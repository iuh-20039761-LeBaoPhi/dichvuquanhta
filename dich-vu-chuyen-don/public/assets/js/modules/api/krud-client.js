function buildListPayload(payload) {
  return {
    p: payload.page || 1,
    limit: payload.limit || 300,
    where: payload.where,
    sort: payload.sort,
  };
}

function getKrudListFn() {
  if (typeof window.krudList === "function") {
    return (payload) => window.krudList(payload);
  }

  if (typeof window.crud === "function") {
    return (payload) => window.crud("list", payload.table, buildListPayload(payload));
  }

  if (typeof window.krud === "function") {
    return (payload) => window.krud("list", payload.table, buildListPayload(payload));
  }

  return null;
}

function getKrudInsertFn() {
  if (typeof window.crud === "function") {
    return (tableName, data) => window.crud("insert", tableName, data);
  }

  if (typeof window.krud === "function") {
    return (tableName, data) => window.krud("insert", tableName, data);
  }

  return null;
}

function getKrudUpdateFn() {
  if (typeof window.crud === "function") {
    return (tableName, data) => window.crud("update", tableName, data);
  }

  if (typeof window.krud === "function") {
    return (tableName, data) => window.krud("update", tableName, data);
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

export { extractRows, getKrudInsertFn, getKrudListFn, getKrudUpdateFn };
