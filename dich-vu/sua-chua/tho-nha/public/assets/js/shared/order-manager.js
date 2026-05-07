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
            initDone: false,
            currentPage: 1
        },

        init: function(identity) {
            this.state.identity = identity;
            this.state.initDone = true;

            const store = window.ThoNhaOrderStore;
            const ui = window.ThoNhaOrderUI;
            if (!store || !ui) return console.error('[OrderManager] Missing dependencies!');

            // Default filters to today
            const els = this.getElements();
            const listSec = els.listContainer;
            const today = new Date().toISOString().substring(0, 10);
            
            const fromDateInput = listSec ? listSec.querySelector('#orderFromDate') : document.getElementById('orderFromDate');
            const toDateInput = listSec ? listSec.querySelector('#orderToDate') : document.getElementById('orderToDate');
            if (fromDateInput && !fromDateInput.value) fromDateInput.value = today;
            if (toDateInput && !toDateInput.value) toDateInput.value = today;

            this.bindEvents();
            this.loadCategories();
            this.loadOrders(false);
        },

        getElements: function() {
            const id = this.state.identity;
            const prefix = id === 'customer' ? 'customer' : 'provider';
            const listSec = document.getElementById(prefix + 'ListSection');

            return {
                listContainer: listSec,
                detailContainer: document.getElementById(prefix + 'DetailSection'),
                // For Customer
                orderBody: listSec ? listSec.querySelector('#customerOrderBody') : document.getElementById('customerOrderBody'),
                mobileList: listSec ? listSec.querySelector('#customerMobileList') : document.getElementById('customerMobileList'),
                emptyState: listSec ? listSec.querySelector('#customerEmptyState') : document.getElementById('customerEmptyState'),
                // For Provider
                openBody: listSec ? listSec.querySelector('#openRequestBody') : document.getElementById('openRequestBody'),
                assignedBody: listSec ? listSec.querySelector('#assignedOrderBody') : document.getElementById('assignedOrderBody'),
                openMobileList: listSec ? listSec.querySelector('#openMobileList') : document.getElementById('openMobileList'),
                assignedMobileList: listSec ? listSec.querySelector('#assignedMobileList') : document.getElementById('assignedMobileList'),
                openEmpty: listSec ? listSec.querySelector('#openEmptyState') : document.getElementById('openEmptyState'),
                assignedEmpty: listSec ? listSec.querySelector('#assignedEmptyState') : document.getElementById('assignedEmptyState'),
                categorySelect: listSec ? listSec.querySelector('#orderCategoryFilter') : document.getElementById('orderCategoryFilter'),
                // Stats & Buttons
                refreshBtn: listSec ? listSec.querySelector('#refresh' + (id === 'customer' ? 'Customer' : 'Provider') + 'Btn') : document.getElementById('refresh' + (id === 'customer' ? 'Customer' : 'Provider') + 'Btn'),
                stats: {
                    all: listSec ? listSec.querySelector('#stat-all-count') : document.getElementById('stat-all-count'),
                    allMob: listSec ? listSec.querySelector('#stat-all-count-mob') : document.getElementById('stat-all-count-mob'),
                    new: listSec ? listSec.querySelector('#stat-new-count') : document.getElementById('stat-new-count'),
                    newMob: listSec ? listSec.querySelector('#stat-new-count-mob') : document.getElementById('stat-new-count-mob'),
                    confirmed: listSec ? listSec.querySelector('#stat-confirmed-count') : document.getElementById('stat-confirmed-count'),
                    confirmedMob: listSec ? listSec.querySelector('#stat-confirmed-count-mob') : document.getElementById('stat-confirmed-count-mob'),
                    doing: listSec ? listSec.querySelector('#stat-doing-count') : document.getElementById('stat-doing-count'),
                    doingMob: listSec ? listSec.querySelector('#stat-doing-count-mob') : document.getElementById('stat-doing-count-mob'),
                    done: listSec ? listSec.querySelector('#stat-done-count') : document.getElementById('stat-done-count'),
                    doneMob: listSec ? listSec.querySelector('#stat-done-count-mob') : document.getElementById('stat-done-count-mob'),
                    cancel: listSec ? listSec.querySelector('#stat-cancel-count') : document.getElementById('stat-cancel-count'),
                    cancelMob: listSec ? listSec.querySelector('#stat-cancel-count-mob') : document.getElementById('stat-cancel-count-mob'),
                    open: listSec ? listSec.querySelector('#statOpen') : document.getElementById('statOpen'),
                    openMob: listSec ? listSec.querySelector('#statOpenMob') : document.getElementById('statOpenMob'),
                    assigned: listSec ? listSec.querySelector('#statAssigned') : document.getElementById('statAssigned')
                }
            };
        },

        loadCategories: async function() {
            const els = this.getElements();
            const select = els.categorySelect;
            if (!select || select.dataset.loaded) return;
            if (!window.DVQTKrud) return;

            try {
                const cats = await window.DVQTKrud.listTable('danhmuc_thonha', { limit: 1000 });
                const list = Array.isArray(cats) ? cats.slice() : [];
                list.sort((a, b) => {
                    const aOrder = Number(a.thu_tu || 0);
                    const bOrder = Number(b.thu_tu || 0);
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    return String(a.ten_danhmuc || '').localeCompare(String(b.ten_danhmuc || ''), 'vi');
                });

                const options = ['<option value="">Tất cả danh mục</option>']
                    .concat(list.map(cat => `<option value="${cat.id}">${cat.ten_danhmuc || ('Danh mục #' + cat.id)}</option>`));
                select.innerHTML = options.join('');
                select.dataset.loaded = '1';
            } catch (err) {
                console.error('[OrderManager] Load categories failed:', err);
            }
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
            let orders = store.getOrders() || [];

            // 1. Lấy giá trị các ô lọc
            const listSec = els.listContainer;
            const fromDateInput = listSec ? listSec.querySelector('#orderFromDate') : document.getElementById('orderFromDate');
            const toDateInput = listSec ? listSec.querySelector('#orderToDate') : document.getElementById('orderToDate');
            const searchQueryInput = listSec ? listSec.querySelector('#orderSearchQuery') : document.getElementById('orderSearchQuery');

            const fromDate = fromDateInput ? fromDateInput.value : '';
            const toDate = toDateInput ? toDateInput.value : '';
            const q = searchQueryInput ? searchQueryInput.value.toLowerCase().trim() : '';
            const catSelect = listSec ? listSec.querySelector('#orderCategoryFilter') : document.getElementById('orderCategoryFilter');
            const catId = catSelect ? String(catSelect.value || '').trim() : '';

            // 2. Lọc theo Ngày (Ưu tiên createdAt, fallback dates.ordered)
            let baseOrders = orders;
            if (fromDate) {
                baseOrders = baseOrders.filter(o => {
                    const oDate = o.createdAt ? o.createdAt.substring(0, 10) : (o.dates && o.dates.ordered ? o.dates.ordered.substring(0, 10) : '');
                    return oDate >= fromDate;
                });
            }
            if (toDate) {
                baseOrders = baseOrders.filter(o => {
                    const oDate = o.createdAt ? o.createdAt.substring(0, 10) : (o.dates && o.dates.ordered ? o.dates.ordered.substring(0, 10) : '');
                    return oDate <= toDate;
                });
            }

            // 3. Lọc theo Từ khóa (Mã đơn, Tên dịch vụ, Tên khách hàng, Tên thợ)
            if (q) {
                baseOrders = baseOrders.filter(o => {
                    const orderCode = String(o.orderCode || '').toLowerCase();
                    const service = String(o.service || o.fullService || '').toLowerCase();
                    const clientName = o.customer && o.customer.name ? String(o.customer.name).toLowerCase() : '';
                    const providerName = o.provider && o.provider.name ? String(o.provider.name).toLowerCase() : '';
                    
                    return orderCode.includes(q) || service.includes(q) || clientName.includes(q) || providerName.includes(q);
                });
            }

            // 3b. Lọc theo Danh mục
            if (catId) {
                baseOrders = baseOrders.filter(o => {
                    const rawCatId = o && o._raw ? String(o._raw.id_danhmuc || '') : '';
                    return rawCatId && rawCatId === catId;
                });
            }

            // 4. Cập nhật thống kê số lượng (Stats) TRÊN DANH SÁCH ĐÃ QUA BỘ LỌC NGÀY/KÝ TỰ
            if (id === 'customer') {
                if (els.stats.all) els.stats.all.textContent = baseOrders.length;
                if (els.stats.allMob) els.stats.allMob.textContent = baseOrders.length;
                if (els.stats.new) els.stats.new.textContent = baseOrders.filter(o => o.status === 'new').length;
                if (els.stats.newMob) els.stats.newMob.textContent = baseOrders.filter(o => o.status === 'new').length;
                if (els.stats.confirmed) els.stats.confirmed.textContent = baseOrders.filter(o => o.status === 'confirmed').length;
                if (els.stats.confirmedMob) els.stats.confirmedMob.textContent = baseOrders.filter(o => o.status === 'confirmed').length;
                if (els.stats.doing) els.stats.doing.textContent = baseOrders.filter(o => o.status === 'doing' || o.status === 'working').length;
                if (els.stats.doingMob) els.stats.doingMob.textContent = baseOrders.filter(o => o.status === 'doing' || o.status === 'working').length;
                if (els.stats.done) els.stats.done.textContent = baseOrders.filter(o => o.status === 'done').length;
                if (els.stats.doneMob) els.stats.doneMob.textContent = baseOrders.filter(o => o.status === 'done').length;
                if (els.stats.cancel) els.stats.cancel.textContent = baseOrders.filter(o => o.status === 'cancel').length;
                if (els.stats.cancelMob) els.stats.cancelMob.textContent = baseOrders.filter(o => o.status === 'cancel').length;
            } else {
                if (els.stats.all) els.stats.all.textContent = baseOrders.length;
                if (els.stats.allMob) els.stats.allMob.textContent = baseOrders.length;
                if (els.stats.open) els.stats.open.textContent = baseOrders.filter(o => o.status === 'new').length;
                if (els.stats.openMob) els.stats.openMob.textContent = baseOrders.filter(o => o.status === 'new').length;
                if (els.stats.confirmed) els.stats.confirmed.textContent = baseOrders.filter(o => o.status === 'confirmed').length;
                if (els.stats.confirmedMob) els.stats.confirmedMob.textContent = baseOrders.filter(o => o.status === 'confirmed').length;
                if (els.stats.doing) els.stats.doing.textContent = baseOrders.filter(o => o.status === 'doing' || o.status === 'working').length;
                if (els.stats.doingMob) els.stats.doingMob.textContent = baseOrders.filter(o => o.status === 'doing' || o.status === 'working').length;
                if (els.stats.done) els.stats.done.textContent = baseOrders.filter(o => o.status === 'done').length;
                if (els.stats.doneMob) els.stats.doneMob.textContent = baseOrders.filter(o => o.status === 'done').length;
                if (els.stats.cancel) els.stats.cancel.textContent = baseOrders.filter(o => o.status === 'cancel').length;
                if (els.stats.cancelMob) els.stats.cancelMob.textContent = baseOrders.filter(o => o.status === 'cancel').length;
            }

            // 5. Lọc theo Tab trạng thái
            orders = baseOrders;
            const filter = this.state.filter;
            if (filter !== 'all') {
                orders = orders.filter(o => {
                    if (filter === 'doing') return (o.status === 'doing' || o.status === 'working');
                    return o.status === filter;
                });
            }


            // 6. Tính tổng tiền
            const totalMoney = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
            const totalMoneyStr = window.ThoNhaOrderViewUtils ? window.ThoNhaOrderViewUtils.formatCurrencyVn(totalMoney) : (totalMoney + ' đ');

            const custTotalEl = document.getElementById('customerTotalMoney');
            const provTotalEl = document.getElementById('providerTotalMoney');
            if (custTotalEl) custTotalEl.textContent = totalMoneyStr;
            if (provTotalEl) provTotalEl.textContent = totalMoneyStr;

            // 7. Phân trang: 7 đơn 1 trang
            const itemsPerPage = 7;
            const totalOrders = orders.length;
            const totalPages = Math.ceil(totalOrders / itemsPerPage) || 1;
            
            if (this.state.currentPage > totalPages) {
                this.state.currentPage = totalPages;
            }
            if (this.state.currentPage < 1) {
                this.state.currentPage = 1;
            }

            const startIndex = (this.state.currentPage - 1) * itemsPerPage;
            const paginatedOrders = orders.slice(startIndex, startIndex + itemsPerPage);

            // 8. Đổ dữ liệu ra UI
            if (id === 'customer') {
                ui.renderList(paginatedOrders, 'customer', {
                    body: els.orderBody,
                    mobile: els.mobileList,
                    empty: els.emptyState
                });
            } else {
                ui.renderList(paginatedOrders, 'provider', {
                    body: els.assignedBody,
                    mobile: els.assignedMobileList,
                    empty: els.assignedEmpty
                });
            }

            // 9. Vẽ thanh phân trang
            this.renderPagination(totalPages);

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

        renderPagination: function(totalPages) {
            const id = this.state.identity;
            const pagId = id === 'customer' ? 'customerPagination' : 'providerPagination';
            const pagWrapId = id === 'customer' ? 'customerPaginationWrap' : 'providerPaginationWrap';
            
            const pagEl = document.getElementById(pagId);
            const wrapEl = document.getElementById(pagWrapId);
            if (!pagEl) return;

            if (totalPages <= 1) {
                if (wrapEl) wrapEl.style.display = 'none';
                pagEl.innerHTML = '';
                return;
            }
            if (wrapEl) wrapEl.style.display = 'flex';

            let html = '';
            
            // Prev button
            html += `<li class="page-item ${this.state.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="ThoNhaOrderManager.changePage(${this.state.currentPage - 1}); return false;" style="border-radius:8px; border:none; color:${this.state.currentPage === 1 ? '#cbd5e1' : '#10b981'}; background:#f8fafc; font-weight:600;"><i class="fas fa-chevron-left"></i></a>
            </li>`;

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                const isActive = this.state.currentPage === i;
                html += `<li class="page-item ${isActive ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="ThoNhaOrderManager.changePage(${i}); return false;" style="border-radius:8px; border:none; margin:0 3px; font-weight:700; ${isActive ? 'background:#10b981; color:#fff; box-shadow:0 4px 6px -1px rgba(16,185,129,0.2);' : 'background:#f8fafc; color:#475569;'}">${i}</a>
                </li>`;
            }

            // Next button
            html += `<li class="page-item ${this.state.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="ThoNhaOrderManager.changePage(${this.state.currentPage + 1}); return false;" style="border-radius:8px; border:none; color:${this.state.currentPage === totalPages ? '#cbd5e1' : '#10b981'}; background:#f8fafc; font-weight:600;"><i class="fas fa-chevron-right"></i></a>
            </li>`;

            pagEl.innerHTML = html;
        },

        changePage: function(page) {
            this.state.currentPage = page;
            this.render();
        },

        bindEvents: function() {
            const els = this.getElements();
            const listSec = els.listContainer;

            // Filter clicks
            ['all', 'new', 'confirmed', 'doing', 'done', 'cancel'].forEach(f => {
                const el = listSec ? listSec.querySelector('#filter-' + f) : document.getElementById('filter-' + f);
                const elMob = listSec ? listSec.querySelector('#filter-' + f + '-mob') : document.getElementById('filter-' + f + '-mob');
                
                const clickHandler = (e) => {
                    if (e) e.preventDefault();
                    this.state.filter = f;
                    this.state.selectedOrderId = null;
                    this.state.currentPage = 1;
                    
                    const filterSec = listSec ? listSec.querySelector('#orderFilterSection') : document.getElementById('orderFilterSection');
                    if (filterSec) {
                        filterSec.querySelectorAll('.nav-link, .dropdown-item').forEach(btn => btn.classList.remove('active'));
                    }
                    if (el) el.classList.add('active');
                    if (elMob) elMob.classList.add('active');

                    // Cập nhật text của Dropdown Mobile
                    const currentText = listSec ? listSec.querySelector('#currentStatusText') : document.getElementById('currentStatusText');
                    const textMap = { 
                        'all': 'Tất cả', 
                        'new': 'Đang xác nhận', 
                        'confirmed': 'Đã nhận', 
                        'doing': 'Đã bắt đầu', 
                        'done': 'Đã hoàn thành', 
                        'cancel': 'Đã hủy' 
                    };
                    if (currentText && textMap[f]) currentText.textContent = textMap[f];

                    this.render();
                };

                if (el) el.onclick = clickHandler;
                if (elMob) elMob.onclick = clickHandler;
            });

            const fromDateInput = listSec ? listSec.querySelector('#orderFromDate') : document.getElementById('orderFromDate');
            const toDateInput = listSec ? listSec.querySelector('#orderToDate') : document.getElementById('orderToDate');
            const searchQueryInput = listSec ? listSec.querySelector('#orderSearchQuery') : document.getElementById('orderSearchQuery');

            if (fromDateInput) fromDateInput.onchange = () => { this.state.currentPage = 1; this.render(); };
            if (toDateInput) toDateInput.onchange = () => { this.state.currentPage = 1; this.render(); };
            if (searchQueryInput) searchQueryInput.onkeyup = () => { this.state.currentPage = 1; this.render(); };
            if (els.categorySelect) els.categorySelect.onchange = () => { this.state.currentPage = 1; this.render(); };

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
