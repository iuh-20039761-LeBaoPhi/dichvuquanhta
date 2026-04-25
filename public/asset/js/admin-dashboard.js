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
        showWarning("Bạn chưa đăng nhập hoặc cookie không hợp lệ!");
        window.location.href = "admin-login.html";
        return;
    }

    // Kiểm tra trực tiếp vào CSDL admin
    try {
        const adminListData = await DVQTKrud.listTable('admin', { limit: 100 });
        const isValidAdmin = adminListData.find(x => x.email === adminE && x.matkhau === adminP);

        if (!isValidAdmin) {
            showError("Thông tin đăng nhập không chính xác hoặc tài khoản đã bị thay đổi!");
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

            // Đóng sidebar trên mobile/tablet nếu đang mở
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (window.innerWidth <= 991) {
                sidebar.classList.remove('show');
                if (overlay) overlay.classList.remove('active');
            }

            // Gọi hàm tải dữ liệu tương ứng
            if (targetId === 'quan-ly-dich-vu') {
                loadServices();
            } else if (targetId === 'quan-ly-phi') {
                loadFees();
            } else if (targetId === 'quan-ly-tai-khoan') {
                loadAccounts();
            }
        });
    });

    // Toggle Sidebar Mobile/Tablet
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const btnCloseSidebar = document.getElementById('btnCloseSidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('show');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('show');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', openSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

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
        const tro_gia = document.getElementById('serviceSubsidy').value.trim();
        const hoa_hong = document.getElementById('serviceCommission').value.trim();
        const mota = document.getElementById('serviceDesc').value.trim();

        if (!dichvu) return alert('Vui lòng nhập tên dịch vụ');

        try {
            if (id) {
                await DVQTKrud.updateRow('dichvucungcap', id, { dichvu, mota, tro_gia, hoa_hong });
                alert('Cập nhật thành công!');
            } else {
                await DVQTKrud.insertRow('dichvucungcap', { dichvu, mota, tro_gia, hoa_hong });
                alert('Thêm mới thành công!');
            }
            modalSvc.hide();
            loadServices();
        } catch (e) {
            alert('Lỗi: ' + e.message);
        }
    });

    // Event delegation cho bảng Dịch vụ (Desktop + Mobile)
    function handleServiceClick(e) {
        const editBtn = e.target.closest('.handle-edit-service');
        const delBtn = e.target.closest('.handle-delete-service');

        if (editBtn) {
            document.getElementById('serviceId').value = editBtn.dataset.id;
            document.getElementById('serviceName').value = editBtn.dataset.name;
            document.getElementById('serviceSubsidy').value = editBtn.dataset.subsidy || '';
            document.getElementById('serviceCommission').value = editBtn.dataset.commission || '';
            document.getElementById('serviceDesc').value = editBtn.dataset.desc;
            document.getElementById('modalServiceTitle').textContent = 'Sửa thông tin dịch vụ';
            modalSvc.show();
        }

        if (delBtn) {
            if (confirm('Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác!')) {
                (async () => {
                    try {
                        await DVQTKrud.deleteRow('dichvucungcap', delBtn.dataset.id);
                        loadServices();
                    } catch (err) {
                        alert('Lỗi xóa: ' + err.message);
                    }
                })();
            }
        }
    }
    document.getElementById('serviceTableBody').addEventListener('click', handleServiceClick);
    const svcMobileEl = document.getElementById('serviceMobileCards');
    if (svcMobileEl) svcMobileEl.addEventListener('click', handleServiceClick);

    // =========================================================================
    // CẤU HÌNH GIAO DIỆN & ĐƯỜNG LINK (HỆ SINH THÁI DỊCH VỤ)
    // - Để thay đổi đường link truy cập vào trang Admin của từng dịch vụ con:
    // - Bạn chỉ cần đổi giá trị `link: '#'` thành đường dẫn tương ứng.
    // VD: link: '../cham-soc-me-be/pages/admin/index.html'
    // =========================================================================
    const ecoConfig = {
        '1': { icon: 'fa-baby', color: '#ec4899', link: '../dich-vu/cham-soc/me-va-be/admin_mevabe/index.php', desc: 'Quản lý dịch vụ hỗ trợ phụ sản và trẻ sơ sinh' },
        '2': { icon: 'fa-user-nurse', color: '#ef4444', link: '../dich-vu/cham-soc/nguoi-benh/admin_nguoibenh/index.php', desc: 'Dịch vụ hỗ trợ y tế, chăm sóc tại nhà viện' },
        '3': { icon: 'fa-person-cane', color: '#f97316', link: '../dich-vu/cham-soc/nguoi-gia/admin_nguoigia/index.php', desc: 'Cung cấp chuyên viên chăm lo người cao tuổi' },
        '4': { icon: 'fa-seedling', color: '#22c55e', link: '../dich-vu/san-vuon-cay-canh-vuon-ray/cham-soc-vuon-nha/admin/index.php', desc: 'Cắt cỏ, dọn dẹp và chăm sóc cây cảnh' },
        '5': { icon: 'fa-broom', color: '#06b6d4', link: '../dich-vu/ve-sinh/tap-vu-lau-don-ve-sinh/admin_donvesinh/index.php', desc: 'Giúp việc nhà và vệ sinh công nghiệp' },
        '6': { icon: 'fa-id-card', color: '#3b82f6', link: '../dich-vu/van-tai-logistics/dich-vu-lai-xe-ho/admin/index.php', desc: 'Dịch vụ tìm tài xế lái xe an toàn' },
        '7': { icon: 'fa-truck-fast', color: '#6366f1', link: '../dich-vu/van-tai-logistics/giao-hang-nhanh/admin-giaohang/index.php', desc: 'Dịch vụ gọi shipper nhận và chuyển đồ hỏa tốc' },
        '8': { icon: 'fa-motorcycle', color: '#8b5cf6', link: '../dich-vu/sua-chua/sua-xe-luu-dong/admin/index.html', desc: 'Cứu hộ, vá săm lốp và sửa xe tận nơi' },
        '9': { icon: 'fa-hammer', color: '#0d9488', link: '../dich-vu/sua-chua/tho-nha/admin_thonha/quan-tri.html', desc: 'Dịch vụ gọi thợ sửa chữa, bảo trì tại gia' },
        '10': { icon: 'fa-car-side', color: '#0ea5e9', link: '../dich-vu/van-tai-logistics/thue-xe/admin/quan-tri.html', desc: 'Hệ thống cho thuê xe du lịch, tự lái' },
        '11': { icon: 'fa-shirt', color: '#f43f5e', link: '../dich-vu/giat-ui/giat-ui-nhanh/admin/index.html', desc: 'Đội ngũ đến nhận giặt sấy đồ cấp tốc tận nhà' },
        '12': { icon: 'fa-box-open', color: '#14532d', link: '../dich-vu/van-tai-logistics/dich-vu-chuyen-don/admin-chuyendon/index.php', desc: 'Dịch vụ chuyển dọn nhà và văn phòng trọn gói' }
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

            // Sắp xếp dữ liệu theo thứ tự hiển thị tại Trang chủ
            // 1:Mẹ Bé, 3:Người Già, 2:Người Bệnh, 5:Vệ Sinh, 4:Vườn Nhà, 11:Giặt Ủi, 7:Giao Hàng, 12:Chuyển Dọn, 10:Thuê Xe, 6:Lái Xe Hộ, 8:Sửa Xe, 9:Thợ Nhà
            const displayOrder = [1, 3, 2, 5, 4, 11, 7, 12, 10, 6, 8, 9];
            data.sort((a, b) => {
                const idxA = displayOrder.indexOf(parseInt(a.id));
                const idxB = displayOrder.indexOf(parseInt(b.id));
                // Nếu không nằm trong displayOrder (Sẽ đẩy về sau)
                const valA = idxA === -1 ? 999 : idxA;
                const valB = idxB === -1 ? 999 : idxB;
                return valA - valB;
            });

            // Xây dựng bảng Data Quản lý
            tbody.innerHTML = data.map(item => `
                <tr>
                    <td class="fw-bold">#${item.id}</td>
                    <td class="fw-bold text-primary">${item.dichvu || 'N/A'}</td>
                    <td><div class="text-truncate" style="max-width: 250px;">${item.mota || 'Chưa có mô tả'}</div></td>
                    <td><span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">${item.tro_gia || 0}%</span></td>
                    <td><span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1">${item.hoa_hong || 0}%</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary handle-edit-service" data-id="${item.id}" data-name="${item.dichvu || ''}" data-subsidy="${item.tro_gia || ''}" data-commission="${item.hoa_hong || ''}" data-desc="${item.mota || ''}" title="Sửa"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger handle-delete-service" data-id="${item.id}" title="Xóa"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            // Xây dựng Mobile Cards cho Dịch vụ
            const svcMobile = document.getElementById('serviceMobileCards');
            if (svcMobile) {
                svcMobile.innerHTML = data.map(item => `
                    <div class="mobile-data-card">
                        <div class="card-top">
                            <div class="d-flex align-items-center gap-2">
                                <span class="card-id">#${item.id}</span>
                                <span class="card-name text-primary fw-bold">${item.dichvu || 'N/A'}</span>
                            </div>
                            <div class="d-flex gap-1">
                                <span class="badge bg-success">${item.tro_gia || 0}%</span>
                                <span class="badge bg-primary">${item.hoa_hong || 0}%</span>
                            </div>
                        </div>
                        <div class="card-desc">${item.mota || 'Chưa có mô tả'}</div>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-outline-primary handle-edit-service" data-id="${item.id}" data-name="${item.dichvu || ''}" data-subsidy="${item.tro_gia || ''}" data-commission="${item.hoa_hong || ''}" data-desc="${item.mota || ''}"><i class="fas fa-edit me-1"></i>Sửa</button>
                            <button class="btn btn-sm btn-outline-danger handle-delete-service" data-id="${item.id}"><i class="fas fa-trash me-1"></i>Xóa</button>
                        </div>
                    </div>
                `).join('');
            }

            // Tự động Cập nhật lưới Grid Hệ Sinh Thái
            if (cardsContainer) {
                cardsContainer.innerHTML = data.map(item => {
                    const conf = ecoConfig[item.id] || defaultConfig;
                    return `
                        <a href="${conf.link}" class="app-card" ${conf.link === '#' ? 'onclick="alert(\'Chưa có đường link đến trang admin dịch vụ con vào admin-dashboard.js để thêm!\'); return false;"' : ''}>
                            <div class="app-card-icon" style="background-color: ${conf.color}; color: #fff;">
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

    // Event delegation cho bảng Phí (Desktop + Mobile)
    function handleFeeClick(e) {
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
                (async () => {
                    try {
                        await DVQTKrud.deleteRow('phidichuyen', delBtn.dataset.id);
                        loadFees();
                    } catch (err) {
                        alert('Lỗi xóa: ' + err.message);
                    }
                })();
            }
        }
    }
    document.getElementById('feeTableBody').addEventListener('click', handleFeeClick);
    const feeMobileEl = document.getElementById('feeMobileCards');
    if (feeMobileEl) feeMobileEl.addEventListener('click', handleFeeClick);

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

            // Xây dựng Mobile Cards cho Phí
            const feeMobile = document.getElementById('feeMobileCards');
            if (feeMobile) {
                feeMobile.innerHTML = data.map(item => `
                    <div class="mobile-data-card">
                        <div class="card-top">
                            <span class="card-id">#${item.id}</span>
                            <span class="card-name">${item.loaiphi || 'N/A'}</span>
                        </div>
                        <div class="card-desc" style="font-size: 1.1rem; font-weight: 700; color: #16a34a;">${parseInt(item.sotien || 0).toLocaleString()} VNĐ</div>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-outline-primary handle-edit-fee" data-id="${item.id}" data-type="${item.loaiphi || ''}" data-amount="${item.sotien || ''}"><i class="fas fa-edit me-1"></i>Sửa</button>
                            <button class="btn btn-sm btn-outline-danger handle-delete-fee" data-id="${item.id}"><i class="fas fa-trash me-1"></i>Xóa</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Lỗi tải dữ liệu</td></tr>';
        }
    }

    loadServices();

    // --- QUẢN LÝ TÀI KHOẢN (NGƯỜI DÙNG) ---
    let allAccounts = [];
    let servicesMap = {};

    async function loadAccounts() {
        const tbody = document.getElementById('accountTableBody');
        const filterSvc = document.getElementById('filterAccountService');

        try {
            // Tải danh sách dịch vụ để map tên và fill filter
            const services = await DVQTKrud.listTable('dichvucungcap', { limit: 100 });
            servicesMap = {};
            filterSvc.innerHTML = '<option value="">Tất cả dịch vụ</option><option value="0">Khách hàng (Không DV)</option>';
            services.forEach(s => {
                servicesMap[s.id] = s.dichvu;
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.dichvu;
                filterSvc.appendChild(opt);
            });

            // Tải danh sách tài khoản
            const data = await DVQTKrud.listTable('nguoidung', { limit: 5000 });
            allAccounts = data || [];

            filterAndRenderAccounts();
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Lỗi tải dữ liệu tài khoản</td></tr>';
        }
    }

    function filterAndRenderAccounts() {
        const q = document.getElementById('searchAccountInput').value.toLowerCase().trim();
        const svcId = document.getElementById('filterAccountService').value;

        let filtered = allAccounts;

        if (svcId === "0") {
            // Lọc khách hàng (id_dichvu là 0, rỗng hoặc null)
            filtered = filtered.filter(u => {
                const val = String(u.id_dichvu || "").trim();
                return val === "" || val === "0";
            });
        } else if (svcId) {
            // Lọc theo NCC của dịch vụ cụ thể
            filtered = filtered.filter(u => {
                const ids = String(u.id_dichvu || "").split(',').map(x => x.trim()).filter(x => x !== "" && x !== "0");
                return ids.includes(svcId);
            });
        }

        if (q) {
            filtered = filtered.filter(u =>
                (u.hovaten && u.hovaten.toLowerCase().includes(q)) ||
                (u.sodienthoai && u.sodienthoai.includes(q))
            );
        }

        renderAccountTable(filtered);
    }

    function renderAccountTable(data) {
        const tbody = document.getElementById('accountTableBody');
        const mobileContainer = document.getElementById('accountMobileCards');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Không tìm thấy tài khoản nào</td></tr>';
            if (mobileContainer) mobileContainer.innerHTML = '<p class="text-center w-100 py-3 text-muted">Trống</p>';
            return;
        }

        // Lấy giá trị lọc hiện tại để ưu tiên hiển thị
        const currentFilterSvc = document.getElementById('filterAccountService').value;

        const html = data.map(u => {
            // Lọc bỏ id=0 hoặc chuỗi rỗng để xác định có phải NCC hay không
            let svcIds = String(u.id_dichvu || "").split(',').map(x => x.trim()).filter(x => x !== "" && x !== "0");
            const isNCC = svcIds.length > 0;

            // Ưu tiên đưa dịch vụ đang được lọc lên đầu danh sách hiển thị
            if (currentFilterSvc && currentFilterSvc !== "0" && svcIds.includes(currentFilterSvc)) {
                svcIds = [currentFilterSvc, ...svcIds.filter(id => id !== currentFilterSvc)];
            }

            // Làm đẹp phần hiển thị dịch vụ: Giới hạn hiện 3 cái, còn lại hiện +X
            const displayLimit = 3;
            let svcNames = svcIds.slice(0, displayLimit).map(id =>
                `<span class="badge rounded-pill bg-indigo-subtle text-indigo border border-indigo-subtle me-1 mb-1" style="font-size:10px; font-weight: 600; padding: 4px 8px;">${servicesMap[id] || 'ID:' + id}</span>`
            ).join('');

            if (svcIds.length > displayLimit) {
                svcNames += `<span class="badge rounded-pill bg-light text-muted border mb-1" style="font-size:10px; font-weight: 600; padding: 4px 8px;">+${svcIds.length - displayLimit} thêm</span>`;
            }

            // Quy ước chuẩn: 0 = Hoạt động, 1 = Khóa
            const isLocked = String(u.trangthai) === '1';
            let statusBadge = isLocked
                ? '<span class="badge bg-danger">Bị khóa</span>'
                : '<span class="badge bg-success">Đang mở</span>';

            // Trạng thái bật/tắt phục vụ (hoatdong)
            const isOnline = String(u.hoatdong) === '1';
            const onlineStatus = isOnline
                ? '<div class="small text-success fw-bold mt-1"><i class="fas fa-circle me-1" style="font-size:8px;"></i>Online</div>'
                : '<div class="small text-muted fw-bold mt-1"><i class="fas fa-circle me-1" style="font-size:8px;"></i>Offline</div>';

            return `
                <tr>
                    <td>
                        <div class="fw-bold text-dark">${u.hovaten || 'N/A'}</div>
                        <div class="small text-muted font-monospace">${u.sodienthoai || '---'}</div>
                    </td>
                    <td>
                        <div class="small fw-600 mb-1">${isNCC ? 'Nhà cung cấp' : 'Khách hàng'}</div>
                        <div class="d-flex flex-wrap" style="max-width:200px;">${svcNames}</div>
                    </td>
                    <td>
                        ${statusBadge}
                        ${onlineStatus}
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-light text-primary handle-view-account" data-id="${u.id}" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm ${isLocked ? 'btn-outline-success' : 'btn-outline-warning'} handle-lock-account" data-id="${u.id}" data-status="${isLocked ? '0' : '1'}" title="${isLocked ? 'Mở khóa' : 'Khóa tài khoản'}">
                            <i class="fas ${isLocked ? 'fa-unlock' : 'fa-lock'}"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;

        if (mobileContainer) {
            mobileContainer.innerHTML = data.map(u => {
                const isLocked = String(u.trangthai) === '1';
                return `
                    <div class="mobile-data-card">
                        <div class="card-top">
                             <span class="card-name">${u.hovaten || 'N/A'}</span>
                             <div class="d-flex gap-2 align-items-center">
                                <span class="badge ${isLocked ? 'bg-danger' : 'bg-success'}">${isLocked ? 'Bị khóa' : 'Đang mở'}</span>
                                ${String(u.hoatdong) === '1' ? '<span class="badge bg-success" style="font-size:10px;">Online</span>' : '<span class="badge bg-secondary" style="font-size:10px;">Offline</span>'}
                             </div>
                         </div>
                        <div class="small mb-1">SĐT: ${u.sodienthoai}</div>
                        <div class="card-actions">
                             <button class="btn btn-sm btn-light text-primary handle-view-account" data-id="${u.id}"><i class="fas fa-eye me-1"></i>Xem</button>
                             <button class="btn btn-sm ${isLocked ? 'btn-success' : 'btn-warning'} handle-lock-account" data-id="${u.id}" data-status="${isLocked ? '0' : '1'}">
                                <i class="fas ${isLocked ? 'fa-unlock' : 'fa-lock'} me-1"></i>${isLocked ? 'Mở' : 'Khóa'}
                             </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Modal Xem chi tiết
    let currentAccount = null;
    const modalDetail = new bootstrap.Modal(document.getElementById('modalAccountDetail'));

    function showAccountDetail(id) {
        currentAccount = allAccounts.find(u => String(u.id) === String(id));
        if (!currentAccount) return;

        const u = currentAccount;
        const svcIds = String(u.id_dichvu || "").split(',').map(x => x.trim()).filter(x => x !== "" && x !== "0");
        const isLocked = String(u.trangthai) === '1';

        // Helper để render ảnh (hỗ trợ Google Drive ID, Tên file vật lý và icon mặc định)
        const renderImage = (val, type = 'avatar') => {
            if (!val) {
                if (type === 'avatar') return `<img src="asset/image/default-avatar.png" class="rounded-circle border shadow-sm" style="width: 120px; height: 120px; object-fit: cover;">`;
                return `<i class="fas ${type === 'front' ? 'fa-id-card' : 'fa-id-card'} fa-2x text-muted opacity-25"></i>`;
            }

            let finalUrl = '';

            // 1. Nếu là URL trực tiếp (http...)
            if (val.startsWith('http')) {
                finalUrl = val;
            }
            // 2. Nếu là ID Drive (không chứa dấu chấm, không chứa gạch chéo)
            else if (!val.includes('.') && !val.includes('/')) {
                // Sử dụng iframe preview để ổn định nhất (giống profile.js)
                const style = type === 'avatar'
                    ? 'width: 300%; height: 300%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;'
                    : 'width: 180%; height: 180%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;';
                const containerStyle = type === 'avatar'
                    ? 'width: 120px; height: 120px; position:relative; overflow:hidden; border-radius:50%; margin: 0 auto;'
                    : 'width: 100%; height: 100%; position:relative; overflow:hidden; border-radius:inherit;';

                return `
                    <div style="${containerStyle}">
                        <iframe src="https://drive.google.com/file/d/${val}/preview" frameborder="0" scrolling="no" style="${style}"></iframe>
                        <a href="https://drive.google.com/file/d/${val}/view" target="_blank" style="display:block; position:absolute; inset:0; z-index:10;"></a>
                    </div>
                `;
            }
            // 3. Nếu là tên file vật lý (có dấu chấm mở rộng tên file)
            else {
                // Dò tìm trong thư mục uploads/providers của hệ thống
                finalUrl = 'uploads/providers/' + val;
            }

            if (type === 'avatar') {
                return `<img src="${finalUrl}" class="rounded-circle border shadow-sm" style="width: 120px; height: 120px; object-fit: cover;" onerror="this.src='asset/image/default-avatar.png'">`;
            } else {
                return `<img src="${finalUrl}" class="img-fluid" style="height:100%; width:100%; object-fit: contain; cursor: pointer;" onclick="window.open('${finalUrl}')" onerror="this.parentElement.innerHTML='<small class=&quot;text-muted&quot;>Lỗi ảnh</small>'">`;
            }
        };

        // Lấy đúng trường dữ liệu (fallback cho nhiều dự án khác nhau)
        // Ưu tiên các trường tenfile của Thợ Nhà, sau đó là link_ của Profile chung
        const avatarVal = u.avatartenfile || u.link_avatar || u.avatar || '';
        const cccdFrontVal = u.cccdmattruoctenfile || u.link_cccd_truoc || u.anh_cccd_truoc || '';
        const cccdBackVal = u.cccdmatsautenfile || u.link_cccd_sau || u.anh_cccd_sau || '';

        const bodyHtml = `
            <div class="account-detail-container">
                <div class="row g-4">
                    <!-- Sidebar: Profile & Status -->
                    <div class="col-md-4 text-center border-end">
                        <div class="position-relative d-inline-block mb-3">
                            ${renderImage(avatarVal, 'avatar')}
                            <span class="position-absolute bottom-0 end-0 badge rounded-pill ${isLocked ? 'bg-danger' : 'bg-success'} border border-2 border-white p-2" style="z-index: 11;">
                                <span class="visually-hidden">Status</span>
                            </span>
                        </div>
                        <h4 class="fw-bold mb-1">${u.hovaten || 'N/A'}</h4>
                        <p class="text-muted small mb-3">ID: #${u.id}</p>
                        
                        <div class="system-status-group p-3 rounded-3 bg-light border mb-4 text-start">
                            <div class="d-flex align-items-center mb-2">
                                <i class="fas ${isLocked ? 'fa-user-slash text-danger' : 'fa-user-check text-success'} me-2" style="width:20px;"></i>
                                <span class="small fw-bold text-uppercase text-muted" style="font-size: 10px; flex: 1;">Tài khoản:</span>
                                <span class="badge ${isLocked ? 'bg-danger' : 'bg-success'}">${isLocked ? 'Đã khóa' : 'Đang mở'}</span>
                            </div>
                            
                            <div class="d-flex align-items-center mb-2">
                                <i class="fas fa-signal ${String(u.hoatdong) === '1' ? 'text-success' : 'text-muted'} me-2" style="width:20px;"></i>
                                <span class="small fw-bold text-uppercase text-muted" style="font-size: 10px; flex: 1;">Kết nối:</span>
                                <span class="badge ${String(u.hoatdong) === '1' ? 'bg-success' : 'bg-secondary'}">${String(u.hoatdong) === '1' ? 'Online' : 'Offline'}</span>
                            </div>

                            ${svcIds.length > 0 ? `
                            <div class="d-flex align-items-center">
                                <i class="fas fa-bolt ${String(u.tudongnhandon) === '1' ? 'text-warning' : 'text-muted'} me-2" style="width:20px;"></i>
                                <span class="small fw-bold text-uppercase text-muted" style="font-size: 10px; flex: 1;">Tự nhận đơn:</span>
                                <span class="badge ${String(u.tudongnhandon) === '1' ? 'bg-warning text-dark' : 'bg-light text-muted border'}">${String(u.tudongnhandon) === '1' ? 'Đang bật' : 'Đang tắt'}</span>
                            </div>
                            ` : ''}
                        </div>

                        <div class="identity-info text-start px-2">
                            <div class="small text-muted text-uppercase fw-bold mb-1" style="font-size: 10px;">Số CCCD</div>
                            <div class="fw-bold text-dark border-bottom pb-2 mb-2">${u.cccd || '---'}</div>
                            
                            <div class="small text-muted text-uppercase fw-bold mb-1" style="font-size: 10px;">Số điện thoại</div>
                            <div class="fw-bold text-dark border-bottom pb-2 mb-2">${u.sodienthoai || '---'}</div>
                        </div>
                    </div>

                    <!-- Main Info -->
                    <div class="col-md-8">
                        <h6 class="fw-bold text-uppercase border-bottom pb-2 mb-3"><i class="fas fa-info-circle me-2"></i>Thông tin chi tiết</h6>
                        
                        <div class="row g-3 mb-4">
                            <div class="col-sm-6">
                                <label class="small text-muted text-uppercase fw-bold">Email</label>
                                <div class="text-dark">${u.email || 'N/A'}</div>
                            </div>
                            <div class="col-sm-6">
                                <label class="small text-muted text-uppercase fw-bold">Mật khẩu</label>
                                <div class="font-monospace text-primary fw-bold">${u.matkhau || '---'}</div>
                            </div>
                            <div class="col-12">
                                <label class="small text-muted text-uppercase fw-bold">Địa chỉ</label>
                                <div class="text-dark">${u.diachi || 'Chưa cung cấp địa chỉ'}</div>
                            </div>
                            <div class="col-12">
                                <label class="small text-muted text-uppercase fw-bold">Dịch vụ cung cấp</label>
                                <div class="py-1">
                                    ${svcIds.map(id => `<span class="badge bg-light text-primary border border-primary-subtle me-1">${servicesMap[id] || id}</span>`).join('') || '<span class="text-muted small italic">Tài khoản khách hàng</span>'}
                                </div>
                            </div>
                        </div>

                        <h6 class="fw-bold text-uppercase border-bottom pb-2 mb-3"><i class="fas fa-id-card me-2"></i>Hình ảnh xác minh (CCCD)</h6>
                        <div class="row g-2">
                            <div class="col-6">
                                <p class="small text-muted text-center mb-1">Mặt trước</p>
                                <div class="cccd-img-box border rounded overflow-hidden bg-light d-flex align-items-center justify-content-center" style="height: 120px;">
                                    ${renderImage(cccdFrontVal, 'front')}
                                </div>
                            </div>
                            <div class="col-6">
                                <p class="small text-muted text-center mb-1">Mặt sau</p>
                                <div class="cccd-img-box border rounded overflow-hidden bg-light d-flex align-items-center justify-content-center" style="height: 120px;">
                                    ${renderImage(cccdBackVal, 'back')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('accountDetailBody').innerHTML = bodyHtml;

        const lockBtn = document.getElementById('btnToggleLockAccount');
        if (isLocked) {
            lockBtn.innerHTML = '<i class="fas fa-unlock me-2"></i>Mở khóa tài khoản';
            lockBtn.className = 'btn btn-success px-4';
        } else {
            lockBtn.innerHTML = '<i class="fas fa-lock me-2"></i>Khóa tài khoản';
            lockBtn.className = 'btn btn-warning px-4';
        }

        modalDetail.show();
    }

    // Toggle Lock từ Modal
    document.getElementById('btnToggleLockAccount').addEventListener('click', async () => {
        if (!currentAccount) return;
        const isLocked = String(currentAccount.trangthai) === '1';
        const newStatus = isLocked ? '0' : '1';

        if (confirm(`Bạn có chắc chắn muốn ${isLocked ? 'MỞ KHÓA' : 'KHÓA'} tài khoản này?`)) {
            try {
                await DVQTKrud.updateRow('nguoidung', currentAccount.id, { trangthai: newStatus });
                modalDetail.hide();
                loadAccounts();
            } catch (err) { alert('Lỗi: ' + err.message); }
        }
    });

    // Event Delegation
    const accountHandlers = async (e) => {
        const viewBtn = e.target.closest('.handle-view-account');
        const lockBtn = e.target.closest('.handle-lock-account');

        if (viewBtn) {
            showAccountDetail(viewBtn.dataset.id);
        }

        if (lockBtn) {
            const id = lockBtn.dataset.id;
            const newStatus = lockBtn.dataset.status;
            const action = newStatus === '1' ? 'KHÓA' : 'MỞ KHÓA';

            if (confirm(`Xác nhận ${action} tài khoản #${id}?`)) {
                try {
                    await DVQTKrud.updateRow('nguoidung', id, { trangthai: newStatus });
                    loadAccounts();
                } catch (err) { alert('Lỗi: ' + err.message); }
            }
        }
    };
    document.getElementById('accountTableBody').addEventListener('click', accountHandlers);
    if (document.getElementById('accountMobileCards')) {
        document.getElementById('accountMobileCards').addEventListener('click', accountHandlers);
    }

    // Gắn sự kiện filter & search
    document.getElementById('filterAccountService').addEventListener('change', filterAndRenderAccounts);
    document.getElementById('searchAccountInput').addEventListener('input', filterAndRenderAccounts);
});
