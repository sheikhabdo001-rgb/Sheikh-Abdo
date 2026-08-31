window.DashboardUI = {
    initClock() {
        const update = () => {
            const now = new Date();
            // Use standard format for consistency, including seconds for the dashboard
            const timeStr = now.toLocaleTimeString('ar-EG', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit', 
                hour12: true 
            });
            const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            
            const clocks = document.querySelectorAll('.clock-widget');
            clocks.forEach(clock => {
                clock.querySelector('.clock-time').textContent = timeStr;
                clock.querySelector('.clock-date').textContent = dateStr;
            });
        };
        update();
        setInterval(update, 1000);
    },

    renderStagesMiniCards(selectedStages) {
        const displayStagesDiv = document.getElementById('displayStages');
        if (!displayStagesDiv) return;
        displayStagesDiv.innerHTML = '';

        const stageConfigs = window.Dashboard.stageData;

        selectedStages.forEach(stage => {
            const data = stageConfigs[stage];
            if (!data) return;
            const miniCard = document.createElement('div');
            miniCard.className = `mini-stage-card ${data.class}`;
            miniCard.innerHTML = `
                <i class="fas ${data.icon}"></i>
                <span>${data.name}</span>
            `;
            miniCard.addEventListener('click', () => {
                miniCard.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    miniCard.style.transform = '';
                }, 200);
            });
            displayStagesDiv.appendChild(miniCard);
        });
    },

    renderStageButtons(selectedStages) {
        const stageButtonsSection = document.getElementById('stageButtonsSection');
        if (!stageButtonsSection) return;
        stageButtonsSection.innerHTML = '';

        const stageConfigs = window.Dashboard.stageConfig;

        // Add "Show All" button
        const showAllBtn = document.createElement('button');
        showAllBtn.className = `stage-btn show-all-btn ${!window.GlobalStageFilter.getActiveStage() ? 'active-stage' : ''}`;
        showAllBtn.innerHTML = `
            <i class="fas fa-globe"></i>
            <h3>عرض الكل</h3>
            <p>جميع المراحل</p>
        `;
        showAllBtn.addEventListener('click', () => {
            window.GlobalStageFilter.reset();
            this.syncStageButtonStates();
            window.Dashboard.load(window.Auth.getTeacherName(), window.Auth.getSelectedStages());
        });
        stageButtonsSection.appendChild(showAllBtn);

        // Render stage buttons
        selectedStages.forEach(stage => {
            const config = stageConfigs[stage];
            if (!config) return;
            const isActive = window.GlobalStageFilter.isActive(stage);
            const button = document.createElement('button');
            button.className = `stage-btn ${config.class} ${isActive ? 'active-stage' : ''}`;
            button.setAttribute('data-stage', stage);
            button.innerHTML = `
                <i class="fas ${config.icon}"></i>
                <h3>${config.title}</h3>
                <p>${config.subtitle}</p>
            `;
            button.addEventListener('click', () => {
                const data = window.STUDENT_CONFIG.stageData[stage];
                if (data && (data.isFlat || stage.startsWith('custom_'))) {
                    window.GlobalContextController.selectContext(stage, 1);
                } else {
                    window.GlobalContextController.openGradeSelection(stage);
                }
            });
            stageButtonsSection.appendChild(button);
        });
    },

    syncStageButtonStates() {
        const activeStage = window.GlobalStageFilter.getActiveStage();
        document.querySelectorAll('.stage-btn').forEach(btn => {
            btn.classList.remove('active-stage');
        });
        
        if (activeStage) {
            const activeBtn = document.querySelector(`.stage-btn[data-stage="${activeStage}"]`);
            if (activeBtn) activeBtn.classList.add('active-stage');
        } else {
            const showAllBtn = document.querySelector('.stage-btn.show-all-btn');
            if (showAllBtn) showAllBtn.classList.add('active-stage');
        }
    },

    showStageGrades(stage) {
        const allSelectedGrades = JSON.parse(localStorage.getItem('selectedGrades') || '{}');
        const gradesForStage = allSelectedGrades[stage] || [];
        const config = window.Dashboard.stageConfig[stage];

        if (!config) return;

        const titleEl = document.getElementById('viewGradeTitle');
        const container = document.getElementById('viewGradeContainer');
        const modal = document.getElementById('dashboardGradeModal');

        if (titleEl) titleEl.textContent = `صفوف المرحلة ال${config.title}`;
        if (container) {
            container.innerHTML = '';
            if (gradesForStage.length === 0) {
                container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">لم يتم اختيار صفوف لهذه المرحلة</p>';
            } else {
                const gradeNames = window.STUDENT_CONFIG.gradeNames;
                gradesForStage.sort((a, b) => a - b).forEach(gradeIdx => {
                    const pill = document.createElement('div');
                    pill.className = `grade-display-pill grade-item-${gradeIdx}`;
                    pill.textContent = gradeNames[stage][gradeIdx - 1];
                    container.appendChild(pill);
                });
            }
        }

        if (modal) modal.classList.add('active');
    }
};