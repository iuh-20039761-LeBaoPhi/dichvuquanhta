/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Đối tác (Thợ Nhà)
 */
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
            if (showErrorAlert) alert('Không tải được danh sách công việc.');
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
            if (!confirm('Xác nhận nhận đơn hàng này?')) return;
            payload = {
                id_nhacungcap: currentProvider.id,
                tenncc: currentProvider.name,
                sdtncc: currentProvider.phone,
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
            alert('Cập nhật thành công!');
            loadOrdersFromApi(false);
        } catch (err) {
            alert('Lỗi cập nhật: ' + err.message);
        }
    }

    function bindEvents() {
        document.addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'view-detail') {
                e.preventDefault();
                state.selectedOrderId = id;
                render();
                return;
            }

            if (action === 'back-to-list') {
                e.preventDefault();
                state.selectedOrderId = null;
                render();
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