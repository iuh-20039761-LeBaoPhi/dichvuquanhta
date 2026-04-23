const storageKeys = {
  role: "fastgo-auth-role",
  identity: "fastgo-auth-identity",
  access: "fastgo-auth-access",
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
        access: readStoredAccess(),
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
    diachi: normalizeText(payload.diachi || payload.dia_chi || payload.address || ""),
    id_dichvu: normalizeText(payload.id_dichvu || "0") || "0",
    trangthai: normalizeText(payload.trangthai || "active"),
    link_avatar: normalizeText(payload.link_avatar || payload.avatar_link || ""),
    link_cccd_truoc: normalizeText(
      payload.link_cccd_truoc || payload.cccd_front_link || "",
    ),
    link_cccd_sau: normalizeText(
      payload.link_cccd_sau || payload.cccd_back_link || "",
    ),
    ten_cong_ty: normalizeText(payload.ten_cong_ty || payload.company_name || ""),
    ma_so_thue: normalizeText(payload.ma_so_thue || payload.tax_code || ""),
    dia_chi_doanh_nghiep: normalizeText(
      payload.dia_chi_doanh_nghiep || payload.diachidonvi || "",
    ),
    loai_phuong_tien: normalizeText(
      payload.loai_phuong_tien || payload.vehicle_type || "",
    ),
  };
}

function normalizeStoredAccess(payload) {
  if (!payload || typeof payload !== "object") return {};

  const loginIdentifier = normalizeText(
    payload.loginIdentifier || payload.username || payload.sodienthoai || "",
  );
  const password = String(payload.password || "").trim();

  return {
    loginIdentifier,
    // Giữ alias cũ để tương thích với dữ liệu localStorage/cookie hiện có.
    username: loginIdentifier,
    password,
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

function writeCookie(name, value, days = 7) {
  try {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${String(name || "").trim()}=${encodeURIComponent(String(value || ""))}; expires=${expires.toUTCString()}; path=/`;
    return true;
  } catch (error) {
    console.error("Cannot write auth cookie:", error);
    return false;
  }
}

function clearCookie(name) {
  try {
    document.cookie = `${String(name || "").trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    return true;
  } catch (error) {
    console.error("Cannot clear auth cookie:", error);
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

function readStoredAccess() {
  return normalizeStoredAccess(readStorageJson(storageKeys.access, {}));
}

function writeStoredAccess(value) {
  const normalizedValue = normalizeStoredAccess(value);
  const isSuccess = writeStorageJson(storageKeys.access, normalizedValue);

  if (normalizedValue.loginIdentifier && normalizedValue.password) {
    writeCookie("dvqt_u", normalizedValue.loginIdentifier);
    writeCookie("dvqt_p", normalizedValue.password);
  } else {
    clearCookie("dvqt_u");
    clearCookie("dvqt_p");
  }

  if (isSuccess) notifyAuthSessionChanged();
  return isSuccess;
}

function saveStoredAccess(payload) {
  const current = readStoredAccess();
  const nextAccess = normalizeStoredAccess({
    ...current,
    ...(payload && typeof payload === "object" ? payload : {}),
  });
  writeStoredAccess(nextAccess);
  return nextAccess;
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
    window.localStorage.removeItem(storageKeys.access);
    clearCookie("dvqt_u");
    clearCookie("dvqt_p");
    notifyAuthSessionChanged();
  } catch (error) {
    console.error("Cannot clear local session:", error);
  }
}

export {
  authChangeEventName,
  clearStoredAuthSession,
  normalizeStoredIdentity,
  normalizeStoredAccess,
  notifyAuthSessionChanged,
  readStoredAccess,
  readStorageJson,
  readStoredIdentity,
  readStoredRole,
  safeParse,
  saveStoredAccess,
  saveStoredIdentity,
  storageKeys,
  writeStoredAccess,
  writeStorageJson,
  writeStoredIdentity,
  writeStoredRole,
};
