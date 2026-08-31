// Weekly Schedule Export Method Selection Modal
window.SCHEDULE_EXPORT_MODAL = {
    schedulePrintOptions: `
        <div id="schedulePrintOptionsModal" class="modal-overlay">
            <div class="modal-content glass-modal schedule-print-options-modal" style="max-width: 560px;">
                <div class="modal-header">
                    <h3><i class="fas fa-print"></i> اختر نوع الطباعة</h3>
                    <button type="button" class="close-modal-btn" aria-label="إغلاق">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="helper-text schedule-print-options-intro">
                        برجاء تحديد التقرير المطلوب طباعته لجميع المراحل:
                    </p>
                    <div class="profile-print-options schedule-print-options-list">
                        <button
                            type="button"
                            class="print-action-card"
                            data-schedule-print-mode="MATRIX_ONLY"
                        >
                            <i class="fas fa-map"></i>
                            <div>
                                <strong>طباعة الخريطة الزمنية (الشبكية)</strong>
                                <p>تنزيل صفحة الخريطة الأسبوعية لجميع المراحل فقط</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            class="print-action-card"
                            data-schedule-print-mode="GRADES_ONLY"
                        >
                            <i class="fas fa-table-list"></i>
                            <div>
                                <strong>طباعة جداول الصفوف</strong>
                                <p>تنزيل جداول الصفوف التفصيلية لجميع المراحل فقط</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            class="print-action-card schedule-print-all-option highlight"
                            data-schedule-print-mode="PRINT_ALL"
                        >
                            <i class="fas fa-copy"></i>
                            <div>
                                <strong>طباعة الكل (التقرير الشامل)</strong>
                                <p>تنزيل جداول الصفوف والخريطة الزمنية في ملف واحد</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    scheduleExportMethod: `
        <div id="schedulePrintModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 560px;">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-week"></i> طباعة جدول المواعيد - اختيار طريقة التصدير</h3>
                    <button type="button" class="close-modal-btn" aria-label="إغلاق">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-print-options schedule-export-method-options">
                        <button type="button" class="print-action-card" data-export-method="print-only">
                            <i class="fas fa-print"></i>
                            <div>
                                <strong>طباعة فقط</strong>
                                <p>فتح نافذة الطباعة لجدول المواعيد الأسبوعي</p>
                            </div>
                        </button>
                        <button type="button" class="print-action-card" data-export-method="download-only">
                            <i class="fas fa-file-pdf"></i>
                            <div>
                                <strong>تنزيل PDF فقط</strong>
                                <p>إنشاء ملف PDF لجدول المواعيد وتنزيله مباشرة</p>
                            </div>
                        </button>
                        <button type="button" class="print-action-card" data-export-method="both">
                            <i class="fas fa-print"></i>
                            <div>
                                <strong>طباعة وتنزيل PDF</strong>
                                <p>تنزيل ملف PDF ثم فتح نافذة الطباعة</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};
