// Student management configuration and data logic
window.STUDENT_CONFIG = {
    baseStageData: {
        'primary': { name: 'ابتدائي', icon: 'fa-child', color: '#3b82f6' },
        'preparatory': { name: 'إعدادي', icon: 'fa-book-reader', color: '#10b981' },
        'secondary': { name: 'ثانوي', icon: 'fa-user-graduate', color: '#f97316' }
    },
    baseGradeNames: {
        'primary': ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'],
        'preparatory': ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي'],
        'secondary': ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي']
    },
    
    get stageData() {
        const teacherId = window.TenantStore?.getTeacherIdForCurrentUI?.();
        const custom = JSON.parse(window.TenantStore?.get('custom_stages_config', '{}', teacherId) || '{}');
        return { ...this.baseStageData, ...custom };
    },

    get gradeNames() {
        const teacherId = window.TenantStore?.getTeacherIdForCurrentUI?.();
        const customGrades = JSON.parse(window.TenantStore?.get('custom_grades_config', '{}', teacherId) || '{}');
        const names = { ...this.baseGradeNames, ...customGrades };
        // Ensure even flat custom stages have at least one valid index for internal storage consistency
        Object.keys(this.stageData).forEach(id => {
            if (!names[id]) names[id] = ['عام'];
        });
        return names;
    },

    addCustomStage(name, fee = null, description = null) {
        const id = 'custom_' + Date.now();
        const teacherId = window.TenantStore?.getTeacherIdForCurrentUI?.();
        const customStages = JSON.parse(window.TenantStore?.get('custom_stages_config', '{}', teacherId) || '{}');
        
        customStages[id] = { 
            name: name, 
            icon: 'fa-university', 
            color: '#a855f7',
            class: 'custom-btn',
            miniClass: 'custom-mini',
            description: description || '',
            isFlat: true 
        };
        
        window.TenantStore?.set('custom_stages_config', JSON.stringify(customStages), teacherId);
        
        if (fee) {
            const standardFees = JSON.parse(window.TenantStore?.get('standard_fees', '{}', teacherId) || '{}');
            standardFees[`${id}_1`] = fee;
            window.TenantStore?.set('standard_fees', JSON.stringify(standardFees), teacherId);
            if (window.FinancialData) window.FinancialData.load();
        }

        return id;
    },

    updateCustomStage(id, name, fee = null, description = null) {
        const teacherId = window.TenantStore?.getTeacherIdForCurrentUI?.();
        const customStages = JSON.parse(window.TenantStore?.get('custom_stages_config', '{}', teacherId) || '{}');
        if (!customStages[id]) return;

        customStages[id].name = name;
        customStages[id].description = description || '';
        window.TenantStore?.set('custom_stages_config', JSON.stringify(customStages), teacherId);

        if (fee) {
            const standardFees = JSON.parse(window.TenantStore?.get('standard_fees', '{}', teacherId) || '{}');
            standardFees[`${id}_1`] = fee;
            window.TenantStore?.set('standard_fees', JSON.stringify(standardFees), teacherId);
            if (window.FinancialData) window.FinancialData.load();
        }
    },

    deleteCustomStage(id) {
        const teacherId = window.TenantStore?.getTeacherIdForCurrentUI?.();
        const customStages = JSON.parse(window.TenantStore?.get('custom_stages_config', '{}', teacherId) || '{}');
        delete customStages[id];
        window.TenantStore?.set('custom_stages_config', JSON.stringify(customStages), teacherId);

        // Clean up associated fees
        const standardFees = JSON.parse(window.TenantStore?.get('standard_fees', '{}', teacherId) || '{}');
        delete standardFees[`${id}_1`];
        window.TenantStore?.set('standard_fees', JSON.stringify(standardFees), teacherId);
        
        // Clean up from user selection if active
        let selectedStages = JSON.parse(window.TenantStore?.get('selectedStages', '[]', teacherId) || '[]');
        selectedStages = selectedStages.filter(s => s !== id);
        window.TenantStore?.set('selectedStages', JSON.stringify(selectedStages), teacherId);
        
        if (window.FinancialData) window.FinancialData.load();
    },

    hasStudentsInStage(stageId) {
        // Flat stages only have grade 1
        const students = window.StudentStore.getStudents(stageId, 1);
        return students.some(s => s.name);
    }
};

window.StudentCodeSystem = {
    generate(excludedCodes = []) {
        const excluded = new Set(
            (Array.isArray(excludedCodes) ? excludedCodes : [excludedCodes])
                .filter(code => code !== null && code !== undefined)
                .map(code => String(code))
        );
        let code;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 1000) {
            code = Math.floor(100000 + Math.random() * 899999).toString();
            isUnique = !excluded.has(code) && !this.isCodeUsed(code);
            attempts++;
        }
        return code;
    },

    isCodeUsed(code) {
        const allStudents = window.StudentStore.getAllStudentsSystemWide();
        return allStudents.some(s => String(s.studentCode || s.code || '') === String(code));
    }
};

// Performance cache with timestamp validation
const StudentsCache = {};
const CACHE_TTL = 60000; // 60 seconds cache lifetime

window.StudentStore = {
    isEmptySlot(student) {
        return Boolean(
            student
            && (
                student.is_empty_slot
                || student.isEmptySlot
                || student.is_deleted
                || !String(student.name || '').trim()
            )
        );
    },

    getSerial(student, fallback = 1) {
        const candidates = [
            student?.serial_number,
            student?.serialNumber,
            student?.serialNo
        ];
        const serial = candidates
            .map(value => Number(value))
            .find(value => Number.isFinite(value) && value > 0);
        return serial || fallback;
    },

    clearStudentDetails(student) {
        if (!student) return null;
        const serial = this.getSerial(student);
        return {
            ...student,
            name: '',
            phone: '',
            parentPhone: '',
            studentCode: null,
            code: null,
            serialNo: serial,
            serialNumber: serial,
            serial_number: serial,
            is_empty_slot: true,
            isEmptySlot: true,
            is_deleted: true,
            // These fields describe the deleted student rather than the slot.
            createdAt: null,
            updatedAt: new Date().toISOString(),
            family_group_id: null,
            link_id: null,
            relativeStudentIds: []
        };
    },

    getNextAvailableSerial(stage, grade, students = null, reservedSerials = new Set()) {
        const list = Array.isArray(students)
            ? students
            : this.getStudents(stage, grade);
        const reserved = reservedSerials instanceof Set
            ? reservedSerials
            : new Set(reservedSerials || []);
        const emptySlots = list
            .map((student, index) => ({
                serial: this.getSerial(student, index + 1),
                empty: this.isEmptySlot(student)
            }))
            .filter(slot => slot.empty && !reserved.has(slot.serial))
            .sort((a, b) => a.serial - b.serial);

        if (emptySlots.length) return emptySlots[0].serial;

        const highestSerial = list.reduce(
            (highest, student, index) => Math.max(highest, this.getSerial(student, index + 1)),
            0
        );
        let nextSerial = highestSerial + 1;
        while (reserved.has(nextSerial)) nextSerial += 1;
        return nextSerial;
    },

    findSlotIndex(students, serial) {
        if (!Array.isArray(students)) return -1;
        return students.findIndex((student, index) =>
            this.isEmptySlot(student) && this.getSerial(student, index + 1) === Number(serial)
        );
    },

    getOriginalSerial(record) {
        const candidates = [
            record?.originalSerial,
            record?.original_serial,
            record?.previous_serial,
            record?.serial_number,
            record?.serialNo
        ];
        const serial = candidates
            .map(value => Number(value))
            .find(value => Number.isFinite(value) && value > 0);
        return serial || 0;
    },

    getOriginalStudentCode(record) {
        return [
            record?.originalStudentCode,
            record?.original_student_code,
            record?.studentCode,
            record?.code
        ]
            .map(code => String(code ?? '').trim())
            .find(Boolean) || '';
    },

    generateUniqueStudentCode(originalCode = '') {
        const excludedCode = String(originalCode || '').trim();
        let generatedCode = window.StudentCodeSystem?.generate?.([excludedCode]);

        // StudentCodeSystem.generate already checks active students, but the
        // original code must also change when a reinstatement needs a new slot.
        let attempts = 0;
        while (
            generatedCode
            && String(generatedCode).trim() === excludedCode
            && attempts < 1000
        ) {
            generatedCode = window.StudentCodeSystem?.generate?.([excludedCode]);
            attempts += 1;
        }

        if (
            !generatedCode
            || String(generatedCode).trim() === excludedCode
            || window.StudentCodeSystem?.isCodeUsed?.(generatedCode)
        ) {
            const timeSeed = Number(String(Date.now()).slice(-6)) || 100000;
            for (let offset = 0; offset < 900000; offset += 1) {
                const candidate = String(
                    100000 + ((timeSeed - 100000 + offset + 900000) % 900000)
                );
                if (
                    candidate !== excludedCode
                    && !window.StudentCodeSystem?.isCodeUsed?.(candidate)
                ) {
                    generatedCode = candidate;
                    break;
                }
            }
        }
        return String(generatedCode).trim();
    },

    getRestorePlan(stage, grade, record) {
        const students = this.getStudents(stage, grade);
        const originalSerial = this.getOriginalSerial(record);
        const originalStudentCode = this.getOriginalStudentCode(record);
        const originalSlotIndex = students.findIndex((student, index) =>
            this.getSerial(student, index + 1) === originalSerial
        );
        const originalSlot = originalSlotIndex === -1 ? null : students[originalSlotIndex];
        const originalSlotIsEmpty = Boolean(originalSlot && this.isEmptySlot(originalSlot));
        const isNewCode = !originalSlotIsEmpty;
        const assignedSerial = originalSlotIsEmpty
            ? originalSerial
            : this.getNextAvailableSerial(stage, grade, students);
        const assignedCode = isNewCode
            ? this.generateUniqueStudentCode(originalStudentCode)
            : originalStudentCode;

        return {
            record,
            students,
            originalSlot,
            originalSlotIndex,
            originalSerial,
            originalStudentCode,
            originalSlotIsEmpty,
            assignedSerial,
            assignedCode,
            isNewCode,
            targetIndex: this.findSlotIndex(students, assignedSerial),
            // Explicit aliases make the calculated plan easy to consume by
            // confirmation UIs and integrations using target terminology.
            previousSerial: originalSerial,
            originalCode: originalStudentCode,
            isOriginalSlotEmpty: originalSlotIsEmpty,
            targetSerial: assignedSerial,
            targetCode: assignedCode
        };
    },

    getExpelledStudentsKey(stage, grade) {
        return `expelled_students_${stage}_${grade}`;
    },

    getExpelledStudents(stage, grade) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId || !stage || !grade) return [];

        try {
            const records = JSON.parse(
                localStorage.getItem(this.getExpelledStudentsKey(stage, grade)) || '[]'
            );
            return (Array.isArray(records) ? records : [])
                .filter(record => record && !record.is_restored && !record.restoredAt)
                .map(record => ({
                    ...record,
                    originalSerial: this.getOriginalSerial(record),
                    original_serial: this.getOriginalSerial(record),
                    previous_serial: this.getOriginalSerial(record),
                    originalStudentCode: this.getOriginalStudentCode(record),
                    original_student_code: this.getOriginalStudentCode(record),
                    expulsion_type: record.expulsion_type
                        || record.expulsionType
                        || 'automatic',
                    expulsionType: record.expulsionType
                        || record.expulsion_type
                        || 'automatic'
                }));
        } catch (error) {
            return [];
        }
    },

    saveExpelledStudents(stage, grade, records) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId || !stage || !grade) return false;
        localStorage.setItem(
            this.getExpelledStudentsKey(stage, grade),
            JSON.stringify(Array.isArray(records) ? records : [])
        );
        return true;
    },

    getStudentIdentitySet(studentOrId) {
        const values = typeof studentOrId === 'object' && studentOrId !== null
            ? [
                studentOrId.id,
                studentOrId.studentId,
                studentOrId.student_id,
                studentOrId.originalStudentId,
                studentOrId.original_student_id,
                studentOrId.expelled_student_id
            ]
            : [studentOrId];
        return new Set(
            values
                .filter(value => value !== null && value !== undefined && String(value) !== '')
                .map(value => String(value))
        );
    },

    recordBelongsToStudent(record, identities) {
        if (!record || typeof record !== 'object') return false;
        return [
            record.id,
            record.studentId,
            record.student_id,
            record.studentID,
            record.originalStudentId,
            record.original_student_id,
            record.expelled_student_id
        ].some(value => value !== null
            && value !== undefined
            && identities.has(String(value)));
    },

    getCurrentStorageEntries() {
        const tenantData = window.TenantStore?.getCurrentTenantData?.();
        if (tenantData && typeof tenantData === 'object') {
            return Object.entries(tenantData);
        }

        const entries = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key) entries.push([key, localStorage.getItem(key)]);
        }
        return entries;
    },

    parseStorageValue(rawValue, fallback = null) {
        if (typeof rawValue !== 'string') return fallback;
        try {
            return JSON.parse(rawValue);
        } catch (error) {
            return fallback;
        }
    },

    removeStudentFromIdMap(value, identities) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
        return Object.fromEntries(
            Object.entries(value).filter(([key]) => !identities.has(String(key)))
        );
    },

    removeStudentFromArray(value, identities) {
        if (!Array.isArray(value)) return value;
        return value
            .filter(item => !this.recordBelongsToStudent(item, identities)
                && !(typeof item !== 'object' && identities.has(String(item))))
            .map(item => this.removeStudentReferences(item, identities));
    },

    removeStudentReferences(value, identities) {
        if (Array.isArray(value)) return this.removeStudentFromArray(value, identities);
        if (!value || typeof value !== 'object') return value;

        const cleaned = { ...value };
        [
            'studentIds',
            'student_ids',
            'relativeStudentIds',
            'relative_student_ids',
            'siblingStudentIds',
            'sibling_student_ids',
            'siblingIds',
            'sibling_ids'
        ].forEach(field => {
            if (Array.isArray(cleaned[field])) {
                cleaned[field] = cleaned[field]
                    .filter(id => !identities.has(String(id)));
            }
        });
        [
            'studentId',
            'student_id',
            'studentID',
            'originalStudentId',
            'original_student_id',
            'expelled_student_id'
        ].forEach(field => {
            if (cleaned[field] !== null
                && cleaned[field] !== undefined
                && identities.has(String(cleaned[field]))) {
                delete cleaned[field];
            }
        });
        return cleaned;
    },

    purgeValueForStorageKey(key, value, identities, depth = 0) {
        const dynamicStudentKeyPrefixes = [
            'student_payments_',
            'payment_dates_',
            'profile_tab_state_'
        ];
        if (dynamicStudentKeyPrefixes.some(prefix =>
            key.startsWith(prefix)
            && [...identities].some(identity => key.endsWith(`_${identity}`))
        )) {
            return { remove: true, value: null };
        }

        if (key.startsWith('students_')
            || key.startsWith('expelled_students_')
            || key.startsWith('history_index_')
            || key.startsWith('revenue_ledger_v1')) {
            return {
                remove: false,
                value: this.removeStudentFromArray(value, identities)
            };
        }

        if (key.startsWith('exam_grades_')
            || key.startsWith('attendance_records_')
            || key.startsWith('attendance_session_records_')) {
            return {
                remove: false,
                value: this.removeStudentFromIdMap(value, identities)
            };
        }

        if (key.startsWith('linked_attn_')) {
            const cleaned = Object.fromEntries(
                Object.entries(value || {}).map(([linkId, records]) => [
                    linkId,
                    this.removeStudentFromIdMap(records, identities)
                ])
            );
            return { remove: false, value: cleaned };
        }

        if (key.startsWith('attendance_sessions_')) {
            const sessions = Array.isArray(value) ? value : [];
            return {
                remove: false,
                value: sessions
                    .filter(session => !this.recordBelongsToStudent(session, identities))
                    .map(session => {
                        const cleaned = this.removeStudentReferences(session, identities);
                        if (cleaned.records) {
                            cleaned.records = this.removeStudentFromIdMap(
                                cleaned.records,
                                identities
                            );
                        }
                        return cleaned;
                    })
            };
        }

        if (key === 'graduated_students') {
            return {
                remove: false,
                value: (Array.isArray(value) ? value : [])
                    .map(batch => ({
                        ...batch,
                        students: this.removeStudentFromArray(batch?.students, identities)
                    }))
                    .filter(batch => Array.isArray(batch.students) && batch.students.length)
            };
        }

        if (key === 'backup_history' && Array.isArray(value)) {
            const cleanedHistory = value.map(entry => {
                const backup = this.parseStorageValue(entry?.data, null);
                if (!backup || depth >= 2) return entry;
                return {
                    ...entry,
                    data: JSON.stringify(this.purgeBackupSnapshot(backup, identities, depth + 1))
                };
            });
            return { remove: false, value: cleanedHistory };
        }

        return { remove: false, value: this.removeStudentReferences(value, identities) };
    },

    purgeBackupSnapshot(snapshot, identities, depth = 0) {
        if (!snapshot || typeof snapshot !== 'object' || depth > 2) return snapshot;
        return Object.fromEntries(
            Object.entries(snapshot).reduce((entries, [key, value]) => {
                const result = this.purgeValueForStorageKey(key, value, identities, depth);
                if (!result.remove) entries.push([key, result.value]);
                return entries;
            }, [])
        );
    },

    async hardDeleteStudentData(stage, grade, studentRecord, { keepSlot = false } = {}) {
        const identities = this.getStudentIdentitySet(studentRecord);
        if (!identities.size) return false;

        try {
            await window.AppwriteConfig?.deleteStudentData?.(studentRecord.id);
        } catch (error) {
            console.warn('Appwrite student deletion failed:', error);
            throw error;
        }

        this.getCurrentStorageEntries().forEach(([key, rawValue]) => {
            const parsed = this.parseStorageValue(rawValue, null);
            if (parsed === null) return;

            const result = this.purgeValueForStorageKey(key, parsed, identities);
            if (result.remove) {
                localStorage.removeItem(key);
            } else if (JSON.stringify(result.value) !== JSON.stringify(parsed)) {
                localStorage.setItem(key, JSON.stringify(result.value));
            }
        });

        if (keepSlot) {
            const key = `students_${stage}_${grade}`;
            let students = this.parseStorageValue(localStorage.getItem(key), []);
            if (!Array.isArray(students)) students = [];
            const emptySlot = this.clearStudentDetails(studentRecord);
            const serial = this.getSerial(studentRecord);
            const slotIndex = students.findIndex(item => this.getSerial(item) === serial);
            if (slotIndex === -1) students.push(emptySlot);
            else students[slotIndex] = { ...students[slotIndex], ...emptySlot };
            students.sort((left, right) => this.getSerial(left) - this.getSerial(right));
            localStorage.setItem(key, JSON.stringify(students));
        }

        this.clearCache();
        return true;
    },

    purgeExpiredExpelledStudents(stage = null, grade = null) {
        if (!window.TenantStore?.getCurrentTeacherId?.()) return 0;
        const DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const contexts = [];

        if (stage && grade) {
            contexts.push({ stage, grade: Number(grade) });
        } else {
            const stageData = window.STUDENT_CONFIG?.stageData || {};
            Object.keys(stageData).forEach(stageId => {
                const gradeNames = window.STUDENT_CONFIG?.gradeNames?.[stageId] || [];
                const gradeCount = Math.max(1, gradeNames.length);
                for (let gradeIndex = 1; gradeIndex <= gradeCount; gradeIndex += 1) {
                    contexts.push({ stage: stageId, grade: gradeIndex });
                }
            });
        }

        let removedCount = 0;
        contexts.forEach(context => {
            const key = this.getExpelledStudentsKey(context.stage, context.grade);
            let records;
            try {
                records = JSON.parse(localStorage.getItem(key) || '[]');
            } catch (error) {
                records = [];
            }
            if (!Array.isArray(records) || !records.length) return;

            const retentionDays = this.getExpelledRetentionDays(
                context.stage,
                context.grade
            );
            const retentionMs = retentionDays * DAY_MS;
            const remaining = records.filter(record => {
                const rawDate = record?.expelled_at || record?.expelledAt;
                const expelledTimestamp = rawDate ? new Date(rawDate).getTime() : NaN;
                const expired = Number.isFinite(expelledTimestamp)
                    && now - expelledTimestamp >= retentionMs;
                if (expired) {
                    removedCount += 1;
                    this.hardDeleteStudentData(context.stage, context.grade, record).catch(error => {
                        console.warn('Expired student deletion failed:', error);
                    });
                }
                return !expired;
            });

            if (remaining.length !== records.length) {
                localStorage.setItem(key, JSON.stringify(remaining));
            }
        });
        return removedCount;
    },

    getExpelledRetentionDays(stage, grade) {
        const globalRetentionDays = Number(
            window.AttendanceStore?.getExpelledRetentionDays?.(stage, grade)
        );
        if (Number.isFinite(globalRetentionDays) && globalRetentionDays >= 1) {
            return Math.floor(globalRetentionDays);
        }

        const configuredDays = Number(
            window.AttendanceStore?.getAbsenceSettings?.(stage, grade)?.retentionDays
        );
        return Number.isFinite(configuredDays) && configuredDays >= 1
            ? Math.floor(configuredDays)
            : 30;
    },

    expelStudent(stage, grade, studentId, absenceCount = 0, options = {}) {
        const students = this.getStudents(stage, grade);
        const studentIndex = students.findIndex(student =>
            String(student.id) === String(studentId) && !this.isEmptySlot(student)
        );
        if (studentIndex === -1) return null;

        const student = students[studentIndex];
        const originalSerial = this.getSerial(student, studentIndex + 1);
        const originalStudentCode = String(student.studentCode || student.code || '').trim();
        const expulsionType = options?.expulsion_type
            || options?.expulsionType
            || 'automatic';
        const expelledAt = new Date().toISOString();
        const expelledRecord = {
            ...student,
            originalSerial,
            original_serial: originalSerial,
            previous_serial: originalSerial,
            originalStudentCode,
            original_student_code: originalStudentCode,
            absenceCount: Number(absenceCount) || 0,
            expelledAt,
            expelled_at: expelledAt,
            is_expelled: true,
            is_restored: false,
            expulsion_type: expulsionType,
            expulsionType
        };

        const allRecords = (() => {
            try {
                const raw = JSON.parse(
                    localStorage.getItem(this.getExpelledStudentsKey(stage, grade)) || '[]'
                );
                return Array.isArray(raw) ? raw : [];
            } catch (error) {
                return [];
            }
        })();
        const existingIndex = allRecords.findIndex(record =>
            String(record.id) === String(student.id) && !record.is_restored && !record.restoredAt
        );
        if (existingIndex === -1) allRecords.push(expelledRecord);
        else allRecords[existingIndex] = { ...allRecords[existingIndex], ...expelledRecord };
        this.saveExpelledStudents(stage, grade, allRecords);

        const emptySlot = this.clearStudentDetails(student);
        students[studentIndex] = {
            ...emptySlot,
            id: student.id,
            studentId: student.studentId || String(student.id),
            originalStudentId: student.id,
            is_expelled: true,
            expelled_student_id: student.id,
            expelledAt: expelledRecord.expelledAt,
            expelled_at: expelledRecord.expelled_at
        };
        this.saveStudents(stage, grade, students);
        return expelledRecord;
    },

    expelStudentManually(stage, grade, studentId) {
        return this.expelStudent(stage, grade, studentId, 0, {
            expulsion_type: 'manual'
        });
    },

    restoreExpelledStudent(stage, grade, studentId, expectedPlan = null) {
        const key = this.getExpelledStudentsKey(stage, grade);
        let allRecords;
        try {
            allRecords = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (error) {
            allRecords = [];
        }
        if (!Array.isArray(allRecords)) allRecords = [];

        const recordIndex = allRecords.findIndex(record =>
            String(record.id) === String(studentId) && !record.is_restored && !record.restoredAt
        );
        if (recordIndex === -1) return null;

        const record = allRecords[recordIndex];
        const livePlan = this.getRestorePlan(stage, grade, record);
        const planMatchesPreview = Boolean(
            expectedPlan
            && expectedPlan.originalSlotIsEmpty === livePlan.originalSlotIsEmpty
            && Number(expectedPlan.assignedSerial) === Number(livePlan.assignedSerial)
            && expectedPlan.assignedCode
        );
        const restorePlan = planMatchesPreview
            ? {
                ...livePlan,
                assignedCode: expectedPlan.assignedCode,
                isNewCode: livePlan.isNewCode
            }
            : livePlan;
        const {
            students,
            originalSerial,
            originalStudentCode,
            assignedSerial,
            assignedCode,
            targetIndex
        } = restorePlan;

        const restoredStudent = {
            ...record,
            studentCode: assignedCode,
            code: assignedCode,
            absenceCount: 0,
            absence_count: 0,
            absences_count: 0,
            absenceHistory: [],
            absence_history: [],
            is_expelled: false,
            is_restored: false,
            is_empty_slot: false,
            isEmptySlot: false,
            is_deleted: false,
            restoredAt: null,
            expelled_student_id: null,
            originalSerial,
            serialNo: assignedSerial,
            serialNumber: assignedSerial,
            serial_number: assignedSerial
        };
        delete restoredStudent.expelledAt;
        delete restoredStudent.restoredAt;

        if (targetIndex === -1) {
            students.push(restoredStudent);
        } else {
            students[targetIndex] = {
                ...students[targetIndex],
                ...restoredStudent
            };
        }
        window.AttendanceStore?.resetStudentAbsenceHistory?.(stage, grade, studentId);
        this.saveStudents(stage, grade, students);

        allRecords[recordIndex] = {
            ...allRecords[recordIndex],
            is_restored: true,
            restoredAt: new Date().toISOString(),
            restored_at: new Date().toISOString(),
            restoredSerial: assignedSerial
        };
        localStorage.setItem(key, JSON.stringify(allRecords));
        return {
            student: restoredStudent,
            assignedSerial,
            assignedCode,
            originalSerial,
            originalStudentCode,
            isNewCode: restorePlan.isNewCode,
            targetSerial: assignedSerial,
            targetCode: assignedCode
        };
    },

    getStudentsForCurrentTeacherAndGrade(activeGradeId) {
        const match = String(activeGradeId || '').match(/^(.+)_([0-9]+)$/);
        if (!match) return [];
        return this.getStudents(match[1], Number(match[2]));
    },

    getStudents(stage, grade) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId || !stage || !grade) return [];
        
        const key = `students_${stage}_${grade}`;
        const cacheKey = `${teacherId}:${key}`;
        const now = Date.now();
        
        // Check if cache is valid
        if (StudentsCache[cacheKey] && (now - StudentsCache[cacheKey].timestamp) < CACHE_TTL) {
            return StudentsCache[cacheKey].data;
        }
        
        // Refresh cache
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        const currentGradeId = window.TenantStore.getGradeId(stage, grade);
        const normalized = Array.isArray(data)
            ? data.map((student, index) => {
                const isEmpty = this.isEmptySlot(student);
                const serial = this.getSerial(student, index + 1);
                const id = student.id ?? student.studentId ?? `std_${Date.now()}_${index}`;
                return {
                    ...student,
                    id,
                    studentId: student.studentId || String(id),
                    studentCode: isEmpty ? null : (student.studentCode || student.code || ''),
                    code: isEmpty ? null : (student.code || student.studentCode || ''),
                    teacherId: student.teacherId || teacherId,
                    stageId: student.stageId || student.stage_id || stage,
                    stage_id: student.stage_id || student.stageId || stage,
                    gradeId: student.gradeId || student.grade_id || currentGradeId,
                    grade_id: student.grade_id || student.gradeId || currentGradeId,
                    serialNo: serial,
                    serialNumber: serial,
                    serial_number: serial,
                    is_empty_slot: isEmpty,
                    isEmptySlot: isEmpty,
                    is_deleted: isEmpty
                };
            }).filter(student =>
                student.teacherId === teacherId
                && student.stageId === stage
                && student.gradeId === currentGradeId
            )
            : [];
        StudentsCache[cacheKey] = { data: normalized, timestamp: now };
        return normalized;
    },

    async clearStudents(stage, grade) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId || !stage || !grade) return false;

        const key = `students_${stage}_${grade}`;
        const currentStudents = this.getStudents(stage, grade)
            .filter(student => !this.isEmptySlot(student));
        delete StudentsCache[`${teacherId}:${key}`];
        // Removing the collection purges both active records and preserved
        // empty slots. A future registration starts a fresh slot sequence.
        try {
            await window.AppwriteConfig?.deleteStudentsInGrade?.(stage, grade);
        } catch (error) {
            console.warn('Appwrite grade deletion failed:', error);
            throw error;
        }

        currentStudents.forEach(student => {
            const identities = this.getStudentIdentitySet(student);
            this.getCurrentStorageEntries().forEach(([storageKey, rawValue]) => {
                const parsed = this.parseStorageValue(rawValue, null);
                if (parsed === null) return;
                const result = this.purgeValueForStorageKey(storageKey, parsed, identities);
                if (result.remove) localStorage.removeItem(storageKey);
                else if (JSON.stringify(result.value) !== JSON.stringify(parsed)) {
                    localStorage.setItem(storageKey, JSON.stringify(result.value));
                }
            });
        });

        const emptySlots = currentStudents.map(student => this.clearStudentDetails(student));
        localStorage.setItem(key, JSON.stringify(emptySlots));
        this.clearCache();
        return true;
    },
    
    saveStudents(stage, grade, students) {
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId || !stage || !grade) return;
        
        const key = `students_${stage}_${grade}`;
        const currentGradeId = window.TenantStore.getGradeId(stage, grade);
        const now = Date.now();
        const normalized = (Array.isArray(students) ? students : []).map((student, index) => {
            const isEmpty = this.isEmptySlot(student);
            const serial = this.getSerial(student, index + 1);
            const id = student.id ?? student.studentId ?? `std_${Date.now()}_${index}`;
            return {
                ...student,
                id,
                studentId: student.studentId || String(id),
                studentCode: isEmpty ? null : (student.studentCode || student.code || ''),
                code: isEmpty ? null : (student.code || student.studentCode || ''),
                teacherId,
                stageId: stage,
                stage_id: stage,
                gradeId: currentGradeId,
                grade_id: currentGradeId,
                serialNo: serial,
                serialNumber: serial,
                serial_number: serial,
                is_empty_slot: isEmpty,
                isEmptySlot: isEmpty,
                is_deleted: isEmpty
            };
        });
        
        // Update cache
        StudentsCache[`${teacherId}:${key}`] = { data: normalized, timestamp: now };
        localStorage.setItem(key, JSON.stringify(normalized));
        window.AppwriteConfig?.syncStudents?.(normalized).catch(error => {
            console.warn('Appwrite student sync failed:', error);
        });
    },
    
    // Clear cache on demand
    clearCache(stage, grade) {
        if (stage && grade) {
            const teacherId = window.TenantStore?.getCurrentTeacherId();
            delete StudentsCache[`${teacherId}:students_${stage}_${grade}`];
        } else {
            // Clear all cache
            Object.keys(StudentsCache).forEach(k => delete StudentsCache[k]);
        }
    },

    // Get all family members sharing the same family_group_id across all stages
    getFamilyMembers(familyId) {
        if (!familyId) return [];
        const result = [];
        const allStageKeys = Object.keys(window.STUDENT_CONFIG.stageData);
        allStageKeys.forEach(stage => {
            const gradeNames = window.STUDENT_CONFIG.gradeNames[stage] || [];
            for (let gradeIdx = 1; gradeIdx <= gradeNames.length; gradeIdx++) {
                try {
                    const students = this.getStudents(stage, gradeIdx);
                    students.forEach((s, idx) => {
                        if (s.family_group_id === familyId && s.name) {
                            result.push({
                                ...s, serial: this.getSerial(s, idx + 1), stage, grade: gradeIdx,
                                className: gradeNames[gradeIdx - 1],
                                stageName: window.STUDENT_CONFIG.stageData[stage].name
                            });
                        }
                    });
                } catch(e) {}
            }
        });
        return result;
    },

    // Get all profiles sharing the same link_id across all stages
    getLinkedProfiles(linkId) {
        if (!linkId) return [];
        const result = [];
        const allStageKeys = Object.keys(window.STUDENT_CONFIG.stageData);
        allStageKeys.forEach(stage => {
            const gradeNames = window.STUDENT_CONFIG.gradeNames[stage] || [];
            for (let gradeIdx = 1; gradeIdx <= gradeNames.length; gradeIdx++) {
                try {
                    const students = this.getStudents(stage, gradeIdx);
                    students.forEach((s) => {
                        if (s.link_id === linkId && s.name) {
                            result.push({
                                ...s, stage, grade: gradeIdx,
                                className: gradeNames[gradeIdx - 1],
                                stageName: window.STUDENT_CONFIG.stageData[stage].name
                            });
                        }
                    });
                } catch(e) {}
            }
        });
        return result;
    },

    getAllStudentsSystemWide() {
        const result = [];
        if (!window.TenantStore?.getCurrentTeacherId()) return result;
        const allStageKeys = Object.keys(window.STUDENT_CONFIG.stageData);
        allStageKeys.forEach(stage => {
            const gradeNames = window.STUDENT_CONFIG.gradeNames[stage] || [];
            const count = Math.max(1, gradeNames.length);
            for (let g = 1; g <= count; g++) {
                const list = this.getStudents(stage, g);
                list.forEach(s => {
                    if (s.name) result.push({ ...s, stage, grade: g });
                });
            }
        });
        return result;
    }
};

window.purgeExpiredExpelledStudents = function (stage = null, grade = null) {
    return window.StudentStore.purgeExpiredExpelledStudents(stage, grade);
};
