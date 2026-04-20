/**
 * Shared Utilities for Admin Pages
 * Includes authentication check and UI rendering
 */

(function (window) {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
    return "";
  };

  const extractRows = (result) => {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.rows)) return result.rows;
    return [];
  };

  function renderAdminLoginInfo(admin) {
    const email = String((admin && admin.email) || "").trim();
    const emailNode = document.querySelector(".admin-chip .admin-email");
    const avatarNode = document.querySelector(".admin-chip .admin-avatar");

    if (emailNode) emailNode.textContent = email || "admin@suaxeluudong.vn";
    if (avatarNode) avatarNode.textContent = email ? email.charAt(0).toUpperCase() : "A";
  }

  async function checkAdminLogin() {
    const e = getCookie("admin_e"), p = getCookie("admin_p");
    if (!e || !p) return (location.href = "../../../../public/admin-login.html");

    if (typeof window.krudList !== "function") {
       console.warn("krudList is not defined. Authentication skipped or delayed.");
       return;
    }

    try {
      const res = await window.krudList({
        table: "admin",
        where: [
          { field: "email", operator: "=", value: e },
          { field: "matkhau", operator: "=", value: p },
        ],
        limit: 1,
      });

      const rows = extractRows(res);
      if (!rows.length) return (location.href = "../../../../public/admin-login.html");
      renderAdminLoginInfo(rows[0]);
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  }

  function adminLogout() {
    document.cookie = "admin_e=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = "admin_p=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    location.href = "../../../../public/admin-login.html";
  }

  // Export to global scope
  window.getCookie = getCookie;
  window.extractRows = extractRows;
  window.renderAdminLoginInfo = renderAdminLoginInfo;
  window.checkAdminLogin = checkAdminLogin;
  window.adminLogout = adminLogout;

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAdminLogin);
  } else {
    checkAdminLogin();
  }
})(window);
