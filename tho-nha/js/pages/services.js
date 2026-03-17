// Services Page Script

let categoryModal = null;
let serviceModal = null;
let servicesData = []; // ⭐ Biến local để lưu dữ liệu

function initServices() {
    // Chỉ initialize một lần
    if (window.servicesInitialized) return;
    window.servicesInitialized = true;
    
    console.log('=== INIT SERVICES PAGE ===');
    
    try {
        const categoryModalEl = document.getElementById('categoryModal');
        const serviceModalEl = document.getElementById('serviceModal');
        
        if (categoryModalEl && serviceModalEl) {
            categoryModal = new bootstrap.Modal(categoryModalEl);
            serviceModal = new bootstrap.Modal(serviceModalEl);
        }
        
        loadAllServices().then(categories => {
            servicesData = categories; // ⭐ Lưu vào biến local
            console.log('📦 Services data loaded:', servicesData);
            displayServices(categories);
            loadCategoryOptions(categories);
            setupServicesEvents();
        });
    } catch(e) {
        console.error('Services init error:', e);
    }
}

function displayServices(categories) {
    const container = document.getElementById('servicesContainer');
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Chưa có danh mục nào</div>';
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="table-container mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">
                    <i class="fas fa-folder"></i> ${cat.name}
                    ${cat.description ? `<small class="text-muted"> - ${cat.description}</small>` : ''}
                </h5>
                <div>
                    <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${cat.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${cat.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th style="width: 50px;">ID</th>
                            <th>Tên dịch vụ</th>
                            <th style="width: 120px;">Giá tổng</th>
                            <th style="width: 110px;">Tiền công</th>
                            <th style="width: 120px;">Vật liệu</th>
                            <th style="width: 150px;">Phí di chuyển / Khảo sát</th>
                            <th>Hãng</th>
                            <th style="width: 85px;">Bảo hành</th>
                            <th style="width: 85px;">Thời gian</th>
                            <th style="width: 90px;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cat.services && cat.services.length > 0 ? cat.services.map(s => {
                            // Hiển thị phí di chuyển/khảo sát ngắn gọn
                            const tfFixed = s.travel_fee_fixed;
                            const tfMin   = s.travel_fee_min;
                            const tfMax   = s.travel_fee_max;
                            let travelLabel = '-';
                            if (tfFixed || tfMin || tfMax) {
                                const lo = tfMin ?? tfFixed ?? 0;
                                const hi = tfMax ?? tfFixed ?? 0;
                                travelLabel = lo === hi
                                    ? formatCurrency(lo)
                                    : formatCurrency(lo) + ' – ' + formatCurrency(hi);
                            }
                            const surveyLabel = s.survey_fee_amount
                                ? formatCurrency(s.survey_fee_amount) + (s.survey_fee_required ? ' ⚠️' : '')
                                : '-';
                            return `
                            <tr>
                                <td>${s.id}</td>
                                <td>
                                    <strong>${s.name}</strong>
                                    ${s.description ? `<br><small class="text-muted">${s.description}</small>` : ''}
                                </td>
                                <td><span class="text-success fw-bold">${formatCurrency(s.price)}</span></td>
                                <td>${s.labor_cost ? formatCurrency(s.labor_cost) : '-'}</td>
                                <td>${s.material_cost ? formatCurrency(s.material_cost) : '-'}</td>
                                <td title="Di chuyển: ${travelLabel}&#10;Khảo sát: ${surveyLabel}">
                                    <small class="text-muted d-block">🚗 ${travelLabel}</small>
                                    <small class="text-muted d-block">📋 ${surveyLabel}</small>
                                </td>
                                <td>${s.brand || '-'}</td>
                                <td>${s.warranty || '-'}</td>
                                <td>${s.duration || '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" onclick="editService(${s.id})" title="Sửa">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteService(${s.id})" title="Xóa">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>`;
                        }).join('') : '<tr><td colspan="10" class="text-center">Chưa có dịch vụ nào</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

function loadCategoryOptions(categories) {
    const select = document.getElementById('serviceCategoryId');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Chọn danh mục --</option>' +
        categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

function setupServicesEvents() {
    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.onclick = function() {
            openAddCategoryModal();
        };
    }

    // Add service button
    const addServiceBtn = document.getElementById('addServiceBtn');
    if (addServiceBtn) {
        addServiceBtn.onclick = function() {
            openAddServiceModal();
        };
    }

    // Category form submit
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.onsubmit = function(e) {
            e.preventDefault();
            saveCategoryHandler();
        };
    }

    // Service form submit
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.onsubmit = function(e) {
            e.preventDefault();
            saveServiceHandler();
        };
    }
}

// ==================== CATEGORY FUNCTIONS ====================

function openAddCategoryModal() {
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    const idInput = document.getElementById('categoryId');
    
    if (title && form && idInput) {
        title.textContent = 'Thêm Danh Mục';
        form.reset();
        idInput.value = '';
        if (categoryModal) categoryModal.show();
    }
}

window.editCategory = function(id) {
    console.log('=== EDIT CATEGORY ===');
    console.log('Looking for category ID:', id, 'Type:', typeof id);
    console.log('Available servicesData:', servicesData);
    
    // Chuyển id sang số để so sánh
    const numId = Number(id);
    
    const category = servicesData.find(c => {
        console.log('Checking category:', c.id, 'Type:', typeof c.id, 'Match:', Number(c.id) === numId);
        return Number(c.id) === numId;
    });
    
    if (!category) {
        alert('❌ Không tìm thấy danh mục với ID: ' + id);
        console.error('Category not found!');
        console.log('All category IDs:', servicesData.map(c => c.id));
        return;
    }
    
    console.log('✅ Found category:', category);
    
    const title = document.getElementById('categoryModalTitle');
    const idInput = document.getElementById('categoryId');
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    
    if (title && idInput && nameInput && descInput) {
        title.textContent = 'Sửa Danh Mục';
        idInput.value = category.id;
        nameInput.value = category.name;
        descInput.value = category.description || '';
        if (categoryModal) categoryModal.show();
    } else {
        console.error('Missing form elements');
    }
}

function saveCategoryHandler() {
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    
    if (!name) {
        alert('Vui lòng nhập tên danh mục');
        return;
    }
    
    const action = id ? 'update_category' : 'add_category';
    const data = {
        action: action,
        name: name,
        description: description
    };
    
    if (id) {
        data.id = parseInt(id);
    }
    
    fetch('api/admin/manage-services.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        if (res.status === 'success') {
            if (categoryModal) categoryModal.hide();
            // Reload data
            loadAllServices().then(categories => {
                servicesData = categories; // ⭐ Cập nhật servicesData
                displayServices(categories);
                loadCategoryOptions(categories);
            });
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Lỗi kết nối server');
    });
}

window.deleteCategory = function(id) {
    if (!confirm('Xác nhận xóa danh mục này?\n\nLưu ý: Chỉ có thể xóa danh mục không có dịch vụ.')) return;
    
    fetch('api/admin/manage-services.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'delete_category', 
            id: parseInt(id) 
        })
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        if (res.status === 'success') {
            loadAllServices().then(categories => {
                servicesData = categories; // ⭐ Cập nhật servicesData
                displayServices(categories);
                loadCategoryOptions(categories);
            });
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Lỗi kết nối server');
    });
}

// ==================== SERVICE FUNCTIONS ====================

function openAddServiceModal() {
    const title = document.getElementById('serviceModalTitle');
    const form = document.getElementById('serviceForm');
    const idInput = document.getElementById('serviceId');

    if (title && form && idInput) {
        title.textContent = 'Thêm Dịch Vụ';
        form.reset();
        idInput.value = '';
        // Reset pricing fields
        ['serviceTravelFee','serviceTravelMin','serviceTravelMax','serviceSurveyFee'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const waive = document.getElementById('serviceSurveyWaive');
        if (waive) waive.checked = true; // default: miễn phí nếu đặt lịch
        if (serviceModal) serviceModal.show();
    }
}

window.editService = function(id) {
    console.log('=== EDIT SERVICE ===');
    console.log('Looking for service ID:', id, 'Type:', typeof id);
    console.log('Available servicesData:', servicesData);
    
    let service = null;
    let categoryId = null;
    
    // Chuyển id sang số để so sánh
    const numId = Number(id);
    
    // Tìm dịch vụ trong tất cả danh mục
    for (let cat of servicesData) {
        if (cat.services && cat.services.length > 0) {
            service = cat.services.find(s => {
                console.log('Checking service:', s.id, 'Type:', typeof s.id, 'Match:', Number(s.id) === numId);
                return Number(s.id) === numId;
            });
            if (service) {
                categoryId = cat.id;
                console.log('✅ Found service in category:', cat.name, 'Category ID:', categoryId);
                break;
            }
        }
    }
    
    if (!service) {
        alert('❌ Không tìm thấy dịch vụ với ID: ' + id);
        console.error('Service not found!');
        // In ra tất cả service IDs để debug
        servicesData.forEach(cat => {
            if (cat.services) {
                console.log(`Category "${cat.name}" services:`, cat.services.map(s => s.id));
            }
        });
        return;
    }
    
    console.log('✅ Found service:', service);
    
    const title = document.getElementById('serviceModalTitle');
    const idInput = document.getElementById('serviceId');
    const catSelect = document.getElementById('serviceCategoryId');
    const nameInput = document.getElementById('serviceName');
    const priceInput = document.getElementById('servicePrice');
    const laborInput = document.getElementById('serviceLaborCost');
    const materialInput = document.getElementById('serviceMaterialCost');
    const brandInput = document.getElementById('serviceBrand');
    const warrantyInput = document.getElementById('serviceWarranty');
    const durationInput = document.getElementById('serviceDuration');
    const descInput = document.getElementById('serviceDescription');

    if (title && idInput && catSelect && nameInput && priceInput && descInput) {
        title.textContent = 'Sửa Dịch Vụ';
        idInput.value = service.id;
        catSelect.value = categoryId;
        nameInput.value = service.name;
        priceInput.value = service.price;
        if (laborInput) laborInput.value = service.labor_cost || '';
        if (materialInput) materialInput.value = service.material_cost || '';
        if (brandInput) brandInput.value = service.brand || '';
        if (warrantyInput) warrantyInput.value = service.warranty || '';
        if (durationInput) durationInput.value = service.duration || '';
        descInput.value = service.description || '';

        // Phí di chuyển
        const tfFixed = document.getElementById('serviceTravelFee');
        const tfMin   = document.getElementById('serviceTravelMin');
        const tfMax   = document.getElementById('serviceTravelMax');
        if (tfFixed) tfFixed.value = service.travel_fee_fixed ?? '';
        if (tfMin)   tfMin.value   = service.travel_fee_min   ?? '';
        if (tfMax)   tfMax.value   = service.travel_fee_max   ?? '';

        // Phí khảo sát
        const sfAmt     = document.getElementById('serviceSurveyFee');
        const sfReq     = document.getElementById('serviceSurveyRequired');
        const sfWaive   = document.getElementById('serviceSurveyWaive');
        const sfDeduct  = document.getElementById('serviceSurveyDeduct');
        if (sfAmt)    sfAmt.value      = service.survey_fee_amount   ?? '';
        if (sfReq)    sfReq.checked    = !!service.survey_fee_required;
        if (sfWaive)  sfWaive.checked  = service.survey_fee_waive !== false;
        if (sfDeduct) sfDeduct.checked = !!service.survey_fee_deduct;

        if (serviceModal) serviceModal.show();
    } else {
        console.error('Missing form elements');
    }
}

function saveServiceHandler() {
    const id = document.getElementById('serviceId').value;
    const category_id = document.getElementById('serviceCategoryId').value;
    const name = document.getElementById('serviceName').value.trim();
    const price = document.getElementById('servicePrice').value;
    const labor_cost = document.getElementById('serviceLaborCost')?.value || '';
    const material_cost = document.getElementById('serviceMaterialCost')?.value || '';
    const brand = document.getElementById('serviceBrand')?.value.trim() || '';
    const warranty = document.getElementById('serviceWarranty')?.value.trim() || '';
    const duration = document.getElementById('serviceDuration')?.value.trim() || '';
    const description = document.getElementById('serviceDescription').value.trim();

    // Validate
    if (!category_id) {
        alert('Vui lòng chọn danh mục');
        return;
    }

    if (!name) {
        alert('Vui lòng nhập tên dịch vụ');
        return;
    }

    if (!price || parseFloat(price) <= 0) {
        alert('Vui lòng nhập giá hợp lệ');
        return;
    }

    // Phí di chuyển
    const travel_fee_fixed = document.getElementById('serviceTravelFee')?.value || '';
    const travel_fee_min   = document.getElementById('serviceTravelMin')?.value  || '';
    const travel_fee_max   = document.getElementById('serviceTravelMax')?.value  || '';
    // Phí khảo sát
    const survey_fee_amount   = document.getElementById('serviceSurveyFee')?.value      || '';
    const survey_fee_required = document.getElementById('serviceSurveyRequired')?.checked || false;
    const survey_fee_waive    = document.getElementById('serviceSurveyWaive')?.checked   || false;
    const survey_fee_deduct   = document.getElementById('serviceSurveyDeduct')?.checked  || false;

    const action = id ? 'update_service' : 'add_service';
    const data = {
        action: action,
        category_id: parseInt(category_id),
        name: name,
        price: parseFloat(price),
        labor_cost: labor_cost || null,
        material_cost: material_cost || null,
        brand: brand || null,
        warranty: warranty || null,
        duration: duration || null,
        description: description,
        // Pricing fields mới
        travel_fee_fixed:    travel_fee_fixed    !== '' ? parseInt(travel_fee_fixed)    : null,
        travel_fee_min:      travel_fee_min      !== '' ? parseInt(travel_fee_min)      : null,
        travel_fee_max:      travel_fee_max      !== '' ? parseInt(travel_fee_max)      : null,
        survey_fee_amount:   survey_fee_amount   !== '' ? parseInt(survey_fee_amount)   : null,
        survey_fee_required: survey_fee_required,
        survey_fee_waive:    survey_fee_waive,
        survey_fee_deduct:   survey_fee_deduct,
    };

    if (id) {
        data.id = parseInt(id);
    }
    
    fetch('api/admin/manage-services.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        if (res.status === 'success') {
            if (serviceModal) serviceModal.hide();
            // Reload data
            loadAllServices().then(categories => {
                servicesData = categories; // ⭐ Cập nhật servicesData
                displayServices(categories);
                loadCategoryOptions(categories);
            });
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Lỗi kết nối server');
    });
}

window.deleteService = function(id) {
    if (!confirm('Xác nhận xóa dịch vụ này?')) return;
    
    fetch('api/admin/manage-services.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'delete_service', 
            id: parseInt(id) 
        })
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        if (res.status === 'success') {
            loadAllServices().then(categories => {
                servicesData = categories; // ⭐ Cập nhật servicesData
                displayServices(categories);
                loadCategoryOptions(categories);
            });
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Lỗi kết nối server');
    });
}