<?php
require_once "auth.php";
require_once "../main/db.php";

$id = $_GET['id'] ?? 0;

$stmt = $conn->prepare("SELECT * FROM posts WHERE id=?");
$stmt->bind_param("i", $id);
$stmt->execute();
$post = $stmt->get_result()->fetch_assoc();

if(!$post){
    die("Không tìm thấy bài viết");
}
?>
<head>
<meta charset="UTF-8">
<title>Sửa bài viết</title>

<style>
body{
    background:linear-gradient(135deg, #eef2f7, #f8f9fb);
    font-family:'Segoe UI', Arial, sans-serif;
    margin:0;
    padding:30px;
}

/* Card */
.form-container{
    max-width:650px;
    margin:40px auto;
    background:#fff;
    padding:30px;
    border-radius:14px;
    box-shadow:0 10px 30px rgba(0,0,0,0.08);
    transition:0.3s;
}

.form-container:hover{
    transform:translateY(-3px);
}

/* Title */
h2{
    text-align:center;
    margin-bottom:25px;
    font-weight:600;
}

/* Label */
label{
    font-weight:600;
    display:block;
    margin-bottom:6px;
    color:#333;
}

/* Input */
input[type="text"],
textarea{
    width:100%;
    padding:12px;
    border:1px solid #ddd;
    border-radius:8px;
    margin-bottom:18px;
    font-size:14px;
    transition:0.2s;
}

/* Focus effect */
input:focus, textarea:focus{
    outline:none;
    border-color:#3498db;
    box-shadow:0 0 0 2px rgba(52,152,219,0.15);
}

/* Image preview */
.preview{
    display:flex;
    justify-content:center;
    margin-bottom:15px;
}

.preview img{
    width:140px;
    border-radius:10px;
    box-shadow:0 4px 10px rgba(0,0,0,0.1);
}

/* File */
input[type="file"]{
    margin-bottom:20px;
}

/* Button */
button{
    width:100%;
    padding:14px;
    background:linear-gradient(135deg,#2ecc71,#27ae60);
    color:#fff;
    border:none;
    border-radius:8px;
    font-size:16px;
    font-weight:600;
    cursor:pointer;
    transition:0.3s;
}

button:hover{
    transform:translateY(-1px);
    box-shadow:0 6px 15px rgba(46,204,113,0.3);
}

/* Back link */
.back-link{
    display:block;
    text-align:center;
    margin-top:18px;
    text-decoration:none;
    color:#666;
    font-size:14px;
}

.back-link:hover{
    color:#000;
}
</style>

</head>
<body>

<div class="form-container">

<h2>✏️ Sửa bài viết</h2>

<form id="postForm" action="update_post.php" method="POST" enctype="multipart/form-data">

<input type="hidden" name="id" value="<?= $post['id'] ?>">

<label>Tiêu đề</label>
<input type="text" name="title" value="<?= htmlspecialchars($post['title']) ?>" required>

<label>Nội dung</label>
<textarea name="content" rows="10"><?= htmlspecialchars($post['content']) ?></textarea>

<label>Ảnh hiện tại:</label>
<div class="preview">
    <img id="previewImg" src="../uploads/<?= $post['image'] ?>">
</div>

<label>Chọn ảnh mới</label>
<input type="file" name="image" accept="image/*">

<button type="submit">💾 Cập nhật</button>

</form>

<a href="post.php" class="back-link">← Quay lại</a>

</div>

</body>
<script>
document.addEventListener("DOMContentLoaded", function(){

    const form = document.getElementById('postForm');
    const input = document.querySelector('input[type="file"]');
    const preview = document.getElementById('previewImg');

    let isDirty = false;

    // detect change
    document.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', () => {
            isDirty = true;
        });
    });

    // preview + validate image
    input.addEventListener('change', function(e){
        const file = e.target.files[0];

        if(file){
            if(!file.type.startsWith("image/")){
                alert("❌ Chỉ được upload ảnh!");
                input.value = "";
                return;
            }

            if(file.size > 2 * 1024 * 1024){
                alert("❌ Ảnh quá lớn (max 2MB)");
                input.value = "";
                return;
            }

            preview.src = URL.createObjectURL(file);
        }
    });

    // validate form
    form.addEventListener('submit', function(e){
        const title = document.querySelector('input[name="title"]').value.trim();
        const content = document.querySelector('textarea[name="content"]').value.trim();

        if(title === "" || content === ""){
            alert("❌ Vui lòng nhập đầy đủ tiêu đề và nội dung!");
            e.preventDefault();
            return;
        }

        const btn = form.querySelector('button');
        btn.innerText = "⏳ Đang cập nhật...";
        btn.disabled = true;
    });

    // warn before leave
    window.addEventListener('beforeunload', function (e) {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

});
</script>