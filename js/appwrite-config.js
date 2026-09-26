// Appwrite client configuration
window.AppwriteConfig = (() => {
    const { Client, Account, ID, Permission, Role, TablesDB, Databases, Query } = window.Appwrite;
    const appwriteProjectId = '6a954c6a000cc42fbc3a';
    const appwriteEndpoint = 'https://fra.cloud.appwrite.io/v1';
    const appwriteDatabaseId = '6a9550bb0030d15da3b2';
    const familyLinksPreferenceKey = 'familyLinksByStudent_v1';
    let familyLinksSyncQueue = Promise.resolve();

    const client = new Client()
        .setEndpoint(appwriteEndpoint)
        .setProject(appwriteProjectId);
    const account = new Account(client);
    const makeRowId = value => {
        let hash = 0;
        for (const character of String(value)) {
            hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
        }
        return `row_${Math.abs(hash).toString(36)}`;
    };

    return {
        client,
        account,
        ID,
        databases: TablesDB ? new TablesDB(client) : new Databases(client),
        usesTablesApi: Boolean(TablesDB),
        databaseId: appwriteDatabaseId,
        tables: {
            students: 'students',
            groups: 'groups',
            attendanceRecords: 'attendance_records',
            studentPayments: 'student_payments',
            examGrades: 'exam_grades',
            examColumns: 'exam_columns',
            financialTransactions: 'financial_transactions',
            financialExpenses: 'financial_expenses'
        },
        rowIdFor(value) {
            return makeRowId(value);
        },
        async listRows(tableId, teacherId) {
            if (!TablesDB) return [];
            const rows = [];
            const pageSize = 100;
            let offset = 0;

            while (true) {
                const queries = teacherId && Query ? [
                    Query.equal('teacherId', [teacherId]),
                    Query.limit(pageSize),
                    Query.offset(offset)
                ] : [
                    ...(Query ? [Query.limit(pageSize), Query.offset(offset)] : [])
                ];
                const response = await this.databases.listRows({
                    databaseId: this.databaseId,
                    tableId,
                    queries
                });
                const page = response.rows || [];
                rows.push(...page);
                offset += page.length;

                if (page.length < pageSize || offset >= (response.total || 0)) break;
            }

            return rows;
        },
        async getRowPermissions() {
            const user = await this.account.get();
            if (!Permission || !Role || !user?.$id) return undefined;
            const userRole = Role.user(user.$id);
            return [
                Permission.read(userRole),
                Permission.write(userRole),
                Permission.update(userRole),
                Permission.delete(userRole)
            ];
        },
        async syncFamilyLinks(students) {
            if (!Array.isArray(students) || !students.length || typeof this.account.updatePrefs !== 'function') return;
            const updates = {};
            students.forEach(student => {
                const studentId = student?.id ?? student?.studentId;
                if (studentId == null) return;
                const familyData = {};
                ['family_group_id', 'relativeStudentIds', 'link_id', 'isDualRegistered', 'dualStage', 'dualStageId'].forEach(field => {
                    if (Object.prototype.hasOwnProperty.call(student, field)) {
                        familyData[field] = student[field];
                    }
                });
                if (Object.keys(familyData).length) updates[String(studentId)] = familyData;
            });
            if (!Object.keys(updates).length) return;

            familyLinksSyncQueue = familyLinksSyncQueue.catch(() => {}).then(async () => {
                const user = await this.account.get();
                const prefs = user?.prefs || {};
                const savedLinks = prefs[familyLinksPreferenceKey];
                await this.account.updatePrefs({
                    ...prefs,
                    [familyLinksPreferenceKey]: {
                        ...(savedLinks && typeof savedLinks === 'object' ? savedLinks : {}),
                        ...updates
                    }
                });
            });
            return familyLinksSyncQueue;
        },
        async deleteRows(tableId, predicate) {
            if (!TablesDB) return;
            const rows = await this.listRows(tableId, window.TenantStore?.getCurrentTeacherId());
            await Promise.all(rows.filter(predicate).map(row => this.databases.deleteRow({
                databaseId: this.databaseId,
                tableId,
                rowId: row.$id
            })));
        },
        async deleteStudentData(studentId) {
            const id = String(studentId);
            await Promise.all([
                this.deleteRows(this.tables.students, row => String(row.$id) === id),
                this.deleteRows(this.tables.attendanceRecords, row => String(row.studentId) === id),
                this.deleteRows(this.tables.studentPayments, row => String(row.studentId) === id),
                this.deleteRows(this.tables.examGrades, row => String(row.studentId) === id),
                this.deleteRows(this.tables.financialTransactions, row => String(row.studentId) === id)
            ]);
        },
        async deleteStudentsInGrade(stage, grade) {
            const rows = await this.listRows(this.tables.students, window.TenantStore?.getCurrentTeacherId());
            const matching = rows.filter(row =>
                String(row.stageId) === String(stage)
                && String(row.gradeId) === String(`${stage}_${grade}`)
            );
            await Promise.all(matching.map(row => this.deleteStudentData(row.$id)));
        },
        async deleteGroup(stage, grade, groupName) {
            const teacherId = window.TenantStore?.getCurrentTeacherId();
            const rowId = makeRowId(`group_${teacherId}_${stage}_${stage}_${grade}_${groupName}`);
            await this.databases.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tables.groups,
                rowId
            });
            await this.deleteRows(this.tables.attendanceRecords, row =>
                String(row.stageId) === String(stage)
                && String(row.gradeId) === String(`${stage}_${grade}`)
                && String(row.groupName) === String(groupName)
            );
        },
        async deleteFinancialExpense(id) {
            const rowId = makeRowId(`expense_${window.TenantStore?.getCurrentTeacherId()}_${id}`);
            await this.databases.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tables.financialExpenses,
                rowId
            });
        },
        async deleteExamColumn(examId, stageId, gradeId, term, columnIdx) {
            await this.deleteRows(this.tables.examColumns, row => String(row.examId) === String(examId));
            await this.deleteRows(this.tables.examGrades, row =>
                String(row.stageId) === String(stageId)
                && String(row.gradeId) === String(gradeId)
                && Number(row.term) === Number(term)
                && Number(row.columnIdx) === Number(columnIdx)
            );
        },
        async migrateLocalTeacherData(selectedStages, selectedGrades) {
            if (!TablesDB) return;
            const stages = Array.isArray(selectedStages) ? selectedStages : [];
            await Promise.all(stages.flatMap(stage => {
                const grades = selectedGrades?.[stage] || [];
                return grades.map(grade => {
                    const studentKey = `students_${stage}_${grade}`;
                    const groupKey = `groups_${stage}_${grade}`;
                    let students = [];
                    try { students = JSON.parse(localStorage.getItem(studentKey) || '[]'); } catch (error) {}
                    const teacherId = window.TenantStore.getCurrentTeacherId();
                    const gradeId = window.TenantStore.getGradeId(stage, grade);
                    const normalizedStudents = (Array.isArray(students) ? students : []).map((student, index) => ({
                        ...student,
                        teacherId,
                        stageId: stage,
                        gradeId,
                        serialNumber: student.serialNumber || student.serialNo || index + 1
                    }));
                    return Promise.all([
                        this.syncStudents(normalizedStudents),
                        this.syncGroups(window.AttendanceStore?.getGroups(stage, grade) || [])
                    ]);
                });
            }));
        },
        async hydrateTeacherData() {
            const teacherId = window.TenantStore?.getCurrentTeacherId();
            if (!TablesDB || !teacherId) return;

            const [studentRows, groupRows, attendanceRows, paymentRows, gradeRows, columnRows, transactionRows, expenseRows, accountUser] = await Promise.all([
                this.listRows(this.tables.students, teacherId),
                this.listRows(this.tables.groups, teacherId),
                this.listRows(this.tables.attendanceRecords, teacherId),
                this.listRows(this.tables.studentPayments, teacherId),
                this.listRows(this.tables.examGrades, teacherId),
                this.listRows(this.tables.examColumns, teacherId),
                this.listRows(this.tables.financialTransactions, teacherId),
                this.listRows(this.tables.financialExpenses, teacherId),
                this.account.get().catch(error => {
                    console.warn('Appwrite account preferences unavailable:', error);
                    return null;
                })
            ]);

            const localTenantData = window.TenantStore?.getCurrentTenantData?.() || {};
            const localFamilyLinks = new Map();
            const localDualStudents = new Map();
            const localStudentIds = new Set();
            const collectLocalStudents = (studentKey, value, isBackup = false) => {
                if (typeof value !== 'string') return;
                let students;
                try { students = JSON.parse(value); } catch (error) { return; }
                if (!Array.isArray(students)) return;
                students.forEach(student => {
                    const studentId = student?.id ?? student?.studentId;
                    if (studentId == null) return;
                    const id = String(studentId);
                    if (isBackup && localStudentIds.has(id)) return;
                    localStudentIds.add(id);
                    if (student.isDualRegistered && !student.is_deleted && !student.isEmptySlot && !student.is_empty_slot) {
                        const gradeContext = studentKey.match(/^students_(.+)_([0-9]+)$/);
                        localDualStudents.set(id, {
                            ...student,
                            stageId: student.stageId || gradeContext?.[1],
                            gradeId: student.gradeId || (gradeContext ? `${gradeContext[1]}_${gradeContext[2]}` : '')
                        });
                    }
                    const familyData = {};
                    ['family_group_id', 'relativeStudentIds', 'link_id', 'isDualRegistered', 'dualStage', 'dualStageId'].forEach(field => {
                        if (Object.prototype.hasOwnProperty.call(student, field)) {
                            familyData[field] = student[field];
                        }
                    });
                    if (Object.keys(familyData).length && (!isBackup || !localFamilyLinks.has(id))) {
                        localFamilyLinks.set(id, familyData);
                    }
                });
            };
            Object.entries(localTenantData)
                .filter(([key]) => key.startsWith('students_'))
                .forEach(([key, value]) => collectLocalStudents(key, value));

            const backupHistory = (() => {
                try {
                    const parsed = JSON.parse(localTenantData.backup_history || '[]');
                    return Array.isArray(parsed) ? parsed : [];
                } catch (error) {
                    return [];
                }
            })();
            backupHistory
                .sort((first, second) => new Date(second.timestamp || 0) - new Date(first.timestamp || 0))
                .forEach(backup => {
                    let snapshot;
                    try { snapshot = JSON.parse(backup.data || '{}'); } catch (error) { return; }
                    Object.entries(snapshot)
                        .filter(([key]) => key.startsWith('students_'))
                        .forEach(([key, value]) => collectLocalStudents(key, value, true));
                });

            const cloudFamilyLinks = accountUser?.prefs?.[familyLinksPreferenceKey];
            const familyLinks = new Map(
                cloudFamilyLinks && typeof cloudFamilyLinks === 'object'
                    ? Object.entries(cloudFamilyLinks)
                    : []
            );
            const missingCloudLinks = Array.from(localFamilyLinks, ([id, familyData]) => {
                const cloudData = familyLinks.get(id) || {};
                const missingFields = Object.fromEntries(
                    Object.entries(familyData).filter(([field]) => !Object.prototype.hasOwnProperty.call(cloudData, field))
                );
                return { id, ...missingFields };
            }).filter(student => Object.keys(student).length > 1);
            if (missingCloudLinks.length) {
                try {
                    await this.syncFamilyLinks(missingCloudLinks);
                } catch (error) {
                    console.warn('Appwrite family-link migration failed:', error);
                }
                missingCloudLinks.forEach(({ id, ...familyData }) => {
                    familyLinks.set(String(id), { ...(familyLinks.get(String(id)) || {}), ...familyData });
                });
            }

            const cloudStudentIds = new Set(studentRows.map(row => String(row.$id)));
            const missingDualStudents = Array.from(localDualStudents.values())
                .filter(student => !cloudStudentIds.has(String(student.id ?? student.studentId)));
            if (missingDualStudents.length) {
                try {
                    await this.syncStudents(missingDualStudents.map(student => ({ ...student, teacherId })));
                } catch (error) {
                    console.warn('Appwrite dual-registration migration failed:', error);
                }
                missingDualStudents.forEach(student => {
                    const id = String(student.id ?? student.studentId);
                    studentRows.push({
                        ...student,
                        $id: id,
                        full_name: student.name || student.full_name || '',
                        studentCode: student.studentCode || student.code || null,
                        serialNumber: student.serialNumber || student.serialNo || 0
                    });
                });
            }

            // Appwrite is authoritative after login; discard stale local student copies.
            Object.keys(localTenantData)
                .filter(key => key.startsWith('students_'))
                .forEach(key => localStorage.removeItem(key));

            const localGrade = (stage, gradeId) => {
                const prefix = `${stage}_`;
                return Number(String(gradeId || '').startsWith(prefix)
                    ? String(gradeId).slice(prefix.length)
                    : gradeId) || 1;
            };

            if (studentRows.length) {
                const studentsByGrade = {};
                studentRows.forEach(row => {
                    const data = row;
                    const key = JSON.stringify([data.stageId, data.gradeId]);
                    if (!studentsByGrade[key]) studentsByGrade[key] = [];
                    studentsByGrade[key].push({
                        ...data,
                        ...familyLinks.get(String(row.$id)),
                        id: row.$id,
                        name: data.full_name || '',
                        studentId: row.$id,
                        code: data.studentCode || null,
                        serialNo: data.serialNumber,
                        serialNumber: data.serialNumber
                    });
                });
                Object.entries(studentsByGrade).forEach(([key, students]) => {
                    const [stage, gradeId] = JSON.parse(key);
                    const grade = Number(gradeId.replace(`${stage}_`, '')) || 1;
                    localStorage.setItem(`students_${stage}_${grade}`, JSON.stringify(students));
                });
                window.StudentStore?.clearCache?.();
            }

            if (groupRows.length) {
                const groupsByGrade = {};
                groupRows.forEach(row => {
                    const data = row;
                    const key = JSON.stringify([data.stageId, data.gradeId]);
                    if (!groupsByGrade[key]) groupsByGrade[key] = [];
                    let schedule = [];
                    try { schedule = JSON.parse(data.schedule || '[]'); } catch (error) {}
                    groupsByGrade[key].push({ ...data, schedule });
                });
                Object.entries(groupsByGrade).forEach(([key, groups]) => {
                    const [stage, gradeId] = JSON.parse(key);
                    const grade = Number(gradeId.replace(`${stage}_`, '')) || 1;
                    localStorage.setItem(`groups_${stage}_${grade}`, JSON.stringify(groups));
                });
            }

            if (attendanceRows.length) {
                const historyByGrade = {};
                attendanceRows.forEach(row => {
                    const data = row;
                    const key = JSON.stringify([data.stageId, data.gradeId]);
                    if (!historyByGrade[key]) historyByGrade[key] = [];
                    historyByGrade[key].push(data);
                });
                Object.entries(historyByGrade).forEach(([key, history]) => {
                    const [stage, gradeId] = JSON.parse(key);
                    const grade = Number(gradeId.replace(`${stage}_`, '')) || 1;
                    localStorage.setItem(`history_index_${stage}_${grade}`, JSON.stringify(history));
                });
            }

            paymentRows.forEach(row => {
                const data = row;
                const grade = localGrade(data.stageId, data.gradeId);
                const paymentsKey = `student_payments_${data.stageId}_${grade}_${data.studentId}`;
                const datesKey = `payment_dates_${data.stageId}_${grade}_${data.studentId}`;
                const payments = JSON.parse(localStorage.getItem(paymentsKey) || '{}');
                const dates = JSON.parse(localStorage.getItem(datesKey) || '{}');
                payments[data.month] = data.status;
                if (data.paymentDate) dates[data.month] = data.paymentDate;
                localStorage.setItem(paymentsKey, JSON.stringify(payments));
                localStorage.setItem(datesKey, JSON.stringify(dates));
            });

            const gradesByTerm = {};
            gradeRows.forEach(row => {
                const data = row;
                const grade = localGrade(data.stageId, data.gradeId);
                const key = `${data.stageId}_${grade}_term${data.term}`;
                if (!gradesByTerm[key]) gradesByTerm[key] = {};
                if (!gradesByTerm[key][data.studentId]) gradesByTerm[key][data.studentId] = {};
                let value = data.value;
                try { value = JSON.parse(value); } catch (error) {}
                gradesByTerm[key][data.studentId][data.columnIdx] = value;
            });
            Object.entries(gradesByTerm).forEach(([key, grades]) => {
                localStorage.setItem(`exam_grades_${key}`, JSON.stringify(grades));
            });

            const columnsByTerm = {};
            columnRows.forEach(row => {
                const data = row;
                const grade = localGrade(data.stageId, data.gradeId);
                const key = `${data.stageId}_${grade}_term${data.term}`;
                if (!columnsByTerm[key]) columnsByTerm[key] = [];
                columnsByTerm[key].push({ ...data, examId: data.examId || row.$id });
            });
            Object.entries(columnsByTerm).forEach(([key, columns]) => {
                localStorage.setItem(`exam_columns_${key}`, JSON.stringify(columns));
            });

            if (transactionRows.length) {
                const transactions = transactionRows.map(row => ({
                    ...row,
                    id: row.$id,
                    stage: row.stageId,
                    grade: localGrade(row.stageId, row.gradeId)
                }));
                localStorage.setItem('revenue_ledger_v1', JSON.stringify(transactions));
            }

            if (expenseRows.length) {
                const expenses = expenseRows.map(row => ({ ...row, id: row.$id }));
                localStorage.setItem('operational_expenses_v1', JSON.stringify(expenses));
            }
        },
        async syncStudents(students) {
            if (!TablesDB || !Array.isArray(students)) return;
            let permissions;
            try {
                permissions = await this.getRowPermissions();
            } catch (error) {
                console.warn('Appwrite row permissions unavailable; using table permissions:', error);
            }

            const activeStudents = students.filter(student => !student.isEmptySlot && !student.is_empty_slot && !student.is_deleted);
            await Promise.all(activeStudents.map(async student => {
                const rowId = String(student.id || student.studentId);
                const data = {
                    full_name: String(student.name || ''),
                    studentCode: student.studentCode ? String(student.studentCode) : null,
                    phone: student.phone ? String(student.phone) : null,
                    parentPhone: student.parentPhone ? String(student.parentPhone) : null,
                    stageId: String(student.stageId || ''),
                    gradeId: String(student.gradeId || ''),
                    serialNumber: Number(student.serialNumber || student.serialNo || 0),
                    is_deleted: Boolean(student.is_deleted || student.isEmptySlot),
                    teacherId: student.teacherId ? String(student.teacherId) : null
                };

                if (typeof this.databases.upsertRow === 'function') {
                    await this.databases.upsertRow({
                        databaseId: this.databaseId,
                        tableId: this.tables.students,
                        rowId,
                        permissions,
                        data
                    });
                    return;
                }

                try {
                    await this.databases.updateRow({
                        databaseId: this.databaseId,
                        tableId: this.tables.students,
                        rowId,
                        ...(permissions ? { permissions } : {}),
                        data
                    });
                } catch (error) {
                    await this.databases.createRow({
                        databaseId: this.databaseId,
                        tableId: this.tables.students,
                        rowId,
                        ...(permissions ? { permissions } : {}),
                        data
                    });
                }
            }));
            await this.syncFamilyLinks(activeStudents);
        },
        async syncAttendanceRecord(record) {
            if (!TablesDB || !record?.studentId) return;
            const permissions = await this.getRowPermissions();

            const rowId = makeRowId(`attendance_${record.sessionId || record.dateKey}_${record.studentId}`);
            const data = {
                studentId: String(record.studentId),
                status: String(record.status),
                date: String(record.date),
                dateKey: String(record.dateKey),
                dayName: record.dayName ? String(record.dayName) : null,
                groupName: String(record.groupName),
                stageId: String(record.stageId),
                gradeId: String(record.gradeId),
                sessionId: record.sessionId ? String(record.sessionId) : null,
                timeSlot: record.timeSlot ? String(record.timeSlot) : null,
                source: record.source ? String(record.source) : null,
                teacherId: record.teacherId ? String(record.teacherId) : null,
                timestamp: Number(record.timestamp)
            };

            if (typeof this.databases.upsertRow === 'function') {
                await this.databases.upsertRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.attendanceRecords,
                    rowId,
                    permissions,
                    data
                });
                return;
            }

            try {
                await this.databases.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.attendanceRecords,
                    rowId,
                    permissions,
                    data
                });
            } catch (error) {
                await this.databases.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.attendanceRecords,
                    rowId,
                    permissions,
                    data
                });
            }
        },
        async syncPayment(record) {
            if (!TablesDB || !record?.studentId) return;
            const permissions = await this.getRowPermissions();

            const rowId = makeRowId(`payment_${record.teacherId}_${record.stageId}_${record.gradeId}_${record.studentId}_${record.month}`);
            const data = {
                studentId: String(record.studentId),
                month: Number(record.month),
                status: String(record.status),
                paymentDate: record.paymentDate ? String(record.paymentDate) : null,
                stageId: String(record.stageId),
                gradeId: String(record.gradeId),
                teacherId: record.teacherId ? String(record.teacherId) : null
            };

            try {
                await this.databases.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.studentPayments,
                    rowId,
                    permissions,
                    data
                });
            } catch (error) {
                await this.databases.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.studentPayments,
                    rowId,
                    permissions,
                    data
                });
            }
        },
        async syncExamGrade(record) {
            if (!TablesDB || !record?.studentId) return;
            const permissions = await this.getRowPermissions();

            const rowId = makeRowId(`exam_${record.teacherId}_${record.stageId}_${record.gradeId}_${record.term}_${record.studentId}_${record.columnIdx}`);
            const data = {
                studentId: String(record.studentId),
                term: Number(record.term),
                columnIdx: Number(record.columnIdx),
                value: record.value === null || record.value === undefined
                    ? null
                    : typeof record.value === 'object'
                        ? JSON.stringify(record.value)
                        : String(record.value),
                stageId: String(record.stageId),
                gradeId: String(record.gradeId),
                teacherId: record.teacherId ? String(record.teacherId) : null
            };

            try {
                await this.databases.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.examGrades,
                    rowId,
                    permissions,
                    data
                });
            } catch (error) {
                await this.databases.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.examGrades,
                    rowId,
                    permissions,
                    data
                });
            }
        },
        async syncExamColumn(record) {
            if (!TablesDB || !record?.examId) return;
            const permissions = await this.getRowPermissions();

            const rowId = makeRowId(`column_${record.teacherId}_${record.stageId}_${record.gradeId}_${record.term}_${record.examId}`);
            const data = {
                name: String(record.name || ''),
                title: String(record.title || record.name || ''),
                totalScore: Number(record.totalScore || 0),
                maxScore: Number(record.maxScore || record.totalScore || 0),
                examId: String(record.examId),
                term: Number(record.term),
                stageId: String(record.stageId),
                gradeId: String(record.gradeId),
                teacherId: record.teacherId ? String(record.teacherId) : null
            };

            try {
                await this.databases.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.examColumns,
                    rowId,
                    permissions,
                    data
                });
            } catch (error) {
                await this.databases.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.examColumns,
                    rowId,
                    permissions,
                    data
                });
            }
        },
        async syncFinancialTransaction(record) {
            if (!TablesDB || !record?.transactionKey) return;
            const permissions = await this.getRowPermissions();

            const rowId = makeRowId(`financial_${record.teacherId}_${record.transactionKey}`);
            const data = {
                transactionKey: String(record.transactionKey),
                studentId: record.studentId ? String(record.studentId) : null,
                studentName: record.studentName ? String(record.studentName) : null,
                studentCode: record.studentCode ? String(record.studentCode) : null,
                stageId: String(record.stageId || record.stage),
                gradeId: String(record.gradeId || `${record.stage}_${record.grade}`),
                month: record.month === undefined || record.month === null ? null : Number(record.month),
                type: String(record.type),
                paymentType: record.paymentType ? String(record.paymentType) : null,
                amount: Number(record.amount) || 0,
                amountPaid: record.amountPaid === undefined ? null : Number(record.amountPaid),
                advancePayment: record.advancePayment === undefined ? null : Number(record.advancePayment),
                paymentDate: String(record.paymentDate || record.dateTime || new Date().toISOString()),
                teacherId: record.teacherId ? String(record.teacherId) : null
            };

            try {
                await this.databases.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.financialTransactions,
                    rowId,
                    permissions,
                    data
                });
            } catch (error) {
                await this.databases.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.financialTransactions,
                    rowId,
                    permissions,
                    data
                });
            }
        },
        async syncFinancialExpense(record) {
            if (!TablesDB || !record?.id) return;
            const permissions = await this.getRowPermissions();

            const rowId = makeRowId(`expense_${record.teacherId}_${record.id}`);
            const data = {
                title: String(record.title || ''),
                category: String(record.category || ''),
                amount: Number(record.amount) || 0,
                dateTime: String(record.dateTime || new Date().toISOString()),
                notes: record.notes ? String(record.notes) : null,
                receipt: record.receipt ? String(record.receipt) : null,
                teacherId: String(record.teacherId || '')
            };

            try {
                await this.databases.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.financialExpenses,
                    rowId,
                    permissions,
                    data
                });
            } catch (error) {
                await this.databases.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tables.financialExpenses,
                    rowId,
                    permissions,
                    data
                });
            }
        },
        async syncGroups(groups) {
            if (!TablesDB || !Array.isArray(groups)) return;
            const permissions = await this.getRowPermissions();

            for (const [index, group] of groups.entries()) {
                const identity = `${group.teacherId || 'teacher'}_${group.stageId || 'stage'}_${group.gradeId || 'grade'}_${group.name || index}`;
                const rowId = makeRowId(`group_${identity}`);
                const data = {
                    name: String(group.name || ''),
                    schedule: JSON.stringify(Array.isArray(group.schedule) ? group.schedule : []),
                    stageId: String(group.stageId || ''),
                    gradeId: String(group.gradeId || ''),
                    teacherId: group.teacherId ? String(group.teacherId) : null
                };

                if (typeof this.databases.upsertRow === 'function') {
                    await this.databases.upsertRow({
                        databaseId: this.databaseId,
                        tableId: this.tables.groups,
                        rowId,
                        permissions,
                        data
                    });
                    return;
                }

                try {
                    await this.databases.updateRow({
                        databaseId: this.databaseId,
                        tableId: this.tables.groups,
                        rowId,
                        permissions,
                        data
                    });
                } catch (error) {
                    await this.databases.createRow({
                        databaseId: this.databaseId,
                        tableId: this.tables.groups,
                        rowId,
                        permissions,
                        data
                    });
                }
            }
        }
    };
})();
