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
        isLoading: false
    };

    var elements = {
        listContainer: document.getElementById('adminListSection'),
        detailContainer: document.getElementById('adminDetailSection'),
        ordersTableBody: document.getElementById('ordersTableBody'),
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
            displayOrders(orders);
        } catch (err) {
            console.error('[admin-order] API Error:', err);
        } finally {
            state.isLoading = false;
        }
    }

    function displayOrders(orders) {
        if (!elements.ordersTableBody) return;
        ui.renderList(orders, 'admin', {
            body: elements.ordersTableBody,
            empty: null // Milestone Admin logic
        });
        
        // Handle current selection (if any)
        if (state.selectedOrderId) {
            const order = orders.find(o => o.id === state.selectedOrderId);
            if (order) {
                showDetail(order);
            } else {
                state.selectedOrderId = null;
                showList();
            }
        } else {
            showList();
        }
    }

    function showList() {
        if (elements.listContainer) elements.listContainer.hidden = false;
        if (elements.detailContainer) elements.detailContainer.hidden = true;
    }

    async function showDetail(order) {
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
                const search = elements.searchInput.value.toLowerCase();
                const status = elements.statusFilter.value;
                const filtered = allOrders.filter(o => {
                    const matchStatus = !status || o.status === status;
                    const matchSearch = !search || 
                        (o.orderCode && o.orderCode.toLowerCase().includes(search)) || 
                        (o.customer && o.customer.phone && o.customer.phone.includes(search)) || 
                        (o.customer && o.customer.name && o.customer.name.toLowerCase().includes(search)) ||
                        (o.service && o.service.toLowerCase().includes(search));
                    return matchStatus && matchSearch;
                });
                displayOrders(filtered);
            });
        }
        
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', loadData);
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