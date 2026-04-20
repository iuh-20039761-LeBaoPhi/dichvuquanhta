const bookingFormsModule = {};

// Khởi tạo toàn bộ hành vi động riêng của form đặt lịch.
bookingFormsModule.init = function init(scope, deps) {
  if (!scope.querySelector(".form-dat-lich")) return;
  if (scope.__fastGoBookingUiBound) return;
  scope.__fastGoBookingUiBound = true;

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

export { bookingFormsModule };
export default bookingFormsModule;
