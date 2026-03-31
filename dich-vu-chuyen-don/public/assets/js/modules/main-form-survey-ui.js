(function (window) {
  const moduleApi = {};

  // Khởi tạo toàn bộ hành vi động riêng của form khảo sát.
  moduleApi.init = function init(scope, deps) {
    if (!scope.querySelector(".form-khao-sat")) return;

    scope.addEventListener("input", function () {
      deps.syncSurveyUi(scope);
    });

    scope.addEventListener("change", function () {
      deps.syncSurveyUi(scope, { includeSpecialField: true });
    });

    deps.syncPhoneFieldValidity(scope);
    deps.updateSpecialItemField(scope);
    deps.initSurveyMap(scope);
    deps.syncSurveyUi(scope);
  };

  window.FastGoSurveyForms = moduleApi;
})(window);
