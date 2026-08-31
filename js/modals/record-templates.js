window.RECORD_MODALS = {
    monthSelection: `
        <div id="monthSelectionModal" class="modal-overlay">
            <div class="modal-content glass-modal month-selection-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-alt"></i> <span id="monthSelectionTitle">اختيار الشهور</span></h3>
                    <button id="closeMonthSelection" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="monthsGrid" class="months-grid"></div>
                </div>
                <div class="modal-footer">
                    <button id="saveMonthSelection" class="login-btn">حفظ الاختيار</button>
                </div>
            </div>
        </div>
    `,
    startMonthSelection: `
        <div id="startMonthModal" class="modal-overlay">
            <div class="modal-content glass-modal month-selection-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-plus"></i> <span id="startMonthTitle">تحديد شهر البداية</span></h3>
                    <button id="closeStartMonthModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="helper-text">اختر الشهر الذي سيبدأ منه تسجيل المدفوعات</p>
                    <div id="startMonthsGrid" class="months-grid"></div>
                </div>
                <div class="modal-footer">
                    <button id="saveStartMonth" class="login-btn">تأكيد الاختيار</button>
                </div>
            </div>
        </div>
    `,
    debtList: `
        <div id="debtListModal" class="modal-overlay">
            <div class="modal-content glass-modal debt-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-circle"></i> مديونيات الطالب: <span id="debtModalStudentName"></span></h3>
                    <button id="closeDebtList" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="debt-summary-info">
                        <span>إجمالي الشهور المتأخرة:</span>
                        <strong id="debtModalCount">0</strong>
                    </div>
                    <div id="debtListContainer" class="debt-items-list">
                        <!-- Debt items injected here -->
                    </div>
                </div>
            </div>
        </div>
    `,
    reversePayment: `
        <div id="reversePaymentModal" class="modal-overlay">
            <div class="modal-content glass-modal debt-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-undo-alt"></i> التراجع عن سداد شهر <span id="reversePaymentMonthName"></span></h3>
                    <button id="closeReversePaymentModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="warning-text">هل أنت متأكد أنك تريد إلغاء سداد هذا الشهر؟</p>
                    <p class="sub-warning">سيتم إعادة حالة الشهر إلى "غير مدفوع" وتحديث حالة السداد العامة وعدد الشهور المديونة.</p>
                </div>
                <div class="modal-footer">
                    <div class="modal-actions-grid">
                        <button id="cancelReversePaymentBtn" class="action-btn-styled secondary">إلغاء</button>
                        <button id="confirmReversePaymentBtn" class="action-btn-styled danger">نعم، التراجع عن السداد</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    nonPayersList: `
        <div id="nonPayersModal" class="modal-overlay">
            <div class="modal-content glass-modal non-payers-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-user-times"></i> قائمة الممتنعين عن الدفع</h3>
                    <button id="closeNonPayersModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="non-payers-controls">
                        <div class="month-filter-wrapper glass-panel">
                            <i class="fas fa-calendar"></i>
                            <select id="nonPayersMonthFilter">
                                <option value="previous">الشهر السابق (افتراضي)</option>
                            </select>
                        </div>
                    </div>
                    <div id="nonPayersTableContainer" class="non-payers-table-container">
                        <div class="placeholder-content">
                            <i class="fas fa-user-check"></i>
                            <p>لا يوجد طلاب متأخرون في السداد</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    printLoading: `
        <div id="printLoadingModal" class="modal-overlay" style="z-index: 5000;">
            <div class="modal-content glass-modal" style="max-width: 350px; text-align: center; padding: 3rem;">
                <div class="print-loader-container">
                    <div class="neon-spinner"></div>
                    <i class="fas fa-file-pdf loader-icon"></i>
                </div>
                <h3 style="margin-top: 1.5rem; color: #ffffff;">جاري تحضير الملف...</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">يرجى الانتظار لحظات لتوليد نسخة الطباعة</p>
            </div>
        </div>
    `
};