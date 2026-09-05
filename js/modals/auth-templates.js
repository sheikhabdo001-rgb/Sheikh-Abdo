window.AUTH_MODALS = {
    loginInfo: `
        <div id="loginInfoModal" class="modal-overlay">
            <div class="modal-content glass-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-user-circle"></i> معلومات حسابي</h3>
                    <button id="closeLoginInfoModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="info-field">
                        <label><i class="fas fa-envelope"></i> البريد الإلكتروني</label>
                        <div class="copy-input-wrapper">
                            <input type="text" id="modalAccountEmail" readonly>
                            <button class="copy-btn" data-target="modalAccountEmail" title="نسخ"><i class="far fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="info-field">
                        <label><i class="fas fa-chalkboard-teacher"></i> اسم المعلم</label>
                        <div class="copy-input-wrapper">
                            <input type="text" id="modalAccountName" readonly>
                            <button class="copy-btn" data-target="modalAccountName" title="نسخ"><i class="far fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="info-field">
                        <label><i class="fas fa-fingerprint"></i> معرّف الحساب</label>
                        <div class="copy-input-wrapper">
                            <input type="text" id="modalAccountId" readonly>
                            <button class="copy-btn" data-target="modalAccountId" title="نسخ"><i class="far fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="info-field">
                        <label><i class="fas fa-shield-alt"></i> طريقة الدخول</label>
                        <input type="text" id="modalAccountProvider" readonly>
                    </div>
                </div>
                <div class="modal-footer"><p>حافظ على سرية هذه البيانات</p></div>
            </div>
        </div>
    `,
    stageSettings: `
        <div id="stageSettingsModal" class="modal-overlay">
            <div class="modal-content glass-modal grade-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> إعدادات المراحل والصفوف</h3>
                    <button id="closeStageSettingsModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="edit-stages-grid">
                        <div class="edit-stage-section" data-stage="primary">
                            <label class="edit-stage-label"><input type="checkbox" id="edit-check-primary"> <span>المرحلة الابتدائية</span></label>
                            <div id="edit-grades-primary" class="edit-grades-list"></div>
                        </div>
                        <div class="edit-stage-section" data-stage="preparatory">
                            <label class="edit-stage-label"><input type="checkbox" id="edit-check-preparatory"> <span>المرحلة الإعدادية</span></label>
                            <div id="edit-grades-preparatory" class="edit-grades-list"></div>
                        </div>
                        <div class="edit-stage-section" data-stage="secondary">
                            <label class="edit-stage-label"><input type="checkbox" id="edit-check-secondary"> <span>المرحلة الثانوية</span></label>
                            <div id="edit-grades-secondary" class="edit-grades-list"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer"><button id="saveStageSettingsBtn" class="login-btn glow-btn">حفظ التغييرات</button></div>
            </div>
        </div>
    `,
    addCustomStage: `
        <div id="addCustomStageModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h3><i class="fas fa-folder-plus"></i> <span id="addCustomStageTitle">إضافة مرحلة مخصصة</span></h3>
                    <button id="closeCustomStageModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label style="margin-bottom: 8px; display: block; color: var(--text-secondary);">اسم المرحلة (كورس، تحفيظ، إلخ):</label>
                        <i class="fas fa-signature"></i>
                        <input type="text" id="customStageNameInput" placeholder="مثلاً: كورس لغة إنجليزية">
                    </div>
                    <div class="input-group">
                        <label style="margin-bottom: 8px; display: block; color: var(--text-secondary);">سعر الاشتراك الشهري الافتراضي:</label>
                        <i class="fas fa-money-bill-wave"></i>
                        <input type="number" id="customStageFeeInput" placeholder="مثلاً: 250">
                    </div>
                    <div class="input-group">
                        <label style="margin-bottom: 8px; display: block; color: var(--text-secondary);">وصف مختصر / ملاحظات:</label>
                        <i class="fas fa-info-circle"></i>
                        <input type="text" id="customStageDescInput" placeholder="وصف اختياري للمرحلة">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveCustomStageBtn" class="login-btn glow-btn">
                        <i class="fas fa-check-circle"></i>
                        <span id="saveCustomStageLabel">حفظ وإضافة المرحلة</span>
                    </button>
                </div>
            </div>
        </div>
    `
};