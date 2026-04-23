<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Bạn chưa đăng nhập admin.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$articleFile = __DIR__ . '/../../public/data/du-lieu-bai-viet.json';

function ghn_articles_response(bool $success, array $payload = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => $success] + $payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ghn_articles_read(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '[]', true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function ghn_articles_write(string $path, array $articles): void
{
    $dir = dirname($path);
    if (!is_dir($dir) || !is_writable($dir)) {
        throw new RuntimeException('Thư mục dữ liệu cẩm nang không ghi được.');
    }

    $encoded = json_encode(array_values($articles), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        throw new RuntimeException('Không mã hóa được dữ liệu cẩm nang.');
    }

    $handle = @fopen($path, 'cb+');
    if (!$handle) {
        throw new RuntimeException('Không mở được file JSON cẩm nang để ghi.');
    }

    $written = false;
    if (flock($handle, LOCK_EX)) {
        ftruncate($handle, 0);
        rewind($handle);
        $bytes = fwrite($handle, $encoded . PHP_EOL);
        fflush($handle);
        flock($handle, LOCK_UN);
        $written = $bytes !== false;
    }
    fclose($handle);

    if (!$written) {
        throw new RuntimeException('Không cập nhật được file JSON cẩm nang.');
    }
}

function ghn_articles_slugify(string $value): string
{
    $value = trim(function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value));
    $map = [
        'à'=>'a','á'=>'a','ạ'=>'a','ả'=>'a','ã'=>'a','â'=>'a','ầ'=>'a','ấ'=>'a','ậ'=>'a','ẩ'=>'a','ẫ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ặ'=>'a','ẳ'=>'a','ẵ'=>'a',
        'è'=>'e','é'=>'e','ẹ'=>'e','ẻ'=>'e','ẽ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ệ'=>'e','ể'=>'e','ễ'=>'e',
        'ì'=>'i','í'=>'i','ị'=>'i','ỉ'=>'i','ĩ'=>'i',
        'ò'=>'o','ó'=>'o','ọ'=>'o','ỏ'=>'o','õ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ộ'=>'o','ổ'=>'o','ỗ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ợ'=>'o','ở'=>'o','ỡ'=>'o',
        'ù'=>'u','ú'=>'u','ụ'=>'u','ủ'=>'u','ũ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ự'=>'u','ử'=>'u','ữ'=>'u',
        'ỳ'=>'y','ý'=>'y','ỵ'=>'y','ỷ'=>'y','ỹ'=>'y','đ'=>'d',
    ];
    $value = strtr($value, $map);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?: '';
    return trim($value, '-') ?: 'cam-nang';
}

function ghn_articles_normalize_tags($value): array
{
    if (is_array($value)) {
        $items = $value;
    } else {
        $items = explode(',', (string) $value);
    }

    $tags = [];
    foreach ($items as $item) {
        $tag = trim((string) $item);
        if ($tag !== '' && !in_array($tag, $tags, true)) {
            $tags[] = $tag;
        }
    }
    return $tags;
}

function ghn_articles_normalize_article(array $input, int $id): array
{
    $title = trim((string) ($input['title'] ?? ''));
    if ($title === '') {
        throw new InvalidArgumentException('Tiêu đề bài viết không được để trống.');
    }

    $status = (string) ($input['status'] ?? 'published');
    if (!in_array($status, ['published', 'hidden'], true)) {
        $status = 'published';
    }

    return [
        'id' => $id,
        'title' => $title,
        'slug' => ghn_articles_slugify((string) ($input['slug'] ?? $title)),
        'date' => trim((string) ($input['date'] ?? date('d/m/Y'))) ?: date('d/m/Y'),
        'description' => trim((string) ($input['description'] ?? '')),
        'img' => trim((string) ($input['img'] ?? '')),
        'category' => trim((string) ($input['category'] ?? 'Hướng dẫn')) ?: 'Hướng dẫn',
        'tags' => ghn_articles_normalize_tags($input['tags'] ?? []),
        'status' => $status,
        'content' => (string) ($input['content'] ?? ''),
    ];
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = (string) ($_GET['action'] ?? '');
$articles = ghn_articles_read($articleFile);

try {
    if ($method === 'GET' && $action === 'list') {
        ghn_articles_response(true, ['articles' => $articles]);
    }

    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) {
        throw new InvalidArgumentException('Payload không hợp lệ.');
    }
    $action = (string) ($body['action'] ?? $action);

    if ($method === 'POST' && $action === 'save') {
        $input = is_array($body['article'] ?? null) ? $body['article'] : [];
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            $ids = array_map(static fn($item) => (int) ($item['id'] ?? 0), $articles);
            $id = ($ids ? max($ids) : 0) + 1;
        }

        $nextArticle = ghn_articles_normalize_article($input, $id);
        $updated = false;
        foreach ($articles as $index => $article) {
            if ((int) ($article['id'] ?? 0) === $id) {
                $articles[$index] = $nextArticle;
                $updated = true;
                break;
            }
        }
        if (!$updated) {
            $articles[] = $nextArticle;
        }

        ghn_articles_write($articleFile, $articles);
        ghn_articles_response(true, ['message' => 'Đã lưu bài viết.', 'articles' => $articles, 'article' => $nextArticle]);
    }

    if ($method === 'POST' && $action === 'delete') {
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            throw new InvalidArgumentException('Thiếu ID bài viết để xóa.');
        }
        $articles = array_values(array_filter(
            $articles,
            static fn($article) => (int) ($article['id'] ?? 0) !== $id
        ));
        ghn_articles_write($articleFile, $articles);
        ghn_articles_response(true, ['message' => 'Đã xóa bài viết.', 'articles' => $articles]);
    }

    ghn_articles_response(false, ['message' => 'Action không hợp lệ.'], 400);
} catch (Throwable $error) {
    ghn_articles_response(false, ['message' => $error->getMessage()], 500);
}
