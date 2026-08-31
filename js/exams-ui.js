window.ExamsUI = {
    currentStage: null,
    currentGrade: null,
    currentTerm: 1,
    examColumns: [],
    activeExamIdx: 'all',
    singleExamFilter: 'all',
    studentSearchQuery: '',
    lastFinishedExamIdx: null,

    init() {
        const mainEl = document.querySelector('#examsView');
        if (!mainEl) return;
        
        let wrapper = document.getElementById('examsPlaceholderWrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'examsPlaceholderWrapper';
            mainEl.appendChild(wrapper);
        }

        if (window.GlobalStageFilter.isLocked()) {
            wrapper.innerHTML = window.GlobalStageFilter.getLockedPlaceholderHTML();
            const tabsOuter = document.querySelector('.exam-tabs-container-outer');
            if (tabsOuter) tabsOuter.style.display = 'none';
        } else {
            const tabsOuter = document.querySelector('.exam-tabs-container-outer');
            if (tabsOuter) tabsOuter.style.display = 'block';
            if (wrapper) wrapper.innerHTML = '';
            
            // Auto-redirect to grades table if context is already selected
            this.openGradesView(window.GlobalStageFilter.getActiveStage(), window.GlobalStageFilter.getActiveGrade());
        }
        this.setupModalListeners();
    },

    setupModalListeners() {
        const closeGradeBtn = document.getElementById('closeExamsGradeModal');
        const modal = document.getElementById('examsGradeModal');
        if (closeGradeBtn) closeGradeBtn.onclick = () => modal.classList.remove('active');
        
        // Term Selection Logic
        const termModal = document.getElementById('examTermSelectionModal');
        const closeTermBtn = document.getElementById('closeExamTermModal');
        if (closeTermBtn) closeTermBtn.onclick = () => window.ModalManager.close('examTermSelectionModal');
        
        if (termModal) {
            termModal.querySelectorAll('.term-option-btn').forEach(btn => {
                btn.onclick = () => {
                    const term = parseInt(btn.dataset.term);
                    this.switchTerm(term);
                };
            });
        }

        // Academic Record Modal
        const academicModal = document.getElementById('studentAcademicRecordModal');
        const closeAcademicBtn = document.getElementById('closeAcademicRecordModal');
        if (closeAcademicBtn) closeAcademicBtn.onclick = () => window.ModalManager.close('studentAcademicRecordModal');
        if (academicModal) {
            academicModal.querySelectorAll('.record-toggle-btn').forEach(btn => {
                btn.onclick = () => {
                    const filter = btn.dataset.filter;
                    const studentId = academicModal.dataset.studentId;
                    this.renderAcademicRecordTable(parseInt(studentId), filter);
                };
            });
        }
    },

    openGradesView(stage, grade) {
        this.currentStage = stage;
        this.currentGrade = grade;
        this.currentTerm = parseInt(localStorage.getItem('preferred_exam_term') || '1');
        this.activeExamIdx = 'all'; 
        this.singleExamFilter = 'all';
        this.studentSearchQuery = '';
        this.lastFinishedExamIdx = null;

        this.loadExamData();
        window.Navigation.switchView('examGrades');
        this.renderGradesTable();
        this.setupGradesListeners();
        window.ExamsGradesUI.updateTermUI(this.currentTerm);
    },

    // removed loadExamData() {}
    loadExamData() {
        this.examColumns = window.ExamsData.loadExamColumns(this.currentStage, this.currentGrade, this.currentTerm);
    },

    // removed saveExamColumns() {}
    saveExamColumns() {
        window.ExamsData.saveExamColumns(this.currentStage, this.currentGrade, this.currentTerm, this.examColumns);
    },

    setupGradesListeners() {
        const addColumnBtn = document.getElementById('addExamColumnBtn');
        const termBtn = document.getElementById('openTermSelectionBtn');
        const confirmAddBtn = document.getElementById('confirmAddExamColumn');
        
        if (addColumnBtn && !addColumnBtn.dataset.listenerAttached) {
            addColumnBtn.dataset.listenerAttached = 'true';
            addColumnBtn.onclick = () => this.addExamColumn();
        }

        if (termBtn && !termBtn.dataset.listenerAttached) {
            termBtn.dataset.listenerAttached = 'true';
            termBtn.onclick = () => window.ModalManager.open('examTermSelectionModal');
        }

        if (confirmAddBtn && !confirmAddBtn.dataset.listenerAttached) {
            confirmAddBtn.dataset.listenerAttached = 'true';
            confirmAddBtn.onclick = () => this.saveExamColumnWithBrackets();
        }
    },

    switchTerm(term) {
        this.currentTerm = term;
        localStorage.setItem('preferred_exam_term', term);
        this.singleExamFilter = 'all';
        this.studentSearchQuery = '';
        this.lastFinishedExamIdx = null;
        this.loadExamData();
        window.ExamsGradesUI.updateTermUI(this.currentTerm);
        this.renderGradesTable();
        window.ModalManager.close('examTermSelectionModal');
    },

    // removed updateTermUI() {}

    addExamColumn() {
        // Reset form
        const nameInput = document.getElementById('examNameInput');
        const scoreInput = document.getElementById('examTotalScoreInput');
        const errorMsg = document.getElementById('bracketValidationError');

        if (nameInput) nameInput.value = '';
        if (scoreInput) scoreInput.value = '';
        if (errorMsg) errorMsg.style.display = 'none';
        
        window.ModalManager.open('addExamColumnModal');
    },

    saveExamColumnWithBrackets() {
        const examName = document.getElementById('examNameInput').value.trim();
        const totalScore = document.getElementById('examTotalScoreInput').value;
        const errorMsg = document.getElementById('bracketValidationError');
        
        if (!examName) {
            errorMsg.textContent = 'يرجى إدخال اسم الامتحان';
            errorMsg.style.display = 'block';
            return;
        }
        
        if (!totalScore || parseFloat(totalScore) <= 0) {
            errorMsg.textContent = 'يرجى إدخال الدرجة الكلية';
            errorMsg.style.display = 'block';
            return;
        }
        
        const examConfig = {
            name: examName,
            totalScore: parseFloat(totalScore)
        };
        
        this.examColumns.push(examConfig);
        this.saveExamColumns();
        
        window.ModalManager.close('addExamColumnModal');
        
        // Switch to the newly added exam tab automatically
        this.activeExamIdx = this.examColumns.length - 1;
        this.singleExamFilter = 'all';
        this.lastFinishedExamIdx = null;
        this.renderGradesTable();
    },

    // removed getScoreBracket() {}

    // removed renderGradesTable() {}
    renderGradesTable() {
        const container = document.getElementById('examGradesTableContainer');
        if (!container) return;
        
        if (window.GlobalStageFilter.isLocked()) {
            container.innerHTML = window.GlobalStageFilter.getLockedPlaceholderHTML();
            return;
        }

        const activeStage = window.GlobalStageFilter.getActiveStage();
        const activeGrade = window.GlobalStageFilter.getActiveGrade();
        
        // Sync local view state with global context before each render
        if (this.currentStage !== activeStage || this.currentGrade !== activeGrade) {
            this.currentStage = activeStage;
            this.currentGrade = activeGrade;
            this.singleExamFilter = 'all';
            this.studentSearchQuery = '';
            this.lastFinishedExamIdx = null;
            this.loadExamData();
            if (window.ExamsGradesUI) window.ExamsGradesUI.updateTermUI(this.currentTerm);
        }

        if (window.ExamsGradesUI) {
            window.ExamsGradesUI.renderTabs(this.examColumns, this.activeExamIdx);

            const students = window.StudentStore.getStudents(this.currentStage, this.currentGrade).filter(s => s.name);
            window.ExamsGradesUI.renderGradesTable(container, students, this.currentStage, this.currentGrade, this.currentTerm, this.examColumns, this.activeExamIdx);
        }
    },

    switchExam(idx) {
        if (this.activeExamIdx !== idx) {
            this.singleExamFilter = 'all';
            this.lastFinishedExamIdx = null;
        }
        this.activeExamIdx = idx;
        this.renderGradesTable();
    },

    setSingleExamFilter(filter) {
        if (this.activeExamIdx === 'all') return;
        this.singleExamFilter = filter === 'all'
            ? 'all'
            : (this.singleExamFilter === filter ? 'all' : filter);
        this.renderGradesTable();
    },

    isExamFinished(examIdx) {
        return window.ExamsData.isExamFinished(
            this.currentStage,
            this.currentGrade,
            this.currentTerm,
            examIdx
        );
    },

    validateScoreValue(value, maxScore, shouldAlert = true) {
        const normalizedValue = String(value ?? '').trim();
        if (normalizedValue === '') return '';

        const numericValue = parseFloat(normalizedValue);
        if (Number.isNaN(numericValue)) return '';

        const numericMax = parseFloat(maxScore);
        if (Number.isFinite(numericMax) && numericValue > numericMax) {
            if (shouldAlert) {
                alert(`عفواً، الحد الأقصى لدرجة هذا الامتحان هو ${numericMax}`);
            }
            return numericMax;
        }

        return Math.max(0, numericValue);
    },

    handleScoreInput(inputElement, studentId, examIdx, maxScore) {
        const validatedValue = this.validateScoreValue(inputElement?.value, maxScore);
        if (inputElement) {
            inputElement.value = validatedValue;
        }
        this.updateGrade(studentId, examIdx, validatedValue);
    },

    updateGrade(studentId, examIdx, value) {
        const exam = this.examColumns[examIdx];
        const maxScore = typeof exam === 'string' ? 100 : (exam?.totalScore || 100);
        const validatedValue = this.validateScoreValue(value, maxScore);
        window.ExamsData.saveGrade(
            this.currentStage,
            this.currentGrade,
            this.currentTerm,
            studentId,
            examIdx,
            validatedValue === '' ? '' : validatedValue
        );
        this.renderGradesTable();
    },

    async finishExam(examIdx) {
        const exam = this.examColumns[examIdx];
        if (!exam) return;
        if (this.isExamFinished(examIdx)) return;

        const confirmed = await window.confirm('هل أنت متأكد من إنهاء هذا الامتحان؟ سيتم تسجيل جميع الطلاب بدون درجات كـ (غائب/راسب)');
        if (!confirmed) return;

        const gradesData = window.ExamsData.getGrades(this.currentStage, this.currentGrade, this.currentTerm);
        const students = window.StudentStore.getStudents(this.currentStage, this.currentGrade)
            .filter(student => student.name);

        students.forEach(student => {
            if (!gradesData[student.id]) gradesData[student.id] = {};
            const currentValue = gradesData[student.id][examIdx];
            if (!window.ExamsData.hasGradeValue(currentValue) && !window.ExamsData.isAbsentGrade(currentValue)) {
                gradesData[student.id][examIdx] = 'absent';
            }
        });

        window.ExamsData.saveGrades(this.currentStage, this.currentGrade, this.currentTerm, gradesData);
        window.ExamsData.setExamFinished(this.currentStage, this.currentGrade, this.currentTerm, examIdx, true);
        this.lastFinishedExamIdx = examIdx;
        this.renderGradesTable();
    },

    openAcademicRecord(studentId) {
        const student = window.StudentStore.getStudents(this.currentStage, this.currentGrade).find(s => s.id === studentId);
        if (!student) return;

        const modal = document.getElementById('studentAcademicRecordModal');
        modal.dataset.studentId = studentId;
        const nameEl = document.getElementById('academicRecordStudentName');
        nameEl.innerHTML = '';
        const nameLink = document.createElement('a');
        nameLink.href = '#';
        nameLink.className = 'student-name-link';
        nameLink.dataset.studentId = String(student.id);
        nameLink.dataset.stage = this.currentStage;
        nameLink.dataset.grade = String(this.currentGrade);
        nameLink.dataset.fromView = 'examGrades';
        nameLink.textContent = student.name;
        nameEl.appendChild(nameLink);

        // Default to current dashboard term
        this.renderAcademicRecordTable(studentId, this.currentTerm.toString());
        window.ModalManager.open('studentAcademicRecordModal');
    },

    // removed renderAcademicRecordTable() {}
    renderAcademicRecordTable(studentId, filter) {
        const container = document.getElementById('academicRecordTableContainer');
        const modal = document.getElementById('studentAcademicRecordModal');
        window.ExamsGradesUI.renderAcademicRecordTable(container, modal, studentId, this.currentStage, this.currentGrade, filter);
    },

    // removed deleteColumn() {}
    async deleteColumn(columnIdx) {
        if (!await window.confirm('هل أنت متأكد من حذف هذا العمود بالكامل؟')) return;
        
        window.ExamsData.deleteColumn(this.currentStage, this.currentGrade, this.currentTerm, columnIdx, this.examColumns);
        
        this.examColumns.splice(columnIdx, 1);
        this.saveExamColumns();
        this.singleExamFilter = 'all';
        this.lastFinishedExamIdx = null;
        if (this.activeExamIdx === columnIdx || this.activeExamIdx >= this.examColumns.length) {
            this.activeExamIdx = this.examColumns.length ? Math.max(0, this.examColumns.length - 1) : 'all';
        } else if (this.activeExamIdx !== 'all' && this.activeExamIdx > columnIdx) {
            this.activeExamIdx -= 1;
        }
        
        this.renderGradesTable();
    }
};
