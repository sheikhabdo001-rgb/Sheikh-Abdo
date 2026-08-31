window.EXAMS_VIEW = `
    <main id="examsView" class="main-content view-section" style="display: none;">
        <div class="welcome-section">
            <h1 class="hero-title-gradient"><i class="fas fa-file-signature"></i> نظام الامتحانات والدرجات</h1>
            <p class="hero-subtitle">اختر المرحلة والصف لإدارة درجات الامتحانات وتتبع أداء الطلاب الأكاديمي.</p>
        </div>

        <div id="examsGradeModal" class="modal-overlay">
            <div class="modal-content glass-modal student-grade-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-list-ol"></i> <span id="examsGradeModalTitle">اختر الصف الدراسي</span></h3>
                    <button id="closeExamsGradeModal" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body"><div id="examsGradeOptions" class="grade-grid centered-grid"></div></div>
            </div>
        </div>
    </main>
`;