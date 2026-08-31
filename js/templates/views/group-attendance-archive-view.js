window.GROUP_ATTENDANCE_ARCHIVE_VIEW = `
    <main id="groupAttendanceArchiveView" class="main-content view-section" style="display: none;">
        <div class="attendance-header group-archive-header">
            <div>
                <h1>أرشيف حضور وغياب المجموعات</h1>
                <p class="group-archive-subtitle">استعرض لقطات الجلسات المكتملة لكل مجموعة وطلابها</p>
            </div>
            <button id="printGroupSessionAttendanceBtn" class="export-btn" type="button">
                <i class="fas fa-print"></i>
                <span>طباعة الكشف</span>
            </button>
            <button id="openRepeatedAbsenceBtn" class="repeated-absence-entry-btn" type="button">
                <i class="fas fa-user-clock"></i>
                <span>الغياب المتكرر</span>
            </button>
        </div>

        <div class="group-archive-toolbar glass-panel">
            <button id="groupArchiveBackBtn" class="group-archive-back-btn" type="button">
                <i class="fas fa-arrow-right"></i>
                <span>العودة</span>
            </button>
            <div class="group-archive-filter-grid">
                <label>
                    <span><i class="fas fa-users"></i> المجموعة</span>
                    <select id="groupFilterSelect">
                        <option value="all">كل المجموعات</option>
                    </select>
                </label>
                <label>
                    <span><i class="fas fa-calendar-days"></i> الشهر</span>
                    <select id="monthSelectFilter" class="custom-select-dark">
                        <option value="">كل الشهور (عرض الكل)</option>
                    </select>
                </label>
                <label class="group-archive-session-field">
                    <span><i class="fas fa-clock-rotate-left"></i> الجلسة المؤرشفة</span>
                    <select id="archivedSessionsSelect">
                        <option value="">لا توجد جلسات مكتملة</option>
                    </select>
                </label>
            </div>
        </div>

        <div class="group-archive-toggle-bar glass-panel" role="group" aria-label="تصفية حالة الحضور">
            <button type="button" class="group-archive-toggle active" data-archive-status="ALL">القائمة بالكامل</button>
            <button type="button" class="group-archive-toggle" data-archive-status="PRESENT">قائمة الحضور</button>
            <button type="button" class="group-archive-toggle" data-archive-status="ABSENT">قائمة الغياب</button>
        </div>

        <div id="groupArchiveSessionSummary" class="group-archive-session-summary glass-panel"></div>
        <div id="groupAttendanceArchiveTableContainer" class="group-attendance-archive-table-container glass-panel">
            <div class="placeholder-content">
                <i class="fas fa-clock-rotate-left"></i>
                <p>لا توجد جلسة مؤرشفة مطابقة للفلاتر الحالية</p>
            </div>
        </div>
    </main>
`;
