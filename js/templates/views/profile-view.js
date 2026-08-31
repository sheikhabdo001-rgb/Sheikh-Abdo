window.PROFILE_VIEW = `
    <main id="studentProfileView" class="main-content view-section" style="display: none;">
        <div class="attendance-header profile-actions-bar">
            <h1 style="text-align: right; width: 100%;"><i class="fas fa-id-card"></i> الملف التفصيلي للطالب</h1>
            <button type="button" class="profile-print-report-btn" onclick="window.ProfilePrint.open()">
                <i class="fas fa-print"></i> طباعة التقرير
            </button>
        </div>
        
        <!-- Section 1: Basic Info Header Card -->
        <div id="studentProfileHeader" class="profile-header-card glass-panel">
            <!-- Injected via ProfileUI.renderProfileHeader -->
        </div>

        <!-- Tab Controls for Profile Sections -->
        <div class="profile-tabs-wrapper">
            <div class="record-filter-toggle" style="margin: 2rem auto; max-width: 720px;">
                <button type="button" class="profile-tab-btn active" data-tab="attendance">
                    <i class="fas fa-calendar-check"></i> سجل الحضور والغياب
                </button>
                <button type="button" class="profile-tab-btn" data-tab="finance">
                    <i class="fas fa-file-invoice-dollar"></i> السجل المالي والمدفوعات
                </button>
                <button type="button" class="profile-tab-btn" data-tab="exams">
                    <i class="fas fa-graduation-cap"></i> درجات سجل الامتحانات
                </button>
            </div>
        </div>

        <!-- Section 2: Attendance Table -->
        <div id="profileAttendanceSection" class="profile-tab-content active">
            <div class="profile-controls glass-panel" style="margin-bottom: 1.5rem; padding: 1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <div class="search-wrapper glass-panel mini-search" style="flex:1; min-width:250px; margin:0;">
                        <i class="fas fa-search"></i>
                        <input type="text" id="viewProfileSearchInput" placeholder="بحث بالتاريخ أو اليوم...">
                    </div>
                    <div class="profile-filters" style="margin:0;">
                        <button type="button" class="profile-filter-btn active" data-attend-filter="all">الكل</button>
                        <button type="button" class="profile-filter-btn success" data-attend-filter="present">حضور</button>
                        <button type="button" class="profile-filter-btn danger" data-attend-filter="absent">غياب</button>
                    </div>
                </div>
            </div>
            <div id="viewStudentProfileHistory" class="profile-history-table-container glass-panel">
                <!-- Injected via ProfileUI.renderStudentProfileHistory -->
            </div>
        </div>

        <!-- Section 3: Financial Ledger -->
        <div id="profileFinanceSection" class="profile-tab-content">
            <div class="profile-controls glass-panel" style="margin-bottom: 1.5rem; padding: 1.5rem;">
                <div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <div class="profile-filters" style="margin:0;">
                        <button type="button" class="profile-filter-btn active" data-fin-filter="all">الكل</button>
                        <button type="button" class="profile-filter-btn success" data-fin-filter="paid">المدفوع</button>
                        <button type="button" class="profile-filter-btn danger" data-fin-filter="due">المستحقات</button>
                    </div>
                </div>
            </div>
            <div id="viewStudentFinanceHistory" class="profile-history-table-container glass-panel">
                <!-- Injected via ProfileUI.renderFinancialLedger -->
            </div>
        </div>

        <!-- Section 4: Exam Grades Ledger -->
        <div id="profileExamsSection" class="profile-tab-content">
            <div class="profile-controls glass-panel" style="margin-bottom: 1.5rem; padding: 1.5rem;">
                <div class="profile-exam-controls">
                    <div>
                        <span class="profile-control-eyebrow"><i class="fas fa-filter"></i> تصفية حالة الامتحان</span>
                        <strong class="profile-control-title">سجل درجات الطالب</strong>
                    </div>
                    <div class="profile-filters" style="margin:0;">
                        <button type="button" class="profile-filter-btn active" data-exam-filter="all">الكل</button>
                        <button type="button" class="profile-filter-btn success" data-exam-filter="present">حاضر</button>
                        <button type="button" class="profile-filter-btn danger" data-exam-filter="absent">غائب</button>
                    </div>
                </div>
            </div>
            <div id="viewStudentExamGrades" class="profile-history-table-container glass-panel">
                <!-- Injected via ProfileUI.renderExamGradesLedger -->
            </div>
        </div>
    </main>
`;
