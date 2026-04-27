<?php
/**
 * File điều hướng (Redirect)
 * Mục đích: Để link từ Admin Dashboard chung (../admin-chuyendon/index.php) 
 * vẫn hoạt động đúng mà không cần sửa code ở trang Dashboard.
 */
header("Location: public/index.php");
exit;
