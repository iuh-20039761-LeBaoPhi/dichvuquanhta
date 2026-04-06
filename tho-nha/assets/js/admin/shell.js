// ==================== CORE FUNCTIONS ====================

// Check login
async function checkAdminLogin() {
    try {
        const session = await DVQTApp.checkSession();
        if (!session || !session.logged_in || session.role !== 'admin') {
            window.location.href = 'dang-nhap.html';
            return;
        }

        const username = session.name || 'Admin';
        const el = document.getElementById('adminUsername');
        const av = document.getElementById('userAvatar');
        if (el) el.textContent = username;
        if (av) av.textContent = username.charAt(0).toUpperCase();
    } catch (e) {
        window.location.href = 'dang-nhap.html';
    }
}
checkAdminLogin();

// Global data
let allOrders = [];
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
    const links = ['dashboard', 'orders', 'services', 'providers'];
    links.forEach(page => {
        const el = document.getElementById(page + 'Link');
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                loadPage(page);
            });
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
                if (window.DVQTApp && window.DVQTApp.logout) {
                    window.DVQTApp.logout().then(() => {
                        window.location.href = 'dang-nhap.html';
                    });
                } else {
                    localStorage.removeItem('admin_logged_in');
                    localStorage.removeItem('admin_username');
                    window.location.href = 'dang-nhap.html';
                }
            }
        });
    }
}

function loadPage(page) {
    currentPage = page;
    
    // Reset flags
    ['dashboard', 'orders', 'services', 'providers'].forEach(p => {
        window[p + 'Initialized'] = false;
    });

    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    const linkEl = document.getElementById(page + 'Link');
    if (linkEl) linkEl.classList.add('active');

    const titles = {
        dashboard: 'Tổng Quan',
        orders: 'Quản Lý Đơn Hàng',
        services: 'Quản Lý Dịch Vụ',
        providers: 'Quản Lý Nhà Cung Cấp'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Admin';

    const scriptFiles = {
        dashboard: 'dashboard.js',
        orders: 'orders.js',
        services: 'services.js',
        providers: 'providers.js'
    };

    const htmlFiles = {
        dashboard: 'tong-quan.html',
        orders: 'don-hang.html',
        services: 'dich-vu.html',
        providers: 'nha-cung-cap.html'
    };

    Promise.all([
        fetch(`${ADMIN_HTML_BASE}/${htmlFiles[page]}`).then(res => res.text()),
        fetch(`${ADMIN_JS_BASE}/${scriptFiles[page]}`).then(res => res.text())
    ]).then(([html, script]) => {
        document.getElementById('pageContent').innerHTML = html;
        
        // Inject script into global scope
        const scriptEl = document.createElement('script');
        scriptEl.textContent = script;
        document.body.appendChild(scriptEl);
        document.body.removeChild(scriptEl);

        const initFnName = 'init' + page.charAt(0).toUpperCase() + page.slice(1);
        if (typeof window[initFnName] === 'function') {
            window[initFnName]();
        } else {
            console.error(`Initialization function ${initFnName} not found after script injection.`);
        }
    });
}

// ==================== SHARED UTILITIES ====================

function formatCurrency(value) {
    return Number(value).toLocaleString('vi-VN') + ' đ';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN');
}

const statusMap = {
    'new':       { text: 'Chờ xác nhận',    cls: 'status-new' },
    'confirmed': { text: 'Đã xác nhận',     cls: 'status-confirmed' },
    'doing':     { text: 'Đang thực hiện',  cls: 'status-doing' },
    'done':      { text: 'Hoàn thành',      cls: 'status-done' },
    'cancel':    { text: 'Đã hủy',          cls: 'status-cancel' }
};

function getStatusBadge(status) {
    const s = statusMap[status] || { text: status, cls: 'status-pending' };
    return `<span class="status-badge ${s.cls}">${s.text}</span>`;
}

/**
 * Tóm gọn việc lấy danh sách đơn dành cho Admin thông qua Siêu Module.
 */
async function loadAllOrders() {
    const krudHelper = window.DVQTKrud;
    const viewUtils = window.ThoNhaOrderViewUtils;
    const orderService = window.ThoNhaOrderService;
    if (!krudHelper || !viewUtils) return [];

    try {
        // Sử dụng Siêu Module Milestone để lấy đơn hàng
        let rawRows = [];
        if (orderService) {
            rawRows = await orderService.getOrders('admin');
        } else {
            rawRows = await krudHelper.listTable('datlich_thonha');
        }
        
        const providerIdSet = {};
        rawRows.forEach(row => {
            const pid = viewUtils.getProviderIdFromOrderRow(row);
            if (pid) providerIdSet[pid] = true;
        });

        let providerMapById = {};
        try {
            const providerRows = await krudHelper.listTable('nhacungcap_thonha');
            providerMapById = viewUtils.buildProviderMapByIds(providerRows, providerIdSet);
        } catch(e) { console.warn('Provider map fail:', e); }

        allOrders = viewUtils.sortByCreatedDesc(rawRows.map((row, i) => {
            return viewUtils.mapApiOrderBase(row, i, {
                providerMapById: providerMapById,
                includeRaw: true
            });
        }));
        
        return allOrders;
    } catch(err) {
        console.error('loadAllOrders fail:', err);
        return [];
    }
}

async function loadAllServices() {
    const krud = window.DVQTKrud;
    if (!krud) return [];
    try {
        allCategories = await krud.listTable('danhmuc_thonha');
        return allCategories;
    } catch (e) {
        console.error('loadAllServices fail:', e);
        return [];
    }
}

function normalizeProviderStatus(value) {
    const s = String(value || '').trim().toLowerCase();
    if (['pending', 'cho_duyet', 'waiting'].includes(s)) return 'pending';
    if (['active', 'hoat_dong'].includes(s)) return 'active';
    return s;
}

function updateProviderBadge() {
    const krudHelper = window.DVQTKrud;
    if (!krudHelper) return;

    krudHelper.listTable('nhacungcap_thonha')
        .then((rows) => {
            const pending = rows.filter(item => normalizeProviderStatus(item.trangthai || item.status) === 'pending').length;
            const badge = document.getElementById('providerBadge');
            if (!badge) return;
            badge.textContent = pending;
            pending > 0 ? badge.classList.remove('hide') : badge.classList.add('hide');
        })
        .catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(updateProviderBadge, 1000); });