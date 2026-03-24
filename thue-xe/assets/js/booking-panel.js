'use strict';
/**
 * booking-panel.js (thue-xe)
 * Tạo Bootstrap Modal đặt xe, dùng jQuery .load() từ dat-lich-modal.html.
 * Sau khi load xong, gọi window.txBpFormLoaded() để chi-tiet-xe.html gắn handlers.
 */
(function () {

    var _ready       = false;
    var _loaded      = false;
    var _pendingShow = false;

    /* ------------------------------------------------------------------ */
    /*  CSS bổ sung                                                         */
    /* ------------------------------------------------------------------ */
    var CSS = [
        '#txBpModal .modal-body{padding:0;overflow-x:hidden}',
        '#txBpLoading{display:flex;flex-direction:column;align-items:center;',
        'justify-content:center;padding:48px 24px;gap:14px;color:var(--color-primary,#0ea5e9)}',
        '#txBpLoading span{font-size:.88rem;color:#64748b}',
        '#txBpModal .modal-content{border-radius:16px!important;overflow:hidden}',
        '@media(max-width:575.98px){',
        '#txBpModal .modal-dialog{margin:16px auto!important;max-width:92vw!important;width:92vw!important;max-height:88dvh!important}',
        '#txBpModal .modal-content{max-height:88dvh!important;border-radius:16px!important}',
        '#txBpModal .modal-body{max-height:calc(88dvh - 60px)!important;overflow-y:auto!important}',
        '}',
        '@media(min-width:576px){#txBpModal .modal-dialog{max-width:min(780px,94vw)}}'
    ].join('');

    /* ------------------------------------------------------------------ */
    /*  Tạo Bootstrap Modal HTML                                            */
    /* ------------------------------------------------------------------ */
    function _createModal() {
        var style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        var wrapper = document.createElement('div');
        wrapper.innerHTML = [
            '<div class="modal fade" id="txBpModal" tabindex="-1" aria-hidden="true">',
            '  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">',
            '    <div class="modal-content booking-modal-content">',
            '      <div class="modal-header booking-modal-header" style="padding:10px 14px;">',
            '        <div class="tx-bk-spacer"></div>',
            '        <div class="tx-bk-center">',
            '          <img src="assets/images/logo-dich-vu-quanh-ta.jpg" alt="Dịch Vụ Quanh Ta" class="tx-bk-logo">',
            '          <h5 class="modal-title mb-0 fw-bold" style="color:#1e293b;">',
            '            <i class="fas fa-clipboard-list me-1" style="color:var(--color-primary);"></i>Thông Tin Đặt Xe',
            '          </h5>',
            '          <img src="assets/images/thue-xe-logo-header-navigation.jpg" alt="Thuê Xe" class="tx-bk-logo">',
            '        </div>',
            '        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>',
            '      </div>',
            '      <div class="modal-body booking-modal-body" id="txBpModalBody"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(wrapper.firstElementChild);

        _ready = true;
        if (_pendingShow) { _pendingShow = false; _showModal(); }
    }

    /* ------------------------------------------------------------------ */
    /*  Hiện modal                                                          */
    /* ------------------------------------------------------------------ */
    function _showModal() {
        var modalEl = document.getElementById('txBpModal');
        if (!modalEl) return;
        var bsModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
        bsModal.show();
        if (!_loaded) { _loadContent(); }
    }

    /* ------------------------------------------------------------------ */
    /*  jQuery .load() nội dung form từ dat-lich-modal.html               */
    /* ------------------------------------------------------------------ */
    function _loadContent() {
        var $body = jQuery('#txBpModalBody');
        $body.html(
            '<div id="txBpLoading">' +
            '<div class="spinner-border" style="width:2.2rem;height:2.2rem;"></div>' +
            '<span>Đang tải form đặt xe...</span>' +
            '</div>'
        );
        $body.load('views/partials/dat-lich.html #bookingFormContent', function (_response, status) {
            if (status === 'error') {
                $body.html(
                    '<p class="text-danger p-4">' +
                    '<i class="fas fa-exclamation-triangle me-2"></i>' +
                    'Không thể tải form đặt xe. Vui lòng thử lại.' +
                    '</p>'
                );
                return;
            }
            _loaded = true;
            if (typeof window.txBpFormLoaded === 'function') {
                window.txBpFormLoaded();
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  API công khai                                                       */
    /* ------------------------------------------------------------------ */
    window.txBpOpen = function () {
        if (_ready) { _showModal(); }
        else { _pendingShow = true; }
    };

    /* ------------------------------------------------------------------ */
    /*  Bootstrap: load jQuery nếu chưa có, rồi tạo modal                 */
    /* ------------------------------------------------------------------ */
    function _boot() {
        if (typeof jQuery !== 'undefined') {
            _createModal();
        } else {
            var jq = document.createElement('script');
            jq.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
            jq.onload = _createModal;
            document.head.appendChild(jq);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _boot);
    } else {
        _boot();
    }

})();
