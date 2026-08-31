/**
 * UI Rendering logic for the Smart Search Hub
 */
window.DashboardHubUI = {
    renderResultsTable(container, students, actionFilterVal) {
        if (students.length === 0) {
            container.innerHTML = `
                <div class="hub-no-results">
                    <i class="fas fa-user-slash"></i>
                    <p>عذراً، لم يتم العثور على طلاب مطابقين للبحث</p>
                </div>
            `;
            return;
        }

        const limitedResults = students.slice(0, 15);
        const realNow = new Date().getMonth();

        let html = `
            <div class="table-responsive hub-table-wrapper">
                <table class="hub-results-table">
                    <thead>
                        <tr>
                            <th>المسلسل #</th>
                            <th>كود الطالب</th>
                            <th>اسم الطالب</th>
                            <th>الصف</th>
                            <th>شهر الاستحقاق</th>
                            <th style="text-align: center;">الخيارات</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        limitedResults.forEach(student => {
            const statusData = this.getPaymentStatusData(student, realNow);
            const attendanceData = this.getAttendanceStatusData(student);
            const familyBadge = student.family_group_id ? `<span class="hub-family-badge" title="عائلة مرتبطة"><i class="fas fa-users"></i> عائلة</span>` : '';

            html += `
                <tr data-id="${student.id}" data-stage="${student.stage}" data-grade="${student.grade}">
                    <td>${student.serial}</td>
                    <td class="hub-student-code">
                        <span class="time-pill" style="font-size:0.75rem; padding:3px 9px; background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2);">${student.studentCode || student.code || '------'}</span>
                    </td>
                    <td class="hub-student-name">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <a href="#" class="clickable-student-link student-name-link" data-student-id="${student.id}" data-stage="${student.stage}" data-grade="${student.grade}" data-from-view="home" style="font-weight:800; color:inherit;">
                                    ${student.name}
                                </a>
                                <button type="button" onclick="window.DashboardHubActions.hubOpenEdit(${student.id}, '${student.stage}', ${student.grade})" 
                                        style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:0.8rem; padding:4px;" title="تعديل البيانات">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            ${familyBadge}
                        </div>
                    </td>
                    <td><span class="hub-class-badge">${student.className}</span></td>
                    <td class="hub-status-col">${statusData.statusHtml}</td>
                    <td>
                        <div class="hub-action-btns">
                            ${(actionFilterVal === 'all' || actionFilterVal === 'attendance') ? `
                                <button class="hub-quick-btn hub-btn-attendance ${(!attendanceData.activeSession || attendanceData.isAlreadyAttended) ? 'disabled' : ''}" 
                                        ${attendanceData.isAlreadyAttended ? 'style="background:var(--success-color); cursor:default;"' : ''}
                                        onclick="window.DashboardHubActions.hubQuickAttendance(this, ${student.id}, '${student.stage}', ${student.grade}, '${attendanceData.activeSession?.name || ''}')">
                                    <i class="fas ${attendanceData.isAlreadyAttended ? 'fa-check-double' : 'fa-calendar-check'}"></i> 
                                    <span>${attendanceData.isAlreadyAttended ? 'تم التحضير' : 'حضور'}</span>
                                </button>
                            ` : ''}
                            ${(actionFilterVal === 'all' || actionFilterVal === 'payment') ? `
                                <button class="hub-quick-btn ${statusData.paymentBtnClass} ${statusData.nextTargetMonth === null ? 'disabled' : ''}"
                                        onclick="window.DashboardHubActions.hubQuickPayment(this, ${student.id}, '${student.stage}', ${student.grade}, ${statusData.nextTargetMonth})">
                                    <i class="fas fa-money-bill-wave"></i> 
                                    <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                                        <span>${statusData.paymentBtnText}</span>
                                        <span style="font-size:0.65rem; opacity:0.8;">(${window.FinancialManager.getStudentFee(student, statusData.nextTargetMonth)}ج)</span>
                                    </div>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        if (students.length > 15) {
            html += `<p class="hub-more-results">يوجد ${students.length - 15} نتائج أخرى، يرجى تضييق البحث...</p>`;
        }
        container.innerHTML = html;
    },

    getPaymentStatusData(student, realNow) {
        const termSettings = window.PaymentsStore.getTermSettings(student.stage, student.grade);
        const payments = JSON.parse(localStorage.getItem(`student_payments_${student.stage}_${student.grade}_${student.id}`) || '{}');
        const termMonths = [...termSettings.firstTermMonths, ...termSettings.secondTermMonths].sort((a, b) => a - b);
        const { currentMonthInfo } = window.PaymentsStore.getCurrentMonthInfo(termSettings.firstTermMonths, termSettings.secondTermMonths);
        const startMonth = currentMonthInfo === 'first' ? termSettings.firstTermStartMonth : termSettings.secondTermStartMonth;

        const allUnpaid = termMonths.filter(m => (startMonth !== null && m >= startMonth) && payments[m] !== 'paid' && payments[m] !== 'absent');
        
        let statusHtml = '';
        let nextTargetMonth = null;
        let paymentBtnClass = '';
        let paymentBtnText = '';

        if (allUnpaid.length === 0) {
            statusHtml = '<span class="hub-paid-full"><i class="fas fa-check-double"></i> تم السداد بالكامل</span>';
            const lastPaidMonth = termMonths.filter(m => payments[m] === 'paid').pop();
            const lastIdx = termMonths.indexOf(lastPaidMonth);
            nextTargetMonth = (lastIdx !== -1 && lastIdx < termMonths.length - 1) ? termMonths[lastIdx + 1] : null;
            paymentBtnClass = 'hub-btn-advance';
            paymentBtnText = nextTargetMonth !== null ? `مقدم ${window.MONTHS[nextTargetMonth]}` : 'مكتمل';
        } else {
            const arrears = allUnpaid.filter(m => m < realNow);
            const isCurrentUnpaid = allUnpaid.includes(realNow);
            
            if (arrears.length > 0) {
                statusHtml = `<span class="hub-month-arrears">${arrears.map(m => window.MONTHS[m]).join('، ')}</span>`;
                nextTargetMonth = arrears[0];
                paymentBtnClass = 'hub-btn-arrears';
                paymentBtnText = `سداد ${window.MONTHS[nextTargetMonth]}`;
            } else if (isCurrentUnpaid) {
                statusHtml = `<span class="hub-month-current">الشهر الحالي: ${window.MONTHS[realNow]}</span>`;
                nextTargetMonth = realNow;
                paymentBtnClass = 'hub-btn-current';
                paymentBtnText = `سداد ${window.MONTHS[realNow]}`;
            } else {
                const nextAdvance = allUnpaid[0];
                statusHtml = `<span class="hub-month-advance">المقدم: ${window.MONTHS[nextAdvance]}</span>`;
                nextTargetMonth = nextAdvance;
                paymentBtnClass = 'hub-btn-advance';
                paymentBtnText = `سداد ${window.MONTHS[nextTargetMonth]}`;
            }
        }

        return { statusHtml, nextTargetMonth, paymentBtnClass, paymentBtnText };
    },

    getAttendanceStatusData(student) {
        const activeSession = window.DashboardSessions.getClassActiveSession(student.stage, student.grade);
        const sessionText = activeSession ? `<span class="hub-active-session">${activeSession.name}</span>` : '<span class="hub-no-session">لا يوجد</span>';
        let isAlreadyAttended = false;
        if (activeSession) {
            const sessionInfo = window.AttendanceStore.getSessionInfo(
                student.stage,
                student.grade,
                activeSession.name
            );
            const dailyRecords = window.AttendanceStore.getAttendanceRecords(
                student.stage,
                student.grade,
                activeSession.name,
                new Date(),
                sessionInfo.id
            );
            isAlreadyAttended = dailyRecords[student.id] === 'present';
        }
        return { activeSession, sessionText, isAlreadyAttended };
    }
};
