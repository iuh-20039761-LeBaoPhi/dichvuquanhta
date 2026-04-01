// ===== PROVIDERS PAGE =====
// Loaded dynamically via eval() in admin-main.js

(function() {

const PROVIDER_TABLE = 'nhacungcap_thonha';
const KRUD_SCRIPT_URL = 'https://api.dvqt.vn/js/krud.js';

let providersData = [];
let currentStatusFilter = '';
let pendingAction = null;
let pendingProviderId = null;
let krudScriptPromise = null;

const STATUS_CONFIG = {
    pending:  { label: 'Chờ duyệt',         cls: 'status-badge',  style: 'background:#fef3c7;color:#d97706;' },
    active:   { label: 'Đang hoạt động',     cls: 'status-badge',  style: 'background:#dcfce7;color:#15803d;' },
    rejected: { label: 'Đã từ chối',         cls: 'status-badge',  style: 'background:#fee2e2;color:#dc2626;' },
    blocked:  { label: 'Đã khóa',            cls: 'status-badge',  style: 'background:#f1f5f9;color:#64748b;' },
};

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function normalizeStatus(status) {
    return normalizeProviderStatus(status);
}

function mapProviderRow(row) {
    const raw = row || {};
    return {
        id: raw.id ?? raw.provider_id ?? raw.ma_nha_cung_cap,
        full_name: raw.hovaten || raw.ho_ten || raw.full_name || raw.name || 'Không rõ',
        email: raw.email || '',
        phone: raw.sodienthoai || raw.so_dien_thoai || raw.phone || '',
        company_name: raw.tencua_hang || raw.ten_cua_hang || raw.company_name || raw.company || '',
        address: raw.diachi || raw.dia_chi || raw.address || '',
        description: raw.motadichvu || raw.mo_ta_dich_vu || raw.description || '',
        created_at: raw.ngaytao || raw.created_at || raw.created_date || '',
        status: normalizeStatus(raw.trangthai || raw.trang_thai || raw.status),
        rejection_reason: raw.rejection_reason || raw.lydotuchoi || raw.ly_do_tu_choi || raw.lydokhoa || raw.ly_do_khoa || '',
        _raw: raw
    };
}

function isKrudSuccess(res) {
    return !!res && !res.error && res.success !== false;
}

function ensureKrudClient() {
    return ensureAdminKrudClient();
}

function updateCounters() {
    const counts = { pending: 0, active: 0, rejected: 0, blocked: 0 };

    providersData.forEach((p) => {
        const status = normalizeStatus(p.status);
        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status] += 1;
        }
    });

    const el = (id) => document.getElementById(id);
    if (el('cnt-pending'))  el('cnt-pending').textContent = counts.pending;
    if (el('cnt-active'))   el('cnt-active').textContent = counts.active;
    if (el('cnt-rejected')) el('cnt-rejected').textContent = counts.rejected;
    if (el('cnt-blocked'))  el('cnt-blocked').textContent = counts.blocked;

    const sbBadge = document.getElementById('providerBadge');
    if (sbBadge) {
        sbBadge.textContent = counts.pending;
        if (counts.pending > 0) sbBadge.classList.remove('hide');
        else sbBadge.classList.add('hide');
    }
}

function actionToStatus(action) {
    if (action === 'approve' || action === 'unblock') return 'active';
    if (action === 'reject') return 'rejected';
    if (action === 'block') return 'blocked';
    return null;
}

function detectReasonField(rawRow) {
    const candidates = [
        'lydotuchoi',
        'ly_do_tu_choi',
        'rejection_reason',
        'lydokhoa',
        'ly_do_khoa',
        'ghichu',
        'ghi_chu',
        'note'
    ];

    for (const key of candidates) {
        if (Object.prototype.hasOwnProperty.call(rawRow || {}, key)) {
            return key;
        }
    }
    return '';
}

function actionSuccessText(action) {
    if (action === 'approve') return 'Đã duyệt tài khoản nhà cung cấp';
    if (action === 'reject') return 'Đã từ chối tài khoản nhà cung cấp';
    if (action === 'block') return 'Đã khóa tài khoản nhà cung cấp';
    if (action === 'unblock') return 'Đã mở khóa tài khoản nhà cung cấp';
    return 'Thao tác thành công';
}

function encodeOnclickId(id) {
    return String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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
async function loadProviders() {
    const tbody = document.getElementById('providersBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-success"></div></td></tr>';
    }

    try {
        await ensureAdminKrudClient();
        const rows = normalizeProviderRows(await window.krudList({ table: PROVIDER_TABLE }));
        providersData = rows.map(mapProviderRow).filter((item) => item.id !== undefined && item.id !== null && String(item.id).trim() !== '');
        updateCounters();
        renderProviders();
    } catch (err) {
        document.getElementById('providersBody').innerHTML =
            '<tr><td colspan="6" class="text-center text-danger py-4">Không tải được dữ liệu nhà cung cấp</td></tr>';
        if (typeof toast === 'function') {
            toast(err && err.message ? err.message : 'Không tải được dữ liệu nhà cung cấp');
        }
    }
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderProviders() {
    const filtered = currentStatusFilter
        ? providersData.filter(p => normalizeStatus(p.status) === currentStatusFilter)
        : providersData;

    const tbody = document.getElementById('providersBody');
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Không có nhà cung cấp nào</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const safeStatus = normalizeStatus(p.status);
        const sc = STATUS_CONFIG[safeStatus] || { label: safeStatus, style: '' };
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
    const id = encodeOnclickId(p.id);
    const safeStatus = normalizeStatus(p.status);
    let btns = `<button class="btn btn-sm btn-outline-secondary me-1 py-0 px-2" onclick="providerDetail('${id}')" title="Chi tiết"><i class="fas fa-eye"></i></button>`;

    if (safeStatus === 'pending') {
        btns += `<button class="btn btn-sm btn-success me-1 py-0 px-2" onclick="doApprove('${id}')" title="Duyệt"><i class="fas fa-check"></i></button>`;
        btns += `<button class="btn btn-sm btn-danger py-0 px-2" onclick="doReject('${id}')" title="Từ chối"><i class="fas fa-times"></i></button>`;
    } else if (safeStatus === 'active') {
        btns += `<button class="btn btn-sm btn-warning py-0 px-2" onclick="doBlock('${id}')" title="Khóa"><i class="fas fa-lock"></i></button>`;
    } else if (safeStatus === 'blocked') {
        btns += `<button class="btn btn-sm btn-success py-0 px-2" onclick="doUnblock('${id}')" title="Mở khóa"><i class="fas fa-lock-open"></i></button>`;
    } else if (safeStatus === 'rejected') {
        btns += `<button class="btn btn-sm btn-success py-0 px-2" onclick="doApprove('${id}')" title="Duyệt lại"><i class="fas fa-check"></i></button>`;
    }
    return btns;
}

// ── DETAIL ────────────────────────────────────────────────────────────────────
function providerDetail(id) {
    const p = providersData.find(x => String(x.id) === String(id));
    if (!p) return;
    const safeStatus = normalizeStatus(p.status);
    const sc = STATUS_CONFIG[safeStatus] || { label: safeStatus, style: '' };

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

async function callAction(id, action, reason) {
    const provider = providersData.find((item) => String(item.id) === String(id));
    if (!provider) {
        alert('Không tìm thấy nhà cung cấp cần cập nhật');
        return;
    }

    const nextStatus = actionToStatus(action);
    if (!nextStatus) {
        alert('Thao tác không hợp lệ');
        return;
    }

    try {
        await ensureKrudClient();

        const updateData = { trangthai: nextStatus };
        const reasonField = detectReasonField(provider._raw);
        if (reasonField) {
            if ((action === 'reject' || action === 'block') && reason) {
                updateData[reasonField] = reason;
            }
            if (action === 'approve' || action === 'unblock') {
                updateData[reasonField] = '';
            }
        }

        const res = await window.krud('update', PROVIDER_TABLE, updateData, provider.id);
        if (!isKrudSuccess(res)) {
            throw new Error(res && (res.message || res.error) ? (res.message || res.error) : 'Cập nhật trạng thái thất bại');
        }

        await loadProviders();
        if (typeof toast === 'function') {
            toast(actionSuccessText(action));
        }
    } catch (err) {
        alert(err && err.message ? err.message : 'Lỗi kết nối');
    }
}

// ── EXPOSE GLOBALS (needed by eval + inline onclick) ──────────────────────────
window.initProviders  = initProviders;
window.providerDetail = providerDetail;
window.doApprove      = doApprove;
window.doReject       = doReject;
window.doBlock        = doBlock;
window.doUnblock      = doUnblock;

})();
