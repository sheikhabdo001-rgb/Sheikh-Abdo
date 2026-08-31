// Annual Mass Promotion Module (النقل العام السنوي)
window.AnnualTransfer = {
    countdownTimer: null,

    init() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#createAnnualPromotionBtn')) {
                this.openConfirmationModal();
            }
            if (e.target.closest('#confirmPromotionBtn')) {
                this.execute();
            }
        });
    },

    openConfirmationModal() {
        window.ModalManager.open('annualPromotionModal');
        this.startCountdown();
    },

    startCountdown() {
        const countdownEl = document.getElementById('promotionCountdown');
        const confirmBtn = document.getElementById('confirmPromotionBtn');
        if (!countdownEl || !confirmBtn) return;

        let remaining = 10;

        // Reset button + countdown state
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.4';
        confirmBtn.style.cursor = 'not-allowed';
        countdownEl.classList.remove('ready');
        countdownEl.textContent = `يرجى الانتظار (${remaining}) ثوانٍ للتأكيد...`;

        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        this.countdownTimer = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                countdownEl.textContent = 'يمكنك الآن تأكيد عملية النقل السنوي.';
                countdownEl.classList.add('ready');
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            } else {
                countdownEl.textContent = `يرجى الانتظار (${remaining}) ثوانٍ للتأكيد...`;
            }
        }, 1000);
    },

    // Step A: Generate automatic JSON backup + local download + history entry
    createBackup() {
        const appData = window.BackupManager.getAppData();
        const jsonString = JSON.stringify(appData);

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        let hh = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const period = hh >= 12 ? 'م' : 'ص';
        hh = String(hh % 12 || 12).padStart(2, '0');

        const filename = `نقل عام بتاريخ - ${dd}/${mm}/${yyyy} (${hh}:${minutes} ${period}).json`;

        window.BackupManager.downloadFile(jsonString, filename);
        window.BackupManager.saveToHistory(jsonString, filename);
        return filename;
    },

    // Step B: Mass promotion across educational stages
    promoteStudents() {
        const standard = { primary: 6, preparatory: 3, secondary: 3 };

        // Snapshot current rosters (deep copy)
        const roster = {};
        Object.keys(standard).forEach(stage => {
            for (let g = 1; g <= standard[stage]; g++) {
                roster[`${stage}_${g}`] = window.StudentStore.getStudents(stage, g).map(s => ({ ...s }));
            }
        });

        // --- Primary: clear grade 1; shift g -> g+1; 6th primary flows to 1st prep ---
        window.StudentStore.saveStudents('primary', 1, []);
        for (let g = 1; g <= 5; g++) {
            window.StudentStore.saveStudents('primary', g + 1, roster[`primary_${g}`]);
        }

        // --- Preparatory: 1st prep = old 6th primary; shift g -> g+1; 3rd prep flows to 1st secondary ---
        window.StudentStore.saveStudents('preparatory', 1, roster['primary_6']);
        for (let g = 1; g <= 2; g++) {
            window.StudentStore.saveStudents('preparatory', g + 1, roster[`preparatory_${g}`]);
        }

        // --- Secondary: 1st secondary = old 3rd prep; shift g -> g+1; 3rd secondary graduates ---
        window.StudentStore.saveStudents('secondary', 1, roster['preparatory_3']);
        for (let g = 1; g <= 2; g++) {
            window.StudentStore.saveStudents('secondary', g + 1, roster[`secondary_${g}`]);
        }

        // Archive graduates (old 3rd secondary)
        const graduates = roster['secondary_3'];
        this.archiveGraduates(graduates);

        window.StudentStore.clearCache();
        return graduates.length;
    },

    archiveGraduates(graduates) {
        if (!graduates || !graduates.length) return;
        const archived = JSON.parse(localStorage.getItem('graduated_students') || '[]');
        archived.push({
            teacherId: window.TenantStore?.getCurrentTeacherId(),
            promotionDate: new Date().toISOString(),
            students: graduates.map(student => ({
                ...student,
                teacherId: window.TenantStore?.getCurrentTeacherId()
            }))
        });
        localStorage.setItem('graduated_students', JSON.stringify(archived));
    },

    execute() {
        window.ModalManager.close('annualPromotionModal');
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        // Step A: backup
        const filename = this.createBackup();

        // Step B: promote
        const graduatesCount = this.promoteStudents();

        // Refresh open views
        if (window.Students && window.Students.loadStudentsData) window.Students.loadStudentsData();
        if (window.BackupManager && window.BackupManager.renderHistory) window.BackupManager.renderHistory();

        window.notify.success(`تم النقل العام بنجاح! تم إنشاء النسخة الاحتياطية وتحميلها: ${filename}`);
        if (graduatesCount > 0) {
            window.notify.warning(`تم تخريج ${graduatesCount} طالباً من الصف الثالث الثانوي وأرشفتهم تلقائياً.`);
        }
    }
};

window.AnnualTransfer.init();
