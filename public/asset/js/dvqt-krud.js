/**
 * DVQT KRUD HELPER
 * Thư viện trung gian hỗ trợ tương tác với API KRUD (Create, Read, Update, Delete)
 * Dùng chung cho toàn bộ hệ thống Dịch Vụ Quanh Ta.
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.DVQTKrud = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DEFAULT_SCRIPT_URL = 'https://api.dvqt.vn/js/krud.js';
    var scriptPromise = null;

    /**
     * Đảm bảo thư viện KRUD từ server được tải thành công trước khi gọi hàm.
     * @param {string} scriptUrl - URL script tùy chọn (mặc định dùng DEFAULT_SCRIPT_URL)
     * @returns {Promise<boolean>}
     */
    function ensureKrudClient(scriptUrl) {
        var url = scriptUrl || DEFAULT_SCRIPT_URL;
        if (typeof window.krud === 'function' && typeof window.krudList === 'function') {
            return Promise.resolve(true);
        }
        if (scriptPromise) return scriptPromise;

        scriptPromise = new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[src="' + url + '"]');
            if (existing) {
                if (typeof window.krud === 'function' && typeof window.krudList === 'function') {
                    resolve(true);
                    return;
                }
                existing.addEventListener('load', function () { resolve(true); }, { once: true });
                existing.addEventListener('error', function () {
                    reject(new Error('Không thể tải thư viện KRUD core'));
                }, { once: true });
                return;
            }

            var script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = function () { resolve(true); };
            script.onerror = function () { reject(new Error('Không thể tải thư viện KRUD core')); };
            document.head.appendChild(script);
        }).catch(function (err) {
            scriptPromise = null;
            throw err;
        });

        return scriptPromise;
    }

    /**
     * Kiểm tra xem kết quả từ API có thành công hay không.
     * @param {Object} result - Kết quả trả về từ API
     * @returns {boolean}
     */
    function isSuccess(result) {
        return !!result && !result.error && result.success !== false;
    }

    /**
     * Trích xuất thông báo lỗi từ kết quả API.
     * @param {Object} result - Kết quả trả về từ API
     * @param {string} fallback - Thông báo mặc định nếu không tìm thấy lỗi cụ thể
     * @returns {string}
     */
    function getErrorMessage(result, fallback) {
        if (!result || typeof result !== 'object') {
            return fallback || 'Không thể xử lý dữ liệu';
        }
        return String(result.error || result.message || fallback || 'Không thể xử lý dữ liệu');
    }

    /**
     * Chuẩn hóa dữ liệu mảng trả về (Xử lý các cấu trúc bọc dữ liệu khác nhau).
     * @param {Object} result - Kết quả trả về từ API
     * @returns {Array} Mảng dữ liệu đã chuẩn hóa
     */
    function normalizeRows(result) {
        if (Array.isArray(result)) return result;
        if (!result || typeof result !== 'object') return [];

        if (result.error) throw new Error(String(result.error));
        if (result.success === false) throw new Error(String(result.message || 'Không lấy được dữ liệu'));

        var keys = ['data', 'rows', 'list', 'items', 'result'];
        for (var i = 0; i < keys.length; i += 1) {
            var value = result[keys[i]];
            if (Array.isArray(value)) return value;
        }

        return [];
    }

    /**
     * Lấy danh sách dữ liệu từ một bảng.
     * @param {string} tableName - Tên bảng cần truy vấn
     * @param {Object} options - Các tùy chọn bộ lọc, sắp xếp (tùy chọn)
     * @param {string} scriptUrl - URL script tùy chọn
     * @returns {Promise<Array>}
     */
    async function listTable(tableName, options, scriptUrl) {
        await ensureKrudClient(scriptUrl);
        if (typeof window.krudList !== 'function') {
            throw new Error('Hàm krudList chưa sẵn sàng');
        }

        var payload = Object.assign({ table: tableName }, options || {});
        return normalizeRows(await window.krudList(payload));
    }

    /**
     * Thực thi một hành động (insert/update/delete) lên database.
     * @param {string} action - Hành động: 'insert', 'update', 'delete'
     * @param {string} tableName - Tên bảng
     * @param {Object} data - Dữ liệu cần xử lý
     * @param {number|string} id - ID của bản ghi (nếu là update/delete)
     * @param {string} scriptUrl - URL script tùy chọn
     * @returns {Promise<Object>}
     */
    async function runAction(action, tableName, data, id, scriptUrl) {
        await ensureKrudClient(scriptUrl);
        if (typeof window.krud !== 'function') {
            throw new Error('Hàm krud chưa sẵn sàng');
        }

        var hasId = id !== null && id !== undefined;
        var result = await window.krud(action, tableName, data || {}, hasId ? id : null);
        if (!isSuccess(result)) {
            throw new Error(getErrorMessage(result, 'Không thể cập nhật dữ liệu'));
        }

        return result;
    }

    /**
     * Thêm một bản ghi mới vào bảng.
     * @param {string} tableName 
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async function insertRow(tableName, data, scriptUrl) {
        return runAction('insert', tableName, data, null, scriptUrl);
    }

    /**
     * Cập nhật bản ghi theo ID.
     * @param {string} tableName 
     * @param {number|string} id 
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async function updateRow(tableName, id, data, scriptUrl) {
        return runAction('update', tableName, data, id, scriptUrl);
    }

    return {
        ensureKrudClient: ensureKrudClient,
        normalizeRows: normalizeRows,
        isSuccess: isSuccess,
        getErrorMessage: getErrorMessage,
        listTable: listTable,
        runAction: runAction,
        insertRow: insertRow,
        updateRow: updateRow
    };
}));
