/**
 * QUẢN LÝ NHÀ CUNG CẤP (ADMIN)
 * Tóm gọn quy trình duyệt, từ chối, khóa và mở khóa tài khoản thợ.
 */
(function() {
    'use strict';

    const PROVIDER_TABLE = 'nhacungcap_thonha';
    let providersData = [];
    let currentStatusFilter = '';
    let pendingAction = null;
    let pendingProviderId = null;

    const STATUS_CONFIG = {
        pending:  { label: 'Chờ duyệt',         cls: 'status-badge',  style: 'background:#fef3c7;color:#d97706;' },
        active:   { label: 'Đang hoạt động',     cls: 'status-badge',  style: 'background:#dcfce7;color:#15803d;' },
        rejected: { label: 'Đã từ chối',         cls: 'status-badge',  style: 'background:#fee2e2;color:#dc2626;' },
        blocked:  { label: 'Đã khóa',            cls: 'status-badge',  style: 'background:#f1f5f9;color:#64748b;' },
    };

    /**
     * Map dữ liệu thô sang Object chuẩn UI Admin.
     */
    function mapProviderRow(row) {
        const raw = row || {};
        const normalizeStatus = (status) => {
            const s = String(status || '').trim().toLowerCase();
            if (['pending', 'cho_duyet', 'waiting'].includes(s)) return 'pending';
            if (['active', 'hoat_dong'].includes(s)) return 'active';
            if (['rejected', 'tu_choi'].includes(s)) return 'rejected';
            if (['blocked', 'khoa'].includes(s)) return 'blocked';
            return s || 'pending';
        };

        return {
            id: raw.id,
            full_name: raw.hovaten || raw.name || 'N/A',
            email: raw.email || '',
            phone: raw.sodienthoai || raw.phone || '',
            company_name: raw.tencua_hang || raw.company || '',
            address: raw.diachi || raw.address || '',
            description: raw.motadichvu || raw.description || '',
            status: normalizeStatus(raw.trangthai || raw.status),
            rejection_reason: raw.lydotuchoi || raw.rejection_reason || '',
            avatar: raw.avatartenfile || '',
            cccd_front: raw.cccdmattruoctenfile || '',
            cccd_back: raw.cccdmatsautenfile || '',
            _raw: raw
        };
    }

    /**
     * Tải và hiển thị danh sách Nhà cung cấp.
     */
    async function loadProviders() {
        const krud = window.DVQTKrud;
        if (!krud) return;

        const tbody = document.getElementById('providersBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-success"></div></td></tr>';

        try {
            const rows = await krud.listTable(PROVIDER_TABLE);
            providersData = rows.map(mapProviderRow).filter(item => !!item.id);
            renderProviders();
            if (typeof updateProviderBadge === 'function') updateProviderBadge();
        } catch (err) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Lỗi tải dữ liệu</td></tr>';
        }
    }

    /**
     * Vẽ bảng danh sách.
     */
    function renderProviders() {
        const filtered = currentStatusFilter
            ? providersData.filter(p => p.status === currentStatusFilter)
            : providersData;

        const tbody = document.getElementById('providersBody');
        if (!tbody) return;

        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Không có dữ liệu</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const sc = STATUS_CONFIG[p.status] || { label: p.status, style: '' };
            const actions = buildActions(p);
            return `<tr>
                <td><strong>${p.full_name}</strong><br><small class="text-muted">${p.email}</small></td>
                <td>${p.phone}</td>
                <td>${p.company_name}</td>
                <td><span class="badge" style="${sc.style}">${sc.label}</span></td>
                <td>${actions}</td>
            </tr>`;
        }).join('');
    }

    function buildActions(p) {
        let btns = `<button class="btn btn-sm btn-light me-1" onclick="providerDetail('${p.id}')"><i class="fas fa-eye"></i></button>`;
        if (p.status === 'pending' || p.status === 'rejected') {
            btns += `<button class="btn btn-sm btn-success me-1" onclick="handleProviderAction('${p.id}', 'active')"><i class="fas fa-check"></i></button>`;
        }
        if (p.status === 'pending') {
            btns += `<button class="btn btn-sm btn-danger me-1" onclick="openReasonModal('${p.id}', 'rejected')"><i class="fas fa-times"></i></button>`;
        }
        if (p.status === 'active') {
            btns += `<button class="btn btn-sm btn-warning me-1" onclick="openReasonModal('${p.id}', 'blocked')"><i class="fas fa-lock"></i></button>`;
        }
        if (p.status === 'blocked') {
            btns += `<button class="btn btn-sm btn-success me-1" onclick="handleProviderAction('${p.id}', 'active')"><i class="fas fa-lock-open"></i></button>`;
        }
        return btns;
    }

    window.providerDetail = (id) => {
        const p = providersData.find(x => String(x.id) === String(id));
        if (!p) return;
        
        const modal = new bootstrap.Modal(document.getElementById('providerActionModal'));
        document.getElementById('providerModalTitle').textContent = p.full_name;
        
        // Đường dẫn tương đối từ pages/admin/ (hoặc từ root nếu load AJAX)
        const imgPath = '../../uploads/providers/';
        
        const renderImg = (fileName, style, isCircle = false) => {
            if (!fileName || fileName.trim() === '') {
                const circleStyle = isCircle ? 'border-radius:50%;' : 'border-radius:8px;';
                return `<div class="bg-light d-flex align-items-center justify-content-center text-muted border border-dashed" style="${style};${circleStyle}border-style:dashed;background-color:#f8fafc!important;color:#94a3b8!important;font-size:0.75rem;">Chưa có ảnh</div>`;
            }
            const url = imgPath + fileName;
            const circleClass = isCircle ? 'rounded-circle' : 'rounded';
            return `<a href="${url}" target="_blank" title="Xem ảnh lớn"><img src="${url}" class="img-fluid ${circleClass} shadow-sm border" style="${style};object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=&quot;small text-danger bg-light p-2&quot;>Lỗi đường dẫn</div>'"></a>`;
        };

        document.getElementById('providerModalBody').innerHTML = `
            <div class="p-2">
                <div class="row mb-4 align-items-center">
                    <div class="col-4">
                        ${renderImg(p.avatar, 'width:100px;height:100px;', true)}
                    </div>
                    <div class="col-8">
                        <h5 class="mb-1">${p.full_name}</h5>
                        <p class="text-muted mb-0 small"><i class="fas fa-store me-1"></i>${p.company_name}</p>
                        <p class="text-muted mb-0 small"><i class="fas fa-phone me-1"></i>${p.phone}</p>
                    </div>
                </div>

                <div class="detail-info-grid mb-4">
                    <span class="d-block mb-1 text-muted small text-uppercase fw-bold" style="font-size:0.7rem;letter-spacing:0.5px;">Thông tin cơ bản</span>
                    <div class="p-3 bg-light rounded border small">
                        <div class="mb-2"><strong>Địa chỉ:</strong> ${p.address}</div>
                        <div class="mb-2 text-primary"><strong>Tọa độ GPS:</strong> ${p._raw && p._raw.maplat ? `${p._raw.maplat}, ${p._raw.maplng}` : '<span class="text-muted italic">Chưa có tọa độ</span>'}</div>
                        <div class="mb-0"><strong>Mô tả dịch vụ:</strong> ${p.description}</div>
                    </div>
                </div>

                <div class="detail-images-grid">
                    <span class="d-block mb-2 text-muted small text-uppercase fw-bold" style="font-size:0.7rem;letter-spacing:0.5px;">Hình ảnh xác minh (CCCD)</span>
                    <div class="row g-2">
                        <div class="col-6">
                            <p class="small text-center mb-1 text-muted" style="font-size:0.75rem;">Mặt trước</p>
                            ${renderImg(p.cccd_front, 'height:120px;width:100%;')}
                        </div>
                        <div class="col-6">
                            <p class="small text-center mb-1 text-muted" style="font-size:0.75rem;">Mặt sau</p>
                            ${renderImg(p.cccd_back, 'height:120px;width:100%;')}
                        </div>
                    </div>
                </div>

                ${p.rejection_reason ? `<div class="mt-3 p-2 bg-danger-subtle text-danger rounded border border-danger-subtle small"><strong>Lý do từ chối/khóa:</strong> ${p.rejection_reason}</div>` : ''}
                <div class="mt-3 text-end">
                    <span class="badge" style="${STATUS_CONFIG[p.status]?.style || ''}">${STATUS_CONFIG[p.status]?.label || p.status}</span>
                </div>
            </div>
        `;
        modal.show();
    };

    window.openReasonModal = (id, action) => {
        pendingProviderId = id;
        pendingAction = action;
        const modal = new bootstrap.Modal(document.getElementById('reasonModal'));
        document.getElementById('reasonModalTitle').textContent = (action === 'rejected' ? 'Lý do từ chối' : 'Lý do khóa');
        modal.show();
    };

    window.submitReason = async () => {
        const reason = document.getElementById('reasonInput').value.trim();
        if (!reason) return alert('Vui lòng nhập lý do');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('reasonModal'));
        if (modal) modal.hide();
        
        await handleProviderAction(pendingProviderId, pendingAction, reason);
    };

    window.handleProviderAction = async (id, status, reason = '') => {
        if (!confirm('Xác nhận thực hiện thao tác này?')) return;
        
        const krud = window.DVQTKrud;
        try {
            const data = { trangthai: status };
            if (reason) data.lydotuchoi = reason;
            
            await krud.updateRow(PROVIDER_TABLE, id, data);
            await loadProviders();
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    window.initProviders = () => {
        loadProviders();
        document.querySelectorAll('.provider-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentStatusFilter = btn.dataset.status === 'all' ? '' : btn.dataset.status;
                renderProviders();
            });
        });
    };
})();
