const Utils = {
    formatPrice: (price) => new Intl.NumberFormat('vi-VN').format(price),
    
    formatDate: (date) => new Date(date).toLocaleDateString('vi-VN'),
    
    calculateDays: (start, end) => {
        const diffTime = Math.abs(new Date(end) - new Date(start));
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    showToast: (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    showLoading: (element) => {
        element.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div></div>';
    },

    getUrlParam: (name) => {
        return new URLSearchParams(window.location.search).get(name);
    }
};