/**
 * Admin API helper for Admin Chuyen Don.
 * Centralizes KRUD loading, table ensure, pagination helpers, and common queries.
 */
(function (window) {
    const KRUD_URL = "https://api.dvqt.vn/js/krud.js";
    const MOVING_SERVICE_ID = "12";
    const CONTACT_TABLE = "lien_he";
    const USERS_TABLE = "nguoidung";
    const ORDERS_TABLE = "dich_vu_chuyen_don_dat_lich";

    function normalizeText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function normalizeLowerText(value) {
        return normalizeText(value).toLowerCase();
    }

    function isNumericLikeKey(key) {
        return /^\d+$/.test(String(key || "").trim());
    }

    function extractRows(payload, depth = 0) {
        if (depth > 4 || payload == null) {
            return [];
        }

        if (Array.isArray(payload)) {
            return payload;
        }

        if (typeof payload !== "object") {
            return [];
        }

        const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
        for (const key of candidateKeys) {
            const value = payload[key];
            if (Array.isArray(value)) {
                return value;
            }
            const nested = extractRows(value, depth + 1);
            if (nested.length) {
                return nested;
            }
        }

        return [];
    }

    function normalizeKrudRow(row) {
        if (!row || typeof row !== "object") {
            return row;
        }

        return Object.fromEntries(
            Object.entries(row).filter(([key]) => !isNumericLikeKey(key))
        );
    }

    function normalizeKrudRows(rows) {
        return Array.isArray(rows) ? rows.map(normalizeKrudRow) : [];
    }

    function parseJsonObject(value) {
        if (value && typeof value === "object") {
            return value;
        }

        const raw = normalizeText(value);
        if (!raw) {
            return {};
        }

        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function splitServiceIds(value) {
        return String(value || "")
            .split(",")
            .map((item) => normalizeText(item))
            .filter(Boolean);
    }

    function hasMovingServiceId(value) {
        return splitServiceIds(value).includes(MOVING_SERVICE_ID);
    }

    function resolveMovingRole(row) {
        const role = normalizeLowerText(row?.vaitro || row?.role || "");
        if (role === "admin") {
            return "admin";
        }
        if (hasMovingServiceId(row?.id_dichvu)) {
            return "provider";
        }
        return "customer";
    }

    function hasSurveyFirst(row) {
        if (String(row?.can_khao_sat_truoc || "").trim() === "1") {
            return true;
        }

        const detailText = normalizeLowerText(row?.chi_tiet_dich_vu || "");
        if (detailText.includes("khảo sát trước") || detailText.includes("khao sat truoc")) {
            return true;
        }

        const payload = parseJsonObject(row?.du_lieu_form_json);
        return String(payload?.can_khao_sat_truoc || "").trim() === "1";
    }

    function isOrderCancelled(row) {
        const status = normalizeLowerText(row?.trang_thai || row?.status || "");
        return !!(
            normalizeText(row?.cancelled_at || "") ||
            ["da_huy", "cancelled", "canceled", "huy", "huy_bo"].includes(status)
        );
    }

    function isOrderCompleted(row) {
        const status = normalizeLowerText(row?.trang_thai || row?.status || "");
        return !!(
            normalizeText(row?.completed_at || "") ||
            ["da_xac_nhan", "xac_nhan", "hoan_tat", "completed", "confirmed", "success"].includes(status)
        );
    }

    function isOrderStarted(row) {
        const status = normalizeLowerText(row?.trang_thai || row?.status || "");
        return !!(
            normalizeText(row?.started_at || "") ||
            ["dang_trien_khai", "shipping", "started", "in_progress"].includes(status)
        );
    }

    function isOrderAccepted(row) {
        const status = normalizeLowerText(row?.trang_thai || row?.status || "");
        return !!(
            normalizeText(row?.accepted_at || "") ||
            ["dang_xu_ly", "processing", "accepted", "da_nhan", "assigned", "receiving"].includes(status)
        );
    }

    function isOrderPending(row) {
        return !isOrderCancelled(row) && !isOrderCompleted(row) && !isOrderStarted(row) && !isOrderAccepted(row);
    }

    function parseDateMs(value) {
        const raw = normalizeText(value);
        if (!raw) {
            return 0;
        }
        const ms = new Date(raw).getTime();
        return Number.isFinite(ms) ? ms : 0;
    }

    function isOrderOverdue(row, nowMs = Date.now()) {
        if (!isOrderPending(row)) {
            return false;
        }
        const createdMs = parseDateMs(row?.created_at || row?.created_date || "");
        if (!createdMs) {
            return false;
        }
        return nowMs - createdMs >= 120 * 60 * 1000;
    }

    async function ensureKrud() {
        if (typeof window.krud === "function" && typeof window.krudList === "function") {
            return true;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = KRUD_URL;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error("Khong the tai thu vien KRUD tu server."));
            document.head.appendChild(script);
        });
    }

    function sanitizeMovingPricingVehicleRow(row = {}) {
        return {
            id_dich_vu: normalizeText(row?.id_dich_vu),
            slug_xe: normalizeText(row?.slug_xe),
            ten_xe: normalizeText(row?.ten_xe),
            gia_mo_cua: Number(row?.gia_mo_cua || 0),
            don_gia_km_6_15: Number(row?.don_gia_km_6_15 || 0),
            don_gia_km_16_30: Number(row?.don_gia_km_16_30 || 0),
            don_gia_km_31_tro_len: Number(row?.don_gia_km_31_tro_len || 0),
            gia_moi_km_form: Number(row?.gia_moi_km_form || 0),
            gia_moi_km_duong_dai_form: Number(row?.gia_moi_km_duong_dai_form || 0),
            phi_toi_thieu_form: Number(row?.phi_toi_thieu_form || 0),
        };
    }

    function sanitizeMovingPricingItemRow(row = {}) {
        return {
            id_dich_vu: normalizeText(row?.id_dich_vu),
            nhom: normalizeText(row?.nhom),
            slug_muc: normalizeText(row?.slug_muc),
            ten_muc: normalizeText(row?.ten_muc),
            don_gia: Number(row?.don_gia || 0),
        };
    }

    const adminApi = {
        USERS_TABLE,
        ORDERS_TABLE,
        CONTACT_TABLE,
        MOVING_SERVICE_ID,
        normalizeText,
        normalizeLowerText,
        parseJsonObject,
        splitServiceIds,
        hasMovingServiceId,
        resolveMovingRole,
        hasSurveyFirst,
        isOrderPending,
        isOrderAccepted,
        isOrderStarted,
        isOrderCompleted,
        isOrderCancelled,
        isOrderOverdue,

        list: async (tableName, options = {}) => {
            await ensureKrud();
            const result = await window.krudList({ table: tableName, ...options });
            return normalizeKrudRows(extractRows(result));
        },

        listAll: async (tableName, options = {}) => {
            await ensureKrud();
            const limit = Number(options.limit || 200);
            const maxPages = Number(options.maxPages || 20);
            const rows = [];

            for (let page = 1; page <= maxPages; page += 1) {
                const result = await window.krudList({
                    table: tableName,
                    ...options,
                    page,
                    limit,
                });
                const batch = normalizeKrudRows(extractRows(result));
                if (!batch.length) {
                    break;
                }
                rows.push(...batch);
                if (batch.length < limit) {
                    break;
                }
            }

            return rows;
        },

        get: async (tableName, id) => {
            await ensureKrud();
            const result = await window.krudList({ table: tableName, id });
            const rows = normalizeKrudRows(extractRows(result));
            return rows[0] || null;
        },

        insert: async (tableName, data) => {
            await ensureKrud();
            return window.krud("insert", tableName, data);
        },

        update: async (tableName, data, id) => {
            await ensureKrud();
            return window.krud("update", tableName, data, id);
        },

        delete: async (tableName, id) => {
            await ensureKrud();
            return window.krud("delete", tableName, { id });
        },

        ensureNguoidungTable: async () => {
            await ensureKrud();
            return window.krud("ensure", USERS_TABLE, [
                { name: "hovaten", type: "text" },
                { name: "sodienthoai", type: "text" },
                { name: "email", type: "text" },
                { name: "diachi", type: "text" },
                { name: "matkhau", type: "text" },
                { name: "vaitro", type: "text" },
                { name: "id_dichvu", type: "text" },
                { name: "trangthai", type: "text" },
                { name: "created_date", type: "text" },
                { name: "updated_at", type: "text" },
                { name: "link_avatar", type: "text" },
                { name: "link_cccd_truoc", type: "text" },
                { name: "link_cccd_sau", type: "text" },
                { name: "ten_cong_ty", type: "text" },
                { name: "ma_so_thue", type: "text" },
                { name: "dia_chi_doanh_nghiep", type: "text" },
                { name: "loai_phuong_tien", type: "text" },
                { name: "note_admin", type: "text" },
            ]);
        },

        ensureOrdersTable: async () => {
            await ensureKrud();
            return window.krud("ensure", ORDERS_TABLE, [
                { name: "ma_yeu_cau_noi_bo", type: "text" },
                { name: "ho_ten", type: "text" },
                { name: "so_dien_thoai", type: "text" },
                { name: "customer_email", type: "text" },
                { name: "ten_cong_ty", type: "text" },
                { name: "loai_dich_vu", type: "text" },
                { name: "ten_dich_vu", type: "text" },
                { name: "dia_chi_di", type: "text" },
                { name: "dia_chi_den", type: "text" },
                { name: "ngay_thuc_hien", type: "text" },
                { name: "khung_gio_thuc_hien", type: "text" },
                { name: "ten_khung_gio_thuc_hien", type: "text" },
                { name: "loai_xe", type: "text" },
                { name: "ten_loai_xe", type: "text" },
                { name: "thoi_tiet_du_kien", type: "text" },
                { name: "ten_thoi_tiet_du_kien", type: "text" },
                { name: "dieu_kien_tiep_can", type: "text" },
                { name: "chi_tiet_dich_vu", type: "text" },
                { name: "can_khao_sat_truoc", type: "text" },
                { name: "du_lieu_form_json", type: "text" },
                { name: "pricing_breakdown_json", type: "text" },
                { name: "khoang_cach_km", type: "number" },
                { name: "tong_tam_tinh", type: "number" },
                { name: "tong_tien", type: "number" },
                { name: "trang_thai", type: "text" },
                { name: "ghi_chu", type: "text" },
                { name: "note_admin", type: "text" },
                { name: "cancel_reason", type: "text" },
                { name: "anh_dinh_kem", type: "text" },
                { name: "video_dinh_kem", type: "text" },
                { name: "provider_id", type: "text" },
                { name: "provider_note", type: "text" },
                { name: "provider_report_anh_dinh_kem", type: "text" },
                { name: "provider_report_video_dinh_kem", type: "text" },
                { name: "accepted_at", type: "text" },
                { name: "started_at", type: "text" },
                { name: "completed_at", type: "text" },
                { name: "cancelled_at", type: "text" },
                { name: "customer_feedback", type: "text" },
                { name: "customer_rating", type: "number" },
                { name: "customer_feedback_anh_dinh_kem", type: "text" },
                { name: "customer_feedback_video_dinh_kem", type: "text" },
                { name: "created_at", type: "text" },
                { name: "updated_at", type: "text" },
            ]);
        },

        ensureContactTable: async () => {
            await ensureKrud();
            return window.krud("ensure", CONTACT_TABLE, [
                { name: "name", type: "text" },
                { name: "email", type: "text" },
                { name: "phone", type: "text" },
                { name: "subject", type: "text" },
                { name: "message", type: "text" },
                { name: "service_key", type: "text" },
                { name: "service_name", type: "text" },
                { name: "status", type: "number" },
                { name: "note_admin", type: "text" },
                { name: "created_at", type: "text" },
                { name: "updated_at", type: "text" },
            ]);
        },

        ensureMovingPricingTables: async () => {
            await ensureKrud();

            await window.krud("ensure", "bang_gia_chuyen_don_xe", [
                { name: "id_dich_vu", type: "text" },
                { name: "slug_xe", type: "text" },
                { name: "ten_xe", type: "text" },
                { name: "gia_mo_cua", type: "number" },
                { name: "don_gia_km_6_15", type: "number" },
                { name: "don_gia_km_16_30", type: "number" },
                { name: "don_gia_km_31_tro_len", type: "number" },
                { name: "gia_moi_km_form", type: "number" },
                { name: "gia_moi_km_duong_dai_form", type: "number" },
                { name: "phi_toi_thieu_form", type: "number" },
            ]);

            return window.krud("ensure", "bang_gia_chuyen_don_muc", [
                { name: "id_dich_vu", type: "text" },
                { name: "nhom", type: "text" },
                { name: "slug_muc", type: "text" },
                { name: "ten_muc", type: "text" },
                { name: "don_gia", type: "number" },
            ]);
        },

        listProviders: async () => {
            await adminApi.ensureNguoidungTable();
            const rows = await adminApi.listAll(USERS_TABLE, {
                sort: { id: "desc" },
                limit: 200,
                maxPages: 10,
            });

            return rows
                .map((row) => ({
                    ...row,
                    moving_role: resolveMovingRole(row),
                }))
                .filter((row) => row.moving_role === "provider");
        },

        listMovingPricingVehicles: async (idDichVu = "") => {
            const rows = await adminApi.list("bang_gia_chuyen_don_xe", { limit: 1000 });
            if (!idDichVu) {
                return rows;
            }
            return rows.filter((row) => normalizeText(row?.id_dich_vu) === normalizeText(idDichVu));
        },

        listMovingPricingItems: async (idDichVu = "") => {
            const rows = await adminApi.list("bang_gia_chuyen_don_muc", { limit: 1000 });
            if (!idDichVu) {
                return rows;
            }
            return rows.filter((row) => normalizeText(row?.id_dich_vu) === normalizeText(idDichVu));
        },

        getMovingPricingVehicleKey: (row) => {
            const serviceId = normalizeText(row?.id_dich_vu);
            const slug = normalizeText(row?.slug_xe);
            return serviceId && slug ? `${serviceId}::${slug}` : "";
        },

        getMovingPricingItemKey: (row) => {
            const serviceId = normalizeText(row?.id_dich_vu);
            const groupKey = normalizeText(row?.nhom);
            const slug = normalizeText(row?.slug_muc);
            return serviceId && groupKey && slug ? `${serviceId}::${groupKey}::${slug}` : "";
        },

        saveMovingPricingVehicle: async (row, currentRow = null) => {
            const payload = sanitizeMovingPricingVehicleRow(row);
            if (currentRow?.id) {
                return adminApi.update("bang_gia_chuyen_don_xe", payload, currentRow.id);
            }
            return adminApi.insert("bang_gia_chuyen_don_xe", payload);
        },

        saveMovingPricingItem: async (row, currentRow = null) => {
            const payload = sanitizeMovingPricingItemRow(row);
            if (currentRow?.id) {
                return adminApi.update("bang_gia_chuyen_don_muc", payload, currentRow.id);
            }
            return adminApi.insert("bang_gia_chuyen_don_muc", payload);
        },

        deleteMovingPricingVehicle: async (id) => adminApi.delete("bang_gia_chuyen_don_xe", id),
        deleteMovingPricingItem: async (id) => adminApi.delete("bang_gia_chuyen_don_muc", id),
    };

    window.adminApi = adminApi;
})(window);
