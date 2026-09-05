/**
 * Multi-tenant storage and teacher profile state.
 *
 * The application historically used unscoped localStorage keys. This module
 * keeps the public key names used by the UI, while transparently resolving
 * teacher-owned keys to a per-teacher namespace.
 */
(function () {
    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;

    const CURRENT_TEACHER_KEY = 'currentTeacherId';
    const CURRENT_USERNAME_KEY = 'currentTeacherUsername';
    const LOGIN_STATE_KEY = 'loginState';
    const TEACHERS_KEY = 'app_teachers';
    const LEGACY_OWNER_KEY = 'app_legacy_data_owner';
    const TENANT_SUFFIX = '__tenant_';

    // All data that belongs to a teacher must be included here. Static
    // application constants and the current login flag intentionally remain
    // global.
    const SCOPED_PREFIXES = [
        'teacherName',
        'selectedStages',
        'selectedGrades',
        'activeStageFilter',
        'activeGradeFilter',
        'app_last_selected_grade',
        'students_',
        'groups_',
        'attendance_group_',
        'attendance_records_',
        'attendance_session_records_',
        'attendance_sessions_',
        'history_index_',
        'linked_attn_',
        'exam_columns_',
        'exam_grades_',
        'exam_completion_',
        'preferred_exam_term',
        'student_payments_',
        'payment_dates_',
        'month_selections_',
        'start_months_',
        'standard_fees',
        'custom_fees',
        'custom_stages_config',
        'custom_grades_config',
        'operational_expenses_v1',
        'revenue_ledger_v1',
        'financial_report_stage_filter',
        'financial_report_class_filter',
        'graduated_students',
        'expelled_students_',
        'expelled_retention_days',
        'absence_settings_',
        'profile_tab_state_',
        'backup_history',
        'academy_icon_class',
        'theme'
    ];

    const isLocalStorage = storage => storage === window.localStorage;
    const rawGet = key => nativeGetItem.call(window.localStorage, key);
    const rawSet = (key, value) => nativeSetItem.call(window.localStorage, key, value);
    const rawRemove = key => nativeRemoveItem.call(window.localStorage, key);

    function isScopedKey(key) {
        return typeof key === 'string'
            && !key.includes(TENANT_SUFFIX)
            && SCOPED_PREFIXES.some(prefix => key === prefix || key.startsWith(prefix));
    }

    function tenantKey(key, teacherId) {
        return `${key}${TENANT_SUFFIX}${encodeURIComponent(teacherId)}`;
    }

    function parseJson(raw, fallback) {
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
    }

    function stableTeacherId(username) {
        const normalized = String(username || '').trim().toLowerCase();
        let hash = 2166136261;
        for (let index = 0; index < normalized.length; index++) {
            hash ^= normalized.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return `teacher_${(hash >>> 0).toString(36)}`;
    }

    function gradeId(stage, grade) {
        return `${stage}_${Number(grade) || 1}`;
    }

    function extractStageGrade(key, prefix) {
        const match = key.match(new RegExp(`^${prefix.replace('_', '\\_')}([^_]+)_([^_]+)`));
        if (!match) return null;
        return { stage: match[1], grade: Number(match[2]) || 1 };
    }

    function normalizeEntity(entity, teacherId, currentGradeId) {
        if (!entity || typeof entity !== 'object') return entity;
        return {
            ...entity,
            teacherId: entity.teacherId || teacherId,
            gradeId: entity.gradeId || currentGradeId
        };
    }

    window.TenantStore = {
        CURRENT_TEACHER_KEY,
        CURRENT_USERNAME_KEY,
        LOGIN_STATE_KEY,
        TEACHERS_KEY,
        TENANT_SUFFIX,
        SCOPED_PREFIXES,

        rawGet,
        rawSet,
        rawRemove,

        getCurrentTeacherId() {
            return rawGet(CURRENT_TEACHER_KEY);
        },

        getCurrentUsername() {
            return rawGet(CURRENT_USERNAME_KEY);
        },

        getTeacherIdForUsername(username) {
            return stableTeacherId(username);
        },

        getTeacherIdForCurrentUI() {
            const currentTeacherId = this.getCurrentTeacherId();
            if (currentTeacherId) return currentTeacherId;
            const loginUsername = window.Auth?.getCredentials?.().username;
            return loginUsername ? stableTeacherId(loginUsername) : null;
        },

        getGradeId(stage, grade) {
            return gradeId(stage, grade);
        },

        resolveKey(key, teacherId = this.getCurrentTeacherId()) {
            return teacherId && isScopedKey(key) ? tenantKey(key, teacherId) : key;
        },

        get(key, fallback = null, teacherId = this.getCurrentTeacherId()) {
            const value = rawGet(this.resolveKey(key, teacherId));
            return value === null || value === undefined ? fallback : value;
        },

        set(key, value, teacherId = this.getCurrentTeacherId()) {
            rawSet(this.resolveKey(key, teacherId), value);
        },

        remove(key, teacherId = this.getCurrentTeacherId()) {
            rawRemove(this.resolveKey(key, teacherId));
        },

        getProfile(teacherId = this.getCurrentTeacherId()) {
            if (!teacherId) return null;
            const teachers = parseJson(rawGet(TEACHERS_KEY), []);
            const profile = teachers.find(item => item.teacherId === teacherId);
            if (profile) return profile;

            const username = rawGet(CURRENT_USERNAME_KEY) || '';
            return {
                teacherId,
                username,
                teacherName: this.get('teacherName', 'المعلم', teacherId) || 'المعلم',
                settings: {
                    theme: this.get('theme', 'dark', teacherId) || 'dark'
                }
            };
        },

        hasProfile(teacherId = this.getCurrentTeacherId()) {
            if (!teacherId) return false;
            const teachers = parseJson(rawGet(TEACHERS_KEY), []);
            return teachers.some(item => item.teacherId === teacherId);
        },

        saveProfile(profile) {
            if (!profile?.teacherId) return false;
            const teachers = parseJson(rawGet(TEACHERS_KEY), []);
            const index = teachers.findIndex(item => item.teacherId === profile.teacherId);
            if (index === -1) teachers.push(profile);
            else teachers[index] = { ...teachers[index], ...profile };
            rawSet(TEACHERS_KEY, JSON.stringify(teachers));

            // These mirrors keep older UI code compatible while the profile
            // object remains the source of truth for auth/settings.
            this.set('teacherName', profile.teacherName || 'المعلم', profile.teacherId);
            this.set('selectedStages', JSON.stringify(profile.selectedStages || []), profile.teacherId);
            this.set('selectedGrades', JSON.stringify(profile.selectedGrades || {}), profile.teacherId);
            if (profile.settings?.theme) this.set('theme', profile.settings.theme, profile.teacherId);
            return true;
        },

        updateProfile(patch, teacherId = this.getCurrentTeacherId()) {
            const current = this.getProfile(teacherId);
            if (!current) return false;
            const profile = {
                ...current,
                ...patch,
                settings: { ...(current.settings || {}), ...(patch.settings || {}) }
            };
            return this.saveProfile(profile);
        },

        activateSession(username, teacherName, selectedStages, selectedGrades, userId = null) {
            const teacherId = userId || stableTeacherId(username);
            rawSet(CURRENT_TEACHER_KEY, teacherId);
            rawSet(CURRENT_USERNAME_KEY, String(username || '').trim());
            rawSet(LOGIN_STATE_KEY, 'true');

            const existing = this.getProfile(teacherId);
            const profile = {
                teacherId,
                username: String(username || '').trim(),
                teacherName: String(teacherName || existing?.teacherName || 'المعلم').trim() || 'المعلم',
                selectedStages: Array.isArray(selectedStages) && selectedStages.length
                    ? selectedStages
                    : (existing?.selectedStages || []),
                selectedGrades: selectedGrades && Object.keys(selectedGrades).length
                    ? selectedGrades
                    : (existing?.selectedGrades || {}),
                settings: {
                    ...(existing?.settings || {}),
                    theme: existing?.settings?.theme || this.get('theme', 'dark', teacherId) || 'dark'
                }
            };
            this.saveProfile(profile);
            return profile;
        },

        endSession() {
            const teacherId = this.getCurrentTeacherId();
            if (teacherId) {
                this.remove('activeStageFilter', teacherId);
                this.remove('activeGradeFilter', teacherId);
                this.remove('app_last_selected_grade', teacherId);
            }
            rawRemove(CURRENT_TEACHER_KEY);
            rawRemove(CURRENT_USERNAME_KEY);
            rawRemove(LOGIN_STATE_KEY);
        },

        getCurrentTenantKeys() {
            const teacherId = this.getCurrentTeacherId();
            if (!teacherId) return [];
            const suffix = `${TENANT_SUFFIX}${encodeURIComponent(teacherId)}`;
            const keys = [];
            for (let index = 0; index < window.localStorage.length; index++) {
                const key = window.localStorage.key(index);
                if (key && key.endsWith(suffix)) keys.push(key);
            }
            return keys;
        },

        getCurrentTenantData() {
            const teacherId = this.getCurrentTeacherId();
            const data = {};
            if (!teacherId) return data;

            const suffix = `${TENANT_SUFFIX}${encodeURIComponent(teacherId)}`;
            const globalKeys = new Set(['app_data_initialized']);
            for (let index = 0; index < window.localStorage.length; index++) {
                const physicalKey = window.localStorage.key(index);
                if (!physicalKey) continue;
                if (physicalKey.endsWith(suffix)) {
                    const logicalKey = physicalKey.slice(0, -suffix.length);
                    data[logicalKey] = rawGet(physicalKey);
                } else if (globalKeys.has(physicalKey)) {
                    data[physicalKey] = rawGet(physicalKey);
                }
            }
            return data;
        },

        restoreCurrentTenantData(data) {
            const teacherId = this.getCurrentTeacherId();
            if (!teacherId || !data || typeof data !== 'object') return false;

            this.getCurrentTenantKeys().forEach(key => rawRemove(key));
            Object.entries(data).forEach(([logicalKey, value]) => {
                if (logicalKey === CURRENT_TEACHER_KEY
                    || logicalKey === CURRENT_USERNAME_KEY
                    || logicalKey === LOGIN_STATE_KEY
                    || logicalKey === TEACHERS_KEY) {
                    return;
                }
                rawSet(this.resolveKey(logicalKey, teacherId), value);
            });
            return true;
        },

        clearCurrentTeacherData({ preserveProfile = true } = {}) {
            const teacherId = this.getCurrentTeacherId();
            if (!teacherId) return;
            this.getCurrentTenantKeys().forEach(key => rawRemove(key));
            if (preserveProfile) {
                const profile = this.getProfile(teacherId);
                if (profile) this.saveProfile(profile);
            }
        },

        migrateLegacyData(teacherId) {
            // Legacy data is from the original single-teacher app. Assign it
            // once to the first account that logs in, then never expose it to
            // any later account.
            const legacyOwner = rawGet(LEGACY_OWNER_KEY);
            if (legacyOwner && legacyOwner !== teacherId) return;

            let didMigrate = false;
            for (let index = 0; index < window.localStorage.length; index++) {
                const key = window.localStorage.key(index);
                if (!key || !isScopedKey(key) || key.includes(TENANT_SUFFIX)) continue;

                const targetKey = tenantKey(key, teacherId);
                if (rawGet(targetKey) !== null) continue;

                let value = rawGet(key);
                const parsed = parseJson(value, null);

                if (key.startsWith('students_')) {
                    const context = extractStageGrade(key, 'students_');
                    if (context && Array.isArray(parsed)) {
                        value = JSON.stringify(parsed.map((student, idx) => ({
                            ...student,
                            id: student.id ?? `std_${Date.now()}_${idx}`,
                            teacherId,
                            stageId: context.stage,
                            gradeId: gradeId(context.stage, context.grade),
                            serialNo: student.serialNo || idx + 1
                        })));
                    }
                } else if (key.startsWith('groups_')) {
                    const context = extractStageGrade(key, 'groups_');
                    if (context && Array.isArray(parsed)) {
                        value = JSON.stringify(parsed.map(group => normalizeEntity(
                            { ...group, stageId: context.stage },
                            teacherId,
                            gradeId(context.stage, context.grade)
                        )));
                    }
                } else if (key.startsWith('history_index_')) {
                    const context = extractStageGrade(key, 'history_index_');
                    if (context && Array.isArray(parsed)) {
                        value = JSON.stringify(parsed.map(record => normalizeEntity(
                            { ...record, stageId: context.stage },
                            teacherId,
                            gradeId(context.stage, context.grade)
                        )));
                    }
                } else if (key.startsWith('attendance_sessions_')) {
                    const context = extractStageGrade(key, 'attendance_sessions_');
                    if (context && Array.isArray(parsed)) {
                        value = JSON.stringify(parsed.map(session => normalizeEntity(
                            { ...session, stageId: context.stage },
                            teacherId,
                            gradeId(context.stage, context.grade)
                        )));
                    }
                } else if (key.startsWith('exam_columns_')) {
                    const context = key.match(/^exam_columns_([^_]+)_([^_]+)_term(\d+)/);
                    if (context && Array.isArray(parsed)) {
                        value = JSON.stringify(parsed.map((exam, idx) => ({
                            ...(typeof exam === 'string' ? { name: exam, totalScore: 100 } : exam),
                            name: typeof exam === 'string' ? exam : (exam?.name || exam?.title || 'امتحان'),
                            title: typeof exam === 'string' ? exam : (exam?.title || exam?.name || 'امتحان'),
                            totalScore: Number(typeof exam === 'string' ? 100 : (exam?.totalScore ?? exam?.maxScore ?? 100)),
                            maxScore: Number(typeof exam === 'string' ? 100 : (exam?.maxScore ?? exam?.totalScore ?? 100)),
                            examId: exam?.examId || `exam_${teacherId}_${context[1]}_${context[2]}_${context[3]}_${idx}`,
                            teacherId,
                            stageId: context[1],
                            gradeId: gradeId(context[1], context[2])
                        })));
                    }
                } else if (key === 'operational_expenses_v1' || key === 'revenue_ledger_v1') {
                    if (Array.isArray(parsed)) {
                        value = JSON.stringify(parsed.map(item => ({ ...item, teacherId })));
                    }
                } else if (key === 'graduated_students' && Array.isArray(parsed)) {
                    value = JSON.stringify(parsed.map(batch => ({
                        ...batch,
                        teacherId,
                        students: (batch.students || []).map(student => ({ ...student, teacherId }))
                    })));
                }

                rawSet(targetKey, value);
                didMigrate = true;
            }

            if (didMigrate && !legacyOwner) rawSet(LEGACY_OWNER_KEY, teacherId);
        },

        migratePreviousLocalOwner(teacherId) {
            const previousOwner = rawGet(LEGACY_OWNER_KEY);
            const migratedOwnerKey = 'appwrite_legacy_google_owner';
            const migratedOwner = rawGet(migratedOwnerKey);
            if (!previousOwner || previousOwner === teacherId || (migratedOwner && migratedOwner !== teacherId)) return false;
            let migrated = false;
            const suffix = `${TENANT_SUFFIX}${encodeURIComponent(previousOwner)}`;
            for (let index = 0; index < window.localStorage.length; index++) {
                const key = window.localStorage.key(index);
                if (!key || !key.endsWith(suffix)) continue;
                const baseKey = key.slice(0, -suffix.length);
                const targetKey = tenantKey(baseKey, teacherId);
                if (rawGet(targetKey) === null) {
                    rawSet(targetKey, rawGet(key));
                    migrated = true;
                }
            }
            if (migrated) rawSet(migratedOwnerKey, teacherId);
            return migrated;
        }
    };

    // Keep existing modules source-compatible: localStorage.getItem('...') is
    // resolved against the current teacher automatically for data keys.
    Storage.prototype.getItem = function (key) {
        if (isLocalStorage(this)) {
            return nativeGetItem.call(this, window.TenantStore.resolveKey(key));
        }
        return nativeGetItem.call(this, key);
    };

    Storage.prototype.setItem = function (key, value) {
        if (isLocalStorage(this)) {
            return nativeSetItem.call(this, window.TenantStore.resolveKey(key), value);
        }
        return nativeSetItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function (key) {
        if (isLocalStorage(this)) {
            return nativeRemoveItem.call(this, window.TenantStore.resolveKey(key));
        }
        return nativeRemoveItem.call(this, key);
    };
})();
