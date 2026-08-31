window.PaymentsModals = {
    parent: null,
    reverseStudentId: null,
    reverseMonthIdx: null,
    nonPayersFilterMonth: 'current',
    nonPayersFilterType: 'all',

    init(parent) {
        this.parent = parent;
        this.setupListeners();
    },

    setupListeners() {
        const closeDebtModal = document.getElementById('closeDebtList');
        if (closeDebtModal) closeDebtModal.onclick = () => window.ModalManager.close('debtListModal');

        const closeReverseModal = document.getElementById('closeReversePaymentModal');
        if (closeReverseModal && !closeReverseModal.dataset.listenerAttached) {
            closeReverseModal.dataset.listenerAttached = 'true';
            closeReverseModal.onclick = () => window.ModalManager.close('reversePaymentModal');
        }

        const cancelReverseBtn = document.getElementById('cancelReversePaymentBtn');
        if (cancelReverseBtn && !cancelReverseBtn.dataset.listenerAttached) {
            cancelReverseBtn.dataset.listenerAttached = 'true';
            cancelReverseBtn.onclick = () => window.ModalManager.close('reversePaymentModal');
        }

        const confirmReverseBtn = document.getElementById('confirmReversePaymentBtn');
        if (confirmReverseBtn && !confirmReverseBtn.dataset.listenerAttached) {
            confirmReverseBtn.dataset.listenerAttached = 'true';
            confirmReverseBtn.onclick = () => this.confirmReversePayment();
        }

        const paymentsContainer = document.getElementById('paymentsTableContainer');
        if (paymentsContainer && !paymentsContainer.dataset.reverseListenerAttached) {
            paymentsContainer.dataset.reverseListenerAttached = 'true';
            paymentsContainer.addEventListener('click', (e) => {
                const dot = e.target.closest('.paid-indicator-dot');
                if (!dot) return;
                const studentId = parseInt(dot.dataset.id);
                const monthIdx = parseInt(dot.dataset.month);
                if (Number.isNaN(studentId) || Number.isNaN(monthIdx)) return;
                this.openReversePaymentModal(studentId, monthIdx);
            });
        }




        const monthFilterView = document.getElementById('nonPayersMonthFilterView');
        if (monthFilterView && !monthFilterView.dataset.listenerAttached) {
            monthFilterView.dataset.listenerAttached = 'true';
            monthFilterView.onchange = (e) => {
                this.nonPayersFilterMonth = e.target.value;
                this.renderNonPayersListView();
            };
        }

        const typeFilter = document.getElementById('debtTypeFilter');
        if (typeFilter && !typeFilter.dataset.listenerAttached) {
            typeFilter.dataset.listenerAttached = 'true';
            typeFilter.onchange = (e) => {
                this.nonPayersFilterType = e.target.value;
                this.renderNonPayersListView();
            };
        }
    },

    openReversePaymentModal(studentId, monthIdx) {
        this.reverseStudentId = studentId;
        this.reverseMonthIdx = monthIdx;
        const monthNameEl = document.getElementById('reversePaymentMonthName');
        if (monthNameEl) monthNameEl.textContent = window.MONTHS[monthIdx];
        window.ModalManager.open('reversePaymentModal');
    },

    confirmReversePayment() {
        if (this.reverseStudentId == null || this.reverseMonthIdx == null) return;
        window.PaymentsStore.reversePayment(
            this.parent.parent.currentStage,
            this.parent.parent.currentGrade,
            this.reverseStudentId,
            this.reverseMonthIdx
        );
        this.reverseStudentId = null;
        this.reverseMonthIdx = null;
        window.ModalManager.close('reversePaymentModal');
        this.parent.renderPaymentsTable();
    },

    openDebtModal(studentId) {
        const students = window.StudentStore.getStudents(this.parent.parent.currentStage, this.parent.parent.currentGrade);
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const debtList = window.PaymentsStore.getStudentDebtList(
            this.parent.parent.currentStage, this.parent.parent.currentGrade, studentId,
            this.parent.firstTermMonths, this.parent.secondTermMonths, this.parent.firstTermStartMonth, this.parent.secondTermStartMonth
        );

        document.getElementById('debtModalStudentName').textContent = student.name;
        document.getElementById('debtModalCount').textContent = debtList.length;
        
        const container = document.getElementById('debtListContainer');
        window.PaymentsUI.renderDebtList(container, debtList, (monthIdx) => {
            const paymentRecorded = window.PaymentsStore.recordPayment(
                this.parent.parent.currentStage,
                this.parent.parent.currentGrade,
                studentId,
                monthIdx,
                'paid'
            );
            if (!paymentRecorded) return;
            
            // Re-render modal content to update debt count and list
            this.openDebtModal(studentId);
            
            // Sync main table
            this.parent.renderPaymentsTable();
            
            // Trigger auto-removal/update if non-payers list is visible
            if (document.getElementById('nonPayersView').style.display !== 'none') {
                this.renderNonPayersListView();
            }
        });

        window.ModalManager.open('debtListModal');
    },

    openNonPayersView() {
        this.nonPayersFilterMonth = 'all';
        this.nonPayersFilterType = 'all';
        const typeFilter = document.getElementById('debtTypeFilter');
        if (typeFilter) typeFilter.value = 'all';

        this.renderNonPayersListView();
        window.Navigation.switchView('nonPayers');
    },

    getStudentDebtDetails(student, realNow) {
        const stage = this.parent.parent.currentStage;
        const grade = this.parent.parent.currentGrade;
        const termMonths = [
            ...this.parent.firstTermMonths,
            ...this.parent.secondTermMonths
        ].sort((a, b) => a - b);
        const startMap = {};
        this.parent.firstTermMonths.forEach(month => {
            startMap[month] = this.parent.firstTermStartMonth;
        });
        this.parent.secondTermMonths.forEach(month => {
            startMap[month] = this.parent.secondTermStartMonth;
        });

        const payments = JSON.parse(
            localStorage.getItem(`student_payments_${stage}_${grade}_${student.id}`) || '{}'
        );
        const unpaidMonths = termMonths
            .filter(month => {
                const startMonth = startMap[month];
                return startMonth !== null &&
                    startMonth !== undefined &&
                    month >= startMonth &&
                    month <= realNow &&
                    payments[month] !== 'paid' &&
                    payments[month] !== 'absent';
            })
            .map(month => ({
                month,
                feeAmount: Number(window.FinancialManager.getStudentFee(
                    student,
                    month,
                    stage,
                    grade
                )) || 0
            }));

        // The first applicable future month is the required advance fee.
        const advanceMonth = termMonths.find(month => {
            const startMonth = startMap[month];
            return month > realNow &&
                startMonth !== null &&
                startMonth !== undefined;
        }) ?? null;
        const hasUnpaidAdvance = advanceMonth !== null &&
            payments[advanceMonth] !== 'paid' &&
            payments[advanceMonth] !== 'absent';

        return {
            unpaidMonths,
            missedMonths: unpaidMonths.map(item => item.month),
            hasUnpaidOverdue: unpaidMonths.length > 0,
            requiresAdvance: advanceMonth !== null,
            isAdvancePaid: !hasUnpaidAdvance,
            hasUnpaidAdvance,
            advanceMonth,
            advanceAmount: hasUnpaidAdvance
                ? Number(window.FinancialManager.getStudentFee(
                    student,
                    advanceMonth,
                    stage,
                    grade
                )) || 0
                : 0
        };
    },

    updateNonPayersMonthDropdown(students, debtDetailsById = new Map()) {
        const monthFilterView = document.getElementById('nonPayersMonthFilterView');
        if (!monthFilterView) return;

        const currentValue = this.nonPayersFilterMonth;
        const realNow = new Date().getMonth();
        const monthsWithDebt = new Set();
        const monthsWithAdvance = new Set();

        students.forEach(s => {
            const details = debtDetailsById.get(String(s.id)) || this.getStudentDebtDetails(s, realNow);
            details.unpaidMonths.forEach(item => monthsWithDebt.add(item.month));
            if (details.hasUnpaidAdvance) {
                monthsWithDebt.add(details.advanceMonth);
                monthsWithAdvance.add(details.advanceMonth);
            }
        });

        monthFilterView.innerHTML = '<option value="all">كل الممتنعين (افتراضي)</option>';

        const sortedMonths = Array.from(monthsWithDebt).sort((a, b) => a - b);
        sortedMonths.forEach(month => {
            const advanceLabel = monthsWithAdvance.has(month) ? ' (مقدم)' : '';
            monthFilterView.innerHTML += `<option value="${month}">${window.MONTHS[month]}${advanceLabel}</option>`;
        });

        if (sortedMonths.includes(parseInt(currentValue))) {
            monthFilterView.value = currentValue;
        } else {
            monthFilterView.value = 'all';
            this.nonPayersFilterMonth = 'all';
        }
    },

    matchesDebtType(details, selectedDebtType) {
        if (selectedDebtType === 'advance_only') {
            return details.hasUnpaidAdvance;
        }
        if (selectedDebtType === 'overdue_only') {
            return details.hasUnpaidOverdue;
        }
        return details.hasUnpaidAdvance || details.hasUnpaidOverdue;
    },

    matchesReferenceMonth(details, selectedMonthFilter, selectedDebtType = 'all') {
        if (selectedMonthFilter === 'all') return true;
        const monthIdx = parseInt(selectedMonthFilter, 10);
        if (!Number.isInteger(monthIdx)) return false;

        const isUnpaidOverdueMonth = details.unpaidMonths
            .some(item => item.month === monthIdx);
        const isUnpaidAdvanceMonth = details.hasUnpaidAdvance &&
            details.advanceMonth === monthIdx;

        if (selectedDebtType === 'advance_only') return isUnpaidAdvanceMonth;
        if (selectedDebtType === 'overdue_only') return isUnpaidOverdueMonth;
        return isUnpaidOverdueMonth || isUnpaidAdvanceMonth;
    },

    renderNonPayersListView() {
        const container = document.getElementById('nonPayersTableContainerView');
        const students = window.StudentStore.getStudents(this.parent.parent.currentStage, this.parent.parent.currentGrade)
            .filter(s => s.name)
            .map((s, idx) => ({ ...s, serial: window.StudentStore.getSerial(s, idx + 1) }));
        const realNow = new Date().getMonth();
        const debtDetailsById = new Map(
            students.map(student => [
                String(student.id),
                this.getStudentDebtDetails(student, realNow)
            ])
        );

        // 1. Update dropdown dynamically based on actual debts
        this.updateNonPayersMonthDropdown(students, debtDetailsById);

        const selectedMonthFilter = this.nonPayersFilterMonth; 
        
        const nonPayers = students.filter(student => {
            const details = debtDetailsById.get(String(student.id));
            return this.matchesDebtType(details, this.nonPayersFilterType) &&
                this.matchesReferenceMonth(
                    details,
                    selectedMonthFilter,
                    this.nonPayersFilterType
                );
        }).map(student => {
            const details = debtDetailsById.get(String(student.id));
            const showOverdue = this.nonPayersFilterType !== 'advance_only';
            const showAdvance = this.nonPayersFilterType !== 'overdue_only';
            const missedMonths = showOverdue ? details.missedMonths : [];
            const daysOverdue = window.PaymentsStore.calculateDaysOverdue(missedMonths);
            return {
                ...student,
                ...details,
                missedMonths,
                hasUnpaidAdvance: showAdvance && details.hasUnpaidAdvance,
                daysOverdue,
                unpaidCount: (showOverdue ? details.unpaidMonths.length : 0) +
                    (showAdvance && details.hasUnpaidAdvance ? 1 : 0)
            };
        });

        // 2. Update subtitle labeling
        const subtitleEl = document.getElementById('nonPayersFilterSubtitle');
        if (subtitleEl) {
            if (selectedMonthFilter === 'all') {
                subtitleEl.textContent = 'عرض الممتنعين: كافة المديونيات النشطة';
            } else {
                subtitleEl.textContent = `عرض الممتنعين لشهر: ${window.MONTHS[selectedMonthFilter]}`;
            }
        }

        // Sort by unpaid count (most critical first)
        nonPayers.sort((a, b) => b.unpaidCount - a.unpaidCount);

        window.PaymentsUI.renderNonPayersList(container, nonPayers, {
            onExpel: (studentId) => this.expelStudentView(studentId),
            onPayNow: (studentId) => this.openDebtModal(studentId)
        });
    },

    expelStudentView(studentId) {
        let students = window.StudentStore.getStudents(this.parent.parent.currentStage, this.parent.parent.currentGrade);
        students = students.filter(s => s.id !== studentId);
        window.StudentStore.saveStudents(this.parent.parent.currentStage, this.parent.parent.currentGrade, students);
        
        this.renderNonPayersListView();
        this.parent.renderPaymentsTable();
    }
};
