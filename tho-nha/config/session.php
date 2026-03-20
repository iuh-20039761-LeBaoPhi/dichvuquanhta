<?php
if (session_status() === PHP_SESSION_NONE) {
    session_name('THONHA_SID');
    session_start();
}
