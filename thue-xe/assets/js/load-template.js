async function loadHeader() {
    // Inject CSS vào head ngay lập tức nếu trang chưa có (tránh FOUC)
    if (!document.querySelector('link[href*="bootstrap.min.css"]')) {
        [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
            'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
            'assets/css/style.css'
        ].forEach(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        });
        
        // Nạp SweetAlert2 JS
        const swalScript = document.createElement('script');
        swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(swalScript);
    }

    // Tự động nạp DVQT Core nếu chưa có
    const ROOT_DETECTOR = () => {
        // Nếu DVQTApp đã nạp và có ROOT_URL, dùng nó luôn
        if (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) return window.DVQTApp.ROOT_URL;

        const path = window.location.pathname;
        const lowerPath = path.toLowerCase();
        
        // Theo dõi chuỗi /thue-xe/ để cắt root
        const idx = lowerPath.indexOf('/thue-xe/');
        if (idx !== -1) return path.substring(0, idx);
        
        // Nếu không tìm thấy thue-xe, lấy segment đầu tiên làm root (dùng cho XAMPP)
        const parts = path.split('/');
        return parts[1] && !parts[1].includes('.') ? '/' + parts[1] : '';
    };
    const BASE = ROOT_DETECTOR();
    
    const loadCore = (src) => new Promise(res => {
        if (document.querySelector(`script[src*="${src}"]`)) return res();
        const s = document.createElement('script');
        s.src = BASE + src;
        s.onload = res;
        s.onerror = () => {
            console.warn(`[loadHeader] Không thể nạp ${src}, sử dụng fallback...`);
            res();
        };
        // Timeout 5 giây tránh treo ứng dụng
        const timer = setTimeout(() => {
            console.warn(`[loadHeader] Timeout nạp ${src}`);
            res();
        }, 5000);
        s.addEventListener('load', () => clearTimeout(timer));
        document.head.appendChild(s);
    });

    await loadCore('/public/asset/js/dvqt-krud.js');
    await loadCore('/public/asset/js/dvqt-app.js');

    injectBaseSEO();
    fetch('views/partials/header.html')
        .then(r => r.text())
        .then(html => {
            // Chỉ extract phần <header> thay vì inject cả file HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const headerEl = doc.querySelector('header');
            if (headerEl) {
                document.body.insertAdjacentElement('afterbegin', headerEl);
            } else {
                document.body.insertAdjacentHTML('afterbegin', html);
            }
            highlightActiveNav();
            injectBackBar();
            initAuthNav();
        });
}

function initAuthNav() {
    const loadingEl = document.getElementById('auth-loading');
    const guestEl   = document.getElementById('auth-guest');
    const userEl    = document.getElementById('auth-user');

    // Helper: Tìm Base URL của hệ thống (Ví dụ: /Test)
    const getRoot = () => {
        if (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) return window.DVQTApp.ROOT_URL;
        // Tự detect nếu chưa nạp DVQTApp
        const path = window.location.pathname;
        const idx = path.indexOf('/thue-xe/');
        if (idx !== -1) return path.substring(0, idx);
        return '/Test';
    };
    const ROOT = getRoot();

    // 1. Cập nhật các link dành cho khách (Guest)
    const loginLink = document.getElementById('auth-login-link');
    const regLink   = document.getElementById('auth-register-link');
    if (loginLink) loginLink.href = ROOT + '/public/dang-nhap.html?service=thuexe';
    if (regLink)   regLink.href   = ROOT + '/public/dang-ky.html?service=thuexe';

    const checkSessionHandler = (data) => {
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Lưu vào cache toàn cục để các script khác dùng luôn
        window._dvqt_session_cache = data;

        if (data && data.logged_in) {
            if (userEl) userEl.style.display = '';

            const nameEl   = document.getElementById('auth-name');
            const avatarEl = document.getElementById('auth-avatar');
            if (nameEl)   nameEl.textContent  = data.name;
            if (avatarEl) avatarEl.textContent = (data.name || 'U').charAt(0).toUpperCase();

            // 2. Cấu hình Dashboard cục bộ của module Thuê xe
            const dashMap = {
                customer: 'views/pages/customer/trang-ca-nhan.html',
                provider: 'views/pages/provider/trang-ca-nhan.html',
                admin:    'admin/index.html'
            };
            
            // 3. Đường dẫn API và Đăng xuất về hệ thống chung
            const logoutApi = ROOT + '/public/api/auth/logout.php';
            const loginUrl  = ROOT + '/public/dang-nhap.html?service=thuexe';

            const dashLink = document.getElementById('auth-dashboard-link');
            if (dashLink) {
                const dashUrl = dashMap[data.role] || dashMap.customer;
                dashLink.onclick = async function(e) {
                    if (data.role === 'provider') {
                        e.preventDefault();
                        try {
                            const hasAccess = await window.DVQTApp.checkAccess('nhacungcap_thuexe', data.phone || '');
                            if (hasAccess) {
                                window.location.href = dashUrl;
                            } else {
                                alert("Tài khoản của bạn chưa đăng ký làm nhà cung cấp của dịch vụ này!");
                            }
                        } catch (err) {
                            window.location.href = dashUrl;
                        }
                    } else {
                        dashLink.href = dashUrl;
                    }
                };
            }

            const logoutLink = document.getElementById('auth-logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', async function(e) {
                    e.preventDefault();
                    
                    // Sử dụng SweetAlert2 để xác nhận đăng xuất giống Thợ Nhà
                    const swalExist = typeof Swal !== 'undefined';
                    const confirmLogout = swalExist ? await Swal.fire({
                        title: '<span style="color:#ef4444">Đăng xuất?</span>',
                        text: 'Bạn có chắc chắn muốn thoát khỏi phiên làm việc này không?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Đăng xuất ngay',
                        cancelButtonText: 'Để sau',
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#94a3b8',
                        borderRadius: '12px'
                    }).then(r => r.isConfirmed) : confirm('Bạn có chắc muốn đăng xuất?');

                    if (confirmLogout) {
                        if (window.DVQTApp && window.DVQTApp.logout) {
                            await window.DVQTApp.logout();
                        } else {
                            await fetch(logoutApi).catch(() => null);
                        }
                        window.location.href = loginUrl;
                    }
                });
            }
        } else {
            if (guestEl) guestEl.style.display = '';
        }
    };

    if (window.DVQTApp && window.DVQTApp.checkSession) {
        window.DVQTApp.checkSession().then(checkSessionHandler).catch(() => {
            if (loadingEl) loadingEl.style.display = 'none';
            if (guestEl)   guestEl.style.display   = '';
        });
    } else {
        // Dự phòng nếu thư viện chưa load kịp
        setTimeout(() => {
            if (window.DVQTApp && window.DVQTApp.checkSession) {
                window.DVQTApp.checkSession().then(checkSessionHandler);
            } else {
                if (loadingEl) loadingEl.style.display = 'none';
                if (guestEl)   guestEl.style.display   = '';
            }
        }, 1000);
    }
}

function injectBaseSEO() {
    const seo = window.PAGE_SEO || {};
    const SITE_BASE = (() => {
        const p = window.location.pathname
            .replace(/\/(index\.php|pages\/[^/]+\/[^/]+\.(?:html|php)|views\/pages\/[^/]+\.(?:html|php)|[^/]+\.(?:html|php))$/, '')
            .replace(/\/$/, '');
        return window.location.origin + p;
    })();

    const title = seo.title || 'Thuê Xe – Thuê Xe Uy Tín TP.HCM | Giao Xe Tận Nơi';
    const desc  = seo.desc  || 'Thuê Xe – dịch vụ cho thuê xe tự lái và có tài xế uy tín tại TP.HCM. Hơn 100 dòng xe từ 450.000đ/ngày. Giao xe tận nơi, bảo hiểm đầy đủ. Hotline: 0775 472 347.';
    const keys  = seo.keys  || 'thuê xe tphcm, thuê xe tự lái, cho thuê xe có tài xế, thuê xe giá rẻ, car rental hcm';
    const url   = seo.url   || SITE_BASE + '/';
    const img   = seo.img   || SITE_BASE + '/assets/images/cars/thue-xe-xe-toyota-camry-2023.jpg';

    document.title = title;

    const setMeta = (sel, attr, val) => {
        let el = document.querySelector(sel);
        if (!el) {
            el = document.createElement('meta');
            document.head.appendChild(el);
        }
        el.setAttribute(attr, val);
    };

    setMeta('meta[name="description"]',       'content', desc);
    setMeta('meta[name="keywords"]',           'content', keys);
    setMeta('meta[name="robots"]',             'content', 'index, follow');
    setMeta('meta[name="author"]',             'content', 'Thuê Xe TP.HCM');
    setMeta('meta[name="geo.region"]',         'content', 'VN-SG');
    setMeta('meta[name="geo.placename"]',      'content', 'Thành phố Hồ Chí Minh');

    setMeta('meta[property="og:type"]',        'content', 'website');
    setMeta('meta[property="og:url"]',         'content', url);
    setMeta('meta[property="og:title"]',       'content', title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:image"]',       'content', img);
    setMeta('meta[property="og:locale"]',      'content', 'vi_VN');
    setMeta('meta[property="og:site_name"]',   'content', 'Thuê Xe');

    setMeta('meta[name="twitter:card"]',        'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]',       'content', title);
    setMeta('meta[name="twitter:description"]', 'content', desc);
    setMeta('meta[name="twitter:image"]',       'content', img);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = url;

    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);
    }
    favicon.href = 'assets/images/thue-xe-logo-header-navigation.jpg';
}

function loadFooter() {
    // Inject Bootstrap JS nếu chưa có
    if (!window.bootstrap && !document.querySelector('script[src*="bootstrap.bundle"]')) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
        document.head.appendChild(s);
    }

    fetch('views/partials/footer.html')
        .then(r => r.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const footerEl = doc.querySelector('footer');
            const floatBtn = doc.querySelector('.float-call-btn');
            const styleEl  = doc.querySelector('style');
            if (footerEl) document.body.insertAdjacentElement('beforeend', footerEl);
            if (floatBtn) document.body.insertAdjacentElement('beforeend', floatBtn);
            if (styleEl)  document.head.appendChild(styleEl);
        });
}

function highlightActiveNav() {
    let page = window.PAGE_SEO?.navPage;
    if (!page) page = new URLSearchParams(window.location.search).get('page');
    if (!page) {
        let m = window.location.pathname.match(/\/pages\/[^/]+\/([^/.]+)\.html/);
        if (!m) m = window.location.pathname.match(/\/views\/pages\/([^/.]+)\.html/);
        if (!m) m = window.location.pathname.match(/\/([^/.]+)\.html$/);
        page = m ? m[1] : 'home';
    }

    const NAV_PAGE_MAP = {
        home: 'home',
        about: 'about',
        services: 'services',
        guide: 'guide',
        contact: 'contact',
        blog: 'cam-nang',
        'cam-nang': 'cam-nang',
        terms: 'terms',
        search: 'home',
        'car-detail': 'home',
        'booking-success': 'home',
        'track-order': 'home',
        'blog-detail': 'cam-nang',
        'chi-tiet-cam-nang': 'cam-nang',
        'gioi-thieu': 'about',
        'dich-vu': 'services',
        'huong-dan-thue-xe': 'guide',
        'lien-he': 'contact',
        'bai-viet': 'cam-nang',
        'chi-tiet-bai-viet': 'cam-nang',
        'dieu-khoan': 'terms',
        'tim-kiem': 'home',
        'chi-tiet-xe': 'home',
        'dat-lich-thanh-cong': 'home',
        'tra-cuu-don': 'home',
        'huong-dan-he-thong': 'guide'
    };

    const navPage = NAV_PAGE_MAP[page] || page;
    if (navPage) document.getElementById(`nav-${navPage}`)?.classList.add('active');
}

function injectBackBar() {
    let page = new URLSearchParams(window.location.search).get('page');
    if (!page) {
        let m = window.location.pathname.match(/\/pages\/[^/]+\/([^/.]+)\.html/);
        if (!m) m = window.location.pathname.match(/\/views\/pages\/([^/.]+)\.html/);
        if (!m) m = window.location.pathname.match(/\/([^/.]+)\.html$/);
        page = m ? m[1] : 'home';
    }
    if (!page || page === 'home' || page === 'index') return;

    const PAGE_LABELS = {
        search:            'Tìm xe',
        'car-detail':      'Chi tiết xe',
        about:             'Giới thiệu',
        services:          'Dịch vụ',
        guide:             'Hướng dẫn',
        contact:           'Liên hệ',
        'booking-success': 'Đặt xe thành công',
        'track-order':     'Theo dõi đơn',
        terms:             'Điều khoản',
        blog:              'Cẩm nang',
        'cam-nang':        'Cẩm nang',
        'blog-detail':     'Chi tiết cẩm nang',
        'chi-tiet-cam-nang': 'Chi tiết cẩm nang',
        'gioi-thieu':      'Giới thiệu',
        'dich-vu':         'Dịch vụ',
        'huong-dan-thue-xe': 'Hướng dẫn',
        'lien-he':         'Liên hệ',
        'bai-viet':        'Cẩm nang',
        'chi-tiet-bai-viet': 'Chi tiết cẩm nang',
        'dieu-khoan':      'Điều khoản',
        'tim-kiem':        'Tìm xe',
        'chi-tiet-xe':     'Chi tiết xe',
        'dat-lich-thanh-cong': 'Đặt xe thành công',
        'tra-cuu-don':     'Theo dõi đơn',
        'huong-dan-he-thong': 'Hướng dẫn hệ thống',
        'dat-lich':  'Đặt lịch'
    };

    const PARENT = {
        'car-detail':      'views/pages/public/tim-kiem.html',
        'chi-tiet-xe':     'views/pages/public/tim-kiem.html',
        'blog-detail':     'views/pages/public/cam-nang.html',
        'chi-tiet-bai-viet': 'views/pages/public/cam-nang.html',
        'chi-tiet-cam-nang': 'views/pages/public/cam-nang.html',
        'booking-success': 'index.html',
        'dat-lich-thanh-cong': 'index.html'
    };

    const label  = PAGE_LABELS[page] || page;
    const parent = PARENT[page] || 'index.html';

    const bar = document.createElement('div');
    bar.className = 'back-bar';
    bar.innerHTML = `
        <div class="container">
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item">
                        <a href="${parent}" onclick="goBack('${parent}'); return false;">
                            <i class="fas fa-home me-1"></i>Trang Chủ
                        </a>
                    </li>
                    <li class="breadcrumb-item active">${label}</li>
                </ol>
            </nav>
        </div>`;

    const header = document.querySelector('header');
    if (header) header.insertAdjacentElement('afterend', bar);
    else document.body.insertAdjacentElement('afterbegin', bar);
}

function goBack(fallback) {
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
        history.back();
    } else {
        window.location.href = fallback;
    }
}
