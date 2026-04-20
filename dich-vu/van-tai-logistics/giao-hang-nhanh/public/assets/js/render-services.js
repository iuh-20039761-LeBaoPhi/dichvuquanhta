document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("danhsachdichvucontainer");
  if (!container) return;

  const dataUrl = "public/data/dsdichvugiaohang.json";
  const bookingUrl = "dat-lich-giao-hang-nhanh.html";
  const pricingUrl = "tra-cuu-gia-giaohang.html";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderDetailRow(label, value) {
    return `
      <li>
        <strong>${escapeHtml(label)}:</strong>
        <span>${escapeHtml(value)}</span>
      </li>
    `;
  }

  function createServiceCard(service, isFeatured) {
    const article = document.createElement("article");
    article.className = isFeatured
      ? "service-card service-card--featured"
      : "service-card";

    const outlineBtnStyle = isFeatured
      ? ' style="border-color: #fff; color: #fff; background: transparent"'
      : "";

    article.innerHTML = `
      <div class="service-card-head">
        <div class="service-card-icon">${escapeHtml(service.bieutuong)}</div>
        <h3>${escapeHtml(service.ten)}</h3>
      </div>
      <p class="service-card-slogan">"${escapeHtml(service.khauhieu)}"</p>
      <ul class="service-card-details">
        ${renderDetailRow("Phạm vi", service.phamvi)}
        ${renderDetailRow("Ưu tiên", service.uutien)}
        ${renderDetailRow("Phù hợp", service.phuhopcho)}
      </ul>
      <div class="service-card-actions">
        <a href="${bookingUrl}" class="service-action-btn service-action-primary">Đặt đơn ngay</a>
        <a href="${pricingUrl}" class="service-action-btn service-action-outline"${outlineBtnStyle}>Tính cước ngay</a>
      </div>
    `;

    return article;
  }

  try {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Không thể tải file JSON: ${response.status}`);
    }

    const services = await response.json();
    if (!Array.isArray(services)) {
      throw new Error("Dữ liệu danh sách dịch vụ không hợp lệ.");
    }

    const fragment = document.createDocumentFragment();
    services.forEach((service, index) => {
      fragment.appendChild(createServiceCard(service, index === 0));
    });

    container.replaceChildren(fragment);
  } catch (error) {
    console.error("Lỗi khi xử lý render dịch vụ:", error);
    container.innerHTML =
      '<p class="text-danger">Không thể tải danh sách dịch vụ. Vui lòng thử lại sau.</p>';
  }
});
