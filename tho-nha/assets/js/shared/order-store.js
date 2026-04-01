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
     * Dữ liệu giá mặc định cho một số dịch vụ phổ biến (Presets).
     */
    var BOOKING_PRICING_PRESETS = {
        'Sửa máy giặt tại nhà': {
            servicePrice: 420000,
            travel: { mode: 'fixed', status: 'ok', amount: 30000, min: 30000, max: 30000, distanceKm: null },
            survey: { required: false, amount: 0 },
            totalEstimate: 450000,
            totalPending: false,
            note: ''
        },
        'Vệ sinh máy lạnh': {
            servicePrice: 0,
            travel: { mode: 'per_km', status: 'pending', amount: null, min: null, max: null, distanceKm: null },
            survey: { required: true, amount: 120000 },
            totalEstimate: null,
            totalPending: true,
            note: 'Phí khảo sát được miễn nếu đồng ý sửa chữa.'
        },
        'Thông tắc bồn rửa': {
            servicePrice: 250000,
            travel: { mode: 'fixed', status: 'ok', amount: 20000, min: 20000, max: 20000, distanceKm: null },
            survey: { required: false, amount: 0 },
            totalEstimate: 270000,
            totalPending: false,
            note: ''
        },
        'Sửa ổ điện âm tường': {
            servicePrice: 180000,
            travel: { mode: 'per_km', status: 'ok', amount: 40000, min: 40000, max: 40000, distanceKm: 6.3 },
            survey: { required: false, amount: 0 },
            totalEstimate: 220000,
            totalPending: false,
            note: ''
        },
        'Lắp quạt trần': {
            servicePrice: 350000,
            travel: { mode: 'fixed', status: 'ok', amount: 25000, min: 25000, max: 25000, distanceKm: null },
            survey: { required: false, amount: 0 },
            totalEstimate: 375000,
            totalPending: false,
            note: ''
        },
        'Sơn lại phòng ngủ': {
            servicePrice: 1800000,
            travel: { mode: 'fixed', status: 'ok', amount: 50000, min: 50000, max: 50000, distanceKm: null },
            survey: { required: true, amount: 150000 },
            totalEstimate: 1850000,
            totalPending: false,
            note: 'Phí khảo sát được miễn nếu đồng ý sửa chữa.'
        }
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
        if (!status) status = pickFirstDefined(order, ['travel_fee_status', 'travelFeeStatus']);

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
            if (travel && travel.mode === 'per_km' && travel.status !== 'ok') {
                if (servicePrice !== null || travel.amount !== null) {
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
     * Lấy thông tin hồ sơ Khách hàng hiện tại.
     * @returns {Object} Hồ sơ khách hàng.
     */
    function getCustomerProfile() {
        var profile = safeParse(localStorage.getItem(CUSTOMER_KEY), null);
        if (profile && profile.name && profile.phone) {
            return profile;
        }

        return { name: 'Khách hàng', phone: '', address: '' };
    }

    /**
     * Lấy thông tin hồ sơ Nhà cung cấp hiện tại.
     * @returns {Object} Hồ sơ thợ.
     */
    function getProviderProfile() {
        var profile = safeParse(localStorage.getItem(PROVIDER_KEY), null);
        if (profile && profile.id) {
            return profile;
        }

        var name = String(localStorage.getItem('provider_name') || '').trim();
        var company = String(localStorage.getItem('provider_company') || '').trim();
        var phone = String(localStorage.getItem('provider_phone') || '').trim();
        var phoneDigits = toDigits(phone);

        return {
            id: phoneDigits ? ('provider-' + phoneDigits) : '',
            name: name || 'Nhà cung cấp',
            phone: phone,
            company: company || ''
        };
    }

    /**
     * Cập nhật hồ sơ Nhà cung cấp vào LocalStorage.
     * @param {Object} profile - Hồ sơ mới.
     */
    function setProviderProfile(profile) {
        if (!profile || !profile.id) return;
        localStorage.setItem(PROVIDER_KEY, JSON.stringify(profile));
    }

    global.ThoNhaOrderStore = {
        statusMeta: STATUS_META,
        getBookingPricing: getBookingPricing,
        getCustomerProfile: getCustomerProfile,
        getProviderProfile: getProviderProfile,
        setProviderProfile: setProviderProfile
    };
})(window);
