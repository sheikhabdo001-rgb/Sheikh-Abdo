// Settings module
window.Settings = {
    sidebar: null,
    overlay: null,
    THEME_STORAGE_KEY: 'app_theme_preference',
    LEGACY_THEME_STORAGE_KEY: 'theme',
    DEFAULT_THEME: 'dark',

    template: `
        <div id="settingsOverlay" class="settings-overlay"></div>
        <div id="settingsSidebar" class="settings-sidebar">
            <div class="sidebar-header">
                <h2>الإعدادات</h2>
                <button id="closeSidebar" class="close-sidebar"><i class="fas fa-times"></i></button>
            </div>
            <div class="sidebar-content">
                <button id="teacherBtn" class="sidebar-btn"><i class="fas fa-chalkboard-teacher"></i><span>تعديل اسم المعلم</span></button>
                <button id="backupRestoreBtn" class="sidebar-btn"><i class="fas fa-shield-alt"></i><span>النسخ الاحتياطي والاستعادة</span></button>
                <button id="financialConfigBtn" class="sidebar-btn"><i class="fas fa-tags"></i><span>أسعار المجاميع</span></button>
                <button id="financialReportsBtn" class="sidebar-btn"><i class="fas fa-chart-line"></i><span>التقارير المالية</span></button>
                <button id="transferBtn" class="sidebar-btn"><i class="fas fa-exchange-alt"></i><span>النقل العام</span></button>
                <button id="stageSettingsBtn" class="sidebar-btn highlight-btn"><i class="fas fa-edit"></i><span>إعدادات المراحل والصفوف</span></button>
                <button id="loginInfoBtn" class="sidebar-btn"><i class="fas fa-user-circle"></i><span>معلومات حسابي</span></button>
                <button id="themeToggle" class="sidebar-btn" type="button" aria-label="تبديل الوضع">
                    <i class="fas fa-sun" aria-hidden="true"></i>
                    <span id="themeToggleBtnText">الوضع الفاتح</span>
                </button>
                <div style="margin: 10px 0; border-top: 1px solid var(--border-color); opacity: 0.5;"></div>
                <button id="resetSiteDataBtn" class="sidebar-btn" style="border-color: rgba(239, 68, 68, 0.3); color: #f87171;"><i class="fas fa-sync-alt"></i><span>إعادة ضبط الموقع</span></button>
                <button id="logoutBtn" class="sidebar-btn logout-sidebar-btn"><i class="fas fa-sign-out-alt"></i><span>تسجيل الخروج</span></button>
            </div>
        </div>
    `,

    // Initialize settings
    init() {
        const container = document.getElementById('settingsContainer');
        container.innerHTML = this.template;

        this.sidebar = document.getElementById('settingsSidebar');
        this.overlay = document.getElementById('settingsOverlay');
        this.modal = document.getElementById('loginInfoModal');
        this.updateThemeIcon(
            this.normalizeTheme(document.documentElement.getAttribute('data-theme'))
        );

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => this.open());

        // Close button
        document.getElementById('closeSidebar').addEventListener('click', () => this.close());

        // Overlay click
        this.overlay.addEventListener('click', () => {
            this.close();
            ModalManager.close('loginInfoModal');
        });

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Login Info Button
        document.getElementById('loginInfoBtn').addEventListener('click', () => this.openModal());

        // Reset Site Data Button
        document.getElementById('resetSiteDataBtn').addEventListener('click', () => this.openResetOptions());

        // Transfer Button (Annual Mass Promotion)
        document.getElementById('transferBtn').addEventListener('click', () => {
            window.Navigation.switchView('transfer');
            this.close();
        });

        // Stage Settings Button
        document.getElementById('stageSettingsBtn').addEventListener('click', () => {
            if (window.openStageSettings) {
                window.openStageSettings();
                this.close();
            }
        });

        // Financial Reports Dashboard
        document.getElementById('financialReportsBtn').addEventListener('click', () => {
            if (window.FinancialReportsUI?.openReportsView) {
                window.FinancialReportsUI.openReportsView();
                this.close();
            }
        });

        // Copy buttons logic
        this.initCopyButtons();
    },

    // Open settings sidebar
    open() {
        this.sidebar.classList.add('active');
        this.overlay.classList.add('active');
    },

    // Close settings sidebar
    close() {
        this.sidebar.classList.remove('active');
        this.overlay.classList.remove('active');
    },

    // Toggle theme
    toggleTheme() {
        const currentTheme = this.normalizeTheme(
            document.documentElement.getAttribute('data-theme')
        );
        this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    },

    // Apply a theme consistently and persist it for future sessions.
    setTheme(theme) {
        const normalizedTheme = this.normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', normalizedTheme);
        localStorage.setItem(this.THEME_STORAGE_KEY, normalizedTheme);

        // Keep the tenant profile mirror up to date for older app data and
        // reset/backup flows, while app_theme_preference remains the UI source
        // of truth for this setting.
        window.TenantStore?.updateProfile({ settings: { theme: normalizedTheme } });
        this.updateThemeIcon(normalizedTheme);
        return normalizedTheme;
    },

    normalizeTheme(theme) {
        return theme === 'light' || theme === 'dark' ? theme : this.DEFAULT_THEME;
    },

    // Update theme icon
    updateThemeIcon(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (theme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }

            const label = themeToggle.querySelector('#themeToggleBtnText');
            if (label) {
                label.textContent = theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن';
            }
            themeToggle.setAttribute(
                'aria-label',
                theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'
            );
        }
    },

    // Modal Methods
    async openModal() {
        const account = await window.AppwriteConfig?.account?.get().catch(() => null);
        document.getElementById('modalAccountEmail').value = account?.email || window.Auth.getCurrentTeacherId() || 'غير متاح';
        document.getElementById('modalAccountName').value = window.Auth.getTeacherName();
        document.getElementById('modalAccountId').value = account?.$id || window.Auth.getCurrentTeacherId() || 'غير متاح';
        document.getElementById('modalAccountProvider').value = account?.email ? 'Appwrite Email / Google OAuth' : 'غير متاح';
        this.modal.classList.add('active');
        this.close(); // Close sidebar when opening modal
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    initCopyButtons() {
        const copyBtns = document.querySelectorAll('.copy-btn');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                
                input.select();
                input.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(input.value);

                // Feedback
                const originalIcon = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.classList.add('copied');
                
                setTimeout(() => {
                    btn.innerHTML = originalIcon;
                    btn.classList.remove('copied');
                }, 2000);
            });
        });
    },

    // Initialize theme
    initTheme() {
        let savedTheme = localStorage.getItem(this.THEME_STORAGE_KEY);

        // Migrate the previous key once so existing users retain their
        // selection while all future reads/writes use the requested key.
        if (!savedTheme) {
            const legacyTheme = localStorage.getItem(this.LEGACY_THEME_STORAGE_KEY);
            if (legacyTheme === 'light' || legacyTheme === 'dark') {
                savedTheme = legacyTheme;
            }
        }

        return this.setTheme(savedTheme || this.DEFAULT_THEME);
    },

    openResetOptions() {
        const modal = document.getElementById('resetOptionsModal');
        const trigger = document.getElementById('selectiveResetTrigger');
        const listContainer = document.getElementById('selectiveStagesList');
        const checklist = document.getElementById('customStagesChecklist');

        // Reset list UI
        listContainer.style.display = 'none';
        
        trigger.onclick = () => {
            const customStages = JSON.parse(localStorage.getItem('custom_stages_config') || '{}');
            const stageIds = Object.keys(customStages);

            if (stageIds.length === 0) {
                window.notify.warning('لا توجد مراحل مخصصة مسجلة حالياً.');
                return;
            }

            checklist.innerHTML = stageIds.map(id => `
                <label class="edit-grade-item" style="cursor:pointer; padding: 10px 15px; background: rgba(255,255,255,0.02); border-radius:10px;">
                    <input type="checkbox" class="reset-stage-keep" value="${id}">
                    <span style="font-weight:700;">${customStages[id].name}</span>
                </label>
            `).join('');

            listContainer.style.display = 'block';
        };

        const confirmSelectiveBtn = document.getElementById('confirmSelectiveReset');
        confirmSelectiveBtn.onclick = () => {
            const selectedToKeep = Array.from(document.querySelectorAll('.reset-stage-keep:checked')).map(cb => cb.value);
            this.prepareReset(3, selectedToKeep);
        };

        window.ModalManager.open('resetOptionsModal');
        this.close();
    },

    async prepareReset(mode, keepIds = []) {
        let warning = "";
        switch(mode) {
            case 1: warning = "هل أنت متأكد من إعادة الضبط بالكامل؟ سيتم حذف كل شيء بما في ذلك المراحل المخصصة."; break;
            case 2: warning = "هل أنت متأكد؟ سيتم حذف بيانات الطلاب والمالية مع الإبقاء على كافة المراحل المخصصة."; break;
            case 3: warning = "هل أنت متأكد؟ سيتم الإبقاء على المراحل المحددة فقط وحذف كل شيء آخر."; break;
        }

        const confirmed = await window.confirm(warning);
        if (confirmed) {
            this.executeReset(mode, keepIds);
        }
    },

    executeReset(mode, keepIds) {
        const tenantId = window.TenantStore?.getCurrentTeacherId();
        if (!tenantId) return;

        // Preserve only this teacher's profile metadata. The reset must never
        // clear localStorage globally because other teacher tenants may exist.
        const profile = window.TenantStore.getProfile(tenantId);
        const preservedData = {
            selectedStages: profile?.selectedStages || [],
            selectedGrades: profile?.selectedGrades || {},
            academyIconClass: window.TenantStore.get('academy_icon_class', 'fa-graduation-cap', tenantId),
            theme: this.normalizeTheme(
                localStorage.getItem(this.THEME_STORAGE_KEY)
                    || profile?.settings?.theme
                    || window.TenantStore.get('theme', this.DEFAULT_THEME, tenantId)
            )
        };

        if (mode === 2) {
            // Keep ALL custom configs
            preservedData.customStages = window.TenantStore.get('custom_stages_config');
            preservedData.customGrades = window.TenantStore.get('custom_grades_config');
        } else if (mode === 3) {
            // Filter custom configs to only keep selected IDs
            const allStages = JSON.parse(window.TenantStore.get('custom_stages_config', '{}') || '{}');
            const allGrades = JSON.parse(window.TenantStore.get('custom_grades_config', '{}') || '{}');
            
            const filteredStages = {};
            const filteredGrades = {};
            
            keepIds.forEach(id => {
                if (allStages[id]) filteredStages[id] = allStages[id];
                if (allGrades[id]) filteredGrades[id] = allGrades[id];
            });

            preservedData.customStages = JSON.stringify(filteredStages);
            preservedData.customGrades = JSON.stringify(filteredGrades);
            
            // Update selected stages/grades in session if we removed one being viewed
            let currentSelected = preservedData.selectedStages;
            currentSelected = currentSelected.filter(sid => !sid.startsWith('custom_') || keepIds.includes(sid));
            preservedData.selectedStages = currentSelected;
            preservedData.selectedGrades = Object.fromEntries(
                Object.entries(preservedData.selectedGrades)
                    .filter(([stage]) => !stage.startsWith('custom_') || keepIds.includes(stage))
            );
        }

        // Wipe only the active teacher's tenant, then restore profile/UI
        // metadata. Stored records belonging to other teachers are untouched.
        window.TenantStore.clearCurrentTeacherData({ preserveProfile: false });
        window.TenantStore.updateProfile({
            teacherName: profile?.teacherName || 'المعلم',
            selectedStages: preservedData.selectedStages,
            selectedGrades: preservedData.selectedGrades,
            settings: { ...(profile?.settings || {}), theme: preservedData.theme }
        }, tenantId);
        window.TenantStore.set('academy_icon_class', preservedData.academyIconClass, tenantId);
        if (preservedData.customStages !== undefined) {
            window.TenantStore.set('custom_stages_config', preservedData.customStages, tenantId);
            window.TenantStore.set('custom_grades_config', preservedData.customGrades, tenantId);
        }

        window.ModalManager.close('resetOptionsModal');
        const successMsg = mode === 3 
            ? "تم إعادة ضبط النظام وبقاء المراحل المخصصة المحددة فقط. سيتم إعادة التشغيل..." 
            : "تمت عملية إعادة الضبط بنجاح. سيتم إعادة تشغيل النظام...";
            
        window.notify.success(successMsg);
        
        setTimeout(() => location.reload(), 1500);
    }
};
