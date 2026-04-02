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

    displayRecentOrders(orders.slice(0, 6));
    displayStatusStatsChart(orders);
    loadDashboardStats();
}

function displayRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;

    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Không có đơn hàng nào</td></tr>';
        return;
    }

    const viewUtils = window.ThoNhaOrderViewUtils;

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong style="color:var(--admin-primary)">${order.orderCode}</strong></td>
            <td>${order.customer && order.customer.name ? order.customer.name : 'Khách hàng'}</td>
            <td><span class="text-muted">${(order.service || '').split(',')[0] || '—'}</span></td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${viewUtils ? viewUtils.formatDateTime(order.createdAt).split(' ')[0] : (order.createdAt || '').split('T')[0]}</td>
        </tr>
    `).join('');
}

function displayStatusStatsChart(orders) {
    const container = document.getElementById('statusStatsChart');
    if (!container) return;

    const stats = {
        new:       orders.filter(o => o.status === 'new').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        doing:     orders.filter(o => o.status === 'doing').length,
        done:      orders.filter(o => o.status === 'done').length,
        cancel:    orders.filter(o => o.status === 'cancel').length
    };
    const total = orders.length || 1;

    const rows = [
        { label: 'Chờ xác nhận',   cls: 'status-new',       val: stats.new },
        { label: 'Đã xác nhận',    cls: 'status-confirmed',  val: stats.confirmed },
        { label: 'Đang thực hiện', cls: 'status-doing',      val: stats.doing },
        { label: 'Hoàn thành',     cls: 'status-done',       val: stats.done },
        { label: 'Đã hủy',         cls: 'status-cancel',     val: stats.cancel }
    ];

    container.innerHTML = rows.map(r => `
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="status-badge ${r.cls}">${r.label}</span>
                <span class="fw-bold text-muted">${r.val}</span>
            </div>
            <div class="progress" style="height:6px; border-radius:4px;">
                <div class="progress-bar" role="progressbar"
                     style="width:${Math.round(r.val/total*100)}%; background:var(--admin-gradient);"
                     aria-valuenow="${r.val}" aria-valuemin="0" aria-valuemax="${total}"></div>
            </div>
        </div>
    `).join('');
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
