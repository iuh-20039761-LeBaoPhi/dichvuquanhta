<?php
session_start();

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    session_destroy();
    header('Location: index.php');
    exit;
}

$isLoggedIn = isset($_SESSION['admin_id']);
$adminName  = $_SESSION['admin_name'] ?? 'Admin';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - CarRental</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --sidebar-width: 250px; }
        body { background: #f1f5f9; }

        /* ===== LOGIN ===== */
        .login-wrapper {
            min-height: 100vh;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            display: flex; align-items: center; justify-content: center;
        }
        .login-card { max-width: 420px; width: 100%; }

        /* ===== SIDEBAR ===== */
        .sidebar {
            width: var(--sidebar-width);
            min-height: 100vh;
            background: linear-gradient(180deg, #1e1b4b 0%, #312e81 100%);
            position: fixed; left: 0; top: 0; z-index: 100;
            display: flex; flex-direction: column;
        }
        .sidebar-brand {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: #fff; font-weight: 700; font-size: 1.1rem;
            text-decoration: none; display: block;
        }
        .sidebar-nav { flex: 1; padding: 0.75rem 0; }
        .sidebar-nav .nav-link {
            color: rgba(255,255,255,0.65);
            padding: 0.7rem 1.5rem;
            display: flex; align-items: center; gap: 0.65rem;
            border-radius: 6px; margin: 2px 10px;
            transition: all 0.2s; font-size: 0.95rem;
        }
        .sidebar-nav .nav-link:hover,
        .sidebar-nav .nav-link.active {
            color: #fff; background: rgba(255,255,255,0.12);
        }
        .sidebar-footer {
            padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1);
        }

        /* ===== MAIN ===== */
        .main-content { margin-left: var(--sidebar-width); min-height: 100vh; }
        .top-bar {
            background: #fff; padding: 0.875rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            position: sticky; top: 0; z-index: 99;
            display: flex; align-items: center; justify-content: space-between;
        }
        .content-area { padding: 1.5rem; }

        /* ===== STAT CARDS ===== */
        .stat-card { border: none; border-radius: 12px; overflow: hidden; }
        .stat-icon {
            width: 52px; height: 52px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* ===== TABLE ===== */
        .table thead th {
            font-size: 0.78rem; text-transform: uppercase;
            letter-spacing: 0.05em; color: #64748b;
            border-bottom: 2px solid #e2e8f0;
        }
        .badge-pending    { background: #fef9c3; color: #854d0e; }
        .badge-confirmed  { background: #dcfce7; color: #166534; }
        .badge-completed  { background: #dbeafe; color: #1e40af; }
        .badge-cancelled  { background: #fee2e2; color: #991b1b; }

        @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); }
            .main-content { margin-left: 0; }
        }
    </style>
</head>
<body>

<?php if (!$isLoggedIn): ?>
<!-- ========== LOGIN PAGE ========== -->
<div class="login-wrapper">
    <div class="login-card mx-3">
        <div class="card border-0 shadow-xl">
            <div class="card-body p-5">
                <div class="text-center mb-4">
                    <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                         style="width:72px;height:72px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                        <i class="fas fa-car fa-2x text-white"></i>
                    </div>
                    <h3 class="fw-bold mb-1">Thuê Xe Admin</h3>
                    <p class="text-muted small">Đăng nhập để quản lý hệ thống</p>
                </div>

                <div id="loginAlert"></div>

                <form id="loginForm">
                    <div class="mb-3">
                        <label class="form-label fw-medium">Tên đăng nhập</label>
                        <div class="input-group">
                            <span class="input-group-text bg-light border-end-0">
                                <i class="fas fa-user text-muted"></i>
                            </span>
                            <input type="text" class="form-control border-start-0 ps-0"
                                   id="username" placeholder="admin" required autofocus>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="form-label fw-medium">Mật khẩu</label>
                        <div class="input-group">
                            <span class="input-group-text bg-light border-end-0">
                                <i class="fas fa-lock text-muted"></i>
                            </span>
                            <input type="password" class="form-control border-start-0 ps-0"
                                   id="password" placeholder="••••••" required>
                            <button type="button" class="btn btn-light border" id="togglePwd">
                                <i class="fas fa-eye text-muted"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn w-100 text-white fw-semibold py-2"
                            style="background:linear-gradient(135deg,#6366f1,#8b5cf6);" id="loginBtn">
                        <i class="fas fa-sign-in-alt me-2"></i>Đăng nhập
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<?php else: ?>
<!-- ========== ADMIN PANEL ========== -->
<div class="sidebar">
    <a href="index.php" class="sidebar-brand">
        <i class="fas fa-car me-2"></i>Thuê Xe Admin
    </a>
    <nav class="sidebar-nav">
        <ul class="nav flex-column">
            <li><a class="nav-link" href="#" data-page="dashboard" onclick="loadPage('dashboard');return false;">
                <i class="fas fa-chart-pie"></i>Dashboard
            </a></li>
            <li><a class="nav-link" href="#" data-page="cars" onclick="loadPage('cars');return false;">
                <i class="fas fa-car"></i>Quản lý xe
            </a></li>
            <li><a class="nav-link" href="#" data-page="bookings" onclick="loadPage('bookings');return false;">
                <i class="fas fa-calendar-check"></i>Đơn đặt xe
            </a></li>
        </ul>
    </nav>
    <div class="sidebar-footer">
        <div class="text-white-50 small mb-2">
            <i class="fas fa-user-circle me-1"></i><?= htmlspecialchars($adminName) ?>
        </div>
        <button class="btn btn-sm btn-outline-light w-100 mb-2" onclick="showChangePwdModal()">
            <i class="fas fa-key me-1"></i>Đổi mật khẩu
        </button>
        <a href="index.php?action=logout" class="btn btn-sm btn-outline-light w-100">
            <i class="fas fa-sign-out-alt me-1"></i>Đăng xuất
        </a>
    </div>
</div>

<div class="main-content">
    <div class="top-bar">
        <h6 class="mb-0 fw-bold" id="pageTitle">Dashboard</h6>
        <a href="../index.html?page=home" target="_blank" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-external-link-alt me-1"></i>Xem trang web
        </a>
    </div>
    <div class="content-area" id="contentArea">
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>
    </div>
</div>

<!-- Car Modal -->
<div class="modal fade" id="carModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title fw-bold" id="carModalTitle">Thêm xe mới</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="carFormAlert"></div>
                <input type="hidden" id="carId">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Tên xe *</label>
                        <input type="text" class="form-control" id="carName" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Hãng xe *</label>
                        <input type="text" class="form-control" id="carBrand" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Model *</label>
                        <input type="text" class="form-control" id="carModel" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Năm sản xuất *</label>
                        <input type="number" class="form-control" id="carYear" min="2000" max="2030" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Số chỗ *</label>
                        <select class="form-select" id="carSeats">
                            <option value="4">4 chỗ</option>
                            <option value="5" selected>5 chỗ</option>
                            <option value="7">7 chỗ</option>
                            <option value="9">9 chỗ</option>
                            <option value="16">16 chỗ</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Hộp số *</label>
                        <select class="form-select" id="carTransmission">
                            <option value="Tự động">Tự động</option>
                            <option value="Số sàn">Số sàn</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Nhiên liệu *</label>
                        <select class="form-select" id="carFuelType">
                            <option value="Xăng">Xăng</option>
                            <option value="Dầu">Dầu</option>
                            <option value="Điện">Điện</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Giá/ngày (đ) *</label>
                        <input type="number" class="form-control" id="carPrice" min="0" step="10000" required>
                    </div>
                    <div class="col-md-12">
                        <label class="form-label">Ảnh chính</label>
                        <div class="d-flex align-items-start gap-3">
                            <div id="imagePreviewBox" class="border rounded flex-shrink-0 overflow-hidden bg-light d-flex align-items-center justify-content-center" style="width:130px;height:95px;">
                                <i class="fas fa-image fa-2x text-secondary" id="imageIcon"></i>
                                <img id="imagePreviewImg" src="" alt="" class="w-100 h-100" style="object-fit:cover;display:none;">
                            </div>
                            <div class="flex-grow-1">
                                <input type="hidden" id="carImageName">
                                <label for="carImageFile" class="btn btn-outline-primary btn-sm mb-2">
                                    <i class="fas fa-upload me-1"></i>Chọn ảnh
                                </label>
                                <input type="file" id="carImageFile" accept="image/jpeg,image/png,image/webp,image/gif" class="d-none" onchange="handleImageSelect(this)">
                                <div id="imageUploadStatus" class="small text-muted">Chưa chọn ảnh (jpg, png, webp — tối đa 5MB)</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Trạng thái</label>
                        <select class="form-select" id="carStatus">
                            <option value="available">Có sẵn</option>
                            <option value="maintenance">Bảo trì</option>
                            <option value="rented">Đã thuê</option>
                        </select>
                    </div>
                    <div class="col-md-12">
                        <label class="form-label">Mô tả</label>
                        <textarea class="form-control" id="carDesc" rows="2"></textarea>
                    </div>
                    <div class="col-md-12">
                        <label class="form-label">Tính năng <small class="text-muted">(phân cách bởi dấu phẩy)</small></label>
                        <input type="text" class="form-control" id="carFeatures" placeholder="vd: Điều hòa, Camera lùi, GPS">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                <button type="button" class="btn btn-primary" onclick="saveCar()">
                    <i class="fas fa-save me-1"></i>Lưu
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Change Password Modal -->
<div class="modal fade" id="changePwdModal" tabindex="-1">
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-key me-2 text-primary"></i>Đổi mật khẩu
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="changePwdAlert"></div>
                <div class="mb-3">
                    <label class="form-label fw-medium">Mật khẩu hiện tại</label>
                    <div class="input-group">
                        <input type="password" class="form-control" id="currentPwd" placeholder="••••••">
                        <button type="button" class="btn btn-light border" onclick="togglePwd('currentPwd',this)">
                            <i class="fas fa-eye text-muted"></i>
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-medium">Mật khẩu mới</label>
                    <div class="input-group">
                        <input type="password" class="form-control" id="newPwd" placeholder="Ít nhất 6 ký tự">
                        <button type="button" class="btn btn-light border" onclick="togglePwd('newPwd',this)">
                            <i class="fas fa-eye text-muted"></i>
                        </button>
                    </div>
                </div>
                <div class="mb-1">
                    <label class="form-label fw-medium">Xác nhận mật khẩu mới</label>
                    <div class="input-group">
                        <input type="password" class="form-control" id="confirmPwd" placeholder="Nhập lại mật khẩu mới">
                        <button type="button" class="btn btn-light border" onclick="togglePwd('confirmPwd',this)">
                            <i class="fas fa-eye text-muted"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                <button type="button" class="btn btn-primary" id="changePwdBtn" onclick="submitChangePwd()">
                    <i class="fas fa-save me-1"></i>Lưu
                </button>
            </div>
        </div>
    </div>
</div>

<?php endif; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<?php if (!$isLoggedIn): ?>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đăng nhập...';

    try {
        const res = await fetch('../controllers/admin/auth_controller.php?action=login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            })
        });
        const data = await res.json();
        if (data.success) {
            window.location.reload();
        } else {
            document.getElementById('loginAlert').innerHTML =
                `<div class="alert alert-danger py-2"><i class="fas fa-exclamation-circle me-2"></i>${data.message}</div>`;
        }
    } catch {
        document.getElementById('loginAlert').innerHTML =
            `<div class="alert alert-danger py-2">Lỗi kết nối máy chủ!</div>`;
    }

    btn.disabled = false;
    btn.innerHTML = originalText;
});

document.getElementById('togglePwd').addEventListener('click', () => {
    const pwd = document.getElementById('password');
    const icon = document.querySelector('#togglePwd i');
    if (pwd.type === 'password') { pwd.type = 'text'; icon.className = 'fas fa-eye-slash text-muted'; }
    else { pwd.type = 'password'; icon.className = 'fas fa-eye text-muted'; }
});
</script>

<?php else: ?>
<script>
const ADMIN_API = {
    base: '../controllers/admin/',
    async get(file, params = {}) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`${this.base}${file}?${qs}`);
        return res.json();
    },
    async post(file, action, data) {
        const res = await fetch(`${this.base}${file}?action=${action}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        return res.json();
    }
};

const fmt  = n => new Intl.NumberFormat('vi-VN').format(n);
const fmtD = d => new Date(d).toLocaleDateString('vi-VN');

// ===== NAVIGATION =====
function loadPage(page) {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l =>
        l.classList.toggle('active', l.dataset.page === page));
    document.getElementById('pageTitle').textContent =
        {dashboard:'Dashboard', cars:'Quản lý xe', bookings:'Đơn đặt xe'}[page] || page;

    if (page === 'dashboard') loadDashboard();
    else if (page === 'cars')     loadCarsPage();
    else if (page === 'bookings') loadBookingsPage();
}

// ===== DASHBOARD =====
async function loadDashboard() {
    setContent('<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>');
    const [bStats, cStats] = await Promise.all([
        ADMIN_API.get('bookig_admin_controller.php', {action:'stats'}),
        ADMIN_API.get('car_addmin_controller.php',   {action:'stats'})
    ]);
    const b = bStats.success ? bStats.data : {};
    const c = cStats.success ? cStats.data : {};

    setContent(`
        <div class="row g-4 mb-4">
            ${statCard('fa-calendar-check','#ede9fe','#7c3aed','Tổng đơn', b.total||0)}
            ${statCard('fa-clock','#fef9c3','#ca8a04','Chờ duyệt', b.pending||0)}
            ${statCard('fa-dollar-sign','#dcfce7','#16a34a','Doanh thu', fmt(b.revenue||0)+'đ')}
            ${statCard('fa-car','#dbeafe','#2563eb','Tổng xe', c.total||0)}
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-bold">Đơn đặt xe gần đây</div>
            <div class="card-body p-0" id="recentBox">
                <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
            </div>
        </div>
    `);

    const r = await ADMIN_API.get('bookig_admin_controller.php', {action:'recent'});
    const box = document.getElementById('recentBox');
    if (r.success && r.data.length) {
        box.innerHTML = `<div class="table-responsive"><table class="table mb-0">
            <thead class="table-light"><tr>
                <th>Mã đơn</th><th>Khách hàng</th><th>Xe</th>
                <th>Ngày nhận</th><th>Tổng tiền</th><th>Trạng thái</th>
            </tr></thead><tbody>
            ${r.data.map(b => `<tr>
                <td><strong>#${pad(b.id)}</strong></td>
                <td>${b.customer_name}</td>
                <td>${b.car_name||'-'}</td>
                <td>${fmtD(b.pickup_date)}</td>
                <td>${fmt(b.total_price)}đ</td>
                <td><span class="badge badge-${b.status}">${statusLabel(b.status)}</span></td>
            </tr>`).join('')}
            </tbody></table></div>`;
    } else {
        box.innerHTML = '<p class="text-center text-muted py-3">Chưa có đơn nào</p>';
    }
}

function statCard(icon, bg, color, label, val) {
    return `<div class="col-md-3 col-sm-6">
        <div class="card stat-card shadow-sm">
            <div class="card-body d-flex align-items-center gap-3">
                <div class="stat-icon" style="background:${bg};">
                    <i class="fas ${icon}" style="color:${color};font-size:1.3rem;"></i>
                </div>
                <div>
                    <div class="text-muted small">${label}</div>
                    <div class="fs-5 fw-bold">${val}</div>
                </div>
            </div>
        </div>
    </div>`;
}

// ===== CARS =====
async function loadCarsPage() {
    setContent(`
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0">Danh sách xe</h6>
            <button class="btn btn-primary btn-sm" onclick="showCarModal()">
                <i class="fas fa-plus me-1"></i>Thêm xe
            </button>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body p-0" id="carsTable">
                <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
            </div>
        </div>
    `);
    await refreshCars();
}

async function refreshCars() {
    const res = await ADMIN_API.get('car_addmin_controller.php', {action:'list'});
    const box = document.getElementById('carsTable');
    if (!res.success || !res.data.length) {
        box.innerHTML = '<p class="text-center text-muted py-4">Chưa có xe nào</p>';
        return;
    }
    box.innerHTML = `<div class="table-responsive"><table class="table mb-0">
        <thead class="table-light"><tr>
            <th>#</th><th>Tên xe</th><th>Hãng / Model</th>
            <th>Chỗ</th><th>Giá/ngày</th><th>Trạng thái</th><th>Thao tác</th>
        </tr></thead><tbody>
        ${res.data.map(car => `<tr>
            <td>${car.id}</td>
            <td><strong>${car.name}</strong></td>
            <td>${car.brand} ${car.model} (${car.year})</td>
            <td>${car.seats}</td>
            <td>${fmt(car.price_per_day)}đ</td>
            <td><span class="badge ${carStatusBadge(car.status)}">${carStatusLabel(car.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editCar(${car.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCar(${car.id},'${car.name.replace(/'/g,"\\'")}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`).join('')}
        </tbody></table></div>`;
}

function showCarModal(car = null) {
    document.getElementById('carModalTitle').textContent = car ? 'Chỉnh sửa xe' : 'Thêm xe mới';
    document.getElementById('carId').value           = car?.id ?? '';
    document.getElementById('carName').value         = car?.name ?? '';
    document.getElementById('carBrand').value        = car?.brand ?? '';
    document.getElementById('carModel').value        = car?.model ?? '';
    document.getElementById('carYear').value         = car?.year ?? new Date().getFullYear();
    document.getElementById('carSeats').value        = car?.seats ?? '5';
    document.getElementById('carTransmission').value = car?.transmission ?? 'Tự động';
    document.getElementById('carFuelType').value     = car?.fuel_type ?? 'Xăng';
    document.getElementById('carPrice').value        = car?.price_per_day ?? '';
    document.getElementById('carImageName').value    = car?.main_image ?? '';
    document.getElementById('carDesc').value         = car?.description ?? '';
    document.getElementById('carFeatures').value     = car?.features ?? '';
    document.getElementById('carStatus').value       = car?.status ?? 'available';
    document.getElementById('carFormAlert').innerHTML = '';
    document.getElementById('carImageFile').value = '';
    const prevImg = document.getElementById('imagePreviewImg');
    const prevIcon = document.getElementById('imageIcon');
    if (car?.main_image) {
        prevImg.src = `../assets/images/cars/${car.main_image}`;
        prevImg.style.display = '';
        prevIcon.style.display = 'none';
    } else {
        prevImg.src = '';
        prevImg.style.display = 'none';
        prevIcon.style.display = '';
    }
    document.getElementById('imageUploadStatus').textContent =
        car?.main_image ? car.main_image : 'Chưa chọn ảnh (jpg, png, webp — tối đa 5MB)';
    document.getElementById('imageUploadStatus').className = 'small text-muted';
    new bootstrap.Modal(document.getElementById('carModal')).show();
}

async function editCar(id) {
    const res = await ADMIN_API.get('car_addmin_controller.php', {action:'get', id});
    if (res.success) showCarModal(res.data);
}

async function saveCar() {
    const id = document.getElementById('carId').value;
    const data = {
        name: document.getElementById('carName').value,
        brand: document.getElementById('carBrand').value,
        model: document.getElementById('carModel').value,
        year: document.getElementById('carYear').value,
        seats: document.getElementById('carSeats').value,
        transmission: document.getElementById('carTransmission').value,
        fuel_type: document.getElementById('carFuelType').value,
        price_per_day: document.getElementById('carPrice').value,
        main_image: document.getElementById('carImageName').value,
        description: document.getElementById('carDesc').value,
        features: document.getElementById('carFeatures').value,
        status: document.getElementById('carStatus').value,
    };

    if (!data.name || !data.brand || !data.model || !data.price_per_day) {
        document.getElementById('carFormAlert').innerHTML =
            '<div class="alert alert-danger py-2">Vui lòng điền đầy đủ các trường bắt buộc (*)</div>';
        return;
    }

    if (id) data.id = id;
    const res = await ADMIN_API.post('car_addmin_controller.php', id ? 'update' : 'create', data);
    if (res.success) {
        bootstrap.Modal.getInstance(document.getElementById('carModal')).hide();
        await refreshCars();
        toast(id ? 'Cập nhật xe thành công!' : 'Thêm xe thành công!');
    } else {
        document.getElementById('carFormAlert').innerHTML =
            `<div class="alert alert-danger py-2">${res.message}</div>`;
    }
}

async function deleteCar(id, name) {
    if (!confirm(`Xóa xe "${name}"?`)) return;
    const res = await ADMIN_API.post('car_addmin_controller.php', 'delete', {id});
    if (res.success) { await refreshCars(); toast('Đã xóa xe!'); }
    else toast(res.message || 'Không thể xóa!', 'danger');
}

// ===== BOOKINGS =====
async function loadBookingsPage() {
    setContent(`
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white d-flex align-items-center justify-content-between">
                <span class="fw-bold">Danh sách đơn đặt xe</span>
                <select class="form-select form-select-sm w-auto" id="statusFilter" onchange="refreshBookings(this.value)">
                    <option value="">Tất cả</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                </select>
            </div>
            <div class="card-body p-0" id="bookingsTable">
                <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
            </div>
        </div>
    `);
    await refreshBookings();
}

async function refreshBookings(status = '') {
    const params = {action:'list'};
    if (status) params.status = status;
    const res = await ADMIN_API.get('bookig_admin_controller.php', params);
    const box = document.getElementById('bookingsTable');

    if (!res.success || !res.data.length) {
        box.innerHTML = '<p class="text-center text-muted py-4">Không có đơn nào</p>';
        return;
    }
    box.innerHTML = `<div class="table-responsive"><table class="table mb-0">
        <thead class="table-light"><tr>
            <th>Mã đơn</th><th>Khách hàng</th><th>Xe</th>
            <th>Nhận xe</th><th>Trả xe</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th>
        </tr></thead><tbody>
        ${res.data.map(b => `<tr>
            <td><strong>#${pad(b.id)}</strong></td>
            <td>
                <div>${b.customer_name}</div>
                <small class="text-muted">${b.customer_phone}</small>
            </td>
            <td>${b.car_name||'-'}</td>
            <td>${fmtD(b.pickup_date)}</td>
            <td>${fmtD(b.return_date)}</td>
            <td>${fmt(b.total_price)}đ</td>
            <td><span class="badge badge-${b.status}">${statusLabel(b.status)}</span></td>
            <td>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                        Cập nhật
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" onclick="updateStatus(${b.id},'confirmed');return false;">
                            <i class="fas fa-check text-success me-2"></i>Xác nhận
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="updateStatus(${b.id},'completed');return false;">
                            <i class="fas fa-flag-checkered text-primary me-2"></i>Hoàn thành
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="updateStatus(${b.id},'cancelled');return false;">
                            <i class="fas fa-times me-2"></i>Hủy đơn
                        </a></li>
                    </ul>
                </div>
            </td>
        </tr>`).join('')}
        </tbody></table></div>`;
}

async function updateStatus(id, status) {
    const labels = {confirmed:'xác nhận', completed:'hoàn thành', cancelled:'hủy'};
    if (!confirm(`Bạn có chắc muốn ${labels[status]} đơn này?`)) return;
    const res = await ADMIN_API.post('bookig_admin_controller.php', 'updateStatus', {id, status});
    if (res.success) {
        const cur = document.getElementById('statusFilter')?.value || '';
        await refreshBookings(cur);
        toast('Cập nhật trạng thái thành công!');
    } else {
        toast(res.message || 'Có lỗi xảy ra!', 'danger');
    }
}

// ===== HELPERS =====
function setContent(html) { document.getElementById('contentArea').innerHTML = html; }
function pad(n) { return String(n).padStart(6, '0'); }
function statusLabel(s) {
    return {pending:'Chờ duyệt',confirmed:'Đã xác nhận',completed:'Hoàn thành',cancelled:'Đã hủy'}[s]||s;
}
function carStatusLabel(s) { return {available:'Có sẵn',rented:'Đã thuê',maintenance:'Bảo trì'}[s]||s; }
function carStatusBadge(s) { return {available:'bg-success',rented:'bg-warning text-dark',maintenance:'bg-secondary'}[s]||'bg-secondary'; }
function toast(msg, type='success') {
    const el = document.createElement('div');
    el.className = `alert alert-${type} shadow-sm position-fixed`;
    el.style.cssText = 'bottom:20px;right:20px;z-index:9999;min-width:260px;border-radius:10px;';
    el.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'} me-2"></i>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ===== CHANGE PASSWORD =====
function showChangePwdModal() {
    document.getElementById('currentPwd').value  = '';
    document.getElementById('newPwd').value      = '';
    document.getElementById('confirmPwd').value  = '';
    document.getElementById('changePwdAlert').innerHTML = '';
    // reset mắt hiện mật khẩu về ẩn
    ['currentPwd','newPwd','confirmPwd'].forEach(id => {
        const inp = document.getElementById(id);
        inp.type = 'password';
        inp.closest('.input-group').querySelector('i').className = 'fas fa-eye text-muted';
    });
    new bootstrap.Modal(document.getElementById('changePwdModal')).show();
}

function togglePwd(inputId, btn) {
    const inp = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.className = 'fas fa-eye-slash text-muted';
    } else {
        inp.type = 'password';
        icon.className = 'fas fa-eye text-muted';
    }
}

async function submitChangePwd() {
    const alertEl     = document.getElementById('changePwdAlert');
    const btn         = document.getElementById('changePwdBtn');
    const currentPwd  = document.getElementById('currentPwd').value;
    const newPwd      = document.getElementById('newPwd').value;
    const confirmPwd  = document.getElementById('confirmPwd').value;

    alertEl.innerHTML = '';

    if (!currentPwd || !newPwd || !confirmPwd) {
        alertEl.innerHTML = '<div class="alert alert-warning py-2">Vui lòng điền đầy đủ các trường</div>';
        return;
    }
    if (newPwd.length < 6) {
        alertEl.innerHTML = '<div class="alert alert-warning py-2">Mật khẩu mới phải có ít nhất 6 ký tự</div>';
        return;
    }
    if (newPwd !== confirmPwd) {
        alertEl.innerHTML = '<div class="alert alert-warning py-2">Xác nhận mật khẩu không khớp</div>';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...';

    try {
        const res  = await fetch('../controllers/admin/auth_controller.php?action=changePassword', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({current_password: currentPwd, new_password: newPwd, confirm_password: confirmPwd})
        });
        const data = await res.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('changePwdModal')).hide();
            toast(data.message || 'Đổi mật khẩu thành công!');
        } else {
            alertEl.innerHTML = `<div class="alert alert-danger py-2"><i class="fas fa-exclamation-circle me-2"></i>${data.message}</div>`;
        }
    } catch {
        alertEl.innerHTML = '<div class="alert alert-danger py-2">Lỗi kết nối máy chủ!</div>';
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save me-1"></i>Lưu';
}

// ===== IMAGE UPLOAD =====
async function handleImageSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const statusEl = document.getElementById('imageUploadStatus');
    const maxSize  = 5 * 1024 * 1024;
    const allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowed.includes(file.type)) {
        statusEl.textContent  = 'Định dạng không hỗ trợ (chỉ jpg, png, webp, gif)';
        statusEl.className    = 'small text-danger';
        input.value = '';
        return;
    }
    if (file.size > maxSize) {
        statusEl.textContent  = 'File quá lớn (tối đa 5MB)';
        statusEl.className    = 'small text-danger';
        input.value = '';
        return;
    }

    // Preview ngay lập tức
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('imageIcon').style.display = 'none';
        const img = document.getElementById('imagePreviewImg');
        img.src = e.target.result;
        img.style.display = '';
    };
    reader.readAsDataURL(file);

    statusEl.textContent = 'Đang tải lên...';
    statusEl.className   = 'small text-muted';

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res  = await fetch('../controllers/admin/car_addmin_controller.php?action=upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('carImageName').value = data.filename;
            statusEl.textContent = 'Tải lên thành công: ' + file.name;
            statusEl.className   = 'small text-success';
        } else {
            statusEl.textContent = 'Lỗi: ' + (data.message || 'Không thể upload');
            statusEl.className   = 'small text-danger';
            document.getElementById('imagePreviewImg').style.display = 'none';
            document.getElementById('imageIcon').style.display       = '';
        }
    } catch {
        statusEl.textContent = 'Lỗi kết nối máy chủ';
        statusEl.className   = 'small text-danger';
    }
}

// Init
loadPage('dashboard');
</script>
<?php endif; ?>
</body>
</html>
