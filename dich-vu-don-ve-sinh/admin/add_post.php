<?php if(isset($_GET['success'])): ?>
    <p style="color:green;">✅ Đăng bài thành công!</p>
<?php endif; ?>

<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Đăng bài viết</title>

<style>
body{
    font-family: Arial;
    background:#f5f5f5;
    padding:30px;
}

.form-box{
    max-width:800px;
    margin:auto;
    background:#fff;
    padding:25px;
    border-radius:10px;
    box-shadow:0 5px 15px rgba(0,0,0,0.1);
}

input, textarea{
    width:100%;
    padding:10px;
    margin-top:10px;
    margin-bottom:20px;
    border:1px solid #ccc;
    border-radius:6px;
}

button{
    background:linear-gradient(135deg,#1abc9c,#16a085);
    color:white;
    padding:10px 20px;
    border:none;
    border-radius:6px;
    cursor:pointer;
    font-weight:600;
    transition:0.3s;
}

button:hover{
    transform:translateY(-1px);
    box-shadow:0 4px 10px rgba(26,188,156,0.3);
}

/* Nút quay lại */
.back-link{
    display:inline-flex;
    align-items:center;
    gap:6px;
    margin-top:15px;
    padding:10px 16px;
    background:#fff;
    border:1px solid #ddd;
    border-radius:8px;
    font-size:14px;
    font-weight:500;
    color:#333;
    text-decoration:none;
    transition:0.3s;
}

/* Hover */
.back-link:hover{
    background:#3498db;
    color:#fff;
    border-color:#3498db;
    transform:translateY(-1px);
    box-shadow:0 4px 10px rgba(52,152,219,0.2);
}

/* Active */
.back-link:active{
    transform:scale(0.97);
}

</style>

</head>

<body>

<div class="form-box">

<h2>Đăng bài viết</h2>

<form action="save_post.php" method="POST" enctype="multipart/form-data">

<label>Tiêu đề</label>
<input type="text" name="title" required>

<label>Nội dung</label>
<textarea name="content" rows="10" required></textarea>

<label>Hình ảnh</label>
<input type="file" name="image">

<div style="display:flex; justify-content:space-between; align-items:center;">
    <a href="dashboard.php" class="back-link">← Quay lại</a>
    <button type="submit">Đăng bài</button>
</div>

</form>

</div>
</body>
</html>