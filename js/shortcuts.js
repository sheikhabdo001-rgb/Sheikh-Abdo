/**
 * Global Keyboard Shortcuts
 */
window.addEventListener('keydown', (e) => {
    // 1. Detect if the user is typing in ANY input or textarea
    const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

    // 2. Shift + A Logic: Add Student Shortcut
    if (e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'ش')) {
        if (isTyping) return;

        const studentsView = document.getElementById('studentsView');
        if (studentsView && studentsView.style.display !== 'none') {
            if (window.Students && window.Students.currentStage && window.Students.currentGrade) {
                const addModal = document.getElementById('addStudentModal');
                if (addModal && !addModal.classList.contains('active')) {
                    e.preventDefault();
                    if (window.Students.actions) {
                        window.Students.actions.openAddStudentModal();
                    }
                }
            }
        }
    }
});