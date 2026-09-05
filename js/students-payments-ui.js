window.PaymentsUI = {
    updateDateDisplays() {
        const now = new Date();
        const combined = `${now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} / ${now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
        ['paymentsDateDisplay', 'monthDisplayDateDisplay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = combined;
        });
    },

    updateStartMonthDisplays(firstStart, secondStart) {
        const update = (id, monthIdx) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (monthIdx !== null) {
                el.innerHTML = `<i class="fas fa-check-circle"></i> شهر البداية: <strong>${window.MONTHS[monthIdx]}</strong>`;
                el.style.display = 'flex';
            } else { el.style.display = 'none'; }
        };
        update('firstTermStartDisplay', firstStart);
        update('secondTermStartDisplay', secondStart);
    },

    renderTable(container, students, options) {
        const { isVacation, onRegister, onShowDebt } = options;
        if (students.length === 0) {
            container.innerHTML = `<div class="placeholder-content"><i class="fas fa-user-friends"></i><p>لا يوجد طلاب مضافين حالياً</p></div>`;
            return;
        }

        const renderMonthCell = (studentId, monthIdx, payments, isDisabled = false) => {
            if (monthIdx === null) return `<span class="dev-badge locked">---</span>`;
            const status = payments[monthIdx];
            const student = students.find(s => s.id === studentId);
            const fee = student ? FinancialManager.getStudentFee(student, monthIdx) : 0;
            let cellContent = '';
            
            if (status === 'paid') {
                cellContent = `
                    <button class="paid-indicator-dot" 
                            data-id="${studentId}" 
                            data-month="${monthIdx}" 
                            title="التراجع عن السداد"></button>
                    <div class="month-status-pill paid">
                        <i class="fas fa-check-circle"></i> ${window.MONTHS[monthIdx]} (تم السداد)
                    </div>
                `;
            } else if (status === 'absent') {
                cellContent = `<div class="month-status-pill absent"><i class="fas fa-times-circle"></i> ${window.MONTHS[monthIdx]} (غائب)</div>`;
            } else {
                cellContent = `
                    <div class="payment-control-cell ${isDisabled ? 'cell-disabled' : ''}">
                        <span class="month-name-tag">${window.MONTHS[monthIdx]}</span>
                        <div class="payment-action-buttons">
                            <button class="register-payment-btn ${isDisabled ? 'btn-disabled' : 'pulse-btn'}" 
                                    data-id="${studentId}" 
                                    data-month="${monthIdx}" 
                                    data-fee="${fee}"
                                    ${isDisabled ? 'disabled' : ''}
                                    title="${isDisabled ? 'يجب سداد المؤخر أولاً' : 'تسجيل سداد'}">
                                <i class="fas fa-receipt"></i> سداد 
                                <span style="font-size:0.7rem; opacity:0.8;">(${fee}ج)</span>
                            </button>
                        </div>
                    </div>
                `;
            }
            
            return `<div class="month-cell-wrapper">${cellContent}</div>`;
        };

        const getStatusBadge = (status) => {
            switch(status) {
                case 'fully_paid': return '<span class="overall-badge success-glow">تم السداد بالكامل</span>';
                case 'arrears_only': return '<span class="overall-badge amber-glow">تم دفع المؤخر فقط</span>';
                default: return '<span class="overall-badge danger-glow">قيد الانتظار</span>';
            }
        };

        container.innerHTML = `
            <div class="table-responsive premium-ledger-container">
                <table class="payments-table premium-ledger">
                    <thead>
                        <tr>
                            <th class="col-serial">م</th>
                            <th class="col-student-code">كود الطالب</th>
                            <th class="col-student-name">اسم الطالب</th>
                            <th class="col-due">
                                <i class="fas fa-history"></i> المؤخر (Mokhar)
                            </th>
                            <th class="col-advance">
                                <i class="fas fa-fast-forward"></i> المقدم (Muqaddam)
                            </th>
                            <th class="col-overall-status">حالة السداد العامة</th>
                            <th class="col-debt-count">المديونية</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => `
                            <tr class="payment-row premium-row ${s.unpaidCount > 0 ? 'row-has-debt' : ''}" data-student-id="${s.id}">
                                <td class="col-serial">${s.serial}</td>
                                <td class="col-student-code">${s.studentCode || s.student_code || s.code || '---'}</td>
                                <td class="col-student-name">
                                    <div class="name-wrapper">
                                        <a href="#" class="clickable-student-link student-name-link" data-student-id="${s.id}" data-from-view="payments" style="color:inherit;">
                                            ${s.name}
                                        </a>
                                    </div>
                                </td>
                                <td class="col-due">
                                    ${renderMonthCell(s.id, s.mokharMonth, s.payments, false)}
                                </td>
                                <td class="col-advance">
                                    ${renderMonthCell(s.id, s.muqaddamMonth, s.payments, !s.mokharPaid)}
                                </td>
                                <td class="col-overall-status">
                                    ${getStatusBadge(s.overallStatus)}
                                </td>
                                <td class="col-debt-count">
                                    <button class="debt-count-badge ${s.unpaidCount > 0 ? 'has-debt-vibrant' : ''}" data-id="${s.id}">
                                        <span>${s.unpaidCount} شهور</span>
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelectorAll('.register-payment-btn:not(.btn-disabled)').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation();
            onRegister(String(btn.dataset.id), parseInt(btn.dataset.month, 10));
        });
        container.querySelectorAll('.debt-count-badge').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation();
            onShowDebt(parseInt(btn.dataset.id));
        });
    },

    renderDebtList(container, debtList, onPay) {
        if (debtList.length === 0) {
            container.innerHTML = '<div class="no-debt-msg"><i class="fas fa-check-double"></i> لا توجد مديونيات متأخرة</div>';
            return;
        }

        // Sort debtList by index to find the oldest month
        const sortedDebt = [...debtList].sort((a, b) => a.index - b.index);
        const oldestMonthIndex = sortedDebt[0].index;

        container.innerHTML = sortedDebt.map(debt => {
            const isLocked = debt.index !== oldestMonthIndex;
            const fee = FinancialManager.getFee(window.Students.currentStage, window.Students.currentGrade, debt.index);
            return `
                <div class="debt-item-card ${isLocked ? 'debt-locked' : ''}">
                    <div class="debt-info">
                        <i class="fas ${isLocked ? 'fa-lock' : 'fa-calendar-times'}"></i>
                        <span>شهر: <strong>${debt.name}</strong> (${fee} ج.م)</span>
                    </div>
                    <button class="pay-now-btn ${isLocked ? 'btn-disabled' : ''}" 
                            data-month="${debt.index}" 
                            ${isLocked ? 'disabled' : ''}
                            title="${isLocked ? 'يجب سداد الشهور السابقة أولاً' : 'سداد الآن'}">
                        <i class="fas ${isLocked ? 'fa-hourglass-start' : 'fa-hand-holding-usd'}"></i> 
                        ${isLocked ? 'سدد السابق' : `سداد ${fee} ج.م`}
                    </button>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.pay-now-btn:not(.btn-disabled)').forEach(btn => {
            btn.onclick = () => onPay(parseInt(btn.dataset.month));
        });
    },

    renderMonthGrid(container, currentSelection, otherSelection) {
        container.innerHTML = window.MONTHS.map((month, idx) => {
            const isSelected = currentSelection.includes(idx);
            const isDisabled = otherSelection.includes(idx);
            return `
                <div class="month-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" data-month="${idx}">
                    <i class="fas fa-calendar"></i>
                    <span>${month}</span>
                    ${isDisabled ? '<div class="locked-badge"><i class="fas fa-lock"></i></div>' : ''}
                </div>
            `;
        }).join('');
        container.querySelectorAll('.month-card:not(.disabled)').forEach(card => card.onclick = () => card.classList.toggle('selected'));
    },

    renderStartMonthGrid(container, termMonths, currentStart) {
        container.innerHTML = termMonths.map(monthIdx => `
            <div class="month-card start-month-card ${currentStart === monthIdx ? 'selected' : ''}" data-month="${monthIdx}">
                <i class="fas fa-calendar-day"></i>
                <span>${window.MONTHS[monthIdx]}</span>
            </div>
        `).join('');
        container.querySelectorAll('.start-month-card').forEach(card => card.onclick = () => {
            container.querySelectorAll('.start-month-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    },

    renderNonPayersList(container, nonPayers, options = {}) {
        const { onExpel, onPayNow } = options;
        if (nonPayers.length === 0) {
            container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-user-check"></i>
                    <p>لا يوجد طلاب متأخرون في السداد</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive non-payers-table-wrapper">
                <table class="non-payers-table">
                    <thead>
                        <tr>
                            <th class="col-serial">م</th>
                            <th class="col-name">اسم الطالب</th>
                            <th class="col-missed">الأشهر الممتنع عنها</th>
                            <th class="col-overdue">أيام التأخير</th>
                            <th class="col-expel-action" style="width: 250px;">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nonPayers.map(s => `
                            <tr class="non-payer-row" data-id="${s.id}">
                                <td class="col-serial">${s.serial}</td>
                                <td class="col-name">
                                    <a href="#" class="student-name-link" data-student-id="${s.id}" data-from-view="nonPayers">${s.name}</a>
                                </td>
                                <td class="col-missed">
                                    <div class="missed-months-container">
                                        <span class="overdue-count warning" style="margin-bottom: 5px;">${s.unpaidCount} شهور</span>
                                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                            ${s.missedMonths.map(m => `<span class="missed-month-badge">${window.MONTHS[m]}</span>`).join('')}
                                            ${s.hasUnpaidAdvance && s.advanceMonth !== null
                                                ? `<span class="missed-month-badge advance-debt-badge">مقدم (${window.MONTHS[(new Date().getMonth() + 1) % 12]}) لم يسدد</span>`
                                                : ''}
                                        </div>
                                    </div>
                                </td>
                                <td class="col-overdue">
                                    <span class="overdue-count ${s.daysOverdue > 0 ? 'warning' : ''}">${s.daysOverdue} يوم</span>
                                </td>
                                <td class="col-expel-action">
                                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                        <button class="pay-now-btn-alt" data-id="${s.id}" title="سداد الآن">
                                            <i class="fas fa-money-bill-wave"></i>
                                            <span>سداد الآن</span>
                                        </button>
                                        <button class="expel-btn" data-id="${s.id}" title="طرد الطالب من النظام">
                                            <i class="fas fa-user-slash"></i>
                                            <span>طرد</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelectorAll('.expel-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                if (!await window.confirm('هل أنت متأكد من طرد هذا الطالب نهائياً من النظام؟')) return;
                const row = btn.closest('.non-payer-row');
                row.style.animation = 'expelAnimation 0.5s ease forwards';
                setTimeout(() => {
                    onExpel(parseInt(btn.dataset.id));
                }, 500);
            };
        });

        container.querySelectorAll('.pay-now-btn-alt').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                onPayNow(parseInt(btn.dataset.id));
            };
        });
    }
};
