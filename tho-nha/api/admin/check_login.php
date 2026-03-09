<?php
session_start();

if(isset($_SESSION['admin_id'])){
    echo json_encode([
        'status'=>'logged_in',
        'username'=>$_SESSION['admin_username']
    ]);
}else{
    echo json_encode(['status'=>'not_logged_in']);
}
