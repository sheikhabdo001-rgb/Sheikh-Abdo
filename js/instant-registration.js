window.InstantRegistration = {
  activeSessions: [],

  getTimeInMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  },

  getStartTime(slot) {
    if (!slot || !slot.time) return null;
    return slot.time.split(' - ')[0].trim();
  },

  getAllSessions() {
    const now = new Date();
    const currentDayAr = now.toLocaleDateString('ar-EG', { weekday: 'long' });
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const sessions = [];

    const stages = ['primary', 'preparatory', 'secondary'];
    const gradeCounts = { primary: 6, preparatory: 3, secondary: 3 };
    const stageNames = { primary: 'ابتدائي', preparatory: 'إعدادي', secondary: 'ثانوي' };
    const gradeNames = window.STUDENT_CONFIG.gradeNames;

    for (const stage of stages) {
      for (let grade = 1; grade <= gradeCounts[stage]; grade++) {
        const groups = window.AttendanceStore.getGroups(stage, grade);
        for (const group of groups) {
          for (const slot of group.schedule) {
            if (slot.day !== currentDayAr) continue;
            const startTime = this.getStartTime(slot);
            if (!startTime) continue;
            const slotMinutes = this.getTimeInMinutes(startTime);
            const diff = currentMinutes - slotMinutes;
            if (diff >= -10 && diff <= 20) {
              const endTime = slot.time.includes(' - ') ? slot.time.split(' - ')[1].trim() : '';
              sessions.push({
                stage,
                grade,
                group,
                slot,
                startTime,
                endTime,
                stageName: stageNames[stage],
                gradeName: gradeNames[stage][grade - 1],
                startMinutes: slotMinutes,
                diff
              });
            }
          }
        }
      }
    }
    return sessions;
  },

  updateButton() {
    const btn = document.getElementById('instantRecordingBtn');
    const statusEl = document.getElementById('instantRegistrationStatus');
    if (!btn) return;

    this.activeSessions = this.getAllSessions();

    if (this.activeSessions.length === 0) {
      btn.classList.add('disabled');
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
      btn.style.filter = 'grayscale(1)';
      btn.title = 'لا توجد حصص نشطة حالياً - يفتح قبل موعد الحصة بـ 10 دقائق';
      if (statusEl) statusEl.textContent = 'لا توجد حصص نشطة حالياً';
      return;
    }

    btn.classList.remove('disabled');
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
    btn.style.filter = '';
    btn.title = this.activeSessions.length === 1
      ? `${this.activeSessions[0].stageName} - ${this.activeSessions[0].gradeName} - ${this.activeSessions[0].group.name}`
      : `${this.activeSessions.length} حصص نشطة - اختر المجموعة المناسبة`;

    if (statusEl) {
      statusEl.textContent = this.activeSessions.length === 1
        ? `${this.activeSessions[0].group.name} - ${this.activeSessions[0].stageName} (${this.activeSessions[0].gradeName})`
        : `${this.activeSessions.length} حصص نشطة`;
    }
  },

  handleClick() {
    this.activeSessions = this.getAllSessions();
    if (this.activeSessions.length === 0) {
      window.notify?.warning?.('لا توجد حصص نشطة حالياً للتسجيل الفوري');
      return;
    }
    if (this.activeSessions.length === 1) {
      this.navigateToSession(this.activeSessions[0]);
      return;
    }
    this.showGroupSelectionModal(this.activeSessions);
  },

  navigateToSession(session) {
    if (window.Students) {
      window.Students.currentStage = session.stage;
      window.Students.currentGrade = session.grade;
      localStorage.setItem(`attendance_group_${session.stage}_${session.grade}`, session.group.name);
      document.querySelector('.nav-btn[data-page="students"]')?.click();
      setTimeout(() => {
        window.Students.actions?.openAttendanceView?.();
      }, 100);
    }
  },

  showGroupSelectionModal(sessions) {
    const modal = document.getElementById('instantGroupSelectionModal');
    const list = document.getElementById('instantGroupSelectionList');
    if (!modal || !list) return;

    list.innerHTML = sessions.map((s, i) => `
      <button class="instant-group-option" data-index="${i}">
        <div class="instant-group-icon"><i class="fas fa-chalkboard-teacher"></i></div>
        <div class="instant-group-info">
          <strong>${s.group.name}</strong>
          <span>${s.stageName} - ${s.gradeName}</span>
        </div>
        <div class="instant-group-time">
          <i class="fas fa-clock"></i>
          <span>${window.AppUtils.formatTime12h(s.startTime)}</span>
        </div>
        <i class="fas fa-chevron-left"></i>
      </button>
    `).join('');

    list.querySelectorAll('.instant-group-option').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        this.navigateToSession(sessions[idx]);
        window.ModalManager.close('instantGroupSelectionModal');
      };
    });

    window.ModalManager.open('instantGroupSelectionModal');
  },

  startPolling() {
    this.updateButton();
    setInterval(() => this.updateButton(), 30000);
  }
};