<?php
require_once "../main/db.php";

$result = $conn->query("SELECT * FROM posts ORDER BY id DESC");
?>

<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Bài viết</title>

<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="post.css">

<style>
.blog-container{
    max-width:1000px;
    margin:auto;
    padding:30px;
}

.blog-card{
    display:flex;
    gap:20px;
    background:#fff;
    margin-bottom:20px;
    padding:15px;
    border-radius:10px;
    box-shadow:0 5px 15px rgba(0,0,0,0.1);
}

.blog-card img{
    width:200px;
    height:140px;
    object-fit:cover;
    border-radius:8px;
}

.blog-info{
    flex:1;
}

.blog-title{
    font-size:20px;
    font-weight:bold;
    margin-bottom:10px;
}

.blog-title a{
    text-decoration:none;
    color:#333;
}

.blog-title a:hover{
    color:#1abc9c;
}

.read-more{
    display:inline-block;
    margin-top:10px;
    color:#1abc9c;
}
</style>

</head>

<body>

<div class="blog-container">

<h1>📰 Bài viết mới nhất</h1>

<?php while($row = $result->fetch_assoc()): ?>

<div class="blog-card">

<img src="uploads/<?= $row['image'] ?>">

<div class="blog-info">

<div class="blog-title">
<a href="post.php?id=<?= $row['id'] ?>">
<?= $row['title'] ?>
</a>
</div>

<p>
<?= substr($row['content'], 0, 120) ?>...
</p>

<a href="post.php?id=<?= $row['id'] ?>" class="read-more">
Xem chi tiết →
</a>

</div>

</div>

<?php endwhile; ?>

</div>

</body>
</html>