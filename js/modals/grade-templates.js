window.GRADE_MODALS = {
    gradeSelection: `
        <div id="gradeSelectionModal" class="modal-overlay">
            <div class="modal-content glass-modal grade-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-tasks"></i> <span id="gradeModalTitle">اختيار الصفوف</span></h3>
                    <button id="closeGradeModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body"><div id="gradeOptionsContainer" class="grade-grid"></div></div>
                <div class="modal-footer"><button id="saveGradesBtn" class="login-btn compact-btn">حفظ الاختيار</button></div>
            </div>
        </div>
    `,
    dashboardGradeView: `
        <div id="dashboardGradeModal" class="modal-overlay">
            <div class="modal-content glass-modal grade-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-graduation-cap"></i> <span id="viewGradeTitle">الصفوف المختارة</span></h3>
                    <button id="closeViewGradeModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body"><div id="viewGradeContainer" class="grade-grid"></div></div>
            </div>
        </div>
    `,
    studentGradeSelection: `
        <div id="studentGradeModal" class="modal-overlay">
            <div class="modal-content glass-modal student-grade-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-list-ol"></i> <span id="studentGradeModalTitle">اختر الصف الدراسي</span></h3>
                    <button id="closeStudentGradeModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body"><div id="studentGradeOptions" class="grade-grid centered-grid"></div></div>
            </div>
        </div>
    `,
    examTermSelection: `
        <div id="examTermSelectionModal" class="modal-overlay">
            <div class="modal-content glass-modal term-selector-modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-filter"></i> تحديد عرض الترم</h3>
                    <button id="closeExamTermModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="helper-text" style="text-align: center;">اختر الترم الدراسي الذي ترغب في عرض ورصد درجاته:</p>
                    <div class="term-options-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
                        <button class="term-option-btn glass-panel" data-term="1" style="padding: 2rem; border-radius: 20px; cursor: pointer; border: 2px solid var(--primary-color); background: rgba(79, 70, 229, 0.05);">
                            <i class="fas fa-calendar-check" style="font-size: 2rem; color: var(--primary-color); display: block; margin-bottom: 1rem;"></i>
                            <strong style="font-size: 1.2rem; display: block; font-family: 'Cairo';">الترم الأول</strong>
                        </button>
                        <button class="term-option-btn glass-panel" data-term="2" style="padding: 2rem; border-radius: 20px; cursor: pointer; border: 2px solid var(--warning-color); background: rgba(245, 158, 11, 0.05);">
                            <i class="fas fa-calendar-plus" style="font-size: 2rem; color: var(--warning-color); display: block; margin-bottom: 1rem;"></i>
                            <strong style="font-size: 1.2rem; display: block; font-family: 'Cairo';">الترم الثاني</strong>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    studentAcademicRecord: `
        <div id="studentAcademicRecordModal" class="modal-overlay">
            <div class="modal-content glass-modal academic-record-modal">
                <div class="modal-header">
                    <div class="academic-header-info">
                        <h3><i class="fas fa-file-invoice"></i> السجل الأكاديمي للطالب</h3>
                        <h2 id="academicRecordStudentName" class="student-name-highlight">---</h2>
                    </div>
                    <button id="closeAcademicRecordModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="record-filter-toggle">
                        <button class="record-toggle-btn" data-filter="1">الترم الأول</button>
                        <button class="record-toggle-btn" data-filter="2">الترم الثاني</button>
                        <button class="record-toggle-btn" data-filter="all">العام الكامل</button>
                    </div>
                    <div id="academicRecordTableContainer" class="academic-table-wrapper">
                        <!-- Table injected here -->
                    </div>
                </div>
            </div>
        </div>
    `,
    globalContextSelector: `
        <div id="globalContextModal" class="modal-overlay">
            <div class="modal-content glass-modal context-selector-modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-filter"></i> تحديد سياق العرض</h3>
                    <button id="closeContextModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="contextSelectorContainer" class="context-dynamic-body">
                        <!-- Content injected: Stages or Grades -->
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: center; gap: 1rem;">
                    <button id="resetGlobalContextBtn" class="action-btn-styled secondary" style="width: auto; padding: 10px 30px; border-radius: 50px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-secondary);">
                        <i class="fas fa-globe"></i> عرض كافة المراحل
                    </button>
                </div>
            </div>
        </div>
    `,
    addExamColumn: `
        <div id="addExamColumnModal" class="modal-overlay">
            <div class="modal-content glass-modal exam-setup-modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h3><i class="fas fa-file-signature"></i> إضافة امتحان جديد</h3>
                    <button id="closeAddExamModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="exam-basic-info">
                        <div class="input-group">
                            <label><i class="fas fa-signature"></i> اسم الامتحان</label>
                            <input type="text" id="examNameInput" class="exam-modal-input" placeholder="مثال: امتحان شهر أكتوبر">
                        </div>
                        <div class="input-group">
                            <label><i class="fas fa-award"></i> الدرجة الكلية للامتحان</label>
                            <input type="number" id="examTotalScoreInput" class="exam-modal-input" placeholder="مثلاً: 100">
                        </div>
                    </div>
                    <div id="bracketValidationError" class="error-message" style="display: none; margin-top: 1rem; text-align: center;">
                        برجاء إدخال البيانات المطلوبة بشكل صحيح
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirmAddExamColumn" class="login-btn exam-confirm-btn">
                        <i class="fas fa-plus-circle"></i>
                        <span>إنشاء الامتحان الآن</span>
                    </button>
                </div>
            </div>
        </div>
    `
};