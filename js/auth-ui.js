/**
 * Authentication UI Controller
 * Handles Login Screen logic, Password toggling, and Logout
 */
window.AuthUI = {
    init() {
        this.setupPasswordToggle();
        this.setupLoginForm();
        this.setupGlobalActions();
        this.setupCustomStageLogic();
        this.completeGoogleLogin();
    },

    setupCustomStageLogic() {
        document.addEventListener('click', async (e) => {
            if (e.target.closest('#openAddCustomStageBtn')) {
                if (document.getElementById('loginForm')?.dataset.authMode !== 'register') return;
                window.ModalManager.open('addCustomStageModal');
            }
        });

        const saveBtn = document.getElementById('saveCustomStageBtn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const id = saveBtn.dataset.editId;
                const name = document.getElementById('customStageNameInput').value.trim();
                const fee = document.getElementById('customStageFeeInput').value.trim();
                const desc = document.getElementById('customStageDescInput').value.trim();
                
                if (!name) return window.notify.error('يرجى إدخال اسم المرحلة');
                
                if (id) {
                    window.STUDENT_CONFIG.updateCustomStage(id, name, fee, desc);
                    window.notify.success(`تم تحديث المرحلة "${name}" بنجاح`);
                } else {
                    window.STUDENT_CONFIG.addCustomStage(name, fee, desc);
                    window.notify.success(`تمت إضافة المرحلة "${name}" بنجاح`);
                }

                window.ModalManager.close('addCustomStageModal');
                
                // Refresh login UI if we're on login screen
                const loginSection = document.getElementById('loginSection');
                if (loginSection && loginSection.style.display !== 'none') {
                    window.LOGIN_TEMPLATE = window.getLoginTemplate();
                    loginSection.innerHTML = window.LOGIN_TEMPLATE;
                    this.setupPasswordToggle();
                    this.setupLoginForm();
                }

                // Refresh Dashboard & GradeSelection
                window.GradeSelection.init();
                if (window.Auth.isLoggedIn()) {
                    this.loadDashboardData();
                    // If in settings, re-render settings list
                    const settingsModal = document.getElementById('stageSettingsModal');
                    if (settingsModal && settingsModal.classList.contains('active')) {
                        window.GradeSelection.openStageSettings();
                    }
                }
            };
        }
    },

    setupPasswordToggle() {
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        if (!togglePassword || !passwordInput) return;

        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    },

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        if (!loginForm) return;

        const setAuthMode = mode => {
            const isRegister = mode === 'register';
            loginForm.dataset.authMode = isRegister ? 'register' : 'login';
            document.getElementById('registrationFields')?.classList.toggle('is-hidden', !isRegister);
            document.getElementById('loginModeBtn')?.classList.toggle('active', !isRegister);
            document.getElementById('registerModeBtn')?.classList.toggle('active', isRegister);
            const label = document.getElementById('googleLoginLabel');
            if (label) label.textContent = isRegister ? 'التسجيل بحساب Google' : 'الدخول بحساب Google';
            const requirements = document.getElementById('loginRequirements');
            if (requirements) {
                requirements.textContent = isRegister
                    ? 'اكتب اسم المعلم واختر المراحل ثم سجّل بحساب Google.'
                    : 'اضغط على زر Google لتسجيل الدخول إلى حسابك.';
                requirements.classList.remove('ready');
            }
            errorMessage?.classList.remove('show');
        };

        document.querySelectorAll('[data-auth-mode]').forEach(button => {
            button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
        });

        const updateAuthReadiness = () => {
            const isRegister = loginForm.dataset.authMode === 'register';
            const teacherName = document.getElementById('teacherNameInput')?.value.trim();
            const hasStage = document.querySelectorAll('input[name="stage"]:checked').length > 0;
            const ready = !isRegister || Boolean(teacherName && hasStage);
            const requirements = document.getElementById('loginRequirements');
            const message = isRegister
                ? (ready
                    ? 'جاهز للتسجيل بحساب Google.'
                    : 'اكتب اسم المعلم واختر مرحلة تعليمية لتفعيل التسجيل بحساب Google.')
                : 'اضغط على زر Google لتسجيل الدخول إلى حسابك.';
            if (requirements) {
                requirements.textContent = message;
                requirements.classList.toggle('ready', isRegister && ready);
            }
            const button = document.getElementById('googleLoginBtn');
            if (button) button.disabled = !ready;
            return ready;
        };

        ['teacherNameInput'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateAuthReadiness);
        });
        document.querySelectorAll('input[name="stage"]').forEach(input => {
            input.addEventListener('change', updateAuthReadiness);
        });
        updateAuthReadiness();

        const getSelection = () => {
            const selectedStages = Array.from(document.querySelectorAll('input[name="stage"]:checked'))
                .map(checkbox => checkbox.value)
                .filter(stage => {
                    const data = window.STUDENT_CONFIG.stageData[stage];
                    return data && (data.isFlat || stage.startsWith('custom_'))
                        || window.GradeSelection.tempSelectedGrades[stage]?.length > 0;
                });
            const selectedGrades = {};
            selectedStages.forEach(stage => {
                const data = window.STUDENT_CONFIG.stageData[stage];
                selectedGrades[stage] = data && (data.isFlat || stage.startsWith('custom_'))
                    ? [1]
                    : window.GradeSelection.tempSelectedGrades[stage];
            });
            return { selectedStages, selectedGrades };
        };

        const showAuthError = error => {
            errorMessage.textContent = error?.message || 'تعذر تسجيل الدخول، راجع البيانات وحاول مرة أخرى';
            errorMessage.classList.add('show');
        };

        document.getElementById('googleLoginBtn')?.addEventListener('click', () => {
            const mode = loginForm.dataset.authMode || 'login';
            const { selectedStages, selectedGrades } = getSelection();
            const teacherName = document.getElementById('teacherNameInput')?.value.trim();
            if (mode === 'register' && (!teacherName || !selectedStages.length)) {
                showAuthError({ message: 'اكتب اسم المعلم واختر مرحلة تعليمية أولًا' });
                return;
            }
            localStorage.setItem('appwrite_pending_auth', JSON.stringify({
                mode,
                teacherName,
                selectedStages,
                selectedGrades,
                customStages: JSON.parse(window.TenantStore?.get(
                    'custom_stages_config',
                    '{}',
                    window.TenantStore?.getTeacherIdForCurrentUI?.()
                ) || '{}')
            }));
            window.Auth.signInGoogle();
        });

        setAuthMode('login');
        updateAuthReadiness();
    },

    async completeGoogleLogin() {
        try {
            const user = await window.AppwriteConfig?.account?.get();
            if (!user || window.Auth.isLoggedIn()) return;
            const pending = JSON.parse(localStorage.getItem('appwrite_pending_auth') || '{}');
            const mode = pending.mode || 'register';
            const hasProfile = window.TenantStore?.hasProfile?.(user.$id) || false;
            if (mode === 'register' && hasProfile) {
                await window.AppwriteConfig.account.deleteSession('current').catch(() => {});
                localStorage.removeItem('appwrite_pending_auth');
                this.showLogin('تم التسجيل من قبل، برجاء تسجيل الدخول وليس تسجيل جديد.');
                return;
            }
            if (mode === 'login' && !hasProfile) {
                await window.AppwriteConfig.account.deleteSession('current').catch(() => {});
                localStorage.removeItem('appwrite_pending_auth');
                this.showLogin('هذا الحساب غير مسجل من قبل، برجاء اختيار تسجيل جديد أولًا.');
                return;
            }
            window.Auth.login(
                user.email,
                pending.teacherName || window.TenantStore?.getProfile(user.$id)?.teacherName || user.name || 'المعلم',
                mode === 'register' ? pending.selectedStages : null,
                mode === 'register' ? pending.selectedGrades : null,
                user.$id
            );
            if (mode === 'register' && pending.customStages) {
                window.TenantStore.set('custom_stages_config', JSON.stringify(pending.customStages), user.$id);
            }
            window.PersistenceManager.initializeTeacherData?.();
            localStorage.removeItem('appwrite_pending_auth');
            await window.AppwriteConfig.hydrateTeacherData();
            this.showDashboard();
        } catch (error) {
            // No Appwrite session means the normal login screen should remain visible.
        }
    },

    setupGlobalActions() {
        document.addEventListener('click', async (e) => {
            // Teacher button - edit teacher name
            if (e.target.closest('#teacherBtn')) {
                const newName = prompt('أدخل اسم المعلم:', window.Auth.getTeacherName());
                if (window.Auth.updateTeacherName(newName)) {
                    this.loadDashboardData();
                }
            }

            // Logout button
            if (e.target.closest('#logoutBtn')) {
                if (await window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                    window.Auth.logout();
                    this.showLogin();
                    window.Settings.close();
                    // Keep the user's persisted theme after logging out.
                    window.Settings.initTheme();
                }
            }
        });
    },

    showDashboard() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        this.loadDashboardData();
    },

    showLogin(message = '') {
        document.getElementById('loginSection').style.display = 'flex';
        document.getElementById('dashboardSection').style.display = 'none';
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        document.getElementById('registrationFields')?.classList.add('is-hidden');
        document.getElementById('loginModeBtn')?.classList.add('active');
        document.getElementById('registerModeBtn')?.classList.remove('active');
        const googleLabel = document.getElementById('googleLoginLabel');
        if (googleLabel) googleLabel.textContent = 'الدخول بحساب Google';
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.toggle('show', Boolean(message));
        }
    },

    loadDashboardData() {
        const teacherName = window.Auth.getTeacherName();
        const selectedStages = window.Auth.getSelectedStages();
        window.Dashboard.load(teacherName, selectedStages);
    },

    async checkLoginState() {
        try {
            const user = await window.AppwriteConfig?.account?.get();
            if (user && window.Auth.isLoggedIn()) {
                await window.AppwriteConfig.hydrateTeacherData();
                this.showDashboard();
                return;
            }
        } catch (error) {
            window.Auth.logout();
        }
        this.showLogin();
    }
};
