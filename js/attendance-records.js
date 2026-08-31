window.AttendanceRecords = {
    parent: null,
    previousView: 'attendance',

    init(parent) {
        this.parent = parent;
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Local back buttons removed in favor of global header back button
    },

    openRecordsDashboard() {
        this.previousView = 'attendance';
        const stage = (this.parent && this.parent.currentStage) || window.GlobalStageFilter.getActiveStage();
        const grade = (this.parent && this.parent.currentGrade) || window.GlobalStageFilter.getActiveGrade();
        
        const history = window.AttendanceStore.getHistory(stage, grade);
        const students = window.StudentStore.getStudents(stage, grade)
            .filter(s => s.name)
            .map((s, idx) => ({ ...s, serial: window.StudentStore.getSerial(s, idx + 1) }));
        
        const container = document.getElementById('viewRecordsHistoryContainer');
        const searchInput = document.getElementById('viewRecordsSearchInput');
        const dateInput = document.getElementById('viewRecordsDateInput');
        const attendanceListBtn = document.getElementById('btnViewAttendanceList');
        const absenceListBtn = document.getElementById('btnViewAbsenceList');
        const masterListBtn = document.getElementById('btnViewMasterList');

        let currentStatusFilter = '';

        // Debounced render for performance
        let renderTimeout;
        const render = () => {
            clearTimeout(renderTimeout);
            renderTimeout = setTimeout(() => {
                const selectedDate = dateInput.value;
                
                // Conditional View Logic
                if (!selectedDate) {
                    attendanceListBtn.style.display = 'none';
                    absenceListBtn.style.display = 'none';
                    masterListBtn.style.display = 'none';
                    
                    window.RecordsUI.renderStudentOverview(container, students, {
                        searchQuery: searchInput.value,
                        onViewDetails: (id) => this.openStudentProfile(id, 'records')
                    });
                } else {
                    attendanceListBtn.style.display = 'inline-block';
                    absenceListBtn.style.display = 'inline-block';
                    masterListBtn.style.display = 'inline-block';
                    
                    window.RecordsUI.renderRecordsHistory(container, history, students, {
                        searchQuery: searchInput.value,
                        filterDate: selectedDate,
                        filterStatus: currentStatusFilter,
                        onNameClick: (id) => this.openStudentProfile(id, 'records')
                    });
                }
            }, 150); // 150ms debounce
        };

        const updateFilterButtons = (activeBtn) => {
            [masterListBtn, attendanceListBtn, absenceListBtn].forEach(btn => btn.classList.remove('active'));
            activeBtn.classList.add('active');
        };

        // Debounced search
        searchInput.oninput = render;
        
        // State toggle: re-render when date selection changes
        dateInput.onchange = render;

        // Filter actions (only visible in Date View)
        masterListBtn.onclick = () => { currentStatusFilter = ''; updateFilterButtons(masterListBtn); render(); };
        attendanceListBtn.onclick = () => { currentStatusFilter = 'present'; updateFilterButtons(attendanceListBtn); render(); };
        absenceListBtn.onclick = () => { currentStatusFilter = 'absent'; updateFilterButtons(absenceListBtn); render(); };

        // Navigate to records page and initialize with default view
        window.Navigation.switchView('records');
        render();
    },

    openGroupAttendanceDashboard() {
        if (window.GroupAttendanceArchive) {
            this.previousView = 'attendance';
            return window.GroupAttendanceArchive.open();
        }

        const stage = (this.parent && this.parent.currentStage)
            || window.GlobalStageFilter.getActiveStage();
        const grade = (this.parent && this.parent.currentGrade)
            || window.GlobalStageFilter.getActiveGrade();
        const container = document.getElementById('groupAttendanceHistoryContainer');
        if (!container) return;

        window.AttendanceStore.finalizeDueSessions(stage, grade);
        const groups = window.AttendanceStore.getGroups(stage, grade);
        const history = window.AttendanceStore.getHistory(stage, grade);
        const escapeHtml = value => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const formatNumber = value => window.AppUtils?.formatNumber
            ? window.AppUtils.formatNumber(value)
            : String(value);
        const stageName = window.STUDENT_CONFIG?.stageData?.[stage]?.name || stage || '---';
        const gradeName = stage && grade && window.STUDENT_CONFIG?.gradeNames?.[stage]
            ? window.STUDENT_CONFIG.gradeNames[stage][grade - 1]
            : 'كافة الصفوف';

        const groupRows = groups.map(group => {
            const records = history.filter(record => record.groupName === group.name);
            const present = records.filter(record => record.status === 'present').length;
            const absent = records.filter(record => record.status === 'absent').length;
            const total = present + absent;
            const rate = total ? Math.round((present / total) * 100) : 0;
            const dates = [...new Set(records.map(record => record.date))];
            const lastRecord = records
                .slice()
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

            return `
                <tr class="group-attendance-summary-row" data-group-name="${escapeHtml(group.name)}" tabindex="0" role="button" title="عرض تفاصيل المجموعة">
                    <td class="group-report-name">
                        <i class="fas fa-users"></i>
                        <strong>${escapeHtml(group.name)}</strong>
                    </td>
                    <td>${formatNumber(dates.length)}</td>
                    <td class="group-report-present">${formatNumber(present)}</td>
                    <td class="group-report-absent">${formatNumber(absent)}</td>
                    <td><span class="group-attendance-rate">${formatNumber(rate)}%</span></td>
                    <td>${escapeHtml(lastRecord?.dayName || 'لا توجد سجلات')}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="group-attendance-report-context">
                <i class="fas fa-layer-group"></i>
                <span>المرحلة: <strong>${escapeHtml(stageName)}</strong> | الصف: <strong>${escapeHtml(gradeName)}</strong></span>
            </div>
            ${groups.length ? `
                <div class="table-responsive">
                    <table class="attendance-table group-attendance-summary-table">
                        <thead>
                            <tr>
                                <th>المجموعة</th>
                                <th>أيام التسجيل</th>
                                <th>حاضر</th>
                                <th>غائب</th>
                                <th>نسبة الحضور</th>
                                <th>آخر تحديث</th>
                            </tr>
                        </thead>
                        <tbody>${groupRows}</tbody>
                    </table>
                </div>
            ` : `
                <div class="placeholder-content">
                    <i class="fas fa-users-slash"></i>
                    <p>لا توجد مجموعات مسجلة لهذا الصف.</p>
                </div>
            `}
        `;

        container.querySelectorAll('.group-attendance-summary-row').forEach(row => {
            const openDetails = () => this.openGroupDetailedAttendance(row.dataset.groupName);
            row.onclick = openDetails;
            row.onkeydown = event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetails();
                }
            };
        });

        window.ModalManager.open('groupAttendanceHistoryModal');
    },

    openGroupDetailedAttendance(groupName, selectedSessionId = null) {
        if (window.GroupAttendanceArchive) {
            return window.GroupAttendanceArchive.open({ groupName, sessionId: selectedSessionId });
        }

        const stage = (this.parent && this.parent.currentStage)
            || window.GlobalStageFilter.getActiveStage();
        const grade = (this.parent && this.parent.currentGrade)
            || window.GlobalStageFilter.getActiveGrade();
        const container = document.getElementById('groupAttendanceHistoryContainer');
        if (!container) return;

        const escapeHtml = value => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const formatNumber = value => window.AppUtils?.formatNumber
            ? window.AppUtils.formatNumber(value)
            : String(value);
        const sessions = window.AttendanceStore.getCompletedSessions(stage, grade, groupName);
        const selectedSession = sessions.find(session => session.id === selectedSessionId) || sessions[0] || null;
        const students = window.StudentStore.getStudents(stage, grade)
            .filter(student => student.name)
            .map((student, index) => ({ ...student, serial: index + 1 }));
        const records = selectedSession?.records || {};

        const rows = selectedSession
            ? students.map(student => {
                const status = records[student.id] || 'absent';
                return `
                    <tr>
                        <td>${formatNumber(student.serial)}</td>
                        <td class="group-detail-student-name">
                            <a href="#" class="student-name-link" data-student-id="${student.id}" data-from-view="records">
                                ${escapeHtml(student.name)}
                            </a>
                        </td>
                        <td>
                            <span class="status-badge ${status === 'present' ? 'attended' : 'absent'}">
                                <i class="fas ${status === 'present' ? 'fa-check' : 'fa-times'}"></i>
                                ${status === 'present' ? 'حاضر' : 'غائب'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('')
            : `
                <tr>
                    <td colspan="3" class="empty-row">لا توجد جلسات مؤرشفة لهذه المجموعة بعد.</td>
                </tr>
            `;

        container.innerHTML = `
            <div class="group-detail-toolbar">
                <button type="button" id="backToGroupAttendanceSummary" class="group-detail-back-btn">
                    <i class="fas fa-arrow-right"></i>
                    العودة للمجاميع
                </button>
                <strong><i class="fas fa-users"></i> ${escapeHtml(groupName)}</strong>
            </div>
            ${sessions.length ? `
                <label class="group-session-filter">
                    <i class="fas fa-clock-rotate-left"></i>
                    <span>الجلسة المؤرشفة:</span>
                    <select id="groupDetailedSessionSelect">
                        ${sessions.map(session => `
                            <option value="${escapeHtml(session.id)}" ${session.id === selectedSession?.id ? 'selected' : ''}>
                                ${escapeHtml(`${session.dayName} - ${session.dateLabel} - ${session.timeSlot} - ${session.groupName}`)}
                            </option>
                        `).join('')}
                    </select>
                </label>
                ${selectedSession ? `
                    <div class="group-detail-session-meta">
                        <span><i class="fas fa-calendar-day"></i> ${escapeHtml(selectedSession.dateLabel)}</span>
                        <span><i class="fas fa-clock"></i> ${escapeHtml(selectedSession.timeSlot)}</span>
                        <span><i class="fas fa-user-check"></i> ${formatNumber(Object.values(records).filter(status => status === 'present').length)} حاضر</span>
                        <span><i class="fas fa-user-xmark"></i> ${formatNumber(Object.values(records).filter(status => status !== 'present').length)} غائب</span>
                    </div>
                ` : ''}
            ` : ''}
            <div class="table-responsive">
                <table class="attendance-table group-attendance-detail-table">
                    <thead>
                        <tr>
                            <th>م</th>
                            <th>اسم الطالب</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        document.getElementById('backToGroupAttendanceSummary').onclick = () => this.openGroupAttendanceDashboard();
        const sessionSelect = document.getElementById('groupDetailedSessionSelect');
        if (sessionSelect) {
            sessionSelect.onchange = event => this.openGroupDetailedAttendance(groupName, event.target.value);
        }
    },

    openStudentProfile(studentId, fromView = 'attendance', targetStage = null, targetGrade = null) {
        this.previousView = fromView;
        const stage = targetStage || (this.parent && this.parent.currentStage) || window.GlobalStageFilter.getActiveStage();
        const grade = targetGrade || (this.parent && this.parent.currentGrade) || window.GlobalStageFilter.getActiveGrade();
        const students = window.StudentStore.getStudents(stage, grade);
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const history = window.AttendanceStore.getStudentHistory(stage, grade, studentId);
        const stageData = window.STUDENT_CONFIG.stageData[stage];
        const stageName = stageData.name;
        const gradeName = (stageData.isFlat || stage.startsWith('custom_')) ? stageName : window.STUDENT_CONFIG.gradeNames[stage][grade - 1];

        if (student) {
            student.studentCode = window.AppUtils.formatNumber(student.studentCode);
        }

        window.ProfileUI.renderProfileHeader(document.getElementById('studentProfileHeader'), student, stageName, gradeName);

        if (window.ProfilePrint) {
            window.ProfilePrint.setStudent({
                student, stage, grade, stageName, gradeName,
                history
            });
        }

        const tabBtns = document.querySelectorAll('.profile-tab-btn');
        const tabSections = {
            attendance: document.getElementById('profileAttendanceSection'),
            finance: document.getElementById('profileFinanceSection'),
            exams: document.getElementById('profileExamsSection')
        };

        const savedState = window.PersistenceManager.ProfileTabState.load(studentId);

        const switchTab = (tab) => {
            const liveTabBtns = document.querySelectorAll('.profile-tab-btn');
            liveTabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
            Object.keys(tabSections).forEach(key => {
                const s = tabSections[key];
                if (!s) return;
                const isActive = key === tab;
                s.classList.toggle('active', isActive);
                s.style.display = isActive ? 'block' : 'none';
            });
        };

        tabBtns.forEach(btn => {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
        });

        const freshTabBtns = document.querySelectorAll('.profile-tab-btn');
        freshTabBtns.forEach(btn => {
            btn.onclick = () => {
                switchTab(btn.dataset.tab);
                window.PersistenceManager.ProfileTabState.save(studentId, {
                    activeTab: btn.dataset.tab,
                    attendFilter: currentAttendFilter || 'all',
                    finFilter: currentFinFilter || 'all',
                    examFilter: currentExamFilter || 'all'
                });
            };
        });

        const attendContainer = document.getElementById('viewStudentProfileHistory');
        const searchInput = document.getElementById('viewProfileSearchInput');

        let currentAttendFilter = savedState && savedState.attendFilter && savedState.attendFilter !== 'all' ? savedState.attendFilter : '';
        let currentFinFilter = savedState && savedState.finFilter && savedState.finFilter !== 'all' ? savedState.finFilter : '';
        let currentExamFilter = savedState && savedState.examFilter && savedState.examFilter !== 'all' ? savedState.examFilter : '';

        const renderAttend = () => {
            window.ProfileUI.renderStudentProfileHistory(attendContainer, history, {
                searchQuery: searchInput ? searchInput.value : '',
                statusFilter: currentAttendFilter
            });
        };

        const renderFinance = () => {
            window.ProfileUI.renderFinancialLedger(
                document.getElementById('viewStudentFinanceHistory'),
                student, stage, grade,
                { statusFilter: currentFinFilter }
            );
        };

        const renderExams = () => {
            window.ProfileUI.renderExamGradesLedger(
                document.getElementById('viewStudentExamGrades'),
                studentId, stage, grade,
                { statusFilter: currentExamFilter }
            );
        };

        const setActiveInGroup = (group, btn) => {
            group.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };

        const attendFilterBtns = document.querySelectorAll('[data-attend-filter]');
        attendFilterBtns.forEach(btn => {
            btn.onclick = () => {
                switchTab('attendance');
                setActiveInGroup(attendFilterBtns, btn);
                currentAttendFilter = btn.dataset.attendFilter === 'all' ? '' : btn.dataset.attendFilter;
                renderAttend();
                window.PersistenceManager.ProfileTabState.save(studentId, {
                    activeTab: 'attendance',
                    attendFilter: currentAttendFilter || 'all',
                    finFilter: currentFinFilter || 'all',
                    examFilter: currentExamFilter || 'all'
                });
            };
        });

        const finFilterBtns = document.querySelectorAll('[data-fin-filter]');
        finFilterBtns.forEach(btn => {
            btn.onclick = () => {
                switchTab('finance');
                setActiveInGroup(finFilterBtns, btn);
                currentFinFilter = btn.dataset.finFilter === 'all' ? '' : btn.dataset.finFilter;
                renderFinance();
                window.PersistenceManager.ProfileTabState.save(studentId, {
                    activeTab: 'finance',
                    attendFilter: currentAttendFilter || 'all',
                    finFilter: currentFinFilter || 'all',
                    examFilter: currentExamFilter || 'all'
                });
            };
        });

        const examFilterBtns = document.querySelectorAll('[data-exam-filter]');
        examFilterBtns.forEach(btn => {
            btn.onclick = () => {
                switchTab('exams');
                setActiveInGroup(examFilterBtns, btn);
                currentExamFilter = btn.dataset.examFilter === 'all' ? '' : btn.dataset.examFilter;
                renderExams();
                window.PersistenceManager.ProfileTabState.save(studentId, {
                    activeTab: 'exams',
                    attendFilter: currentAttendFilter || 'all',
                    finFilter: currentFinFilter || 'all',
                    examFilter: currentExamFilter || 'all'
                });
            };
        });

        const syncFilterGroup = (buttons, dataKey, activeValue) => {
            buttons.forEach(btn => {
                const value = btn.dataset[dataKey];
                btn.classList.toggle('active', value === (activeValue || 'all'));
            });
        };

        // Reset shared DOM controls before applying this student's saved state.
        syncFilterGroup(attendFilterBtns, 'attendFilter', currentAttendFilter);
        syncFilterGroup(finFilterBtns, 'finFilter', currentFinFilter);
        syncFilterGroup(examFilterBtns, 'examFilter', currentExamFilter);

        // Restore saved tab and filter states
        if (savedState) {
            if (savedState.activeTab) {
                switchTab(savedState.activeTab);
            }
            if (savedState.attendFilter && savedState.attendFilter !== 'all') {
                attendFilterBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.attendFilter === savedState.attendFilter);
                });
            }
            if (savedState.finFilter && savedState.finFilter !== 'all') {
                finFilterBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.finFilter === savedState.finFilter);
                });
            }
            if (savedState.examFilter && savedState.examFilter !== 'all') {
                examFilterBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.examFilter === savedState.examFilter);
                });
            }
        }

        if (searchInput) {
            const clone = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(clone, searchInput);
            clone.oninput = renderAttend;
        }

        window.Navigation.switchView('profile');
        renderAttend();
        renderFinance();
        renderExams();
    }
};
