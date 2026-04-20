(function (window, document) {
  if (window.__giaoHangNhanhMainBootstrapLoaded) return;
  window.__giaoHangNhanhMainBootstrapLoaded = true;

  const inPublicDir = window.location.pathname.toLowerCase().includes("/public/");
  const scriptBase = inPublicDir ? "assets/js/" : "public/assets/js/";
  const modulePaths = [
    "main-core.js",
    "modules/main-navigation.js",
    "modules/main-tracking.js",
    "modules/main-landing.js",
  ];

  const current = document.currentScript;
  const versionSuffix =
    current && current.src && current.src.includes("?")
      ? "?" + current.src.split("?")[1]
      : "";

  function hasModule(modulePath) {
    return !!document.querySelector(
      `script[data-ghn-module="${modulePath}"]`,
    );
  }

  function loadModuleAt(index) {
    if (index >= modulePaths.length) return;

    const modulePath = modulePaths[index];
    if (hasModule(modulePath)) {
      loadModuleAt(index + 1);
      return;
    }

    const script = document.createElement("script");
    script.src = `${scriptBase}${modulePath}${versionSuffix}`;
    script.async = false;
    script.defer = false;
    script.dataset.ghnModule = modulePath;
    script.onload = function () {
      loadModuleAt(index + 1);
    };
    script.onerror = function () {
      console.error("Cannot load JS module:", modulePath);
      loadModuleAt(index + 1);
    };
    document.head.appendChild(script);
  }

  loadModuleAt(0);
})(window, document);
