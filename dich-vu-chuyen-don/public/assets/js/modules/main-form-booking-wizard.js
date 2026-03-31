(function (window) {
  if (window.FastGoBookingWizard) return;

  function getBookingStepPanels(scope) {
    return Array.from(scope.querySelectorAll("[data-booking-step]"));
  }

  function getBookingCurrentStep(scope) {
    const activePanel = getBookingStepPanels(scope).find((panel) => !panel.hidden);
    return Number(activePanel?.getAttribute("data-booking-step") || 1);
  }

  function clearValidationErrorState(target) {
    if (!target) return;
    target.classList.remove("input-error");
    target.removeAttribute("aria-invalid");
    const errorId = target.getAttribute("data-error-id");
    if (!errorId) return;

    const current = String(target.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token !== errorId);

    if (current.length) {
      target.setAttribute("aria-describedby", current.join(" "));
    } else {
      target.removeAttribute("aria-describedby");
    }

    target.removeAttribute("data-error-id");
  }

  function validateBookingStep(scope, stepNumber, deps) {
    const { isVisibleFormField, isValidVietnamesePhone } = deps;
    const panel = scope.querySelector(`[data-booking-step="${stepNumber}"]`);
    if (!panel) return true;

    panel.querySelectorAll(".input-error").forEach((el) => clearValidationErrorState(el));
    panel.querySelectorAll(".field-error-msg").forEach((el) => el.remove());

    let isValid = true;
    let firstErrorField = null;

    const markError = (field, message) => {
      if (!field) return;
      isValid = false;
      field.classList.add("input-error");
      field.setAttribute("aria-invalid", "true");

      const group = field.closest(".nhom-truong") || field.parentElement;
      let errorEl = group.querySelector(".field-error-msg");
      if (!errorEl) {
        errorEl = document.createElement("span");
        errorEl.className = "field-error-msg";
        errorEl.setAttribute("role", "alert");
        errorEl.setAttribute("aria-live", "assertive");
        field.insertAdjacentElement("afterend", errorEl);
      }

      if (!errorEl.id) {
        errorEl.id =
          field.id
            ? `${field.id}-error`
            : `booking-field-error-${stepNumber}-${group.children.length}`;
      }

      errorEl.textContent = `Lỗi: ${message}`;
      field.setAttribute("data-error-id", errorEl.id);

      const describedBy = String(field.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean);
      if (!describedBy.includes(errorEl.id)) {
        describedBy.push(errorEl.id);
        field.setAttribute("aria-describedby", describedBy.join(" "));
      }

      if (!firstErrorField) firstErrorField = field;
    };

    const markMapError = (message) => {
      isValid = false;
      const mapBtn = panel.querySelector(".nut-ban-do-ui-vi-tri");
      if (!mapBtn) return;

      mapBtn.classList.add("input-error");
      mapBtn.setAttribute("aria-invalid", "true");
      let errorEl = mapBtn.parentElement.querySelector(".field-error-msg");
      if (!errorEl) {
        errorEl = document.createElement("span");
        errorEl.className = "field-error-msg";
        errorEl.setAttribute("role", "alert");
        errorEl.setAttribute("aria-live", "assertive");
        mapBtn.insertAdjacentElement("afterend", errorEl);
      }

      if (!errorEl.id) {
        errorEl.id = "booking-map-error";
      }

      errorEl.textContent = `Lỗi: ${message}`;
      mapBtn.setAttribute("data-error-id", errorEl.id);
      mapBtn.setAttribute("aria-describedby", errorEl.id);
      if (!firstErrorField) firstErrorField = mapBtn;
    };

    const fields = panel.querySelectorAll("input, select, textarea");
    for (const field of fields) {
      if (!isVisibleFormField(field)) continue;

      if (field.hasAttribute("required") && !field.value.trim()) {
        const labelText =
          field
            .closest(".nhom-truong")
            ?.querySelector(".nhan-truong")
            ?.textContent.replace("*", "")
            .trim() || "Trường này";
        markError(field, `Vui lòng nhập/chọn ${labelText.toLowerCase()}`);
      } else if (field.type === "tel" && field.value.trim()) {
        if (!isValidVietnamesePhone(field.value)) {
          markError(field, "Số điện thoại không hợp lệ (cần đủ 10 số)");
        }
      }
    }

    if (stepNumber === 1) {
      const fromAddr = panel.querySelector("#dia-chi-di-dat-lich")?.value.trim();
      const toAddr = panel.querySelector("#dia-chi-den-dat-lich")?.value.trim();

      if (fromAddr && toAddr && fromAddr.toLowerCase() === toAddr.toLowerCase()) {
        markError(
          panel.querySelector("#dia-chi-den-dat-lich"),
          "Điểm đến không được trùng với điểm đi.",
        );
      }

      const latFrom = scope.querySelector('input[name="vi_tri_diem_di_lat"]')?.value;
      const latTo = scope.querySelector('input[name="vi_tri_diem_den_lat"]')?.value;

      if (!latFrom || !latTo) {
        markMapError("Vui lòng lấy vị trí hoặc kéo ghim trên bản đồ để tính khoảng cách.");
      }
    }

    if (stepNumber === 2) {
      const dateField = panel.querySelector("#ngay-thuc-hien-dat-lich");
      if (dateField && dateField.value) {
        const selectedDate = new Date(dateField.value);
        selectedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          markError(dateField, "Ngày thực hiện không được ở trong quá khứ.");
        }
      }
    }

    if (!isValid && firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof firstErrorField.focus === "function") {
        firstErrorField.focus({ preventScroll: true });
      }
    }

    return isValid;
  }

  function updateBookingStepIndicator(scope, currentStep) {
    scope
      .querySelectorAll("[data-booking-step-indicator-item]")
      .forEach((item) => {
        const step = Number(item.getAttribute("data-booking-step-indicator-item") || 0);
        const stepLabel = String(item.getAttribute("data-booking-step-label") || "").trim();
        item.classList.toggle("is-active", step === currentStep);
        item.classList.toggle("is-completed", step < currentStep);
        if (step === currentStep) {
          item.setAttribute("aria-current", "step");
        } else {
          item.removeAttribute("aria-current");
        }
        item.setAttribute(
          "aria-label",
          stepLabel ? `Bước ${step}: ${stepLabel}` : `Bước ${step}`,
        );
      });

    const finalActions = scope.querySelector("[data-booking-final-actions]");
    if (finalActions) {
      finalActions.hidden = currentStep !== 5;
    }
  }

  function goToBookingStep(scope, targetStep, deps, options = {}) {
    const {
      renderFormSummaries,
      renderBookingMediaReview,
      renderBookingPricing,
    } = deps;
    const panels = getBookingStepPanels(scope);
    if (!panels.length) return;

    const maxStep = panels.length;
    const nextStep = Math.min(Math.max(Number(targetStep || 1), 1), maxStep);
    const currentStep = getBookingCurrentStep(scope);

    if (!options.force && nextStep > currentStep) {
      for (let step = currentStep; step < nextStep; step += 1) {
        if (!validateBookingStep(scope, step, deps)) return;
      }
    }

    panels.forEach((panel) => {
      const step = Number(panel.getAttribute("data-booking-step") || 0);
      const isActive = step === nextStep;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });

    updateBookingStepIndicator(scope, nextStep);

    if (nextStep === 5) {
      renderFormSummaries(scope);
      renderBookingMediaReview(scope);
      renderBookingPricing(scope);
    }

    if (nextStep === 1 && scope.__bookingMapState?.map) {
      const refreshMapLayout = function () {
        scope.__bookingMapState.map.invalidateSize();
        scope.__bookingMapState.updateMapBounds?.();
      };
      refreshMapLayout();
      window.requestAnimationFrame(refreshMapLayout);
    }

    const activePanel = scope.querySelector(`[data-booking-step="${nextStep}"]`);
    activePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function init(scope, deps) {
    if (!scope.querySelector("[data-booking-step]")) return;

    scope.querySelectorAll("[data-booking-step-next]").forEach((button) => {
      button.addEventListener("click", function () {
        const nextStep = Number(button.getAttribute("data-booking-step-next") || 0);
        if (nextStep) {
          goToBookingStep(scope, nextStep, deps);
        }
      });
    });

    scope.querySelectorAll("[data-booking-step-prev]").forEach((button) => {
      button.addEventListener("click", function () {
        const previousStep = Number(button.getAttribute("data-booking-step-prev") || 0);
        if (previousStep) {
          goToBookingStep(scope, previousStep, deps, { force: true });
        }
      });
    });

    scope.querySelectorAll("[data-booking-step-indicator-item]").forEach((button) => {
      button.addEventListener("click", function () {
        const targetStep = Number(
          button.getAttribute("data-booking-step-indicator-item") || 0,
        );
        if (!targetStep) return;

        const currentStep = getBookingCurrentStep(scope);
        if (targetStep <= currentStep) {
          goToBookingStep(scope, targetStep, deps, { force: true });
        }
      });
    });

    goToBookingStep(scope, 1, deps, { force: true });
  }

  window.FastGoBookingWizard = { init };
})(window);
