/**
 * Order Manager - Hệ thống quản lý đơn hàng hợp nhất (Thợ Nhà)
 * Dùng chung cho cả Khách hàng và Nhà cung cấp.
 */
(function() {
    'use strict';

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

    const OrderManager = {
        state: {
            identity: 'customer', // 'customer' | 'provider'
            filter: 'all',
            selectedOrderId: null,
            isLoading: false,
            initDone: false
        },

        init: function(identity) {
            if (this.state.initDone && this.state.identity === identity) {
                this.loadOrders(false);
                return;
            }
            this.state.identity = identity;
            this.state.initDone = true;

            const store = window.ThoNhaOrderStore;
            const ui = window.ThoNhaOrderUI;
            if (!store || !ui) return console.error('[OrderManager] Missing dependencies!');

            this.bindEvents();
            this.loadOrders(false);
        },

        getElements: function() {
            const id = this.state.identity;
            const prefix = id === 'customer' ? 'customer' : 'provider';
            return {
                listContainer: document.getElementById(prefix + 'ListSection'),
                detailContainer: document.getElementById(prefix + 'DetailSection'),
                // For Customer
                orderBody: document.getElementById('customerOrderBody'),
                mobileList: document.getElementById('customerMobileList'),
                emptyState: document.getElementById('customerEmptyState'),
                // For Provider
                openBody: document.getElementById('openRequestBody'),
                assignedBody: document.getElementById('assignedOrderBody'),
                openMobileList: document.getElementById('openMobileList'),
                assignedMobileList: document.getElementById('assignedMobileList'),
                openEmpty: document.getElementById('openEmptyState'),
                assignedEmpty: document.getElementById('assignedEmptyState'),
                // Stats & Buttons
                refreshBtn: document.getElementById('refresh' + (id === 'customer' ? 'Customer' : 'Provider') + 'Btn'),
                stats: {
                    all: document.getElementById('stat-all-count'),
                    new: document.getElementById('stat-new-count'),
                    doing: document.getElementById('stat-doing-count'),
                    done: document.getElementById('stat-done-count'),
                    open: document.getElementById('statOpen'),
                    assigned: document.getElementById('statAssigned')
                }
            };
        },

        loadOrders: async function(showErrorAlert) {
            this.state.isLoading = true;
            const els = this.getElements();
            
            // Loading UI
            if (els.orderBody) els.orderBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải dữ liệu...</td></tr>';
            if (els.openBody) els.openBody.innerHTML = '<tr><td colspan="6" class="table-loading">Đang tải yêu cầu...</td></tr>';
            if (els.assignedBody) els.assignedBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải đơn đã nhận...</td></tr>';

            try {
                const store = window.ThoNhaOrderStore;
                const profile = this.state.identity === 'customer' ? store.getCustomerProfile() : store.getProviderProfile();
                const orders = await window.ThoNhaOrderService.getOrders(this.state.identity, profile);
                store.setOrders(orders);
            } catch (err) {
                console.error('[OrderManager] API Error:', err);
                if (showErrorAlert) _tnToast('Không tải được danh sách đơn hàng.', 'danger');
            } finally {
                this.state.isLoading = false;
                this.render();
            }
        },

        render: function() {
            const els = this.getElements();
            const store = window.ThoNhaOrderStore;
            const ui = window.ThoNhaOrderUI;
            const id = this.state.identity;
            const orders = store.getOrders();

            if (id === 'customer') {
                const filter = this.state.filter;
                const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
                
                // Update stats
                if (els.stats.all) els.stats.all.textContent = orders.length;
                if (els.stats.new) els.stats.new.textContent = orders.filter(o => o.status === 'new').length;
                if (els.stats.doing) els.stats.doing.textContent = orders.filter(o => o.status === 'doing' || o.status === 'confirmed').length;
                if (els.stats.done) els.stats.done.textContent = orders.filter(o => o.status === 'done').length;

                ui.renderList(filtered, 'customer', {
                    body: els.orderBody,
                    mobile: els.mobileList,
                    empty: els.emptyState
                });
            } else {
                // Provider mode
                const openOrders = orders.filter(o => o.status === 'new');
                const assignedOrders = orders.filter(o => o.status !== 'new' && o.status !== 'cancel');

                if (els.stats.open) els.stats.open.textContent = openOrders.length;
                if (els.stats.assigned) els.stats.assigned.textContent = assignedOrders.length;
                if (els.stats.doing) els.stats.doing.textContent = assignedOrders.filter(o => o.status === 'doing').length;
                if (els.stats.done) els.stats.done.textContent = assignedOrders.filter(o => o.status === 'done').length;

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
            }

            // Sync Detail View
            if (this.state.selectedOrderId) {
                const order = orders.find(o => String(o.id) === String(this.state.selectedOrderId));
                if (order) {
                    this.showDetail(order);
                } else {
                    this.state.selectedOrderId = null;
                    this.showList(els);
                }
            } else {
                this.showList(els);
            }
        },

        showList: function(els) {
            const e = els || this.getElements();
            if (e.listContainer) e.listContainer.hidden = false;
            if (e.detailContainer) e.detailContainer.hidden = true;
            
            const filterSec = document.getElementById('orderFilterSection');
            const searchSec = document.getElementById('orderSearchSection');
            if (filterSec) { filterSec.hidden = false; filterSec.style.display = ''; }
            if (searchSec) searchSec.hidden = false;
        },

        showDetail: async function(order) {
            const id = this.state.identity;
            const els = this.getElements();
            
            if (els.listContainer) els.listContainer.hidden = true;
            
            const filterSec = document.getElementById('orderFilterSection');
            const searchSec = document.getElementById('orderSearchSection');
            if (filterSec) { filterSec.hidden = true; filterSec.style.display = 'none'; }
            if (searchSec) searchSec.hidden = true;

            if (els.detailContainer) {
                els.detailContainer.hidden = false;
                
                let contentWrap = els.detailContainer.querySelector('.order-detail-content-wrap') || 
                                  els.detailContainer.querySelector('[id$="DetailContent"]');
                
                if (!contentWrap && id === 'provider') {
                    contentWrap = document.createElement('div');
                    contentWrap.className = 'order-detail-content-wrap';
                    els.detailContainer.appendChild(contentWrap);
                }

                if (contentWrap) {
                    contentWrap.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></div>';
                    try {
                        const res = await fetch('../chi-tiet-hoa-don-tho-nha.html');
                        contentWrap.innerHTML = await res.text();
                        
                        const renderer = window.ThoNhaOrderDetailRenderer;
                        if (renderer) renderer.render(order, id, contentWrap);

                        if (window.ThoNhaOrderActions) {
                            const session = await DVQTApp.checkSession();
                            window.ThoNhaOrderActions.init(contentWrap, session, () => {
                                this.loadOrders(true);
                            });
                        }
                    } catch (err) {
                        contentWrap.innerHTML = '<div class="alert alert-danger">Lỗi nạp chi tiết.</div>';
                    }
                }
            }
        },

        bindEvents: function() {
            // Filter clicks
            ['all', 'new', 'doing', 'done'].forEach(f => {
                const el = document.getElementById('filter-' + f);
                if (el) el.onclick = () => {
                    this.state.filter = f;
                    this.state.selectedOrderId = null;
                    this.render();
                };
            });

            // Global Delegated Click (Only bind once)
            if (!document.body.dataset.orderManagerBound) {
                document.body.dataset.orderManagerBound = 'true';
                document.addEventListener('click', e => {
                    const btn = e.target.closest('[data-action]');
                    if (!btn) return;
                    
                    const action = btn.dataset.action;
                    const id = btn.dataset.id;

                    if (action === 'view-detail') {
                        e.preventDefault();
                        OrderManager.state.selectedOrderId = id;
                        const order = window.ThoNhaOrderStore.getOrders().find(o => String(o.id) === String(id));
                        if (order) OrderManager.showDetail(order);
                    } else if (action === 'back-to-list') {
                        e.preventDefault();
                        OrderManager.state.selectedOrderId = null;
                        OrderManager.showList();
                    }
                });
            }

            const els = this.getElements();
            if (els.refreshBtn) {
                els.refreshBtn.onclick = () => this.loadOrders(true);
            }

            // Deep link handling (from shell.js)
            if (window._pendingOrderId) {
                const pid = window._pendingOrderId;
                window._pendingOrderId = null;
                setTimeout(() => {
                    this.state.selectedOrderId = pid;
                    const order = window.ThoNhaOrderStore.getOrders().find(o => String(o.id) === String(pid));
                    if (order) this.showDetail(order);
                }, 600);
            }
        }
    };

    window.ThoNhaOrderManager = OrderManager;
    // Compatibility wrappers
    window.initCustomerOrders = () => OrderManager.init('customer');
    window.initProviderOrders = () => OrderManager.init('provider');

})();
