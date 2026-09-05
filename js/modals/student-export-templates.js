// Student List Export Method Selection Modal
window.STUDENT_EXPORT_MODAL = {
    studentExportMethod: `
        <div id="studentExportMethodModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 560px;">
                <div class="modal-header">
                    <h3><i class="fas fa-print"></i> طباعة تقرير الطلاب - اختيار طريقة التصدير</h3>
                    <button type="button" class="close-modal-btn" aria-label="إغلاق">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-print-options student-export-method-options">
                        <button type="button" class="print-action-card" data-export-method="print-only">
                            <i class="fas fa-print"></i>
                            <div>
                                <strong>طباعة فقط</strong>
                                <p>فتح نافذة الطباعة لقائمة الطلاب</p>
                            </div>
                        </button>
                        <button type="button" class="print-action-card" data-export-method="download-only">
                            <i class="fas fa-file-pdf"></i>
                            <div>
                                <strong>تنزيل PDF فقط</strong>
                                <p>إنشاء ملف PDF وتنزيله مباشرة</p>
                            </div>
                        </button>
                        <button type="button" class="print-action-card" data-export-method="both">
                            <i class="fas fa-print"></i>
                            <div>
                                <strong>طباعة وتنزيل PDF</strong>
                                <p>تنزيل ملف PDF أولاً ثم فتح نافذة الطباعة</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};
