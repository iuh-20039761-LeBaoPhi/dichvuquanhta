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
  config.BOOKING_KRUD_TABLE = config.BOOKING_KRUD_TABLE || "datlich_suaxe";

  if (typeof state.bookingModalLoadPromise === "undefined") {
    state.bookingModalLoadPromise = null;
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

  utils.showToast = showToast;
})(window);
