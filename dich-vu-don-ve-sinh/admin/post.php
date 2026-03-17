<?php
require_once "../main/db.php";

$result = $conn->query("SELECT * FROM posts ORDER BY id DESC");
?>

<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Quản lý bài viết</title>

<style>
body{
    background:#f4f6f9;
    font-family:Arial, sans-serif;
    margin:0;
    padding:20px;
}

/* Tiêu đề */
h2{
    margin-bottom:10px;
}

/* Nút thêm bài */
a[href="add_post.php"]{
    display:inline-block;
    background:#2ecc71;
    color:#fff;
    font-weight:bold;
    margin-bottom:15px;
}

/* Card chứa table */
.table-container{
    background:#fff;
    padding:20px;
    border-radius:10px;
    box-shadow:0 4px 10px rgba(0,0,0,0.05);
}

/* Table */
table{
    width:100%;
    border-collapse:collapse;
}

th{
    background:#f8f9fa;
}

th, td{
    padding:12px;
    border-bottom:1px solid #eee;
    text-align:left;
}

/* Hover dòng */
tr:hover{
    background:#f1f1f1;
}

/* Ảnh */
img{
    width:80px;
    border-radius:6px;
}

/* Nút chung */
a{
    text-decoration:none;
    padding:5px 10px;
    border-radius:5px;
    font-size:14px;
}

/* Hover */
a:hover{
    opacity:0.8;
}

/* Nút sửa */
a[href*="edit"]{
    background:#3498db;
    color:#fff;
}

/* Nút xóa */
a[href*="delete"]{
    background:#e74c3c;
    color:#fff;
}
td{
    vertical-align:middle;
}


/* Nút quay lại */
.back-link{
    display:inline-flex;
    align-items:center;
    gap:6px;
    margin-top:20px;
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

/* Active (bấm xuống) */
.back-link:active{
    transform:scale(0.97);
}

</style>

</head>

<body>

<h2>📚 Quản lý bài viết</h2>
<a href="add_post.php">➕ Thêm bài viết</a>

<div class="table-container">
<table>
<tr>
    <th>ID</th>
    <th>Tiêu đề</th>
    <th>Ảnh</th>
    <th>Ngày</th>
    <th>Hành động</th>
</tr>

<?php while($row = $result->fetch_assoc()): ?>

<tr>
    <td><?= $row['id'] ?></td>
    <td><?= htmlspecialchars($row['title']) ?></td>

    <td>
        <img src="../uploads/<?= $row['image'] ?>">
    </td>

    <td><?= $row['created_at'] ?></td>

    <td>
        <a href="edit_post.php?id=<?= $row['id'] ?>">✏️ Sửa</a> |
        <a href="delete_post.php?id=<?= $row['id'] ?>"
           onclick="return confirm('Xóa bài này?')">
           🗑️ Xóa
        </a>
    </td>
</tr>



<?php endwhile; ?>

</table>
<div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
   <a href="dashboard.php" class="back-link">
    ← Quay lại Dashboard
</a>
</div>
</div>

</body>
</html>