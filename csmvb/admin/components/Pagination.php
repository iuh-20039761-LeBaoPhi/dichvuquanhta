<?php
/**
 * Render pagination component
 * @param array $pagination - pagination data from getPagination()
 * @param array $currentParams - current GET parameters to preserve
 * @param string $baseUrl - base URL for pagination links (optional)
 */
function renderPagination($pagination, $currentParams = [], $baseUrl = '') {
    // Always show pagination info, but only show navigation if more than 1 page

    $currentPage = $pagination['current_page'];
    $totalPages = $pagination['total_pages'];
    $hasNext = $pagination['has_next'];
    $hasPrev = $pagination['has_prev'];

    // Remove page from current params to avoid duplication
    unset($currentParams['page']);

    echo '<div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">';

    // Mobile pagination (simplified)
    echo '<div class="flex flex-1 justify-between sm:hidden">';
    if ($hasPrev) {
        $prevParams = array_merge($currentParams, ['page' => $currentPage - 1]);
        $prevUrl = $baseUrl . '?' . http_build_query($prevParams);
        echo '<a href="' . htmlspecialchars($prevUrl) . '" class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Trước</a>';
    } else {
        echo '<span class="relative inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">Trước</span>';
    }

    if ($hasNext) {
        $nextParams = array_merge($currentParams, ['page' => $currentPage + 1]);
        $nextUrl = $baseUrl . '?' . http_build_query($nextParams);
        echo '<a href="' . htmlspecialchars($nextUrl) . '" class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Sau</a>';
    } else {
        echo '<span class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">Sau</span>';
    }
    echo '</div>';

    // Desktop pagination (full)
    echo '<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">';

    // Results info
    $recordsPerPage = $pagination['records_per_page'] ?? $pagination['per_page'] ?? 20;
    $totalRecords = $pagination['total_records'] ?? $pagination['total_items'] ?? 0;
    $startItem = ($currentPage - 1) * $recordsPerPage + 1;
    $endItem = min($currentPage * $recordsPerPage, $totalRecords);
    echo '<div>';
    echo '<p class="text-sm text-gray-700">';
    echo 'Hiển thị <span class="font-medium">' . number_format($startItem) . '</span> đến <span class="font-medium">' . number_format($endItem) . '</span> ';
    echo 'trong tổng số <span class="font-medium">' . number_format($totalRecords) . '</span> kết quả';
    echo '</p>';
    echo '</div>';

    // Pagination links - only show if more than 1 page
    if ($totalPages > 1) {
        echo '<div>';
        echo '<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">';

        // Previous button
    if ($hasPrev) {
        $prevParams = array_merge($currentParams, ['page' => $currentPage - 1]);
        $prevUrl = $baseUrl . '?' . http_build_query($prevParams);
        echo '<a href="' . htmlspecialchars($prevUrl) . '" class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">';
        echo '<span class="sr-only">Trang trước</span>';
        echo '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">';
        echo '<path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />';
        echo '</svg>';
        echo '</a>';
    } else {
        echo '<span class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-300 ring-1 ring-inset ring-gray-300 cursor-not-allowed">';
        echo '<span class="sr-only">Trang trước</span>';
        echo '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">';
        echo '<path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />';
        echo '</svg>';
        echo '</span>';
    }

    // Page numbers
    $startPage = max(1, $currentPage - 2);
    $endPage = min($totalPages, $currentPage + 2);

    // Show first page and ellipsis if needed
    if ($startPage > 1) {
        $firstParams = array_merge($currentParams, ['page' => 1]);
        $firstUrl = $baseUrl . '?' . http_build_query($firstParams);
        echo '<a href="' . htmlspecialchars($firstUrl) . '" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">1</a>';

        if ($startPage > 2) {
            echo '<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>';
        }
    }

    // Page numbers around current page
    for ($i = $startPage; $i <= $endPage; $i++) {
        if ($i == $currentPage) {
            echo '<span aria-current="page" class="relative z-10 inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' . $i . '</span>';
        } else {
            $pageParams = array_merge($currentParams, ['page' => $i]);
            $pageUrl = $baseUrl . '?' . http_build_query($pageParams);
            echo '<a href="' . htmlspecialchars($pageUrl) . '" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">' . $i . '</a>';
        }
    }

    // Show last page and ellipsis if needed
    if ($endPage < $totalPages) {
        if ($endPage < $totalPages - 1) {
            echo '<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>';
        }

        $lastParams = array_merge($currentParams, ['page' => $totalPages]);
        $lastUrl = $baseUrl . '?' . http_build_query($lastParams);
        echo '<a href="' . htmlspecialchars($lastUrl) . '" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">' . $totalPages . '</a>';
    }

    // Next button
    if ($hasNext) {
        $nextParams = array_merge($currentParams, ['page' => $currentPage + 1]);
        $nextUrl = $baseUrl . '?' . http_build_query($nextParams);
        echo '<a href="' . htmlspecialchars($nextUrl) . '" class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">';
        echo '<span class="sr-only">Trang sau</span>';
        echo '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">';
        echo '<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />';
        echo '</svg>';
        echo '</a>';
    } else {
        echo '<span class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-300 ring-1 ring-inset ring-gray-300 cursor-not-allowed">';
        echo '<span class="sr-only">Trang sau</span>';
        echo '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">';
        echo '<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />';
        echo '</svg>';
        echo '</span>';
    }

        echo '</nav>';
        echo '</div>';
    }
    echo '</div>';
    echo '</div>';
}

/**
 * Enhanced getPagination function with better data structure
 * Only declare if not already exists in functions.php
 */
if (!function_exists('getPagination')) {
    function getPagination($currentPage, $totalItems, $itemsPerPage = 20) {
        $currentPage = max(1, (int)$currentPage);
        $itemsPerPage = max(1, (int)$itemsPerPage);
        $totalPages = ceil($totalItems / $itemsPerPage);
        $currentPage = min($currentPage, $totalPages);

        return [
            'current_page' => $currentPage,
            'per_page' => $itemsPerPage,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'has_prev' => $currentPage > 1,
            'has_next' => $currentPage < $totalPages,
            'start_item' => ($currentPage - 1) * $itemsPerPage + 1,
            'end_item' => min($currentPage * $itemsPerPage, $totalItems)
        ];
    }
}
?>