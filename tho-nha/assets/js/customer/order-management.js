/**
 * Khởi tạo dữ liệu và sự kiện cho quản lý đơn hàng khách hàng (Thợ Nhà)
 */
window.initCustomerOrders = function() {
    'use strict';

    if (window._customerOrdersInit) return;
    window._customerOrdersInit = true;

    var store = window.ThoNhaOrderStore;
    var ui = window.ThoNhaOrderUI;
    if (!store || !ui) return console.error('[CustOrder] Missing dependencies!');

    var state = {
        filter: 'all',
        keyword: '',
        selectedOrderId: null,
        isLoading: false
    };

    var profile = store.getCustomerProfile();
    
    function getElements() {
        return {
            listContainer: document.getElementById('orderListSection'),
            detailContainer: document.getElementById('orderDetailSection'),
            orderBody: document.getElementById('customerOrderBody'),
            mobileList: document.getElementById('customerMobileList'),
            emptyState: document.getElementById('customerEmptyState'),
            refreshBtn: document.getElementById('refreshCustomerBtn'),
            statAll: document.getElementById('stat-all-count'),
            statNew: document.getElementById('stat-new-count'),
            statDoing: document.getElementById('stat-doing-count'),
            statDone: document.getElementById('stat-done-count')
        };
    }

    async function loadOrdersFromApi(showErrorAlert) {
        state.isLoading = true;
        const els = getElements();
        if (els.orderBody) els.orderBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải dữ liệu...</td></tr>';
        
        try {
            // Luôn lấy profile mới nhất từ session
            const currentProfile = store.getCustomerProfile();
            const orders = await window.ThoNhaOrderService.getOrders('customer', currentProfile);
            console.log('[CustOrder] Loaded from API:', orders.length);
            store.setOrders(orders);
        } catch (err) {
            console.error('[customer-order] API Error:', err);
            if (showErrorAlert) alert('Không tải được danh sách đơn hàng.');
        } finally {
            state.isLoading = false;
            render();
        }
    }

    function render() {
        const els = getElements();
        const orders = store.getOrders('customer');
        const filter = state.filter;
        const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

        if (els.statAll) els.statAll.textContent = orders.length;
        if (els.statNew) els.statNew.textContent = orders.filter(o => o.status === 'new').length;
        if (els.statDoing) els.statDoing.textContent = orders.filter(o => o.status === 'doing' || o.status === 'confirmed').length;
        if (els.statDone) els.statDone.textContent = orders.filter(o => o.status === 'done').length;
        
        ui.renderList(filtered, 'customer', {
            body: els.orderBody,
            mobile: els.mobileList,
            empty: els.emptyState
        });

        // SPA Detail View Handling
        if (state.selectedOrderId) {
            const order = orders.find(o => o.id === state.selectedOrderId);
            if (order) {
                if (els.listContainer) els.listContainer.hidden = true;
                if (els.detailContainer) {
                    els.detailContainer.hidden = false;
                    ui.renderDetails(order, 'customer', els.detailContainer);
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

    async function handleCancelOrder(id, code) {
        if (!confirm('Xác nhận hủy đơn hàng ' + code + '?')) return;
        try {
            const d = new Date();
            const vnDate = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
            const pad = (n) => String(n).padStart(2, '0');
            const now = `${vnDate.getFullYear()}-${pad(vnDate.getMonth() + 1)}-${pad(vnDate.getDate())} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;
            
            await DVQTApp.updateOrder(id, { ngayhuy: now }, 'datlich_thonha');
            alert('Hủy đơn hàng thành công!');
            loadOrdersFromApi(false);
            state.selectedOrderId = null;
            render();
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    }

    function bindEvents() {
        ['all', 'new', 'doing', 'done'].forEach(f => {
            const el = document.getElementById('filter-' + f);
            if (el) el.addEventListener('click', () => {
                state.filter = f;
                state.selectedOrderId = null; // Back to list when filter changed
                render();
            });
        });

        document.addEventListener('click', e => {
            const viewBtn = e.target.closest('[data-action="view-detail"]');
            if (viewBtn) {
                e.preventDefault();
                state.selectedOrderId = viewBtn.dataset.id;
                render();
                return;
            }

            const backBtn = e.target.closest('.back-btn, [data-action="back-to-list"]');
            if (backBtn) {
                e.preventDefault();
                state.selectedOrderId = null;
                render();
                return;
            }

            const cancelBtn = e.target.closest('[data-action="cancel-order"]');
            if (cancelBtn) {
                e.preventDefault();
                handleCancelOrder(cancelBtn.dataset.id, cancelBtn.dataset.code);
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