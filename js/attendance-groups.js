window.AttendanceGroups = {
    parent: null,
    editingGroup: null,
    tempSchedule: [],
    selectedDays: new Set(),
    tempGroupsLinks: [],

    init(parent) {
        this.parent = parent;
    },

    openGroupsManager() {
        const groups = window.AttendanceStore.getGroups(this.parent.currentStage, this.parent.currentGrade);
        const container = document.getElementById('groupsList');
        window.GroupsUI.renderGroupsList(container, groups, (name) => this.openGroupSchedule(name));
        window.ModalManager.open('groupsManagerModal');
    },

    openAddGroupModal() {
        document.getElementById('newGroupNameInput').value = '';
        window.ModalManager.open('addGroupNameModal');
        setTimeout(() => document.getElementById('newGroupNameInput').focus(), 200);
    },

    saveNewGroup() {
        const nameInput = document.getElementById('newGroupNameInput');
        const name = nameInput.value.trim();
        if (!name) return alert('يرجى إدخال اسم المجموعة');

        const groups = window.AttendanceStore.getGroups(this.parent.currentStage, this.parent.currentGrade);
        if (groups.some(g => g.name === name)) return alert('اسم المجموعة موجود بالفعل');

        groups.push({ name, schedule: [] });
        window.AttendanceStore.saveGroups(this.parent.currentStage, this.parent.currentGrade, groups);
        window.ModalManager.close('addGroupNameModal');
        this.openGroupsManager();
    },

    openGroupSelector() {
        const groups = window.AttendanceStore.getGroups(this.parent.currentStage, this.parent.currentGrade);
        const container = document.getElementById('groupSelectionGrid');
        window.GroupsUI.renderGroupSelector(container, groups, this.parent.currentGroup, (name) => this.selectGroup(name));
        window.ModalManager.open('selectGroupModal');
    },

    selectGroup(groupName) {
        this.parent.currentGroup = groupName;
        this.parent.selectedSessionId = 'current';
        window.AttendanceStore.setCurrentGroupName(this.parent.currentStage, this.parent.currentGrade, groupName);
        this.parent.updateSummary();
        this.parent.renderStudentList();
        window.ModalManager.close('selectGroupModal');
    },

    openGroupSchedule(groupName) {
        this.editingGroup = groupName;
        const groups = AttendanceStore.getGroups(this.parent.currentStage, this.parent.currentGrade);
        const group = groups.find(g => g.name === groupName);
        document.getElementById('groupScheduleTitle').textContent = groupName;
        this.tempSchedule = group ? [...group.schedule] : [];
        this.renderScheduleTable();
        window.ModalManager.close('groupsManagerModal');
        window.ModalManager.open('groupScheduleModal');
    },

    renderScheduleTable() {
        const tbody = document.getElementById('scheduleTableBody');
        window.GroupsUI.renderScheduleTable(tbody, this.tempSchedule,
            (idx, time) => {
                this.tempSchedule[idx].time = time;
                this.validateAllSchedules();
            },
            (idx) => {
                this.tempSchedule.splice(idx, 1);
                this.renderScheduleTable();
            }
        );
        this.validateAllSchedules();
    },

    validateAllSchedules() {
        const inputs = document.querySelectorAll('.schedule-time-input');
        const allPlatformGroups = window.AttendanceStore.getAllGroupsPlatform();
        const globalWarning = document.getElementById('globalScheduleWarning');
        const saveBtn = document.getElementById('saveGroupSchedule');
        let hasConflict = false;

        inputs.forEach(input => {
            const idx = parseInt(input.getAttribute('data-idx'));
            const slot = this.tempSchedule[idx];
            if (!slot.time) return input.classList.remove('input-conflict');

            const platformConflict = allPlatformGroups.find(g => 
                !(g.name === this.editingGroup && g.stage === this.parent.currentStage && g.grade === this.parent.currentGrade) &&
                g.schedule.some(s => s.day === slot.day && s.time === slot.time)
            );

            const internalConflict = this.tempSchedule.find((s, sIdx) => 
                sIdx !== idx && s.day === slot.day && s.time === slot.time && s.time !== ""
            );

            let conflictingInfo = platformConflict ? `محجوز لـ ${platformConflict.stageName} - ${platformConflict.gradeName} - ${platformConflict.name}` : (internalConflict ? `يوم مكرر في نفس الجدول!` : null);

            if (conflictingInfo) {
                if (!input.classList.contains('input-conflict')) window.AttendanceUI.showConflictToast(`هذا الموعد محجوز بالفعل! (${conflictingInfo})`);
                input.classList.add('input-conflict');
                input.nextElementSibling.textContent = conflictingInfo;
                hasConflict = true;
            } else {
                input.classList.remove('input-conflict');
            }
        });

        globalWarning.classList.toggle('show', hasConflict);
        saveBtn.disabled = hasConflict;
        saveBtn.style.opacity = hasConflict ? "0.5" : "1";
    },

    openDaySelector() {
        this.selectedDays.clear();
        document.querySelectorAll('.day-circle').forEach(c => c.classList.remove('selected'));
        window.ModalManager.open('daySelectorModal');
    },

    confirmDaySelection() {
        if (this.selectedDays.size === 0) return alert('يرجى اختيار يوم واحد على الأقل');
        this.selectedDays.forEach(day => {
            if (!this.tempSchedule.some(s => s.day === day)) this.tempSchedule.push({ day, time: '' });
        });
        this.renderScheduleTable();
        window.ModalManager.close('daySelectorModal');
    },

    saveSchedule() {
        const groups = AttendanceStore.getGroups(this.parent.currentStage, this.parent.currentGrade);
        const groupIdx = groups.findIndex(g => g.name === this.editingGroup);
        if (groupIdx !== -1) {
            groups[groupIdx].schedule = this.tempSchedule;
            window.AttendanceStore.saveGroups(this.parent.currentStage, this.parent.currentGrade, groups);
            this.parent.currentGroup = this.editingGroup;
            window.AttendanceStore.setCurrentGroupName(this.parent.currentStage, this.parent.currentGrade, this.parent.currentGroup);
            this.parent.updateSummary();
        }
        window.ModalManager.close('groupScheduleModal');
        this.openGroupsManager();
    },

    openLinkManager() {
        const groups = AttendanceStore.getGroups(this.parent.currentStage, this.parent.currentGrade);
        const container = document.getElementById('linkGroupsContainer');
        this.tempGroupsLinks = JSON.parse(JSON.stringify(groups));
        
        window.GroupsUI.renderLinkGroupsManager(container, this.tempGroupsLinks, (groupName, sIdx, linkId) => {
            const g = this.tempGroupsLinks.find(gr => gr.name === groupName);
            if (g) g.schedule[sIdx].linkId = linkId;
        });

        window.ModalManager.open('linkGroupsModal');
    },

    saveLinks() {
        window.AttendanceStore.saveGroups(this.parent.currentStage, this.parent.currentGrade, this.tempGroupsLinks);
        window.ModalManager.close('linkGroupsModal');
        this.parent.updateSummary();
        this.parent.renderStudentList();
    }
};
