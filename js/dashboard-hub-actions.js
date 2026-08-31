/**
 * Action handlers for the Search Hub (Quick Attendance, Quick Payment, Quick Edit)
 */
window.DashboardHubActions = {
    hubQuickAttendance(btn, studentId, stage, grade, groupName) {
        if (btn.classList.contains('disabled')) return;
        if (!groupName) return alert('عذراً، لا توجد جلسة نشطة حالياً لهذا الصف لتسجيل الحضور.');

        const sessionInfo = window.AttendanceStore.getSessionInfo(stage, grade, groupName);
        const isCompleted = window.AttendanceStore.getSessions(stage, grade)
            .some(session => session.id === sessionInfo.id && session.completed);
        if (isCompleted) return alert('انتهت هذه الجلسة وتمت أرشفتها.');

        btn.classList.add('disabled');
        window.AttendanceStore.saveAttendanceRecord(stage, grade, groupName, studentId, 'present', {
            sessionId: sessionInfo.id,
            timeSlot: sessionInfo.timeSlot
        });
        
        const groups = window.AttendanceStore.getGroups(stage, grade);
        const group = groups.find(g => g.name === groupName);
        const todayAr = new Date().toLocaleDateString('ar-EG', { weekday: 'long' });
        const currentSlot = group?.schedule.find(s => s.day === todayAr);
        if (currentSlot && currentSlot.linkId) {
            window.AttendanceStore.saveLinkedAttendance(stage, grade, studentId, currentSlot.linkId, 'present');
        }

        btn.style.background = 'var(--success-color)';
        btn.style.transform = 'scale(0.9)';
        btn.innerHTML = '<i class="fas fa-check-double"></i> <span>تم الحضور</span>';
        
        if (window.Attendance && window.Attendance.currentStage === stage && window.Attendance.currentGrade === grade) {
            window.Attendance.renderStudentList();
        }
    },

    async hubQuickPayment(btn, studentId, stage, grade, monthIdx) {
        if (btn.classList.contains('disabled')) return;
        if (monthIdx === null) return window.notify.error('لا يوجد شهور متاحة للسداد حالياً.');
        
        const students = window.StudentStore.getStudents(stage, grade);
        const student = students.find(s => s.id === studentId);
        if (!student || !window.PaymentsStore.validatePaymentPrice(stage, grade, monthIdx)) {
            return;
        }

        if (student.family_group_id) {
            const familyMembers = window.StudentStore.getFamilyMembers(student.family_group_id);
            const otherMembers = familyMembers.filter(m => !(m.stage === stage && m.grade === grade && m.id === studentId));
            
            if (otherMembers.length > 0) {
                window.FamilyPaymentUI.open(studentId, monthIdx, stage, grade, {
                    renderPaymentsTable: () => {
                        this.refreshHubSearch();
                        if (window.StudentPayments && window.StudentPayments.parent && 
                            window.StudentPayments.parent.currentStage === stage && 
                            window.StudentPayments.parent.currentGrade === grade) {
                            window.StudentPayments.renderPaymentsTable();
                        }
                    }
                });
                return;
            }
        }

        const monthName = window.MONTHS[monthIdx];
        const confirmed = await window.confirm(`هل أنت متأكد من تسجيل سداد شهر ${monthName} للطالب؟`);
        if (!confirmed) return;

        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';

        const paymentRecorded = window.PaymentsStore.recordPayment(stage, grade, studentId, monthIdx, 'paid');
        if (!paymentRecorded) {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = '';
            return;
        }

        btn.style.background = 'var(--success-color)';
        btn.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.6)';
        btn.innerHTML = `<i class="fas fa-check-circle"></i> <span>تم سداد ${monthName}</span>`;
        btn.classList.add('payment-success-pulse');

        setTimeout(() => {
            if (window.StudentPayments && window.StudentPayments.parent && 
                window.StudentPayments.parent.currentStage === stage && 
                window.StudentPayments.parent.currentGrade === grade) {
                window.StudentPayments.renderPaymentsTable();
            }
            this.refreshHubSearch();
        }, 1200);
    },

    hubOpenEdit(studentId, stage, grade) {
        const students = window.StudentStore.getStudents(stage, grade);
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        if (window.Students) {
            window.Students.currentStage = stage;
            window.Students.currentGrade = grade;
            window.StudentFormManager.openAddStudentModal(student);
        }
    },

    refreshHubSearch() {
        const input = document.getElementById('hubSearchInput');
        if (input) input.dispatchEvent(new Event('input'));
    }
};
