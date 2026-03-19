// ===== PROVIDERS PAGE =====
// Loaded dynamically via eval() in admin-main.js

(function() {

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

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initProviders() {
    setupFilterButtons();
    loadProviders();
}

function setupFilterButtons() {
    document.querySelectorAll('.provider-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.provider-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatusFilter = btn.dataset.status;
            renderProviders();
        });
    });
}

// ── LOAD ──────────────────────────────────────────────────────────────────────
function loadProviders() {
    Promise.all([
        fetch('../../api/admin/providers/manage.php?action=list').then(r => r.json()),
        fetch('../../api/admin/providers/manage.php?action=counts').then(r => r.json())
    ]).then(([listRes, cntRes]) => {
        if (listRes.status === 'success') {
            providersData = listRes.data;
        }
        if (cntRes.status === 'success') {
            const c = cntRes.data;
            const el = (id) => document.getElementById(id);
            if (el('cnt-pending'))  el('cnt-pending').textContent  = c.pending;
            if (el('cnt-active'))   el('cnt-active').textContent   = c.active;
            if (el('cnt-rejected')) el('cnt-rejected').textContent = c.rejected;
            if (el('cnt-blocked'))  el('cnt-blocked').textContent  = c.blocked;
            // Update sidebar badge
            const sbBadge = document.getElementById('providerBadge');
            if (sbBadge) {
                sbBadge.textContent = c.pending;
                if (c.pending > 0) sbBadge.classList.remove('hide');
                else sbBadge.classList.add('hide');
            }
        }
        renderProviders();
    }).catch(() => {
        document.getElementById('providersBody').innerHTML =
            '<tr><td colspan="6" class="text-center text-danger py-4">Không tải được dữ liệu</td></tr>';
    });
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderProviders() {
    const filtered = currentStatusFilter
        ? providersData.filter(p => p.status === currentStatusFilter)
        : providersData;

    const tbody = document.getElementById('providersBody');
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Không có nhà cung cấp nào</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const sc = STATUS_CONFIG[p.status] || { label: p.status, style: '' };
        const actions = buildActions(p);
        return `<tr>
            <td>
                <div style="font-weight:600;">${p.full_name}</div>
                <div style="font-size:0.8rem;color:#64748b;">${p.email}</div>
            </td>
            <td style="font-size:0.88rem;">${p.phone || '—'}</td>
            <td style="font-size:0.88rem;">${p.company_name || '—'}</td>
            <td style="font-size:0.82rem;color:#64748b;">${fmtDate(p.created_at)}</td>
            <td><span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:50px;font-size:0.75rem;font-weight:600;${sc.style}">${sc.label}</span></td>
            <td style="white-space:nowrap;">${actions}</td>
        </tr>`;
    }).join('');
}

function buildActions(p) {
    const id = p.id;
    let btns = `<button class="btn btn-sm btn-outline-secondary me-1 py-0 px-2" onclick="providerDetail(${id})" title="Chi tiết"><i class="fas fa-eye"></i></button>`;

    if (p.status === 'pending') {
        btns += `<button class="btn btn-sm btn-success me-1 py-0 px-2" onclick="doApprove(${id})" title="Duyệt"><i class="fas fa-check"></i></button>`;
        btns += `<button class="btn btn-sm btn-danger py-0 px-2" onclick="doReject(${id})" title="Từ chối"><i class="fas fa-times"></i></button>`;
    } else if (p.status === 'active') {
        btns += `<button class="btn btn-sm btn-warning py-0 px-2" onclick="doBlock(${id})" title="Khóa"><i class="fas fa-lock"></i></button>`;
    } else if (p.status === 'blocked') {
        btns += `<button class="btn btn-sm btn-success py-0 px-2" onclick="doUnblock(${id})" title="Mở khóa"><i class="fas fa-lock-open"></i></button>`;
    } else if (p.status === 'rejected') {
        btns += `<button class="btn btn-sm btn-success py-0 px-2" onclick="doApprove(${id})" title="Duyệt lại"><i class="fas fa-check"></i></button>`;
    }
    return btns;
}

// ── DETAIL ────────────────────────────────────────────────────────────────────
function providerDetail(id) {
    const p = providersData.find(x => x.id == id);
    if (!p) return;
    const sc = STATUS_CONFIG[p.status] || { label: p.status, style: '' };

    document.getElementById('providerModalTitle').textContent = p.full_name;
    document.getElementById('providerModalBody').innerHTML = `
        <dl class="row mb-0" style="font-size:0.9rem;">
            <dt class="col-4 text-muted">Họ tên</dt><dd class="col-8 fw-semibold">${p.full_name}</dd>
            <dt class="col-4 text-muted">Email</dt><dd class="col-8">${p.email}</dd>
            <dt class="col-4 text-muted">Điện thoại</dt><dd class="col-8">${p.phone || '—'}</dd>
            <dt class="col-4 text-muted">Công ty</dt><dd class="col-8">${p.company_name || '—'}</dd>
            <dt class="col-4 text-muted">Địa chỉ</dt><dd class="col-8">${p.address || '—'}</dd>
            <dt class="col-4 text-muted">Mô tả</dt><dd class="col-8">${p.description || '—'}</dd>
            <dt class="col-4 text-muted">Ngày đăng ký</dt><dd class="col-8">${fmtDate(p.created_at)}</dd>
            <dt class="col-4 text-muted">Trạng thái</dt><dd class="col-8"><span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:50px;font-size:0.78rem;font-weight:600;${sc.style}">${sc.label}</span></dd>
            ${p.rejection_reason ? `<dt class="col-4 text-muted">Lý do</dt><dd class="col-8 text-danger">${p.rejection_reason}</dd>` : ''}
        </dl>
    `;
    document.getElementById('providerModalFooter').innerHTML = buildActions(p) + ' <button class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>';
    new bootstrap.Modal(document.getElementById('providerActionModal')).show();
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────
function doApprove(id) {
    if (!confirm('Duyệt tài khoản nhà cung cấp này?')) return;
    callAction(id, 'approve', null);
}

function doReject(id) {
    openReasonModal('Lý do từ chối', 'reject', id);
}

function doBlock(id) {
    openReasonModal('Lý do khóa tài khoản', 'block', id);
}

function doUnblock(id) {
    if (!confirm('Mở khóa tài khoản này?')) return;
    callAction(id, 'unblock', null);
}

function openReasonModal(title, action, id) {
    pendingAction = action;
    pendingProviderId = id;
    document.getElementById('reasonModalTitle').textContent = title;
    document.getElementById('reasonInput').value = '';
    document.getElementById('reasonAlert').innerHTML = '';
    document.getElementById('confirmReasonBtn').onclick = submitReason;
    // Close provider detail modal if open
    const detModal = bootstrap.Modal.getInstance(document.getElementById('providerActionModal'));
    if (detModal) detModal.hide();
    new bootstrap.Modal(document.getElementById('reasonModal')).show();
}

function submitReason() {
    const reason = document.getElementById('reasonInput').value.trim();
    if (!reason) {
        document.getElementById('reasonAlert').innerHTML = '<div class="alert alert-warning py-1 mb-2">Vui lòng nhập lý do</div>';
        return;
    }
    bootstrap.Modal.getInstance(document.getElementById('reasonModal')).hide();
    callAction(pendingProviderId, pendingAction, reason);
}

function callAction(id, action, reason) {
    const body = { provider_id: id };
    if (reason) body.reason = reason;

    fetch(`../../api/admin/providers/manage.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            loadProviders();
            // Show toast via shared utility if available
            if (typeof toast === 'function') toast(res.message || 'Thành công!');
        } else {
            alert(res.message || 'Có lỗi xảy ra');
        }
    })
    .catch(() => alert('Lỗi kết nối'));
}

// ── EXPOSE GLOBALS (needed by eval + inline onclick) ──────────────────────────
window.initProviders  = initProviders;
window.providerDetail = providerDetail;
window.doApprove      = doApprove;
window.doReject       = doReject;
window.doBlock        = doBlock;
window.doUnblock      = doUnblock;

})();
