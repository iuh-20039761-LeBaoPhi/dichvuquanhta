(function (window, document) {
  const moduleBase = "public/asset/js/booking/";
  const moduleFiles = [
    "booking_shared.js",
    "booking_modal.js",
    "booking_map.js",
    "booking_media.js",
    "booking_auth_helper.js",
    "booking_confirm.js",
    "booking_core.js",
    "booking_bootstrap.js",
  ];

  const loaded = new Set();

  function loadScriptSequentially(index) {
    if (index >= moduleFiles.length) {
      return Promise.resolve();
    }

    const src = `${moduleBase}${moduleFiles[index]}`;
    if (loaded.has(src) || document.querySelector(`script[src=\"${src}\"]`)) {
      loaded.add(src);
      return loadScriptSequentially(index + 1);
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = function () {
        loaded.add(src);
        resolve();
      };
      script.onerror = function () {
        reject(new Error(`Khong the tai module: ${src}`));
      };
      document.head.appendChild(script);
    }).then(() => loadScriptSequentially(index + 1));
  }

  loadScriptSequentially(0).catch((error) => {
    console.error("Loi tai booking modules:", error);
  });
})(window, document);
