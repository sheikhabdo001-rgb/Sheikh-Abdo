window.MONTHS = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

window.PaymentsStore = {
    missingGroupPriceMessage: 'عفواً! لا يمكن السداد لهذه المجموعة لأنه لم يتم تحديد سعر لها بعد. يرجى ضبط سعر المجموعة من صفحة (أسعار المجاميع) أولاً.',

    getPaymentDatesKey(stage, grade, studentId) {
        return `payment_dates_${stage}_${grade}_${studentId}`;
    },

    getPaymentDates(stage, grade, studentId) {
        const raw = localStorage.getItem(this.getPaymentDatesKey(stage, grade, studentId));
        if (!raw) return {};

        try {
            const dates = JSON.parse(raw);
            return dates && typeof dates === 'object' ? dates : {};
        } catch (error) {
            return {};
        }
    },

    getPaymentDate(stage, grade, studentId, month) {
        return this.getPaymentDates(stage, grade, studentId)[month] || null;
    },

    validatePaymentPrice(stage, grade, month) {
        const hasValidPrice = window.FinancialManager &&
            window.FinancialManager.hasValidGroupPrice(stage, grade, month);

        if (hasValidPrice) return true;

        if (window.notify?.error) {
            window.notify.error(this.missingGroupPriceMessage);
        } else {
            window.alert(this.missingGroupPriceMessage);
        }
        return false;
    },

    getSelections(stage, grade) {
        const key = `month_selections_${stage}_${grade}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : { firstTerm: [], secondTerm: [] };
    },

    saveSelections(stage, grade, firstTerm, secondTerm) {
        const key = `month_selections_${stage}_${grade}`;
        localStorage.setItem(key, JSON.stringify({ firstTerm, secondTerm }));
    },

    getStartMonths(stage, grade) {
        const key = `start_months_${stage}_${grade}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : { firstTermStart: null, secondTermStart: null };
    },

    saveStartMonths(stage, grade, firstTermStart, secondTermStart) {
        const key = `start_months_${stage}_${grade}`;
        localStorage.setItem(key, JSON.stringify({ firstTermStart, secondTermStart }));
    },

    getCurrentMonthInfo(firstTermMonths, secondTermMonths) {
        const currentMonth = new Date().getMonth();
        if (firstTermMonths.includes(currentMonth)) {
            return { currentMonthInfo: 'first', isVacation: false, currentMonth };
        }
        if (secondTermMonths.includes(currentMonth)) {
            return { currentMonthInfo: 'second', isVacation: false, currentMonth };
        }
        return { currentMonthInfo: null, isVacation: true, currentMonth };
    },

    calculateArrears(stage, grade, studentId, firstTermMonths, secondTermMonths, startMonth = null, currentMonth = null) {
        if (!window.TenantStore?.getCurrentTeacherId()) return 0;
        const paymentsKey = `student_payments_${stage}_${grade}_${studentId}`;
        const payments = JSON.parse(localStorage.getItem(paymentsKey) || '{}');
        let count = 0;
        
        const allMonths = [...firstTermMonths, ...secondTermMonths].sort((a, b) => a - b);
        const now = currentMonth !== null ? currentMonth : new Date().getMonth();
        const start = startMonth !== null ? startMonth : (allMonths.length > 0 ? allMonths[0] : 0);

        for (const month of allMonths) {
            if (month >= start && month < now && payments[month] !== 'paid' && payments[month] !== 'absent') {
                count++;
            }
        }
        return count;
    },

    recordPayment(stage, grade, studentId, month, status) {
        // Validation
        if (!stage || !grade || studentId === undefined || month === undefined || !status) {
            console.error('Invalid payment record data');
            return false;
        }
        const belongsToCurrentGrade = window.TenantStore?.getCurrentTeacherId()
            && window.StudentStore?.getStudents(stage, grade)
                .some(student => String(student.id) === String(studentId));
        if (!belongsToCurrentGrade) {
            console.error('Payment student is outside the current teacher/grade scope');
            return false;
        }

        // Never record a paid subscription without a valid group price.
        if (status === 'paid' && !this.validatePaymentPrice(stage, grade, month)) {
            return false;
        }
        
        const key = `student_payments_${stage}_${grade}_${studentId}`;
        const payments = JSON.parse(localStorage.getItem(key) || '{}');

        const datesKey = this.getPaymentDatesKey(stage, grade, studentId);
        const paymentDates = this.getPaymentDates(stage, grade, studentId);
        const isSameStatus = payments[month] === status;
        const needsPaymentDate = status === 'paid' && !paymentDates[month];

        // Prevent unnecessary updates, while backfilling a date for older
        // paid records that predate payment-date tracking.
        if (isSameStatus && !needsPaymentDate) {
            return true; // Already in this state
        }
        
        payments[month] = status;
        localStorage.setItem(key, JSON.stringify(payments));

        if (status === 'paid') {
            paymentDates[month] = new Date().toISOString();
        } else {
            delete paymentDates[month];
        }
        localStorage.setItem(datesKey, JSON.stringify(paymentDates));
        window.AppwriteConfig?.syncPayment?.({
            studentId,
            month,
            status,
            paymentDate: paymentDates[month] || null,
            stageId: stage,
            gradeId: window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`,
            teacherId: window.TenantStore?.getCurrentTeacherId()
        }).catch(error => {
            console.warn('Appwrite payment sync failed:', error);
        });

        if (status === 'paid' && window.FinancialReportsUI?.recordPaymentTransaction) {
            const student = window.StudentStore.getStudents(stage, grade)
                .find(candidate => String(candidate.id) === String(studentId));
            const amount = student
                ? window.FinancialManager.getStudentFee(student, month, stage, grade)
                : 0;
            window.FinancialReportsUI.recordPaymentTransaction(
                stage,
                grade,
                studentId,
                month,
                amount,
                paymentDates[month]
            );
        }

        return true;
    },

    reversePayment(stage, grade, studentId, month) {
        const belongsToCurrentGrade = window.TenantStore?.getCurrentTeacherId()
            && window.StudentStore?.getStudents(stage, grade)
                .some(student => String(student.id) === String(studentId));
        if (!belongsToCurrentGrade) return false;

        const key = `student_payments_${stage}_${grade}_${studentId}`;
        const payments = JSON.parse(localStorage.getItem(key) || '{}');
        // Only a currently paid month can be reversed. Besides keeping the
        // operation explicit, this prevents duplicate reversal transactions
        // if the confirmation handler is triggered twice.
        if (payments[month] !== 'paid') return false;

        const student = window.StudentStore.getStudents(stage, grade)
            .find(candidate => String(candidate.id) === String(studentId));
        if (!student) return false;

        const reversalDate = new Date().toISOString();
        const amount = Number(window.FinancialManager?.getStudentFee(
            student,
            month,
            stage,
            grade
        )) || 0;

        delete payments[month];
        localStorage.setItem(key, JSON.stringify(payments));

        const datesKey = this.getPaymentDatesKey(stage, grade, studentId);
        const paymentDates = this.getPaymentDates(stage, grade, studentId);
        delete paymentDates[month];
        localStorage.setItem(datesKey, JSON.stringify(paymentDates));

        // Keep the original payment and append a compensating ledger entry so
        // the financial log remains an auditable timeline.
        if (window.FinancialReportsUI?.recordPaymentReversal) {
            window.FinancialReportsUI.recordPaymentReversal(
                stage,
                grade,
                studentId,
                month,
                amount,
                reversalDate
            );
        }

        return true;
    },

    getStudentPaymentInfo(stage, grade, studentId, realCurrentMonth, currentMonthInfo, isVacation, firstTermMonths, secondTermMonths, firstStart, secondStart) {
        const paymentsKey = `student_payments_${stage}_${grade}_${studentId}`;
        const payments = JSON.parse(localStorage.getItem(paymentsKey) || '{}');
        const termMonths = [...firstTermMonths, ...secondTermMonths].sort((a, b) => a - b);
        const startMonth = currentMonthInfo === 'first' ? firstStart : secondStart;

        if (startMonth === null) {
            return { 
                mokharMonth: null, 
                muqaddamMonth: null, 
                overallStatus: 'pending', 
                unpaidCount: 0, 
                payments 
            };
        }

        // Mokhar (Arrears) is the oldest unpaid month in the term up to the current date
        const debtMonths = termMonths.filter(m => m >= startMonth && m <= realCurrentMonth && payments[m] !== 'paid' && payments[m] !== 'absent');
        let mokharMonth = debtMonths.length > 0 ? debtMonths[0] : realCurrentMonth;
        
        // Muqaddam (Advance) is the month following Mokhar in the sequence
        const mokharIdx = termMonths.indexOf(mokharMonth);
        let muqaddamMonth = (mokharIdx !== -1 && mokharIdx < termMonths.length - 1) ? termMonths[mokharIdx + 1] : null;

        // Logic for Overall Status
        let mokharPaid = payments[mokharMonth] === 'paid';
        let muqaddamPaid = muqaddamMonth !== null && payments[muqaddamMonth] === 'paid';
        
        let overallStatus = 'pending'; // قيد الانتظار
        if (mokharPaid && muqaddamPaid) overallStatus = 'fully_paid'; // تم السداد بالكامل
        else if (mokharPaid) overallStatus = 'arrears_only'; // تم دفع المؤخر فقط
        
        const unpaidCount = termMonths.filter(m => m >= startMonth && m <= realCurrentMonth && payments[m] !== 'paid' && payments[m] !== 'absent').length;

        return { 
            mokharMonth, 
            muqaddamMonth, 
            overallStatus, 
            unpaidCount, 
            payments,
            mokharPaid,
            muqaddamPaid
        };
    },

    getStudentDebtList(stage, grade, studentId, firstTermMonths, secondTermMonths, firstStart, secondStart) {
        const paymentsKey = `student_payments_${stage}_${grade}_${studentId}`;
        const payments = JSON.parse(localStorage.getItem(paymentsKey) || '{}');
        const termMonths = [...firstTermMonths, ...secondTermMonths].sort((a, b) => a - b);
        const realCurrentMonth = new Date().getMonth();
        
        // Find start month based on current term logic
        const { currentMonthInfo } = this.getCurrentMonthInfo(firstTermMonths, secondTermMonths);
        const startMonth = currentMonthInfo === 'first' ? firstStart : secondStart;

        if (startMonth === null) return [];

        return termMonths
            .filter(m => m >= startMonth && m <= realCurrentMonth && payments[m] !== 'paid' && payments[m] !== 'absent')
            .map(m => ({ index: m, name: MONTHS[m] }));
    },

    getTermSettings(stage, grade) {
        const selectionData = this.getSelections(stage, grade);
        const startData = this.getStartMonths(stage, grade);
        return {
            firstTermMonths: selectionData.firstTerm,
            secondTermMonths: selectionData.secondTerm,
            firstTermStartMonth: startData.firstTermStart,
            secondTermStartMonth: startData.secondTermStart
        };
    },

    calculateDaysOverdue(missedMonths) {
        if (!missedMonths || missedMonths.length === 0) return 0;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const oldestMissedMonth = Math.min(...missedMonths);
        
        // "Since the month ended" means the start of the next month
        // We assume current year for simplicity as academic year context usually spans one cycle
        const deadlineDate = new Date(currentYear, oldestMissedMonth + 1, 1);
        
        if (now < deadlineDate) return 0;
        
        const diffTime = Math.abs(now - deadlineDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }
};
