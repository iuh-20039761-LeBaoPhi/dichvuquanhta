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
        pageSize: 10,
        filteredOrders: []
    };

    var elements = {
        listContainer: document.getElementById('adminListSection'),
        detailContainer: document.getElementById('adminDetailSection'),
        ordersTableBody: document.getElementById('ordersTableBody'),
        mobileList: document.getElementById('adminMobileList'),
        pagination: document.getElementById('paginationContainer'),
        refreshBtn: document.getElementById('refreshBtn'),
        filterBtn: document.getElementById('filterBtn'),
        searchInput: document.getElementById('searchInput'),
        statusFilter: document.getElementById('statusFilter')
    };

    async function loadData() {
        state.isLoading = true;
        if (elements.ordersTableBody) elements.ordersTableBody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';
        
        try {
            const orders = await window.loadAllOrders(); // From shell.js logic
            state.filteredOrders = orders;
            state.currentPage = 1;
            displayOrders();
        } catch (err) {
            console.error('[admin-order] API Error:', err);
        } finally {
            state.isLoading = false;
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
        // Filter & Search
        if (elements.filterBtn) {
            elements.filterBtn.addEventListener('click', function() {
                const search = (elements.searchInput?.value || '').toLowerCase();
                const status = elements.statusFilter?.value;
                state.filteredOrders = allOrders.filter(o => {
                    const matchStatus = !status || o.status === status;
                    const matchSearch = !search || 
                        (o.orderCode && o.orderCode.toLowerCase().includes(search)) || 
                        (o.customer && o.customer.phone && o.customer.phone.includes(search)) || 
                        (o.customer && o.customer.name && o.customer.name.toLowerCase().includes(search)) ||
                        (o.service && o.service.toLowerCase().includes(search));
                    return matchStatus && matchSearch;
                });
                state.currentPage = 1;
                displayOrders();
            });
        }
        
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', loadData);
        }

        // Custom Dropdown click
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

        const filterMenu = document.getElementById('statusFilterMenu');
        const filterBtnDisplay = document.getElementById('statusFilterBtn');
        const filterInput = document.getElementById('statusFilter');

        if (filterMenu && filterBtnDisplay && filterInput) {
            filterMenu.addEventListener('click', e => {
                const item = e.target.closest('.dropdown-item');
                if (!item) return;
                e.preventDefault();

                const value = item.dataset.value;
                const text = item.textContent;

                // Update UI & Input
                filterInput.value = value;
                filterBtnDisplay.textContent = text;
                
                // Active class
                filterMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');

                // Trigger filter
                if (elements.filterBtn) elements.filterBtn.click();
            });
        }

        // Action delegation
        document.addEventListener('click', e => {
            const viewBtn = e.target.closest('[data-action="view-detail"]');
            if (viewBtn) {
                e.preventDefault();
                state.selectedOrderId = viewBtn.dataset.id;
                const order = allOrders.find(o => o.id === state.selectedOrderId);
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