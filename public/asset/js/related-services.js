/**
 * Related Services Generator
 * Tự động hiển thị danh sách các dịch vụ khác, loại trừ dịch vụ hiện tại
 */
const RelatedServices = {
    services: [
        { id: 'me-va-be', name: 'Chăm Sóc Mẹ & Bé', icon: 'fas fa-baby', color: '#ec4899', link: '/dich-vu/cham-soc/me-va-be/dich-vu.html', group: 'care' },
        { id: 'nguoi-gia', name: 'Chăm Sóc Người Già', icon: 'fas fa-person-cane', color: '#f97316', link: '/dich-vu/cham-soc/nguoi-gia/dich-vu.html', group: 'care' },
        { id: 'nguoi-benh', name: 'Chăm Sóc Bệnh Nhân', icon: 'fas fa-user-nurse', color: '#ef4444', link: '/dich-vu/cham-soc/nguoi-benh/dich-vu.html', group: 'care' },
        { id: 've-sinh', name: 'Lau Dọn Vệ Sinh', icon: 'fas fa-broom', color: '#06b6d4', link: '/dich-vu/ve-sinh/tap-vu-lau-don-ve-sinh/dich-vu.html', group: 'cleaning' },
        { id: 'san-vuon', name: 'Chăm Sóc Vườn Nhà', icon: 'fas fa-seedling', color: '#22c55e', link: '/dich-vu/san-vuon-cay-canh-vuon-ray/cham-soc-vuon-nha/dich-vu.html', group: 'cleaning' },
        { id: 'giat-ui', name: 'Giặt Ủi Nhanh', icon: 'fas fa-shirt', color: '#f43f5e', link: '/dich-vu/giat-ui/giat-ui-nhanh/dich-vu.html', group: 'cleaning' },
        { id: 'giao-hang', name: 'Giao Hàng Nhanh', icon: 'fas fa-truck-fast', color: '#6366f1', link: '/dich-vu/van-tai-logistics/giao-hang-nhanh/dich-vu-giao-hang.html', group: 'logistics' },
        { id: 'chuyen-don', name: 'Chuyển Dọn', icon: 'fas fa-box-open', color: '#14532d', link: '/dich-vu/van-tai-logistics/dich-vu-chuyen-don/dich-vu-chuyen-don.html', group: 'logistics' },
        { id: 'thue-xe', name: 'Thuê Xe', icon: 'fas fa-car-side', color: '#0ea5e9', link: '/dich-vu/van-tai-logistics/thue-xe/dich-vu.html', group: 'logistics' },
        { id: 'lai-xe', name: 'Lái Xe Hộ', icon: 'fas fa-id-card', color: '#3b82f6', link: '/dich-vu/van-tai-logistics/dich-vu-lai-xe-ho/dich-vu.html', group: 'logistics' },
        { id: 'sua-xe', name: 'Sửa Xe', icon: 'fas fa-motorcycle', color: '#8b5cf6', link: '/dich-vu/sua-chua/sua-xe-luu-dong/dich-vu.html', group: 'repair' },
        { id: 'tho-nha', name: 'Thợ Nhà', icon: 'fas fa-hammer', color: '#0d9488', link: '/dich-vu/sua-chua/tho-nha/dich-vu.html', group: 'repair' }
    ],

    init: function() {
        const container = document.getElementById('relatedServicesContainer');
        if (!container) return;

        const currentPath = window.location.pathname;
        const root = (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : '';
        
        // Xác định dịch vụ hiện tại để loại trừ
        let currentService = this.services.find(s => currentPath.includes(s.id));
        
        // Sắp xếp: Ưu tiên cùng group, sau đó là các dịch vụ khác
        let displayList = [...this.services];
        if (currentService) {
            displayList = displayList.filter(s => s.id !== currentService.id);
            displayList.sort((a, b) => {
                if (a.group === currentService.group && b.group !== currentService.group) return -1;
                if (a.group !== currentService.group && b.group === currentService.group) return 1;
                return 0;
            });
        }

        // Render HTML
        let html = `
            <div class="row g-4 row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 justify-content-center">
                ${displayList.map(s => `
                    <div class="col d-flex">
                        <a href="${root + s.link}" class="other-service-item w-100">
                            <div class="other-service-icon" style="background-color: ${s.color};">
                                <i class="${s.icon}"></i>
                            </div>
                            <h3 class="other-service-name">${s.name}</h3>
                        </a>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = html;
        this.addStyles();
    },

    addStyles: function() {
        if (document.getElementById('related-services-style')) return;
        const style = document.createElement('style');
        style.id = 'related-services-style';
        style.innerHTML = `
            .other-services-section {
                background: #fdfdfd;
                padding: 4rem 0 !important;
            }
            .other-service-item {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                background: #fff;
                border: 1px solid #eee;
                border-radius: 20px;
                padding: 1.5rem 1.25rem;
                text-align: center;
                text-decoration: none !important;
                color: #444;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .other-service-item:hover {
                transform: translateY(-8px);
                box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.1);
                border-color: #0ea5e9;
                color: #0ea5e9;
            }
            .other-service-icon {
                width: 50px;
                height: 50px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.3rem;
                margin-bottom: 1rem;
                transition: all 0.3s ease;
                color: #fff !important;
            }
            .other-service-item:hover .other-service-icon {
                transform: rotate(10deg) scale(1.1);
            }
            .other-service-name {
                font-weight: 700;
                font-size: 0.9rem;
                margin: 0;
                line-height: 1.4;
            }
        `;
        document.head.appendChild(style);
    }
};

document.addEventListener('DOMContentLoaded', () => RelatedServices.init());
