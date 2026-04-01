(function (window, document) {
  const moduleBase = "public/asset/js/booking/";
  const moduleFiles = [
    "booking_shared.js",
    "booking_modal.js",
    "booking_map.js",
    "booking_media.js",
    "booking_confirm.js",
    "booking_core.js",
    "booking_bootstrap.js",
  ];

  function loadSequential(index) {
    if (index >= moduleFiles.length) {
      return;
    }

    const script = document.createElement("script");
    script.src = moduleBase + moduleFiles[index];
    script.async = false;
    script.setAttribute("data-booking-shim", "true");
    script.onload = function () {
      loadSequential(index + 1);
    };
    script.onerror = function () {
      console.error("Không thể tải module:", script.src);
      loadSequential(index + 1);
    };

    document.head.appendChild(script);
  }

  loadSequential(0);
})(window, document);
