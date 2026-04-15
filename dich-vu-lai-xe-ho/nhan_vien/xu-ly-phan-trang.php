<?php
declare(strict_types=1);

/**
 * FILE XỬ LÝ PHÂN TRANG DÙNG CHUNG
 * Sử dụng cho cả admin, khách hàng, nhân viên
 */

if (!function_exists('pagination_get_page')) {
    /**
     * Lấy số trang hiện tại từ mảng source (GET hoặc POST)
     * @param array $source Mảng dữ liệu đầu vào (thường là $_GET)
     * @param string $pageKey Tên tham số trang (mặc định 'page')
     * @param int $defaultPage Trang mặc định (1)
     * @return int
     */
    function pagination_get_page(array $source, string $pageKey = 'page', int $defaultPage = 1): int
    {
        $page = (int)($source[$pageKey] ?? $defaultPage);
        return max(1, $page);
    }
}

if (!function_exists('pagination_array')) {
    /**
     * Phân trang mảng dữ liệu
     * @param array $rows Mảng dữ liệu cần phân trang
     * @param int $page Số trang hiện tại
     * @param int $perPage Số bản ghi mỗi trang
     * @return array [
     *   'items' => array,      // Dữ liệu của trang hiện tại
     *   'page' => int,         // Trang hiện tại
     *   'perPage' => int,      // Số bản ghi mỗi trang
     *   'offset' => int,       // Vị trí bắt đầu
     *   'totalItems' => int,   // Tổng số bản ghi
     *   'totalPages' => int,   // Tổng số trang
     *   'from' => int,         // Từ bản ghi thứ mấy
     *   'to' => int            // Đến bản ghi thứ mấy
     * ]
     */
    function pagination_array(array $rows, int $page = 1, int $perPage = 10): array
    {
        $safePerPage = max(1, $perPage);
        $totalItems = count($rows);
        $totalPages = max(1, (int)ceil($totalItems / $safePerPage));
        $safePage = min(max(1, $page), $totalPages);
        $offset = ($safePage - 1) * $safePerPage;
        $items = array_slice($rows, $offset, $safePerPage);
        $from = $totalItems > 0 ? ($offset + 1) : 0;
        $to = $totalItems > 0 ? min($offset + $safePerPage, $totalItems) : 0;

        return [
            'items' => $items,
            'page' => $safePage,
            'perPage' => $safePerPage,
            'offset' => $offset,
            'totalItems' => $totalItems,
            'totalPages' => $totalPages,
            'from' => $from,
            'to' => $to,
        ];
    }
}

if (!function_exists('pagination_build_url')) {
    /**
     * Xây dựng URL phân trang với các tham số
     * @param int $targetPage Trang đích
     * @param array $params Các tham số cần giữ lại (q, status, service...)
     * @param string $pageKey Tên tham số trang
     * @param string $path Đường dẫn gốc (mặc định lấy từ current)
     * @return string URL đã được xây dựng
     */
    function pagination_build_url(int $targetPage, array $params = [], string $pageKey = 'page', string $path = ''): string
    {
        $params[$pageKey] = max(1, $targetPage);

        // Lọc bỏ các giá trị rỗng
        $cleanParams = array_filter($params, static function ($value): bool {
            if ($value === null) {
                return false;
            }

            if (is_string($value)) {
                return trim($value) !== '';
            }

            if (is_array($value)) {
                return $value !== [];
            }

            return true;
        });

        $query = http_build_query($cleanParams);
        if ($query === '') {
            return $path;
        }

        $separator = strpos($path, '?') !== false ? '&' : '?';
        return $path . $separator . $query;
    }
}
?>