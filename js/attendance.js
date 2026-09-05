// Attendance and Groups Controller
window.Attendance = {
    currentStage: null,
    currentGrade: null,
    currentGroup: null,
    selectedSessionId: 'current',
    searchQuery: '',
    archiveMonitor: null,

    init(stage, grade) {
        this.currentStage = stage;
        this.currentGrade = grade;
        this.searchQuery = '';
        const searchInput = document.getElementById('attendanceSearchInput');
        if (searchInput) searchInput.value = '';
        
        window.AttendanceGroups.init(this);
        window.AttendanceRecords.init(this);
        
        this.setupListeners();
        this.loadCurrentGroup();
        this.selectedSessionId = 'current';
        this.startArchiveMonitor();
        this.renderStudentList();
    },

    setupListeners() {
        document.getElementById('openRecordsBtn').onclick = () => window.AttendanceRecords.openRecordsDashboard();
        document.getElementById('groupAttendanceHistoryBtn').onclick = () => window.AttendanceRecords.openGroupAttendanceDashboard();
        
        document.getElementById('viewGroupsBtn').onclick = () => window.AttendanceGroups.openGroupSelector();
        document.getElementById('openGroupsManager').onclick = () => window.AttendanceGroups.openGroupsManager();
        document.getElementById('closeGroupsManager').onclick = () => window.ModalManager.close('groupsManagerModal');
        document.getElementById('addNewGroupBtn').onclick = () => window.AttendanceGroups.openAddGroupModal();
        document.getElementById('closeAddGroupName').onclick = () => window.ModalManager.close('addGroupNameModal');
        document.getElementById('confirmAddGroup').onclick = () => window.AttendanceGroups.saveNewGroup();
        document.getElementById('closeGroupSchedule').onclick = () => window.ModalManager.close('groupScheduleModal');
        document.getElementById('addDayBtn').onclick = () => window.AttendanceGroups.openDaySelector();
        document.getElementById('saveGroupSchedule').onclick = () => window.AttendanceGroups.saveSchedule();
        document.getElementById('closeDaySelector').onclick = () => window.ModalManager.close('daySelectorModal');
        document.getElementById('confirmDaySelection').onclick = () => window.AttendanceGroups.confirmDaySelection();
        document.getElementById('closeSelectGroup').onclick = () => window.ModalManager.close('selectGroupModal');
        document.getElementById('closeGroupAttendanceHistory').onclick = () => window.ModalManager.close('groupAttendanceHistoryModal');

        // Link Groups Logic
        if (!document.getElementById('openLinkManagerBtn')) {
            const linkBtn = document.createElement('button');
            linkBtn.id = 'openLinkManagerBtn';
            linkBtn.className = 'add-day-btn';
            linkBtn.style.marginTop = '1rem';
            linkBtn.innerHTML = '<i class="fas fa-link"></i> <span>ربط المجموعات (المسارات)</span>';
            linkBtn.onclick = () => window.AttendanceGroups.openLinkManager();
            document.querySelector('#groupScheduleModal .modal-body').appendChild(linkBtn);
        }

        document.getElementById('closeLinkGroups').onclick = () => window.ModalManager.close('linkGroupsModal');
        document.getElementById('saveLinkGroups').onclick = () => window.AttendanceGroups.saveLinks();

        const sessionSelect = document.getElementById('attendanceSessionFilterSelect');
        if (sessionSelect && !sessionSelect.dataset.listenerAttached) {
            sessionSelect.dataset.listenerAttached = 'true';
            sessionSelect.onchange = (event) => {
                this.selectedSessionId = event.target.value || 'current';
                this.renderStudentList();
            };
        }

        const finalizeBtn = document.getElementById('finalizeAttendanceSessionBtn');
        if (finalizeBtn && !finalizeBtn.dataset.listenerAttached) {
            finalizeBtn.dataset.listenerAttached = 'true';
            finalizeBtn.onclick = () => this.finalizeCurrentSession();
        }

        const attendanceSearchInput = document.getElementById('attendanceSearchInput');
        if (attendanceSearchInput && !attendanceSearchInput.dataset.listenerAttached) {
            attendanceSearchInput.dataset.listenerAttached = 'true';
            attendanceSearchInput.oninput = event => {
                this.searchQuery = event.target.value.trim();
                this.renderStudentList();
            };
        }

        document.querySelectorAll('.day-circle').forEach(circle => {
            circle.onclick = () => {
                const day = circle.getAttribute('data-day');
                if (window.AttendanceGroups.selectedDays.has(day)) {
                    window.AttendanceGroups.selectedDays.delete(day);
                    circle.classList.remove('selected');
                } else {
                    window.AttendanceGroups.selectedDays.add(day);
                    circle.classList.add('selected');
                }
            };
        });
    },

    loadCurrentGroup() {
        const groupName = window.AttendanceStore.getCurrentGroupName(this.currentStage, this.currentGrade);
        if (groupName) {
            this.currentGroup = groupName;
            this.updateSummary();
        }
    },

    updateSummary() {
        const groups = window.AttendanceStore.getGroups(this.currentStage, this.currentGrade);
        window.AttendanceUI.updateSummary(this.currentGroup, groups);
    },

    renderStudentList() {
        const container = document.getElementById('attendanceStudentList');
        
        // Check global lock
        if (window.GlobalStageFilter.isLocked()) {
            container.innerHTML = window.GlobalStageFilter.getLockedPlaceholderHTML();
            document.getElementById('attendanceSummary').style.display = 'none';
            const sessionControls = document.getElementById('attendanceSessionControls');
            if (sessionControls) sessionControls.style.display = 'none';
            return;
        } else {
            document.getElementById('attendanceSummary').style.display = 'block';
            const sessionControls = document.getElementById('attendanceSessionControls');
            if (sessionControls) sessionControls.style.display = 'flex';
        }

        // Ensure we are in sync with Global Filter
        const globalStage = window.GlobalStageFilter.getActiveStage();
        const globalGrade = window.GlobalStageFilter.getActiveGrade();
        
        if (this.currentStage !== globalStage || this.currentGrade !== globalGrade) {
            this.currentStage = globalStage;
            this.currentGrade = globalGrade;
            this.loadCurrentGroup();
        }

        // Automatically close and archive every scheduled session whose end
        // time has passed before rebuilding the live attendance table.
        window.AttendanceStore.finalizeDueSessions(this.currentStage, this.currentGrade);

        const allStudents = window.StudentStore.getStudents(this.currentStage, this.currentGrade)
            .filter(s => s.name)
            .map((s, idx) => ({ ...s, serial: window.StudentStore.getSerial(s, idx + 1) }));
        const query = this.searchQuery.toLowerCase();
        const students = query
            ? allStudents.filter(student => {
                const name = String(student.name || '').toLowerCase();
                const code = String(student.studentCode || student.code || '').toLowerCase();
                return name.includes(query) || code.includes(query);
            })
            : allStudents;

        const currentSession = this.currentGroup
            ? window.AttendanceStore.getSessionInfo(this.currentStage, this.currentGrade, this.currentGroup)
            : null;
        const selectedSession = this.selectedSessionId !== 'current'
            ? window.AttendanceStore.getCompletedSession(this.currentStage, this.currentGrade, this.selectedSessionId)
            : null;
        const isArchivedView = Boolean(selectedSession);
        const activeSession = selectedSession || currentSession;

        this.renderSessionFilter();

        // Archived sessions use their immutable snapshot. The current session
        // continues to read today's live records and linked attendance.
        const dailyRecords = selectedSession
            ? { ...(selectedSession.records || {}) }
            : (currentSession
                ? window.AttendanceStore.getAttendanceRecords(
                    this.currentStage,
                    this.currentGrade,
                    this.currentGroup,
                    new Date(),
                    currentSession.id
                )
                : {});

        const linkedData = window.AttendanceStore.getLinkedAttendance(this.currentStage, this.currentGrade);
        
        // Find if current session is linked
        const groups = window.AttendanceStore.getGroups(this.currentStage, this.currentGrade);
        const group = groups.find(g => g.name === this.currentGroup);
        const todayAr = new Date().toLocaleDateString('ar-EG', { weekday: 'long' });
        const currentSlot = group?.schedule.find(s => s.day === todayAr);
        const linkId = currentSlot?.linkId;

        const mergedRecords = { ...dailyRecords };
        if (!isArchivedView && linkId && linkedData[linkId]) {
            students.forEach(s => {
                if (linkedData[linkId][s.id]) {
                    mergedRecords[s.id] = linkedData[linkId][s.id];
                }
            });
        }

        const isCurrentSessionComplete = currentSession
            ? window.AttendanceStore.getSessions(this.currentStage, this.currentGrade)
                .some(session => session.id === currentSession.id && session.completed)
            : false;

        window.AttendanceUI.renderStudentList(container, students, mergedRecords, 
            (id, status) => this.markAttendance(id, status),
            (id) => window.AttendanceRecords.openStudentProfile(id),
            {
                readOnly: isArchivedView || isCurrentSessionComplete,
                emptyMessage: query
                    ? 'لا يوجد طلاب مطابقون للبحث'
                    : 'لا يوجد طلاب في هذا الصف'
            }
        );

        const finalizeBtn = document.getElementById('finalizeAttendanceSessionBtn');
        if (finalizeBtn) {
            finalizeBtn.disabled = isArchivedView || isCurrentSessionComplete || !this.currentGroup;
            finalizeBtn.classList.toggle('is-completed', isCurrentSessionComplete);
            finalizeBtn.querySelector('span').textContent = isCurrentSessionComplete
                ? 'تمت أرشفة الجلسة'
                : 'إنهاء وأرشفة الجلسة';
        }
    },

    renderSessionFilter() {
        const select = document.getElementById('attendanceSessionFilterSelect');
        if (!select) return;

        const completedSessions = window.AttendanceStore.getCompletedSessions(
            this.currentStage,
            this.currentGrade
        );
        const currentLabel = this.currentGroup
            ? `الحصة الحالية - ${this.currentGroup}`
            : 'الحصة الحالية - اختر مجموعة';

        select.innerHTML = `
            <option value="current">${currentLabel}</option>
            ${completedSessions.map(session => `
                <option value="${session.id}">
                    ${session.dayName} - ${session.dateLabel} - ${session.timeSlot} - ${session.groupName}
                </option>
            `).join('')}
        `;
        select.value = this.selectedSessionId;
        if (select.value !== this.selectedSessionId) {
            this.selectedSessionId = 'current';
            select.value = 'current';
        }
    },

    finalizeCurrentSession() {
        if (!this.currentGroup) {
            alert('يرجى تحديد مجموعة أولاً');
            return;
        }

        const session = window.AttendanceStore.finalizeSessionAttendance(
            this.currentStage,
            this.currentGrade,
            this.currentGroup,
            new Date(),
            { source: 'teacher' }
        );
        this.selectedSessionId = session.id;
        this.renderStudentList();
    },

    startArchiveMonitor() {
        if (this.archiveMonitor) clearInterval(this.archiveMonitor);
        this.archiveMonitor = setInterval(() => {
            const attendanceView = document.getElementById('attendanceView');
            if (!attendanceView || attendanceView.style.display === 'none') return;

            const completed = window.AttendanceStore.finalizeDueSessions(
                this.currentStage,
                this.currentGrade
            );
            if (completed.length) {
                this.renderStudentList();
            }
        }, 30000);
    },

    // removed openRecordsDashboard() {}
    // removed openStudentProfile() {}

    checkIsLastSession(groups, linkId) {
        const linkedSlots = [];
        groups.forEach(g => {
            g.schedule.forEach(s => {
                if (s.linkId === linkId) linkedSlots.push(s);
            });
        });
        // Sort by day/time to find last
        const daysOrder = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        linkedSlots.sort((a, b) => daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day));
        const lastSlot = linkedSlots[linkedSlots.length - 1];
        const todayAr = new Date().toLocaleDateString('ar-EG', { weekday: 'long' });
        return lastSlot && lastSlot.day === todayAr;
    },

    markAttendance(studentId, status) {
        if (!this.currentGroup) {
            alert('يرجى تحديد مجموعة أولاً');
            return;
        }
        if (this.selectedSessionId !== 'current') {
            alert('الجلسات المؤرشفة للعرض فقط');
            return;
        }

        const currentSession = window.AttendanceStore.getSessionInfo(
            this.currentStage,
            this.currentGrade,
            this.currentGroup
        );
        const isCompleted = window.AttendanceStore.getSessions(this.currentStage, this.currentGrade)
            .some(session => session.id === currentSession.id && session.completed);
        if (isCompleted) {
            alert('انتهت هذه الجلسة وتمت أرشفتها');
            return;
        }

        // Save daily record
        window.AttendanceStore.saveAttendanceRecord(
            this.currentStage,
            this.currentGrade,
            this.currentGroup,
            studentId,
            status,
            { sessionId: currentSession.id, timeSlot: currentSession.timeSlot }
        );

        // Save linked record if applicable
        const groups = window.AttendanceStore.getGroups(this.currentStage, this.currentGrade);
        const group = groups.find(g => g.name === this.currentGroup);
        const todayAr = new Date().toLocaleDateString('ar-EG', { weekday: 'long' });
        const currentSlot = group?.schedule.find(s => s.day === todayAr);
        
        if (currentSlot && currentSlot.linkId) {
            window.AttendanceStore.saveLinkedAttendance(this.currentStage, this.currentGrade, studentId, currentSlot.linkId, status);
        }

        this.renderStudentList();
    },

    // removed openLinkManager() {}
    // removed saveLinks() {}
    // removed openGroupsManager() {}
    // removed openAddGroupModal() {}
    // removed saveNewGroup() {}
    // removed openGroupSelector() {}
    // removed selectGroup() {}
    // removed openGroupSchedule() {}
    // removed renderScheduleTable() {}
    // removed validateAllSchedules() {}
    // removed openDaySelector() {}
    // removed confirmDaySelection() {}
    // removed saveSchedule() {}
};
// removed getStorageKey() {}
// removed getGroupsKey() {}
// removed getGroups() {}
// removed getAllGroupsPlatform() {}
// removed saveGroups() {}
// removed getCheckedStudents() {}
// removed showConflictToast() {}
