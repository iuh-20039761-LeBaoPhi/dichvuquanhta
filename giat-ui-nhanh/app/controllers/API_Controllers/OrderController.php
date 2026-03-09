<?php
require_once __DIR__ . "/../../models/API_Models/Order.php";

class OrderController {
    private $order;

    public function __construct() {
        $this->order = new Order();
        header("Content-Type: application/json");
    }

    public function index() {
        echo json_encode($this->order->all());
    }

    public function show($id) {
        echo json_encode($this->order->find($id));
    }

    public function store() {

        $input = json_decode(file_get_contents("php://input"), true);

        if (!$input) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid JSON"]);
            return;      
        }

        $data = [
            'customer_name'    => $input['name'],
            'customer_tel'     => $input['phone'],
            'customer_address' => $input['address'],
            'service_id'     => $input['service'],
            'total_price'     => $input['price'],
            'note'             => $input['message'] ?? null,
        ];
        
        $result = $this->order->create($data);

        if ($result) {
            http_response_code(201);
            echo json_encode(["message" => "order created"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Create order failed"]);
        }
    }


    public function update($id) {
 
        $input = json_decode(file_get_contents("php://input"), true);

        if (!$input) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid JSON"]);
            return;      
        }

        $currentOrder = $this->order->find($id);

        if (!$currentOrder) {
            http_response_code(404);
            echo json_encode(["error" => "Đơn hàng không tồn tại"]);
            return;
        }

        if (
            $currentOrder['order_status'] === 'Completed' &&
            $currentOrder['transaction_status'] === 'Paid'
        ) {
            http_response_code(403);
            echo json_encode([
                "error" => "Đơn hàng đã hoàn tất và thanh toán, không thể cập nhật trạng thái"
            ]);
            return;
        }

        if (
            !isset($input['order_status']) ||
            !isset($input['transaction_status'])
        ) {
            http_response_code(422);
            echo json_encode(["error" => "Thiếu dữ liệu cập nhật"]);
            return;
        }

        $newOrderStatus = $input['order_status'];
        $newTransactionStatus = $input['transaction_status'];

        if (
            $newTransactionStatus === 'Paid' &&
            $newOrderStatus !== 'Completed'
        ) {
            http_response_code(400);
            echo json_encode([
                "error" => "Chỉ được thanh toán khi đơn hàng đã hoàn tất (Completed)"
            ]);
            return;
        }

        $data = [
            'order_status'       => $newOrderStatus,
            'transaction_status' => $newTransactionStatus,
        ];

        $result = $this->order->update($id, $data);

        if ($result) {
            http_response_code(201);
            echo json_encode(["message" => "Cập nhật đơn hàng thành công"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Cập nhật đơn hàng thất bại"]);
        }
    }

    public function destroy($id) {
        $this->order->delete($id);
        echo json_encode(["message" => "order deleted"]);
    }
    public function search() {

    $input = json_decode(file_get_contents("php://input"), true);

    if (empty($input['customer_tel'])) {
        http_response_code(400);
        echo json_encode([
            "error" => "Vui lòng nhập số điện thoại"
        ]);
        return;
    }

    $result = $this->order->searchOrder([
        'customer_tel' => $input['customer_tel']
    ]);

    http_response_code(200);
    echo json_encode([
        "data" => $result
    ]);
}

}
