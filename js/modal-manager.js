// Modal Management module
window.ModalManager = {
    // removed templates object (moved to modal-templates.js)

    init() {
        const container = document.getElementById('modalsContainer');
        container.innerHTML = Object.values(window.MODAL_TEMPLATES).join('');

        // Global delegation for closing any modal via X button or clicking outside
        document.addEventListener('click', (e) => {
            // 1. Handle all "X" close buttons by class
            if (e.target.closest('.close-modal-btn')) {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            }

            // 2. Handle closing when clicking the overlay (background) itself
            if (e.target.classList.contains('modal-overlay')) {
                e.target.classList.remove('active');
            }
        });
    },

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }
};