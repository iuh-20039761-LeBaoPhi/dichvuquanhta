document.addEventListener("DOMContentLoaded", function () {
  fetch("public/component/booking_modal.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("modalContainer").innerHTML = data;

      initBookingModal();
    });
});

function initBookingModal() {
  // ===== ELEMENT =====
  const serviceSelect = document.getElementById("serviceSelect");
  const subServiceSelect = document.getElementById("subServiceSelect");
  const brandSelect = document.getElementById("brandSelect");
  const itemSelect = document.getElementById("itemSelect");

  const priceInput = document.getElementById("price-contact");
  const transportInput = document.getElementById("transport-fee");
  const surveyInput = document.getElementById("survey-fee");
  const totalInput = document.getElementById("total-price");

  const locateBtn = document.getElementById("locateBtn");
  const addressInput = document.getElementById("addressInput");

  let servicesData = [];

  // ===== PHÍ =====
  const minTransport = 40000;
  const maxTransport = 60000;
  const surveyFee = 30000;

  // ===== INIT HIỂN THỊ =====
  if (transportInput) {
    transportInput.value =
      minTransport.toLocaleString("vi-VN") +
      " - " +
      maxTransport.toLocaleString("vi-VN");
  }

  if (surveyInput) {
    surveyInput.value = surveyFee.toLocaleString("vi-VN");
  }

  // ===== LOAD DATA =====
  fetch("public/services.json")
    .then((res) => res.json())
    .then((data) => {
      servicesData = data.services || [];

      if (!serviceSelect) return;

      servicesData.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.id;
        option.textContent = service.name;
        serviceSelect.appendChild(option);
      });
    })
    .catch((err) => console.error("Lỗi load JSON:", err));

  // ===== SERVICE =====
  if (serviceSelect) {
    serviceSelect.addEventListener("change", function () {
      resetSelect(subServiceSelect, "Chọn dịch vụ");
      resetSelect(brandSelect, "Chọn hãng");
      resetSelect(itemSelect, "Chọn phụ tùng / sửa chữa");

      clearPrice();

      const service = servicesData.find((s) => s.id == this.value);
      if (!service) return;

      service.sub_services.forEach((sub) => {
        const option = document.createElement("option");
        option.value = sub.id;
        option.textContent = sub.name;
        subServiceSelect.appendChild(option);
      });
    });
  }

  // ===== SUB =====
  if (subServiceSelect) {
    subServiceSelect.addEventListener("change", function () {
      resetSelect(brandSelect, "Chọn hãng");
      resetSelect(itemSelect, "Chọn phụ tùng / sửa chữa");

      clearPrice();

      const service = servicesData.find((s) => s.id == serviceSelect.value);
      const sub = service?.sub_services.find((s) => s.id == this.value);

      if (!sub) return;

      const brands = sub.vehicles?.[0]?.brands || [];

      brands.forEach((brand) => {
        const option = document.createElement("option");
        option.value = brand.name;
        option.textContent = brand.name;
        brandSelect.appendChild(option);
      });
    });
  }

  // ===== BRAND =====
  if (brandSelect) {
    brandSelect.addEventListener("change", function () {
      resetSelect(itemSelect, "Chọn phụ tùng / sửa chữa");

      clearPrice();

      const service = servicesData.find((s) => s.id == serviceSelect.value);
      const sub = service?.sub_services.find(
        (s) => s.id == subServiceSelect.value,
      );

      if (!sub) return;

      const brand = sub.vehicles?.[0]?.brands.find(
        (b) => b.name === this.value,
      );

      if (!brand) return;

      brand.items.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent =
          item.name + " (" + item.price.toLocaleString("vi-VN") + "đ)";
        option.dataset.price = item.price;
        itemSelect.appendChild(option);
      });
    });
  }

  // ===== ITEM =====
  if (itemSelect) {
    itemSelect.addEventListener("change", function () {
      const option = this.options[this.selectedIndex];

      if (!option || !option.value) {
        clearPrice();
        return;
      }

      const price = Number(option.dataset.price || 0);

      const totalMin = price + minTransport + surveyFee;
      const totalMax = price + maxTransport + surveyFee;

      if (priceInput) {
        priceInput.value = price.toLocaleString("vi-VN");
      }

      if (totalInput) {
        totalInput.value =
          totalMin.toLocaleString("vi-VN") +
          " - " +
          totalMax.toLocaleString("vi-VN");
      }
    });
  }

  // ===== LOCATION =====
  if (locateBtn && addressInput) {
    locateBtn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ định vị");
        return;
      }

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
            .catch((e) => console.error("Lỗi API:", e));
        },
        function (err) {
          alert("Không thể lấy vị trí: " + err.message);
        },
      );
    });
  }

  // ===== HELPER =====
  function resetSelect(select, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
  }

  function clearPrice() {
    if (priceInput) priceInput.value = "";
    if (totalInput) totalInput.value = "";
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

// document.addEventListener("DOMContentLoaded", function () {
//   const locateBtn = document.getElementById("locateBtn");
//   const addressInput = document.getElementById("addressInput");
//   if (locateBtn) {
//     locateBtn.addEventListener("click", function () {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           function (position) {
//             const lat = position.coords.latitude;
//             const lng = position.coords.longitude;
//             // use Nominatim reverse geocoding
//             fetch(
//               `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
//             )
//               .then((res) => res.json())
//               .then((data) => {
//                 if (data && data.display_name) {
//                   addressInput.value = data.display_name;
//                 } else {
//                   alert("Không thể xác định địa chỉ");
//                 }
//               })
//               .catch((e) => console.error(e));
//           },
//           function (err) {
//             alert("Không thể lấy vị trí: " + err.message);
//           },
//         );
//       } else {
//         alert("Trình duyệt không hỗ trợ định vị");
//       }
//     });
//   }
// });
