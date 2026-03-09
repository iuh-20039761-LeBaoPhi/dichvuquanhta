<?php
require_once __DIR__ . "/../../models/API_Models/Statistic.php";

class StatisticController {
    private $statistic;

    public function __construct() {
        $this->statistic = new Statistic();
        header("Content-Type: application/json");
    }

    public function revenueTable() {

        $input = json_decode(file_get_contents("php://input"), true);

        if (!isset($input['month'], $input['year'])) {
            http_response_code(400);
            echo json_encode(["error" => "Vui lòng nhập đầy đủ tháng và năm"]);
            exit;   
        }

        $data = [
            'month' => $input['month'],
            'year' => $input['year'],
            
        ];
        $result = $this->statistic->find($data);

        if ($result) {
            http_response_code(200);
            echo json_encode(["data" => $result]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Không có dữ liệu thống kê cho tháng và năm này"]);
        }
    }


}
