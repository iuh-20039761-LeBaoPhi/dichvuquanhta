function getSessionUser() {
  return fetch("public/session-user.php?action=get", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(function (response) {
      return response
        .json()
        .catch(function () {
          return null;
        })
        .then(function (result) {
          if (!response.ok || !result || result.hasUser !== true) {
            return null;
          }

          var user =
            result.user && typeof result.user === "object" ? result.user : null;
          return user;
        });
    })
    .catch(function () {
      return null;
    });
}

function fillSessionUserToBookingForm() {
  var nameInput = document.getElementById("hotenkhachhang");
  var phoneInput = document.getElementById("sodienthoaikhachhang");

  if (!nameInput && !phoneInput) {
    return;
  }

  getSessionUser().then(function (user) {
    if (!user) {
      return;
    }

    var userName = user.user_name || "";
    var userPhone = user.user_tel || "";

    if (nameInput && userName) {
      nameInput.value = String(userName).trim();
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (phoneInput && userPhone) {
      phoneInput.value = String(userPhone).trim();
      phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fillSessionUserToBookingForm);
} else {
  fillSessionUserToBookingForm();
}
