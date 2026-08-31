window.RepeatedAbsence = {
    initialized: false,
    activeTerm: 1,
    selectedPeriod: '',
    searchQuery: '',
    pendingRestore: null,
    purgeTimer: null,
    countdownTimer: null,
    expelledFilter: 'automatic',
    skipNextAutoExpulsionCheck: false,

    init() {
        this.ensureModals();
        if (!this.initialized) {
            this.initialized = true;
            this.bindListeners();
            this.startPurgeScheduler();
        }
        window.purgeExpiredExpelledStudents?.();
        this.activeTerm = this.getDefaultTerm();
        this.render();
    },

    open() {
        window.ModalManager?.close('groupAttendanceHistoryModal');
        window.Navigation.switchView('repeatedAbsence');
    },

    getContext() {
        return {
            stage: window.GlobalStageFilter.getActiveStage(),
            grade: window.GlobalStageFilter.getActiveGrade()
        };
    },

    getDefaultTerm() {
        const preferred = Number(localStorage.getItem('preferred_exam_term'));
        if (preferred === 1 || preferred === 2) return preferred;

        const { stage, grade } = this.getContext();
        if (stage && grade && window.PaymentsStore) {
            const settings = window.PaymentsStore.getTermSettings(stage, grade);
            const current = window.PaymentsStore.getCurrentMonthInfo(
                settings.firstTermMonths,
                settings.secondTermMonths
            );
            if (current.currentMonthInfo === 'second') return 2;
        }
        return 1;
    },

    bindListeners() {
        const backBtn = document.getElementById('repeatedAbsenceBackBtn');
        if (backBtn) backBtn.onclick = () => window.Navigation.goBack();

        const archiveEntry = document.getElementById('openRepeatedAbsenceBtn');
        if (archiveEntry) archiveEntry.onclick = () => this.open();

        const expelledBtn = document.getElementById('openExpelledStudentsBtn');
        if (expelledBtn) expelledBtn.onclick = () => this.openExpelledModal();

        const settingsBtn = document.getElementById('openAbsenceSettingsBtn');
        if (settingsBtn) settingsBtn.onclick = () => this.openSettingsModal();

        const searchInput = document.getElementById('repeatedAbsenceSearchInput');
        if (searchInput) {
            searchInput.oninput = event => {
                this.searchQuery = event.target.value || '';
                this.renderTable();
            };
        }

        document.querySelectorAll('input[name="repeatedAbsenceTerm"]').forEach(input => {
            input.onchange = event => {
                this.activeTerm = Number(event.target.value) === 2 ? 2 : 1;
                localStorage.setItem('preferred_exam_term', String(this.activeTerm));
                this.selectedPeriod = '';
                this.render();
            };
        });

        const timeFilter = document.getElementById('repeatedAbsenceTimeFilter');
        if (timeFilter) {
            timeFilter.onchange = event => {
                this.selectedPeriod = event.target.value || '';
                this.renderTable();
            };
        }

        this.bindModalListeners();
    },

    bindModalListeners() {
        const modalIds = [
            'expelledStudentsModal',
            'repeatedAbsenceRestoreModal',
            'repeatedAbsenceSuccessModal',
            'absenceSettingsModal'
        ];
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.addEventListener('click', event => {
                    if (event.target === modal) {
                        window.ModalManager.close(id);
                        if (id === 'repeatedAbsenceSuccessModal') {
                            this.renderExpelledTable();
                            this.renderTable();
                        }
                    }
                });
            }
        });

        const restoreConfirm = document.getElementById('confirmRestoreExpelledStudent');
        if (restoreConfirm) restoreConfirm.onclick = () => this.confirmRestore();

        const saveSettings = document.getElementById('saveAbsenceSettingsBtn');
        if (saveSettings) saveSettings.onclick = () => this.saveSettings();

        const successClose = document.getElementById('closeRepeatedAbsenceSuccess');
        if (successClose) successClose.onclick = () => {
            window.ModalManager.close('repeatedAbsenceSuccessModal');
            this.renderExpelledTable();
            this.renderTable();
        };

        const printExpelledBtn = document.getElementById('printExpelledBtn');
        if (printExpelledBtn) printExpelledBtn.onclick = () => this.openExpelledExportOptions();
    },

    ensureModals() {
        const container = document.getElementById('modalsContainer');
        if (!container || document.getElementById('expelledStudentsModal')) return;

        container.insertAdjacentHTML('beforeend', `
            <div id="expelledStudentsModal" class="modal-overlay">
                <div class="modal-content glass-modal repeated-absence-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-slash"></i> الطلاب المطرودين</h3>
                        <div class="expelled-modal-header-actions">
                            <button id="printExpelledBtn" class="repeated-absence-print-btn" type="button">
                                <i class="fas fa-print"></i>
                                <span>طباعة</span>
                            </button>
                            <button class="close-modal-btn" type="button" aria-label="إغلاق">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div id="expelledStudentsTableContainer"></div>
                    </div>
                </div>
            </div>
            <div id="repeatedAbsenceRestoreModal" class="modal-overlay">
                <div class="modal-content glass-modal repeated-absence-confirm-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-check"></i> تأكيد إعادة الطالب</h3>
                        <button class="close-modal-btn" type="button" aria-label="إغلاق">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="repeated-absence-modal-lead">سيتم إعادة الطالب إلى القائمة بالمسلسل المحدد:</p>
                        <div id="restoreStudentDetails" class="restore-student-details"></div>
                    </div>
                    <div class="modal-footer repeated-absence-modal-actions">
                        <button type="button" class="action-btn-styled secondary close-modal-btn">إلغاء</button>
                        <button id="confirmRestoreExpelledStudent" type="button" class="login-btn">
                            <i class="fas fa-check"></i> تأكيد إعادة الطالب
                        </button>
                    </div>
                </div>
            </div>
            <div id="repeatedAbsenceSuccessModal" class="modal-overlay">
                <div class="modal-content glass-modal repeated-absence-success-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-circle-check"></i> تمت إعادة الطالب بنجاح</h3>
                        <button id="closeRepeatedAbsenceSuccess" class="close-modal-btn" type="button" aria-label="إغلاق">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="restoreSuccessDetails" class="restore-success-details"></div>
                    </div>
                    <div class="modal-footer">
                        <button id="successRestoreDoneBtn" type="button" class="login-btn">تم</button>
                    </div>
                </div>
            </div>
            <div id="absenceSettingsModal" class="modal-overlay">
                <div class="modal-content glass-modal absence-settings-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-sliders"></i> إعدادات الغياب</h3>
                        <button class="close-modal-btn" type="button" aria-label="إغلاق">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <label class="absence-settings-input-field">
                            <span>أقصى عدد مرات غياب مسموح بها</span>
                            <input id="maxAllowedAbsencesInput" type="number" min="1" max="365" step="1" inputmode="numeric">
                            <small>عند تجاوز هذا العدد يتم طرد الطالب تلقائيًا من القائمة.</small>
                        </label>
                        <label class="absence-settings-input-field">
                            <span>مهلة الاحتفاظ بالطلاب المطرودين قبل الحذف النهائي (بالأيام)</span>
                            <input id="expelledRetentionDaysInput" type="number" min="1" max="3650" step="1" inputmode="numeric">
                            <small>بعد انقضاء هذه المدة تُحذف بيانات الطالب نهائيًا من الموقع وقاعدة البيانات.</small>
                        </label>
                    </div>
                    <div class="modal-footer repeated-absence-modal-actions">
                        <button type="button" class="action-btn-styled secondary close-modal-btn">إلغاء</button>
                        <button id="saveAbsenceSettingsBtn" type="button" class="login-btn">
                            <i class="fas fa-save"></i> حفظ الإعدادات
                        </button>
                    </div>
                </div>
            </div>
        `);
        this.bindModalListeners();
        const doneBtn = document.getElementById('successRestoreDoneBtn');
        if (doneBtn) doneBtn.onclick = () => document.getElementById('closeRepeatedAbsenceSuccess')?.click();
    },

    getHistory() {
        const { stage, grade } = this.getContext();
        if (!stage || !grade) return [];
        return window.AttendanceStore.getHistory(stage, grade);
    },

    startPurgeScheduler() {
        if (this.purgeTimer) return;
        this.purgeTimer = window.setInterval(() => {
            const removed = window.purgeExpiredExpelledStudents?.() || 0;
            if (removed && document.getElementById('expelledStudentsModal')?.classList.contains('active')) {
                this.renderExpelledTable();
            }
        }, 24 * 60 * 60 * 1000);
    },

    getAbsenceSettings() {
        const { stage, grade } = this.getContext();
        return window.AttendanceStore?.getAbsenceSettings(stage, grade)
            || { maxAllowedAbsences: 4, retentionDays: 30 };
    },

    getAbsenceThreshold() {
        return Math.max(1, Math.ceil(this.getAbsenceSettings().maxAllowedAbsences / 2));
    },

    suppressNextAutoExpulsionCheck() {
        this.skipNextAutoExpulsionCheck = true;
    },

    openSettingsModal() {
        const input = document.getElementById('maxAllowedAbsencesInput');
        if (input) input.value = this.getAbsenceSettings().maxAllowedAbsences;
        const retentionInput = document.getElementById('expelledRetentionDaysInput');
        if (retentionInput) retentionInput.value = this.getAbsenceSettings().retentionDays;
        window.ModalManager.open('absenceSettingsModal');
    },

    saveSettings() {
        const input = document.getElementById('maxAllowedAbsencesInput');
        const maxAllowedAbsences = Number(input?.value);
        const retentionInput = document.getElementById('expelledRetentionDaysInput');
        const retentionDays = retentionInput
            ? Number(retentionInput.value)
            : this.getAbsenceSettings().retentionDays;
        const { stage, grade } = this.getContext();
        if (
            !stage
            || !grade
            || !Number.isInteger(maxAllowedAbsences)
            || maxAllowedAbsences < 1
            || !Number.isInteger(retentionDays)
            || retentionDays < 1
        ) {
            if (window.notify?.error) window.notify.error('يرجى إدخال عدد صحيح أكبر من صفر.');
            return;
        }
        window.AttendanceStore.saveAbsenceSettings(stage, grade, {
            maxAllowedAbsences: Math.floor(maxAllowedAbsences),
            retentionDays: Math.floor(retentionDays)
        });
        window.ModalManager.close('absenceSettingsModal');
        if (window.notify?.success) window.notify.success('تم حفظ إعدادات الغياب بنجاح.');
        this.render();
        if (document.getElementById('expelledStudentsModal')?.classList.contains('active')) {
            this.renderExpelledTable();
        }
    },

    getDateKey(record) {
        if (record.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(record.dateKey)) return record.dateKey;
        const date = new Date(record.date);
        return Number.isNaN(date.getTime()) ? '' : window.AttendanceStore.getDateKey(date);
    },

    getDateFromKey(dateKey) {
        const [year, month, day] = String(dateKey).split('-').map(Number);
        return new Date(year, (month || 1) - 1, day || 1);
    },

    getWeekStartKey(dateKey) {
        const date = this.getDateFromKey(dateKey);
        if (Number.isNaN(date.getTime())) return '';
        const diff = (date.getDay() + 1) % 7;
        date.setDate(date.getDate() - diff);
        return window.AttendanceStore.getDateKey(date);
    },

    getTermMonths() {
        const { stage, grade } = this.getContext();
        if (stage && grade && window.PaymentsStore) {
            const settings = window.PaymentsStore.getTermSettings(stage, grade);
            return this.activeTerm === 2 ? settings.secondTermMonths : settings.firstTermMonths;
        }
        return this.activeTerm === 2 ? [0, 1, 2, 3] : [8, 9, 10, 11];
    },

    getTermHistory() {
        const months = this.getTermMonths();
        return this.getHistory().filter(record => {
            const dateKey = this.getDateKey(record);
            const date = this.getDateFromKey(dateKey);
            return dateKey && months.includes(date.getMonth());
        });
    },

    getCurrentPeriodValue() {
        const today = new Date();
        const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        return `month:${month}`;
    },

    getPeriodOptions() {
        const today = new Date();
        const options = [
            { value: 'all', label: 'كل الفترة المحددة' },
            {
                value: `week:${window.AttendanceStore.getWeekKey()}`,
                label: 'هذا الأسبوع'
            },
            {
                value: this.getCurrentPeriodValue(),
                label: 'هذا الشهر'
            }
        ];
        const months = new Map();
        const weeks = new Map();
        this.getTermHistory().forEach(record => {
            const dateKey = this.getDateKey(record);
            if (!dateKey) return;
            const monthKey = dateKey.slice(0, 7);
            months.set(`month:${monthKey}`, monthKey);
            const weekKey = this.getWeekStartKey(dateKey);
            weeks.set(`week:${weekKey}`, weekKey);
        });

        [...months.entries()]
            .sort((a, b) => b[1].localeCompare(a[1]))
            .forEach(([value, key]) => {
                const [year, month] = key.split('-').map(Number);
                const label = `${window.MONTHS?.[(month || 1) - 1] || key} ${year}`;
                if (!options.some(item => item.value === value)) options.push({ value, label: `شهر: ${label}` });
            });
        [...weeks.entries()]
            .sort((a, b) => b[1].localeCompare(a[1]))
            .forEach(([value, key]) => {
                const date = this.getDateFromKey(key);
                const label = date.toLocaleDateString('ar-EG-u-nu-latn', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                if (!options.some(item => item.value === value)) options.push({ value, label: `أسبوع يبدأ ${label}` });
            });
        return options;
    },

    matchesPeriod(dateKey) {
        if (!this.selectedPeriod || this.selectedPeriod === 'all') return true;
        const [type, value] = this.selectedPeriod.split(':');
        if (type === 'month') return dateKey.slice(0, 7) === value;
        if (type === 'week') return this.getWeekStartKey(dateKey) === value;
        return true;
    },

    getSelectedPeriodLabel() {
        if (!this.selectedPeriod || this.selectedPeriod === 'all') return 'كل الفترة المحددة';
        const [type, value] = this.selectedPeriod.split(':');
        if (type === 'month') {
            const [year, month] = value.split('-').map(Number);
            return `شهر ${window.MONTHS?.[(month || 1) - 1] || value} ${year}`;
        }
        if (type === 'week') {
            const date = this.getDateFromKey(value);
            return `أسبوع يبدأ ${date.toLocaleDateString('ar-EG-u-nu-latn', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })}`;
        }
        return 'الفترة المحددة';
    },

    getCounts() {
        const counts = {};
        this.getTermHistory().forEach(record => {
            const dateKey = this.getDateKey(record);
            if (!dateKey || !this.matchesPeriod(dateKey) || record.status === 'present') return;
            const id = String(record.studentId);
            counts[id] = (counts[id] || 0) + 1;
        });
        return counts;
    },

    getStudents() {
        const { stage, grade } = this.getContext();
        if (!stage || !grade) return [];
        return window.StudentStore.getStudents(stage, grade)
            .filter(student => student.name && !window.StudentStore.isEmptySlot(student));
    },

    render() {
        const view = document.getElementById('repeatedAbsenceView');
        if (!view) return;
        const { stage, grade } = this.getContext();
        const context = document.getElementById('repeatedAbsenceContext');
        const termInputs = document.querySelectorAll('input[name="repeatedAbsenceTerm"]');
        termInputs.forEach(input => { input.checked = Number(input.value) === this.activeTerm; });

        if (!stage || !grade || window.GlobalStageFilter.isLocked()) {
            if (context) context.innerHTML = window.GlobalStageFilter.getLockedPlaceholderHTML();
            document.getElementById('repeatedAbsenceTableContainer').innerHTML = '';
            return;
        }

        const stageName = window.STUDENT_CONFIG?.stageData?.[stage]?.name || stage;
        const gradeName = window.STUDENT_CONFIG?.gradeNames?.[stage]?.[grade - 1] || `صف ${grade}`;
        if (context) {
            context.innerHTML = `
                <span class="current-grade-banner"><i class="fas fa-layer-group"></i> ${this.escapeHtml(stageName)} — ${this.escapeHtml(gradeName)}</span>
                <span><i class="fas fa-calendar-check"></i> ${this.activeTerm === 1 ? 'الترم الأول' : 'الترم الثاني'}</span>
            `;
        }

        this.renderTimeFilter();
        this.renderTable();
    },

    renderTimeFilter() {
        const select = document.getElementById('repeatedAbsenceTimeFilter');
        if (!select) return;
        const options = this.getPeriodOptions();
        if (!this.selectedPeriod || !options.some(item => item.value === this.selectedPeriod)) {
            this.selectedPeriod = this.getCurrentPeriodValue();
            if (!options.some(item => item.value === this.selectedPeriod)) this.selectedPeriod = 'all';
        }
        select.innerHTML = options.map(option => `
            <option value="${this.escapeAttribute(option.value)}">${this.escapeHtml(option.label)}</option>
        `).join('');
        select.value = this.selectedPeriod;
    },

    renderTable() {
        const container = document.getElementById('repeatedAbsenceTableContainer');
        const summary = document.getElementById('repeatedAbsenceSummary');
        if (!container) return;
        if (window.GlobalStageFilter.isLocked()) {
            container.innerHTML = '';
            if (summary) summary.innerHTML = '';
            return;
        }

        window.purgeExpiredExpelledStudents?.();
        const counts = this.getCounts();
        const settings = this.getAbsenceSettings();
        const bypassAutoExpulsion = this.skipNextAutoExpulsionCheck;
        this.skipNextAutoExpulsionCheck = false;
        const automaticallyExpelled = bypassAutoExpulsion
            ? []
            : this.getStudents()
                .filter(student => (counts[String(student.id)] || 0) > settings.maxAllowedAbsences);

        if (automaticallyExpelled.length) {
            const { stage, grade } = this.getContext();
            automaticallyExpelled.forEach(student => {
                window.StudentStore.expelStudent(
                    stage,
                    grade,
                    student.id,
                    counts[String(student.id)] || 0
                );
            });
            if (window.notify?.warning) {
                window.notify.warning(
                    `تم طرد ${this.formatNumber(automaticallyExpelled.length)} طالب تلقائيًا لتجاوز حد الغياب.`
                );
            }
            this.render();
            return;
        }

        const query = this.searchQuery.trim().toLocaleLowerCase('ar');
        const threshold = Math.max(1, Math.ceil(settings.maxAllowedAbsences / 2));
        const students = this.getStudents()
            .map((student, index) => ({
                ...student,
                serial: window.StudentStore.getSerial(student, index + 1),
                absenceCount: counts[String(student.id)] || 0
            }))
            .filter(student => {
                if (student.absenceCount < threshold) return false;
                if (!query) return true;
                return `${student.name} ${student.studentCode || student.code || ''}`
                    .toLocaleLowerCase('ar').includes(query);
            })
            .sort((a, b) => b.absenceCount - a.absenceCount || a.serial - b.serial);

        const totalAbsences = Object.values(counts).reduce((sum, count) => sum + count, 0);
        if (summary) {
            summary.innerHTML = `
                <div><strong>${this.formatNumber(students.length)}</strong><span>طالب في العرض</span></div>
                <div class="absence-summary-stat"><strong>${this.formatNumber(totalAbsences)}</strong><span>حالة غياب</span></div>
                <div><strong>${this.formatNumber(threshold)}</strong><span>حد العرض الأدنى</span></div>
            `;
        }

        container.innerHTML = `
                    <div class="table-responsive">
                <table class="attendance-table repeated-absence-table">
                    <thead>
                        <tr>
                            <th>مسلسل</th>
                            <th>كود الطالب</th>
                            <th>اسم الطالب</th>
                            <th>عدد مرات الغياب</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.length ? students.map(student => `
                            <tr>
                                <td class="col-serial">${this.formatNumber(student.serial)}</td>
                                <td class="student-code-cell">${this.escapeHtml(student.studentCode || student.code || '---')}</td>
                                <td class="repeated-student-name">${this.escapeHtml(student.name)}</td>
                                <td><span class="absence-count-badge ${student.absenceCount ? 'has-absence' : ''}">${this.formatNumber(student.absenceCount)}</span></td>
                                <td>
                                    <button type="button" class="expel-student-btn" data-student-id="${this.escapeAttribute(student.id)}">
                                        <i class="fas fa-user-slash"></i> طرد الطالب
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr><td colspan="5" class="empty-row">لا توجد نتائج مطابقة للفلاتر الحالية.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelectorAll('.expel-student-btn').forEach(button => {
            button.onclick = () => this.expelStudent(button.dataset.studentId);
        });
    },

    async expelStudent(studentId) {
        const student = this.getStudents().find(item => String(item.id) === String(studentId));
        if (!student) return;
        const count = this.getCounts()[String(studentId)] || 0;
        const confirmed = await window.confirm(
            `هل تريد طرد الطالب "${student.name}"؟ سيتم إخلاء مسلسله مع حفظ بياناته كاملة.`
        );
        if (!confirmed) return;

        const { stage, grade } = this.getContext();
        const record = window.StudentStore.expelStudent(stage, grade, studentId, count);
        if (!record) return;
        if (window.notify?.success) window.notify.success(`تم طرد الطالب ${student.name} وحفظ بياناته.`);
        this.render();
    },

    openExpelledModal() {
        this.renderExpelledTable();
        window.ModalManager.open('expelledStudentsModal');
        this.startExpelledCountdownTimer();
    },

    openExpelledExportOptions() {
        const { stage, grade } = this.getContext();
        window.purgeExpiredExpelledStudents?.(stage, grade);

        const counts = this.getCounts();
        const retentionDays = this.getExpelledRetentionDays(stage, grade);
        const activeTab = document.querySelector(
            '#expelledStudentsModal .expelled-tab.active'
        )?.dataset.type;
        const filter = activeTab
            ? (activeTab === 'manual' ? 'manual' : 'automatic')
            : (this.expelledFilter === 'manual' ? 'manual' : 'automatic');
        const records = (stage && grade ? window.StudentStore.getExpelledStudents(stage, grade) : [])
            .filter(record => filter === 'manual'
                ? record.expulsion_type === 'manual'
                : record.expulsion_type !== 'manual')
            .map((record, index) => ({
                ...record,
                originalSerial: record.originalSerial || record.original_serial || index + 1,
                originalStudentCode: window.StudentStore.getOriginalStudentCode(record) || '---',
                absenceCount: filter === 'manual'
                    ? 0
                    : (counts[String(record.id)] ?? record.absenceCount ?? 0),
                remainingDays: this.getRemainingExpelledDays(
                    record.expelled_at || record.expelledAt,
                    retentionDays
                )
            }));

        const title = filter === 'manual'
            ? 'تقرير الطلاب المطرودين يدوياً'
            : 'تقرير الطلاب المطرودين تلقائياً';
        const options = {
            targetType: 'expelled-students',
            title,
            data: records,
            filter,
            stage,
            grade,
            retentionDays
        };

        if (window.PrintEngine?.openExportOptionsModal) {
            window.PrintEngine.openExportOptionsModal(options);
        } else {
            window.PrintEngine?.openExportMethodModal?.('expelled-students', options);
        }
    },

    startExpelledCountdownTimer() {
        this.stopExpelledCountdownTimer();
        this.countdownTimer = window.setInterval(() => {
            const modal = document.getElementById('expelledStudentsModal');
            if (!modal?.classList.contains('active')) {
                this.stopExpelledCountdownTimer();
                return;
            }
            this.renderExpelledTable();
        }, 60 * 1000);
    },

    stopExpelledCountdownTimer() {
        if (!this.countdownTimer) return;
        window.clearInterval(this.countdownTimer);
        this.countdownTimer = null;
    },

    getExpelledRetentionDays(stage, grade) {
        return window.StudentStore?.getExpelledRetentionDays?.(stage, grade) || 30;
    },

    getRemainingExpelledDays(expelledAt, retentionDays = 30) {
        const timestamp = new Date(expelledAt).getTime();
        const retentionLimit = Number.isFinite(Number(retentionDays))
            && Number(retentionDays) >= 1
            ? Math.floor(Number(retentionDays))
            : 30;
        if (!Number.isFinite(timestamp)) return retentionLimit;

        const elapsedDays = Math.ceil(Math.max(0, Date.now() - timestamp) / (24 * 60 * 60 * 1000));
        return Math.max(0, retentionLimit - elapsedDays);
    },

    getExpelledWarningHTML(retentionDays) {
        return `
            <div class="expelled-retention-warning" role="alert">
                <span class="expelled-retention-warning-icon" aria-hidden="true">⚠️</span>
                <span>تنبيه: سيتم حذف بيانات الطالب نهائيًا من الموقع وقاعدة البيانات بعد انقضاء المدة المحددة (حاليًا ${this.formatNumber(retentionDays)} يومًا).</span>
            </div>
        `;
    },

    renderExpelledTable() {
        const container = document.getElementById('expelledStudentsTableContainer');
        if (!container) return;
        const { stage, grade } = this.getContext();
        window.purgeExpiredExpelledStudents?.(stage, grade);
        const records = stage && grade ? window.StudentStore.getExpelledStudents(stage, grade) : [];
        const counts = this.getCounts();
        const retentionDays = this.getExpelledRetentionDays(stage, grade);
        const filteredRecords = records.filter(record =>
            this.expelledFilter === 'manual'
                ? record.expulsion_type === 'manual'
                : record.expulsion_type !== 'manual'
        );

        container.innerHTML = `
            ${this.getExpelledWarningHTML(retentionDays)}
            <div class="expelled-category-tabs" role="tablist" aria-label="نوع الطرد">
                <button
                    type="button"
                    class="expelled-filter-tab expelled-tab ${this.expelledFilter === 'automatic' ? 'active' : ''}"
                    data-expelled-filter="automatic"
                    data-type="auto"
                    role="tab"
                    aria-selected="${this.expelledFilter === 'automatic'}"
                >
                    <i class="fas fa-robot"></i> المطرودون تلقائيًا
                </button>
                <button
                    type="button"
                    class="expelled-filter-tab expelled-tab ${this.expelledFilter === 'manual' ? 'active' : ''}"
                    data-expelled-filter="manual"
                    data-type="manual"
                    role="tab"
                    aria-selected="${this.expelledFilter === 'manual'}"
                >
                    <i class="fas fa-user-slash"></i> المطرودون يدويًا
                </button>
            </div>
            <div class="expelled-modal-context">السجل الحالي للطلاب المطرودين في الصف المحدد</div>
            ${filteredRecords.length ? `
            <div class="table-responsive">
                <table class="attendance-table expelled-students-table">
                    <thead>
                        <tr>
                            <th>اسم الطالب</th>
                            <th>كود الطالب</th>
                            <th>سبب / عدد مرات الغياب</th>
                            <th>متبقي للحذف النهائي</th>
                            <th>الإجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredRecords.map(record => `
                            <tr>
                                <td class="repeated-student-name">${this.escapeHtml(record.name)}</td>
                                <td class="student-code-cell">${this.escapeHtml(window.StudentStore.getOriginalStudentCode(record) || '---')}</td>
                                <td class="expelled-reason-cell"><span class="absence-count-badge ${record.expulsion_type === 'manual' ? '' : 'has-absence'}">${record.expulsion_type === 'manual' ? 'طرد يدويًا' : this.formatNumber(counts[String(record.id)] ?? record.absenceCount ?? 0)}</span></td>
                                <td>
                                    <span class="expelled-countdown-badge">
                                        متبقي
                                        <strong>${this.formatNumber(this.getRemainingExpelledDays(record.expelled_at || record.expelledAt, retentionDays))}</strong>
                                        <small>يومًا</small>
                                    </span>
                                </td>
                                <td>
                                    <button type="button" class="restore-student-btn" data-student-id="${this.escapeAttribute(record.id)}">
                                        <i class="fas fa-user-check"></i> إعادة الطالب
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : `
                <div class="placeholder-content expelled-empty-state">
                    <i class="fas fa-user-check"></i>
                    <p>لا يوجد طلاب في هذه القائمة حاليًا.</p>
                </div>
            `}
        `;

        container.querySelectorAll('.expelled-filter-tab').forEach(button => {
            button.onclick = () => {
                this.expelledFilter = button.dataset.expelledFilter === 'manual'
                    ? 'manual'
                    : 'automatic';
                this.renderExpelledTable();
            };
        });

        container.querySelectorAll('.restore-student-btn').forEach(button => {
            button.onclick = () => this.openRestoreConfirmation(button.dataset.studentId);
        });
    },

    getRestorePreview(studentId) {
        const { stage, grade } = this.getContext();
        const record = window.StudentStore.getExpelledStudents(stage, grade)
            .find(item => String(item.id) === String(studentId));
        if (!record) return null;

        return window.StudentStore.getRestorePlan(stage, grade, record);
    },

    openRestoreConfirmation(studentId) {
        const preview = this.getRestorePreview(studentId);
        if (!preview) return;
        this.pendingRestore = preview;
        const details = document.getElementById('restoreStudentDetails');
        if (details) {
            const codeValue = preview.isNewCode
                ? `
                    <span class="restore-code-value">
                        <strong>${this.escapeHtml(preview.assignedCode || '---')}</strong>
                        <span class="new-code-badge">كود جديد</span>
                    </span>
                `
                : `<strong>${this.escapeHtml(preview.assignedCode || '---')}</strong>`;
            details.innerHTML = `
                <div><span>اسم الطالب</span><strong>${this.escapeHtml(preview.record.name)}</strong></div>
                <div><span>كود الطالب</span>${codeValue}</div>
                <div class="restore-serial-detail"><span>المسلسل المحدد للإضافة</span><strong># ${this.formatNumber(preview.assignedSerial)}</strong></div>
            `;
        }
        window.ModalManager.close('expelledStudentsModal');
        window.ModalManager.open('repeatedAbsenceRestoreModal');
    },

    confirmRestore() {
        if (!this.pendingRestore) return;
        const { stage, grade } = this.getContext();
        this.suppressNextAutoExpulsionCheck();
        const result = window.StudentStore.restoreExpelledStudent(
            stage,
            grade,
            this.pendingRestore.record.id,
            this.pendingRestore
        );
        if (!result) {
            this.skipNextAutoExpulsionCheck = false;
            return;
        }

        const restoredName = this.pendingRestore.record.name;
        const restoredCode = result.assignedCode || '---';
        const details = document.getElementById('restoreSuccessDetails');
        if (details) {
            const codeValue = result.isNewCode
                ? `
                    <span class="restore-code-value">
                        <strong>${this.escapeHtml(restoredCode)}</strong>
                        <span class="new-code-badge">كود جديد</span>
                    </span>
                `
                : `<strong>${this.escapeHtml(restoredCode)}</strong>`;
            details.innerHTML = `
                <div><span>اسم الطالب</span><strong>${this.escapeHtml(restoredName)}</strong></div>
                <div><span>كود الطالب</span>${codeValue}</div>
                <div class="restore-serial-detail"><span>المسلسل المحدد للإضافة</span><strong># ${this.formatNumber(result.assignedSerial)}</strong></div>
            `;
        }
        this.pendingRestore = null;
        window.notify?.success?.('تمت إعادة الطالب بنجاح وتصفير سجل غيابه.');
        window.ModalManager.close('repeatedAbsenceRestoreModal');
        window.ModalManager.open('repeatedAbsenceSuccessModal');
    },

    formatNumber(value) {
        return window.AppUtils?.formatNumber ? window.AppUtils.formatNumber(value) : String(value);
    },

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeAttribute(value) {
        return this.escapeHtml(value);
    }
};
