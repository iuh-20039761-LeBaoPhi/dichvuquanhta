/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Admin (Thợ Nhà)
 */
window.initOrders = function() {
    'use strict';

    if (window.ordersInitialized) return;
    window.ordersInitialized = true;
    
    var store = window.ThoNhaOrderStore;
    var ui = window.ThoNhaOrderUI;
    if (!store || !ui) return console.error('[AdminOrder] Missing dependencies!');

    var state = {
        selectedOrderId: null,
        isLoading: false,
        currentPage: 1,
        pageSize: 7,
        filteredOrders: [],
        baseOrders: [],
        filter: 'all'
    };

    var elements = {
        listContainer: document.getElementById('adminListSection'),
        detailContainer: document.getElementById('adminDetailSection'),
        ordersTableBody: document.getElementById('ordersTableBody'),
        mobileList: document.getElementById('adminMobileList'),
        pagination: document.getElementById('paginationContainer'),
        refreshBtn: document.getElementById('refreshAdminBtn'),
        fromDate: document.getElementById('orderFromDate'),
        toDate: document.getElementById('orderToDate'),
        searchQuery: document.getElementById('orderSearchQuery'),
        categorySelect: document.getElementById('orderCategoryFilter')
    };

    async function loadCategories() {
        if (!elements.categorySelect || elements.categorySelect.dataset.loaded) return;
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
            elements.categorySelect.innerHTML = options.join('');
            elements.categorySelect.dataset.loaded = '1';
        } catch (err) {
            console.error('[admin-order] Load categories failed:', err);
        }
    }

    async function loadData() {
        state.isLoading = true;
        if (elements.ordersTableBody) elements.ordersTableBody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';
        
        try {
            const orders = await window.loadAllOrders(); // From shell.js logic
            state.baseOrders = orders || [];
            
            // Set default dates if empty
            const today = new Date().toISOString().substring(0, 10);
            if (elements.fromDate && !elements.fromDate.value) elements.fromDate.value = today;
            if (elements.toDate && !elements.toDate.value) elements.toDate.value = today;

            await loadCategories();
            applyFilter();
        } catch (err) {
            console.error('[admin-order] API Error:', err);
        } finally {
            state.isLoading = false;
        }
    }

    function applyFilter() {
        let list = state.baseOrders || [];
        
        // 1. Lọc theo Ngày
        const fromVal = elements.fromDate ? elements.fromDate.value : '';
        const toVal = elements.toDate ? elements.toDate.value : '';
        
        if (fromVal) {
            const fd = new Date(fromVal + 'T00:00:00');
            list = list.filter(o => {
                const d = o.createdAt || o.created_at;
                return d && new Date(d) >= fd;
            });
        }
        if (toVal) {
            const td = new Date(toVal + 'T23:59:59');
            list = list.filter(o => {
                const d = o.createdAt || o.created_at;
                return d && new Date(d) <= td;
            });
        }
        
        // 2. Lọc theo Từ khóa
        const q = elements.searchQuery ? elements.searchQuery.value.trim().toLowerCase() : '';
        if (q) {
            list = list.filter(o => {
                const code = String(o.orderCode || '').toLowerCase();
                const client = o.customer && o.customer.name ? String(o.customer.name).toLowerCase() : '';
                const svc = String(o.service || '').toLowerCase();
                return code.includes(q) || client.includes(q) || svc.includes(q);
            });
        }

        // 2b. Lọc theo Danh mục
        const catId = elements.categorySelect ? String(elements.categorySelect.value || '').trim() : '';
        if (catId) {
            list = list.filter(o => {
                const rawCatId = o && o._raw ? String(o._raw.id_danhmuc || '') : '';
                return rawCatId && rawCatId === catId;
            });
        }
        
        // Cập nhật thống kê
        updateStats(list);

        // Tính tổng tiền
        const totalMoney = list.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
        const totalMoneyStr = window.ThoNhaOrderViewUtils ? window.ThoNhaOrderViewUtils.formatCurrencyVn(totalMoney) : (totalMoney + ' đ');
        const adminTotalEl = document.getElementById('adminTotalMoney');
        if (adminTotalEl) adminTotalEl.textContent = totalMoneyStr;
        
        // 3. Lọc theo Tab trạng thái
        if (state.filter !== 'all') {
            list = list.filter(o => {
                if (state.filter === 'doing') return (o.status === 'doing' || o.status === 'working');
                return o.status === state.filter;
            });
        }
        
        state.filteredOrders = list;
        state.currentPage = 1;
        displayOrders();
    }

    function updateStats(list) {
        const counts = {
            all: list.length,
            new: list.filter(o => o.status === 'new').length,
            confirmed: list.filter(o => o.status === 'confirmed').length,
            doing: list.filter(o => o.status === 'doing' || o.status === 'working').length,
            done: list.filter(o => o.status === 'done').length,
            cancel: list.filter(o => o.status === 'cancel').length
        };

        const map = {
            'stat-all-count': counts.all,
            'stat-all-count-mob': counts.all,
            'statOpen': counts.new,
            'statOpenMob': counts.new,
            'stat-confirmed-count': counts.confirmed,
            'stat-confirmed-count-mob': counts.confirmed,
            'stat-doing-count': counts.doing,
            'stat-doing-count-mob': counts.doing,
            'stat-done-count': counts.done,
            'stat-done-count-mob': counts.done,
            'stat-cancel-count': counts.cancel,
            'stat-cancel-count-mob': counts.cancel
        };

        for (const id in map) {
            const el = document.getElementById(id);
            if (el) el.textContent = map[id];
        }
    }

    function displayOrders() {
        if (!elements.ordersTableBody) return;
        
        const start = (state.currentPage - 1) * state.pageSize;
        const end = start + state.pageSize;
        const pagedItems = state.filteredOrders.slice(start, end);

        ui.renderList(pagedItems, 'admin', {
            body: elements.ordersTableBody,
            mobile: elements.mobileList,
            empty: null
        });

        renderPagination();
        
        // Handle current selection (if any)
        if (state.selectedOrderId) {
            const order = pagedItems.find(o => o.id === state.selectedOrderId);
            if (order) {
                showDetail(order);
            }
        }
    }

    function renderPagination() {
        if (!elements.pagination) return;
        const totalPages = Math.ceil(state.filteredOrders.length / state.pageSize);
        
        if (totalPages <= 1) {
            elements.pagination.innerHTML = '';
            return;
        }

        let html = '<ul class="pagination pagination-sm">';
        
        // Prev
        html += `<li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${state.currentPage - 1}">&laquo;</a>
        </li>`;

        // Pages
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
                html += `<li class="page-item ${state.currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>`;
            } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Next
        html += `<li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${state.currentPage + 1}">&raquo;</a>
        </li>`;

        html += '</ul>';
        elements.pagination.innerHTML = html;
    }

    function showList() {
        const filterSec = document.getElementById('orderFilterSection');
        if (filterSec) filterSec.style.display = '';
        if (elements.listContainer) elements.listContainer.hidden = false;
        if (elements.detailContainer) elements.detailContainer.hidden = true;
    }

    async function showDetail(order) {
        const filterSec = document.getElementById('orderFilterSection');
        if (filterSec) filterSec.style.display = 'none';
        if (elements.listContainer) elements.listContainer.hidden = true;
        if (elements.detailContainer) {
            elements.detailContainer.hidden = false;
            await ui.renderDetails(order, 'admin', elements.detailContainer);
        }
    }

    function bindEvents() {
        // Date filters & Search inputs
        if (elements.fromDate) elements.fromDate.addEventListener('change', applyFilter);
        if (elements.toDate) elements.toDate.addEventListener('change', applyFilter);
        if (elements.searchQuery) elements.searchQuery.addEventListener('keyup', applyFilter);
        if (elements.categorySelect) elements.categorySelect.addEventListener('change', applyFilter);
        
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', loadData);
        }

        // Tab status clicks
        ['all', 'new', 'confirmed', 'doing', 'done', 'cancel'].forEach(f => {
            const el = document.getElementById('filter-' + f);
            const elMob = document.getElementById('filter-' + f + '-mob');
            
            const clickHandler = (e) => {
                if (e) e.preventDefault();
                state.filter = f;
                
                const filterSec = document.getElementById('orderFilterSection');
                if (filterSec) {
                    filterSec.querySelectorAll('.nav-link, .dropdown-item').forEach(btn => btn.classList.remove('active'));
                }
                if (el) el.classList.add('active');
                if (elMob) elMob.classList.add('active');

                // Update mobile text
                const currentText = document.getElementById('currentStatusText');
                const textMap = { 
                    'all': 'Tất cả', 
                    'new': 'Đang xác nhận', 
                    'confirmed': 'Đã nhận', 
                    'doing': 'Đã bắt đầu', 
                    'done': 'Đã hoàn thành', 
                    'cancel': 'Đã hủy' 
                };
                if (currentText && textMap[f]) currentText.textContent = textMap[f];

                applyFilter();
            };

            if (el) el.addEventListener('click', clickHandler);
            if (elMob) elMob.addEventListener('click', clickHandler);
        });

        // Pagination
        if (elements.pagination) {
            elements.pagination.addEventListener('click', e => {
                const link = e.target.closest('.page-link');
                if (!link || e.target.closest('.disabled')) return;
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (page > 0) {
                    state.currentPage = page;
                    displayOrders();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        // Action delegation
        document.addEventListener('click', e => {
            const viewBtn = e.target.closest('[data-action="view-detail"]');
            if (viewBtn) {
                e.preventDefault();
                state.selectedOrderId = viewBtn.dataset.id;
                const order = state.baseOrders.find(o => String(o.id) === String(state.selectedOrderId));
                if (order) showDetail(order);
                return;
            }

            const backToList = e.target.closest('.back-btn, [data-action="back-to-list"]');
            if (backToList) {
                e.preventDefault();
                state.selectedOrderId = null;
                showList();
                return;
            }

            // Update status actions from Detail Hero or anywhere
            const updateStatusBtn = e.target.closest('[data-action="update-status"]');
            if (updateStatusBtn) {
                e.preventDefault();
                if (typeof window.updateOrderStatus === 'function') {
                    window.updateOrderStatus(updateStatusBtn.dataset.id);
                }
            }
        });
    }

    bindEvents();
    loadData();
};