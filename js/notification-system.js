window.NotificationSystem = {
    overlay: null,
    card: null,
    icon: null,
    message: null,
    footer: null,
    progress: null,
    resolve: null,
    autoCloseTimeout: null,

    init() {
        // Inject Notification DOM
        const container = document.createElement('div');
        container.id = 'notificationSystem';
        container.innerHTML = `
            <div id="notifOverlay" class="notification-overlay">
                <div id="notifCard" class="notification-card">
                    <i id="notifIcon" class="fas notification-icon"></i>
                    <div id="notifMessage" class="notification-message"></div>
                    <div id="notifFooter" class="notification-footer"></div>
                    <div id="notifProgress" class="notification-progress"></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        this.overlay = document.getElementById('notifOverlay');
        this.card = document.getElementById('notifCard');
        this.icon = document.getElementById('notifIcon');
        this.message = document.getElementById('notifMessage');
        this.footer = document.getElementById('notifFooter');
        this.progress = document.getElementById('notifProgress');

        // Override window methods
        window.alert = (msg) => this.show(msg, 'success');
        window.confirm = (msg) => this.show(msg, 'warning', true);
        
        // Expose helper methods
        window.notify = {
            success: (msg) => this.show(msg, 'success'),
            warning: (msg) => this.show(msg, 'warning'),
            error: (msg) => this.show(msg, 'error'),
            confirm: (msg) => this.show(msg, 'warning', true)
        };
    },

    show(msg, type = 'success', isConfirm = false) {
        // Clear previous state
        clearTimeout(this.autoCloseTimeout);
        this.footer.innerHTML = '';
        this.progress.classList.remove('shrink-anim');
        this.progress.style.display = isConfirm ? 'none' : 'block';

        // Set Content
        this.message.textContent = msg;
        this.card.className = `notification-card ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        this.icon.className = `fas notification-icon ${icons[type]}`;

        // Create Buttons
        if (isConfirm) {
            const yesBtn = document.createElement('button');
            yesBtn.className = 'notif-btn notif-btn-primary';
            yesBtn.textContent = 'تأكيد';
            yesBtn.onclick = () => this.handleAction(true);

            const noBtn = document.createElement('button');
            noBtn.className = 'notif-btn notif-btn-secondary';
            noBtn.textContent = 'إلغاء';
            noBtn.onclick = () => this.handleAction(false);

            this.footer.appendChild(yesBtn);
            this.footer.appendChild(noBtn);
        } else {
            const okBtn = document.createElement('button');
            okBtn.className = 'notif-btn notif-btn-primary';
            okBtn.textContent = 'حسناً';
            okBtn.onclick = () => this.handleAction(true);
            this.footer.appendChild(okBtn);

            // Auto Close logic for non-confirmations
            void this.progress.offsetWidth; // trigger reflow
            this.progress.classList.add('shrink-anim');
            this.autoCloseTimeout = setTimeout(() => this.handleAction(true), 4000);
        }

        this.overlay.classList.add('active');

        // Return a promise to mimic blocking behavior if awaited
        return new Promise(res => {
            this.resolve = res;
        });
    },

    handleAction(value) {
        clearTimeout(this.autoCloseTimeout);
        this.overlay.classList.remove('active');
        if (this.resolve) {
            this.resolve(value);
            this.resolve = null;
        }
    }
};

window.NotificationSystem.init();