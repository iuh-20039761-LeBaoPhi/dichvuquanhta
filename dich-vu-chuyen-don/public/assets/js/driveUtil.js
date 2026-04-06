const SHEET_API_URL =
  window.DICH_VU_CHUYEN_DON_SHEET_API_URL ||
  "https://script.google.com/macros/s/AKfycbxnkPNuiUNP_ayPThPDzKGKlnj72BY_yHntDUfKP0C5ZVvk0EGHRqcDiYpXgys0P8IxPQ/exec";

function toSafeSheetString(value) {
  return (value == null ? "" : String(value)).trim();
}

async function postToAppsScript(data, contentType) {
  if (!toSafeSheetString(SHEET_API_URL)) {
    throw new Error("Chưa cấu hình SHEET_API_URL cho Dịch vụ Chuyển Dọn.");
  }

  const response = await fetch(SHEET_API_URL, {
    method: "POST",
    mode: "cors",
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

window.saveToGoogleSheet = saveToGoogleSheet;
