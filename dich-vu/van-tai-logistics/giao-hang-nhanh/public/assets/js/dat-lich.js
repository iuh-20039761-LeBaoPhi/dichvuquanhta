/**
 * dat-lich.js
 * Bootstrap mỏng để nạp các phần đã tách của form đặt lịch.
 *
 * Liên quan trực tiếp:
 * - dat-lich/core.js: state chung, helper cơ bản, map và dữ liệu form
 * - dat-lich/map-reorder.js: map, geocode, reorder/prefill
 * - dat-lich/pricing.js: tính cước, render gói cước, breakdown
 * - dat-lich/flow-submit.js: validate bước, review và submit đơn
 */

(function bootstrapDatLichScripts() {
  if (typeof document === "undefined") return;

  const currentScript = document.currentScript;
  const currentSrc = currentScript?.src || "";
  const basePath = currentSrc.replace(/dat-lich\.js(?:\?.*)?$/i, "dat-lich/");
  const tepCanNap = [
    "core.js",
    "map-reorder.js",
    "pricing.js",
    "flow-submit.js",
  ];

  document.write(
    tepCanNap
      .map((tep) => `<script src="${basePath}${tep}"><\/script>`)
      .join(""),
  );
})();
