 <!-- Sidebar -->
        <div class="sidebar" data-background-color="dark">
            <div class="sidebar-logo">
                <!-- Logo Header -->
                <div class="logo-header" data-background-color="dark">
                    <a href="?ctrl=page&act=dashboard" style="color: white; font-weight: bold;" class="logo">
                        <img src="public/asset/image/Frame 1.png" alt="navbar brand" class="navbar-brand" height="40" /> Giặt Ủi Nhanh
                    </a>
                    <div class="nav-toggle">
                        <button class="btn btn-toggle toggle-sidebar">
                <i class="gg-menu-right"></i>
              </button>
                        <button class="btn btn-toggle sidenav-toggler">
                <i class="gg-menu-left"></i>
              </button>
                    </div>
                    <button class="topbar-toggler more">
              <i class="gg-more-vertical-alt"></i>
            </button>
                </div>
                <!-- End Logo Header -->
            </div>
            <div class="sidebar-wrapper scrollbar scrollbar-inner">
                <div class="sidebar-content">
                    <ul class="nav nav-secondary">
                        <li class="nav-item <?php echo (isset($_GET['ctrl']) && $_GET['ctrl'] == 'page' && isset($_GET['act']) && $_GET['act'] == 'dashboard') ? 'active' : ''; ?>">
                            <a  href="?ctrl=page&act=dashboard" class="collapsed" aria-expanded="false">
                                <i class="fas fa-home"></i>
                                <p>Bảng điều khiển</p>
                            </a>
                        </li>
                        <li class="nav-item <?php echo (isset($_GET['ctrl']) && $_GET['ctrl'] == 'page' && isset($_GET['act']) && $_GET['act'] == 'service') ? 'active' : ''; ?>">
                            <a  href="?ctrl=page&act=service" class="collapsed" aria-expanded="false">
                                <i class="fas fa-folder"></i>
                                <p>Quản lý dịch vụ</p>
                            </a>
                        </li>
                        <li class="nav-item <?php echo (isset($_GET['ctrl']) && $_GET['ctrl'] == 'page' && isset($_GET['act']) && $_GET['act'] == 'statistic') ? 'active' : ''; ?>">
                            <a  href="?ctrl=page&act=statistic" class="collapsed" aria-expanded="false">
                                <i class="far fa-chart-bar"></i>
                                <p>Quản lý thống kê</p>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <!-- End Sidebar -->