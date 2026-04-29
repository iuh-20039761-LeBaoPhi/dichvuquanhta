/**
 * QUẢN LÝ DỊCH VỤ & DANH MỤC (ADMIN) - PHIÊN BẢN NÂNG CẤP
 */
(function() {
    'use strict';

    const CAT_TABLE = 'danhmuc_thonha';
    const SVC_TABLE = 'dichvu_thonha';

    let allCategories = [];
    let allServices = [];
    let filteredServices = [];

    // Pagination config
    const itemsPerPage = 10;
    let currentSvcPage = 1;

    function showNotify(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} shadow-lg position-fixed top-0 start-50 translate-middle-x mt-4`;
        toast.style.zIndex = '9999';
        toast.style.borderRadius = '30px';
        toast.style.padding = '12px 30px';
        toast.style.minWidth = '280px';
        toast.style.textAlign = 'center';
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i> ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.5s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // Helper: chấp nhận cả Drive fileId và URL thông thường
    function resolveDriveUrl(val) {
        if (!val) return '';
        if (val.startsWith('http')) return val;
        if (val.match(/^[a-zA-Z0-9_-]{20,}$/)) return `https://lh3.googleusercontent.com/u/0/d/${val}`;
        return val;
    }

    // Preview ảnh khi chọn file trong modal
    window.previewAdminImg = function(input, previewId) {
        const prev = document.getElementById(previewId);
        if (!prev) return;
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                prev.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    async function refreshData() {
        const krud = window.DVQTKrud;
        if (!krud) return;

        try {
            document.getElementById('categoryBody').innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-grow spinner-grow-sm text-primary"></div></td></tr>';
            document.getElementById('serviceBody').innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-grow spinner-grow-sm text-primary"></div></td></tr>';

            // Load Categories
            allCategories = await krud.listTable(CAT_TABLE, { limit: 1000 }).catch(() => []);
            renderCategories();
            updateFilterOptions();

            // Load Services
            allServices = await krud.listTable(SVC_TABLE, { limit: 1000 }).catch(() => []);
            handleFilters(); // This will trigger renderServices
        } catch (err) {
            console.error('Lỗi tải dữ liệu:', err);
        }
    }

    // ==================== FILTERS & SORTING ====================

    function updateFilterOptions() {
        const selSearch = document.getElementById('filterCat');
        const svcCatId = document.getElementById('svcCatId');
        if (!selSearch || !svcCatId) return;

        const options = allCategories.map(c => `<option value="${c.id}">${c.ten_danhmuc}</option>`).join('');
        selSearch.innerHTML = '<option value="">Tất cả danh mục</option>' + options;
        svcCatId.innerHTML = '<option value="">-- Chọn danh mục --</option>' + options;
    }

    window.handleFilters = () => {
        const search = (document.getElementById('searchSvc')?.value || '').toLowerCase();
        const catId = document.getElementById('filterCat')?.value;
        const status = document.getElementById('filterStatus')?.value;
        const sortBy = document.getElementById('sortSvc')?.value || 'id_desc';

        // Filter
        filteredServices = allServices.filter(s => {
            const matchSearch = String(s.ten_dichvu || '').toLowerCase().includes(search);
            const matchCat = !catId || String(s.id_danhmuc) === String(catId);
            const matchStatus = !status || s.trang_thai === status;
            return matchSearch && matchCat && matchStatus;
        });

        // Sort
        filteredServices.sort((a, b) => {
            if (sortBy === 'name_asc') return String(a.ten_dichvu).localeCompare(String(b.ten_dichvu));
            if (sortBy === 'price_asc') return Number(a.gia_co_ban || 0) - Number(b.gia_co_ban || 0);
            if (sortBy === 'price_desc') return Number(b.gia_co_ban || 0) - Number(a.gia_co_ban || 0);
            if (sortBy === 'id_desc') return Number(b.id || 0) - Number(a.id || 0);
            return 0;
        });

        currentSvcPage = 1;
        renderServices();
    };

    // ==================== RENDERING ====================

    function renderCategories() {
        const body = document.getElementById('categoryBody');
        if (!body) return;

        if (allCategories.length === 0) {
            body.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có danh mục.</td></tr>';
            return;
        }

        body.innerHTML = allCategories.map((c, i) => {
            const statusCls = c.trang_thai === 'active' ? 'bg-success-subtle text-success' : 'bg-light text-muted';
            const statusTxt = c.trang_thai === 'active' ? 'Hiển thị' : 'Ẩn';
            return `<tr>
                <td><span class="text-muted small">#${c.id}</span></td>
                <td><img src="${resolveDriveUrl(c.anh_dai_dien) || '../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'}" class="rounded shadow-sm" style="width:48px;height:48px;object-fit:cover;" onerror="this.src='../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'"></td>
                <td><div class="fw-bold">${c.ten_danhmuc}</div><div class="small text-muted text-truncate" style="max-width:200px;">${c.mo_ta || ''}</div></td>
                <td>${c.thu_tu || 0}</td>
                <td><span class="badge ${statusCls}">${statusTxt}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light border" onclick="editCategory(${c.id})" title="Sửa"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-light border text-danger" onclick="deleteRow('${CAT_TABLE}', ${c.id})" title="Xóa"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        }).join('');

        // Mobile Cards
        const mob = document.getElementById('categoryMobileList');
        if (mob) {
            mob.innerHTML = allCategories.map(c => {
                const statusCls = c.trang_thai === 'active' ? 'bg-success' : 'bg-secondary';
                const statusTxt = c.trang_thai === 'active' ? 'Hiển thị' : 'Ẩn';
                return `
                    <div class="mobile-card">
                        <div class="mobile-card-head">
                            <img src="${resolveDriveUrl(c.anh_dai_dien) || '../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'}" class="rounded me-3" style="width:50px;height:50px;object-fit:cover;" onerror="this.src='../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'">
                            <div style="flex:1">
                                <h4 class="mobile-title">${c.ten_danhmuc}</h4>
                                <p class="mobile-code">ID: #${c.id} - Thứ tự: ${c.thu_tu || 0}</p>
                            </div>
                            <span class="badge ${statusCls}">${statusTxt}</span>
                        </div>
                        <div class="mobile-body">
                             <p class="small text-muted mb-0">${c.mo_ta || 'Không có mô tả'}</p>
                        </div>
                        <div class="mobile-actions">
                            <button class="btn btn-sm btn-light border me-2" onclick="editCategory(${c.id})"><i class="fas fa-edit me-1"></i>Sửa</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteRow('${CAT_TABLE}', ${c.id})"><i class="fas fa-trash me-1"></i>Xóa</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    function renderServices() {
        const body = document.getElementById('serviceBody');
        const info = document.getElementById('svcInfo');
        const pag = document.getElementById('svcPagination');
        if (!body) return;

        const totalItems = filteredServices.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        
        // Paginate slice
        const start = (currentSvcPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = filteredServices.slice(start, end);

        if (totalItems === 0) {
            body.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">Không tìm thấy dịch vụ phù hợp.</td></tr>';
            if (info) info.textContent = 'Hiển thị 0/0 dịch vụ';
            if (pag) pag.innerHTML = '';
            return;
        }

        body.innerHTML = pageItems.map(s => {
            const cat = allCategories.find(c => String(c.id) === String(s.id_danhmuc));
            const statusCls = s.trang_thai === 'active' ? 'bg-success-subtle text-success' : 'bg-light text-muted';
            const statusTxt = s.trang_thai === 'active' ? 'Đang bật' : 'Đang tắt';
            
            return `<tr>
                <td><img src="${resolveDriveUrl(s.anh_dai_dien) || '../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'}" class="rounded shadow-sm" style="width:48px;height:48px;object-fit:cover;" onerror="this.src='../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'"></td>
                <td class="px-2">
                    <div class="fw-bold">${s.ten_dichvu}</div>
                    <div class="small text-muted"><i class="far fa-clock me-1"></i>${s.thoi_gian_uoc_tinh || '30-60p'}</div>
                </td>
                <td><span class="badge bg-light text-dark fw-normal border">${cat ? cat.ten_danhmuc : 'N/A'}</span></td>
                <td><span class="text-primary fw-bold">${Number(s.gia_co_ban || 0).toLocaleString()} <small>đ</small></span></td>
                <td><span class="badge ${statusCls}">${statusTxt}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light border" onclick="editService(${s.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm btn-light border text-danger" onclick="deleteRow('${SVC_TABLE}', ${s.id})"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        }).join('');

        // Mobile Cards
        const svcMob = document.getElementById('serviceMobileList');
        if (svcMob) {
            svcMob.innerHTML = pageItems.map(s => {
                const cat = allCategories.find(c => String(c.id) === String(s.id_danhmuc));
                const statusCls = s.trang_thai === 'active' ? 'bg-success' : 'bg-secondary';
                const statusTxt = s.trang_thai === 'active' ? 'Đang bật' : 'Đang tắt';
                return `
                    <div class="mobile-card">
                        <div class="mobile-card-head">
                            <img src="${resolveDriveUrl(s.anh_dai_dien) || '../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'}" class="rounded me-3" style="width:50px;height:50px;object-fit:cover;" onerror="this.src='../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'">
                            <div style="flex:1">
                                <h4 class="mobile-title">${s.ten_dichvu}</h4>
                                <p class="mobile-code">${cat ? cat.ten_danhmuc : 'N/A'}</p>
                            </div>
                            <span class="badge ${statusCls}">${statusTxt}</span>
                        </div>
                        <div class="mobile-body">
                            <div class="mobile-row"><span>Giá tiền</span><strong>${Number(s.gia_co_ban || 0).toLocaleString()} VNĐ</strong></div>
                            <div class="mobile-row"><span>Đơn vị</span><strong>${s.don_vi_tinh || 'Lần'}</strong></div>
                            <div class="mobile-row"><span>Thời gian</span><strong>${s.thoi_gian_uoc_tinh || '30-60p'}</strong></div>
                        </div>
                        <div class="mobile-actions">
                            <button class="btn btn-sm btn-light border me-2" onclick="editService(${s.id})"><i class="fas fa-pen me-1"></i>Sửa</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteRow('${SVC_TABLE}', ${s.id})"><i class="fas fa-trash me-1"></i>Xóa</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (info) info.textContent = `Hiển thị ${start + 1} - ${Math.min(end, totalItems)} trên ${totalItems} dịch vụ`;
        
        // Render Pagination numbers
        if (pag) {
            let html = '';
            for (let i = 1; i <= totalPages; i++) {
                html += `<li class="page-item ${i === currentSvcPage ? 'active' : ''}">
                    <a class="page-link" onclick="changeSvcPage(${i})">${i}</a>
                </li>`;
            }
            pag.innerHTML = html;
        }
    }

    window.changeSvcPage = (page) => {
        currentSvcPage = page;
        renderServices();
    };

    // ==================== CRUD ACTIONS (REUSED) ====================

    window.openCategoryModal = (id = null) => {
        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        const form = document.getElementById('categoryForm');
        form.reset();
        document.getElementById('catId').value = '';
        document.getElementById('catImage').value = '';
        document.getElementById('catImagePreview').innerHTML = '<i class="fas fa-image text-muted"></i>';
        const catFileInput = document.getElementById('catImageFile');
        if(catFileInput) catFileInput.value = '';
        document.getElementById('categoryModalTitle').textContent = 'Thêm danh mục';

        if (id) {
            const c = allCategories.find(x => x.id == id);
            if (c) {
                document.getElementById('catId').value = c.id;
                document.getElementById('catName').value = c.ten_danhmuc;
                document.getElementById('catIcon').value = c.icon;
                document.getElementById('catImage').value = c.anh_dai_dien || '';
                document.getElementById('catDesc').value = c.mo_ta;
                document.getElementById('catOrder').value = c.thu_tu;
                document.getElementById('catStatus').value = c.trang_thai;
                document.getElementById('categoryModalTitle').textContent = 'Sửa danh mục';
                // Hiện preview ảnh hiện có
                const imgUrl = resolveDriveUrl(c.anh_dai_dien);
                if (imgUrl) {
                    document.getElementById('catImagePreview').innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                }
            }
        }
        modal.show();
    };

    window.editCategory = (id) => window.openCategoryModal(id);

    window.openServiceModal = (id = null) => {
        const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
        const form = document.getElementById('serviceForm');
        form.reset();
        document.getElementById('svcId').value = '';
        document.getElementById('svcImage').value = '';
        document.getElementById('svcImagePreview').innerHTML = '<i class="fas fa-image text-muted"></i>';
        const svcFileInput = document.getElementById('svcImageFile');
        if(svcFileInput) svcFileInput.value = '';
        document.getElementById('serviceModalTitle').textContent = 'Thêm dịch vụ mới';

        if (id) {
            const s = allServices.find(x => x.id == id);
            if (s) {
                document.getElementById('svcId').value = s.id;
                document.getElementById('svcName').value = s.ten_dichvu;
                document.getElementById('svcCatId').value = s.id_danhmuc || '';
                document.getElementById('svcDesc').value = s.mo_ta;
                document.getElementById('svcBasePrice').value = s.gia_co_ban;
                document.getElementById('svcUnit').value = s.don_vi_tinh;
                document.getElementById('svcImage').value = s.anh_dai_dien || '';
                document.getElementById('svcDuration').value = s.thoi_gian_uoc_tinh;
                document.getElementById('svcSurveyFee').value = s.phi_khao_sat;
                document.getElementById('svcSurveyReq').value = s.yeu_cau_khao_sat;
                document.getElementById('svcStatus').value = s.trang_thai;
                document.getElementById('serviceModalTitle').textContent = 'Chỉnh sửa dịch vụ';
                // Hiện preview ảnh hiện có
                const imgUrl = resolveDriveUrl(s.anh_dai_dien);
                if (imgUrl) {
                    document.getElementById('svcImagePreview').innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                }
            }
        }
        modal.show();
    };

    window.editService = (id) => window.openServiceModal(id);

    window.deleteRow = async (table, id) => {
        if (!confirm('Xác nhận xóa? Dữ liệu đã xóa không thể khôi phục.')) return;
        const krud = window.DVQTKrud;
        try {
            await krud.runAction('delete', table, {}, id);
            showNotify('Đã xóa dữ liệu thành công!');
            refreshData();
        } catch (err) { 
            showNotify('Lỗi xóa: ' + err.message, 'danger');
        }
    };

    // INIT
    window.initServices = () => {
        refreshData();

        // Gắn sự kiện submit trực tiếp cho các form để tránh việc submit nhầm lên URL
        const catForm = document.getElementById('categoryForm');
        const svcForm = document.getElementById('serviceForm');

        if (catForm) {
            catForm.onsubmit = async (e) => {
                e.preventDefault();
                await handleSubmit(e.target, CAT_TABLE, 'categoryModal');
            };
        }

        if (svcForm) {
            svcForm.onsubmit = async (e) => {
                e.preventDefault();
                await handleSubmit(e.target, SVC_TABLE, 'serviceModal');
            };
        }
    };

    /**
     * Hàm xử lý chung việc gửi dữ liệu lên server
     */
    async function handleSubmit(form, table, modalId) {
        const krud = window.DVQTKrud;
        if (!krud) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const id = data.id;
        delete data.id;

        // Upload ảnh lên Drive nếu có chọn file mới
        const fileInputId = table === CAT_TABLE ? 'catImageFile' : 'svcImageFile';
        const fileInput = document.getElementById(fileInputId);
        if (fileInput && fileInput.files && fileInput.files[0]) {
            try {
                showNotify('Đang tải ảnh lên...', 'info');
                
                const now = new Date();
                const d = String(now.getDate()).padStart(2, '0');
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const y = now.getFullYear();
                const h = String(now.getHours()).padStart(2, '0');
                const mi = String(now.getMinutes()).padStart(2, '0');
                const s = String(now.getSeconds()).padStart(2, '0');
                const ms = String(now.getMilliseconds()).padStart(3, '0');
                const timeStr = `${d}${m}${y}_${h}${mi}${s}_${ms}`;

                let catNameStr = 'danhmuc';
                let customName = '';
                
                if (table === SVC_TABLE) {
                    const catObj = allCategories.find(c => String(c.id) === String(data.id_danhmuc));
                    if (catObj) catNameStr = catObj.ten_danhmuc;
                    customName = `${catNameStr}_thonha_${timeStr}_${data.ten_dichvu}`;
                } else {
                    catNameStr = data.ten_danhmuc || 'danhmuc';
                    customName = `${catNameStr}_thonha_${timeStr}_danhmuc`;
                }

                // Làm sạch chuỗi tên file
                customName = customName.replace(/[\s\/\\\?\#\:\;\=\+\*\&\%]/g, '-');

                const up = await DVQTApp.uploadFile(fileInput.files[0], { folderKey: 9, customName: customName });
                if (up && up.success && up.fileId) {
                    data.anh_dai_dien = up.fileId;
                }
            } catch (uploadErr) {
                console.error('Upload ảnh lỗi:', uploadErr);
                showNotify('Lỗi tải ảnh, dữ liệu vẫn được lưu', 'warning');
            }
        }

        try {
            if (id) {
                await krud.updateRow(table, id, data);
                showNotify('Đã cập nhật thành công!');
            } else {
                await krud.insertRow(table, data);
                showNotify('Đã thêm mới thành công!');
            }
            
            const m = bootstrap.Modal.getInstance(document.getElementById(modalId));
            if (m) m.hide();
            refreshData();
        } catch (err) { 
            showNotify('Lỗi: ' + err.message, 'danger');
        }
    }

})();