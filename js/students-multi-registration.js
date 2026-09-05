/**
 * Logic for redesigned Dual-Registration Selection Popup
 */
window.MultiRegistrationUI = {
    targetType: 'main', // 'main' or 'sibling'
    targetIndex: null,  // null for main, number for siblings
    currentStage: null,
    currentGrade: null,
    tempSelection: null,

    open(type, stage, grade, index = null) {
        // Prevent event bubbling and default actions
        this.targetType = type;
        this.targetIndex = index;
        this.currentStage = stage;
        this.currentGrade = grade;

        // Safety check: only block for main student if standard stage lacks a grade
        const activeStageInfo = stage ? window.STUDENT_CONFIG.stageData[stage] : null;
        const isFlat = activeStageInfo && (activeStageInfo.isFlat || stage.startsWith('custom_'));
        
        if (type !== 'sibling' && !grade && !isFlat) {
            window.notify.warning('يرجى اختيار الصف الدراسي للطالب أولاً قبل تحديد التسجيل المزدوج.');
            return;
        }
        
        // Pre-fill tempSelection from existing data
        if (type === 'main') {
            const existing = window.StudentFormManager.mainStudentDualReg;
            this.tempSelection = existing ? `${existing.stage}|${existing.grade}|${existing.label}` : null;
        } else if (type === 'sibling' && index !== null) {
            const existing = window.StudentSiblings.siblingsList[index]?.dualStage;
            this.tempSelection = existing ? `${existing.stage}|${existing.grade}|${existing.label}` : null;
        }

        const helpText = document.getElementById('dualRegHelpText');
        const container = document.getElementById('dualRegOptionsList');
        const stageData = window.STUDENT_CONFIG.stageData;
        const selectedStages = window.Auth.getSelectedStages();
        const selectedGrades = window.Auth.getSelectedGrades();
        
        // If no stage is selected for a sibling, we assume standard-to-custom registration intent
        const isFromStandard = this.currentStage ? ['primary', 'preparatory', 'secondary'].includes(this.currentStage) : true;
        const isNoContext = !this.currentStage; 

        if (isNoContext) {
            helpText.textContent = 'اختر "المرحلة المخصصة" التي تريد ربط هذا القريب بها (تسجيل مزدوج):';
        } else if (isFromStandard) {
            helpText.textContent = 'أنت الآن في مرحلة أساسية، يمكنك الربط بـ "مرحلة مخصصة" واحدة فقط:';
        } else {
            helpText.textContent = 'أنت الآن في مرحلة مخصصة، يمكنك الربط بـ "صف دراسي أساسي\" واحد فقط:';
        }

        let html = '';
        selectedStages.forEach(stageId => {
            const data = stageData[stageId];
            const grades = selectedGrades[stageId] || [];
            const isCustom = data.isFlat || stageId.startsWith('custom_');

            // Logic mirroring main student registration
            if (isFromStandard && isCustom) {
                // Scenario A: Standard -> Custom (Dashboard default or standard sibling)
                html += this.renderOption(stageId, 1, data.name, data.icon, 'var(--primary-color)');
            } else if (!isFromStandard && !isCustom) {
                // Scenario B: Custom -> Standard (Only if the sibling is primarily in a custom course)
                grades.forEach(gIdx => {
                    const gName = window.STUDENT_CONFIG.gradeNames[stageId][gIdx - 1];
                    html += this.renderOption(stageId, gIdx, `${data.name} - ${gName}`, data.icon, 'var(--text-secondary)');
                });
            }
        });

        container.innerHTML = html || '<p style="text-align:center; padding:2rem; opacity:0.5;">لا توجد خيارات متاحة للربط المزدوج بناءً على اشتراكاتك النشطة.</p>';
        
        const closeBtn = document.getElementById('closeDualRegModal');
        if (closeBtn) closeBtn.onclick = () => window.ModalManager.close('dualRegistrationModal');

        const confirmBtn = document.getElementById('confirmDualRegBtn');
        if (confirmBtn) confirmBtn.onclick = () => this.handleConfirm();

        window.ModalManager.open('dualRegistrationModal');
    },

    renderOption(stageId, grade, label, icon, iconColor) {
        const value = `${stageId}|${grade}|${label}`;
        const isSelected = this.tempSelection === value;
        return `
            <label class="edit-grade-item" style="justify-content:space-between; cursor:pointer; padding:1rem; border-radius:15px; background:${isSelected ? 'rgba(147, 51, 234, 0.1)' : 'rgba(255,255,255,0.03)'}; border: 1.5px solid ${isSelected ? 'var(--primary-color)' : 'transparent'};">
                <div style="display:flex; align-items:center; gap:12px;">
                    <input type="radio" name="dual_reg_choice" value="${value}" 
                           onchange="window.MultiRegistrationUI.tempSelection = this.value"
                           ${isSelected ? 'checked' : ''}
                           style="width:20px; height:20px; accent-color:var(--primary-color);">
                    <span style="font-weight:700; color:${isSelected ? 'white' : 'inherit'};">${label}</span>
                </div>
                <i class="fas ${icon}" style="color:${iconColor}; font-size:1.2rem;"></i>
            </label>
        `;
    },

    handleConfirm() {
        if (!this.tempSelection) {
            window.notify.warning('يرجى اختيار مسار واحد للربط أو إغلاق النافذة');
            return;
        }

        const [stage, grade, label] = this.tempSelection.split('|');
        const selectionData = { stage, grade: parseInt(grade), label };

        if (this.targetType === 'main') {
            window.StudentFormManager.mainStudentDualReg = selectionData;
            window.StudentFormManager.updateDualRegBadge();
        } else if (this.targetType === 'sibling' && this.targetIndex !== null) {
            window.StudentSiblings.updateSiblingDualReg(this.targetIndex, selectionData);
        }

        window.ModalManager.close('dualRegistrationModal');
    }
};