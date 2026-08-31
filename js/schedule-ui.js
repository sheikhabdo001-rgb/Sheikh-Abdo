window.ScheduleUI = {
    init() {
        this.renderAllSchedules();
        if (window.ScheduleActions) window.ScheduleActions.init();
    },

    renderAllSchedules() {
        const container = document.getElementById('scheduleTableContainer');
        if (!container) return;

        const selectedStages = window.Auth.getSelectedStages();
        const selectedGrades = window.Auth.getSelectedGrades();
        
        const activeStage = window.GlobalStageFilter.getActiveStage();
        const activeGrade = window.GlobalStageFilter.getActiveGrade();

        let tableRows = [];
        const stagesToProcess = activeStage ? [activeStage] : selectedStages;

        stagesToProcess.forEach(stage => {
            const grades = selectedGrades[stage] || [];
            grades.filter(g => activeGrade ? g === activeGrade : true).sort((a, b) => a - b).forEach(gradeIdx => {
                const stageInfo = window.STUDENT_CONFIG.stageData[stage];
                const gradeName = (stageInfo.isFlat || stage.startsWith('custom_')) 
                    ? stageInfo.name 
                    : window.STUDENT_CONFIG.gradeNames[stage][gradeIdx - 1];
                const groups = window.AttendanceStore.getGroups(stage, gradeIdx);
                const activeGroups = groups.filter(g => g.schedule && g.schedule.length > 0);
                
                if (activeGroups.length > 0) {
                    activeGroups.forEach((group, gIdx) => {
                        tableRows.push({
                            stage,
                            gradeIdx,
                            fullClassName: gradeName,
                            isFirstInClass: gIdx === 0,
                            rowspan: activeGroups.length,
                            groupName: group.name,
                            schedule: group.schedule,
                            groupData: group
                        });
                    });
                }
            });
        });

        if (tableRows.length === 0) {
            container.innerHTML = '<div class="placeholder-content"><i class="fas fa-calendar-xmark"></i><p>لا توجد مجموعات بمواعيد حالياً</p></div>';
            return;
        }

        let html = `
            <div class="table-responsive schedule-table-wrapper dashboard-schedule-container">
                <table class="schedule-data-table dashboard-table">
                    <thead>
                        <tr>
                            <th class="col-class-name">الصف الدراسي</th>
                            <th class="col-group-name">اسم المجموعة</th>
                            <th class="col-days-timing">الأيام والمواعيد</th>
                            <th class="col-actions">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.map((row, idx) => `
                            <tr>
                                ${row.isFirstInClass ? `
                                    <td class="class-name-cell" rowspan="${row.rowspan}">
                                        <div class="class-name-wrapper">
                                            <i class="fas ${window.STUDENT_CONFIG.stageData[row.stage].icon}"></i>
                                            <span>${row.fullClassName}</span>
                                        </div>
                                        <button class="add-group-table-btn" data-stage="${row.stage}" data-grade="${row.gradeIdx}">
                                            <i class="fas fa-plus-circle"></i> إضافة مجموعة
                                        </button>
                                    </td>
                                ` : ''}
                                <td class="group-name-cell">
                                    <i class="fas fa-layer-group"></i>
                                    <span>${row.groupName}</span>
                                </td>
                                <td class="days-timing-cell">
                                    ${this.formatDaysTimingHTML(row.schedule)}
                                </td>
                                <td class="actions-cell">
                                    <div class="table-action-btns">
                                        <button class="table-edit-btn" data-stage="${row.stage}" data-grade="${row.gradeIdx}" data-group-json='${JSON.stringify(row.groupData).replace(/'/g, "&apos;")}'>
                                            <i class="fas fa-pencil-alt"></i>
                                        </button>
                                        <button class="table-delete-btn" data-stage="${row.stage}" data-grade="${row.gradeIdx}" data-group="${row.groupName}">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
        this.setupListeners();
    },



    formatDaysTimingHTML(schedule) {
        if (!schedule || schedule.length === 0) return '--';
        const timeGroups = {};
        schedule.forEach(slot => {
            const time = slot.time || '--:--';
            if (!timeGroups[time]) timeGroups[time] = [];
            timeGroups[time].push(slot.day);
        });

        return Object.entries(timeGroups).map(([time, days]) => {
            const daysText = days.join(' و ');
            const displayTime = window.AppUtils.formatTime12h(time);
            return `
                <div style="margin-bottom:6px;">
                    <span style="font-weight:700; color:white;">${daysText}</span>
                    <span class="time-pill">${displayTime}</span>
                </div>
            `;
        }).join('');
    },

    formatDaysTiming(schedule) {
        if (!schedule || schedule.length === 0) return '--';
        
        // Group by unique times
        const timeGroups = {};
        schedule.forEach(slot => {
            const time = slot.time || '--:--';
            if (!timeGroups[time]) timeGroups[time] = [];
            timeGroups[time].push(slot.day);
        });

        const formatted = Object.entries(timeGroups).map(([time, days]) => {
            const daysText = days.join(' و');
            const displayTime = window.AppUtils.formatTime12h(time);
            return `${daysText} (${displayTime})`;
        });

        return formatted.join(' • ');
    },

    setupListeners() {
        const container = document.getElementById('scheduleTableContainer');
        
        container.querySelectorAll('.table-edit-btn').forEach(btn => {
            btn.onclick = () => {
                const groupData = JSON.parse(btn.dataset.groupJson.replace(/&apos;/g, "'"));
                window.ScheduleActions.openEditor(btn.dataset.stage, btn.dataset.grade, groupData);
            };
        });

        container.querySelectorAll('.table-delete-btn').forEach(btn => {
            btn.onclick = () => {
                window.ScheduleActions.deleteGroup(btn.dataset.stage, btn.dataset.grade, btn.dataset.group);
            };
        });

        container.querySelectorAll('.add-group-table-btn').forEach(btn => {
            btn.onclick = () => {
                window.ScheduleActions.openEditor(btn.dataset.stage, btn.dataset.grade, null);
            };
        });
    },



    isClassActive(day, timeRange) {
        if (!timeRange || !timeRange.includes('-')) return false;
        const now = new Date();
        const currentDayAr = now.toLocaleDateString('ar-EG', { weekday: 'long' });
        if (day !== currentDayAr) return false;

        const [start, end] = timeRange.split('-').map(t => t.trim());
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        
        const startTime = sH * 60 + sM;
        const endTime = eH * 60 + eM;
        const currentTime = now.getHours() * 60 + now.getMinutes();

        return currentTime >= startTime && currentTime <= endTime;
    },

    getDayColor(day) {
        const colors = {
            'السبت': 'blue',
            'الأحد': 'cyan',
            'الاثنين': 'green',
            'الثلاثاء': 'purple',
            'الأربعاء': 'pink',
            'الخميس': 'orange',
            'الجمعة': 'red'
        };
        return colors[day] || 'blue';
    }
};
