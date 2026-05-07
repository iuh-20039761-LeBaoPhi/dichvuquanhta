<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/admin_api_common.php';

admin_start_session();

if (empty($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

$action = trim((string) ($_POST['action'] ?? ''));

function phu_thu_redirect(string $msg, bool $ok, string $extra = ''): void
{
    $qs = 'ok=' . ($ok ? '1' : '0') . '&msg=' . urlencode($msg);
    if ($extra !== '') $qs .= '&' . $extra;
    header('Location: quan-ly-phu-thu.php?' . $qs);
    exit;
}

function phu_thu_build_data(array $post): array
{
    $loai = trim((string) ($post['loai'] ?? ''));

    $data = [
        'ten'             => trim((string) ($post['ten'] ?? '')),
        'phu_thu_percent' => (float) ($post['phu_thu_percent'] ?? 0),
        'loai'            => $loai,
        'mo_ta'           => trim((string) ($post['mo_ta'] ?? '')),
    ];

    if ($loai === 'le') {
        $ngay  = isset($post['ngay'])  && $post['ngay']  !== '' ? (int)$post['ngay']  : null;
        $thang = isset($post['thang']) && $post['thang'] !== '' ? (int)$post['thang'] : null;
        $nam   = isset($post['nam'])   && $post['nam']   !== '' ? (int)$post['nam']   : null;
        // Validate ranges
        $data['ngay']         = ($ngay  !== null && $ngay  >= 1  && $ngay  <= 31) ? $ngay  : null;
        $data['thang']        = ($thang !== null && $thang >= 1  && $thang <= 12) ? $thang : null;
        $data['nam']          = ($nam   !== null && $nam   >= 2000 && $nam <= 2100) ? $nam  : null;
        $data['gio_bat_dau']  = null;
        $data['gio_ket_thuc'] = null;
    } else {
        $data['ngay']         = null;
        $data['thang']        = null;
        $data['nam']          = null;
        $gioBatDau  = isset($post['gio_bat_dau'])  && $post['gio_bat_dau']  !== '' ? trim((string)$post['gio_bat_dau'])  : null;
        $gioKetThuc = isset($post['gio_ket_thuc']) && $post['gio_ket_thuc'] !== '' ? trim((string)$post['gio_ket_thuc']) : null;
        $data['gio_bat_dau']  = $gioBatDau;
        $data['gio_ket_thuc'] = $gioKetThuc;
    }

    return $data;
}

if ($action === 'them') {
    $data = phu_thu_build_data($_POST);
    if ($data['ten'] === '') phu_thu_redirect('Tên phụ thu không được trống.', false);
    $result = admin_api_insert_table('phu_thu_dac_biet', $data);
    phu_thu_redirect($result['success'] ? 'Thêm phụ thu thành công!' : $result['message'], $result['success']);
}

if ($action === 'sua') {
    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0) phu_thu_redirect('ID không hợp lệ.', false);
    $data = phu_thu_build_data($_POST);
    if ($data['ten'] === '') phu_thu_redirect('Tên phụ thu không được trống.', false);
    $result = admin_api_update_table('phu_thu_dac_biet', $id, $data);
    phu_thu_redirect($result['success'] ? 'Cập nhật thành công!' : $result['message'], $result['success'], $result['success'] ? '' : 'edit_id=' . $id);
}

if ($action === 'xoa') {
    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0) phu_thu_redirect('ID không hợp lệ.', false);
    $result = admin_api_delete_table('phu_thu_dac_biet', $id);
    phu_thu_redirect($result['success'] ? 'Đã xóa phụ thu thành công!' : $result['message'], $result['success']);
}

phu_thu_redirect('Hành động không hợp lệ.', false);
