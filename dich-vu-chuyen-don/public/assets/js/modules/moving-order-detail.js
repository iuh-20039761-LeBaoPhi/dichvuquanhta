/**
 * Logic xử lý URL và Auto-Auth cho module Chuyển đơn
 */
(function () {
  const params = new URLSearchParams(window.location.search);

  // 1. Lấy mã đơn hàng linh hoạt
  function getMovingIdentifier() {
    return (
      params.get("madonhang") || params.get("code") || params.get("id") || ""
    );
  }

  // 2. Lấy thông tin auth từ URL (2 biến extra bạn nhắc tới)
  async function handleAutoAuth() {
    const user = params.get("username");
    const pass = params.get("password");

    if (user && pass && window.GiaoHangNhanhLocalAuth) {
      console.log(
        "Phát hiện thông tin đăng nhập trên URL, đang tự động xác thực...",
      );
      await window.GiaoHangNhanhLocalAuth.login({
        loginIdentifier: user,
        password: pass,
      });
    }
  }

  // 3. Làm đẹp URL (Đồng bộ về ?madonhang=...)
  function syncUrl(identifier) {
    if (!identifier) return;
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("madonhang", identifier);
    newUrl.searchParams.delete("code");
    newUrl.searchParams.delete("id");
    // Giữ lại user/pass nếu cần hoặc xóa đi sau khi auth xong để bảo mật
    window.history.replaceState({}, "", newUrl.toString());
  }

  async function init() {
    const id = getMovingIdentifier();
    await handleAutoAuth();
    syncUrl(id);
    // Sau đó mới gọi hàm load dữ liệu chi tiết đơn hàng
  }

  document.addEventListener("DOMContentLoaded", init);
})();
