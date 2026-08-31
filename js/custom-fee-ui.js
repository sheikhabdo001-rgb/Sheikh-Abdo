/**
 * UI Controller for individual/sibling custom pricing modal
 */
window.CustomFeeUI = {
    targetType: 'main', // 'main' or 'sibling'
    targetIndex: null,  // null for main, number for siblings
    tempBaseFee: null,
    tempStageFee: null,
    hasDualReg: false,

    open(type, index = null) {
        this.targetType = type;
        this.targetIndex = index;
        
        let existingFees = null;
        let dualReg = null;

        if (type === 'main') {
            existingFees = window.StudentFormManager.mainStudentCustomFees;
            dualReg = window.StudentFormManager.mainStudentDualReg;
        } else if (type === 'sibling' && index !== null) {
            const sibling = window.StudentSiblings.siblingsList[index];
            existingFees = sibling?.customFees;
            dualReg = sibling?.dualStage;
        }

        this.hasDualReg = !!dualReg;
        this.tempBaseFee = existingFees?.base || '';
        this.tempStageFee = existingFees?.stage || '';

        const dualRegLabel = dualReg ? (dualReg.label || 'المسار الإضافي') : '';
        
        this.renderModal(dualRegLabel);
        window.ModalManager.open('customFeeSelectorModal');
    },

    renderModal(dualRegLabel) {
        const container = document.getElementById('customFeeFieldsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="input-group">
                <label style="font-weight:700; color:white; margin-bottom:8px; display:block;">
                    <i class="fas fa-money-bill-wave" style="color:var(--primary-color); margin-left:8px;"></i>
                    سعر الاشتراك الشهري الأساسي (جنيه):
                </label>
                <div class="fee-input-wrapper">
                    <input type="number" id="customBaseFeeInput" value="${this.tempBaseFee}" placeholder="سعر المادة/الدرس الافتراضي" 
                           style="width:100%; padding:12px; border-radius:12px; background:rgba(255,255,255,0.05); border:1.5px solid rgba(147,51,234,0.3); color:white; text-align:center; font-family:Cairo; font-weight:700;">
                </div>
            </div>

            ${this.hasDualReg ? `
                <div class="input-group" style="margin-top:1.5rem; padding-top:1.5rem; border-top:1px dashed rgba(147,51,234,0.2);">
                    <label style="font-weight:700; color:#10b981; margin-bottom:8px; display:block;">
                        <i class="fas fa-link" style="margin-left:8px;"></i>
                        سعر الاشتراك للمسار الإضافي (${dualRegLabel}):
                    </label>
                    <div class="fee-input-wrapper">
                        <input type="number" id="customStageFeeInput" value="${this.tempStageFee}" placeholder="سعر المسار الإضافي" 
                               style="width:100%; padding:12px; border-radius:12px; background:rgba(16,185,129,0.05); border:1.5px solid rgba(16,185,129,0.3); color:white; text-align:center; font-family:Cairo; font-weight:700;">
                    </div>
                </div>
            ` : ''}
            
            <p class="helper-text" style="margin-top:1rem; font-size:0.75rem; text-align:center; opacity:0.7;">
                اترك الحقل فارغاً لاستخدام السعر الافتراضي المحدد في الإعدادات المالية.
            </p>
        `;

        const confirmBtn = document.getElementById('confirmCustomFeeBtn');
        if (confirmBtn) confirmBtn.onclick = () => this.handleSave();
    },

    handleSave() {
        const baseInput = document.getElementById('customBaseFeeInput');
        const stageInput = document.getElementById('customStageFeeInput');
        
        const base = baseInput ? baseInput.value.trim() : '';
        const stage = stageInput ? stageInput.value.trim() : '';

        const fees = (base || stage) ? { base, stage } : null;

        if (this.targetType === 'main') {
            window.StudentFormManager.mainStudentCustomFees = fees;
            window.StudentFormManager.updateCustomFeeBadge();
        } else if (this.targetType === 'sibling' && this.targetIndex !== null) {
            window.StudentSiblings.updateSiblingCustomFee(this.targetIndex, fees);
        }

        window.ModalManager.close('customFeeSelectorModal');
        window.notify.success('تم حفظ تفضيلات السعر بنجاح');
    }
};