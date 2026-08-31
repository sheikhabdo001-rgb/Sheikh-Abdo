window.FinancialData = {
    standardFees: {},
    customFees: {},

    load() {
        this.standardFees = JSON.parse(localStorage.getItem('standard_fees') || '{}');
        this.customFees = JSON.parse(localStorage.getItem('custom_fees') || '{}');
    },

    save() {
        localStorage.setItem('standard_fees', JSON.stringify(this.standardFees));
        localStorage.setItem('custom_fees', JSON.stringify(this.customFees));
    },

getFee(stage, grade, month) {
        const customKey = `${stage}_${grade}_${month}`;
        const standardKey = `${stage}_${grade}`;

        if (this.customFees[customKey]) return parseFloat(this.customFees[customKey]);
        if (this.standardFees[standardKey]) return parseFloat(this.standardFees[standardKey]);

        // Fallback: try reloading from storage in case data wasn't loaded yet
        if (Object.keys(this.standardFees).length === 0) {
            this.load();
            if (this.standardFees[standardKey]) return parseFloat(this.standardFees[standardKey]);
        }

        return 0; // Default if not set
    }
};