window.SYSTEM_MODALS = {
    resetOptions: `
        <div id="resetOptionsModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-sync-alt"></i> خيارات إعادة ضبط الموقع</h3>
                    <button id="closeResetOptions" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="helper-text" style="text-align: center; margin-bottom: 1.5rem;">يرجى اختيار نوع إعادة الضبط المطلوب تنفيذه:</p>
                    
                    <div class="reset-choices-grid" style="display: flex; flex-direction: column; gap: 1rem;">
                        <!-- Option 1 -->
                        <div class="reset-choice-card" onclick="window.Settings.prepareReset(1)" style="padding: 1.25rem; border-radius: 18px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); cursor: pointer; transition: all 0.3s ease;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <i class="fas fa-trash-alt" style="font-size: 1.5rem; color: #ef4444;"></i>
                                <div>
                                    <h4 style="color: #ffffff; font-weight: 800;">إعادة الضبط مع حذف كل البيانات</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-secondary);">يتم إعادة ضبط الموقع بالكامل (تطهير شامل لكافة السجلات)</p>
                                </div>
                            </div>
                        </div>

                        <!-- Option 2 -->
                        <div class="reset-choice-card" onclick="window.Settings.prepareReset(2)" style="padding: 1.25rem; border-radius: 18px; border: 1px solid #10b981; background: rgba(16, 185, 129, 0.05); cursor: pointer; transition: all 0.3s ease;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <i class="fas fa-layer-group" style="font-size: 1.5rem; color: #10b981;"></i>
                                <div>
                                    <h4 style="color: #ffffff; font-weight: 800;">إعادة الضبط مع بقاء جميع المراحل المخصصة</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-secondary);">يتم إعادة ضبط الموقع مع بقاء جميع المراحل المخصصة</p>
                                </div>
                            </div>
                        </div>

                        <!-- Option 3 -->
                        <div class="reset-choice-card" id="selectiveResetTrigger" style="padding: 1.25rem; border-radius: 18px; border: 1px solid #9333ea; background: rgba(147, 51, 234, 0.05); cursor: pointer; transition: all 0.3s ease;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <i class="fas fa-tasks" style="font-size: 1.5rem; color: #c084fc;"></i>
                                <div style="flex: 1;">
                                    <h4 style="color: #ffffff; font-weight: 800;">إعادة الضبط مع تحديد مراحل للبقاء</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-secondary);">قم بتحديد المراحل المخصصة التي ترغب في الإبقاء عليها فقط. أي مرحلة غير محددة سيتم حذفها نهائياً مع بقية بيانات النظام.</p>
                                </div>
                                <i class="fas fa-chevron-left" style="opacity: 0.5;"></i>
                            </div>
                            
                            <!-- Hidden Stage List -->
                            <div id="selectiveStagesList" style="display: none; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed rgba(147, 51, 234, 0.3);">
                                <div id="customStagesChecklist" style="display: flex; flex-direction: column; gap: 10px;">
                                    <!-- Checkboxes injected here -->
                                </div>
                                <button id="confirmSelectiveReset" class="login-btn" style="margin-top: 1.5rem; background: #9333ea;">تأكيد الحذف الانتقائي</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    underDevelopment: `
        <div id="underDevModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 400px; text-align: center;">
                <div class="modal-body" style="padding: 1rem 0;">
                    <i class="fas fa-tools" style="font-size: 3.5rem; color: #f59e0b; margin-bottom: 1.5rem; filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.4));"></i>
                    <h2 style="color: #ffffff; font-weight: 900; margin-bottom: 1rem;">قيد التطوير 🛠️</h2>
                    <p style="color: var(--text-secondary); line-height: 1.6; font-size: 1rem;">هذه الميزة قيد التطوير حالياً وستكون متاحة في التحديث القادم.</p>
                </div>
                <div class="modal-footer" style="border: none; margin-top: 1rem;">
                    <button class="notif-btn notif-btn-secondary" onclick="window.ModalManager.close('underDevModal')" style="width: 100%;">إغلاق</button>
                </div>
            </div>
        </div>
    `,
    annualPromotion: `
        <div id="annualPromotionModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 460px; text-align: center;">
                <div class="modal-body" style="padding: 1rem 0;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem; filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.4));"></i>
                    <h2 style="color: #ffffff; font-weight: 900; margin-bottom: 0.5rem;">هل أنت متأكد من النقل السنوي للموقع بالكامل؟!</h2>
                    <p id="promotionCountdown" class="promotion-countdown">يرجى الانتظار (10) ثوانٍ للتأكيد...</p>
                    <p style="color: var(--text-secondary); line-height: 1.7; font-size: 0.85rem; margin-top: 0.75rem;">
                        سيتم إنشاء نسخة احتياطية تلقائية وترقية جميع الصفوف الدراسية. لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
                    </p>
                </div>
                <div class="modal-footer" style="border: none; margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    <button class="notif-btn notif-btn-secondary" onclick="window.ModalManager.close('annualPromotionModal')" style="flex: 1; min-width: 120px;">إلغاء</button>
                    <button id="confirmPromotionBtn" class="login-btn" style="flex: 1; min-width: 120px; opacity: 0.4; cursor: not-allowed;" disabled>
                        <i class="fas fa-check"></i> تأكيد النقل
                    </button>
                </div>
            </div>
        </div>
    `
};