/**
 * booking-detail.js
 * Entry layer for booking interactions (card brand selection, booking button delegation, startup hooks).
 * Shared, modal, and standalone implementations are split into separate files.
 */

'use strict';

// ===================================================================
// CARD BRAND SELECTION — service-detail.php (page-level, không phải trong modal)
// ===================================================================
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.brand-option');
    // Chỉ xử lý brand option TRÊN CARD (không phải trong modal)
    if (!btn || btn.closest('#bookingModal')) return;
    const card = btn.closest('.service-item-card');
    if (!card) return;

    card.querySelectorAll('.brand-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const price   = parseInt(btn.dataset.price);
    const matCost = parseInt(btn.dataset.materialCost) || 0;
    let travelFee = null, surveyFee = null;
    try { travelFee = btn.dataset.travelFee ? JSON.parse(btn.dataset.travelFee) : null; } catch (_) {}
    try { surveyFee = btn.dataset.surveyFee ? JSON.parse(btn.dataset.surveyFee) : null; } catch (_) {}

    const fmtN = n => parseInt(n).toLocaleString('vi-VN');

    const totalEl = card.querySelector('.sic-total-price');
    if (totalEl) totalEl.textContent = price > 0 ? fmtN(price) + 'đ' : 'Giá thỏa thuận';

    const matEl = card.querySelector('.sic-bd-material');
    if (matEl && matCost) matEl.innerHTML = `<i class="fas fa-box"></i> Vật liệu: ${fmtN(matCost)}đ`;

    // Rebuild fee breakdown trong card
    const feeDiv = card.querySelector('.sic-fee-breakdown');
    if (feeDiv) {
        const isPerKm  = travelFee && travelFee.mode === 'per_km';
        const survey   = (surveyFee && surveyFee.required) ? (surveyFee.amount || 0) : 0;
        const hasFees  = isPerKm || (travelFee && (travelFee.min > 0 || travelFee.max > 0 || travelFee.fixedAmount > 0)) || survey > 0;
        if (hasFees) {
            let travelRow = '';
            if (isPerKm) {
                travelRow = `<div style="display:flex;justify-content:space-between;color:#64748b;margin-bottom:3px;"><span><i class="fas fa-motorcycle me-1"></i>Phí di chuyển</span><span style="font-size:0.82rem;color:#94a3b8;">theo km (tính khi đặt)</span></div>`;
            } else if (travelFee) {
                const tMin = travelFee.min ?? travelFee.fixedAmount ?? 0;
                const tMax = travelFee.max ?? travelFee.fixedAmount ?? 0;
                if (tMax > 0) travelRow = `<div style="display:flex;justify-content:space-between;color:#64748b;margin-bottom:3px;"><span><i class="fas fa-motorcycle me-1"></i>Phí di chuyển</span><span>${tMin === tMax ? fmtN(tMin)+'đ' : fmtN(tMin)+'đ – '+fmtN(tMax)+'đ'}</span></div>`;
            }
            const surveyRow = survey > 0
                ? `<div style="display:flex;justify-content:space-between;color:#b45309;margin-bottom:3px;"><span><i class="fas fa-clipboard-check me-1"></i>Phí khảo sát</span><span>${fmtN(survey)}đ</span></div>` : '';
            const totalText = isPerKm
                ? (price > 0 ? `${fmtN(price)}đ <span style="color:#94a3b8;font-size:0.82rem;">+ phí di chuyển</span>` : `Giá thỏa thuận <span style="color:#94a3b8;font-size:0.82rem;">(+ phí di chuyển)</span>`)
                : (price + (travelFee?.min ?? travelFee?.fixedAmount ?? 0) > 0 ? fmtN(price + (travelFee?.min ?? travelFee?.fixedAmount ?? 0)) + 'đ' : 'Giá thỏa thuận');
            feeDiv.innerHTML = travelRow + surveyRow
                + `<div style="display:flex;justify-content:space-between;font-weight:600;color:var(--primary);border-top:1px dashed rgba(17,153,142,0.3);margin-top:5px;padding-top:5px;"><span>Tổng tạm tính:</span><span>${totalText}</span></div>`;
        }
    }

    // Cập nhật data-service-price trên nút đặt lịch
    const bookBtn = card.querySelector('.booking-btn');
    if (bookBtn) bookBtn.dataset.servicePrice = price;
});

// ===================================================================
// CLICK DELEGATION — lazy-load + mở modal
// ===================================================================
document.addEventListener('click', async function (e) {
    // Standalone dat-lich page uses inline form; do not run modal delegation here.
    if (document.body.classList.contains('dat-lich-standalone')) return;

    // Nút "Đặt lịch" trên từng card dịch vụ
    const bookBtn = e.target.closest('.booking-btn');
    if (bookBtn) {
        e.preventDefault();
        const card = bookBtn.closest('.service-item-card');
        // Không có .service-item-card (vd: trang dich-vu.html) → nav mode
        if (!card) {
            await _bdOpenModal('nav', null);
            return;
        }
        // service-detail.php: có price + travelFee → detail mode
        const activeBrand = card.querySelector('.brand-option.active');
        const svcName     = bookBtn.getAttribute('data-service-name') || '';
        const displayName = activeBrand ? `${svcName} (${activeBrand.dataset.brand})` : svcName;
        let travelFee = null, surveyFee = null;
        try { travelFee = bookBtn.dataset.travelFee ? JSON.parse(bookBtn.dataset.travelFee) : null; } catch (_) {}
        try { surveyFee = bookBtn.dataset.surveyFee ? JSON.parse(bookBtn.dataset.surveyFee) : null; } catch (_) {}
        await _bdOpenModal('detail', {
            name:      displayName,
            price:     bookBtn.getAttribute('data-service-price'),
            serviceId: bookBtn.getAttribute('data-service-id'),
            catId:     bookBtn.getAttribute('data-cat-id'),
            travelFee, surveyFee
        });
        return;
    }

    // Nút "Đặt Lịch" trên navbar → NAV MODE (chỉ intercept khi modal chưa tồn tại)
    const navBtn = e.target.closest('[data-bs-target="#bookingModal"]');
    if (navBtn && !document.getElementById('bookingModal')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        await _bdOpenModal('nav', null);
    }
});

// ===================================================================
// scrollToServices — dùng cho onclick="scrollToServices()" trong PHP
// ===================================================================
function scrollToServices() {
    const first = document.querySelector('.service-item-card');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ===================================================================
// AUTO-DETECT và KHỞI CHẠY
// ===================================================================
if (document.body.classList.contains('dat-lich-standalone')) {
    // Standalone mode: form đã có trong trang
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bdInitStandalone);
    } else {
        _bdInitStandalone();
    }
}
// Modal mode: không preload, chờ click
