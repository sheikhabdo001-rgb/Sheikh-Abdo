window.getLoginTemplate = () => {
    const teacherId = window.TenantStore?.getTeacherIdForCurrentUI?.();
    const customStages = JSON.parse(window.TenantStore?.get('custom_stages_config', '{}', teacherId) || '{}');
    const customStagesHtml = Object.keys(customStages).map(id => {
        const stage = customStages[id];
        return `
            <div class="stage-item" data-stage="${id}">
                <label class="stage-option">
                    <input type="checkbox" name="stage" value="${id}" id="check-${id}">
                    <div class="stage-card">
                        <i class="fas ${stage.icon || 'fa-university'}"></i>
                        <span>${stage.name}</span>
                    </div>
                </label>
            </div>
        `;
    }).join('');

    return `
    <div class="login-box">
        <div class="login-header">
            <i class="fas fa-graduation-cap"></i>
            <h1>نظام إدارة الطلاب</h1>
        </div>
        <form id="loginForm">
            <div class="auth-mode-switch" role="tablist" aria-label="نوع العملية">
                <button type="button" id="loginModeBtn" class="auth-mode-btn active" data-auth-mode="login">تسجيل دخول</button>
                <button type="button" id="registerModeBtn" class="auth-mode-btn" data-auth-mode="register">تسجيل جديد</button>
            </div>
            <div id="registrationFields">
            <div class="input-group">
                <i class="fas fa-chalkboard-teacher"></i>
                <input type="text" id="teacherNameInput" placeholder="اسم المعلم" required>
            </div>
            
            <div class="stages-section">
                <h3>اختر المرحلة التعليمية</h3>
                <div class="stage-options">
                    <div class="stage-item" data-stage="primary">
                        <label class="stage-option">
                            <input type="checkbox" name="stage" value="primary" id="check-primary">
                            <div class="stage-card">
                                <i class="fas fa-child"></i>
                                <span>ابتدائي</span>
                            </div>
                        </label>
                        <button type="button" class="choose-grades-btn" data-stage="primary">
                            <i class="fas fa-list-ul"></i>
                            <span>اختيار الصفوف</span>
                        </button>
                    </div>
                    <div class="stage-item" data-stage="preparatory">
                        <label class="stage-option">
                            <input type="checkbox" name="stage" value="preparatory" id="check-preparatory">
                            <div class="stage-card">
                                <i class="fas fa-book-reader"></i>
                                <span>إعدادي</span>
                            </div>
                        </label>
                        <button type="button" class="choose-grades-btn" data-stage="preparatory">
                            <i class="fas fa-list-ul"></i>
                            <span>اختيار الصفوف</span>
                        </button>
                    </div>
                    <div class="stage-item" data-stage="secondary">
                        <label class="stage-option">
                            <input type="checkbox" name="stage" value="secondary" id="check-secondary">
                            <div class="stage-card">
                                <i class="fas fa-user-graduate"></i>
                                <span>ثانوي</span>
                            </div>
                        </label>
                        <button type="button" class="choose-grades-btn" data-stage="secondary">
                            <i class="fas fa-list-ul"></i>
                            <span>اختيار الصفوف</span>
                        </button>
                    </div>
                    ${customStagesHtml}
                </div>
                <div style="margin-top: 15px; display: flex; justify-content: center;">
                    <button type="button" id="openAddCustomStageBtn" class="choose-grades-btn" style="padding: 10px 20px; font-size: 13px; border-style: dashed; background: rgba(147, 51, 234, 0.05);">
                        <i class="fas fa-plus-circle"></i>
                        <span>تخصيص مرحلة / آخر</span>
                    </button>
                </div>
            </div>
            </div>

            <div class="login-auth-actions">
                <button type="button" id="googleLoginBtn" class="login-btn google-login-btn">
                    <i class="fab fa-google"></i><span id="googleLoginLabel">الدخول بحساب Google</span>
                </button>
            </div>
            <p id="loginRequirements" class="login-requirements">اضغط على زر Google لتسجيل الدخول إلى حسابك.</p>

            <div id="errorMessage" class="error-message"></div>
        </form>
    </div>
`;
};

// Initial build for application consumption
window.LOGIN_TEMPLATE = window.getLoginTemplate();
