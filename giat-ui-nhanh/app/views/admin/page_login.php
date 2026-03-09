<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link
      rel="icon"
      href="public/asset/image/Laundry logo vector _ Premium Vector.png"
      type="image/x-icon"
    />
    <title>Đăng Nhập Admin</title>

    <link rel="stylesheet" href="public/asset/css/bootstrap.min.css">

    <link rel="stylesheet" href="public/asset/css/login.css">

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
</head>
<body>
    <div class="login-wrapper">
        <div class="container-fluid">
            <div class="row justify-content-center">
                <div class="col-12 col-md-6 col-lg-5">
                    <div class="card login-card">
                        <div class="card-body p-4 p-md-5">
                            <!-- Header -->
                            <div class="login-header">
                                <div class="icon">
                                    <i class="bi bi-shield-lock-fill"></i> <!-- Sử dụng Bootstrap Icons nếu có, hoặc thay bằng text -->
                                </div>
                                <h2 class="fw-bold text-dark mb-2">GIẶT ỦI NHANH</h2>
                                <p class="text-muted mb-0">Đăng nhập để truy cập hệ thống quản trị</p>
                            </div>
                          
                            <div id="loginAlert" class="alert d-none" role="alert">
                            </div>
                            <!-- Login Form -->
                            <form id="loginForm">
                                <!-- Email Input -->
                                <div class="mb-3">
                                    <label for="email" class="form-label fw-semibold text-dark">Email</label>
                                    <input 
                                        type="email" 
                                        class="form-control form-control-lg" 
                                        id="email" 
                                        placeholder="Nhập email" 
                                        name="email"
                                        required 
                                    >
                                </div>

                                <!-- Password Input -->
                                <div class="mb-3">
                                    <label for="password" class="form-label fw-semibold text-dark">Mật khẩu</label>
                                    <input 
                                        type="password" 
                                        class="form-control form-control-lg" 
                                        id="password" 
                                        placeholder="Nhập mật khẩu" 
                                        name="password"
                                        required 
                                    >
                                </div>

                                <!-- Submit Button -->
                                <button type="submit" class="btn btn-primary btn-login w-100 text-white">
                                    Đăng Nhập
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
<script src="public/asset/js/bootstrap.bundle.min.js"></script>
<script type="text/javascript" src="public/asset/js/database.js"></script>
</body>
</html>

