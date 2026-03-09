<?php
    class PageController{
        function home(){
            require_once "./app/views/page_home.php";
        }
        function dashboard(){
            if(!isset($_SESSION['user'])){
                header("Location: ?ctrl=page&act=login");
                exit();
            }
            require_once "./app/views/admin/page_dashboard.php";
        }
        function service(){
            if(!isset($_SESSION['user'])){
                header("Location: ?ctrl=page&act=login");
                exit();
            }
            require_once "./app/views/admin/page_service.php";
        }
        function statistic(){
            if(!isset($_SESSION['user'])){
                header("Location: ?ctrl=page&act=login");
                exit();
            }
            require_once "./app/views/admin/page_statistic.php";
        }
        function login(){
            require_once "./app/views/admin/page_login.php";
        }
        function logout(){
            session_destroy();
            header("Location: ?ctrl=page&act=login");
            exit();
        }
        
}
?>