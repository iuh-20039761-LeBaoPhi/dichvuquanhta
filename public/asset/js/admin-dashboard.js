document.addEventListener('DOMContentLoaded', async function () {
    // 1. Kiểm tra 2 cookie admin_e và admin_p
    const getCookie = (name) => {
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith(name + '='));
        if (!cookie) return null;
        return decodeURIComponent(cookie.split('=')[1]);
    };

    const adminE = getCookie('admin_e');
    const adminP = getCookie('admin_p');

    if (!adminE || !adminP) {
        alert("Bạn chưa đăng nhập hoặc cookie không hợp lệ!");
        window.location.href = "admin-login.html";
        return;
    }

    // Kiểm tra trực tiếp vào CSDL admin
    try {
        const adminListData = await DVQTKrud.listTable('admin', { limit: 100 });
        const isValidAdmin = adminListData.find(x => x.email === adminE && x.matkhau === adminP);

        if (!isValidAdmin) {
            alert("Thông tin đăng nhập không chính xác hoặc tài khoản đã bị thay đổi!");
            document.cookie = "admin_e=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "admin_p=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = "admin-login.html";
            return;
        }
    } catch (e) {
        console.error('Lỗi kiểm tra session', e);
    }

    // Cập nhật tên Admin (nếu có)
    const profileNameEl = document.querySelector('.profile-name');
    if (profileNameEl && adminE) {
        profileNameEl.textContent = adminE.split('@')[0];
    }

    // 2. Logic điều hướng Sidebar
    const navLinks = document.querySelectorAll('.nav-link[data-target]');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('pageTitle');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            // Xóa active cũ
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Set active mới
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            document.getElementById(`sec-${targetId}`).classList.add('active');

            // Cập nhật tiêu đề trang
            pageTitle.textContent = this.textContent.trim();

            // Đóng sidebar trên mobile nếu đang mở
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }

            // Gọi hàm tải dữ liệu tương ứng
            if (targetId === 'quan-ly-dich-vu') {
                loadServices();
            } else if (targetId === 'quan-ly-phi') {
                loadFees();
            }
        });
    });

    // Toggle Sidebar Mobile
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const btnCloseSidebar = document.getElementById('btnCloseSidebar');
    const sidebar = document.getElementById('sidebar');

    if (btnToggleSidebar && sidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            sidebar.classList.add('show');
        });
    }

    if (btnCloseSidebar && sidebar) {
        btnCloseSidebar.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }

    // Đăng xuất
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
                // Xóa cả 2 cookie bằng cách thiết lập thời gian hết hạn trong quá khứ
                document.cookie = "admin_e=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "admin_p=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.href = "admin-login.html";
            }
        });
    }

    // --- KRUD OPERATIONS ---

    const modalSvc = new bootstrap.Modal(document.getElementById('modalService'));
    const modalFee = new bootstrap.Modal(document.getElementById('modalFee'));

    // --- QUẢN LÝ DỊCH VỤ ---
    document.getElementById('btnAddService').addEventListener('click', () => {
        document.getElementById('formService').reset();
        document.getElementById('serviceId').value = '';
        document.getElementById('modalServiceTitle').textContent = 'Thêm dịch vụ mới';
        modalSvc.show();
    });

    document.getElementById('btnSaveService').addEventListener('click', async () => {
        const id = document.getElementById('serviceId').value;
        const dichvu = document.getElementById('serviceName').value.trim();
        const mota = document.getElementById('serviceDesc').value.trim();

        if (!dichvu) return alert('Vui lòng nhập tên dịch vụ');

        try {
            if (id) {
                await DVQTKrud.updateRow('dichvucungcap', id, { dichvu, mota });
                alert('Cập nhật thành công!');
            } else {
                await DVQTKrud.insertRow('dichvucungcap', { dichvu, mota });
                alert('Thêm mới thành công!');
            }
            modalSvc.hide();
            loadServices();
        } catch (e) {
            alert('Lỗi: ' + e.message);
        }
    });

    document.getElementById('serviceTableBody').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.handle-edit-service');
        const delBtn = e.target.closest('.handle-delete-service');

        if (editBtn) {
            document.getElementById('serviceId').value = editBtn.dataset.id;
            document.getElementById('serviceName').value = editBtn.dataset.name;
            document.getElementById('serviceDesc').value = editBtn.dataset.desc;
            document.getElementById('modalServiceTitle').textContent = 'Sửa thông tin dịch vụ';
            modalSvc.show();
        }

        if (delBtn) {
            if (confirm('Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác!')) {
                try {
                    await DVQTKrud.deleteRow('dichvucungcap', delBtn.dataset.id);
                    loadServices();
                } catch (err) {
                    alert('Lỗi xóa: ' + err.message);
                }
            }
        }
    });

    // =========================================================================
    // CẤU HÌNH GIAO DIỆN & ĐƯỜNG LINK (HỆ SINH THÁI DỊCH VỤ)
    // - Để thay đổi đường link truy cập vào trang Admin của từng dịch vụ con:
    // - Bạn chỉ cần đổi giá trị `link: '#'` thành đường dẫn tương ứng.
    // VD: link: '../cham-soc-me-be/pages/admin/index.html'
    // =========================================================================
    const ecoConfig = {
        '1': { icon: 'fa-baby', color: '#db2777', bg: '#fdf2f8', link: '../cham-soc-me-va-be/admin_mevabe/', desc: 'Quản lý dịch vụ hỗ trợ phụ sản và trẻ sơ sinh' },
        '2': { icon: 'fa-hospital-user', color: '#0d9488', bg: '#f0fdfa', link: '../cham-soc-nguoi-benh/admin_nguoibenh', desc: 'Dịch vụ hỗ trợ y tế, chăm sóc tại nhà viện' },
        '3': { icon: 'fa-wheelchair', color: '#ea580c', bg: '#fff7ed', link: '../cham-soc-nguoi-benh/admin_nguoigia', desc: 'Cung cấp chuyên viên chăm lo người cao tuổi' },
        '4': { icon: 'fa-leaf', color: '#65a30d', bg: '#f7fee7', link: '#', desc: 'Cắt cỏ, dọn dẹp và chăm sóc cây cảnh' },
        '5': { icon: 'fa-broom', color: '#0284c7', bg: '#e0f2fe', link: '../dich-vu-don-ve-sinh/admin_donvesinh/', desc: 'Giúp việc nhà và vệ sinh công nghiệp' },
        '6': { icon: 'fa-id-card', color: '#4b5563', bg: '#f3f4f6', link: '#', desc: 'Dịch vụ tìm tài xế lái xe an toàn' },
        '7': { icon: 'fa-motorcycle', color: '#ca8a04', bg: '#fefce8', link: '#', desc: 'Dịch vụ gọi shipper nhận và chuyển đồ hỏa tốc' },
        '8': { icon: 'fa-wrench', color: '#dc2626', bg: '#fef2f2', link: '../sua-xe-luu-dong/admin/index.html', desc: 'Cứu hộ, vá săm lốp và sửa xe tận nơi' },
        '9': { icon: 'fa-tools', color: '#10b981', bg: '#ecfdf5', link: '../tho-nha/pages/admin/quan-tri.html', desc: 'Dịch vụ gọi thợ sửa chữa, bảo trì tại gia' },
        '10': { icon: 'fa-car-side', color: '#3b82f6', bg: '#eff6ff', link: '../thue-xe/views/pages/admin/quan-tri.html', desc: 'Hệ thống cho thuê xe du lịch, tự lái' },
        '11': { icon: 'fa-tshirt', color: '#4f46e5', bg: '#e0e7ff', link: '../giat-ui-nhanh/admin/index.html', desc: 'Đội ngũ đến nhận giặt sấy đồ cấp tốc tận nhà' }
    };
    const defaultConfig = { icon: 'fa-box', color: '#6366f1', bg: '#e0e7ff', link: '#', desc: 'Phân hệ dịch vụ mở rộng mới' };

    async function loadServices() {
        const tbody = document.getElementById('serviceTableBody');
        const cardsContainer = document.getElementById('appCardsContainer');
        try {
            // Yêu cầu giới hạn 100 dòng để lấy toàn bộ danh sách, tránh bị cắt trang (pagination route của API)
            const data = await DVQTKrud.listTable('dichvucungcap', { limit: 100 });

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Chưa có dịch vụ nào</td></tr>';
                if (cardsContainer) cardsContainer.innerHTML = '<p class="text-muted w-100 mt-4 text-center">Chưa có dịch vụ nào.</p>';
                return;
            }

            // Xây dựng bảng Data Quản lý
            tbody.innerHTML = data.map(item => `
                <tr>
                    <td class="fw-bold">#${item.id}</td>
                    <td class="fw-bold text-primary">${item.dichvu || 'N/A'}</td>
                    <td>${item.mota || 'Chưa có mô tả'}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary handle-edit-service" data-id="${item.id}" data-name="${item.dichvu || ''}" data-desc="${item.mota || ''}" title="Sửa"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger handle-delete-service" data-id="${item.id}" title="Xóa"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            // Tự động Cập nhật lưới Grid Hệ Sinh Thái
            if (cardsContainer) {
                cardsContainer.innerHTML = data.map(item => {
                    const conf = ecoConfig[item.id] || defaultConfig;
                    return `
                        <a href="${conf.link}" class="app-card" ${conf.link === '#' ? 'onclick="alert(\'Chưa có đường link đến trang admin dịch vụ con vào admin-dashboard.js để thêm!\'); return false;"' : ''}>
                            <div class="app-card-icon" style="background-color: ${conf.bg}; color: ${conf.color};">
                                <i class="fas ${conf.icon}"></i>
                            </div>
                            <div class="app-card-info">
                                <h3>${item.dichvu}</h3>
                                <p>${item.mota || conf.desc}</p>
                            </div>
                            <div class="app-card-action"><i class="fas fa-arrow-right"></i></div>
                        </a>
                    `;
                }).join('');
            }

        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Lỗi tải dữ liệu</td></tr>';
            if (cardsContainer) cardsContainer.innerHTML = '<p class="text-danger w-100 mt-4 text-center">Lỗi tải Hệ sinh thái</p>';
        }
    }

    // --- QUẢN LÝ PHÍ DI CHUYỂN ---
    document.getElementById('btnAddFee').addEventListener('click', () => {
        document.getElementById('formFee').reset();
        document.getElementById('feeId').value = '';
        document.getElementById('modalFeeTitle').textContent = 'Thêm cấu hình phí mới';
        modalFee.show();
    });

    document.getElementById('btnSaveFee').addEventListener('click', async () => {
        const id = document.getElementById('feeId').value;
        const loaiphi = document.getElementById('feeType').value.trim();
        const sotien = document.getElementById('feeAmount').value.trim();

        if (!loaiphi || !sotien) return alert('Vui lòng nhập tên loại phí và số tiền');

        try {
            if (id) {
                await DVQTKrud.updateRow('phidichuyen', id, { loaiphi, sotien });
                alert('Cập nhật thành công!');
            } else {
                await DVQTKrud.insertRow('phidichuyen', { loaiphi, sotien });
                alert('Thêm mới thành công!');
            }
            modalFee.hide();
            loadFees();
        } catch (e) {
            alert('Lỗi: ' + e.message);
        }
    });

    document.getElementById('feeTableBody').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.handle-edit-fee');
        const delBtn = e.target.closest('.handle-delete-fee');

        if (editBtn) {
            document.getElementById('feeId').value = editBtn.dataset.id;
            document.getElementById('feeType').value = editBtn.dataset.type;
            document.getElementById('feeAmount').value = editBtn.dataset.amount;
            document.getElementById('modalFeeTitle').textContent = 'Sửa cấu hình phí';
            modalFee.show();
        }

        if (delBtn) {
            if (confirm('Bạn có chắc chắn muốn xóa phí này?')) {
                try {
                    await DVQTKrud.deleteRow('phidichuyen', delBtn.dataset.id);
                    loadFees();
                } catch (err) {
                    alert('Lỗi xóa: ' + err.message);
                }
            }
        }
    });

    async function loadFees() {
        const tbody = document.getElementById('feeTableBody');
        try {
            const data = await DVQTKrud.listTable('phidichuyen', { limit: 100 });

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Chưa có cấu hình phí nào</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(item => `
                <tr>
                    <td class="fw-bold">#${item.id}</td>
                    <td>${item.loaiphi || 'N/A'}</td>
                    <td class="fw-bold text-success">${parseInt(item.sotien || 0).toLocaleString()} VNĐ</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary handle-edit-fee" data-id="${item.id}" data-type="${item.loaiphi || ''}" data-amount="${item.sotien || ''}" title="Sửa"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger handle-delete-fee" data-id="${item.id}" title="Xóa"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Lỗi tải dữ liệu</td></tr>';
        }
    }

    // Load dữ liệu khi vào trang
    loadServices();
});
