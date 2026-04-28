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

    displayRevenueChart(orders);
    loadDashboardStats();
}

function displayRevenueChart(orders) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    const currentYear = new Date().getFullYear();
    const monthlyData = Array(12).fill(0);

    orders.forEach(o => {
        if (o.status !== 'done') return;
        const d = o.createdAt || o.created_at;
        if (!d) return;
        const dateObj = new Date(d);
        if (dateObj.getFullYear() === currentYear) {
            const month = dateObj.getMonth();
            monthlyData[month] += Number(o.total_price || 0);
        }
    });

    const ctx = canvas.getContext('2d');
    if (window.myRevenueChart) {
        window.myRevenueChart.destroy();
    }

    const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    window.myRevenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: monthlyData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.raw || 0;
                            return 'Doanh thu: ' + val.toLocaleString('vi-VN') + ' đ';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        callback: function(value) {
                            if (value >= 1e6) return (value / 1e6) + ' triệu';
                            return value.toLocaleString('vi-VN') + ' đ';
                        }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });
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
    const total = window.allServices ? window.allServices.length : 0;
    const el = document.getElementById('dashTotalServices');
    if (el) el.textContent = total;

    if (allOrders.length > 0) {
        const unique = new Set(allOrders.map(o => o.customer && o.customer.phone ? String(o.customer.phone).trim() : '').filter(p => p)).size;
        const el = document.getElementById('dashTotalCustomers');
        if (el) el.textContent = unique;
    }
}
