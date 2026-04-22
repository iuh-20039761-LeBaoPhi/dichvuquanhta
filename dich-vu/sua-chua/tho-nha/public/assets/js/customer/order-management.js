/**
 * Khởi tạo dữ liệu và sự kiện cho quản lý đơn hàng khách hàng (Thợ Nhà)
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
            if (showErrorAlert) _tnToast('Không tải được danh sách đơn hàng.', 'danger');
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
            _tnToast('Hủy đơn hàng thành công!', 'success');
            loadOrdersFromApi(false);
            state.selectedOrderId = null;
            render();
        } catch (err) {
            _tnToast('Lỗi: ' + err.message, 'danger');
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

        document.addEventListener('click', async e => {
            const viewBtn = e.target.closest('[data-action="view-detail"]');
            if (viewBtn) {
                e.preventDefault();
                const id = viewBtn.dataset.id;
                await openOrderDetail(id);
                return;
            }

            const backBtn = e.target.closest('[data-action="back-to-list"]');
            if (backBtn) {
                e.preventDefault();
                state.selectedOrderId = null;
                const els = getElements();
                showList(els);
                
                // Hiện lại các section bị ẩn khi xem chi tiết
                const filterSec = document.getElementById('orderFilterSection');
                const searchSec = document.getElementById('orderSearchSection');
                if (filterSec) filterSec.hidden = false;
                if (searchSec) searchSec.hidden = false;
                return;
            }

        });

        const els = getElements();
        if (els.refreshBtn) {
            els.refreshBtn.addEventListener('click', () => loadOrdersFromApi(true));
        }

        // Kiểm tra Deep Link từ URL (truyền từ shell.js)
        if (window._pendingOrderId) {
            const pid = window._pendingOrderId;
            window._pendingOrderId = null; // Reset để không mở lại khi F5 nếu không muốn
            setTimeout(async () => {
                await openOrderDetail(pid);
            }, 600); // Chờ list load xong
        }
    }

    /**
     * Hàm mở chi tiết đơn hàng (Dùng chung cho Click và Deep Link)
     */
    async function openOrderDetail(id) {
        const order = store.getOrders().find(o => String(o.id) === String(id));
        if (!order) {
            // Nếu chưa có trong store, thử tìm trong data list gốc nếu loadOrdersFromApi chưa xong
            console.warn('Order not found in store for ID:', id);
            return;
        }

        const listSec = document.getElementById('orderListSection');
        const detailSec = document.getElementById('orderDetailSection');
        const filterSec = document.getElementById('orderFilterSection');
        const searchSec = document.getElementById('orderSearchSection');
        const detailContent = document.getElementById('orderDetailContent');

        if (listSec) listSec.hidden = true;
        if (filterSec) filterSec.hidden = true;
        if (searchSec) searchSec.hidden = true;
        if (detailSec) detailSec.hidden = false;

        if (detailContent) {
            detailContent.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></div>';
            try {
                const res = await fetch('../chi-tiet-hoa-don-tho-nha.html');
                detailContent.innerHTML = await res.text();
                const renderer = window.ThoNhaOrderDetailRenderer;
                if (renderer) renderer.render(order, 'customer', detailContent);

                if (window.ThoNhaOrderActions) {
                    const session = await DVQTApp.checkSession();
                    window.ThoNhaOrderActions.init(detailContent, session, () => {
                        loadOrdersFromApi(true);
                    });
                }
            } catch (err) {
                detailContent.innerHTML = '<div class="alert alert-danger">Lỗi nạp chi tiết.</div>';
            }
        }
    }

    bindEvents();
    loadOrdersFromApi(false);
};