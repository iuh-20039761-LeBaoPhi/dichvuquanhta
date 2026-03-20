/**
 * booking-autofill.js
 * Nút "Tự điền thông tin" trong modal đặt lịch:
 * - Đã đăng nhập: tự điền tên + SĐT, hiện toast thành công
 * - Chưa đăng nhập: hiện banner gợi ý đăng nhập
 */
(function () {
    'use strict';

    var _session = null;

    function fetchSession(cb) {
        fetch((window.BD_BASE || '../../') + 'api/public/check-session.php')
            .then(function (r) { return r.json(); })
            .then(function (data) { _session = data; cb(data); })
            .catch(function () { _session = { logged_in: false }; cb(_session); });
    }

    function fillFields(data) {
        var nameEl  = document.getElementById('name');
        var phoneEl = document.getElementById('phone');
        if (nameEl  && data.name)  { nameEl.value  = data.name;  nameEl.dispatchEvent(new Event('input')); }
        if (phoneEl && data.phone) { phoneEl.value = data.phone; phoneEl.dispatchEvent(new Event('input')); }
    }

    function showBanner(html, hidden) {
        var banner = document.getElementById('bookingAuthBanner');
        if (!banner) return;
        banner.style.display = hidden ? 'none' : '';
        banner.innerHTML = html;
    }

    // Gọi từ nút "Tự điền thông tin"
    window.bookingAutoFill = function () {
        _session = null;
        fetchSession(function (data) {
            if (data.logged_in && data.role === 'customer') {
                fillFields(data);
                showBanner(
                    '<div style="background:#f0faf5;border:1px solid #b2dfdb;border-radius:8px;padding:8px 14px;font-size:0.82rem;color:#0f766e;">' +
                        '<i class="fas fa-check-circle me-2"></i>Đã điền thông tin của <strong>' + (data.name || '') + '</strong>' +
                    '</div>',
                    false
                );
                setTimeout(function () { showBanner('', true); }, 3000);
            } else {
                showBanner(
                    '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 14px;font-size:0.82rem;color:#92400e;">' +
                        '<i class="fas fa-exclamation-circle me-2"></i>' +
                        'Bạn chưa đăng nhập. <a href="' + (window.BD_BASE || '../../') + 'pages/customer/dang-nhap.html" style="color:#d97706;font-weight:600;">Đăng nhập ngay</a> để tự điền thông tin.' +
                    '</div>',
                    false
                );
            }
        });
    };

    // Khi modal mở: nếu đã đăng nhập thì auto-fill luôn (không cần nhấn nút)
    function attachModalListener() {
        var modalEl = document.getElementById('bookingModal');
        if (!modalEl) return;
        modalEl.addEventListener('show.bs.modal', function () {
            showBanner('', true); // reset banner
            fetchSession(function (data) {
                if (data.logged_in && data.role === 'customer') {
                    fillFields(data);
                }
            });
        });
    }

    function tryAttach() {
        if (document.getElementById('bookingModal')) {
            attachModalListener();
        } else {
            var obs = new MutationObserver(function () {
                if (document.getElementById('bookingModal')) {
                    obs.disconnect();
                    attachModalListener();
                }
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryAttach);
    } else {
        tryAttach();
    }
})();
