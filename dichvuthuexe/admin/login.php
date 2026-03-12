<!DOCTYPE html>
<html lang="vi">
<head>
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
    <title>Admin Login</title>

<style>
    * {
    box-sizing: border-box;
}

    /* ===== LOGIN PAGE ===== */
.login-body {
    min-height: 100vh;
    background: linear-gradient(135deg, #1e3c72, #2a5298);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Segoe UI", Tahoma, sans-serif;
}

/* Box login */
.login-box {
    width: 360px;
    background: #fff;
    padding: 30px 28px;
    border-radius: 14px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    text-align: center;
    animation: fadeIn 0.6s ease;
}

/* Title */
.login-box h2 {
    margin-bottom: 22px;
    font-size: 22px;
    color: #1e3c72;
    font-weight: 600;
}

/* Form input */
.login-box input {
    width: 100%;
    padding: 12px 14px;
    margin-bottom: 14px;
    border-radius: 8px;
    border: 1px solid #ddd;
    font-size: 14px;
    outline: none;
    transition: all 0.25s ease;
}

.login-box input:focus {
    border-color: #2a5298;
    box-shadow: 0 0 0 2px rgba(42, 82, 152, 0.15);
}

/* Button */
.login-box button {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: none;
    background: linear-gradient(135deg, #1e3c72, #2a5298);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.login-box button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}
.login-box input:hover {
    border-color: #b5c7e6;
}
.login-box button:active {
    transform: scale(0.98);
}
.error {
    background: #ffe6e6;
    color: #c0392b;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 14px;
    font-size: 14px;
}

/* Animation */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

</style>
</head>
<body class="login-body">

<div class="login-box">
    <h2>🚗 Admin Login</h2>

    <form action="login_process.php" method="POST">
        <input type="text" name="username" placeholder="Tài khoản" required>
        <input type="password" name="password" placeholder="Mật khẩu" required>
        <button type="submit">Đăng nhập</button>
    </form>
  

</div>

</body>
</html>
