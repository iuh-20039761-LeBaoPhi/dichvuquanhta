(function (window, document) {
  if (window.__fastGoPricingInitDone) return;
  window.__fastGoPricingInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;

  function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  function getServiceType() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("chuyen-nha")) return "moving_house";
    if (path.includes("chuyen-van-phong")) return "moving_office";
    if (path.includes("chuyen-kho-bai")) return "moving_warehouse";
    return null;
  }

  async function loadPricing() {
    const serviceType = getServiceType();
    if (!serviceType) return;

    const grid = document.getElementById("pricing-grid");
    const formulaContainer = document.getElementById("pricing-formula-container");
    if (!grid) return;

    try {
      const resp = await fetch("assets/js/data/pricing-reference.json");
      if (!resp.ok) throw new Error("Thất bại khi tải file JSON");
      const data = await resp.json();

      const serviceData = data.find((s) => s.id === serviceType);
      if (!serviceData) return;

      renderPricing(grid, serviceData);
      
      if (formulaContainer && serviceData.cau_hinh_tinh_gia) {
        renderFormula(formulaContainer, serviceData.cau_hinh_tinh_gia);
      }
    } catch (err) {
      console.error("Lỗi load bảng giá:", err);
    }
  }

  function renderPricing(container, data) {
    container.innerHTML = "";
    data.hang_muc_bao_gia.forEach((item) => {
      const card = document.createElement("article");
      card.className = "group flex flex-col bg-white rounded-twelve overflow-hidden border border-slate-200 soft-shadow hover:-translate-y-1 transition-all duration-300";
      
      const iconPath = item.icon_svg || "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
      const imageSrc = item.hinh_anh || "assets/images/chuyendon-tron-goi.png";

      card.innerHTML = `
        <div class="relative h-56 w-full overflow-hidden">
          <img alt="${item.ten}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${imageSrc}">
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div class="absolute bottom-4 left-4 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="${iconPath}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path>
            </svg>
          </div>
        </div>
        <div class="p-6">
          <h3 class="text-slate-900 text-xl font-bold mb-2">${item.ten}</h3>
          <p class="text-slate-600 text-sm leading-relaxed">${item.ghi_chu}</p>
          <div class="mt-4 pt-4 border-t border-slate-100">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Giá tham khảo</p>
            <p class="text-accent font-bold text-lg mt-1">
              ${item.khoang_gia}
              <span class="text-sm font-medium text-slate-500">/ ${item.don_vi}</span>
            </p>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderFormula(container, config) {
    container.innerHTML = `
      <div class="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 md:p-10 border border-primary/10 shadow-lg mb-16 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div class="relative z-10">
          <div class="text-center mb-10">
            <span class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm text-accent mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </span>
            <h3 class="text-3xl font-bold text-primary">Cơ chế tính giá minh bạch</h3>
            <p class="text-slate-600 mt-2">Biết trước chi phí, không lo phát sinh với bảng tính rõ ràng</p>
          </div>
          
          <div class="grid lg:grid-cols-2 gap-10">
            <!-- Bảng giá xe -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h4 class="font-bold text-lg text-slate-800 mb-5 flex items-center">
                <span class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3 text-sm">1</span> 
                Cước xe tải và lộ trình
              </h4>
              <div class="space-y-4">
                ${Object.values(config.loai_xe).map(xe => `
                  <div class="relative pl-4 border-l-2 border-slate-200 hover:border-accent transition-colors">
                    <div class="flex justify-between items-start">
                      <div>
                        <span class="font-bold text-slate-800 text-lg block">${xe.ten_hien_thi}</span>
                        <p class="text-sm text-slate-500 mt-1">Gói cơ bản: dưới ${xe.km_co_ban}km đầu tiên</p>
                      </div>
                      <div class="text-right">
                        <span class="font-bold text-accent text-xl">${formatCurrency(xe.gia_co_ban)}</span>
                        <p class="text-sm rounded text-primary font-medium mt-1">Phát sinh: +${formatCurrency(xe.gia_moi_km_tiep)}/km</p>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Các phụ phí -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h4 class="font-bold text-lg text-slate-800 mb-5 flex items-center">
                <span class="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center mr-3 text-sm">2</span> 
                Phụ phí theo điều kiện thực tế
              </h4>
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-100 group hover:bg-primary/5 transition-colors">
                  <span class="text-xs font-bold tracking-wider text-slate-500 uppercase block mb-1">Thể tích đồ đạc</span>
                  <p class="text-base font-bold text-slate-800">${formatCurrency(config.phu_phi.the_tich.don_gia_moi_buoc)}<span class="text-xs font-normal text-slate-500"> / m³</span></p>
                  <p class="text-[11px] text-slate-500 mt-1">Tính cho phần vượt quá ${config.phu_phi.the_tich.nguong_mien_phi}m³</p>
                </div>
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-100 group hover:bg-primary/5 transition-colors">
                  <span class="text-xs font-bold tracking-wider text-slate-500 uppercase block mb-1">Trọng lượng hàng</span>
                  <p class="text-base font-bold text-slate-800">${formatCurrency(config.phu_phi.trong_luong.don_gia_moi_buoc)}<span class="text-xs font-normal text-slate-500"> / 100kg</span></p>
                  <p class="text-[11px] text-slate-500 mt-1">Tính cho phần vượt quá ${config.phu_phi.trong_luong.nguong_mien_phi}kg</p>
                </div>
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-100 group hover:bg-primary/5 transition-colors">
                  <span class="text-xs font-bold tracking-wider text-slate-500 uppercase block mb-1">Dễ vỡ / Cồng kềnh</span>
                  <p class="text-base font-bold text-slate-800">Từ ${formatCurrency(config.phu_phi.tinh_chat_do_dac.de_vo)}</p>
                  <p class="text-[11px] text-slate-500 mt-1">Đánh giá thực tế theo từng tài sản</p>
                </div>
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-100 group hover:bg-primary/5 transition-colors">
                  <span class="text-xs font-bold tracking-wider text-slate-500 uppercase block mb-1">Phí ngoài giờ</span>
                  <p class="text-base font-bold text-slate-800">Từ ${formatCurrency(config.phu_phi.khung_gio.buoi_toi)}</p>
                  <p class="text-[11px] text-slate-500 mt-1">Buổi tối, đêm hoặc ngày Lễ Tết</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 mx-auto max-w-2xl bg-white rounded-xl p-5 border-2 border-primary border-dashed shadow-sm text-center">
            <p class="text-sm font-bold text-primary uppercase tracking-widest mb-2">Công thức tính tổng chi phí</p>
            <p class="text-slate-700 text-base md:text-lg font-medium">
              Cước cơ bản + Phí vượt km + Phụ phí khối lượng + Phụ phí điều kiện
            </p>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPricing);
  } else {
    loadPricing();
  }
})(window, document);
