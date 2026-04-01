/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Khách hàng
 */
window.initCustomerOrders = function() {
    'use strict';
    
    // Ngăn chặn chạy nhiều lần khi chuyển tab
    if (window._customerOrdersInit) return;
    window._customerOrdersInit = true;

    var store = window.ThoNhaOrderStore;
    if (!store) return;
    var viewUtils = window.ThoNhaOrderViewUtils;
    if (!viewUtils) return;

    var STATUS_CLASS_MAP = {
        new: 'status-new',
        confirmed: 'status-confirmed',
        doing: 'status-doing',
        done: 'status-done',
        cancel: 'status-cancel'
    };

    var SUBSIDY_RATE = 0.05;
    var KRUD_SCRIPT_URL = window.BD_KRUD_SCRIPT_URL || 'https://api.dvqt.vn/js/krud.js';
    var KRUD_TABLE = window.BD_KRUD_TABLE || 'datlich_thonha';
    var PROVIDER_TABLE = window.BD_PROVIDER_TABLE || 'nhacungcap_thonha';

    var state = {
        filter: 'all',
        keyword: '',
        selectedOrderId: null,
        costOrderId: null,
        orders: [],
        isLoading: false
    };

    var profile = store.getCustomerProfile();
    var queryParams = new URLSearchParams(window.location.search || '');
    var queryPhone = String(queryParams.get('phone') || '').trim();
    if (queryPhone) {
        profile.phone = queryPhone;
    }
    var queryName = String(queryParams.get('name') || '').trim();
    if (queryName) {
        profile.name = queryName;
    }

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
        detailCode: document.getElementById('orderDetailCode'),
        costModal: document.getElementById('costInputModal'),
        costInput: document.getElementById('actualCostInput'),
        submitCostBtn: document.getElementById('submitCostBtn')
    };

    var escapeHtml = viewUtils.escapeHtml;
    var toDigits = viewUtils.toDigits;
    var sortByCreatedDesc = viewUtils.sortByCreatedDesc;
    var formatDateTime = viewUtils.formatDateTime;
    var formatCurrency = viewUtils.formatCurrencyVn;
    var getProviderIdFromOrderRow = viewUtils.getProviderIdFromOrderRow;
    var buildProviderMapByIds = viewUtils.buildProviderMapByIds;
    var mapApiOrderBase = viewUtils.mapApiOrderBase;
    var buildStatusBadge = viewUtils.buildStatusBadge;
    var buildDetailActionButton = viewUtils.buildDetailActionButton;
    var buildDetailRow = viewUtils.buildDetailRow;

    /**
     * Hiển thị hoặc ẩn trạng thái đang tải dữ liệu.
     * @param {boolean} isLoading - Trạng thái loading.
     */
    function setLoadingState(isLoading) {
        state.isLoading = !!isLoading;
        if (!elements.orderBody || !elements.mobileList) return;

        if (state.isLoading) {
            elements.emptyState.hidden = true;
            elements.orderBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải dữ liệu từ API...</td></tr>';
            elements.mobileList.innerHTML = '<article class="mobile-card loading">Đang tải dữ liệu từ API...</article>';
        }
    }

    /**
     * Lấy đối tượng Helper KRUD từ window.
     * @returns {Object} Đối tượng ThoNhaKrud.
     */
    function getKrudHelper() {
        if (!window.ThoNhaKrud) {
            throw new Error('Không tải được helper KRUD');
        }
        return window.ThoNhaKrud;
    }

    /**
     * Tải toàn bộ các dòng từ một bảng.
     * @param {string} tableName - Tên bảng.
     * @returns {Promise<Array>} Danh sách dòng dữ liệu thô.
     */
    async function fetchTableRows(tableName) {
        return getKrudHelper().listTable(tableName, null, KRUD_SCRIPT_URL);
    }

    /**
     * Tải thông tin các nhà cung cấp dựa trên một tập hợp ID.
     * @param {Object} providerIdSet - Object map chứa các ID nhà cung cấp { id: true }.
     * @returns {Promise<Object>} Map thông tin nhà cung cấp { id: obj }.
     */
    async function fetchProviderMapByIds(providerIdSet) {
        var ids = Object.keys(providerIdSet || {});
        if (!ids.length) return {};

        var rows = await fetchTableRows(PROVIDER_TABLE);
        return buildProviderMapByIds(rows, providerIdSet);
    }

    /**
     * Ánh xạ một dòng dữ liệu API thô thành đối tượng đơn hàng chuẩn cho Khách hàng.
     * @param {Object} row - Dòng dữ liệu thô.
     * @param {number} index - Chỉ số dòng.
     * @param {Object} providerMapById - Map thông tin nhà cung cấp.
     * @returns {Object} Đơn hàng chuẩn hoá.
     */
    function mapApiOrder(row, index, providerMapById) {
        return mapApiOrderBase(row, index, {
            providerMapById: providerMapById,
            customerNameFallback: profile.name,
            customerPhoneFallback: profile.phone,
            updatedAtFields: ['updated_at', 'updatedAt'],
            defaultStatus: 'new',
            includeRaw: true
        });
    }

    /**
     * Cập nhật thông tin profile khách hàng (tên, sđt) nếu chưa có thông tin đầy đủ.
     * @param {Array} orders - Danh sách đơn hàng đã tải.
     */
    function updateProfileFromOrders(orders) {
        if (!orders || !orders.length) return;
        var first = orders[0] || {};
        var customer = first.customer || {};

        if ((!profile.name || profile.name === 'Khách hàng') && customer.name) {
            profile.name = customer.name;
        }

        if (!profile.phone && customer.phone) {
            profile.phone = customer.phone;
        }

        if (!profile.address && first.address) {
            profile.address = first.address;
        }

        bindProfile();
    }

    /**
     * Tải đơn hàng từ API lọc theo số điện thoại (Digits).
     * @param {string} phoneDigits - Chuỗi số điện thoại chỉ chứa số.
     */
    async function fetchRemoteOrdersByPhone(phoneDigits) {
        var rows = await fetchTableRows(KRUD_TABLE);
        var filtered = rows;

        if (phoneDigits) {
            filtered = rows.filter(function (row) {
                var rowPhone = row.sodienthoai || row.customer_phone || row.phone || '';
                return toDigits(rowPhone) === phoneDigits;
            });
        }

        var providerIdSet = {};
        filtered.forEach(function (row) {
            var providerId = getProviderIdFromOrderRow(row);
            if (providerId) providerIdSet[providerId] = true;
        });

        var providerMapById = {};
        try {
            providerMapById = await fetchProviderMapByIds(providerIdSet);
        } catch (err) {
            console.warn('[customer-order] Không tải được bảng nhà cung cấp:', err);
        }

        return sortByCreatedDesc(filtered.map(function (row, index) {
            return mapApiOrder(row, index, providerMapById);
        }));
    }

    /**
     * Lấy danh sách đơn hàng hiện tại trong state.
     * @returns {Array} List đơn hàng.
     */
    function getCurrentOrders() {
        return Array.isArray(state.orders) ? state.orders : [];
    }

    /**
     * Thực hiện tải dữ liệu từ API và cập nhật state/UI.
     * @param {boolean} showErrorAlert - Có hiển thị thông báo nếu lỗi.
     */
    async function loadOrdersFromApi(showErrorAlert) {
        setLoadingState(true);
        var phoneDigits = toDigits(profile.phone);

        try {
            var remoteOrders = await fetchRemoteOrdersByPhone(phoneDigits);
            state.orders = remoteOrders;
            updateProfileFromOrders(remoteOrders);
        } catch (err) {
            console.error('[customer-order] Không tải được dữ liệu API:', err);
            state.orders = [];
            if (showErrorAlert) {
                alert('Không tải được dữ liệu từ api.dvqt.vn. Vui lòng thử lại sau.');
            }
        } finally {
            setLoadingState(false);
            render();
        }
    }

    /**
     * Tạo nhãn trạng thái HTML cho khách hàng.
     * @param {string} status - Trạng thái đơn hàng.
     */
    function statusBadge(status) {
        return buildStatusBadge(status, store.statusMeta, STATUS_CLASS_MAP);
    }

    /**
     * Lấy chi phí đặt lịch mẫu/chi tiết của đơn hàng.
     * @param {Object} order - Đơn hàng.
     */
    function getBookingPricing(order) {
        if (typeof store.getBookingPricing !== 'function') return null;
        return store.getBookingPricing(order);
    }

    /**
     * Tạo bảng tóm tắt chi phí dự kiến từ modal đặt lịch.
     * @param {Object} order - Đơn hàng.
     */
    function bookingCostSummary(order) {
        return viewUtils.buildBookingCostSummary(order, getBookingPricing);
    }

    /**
     * Tạo HTML nút xem chi tiết.
     * @param {Object} order - Đối tượng đơn hàng.
     */
    function detailActionButton(order) {
        return buildDetailActionButton(order.id, 'Xem chi tiết');
    }

    /**
     * Tính toán thông tin giá thực trả và trợ giá 5%.
     * @param {Object} order - Đơn hàng.
     */
    function getPricing(order) {
        if (!order) return null;

        var raw = order._raw || {};
        var currentPricing = order.pricing || {};
        
        var rawQuoted = raw.chiphithucte || raw.chi_phi_thuc_te || currentPricing.quotedCost;
        if (!rawQuoted || isNaN(Number(rawQuoted)) || Number(rawQuoted) <= 0) return null;

        var quotedCost = Number(rawQuoted);
        var subsidyAmount = Number(raw.sotientrogia || currentPricing.subsidyAmount);
        if (!Number.isFinite(subsidyAmount) || subsidyAmount < 0) {
            subsidyAmount = Math.round(quotedCost * SUBSIDY_RATE);
        }

        var finalCost = Number(raw.khachthanhtoan || currentPricing.finalCost);
        if (!Number.isFinite(finalCost) || finalCost < 0) {
            finalCost = Math.max(quotedCost - subsidyAmount, 0);
        }

        return {
            quotedCost: quotedCost,
            subsidyAmount: subsidyAmount,
            finalCost: finalCost
        };
    }

    /**
     * Tạo HTML tóm tắt bảng tính tiền thực tế (thực trả + trợ giá).
     * @param {Object} pricing - Cấu trúc giá thực tế.
     */
    function getPricingSummaryHtml(pricing) {
        return '<div class="pricing-summary">' +
            '<div class="pricing-line"><span>Chi phí thực tế (Thợ báo)</span><strong>' + formatCurrency(pricing.quotedCost) + '</strong></div>' +
            '<div class="pricing-line pricing-saving"><span>Trợ giá từ Thợ Nhà (5%)</span><strong>- ' + formatCurrency(pricing.subsidyAmount) + '</strong></div>' +
            '<div class="pricing-line pricing-final"><span>Khách hàng thực trả</span><strong>' + formatCurrency(pricing.finalCost) + '</strong></div>' +
            '</div>';
    }

    /**
     * Hiển thị khối thông tin tiền và nút nhập phí (nếu hoàn thành) trên giao diện.
     * @param {Object} order - Đơn hàng.
     */
    function pricingMobile(order) {
        if (order.status !== 'done') {
            return '<p class="pricing-wait">Tính năng cập nhật trợ giá sẽ mở khi đơn hoàn thành.</p>';
        }

        var pricing = getPricing(order);
        var summary = pricing
            ? getPricingSummaryHtml(pricing)
            : '<p class="pricing-wait mb-2" style="margin-bottom:10px;">Vui lòng nhập chi phí thực tế do nhà cung cấp báo để được tính trợ giá giảm 5%.</p>' +
              '<button type="button" class="btn-action w-100" style="width:100%; padding:8px; border-radius:6px; background:#10b981; color:#fff; border:none; font-weight:600; cursor:pointer;" data-action="input-cost" data-id="' + escapeHtml(order.id) + '">Nhập chi phí thực tế</button>';

        return '<div class="pricing-box">' +
            summary +
            '</div>';
    }

    /**
     * Tạo một dòng chi tiết đơn hàng (nhãn: giá trị).
     * @param {string} label - Tiêu đề.
     * @param {string} value - Giá trị.
     */
    function detailRow(label, value) {
        return buildDetailRow(label, value);
    }

    /**
     * Render HTML khối thông tin Nhà cung cấp nhận thầu.
     * @param {Object} order - Đơn hàng.
     */
    function renderProviderDetail(order) {
        if (!order.provider) {
            return '<p class="detail-note">Chưa có nhà cung cấp nhận thực hiện.</p>';
        }

        return '<div class="detail-grid">' +
            detailRow('Tên đơn vị', order.provider.company || order.provider.name || 'Nhà cung cấp') +
            detailRow('Người phụ trách', order.provider.name || 'N/A') +
            detailRow('Số điện thoại', order.provider.phone || 'N/A') +
            '</div>';
    }

    /**
     * Tìm đơn hàng trong state dựa trên ID.
     * @param {string|number} orderId - ID đơn hàng.
     */
    function getOrderById(orderId) {
        var orders = getCurrentOrders();
        return orders.find(function (item) { return String(item.id) === String(orderId); }) || null;
    }

    /**
     * Đổ dữ liệu chi tiết vào Modal xem đơn hàng.
     * @param {Object} order - Đơn hàng.
     */
    function renderOrderDetail(order) {
        if (!elements.detailBody || !elements.detailCode) return;

        var customerName = (order.customer && order.customer.name) || profile.name || 'Khách hàng';
        var customerPhone = (order.customer && order.customer.phone) || profile.phone || 'N/A';
        var updatedAt = order.updatedAt || order.createdAt;
        var noteText = order.note || 'Không có ghi chú';

        elements.detailCode.textContent = order.orderCode || 'Đơn hàng';
        elements.detailBody.innerHTML = '' +
            '<section class="detail-section">' +
                '<h4>Thông tin đơn hàng</h4>' +
                '<div class="detail-grid">' +
                    detailRow('Mã đơn', order.orderCode || 'N/A') +
                    detailRow('Dịch vụ', order.service || 'N/A') +
                    detailRow('Khách hàng', customerName) +
                    detailRow('Số điện thoại', customerPhone) +
                    detailRow('Địa chỉ', order.address || 'N/A') +
                    detailRow('Ngày đặt', formatDateTime(order.createdAt)) +
                    detailRow('Cập nhật gần nhất', formatDateTime(updatedAt)) +
                    '<div class="detail-row detail-status-row"><span>Trạng thái</span>' + statusBadge(order.status) + '</div>' +
                '</div>' +
                '<p class="detail-note">Ghi chú: ' + escapeHtml(noteText) + '</p>' +
            '</section>' +
            '<section class="detail-section">' +
                '<h4>Nhà cung cấp thực hiện</h4>' +
                renderProviderDetail(order) +
            '</section>' +
            '<section class="detail-section">' +
                '<h4>Chi phí theo modal đặt lịch</h4>' +
                bookingCostSummary(order) +
            '</section>' +
            '<section class="detail-section">' +
                '<h4>Trợ giá cho khách hàng</h4>' +
                pricingMobile(order) +
            '</section>';
    }

    /**
     * Mở modal xem thông tin chi tiết đơn hàng.
     * @param {string|number} orderId - ID đơn hàng.
     */
    function openOrderDetail(orderId) {
        if (!elements.detailModal) return;
        var order = getOrderById(orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng. Vui lòng tải lại danh sách.');
            return;
        }

        state.selectedOrderId = orderId;
        renderOrderDetail(order);
        elements.detailModal.hidden = false;
        document.body.classList.add('detail-modal-open');
    }

    /**
     * Đóng modal xem thông tin chi tiết.
     */
    function closeOrderDetail() {
        if (!elements.detailModal) return;
        state.selectedOrderId = null;
        elements.detailModal.hidden = true;
        document.body.classList.remove('detail-modal-open');
    }

    /**
     * Cập nhật các con số thống kê ở đầu trang.
     * @param {Array} orders - Danh sách đơn hàng.
     */
    function updateStats(orders) {
        var total = orders.length;
        var waiting = orders.filter(function (item) { return item.status === 'new'; }).length;
        var progress = orders.filter(function (item) { return item.status === 'confirmed' || item.status === 'doing'; }).length;
        var done = orders.filter(function (item) { return item.status === 'done'; }).length;

        elements.statTotal.textContent = String(total);
        elements.statNew.textContent = String(waiting);
        elements.statProgress.textContent = String(progress);
        elements.statDone.textContent = String(done);
    }

    /**
     * Lấy danh sách đơn hàng sau khi áp dụng bộ lọc (loại + từ khóa).
     * @param {Array} orders - Danh sách thô.
     */
    function getFilteredOrders(orders) {
        return orders.filter(function (order) {
            var matchFilter = state.filter === 'all' || order.status === state.filter;
            if (!matchFilter) return false;

            if (!state.keyword) return true;
            var kw = state.keyword.toLowerCase();
            return (
                String(order.orderCode || '').toLowerCase().indexOf(kw) !== -1 ||
                String(order.service || '').toLowerCase().indexOf(kw) !== -1 ||
                String(order.address || '').toLowerCase().indexOf(kw) !== -1
            );
        });
    }

    /**
     * Vẽ dữ liệu ra bảng (PC) và danh sách thẻ (Mobile).
     * @param {Array} orders - Danh sách đã lọc.
     */
    function renderTable(orders) {
        if (!orders.length) {
            elements.orderBody.innerHTML = '';
            elements.mobileList.innerHTML = '';
            elements.emptyState.hidden = false;
            return;
        }

        elements.emptyState.hidden = true;
        elements.orderBody.innerHTML = orders.map(function (order) {
            return '<tr>' +
                '<td class="mono">' + escapeHtml(order.orderCode) + '</td>' +
                '<td><strong>' + escapeHtml(order.service) + '</strong><span class="sub-note">' + escapeHtml(order.note || 'Không có ghi chú') + '</span></td>' +
                '<td>' + formatDateTime(order.createdAt) + '</td>' +
                '<td>' + statusBadge(order.status) + '</td>' +
                '<td class="detail-cell">' + detailActionButton(order) + '</td>' +
                '</tr>';
        }).join('');

        elements.mobileList.innerHTML = orders.map(function (order) {
            return '' +
                '<article class="mobile-card">' +
                    '<div class="mobile-card-head">' +
                        '<div>' +
                            '<h4 class="mobile-title">' + escapeHtml(order.service) + '</h4>' +
                            '<p class="mobile-code">' + escapeHtml(order.orderCode) + '</p>' +
                        '</div>' +
                        statusBadge(order.status) +
                    '</div>' +
                    '<div class="mobile-row"><span>Ngày đặt</span><strong>' + formatDateTime(order.createdAt) + '</strong></div>' +
                    '<div class="mobile-row"><span>Trạng thái xử lý</span><strong>' + escapeHtml((store.statusMeta[order.status] || {}).label || 'N/A') + '</strong></div>' +
                    '<div class="mobile-actions">' + detailActionButton(order) + '</div>' +
                '</article>';
        }).join('');
    }

    /**
     * Hàm chính điều phối việc cập nhật toàn bộ UI của phân hệ đơn hàng.
     */
    function render() {
        var orders = getCurrentOrders();
        updateStats(orders);
        renderTable(getFilteredOrders(orders));

        if (state.selectedOrderId) {
            var selectedOrder = orders.find(function (item) { return item.id === state.selectedOrderId; });
            if (!selectedOrder) {
                closeOrderDetail();
            } else {
                renderOrderDetail(selectedOrder);
            }
        }
    }

    /**
     * Cập nhật kiểu dáng cho các nút lọc trạng thái (Active/Inactive).
     */
    function applyFilterButtonStyles() {
        elements.filterButtons.forEach(function (button) {
            var active = button.getAttribute('data-filter') === state.filter;
            button.classList.toggle('active', active);
        });
    }

    /**
     * Ràng buộc các sự kiện người dùng (Tìm kiếm, Filter, Click Modal, Cập nhật phí).
     */
    function bindEvents() {
        elements.searchInput.addEventListener('input', function (event) {
            state.keyword = event.target.value.trim();
            render();
        });

        elements.filterButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                state.filter = button.getAttribute('data-filter') || 'all';
                applyFilterButtonStyles();
                render();
            });
        });

        document.addEventListener('click', function (event) {
            var detailTrigger = event.target.closest('button[data-action="view-detail"][data-id]');
            if (detailTrigger) {
                openOrderDetail(detailTrigger.getAttribute('data-id'));
                return;
            }

            var closeTrigger = event.target.closest('button[data-action="close-detail"]');
            if (closeTrigger) {
                closeOrderDetail();
                return;
            }

            var trigger = event.target.closest('button[data-action="input-cost"][data-id]');
            if (trigger) {
                state.costOrderId = trigger.getAttribute('data-id');
                if (elements.costModal) {
                    elements.costInput.value = '';
                    elements.costModal.hidden = false;
                    document.body.classList.add('detail-modal-open');
                }
                return;
            }

            var closeCostTrigger = event.target.closest('[data-action="close-cost"]');
            if (closeCostTrigger) {
                state.costOrderId = null;
                if (elements.costModal) elements.costModal.hidden = true;
                if (!elements.detailModal || elements.detailModal.hidden) {
                    document.body.classList.remove('detail-modal-open');
                }
                return;
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && elements.detailModal && !elements.detailModal.hidden) {
                closeOrderDetail();
            }
        });

        elements.refreshBtn.addEventListener('click', function () {
            loadOrdersFromApi(true);
        });

        if (elements.submitCostBtn) {
            /**
             * Xử lý sự kiện nhấn nút Gửi chi phí (Trợ giá).
             * Tính toán 5% và cập nhật lại bản ghi trên API.
             */
            elements.submitCostBtn.addEventListener('click', async function() {
                if (!state.costOrderId) return;
                var costValue = parseInt(elements.costInput.value, 10);
                if (isNaN(costValue) || costValue < 0) {
                    alert('Vui lòng nhập số tiền hợp lệ.');
                    return;
                }

                var order = getOrderById(state.costOrderId);
                if (!order) return;

                var existingPrice = getPricing(order);
                if (existingPrice) {
                    alert('Đơn hàng này đã được xét duyệt trợ giá. Bạn chỉ được nhập chi phí một lần duy nhất!');
                    elements.costModal.hidden = true;
                    if (!elements.detailModal || elements.detailModal.hidden) {
                        document.body.classList.remove('detail-modal-open');
                    }
                    return;
                }

                var subsidyAmount = Math.round(costValue * SUBSIDY_RATE);
                var finalCost = costValue - subsidyAmount;
                var updateData = {
                    chiphithucte: costValue,
                    sotientrogia: subsidyAmount,
                    khachthanhtoan: finalCost
                };

                var krudHelper = getKrudHelper();
                var originalText = elements.submitCostBtn.textContent;
                elements.submitCostBtn.textContent = 'Đang xử lý...';
                elements.submitCostBtn.disabled = true;

                try {
                    await krudHelper.updateRow(KRUD_TABLE, order.id, updateData, KRUD_SCRIPT_URL);
                    elements.costModal.hidden = true;
                    if (!elements.detailModal || elements.detailModal.hidden) {
                        document.body.classList.remove('detail-modal-open');
                    }
                    alert('Cập nhật chi phí thành công! Bạn được tính trợ giá 5%.');
                    // Tải lại để hiện UI trợ giá
                    loadOrdersFromApi(false);
                } catch (err) {
                    var ms = err && err.message ? err.message : '';
                    if (ms.toLowerCase().indexOf('column') !== -1) {
                        alert('Lỗi Dữ liệu: Cột lưu trữ thông tin trợ giá (chiphithucte, sotientrogia) chưa có trên API. Vui lòng liên hệ Admin cấu hình.');
                    } else {
                        alert('Có lỗi xảy ra: ' + ms);
                    }
                } finally {
                    elements.submitCostBtn.textContent = originalText;
                    elements.submitCostBtn.disabled = false;
                }
            });
        }
    }

    /**
     * Đổ dữ liệu profile vào các thành phần thông báo tiêu đề trang.
     */
    function bindProfile() {
        if (elements.customerName) elements.customerName.textContent = profile.name || 'Khách hàng';
        if (elements.customerPhone) elements.customerPhone.textContent = profile.phone || 'Chưa cập nhật';
        if (elements.customerAddress) elements.customerAddress.textContent = profile.address || 'Địa chỉ sẽ hiển thị theo từng đơn hàng';
    }

    bindProfile();
    applyFilterButtonStyles();
    bindEvents();
    loadOrdersFromApi(false);
};