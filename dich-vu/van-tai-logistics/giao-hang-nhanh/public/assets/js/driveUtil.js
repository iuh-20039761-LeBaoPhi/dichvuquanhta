const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbxLZ5eeWkPh2N1d0CbhOxeaKu1j-M3G-Gvxv3Aa9iVpZnLh4O6FF7WWt7S9sUAIZuLO/exec";

function resolveSheetProxyUrl() {
  const override = toSafeSheetString(window.GIAO_HANG_NHANH_SHEET_API_URL);
  if (override) return override;

  if (toSafeSheetString(SHEET_API_URL)) {
    return SHEET_API_URL;
  }

  const publicBasePath = window.GiaoHangNhanhCore?.publicBasePath;
  if (toSafeSheetString(publicBasePath)) {
    return new URL(
      "save_to_google_sheet.php",
      `${window.location.origin}${publicBasePath}`,
    ).toString();
  }

  const path = String(window.location.pathname || "").replace(/\\/g, "/");
  const marker = "/giao-hang-nhanh/";
  const markerIndex = path.toLowerCase().lastIndexOf(marker);
  const projectBasePath =
    markerIndex !== -1 ? path.slice(0, markerIndex + marker.length) : "/";

  return new URL(
    "public/save_to_google_sheet.php",
    `${window.location.origin}${projectBasePath}`,
  ).toString();
}

function toSafeSheetString(value) {
  return (value == null ? "" : String(value)).trim();
}

async function postToAppsScript(data, contentType) {
  const sheetApiUrl = resolveSheetProxyUrl();
  if (!toSafeSheetString(sheetApiUrl)) {
    throw new Error("Chưa cấu hình SHEET_API_URL cho Giao Hàng Nhanh.");
  }

  const response = await fetch(sheetApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status + " khi gửi dữ liệu.");
  }

  const rawText = await response.text();
  if (!rawText) return { status: "success" };

  try {
    return JSON.parse(rawText);
  } catch (parseErr) {
    throw new Error("Phản hồi không phải JSON hợp lệ từ Apps Script.");
  }
}

async function saveToGoogleSheet(sheetData) {
  if (!sheetData || typeof sheetData !== "object" || Array.isArray(sheetData)) {
    throw new Error("Dữ liệu gửi sheet không hợp lệ.");
  }

  const data = Object.assign({}, sheetData);
  data.sheet_type = toSafeSheetString(data.sheet_type);

  if (!data.sheet_type) {
    throw new Error("Thiếu trường sheet_type.");
  }

  try {
    try {
      return await postToAppsScript(data, "application/json");
    } catch (firstErr) {
      return await postToAppsScript(data, "text/plain;charset=utf-8");
    }
  } catch (error) {
    console.error("Lỗi gửi Google Sheet:", error);
    throw error;
  }
}
