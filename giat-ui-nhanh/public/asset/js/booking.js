document.addEventListener("DOMContentLoaded", function () {
  fetch("public/component/booking_modal.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("modalContainer").innerHTML = data;

      initBookingModal();
    });
});
function initBookingModal() {
  const serviceSelect = document.getElementById("serviceContact");
  const subServiceSelect = document.getElementById("subService");

  const kgBox = document.getElementById("kgBox");
  const pairBox = document.getElementById("pairBox");

  const kgInput = document.getElementById("kg");
  const pairInput = document.getElementById("pair");

  const priceInput = document.getElementById("priceContact");
  const shipInput = document.getElementById("ship");
  const totalInput = document.getElementById("total");

  // ❗ nếu chưa load xong modal thì thoát
  if (!serviceSelect) return;

  const transportFee = 20000;
  shipInput.value = transportFee.toLocaleString("vi-VN");

  let services = [];

  /* LOAD JSON */
  fetch("public/services.json")
    .then((res) => res.json())
    .then((data) => {
      services = data.filter((s) => s.price_unit !== "combo");

      services.forEach((service) => {
        const option = document.createElement("option");

        option.value = service.id;
        option.textContent = service.service_name;
        option.dataset.unit = service.price_unit;

        serviceSelect.appendChild(option);
      });
    });

  /* CHỌN SERVICE */
  serviceSelect.addEventListener("change", function () {
    const serviceId = Number(this.value);

    if (!serviceId) {
      subServiceSelect.innerHTML =
        '<option value="">Chọn loại dịch vụ</option>';

      kgInput.value = "";
      pairInput.value = "";

      kgBox.style.display = "block";
      pairBox.style.display = "none";

      priceInput.value = "";
      totalInput.value = "";
      return;
    }

    subServiceSelect.innerHTML = '<option value="">Chọn loại dịch vụ</option>';

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    service.sub_services.forEach((sub) => {
      const option = document.createElement("option");

      option.value = sub.id;
      option.textContent = sub.name;
      option.dataset.price = sub.price;

      subServiceSelect.appendChild(option);
    });

    const unit = service.price_unit;

    kgInput.value = 1;
    pairInput.value = 1;

    kgBox.style.display = "none";
    pairBox.style.display = "none";

    if (unit === "kg") kgBox.style.display = "block";
    if (unit === "pair") pairBox.style.display = "block";

    calculate();
  });

  /* CHỌN SUB SERVICE */
  subServiceSelect.addEventListener("change", function () {
    const option = this.options[this.selectedIndex];

    if (!option.value) {
      priceInput.value = "";
      totalInput.value = "";
      return;
    }

    const price = Number(option.dataset.price);
    priceInput.value = price.toLocaleString("vi-VN");

    calculate();
  });

  /* TÍNH TIỀN */
  function calculate() {
    const subOption = subServiceSelect.options[subServiceSelect.selectedIndex];

    if (!subOption.dataset.price) return;

    const price = Number(subOption.dataset.price);

    let quantity = 1;

    if (kgBox.style.display === "block") quantity = Number(kgInput.value);
    if (pairBox.style.display === "block") quantity = Number(pairInput.value);

    const total = price * quantity + transportFee;
    totalInput.value = total.toLocaleString("vi-VN");
  }

  kgInput.addEventListener("input", calculate);
  pairInput.addEventListener("input", calculate);

  const locateBtn = document.getElementById("locateBtn");
  const addressInput = document.getElementById("addressInput");

  if (locateBtn && !locateBtn.dataset.loaded) {
    locateBtn.dataset.loaded = "true";

    locateBtn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ định vị");
        return;
      }

      locateBtn.disabled = true;
      locateBtn.innerHTML = "Đang lấy vị trí...";

      navigator.geolocation.getCurrentPosition(
        function (position) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          )
            .then((res) => res.json())
            .then((data) => {
              if (data && data.display_name) {
                addressInput.value = data.display_name;
              } else {
                alert("Không thể xác định địa chỉ");
              }
            })
            .catch(() => {
              alert("Lỗi khi lấy địa chỉ");
            })
            .finally(() => {
              locateBtn.disabled = false;
              locateBtn.innerHTML =
                '<i class="fas fa-location-arrow"></i> Vị trí hiện tại';
            });
        },
        function (err) {
          alert("Không thể lấy vị trí: " + err.message);

          locateBtn.disabled = false;
          locateBtn.innerHTML =
            '<i class="fas fa-location-arrow"></i> Vị trí hiện tại';
        },
      );
    });
  }

  const autoFillBtn = document.getElementById("autoFillBtn");
  if (autoFillBtn) {
    autoFillBtn.addEventListener("click", function () {
      const customer = this.dataset.customer;
      const phone = this.dataset.phone;
      const address = this.dataset.address;

      document.getElementById("nameCustomer").value = customer;
      document.getElementById("phoneCustomer").value = phone;
      document.getElementById("addressInput").value = address;
    });
  }
}
