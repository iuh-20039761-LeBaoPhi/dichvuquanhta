(function (window, document) {
  if (window.__giaoHangNhanhFormsInitDone) return;
  window.__giaoHangNhanhFormsInitDone = true;

  const partialPaths = {
    "dat-lich": "public/assets/partials/bieu-mau/form-dat-lich-giao-hang.html",
  };

  function loadPartial(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        return xhr.responseText.trim();
      }
    } catch (error) {
      console.error("Cannot load form partial:", url, error);
    }
    return "";
  }

  function initFormHost(host) {
    const formType = host.getAttribute("data-bieu-mau-trang");
    const partialPath = partialPaths[formType];
    if (!formType || !partialPath) return;

    const html = loadPartial(partialPath);
    if (!html) return;

    host.innerHTML = html;
  }

  document.querySelectorAll("[data-bieu-mau-trang]").forEach(initFormHost);
})(window, document);
