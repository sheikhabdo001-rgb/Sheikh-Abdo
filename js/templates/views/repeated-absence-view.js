window.REPEATED_ABSENCE_VIEW = `
    <main id="repeatedAbsenceView" class="main-content view-section" style="display: none;">
        <div class="attendance-header repeated-absence-header">
            <div>
                <h1>صفحة الغياب المتكرر</h1>
                <p class="repeated-absence-subtitle">تابع حالات الغياب واتخذ إجراء الطرد مع حفظ كامل بيانات الطالب</p>
            </div>
            <div class="repeated-absence-header-actions">
                <button id="printRepeatedAbsenceBtn" class="repeated-absence-print-btn" type="button">
                    <i class="fas fa-print"></i>
                    <span>طباعة</span>
                </button>
                <button id="openAbsenceSettingsBtn" class="absence-settings-btn" type="button">
                    <i class="fas fa-sliders"></i>
                    <span>إعدادات الغياب</span>
                </button>
                <button id="openExpelledStudentsBtn" class="expelled-students-btn" type="button">
                    <i class="fas fa-user-slash"></i>
                    <span>الطلاب المطرودين</span>
                </button>
                <button id="repeatedAbsenceBackBtn" class="group-archive-back-btn" type="button">
                    <i class="fas fa-arrow-right"></i>
                    <span>العودة للأرشيف</span>
                </button>
            </div>
        </div>

        <div class="repeated-absence-context" id="repeatedAbsenceContext"></div>

        <div class="repeated-absence-toolbar glass-panel">
            <label class="repeated-absence-search-field">
                <span><i class="fas fa-magnifying-glass"></i> البحث</span>
                <input id="repeatedAbsenceSearchInput" type="search"
                    placeholder="البحث عن الطالب من خلال اسم الطالب او كود الطالب"
                    aria-label="البحث عن الطالب من خلال اسم الطالب او كود الطالب">
            </label>
            <div class="repeated-absence-filter-row">
                <fieldset class="term-choice-field">
                    <legend><i class="fas fa-calendar-check"></i> الترم</legend>
                    <label><input type="radio" name="repeatedAbsenceTerm" value="1"><span>الترم الأول</span></label>
                    <label><input type="radio" name="repeatedAbsenceTerm" value="2"><span>الترم الثاني</span></label>
                </fieldset>
                <label class="repeated-absence-select-field">
                    <span><i class="fas fa-calendar-week"></i> الفترة الزمنية</span>
                    <select id="repeatedAbsenceTimeFilter" aria-label="اختيار الأسبوع أو الشهر"></select>
                </label>
            </div>
        </div>

        <div id="repeatedAbsenceSummary" class="repeated-absence-summary glass-panel"></div>
        <div id="repeatedAbsenceTableContainer" class="repeated-absence-table-container glass-panel"></div>
    </main>
`;
