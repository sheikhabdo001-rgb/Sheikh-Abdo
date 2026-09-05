window.DashboardSessions = {
    checkActiveSessions() {
        const activeSession = this.findActiveSession();
        const banner = document.getElementById('activeSessionAlert');
        const text = document.getElementById('activeSessionText');
        
        if (activeSession) {
            if (banner) banner.style.display = 'flex';
            if (text) text.innerHTML = `جلسة نشطة الآن: <strong>${activeSession.stageName} - ${activeSession.gradeName} - ${activeSession.group.name}</strong>`;
        } else {
            if (banner) banner.style.display = 'none';
        }
    },

    findActiveSession() {
        const now = new Date();
        const currentDayAr = now.toLocaleDateString('ar-EG', { weekday: 'long' });
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        const stages = ['primary', 'preparatory', 'secondary'];
        const gradeCounts = { primary: 6, preparatory: 3, secondary: 3 };
        
        const stageNames = { primary: 'ابتدائي', preparatory: 'إعدادي', secondary: 'ثانوي' };
        const gradeNames = window.STUDENT_CONFIG.gradeNames;

        for (const stage of stages) {
            for (let grade = 1; grade <= gradeCounts[stage]; grade++) {
                const groupsKey = `groups_${stage}_${grade}`;
                const groupsData = localStorage.getItem(groupsKey);
                if (groupsData) {
                    const groups = JSON.parse(groupsData);
                    for (const group of groups) {
                        for (const slot of group.schedule) {
                            if (slot.day === currentDayAr && slot.time) {
                                const [hours, minutes] = slot.time.split(':').map(Number);
                                const slotMinutes = hours * 60 + minutes;
                                const diff = slotMinutes - currentTimeMinutes;

                                // If starts in 5 minutes OR was within the last 60 minutes (active)
                                if (diff >= -60 && diff <= 5) {
                                    return { 
                                        stage, 
                                        grade, 
                                        group, 
                                        stageName: stageNames[stage], 
                                        gradeName: gradeNames[stage][grade-1] 
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    },

    getClassActiveSession(stage, grade) {
        const now = new Date();
        const currentDayAr = now.toLocaleDateString('ar-EG', { weekday: 'long' });
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        const groupsKey = `groups_${stage}_${grade}`;
        const groupsData = localStorage.getItem(groupsKey);
        if (groupsData) {
            const groups = JSON.parse(groupsData);
            for (const group of groups) {
                for (const slot of group.schedule) {
                    if (slot.day === currentDayAr && slot.time) {
                        const [hours, minutes] = slot.time.split(':').map(Number);
                        const slotMinutes = hours * 60 + minutes;
                        const diff = currentTimeMinutes - slotMinutes;

                        // Session is active if started within the last 60 minutes
                        if (diff >= 0 && diff <= 60) {
                            return group;
                        }
                    }
                }
            }
        }
        return null;
    },

    handleInstantRecording() {
        window.InstantRegistration.handleClick();
    }
};