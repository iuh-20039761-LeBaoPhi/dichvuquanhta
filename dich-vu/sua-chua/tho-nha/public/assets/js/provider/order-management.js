/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Đối tác (Thợ Nhà)
 */
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
window.initProviderOrders = function() {
    'use strict';

    if (window._providerOrdersInit) return;
    window._providerOrdersInit = true;

    var store = window.ThoNhaOrderStore;
    var ui = window.ThoNhaOrderUI;
    if (!store || !ui) return console.error('[ProviderOrder] Missing dependencies!');

    var state = {
        filter: 'all',
        keyword: '',
        selectedOrderId: null,
        isLoading: false
    };

    function getElements() {
        return {
            listContainer: document.getElementById('providerListSection'),
            detailContainer: document.getElementById('providerDetailSection'),
            openBody: document.getElementById('openRequestBody'),
            assignedBody: document.getElementById('assignedOrderBody'),
            openMobileList: document.getElementById('openMobileList'),
            assignedMobileList: document.getElementById('assignedMobileList'),
            openEmpty: document.getElementById('openEmptyState'),
            assignedEmpty: document.getElementById('assignedEmptyState'),
            refreshBtn: document.getElementById('refreshProviderBtn'),
            statOpen: document.getElementById('statOpen'),
            statAssigned: document.getElementById('statAssigned'),
            statDoing: document.getElementById('statDoing'),
            statDone: document.getElementById('statDone')
        };
    }

    async function loadOrdersFromApi(showErrorAlert) {
        state.isLoading = true;
        const els = getElements();
        if (els.openBody) els.openBody.innerHTML = '<tr><td colspan="6" class="table-loading">Đang tải yêu cầu...</td></tr>';
        if (els.assignedBody) els.assignedBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải đơn đã nhận...</td></tr>';
        
        try {
            const currentProvider = store.getProviderProfile();
            const orders = await window.ThoNhaOrderService.getOrders('provider', currentProvider);
            console.log('[ProviderOrder] Loaded from API:', orders.length);
            store.setOrders(orders);
        } catch (err) {
            console.error('[provider-order] API Error:', err);
            if (showErrorAlert) _tnToast('Không tải được danh sách công việc.', 'danger');
        } finally {
            state.isLoading = false;
            render();
        }
    }

    function render() {
        const els = getElements();
        const orders = store.getOrders();
        
        // Chia đơn: Mới (chờ thầu) vs Đã nhận
        const openOrders = orders.filter(o => o.status === 'new');
        const assignedOrders = orders.filter(o => o.status !== 'new' && o.status !== 'cancel');

        // Cập nhật thống kê
        if (els.statOpen) els.statOpen.textContent = openOrders.length;
        if (els.statAssigned) els.statAssigned.textContent = assignedOrders.length;
        if (els.statDoing) els.statDoing.textContent = assignedOrders.filter(o => o.status === 'doing').length;
        if (els.statDone) els.statDone.textContent = assignedOrders.filter(o => o.status === 'done').length;

        // Vẽ danh sách
        ui.renderList(openOrders, 'provider', {
            body: els.openBody,
            mobile: els.openMobileList,
            empty: els.openEmpty
        });
        ui.renderList(assignedOrders, 'provider', {
            body: els.assignedBody,
            mobile: els.assignedMobileList,
            empty: els.assignedEmpty
        });

        // SPA Detail View Handling
        if (state.selectedOrderId) {
            const order = orders.find(o => o.id === state.selectedOrderId);
            if (order) {
                if (els.listContainer) els.listContainer.hidden = true;
                if (els.detailContainer) {
                    els.detailContainer.hidden = false;
                    ui.renderDetails(order, 'provider', els.detailContainer);
                }
            } else {
                state.selectedOrderId = null;
                showList(els);
            }
        } else {
            showList(els);
        }
    }

    function showList(els) {
        const e = els || getElements();
        if (e.listContainer) e.listContainer.hidden = false;
        const filterSec = document.getElementById('orderFilterSection');
        if (filterSec) filterSec.style.display = ''; // Hiện lại thanh thống kê
        if (e.detailContainer) e.detailContainer.hidden = true;
    }

    async function handleProviderAction(id, actionType) {
        let payload = {};
        const d = new Date();
        const vnDate = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
        const pad = (n) => String(n).padStart(2, '0');
        const nowStr = `${vnDate.getFullYear()}-${pad(vnDate.getMonth() + 1)}-${pad(vnDate.getDate())} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;
        
        const currentProvider = store.getProviderProfile();

        if (actionType === 'accept-order') {
            // Kiểm tra không cho nhận đơn chính mình đặt
            const orders = store.getOrders();
            const order = orders.find(o => String(o.id) === String(id));
            if (order) {
                const provPhone = String(currentProvider.phone || '').replace(/\D/g, '').slice(-9);
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

            if (!confirm('Xác nhận nhận đơn hàng này?')) return;
            payload = {
                id_nhacungcap: currentProvider.id,
                tenncc: currentProvider.name,
                sdtncc: currentProvider.phone,
                diachincc: currentProvider.address || currentProvider.diachi || '',
                ngaynhan: nowStr 
            };
        } else if (actionType === 'start-order') {
            payload = { ngaythuchienthucte: nowStr };
        } else if (actionType === 'complete-order') {
            if (!confirm('Xác nhận đã hoàn thành công việc?')) return;
            payload = { ngayhoanthanhthucte: nowStr };
        }

        try {
            await DVQTApp.updateOrder(id, payload, 'datlich_thonha');
            _tnToast('Cập nhật thành công!', 'success');
            loadOrdersFromApi(false);
        } catch (err) {
            _tnToast('Lỗi cập nhật: ' + err.message, 'danger');
        }
    }

    function bindEvents() {
        document.addEventListener('click', async e => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'view-detail') {
                e.preventDefault();
                const orders = store.getOrders();
                const order = orders.find(o => String(o.id) === String(id));
                if (!order) return;

                // 1. Chuyển đổi View
                const listSec = document.getElementById('providerListSection');
                const detailSec = document.getElementById('providerDetailSection');
                const filterSec = document.getElementById('orderFilterSection');

                if (listSec) listSec.hidden = true;
                if (filterSec) filterSec.style.display = 'none';
                if (detailSec) detailSec.hidden = false;

                // 2. Nạp Partial và Render
                let detailContainer = document.getElementById('providerDetailSection');
                // Create a content div inside if it doesn't exist to not lose the Back button
                let contentDiv = detailContainer.querySelector('.order-detail-content-wrap');
                if (!contentDiv) {
                    contentDiv = document.createElement('div');
                    contentDiv.className = 'order-detail-content-wrap';
                    detailContainer.appendChild(contentDiv);
                }

                contentDiv.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></div>';
                try {
                    const res = await fetch('../chi-tiet-hoa-don-tho-nha.html');
                    contentDiv.innerHTML = await res.text();
                    
                    const renderer = window.ThoNhaOrderDetailRenderer;
                    if (renderer) renderer.render(order, 'provider', contentDiv);

                    // 3. Khởi tạo hành động (Cập nhật trạng thái)
                    if (window.ThoNhaOrderActions) {
                        const sess = await DVQTApp.checkSession();
                        window.ThoNhaOrderActions.init(contentDiv, sess, () => {
                            loadOrdersFromApi(true); // Tải lại danh sách đơn
                        });
                    }
                } catch (err) {
                    contentDiv.innerHTML = '<div class="alert alert-danger">Lỗi nạp chi tiết.</div>';
                }
                return;
            }

            if (action === 'back-to-list') {
                e.preventDefault();
                state.selectedOrderId = null;
                const listSec = document.getElementById('providerListSection');
                const detailSec = document.getElementById('providerDetailSection');
                const filterSec = document.getElementById('orderFilterSection');

                if (listSec) listSec.hidden = false;
                if (filterSec) filterSec.style.display = '';
                if (detailSec) detailSec.hidden = true;
                return;
            }

            if (['accept-order', 'start-order', 'complete-order'].includes(action)) {
                e.preventDefault();
                handleProviderAction(id, action);
            }
        });

        const els = getElements();
        if (els.refreshBtn) {
            els.refreshBtn.addEventListener('click', () => loadOrdersFromApi(true));
        }
    }

    bindEvents();
    loadOrdersFromApi(false);
};