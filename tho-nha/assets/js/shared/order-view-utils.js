(function (global) {
    'use strict';

    var currencyFormatter = new Intl.NumberFormat('vi-VN');

    /**
     * Thoát các ký tự đặc biệt trong HTML để tránh lỗi bảo mật XSS.
     * @param {string} value - Chuỗi cần thoát.
     * @returns {string} Chuỗi đã được thoát.
     */
    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Loại bỏ tất cả các ký tự không phải là số.
     * @param {string|number} value - Giá trị đầu vào.
     * @returns {string} Chuỗi chỉ chứa các chữ số.
     */
    function toDigits(value) {
        return String(value || '').replace(/\D/g, '');
    }

    /**
     * Chuẩn hóa chuỗi thời gian về định dạng ISO.
     * @param {string} value - Chuỗi thời gian đầu vào.
     * @returns {string|null} Chuỗi ISO hoặc null nếu không hợp lệ.
     */
    function normalizeDateTime(value) {
        if (!value) return null;
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString();
    }

    /**
     * Trả về thời gian hiện tại định dạng ISO (dùng làm fallback).
     * @returns {string} Chuỗi ISO thời gian hiện tại.
     */
    function nowIsoFallback() {
        return new Date().toISOString();
    }

    /**
     * Sắp xếp danh sách đối tượng theo thời gian tạo (giảm dần).
     * @param {Array} items - Danh sách cần sắp xếp.
     * @returns {Array} Danh sách đã sắp xếp.
     */
    function sortByCreatedDesc(items) {
        return (items || []).slice().sort(function (a, b) {
            return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
        });
    }

    /**
     * Định dạng chuỗi thời gian thành DD/MM/YYYY HH:mm.
     * @param {string} value - Chuỗi thời gian ISO.
     * @returns {string} Chuỗi định dạng thân thiện.
     */
    function formatDateTime(value) {
        if (!value) return 'N/A';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        var dd = String(date.getDate()).padStart(2, '0');
        var mm = String(date.getMonth() + 1).padStart(2, '0');
        var yyyy = date.getFullYear();
        var hh = String(date.getHours()).padStart(2, '0');
        var min = String(date.getMinutes()).padStart(2, '0');
        return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min;
    }

    /**
     * Định dạng số thành tiền tệ VND (đ).
     * @param {number|string} value - Số tiền.
     * @returns {string} Chuỗi tiền tệ (VD: 100.000 đ).
     */
    function formatCurrencyVn(value) {
        var amount = Number(value);
        if (!Number.isFinite(amount)) amount = 0;
        return currencyFormatter.format(Math.round(amount)) + ' đ';
    }

    /**
     * Trả về đơn giá hoặc chữ "Miễn phí" nếu bằng 0.
     * @param {number|string} value - Số tiền.
     * @returns {string} Kết quả định dạng.
     */
    function moneyOrFree(value) {
        var amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) return 'Miễn phí';
        return formatCurrencyVn(amount);
    }

    /**
     * Lấy ID nhà cung cấp từ các trường dữ liệu API. Ưu tiên id_nhacungcap.
     * @param {Object} row - Bản ghi dữ liệu thô.
     * @returns {string} ID nhà cung cấp.
     */
    function getProviderIdFromOrderRow(row) {
        var raw = row || {};
        // Ưu tiên id_nhacungcap vì các trường cũ sẽ bị xóa khỏi database
        var value = raw.id_nhacungcap || raw.idnhacungcap || raw.nhacungcapid || raw.provider_id || raw.providerId || '';
        return String(value || '').trim();
    }

    /**
     * Ánh xạ bản ghi tài khoản thợ từ bảng nhacungcap_thonha.
     * @param {Object} row - Dữ liệu thô.
     * @returns {Object|null} Đối tượng thợ chuẩn hoá.
     */
    function mapProviderAccountRow(row) {
        var raw = row || {};
        var providerId = String(raw.id || '').trim();
        if (!providerId) return null;

        return {
            id: providerId,
            name: raw.hovaten || raw.ho_ten || raw.name || 'Nhà cung cấp',
            phone: raw.sodienthoai || raw.so_dien_thoai || raw.phone || '',
            company: raw.tencua_hang || raw.ten_cua_hang || raw.company || '',
            categories: raw.danh_muc_thuc_hien || raw.categories || ''
        };
    }

    /**
     * Ánh xạ thông tin thợ giản lược từ ID có sẵn trong đơn hàng.
     * @param {Object} row - Dữ liệu thô của đơn hàng.
     * @returns {Object|null} Đối tượng thợ với ID.
     */
    function mapProviderInlineFromOrderRow(row) {
        var raw = row || {};
        var providerId = getProviderIdFromOrderRow(raw);

        if (!providerId) {
            return null;
        }

        // Chỉ trả về ID, thông tin chi tiết sẽ được lấy qua join/lookup bảng nhacungcap_thonha
        return {
            id: providerId,
            name: 'Nhà cung cấp',
            phone: '',
            company: ''
        };
    }

    /**
     * Xây dựng bản đồ (map) thông tin thợ dựa trên danh sách ID cần thiết.
     * @param {Array} providerRows - Danh sách thợ thô từ bảng thợ.
     * @param {Object} providerIdSet - Tập hợp ID cần lọc.
     * @returns {Object} Bản đồ { id: providerObj }.
     */
    function buildProviderMapByIds(providerRows, providerIdSet) {
        var ids = providerIdSet || {};
        var rows = Array.isArray(providerRows) ? providerRows : [];
        var result = {};

        rows.forEach(function (row) {
            var provider = mapProviderAccountRow(row);
            if (!provider) return;
            if (!ids[provider.id]) return;
            result[provider.id] = provider;
        });

        return result;
    }

    /**
     * Ánh xạ dữ liệu API đơn hàng thành đối tượng chuẩn (Universal Order Object).
     * @param {Object} row - Dữ liệu thô từ API.
     * @param {number} index - Chỉ số đơn hàng trong danh sách.
     * @param {Object} options - Các tuỳ chọn bổ sung (mapping, fallback).
     * @returns {Object} Đối tượng đơn hàng đã chuẩn hoá.
     */
    function mapApiOrderBase(row, index, options) {
        var raw = row || {};
        var opts = options || {};
        var createdAt = normalizeDateTime(raw.ngaytao || raw.created_at || raw.createdAt || raw.created_at_utc) || nowIsoFallback();

        var updatedAtValue = null;
        var updatedAtFields = Array.isArray(opts.updatedAtFields)
            ? opts.updatedAtFields
            : ['updated_at', 'updatedAt'];
        for (var i = 0; i < updatedAtFields.length; i += 1) {
            var field = updatedAtFields[i];
            if (raw[field]) {
                updatedAtValue = raw[field];
                break;
            }
        }
        var updatedAt = normalizeDateTime(updatedAtValue) || createdAt;

        var serviceName = raw.tendichvu || raw.service_name || raw.service || raw.service_id || (opts.defaultServiceName || 'Dịch vụ tại nhà');
        var note = raw.ghichu || raw.note || '';
        var orderCode = raw.madon || raw.order_code || raw.orderCode || ('TN-REMOTE-' + String(Number(index || 0) + 1).padStart(4, '0'));
        var statusRaw = raw.trangthai || raw.status || opts.defaultStatus || 'new';
        var status = typeof opts.normalizeStatus === 'function' ? opts.normalizeStatus(statusRaw, raw) : statusRaw;
        var providerId = getProviderIdFromOrderRow(raw);
        var providerFromId = providerId && opts.providerMapById && opts.providerMapById[providerId]
            ? opts.providerMapById[providerId]
            : null;
        var providerFromOrder = mapProviderInlineFromOrderRow(raw);
        var provider = providerFromId || providerFromOrder;

        if (!provider && typeof opts.providerFallback === 'function') {
            provider = opts.providerFallback({
                row: raw,
                index: index,
                orderCode: orderCode,
                providerId: providerId,
                providerFromId: providerFromId,
                providerFromOrder: providerFromOrder
            });
        }

        var order = {
            id: String(raw.id !== undefined && raw.id !== null ? raw.id : (raw.madon || raw.order_code || ('remote-' + index))),
            orderCode: orderCode,
            customer: {
                name: raw.hoten || raw.customer_name || raw.name || opts.customerNameFallback || 'Khách hàng',
                phone: raw.sodienthoai || raw.customer_phone || raw.phone || opts.customerPhoneFallback || ''
            },
            address: raw.diachi || raw.address || '',
            service: serviceName,
            note: note,
            selected_brand: raw.thuonghieu || raw.selected_brand || '',
            estimated_price: Number(raw.giadichvu || raw.estimated_price || 0) || 0,
            id_danhmuc: raw.id_danhmuc || raw.id_danh_muc || null,
            id_dichvu: raw.id_dichvu || raw.id_dich_vu || null,
            travel_fee: Number(raw.phidichuyen || raw.travel_fee || 0) || 0,
            travel_fee_status: raw.trangthaidichuyen || raw.travel_status || raw.travel_fee_status || null,
            travel_distance_km: Number(raw.quangduongkm || raw.travel_distance_km || 0) || null,
            inspection_fee: Number(raw.phikhaosat || raw.inspection_fee || 0) || 0,
            total_price: Number(raw.tongtien || raw.total_price || 0) || 0,
            status: status || opts.defaultStatus || 'new',
            provider: provider,
            // Subsidy feature fields
            actualCost: Number(raw.chiphithucte || raw.chi_phi_thuc_te || 0) || 0,
            subsidyAmount: Number(raw.sotientrogia || raw.so_tien_tro_gia || 0) || 0,
            customerPays: Number(raw.khachthanhtoan || raw.khach_thanh_toan || 0) || 0,
            bookingPricing: raw.booking_pricing || raw.bookingPricing || null,
            createdAt: createdAt,
            updatedAt: updatedAt
        };

        if (opts.includeRaw) {
            order._raw = raw;
        }

        return order;
    }

    /**
     * Tạo HTML nhãn trạng thái (Badge) tương ứng với giá trị trạng thái.
     * @param {string} status - Giá trị trạng thái.
     * @param {Object} statusMeta - Metadata nhãn (label).
     * @param {Object} statusClassMap - Mapping CSS class.
     * @returns {string} HTML span.
     */
    function buildStatusBadge(status, statusMeta, statusClassMap) {
        var meta = (statusMeta && statusMeta[status]) || { label: status };
        var cls = (statusClassMap && statusClassMap[status]) || 'status-new';
        return '<span class="status-badge ' + cls + '">' + escapeHtml(meta.label) + '</span>';
    }

    /**
     * Tạo HTML nút bấm xem chi tiết đơn hàng.
     * @param {string|number} orderId - ID đơn hàng.
     * @param {string} [label] - Nhãn nút bấm.
     * @returns {string} HTML button.
     */
    function buildDetailActionButton(orderId, label) {
        var buttonLabel = label || 'Xem chi tiết';
        return '<button class="btn-detail" type="button" data-action="view-detail" data-id="' + escapeHtml(orderId) + '">' + escapeHtml(buttonLabel) + '</button>';
    }

    /**
     * Tạo một dòng chi tiết dạng nhãn: giá trị.
     * @param {string} label - Tiêu đề.
     * @param {string} value - Nội dung hiển thị.
     * @returns {string} HTML div.
     */
    function buildDetailRow(label, value) {
        return '<div class="detail-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || 'N/A') + '</strong></div>';
    }

    /**
     * Lấy chuỗi mô tả phí di chuyển từ bảng giá đặt lịch.
     * @param {Object} bookingPricing - Cấu trúc giá đặt lịch.
     * @returns {string} Nội dung hiển thị.
     */
    function getTravelFeeText(bookingPricing) {
        if (!bookingPricing || !bookingPricing.travel) return 'Không phát sinh';

        var travel = bookingPricing.travel;
        if (travel.mode === 'per_km') {
            if (travel.status === 'ok' && Number.isFinite(Number(travel.amount))) {
                var text = moneyOrFree(travel.amount);
                if (Number.isFinite(Number(travel.distanceKm))) {
                    text += ' (~' + Number(travel.distanceKm).toFixed(1) + ' km)';
                }
                return text;
            }
            if (travel.status === 'loading') return 'Đang tính';
            if (travel.status === 'error') return 'Không tính được';
            return 'Chưa xác định';
        }

        if (travel.status === 'waiting_provider') {
            return 'Tạm tính 20.000 đ - 150.000 đ';
        }

        var hasMin = Number.isFinite(Number(travel.min));
        var hasMax = Number.isFinite(Number(travel.max));
        var hasAmount = Number.isFinite(Number(travel.amount));

        if (hasMin && hasMax && Number(travel.min) !== Number(travel.max)) {
            return formatCurrencyVn(travel.min) + ' - ' + formatCurrencyVn(travel.max);
        }
        if (hasAmount && Number(travel.amount) > 0) return moneyOrFree(travel.amount);
        if (hasMin && Number(travel.min) > 0) return moneyOrFree(travel.min);
        if (hasMax && Number(travel.max) > 0) return moneyOrFree(travel.max);
        return 'Không phát sinh';
    }

    /**
     * Tạo một dòng chi phí trong bảng liệt kê.
     * @param {string} label - Tên loại phí.
     * @param {string} value - Số tiền đã định dạng.
     * @param {string} [extraClass] - Class bổ sung.
     * @returns {string} HTML div.
     */
    function bookingLine(label, value, extraClass) {
        var rowClass = extraClass ? 'booking-line ' + extraClass : 'booking-line';
        return '<div class="' + rowClass + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
    }

    /**
     * Tạo HTML bảng tóm tắt chi phí đặt lịch (breakdown).
     * @param {Object} order - Đối tượng đơn hàng.
     * @param {Function} [getBookingPricing] - Hàm lấy cấu trúc giá từ đơn hàng.
     * @returns {string} HTML khối breakdown.
     */
    function buildBookingCostSummary(order, getBookingPricing) {
        var bookingPricing = typeof getBookingPricing === 'function' ? getBookingPricing(order) : null;
        if (!bookingPricing) {
            return '<span class="booking-missing">Chưa có dữ liệu chi phí từ modal đặt lịch.</span>';
        }

        var survey = bookingPricing.survey || { required: false, amount: 0 };
        var serviceText = bookingPricing.hasServicePrice
            ? moneyOrFree(bookingPricing.servicePrice)
            : 'Chưa cập nhật';
        var travelText = getTravelFeeText(bookingPricing);
        var surveyText = survey.required && Number(survey.amount) > 0
            ? formatCurrencyVn(survey.amount) + ' (nếu không sửa)'
            : 'Không phát sinh';

        var totalText = 'Chưa cập nhật';
        if (bookingPricing.totalPending) {
            totalText = 'Giá dịch vụ + phí di chuyển';
        } else if (Number.isFinite(Number(bookingPricing.totalEstimate))) {
            totalText = moneyOrFree(bookingPricing.totalEstimate);
        }

        var noteHtml = bookingPricing.note
            ? '<p class="booking-note-inline">' + escapeHtml(bookingPricing.note) + '</p>'
            : '';

        return '<div class="booking-breakdown">' +
            bookingLine('Giá dịch vụ', serviceText) +
            bookingLine('Phí di chuyển', travelText) +
            bookingLine('Phí khảo sát', surveyText) +
            bookingLine('Tổng tạm tính', totalText, 'booking-total') +
            noteHtml +
            '</div>';
    }

    global.ThoNhaOrderViewUtils = {
        escapeHtml: escapeHtml,
        toDigits: toDigits,
        normalizeDateTime: normalizeDateTime,
        sortByCreatedDesc: sortByCreatedDesc,
        formatDateTime: formatDateTime,
        formatCurrencyVn: formatCurrencyVn,
        moneyOrFree: moneyOrFree,
        getProviderIdFromOrderRow: getProviderIdFromOrderRow,
        mapProviderAccountRow: mapProviderAccountRow,
        mapProviderInlineFromOrderRow: mapProviderInlineFromOrderRow,
        buildProviderMapByIds: buildProviderMapByIds,
        mapApiOrderBase: mapApiOrderBase,
        buildStatusBadge: buildStatusBadge,
        buildDetailActionButton: buildDetailActionButton,
        buildDetailRow: buildDetailRow,
        buildBookingCostSummary: buildBookingCostSummary
    };
})(window);
