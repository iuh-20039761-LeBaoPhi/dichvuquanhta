<?php
session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$filterStatus = (string) ($_GET['status'] ?? 'all');
if (!in_array($filterStatus, ['all', '0', '1', '2'], true)) {
    $filterStatus = 'all';
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Hòm thư liên hệ | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .message-card { background:#fff; border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 4px 6px rgba(0,0,0,0.02); border-left:4px solid #cbd5e1; }
        .message-card.status-0 { border-left-color:#3b82f6; }
        .message-card.status-1 { border-left-color:#f59e0b; }
        .message-card.status-2 { border-left-color:#10b981; }
        .filter-nav { display:flex; gap:10px; margin-bottom:30px; background:#f1f5f9; padding:5px; border-radius:12px; width:fit-content; flex-wrap: wrap; }
        .filter-btn { padding:8px 16px; border-radius:8px; text-decoration:none; color:#64748b; font-weight:600; font-size:14px; transition:all 0.2s; }
        .filter-btn.active { background:#fff; color:#0a2a66; box-shadow:0 4px 6px rgba(0,0,0,0.05); }
        .contact-summary-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px; }
        .contact-summary-card { background:#fff; border-radius:12px; padding:16px 18px; box-shadow:0 4px 10px rgba(15,23,42,0.04); border:1px solid #e2e8f0; }
        .contact-summary-card strong { display:block; font-size:24px; color:#0a2a66; margin-top:4px; }
        .contact-runtime-message { display:none; margin-bottom:20px; }
        .contact-meta-list { display:flex; flex-wrap:wrap; gap:10px 16px; font-size:13px; color:#64748b; margin-bottom:12px; }
        .contact-meta-list span { display:inline-flex; align-items:center; gap:6px; }
        .contact-message-body { background:#f8fafc; padding:15px; border-radius:8px; color:#475569; font-size:14px; line-height:1.6; border:1px solid #f1f5f9; margin-bottom:20px; white-space:pre-wrap; }
        .contact-card-form { background:#fff; padding:20px; border-radius:12px; border:1px solid #edf2f7; }
        .contact-card-form .grid-responsive { display:grid; grid-template-columns:minmax(0, 1fr) 280px; gap:20px; }
        .contact-card-form .form-group { margin-bottom:0; }
        .contact-card-form .admin-input, .contact-card-form .admin-select { width:100%; }
        .contact-empty { text-align:center; padding:60px; }
        .contact-empty i { font-size:48px; color:#cbd5e1; margin-bottom:15px; display:block; }
        .contact-empty p { color:#64748b; }
        @media (max-width: 768px) {
            .contact-card-form .grid-responsive { grid-template-columns:1fr; }
        }
    </style>
    <script src="https://api.dvqt.vn/js/krud.js"></script>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container" id="contact-manage-page" data-filter-status="<?php echo htmlspecialchars($filterStatus, ENT_QUOTES, 'UTF-8'); ?>">
        <div class="page-header">
            <h2 class="page-title">Hòm thư & Khiếu nại</h2>
            <div class="filter-nav">
                <a href="?status=all" class="filter-btn <?php echo $filterStatus === 'all' ? 'active' : ''; ?>">Tất cả</a>
                <a href="?status=0" class="filter-btn <?php echo $filterStatus === '0' ? 'active' : ''; ?>">Mới nhận</a>
                <a href="?status=1" class="filter-btn <?php echo $filterStatus === '1' ? 'active' : ''; ?>">Đang xử lý</a>
                <a href="?status=2" class="filter-btn <?php echo $filterStatus === '2' ? 'active' : ''; ?>">Đã xong</a>
            </div>
        </div>

        <div id="contact-runtime-message" class="pricing-alert contact-runtime-message"></div>
        <div id="contact-summary" class="contact-summary-grid"></div>
        <div id="contact-list" class="dashboard-layout" style="grid-template-columns: 1fr; gap: 0;"></div>
        <div id="contact-empty" class="admin-card contact-empty" hidden>
            <i class="fa-solid fa-folder-open"></i>
            <p>Chưa có tin liên hệ nào.</p>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="assets/js/contact-manage.js?v=<?php echo time(); ?>"></script>
</body>
</html>
