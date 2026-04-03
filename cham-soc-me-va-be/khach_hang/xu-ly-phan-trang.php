<?php
declare(strict_types=1);

if (!function_exists('pagination_get_page')) {
	function pagination_get_page(array $source, string $pageKey = 'page', int $defaultPage = 1): int
	{
		$page = (int)($source[$pageKey] ?? $defaultPage);
		return max(1, $page);
	}
}

if (!function_exists('pagination_array')) {
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
	function pagination_build_url(int $targetPage, array $params = [], string $pageKey = 'page', string $path = ''): string
	{
		$params[$pageKey] = max(1, $targetPage);

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