(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});

  function runBootstrap() {
    const initBookingModal = app.core?.initBookingModal;
    const ensureBookingModalLoaded = app.modal?.ensureBookingModalLoaded;

    if (typeof initBookingModal !== "function") {
      return;
    }

    const modalContainer = document.getElementById("modalContainer");
    const bookingModal = document.getElementById("bookingModal");

    if (bookingModal) {
      initBookingModal();
      return;
    }

    if (modalContainer && typeof ensureBookingModalLoaded === "function") {
      ensureBookingModalLoaded(modalContainer).catch((err) => {
        console.error(err);
        initBookingModal();
      });
      return;
    }

    initBookingModal();
  }

  app.bootstrap = app.bootstrap || {};
  app.bootstrap.start = runBootstrap;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runBootstrap);
  } else {
    runBootstrap();
  }
})(window);
