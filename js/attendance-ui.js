// Core UI rendering for Attendance
window.AttendanceUI = {
    updateSummary(groupName, groups) {
        const summaryText = document.getElementById('summaryText');
        if (!groupName) {
            summaryText.innerHTML = 'لم يتم تحديد مجموعة بعد';
            return;
        }

        const group = groups.find(g => g.name === groupName);
        
        if (group && group.schedule && group.schedule.length > 0) {
            const days = group.schedule.map(s => s.day).join(', ');
            const times = [...new Set(group.schedule.map(s => s.time))].join(', ');
            summaryText.innerHTML = `المجموعة: <strong>${group.name}</strong> | الأيام: <strong>${days}</strong> | الوقت: <strong>${times}</strong>`;
        } else {
            summaryText.innerHTML = `المجموعة: <strong>${groupName}</strong> | لم يتم تحديد مواعيد بعد`;
        }
    },

    renderStudentList(container, students, attendanceRecords, onMark, onNameClick, options = {}) {
        const {
            readOnly = false,
            emptyMessage = 'لا يوجد طلاب في هذا الصف'
        } = options;
        if (students.length === 0) {
            container.innerHTML = `<div class="placeholder-content"><i class="fas fa-user-friends"></i><p>${emptyMessage}</p></div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>م</th>
                            <th>كود الطالب</th>
                            <th>اسم الطالب</th>
                            <th style="width: 250px;">حالة الحضور</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => {
                            const status = attendanceRecords[s.id];
                            let statusContent = '';
                            
                            if (status === 'present') {
                                statusContent = `<span class="status-badge attended"><i class="fas fa-check-circle"></i> تم الحضور</span>`;
                            } else if (status === 'absent' || readOnly) {
                                statusContent = `<span class="status-badge absent"><i class="fas fa-times-circle"></i> غائب</span>`;
                            } else {
                                statusContent = `
                                    <div class="attendance-actions">
                                        <button class="mark-btn present" data-id="${s.id}" data-status="present">
                                            <i class="fas fa-user-check"></i> حاضر
                                        </button>
                                        <button class="mark-btn absent" data-id="${s.id}" data-status="absent">
                                            <i class="fas fa-user-times"></i> غائب
                                        </button>
                                    </div>
                                `;
                            }

                            return `
                                <tr>
                                    <td>${s.serial}</td>
                                    <td class="student-code-cell">${s.studentCode || s.code || '------'}</td>
                                    <td class="student-name-cell">
                                        <a href="#" class="clickable-student-link student-name-link" data-student-id="${s.id}" data-from-view="attendance">
                                            ${s.name}
                                        </a>
                                    </td>
                                    <td class="status-cell">${statusContent}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelectorAll('.mark-btn').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.getAttribute('data-id'));
                const status = btn.getAttribute('data-status');
                onMark(id, status);
            };
        });

    },

    showConflictToast(message) {
        const toast = document.getElementById('conflictAlert');
        if (!toast) return;
        if (message) toast.querySelector('span').textContent = message;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 5000);
    }

    // removed renderStudentOverview() {}
    // removed renderRecordsHistory() {}
    // removed renderStudentProfileHistory() {}
    // removed renderGroupsList() {}
    // removed renderGroupSelector() {}
    // removed renderScheduleTable() {}
    // removed renderLinkGroupsManager() {}
};
