<?php
$pageTitle = "Chi tiết đơn hàng lau dọn vệ sinh";
include 'layout-header.php';
?>
<style>
	/* Ẩn topbar và điều chỉnh layout khi được nhúng vào trong shell header-shared (SPA) */
	.nv-admin-shell .topbar {
		display: none !important;
	}

	.nv-admin-shell .page {
		padding: 0;
		min-height: auto;
		display: block;
	}

	.nv-admin-shell .modal-card {
		width: 100%;
		border-radius: 0;
		box-shadow: none;
		border: 0;
		transform: none !important;
		animation: none !important;
		opacity: 1 !important;
	}

	/* Custom Dialog Styles */
	#appDialogOverlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		backdrop-filter: blur(4px);
		padding: 20px;
	}

	#appDialogBox {
		background: white;
		border-radius: 12px;
		padding: 24px;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
		animation: dialogShow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes dialogShow {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
		}

		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	#appDialogTitle {
		font-size: 18px;
		font-weight: 800;
		margin-bottom: 12px;
		color: #1158c2;
	}

	#appDialogMessage {
		font-size: 14px;
		margin-bottom: 24px;
		color: #4a5568;
		line-height: 1.6;
		font-weight: 500;
	}

	.appDialogButtons {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.appDialogBtn {
		padding: 10px 20px;
		border-radius: 8px;
		border: none;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 13px;
	}

	.appDialogBtnPrimary {
		background: linear-gradient(135deg, #2e7d32, var(--primary));
		color: white;
		box-shadow: 0 4px 12px rgba(26, 77, 46, 0.25);
	}

	.appDialogBtnPrimary:hover {
		filter: brightness(1.05);
		transform: translateY(-1px);
	}

	.appDialogBtnSecondary {
		background: #f7fafc;
		color: #4a5568;
		border: 1px solid #e2e8f0;
	}

	.appDialogBtnSecondary:hover {
		background: #edf2f7;
	}
</style>
<style>
	:root {
		/* ── Palette xanh vườn nhà ── */
		--bg: #f4fff6;
		--surface: #ffffff;
		--surface-soft: #f0fff4;
		--text: #1b3a1f;
		--muted: #4a7c59;
		--primary: #1a4d2e;
		--primary-dark: #0e2b1a;
		--success: #2e7d32;
		--warning: #f9a825;
		--danger: #c62828;
		--border: #c8e6c9;
		--shadow: 0 12px 26px rgba(26, 77, 46, 0.10), 0 2px 8px rgba(100, 180, 120, 0.08);
		--radius-xl: 24px;
		--radius-lg: 18px;
		--radius-md: 12px;
		--anim: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	* {
		box-sizing: border-box;
		font-family: 'Be Vietnam Pro', -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, oxygen, ubuntu, cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
	}

	html,
	body {
		margin: 0;
		padding: 0;
		min-height: 100%;
		color: var(--text);
		background:
			radial-gradient(circle at 20% -10%, #c8e6c9 0, transparent 42%),
			radial-gradient(circle at 95% 120%, #e8f3d6 0, transparent 38%),
			radial-gradient(circle at 85% 15%, #f8fcf8 0, transparent 35%),
			radial-gradient(circle at 8% 88%, #ffffff 0, transparent 30%),
			var(--bg);
		font-style: normal;
	}

	.page {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
	}

	.modal-card {
		width: min(1240px, 100%);
		border-radius: var(--radius-xl);
		background: linear-gradient(180deg, #ffffff 0%, #f8fff9 62%, #f0fff4 100%);
		box-shadow: 0 20px 48px rgba(26, 77, 46, 0.13), 0 4px 16px rgba(100, 180, 120, 0.08);
		border: 1px solid rgba(26, 77, 46, 0.12);
		overflow: visible;
		transform: translateY(8px);
		opacity: 0;
		animation: showCard 520ms var(--anim) forwards;
	}

	@keyframes showCard {
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	/* --- Header & Topbar --- */
	.topbar {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 14px;
		align-items: center;
		padding: 18px 24px;
		background: linear-gradient(102deg, var(--primary) 0%, #2e7d32 55%, #43a047 100%) !important;
		color: #fff;
		position: sticky;
		top: 0;
		z-index: 50;
		box-shadow: 0 8px 24px rgba(26, 77, 46, 0.25);
	}

	.topbar-logo {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 98px;
		height: 66px;
		padding: 6px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.42);
		background: rgba(255, 255, 255, 0.2);
		box-shadow: 0 8px 20px rgba(26, 77, 46, 0.2);
		backdrop-filter: blur(4px);
		transition: all var(--anim);
	}

	.topbar-logo:hover {
		transform: translateY(-2px);
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.56);
	}

	.topbar-logo img {
		width: 74px;
		height: 50px;
		object-fit: contain;
		filter: drop-shadow(0 4px 8px rgba(5, 39, 72, 0.35));
	}

	.topbar-title {
		margin: 0;
		font-size: clamp(1.05rem, 1.5vw, 1.5rem);
		font-weight: 800;
		letter-spacing: .2px;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #fff;
	}

	.topbar-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.45);
		font-size: 12px;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.24);
		color: #fff;
		backdrop-filter: blur(4px);
	}

	/* --- Content & Layout --- */
	.content {
		padding: 18px;
	}

	.state {
		border-radius: var(--radius-md);
		padding: 14px 16px;
		margin: 0 0 16px;
		font-weight: 700;
		border: 1px solid;
		display: none;
	}

	.state.show {
		display: block;
	}

	.state.info {
		background: #eef5ff;
		border-color: #d1dfef;
		color: #3b5ca4;
	}

	.state.error {
		background: #fff3f3;
		border-color: #ffcaca;
		color: #9a2525;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.panel {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow);
		padding: 14px;
		min-height: 205px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.panel-wide {
		grid-column: 1 / -1;
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.panel-title,
	.jobs-title,
	.profile-title,
	.review-title {
		margin: 0;
		font-size: 18px;
		font-weight: 800;
		color: #15314f;
	}

	.badge {
		padding: 5px 10px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: .2px;
		background: #e6eeff;
		color: #3f69a8;
		border: 1px solid #d1dfef;
		white-space: nowrap;
	}

	.badge.success {
		background: linear-gradient(135deg, #e6fffa, #b2f5ea);
		color: #2c7a7b;
	}

	.badge.warning {
		background: linear-gradient(135deg, #fffaf0, #feebc8);
		color: #9c4221;
	}

	.badge.danger {
		background: #fed7d7;
		color: #9b2c2c;
	}

	/* --- Fields --- */
	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px 12px;
	}

	.field {
		border: 1px dashed #d9e6f3;
		border-radius: 10px;
		padding: 8px 10px;
		background: var(--surface-soft);
	}

	.field-label {
		font-size: 11px;
		font-weight: 800;
		color: var(--primary);
		margin: 0 0 4px;
		text-transform: uppercase;
		letter-spacing: .5px;
	}

	.field-value {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
		word-break: break-word;
		color: #1f3853;
	}

	/* --- Invoice Specific --- */
	#panelInvoice {
		padding: 0;
		min-height: auto;
		border: 0;
		box-shadow: none;
		background: transparent;
	}

	.invoice-hero {
		border-radius: var(--radius-lg);
		padding: 20px;
		color: #1b3a1f;
		background: linear-gradient(118deg, #e8f5e9 0%, #c8e6c9 45%, #dcedc8 72%, #f1f8e9 100%);
		border: 1px solid rgba(26, 77, 46, 0.12);
	}

	.invoice-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 14px;
		margin-bottom: 14px;
	}

	.invoice-headline {
		display: grid;
		gap: 10px;
		flex: 1;
	}

	.invoice-title-line {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.invoice-order-title {
		margin: 0;
		font-size: clamp(1.1rem, 2vw, 1.7rem);
		font-weight: 800;
		color: var(--text);
	}

	.invoice-status-badge {
		display: inline-flex;
		align-items: center;
		padding: 5px 12px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.4);
		border: 1px solid rgba(26, 77, 46, 0.2);
		color: var(--text);
	}

	.invoice-status-badge.success {
		background: #43a047;
		color: #fff;
		border-color: transparent;
	}

	.invoice-status-badge.warning {
		background: #f9a825;
		color: #fff;
		border-color: transparent;
	}

	.invoice-status-badge.danger {
		background: #c62828;
		color: #fff;
		border-color: transparent;
	}

	.invoice-subtitle {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		color: var(--muted);
	}

	.invoice-progress-ring {
		--p: 0;
		width: 122px;
		height: 122px;
		border-radius: 50%;
		background: conic-gradient(from -90deg, #43a047 calc(var(--p) * 1%), rgba(255, 255, 255, 0.3) 0);
		border: 2px solid rgba(26, 77, 46, 0.25);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22), 0 8px 20px rgba(26, 77, 46, 0.18);
		padding: 7px;
		flex: 0 0 auto;
	}

	.invoice-progress-core {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(150deg, #e8f5e9 0%, #c8e6c9 100%);
		box-shadow: inset 0 4px 10px rgba(255, 255, 255, 0.5);
		display: grid;
		place-content: center;
		text-align: center;
		color: var(--primary);
		border: 2px solid rgba(26, 77, 46, 0.15);
	}

	.invoice-progress-core strong {
		font-size: 30px;
		line-height: 1;
		color: var(--primary);
		font-weight: 800;
	}

	.invoice-progress-core small {
		font-size: 11px;
		font-weight: 700;
		color: var(--muted);
	}

	.invoice-summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}

	.invoice-item {
		display: flex;
		gap: 9px;
		align-items: flex-start;
		border: 1px solid rgba(26, 77, 46, 0.15);
		background: rgba(26, 77, 46, 0.06);
		border-radius: 12px;
		padding: 10px 12px;
		min-height: 96px;
	}

	.invoice-item-icon {
		width: 27px;
		height: 27px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 800;
		background: rgba(255, 255, 255, 0.4);
		color: #fff;
		flex: 0 0 27px;
		margin-top: 2px;
	}

	.invoice-item-content {
		display: grid;
		gap: 2px;
		min-width: 0;
		color: #fff;
	}

	.invoice-item-content p {
		margin: 0;
		font-size: 11px;
		font-weight: 700;
		opacity: .85;
	}

	.invoice-item-content h4 {
		margin: 0;
		font-size: clamp(1.05rem, 1.6vw, 1.9rem);
		font-weight: 800;
		line-height: 1.15;
		word-break: break-word;
	}

	.invoice-item-content span {
		font-size: 11px;
		font-weight: 700;
		opacity: .9;
	}

	#invoicePrice {
		font-size: clamp(1.45rem, 2vw, 2.25rem);
	}

	#invoiceTimeRange {
		font-size: clamp(1.2rem, 1.5vw, 1.75rem);
	}

	/* --- Jobs & Media --- */
	#panelJobs {
		padding: 0;
		overflow: hidden;
		gap: 0;
		border-color: var(--primary);
	}

	.jobs-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 12px 14px;
		background: linear-gradient(135deg, #e8f3d6 0%, #f0fff4 65%, #c8e6c9 100%);
		border-bottom: 1px solid var(--border);
	}

	.jobs-title {
		font-size: 20px;
		color: var(--primary);
		font-weight: 700;
	}

	.job-count {
		display: inline-flex;
		align-items: center;
		padding: 6px 10px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
		background: #e8f5e9;
		border: 1px solid var(--border);
		white-space: nowrap;
	}

	.jobs-body {
		padding: 12px;
		background: linear-gradient(180deg, #fcfcfc 0%, #f4f8ff 70%, #eef4ff 100%);
	}

	#invoiceJob {
		list-style: none;
		margin: 0;
		padding: 8px;
		border-radius: 10px;
		background: linear-gradient(145deg, #fafafa 0%, #b4d0f1 100%);
		display: grid;
		gap: 8px;
		counter-reset: job-item;
	}

	#invoiceJob li {
		counter-increment: job-item;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 14px;
		font-weight: 700;
		line-height: 1.45;
		color: #2f546d;
		background: #fff;
		border: 1px solid #4f92de;
		border-radius: 10px;
		padding: 10px;
	}

	#invoiceJob li::before {
		content: counter(job-item);
		flex: 0 0 22px;
		height: 22px;
		border-radius: 999px;
		background: #4f92de;
		color: #fff;
		font-size: 12px;
		font-weight: 800;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 1px;
	}

	.jobs-meta {
		padding: 10px;
		border-top: 1px solid #ffffff;
		background: #ffffff;
	}

	.invoice-extra {
		border: 1px solid var(--border);
		border-top: 0;
		border-radius: 0 0 14px 14px;
		background: linear-gradient(180deg, #ffffff 0%, #f5f6fa 100%);
		padding: 12px;
		display: grid;
		gap: 10px;
	}

	.invoice-extra-grid,
	.invoice-media-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.invoice-extra-item,
	.invoice-media-item {
		border: 1px solid var(--primary);
		background: var(--surface-soft);
		border-radius: 8px;
		padding: 8px 10px;
		min-height: 72px;
	}

	.invoice-media-item .field-label {
		color: var(--primary);
	}

	.invoice-media-frame {
		display: none;
		width: 100%;
		flex: 1;
		min-height: 90px;
		border: 0;
		border-radius: 5px;
	}

	.media-empty-label {
		color: #8d9fb3;
		font-size: 11px;
		text-align: center;
		padding: 8px 0;
		font-weight: 700;
	}

	/* --- Profiles --- */
	#panelCustomer,
	#panelStaff {
		padding: 0;
		overflow: hidden;
		gap: 0;
		border-color: var(--primary);
	}

	.profile-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		background: linear-gradient(135deg, #e8f3d6 0%, #f0fff4 55%, #c8e6c9 100%);
	}

	.profile-body {
		padding: 14px;
		display: grid;
		grid-template-columns: 88px 1fr;
		gap: 14px;
		align-items: start;
	}

	.profile-avatar {
		width: 88px;
		height: 88px;
		border-radius: 50%;
		object-fit: cover;
		border: 3px solid var(--border);
		background: #e8f5e9;
	}

	.profile-main {
		display: grid;
		gap: 7px;
	}

	.profile-name {
		margin: 0;
		font-size: 22px;
		font-weight: 800;
		line-height: 1.25;
		color: #1d3650;
	}

	.profile-contact,
	.profile-row {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
		color: #2f4961;
		display: flex;
		align-items: center;
		gap: 8px;
		word-break: break-word;
	}

	.profile-row i,
	.profile-contact i {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: #e7f1ff;
		color: #4f7dd2;
		font-size: 11px;
		line-height: 1;
		font-weight: 800;
		flex: 0 0 18px;
	}

	.profile-foot {
		padding: 0 14px 14px;
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.profile-pill {
		display: inline-flex;
		align-items: center;
		padding: 8px 12px;
		border-radius: 10px;
		background: linear-gradient(135deg, #e8f5e9 0%, #f0fff4 65%, #e8f3d6 100%);
		font-size: 13px;
		font-weight: 700;
		color: var(--primary);
		border: 1px solid var(--border);
	}

	/* --- Progress & Time --- */
	#panelTime {
		background: linear-gradient(180deg, #e8f3d6 0%, #f0fff4 58%, #e8f5e9 100%) !important;
		border-color: var(--primary) !important;
	}

	.progress-section {
		display: grid;
		gap: 6px;
		margin-bottom: 12px;
	}

	.progress-label-wrap {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 700;
		font-size: 12px;
		color: #000;
	}

	.progress-bar-container {
		width: 100%;
		height: 21px;
		border-radius: 999px;
		overflow: hidden;
		background: linear-gradient(180deg, #dce6f8 0%, #ffffff 100%);
		border: 1px solid #0e2f75;
		box-shadow: inset 0 1px 2px rgb(255, 255, 255);
	}

	.progress-inner {
		height: 100%;
		width: 0;
		transition: width 420ms ease, background 300ms ease;
		background: linear-gradient(90deg, var(--primary) 0%, #2e7d32 55%, #43a047 100%);
		box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.2), 0 3px 8px rgba(26, 77, 46, 0.26);
	}

	.progress-inner.warn {
		background: linear-gradient(90deg, #f9a825, #fbc02d, #ffd54f);
	}

	.progress-inner.danger {
		background: linear-gradient(90deg, #c62828, #e53935);
	}

	#progressText {
		color: var(--primary);
		font-weight: 900;
	}

	#progressHint {
		color: var(--success);
		font-weight: 700;
		margin: 0;
		font-size: 12px;
	}

	.time-summary-grid {
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
		background: #f8fff9;
		margin-bottom: 12px;
	}

	.time-summary-header {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		background: var(--primary);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
	}

	.time-summary-header span {
		padding: 7px 10px;
		border-right: 1px solid rgba(255, 255, 255, 0.15);
	}

	.time-summary-body {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		font-size: 12px;
		font-weight: 700;
		color: var(--text);
	}

	.time-summary-body span {
		padding: 7px 10px;
		border-right: 1px solid var(--border);
	}

	.time-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.label-sm {
		font-size: 12px;
		font-weight: 800;
		color: #000;
	}

	.time-range-table {
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
		background: #f8fff9;
		margin-bottom: 16px;
	}

	.time-range-header {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		background: var(--primary);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
	}

	.time-range-header span {
		padding: 7px 10px;
	}

	.time-range-body {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.time-range-col {
		display: grid;
		grid-template-rows: repeat(2, 1fr);
	}

	.time-range-col:first-child {
		border-right: 1px solid var(--border);
	}

	.time-entry {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 7px 10px;
		font-size: 12px;
	}

	.time-entry.bottom {
		border-top: 1px solid var(--border);
	}

	.entry-label {
		color: var(--muted);
		font-weight: 600;
	}

	.entry-val {
		color: var(--text);
		font-weight: 700;
	}

	.staff-note-area {
		min-height: 84px;
		resize: vertical;
	}

	.history-section {
		margin-top: 4px;
	}

	.history-title {
		font-size: 12px;
		font-weight: 800;
		color: #000;
	}

	.history-table-wrap {
		overflow-x: auto;
		margin-top: 4px;
	}

	.history-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.history-table th {
		background: var(--primary);
		color: #fff;
		padding: 6px 8px;
		text-align: left;
		font-weight: 700;
	}

	.history-table td {
		padding: 6px 8px;
		border-bottom: 1px solid var(--border);
		font-weight: 600;
		color: var(--text);
	}

	.history-empty {
		font-size: 12px;
		color: var(--muted);
		margin: 0;
	}

	/* --- Reviews --- */
	.review-split {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.review-box {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 10px;
		background: linear-gradient(180deg, #f8fff9 0%, #f0fff4 68%, #e8f5e9 100%);
		display: grid;
		gap: 10px;
	}

	.review-display {
		display: grid;
		gap: 6px;
		padding: 8px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: #fff;
	}

	.review-text,
	.review-time {
		margin: 0;
		font-size: 13px;
		font-weight: 700;
		color: #475c7c;
		word-break: break-word;
	}

	.review-media-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.review-media-grid img,
	.review-media-grid video {
		width: 100%;
		height: 120px;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid #dbe7f2;
		background: #f4f8fc;
	}

	.media-empty {
		grid-column: 1 / -1;
		font-size: 12px;
		font-weight: 800;
		color: #4d638d;
		background: linear-gradient(135deg, #f0f6ff 0%, #ecf3fb 100%);
		border: 1px solid #d4e0f2;
		padding: 8px 10px;
		border-radius: 8px;
	}

	/* --- Buttons & Helpers --- */
	.btn {
		border-radius: 8px;
		font-weight: 800;
		transition: all var(--anim);
		border: none;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		cursor: pointer;
	}

	.btn-sm {
		padding: 6px 14px;
		font-size: 13px;
		min-height: 34px;
	}

	/* Bootstrap Overrides */
	.btn.btn-primary {
		background: linear-gradient(135deg, var(--primary), #2e7d32) !important;
		color: #fff !important;
		border: none !important;
	}

	.btn.btn-success {
		background: linear-gradient(135deg, #2e7d32, #43a047) !important;
		color: #fff !important;
		border: none !important;
	}

	.btn.btn-warning {
		background: linear-gradient(135deg, #f9a825, #e65100) !important;
		color: #fff !important;
		border: none !important;
	}

	.btn.btn-danger {
		background: linear-gradient(135deg, #c62828, #e53935) !important;
		color: #fff !important;
		border: none !important;
	}

	.btn.btn-light {
		background: #f0fff4;
		color: var(--primary);
		border: 1px solid var(--border);
	}

	.btn:hover {
		filter: brightness(0.94);
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(26, 77, 46, 0.15);
	}

	.btn:active {
		transform: translateY(0);
	}

	.hidden {
		display: none !important;
	}

	/* --- Dialog --- */
	#appDialogOverlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		backdrop-filter: blur(4px);
		padding: 20px;
	}

	#appDialogBox {
		background: white;
		border-radius: 12px;
		padding: 24px;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
		animation: dialogShow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes dialogShow {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
		}

		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	#appDialogTitle {
		font-size: 18px;
		font-weight: 800;
		margin-bottom: 12px;
		color: #1158c2;
	}

	#appDialogMessage {
		font-size: 14px;
		margin-bottom: 24px;
		color: #4a5568;
		line-height: 1.6;
		font-weight: 700;
	}

	.appDialogButtons {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.appDialogBtn {
		padding: 10px 20px;
		border-radius: 10px;
		border: none;
		font-weight: 700;
		cursor: pointer;
		font-size: 13px;
		transition: all 0.2s;
	}

	.appDialogBtnPrimary {
		background: linear-gradient(135deg, #2e7d32, var(--primary)) !important;
		color: white;
		box-shadow: 0 4px 12px rgba(26, 77, 46, 0.25);
	}

	.appDialogBtnSecondary {
		background: #f7fafc;
		color: #4a5568;
		border: 1px solid #e2e8f0;
	}

	/* --- Responsive --- */
	@media (max-width: 1060px) {

		.grid,
		.info-grid,
		.review-split,
		.review-media-grid,
		.invoice-extra-grid {
			grid-template-columns: 1fr;
		}

		.invoice-summary {
			grid-template-columns: 1fr;
			gap: 6px;
		}

		.invoice-item {
			width: 100%;
			min-height: auto;
		}

		.profile-body {
			grid-template-columns: 1fr 80px;
			align-items: center;
			gap: 12px;
		}

		.profile-avatar {
			grid-column: 2;
			grid-row: 1;
			width: 72px;
			height: 72px;
		}

		.profile-main {
			grid-column: 1;
			grid-row: 1;
		}

		.invoice-main {
			flex-direction: column;
			align-items: flex-start;
		}

		.invoice-main .actions {
			margin: auto !important;
			justify-content: center;
			width: 100%;
			order: 0;
		}

		.invoice-progress-ring {
			width: 105px;
			height: 105px;
			order: 1;
		}

		.panel {
			min-height: auto;
		}
	}

	@media (max-width: 640px) {

		.page,
		.content {
			padding: 10px;
		}

		.topbar {
			padding: 12px 10px;
			gap: 8px;
		}

		.topbar-title {
			font-size: 0.92rem;
		}

		.topbar-logo {
			width: 72px;
			height: 48px;
		}

		.topbar-logo img {
			width: 54px;
			height: 36px;
		}

		#invoiceProgressRing,
		.invoice-progress-ring {
			width: 140px !important;
			height: 140px !important;
			margin-inline: auto;
		}
	}

	@media (min-width: 768px) and (max-width: 1024px) {
		.invoice-main {
			display: grid !important;
			grid-template-columns: 1fr auto 1fr !important;
			gap: 20px !important;
		}

		.invoice-main .actions {
			margin: 0 !important;
			width: auto !important;
		}

		#invoiceProgressRing {
			justify-self: end;
			width: 120px !important;
			height: 120px !important;
		}

		.invoice-summary {
			grid-template-columns: repeat(2, 1fr) !important;
			gap: 15px !important;
		}

		.invoice-item.address {
			grid-column: span 2 !important;
		}
	}
</style>

<main class="page">
	<section class="modal-card">

		<div class="content">
			<div id="stateMessage" class="state info">Đang tải dữ liệu...</div>

			<section id="mainGrid" class="grid hidden">
				<article class="panel panel-wide" id="panelInvoice">
					<div class="invoice-hero">
						<div class="invoice-main">
							<div class="invoice-headline">
								<div>
									<div class="invoice-title-line">
										<h2 class="invoice-order-title">Đơn #<span id="invoiceId">---</span></h2>
										<span id="badgeInvoiceStatus" class="invoice-status-badge">---</span>
									</div>
									<p id="invoiceService" class="invoice-subtitle">---</p>
									<div class="invoice-title-line" style="margin-top: 5px; gap: 8px;">
										<span id="invoiceLoaiNoiDon" class="invoice-status-badge"
											style="background: rgba(255, 255, 255, 0.45); color: #000; border: 1px solid rgba(0,0,0,0.1);">---</span>
										<span id="invoiceGoiDichVu" class="invoice-status-badge"
											style="background: rgba(255, 255, 255, 0.45); color: #000; border: 1px solid rgba(0,0,0,0.1);">---</span>
									</div>
								</div>
							</div>
							<div class="actions d-flex flex-wrap align-items-center"
								style="gap:8px; margin-left: auto;">
								<button id="btnCancelService" class="btn btn-danger btn-sm hidden" type="button">
									Hủy dịch vụ</button>
								<button id="btnHdrClaim" class="btn btn-primary btn-sm hidden" type="button">
									Nhận việc</button>
								<button id="btnHdrStart" class="btn btn-success btn-sm hidden" type="button">
									Bắt đầu dịch vụ</button>
								<button id="btnHdrEnd" class="btn btn-warning btn-sm hidden" style="color:#fff;"
									type="button">Hoàn thành dịch vụ</button>
							</div>
							<div id="invoiceProgressRing" class="invoice-progress-ring" style="--p:0;">
								<div class="invoice-progress-core">
									<strong id="invoiceProgressHero">0%</strong>
									<small>Hoàn thành</small>
								</div>
							</div>
						</div>

						<div class="invoice-summary">
							<div class="invoice-item">
								<span class="invoice-item-icon"><i class="fa fa-usd" aria-hidden="true"></i></span>
								<div class="invoice-item-content">
									<p>Tổng tiền</p>
									<h4 id="invoicePrice">---</h4>
								</div>
							</div>
							<div class="invoice-item">
								<span class="invoice-item-icon"><i class="fa fa-clock-o" aria-hidden="true"></i></span>
								<div class="invoice-item-content">
									<p>Thời gian</p>
									<h4 id="invoiceTimeRange">---</h4>
									<span id="invoiceDate">---</span>
								</div>
							</div>
							<div class="invoice-item address">
								<span class="invoice-item-icon"><i class="fa fa-map-marker"
										aria-hidden="true"></i></span>
								<div class="invoice-item-content">
									<p>Địa chỉ</p>
									<h4 id="invoiceAddress">---</h4>
								</div>
							</div>
						</div>
					</div>

				</article>

				<article class="panel" id="panelJobs">
					<div class="jobs-header">
						<h2 class="jobs-title">Công việc cần thực hiện</h2>
					</div>
					<div class="jobs-body">
						<ol id="invoiceJob" class="field-value">
							<li>---</li>
						</ol>
					</div>
					<div class="jobs-meta invoice-extra-grid">
						<div class="invoice-extra-item">
							<p class="field-label">Yêu cầu</p>
							<p id="invoiceRequest" class="field-value">---</p>
						</div>
						<div class="invoice-extra-item">
							<p class="field-label">Ghi chú</p>
							<p id="invoiceNote" class="field-value">---</p>
						</div>
					</div>
					<div class="invoice-media-grid">
						<div class="invoice-media-item" id="invoiceMediaImage">
							<p class="field-label">Ảnh</p>
							<span class="media-empty-label" id="invoiceMediaImageEmpty">Chưa có ảnh</span>
							<iframe id="invoiceMediaImageEl"
								style="display:none;width:100%;flex:1;min-height:90px;border:0;border-radius:5px;"
								allowfullscreen></iframe>
						</div>
						<div class="invoice-media-item" id="invoiceMediaVideo">
							<p class="field-label">Video</p>
							<span class="media-empty-label" id="invoiceMediaVideoEmpty">Chưa có video</span>
							<iframe id="invoiceMediaVideoEl"
								style="display:none;width:100%;flex:1;min-height:90px;border:0;border-radius:5px;"
								allowfullscreen></iframe>
						</div>
					</div>
				</article>

				<article class="panel" id="panelTime"
					style="background:linear-gradient(180deg,#5e88af 0%,#fdf2fd 100%);border-color:#5089d3;">
					<div class="panel-head" style="margin-bottom:2px;">
						<h2 class="panel-title" style="font-size:15px;">Trạng thái, thời gian và tiến độ</h2>
					</div>

					<div style="display:grid;gap:6px;">
						<div class="d-flex justify-content-between align-items-center fw-bold"
							style="gap:10px;font-size:12px;color:#000000;">
							<span>Tiến độ thực hiện</span>
							<span id="progressText">0%</span>
						</div>
						<div
							style="width:100%;height:21px;border-radius:999px;overflow:hidden;background:linear-gradient(180deg,#dce6f8 0%,#ffffff 100%);border:1px solid #0e2f75;box-shadow:inset 0 1px 2px rgb(255, 255, 255);">
							<div id="progressBar" class="progress-inner"></div>
						</div>
						<p id="progressHint" class="hint" style="font-size:12px;margin-top:-2px;">Dữ liệu tiến độ sẽ
							được cập nhật theo thời gian.</p>
					</div>

					<div
						style="border:1px solid #d3ddef;border-radius:8px;overflow:hidden;background:#f7faff;margin-bottom:8px;">
						<div
							style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#79a9e7;color:#000000;font-size:12px;font-weight:800;">
							<span style="padding:7px 10px;border-right:1px solid rgba(0,0,0,0.05);">Ngày bắt đầu dự
								kiến</span>
							<span style="padding:7px 10px;border-right:1px solid rgba(0,0,0,0.05);">Ngày kết thúc dự
								kiến</span>
							<span style="padding:7px 10px;">Số ngày</span>
						</div>
						<div
							style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));font-size:12px;font-weight:700;">
							<span id="dateStartPlan"
								style="padding:7px 10px;border-right:1px solid #d3daef;color:#1f3853;">---</span>
							<span id="dateEndPlan"
								style="padding:7px 10px;border-right:1px solid #d3daef;color:#1f3853;">---</span>
							<span id="invoicePlanDays" style="padding:7px 10px;color:#1f3853;">---</span>
						</div>
					</div>

					<div class="d-flex align-items-center flex-wrap" style="gap:8px;">
						<span style="font-size:12px;font-weight:800;color:#000000;">Trạng thái:</span>
						<span id="badgeTimeState" class="badge">---</span>
						<span id="timeCurrentState" class="hidden">---</span>

						<div class="actions d-flex align-items-center ms-auto" style="gap:8px;">
							<button id="btnStart" class="btn btn-success btn-sm hidden"
								style="min-height:32px;padding:4px 12px;font-size:12px;border-radius:8px;"
								type="button">Bắt đầu</button>
							<span id="startButtonCountdown" class="hidden"
								style="font-size:11px;font-weight:700;color:#23527a;background:#edf6ff;border:1px solid #c8e0f7;border-radius:999px;padding:4px 8px;white-space:nowrap;">--</span>
							<button id="btnEnd" class="btn btn-warning btn-sm hidden"
								style="color:#fff;min-height:32px;padding:4px 12px;font-size:12px;border-radius:8px;"
								type="button">Kết thúc</button>
						</div>
					</div>

					<div style="border:1px solid #d3daef;border-radius:8px;overflow:hidden;background:#f7faff;">
						<div
							style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:#799ce7;color:#000000;font-size:12px;font-weight:800;">
							<span style="padding:7px 10px;">Thời gian dự kiến</span>
							<span style="padding:7px 10px;">Thời gian thực tế</span>
						</div>
						<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));">
							<div
								style="border-right:1px solid #dbe6f3; display: grid; grid-template-rows: repeat(2, 1fr);">
								<div class="d-flex justify-content-between align-items-center"
									style="gap:8px;padding:7px 10px;font-size:12px;"><span
										style="color:#000000;font-weight:700;">Bắt đầu</span><span id="timeStartPlan"
										style="color:#1f3853;font-weight:800;">---</span></div>
								<div class="d-flex justify-content-between align-items-center"
									style="gap:8px;padding:7px 10px;border-top:1px solid #e3ecf7;font-size:12px;">
									<span style="color:#000000;font-weight:700;">Kết thúc</span><span id="timeEndPlan"
										style="color:#1f3853;font-weight:800;">---</span>
								</div>
							</div>
							<div style="display: grid; grid-template-rows: repeat(2, 1fr);">
								<div class="d-flex justify-content-between align-items-center"
									style="gap:8px;padding:7px 10px;font-size:12px;"><span
										style="color:#000000;font-weight:700;">Bắt đầu</span><span id="timeStartReal"
										style="color:#1f3853;font-weight:800;">---</span></div>
								<div class="d-flex justify-content-between align-items-center"
									style="gap:8px;padding:7px 10px;border-top:1px solid #e3ecf7;font-size:12px;">
									<span style="color:#000000;font-weight:700;">Kết thúc</span><span id="timeEndReal"
										style="color:#1f3853;font-weight:800;">---</span>
								</div>
							</div>
						</div>
					</div>



					<div id="staffWorkForm" class="forms d-grid gap-2 hidden">
						<label class="field-label" for="staffNote">Ghi chú công việc trong ngày</label>
						<textarea id="staffNote" class="form-control" style="min-height:84px;resize:vertical;"
							placeholder="Nhập ghi chú công việc hôm nay..."></textarea>
						<button id="btnSaveStaffLog" class="btn btn-light btn-sm" type="button">Lưu ghi chú</button>
					</div>

					<div id="workHistoryTable" style="margin-top:4px;">
						<span style="font-size:12px;font-weight:800;color:#000000;">Lịch sử làm việc</span>
						<div id="workHistoryContent" style="overflow-x:auto;margin-top:4px;" class="hidden">
							<table style="width:100%;border-collapse:collapse;font-size:12px;">
								<thead>
									<tr style="background:#79a0e7;color:#000;">
										<th style="padding:6px 8px;text-align:left;">Ngày thứ</th>
										<th style="padding:6px 8px;text-align:left;">Ngày làm</th>
										<th style="padding:6px 8px;text-align:left;">Bắt đầu</th>
										<th style="padding:6px 8px;text-align:left;">Kết thúc</th>
										<th style="padding:6px 8px;text-align:left;">Ghi chú</th>
									</tr>
								</thead>
								<tbody id="workHistoryBody"></tbody>
							</table>
						</div>
						<p id="workHistoryEmpty" style="font-size:12px;color:#000000;margin:0;">Chưa có lịch sử làm
							việc.</p>
					</div>

					<div class="actions d-flex flex-wrap align-items-center mt-auto" style="gap:8px;">
						<span id="badgeProgress" class="badge" style="display:none;">0%</span>
					</div>
				</article>
				<article class="panel" id="panelCustomer">
					<div class="profile-head">
						<h2 class="profile-title">Khách hàng</h2>
						<span class="profile-status badge success">Khách hàng</span>
					</div>
					<div class="profile-body">
						<img id="customerAvatarImg" class="profile-avatar" src="assets/images/logo2.jpg" alt="Khách hàng">
						<iframe id="customerAvatar" class="profile-avatar" src="" frameborder="0"
							style="display:none;"></iframe>
						<div class="profile-main">
							<h3 id="customerCardName" class="profile-name">---</h3>
							<p class="profile-contact"><i class="fa fa-envelope"></i> <span
									id="customerCardEmail">---</span></p>
							<p class="profile-row"><i class="fa fa-phone"></i> <span id="customerCardPhone">---</span>
							</p>
							<p class="profile-row"><i class="fa fa-map-marker"></i> <span
									id="customerCardAddress">---</span></p>
						</div>
					</div>

				</article>

				<article class="panel" id="panelStaff">
					<div class="profile-head">
						<h2 class="profile-title">Nhà Cung Cấp phụ trách</h2>
						<span id="badgeStaff" class="profile-status badge warning">Chưa nhận</span>
					</div>
					<div class="profile-body">
						<img id="staffAvatarImg" class="profile-avatar" src="assets/images/logo2.jpg" alt="Nhà Cung Cấp">
						<iframe id="staffAvatar" class="profile-avatar" src="" frameborder="0"
							style="display:none;"></iframe>
						<div class="profile-main">
							<h3 id="staffCardName" class="profile-name">---</h3>
							<!-- <p class="profile-rate"><span class="star">★</span><span id="staffRatingText">Chưa có đánh giá</span></p> -->
							<p class="profile-row"><i class="fa fa-envelope"></i> <span id="staffCardEmail">---</span>
							</p>
							<p class="profile-row"><i class="fa fa-phone"></i> <span id="staffCardPhone">---</span></p>
							<p class="profile-row"><i class="fa fa-map-marker"></i> <span
									id="staffCardAddress">---</span></p>
						</div>
					</div>
					<div class="profile-foot">
						<span id="staffReceiveTime" class="profile-pill">Nhận việc: ---</span>
					</div>
				</article>

				<article class="panel panel-wide" id="panelMedia">
					<div class="panel-head">
						<h2 class="panel-title">Ảnh và đánh giá</h2>
						<span class="badge">Minh chứng</span>
					</div>

					<div class="review-split">
						<section class="review-box">
							<div class="review-head">
								<h3 class="review-title">Đánh giá khách hàng</h3>
								<span id="badgeCustomerReview" class="badge warning">Chưa có</span>
							</div>

							<div class="review-display">
								<p class="field-label">Nội dung đánh giá</p>
								<p id="customerReviewText" class="review-text">Chưa có đánh giá</p>
								<p class="field-label">Thời gian gửi</p>
								<p id="customerReviewTime" class="review-time">---</p>
								<p class="field-label">Ảnh/video đánh giá</p>
								<div id="customerReviewMediaGrid" class="review-media-grid"></div>
							</div>

							<div id="customerReviewForm" class="forms d-grid gap-2 hidden">
								<label class="field-label" for="customerReview">Nhập đánh giá của khách hàng</label>
								<textarea id="customerReview" class="form-control"
									style="min-height:84px;resize:vertical;"
									placeholder="Nhập đánh giá sau khi hoàn thành..."></textarea>
								<label class="field-label" for="customerMediaInput">Tải lên ảnh/video đánh giá
									(khách hàng)</label>
								<input id="customerMediaInput" class="form-control" type="file" accept="image/*,video/*"
									multiple>
								<button id="btnSaveReview" class="btn btn-primary btn-sm" type="button">Lưu đánh giá
									khách hàng</button>
							</div>
						</section>

						<section class="review-box">
							<div class="review-head">
								<h3 class="review-title">Đánh giá nhà cung cấp</h3>
								<span id="badgeStaffReview" class="badge warning">Chưa có</span>
							</div>

							<div class="review-display">
								<p class="field-label">Nội dung đánh giá</p>
								<p id="staffReviewText" class="review-text">Chưa có đánh giá</p>
								<p class="field-label">Thời gian gửi</p>
								<p id="staffReviewTime" class="review-time">---</p>
								<p class="field-label">Ảnh/video đánh giá</p>
								<div id="staffReviewMediaGrid" class="review-media-grid"></div>
							</div>

							<div id="staffReviewForm" class="forms d-grid gap-2 hidden">
								<label class="field-label" for="staffReview">Nhập đánh giá của nhà cung cấp</label>
								<textarea id="staffReview" class="form-control" style="min-height:84px;resize:vertical;"
									placeholder="Nhập đánh giá sau khi hoàn thành..."></textarea>
								<label class="field-label" for="staffReviewMediaInput">Tải lên ảnh/video đánh giá
									(nhà cung cấp)</label>
								<input id="staffReviewMediaInput" class="form-control" type="file"
									accept="image/*,video/*" multiple>
								<button id="btnSaveStaffReview" class="btn btn-primary btn-sm" type="button">Lưu
									đánh giá nhà cung cấp</button>
							</div>
						</section>
					</div>
				</article>
			</section>
		</div>
	</section>
</main>
<div id="appDialogOverlay">
	<div id="appDialogBox">
		<div id="appDialogTitle">Thông báo</div>
		<div id="appDialogMessage"></div>
		<div class="appDialogButtons">
			<button id="appDialogBtnCancel" class="appDialogBtn appDialogBtnSecondary">Hủy</button>
			<button id="appDialogBtnOk" class="appDialogBtn appDialogBtnPrimary">Đồng ý</button>
		</div>
	</div>
</div>

<script>
	(() => {
		const TABLE_USER = 'nguoidung'; // Bảng duy nhất chứa cả khách hàng lẫn nhà cung cấp
		const TABLE_ORDER = 'datlich_chamsocvuon';
		const TABLE_HISTORY = 'lich_su_lam_viec_donvesinh';

		const app = {
			params: {},
			role: '',
			$user: null,
			$nguoidung: [], // Danh sách tất cả người dùng từ bảng nguoidung
			$datlich_chamsocvuon: null,
			stateTimer: null,
			// id của record lich_su_lam_viec_mvb đang mở trong ngày (sau khi nhấn btnStart)
			currentWorkLogId: null
		};

		const $ = (id) => document.getElementById(id);

		// Hệ thống Dialog tùy chỉnh
		const jsDialog = {
			show(message, type = 'alert', customTitle = 'Thông báo') {
				const overlay = $('appDialogOverlay');
				const msg = $('appDialogMessage');
				const btnOk = $('appDialogBtnOk');
				const btnCancel = $('appDialogBtnCancel');
				const title = $('appDialogTitle');

				if (!overlay || !msg || !btnOk || !btnCancel || !title) {
					// Fallback nếu DOM chưa sẵn sàng hoặc bị thiếu
					if (type === 'confirm') return Promise.resolve(window.confirm(message));
					window.alert(message);
					return Promise.resolve(true);
				}

				return new Promise((resolve) => {
					msg.textContent = message;
					title.textContent = customTitle;
					overlay.style.display = 'flex';
					btnCancel.style.display = type === 'confirm' ? 'block' : 'none';

					const close = (result) => {
						overlay.style.display = 'none';
						btnOk.onclick = null;
						btnCancel.onclick = null;
						resolve(result);
					};

					btnOk.onclick = () => close(true);
					btnCancel.onclick = () => close(false);
				});
			},
			alert(msg) { return this.show(msg, 'alert'); },
			confirm(msg) { return this.show(msg, 'confirm', 'Xác nhận'); }
		};

		// Override window.alert để dùng cho các lời gọi trong HTML (onclick)
		window.alert = (msg) => jsDialog.alert(msg);
		window.confirm = (msg) => jsDialog.confirm(msg);
		const toNum = (v) => Number(v || 0);
		const now = () => new Date();
		const nowSql = () => {
			const d = now();
			const p = (n) => String(n).padStart(2, '0');
			return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
		};
		const nowTimeSql = () => {
			const d = now();
			const p = (n) => String(n).padStart(2, '0');
			return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
		};
		const show = (el, ok = true) => el && el.classList.toggle('hidden', !ok);
		const setText = (id, value) => {
			const el = $(id);
			if (el) el.textContent = value || '---';
		};
		const setAvatar = (id, src, fallback = '../assets/images/logo2.jpg') => {
			const el = $(id);
			if (!el) return;
			el.onerror = () => {
				el.onerror = null;
				el.src = fallback;
			};
			el.src = src || fallback;
		};
		const formatMoney = (value) => {
			const n = Number(String(value || 0).replace(/[^\d.-]/g, ''));
			if (!Number.isFinite(n)) return `${value || 0} VND`;
			return `${n.toLocaleString('vi-VN')} VND`;
		};
		const formatInvoiceCode = (id) => {
			const raw = String(id ?? '').trim();
			if (!raw) return '---';
			const n = Number(raw);
			if (!Number.isFinite(n) || n < 0) return '---';
			return String(Math.trunc(n)).padStart(7, '0');
		};

		function parseDateTimeParts(value) {
			const raw = String(value || '').trim();
			if (!raw) return null;

			const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);
			if (ymd) {
				return {
					y: Number(ymd[1]),
					m: Number(ymd[2]),
					d: Number(ymd[3]),
					h: Number(ymd[4] || 0),
					min: Number(ymd[5] || 0),
					s: Number(ymd[6] || 0),
					hasDate: true,
					hasTime: !!ymd[4]
				};
			}

			const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);
			if (dmy) {
				return {
					y: Number(dmy[3]),
					m: Number(dmy[2]),
					d: Number(dmy[1]),
					h: Number(dmy[4] || 0),
					min: Number(dmy[5] || 0),
					s: Number(dmy[6] || 0),
					hasDate: true,
					hasTime: !!dmy[4]
				};
			}

			const hms = raw.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
			if (hms) {
				return {
					y: 0,
					m: 0,
					d: 0,
					h: Number(hms[1] || 0),
					min: Number(hms[2] || 0),
					s: Number(hms[3] || 0),
					hasDate: false,
					hasTime: true
				};
			}

			return null;
		}

		function buildPlanDateTime(dateValue, timeValue, endOfDay = false) {
			const d = parseDateTimeParts(dateValue);
			if (!d || !d.hasDate) return null;

			const t = parseDateTimeParts(timeValue);
			const h = t && t.hasTime ? t.h : (endOfDay ? 23 : 0);
			const min = t && t.hasTime ? t.min : (endOfDay ? 59 : 0);
			const s = t && t.hasTime ? t.s : (endOfDay ? 59 : 0);
			return new Date(d.y, d.m - 1, d.d, h, min, s);
		}

		function formatDateDisplay(value) {
			if (!value) return '---';
			const p = parseDateTimeParts(value);
			if (!p || !p.hasDate) return String(value || '---');
			return `${p.d}/${p.m}/${p.y}`;
		}

		function formatTimeDisplay(value) {
			if (!value) return '--:--:--';
			const p = parseDateTimeParts(value);
			if (!p || !p.hasTime) return String(value || '--:--:--');
			return `${p.h}:${p.min}:${p.s}`;
		}

		function formatDateTimeDisplay(value) {
			if (!value) return '---';
			const p = parseDateTimeParts(value);
			if (!p) return String(value || '---');
			if (p.hasDate && p.hasTime) return `${p.d}/${p.m}/${p.y} ${p.h}:${p.min}:${p.s}`;
			if (p.hasDate) return `${p.d}/${p.m}/${p.y}`;
			if (p.hasTime) return `${p.h}:${p.min}:${p.s}`;
			return String(value || '---');
		}

		async function listTableRows(tableName) {
			const result = typeof krudList === 'function'
				? await krudList({ table: tableName, limit: 100000 })
				: await krud('list', tableName, { p: 1, limit: 100000 });

			if (Array.isArray(result)) return result;
			if (Array.isArray(result?.data)) return result.data;
			if (Array.isArray(result?.rows)) return result.rows;
			if (Array.isArray(result?.items)) return result.items;
			if (result?.error) throw new Error(result.error);
			if (result?.success === false) throw new Error(result.message || `Không lấy được dữ liệu bảng ${tableName}`);
			return [];
		}

		async function updateById(tableName, id, data) {
			if (id == null || id === '') throw new Error('Thiếu id để cập nhật dữ liệu');
			const result = await krud('update', tableName, data, id);
			if (result && result.success === false) throw new Error(result.message || 'Cập nhật thất bại');
			return result;
		}

		async function insertRow(tableName, data) {
			const result = await krud('insert', tableName, data);
			if (result && result.success === false) throw new Error(result.message || 'Lưu dữ liệu thất bại');
			// krud trả về id mới hoặc object chứa id
			if (result && result.id) return result.id;
			if (result && result.data && result.data.id) return result.data.id;
			if (typeof result === 'number' || (typeof result === 'string' && result)) return result;
			return result;
		}

		async function listHistoryByOrder(idDv) {
			try {
				const rows = await listTableRows(TABLE_HISTORY);
				return rows.filter(r => String(r.id_dv) === String(idDv));
			} catch {
				return [];
			}
		}

		function getUrlParams() {
			const p = new URLSearchParams(window.location.search);
			let mahd = p.get('mahd');
			let sodienthoai = p.get('sodienthoai');
			let password = p.get('password');

			// Fallback to sessionStorage if not in URL
			if (!mahd) mahd = sessionStorage.getItem('last_view_mahd');
			if (!sodienthoai) sodienthoai = sessionStorage.getItem('last_view_sodienthoai');
			if (!password) password = sessionStorage.getItem('last_view_password');

			return {
				mahd: mahd || '',
				sodienthoai: sodienthoai || '',
				password: password || ''
			};
		}

		async function loadAuthTables() {
			// Chỉ cần load 1 bảng nguoidung duy nhất
			app.$nguoidung = await listTableRows(TABLE_USER);
		}
		function findAuthUser() {
			const { sodienthoai, password } = app.params;
			// Tìm user trong bảng nguoidung theo SĐT và mật khẩu
			const matched = app.$nguoidung.find((row) => (
				String(row.sodienthoai || '') === sodienthoai
				&& String(row.matkhau || row.mat_khau || row.password || '') === password
			));
			if (!matched) return null;


			// Cần có đơn hàng để xác định role
			if (!app.$datlich_chamsocvuon) return null;

			const sdt = sodienthoai.trim();
			const customerPhone = String(app.$datlich_chamsocvuon.sdtkhachhang || '').trim();
			const sdtncc = String(app.$datlich_chamsocvuon.sdtncc || '').trim();

			// Ưu tiên 1: Nếu SĐT đăng nhập trùng với SĐT khách hàng trong đơn → khách hàng
			if (sdt === customerPhone) {
				return { role: 'customer', $user: matched };
			}

			// Ưu tiên 2: Nếu SĐT đăng nhập khác SĐT khách hàng → kiểm tra nhà cung cấp
			// Điều kiện: tài khoản phải có id_dichvu chứa '1'
			//           VÀ (sdtncc trong đơn hàng trùng SĐT đăng nhập HOẶC sdtncc trong đơn hàng rỗng/null)
			const idDichvuList = String(matched.id_dichvu || '').split(',').map(s => s.trim());
			const isProviderAccount = idDichvuList.includes('5');
			const sdtnccMatchOrEmpty = !sdtncc || sdtncc === sdt;

			if (isProviderAccount && sdtnccMatchOrEmpty) {
				return { role: 'staff', $user: matched };
			}

			// Không thỏa điều kiện nào → không cho xem đơn hàng
			return null;
		}


		async function applyAutoOrderStatusRules($datlich_chamsocvuon) {
			const status = String($datlich_chamsocvuon.trangthai || '').toLowerCase();
			const hasStaff = toNum($datlich_chamsocvuon.id_nhacungcap) > 0;
			const startPlanAt = buildPlanDateTime($datlich_chamsocvuon.ngay_bat_dau_kehoach, $datlich_chamsocvuon.gio_bat_dau_kehoach);
			const endPlanAt = buildPlanDateTime($datlich_chamsocvuon.ngay_ket_thuc_kehoach, $datlich_chamsocvuon.gio_ket_thuc_kehoach, true);
			const isCanceled = status.includes('hủy');
			const isOverdue = status.includes('quá hạn');
			const isCompleted = status.includes('hoàn thành');
			const needOverdue = !hasStaff
				&& !!startPlanAt
				&& now().getTime() > startPlanAt.getTime()
				&& !isCanceled
				&& !isOverdue
				&& !isCompleted;
			const needComplete = hasStaff
				&& !!endPlanAt
				&& now().getTime() > endPlanAt.getTime()
				&& status.includes('đang')
				&& !isCanceled
				&& !isOverdue
				&& !isCompleted;

			if (needOverdue) {
				await updateById(TABLE_ORDER, $datlich_chamsocvuon.id, { trangthai: 'quá hạn' });
				return { ...$datlich_chamsocvuon, trangthai: 'quá hạn' };
			}

			if (needComplete) {
				await updateById(TABLE_ORDER, $datlich_chamsocvuon.id, { trangthai: 'hoàn thành' });
				return { ...$datlich_chamsocvuon, trangthai: 'hoàn thành' };
			}

			return $datlich_chamsocvuon;
		}

		async function loadOrderById() {
			const $datlich_chamsocvuon_rows = await listTableRows(TABLE_ORDER);
			const $datlich_chamsocvuon = $datlich_chamsocvuon_rows.find((row) => String(row.id) === String(app.params.mahd));
			if (!$datlich_chamsocvuon) throw new Error('Không tìm thấy đơn hàng');

			app.$datlich_chamsocvuon = await applyAutoOrderStatusRules($datlich_chamsocvuon);
		}

		function getAssignedStaffRow() {
			if (!app.$datlich_chamsocvuon) return null;
			const idStaff = toNum(app.$datlich_chamsocvuon.id_nhacungcap);
			if (idStaff <= 0) return null;
			// Tìm trong bảng nguoidung (thay thế cho nhacungcap_donvesinh cũ)
			return app.$nguoidung.find((row) => toNum(row.id) === idStaff) || null;
		}

		function parseDateOnly(dateStr) {
			if (!dateStr) return null;
			return new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
		}

		function parseTimeToHour(timeStr) {
			const [h, m] = String(timeStr || '0:0').split(':').map(Number);
			return (h || 0) + ((m || 0) / 60);
		}

		function diffDays(startDate, endDate) {
			const s = parseDateOnly(startDate);
			const e = parseDateOnly(endDate);
			if (!s || !e) return 1;
			const ms = e.getTime() - s.getTime();
			return Math.max(1, Math.round(ms / 86400000));
		}

		function calcProgressDay($datlich_chamsocvuon) {
			const plan = parseTimeToHour($datlich_chamsocvuon.gio_ket_thuc_kehoach) - parseTimeToHour($datlich_chamsocvuon.gio_bat_dau_kehoach);
			const realStart = new Date($datlich_chamsocvuon.thoigian_batdau_thucte || '').getTime();
			const realEnd = new Date($datlich_chamsocvuon.thoigian_ketthuc_thucte || '').getTime();
			const real = (realEnd - realStart) / 3600000;
			const days = diffDays($datlich_chamsocvuon.ngay_bat_dau_kehoach, $datlich_chamsocvuon.ngay_ket_thuc_kehoach);
			if (plan <= 0 || real <= 0) return 0;
			const value = (real / plan) * (100 / days);
			return Math.max(0, Math.min(100, value));
		}

		function statusBadgeClass(status) {
			const s = String(status || '').toLowerCase();
			if (s.includes('hủy') || s.includes('quá hạn')) return 'badge danger';
			if (s.includes('hoàn thành')) return 'badge success';
			if (s.includes('đang')) return 'badge warning';
			return 'badge';
		}

		function isReviewLockedByDeadline($datlich_chamsocvuon) {
			if (!$datlich_chamsocvuon) return true;
			const status = String($datlich_chamsocvuon.trangthai || '').toLowerCase();
			const endPlanAt = buildPlanDateTime($datlich_chamsocvuon.ngay_ket_thuc_kehoach, $datlich_chamsocvuon.gio_ket_thuc_kehoach, true);
			if (!endPlanAt) return false;

			const isCanceled = status.includes('hủy');
			const isOverdue = status.includes('quá hạn');
			const noStaff = toNum($datlich_chamsocvuon.id_nhacungcap) <= 0;
			return now().getTime() > endPlanAt.getTime() && (isCanceled || isOverdue || noStaff);
		}

		function canSubmitCustomerReview() {
			const $datlich_chamsocvuon = app.$datlich_chamsocvuon;
			if (!$datlich_chamsocvuon) return false;
			const isCompleted = String($datlich_chamsocvuon.trangthai || '').toLowerCase().includes('hoàn thành');
			return isCompleted && !isReviewLockedByDeadline($datlich_chamsocvuon);
		}

		function canSubmitStaffReview() {
			const $datlich_chamsocvuon = app.$datlich_chamsocvuon;
			if (!$datlich_chamsocvuon) return false;
			const isCompleted = String($datlich_chamsocvuon.trangthai || '').toLowerCase().includes('hoàn thành');
			const isAssignedStaff = toNum($datlich_chamsocvuon.id_nhacungcap) > 0
				&& toNum($datlich_chamsocvuon.id_nhacungcap) === toNum(app.$user?.id);
			return isCompleted && isAssignedStaff && !isReviewLockedByDeadline($datlich_chamsocvuon);
		}

		function renderJobList(value) {
			const list = $('invoiceJob');
			if (!list) return;
			list.innerHTML = '';
			const cleanJob = (text) => String(text || '')
				.replace(/^[,;:.\-\s]+/, '')
				.replace(/\s+/g, ' ')
				.trim();
			const raw = String(value || '').replace(/\r?\n/g, ' ').trim();
			let jobs = raw
				.split('.')
				.map(cleanJob)
				.filter(Boolean);

			// Neu du lieu cu phan tach bang dau phay thi van ho tro.
			if (!jobs.length && raw) {
				jobs = raw.split(',').map(cleanJob).filter(Boolean);
			}

			(jobs.length ? jobs : ['---']).forEach((job) => {
				const li = document.createElement('li');
				li.textContent = job;
				list.appendChild(li);
			});
		}

		function parseMedia(raw) {
			if (!raw) return [];
			if (Array.isArray(raw)) return raw;
			try {
				const j = JSON.parse(raw);
				return Array.isArray(j) ? j : [];
			} catch {
				return String(raw).split(',').map((x) => x.trim()).filter(Boolean);
			}
		}

		function renderMedia(gridId, raw) {
			const grid = $(gridId);
			if (!grid) return;
			grid.innerHTML = '';
			const items = parseMedia(raw);
			if (!items.length) {
				const div = document.createElement('div');
				div.className = 'media-empty';
				div.textContent = 'Chưa có tệp';
				grid.appendChild(div);
				return;
			}
			items.forEach((id) => {
				const iframe = document.createElement('iframe');
				iframe.src = 'https://drive.google.com/file/d/' + id + '/preview';
				iframe.style.cssText = 'width:100%;height:200px;border:0;border-radius:6px;display:block;margin-bottom:6px;';
				iframe.allowFullscreen = true;
				grid.appendChild(iframe);
			});
		}

		function renderLocalMedia(gridId, fileList) {
			const grid = $(gridId);
			if (!grid) return;
			grid.innerHTML = '';
			const files = Array.from(fileList || []);
			if (!files.length) {
				const div = document.createElement('div');
				div.className = 'media-empty';
				div.textContent = 'Chưa có tệp';
				grid.appendChild(div);
				return;
			}
			files.forEach((file) => {
				const url = URL.createObjectURL(file);
				const isVideo = String(file.type || '').startsWith('video/');
				const el = document.createElement(isVideo ? 'video' : 'img');
				el.src = url;
				if (isVideo) {
					el.controls = true;
					el.onloadeddata = () => URL.revokeObjectURL(url);
				} else {
					el.onload = () => URL.revokeObjectURL(url);
				}
				grid.appendChild(el);
			});
		}

		function bindReviewPreview(inputId, gridId, mediaColumn) {
			const input = $(inputId);
			if (!input) return;
			input.addEventListener('change', () => {
				if (input.files && input.files.length) {
					renderLocalMedia(gridId, input.files);
					return;
				}
				renderMedia(gridId, (app.$datlich_chamsocvuon || {})[mediaColumn]);
			});
		}

		function renderReview() {
			const $datlich_chamsocvuon = app.$datlich_chamsocvuon;
			if (!$datlich_chamsocvuon) return;
			const customerDone = !!$datlich_chamsocvuon.danhgia_khachhang;
			const staffDone = !!$datlich_chamsocvuon.danhgia_nhanvien;

			setText('customerReviewText', $datlich_chamsocvuon.danhgia_khachhang || 'Chưa có đánh giá');
			setText('customerReviewTime', formatDateTimeDisplay($datlich_chamsocvuon.thoigian_danhgia_khachhang));
			setText('staffReviewText', $datlich_chamsocvuon.danhgia_nhanvien || 'Chưa có đánh giá');
			setText('staffReviewTime', formatDateTimeDisplay($datlich_chamsocvuon.thoigian_danhgia_nhanvien));
			renderMedia('customerReviewMediaGrid', $datlich_chamsocvuon.media_danhgia_khachhang);
			renderMedia('staffReviewMediaGrid', $datlich_chamsocvuon.media_danhgia_nhanvien);

			$('badgeCustomerReview').textContent = customerDone ? 'Đã gửi' : 'Chưa có';
			$('badgeCustomerReview').className = customerDone ? 'badge success' : 'badge warning';
			$('badgeStaffReview').textContent = staffDone ? 'Đã gửi' : 'Chưa có';
			$('badgeStaffReview').className = staffDone ? 'badge success' : 'badge warning';

			show($('customerReviewForm'), app.role === 'customer' && canSubmitCustomerReview() && !customerDone);
			show($('staffReviewForm'), app.role === 'staff' && canSubmitStaffReview() && !staffDone);
		}

		function renderActionButtons() {
			const el = id => document.getElementById(id);
			const $ = app.$datlich_chamsocvuon;
			if (!$) return;
			const isStaff = app.role === 'staff', isCust = app.role === 'customer';
			const assigned = toNum($.id_nhacungcap) > 0;
			const isAssignedStaff = isStaff && toNum($.id_nhacungcap) === toNum(app.$user.id);
			const status = String($.trangthai || '').toLowerCase();
			const isCancel = status.includes('hủy'), isDone = status.includes('hoàn thành'), isOver = status.includes('quá hạn');
			const startVal = buildPlanDateTime($.ngay_bat_dau_kehoach, $.gio_bat_dau_kehoach);
			const canClaim = isStaff && !assigned && !isCancel && !isDone && !isOver && (startVal && now() < startVal);
			const started = !!$.thoigian_batdau_thucte, ended = !!$.thoigian_ketthuc_thucte;

			show(el('btnHdrClaim'), canClaim);

			// btnHdrStart: chỉ hiện khi chưa bắt đầu tổng thể (thoigian_batdau_thucte chưa có)
			const canHdrStart = isAssignedStaff && !started && !isCancel && !isDone && !isOver;
			show(el('btnHdrStart'), canHdrStart);
			const canHdrEnd = isAssignedStaff && started && !ended && !isCancel && !isDone && !isOver;
			show(el('btnHdrEnd'), canHdrEnd);

			// btnStart / btnEnd: chỉ hiện cho staff, khi đã nhấn btnHdrStart (thoigian_batdau_thucte đã có)
			// và ngày hôm nay nằm trong khoảng kế hoạch
			const todayStr = (() => {
				const d = now();
				const p = n => String(n).padStart(2, '0');
				return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
			})();
			const startPlanDate = ($.ngay_bat_dau_kehoach || '').slice(0, 10);
			const endPlanDate = ($.ngay_ket_thuc_kehoach || '').slice(0, 10);
			const inPlanRange = isAssignedStaff && started && !isCancel && !isDone && !isOver
				&& startPlanDate <= todayStr && todayStr <= endPlanDate;
			const pastEndDate = endPlanDate && todayStr > endPlanDate;

			if (pastEndDate || !inPlanRange) {
				show(el('btnStart'), false);
				show(el('btnEnd'), false);
			} else {
				const history = app.$workHistory || [];
				// Theo yêu cầu: nếu có bất kỳ bản ghi nào của ngày hôm nay (trùng ngay_lam) thì không hiện btnStart
				const hasRecordToday = history.some(r => (r.ngay_lam || '').slice(0, 10) === todayStr);

				// Tìm bản ghi đã bắt đầu làm việc trong ngày hôm nay (có giờ bắt đầu)
				const logToday = history.find(r => (r.ngay_lam || '').slice(0, 10) === todayStr && r.gio_bat_dau_trong_ngay);
				const todayStarted = !!logToday;
				const todayEnded = logToday && logToday.gio_ket_thuc_trong_ngay;

				show(el('btnStart'), !hasRecordToday && !isDone);
				show(el('btnEnd'), todayStarted && !todayEnded && !isDone);
			}

			show(el('btnCancelService'), isCust && !assigned && (startVal && now() < startVal.getTime() - 3600000) && !isCancel && !isDone && !started);
		}

		function renderUI() {
			const $datlich_chamsocvuon = app.$datlich_chamsocvuon || {};
			const $nhacungcap_donvesinh = getAssignedStaffRow() || {};
			const invoiceCode = formatInvoiceCode($datlich_chamsocvuon.id || app.params.mahd);

			setText('invoiceId', invoiceCode);
			setText('invoicePrice', formatMoney($datlich_chamsocvuon.tong_tien || 0));
			setText('invoiceService', $datlich_chamsocvuon.dich_vu || '---');
			setText('invoiceLoaiNoiDon', $datlich_chamsocvuon.loai_noi_don || '---');
			setText('invoiceGoiDichVu', $datlich_chamsocvuon.goi_dich_vu || '---');
			setText('invoiceAddress', $datlich_chamsocvuon.diachikhachhang || '---');
			setText('invoiceTimeRange', `${formatTimeDisplay($datlich_chamsocvuon.gio_bat_dau_kehoach)} - ${formatTimeDisplay($datlich_chamsocvuon.gio_ket_thuc_kehoach)}`);
			setText('invoiceDate', `${formatDateDisplay($datlich_chamsocvuon.ngay_bat_dau_kehoach)}${$datlich_chamsocvuon.ngay_ket_thuc_kehoach ? ` -> ${formatDateDisplay($datlich_chamsocvuon.ngay_ket_thuc_kehoach)}` : ''}`);
			setText('invoiceRequest', $datlich_chamsocvuon.yeu_cau_khac || '---');
			setText('invoiceNote', $datlich_chamsocvuon.ghi_chu || '---');
			renderJobList($datlich_chamsocvuon.cong_viec || '');

			// --- Hiển thị ảnh & video từ Drive fileId (theo ok.html) ---
			function renderDriveFrame(rawId, frameId, emptyId) {
				const frame = $(frameId);
				const emptyEl = $(emptyId);
				if (!frame || !emptyEl) return;

				const id = (rawId || '').trim();
				if (!id) {
					emptyEl.style.display = '';
					frame.style.display = 'none';
					return;
				}

				const url = 'https://drive.google.com/file/d/' + id + '/preview';
				frame.src = url;
				emptyEl.style.display = 'none';
				frame.style.display = 'block';
			}

			renderDriveFrame($datlich_chamsocvuon.anh_id || '', 'invoiceMediaImageEl', 'invoiceMediaImageEmpty');
			renderDriveFrame($datlich_chamsocvuon.video_id || '', 'invoiceMediaVideoEl', 'invoiceMediaVideoEmpty');

			setText('customerCardName', $datlich_chamsocvuon.tenkhachhang || '---');
			setText('customerCardPhone', $datlich_chamsocvuon.sdtkhachhang || '---');
			setText('customerCardEmail', $datlich_chamsocvuon.emailkhachhang || '---');
			setText('customerCardAddress', $datlich_chamsocvuon.diachikhachhang || '---');
			const updateAvatarIframe = (id, fileId) => {
				const el = $(id);
				const img = $(id + 'Img');
				if (!el || !img) return;
				if (fileId) {
					el.src = 'https://drive.google.com/file/d/' + fileId + '/preview';
					el.style.display = 'block';
					img.style.display = 'none';
				} else {
					el.src = '';
					el.style.display = 'none';
					img.style.display = 'block';
				}
			};
			updateAvatarIframe('customerAvatar', $datlich_chamsocvuon.avatar_khachhang);

			setText('staffCardName', $datlich_chamsocvuon.tenncc || '---');
			setText('staffCardEmail', $datlich_chamsocvuon.emailncc || '---');
			setText('staffCardPhone', $datlich_chamsocvuon.sdtncc || '---');
			setText('staffCardAddress', $datlich_chamsocvuon.diachincc || '---');
			setText('staffReceiveTime', `Nhận việc: ${formatDateTimeDisplay($datlich_chamsocvuon.ngaynhan)}`);
			updateAvatarIframe('staffAvatar', $datlich_chamsocvuon.avatar_ncc);

			const status = $datlich_chamsocvuon.trangthai || '---';
			const invoiceStatusEl = $('badgeInvoiceStatus');
			if (invoiceStatusEl) {
				invoiceStatusEl.textContent = status;
				invoiceStatusEl.className = 'invoice-status-badge';
				if (String(status).toLowerCase().includes('hoàn thành')) invoiceStatusEl.classList.add('success');
				if (String(status).toLowerCase().includes('đang')) invoiceStatusEl.classList.add('warning');
				if (String(status).toLowerCase().includes('hủy') || String(status).toLowerCase().includes('quá hạn')) invoiceStatusEl.classList.add('danger');
			}
			$('badgeTimeState').textContent = status;
			$('badgeTimeState').className = statusBadgeClass(status);

			setText('timeStartPlan', `${formatTimeDisplay($datlich_chamsocvuon.gio_bat_dau_kehoach)}`.trim());
			setText('timeEndPlan', `${formatTimeDisplay($datlich_chamsocvuon.gio_ket_thuc_kehoach)}`.trim());
			setText('timeStartReal', formatDateTimeDisplay($datlich_chamsocvuon.thoigian_batdau_thucte));
			setText('timeEndReal', formatDateTimeDisplay($datlich_chamsocvuon.thoigian_ketthuc_thucte));

			const progress = Math.max(0, Math.min(100, toNum($datlich_chamsocvuon.tien_do || 0)));
			$('progressBar').style.width = `${progress}%`;
			setText('progressText', `${progress.toFixed(2)}%`);
			setText('invoiceProgressHero', `${Math.round(progress)}%`);
			const ring = $('invoiceProgressRing');
			if (ring) ring.style.setProperty('--p', progress.toFixed(2));
			const totalDayCount = Math.max(1, diffDays($datlich_chamsocvuon.ngay_bat_dau_kehoach, $datlich_chamsocvuon.ngay_ket_thuc_kehoach) + 1);
			const perDayPct = (100 / totalDayCount).toFixed(2);
			setText('progressHint', `Mỗi ngày cộng ${perDayPct}% (tổng ${totalDayCount} ngày). Tiến độ cộng dồn theo từng ngày làm việc.`);
			setText('dateStartPlan', formatDateDisplay($datlich_chamsocvuon.ngay_bat_dau_kehoach));
			setText('dateEndPlan', formatDateDisplay($datlich_chamsocvuon.ngay_ket_thuc_kehoach));
			setText('invoicePlanDays', `${totalDayCount} ngày`);
			// Render bảng lịch sử làm việc (cho cả staff và khách hàng xem)
			renderWorkHistoryTable();

			$('badgeStaff').textContent = toNum($datlich_chamsocvuon.id_nhacungcap) > 0 ? 'Đã nhận' : 'Chưa nhận';
			$('badgeStaff').className = toNum($datlich_chamsocvuon.id_nhacungcap) > 0 ? 'profile-status badge success' : 'profile-status badge warning';

			renderActionButtons();
			renderReview();
		}

		// =============================================
		// RENDER BẢNG LỊCH SỬ LÀM VIỆC
		// =============================================
		function renderWorkHistoryTable() {
			const emptyMsg = document.getElementById('workHistoryEmpty');
			const content = document.getElementById('workHistoryContent');
			const body = document.getElementById('workHistoryBody');
			if (!body) return;

			const rawRows = app.$workHistory || [];
			const endPlanTime = app.$datlich_chamsocvuon ? app.$datlich_chamsocvuon.gio_ket_thuc_kehoach : '';

			// Gộp các row theo ngày
			const groups = {};
			rawRows.forEach(r => {
				const d = (r.ngay_lam || '').slice(0, 10);
				if (!d) return;
				if (!groups[d]) groups[d] = { ngay_lam: d, start: '', end: '', note: '', isAuto: false };
				if (r.gio_bat_dau_trong_ngay) groups[d].start = r.gio_bat_dau_trong_ngay;
				if (r.gio_ket_thuc_trong_ngay) groups[d].end = r.gio_ket_thuc_trong_ngay;
				if (r.ghichu_cv_ngay) groups[d].note = r.ghichu_cv_ngay;
				if (r.is_auto_end == 1) groups[d].isAuto = true;
			});
			const rows = Object.values(groups).sort((a, b) => a.ngay_lam > b.ngay_lam ? -1 : 1);

			if (!rows.length) {
				if (emptyMsg) emptyMsg.classList.remove('hidden');
				if (content) content.classList.add('hidden');
				return;
			}

			if (emptyMsg) emptyMsg.classList.add('hidden');
			if (content) content.classList.remove('hidden');
			body.innerHTML = '';
			rows.forEach(r => {
				const isAutoEnd = r.isAuto || (endPlanTime && r.end === endPlanTime);
				const endCell = r.end
					? `${r.end} ${isAutoEnd ? '<i class="fa fa-info-circle text-warning" title="NCC quên nhấn Kết Thúc" style="cursor:pointer;color:#f0ba2c;" onclick="jsDialog.alert(\'NCC quên nhấn Kết Thúc\')"></i>' : ''}`
					: '<span style="color:#b0597a;">Chưa kết thúc</span>';

				const tr = document.createElement('tr');
				tr.style.borderBottom = '1px solid #f0d4e3';
				const dayIdx = rows.length - rows.indexOf(r);
				tr.innerHTML = `
						<td style="padding:5px 8px;font-weight:800;color:#1a4d2e;">Ngày ${dayIdx}</td>
						<td style="padding:5px 8px;">${formatDateDisplay(r.ngay_lam)}</td>
						<td style="padding:5px 8px;">${formatTimeDisplay(r.start)}</td>
						<td style="padding:5px 8px;">${endCell}</td>
						<td style="padding:5px 8px;">${r.note || ''}</td>
					`;
				body.appendChild(tr);
			});
		}
		async function updateCustomerAvatarIfNeeded() {
			const order = app.$datlich_chamsocvuon;
			const user = app.$user;
			if (app.role === 'customer' && order && user && String(app.params.sodienthoai) === String(order.sdtkhachhang)) {
				if (user.link_avatar && user.link_avatar !== order.avatar_khachhang) {
					await updateById(TABLE_ORDER, order.id, { avatar_khachhang: user.link_avatar });
					order.avatar_khachhang = user.link_avatar;
				}
			}
		}
		async function reloadOrder() {
			await loadOrderById();
			renderUI();
		}

		async function handleClaim() {
			const $datlich_chamsocvuon = app.$datlich_chamsocvuon || {};
			const statusText = String($datlich_chamsocvuon.trangthai || '').toLowerCase();
			if (statusText.includes('quá hạn')) {
				throw new Error('Đơn hàng quá hạn, không thể nhận việc');
			}

			const startPlanAt = buildPlanDateTime($datlich_chamsocvuon.ngay_bat_dau_kehoach, $datlich_chamsocvuon.gio_bat_dau_kehoach);
			if (startPlanAt && now().getTime() >= startPlanAt.getTime()) {
				if (toNum($datlich_chamsocvuon.id_nhacungcap) <= 0 && !statusText.includes('hủy') && !statusText.includes('hoàn thành')) {
					await updateById(TABLE_ORDER, $datlich_chamsocvuon.id, { trangthai: 'quá hạn' });
					await reloadOrder();
				}
				throw new Error('Đơn hàng quá hạn, không thể nhận việc');
			}

			await updateById(TABLE_ORDER, app.$datlich_chamsocvuon.id, {
				id_nhacungcap: app.$user.id,
				ngaynhan: nowSql(),
				tenncc: app.$user.hovaten || '',
				sdtncc: app.$user.sodienthoai || '',
				emailncc: app.$user.email || '',
				diachincc: app.$user.diachi || '',
				avatar_ncc: app.$user.link_avatar || ''
			});
			await reloadOrder();
		}

		async function handleCancel() {
			const $datlich_chamsocvuon = app.$datlich_chamsocvuon || {};
			const statusText = String($datlich_chamsocvuon.trangthai || '').toLowerCase();
			if (statusText.includes('hủy')) {
				setState('Đơn đã được hủy trước đó', 'info');
				return;
			}
			if (statusText.includes('quá hạn')) {
				setState('Đơn đã quá hạn nên không thể hủy', 'info');
				return;
			}

			const hasStaff = toNum($datlich_chamsocvuon.id_nhacungcap) > 0;
			const startPlanAt = buildPlanDateTime($datlich_chamsocvuon.ngay_bat_dau_kehoach, $datlich_chamsocvuon.gio_bat_dau_kehoach);
			if (startPlanAt && now().getTime() >= startPlanAt.getTime()) {
				if (!hasStaff && !statusText.includes('hoàn thành')) {
					await updateById(TABLE_ORDER, app.$datlich_chamsocvuon.id, { trangthai: 'quá hạn' });
					await reloadOrder();
					setState('Đã qua giờ bắt đầu, đơn tự động chuyển quá hạn', 'info');
					return;
				}
				throw new Error('Đã qua giờ bắt đầu kế hoạch nên không thể hủy đơn');
			}

			if (statusText.includes('hoàn thành') || $datlich_chamsocvuon.thoigian_batdau_thucte || $datlich_chamsocvuon.thoigian_ketthuc_thucte) {
				throw new Error('Đơn đã bắt đầu hoặc hoàn thành nên không thể hủy');
			}

			const cancelAt = nowSql();
			await updateById(TABLE_ORDER, app.$datlich_chamsocvuon.id, {
				trangthai: 'đã hủy',
				ngayhuy: cancelAt
			});
			await reloadOrder();
		}

		// handleHdrStart: bắt đầu tổng thể dịch vụ (lần duy nhất)
		async function handleHdrStart() {
			await updateById(TABLE_ORDER, app.$datlich_chamsocvuon.id, {
				trangthai: 'đang thực hiện',
				thoigian_batdau_thucte: nowSql(),
				thoigian_ketthuc_thucte: ''
			});
			await reloadOrder();
		}

		// handleHdrEnd: kết thúc tổng thể dịch vụ, chuyển trạng thái "hoàn thành"
		async function handleHdrEnd() {
			if (!await jsDialog.confirm('Bạn có chắc chắn muốn hoàn thành dịch vụ?')) return;
			await updateById(TABLE_ORDER, app.$datlich_chamsocvuon.id, {
				trangthai: 'hoàn thành',
				thoigian_ketthuc_thucte: nowSql(),
				tien_do: 100
			});
			await reloadOrder();
		}

		// handleStart: bắt đầu làm trong ngày - insert mới vào lich_su_lam_viec_mvb
		async function handleStart() {
			const idDv = app.$datlich_chamsocvuon.id;
			const todayStr = (() => {
				const d = now();
				const p = n => String(n).padStart(2, '0');
				return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
			})();
			// Insert record mới cho ngày hôm nay
			const newId = await insertRow(TABLE_HISTORY, {
				id_dv: idDv,
				ngay_lam: todayStr,
				gio_bat_dau_trong_ngay: nowTimeSql()
			});
			app.currentWorkLogId = newId;
			// Tính tiến độ: percentPerDay = 100 / totalDay
			const totalDay = Math.max(1, diffDays(app.$datlich_chamsocvuon.ngay_bat_dau_kehoach, app.$datlich_chamsocvuon.ngay_ket_thuc_kehoach) + 1);
			const percentPerDay = 100 / totalDay;
			const nextProgress = Math.min(100, toNum(app.$datlich_chamsocvuon.tien_do || 0) + percentPerDay);
			await updateById(TABLE_ORDER, idDv, { tien_do: Number(nextProgress.toFixed(2)) });
			// Làm mới lịch sử và UI
			app.$workHistory = await listHistoryByOrder(idDv);

			const todayLog = app.$workHistory.find(r => (r.ngay_lam || '').slice(0, 10) === todayStr && !r.gio_ket_thuc_trong_ngay);
			app.todayWorkLog = todayLog || null;

			await reloadOrder();
		}

		// handleEnd: kết thúc ngày làm - update vào đúng dòng của btnStart
		async function handleEnd() {
			if (!await jsDialog.confirm('Bạn có chắc chắn muốn kết thúc ngày hôm nay?')) return;
			const curTime = nowTimeSql();

			// Tìm id record cần update
			let workLogId = app.currentWorkLogId;
			if (!workLogId) {
				// fallback: tìm từ danh sách lịch sử
				const todayStr = (() => {
					const d = now();
					const p = n => String(n).padStart(2, '0');
					return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
				})();
				const log = (app.$workHistory || []).find(r => (r.ngay_lam || '').slice(0, 10) === todayStr && !r.gio_ket_thuc_trong_ngay);
				workLogId = log ? log.id : null;
			}

			if (workLogId) {
				await updateById(TABLE_HISTORY, workLogId, {
					gio_ket_thuc_trong_ngay: curTime
				});
			}

			app.currentWorkLogId = null;
			app.todayWorkLog = null;
			app.$workHistory = await listHistoryByOrder(app.$datlich_chamsocvuon.id);

			const btnE = document.getElementById('btnEnd');
			if (btnE) btnE.classList.add('hidden');
			const form = document.getElementById('staffWorkForm');
			if (form) {
				form.classList.remove('hidden');
				form.dataset.workLogId = workLogId || '';
			}
			await reloadOrder();
		}

		// handleSaveStaffLog: lưu ghi chú vào đúng dòng vừa kết thúc
		async function handleSaveStaffLog() {
			const note = document.getElementById('staffNote');
			const form = document.getElementById('staffWorkForm');
			const todayStr = (() => {
				const d = now();
				const p = n => String(n).padStart(2, '0');
				return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
			})();

			await insertRow(TABLE_HISTORY, {
				id_dv: app.$datlich_chamsocvuon.id,
				ngay_lam: todayStr,
				ghichu_cv_ngay: note ? note.value.trim() : ''
			});

			if (note) note.value = '';
			if (form) form.classList.add('hidden');
			app.$workHistory = await listHistoryByOrder(app.$datlich_chamsocvuon.id);
			renderWorkHistoryTable();
			setState('Đã lưu ghi chú công việc', 'info');
		}

		// checkAutoEndPreviousWorkDay: nếu có record chưa kết thúc từ ngày trước
		async function checkAutoEndPreviousWorkDay() {
			if (!app.$datlich_chamsocvuon) return;
			const idDv = app.$datlich_chamsocvuon.id;
			const history = await listHistoryByOrder(idDv);
			app.$workHistory = history;
			// Chỉ NCC mới thực hiện tự động kết thúc ngày làm việc nếu quên
			if (app.role !== 'staff') return;
			const todayStr = (() => {
				const d = now();
				const p = n => String(n).padStart(2, '0');
				return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
			})();
			// Tìm record chưa kết thúc từ ngày trước (không phải hôm nay)
			const incompleteOld = history.filter(r =>
				r.gio_bat_dau_trong_ngay
				&& !history.some(h => (h.ngay_lam || '').slice(0, 10) === (r.ngay_lam || '').slice(0, 10) && h.gio_ket_thuc_trong_ngay)
				&& (r.ngay_lam || '').slice(0, 10) < todayStr
			);
			const autoEndTime = app.$datlich_chamsocvuon.gio_ket_thuc_kehoach || '23:59:59';
			for (const r of incompleteOld) {
				// UPDATE dòng cũ
				await updateById(TABLE_HISTORY, r.id, {
					gio_ket_thuc_trong_ngay: autoEndTime,
					is_auto_end: 1
				});
			}
			// Làm mới sau khi auto-end
			app.$workHistory = await listHistoryByOrder(idDv);
			// Khôi phục currentWorkLogId nếu đang làm việc dở dang hôm nay
			const todayLog = app.$workHistory.find(r => (r.ngay_lam || '').slice(0, 10) === todayStr);
			app.todayWorkLog = todayLog || null;
			if (todayLog && todayLog.gio_bat_dau_trong_ngay && !todayLog.gio_ket_thuc_trong_ngay) {
				app.currentWorkLogId = todayLog.id;
			}
		}

		async function uploadReviewMedia(reviewRole, fileList) {
			const files = Array.from(fileList || []);
			if (!files.length) return [];
			const ids = [];
			for (const file of files) {
				const fd = new FormData();
				fd.append('file', file, file.name);
				const res = await fetch('../upload.php', { method: 'POST', body: fd });
				const json = await res.json();
				if (!json?.success) throw new Error(json?.message || 'Upload ảnh/video thất bại');
				ids.push(json.fileId);
			}
			return ids;
		}

		async function handleSaveCustomerReview() {
			if (!canSubmitCustomerReview()) {
				throw new Error('Đơn này không đủ điều kiện để khách hàng đánh giá');
			}
			const btn = $('btnSaveReview');
			const oldHtml = btn ? btn.innerHTML : '';
			if (btn) {
				btn.disabled = true;
				btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang tải đánh giá...';
			}

			try {
				const text = $('customerReview').value.trim();
				const mediaInput = $('customerMediaInput');
				const uploaded = await uploadReviewMedia('khachhang', mediaInput.files);
				const media = uploaded.length ? uploaded : parseMedia(app.$datlich_chamsocvuon.media_danhgia_khachhang);
				await updateById(TABLE_ORDER, app.$datlich_chamsocvuon.id, {
					danhgia_khachhang: text,
					media_danhgia_khachhang: JSON.stringify(media),
					thoigian_danhgia_khachhang: nowSql()
				});
				mediaInput.value = '';
				await reloadOrder();
			} finally {
				if (btn) {
					btn.disabled = false;
					btn.innerHTML = oldHtml;
				}
			}
		}

		async function handleSaveStaffReview() {
			if (toNum(app.$datlich_chamsocvuon?.id_nhacungcap) !== toNum(app.$user?.id)) {
				throw new Error('Chỉ nhân viên đã nhận công việc mới được đánh giá');
			}
			if (!canSubmitStaffReview()) {
				throw new Error('Đơn này không đủ điều kiện để nhân viên đánh giá');
			}
			const btn = $('btnSaveStaffReview');
			const oldHtml = btn ? btn.innerHTML : '';
			if (btn) {
				btn.disabled = true;
				btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang tải đánh giá...';
			}

			try {
				const text = $('staffReview').value.trim();
				const mediaInput = $('staffReviewMediaInput');
				const uploaded = await uploadReviewMedia('nhacungcap', mediaInput.files);
				const media = uploaded.length ? uploaded : parseMedia(app.$datlich_chamsocvuon.media_danhgia_nhanvien);
				await updateById(TABLE_ORDER, app.$datlich_chamsocvuon.id, {
					danhgia_nhanvien: text,
					media_danhgia_nhanvien: JSON.stringify(media),
					thoigian_danhgia_nhanvien: nowSql()
				});
				mediaInput.value = '';
				await reloadOrder();
			} finally {
				if (btn) {
					btn.disabled = false;
					btn.innerHTML = oldHtml;
				}
			}
		}

		async function handleAction(action) {
			try {
				if (action === 'claim') await handleClaim();
				if (action === 'cancel') await handleCancel();
				if (action === 'hdrStart') await handleHdrStart();
				if (action === 'hdrEnd') await handleHdrEnd();
				if (action === 'start') await handleStart();
				if (action === 'end') await handleEnd();
				if (action === 'saveStaffLog') await handleSaveStaffLog();
				if (action === 'saveCustomerReview') await handleSaveCustomerReview();
				if (action === 'saveStaffReview') await handleSaveStaffReview();
				if (action !== 'saveStaffLog') setState('Đã cập nhật thành công', 'info');
			} catch (e) {
				setState(e.message || 'Có lỗi xảy ra', 'error');
			}
		}

		function setState(text, type = 'info') {
			const box = $('stateMessage');
			box.textContent = text;
			box.className = `state show ${type}`;
			if (app.stateTimer) clearTimeout(app.stateTimer);
			app.stateTimer = setTimeout(() => {
				box.classList.remove('show');
			}, 2000);
		}

		async function init() {
			try {
				app.params = getUrlParams();
				if (!app.params.mahd || !app.params.sodienthoai || !app.params.password) {
					throw new Error('Bạn không thể truy cập trang này');
				}

				await loadAuthTables();
				await loadOrderById();
				const auth = findAuthUser();
				if (!auth) throw new Error('Bạn không thể truy cập trang này');
				app.role = auth.role;
				app.$user = auth.$user;
				await updateCustomerAvatarIfNeeded();
				// Kiểm tra và auto-end nếu NCC quên nhấn btnEnd từ ngày trước
				await checkAutoEndPreviousWorkDay();

				renderUI();
				show($('mainGrid'), true);
				const statusText = String(app.$datlich_chamsocvuon?.trangthai || '').toLowerCase();
				const noStaff = toNum(app.$datlich_chamsocvuon?.id_nhacungcap) <= 0;
				const showOverdueForStaff = app.role === 'staff' && noStaff && statusText.includes('quá hạn');
				setState(showOverdueForStaff ? 'Đơn hàng quá hạn' : 'Tải dữ liệu thành công', 'info');
			} catch (e) {
				show($('mainGrid'), false);
				setState(e.message || 'Bạn không thể truy cập trang này', 'error');
			}
		}

		function bindClick(id, action) {
			const el = $(id);
			if (!el) return;
			el.addEventListener('click', () => handleAction(action));
		}

		bindClick('btnHdrClaim', 'claim');
		bindClick('btnCancelService', 'cancel');
		bindClick('btnStart', 'start');       // bắt đầu làm trong ngày
		bindClick('btnHdrStart', 'hdrStart'); // bắt đầu tổng thể dịch vụ (độc lập)
		bindClick('btnEnd', 'end');           // kết thúc ngày
		bindClick('btnHdrEnd', 'hdrEnd');     // hoàn thành dịch vụ
		bindClick('btnSaveStaffLog', 'saveStaffLog');
		bindClick('btnSaveReview', 'saveCustomerReview');
		bindClick('btnSaveStaffReview', 'saveStaffReview');
		bindReviewPreview('customerMediaInput', 'customerReviewMediaGrid', 'media_danhgia_khachhang');
		bindReviewPreview('staffReviewMediaInput', 'staffReviewMediaGrid', 'media_danhgia_nhanvien');

		init();
	})();
</script>
<?php include 'layout-footer.php'; ?>