const BOOKING_SLOT_STARTS = {
    sang: { hour: 8, minute: 0, label: "buổi sáng" },
    chieu: { hour: 13, minute: 30, label: "buổi chiều" },
    toi: { hour: 17, minute: 0, label: "buổi tối" },
    dem: { hour: 21, minute: 0, label: "ca đêm" },
  };

  const FILE_VALIDATION_CONFIG = {
    "tep-anh-dat-lich": {
      kindLabel: "ảnh",
      allowedTypePrefix: "image/",
      maxFiles: 8,
      maxSizeBytes: 10 * 1024 * 1024,
    },
    "tep-video-dat-lich": {
      kindLabel: "video",
      allowedTypePrefix: "video/",
      maxFiles: 3,
      maxSizeBytes: 40 * 1024 * 1024,
    },
  };

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

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getFieldLabel(field) {
    return (
      field
        ?.closest(".nhom-truong")
        ?.querySelector(".nhan-truong")
        ?.textContent.replace("*", "")
        .trim() || "Trường này"
    );
  }

  function isSameCalendarDate(leftDate, rightDate) {
    return (
      leftDate.getFullYear() === rightDate.getFullYear() &&
      leftDate.getMonth() === rightDate.getMonth() &&
      leftDate.getDate() === rightDate.getDate()
    );
  }

  function getSlotStartDate(slotValue, baseDate) {
    const rawVal = String(slotValue || "").trim();
    if (!rawVal || !(baseDate instanceof Date) || Number.isNaN(baseDate.getTime())) {
      return null;
    }

    const slotDate = new Date(baseDate);
    const config = BOOKING_SLOT_STARTS[rawVal];
    if (config) {
      slotDate.setHours(config.hour, config.minute, 0, 0);
      return slotDate;
    }

    const timeMatch = rawVal.match(/^(\d{2}):(\d{2})/);
    if (timeMatch) {
      slotDate.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      return slotDate;
    }

    return null;
  }

  function getWeekdayLabel(date) {
    const weekday = Number(date?.getDay?.());
    if (weekday === 0) return "Chủ nhật";
    if (weekday === 6) return "Thứ bảy";
    return `Thứ ${weekday + 1}`;
  }

  function validateTextLength(field, markError, options = {}) {
    const value = normalizeText(field?.value);
    const config = options || {};
    if (!field || !value) return true;

    if (config.min && value.length < config.min) {
      markError(
        field,
        `${config.label || getFieldLabel(field)} cần từ ${config.min} ký tự trở lên.`,
      );
      return false;
    }

    if (config.max && value.length > config.max) {
      markError(
        field,
        `${config.label || getFieldLabel(field)} không được vượt quá ${config.max} ký tự.`,
      );
      return false;
    }

    return true;
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
        const labelText = getFieldLabel(field);
        markError(field, `Vui lòng nhập/chọn ${labelText.toLowerCase()}`);
      } else if (field.type === "tel" && field.value.trim()) {
        if (!isValidVietnamesePhone(field.value)) {
          markError(field, "Số điện thoại không hợp lệ (cần đủ 10 số)");
        }
      }
    }

    if (stepNumber === 1) {
      const serviceValue = String(
        panel.querySelector("#loai-dich-vu-dat-lich")?.value || "",
      ).trim();
      const contactField = panel.querySelector("#ho-ten-dat-lich");
      const companyField = panel.querySelector("#ten-cong-ty-dat-lich");
      const fromField = panel.querySelector("#dia-chi-di-dat-lich");
      const toField = panel.querySelector("#dia-chi-den-dat-lich");
      const fromAddr = normalizeText(fromField?.value);
      const toAddr = normalizeText(toField?.value);
      const companyValue = normalizeText(companyField?.value);
      const requiresCompany =
        serviceValue === "chuyen_van_phong" || serviceValue === "chuyen_kho_bai";

      validateTextLength(contactField, markError, {
        label: "Người liên hệ",
        min: 2,
        max: 80,
      });

      if (requiresCompany && !companyValue) {
        markError(
          companyField,
          serviceValue === "chuyen_van_phong"
            ? "Vui lòng nhập tên công ty để đặt lịch chuyển văn phòng."
            : "Vui lòng nhập tên kho hoặc đơn vị vận hành để đặt lịch chuyển kho bãi.",
        );
      } else {
        validateTextLength(companyField, markError, {
          label: getFieldLabel(companyField),
          min: 2,
          max: 120,
        });
      }

      validateTextLength(fromField, markError, {
        label: "Địa chỉ điểm đi",
        min: 8,
        max: 180,
      });
      validateTextLength(toField, markError, {
        label: "Địa chỉ điểm đến",
        min: 8,
        max: 180,
      });

      if (fromAddr && toAddr && fromAddr.toLowerCase() === toAddr.toLowerCase()) {
        markError(toField, "Điểm đến không được trùng với điểm đi.");
      }

      const latFrom = String(
        scope.querySelector('input[name="vi_tri_diem_di_lat"]')?.value || "",
      ).trim();
      const lngFrom = String(
        scope.querySelector('input[name="vi_tri_diem_di_lng"]')?.value || "",
      ).trim();
      const latTo = String(
        scope.querySelector('input[name="vi_tri_diem_den_lat"]')?.value || "",
      ).trim();
      const lngTo = String(
        scope.querySelector('input[name="vi_tri_diem_den_lng"]')?.value || "",
      ).trim();

      if (!latFrom || !lngFrom || !latTo || !lngTo) {
        markMapError("Vui lòng lấy vị trí hoặc kéo ghim trên bản đồ để tính khoảng cách.");
      } else if (latFrom === latTo && lngFrom === lngTo) {
        markMapError("Điểm đi và điểm đến đang trùng nhau trên bản đồ.");
      }
    }

    if (stepNumber === 2) {
      const dateField = panel.querySelector("#ngay-thuc-hien-dat-lich");
      const timeField = panel.querySelector("#khung-gio-dat-lich");
      const weekendCheckbox = panel.querySelector(
        "input[name='can_thuc_hien_cuoi_tuan']",
      );

      if (dateField && dateField.value) {
        const selectedDate = new Date(dateField.value);
        selectedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          markError(dateField, "Ngày thực hiện không được ở trong quá khứ.");
        }

        const slotStartDate = getSlotStartDate(timeField?.value, selectedDate);
        if (
          slotStartDate &&
          isSameCalendarDate(selectedDate, new Date()) &&
          slotStartDate.getTime() <= Date.now()
        ) {
          const rawVal = String(timeField?.value || "").trim();
          const slotConfig = BOOKING_SLOT_STARTS[rawVal];
          const label = slotConfig?.label ? `Khung giờ ${slotConfig.label}` : `Thời gian ${rawVal}`;
          markError(
            timeField,
            `${label} đã bắt đầu hoặc đã qua. Vui lòng chọn giờ khác.`,
          );
        }

        if (weekendCheckbox?.checked) {
          const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
          if (!isWeekend) {
            markError(
              weekendCheckbox,
              `Bạn đang bật yêu cầu cuối tuần nhưng ngày thực hiện là ${getWeekdayLabel(selectedDate)}.`,
            );
          }
        }
      }
    }

    if (stepNumber === 4) {
      Object.entries(FILE_VALIDATION_CONFIG).forEach(([fieldId, config]) => {
        const input = panel.querySelector(`#${fieldId}`);
        const files = Array.from(input?.files || []);
        if (!input || !files.length) return;

        if (files.length > config.maxFiles) {
          markError(
            input,
            `Chỉ được tải tối đa ${config.maxFiles} ${config.kindLabel} cho mỗi lần gửi.`,
          );
          return;
        }

        const invalidTypeFile = files.find(
          (file) => !String(file?.type || "").startsWith(config.allowedTypePrefix),
        );
        if (invalidTypeFile) {
          markError(
            input,
            `Tệp “${invalidTypeFile.name}” không đúng định dạng ${config.kindLabel}.`,
          );
          return;
        }

        const oversizedFile = files.find(
          (file) => Number(file?.size || 0) > config.maxSizeBytes,
        );
        if (oversizedFile) {
          markError(
            input,
            `Tệp “${oversizedFile.name}” vượt quá ${(config.maxSizeBytes / (1024 * 1024)).toFixed(0)}MB.`,
          );
        }
      });
    }

    if (!isValid && firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof firstErrorField.focus === "function") {
        firstErrorField.focus({ preventScroll: true });
      }
    }

    return isValid;
  }

  function validateAllBookingSteps(scope, deps) {
    const panels = getBookingStepPanels(scope);
    for (const panel of panels) {
      const step = Number(panel.getAttribute("data-booking-step") || 0);
      if (!step) continue;
      if (!validateBookingStep(scope, step, deps)) {
        goToBookingStep(scope, step, deps, { force: true });
        return false;
      }
    }
    return true;
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

const bookingWizardModule = {
  init,
  goToStep: goToBookingStep,
  validateStep: validateBookingStep,
  validateAll: validateAllBookingSteps,
};

export {
  init,
  goToBookingStep,
  validateBookingStep,
  validateAllBookingSteps,
  bookingWizardModule,
};
export default bookingWizardModule;
