// UI rendering specifically for Student Profile Detail Page
window.ProfileUI = {
    escapeHTML(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    renderProfileHeader(container, student, stageName, gradeName) {
        const joinDate = student.createdAt ? window.AppUtils.formatFullDateTime(student.createdAt) : 'غير مسجل';
        
        container.innerHTML = `
            <div class="profile-header-content">
                <div class="profile-avatar-box">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <div class="profile-main-data">
                    <div style="display:flex; align-items:center; gap:15px; margin-bottom:10px;">
                        <h2 class="profile-name-title">${student.name}</h2>
                        <span class="profile-code-badge">${student.studentCode || '------'}</span>
                    </div>
                    <div class="profile-meta-grid">
                        <div class="meta-item"><i class="fas fa-layer-group"></i> <span>المرحلة:</span> <strong>${stageName} - ${gradeName}</strong></div>
                        <div class="meta-item"><i class="fas fa-calendar-alt"></i> <span>تاريخ الانضمام:</span> <strong>${joinDate}</strong></div>
                    </div>
                </div>
                <div class="profile-contact-data">
                    <div class="contact-pill"><i class="fas fa-phone-alt"></i> <span>هاتف الطالب:</span> <strong>${student.phone || '---'}</strong></div>
                    <div class="contact-pill"><i class="fas fa-user-shield"></i> <span>هاتف ولي الأمر:</span> <strong>${student.parentPhone || '---'}</strong></div>
                </div>
            </div>
        `;
    },

    renderStudentProfileHistory(container, history, options = {}) {
        const { searchQuery = '', statusFilter = '' } = options;
        
        let filtered = [...history];
        if (statusFilter) filtered = filtered.filter(h => h.status === statusFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(h => h.date.toLowerCase().includes(q) || h.dayName.toLowerCase().includes(q));
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-calendar-xmark"></i>
                    <p>لا توجد سجلات حضور مطابقة للبحث</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="attendance-table profile-history-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">م</th>
                            <th>تاريخ الجلسة</th>
                            <th>اليوم</th>
                            <th>الوقت</th>
                            <th>اسم المجموعة / الحصة</th>
                            <th style="width: 140px;">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map((h, idx) => {
                            const dateObj = new Date(h.timestamp || h.date);
                            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const formattedTime = window.AppUtils.formatTime12h(dateObj);

                            return `
                            <tr class="profile-row-${h.status}">
                                <td class="col-id-bold">${idx + 1}</td>
                                <td class="col-date">${formattedDate}</td>
                                <td class="col-day">${h.dayName}</td>
                                <td class="col-time">${formattedTime}</td>
                                <td><span class="hub-class-badge" style="background:rgba(255,255,255,0.05); color:white;">${h.groupName || '---'}</span></td>
                                <td class="col-status">
                                    <span class="status-badge-vibrant ${h.status === 'present' ? 'badge-present' : 'badge-absent'}">
                                        <i class="fas ${h.status === 'present' ? 'fa-check' : 'fa-times'}"></i>
                                        <span>${h.status === 'present' ? 'حاضر' : 'غائب'}</span>
                                    </span>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFinancialLedger(container, student, stage, grade, options = {}) {
        const { statusFilter = '' } = options;
        const termSettings = window.PaymentsStore.getTermSettings(stage, grade);
        const termMonths = [...termSettings.firstTermMonths, ...termSettings.secondTermMonths].sort((a, b) => a - b);
        const payments = JSON.parse(localStorage.getItem(`student_payments_${stage}_${grade}_${student.id}`) || '{}');
        const paymentDates = window.PaymentsStore.getPaymentDates(stage, grade, student.id);
        const transactions = window.FinancialReportsUI?.getStudentTransactions
            ? window.FinancialReportsUI.getStudentTransactions(stage, grade, student.id)
            : [];
        const latestTransactionByMonth = new Map();
        transactions.forEach(transaction => {
            const monthKey = String(transaction.month);
            if (!latestTransactionByMonth.has(monthKey)) {
                latestTransactionByMonth.set(monthKey, transaction);
            }
        });
        const realNow = new Date().getMonth();

        if (termMonths.length === 0) {
            container.innerHTML = `<div class="placeholder-content"><i class="fas fa-money-bill-transfer"></i><p>لم يتم تحديد شهور الدراسة لهذا الصف بعد</p></div>`;
            return;
        }

        const allRows = termMonths.map(m => {
            const isPaid = payments[m] === 'paid';
            const isAbsent = payments[m] === 'absent';
            const fee = window.FinancialManager.getStudentFee({ ...student, stage, grade }, m);
            const latestTransaction = latestTransactionByMonth.get(String(m));
            const isReversed = !isPaid && latestTransaction?.type === 'reversal';

            let statusText = 'غير مدفوع';
            let statusClass = 'badge-absent';
            let paidAmount = 0;
            let remaining = fee;

            if (isPaid) {
                statusText = 'تم السداد';
                statusClass = 'badge-present';
                paidAmount = fee;
                remaining = 0;
            } else if (isReversed) {
                statusText = 'تم التراجع عن السداد';
                statusClass = 'badge-absent';
            } else if (isAbsent) {
                statusText = 'غياب شهر';
                statusClass = 'badge-absent';
                remaining = 0;
            } else if (m > realNow) {
                statusText = 'قادم';
                statusClass = '';
            }

            return {
                m,
                isPaid,
                isAbsent,
                isReversed,
                fee,
                paidAmount,
                remaining,
                statusText,
                statusClass,
                transactionDate: isPaid
                    ? (paymentDates[m] || latestTransaction?.dateTime)
                    : (isReversed ? latestTransaction?.dateTime : null)
            };
        });

        const unpaidRows = allRows.filter(row =>
            !row.isPaid &&
            !row.isAbsent &&
            row.statusText !== 'قادم'
        );
        const unpaidTotal = unpaidRows.reduce((total, row) => total + (Number(row.remaining) || 0), 0);

        let rows = [...allRows];
        // Apply filter
        if (statusFilter === 'paid') {
            rows = rows.filter(r => r.isPaid);
        } else if (statusFilter === 'due') {
            rows = rows.filter(r => !r.isPaid && !r.isAbsent && r.statusText !== 'قادم');
        }

        if (rows.length === 0) {
            container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-filter-circle-xmark"></i>
                    <p>لا توجد سجلات مالية مطابقة للبحث</p>
                </div>
            `;
            return;
        }

        const formatTransactionDate = dateValue => {
            if (!dateValue) return '---';
            const date = new Date(dateValue);
            if (Number.isNaN(date.getTime())) return '---';
            return `${date.toLocaleDateString('ar-EG')} - ${date.toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        };
        const transactionRows = transactions.map(transaction => {
            const isReversal = transaction.type === 'reversal';
            const amount = window.FinancialReportsUI.getTransactionAmount(transaction);
            const description = transaction.description ||
                (isReversal
                    ? `تراجع عن سداد شهر ${transaction.monthName}`
                    : `سداد شهر ${transaction.monthName}`);
            return `
                <tr>
                    <td>${formatTransactionDate(window.FinancialReportsUI.getTransactionDate(transaction))}</td>
                    <td style="font-weight:800;">${transaction.monthName || '---'}</td>
                    <td style="color:${isReversal ? '#ef4444' : '#10b981'}; font-weight:800;">
                        ${amount.toLocaleString()} ج.م
                    </td>
                    <td>
                        <span class="status-badge-vibrant ${isReversal ? 'badge-absent' : 'badge-present'}">
                            ${isReversal ? 'تم التراجع عن السداد' : 'تم السداد'}
                        </span>
                    </td>
                    <td>${this.escapeHTML(description)}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1rem;">
                <div class="profile-finance-summary">
                    <strong>إجمالي المستحقات</strong>
                    <span>${unpaidTotal.toLocaleString()} ج.م</span>
                </div>
                <div class="profile-finance-summary">
                    <strong>الشهور غير المسددة</strong>
                    <span>${unpaidRows.length}</span>
                </div>
            </div>
            <div class="table-responsive">
                <table class="attendance-table profile-history-table">
                    <thead>
                        <tr>
                            <th>الشهر المستحق</th>
                            <th>قيمة الاشتراك</th>
                            <th>المبلغ المدفوع</th>
                            <th>المتبقي / المستحقات</th>
                            <th>حالة السداد</th>
                            <th>تاريخ السداد</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td style="font-weight:800;">${window.MONTHS[r.m]}</td>
                                <td>${r.fee} ج.م</td>
                                <td style="color:${r.isPaid ? '#10b981' : 'inherit'}">${r.paidAmount} ج.م</td>
                                <td style="color:${r.remaining > 0 ? '#ef4444' : 'inherit'}">${r.remaining} ج.م</td>
                                <td>
                                    <span class="status-badge-vibrant ${r.statusClass}">
                                        <span>${r.statusText}</span>
                                    </span>
                                </td>
                                <td style="font-size:0.8rem; color:var(--text-secondary);">${formatTransactionDate(r.transactionDate)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${transactions.length ? `
                <div class="table-responsive" style="margin-top:1.5rem;">
                    <h3 style="margin:0 0 0.75rem; color:var(--text-primary);">سجل حركات السداد</h3>
                    <table class="attendance-table profile-history-table">
                        <thead>
                            <tr>
                                <th>التاريخ والوقت</th>
                                <th>الشهر</th>
                                <th>المبلغ</th>
                                <th>الحالة</th>
                                <th>التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody>${transactionRows}</tbody>
                    </table>
                </div>
            ` : ''}
        `;
    },

    getExamLedgerRows(studentId, stage, grade) {
        if (!window.ExamsData) return [];

        const rows = [];
        [1, 2].forEach(term => {
            const columns = window.ExamsData.loadExamColumns(stage, grade, term) || [];
            const grades = window.ExamsData.getGrades(stage, grade, term) || {};
            const studentGrades = grades[studentId] || {};

            columns.forEach((exam, examIndex) => {
                const raw = studentGrades[examIndex];
                const examConfig = typeof exam === 'string' ? { name: exam } : (exam || {});
                const maxScore = Number(examConfig.totalScore) > 0 ? Number(examConfig.totalScore) : 100;
                const objectValue = raw && typeof raw === 'object' ? raw : null;
                const rawScore = objectValue ? (objectValue.score ?? objectValue.value) : raw;
                const hasScore = rawScore !== undefined && rawScore !== null && rawScore !== '';
                const explicitlyAbsent = objectValue && (objectValue.status === 'absent' || objectValue.attended === false);
                const present = hasScore && !explicitlyAbsent;
                const numericScore = present && !isNaN(Number(rawScore))
                    ? Math.max(0, Math.min(Number(rawScore), maxScore))
                    : 0;
                const estimate = window.ExamsGradesUI
                    ? window.ExamsGradesUI.getEstimate(numericScore, maxScore)
                    : { text: 'ضعيف', class: 'est-fail' };

                rows.push({
                    term,
                    title: examConfig.name || `امتحان ${rows.length + 1}`,
                    score: numericScore,
                    maxScore,
                    present,
                    assessment: present ? estimate.text : '---',
                    assessmentClass: present ? estimate.class : 'est-absent'
                });
            });
        });

        return rows.map((row, index) => ({ ...row, idx: index + 1 }));
    },

    renderExamGradesLedger(container, studentId, stage, grade, options = {}) {
        if (!container) return;
        const statusFilter = options.statusFilter || '';
        let rows = this.getExamLedgerRows(studentId, stage, grade);

        if (statusFilter === 'present') rows = rows.filter(row => row.present);
        if (statusFilter === 'absent') rows = rows.filter(row => !row.present);
        rows = rows.map((row, index) => ({ ...row, idx: index + 1 }));

        if (rows.length === 0) {
            container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-file-circle-xmark"></i>
                    <p>${statusFilter ? 'لا توجد امتحانات مطابقة للفلاتر الحالية' : 'لا توجد امتحانات مسجلة لهذا الصف بعد'}</p>
                </div>
            `;
            return;
        }

        const escape = value => this.escapeHTML(value);
        container.innerHTML = `
            <div class="table-responsive">
                <table class="attendance-table profile-history-table profile-exams-table">
                    <thead>
                        <tr>
                            <th class="exam-serial-col">م</th>
                            <th>اسم الامتحان</th>
                            <th>درجة الطالب</th>
                            <th>تقدير الطالب</th>
                            <th>حالة الامتحان</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr class="${row.present ? 'profile-row-present' : 'profile-row-absent'}">
                                <td class="col-id-bold">${row.idx}</td>
                                <td class="exam-title-cell">
                                    <span>${escape(row.title)}</span>
                                    <small>الترم ${row.term === 1 ? 'الأول' : 'الثاني'}</small>
                                </td>
                                <td class="exam-score-cell" dir="ltr">${row.score} <span>/ ${row.maxScore}</span></td>
                                <td>
                                    <span class="grade-assessment-badge ${row.assessmentClass}">${row.assessment}</span>
                                </td>
                                <td>
                                    <span class="status-badge-vibrant ${row.present ? 'badge-present' : 'badge-absent'}">
                                        <i class="fas ${row.present ? 'fa-check' : 'fa-times'}"></i>
                                        <span>${row.present ? 'حاضر' : 'غائب'}</span>
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
};
