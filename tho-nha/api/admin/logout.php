<?php
require_once dirname(__DIR__) . '/session.php';
session_destroy();
echo json_encode(['status'=>'success']);
