window.FinancialReportsUI = {
    expenses: [],
    expenseKey: 'operational_expenses_v1',
    ledger: [],
    ledgerKey: 'revenue_ledger_v1',
    editingExpenseId: null,
    _range: 'today',
    _fromDate: null,
    _toDate: null,
    _selectedStage: null,
    _selectedClass: null,
    initialized: false,

    $(id) { return document.getElementById(id); },

    load() {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        this.expenses = JSON.parse(localStorage.getItem(this.expenseKey) || '[]')
            .map(expense => ({ ...expense, teacherId: expense.teacherId || teacherId }))
            .filter(expense => expense.teacherId === teacherId);
        this.ledger = JSON.parse(localStorage.getItem(this.ledgerKey) || '[]')
            .map(entry => ({ ...entry, teacherId: entry.teacherId || teacherId }))
            .filter(entry => entry.teacherId === teacherId);
    },

    persistExpenses() { localStorage.setItem(this.expenseKey, JSON.stringify(this.expenses)); },
    persistLedger() { localStorage.setItem(this.ledgerKey, JSON.stringify(this.ledger)); },

    getTransactionKey(transaction) {
        if (!transaction) return null;
        if (transaction.transactionKey) return transaction.transactionKey;
        if (
            transaction.stage === undefined ||
            transaction.grade === undefined ||
            transaction.studentId === undefined ||
            transaction.month === undefined
        ) {
            return null;
        }
        return `${transaction.stage}_${transaction.grade}_${transaction.studentId}_${transaction.month}`;
    },

    getTransactionDate(transaction) {
        return transaction?.dateTime ||
            transaction?.paymentDate ||
            transaction?.payment_date ||
            transaction?.created_at ||
            transaction?.createdAt ||
            null;
    },

    getTransactionAmount(transaction) {
        if (!transaction) return 0;

        const regularAmount = Number(
            transaction.amountPaid ?? transaction.amount ?? 0
        ) || 0;
        const advanceAmount = Number(
            transaction.advancePayment ?? transaction.advanceMonthFee ?? 0
        ) || 0;

        return regularAmount + advanceAmount;
    },

    stageName(stage) { return window.STUDENT_CONFIG.stageData[stage] ? window.STUDENT_CONFIG.stageData[stage].name : stage; },
    gradeName(stage, grade) {
        const names = window.STUDENT_CONFIG.gradeNames[stage] || [];
        return names[grade - 1] || `صف ${grade}`;
    },

    getGradePairs() {
        const selStages = window.Auth.getSelectedStages();
        const selGrades = window.Auth.getSelectedGrades() || {};
        const stageVal = document.getElementById('reportStageFilter')?.value;
        const classVal = document.getElementById('reportClassFilter')?.value;

        const activeStages = stageVal && stageVal !== 'all'
            ? selStages.filter(s => s === stageVal)
            : window.GlobalStageFilter.filterStages(selStages);

        const pairs = [];
        activeStages.forEach(stage => {
            const grades = selGrades[stage] || [];
            grades.forEach(g => {
                const key = `${stage}_${g}`;
                if (classVal && classVal !== 'all' && classVal !== key) return;
                pairs.push({ stage, grade: g });
            });
        });
        return pairs;
    },

    calculateCurrentDebtsAndAdvances(studentsList) {
        let totalCurrentMonthOverdue = 0;
        let totalNextMonthAdvance = 0;
        let currentMonthUnpaidCount = 0;
        let nextMonthUnpaidCount = 0;

        studentsList.forEach(student => {
            if (
                student.currentMonthApplicable &&
                !student.isCurrentMonthPaid &&
                student.currentMonthStatus !== 'absent'
            ) {
                totalCurrentMonthOverdue += Number(student.monthlyFee) || 0;
                currentMonthUnpaidCount++;
            }

            if (
                student.nextMonthApplicable &&
                !student.isAdvancePaid &&
                student.nextMonthStatus !== 'absent'
            ) {
                totalNextMonthAdvance += Number(
                    student.advanceAmount || student.monthlyFee
                ) || 0;
                nextMonthUnpaidCount++;
            }
        });

        return {
            totalCurrentMonthOverdue,
            totalNextMonthAdvance,
            totalNetDebts: totalCurrentMonthOverdue + totalNextMonthAdvance,
            currentMonthUnpaidCount,
            nextMonthUnpaidCount
        };
    },

    computeDebtAnalytics(pairs) {
        const currentMonth = new Date().getMonth();
        const nextMonth = (currentMonth + 1) % 12;
        const currentMonthName = window.MONTHS[currentMonth];
        const nextMonthName = window.MONTHS[nextMonth];
        const debtStudents = [];

        const isStartedMonth = (month, startMonth) => {
            if (startMonth === null || startMonth === undefined) return false;
            // A wrapped month (January after December) belongs to the next
            // calendar year and is therefore still upcoming.
            return month >= startMonth || month < currentMonth;
        };

        pairs.forEach(({ stage, grade }) => {
            const {
                firstTermMonths,
                secondTermMonths,
                firstTermStartMonth,
                secondTermStartMonth
            } = window.PaymentsStore.getTermSettings(stage, grade);
            const termMonths = new Set([...firstTermMonths, ...secondTermMonths]);
            const startMap = {};
            firstTermMonths.forEach(month => { startMap[month] = firstTermStartMonth; });
            secondTermMonths.forEach(month => { startMap[month] = secondTermStartMonth; });

            const currentMonthApplicable = termMonths.has(currentMonth) &&
                isStartedMonth(currentMonth, startMap[currentMonth]);
            const nextMonthApplicable = termMonths.has(nextMonth) &&
                isStartedMonth(nextMonth, startMap[nextMonth]);

            window.StudentStore.getStudents(stage, grade)
                .filter(student => student.name)
                .forEach(student => {
                    const paymentsKey = `student_payments_${stage}_${grade}_${student.id}`;
                    const payments = JSON.parse(localStorage.getItem(paymentsKey) || '{}');
                    const currentFee = currentMonthApplicable
                        ? Number(window.FinancialManager.getStudentFee(
                            student,
                            currentMonth,
                            stage,
                            grade
                        )) || 0
                        : 0;
                    const nextFee = nextMonthApplicable
                        ? Number(window.FinancialManager.getStudentFee(
                            student,
                            nextMonth,
                            stage,
                            grade
                        )) || 0
                        : 0;

                    debtStudents.push({
                        ...student,
                        monthlyFee: currentFee,
                        advanceAmount: nextFee,
                        currentMonthApplicable,
                        nextMonthApplicable,
                        currentMonthStatus: payments[currentMonth],
                        nextMonthStatus: payments[nextMonth],
                        isCurrentMonthPaid: payments[currentMonth] === 'paid',
                        isAdvancePaid: payments[nextMonth] === 'paid'
                    });
                });
        });

        const debtTotals = this.calculateCurrentDebtsAndAdvances(debtStudents);

        return {
            currentMonth,
            nextMonth,
            currentMonthName,
            nextMonthName,
            totalCurrentMonthOverdue: debtTotals.totalCurrentMonthOverdue,
            totalNextMonthAdvance: debtTotals.totalNextMonthAdvance,
            totalNetDebts: debtTotals.totalNetDebts,
            // Compatibility names used by the existing KPI renderer.
            totalOverdue: debtTotals.totalCurrentMonthOverdue,
            totalAdvance: debtTotals.totalNextMonthAdvance,
            totalNet: debtTotals.totalNetDebts,
            totalDebts: debtTotals.totalNetDebts,
            overdueMonths: debtTotals.currentMonthUnpaidCount,
            advanceMonths: debtTotals.nextMonthUnpaidCount,
            unpaidMonthsCount: debtTotals.currentMonthUnpaidCount +
                debtTotals.nextMonthUnpaidCount
        };
    },

    syncLedger() {
        const nowStr = new Date().toISOString();
        const realMonth = new Date().getMonth();
        const currentTeacherId = window.TenantStore?.getCurrentTeacherId();
        const existingByKey = new Map();
        this.ledger.forEach(entry => {
            const key = this.getTransactionKey(entry);
            if (key) existingByKey.set(key, entry);
        });
        let changed = false;

        const selStages = window.Auth.getSelectedStages();
        const selGrades = window.Auth.getSelectedGrades() || {};
        selStages.forEach(stage => {
            const grades = selGrades[stage] || [];
            grades.forEach(grade => {
                const {
                    firstTermMonths,
                    secondTermMonths,
                    firstTermStartMonth,
                    secondTermStartMonth
                } = window.PaymentsStore.getTermSettings(stage, grade);
                const termMonths = [...firstTermMonths, ...secondTermMonths].sort((a, b) => a - b);
                const startMap = {};
                firstTermMonths.forEach(m => startMap[m] = firstTermStartMonth);
                secondTermMonths.forEach(m => startMap[m] = secondTermStartMonth);

                const students = window.StudentStore.getStudents(stage, grade).filter(s => s.name);
                students.forEach(student => {
                    const paymentsKey = `student_payments_${stage}_${grade}_${student.id}`;
                    const payments = JSON.parse(localStorage.getItem(paymentsKey) || '{}');
                    const paymentDates = window.PaymentsStore.getPaymentDates(stage, grade, student.id);

                    termMonths.forEach(m => {
                        const start = startMap[m];
                        if (start === null || m < start || payments[m] !== 'paid') return;

                        // A paid future month is an actual advance payment and
                        // must be included as revenue rather than discarded.
                        const transactionKey = `${stage}_${grade}_${student.id}_${m}`;
                        const existing = existingByKey.get(transactionKey);
                        const paymentDate =
                            paymentDates[m] ||
                            this.getTransactionDate(existing) ||
                            nowStr;
                        const fee = window.FinancialManager.getStudentFee(student, m, stage, grade);
                        const isAdvance = m > realMonth;
                        const details = {
                            id: existing?.id || ('rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
                            transactionKey,
                            teacherId: currentTeacherId,
                            dateTime: paymentDate,
                            paymentDate,
                            payment_date: paymentDate,
                            created_at: paymentDate,
                            studentId: student.id,
                            studentName: student.name,
                            studentCode: student.studentCode || student.id,
                            stage,
                            grade,
                            stageName: this.stageName(stage),
                            className: this.gradeName(stage, grade),
                            month: m,
                            monthName: window.MONTHS[m],
                            type: 'payment',
                            paymentType: isAdvance ? 'advance' : 'regular',
                            amount: fee || 0,
                            amountPaid: isAdvance ? 0 : (fee || 0),
                            advancePayment: isAdvance ? (fee || 0) : 0,
                            advanceMonthFee: isAdvance ? (fee || 0) : 0
                        };

                        if (fee <= 0) {
                            console.warn(`[التقارير المالية] رسوم شهري = 0 للطالب "${student.name}" (${stage}_${grade}) شهر ${window.MONTHS[m]}. تحقق من ضبط الأسعار في "أسعار المجاميع" (standard_fees / custom_fees).`);
                        }

                        if (!existing) {
                            this.ledger.push(details);
                            existingByKey.set(transactionKey, details);
                            changed = true;
                        } else {
                            const hasChanges = Object.keys(details)
                                .some(key => existing[key] !== details[key]);
                            if (hasChanges) {
                                Object.assign(existing, details);
                                changed = true;
                            }
                        }
                    });
                });
            });
        });
        if (changed) this.persistLedger();
    },

    recordPaymentTransaction(stage, grade, studentId, month, amount, paymentDate = new Date().toISOString()) {
        // Payment records can be created before the reports view is opened.
        // Reload first so the transaction is persisted immediately and is
        // available to the next date-filtered report.
        this.load();

        const students = window.StudentStore.getStudents(stage, grade);
        const student = students.find(candidate => String(candidate.id) === String(studentId));
        if (!student) return;

        const transactionKey = `${stage}_${grade}_${studentId}_${month}`;
        const realMonth = new Date().getMonth();
        const isAdvance = month > realMonth;
        const numericAmount = Number(amount) || 0;
        const existingIndex = this.ledger.findIndex(
            entry => this.getTransactionKey(entry) === transactionKey
        );
        const transaction = {
            id: existingIndex === -1
                ? 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
                : this.ledger[existingIndex].id,
            transactionKey,
            teacherId: window.TenantStore?.getCurrentTeacherId(),
            dateTime: paymentDate,
            paymentDate,
            payment_date: paymentDate,
            created_at: paymentDate,
            studentId: student.id,
            studentName: student.name,
            studentCode: student.studentCode || student.id,
            stage,
            grade,
            stageName: this.stageName(stage),
            className: this.gradeName(stage, grade),
            month,
            monthName: window.MONTHS[month],
            type: 'payment',
            paymentType: isAdvance ? 'advance' : 'regular',
            amount: numericAmount,
            amountPaid: isAdvance ? 0 : numericAmount,
            advancePayment: isAdvance ? numericAmount : 0,
            advanceMonthFee: isAdvance ? numericAmount : 0
        };

        if (existingIndex === -1) this.ledger.push(transaction);
        else this.ledger[existingIndex] = { ...this.ledger[existingIndex], ...transaction };
        this.persistLedger();
        window.AppwriteConfig?.syncFinancialTransaction?.(transaction).catch(error => {
            console.warn('Appwrite financial transaction sync failed:', error);
        });
    },

    recordPaymentReversal(stage, grade, studentId, month, amount, reversalDate = new Date().toISOString()) {
        this.load();

        const student = window.StudentStore.getStudents(stage, grade)
            .find(candidate => String(candidate.id) === String(studentId));
        if (!student) return null;

        const numericAmount = Math.abs(Number(amount) || 0);
        const monthName = window.MONTHS[month] || String(month);
        const transaction = {
            id: 'refund_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            // A reversal intentionally has a distinct key. The original
            // payment and its compensating entry both remain auditable.
            transactionKey: `reversal_${stage}_${grade}_${student.id}_${month}_${Date.now()}`,
            teacherId: window.TenantStore?.getCurrentTeacherId(),
            dateTime: reversalDate,
            paymentDate: reversalDate,
            payment_date: reversalDate,
            created_at: reversalDate,
            studentId: student.id,
            studentName: student.name,
            studentCode: student.studentCode || student.id,
            stage,
            grade,
            stageName: this.stageName(stage),
            className: this.gradeName(stage, grade),
            month,
            monthName,
            type: 'reversal',
            action: 'PAYMENT_REVERSAL',
            paymentType: 'reversal',
            description: `تراجع عن سداد شهر ${monthName}`,
            amount: -numericAmount,
            amountPaid: -numericAmount,
            advancePayment: 0,
            advanceMonthFee: 0
        };

        this.ledger.push(transaction);
        this.persistLedger();
        window.AppwriteConfig?.syncFinancialTransaction?.(transaction).catch(error => {
            console.warn('Appwrite financial reversal sync failed:', error);
        });
        return transaction;
    },

    getStudentTransactions(stage, grade, studentId) {
        this.load();
        return this.ledger
            .filter(transaction =>
                transaction.stage === stage &&
                Number(transaction.grade) === Number(grade) &&
                String(transaction.studentId) === String(studentId)
            )
            .sort((a, b) =>
                new Date(this.getTransactionDate(b)) - new Date(this.getTransactionDate(a))
            );
    },

    removePaymentTransaction(stage, grade, studentId, month) {
        this.load();
        const transactionKey = `${stage}_${grade}_${studentId}_${month}`;
        const nextLedger = this.ledger.filter(
            entry => this.getTransactionKey(entry) !== transactionKey
        );
        if (nextLedger.length !== this.ledger.length) {
            this.ledger = nextLedger;
            this.persistLedger();
        }
    },

    // Calculate the custom weekly range from Friday at 00:00 through
    // the following Friday at 23:59:59.999.
    getFridayToFridayWeekRange(referenceDate = new Date()) {
        const date = new Date(referenceDate);
        const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

        // If today is Friday, the most recent Friday is today. Otherwise,
        // walk back to the Friday that started the current reporting week.
        const daysSinceFriday = (dayOfWeek + 2) % 7;

        const startDate = new Date(date);
        startDate.setDate(date.getDate() - daysSinceFriday);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);

        return { startDate, endDate };
    },

    getRangeBounds() {
        const now = new Date();
        let start, end;
        const range = this._range;

        if (range === 'custom') {
            const from = this.parseDateInput(this._fromDate);
            const to = this.parseDateInput(this._toDate);

            if (from || to) {
                start = from || to;
                end = to || from;
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                if (start > end) [start, end] = [end, start];
            } else {
                start = null;
                end = null;
            }
        } else if (range === 'today') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        } else if (range === 'week' || range === 'thisWeek') {
            const weekRange = this.getFridayToFridayWeekRange(now);
            start = weekRange.startDate;
            end = weekRange.endDate;
        } else if (range === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (range === 'year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else {
            start = null;
            end = null;
        }
        return { start, end };
    },

    parseDateInput(value) {
        if (!value) return null;
        const [year, month, day] = String(value).split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    },

    inRange(dateStr) {
        const { start, end } = this.getRangeBounds();
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return false;
        if (!start) return true;
        return d >= start && d <= end;
    },

    chartBucketOf(dateStr) {
        const d = new Date(dateStr);
        if (this._range === 'year' || this._range === 'all') {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')
        ].join('-');
    },

    chartBucketLabel(bucket) {
        const parts = bucket.split('-').map(Number);
        if (parts.length === 2) {
            const [year, month] = parts;
            return `${window.MONTHS[month - 1]} ${year}`;
        }
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('ar-EG', {
            day: 'numeric',
            month: 'short'
        });
    },

    isStageOrClassFiltered() {
        const stageFilter = this.$('reportStageFilter')?.value;
        const classFilter = this.$('reportClassFilter')?.value;

        return Boolean(
            (stageFilter && stageFilter !== 'all') ||
            (classFilter && classFilter !== 'all')
        );
    },

    compute() {
        this.syncLedger();
        const pairs = this.getGradePairs();
        const pairSet = new Set(pairs.map(p => `${p.stage}_${p.grade}`));
        const debtAnalytics = this.computeDebtAnalytics(pairs);
        const expenses = this.getFilteredExpenses();

        const pairIds = new Set();
        const revByPair = {};
        const revByPeriod = {};
        let totalRevenue = 0;
        this.ledger.forEach(t => {
            const pk = `${t.stage}_${t.grade}`;
            if (!pairSet.has(pk)) return;
            const transactionDate = this.getTransactionDate(t);
            if (!transactionDate || !this.inRange(transactionDate)) return;
            if (!(pairIds.has(pk))) pairIds.add(pk);
            const amount = this.getTransactionAmount(t);
            totalRevenue += amount;
            revByPair[pk] = (revByPair[pk] || 0) + amount;
            const bucket = this.chartBucketOf(transactionDate);
            revByPeriod[bucket] = (revByPeriod[bucket] || 0) + amount;
        });

        let totalExpense = 0;
        const expByPeriod = {};
        expenses.forEach(exp => {
            const amount = Number(exp.amount) || 0;
            totalExpense += amount;
            const bucket = this.chartBucketOf(exp.dateTime);
            expByPeriod[bucket] = (expByPeriod[bucket] || 0) + amount;
        });

        const currentBalance = totalRevenue - totalExpense;

        return {
            pairs,
            totalRevenue,
            totalProfit: currentBalance,
            totalExpense,
            // Compatibility name for consumers that use the plural form.
            totalExpenses: totalExpense,
            currentBalance,
            debtAnalytics,
            revByPair,
            revByPeriod,
            expByPeriod,
            filteredExpenses: expenses,
            pairIds
        };
    },

    renderKpis(d) {
        const fmt = n => `${Math.round(n).toLocaleString()} ج.م`;
        this.$('kpiRevenue').textContent = fmt(d.totalRevenue);
        this.$('kpiExpense').textContent = fmt(d.totalExpense);
        this.$('kpiProfit').textContent = fmt(d.totalProfit);
        this.$('kpiBalance').textContent = fmt(d.currentBalance);

        const balanceCard = this.$('kpiBalanceCard');
        balanceCard.classList.toggle('positive', d.currentBalance >= 0);
        balanceCard.classList.toggle('negative', d.currentBalance < 0);

        this.$('kpiRevenueSub').textContent = `${d.pairIds.size} مجموعة نشطة`;
        this.$('kpiExpenseSub').textContent = `${d.filteredExpenses.length} مصروف في الفترة`;
        this.$('kpiBalanceSub').textContent =
            d.currentBalance >= 0 ? 'الإيرادات - المصروفات' : 'الرصيد أقل من صفر';

        const debt = d.debtAnalytics;
        const debtFmt = n => `${Math.round(n).toLocaleString()} ج.م`;
        this.$('kpiOverdue').textContent = debtFmt(debt.totalOverdue);
        this.$('kpiAdvance').textContent = debtFmt(debt.totalAdvance);
        this.$('kpiNetDebt').textContent = debtFmt(debt.totalNet);
        this.$('debtAnalyticsNote').textContent =
            `${debt.currentMonthName} + مقدم ${debt.nextMonthName}`;
        this.$('kpiOverdueSub').textContent = debt.overdueMonths
            ? `${debt.currentMonthName}: ${debt.overdueMonths} غير مسدد`
            : `لا توجد مديونية في ${debt.currentMonthName}`;
        this.$('kpiAdvanceSub').textContent = debt.advanceMonths
            ? `${debt.advanceMonths} مقدم غير مسدد عن ${debt.nextMonthName}`
            : `لا يوجد مقدم غير مسدد عن ${debt.nextMonthName}`;
        this.$('kpiNetDebtSub').textContent =
            `${debt.currentMonthName} + مقدم ${debt.nextMonthName}`;

        const netDebtCard = this.$('kpiNetDebtCard');
        netDebtCard.classList.toggle('positive', debt.totalNet >= 0);
        netDebtCard.classList.toggle('negative', debt.totalNet < 0);
    },

    renderBarChart(d) {
        const periods = [...new Set([
            ...Object.keys(d.revByPeriod),
            ...Object.keys(d.expByPeriod)
        ])].sort();
        const data = periods.map(period => ({
            label: this.chartBucketLabel(period),
            rev: d.revByPeriod[period] || 0,
            exp: d.expByPeriod[period] || 0
        }));

        const svg = this.$('revExpChart');
        const hint = this.$('revExpChartHint');
        if (hint) {
            hint.textContent =
                this._range === 'year' || this._range === 'all'
                    ? 'شهرياً'
                    : 'يومياً';
        }
        const empty = data.length === 0;
        svg.innerHTML = '';
        if (empty) {
            svg.innerHTML = `<text x="300" y="130" text-anchor="middle" fill="var(--text-secondary)" font-size="14" font-family="Cairo,sans-serif">لا توجد بيانات في هذه الفترة</text>`;
            return;
        }

        const W = 600, H = 260, padL = 50, padR = 10, padT = 20, padB = 34;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;
        const maxVal = Math.max(...data.map(d => Math.max(d.rev, d.exp)), 1);
        const n = data.length;
        const groupW = chartW / n;
        const barW = Math.min(28, groupW * 0.32);
        const gap = 6;

        let html = '';
        for (let i = 0; i <= 4; i++) {
            const y = padT + (chartH / 4) * i;
            const val = maxVal - (maxVal / 4) * i;
            html += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(128,128,160,0.12)" stroke-width="1"/>
                     <text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-secondary)" font-size="11" font-family="Cairo,sans-serif">${Math.round(val).toLocaleString()}</text>`;
        }

        data.forEach((item, i) => {
            const gx = padL + groupW * i;
            const cx = gx + groupW / 2;
            const revH = (item.rev / maxVal) * chartH;
            const expH = (item.exp / maxVal) * chartH;
            const yRev = padT + chartH - revH;
            const yExp = padT + chartH - expH;
            html += `<text x="${cx}" y="${H - 10}" text-anchor="middle" fill="var(--text-secondary)" font-size="11" font-family="Cairo,sans-serif">${item.label}</text>`;
            html += `<rect x="${cx - barW - gap / 2}" y="${yRev}" width="${barW}" height="${Math.max(revH, 1)}" rx="4" fill="#a855f7" opacity="0.92">
                        <title>الإيرادات ${item.label}: ${Math.round(item.rev).toLocaleString()}</title></rect>`;
            html += `<rect x="${cx + gap / 2}" y="${yExp}" width="${barW}" height="${Math.max(expH, 1)}" rx="4" fill="#ef4444" opacity="0.9">
                        <title>المصاريف ${item.label}: ${Math.round(item.exp).toLocaleString()}</title></rect>`;
        });
        svg.innerHTML = html;
    },

    renderPieChart(d) {
        const svg = this.$('gradePieChart');
        const legend = this.$('gradePieLegend');
        svg.innerHTML = ''; legend.innerHTML = '';
        const entries = Object.entries(d.revByPair).filter(([, v]) => v > 0);
        const total = entries.reduce((s, [, v]) => s + v, 0);
        if (entries.length === 0) {
            svg.innerHTML = `<text x="100" y="105" text-anchor="middle" fill="var(--text-secondary)" font-size="13" font-family="Cairo,sans-serif">لا توجد إيرادات</text>`;
            legend.innerHTML = '<div class="pie-empty">لا توجد بيانات</div>';
            return;
        }

        const palette = ['#a855f7', '#f97316', '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
        const cx = 100, cy = 100, r = 88;
        let angle = -Math.PI / 2;
        const groups = [];
        entries.forEach(([pk, val], i) => {
            const [stage, grade] = pk.split('_');
            const name = this.stageName(stage) + ' - ' + this.gradeName(stage, Number(grade));
            const pct = (val / total) * 100;
            const slice = (val / total) * 2 * Math.PI;
            const end = angle + slice;
            const large = slice > Math.PI ? 1 : 0;
            const x1 = cx + r * Math.sin(angle), y1 = cy - r * Math.cos(angle);
            const x2 = cx + r * Math.sin(end), y2 = cy - r * Math.cos(end);
            const color = palette[i % palette.length];
            svg.innerHTML += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" opacity="0.92">
                <title>${name}: ${pct.toFixed(1)}%</title></path>`;
            groups.push({ name, val, pct, color });
            angle = end;
        });
        svg.innerHTML += `<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="var(--surface-color)"/>`;
        svg.innerHTML += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="var(--text-primary)" font-size="20" font-weight="900" font-family="Cairo,sans-serif">${Math.round(total).toLocaleString()}</text>`;
        svg.innerHTML += `<text x="${cx}" y="${cy + 18}" text-anchor="middle" fill="var(--text-secondary)" font-size="11" font-family="Cairo,sans-serif">ج.م</text>`;

        groups.forEach(g => {
            legend.innerHTML += `
                <div class="pie-legend-item">
                    <span class="legend-dot" style="background:${g.color}"></span>
                    <span class="pie-legend-name">${g.name}</span>
                    <span class="pie-legend-val">${Math.round(g.val).toLocaleString()} ج.م</span>
                    <span class="pie-legend-pct">${g.pct.toFixed(0)}%</span>
                </div>`;
        });
    },

    renderExpenses() {
        const list = this.getFilteredExpenses()
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        this.$('expenseCount').textContent = `${list.length} مصروف`;
        const catMap = {
            office: 'أدوات مكتبية',
            rent: 'إيجار',
            personal: 'شخصي',
            salaries: 'رواتب المساعدين',
            printing: 'طباعة مذكرة',
            bills: 'فواتير',
            other: 'أخرى'
        };
        const tbody = this.$('expensesTable');

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-row"><i class="fas fa-inbox"></i> لا توجد مصاريف مسجلة</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(exp => {
            const dt = new Date(exp.dateTime);
            const dateStr = dt.toLocaleDateString('ar-EG') + ' - ' + dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            return `
                <tr>
                    <td class="exp-title">${exp.title}</td>
                    <td><span class="cat-badge cat-${exp.category}">${catMap[exp.category] || exp.category}</span></td>
                    <td class="amount-col negative-txt">${Number(exp.amount).toLocaleString()} ج.م</td>
                    <td class="muted-cell">${dateStr}</td>
                    <td class="muted-cell">${exp.notes || '<span class="dim">—</span>'}</td>
                    <td>${exp.receipt ? `<button class="icon-btn receipt-view" data-id="${exp.id}" title="عرض الإيصال"><i class="fas fa-receipt"></i></button>` : '<span class="dim">—</span>'}</td>
                    <td class="row-actions">
                        <button class="icon-btn" data-edit="${exp.id}" title="تعديل"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn danger" data-del="${exp.id}" title="حذف"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    },

    renderLedger() {
        const searchTerm = (document.getElementById('ledgerSearch').value || '').trim().toLowerCase();
        const pairSet = new Set(this.getGradePairs().map(p => `${p.stage}_${p.grade}`));
        const list = this.ledger
            .filter(t => {
            if (!pairSet.has(`${t.stage}_${t.grade}`)) return false;
                if (!this.inRange(this.getTransactionDate(t))) return false;
                if (searchTerm && !(
                    t.studentName + ' ' +
                    (t.studentCode || '') + ' ' +
                    (t.description || t.monthName || '')
                ).toLowerCase().includes(searchTerm)) return false;
                return true;
            })
            .sort((a, b) => new Date(this.getTransactionDate(b)) - new Date(this.getTransactionDate(a)));

        this.$('ledgerCount').textContent = `${list.length} معاملة`;
        const tbody = this.$('revenueLedgerTable');
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-row"><i class="fas fa-inbox"></i> لا توجد معاملات في هذه الفترة</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(t => {
            const dt = new Date(this.getTransactionDate(t));
            const dateStr = dt.toLocaleDateString('ar-EG');
            const timeStr = dt.toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `
                <tr>
                    <td class="student-cell">
                        <a href="#" class="student-name-link" data-student-id="${t.studentId}" data-stage="${t.stage}" data-grade="${t.grade}" data-from-view="financialReports">${t.studentName}</a>
                    </td>
                    <td class="muted-cell">${t.stageName} - ${t.className}</td>
                    <td class="muted-cell">${t.type === 'reversal' ? 'تراجع عن سداد' : 'سداد'}</td>
                    <td class="amount-col ${t.type === 'reversal' ? 'negative-txt' : ''}">${this.getTransactionAmount(t).toLocaleString()} ج.م</td>
                    <td class="muted-cell">${dateStr}</td>
                    <td class="muted-cell">${timeStr}</td>
                    <td class="muted-cell">${t.description || t.monthName || '—'}</td>
                </tr>`;
        }).join('');
    },

    openExpenseModal(id = null) {
        this.editingExpenseId = id;
        this._pendingReceipt = null;
        this.$('expenseModalTitle').innerHTML = id ? '<i class="fas fa-edit"></i> تعديل المصروف' : '<i class="fas fa-receipt"></i> إضافة مصروف جديد';
        this.$('expenseTitle').value = '';
        this.$('expenseCategory').value = 'rent';
        this.$('expenseAmount').value = '';
        this.$('expenseNotes').value = '';
        this.$('receiptPreview').style.display = 'none';
        this.$('receiptFileName').textContent = 'اضغط لرفع صورة الإيصال';

        let initialDate = new Date();
        if (id) {
            const exp = this.expenses.find(e => e.id === id);
            if (exp) {
                this.$('expenseTitle').value = exp.title;
                this.$('expenseCategory').value = exp.category;
                this.$('expenseAmount').value = exp.amount;
                this.$('expenseNotes').value = exp.notes || '';
                initialDate = new Date(exp.dateTime);
                if (exp.receipt) {
                    this.$('receiptPreview').src = exp.receipt;
                    this.$('receiptPreview').style.display = 'block';
                    this.$('receiptFileName').textContent = 'استبدال صورة الإيصال';
                }
            }
        }
        const pad = n => String(n).padStart(2, '0');
        this.$('expenseDateTime').value = `${initialDate.getFullYear()}-${pad(initialDate.getMonth() + 1)}-${pad(initialDate.getDate())}T${pad(initialDate.getHours())}:${pad(initialDate.getMinutes())}`;
        this.$('expenseModal').classList.add('active');
    },

    saveExpense() {
        const title = this.$('expenseTitle').value.trim();
        const amount = parseFloat(this.$('expenseAmount').value);
        if (!title) return window.notify.error('يرجى إدخال عنوان المصروف');
        if (isNaN(amount) || amount <= 0) return window.notify.error('يرجى إدخال مبلغ صحيح');
        if (!this.$('expenseDateTime').value) return window.notify.error('يرجى اختيار التاريخ والوقت');

        const payload = {
            teacherId: window.TenantStore?.getCurrentTeacherId(),
            title,
            category: this.$('expenseCategory').value,
            amount,
            dateTime: new Date(this.$('expenseDateTime').value).toISOString(),
            notes: this.$('expenseNotes').value.trim(),
            receipt: this._pendingReceipt || null
        };
        this._pendingReceipt = null;

        if (this.editingExpenseId) {
            const idx = this.expenses.findIndex(e => e.id === this.editingExpenseId);
            if (idx !== -1) this.expenses[idx] = { ...this.expenses[idx], ...payload };
            window.notify.success('تم تعديل المصروف بنجاح');
        } else {
            payload.id = 'exp_' + Date.now();
            this.expenses.push(payload);
            window.notify.success('تم إضافة المصروف بنجاح');
        }
        this.persistExpenses();
        window.AppwriteConfig?.syncFinancialExpense?.(payload).catch(error => {
            console.warn('Appwrite financial expense sync failed:', error);
        });
        this.$('expenseModal').classList.remove('active');
        this.renderReport();
    },

    async deleteExpense(id) {
        const confirmed = await window.confirm('هل أنت متأكد من حذف هذا المصروف؟');
        if (!confirmed) return;
        this.expenses = this.expenses.filter(e => e.id !== id);
        this.persistExpenses();
        window.AppwriteConfig?.deleteFinancialExpense?.(id).catch(error => {
            console.warn('Appwrite expense deletion failed:', error);
        });
        this.renderReport();
        window.notify.success('تم حذف المصروف');
    },

    handleReceipt(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this._pendingReceipt = e.target.result;
            this.$('receiptPreview').src = e.target.result;
            this.$('receiptPreview').style.display = 'block';
            this.$('receiptFileName').textContent = file.name;
        };
        reader.readAsDataURL(file);
    },

    renderAll() { this.renderExpenses(); this.renderLedger(); },

    escapePrintHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    formatPrintDate(dateValue, includeTime = true) {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString('ar-EG', includeTime
            ? { dateStyle: 'medium', timeStyle: 'short' }
            : { dateStyle: 'medium' });
    },

    getFilteredExpenses() {
        if (this.isStageOrClassFiltered()) {
            // Personal expenses belong to the global system context, not a
            // specific stage or class.
            return [];
        }

        const categoryFilter = this.$('expenseCategoryFilter')?.value || 'all';
        const searchTerm = (this.$('expenseSearch')?.value || '').trim().toLowerCase();

        return this.expenses
            .filter(expense => {
                if (!this.inRange(expense.dateTime)) return false;
                if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
                if (
                    searchTerm &&
                    !(expense.title + ' ' + (expense.notes || '')).toLowerCase().includes(searchTerm)
                ) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    },

    getFilteredLedger() {
        const searchTerm = (this.$('ledgerSearch')?.value || '').trim().toLowerCase();
        const pairSet = new Set(this.getGradePairs().map(pair => `${pair.stage}_${pair.grade}`));

        return this.ledger
            .filter(transaction => {
                if (!pairSet.has(`${transaction.stage}_${transaction.grade}`)) return false;
                if (!this.inRange(this.getTransactionDate(transaction))) return false;
                if (
                    searchTerm &&
                    !(
                        (transaction.studentName || '') + ' ' +
                        (transaction.studentCode || '')
                    ).toLowerCase().includes(searchTerm)
                ) {
                    return false;
                }
                return true;
            })
            .sort((a, b) =>
                new Date(this.getTransactionDate(b)) - new Date(this.getTransactionDate(a))
            );
    },

    getPrintRangeLabel() {
        const rangeFilter = this.$('reportRangeFilter')?.value || this._range || 'today';
        const startDate = this.$('reportStartDate')?.value || this.$('rangeFrom')?.value || this._fromDate;
        const endDate = this.$('reportEndDate')?.value || this.$('rangeTo')?.value || this._toDate;

        const formatFullDate = dStr => {
            if (!dStr) return '';
            const d = new Date(`${dStr}T00:00:00`);
            return d.toLocaleDateString('ar-EG-u-nu-latn', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        switch (rangeFilter) {
            case 'today':
                return 'اليوم';
            case 'week':
                return 'الأسبوع الحالي';
            case 'month':
                return 'الشهر الحالي';
            case 'custom':
                if (startDate && endDate) {
                    return `من ${formatFullDate(startDate)} إلى ${formatFullDate(endDate)}`;
                }
                if (startDate) return `من ${formatFullDate(startDate)}`;
                if (endDate) return `حتى ${formatFullDate(endDate)}`;
                return 'فترة مخصصة';
            default:
                return 'جميع الأوقات';
        }
    },

    buildFinancialPrintTemplate() {
        this.renderReport();
        const data = this.compute();
        const expenses = this.getFilteredExpenses();
        const ledger = this.getFilteredLedger();
        const debt = data.debtAnalytics;
        const esc = value => this.escapePrintHtml(value);
        const money = value => `${Math.round(Number(value) || 0).toLocaleString()} ج.م`;
        const exportDate = new Date();
        const teacherName = window.Auth?.getTeacherName?.() || 'اسم المعلم';
        const fullDateText = exportDate.toLocaleDateString('ar-EG-u-nu-latn', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeText = exportDate.toLocaleTimeString('ar-EG-u-nu-latn', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const rangeText = this.getPrintRangeLabel();
        const expenseCategoryNames = {
            office: 'أدوات مكتبية',
            rent: 'إيجار',
            personal: 'شخصي',
            salaries: 'رواتب المساعدين',
            printing: 'طباعة مذكرة',
            bills: 'فواتير',
            other: 'أخرى'
        };
        const stageFilter = this.$('reportStageFilter');
        const classFilter = this.$('reportClassFilter');
        const scopeLabel = [
            stageFilter?.options?.[stageFilter.selectedIndex]?.textContent || 'كل المراحل',
            classFilter?.options?.[classFilter.selectedIndex]?.textContent || 'كل الصفوف'
        ].join(' / ');

        const expenseRows = expenses.length
            ? expenses.map(expense => `
                <tr>
                    <td>${esc(expense.title)}</td>
                    <td>${esc(expenseCategoryNames[expense.category] || expense.category)}</td>
                    <td class="financial-print-number">${money(expense.amount)}</td>
                    <td>${esc(this.formatPrintDate(expense.dateTime))}</td>
                    <td>${esc(expense.notes || '—')}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="financial-print-empty">لا توجد مصروفات في الفترة المحددة</td></tr>';
        const expenseSection = this.isStageOrClassFiltered()
            ? ''
            : `
                <section class="financial-print-section">
                    <h2 class="financial-print-section-title">سجل المصروفات الشخصية <span>(${expenses.length})</span></h2>
                    <table class="financial-print-table student-list-pdf-table print-financial-table">
                        <thead>
                            <tr>
                                <th>العنوان</th>
                                <th>التصنيف</th>
                                <th>المبلغ</th>
                                <th>التاريخ والوقت</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>${expenseRows}</tbody>
                    </table>
                </section>
            `;

        const ledgerRows = ledger.length
            ? ledger.map(transaction => `
                <tr>
                    <td>${esc(transaction.studentName)}</td>
                    <td>${esc(transaction.stageName || this.stageName(transaction.stage))}</td>
                    <td>${esc(transaction.className || this.gradeName(transaction.stage, transaction.grade))}</td>
                    <td>${esc(transaction.type === 'reversal' ? 'تراجع عن سداد' : 'سداد')}</td>
                    <td class="financial-print-number">${money(this.getTransactionAmount(transaction))}</td>
                    <td>${esc(this.formatPrintDate(this.getTransactionDate(transaction)))}</td>
                    <td>${esc(transaction.description || transaction.monthName || '—')}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="7" class="financial-print-empty">لا توجد معاملات في الفترة المحددة</td></tr>';

        const template = document.createElement('section');
        template.id = 'financialPrintTemplate';
        template.className = 'financial-print-template printable-financial-container student-list-pdf-host print-report-container';
        template.setAttribute('dir', 'rtl');
        template.innerHTML = `
            <header class="financial-print-header student-list-pdf-header header-box print-header-card">
                <div class="student-list-pdf-brand">
                    <span class="student-list-pdf-logo" aria-hidden="true">
                        <i class="fas ${esc(localStorage.getItem('academy_icon_class') || 'fa-graduation-cap')}"></i>
                    </span>
                    <div>
                        <strong>نظام إدارة الطلاب</strong>
                        <span class="student-list-pdf-teacher">أستاذ / ${esc(teacherName)}</span>
                    </div>
                </div>
                <h1 class="print-header-title">تقرير المتابعة المالية</h1>
                <div class="financial-print-meta student-list-pdf-meta info-bar print-report-meta">
                    <div>التاريخ: <strong>${esc(fullDateText)}</strong></div>
                    <div>الوقت: <strong>${esc(timeText)}</strong></div>
                    <div>الفترة المحددة: <strong>${esc(rangeText)}</strong></div>
                </div>
            </header>

            <div class="financial-print-filter-banner student-list-pdf-section-banner banner print-filter-banner">
                <span class="student-list-pdf-banner-title">تقرير المتابعة المالية</span>
                <span class="student-list-pdf-filter-badge badge">المرحلة / الصف: ${esc(scopeLabel)}</span>
            </div>

            <section class="financial-print-kpis print-kpi-grid" aria-label="ملخص التقرير المالي">
                <div class="financial-print-kpi print-kpi-card">
                    <span>الإيرادات</span>
                    <strong>${money(data.totalRevenue)}</strong>
                </div>
                <div class="financial-print-kpi print-kpi-card">
                    <span>الأرباح</span>
                    <strong>${money(data.totalProfit)}</strong>
                </div>
                <div class="financial-print-kpi print-kpi-card">
                    <span>الرصيد</span>
                    <strong>${money(data.currentBalance)}</strong>
                </div>
                <div class="financial-print-kpi print-kpi-card">
                    <span>واجب السداد</span>
                    <strong>${money(debt.totalNet)}</strong>
                    <small>${esc(debt.currentMonthName)} + مقدم ${esc(debt.nextMonthName)}</small>
                </div>
            </section>

            <section class="financial-print-section">
                <h2 class="financial-print-section-title">سجل الإيرادات والمدفوعات <span>(${ledger.length})</span></h2>
                <table class="financial-print-table student-list-pdf-table print-financial-table">
                    <thead>
                        <tr>
                            <th>اسم الطالب</th>
                            <th>المرحلة</th>
                            <th>الصف</th>
                            <th>نوع المعاملة</th>
                            <th>المبلغ</th>
                            <th>تاريخ السداد</th>
                            <th>التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody>${ledgerRows}</tbody>
                </table>
            </section>

            ${expenseSection}

            <footer class="financial-print-footer">
                <div>نظام إدارة الطلاب الذكي © ${exportDate.getFullYear()} - DEVELOPED BY MAZEN AHMED</div>
            </footer>
        `;
        return template;
    },

    printFinancialReport() {
        const template = this.buildFinancialPrintTemplate();

        // Isolate report styles from the application so browser printing can
        // produce a native, vector PDF without canvas rendering artifacts.
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'fixed';
        printIframe.style.right = '0';
        printIframe.style.bottom = '0';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = '0';

        document.body.appendChild(printIframe);

        const pri = printIframe.contentWindow || printIframe.contentDocument;
        const doc = printIframe.contentDocument || printIframe.contentWindow.document;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>تقرير المتابعة المالية</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;700&display=swap');
                    @page {
                        size: A4 portrait;
                        margin: 5mm;
                    }
                    * {
                        box-sizing: border-box !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        font-family: 'Cairo', Arial, sans-serif;
                        font-size: 10px;
                    }
                    .financial-print-template {
                        width: 100% !important;
                        padding: 5mm !important;
                    }
                    .print-header-card {
                        border: 2px solid #6b21a8;
                        border-radius: 8px;
                        padding: 10px;
                        text-align: center;
                        margin-bottom: 10px;
                    }
                    .student-list-pdf-brand {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        color: #6b21a8;
                    }
                    .print-header-title {
                        color: #581c87;
                        font-size: 16px;
                        margin: 5px 0;
                    }
                    .print-report-meta {
                        display: flex;
                        justify-content: space-around;
                        border-top: 1px dashed #d8b4fe;
                        padding-top: 5px;
                        font-size: 9px;
                    }
                    .print-filter-banner {
                        background: #6b21a8;
                        color: #fff;
                        padding: 6px;
                        border-radius: 6px;
                        text-align: center;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    .print-kpi-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 8px;
                        margin-bottom: 10px;
                    }
                    .print-kpi-card {
                        border: 1px solid #c084fc;
                        background: #faf5ff;
                        padding: 6px;
                        text-align: center;
                        border-radius: 6px;
                    }
                    .print-kpi-card span { font-size: 9px; color: #6b21a8; }
                    .print-kpi-card strong { font-size: 13px; color: #581c87; display: block; }
                    .financial-print-section { margin-bottom: 10px; }
                    .financial-print-section-title { font-size: 12px; color: #581c87; margin-bottom: 4px; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #e9d5ff;
                        padding: 4px 6px;
                        text-align: center;
                        font-size: 9px;
                    }
                    th { background: #f3e8ff; color: #581c87; }
                    tr:nth-child(even) { background: #fcfafc; }
                    tr { page-break-inside: avoid; }
                    .financial-print-footer {
                        margin-top: 10px;
                        text-align: center;
                        font-size: 9px;
                        color: #6b21a8;
                        border-top: 1px dashed #d8b4fe;
                        padding-top: 5px;
                    }
                </style>
            </head>
            <body>
                ${template.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            pri.focus();
            pri.print();
            setTimeout(() => { printIframe.remove(); }, 1000);
        }, 500);

        return true;
    },

    async downloadFinancialReportPDF() {
        if (typeof window.html2canvas !== 'function') {
            alert('مكتبة رسم PDF غير محملة.');
            return false;
        }

        const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF
            ? window.jspdf.jsPDF
            : window.jsPDF;

        if (typeof jsPDFConstructor !== 'function') {
            alert('مكتبة إنشاء PDF غير محملة.');
            return false;
        }

        const template = this.buildFinancialPrintTemplate();
        const filename = `تقرير_المتابعة_المالية_${new Date().toISOString().slice(0, 10)}.pdf`;

        // Create the render host using the same visible, isolated A4 strategy
        // used by the working Student Codes PDF export.
        const pdfHost = document.createElement('div');
        pdfHost.id = 'financial-codes-pdf-render-host';
        pdfHost.className = 'print-report-container';
        pdfHost.dir = 'rtl';
        pdfHost.setAttribute('aria-hidden', 'true');
        pdfHost.style.cssText = [
            'position: absolute',
            'left: 0',
            'top: 0',
            'width: 794px',
            'min-height: 1122px',
            'display: block',
            'visibility: visible',
            // The temporary host should never flash over the live report.
            // Its html2canvas clone is made opaque in onclone below.
            'opacity: 0',
            'overflow: visible',
            'background: #ffffff',
            'color: #000000',
            'z-index: 2147483647',
            'pointer-events: none',
            'direction: rtl',
            'text-align: right',
            'font-family: Cairo, Tajawal, Arial, sans-serif'
        ].join(';');

        // Reset the generated template inside the render host.
        // .financial-print-template is hidden on screen with !important so
        // it never occupies the app layout. Override that rule only for this
        // detached export host; otherwise html2canvas captures an empty node.
        template.style.setProperty('display', 'block', 'important');
        template.style.visibility = 'visible';
        template.style.width = '100%';

        pdfHost.appendChild(template);
        document.body.appendChild(pdfHost);

        try {
            if (window.ModalManager) window.ModalManager.open('printLoadingModal');

            // Wait for fonts and DOM reflow before rasterizing the report.
            await new Promise(resolve => setTimeout(resolve, 300));
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }
            if (window.PrintEngine?.waitForArabicFonts) {
                await window.PrintEngine.waitForArabicFonts();
            }
            await new Promise(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            }));

            const canvas = await window.html2canvas(pdfHost, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                logging: false,
                letterRendering: false,
                foreignObjectRendering: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: 794,
                backgroundColor: '#ffffff',
                onclone: clonedDocument => {
                    const clonedHost = clonedDocument.getElementById(
                        'financial-codes-pdf-render-host'
                    );
                    const clonedTemplate = clonedDocument.getElementById(
                        'financialPrintTemplate'
                    );

                    if (clonedHost) {
                        clonedHost.style.display = 'block';
                        clonedHost.style.visibility = 'visible';
                        clonedHost.style.opacity = '1';
                        clonedHost.style.position = 'absolute';
                        clonedHost.style.left = '0';
                        clonedHost.style.top = '0';
                        clonedHost.style.zIndex = '0';
                        clonedHost.style.direction = 'rtl';
                        clonedHost.style.fontFamily =
                            "'Cairo', 'Tajawal', Arial, sans-serif";
                    }

                    if (clonedTemplate) {
                        clonedTemplate.style.setProperty(
                            'display',
                            'block',
                            'important'
                        );
                        clonedTemplate.style.visibility = 'visible';
                        clonedTemplate.style.width = '100%';
                        clonedTemplate.style.height = 'auto';
                        clonedTemplate.style.minHeight = '0';
                        clonedTemplate.style.direction = 'rtl';
                        clonedTemplate.style.fontFamily =
                            "'Cairo', 'Tajawal', Arial, sans-serif";
                        clonedTemplate.style.letterSpacing = 'normal';
                        clonedTemplate.style.wordSpacing = 'normal';
                    }
                }
            });

            if (!canvas || !canvas.width || !canvas.height) {
                throw new Error('فشل إنشاء اللوحة (Canvas Blank).');
            }

            const pdf = new jsPDFConstructor({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });

            // Slice the browser-rendered bitmap into A4 pages. The PDF
            // receives images only, preserving the browser's Arabic shaping.
            const pageWidthMm = 210;
            const pageHeightMm = 297;
            const sourcePageHeight = Math.max(
                1,
                Math.floor(canvas.width * pageHeightMm / pageWidthMm)
            );

            let offsetY = 0;
            let pageIndex = 0;
            while (offsetY < canvas.height) {
                const sliceHeight = Math.min(
                    sourcePageHeight,
                    canvas.height - offsetY
                );
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeight;
                const pageContext = pageCanvas.getContext('2d');
                pageContext.fillStyle = '#ffffff';
                pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                pageContext.drawImage(
                    canvas,
                    0,
                    offsetY,
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    pageCanvas.width,
                    pageCanvas.height
                );

                if (pageIndex > 0) pdf.addPage('a4', 'portrait');
                pdf.addImage(
                    pageCanvas.toDataURL('image/jpeg', 0.98),
                    'JPEG',
                    0,
                    0,
                    pageWidthMm,
                    sliceHeight * pageWidthMm / canvas.width,
                    undefined,
                    'FAST'
                );

                pageCanvas.width = 0;
                pageCanvas.height = 0;
                offsetY += sliceHeight;
                pageIndex += 1;
            }
            pdf.save(filename);

            if (window.showToast) {
                window.showToast('تم تنزيل التقرير المالي بنجاح', 'success');
            }

            return true;
        } catch (error) {
            console.error('Financial PDF Download error:', error);
            alert('تعذر تنزيل PDF: ' + (error && error.message ? error.message : error));
            return false;
        } finally {
            if (pdfHost && pdfHost.parentNode) pdfHost.remove();
            if (window.ModalManager) window.ModalManager.close('printLoadingModal');
        }
    },

    renderReport() {
        const view = this.$('financialReportsView');
        if (view) {
            view.classList.remove('financial-report-refresh');
            void view.offsetWidth;
            view.classList.add('financial-report-refresh');
            clearTimeout(this._refreshTimer);
            this._refreshTimer = setTimeout(
                () => view.classList.remove('financial-report-refresh'),
                420
            );
        }

        const d = this.compute();
        this.renderKpis(d);

        const isFiltered = this.isStageOrClassFiltered();
        const balanceSubtext = this.$('currentBalanceSubtext') || this.$('kpiBalanceSub');
        if (balanceSubtext) {
            balanceSubtext.textContent = isFiltered
                ? 'الرصيد الصافي (غير شامل المصروفات الشخصية)'
                : 'الإيرادات - المصروفات';
        }

        const expensesCard = this.$('personalExpensesKpiCard') ||
            document.querySelector('.expenses-kpi-card') ||
            document.querySelector('.kpi-card.expense');
        if (expensesCard) {
            expensesCard.style.opacity = isFiltered ? '0.5' : '1';
            expensesCard.style.pointerEvents = isFiltered ? 'none' : 'auto';
            expensesCard.setAttribute('aria-disabled', String(isFiltered));

            const expenseValue = expensesCard.querySelector('strong');
            if (expenseValue) {
                expenseValue.textContent = isFiltered
                    ? 'مستبعدة بالفلترة'
                    : (this.$('kpiExpense')?.textContent || expenseValue.textContent);
            }

            const expenseSubtext = expensesCard.querySelector('.kpi-sub');
            if (expenseSubtext && isFiltered) {
                expenseSubtext.textContent = 'لا تنتمي لمرحلة أو صف محدد';
            }
        }

        const expensesSection = this.$('financialExpensesSection') ||
            document.querySelector('.expenses-table-section') ||
            this.$('expensesTable')?.closest('.rep-panel');
        if (expensesSection) {
            expensesSection.style.display = isFiltered ? 'none' : '';
            expensesSection.setAttribute('aria-hidden', String(isFiltered));
        }

        this.renderBarChart(d);
        this.renderPieChart(d);
        this.renderAll();
    },

    loadReportFilterSelections() {
        if (this._selectedStage === null) {
            this._selectedStage = localStorage.getItem('financial_report_stage_filter') || 'all';
        }
        if (this._selectedClass === null) {
            this._selectedClass = localStorage.getItem('financial_report_class_filter') || 'all';
        }
    },

    persistReportFilterSelections() {
        localStorage.setItem('financial_report_stage_filter', this._selectedStage || 'all');
        localStorage.setItem('financial_report_class_filter', this._selectedClass || 'all');
    },

    populateFilters() {
        const stageFilter = this.$('reportStageFilter');
        const classFilter = this.$('reportClassFilter');
        if (!stageFilter) return;

        this.loadReportFilterSelections();
        const selectedStages = window.Auth.getSelectedStages();
        const selectedGrades = window.Auth.getSelectedGrades();

        stageFilter.innerHTML = '<option value="all">كل المراحل</option>';
        selectedStages.forEach(s => {
            stageFilter.innerHTML += `<option value="${s}">${window.STUDENT_CONFIG.stageData[s].name}</option>`;
        });
        stageFilter.value = selectedStages.includes(this._selectedStage)
            ? this._selectedStage
            : 'all';
        this._selectedStage = stageFilter.value;

        const updateClasses = () => {
            const currentStage = stageFilter.value;
            classFilter.innerHTML = '<option value="all">كل الصفوف</option>';
            selectedStages.forEach(stage => {
                if (currentStage !== 'all' && currentStage !== stage) return;
                const grades = selectedGrades[stage] || [];
                grades.forEach(g => {
                    classFilter.innerHTML += `<option value="${stage}_${g}">${window.STUDENT_CONFIG.stageData[stage].name} - ${window.STUDENT_CONFIG.gradeNames[stage][g - 1]}</option>`;
                });
            });

            const availableClassValues = Array.from(classFilter.options).map(option => option.value);
            classFilter.value = availableClassValues.includes(this._selectedClass)
                ? this._selectedClass
                : 'all';
            this._selectedClass = classFilter.value;
            this.persistReportFilterSelections();
        };

        if (!stageFilter.dataset.listenerAttached) {
            stageFilter.dataset.listenerAttached = 'true';
            stageFilter.onchange = () => {
                this._selectedStage = stageFilter.value;
                this._selectedClass = 'all';
                updateClasses();
                this.renderReport();
            };
            classFilter.onchange = () => {
                this._selectedClass = classFilter.value;
                this.persistReportFilterSelections();
                this.renderReport();
            };
        }
        updateClasses();
    },

    setRange(range) {
        this._range = range;

        const rangeDates = this.$('rangeDates');
        if (rangeDates) {
            rangeDates.style.display = range === 'custom' ? 'flex' : 'none';
        }

        document.querySelectorAll('#dateRangeSwitch .range-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });

        this.renderReport();
    },

    resetFilters() {
        this._range = 'today';
        this._fromDate = null;
        this._toDate = null;
        this._selectedStage = 'all';
        this._selectedClass = 'all';
        this.persistReportFilterSelections();

        ['rangeFrom', 'rangeTo'].forEach(id => {
            const input = this.$(id);
            if (input) input.value = '';
        });

        const stageFilter = this.$('reportStageFilter');
        const classFilter = this.$('reportClassFilter');
        if (stageFilter) stageFilter.value = 'all';
        if (classFilter) classFilter.value = 'all';

        this.populateFilters();
        this.setRange('today');
    },

    setupListeners() {
        if (this.initialized) return;
        this.initialized = true;

        document.getElementById('dateRangeSwitch').querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setRange(btn.dataset.range));
        });
        this.$('rangeFrom').addEventListener('change', e => {
            this._fromDate = e.target.value || null;
            this.setRange('custom');
        });
        this.$('rangeTo').addEventListener('change', e => {
            this._toDate = e.target.value || null;
            this.setRange('custom');
        });
        this.$('resetReportFilters').addEventListener('click', () => this.resetFilters());

        this.$('addExpenseBtn').addEventListener('click', () => this.openExpenseModal());
        this.$('kpiAddExpenseBtn').addEventListener('click', () => this.openExpenseModal());
        const printFinancialReportBtn = this.$('printFinancialReportBtn');
        if (printFinancialReportBtn) {
            printFinancialReportBtn.addEventListener('click', () => {
                if (window.PrintEngine?.openExportMethodModal) {
                    window.PrintEngine.openExportMethodModal('financial-reports');
                } else {
                    this.printFinancialReport();
                }
            });
        }
        this.$('cancelExpenseBtn').addEventListener('click', () => this.$('expenseModal').classList.remove('active'));
        this.$('saveExpenseBtn').addEventListener('click', () => this.saveExpense());
        this.$('expenseSearch').addEventListener('input', () => this.renderExpenses());
        this.$('ledgerSearch').addEventListener('input', () => this.renderLedger());
        this.$('expenseCategoryFilter').addEventListener('change', () => this.renderExpenses());
        this.$('expenseReceipt').addEventListener('change', e => this.handleReceipt(e.target.files[0]));

        document.getElementById('expensesTable').addEventListener('click', e => {
            const edit = e.target.closest('[data-edit]');
            const del = e.target.closest('[data-del]');
            const rec = e.target.closest('.receipt-view');
            if (edit) this.openExpenseModal(edit.dataset.edit);
            else if (del) this.deleteExpense(del.dataset.del);
            else if (rec) {
                const exp = this.expenses.find(x => x.id === rec.dataset.id);
                if (exp && exp.receipt) this.viewReceipt(exp.receipt);
            }
        });

    },

    viewReceipt(dataUrl) {
        const w = window.open('', '_blank');
        w.document.write(`<html dir="rtl"><head><title>الإيصال</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${dataUrl}" style="max-width:90vw;max-height:90vh;border-radius:8px;"></body></html>`);
    },

    openReportsView() {
        if (window.FinancialData) window.FinancialData.load();
        this.load();
        this.populateFilters();
        this.setupListeners();
        this.renderReport();
        window.Navigation.switchView('financialReports');
    }
};
