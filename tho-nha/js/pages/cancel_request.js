// Cancel Requests Page Script

loadAllCancelRequests().then(requests => {
    displayCancelRequests(requests);
    setupCancelRequestsEvents();
});

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
    
    fetch('api/admin/process_cancel_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, action: 'approve' })
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        if (res.status === 'success') {
            loadAllCancelRequests().then(requests => displayCancelRequests(requests));
            loadAllOrders();
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Lỗi kết nối server');
    });
}

window.rejectCancelRequest = function(requestId) {
    if (!confirm('Xác nhận từ chối yêu cầu hủy đơn?')) return;
    
    fetch('api/admin/process_cancel_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, action: 'reject' })
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        if (res.status === 'success') {
            loadAllCancelRequests().then(requests => displayCancelRequests(requests));
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Lỗi kết nối server');
    });
}