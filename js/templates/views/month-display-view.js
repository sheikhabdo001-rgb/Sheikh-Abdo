window.MONTH_DISPLAY_VIEW = `
    <main id="monthDisplayView" class="main-content view-section" style="display: none;">
        <div class="attendance-header">
            <h1 style="text-align: right; width: 100%;">عرض الشهور</h1>
        </div>
        <div class="date-display-box glass-panel">
            <i class="fas fa-calendar-day"></i>
            <span id="monthDisplayDateDisplay">--</span>
        </div>
        <div class="term-selection-container glass-panel">
            <div class="term-block">
                <button id="selectFirstTermBtn" class="term-btn first-term">
                    <i class="fas fa-calendar-check"></i>
                    <span>الترم الأول</span>
                </button>
                <button id="setStartMonthFirstBtn" class="set-start-month-btn">
                    <i class="fas fa-calendar-plus"></i>
                    <span>تحديد شهر البداية</span>
                </button>
                <div id="firstTermStartDisplay" class="start-month-display"></div>
            </div>
            <div class="term-block">
                <button id="selectSecondTermBtn" class="term-btn second-term">
                    <i class="fas fa-calendar-check"></i>
                    <span>الترم الثاني</span>
                </button>
                <button id="setStartMonthSecondBtn" class="set-start-month-btn">
                    <i class="fas fa-calendar-plus"></i>
                    <span>تحديد شهر البداية</span>
                </button>
                <div id="secondTermStartDisplay" class="start-month-display"></div>
            </div>
        </div>
    </main>
`;