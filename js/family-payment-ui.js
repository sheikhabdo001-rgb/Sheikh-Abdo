/**
 * UI Controller for the Family Payment Popup Modal
 */
window.FamilyPaymentUI = {
    primaryStudentId: null,
    primaryStage: null,
    primaryGrade: null,
    primaryMonth: null,
    paymentsRef: null,

    open(primaryStudentId, monthIdx, stage, grade, paymentsRef) {
        this.primaryStudentId = primaryStudentId;
        this.primaryStage = stage;
        this.primaryGrade = grade;
        this.primaryMonth = monthIdx;
        this.paymentsRef = paymentsRef;

        const allStudents = window.StudentStore.getStudents(stage, grade);
        const primaryStudent = allStudents.find(s => s.id === primaryStudentId);
        if (!primaryStudent) return;

        const familyMembers = window.StudentStore.getFamilyMembers(primaryStudent.family_group_id);
        this.renderModal(primaryStudent, familyMembers, monthIdx, stage, grade);
        window.ModalManager.open('familyPaymentModal');
    },

    renderModal(primaryStudent, familyMembers, monthIdx, stage, grade) {
        const container = document.getElementById('familyPaymentList');
        if (!container) return;

        // Group family members by link_id to handle individuals with dual registration
        const personGroups = {};
        familyMembers.forEach(m => {
            const personKey = m.link_id || `unlinked_${m.id}`;
            if (!personGroups[personKey]) personGroups[personKey] = [];
            personGroups[personKey].push(m);
        });

        let html = '';
        const realNow = new Date().getMonth();

        Object.keys(personGroups).forEach((personKey, pIdx) => {
            const group = personGroups[personKey];
            const name = group[0].name;
            const isPrimaryPerson = group.some(m => m.id === primaryStudent.id && m.stage === stage && m.grade === grade);

            html += `
                <div style="margin-bottom:1.25rem; padding:1.25rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:20px;">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <i class="fas fa-user-circle" style="color:${isPrimaryPerson ? '#9333ea' : '#c084fc'}; font-size:1.8rem;"></i>
                        <a href="#" class="student-name-link" data-student-id="${group[0].id}" data-stage="${group[0].stage}" data-grade="${group[0].grade}" data-from-view="payments" style="font-weight:900; color:white; font-size:1.1rem;">
                            ${name}
                        </a>
                        ${isPrimaryPerson ? '<small style="color:var(--primary-color); opacity:0.8;">(الطالب المستهدف)</small>' : ''}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
            `;

            group.forEach((profile, mIdx) => {
                const isTheExactTarget = (profile.id === primaryStudent.id && profile.stage === stage && profile.grade === grade);
                
                const termSettings = window.PaymentsStore.getTermSettings(profile.stage, profile.grade);
                const { currentMonthInfo } = window.PaymentsStore.getCurrentMonthInfo(termSettings.firstTermMonths, termSettings.secondTermMonths);
                const startMonth = currentMonthInfo === 'first' ? termSettings.firstTermStartMonth : termSettings.secondTermStartMonth;
                const payments = JSON.parse(localStorage.getItem(`student_payments_${profile.stage}_${profile.grade}_${profile.id}`) || '{}');
                
                const targetMonth = isTheExactTarget ? monthIdx : (() => {
                    const termMonths = [...termSettings.firstTermMonths, ...termSettings.secondTermMonths].sort((a, b) => a - b);
                    const debtMonths = termMonths.filter(m => startMonth !== null && m >= startMonth && m <= realNow && payments[m] !== 'paid' && payments[m] !== 'absent');
                    return debtMonths.length > 0 ? debtMonths[0] : realNow;
                })();

                const fee = window.FinancialManager.getStudentFee(profile, targetMonth);
                const isPaid = payments[targetMonth] === 'paid';
                const hasCustomFee = (profile.isDualRegistered && profile.customStageFee) || (!profile.isDualRegistered && profile.customBaseFee);
                const isDual = !!profile.dualStage;
                
                const checkId = `pay_check_${pIdx}_${mIdx}`;
                const labelText = isDual ? `سداد الإزدواج (${profile.dualStage})` : `سداد الاشتراك الأساسي (${profile.className || profile.stageName})`;

                html += `
                    <div style="display:flex; align-items:center; gap:12px; padding:10px 15px; background:${isTheExactTarget ? 'rgba(147,51,234,0.1)' : 'rgba(255,255,255,0.02)'}; border-radius:12px; border: 1.5px solid ${isTheExactTarget ? 'rgba(147,51,234,0.3)' : 'transparent'};">
                        <input type="checkbox" class="sib-pay-check" id="${checkId}"
                               data-id="${profile.id}" data-stage="${profile.stage}" data-grade="${profile.grade}" data-month="${targetMonth}" data-fee="${fee}"
                               ${isTheExactTarget ? 'checked disabled style="opacity:0.6;"' : ''}
                               ${isPaid ? 'disabled' : ''}
                               style="width:20px; height:20px; accent-color:#10b981; cursor:pointer;"
                               onchange="window.FamilyPaymentUI.updateTotal()">
                        <label for="${checkId}" style="flex:1; cursor:${(isTheExactTarget || isPaid) ? 'default' : 'pointer'}; margin:0;">
                            <div style="font-weight:700; color:${isPaid ? 'var(--success-color)' : 'white'}; display:flex; align-items:center; gap:8px;">
                                ${labelText}
                                ${isPaid ? '<i class="fas fa-check-double" style="font-size:0.7rem;"></i>' : ''}
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-secondary);">لشهر: ${window.MONTHS[targetMonth]}</div>
                        </label>
                        <div style="text-align:left; display:flex; flex-direction:column; gap:4px;">
                            <span style="font-weight:800; color:${isPaid ? 'var(--success-color)' : '#c084fc'}; font-size:1rem; display:block;">${fee} ج.م</span>
                            ${hasCustomFee ? `<span style="font-size:0.6rem; color:#f59e0b; background:rgba(245,158,11,0.1); padding:2px 6px; border-radius:4px; font-weight:800; border:1px solid rgba(245,158,11,0.2);">سعر مخصص</span>` : ''}
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;

        const confirmBtn = document.getElementById('confirmFamilyPaymentBtn');
        if (confirmBtn) confirmBtn.onclick = () => this.confirmPayment();

        const closeBtn = document.getElementById('closeFamilyPaymentModal');
        if (closeBtn) closeBtn.onclick = () => window.ModalManager.close('familyPaymentModal');

        this.updateTotal();
    },

    updateTotal() {
        const allStudents = window.StudentStore.getStudents(this.primaryStage, this.primaryGrade);
        const primaryStudent = allStudents.find(s => s.id === this.primaryStudentId);
        
        const primaryFee = window.FinancialManager.getStudentFee(primaryStudent, this.primaryMonth);
        let total = primaryFee;
        document.querySelectorAll('.sib-pay-check:checked:not(:disabled)').forEach(c => { 
            total += parseFloat(c.dataset.fee) || 0; 
        });
        const el = document.getElementById('familyPaymentTotal');
        if (el) el.textContent = `${total} ج.م`;
    },

    confirmPayment() {
        const paymentsToRecord = [{
            stage: this.primaryStage,
            grade: this.primaryGrade,
            studentId: this.primaryStudentId,
            month: this.primaryMonth
        }];

        document.querySelectorAll('.sib-pay-check:checked:not(:disabled)').forEach(c => {
            paymentsToRecord.push({
                stage: c.dataset.stage,
                grade: parseInt(c.dataset.grade),
                studentId: parseInt(c.dataset.id),
                month: parseInt(c.dataset.month)
            });
        });

        // Validate every group before recording any payment to prevent partial transactions.
        if (!paymentsToRecord.every(payment => window.PaymentsStore.validatePaymentPrice(
            payment.stage,
            payment.grade,
            payment.month
        ))) {
            return;
        }

        paymentsToRecord.forEach(payment => {
            window.PaymentsStore.recordPayment(
                payment.stage,
                payment.grade,
                payment.studentId,
                payment.month,
                'paid'
            );
        });

        window.ModalManager.close('familyPaymentModal');
        window.notify.success('تم تسجيل سداد كافة البنود المحددة بنجاح');
        
        if (this.paymentsRef) {
            if (this.paymentsRef.renderPaymentsTable) this.paymentsRef.renderPaymentsTable();
            else if (typeof this.paymentsRef === 'function') this.paymentsRef();
        }
        
        if (document.getElementById('nonPayersView') && document.getElementById('nonPayersView').style.display !== 'none' && window.PaymentsModals) {
            window.PaymentsModals.renderNonPayersListView();
        }
    }
};
