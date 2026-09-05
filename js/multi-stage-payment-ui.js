/**
 * UI Controller for Multi-Stage Consolidated Payment Popup Modal
 */
window.MultiStagePaymentUI = {
    primaryStudent: null,
    linkedProfiles: [],
    monthIdx: null,
    paymentsRef: null,

    open(primaryStudent, linkedProfiles, monthIdx, paymentsRef) {
        this.primaryStudent = primaryStudent;
        this.linkedProfiles = linkedProfiles;
        this.monthIdx = monthIdx;
        this.paymentsRef = paymentsRef;

        this.renderModal();
        window.ModalManager.open('multiStagePaymentModal');
    },

    renderModal() {
        const container = document.getElementById('multiStagePaymentList');
        if (!container) return;

        const primaryFee = window.FinancialManager.getStudentFee(this.primaryStudent, this.monthIdx);
        
        let html = `
            <div style="padding:1.25rem; background:rgba(147,51,234,0.15); border-radius:18px; border:2px solid #9333ea; margin-bottom:1rem; display:flex; align-items:center; gap:1rem;">
                <input type="checkbox" checked disabled style="width:22px; height:22px; accent-color:#9333ea;">
                <div style="flex:1;">
                    <a href="#" class="student-name-link" data-student-id="${this.primaryStudent.id}" data-stage="${this.primaryStudent.stage}" data-grade="${this.primaryStudent.grade}" data-from-view="payments" style="font-weight:900; color:white; font-size:1.1rem;">
                        ${this.primaryStudent.name}
                    </a>
                    <span style="font-weight:900; color:white; font-size:1.1rem;">(السياق الحالي)</span>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">${this.primaryStudent.stageName} - ${this.primaryStudent.className}</div>
                </div>
                <span style="font-weight:900; color:#c084fc; font-size:1.2rem;">${primaryFee} ج.م</span>
            </div>
            <h4 style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:0.5rem; font-weight:700;"><i class="fas fa-link" style="margin-left:5px;"></i>الاشتراكات الأخرى المكتشفة:</h4>
        `;

        this.linkedProfiles.forEach((profile, idx) => {
            const fee = window.FinancialManager.getStudentFee(profile, this.monthIdx);
            html += `
                <div style="padding:1rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:15px; display:flex; align-items:center; gap:1rem; transition:all 0.3s ease;">
                    <input type="checkbox" class="multi-pay-check" id="mpc${idx}" 
                           data-stage="${profile.stage}" data-grade="${profile.grade}" data-id="${profile.id}" data-fee="${fee}"
                           style="width:20px; height:20px; accent-color:#10b981; cursor:pointer;"
                           onchange="window.MultiStagePaymentUI.updateTotal()">
                    <label for="mpc${idx}" style="flex:1; cursor:pointer; margin:0;">
                        <div style="font-weight:700; color:white;">${profile.stageName} - ${profile.className}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">تحصيل شهر ${window.MONTHS[this.monthIdx]}</div>
                    </label>
                    <span style="font-weight:800; color:#10b981;">${fee} ج.م</span>
                </div>
            `;
        });

        container.innerHTML = html;

        const confirmBtn = document.getElementById('confirmMultiStagePaymentBtn');
        if (confirmBtn) confirmBtn.onclick = () => this.confirmPayment();

        const closeBtn = document.getElementById('closeMultiStagePaymentModal');
        if (closeBtn) closeBtn.onclick = () => window.ModalManager.close('multiStagePaymentModal');

        this.updateTotal();
    },

    updateTotal() {
        const primaryFee = window.FinancialManager.getStudentFee(this.primaryStudent, this.monthIdx);
        let total = primaryFee;
        document.querySelectorAll('.multi-pay-check:checked').forEach(c => { total += parseFloat(c.dataset.fee) || 0; });
        const el = document.getElementById('multiStagePaymentTotal');
        if (el) el.textContent = `${total} ج.م`;
    },

    confirmPayment() {
        const paymentsToRecord = [{
            stage: this.primaryStudent.stage,
            grade: this.primaryStudent.grade,
            studentId: this.primaryStudent.id,
            month: this.monthIdx
        }];

        document.querySelectorAll('.multi-pay-check:checked').forEach(c => {
            paymentsToRecord.push({
                stage: c.dataset.stage,
                grade: parseInt(c.dataset.grade),
                studentId: parseInt(c.dataset.id),
                month: this.monthIdx
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

        window.ModalManager.close('multiStagePaymentModal');
        window.notify.success('تم تسجيل سداد المراحل بنجاح');
        if (this.paymentsRef) this.paymentsRef.renderPaymentsTable();
    }
};
