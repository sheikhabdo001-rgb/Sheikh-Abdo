window.PaymentsMonths = {
    parent: null,
    currentTerm: null,
    currentStartMonthTerm: null,

    init(parent) {
        this.parent = parent;
        this.setupListeners();
    },

    setupListeners() {
        const monthDisplayBtn = document.getElementById('openMonthDisplayBtn');
        if (monthDisplayBtn && !monthDisplayBtn.dataset.listenerAttached) {
            monthDisplayBtn.dataset.listenerAttached = 'true';
            monthDisplayBtn.onclick = () => this.openMonthDisplayView();
        }



        const firstTermBtn = document.getElementById('selectFirstTermBtn');
        if (firstTermBtn && !firstTermBtn.dataset.listenerAttached) {
            firstTermBtn.dataset.listenerAttached = 'true';
            firstTermBtn.onclick = () => this.openMonthSelection('first');
        }

        const secondTermBtn = document.getElementById('selectSecondTermBtn');
        if (secondTermBtn && !secondTermBtn.dataset.listenerAttached) {
            secondTermBtn.dataset.listenerAttached = 'true';
            secondTermBtn.onclick = () => this.openMonthSelection('second');
        }

        const setStartFirstBtn = document.getElementById('setStartMonthFirstBtn');
        if (setStartFirstBtn && !setStartFirstBtn.dataset.listenerAttached) {
            setStartFirstBtn.dataset.listenerAttached = 'true';
            setStartFirstBtn.onclick = () => this.openStartMonthSelection('first');
        }

        const setStartSecondBtn = document.getElementById('setStartMonthSecondBtn');
        if (setStartSecondBtn && !setStartSecondBtn.dataset.listenerAttached) {
            setStartSecondBtn.dataset.listenerAttached = 'true';
            setStartSecondBtn.onclick = () => this.openStartMonthSelection('second');
        }

        const closeMonthModal = document.getElementById('closeMonthSelection');
        if (closeMonthModal) closeMonthModal.onclick = () => ModalManager.close('monthSelectionModal');

        const saveMonthBtn = document.getElementById('saveMonthSelection');
        if (saveMonthBtn) saveMonthBtn.onclick = () => this.saveMonthSelection();

        const closeStartModal = document.getElementById('closeStartMonthModal');
        if (closeStartModal) closeStartModal.onclick = () => ModalManager.close('startMonthModal');

        const saveStartBtn = document.getElementById('saveStartMonth');
        if (saveStartBtn) saveStartBtn.onclick = () => this.saveStartMonthSelection();
    },

    openMonthDisplayView() {
        window.Navigation.switchView('monthDisplay');
        window.PaymentsUI.updateDateDisplays();
        window.PaymentsUI.updateStartMonthDisplays(this.parent.firstTermStartMonth, this.parent.secondTermStartMonth);
    },

    openMonthSelection(term) {
        this.currentTerm = term;
        document.getElementById('monthSelectionTitle').textContent = term === 'first' ? 'اختيار شهور الترم الأول' : 'اختيار شهور الترم الثاني';
        const currentSelection = term === 'first' ? this.parent.firstTermMonths : this.parent.secondTermMonths;
        const otherSelection = term === 'first' ? this.parent.secondTermMonths : this.parent.firstTermMonths;
        window.PaymentsUI.renderMonthGrid(document.getElementById('monthsGrid'), currentSelection, otherSelection);
        window.ModalManager.open('monthSelectionModal');
    },

    saveMonthSelection() {
        const selected = Array.from(document.querySelectorAll('.month-card.selected')).map(card => parseInt(card.dataset.month));
        if (this.currentTerm === 'first') this.parent.firstTermMonths = selected;
        else this.parent.secondTermMonths = selected;
        this.parent.saveMonthSelections();
        window.ModalManager.close('monthSelectionModal');
    },

    openStartMonthSelection(term) {
        this.currentStartMonthTerm = term;
        const months = term === 'first' ? this.parent.firstTermMonths : this.parent.secondTermMonths;
        const currentStart = term === 'first' ? this.parent.firstTermStartMonth : this.parent.secondTermStartMonth;
        if (months.length === 0) return alert('يرجى تحديد شهور الترم أولاً');
        document.getElementById('startMonthTitle').textContent = term === 'first' ? 'تحديد شهر بداية الترم الأول' : 'تحديد شهر بداية الترم الثاني';
        window.PaymentsUI.renderStartMonthGrid(document.getElementById('startMonthsGrid'), months, currentStart);
        window.ModalManager.open('startMonthModal');
    },

    saveStartMonthSelection() {
        const selected = document.querySelector('.start-month-card.selected');
        if (!selected) return alert('يرجى اختيار شهر البداية');
        const monthIdx = parseInt(selected.dataset.month);
        if (this.currentStartMonthTerm === 'first') this.parent.firstTermStartMonth = monthIdx;
        else this.parent.secondTermStartMonth = monthIdx;
        this.parent.saveStartMonths();
        window.PaymentsUI.updateStartMonthDisplays(this.parent.firstTermStartMonth, this.parent.secondTermStartMonth);
        window.ModalManager.close('startMonthModal');
        this.parent.renderPaymentsTable();
    }
};