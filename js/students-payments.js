// removed MultiStagePaymentUI controller - moved to multi-stage-payment-ui.js
// removed FamilyPaymentUI controller - moved to family-payment-ui.js

window.StudentPayments = {
    parent: null,
    firstTermMonths: [],
    secondTermMonths: [],
    firstTermStartMonth: null,
    secondTermStartMonth: null,
    searchQuery: '',

    init(parent) {
        this.parent = parent;
        this.loadMonthSelections();
        this.loadStartMonths();
        this.setupPaymentsListeners();
        window.PaymentsMonths.init(this);
        window.PaymentsModals.init(this);
        this.renderPaymentsTable();
        window.PaymentsUI.updateDateDisplays();
        window.PaymentsUI.updateStartMonthDisplays(this.firstTermStartMonth, this.secondTermStartMonth);
    },

    setupPaymentsListeners() {
        const nonPayersBtn = document.getElementById('openNonPayersListBtn');

        if (nonPayersBtn && !nonPayersBtn.dataset.listenerAttached) {
            nonPayersBtn.dataset.listenerAttached = 'true';
            nonPayersBtn.onclick = () => window.PaymentsModals.openNonPayersView();
        }

        const searchInput = document.getElementById('paymentsSearchInput');
        const clearBtn = document.getElementById('clearPaymentsSearch');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.searchQuery = e.target.value.trim();
                this.renderPaymentsTable();
            };
        }
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (searchInput) searchInput.value = '';
                this.searchQuery = '';
                this.renderPaymentsTable();
            };
        }
    },

    loadMonthSelections() {
        const data = window.PaymentsStore.getSelections(this.parent.currentStage, this.parent.currentGrade);
        this.firstTermMonths = data.firstTerm;
        this.secondTermMonths = data.secondTerm;
    },

    saveMonthSelections() {
        window.PaymentsStore.saveSelections(this.parent.currentStage, this.parent.currentGrade, this.firstTermMonths, this.secondTermMonths);
    },

    saveStartMonths() {
        window.PaymentsStore.saveStartMonths(this.parent.currentStage, this.parent.currentGrade, this.firstTermStartMonth, this.secondTermStartMonth);
    },

    loadStartMonths() {
        const data = window.PaymentsStore.getStartMonths(this.parent.currentStage, this.parent.currentGrade);
        this.firstTermStartMonth = data.firstTermStart;
        this.secondTermStartMonth = data.secondTermStart;
    },

    // removed openMonthDisplayView() - moved to PaymentsMonths
    // removed openMonthSelection() - moved to PaymentsMonths
    // removed saveMonthSelection() - moved to PaymentsMonths
    // removed openStartMonthSelection() - moved to PaymentsMonths
    // removed saveStartMonthSelection() - moved to PaymentsMonths

    renderPaymentsTable() {
        const container = document.getElementById('paymentsTableContainer');
        const previousScroll = container ? container.scrollTop : 0;

        // Check global lock
        if (window.GlobalStageFilter.isLocked()) {
            container.innerHTML = window.GlobalStageFilter.getLockedPlaceholderHTML();
            return;
        }

        // Sync with global state
        this.parent.currentStage = window.GlobalStageFilter.getActiveStage();
        this.parent.currentGrade = window.GlobalStageFilter.getActiveGrade();
        this.loadMonthSelections();
        this.loadStartMonths();

        let students = window.StudentStore.getStudents(this.parent.currentStage, this.parent.currentGrade)
            .filter(s => s.name).map((s, idx) => ({
                ...s,
                serial: window.StudentStore.getSerial(s, idx + 1),
                stage: this.parent.currentStage,
                grade: this.parent.currentGrade
            }));

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            students = students.filter(s => 
                s.name.toLowerCase().includes(query) ||
                String(s.studentCode || s.student_code || s.code || '').toLowerCase().includes(query)
            );
        }

        const { currentMonth, currentMonthInfo, isVacation } = window.PaymentsStore.getCurrentMonthInfo(this.firstTermMonths, this.secondTermMonths);
        
        const studentsWithInfo = students.map(s => ({
            ...s,
            ...window.PaymentsStore.getStudentPaymentInfo(
                this.parent.currentStage, this.parent.currentGrade, s.id, currentMonth, currentMonthInfo, isVacation, 
                this.firstTermMonths, this.secondTermMonths, this.firstTermStartMonth, this.secondTermStartMonth
            )
        }));

        window.PaymentsUI.renderTable(container, studentsWithInfo, {
            isVacation,
            onRegister: (id, month) => {
                // Check for family members
                const student = studentsWithInfo.find(s => String(s.id) === String(id));
                if (!student || !window.PaymentsStore.validatePaymentPrice(
                    this.parent.currentStage,
                    this.parent.currentGrade,
                    month
                )) {
                    return;
                }

                if (student && student.family_group_id) {
                    const familyMembers = window.StudentStore.getFamilyMembers(student.family_group_id);
                    const otherMembers = familyMembers.filter(m => !(m.stage === this.parent.currentStage && m.grade === this.parent.currentGrade && m.id === id));
                    if (otherMembers.length > 0) {
                        window.FamilyPaymentUI.open(id, month, this.parent.currentStage, this.parent.currentGrade, this);
                        return;
                    }
                }
                // Open confirmation modal
                this.openPaymentConfirmModal(id, month);
            },
            onShowDebt: (id) => window.PaymentsModals.openDebtModal(id)
        });

        if (container) {
            container.scrollTop = previousScroll;
        }
    },

    openPaymentConfirmModal(studentId, month) {
        const students = window.StudentStore.getStudents(this.parent.currentStage, this.parent.currentGrade)
            .filter(s => s.name);
            const student = students.find(s => String(s.id) === String(studentId));
        if (!student) return;

        if (!window.PaymentsStore.validatePaymentPrice(this.parent.currentStage, this.parent.currentGrade, month)) {
            return;
        }

        const studentWithMeta = { ...student, stage: this.parent.currentStage, grade: this.parent.currentGrade };
        const fee = FinancialManager.getStudentFee(studentWithMeta, month);

        document.getElementById('paymentConfirmMonth').textContent = window.MONTHS[month];
        const confirmStudentEl = document.getElementById('paymentConfirmStudent');
        if (confirmStudentEl) {
            confirmStudentEl.textContent = '';
            const studentLink = document.createElement('a');
            studentLink.href = '#';
            studentLink.className = 'student-name-link';
            studentLink.dataset.studentId = String(student.id);
            studentLink.dataset.stage = this.parent.currentStage;
            studentLink.dataset.grade = String(this.parent.currentGrade);
            studentLink.dataset.fromView = 'payments';
            studentLink.textContent = student.name;
            confirmStudentEl.append(
                studentLink,
                document.createTextNode(` - ${window.STUDENT_CONFIG.stageData[this.parent.currentStage]?.name || ''} ${this.parent.currentGrade}`)
            );
        }
        const amountInput = document.getElementById('paymentConfirmAmount');
        if (amountInput) {
            amountInput.value = fee;
            amountInput.focus();
        }

        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const cancelBtn = document.getElementById('cancelPaymentConfirm');

        const cleanup = () => {
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            document.querySelectorAll('#paymentConfirmModal .close-modal-btn').forEach(b => b.onclick = null);
        };

        confirmBtn.onclick = () => {
            if (!window.PaymentsStore.validatePaymentPrice(this.parent.currentStage, this.parent.currentGrade, month)) {
                return;
            }

            const enteredAmount = parseFloat(amountInput?.value) || fee;
            const paymentRecorded = window.PaymentsStore.recordPayment(
                this.parent.currentStage,
                this.parent.currentGrade,
                studentId,
                month,
                'paid'
            );
            if (!paymentRecorded) return;

            cleanup();
            window.ModalManager.close('paymentConfirmModal');
            this.renderPaymentsTable();
            if (document.getElementById('nonPayersView').style.display !== 'none') {
                window.PaymentsModals.renderNonPayersListView();
            }
        };

        cancelBtn.onclick = () => {
            cleanup();
            window.ModalManager.close('paymentConfirmModal');
        };

        document.querySelectorAll('#paymentConfirmModal .close-modal-btn').forEach(b => {
            b.onclick = () => {
                cleanup();
                window.ModalManager.close('paymentConfirmModal');
            };
        });

        window.ModalManager.open('paymentConfirmModal');
    }

    // removed openReversePaymentModal() - moved to PaymentsModals
    // removed confirmReversePayment() - moved to PaymentsModals
    // removed openDebtModal() - moved to PaymentsModals
    // removed openNonPayersModal() - moved to PaymentsModals
    // removed renderNonPayersList() - moved to PaymentsModals
    // removed expelStudent() - moved to PaymentsModals
};
