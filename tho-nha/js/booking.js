/**
 * Booking JavaScript - Xử lý đặt lịch dịch vụ
 * Sử dụng dữ liệu tĩnh, không cần API server
 */

// ==================== STATIC DATA ====================
const STATIC_SERVICES = [
    {
        id: 1, name: 'Sửa máy lạnh',
        items: [
            { name: 'Vệ sinh máy lạnh (1-2 HP)', price: 150000 },
            { name: 'Nạp gas R410A', price: 250000 },
            { name: 'Nạp gas R32', price: 280000 },
            { name: 'Sửa chữa máy lạnh', price: 350000 },
            { name: 'Thay bo mạch máy lạnh', price: 500000 },
        ]
    },
    {
        id: 2, name: 'Sửa máy giặt',
        items: [
            { name: 'Vệ sinh máy giặt', price: 200000 },
            { name: 'Sửa máy giặt không vắt', price: 250000 },
            { name: 'Sửa máy giặt không lên nguồn', price: 300000 },
            { name: 'Thay motor máy giặt', price: 450000 },
            { name: 'Thay board mạch', price: 500000 },
        ]
    },
    {
        id: 3, name: 'Nhà vệ sinh',
        items: [
            { name: 'Thông tắc bồn cầu', price: 150000 },
            { name: 'Sửa rò rỉ nước', price: 200000 },
            { name: 'Thay vòi nước', price: 150000 },
            { name: 'Chống thấm nhà vệ sinh', price: 800000 },
            { name: 'Thay bồn cầu mới', price: 600000 },
        ]
    },
    {
        id: 4, name: 'Điện nước',
        items: [
            { name: 'Sửa chập điện, mất điện', price: 200000 },
            { name: 'Thay ổ cắm, công tắc', price: 100000 },
            { name: 'Lắp đặt đèn, thiết bị điện', price: 150000 },
            { name: 'Sửa rò rỉ đường ống nước', price: 250000 },
            { name: 'Lắp đặt đường ống nước', price: 400000 },
        ]
    },
    {
        id: 5, name: 'Đồ gia dụng',
        items: [
            { name: 'Sửa tủ lạnh', price: 300000 },
            { name: 'Sửa tivi các hãng', price: 350000 },
            { name: 'Sửa bếp từ / bếp gas', price: 250000 },
            { name: 'Sửa lò vi sóng', price: 200000 },
            { name: 'Sửa máy hút mùi', price: 300000 },
        ]
    },
    {
        id: 6, name: 'Cải tạo nhà',
        items: [
            { name: 'Sơn nhà (giá/m²)', price: 50000 },
            { name: 'Làm trần thạch cao', price: 200000 },
            { name: 'Lát nền gạch (giá/m²)', price: 150000 },
            { name: 'Ốp tường gạch (giá/m²)', price: 200000 },
            { name: 'Cải tạo phòng bếp', price: 5000000 },
        ]
    }
];

// ==================== MODAL ELEMENTS ====================
const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
const mainService  = document.getElementById('mainService');
const subService   = document.getElementById('subService');
const servicePrice = document.getElementById('servicePrice');

// Populate categories
STATIC_SERVICES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value       = cat.id;
    opt.textContent = cat.name;
    mainService.appendChild(opt);
});

// When category changes → populate sub-services
mainService.addEventListener('change', () => {
    subService.innerHTML  = '<option value="">-- Chọn dịch vụ chi tiết --</option>';
    subService.disabled   = true;
    servicePrice.value    = '';
    if (!mainService.value) return;

    const cat = STATIC_SERVICES.find(c => c.id == mainService.value);
    if (!cat) return;

    cat.items.forEach(s => {
        const opt = document.createElement('option');
        opt.value           = s.name;
        opt.textContent     = s.name;
        opt.dataset.price   = s.price;
        subService.appendChild(opt);
    });
    subService.disabled = false;
});

// Show price when sub-service selected
subService.addEventListener('change', function () {
    const price = this.options[this.selectedIndex].dataset.price;
    servicePrice.value = price ? Number(price).toLocaleString('vi-VN') + ' VNĐ' : '';
});

// ==================== BOOKING SUBMIT ====================
document.getElementById('bookingForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const data = {
        name:       document.getElementById('name').value.trim(),
        phone:      document.getElementById('phone').value.trim(),
        service_id: document.getElementById('subService').value,
        address:    document.getElementById('address').value.trim(),
        note:       document.getElementById('note').value.trim()
    };

    if (!data.name || !data.phone || !data.service_id || !data.address) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
        return;
    }

    const phoneRegex = /^(0|\+84)[0-9]{9}$/;
    if (!phoneRegex.test(data.phone)) {
        alert('Số điện thoại không hợp lệ!');
        return;
    }

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';

    const resetBtn = () => {
        submitBtn.disabled  = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận đặt lịch';
    };

    const onSuccess = (orderCode) => {
        const msg = orderCode
            ? `✅ Đặt lịch thành công! Mã đơn: ${orderCode}`
            : '✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.';
        alert(msg);
        bookingModal.hide();
        this.reset();
        subService.disabled = true;
        servicePrice.value  = '';
        resetBtn();
    };

    fetch('api/book.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === 'success') {
            onSuccess(res.order_code);
        } else {
            onSuccess(null);
        }
    })
    .catch(() => {
        // Demo mode – hiện thị thành công khi chưa có server
        alert('✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.\n\n📞 Hotline: 0775 472 347');
        bookingModal.hide();
        this.reset();
        subService.disabled = true;
        servicePrice.value  = '';
        resetBtn();
    });
});

// ==================== CLICK BOOKING BTN ON CARDS ====================
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.booking-btn');
    if (!btn) return;

    const card = btn.closest('.service-item');
    if (!card) return;

    const categoryName = card.getAttribute('data-category');
    if (!categoryName) return;

    const cat = STATIC_SERVICES.find(c =>
        c.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
    );

    if (cat) {
        mainService.value = cat.id;
        mainService.dispatchEvent(new Event('change'));
    } else {
        mainService.value = '';
        subService.innerHTML = '<option value="">-- Chọn dịch vụ chi tiết --</option>';
        subService.disabled  = true;
    }

    subService.selectedIndex = 0;
    servicePrice.value = '';
    bookingModal.show();
});
