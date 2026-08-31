window.STUDENTS_VIEW = `
    <main id="studentsView" class="main-content view-section" style="display: none;">
        <div class="welcome-section">
            <h1 class="hero-title-gradient">قائمة الطلاب</h1>
            <p class="hero-subtitle">إدارة بيانات الطلاب، الحضور والغياب، وتتبع التقدم الدراسي لكل صف ومرحلة تعليمية.</p>
        </div>

        <div id="selectionStatus" class="selection-status-bar" style="display: none;">
            <i class="fas fa-info-circle"></i>
            <span id="statusText"></span>
        </div>
        <div id="studentSearchContainer" class="search-container glass-panel" style="display: none;">
            <div class="search-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="studentSearchInput" placeholder="البحث عن الطالب من خلال اسم الطالب او كود الطالب" aria-label="البحث عن الطالب من خلال الاسم أو الكود">
                <button id="clearSearch" class="clear-search-btn" title="مسح البحث">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div id="studentActionBox" class="action-control-box glass-panel" style="display: none;">
            <div class="action-grid">
                <button class="action-btn add-btn">
                    <i class="fas fa-user-plus"></i>
                    <span>إضافة طالب</span>
                </button>
                <button class="action-btn attendance-btn">
                    <i class="fas fa-calendar-check"></i>
                    <span>تسجيل الحضور</span>
                </button>
                <button class="action-btn payment-btn">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>تسجيل مدفوعات الشهر</span>
                </button>
                <button id="printStudentListBtn" class="action-btn student-list-print-btn" type="button">
                    <i class="fas fa-print"></i>
                    <span>طباعة قائمة الطلاب</span>
                </button>
                <div class="delete-action-wrapper">
                    <button class="action-btn delete-btn">
                        <i class="fas fa-trash-alt"></i>
                        <span>حذف</span>
                    </button>
                    <div id="deleteSubmenu" class="delete-submenu glass-panel">
                        <button class="submenu-item" id="btnDeleteSelection">
                            <i class="fas fa-tasks"></i>
                            <span>حذف بالتحديد</span>
                        </button>
                        <button class="submenu-item" id="btnDeleteAll">
                            <i class="fas fa-trash-sweep"></i>
                            <span>حذف جميع الطلاب</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div id="studentStatsWidget" class="student-stats-widget glass-panel" style="display: none;">
            <div class="student-stat-item">
                <i class="fas fa-user-check"></i>
                <span>عدد الطلاب المسجلين</span>
                <strong id="activeStudentsCount">0</strong>
            </div>
            <div class="student-stat-item empty-slots-stat">
                <i class="fas fa-border-all"></i>
                <span>عدد المربعات الخالية</span>
                <strong id="emptySlotsCount">0</strong>
                <button id="showEmptySlotsBtn" class="show-empty-slots-btn" type="button">عرض</button>
            </div>
        </div>
        <div id="floatingDeleteConfirm" class="floating-confirm-bar selection-floating-box" style="display: none;">
            <span id="selectedCountText">عدد الطلاب المحددين: 0</span>
            <div class="confirm-btns">
                <button id="cancelSelectionBtn" class="confirm-btn secondary">إلغاء</button>
                <button id="confirmDeleteSelectionBtn" class="confirm-btn danger">حذف</button>
            </div>
        </div>
        <div class="students-data-container glass-panel">
            <div class="placeholder-content">
                <i class="fas fa-users-slash"></i>
                <p>يرجى اختيار المرحلة والصف لعرض البيانات</p>
            </div>
        </div>
    </main>
`;
