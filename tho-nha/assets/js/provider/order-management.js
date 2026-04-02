/**
 * Khởi tạo dữ liệu và sự kiện cho trang Quản lý Công việc của Đối tác
 */
window.initProviderOrders = function() {
    'use strict';
    
    if (window._providerOrdersInit) return;
    window._providerOrdersInit = true;

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

    var KRUD_SCRIPT_URL = window.BD_KRUD_SCRIPT_URL || 'https://api.dvqt.vn/js/krud.js';
    var KRUD_TABLE = window.BD_KRUD_TABLE || 'datlich_thonha';
    var PROVIDER_TABLE = window.BD_PROVIDER_TABLE || 'nhacungcap_thonha';
    var PROVIDER_ASSIGN_CACHE_KEY = 'thonha_provider_assign_cache_v1';
    var ASSIGNED_STATUS = { confirmed: true, doing: true, done: true };

    var provider = store.getProviderProfile();

    var state = {
        selectedOrderId: null,
        orders: [],
        isLoading: false
    };

    var elements = {
        providerName: document.getElementById('providerName'),
        providerCompany: document.getElementById('providerCompany'),
        providerPhone: document.getElementById('providerPhone'),
        statOpen: document.getElementById('statOpen'),
        statAssigned: document.getElementById('statAssigned'),
        statDoing: document.getElementById('statDoing'),
        statDone: document.getElementById('statDone'),
        openBody: document.getElementById('openRequestBody'),
        openMobileList: document.getElementById('openMobileList'),
        openEmpty: document.getElementById('openEmptyState'),
        assignedBody: document.getElementById('assignedOrderBody'),
        assignedMobileList: document.getElementById('assignedMobileList'),
        assignedEmpty: document.getElementById('assignedEmptyState'),
        refreshBtn: document.getElementById('refreshProviderBtn'),
        detailModal: document.getElementById('providerDetailModal'),
        detailBody: document.getElementById('providerDetailBody'),
        detailCode: document.getElementById('providerDetailCode')
    };

    var escapeHtml = viewUtils.escapeHtml;
    var toDigits = viewUtils.toDigits;
    var sortByCreatedDesc = viewUtils.sortByCreatedDesc;
    var formatDateTime = viewUtils.formatDateTime;
    var getProviderIdFromOrderRow = viewUtils.getProviderIdFromOrderRow;
    var buildProviderMapByIds = viewUtils.buildProviderMapByIds;
    var mapApiOrderBase = viewUtils.mapApiOrderBase;
    var buildStatusBadge = viewUtils.buildStatusBadge;
    var buildDetailActionButton = viewUtils.buildDetailActionButton;
    var buildDetailRow = viewUtils.buildDetailRow;

    /**
     * Lấy thời gian hiện tại dưới dạng chuỗi ISO.
     * @returns {string} ISO string.
     */
    function nowIsoFallback() {
        return new Date().toISOString();
    }

    /**
     * Phân giải chuỗi JSON an toàn với giá trị dự phòng.
     * @param {string} raw - Chuỗi JSON thô.
     * @param {*} fallback - Giá trị khi lỗi.
     * @returns {*} Kết quả parse hoặc fallback.
     */
    function safeParse(raw, fallback) {
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (_err) {
            return fallback;
        }
    }

    /**
     * Lấy mã nhận diện duy nhất của đối tác (ID hoặc SĐT).
     * @param {Object} info - Thông tin đối tác.
     * @returns {string} Identity.
     */
    function providerIdentity(info) {
        var item = info || {};
        return String(item.id || toDigits(item.phone) || item.phone || item.name || '').trim();
    }

    /**
     * Chuẩn hoá thông tin đối tác về cấu trúc nội bộ.
     * @param {Object} info - Object thô.
     * @returns {Object} { id, name, phone, company }.
     */
    function normalizeProvider(info) {
        var item = info || {};
        var id = providerIdentity(item);
        return {
            id: id,
            name: String(item.name || 'Nhà cung cấp').trim() || 'Nhà cung cấp',
            phone: String(item.phone || '').trim(),
            company: String(item.company || '').trim()
        };
    }

    /**
     * Đọc cache phân phối đơn hàng cho đối tác từ LocalStorage.
     * @returns {Object} Cache data.
     */
    function readProviderAssignCache() {
        var parsed = safeParse(localStorage.getItem(PROVIDER_ASSIGN_CACHE_KEY), {});
        return parsed && typeof parsed === 'object' ? parsed : {};
    }

    /**
     * Ghi cache phân phối đơn hàng vào LocalStorage.
     * @param {Object} cache - Cache object.
     */
    function writeProviderAssignCache(cache) {
        localStorage.setItem(PROVIDER_ASSIGN_CACHE_KEY, JSON.stringify(cache || {}));
    }

    /**
     * Lấy thông tin đối tác đã nhận đơn từ cache (dùng khi API chưa cập nhật kịp).
     * @param {Object} cache - Bản đồ cache.
     * @param {string|number} orderId - ID đơn.
     * @param {string} orderCode - Mã đơn.
     */
    function getCachedAssignedProvider(cache, orderId, orderCode) {
        var src = cache || {};
        var idKey = orderId !== undefined && orderId !== null ? ('id:' + String(orderId)) : '';
        var codeKey = orderCode ? ('code:' + String(orderCode)) : '';

        var hit = null;
        if (idKey && src[idKey] && src[idKey].provider) {
            hit = src[idKey].provider;
        } else if (codeKey && src[codeKey] && src[codeKey].provider) {
            hit = src[codeKey].provider;
        }

        if (!hit) return null;
        var normalized = normalizeProvider(hit);
        return normalized.id ? normalized : null;
    }

    /**
     * Lưu thông tin phân phối đơn hàng vào cache.
     * @param {string|number} orderId - ID đơn.
     * @param {string} orderCode - Mã đơn.
     * @param {Object} providerInfo - Thông tin đối tác.
     */
    function cacheAssignedProvider(orderId, orderCode, providerInfo) {
        var normalized = normalizeProvider(providerInfo);
        if (!normalized.id) return;

        var cache = readProviderAssignCache();
        var payload = {
            provider: normalized,
            updatedAt: nowIsoFallback()
        };

        if (orderId !== undefined && orderId !== null && String(orderId).trim() !== '') {
            cache['id:' + String(orderId)] = payload;
        }
        if (orderCode) {
            cache['code:' + String(orderCode)] = payload;
        }

        writeProviderAssignCache(cache);
    }

    /**
     * Lọc đơn hàng mới (chưa có người nhận) và phù hợp với danh mục đối tác đã đăng ký.
     */
    function getOpenOrdersFromState() {
        var providerCats = (provider && provider.categories) 
            ? String(provider.categories).split(',').map(function(s) { return s.trim(); }).filter(Boolean) 
            : [];

        return state.orders.filter(function (order) {
            if (order.status !== 'new') return false;
            
            // Nếu không có thông tin danh mục đối tác đăng ký (ví dụ: thợ cũ hoặc admin), hiện hết
            if (providerCats.length === 0) return true;
            
            // Chỉ hiện đơn có danh mục trùng với danh mục của đối tác
            var orderCatId = String(order.id_danhmuc || '').trim();
            return orderCatId !== '' && providerCats.indexOf(orderCatId) !== -1;
        });
    }

    /**
     * Lọc đơn hàng đã được giao cho Đối tác hiện tại.
     */
    function getAssignedOrdersFromState() {
        var orders = state.orders.filter(function (order) {
            return !!ASSIGNED_STATUS[order.status];
        });

        if (!provider) return orders;
        var currentProviderId = providerIdentity(provider);
        if (!currentProviderId) return orders;

        var hasProviderAssignments = orders.some(function (order) {
            return !!(order.provider && providerIdentity(order.provider));
        });
        if (!hasProviderAssignments) return orders;

        return orders.filter(function (order) {
            return order.provider && providerIdentity(order.provider) === currentProviderId;
        });
    }

    /**
     * Tìm đơn hàng trong state.
     */
    function getOrderById(orderId) {
        for (var i = 0; i < state.orders.length; i += 1) {
            if (String(state.orders[i].id) === String(orderId)) return state.orders[i];
        }
        return null;
    }

    /**
     * Chọn một khóa (field) tồn tại trong object từ danh sách ứng viên.
     * @param {Object} raw - Dữ liệu thô.
     * @param {string[]} candidates - Danh sách các khóa khả thi.
     */
    function pickExistingKey(raw, candidates) {
        var src = raw || {};
        for (var i = 0; i < candidates.length; i += 1) {
            var key = candidates[i];
            if (Object.prototype.hasOwnProperty.call(src, key)) {
                return key;
            }
        }
        return '';
    }

    /**
     * Ánh xạ dòng API thành Đơn hàng chuẩn của Đối tác.
     * @param {Object} row - Dòng thô.
     * @param {number} index - Index.
     * @param {Object} providerCache - Cache thầu đơn.
     * @param {Object} providerMapById - Map đối tác.
     */
    function mapApiOrder(row, index, providerCache, providerMapById) {
        function normalizeStatus(value) {
            var s = String(value || '').trim().toLowerCase();
            if (!s || s === 'pending') return 'new';
            if (s === 'active') return 'confirmed';
            return s;
        }

        return mapApiOrderBase(row, index, {
            providerMapById: providerMapById,
            updatedAtFields: ['capnhatluc', 'updated_at', 'updatedAt'],
            normalizeStatus: normalizeStatus,
            defaultStatus: 'new',
            includeRaw: true,
            providerFallback: function (ctx) {
                return getCachedAssignedProvider(providerCache, ctx.row.id, ctx.orderCode);
            }
        });
    }

    /**
     * Điều chỉnh giao diện khi đang tải dữ liệu.
     * @param {boolean} isLoading - Trạng thái loading.
     */
    function setLoadingState(isLoading) {
        state.isLoading = !!isLoading;
        if (!state.isLoading) return;

        if (elements.openBody) {
            elements.openBody.innerHTML = '<tr><td colspan="6" class="table-loading">Đang tải yêu cầu mới...</td></tr>';
        }
        if (elements.assignedBody) {
            elements.assignedBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải đơn đã nhận...</td></tr>';
        }
        if (elements.openMobileList) {
            elements.openMobileList.innerHTML = '<article class="mobile-card loading">Đang tải yêu cầu mới...</article>';
        }
        if (elements.assignedMobileList) {
            elements.assignedMobileList.innerHTML = '<article class="mobile-card loading">Đang tải đơn đã nhận...</article>';
        }
        if (elements.openEmpty) elements.openEmpty.hidden = true;
        if (elements.assignedEmpty) elements.assignedEmpty.hidden = true;
    }

    /**
     * Tải dữ liệu toàn bộ đơn từ API và ánh xạ Nhà cung cấp.
     */
    async function fetchRemoteOrders() {
        // Tải đơn hàng và danh sách nhà cung cấp thông qua ThoNhaApp
        const [ordersRaw, providers] = await Promise.all([
            ThoNhaApp.getOrders(),
            ThoNhaApp.getProviders()
        ]);

        const providerIdSet = {};
        ordersRaw.forEach(row => {
            const pid = getProviderIdFromOrderRow(row);
            if (pid) providerIdSet[pid] = true;
        });

        const providerMap = buildProviderMapByIds(providers, providerIdSet);
        const providerCache = readProviderAssignCache();

        return sortByCreatedDesc(ordersRaw.map((row, index) => {
            return mapApiOrder(row, index, providerCache, providerMap);
        }));
    }

    /**
     * Geocode địa chỉ văn bản → tọa độ lat/lng bằng Nominatim API.
     */
    async function _bdGeocode(address) {
        if (!address) return null;
        // Thêm User-Agent để tuân thủ chính sách của Nominatim (OpenStreetMap)
        const url = 'https://nominatim.openstreetmap.org/search?' +
            new URLSearchParams({ q: address, format: 'json', limit: 1 });
        try {
            const res = await fetch(url, { 
                headers: { 
                    'Accept-Language': 'vi',
                    'User-Agent': 'ThoNha-Booking-App/1.0'
                } 
            });
            const arr = await res.json();
            if (!arr || !arr.length) return null;
            return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
        } catch (e) {
            console.warn('Geocode failed for:', address, e);
            return null;
        }
    }

    /**
     * Tính quãng đường lái xe giữa 2 điểm bằng OSRM API.
     */
    async function _bdRoadDist(pLat, pLng, cLat, cLng) {
        const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${cLng},${cLat}?overview=false`;
        try {
            const res  = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (data.code !== 'Ok' || !data.routes?.length) return null;
            return data.routes[0].distance / 1000; // meters → km
        } catch (e) {
            console.warn('Routing failed:', e);
            return null;
        }
    }

    /**
     * Quy đổi quãng đường → phí di chuyển.
     */
    function _bdFeeFromDist(km) {
        const pricePerKm = 10000;
        let fee = Math.round(km * pricePerKm / 1000) * 1000;
        fee = Math.max(fee, 20000);
        fee = Math.min(fee, 150000);
        return fee;
    }

    /**
     * Cập nhật trạng thái và thông tin nhà cung cấp thầu đơn lên API.
     * @param {string} action - 'accept', 'start', 'done'.
     * @param {Object} order - Đơn hàng.
     */
    async function updateRemoteOrder(action, order) {
        const statusMap = { accept: 'confirmed', start: 'doing', done: 'done' };
        const nextStatus = statusMap[action];
        if (!nextStatus) throw new Error('Thao tác không hợp lệ');

        const updateData = { trangthai: nextStatus };
        
        if (action === 'accept') {
            const pid = String(provider.id || '').trim();
            if (!pid) throw new Error('Không tìm thấy ID nhà cung cấp.');
            updateData.id_nhacungcap = pid;

            // --- TỰ ĐỘNG TÍNH PHÍ DI CHUYỂN ---
            try {
                const providerAddr = String(provider.address || '').trim();
                const customerAddr = String(order.address || '').trim();

                if (!providerAddr) {
                    alert('Lưu ý: Bạn chưa cập nhật địa chỉ trong hồ sơ, phí di chuyển sẽ không được tính tự động.');
                } else if (!customerAddr) {
                    alert('Lưu ý: Khách hàng không để lại địa chỉ cụ thể, phí di chuyển sẽ không được tính tự động.');
                } else {
                    const [pCoord, cCoord] = await Promise.all([
                        _bdGeocode(providerAddr),
                        _bdGeocode(customerAddr)
                    ]);

                    if (pCoord && cCoord) {
                        const km = await _bdRoadDist(pCoord.lat, pCoord.lng, cCoord.lat, cCoord.lng);
                        if (km !== null) {
                            const fee = _bdFeeFromDist(km);
                            updateData.phidichuyen = fee;
                            updateData.quangduongkm = parseFloat(km.toFixed(2));
                            updateData.trangthaidichuyen = 'ok';

                            // Cập nhật tổng tiền (đơn gốc mới chỉ có base + survey)
                            const currentTotal = Number(order._raw.tongtien || 0);
                            updateData.tongtien = currentTotal + fee;
                        } else {
                            alert('Không tính được quãng đường đường bộ. Phí di chuyển sẽ được admin cập nhật sau.');
                        }
                    } else {
                        alert('Không xác định được tọa độ địa chỉ. Phí di chuyển sẽ được admin cập nhật sau.');
                    }
                }
            } catch (calcErr) {
                console.error('Lỗi tính phí di chuyển:', calcErr);
            }
            // ---------------------------------
        }

        // Cập nhật thời gian update
        const updatedAtKey = pickExistingKey(order._raw, ['capnhatluc', 'updated_at']);
        if (updatedAtKey) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            updateData[updatedAtKey] = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        }

        // Thực hiện cập nhật qua ThoNhaApp
        return ThoNhaApp.updateOrder(order.id, updateData);
    }

    /**
     * Tải và xử lý dữ liệu đơn hàng từ API.
     */
    async function loadOrdersFromApi(showErrorAlert) {
        setLoadingState(true);
        try {
            state.orders = await fetchRemoteOrders();
        } catch (err) {
            console.error('[provider-order] API Error:', err);
            state.orders = [];
            if (showErrorAlert) alert('Không tải được dữ liệu công việc.');
        } finally {
            setLoadingState(false);
            render();
        }
    }

    /**
     * Nhãn trạng thái.
     */
    function statusBadge(status) {
        return buildStatusBadge(status, store.statusMeta, STATUS_CLASS_MAP);
    }

    /**
     * Chi phí mẫu đặt lịch.
     */
    function getBookingPricing(order) {
        if (typeof store.getBookingPricing !== 'function') return null;
        return store.getBookingPricing(order);
    }

    /**
     * Tóm tắt chi phí đặt lịch.
     */
    function bookingCostSummary(order) {
        return viewUtils.buildBookingCostSummary(order, getBookingPricing);
    }

    /**
     * Nút xem chi tiết.
     */
    function detailActionButton(order) {
        return buildDetailActionButton(order.id, 'Xem chi tiết');
    }

    /**
     * Dòng chi tiết.
     */
    function detailRow(label, value) {
        return buildDetailRow(label, value);
    }

    /**
     * Lấy các nút thao tác khả dụng của đơn hàng dựa trên trạng thái.
     * @param {Object} order - Đơn hàng.
     */
    function getOrderActionButton(order) {
        if (order.status === 'new' && !order.provider) {
            return '<button class="btn-action btn-accept" data-action="accept" data-id="' + escapeHtml(order.id) + '">Nhận thực hiện</button>';
        }

        if (order.provider && order.provider.id && provider.id && String(order.provider.id) !== String(provider.id)) {
            return '<span class="action-done">Đơn đang được nhà cung cấp khác xử lý</span>';
        }

        if (order.status === 'confirmed') {
            return '<button class="btn-action btn-start" data-action="start" data-id="' + escapeHtml(order.id) + '">Bắt đầu làm</button>';
        }

        if (order.status === 'doing') {
            return '<button class="btn-action btn-done" data-action="done" data-id="' + escapeHtml(order.id) + '">Xác nhận xong</button>';
        }

        if (order.status === 'done') {
            return '<span class="action-done">Đơn đã hoàn thành</span>';
        }

        if (order.status === 'cancel') {
            return '<span class="action-done">Đơn đã hủy</span>';
        }

        return '<span class="action-done">Không có thao tác khả dụng</span>';
    }

    /**
     * Render thông tin đơn vị thợ thầu trong modal chi tiết.
     */
    function renderProviderInfo(order) {
        if (!order.provider) {
            if (order.status === 'new') {
                return '<p class="detail-note">Đơn chưa có nhà cung cấp nhận thực hiện.</p>';
            }
            return '<p class="detail-note">Đơn đã được nhận thực hiện, nhưng dữ liệu chưa có thông tin nhà cung cấp chi tiết.</p>';
        }

        return '<div class="detail-grid">' +
            detailRow('Tên đơn vị', order.provider.company || order.provider.name || 'Nhà cung cấp') +
            detailRow('Người phụ trách', order.provider.name || 'N/A') +
            detailRow('Số điện thoại', order.provider.phone || 'N/A') +
            '</div>';
    }

    /**
     * Đổ dữ liệu đơn hàng vào modal chi tiết.
     */
    function renderOrderDetail(order) {
        if (!elements.detailBody || !elements.detailCode) return;

        var customerName = order.customer && order.customer.name ? order.customer.name : 'Khách hàng';
        var customerPhone = order.customer && order.customer.phone ? order.customer.phone : 'N/A';
        var updatedAt = order.updatedAt || order.createdAt;
        var noteText = order.note || 'Không có ghi chú';

        elements.detailCode.textContent = order.orderCode || 'Đơn hàng';
        elements.detailBody.innerHTML = '' +
            '<section class="detail-section">' +
                '<h4>Thông tin đơn hàng</h4>' +
                '<div class="detail-grid">' +
                    detailRow('Mã đơn', order.orderCode || 'N/A') +
                    detailRow('Tên khách hàng', customerName) +
                    detailRow('Số điện thoại', customerPhone) +
                    detailRow('Dịch vụ yêu cầu', order.service || 'N/A') +
                    detailRow('Địa chỉ', order.address || 'N/A') +
                    detailRow('Ngày đặt', formatDateTime(order.createdAt)) +
                    detailRow('Cập nhật gần nhất', formatDateTime(updatedAt)) +
                    '<div class="detail-row detail-status-row"><span>Trạng thái</span>' + statusBadge(order.status) + '</div>' +
                '</div>' +
                '<p class="detail-note">Ghi chú: ' + escapeHtml(noteText) + '</p>' +
            '</section>' +
            '<section class="detail-section">' +
                '<h4>Chi phí theo modal đặt lịch</h4>' +
                bookingCostSummary(order) +
            '</section>' +
            '<section class="detail-section">' +
                '<h4>Nhà cung cấp thực hiện</h4>' +
                renderProviderInfo(order) +
            '</section>' +
            '<section class="detail-section">' +
                '<h4>Thao tác xử lý đơn</h4>' +
                '<div class="detail-actions">' + getOrderActionButton(order) + '</div>' +
            '</section>';
    }

    /**
     * Mở modal xem chi tiết.
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
     * Đóng modal chi tiết.
     */
    function closeOrderDetail() {
        if (!elements.detailModal) return;
        state.selectedOrderId = null;
        elements.detailModal.hidden = true;
        document.body.classList.remove('detail-modal-open');
    }

    /**
     * Cập nhật các thống kê tóm tắt đầu trang.
     */
    function updateStats(openOrders, assignedOrders) {
        var doing = assignedOrders.filter(function (item) {
            return item.status === 'doing' || item.status === 'confirmed';
        }).length;
        var done = assignedOrders.filter(function (item) {
            return item.status === 'done';
        }).length;

        elements.statOpen.textContent = String(openOrders.length);
        elements.statAssigned.textContent = String(assignedOrders.length);
        elements.statDoing.textContent = String(doing);
        elements.statDone.textContent = String(done);
    }

    /**
     * Render danh sách đơn hàng mới nhất (Yêu cầu mới).
     */
    function renderOpenOrders(openOrders) {
        if (!openOrders.length) {
            elements.openBody.innerHTML = '';
            elements.openMobileList.innerHTML = '';
            elements.openEmpty.hidden = false;
            return;
        }

        elements.openEmpty.hidden = true;
        elements.openBody.innerHTML = openOrders.map(function (order) {
            return '<tr>' +
                '<td class="mono">' + escapeHtml(order.orderCode) + '</td>' +
                '<td><strong>' + escapeHtml(order.customer && order.customer.name) + '</strong><span class="sub-note">' + escapeHtml(order.customer && order.customer.phone) + '</span></td>' +
                '<td><strong>' + escapeHtml(order.service) + '</strong><span class="sub-note">' + escapeHtml(order.address || 'N/A') + '</span></td>' +
                '<td>' + formatDateTime(order.createdAt) + '</td>' +
                '<td>' + statusBadge(order.status) + '</td>' +
                '<td class="detail-cell">' + detailActionButton(order) + '</td>' +
                '</tr>';
        }).join('');

        elements.openMobileList.innerHTML = openOrders.map(function (order) {
            return '' +
                '<article class="mobile-card">' +
                    '<div class="mobile-card-head">' +
                        '<div>' +
                            '<h4 class="mobile-title">' + escapeHtml(order.customer && order.customer.name) + '</h4>' +
                            '<p class="mobile-code">' + escapeHtml(order.orderCode) + '</p>' +
                        '</div>' +
                        statusBadge(order.status) +
                    '</div>' +
                    '<div class="mobile-row"><span>Số điện thoại</span><strong>' + escapeHtml(order.customer && order.customer.phone) + '</strong></div>' +
                    '<div class="mobile-row"><span>Dịch vụ</span><strong>' + escapeHtml(order.service) + '</strong></div>' +
                    '<div class="mobile-row"><span>Ngày đặt</span><strong>' + formatDateTime(order.createdAt) + '</strong></div>' +
                    '<div class="mobile-actions">' + detailActionButton(order) + '</div>' +
                '</article>';
        }).join('');
    }

    /**
     * Render danh sách đơn hàng đối tác đã nhận.
     */
    function renderAssignedOrders(assignedOrders) {
        if (!assignedOrders.length) {
            elements.assignedBody.innerHTML = '';
            elements.assignedMobileList.innerHTML = '';
            elements.assignedEmpty.hidden = false;
            return;
        }

        elements.assignedEmpty.hidden = true;
        elements.assignedBody.innerHTML = assignedOrders.map(function (order) {
            return '<tr>' +
                '<td class="mono">' + escapeHtml(order.orderCode) + '</td>' +
                '<td><strong>' + escapeHtml(order.customer && order.customer.name) + '</strong><span class="sub-note">' + escapeHtml(order.customer && order.customer.phone) + '</span></td>' +
                '<td>' + escapeHtml(order.service) + '</td>' +
                '<td>' + statusBadge(order.status) + '</td>' +
                '<td class="detail-cell">' + detailActionButton(order) + '</td>' +
                '</tr>';
        }).join('');

        elements.assignedMobileList.innerHTML = assignedOrders.map(function (order) {
            return '' +
                '<article class="mobile-card">' +
                    '<div class="mobile-card-head">' +
                        '<div>' +
                            '<h4 class="mobile-title">' + escapeHtml(order.customer && order.customer.name) + '</h4>' +
                            '<p class="mobile-code">' + escapeHtml(order.orderCode) + '</p>' +
                        '</div>' +
                        statusBadge(order.status) +
                    '</div>' +
                    '<div class="mobile-row"><span>Dịch vụ</span><strong>' + escapeHtml(order.service) + '</strong></div>' +
                    '<div class="mobile-row"><span>SĐT khách</span><strong>' + escapeHtml(order.customer && order.customer.phone) + '</strong></div>' +
                    '<div class="mobile-actions">' + detailActionButton(order) + '</div>' +
                '</article>';
        }).join('');
    }

    /**
     * Hàm điều phối render toàn bộ UI.
     */
    function render() {
        var openOrders = getOpenOrdersFromState();
        var assignedOrders = getAssignedOrdersFromState();

        updateStats(openOrders, assignedOrders);
        renderOpenOrders(openOrders);
        renderAssignedOrders(assignedOrders);

        if (state.selectedOrderId) {
            var selectedOrder = getOrderById(state.selectedOrderId);
            if (!selectedOrder) {
                closeOrderDetail();
            } else {
                renderOrderDetail(selectedOrder);
            }
        }
    }

    /**
     * Xử lý click các nút thao tác nghiệp vụ (Nhận đơn, Bắt đầu, Hoàn thành).
     */
    async function handleAction(action, orderId) {
        var order = getOrderById(orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng. Vui lòng tải lại danh sách.');
            return;
        }

        try {
            await updateRemoteOrder(action, order);
            if (action === 'accept' || (!order.provider && (action === 'start' || action === 'done'))) {
                cacheAssignedProvider(order.id, order.orderCode, provider);
            }
            await loadOrdersFromApi(false);
        } catch (err) {
            alert(err && err.message ? err.message : 'Không thể cập nhật đơn. Vui lòng thử lại.');
        }
    }

    /**
     * Ràng buộc sự kiện thao tác bảng và phím tắt.
     */
    function bindTableActions() {
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

            var button = event.target.closest('button[data-action][data-id]');
            if (!button) return;

            var action = button.getAttribute('data-action');
            if (action === 'view-detail') return;
            var orderId = button.getAttribute('data-id');
            handleAction(action, orderId);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && elements.detailModal && !elements.detailModal.hidden) {
                closeOrderDetail();
            }
        });
    }

    /**
     * Đổ thông tin thợ thầu vào giao diện hồ sơ.
     */
    function bindProviderProfile() {
        if (!provider) return;
        if (elements.providerCompany) elements.providerCompany.textContent = provider.company || provider.name || 'Nhà cung cấp Thợ Nhà';
        if (elements.providerName) elements.providerName.textContent = provider.name || 'Người dùng';
        if (elements.providerPhone) elements.providerPhone.textContent = provider.phone || 'Chưa có SĐT';
    }

    /**
     * Ràng buộc các sự kiện hệ thống (Làm mới).
     */
    function bindEvents() {
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', function () {
                loadOrdersFromApi(true);
            });
        }
    }

    bindProviderProfile();
    bindTableActions();
    bindEvents();
    loadOrdersFromApi(false);
};