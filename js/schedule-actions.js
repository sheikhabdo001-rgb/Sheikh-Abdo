window.ScheduleActions = {
    currentEditStage: null,
    currentEditGrade: null,
    originalGroupName: null,
    isNewGroup: false,

    init() {
        this.setupListeners();
    },

    setupListeners() {
        const closeBtn = document.getElementById('closeGroupEditor');
        const cancelBtn = document.getElementById('cancelGroupEditor');
        const saveBtn = document.getElementById('saveGroupUnified');

        if (closeBtn) closeBtn.onclick = () => this.close();
        if (cancelBtn) cancelBtn.onclick = () => this.close();
        if (saveBtn) saveBtn.onclick = () => this.save();
    },

    openEditor(stage, grade, groupData = null) {
        this.currentEditStage = stage;
        this.currentEditGrade = parseInt(grade);
        this.isNewGroup = !groupData;
        this.originalGroupName = groupData ? groupData.name : null;

        const titleEl = document.getElementById('groupEditorTitle');
        const contextEl = document.getElementById('groupEditorClassContext');
        const nameDisplay = document.getElementById('groupEditorClassName');
        const nameInput = document.getElementById('editorGroupName');
        
        titleEl.textContent = this.isNewGroup ? 'إضافة مجموعة جديدة' : 'تعديل بيانات المجموعة';
        
        const stageName = window.STUDENT_CONFIG.stageData[stage].name;
        const gradeName = window.STUDENT_CONFIG.gradeNames[stage][this.currentEditGrade - 1];
        nameDisplay.textContent = `${stageName} - ${gradeName}`;
        contextEl.style.display = 'flex';

        nameInput.value = groupData ? groupData.name : '';
        
        this.renderDaysGrid(groupData ? groupData.schedule : []);
        window.ModalManager.open('groupUnifiedEditorModal');
    },

    renderDaysGrid(schedule = []) {
        const container = document.getElementById('editorDaysGrid');
        const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        
        container.innerHTML = days.map(day => {
            const slot = schedule.find(s => s.day === day);
            const isChecked = !!slot;
            let startTime = '', endTime = '';
            
            if (slot && slot.time) {
                if (slot.time.includes('-')) {
                    [startTime, endTime] = slot.time.split('-').map(t => t.trim());
                } else {
                    startTime = slot.time;
                }
            }

            return `
                <div class="editor-day-row ${isChecked ? 'active' : ''}">
                    <label class="day-checkbox-label">
                        <input type="checkbox" class="day-check" data-day="${day}" ${isChecked ? 'checked' : ''} onchange="this.closest('.editor-day-row').classList.toggle('active', this.checked)">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span class="day-name">${day}</span>
                            <span class="day-time-preview" style="font-size:0.7rem; color:var(--primary-color); font-weight:700;">
                                ${slot && slot.time ? window.AppUtils.formatTime12h(slot.time) : ''}
                            </span>
                        </div>
                    </label>
                    <div class="day-time-inputs">
                        <div class="time-field">
                            <span>من:</span>
                            <input type="time" class="start-time" value="${startTime}" onchange="window.ScheduleActions.updateTimePreview(this)">
                        </div>
                        <div class="time-field">
                            <span>إلى:</span>
                            <input type="time" class="end-time" value="${endTime}" onchange="window.ScheduleActions.updateTimePreview(this)">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    updateTimePreview(input) {
        const row = input.closest('.editor-day-row');
        const start = row.querySelector('.start-time').value;
        const end = row.querySelector('.end-time').value;
        const preview = row.querySelector('.day-time-preview');
        
        if (start && end) {
            preview.textContent = window.AppUtils.formatTime12h(`${start} - ${end}`);
        } else if (start || end) {
            preview.textContent = window.AppUtils.formatTime12h(start || end);
        } else {
            preview.textContent = '';
        }
    },

    close() {
        window.ModalManager.close('groupUnifiedEditorModal');
    },

    save() {
        const nameInput = document.getElementById('editorGroupName');
        const name = nameInput.value.trim();
        if (!name) return alert('يرجى إدخال اسم المجموعة');

        const rows = document.querySelectorAll('.editor-day-row');
        const schedule = [];
        let hasIncompleteTime = false;

        rows.forEach(row => {
            const checkbox = row.querySelector('.day-check');
            if (checkbox.checked) {
                const day = checkbox.dataset.day;
                const start = row.querySelector('.start-time').value;
                const end = row.querySelector('.end-time').value;
                
                if (!start || !end) {
                    hasIncompleteTime = true;
                }
                schedule.push({ day, time: `${start} - ${end}` });
            }
        });

        if (schedule.length === 0) return alert('يرجى اختيار يوم واحد على الأقل للمجموعة');
        if (hasIncompleteTime) return alert('يرجى تحديد وقت البدء والانتهاء للأيام المختارة');

        const groups = window.AttendanceStore.getGroups(this.currentEditStage, this.currentEditGrade);
        
        if (this.isNewGroup) {
            if (groups.some(g => g.name === name)) return alert('اسم المجموعة موجود بالفعل لهذا الصف');
            groups.push({ name, schedule });
        } else {
            const idx = groups.findIndex(g => g.name === this.originalGroupName);
            if (idx !== -1) {
                // If name changed, check for duplicates excluding self
                if (name !== this.originalGroupName && groups.some(g => g.name === name)) {
                    return alert('الاسم الجديد للمجموعة مستخدم بالفعل');
                }
                groups[idx] = { ...groups[idx], name, schedule };
            }
        }

        window.AttendanceStore.saveGroups(this.currentEditStage, this.currentEditGrade, groups);
        this.close();
        
        // Refresh schedule page
        if (window.ScheduleUI) window.ScheduleUI.renderAllSchedules();
        
        // Update active group if it was the one being edited
        const currentStored = window.AttendanceStore.getCurrentGroupName(this.currentEditStage, this.currentEditGrade);
        if (currentStored === this.originalGroupName) {
            window.AttendanceStore.setCurrentGroupName(this.currentEditStage, this.currentEditGrade, name);
        }
    },

    async deleteGroup(stage, grade, groupName) {
        const confirmed = await window.confirm(`هل أنت متأكد من حذف مجموعة "${groupName}" نهائياً بجميع مواعيدها؟`);
        if (!confirmed) return;

        const gradeInt = parseInt(grade);
        const groups = window.AttendanceStore.getGroups(stage, gradeInt);
        const updatedGroups = groups.filter(g => g.name !== groupName);
        
        window.AttendanceStore.saveGroups(stage, gradeInt, updatedGroups);
        window.AppwriteConfig?.deleteGroup?.(stage, gradeInt, groupName).catch(error => {
            console.warn('Appwrite group deletion failed:', error);
        });
        
        // If it was the current active group, clear it
        const currentActive = window.AttendanceStore.getCurrentGroupName(stage, gradeInt);
        if (currentActive === groupName) {
            window.AttendanceStore.setCurrentGroupName(stage, gradeInt, '');
        }

        // Animated Refresh
        const card = document.querySelector(`.schedule-class-card .group-schedule-item[data-group-id="${stage}_${grade}_${groupName}"]`);
        if (card) {
            card.style.animation = 'expelAnimation 0.5s ease forwards';
            setTimeout(() => {
                if (window.ScheduleUI) window.ScheduleUI.renderAllSchedules();
            }, 500);
        } else {
            if (window.ScheduleUI) window.ScheduleUI.renderAllSchedules();
        }
    }
};