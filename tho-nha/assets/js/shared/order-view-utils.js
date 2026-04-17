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

    function formatDate(value) {
        if (!value) return 'N/A';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
    }

    function formatTime(value) {
        if (!value) return 'N/A';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
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
        var value = raw.id_nhacungcap || raw.idnhacungcap || raw.nhacungcapid || raw.provider_id || raw.providerId || '';
        var pid = String(value || '').trim();
        // CHÍNH XÁC: Nếu ID là "0" hoặc trống thì coi như chưa có thợ
        if (!pid || pid === '0' || pid === 'null') return null;
        return pid;
    }

    /**
     * Ánh xạ bản ghi tài khoản người dùng từ bảng 'nguoidung'.
     * @param {Object} row - Dữ liệu thô.
     * @returns {Object|null} Đối tượng đã chuẩn hoá.
     */
    function mapProviderAccountRow(row) {
        var raw = row || {};
        var userId = String(raw.id || '').trim();
        if (!userId) return null;

        return {
            id: userId,
            name: raw.hovaten || raw.name || 'Người dùng',
            phone: raw.sodienthoai || raw.phone || '',
            categories: raw.id_dichvu || '',
            role: (raw.id_dichvu && raw.id_dichvu !== '0') ? 'provider' : 'customer'
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

        // Chỉ trả về ID, thông tin chi tiết sẽ được lấy qua join/lookup bảng 'nguoidung'
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
     * Suy luận trạng thái đơn hàng dựa trên các mốc thời gian (Priority-based).
     * @param {Object} row - Dữ liệu thô từ API.
     * @returns {string} Trạng thái suy luận.
     */
    function deriveStatusFromDates(row) {
        if (row.ngayhuy) return 'cancel';
        if (row.ngayhoanthanhthucte) return 'done';
        if (row.ngaybatdauthucte || row.ngaythuchienthucte) return 'doing';
        // Nếu có ngày nhận HOẶC đã có ID nhà cung cấp thì coi như đã xác nhận
        var providerId = String(row.id_nhacungcap || '').trim();
        if (row.ngaynhan || (providerId && providerId !== '0' && providerId !== 'null')) return 'confirmed';
        if (row.ngaydat) return 'new';
        // Fallback
        return row.trangthai || row.status || 'new';
    }

    /**
     * Ánh xạ dữ liệu API đơn hàng thành đối tượng chuẩn (Universal Order Object).
     * @param {Object} row - Dữ liệu thô từ API.
     * @param {number} index - Chỉ số đơn hàng trong danh sách.
     * @param {Object} options - Các tuỳ chọn bổ sung.
     * @returns {Object} Đối tượng đơn hàng đã chuẩn hoá.
     */
    function mapApiOrderBase(row, index, options) {
        var raw = row || {};
        var opts = options || {};

        // Logic trạng thái mới: Suy luận từ các cột thời gian
        var status = deriveStatusFromDates(raw);

        var createdAt = normalizeDateTime(raw.ngaydat) || nowIsoFallback();
        // Cập nhật là chính nó nếu không dùng cột cập nhật riêng
        var updatedAt = createdAt;

        var serviceName = raw.tendichvu || raw.ten_dich_vu || raw.service_name || raw.service || (opts.defaultServiceName || 'Dịch vụ tại nhà');

        // Milestone ID & Code
        var rawId = raw.id || raw.ID || 0;
        var orderCode = String(rawId).padStart(7, '0');

        var order = {
            id: String(rawId),
            orderCode: orderCode,
            customer: {
                name: raw.tenkhachhang || raw.ten_kh || raw.customer_name || raw.hovaten || raw.name || 'Khách hàng',
                phone: raw.sdtkhachhang || raw.sdt_kh || raw.customer_phone || raw.sodienthoai || raw.phone || '',
                address: raw.diachikhachhang || raw.dia_chi_kh || raw.customer_address || raw.diachi || raw.address || '',
                email: raw.emailkhachhang || raw.email_kh || raw.email || ''
            },
            address: raw.diachikhachhang || raw.dia_chi_kh || raw.customer_address || raw.diachi || raw.address || '',
            service: serviceName,
            note: raw.ghichu || raw.ghi_chu || raw.note || '',
            status: status,
            // Mốc thời gian thực tế
            dates: {
                ordered: raw.ngaydat || raw.ngay_dat || raw.created_at || null,
                cancelled: raw.ngayhuy || null,
                accepted: raw.ngaynhan || null,
                started: raw.ngaybatdauthucte || raw.ngaythuchienthucte || null,
                completed: raw.ngayhoanthanhthucte || null
            },
            // Thông tin NCC thực hiện
            provider: {
                id: getProviderIdFromOrderRow(raw),
                name: raw.tenncc || 'Nhà cung cấp',
                phone: raw.sdtncc || '',
                address: raw.diachincc || '',
                email: raw.emailncc || ''
            },
            estimated_price: Number(raw.giadichvu || raw.gia_dich_vu || 0),
            actualCost: Number(raw.chiphithucte || raw.chiphi_thuc_te || 0),
            subsidyAmount: Number(raw.sotientrogia || raw.tro_gia || 0),
            customerPays: Number(raw.khachthanhtoan || raw.khach_tra || 0),
            total_price: Number(raw.tongtien || raw.tong_tien || raw.total_price || 0),
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
    function buildStatusBadge(status) {
        switch (status) {
            case 'new':       return '<span class="invoice-status-chip status-new">Mới</span>';
            case 'confirmed': return '<span class="invoice-status-chip status-confirmed"><i class="fa-solid fa-check-circle me-1"></i>Đã nhận</span>';
            case 'doing':     return '<span class="invoice-status-chip status-doing"><i class="fa-solid fa-spinner fa-spin me-1"></i>Đang làm</span>';
            case 'done':      return '<span class="invoice-status-chip status-done">Hoàn thành</span>';
            case 'cancel':    return '<span class="invoice-status-chip status-canceled">Đã hủy</span>';
            default:          return '<span class="invoice-status-chip status-canceled">' + escapeHtml(status) + '</span>';
        }
    }

    /**
     * Tạo HTML nút bấm xem chi tiết đơn hàng (Link tới trang riêng).
     * @param {string|number} orderId - ID đơn hàng.
     * @param {string} [label] - Nhãn nút bấm.
     * @returns {string} HTML button.
     */
    function buildDetailActionButton(orderId, label) {
        var buttonLabel = label || 'Xem chi tiết';
        var url = 'chi-tiet-don-hang.html?id=' + orderId;
        
        // Nếu đang ở trong thư mục sâu (như pages/admin), cần điều chỉnh đường dẫn
        var depth = window.location.pathname.split('/').length;
        if (depth > 5) { // Ví dụ: /tho-nha/pages/admin/quan-tri.html -> length là 6
            url = '../../chi-tiet-don-hang.html?id=' + orderId;
        }

        return '<a href="' + url + '" class="btn-detail" data-action="view-detail" data-id="' + escapeHtml(orderId) + '" style="text-decoration:none;">' + escapeHtml(buttonLabel) + '</a>';
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

        // Nếu không có cấu trúc bookingPricing từ Modal, hãy tự tạo từ data đơn hàng
        if (!bookingPricing) {
            bookingPricing = {
                hasServicePrice: (order.estimated_price > 0),
                servicePrice: order.estimated_price,
                travel: {
                    mode: 'fixed',
                    amount: order._raw.phidichuyen || 0,
                    distanceKm: order._raw.quangduongkm || 0
                },
                survey: {
                    required: (order.actualCost > 0 || order._raw.phikhaosat > 0),
                    amount: order._raw.phikhaosat || 0
                },
                totalEstimate: order.total_price,
                note: order.note
            };
        }

        var survey = bookingPricing.survey || { required: false, amount: 0 };
        var serviceText = bookingPricing.hasServicePrice
            ? moneyOrFree(bookingPricing.servicePrice)
            : (order.estimated_price > 0 ? moneyOrFree(order.estimated_price) : 'Chưa cập nhật');

        // Travel fee text
        var tAmt = Number(bookingPricing.travel.amount || 0);
        var travelText = tAmt > 0 ? formatCurrencyVn(tAmt) : 'Chưa cập nhật';
        if (bookingPricing.travel.distanceKm > 0) {
            travelText += ' (~' + Number(bookingPricing.travel.distanceKm).toFixed(1) + ' km)';
        }

        var surveyText = survey.required && Number(survey.amount) > 0
            ? formatCurrencyVn(survey.amount) + ' (nếu không sửa)'
            : 'Không phát sinh';

        var totalText = order.total_price > 0
            ? formatCurrencyVn(order.total_price)
            : (bookingPricing.totalEstimate > 0 ? moneyOrFree(bookingPricing.totalEstimate) : 'Đang tính...');

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
        formatDate: formatDate,
        formatTime: formatTime,
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
