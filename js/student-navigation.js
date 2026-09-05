// Global navigation for student names rendered across the application.
window.StudentNavigation = {
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener('click', (event) => {
            const nameElement = event.target.closest('.student-name-link');
            if (!nameElement) return;

            const studentId = Number(nameElement.dataset.studentId);
            if (!Number.isInteger(studentId)) return;

            event.preventDefault();
            event.stopPropagation();

            const stage = nameElement.dataset.stage || null;
            const gradeValue = nameElement.dataset.grade;
            const grade = gradeValue ? parseInt(gradeValue, 10) : null;
            const fromView = nameElement.dataset.fromView || this.getCurrentView();

            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                window.ModalManager?.close(modal.id);
            });

            if (window.AttendanceRecords?.openStudentProfile) {
                window.AttendanceRecords.openStudentProfile(studentId, fromView, stage, grade);
            }
        });
    },

    getCurrentView() {
        const history = window.Navigation?.history || [];
        return history[history.length - 1] || 'students';
    }
};

window.StudentNavigation.init();
