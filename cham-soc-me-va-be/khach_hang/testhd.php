<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Danh sách hóa đơn</title>

    <!-- Alpine.js -->
    <script src="https://unpkg.com/alpinejs" defer></script>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="p-4">

<div 
    x-data="{ invoices: [] }"
    x-init="
        fetch('http://localhost:8080/dichvuquanhta/cham-soc-me-va-be/api/test.php')
        .then(r => r.json())
        .then(d => invoices = d.invoices)
    "
>

    <h3 class="mb-3">Danh sách hóa đơn</h3>

    <table class="table table-bordered">
        <thead>
            <tr>
                <th>Khách</th>
                <th>Dịch vụ</th>
                <th>Ngày</th>
                <th>Tiền</th>
            </tr>
        </thead>

        <tbody>
            <!-- giống foreach PHP -->
            <template x-for="i in invoices" :key="i.id">
                <tr>
                    <td x-text="i.ten_khach_hang"></td>
                    <td x-text="i.goi_dich_vu"></td>
                    <td x-text="i.ngay_bat_dau"></td>
                    <td x-text="(i.gia_tien || 0).toLocaleString() + ' VNĐ'"></td>
                </tr>
            </template>
        </tbody>
    </table>

</div>

</body>
</html>