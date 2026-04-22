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
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role") || document.body.getAttribute("data-role");

    // Nếu không phải admin thì không kiểm tra admin login ở đây (để tránh redirect nhầm)
    if (role && role !== "admin") return;

    const e = getCookie("admin_e"),
      p = getCookie("admin_p");

    const mount = document.getElementById("asideMount");
    const asideConfig = window._asideConfig || {};
    const fallbackLogout =
      asideConfig.logoutHref ||
      (mount ? mount.getAttribute("data-logout-href") : null);
    const adminLoginPath =
      fallbackLogout || "../../../../public/admin-login.html";

    if (!e || !p) return (location.href = adminLoginPath);

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
      if (!rows.length) return (location.href = adminLoginPath);
      renderAdminLoginInfo(rows[0]);
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  }

  function adminLogout(config) {
    const del = (name) => {
      document.cookie = name + "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    };

    const params = new URLSearchParams(window.location.search);
    const role = params.get("role") || document.body.getAttribute("data-role");

    if (role === "admin" || !role) {
      del("admin_e");
      del("admin_p");
    } else {
      del("dvqt_u");
      del("dvqt_p");
    }

    const mount = document.getElementById("asideMount");
    const asideConfig = window._asideConfig || {};
    const asideLogout =
      asideConfig.logoutHref ||
      (mount ? mount.getAttribute("data-logout-href") : null);

    const href =
      (config && config.logoutHref) ||
      asideLogout ||
      "../../../../public/admin-login.html";

    location.href = href;
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
