window.EXAM_GRADES_VIEW = `
    <main id="examGradesView" class="main-content view-section" style="display: none;">
        <div class="welcome-section">
            <h1 class="hero-title-gradient"><i class="fas fa-file-invoice"></i> رصد درجات الطلاب</h1>
            <p class="hero-subtitle">قم بتسجيل وتعديل درجات الامتحانات الشهرية والاختبارات الدورية لكل طالب بشكل دقيق.</p>
        </div>

        <div class="attendance-header">
            <div id="activeExamTermIndicator" class="active-term-badge" style="margin-left: auto;">
                <i class="fas fa-calendar-day"></i>
                <span>الترم الحالي: <strong>الأول</strong></span>
            </div>

            <div class="attendance-actions-wrapper">
                <button id="openTermSelectionBtn" class="select-term-btn">
                    <i class="fas fa-calendar-alt"></i>
                    <span>الترم</span>
                </button>
                <button id="addExamColumnBtn" class="exam-add-column-btn pulse-glow">
                    <i class="fas fa-plus-circle"></i>
                    <span>إضافة امتحان جديد</span>
                </button>
                <button id="exportGradesBtn" class="export-btn" type="button">
                    <i class="fas fa-print"></i>
                    <span>طباعة الكشف</span>
                </button>
            </div>
        </div>

        <!-- Horizontal Exam Tabs Row -->
        <div class="exam-tabs-container-outer">
            <div id="examTabsRow" class="exam-tabs-row">
                <button class="exam-tab-btn master-tab active" data-exam-idx="all">
                    <i class="fas fa-th-list"></i>
                    <span>عرض الكل</span>
                </button>
                <!-- Dynamic tabs injected here -->
            </div>
        </div>

        <div id="examGradesTableContainer" class="exam-grades-wrapper glass-panel">
            <div class="placeholder-content">
                <i class="fas fa-file-signature"></i>
                <p>يرجى الانتظار، جاري تحميل البيانات...</p>
            </div>
        </div>
    </main>
`;
