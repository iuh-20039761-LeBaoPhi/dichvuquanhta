(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ThoNhaKrud = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DEFAULT_SCRIPT_URL = 'https://api.dvqt.vn/js/krud.js';
    var scriptPromise = null;

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

    function isSuccess(result) {
        return !!result && !result.error && result.success !== false;
    }

    function getErrorMessage(result, fallback) {
        if (!result || typeof result !== 'object') {
            return fallback || 'Khong the xu ly du lieu';
        }
        return String(result.error || result.message || fallback || 'Khong the xu ly du lieu');
    }

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

    async function listTable(tableName, options, scriptUrl) {
        await ensureKrudClient(scriptUrl);
        if (typeof window.krudList !== 'function') {
            throw new Error('Ham krudList chua san sang');
        }

        var payload = Object.assign({ table: tableName }, options || {});
        return normalizeRows(await window.krudList(payload));
    }

    async function runAction(action, tableName, data, id, scriptUrl) {
        await ensureKrudClient(scriptUrl);
        if (typeof window.krud !== 'function') {
            throw new Error('Ham krud chua san sang');
        }

        var hasId = id !== null && id !== undefined;
        var result = await window.krud(action, tableName, data || {}, hasId ? id : null);
        if (!isSuccess(result)) {
            throw new Error(getErrorMessage(result, 'Khong the cap nhat du lieu'));
        }

        return result;
    }

    async function insertRow(tableName, data, scriptUrl) {
        return runAction('insert', tableName, data, null, scriptUrl);
    }

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
