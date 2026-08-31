// Navigation module
window.Navigation = {
    history: ['home'],
    callbacks: {},
    template: `
        <nav class="bottom-nav">
            <div class="nav-container">
                <button class="nav-btn active" data-page="home">
                    <i class="fas fa-home"></i>
                    <span>الرئيسية</span>
                </button>
                <button class="nav-btn" data-page="students">
                    <i class="fas fa-users"></i>
                    <span>قائمة الطلاب</span>
                </button>
                <button class="nav-btn" data-page="schedule">
                    <i class="fas fa-calendar-alt"></i>
                    <span>جدول المواعيد</span>
                </button>
                <button class="nav-btn" data-page="exams">
                    <i class="fas fa-file-signature"></i>
                    <span>الامتحانات</span>
                </button>
                <button class="nav-btn student-codes-nav" data-page="studentCodes" title="أكواد الطلاب">
                    <i class="fas fa-id-card-clip"></i>
                    <span>أكواد الطلاب</span>
                </button>
            </div>
        </nav>
    `,

    // Initialize navigation
    init(callbacks = {}) {
        const container = document.getElementById('navContainer');
        container.innerHTML = this.template;

        this.callbacks = callbacks;
        // Add ripple effect on navigation buttons
        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.nav-btn');
            if (navBtn) {
                this.handleNavClick(navBtn);
            }
        });

        // Initialize Global Back Button
        const globalBackBtn = document.getElementById('globalBackBtn');
        if (globalBackBtn) {
            globalBackBtn.onclick = () => this.goBack();
        }
        
        this.updateBackBtnVisibility();
    },

    // Handle navigation button click
    handleNavClick(navBtn) {
        const page = navBtn.getAttribute('data-page');
        
        // Switch View
        this.switchView(page);
    },

    switchView(page, saveToHistory = true) {
        const views = {
            'home': 'homeView',
            'students': 'studentsView',
            'schedule': 'scheduleView',
            'attendance': 'attendanceView',
            'records': 'recordsView',
            'profile': 'studentProfileView',
            'payments': 'paymentsView',
            'monthDisplay': 'monthDisplayView',
            'nonPayers': 'nonPayersView',
            'groupAttendanceArchive': 'groupAttendanceArchiveView',
            'repeatedAbsence': 'repeatedAbsenceView',
            'financialReports': 'financialReportsView',
            'exams': 'examsView',
            'examGrades': 'examGradesView',
            'studentCodes': 'studentCodesView',
            'backup': 'backupView',
            'transfer': 'transferView'
        };
        const targetViewId = views[page];
        if (!targetViewId) return;

        // Manage History
        if (saveToHistory) {
            if (this.history[this.history.length - 1] !== page) {
                this.history.push(page);
            }
        }

        // Hide all views
        document.querySelectorAll('.view-section').forEach(view => {
            view.style.display = 'none';
        });

        // Show target view
        const targetEl = document.getElementById(targetViewId);
        if (targetEl) {
            targetEl.style.display = 'block';
        } else {
            console.warn(`View container "${targetViewId}" not found for page: ${page}`);
        }

        // Update Bottom Nav UI
        this.syncBottomNav(page);
        
        // Update Back Button Visibility
        this.updateBackBtnVisibility();
        
        // Initialize/Refresh views with global context
        if (page === 'students' && window.Students.isInitialized) {
            window.Students.loadStudentsData();
        }

        if (page === 'attendance' && window.Attendance) {
            window.Attendance.renderStudentList();
        }

        if (page === 'payments' && window.StudentPayments && window.StudentPayments.parent) {
            window.StudentPayments.renderPaymentsTable();
        }

        if (page === 'groupAttendanceArchive' && window.GroupAttendanceArchive) {
            window.GroupAttendanceArchive.init();
        }

        if (page === 'repeatedAbsence' && window.RepeatedAbsence) {
            window.RepeatedAbsence.init();
        }

        if (page === 'schedule' && window.ScheduleUI) {
            window.ScheduleUI.init();
        }
        
        if (page === 'exams' && window.ExamsUI) {
            window.ExamsUI.init();
        }

        if (page === 'examGrades' && window.ExamsUI) {
            window.ExamsUI.renderGradesTable();
        }

        if (page === 'studentCodes' && window.StudentCodes) {
            window.StudentCodes.render();
        }

        // Auto-nudge logic: If navigating to a data-locked page and system is locked, 
        // highlight the header controller or open it.
        const dataPages = ['students', 'attendance', 'payments', 'exams', 'examGrades', 'repeatedAbsence'];
        if (dataPages.includes(page) && window.GlobalStageFilter.isLocked()) {
             // Subtle nudge: pulse the header button
             const btn = document.getElementById('globalContextBtn');
             if (btn) {
                 btn.classList.add('unselected-nudge');
                 // Optional: auto-open selector if user hasn't seen it yet
                 // window.GlobalContextController.openStageSelection();
             }
        }
            
        // Ensure state preservation on view switch
        if (!window.GlobalStageFilter.isLocked()) {
            this.syncCurrentViewWithState(page);
        }

        // Trigger callback if exists
        if (this.callbacks.onViewChange) {
            this.callbacks.onViewChange(page);
        }
    },

    syncCurrentViewWithState(page) {
        const stage = window.GlobalStageFilter.getActiveStage();
        const grade = window.GlobalStageFilter.getActiveGrade();
        
        if (page === 'exams' && window.ExamsUI) {
            // If user lands on exams menu but selection exists, sync local vars
            window.ExamsUI.currentStage = stage;
            window.ExamsUI.currentGrade = grade;
        }
    },

    goBack() {
        if (this.history.length > 1) {
            const currentPage = this.history[this.history.length - 1];
            
            this.history.pop(); // Remove current view
            let prevPage = this.history[this.history.length - 1];

            // Smart History Skipping: 
            // If returning from a detail view (like exam results) to its parent module's selection screen, 
            // and we already have a valid global selection context, skip the selection screen to return 
            // directly to the actual preceding application context (e.g., Home or Students).
            if (currentPage === 'examGrades' && prevPage === 'exams' && !window.GlobalStageFilter.isLocked()) {
                if (this.history.length > 1) {
                    this.history.pop();
                    prevPage = this.history[this.history.length - 1];
                }
            }

            // Also handle attendance/payments returning to students list if applicable
            const isSubView = ['attendance', 'payments', 'records', 'profile', 'nonPayers', 'monthDisplay', 'groupAttendanceArchive', 'repeatedAbsence'].includes(currentPage);
            if (isSubView && prevPage === 'students' && !window.GlobalStageFilter.isLocked()) {
                // This is already the correct immediate parent, so we just proceed
            }

            this.switchView(prevPage, false);
        }
    },

    updateBackBtnVisibility() {
        const globalBackBtn = document.getElementById('globalBackBtn');
        if (globalBackBtn) {
            // Show back button if we are not on the 'home' view
            const currentPage = this.history[this.history.length - 1];
            globalBackBtn.style.display = (currentPage === 'home') ? 'none' : 'flex';
        }
    },

    syncBottomNav(page) {
        // Find if this page corresponds to a bottom nav item
        const navItems = ['home', 'students', 'schedule', 'exams', 'studentCodes'];
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const btnPage = btn.getAttribute('data-page');
            if (btnPage === page) {
                btn.classList.add('active');
            } else if (navItems.includes(page)) {
                // If we are on a top-level page, ensure only its button is active
                btn.classList.remove('active');
            }
            // If we are on a sub-view (like payments), the bottom nav usually stays on the parent (students)
            // But for simplicity, we allow the active state to remain if it's a descendant of a main category
            if (page === 'payments' || page === 'attendance' || page === 'nonPayers' || page === 'monthDisplay' || page === 'records' || page === 'profile' || page === 'groupAttendanceArchive' || page === 'repeatedAbsence') {
                if (btnPage === 'students') btn.classList.add('active');
                else btn.classList.remove('active');
            }
            if (page === 'examGrades') {
                if (btnPage === 'exams') btn.classList.add('active');
                else btn.classList.remove('active');
            }

            if (page === 'backup' || page === 'transfer') {
                btn.classList.remove('active');
            }
        });
    }
};
