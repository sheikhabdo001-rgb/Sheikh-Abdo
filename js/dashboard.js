// Dashboard module
window.Dashboard = {
    // Dynamic access to stage data
    get stageData() {
        const config = window.STUDENT_CONFIG.stageData;
        const data = {};
        Object.keys(config).forEach(id => {
            data[id] = { 
                name: config[id].name, 
                icon: config[id].icon, 
                class: config[id].miniClass || (id === 'primary' ? 'primary-mini' : id === 'preparatory' ? 'prep-mini' : 'secondary-mini') 
            };
        });
        return data;
    },

    get stageConfig() {
        const config = window.STUDENT_CONFIG.stageData;
        const data = {};
        Object.keys(config).forEach(id => {
            data[id] = { 
                icon: config[id].icon, 
                title: config[id].name, 
                subtitle: `المرحلة ${config[id].name}`, 
                class: config[id].class || (id === 'primary' ? 'primary-btn' : id === 'preparatory' ? 'prep-btn' : 'secondary-btn') 
            };
        });
        return data;
    },

    // Load dashboard data
    load(teacherName, selectedStages) {
        // Display teacher name
        const teacherNameEl = document.getElementById('dashboardTeacherName');
        const displayTeacherNameEl = document.getElementById('displayTeacherName');
        if (teacherNameEl) teacherNameEl.textContent = teacherName;
        if (displayTeacherNameEl) displayTeacherNameEl.textContent = teacherName;

        // Apply global stage filter
        const filteredStages = window.GlobalStageFilter.filterStages(selectedStages);

        // Delegate UI rendering
        window.DashboardUI.renderStagesMiniCards(filteredStages);
        window.DashboardUI.renderStageButtons(selectedStages); // Show all buttons for selection
        window.DashboardUI.initClock();

        // Delegate Session detection
        window.DashboardSessions.checkActiveSessions();

        // Delegate Search Hub
        window.DashboardHub.initSearchHub();

        // Setup Instant Registration
        const instantBtn = document.getElementById('instantRecordingBtn');
        if (instantBtn) {
            instantBtn.onclick = () => window.InstantRegistration.handleClick();
            window.InstantRegistration.updateButton();
            window.InstantRegistration.startPolling();
        }

        // Setup dashboard modal close
        const closeBtn = document.getElementById('closeViewGradeModal');
        const modal = document.getElementById('dashboardGradeModal');
        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) modal.classList.remove('active');
            };
        }
    },

    // removed renderStagesMiniCards() {}
    // removed renderStageButtons() {}
    // removed initClock() {}
    // removed checkActiveSessions() {}
    // removed findActiveSession() {}
    // removed handleInstantRecording() {}
    // removed initSearchHub() {}
    // removed renderHubResults() {}
    // removed getClassActiveSession() {}
    // removed hubQuickAttendance() {}
    // removed hubQuickPayment() {}
    // removed showStageGrades() {}
};