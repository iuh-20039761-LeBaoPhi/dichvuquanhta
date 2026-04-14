const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbx7-qVVht3BnLcMD978sw9oDY14BtnqYZZ2M1Ues9BPny0n_eu10lxPmiMA6X--2_GEtA/exec";

function toSafeString(value) {
  return (value == null ? "" : String(value)).trim();
}

async function postToAppsScript(data, contentType) {
  var response = await fetch(SHEET_API_URL, {
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

  var rawText = await response.text();
  if (!rawText) return { status: "success" };

  try {
    return JSON.parse(rawText);
  } catch (parseErr) {
    throw new Error("Phản hồi không phải JSON hợp lệ từ Apps Script.");
  }
}

// Hàm dùng chung: nhận payload bất kỳ miễn có sheet_type.
async function saveToGoogleSheet(sheetData) {
  if (!sheetData || typeof sheetData !== "object" || Array.isArray(sheetData)) {
    throw new Error("Dữ liệu gửi sheet không hợp lệ.");
  }

  const data = Object.assign({}, sheetData);
  data.sheet_type = toSafeString(data.sheet_type);

  if (!data.sheet_type) throw new Error("Thiếu trường sheet_type.");

  try {
    try {
      return await postToAppsScript(data, "application/json");
    } catch (firstErr) {
      // fallback kiểu simple request để tránh lỗi preflight trên một số cấu hình Web App
      return await postToAppsScript(data, "text/plain;charset=utf-8");
    }
  } catch (err) {
    console.error("Lỗi gửi Google Sheet:", err);
    throw err;
  }
}
