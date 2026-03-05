document.addEventListener('DOMContentLoaded', async () => {
    await loadServices();
});

async function loadServices() {
    Utils.showLoading(document.getElementById('serviceList'));
    const result = await API.services.getAll();
    
    if(result.success) {
        displayServices(result.data);
    } else {
        document.getElementById('serviceList').innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Không thể tải dịch vụ. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

function displayServices(services) {
    if(services.length === 0) {
        document.getElementById('serviceList').innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Chưa có dịch vụ nào</p>
            </div>
        `;
        return;
    }
    
    const gradients = ['primary', 'secondary', 'success', 'orange'];
    
    const html = services.map((service, index) => `
        <div class="col-lg-6">
            <div class="card service-card border-0 shadow-sm h-100">
                <div class="card-body p-4">
                    <div class="d-flex align-items-start">
                        <div class="service-icon me-4" style="flex-shrink: 0;">
                            <div class="rounded-circle d-flex align-items-center justify-content-center" 
                                 style="width: 80px; height: 80px; background: var(--gradient-${gradients[index % 4]});">
                                <i class="fas fa-${service.icon} fa-2x text-white"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <h4 class="fw-bold mb-3">${service.name}</h4>
                            <p class="text-muted mb-3">${service.description}</p>
                            <h5 class="text-primary fw-bold mb-0">
                                ${Utils.formatPrice(service.price)}đ
                            </h5>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('serviceList').innerHTML = html;
}