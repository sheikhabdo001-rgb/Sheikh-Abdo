// Data management for Attendance and Groups
window.AttendanceStore = {
    getAbsenceSettingsKey(stage, grade) {
        return `absence_settings_${stage}_${grade}`;
    },

    getExpelledRetentionDaysKey() {
        return 'expelled_retention_days';
    },

    getExpelledRetentionDays(stage = null, grade = null) {
        const globalRetentionDays = Number(
            localStorage.getItem(this.getExpelledRetentionDaysKey())
        );
        if (Number.isFinite(globalRetentionDays) && globalRetentionDays >= 1) {
            return Math.floor(globalRetentionDays);
        }

        if (stage && grade) {
            try {
                const saved = JSON.parse(
                    localStorage.getItem(this.getAbsenceSettingsKey(stage, grade)) || '{}'
                );
                const savedRetentionDays = Number(saved.retentionDays);
                if (Number.isFinite(savedRetentionDays) && savedRetentionDays >= 1) {
                    return Math.floor(savedRetentionDays);
                }
            } catch (error) {}
        }
        return 30;
    },

    getAbsenceSettings(stage, grade) {
        const defaultSettings = { maxAllowedAbsences: 4, retentionDays: 30 };
        if (!stage || !grade) return defaultSettings;

        try {
            const saved = JSON.parse(
                localStorage.getItem(this.getAbsenceSettingsKey(stage, grade)) || '{}'
            );
            const maxAllowedAbsences = Number(saved.maxAllowedAbsences);
            return {
                maxAllowedAbsences: Number.isFinite(maxAllowedAbsences) && maxAllowedAbsences >= 1
                    ? Math.floor(maxAllowedAbsences)
                    : defaultSettings.maxAllowedAbsences,
                retentionDays: this.getExpelledRetentionDays(stage, grade)
            };
        } catch (error) {
            return defaultSettings;
        }
    },

    saveAbsenceSettings(stage, grade, settings = {}) {
        if (!stage || !grade) return false;
        const maxAllowedAbsences = Number(settings.maxAllowedAbsences);
        const currentSettings = this.getAbsenceSettings(stage, grade);
        const retentionDays = settings.retentionDays === undefined
            ? currentSettings.retentionDays
            : Number(settings.retentionDays);
        if (!Number.isFinite(maxAllowedAbsences) || maxAllowedAbsences < 1) return false;
        if (!Number.isFinite(retentionDays) || retentionDays < 1) return false;

        localStorage.setItem(
            this.getAbsenceSettingsKey(stage, grade),
            JSON.stringify({
                maxAllowedAbsences: Math.floor(maxAllowedAbsences),
                retentionDays: Math.floor(retentionDays)
            })
        );
        localStorage.setItem(
            this.getExpelledRetentionDaysKey(),
            String(Math.floor(retentionDays))
        );
        return true;
    },

    getGroupsKey(stage, grade) {
        return `groups_${stage}_${grade}`;
    },

    getAttendanceKey(stage, grade) {
        return `attendance_group_${stage}_${grade}`;
    },

    getAttendanceRecordsKey(stage, grade, groupName, date = new Date()) {
        // Legacy daily key retained for backwards compatibility.
        const dateStr = date instanceof Date ? date.toDateString() : String(date);
        return `attendance_records_${stage}_${grade}_${groupName}_${dateStr}`;
    },

    getSessionRecordsKey(sessionId) {
        return `attendance_session_records_${sessionId}`;
    },

    getSessionsKey(stage, grade) {
        return `attendance_sessions_${stage}_${grade}`;
    },

    getDateKey(date = new Date()) {
        const current = date instanceof Date ? date : new Date(date);
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getDayName(date = new Date()) {
        return new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
    },

    getDateLabel(date = new Date()) {
        return new Date(date).toLocaleDateString('ar-EG-u-nu-latn', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    getScheduleEntriesForDate(stage, grade, groupName, date = new Date()) {
        const dayName = this.getDayName(date);
        const group = this.getGroups(stage, grade).find(item => item.name === groupName);
        return (group?.schedule || []).filter(slot => slot.day === dayName && slot.time);
    },

    getSessionId(stage, grade, groupName, date = new Date(), timeSlot = '') {
        return [
            'session',
            stage,
            grade,
            this.getDateKey(date),
            encodeURIComponent(groupName || 'group'),
            encodeURIComponent(timeSlot || 'manual')
        ].join('__');
    },

    getSessionInfo(stage, grade, groupName, date = new Date(), timeSlot = null) {
        const slots = this.getScheduleEntriesForDate(stage, grade, groupName, date);
        const slot = timeSlot
            ? slots.find(item => item.time === timeSlot) || { time: timeSlot }
            : slots[0];
        const resolvedTime = slot?.time || 'وقت غير محدد';

        return {
            id: this.getSessionId(stage, grade, groupName, date, resolvedTime),
            teacherId: window.TenantStore?.getCurrentTeacherId() || null,
            stageId: stage,
            gradeId: window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`,
            stage,
            grade,
            groupName,
            dateKey: this.getDateKey(date),
            date: new Date(date).toDateString(),
            dateLabel: this.getDateLabel(date),
            dayName: this.getDayName(date),
            timeSlot: resolvedTime,
            linkId: slot?.linkId || null
        };
    },

    getSessionEndDate(date, timeSlot) {
        const matches = String(timeSlot || '').match(/\d{1,2}:\d{2}/g) || [];
        if (!matches.length) return null;
        const endTime = matches[matches.length - 1].split(':').map(Number);
        const endDate = new Date(date);
        endDate.setHours(endTime[0], endTime[1], 0, 0);

        // Schedules currently store a single start time. Use a one-hour
        // session window unless the stored value already contains an end time.
        if (matches.length === 1) endDate.setHours(endDate.getHours() + 1);
        return endDate;
    },

    isSessionComplete(date, timeSlot, now = new Date()) {
        const endDate = this.getSessionEndDate(date, timeSlot);
        return Boolean(endDate && endDate.getTime() <= new Date(now).getTime());
    },

    getGroups(stage, grade) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        const currentGradeId = window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`;
        const data = localStorage.getItem(this.getGroupsKey(stage, grade));
        const groups = data ? JSON.parse(data) : [
            { name: 'المجموعة 1', schedule: [] },
            { name: 'المجموعة 2', schedule: [] },
            { name: 'المجموعة 3', schedule: [] }
        ];
        if (!teacherId) return [];
        const normalizedGroups = (Array.isArray(groups) ? groups : [])
            .map(group => ({
                ...group,
                teacherId: group.teacherId || teacherId,
                stageId: group.stageId || stage,
                gradeId: group.gradeId || currentGradeId
            }))
            .filter(group => group.teacherId === teacherId
                && group.stageId === stage
                && group.gradeId === currentGradeId);
        return normalizedGroups;
    },

    saveGroups(stage, grade, groups) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId) return;
        const currentGradeId = window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`;
        const normalizedGroups = (Array.isArray(groups) ? groups : []).map(group => ({
            ...group,
            teacherId,
            stageId: stage,
            gradeId: currentGradeId
        }));
        localStorage.setItem(this.getGroupsKey(stage, grade), JSON.stringify(normalizedGroups));
        window.AppwriteConfig?.syncGroups?.(normalizedGroups).catch(error => {
            console.warn('Appwrite group sync failed:', error);
        });
    },

    getAllGroupsPlatform() {
        const allGroups = [];
        const stages = window.Auth?.getSelectedStages?.()
            || Object.keys(window.STUDENT_CONFIG?.stageData || {});
        const selectedGrades = window.Auth?.getSelectedGrades?.() || {};
        
        stages.forEach(stage => {
            const stageInfo = window.STUDENT_CONFIG?.stageData?.[stage];
            if (!stageInfo) return;
            const grades = selectedGrades[stage]
                || (stageInfo.isFlat || stage.startsWith('custom_')
                    ? [1]
                    : (window.STUDENT_CONFIG.gradeNames[stage] || []).map((_, index) => index + 1));
            grades.forEach(grade => {
                this.getGroups(stage, grade).forEach(group => {
                    allGroups.push({
                        ...group,
                        stage,
                        grade,
                        stageName: stageInfo.name,
                        gradeName: stageInfo.isFlat || stage.startsWith('custom_')
                            ? stageInfo.name
                            : window.STUDENT_CONFIG.gradeNames[stage][grade - 1]
                    });
                });
            });
        });
        return allGroups;
    },

    getAttendanceRecords(stage, grade, groupName, date = new Date(), sessionId = null) {
        if (!groupName) return {};
        const sessionData = sessionId
            ? localStorage.getItem(this.getSessionRecordsKey(sessionId))
            : null;
        const data = sessionData || localStorage.getItem(this.getAttendanceRecordsKey(stage, grade, groupName, date));
        return data ? JSON.parse(data) : {};
    },

    saveAttendanceRecord(stage, grade, groupName, studentId, status, options = {}) {
        // Validation
        if (!stage || !grade || !groupName || !studentId || !status) {
            console.error('Invalid attendance record data');
            return;
        }
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        const studentBelongsToGrade = teacherId
            && window.StudentStore?.getStudents(stage, grade)
                .some(student => String(student.id) === String(studentId));
        if (!studentBelongsToGrade) {
            console.error('Attendance student is outside the current teacher/grade scope');
            return;
        }
        
        const date = options.date instanceof Date ? options.date : new Date(options.date || Date.now());
        const dateStr = date.toDateString();
        const sessionInfo = this.getSessionInfo(stage, grade, groupName, date, options.timeSlot);
        const sessionId = options.sessionId || (sessionInfo.timeSlot !== 'وقت غير محدد' ? sessionInfo.id : null);
        const records = this.getAttendanceRecords(stage, grade, groupName, date, sessionId);
        
        // Prevent duplicate attendance on same day
        if (records[studentId] && records[studentId] === status) {
            return; // Already recorded with same status
        }
        
        records[studentId] = status;
        const recordsKey = sessionId
            ? this.getSessionRecordsKey(sessionId)
            : this.getAttendanceRecordsKey(stage, grade, groupName, date);
        localStorage.setItem(recordsKey, JSON.stringify(records));

        // Global History Indexing
        const historyKey = `history_index_${stage}_${grade}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        // Remove duplicate record
        const filteredHistory = history.filter(h => {
            if (h.date !== dateStr || h.studentId !== studentId || h.groupName !== groupName) return true;
            return sessionId ? Boolean(h.sessionId && h.sessionId !== sessionId) : Boolean(h.sessionId);
        });
        
        const attendanceRecord = {
            teacherId,
            stageId: stage,
            gradeId: window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`,
            date: dateStr,
            dateKey: this.getDateKey(date),
            dayName: this.getDayName(date),
            groupName: groupName,
            studentId: studentId,
            status: status,
            sessionId,
            timeSlot: sessionInfo.timeSlot,
            source: options.source || 'teacher',
            timestamp: Date.now()
        };
        filteredHistory.push(attendanceRecord);
        
        localStorage.setItem(historyKey, JSON.stringify(filteredHistory));
        window.AppwriteConfig?.syncAttendanceRecord?.(attendanceRecord).catch(error => {
            console.warn('Appwrite attendance sync failed:', error);
        });
    },

    getSessions(stage, grade) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        const currentGradeId = window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`;
        if (!teacherId) return [];
        return JSON.parse(localStorage.getItem(this.getSessionsKey(stage, grade)) || '[]')
            .map(session => ({
                ...session,
                teacherId: session.teacherId || teacherId,
                stageId: session.stageId || stage,
                gradeId: session.gradeId || currentGradeId
            }))
            .filter(session => session.teacherId === teacherId
                && session.stageId === stage
                && session.gradeId === currentGradeId);
    },

    saveSessions(stage, grade, sessions) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId) return;
        const currentGradeId = window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`;
        const normalized = (Array.isArray(sessions) ? sessions : []).map(session => ({
            ...session,
            teacherId,
            stageId: stage,
            gradeId: currentGradeId
        }));
        localStorage.setItem(this.getSessionsKey(stage, grade), JSON.stringify(normalized));
    },

    saveSession(stage, grade, session) {
        const sessions = this.getSessions(stage, grade);
        const index = sessions.findIndex(item => item.id === session.id);
        if (index === -1) sessions.push(session);
        else sessions[index] = { ...sessions[index], ...session };
        this.saveSessions(stage, grade, sessions);
        return session;
    },

    getCompletedSessions(stage, grade, groupName = null) {
        const sessions = this.getSessions(stage, grade)
            .filter(session => session.completed && (!groupName || session.groupName === groupName))
            .map(session => ({ ...session, records: { ...(session.records || {}) } }));
        const knownIds = new Set(sessions.map(session => session.id));
        const history = this.getHistory(stage, grade);
        const legacySessions = new Map();

        history.forEach(record => {
            if (!record.groupName || (groupName && record.groupName !== groupName)) return;
            // Session-aware records only become filterable after their
            // explicit archive snapshot is saved below.
            if (record.sessionId) return;
            const date = new Date(record.date);
            const dateKey = record.dateKey || this.getDateKey(date);
            const timeSlot = record.timeSlot || this.getSessionInfo(stage, grade, record.groupName, date).timeSlot;
            const id = record.sessionId || this.getSessionId(stage, grade, record.groupName, date, timeSlot);
            if (knownIds.has(id)) return;

            if (!legacySessions.has(id)) {
                legacySessions.set(id, {
                    ...this.getSessionInfo(stage, grade, record.groupName, date, timeSlot),
                    id,
                    dateKey,
                    completed: true,
                    completedAt: record.timestamp || Date.now(),
                    records: {}
                });
            }
            legacySessions.get(id).records[record.studentId] = record.status;
        });

        return [...sessions, ...legacySessions.values()]
            .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    },

    getCompletedSession(stage, grade, sessionId) {
        return this.getCompletedSessions(stage, grade).find(session => session.id === sessionId) || null;
    },

    finalizeSessionAttendance(stage, grade, groupName, date = new Date(), options = {}) {
        const sessionInfo = this.getSessionInfo(stage, grade, groupName, date, options.timeSlot);
        const students = this.getStudentsForAttendance
            ? this.getStudentsForAttendance(stage, grade)
            : window.StudentStore.getStudents(stage, grade).filter(student => student.name);
        const linkedData = sessionInfo.linkId ? this.getLinkedAttendance(stage, grade)[sessionInfo.linkId] || {} : {};
        let records = this.getAttendanceRecords(stage, grade, groupName, date, sessionInfo.id);

        students.forEach(student => {
            let status = records[student.id];
            if (!status && linkedData[student.id]) {
                status = linkedData[student.id];
                this.saveAttendanceRecord(stage, grade, groupName, student.id, status, {
                    date,
                    sessionId: sessionInfo.id,
                    timeSlot: sessionInfo.timeSlot,
                    source: 'linked'
                });
            }
            if (!status) {
                this.saveAttendanceRecord(stage, grade, groupName, student.id, 'absent', {
                    date,
                    sessionId: sessionInfo.id,
                    timeSlot: sessionInfo.timeSlot,
                    source: 'auto'
                });
            }
        });

        records = this.getAttendanceRecords(stage, grade, groupName, date, sessionInfo.id);
        return this.saveSession(stage, grade, {
            ...sessionInfo,
            completed: true,
            completedAt: Date.now(),
            completionSource: options.source || 'auto',
            studentIds: students.map(student => student.id),
            records
        });
    },

    finalizeDueSessions(stage, grade, date = new Date()) {
        const completed = [];
        const groups = this.getGroups(stage, grade);
        groups.forEach(group => {
            this.getScheduleEntriesForDate(stage, grade, group.name, date).forEach(slot => {
                const sessionInfo = this.getSessionInfo(stage, grade, group.name, date, slot.time);
                const alreadyCompleted = this.getSessions(stage, grade)
                    .some(session => session.id === sessionInfo.id && session.completed);
                if (this.isSessionComplete(date, slot.time) && !alreadyCompleted) {
                    completed.push(this.finalizeSessionAttendance(stage, grade, group.name, date, {
                        timeSlot: slot.time,
                        source: 'auto'
                    }));
                }
            });
        });
        return completed;
    },

    getHistory(stage, grade) {
        const historyKey = `history_index_${stage}_${grade}`;
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        const currentGradeId = window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`;
        if (!teacherId) return [];
        return JSON.parse(localStorage.getItem(historyKey) || '[]')
            .map(record => ({
                ...record,
                teacherId: record.teacherId || teacherId,
                stageId: record.stageId || stage,
                gradeId: record.gradeId || currentGradeId
            }))
            .filter(record => record.teacherId === teacherId
                && record.stageId === stage
                && record.gradeId === currentGradeId);
    },

    resetStudentAbsenceHistory(stage, grade, studentId) {
        if (!stage || !grade || !studentId) return false;

        const historyKey = `history_index_${stage}_${grade}`;
        let history;
        try {
            history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        } catch (error) {
            history = [];
        }
        if (!Array.isArray(history)) history = [];

        const normalizedStudentId = String(studentId);
        const remainingHistory = history.filter(record => !(
            String(record?.studentId) === normalizedStudentId
            && record?.status !== 'present'
        ));
        localStorage.setItem(historyKey, JSON.stringify(remainingHistory));
        return remainingHistory.length !== history.length;
    },

    getStudentHistory(stage, grade, studentId) {
        const history = this.getHistory(stage, grade);
        // Ensure chronological sorting: newest at top
        return history.filter(h => h.studentId === studentId)
                      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    },

    getCurrentGroupName(stage, grade) {
        return localStorage.getItem(this.getAttendanceKey(stage, grade));
    },

    setCurrentGroupName(stage, grade, name) {
        localStorage.setItem(this.getAttendanceKey(stage, grade), name);
    },

    getWeekKey() {
        const now = new Date();
        const day = now.getDay(); // 0 Sun, 6 Sat
        // Egypt: Saturday is start of week. Saturday=0, Sunday=1... Friday=6
        const diff = (day + 1) % 7; 
        const saturday = new Date(now);
        saturday.setDate(now.getDate() - diff);
        saturday.setHours(0,0,0,0);
        return saturday.toISOString().split('T')[0];
    },

    getLinkedAttendanceKey(stage, grade, weekKey) {
        return `linked_attn_${stage}_${grade}_${weekKey}`;
    },

    getLinkedAttendance(stage, grade) {
        const weekKey = this.getWeekKey();
        const data = localStorage.getItem(this.getLinkedAttendanceKey(stage, grade, weekKey));
        return data ? JSON.parse(data) : {};
    },

    saveLinkedAttendance(stage, grade, studentId, linkId, status) {
        const weekKey = this.getWeekKey();
        const key = this.getLinkedAttendanceKey(stage, grade, weekKey);
        const data = this.getLinkedAttendance(stage, grade);
        
        if (!data[linkId]) data[linkId] = {};
        data[linkId][studentId] = status;
        
        localStorage.setItem(key, JSON.stringify(data));
        this.archiveOldWeeks(stage, grade, weekKey);
    },

    archiveOldWeeks(stage, grade, currentWeekKey) {
        // Simple archival: anything that doesn't match current week key
        // is technically already archived by being a separate key in localstorage
    }
};
