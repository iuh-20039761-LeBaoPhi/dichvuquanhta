/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Đối tác (Thợ)
 */
window.initProviderOrders = function() {
    'use strict';

    if (window._providerOrdersInit) return;
    window._providerOrdersInit = true;

    var store = window.ThoNhaOrderStore;
    var viewUtils = window.ThoNhaOrderViewUtils;
    var ui = window.ThoNhaOrderUI;
    if (!store || !viewUtils || !ui) return console.error('[ProviderOrder] Missing dependencies!');

    var state = {
        filter: 'all',
        keyword: '',
        selectedOrderId: null,
        orders: [],
        isLoading: false
    };

    var provider = store.getProviderProfile();
    var elements = {
        openBody: document.getElementById('openRequestBody'),
        assignedBody: document.getElementById('assignedOrderBody'),
        openMobileList: document.getElementById('openMobileList'),
        assignedMobileList: document.getElementById('assignedMobileList'),
        openEmpty: document.getElementById('openEmptyState'),
        assignedEmpty: document.getElementById('assignedEmptyState'),
        refreshBtn: document.getElementById('refreshProviderBtn'),
        detailModal: document.getElementById('providerDetailModal'),
        detailBody: document.getElementById('providerDetailBody'),
        detailCode: document.getElementById('providerDetailCode'),
        statOpen: document.getElementById('statOpen'),
        statAssigned: document.getElementById('statAssigned'),
        statDoing: document.getElementById('statDoing'),
        statDone: document.getElementById('statDone')
    };

    function setLoadingState(isLoading) {
        state.isLoading = !!isLoading;
        if (state.isLoading) {
            if (elements.openBody) elements.openBody.innerHTML = '<tr><td colspan="6" class="table-loading">Đang tải yêu cầu Milestone...</td></tr>';
            if (elements.assignedBody) elements.assignedBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải đơn đã nhận Milestone...</td></tr>';
        }
    }

    async function loadOrdersFromApi(showErrorAlert) {
        setLoadingState(true);
        try {
            const orders = await window.ThoNhaOrderService.getOrders('provider', provider);
            state.orders = orders || [];
        } catch (err) {
            console.error('[provider-order] API Error:', err);
            state.orders = [];
            if (showErrorAlert) alert('Không tải được danh sách công việc.');
        } finally {
            setLoadingState(false);
            render();
        }
    }

    function render() {
        const orders = state.orders || [];
        
        // Chia đơn: Mới (chờ thầu) vs Đã nhận
        const openOrders = orders.filter(o => o.status === 'new');
        const assignedOrders = orders.filter(o => o.status !== 'new' && o.status !== 'cancel');

        // Cập nhật thống kê
        if (elements.statOpen) elements.statOpen.textContent = openOrders.length;
        if (elements.statAssigned) elements.statAssigned.textContent = assignedOrders.length;
        if (elements.statDoing) elements.statDoing.textContent = assignedOrders.filter(o => o.status === 'doing').length;
        if (elements.statDone) elements.statDone.textContent = assignedOrders.filter(o => o.status === 'done').length;

        // Vẽ qua UI Composer
        ui.renderList(openOrders, 'provider', {
            body: elements.openBody,
            mobile: elements.openMobileList,
            empty: elements.openEmpty
        });
        ui.renderList(assignedOrders, 'provider', {
            body: elements.assignedBody,
            mobile: elements.assignedMobileList,
            empty: elements.assignedEmpty
        });

        // Cập nhật chi tiết nếu đang mở
        if (state.selectedOrderId && elements.detailBody) {
            const order = orders.find(o => o.id === state.selectedOrderId);
            if (order) {
                elements.detailBody.innerHTML = ui.renderDetails(order, 'provider', provider);
                if (elements.detailCode) elements.detailCode.textContent = order.orderCode;
                renderActionButtons(order);
            }
        }
    }

    function renderActionButtons(order) {
        const area = document.getElementById('providerActionArea');
        if (!area) return;

        let html = '';
        if (order.status === 'new') {
            html = `<button class="btn btn-primary w-100 py-3 fw-bold" data-action="accept-order" data-id="${order.id}">NHẬN ĐƠN HÀNG NÀY</button>`;
        } else if (order.status === 'confirmed') {
            html = `<button class="btn btn-warning w-100 py-3 fw-bold" data-action="start-order" data-id="${order.id}">BẮT ĐẦU THỰC HIỆN</button>`;
        } else if (order.status === 'doing') {
            html = `<button class="btn btn-success w-100 py-3 fw-bold" data-action="complete-order" data-id="${order.id}">XÁC NHẬN HOÀN THÀNH</button>`;
        }
        area.innerHTML = html;
    }

    async function handleProviderAction(id, actionType) {
        const order = state.orders.find(o => o.id === String(id));
        if (!order) return;

        let payload = {};
        const d = new Date();
        const vnDate = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
        const pad = (n) => String(n).padStart(2, '0');
        const nowStr = `${vnDate.getFullYear()}-${pad(vnDate.getMonth() + 1)}-${pad(vnDate.getDate())} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;
        
        if (actionType === 'accept-order') {
            if (!confirm('Xác nhận nhận đơn hàng này?')) return;
            payload = {
                id_nhacungcap: provider.id,
                tenncc: provider.name,
                sdtncc: provider.phone,
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
                state.selectedOrderId = id;
                render();
                if (elements.detailModal) elements.detailModal.hidden = false;
                document.body.classList.add('detail-modal-open');
                return;
            }

            if (['accept-order', 'start-order', 'complete-order'].includes(action)) {
                handleProviderAction(id, action);
                return;
            }
            
            if (action === 'close-detail') {
                state.selectedOrderId = null;
                if (elements.detailModal) elements.detailModal.hidden = true;
                document.body.classList.remove('detail-modal-open');
                return;
            }
        });

        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', () => loadOrdersFromApi(true));
        }
    }

    bindEvents();
    loadOrdersFromApi(false);
};