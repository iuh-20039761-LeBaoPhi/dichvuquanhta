(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});
  const config = app.config || {};
  const state = app.state || {};
  const utils = app.utils || {};

  function initCoreIfReady() {
    if (app.core && typeof app.core.initBookingModal === "function") {
      app.core.initBookingModal();
    }
  }

  function injectBookingModalStyles(doc) {
    if (document.getElementById(config.BOOKING_MODAL_STYLE_ID)) {
      return;
    }

    const styleNodes = Array.from(doc.querySelectorAll("style")).filter(
      (node) =>
        /#bookingModal|#bookingConfirmModal/.test(node.textContent || ""),
    );

    if (!styleNodes.length) {
      return;
    }

    const styleTag = document.createElement("style");
    styleTag.id = config.BOOKING_MODAL_STYLE_ID;
    styleTag.textContent = styleNodes
      .map((node) => node.textContent || "")
      .join("\n");

    document.head.appendChild(styleTag);
  }

  function injectBookingModalEmbedFixStyles() {
    if (document.getElementById(config.BOOKING_MODAL_EMBED_FIX_STYLE_ID)) {
      return;
    }

    const styleTag = document.createElement("style");
    styleTag.id = config.BOOKING_MODAL_EMBED_FIX_STYLE_ID;
    styleTag.textContent = `
      #modalContainer #bookingModal.modal {
        display: none !important;
        position: fixed !important;
        inset: 0 !important;
        z-index: 2005 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        background: transparent !important;
      }

      #modalContainer #bookingModal.modal.show {
        display: block !important;
      }

      #modalContainer #bookingModal.fade {
        opacity: 0 !important;
      }

      #modalContainer #bookingModal.fade.show {
        opacity: 1 !important;
      }
    `;

    document.head.appendChild(styleTag);
  }

  function extractBookingModalMarkup(rawHtml) {
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(rawHtml, "text/html");

    const bookingModal = parsedDoc.getElementById("bookingModal");
    const bookingConfirmModal = parsedDoc.getElementById("bookingConfirmModal");

    if (!bookingModal) {
      return { html: rawHtml, doc: parsedDoc };
    }

    const html = [bookingModal.outerHTML, bookingConfirmModal?.outerHTML || ""]
      .join("\n")
      .trim();

    return { html, doc: parsedDoc };
  }

  function ensureBookingModalLoaded(container = null) {
    if (document.getElementById("bookingModal")) {
      initCoreIfReady();
      return Promise.resolve();
    }

    if (state.bookingModalLoadPromise) {
      return state.bookingModalLoadPromise;
    }

    state.bookingModalLoadPromise = fetch(config.BOOKING_MODAL_SOURCE)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Không thể tải nội dung modal đặt dịch vụ");
        }

        return res.text();
      })
      .then((rawHtml) => {
        const { html, doc } = extractBookingModalMarkup(rawHtml);
        injectBookingModalStyles(doc);
        injectBookingModalEmbedFixStyles();

        const target =
          container ||
          document.getElementById("modalContainer") ||
          document.body.appendChild(document.createElement("div"));

        if (!target.id) {
          target.id = "modalContainer";
        }

        target.innerHTML = html;
        initCoreIfReady();
      })
      .catch((error) => {
        state.bookingModalLoadPromise = null;
        throw error;
      });

    return state.bookingModalLoadPromise;
  }

  app.modal = app.modal || {};
  app.modal.injectBookingModalStyles = injectBookingModalStyles;
  app.modal.injectBookingModalEmbedFixStyles = injectBookingModalEmbedFixStyles;
  app.modal.extractBookingModalMarkup = extractBookingModalMarkup;
  app.modal.ensureBookingModalLoaded = ensureBookingModalLoaded;

  window.BookingModalManager = window.BookingModalManager || {};
  window.BookingModalManager.mount = function (
    containerSelector = "#modalContainer",
  ) {
    const container =
      typeof containerSelector === "string"
        ? document.querySelector(containerSelector)
        : containerSelector;

    return ensureBookingModalLoaded(container || null);
  };

  window.BookingModalManager.open = function (serviceId = null) {
    return ensureBookingModalLoaded().then(() => {
      const bookingModal = document.getElementById("bookingModal");
      if (!bookingModal) return;

      if (typeof utils.fillBookingTimeNow === "function") {
        utils.fillBookingTimeNow(true);
      }

      bootstrap.Modal.getOrCreateInstance(bookingModal).show();

      if (serviceId != null) {
        const serviceSelect = document.getElementById("dichvuquantam");
        if (serviceSelect) {
          const normalized = String(serviceId);
          const hasOption = Array.from(serviceSelect.options).some(
            (opt) => String(opt.value) === normalized,
          );

          if (hasOption) {
            serviceSelect.value = normalized;
            serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            bookingModal.dataset.pendingServiceId = normalized;
          }
        }
      }
    });
  };
})(window);
