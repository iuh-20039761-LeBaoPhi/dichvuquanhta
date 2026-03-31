(function (window) {
  const moduleApi = {};

  // Khởi tạo toàn bộ hành vi động riêng của form đặt lịch.
  moduleApi.init = function init(scope, deps) {
    if (!scope.querySelector(".form-dat-lich")) return;

    scope.addEventListener("input", function (event) {
      deps.clearFieldErrorState(event.target);
      deps.syncBookingUi(scope);
    });

    scope.addEventListener("change", function (event) {
      deps.clearFieldErrorState(event.target);
      deps.syncBookingUi(scope);
    });

    deps.initBookingMap(scope);
    deps.syncBookingExecutionDateLimits(scope);
    deps.syncBookingVehicleOptions(
      scope,
      scope.querySelector("#loai-dich-vu-dat-lich")?.value || "",
    );
    deps.syncBookingUi(scope);
    deps.initBookingStepWizard(scope);
  };

  window.FastGoBookingForms = moduleApi;
})(window);
