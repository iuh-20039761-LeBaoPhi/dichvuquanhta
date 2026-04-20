<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';

$admin = admin_require_login();
$id = (int)($_GET['id'] ?? 0);

$detail = get_hoadon_by_id($id);
$row = $detail['row'] ?? null;
$error = (string)($detail['error'] ?? '');

$statusText = trim((string)($row['trangthai'] ?? ''));
if ($statusText === '') {
	$statusText = 'N/A';
}

$statusRaw = function_exists('mb_strtolower') ? mb_strtolower($statusText, 'UTF-8') : strtolower($statusText);

$progressValue = (float)str_replace(',', '.', (string)($row['tien_do'] ?? '0'));
if (!is_finite($progressValue)) {
	$progressValue = 0.0;
}
$progressValue = max(0.0, min(100.0, $progressValue));
$progressText = rtrim(rtrim(number_format($progressValue, 2, '.', ''), '0'), '.');
if ($progressText === '') {
	$progressText = '0';
}

$jobItems = [];
$jobsRaw = trim((string)($row['cong_viec'] ?? ''));
if ($jobsRaw !== '') {
	$parts = preg_split('/\s*[\.\x{3002}]\s*/u', $jobsRaw) ?: [];
	foreach ($parts as $part) {
		$text = trim((string)$part);
		$text = preg_replace('/^[,;:\-\s]+/u', '', $text) ?? $text;
		if ($text !== '') {
			$jobItems[] = $text;
		}
	}
}
if (!$jobItems) {
	$jobItems = ['Chua cap nhat cong viec'];
}

$hasStart = trim((string)($row['thoigian_batdau_thucte'] ?? '')) !== '';
$hasEnd = trim((string)($row['thoigian_ketthuc_thucte'] ?? '')) !== '';
$isDone = $hasEnd || strpos($statusRaw, 'hoan thanh') !== false;
$isRunning = !$isDone && (strpos($statusRaw, 'dang') !== false || strpos($statusRaw, 'in progress') !== false);

$supplierAssigned =
	(int)($row['id_nhacungcap'] ?? 0) > 0
	|| trim((string)($row['tenncc'] ?? '')) !== ''
	|| trim((string)($row['hotenncc'] ?? '')) !== ''
	|| trim((string)($row['nhacungcapnhan'] ?? '')) !== '';

admin_render_layout_start('Chi Tiết đơn hàng', 'orders', $admin);
?>



<style>

		:root {
			--bg: #f4f7fb;
			--surface: #ffffff;
			--surface-soft: #f8fbff;
			--text: #1b2a3a;
			--muted: #6a7a8a;
			--primary: #0f80f2;
			--success: #19a56f;
			--warning: #ed9f1a;
			--danger: #d14242;
			--border: #e5edf5;
			--shadow: 0 20px 45px rgba(20, 50, 80, 0.12);
			--radius-xl: 22px;
			--radius-lg: 16px;
			--radius-md: 12px;
			--anim: 260ms cubic-bezier(.2, .7, .2, 1);
		}

		* {
			box-sizing: border-box;
		}

		html,
		body {
			margin: 0;
			padding: 0;
			min-height: 100%;
			font-family: "Be Vietnam Pro", sans-serif;
			color: var(--text);
			background:
				radial-gradient(circle at 20% -10%, #e3f0ff 0, transparent 42%),
				radial-gradient(circle at 95% 120%, #e5fff4 0, transparent 38%),
				var(--bg);
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
			background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
			box-shadow: var(--shadow);
			border: 1px solid rgba(16, 66, 113, 0.08);
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

		.topbar {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			gap: 14px;
			align-items: center;
			padding: 20px 24px;
			background: linear-gradient(100deg, #1170d8, #25b58b);
			color: #fff;
			position: sticky;
			top: 0;
			z-index: 50;
			box-shadow: 0 10px 24px rgba(8, 48, 82, 0.25);
		}

		.topbar-logo {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 98px;
			height: 66px;
			padding: 6px;
			border-radius: 14px;
			border: 1px solid rgba(255, 255, 255, 0.34);
			background: rgba(255, 255, 255, 0.14);
			box-shadow: 0 10px 22px rgba(9, 48, 88, 0.2);
			backdrop-filter: blur(4px);
			transition: transform var(--anim), background var(--anim), border-color var(--anim);
		}

		.topbar-logo:hover {
			transform: translateY(-2px);
			background: rgba(255, 255, 255, 0.22);
			border-color: rgba(255, 255, 255, 0.5);
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
			border: 1px solid rgba(255, 255, 255, 0.35);
			font-size: 12px;
			font-weight: 700;
			background: rgba(255, 255, 255, 0.15);
			color: #fff;
			backdrop-filter: blur(4px);
		}

		.content {
			padding: 18px;
		}

		.state {
			border-radius: var(--radius-md);
			padding: 14px 16px;
			margin: 0 0 16px;
			font-weight: 600;
			border: 1px solid;
			display: none;
		}

		.state.show {
			display: block;
		}

		.state.info {
			background: #edf6ff;
			border-color: #c5e0ff;
			color: #0f4b91;
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
			box-shadow: 0 7px 20px rgba(14, 45, 80, 0.06);
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

		.panel-title {
			margin: 0;
			font-size: 16px;
			font-weight: 800;
			color: #15314f;
		}

		.badge {
			padding: 5px 10px;
			border-radius: 999px;
			font-size: 11px;
			font-weight: 800;
			letter-spacing: .2px;
			background: #e8f3ff;
			color: #0d4d96;
			white-space: nowrap;
		}


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
			font-weight: 700;
			color: var(--muted);
			margin: 0 0 4px;
			text-transform: uppercase;
			letter-spacing: .5px;
		}

		.field-value {
			margin: 0;
			font-size: 14px;
			font-weight: 600;
			word-break: break-word;
		}

		#panelInvoice {
			padding: 0;
			min-height: auto;
			border: 0;
			box-shadow: none;
			background: transparent;
		}

		.invoice-hero {
			border-radius: 16px 16px 16px 16px;
			padding: 16px;
			color: #000000;
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
		}

		.invoice-status-badge {
			display: inline-flex;
			align-items: center;
			padding: 5px 10px;
			border-radius: 999px;
			font-size: 11px;
			font-weight: 800;
			background: rgba(255, 255, 255, 0.25);
			border: 1px solid rgba(255, 255, 255, 0.35);
			color: #020202;
		}

		.invoice-status-badge.success {
			background: rgb(27, 192, 131);
		}

		.invoice-status-badge.warning {
			background: rgba(217, 228, 16, 0.996);
		}

		.invoice-status-badge.danger {
			background: rgb(209, 66, 66);
		}

		.invoice-subtitle {
			margin: 0;
			font-size: 19px;
			font-weight: 600;
			opacity: .95;
		}



		.invoice-chip-btn {
			display: inline-flex;
			align-items: center;
			padding: 7px 11px;
			border-radius: 999px;
			font-size: 12px;
			font-weight: 700;
			background: rgba(255, 255, 255, 0.12);
			border: 1px solid rgba(255, 255, 255, 0.28);
		}

		.invoice-progress-ring {
			--p: 0;
			width: 122px;
			height: 122px;
			border-radius: 50%;
			background: conic-gradient(#b4f3d2 calc(var(--p) * 1%), rgba(255, 255, 255, 0.25) 0);
			padding: 7px;
			flex: 0 0 auto;
		}

		.invoice-progress-core {
			width: 100%;
			height: 100%;
			border-radius: 50%;
			background: rgba(17, 72, 124, 0.44);
			display: grid;
			place-content: center;
			text-align: center;
			backdrop-filter: blur(4px);
		}

		.invoice-progress-core strong {
			font-size: 34px;
			line-height: 1;
		}

		.invoice-progress-core small {
			font-size: 12px;
			font-weight: 700;
			opacity: .9;
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
			border: 1px solid rgba(214, 237, 255, 0.25);
			background: rgba(27, 74, 130, 0.2);
			border-radius: 12px;
			padding: 10px 12px;
			min-height: 96px;
		}

		.invoice-item-icon {
			width: 27px;
			height: 27px;
			border-radius: 999px;
			border: 1px solid rgba(91, 4, 4, 0.4);
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: 11px;
			font-weight: 800;
			background: rgba(255, 255, 255, 0.576);
			color: #060606;
			flex: 0 0 27px;
			margin-top: 2px;
		}

		.invoice-item-content {
			display: grid;
			gap: 2px;
			min-width: 0;
		}

		.invoice-item-content p {
			margin: 0;
			font-size: 11px;
			font-weight: 600;
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
			font-weight: 600;
			opacity: .9;
		}

		#invoicePrice {
			font-size: clamp(1.45rem, 2vw, 2.25rem);
			line-height: 1.08;
		}

		#invoiceTimeRange {
			font-size: clamp(1.2rem, 1.5vw, 1.75rem);
		}

		#invoiceDate {
			display: inline-block;
			margin-top: 2px;
		}

		.invoice-item.address #invoiceAddress {
			font-size: clamp(0.9rem, 1.05vw, 1.1rem);
			line-height: 1.35;
			display: block;
			white-space: normal;
			overflow: visible;
			word-break: break-word;
		}

		#panelJobs {
			padding: 0;
			overflow: hidden;
			gap: 0;
			border-color: #d7e7dc;
		}

		.jobs-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 10px;
			padding: 12px 14px;
			background: #f4f7fa;
			border-bottom: 1px solid #deebf2;
		}

		.jobs-title {
			margin: 0;
			font-size: 27px;
			font-weight: 800;
			color: #213d57;
		}

		.job-count {
			display: inline-flex;
			align-items: center;
			padding: 6px 10px;
			border-radius: 999px;
			font-size: 11px;
			font-weight: 800;
			color: #138259;
			background: #def8ea;
			border: 1px solid #c0ead3;
			white-space: nowrap;
		}

		.jobs-body {
			padding: 12px;
			background: #ecf8f1;
		}

		#panelJobs #invoiceJob {
			background: transparent;
			padding: 0;
			margin: 0;
			gap: 10px;
		}

		#panelJobs #invoiceJob li {
			background: rgba(255, 255, 255, 0.35);
			border: 1px solid #cfe9d9;
			border-radius: 10px;
			padding: 10px;
		}

		.jobs-meta {
			padding: 10px;
			border-top: 1px solid #deebf2;
			background: #fff;
		}

		.invoice-extra {
			border: 1px solid #c8d7ea;
			border-top: 0;
			border-radius: 0 0 14px 14px;
			background: #fff;
			padding: 12px;
			display: grid;
			gap: 10px;
		}

		.invoice-extra-grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}

		.invoice-media-grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
			margin: 4px;
		}

		.invoice-extra-item,
		.invoice-media-item {
			border: 1px solid #c8d7ea;
			background: #dfe9f7;
			border-radius: 8px;
			padding: 8px 10px;
			min-height: 72px;
		}

		.invoice-extra-item.full-width {
			grid-column: 1 / -1;
		}

		.invoice-media-row {
			display: flex;
			flex-direction: row;
			gap: 8px;
			margin-top: 8px;
		}

		.invoice-media-item {
			border: 1px solid #c8d7ea;
			background: #dfe9f7;
			border-radius: 8px;
			padding: 8px 10px;
			display: flex;
			flex-direction: column;
			gap: 6px;
			overflow: hidden;
		}

		.invoice-media-item .field-label {
			color: #3f5f7d;
			font-size: 10px;
			margin: 0;
			font-weight: 600;
		}

		.invoice-media-item img,
		.invoice-media-item video {
			width: 100%;
			flex: 1;
			object-fit: cover;
			border-radius: 5px;
			background: rgba(0, 0, 0, 0.04);
			display: block;
		}

		.invoice-media-item .media-empty-label {
			color: #8d9fb3;
			font-size: 11px;
			text-align: center;
			padding: 8px 0;
			flex: 1;
		}


		.invoice-extra .field-label {
			color: #3f5f7d;
			font-size: 10px;
		}

		.invoice-extra .field-value {
			font-size: 13px;
			font-weight: 700;
			color: #1f3853;
		}

		#invoiceJob {
			list-style: none;
			margin: 0;
			padding: 8px;
			border-radius: 10px;
			background: #d8f0de;
			display: grid;
			gap: 8px;
			counter-reset: job-item;
		}

		#invoiceJob li {
			counter-increment: job-item;
			display: flex;
			align-items: flex-start;
			gap: 8px;
			font-size: 13px;
			font-weight: 600;
			line-height: 1.45;
			color: #1f3853;
		}

		#invoiceJob li::before {
			content: counter(job-item);
			flex: 0 0 22px;
			height: 22px;
			border-radius: 999px;
			background: #22a06b;
			color: #fff;
			font-size: 12px;
			font-weight: 800;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			margin-top: 1px;
		}

		#panelCustomer,
		#panelStaff {
			padding: 0;
			overflow: hidden;
			gap: 0;
			border-color: #dce8f1;
		}

		.profile-head {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 10px;
			padding: 12px 14px;
			border-bottom: 1px solid #e1edf6;
			background: #f7fbff;
		}

		.profile-title {
			margin: 0;
			font-size: 18px;
			font-weight: 800;
			color: #213d57;
		}

		.profile-status {
			border-radius: 999px;
			padding: 5px 10px;
			font-size: 11px;
			font-weight: 800;
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
			border: 3px solid #e2f1ff;
			background: #d9e7f7;
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

		.profile-rate {
			margin: 0;
			font-size: 14px;
			font-weight: 700;
			color: #4d6175;
		}

		.profile-contact {
			margin: 0;
			font-size: 14px;
			font-weight: 700;
			color: #2f4961;
			display: flex;
			align-items: center;
			gap: 8px;
			word-break: break-word;
		}

		.profile-contact span {
			word-break: break-word;
		}

		.profile-rate .star {
			color: #f2b019;
			margin-right: 4px;
		}

		.profile-row {
			margin: 0;
			font-size: 15px;
			font-weight: 700;
			color: #2f4961;
			display: flex;
			align-items: flex-start;
			gap: 8px;
			word-break: break-word;
		}

		.profile-row::before,
		.profile-contact::before {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 18px;
			height: 18px;
			border-radius: 999px;
			background: #eaf4ff;
			color: #4d92df;
			font-size: 11px;
			line-height: 1;
			font-weight: 800;
			flex: 0 0 18px;
			margin-top: 1px;
		}

		.contact-email::before {
			content: '✉';
		}

		.contact-phone::before {
			content: '✆';
		}

		.contact-address::before {
			content: '⌂';
		}

		.profile-foot {
			padding: 0 14px 14px;
		}

		.profile-pill {
			display: inline-flex;
			align-items: center;
			padding: 8px 12px;
			border-radius: 10px;
			background: #eef2f6;
			font-size: 13px;
			font-weight: 700;
			color: #50657a;
		}

		.progress-inner {
			height: 100%;
			width: 0;
			transition: width 420ms ease, background 300ms ease;
			background: linear-gradient(90deg, #19a56f, #26c385);
		}

		.progress-inner.warn {
			background: linear-gradient(90deg, #f0ba2c, #e28c17);
		}

		.progress-inner.danger {
			background: linear-gradient(90deg, #df6a3e, #d14242);
		}

		#panelTime #badgeTimeState:not(.success):not(.warning):not(.danger) {
			background: #dcebff;
			color: #3b5ca4;
		}

		.hint {
			margin: 0;
			color: #4b6076;
			font-size: 13px;
		}

		.review-split {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
		}

		.review-box {
			border: 1px solid #d6e4f2;
			border-radius: 12px;
			padding: 10px;
			background: #f7fbff;
			display: grid;
			gap: 10px;
		}

		.review-head {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 8px;
		}

		.review-title {
			margin: 0;
			font-size: 14px;
			font-weight: 800;
			color: #15314f;
		}

		.review-display {
			display: grid;
			gap: 6px;
			padding: 8px;
			border-radius: 10px;
			border: 1px dashed #c9dced;
			background: #fff;
		}

		.review-text,
		.review-time {
			margin: 0;
			font-size: 13px;
			font-weight: 600;
			color: #1f3853;
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
			font-weight: 700;
			color: #5f7590;
			background: #edf4fc;
			border: 1px solid #d7e5f3;
			padding: 8px 10px;
			border-radius: 8px;
		}

		.hidden {
			display: none !important;
		}

		:root {
			--bg: #f6f9ff;
			--surface: #ffffff;
			--surface-soft: #f1fbff;
			--text: #030303;
			--muted: #5f6d8b;
			--primary: #5a7ae4;
			--success: #4a6bd9;
			--warning: #8aa2f0;
			--danger: #3b50c9;
			--border: #f0d4e3;
			--shadow: 0 20px 45px rgba(0, 0, 0, 0.18);
			--accent-peach: #b9efff;
			--accent-lavender: #d8dcff;
			--accent-mint: #cff5e8;
			--accent-rose: #a7b3f7;
		}

		html,
		body {
			background:
				radial-gradient(circle at 20% -10%, #dce7ff 0, transparent 42%),
				radial-gradient(circle at 95% 120%, #e8f5ff 0, transparent 38%),
				radial-gradient(circle at 85% 15%, rgb(248, 248, 248) 0, transparent 35%),
				radial-gradient(circle at 8% 88%, rgb(255, 255, 255) 0, transparent 30%),
				var(--bg);
		}

		.modal-card {
			background: linear-gradient(180deg, #ffffff 0%, #f8faff 62%, #f3faff 100%);
			border: 1px solid rgba(200, 88, 143, 0.2);
			box-shadow: 0 24px 48px rgba(196, 83, 138, 0.18), 0 6px 20px rgba(138, 170, 209, 0.12);
		}

		.topbar {
			background: linear-gradient(102deg, #69a0f3 0%, #86b0ef 58%, #a9cbff 100%) !important;
			box-shadow: 0 10px 24px rgba(169, 63, 114, 0.3);
		}

		.topbar-logo {
			border-color: rgba(255, 255, 255, 0.42);
			background: rgba(255, 255, 255, 0.2);
			box-shadow: 0 10px 22px rgba(166, 58, 110, 0.24);
		}

		.topbar-logo:hover {
			background: rgba(255, 255, 255, 0.3);
			border-color: rgba(255, 255, 255, 0.56);
		}

		.chip {
			background: rgba(255, 255, 255, 0.24);
			border-color: rgba(255, 255, 255, 0.45);
		}

		.panel {
			border-color: #f1d5e4;
			box-shadow: 0 12px 26px rgba(226, 113, 168, 0.12), 0 2px 8px rgba(191, 200, 219, 0.1);
		}

		.panel-title,
		.jobs-title,
		.profile-title,
		.review-title {
			color: #000000;
		}

		.badge {
			background: #e6eeff;
			color: #3f69a8;
			border: 1px solid #000000;
		}


		.invoice-hero {
			background: linear-gradient(118deg, #9bc0f9 0%, #c7e7f9 48%, #dbe4f9 72%, #d4e2ff 100%);
		}

		.invoice-progress-ring {
			background: conic-gradient(from -90deg, #5eb4f2 calc(var(--p) * 1%), rgba(255, 255, 255, 0.34) 0);
			border: 2px solid rgb(0, 0, 0);
			box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22), 0 10px 22px rgba(122, 34, 82, 0.28);
		}

		.invoice-progress-core {
			background:
				radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.22) 0, rgba(255, 255, 255, 0) 44%),
				linear-gradient(150deg, rgba(179, 202, 245, 0.94) 0%, rgba(138, 171, 241, 0.93) 100%);
			border: 2px solid rgb(0, 0, 0);
			box-shadow: inset 0 8px 14px rgba(255, 255, 255, 0.12);
			color: #ffffff;
		}

		.invoice-progress-core strong {
			color: #383cb0;
			/* text-shadow: 0 2px 8px rgba(168, 39, 99, 0.979); */
		}

		.invoice-progress-core small {
			color: #f3f9ff;
		}

		.invoice-item {
			border-color: rgba(227, 234, 255, 0.6);
			background: rgba(19, 95, 195, 0.22);
		}

		.invoice-extra {
			border-color: #d5dcf1;
			background: linear-gradient(180deg, #ffffff 0%, #f5f6fa 100%);
		}

		.invoice-extra-item,
		.invoice-media-item {
			border-color: #6587e6;
			background: #eef5ff;
		}

		.invoice-extra-item .field-label,
		.invoice-media-item .field-label {
			color: #3d83ec;
		}

		#panelJobs {
			border-color: #3d83ec;
		}

		.jobs-header {
			background: linear-gradient(135deg, #7cb1ee 0%, #e9f3ff 65%, #d8e8ff 100%);
			border-bottom-color: #f2d7e5;
		}

		.jobs-body {
			background: linear-gradient(180deg, #fcfcfc 0%, #f4f8ff 70%, #eef4ff 100%);
		}

		#panelJobs #invoiceJob li {
			background: rgb(255, 255, 255);
			border-color: #1149c2;
		}

		.jobs-meta {
			border-top-color: #ffffff;
			background: #ffffff;
		}

		#invoiceJob {
			background: linear-gradient(145deg, #fafafa 0%, #b4d0f1 100%);
		}

		#invoiceJob li {
			color: #2f546d;
		}

		#invoiceJob li::before {
			background: #4f92de;
		}

		#panelCustomer,
		#panelStaff {
			border-color: #5b81c7;
		}

		.profile-head {
			border-bottom-color: #dbe5f2;
			background: linear-gradient(135deg, #96afe4 0%, #f1f6ff 55%, #b3c8f0 100%);
		}

		.profile-avatar {
			border-color: #d6e4f6;
			background: #eaf2fd;
		}

		.profile-name,
		.profile-contact,
		.profile-row {
			color: #000000;
		}

		.profile-row::before,
		.profile-contact::before {
			background: #e7f1ff;
			color: #4f7dd2;
		}

		.profile-pill {
			background: linear-gradient(135deg, #f0f8ff 0%, #eef2ff 65%, #eaf0f8 100%);
			color: #445e8e;
			border: 1px solid #d0d3f0;
		}

		#panelTime {
			background: linear-gradient(180deg, #9fb8e6 0%, #d9e2f0 58%, #d9e5fa 100%) !important;
			border-color: #5e87d4 !important;
		}

		.progress-inner {
			background: linear-gradient(90deg, #aacaf5 0%, #6fa8ea 55%, #77d2e2 100%);
			box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.2), 0 3px 8px rgba(53, 92, 165, 0.26);
		}

		.progress-inner.warn {
			background: linear-gradient(90deg, #6a93ec, #a9caf4, #b1c6ff);
		}

		.progress-inner.danger {
			background: linear-gradient(90deg, #3f81cc, #679fe0);
		}

		#progressText {
			color: #000000;
			font-weight: 900;
			letter-spacing: 0.2px;
		}

		#progressHint {
			color: #3f5d7f;
			font-weight: 700;
		}

		#panelTime #badgeTimeState:not(.success):not(.warning):not(.danger) {
			background: #87a4ca;
			color: #000000;
		}

		.hint,
		.review-text,
		.review-time {
			color: #475c7c;
		}

		.review-box {
			border-color: #d1dfef;
			background: linear-gradient(180deg, #f7fbff 0%, #f7fbff 68%, #f1f8ff 100%);
		}

		.review-display {
			border-color: #d4e1f1;
			background: #fff;
		}

		.media-empty {
			background: linear-gradient(135deg, #f0f6ff 0%, #ecf3fb 100%);
			border-color: #d4e0f2;
			color: #4d638d;
		}

		.btn.btn-primary,
		.btn.btn-success,
		.btn.btn-warning,
		.btn.btn-danger {
			border: 0;
			box-shadow: 0 8px 18px rgba(193, 71, 130, 0.2);
		}

		.btn.btn-primary {
			border: 1px solid rgb(15, 15, 15);
			color: #000000 !important;
		}

		.btn.btn-success {
			border: 1px solid rgb(14, 14, 14);
			color: #000000 !important;
		}

		.btn.btn-warning {
			border: 1px solid red;
			color: #000000 !important;
		}

		.btn.btn-danger {
			background: linear-gradient(135deg, #3b79c9, #74a6e7) !important;
		}

		.btn.btn-primary:hover,
		.btn.btn-success:hover,
		.btn.btn-warning:hover,
		.btn.btn-danger:hover {
			filter: brightness(0.96);
		}

		@media (max-width: 1060px) {

			.grid,
			.info-grid,
			.review-split,
			.review-media-grid {
				grid-template-columns: 1fr;
			}

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
				padding: 8px 12px;
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
				text-align: left;
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

			.invoice-item-content h4 {
				font-size: 18px;
			}

			.panel {
				min-height: auto;
			}
		}

		@media (max-width: 640px) {
			.page {
				padding: 10px;
			}

			.content {
				padding: 10px;
			}

			.topbar {
				grid-template-columns: auto minmax(0, 1fr) auto;
				gap: 8px;
				padding: 12px 10px;
			}

			.topbar-title {
				font-size: 0.92rem;
			}

			.topbar-logo {
				width: 72px;
				height: 48px;
				padding: 4px;
			}

			.topbar-logo img {
				width: 54px;
				height: 36px;
			}

			#invoiceProgressRing {
				margin-inline: auto;
				width: 140px !important;
				height: 140px !important;
			}

			.invoice-progress-ring {
				width: 140px !important;
				height: 140px !important;
			}
		}

		@media (min-width: 768px) and (max-width: 1024px) {
			.invoice-main {
				display: grid !important;
				grid-template-columns: 1fr auto 1fr !important;
				align-items: center !important;
				text-align: left !important;
				gap: 20px !important;
			}

			.invoice-headline {
				width: auto !important;
			}

			.invoice-title-line {
				justify-content: flex-start !important;
			}

			.invoice-main .actions {
				margin: 0 !important;
				justify-content: center !important;
				width: auto !important;
			}

			#invoiceProgressRing {
				justify-self: end;
				margin: 0 !important;
				width: 120px !important;
				height: 120px !important;
				border-radius: 50% !important;
				aspect-ratio: 1 / 1 !important;
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

<div class="page" style="margin-top:-20px;min-height:auto;">
<section class="modal-card">
			<header class="topbar">
				<a class="topbar-logo" href="#" aria-label="Trang chủ">
					<img src="../assets/logo-he-thong.png" alt="Logo dịch vụ" />
				</a>
				<h1 class="topbar-title">ĐH Dọn Vệ Sinh</h1>
				<a class="topbar-logo" href="#" aria-label="Trang dịch vụ dọn vệ sinh">
					<img src="../assets/logo_main.png" alt="Logo dọn vệ sinh" />
				</a>
			</header>

			<div class="content">
				

				<section id="mainGrid" class="grid">
					<article class="panel panel-wide" id="panelInvoice">
						<div class="invoice-hero">
							<div class="invoice-main">
								<div class="invoice-headline">
									<div>
										<div class="invoice-title-line">
											<h2 class="invoice-order-title">Đơn #<span id="invoiceId"><?= admin_h(str_pad((string)($row["id"] ?? ""), 7, "0", STR_PAD_LEFT)) ?></span></h2>
											<span id="badgeInvoiceStatus" class="invoice-status-badge <?= strpos($statusRaw, 'hoan thanh') !== false ? 'success' : (strpos($statusRaw, 'huy') !== false || strpos($statusRaw, 'qua han') !== false ? 'danger' : (strpos($statusRaw, 'dang') !== false ? 'warning' : '')) ?>"><?= admin_h($statusText) ?></span>
										</div>
										<p id="invoiceService" class="invoice-subtitle"><?= admin_h(trim((string)($row['dich_vu'] ?? '')) !== '' ? (string)$row['dich_vu'] : '---') ?></p>
										<div class="invoice-title-line" style="margin-top: 5px; gap: 8px;">
											<span id="invoiceLoaiNoiDon" class="invoice-status-badge"
												style="background: rgba(255, 255, 255, 0.45); color: #000; border: 1px solid rgba(0,0,0,0.1);"><?= admin_h(trim((string)($row['loai_noi_don'] ?? '')) !== '' ? (string)$row['loai_noi_don'] : '---') ?></span>
											<span id="invoiceGoiDichVu" class="invoice-status-badge"
												style="background: rgba(255, 255, 255, 0.45); color: #000; border: 1px solid rgba(0,0,0,0.1);"><?= admin_h(trim((string)($row['goi_dich_vu'] ?? '')) !== '' ? (string)$row['goi_dich_vu'] : '---') ?></span>
										</div>
									</div>
								</div>
								
								<div id="invoiceProgressRing" class="invoice-progress-ring" style="--p:0;">
									<div class="invoice-progress-core">
										<strong id="invoiceProgressHero"><?= admin_h($progressText) ?>%</strong>
										<small>Hoàn thành</small>
									</div>
								</div>
							</div>

							<div class="invoice-summary">
								<div class="invoice-item">
									<span class="invoice-item-icon"><i class="fa fa-usd" aria-hidden="true"></i></span>
									<div class="invoice-item-content">
										<p>Tổng tiền</p>
										<h4 id="invoicePrice"><?= admin_h(trim((string)($row['tong_tien'] ?? '')) !== '' ? (string)$row['tong_tien'] : '0') ?></h4>
									</div>
								</div>
								<div class="invoice-item">
									<span class="invoice-item-icon"><i class="fa fa-clock-o"
											aria-hidden="true"></i></span>
									<div class="invoice-item-content">
										<p>Thời gian</p>
										<h4 id="invoiceTimeRange"><?= admin_h((trim((string)($row["gio_bat_dau_kehoach"] ?? "")) !== "" ? (string)$row["gio_bat_dau_kehoach"] : "--:--:--") . " - " . (trim((string)($row["gio_ket_thuc_kehoach"] ?? "")) !== "" ? (string)$row["gio_ket_thuc_kehoach"] : "--:--:--")) ?></h4>
										<span id="invoiceDate"><?= admin_h((trim((string)($row["ngay_bat_dau_kehoach"] ?? "")) !== "" ? (string)$row["ngay_bat_dau_kehoach"] : "---") . (trim((string)($row["ngay_ket_thuc_kehoach"] ?? "")) !== "" ? (" -> " . (string)$row["ngay_ket_thuc_kehoach"]) : "")) ?></span>
									</div>
								</div>
								<div class="invoice-item address">
									<span class="invoice-item-icon"><i class="fa fa-map-marker"
											aria-hidden="true"></i></span>
									<div class="invoice-item-content">
										<p>Địa chỉ</p>
										<h4 id="invoiceAddress"><?= admin_h(trim((string)($row['diachikhachhang'] ?? '')) !== '' ? (string)$row['diachikhachhang'] : 'N/A') ?></h4>
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
							<ol id="invoiceJob" class="field-value"><?php foreach ($jobItems as $item): ?><li><?= admin_h($item) ?></li><?php endforeach; ?></ol>
						</div>
						<div class="jobs-meta invoice-extra-grid">
							<div class="invoice-extra-item">
								<p class="field-label">Yêu cầu</p>
								<p id="invoiceRequest" class="field-value"><?= admin_h(trim((string)($row['yeu_cau_khac'] ?? '')) !== '' ? (string)$row['yeu_cau_khac'] : '---') ?></p>
							</div>
							<div class="invoice-extra-item">
								<p class="field-label">Ghi chú</p>
								<p id="invoiceNote" class="field-value"><?= admin_h(trim((string)($row['ghi_chu'] ?? '')) !== '' ? (string)$row['ghi_chu'] : '---') ?></p>
							</div>
						</div>
						<div class="invoice-media-grid">
							<div class="invoice-media-item" id="invoiceMediaImage">
								<p class="field-label">Ảnh</p>
								<span class="media-empty-label" id="invoiceMediaImageEmpty" style="<?= trim((string)($row["anh_id"] ?? "")) !== "" ? "display:none;" : "" ?>">Chưa có ảnh</span>
								<iframe id="invoiceMediaImageEl" style="<?= trim((string)($row["anh_id"] ?? "")) !== "" ? "display:block;" : "display:none;" ?>width:100%;flex:1;min-height:90px;border:0;border-radius:5px;" src="<?= trim((string)($row["anh_id"] ?? "")) !== "" ? "https://drive.google.com/file/d/" . admin_h((string)$row["anh_id"]) . "/preview" : "" ?>" allowfullscreen></iframe>
							</div>
							<div class="invoice-media-item" id="invoiceMediaVideo">
								<p class="field-label">Video</p>
								<span class="media-empty-label" id="invoiceMediaVideoEmpty" style="<?= trim((string)($row["video_id"] ?? "")) !== "" ? "display:none;" : "" ?>">Chưa có video</span>
								<iframe id="invoiceMediaVideoEl" style="<?= trim((string)($row["video_id"] ?? "")) !== "" ? "display:block;" : "display:none;" ?>width:100%;flex:1;min-height:90px;border:0;border-radius:5px;" src="<?= trim((string)($row["video_id"] ?? "")) !== "" ? "https://drive.google.com/file/d/" . admin_h((string)$row["video_id"]) . "/preview" : "" ?>" allowfullscreen></iframe>
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
								<span id="progressText"><?= admin_h($progressText) ?>%</span>
							</div>
							<div
								style="width:100%;height:21px;border-radius:999px;overflow:hidden;background:linear-gradient(180deg,#dce6f8 0%,#ffffff 100%);border:1px solid #0e2f75;box-shadow:inset 0 1px 2px rgb(255, 255, 255);">
								<div id="progressBar" class="progress-inner" style="width:<?= admin_h($progressText) ?>%;"></div>
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
									style="padding:7px 10px;border-right:1px solid #d3daef;color:#1f3853;"><?= admin_h(trim((string)($row['ngay_bat_dau_kehoach'] ?? '')) !== '' ? (string)$row['ngay_bat_dau_kehoach'] : '---') ?></span>
								<span id="dateEndPlan"
									style="padding:7px 10px;border-right:1px solid #d3daef;color:#1f3853;"><?= admin_h(trim((string)($row['ngay_ket_thuc_kehoach'] ?? '')) !== '' ? (string)$row['ngay_ket_thuc_kehoach'] : '---') ?></span>
								<span id="invoicePlanDays" style="padding:7px 10px;color:#1f3853;"><?= ((trim((string)($row["ngay_bat_dau_kehoach"] ?? "")) && trim((string)($row["ngay_ket_thuc_kehoach"] ?? ""))) ? round((strtotime((string)$row["ngay_ket_thuc_kehoach"]) - strtotime((string)$row["ngay_bat_dau_kehoach"]))/86400) + 1 : 1) ?> ngày</span>
							</div>
						</div>

						<div class="d-flex align-items-center flex-wrap" style="gap:8px;">
							<span style="font-size:12px;font-weight:800;color:#000000;">Trạng thái:</span>
							<span id="badgeTimeState" class="badge <?= strpos($statusRaw, 'hoan thanh') !== false ? 'success' : (strpos($statusRaw, 'huy') !== false || strpos($statusRaw, 'qua han') !== false ? 'danger' : (strpos($statusRaw, 'dang') !== false ? 'warning' : '')) ?>"><?= admin_h($statusText) ?></span>
							<span id="timeCurrentState" class="hidden">---</span>

							
						</div>

						<div style="border:1px solid #d3daef;border-radius:8px;overflow:hidden;background:#f7faff;">
							<div
								style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:#799ce7;color:#000000;font-size:12px;font-weight:800;">
								<span style="padding:7px 10px;">Thời gian dự kiến</span>
								<span style="padding:7px 10px;">Thời gian thực tế</span>
							</div>
							<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));">
								<div style="border-right:1px solid #dbe6f3;">
									<div class="d-flex justify-content-between align-items-center"
										style="gap:8px;padding:7px 10px;font-size:12px;"><span
											style="color:#000000;font-weight:700;">Bắt đầu</span><span
											id="timeStartPlan" style="color:#1f3853;font-weight:800;"><?= admin_h(trim((string)($row['gio_bat_dau_kehoach'] ?? '')) !== '' ? (string)$row['gio_bat_dau_kehoach'] : '---') ?></span></div>
									<div class="d-flex justify-content-between align-items-center"
										style="gap:8px;padding:7px 10px;border-top:1px solid #e3ecf7;font-size:12px;">
										<span style="color:#000000;font-weight:700;">Kết thúc</span><span
											id="timeEndPlan" style="color:#1f3853;font-weight:800;"><?= admin_h(trim((string)($row['gio_ket_thuc_kehoach'] ?? '')) !== '' ? (string)$row['gio_ket_thuc_kehoach'] : '---') ?></span>
									</div>
								</div>
								<div>
									<div class="d-flex justify-content-between align-items-center"
										style="gap:8px;padding:7px 10px;font-size:12px;"><span
											style="color:#000000;font-weight:700;">Bắt đầu</span><span
											id="timeStartReal" style="color:#1f3853;font-weight:800;"><?= admin_h(trim((string)($row['thoigian_batdau_thucte'] ?? '')) !== '' ? (string)$row['thoigian_batdau_thucte'] : '---') ?></span></div>
									<div class="d-flex justify-content-between align-items-center"
										style="gap:8px;padding:7px 10px;border-top:1px solid #e3ecf7;font-size:12px;">
										<span style="color:#000000;font-weight:700;">Kết thúc</span><span
											id="timeEndReal" style="color:#1f3853;font-weight:800;"><?= admin_h(trim((string)($row['thoigian_ketthuc_thucte'] ?? '')) !== '' ? (string)$row['thoigian_ketthuc_thucte'] : '---') ?></span>
									</div>
								</div>
							</div>
						</div>

						<div id="workHistoryTable" style="margin-top:4px;">
							<span style="font-size:12px;font-weight:800;color:#000000;">Lịch sử làm việc</span>
        <?php 
        $historyResult = get_work_history_by_datlich_id($id);
        $historyRows = $historyResult['rows'] ?? []; 
        // Sắp xếp giảm dần theo ID hoặc ngày để hiển thị mới nhất lên đầu
        usort($historyRows, fn($a, $b) => (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0));
        ?>
							<div id="workHistoryContent" style="overflow-x:auto;margin-top:4px; <?= empty($historyRows) ? 'display:none;' : '' ?>">
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
									
        <tbody id="workHistoryBody">
        <?php
        if ($historyRows):
            foreach ($historyRows as $idx => $r):
                $isAutoEnd = ($r["is_auto_end"] ?? 0) == 1 || (trim((string)($row["gio_ket_thuc_kehoach"] ?? "")) === trim((string)($r["gio_ket_thuc_trong_ngay"] ?? "")));
                $endCell = trim((string)($r["gio_ket_thuc_trong_ngay"] ?? "")) ? admin_h($r["gio_ket_thuc_trong_ngay"]) . ($isAutoEnd ? " <i class=\"fa fa-info-circle text-warning\" title=\"NCC quên nhấn Kết Thúc\" style=\"color:#f0ba2c;\"></i>" : "") : "<span style=\"color:#b0597a;\">Chưa kết thúc</span>";
        ?>
        <tr style="border-bottom:1px solid #f0d4e3;">
            <td style="padding:5px 8px;font-weight:800;color:#c21178;">Ngày <?= (count($historyRows) - $idx) ?></td>
            <td style="padding:5px 8px;"><?= admin_h(trim((string)($r["ngay_lam"] ?? "")) ? date("d/m/Y", strtotime((string)$r["ngay_lam"])) : "---") ?></td>
            <td style="padding:5px 8px;"><?= admin_h($r["gio_bat_dau_trong_ngay"] ?? "---") ?></td>
            <td style="padding:5px 8px;"><?= $endCell ?></td>
            <td style="padding:5px 8px;"><?= admin_h($r["ghichu_cv_ngay"] ?? "") ?></td>
        </tr>
        <?php endforeach; endif; ?>
        </tbody>
								</table>
							</div>
							<p id="workHistoryEmpty" style="font-size:12px;color:#000000;margin:0; <?= empty($historyRows) ? '' : 'display:none;' ?>">Chưa có lịch sử làm việc.</p>
						</div>

						
					</article>
					<article class="panel" id="panelCustomer">
						<div class="profile-head">
							<h2 class="profile-title">Khách hàng</h2>
							<span class="profile-status badge success">Khách hàng</span>
						</div>
						<div class="profile-body">
							<img id="customerAvatar" class="profile-avatar" src="../<?= admin_h(trim((string)($row['avatar_khachhang'] ?? '')) !== '' ? (string)$row['avatar_khachhang'] : 'assets/logo_main.png') ?>" onerror="this.src='../assets/logo_main.png'" alt="Khách hàng">
							<div class="profile-main">
								<h3 id="customerCardName" class="profile-name"><?= admin_h(trim((string)($row['tenkhachhang'] ?? '')) !== '' ? (string)$row['tenkhachhang'] : 'N/A') ?></h3>
								<p class="profile-contact contact-email"><span id="customerCardEmail"><?= admin_h(trim((string)($row['emailkhachhang'] ?? '')) !== '' ? (string)$row['emailkhachhang'] : 'N/A') ?></span></p>
								<p id="customerCardPhone" class="profile-row fa fa-phone"><?= admin_h(trim((string)($row['sdtkhachhang'] ?? '')) !== '' ? (string)$row['sdtkhachhang'] : 'N/A') ?></p>
								<p id="customerCardAddress" class="profile-row fa fa-map-marker"><?= admin_h(trim((string)($row['diachikhachhang'] ?? '')) !== '' ? (string)$row['diachikhachhang'] : 'N/A') ?></p>
							</div>
						</div>

					</article>

					<article class="panel" id="panelStaff">
						<div class="profile-head">
							<h2 class="profile-title">Nhà Cung Cấp phụ trách</h2>
							<span id="badgeStaff" class="profile-status badge <?= $supplierAssigned ? 'success' : 'warning' ?>"><?= $supplierAssigned ? 'Đã nhận' : 'Chưa nhận' ?></span>
						</div>
						<div class="profile-body">
							<img id="staffAvatar" class="profile-avatar" src="../<?= admin_h(trim((string)($row['avatar_ncc'] ?? '')) !== '' ? (string)$row['avatar_ncc'] : 'assets/logo_main.png') ?>" onerror="this.src='../assets/logo_main.png'" alt="Nhà Cung Cấp">
							<div class="profile-main">
								<h3 id="staffCardName" class="profile-name"><?= admin_h(trim((string)($row["tenncc"] ?? "")) !== "" ? (string)$row["tenncc"] : (trim((string)($row["hotenncc"] ?? "")) !== "" ? (string)$row["hotenncc"] : "N/A")) ?></h3>
								<!-- <p class="profile-rate"><span class="star">★</span><span id="staffRatingText">Chưa có đánh giá</span></p> -->
								<p id="staffCardEmail" class="profile-row contact-email"><?= admin_h(trim((string)($row['emailncc'] ?? '')) !== '' ? (string)$row['emailncc'] : 'N/A') ?></p>
								<p id="staffCardPhone" class="profile-row fa fa-phone"><?= admin_h(trim((string)($row["sdtncc"] ?? "")) !== "" ? (string)$row["sdtncc"] : (trim((string)($row["sodienthoaincc"] ?? "")) !== "" ? (string)$row["sodienthoaincc"] : "N/A")) ?></p>
								<p id="staffCardAddress" class="profile-row fa fa-map-marker"><?= admin_h(trim((string)($row['diachincc'] ?? '')) !== '' ? (string)$row['diachincc'] : 'N/A') ?></p>
							</div>
						</div>
						<div class="profile-foot">
							<span id="staffReceiveTime" class="profile-pill">Nhận việc: <?= admin_h(trim((string)($row['ngaynhan'] ?? '')) !== '' ? (string)$row['ngaynhan'] : 'N/A') ?></span>
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
									<span id="badgeCustomerReview" class="badge <?= trim((string)($row['danhgia_khachhang'] ?? '')) !== '' ? 'success' : 'warning' ?>"><?= trim((string)($row['danhgia_khachhang'] ?? '')) !== '' ? 'Đã gửi' : 'Chưa có' ?></span>
								</div>

								<div class="review-display">
									<p class="field-label">Nội dung đánh giá</p>
									<p id="customerReviewText" class="review-text"><?= admin_h(trim((string)($row['danhgia_khachhang'] ?? '')) !== '' ? (string)$row['danhgia_khachhang'] : 'Chưa có đánh giá') ?></p>
									<p class="field-label">Thời gian gửi</p>
									<p id="customerReviewTime" class="review-time"><?= admin_h(trim((string)($row['thoigian_danhgia_khachhang'] ?? '')) !== '' ? (string)$row['thoigian_danhgia_khachhang'] : '---') ?></p>
									<p class="field-label">Ảnh/video đánh giá</p>
									
        <div id="customerReviewMediaGrid" class="review-media-grid">
        <?php
        $mediaKhInfo = trim((string)($row['media_danhgia_khachhang'] ?? ''));
        $mediaKh = json_decode($mediaKhInfo, true) ?? [];
        if (!$mediaKh && $mediaKhInfo) {
            $mediaKh = preg_split('/[,;\s]+/', $mediaKhInfo, -1, PREG_SPLIT_NO_EMPTY);
        }
        if (!$mediaKh) {
            echo '<div class="media-empty">Chưa có tệp</div>';
        } else {
            foreach ($mediaKh as $m_id):
                $m_id = trim((string)$m_id);
                if ($m_id):
        ?>
            <iframe src="https://drive.google.com/file/d/<?= admin_h($m_id) ?>/preview" style="width:100%;height:200px;border:0;border-radius:6px;display:block;margin-bottom:6px;" allowfullscreen></iframe>
        <?php endif; endforeach; } ?>
        </div>
    
								</div>

								
							</section>

							<section class="review-box">
								<div class="review-head">
									<h3 class="review-title">Đánh giá nhà cung cấp</h3>
									<span id="badgeStaffReview" class="badge <?= trim((string)($row['danhgia_nhanvien'] ?? '')) !== '' ? 'success' : 'warning' ?>"><?= trim((string)($row['danhgia_nhanvien'] ?? '')) !== '' ? 'Đã gửi' : 'Chưa có' ?></span>
								</div>

								<div class="review-display">
									<p class="field-label">Nội dung đánh giá</p>
									<p id="staffReviewText" class="review-text"><?= admin_h(trim((string)($row['danhgia_nhanvien'] ?? '')) !== '' ? (string)$row['danhgia_nhanvien'] : 'Chưa có đánh giá') ?></p>
									<p class="field-label">Thời gian gửi</p>
									<p id="staffReviewTime" class="review-time"><?= admin_h(trim((string)($row['thoigian_danhgia_nhanvien'] ?? '')) !== '' ? (string)$row['thoigian_danhgia_nhanvien'] : '---') ?></p>
									<p class="field-label">Ảnh/video đánh giá</p>
									
									<div id="staffReviewMediaGrid" class="review-media-grid">
									<?php
									$mediaNvInfo = trim((string)($row['media_danhgia_nhanvien'] ?? ''));
									$mediaNv = json_decode($mediaNvInfo, true) ?? [];
									if (!$mediaNv && $mediaNvInfo) {
										$mediaNv = preg_split('/[,;\s]+/', $mediaNvInfo, -1, PREG_SPLIT_NO_EMPTY);
									}
									if (!$mediaNv) {
										echo '<div class="media-empty">Chưa có tệp</div>';
									} else {
										foreach ($mediaNv as $m_id):
											$m_id = trim((string)$m_id);
											if ($m_id):
									?>
										<iframe src="https://drive.google.com/file/d/<?= admin_h($m_id) ?>/preview" style="width:100%;height:200px;border:0;border-radius:6px;display:block;margin-bottom:6px;" allowfullscreen></iframe>
									<?php endif; endforeach; } ?>
									</div>
								</div>
							</section>
</div>

<?php admin_render_layout_end(); ?>
