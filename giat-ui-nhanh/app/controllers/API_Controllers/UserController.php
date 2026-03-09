<?php
require_once __DIR__ . "/../../models/API_Models/User.php";

class UserController {
    private $user;

    public function __construct() {
        $this->user = new User();
        header("Content-Type: application/json");
    }

    public function index() {
        echo json_encode($this->user->all());
    }

    public function show($id) {
        echo json_encode($this->user->find($id));
    }

    public function store() {
        $data = json_decode(file_get_contents("php://input"), true);
        $this->user->create($data);
        echo json_encode(["message" => "User created"]);
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $this->user->update($id, $data);
        echo json_encode(["message" => "User updated"]);
    }

    public function destroy($id) {
        $this->user->delete($id);
        echo json_encode(["message" => "User deleted"]);
    }
    public function login() {
    session_start(); 

    $input = json_decode(file_get_contents("php://input"), true);

    if (!isset($input['email'], $input['password'])) {
        http_response_code(400);
        echo json_encode([
            "error" => "Vui lòng nhập đầy đủ email và mật khẩu"
        ]);
        exit;
    }

    $data = [
        'user_email'    => $input['email'],
        'user_password' => $input['password'],
    ];

    $result = $this->user->submitLogin($data);

    if (!$result) {
        http_response_code(401);
        echo json_encode([
            "error" => "Sai tài khoản hoặc mật khẩu"
        ]);
        exit;
    }

    $_SESSION['user'] = $result;

    http_response_code(200);
    echo json_encode([ "data" =>  $_SESSION['user']]);
    exit;
}


}
