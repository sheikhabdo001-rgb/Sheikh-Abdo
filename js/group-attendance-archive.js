window.GroupAttendanceArchive = {
    initialized: false,
    statusFilter: 'ALL',
    selectedGroup: 'all',
    selectedMonth: '',
    selectedSessionId: '',

    open(options = {}) {
        if (options.groupName) this.selectedGroup = options.groupName;
        if (options.sessionId) this.selectedSessionId = options.sessionId;
        window.ModalManager?.close('groupAttendanceHistoryModal');
        window.Navigation.switchView('groupAttendanceArchive');
    },

    init() {
        if (!this.initialized) {
            this.initialized = true;
            this.bindListeners();
        }
        this.render();
    },

    getContext() {
        return {
            stage: window.GlobalStageFilter.getActiveStage(),
            grade: window.GlobalStageFilter.getActiveGrade()
        };
    },

    bindListeners() {
        const backBtn = document.getElementById('groupArchiveBackBtn');
        if (backBtn) backBtn.onclick = () => window.Navigation.goBack();

        const repeatedAbsenceBtn = document.getElementById('openRepeatedAbsenceBtn');
        if (repeatedAbsenceBtn && window.RepeatedAbsence) {
            repeatedAbsenceBtn.onclick = () => window.RepeatedAbsence.open();
        }

        const groupSelect = document.getElementById('groupFilterSelect');
        if (groupSelect) groupSelect.onchange = event => {
            this.selectedGroup = event.target.value || 'all';
            this.selectedSessionId = '';
            this.render();
        };

        const monthSelect = document.getElementById('monthSelectFilter');
        if (monthSelect) monthSelect.onchange = event => {
            this.selectedMonth = event.target.value || '';
            this.selectedSessionId = '';
            this.render();
        };

        const sessionSelect = document.getElementById('archivedSessionsSelect');
        if (sessionSelect) sessionSelect.onchange = event => {
            this.selectedSessionId = event.target.value || '';
            this.renderTable();
        };

        document.querySelectorAll('[data-archive-status]').forEach(button => {
            button.onclick = () => {
                this.statusFilter = button.dataset.archiveStatus || 'ALL';
                document.querySelectorAll('[data-archive-status]').forEach(item => {
                    item.classList.toggle('active', item === button);
                });
                this.renderTable();
            };
        });
    },

    getFilteredSessions(sessions = null) {
        sessions = sessions || this.getAllSessions();
        return sessions
            .filter(session => this.selectedGroup === 'all' || session.groupName === this.selectedGroup)
            .filter(session => !this.selectedMonth || session.dateKey.startsWith(this.selectedMonth));
    },

    getAllSessions() {
        const { stage, grade } = this.getContext();
        if (!stage || !grade) return [];

        window.AttendanceStore.finalizeDueSessions(stage, grade);
        return window.AttendanceStore.getCompletedSessions(stage, grade)
            .sort((a, b) => {
                const dateCompare = String(b.dateKey).localeCompare(String(a.dateKey));
                return dateCompare || ((b.completedAt || 0) - (a.completedAt || 0));
            });
    },

    render() {
        this.renderGroupFilter();
        const allSessions = this.getAllSessions();
        this.renderMonthFilter(allSessions);
        const sessions = this.getFilteredSessions(allSessions);
        this.renderSessionFilter(sessions);
        this.renderTable(sessions);
    },

    renderGroupFilter() {
        const select = document.getElementById('groupFilterSelect');
        if (!select) return;
        const { stage, grade } = this.getContext();
        const groups = stage && grade ? window.AttendanceStore.getGroups(stage, grade) : [];

        select.innerHTML = `
            <option value="all">كل المجموعات</option>
            ${groups.map(group => `<option value="${this.escapeAttribute(group.name)}">${this.escapeHtml(group.name)}</option>`).join('')}
        `;
        select.value = this.selectedGroup;
        if (select.value !== this.selectedGroup) {
            this.selectedGroup = 'all';
            select.value = 'all';
        }

    },

    renderMonthFilter(sessions) {
        const select = document.getElementById('monthSelectFilter');
        if (!select) return;

        const currentYear = new Date().getFullYear();
        const monthKeys = new Set(
            Array.from({ length: 12 }, (_, index) => `${currentYear}-${String(index + 1).padStart(2, '0')}`)
        );
        sessions.forEach(session => {
            if (/^\d{4}-\d{2}/.test(session.dateKey)) {
                monthKeys.add(session.dateKey.slice(0, 7));
            }
        });

        const sortedMonths = [...monthKeys].sort((a, b) => b.localeCompare(a));
        select.innerHTML = `
            <option value="">كل الشهور (عرض الكل)</option>
            ${sortedMonths.map(monthKey => {
                const [year, month] = monthKey.split('-').map(Number);
                const monthName = window.MONTHS?.[month - 1] || monthKey;
                return `<option value="${monthKey}">${monthName} ${year}</option>`;
            }).join('')}
        `;
        select.value = this.selectedMonth;
        if (select.value !== this.selectedMonth) {
            this.selectedMonth = '';
            select.value = '';
        }
    },

    renderSessionFilter(sessions) {
        const select = document.getElementById('archivedSessionsSelect');
        if (!select) return;

        select.innerHTML = sessions.length
            ? sessions.map(session => `
                <option value="${this.escapeAttribute(session.id)}">
                    ${this.escapeHtml(this.getSessionLabel(session))}
                </option>
            `).join('')
            : '<option value="">لا توجد جلسات مكتملة</option>';

        const sessionExists = sessions.some(session => session.id === this.selectedSessionId);
        if (!sessionExists) this.selectedSessionId = sessions[0]?.id || '';
        select.value = this.selectedSessionId;
    },

    renderTable(sessions = this.getFilteredSessions()) {
        const container = document.getElementById('groupAttendanceArchiveTableContainer');
        const summary = document.getElementById('groupArchiveSessionSummary');
        if (!container) return;

        const session = sessions.find(item => item.id === this.selectedSessionId) || sessions[0] || null;
        if (session && session.id !== this.selectedSessionId) {
            this.selectedSessionId = session.id;
            const select = document.getElementById('archivedSessionsSelect');
            if (select) select.value = session.id;
        }

        if (!session) {
            if (summary) summary.innerHTML = '<span><i class="fas fa-circle-info"></i> اختر مجموعة أو تاريخًا لعرض الجلسات المؤرشفة.</span>';
            container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-clock-rotate-left"></i>
                    <p>لا توجد جلسة مؤرشفة مطابقة للفلاتر الحالية</p>
                </div>
            `;
            return;
        }

        const { stage, grade } = this.getContext();
        const students = window.StudentStore.getStudents(stage, grade)
            .filter(student => student.name)
            .map((student, index) => ({
                ...student,
                serial: index + 1,
                status: session.records?.[student.id] || 'absent'
            }))
            .filter(student => {
                if (this.statusFilter === 'PRESENT') return student.status === 'present';
                if (this.statusFilter === 'ABSENT') return student.status !== 'present';
                return true;
            });

        const presentCount = Object.values(session.records || {}).filter(status => status === 'present').length;
        const absentCount = Math.max(0, (session.studentIds?.length || Object.keys(session.records || {}).length) - presentCount);
        if (summary) {
            summary.innerHTML = `
                <strong><i class="fas fa-users"></i> ${this.escapeHtml(session.groupName)}</strong>
                <span><i class="fas fa-calendar-day"></i> ${this.escapeHtml(session.dateLabel)}</span>
                <span><i class="fas fa-clock"></i> ${this.escapeHtml(session.timeSlot)}</span>
                <span class="present-summary"><i class="fas fa-user-check"></i> ${this.formatNumber(presentCount)} حاضر</span>
                <span class="absent-summary"><i class="fas fa-user-xmark"></i> ${this.formatNumber(absentCount)} غائب</span>
            `;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table id="groupAttendanceArchiveTable" class="attendance-table group-attendance-archive-table">
                    <thead>
                        <tr>
                            <th class="col-serial">م</th>
                            <th>اسم الطالب</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.length ? students.map(student => `
                            <tr class="archive-student-row">
                                <td class="col-serial">${this.formatNumber(student.serial)}</td>
                                <td class="archive-student-name">
                                    <a href="#" class="student-name-link" data-student-id="${student.id}" data-from-view="groupAttendanceArchive">
                                        ${this.escapeHtml(student.name)}
                                    </a>
                                </td>
                                <td class="archive-student-status">
                                    <span class="status-badge ${student.status === 'present' ? 'attended' : 'absent'}">
                                        <i class="fas ${student.status === 'present' ? 'fa-check' : 'fa-times'}"></i>
                                        ${student.status === 'present' ? 'حاضر' : 'غائب'}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr><td colspan="3" class="empty-row">لا توجد سجلات ضمن هذا التصنيف.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    },

    getSelectedSession() {
        const sessions = this.getFilteredSessions();
        return sessions.find(session => session.id === this.selectedSessionId)
            || sessions[0]
            || null;
    },

    getSessionLabel(session) {
        return `${session.dayName} - ${session.dateLabel} - ${session.timeSlot} - ${session.groupName}`;
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
