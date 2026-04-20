/**
 * Admin Stats Dashboard Charts
 * Uses Chart.js and chartjs-plugin-datalabels
 */

(function (window, document) {
    const chartRefs = {
        revenue: null,
        service: null,
        package: null,
    };

    function destroyCharts() {
        Object.keys(chartRefs).forEach((key) => {
            if (chartRefs[key]) {
                chartRefs[key].destroy();
                chartRefs[key] = null;
            }
        });
    }

    function buildRevenueChart(chartData) {
        const revenueCtx = document.getElementById("revenueChart");
        if (!revenueCtx) return;

        chartRefs.revenue = new Chart(revenueCtx, {
            type: "line",
            data: {
                labels: chartData.revenue.labels,
                datasets: [
                    {
                        label: "Doanh thu (VNĐ)",
                        data: chartData.revenue.revenue,
                        borderColor: "#ff7a00",
                        backgroundColor: "rgba(255, 122, 0, 0.1)",
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        yAxisID: "y",
                    },
                    {
                        label: "Số đơn hàng",
                        data: chartData.revenue.orders,
                        borderColor: "#0a2a66",
                        backgroundColor: "#0a2a66",
                        borderWidth: 2,
                        type: "bar",
                        yAxisID: "y1",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: "linear",
                        display: true,
                        position: "left",
                        title: { display: true, text: "Doanh thu (đ)" },
                    },
                    y1: {
                        type: "linear",
                        display: true,
                        position: "right",
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: "Số đơn" },
                    },
                },
                plugins: {
                    legend: { position: "top" },
                },
            },
        });
    }

    function buildServiceChart(chartData) {
        const serviceCtx = document.getElementById("serviceChart");
        if (!serviceCtx) return;

        chartRefs.service = new Chart(serviceCtx, {
            type: "doughnut",
            data: {
                labels: chartData.service.labels,
                datasets: [
                    {
                        data: chartData.service.data,
                        backgroundColor: ["#ff7a00", "#0a2a66", "#28a745", "#17a2b8", "#6c757d"],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                },
            },
        });
    }

    function buildPackageChart(chartData) {
        const packageCtx = document.getElementById("packageChart");
        if (!packageCtx) return;

        chartRefs.package = new Chart(packageCtx, {
            type: "pie",
            data: {
                labels: chartData.package.labels,
                datasets: [
                    {
                        data: chartData.package.data,
                        backgroundColor: ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b"],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                },
            },
        });
    }

    function renderAdminStatsCharts(chartData) {
        if (!chartData || !chartData.revenue || !chartData.service || !chartData.package) {
            console.error("Chart data not found.");
            return;
        }

        destroyCharts();
        buildRevenueChart(chartData);
        buildServiceChart(chartData);
        buildPackageChart(chartData);
    }

    window.renderAdminStatsCharts = renderAdminStatsCharts;

    document.addEventListener("DOMContentLoaded", function () {
        if (window.chartData) {
            renderAdminStatsCharts(window.chartData);
        }
    });
})(window, document);
