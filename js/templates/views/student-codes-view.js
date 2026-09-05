window.STUDENT_CODES_VIEW = `
    <main id="studentCodesView" class="main-content view-section student-codes-view" style="display: none;">
        <div class="student-codes-heading student-codes-screen-header">
            <div class="welcome-section">
                <div class="student-codes-kicker">
                    <i class="fas fa-barcode"></i>
                    <span>بطاقات تعريف رقمية</span>
                </div>
                <h1 id="studentCodesTitle" class="hero-title-gradient">كروت جميع الطلاب</h1>
                <p class="hero-subtitle">بطاقات جاهزة للعرض والطباعة، تحتوي على بيانات الطالب وكوده التعريفي.</p>
            </div>
            <div class="student-codes-count" aria-live="polite">
                <strong id="studentCodesCount">0</strong>
                <span>بطاقة طالب</span>
            </div>
            <div class="student-codes-print-controls">
                <button id="studentCodesPrintBtn" class="student-codes-print-btn" type="button" aria-expanded="false" aria-controls="studentCodesPrintMenu">
                    <i class="fas fa-print"></i>
                    <span>طباعة</span>
                    <i class="fas fa-chevron-down student-codes-print-chevron" aria-hidden="true"></i>
                </button>
                <div id="studentCodesPrintMenu" class="student-codes-print-menu" hidden>
                    <button type="button" data-student-codes-print-action="all">
                        <i class="fas fa-layer-group"></i>
                        <span>طباعة الكل</span>
                    </button>
                    <button type="button" data-student-codes-print-action="selected">
                        <i class="fas fa-list-check"></i>
                        <span>طباعة بالتحديد</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="student-codes-toolbar" role="search">
            <label class="student-codes-search">
                <i class="fas fa-search student-codes-search-icon" aria-hidden="true"></i>
                <input
                    id="studentCodesSearchInput"
                    type="search"
                    placeholder="ابحث باسم الطالب أو كود الطالب..."
                    autocomplete="off"
                    aria-label="ابحث باسم الطالب أو كود الطالب"
                >
            </label>
        </div>

        <div id="studentCodesSelectionBar" class="student-codes-selection-bar" hidden>
            <div class="student-codes-selection-summary">
                <i class="fas fa-check-double"></i>
                <strong id="studentCodesSelectionCount">تم تحديد 0 كروت</strong>
            </div>
            <div class="student-codes-selection-actions">
                <button id="studentCodesSelectAllBtn" type="button">تحديد الكل</button>
                <button id="studentCodesDeselectAllBtn" type="button">إلغاء التحديد</button>
                <button id="studentCodesConfirmPrintBtn" class="primary" type="button" disabled>
                    <i class="fas fa-print"></i>
                    <span>تأكيد الطباعة (0)</span>
                </button>
                <button id="studentCodesCancelSelectionBtn" class="cancel" type="button">إلغاء</button>
            </div>
        </div>

        <div id="printable-student-codes" class="student-codes-printable-area">
            <div
                id="studentCodesPrintPages"
                class="student-codes-print-pages"
                aria-hidden="true"
            ></div>
            <div class="student-codes-print-header print-only-header">
                <h2 class="print-grade-title">
                    <span id="studentCodesPrintableGradeTitle">أكواد جميع الطلاب</span>
                </h2>
                <hr class="header-divider">
            </div>
            <div id="studentCodesGrid" class="student-codes-grid student-codes-grid-printable" aria-live="polite"></div>
        </div>
    </main>
`;
