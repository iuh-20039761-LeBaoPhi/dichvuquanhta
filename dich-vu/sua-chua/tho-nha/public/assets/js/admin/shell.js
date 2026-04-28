'use strict';

// Global shared variables
window.allOrders = [];
window.allCategories = [];

// Check login via Central SSO
async function checkAdminLogin() {
    try {
        const getCookie = (name) => {
            const cookies = document.cookie.split(';');
            const cookie = cookies.find(c => c.trim().startsWith(name + '='));
            return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
        };

        const adminE = getCookie('admin_e');
        const adminP = getCookie('admin_p');
        if (!adminE || !adminP) {
            window.location.href = '../../../../public/admin-login.html';
            return;
        }

        // Verify with backend
        const adminListData = await window.DVQTKrud.listTable('admin', { limit: 100 });
        const isValidAdmin = adminListData.find(x => x.email === adminE && x.matkhau === adminP);
        
        if (!isValidAdmin) {
            document.cookie = "admin_e=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "admin_p=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = '../../../../public/admin-login.html';
            return;
        }

        const username = adminE.split('@')[0];
        const el = document.getElementById('adminUsernameDisplay');
        const av = document.getElementById('userAvatar');
        if (el) el.textContent = username;
        if (av) av.textContent = username.charAt(0).toUpperCase();
    } catch (e) {
        console.error("SSO Error:", e);
        window.location.href = '../../../../public/admin-login.html';
    }
}
checkAdminLogin();

// Global data
let allOrders = [];
let allCategories = [];
let currentPage = 'dashboard';
const ADMIN_HTML_BASE = '.';
const ADMIN_JS_BASE = '../public/assets/js/admin/pages';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Note: Navigation setup moved to quan-tri.html sidebar loader
    loadPage('dashboard');
});

// ==================== NAVIGATION ====================

function setupNavigation() {
    const links = ['dashboard', 'orders', 'services'];
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
                document.cookie = "admin_e=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "admin_p=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.href = '../../../../public/admin-login.html';
            }
        });
    }
}

function loadPage(page) {
    currentPage = page;
    
    // Reset flags
    ['dashboard', 'orders', 'services'].forEach(p => {
        window[p + 'Initialized'] = false;
    });

    document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
    const linkEl = document.getElementById(page + 'Link');
    if (linkEl) linkEl.classList.add('active');

    const titles = {
        dashboard: 'Tổng Quan',
        orders: 'Quản Lý Đơn Hàng',
        services: 'Quản Lý Dịch Vụ'
    };
    const titleEl = document.getElementById('pageTitleDisplay');
    if (titleEl) titleEl.textContent = titles[page] || 'Admin';

    const scriptFiles = {
        dashboard: 'dashboard.js',
        orders: 'orders.js',
        services: 'services.js'
    };

    const htmlFiles = {
        dashboard: 'tong-quan.html',
        orders: 'don-hang.html',
        services: 'dich-vu.html'
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
        // Lấy tất cả dữ liệu (hạn mức 1000) để phục vụ phân trang ở phía Client
        const rawRows = await krudHelper.listTable('datlich_thonha', { limit: 1000 });
        
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
        
        if (window.ThoNhaOrderStore) {
            window.ThoNhaOrderStore.setOrders(allOrders);
        }
        
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
        allCategories = await krud.listTable('danhmuc_thonha', { limit: 1000 }).catch(() => []);
        window.allServices = await krud.listTable('dichvu_thonha', { limit: 1000 }).catch(() => []);
        
        allCategories.forEach(cat => {
            cat.services = window.allServices.filter(s => String(s.id_danhmuc) === String(cat.id));
        });
        
        // Kích hoạt tính toán lại thống kê sau khi nạp xong
        if (typeof loadDashboardStats === 'function') {
            loadDashboardStats();
        }
        
        return allCategories;
    } catch (e) {
        console.error('loadAllServices fail:', e);
        return [];
    }
}
