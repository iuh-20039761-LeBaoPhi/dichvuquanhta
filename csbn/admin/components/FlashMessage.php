<?php
/**
 * Component hiển thị flash message
 * Sử dụng: <?php renderFlashMessage(); ?>
 */

function renderFlashMessage() {
    $flashMessage = getFlashMessage();

    if (!$flashMessage) {
        return;
    }

    $type = $flashMessage['type'] ?? 'info';
    $message = $flashMessage['message'] ?? '';

    // Định nghĩa màu sắc và icon theo loại message
    $styles = [
        'success' => [
            'container' => 'bg-green-50 border-green-200 text-green-800',
            'icon' => '<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>',
            'title' => 'Thành công!'
        ],
        'error' => [
            'container' => 'bg-red-50 border-red-200 text-red-800',
            'icon' => '<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                      </svg>',
            'title' => 'Lỗi!'
        ],
        'warning' => [
            'container' => 'bg-yellow-50 border-yellow-200 text-yellow-800',
            'icon' => '<svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>',
            'title' => 'Cảnh báo!'
        ],
        'info' => [
            'container' => 'bg-blue-50 border-blue-200 text-blue-800',
            'icon' => '<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                      </svg>',
            'title' => 'Thông tin'
        ]
    ];

    $style = $styles[$type] ?? $styles['info'];
    ?>
    <div id="flashMessage" class="mb-6 border rounded-lg p-4 <?php echo $style['container']; ?> flash-message animate-slide-in">
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
                <?php echo $style['icon']; ?>
            </div>
            <div class="flex-1">
                <h3 class="text-sm font-semibold mb-1"><?php echo $style['title']; ?></h3>
                <p class="text-sm whitespace-pre-wrap"><?php echo htmlspecialchars($message); ?></p>
            </div>
            <button onclick="closeFlashMessage()" class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    </div>

    <style>
    @keyframes slideIn {
        from {
            transform: translateY(-10px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-10px);
            opacity: 0;
        }
    }

    .flash-message.animate-slide-in {
        animation: slideIn 0.3s ease-out;
    }

    .flash-message.animate-slide-out {
        animation: slideOut 0.3s ease-out;
    }
    </style>

    <script>
    // Tự động ẩn flash message sau 5 giây
    setTimeout(function() {
        closeFlashMessage();
    }, 5000);

    function closeFlashMessage() {
        const flashMsg = document.getElementById('flashMessage');
        if (flashMsg) {
            flashMsg.classList.remove('animate-slide-in');
            flashMsg.classList.add('animate-slide-out');
            setTimeout(function() {
                flashMsg.remove();
            }, 300);
        }
    }
    </script>
    <?php
}
?>
