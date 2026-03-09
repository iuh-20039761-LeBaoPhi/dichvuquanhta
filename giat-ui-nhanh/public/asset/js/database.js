const orderAPI = "http://localhost/Giat-Ui-Nhanh/public/orders";
const loginAPI = "http://localhost/Giat-Ui-Nhanh/public/logins";
const serviceAPI = "http://localhost/Giat-Ui-Nhanh/public/services";
const statisticAPI = "http://localhost/Giat-Ui-Nhanh/public/statistics";
const searchOrderAPI = "http://localhost/Giat-Ui-Nhanh/public/search_orders";

const toastEl = document.getElementById("successToast");

const toast = new bootstrap.Toast(toastEl);

function chooseComboAPI() {
  const form = document.querySelector(".contactFormCombo");
  const modalEl = document.getElementById("myModal");

  if (!form || form.length === 0) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    const modal = bootstrap.Modal.getInstance(modalEl);

    fetch(orderAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then(() => {
        modal.hide();
        // reset form
        form.reset();
        // hiện toast
        toast.show();
      })
      .catch((err) => {
        console.error("Lỗi gửi dữ liệu:", err);
      });
  });
}
chooseComboAPI();

function bookAServiceAPI() {
  const contactForm = document.querySelector(".contactForm");

  if (!contactForm || contactForm.length === 0) return;

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    fetch(orderAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then(() => {
        // reset contactForm
        this.reset();
        // show toast
        toast.show();
      })
      .catch((err) => {
        console.error("Lỗi gửi dữ liệu:", err);
      });
  });
}
bookAServiceAPI();

function loginAPIHandler() {
  const loginForm = document.getElementById("loginForm");
  const alertBox = document.getElementById("loginAlert");
  if (!loginForm) return;

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    fetch(loginAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => {
        return res.json().then((result) => {
          if (!res.ok) {
            throw result;
          }
          return result;
        });
      })
      .then((result) => {
        // ✅ login đúng
        loginForm.reset();
        window.location.href = "?ctrl=page&act=dashboard";
      })
      .catch((err) => {
        console.log(err); // debug

        alertBox.className = "alert alert-danger alert-dismissible fade show";

        alertBox.innerHTML = `
      ${err.error}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

        alertBox.classList.remove("d-none");
      });
  });
}
loginAPIHandler();

function updateOrdersAPI() {
  const orderForm = document.getElementById("orderForm");
  const modalEl = document.getElementById("myModal");

  if (!orderForm) return;

  orderForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    const id = data.order_id;
    delete data.order_id;

    const modal = bootstrap.Modal.getInstance(modalEl);

    fetch(`${orderAPI}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) =>
        res.json().then((result) => {
          if (!res.ok) {
            throw new Error(result.error);
          }
          return result;
        }),
      )
      .then((result) => {
        modal.hide();

        orderForm.reset();

        const TOAST_DELAY = 2500;

        showToast(result.message, "success");

        setTimeout(() => {
          window.location.replace(window.location.href);
        }, TOAST_DELAY);
      })
      .catch((err) => {
        showToast(err.message, "danger");

        console.error(err);
      });
  });
}
updateOrdersAPI();

function cancelOrdersAPI() {
  const cancelBtns = document.querySelectorAll(".cancel-order-btn");

  if (!cancelBtns.length) return;

  cancelBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const orderId = this.dataset.id;
      const orderStatus = this.dataset.orderStatus;
      const transactionStatus = this.dataset.transactionStatus;

      if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
        return;
      }

      const data = {
        order_status: orderStatus,
        transaction_status: transactionStatus,
      };

      fetch(`${orderAPI}/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((res) => {
          return res.json().then((result) => {
            if (!res.ok) {
              throw new Error(result.error);
            }
            return result;
          });
        })
        .then(function (result) {
          showToast(result.message || "Hủy đơn thành công!", "success");

          setTimeout(function () {
            location.reload();
          }, 2500);
        })
        .catch((err) => {
          showToast(err.message, "danger");
          console.error(err);
        });
    });
  });
}
cancelOrdersAPI();

function addServicesAPI() {
  const addServiceForm = document.getElementById("addServiceForm");
  const modalEl = document.getElementById("addRowModal");

  if (!addServiceForm) return;

  addServiceForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    const modal = bootstrap.Modal.getInstance(modalEl);

    fetch(serviceAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) =>
        res.json().then((result) => {
          if (!res.ok) {
            throw new Error(result.message);
          }
          return result;
        }),
      )
      .then((result) => {
        modal.hide();

        addServiceForm.reset();

        const TOAST_DELAY = 2500;

        showToast(result.message, "success");

        setTimeout(() => {
          window.location.replace(window.location.href);
        }, TOAST_DELAY);
      })
      .catch((err) => {
        showToast(err.message || "Có lỗi xảy ra!", "danger");

        console.error(err);
      });
  });
}
addServicesAPI();

function updateServicesAPI() {
  const serviceForm = document.getElementById("serviceForm");
  const modalEl = document.getElementById("myModal");

  if (!serviceForm) return;

  serviceForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    const id = data.service_id;
    delete data.service_id;

    const modal = bootstrap.Modal.getInstance(modalEl);

    fetch(`${serviceAPI}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) =>
        res.json().then((result) => {
          if (!res.ok) {
            throw new Error(result.error);
          }
          return result;
        }),
      )
      .then((result) => {
        modal.hide();

        serviceForm.reset();

        const TOAST_DELAY = 2500;

        showToast(result.message, "success");

        setTimeout(() => {
          window.location.replace(window.location.href);
        }, TOAST_DELAY);
      })
      .catch((err) => {
        showToast(err.message, "danger");

        console.error(err);
      });
  });
}
updateServicesAPI();

function showToast(message, type = "success") {
  $.notify(
    {
      icon: "fa fa-bell",
      message: message,
    },
    {
      type: type,
      placement: {
        from: "top",
        align: "right",
      },
      delay: 2500,
      z_index: 9999,

      offset: 20,
      spacing: 10,

      animate: {
        enter: "animate__animated animate__fadeInDown",
        exit: "animate__animated animate__fadeOutUp",
      },
    },
  );
}

function loadRevenueTable() {
  const monthInput = document.getElementById("monthPicker");
  if (!monthInput) return;

  monthInput.addEventListener("change", function () {
    const value = monthInput.value; // YYYY-MM

    if (!value) {
      alert("Vui lòng chọn tháng");
      return;
    }

    const year = value.substring(0, 4);
    const month = value.substring(5, 7);

    console.log(year, month);
    const data = {
      year: year,
      month: month,
    };
    fetch(statisticAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((res) => {
        const rows = res.data;

        let html = "";
        let i = 1;
        let totalRevenue = 0;

        if (!rows || rows.length === 0) {
          html = `<tr><td colspan="4" class="text-center">Không có dữ liệu</td></tr>`;
        } else {
          rows.forEach((row) => {
            totalRevenue += Number(row.revenue);
            html += `
        <tr>
          <td>${i++}</td>
          <td>${row.service_name}</td>
          <td>${row.total_orders}</td>
          <td>${Number(row.revenue).toLocaleString()}</td>
        </tr>
      `;
          });

          html += `
      <tr class="fw-bold table-secondary">
        <td colspan="3">Tổng doanh thu</td>
        <td>${totalRevenue.toLocaleString()}</td>
      </tr>
    `;
        }

        document.getElementById("revenueTable").innerHTML = html;
      });
  });
}
loadRevenueTable();

function searchOrder() {
  const searchInput = document.getElementById("searchOrder");
  if (!searchInput) return;

  let timeout = null;

  searchInput.addEventListener("input", function () {
    const value = searchInput.value.trim();

    clearTimeout(timeout);

    if (!value) {
      document.getElementById("searchTable").innerHTML = `
        <tr>
          <td colspan="9" class="text-center">Nhập số điện thoại để tìm kiếm</td>
        </tr>`;
      return;
    }

    timeout = setTimeout(() => {
      fetch(searchOrderAPI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customer_tel: value }),
      })
        .then((res) => res.json())
        .then((res) => {
          const rows = res.data;
          let html = "";
          let i = 1;

          if (!rows || rows.length === 0) {
            html = `
              <tr>
                <td colspan="9" class="text-center">Không có dữ liệu</td>
              </tr>`;
          } else {
            rows.forEach((row) => {
              let statusText = "";

              switch (row.order_status) {
                case "Pending":
                  statusText = "Chờ xác nhận";
                  break;
                case "Processing":
                  statusText = "Đã xác nhận";
                  break;
                case "Completed":
                  statusText = "Đã hoàn thành";
                  break;
                case "Cancel":
                  statusText = "Hủy";
                  break;
                default:
                  statusText = row.order_status;
              }

              let statusClass = "";

              switch (row.order_status) {
                case "Pending":
                  statusClass = "badge bg-primary";
                  break;
                case "Processing":
                  statusClass = "badge bg-info";
                  break;
                case "Completed":
                  statusClass = "badge bg-success";
                  break;
                case "Cancel":
                  statusClass = "badge bg-danger";
                  break;
                default:
                  statusClass = "badge bg-secondary";
              }

              let statusBtnClass = "";

              if (row.order_status !== "Pending") {
                statusBtnClass = "disabled";
              }

              html += `
                <tr>
                  <td>${i++}</td>
                  <td>${row.customer_name}</td>
                  <td>${row.customer_tel}</td>
                  <td>${row.customer_address}</td>
                  <td>${row.service_name}</td>
                  <td>${Number(row.total_price).toLocaleString()}</td>
                  <td><span style="font-size: 15px;" class = "${statusClass}">${statusText}</span></td>
                  <td>${new Date(row.created_at).toLocaleDateString()}</td>
                  <td>
                    <button type="button" class="btn btn-danger btn-sm ${statusBtnClass} cancel-order" data-id="${row.id}" data-order-status="${row.order_status}" data-transaction-status="${row.transaction_status}">
                      Hủy đơn
                    </button>
                  </td>
                </tr>`;
            });
          }

          document.getElementById("searchTable").innerHTML = html;
          customerCancelOrdersAPI();
        });
    }, 500);
  });
}
searchOrder();

function customerCancelOrdersAPI() {
  const cancelBtns = document.querySelectorAll(".cancel-order");
  const toastEl = document.getElementById("successCancelOrderToast");
  const modalEl = document.getElementById("searchModal");
  const toast = new bootstrap.Toast(toastEl);

  if (!cancelBtns.length) return;

  cancelBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();

      const orderId = this.dataset.id;
      const transactionStatus = this.dataset.transactionStatus;

      if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
        return;
      }

      const modal = bootstrap.Modal.getInstance(modalEl);

      const data = {
        order_status: "Cancel",
        transaction_status: transactionStatus,
      };

      fetch(`${orderAPI}/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then(() => {
          modal.hide();

          document.getElementById("searchOrder").value = "";

          document.getElementById("searchTable").innerHTML = `
            <tr>
              <td colspan="9" class="text-center">
                Nhập số điện thoại để tìm kiếm
              </td>
            </tr>
          `;

          toast.show();
        })
        .catch((err) => {
          console.error("Lỗi gửi dữ liệu:", err);
        });
    });
  });
}
