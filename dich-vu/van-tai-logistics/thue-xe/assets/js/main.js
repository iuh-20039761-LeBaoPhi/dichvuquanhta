// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href'))?.scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Back to top
const backToTop = document.createElement('button');
backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
backToTop.className = 'back-to-top';
backToTop.setAttribute('type', 'button');
backToTop.setAttribute('aria-label', 'Lên đầu trang');
backToTop.style.cssText = [
    'position:fixed',
    'bottom:100px',
    'right:28px',
    'width:46px',
    'height:46px',
    'display:none',
    'z-index:1000',
    'border:none',
    'border-radius:50%',
    'background:linear-gradient(135deg, #60A5FA, #1E40AF)',
    'color:#fff',
    'box-shadow:0 6px 16px rgba(30,64,175,0.35)',
    'cursor:pointer'
].join(';') + ';';
document.body.appendChild(backToTop);

window.addEventListener('scroll', () => {
    backToTop.style.display = window.pageYOffset > 300 ? 'block' : 'none';
});

backToTop.addEventListener('click', () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
});