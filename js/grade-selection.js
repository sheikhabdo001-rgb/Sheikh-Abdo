/**
 * Grade Selection Controller
 * Handles the logic for picking grades during login and the stage settings modal
 */
window.GradeSelection = {
    get GRADE_CONFIG() {
        const config = {
            'primary': { title: 'الابتدائية', count: 6, prefix: 'الصف' },
            'preparatory': { title: 'الإعدادية', count: 3, prefix: 'الصف' },
            'secondary': { title: 'الثانوية', count: 3, prefix: 'الصف' }
        };
        const teacherId = window.TenantStore?.getTeacherIdForCurrentUI?.();
        const custom = JSON.parse(window.TenantStore?.get('custom_stages_config', '{}', teacherId) || '{}');
        const customGrades = JSON.parse(window.TenantStore?.get('custom_grades_config', '{}', teacherId) || '{}');
        Object.keys(custom).forEach(id => {
            config[id] = { 
                title: custom[id].name, 
                count: customGrades[id]?.length || 4, 
                prefix: custom[id].name.includes('كورس') ? 'مستوى' : 'مستوى' 
            };
        });
        return config;
    },

    tempSelectedGrades: JSON.parse(localStorage.getItem('temp_selected_grades_cache')) || {
        'primary': [1, 2, 3, 4, 5, 6],
        'preparatory': [1, 2, 3],
        'secondary': [1, 2, 3]
    },

    currentSelectingStage: null,

    init() {
        this.setupListeners();
    },

    setupListeners() {
        // Handle "Choose Grades" Button from Login
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.choose-grades-btn');
            if (btn && btn.hasAttribute('data-stage')) {
                e.stopPropagation();
                const stage = btn.getAttribute('data-stage');
                this.openGradeSelection(stage);
            }
        });

        // Stage click in login: auto-select all grades
        document.querySelectorAll('.stage-option input').forEach(input => {
            input.addEventListener('change', (e) => {
                const stage = e.target.value;
                if (e.target.checked) {
                    const config = this.GRADE_CONFIG[stage];
                    this.tempSelectedGrades[stage] = Array.from({ length: config.count }, (_, i) => i + 1);
                } else {
                    this.tempSelectedGrades[stage] = [];
                }
            });
        });

        // Modal specific listeners
        const saveGradesBtn = document.getElementById('saveGradesBtn');
        if (saveGradesBtn) {
            saveGradesBtn.onclick = () => this.saveTempGrades();
        }

        const saveStageSettingsBtn = document.getElementById('saveStageSettingsBtn');
        if (saveStageSettingsBtn) {
            saveStageSettingsBtn.onclick = () => this.saveGlobalStageSettings();
        }
    },

    openGradeSelection(stage) {
        if (!stage) return;
        
        // If flat stage, just check it and return
        const stageData = window.STUDENT_CONFIG.stageData[stage];
        if (stageData && (stageData.isFlat || stage.startsWith('custom_'))) {
            const stageCheck = document.getElementById(`check-${stage}`);
            if (stageCheck) stageCheck.checked = true;
            this.tempSelectedGrades[stage] = [1];
            return;
        }

        this.currentSelectingStage = stage;
        const config = this.GRADE_CONFIG[stage];
        if (!config) return;
        
        const titleEl = document.getElementById('gradeModalTitle');
        const container = document.getElementById('gradeOptionsContainer');
        
        if (titleEl) titleEl.textContent = `اختيار صفوف المرحلة ${config.title}`;
        
        // Auto-check the stage checkbox in login UI
        const stageCheck = document.getElementById(`check-${stage}`);
        if (stageCheck) stageCheck.checked = true;

        if (container) {
            container.innerHTML = '';
            for (let i = 1; i <= config.count; i++) {
                const isChecked = this.tempSelectedGrades[stage].includes(i);
                const gradeBtn = document.createElement('div');
                gradeBtn.className = 'grade-btn-item';
                gradeBtn.setAttribute('data-stage', stage);
                gradeBtn.innerHTML = `
                    <label>
                        <input type="checkbox" value="${i}" ${isChecked ? 'checked' : ''}>
                        <div class="grade-pill">
                            <span>${config.prefix} ${i}</span>
                            <div class="check-box"><i class="fas fa-check"></i></div>
                        </div>
                    </label>
                `;
                container.appendChild(gradeBtn);
            }
        }

        window.ModalManager.open('gradeSelectionModal');
    },

    saveTempGrades() {
        if (!this.currentSelectingStage) return;

        const container = document.getElementById('gradeOptionsContainer');
        const selectedInputs = container.querySelectorAll('input:checked');
        this.tempSelectedGrades[this.currentSelectingStage] = Array.from(selectedInputs).map(input => parseInt(input.value));
        localStorage.setItem('temp_selected_grades_cache', JSON.stringify(this.tempSelectedGrades));
        
        const stageCheck = document.getElementById(`check-${this.currentSelectingStage}`);
        if (this.tempSelectedGrades[this.currentSelectingStage].length === 0) {
            if (stageCheck) stageCheck.checked = false;
        }

        window.ModalManager.close('gradeSelectionModal');
    },

    openStageSettings() {
        const currentStages = window.Auth.getSelectedStages();
        const currentGrades = window.Auth.getSelectedGrades();
        const allAvailableStages = Object.keys(window.STUDENT_CONFIG.stageData);

        const modalBody = document.querySelector('#stageSettingsModal .modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid rgba(147,51,234,0.2);">
                    <p class="helper-text" style="margin:0;">تحكم في المراحل النشطة بالنظام:</p>
                    <button type="button" id="addNewCustomStageFromSettings" class="choose-grades-btn" style="background:rgba(147,51,234,0.1); border-color:var(--primary-color); border-style:dashed; color:var(--primary-color); font-weight:800; padding:8px 15px;">
                        <i class="fas fa-plus-circle"></i> إضافة مرحلة مخصصة +
                    </button>
                </div>
                <div class="edit-stages-grid">
                    ${allAvailableStages.map(stage => {
                        const data = window.STUDENT_CONFIG.stageData[stage];
                        const isCustom = stage.startsWith('custom_');
                        return `
                        <div class="edit-stage-section" data-stage="${stage}">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <label class="edit-stage-label" style="margin:0;">
                                    <input type="checkbox" id="edit-check-${stage}"> 
                                    <span>المرحلة ${data.name}</span>
                                </label>
                                ${isCustom ? `
                                <div style="display:flex; gap:10px;">
                                    <button class="table-action-btn edit-btn-table" onclick="window.GradeSelection.editCustomStage('${stage}')" title="تعديل"><i class="fas fa-pencil-alt"></i></button>
                                    <button class="table-action-btn delete-btn-table" onclick="window.GradeSelection.deleteCustomStage('${stage}')" title="حذف"><i class="fas fa-trash-alt"></i></button>
                                </div>
                                ` : ''}
                            </div>
                            ${data.description ? `<p style="font-size:0.75rem; color:var(--text-secondary); margin-top:5px; padding-right:32px;">${data.description}</p>` : ''}
                            <div id="edit-grades-${stage}" class="edit-grades-list" style="margin-top:10px;"></div>
                        </div>`;
                    }).join('')}
                </div>
            `;
        }

        const addBtn = document.getElementById('addNewCustomStageFromSettings');
        if (addBtn) {
            addBtn.onclick = () => {
                this.resetCustomStageForm();
                window.ModalManager.open('addCustomStageModal');
            };
        }
        
        allAvailableStages.forEach(stage => {
            const checkbox = document.getElementById(`edit-check-${stage}`);
            if (checkbox) checkbox.checked = currentStages.includes(stage);
            
            const gradesList = document.getElementById(`edit-grades-${stage}`);
            if (!gradesList) return;
            
            gradesList.innerHTML = '';
            const config = this.GRADE_CONFIG[stage];
            
            // If no config found or flat stage, skip grades list
            if (!config || window.STUDENT_CONFIG.stageData[stage].isFlat) {
                // For flat stages, the checkbox handles it
                return;
            }

            for (let i = 1; i <= config.count; i++) {
                const isChecked = currentGrades[stage] ? currentGrades[stage].includes(i) : false;
                const gradeItem = document.createElement('label');
                gradeItem.className = 'edit-grade-item';
                gradeItem.innerHTML = `
                    <input type="checkbox" value="${i}" ${isChecked ? 'checked' : ''}>
                    <span>${config.prefix} ${i}</span>
                `;
                gradeItem.querySelector('input').addEventListener('change', (e) => {
                    if (e.target.checked && checkbox) checkbox.checked = true;
                });
                gradesList.appendChild(gradeItem);
            }

            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    if (!e.target.checked) {
                        gradesList.querySelectorAll('input').forEach(i => i.checked = false);
                    }
                });
            }
        });

        window.ModalManager.open('stageSettingsModal');
    },

    resetCustomStageForm() {
        document.getElementById('addCustomStageTitle').textContent = 'إضافة مرحلة مخصصة';
        document.getElementById('saveCustomStageLabel').textContent = 'حفظ وإضافة المرحلة';
        const saveBtn = document.getElementById('saveCustomStageBtn');
        if (saveBtn) delete saveBtn.dataset.editId;
        
        document.getElementById('customStageNameInput').value = '';
        document.getElementById('customStageFeeInput').value = '';
        document.getElementById('customStageDescInput').value = '';
    },

    editCustomStage(id) {
        const config = window.STUDENT_CONFIG.stageData[id];
        if (!config) return;

        const fee = (window.FinancialData.standardFees[`${id}_1`] || '');
        
        document.getElementById('addCustomStageTitle').textContent = 'تعديل المرحلة المخصصة';
        document.getElementById('saveCustomStageLabel').textContent = 'حفظ التغييرات';
        const saveBtn = document.getElementById('saveCustomStageBtn');
        if (saveBtn) saveBtn.dataset.editId = id;

        document.getElementById('customStageNameInput').value = config.name;
        document.getElementById('customStageFeeInput').value = fee;
        document.getElementById('customStageDescInput').value = config.description || '';

        window.ModalManager.open('addCustomStageModal');
    },

    async deleteCustomStage(id) {
        const hasStudents = window.STUDENT_CONFIG.hasStudentsInStage(id);
        const name = window.STUDENT_CONFIG.stageData[id].name;
        
        let warning = `هل أنت متأكد من حذف مرحلة "${name}"؟`;
        if (hasStudents) {
            warning = `تحذير: توجد بيانات طلاب مسجلة في مرحلة "${name}"! حذف المرحلة سيؤدي لإخفاء هؤلاء الطلاب من العرض المباشر. هل أنت متأكد من الاستمرار؟`;
        }

        const confirmed = await window.confirm(warning);
        if (confirmed) {
            window.STUDENT_CONFIG.deleteCustomStage(id);
            window.notify.success(`تم حذف المرحلة "${name}" بنجاح`);
            this.openStageSettings(); // Refresh list
            window.AuthUI.loadDashboardData();
        }
    },

    saveGlobalStageSettings() {
        const newStages = [];
        const newGrades = {};
        const allAvailableStages = Object.keys(this.GRADE_CONFIG);

        allAvailableStages.forEach(stage => {
            const stageCheck = document.getElementById(`edit-check-${stage}`);
            const gradesList = document.getElementById(`edit-grades-${stage}`);
            if (!stageCheck || !gradesList) return;

            const checkedGrades = Array.from(gradesList.querySelectorAll('input:checked')).map(i => parseInt(i.value));
            const data = window.STUDENT_CONFIG.stageData[stage];
            const isFlat = data && (data.isFlat || stage.startsWith('custom_'));

            if (stageCheck.checked) {
                if (isFlat) {
                    newStages.push(stage);
                    newGrades[stage] = [1];
                } else if (checkedGrades.length > 0) {
                    newStages.push(stage);
                    newGrades[stage] = checkedGrades;
                }
            }
        });

        if (newStages.length === 0) {
            window.notify.error('يجب اختيار مرحلة واحدة على الأقل تحتوي على صفوف مختارة!');
            return;
        }

        window.Auth.updateStages(newStages, newGrades);
        window.AuthUI.loadDashboardData();
        window.ModalManager.close('stageSettingsModal');
    }
};

// Map global function for settings Sidebar
window.openStageSettings = () => window.GradeSelection.openStageSettings();
