<?php
// Tách biệt session với các project khác trên cùng domain localhost
if (session_status() === PHP_SESSION_NONE) {
    session_name('THUEXE_SID');
    session_start();
}
