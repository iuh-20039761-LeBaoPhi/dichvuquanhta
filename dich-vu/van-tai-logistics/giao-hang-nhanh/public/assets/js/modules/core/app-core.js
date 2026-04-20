/**
 * Core utility functions for Giao hàng nhanh Portal & Admin
 * Standardized across GlobalCare system
 */
const core = {
  /**
   * Hiển thị thông báo Toast hiện đại
   */
  notify: (message, type = "success") => {
    let container = document.querySelector(".core-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "core-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `core-toast ${type}`;
    
    let icon = "fa-check-circle";
    if (type === "error") icon = "fa-circle-xmark";
    if (type === "warning") icon = "fa-triangle-exclamation";
    if (type === "info") icon = "fa-circle-info";

    toast.innerHTML = `
      <div class="core-toast-icon"><i class="fa-solid ${icon}"></i></div>
      <div class="core-toast-message">${message}</div>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add("show"), 10);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  },

  /**
   * Hiển thị Modal xác nhận cao cấp (Promise-based)
   */
  confirm: (options = {}) => {
    return new Promise((resolve) => {
      const { 
        title = "Xác nhận", 
        message = "Bạn có chắc chắn muốn thực hiện hành động này?",
        confirmText = "Xác nhận",
        cancelText = "Hủy bỏ",
        type = "primary" // primary, danger
      } = options;

      const overlay = document.createElement("div");
      overlay.className = "core-modal-overlay";
      
      overlay.innerHTML = `
        <div class="core-modal-card">
          <div class="core-modal-icon ${type === "danger" ? "danger" : ""}">
            <i class="fa-solid ${type === "danger" ? "fa-trash-can" : "fa-circle-question"}"></i>
          </div>
          <div class="core-modal-title">${title}</div>
          <div class="core-modal-body">${message}</div>
          <div class="core-modal-footer">
            <button class="core-modal-btn core-modal-btn-secondary" data-action="cancel">${cancelText}</button>
            <button class="core-modal-btn core-modal-btn-${type === "danger" ? "danger" : "primary"}" data-action="confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      
      // Animation
      setTimeout(() => overlay.classList.add("show"), 10);

      const handleAction = (val) => {
        overlay.classList.remove("show");
        setTimeout(() => {
          overlay.remove();
          resolve(val);
        }, 300);
      };

      overlay.querySelector('[data-action="confirm"]').onclick = () => handleAction(true);
      overlay.querySelector('[data-action="cancel"]').onclick = () => handleAction(false);
      overlay.onclick = (e) => { if (e.target === overlay) handleAction(false); };
    });
  }
};

window.core = core;
