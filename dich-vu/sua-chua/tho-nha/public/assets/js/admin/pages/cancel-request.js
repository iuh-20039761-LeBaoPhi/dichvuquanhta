function _tnToast(msg, type) {
    if (typeof type === 'undefined') type = 'success';
    var d = document.createElement('div');
    d.className = 'alert alert-' + type + ' shadow-lg position-fixed top-0 start-50 translate-middle-x mt-4';
    d.style.cssText = 'z-index:99999;border-radius:30px;padding:12px 30px;min-width:280px;max-width:90vw;text-align:center;animation:fadeInDown .3s ease;';
    var icon = type === 'success' ? 'fa-check-circle' : (type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle');
    d.innerHTML = '<i class="fas ' + icon + ' me-2"></i>' + msg;
    document.body.appendChild(d);
    setTimeout(function() { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(function() { d.remove(); }, 500); }, 3500);
}
window.initCancelRequests = function() {
    if (window.cancelRequestsInitialized) return;
    window.cancelRequestsInitialized = true;

    loadAllCancelRequests().then(requests => {
        const tbody = document.getElementById('cancelRequestsTableBody');
        if (tbody) {
            displayCancelRequests(requests);
            setupCancelRequestsEvents();
        }
    });
};

function displayCancelRequests(requests) {
    const tbody = document.getElementById('cancelRequestsTableBody');
    
    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không có yêu cầu hủy nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = requests.map(req => {
        const statusClass = req.cancel_status === 'approved' ? 'bg-success' : 
                           req.cancel_status === 'rejected' ? 'bg-danger' : 'bg-warning';
        const statusText = req.cancel_status === 'approved' ? 'Đã duyệt' : 
                          req.cancel_status === 'rejected' ? 'Đã từ chối' : 'Chờ xử lý';
        
        return `
            <tr>
                <td><strong>${req.order_code}</strong></td>
                <td>${req.customer_name}</td>
                <td>${req.phone}</td>
                <td>${req.cancel_reason}</td>
                <td>${formatDateTime(req.cancel_requested_at)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    ${req.cancel_status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveCancelRequest(${req.id})">
                            <i class="fas fa-check"></i> Duyệt
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectCancelRequest(${req.id})">
                            <i class="fas fa-times"></i> Từ chối
                        </button>
                    ` : '<span class="text-muted">Đã xử lý</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

function setupCancelRequestsEvents() {
    document.getElementById('refreshCancelBtn').addEventListener('click', function() {
        loadAllCancelRequests().then(requests => displayCancelRequests(requests));
    });
}

window.approveCancelRequest = function(requestId) {
    if (!confirm('Xác nhận duyệt yêu cầu hủy đơn?')) return;
    
    fetch('../../api/admin/orders/process-cancel.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, action: 'approve' })
    })
    .then(res => res.json())
    .then(res => {
        _tnToast(res.message, res.status === 'success' ? 'success' : 'danger');
        if (res.status === 'success') {
            loadAllCancelRequests().then(requests => displayCancelRequests(requests));
            loadAllOrders();
        }
    })
    .catch(err => {
        console.error('Error:', err);
        _tnToast('Lỗi kết nối server', 'danger');
    });
}

window.rejectCancelRequest = function(requestId) {
    if (!confirm('Xác nhận từ chối yêu cầu hủy đơn?')) return;
    
    fetch('../../api/admin/orders/process-cancel.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, action: 'reject' })
    })
    .then(res => res.json())
    .then(res => {
        _tnToast(res.message, res.status === 'success' ? 'success' : 'danger');
        if (res.status === 'success') {
            loadAllCancelRequests().then(requests => displayCancelRequests(requests));
        }
    })
    .catch(err => {
        console.error('Error:', err);
        _tnToast('Lỗi kết nối server', 'danger');
    });
}