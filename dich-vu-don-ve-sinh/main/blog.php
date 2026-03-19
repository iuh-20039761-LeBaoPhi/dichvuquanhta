<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bài viết | Vệ sinh Care</title>

<link rel="stylesheet" href="../demo/style.css">


<style>

.blog-section{
padding:60px 20px;
}

.blog-title{
text-align:center;
margin-bottom:40px;
}

.blog-grid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
gap:25px;
}

.blog-card{
background:white;
border-radius:10px;
overflow:hidden;
box-shadow:0 5px 20px rgba(0,0,0,0.08);
transition:0.3s;
}

.blog-card:hover{
transform:translateY(-5px);
}

.blog-card img{
width:100%;
height:180px;
object-fit:cover;
}

.blog-content{
padding:20px;
}

.blog-content h3{
margin-bottom:10px;
}

.blog-content p{
color:#666;
font-size:14px;
margin-bottom:15px;
}

.read-more{
text-decoration:none;
color:white;
background:#1abc9c;
padding:8px 14px;
border-radius:5px;
font-size:14px;
}

</style>
</head>

<body>

<!-- HEADER -->
<?php require_once "header.php"; ?>


<!-- BLOG -->

<section class="blog-section container">

<h2 class="blog-title">Bài viết & Mẹo vệ sinh</h2>

<?php
require_once "db.php";
$result = $conn->query("SELECT * FROM posts ORDER BY id DESC");
?>

<div class="blog-grid">

<?php while($row = $result->fetch_assoc()): ?>

<div class="blog-card">
<img src="../uploads/<?= $row['image'] ?>">

<div class="blog-content">
<h3><?= htmlspecialchars($row['title']) ?></h3>

<p>
<?= substr(strip_tags($row['content']), 0, 100) ?>...
</p>

<a href="post.php?id=<?= $row['id'] ?>" class="read-more">
Xem bài viết
</a>

</div>
</div>

<?php endwhile; ?>

</div>

</section>
<?php require_once "footer.php"; ?>
</body>
</html>


