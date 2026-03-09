fetch('header.html')
    .then(res => res.text())
    .then(html => {
        document.getElementById('header').innerHTML = html;

        // xử lý anchor sau khi header load xong
        document.querySelectorAll('#header a[href^="#"]').forEach(link => {
            link.addEventListener('click', function (e) {
                const target = document.querySelector(this.getAttribute('href'));

                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    });
