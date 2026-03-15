function loadHeader() {
    injectBaseSEO();
    fetch('views/layouts/header.html')
        .then(r => r.text())
        .then(html => {
            document.body.insertAdjacentHTML('afterbegin', html);
            highlightActiveNav();
            injectBackBar();
        });
}

function injectBaseSEO() {
    const seo = window.PAGE_SEO || {};
    const SITE_BASE = 'https://iuh-20039761-lebaophi.github.io/GlobalCare/thue-xe';

    const title = seo.title || 'Thuê Xe – Thuê Xe Uy Tín TP.HCM | Giao Xe Tận Nơi';
    const desc  = seo.desc  || 'Thuê Xe – dịch vụ cho thuê xe tự lái và có tài xế uy tín tại TP.HCM. Hơn 100 dòng xe từ 450.000đ/ngày. Giao xe tận nơi, bảo hiểm đầy đủ. Hotline: 0123 456 789.';
    const keys  = seo.keys  || 'thuê xe tphcm, thuê xe tự lái, cho thuê xe có tài xế, thuê xe giá rẻ, car rental hcm';
    const url   = seo.url   || SITE_BASE + '/';
    const img   = seo.img   || SITE_BASE + '/assets/images/cars/camry.jpg';

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
        favicon.href = 'assets/images/cars/default.jpg';
        document.head.appendChild(favicon);
    }
}

function loadFooter() {
    fetch('views/layouts/footer.html')
        .then(r => r.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            // Bootstrap JS phải inject dynamic để thực thi được
            if (!window.bootstrap) {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
                document.body.appendChild(s);
            }
        });
}

function highlightActiveNav() {
    let page = window.PAGE_SEO?.navPage;
    if (!page) page = new URLSearchParams(window.location.search).get('page');
    if (!page) {
        let m = window.location.pathname.match(/\/views\/pages\/([^/.]+)\.html/);
        if (!m) m = window.location.pathname.match(/\/([^/.]+)\.html$/);
        page = m ? m[1] : 'home';
    }
    // blog-detail should highlight blog nav
    if (page === 'blog-detail') page = 'blog';
    document.getElementById(`nav-${page}`)?.classList.add('active');
}

function injectBackBar() {
    let page = new URLSearchParams(window.location.search).get('page');
    if (!page) {
        const m = window.location.pathname.match(/\/views\/pages\/([^/.]+)\.html/);
        page = m ? m[1] : 'home';
    }
    if (page === 'home' || !page) return;

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
        blog:              'Blog',
        'blog-detail':     'Bài viết',
    };

    const PARENT = {
        'car-detail':      'views/pages/search.html',
        'booking-success': 'index.html',
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
