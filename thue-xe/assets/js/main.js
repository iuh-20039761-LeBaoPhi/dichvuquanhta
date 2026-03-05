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
backToTop.style.cssText = 'position:fixed;bottom:30px;right:30px;display:none;z-index:1000;';
document.body.appendChild(backToTop);

window.addEventListener('scroll', () => {
    backToTop.style.display = window.pageYOffset > 300 ? 'block' : 'none';
});

backToTop.addEventListener('click', () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
});