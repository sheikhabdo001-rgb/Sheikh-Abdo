window.StudentActions = {
    parent: null,

    init(parent) {
        this.parent = parent;
        this.setupActionListeners();
        window.StudentFormManager.init(this.parent);
    },
    // removed addSiblingRow() {} - moved to StudentSiblings
    // removed removeSiblingRow() {} - moved to StudentSiblings
    // removed updateSiblingField() {} - moved to StudentSiblings
    // removed renderSiblingsSection() {} - moved to StudentSiblings

    setupActionListeners() {
        const actionBox = document.getElementById('studentActionBox');
        const deleteSubmenu = document.getElementById('deleteSubmenu');
        
        if (!actionBox) return;

        actionBox.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-btn');
            const targetDeleteBtn = e.target.closest('.delete-btn');
            const attendanceBtn = e.target.closest('.attendance-btn');
            const paymentBtn = e.target.closest('.payment-btn');
            const printBtn = e.target.closest('#printStudentListBtn');

            if (printBtn) {
                this.parent.deleteMode && this.parent.exitDeleteMode();
                window.PrintEngine.openExportMethodModal('student-list');
                return;
            }

            if (addBtn) {
                this.parent.deleteMode && this.parent.exitDeleteMode();
                this.openAddStudentModal();
            }
            if (attendanceBtn) {
                this.parent.deleteMode && this.parent.exitDeleteMode();
                this.openAttendanceView();
            }
            if (paymentBtn) {
                this.parent.deleteMode && this.parent.exitDeleteMode();
                this.openPaymentsView();
            }

            // Toggle submenu
            if (targetDeleteBtn) {
                if (deleteSubmenu) deleteSubmenu.classList.toggle('active');
            } else if (!e.target.closest('.delete-submenu')) {
                if (deleteSubmenu) deleteSubmenu.classList.remove('active');
            }
        });
    },

    // removed updateMainCustomFeeBadge() {}
    // removed updateMainDualRegBadge() {}
    // removed openAddStudentModal() {}
    // removed saveStudent() {}
    // removed deleteStudent() {}

    openAddStudentModal(studentToEdit = null) {
        window.StudentFormManager.openAddStudentModal(studentToEdit);
    },

    deleteStudent(studentId) {
        this.parent.deleteManager.deleteStudent(studentId);
    },

    openAttendanceView() {
        if (!this.parent.currentStage || !this.parent.currentGrade) {
            alert('يرجى اختيار المرحلة والصف أولاً');
            return;
        }

        window.Navigation.switchView('attendance');
        
        // Initialize attendance module
        if (window.Attendance) {
            window.Attendance.init(this.parent.currentStage, this.parent.currentGrade);
        }
    },

    openPaymentsView() {
        if (!this.parent.currentStage || !this.parent.currentGrade) {
            alert('يرجى اختيار المرحلة والصف أولاً');
            return;
        }

        window.Navigation.switchView('payments');
        
        // Initialize payments module
        if (window.StudentPayments) {
            window.StudentPayments.init(this.parent);
        }
    },

    openLinkStudentModal(student) {
        window.StudentLinking?.open(student);
    }
};
