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

        const confirmAction = async (title, text, icon = 'question', confirmColor = '#10b981') => {
            if (window.Swal) {
                const result = await window.Swal.fire({
                    title: `<span style="font-size:1.25rem; font-weight:800; color:#1e293b">${title}</span>`,
                    text: text,
                    icon: icon,
                    showCancelButton: true,
                    confirmButtonColor: confirmColor,
                    cancelButtonColor: '#94a3b8',
                    confirmButtonText: 'Đồng ý',
                    cancelButtonText: 'Bỏ qua',
                    reverseButtons: true,
                    customClass: { popup: 'premium-swal-popup' }
                });
                return result.isConfirmed;
            }
            return confirm(text);
        };

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
                    // Kiểm tra không cho nhận đơn chính mình đặt
                    if (window.ThoNhaOrderStore) {
                        const orders = window.ThoNhaOrderStore.getOrders();
                        const order = orders.find(o => String(o.id) === String(id));
                        if (order) {
                            const provPhone = String(session.phone || session.sodienthoai || '').replace(/\D/g, '').slice(-9);
                            const custPhone = String(order.customer?.phone || order._raw?.sdtkhachhang || '').replace(/\D/g, '').slice(-9);
                            if (provPhone && custPhone && provPhone === custPhone) {
                                if (window.Swal) {
                                    window.Swal.fire({
                                        title: '<span style="color:#11998e">Thông báo</span>',
                                        html: 'Bạn không thể tự nhận đơn hàng do chính mình đặt.',
                                        icon: 'warning',
                                        confirmButtonColor: '#11998e'
                                    });
                                } else {
                                    alert('Bạn không thể tự nhận đơn hàng do chính mình đặt.');
                                }
                                return;
                            }
                        }
                    }

                    if (!(await confirmAction('Xác nhận nhận việc', 'Bạn đồng ý nhận và chịu trách nhiệm thực hiện đơn hàng này?', 'question', '#6366f1'))) return;
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
                    if (!(await confirmAction('Xác nhận hoàn thành', 'Bạn chắc chắn đã hoàn thành mọi hạng mục công việc?', 'success', '#10b981'))) return;
                    payload = { ngayhoanthanhthucte: now };
                    
                    // Lưu vị trí hiện tại của NCC
                    if (session && session.id && navigator.geolocation) {
                        if (window.Swal) {
                            window.Swal.fire({
                                title: 'Đang xử lý',
                                html: 'Đang ghi nhận vị trí hoàn thành...',
                                allowOutsideClick: false,
                                didOpen: () => { window.Swal.showLoading(); }
                            });
                        }
                        await new Promise((resolve) => {
                            navigator.geolocation.getCurrentPosition(async (pos) => {
                                const lat = pos.coords.latitude;
                                const lng = pos.coords.longitude;
                                let addr = `${lat}, ${lng}`;
                                try {
                                    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                                        headers: { 'User-Agent': 'DVQTApp/1.0', 'Accept-Language': 'vi' }
                                    });
                                    const data = await r.json();
                                    if (data && data.display_name) addr = data.display_name.split(', ').slice(0, 5).join(', ');
                                } catch (e) {}
                                
                                if (window.DVQTKrud) {
                                    try {
                                        await window.DVQTKrud.updateRow('nguoidung', session.id, {
                                            diachihientai: addr,
                                            lat_hientai: lat,
                                            lng_hientai: lng
                                        });
                                    } catch (e) {}
                                }
                                resolve();
                            }, () => { resolve(); }, { enableHighAccuracy: true, timeout: 6000 });
                        });
                        if (window.Swal && window.Swal.isVisible()) window.Swal.close();
                    }
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

                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                    let subsidyPercent = 5; // Mặc định 5%
                    try {
                        const services = await window.DVQTKrud.listTable('dichvucungcap');
                        const thoNhaSvc = services.find(s => String(s.id) === '9');
                        if (thoNhaSvc && thoNhaSvc.tro_gia) {
                            subsidyPercent = Number(thoNhaSvc.tro_gia);
                        }
                    } catch (e) {
                        console.warn('[ThoNhaActions] Fetch subsidy failed, using fallback 5%');
                    }

                    const sub = Math.round(price * (subsidyPercent / 100));
                    payload = { chiphithucte: price, sotientrogia: sub, khachthanhtoan: price - sub };
                } else if (action === 'cancel-order') {
                    const code = btn.dataset.code || id;
                    if (!(await confirmAction('Hủy đơn hàng', `Bạn có chắc chắn muốn hủy đơn hàng #${code}?`, 'warning', '#f43f5e'))) return;
                    payload = { ngayhuy: now };
                } else if (action === 'submit-customer-feedback') {
                    const text = document.getElementById('inputCustFeedback')?.value;
                    const fileInput = document.getElementById('fileCustEvidence');
                    if (!text) return _tnToast('Vui lòng nhập cảm nhận của bạn.', 'danger');
                    
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    let driveFileId = '';
                    if (fileInput && fileInput.files.length > 0) {
                        const dLocal = new Date();
                        const padD = (n) => String(n).padStart(2, '0');
                        const timeUploadStr = `${padD(dLocal.getDate())}${padD(dLocal.getMonth()+1)}${dLocal.getFullYear()}_${padD(dLocal.getHours())}${padD(dLocal.getMinutes())}${padD(dLocal.getSeconds())}${String(dLocal.getMilliseconds()).padStart(3, '0')}`;
                        const cName = `${id}_thonha_${timeUploadStr}_danhgia`;
                        const up = await DVQTApp.uploadFile(fileInput.files[0], { folderKey: 29, customName: cName });
                        if (up.success) {
                            driveFileId = up.fileId;
                            if (fileInput.files[0] && fileInput.files[0].type && fileInput.files[0].type.startsWith('video/')) {
                                driveFileId = 'vid_' + driveFileId;
                            }
                        }
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
                        const dLocal = new Date();
                        const padD = (n) => String(n).padStart(2, '0');
                        const timeUploadStr = `${padD(dLocal.getDate())}${padD(dLocal.getMonth()+1)}${dLocal.getFullYear()}_${padD(dLocal.getHours())}${padD(dLocal.getMinutes())}${padD(dLocal.getSeconds())}${String(dLocal.getMilliseconds()).padStart(3, '0')}`;
                        const cName = `${id}_thonha_${timeUploadStr}_danhgia`;
                        const up = await DVQTApp.uploadFile(fileInput.files[0], { folderKey: 29, customName: cName });
                        if (up.success) {
                            driveFileId = up.fileId;
                            if (fileInput.files[0] && fileInput.files[0].type && fileInput.files[0].type.startsWith('video/')) {
                                driveFileId = 'vid_' + driveFileId;
                            }
                        }
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
