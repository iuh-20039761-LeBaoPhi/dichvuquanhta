<?php
    session_start();
    if(isset($_GET['ctrl']) && isset($_GET['act'])){
        require_once "./app/controllers/" . ucfirst($_GET['ctrl']) . "Controller.php";
        $ctrl = new (ucfirst ($_GET["ctrl"]) . "Controller")();
        $act = $_GET['act'];
        $args = array_splice($_GET, 2, count($_GET) -2); // Lấy các tham số còn lại sau 'ctrl' và 'act'
        $ctrl -> $act(...$args);
    }else{
        require_once './app/controllers/PageController.php';
        $ctrl = new PageController();
        $ctrl ->home();
    } 
?>
