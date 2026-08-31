window.FINANCIAL_MODALS = {
    financialExportMethod: `
        <div id="financialExportModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 560px;">
                <div class="modal-header">
                    <h3><i class="fas fa-print"></i> طباعة تقرير التقارير المالية - اختيار طريقة التصدير</h3>
                    <button type="button" class="close-modal-btn" aria-label="إغلاق">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-print-options financial-export-method-options">
                        <button id="financialPrintOnlyBtn" type="button" class="print-action-card" data-export-method="print-only">
                            <i class="fas fa-print"></i>
                            <div>
                                <strong>طباعة فقط</strong>
                                <p>فتح نافذة الطباعة لتقرير التقارير المالية</p>
                            </div>
                        </button>
                        <button id="financialPdfOnlyBtn" type="button" class="print-action-card" data-export-method="download-only">
                            <i class="fas fa-file-pdf"></i>
                            <div>
                                <strong>تنزيل PDF فقط</strong>
                                <p>فتح نافذة الطباعة لحفظ التقرير كملف PDF بجودة عالية</p>
                            </div>
                        </button>
                        <button id="financialPrintAndPdfBtn" type="button" class="print-action-card" data-export-method="both">
                            <i class="fas fa-print"></i>
                            <div>
                                <strong>طباعة وتنزيل PDF</strong>
                                <p>فتح نافذة الطباعة لاختيار الطباعة أو حفظ PDF</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    paymentConfirm: `
        <div id="paymentConfirmModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 420px;">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-holding-usd"></i> تأكيد تسجيل السداد</h3>
                    <button class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div style="text-align:center; margin-bottom: 1.5rem;">
                        <span id="paymentConfirmMonth" style="font-weight:800; font-size:1.3rem; color:var(--primary-color);"></span>
                        <div style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-secondary);" id="paymentConfirmStudent"></div>
                    </div>
                    <div class="info-field">
                        <label><i class="fas fa-money-bill-wave"></i> المبلغ المراد سداده</label>
                        <div class="fee-input-wrapper" style="display:flex; align-items:center; gap:0.5rem;">
                            <input type="number" id="paymentConfirmAmount" class="standard-fee-input" style="flex:1; padding:0.75rem 1rem; background:var(--surface-color); border:1.5px solid var(--border-color); border-radius:12px; color:var(--text-primary); font-family:'Cairo',sans-serif; font-weight:700; font-size:1.1rem; outline:none;">
                            <span style="font-weight:800; font-size:1.1rem; color:var(--text-secondary);">ج.م</span>
                        </div>
                        <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.4rem;">يمكنك تعديل المبلغ للخصومات أو الدفعات الجزئية</p>
                    </div>
                </div>
                <div class="modal-footer" style="display:flex; gap:0.75rem; justify-content:center; border:none; padding-top:0;">
                    <button id="cancelPaymentConfirm" class="action-btn-styled secondary" style="flex:1;">إلغاء</button>
                    <button id="confirmPaymentBtn" class="action-btn-styled" style="flex:1; background:var(--gradient-success); color:white; border:none;">تأكيد السداد</button>
                </div>
            </div>
        </div>
    `,
    financialConfig: `
        <div id="financialConfigModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-holding-usd"></i> الإعدادات المالية والتسعير</h3>
                    <button id="closeFinancialConfig" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="helper-text">حدد سعر الشهر الدراسي الأساسي لكل صف، أو قم بتخصيص أسعار لشهور معينة.</p>
                    <div id="pricingStagesContainer"></div>
                </div>
                <div class="modal-footer">
                    <button id="saveFinancialSettings" class="login-btn">حفظ جميع الإعدادات</button>
                </div>
            </div>
        </div>
    `,
    customFeeSelector: `
        <div id="customFeeModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-tags"></i> تخصيص سعر لشهر محدد</h3>
                    <button id="closeCustomFee" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label>اختر الصف:</label>
                        <select id="customFeeGradeSelect" class="month-select-enhanced" style="width:100%"></select>
                    </div>
                    <div class="input-group">
                        <label>اختر الشهر:</label>
                        <select id="customFeeMonthSelect" class="month-select-enhanced" style="width:100%"></select>
                    </div>
                    <div class="input-group">
                        <label>السعر المخصص:</label>
                        <div class="fee-input-wrapper">
                            <input type="number" id="customFeeAmountInput" placeholder="أدخل المبلغ">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirmCustomFee" class="login-btn">إضافة التخصيص</button>
                </div>
            </div>
        </div>
    `
};
