(function (window, document) {
  "use strict";

  // Feedback UI dùng chung cho lưu KRUD/export JSON: toast nhanh, toast dài, và progress toast.
  let progressContainer = null;
  let progressToast = null;

  function showAlert(type, message, options = {}) {
    const durationMs = Number(options.durationMs || 0);
    if (!durationMs && window.core && typeof window.core.notify === "function") {
      window.core.notify(message, type);
      return;
    }
    if (durationMs > 0) {
      let container = document.querySelector(".core-toast-container");
      if (!container) {
        container = document.createElement("div");
        container.className = "core-toast-container";
        document.body.appendChild(container);
      }

      const iconByType = {
        error: "fa-circle-xmark",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info",
        success: "fa-check-circle",
      };
      const toast = document.createElement("div");
      toast.className = `core-toast ${type}`;

      const icon = document.createElement("div");
      icon.className = "core-toast-icon";
      icon.innerHTML = `<i class="fa-solid ${iconByType[type] || iconByType.success}"></i>`;

      const content = document.createElement("div");
      content.className = "core-toast-message";
      content.textContent = message;

      toast.append(icon, content);
      container.appendChild(toast);
      setTimeout(() => toast.classList.add("show"), 10);
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
      }, durationMs);
      return;
    }

    console.log(`[Pricing Alert ${type}]: ${message}`);
  }

  function showProgress(message) {
    if (!progressContainer) {
      progressContainer = document.querySelector(".core-toast-container");
      if (!progressContainer) {
        progressContainer = document.createElement("div");
        progressContainer.className = "core-toast-container";
        document.body.appendChild(progressContainer);
      }
    }

    if (!progressToast) {
      progressToast = document.createElement("div");
      progressToast.className = "core-toast info";
      progressToast.innerHTML = `
        <div class="core-toast-icon"><i class="fa-solid fa-circle-info"></i></div>
        <div class="core-toast-message"></div>
      `;
      progressContainer.appendChild(progressToast);
      window.setTimeout(() => {
        progressToast?.classList.add("show");
      }, 10);
    }

    const messageNode = progressToast.querySelector(".core-toast-message");
    if (messageNode) {
      messageNode.textContent = message;
    }
  }

  function hideProgress() {
    if (!progressToast) return;
    progressToast.classList.remove("show");
    const toastToRemove = progressToast;
    progressToast = null;
    window.setTimeout(() => {
      toastToRemove.remove();
      if (
        progressContainer &&
        !progressContainer.querySelector(".core-toast")
      ) {
        progressContainer.remove();
        progressContainer = null;
      }
    }, 300);
  }

  window.GHNAdminPricingFeedback = {
    showAlert,
    showProgress,
    hideProgress,
  };
})(window, document);
