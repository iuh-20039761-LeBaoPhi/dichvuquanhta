// Dashboard Page Script

window.initDashboard = function() {
    if (window.dashboardInitialized) return;
    window.dashboardInitialized = true;

    loadAllOrders().then(orders => updateDashboardStats(orders));
    loadAllServices();
};

function updateDashboardStats(orders) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('dashTotalOrders',   orders.length);
    set('dashPendingOrders', orders.filter(o => o.status === 'new').length);
    set('dashDoingOrders',   orders.filter(o => o.status === 'doing' || o.status === 'confirmed').length);
    set('dashCompleteOrders',orders.filter(o => o.status === 'done').length);

    displayRecentOrders(orders.slice(0, 10)); // Tăng lên 10 đơn cho Dashboard
    loadDashboardStats();
    setupDashboardActions();
}

function setupDashboardActions() {
    // Action delegation for View Detail
    document.addEventListener('click', e => {
        const viewBtn = e.target.closest('[data-action="view-detail"]');
        if (viewBtn) {
            const id = viewBtn.dataset.id;
            showDashboardDetail(id);
        }

        const backBtn = e.target.closest('[data-action="back-to-list-dash"]');
        if (backBtn) {
            document.getElementById('dashboardDetailSection').hidden = true;
            document.getElementById('dashboardListSection').hidden = false;
        }
    });
}

function showDashboardDetail(orderId) {
    const listSec = document.getElementById('dashboardListSection');
    const detailSec = document.getElementById('dashboardDetailSection');
    const content = document.getElementById('dashDetailContent');
    
    if (!listSec || !detailSec || !content) return;

    const order = (window.allOrders || []).find(o => String(o.id) === String(orderId));
    if (!order) return;

    listSec.hidden = true;
    detailSec.hidden = false;
    content.innerHTML = '<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    if (window.ThoNhaOrderUI) {
        window.ThoNhaOrderUI.renderDetails(order, content);
    }
}

function displayRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTable');
    const mobileContainer = document.getElementById('recentOrdersMobileList');
    if (!tbody && !mobileContainer) return;

    const ui = window.ThoNhaOrderUI;
    if (ui) {
        ui.renderList(orders, 'admin', {
            body: tbody,
            mobile: mobileContainer
        });
    }
}



function loadDashboardStats() {
    if (allCategories.length > 0) {
        const total = allCategories.reduce((sum, cat) => sum + (cat.services ? cat.services.length : 0), 0);
        const el = document.getElementById('dashTotalServices');
        if (el) el.textContent = total;
    }

    if (allOrders.length > 0) {
        const unique = new Set(allOrders.map(o => o.customer && o.customer.phone ? String(o.customer.phone).trim() : '').filter(p => p)).size;
        const el = document.getElementById('dashTotalCustomers');
        if (el) el.textContent = unique;
    }
}
