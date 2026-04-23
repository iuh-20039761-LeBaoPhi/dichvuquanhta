(function (global) {
    'use strict';

    var CUSTOMER_KEY = 'thonha_customer_profile_v1';
    var PROVIDER_KEY = 'thonha_provider_profile_v1';

    /**
     * Metadata cho các trạng thái đơn hàng (nhãn hiển thị).
     */
    var STATUS_META = {
        new: { label: 'Chờ xác nhận' },
        confirmed: { label: 'Đã tiếp nhận' },
        doing: { label: 'Đang thực hiện' },
        done: { label: 'Hoàn thành' },
        cancel: { label: 'Đã hủy' }
    };

    /**
     * Lấy cấu hình giá mẫu dựa trên tên dịch vụ.
     * @param {Object} order - Đối tượng đơn hàng.
     * @returns {Object|null} Cấu trúc giá mẫu hoặc null.
     */
    function getPresetBookingPricing(order) {
        var serviceName = String(order && order.service || '').trim();
        if (!serviceName || !BOOKING_PRICING_PRESETS[serviceName]) return null;

        var preset = BOOKING_PRICING_PRESETS[serviceName];
        var travel = preset.travel ? {
            mode: preset.travel.mode,
            status: preset.travel.status,
            amount: preset.travel.amount,
            min: preset.travel.min,
            max: preset.travel.max,
            distanceKm: preset.travel.distanceKm
        } : null;

        return {
            servicePrice: preset.servicePrice,
            hasServicePrice: true,
            travel: travel,
            survey: {
                required: !!(preset.survey && preset.survey.required),
                amount: preset.survey && Number.isFinite(Number(preset.survey.amount)) ? Number(preset.survey.amount) : 0
            },
            totalEstimate: Number.isFinite(Number(preset.totalEstimate)) ? Number(preset.totalEstimate) : null,
            totalPending: !!preset.totalPending,
            note: preset.note || ''
        };
    }

    /**
     * Chỉ giữ lại các chữ số trong chuỗi.
     * @param {string} value - Chuỗi đầu vào.
     * @returns {string} Chuỗi số.
     */
    function toDigits(value) {
        return String(value || '').replace(/\D/g, '');
    }

    /**
     * Chuyển đổi giá trị thành số nguyên (tiền tệ) hoặc null nếu không hợp lệ.
     * @param {any} value - Giá trị cần chuyển đổi.
     * @returns {number|null} Số tiền đã làm tròn hoặc null.
     */
    function toOptionalMoneyNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.round(value);
        }

        var digits = String(value).replace(/\D/g, '');
        if (!digits) return null;
        return Number(digits);
    }

    /**
     * Lấy giá trị đầu tiên được định nghĩa từ danh sách các field.
     * @param {Object} source - Đối thủ nguồn.
     * @param {Array} keys - Danh sách các key cần kiểm tra.
     * @returns {any|null} Giá trị tìm thấy hoặc null.
     */
    function pickFirstDefined(source, keys) {
        if (!source) return null;
        for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
                return source[key];
            }
        }
        return null;
    }

    /**
     * Chuẩn hóa dữ liệu phí di chuyển từ bảng giá hoặc đơn hàng.
     * @param {Object} order - Đơn hàng thô.
     * @param {Object} bookingPricing - Cấu trúc giá hiện tại.
     * @returns {Object|null} Cấu trúc phí di chuyển chuẩn hoá.
     */
    function normalizeTravelPricing(order, bookingPricing) {
        var travelObj = bookingPricing && bookingPricing.travelFee && typeof bookingPricing.travelFee === 'object'
            ? bookingPricing.travelFee
            : null;

        var mode = pickFirstDefined(bookingPricing, ['travelFeeMode', 'travelMode']);
        if (!mode && travelObj) mode = travelObj.mode;
        if (!mode) mode = pickFirstDefined(order, ['travel_fee_mode', 'travelFeeMode', 'travel_mode']);

        var status = pickFirstDefined(bookingPricing, ['travelFeeStatus', 'travelStatus']);
        if (!status && travelObj) status = travelObj.status;
        if (!status) status = pickFirstDefined(order, ['trangthaidichuyen', 'travel_fee_status', 'travelFeeStatus']);

        var amount = toOptionalMoneyNumber(pickFirstDefined(bookingPricing, ['travelFeeAmount', 'travelAmount']));
        if (amount === null && travelObj) amount = toOptionalMoneyNumber(pickFirstDefined(travelObj, ['amount', 'fixedAmount']));
        if (amount === null) amount = toOptionalMoneyNumber(pickFirstDefined(order, ['travel_fee', 'travelFee']));

        var min = toOptionalMoneyNumber(pickFirstDefined(bookingPricing, ['travelFeeMin', 'travelMin']));
        if (min === null && travelObj) min = toOptionalMoneyNumber(pickFirstDefined(travelObj, ['min', 'fixedAmount']));

        var max = toOptionalMoneyNumber(pickFirstDefined(bookingPricing, ['travelFeeMax', 'travelMax']));
        if (max === null && travelObj) max = toOptionalMoneyNumber(pickFirstDefined(travelObj, ['max', 'fixedAmount']));

        if (amount === null && min !== null) amount = min;
        if (min === null && amount !== null) min = amount;
        if (max === null && amount !== null) max = amount;

        var distanceRaw = pickFirstDefined(bookingPricing, ['travelDistanceKm', 'distanceKm']);
        if (distanceRaw === null && travelObj) distanceRaw = pickFirstDefined(travelObj, ['distanceKm']);
        if (distanceRaw === null) distanceRaw = pickFirstDefined(order, ['travel_distance_km', 'travelDistanceKm']);
        var distanceKm = distanceRaw === null ? null : Number(distanceRaw);
        if (!Number.isFinite(distanceKm)) distanceKm = null;

        if (!mode && amount !== null) mode = 'fixed';
        if (!mode && status) mode = 'per_km';
        if (!mode && amount === null && min === null && max === null) {
            return null;
        }

        mode = String(mode || '').toLowerCase() === 'per_km' ? 'per_km' : 'fixed';

        if (!status) {
            status = mode === 'per_km'
                ? (amount !== null ? 'ok' : 'pending')
                : 'ok';
        }

        return {
            mode: mode,
            status: String(status),
            amount: amount,
            min: min,
            max: max,
            distanceKm: distanceKm
        };
    }

    /**
     * Lấy cấu trúc chi phí chi tiết (breakdown) của đơn hàng.
     * @param {Object} order - Đối tượng đơn hàng đã hoặc chưa ánh xạ.
     * @returns {Object|null} Cấu trúc giá chi tiết.
     */
    function getBookingPricing(order) {
        if (!order || typeof order !== 'object') return null;

        var bookingPricing = order.bookingPricing && typeof order.bookingPricing === 'object'
            ? order.bookingPricing
            : null;

        var servicePrice = toOptionalMoneyNumber(pickFirstDefined(bookingPricing, ['servicePrice', 'estimatedPrice']));
        if (servicePrice === null) {
            servicePrice = toOptionalMoneyNumber(pickFirstDefined(order, ['estimated_price', 'estimatedPrice']));
        }

        var travel = normalizeTravelPricing(order, bookingPricing);

        var surveyAmount = toOptionalMoneyNumber(pickFirstDefined(bookingPricing, ['surveyFeeAmount', 'inspectionFee']));
        if (surveyAmount === null && bookingPricing && bookingPricing.surveyFee && typeof bookingPricing.surveyFee === 'object') {
            surveyAmount = toOptionalMoneyNumber(bookingPricing.surveyFee.amount);
        }
        if (surveyAmount === null) {
            surveyAmount = toOptionalMoneyNumber(pickFirstDefined(order, ['inspection_fee', 'inspectionFee']));
        }
        if (surveyAmount === null) surveyAmount = 0;

        var surveyRequired = !!(
            pickFirstDefined(bookingPricing, ['surveyRequired']) ||
            (bookingPricing && bookingPricing.surveyFee && bookingPricing.surveyFee.required) ||
            pickFirstDefined(order, ['survey_required']) ||
            surveyAmount > 0
        );

        var totalEstimate = toOptionalMoneyNumber(pickFirstDefined(bookingPricing, ['totalEstimate', 'totalPrice']));
        if (totalEstimate === null) {
            totalEstimate = toOptionalMoneyNumber(pickFirstDefined(order, ['total_price', 'totalPrice']));
        }

        var totalPending = false;
        if (totalEstimate === null) {
            var baseValue = servicePrice === null ? 0 : servicePrice;
            if ((travel && travel.mode === 'per_km' && travel.status !== 'ok') || (travel && travel.status === 'waiting_provider')) {
                if (servicePrice !== null || travel.amount !== null || travel.status === 'waiting_provider') {
                    totalPending = true;
                }
            } else if (servicePrice !== null || (travel && travel.amount !== null)) {
                totalEstimate = baseValue + (travel && travel.amount !== null ? travel.amount : 0);
            }
        }

        var hasData = servicePrice !== null || !!travel || surveyRequired || surveyAmount > 0 || totalEstimate !== null || totalPending;
        if (!hasData) {
            return getPresetBookingPricing(order);
        }

        var note = pickFirstDefined(bookingPricing, ['note']);
        if (!note && surveyRequired && surveyAmount > 0) {
            note = 'Phí khảo sát được miễn nếu đồng ý sửa chữa.';
        }

        return {
            servicePrice: servicePrice,
            hasServicePrice: servicePrice !== null,
            travel: travel,
            survey: {
                required: surveyRequired,
                amount: surveyAmount
            },
            totalEstimate: totalEstimate,
            totalPending: totalPending,
            note: note || ''
        };
    }

    /**
     * Thử giải mã chuỗi JSON một cách an toàn.
     * @param {string} raw - Chuỗi thô.
     * @param {any} fallback - Giá trị dự phòng nếu lỗi.
     * @returns {Object|any} Kết quả đã parse hoặc giá trị dự phòng.
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
     * Lấy thông tin hồ sơ Khách hàng - Dựa trên cookie dvqt_u (SĐT).
     * Cookie dvqt_u là nguồn đáng tin cậy nhất, được set khi đăng nhập.
     */
    function getCustomerProfile() {
        // Ưu tiên lấy SĐT từ cookie dvqt_u
        var phone = '';
        try {
            var v = document.cookie.match('(^|;) ?dvqt_u=([^;]*)(;|$)');
            phone = v ? v[2] : '';
        } catch(e) {}

        // Bổ sung thông tin từ session cache nếu có
        var s = window._dvqt_session_cache || window._thonha_session_cache || {};
        return {
            id: s.id || '',
            name: s.name || 'Khách hàng',
            phone: phone || s.phone || '',
            address: s.address || ''
        };
    }

    /**
     * Lấy thông tin hồ sơ Nhà cung cấp - Dựa trên cookie dvqt_u + kiểm tra id_dichvu=9.
     * Chỉ trả về profile hợp lệ nếu user có id_dichvu chứa '9'.
     */
    function getProviderProfile() {
        var s = window._dvqt_session_cache || window._thonha_session_cache || {};
        var serviceIds = String(s.id_dichvu || '0').split(',');
        var isProvider = serviceIds.includes('9');

        if (!isProvider) return { name: '', phone: '', id: '' };

        // Lấy SĐT từ cookie dvqt_u
        var phone = '';
        try {
            var v = document.cookie.match('(^|;) ?dvqt_u=([^;]*)(;|$)');
            phone = v ? v[2] : '';
        } catch(e) {}

        return {
            id: s.id || '',
            role: 'provider',
            name: s.name || 'Nhà cung cấp',
            phone: phone || s.phone || '',
            company: (s.extra && s.extra.company) || s.company || '',
            categories: (s.extra && s.extra.danh_muc_thuc_hien) || s.danh_muc_thuc_hien || s.categories || '',
            address: (s.extra && s.extra.address) || s.address || '',
            avatar: (s.extra && s.extra.avatartenfile) || s.avatartenfile || '',
            cccd_front: (s.extra && s.extra.cccdmattruoctenfile) || s.cccdmattruoctenfile || '',
            cccd_back: (s.extra && s.extra.cccdmatsautenfile) || s.cccdmatsautenfile || ''
        };
    }

    /**
     * Cập nhật hồ sơ Nhà cung cấp (Không còn dùng localStorage)
     */
    function setProviderProfile(profile) {
        if (profile) {
            window._dvqt_session_cache = Object.assign(window._dvqt_session_cache || {}, profile);
            window._thonha_session_cache = Object.assign(window._thonha_session_cache || {}, profile);
        }
    }

    var _orders = [];

    /**
     * Cập nhật danh sách đơn hàng đã chuẩn hóa.
     * @param {Array} orders - Danh sách đơn hàng mới.
     */
    function setOrders(orders) {
        _orders = Array.isArray(orders) ? orders : [];
    }

    /**
     * Lấy danh sách đơn hàng hiện có.
     * @returns {Array} Danh sách đơn hàng.
     */
    function getOrders() {
        return _orders;
    }

    global.ThoNhaOrderStore = {
        statusMeta: STATUS_META,
        getBookingPricing: getBookingPricing,
        getCustomerProfile: getCustomerProfile,
        getProviderProfile: getProviderProfile,
        setProviderProfile: setProviderProfile,
        setOrders: setOrders,
        getOrders: getOrders
    };
})(window);
