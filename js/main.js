// UI Initialization
const AppUI = {
    init() {
        // Inject Core Templates
        document.getElementById('loginSection').innerHTML = window.LOGIN_TEMPLATE;
        document.getElementById('mainHeader').innerHTML = window.HEADER_TEMPLATE;
        
        const viewsContainer = document.getElementById('viewsContainer');
        viewsContainer.innerHTML = Object.values(window.VIEW_TEMPLATES).join('');

        // Initialize Modal System
        window.ModalManager.init();
    }
};

AppUI.init();

// removed loginForm, errorMessage, togglePassword, passwordInput DOM selections
// removed GRADE_CONFIG, tempSelectedGrades, currentSelectingStage state
// removed password toggle logic
// removed loginForm submit listener
// removed showDashboard, showLogin, loadDashboardData functions
// removed global click listener for teacher/logout actions
// removed checkLoginState function
// removed GlobalContextController implementation (moved to js/context-controller.js)
// removed openGradeSelection, saveGradesBtn logic (moved to js/grade-selection.js)
// removed stageSettingsModal logic (moved to js/grade-selection.js)
// removed keyboard shortcuts listener (moved to js/shortcuts.js)

// Initialize localStorage persistence layer (loads saved data or defaults)
window.PersistenceManager.init();

// Initialize theme on page load
window.Settings.initTheme();

// Initialize application modules and state
window.AuthUI.init();
window.GradeSelection.init();
window.GlobalContextController.init();
window.FinancialManager.init();
window.Settings.init();

window.Navigation.init({
    onViewChange: (page) => {
        if (page !== 'studentCodes' && window.StudentCodes) {
            window.StudentCodes.exitSelectionMode({ render: false });
        }
        if (page === 'students') {
            window.Students.init();
        }
    }
});

// Keep the 30-day expelled-student cleanup running even when the user has
// not opened the repeated-absence screen yet.
window.RepeatedAbsence?.startPurgeScheduler?.();

// Check if user is already logged in
window.AuthUI.checkLoginState();

// Initialize the profile print/export wizard (requires modal DOM)
if (window.ProfilePrint) {
    window.ProfilePrint.init();
}

// Restore the last selected grade after all application modules and templates
// are ready. GlobalStageFilter also restores it early for non-UI consumers;
// this pass updates the visible view and header on a normal page load.
window.initAppGradeState = () => {
    window.GlobalStageFilter.restoreSavedGradeState();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initAppGradeState, { once: true });
} else {
    window.initAppGradeState();
}
