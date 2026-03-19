(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/lookup-modal-core\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();
  var lookupInvoicesById = {};

  function ensureLookupModalStyles() {
    if (document.getElementById('lookupModalRuntimeStyles')) return;

    var style = document.createElement('style');
    style.id = 'lookupModalRuntimeStyles';
    style.textContent =
      '#lookupModal .lookup-mobile-list .card{border:1px solid rgba(220,53,69,.2);box-shadow:0 4px 14px rgba(220,53,69,.08);}' +
      '#lookupModal .lookup-mobile-row{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;padding:.35rem 0;border-bottom:1px dashed rgba(108,117,125,.25);}' +
      '#lookupModal .lookup-mobile-row:last-child{border-bottom:0;}' +
      '#lookupModal .lookup-mobile-label{font-weight:600;color:#6c757d;min-width:84px;flex:0 0 auto;}' +
      '#lookupModal .lookup-mobile-value{text-align:right;min-width:0;word-break:break-word;}' +
      '#lookupModal .lookup-mobile-actions{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;}' +
      '@media (max-width:767.98px){' +
      '  #lookupModal .lookup-mobile-list .card-body{padding:.75rem;}' +
      '  #lookupModal .lookup-mobile-row{font-size:.92rem;}' +
      '}';

    document.head.appendChild(style);
  }

  function apiUrl(path) {
    return new URL('api/' + path, projectBase).href;
  }

  function assetUrl(path) {
    return new URL(String(path || '').replace(/^\/+/, ''), projectBase).href;
  }

  function getStatusBadge(status) {
    var badges = {
      cho_xu_ly: '<span class="badge rounded-pill text-bg-warning">Chờ xử lý</span>',
      da_nhan: '<span class="badge rounded-pill text-bg-info">Đã nhận</span>',
      dang_lam: '<span class="badge rounded-pill text-bg-primary">Đang làm</span>',
      hoan_thanh: '<span class="badge rounded-pill text-bg-success">Hoàn thành</span>',
      da_huy: '<span class="badge rounded-pill text-bg-danger">Đã hủy</span>',
      pending: '<span class="badge rounded-pill text-bg-warning">Chờ xử lý</span>',
      da_duyet: '<span class="badge rounded-pill text-bg-info">Đã nhận</span>',
      in_progress: '<span class="badge rounded-pill text-bg-primary">Đang làm</span>',
      completed: '<span class="badge rounded-pill text-bg-success">Hoàn thành</span>',
      cancelled: '<span class="badge rounded-pill text-bg-danger">Đã hủy</span>'
    };

    return badges[status] || '<span class="badge rounded-pill text-bg-secondary">' + (status || 'N/A') + '</span>';
  }

  function getLookupModalEl() {
    return document.getElementById('lookupModal');
  }

  function openChildModal(childModalId, returnToLookup) {
    var childEl = document.getElementById(childModalId);
    if (!childEl || typeof bootstrap === 'undefined') return;

    childEl.dataset.returnToLookup = returnToLookup ? '1' : '0';

    var lookupEl = getLookupModalEl();
    var childInstance = bootstrap.Modal.getOrCreateInstance(childEl);

    if (!lookupEl || !returnToLookup || !lookupEl.classList.contains('show')) {
      childInstance.show();
      return;
    }

    var lookupInstance = bootstrap.Modal.getOrCreateInstance(lookupEl);
    lookupEl.addEventListener(
      'hidden.bs.modal',
      function onHidden() {
        childInstance.show();
      },
      { once: true }
    );

    lookupInstance.hide();
  }

  function bindChildModalReturn() {
    ['lookupInvoiceDetailModal', 'lookupEmployeeDetailModal'].forEach(function (id) {
      var childEl = document.getElementById(id);
      if (!childEl || childEl.dataset.returnBound === '1') return;

      childEl.dataset.returnBound = '1';
      childEl.addEventListener('hidden.bs.modal', function () {
        if (childEl.dataset.returnToLookup !== '1') return;
        childEl.dataset.returnToLookup = '0';

        var lookupEl = getLookupModalEl();
        if (!lookupEl || typeof bootstrap === 'undefined') return;

        bootstrap.Modal.getOrCreateInstance(lookupEl).show();
      });
    });
  }

  function getLookupInvoice(invoiceId) {
    return lookupInvoicesById[String(invoiceId)] || null;
  }

  function rememberLookupInvoices(invoices) {
    lookupInvoicesById = {};
    (invoices || []).forEach(function (invoice) {
      lookupInvoicesById[String(invoice.id)] = invoice;
    });
  }

  function getMediaHtml(media) {
    if (!media || media.length === 0) {
      return '<p class="text-center text-muted mb-0">Chưa có dữ liệu media</p>';
    }

    return media
      .map(function (m) {
        var filePath = m.duong_dan_file || m.duong_dan;
        var isImage = m.loai_file === 'hinh_anh' || m.loai_file === 'image' || m.loai_file === 'png' || m.loai_file === 'jpg' || m.loai_file === 'jpeg';
        var view = isImage
          ? '<img src="' + assetUrl(filePath) + '" class="img-fluid rounded">'
          : '<video src="' + assetUrl(filePath) + '" controls class="w-100 rounded"></video>';
        return (
          '<div class="col-12 col-md-6 col-lg-4">' +
          view +
          '<p class="small mt-1 mb-0"><strong>Mô tả:</strong> ' + (m.mo_ta || 'N/A') + '</p>' +
          '<p class="small text-muted mb-0">Bởi: ' + (m.uploader_name || 'N/A') + ' (' + (m.uploader_role || 'N/A') + ')</p>' +
          '</div>'
        );
      })
      .join('');
  }

  function getEmployeeMedia(media, nhanVien, invoice) {
    if (!Array.isArray(media) || media.length === 0) return [];

    var employeeId = nhanVien && nhanVien.id ? Number(nhanVien.id) : Number(invoice && invoice.nhan_vien_id);
    var employeeName = (nhanVien && nhanVien.ten) || (invoice && invoice.employee_name) || '';

    return media.filter(function (m) {
      var uploaderId = Number((m && (m.nguoi_dung_id || m.uploader_id)) || 0);
      var uploaderRole = String((m && m.uploader_role) || '').toLowerCase();
      var uploaderName = String((m && m.uploader_name) || '');

      if (employeeId && uploaderId && uploaderId === employeeId) return true;
      if (uploaderRole.indexOf('nhan_vien') !== -1 || uploaderRole.indexOf('nhân viên') !== -1) return true;
      if (employeeName && uploaderName && uploaderName === employeeName) return true;

      return false;
    });
  }

  function hasDisplayValue(value) {
    return !(value === null || value === undefined || (typeof value === 'string' && value.trim() === ''));
  }

  function formatMoney(value) {
    var numberValue = parseInt(value, 10);
    if (Number.isNaN(numberValue)) return String(value);
    return numberValue.toLocaleString('vi-VN') + ' VNĐ';
  }

  function addInvoiceField(lines, label, value, options) {
    if (!hasDisplayValue(value)) return;

    var formattedValue = String(value);
    if (options && options.badge) {
      formattedValue = getStatusBadge(value);
    } else if (options && options.money) {
      formattedValue = formatMoney(value);
    }

    lines.push(
      '<div class="d-flex align-items-start gap-2 mb-2">' +
      '<span class="badge rounded-pill text-bg-danger-subtle text-danger-emphasis">' + label + '</span>' +
      '<span>' + formattedValue + '</span>' +
      '</div>'
    );
  }

  function addEmployeeField(lines, label, value, options) {
    if (!hasDisplayValue(value)) return;

    var formattedValue = String(value);
    if (options && options.phone) {
      formattedValue = '<a class="text-decoration-none" href="tel:' + value + '">' + value + '</a>';
    }
    if (options && options.rating) {
      formattedValue =
        '<span class="badge text-bg-warning text-dark fs-6">' +
        '<i class="bi bi-star-fill me-1"></i>' + value + '/5.0</span>';
    }

    lines.push(
      '<div class="d-flex align-items-start gap-2 mb-2">' +
      '<span class="badge rounded-pill text-bg-danger-subtle text-danger-emphasis">' + label + '</span>' +
      '<span>' + formattedValue + '</span>' +
      '</div>'
    );
  }

  function renderInvoiceDetailContent(content, invoice, nhanVien, media) {
    var leftInfoLines = [];
    var rightInfoLines = [];

    // addInvoiceField(leftInfoLines, 'Mã hóa đơn', invoice.id);
    addInvoiceField(leftInfoLines, 'Tên khách hàng', invoice.ten_khach_hang || invoice.ten);
    addInvoiceField(leftInfoLines, 'Số điện thoại', invoice.dien_thoai);
    addInvoiceField(leftInfoLines, 'Dịch vụ', invoice.dich_vu);
    addInvoiceField(leftInfoLines, 'Gói dịch vụ', invoice.goi_dich_vu);
    addInvoiceField(leftInfoLines, 'Ghi chú', invoice.ghi_chu);
    addInvoiceField(leftInfoLines, 'Yêu cầu thêm', invoice.yeu_cau_them);

    addInvoiceField(rightInfoLines, 'Ngày bắt đầu', invoice.ngay_bat_dau);
    addInvoiceField(rightInfoLines, 'Ngày kết thúc', invoice.ngay_ket_thuc);
    addInvoiceField(rightInfoLines, 'Giờ bắt đầu', invoice.gio_bat_dau);
    addInvoiceField(rightInfoLines, 'Giờ kết thúc', invoice.gio_ket_thuc);
    addInvoiceField(rightInfoLines, 'Tổng giờ', invoice.tong_gio);
    addInvoiceField(rightInfoLines, 'Tổng ngày', invoice.tong_ngay);
    addInvoiceField(rightInfoLines, 'Đơn vị thời gian', invoice.don_vi_thoi_gian);
    addInvoiceField(rightInfoLines, 'Số lượng thời gian', invoice.so_luong_thoi_gian);
    addInvoiceField(rightInfoLines, 'Giá tiền', invoice.gia_tien, { money: true });
    addInvoiceField(rightInfoLines, 'Tổng tiền', invoice.tong_tien, { money: true });
    addInvoiceField(rightInfoLines, 'Trạng thái', invoice.trang_thai, { badge: true });
    // addInvoiceField(rightInfoLines, 'ID nhân viên', invoice.nhan_vien_id);
    addInvoiceField(rightInfoLines, 'Ngày tạo', invoice.ngay_tao);
    addInvoiceField(rightInfoLines, 'Ngày cập nhật', invoice.ngay_cap_nhat || invoice.updated_at);

    var hasWork = hasDisplayValue(invoice.cong_viec);
    var employeeAvatar = (nhanVien && nhanVien.anh_dai_dien) || invoice.employee_avatar || '';
    var employeeName = (nhanVien && nhanVien.ten) || invoice.employee_name;
    var employeePhone = (nhanVien && nhanVien.dien_thoai) || invoice.employee_phone;
    var employeeEmail = (nhanVien && nhanVien.email) || invoice.employee_email;
    var employeeRating = (nhanVien && nhanVien.danh_gia) || invoice.employee_rating;
    var employeeExp = (nhanVien && nhanVien.kinh_nghiem) || invoice.employee_kinh_nghiem;
    var hasEmployee = hasDisplayValue(employeeName) || hasDisplayValue(employeePhone) || hasDisplayValue(employeeEmail);
    var employeeInfoLines = [];
    var employeeMedia = getEmployeeMedia(media, nhanVien, invoice);

    addEmployeeField(employeeInfoLines, 'Họ tên', employeeName);
    addEmployeeField(employeeInfoLines, 'Số điện thoại', employeePhone, { phone: true });
    addEmployeeField(employeeInfoLines, 'Email', employeeEmail);
    addEmployeeField(employeeInfoLines, 'Đánh giá', employeeRating, { rating: true });
    addEmployeeField(employeeInfoLines, 'Kinh nghiệm', employeeExp);

    content.innerHTML =
      '<div class="row g-3 lookup-invoice-layout">' +
      '  <div class="col-12 col-lg-7">' +
      '    <div class="card border-0 shadow-sm h-100 lookup-invoice-card">' +
      '      <div class="card-header text-white lookup-invoice-card-header" style="background: linear-gradient(135deg, #d32f2f, #ff7043);">' +
      '        <h6 class="mb-0"><i class="bi bi-receipt-cutoff me-2"></i>Chi Tiết Hóa Đơn #' + (invoice.id || 'N/A') + '</h6>' +
      '      </div>' +
      '      <div class="card-body">' +
      (leftInfoLines.length > 0 || rightInfoLines.length > 0
        ? ('<div class="row g-2">' +
            '<div class="col-12 col-md-6">' + leftInfoLines.join('') + '</div>' +
            '<div class="col-12 col-md-6">' + rightInfoLines.join('') + '</div>' +
           '</div>')
        : '<p class="mb-0 text-muted">Không có dữ liệu hóa đơn để hiển thị.</p>') +
      (hasWork
        ? ('<div class="alert alert-warning-subtle border-warning mt-3 mb-0">' +
            '<div class="fw-semibold text-warning-emphasis mb-1"><i class="bi bi-list-check me-2"></i>Công việc</div>' +
            '<div>' + invoice.cong_viec + '</div>' +
           '</div>')
        : '') +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-12 col-lg-5">' +
      '    <div class="card border-0 shadow-sm h-100 lookup-employee-summary-card">' +
      '      <div class="card-header bg-warning-subtle">' +
      '        <h6 class="mb-0 text-warning-emphasis"><i class="bi bi-person-vcard-fill me-2"></i>Nhân Viên Thực Hiện</h6>' +
      '      </div>' +
      '      <div class="card-body lookup-employee-summary-body">' +
      (hasEmployee
        ? '<div class="text-center mb-3">' +
            (hasDisplayValue(employeeAvatar)
              ? '<img src="' + assetUrl(employeeAvatar) + '" class="rounded-circle border lookup-employee-avatar" style="width:104px;height:104px;max-width:104px;object-fit:cover;">'
              : '<div class="rounded-circle border d-inline-flex align-items-center justify-content-center bg-light lookup-employee-avatar" style="width:104px;height:104px;"><i class="bi bi-person fs-3 text-secondary"></i></div>') +
          '</div>' +
          (employeeInfoLines.length > 0 ? employeeInfoLines.join('') : '<p class="text-muted mb-0">Không có thông tin nhân viên.</p>') +
          '<div class="mt-3 pt-2 border-top">' +
            '<h6 class="mb-2 text-warning-emphasis"><i class="bi bi-camera-video-fill me-2"></i>Media Của Nhân Viên</h6>' +
            '<div class="row g-2">' +
              (employeeMedia.length > 0
                ? getMediaHtml(employeeMedia)
                : '<p class="text-muted mb-0">Chưa có media của nhân viên.</p>') +
            '</div>' +
          '</div>'
        : '<p class="text-muted mb-0">Chưa có nhân viên</p>') +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '<div class="card border-0 shadow-sm mt-3">' +
      '  <div class="card-header bg-danger-subtle">' +
      '    <h6 class="mb-0 text-danger-emphasis"><i class="bi bi-camera-video-fill me-2"></i>Hình Ảnh & Video Công Việc</h6>' +
      '  </div>' +
      '  <div class="card-body"><div class="row g-3">' +
      getMediaHtml(media) +
      '  </div></div>' +
      '</div>';
  }

  function renderEmployeeDetailContent(content, emp, media) {
    var infoLines = [];
    addEmployeeField(infoLines, 'Họ tên', emp.ten);
    addEmployeeField(infoLines, 'Số điện thoại', emp.dien_thoai, { phone: true });
    addEmployeeField(infoLines, 'Email', emp.email);
    addEmployeeField(infoLines, 'Đánh giá', emp.danh_gia, { rating: true });
    addEmployeeField(infoLines, 'Kinh nghiệm', emp.kinh_nghiem);

    content.innerHTML =
      '<div class="row g-3">' +
      '  <div class="col-md-4">' +
      '    <div class="card border-0 shadow-sm h-100">' +
      '      <div class="card-header text-white" style="background: linear-gradient(135deg, #e53935, #fb8c00);">' +
      '        <h6 class="mb-0"><i class="bi bi-person-badge-fill me-2"></i>Hồ Sơ Nhân Viên</h6>' +
      '      </div>' +
      '      <div class="card-body text-center">' +
      (emp && emp.anh_dai_dien
        ? '    <img src="' + assetUrl(emp.anh_dai_dien) + '" class="rounded-circle border mb-3 lookup-employee-avatar" style="width:120px;height:120px;max-width:120px;object-fit:cover;">'
        : '    <div class="rounded-circle border d-inline-flex align-items-center justify-content-center mb-3 bg-light lookup-employee-avatar" style="width:120px;height:120px;"><i class="bi bi-person fs-2 text-secondary"></i></div>') +
      (hasDisplayValue(emp.ten) ? '    <h6 class="mb-1">' + emp.ten + '</h6>' : '') +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-md-8">' +
      '    <div class="card border-0 shadow-sm mb-3">' +
      '      <div class="card-header bg-danger-subtle">' +
      '        <h6 class="mb-0 text-danger-emphasis"><i class="bi bi-info-circle-fill me-2"></i>Thông Tin Chi Tiết</h6>' +
      '      </div>' +
      '      <div class="card-body">' +
      (infoLines.length > 0
        ? infoLines.join('')
        : '<p class="text-muted mb-0">Không có dữ liệu nhân viên để hiển thị.</p>') +
      '      </div>' +
      '    </div>' +
      '    <div class="card border-0 shadow-sm">' +
      '      <div class="card-header bg-warning-subtle">' +
      '        <h6 class="mb-0 text-warning-emphasis"><i class="bi bi-camera-video-fill me-2"></i>Media Liên Quan Hóa Đơn</h6>' +
      '      </div>' +
      '      <div class="card-body">' +
      '        <div class="row g-2">' +
      (media && media.length > 0
        ? media
            .map(function (m) {
              var filePath = m.duong_dan_file || m.duong_dan;
              var isImage = m.loai_file === 'hinh_anh' || m.loai_file === 'image' || m.loai_file === 'png' || m.loai_file === 'jpg' || m.loai_file === 'jpeg';
              var view = isImage
                ? '<img src="' + assetUrl(filePath) + '" class="img-fluid rounded">'
                : '<video src="' + assetUrl(filePath) + '" controls class="w-100 rounded"></video>';
              return '<div class="col-6">' + view + '</div>';
            })
            .join('')
        : '<p class="text-muted mb-0">Chưa có media cho hóa đơn này</p>') +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
  }

  function renderInvoicesTable(resultContainer, invoices) {
    var desktopTableHtml =
      '<div class="d-none d-md-block">' +
      '<div class="card border-danger-subtle shadow-sm">' +
      '  <div class="card-body p-2 p-md-3">' +
      '    <div class="table-responsive">' +
      '      <table class="table table-hover align-middle mb-0" style="font-size: 14px;">' +
      '        <thead>' +
      '          <tr>' +
      '            <th>Tên khách hàng</th>' +
      '            <th>Gói dịch vụ</th>' +
      '            <th>Ngày bắt đầu</th>' +
      '            <th>Tổng tiền</th>' +
      '            <th>Trạng thái</th>' +
      '            <th>Tên nhân viên</th>' +
      '            <th>Hành động</th>' +
      '          </tr>' +
      '        </thead>' +
      '        <tbody id="lookupInvoicesTable"></tbody>' +
      '      </table>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '</div>';

    var mobileCardsHtml =
      '<div class="d-md-none lookup-mobile-list" id="lookupInvoicesMobileList"></div>';

    resultContainer.innerHTML =
      '<div class="d-flex align-items-center justify-content-between mb-2">' +
      '<h6 class="mb-0 text-danger-emphasis">Tìm thấy ' + invoices.length + ' hóa đơn</h6>' +
      '</div>' +
      desktopTableHtml +
      mobileCardsHtml;

    var tbody = resultContainer.querySelector('#lookupInvoicesTable');
    var mobileList = resultContainer.querySelector('#lookupInvoicesMobileList');
    if (!tbody && !mobileList) return;

    if (tbody) {
      tbody.innerHTML = invoices
        .map(function (invoice) {
          var customerName = invoice.ten_khach_hang || invoice.ten || 'N/A';
          var servicePackage = invoice.goi_dich_vu || invoice.dich_vu || 'N/A';
          var totalPrice = formatMoney(invoice.tong_tien || invoice.gia_tien || 0);

          var employeeCell = invoice.employee_name || '<span class="text-muted">Chưa có</span>';

          var actionButtons =
            '<button class="btn btn-sm btn-outline-danger mb-1" onclick="lookupViewInvoiceDetail(' + invoice.id + ')">' +
            '<i class="fa fa-eye"></i><span class="d-none d-md-inline ms-1"></span></button>';

          return (
            '<tr>' +
            '<td>' + customerName + '</td>' +
            '<td>' + servicePackage + '</td>' +
            '<td>' + (invoice.ngay_bat_dau || 'N/A') + '</td>' +
            '<td>' + totalPrice + '</td>' +
            '<td>' + getStatusBadge(invoice.trang_thai) + '</td>' +
            '<td>' + employeeCell + '</td>' +
            '<td>' + actionButtons + '</td>' +
            '</tr>'
          );
        })
        .join('');
    }

    if (mobileList) {
      mobileList.innerHTML = invoices
      .map(function (invoice) {
        var customerName = invoice.ten_khach_hang || invoice.ten || 'N/A';
        var servicePackage = invoice.goi_dich_vu || invoice.dich_vu || 'N/A';
        var totalPrice = formatMoney(invoice.tong_tien || invoice.gia_tien || 0);
        var employeeName = invoice.employee_name || 'Chưa có';

        return (
          '<div class="card mb-2">' +
          '  <div class="card-body">' +
          '    <div class="lookup-mobile-row"><span class="lookup-mobile-label">Khách hàng</span><span class="lookup-mobile-value fw-semibold">' + customerName + '</span></div>' +
          '    <div class="lookup-mobile-row"><span class="lookup-mobile-label">Gói dịch vụ</span><span class="lookup-mobile-value">' + servicePackage + '</span></div>' +
          '    <div class="lookup-mobile-row"><span class="lookup-mobile-label">Ngày bắt đầu</span><span class="lookup-mobile-value">' + (invoice.ngay_bat_dau || 'N/A') + '</span></div>' +
          '    <div class="lookup-mobile-row"><span class="lookup-mobile-label">Tổng tiền</span><span class="lookup-mobile-value fw-semibold text-danger-emphasis">' + totalPrice + '</span></div>' +
          '    <div class="lookup-mobile-row"><span class="lookup-mobile-label">Trạng thái</span><span class="lookup-mobile-value">' + getStatusBadge(invoice.trang_thai) + '</span></div>' +
          '    <div class="lookup-mobile-row"><span class="lookup-mobile-label">Nhân viên</span><span class="lookup-mobile-value">' + employeeName + '</span></div>' +
          '    <div class="lookup-mobile-actions mt-2">' +
          '      <button class="btn btn-sm btn-outline-danger" onclick="lookupViewInvoiceDetail(' + invoice.id + ')"><i class="fa fa-eye me-1"></i>Chi tiết</button>' +
          '    </div>' +
          '  </div>' +
          '</div>'
        );
      })
      .join('');
    }
  }

  window.lookupViewInvoiceDetail = async function (invoiceId) {
    var content = document.getElementById('lookupInvoiceDetailContent');
    if (!content) return;

    var localInvoice = getLookupInvoice(invoiceId);
    var detailUrl = apiUrl('get_invoice_detail.php') + '?hoa_don_id=' + invoiceId;
    if (localInvoice && localInvoice.dien_thoai) {
      detailUrl += '&dien_thoai=' + encodeURIComponent(localInvoice.dien_thoai);
    }

    try {
      var response = await fetch(detailUrl);
      var data = await response.json();

      if (data.success) {
        var serverInvoice = data.invoice || {};
        var mergedInvoice = localInvoice ? Object.assign({}, localInvoice, serverInvoice) : serverInvoice;
        var serverEmployee = data.nhan_vien || null;
        var fallbackEmployee = localInvoice && localInvoice.employee_name
          ? {
            id: localInvoice.nhan_vien_id,
            ten: localInvoice.employee_name,
            dien_thoai: localInvoice.employee_phone,
            email: localInvoice.employee_email,
            danh_gia: localInvoice.employee_rating,
            kinh_nghiem: localInvoice.employee_kinh_nghiem,
            anh_dai_dien: localInvoice.employee_avatar
          }
          : null;
        var mergedEmployee = serverEmployee || fallbackEmployee;
        var resolvedMedia = Array.isArray(data.media) && data.media.length > 0
          ? data.media
          : ((localInvoice && localInvoice.media) || []);

        renderInvoiceDetailContent(content, mergedInvoice, mergedEmployee, resolvedMedia);
      } else {
        if (localInvoice) {
          var localEmployee = localInvoice.employee_name
            ? {
              id: localInvoice.nhan_vien_id,
              ten: localInvoice.employee_name,
              dien_thoai: localInvoice.employee_phone,
              email: localInvoice.employee_email,
              danh_gia: localInvoice.employee_rating,
              kinh_nghiem: localInvoice.employee_kinh_nghiem,
              anh_dai_dien: localInvoice.employee_avatar
            }
            : null;
          renderInvoiceDetailContent(content, localInvoice, localEmployee, localInvoice.media || []);
        } else {
          content.innerHTML = '<div class="alert alert-warning mb-0">' + (data.message || 'Không thể tải chi tiết hóa đơn') + '</div>';
        }
      }

      openChildModal('lookupInvoiceDetailModal', true);
    } catch (error) {
      if (localInvoice) {
        var localEmployee2 = localInvoice.employee_name
          ? {
            id: localInvoice.nhan_vien_id,
            ten: localInvoice.employee_name,
            dien_thoai: localInvoice.employee_phone,
            email: localInvoice.employee_email,
            danh_gia: localInvoice.employee_rating,
            kinh_nghiem: localInvoice.employee_kinh_nghiem,
            anh_dai_dien: localInvoice.employee_avatar
          }
          : null;
        renderInvoiceDetailContent(content, localInvoice, localEmployee2, localInvoice.media || []);
      } else {
        content.innerHTML = '<div class="alert alert-danger mb-0">Không thể tải chi tiết hóa đơn. Vui lòng thử lại.</div>';
      }
      openChildModal('lookupInvoiceDetailModal', true);
    }
  };

  window.lookupViewEmployeeDetail = async function (employeeId, invoiceId) {
    var content = document.getElementById('lookupEmployeeDetailContent');
    if (!content) return;

    try {
      var response = await fetch(apiUrl('get_employee_detail.php') + '?id=' + employeeId + '&hoa_don_id=' + invoiceId);
      var data = await response.json();

      if (!data.success) {
        var localInvoice = getLookupInvoice(invoiceId);
        if (localInvoice && localInvoice.nhan_vien_id && Number(localInvoice.nhan_vien_id) === Number(employeeId)) {
          var localEmployee = {
            ten: localInvoice.employee_name,
            dien_thoai: localInvoice.employee_phone
          };

          var employeeMedia = (localInvoice.media || []).filter(function (m) {
            return Number(m.nguoi_dung_id || 0) === Number(employeeId);
          });

          renderEmployeeDetailContent(content, localEmployee, employeeMedia);
        } else {
          content.innerHTML = '<div class="alert alert-warning mb-0">' + (data.message || 'Không thể tải thông tin nhân viên') + '</div>';
        }

        openChildModal('lookupEmployeeDetailModal', true);
        return;
      }

      renderEmployeeDetailContent(content, data.nhan_vien || {}, data.media || []);

      openChildModal('lookupEmployeeDetailModal', true);
    } catch (error) {
      content.innerHTML = '<div class="alert alert-danger mb-0">Không thể tải thông tin nhân viên. Vui lòng thử lại.</div>';
      openChildModal('lookupEmployeeDetailModal', true);
    }
  };

  window.initLookupModal = function (scope) {
    ensureLookupModalStyles();

    var root = scope || document;
    var form = root.querySelector('#lookupForm');
    var resultContainer = root.querySelector('#resultContainer');
    if (!form || !resultContainer || form.dataset.bound === '1') return;

    bindChildModalReturn();
    form.dataset.bound = '1';

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var phone = (root.querySelector('#phone').value || '').trim();
      resultContainer.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-danger"></div></div>';

      try {
        var response = await fetch(apiUrl('get_invoice_by_phone.php') + '?dien_thoai=' + encodeURIComponent(phone));
        var data = await response.json();

        if (data.success && data.invoices && data.invoices.length > 0) {
          rememberLookupInvoices(data.invoices);
          renderInvoicesTable(resultContainer, data.invoices);
        } else {
          rememberLookupInvoices([]);
          resultContainer.innerHTML =
            '<div class="alert alert-warning mb-0"><i class="bi bi-exclamation-triangle me-2"></i>' +
            (data.message || 'Không tìm thấy hóa đơn với số điện thoại này.') +
            '</div>';
        }
      } catch (error) {
        rememberLookupInvoices([]);
        resultContainer.innerHTML =
          '<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-circle me-2"></i>Lỗi kết nối hoặc xử lý dữ liệu. Vui lòng thử lại.</div>';
      }
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    ensureLookupModalStyles();
    window.initLookupModal(document);

    var path = window.location.pathname.toLowerCase();
    var isLookupPage = path.endsWith('/khach_hang/lookup.html') || path.endsWith('khach_hang/lookup.html') || path.endsWith('/lookup.html') || path.endsWith('lookup.html');
    if (!isLookupPage || typeof bootstrap === 'undefined') return;

    var lookupModalEl = document.getElementById('lookupModal');
    if (!lookupModalEl) return;

    bootstrap.Modal.getOrCreateInstance(lookupModalEl).show();
  });
})();
