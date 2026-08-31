window.ExamsData = {
    getExamColumnsKey(stage, grade, term) {
        return `exam_columns_${stage}_${grade}_term${term}`;
    },

    getExamGradesKey(stage, grade, term) {
        return `exam_grades_${stage}_${grade}_term${term}`;
    },

    getExamCompletionKey(stage, grade, term) {
        return `exam_completion_${stage}_${grade}_term${term}`;
    },

    loadExamColumns(stage, grade, term) {
        const key = this.getExamColumnsKey(stage, grade, term);
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId) return [];
        const gradeId = window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`;
        const defaultColumns = term === 1 ? ['امتحان 1 - ترم أول'] : ['امتحان 1 - ترم ثاني'];
        const stored = JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultColumns));
        const normalized = (Array.isArray(stored) ? stored : []).map((exam, index) => ({
            ...(typeof exam === 'string' ? { name: exam, totalScore: 100 } : exam),
            name: typeof exam === 'string' ? exam : (exam?.name || exam?.title || 'امتحان'),
            title: typeof exam === 'string' ? exam : (exam?.title || exam?.name || 'امتحان'),
            totalScore: Number(typeof exam === 'string' ? 100 : (exam?.totalScore ?? exam?.maxScore ?? 100)),
            maxScore: Number(typeof exam === 'string' ? 100 : (exam?.maxScore ?? exam?.totalScore ?? 100)),
            examId: exam?.examId || `exam_${teacherId}_${stage}_${grade}_${term}_${index}`,
            teacherId: exam?.teacherId || teacherId,
            stageId: exam?.stageId || stage,
            gradeId: exam?.gradeId || gradeId
        })).filter(exam => exam.teacherId === teacherId
            && exam.stageId === stage
            && exam.gradeId === gradeId);
        localStorage.setItem(key, JSON.stringify(normalized));
        return normalized;
    },

    saveExamColumns(stage, grade, term, columns) {
        const key = this.getExamColumnsKey(stage, grade, term);
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId) return;
        const gradeId = window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`;
        const normalized = (Array.isArray(columns) ? columns : []).map((exam, index) => ({
            ...(typeof exam === 'string' ? { name: exam, totalScore: 100 } : exam),
            name: typeof exam === 'string' ? exam : (exam?.name || exam?.title || 'امتحان'),
            title: typeof exam === 'string' ? exam : (exam?.title || exam?.name || 'امتحان'),
            totalScore: Number(typeof exam === 'string' ? 100 : (exam?.totalScore ?? exam?.maxScore ?? 100)),
            maxScore: Number(typeof exam === 'string' ? 100 : (exam?.maxScore ?? exam?.totalScore ?? 100)),
            examId: exam?.examId || `exam_${teacherId}_${stage}_${grade}_${term}_${index}`,
            teacherId,
            stageId: stage,
            gradeId
        }));
        localStorage.setItem(key, JSON.stringify(normalized));
        normalized.forEach(exam => {
            window.AppwriteConfig?.syncExamColumn?.({
                ...exam,
                term,
                stageId: stage,
                gradeId,
                teacherId
            }).catch(error => {
                console.warn('Appwrite exam column sync failed:', error);
            });
        });
    },

    getFinishedExams(stage, grade, term) {
        if (!window.TenantStore?.getCurrentTeacherId()) return {};
        const key = this.getExamCompletionKey(stage, grade, term);
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        return stored && typeof stored === 'object' ? stored : {};
    },

    isExamFinished(stage, grade, term, examIdx) {
        return Boolean(this.getFinishedExams(stage, grade, term)[examIdx]);
    },

    setExamFinished(stage, grade, term, examIdx, isFinished = true) {
        const key = this.getExamCompletionKey(stage, grade, term);
        const finishedExams = this.getFinishedExams(stage, grade, term);
        if (isFinished) {
            finishedExams[examIdx] = true;
        } else {
            delete finishedExams[examIdx];
        }
        localStorage.setItem(key, JSON.stringify(finishedExams));
    },

    getGrades(stage, grade, term) {
        if (!window.TenantStore?.getCurrentTeacherId()) return {};
        const key = this.getExamGradesKey(stage, grade, term);
        return JSON.parse(localStorage.getItem(key) || '{}');
    },

    saveGrades(stage, grade, term, gradesData) {
        const key = this.getExamGradesKey(stage, grade, term);
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        if (!teacherId) return;
        const allowedIds = new Set(
            window.StudentStore?.getStudents(stage, grade).map(student => String(student.id)) || []
        );
        const scopedGrades = Object.fromEntries(
            Object.entries(gradesData || {}).filter(([studentId]) => allowedIds.has(String(studentId)))
        );
        localStorage.setItem(key, JSON.stringify(scopedGrades));
    },

    isAbsentGrade(value) {
        if (value === 'absent' || value === 'غائب' || value === 'راسب') return true;
        if (!value || typeof value !== 'object') return false;

        const status = String(value.status || '').trim().toLowerCase();
        return ['absent', 'غائب', 'راسب'].includes(status)
            || (value.isFailed === true && (value.score === null || value.score === undefined || value.score === ''));
    },

    hasGradeValue(value) {
        return value !== undefined
            && value !== null
            && !(typeof value === 'string' && value.trim() === '')
            && !this.isAbsentGrade(value);
    },

    saveGrade(stage, grade, term, studentId, columnIdx, value) {
        // Validation
        if (!stage || !grade || !term || studentId === undefined || columnIdx === undefined) {
            console.error('Invalid grade data');
            return;
        }
        const teacherId = window.TenantStore?.getCurrentTeacherId();
        const belongsToCurrentGrade = teacherId
            && window.StudentStore?.getStudents(stage, grade)
                .some(student => String(student.id) === String(studentId));
        if (!belongsToCurrentGrade) {
            console.error('Grade student is outside the current teacher/grade scope');
            return;
        }
        
        const key = this.getExamGradesKey(stage, grade, term);
        const gradesData = this.getGrades(stage, grade, term);
        
        if (!gradesData[studentId]) gradesData[studentId] = {};
        
        // Only save if value changed
        if (gradesData[studentId][columnIdx] === value) {
            return;
        }
        
        gradesData[studentId][columnIdx] = value;
        localStorage.setItem(key, JSON.stringify(gradesData));
        window.AppwriteConfig?.syncExamGrade?.({
            studentId,
            term,
            columnIdx,
            value,
            stageId: stage,
            gradeId: window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`,
            teacherId
        }).catch(error => {
            console.warn('Appwrite exam grade sync failed:', error);
        });
    },

    deleteColumn(stage, grade, term, columnIdx, currentColumns) {
        const deletedExamId = currentColumns?.[columnIdx]?.examId;
        const key = this.getExamGradesKey(stage, grade, term);
        const gradesData = this.getGrades(stage, grade, term);
        const completionKey = this.getExamCompletionKey(stage, grade, term);
        const finishedExams = this.getFinishedExams(stage, grade, term);
        const shiftedFinishedExams = {};
        
        // Shift data for remaining columns
        Object.keys(gradesData).forEach(sId => {
            const studentGrades = gradesData[sId];
            const newGrades = {};
            let newIdx = 0;
            // We loop through original length
            for(let i = 0; i < currentColumns.length; i++) {
                if (i !== columnIdx) {
                    if (studentGrades[i] !== undefined) {
                        newGrades[newIdx] = studentGrades[i];
                    }
                    newIdx++;
                }
            }
            gradesData[sId] = newGrades;
        });

        localStorage.setItem(key, JSON.stringify(gradesData));

        Object.keys(finishedExams).forEach(index => {
            const numericIndex = parseInt(index, 10);
            if (Number.isNaN(numericIndex) || numericIndex === columnIdx) return;
            shiftedFinishedExams[numericIndex > columnIdx ? numericIndex - 1 : numericIndex] = true;
        });
        localStorage.setItem(completionKey, JSON.stringify(shiftedFinishedExams));
        window.AppwriteConfig?.deleteExamColumn?.(
            deletedExamId,
            stage,
            window.TenantStore?.getGradeId(stage, grade) || `${stage}_${grade}`,
            term,
            columnIdx
        ).catch(error => {
            console.warn('Appwrite exam column deletion failed:', error);
        });
    },

    getScoreBracket(score, examConfig) {
        if (!examConfig || typeof examConfig === 'string') return '';
        
        const val = parseFloat(score);
        if (isNaN(val)) return '';
        
        const brackets = examConfig.brackets;
        if (!brackets) return '';
        
        if (val >= brackets.excellence.from && val <= brackets.excellence.to) return 'excellence';
        if (val >= brackets.success.from && val <= brackets.success.to) return 'success';
        if (val >= brackets.average.from && val <= brackets.average.to) return 'average';
        if (val >= brackets.weak.from && val <= brackets.weak.to) return 'weak';
        if (val >= brackets.veryWeak.from && val <= brackets.veryWeak.to) return 'veryWeak';
        
        return '';
    }
};
