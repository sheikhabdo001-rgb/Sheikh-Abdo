/**
 * Global Context Controller
 * Manages the Stage/Grade switcher in the header
 */
window.GlobalContextController = {
    init() {
        const btn = document.getElementById('globalContextBtn');
        const closeBtn = document.getElementById('closeContextModal');
        const resetBtn = document.getElementById('resetGlobalContextBtn');

        if (btn) btn.onclick = () => this.openStageSelection();
        if (closeBtn) closeBtn.onclick = () => window.ModalManager.close('globalContextModal');
        if (resetBtn) resetBtn.onclick = () => {
            window.GlobalStageFilter.reset();
            window.ModalManager.close('globalContextModal');
            this.refreshCurrentView();
        };

        window.addEventListener('globalFilterChanged', () => {
            this.refreshCurrentView();
        });

        // The global state is loaded before the header template exists.
        // Refresh the label now that the header has been injected.
        window.GlobalStageFilter.updateHeaderController();
    },

    refreshCurrentView() {
        const teacherName = window.Auth.getTeacherName();
        const selectedStages = window.Auth.getSelectedStages();
        
        window.Dashboard.load(teacherName, selectedStages);
        
        const currentView = window.Navigation.history[window.Navigation.history.length - 1];
        if (currentView === 'students' && window.Students.isInitialized) {
            window.Students.loadStudentsData();
        }
        if (currentView === 'schedule' && window.ScheduleUI) {
            window.ScheduleUI.renderAllSchedules();
        }
        if (currentView === 'exams' && window.ExamsUI) {
            window.ExamsUI.init();
        }
        if (currentView === 'examGrades' && window.ExamsUI) {
            window.ExamsUI.renderGradesTable();
        }
        if (currentView === 'repeatedAbsence' && window.RepeatedAbsence) {
            // Re-render the active grade banner and table against the new
            // GlobalStageFilter context when the header selection changes.
            window.RepeatedAbsence.render();
        }
        if (currentView === 'studentCodes' && window.StudentCodes) {
            window.StudentCodes.render();
        }
    },

    openStageSelection() {
        const container = document.getElementById('contextSelectorContainer');
        const stages = window.Auth.getSelectedStages();
        const stageData = window.STUDENT_CONFIG.stageData;
        
        container.innerHTML = `
            <p class="helper-text" style="text-align:center; margin-bottom: 1.5rem;">اختر المرحلة التعليمية لتحديد العرض:</p>
            <div class="stage-options" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));">
                ${stages.map(stage => {
                    const data = stageData[stage];
                    if (!data) return '';
                    const isActive = window.GlobalStageFilter.activeStage === stage;
                    const stageColor = data.color || '#9333ea';
                    const clickAction = (data.isFlat || stage.startsWith('custom_'))
                        ? `window.GlobalContextController.selectContext('${stage}', 1)`
                        : `window.GlobalContextController.openGradeSelection('${stage}')`;
                    
                    return `
                        <div class="stage-card ${isActive ? 'active-group-glow' : ''}" 
                             style="cursor:pointer; padding: 1.5rem; border-radius: 20px; border-color: ${isActive ? stageColor : 'rgba(147, 51, 234, 0.2)'}" 
                             onclick="${clickAction}">
                            <i class="fas ${data.icon}" style="font-size: 2.5rem; color: ${stageColor}; margin-bottom: 10px; filter: drop-shadow(0 0 10px ${stageColor}44);"></i>
                            <span style="font-weight: 800;">${data.name}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        window.ModalManager.open('globalContextModal');
    },

    openGradeSelection(stage) {
        const container = document.getElementById('contextSelectorContainer');
        const selectedGrades = window.Auth.getSelectedGrades()[stage] || [];
        const stageName = window.STUDENT_CONFIG.stageData[stage].name;

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem;">
                <button class="back-btn" onclick="window.GlobalContextController.openStageSelection()" style="padding: 5px 15px; min-height: auto;">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <h4 style="font-weight: 800; color: var(--primary-color);">صفوف المرحلة ${stageName}:</h4>
            </div>
            <div class="grade-grid" style="grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));">
                ${selectedGrades.sort((a,b)=>a-b).map(gradeIdx => {
                    const gradeName = window.STUDENT_CONFIG.gradeNames[stage][gradeIdx - 1];
                    const isActive = window.GlobalStageFilter.activeStage === stage && window.GlobalStageFilter.activeGrade === gradeIdx;
                    return `
                        <button class="filter-pill grade-pill-color-${gradeIdx} ${isActive ? 'active' : ''}" 
                                style="width: 100%; justify-content: center;"
                                onclick="window.GlobalContextController.selectContext('${stage}', ${gradeIdx})">
                            ${gradeName}
                        </button>
                    `;
                }).join('')}
                <button class="filter-pill" style="width: 100%; justify-content: center; background: rgba(147, 51, 234, 0.1); border-style: dashed;" 
                        onclick="window.GlobalContextController.selectContext('${stage}', null)">
                    كافة صفوف ${stageName}
                </button>
            </div>
        `;

        window.ModalManager.open('globalContextModal');
    },

    selectContext(stage, grade) {
        window.GlobalStageFilter.setActive(stage, grade);
        const btn = document.getElementById('globalContextBtn');
        if (btn) {
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => btn.style.transform = '', 300);
        }
        window.ModalManager.close('globalContextModal');
    }
};
