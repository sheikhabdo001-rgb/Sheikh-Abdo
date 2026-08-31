// Student Profile Print Wizard Modal (2 steps: scope then export action)
window.PROFILE_PRINT_MODAL = {
    profilePrint: `
        <div id="profilePrintModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 620px;">
                <div class="modal-header">
                    <h3><i class="fas fa-print"></i> طباعة تقرير الطالب</h3>
                    <button class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">

                    <!-- STEP 1: Report Scope Selection -->
                    <div id="profilePrintStep1" class="profile-print-step" style="flex-direction: column; gap: 1.25rem;">
                        <div class="profile-print-step-head">
                            <span class="step-chip">الخطوة 1</span>
                            <h4>اختيار محتوى التقرير</h4>
                        </div>

                        <div class="profile-print-options">
                            <button type="button" class="print-option-card" data-scope="all">
                                <input type="checkbox" class="profile-scope-checkbox" tabindex="-1" aria-label="اختيار كل أقسام التقرير">
                                <i class="fas fa-folder-open"></i>
                                <div>
                                    <strong>الكل</strong>
                                    <p>الحضور والغياب + درجات الامتحانات + السجل المالي والمدفوعات</p>
                                </div>
                            </button>
                            <button type="button" class="print-option-card" data-scope="attendance">
                                <input type="checkbox" class="profile-scope-checkbox" tabindex="-1" aria-label="اختيار سجل الحضور والغياب">
                                <i class="fas fa-calendar-check"></i>
                                <div>
                                    <strong>سجل الحضور والغياب</strong>
                                    <p>كشف الحضور والغياب للطالب فقط</p>
                                </div>
                            </button>
                            <button type="button" class="print-option-card" data-scope="finance">
                                <input type="checkbox" class="profile-scope-checkbox" tabindex="-1" aria-label="اختيار السجل المالي والمدفوعات">
                                <i class="fas fa-file-invoice-dollar"></i>
                                <div>
                                    <strong>السجل المالي والمدفوعات</strong>
                                    <p>كشف المدفوعات والمستحقات للطالب فقط</p>
                                </div>
                            </button>
                            <button type="button" class="print-option-card" data-scope="exams">
                                <input type="checkbox" class="profile-scope-checkbox" tabindex="-1" aria-label="اختيار درجات سجل الامتحانات">
                                <i class="fas fa-graduation-cap"></i>
                                <div>
                                    <strong>درجات سجل الامتحانات</strong>
                                    <p>كشف درجات الامتحانات والتقديرات وحالة الحضور فقط</p>
                                </div>
                            </button>
                        </div>

                        <div class="profile-print-nav">
                            <button type="button" id="printStepNext" class="profile-print-primary" disabled>
                                التالي <i class="fas fa-arrow-left"></i>
                            </button>
                        </div>
                    </div>

                    <!-- STEP 2: Output Action Selection -->
                    <div id="profilePrintStep2" class="profile-print-step" style="display: none; flex-direction: column; gap: 1.25rem;">
                        <div class="profile-print-step-head">
                            <span class="step-chip">الخطوة 2</span>
                            <h4>اختيار طريقة التصدير</h4>
                        </div>

                        <div class="profile-print-options">
                            <button type="button" class="print-action-card" data-action="print">
                                <i class="fas fa-print"></i>
                                <div>
                                    <strong>طباعة فقط</strong>
                                    <p>فتح نافذة الطباعة بالتخطيط المخصص</p>
                                </div>
                            </button>
                            <button type="button" class="print-action-card" data-action="download">
                                <i class="fas fa-file-pdf"></i>
                                <div>
                                    <strong>تنزيل PDF فقط</strong>
                                    <p>تحميل التقرير مباشرة على جهازك</p>
                                </div>
                            </button>
                            <button type="button" class="print-action-card" data-action="both">
                                <i class="fas fa-download"></i>
                                <div>
                                    <strong>طباعة وتنزيل PDF</strong>
                                    <p>تنزيل الملف ثم فتح نافذة الطباعة</p>
                                </div>
                            </button>
                        </div>

                        <div class="profile-print-nav">
                            <button type="button" id="printStepBack" class="profile-print-secondary">
                                <i class="fas fa-arrow-right"></i> رجوع
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `
};
