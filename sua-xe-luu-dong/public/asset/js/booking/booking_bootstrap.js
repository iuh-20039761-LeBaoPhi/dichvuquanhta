(function (window, document) {
  const app = (window.BookingApp = window.BookingApp || {});

  function bootstrapBookingFlow() {
    const modalContainer = document.getElementById("modalContainer");
    const bookingModal = document.getElementById("bookingModal");

    if (bookingModal) {
      app.core?.initBookingModal?.();
      return;
    }

    if (modalContainer) {
      app.modal?.ensureBookingModalLoaded?.(modalContainer)?.catch((err) => {
        console.error(err);
        app.core?.initBookingModal?.();
      });
      return;
    }

    app.core?.initBookingModal?.();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapBookingFlow);
  } else {
    bootstrapBookingFlow();
  }

  app.bootstrap = app.bootstrap || {};
  app.bootstrap.bootstrapBookingFlow = bootstrapBookingFlow;
})(window, document);
