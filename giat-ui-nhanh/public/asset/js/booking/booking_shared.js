(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});
  const config = (app.config = app.config || {});
  const state = (app.state = app.state || {});
  const utils = (app.utils = app.utils || {});

  config.BOOKING_MODAL_SOURCE =
    config.BOOKING_MODAL_SOURCE || "dat-dich-vu.html";
  config.BOOKING_MODAL_STYLE_ID =
    config.BOOKING_MODAL_STYLE_ID || "bookingModalInlineStyles";
  config.BOOKING_MODAL_EMBED_FIX_STYLE_ID =
    config.BOOKING_MODAL_EMBED_FIX_STYLE_ID || "bookingModalEmbedFixStyles";
  config.BOOKING_GOOGLE_SHEET_API =
    config.BOOKING_GOOGLE_SHEET_API ||
    "https://script.google.com/macros/s/AKfycbzGk9VOSebrVPRhBtXpOZyBpXaYZpzbvPD3hQ5oQ7uIGnn2HXBv2bBqJ6ouOpZ3g_kENA/exec";
  config.BOOKING_KRUD_TABLE =
    config.BOOKING_KRUD_TABLE || "datlich_giatuinhanh";

  if (typeof state.bookingModalLoadPromise === "undefined") {
    state.bookingModalLoadPromise = null;
  }

  if (typeof state.pendingQuickServiceId === "undefined") {
    state.pendingQuickServiceId = null;
  }

  const notyf = typeof window.Notyf === "function" ? new window.Notyf() : null;

  function showToast(message, type = "success") {
    if (!notyf) {
      console.error(message);
      return;
    }

    if (type === "success") {
      notyf.success({
        message,
        dismissible: true,
        position: {
          x: "right",
          y: "top",
        },
        duration: 3000,
      });
      return;
    }

    notyf.error({
      message,
      dismissible: true,
      position: {
        x: "right",
        y: "top",
      },
      duration: 3000,
    });
  }

  function getBookingTimeInput() {
    return (
      document.getElementById("thoigiandatdichvu") ||
      document.querySelector('input[name="thoigiandatdichvu"]')
    );
  }

  function toDateTimeLocalNow() {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  }

  function fillBookingTimeNow(force = false) {
    const input = getBookingTimeInput();
    if (!input) return;

    if (force || !String(input.value || "").trim()) {
      input.value = toDateTimeLocalNow();
    }
  }

  function parseIntegerLike(value) {
    const normalized = String(value == null ? "" : value).replace(/\D/g, "");
    return Number(normalized || 0);
  }

  utils.showToast = showToast;
  utils.getBookingTimeInput = getBookingTimeInput;
  utils.toDateTimeLocalNow = toDateTimeLocalNow;
  utils.fillBookingTimeNow = fillBookingTimeNow;
  utils.parseIntegerLike = parseIntegerLike;
})(window);
