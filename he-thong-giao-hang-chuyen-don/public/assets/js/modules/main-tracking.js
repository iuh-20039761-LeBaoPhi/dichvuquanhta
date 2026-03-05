(function (window, document) {
  if (window.__fastGoTrackingInitDone) return;
  window.__fastGoTrackingInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;

  let currentCancelCode = "";

  function saveToHistory(code) {
    let history = JSON.parse(localStorage.getItem("trackingHistory")) || [];
    if (!history.includes(code)) {
      history.push(code);
      if (history.length > 5) history.shift();
      localStorage.setItem("trackingHistory", JSON.stringify(history));
    }
  }

  function submitCancelOrder(code, reason) {
    const btn = document.getElementById("confirm-cancel-btn");
    if (btn) {
      btn.innerText = "Đang xử lý...";
      btn.disabled = true;
    }

    const formData = new FormData();
    formData.append("code", code);
    formData.append("reason", reason);

    fetch(core.toApiUrl("cancel_order_ajax.php"), {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          alert("Đã hủy đơn hàng thành công!");
          location.reload();
        } else {
          alert("Lỗi: " + data.message);
          if (btn) {
            btn.innerText = "Xác nhận hủy đơn";
            btn.disabled = false;
          }
        }
        window.closeCancelModal();
      })
      .catch((err) => {
        console.error(err);
        alert("Lỗi kết nối server.");
        if (btn) {
          btn.innerText = "Xác nhận hủy đơn";
          btn.disabled = false;
        }
      });
  }

  function parseJsonSafe(response) {
    return response.text().then((text) => {
      try {
        return { data: JSON.parse(text), rawText: text };
      } catch (err) {
        const preview = (text || "").trim().slice(0, 180);
        throw new Error(
          `Phản hồi không hợp lệ từ server (HTTP ${response.status}). ${preview}`,
        );
      }
    });
  }

  window.trackOrder = function (event, type) {
    event.preventDefault();

    const spinner = document.getElementById(`loading-spinner-${type}`);
    const resultDiv = document.getElementById(`result-${type}`);
    let code = "";

    if (type === "standard") {
      code = document.getElementById("standard-code").value.trim().toUpperCase();
    } else if (type === "bulk") {
      code = document.getElementById("bulk-code").value.trim().toUpperCase();
    } else if (type === "cod") {
      code = document.getElementById("cod-code").value.trim().toUpperCase();
    }

    if (!code) {
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div style="background-color: #f8e8e8; border-left: 4px solid #d9534f; padding: 20px; border-radius: 8px; margin-top: 15px;">
            <p style="color: #d9534f;"><strong>❌ Lỗi:</strong> Vui lòng nhập mã đơn hàng!</p>
          </div>`;
      }
      return;
    }

    if (!spinner || !resultDiv) {
      console.error("Không tìm thấy phần tử hiển thị kết quả (spinner/resultDiv)");
      return;
    }

    spinner.style.display = "block";
    resultDiv.innerHTML = "";

    const formData = new FormData();
    formData.append("code", code);
    formData.append("search_type", type);

    fetch(core.toApiUrl("tracking_ajax.php"), {
      method: "POST",
      body: formData,
    })
      .then((response) => parseJsonSafe(response))
      .then(({ data }) => {
        spinner.style.display = "none";

        if (data.status === "success") {
          const order = data.data;
          let cancelBtn = "";
          if (order.status_raw === "pending") {
            cancelBtn = `<button onclick="openCancelModal('${order.order_code}')" style="margin-top:15px; background:#d9534f; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">Hủy đơn hàng này</button>`;
          }

          let timelineHtml = '<div class="tracking-timeline">';
          if (order.timeline && order.timeline.length > 0) {
            order.timeline.forEach((item) => {
              timelineHtml += `
                <div class="timeline-item">
                  <div class="timeline-icon">${item.icon}</div>
                  <div class="timeline-content">
                    <div class="timeline-time">${item.time}</div>
                    <div class="timeline-text">${item.text}</div>
                  </div>
                </div>
              `;
            });
          }
          timelineHtml += "</div>";

          resultDiv.innerHTML = `
            <div style="background-color: #e8f4f8; border-left: 4px solid ${order.color}; padding: 20px; border-radius: 8px; margin-top: 15px; text-align: left;">
              <p><strong>Mã đơn:</strong> ${order.order_code}</p>
              <p><strong>Loại hàng:</strong> ${order.type}</p>
              <p style="font-size: 18px; color: ${order.color}; margin-top: 12px;">
                <strong>${order.icon} Trạng thái: ${order.status_text}</strong>
              </p>
              ${timelineHtml}
              ${cancelBtn}
            </div>
          `;

          saveToHistory(code);
        } else {
          resultDiv.innerHTML = `
            <div style="background-color: #f8e8e8; border-left: 4px solid #d9534f; padding: 20px; border-radius: 8px; margin-top: 15px; text-align: left;">
              <p style="color: #d9534f;"><strong>❌ Lỗi:</strong> ${data.message}</p>
              <p style="color: #999; font-size: 14px; margin-top: 8px;">Vui lòng kiểm tra lại mã đơn hàng (VD: FAST-XXXXXX).</p>
            </div>
          `;
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        spinner.style.display = "none";
        resultDiv.innerHTML = `
          <div style="background-color: #f8e8e8; border-left: 4px solid #d9534f; padding: 20px; border-radius: 8px; margin-top: 15px; text-align: left;">
            <p style="color: #d9534f;"><strong>❌ Lỗi kết nối:</strong> ${error.message}</p>
          </div>
        `;
      });
  };

  window.openCancelModal = function (code) {
    currentCancelCode = code;
    const modal = document.getElementById("cancel-modal");
    if (modal) {
      modal.style.display = "block";
      document.getElementById("cancel-reason").value = "";
      document.getElementById("other-reason-input").style.display = "none";
    } else {
      const reason = prompt(
        "Vui lòng nhập lý do hủy đơn hàng " + code + ":",
        "Thay đổi kế hoạch",
      );
      if (reason !== null) {
        submitCancelOrder(code, reason);
      }
    }
  };

  window.closeCancelModal = function () {
    const modal = document.getElementById("cancel-modal");
    if (modal) modal.style.display = "none";
  };

  window.handleReasonChange = function (select) {
    const otherInput = document.getElementById("other-reason-input");
    if (select.value === "other") {
      otherInput.style.display = "block";
      otherInput.focus();
    } else {
      otherInput.style.display = "none";
    }
  };

  window.confirmCancelOrder = function () {
    const select = document.getElementById("cancel-reason");
    let reason = select.value;

    if (reason === "other") {
      const otherVal = document.getElementById("other-reason-input").value.trim();
      if (!otherVal) {
        alert("Vui lòng nhập lý do cụ thể.");
        return;
      }
      reason = otherVal;
    }

    if (!reason) {
      alert("Vui lòng chọn lý do hủy đơn.");
      return;
    }

    submitCancelOrder(currentCancelCode, reason);
  };

  window.cancelOrder = window.openCancelModal;

  window.addEventListener("click", function (event) {
    const modal = document.getElementById("cancel-modal");
    if (event.target == modal) {
      window.closeCancelModal();
    }
  });
})(window, document);
