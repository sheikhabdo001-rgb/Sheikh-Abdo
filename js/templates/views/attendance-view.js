window.ATTENDANCE_VIEW = `
    <main id="attendanceView" class="main-content view-section" style="display: none;">
        <div id="attendanceClock" class="clock-widget glass-panel mini-clock">
            <div class="clock-time">--:--:--</div>
            <div class="clock-date">--------</div>
        </div>
        <div class="attendance-header">
            <h1 style="text-align: right;">نظام تسجيل الحضور</h1>
            <div class="attendance-actions-wrapper">
                <button id="viewGroupsBtn" class="view-groups-btn" title="عرض المجموعات">
                    <i class="fas fa-layer-group"></i>
                    <span>عرض المجموعات</span>
                </button>
                <button id="openRecordsBtn" class="records-btn" title="تفاصيل حضور الطلاب">
                    <i class="fas fa-history"></i>
                    <span>تفاصيل الحضور والغياب (للطلاب)</span>
                </button>
                <button id="groupAttendanceHistoryBtn" class="group-attendance-history-btn" title="تفاصيل حضور المجموعات">
                    <i class="fas fa-users-gear"></i>
                    <span>تفاصيل الحضور والغياب (للمجاميع)</span>
                </button>
                <button id="openGroupsManager" class="groups-manager-btn" title="إدارة المجموعات">
                    <i class="fas fa-users-cog"></i>
                </button>
            </div>
        </div>
        <div id="attendanceSummary" class="attendance-summary glass-panel">
            <div class="summary-content">
                <i class="fas fa-info-circle"></i>
                <span id="summaryText">لم يتم تحديد مجموعة بعد</span>
            </div>
        </div>
        <div id="attendanceSessionControls" class="attendance-session-controls glass-panel">
            <div class="session-filter-field">
                <i class="fas fa-clock-rotate-left"></i>
                <label for="attendanceSessionFilterSelect">جلسة الحضور:</label>
                <select id="attendanceSessionFilterSelect">
                    <option value="current">الحصة الحالية</option>
                </select>
            </div>
            <button id="finalizeAttendanceSessionBtn" class="finalize-session-btn" type="button">
                <i class="fas fa-box-archive"></i>
                <span>إنهاء وأرشفة الجلسة</span>
            </button>
        </div>
        <div class="attendance-search-box" style="margin-bottom: 15px;">
            <input type="text" id="attendanceSearchInput" class="form-control attendance-search-input" placeholder="البحث باسم الطالب او كود الطالب..." aria-label="البحث باسم الطالب أو كود الطالب">
        </div>
        <div id="attendanceStudentList" class="attendance-student-container glass-panel">
            <div class="placeholder-content">
                <i class="fas fa-user-clock"></i>
                <p>يرجى تحديد مجموعة من إدارة المجموعات</p>
            </div>
        </div>
        <div id="conflictAlert" class="conflict-toast glass-panel">
            <i class="fas fa-exclamation-circle"></i>
            <span>هذا الموعد محجوز بالفعل!</span>
        </div>
    </main>
`;
