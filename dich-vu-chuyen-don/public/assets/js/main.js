(function (window, document) {
  if (window.__fastGoMainBootstrapLoaded) return;
  window.__fastGoMainBootstrapLoaded = true;

  const core = window.FastGoCore || {};
  const current = document.currentScript;
  const scriptBase =
    current && current.src
      ? current.src.replace(/main\.js(?:\?.*)?$/i, "")
      : core.toAssetsUrl
        ? core.toAssetsUrl("js/")
        : "public/assets/js/";
  const modulePaths = [
    "main-core.js",
    "modules/main-navigation.js",
    "modules/main-services-hub.js",
    "modules/main-landing.js",
    "modules/main-news.js",
    "modules/main-pricing.js",
    "modules/main-transparent-pricing.js",
    "modules/main-customer-portal-store.js",
    "modules/main-form-booking-pricing.js",
    "modules/main-form-booking-map.js",
    "modules/main-form-booking-wizard.js",
    "modules/main-form-summaries.js",
    "modules/main-form-media.js",
    "modules/main-form-booking-ui.js",
    "modules/main-booking-api.js",
    "modules/main-forms.js",
    "modules/main-auth.js",
    "modules/main-customer-dashboard.js",
    "modules/main-customer-history.js",
    "modules/main-customer-profile.js",
    "modules/main-provider-dashboard.js",
    "modules/main-provider-jobs.js",
    "modules/main-provider-order-detail.js",
    "modules/main-provider-profile.js",
  ];

  const versionSuffix =
    current && current.src && current.src.includes("?")
      ? "?" + current.src.split("?")[1]
      : "";

  function hasModule(modulePath) {
    return !!document.querySelector(
      `script[data-fastgo-module="${modulePath}"]`,
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
    script.dataset.fastgoModule = modulePath;
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
