(function (global) {
    'use strict';

    var DEFAULT_SCRIPT_URL = 'https://api.dvqt.vn/js/krud.js';
    var scriptPromise = null;

    /**
     * Đảm bảo thư viện KRUD đã được tải vào trang.
     * @param {string} [scriptUrl] - URL thư viện (tuỳ chọn).
     * @returns {Promise<boolean>} Promise thực thi khi thư viện sẵn sàng.
     */
    function ensureKrudClient(scriptUrl) {
        var url = scriptUrl || DEFAULT_SCRIPT_URL;
        if (typeof global.krud === 'function' && typeof global.krudList === 'function') {
            return Promise.resolve(true);
        }
        if (scriptPromise) return scriptPromise;

        scriptPromise = new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[src="' + url + '"]');
            if (existing) {
                if (typeof global.krud === 'function' && typeof global.krudList === 'function') {
                    resolve(true);
                    return;
                }
                existing.addEventListener('load', function () { resolve(true); }, { once: true });
                existing.addEventListener('error', function () {
                    reject(new Error('Khong tai duoc thu vien KRUD')); }, { once: true });
                return;
            }

            var script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = function () { resolve(true); };
            script.onerror = function () { reject(new Error('Khong tai duoc thu vien KRUD')); };
            document.head.appendChild(script);
        }).catch(function (err) {
            scriptPromise = null;
            throw err;
        });

        return scriptPromise;
    }

    /**
     * Kiểm tra xem phản hồi từ KRUD API có thành công hay không.
     * @param {Object} result - Phản hồi từ API.
     * @returns {boolean} True nếu thành công.
     */
    function isSuccess(result) {
        return !!result && !result.error && result.success !== false;
    }

    /**
     * Lấy nội dung lỗi từ phản hồi của API.
     * @param {Object} result - Phản hồi lỗi.
     * @param {string} [fallback] - Thông báo thay thế.
     * @returns {string} Nội dung lỗi.
     */
    function getErrorMessage(result, fallback) {
        if (!result || typeof result !== 'object') {
            return fallback || 'Khong the xu ly du lieu';
        }
        return String(result.error || result.message || fallback || 'Khong the xu ly du lieu');
    }

    /**
     * Chuẩn hóa kết quả trả về từ KRUD API thành dạng mảng (Array).
     * @param {Object|Array} result - Kết quả thô.
     * @returns {Array} Mảng các bản ghi.
     */
    function normalizeRows(result) {
        if (Array.isArray(result)) return result;
        if (!result || typeof result !== 'object') return [];

        if (result.error) throw new Error(String(result.error));
        if (result.success === false) throw new Error(String(result.message || 'Khong lay duoc du lieu'));

        var keys = ['data', 'rows', 'list', 'items', 'result'];
        for (var i = 0; i < keys.length; i += 1) {
            var value = result[keys[i]];
            if (Array.isArray(value)) return value;
        }

        return [];
    }

    /**
     * Lấy danh sách các dòng từ một bảng.
     * @param {string} tableName - Tên bảng KRUD.
     * @param {Object} [options] - Các tuỳ chọn filter/sort.
     * @param {string} [scriptUrl] - URL KRUD script.
     * @returns {Promise<Array>} Danh sách bản ghi.
     */
    async function listTable(tableName, options, scriptUrl) {
        await ensureKrudClient(scriptUrl);
        if (typeof global.krudList !== 'function') {
            throw new Error('Ham krudList chua san sang');
        }

        var payload = Object.assign({ table: tableName }, options || {});
        return normalizeRows(await global.krudList(payload));
    }

    /**
     * Thực thi một hành động (insert/update/delete) lên KRUD API.
     * @param {string} action - Hành động (insert, update, delete).
     * @param {string} tableName - Tên bảng.
     * @param {Object} data - Dữ liệu cần gửi.
     * @param {string|number} [id] - ID bản ghi (nếu có).
     * @param {string} [scriptUrl] - URL KRUD script.
     * @returns {Promise<Object>} Phản hồi từ API.
     */
    async function runAction(action, tableName, data, id, scriptUrl) {
        await ensureKrudClient(scriptUrl);
        if (typeof global.krud !== 'function') {
            throw new Error('Ham krud chua san sang');
        }

        var hasId = id !== null && id !== undefined;
        var result = await global.krud(action, tableName, data || {}, hasId ? id : null);
        if (!isSuccess(result)) {
            throw new Error(getErrorMessage(result, 'Khong the cap nhat du lieu'));
        }

        return result;
    }

    /**
     * Chèn một dòng mới vào bảng.
     * @param {string} tableName - Tên bảng.
     * @param {Object} data - Dữ liệu bản ghi mới.
     * @param {string} [scriptUrl] - URL KRUD script.
     * @returns {Promise<Object>} Phản hồi từ API.
     */
    async function insertRow(tableName, data, scriptUrl) {
        return runAction('insert', tableName, data, null, scriptUrl);
    }

    /**
     * Cập nhật một dòng hiện có trong bảng.
     * @param {string} tableName - Tên bảng.
     * @param {string|number} id - ID bản ghi cần cập nhật.
     * @param {Object} data - Dữ liệu mới.
     * @param {string} [scriptUrl] - URL KRUD script.
     * @returns {Promise<Object>} Phản hồi từ API.
     */
    async function updateRow(tableName, id, data, scriptUrl) {
        return runAction('update', tableName, data, id, scriptUrl);
    }

    global.ThoNhaKrud = {
        ensureKrudClient: ensureKrudClient,
        normalizeRows: normalizeRows,
        isSuccess: isSuccess,
        getErrorMessage: getErrorMessage,
        listTable: listTable,
        runAction: runAction,
        insertRow: insertRow,
        updateRow: updateRow
    };
})(window);
