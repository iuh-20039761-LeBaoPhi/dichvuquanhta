// ==================== CORE FUNCTIONS ====================

// Check login
(function checkAdminLogin() {
    const isLocalLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
    const localUsername = localStorage.getItem('admin_username') || 'Admin';

    console.log('[AdminShell] Checking login status...', { isLocalLoggedIn, localUsername });

    if (isLocalLoggedIn) {
        console.log('[AdminShell] Local login detected. Updating UI.');
        const el = document.getElementById('adminUsername');
        const av = document.getElementById('userAvatar');
        if (el) el.textContent = localUsername;
        if (av) av.textContent = localUsername.charAt(0).toUpperCase();
        return;
    }

    console.log('[AdminShell] No local session. Verifying with server via check-session.php...');
    fetch('../../api/admin/auth/check-session.php')
        .then(res => res.json())
        .then(res => {
            console.log('[AdminShell] Server session response:', res);
            if (res.status !== 'logged_in') {
                console.warn('[AdminShell] Not logged in. Redirecting to login page...');
                localStorage.removeItem('admin_logged_in');
                localStorage.removeItem('admin_username');
                window.location.href = 'dang-nhap.html';
                return;
            }

            const username = res.username || localUsername;
            const el = document.getElementById('adminUsername');
            const av = document.getElementById('userAvatar');
            if (el) el.textContent = username;
            if (av) av.textContent = username.charAt(0).toUpperCase();
            localStorage.setItem('admin_logged_in', 'true');
            localStorage.setItem('admin_username', username);
            console.log('[AdminShell] Server session valid. User:', username);
        })
        .catch((err) => {
            console.error('[AdminShell] check-session.php error:', err);
            window.location.href = 'dang-nhap.html';
        });
})();

// Global data
let allOrders = [];
let cancelRequests = [];
let allCategories = [];
let currentPage = 'dashboard';
const ADMIN_HTML_BASE = '../../pages/admin';
const ADMIN_JS_BASE = '../../assets/js/admin/pages';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    loadPage('dashboard');
});

// ==================== NAVIGATION ====================

function setupNavigation() {
    document.getElementById('dashboardLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadPage('dashboard');
    });

    document.getElementById('ordersLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadPage('orders');
    });

    document.getElementById('cancelRequestsLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadPage('cancelRequests');
    });

    document.getElementById('servicesLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadPage('services');
    });

    document.getElementById('providersLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadPage('providers');
    });

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            localStorage.removeItem('admin_logged_in');
            localStorage.removeItem('admin_username');
            
            fetch('../../api/admin/auth/logout.php')
                .then(() => window.location.href = 'dang-nhap.html')
                .catch(() => window.location.href = 'dang-nhap.html');
        }
    });
}

function loadPage(page) {
    currentPage = page;
    
    // Reset tất cả initialization flags
    window.dashboardInitialized = false;
    window.ordersInitialized = false;
    window.cancelRequestsInitialized = false;
    window.servicesInitialized = false;
    window.providersInitialized = false;
    // Update active menu
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    const linkEl = document.getElementById(page + 'Link');
    if (linkEl) linkEl.classList.add('active');

    // Load content based on page
    switch(page) {
        case 'dashboard':
            document.getElementById('pageTitle').textContent = 'Tổng Quan';
            loadDashboardPage();
            break;
        case 'orders':
            document.getElementById('pageTitle').textContent = 'Quản Lý Đơn Hàng';
            loadOrdersPage();
            break;
        case 'cancelRequests':
            document.getElementById('pageTitle').textContent = 'Yêu Cầu Hủy Đơn';
            loadCancelRequestsPage();
            break;
        case 'services':
            document.getElementById('pageTitle').textContent = 'Quản Lý Dịch Vụ';
            loadServicesPage();
            break;
        case 'providers':
            document.getElementById('pageTitle').textContent = 'Quản Lý Nhà Cung Cấp';
            loadProvidersPage();
            break;
    }
}

// ==================== PAGE LOADERS ====================

function loadDashboardPage() {
    Promise.all([
        fetch(`${ADMIN_HTML_BASE}/tong-quan.html`).then(res => res.text()),
        fetch(`${ADMIN_JS_BASE}/dashboard.js`).then(res => res.text())
    ]).then(([html, script]) => {
        document.getElementById('pageContent').innerHTML = html;
        eval(script);
        if (typeof initDashboard === 'function') initDashboard();
    });
}

function loadOrdersPage() {
    Promise.all([
        fetch(`${ADMIN_HTML_BASE}/don-hang.html`).then(res => res.text()),
        fetch(`${ADMIN_JS_BASE}/orders.js`).then(res => res.text())
    ]).then(([html, script]) => {
        document.getElementById('pageContent').innerHTML = html;
        eval(script);
        if (typeof initOrders === 'function') initOrders();
    });
}

function loadCancelRequestsPage() {
    Promise.all([
        fetch(`${ADMIN_HTML_BASE}/yeu-cau-huy.html`).then(res => res.text()),
        fetch(`${ADMIN_JS_BASE}/cancel-request.js`).then(res => res.text())
    ]).then(([html, script]) => {
        document.getElementById('pageContent').innerHTML = html;
        eval(script);
        if (typeof initCancelRequests === 'function') initCancelRequests();
    });
}

function loadServicesPage() {
    Promise.all([
        fetch(`${ADMIN_HTML_BASE}/dich-vu.html`).then(res => res.text()),
        fetch(`${ADMIN_JS_BASE}/services.js`).then(res => res.text())
    ]).then(([html, script]) => {
        document.getElementById('pageContent').innerHTML = html;
        eval(script);
        if (typeof initServices === 'function') initServices();
    });
}

function loadProvidersPage() {
    Promise.all([
        fetch(`${ADMIN_HTML_BASE}/nha-cung-cap.html`).then(res => res.text()),
        fetch(`${ADMIN_JS_BASE}/providers.js`).then(res => res.text())
    ]).then(([html, script]) => {
        document.getElementById('pageContent').innerHTML = html;
        eval(script);
        if (typeof initProviders === 'function') initProviders();
    });
}

// ==================== SHARED UTILITIES ====================

// Format currency
function formatCurrency(value) {
    return Number(value).toLocaleString('vi-VN') + ' đ';
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN');
}

// Format datetime
function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('vi-VN');
}

// Status map
const statusMap = {
    'new':       { text: 'Chờ xác nhận',    cls: 'status-new' },
    'confirmed': { text: 'Đã xác nhận',     cls: 'status-confirmed' },
    'doing':     { text: 'Đang thực hiện',  cls: 'status-doing' },
    'done':      { text: 'Hoàn thành',      cls: 'status-done' },
    'cancel':    { text: 'Đã hủy',          cls: 'status-cancel' }
};

// Get status badge HTML
function getStatusBadge(status) {
    const s = statusMap[status] || { text: status, cls: 'status-pending' };
    return `<span class="status-badge ${s.cls}">${s.text}</span>`;
}

/**
 * Gọi danh sách bản ghi từ KRUD API
 * @param {string} table - Tên bảng cần lấy dữ liệu
 * @returns {Promise<Object|Array>} Kết quả từ API
 */
async function fetchKrudList(table) {
    try {
        if (typeof window.krudList === 'function') {
            return await window.krudList({ table: table });
        }
        // Fallback to direct fetch
        const res = await fetch('https://api.dvqt.vn/list/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: table })
        });
        const data = await res.json();
        return data;
    } catch(err) {
        console.error(`fetchKrudList for ${table} failed:`, err);
        throw err;
    }
}

/**
 * Tải toàn bộ đơn hàng và ánh xạ thông tin Nhà cung cấp
 * @returns {Promise<Array>} Danh sách đơn hàng đã chuẩn hoá
 */
async function loadAllOrders() {
    console.log('[AdminShell] loadAllOrders starting...');
    if (typeof ensureAdminKrudClient !== 'function') {
        console.error('ensureAdminKrudClient not found');
        return [];
    }
    const viewUtils = window.ThoNhaOrderViewUtils;
    if (!viewUtils) {
        console.error('ThoNhaOrderViewUtils not loaded');
        return [];
    }
    
    try {
        await ensureAdminKrudClient();
        console.log('[AdminShell] KRUD client ensured. Fetching datlich_thonha...');
        
        const res = await fetchKrudList('datlich_thonha');
        const rawRows = normalizeProviderRows(res);
        console.log(`[AdminShell] Fetched ${rawRows.length} raw rows.`);

        const providerIdSet = {};
        rawRows.forEach(row => {
            const pid = viewUtils.getProviderIdFromOrderRow(row);
            if (pid) providerIdSet[pid] = true;
        });

        let providerMapById = {};
        try {
            console.log('[AdminShell] Fetching provider mapping...');
            const pRes = await fetchKrudList('nhacungcap_thonha');
            const providerRows = normalizeProviderRows(pRes);
            providerMapById = viewUtils.buildProviderMapByIds(providerRows, providerIdSet);
            console.log(`[AdminShell] Mapped ${Object.keys(providerMapById).length} providers.`);
        } catch(e) { 
            console.warn('[AdminShell] Could not load providers for mapping:', e);
        }

        allOrders = viewUtils.sortByCreatedDesc(rawRows.map((row, i) => {
            return viewUtils.mapApiOrderBase(row, i, {
                providerMapById: providerMapById,
                includeRaw: true
            });
        }));
        
        console.log('[AdminShell] Order mapping complete. Total:', allOrders.length);
        return allOrders;
    } catch(err) {
        console.error('[AdminShell] loadAllOrders CRITICAL error:', err);
        return [];
    }
}

// Load cancel requests
function loadAllCancelRequests() {
    return fetch('../../api/admin/orders/get-cancel-requests.php')
        .then(res => res.text())
        .then(text => {
            let res;
            try { res = JSON.parse(text); } catch(e) { return []; }
            if (res && res.status === 'success') {
                cancelRequests = res.data;
                updateCancelBadge();
            }
            return cancelRequests;
        })
        .catch(err => { console.warn('Cancel requests API fail:', err); return []; });
}

// Load services
function loadAllServices() {
    return fetch('../../api/admin/services/manage.php?action=get_all')
        .then(res => res.text())
        .then(text => {
            let res;
            try { res = JSON.parse(text); } catch(e) { return []; }
            if (res && res.status === 'success') {
                allCategories = res.data;
            }
            return allCategories;
        })
        .catch(err => { console.warn('Services API fail:', err); return []; });
}

// Update cancel badge
function updateCancelBadge() {
    const pending = cancelRequests.filter(r => r.cancel_status === 'pending').length;
    const badge = document.getElementById('cancelBadge');
    if (!badge) return;
    badge.textContent = pending;
    if (pending > 0) {
        badge.classList.remove('hide');
    } else {
        badge.classList.add('hide');
    }
}

const ADMIN_PROVIDER_TABLE = 'nhacungcap_thonha';
const ADMIN_KRUD_SCRIPT_URL = 'https://api.dvqt.vn/js/krud.js';
let adminKrudPromise = null;

function ensureAdminKrudClient() {
    if (typeof window.krudList === 'function') {
        return Promise.resolve(true);
    }

    if (adminKrudPromise) return adminKrudPromise;

    adminKrudPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${ADMIN_KRUD_SCRIPT_URL}"]`);
        if (existing) {
            if (typeof window.krudList === 'function') {
                resolve(true);
                return;
            }
            existing.addEventListener('load', () => resolve(true), { once: true });
            existing.addEventListener('error', () => reject(new Error('Không tải được KRUD')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = ADMIN_KRUD_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Không tải được KRUD'));
        document.head.appendChild(script);
    }).catch((err) => {
        adminKrudPromise = null;
        throw err;
    });

    return adminKrudPromise;
}

function normalizeProviderRows(res) {
    if (Array.isArray(res)) return res;
    if (!res || typeof res !== 'object') return [];
    if (res.error) throw new Error(res.error);
    if (res.success === false) throw new Error(res.message || 'Không lấy được dữ liệu nhà cung cấp');
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.rows)) return res.rows;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.result)) return res.result;
    return [];
}

function normalizeProviderStatus(value) {
    const s = String(value || '').trim().toLowerCase();
    if (!s) return 'pending';
    if (['pending', 'cho_duyet', 'choduyet', 'new', 'waiting'].includes(s)) return 'pending';
    if (['active', 'approved', 'hoatdong', 'hoat_dong', 'enabled'].includes(s)) return 'active';
    if (['rejected', 'reject', 'tu_choi', 'tuchoi', 'declined'].includes(s)) return 'rejected';
    if (['blocked', 'khoa', 'locked', 'disabled'].includes(s)) return 'blocked';
    return s;
}

// Update provider pending badge
function updateProviderBadge() {
    ensureAdminKrudClient()
        .then(() => window.krudList({ table: ADMIN_PROVIDER_TABLE }))
        .then((res) => {
            const rows = normalizeProviderRows(res);
            const pending = rows.filter((item) => normalizeProviderStatus(item.trangthai || item.trang_thai || item.status) === 'pending').length;
            const badge = document.getElementById('providerBadge');
            if (!badge) return;
            badge.textContent = pending;
            if (pending > 0) { badge.classList.remove('hide'); }
            else        { badge.classList.add('hide'); }
        })
        .catch(() => {});
}

// Auto-load provider badge on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateProviderBadge, 800);
});