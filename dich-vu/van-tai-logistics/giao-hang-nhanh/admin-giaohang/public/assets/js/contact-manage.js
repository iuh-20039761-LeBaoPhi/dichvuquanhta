(function (window, document) {
  if (window.__ghnContactManageInitDone) return;
  window.__ghnContactManageInitDone = true;

  const CONTACT_TABLE = "lien_he";
  const pageEl = document.getElementById("contact-manage-page");
  const filterStatus = pageEl ? String(pageEl.dataset.filterStatus || "all") : "all";
  const statusMap = {
    0: { text: "Mới nhận", className: "pending", icon: "fa-envelope-dot" },
    1: { text: "Đang xử lý", className: "shipping", icon: "fa-spinner" },
    2: { text: "Đã giải quyết", className: "completed", icon: "fa-check-double" },
  };

  const listEl = document.getElementById("contact-list");
  const summaryEl = document.getElementById("contact-summary");
  const emptyEl = document.getElementById("contact-empty");
  const runtimeEl = document.getElementById("contact-runtime-message");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showRuntimeMessage(type, message) {
    runtimeEl.className = `pricing-alert contact-runtime-message pricing-alert--${type}`;
    runtimeEl.innerHTML = `<i class="fa-solid ${
      type === "success" ? "fa-circle-check" : "fa-circle-exclamation"
    }"></i> ${escapeHtml(message)}`;
    runtimeEl.style.display = "block";
  }

  function hideRuntimeMessage() {
    runtimeEl.style.display = "none";
    runtimeEl.innerHTML = "";
  }

  function getListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }
    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }
    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
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

  function renderSummary(summary) {
    const cards = [
      { label: "Tổng", value: summary.all || 0 },
      { label: "Mới nhận", value: summary["0"] || 0 },
      { label: "Đang xử lý", value: summary["1"] || 0 },
      { label: "Đã giải quyết", value: summary["2"] || 0 },
    ];
    summaryEl.innerHTML = cards
      .map(
        (item) => `
          <div class="contact-summary-card">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
          </div>
      `,
      )
      .join("");
  }

  function renderCard(item) {
    const statusValue = Number(item.status || 0);
    const statusMeta = statusMap[statusValue] || statusMap[0];
    return `
      <article class="message-card status-${statusValue}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px;">
          <div style="flex:1;">
            <div class="contact-meta-list">
              <span class="status-badge status-${statusMeta.className}" style="font-size: 11px;">
                <i class="fa-solid ${statusMeta.icon}"></i> ${escapeHtml(statusMeta.text)}
              </span>
              <span><i class="fa-regular fa-clock"></i> ${escapeHtml(item.created_at || "")}</span>
            </div>
            <h3 style="font-size:18px; color:#0a2a66; margin-bottom:5px;">${escapeHtml(
              item.subject || "(Không có tiêu đề)",
            )}</h3>
            <div style="font-size:14px; margin-bottom:15px;">
              <strong style="color:#334155;">${escapeHtml(item.name || "Khách hàng")}</strong>
              <span style="color:#94a3b8; font-size:12px; margin-left:5px;">&lt;${escapeHtml(
                item.email || "",
              )}&gt;</span>
              <span style="color:#94a3b8; font-size:12px; margin-left:12px;">${escapeHtml(
                item.phone || "",
              )}</span>
            </div>
            <div class="contact-message-body">${escapeHtml(item.message || "")}</div>
            <form method="post" class="contact-card-form" data-contact-update-form>
              <input type="hidden" name="id" value="${escapeHtml(item.id)}">
              <div class="grid-responsive">
                <div class="form-group">
                  <label>Ghi chú phản hồi / Xử lý</label>
                  <textarea name="note_admin" class="admin-input" rows="2" placeholder="Ghi lại nội dung đã phản hồi cho khách...">${escapeHtml(
                    item.note_admin || "",
                  )}</textarea>
                </div>
                <div class="form-group">
                  <label>Trạng thái</label>
                  <select name="status" class="admin-select">
                    <option value="0" ${statusValue === 0 ? "selected" : ""}>🆕 Mới nhận</option>
                    <option value="1" ${statusValue === 1 ? "selected" : ""}>⏳ Đang xử lý</option>
                    <option value="2" ${statusValue === 2 ? "selected" : ""}>✅ Đã giải quyết</option>
                  </select>
                  <button
                    type="submit"
                    name="update_status"
                    class="btn-primary"
                    style="width:100%; justify-content:center; margin-top:10px;"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </article>
    `;
  }

  async function loadContacts() {
    const listFn = getListFn();
    if (!listFn) {
      showRuntimeMessage("error", "Không tải được krud.js.");
      return;
    }

    listEl.innerHTML = "";
    emptyEl.hidden = true;
    showRuntimeMessage("success", "Đang tải dữ liệu liên hệ...");

    try {
      const where =
        filterStatus === "all"
          ? []
          : [{ field: "status", operator: "=", value: Number(filterStatus) }];
      const payload = await listFn({
        table: CONTACT_TABLE,
        where,
        sort: { id: "desc" },
        page: 1,
        limit: 100,
      });
      const rows = extractRows(payload);
      const summary = { all: rows.length, 0: 0, 1: 0, 2: 0 };
      rows.forEach((row) => {
        const statusValue = String(Number(row.status || 0));
        summary[statusValue] = (summary[statusValue] || 0) + 1;
      });
      renderSummary(summary);

      if (!rows.length) {
        emptyEl.hidden = false;
      } else {
        listEl.innerHTML = rows.map(renderCard).join("");
        listEl.querySelectorAll("form[data-contact-update-form]").forEach((form) => {
          form.addEventListener("submit", handleSubmit);
        });
      }

      hideRuntimeMessage();
    } catch (error) {
      renderSummary({ all: 0, 0: 0, 1: 0, 2: 0 });
      emptyEl.hidden = false;
      emptyEl.querySelector("p").textContent =
        error instanceof Error ? error.message : "Không tải được dữ liệu liên hệ.";
      showRuntimeMessage(
        "error",
        error instanceof Error ? error.message : "Không tải được dữ liệu liên hệ.",
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const updateFn = getUpdateFn();
    if (!updateFn) {
      showRuntimeMessage("error", "Không tải được hàm cập nhật KRUD.");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.innerText : "";
    const id = Number(form.querySelector('input[name="id"]')?.value || 0);
    const status = Number(form.querySelector('select[name="status"]')?.value || 0);
    const note = String(form.querySelector('textarea[name="note_admin"]')?.value || "").trim();

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerText = "Đang lưu...";
    }

    try {
      if (!id) {
        throw new Error("Thiếu id liên hệ.");
      }
      await updateFn(
        CONTACT_TABLE,
        {
          status,
          note_admin: note,
          updated_at: new Date().toISOString(),
        },
        id,
      );
      showRuntimeMessage("success", "Đã cập nhật trạng thái tin nhắn thành công.");
      await loadContacts();
    } catch (error) {
      showRuntimeMessage(
        "error",
        error instanceof Error ? error.message : "Không thể cập nhật liên hệ.",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = originalText;
      }
    }
  }

  loadContacts();
})(window, document);
