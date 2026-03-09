<?php
require_once __DIR__ . "/../../models/API_Models/Service.php";

class ServiceController {
    private $service;

    public function __construct() {
        $this->service = new Service();
        header("Content-Type: application/json");
    }

    public function index() {
        echo json_encode($this->service->all());
    }

    public function show($id) {
        echo json_encode($this->service->find($id));
    }

    public function store() {

        $input = json_decode(file_get_contents("php://input"), true);

        if (!$input) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid JSON"]);
            return;      
        }

        $data = [
            'service_name'    => $input['service_name'] ?? null,
            'summary'         => $input['summary'] ?? null,
            'service_price'   => $input['service_price'] ?? null,
        ];
        
        $result = $this->service->create($data);

        if ($result) {
            http_response_code(201);
            echo json_encode(["message" => "Thêm dịch vụ thành công"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Thêm dịch vụ thất bại"]);
        }
    }


    public function update($id) {
   
        $input = json_decode(file_get_contents("php://input"), true);

        if (!$input) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid JSON"]);
            return;      
        }

        $data = [
            'service_name'    => $input['service_name'],
            'summary'         => $input['summary'],
            'service_price'   => $input['service_price'],
            
        ];
        $result = $this->service->update($id, $data);

        if ($result) {
            http_response_code(201);
            echo json_encode(["message" => "Cập nhật dịch vụ thành công"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Cập nhật dịch vụ thất bại"]);
        }
    }

    public function destroy($id) {
        $this->service->delete($id);
        echo json_encode(["message" => "service deleted"]);
    }
}
