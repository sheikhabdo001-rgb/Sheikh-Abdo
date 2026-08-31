window.FinancialConfigUI = {
    openConfigModal() {
        const container = document.getElementById('pricingStagesContainer');
        const selectedStages = window.Auth.getSelectedStages();
        const selectedGrades = window.Auth.getSelectedGrades();
        
        container.innerHTML = '';

        selectedStages.forEach(stage => {
            const config = window.STUDENT_CONFIG.stageData[stage];
            const grades = selectedGrades[stage] || [];
            
            const stageDiv = document.createElement('div');
            stageDiv.className = 'pricing-stage-item';
            
            let gradeRows = grades.map(gradeIdx => {
                const gradeName = window.STUDENT_CONFIG.gradeNames[stage][gradeIdx - 1];
                const currentFee = window.FinancialData.standardFees[`${stage}_${gradeIdx}`] || '';
                return `
                    <div class="pricing-grade-row">
                        <span>${gradeName}</span>
                        <div class="fee-input-wrapper">
                            <input type="number" class="standard-fee-input" data-stage="${stage}" data-grade="${gradeIdx}" value="${currentFee}" placeholder="0">
                        </div>
                    </div>
                `;
            }).join('');

            stageDiv.innerHTML = `
                <div class="pricing-stage-header">
                    <div class="pricing-stage-info">
                        <i class="fas ${config.icon}"></i>
                        <span>${config.name}</span>
                    </div>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="pricing-grade-list">
                    ${gradeRows}
                    <button class="customize-btn" onclick="FinancialConfigUI.openCustomFeeAdder('${stage}')">
                        <i class="fas fa-calendar-plus"></i>
                        <span>تخصيص أسعار لشهور محددة</span>
                    </button>
                    <div class="custom-fees-list" id="customFeesList_${stage}"></div>
                </div>
            `;
            container.appendChild(stageDiv);
            this.renderCustomFeesForStage(stage);
        });

        window.ModalManager.open('financialConfigModal');
        window.Settings.close();
    },

    renderCustomFeesForStage(stage) {
        const listDiv = document.getElementById(`customFeesList_${stage}`);
        if (!listDiv) return;
        listDiv.innerHTML = '';

        Object.keys(window.FinancialData.customFees).forEach(key => {
            if (key.startsWith(stage)) {
                const [s, grade, month] = key.split('_');
                const gradeName = window.STUDENT_CONFIG.gradeNames[s][grade - 1];
                const monthName = window.MONTHS[month];
                listDiv.innerHTML += `
                    <div class="custom-fee-row glass-panel" style="padding: 10px; margin-top: 10px;">
                        <span style="font-size:0.8rem">${gradeName} - ${monthName}</span>
                        <div class="fee-input-wrapper">
                            <input type="number" value="${window.FinancialData.customFees[key]}" onchange="FinancialConfigUI.updateCustomFee('${key}', this.value)">
                        </div>
                        <button class="remove-custom-fee" onclick="FinancialConfigUI.removeCustomFee('${key}', '${stage}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
        });
    },

    openCustomFeeAdder(stage) {
        const modal = document.getElementById('customFeeModal');
        const gradeSelect = document.getElementById('customFeeGradeSelect');
        const monthSelect = document.getElementById('customFeeMonthSelect');
        
        const selectedGrades = window.Auth.getSelectedGrades()[stage] || [];
        gradeSelect.innerHTML = selectedGrades.map(g => `<option value="${g}">${window.STUDENT_CONFIG.gradeNames[stage][g-1]}</option>`).join('');
        monthSelect.innerHTML = window.MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
        
        document.getElementById('confirmCustomFee').onclick = () => {
            const grade = gradeSelect.value;
            const month = monthSelect.value;
            const amount = document.getElementById('customFeeAmountInput').value;
            if (!amount) return alert('يرجى إدخال المبلغ');
            
            window.FinancialData.customFees[`${stage}_${grade}_${month}`] = amount;
            this.renderCustomFeesForStage(stage);
            ModalManager.close('customFeeModal');
        };

        ModalManager.open('customFeeModal');
        document.getElementById('closeCustomFee').onclick = () => ModalManager.close('customFeeModal');
    },

    updateCustomFee(key, value) {
        window.FinancialData.customFees[key] = value;
    },

    removeCustomFee(key, stage) {
        delete window.FinancialData.customFees[key];
        this.renderCustomFeesForStage(stage);
    },

    savePricingSettings() {
        const inputs = document.querySelectorAll('.standard-fee-input');
        inputs.forEach(input => {
            const stage = input.dataset.stage;
            const grade = input.dataset.grade;
            window.FinancialData.standardFees[`${stage}_${grade}`] = input.value;
        });
        window.FinancialData.save();
        ModalManager.close('financialConfigModal');
        alert('تم حفظ الإعدادات المالية بنجاح');
    }
};