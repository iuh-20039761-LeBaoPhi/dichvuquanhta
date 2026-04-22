/**
 * Tho Nha Order Actions - Xử lý tập trung các hành động trên đơn hàng (Chấp nhận, Báo giá, Hoàn thành...)
 * Dùng chung cho cả trang Standalone và Dashboard (SPA).
 */
if (typeof _tnToast === 'undefined') {
    function _tnToast(msg, type) {
        if (typeof type === 'undefined') type = 'success';
        var d = document.createElement('div');
        d.className = 'alert alert-' + type + ' shadow-lg position-fixed top-0 start-50 translate-middle-x mt-4';
        d.style.cssText = 'z-index:99999;border-radius:30px;padding:12px 30px;min-width:280px;max-width:90vw;text-align:center;animation:fadeInDown .3s ease;';
        var icon = type === 'success' ? 'fa-check-circle' : (type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle');
        d.innerHTML = '<i class="fas ' + icon + ' me-2"></i>' + msg;
        document.body.appendChild(d);
        setTimeout(function() { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(function() { d.remove(); }, 500); }, 3500);
    }
}
const ThoNhaOrderActions = (() => {
    'use strict';

    /**
     * Gắn sự kiện click cho container (Event Delegation)
     * @param {HTMLElement} container - Vùng chứa các nút bấm
     * @param {Object} session - Thông tin người dùng hiện tại
     * @param {Function} callback - Hàm gọi lại sau khi thực hiện thành công (ví dụ: reload list)
     */
    function init(container, session, callback) {
        if (!container) return;

        const actionHandler = async (e, btn) => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            
            // Lấy thời gian hiện tại chuẩn SQL
            const d = new Date();
            const vnDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
            const pad = (n) => String(n).padStart(2, '0');
            const now = `${vnDate.getFullYear()}-${pad(vnDate.getMonth() + 1)}-${pad(vnDate.getDate())} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;

            try {
                let payload = {};
                
                if (action === 'accept-order') {
                    if (!confirm('Xác nhận nhận đơn hàng này?')) return;
                    payload = { 
                        id_nhacungcap: session.id, 
                        tenncc: session.name || session.hovaten, 
                        sdtncc: session.phone || session.sodienthoai, 
                        diachincc: session.address || session.diachi || '',
                        ngaynhan: now 
                    };
                } else if (action === 'start-order') {
                    payload = { ngaybatdauthucte: now, ngaythuchienthucte: now };
                } else if (action === 'complete-order') {
                    if (!confirm('Xác nhận đã hoàn thành công việc?')) return;
                    payload = { ngayhoanthanhthucte: now };
                } else if (action === 'open-pricing-modal') {
                    const modalEl = document.getElementById('pricingModal');
                    if (modalEl) {
                        const submitBtn = document.getElementById('btnSubmitPricingModal');
                        if (submitBtn) submitBtn.dataset.id = id;
                        const modal = new bootstrap.Modal(modalEl);
                        modal.show();
                    }
                    return;
                } else if (action === 'submit-actual-price') {
                    const price = Number(document.getElementById('inputActualPriceModal').value);
                    if (!price || price <= 0) return _tnToast('Vui lòng nhập giá thực tế.', 'danger');
                    const sub = Math.round(price * 0.05);
                    payload = { chiphithucte: price, sotientrogia: sub, khachthanhtoan: price - sub };
                } else if (action === 'cancel-order') {
                    const code = btn.dataset.code || id;
                    if (!confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${code}?`)) return;
                    payload = { ngayhuy: now };
                } else if (action === 'submit-customer-feedback') {
                    const text = document.getElementById('inputCustFeedback')?.value;
                    const fileInput = document.getElementById('fileCustEvidence');
                    if (!text) return _tnToast('Vui lòng nhập cảm nhận của bạn.', 'danger');
                    
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    let driveFileId = '';
                    if (fileInput && fileInput.files.length > 0) {
                        const up = await DVQTApp.uploadFile(fileInput.files[0]);
                        if (up.success) driveFileId = up.fileId;
                    }
                    payload = { danhgiakhachhang: text, hinhanhminhchung_kh: driveFileId };
                } else if (action === 'submit-provider-feedback') {
                    const text = document.getElementById('inputProviderFeedback')?.value;
                    const fileInput = document.getElementById('fileProviderEvidence');
                    if (!text) return _tnToast('Vui lòng nhập báo cáo công việc.', 'danger');
                    
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    let driveFileId = '';
                    if (fileInput && fileInput.files.length > 0) {
                        const up = await DVQTApp.uploadFile(fileInput.files[0]);
                        if (up.success) driveFileId = up.fileId;
                    }
                    payload = { danhgiancc: text, hinhanhminhchung_ncc: driveFileId };
                }

                if (Object.keys(payload).length > 0) {
                    if (!btn.disabled) {
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    }
                    
                    await DVQTApp.updateOrder(id, payload, 'datlich_thonha');
                    _tnToast('Gửi thông tin thành công!', 'success');

                    // Đóng modal nếu đang mở
                    const modalEl = document.getElementById('pricingModal');
                    if (modalEl && action === 'submit-actual-price') {
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                    }

                    if (typeof callback === 'function') {
                        callback(action, id);
                    } else {
                        location.reload();
                    }
                }
            } catch (err) {
                _tnToast('Lỗi: ' + err.message, 'danger');
                btn.disabled = false;
            }
        };

        // Click trên danh sách/chi tiết
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            // Chỉ chặn sự kiện nếu là các hành động mà module này xử lý
            const handledActions = ['accept-order', 'start-order', 'complete-order', 'open-pricing-modal', 'submit-actual-price', 'cancel-order', 'submit-customer-feedback', 'submit-provider-feedback'];
            if (handledActions.includes(btn.dataset.action)) {
                e.stopPropagation();
                e.preventDefault();
                await actionHandler(e, btn);
            }
        });

        // Click trên nút submit của modal trợ giá (nếu có)
        const modalSubmitBtn = document.getElementById('btnSubmitPricingModal');
        if (modalSubmitBtn) {
            modalSubmitBtn.onclick = async (e) => {
                modalSubmitBtn.dataset.action = 'submit-actual-price';
                await actionHandler(e, modalSubmitBtn);
            };
        }
    }

    return { init };
})();

window.ThoNhaOrderActions = ThoNhaOrderActions;
