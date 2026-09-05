window.DashboardHub = {
    initSearchHub() {
        const searchInput = document.getElementById('hubSearchInput');
        const classFilter = document.getElementById('hubClassFilter');
        const actionFilter = document.getElementById('hubActionFilter');
        
        if (!searchInput) return;

        if (searchInput.dataset.hubInitialized === 'true') return;
        searchInput.dataset.hubInitialized = 'true';

        const selectedStages = window.Auth.getSelectedStages();
        const selectedGrades = window.Auth.getSelectedGrades();
        
        classFilter.innerHTML = '<option value="all">كل الصفوف</option>';
        selectedStages.forEach(stage => {
            const stageInfo = window.STUDENT_CONFIG.stageData[stage];
            if (!stageInfo) return; // Safety check for missing stage config

            const grades = selectedGrades[stage] || [];
            const isCustom = stageInfo.isFlat || stage.startsWith('custom_');

            if (isCustom) {
                // Unified Selection: Custom stage has no secondary grade dropdown requirement
                classFilter.innerHTML += `<option value="${stage}_1">${stageInfo.name}</option>`;
            } else {
                grades.forEach(g => {
                    const gradeNames = window.STUDENT_CONFIG.gradeNames[stage] || [];
                    const gradeName = gradeNames[g - 1] || `الصف ${g}`;
                    classFilter.innerHTML += `<option value="${stage}_${g}">${stageInfo.name} - ${gradeName}</option>`;
                });
            }
        });

        let searchTimeout;
        const handleSearch = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim().toLowerCase();
                const selectedClass = classFilter.value;
                const selectedAction = actionFilter.value;

                // Allow 6-digit numeric search immediately
                const isCodeSearch = /^\d{6}$/.test(query);

                if (query.length < 2 && selectedClass === 'all' && !isCodeSearch) {
                    document.getElementById('hubResultsArea').innerHTML = `
                        <div class="hub-placeholder">
                            <i class="fas fa-keyboard"></i>
                            <p>اكتب حرفين على الأقل للبحث، أو اختر صفاً محدداً</p>
                        </div>
                    `;
                    return;
                }

                this.renderHubResults(query, selectedClass, selectedAction);
            }, 200);
        };

        searchInput.oninput = handleSearch;
        classFilter.onchange = () => {
            clearTimeout(searchTimeout);
            handleSearch();
        };
        actionFilter.onchange = () => {
            clearTimeout(searchTimeout);
            handleSearch();
        };
    },

    renderHubResults(query, classFilterVal, actionFilterVal) {
        const resultsArea = document.getElementById('hubResultsArea');
        const selectedStages = window.Auth.getSelectedStages();
        const selectedGrades = window.Auth.getSelectedGrades();

        let allMatchedStudents = [];

        selectedStages.forEach(stage => {
            const stageInfo = window.STUDENT_CONFIG.stageData[stage];
            if (!stageInfo) return; // Safety check for missing stage config

            const grades = selectedGrades[stage] || [];
            const isCustom = stageInfo.isFlat || stage.startsWith('custom_');

            grades.forEach(gradeIdx => {
                const classKey = `${stage}_${gradeIdx}`;
                if (classFilterVal !== 'all' && classFilterVal !== classKey) return;

                const students = window.StudentStore.getStudents(stage, gradeIdx)
                    .filter(s => {
                        if (!s.name) return false;
                        const nameMatch = s.name.toLowerCase().includes(query);
                        const codeMatch = String(s.studentCode || s.code || '').toLowerCase().includes(query);
                        const phoneMatch = (s.phone && s.phone.includes(query)) || (s.parentPhone && s.parentPhone.includes(query));
                        return nameMatch || codeMatch || phoneMatch;
                    })
                    .map((s, idx) => ({ 
                        ...s, 
                        serial: window.StudentStore.getSerial(s, idx + 1), 
                        stage, 
                        grade: gradeIdx,
                        // Replace 'عام' with actual Custom Stage Name for custom contexts
                        className: isCustom ? stageInfo.name : window.STUDENT_CONFIG.gradeNames[stage][gradeIdx-1]
                    }));
                
                allMatchedStudents = allMatchedStudents.concat(students);
            });
        });

        window.DashboardHubUI.renderResultsTable(resultsArea, allMatchedStudents, actionFilterVal);
    },

    // removed renderHubResults() logic moved to DashboardHubUI
    // removed hubQuickAttendance() {} - moved to DashboardHubActions
    // removed hubQuickPayment() {} - moved to DashboardHubActions
    // removed hubOpenEdit() {} - moved to DashboardHubActions
};
