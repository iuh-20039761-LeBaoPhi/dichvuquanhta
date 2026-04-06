/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Khách hàng
 */
window.initCustomerOrders = function () {
    'use strict';

    if (window._customerOrdersInit) return;
    window._customerOrdersInit = true;

    var store = window.ThoNhaOrderStore;
    var viewUtils = window.ThoNhaOrderViewUtils;
    var ui = window.ThoNhaOrderUI;
    if (!store || !viewUtils || !ui) return console.error('[CustomerOrder] Missing dependencies!');

    var state = {
        filter: 'all',
        keyword: '',
        selectedOrderId: null,
        orders: [],
        isLoading: false
    };

    var profile = store.getCustomerProfile();
    var elements = {
        customerName: document.getElementById('customerName'),
        customerPhone: document.getElementById('customerPhone'),
        customerAddress: document.getElementById('customerAddress'),
        statTotal: document.getElementById('statTotal'),
        statNew: document.getElementById('statNew'),
        statProgress: document.getElementById('statProgress'),
        statDone: document.getElementById('statDone'),
        searchInput: document.getElementById('searchInput'),
        orderBody: document.getElementById('customerOrderBody'),
        mobileList: document.getElementById('customerMobileList'),
        emptyState: document.getElementById('customerEmptyState'),
        refreshBtn: document.getElementById('refreshOrdersBtn'),
        filterButtons: Array.prototype.slice.call(document.querySelectorAll('[data-filter]')),
        detailModal: document.getElementById('orderDetailModal'),
        detailBody: document.getElementById('orderDetailBody'),
        detailCode: document.getElementById('orderDetailCode')
    };

    function setLoadingState(isLoading) {
        state.isLoading = !!isLoading;
        if (!elements.orderBody || !elements.mobileList) return;
        if (state.isLoading) {
            elements.emptyState.hidden = true;
            elements.orderBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải dữ liệu Milestone...</td></tr>';
            elements.mobileList.innerHTML = '<article class="mobile-card loading">Đang tải dữ liệu Milestone...</article>';
        }
    }

    async function loadOrdersFromApi(showErrorAlert) {
        setLoadingState(true);
        try {
            const filteredRaw = await window.ThoNhaOrderService.getOrders('customer', profile);
            const providers = await DVQTApp.getProviders('nhacungcap_thonha');
            const providerMap = viewUtils.buildProviderMapByIds(providers, {});

            state.orders = viewUtils.sortByCreatedDesc(filteredRaw.map((row, index) => {
                return viewUtils.mapApiOrderBase(row, index, {
                    providerMapById: providerMap,
                    includeRaw: true,
                    customerNameFallback: profile.name,
                    customerPhoneFallback: profile.phone
                });
            }));

            if (state.orders.length && profile.name === 'Khách hàng') {
                profile.name = state.orders[0].customer.name || profile.name;
                bindProfile();
            }
        } catch (err) {
            console.error('[customer-order] API Error:', err);
            state.orders = [];
            if (showErrorAlert) alert('Không tải được dữ liệu đơn hàng.');
        } finally {
            setLoadingState(false);
            render();
        }
    }

    function render() {
        const orders = state.orders || [];
        const filtered = orders.filter(o => {
            const matchFilter = state.filter === 'all' || o.status === state.filter;
            if (!matchFilter) return false;
            if (!state.keyword) return true;
            const kw = state.keyword.toLowerCase();
            return (o.orderCode.includes(kw) || o.service.toLowerCase().includes(kw) || o.address.toLowerCase().includes(kw));
        });

        if (elements.statTotal) elements.statTotal.textContent = orders.length;
        if (elements.statNew) elements.statNew.textContent = orders.filter(o => o.status === 'new').length;
        if (elements.statProgress) elements.statProgress.textContent = orders.filter(o => o.status === 'confirmed' || o.status === 'doing').length;
        if (elements.statDone) elements.statDone.textContent = orders.filter(o => o.status === 'done').length;

        ui.renderList(filtered, 'customer', {
            body: elements.orderBody,
            mobile: elements.mobileList,
            empty: elements.emptyState
        });

        if (state.selectedOrderId && elements.detailBody) {
            const order = orders.find(o => o.id === state.selectedOrderId);
            if (order) {
                elements.detailBody.innerHTML = ui.renderDetails(order, 'customer', profile);
                if (elements.detailCode) elements.detailCode.textContent = order.orderCode;
            }
        }
    }

    function openOrderDetail(orderId) {
        state.selectedOrderId = orderId;
        render();
        if (elements.detailModal) {
            elements.detailModal.hidden = false;
            document.body.classList.add('detail-modal-open');
        }
    }

    function closeOrderDetail() {
        state.selectedOrderId = null;
        if (elements.detailModal) elements.detailModal.hidden = true;
        document.body.classList.remove('detail-modal-open');
    }

    async function handleCancelOrder(id, code) {
        if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng ' + code + '?')) return;
        const nowStr = new Date().toISOString().replace('T', ' ').split('.')[0];
        try {
            await DVQTApp.updateOrder(id, { ngayhuy: nowStr }, 'datlich_thonha');
            alert('Đã hủy đơn hàng thành công.');
            closeOrderDetail();
            loadOrdersFromApi(true);
        } catch (err) {
            alert('Lỗi khi hủy đơn: ' + err.message);
        }
    }

    function bindEvents() {
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', e => {
                state.keyword = e.target.value.trim();
                render();
            });
        }

        elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                state.filter = btn.dataset.filter || 'all';
                elements.filterButtons.forEach(b => b.classList.toggle('active', b === btn));
                render();
            });
        });

        document.addEventListener('click', e => {
            const viewBtn = e.target.closest('[data-action="view-detail"]');
            if (viewBtn) return openOrderDetail(viewBtn.dataset.id);

            const cancelBtn = e.target.closest('[data-action="cancel-order"]');
            if (cancelBtn) return handleCancelOrder(cancelBtn.dataset.id, cancelBtn.dataset.code);

            const closeBtn = e.target.closest('[data-action="close-detail"]');
            if (closeBtn) return closeOrderDetail();

            const modalOverlay = e.target.closest('#orderDetailModal');
            if (modalOverlay && e.target === modalOverlay) closeOrderDetail();
        });

        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', () => loadOrdersFromApi(true));
        }
    }

    function bindProfile() {
        if (elements.customerName) elements.customerName.textContent = profile.name || 'Khách hàng';
        if (elements.customerPhone) elements.customerPhone.textContent = profile.phone || 'Chưa cập nhật';
        if (elements.customerAddress) elements.customerAddress.textContent = profile.address || 'Địa chỉ';
    }

    bindProfile();
    bindEvents();
    loadOrdersFromApi(false);
};