window.STUDENT_MODALS = {
    linkStudent: `
        <div id="linkStudentModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 820px;">
                <div class="modal-header">
                    <h3><i class="fas fa-link" style="color:#c084fc;"></i> ربط الطالب بأخ أو قريب</h3>
                    <button id="closeLinkStudentModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p id="linkStudentCurrentLabel" class="helper-text"></p>
                    <div class="search-wrapper" style="margin-bottom:1rem;">
                        <i class="fas fa-search search-icon"></i>
                        <input type="search" id="linkStudentSearchInput" placeholder="ابحث باسم الطالب" aria-label="البحث عن طالب لربطه">
                    </div>
                    <div id="linkStudentResults" class="table-responsive"></div>
                </div>
            </div>
        </div>
    `,
    addStudent: `
        <div id="addStudentModal" class="modal-overlay">
            <div class="modal-content glass-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-user-plus"></i> <span id="addStudentModalTitle">إضافة طالب جديد</span></h3>
                    <button id="closeAddStudentModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="duplicateWarning" class="error-message" style="margin-bottom: 15px; text-align: center;">هذا الاسم موجود بالفعل في القائمة!</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 15px;">
                        <div class="assigned-serial-box" style="margin-bottom:0;">
                            <span>مسلسل:</span>
                            <strong id="assignedSerialNumber">#1</strong>
                        </div>
                        <div class="assigned-serial-box" style="margin-bottom:0; border-color:var(--success-color); background:rgba(16,185,129,0.05); color:white;">
                            <span>كود الطالب:</span>
                            <strong id="assignedStudentCode" style="color:var(--success-color);">------</strong>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:10px; align-items: flex-start;">
                        <div style="flex:1;">
                            <div class="input-group">
                                <i class="fas fa-user"></i>
                                <input type="text" id="newStudentName" placeholder="اسم الطالب بالكامل" required>
                            </div>
                        </div>
                        <button type="button" id="mainDualRegBtn" class="choose-grades-btn" style="height:50px; padding:0 15px; background:rgba(147,51,234,0.1); border-color:#9333ea; border-radius:12px;">
                            <i class="fas fa-plus-circle"></i>
                            <span>تسجيل مزدوج +</span>
                        </button>
                        <button type="button" id="mainCustomFeeBtn" class="choose-grades-btn" style="height:50px; padding:0 15px; background:rgba(245,158,11,0.05); border-color:#f59e0b; border-radius:12px; color:#f59e0b;">
                            <i class="fas fa-tags"></i>
                            <span>تخصيص سعر</span>
                        </button>
                    </div>

                    <div id="mainCustomFeeBadge" style="display:none; margin-bottom:10px; padding:8px 15px; background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:10px; font-size:0.8rem; color:#f59e0b; font-weight:800; align-items:center; gap:8px;">
                        <i class="fas fa-coins"></i>
                        <span>تم تطبيق سعر مخصص للطالب</span>
                        <button type="button" id="clearMainCustomFee" style="margin-right:auto; background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times-circle"></i></button>
                    </div>

                    <div id="mainDualRegBadge" style="display:none; margin-bottom:15px; padding:8px 15px; background:rgba(16,185,129,0.1); border:1px solid #10b981; border-radius:10px; font-size:0.8rem; color:#10b981; font-weight:800; align-items:center; gap:8px;">
                        <i class="fas fa-link"></i>
                        <span>مسار إضافي: <strong id="mainDualRegLabel"></strong></span>
                        <button type="button" id="clearMainDualReg" style="margin-right:auto; background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times-circle"></i></button>
                    </div>

                    <div class="input-group">
                        <i class="fas fa-phone-alt"></i>
                        <input type="tel" id="newStudentPhone" placeholder="رقم هاتف الطالب (اختياري)">
                    </div>
                    <div class="input-group">
                        <i class="fas fa-phone-square-alt"></i>
                        <input type="tel" id="newParentPhone" placeholder="رقم هاتف ولي الأمر (اختياري)">
                    </div>

                    <!-- Siblings Section -->
                    <div id="siblingsSection" style="display:none; margin-top: 1rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem; padding-bottom:0.5rem; border-bottom:1px solid rgba(147,51,234,0.2);">
                            <i class="fas fa-users" style="color:#c084fc;"></i>
                            <span style="font-weight:800; color:#c084fc; font-size:0.9rem;">الأقارب / الأخوة في نفس العائلة</span>
                        </div>
                        <div id="siblingsContainer"></div>
                        <button type="button" id="addSiblingBtn" style="width:100%; padding:10px; background:rgba(147,51,234,0.08); border:2px dashed rgba(147,51,234,0.4); border-radius:12px; color:#c084fc; font-family:Cairo,sans-serif; font-weight:700; font-size:0.9rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.3s ease; margin-top:0.5rem;">
                            <i class="fas fa-user-plus"></i>
                            <span>إضافة قريب / أخ</span>
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirmAddStudentBtn" class="login-btn">حفظ البيانات</button>
                </div>
            </div>
        </div>
    `,
    familyPayment: `
        <div id="familyPaymentModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-users" style="color:#c084fc;"></i> تحصيل رسوم الأقارب</h3>
                    <button id="closeFamilyPaymentModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="familyPaymentList"></div>
                    <div style="margin-top:1.25rem; padding:1rem 1.5rem; background:rgba(147,51,234,0.1); border-radius:15px; border:1px solid rgba(147,51,234,0.3); display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:var(--text-secondary);">إجمالي المبلغ المحدد:</span>
                        <strong id="familyPaymentTotal" style="font-size:1.5rem; color:#c084fc; font-family:Cairo,sans-serif;">0 ج.م</strong>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirmFamilyPaymentBtn" class="login-btn">
                        <i class="fas fa-money-bill-wave"></i>
                        تسجيل السداد للمحدد
                    </button>
                </div>
            </div>
        </div>
    `,
    multiStagePayment: `
        <div id="multiStagePaymentModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 550px;">
                <div class="modal-header">
                    <h3><i class="fas fa-layer-group" style="color:#c084fc;"></i> تحصيل مراحل متعددة</h3>
                    <button id="closeMultiStagePaymentModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="helper-text">هذا الطالب مسجل في أكثر من مرحلة. يمكنك تحصيل الرسوم لعدة مراحل دفعة واحدة:</p>
                    <div id="multiStagePaymentList" style="display:flex; flex-direction:column; gap:12px;"></div>
                    <div style="margin-top:1rem; padding:1rem; background:rgba(16,185,129,0.1); border:1.5px solid var(--success-color); border-radius:15px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700;">إجمالي السداد:</span>
                        <strong id="multiStagePaymentTotal" style="font-size:1.4rem; color:var(--success-color); font-family:Cairo;">0 ج.م</strong>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirmMultiStagePaymentBtn" class="login-btn success-btn" style="background:linear-gradient(135deg, #10b981, #059669);">
                        <i class="fas fa-check-double"></i>
                        تأكيد سداد المراحل المحددة
                    </button>
                </div>
            </div>
        </div>
    `,
    customFeeSelector: `
        <div id="customFeeSelectorModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-holding-usd" style="color:#f59e0b;"></i> تخصيص سعر الاشتراك</h3>
                    <button id="closeCustomFeeSelector" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="customFeeFieldsContainer">
                    <!-- Fields injected here based on dual reg state -->
                </div>
                <div class="modal-footer">
                    <button id="confirmCustomFeeBtn" class="login-btn" style="background:linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 15px rgba(245,158,11,0.3);">
                        <i class="fas fa-check-circle"></i>
                        تأكيد وحفظ السعر
                    </button>
                </div>
            </div>
        </div>
    `,
    dualRegistrationSelector: `
        <div id="dualRegistrationModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 480px;">
                <div class="modal-header">
                    <h3><i class="fas fa-link" style="color:var(--primary-color);"></i> تحديد التسجيل المزدوج</h3>
                    <button id="closeDualRegModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="helper-text" id="dualRegHelpText" style="text-align:center;"></p>
                    <div id="dualRegOptionsList" style="display:flex; flex-direction:column; gap:10px; max-height: 400px; overflow-y:auto; padding:5px;"></div>
                </div>
                <div class="modal-footer">
                    <button id="confirmDualRegBtn" class="login-btn glow-btn">
                        <i class="fas fa-check-circle"></i>
                        تأكيد الربط المزدوج
                    </button>
                </div>
            </div>
        </div>
    `,
    confirmDeleteAll: `
        <div id="deleteAllModal" class="modal-overlay">
            <div class="modal-content glass-modal warning-modal">
                <div class="modal-header">
                    <h3 class="danger-text"><i class="fas fa-exclamation-triangle"></i> تحذير هام</h3>
                    <button id="closeDeleteAllModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="warning-text">هل أنت متأكد من حذف جميع الطلاب والمربعات نهائياً؟</p>
                    <p class="sub-warning">سيتم تصفير القائمة والمربعات الخالية لهذه المرحلة والصف.</p>
                </div>
                <div class="modal-footer">
                    <div class="modal-actions-grid">
                        <button id="cancelDeleteAllBtn" class="action-btn-styled secondary">إلغاء</button>
                        <button id="confirmDeleteAllBtn" class="action-btn-styled danger">نعم، حذف الكل</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    emptySlots: `
        <div id="emptySlotsModal" class="modal-overlay">
            <div class="modal-content glass-modal empty-slots-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-border-all" style="color:#f59e0b;"></i> المربعات الخالية</h3>
                    <button id="closeEmptySlotsModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p id="emptySlotsModalSummary" class="empty-slots-modal-summary"></p>
                    <div id="emptySlotsList" class="empty-slots-list"></div>
                </div>
            </div>
        </div>
    `
};
