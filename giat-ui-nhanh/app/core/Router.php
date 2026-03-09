<?php

require_once __DIR__ . "/../controllers/API_Controllers/UserController.php";
require_once __DIR__ . "/../controllers/API_Controllers/OrderController.php";
require_once __DIR__ . "/../controllers/API_Controllers/ServiceController.php";
require_once __DIR__ . "/../controllers/API_Controllers/StatisicController.php";

class Router {

    public static function route($method, $uri) {

        $path = parse_url($uri, PHP_URL_PATH);

        $basePath = '/Giat-Ui-Nhanh/public';
        $path = str_replace($basePath, '', $path);
        $path = trim($path, '/');

        $segments = explode('/', $path);

        $resource = $segments[0] ?? null;
        $id = $segments[1] ?? null;

        switch ($resource) {
            case 'users':
                $controller = new UserController();

                if ($method === 'GET' && !$id) {
                    $controller->index();
                }
                elseif ($method === 'GET' && $id) {
                    $controller->show($id);
                }
                elseif ($method === 'POST') {
                    $controller->store();
                }
                elseif ($method === 'PUT' && $id) {
                    $controller->update($id);
                }
                elseif ($method === 'DELETE' && $id) {
                    $controller->destroy($id);
                }
                else {
                    self::methodNotAllowed();
                }
                break;
            case 'orders':
                $controller = new OrderController();

                if ($method === 'GET' && !$id) {
                    $controller->index();
                }
                elseif ($method === 'GET' && $id) {
                    $controller->show($id);
                }
                elseif ($method === 'POST') {
                    $controller->store();
                }
                elseif ($method === 'PUT' && $id) {
                    $controller->update($id);
                }
                elseif ($method === 'DELETE' && $id) {
                    $controller->destroy($id);
                }
                else {
                    self::methodNotAllowed();
                }
                break;
            case 'services':
                $controller = new ServiceController();

                if ($method === 'GET') {
                    $controller->index();
                }
                elseif ($method === 'POST') {
                    $controller->store();
                }
                elseif ($method === 'PUT' && $id) {
                    $controller->update($id);
                }
                else {
                    self::methodNotAllowed();
                }
                break;
            case 'logins':
                if ($method === 'POST') {
                    (new UserController())->login();
                }
                else {
                    self::methodNotAllowed();
                }
                break;
            case 'statistics':
                if ($method === 'POST') {
                    (new StatisticController())->revenueTable();
                }
                else {
                    self::methodNotAllowed();
                }
                break;
            case 'search_orders':
                $controller = new OrderController();

                if ($method === 'POST') {
                    $controller->search();
                }
                else {
                    self::methodNotAllowed();
                }
                break;
            default:
                self::notFound();
        }
    }

    private static function methodNotAllowed() {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

    private static function notFound() {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
}
