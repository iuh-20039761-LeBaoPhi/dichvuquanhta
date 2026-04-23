/**
 * Category Manager - Xử lý đăng ký danh mục dịch vụ nhận làm cho Nhà cung cấp.
 * Lưu thông tin vào cột id_nguoidung của bảng danhmuc_thonha.
 */
window.initCategoryManager = async function() {
    'use strict';

    const categoryGrid = document.getElementById('categoryGrid');
    const loadingEl = document.getElementById('categoryLoading');
    const saveBtn = document.getElementById('saveCategoriesBtn');
    const statusMsg = document.getElementById('saveStatus');

    if (!categoryGrid || !loadingEl || !saveBtn) return;

    let allCategories = [];
    let selectedCatIds = []; // ID các danh mục mà user này chọn làm

    // 1. Lấy thông tin session hiện tại
    const session = await DVQTApp.checkSession();
    if (!session || !session.logged_in) return;
    const userId = String(session.id);

    // 2. Tải danh sách danh mục từ database
    try {
        allCategories = await DVQTKrud.listTable('danhmuc_thonha');
        
        // Khởi tạo danh sách đã chọn bằng cách quét cột id_nguoidung của từng category
        selectedCatIds = allCategories
            .filter(cat => {
                const providers = String(cat.id_nguoidung || '').split(',').map(s => s.trim()).filter(Boolean);
                return providers.includes(userId);
            })
            .map(cat => String(cat.id));

        renderCategories();
    } catch (err) {
        loadingEl.innerHTML = '<div class="text-danger">Không thể tải danh sách dịch vụ. Vui lòng thử lại.</div>';
        console.error('[CategoryManager] Load Error:', err);
    }

    function renderCategories() {
        loadingEl.style.display = 'none';
        categoryGrid.style.display = 'flex';
        
        categoryGrid.innerHTML = allCategories.map(cat => {
            const isActive = selectedCatIds.includes(String(cat.id));
            return `
                <div class="col-md-6 col-lg-4">
                    <div class="cat-item-card ${isActive ? 'active' : ''}" data-id="${cat.id}">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <div class="cat-checkbox">
                                <i class="fa-solid fa-check"></i>
                            </div>
                            <span class="text-muted small">#${cat.id}</span>
                        </div>
                        <h5 class="mb-0 fw-bold" style="font-size: 1rem; color: #334155;">${cat.ten_danhmuc}</h5>
                    </div>
                </div>
            `;
        }).join('');

        // Bắt sự kiện click vào thẻ
        document.querySelectorAll('.cat-item-card').forEach(card => {
            card.onclick = function() {
                const id = this.dataset.id;
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                    selectedCatIds = selectedCatIds.filter(item => item !== id);
                } else {
                    this.classList.add('active');
                    selectedCatIds.push(id);
                }
            };
        });
    }

    // 3. Xử lý lưu thay đổi - Cập nhật ngược lại bảng danhmuc_thonha
    saveBtn.onclick = async function() {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
        statusMsg.innerHTML = '';

        try {
            // Tải lại dữ liệu mới nhất từ server để tránh ghi đè dữ liệu của người khác vừa cập nhật
            const latestCats = await DVQTKrud.listTable('danhmuc_thonha');
            
            let updateCount = 0;
            for (const cat of latestCats) {
                const catId = String(cat.id);
                let providers = String(cat.id_nguoidung || '').split(',').map(s => s.trim()).filter(Boolean);
                const isCheckedLocally = selectedCatIds.includes(catId);
                const isOriginallyPresent = providers.includes(userId);
                
                let changed = false;
                if (isCheckedLocally && !isOriginallyPresent) {
                    providers.push(userId);
                    changed = true;
                } else if (!isCheckedLocally && isOriginallyPresent) {
                    providers = providers.filter(p => p !== userId);
                    changed = true;
                }
                
                if (changed) {
                    await DVQTKrud.updateRow('danhmuc_thonha', cat.id, {
                        id_nguoidung: providers.join(',')
                    });
                    updateCount++;
                }
            }

            statusMsg.innerHTML = `<span class="text-success small fw-bold"><i class="fa-solid fa-circle-check me-1"></i>Đã cập nhật ${updateCount} danh mục!</span>`;
            
            if (window.Swal) {
                Swal.fire({
                    title: 'Thành công',
                    text: 'Danh mục dịch vụ bạn nhận làm đã được cập nhật.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            statusMsg.innerHTML = '<span class="text-danger small fw-bold">Lỗi: ' + (err.message || 'Không thể lưu') + '</span>';
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Lưu thay đổi';
        }
    };
};
