const services = {
    "may-lanh": {
        title: "Dịch vụ sửa máy lạnh",
        items: [
            { name: "Vệ sinh máy lạnh", price: "150.000đ" },
            { name: "Nạp gas R32", price: "350.000đ" },
            { name: "Sửa máy lạnh không lạnh", price: "Liên hệ" },
            { name: "Thay tụ máy lạnh", price: "450.000đ" }
        ]
    }
};

const params = new URLSearchParams(window.location.search);
const category = params.get("category");

if (services[category]) {
    document.getElementById("serviceTitle").innerText =
        services[category].title;

    const container = document.getElementById("subServiceList");

    services[category].items.forEach(s => {
        container.innerHTML += `
        <div class="col-md-6">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5>${s.name}</h5>
                    <p class="text-muted">Giá: ${s.price}</p>
                    <button class="btn btn-gradient booking-btn w-100"
                        data-service="${s.name}">
                        Đặt lịch ngay
                    </button>
                </div>
            </div>
        </div>`;
    });
}
