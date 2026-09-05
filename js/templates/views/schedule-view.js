window.SCHEDULE_VIEW = `
    <main id="scheduleView" class="main-content view-section" style="display: none;">
        <div class="welcome-section">
            <h1 class="hero-title-gradient"><i class="fas fa-calendar-week"></i> جدول المواعيد الذكي</h1>
            <p class="hero-subtitle">جدول الحصص الأسبوعي للمجموعات الدراسية. استعراض دقيق للمواعيد والقاعات المخصصة لكل مرحلة.</p>
            <div style="display: flex; justify-content: center; margin-top: 10px;">
                <button id="schedulePrintBtn" class="export-btn" type="button">
                    <i class="fas fa-print"></i>
                    <span>طباعة جدول المواعيد</span>
                </button>
            </div>
        </div>

        <div id="scheduleTableContainer" class="schedule-table-container glass-panel dashboard-schedule-container">
            <div class="placeholder-content">
                <div class="loader-spinner"></div>
                <p>جاري تحضير الجدول الزمني...</p>
            </div>
        </div>
    </main>
`;
