const storageKeys = {
  role: "fastgo-auth-role",
  identity: "fastgo-auth-identity",
};
const authChangeEventName = "fastgo:auth-changed";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function notifyAuthSessionChanged() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(authChangeEventName, {
      detail: {
        role: readStoredRole(),
        identity: readStoredIdentity(),
      },
    }),
  );
}

function normalizeStoredIdentity(payload) {
  if (!payload || typeof payload !== "object") return {};

  return {
    id: normalizeText(payload.id || ""),
    role: normalizeText(payload.role || "").toLowerCase(),
    hovaten: normalizeText(payload.hovaten || ""),
    email: normalizeText(payload.email || "").toLowerCase(),
    sodienthoai: normalizeText(payload.sodienthoai || ""),
    id_dichvu: normalizeText(payload.id_dichvu || "0") || "0",
    trangthai: normalizeText(payload.trangthai || "active"),
  };
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("Cannot parse stored payload:", error);
    return fallback;
  }
}

function readStorageJson(key, fallback) {
  try {
    return safeParse(window.localStorage.getItem(key), fallback);
  } catch (error) {
    console.error("Cannot read stored payload:", error);
    return fallback;
  }
}

function writeStorageJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Cannot write stored payload:", error);
    return false;
  }
}

function readStoredIdentity() {
  return normalizeStoredIdentity(readStorageJson(storageKeys.identity, {}));
}

function writeStoredIdentity(value) {
  const isSuccess = writeStorageJson(
    storageKeys.identity,
    normalizeStoredIdentity(value),
  );
  if (isSuccess) notifyAuthSessionChanged();
  return isSuccess;
}

function saveStoredIdentity(payload) {
  const current = readStoredIdentity();
  const nextIdentity = normalizeStoredIdentity({
    ...current,
    ...(payload && typeof payload === "object" ? payload : {}),
  });
  writeStoredIdentity(nextIdentity);
  return nextIdentity;
}

function readStoredRole() {
  try {
    return String(window.localStorage.getItem(storageKeys.role) || "").trim();
  } catch (error) {
    console.error("Cannot access saved role:", error);
    return "";
  }
}

function writeStoredRole(role) {
  try {
    window.localStorage.setItem(storageKeys.role, String(role || "").trim());
    notifyAuthSessionChanged();
    return true;
  } catch (error) {
    console.error("Cannot persist auth role:", error);
    return false;
  }
}

function clearStoredAuthSession() {
  try {
    window.localStorage.removeItem(storageKeys.identity);
    window.localStorage.removeItem(storageKeys.role);
    notifyAuthSessionChanged();
  } catch (error) {
    console.error("Cannot clear local session:", error);
  }
}

export {
  authChangeEventName,
  clearStoredAuthSession,
  normalizeStoredIdentity,
  notifyAuthSessionChanged,
  readStorageJson,
  readStoredIdentity,
  readStoredRole,
  safeParse,
  saveStoredIdentity,
  storageKeys,
  writeStorageJson,
  writeStoredIdentity,
  writeStoredRole,
};
