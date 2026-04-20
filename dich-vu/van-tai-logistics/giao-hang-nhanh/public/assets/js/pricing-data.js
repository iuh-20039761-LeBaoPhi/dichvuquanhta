/**
 * pricing-data.js
 * Bootstrap mỏng để nạp calculator và render demo/landing theo thứ tự an toàn.
 *
 * Liên quan trực tiếp:
 * - pricing-data/core.js: lõi dữ liệu và calculator
 * - pricing-data/render.js: render bảng giá, ví dụ và nội dung landing
 */

(function bootstrapPricingDataScripts() {
  if (typeof document === "undefined") return;

  const currentScript = document.currentScript;
  const currentSrc = currentScript?.src || "";
  const basePath = currentSrc.replace(
    /pricing-data\.js(?:\?.*)?$/i,
    "pricing-data/",
  );
  const tepCanNap = ["core.js", "render.js"];

  document.write(
    tepCanNap
      .map((tep) => `<script src="${basePath}${tep}"><\/script>`)
      .join("") +
      `<script>window.loadPricingDataSync && window.loadPricingDataSync();<\/script>`,
  );
})();
