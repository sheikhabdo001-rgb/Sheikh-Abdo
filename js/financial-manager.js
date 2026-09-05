window.FinancialManager = {
    init() {
        window.FinancialData.load();
        this.setupListeners();
    },

    getGroupPrice(stage, grade, month = null) {
        if (!window.FinancialData || !stage || grade === undefined || grade === null) {
            return 0;
        }

        const standardKey = `${stage}_${grade}`;
        const customKey = `${standardKey}_${month}`;
        const customPrice = month !== null && month !== undefined
            ? window.FinancialData.customFees?.[customKey]
            : null;
        const configuredPrice = customPrice !== undefined && customPrice !== null && customPrice !== ''
            ? customPrice
            : window.FinancialData.standardFees?.[standardKey];

        return Number(configuredPrice);
    },

    hasValidGroupPrice(stage, grade, month = null) {
        const groupPrice = this.getGroupPrice(stage, grade, month);
        return Number.isFinite(groupPrice) && groupPrice > 0;
    },

    getFee(stage, grade, month) {
        return window.FinancialData.getFee(stage, grade, month);
    },

    getStudentFee(student, month, stage = null, grade = null) {
        if (!student) return 0;
        
        // 1. Check for custom overrides
        if (student.isDualRegistered && student.customStageFee) {
            return parseFloat(student.customStageFee);
        }
        if (!student.isDualRegistered && student.customBaseFee) {
            return parseFloat(student.customBaseFee);
        }

        // 2. Fallback to system settings
        const effStage = stage ?? student.stage;
        const effGrade = grade ?? student.grade;
        return window.FinancialData.getFee(effStage, effGrade, month);
    },

    setupListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#financialConfigBtn')) {
                window.FinancialConfigUI.openConfigModal();
            }
        });

        const closeBtn = document.getElementById('closeFinancialConfig');
        if (closeBtn) closeBtn.onclick = () => ModalManager.close('financialConfigModal');

        const saveBtn = document.getElementById('saveFinancialSettings');
        if (saveBtn) saveBtn.onclick = () => window.FinancialConfigUI.savePricingSettings();


    },

    // Tombstones for refactored functions
    // removed loadFees() {}
    // removed saveFees() {}
    // removed openConfigModal() {}
    // removed renderCustomFeesForStage() {}
    // removed openCustomFeeAdder() {}
    // removed updateCustomFee() {}
    // removed removeCustomFee() {}
    // removed savePricingSettings() {}
    // removed openReportsView() {}
    // removed populateFilters() {}
    // removed renderReports() {}
};
